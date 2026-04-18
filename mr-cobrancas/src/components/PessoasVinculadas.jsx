import React, { useState, useEffect, useCallback } from "react";
import { listar, listarInverso, adicionarVinculo, removerVinculo, atualizarVinculo } from "../services/devedoresVinculados.js";
import toast from "react-hot-toast";

const TIPOS_VINCULO = [
  { v: "SOCIO", l: "Sócio" },
  { v: "REPRESENTANTE_LEGAL", l: "Representante Legal" },
  { v: "CONJUGE", l: "Cônjuge" },
  { v: "COOBRIGADO", l: "Coobrigado" },
  { v: "AVALISTA", l: "Avalista" },
  { v: "FIADOR", l: "Fiador" },
  { v: "RESPONSAVEL_SOLIDARIO", l: "Responsável Solidário" },
  { v: "OUTRO", l: "Outro" },
];

const TIPO_COLOR = {
  SOCIO: "#7c3aed",
  REPRESENTANTE_LEGAL: "#0891b2",
  CONJUGE: "#be185d",
  COOBRIGADO: "#4f46e5",
  AVALISTA: "#d97706",
  FIADOR: "#16a34a",
  RESPONSAVEL_SOLIDARIO: "#dc2626",
  OUTRO: "#64748b",
};

function tipoLabel(v) {
  const t = TIPOS_VINCULO.find(t => t.v === v);
  return t ? t.l : v;
}

export default function PessoasVinculadas({ devedor, devedores, pagamentos, hoje, onNavigate }) {
  const [vinculados, setVinculados] = useState([]);
  const [inversos, setInversos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [busca, setBusca] = useState("");
  const [modalForm, setModalForm] = useState({ vinculadoId: "", vinculadoNome: "", tipoVinculo: "COOBRIGADO", observacao: "" });
  const [editForm, setEditForm] = useState({ tipoVinculo: "", observacao: "" });
  const [dropdownAberto, setDropdownAberto] = useState(false);

  const carregar = useCallback(async () => {
    if (!devedor?.id) return;
    setLoading(true);
    try {
      const [dir, inv] = await Promise.all([
        listar(devedor.id),
        listarInverso(devedor.id),
      ]);
      setVinculados(Array.isArray(dir) ? dir : []);
      setInversos(Array.isArray(inv) ? inv : []);
    } catch (e) {
      toast.error("Erro ao carregar vínculos");
    } finally {
      setLoading(false);
    }
  }, [devedor?.id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const jaVinculadosIds = new Set([
    String(devedor?.id),
    ...vinculados.map(v => String(v.devedor_vinculado_id || v.vinculado?.id)),
  ]);

  const devedoresFiltrados = (devedores || []).filter(d => {
    if (jaVinculadosIds.has(String(d.id))) return false;
    if (!busca || busca.length < 2) return false;
    const q = busca.toLowerCase();
    return (d.nome || "").toLowerCase().includes(q) || (d.cpf_cnpj || "").includes(q);
  }).slice(0, 8);

  async function handleAdicionar() {
    if (!modalForm.vinculadoId) {
      toast.error("Selecione uma pessoa para vincular");
      return;
    }
    try {
      await adicionarVinculo({
        principalId: devedor.id,
        vinculadoId: Number(modalForm.vinculadoId),
        tipoVinculo: modalForm.tipoVinculo,
        observacao: modalForm.observacao,
      });
      toast.success("Vínculo adicionado!");
      setModalAberto(false);
      setModalForm({ vinculadoId: "", vinculadoNome: "", tipoVinculo: "COOBRIGADO", observacao: "" });
      setBusca("");
      await carregar();
    } catch (e) {
      toast.error("Erro ao adicionar vínculo");
    }
  }

  async function handleRemover(row) {
    const nome = row.vinculado?.nome || "esta pessoa";
    if (!window.confirm(`Remover vínculo com ${nome}?`)) return;
    try {
      await removerVinculo(row.id);
      toast.success("Vínculo removido");
      await carregar();
    } catch (e) {
      toast.error("Erro ao remover vínculo");
    }
  }

  async function handleSalvarEdit(row) {
    try {
      await atualizarVinculo(row.id, { tipo_vinculo: editForm.tipoVinculo, observacao: editForm.observacao });
      toast.success("Vínculo atualizado");
      setEditandoId(null);
      await carregar();
    } catch (e) {
      toast.error("Erro ao atualizar vínculo");
    }
  }

  function iniciarEdicao(row) {
    setEditandoId(row.id);
    setEditForm({ tipoVinculo: row.tipo_vinculo || "COOBRIGADO", observacao: row.observacao || "" });
  }

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Banner de vínculos inversos */}
      {inversos.length > 0 && (
        <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
          {inversos.map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: inversos.indexOf(r) < inversos.length - 1 ? 6 : 0 }}>
              <span style={{ fontSize: 12, color: "#92400e" }}>
                <strong>Vinculado a:</strong>{" "}
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{r.principal?.nome || "—"}</span>
                {" "}
                <span style={{ background: "#fef3c7", color: "#92400e", borderRadius: 99, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                  {tipoLabel(r.tipo_vinculo)}
                </span>
              </span>
              {onNavigate && r.principal?.id && (
                <button
                  onClick={() => onNavigate(r.principal.id)}
                  style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 7, padding: "2px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  Ver cadastro
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: "#0f172a", margin: 0 }}>
          Pessoas Vinculadas {!loading && <span style={{ color: "#64748b", fontWeight: 600 }}>({vinculados.length})</span>}
        </p>
        <button
          onClick={() => { setModalAberto(true); setBusca(""); setModalForm({ vinculadoId: "", vinculadoNome: "", tipoVinculo: "COOBRIGADO", observacao: "" }); }}
          style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
        >
          + Adicionar Pessoa Vinculada
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <p style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", padding: 24 }}>Carregando vínculos...</p>
      )}

      {/* Empty state */}
      {!loading && vinculados.length === 0 && (
        <div style={{ background: "#f8fafc", borderRadius: 12, padding: 24, textAlign: "center", border: "1px dashed #e2e8f0" }}>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: 0 }}>Nenhuma pessoa vinculada. Clique em + Adicionar para criar um vínculo.</p>
        </div>
      )}

      {/* Cards */}
      {!loading && vinculados.map(row => {
        const v = row.vinculado || {};
        const cor = TIPO_COLOR[row.tipo_vinculo] || "#64748b";
        const isEditing = editandoId === row.id;
        return (
          <div key={row.id} style={{ border: "1px solid #e8edf2", borderRadius: 12, padding: "12px 14px", background: "#fafafe", marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{v.nome || "—"}</span>
                  <span style={{ background: cor + "20", color: cor, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
                    {tipoLabel(row.tipo_vinculo)}
                  </span>
                </div>
                {v.cpf_cnpj && (
                  <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, fontFamily: "monospace" }}>{v.cpf_cnpj}</p>
                )}
                {!isEditing && row.observacao && (
                  <p style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", margin: "4px 0 0" }}>{row.observacao}</p>
                )}
              </div>

              {!isEditing && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 10 }}>
                  <button
                    onClick={() => iniciarEdicao(row)}
                    style={{ background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                  >
                    ✏️ Editar
                  </button>
                  {onNavigate && v.id && (
                    <button
                      onClick={() => onNavigate(v.id)}
                      style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                    >
                      Ver cadastro
                    </button>
                  )}
                  <button
                    onClick={() => handleRemover(row)}
                    style={{ background: "transparent", color: "#DC2626", border: "1px solid #DC2626", borderRadius: 7, padding: "4px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {isEditing && (
              <div style={{ marginTop: 10, borderTop: "1px solid #e8edf2", paddingTop: 10 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Tipo de Vínculo</label>
                    <select
                      value={editForm.tipoVinculo}
                      onChange={e => setEditForm(f => ({ ...f, tipoVinculo: e.target.value }))}
                      style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none" }}
                    >
                      {TIPOS_VINCULO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 3 }}>Observação</label>
                  <textarea
                    value={editForm.observacao}
                    onChange={e => setEditForm(f => ({ ...f, observacao: e.target.value }))}
                    rows={2}
                    style={{ width: "100%", padding: "6px 8px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }}
                  />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleSalvarEdit(row)}
                    style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => setEditandoId(null)}
                    style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 7, padding: "6px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Modal adicionar */}
      {modalAberto && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 18, padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 8px 40px rgba(0,0,0,.18)" }}>
            <p style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 18 }}>Adicionar Pessoa Vinculada</p>

            {/* Autocomplete */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Pessoa</label>
              <div style={{ position: "relative" }}>
                <input
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setModalForm(f => ({ ...f, vinculadoId: "", vinculadoNome: "" })); setDropdownAberto(true); }}
                  onFocus={() => setDropdownAberto(true)}
                  placeholder="Digite nome ou CPF/CNPJ..."
                  style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                />
                {dropdownAberto && devedoresFiltrados.length > 0 && (
                  <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 9, zIndex: 10000, maxHeight: 240, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,.12)", marginTop: 2 }}>
                    {devedoresFiltrados.map(d => (
                      <div
                        key={d.id}
                        onClick={() => { setModalForm(f => ({ ...f, vinculadoId: String(d.id), vinculadoNome: d.nome })); setBusca(d.nome); setDropdownAberto(false); }}
                        style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#0f172a", borderBottom: "1px solid #f1f5f9" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                        onMouseLeave={e => e.currentTarget.style.background = ""}
                      >
                        <span style={{ fontWeight: 700 }}>{d.nome}</span>
                        {d.cpf_cnpj && <span style={{ color: "#94a3b8", marginLeft: 8, fontSize: 11, fontFamily: "monospace" }}>{d.cpf_cnpj}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {modalForm.vinculadoId && (
                <p style={{ fontSize: 11, color: "#16a34a", marginTop: 4, fontWeight: 600 }}>✓ Selecionado: {modalForm.vinculadoNome}</p>
              )}
            </div>

            {/* Tipo vínculo */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Tipo de Vínculo</label>
              <select
                value={modalForm.tipoVinculo}
                onChange={e => setModalForm(f => ({ ...f, tipoVinculo: e.target.value }))}
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none" }}
              >
                {TIPOS_VINCULO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>

            {/* Observação */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", display: "block", marginBottom: 4 }}>Observação (opcional)</label>
              <textarea
                value={modalForm.observacao}
                onChange={e => setModalForm(f => ({ ...f, observacao: e.target.value }))}
                rows={3}
                placeholder="Ex: Sócio fundador, responsável solidário por contrato..."
                style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif", outline: "none", boxSizing: "border-box", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={handleAdicionar}
                style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, flex: 1 }}
              >
                Adicionar
              </button>
              <button
                onClick={() => { setModalAberto(false); setBusca(""); setDropdownAberto(false); }}
                style={{ background: "#f1f5f9", color: "#64748b", border: "none", borderRadius: 9, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
