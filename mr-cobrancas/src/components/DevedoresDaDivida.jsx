import { useState } from "react";
import toast from "react-hot-toast";
import { useDevedoresDividas } from "../services/useDevedoresDividas.js";

const PAPEL_META = {
  PRINCIPAL:  { label: "Principal",  bg: "#fef3c7", cor: "#92400e" },
  COOBRIGADO: { label: "Coobrigado", bg: "#ede9fe", cor: "#4c1d95" },
  AVALISTA:   { label: "Avalista",   bg: "#dbeafe", cor: "#1e3a8a" },
  FIADOR:     { label: "Fiador",     bg: "#dcfce7", cor: "#14532d" },
  CONJUGE:    { label: "Cônjuge",    bg: "#fce7f3", cor: "#831843" },
  OUTRO:      { label: "Outro",      bg: "#f1f5f9", cor: "#334155" },
};

const RESP_LABELS = {
  SOLIDARIA:   "Solidária",
  SUBSIDIARIA: "Subsidiária",
  DIVISIVEL:   "Divisível",
};

export default function DevedoresDaDivida({ dividaId, devedores = [], devedorAtualId, onRemovePrincipal }) {
  const { participantes, loading, error, adicionar, trocarPapel, remover } = useDevedoresDividas(dividaId);
  const participantesEnriquecidos = participantes.map(p => ({
    ...p,
    devedor: (devedores || []).find(d => String(d.id) === String(p.devedor_id)) || null,
  }));
  const [showModal, setShowModal] = useState(false);

  if (!dividaId) return null;

  return (
    <div style={{ marginTop: 14, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>
          Devedores desta dívida
        </p>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 7, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
        >
          + Adicionar
        </button>
      </div>

      {loading && (
        <p style={{ fontSize: 11, color: "#94a3b8", margin: 0 }}>Carregando...</p>
      )}

      {!loading && error && (
        <p style={{ fontSize: 11, color: "#dc2626", fontStyle: "italic", margin: 0 }}>
          Erro ao carregar participantes: {error}
        </p>
      )}

      {!loading && !error && participantesEnriquecidos.length === 0 && (
        <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
          Nenhum participante cadastrado.
        </p>
      )}

      {!loading && participantesEnriquecidos.map(p => {
        const meta = PAPEL_META[p.papel] || PAPEL_META.OUTRO;
        const isAtual = String(p.devedor_id) === String(devedorAtualId);
        return (
          <div
            key={p.id}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
              padding: "6px 10px",
              background: isAtual ? "#f0fdf4" : "#fafafe",
              borderRadius: 9,
              border: `1px solid ${isAtual ? "#bbf7d0" : "#e2e8f0"}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: "#0f172a" }}>
              {p.papel === "PRINCIPAL" && <span style={{ marginRight: 4 }}>👑</span>}
              {p.devedor?.nome || `Devedor #${p.devedor_id}`}
              {p.devedor?.cpf_cnpj && (
                <span style={{ color: "#94a3b8", fontSize: 10, marginLeft: 6 }}>
                  {p.devedor.cpf_cnpj}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: meta.bg, color: meta.cor }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>
              {RESP_LABELS[p.responsabilidade] || p.responsabilidade}
            </span>
            {!isAtual && (
              <button
                onClick={async () => {
                  const isPrincipal = p.papel === "PRINCIPAL";
                  const hasOtherPrincipal = participantes.some(x => x.id !== p.id && x.papel === "PRINCIPAL");

                  if (isPrincipal && !hasOtherPrincipal && onRemovePrincipal) {
                    // Delegate to caller for Modal.jsx warning (D-05 LOCKED — no window.confirm for PRINCIPAL)
                    // doRemove closure handles the actual remover(p.id) call + success toast
                    await onRemovePrincipal(p, async () => {
                      await remover(p.id);
                      toast.success("Removido.");
                    });
                    return;
                  }

                  // Existing behavior: window.confirm for non-PRINCIPAL or when onRemovePrincipal not provided
                  if (!window.confirm(`Remover ${p.devedor?.nome || "participante"} desta dívida?`)) return;
                  try {
                    await remover(p.id);
                    toast.success("Removido.");
                  } catch (e) {
                    toast.error("Erro: " + e.message);
                  }
                }}
                style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 10, fontWeight: 700, flexShrink: 0 }}
              >
                ✕
              </button>
            )}
            {p.papel !== "PRINCIPAL" && (
              <button
                title="Promover a Principal"
                onClick={async () => {
                  try {
                    await trocarPapel(p.id, "PRINCIPAL", dividaId);
                    toast.success("Promovido a Principal.");
                  } catch (e) {
                    toast.error("Erro: " + e.message);
                  }
                }}
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 10, fontWeight: 700, flexShrink: 0 }}
              >
                👑
              </button>
            )}
          </div>
        );
      })}

      {showModal && (
        <AdicionarParticipanteModal
          dividaId={dividaId}
          devedores={devedores}
          participantesExistentes={participantes}
          onAdicionar={async (params) => {
            try {
              await adicionar(params);
              toast.success("Participante adicionado.");
              setShowModal(false);
            } catch (e) {
              toast.error("Erro: " + e.message);
            }
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

function AdicionarParticipanteModal({ dividaId, devedores, participantesExistentes, onAdicionar, onClose }) {
  const [busca, setBusca] = useState("");
  const [selecionado, setSelecionado] = useState(null);
  const [papel, setPapel] = useState("COOBRIGADO");
  const [responsabilidade, setResponsabilidade] = useState("SOLIDARIA");
  const [observacao, setObservacao] = useState("");
  const [salvando, setSalvando] = useState(false);

  const idsExistentes = new Set(participantesExistentes.map(p => String(p.devedor_id)));

  const resultados =
    busca.trim().length >= 2
      ? devedores
          .filter(
            d =>
              !idsExistentes.has(String(d.id)) &&
              ((d.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
                (d.cpf_cnpj || "").includes(busca))
          )
          .slice(0, 8)
      : [];

  async function handleSalvar() {
    if (!selecionado) {
      toast("Selecione um devedor.");
      return;
    }
    setSalvando(true);
    try {
      await onAdicionar({
        devedorId: selecionado.id,
        dividaId: String(dividaId),
        papel,
        responsabilidade,
        observacao,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460,
          maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          fontFamily: "'Plus Jakarta Sans',sans-serif", padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 17, color: "#0f172a", margin: 0 }}>
            + Adicionar Devedor / Coobrigado
          </p>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        {/* Busca */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            Buscar Devedor (nome ou CPF/CNPJ)
          </label>
          <input
            value={busca}
            onChange={e => { setBusca(e.target.value); setSelecionado(null); }}
            placeholder="Digite ao menos 2 caracteres..."
            autoFocus
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          />
          {resultados.length > 0 && !selecionado && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, marginTop: 4, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
              {resultados.map(d => (
                <button
                  key={d.id}
                  onClick={() => { setSelecionado(d); setBusca(d.nome); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 13px", background: "#fafafe", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0f172a" }}
                >
                  <b>{d.nome}</b>
                  {d.cpf_cnpj && (
                    <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 8 }}>{d.cpf_cnpj}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {selecionado && (
            <p style={{ marginTop: 6, fontSize: 12, color: "#059669", fontWeight: 700 }}>
              Selecionado: {selecionado.nome}
            </p>
          )}
        </div>

        {/* Papel */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            Papel
          </label>
          <select
            value={papel}
            onChange={e => setPapel(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            {Object.entries(PAPEL_META).map(([v, { label }]) => (
              <option key={v} value={v}>{label}</option>
            ))}
          </select>
          {papel === "PRINCIPAL" && (
            <p style={{ fontSize: 11, color: "#b45309", marginTop: 4, background: "#fef9c3", padding: "4px 9px", borderRadius: 7 }}>
              O devedor principal atual será movido para Coobrigado.
            </p>
          )}
        </div>

        {/* Responsabilidade */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            Responsabilidade
          </label>
          <select
            value={responsabilidade}
            onChange={e => setResponsabilidade(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            <option value="SOLIDARIA">Solidária</option>
            <option value="SUBSIDIARIA">Subsidiária</option>
            <option value="DIVISIVEL">Divisível</option>
          </select>
        </div>

        {/* Observação */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            Observação (opcional)
          </label>
          <textarea
            value={observacao}
            onChange={e => setObservacao(e.target.value)}
            rows={2}
            style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif", resize: "vertical" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleSalvar}
            disabled={!selecionado || salvando}
            style={{
              flex: 1, padding: "11px",
              background: selecionado ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#e2e8f0",
              color: selecionado ? "#fff" : "#94a3b8",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13,
              cursor: selecionado ? "pointer" : "not-allowed",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
            }}
          >
            {salvando ? "Salvando..." : "Adicionar"}
          </button>
          <button
            onClick={onClose}
            style={{ padding: "11px 18px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#64748b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
