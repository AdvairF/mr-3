-- migration_pagamentos_parciais.sql
-- Run once in Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- This script is idempotent (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS pagamentos_parciais (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id     BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  observacao     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_parciais_devedor
  ON pagamentos_parciais(devedor_id);

-- RLS: permissive policy matching pattern of other tables (anon key, no auth)
ALTER TABLE pagamentos_parciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON pagamentos_parciais
  FOR ALL USING (true) WITH CHECK (true);
