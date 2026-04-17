import { dbGet, dbInsert, dbUpdate, dbDelete, sb } from "../config/supabase.js";
import { calcularFatorCorrecao } from "../utils/correcao.js";

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

// ─── Status ativos e terminais ────────────────────────────────
const STATUS_ATIVOS = ["novo", "em_localizacao", "notificado", "em_negociacao"];
const STATUS_TERMINAIS = ["acordo_firmado", "pago_integral", "pago_parcial", "irrecuperavel", "ajuizado"];

// Bonus de score por status (quanto maior, mais urgente)
const SCORE_STATUS = {
  novo: 100,
  em_localizacao: 80,
  notificado: 60,
  em_negociacao: 40,
};

function calcularScoreDevedor(devedor) {
  const bonus = SCORE_STATUS[devedor.status] || 0;
  const valor = Number(devedor.valor_total) || 0;
  const criado = devedor.created_at ? new Date(devedor.created_at) : new Date();
  const diasCadastro = Math.floor((Date.now() - criado) / 86400000);
  return bonus + (valor / 100) + (diasCadastro * 0.5);
}

function calcularPrioridadeDevedor(score) {
  return score >= 120 ? "ALTA" : score >= 80 ? "MEDIA" : "BAIXA";
}

// ─── 1. listarDevedoresParaFila ───────────────────────────────
async function listarDevedoresParaFila(filtros = {}) {
  try {
    // Buscar devedores com status ativo
    const devedores = await dbGet(
      "devedores",
      `select=*&status=in.(${STATUS_ATIVOS.join(",")})&order=created_at.asc`
    );
    if (!devedores.length) return { success: true, data: [], error: null };

    // Buscar entradas ativas na fila (para marcar quem está em atendimento ou bloqueado)
    const devedorIds = devedores.map((d) => d.id);
    const hoje = new Date().toISOString().slice(0, 10);
    const filaAtiva = await dbGet(
      "fila_cobranca",
      `select=devedor_id,status_fila,bloqueado_ate,usuario_id&devedor_id=in.(${devedorIds.join(",")})&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO,ACIONADO)`
    );

    // Mapa devedor_id → fila entry mais recente
    const filaMap = {};
    for (const f of filaAtiva) {
      const key = String(f.devedor_id);
      // Priorizar EM_ATENDIMENTO > ACIONADO > AGUARDANDO
      if (!filaMap[key] || f.status_fila === "EM_ATENDIMENTO") {
        filaMap[key] = f;
      }
    }

    // Filtros client-side
    let resultado = devedores.map((d) => {
      const filaEntry = filaMap[String(d.id)] || null;
      const bloqueado = filaEntry?.bloqueado_ate && filaEntry.bloqueado_ate >= hoje;
      const emAtendimento = filaEntry?.status_fila === "EM_ATENDIMENTO";
      const score = calcularScoreDevedor(d);
      const prioridade = calcularPrioridadeDevedor(score);
      return { ...d, _fila: filaEntry, _bloqueado: !!bloqueado, _em_atendimento: emAtendimento, _score: score, _prioridade: prioridade };
    });

    // Aplicar filtros
    if (filtros.status_list?.length) {
      resultado = resultado.filter((d) => filtros.status_list.includes(d.status));
    }
    if (filtros.credor_id) {
      resultado = resultado.filter((d) => String(d.credor_id) === String(filtros.credor_id));
    }
    if (filtros.prioridade) {
      resultado = resultado.filter((d) => d._prioridade === filtros.prioridade);
    }
    if (filtros.busca) {
      const q = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (d) => d.nome?.toLowerCase().includes(q) || d.cpf_cnpj?.toLowerCase().includes(q)
      );
    }
    if (filtros.valor_min != null) {
      resultado = resultado.filter((d) => (Number(d.valor_total) || 0) >= filtros.valor_min);
    }
    if (filtros.valor_max != null) {
      resultado = resultado.filter((d) => (Number(d.valor_total) || 0) <= filtros.valor_max);
    }

    // Ordenar por score desc
    resultado.sort((a, b) => b._score - a._score);

    return { success: true, data: resultado, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 2. calcularScorePrioridade (mantido para compatibilidade) ─
async function calcularScorePrioridade(contratoId) {
  try {
    validateUUID(contratoId, "contratoId");

    const contratos = await dbGet("contratos", `select=id,valor_original&id=eq.${contratoId}`);
    if (!contratos.length) throw new Error(`Contrato ${contratoId} nao encontrado`);
    const valorOriginal = Number(contratos[0].valor_original) || 0;

    const parcelas = await dbGet(
      "parcelas",
      `select=id,valor,data_vencimento&contrato_id=eq.${contratoId}&status=eq.ATRASADA`
    );

    const hoje = new Date();
    let diasAtrasoMaior = 0;
    for (const p of parcelas) {
      const venc = new Date(p.data_vencimento + "T12:00:00");
      const dias = Math.max(0, Math.floor((hoje - venc) / (1000 * 60 * 60 * 24)));
      if (dias > diasAtrasoMaior) diasAtrasoMaior = dias;
    }

    const score = (valorOriginal / 1000) + (diasAtrasoMaior * 2) + (parcelas.length * 10);
    const prioridade = score >= 80 ? "ALTA" : score >= 40 ? "MEDIA" : "BAIXA";

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

// ─── 3. entrarNaFila ──────────────────────────────────────────
async function entrarNaFila() {
  try {
    const contratos = await dbGet("contratos", "select=id,devedor_id&estagio=eq.ANDAMENTO");
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

// ─── 4. proximoDevedor ────────────────────────────────────────
async function proximoDevedor(usuarioId, _tentativa = 1) {
  try {
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    const hoje = new Date().toISOString().slice(0, 10);

    // Buscar devedores ativos, excluindo quem está EM_ATENDIMENTO ou bloqueado
    const r = await listarDevedoresParaFila({});
    if (!r.success) throw new Error(r.error);

    const candidatos = (r.data || []).filter(
      (d) => !d._em_atendimento && !d._bloqueado
    );

    if (!candidatos.length) {
      return { success: true, data: null, error: null };
    }

    const devedor = candidatos[0]; // já ordenado por score desc

    // Registrar/atualizar entrada na fila como EM_ATENDIMENTO
    const filaExistente = devedor._fila;
    let filaEntry;

    if (filaExistente && filaExistente.status_fila === "AGUARDANDO") {
      // Lock otimista: tentar atualizar
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
        `?devedor_id=eq.${devedor.id}&status_fila=eq.AGUARDANDO`
      );
      if (!updated || updated.length === 0) {
        if (_tentativa >= 3) return { success: true, data: null, error: null };
        return proximoDevedor(usuarioId, _tentativa + 1);
      }
      filaEntry = updated[0];
    } else {
      // Criar nova entrada
      const inserted = await dbInsert("fila_cobranca", {
        devedor_id: devedor.id,
        status_fila: "EM_ATENDIMENTO",
        usuario_id: uid,
        usuario_nome: uNome,
        usuario_email: uEmail,
        score_prioridade: devedor._score,
        prioridade: devedor._prioridade,
        data_acionamento: new Date().toISOString(),
      });
      filaEntry = Array.isArray(inserted) ? inserted[0] : inserted;
    }

    // Buscar eventos do devedor
    const eventos = await dbGet(
      "eventos_andamento",
      `devedor_id=eq.${devedor.id}&order=data_evento.desc`
    );

    return {
      success: true,
      data: { fila: filaEntry, devedor, contrato: null, parcelas: [], eventos },
      error: null,
    };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 5. registrarEvento ───────────────────────────────────────
// Aceita devedorId (BIGINT) como identificador principal.
// contratoId (UUID) é opcional para manter compatibilidade com o fluxo antigo.
async function registrarEvento(devedorId, usuarioId, dadosEvento) {
  try {
    validateBigInt(devedorId, "devedorId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    const { tipo_evento, descricao, telefone_usado, data_promessa, giro_carteira_dias } = dadosEvento;

    const eventoPayload = {
      devedor_id: Number(devedorId),
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

    // Acordo: remover da fila
    if (tipo_evento === "ACORDO") {
      await sb(
        "fila_cobranca",
        "PATCH",
        { status_fila: "REMOVIDO", updated_at: new Date().toISOString() },
        `?devedor_id=eq.${devedorId}`
      );
      return { success: true, data: evento, error: null };
    }

    // CR-02: calcular bloqueado_ate (promessa ou giro, max date)
    let bloqueadoAte = null;

    if (tipo_evento === "PROMESSA_PAGAMENTO" && data_promessa) {
      bloqueadoAte = data_promessa;
    }

    if (giro_carteira_dias > 0) {
      const giroData = new Date(Date.now() + giro_carteira_dias * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      if (!bloqueadoAte || giroData > bloqueadoAte) {
        bloqueadoAte = giroData;
      }
    }

    if (bloqueadoAte !== null) {
      await sb(
        "fila_cobranca",
        "PATCH",
        {
          bloqueado_ate: bloqueadoAte,
          status_fila: "ACIONADO",
          updated_at: new Date().toISOString(),
        },
        `?devedor_id=eq.${devedorId}&status_fila=eq.EM_ATENDIMENTO`
      );
    }

    return { success: true, data: evento, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 6. alterarStatusDevedor ──────────────────────────────────
async function alterarStatusDevedor(devedorId, novoStatus, usuarioId) {
  try {
    validateBigInt(devedorId, "devedorId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    await sb(
      "devedores",
      "PATCH",
      { status: novoStatus },
      `?id=eq.${devedorId}`
    );

    // Se terminal, remover da fila
    if (STATUS_TERMINAIS.includes(novoStatus)) {
      await sb(
        "fila_cobranca",
        "PATCH",
        { status_fila: "REMOVIDO", updated_at: new Date().toISOString() },
        `?devedor_id=eq.${devedorId}&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO,ACIONADO)`
      );
    }

    // Registrar evento de mudança de status
    await dbInsert("eventos_andamento", {
      devedor_id: Number(devedorId),
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

// ─── 7. reciclarContratos ─────────────────────────────────────
async function reciclarContratos(filtros = {}, equipeId = null) {
  try {
    if (filtros.devedor_id !== undefined) {
      validateBigInt(filtros.devedor_id, "devedor_id");
    }

    const filaAtiva = await dbGet(
      "fila_cobranca",
      "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)"
    );
    const idsNaFila = filaAtiva.map((f) => f.contrato_id).filter(Boolean);

    let contratos;
    if (idsNaFila.length > 0) {
      contratos = await dbGet(
        "contratos",
        `select=*&estagio=eq.ANDAMENTO&id=not.in.(${idsNaFila.join(",")})`
      );
    } else {
      contratos = await dbGet("contratos", "select=*&estagio=eq.ANDAMENTO");
    }

    if (filtros.dias_sem_contato) {
      const diasLimite = filtros.dias_sem_contato;
      const limiteData = new Date(Date.now() - diasLimite * 24 * 60 * 60 * 1000).toISOString();
      const filtered = [];
      for (const contrato of contratos) {
        const eventos = await dbGet(
          "eventos_andamento",
          `contrato_id=eq.${contrato.id}&order=data_evento.desc&limit=1`
        );
        const ultimoEvento = eventos[0];
        if (!ultimoEvento || ultimoEvento.data_evento < limiteData) {
          filtered.push(contrato);
        }
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

// ─── 8. removerDaFila ─────────────────────────────────────────
async function removerDaFila(filaId, motivo, usuarioId) {
  try {
    validateUUID(filaId, "filaId");
    const { uid, uNome, uEmail } = extractUsuario(usuarioId);

    const resultado = await dbUpdate("fila_cobranca", filaId, {
      status_fila: "REMOVIDO",
      updated_at: new Date().toISOString(),
    });

    const filaItems = await dbGet("fila_cobranca", `select=devedor_id,contrato_id&id=eq.${filaId}`);
    const devedorId = filaItems[0]?.devedor_id;

    if (devedorId) {
      await dbInsert("eventos_andamento", {
        devedor_id: Number(devedorId),
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

// ─── 9. listarFila ───────────────────────────────────────────
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
      contratoIds.length > 0 ? dbGet("contratos", `id=in.(${contratoIds.join(",")})`) : Promise.resolve([]),
      devedorIds.length > 0 ? dbGet("devedores", `id=in.(${devedorIds.join(",")})`) : Promise.resolve([]),
    ]);

    const contratoMap = Object.fromEntries(contratos.map((c) => [c.id, c]));
    const devedorMap = Object.fromEntries(devedores.map((d) => [String(d.id), d]));

    const enriched = items.map((item) => ({
      ...item,
      contrato: item.contrato_id ? contratoMap[item.contrato_id] || null : null,
      devedor: devedorMap[String(item.devedor_id)] || null,
    }));

    return { success: true, data: enriched, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 10. atualizarValoresAtrasados ────────────────────────────
async function atualizarValoresAtrasados() {
  try {
    const contratos = await dbGet(
      "contratos",
      "select=id,valor_original,data_criacao&estagio=in.(NOVO,ANDAMENTO)"
    );

    let atualizados = 0;
    const dataFim = new Date().toISOString().slice(0, 10);

    for (const contrato of contratos) {
      const dataInicio = contrato.data_criacao
        ? contrato.data_criacao.slice(0, 10)
        : dataFim;

      const fator = calcularFatorCorrecao("igpm", dataInicio, dataFim);
      const valorAtualizado = (Number(contrato.valor_original) * fator).toFixed(2);

      await dbUpdate("contratos", contrato.id, {
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
  listarDevedoresParaFila,
  calcularScorePrioridade,
  entrarNaFila,
  proximoDevedor,
  registrarEvento,
  alterarStatusDevedor,
  reciclarContratos,
  removerDaFila,
  listarFila,
  atualizarValoresAtrasados,
};
