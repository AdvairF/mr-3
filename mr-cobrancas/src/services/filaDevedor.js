import { dbGet, dbInsert, dbUpdate, dbDelete, sb } from "../config/supabase.js";
import { calcularFatorCorrecao } from "../utils/correcao.js";
import { calcularSaldoContratoAtualizado, calcularDetalheEncargosContrato } from "../utils/devedorCalc.js";
import { STATUS_CONTRATO_ATIVOS, STATUS_CONTRATO_TERMINAIS } from "../utils/constants.js";

// ─── Validação de IDs (CR-01) ─────────────────────────────────
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateUUID(id, label = "id") {
  if (!id || typeof id !== "string" || !UUID_RE.test(id)) {
    throw new Error(`${label} inválido: esperado UUID, recebido: ${JSON.stringify(id)}`);
  }
}

function validateBigInt(id, label = "id") {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${label} inválido: esperado inteiro positivo, recebido: ${JSON.stringify(id)}`);
  }
}

// ─── Helper: extrai { id, nome, email } de número ou objeto usuario ──
// Aceita: número/string (BIGINT), UUID string, ou objeto { id, nome, email }
// usuario_id só é definido se for BIGINT válido (sem FK — seguro para qualquer valor)
function extractUsuario(u) {
  if (!u) return { uid: null, uNome: null, uEmail: null };
  if (typeof u === "object") {
    const raw = u.id ?? null;
    const n = Number(raw);
    return {
      uid: Number.isInteger(n) && n > 0 ? n : null,
      uNome: u.nome || u.email || null,
      uEmail: u.email || null,
    };
  }
  // Número ou string
  const n = Number(u);
  return {
    uid: Number.isInteger(n) && n > 0 ? n : null,
    uNome: null,
    uEmail: null,
  };
}

function parseDividasSvc(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  }
  return [];
}

// ─── Score / prioridade por contrato (Phase 7.13b D-pre-4 + Q4) ──
// Bonus de score por status contrato (quanto maior, mais urgente)
const SCORE_STATUS_CONTRATO = {
  em_cobranca:    100,
  em_localizacao:  80,
  notificado:      60,
  em_negociacao:   40,
  // terminais (quitado/arquivado/ajuizado) recebem 0 implicitamente
};

function calcularScoreContrato(contrato) {
  const bonus = SCORE_STATUS_CONTRATO[contrato.status] || 0;
  const saldo = parseFloat(contrato._saldo_atualizado || 0);
  const criado = contrato.created_at ? new Date(contrato.created_at) : new Date();
  const diasCadastro = Math.floor((Date.now() - criado) / 86400000);
  return bonus + (saldo / 100) + (diasCadastro * 0.5);
}

function calcularPrioridadeContrato(score) {
  return score >= 120 ? "ALTA" : score >= 80 ? "MEDIA" : "BAIXA";
}

// ─── 1. listarContratosParaFila ───────────────────────────────
async function listarContratosParaFila(filtros = {}) {
  try {
    // 1. Buscar contratos com status ativo (D-pre-4 7 valores; ativos = NOT IN terminais)
    const ativosList = STATUS_CONTRATO_ATIVOS.join(",");
    const contratos = await dbGet(
      "contratos_dividas",
      `select=*&status=in.(${ativosList})&order=created_at.asc`
    );
    if (!contratos.length) return { success: true, data: [], error: null };

    const contratoIds = contratos.map((c) => c.id);
    const devedorIds = [...new Set(contratos.map((c) => c.devedor_id).filter(Boolean))];
    const credorIds = [...new Set(contratos.map((c) => c.credor_id).filter(Boolean))];

    // 2. Buscar devedores (filter deleted_at — D-pre-9) + credores em paralelo
    const hoje = new Date().toISOString().slice(0, 10);
    const [devedores, credores, dividas, allPagamentosDivida, filaAtiva] = await Promise.all([
      devedorIds.length > 0
        ? dbGet("devedores", `id=in.(${devedorIds.join(",")})&deleted_at=is.null`)
        : Promise.resolve([]),
      credorIds.length > 0
        ? dbGet("credores", `id=in.(${credorIds.join(",")})`)
        : Promise.resolve([]),
      dbGet("dividas", `contrato_id=in.(${contratoIds.join(",")})&select=*`),
      dbGet("pagamentos_divida", `divida_id=neq.00000000-0000-0000-0000-000000000000&select=*`),
      dbGet(
        "fila_cobranca",
        `select=contrato_id,status_fila,bloqueado_ate,usuario_id&contrato_id=in.(${contratoIds.join(",")})&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO,ACIONADO)`
      ),
    ]);

    const devedorMap = Object.fromEntries(devedores.map((d) => [String(d.id), d]));
    const credorMap = Object.fromEntries(credores.map((c) => [String(c.id), c]));
    const filaMap = {};
    for (const f of filaAtiva) {
      const key = String(f.contrato_id);
      if (!filaMap[key] || f.status_fila === "EM_ATENDIMENTO") filaMap[key] = f;
    }

    // 3. Group dividas por contrato_id
    const dividasPorContrato = {};
    for (const d of dividas) {
      const key = String(d.contrato_id);
      if (!dividasPorContrato[key]) dividasPorContrato[key] = [];
      dividasPorContrato[key].push(d);
    }

    // 4. Eventos por contrato (D-pre-10 — eventos_andamento.contrato_id NOT NULL pós-migração)
    const [eventosRecentes, countHoje] = await Promise.all([
      dbGet(
        "eventos_andamento",
        `select=contrato_id,tipo_evento,data_evento,usuario_nome&contrato_id=in.(${contratoIds.join(",")})&order=data_evento.desc&limit=2000`
      ),
      dbGet(
        "eventos_andamento",
        `select=id&contrato_id=in.(${contratoIds.join(",")})&data_evento=gte.${hoje}T00:00:00&limit=1000`
      ),
    ]);

    const ultimoEventoPorContrato = {};
    for (const ev of eventosRecentes) {
      const key = String(ev.contrato_id);
      if (!ultimoEventoPorContrato[key]) ultimoEventoPorContrato[key] = ev;
    }
    const totalEventosHoje = countHoje.length;

    // 5. Filter devedor soft-deleted (D-pre-9): drop contratos cujo devedor não está em devedorMap
    let resultado = contratos
      .filter((c) => c.devedor_id == null || devedorMap[String(c.devedor_id)])
      .map((c) => {
        const dividasDoContrato = dividasPorContrato[String(c.id)] || [];
        const saldoAtualizado = calcularSaldoContratoAtualizado(dividasDoContrato, allPagamentosDivida, hoje);
        const filaEntry = filaMap[String(c.id)] || null;
        const bloqueado = filaEntry?.bloqueado_ate && filaEntry.bloqueado_ate >= hoje;
        const emAtendimento = filaEntry?.status_fila === "EM_ATENDIMENTO";
        const ue = ultimoEventoPorContrato[String(c.id)] || null;
        const ueData = ue?.data_evento?.slice(0, 10) || null;
        const diasSemContato = ueData
          ? Math.floor((Date.now() - new Date(ueData + "T12:00:00")) / 86400000)
          : null;
        // B2.1 cross-impact: arrays para DetalheContrato signature REAL ({ devedores, credores, allPagamentosDivida })
        const dividaIdsDoContrato = new Set(dividasDoContrato.map(d => String(d.id)));
        const pagamentosDoContrato = (allPagamentosDivida || []).filter(p => dividaIdsDoContrato.has(String(p.divida_id)));
        // Co-devedores via junction devedores_dividas (todos devedores ligados às dividas do contrato)
        const devedorIdsDoContrato = new Set();
        if (c.devedor_id != null) devedorIdsDoContrato.add(String(c.devedor_id));
        for (const d of dividasDoContrato) {
          if (d.devedor_id != null) devedorIdsDoContrato.add(String(d.devedor_id));
        }
        const devedoresDoContrato = [...devedorIdsDoContrato]
          .map(id => devedorMap[id])
          .filter(Boolean);
        // Credores: principal do contrato + qualquer credor referenciado nas dividas
        const credorIdsDoContrato = new Set();
        if (c.credor_id != null) credorIdsDoContrato.add(String(c.credor_id));
        for (const d of dividasDoContrato) {
          if (d.credor_id != null) credorIdsDoContrato.add(String(d.credor_id));
        }
        const credoresDoContrato = [...credorIdsDoContrato]
          .map(id => credorMap[id])
          .filter(Boolean);
        const enriched = {
          ...c,
          _devedor: devedorMap[String(c.devedor_id)] || null,    // singular (back-compat — devedor principal)
          _credor: credorMap[String(c.credor_id)] || null,        // singular (back-compat)
          _devedores: devedoresDoContrato,                        // PLURAL (B2.1 — Plan 02 DetalheContrato.devedores)
          _credores: credoresDoContrato,                          // PLURAL (B2.1 — Plan 02 DetalheContrato.credores)
          _dividas: dividasDoContrato,
          _pagamentos_divida: pagamentosDoContrato,               // B2.1 — Plan 02 DetalheContrato.allPagamentosDivida (pre-filtrado por contrato)
          _saldo_atualizado: saldoAtualizado,
          _fila: filaEntry,
          _bloqueado: !!bloqueado,
          _em_atendimento: emAtendimento,
          _ultimo_evento: ue,
          _dias_sem_contato: diasSemContato,
        };
        const score = calcularScoreContrato(enriched);
        const prioridade = calcularPrioridadeContrato(score);
        return { ...enriched, _score: score, _prioridade: prioridade };
      });

    // 6. Aplicar filtros client-side
    if (filtros.status_list?.length) {
      resultado = resultado.filter((c) => filtros.status_list.includes(c.status));
    }
    if (filtros.credor_id) {
      resultado = resultado.filter((c) => String(c.credor_id) === String(filtros.credor_id));
    }
    if (filtros.prioridade) {
      resultado = resultado.filter((c) => c._prioridade === filtros.prioridade);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c._devedor?.nome?.toLowerCase().includes(q)
            || c._devedor?.cpf_cnpj?.toLowerCase().includes(q)
      );
    }
    if (filtros.valor_min != null) {
      resultado = resultado.filter((c) => c._saldo_atualizado >= filtros.valor_min);
    }
    if (filtros.valor_max != null) {
      resultado = resultado.filter((c) => c._saldo_atualizado <= filtros.valor_max);
    }

    // 7. Ordenar por score desc
    resultado.sort((a, b) => b._score - a._score);

    return { success: true, data: resultado, totalEventosHoje, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 2. calcularScorePrioridade ───────────────────────────────
async function calcularScorePrioridade(contratoId) {
  try {
    validateUUID(contratoId, "contratoId");
    const contratos = await dbGet("contratos_dividas", `select=*&id=eq.${contratoId}`);
    if (!contratos.length) throw new Error(`Contrato ${contratoId} não encontrado`);
    const contrato = contratos[0];
    const dividas = await dbGet("dividas", `contrato_id=eq.${contratoId}&select=*`);
    const allPagamentos = await dbGet("pagamentos_divida", `divida_id=neq.00000000-0000-0000-0000-000000000000&select=*`);
    const hoje = new Date().toISOString().slice(0, 10);
    const saldo = calcularSaldoContratoAtualizado(dividas, allPagamentos, hoje);
    const enriched = { ...contrato, _saldo_atualizado: saldo };
    const score = calcularScoreContrato(enriched);
    const prioridade = calcularPrioridadeContrato(score);

    await sb(
      "fila_cobranca",
      "PATCH",
      { score_prioridade: score, prioridade, updated_at: new Date().toISOString() },
      `?contrato_id=eq.${contratoId}`
    );
    return { success: true, data: { score, prioridade }, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 3. entrarNaFila (FIX-FORWARD D-pre-8 — contratos → contratos_dividas) ──
async function entrarNaFila() {
  try {
    const ativosList = STATUS_CONTRATO_ATIVOS.join(",");
    const contratos = await dbGet(
      "contratos_dividas",
      `select=id,devedor_id,status&status=in.(${ativosList})`
    );
    const filaAtiva = await dbGet(
      "fila_cobranca",
      "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)"
    );
    const idsNaFila = new Set(filaAtiva.map((f) => f.contrato_id));
    const novos = contratos.filter((c) => !idsNaFila.has(c.id));
    const jaExistentes = contratos.filter((c) => idsNaFila.has(c.id));

    let inseridos = 0;
    for (const contrato of novos) {
      await dbInsert("fila_cobranca", {
        contrato_id: contrato.id,
        devedor_id: contrato.devedor_id,
        status_fila: "AGUARDANDO",
        score_prioridade: 0,
        prioridade: "MEDIA",
      });
      await calcularScorePrioridade(contrato.id);
      inseridos++;
    }

    let atualizados = 0;
    for (const contrato of jaExistentes) {
      await calcularScorePrioridade(contrato.id);
      atualizados++;
    }

    return { success: true, data: { inseridos, atualizados }, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 4. proximoContrato (rename de proximoDevedor) ────────────
async function proximoContrato(usuarioId, _tentativa = 1) {
  try {
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);
    const r = await listarContratosParaFila({});
    if (!r.success) throw new Error(r.error);

    const candidatos = (r.data || []).filter((c) => !c._em_atendimento && !c._bloqueado);
    if (!candidatos.length) return { success: true, data: null, error: null };

    const contrato = candidatos[0]; // ordenado por score desc
    const filaExistente = contrato._fila;
    let filaEntry;

    if (filaExistente && filaExistente.status_fila === "AGUARDANDO") {
      const updated = await sb(
        "fila_cobranca",
        "PATCH",
        {
          status_fila: "EM_ATENDIMENTO",
          usuario_id: uid,
          usuario_nome: uNome,
          usuario_email: uEmail,
          data_acionamento: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        `?contrato_id=eq.${contrato.id}&status_fila=eq.AGUARDANDO`
      );
      if (!updated || updated.length === 0) {
        if (_tentativa >= 3) return { success: true, data: null, error: null };
        return proximoContrato(usuarioId, _tentativa + 1);
      }
      filaEntry = updated[0];
    } else {
      const inserted = await dbInsert("fila_cobranca", {
        contrato_id: contrato.id,
        devedor_id: contrato.devedor_id,
        status_fila: "EM_ATENDIMENTO",
        usuario_id: uid,
        usuario_nome: uNome,
        usuario_email: uEmail,
        score_prioridade: contrato._score,
        prioridade: contrato._prioridade,
        data_acionamento: new Date().toISOString(),
      });
      filaEntry = Array.isArray(inserted) ? inserted[0] : inserted;
    }

    const eventos = await dbGet(
      "eventos_andamento",
      `contrato_id=eq.${contrato.id}&order=data_evento.desc`
    );

    return {
      success: true,
      data: { fila: filaEntry, contrato, devedor: contrato._devedor, dividas: contrato._dividas, eventos },
      error: null,
    };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 5. registrarEvento (assinatura: contratoId, usuarioId, dadosEvento) ──
async function registrarEvento(contratoId, usuarioId, dadosEvento) {
  try {
    validateUUID(contratoId, "contratoId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);
    const { tipo_evento, descricao, telefone_usado, data_promessa, giro_carteira_dias } = dadosEvento;

    // Lookup devedor_id (denormalização legacy — D-pre-11 side-effects preservados)
    const cArr = await dbGet("contratos_dividas", `id=eq.${contratoId}&select=devedor_id&limit=1`);
    const devedorId = Array.isArray(cArr) && cArr.length ? cArr[0].devedor_id : null;

    const eventoPayload = {
      contrato_id: contratoId,
      devedor_id: devedorId, // back-compat: Detalhe-Devedor lê eventos por devedor_id
      usuario_id: uid,
      usuario_nome: uNome,
      usuario_email: uEmail,
      tipo_evento,
      data_evento: new Date().toISOString(),
    };
    if (descricao !== undefined) eventoPayload.descricao = descricao;
    if (telefone_usado !== undefined) eventoPayload.telefone_usado = telefone_usado;
    if (data_promessa !== undefined) eventoPayload.data_promessa = data_promessa;
    if (giro_carteira_dias !== undefined) eventoPayload.giro_carteira_dias = giro_carteira_dias;

    const resultado = await dbInsert("eventos_andamento", eventoPayload);
    const evento = Array.isArray(resultado) ? resultado[0] : resultado;

    if (tipo_evento === "ACORDO") {
      await sb(
        "fila_cobranca",
        "PATCH",
        { status_fila: "REMOVIDO", updated_at: new Date().toISOString() },
        `?contrato_id=eq.${contratoId}`
      );
      return { success: true, data: evento, error: null };
    }

    let bloqueadoAte = null;
    if (tipo_evento === "PROMESSA_PAGAMENTO" && data_promessa) bloqueadoAte = data_promessa;
    if (giro_carteira_dias > 0) {
      const giroData = new Date(Date.now() + giro_carteira_dias * 86400000)
        .toISOString().slice(0, 10);
      if (!bloqueadoAte || giroData > bloqueadoAte) bloqueadoAte = giroData;
    }
    if (bloqueadoAte !== null) {
      await sb(
        "fila_cobranca",
        "PATCH",
        { bloqueado_ate: bloqueadoAte, status_fila: "ACIONADO", updated_at: new Date().toISOString() },
        `?contrato_id=eq.${contratoId}&status_fila=eq.EM_ATENDIMENTO`
      );
    }
    return { success: true, data: evento, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 6. alterarStatusContrato ──────────────────────────────────
async function alterarStatusContrato(contratoId, novoStatus, usuarioId) {
  try {
    validateUUID(contratoId, "contratoId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    await sb(
      "contratos_dividas",
      "PATCH",
      { status: novoStatus, updated_at: new Date().toISOString() },
      `?id=eq.${contratoId}`
    );

    if (STATUS_CONTRATO_TERMINAIS.includes(novoStatus)) {
      await sb(
        "fila_cobranca",
        "PATCH",
        { status_fila: "REMOVIDO", updated_at: new Date().toISOString() },
        `?contrato_id=eq.${contratoId}&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO,ACIONADO)`
      );
    }

    // Lookup devedor_id pra registrar evento (back-compat)
    const cArr = await dbGet("contratos_dividas", `id=eq.${contratoId}&select=devedor_id&limit=1`);
    const devedorId = Array.isArray(cArr) && cArr.length ? cArr[0].devedor_id : null;

    await dbInsert("eventos_andamento", {
      contrato_id: contratoId,
      devedor_id: devedorId,
      usuario_id: uid,
      usuario_nome: uNome,
      usuario_email: uEmail,
      tipo_evento: "CONTATO_COM_CLIENTE",
      descricao: `Status alterado para: ${novoStatus}`,
      data_evento: new Date().toISOString(),
    });

    return { success: true, data: { novoStatus }, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 7. reciclarContratos (FIX-FORWARD D-pre-8 — contratos → contratos_dividas) ──
async function reciclarContratos(filtros = {}, equipeId = null) {
  try {
    if (filtros.devedor_id !== undefined) validateBigInt(filtros.devedor_id, "devedor_id");
    const filaAtiva = await dbGet(
      "fila_cobranca",
      "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)"
    );
    const idsNaFila = filaAtiva.map((f) => f.contrato_id).filter(Boolean);

    const ativosList = STATUS_CONTRATO_ATIVOS.join(",");
    let contratos;
    if (idsNaFila.length > 0) {
      contratos = await dbGet(
        "contratos_dividas",
        `select=*&status=in.(${ativosList})&id=not.in.(${idsNaFila.join(",")})`
      );
    } else {
      contratos = await dbGet("contratos_dividas", `select=*&status=in.(${ativosList})`);
    }

    if (filtros.dias_sem_contato) {
      const limiteData = new Date(Date.now() - filtros.dias_sem_contato * 86400000).toISOString();
      const filtered = [];
      for (const contrato of contratos) {
        const eventos = await dbGet(
          "eventos_andamento",
          `contrato_id=eq.${contrato.id}&order=data_evento.desc&limit=1`
        );
        const ultimoEvento = eventos[0];
        if (!ultimoEvento || ultimoEvento.data_evento < limiteData) filtered.push(contrato);
      }
      contratos = filtered;
    }

    const reciclados = [];
    for (const contrato of contratos) {
      const inserted = await dbInsert("fila_cobranca", {
        contrato_id: contrato.id,
        devedor_id: contrato.devedor_id,
        equipe_id: equipeId || null,
        status_fila: "AGUARDANDO",
        score_prioridade: 0,
      });
      const item = Array.isArray(inserted) ? inserted[0] : inserted;
      reciclados.push(item);
      await calcularScorePrioridade(contrato.id);
    }
    return { success: true, data: { reciclados }, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 8. removerDaFila (payload eventos_andamento agora inclui contrato_id) ──
async function removerDaFila(filaId, motivo, usuarioId) {
  try {
    validateUUID(filaId, "filaId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    const resultado = await dbUpdate("fila_cobranca", filaId, {
      status_fila: "REMOVIDO",
      updated_at: new Date().toISOString(),
    });

    const filaItems = await dbGet("fila_cobranca", `select=devedor_id,contrato_id&id=eq.${filaId}`);
    const fila = filaItems[0] || {};

    if (fila.contrato_id) {
      await dbInsert("eventos_andamento", {
        contrato_id: fila.contrato_id,
        devedor_id: fila.devedor_id ? Number(fila.devedor_id) : null,
        usuario_id: uid,
        usuario_nome: uNome,
        usuario_email: uEmail,
        tipo_evento: "SEM_CONTATO",
        descricao: "Removido da fila: " + motivo,
        data_evento: new Date().toISOString(),
      });
    }

    return { success: true, data: resultado, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 9. listarFila (D-pre-9 filter deleted_at + enrichment contrato) ──
async function listarFila(filtros = {}) {
  try {
    if (filtros.equipe_id !== undefined) validateUUID(filtros.equipe_id, "equipe_id");

    let query = "select=*&order=score_prioridade.desc";
    if (filtros.equipe_id) query += `&equipe_id=eq.${filtros.equipe_id}`;
    if (filtros.prioridade) query += `&prioridade=eq.${filtros.prioridade}`;
    if (filtros.status_fila) query += `&status_fila=eq.${filtros.status_fila}`;

    const items = await dbGet("fila_cobranca", query);
    if (!items.length) return { success: true, data: [], error: null };

    const contratoIds = [...new Set(items.map((i) => i.contrato_id).filter(Boolean))];
    const devedorIds = [...new Set(items.map((i) => i.devedor_id).filter(Boolean))];

    const [contratos, devedores] = await Promise.all([
      contratoIds.length > 0
        ? dbGet("contratos_dividas", `id=in.(${contratoIds.join(",")})`)
        : Promise.resolve([]),
      devedorIds.length > 0
        ? dbGet("devedores", `id=in.(${devedorIds.join(",")})&deleted_at=is.null`)
        : Promise.resolve([]),
    ]);

    const contratoMap = Object.fromEntries(contratos.map((c) => [c.id, c]));
    const devedorMap = Object.fromEntries(devedores.map((d) => [String(d.id), d]));

    // D-pre-9: drop items cujo devedor está soft-deleted (não em devedorMap)
    const enriched = items
      .filter((item) => item.devedor_id == null || devedorMap[String(item.devedor_id)])
      .map((item) => ({
        ...item,
        contrato: item.contrato_id ? contratoMap[item.contrato_id] || null : null,
        devedor: devedorMap[String(item.devedor_id)] || null,
      }));

    return { success: true, data: enriched, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 10. atualizarValoresAtrasados (fonte = contratos_dividas + dividas) ──
async function atualizarValoresAtrasados() {
  try {
    const ativosList = STATUS_CONTRATO_ATIVOS.join(",");
    const contratos = await dbGet(
      "contratos_dividas",
      `select=id,data_origem,created_at&status=in.(${ativosList})`
    );

    let atualizados = 0;
    const dataFim = new Date().toISOString().slice(0, 10);

    for (const contrato of contratos) {
      const dividas = await dbGet("dividas", `contrato_id=eq.${contrato.id}&select=valor_total`);
      const valorOriginal = (dividas || []).reduce(
        (s, d) => s + (parseFloat(d.valor_total) || 0),
        0
      );
      if (valorOriginal === 0) continue;

      const dataInicio = (contrato.data_origem || contrato.created_at || dataFim).slice(0, 10);
      const fator = calcularFatorCorrecao("igpm", dataInicio, dataFim);
      const valorAtualizado = (valorOriginal * fator).toFixed(2);

      await dbUpdate("contratos_dividas", contrato.id, {
        valor_atualizado: valorAtualizado,
        updated_at: new Date().toISOString(),
      });
      atualizados++;
    }

    return { success: true, data: { atualizados }, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── EXPORT ───────────────────────────────────────────────────
export const filaDevedor = {
  // Renomeados (Phase 7.13b D-pre-1):
  listarContratosParaFila,
  proximoContrato,
  alterarStatusContrato,
  // Assinatura adaptada (contrato_id ao invés de devedor_id):
  registrarEvento,
  // Mantidos (assinatura igual):
  calcularScorePrioridade,
  entrarNaFila,
  reciclarContratos,
  removerDaFila,
  listarFila,
  atualizarValoresAtrasados,

  // ─── Aliases legacy (DEPRECATED — back-compat com FilaDevedor.jsx pré-Plan 02) ───
  // Plan 02 reescreve UI consumindo nomes novos. Estes aliases serão removidos em Plan 02 commit.
  listarDevedoresParaFila: listarContratosParaFila,
  proximoDevedor: proximoContrato,
  alterarStatusDevedor: alterarStatusContrato,
};
