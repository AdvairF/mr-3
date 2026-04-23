import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";

// fmtBRL local — não importa nada externo (componente 100% isolado, D-02)
function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const cellInputStyle = { width: "100%", padding: "6px 8px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif", boxSizing: "border-box" };
const cellInputDisabledStyle = { ...cellInputStyle, background: "#f1f5f9", color: "#94a3b8", cursor: "not-allowed" };
const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "6px 10px", verticalAlign: "middle" };

const INTERVALO_DIAS = {
  Mensal: 30,
  Quinzenal: 15,
  Semanal: 7,
};

/**
 * TabelaParcelasEditaveis — Componente 100% isolado (Phase 7.5, D-02).
 *
 * Props (shape obrigatório — D-02):
 * @param {number}                                                   valorTotal              Soma invariante (R$) — parcelas devem totalizar exatamente isso (tolerância R$ 0,01)
 * @param {Array<{ id?, numero, valor_total, data_vencimento }>}     parcelasIniciais        N linhas iniciais
 * @param {"create" | "edit"}                                        modoEdicao              Controla contexto (ids preexistentes em "edit")
 * @param {Set<string>}                                              dividasComPagamentoIds  IDs de parcelas com pagamento — readonly em valor+data (D-06)
 * @param {(parcelas) => void}                                       [onChange]              Opcional — chamado a cada edit
 * @param {(parcelas) => Promise<void>}                              onSubmit                Chamado ao clicar Salvar (após validação client)
 * @param {() => void}                                               onCancel                Chamado ao clicar Cancelar
 * @param {boolean}                                                  [hideFooter]            Opcional — oculta botões Salvar/Cancelar (uso em modo create embutido, quando pai tem botões próprios)
 *
 * NÃO chama service layer, NÃO faz fetch, NÃO navega, NÃO toca state global.
 * Reusável em Phases 7.6 (Custas Judiciais) e 7.7 (Ajuste de valor contratual).
 */
export default function TabelaParcelasEditaveis({
  valorTotal,
  parcelasIniciais,
  modoEdicao,
  dividasComPagamentoIds,
  onChange,
  onSubmit,
  onCancel,
  hideFooter,
}) {
  const [parcelas, setParcelas] = useState(() =>
    (parcelasIniciais || []).map((p, i) => ({
      id: p.id,
      numero: p.numero != null ? p.numero : i + 1,
      valor_total: p.valor_total != null ? p.valor_total : 0,
      data_vencimento: p.data_vencimento || "",
    }))
  );
  // Espelha parcelas — 1 string por linha. Única fonte de verdade do texto renderizado no input valor.
  // Permite campo vazio durante edição (backspace apaga tudo sem forçar "0" residual).
  const [valoresStr, setValoresStr] = useState(() =>
    (parcelasIniciais || []).map(p => (p.valor_total != null ? String(p.valor_total) : "0"))
  );
  const [salvando, setSalvando] = useState(false);
  const [sugerirAberto, setSugerirAberto] = useState(false);

  const readonlySet = dividasComPagamentoIds || new Set();

  function isReadonly(p) {
    return !!(p.id && readonlySet.has(String(p.id)));
  }

  function atualizarLinha(i, campo, valor) {
    setParcelas(prev => {
      const next = prev.map((p, idx) => idx === i ? { ...p, [campo]: campo === "valor_total" ? Number(valor) : valor } : p);
      if (typeof onChange === "function") onChange(next);
      return next;
    });
  }

  // Setter dedicado do input valor: mantém string renderizada em valoresStr[i] (permite "")
  // e propaga Number normalizado para parcelas[i].valor_total (soma/validações continuam numéricas).
  function atualizarValorStr(i, str) {
    setValoresStr(prev => {
      const next = [...prev];
      next[i] = str;
      return next;
    });
    const n = str === "" ? 0 : Number(str);
    const valorNumerico = Number.isFinite(n) ? n : 0;
    setParcelas(prev => {
      const next = prev.map((p, idx) => idx === i ? { ...p, valor_total: valorNumerico } : p);
      if (typeof onChange === "function") onChange(next);
      return next;
    });
  }

  const soma = useMemo(
    () => parcelas.reduce((s, p) => s + Number(p.valor_total || 0), 0),
    [parcelas]
  );
  const diff = useMemo(() => Number((soma - Number(valorTotal || 0)).toFixed(2)), [soma, valorTotal]);

  const parcela1DataPreenchida = !!(parcelas[0] && parcelas[0].data_vencimento);

  function sugerirDatas(intervaloDias) {
    if (!parcela1DataPreenchida) {
      toast("Preencha a data da primeira parcela antes de sugerir datas.", { icon: "⚠️" });
      return;
    }
    const base = parcelas[0].data_vencimento; // YYYY-MM-DD
    setParcelas(prev => {
      const next = prev.map((p, idx) => {
        if (idx === 0) return p;
        if (isReadonly(p)) return p; // não mexe em parcelas pagas
        const d = new Date(base + "T12:00:00");
        d.setDate(d.getDate() + intervaloDias * idx);
        return { ...p, data_vencimento: d.toISOString().slice(0, 10) };
      });
      if (typeof onChange === "function") onChange(next);
      return next;
    });
    setSugerirAberto(false);
  }

  function sugerirDatasPersonalizado() {
    const resp = window.prompt("Intervalo em dias entre parcelas (ex: 10):", "30");
    if (resp == null) return;
    const n = parseInt(resp, 10);
    if (!Number.isFinite(n) || n <= 0) {
      toast("Intervalo inválido. Informe um número inteiro positivo.", { icon: "⚠️" });
      return;
    }
    sugerirDatas(n);
  }

  async function handleSalvar() {
    // Validação 1 (D-07 a): todas as datas preenchidas
    for (const p of parcelas) {
      if (!p.data_vencimento) {
        toast.error("Todas as parcelas devem ter data de vencimento preenchida.");
        return;
      }
    }

    // Validação 2 (D-08 / D-07 b): soma === valorTotal com tolerância R$ 0,01
    if (Math.abs(soma - Number(valorTotal || 0)) > 0.01) {
      toast.error(
        `Soma das parcelas (${fmtBRL(soma)}) não bate com valor total (${fmtBRL(valorTotal)}). Ajuste antes de salvar.`
      );
      return;
    }

    // Validação 3 (D-07 c / D-09): ordem não-decrescente quando ordenado por numero
    const ordenadas = [...parcelas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
    for (let i = 1; i < ordenadas.length; i++) {
      if (ordenadas[i].data_vencimento < ordenadas[i - 1].data_vencimento) {
        toast.error(
          `Datas devem estar em ordem crescente (parcela ${ordenadas[i - 1].numero} vence depois da ${ordenadas[i].numero}).`
        );
        return;
      }
    }

    setSalvando(true);
    try {
      await onSubmit(parcelas);
    } catch (e) {
      toast.error("Erro ao salvar parcelas: " + (e?.message || "desconhecido"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #e8f0f7", borderRadius: 12, padding: "12px 16px", marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", margin: 0 }}>
          {modoEdicao === "edit" ? "Editar parcelas" : "Parcelas do documento"}
        </p>
        <span style={{ fontSize: 11, color: Math.abs(diff) <= 0.01 ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
          Soma: {fmtBRL(soma)} / Total: {fmtBRL(valorTotal)}
          {Math.abs(diff) > 0.01 && ` (Δ ${diff > 0 ? "+" : ""}${fmtBRL(Math.abs(diff))})`}
        </span>
      </div>

      {/* Sugerir datas dropdown */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Btn
          color="#4f46e5"
          sm
          outline
          onClick={() => setSugerirAberto(a => !a)}
          disabled={!parcela1DataPreenchida}
          title={!parcela1DataPreenchida ? "Preencha a data da primeira parcela" : undefined}
        >
          Sugerir datas ▾
        </Btn>
        {sugerirAberto && parcela1DataPreenchida && (
          <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,.08)", zIndex: 10, minWidth: 180 }}>
            {Object.entries(INTERVALO_DIAS).map(([label, dias]) => (
              <button
                key={label}
                onClick={() => sugerirDatas(dias)}
                style={{ display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer", color: "#0f172a" }}
                onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                {label} ({dias} dias)
              </button>
            ))}
            <button
              onClick={sugerirDatasPersonalizado}
              style={{ display: "block", width: "100%", padding: "8px 12px", background: "none", border: "none", borderTop: "1px solid #e2e8f0", textAlign: "left", fontSize: 13, cursor: "pointer", color: "#0f172a" }}
              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              Personalizado...
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={{ ...th, width: 40 }}>Nº</th>
              <th style={th}>Valor</th>
              <th style={th}>Data de vencimento</th>
            </tr>
          </thead>
          <tbody>
            {parcelas.map((p, i) => {
              const ro = isReadonly(p);
              const tooltip = ro ? "Parcela com pagamento registrado — estorne primeiro para editar (botão 'Excluir pagamento' na seção 'Pagamentos Recebidos')." : undefined;
              return (
                <tr
                  key={p.id || `novo-${i}`}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: ro ? "#f1f5f9" : "transparent",
                  }}
                  title={tooltip}
                >
                  <td style={{ ...td, color: "#64748b", fontWeight: 700 }}>
                    {ro && <span style={{ marginRight: 6 }} aria-label="parcela bloqueada">🔒</span>}
                    {p.numero}
                  </td>
                  <td style={td}>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={valoresStr[i] ?? ""}
                      onChange={e => atualizarValorStr(i, e.target.value)}
                      disabled={ro}
                      title={tooltip}
                      style={ro ? cellInputDisabledStyle : cellInputStyle}
                    />
                  </td>
                  <td style={td}>
                    <input
                      type="date"
                      value={p.data_vencimento}
                      onChange={e => atualizarLinha(i, "data_vencimento", e.target.value)}
                      disabled={ro}
                      title={tooltip}
                      style={ro ? cellInputDisabledStyle : cellInputStyle}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!hideFooter && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
          <Btn color="#0d9488" sm onClick={handleSalvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Salvar"}
          </Btn>
          <button
            onClick={onCancel}
            disabled={salvando}
            style={{ background: "none", border: "none", cursor: salvando ? "not-allowed" : "pointer", fontSize: 13, color: "#64748b", fontWeight: 700, padding: 0 }}
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}
