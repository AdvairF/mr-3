import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import { dbGet } from "../config/supabase.js";
import { filaDevedor } from "../services/filaDevedor.js";
import { STATUS_DEV } from "../utils/constants.js";

// ─── Status ativos para fila ──────────────────────────────────
const STATUS_ATIVOS = ["novo", "em_localizacao", "notificado", "em_negociacao"];
const STATUS_TERMINAIS = ["acordo_firmado", "pago_integral", "pago_parcial", "irrecuperavel", "ajuizado"];
const TODOS_STATUS = STATUS_DEV;

// ─── PriorityBadge ────────────────────────────────────────────
function PriorityBadge({ prioridade }) {
  const map = {
    ALTA:  { cor: "#DC2626", bg: "#FEE2E2", label: "Alta" },
    MEDIA: { cor: "#F59E0B", bg: "#FEF3C7", label: "Média" },
    BAIXA: { cor: "#10B981", bg: "#D1FAE5", label: "Baixa" },
  };
  const s = map[prioridade] || map.BAIXA;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      background: s.bg, color: s.cor,
      fontSize: 11, fontWeight: 700, padding: "3px 8px",
      borderRadius: 99, letterSpacing: ".2px",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.cor, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ─── StatusBadge devedor ──────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_DEV.find(x => x.v === status) || { l: status, cor: "#64748b", bg: "#f1f5f9" };
  return (
    <span style={{
      display: "inline-block", background: s.bg, color: s.cor,
      fontSize: 11, fontWeight: 700, padding: "3px 8px",
      borderRadius: 99, whiteSpace: "nowrap",
    }}>
      {s.l}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────
function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}
function diasDesde(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso)) / 86400000);
}

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };
const inpS = { padding: "7px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };

// ─── TELA 1: FilaPainel (Supervisor) ─────────────────────────
function FilaPainel({ usuarioId, credores, onAbrirAtendimento }) {
  const [devedores, setDevedores] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState([...STATUS_ATIVOS]);
  const [filtroCredor, setFiltroCredor] = useState("");
  const [filtroPrioridade, setFiltroPrioridade] = useState("");
  const [filtroValorMin, setFiltroValorMin] = useState("");
  const [filtroValorMax, setFiltroValorMax] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [modalEvento, setModalEvento] = useState(null); // devedor selecionado
  const [formEvento, setFormEvento] = useState({ tipo_evento: "LIGACAO", descricao: "", telefone_usado: "", data_promessa: "", giro_carteira_dias: "" });
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const pollRef = useRef(null);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setCarregando(true);
    const filtros = {
      busca: busca || undefined,
      status_list: filtroStatus.length ? filtroStatus : undefined,
      credor_id: filtroCredor || undefined,
      prioridade: filtroPrioridade || undefined,
      valor_min: filtroValorMin ? Number(filtroValorMin) : undefined,
      valor_max: filtroValorMax ? Number(filtroValorMax) : undefined,
    };
    const r = await filaDevedor.listarDevedoresParaFila(filtros);
    if (r.success) setDevedores(r.data);
    else toast.error("Erro ao carregar fila: " + r.error);
    if (!silencioso) setCarregando(false);
  }, [busca, filtroStatus, filtroCredor, filtroPrioridade, filtroValorMin, filtroValorMax]);

  useEffect(() => {
    carregar();
    pollRef.current = setInterval(() => carregar(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [carregar]);

  async function handleRegistrarEvento() {
    if (!modalEvento || !formEvento.tipo_evento) return;
    setSalvandoEvento(true);
    const dados = {
      tipo_evento: formEvento.tipo_evento,
      descricao: formEvento.descricao || undefined,
      telefone_usado: formEvento.telefone_usado || undefined,
      data_promessa: formEvento.data_promessa || undefined,
      giro_carteira_dias: formEvento.giro_carteira_dias ? Number(formEvento.giro_carteira_dias) : undefined,
    };
    const r = await filaDevedor.registrarEvento(modalEvento.id, usuarioId, dados);
    if (r.success) {
      toast.success("Evento registrado!");
      setModalEvento(null);
      setFormEvento({ tipo_evento: "LIGACAO", descricao: "", telefone_usado: "", data_promessa: "", giro_carteira_dias: "" });
      await carregar(true);
    } else {
      toast.error("Erro: " + r.error);
    }
    setSalvandoEvento(false);
  }

  function toggleStatus(s) {
    setFiltroStatus(prev =>
      prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
    );
  }

  // Contadores
  const totalDevedores = devedores.length;
  const emAtendimento = devedores.filter(d => d._em_atendimento).length;
  const bloqueados = devedores.filter(d => d._bloqueado).length;
  const aguardando = totalDevedores - emAtendimento - bloqueados;

  const cards = [
    { label: "Aguardando", valor: aguardando, cor: "#6366f1", bg: "rgba(99,102,241,.08)" },
    { label: "Em Atendimento", valor: emAtendimento, cor: "#f59e0b", bg: "rgba(245,158,11,.08)" },
    { label: "Bloqueados", valor: bloqueados, cor: "#ef4444", bg: "rgba(239,68,68,.08)" },
    { label: "Total na Fila", valor: totalDevedores, cor: "#10b981", bg: "rgba(16,185,129,.08)" },
  ];

  return (
    <div>
      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.cor}22`, borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: c.cor, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{c.label}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color: c.cor, fontFamily: "'Space Grotesk',sans-serif" }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
        {/* Linha 1: busca + credor + prioridade */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <input
            style={{ ...inpS, flex: 1, minWidth: 200 }}
            placeholder="Buscar por nome ou CPF/CNPJ..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          <select style={inpS} value={filtroCredor} onChange={e => setFiltroCredor(e.target.value)}>
            <option value="">Todos os credores</option>
            {(credores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <select style={inpS} value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)}>
            <option value="">Todas prioridades</option>
            <option value="ALTA">Alta</option>
            <option value="MEDIA">Média</option>
            <option value="BAIXA">Baixa</option>
          </select>
          <input style={{ ...inpS, width: 110 }} placeholder="Valor mín" type="number" value={filtroValorMin} onChange={e => setFiltroValorMin(e.target.value)} />
          <input style={{ ...inpS, width: 110 }} placeholder="Valor máx" type="number" value={filtroValorMax} onChange={e => setFiltroValorMax(e.target.value)} />
        </div>

        {/* Linha 2: checkboxes de status */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px" }}>Status:</span>
          {STATUS_ATIVOS.map(s => {
            const info = STATUS_DEV.find(x => x.v === s);
            const ativo = filtroStatus.includes(s);
            return (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", fontSize: 12, fontWeight: 600, color: ativo ? info.cor : "#94a3b8" }}>
                <input type="checkbox" checked={ativo} onChange={() => toggleStatus(s)} style={{ accentColor: info.cor }} />
                {info?.l}
              </label>
            );
          })}
        </div>
      </div>

      {/* Tabela */}
      {carregando ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Carregando fila...</div>
      ) : devedores.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Nenhum devedor com status ativo encontrado</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{devedores.length} devedor(es) — atualização automática a cada 30s</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={th}>Nome</th>
                <th style={th}>CPF/CNPJ</th>
                <th style={th}>Status</th>
                <th style={th}>Valor</th>
                <th style={th}>Dias</th>
                <th style={th}>Prioridade</th>
                <th style={th}>Telefone</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {devedores.map(d => (
                <tr key={d.id} style={{
                  borderBottom: "1px solid #f1f5f9",
                  background: d._em_atendimento ? "rgba(245,158,11,.06)" : d._bloqueado ? "rgba(239,68,68,.04)" : "#fff",
                }}>
                  <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>
                    {d.nome}
                    {d._em_atendimento && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#FEF3C7", padding: "1px 6px", borderRadius: 99 }}>Em atendimento</span>}
                    {d._bloqueado && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#FEE2E2", padding: "1px 6px", borderRadius: 99 }}>🔒 Bloqueado até {fmtData(d._fila?.bloqueado_ate)}</span>}
                  </td>
                  <td style={td}>{d.cpf_cnpj || "—"}</td>
                  <td style={td}><StatusBadge status={d.status} /></td>
                  <td style={td}>{fmtBRL(d.valor_total)}</td>
                  <td style={td}>{diasDesde(d.created_at)}d</td>
                  <td style={td}><PriorityBadge prioridade={d._prioridade} /></td>
                  <td style={td}>{d.telefone || "—"}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {d.telefone && (
                        <a href={`tel:${d.telefone}`} title="Ligar" style={{ textDecoration: "none" }}>
                          <Btn sm outline>📞</Btn>
                        </a>
                      )}
                      {d.telefone && (
                        <a href={`https://wa.me/55${d.telefone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(d.nome)}%2C%20entramos%20em%20contato%20sobre%20seu%20débito.`} target="_blank" rel="noreferrer" title="WhatsApp" style={{ textDecoration: "none" }}>
                          <Btn sm outline>💬</Btn>
                        </a>
                      )}
                      {d.email && (
                        <a href={`mailto:${d.email}`} title="Email" style={{ textDecoration: "none" }}>
                          <Btn sm outline>📧</Btn>
                        </a>
                      )}
                      <Btn sm outline onClick={() => setModalEvento(d)} title="Registrar Evento">✏️</Btn>
                      <Btn sm onClick={() => onAbrirAtendimento(d)} color="#f97316" title="Abrir atendimento">👁</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Registrar Evento rápido */}
      {modalEvento && (
        <Modal title={`Registrar Evento — ${modalEvento.nome}`} onClose={() => setModalEvento(null)} width={480}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={lbl}>Tipo do Evento *</label>
              <select style={{ ...inpS, width: "100%", boxSizing: "border-box" }} value={formEvento.tipo_evento} onChange={e => setFormEvento(f => ({ ...f, tipo_evento: e.target.value }))}>
                {TIPOS_EVENTO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Descrição</label>
              <textarea style={{ ...inpS, width: "100%", height: 72, resize: "vertical", boxSizing: "border-box" }} value={formEvento.descricao} onChange={e => setFormEvento(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o contato..." />
            </div>
            {modalEvento.telefone && (
              <div>
                <label style={lbl}>Telefone Usado</label>
                <select style={{ ...inpS, width: "100%", boxSizing: "border-box" }} value={formEvento.telefone_usado} onChange={e => setFormEvento(f => ({ ...f, telefone_usado: e.target.value }))}>
                  <option value="">— Selecionar —</option>
                  {[modalEvento.telefone, modalEvento.telefone2, ...(modalEvento.telefones_adicionais || [])].filter(Boolean).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {formEvento.tipo_evento === "PROMESSA_PAGAMENTO" && (
              <div>
                <label style={lbl}>Data da Promessa *</label>
                <input type="date" style={{ ...inpS, width: "100%", boxSizing: "border-box" }} value={formEvento.data_promessa} onChange={e => setFormEvento(f => ({ ...f, data_promessa: e.target.value }))} min={new Date().toISOString().slice(0, 10)} />
              </div>
            )}
            <div>
              <label style={lbl}>Giro de Carteira (dias)</label>
              <input type="number" style={{ ...inpS, width: "100%", boxSizing: "border-box" }} value={formEvento.giro_carteira_dias} onChange={e => setFormEvento(f => ({ ...f, giro_carteira_dias: e.target.value }))} placeholder="0 = sem giro" min="0" max="365" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn onClick={handleRegistrarEvento} disabled={salvandoEvento} color="#6366f1">{salvandoEvento ? "Salvando..." : "Registrar Evento"}</Btn>
            <Btn outline onClick={() => setModalEvento(null)}>Cancelar</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── TELA 2: FilaOperador (Lobby) ────────────────────────────
function FilaOperador({ usuarioId, onIniciar }) {
  const [contagem, setContagem] = useState(null);
  const [prioridadeAtual, setPrioridadeAtual] = useState(null);
  const [iniciando, setIniciando] = useState(false);

  useEffect(() => {
    async function carregar() {
      try {
        const r = await filaDevedor.listarDevedoresParaFila({});
        if (r.success) {
          const disponíveis = (r.data || []).filter(d => !d._em_atendimento && !d._bloqueado);
          setContagem(disponíveis.length);
          if (disponíveis.length > 0) setPrioridadeAtual(disponíveis[0]._prioridade);
        }
      } catch { setContagem(0); }
    }
    carregar();
  }, []);

  async function iniciar() {
    setIniciando(true);
    const r = await filaDevedor.proximoDevedor(usuarioId);
    if (!r.success) { toast.error("Erro: " + r.error); setIniciando(false); return; }
    if (!r.data) { toast("Fila vazia no momento.", { icon: "📭" }); setIniciando(false); return; }
    onIniciar(r.data);
    setIniciando(false);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 340 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: "40px 48px", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,.08)", border: "1px solid #e8f0f7", maxWidth: 400, width: "100%" }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 22, color: "#0f172a", marginBottom: 8 }}>Minha Fila</p>
        {contagem === null ? (
          <p style={{ color: "#94a3b8", fontSize: 14, marginBottom: 24 }}>Carregando...</p>
        ) : (
          <>
            <p style={{ fontSize: 48, fontWeight: 800, color: "#f97316", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1 }}>{contagem}</p>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>devedor(es) disponíveis</p>
            {prioridadeAtual && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
                <PriorityBadge prioridade={prioridadeAtual} />
              </div>
            )}
          </>
        )}
        <Btn onClick={iniciar} disabled={iniciando || contagem === 0} color="#f97316">
          {iniciando ? "Buscando..." : contagem === 0 ? "Fila Vazia" : "▶ Iniciar Atendimento"}
        </Btn>
      </div>
    </div>
  );
}

// ─── TELA 3: FilaAtendimento ──────────────────────────────────
const TIPOS_EVENTO = [
  { v: "LIGACAO", l: "Ligação" },
  { v: "WHATSAPP", l: "WhatsApp" },
  { v: "EMAIL", l: "E-mail" },
  { v: "SMS", l: "SMS" },
  { v: "PROMESSA_PAGAMENTO", l: "Promessa de Pagamento" },
  { v: "SEM_CONTATO", l: "Sem Contato" },
  { v: "ACORDO", l: "Acordo" },
  { v: "TELEFONE_NAO_EXISTE", l: "Telefone Não Existe" },
  { v: "CONTATO_COM_CLIENTE", l: "Contato com Cliente" },
  { v: "RECADO", l: "Recado" },
];

function FilaAtendimento({ usuarioId, dadosIniciais, onProximo, onSair }) {
  const { fila, devedor: devedorInicial, contrato, parcelas, eventos: evtsIniciais } = dadosIniciais;
  const [devedor, setDevedor] = useState(devedorInicial);
  const [eventos, setEventos] = useState(evtsIniciais || []);
  const [eventoRegistrado, setEventoRegistrado] = useState(false);
  const [modalEvento, setModalEvento] = useState(false);
  const [modalInfo, setModalInfo] = useState(false);
  const [form, setForm] = useState({ tipo_evento: "LIGACAO", descricao: "", telefone_usado: "", data_promessa: "", giro_carteira_dias: "" });
  const [salvando, setSalvando] = useState(false);
  const [proximando, setProximando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  // Carregar eventos por devedor_id
  useEffect(() => {
    if (!devedorInicial?.id) return;
    setDevedor(devedorInicial);
    setEventos(evtsIniciais || []);
    setEventoRegistrado(false);
    // Buscar eventos mais recentes
    dbGet("eventos_andamento", `devedor_id=eq.${devedorInicial.id}&order=data_evento.desc&limit=50`)
      .then(rows => { if (Array.isArray(rows)) setEventos(rows); })
      .catch(() => {});
  }, [devedorInicial?.id]);

  function F(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const telefones = [devedor?.telefone, devedor?.telefone2, ...(devedor?.telefones_adicionais || [])].filter(Boolean);

  async function registrar() {
    if (!form.tipo_evento) { toast("Selecione o tipo de evento.", { icon: "⚠️" }); return; }
    setSalvando(true);
    const dados = {
      tipo_evento: form.tipo_evento,
      descricao: form.descricao || undefined,
      telefone_usado: form.telefone_usado || undefined,
      data_promessa: form.data_promessa || undefined,
      giro_carteira_dias: form.giro_carteira_dias ? Number(form.giro_carteira_dias) : undefined,
    };
    const r = await filaDevedor.registrarEvento(devedor.id, usuarioId, dados);
    if (r.success) {
      toast.success("Evento registrado!");
      setEventos(evs => [{ ...r.data, tipo_evento: form.tipo_evento, descricao: form.descricao, data_evento: new Date().toISOString() }, ...evs]);
      setEventoRegistrado(true);
      setModalEvento(false);
      setForm({ tipo_evento: "LIGACAO", descricao: "", telefone_usado: "", data_promessa: "", giro_carteira_dias: "" });
    } else {
      toast.error("Erro: " + r.error);
    }
    setSalvando(false);
  }

  async function proximo() {
    setProximando(true);
    const r = await filaDevedor.proximoDevedor(usuarioId);
    if (!r.success) { toast.error("Erro: " + r.error); setProximando(false); return; }
    if (!r.data) { toast("Fila vazia.", { icon: "📭" }); onProximo(null); setProximando(false); return; }
    onProximo(r.data);
    setProximando(false);
  }

  async function handleAlterarStatus(novoStatus) {
    setAlterandoStatus(true);
    const r = await filaDevedor.alterarStatusDevedor(devedor.id, novoStatus, usuarioId);
    if (r.success) {
      toast.success("Status atualizado para: " + (STATUS_DEV.find(s => s.v === novoStatus)?.l || novoStatus));
      setDevedor(d => ({ ...d, status: novoStatus }));
      setEventos(evs => [{ tipo_evento: "CONTATO_COM_CLIENTE", descricao: `Status: ${novoStatus}`, data_evento: new Date().toISOString() }, ...evs]);
      // Se terminal, voltar para fila
      if (STATUS_TERMINAIS.includes(novoStatus)) {
        toast("Devedor removido da fila.", { icon: "✅" });
        onSair();
      }
    } else {
      toast.error("Erro: " + r.error);
    }
    setAlterandoStatus(false);
  }

  const inpStyle = { width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151", boxSizing: "border-box" };

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7", position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <PriorityBadge prioridade={devedor?._prioridade || "BAIXA"} />
        </div>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 22, color: "#0f172a", marginBottom: 4 }}>{devedor?.nome || "—"}</p>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#64748b", fontSize: 13, marginBottom: 10 }}>
          <span>CPF/CNPJ: <strong style={{ color: "#374151" }}>{devedor?.cpf_cnpj || "—"}</strong></span>
          {telefones.length > 0 && <span>Tel: <strong style={{ color: "#374151" }}>{telefones.join(" | ")}</strong></span>}
          {devedor?.email && <span>Email: <strong style={{ color: "#374151" }}>{devedor.email}</strong></span>}
          {devedor?.cidade && <span>Cidade: <strong style={{ color: "#374151" }}>{devedor.cidade}</strong></span>}
        </div>

        {/* Status + ações rápidas */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <StatusBadge status={devedor?.status} />
          <select
            style={{ ...inpS, fontSize: 12 }}
            value={devedor?.status || ""}
            onChange={e => handleAlterarStatus(e.target.value)}
            disabled={alterandoStatus}
            title="Alterar status"
          >
            {TODOS_STATUS.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
          {telefones[0] && (
            <a href={`tel:${telefones[0]}`} style={{ textDecoration: "none" }}>
              <Btn sm outline>📞 Ligar</Btn>
            </a>
          )}
          {telefones[0] && (
            <a href={`https://wa.me/55${telefones[0].replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(devedor?.nome || "")}%2C%20entramos%20em%20contato%20sobre%20seu%20débito.`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
              <Btn sm outline>💬 WhatsApp</Btn>
            </a>
          )}
        </div>

        {fila?.bloqueado_ate && fila.bloqueado_ate >= new Date().toISOString().slice(0, 10) && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 8, background: "#FEF3C7", color: "#D97706", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99 }}>
            🔒 Promessa Ativa até {fmtData(fila.bloqueado_ate)}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Dados da dívida */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #e8f0f7" }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>💰 Dívida</p>
          {devedor ? (
            <div style={{ fontSize: 13, color: "#374151", display: "grid", gap: 6 }}>
              {devedor.valor_total && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Valor Total</span>
                  <span style={{ fontWeight: 700, color: "#dc2626" }}>{fmtBRL(devedor.valor_total)}</span>
                </div>
              )}
              {devedor.valor_nominal && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Valor Nominal</span>
                  <span>{fmtBRL(devedor.valor_nominal)}</span>
                </div>
              )}
              {devedor.descricao_divida && (
                <div>
                  <span style={{ color: "#64748b", display: "block", marginBottom: 2 }}>Descrição</span>
                  <span style={{ fontSize: 12, color: "#374151" }}>{devedor.descricao_divida}</span>
                </div>
              )}
              {devedor.data_origem_divida && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#64748b" }}>Data Origem</span>
                  <span>{fmtData(devedor.data_origem_divida)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Dias Cadastro</span>
                <span style={{ fontWeight: 600 }}>{diasDesde(devedor.created_at)} dias</span>
              </div>
            </div>
          ) : <p style={{ color: "#94a3b8", fontSize: 13 }}>Sem dados de dívida</p>}
        </div>

        {/* Histórico de eventos */}
        <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #e8f0f7", maxHeight: 260, overflowY: "auto" }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>📋 Histórico</p>
          {eventos.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: 13 }}>Nenhum evento registrado</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {eventos.map((ev, i) => (
                <div key={ev.id || i} style={{ borderLeft: "3px solid #e2e8f0", paddingLeft: 10, paddingBottom: 6 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", marginBottom: 1 }}>
                    {TIPOS_EVENTO.find(t => t.v === ev.tipo_evento)?.l || ev.tipo_evento}
                    <span style={{ color: "#94a3b8", fontWeight: 400, marginLeft: 6 }}>{fmtData(ev.data_evento)}</span>
                  </p>
                  {ev.descricao && <p style={{ fontSize: 12, color: "#374151" }}>{ev.descricao}</p>}
                  {ev.data_promessa && <p style={{ fontSize: 11, color: "#f59e0b" }}>Promessa: {fmtData(ev.data_promessa)}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Btn onClick={() => setModalEvento(true)} color="#6366f1">+ Novo Evento</Btn>
        <Btn onClick={proximo} disabled={!eventoRegistrado || proximando} color="#f97316">
          {proximando ? "Carregando..." : "Próximo ›"}
        </Btn>
        <button onClick={() => setModalInfo(true)} style={{ background: "none", border: "none", color: "#6366f1", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
          Info da Negociação
        </button>
        <div style={{ flex: 1 }} />
        <Btn outline onClick={onSair}>‹ Voltar</Btn>
      </div>

      {/* Modal: Novo Evento */}
      {modalEvento && (
        <Modal title="+ Novo Evento" onClose={() => setModalEvento(false)} width={480}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={lbl}>Tipo do Evento *</label>
              <select style={inpStyle} value={form.tipo_evento} onChange={e => F("tipo_evento", e.target.value)}>
                {TIPOS_EVENTO.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Descrição</label>
              <textarea style={{ ...inpStyle, height: 72, resize: "vertical" }} value={form.descricao} onChange={e => F("descricao", e.target.value)} placeholder="Descreva o contato..." />
            </div>
            {telefones.length > 0 && (
              <div>
                <label style={lbl}>Telefone Usado</label>
                <select style={inpStyle} value={form.telefone_usado} onChange={e => F("telefone_usado", e.target.value)}>
                  <option value="">— Selecionar —</option>
                  {telefones.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            )}
            {form.tipo_evento === "PROMESSA_PAGAMENTO" && (
              <div>
                <label style={lbl}>Data da Promessa *</label>
                <input type="date" style={inpStyle} value={form.data_promessa} onChange={e => F("data_promessa", e.target.value)} min={new Date().toISOString().slice(0, 10)} />
              </div>
            )}
            <div>
              <label style={lbl}>Giro de Carteira (dias)</label>
              <input type="number" style={inpStyle} value={form.giro_carteira_dias} onChange={e => F("giro_carteira_dias", e.target.value)} placeholder="0 = sem giro" min="0" max="365" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn onClick={registrar} disabled={salvando} color="#6366f1">{salvando ? "Salvando..." : "Registrar Evento"}</Btn>
            <Btn outline onClick={() => setModalEvento(false)}>Cancelar</Btn>
          </div>
        </Modal>
      )}

      {/* Modal: Info Negociação */}
      {modalInfo && (
        <Modal title="Info da Negociação" onClose={() => setModalInfo(false)} width={400}>
          <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
            {[
              ["Entrada na Fila", fmtData(fila?.data_entrada_fila)],
              ["Último Acionamento", fmtData(fila?.data_acionamento)],
              ["Score", fila?.score_prioridade?.toFixed(1)],
              ["Status Fila", fila?.status_fila || "—"],
              ["Bloqueado até", fila?.bloqueado_ate ? fmtData(fila.bloqueado_ate) : "—"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid #f1f5f9" }}>
                <span style={{ color: "#64748b" }}>{k}</span>
                <span style={{ fontWeight: 600, color: "#0f172a" }}>{v || "—"}</span>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

const lbl = { display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4 };

// ─── TELA 4: FilaPesquisa ─────────────────────────────────────
function FilaPesquisa({ devedores }) {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const POR_PAG = 15;

  const resultados = (devedores || []).filter(d => {
    const q = busca.toLowerCase();
    if (q && !d.nome?.toLowerCase().includes(q) && !d.cpf_cnpj?.toLowerCase().includes(q)) return false;
    return true;
  });

  const total = resultados.length;
  const paginas = Math.ceil(total / POR_PAG);
  const visiveis = resultados.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

  const inp2 = { padding: "8px 12px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <input style={{ ...inp2, flex: 1, minWidth: 200 }} placeholder="Buscar por nome ou CPF/CNPJ..." value={busca} onChange={e => { setBusca(e.target.value); setPagina(1); }} />
      </div>

      {visiveis.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          {busca ? "Nenhum devedor encontrado para essa busca." : "Nenhum devedor cadastrado."}
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: "#94a3b8", marginBottom: 10 }}>{total} resultado(s)</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  {["Nome", "CPF/CNPJ", "Telefone", "Cidade", "Status"].map(h => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visiveis.map(d => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{d.nome}</td>
                    <td style={td}>{d.cpf_cnpj || "—"}</td>
                    <td style={td}>{d.telefone || "—"}</td>
                    <td style={td}>{d.cidade || "—"}</td>
                    <td style={td}><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {paginas > 1 && (
            <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
              <Btn sm outline disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>‹</Btn>
              <span style={{ fontSize: 13, color: "#64748b", padding: "6px 12px" }}>Página {pagina} de {paginas}</span>
              <Btn sm outline disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>›</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── TELA 5: FilaHistorico ────────────────────────────────────
function FilaHistorico() {
  const [eventos, setEventos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [filtroData, setFiltroData] = useState("7");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      let desde;
      if (filtroData === "custom") {
        desde = dataInicio;
      } else {
        desde = new Date(Date.now() - Number(filtroData) * 86400000).toISOString();
      }
      let query = `select=*&order=data_evento.desc&limit=200`;
      if (desde) query += `&data_evento=gte.${desde}`;
      const r = await dbGet("eventos_andamento", query);
      setEventos(Array.isArray(r) ? r : []);
    } catch (e) {
      toast.error("Erro ao carregar histórico: " + e.message);
    }
    setCarregando(false);
  }, [filtroData, dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  function exportCSV() {
    const header = "Data,Tipo,Descrição,Devedor ID,Usuário ID,Promessa\n";
    const rows = eventos.map(ev =>
      [fmtData(ev.data_evento), ev.tipo_evento, (ev.descricao || "").replace(/,/g, ";"), ev.devedor_id || ev.contrato_id, ev.usuario_id, ev.data_promessa || ""].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `historico-fila-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  const inp2 = { padding: "7px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 }}>
        <select style={inp2} value={filtroData} onChange={e => setFiltroData(e.target.value)}>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="custom">Personalizado</option>
        </select>
        {filtroData === "custom" && (
          <>
            <input type="date" style={inp2} value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
            <span style={{ color: "#94a3b8" }}>até</span>
            <input type="date" style={inp2} value={dataFim} onChange={e => setDataFim(e.target.value)} />
          </>
        )}
        <div style={{ flex: 1 }} />
        <Btn sm outline onClick={exportCSV} disabled={eventos.length === 0}>⬇ Exportar CSV</Btn>
      </div>

      {carregando ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Carregando...</div>
      ) : eventos.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Nenhum evento no período.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Data", "Tipo", "Descrição", "Devedor/Contrato", "Promessa"].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventos.map((ev, i) => (
                <tr key={ev.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={td}>{fmtData(ev.data_evento)}</td>
                  <td style={td}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#ede9fe", color: "#6d28d9" }}>
                      {TIPOS_EVENTO.find(t => t.v === ev.tipo_evento)?.l || ev.tipo_evento}
                    </span>
                  </td>
                  <td style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.descricao || "—"}</td>
                  <td style={{ ...td, fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>
                    {ev.devedor_id ? `dev:${ev.devedor_id}` : ev.contrato_id ? `${ev.contrato_id.slice(0, 8)}...` : "—"}
                  </td>
                  <td style={td}>{ev.data_promessa ? fmtData(ev.data_promessa) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── FilaDevedor (container principal) ───────────────────────
export default function FilaDevedor({ user, devedores, credores }) {
  const [view, setView] = useState("painel");
  const [atendimentoDados, setAtendimentoDados] = useState(null);
  const usuarioId = user.id;

  function handleIniciar(dados) {
    setAtendimentoDados(dados);
    setView("atendimento");
  }

  // Abrir atendimento direto do Painel (sem pegar da fila)
  function handleAbrirAtendimento(devedor) {
    setAtendimentoDados({ fila: devedor._fila || null, devedor, contrato: null, parcelas: [], eventos: [] });
    setView("atendimento");
  }

  function handleProximo(dados) {
    if (dados) {
      setAtendimentoDados(dados);
    } else {
      setAtendimentoDados(null);
      setView("operador");
    }
  }

  const tabs = [
    { id: "painel", label: "Painel" },
    { id: "operador", label: "Minha Fila" },
    { id: "pesquisa", label: "Pesquisa" },
    { id: "historico", label: "Histórico" },
  ];

  return (
    <div>
      {/* Tabs de navegação */}
      {view !== "atendimento" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "2px solid #f1f5f9", paddingBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setView(t.id)} style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "8px 16px", fontSize: 13, fontWeight: view === t.id ? 700 : 500,
              color: view === t.id ? "#f97316" : "#64748b",
              borderBottom: view === t.id ? "2px solid #f97316" : "2px solid transparent",
              marginBottom: -2, fontFamily: "'Plus Jakarta Sans',sans-serif",
              transition: "all .15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {view === "atendimento" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <button onClick={() => { setView("painel"); setAtendimentoDados(null); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: 13 }}>‹ Fila</button>
          <span style={{ color: "#d1d5db" }}>›</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Atendimento Ativo</span>
        </div>
      )}

      {view === "painel" && <FilaPainel usuarioId={usuarioId} credores={credores} onAbrirAtendimento={handleAbrirAtendimento} />}
      {view === "operador" && <FilaOperador usuarioId={usuarioId} onIniciar={handleIniciar} />}
      {view === "atendimento" && atendimentoDados && (
        <FilaAtendimento
          usuarioId={usuarioId}
          dadosIniciais={atendimentoDados}
          onProximo={handleProximo}
          onSair={() => { setView("painel"); setAtendimentoDados(null); }}
        />
      )}
      {view === "pesquisa" && <FilaPesquisa devedores={devedores} />}
      {view === "historico" && <FilaHistorico />}
    </div>
  );
}
