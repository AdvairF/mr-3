-- ────────────────────────────────────────────────────
-- Migration 005 — fix FK eventos_andamento_contrato_id_fkey
-- APLICADA EM PROD 2026-04-27 manualmente via Supabase SQL Editor (4 blocos sequenciais).
-- Idempotente: rodar de novo em ambiente staging/dev é seguro
-- (DROP IF EXISTS + ADD CONSTRAINT em DO block com check pg_constraint).
-- D-pre-13 post-hoc — bug latente Migration 004 ADD COLUMN IF NOT EXISTS
-- skip REFERENCES quando coluna já existia de tentativa anterior:
-- FK acabou apontando para tabela 'contratos' (legacy inexistente) em
-- vez de 'contratos_dividas'. Sintoma: INSERT em eventos_andamento
-- falha FK violation 100% silenciosamente.
-- Lição: verificar pg_constraint pós-migration confirmando FK target correto.
-- ────────────────────────────────────────────────────

-- Bloco 1: drop FK órfã (idempotente nativo via IF EXISTS)
ALTER TABLE public.eventos_andamento
  DROP CONSTRAINT IF EXISTS eventos_andamento_contrato_id_fkey;

-- Bloco 2: ADD CONSTRAINT idempotente — só se não existe FK apontando pra contratos_dividas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eventos_andamento_contrato_id_fkey'
      AND pg_get_constraintdef(oid) LIKE '%REFERENCES contratos_dividas(id)%'
  ) THEN
    ALTER TABLE public.eventos_andamento
      ADD CONSTRAINT eventos_andamento_contrato_id_fkey
      FOREIGN KEY (contrato_id) REFERENCES public.contratos_dividas(id);
  END IF;
END $$;

-- Bloco 3: verificação — confirma FK aponta para contratos_dividas(id)
-- Esperado: contém "REFERENCES contratos_dividas(id)"
SELECT pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conname = 'eventos_andamento_contrato_id_fkey';

-- Bloco 4: PostgREST schema reload (já aplicado em prod, mas registra por completude)
SELECT pg_notify('pgrst', 'reload schema');
