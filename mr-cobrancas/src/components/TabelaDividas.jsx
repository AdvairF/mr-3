import { useState, useEffect } from "react";
import AtrasoCell from "./AtrasoCell.jsx";
import Btn from "./ui/Btn.jsx";
import { calcularSaldosPorDivida } from "../utils/devedorCalc.js";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const STATUS_DIVIDA_META = {
  "em cobrança": { bg: "#dbeafe", cor: "#1d4ed8", label: "Em Cobrança" },
  "quitada":     { bg: "#dcfce7", cor: "#065f46", label: "Quitada" },
  "acordo":      { bg: "#fef3c7", cor: "#d97706", label: "Acordo" },
};

function StatusBadgeDivida({ status }) {
  const s = STATUS_DIVIDA_META[status] || { bg: "#f1f5f9", cor: "#64748b", label: status };
  return (
    <span style={{ display: "inline-block", background: s.bg, color: s.cor, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// Art. 354 CC: pagamentos are amortized sequentially across a devedor's dividas (oldest first).
// devedores[i].dividas contains alias-enriched dividas from dividasMap in carregarTudo().
// Using devedor directly gives the motor all the aliases it needs (indexador, juros_am, multa_pct, honorarios_pct).
function buildDevedorObjParaSaldo(divida, devedores, allPagamentos) {
  const devedor = devedores.find(d => String(d.id) === String(divida.devedor_id));
  if (!devedor) return null;
  const pagamentosDoDevedor = allPagamentos.filter(p => String(p.devedor_id) === String(divida.devedor_id));
  return { devedor, pagamentos: pagamentosDoDevedor };
}

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };

const POR_PAG = 20;

export default function TabelaDividas({ dividas, devedores, credores, allPagamentos, hoje, onVerDetalhe }) {
  const [pagina, setPagina] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => { setPagina(1); }, [dividas]);

  const total = dividas.length;
  const paginas = Math.ceil(total / POR_PAG);
  const visiveis = dividas.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  return (
    <div style={{ width: "100%" }}>
      {dividas.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nenhuma dívida encontrada</p>
          <p style={{ fontSize: 13 }}>Ajuste os filtros acima ou cadastre uma nova dívida na aba Pessoas.</p>
        </div>
      )}

      {dividas.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={th}>Devedor</th>
                <th style={th}>Credor</th>
                <th style={th}>Valor Original</th>
                <th style={th}>Saldo Atualizado</th>
                <th style={th}>Vencimento</th>
                <th style={th}>Status</th>
                <th style={th}>Atraso</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(d => {
                const devedor = devedores.find(dv => String(dv.id) === String(d.devedor_id));
                const credor = credores?.find(c => String(c.id) === String(d.credor_id));
                const obj = buildDevedorObjParaSaldo(d, devedores, allPagamentos);
                const saldosMap = obj ? calcularSaldosPorDivida(obj.devedor, obj.pagamentos, hoje) : null;
                const saldo = saldosMap != null ? (saldosMap[String(d.id)] ?? null) : null;
                const saldoExibido = d.saldo_quitado === true ? 0 : saldo;
                return (
                  <tr
                    key={d.id}
                    onClick={() => onVerDetalhe(d)}
                    onMouseEnter={() => setHoveredRow(d.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{ borderBottom: "1px solid #f1f5f9", background: hoveredRow === d.id ? "#f8fafc" : "#fff", cursor: "pointer", transition: "background .15s" }}
                  >
                    <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{devedor?.nome || `Devedor #${d.devedor_id}`}</td>
                    <td style={td}>
                      {credor
                        ? credor.nome
                        : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— sem credor</span>
                      }
                    </td>
                    <td style={td}>{fmtBRL(d.valor_total)}</td>
                    <td style={td}>
                      {saldoExibido == null
                        ? <span style={{ color: "#94a3b8", fontSize: 13 }}>Calculando...</span>
                        : fmtBRL(saldoExibido)
                      }
                    </td>
                    <td style={td}>{fmtData(d.data_vencimento)}</td>
                    <td style={td}><StatusBadgeDivida status={d.status} /></td>
                    <td style={td}>
                      {d.saldo_quitado === true
                        ? (
                          <span style={{
                            display: "inline-block",
                            background: "#dcfce7",
                            color: "#065f46",
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 99,
                            whiteSpace: "nowrap",
                          }}>
                            Saldo quitado
                          </span>
                        )
                        : <AtrasoCell dataVencimento={d.data_vencimento} />
                      }
                    </td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <Btn sm outline onClick={() => onVerDetalhe(d)}>Ver Detalhe</Btn>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {paginas > 1 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16, alignItems: "center" }}>
          <Btn sm outline disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>← Anterior</Btn>
          <span style={{ fontSize: 13, color: "#64748b", padding: "6px 12px" }}>Página {pagina} de {paginas}</span>
          <Btn sm outline disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>Próximo →</Btn>
        </div>
      )}
    </div>
  );
}
