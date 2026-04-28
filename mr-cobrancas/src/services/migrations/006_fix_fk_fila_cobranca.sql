-- ────────────────────────────────────────────────────
-- Migration 006 — fix FK fila_cobranca_contrato_id_fkey
-- APLICADA EM PROD 2026-04-28 manualmente via Supabase SQL Editor (5 blocos sequenciais).
-- Idempotente: rodar de novo em ambiente staging/dev é seguro
-- (DROP IF EXISTS + integrity check + ADD CONSTRAINT em DO block com check pg_constraint).
-- D-pre-13 cumulative — 2ª FK órfã herdada de schema histórico legacy
-- (mesma classe de bug Migration 005 / eventos_andamento_contrato_id_fkey):
-- FK fila_cobranca_contrato_id_fkey apontava para tabela 'contratos' (inexistente)
-- em vez de 'contratos_dividas'. Sintoma: feature relacionada a fila_cobranca
-- falhava em UAT cumulative Plan 03 Tela 2 (FilaOperador).
-- Lição cumulative: 1 FK órfã sugere classe de bug — audit em batch de TODAS as FKs
-- pós-fix da primeira. Migration 005 deveria ter sido seguida de audit wide.
-- Mapa de 7 FKs *_contrato_id_fkey auditado em prod 2026-04-28: 6 OK + 1 fixed (esta).
-- ────────────────────────────────────────────────────

-- Bloco 1: drop FK órfã (idempotente nativo via IF EXISTS)
ALTER TABLE public.fila_cobranca
  DROP CONSTRAINT IF EXISTS fila_cobranca_contrato_id_fkey;

-- Bloco 2: integrity check pré-add — confirma tabela vazia ou rows com contrato_id válidos
-- Esperado: count = 0 (tabela vazia em prod 2026-04-28) OU todas as rows com contrato_id
-- referenciando contratos_dividas(id) válido. Se houver rows órfãs, ADD CONSTRAINT falhará.
SELECT count(*) AS total_rows,
       count(contrato_id) AS rows_com_contrato_id,
       count(*) FILTER (
         WHERE contrato_id IS NOT NULL
           AND contrato_id NOT IN (SELECT id FROM public.contratos_dividas)
       ) AS rows_orfas
  FROM public.fila_cobranca;

-- Bloco 3: ADD CONSTRAINT idempotente — só se não existe FK apontando pra contratos_dividas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fila_cobranca_contrato_id_fkey'
      AND pg_get_constraintdef(oid) LIKE '%REFERENCES contratos_dividas(id)%'
  ) THEN
    ALTER TABLE public.fila_cobranca
      ADD CONSTRAINT fila_cobranca_contrato_id_fkey
      FOREIGN KEY (contrato_id) REFERENCES public.contratos_dividas(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Bloco 4: verificação — confirma FK aponta para contratos_dividas(id) ON DELETE CASCADE
-- Esperado: contém "REFERENCES contratos_dividas(id) ON DELETE CASCADE"
SELECT pg_get_constraintdef(oid)
  FROM pg_constraint
 WHERE conname = 'fila_cobranca_contrato_id_fkey';

-- Bloco 5: PostgREST schema reload (já aplicado em prod, mas registra por completude)
SELECT pg_notify('pgrst', 'reload schema');
