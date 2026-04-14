-- Migração: adicionar colunas de endereço e qualificação na tabela credores
-- Execute este SQL no Supabase Dashboard → SQL Editor

ALTER TABLE credores
  ADD COLUMN IF NOT EXISTS email          TEXT,
  ADD COLUMN IF NOT EXISTS logradouro     TEXT,
  ADD COLUMN IF NOT EXISTS numero         TEXT,
  ADD COLUMN IF NOT EXISTS complemento    TEXT,
  ADD COLUMN IF NOT EXISTS bairro         TEXT,
  ADD COLUMN IF NOT EXISTS cidade         TEXT,
  ADD COLUMN IF NOT EXISTS uf             TEXT,
  ADD COLUMN IF NOT EXISTS profissao      TEXT,
  ADD COLUMN IF NOT EXISTS rg             TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil   TEXT,
  ADD COLUMN IF NOT EXISTS nacionalidade  TEXT DEFAULT 'Brasileiro(a)';
