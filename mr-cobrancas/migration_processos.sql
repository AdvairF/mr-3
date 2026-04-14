-- Migração: adicionar colunas faltantes na tabela processos
-- Execute este SQL no Supabase Dashboard → SQL Editor

ALTER TABLE processos
  ADD COLUMN IF NOT EXISTS instancia TEXT,
  ADD COLUMN IF NOT EXISTS numero_origem TEXT,
  ADD COLUMN IF NOT EXISTS data_ajuizamento DATE,
  ADD COLUMN IF NOT EXISTS data_distribuicao DATE,
  ADD COLUMN IF NOT EXISTS observacoes TEXT;
