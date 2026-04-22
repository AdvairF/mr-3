/**
 * contratos.js — Service CRUD para modelo 3 níveis: Contrato → Documento → Parcela.
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

import { dbGet, dbInsert, dbUpdate } from "../config/supabase.js";

const TABLE = "contratos_dividas";

export function listarContratos() {
  return dbGet(TABLE, "order=created_at.desc");
}

export function buscarContrato(contratoId) {
  return dbGet(TABLE, `id=eq.${encodeURIComponent(contratoId)}&limit=1`);
}

export function criarContrato(payload) {
  return dbInsert(TABLE, payload);
}

export function listarDocumentosPorContrato(contratoId) {
  return dbGet("documentos_contrato", `contrato_id=eq.${encodeURIComponent(contratoId)}&order=created_at.asc`);
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
 */
export async function adicionarDocumento(contratoId, documentoPayload, contrato) {
  const docRes = await dbInsert("documentos_contrato", { ...documentoPayload, contrato_id: contratoId });
  const documento = Array.isArray(docRes) ? docRes[0] : docRes;
  if (!documento?.id) throw new Error("Supabase não retornou row do documento");
  const parcelasPayload = gerarPayloadParcelasDocumento(documento, contrato);
  const rows = [];
  for (const p of parcelasPayload) {
    const r = await dbInsert("dividas", p);
    rows.push(Array.isArray(r) ? r[0] : r);
  }
  await recalcularTotaisContrato(contratoId);
  return { documento, parcelas: rows };
}
