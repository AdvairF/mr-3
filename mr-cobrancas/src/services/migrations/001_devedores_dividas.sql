-- ────────────────────────────────────────────────────
-- Migration 001: devedores_dividas
-- Relates devedores rows to JSON divida_id values.
-- No FK to dividas because dividas live in JSONB.
-- ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS devedores_dividas (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id      BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  divida_id       TEXT NOT NULL,
  papel           TEXT NOT NULL DEFAULT 'PRINCIPAL'
                  CHECK (papel IN ('PRINCIPAL','COOBRIGADO','AVALISTA','FIADOR','CONJUGE','OUTRO')),
  responsabilidade TEXT NOT NULL DEFAULT 'SOLIDARIA'
                  CHECK (responsabilidade IN ('SOLIDARIA','SUBSIDIARIA','DIVISIVEL')),
  observacao      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one PRINCIPAL per divida_id across the whole table
CREATE UNIQUE INDEX IF NOT EXISTS devedores_dividas_principal_unique
  ON devedores_dividas (divida_id)
  WHERE papel = 'PRINCIPAL';

-- Fast lookup by devedor
CREATE INDEX IF NOT EXISTS devedores_dividas_devedor_idx
  ON devedores_dividas (devedor_id);

-- Fast lookup by divida
CREATE INDEX IF NOT EXISTS devedores_dividas_divida_idx
  ON devedores_dividas (divida_id);

-- Prevent duplicate (devedor, divida) pairs
CREATE UNIQUE INDEX IF NOT EXISTS devedores_dividas_unico
  ON devedores_dividas (divida_id, devedor_id);

-- RLS: allow all (matches existing tables)
ALTER TABLE devedores_dividas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'devedores_dividas' AND policyname = 'allow_all_devedores_dividas'
  ) THEN
    EXECUTE 'CREATE POLICY allow_all_devedores_dividas ON devedores_dividas FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- Notify PostgREST to reload schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- ────────────────────────────────────────────────────
-- Idempotent seed: existing dívidas → PRINCIPAL row
-- Safe to run multiple times (ON CONFLICT DO NOTHING).
-- ────────────────────────────────────────────────────

INSERT INTO devedores_dividas (devedor_id, divida_id, papel, responsabilidade)
SELECT
  d.id                              AS devedor_id,
  div_row->>'id'                    AS divida_id,
  'PRINCIPAL'                       AS papel,
  'SOLIDARIA'                       AS responsabilidade
FROM
  devedores d,
  LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(d.dividas::jsonb) = 'array' THEN d.dividas::jsonb
      ELSE '[]'::jsonb
    END
  ) AS div_row
WHERE
  div_row->>'id' IS NOT NULL
  AND div_row->>'id' != ''
ON CONFLICT DO NOTHING;
