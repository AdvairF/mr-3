import { useMemo } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";

// Phase 7.8 — Wrapper sobre Modal.jsx base (D-06). Mostra decomposição Art.354 CC
// linha-a-linha, com botões Copiar (clipboard) e Imprimir (window.open A4 isolado).

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Formata número com sinal `-` + cor vermelha para correção negativa (D-08).
function fmtBRLSigned(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (n < 0) {
    return "- " + fmtBRL(Math.abs(n));
  }
  return fmtBRL(n);
}

// Aplica cor vermelha ao valor se for negativo (D-08).
function valueColor(v) {
  return Number(v) < 0 ? "#dc2626" : "#0f172a";
}

// Escape HTML seguro (evita XSS em nomes de credor/devedor com caracteres especiais
// quando injetados no HTML do print via window.open). T-07.8-03-04.
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function DecomposicaoSaldoModal({
  detalhe,          // shape de calcularDetalheEncargosContrato (plan 07.8-01)
  contrato,
  credor,
  devedor,
  indexadorLabel,   // string tipo "IGP-M", "INPC_IPCA", etc
  dataCalculo,      // "YYYY-MM-DD" ou Date
  onClose,
  dividas,          // Phase 7.9 (D-24) — usado para split client-side de custas pagas vs em aberto
}) {
  const d = detalhe || {};
  const valorOriginal    = Number(d.valorOriginal || 0);
  const totalPago        = Number(d.totalPago || 0);
  const correcaoValor    = Number(d?.correcao?.valor || 0);
  const multaValor       = Number(d?.multa?.valor || 0);
  const jurosValor       = Number(d?.juros?.valor || 0);
  const honorariosValor  = Number(d?.honorarios?.valor || 0);
  const art523Multa      = Number(d?.art523?.multa || 0);
  const art523Hon        = Number(d?.art523?.honorarios || 0);
  const art523Total      = Number(d?.art523?.total || 0);
  const custasAtualizado = Number(d?.custas?.atualizado || 0);
  // Phase 7.9 P3+P5 — correção sempre aplicada (independente de pago); decomposição
  // exibe 1 linha única "Custas pagas atualizadas" = motor.custas.atualizado.
  // Phase 7.9 P7 — soma custas atualizadas (motor expõe lado-a-lado, não agrega).
  // Mesma fórmula de DetalheContrato L582 e useSaldoAtualizadoCache L66 (3 callsites alinhados).
  const saldoAtualizado  = Number(d.saldoAtualizado || 0) + Number(d?.custas?.atualizado || 0);

  const indexador = (indexadorLabel && String(indexadorLabel).trim()) || "—";

  const referencia = contrato?.referencia || contrato?.id || "—";
  const credorNome = credor?.nome || "—";
  const devedorNome = devedor?.nome || "—";

  const dataCalculoFmt = useMemo(() => {
    if (!dataCalculo) return new Date().toLocaleDateString("pt-BR");
    try {
      const dt = typeof dataCalculo === "string"
        ? new Date(dataCalculo + "T00:00:00")
        : new Date(dataCalculo);
      if (isNaN(dt.getTime())) return String(dataCalculo);
      return dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    } catch {
      return String(dataCalculo);
    }
  }, [dataCalculo]);

  // Linhas da decomposição — D-07 zero-value hidden (exceto Valor Original e Total final).
  // Ordem: Valor Original (sempre), Correção (se !=0), Multa (se >0), Juros (se >0),
  // Honorários (se >0), Art.523 Multa + Honorários (se art523.total > 0 — D-09),
  // Custas (se custasAtualizado > 0 — D-10), Total (sempre).
  const linhas = useMemo(() => {
    const rows = [];
    rows.push({ label: "Valor Original", value: valorOriginal, signed: false, bold: false, sempre: true });

    if (totalPago > 0) {
      rows.push({
        label: "Pagamento parcial",
        value: -totalPago,
        signed: true,
        bold: false,
      });
    }

    if (correcaoValor !== 0) {
      rows.push({
        label: `Correção monetária (${indexador})`,
        value: correcaoValor,
        signed: true,         // usa fmtBRLSigned + cor vermelha se <0 (D-08)
        bold: false,
      });
    }

    if (multaValor > 0) {
      rows.push({ label: "Multa contratual", value: multaValor, signed: false, bold: false });
    }

    if (jurosValor > 0) {
      rows.push({ label: "Juros de mora", value: jurosValor, signed: false, bold: false });
    }

    if (honorariosValor > 0) {
      rows.push({ label: "Honorários", value: honorariosValor, signed: false, bold: false });
    }

    if (art523Total > 0) {
      if (art523Multa > 0) rows.push({ label: "Art. 523 §1º — Multa (10%)", value: art523Multa, signed: false, bold: false });
      if (art523Hon > 0)   rows.push({ label: "Art. 523 §1º — Honorários (10%)", value: art523Hon, signed: false, bold: false });
    }

    // Phase 7.9 P5 — 1 linha única (substitui as 2 linhas pagas/em-aberto da iteração anterior).
    if (custasAtualizado > 0) {
      rows.push({ label: "Custas pagas atualizadas", value: custasAtualizado, signed: false, bold: false });
    }

    rows.push({ label: "Saldo Devedor Atualizado", value: saldoAtualizado, signed: false, bold: true, sempre: true });
    return rows;
  }, [valorOriginal, totalPago, correcaoValor, indexador, multaValor, jurosValor, honorariosValor, art523Total, art523Multa, art523Hon, custasAtualizado, saldoAtualizado]);

  // Texto formatado para clipboard (D-12).
  const textoFormatado = useMemo(() => {
    const lines = [];
    lines.push(`Composição do Saldo Atualizado — ${credorNome} vs ${devedorNome}`);
    lines.push(`Contrato: ${referencia} — Data: ${dataCalculoFmt}`);
    lines.push("");
    linhas.forEach((l, idx) => {
      const valStr = l.signed ? fmtBRLSigned(l.value) : fmtBRL(l.value);
      const prefix = l.bold ? "= " : (idx === 0 ? "  " : "+ ");
      lines.push(`${prefix}${l.label}: ${valStr}`);
    });
    lines.push("");
    lines.push("(Pode haver discrepância de R$ 0,01 por arredondamento.)");
    return lines.join("\n");
  }, [linhas, credorNome, devedorNome, referencia, dataCalculoFmt]);

  // Handler Copiar (D-12).
  async function handleCopiar() {
    try {
      if (!navigator?.clipboard?.writeText) throw new Error("clipboard indisponível");
      await navigator.clipboard.writeText(textoFormatado);
      toast.success("Copiado!");
    } catch (e) {
      toast.error("Falha ao copiar. Seu navegador pode não suportar clipboard API.");
    }
  }

  // Handler Imprimir (D-13) — pattern canônico de GerarPeticao.jsx:1006-1014.
  // HTML auto-contido com @page A4 + Times New Roman + @media print isolado.
  // ZERO @media print no app principal (D-13 invariante).
  function handleImprimir() {
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) {
      toast.error("Pop-up bloqueado. Permita pop-ups e tente novamente.");
      return;
    }

    const bodyRowsHtml = linhas.map((l) => {
      const valStr = l.signed ? fmtBRLSigned(l.value) : fmtBRL(l.value);
      const color = l.signed && Number(l.value) < 0 ? "#dc2626" : "#000";
      const fontWeight = l.bold ? 700 : 400;
      const borderTop = l.bold ? "1px solid #000" : "none";
      return `<tr><td style="padding:6px 4px;border-top:${borderTop};font-weight:${fontWeight};">${escapeHtml(l.label)}</td><td style="padding:6px 4px;text-align:right;color:${color};border-top:${borderTop};font-weight:${fontWeight};font-variant-numeric:tabular-nums;">${valStr}</td></tr>`;
    }).join("");

    const titulo    = `Composição do Saldo Atualizado — ${escapeHtml(credorNome)} vs ${escapeHtml(devedorNome)}`;
    const subtitulo = `Contrato: ${escapeHtml(String(referencia))} — Data do cálculo: ${escapeHtml(dataCalculoFmt)}`;
    const timestamp = new Date().toLocaleString("pt-BR");

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Composição do Saldo</title>
<style>
@page{size:A4;margin:2.5cm 3cm}
body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;color:#000;background:#fff;margin:0}
h1{font-size:14pt;margin:0 0 6px 0}
.sub{font-size:11pt;color:#333;margin-bottom:20px}
table{width:100%;border-collapse:collapse;margin-top:12px}
.footer-note{margin-top:18px;font-style:italic;color:#666;font-size:10pt}
.sig{margin-top:60px;text-align:center;font-size:11pt}
.sig-line{display:inline-block;border-top:1px solid #000;width:60%;padding-top:4px}
.stamp{margin-top:30px;border-top:1px solid #999;padding-top:8px;font-size:9pt;color:#888;text-align:center}
.bar{background:#f1f5f9;padding:12px 20px;margin-bottom:20px;border-radius:8px;display:flex;gap:12px;align-items:center}
@media print{.bar{display:none}}
</style></head><body>
<div class="bar">
  <button onclick="window.print()" style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;cursor:pointer;font-weight:700;">🖨️ Imprimir / PDF</button>
  <button onclick="window.close()" style="background:#e2e8f0;color:#475569;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">✕ Fechar</button>
  <span style="font-size:11px;color:#64748b">Ctrl+P → Salvar como PDF</span>
</div>
<h1>${titulo}</h1>
<div class="sub">${subtitulo}</div>
<table>
  <thead>
    <tr><th style="text-align:left;padding:6px 4px;border-bottom:2px solid #000;">Componente</th><th style="text-align:right;padding:6px 4px;border-bottom:2px solid #000;">Valor (R$)</th></tr>
  </thead>
  <tbody>${bodyRowsHtml}</tbody>
</table>
<p class="footer-note">Pode haver discrepância de R$ 0,01 por arredondamento. Amortização sequencial conforme Art. 354 do Código Civil.</p>
<div class="sig"><span class="sig-line">${escapeHtml(credorNome)} — Credor(a)</span></div>
<div class="stamp">MR Cobranças — ${escapeHtml(timestamp)}</div>
</body></html>`);
    w.document.close();
    w.focus();
  }

  return (
    <Modal title="Composição do Saldo Atualizado" onClose={onClose} width={600}>
      {/* Header interno — credor / devedor / contrato / data */}
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 12 }}>
        <div><strong>Credor:</strong> {credorNome}</div>
        <div><strong>Devedor:</strong> {devedorNome}</div>
        <div><strong>Contrato:</strong> {String(referencia)} — <strong>Data:</strong> {dataCalculoFmt}</div>
      </div>

      {/* Tabela de decomposição */}
      <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {linhas.map((l, idx) => {
              const isTotal = !!l.bold;
              const valStr = l.signed ? fmtBRLSigned(l.value) : fmtBRL(l.value);
              const color = l.signed ? valueColor(l.value) : "#0f172a";
              return (
                <tr key={idx} style={{
                  borderTop: isTotal ? "2px solid #0f172a" : (idx === 0 ? "none" : "1px solid #f1f5f9"),
                  background: isTotal ? "#f0fdf4" : "transparent",
                }}>
                  <td style={{ padding: "10px 14px", fontWeight: isTotal ? 700 : 500, color: "#0f172a" }}>
                    {l.label}
                  </td>
                  <td style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontFamily: "'Space Grotesk',sans-serif",
                    fontWeight: isTotal ? 800 : 600,
                    fontSize: isTotal ? 16 : 14,
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {valStr}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota rodapé D-11 */}
      <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", margin: "4px 0 16px 0" }}>
        Pode haver discrepância de R$ 0,01 por arredondamento.
      </p>

      {/* Footer — 3 botões */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          onClick={handleCopiar}
          style={{ background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          📋 Copiar
        </button>
        <button
          onClick={handleImprimir}
          style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          🖨️ Imprimir
        </button>
        <button
          onClick={onClose}
          style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          ✕ Fechar
        </button>
      </div>
    </Modal>
  );
}
