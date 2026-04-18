import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import { dbGet } from "../config/supabase.js";
import { filaDevedor } from "../services/filaDevedor.js";
import { STATUS_DEV } from "../utils/constants.js";
import { calcularValorFace, calcularResumoFinanceiro, calcularDetalheEncargos } from "../utils/devedorCalc.js";

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

const TIPOS_EVENTO_LABEL = { LIGACAO: "Ligação", WHATSAPP: "WhatsApp", EMAIL: "E-mail", SMS: "SMS", PROMESSA_PAGAMENTO: "Promessa", SEM_CONTATO: "Sem contato", ACORDO: "Acordo", TELEFONE_NAO_EXISTE: "Tel. Inativo", CONTATO_COM_CLIENTE: "Contato", RECADO: "Recado" };

// ─── AtendimentoBadge ─────────────────────────────────────────
function AtendimentoBadge({ devedor }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const semana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  if (devedor._bloqueado) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", borderRadius: 99 }}>⏰ Promessa</span>;
  }
  const ue = devedor._ultimo_evento;
  if (!ue) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#fee2e2", padding: "1px 6px", borderRadius: 99 }}>🔴 Nunca</span>;
  }
  const data = ue.data_evento.slice(0, 10);
  if (data === hoje) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: "#16a34a", background: "#dcfce7", padding: "1px 6px", borderRadius: 99 }}>🟢 Hoje</span>;
  }
  if (data >= semana) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: "#d97706", background: "#fef3c7", padding: "1px 6px", borderRadius: 99 }}>🟡 Semana</span>;
  }
  return null;
}

// ─── UltimoAtendimentoCell ────────────────────────────────────
function UltimoAtendimentoCell({ ultimoEvento }) {
  if (!ultimoEvento) {
    return <span style={{ color: "#94a3b8", fontSize: 11 }}>— Nunca atendido</span>;
  }
  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#374151", marginBottom: 1 }}>{fmtData(ultimoEvento.data_evento)}</p>
      <p style={{ fontSize: 10, color: "#6366f1", marginBottom: 1 }}>{TIPOS_EVENTO_LABEL[ultimoEvento.tipo_evento] || ultimoEvento.tipo_evento}</p>
      {ultimoEvento.usuario_nome && <p style={{ fontSize: 10, color: "#94a3b8" }}>por {ultimoEvento.usuario_nome}</p>}
    </div>
  );
}

// ─── helper: parse seguro de dividas (string JSON ou array) ──
function parseDividas(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// ─── DividaCell ───────────────────────────────────────────────
function DividaCell({ devedor }) {
  // Usa _saldo_atualizado (computado no serviço com encargos + pagamentos abatidos)
  // ou cai para calcularValorFace se o campo não existir
  const saldo = devedor._saldo_atualizado != null ? devedor._saldo_atualizado : calcularValorFace(devedor);
  const face = calcularValorFace(devedor);
  const qtd = parseDividas(devedor.dividas).length;
  const temParcial = devedor._tem_pagamento_parcial;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontWeight: 700, color: saldo > 0 ? "#dc2626" : "#64748b", fontSize: 13 }}>
        {fmtBRL(saldo)}
      </span>
      {face > 0 && Math.abs(saldo - face) > 1 && (
        <span style={{ fontSize: 10, color: "#94a3b8" }}>Orig: {fmtBRL(face)}</span>
      )}
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {temParcial && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#0f766e", background: "#ccfbf1", padding: "1px 5px", borderRadius: 99 }}>
            Parcial
          </span>
        )}
        {qtd > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6366f1", background: "#ede9fe", padding: "1px 5px", borderRadius: 99 }}>
            {qtd} dívida{qtd > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── CredorCell ───────────────────────────────────────────────
function CredorCell({ devedor, credores }) {
  const credor = (credores || []).find(c => String(c.id) === String(devedor.credor_id));
  const primeiraDiv = parseDividas(devedor.dividas)[0];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {credor && <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{credor.nome}</span>}
      {devedor.numero_processo && <span style={{ fontSize: 10, color: "#6366f1" }}>Proc: {devedor.numero_processo}</span>}
      {primeiraDiv?.descricao && <span style={{ fontSize: 10, color: "#94a3b8" }}>{primeiraDiv.descricao}</span>}
      {!credor && !devedor.numero_processo && !primeiraDiv?.descricao && <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>}
    </div>
  );
}

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
  const [filtroAtendimento, setFiltroAtendimento] = useState("pendentes");
  const [totalEventosHoje, setTotalEventosHoje] = useState(0);
  const [hoveredRow, setHoveredRow] = useState(null);
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
    if (r.success) {
      setDevedores(r.data);
      setTotalEventosHoje(r.totalEventosHoje || 0);
    } else toast.error("Erro ao carregar fila: " + r.error);
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

  // Contadores (calculados da lista completa, antes do filtro de atendimento)
  const hojeCC = new Date().toISOString().slice(0, 10);
  const cntPendentes = devedores.filter(d =>
    !d._bloqueado && (!d._ultimo_evento || d._ultimo_evento.data_evento.slice(0, 10) < hojeCC)
  ).length;
  const cntAtendidosHoje = devedores.filter(d =>
    d._ultimo_evento?.data_evento?.slice(0, 10) === hojeCC
  ).length;
  const valorTotalAberto = devedores.reduce((s, d) => s + (d._saldo_atualizado ?? calcularValorFace(d)), 0);

  const cards = [
    { label: "Pendentes", valor: cntPendentes, cor: "#6366f1", bg: "rgba(99,102,241,.08)" },
    { label: "Atendidos Hoje", valor: cntAtendidosHoje, cor: "#10b981", bg: "rgba(16,185,129,.08)" },
    { label: "Eventos Hoje", valor: totalEventosHoje, cor: "#f59e0b", bg: "rgba(245,158,11,.08)" },
    { label: "Valor em Aberto", valor: fmtBRL(valorTotalAberto), cor: "#ef4444", bg: "rgba(239,68,68,.08)", isText: true },
  ];

  // Filtro de atendimento (client-side, sobre a lista retornada pelo serviço)
  let devedoresFiltrados = [...devedores];
  {
    const semana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    if (filtroAtendimento === "pendentes") {
      devedoresFiltrados = devedoresFiltrados.filter(d =>
        !d._bloqueado && (!d._ultimo_evento || d._ultimo_evento.data_evento.slice(0, 10) < hojeCC)
      );
      // Ordenação inteligente: ALTA → MEDIA → BAIXA, depois valor desc, depois mais antigo
      const priOrd = { ALTA: 0, MEDIA: 1, BAIXA: 2 };
      devedoresFiltrados.sort((a, b) => {
        const pd = (priOrd[a._prioridade] ?? 2) - (priOrd[b._prioridade] ?? 2);
        if (pd !== 0) return pd;
        const vd = (b._saldo_atualizado ?? calcularValorFace(b)) - (a._saldo_atualizado ?? calcularValorFace(a));
        if (vd !== 0) return vd;
        return (a.created_at || "").localeCompare(b.created_at || "");
      });
    } else if (filtroAtendimento === "atendidos_hoje") {
      devedoresFiltrados = devedoresFiltrados.filter(d =>
        d._ultimo_evento?.data_evento?.slice(0, 10) === hojeCC
      );
    } else if (filtroAtendimento === "atendidos_semana") {
      devedoresFiltrados = devedoresFiltrados.filter(d => {
        const data = d._ultimo_evento?.data_evento?.slice(0, 10);
        return data && data >= semana;
      });
    }
    // "todos" = sem filtro adicional
  }

  return (
    <div>
      {/* Contadores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.cor}22`, borderRadius: 14, padding: "14px 16px" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: c.cor, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>{c.label}</p>
            <p style={{ fontSize: c.isText ? 16 : 28, fontWeight: 800, color: c.cor, fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.2 }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs de atendimento */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { id: "pendentes", label: "⏳ Pendentes" },
          { id: "atendidos_hoje", label: "✅ Atendidos Hoje" },
          { id: "atendidos_semana", label: "📅 Atendidos Semana" },
          { id: "todos", label: "🗓️ Todos" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setFiltroAtendimento(tab.id)} style={{
            padding: "7px 16px", borderRadius: 99, fontSize: 12, fontWeight: 700,
            fontFamily: "'Plus Jakarta Sans',sans-serif", cursor: "pointer",
            border: filtroAtendimento === tab.id ? "none" : "1px solid #e2e8f0",
            background: filtroAtendimento === tab.id ? "#f97316" : "#fff",
            color: filtroAtendimento === tab.id ? "#fff" : "#64748b",
            transition: "all .15s",
          }}>
            {tab.label}
          </button>
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
      ) : devedoresFiltrados.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Nenhum devedor encontrado neste filtro</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>{devedoresFiltrados.length} devedor(es) — atualização automática a cada 30s</p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={th}>Nome</th>
                <th style={th}>CPF/CNPJ</th>
                <th style={th}>Status</th>
                <th style={th}>Valor Dívida</th>
                <th style={th}>Título / Credor</th>
                <th style={th}>Último Atendimento</th>
                <th style={th}>Dias s/ contato</th>
                <th style={th}>Prioridade</th>
                <th style={th}>Telefone</th>
                <th style={th}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {devedoresFiltrados.map(d => {
                const isHovered = hoveredRow === d.id;
                const bgBase = d._em_atendimento ? "rgba(245,158,11,.06)" : d._bloqueado ? "rgba(239,68,68,.04)" : "#fff";
                const bgHover = d._em_atendimento ? "rgba(245,158,11,.12)" : d._bloqueado ? "rgba(239,68,68,.08)" : "#f0f4ff";
                return (
                <tr key={d.id}
                  onClick={() => onAbrirAtendimento(d)}
                  onMouseEnter={() => setHoveredRow(d.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: isHovered ? bgHover : bgBase,
                    cursor: "pointer",
                    transition: "background .15s",
                    borderLeft: isHovered ? "3px solid #f97316" : "3px solid transparent",
                  }}>
                  <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span>{d.nome}</span>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {d._em_atendimento && <span style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "#FEF3C7", padding: "1px 6px", borderRadius: 99 }}>Em atendimento</span>}
                        {d._bloqueado && <span style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", background: "#FEE2E2", padding: "1px 6px", borderRadius: 99 }}>🔒 até {fmtData(d._fila?.bloqueado_ate)}</span>}
                        <AtendimentoBadge devedor={d} />
                      </div>
                    </div>
                  </td>
                  <td style={td}>{d.cpf_cnpj || "—"}</td>
                  <td style={td}><StatusBadge status={d.status} /></td>
                  <td style={td}><DividaCell devedor={d} /></td>
                  <td style={td}><CredorCell devedor={d} credores={credores} /></td>
                  <td style={td}><UltimoAtendimentoCell ultimoEvento={d._ultimo_evento} /></td>
                  <td style={{ ...td, textAlign: "center" }}>{d._dias_sem_contato !== null ? `${d._dias_sem_contato}d` : "—"}</td>
                  <td style={td}><PriorityBadge prioridade={d._prioridade} /></td>
                  <td style={td}>{d.telefone || "—"}</td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                      {d.telefone && (
                        <a href={`tel:${d.telefone}`} title="Ligar" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                          <Btn sm outline>📞</Btn>
                        </a>
                      )}
                      {d.telefone && (
                        <a href={`https://wa.me/55${d.telefone.replace(/\D/g, "")}?text=Olá%20${encodeURIComponent(d.nome)}%2C%20entramos%20em%20contato%20sobre%20seu%20débito.`} target="_blank" rel="noreferrer" title="WhatsApp" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                          <Btn sm outline>💬</Btn>
                        </a>
                      )}
                      {d.email && (
                        <a href={`mailto:${d.email}`} title="Email" style={{ textDecoration: "none" }} onClick={e => e.stopPropagation()}>
                          <Btn sm outline>📧</Btn>
                        </a>
                      )}
                      <Btn sm outline onClick={e => { e.stopPropagation(); setModalEvento(d); }} title="Registrar Evento">✏️</Btn>
                      {isHovered && (
                        <span style={{ color: "#f97316", fontWeight: 700, fontSize: 14, marginLeft: 2 }}>›</span>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
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
  const [pagamentos, setPagamentos] = useState(devedorInicial?._pagamentos || []);
  const [eventoRegistrado, setEventoRegistrado] = useState(false);
  const [modalEvento, setModalEvento] = useState(false);
  const [modalInfo, setModalInfo] = useState(false);
  const [form, setForm] = useState({ tipo_evento: "LIGACAO", descricao: "", telefone_usado: "", data_promessa: "", giro_carteira_dias: "" });
  const [salvando, setSalvando] = useState(false);
  const [proximando, setProximando] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);

  // Carregar eventos e pagamentos_parciais por devedor_id
  useEffect(() => {
    if (!devedorInicial?.id) return;
    setDevedor(devedorInicial);
    setEventos(evtsIniciais || []);
    setPagamentos([]);
    setEventoRegistrado(false);
    Promise.all([
      dbGet("eventos_andamento", `devedor_id=eq.${devedorInicial.id}&order=data_evento.desc&limit=50`),
      dbGet("pagamentos_parciais", `devedor_id=eq.${devedorInicial.id}&order=data_pagamento.asc`),
    ]).then(([evRows, pgRows]) => {
      if (Array.isArray(evRows)) setEventos(evRows);
      if (Array.isArray(pgRows)) setPagamentos(pgRows);
    }).catch(() => {});
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

      {/* Resumo financeiro completo */}
      {devedor && (() => {
        const hoje = new Date().toISOString().slice(0, 10);
        const det = calcularDetalheEncargos(devedor, pagamentos, hoje);
        const rowStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid #f1f5f9" };
        const labelStyle = { color: "#64748b", fontSize: 12 };
        const valStyle = (cor) => ({ fontWeight: 600, color: cor, fontSize: 12 });
        const secStyle = { fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginTop: 10, marginBottom: 4, paddingTop: 6, borderTop: "1px dashed #e2e8f0" };
        return (
          <div style={{ background: "linear-gradient(135deg,#fff5f5 0%,#fff 100%)", borderRadius: 16, padding: "18px 20px", border: "1px solid #fecaca", marginBottom: 16 }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>💰 Resumo Financeiro</p>

            {/* Saldo destaque */}
            <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", marginBottom: 12, border: "1px solid #fca5a5", textAlign: "center" }}>
              <p style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 2 }}>Saldo Devedor Atualizado</p>
              <p style={{ fontSize: 26, fontWeight: 800, color: "#dc2626", fontFamily: "'Space Grotesk',sans-serif", lineHeight: 1.2 }}>{fmtBRL(det.saldoAtualizado)}</p>
            </div>

            <div style={{ display: "grid", gap: 2 }}>
              {/* Valor original */}
              <div style={rowStyle}>
                <span style={labelStyle}>Valor Original</span>
                <span style={valStyle("#374151")}>{fmtBRL(det.valorOriginal)}</span>
              </div>

              {/* Encargos */}
              <p style={secStyle}>── Encargos ──</p>
              {det.multa.valor > 0 && (() => {
                const pcts = [...new Set(det.detalhePorDivida.filter(d => d.multaPct > 0).map(d => d.multaPct))];
                const label = pcts.length > 0 ? `Multa (${pcts.join("/")}%)` : "Multa";
                return (
                  <div style={rowStyle}>
                    <span style={labelStyle} title="Multa incidente uma única vez sobre o saldo corrigido">{label}</span>
                    <span style={valStyle("#f59e0b")}>{fmtBRL(det.multa.valor)}</span>
                  </div>
                );
              })()}
              {det.juros.valor > 0 && (() => {
                const pcts = [...new Set(det.detalhePorDivida.filter(d => d.jurosAM > 0).map(d => `${d.jurosAM}% a.m.`))];
                const label = pcts.length > 0 ? `Juros (${pcts.join("/")})` : "Juros";
                return (
                  <div style={rowStyle}>
                    <span style={labelStyle} title="Juros simples acumulados desde o vencimento">{label}</span>
                    <span style={valStyle("#f59e0b")}>{fmtBRL(det.juros.valor)}</span>
                  </div>
                );
              })()}
              {det.correcao.valor > 0 && (() => {
                const indices = [...new Set(det.detalhePorDivida.filter(d => d.correcao > 0 && d.indexador !== "nenhum").map(d => d.indexador.toUpperCase()))];
                const label = indices.length > 0 ? `Correção Monetária (${indices.join("/")})` : "Correção Monetária";
                return (
                  <div style={rowStyle}>
                    <span style={labelStyle} title="Correção pelo índice oficial desde o vencimento">{label}</span>
                    <span style={valStyle("#f59e0b")}>{fmtBRL(det.correcao.valor)}</span>
                  </div>
                );
              })()}
              {det.honorarios.valor > 0 && (() => {
                const pcts = [...new Set(det.detalhePorDivida.filter(d => d.honorariosPct > 0).map(d => d.honorariosPct))];
                const label = pcts.length > 0 ? `Honorários (${pcts.join("/")}%)` : "Honorários";
                return (
                  <div style={rowStyle}>
                    <span style={labelStyle} title="Honorários advocatícios sobre principal + juros + multa">{label}</span>
                    <span style={valStyle("#f59e0b")}>{fmtBRL(det.honorarios.valor)}</span>
                  </div>
                );
              })()}
              {det.custas.original > 0 && (
                <div style={rowStyle}>
                  <span style={labelStyle} title={`Original: ${fmtBRL(det.custas.original)} — corrigido até hoje`}>Custas Processuais (corrigidas)</span>
                  <span style={valStyle("#f59e0b")}>{fmtBRL(det.custas.atualizado)}</span>
                </div>
              )}
              {det.totalEncargos > 0 && (
                <div style={{ ...rowStyle, borderBottom: "none", paddingTop: 6 }}>
                  <span style={{ ...labelStyle, fontWeight: 700, color: "#374151" }}>Subtotal Encargos</span>
                  <span style={{ fontWeight: 700, color: "#f59e0b", fontSize: 12 }}>{fmtBRL(det.totalEncargos)}</span>
                </div>
              )}

              {/* Pagamentos */}
              {det.totalPago > 0 && <>
                <p style={secStyle}>── Pagamentos ──</p>
                <div style={rowStyle}>
                  <span style={labelStyle}>Total Pago</span>
                  <span style={valStyle("#10b981")}>{fmtBRL(det.totalPago)}</span>
                </div>
              </>}

              {/* Resultado */}
              <p style={secStyle}>── Resultado ──</p>
              <div style={rowStyle}>
                <span style={{ ...labelStyle, fontWeight: 700, color: "#dc2626" }}>Saldo Devedor</span>
                <span style={{ fontWeight: 800, color: "#dc2626", fontSize: 13 }}>{fmtBRL(det.saldoAtualizado)}</span>
              </div>
              {det.diasEmAtraso > 0 && (
                <div style={{ ...rowStyle, borderBottom: "none" }}>
                  <span style={labelStyle}>Dias em Atraso</span>
                  <span style={valStyle(det.diasEmAtraso > 180 ? "#dc2626" : det.diasEmAtraso > 90 ? "#f59e0b" : "#6366f1")}>{det.diasEmAtraso} dias</span>
                </div>
              )}
            </div>

            {/* Art. 523 §1º CPC — breakdown dos valores já incluídos no saldo */}
            {det.art523 && det.art523.total > 0 && (
              <div style={{ marginTop: 12, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "10px 14px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#9a3412", marginBottom: 6 }}>⚖️ Art. 523 §1º CPC — incluído no saldo</p>
                {det.art523.multa > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                    <span style={{ color: "#9a3412" }}>Multa Art. 523 (10%)</span>
                    <span style={{ fontWeight: 700, color: "#c2410c" }}>{fmtBRL(det.art523.multa)}</span>
                  </div>
                )}
                {det.art523.honorarios > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                    <span style={{ color: "#9a3412" }}>Honorários Art. 523 (10%)</span>
                    <span style={{ fontWeight: 700, color: "#c2410c" }}>{fmtBRL(det.art523.honorarios)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Dívidas cadastradas */}
            {det.detalhePorDivida.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }}>Dívidas Cadastradas ({det.detalhePorDivida.length})</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {det.detalhePorDivida.map((div, i) => {
                    const diasAtraso = div.dataVencimento ? Math.max(0, Math.floor((Date.now() - new Date(div.dataVencimento + "T12:00:00")) / 86400000)) : null;
                    const temEncargos = div.correcao > 0 || div.juros > 0 || div.multa > 0 || div.honorarios > 0;
                    return (
                      <div key={i} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 10px", fontSize: 11, border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontWeight: 600, color: "#374151" }}>{div.descricao}</span>
                          <span style={{ fontWeight: 700, color: "#dc2626" }}>{fmtBRL(div.valorOriginal)}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, color: "#94a3b8", flexWrap: "wrap", marginBottom: temEncargos || div.custas ? 4 : 0 }}>
                          {div.dataVencimento && <span>Venc: {fmtData(div.dataVencimento)}</span>}
                          {diasAtraso !== null && <span style={{ color: diasAtraso > 90 ? "#dc2626" : "#f59e0b" }}>{diasAtraso}d atraso</span>}
                          {div.indexador && div.indexador !== "nenhum" && <span>Idx: {div.indexador.toUpperCase()}</span>}
                          {(div.jurosTipo === "taxa_legal_406" || div.jurosTipo === "taxa_legal_406_12")
                            ? <span style={{ color: "#6366f1", fontWeight: 600 }}>Juros: Art. 406 CC{div.jurosTipo === "taxa_legal_406_12" ? " (12%→TL)" : ""}</span>
                            : div.jurosAM > 0 && <span>Juros: {div.jurosAM}% a.m.</span>}
                          {div.indexador === "inpc_ipca" && <span style={{ color: "#6366f1", fontWeight: 600 }}>Corr: INPC→IPCA</span>}
                          {div.multaPct > 0 && <span>Multa: {div.multaPct}%</span>}
                          {div.honorariosPct > 0 && <span>Honor: {div.honorariosPct}%</span>}
                        </div>
                        {div.correcaoPeriodos && div.correcaoPeriodos.length > 0 && (
                          <div style={{ background: "#f0fdf4", borderRadius: 6, padding: "4px 8px", marginBottom: 4, fontSize: 10 }}>
                            <span style={{ fontWeight: 700, color: "#059669", display: "block", marginBottom: 2 }}>Correção Monetária (INPC→IPCA) — {fmtBRL(div.correcao)}</span>
                            {div.correcaoPeriodos.map((p, pi) => (
                              <div key={pi} style={{ color: "#475569", display: "flex", justifyContent: "space-between" }}>
                                <span>├ {p.indice} ({(p.acumulado * 100).toFixed(2)}%)</span>
                                <span style={{ fontWeight: 600, color: "#059669" }}>{fmtBRL(div.valorOriginal * p.acumulado)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {div.jurosPeriodos && div.jurosPeriodos.length > 0 && (
                          <div style={{ background: "#f0f4ff", borderRadius: 6, padding: "4px 8px", marginBottom: 4, fontSize: 10 }}>
                            <span style={{ fontWeight: 700, color: "#6366f1", display: "block", marginBottom: 2 }}>Juros Legais (Art. 406 CC) — {fmtBRL(div.juros)}</span>
                            {div.jurosPeriodos.map((p, pi) => (
                              <div key={pi} style={{ color: "#475569", display: "flex", justifyContent: "space-between" }}>
                                <span>├ {p.regime} ({p.meses}m — {(p.taxaAcum * 100).toFixed(2)}%)</span>
                                <span style={{ fontWeight: 600, color: "#6366f1" }}>{fmtBRL(p.valor)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {div.custas && (
                          <div style={{ color: "#6366f1", fontSize: 10, marginBottom: 2 }}>
                            └ Custas: {fmtBRL(div.custas.original)} → Atualizado: {fmtBRL(div.custas.atualizado)}
                          </div>
                        )}
                        {temEncargos && (
                          <div style={{ color: "#10b981", fontSize: 10, fontWeight: 600 }}>
                            └ Atualizado: {fmtBRL(div.saldoTeorico)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Pessoas Vinculadas (collapsible) ── */}
      {(() => {
        const [showVinc, setShowVinc] = React.useState(false);
        const [vincs, setVincs] = React.useState(null); // null = not loaded yet
        return (
          <div style={{ background: "#fff", borderRadius: 16, padding: "14px 20px", border: "1px solid #e8f0f7", marginBottom: 16 }}>
            <button
              onClick={() => {
                if (!showVinc && vincs === null) {
                  import("../services/devedoresVinculados.js").then(({ listar, listarInverso }) => {
                    Promise.all([listar(devedor.id), listarInverso(devedor.id)]).then(([dir, inv]) => {
                      setVincs({ dir: Array.isArray(dir) ? dir : [], inv: Array.isArray(inv) ? inv : [] });
                    }).catch(() => setVincs({ dir: [], inv: [] }));
                  });
                }
                setShowVinc(v => !v);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: 0 }}
            >
              👥 Pessoas Vinculadas {vincs && (vincs.dir.length + vincs.inv.length) > 0 && (
                <span style={{ background: "#ede9fe", color: "#4f46e5", borderRadius: 99, padding: "1px 7px", fontSize: 11 }}>
                  {vincs.dir.length + vincs.inv.length}
                </span>
              )}
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{showVinc ? "▲" : "▼"}</span>
            </button>
            {showVinc && (
              <div style={{ marginTop: 12 }}>
                {vincs === null ? (
                  <p style={{ color: "#94a3b8", fontSize: 12 }}>Carregando...</p>
                ) : vincs.dir.length === 0 && vincs.inv.length === 0 ? (
                  <p style={{ color: "#94a3b8", fontSize: 12 }}>Nenhuma pessoa vinculada.</p>
                ) : (
                  <>
                    {vincs.inv.map(r => (
                      <div key={r.id} style={{ background: "#fef9c3", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: "#92400e", fontWeight: 700 }}>Vinculado a: </span>
                        <span style={{ color: "#0f172a", fontWeight: 600 }}>{r.principal?.nome || "—"}</span>
                        <span style={{ color: "#64748b" }}> ({r.tipo_vinculo})</span>
                      </div>
                    ))}
                    {vincs.dir.map(r => (
                      <div key={r.id} style={{ border: "1px solid #e8edf2", borderRadius: 8, padding: "6px 10px", marginBottom: 6, fontSize: 12, background: "#fafafe" }}>
                        <span style={{ fontWeight: 600, color: "#0f172a" }}>{r.vinculado?.nome || "—"}</span>
                        <span style={{ marginLeft: 8, background: "#ede9fe", color: "#4f46e5", borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 700 }}>{r.tipo_vinculo}</span>
                        {r.vinculado?.cpf_cnpj && <span style={{ color: "#94a3b8", marginLeft: 8 }}>{r.vinculado.cpf_cnpj}</span>}
                        {r.observacao && <p style={{ color: "#64748b", fontSize: 11, fontStyle: "italic", marginTop: 3, marginBottom: 0 }}>{r.observacao}</p>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ marginBottom: 16 }}>
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
  // Passar objeto completo para que os serviços gravem nome/email sem depender de FK
  const usuario = { id: user.id, nome: user.nome || user.nome_completo || user.email, email: user.email };

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

      {view === "painel" && <FilaPainel usuarioId={usuario} credores={credores} onAbrirAtendimento={handleAbrirAtendimento} />}
      {view === "operador" && <FilaOperador usuarioId={usuario} onIniciar={handleIniciar} />}
      {view === "atendimento" && atendimentoDados && (
        <FilaAtendimento
          usuarioId={usuario}
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
