/**
 * FilaDevedor.jsx — Phase 7.13b D-pre-1..D-pre-6 + Q5-Q7
 *
 * Refactor estrutural — Fila por CONTRATO (não por devedor).
 * 4 telas: FilaPainel (supervisor), FilaOperador (lobby),
 *          FilaAtendimento (atendimento), FilaPesquisa (busca histórica).
 *
 * 1 contrato = 1 linha (D-pre-2). Devedor com 2 contratos = 2 linhas.
 * Status PER CONTRATO independente (D-pre-4 — 7 valores STATUS_CONTRATO).
 * Toggle 'Esconder quitados/arquivados' default ON (D-pre-6 Q6).
 * Clique abre DetalheContrato modal overlay (D-pre-3).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import InputBR from "./ui/InputBR.jsx";
import DetalheContrato from "./DetalheContrato.jsx";
import { dbGet } from "../config/supabase.js";
import { filaDevedor } from "../services/filaDevedor.js";
import { STATUS_CONTRATO, STATUS_CONTRATO_TERMINAIS } from "../utils/constants.js";
import { calcularDetalheEncargosContrato } from "../utils/devedorCalc.js";

// ─── PriorityBadge (preservada verbatim) ──────────────────────
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

// ─── StatusBadge contrato (D-pre-4 — STATUS_CONTRATO) ─────────
function StatusBadge({ status }) {
  const s = STATUS_CONTRATO.find(x => x.v === status) || { l: status, cor: "#64748b", bg: "#f1f5f9" };
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

// ─── Helpers compartilhados ───────────────────────────────────
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

// ─── AtendimentoBadge (props: contrato no lugar de devedor) ───
function AtendimentoBadge({ contrato }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const semana = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  if (contrato._bloqueado) {
    return <span style={{ fontSize: 10, fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "1px 6px", borderRadius: 99 }}>⏰ Promessa</span>;
  }
  const ue = contrato._ultimo_evento;
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

// ─── UltimoAtendimentoCell (preservada) ───────────────────────
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

// ─── ContratoCell (rename de DividaCell — Q3) ─────────────────
// W2.3 — predicado direto sem .some() em closure constante
function ContratoCell({ contrato }) {
  const nDividas = contrato._dividas?.length || 0;
  const saldoOuValor = contrato._saldo_atualizado != null
    ? contrato._saldo_atualizado
    : (Number(contrato.valor_original) || 0);
  const valorOriginalNum = Number(contrato.valor_original || 0);
  const temPagamentos = nDividas > 0 && valorOriginalNum > 0 && saldoOuValor < valorOriginalNum;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontWeight: 700, color: saldoOuValor > 0 ? "#dc2626" : "#64748b", fontSize: 13 }}>
        {fmtBRL(saldoOuValor)}
      </span>
      <div style={{ fontSize: 10, color: "#94a3b8" }}>
        {nDividas} {nDividas === 1 ? "parcela" : "parcelas"}
        {contrato.numero_contrato && ` • ${contrato.numero_contrato}`}
      </div>
      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {temPagamentos && (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#0f766e", background: "#ccfbf1", padding: "1px 5px", borderRadius: 99 }}>
            Parcial
          </span>
        )}
      </div>
    </div>
  );
}

// ─── CredorCell (preservado) ──────────────────────────────────
function CredorCell({ credor }) {
  if (!credor) return <span style={{ color: "#94a3b8", fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{credor.nome || "—"}</span>
    </div>
  );
}

// ─── Card auxiliar (Q5) ───────────────────────────────────────
function Card({ title, value, cor }) {
  return (
    <div style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff" }}>
      <div style={{ fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px" }}>{title}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: cor }}>{value}</div>
    </div>
  );
}

// ─── TELA 1: FilaPainel (Supervisor — listagem por contrato) ──
function FilaPainel({ usuarioId, credores, onAbrirAtendimento }) {
  const [contratos, setContratos] = useState([]);
  const [totalEventosHoje, setTotalEventosHoje] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState({
    status_list: [],
    credor_id: "",
    prioridade: "",
    busca: "",
    valor_min: null,
    valor_max: null,
  });
  // W2.2 — toggle default ON (D-pre-6 Q6)
  const [esconderQuitadosArquivados, setEsconderQuitadosArquivados] = useState(true);
  const [contratoAberto, setContratoAberto] = useState(null);
  const pollRef = useRef(null);

  const carregar = useCallback(async (silent = false) => {
    if (!silent) setCarregando(true);
    const r = await filaDevedor.listarContratosParaFila(filtros);
    if (r.success) {
      setContratos(r.data || []);
      setTotalEventosHoje(r.totalEventosHoje || 0);
    } else {
      toast.error("Erro ao carregar fila: " + (r.error || ""));
    }
    if (!silent) setCarregando(false);
  }, [filtros]);

  // Polling 30s preservado (pattern legacy)
  useEffect(() => {
    carregar();
    pollRef.current = setInterval(() => carregar(true), 30000);
    return () => clearInterval(pollRef.current);
  }, [carregar]);

  // D-pre-6 + filtros locais
  const contratosFiltrados = useMemo(() => {
    return contratos.filter(c => {
      if (esconderQuitadosArquivados && (c.status === 'quitado' || c.status === 'arquivado')) return false;
      // ⚠ ajuizado NÃO incluído no toggle (operador pode querer ver)
      return true;
    });
  }, [contratos, esconderQuitadosArquivados]);

  // Cards Q5 — recalculados POR CONTRATO
  // W2.1 — cards usam MESMA base que tabela (contratosFiltrados)
  const cards = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    // Use STATUS_CONTRATO_TERMINAIS para excluir terminais nos cards de count Pendentes/Atendidos/Valor
    const naoTerminais = contratosFiltrados.filter(c => !STATUS_CONTRATO_TERMINAIS.includes(c.status));
    return {
      pendentes: naoTerminais.filter(c => !c._ultimo_evento || c._ultimo_evento.data_evento.slice(0, 10) !== hoje).length,
      atendidosHoje: naoTerminais.filter(c => c._ultimo_evento?.data_evento.slice(0, 10) === hoje).length,
      eventosHoje: totalEventosHoje, // count global do service
      valorEmAberto: naoTerminais.reduce((s, c) => s + (Number(c._saldo_atualizado) || 0), 0),
    };
  }, [contratosFiltrados, totalEventosHoje]);

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "#1f2937" }}>Fila de Atendimento</h2>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>
        {contratosFiltrados.length} contrato(s) — atualização automática a cada 30s
      </p>

      {/* Cards Q5 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <Card title="Pendentes" value={cards.pendentes} cor="#dc2626" />
        <Card title="Atendidos Hoje" value={cards.atendidosHoje} cor="#16a34a" />
        <Card title="Eventos Hoje" value={cards.eventosHoje} cor="#2563eb" />
        <Card title="Valor em Aberto" value={fmtBRL(cards.valorEmAberto)} cor="#7c3aed" />
      </div>

      {/* B2.4 — Filtros completos: busca + credor + prioridade + valor min/max + toggle */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <input
          style={inpS}
          placeholder="Buscar por nome/CPF do devedor"
          value={filtros.busca}
          onChange={e => setFiltros({ ...filtros, busca: e.target.value })}
        />
        <select
          style={inpS}
          value={filtros.credor_id}
          onChange={e => setFiltros({ ...filtros, credor_id: e.target.value })}
        >
          <option value="">Todos credores</option>
          {(credores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>
        <select
          style={inpS}
          value={filtros.prioridade}
          onChange={e => setFiltros({ ...filtros, prioridade: e.target.value })}
        >
          <option value="">Todas prioridades</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Média</option>
          <option value="BAIXA">Baixa</option>
        </select>
        {/* B2.4 — InputBR type="value" mantém STRING (lição feedback_motor_parity_via_string_preservation.md) */}
        <InputBR
          type="value"
          placeholder="Valor mín"
          value={filtros.valor_min ?? ""}
          onChange={(v) => setFiltros({ ...filtros, valor_min: v === "" ? null : Number(v) })}
          style={{ ...inpS, width: 120 }}
        />
        <InputBR
          type="value"
          placeholder="Valor máx"
          value={filtros.valor_max ?? ""}
          onChange={(v) => setFiltros({ ...filtros, valor_max: v === "" ? null : Number(v) })}
          style={{ ...inpS, width: 120 }}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
          <input
            type="checkbox"
            checked={esconderQuitadosArquivados}
            onChange={e => setEsconderQuitadosArquivados(e.target.checked)}
          />
          Esconder quitados/arquivados
        </label>
      </div>

      {/* B2.4 — Status multi-select checkboxes */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12, padding: "6px 0" }}>
        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600, alignSelf: "center" }}>Status:</span>
        {STATUS_CONTRATO.map(s => (
          <label
            key={s.v}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: s.cor, background: s.bg, padding: "3px 8px", borderRadius: 99, cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={filtros.status_list.includes(s.v)}
              onChange={e => {
                const next = e.target.checked
                  ? [...filtros.status_list, s.v]
                  : filtros.status_list.filter(x => x !== s.v);
                setFiltros({ ...filtros, status_list: next });
              }}
            />
            {s.l}
          </label>
        ))}
      </div>

      {/* Tabela contratos */}
      {carregando ? <p style={{ color: "#94a3b8" }}>Carregando…</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={th}>Devedor</th>
              <th style={th}>Credor</th>
              <th style={th}>Saldo / Parcelas</th>
              <th style={th}>Status</th>
              <th style={th}>Prioridade</th>
              <th style={th}>Último Atendimento</th>
              <th style={th}>Estado</th>
              <th style={th}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratosFiltrados.map(c => {
              // Co-devedores: mostrar count se houver múltiplos via _devedores plural (B2.1)
              const codevs = (c._devedores || []).filter(d => String(d.id) !== String(c._devedor?.id));
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setContratoAberto(c.id)}
                >
                  <td style={td}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{c._devedor?.nome || "—"}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{c._devedor?.cpf_cnpj || "—"}</div>
                    {codevs.length > 0 && (
                      <div style={{ fontSize: 9, color: "#7c3aed", marginTop: 2 }}>
                        +{codevs.length} co-devedor{codevs.length > 1 ? "es" : ""}
                      </div>
                    )}
                  </td>
                  <td style={td}><CredorCell credor={c._credor} /></td>
                  <td style={td}><ContratoCell contrato={c} /></td>
                  <td style={td}><StatusBadge status={c.status} /></td>
                  <td style={td}><PriorityBadge prioridade={c._prioridade} /></td>
                  <td style={td}><UltimoAtendimentoCell ultimoEvento={c._ultimo_evento} /></td>
                  <td style={td}><AtendimentoBadge contrato={c} /></td>
                  <td style={td} onClick={e => e.stopPropagation()}>
                    {/* B2.3 — Btn API real: sm + color (não `primary`/`small`) */}
                    <Btn
                      sm
                      color="#3d9970"
                      disabled={c._bloqueado || c._em_atendimento}
                      onClick={() => onAbrirAtendimento(c)}
                    >
                      Atender
                    </Btn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* DetalheContrato modal overlay (D-pre-3 — Q1 decisão planner) */}
      {/* B2.1 — DetalheContrato signature REAL: { contrato, dividas, devedores, credores, allPagamentos, allPagamentosDivida, hoje, onVoltar, onVerDetalhe, onCarregarTudo } */}
      {/* B2.2 — Modal API real: { title, onClose, children, width=560 } — usa width={1200} */}
      {contratoAberto && (() => {
        const cAberto = contratos.find(c => c.id === contratoAberto);
        if (!cAberto) return null;
        const hojeStr = new Date().toISOString().slice(0, 10);
        return (
          <Modal title="Detalhe do Contrato" onClose={() => setContratoAberto(null)} width={1200}>
            <DetalheContrato
              contrato={cAberto}
              dividas={cAberto._dividas || []}
              devedores={cAberto._devedores || (cAberto._devedor ? [cAberto._devedor] : [])}
              credores={cAberto._credores || (cAberto._credor ? [cAberto._credor] : [])}
              allPagamentos={[]}
              allPagamentosDivida={cAberto._pagamentos_divida || []}
              hoje={hojeStr}
              onVoltar={() => setContratoAberto(null)}
              onVerDetalhe={() => {}}
              onCarregarTudo={() => carregar(true)}
            />
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── TELA 2: FilaOperador (Lobby — botão Próximo) ─────────────
function FilaOperador({ usuarioId, onIniciar }) {
  const [carregando, setCarregando] = useState(false);

  const handleProximo = async () => {
    setCarregando(true);
    const r = await filaDevedor.proximoContrato(usuarioId);
    setCarregando(false);
    if (!r.success) {
      toast.error("Erro ao buscar próximo contrato: " + (r.error || ""));
      return;
    }
    if (!r.data) {
      toast.success("Nenhum contrato disponível na fila no momento.");
      return;
    }
    // r.data = { fila, contrato, devedor, dividas, eventos }
    onIniciar(r.data);
  };

  return (
    <div style={{
      padding: "60px 20px", textAlign: "center",
      fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <h2 style={{ margin: "0 0 16px", fontSize: 24, color: "#1f2937" }}>Lobby do Operador</h2>
      <p style={{ fontSize: 14, color: "#64748b", marginBottom: 32 }}>
        Clique em "Próximo Contrato" para receber o próximo da fila.
      </p>
      {/* B2.3 — Btn color="#3d9970" (brand verde) ao invés de `primary` */}
      <Btn color="#3d9970" onClick={handleProximo} disabled={carregando}>
        {carregando ? "Buscando…" : "🎯 Próximo Contrato"}
      </Btn>
    </div>
  );
}

// ─── TELA 3: FilaAtendimento (atendimento ativo) ──────────────
function FilaAtendimento({ usuarioId, dadosIniciais, onProximo, onSair }) {
  // dadosIniciais = { fila, contrato, devedor, dividas, eventos }
  const [fila, setFila] = useState(dadosIniciais.fila);
  const [contrato, setContrato] = useState(dadosIniciais.contrato);
  const [devedor, setDevedor] = useState(dadosIniciais.devedor);
  const [dividas, setDividas] = useState(dadosIniciais.dividas || []);
  const [eventos, setEventos] = useState(dadosIniciais.eventos || []);
  const [allPagamentosDivida, setAllPagamentosDivida] = useState([]);

  const [novoStatus, setNovoStatus] = useState(contrato.status);
  const [tipoEvento, setTipoEvento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [telefoneUsado, setTelefoneUsado] = useState("");
  const [dataPromessa, setDataPromessa] = useState("");
  const [giroDias, setGiroDias] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Carrega pagamentos_divida do contrato (saldo realtime)
  useEffect(() => {
    if (!dividas?.length) return;
    const ids = dividas.map(d => d.id);
    dbGet("pagamentos_divida", `divida_id=in.(${ids.join(",")})&select=*`)
      .then(rows => setAllPagamentosDivida(rows || []))
      .catch(() => setAllPagamentosDivida([]));
  }, [dividas]);

  // Carrega histórico de eventos do banco no mount + on contrato.id change
  // Paridade comportamental com HEAD pre-7.13b L570-581 (filter migrado para contrato_id — schema 7.13b D-pre-10).
  // Limit=50 preservado de HEAD por paridade — paginação/limit configurable é phase futura se demandado.
  useEffect(() => {
    if (!contrato?.id) return;
    dbGet("eventos_andamento", `contrato_id=eq.${contrato.id}&order=data_evento.desc&limit=50`)
      .then(rows => { if (Array.isArray(rows)) setEventos(rows); })
      .catch(err => {
        console.error("Erro ao fetchar eventos_andamento do contrato:", contrato?.id, err);
      });
  }, [contrato?.id]);

  const detalheEncargos = useMemo(() => {
    if (!dividas?.length) return null;
    const hoje = new Date().toISOString().slice(0, 10);
    return calcularDetalheEncargosContrato(dividas, allPagamentosDivida, hoje);
  }, [dividas, allPagamentosDivida]);

  // W2.4 — _totalPago per divida calculado client-side via allPagamentosDivida
  const dividasComPagamento = useMemo(() => {
    return (dividas || []).map(d => {
      const totalPago = (allPagamentosDivida || [])
        .filter(p => String(p.divida_id) === String(d.id))
        .reduce((s, p) => s + (parseFloat(p.valor_pago || p.valor) || 0), 0);
      return { ...d, _totalPago: totalPago };
    });
  }, [dividas, allPagamentosDivida]);

  const handleRegistrarEvento = async () => {
    if (!tipoEvento) { toast.error("Selecione o tipo de evento"); return; }
    setSalvando(true);
    const r = await filaDevedor.registrarEvento(contrato.id, usuarioId, {
      tipo_evento: tipoEvento,
      descricao: descricao || undefined,
      telefone_usado: telefoneUsado || undefined,
      data_promessa: dataPromessa || undefined,
      giro_carteira_dias: giroDias ? Number(giroDias) : undefined,
    });
    setSalvando(false);
    if (!r.success) {
      toast.error("Erro ao registrar evento: " + (r.error || ""));
      return;
    }
    toast.success("Evento registrado.");
    setEventos([r.data, ...eventos]);
    // Reset campos
    setTipoEvento("");
    setDescricao("");
    setTelefoneUsado("");
    setDataPromessa("");
    setGiroDias("");
    // Se ACORDO → contrato saiu da fila
    if (tipoEvento === "ACORDO") onSair();
  };

  const handleAlterarStatus = async () => {
    if (novoStatus === contrato.status) { toast("Status inalterado."); return; }
    setSalvando(true);
    const r = await filaDevedor.alterarStatusContrato(contrato.id, novoStatus, usuarioId);
    setSalvando(false);
    if (!r.success) {
      toast.error("Erro ao alterar status: " + (r.error || ""));
      return;
    }
    toast.success(`Status alterado para: ${novoStatus}`);
    setContrato({ ...contrato, status: novoStatus });
    if (STATUS_CONTRATO_TERMINAIS.includes(novoStatus)) {
      onSair();
    }
  };

  // Co-devedores plural (B2.1) — mostra TODOS devedores ligados às dividas do contrato
  const todosDevedoresContrato = (contrato._devedores && contrato._devedores.length > 0)
    ? contrato._devedores
    : (devedor ? [devedor] : []);
  const coDevedores = todosDevedoresContrato.filter(d => String(d.id) !== String(devedor?.id));

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      {/* Header — devedor + contrato */}
      <div style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, color: "#1f2937" }}>{devedor?.nome || "—"}</h2>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
          Contrato {contrato.numero_contrato || (contrato.id ? contrato.id.slice(0, 8) : "—")}
          {detalheEncargos && ` • Saldo Atualizado: ${fmtBRL(detalheEncargos.saldoAtualizado)}`}
        </p>
        <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusBadge status={contrato.status} />
          <span style={{ fontSize: 11, color: "#64748b" }}>{(dividas || []).length} parcela(s)</span>
          {coDevedores.length > 0 && (
            <span style={{ fontSize: 11, color: "#7c3aed", background: "#ede9fe", padding: "2px 8px", borderRadius: 99, fontWeight: 700 }}>
              + {coDevedores.length} co-devedor{coDevedores.length > 1 ? "es" : ""}
            </span>
          )}
        </div>
        {coDevedores.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#64748b" }}>
            <strong>Co-devedores:</strong>{" "}
            {coDevedores.map((d, i) => (
              <span key={d.id}>
                {d.nome || "—"} ({d.cpf_cnpj || "—"})
                {i < coDevedores.length - 1 ? ", " : ""}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Status select (D-pre-4) */}
      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <label style={{ fontSize: 12, color: "#64748b" }}>Alterar status:</label>
        <select style={inpS} value={novoStatus} onChange={e => setNovoStatus(e.target.value)}>
          {STATUS_CONTRATO.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        {/* B2.3 — Btn sm (não `small`) */}
        <Btn sm onClick={handleAlterarStatus} disabled={salvando || novoStatus === contrato.status}>
          {salvando ? "..." : "Salvar Status"}
        </Btn>
      </div>

      {/* Tabela dívidas (read-only — operador vê todas — Q4) */}
      <h3 style={{ margin: "12px 0 6px", fontSize: 14, color: "#1f2937" }}>Parcelas / Dívidas do Contrato</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 16 }}>
        <thead style={{ background: "#f8fafc" }}>
          <tr>
            <th style={th}>#</th>
            <th style={th}>Vencimento</th>
            <th style={th}>Valor Original</th>
            <th style={th}>Pago</th>
            <th style={th}>Saldo</th>
          </tr>
        </thead>
        <tbody>
          {/* W2.4 — usa dividasComPagamento (com _totalPago calculado client-side) */}
          {dividasComPagamento.map((d, i) => (
            <tr key={d.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
              <td style={td}>{i + 1}</td>
              <td style={td}>{fmtData(d.data_vencimento)}</td>
              <td style={td}>{fmtBRL(d.valor_total)}</td>
              <td style={td}>{fmtBRL(d._totalPago || 0)}</td>
              <td style={td}>{fmtBRL((Number(d.valor_total) || 0) - (Number(d._totalPago) || 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Registrar evento */}
      <h3 style={{ margin: "12px 0 6px", fontSize: 14, color: "#1f2937" }}>Registrar Evento</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <select style={inpS} value={tipoEvento} onChange={e => setTipoEvento(e.target.value)}>
          <option value="">Selecione tipo…</option>
          {Object.entries(TIPOS_EVENTO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input
          style={inpS}
          placeholder="Telefone usado"
          value={telefoneUsado}
          onChange={e => setTelefoneUsado(e.target.value)}
        />
      </div>
      <textarea
        style={{ ...inpS, width: "100%", minHeight: 60, marginBottom: 8 }}
        placeholder="Descrição"
        value={descricao}
        onChange={e => setDescricao(e.target.value)}
      />
      {tipoEvento === "PROMESSA_PAGAMENTO" && (
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Data prometida</label>
          <InputBR
            type="date"
            value={dataPromessa}
            onChange={setDataPromessa}
            style={{ ...inpS }}
          />
        </div>
      )}
      <input
        type="number"
        style={{ ...inpS, marginBottom: 8 }}
        min="0"
        placeholder="Giro carteira (dias) — opcional"
        value={giroDias}
        onChange={e => setGiroDias(e.target.value)}
      />

      <div style={{ display: "flex", gap: 8 }}>
        {/* B2.3 — Btn color (não `primary`) */}
        <Btn color="#3d9970" onClick={handleRegistrarEvento} disabled={salvando}>
          {salvando ? "Salvando…" : "💾 Registrar Evento"}
        </Btn>
        <Btn outline onClick={onProximo}>Próximo →</Btn>
        <Btn outline onClick={onSair}>Sair</Btn>
      </div>

      {/* Histórico de eventos */}
      <h3 style={{ margin: "16px 0 6px", fontSize: 14, color: "#1f2937" }}>Eventos Registrados</h3>
      {eventos.length === 0 ? (
        <p style={{ color: "#94a3b8", fontSize: 11 }}>Nenhum evento.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {eventos.map(ev => (
            <li key={ev.id} style={{ padding: "6px 0", borderBottom: "1px solid #f1f5f9", fontSize: 12 }}>
              <strong>{TIPOS_EVENTO_LABEL[ev.tipo_evento] || ev.tipo_evento}</strong> — {fmtData(ev.data_evento)}
              {ev.descricao && <div style={{ color: "#64748b", fontSize: 11 }}>{ev.descricao}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── TELA 4: FilaPesquisa (busca histórica por contrato) ──────
function FilaPesquisa({ devedores }) {
  const [contratos, setContratos] = useState([]);
  const [busca, setBusca] = useState("");
  // W2.2 — toggle default ON (D-pre-6 Q6)
  const [esconderQuitadosArquivados, setEsconderQuitadosArquivados] = useState(true);
  const [contratoAberto, setContratoAberto] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // FilaPesquisa busca em TODOS os contratos (Q2 — incluindo terminais)
    // listarContratosParaFila SOMENTE retorna não-terminais; usa dbGet direto
    try {
      const allContratos = await dbGet(
        "contratos_dividas",
        "select=*&order=created_at.desc&limit=1000"
      );
      setContratos(allContratos || []);
    } catch (err) {
      toast.error("Erro ao carregar contratos: " + (err?.message || ""));
      setContratos([]);
    }
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const devedoresMap = useMemo(() =>
    Object.fromEntries((devedores || []).map(d => [String(d.id), d])),
    [devedores]
  );

  // Q7 — busca por devedor.nome/cpf retornando contratos múltiplos
  const resultados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return contratos.filter(c => {
      if (esconderQuitadosArquivados && (c.status === 'quitado' || c.status === 'arquivado')) return false;
      if (!q) return true;
      const dev = devedoresMap[String(c.devedor_id)];
      return (dev?.nome || "").toLowerCase().includes(q)
          || (dev?.cpf_cnpj || "").toLowerCase().includes(q)
          || (c.numero_contrato || "").toLowerCase().includes(q);
    });
  }, [contratos, busca, esconderQuitadosArquivados, devedoresMap]);

  return (
    <div style={{ padding: "16px 20px", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <h2 style={{ margin: "0 0 12px", fontSize: 18, color: "#1f2937" }}>Pesquisar Contratos</h2>
      <p style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>
        {resultados.length} contrato(s)
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <input
          style={{ ...inpS, flex: 1 }}
          placeholder="Buscar por nome, CPF/CNPJ do devedor ou número do contrato"
          value={busca}
          onChange={e => setBusca(e.target.value)}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#64748b" }}>
          <input
            type="checkbox"
            checked={esconderQuitadosArquivados}
            onChange={e => setEsconderQuitadosArquivados(e.target.checked)}
          />
          Esconder quitados/arquivados
        </label>
      </div>

      {carregando ? <p style={{ color: "#94a3b8" }}>Carregando…</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <tr>
              <th style={th}>Devedor</th>
              <th style={th}>Contrato</th>
              <th style={th}>Status</th>
              <th style={th}>Valor Original</th>
              <th style={th}>Criação</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map(c => {
              const dev = devedoresMap[String(c.devedor_id)];
              return (
                <tr
                  key={c.id}
                  style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                  onClick={() => setContratoAberto(c.id)}
                >
                  <td style={td}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1f2937" }}>{dev?.nome || "—"}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8" }}>{dev?.cpf_cnpj || "—"}</div>
                  </td>
                  <td style={td}>{c.numero_contrato || (c.id ? c.id.slice(0, 8) : "—")}</td>
                  <td style={td}><StatusBadge status={c.status} /></td>
                  <td style={td}>{fmtBRL(c.valor_original)}</td>
                  <td style={td}>{fmtData(c.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* B2.1 + B2.2 — DetalheContrato signature REAL + Modal width prop */}
      {contratoAberto && (() => {
        const cAberto = contratos.find(c => c.id === contratoAberto);
        if (!cAberto) return null;
        const dev = devedoresMap[String(cAberto.devedor_id)];
        const hojeStr = new Date().toISOString().slice(0, 10);
        return (
          <Modal title="Detalhe do Contrato" onClose={() => setContratoAberto(null)} width={1200}>
            <DetalheContrato
              contrato={cAberto}
              dividas={[]}
              devedores={dev ? [dev] : []}
              credores={[]}
              allPagamentos={[]}
              allPagamentosDivida={[]}
              hoje={hojeStr}
              onVoltar={() => setContratoAberto(null)}
              onVerDetalhe={() => {}}
              onCarregarTudo={() => carregar()}
            />
          </Modal>
        );
      })()}
    </div>
  );
}

// ─── ROTEADOR INTERNO + EXPORT default ────────────────────────
export default function FilaDevedor({ user, devedores, credores }) {
  const [view, setView] = useState("painel");  // painel | operador | atendimento | pesquisa
  const [atendimentoData, setAtendimentoData] = useState(null);
  const usuario = user?.id || null;

  const handleAbrirAtendimento = (contrato) => {
    // Paridade comportamental com HEAD pre-7.13b: supervisor abre atendimento
    // direto da linha, sem service call. Lock real (PATCH fila_cobranca para
    // EM_ATENDIMENTO específico do contrato) fica como candidato a phase futura.
    // CR-02 PROMESSA+giro segue funcionando via registrarEvento.bloqueado_ate
    // (service L400-414, intocado).
    setAtendimentoData({
      fila: contrato._fila || null,
      contrato,
      devedor: contrato._devedor || null,
      dividas: contrato._dividas || [],
      eventos: [],
    });
    setView("atendimento");
  };

  const handleIniciar = (data) => {
    setAtendimentoData(data);
    setView("atendimento");
  };

  const handleProximo = async () => {
    setAtendimentoData(null);
    setView("operador");
  };

  const handleSair = () => {
    setAtendimentoData(null);
    setView("painel");
  };

  return (
    <div>
      {/* Tab nav */}
      <div style={{ display: "flex", gap: 4, padding: "8px 20px", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        {/* B2.3 — Btn API real: sm + color (não `small`/`primary`) */}
        <Btn sm color={view === "painel" ? "#3d9970" : "#94a3b8"} outline={view !== "painel"} onClick={() => setView("painel")}>Painel</Btn>
        <Btn sm color={view === "operador" ? "#3d9970" : "#94a3b8"} outline={view !== "operador"} onClick={() => setView("operador")}>Operador</Btn>
        <Btn sm color={view === "pesquisa" ? "#3d9970" : "#94a3b8"} outline={view !== "pesquisa"} onClick={() => setView("pesquisa")}>Pesquisa</Btn>
      </div>

      {view === "painel" && <FilaPainel usuarioId={usuario} credores={credores} onAbrirAtendimento={handleAbrirAtendimento} />}
      {view === "operador" && <FilaOperador usuarioId={usuario} onIniciar={handleIniciar} />}
      {view === "atendimento" && atendimentoData && (
        <FilaAtendimento usuarioId={usuario} dadosIniciais={atendimentoData}
          onProximo={handleProximo} onSair={handleSair} />
      )}
      {view === "pesquisa" && <FilaPesquisa devedores={devedores} />}
    </div>
  );
}
