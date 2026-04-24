import { useState, useEffect } from "react";
import Btn from "./ui/Btn.jsx";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };
const POR_PAG = 20;

export default function TabelaContratos({
  contratos,
  devedores,
  credores,
  parcelasPorContrato,
  totaisPorContrato,
  hoje,
  onVerDetalhe,
  // Phase 7.8.2a — coluna opcional "Saldo Atualizado" (cache SWR).
  // Quando todas as 3 props abaixo são fornecidas, a coluna é renderizada.
  saldoAtualizadoColuna,        // { header: string, Cell: React.Component, allPagamentosDivida: array }
}) {
  const [pagina, setPagina] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => { setPagina(1); }, [contratos]);

  const total = contratos.length;
  const paginas = Math.ceil(total / POR_PAG);
  const visiveis = contratos.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  if (contratos.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
        <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nenhum contrato encontrado</p>
        <p style={{ fontSize: 13 }}>Crie o primeiro contrato usando o botão acima.</p>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f8fafc" }}>
              <th style={th}>Credor</th>
              <th style={th}>Devedor</th>
              <th style={th}>Docs</th>
              <th style={th}>Parcelas</th>
              <th style={th}>Saldo</th>
              {saldoAtualizadoColuna ? <th style={th}>{saldoAtualizadoColuna.header}</th> : null}
              <th style={th}>Em Atraso</th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map(c => {
              const devedor = devedores.find(d => String(d.id) === String(c.devedor_id));
              const credor = credores?.find(cr => String(cr.id) === String(c.credor_id));
              const parcelas = parcelasPorContrato.get(String(c.id)) || [];
              const atrasadas = parcelas.filter(d =>
                !d.saldo_quitado && d.data_vencimento && d.data_vencimento < hoje
              ).length;
              const SaldoCell = saldoAtualizadoColuna?.Cell;

              return (
                <tr
                  key={c.id}
                  onClick={() => onVerDetalhe(c)}
                  onMouseEnter={() => setHoveredRow(c.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{ borderBottom: "1px solid #f1f5f9", background: hoveredRow === c.id ? "#f8fafc" : "#fff", cursor: "pointer", transition: "background .15s" }}
                >
                  <td style={td}>
                    {credor
                      ? credor.nome
                      : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— sem credor</span>
                    }
                  </td>
                  <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>
                    {devedor?.nome || "—"}
                  </td>
                  <td style={td}>
                    {c.num_documentos > 0
                      ? c.num_documentos
                      : <span style={{ color: "#94a3b8" }}>—</span>
                    }
                  </td>
                  <td style={td}>
                    {c.num_parcelas_total > 0
                      ? `${c.num_parcelas_total}x`
                      : <span style={{ color: "#94a3b8" }}>—</span>
                    }
                  </td>
                  {(() => {
                    const t = totaisPorContrato?.get(String(c.id));
                    if (!t) {
                      return (
                        <td style={td}>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginBottom: 2 }}>—</div>
                          <div style={{ fontSize: 14, color: "#94a3b8" }}>—</div>
                        </td>
                      );
                    }
                    return (
                      <td style={td}>
                        <div style={{ fontSize: 10, color: "#64748b", marginBottom: 2 }}>
                          {fmtBRL(t.pago)} pago
                        </div>
                        <div style={{ fontWeight: 700, color: t.emAberto > 0 ? "#dc2626" : "#16a34a" }}>
                          {t.emAberto > 0 ? fmtBRL(t.emAberto) : "Quitado"}
                        </div>
                      </td>
                    );
                  })()}
                  {SaldoCell ? (
                    <td style={td}>
                      <SaldoCell
                        contrato={c}
                        dividasDoContrato={parcelas}
                        allPagamentosDivida={saldoAtualizadoColuna.allPagamentosDivida}
                        hoje={undefined /* hook usa default Goiânia */}
                      />
                    </td>
                  ) : null}
                  <td style={td}>
                    {atrasadas > 0
                      ? <span style={{ color: "#dc2626", fontWeight: 700 }}>{atrasadas} parcelas</span>
                      : <span style={{ color: "#94a3b8" }}>—</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
