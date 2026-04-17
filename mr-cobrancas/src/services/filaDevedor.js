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

// ─── 1. calcularScorePrioridade ───────────────────────────────
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

// ─── 2. entrarNaFila ──────────────────────────────────────────
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

// ─── 3. proximoDevedor ────────────────────────────────────────
async function proximoDevedor(operadorId, _tentativa = 1) {
  try {
    validateUUID(operadorId, "operadorId");

    const hoje = new Date().toISOString().slice(0, 10);

    const items = await dbGet(
      "fila_cobranca",
      `select=*&status_fila=eq.AGUARDANDO&order=score_prioridade.desc&limit=1&or=(bloqueado_ate.is.null,bloqueado_ate.lt.${hoje})`
    );

    if (!items.length) {
      return { success: true, data: null, error: null };
    }

    const item = items[0];

    const updated = await sb(
      "fila_cobranca",
      "PATCH",
      {
        status_fila: "EM_ATENDIMENTO",
        operador_id: operadorId,
        data_acionamento: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      `?id=eq.${item.id}&status_fila=eq.AGUARDANDO`
    );

    // Lock otimista: outro operador pegou este item
    if (!updated || updated.length === 0) {
      if (_tentativa >= 3) {
        return { success: true, data: null, error: null };
      }
      return proximoDevedor(operadorId, _tentativa + 1);
    }

    // Enriquecer com dados relacionados
    const [devedoresArr, contratosArr, parcelas, eventos] = await Promise.all([
      dbGet("devedores", `id=eq.${item.devedor_id}`),
      dbGet("contratos", `id=eq.${item.contrato_id}`),
      dbGet("parcelas", `contrato_id=eq.${item.contrato_id}&order=numero_parcela.asc`),
      dbGet("eventos_andamento", `contrato_id=eq.${item.contrato_id}&order=data_evento.desc`),
    ]);

    const devedor = devedoresArr[0] || null;
    const contrato = contratosArr[0] || null;

    return {
      success: true,
      data: { fila: updated[0], devedor, contrato, parcelas, eventos },
      error: null,
    };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 4. registrarEvento ───────────────────────────────────────
async function registrarEvento(contratoId, operadorId, dadosEvento) {
  try {
    validateUUID(contratoId, "contratoId");
    validateUUID(operadorId, "operadorId");

    const { tipo_evento, descricao, telefone_usado, data_promessa, giro_carteira_dias } = dadosEvento;

    const eventoPayload = {
      contrato_id: contratoId,
      operador_id: operadorId,
      tipo_evento,
      data_evento: new Date().toISOString(),
    };
    if (descricao !== undefined) eventoPayload.descricao = descricao;
    if (telefone_usado !== undefined) eventoPayload.telefone_usado = telefone_usado;
    if (data_promessa !== undefined) eventoPayload.data_promessa = data_promessa;
    if (giro_carteira_dias !== undefined) eventoPayload.giro_carteira_dias = giro_carteira_dias;

    const resultado = await dbInsert("eventos_andamento", eventoPayload);
    const evento = Array.isArray(resultado) ? resultado[0] : resultado;

    // Acordo: finaliza contrato e remove da fila
    if (tipo_evento === "ACORDO") {
      await sb(
        "contratos",
        "PATCH",
        { estagio: "FINALIZADO", updated_at: new Date().toISOString() },
        `?id=eq.${contratoId}`
      );
      await sb(
        "fila_cobranca",
        "PATCH",
        { status_fila: "REMOVIDO", updated_at: new Date().toISOString() },
        `?contrato_id=eq.${contratoId}`
      );
      return { success: true, data: evento, error: null };
    }

    // CR-02: calcular bloqueado_ate considerando AMBOS os fatores independentemente
    let bloqueadoAte = null;

    if (tipo_evento === "PROMESSA_PAGAMENTO" && data_promessa) {
      bloqueadoAte = data_promessa;
    }

    if (giro_carteira_dias > 0) {
      const giroData = new Date(Date.now() + giro_carteira_dias * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      // Usar a maior data (mais restritiva)
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
        `?contrato_id=eq.${contratoId}&status_fila=eq.EM_ATENDIMENTO`
      );
    }

    return { success: true, data: evento, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

// ─── 5. reciclarContratos ─────────────────────────────────────
async function reciclarContratos(filtros = {}, equipeId = null) {
  try {
    if (filtros.devedor_id !== undefined) {
      validateBigInt(filtros.devedor_id, "devedor_id");
    }

    const filaAtiva = await dbGet(
      "fila_cobranca",
      "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)"
    );
    const idsNaFila = filaAtiva.map((f) => f.contrato_id);

    let contratos;
    if (idsNaFila.length > 0) {
      contratos = await dbGet(
        "contratos",
        `select=*&estagio=eq.ANDAMENTO&id=not.in.(${idsNaFila.join(",")})`
      );
    } else {
      contratos = await dbGet("contratos", "select=*&estagio=eq.ANDAMENTO");
    }

    // Filtro adicional por dias_sem_contato
    if (filtros.dias_sem_contato) {
      const diasLimite = filtros.dias_sem_contato;
      const limiteData = new Date(
        Date.now() - diasLimite * 24 * 60 * 60 * 1000
      ).toISOString();

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

// ─── 6. removerDaFila ─────────────────────────────────────────
async function removerDaFila(filaId, motivo, usuarioId) {
  try {
    validateUUID(filaId, "filaId");
    validateUUID(usuarioId, "usuarioId");

    const resultado = await dbUpdate("fila_cobranca", filaId, {
      status_fila: "REMOVIDO",
      updated_at: new Date().toISOString(),
    });

    const filaItems = await dbGet("fila_cobranca", `select=contrato_id&id=eq.${filaId}`);
    const contratoId = filaItems[0]?.contrato_id;

    if (contratoId) {
      await dbInsert("eventos_andamento", {
        contrato_id: contratoId,
        operador_id: usuarioId,
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

// ─── 7. atualizarValoresAtrasados ─────────────────────────────
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
  calcularScorePrioridade,
  entrarNaFila,
  proximoDevedor,
  registrarEvento,
  reciclarContratos,
  removerDaFila,
  atualizarValoresAtrasados,
};
