import { useState } from "react";
import toast from "react-hot-toast";
import { useDevedoresDoContrato } from "../services/useDevedoresDoContrato.js";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";

// PAPEL_META + RESP_LABELS reuse verbatim do DevedoresDaDivida.jsx (L5-18) — clone
// adaptado pattern, evita import circular cross-componente. DRY violado conscientemente
// (D-pre-9 — UI cadastro só por contrato, mas dicionário visual idêntico).
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

// Papéis válidos para o anterior PRINCIPAL no wizard D-pre-13.
// Schema CHECK permite estes 5 (SEM PRINCIPAL — anterior precisa virar não-PRINCIPAL).
// SEM SOLIDARIO porque wizard alterna PAPEL, não responsabilidade.
const PAPEIS_ANTERIOR_PRINCIPAL = ["COOBRIGADO", "AVALISTA", "FIADOR", "CONJUGE", "OUTRO"];

export default function DevedoresDoContrato({ contratoId, devedores = [] }) {
  const { devedoresContrato, loading, error, adicionar, remover, promoverComDemocao } =
    useDevedoresDoContrato(contratoId);

  const devedoresEnriquecidos = devedoresContrato.map(p => ({
    ...p,
    devedor: (devedores || []).find(d => String(d.id) === String(p.devedor_id)) || null,
  }));

  const [showAdicionarModal, setShowAdicionarModal] = useState(false);
  const [showWizard, setShowWizard]                 = useState(false);
  const [wizardCtx, setWizardCtx]                   = useState(null);   // { novoDevedorId, novoNome, anteriorNome }
  const [showBloqueio, setShowBloqueio]             = useState(false);

  if (!contratoId) return null;

  /**
   * Helper: encontra o nome do PRINCIPAL atual entre os devedores do contrato.
   * Fallback para "Devedor #ID" se não encontrar.
   */
  function nomePrincipal() {
    const principal = devedoresEnriquecidos.find(p => p.papel === "PRINCIPAL");
    if (!principal) return null;
    return principal.devedor?.nome || `Devedor #${principal.devedor_id}`;
  }

  /**
   * Trigger do wizard D-pre-13: contrato já tem PRINCIPAL, usuário tentou
   * adicionar/promover OUTRO devedor a PRINCIPAL.
   */
  function abrirWizard(novoDevedorId, novoNome) {
    setWizardCtx({
      novoDevedorId,
      novoNome,
      anteriorNome: nomePrincipal() || "(desconhecido)",
    });
    setShowWizard(true);
  }

  async function handleConfirmarWizard(novoPapelDoAnterior) {
    if (!wizardCtx) return;
    try {
      await promoverComDemocao(wizardCtx.novoDevedorId, novoPapelDoAnterior);
      toast.success("Promoção concluída.");
      setShowWizard(false);
      setWizardCtx(null);
      setShowAdicionarModal(false);  // fecha modal Adicionar caso wizard veio de lá
    } catch (e) {
      toast.error("Erro: " + e.message);
    }
  }

  async function handleAdicionar({ devedorId, papel, responsabilidade, nome }) {
    try {
      await adicionar(devedorId, papel, responsabilidade);
      toast.success("Devedor adicionado.");
      setShowAdicionarModal(false);
    } catch (e) {
      if (e.message === "USE_WIZARD_PROMOCAO") {
        // Helper bloqueou (papel=PRINCIPAL e contrato já tem outro PRINCIPAL).
        // Abre wizard que vai usar promoverParaPrincipalComDemocao.
        abrirWizard(devedorId, nome);
      } else {
        toast.error("Erro: " + e.message);
      }
    }
  }

  async function handleRemover(p) {
    try {
      await remover(p.devedor_id);
      toast.success("Removido.");
    } catch (e) {
      if (e.message === "LAST_PRINCIPAL_BLOCKED") {
        // D-pre-12: bloqueio remoção último PRINCIPAL. Modal warning customizado
        // (D-05 LOCKED — sem prompt nativo do browser em fluxos de PRINCIPAL).
        setShowBloqueio(true);
      } else {
        toast.error("Erro: " + e.message);
      }
    }
  }

  async function handlePromover(p) {
    // Sempre vai precisar de wizard se há PRINCIPAL atual (qualquer outro devedor).
    // Helper bloquearia com USE_WIZARD_PROMOCAO; UI antecipa abrindo wizard direto.
    const principal = devedoresEnriquecidos.find(x =>
      x.papel === "PRINCIPAL" && String(x.devedor_id) !== String(p.devedor_id)
    );
    if (principal) {
      abrirWizard(p.devedor_id, p.devedor?.nome || `Devedor #${p.devedor_id}`);
      return;
    }
    // Sem PRINCIPAL atual: chama promoverComDemocao com papel default — mas
    // helper exige anterior existente, então fallback para alterarPapel direto
    // via adicionar (que sobrescreve). Cenário raro: contrato sem PRINCIPAL.
    toast.error("Contrato não possui PRINCIPAL — adicione um devedor com papel Principal primeiro.");
  }

  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 15, color: "#0f172a", margin: 0 }}>
          Devedores do Contrato
        </p>
        <Btn color="#4f46e5" sm onClick={() => setShowAdicionarModal(true)}>+ Adicionar Devedor</Btn>
      </div>

      {loading && (
        <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Carregando...</p>
      )}

      {!loading && error && (
        <p style={{ fontSize: 12, color: "#dc2626", fontStyle: "italic", margin: 0 }}>
          Erro ao carregar devedores: {error}
        </p>
      )}

      {!loading && !error && devedoresEnriquecidos.length === 0 && (
        <p style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic", margin: 0 }}>
          Nenhum devedor cadastrado neste contrato.
        </p>
      )}

      {!loading && devedoresEnriquecidos.map(p => {
        const meta = PAPEL_META[p.papel] || PAPEL_META.OUTRO;
        const isPrincipal = p.papel === "PRINCIPAL";
        return (
          <div
            key={p.devedor_id}
            style={{
              display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
              padding: "8px 12px",
              background: isPrincipal ? "#f0fdf4" : "#fafafe",
              borderRadius: 9,
              border: `1px solid ${isPrincipal ? "#bbf7d0" : "#e2e8f0"}`,
            }}
          >
            <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#0f172a" }}>
              {isPrincipal && <span style={{ marginRight: 4 }}>👑</span>}
              {p.devedor?.nome || `Devedor #${p.devedor_id}`}
              {p.devedor?.cpf_cnpj && (
                <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>
                  {p.devedor.cpf_cnpj}
                </span>
              )}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: meta.bg, color: meta.cor }}>
              {meta.label}
            </span>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {RESP_LABELS[p.responsabilidade] || p.responsabilidade}
            </span>
            {!isPrincipal && (
              <button
                title="Promover a Principal"
                onClick={() => handlePromover(p)}
                style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
              >
                👑
              </button>
            )}
            <button
              onClick={() => handleRemover(p)}
              title="Remover"
              style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
            >
              ✕
            </button>
          </div>
        );
      })}

      {showAdicionarModal && (
        <AdicionarDevedorContratoModal
          contratoId={contratoId}
          devedores={devedores}
          devedoresExistentes={devedoresContrato}
          onAdicionar={handleAdicionar}
          onClose={() => setShowAdicionarModal(false)}
        />
      )}

      {showWizard && wizardCtx && (
        <WizardPromocaoPrincipalModal
          novoNome={wizardCtx.novoNome}
          anteriorNome={wizardCtx.anteriorNome}
          onConfirmar={handleConfirmarWizard}
          onClose={() => { setShowWizard(false); setWizardCtx(null); }}
        />
      )}

      {showBloqueio && (
        <BloqueioRemocaoUltimoPrincipalModal
          onClose={() => setShowBloqueio(false)}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Modal A — Adicionar Devedor ao Contrato (clone adaptado de
// AdicionarParticipanteModal de DevedoresDaDivida.jsx)
// ──────────────────────────────────────────────────────────────────
function AdicionarDevedorContratoModal({ contratoId, devedores, devedoresExistentes, onAdicionar, onClose }) {
  const [busca, setBusca]                       = useState("");
  const [selecionado, setSelecionado]           = useState(null);
  const [papel, setPapel]                       = useState("COOBRIGADO");
  const [responsabilidade, setResponsabilidade] = useState("SOLIDARIA");
  const [salvando, setSalvando]                 = useState(false);

  const idsExistentes = new Set(devedoresExistentes.map(p => String(p.devedor_id)));

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
        papel,
        responsabilidade,
        nome: selecionado.nome,
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
            + Adicionar Devedor ao Contrato
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
              Contrato já pode ter um PRINCIPAL. Será aberto wizard de promoção para escolher o novo papel do anterior.
            </p>
          )}
        </div>

        {/* Responsabilidade */}
        <div style={{ marginBottom: 20 }}>
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

// ──────────────────────────────────────────────────────────────────
// Modal B — Wizard de Promoção a PRINCIPAL (D-pre-13)
//
// REGRA DURA D-pre-13:
//   - dropdown com 5 opções (COOBRIGADO, AVALISTA, FIADOR, CONJUGE, OUTRO)
//   - SEM PRINCIPAL (anterior precisa virar não-PRINCIPAL pra liberar UNIQUE INDEX)
//   - SEM SOLIDARIO (wizard alterna PAPEL, não responsabilidade)
//   - SEM default value: usuário OBRIGADO a escolher
//   - Botão Confirmar disabled={!papelEscolhido} até dropdown ter valor
//   - Cancelar sempre habilitado, fecha sem mutação
// ──────────────────────────────────────────────────────────────────
function WizardPromocaoPrincipalModal({ novoNome, anteriorNome, onConfirmar, onClose }) {
  const [papelEscolhido, setPapelEscolhido] = useState("");   // string vazia inicial — sem default
  const [salvando, setSalvando]             = useState(false);

  async function handleConfirmar() {
    if (!papelEscolhido) return;
    setSalvando(true);
    try {
      await onConfirmar(papelEscolhido);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10001, padding: 20,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "#fff", borderRadius: 18, width: "100%", maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,.2)",
          fontFamily: "'Plus Jakarta Sans',sans-serif", padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 17, color: "#0f172a", margin: 0 }}>
            👑 Promoção a Principal
          </p>
          <button
            onClick={onClose}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.5, marginBottom: 16 }}>
          Contrato já tem PRINCIPAL (<b>{anteriorNome}</b>). Promover <b>{novoNome}</b> a PRINCIPAL e demover <b>{anteriorNome}</b> a:
        </p>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
            Novo papel de {anteriorNome}
          </label>
          <select
            value={papelEscolhido}
            onChange={e => setPapelEscolhido(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            <option value="" disabled hidden>Selecione um papel...</option>
            {PAPEIS_ANTERIOR_PRINCIPAL.map(p => (
              <option key={p} value={p}>{PAPEL_META[p].label}</option>
            ))}
          </select>
          {!papelEscolhido && (
            <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4, fontStyle: "italic" }}>
              Escolha um papel para o devedor anterior antes de confirmar.
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={handleConfirmar}
            disabled={!papelEscolhido || salvando}
            style={{
              flex: 1, padding: "11px",
              background: papelEscolhido ? "linear-gradient(135deg,#f59e0b,#d97706)" : "#e2e8f0",
              color: papelEscolhido ? "#fff" : "#94a3b8",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13,
              cursor: papelEscolhido ? "pointer" : "not-allowed",
              fontFamily: "'Plus Jakarta Sans',sans-serif",
              opacity: salvando ? 0.6 : 1,
            }}
          >
            {salvando ? "Salvando..." : "Confirmar Promoção"}
          </button>
          <button
            onClick={onClose}
            disabled={salvando}
            style={{ padding: "11px 18px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#64748b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Modal C — Bloqueio remoção último PRINCIPAL (D-pre-12 + D-05 LOCKED)
//
// REGRA DURA D-pre-12:
//   - Sem prompts nativos do browser em fluxos de PRINCIPAL — Modal customizado obrigatório.
//   - Texto: "Promova outro devedor a Principal antes de remover este — não é
//             possível remover o último PRINCIPAL"
//   - Único botão "Entendido" fecha modal. ZERO opção de "remover mesmo assim".
// ──────────────────────────────────────────────────────────────────
function BloqueioRemocaoUltimoPrincipalModal({ onClose }) {
  return (
    <Modal title="Não é possível remover este devedor" onClose={onClose} width={460}>
      <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, margin: "0 0 16px 0" }}>
        Promova outro devedor a Principal antes de remover este — não é possível remover o último PRINCIPAL.
      </p>
      <p style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.5, fontStyle: "italic", margin: "0 0 20px 0" }}>
        Todo contrato precisa ter exatamente um PRINCIPAL ativo (UNIQUE INDEX por dívida). Adicione outro devedor com papel PRINCIPAL primeiro — o atual será automaticamente movido para o papel que você escolher no wizard.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{
            padding: "10px 20px",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            color: "#fff", border: "none", borderRadius: 10,
            fontWeight: 700, fontSize: 13,
            cursor: "pointer",
            fontFamily: "'Plus Jakarta Sans',sans-serif",
          }}
        >
          Entendido
        </button>
      </div>
    </Modal>
  );
}
