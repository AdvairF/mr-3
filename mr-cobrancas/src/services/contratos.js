/**
 * contratos.js — Service CRUD para contratos_dividas.
 *
 * MIGRATIONS NECESSÁRIAS — executar no Supabase SQL Editor antes de usar:
 *
 * -- Migration 1: nova tabela contratos_dividas
 * CREATE TABLE public.contratos_dividas (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   tipo TEXT NOT NULL CHECK (tipo IN ('NF/Duplicata', 'Compra e Venda', 'Empréstimo')),
 *   credor_id UUID,
 *   devedor_id BIGINT NOT NULL,
 *   valor_total NUMERIC(15,2) NOT NULL,
 *   data_inicio DATE NOT NULL,
 *   num_parcelas INT NOT NULL CHECK (num_parcelas >= 1),
 *   primeira_parcela_na_data_base BOOLEAN NOT NULL DEFAULT TRUE,
 *   referencia TEXT,
 *   created_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * ALTER TABLE public.contratos_dividas ENABLE ROW LEVEL SECURITY;
 * CREATE POLICY "Acesso autenticado" ON public.contratos_dividas
 *   FOR ALL USING (true) WITH CHECK (true);
 *
 * -- Migration 2: FK em dividas
 * ALTER TABLE public.dividas ADD COLUMN IF NOT EXISTS contrato_id UUID
 *   REFERENCES public.contratos_dividas(id);
 */

import { dbGet, dbInsert, dbUpdate, dbDelete } from "../config/supabase.js";

const TABLE = "contratos_dividas";

export function listarContratos() {
  return dbGet(TABLE, "order=created_at.desc");
}

export function listarContratosPorDevedor(devedorId) {
  return dbGet(TABLE, `devedor_id=eq.${devedorId}&order=created_at.desc`);
}

export function buscarContrato(contratoId) {
  return dbGet(TABLE, `id=eq.${encodeURIComponent(contratoId)}&limit=1`);
}

export function criarContrato(payload) {
  return dbInsert(TABLE, payload);
}

/**
 * Gera array de payloads para inserção em `dividas` (D-03/D-04/D-05/D-06).
 * Não faz chamadas ao banco — função pura.
 */
export function gerarPayloadParcelas(contrato) {
  const {
    id,
    tipo,
    credor_id,
    devedor_id,
    valor_total,
    data_inicio,
    num_parcelas,
    primeira_parcela_na_data_base,
    referencia,
  } = contrato;

  const valorBase = Math.floor((valor_total / num_parcelas) * 100) / 100;
  const parcelas = [];

  for (let i = 0; i < num_parcelas; i++) {
    const n = i + 1;
    const valor =
      n < num_parcelas
        ? valorBase
        : parseFloat((valor_total - valorBase * (num_parcelas - 1)).toFixed(2));

    const d = new Date(data_inicio + "T12:00:00");
    const offset = primeira_parcela_na_data_base ? i : i + 1;
    d.setMonth(d.getMonth() + offset);
    const data_vencimento = d.toISOString().slice(0, 10);

    const prefix = referencia ? referencia : tipo;

    parcelas.push({
      devedor_id,
      credor_id: credor_id || null,
      contrato_id: id,
      observacoes: `${prefix} — Parcela ${n}/${num_parcelas}`,
      valor_total: valor,
      data_vencimento,
      data_origem: data_inicio,
      data_inicio_atualizacao: data_vencimento,
      status: "em cobrança",
      indice_correcao: "igpm",
      juros_tipo: "fixo_1",
      juros_am_percentual: 0,
      multa_percentual: 0,
      honorarios_percentual: 0,
      despesas: 0,
      art523_opcao: "nao_aplicar",
      parcelas: [],
      custas: [],
    });
  }

  return parcelas;
}

/**
 * Cria contrato + N parcelas como dívidas reais de forma atômica.
 * Usa loop sequencial para preservar ordem de inserção.
 */
export async function criarContratoComParcelas(payload) {
  const res = await criarContrato(payload);
  const contrato = Array.isArray(res) ? res[0] : res;
  if (!contrato?.id) throw new Error("Supabase não retornou row do contrato");
  const parcelasPayload = gerarPayloadParcelas(contrato);
  const rows = [];
  for (const p of parcelasPayload) {
    const r = await dbInsert("dividas", p);
    rows.push(Array.isArray(r) ? r[0] : r);
  }
  return { contrato, parcelas: rows };
}
