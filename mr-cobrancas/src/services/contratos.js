/**
 * contratos.js — Service CRUD para modelo 3 níveis: Contrato → Documento → Parcela.
 *
 * MIGRATIONS EXECUTADAS (2026-04-22) — Phase 6 — Edição de Contrato + Histórico
 *
 * CREATE TABLE IF NOT EXISTS public.contratos_historico (
 *   id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
 *   contrato_id   UUID         NOT NULL REFERENCES public.contratos_dividas(id) ON DELETE CASCADE,
 *   tipo_evento   TEXT         NOT NULL CHECK (tipo_evento IN ('criacao', 'alteracao_encargos', 'cessao_credito', 'assuncao_divida', 'alteracao_referencia', 'outros')),
 *   snapshot_campos JSONB      NOT NULL DEFAULT '{}',
 *   usuario_id    UUID         DEFAULT auth.uid(),
 *   created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
 * );
 * ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso autenticado" ON public.contratos_historico FOR ALL USING (true) WITH CHECK (true);
 * CREATE INDEX IF NOT EXISTS idx_contratos_historico_contrato_id ON public.contratos_historico (contrato_id, created_at DESC);
 *
 * MIGRATIONS EXECUTADAS (2026-04-21) — Supabase SQL Editor:
 *
 * -- Block 1: Modificar contratos_dividas (remove tipo, adiciona desnormalizados + encargos)
 * ALTER TABLE public.contratos_dividas
 *   DROP COLUMN IF EXISTS tipo,
 *   ADD COLUMN IF NOT EXISTS referencia TEXT,
 *   ADD COLUMN IF NOT EXISTS num_documentos INT NOT NULL DEFAULT 0,
 *   ADD COLUMN IF NOT EXISTS num_parcelas_total INT NOT NULL DEFAULT 0,
 *   ADD COLUMN IF NOT EXISTS indice_correcao TEXT,
 *   ADD COLUMN IF NOT EXISTS juros_tipo TEXT,
 *   ADD COLUMN IF NOT EXISTS juros_am_percentual NUMERIC(5,4),
 *   ADD COLUMN IF NOT EXISTS multa_percentual NUMERIC(5,4),
 *   ADD COLUMN IF NOT EXISTS honorarios_percentual NUMERIC(5,4),
 *   ADD COLUMN IF NOT EXISTS despesas NUMERIC(15,2),
 *   ADD COLUMN IF NOT EXISTS art523_opcao TEXT,
 *   ADD COLUMN IF NOT EXISTS data_inicio_atualizacao DATE;
 *
 * -- Block 2: Nova tabela documentos_contrato (nível 2)
 * CREATE TABLE IF NOT EXISTS public.documentos_contrato (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   contrato_id UUID NOT NULL REFERENCES public.contratos_dividas(id),
 *   tipo TEXT NOT NULL CHECK (tipo IN ('NF/Duplicata', 'Compra e Venda', 'Empréstimo')),
 *   numero_doc TEXT,
 *   valor NUMERIC(15,2) NOT NULL,
 *   data_emissao DATE NOT NULL,
 *   num_parcelas INT NOT NULL CHECK (num_parcelas >= 1),
 *   primeira_parcela_na_data_base BOOLEAN NOT NULL DEFAULT TRUE,
 *   indice_correcao TEXT,
 *   juros_tipo TEXT,
 *   juros_am_percentual NUMERIC(5,4),
 *   multa_percentual NUMERIC(5,4),
 *   honorarios_percentual NUMERIC(5,4),
 *   despesas NUMERIC(15,2),
 *   art523_opcao TEXT,
 *   data_inicio_atualizacao DATE,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE public.documentos_contrato ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso autenticado" ON public.documentos_contrato
 *   FOR ALL USING (true) WITH CHECK (true);
 *
 * -- Block 3: FK documento_id em dividas
 * ALTER TABLE public.dividas
 *   ADD COLUMN IF NOT EXISTS documento_id UUID REFERENCES public.documentos_contrato(id);
 */

import { dbGet, dbInsert, dbUpdate, dbDelete, sb } from "../config/supabase.js";
import { atualizarDivida } from "./dividas.js";

const TABLE = "contratos_dividas";
const HIST_TABLE = "contratos_historico";
const PAG_TABLE = "pagamentos_contrato";

// ─── Phase 7.9 — Custas Judiciais helpers ───────────────────────────────
// D-22 data pattern (YYYY-MM-DD, fuso Goiânia — reusa D-09 da 7.8.2a).
function hojeGoianiaDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

// Q5 — UUID client-side com fallback pra ambientes sem crypto.randomUUID.
function gerarCustaId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {}
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function listarContratos() {
  return dbGet(TABLE, "order=created_at.desc");
}

export function buscarContrato(contratoId) {
  return dbGet(TABLE, `id=eq.${encodeURIComponent(contratoId)}&limit=1`);
}

/**
 * Registra um evento em contratos_historico.
 * HIS-02: snapshot_campos format depends on tipo_evento:
 *   criacao: flat object { credor_id, devedor_id, referencia, indice_correcao, ... }
 *   outros tipos: diff object { campo: { antes: String, depois: String } } — only changed fields
 * usuario_id is filled by Supabase DEFAULT auth.uid() — do NOT pass it explicitly.
 */
export async function registrarEvento(contratoId, tipoEvento, snapshotCampos) {
  return dbInsert(HIST_TABLE, {
    contrato_id:     contratoId,
    tipo_evento:     tipoEvento,
    snapshot_campos: snapshotCampos,
  });
}

export async function criarContrato(payload) {
  const res = await dbInsert(TABLE, payload);
  const contrato = Array.isArray(res) ? res[0] : res;
  if (contrato?.id) {
    // HIS-01: fire-and-forget — do not block or fail contract creation if history insert fails
    registrarEvento(contrato.id, "criacao", {
      credor_id:             contrato.credor_id             ?? null,
      devedor_id:            contrato.devedor_id            ?? null,
      referencia:            contrato.referencia            ?? null,
      indice_correcao:       contrato.indice_correcao       ?? null,
      multa_percentual:      contrato.multa_percentual      ?? null,
      juros_tipo:            contrato.juros_tipo            ?? null,
      juros_am_percentual:   contrato.juros_am_percentual   ?? null,
      honorarios_percentual: contrato.honorarios_percentual ?? null,
      despesas:              contrato.despesas              ?? null,
      art523_opcao:          contrato.art523_opcao          ?? null,
    }).catch(() => {}); // non-blocking — swallow silently
  }
  return res;
}

export function listarDocumentosPorContrato(contratoId) {
  return dbGet("documentos_contrato", `contrato_id=eq.${encodeURIComponent(contratoId)}&order=created_at.asc`);
}

/**
 * Edita os campos header/encargos de um contrato.
 * EDT-04: encargos funciona como template — não retroage em parcelas já geradas.
 */
export async function editarContrato(contratoId, payload) {
  return dbUpdate(TABLE, contratoId, payload);
}

/**
 * Propaga credor_id e/ou devedor_id para todas as parcelas (dividas) do contrato.
 * EDT-03: inclui parcelas com saldo_quitado = true.
 * documentos_contrato não tem credor_id/devedor_id — são colunas de nível 1 e 3 apenas.
 */
export async function cascatearCredorDevedor(contratoId, { credor_id, devedor_id }) {
  const updatePatch = {};
  if (credor_id  !== undefined) updatePatch.credor_id  = credor_id;
  if (devedor_id !== undefined) updatePatch.devedor_id = devedor_id;
  if (!Object.keys(updatePatch).length) return;

  // Atualiza dividas diretamente por contrato_id — sem passar por documentos_contrato
  const parcelas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}`);
  const parcelasArr = Array.isArray(parcelas) ? parcelas : [];
  for (const p of parcelasArr) {
    await dbUpdate("dividas", p.id, updatePatch);
  }
}

/**
 * Retorna eventos de contratos_historico para um contrato, ordenados do mais recente.
 * INT-05: lazy-loaded on first open of Histórico section in DetalheContrato.
 */
export async function listarHistorico(contratoId) {
  return dbGet(HIST_TABLE, `contrato_id=eq.${encodeURIComponent(contratoId)}&order=created_at.desc`);
}

/**
 * Gera array de payloads para inserção em `dividas` a partir de um Documento.
 * Função pura — sem chamadas ao banco.
 */
export function gerarPayloadParcelasDocumento(documento, contrato) {
  const {
    num_parcelas,
    valor,
    data_emissao,
    primeira_parcela_na_data_base,
    numero_doc,
    tipo,
    indice_correcao,
    juros_tipo,
    juros_am_percentual,
    multa_percentual,
    honorarios_percentual,
    despesas,
    art523_opcao,
    data_inicio_atualizacao,
  } = documento;

  const valorBase = Math.floor((valor / num_parcelas) * 100) / 100;
  const parcelas = [];

  for (let i = 0; i < num_parcelas; i++) {
    const n = i + 1;
    const valor_parcela =
      n < num_parcelas
        ? valorBase
        : parseFloat((valor - valorBase * (num_parcelas - 1)).toFixed(2));

    const d = new Date(data_emissao + "T12:00:00");
    const offset = primeira_parcela_na_data_base ? i : i + 1;
    d.setMonth(d.getMonth() + offset);
    const data_vencimento = d.toISOString().slice(0, 10);

    const prefix = numero_doc ? numero_doc : tipo;

    parcelas.push({
      devedor_id: contrato.devedor_id,
      credor_id: contrato.credor_id || null,
      contrato_id: contrato.id,
      documento_id: documento.id,
      observacoes: `${prefix} — Parcela ${n}/${num_parcelas}`,
      valor_total: valor_parcela,
      data_vencimento,
      data_origem: data_emissao,
      data_inicio_atualizacao: data_inicio_atualizacao || data_vencimento,
      status: "em cobrança",
      indice_correcao:       indice_correcao      ?? "igpm",
      juros_tipo:            juros_tipo            ?? "fixo_1",
      juros_am_percentual:   juros_am_percentual   ?? 0,
      multa_percentual:      multa_percentual       ?? 0,
      honorarios_percentual: honorarios_percentual ?? 0,
      despesas:              despesas              ?? 0,
      art523_opcao:          art523_opcao          ?? "nao_aplicar",
      parcelas: [],
      custas: [],
    });
  }

  return parcelas;
}

export async function recalcularTotaisContrato(contratoId) {
  const docs = await listarDocumentosPorContrato(contratoId);
  const arr = Array.isArray(docs) ? docs : [];
  const valor_total = parseFloat(arr.reduce((s, d) => s + parseFloat(d.valor || 0), 0).toFixed(2));
  const num_documentos = arr.length;
  const num_parcelas_total = arr.reduce((s, d) => s + (d.num_parcelas || 0), 0);
  return dbUpdate(TABLE, contratoId, { valor_total, num_documentos, num_parcelas_total });
}

/**
 * Adiciona um Documento a um Contrato e gera N parcelas como dívidas reais.
 * Operação atômica: doc insert → parcelas loop → recalcular totais do contrato.
 *
 * Phase 7.5 (D-03): 4º param opcional `parcelasCustom` permite fluxo de criação
 * com datas/valores customizados. Shape: Array<{ numero, valor_total, data_vencimento }>.
 * Se ausente, mantém comportamento legado via gerarPayloadParcelasDocumento (retrocompat).
 * Se presente, gera as N parcelas usando diretamente `parcelasCustom`, mas ainda injeta
 * os campos contábeis herdados do documento+contrato (devedor_id, credor_id, contrato_id,
 * documento_id, observacoes, indice_correcao, juros_*, multa_*, honorarios_*, despesas,
 * art523_opcao, data_inicio_atualizacao, status, data_origem, parcelas:[], custas:[]).
 */
export async function adicionarDocumento(contratoId, documentoPayload, contrato, parcelasCustom) {
  const docRes = await dbInsert("documentos_contrato", { ...documentoPayload, contrato_id: contratoId });
  const documento = Array.isArray(docRes) ? docRes[0] : docRes;
  if (!documento?.id) throw new Error("Supabase não retornou row do documento");

  let parcelasPayload;
  if (Array.isArray(parcelasCustom) && parcelasCustom.length > 0) {
    // Phase 7.5 — bypass gerarPayloadParcelasDocumento; herda campos contábeis do documento+contrato.
    const prefix = documento.numero_doc ? documento.numero_doc : documento.tipo;
    const N = parcelasCustom.length;
    parcelasPayload = parcelasCustom.map((pc, i) => {
      const n = (pc.numero != null ? pc.numero : i + 1);
      return {
        devedor_id: contrato.devedor_id,
        credor_id: contrato.credor_id || null,
        contrato_id: contrato.id,
        documento_id: documento.id,
        observacoes: `${prefix} — Parcela ${n}/${N}`,
        valor_total: Number(pc.valor_total),
        data_vencimento: pc.data_vencimento,
        data_origem: documento.data_emissao,
        data_inicio_atualizacao: documento.data_inicio_atualizacao || pc.data_vencimento,
        status: "em cobrança",
        indice_correcao:       documento.indice_correcao       ?? "igpm",
        juros_tipo:            documento.juros_tipo            ?? "fixo_1",
        juros_am_percentual:   documento.juros_am_percentual   ?? 0,
        multa_percentual:      documento.multa_percentual      ?? 0,
        honorarios_percentual: documento.honorarios_percentual ?? 0,
        despesas:              documento.despesas              ?? 0,
        art523_opcao:          documento.art523_opcao          ?? "nao_aplicar",
        parcelas: [],
        custas: [],
      };
    });
  } else {
    parcelasPayload = gerarPayloadParcelasDocumento(documento, contrato);
  }

  const rows = [];
  for (const p of parcelasPayload) {
    const r = await dbInsert("dividas", p);
    rows.push(Array.isArray(r) ? r[0] : r);
  }
  await recalcularTotaisContrato(contratoId);
  return { documento, parcelas: rows };
}

// ─── PAGAMENTOS POR CONTRATO (Phase 7) ───────────────────────────────────────

export async function registrarPagamentoContrato(contratoId, { data_pagamento, valor, observacao }) {
  return sb("rpc/registrar_pagamento_contrato", "POST", {
    p_contrato_id:    contratoId,
    p_data_pagamento: data_pagamento,
    p_valor:          valor,
    p_observacao:     observacao ?? null,
  });
}

export async function excluirPagamentoContrato(pagamentoId) {
  return sb("rpc/reverter_pagamento_contrato", "POST", {
    p_pagamento_id: pagamentoId,
  });
}

export async function listarPagamentosContrato(contratoId) {
  return dbGet(PAG_TABLE, `contrato_id=eq.${encodeURIComponent(contratoId)}&order=data_pagamento.asc`);
}

// ─── EXCLUIR CONTRATO (Phase 7.2) ────────────────────────────────────────────

/**
 * Exclui um contrato com hard delete em cascata manual.
 *
 * Pré-checagem (D-02):
 *  - rejeita se existir alguma linha em pagamentos_contrato (contrato_id = :id)
 *  - rejeita se existir alguma linha em pagamentos_divida (divida_id IN (parcelas do contrato))
 *
 * Sequência dos DELETEs (D-01, ordem obrigatória por causa de FKs sem CASCADE):
 *  1. DELETE FROM dividas WHERE contrato_id = :id
 *  2. DELETE FROM documentos_contrato WHERE contrato_id = :id
 *  3. DELETE FROM contratos_dividas WHERE id = :id
 *     → contratos_historico e pagamentos_contrato caem via CASCADE (mas a pré-checagem garante
 *       que pagamentos_contrato já estava vazio)
 *
 * D-04: sem stored procedure. Se cair entre passos, estado é reexecutável.
 *
 * @param {string} contratoId  UUID do contrato
 * @returns {Promise<{ ok: true } | { ok: false, motivo: string }>}
 */
export async function excluirContrato(contratoId) {
  // Pré-check 1: pagamentos no nível do contrato
  const pagsContrato = await dbGet(
    "pagamentos_contrato",
    `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id&limit=1`
  );
  if (Array.isArray(pagsContrato) && pagsContrato.length > 0) {
    return {
      ok: false,
      motivo: "Este contrato possui pagamentos registrados — não pode ser excluído. Exclua os pagamentos primeiro."
    };
  }

  // Pré-check 2: pagamentos no nível das parcelas (pagamentos_divida)
  const parcelas = await dbGet(
    "dividas",
    `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`
  );
  const parcelaIds = Array.isArray(parcelas) ? parcelas.map(p => p.id) : [];
  if (parcelaIds.length > 0) {
    const inList = parcelaIds.map(encodeURIComponent).join(",");
    const pagsDivida = await dbGet(
      "pagamentos_divida",
      `divida_id=in.(${inList})&select=id&limit=1`
    );
    if (Array.isArray(pagsDivida) && pagsDivida.length > 0) {
      return {
        ok: false,
        motivo: "Este contrato possui pagamentos registrados — não pode ser excluído. Exclua os pagamentos primeiro."
      };
    }
  }

  // Cascata manual (D-01)
  // Passo 1: dividas (parcelas) — retorna [] se o contrato é header-only
  await sb("dividas", "DELETE", null, `?contrato_id=eq.${encodeURIComponent(contratoId)}`);
  // Passo 2: documentos_contrato — retorna [] se o contrato é header-only
  await sb("documentos_contrato", "DELETE", null, `?contrato_id=eq.${encodeURIComponent(contratoId)}`);
  // Passo 3: o contrato em si — contratos_historico + pagamentos_contrato caem via CASCADE
  await dbDelete(TABLE, contratoId);

  return { ok: true };
}

// ─── EXCLUIR DOCUMENTO INDIVIDUAL (Phase 7.7) ────────────────────────────────

/**
 * Exclui UM documento de um contrato com hard delete em cascata manual.
 *
 * Phase 7.7 — espelho estrutural de excluirContrato (Phase 7.2, linhas 329-371
 * deste arquivo) com 2 diferenças (D-02):
 *   1. Filtro: documento_id=eq.* em vez de contrato_id=eq.* nos DELETEs.
 *   2. Pós-delete OBRIGATÓRIO: recalcularTotaisContrato(contratoId) (D-05) —
 *      senão contrato.valor_total, num_documentos, num_parcelas_total ficam
 *      stale (mesmo helper que adicionarDocumento:283 usa).
 *
 * Pré-checagem (D-03, D-06):
 *  - rejeita se existir alguma linha em pagamentos_divida apontando pra
 *    qualquer parcela (divida_id) do documento.
 *  - pagamentos_contrato NÃO é checado separadamente — SP-generated
 *    amortizations via registrar_pagamento_contrato já escrevem em
 *    pagamentos_divida, capturadas pelo pre-check único (D-06).
 *
 * Sequência dos DELETEs (D-04, ordem obrigatória por FK dividas.documento_id
 * sem CASCADE):
 *  1. DELETE FROM dividas WHERE documento_id = :id
 *     → pagamentos_divida + devedores_dividas caem via CASCADE.
 *  2. DELETE FROM documentos_contrato WHERE id = :id
 *  3. recalcularTotaisContrato(contratoId) (D-05)
 *
 * Contrato vazio (num_documentos=0) pós-delete do último doc é estado válido
 * (D-08) — sem tratamento especial.
 *
 * Sem try/catch interno: exceções técnicas (rede/RLS) propagam pro caller
 * (padrão de excluirContrato).
 *
 * @param {string} documentoId  UUID do documento (documentos_contrato.id)
 * @returns {Promise<{ ok: true } | { ok: false, motivo: string }>}
 */
export async function excluirDocumento(documentoId) {
  // Lookup do contrato_id (necessário no final pra recalcularTotaisContrato).
  // Também valida que o documento existe — se não existe, retornamos ok:false
  // em vez de propagar erro opaco de banco.
  const docs = await dbGet(
    "documentos_contrato",
    `id=eq.${encodeURIComponent(documentoId)}&select=id,contrato_id&limit=1`
  );
  if (!Array.isArray(docs) || docs.length === 0) {
    return { ok: false, motivo: "Documento não encontrado." };
  }
  const contratoId = docs[0].contrato_id;

  // Pre-check (D-03, D-06): pagamentos_divida apontando pra qualquer parcela do doc.
  // Passo 1: listar parcelas (dividas) do documento.
  const parcelas = await dbGet(
    "dividas",
    `documento_id=eq.${encodeURIComponent(documentoId)}&select=id`
  );
  const parcelaIds = Array.isArray(parcelas) ? parcelas.map(p => p.id) : [];
  if (parcelaIds.length > 0) {
    const inList = parcelaIds.map(encodeURIComponent).join(",");
    const pagsDivida = await dbGet(
      "pagamentos_divida",
      `divida_id=in.(${inList})&select=id&limit=1`
    );
    if (Array.isArray(pagsDivida) && pagsDivida.length > 0) {
      return {
        ok: false,
        motivo: "Este documento possui pagamentos registrados — não pode ser excluído. Exclua os pagamentos primeiro."
      };
    }
  }

  // Cascata manual (D-04) — ordem OBRIGATÓRIA:
  // Passo 1: dividas WHERE documento_id — pagamentos_divida + devedores_dividas caem via CASCADE.
  await sb("dividas", "DELETE", null, `?documento_id=eq.${encodeURIComponent(documentoId)}`);
  // Passo 2: o documento em si.
  await dbDelete("documentos_contrato", documentoId);

  // Pós-delete OBRIGATÓRIO (D-05): recalcula totais do contrato pai.
  // Sem isso, contrato.valor_total / num_documentos / num_parcelas_total ficam stale.
  await recalcularTotaisContrato(contratoId);

  return { ok: true };
}

// ─── TOTAIS NOMINAIS DO CONTRATO (Phase 7.3) ─────────────────────────────────

/**
 * Calcula totais NOMINAIS de um contrato (Phase 7.3, D-03).
 *
 * NÃO reflete juros/correção/multa Art.354 — é "status do acordo" (pago vs em aberto),
 * não "saldo devedor atualizado para execução". O cálculo Art.354 vive em
 * `services/pagamentos.js::calcularSaldoPorDividaIndividual` (motor intocável, D-01)
 * e é usado em DetalheDivida por parcela.
 *
 * Fonte de verdade (D-02): `pagamentos_divida.valor`. Essa tabela é alimentada por
 * DOIS caminhos — SP `registrar_pagamento_contrato` (Phase 7) e `criarPagamento`
 * manual (Phase 4). Somar `pagamentos_divida` cobre ambos, inclusive pagamentos
 * parciais que NÃO quitam a parcela (saldo_quitado = false mas valor pago > 0).
 *
 * Função PURA: sem fetch, sem setState. Dados já em memória via prop `allPagamentos`.
 *
 * @param {Array} dividasDoContrato  Parcelas (dividas) do contrato. Deve já estar filtrada por contrato_id.
 * @param {Array} allPagamentos      TODOS os pagamentos_divida globais (App.jsx state). Função filtra por divida_id dentro.
 * @returns {{ valor_total: number, total_pago: number, saldo_restante: number, quitado_total: boolean }}
 */
export function calcularTotaisContratoNominal(dividasDoContrato, allPagamentos) {
  const valor_total = dividasDoContrato.reduce((s, d) => s + Number(d.valor_total || 0), 0);
  const total_pago_raw = dividasDoContrato.reduce((s, d) => {
    const pagsDaParcela = (allPagamentos || []).filter(p => String(p.divida_id) === String(d.id));
    return s + pagsDaParcela.reduce((ss, p) => ss + Number(p.valor || 0), 0);
  }, 0);
  const total_pago = Math.round(total_pago_raw * 100) / 100;
  const saldo_restante = Math.max(0, Math.round((valor_total - total_pago) * 100) / 100);
  const quitado_total = saldo_restante <= 0.005;
  return { valor_total, total_pago, saldo_restante, quitado_total };
}

// ─── ATUALIZAR PARCELAS CUSTOM (Phase 7.5) ───────────────────────────────────

/**
 * Atualiza parcelas de um documento com valores e datas customizadas (Phase 7.5).
 *
 * Validações server-side (D-07):
 *   (a) todas as parcelas têm `data_vencimento` preenchida
 *   (b) soma de `valor_total` === soma esperada (calculada do próprio array — `documentoValor`
 *       é recomputado como Σ parcelas.valor_total; a validação contra documentos_contrato.valor
 *       é feita client-side ANTES do submit, D-08)
 *   (c) datas em ordem não-decrescente quando ordenadas por `numero`
 *
 * NÃO valida readonly de parcelas pagas (D-06): o cliente bloqueia edição via
 * `dividasComPagamentoIds`; o service só patcha o que recebe. Se cliente for bypassado
 * (dev tools), risco aceitável pro caso single-tenant atual (deferred — §deferred).
 *
 * Atomicidade (D-10): N PATCHes sequenciais via `atualizarDivida`. Se falhar no meio,
 * estado é reexecutável — advogado clica Salvar de novo. Mesmo trade-off Phase 7.2 D-04.
 *
 * @param {string} documentoId           UUID do documento (usado apenas para log/audit; não consultado)
 * @param {Array}  parcelasEditadas      [{ id, numero, valor_total, data_vencimento }, ...] — snapshot pós-edit client
 * @returns {Promise<{ ok: true, updated: number } | { ok: false, motivo: string }>}
 */
export async function atualizarParcelasCustom(documentoId, parcelasEditadas) {
  if (!Array.isArray(parcelasEditadas) || parcelasEditadas.length === 0) {
    return { ok: false, motivo: "Nenhuma parcela recebida para atualização." };
  }

  // Validação (a): todas as datas preenchidas + IDs presentes
  for (const p of parcelasEditadas) {
    if (!p.data_vencimento) {
      return { ok: false, motivo: "Todas as parcelas devem ter data de vencimento preenchida." };
    }
    if (!p.id) {
      return { ok: false, motivo: "Parcela sem ID — edição requer parcelas existentes." };
    }
  }

  // Validação (c): ordem não-decrescente quando ordenadas por `numero`
  const ordenadas = [...parcelasEditadas].sort((a, b) => (a.numero || 0) - (b.numero || 0));
  for (let i = 1; i < ordenadas.length; i++) {
    if (ordenadas[i].data_vencimento < ordenadas[i - 1].data_vencimento) {
      return {
        ok: false,
        motivo: `Datas devem estar em ordem crescente (parcela ${ordenadas[i - 1].numero} vence depois da ${ordenadas[i].numero}).`
      };
    }
  }

  // PATCHes sequenciais
  let updated = 0;
  for (const p of parcelasEditadas) {
    await atualizarDivida(p.id, {
      valor_total: Number(p.valor_total),
      data_vencimento: p.data_vencimento,
    });
    updated++;
  }

  return { ok: true, updated };
}

// ─── Phase 7.9 — CRUD de Custas Judiciais (avulsas only) ───────────────
// D-01 invariante: motor Art.354 (devedorCalc.js + pagamentos.js + dividas.js) NÃO é tocado.
// D-22 integral only: toggle `pago` (sem tabela pagamentos_custa).
// D-23 simplificada: SEMPRE cria custa avulsa (dívida-fantasma _so_custas:true).
//                    ZERO dropdown de vínculo, ZERO escolha de documento — Q1 RECONSIDERED 2026-04-25.

/**
 * Cria uma custa judicial avulsa.
 * SEMPRE cria nova dívida-fantasma (`_so_custas:true`) com `custas:[novaCusta]`.
 * @param {string|number} contratoId — ID do contrato pai
 * @param {object} payload — { descricao, valor, data, pago?, data_pagamento? } (NO divida_id — sempre avulsa)
 * @returns {Promise<{ dividaId: string, custaId: string }>}
 */
export async function criarCusta(contratoId, payload) {
  // FK propagation: dividas.devedor_id é NOT NULL (schema 002_dividas_tabela.sql:18).
  // Reusa helper buscarContrato (L91-93) — TABLE = "contratos_dividas".
  const contratoRows = await buscarContrato(contratoId);
  const contrato = Array.isArray(contratoRows) ? contratoRows[0] : null;
  if (!contrato) throw new Error("contrato não encontrado");

  const dataCusta = payload?.data || "";
  const custaItem = {
    id:             payload?.id || gerarCustaId(),
    descricao:      String(payload?.descricao || "").trim(),
    valor:          Number(payload?.valor || 0),
    data:           dataCusta,                            // shape D-22 — motor lê c.data legacy (D-01 strict)
    pago:           !!payload?.pago,
    data_pagamento: payload?.pago ? (payload?.data_pagamento || hojeGoianiaDate()) : null,
  };

  // SEMPRE cria nova dívida-fantasma (`_so_custas:true`).
  const novaDivida = await dbInsert("dividas", {
    contrato_id:     contratoId,
    devedor_id:      contrato.devedor_id,                 // FK NOT NULL — herda do contrato
    credor_id:       contrato.credor_id || null,          // parity com adicionarDocumento pattern
    _so_custas:      true,
    custas:          [custaItem],
    valor_total:     0,
    data_origem:     dataCusta || hojeGoianiaDate(),
    data_vencimento: dataCusta || hojeGoianiaDate(),
  });
  const dividaRow = Array.isArray(novaDivida) ? novaDivida[0] : novaDivida;
  return { dividaId: String(dividaRow?.id || ""), custaId: custaItem.id };
}

/**
 * Edita uma custa existente (aplica patch sobre o item matched por custaId).
 * @param {string|number} contratoId — não usado em path (contexto / futura auditoria)
 * @param {string} dividaId — UUID da dívida-fantasma que contém a custa (caller passa c.divida_id da lista do contrato)
 * @param {string} custaId — id da custa dentro do array JSONB
 * @param {object} patch — campos a atualizar (ex: { descricao, valor, data })
 * @returns {Promise<void>}
 * @throws {Error} se custa não encontrada
 */
export async function editarCusta(contratoId, dividaId, custaId, patch) {
  // Lê divida via dbGet (sem cross-contract validation — Q1 RECONSIDERED 2026-04-25).
  // dbGet(table, queryString) — query no formato PostgREST (não objeto).
  const dividaRows = await dbGet("dividas", `id=eq.${encodeURIComponent(dividaId)}&limit=1`);
  const divida = Array.isArray(dividaRows) ? dividaRows[0] : null;
  if (!divida) throw new Error("divida não encontrada");
  const custasAtuais = Array.isArray(divida.custas) ? divida.custas : [];
  const idx = custasAtuais.findIndex(c => String(c.id) === String(custaId));
  if (idx < 0) throw new Error("custa não encontrada");

  const original = custasAtuais[idx];
  const merged = { ...original, ...patch };
  const novasCustas = [...custasAtuais];
  novasCustas[idx] = merged;
  await atualizarDivida(dividaId, { custas: novasCustas });
}

/**
 * Exclui uma custa do array JSONB. Se ficar vazio E divida._so_custas === true,
 * mantém a dívida vazia (Q2 conservative — evita cascade de effects não auditados).
 */
export async function excluirCusta(contratoId, dividaId, custaId) {
  const dividaRows = await dbGet("dividas", `id=eq.${encodeURIComponent(dividaId)}&limit=1`);
  const divida = Array.isArray(dividaRows) ? dividaRows[0] : null;
  if (!divida) throw new Error("divida não encontrada");
  const custasAtuais = Array.isArray(divida.custas) ? divida.custas : [];
  const novasCustas = custasAtuais.filter(c => String(c.id) !== String(custaId));
  await atualizarDivida(dividaId, { custas: novasCustas });
  // Q2 — dívida avulsa vazia é preservada conservativamente (comment locked).
}

/**
 * Flip `pago` boolean da custa. Se `pago: true` → seta data_pagamento para hoje (Goiânia DATE);
 * se `pago: false` → seta data_pagamento: null.
 */
export async function togglePagoCusta(contratoId, dividaId, custaId) {
  const dividaRows = await dbGet("dividas", `id=eq.${encodeURIComponent(dividaId)}&limit=1`);
  const divida = Array.isArray(dividaRows) ? dividaRows[0] : null;
  if (!divida) throw new Error("divida não encontrada");
  const custasAtuais = Array.isArray(divida.custas) ? divida.custas : [];
  const idx = custasAtuais.findIndex(c => String(c.id) === String(custaId));
  if (idx < 0) throw new Error("custa não encontrada");

  const original = custasAtuais[idx];
  const novoPago = !original.pago;
  const merged = {
    ...original,
    pago: novoPago,
    data_pagamento: novoPago ? hojeGoianiaDate() : null,
  };
  const novasCustas = [...custasAtuais];
  novasCustas[idx] = merged;
  await atualizarDivida(dividaId, { custas: novasCustas });
}
