/**
 * pagamentos.js — Service CRUD para pagamentos_divida.
 *
 * MIGRATIONS NECESSÁRIAS — executar no Supabase SQL Editor antes de usar:
 *
 * -- Migration 1: nova tabela
 * CREATE TABLE public.pagamentos_divida (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   divida_id UUID NOT NULL REFERENCES public.dividas(id) ON DELETE CASCADE,
 *   data_pagamento DATE NOT NULL,
 *   valor NUMERIC(15,2) NOT NULL,
 *   observacao TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE public.pagamentos_divida ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso autenticado" ON public.pagamentos_divida
 *   FOR ALL USING (auth.role() = 'authenticated');
 *
 * -- Migration 2: coluna saldo_quitado em dividas
 * ALTER TABLE public.dividas ADD COLUMN IF NOT EXISTS saldo_quitado BOOLEAN DEFAULT FALSE;
 */

import { dbGet, dbInsert, dbUpdate, dbDelete } from "../config/supabase.js";
import { calcularSaldosPorDivida } from "../utils/devedorCalc.js";

const TABLE = "pagamentos_divida";

/**
 * Lista todos os pagamentos de uma dívida, ordenados por data_pagamento ASC.
 * @param {string} dividaId — UUID da dívida
 * @returns {Promise<Array>}
 */
export async function listarPagamentos(dividaId) {
  return dbGet(TABLE, `divida_id=eq.${dividaId}&order=data_pagamento.asc`);
}

/**
 * Cria um novo pagamento para uma dívida.
 * @param {{ divida_id: string, data_pagamento: string, valor: number, observacao?: string }} payload
 * @returns {Promise<Array>} — array com a row criada
 */
export async function criarPagamento(payload) {
  return dbInsert(TABLE, payload);
}

/**
 * Atualiza campos de um pagamento existente.
 * @param {string} pagamentoId — UUID do pagamento
 * @param {{ data_pagamento?: string, valor?: number, observacao?: string }} campos
 * @returns {Promise<Array>}
 */
export async function atualizarPagamento(pagamentoId, campos) {
  return dbUpdate(TABLE, pagamentoId, campos);
}

/**
 * Exclui um pagamento pelo UUID.
 * @param {string} pagamentoId — UUID do pagamento
 * @returns {Promise<any>}
 */
export async function excluirPagamento(pagamentoId) {
  return dbDelete(TABLE, pagamentoId);
}

/**
 * Calcula o saldo atualizado de uma dívida individual via Art. 354 CC.
 * Adapta o motor calcularSaldosPorDivida para receber pagamentos de uma
 * única dívida (pagamentos_divida), sem interferência de pagamentos_parciais.
 *
 * @param {object} divida — objeto dívida com: id, valor_total, indexador,
 *   juros_tipo, juros_am, multa_pct, honorarios_pct, art523_opcao,
 *   data_inicio_atualizacao|data_vencimento|data_origem
 * @param {Array}  pagamentosDivida — array de { data_pagamento, valor, observacao }
 * @param {string} hoje — "YYYY-MM-DD"
 * @returns {number} saldo final (≥ 0)
 */
export function calcularSaldoPorDividaIndividual(divida, pagamentosDivida, hoje) {
  // Constrói objeto devedor fictício com apenas esta dívida
  // O motor espera devedor.dividas[] — cada dívida precisa ter os campos de encargos
  const devedorFicticio = {
    dividas: [divida],
  };
  const saldosMap = calcularSaldosPorDivida(devedorFicticio, pagamentosDivida || [], hoje);
  return saldosMap[String(divida.id)] ?? 0;
}
