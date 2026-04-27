-- ────────────────────────────────────────────────────
-- Migration 004: Fila por Contrato (Phase 7.13b D-pre-10)
--
-- Objetivo: alinhar fonte de verdade da Fila com o modelo
-- 3 níveis (devedor → contrato → dívida) das Phases 5+6+7.x.
--
-- - Adiciona contratos_dividas.status TEXT NOT NULL com CHECK
--   em 7 valores (em_cobranca/em_localizacao/em_negociacao/
--   notificado/ajuizado/quitado/arquivado).
-- - Adiciona eventos_andamento.contrato_id UUID NOT NULL
--   REFERENCES contratos_dividas(id) (denormalização legacy de
--   devedor_id preservada em paralelo — back-compat com
--   Detalhe-Devedor / lembretes / registros_contato D-pre-11).
-- - γ DROP histórico legado de eventos_andamento — banco minúsculo
--   (5 devedores ativos), decisão de produto registrada no SUMMARY.
--
-- D-pre-7 (γ): histórico de atendimentos legado vinculado a
-- devedor_id é descartado conscientemente. Atendimentos novos
-- passam a ser por contrato.
-- D-pre-10 (migration robusta a 2 strategies): TRUNCATE preferida,
-- DELETE fallback se TRUNCATE der erro RLS/privilégio.
--
-- Aplicar manualmente no Supabase SQL Editor.
-- STRATEGY A (preferida): TRUNCATE no Bloco 3.
-- STRATEGY B (fallback): se TRUNCATE der erro RLS/privilégio,
-- substituir Bloco 3 por DELETE (mesmo efeito final no contexto γ).
-- Documentar STRATEGY aplicada no SUMMARY do Plan 03.
-- ────────────────────────────────────────────────────

-- Bloco 1: status por contrato
ALTER TABLE public.contratos_dividas
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'em_cobranca'
  CHECK (status IN ('em_cobranca','em_localizacao','em_negociacao','notificado','ajuizado','quitado','arquivado'));

-- Bloco 2: contrato_id em eventos
ALTER TABLE public.eventos_andamento
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES public.contratos_dividas(id);

-- Bloco 2.5: PRE-FLIGHT — confirma acesso à tabela antes do drop legado
SELECT COUNT(*) FROM public.eventos_andamento;

-- Bloco 3: γ — DROP histórico legado (decisão de produto, banco minúsculo)
-- STRATEGY A (preferida): TRUNCATE — fast, reseta sequences, requer privilégio TRUNCATE
TRUNCATE public.eventos_andamento;

-- STRATEGY B (fallback): se TRUNCATE der erro de permissão (RLS bypass / privilégio),
-- substituir Bloco 3 por:
--   DELETE FROM public.eventos_andamento;
-- DELETE respeita RLS e não requer privilégio TRUNCATE. Mesmo efeito final no contexto γ
-- (banco minúsculo, < 1000 rows). Documentar no SUMMARY qual strategy foi aplicada.

-- Bloco 4: NOT NULL após drop limpo
ALTER TABLE public.eventos_andamento
  ALTER COLUMN contrato_id SET NOT NULL;

-- Bloco 5: PostgREST schema reload
SELECT pg_notify('pgrst', 'reload schema');
