-- ────────────────────────────────────────────────────
-- Migration 003: devedores soft delete
-- Adds deleted_at TIMESTAMPTZ NULL to devedores so that
-- DELETE devedor is replaced by UPDATE deleted_at = NOW().
-- Bypasses bug bloqueante de produção:
--   eventos_andamento_devedor_id_fkey (FK NOT CASCADE)
--   blocking DELETE devedores em uso real.
-- Soft delete contorna 12+ FKs sem precisar fixar uma a uma.
--
-- D-pre-1 (escopo mínimo): SOMENTE devedores. Credores/contratos/
-- processos NÃO entram nesta phase.
-- D-pre-4 (schema TIMESTAMPTZ): NÃO é boolean ativo — TIMESTAMPTZ
-- preserva informação temporal e permite restauração via SQL
-- (UPDATE devedores SET deleted_at=NULL WHERE id=X).
-- D-pre-5 (sem UI restauração): restauração via SQL apenas — YAGNI.
-- D-pre-9 (strategy b): 3 callsites recebem filtro deleted_at=is.null
-- + 1 exceção forense (services/processosJudiciais.js:71 D-pre-11).
--
-- Run this MANUALLY in Supabase SQL Editor (mesmo padrão das
-- Migrations 001/002 — não há framework npm de migration neste projeto).
-- ────────────────────────────────────────────────────

ALTER TABLE devedores ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS devedores_deleted_at_idx
  ON devedores (deleted_at)
  WHERE deleted_at IS NULL;

SELECT pg_notify('pgrst', 'reload schema');
