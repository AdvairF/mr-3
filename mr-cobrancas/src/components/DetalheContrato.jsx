import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import AtrasoCell from "./AtrasoCell.jsx";
import AdicionarDocumento from "./AdicionarDocumento.jsx";
import { listarDocumentosPorContrato } from "../services/contratos.js";
import { listarPagamentos, calcularSaldoPorDividaIndividual } from "../services/pagamentos.js";

function fmtBRL(v) { if (v == null || v === "") return "—"; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtData(iso) { if (!iso) return "—"; const d = iso.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; }

const CONTRATO_BADGE_META = {
  "NF/Duplicata":   { label: "[NF]",    bg: "#dbeafe", cor: "#1d4ed8" },
  "Compra e Venda": { label: "[C&V]",   bg: "#fef3c7", cor: "#d97706" },
  "Empréstimo":     { label: "[Empr.]", bg: "#ede9fe", cor: "#4c1d95" },
};

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };

function hasCustomEncargos(documento, contrato) {
  return (
    (documento.indice_correcao      ?? null) !== (contrato.indice_correcao      ?? null) ||
    (documento.juros_tipo           ?? null) !== (contrato.juros_tipo           ?? null) ||
    (documento.juros_am_percentual  ?? null) !== (contrato.juros_am_percentual  ?? null) ||
    (documento.multa_percentual     ?? null) !== (contrato.multa_percentual     ?? null) ||
    (documento.honorarios_percentual ?? null) !== (contrato.honorarios_percentual ?? null)
  );
}

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
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [saldosMap, setSaldosMap] = useState({});
  const [saldosLoading, setSaldosLoading] = useState(false);
  const [adicionandoDocumento, setAdicionandoDocumento] = useState(false);

  useEffect(() => {
    setLoadingDocumentos(true);
    listarDocumentosPorContrato(contrato.id)
      .then(docs => setDocumentos(Array.isArray(docs) ? docs : []))
      .catch(e => toast.error("Erro ao carregar documentos: " + e.message))
      .finally(() => setLoadingDocumentos(false));
  }, [contrato.id]);

  useEffect(() => {
    if (!expandedDoc) return;
    const parcelasDoDoc = (dividas || []).filter(d => d.documento_id === expandedDoc);
    if (!parcelasDoDoc.length) return;
    setSaldosLoading(true);
    Promise.all(
      parcelasDoDoc.map(async p => {
        const pgtos = await listarPagamentos(p.id);
        const saldo = calcularSaldoPorDividaIndividual(p, pgtos, hoje);
        return [String(p.id), saldo];
      })
    ).then(entries => {
      setSaldosMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      setSaldosLoading(false);
    }).catch(e => {
      toast.error("Erro ao calcular saldos: " + e.message);
      setSaldosLoading(false);
    });
  }, [expandedDoc, hoje]);

  async function handleDocumentoAdicionado() {
    setAdicionandoDocumento(false);
    await onCarregarTudo();
    listarDocumentosPorContrato(contrato.id)
      .then(docs => setDocumentos(Array.isArray(docs) ? docs : []));
  }

  const devedor = devedores.find(d => String(d.id) === String(contrato.devedor_id));
  const credor  = credores?.find(c => String(c.id) === String(contrato.credor_id));
  const totalQuitado = (dividas || []).filter(d => d.saldo_quitado).reduce((s, d) => s + (d.valor_total || 0), 0);
  const emAberto = (contrato.valor_total || 0) - totalQuitado;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>

      {/* 1. Back button */}
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#64748b", padding: "0 0 12px 0", display: "block" }}>
        ← Contratos
      </button>

      {/* 2. Header card */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: contrato.referencia ? "#0f172a" : "#94a3b8", marginBottom: 6 }}>
          {contrato.referencia || "Contrato"}
        </p>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          Credor: {credor?.nome || "— sem credor"}  ·  Devedor: {devedor?.nome || "—"}
        </p>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
          {contrato.num_documentos || 0} documento(s) · {contrato.num_parcelas_total || 0} parcelas · {fmtBRL(contrato.valor_total)}
        </p>
      </div>

      {/* 3. Financial summary card */}
      <div style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#fff 100%)", borderRadius: 16, padding: "16px 24px", border: "1px solid #bbf7d0", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Resumo Financeiro</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Valor Total",    value: fmtBRL(contrato.valor_total) },
            { label: "Total Quitado",  value: fmtBRL(totalQuitado) },
            { label: "Em Aberto",      value: fmtBRL(Math.max(0, emAberto)) },
          ].map(({ label, value }) => (
            <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 8, marginBottom: 0 }}>(amortização sequencial conforme Art. 354 CC)</p>
      </div>

      {/* 4. Documentos section */}
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>Documentos</p>

      {loadingDocumentos && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>Carregando dados do contrato...</p>
      )}

      {!loadingDocumentos && documentos.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nenhum documento adicionado</p>
          <p style={{ fontSize: 13 }}>Clique em &apos;+ Adicionar Documento&apos; para começar.</p>
        </div>
      )}

      {documentos.map(doc => {
        const isExpanded = expandedDoc === doc.id;
        const parcelasDoc = (dividas || [])
          .filter(d => d.documento_id === doc.id)
          .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""));
        const atrasadasDoc = parcelasDoc.filter(d => !d.saldo_quitado && d.data_vencimento && d.data_vencimento < hoje).length;
        const badgeMeta = CONTRATO_BADGE_META[doc.tipo] || { label: doc.tipo, bg: "#f1f5f9", cor: "#64748b" };
        const custom = hasCustomEncargos(doc, contrato);

        return (
          <div
            key={doc.id}
            style={{ background: isExpanded ? "#fff" : "#f8fafc", border: isExpanded ? "1px solid #c7d2fe" : "1px solid #e8f0f7", borderRadius: 12, padding: "12px 16px", marginBottom: 12, cursor: "pointer" }}
            onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
          >
            {/* Summary row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", background: badgeMeta.bg, color: badgeMeta.cor, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                  {badgeMeta.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{doc.numero_doc || doc.tipo}</span>
                {custom && (
                  <span style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 99, marginLeft: 4 }}>
                    Custom
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {doc.num_parcelas}x · {fmtBRL(doc.valor)}
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>a partir de {fmtData(doc.data_emissao)}</span>
                </span>
                {atrasadasDoc > 0
                  ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{atrasadasDoc} parcelas</span>
                  : <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                }
                <span style={{ fontSize: 11, color: "#64748b" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Expanded: parcelas table */}
            {isExpanded && (
              <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc" }}>
                        <th style={th}>Nº</th>
                        <th style={th}>Vencimento</th>
                        <th style={th}>Valor</th>
                        <th style={th}>Saldo</th>
                        <th style={th}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saldosLoading && parcelasDoc.length > 0 ? (
                        <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#94a3b8" }}>Carregando parcelas...</td></tr>
                      ) : (
                        parcelasDoc.map((p, i) => (
                          <tr
                            key={p.id}
                            onClick={() => onVerDetalhe(p)}
                            style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                            onMouseLeave={e => e.currentTarget.style.background = ""}
                          >
                            <td style={td}>{i + 1}</td>
                            <td style={td}>{fmtData(p.data_vencimento)}</td>
                            <td style={td}>{fmtBRL(p.valor_total)}</td>
                            <td style={td}>
                              {saldosMap[String(p.id)] != null
                                ? fmtBRL(saldosMap[String(p.id)])
                                : (saldosLoading ? "..." : "—")
                              }
                            </td>
                            <td style={td}>
                              {p.saldo_quitado
                                ? <span style={{ background: "#dcfce7", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Quitado</span>
                                : <AtrasoCell dataVencimento={p.data_vencimento} />
                              }
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* 5. Adicionar Documento */}
      {!adicionandoDocumento && (
        <div style={{ marginTop: 8 }}>
          <Btn color="#0d9488" sm onClick={() => setAdicionandoDocumento(true)}>+ Adicionar Documento</Btn>
        </div>
      )}

      {adicionandoDocumento && (
        <AdicionarDocumento
          contrato={contrato}
          onDocumentoAdicionado={handleDocumentoAdicionado}
          onCancelar={() => setAdicionandoDocumento(false)}
        />
      )}

    </div>
  );
}
