import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import AtrasoCell from "./AtrasoCell.jsx";
import { listarPagamentos, calcularSaldoPorDividaIndividual } from "../services/pagamentos.js";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const CONTRATO_BADGE_META = {
  "NF/Duplicata":   { label: "[NF]",    bg: "#dbeafe", cor: "#1d4ed8" },
  "Compra e Venda": { label: "[C&V]",   bg: "#fef3c7", cor: "#d97706" },
  "Empréstimo":     { label: "[Empr.]", bg: "#ede9fe", cor: "#4c1d95" },
};

export default function DetalheContrato({
  contrato,
  dividas,
  devedores,
  credores,
  allPagamentos,
  hoje,
  onVoltar,
  onVerDetalhe,
  onCarregarTudo,
}) {
  const [saldosMap, setSaldosMap] = useState({});
  const [saldosLoading, setSaldosLoading] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  const parcelas = [...(dividas || [])].sort((a, b) =>
    (a.data_vencimento || "").localeCompare(b.data_vencimento || "")
  );

  const devedor = devedores.find(d => String(d.id) === String(contrato.devedor_id));
  const credor = credores?.find(c => String(c.id) === String(contrato.credor_id));
  const tipoBadge = CONTRATO_BADGE_META[contrato.tipo] || { label: contrato.tipo, bg: "#f1f5f9", cor: "#64748b" };

  useEffect(() => {
    if (!parcelas.length) return;
    setSaldosLoading(true);
    Promise.all(
      parcelas.map(async (p) => {
        const pgtos = await listarPagamentos(p.id);
        const saldo = calcularSaldoPorDividaIndividual(p, pgtos, hoje);
        return [String(p.id), saldo];
      })
    ).then(entries => {
      setSaldosMap(Object.fromEntries(entries));
      setSaldosLoading(false);
    }).catch(e => {
      toast.error("Erro ao calcular saldos: " + e.message);
      setSaldosLoading(false);
    });
  }, [parcelas.length, hoje]);

  const totalQuitado = parcelas
    .filter(p => p.saldo_quitado === true)
    .reduce((s, p) => s + (p.valor_total || 0), 0);
  const emAberto = contrato.valor_total - totalQuitado;

  const thStyle = {
    padding: "8px 12px",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: ".5px",
    textAlign: "left",
    background: "#f8fafc",
    borderBottom: "1px solid #e8f0f7",
    whiteSpace: "nowrap",
  };
  const tdStyle = {
    padding: "10px 12px",
    fontSize: 13,
    color: "#374151",
    borderBottom: "1px solid #f1f5f9",
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>

      {/* 1. Back button */}
      <button
        onClick={onVoltar}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          color: "#64748b",
          padding: "0 0 12px 0",
          display: "block",
        }}
      >
        ← Contratos
      </button>

      {/* 2. Header card */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{
            display: "inline-block",
            background: tipoBadge.bg,
            color: tipoBadge.cor,
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 99,
            whiteSpace: "nowrap",
          }}>
            {tipoBadge.label}
          </span>
          <p style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 700,
            fontSize: 22,
            color: "#0f172a",
            margin: 0,
          }}>
            {contrato.referencia || contrato.tipo}
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#64748b", fontSize: 13, marginBottom: 4 }}>
          <span>Credor: <strong style={{ color: "#374151" }}>{credor?.nome || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— sem credor</span>}</strong></span>
          <span>Devedor: <strong style={{ color: "#374151" }}>{devedor?.nome}</strong></span>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>
          {contrato.num_parcelas} parcelas · {fmtBRL(contrato.valor_total)} · a partir de {fmtData(contrato.data_inicio)}
        </p>
      </div>

      {/* 3. Financial summary card */}
      <div style={{
        background: "linear-gradient(135deg,#f0fdf4 0%,#fff 100%)",
        borderRadius: 16,
        padding: "16px 20px",
        border: "1px solid #bbf7d0",
        marginBottom: 16,
      }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Resumo Financeiro</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Valor Total
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {fmtBRL(contrato.valor_total)}
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Total Quitado
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {fmtBRL(totalQuitado)}
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Em Aberto
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {fmtBRL(Math.max(0, emAberto))}
            </p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, fontStyle: "italic", marginBottom: 0 }}>
          (amortização sequencial conforme Art. 354 CC)
        </p>
      </div>

      {/* 4. Parcelas table card */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8f0f7", padding: "16px 20px" }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Parcelas</p>

        {saldosLoading && parcelas.length > 0 ? (
          <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>Carregando parcelas...</p>
        ) : parcelas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>Nenhuma parcela gerada</p>
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>As parcelas aparecerão aqui após a criação do contrato.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Vencimento</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Saldo</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {parcelas.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => onVerDetalhe(p)}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      background: hoveredRow === p.id ? "#f8fafc" : "transparent",
                      cursor: "pointer",
                      transition: "background .15s",
                    }}
                  >
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={tdStyle}>{fmtData(p.data_vencimento)}</td>
                    <td style={tdStyle}>{fmtBRL(p.valor_total)}</td>
                    <td style={tdStyle}>
                      {saldosLoading
                        ? <span style={{ color: "#94a3b8", fontSize: 11 }}>Calculando...</span>
                        : p.saldo_quitado === true
                          ? <span style={{ color: "#065f46" }}>R$ 0,00</span>
                          : saldosMap[String(p.id)] != null
                            ? fmtBRL(saldosMap[String(p.id)])
                            : "—"
                      }
                    </td>
                    <td style={tdStyle}>
                      {p.saldo_quitado === true
                        ? <span style={{ display: "inline-block", background: "#dcfce7", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>Quitado</span>
                        : <AtrasoCell dataVencimento={p.data_vencimento} />
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
