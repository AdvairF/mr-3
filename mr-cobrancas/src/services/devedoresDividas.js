import { sb } from "../config/supabase.js";

const TABLE = "devedores_dividas";

export async function listarParticipantes(dividaId) {
  return sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&select=*&order=created_at.asc`
  );
}

export async function listarDividasCoobrigado(devedorId) {
  return sb(
    `${TABLE}?devedor_id=eq.${devedorId}&papel=neq.PRINCIPAL&select=divida_id,papel,responsabilidade&order=created_at.asc`
  );
}

export async function listarDividasPrincipal(devedorId) {
  return sb(`${TABLE}?devedor_id=eq.${devedorId}&papel=eq.PRINCIPAL&select=divida_id`);
}

export async function adicionarParticipante({ devedorId, dividaId, papel, responsabilidade, observacao = "" }) {
  if (papel === "PRINCIPAL") {
    await demoverPrincipalAtual(dividaId);
  }
  return sb(TABLE, "POST", {
    devedor_id: devedorId,
    divida_id: String(dividaId),
    papel,
    responsabilidade,
    observacao,
  });
}

export async function alterarPapel(rowId, novoPapel, dividaId) {
  if (novoPapel === "PRINCIPAL") {
    await demoverPrincipalAtual(dividaId, rowId);
  }
  return sb(`${TABLE}?id=eq.${rowId}`, "PATCH", {
    papel: novoPapel,
    updated_at: new Date().toISOString(),
  });
}

export async function removerParticipante(rowId) {
  return sb(`${TABLE}?id=eq.${rowId}`, "DELETE");
}

export async function seedPrincipal(devedorId, dividaId) {
  const existing = await sb(
    `${TABLE}?devedor_id=eq.${devedorId}&divida_id=eq.${encodeURIComponent(dividaId)}&select=id&limit=1`
  );
  if (Array.isArray(existing) && existing.length > 0) return existing[0];

  const principalExistente = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&papel=eq.PRINCIPAL&select=id&limit=1`
  );
  const papel =
    Array.isArray(principalExistente) && principalExistente.length > 0
      ? "COOBRIGADO"
      : "PRINCIPAL";

  return sb(TABLE, "POST", {
    devedor_id: devedorId,
    divida_id: String(dividaId),
    papel,
    responsabilidade: "SOLIDARIA",
    observacao: "",
  });
}

async function demoverPrincipalAtual(dividaId, exceptRowId = null) {
  const rows = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&papel=eq.PRINCIPAL&select=id`
  );
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (exceptRowId && String(row.id) === String(exceptRowId)) continue;
    await sb(`${TABLE}?id=eq.${row.id}`, "PATCH", {
      papel: "COOBRIGADO",
      updated_at: new Date().toISOString(),
    });
  }
}

// ─── PHASE 7.13 — HELPERS CONTRATO-LEVEL (D-pre-10, D-pre-11, D-pre-13) ───

/**
 * Lista devedores DISTINCT de um contrato com seu papel.
 * Query: SELECT DISTINCT ON (devedor_id) devedor_id, papel, responsabilidade
 *        FROM devedores_dividas WHERE divida_id IN (dividas do contrato)
 * Implementação: 1 query em devedores_dividas filtrando por divida_id IN (...) +
 *                consolidação DISTINCT client-side por devedor_id (papel deve ser
 *                consistente entre as N dívidas do contrato — invariante D-pre-1).
 */
export async function listarDevedoresDoContrato(contratoId) {
  const { dbGet } = await import("../config/supabase.js");
  const dividas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`);
  const dividaIds = (Array.isArray(dividas) ? dividas : []).map(d => d.id);
  if (dividaIds.length === 0) return [];
  const inList = dividaIds.map(encodeURIComponent).join(",");
  const rows = await sb(
    `${TABLE}?divida_id=in.(${inList})&select=devedor_id,papel,responsabilidade`
  );
  const seen = new Map();
  (Array.isArray(rows) ? rows : []).forEach(r => {
    const key = String(r.devedor_id);
    if (!seen.has(key)) seen.set(key, { devedor_id: r.devedor_id, papel: r.papel, responsabilidade: r.responsabilidade });
  });
  return Array.from(seen.values());
}

/**
 * Vincula devedor X com papel Y a TODAS as dívidas do contrato (D-pre-10 fan-out N inserts).
 * Bloqueio (D-pre-13): se papel='PRINCIPAL' e contrato JÁ TEM outro PRINCIPAL → throw "USE_WIZARD_PROMOCAO".
 * UI deve invocar promoverParaPrincipalComDemocao no lugar.
 */
export async function criarVinculoContratoDevedor(contratoId, devedorId, papel, responsabilidade = 'SOLIDARIA') {
  const { dbGet } = await import("../config/supabase.js");
  const dividas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`);
  const dividasArr = Array.isArray(dividas) ? dividas : [];
  if (papel === 'PRINCIPAL' && dividasArr.length > 0) {
    const existingPrincipal = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(dividasArr[0].id)}&papel=eq.PRINCIPAL&select=devedor_id&limit=1`
    );
    if (Array.isArray(existingPrincipal) && existingPrincipal.length > 0
        && String(existingPrincipal[0].devedor_id) !== String(devedorId)) {
      throw new Error("USE_WIZARD_PROMOCAO");
    }
  }
  const results = [];
  for (const d of dividasArr) {
    const r = await sb(TABLE, "POST", {
      devedor_id: devedorId,
      divida_id: String(d.id),
      papel,
      responsabilidade,
      observacao: "",
    });
    results.push(r);
  }
  return results;
}

/**
 * Remove vínculo de devedor X de TODAS as dívidas do contrato (D-pre-10 fan-out N deletes).
 * Bloqueio (D-pre-12): se devedorId é o ÚNICO PRINCIPAL → throw "LAST_PRINCIPAL_BLOCKED".
 * UI deve exibir Modal warning (D-05 LOCKED, sem window.confirm).
 */
export async function removerVinculoContratoDevedor(contratoId, devedorId) {
  const { dbGet } = await import("../config/supabase.js");
  const dividas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`);
  const dividasArr = Array.isArray(dividas) ? dividas : [];
  if (dividasArr.length === 0) return [];
  // Check: devedor é PRINCIPAL? Se sim, é o único?
  const minhasRows = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividasArr[0].id)}&devedor_id=eq.${devedorId}&select=papel&limit=1`
  );
  const ehPrincipal = Array.isArray(minhasRows) && minhasRows.length > 0 && minhasRows[0].papel === 'PRINCIPAL';
  if (ehPrincipal) {
    const principaisCount = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(dividasArr[0].id)}&papel=eq.PRINCIPAL&select=devedor_id`
    );
    if (Array.isArray(principaisCount) && principaisCount.length === 1) {
      throw new Error("LAST_PRINCIPAL_BLOCKED");
    }
  }
  const results = [];
  for (const d of dividasArr) {
    const r = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(d.id)}&devedor_id=eq.${devedorId}`,
      "DELETE"
    );
    results.push(r);
  }
  return results;
}

/**
 * Altera papel de devedor X em TODAS as dívidas do contrato (D-pre-10 fan-out N PATCHes).
 * Bloqueio (D-pre-13): se novoPapel='PRINCIPAL' e contrato JÁ TEM outro PRINCIPAL → throw "USE_WIZARD_PROMOCAO".
 * UI deve invocar promoverParaPrincipalComDemocao no lugar.
 */
export async function alterarPapelContratoDevedor(contratoId, devedorId, novoPapel) {
  const { dbGet } = await import("../config/supabase.js");
  const dividas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`);
  const dividasArr = Array.isArray(dividas) ? dividas : [];
  if (novoPapel === 'PRINCIPAL' && dividasArr.length > 0) {
    const existingPrincipal = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(dividasArr[0].id)}&papel=eq.PRINCIPAL&select=devedor_id&limit=1`
    );
    if (Array.isArray(existingPrincipal) && existingPrincipal.length > 0
        && String(existingPrincipal[0].devedor_id) !== String(devedorId)) {
      throw new Error("USE_WIZARD_PROMOCAO");
    }
  }
  const results = [];
  for (const d of dividasArr) {
    const r = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(d.id)}&devedor_id=eq.${devedorId}`,
      "PATCH",
      { papel: novoPapel, updated_at: new Date().toISOString() }
    );
    results.push(r);
  }
  return results;
}

/**
 * WIZARD D-pre-13: promove novoDevedor a PRINCIPAL e demove o anterior ao papel escolhido pelo usuário.
 * 2N PATCHes pareados — N pra promover, N pra demover. Atomicidade reexecutável (padrão 7.2 D-04).
 *
 * @param contratoId UUID do contrato
 * @param novoDevedorId BIGINT id do devedor que será PRINCIPAL
 * @param novoPapelDoAnterior 'COOBRIGADO'|'AVALISTA'|'FIADOR'|'CONJUGE'|'OUTRO' (5 opções, NÃO 'PRINCIPAL')
 */
export async function promoverParaPrincipalComDemocao(contratoId, novoDevedorId, novoPapelDoAnterior) {
  const VALID_PAPEIS = new Set(['COOBRIGADO', 'AVALISTA', 'FIADOR', 'CONJUGE', 'OUTRO']);
  if (!VALID_PAPEIS.has(novoPapelDoAnterior)) {
    throw new Error(`Papel inválido para anterior: ${novoPapelDoAnterior}. Esperado: ${[...VALID_PAPEIS].join(', ')}.`);
  }
  const { dbGet } = await import("../config/supabase.js");
  const dividas = await dbGet("dividas", `contrato_id=eq.${encodeURIComponent(contratoId)}&select=id`);
  const dividasArr = Array.isArray(dividas) ? dividas : [];
  if (dividasArr.length === 0) return { promovido: [], demovido: [] };

  // Identifica PRINCIPAL atual (1 por dívida; D-pre-1 garante consistência cross-dívidas)
  const principalRow = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividasArr[0].id)}&papel=eq.PRINCIPAL&select=devedor_id&limit=1`
  );
  const anteriorDevedorId = (Array.isArray(principalRow) && principalRow.length > 0)
    ? principalRow[0].devedor_id
    : null;
  if (anteriorDevedorId === null) {
    throw new Error("NO_PRINCIPAL_TO_DEMOTE");
  }
  if (String(anteriorDevedorId) === String(novoDevedorId)) {
    return { promovido: [], demovido: [] };  // no-op
  }

  // Demove anterior PRIMEIRO (libera UNIQUE INDEX papel='PRINCIPAL') — N PATCHes
  const demovido = [];
  for (const d of dividasArr) {
    const r = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(d.id)}&devedor_id=eq.${anteriorDevedorId}`,
      "PATCH",
      { papel: novoPapelDoAnterior, updated_at: new Date().toISOString() }
    );
    demovido.push(r);
  }
  // Promove novo — N PATCHes
  const promovido = [];
  for (const d of dividasArr) {
    const r = await sb(
      `${TABLE}?divida_id=eq.${encodeURIComponent(d.id)}&devedor_id=eq.${novoDevedorId}`,
      "PATCH",
      { papel: 'PRINCIPAL', updated_at: new Date().toISOString() }
    );
    promovido.push(r);
  }
  return { promovido, demovido, anteriorDevedorId };
}

/**
 * Estende seedPrincipal: copia TODOS os devedores existentes do contrato para a nova dívida,
 * preservando papel + responsabilidade (D-pre-11). Substitui seedPrincipal isolado em
 * adicionarDocumento (commit 07.13b) e em App.jsx fluxo legacy (apenas se novaDiv.contrato_id).
 *
 * Fallback (contrato header-only, primeira dívida sendo criada): se listarDevedoresDoContrato
 * retorna [] → chama seedPrincipal(contrato.devedor_id, dividaId) usando legacy denormalização.
 */
export async function seedDevedoresDoContrato(dividaId, contratoId) {
  const devedoresDoContrato = await listarDevedoresDoContrato(contratoId);
  if (devedoresDoContrato.length === 0) {
    // Header-only contract (primeira dívida): fallback usando dividas.devedor_id legacy
    const { dbGet } = await import("../config/supabase.js");
    const contratoArr = await dbGet("contratos_dividas", `id=eq.${encodeURIComponent(contratoId)}&select=devedor_id&limit=1`);
    const contrato = Array.isArray(contratoArr) ? contratoArr[0] : null;
    if (contrato?.devedor_id) {
      return [await seedPrincipal(contrato.devedor_id, dividaId)];
    }
    return [];
  }
  const results = [];
  for (const dev of devedoresDoContrato) {
    const r = await sb(TABLE, "POST", {
      devedor_id: dev.devedor_id,
      divida_id: String(dividaId),
      papel: dev.papel,
      responsabilidade: dev.responsabilidade,
      observacao: "",
    });
    results.push(r);
  }
  return results;
}
