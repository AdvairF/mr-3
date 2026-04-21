import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import {
  listarPagamentos,
  criarPagamento,
  atualizarPagamento,
  excluirPagamento,
  calcularSaldoPorDividaIndividual,
} from "../services/pagamentos.js";
import { atualizarSaldoQuitado } from "../services/dividas.js";

// Globals disponíveis via App.jsx: dbGet, dbInsert, dbUpdate, dbDelete, toast — NÃO importar

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}

const th = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 700,
  color: "#64748b",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: ".5px",
  whiteSpace: "nowrap",
};

const td = {
  padding: "9px 10px",
  color: "#374151",
  verticalAlign: "middle",
};

export default function PagamentosDivida({ divida, hoje, onSaldoChange }) {
  const [pagamentos, setPagamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState(null);
  const [editForm, setEditForm] = useState({ data_pagamento: "", valor: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);
  const [novoForm, setNovoForm] = useState({ data_pagamento: "", valor: "", observacao: "" });

  // D-07: Carregamento lazy ao montar
  useEffect(() => {
    setLoading(true);
    listarPagamentos(divida.id)
      .then(data => {
        setPagamentos(Array.isArray(data) ? data : []);
      })
      .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
      .finally(() => setLoading(false));
  }, [divida.id]);

  // Helper — recalcular e sincronizar saldo_quitado após mutação
  async function recalcularESincronizar(listaPagamentos) {
    const novoSaldo = calcularSaldoPorDividaIndividual(divida, listaPagamentos, hoje);
    const quitado = novoSaldo <= 0;
    try {
      await atualizarSaldoQuitado(divida.id, quitado);
    } catch (e) {
      toast.error("Aviso: falha ao sincronizar status quitado — " + e.message);
    }
    if (onSaldoChange) onSaldoChange(novoSaldo);
  }

  // PAG-01: Criar pagamento
  async function handleCriar(e) {
    e.preventDefault();
    if (!novoForm.data_pagamento || !novoForm.valor) {
      toast.error("Preencha data e valor");
      return;
    }
    setSalvando(true);
    try {
      await criarPagamento({
        divida_id: divida.id,
        data_pagamento: novoForm.data_pagamento,
        valor: parseFloat(novoForm.valor),
        observacao: novoForm.observacao || null,
      });
      const lista = await listarPagamentos(divida.id);
      const listaAtual = Array.isArray(lista) ? lista : [];
      setPagamentos(listaAtual);
      await recalcularESincronizar(listaAtual);
      setNovoForm({ data_pagamento: "", valor: "", observacao: "" });
      toast.success("Pagamento registrado");
    } catch (e) {
      toast.error("Erro ao registrar pagamento: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // D-05: Iniciar edição inline
  function iniciarEdicao(row) {
    setEditandoId(row.id);
    setEditForm({
      data_pagamento: row.data_pagamento?.slice(0, 10) || "",
      valor: String(row.valor || ""),
      observacao: row.observacao || "",
    });
  }

  // PAG-03: Salvar edição inline
  async function handleSalvarEdit(row) {
    if (!editForm.data_pagamento || !editForm.valor || isNaN(parseFloat(editForm.valor))) {
      toast.error("Preencha data e valor");
      return;
    }
    try {
      await atualizarPagamento(row.id, {
        data_pagamento: editForm.data_pagamento,
        valor: parseFloat(editForm.valor),
        observacao: editForm.observacao || null,
      });
      const lista = await listarPagamentos(divida.id);
      const listaAtual = Array.isArray(lista) ? lista : [];
      setPagamentos(listaAtual);
      await recalcularESincronizar(listaAtual);
      setEditandoId(null);
      toast.success("Pagamento atualizado");
    } catch (e) {
      toast.error("Erro ao atualizar: " + e.message);
    }
  }

  // PAG-04: Excluir com confirmação (D-06 LOCKED)
  async function handleExcluir(row) {
    if (!window.confirm("Excluir este pagamento?")) return;
    try {
      await excluirPagamento(row.id);
      const lista = await listarPagamentos(divida.id);
      const listaAtual = Array.isArray(lista) ? lista : [];
      setPagamentos(listaAtual);
      await recalcularESincronizar(listaAtual);
      toast.success("Pagamento excluído");
    } catch (e) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      padding: "18px 20px",
      border: "1px solid #e8f0f7",
      marginBottom: 16,
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {/* Seção 1 — Histórico de Pagamentos */}
      <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12, margin: "0 0 12px 0" }}>
        Histórico de Pagamentos
      </p>

      {loading && (
        <p style={{ color: "#94a3b8", fontSize: 13 }}>Carregando...</p>
      )}

      {!loading && pagamentos.length === 0 && (
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
          Nenhum pagamento registrado
        </p>
      )}

      {!loading && pagamentos.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
            <colgroup>
              <col style={{ width: 96 }} />
              <col style={{ width: 112 }} />
              <col />
              <col style={{ width: 80 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={th}>Data</th>
                <th style={th}>Valor</th>
                <th style={th}>Observação</th>
                <th style={{ ...th, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map(row => (
                <tr key={row.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  {editandoId === row.id ? (
                    <>
                      <td style={td}>
                        <input
                          type="date"
                          value={editForm.data_pagamento}
                          onChange={e => setEditForm(f => ({ ...f, data_pagamento: e.target.value }))}
                          style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13 }}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="number"
                          step="0.01"
                          value={editForm.valor}
                          onChange={e => setEditForm(f => ({ ...f, valor: e.target.value }))}
                          style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, width: 100 }}
                        />
                      </td>
                      <td style={td}>
                        <input
                          type="text"
                          value={editForm.observacao}
                          onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                          style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, width: "100%" }}
                        />
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <Btn
                            sm
                            outline
                            onClick={() => handleSalvarEdit(row)}
                            style={{ color: "#3d9970" }}
                            aria-label="Confirmar edição"
                          >
                            OK
                          </Btn>
                          <Btn
                            sm
                            outline
                            onClick={() => setEditandoId(null)}
                            style={{ color: "#64748b" }}
                            aria-label="Cancelar edição"
                          >
                            ✕
                          </Btn>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={td}>{fmtData(row.data_pagamento)}</td>
                      <td style={td}>{fmtBRL(row.valor)}</td>
                      <td style={{ ...td, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.observacao || "—"}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <Btn sm outline onClick={() => iniciarEdicao(row)}>
                            Editar
                          </Btn>
                          <Btn
                            sm
                            danger
                            onClick={() => handleExcluir(row)}
                            aria-label={`Excluir pagamento de ${fmtData(row.data_pagamento)}`}
                          >
                            Excluir
                          </Btn>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Seção 2 — Divisor */}
      <hr style={{ margin: "16px 0", border: "none", borderTop: "1px solid #e2e8f0" }} />

      {/* Seção 3 — Registrar Pagamento */}
      <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12, margin: "0 0 12px 0" }}>
        Registrar Pagamento
      </p>

      <form onSubmit={handleCriar}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Campo Data */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Data
            </label>
            <input
              type="date"
              value={novoForm.data_pagamento}
              onChange={e => setNovoForm(f => ({ ...f, data_pagamento: e.target.value }))}
              required
              style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>

          {/* Campo Valor */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Valor
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={novoForm.valor}
              onChange={e => setNovoForm(f => ({ ...f, valor: e.target.value }))}
              required
              style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, width: 120, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>

          {/* Campo Observação */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 140 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Observação
            </label>
            <input
              type="text"
              value={novoForm.observacao}
              onChange={e => setNovoForm(f => ({ ...f, observacao: e.target.value }))}
              style={{ padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            />
          </div>

          {/* Botão submit */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={salvando}
              className="mr-btn"
              style={{
                background: salvando ? "#2d7355" : "linear-gradient(135deg, #3d9970 0%, #3d9970dd 100%)",
                color: "#fff",
                border: "1px solid transparent",
                borderRadius: 12,
                padding: "10px 18px",
                cursor: salvando ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: "inline-flex",
                alignItems: "center",
                opacity: salvando ? 0.6 : 1,
                transition: "all .18s cubic-bezier(.4,0,.2,1)",
                boxShadow: "0 12px 24px #3d997025",
                whiteSpace: "nowrap",
                letterSpacing: "-.1px",
              }}
            >
              {salvando ? "Salvando..." : "Salvar Pagamento"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
