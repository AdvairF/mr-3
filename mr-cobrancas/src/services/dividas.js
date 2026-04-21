import { sb } from "../config/supabase.js";

const TABLE = "dividas";

/**
 * Lista todas as dívidas de um devedor, ordenadas por criação.
 * @param {number|string} devedorId
 * @returns {Promise<Array>}
 */
export async function listarDividas(devedorId) {
  return sb(
    `${TABLE}?devedor_id=eq.${devedorId}&select=*&order=created_at.asc`
  );
}

/**
 * Busca uma dívida pelo UUID.
 * @param {string} dividaId — UUID
 * @returns {Promise<Array>} — array com 0 ou 1 elemento
 */
export async function buscarDivida(dividaId) {
  return sb(
    `${TABLE}?id=eq.${encodeURIComponent(dividaId)}&select=*&limit=1`
  );
}

/**
 * Cria uma nova dívida.
 * @param {object} payload — all columns except id/created_at/updated_at
 * @returns {Promise<Array>} — array com a row criada (Prefer: return=representation)
 */
export async function criarDivida(payload) {
  return sb(TABLE, "POST", {
    ...payload,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Atualiza campos de uma dívida existente.
 * @param {string} dividaUuid — UUID da dívida
 * @param {object} campos — campos a atualizar
 * @returns {Promise<Array>}
 */
export async function atualizarDivida(dividaUuid, campos) {
  return sb(`${TABLE}?id=eq.${dividaUuid}`, "PATCH", {
    ...campos,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Exclui uma dívida pelo UUID.
 * @param {string} dividaUuid — UUID da dívida
 * @returns {Promise<any>}
 */
export async function excluirDivida(dividaUuid) {
  return sb(`${TABLE}?id=eq.${dividaUuid}`, "DELETE");
}

/**
 * Atualiza a coluna saldo_quitado de uma dívida.
 * Chamado após cada operação de pagamento (criar/editar/excluir).
 * TRUE quando saldo ≤ 0, FALSE quando saldo > 0 (per D-03).
 *
 * @param {string} dividaUuid — UUID da dívida
 * @param {boolean} quitado — true se saldo ≤ 0, false se saldo > 0
 * @returns {Promise<Array>}
 */
export async function atualizarSaldoQuitado(dividaUuid, quitado) {
  return sb(`${TABLE}?id=eq.${dividaUuid}`, "PATCH", {
    saldo_quitado: quitado,
    updated_at: new Date().toISOString(),
  });
}
