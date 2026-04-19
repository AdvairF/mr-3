-- ────────────────────────────────────────────────────
-- Migration 002: dividas_tabela
-- Extracts dividas from devedores.dividas JSONB → own table.
-- Recreates devedores_dividas with real UUID FK.
-- Run this MANUALLY in Supabase SQL Editor.
-- ────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────
-- Section 2: CREATE TABLE dividas
-- CRITICAL field names:
--   valor_total (NOT valor_original) — devedorCalc.js line 75 reads div.valor_total
--   art523_opcao TEXT with 3-value CHECK (NOT artigo_523_aplica BOOLEAN)
--   json_id_legado — preserves Date.now() IDs for migration mapping
-- ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dividas (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id              BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  credor_id               BIGINT REFERENCES credores(id),
  tipo_titulo             TEXT,
  valor_total             NUMERIC(15,2),
  data_vencimento         DATE,
  data_origem             TEXT,
  data_inicio_atualizacao TEXT,
  indice_correcao         TEXT,
  juros_tipo              TEXT DEFAULT 'fixo_1',
  juros_am_percentual     NUMERIC(8,4),
  multa_percentual        NUMERIC(8,4),
  honorarios_percentual   NUMERIC(8,4),
  despesas                NUMERIC(15,2) DEFAULT 0,
  art523_opcao            TEXT DEFAULT 'nao_aplicar'
                          CHECK (art523_opcao IN ('nao_aplicar','so_multa','multa_honorarios')),
  status                  TEXT DEFAULT 'em cobrança',
  documento_origem_url    TEXT,
  observacoes             TEXT,
  json_id_legado          TEXT,
  _so_custas              BOOLEAN DEFAULT false,
  contatos                JSONB,
  acordos                 JSONB,
  parcelas                JSONB,
  custas                  JSONB,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────
-- Section 3: Indexes
-- ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS dividas_devedor_idx ON dividas (devedor_id);
CREATE INDEX IF NOT EXISTS dividas_credor_idx  ON dividas (credor_id);
CREATE INDEX IF NOT EXISTS dividas_legado_idx  ON dividas (json_id_legado);

-- ────────────────────────────────────────────────────
-- Section 4: RLS (matches existing pattern from 001)
-- ────────────────────────────────────────────────────

ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dividas' AND policyname = 'allow_all_dividas'
  ) THEN
    EXECUTE 'CREATE POLICY allow_all_dividas ON dividas FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

SELECT pg_notify('pgrst', 'reload schema');

-- ────────────────────────────────────────────────────
-- Section 5: Seed INSERT from JSONB
-- CRITICAL: Uses double-encoding CASE guard from 001_devedores_dividas.sql lines 65-71.
-- Without this CASE, rows with double-encoded JSONB produce zero results.
-- Field mapping:
--   div_row->>'id'                    → json_id_legado
--   div_row->>'valor_total'           → valor_total (CAST NUMERIC)
--   div_row->>'indexador'             → indice_correcao
--   div_row->>'juros_am'              → juros_am_percentual (CAST NUMERIC)
--   div_row->>'multa_pct'             → multa_percentual (CAST NUMERIC)
--   div_row->>'honorarios_pct'        → honorarios_percentual (CAST NUMERIC)
--   div_row->>'art523_opcao'          → art523_opcao
--   div_row->>'despesas'              → despesas (CAST NUMERIC)
--   div_row->>'juros_tipo'            → juros_tipo
--   div_row->>'data_origem'           → data_origem
--   div_row->>'data_inicio_atualizacao' → data_inicio_atualizacao
--   div_row->>'_so_custas'            → _so_custas (CAST BOOLEAN)
--   COALESCE descricao/observacoes    → observacoes
--   div_row->'parcelas'               → parcelas (JSONB)
--   div_row->'custas'                 → custas (JSONB)
--   d.credor_id                       → credor_id
--   div_row->>'data_vencimento'       → data_vencimento (CAST DATE with NULLIF)
--   div_row->>'criada_em'             → created_at (CAST TIMESTAMPTZ)
-- ────────────────────────────────────────────────────

INSERT INTO dividas (
  json_id_legado,
  devedor_id,
  credor_id,
  observacoes,
  valor_total,
  data_vencimento,
  data_origem,
  data_inicio_atualizacao,
  indice_correcao,
  juros_tipo,
  juros_am_percentual,
  multa_percentual,
  honorarios_percentual,
  despesas,
  art523_opcao,
  _so_custas,
  parcelas,
  custas,
  created_at
)
SELECT
  div_row->>'id'                                                        AS json_id_legado,
  d.id                                                                  AS devedor_id,
  d.credor_id                                                           AS credor_id,
  COALESCE(div_row->>'descricao', div_row->>'observacoes')              AS observacoes,
  CAST(NULLIF(div_row->>'valor_total', '') AS NUMERIC)                  AS valor_total,
  NULLIF(div_row->>'data_vencimento', '')::DATE                         AS data_vencimento,
  NULLIF(div_row->>'data_origem', '')                                   AS data_origem,
  NULLIF(div_row->>'data_inicio_atualizacao', '')                       AS data_inicio_atualizacao,
  COALESCE(NULLIF(div_row->>'indexador', ''), 'igpm')                   AS indice_correcao,
  COALESCE(NULLIF(div_row->>'juros_tipo', ''), 'fixo_1')                AS juros_tipo,
  CAST(NULLIF(div_row->>'juros_am', '') AS NUMERIC)                     AS juros_am_percentual,
  CAST(NULLIF(div_row->>'multa_pct', '') AS NUMERIC)                    AS multa_percentual,
  CAST(NULLIF(div_row->>'honorarios_pct', '') AS NUMERIC)               AS honorarios_percentual,
  CAST(NULLIF(div_row->>'despesas', '') AS NUMERIC)                     AS despesas,
  COALESCE(NULLIF(div_row->>'art523_opcao', ''), 'nao_aplicar')         AS art523_opcao,
  COALESCE((div_row->>'_so_custas')::BOOLEAN, false)                    AS _so_custas,
  CASE WHEN div_row->'parcelas' IS NOT NULL THEN div_row->'parcelas' ELSE '[]'::jsonb END AS parcelas,
  CASE WHEN div_row->'custas'   IS NOT NULL THEN div_row->'custas'   ELSE '[]'::jsonb END AS custas,
  COALESCE(NULLIF(div_row->>'criada_em', ''), NOW()::TEXT)::TIMESTAMPTZ AS created_at
FROM
  devedores d,
  LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb
      WHEN jsonb_typeof(d.dividas) = 'array'  THEN d.dividas
      ELSE '[]'::jsonb
    END
  ) AS div_row
WHERE
  div_row->>'id' IS NOT NULL
  AND div_row->>'id' != ''
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────
-- Section 6: DROP old devedores_dividas (TEXT divida_id)
-- and recreate with real UUID FK pointing to dividas.id
-- ────────────────────────────────────────────────────

DROP TABLE IF EXISTS devedores_dividas;

CREATE TABLE devedores_dividas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id       BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  divida_id        UUID NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,
  papel            TEXT NOT NULL DEFAULT 'PRINCIPAL'
                   CHECK (papel IN ('PRINCIPAL','COOBRIGADO','AVALISTA','FIADOR','CONJUGE','OUTRO')),
  responsabilidade TEXT NOT NULL DEFAULT 'SOLIDARIA'
                   CHECK (responsabilidade IN ('SOLIDARIA','SUBSIDIARIA','DIVISIVEL')),
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one PRINCIPAL per divida
CREATE UNIQUE INDEX devedores_dividas_principal_unique
  ON devedores_dividas (divida_id)
  WHERE papel = 'PRINCIPAL';

-- Fast lookup by devedor
CREATE INDEX devedores_dividas_devedor_idx ON devedores_dividas (devedor_id);

-- Fast lookup by divida
CREATE INDEX devedores_dividas_divida_idx  ON devedores_dividas (divida_id);

-- Prevent duplicate (devedor, divida) pairs
CREATE UNIQUE INDEX devedores_dividas_unico
  ON devedores_dividas (divida_id, devedor_id);

ALTER TABLE devedores_dividas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'devedores_dividas' AND policyname = 'allow_all_devedores_dividas'
  ) THEN
    EXECUTE 'CREATE POLICY allow_all_devedores_dividas ON devedores_dividas FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- ────────────────────────────────────────────────────
-- Section 7: Seed devedores_dividas from dividas
-- All dividas seeded as PRINCIPAL for their devedor_id.
-- Since devedores_dividas was just recreated, seed all
-- dividas rows directly — no old TEXT IDs to remap.
-- ────────────────────────────────────────────────────

INSERT INTO devedores_dividas (devedor_id, divida_id, papel, responsabilidade)
SELECT
  d.devedor_id,
  d.id,
  'PRINCIPAL',
  'SOLIDARIA'
FROM dividas d
WHERE d.devedor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────
-- Section 8: Final schema reload
-- ────────────────────────────────────────────────────

SELECT pg_notify('pgrst', 'reload schema');
