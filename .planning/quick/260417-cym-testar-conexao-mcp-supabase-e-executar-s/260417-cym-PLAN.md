---
phase: quick-260417-cym
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: [KANBAN-SCHEMA-01]

must_haves:
  truths:
    - "MCP Supabase connection is verified working"
    - "6 tables exist in Supabase: etapas_cobranca, cobrancas, historico_etapas, timeline_eventos, alertas, configuracoes_kanban"
    - "etapas_cobranca contains 7 seed rows (novo, notificado, em_negociacao, acordo_ativo, inadimplente, em_juizo, encerrado)"
    - "RLS policies (allow_all) are enabled on all 6 tables"
    - "Indices are created for frequent Kanban queries"
  artifacts:
    - path: "Supabase: etapas_cobranca"
      provides: "Lookup table with 7 fixed Kanban stages"
    - path: "Supabase: cobrancas"
      provides: "Main Kanban item linking devedor to etapa"
    - path: "Supabase: historico_etapas"
      provides: "Stage movement log"
    - path: "Supabase: timeline_eventos"
      provides: "Chronological event timeline per devedor"
    - path: "Supabase: alertas"
      provides: "Deadline/overdue notifications"
    - path: "Supabase: configuracoes_kanban"
      provides: "Per-user Kanban preferences"
  key_links:
    - from: "cobrancas.devedor_id"
      to: "devedores.id"
      via: "FK ON DELETE CASCADE"
    - from: "cobrancas.etapa_id"
      to: "etapas_cobranca.id"
      via: "FK reference"
    - from: "historico_etapas.cobranca_id"
      to: "cobrancas.id"
      via: "FK ON DELETE CASCADE"
    - from: "timeline_eventos.devedor_id"
      to: "devedores.id"
      via: "FK ON DELETE CASCADE"
    - from: "alertas.devedor_id"
      to: "devedores.id"
      via: "FK ON DELETE CASCADE"
---

<objective>
Test MCP Supabase connection and execute SQL DDL for Phase 1 Kanban de Cobrancas (Fila de Devedor) -- 6 tables + RLS + indices + seed data.

Purpose: Create the database schema that the Kanban UI module will consume. The 6 tables represent the full data model for tracking devedores through 7 collection stages (Novo -> Encerrado).

Output: 6 tables live in Supabase with RLS, indices, and seed data for etapas_cobranca.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260417-cym-testar-conexao-mcp-supabase-e-executar-s/260417-cym-RESEARCH.md

Supabase project: https://nzzimacvelxzstarwqty.supabase.co
MCP tools pattern: mcp__supabase__*
</context>

<tasks>

<task type="auto">
  <name>Task 1: Test MCP Supabase connection and verify existing tables</name>
  <files>None (database operation only)</files>
  <action>
Use the MCP Supabase tools to verify connectivity. Run a query to list existing tables or retrieve schema information.

Specifically:
1. Use `mcp__supabase__list_tables` (or equivalent MCP tool) to list all tables in the `public` schema of project `nzzimacvelxzstarwqty`
2. Verify that the prerequisite tables exist: `devedores`, `credores`, `processos`
3. Confirm the PK type of `devedores` is compatible with BIGINT (it should be, per migration_pagamentos_parciais.sql pattern)

**If MCP connection FAILS:**
- Capture the exact error message
- Report it to the user immediately
- DO NOT attempt workarounds (per user decision)
- STOP execution -- do not proceed to Task 2

**If MCP connection SUCCEEDS:**
- Confirm which tables already exist
- Check if any of the 6 new tables already exist (avoid conflicts)
- Proceed to Task 2
  </action>
  <verify>MCP tool returns a list of tables including devedores, credores, processos. No connection errors.</verify>
  <done>MCP Supabase connection verified working. Prerequisite tables confirmed to exist. Ready to create schema.</done>
</task>

<task type="auto">
  <name>Task 2: Execute SQL DDL -- Create 6 tables with RLS, indices, and seed data</name>
  <files>None (database operation only)</files>
  <action>
Execute the SQL below via MCP Supabase tools. The SQL MUST be executed in the exact order shown (FK dependency order). Use `mcp__supabase__execute_sql` (or the equivalent MCP tool for running raw SQL).

**IMPORTANT:** If any of the 6 tables already exist (detected in Task 1), skip that table's CREATE statement. The `IF NOT EXISTS` clause handles this, but be aware.

Execute the following SQL in ONE call if the MCP tool supports it, or in 6 sequential calls (one per table block) if it requires smaller statements:

**Block 1 -- etapas_cobranca (lookup, no FK):**
```sql
CREATE TABLE IF NOT EXISTS etapas_cobranca (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug       TEXT    NOT NULL UNIQUE,
  nome       TEXT    NOT NULL,
  descricao  TEXT,
  cor        TEXT    NOT NULL DEFAULT '#64748b',
  bg         TEXT    NOT NULL DEFAULT '#f1f5f9',
  ordem      INT     NOT NULL DEFAULT 0,
  ativo      BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE etapas_cobranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON etapas_cobranca FOR ALL USING (true) WITH CHECK (true);

INSERT INTO etapas_cobranca (slug, nome, descricao, cor, bg, ordem) VALUES
  ('novo',            'Novo',            'Devedor cadastrado, sem contato',            '#64748b', '#f1f5f9', 0),
  ('notificado',      'Notificado',      'Notificacao extrajudicial enviada',          '#7c3aed', '#ede9fe', 1),
  ('em_negociacao',   'Em Negociacao',    'Devedor respondeu, acordo possivel',         '#d97706', '#fef3c7', 2),
  ('acordo_ativo',    'Acordo Ativo',     'Acordo firmado, parcelas em andamento',      '#16a34a', '#dcfce7', 3),
  ('inadimplente',    'Inadimplente',     'Acordo quebrado ou prazo esgotado',          '#dc2626', '#fee2e2', 4),
  ('em_juizo',        'Em Juizo',         'Processo judicial aberto',                   '#c2410c', '#ffedd5', 5),
  ('encerrado',       'Encerrado',        'Pago, prescrito ou arquivado',               '#065f46', '#d1fae5', 6)
ON CONFLICT (slug) DO NOTHING;
```

**Block 2 -- cobrancas (FK to devedores, credores, processos, etapas_cobranca):**
```sql
CREATE TABLE IF NOT EXISTS cobrancas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id      BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  credor_id       BIGINT    REFERENCES credores(id) ON DELETE SET NULL,
  processo_id     BIGINT    REFERENCES processos(id) ON DELETE SET NULL,
  etapa_id        BIGINT    NOT NULL REFERENCES etapas_cobranca(id),
  etapa_slug      TEXT      NOT NULL DEFAULT 'novo',
  valor_cobrado   NUMERIC(15,2),
  data_vencimento DATE,
  prioridade      TEXT      NOT NULL DEFAULT 'normal'
                  CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  responsavel     TEXT,
  observacoes     TEXT,
  ordem_coluna    INT       NOT NULL DEFAULT 0,
  arquivado       BOOLEAN   NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON cobrancas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_cobrancas_devedor    ON cobrancas(devedor_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_credor     ON cobrancas(credor_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_etapa      ON cobrancas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_etapa_slug ON cobrancas(etapa_slug);
CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento ON cobrancas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_cobrancas_created    ON cobrancas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cobrancas_kanban     ON cobrancas(etapa_slug, credor_id, arquivado);
```

**Block 3 -- historico_etapas (FK to cobrancas):**
```sql
CREATE TABLE IF NOT EXISTS historico_etapas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cobranca_id     BIGINT    NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  etapa_anterior  TEXT,
  etapa_nova      TEXT      NOT NULL,
  motivo          TEXT,
  usuario_nome    TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historico_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON historico_etapas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_historico_cobranca ON historico_etapas(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_historico_created  ON historico_etapas(created_at DESC);
```

**Block 4 -- timeline_eventos (FK to devedores, cobrancas):**
```sql
CREATE TABLE IF NOT EXISTS timeline_eventos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id    BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  cobranca_id   BIGINT    REFERENCES cobrancas(id) ON DELETE SET NULL,
  tipo          TEXT      NOT NULL
                CHECK (tipo IN (
                  'cadastro','divida_adicionada','status_alterado',
                  'acordo_firmado','parcela_paga','parcela_vencida',
                  'peticao_gerada','processo_aberto','andamento',
                  'alerta_disparado','cobranca_movida',
                  'contato_realizado','nota_interna','documento_recebido',
                  'outro'
                )),
  titulo        TEXT      NOT NULL,
  descricao     TEXT,
  dados         JSONB,
  automatico    BOOLEAN   NOT NULL DEFAULT true,
  usuario_nome  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON timeline_eventos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_timeline_devedor   ON timeline_eventos(devedor_id);
CREATE INDEX IF NOT EXISTS idx_timeline_cobranca  ON timeline_eventos(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_timeline_tipo      ON timeline_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_timeline_created   ON timeline_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_devedor_data ON timeline_eventos(devedor_id, created_at DESC);
```

**Block 5 -- alertas (FK to devedores, cobrancas):**
```sql
CREATE TABLE IF NOT EXISTS alertas (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id    BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  cobranca_id   BIGINT    REFERENCES cobrancas(id) ON DELETE SET NULL,
  tipo          TEXT      NOT NULL
                CHECK (tipo IN (
                  'parcela_vencendo','parcela_vencida',
                  'acordo_sem_pagamento','prazo_processual',
                  'estagnacao','devedor_sem_contato',
                  'outro'
                )),
  titulo        TEXT      NOT NULL,
  descricao     TEXT,
  data_gatilho  DATE,
  lido          BOOLEAN   NOT NULL DEFAULT false,
  lido_em       TIMESTAMPTZ,
  lido_por      TEXT,
  dados         JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON alertas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alertas_devedor    ON alertas(devedor_id);
CREATE INDEX IF NOT EXISTS idx_alertas_cobranca   ON alertas(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_alertas_lido       ON alertas(lido);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo       ON alertas(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_gatilho    ON alertas(data_gatilho);
CREATE INDEX IF NOT EXISTS idx_alertas_pendentes  ON alertas(lido, data_gatilho DESC) WHERE lido = false;
```

**Block 6 -- configuracoes_kanban (no critical FK):**
```sql
CREATE TABLE IF NOT EXISTS configuracoes_kanban (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_email    TEXT      NOT NULL UNIQUE,
  colunas_visiveis JSONB     DEFAULT '["novo","notificado","em_negociacao","acordo_ativo","inadimplente","em_juizo","encerrado"]',
  filtro_credor_id BIGINT,
  ordenacao        TEXT      NOT NULL DEFAULT 'data_vencimento'
                   CHECK (ordenacao IN ('data_vencimento','valor_cobrado','created_at','prioridade')),
  itens_por_coluna INT       NOT NULL DEFAULT 50,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes_kanban ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON configuracoes_kanban FOR ALL USING (true) WITH CHECK (true);
```

**Block 7 -- Table comments:**
```sql
COMMENT ON TABLE etapas_cobranca     IS 'Etapas do kanban de cobrancas — 7 etapas fixas do fluxo juridico';
COMMENT ON TABLE cobrancas           IS 'Item principal do kanban — representa uma cobranca em uma etapa';
COMMENT ON TABLE historico_etapas    IS 'Log de movimentacoes entre etapas do kanban';
COMMENT ON TABLE timeline_eventos    IS 'Timeline cronologica de eventos por devedor';
COMMENT ON TABLE alertas             IS 'Alertas e notificacoes de prazos, vencimentos e estagnacao';
COMMENT ON TABLE configuracoes_kanban IS 'Preferencias do kanban por usuario';
```

**Error handling:** If any block fails, capture the exact error. Do NOT proceed to the next block if a failure breaks FK dependencies (e.g., if Block 1 fails, do not attempt Block 2). If Block 1 succeeds but Block 3 fails, Blocks 1 and 2 are still valid -- report partial success with exact error on the failing block.
  </action>
  <verify>No SQL errors returned from any block. All 6 CREATE TABLE statements complete successfully.</verify>
  <done>All 6 tables created in Supabase with RLS policies, indices, and seed data for etapas_cobranca (7 rows).</done>
</task>

<task type="auto">
  <name>Task 3: Verify all tables and seed data exist</name>
  <files>None (database operation only)</files>
  <action>
Run verification queries via MCP Supabase to confirm everything was created correctly:

1. **List tables** -- use MCP tool to list tables in public schema. Confirm all 6 new tables appear: etapas_cobranca, cobrancas, historico_etapas, timeline_eventos, alertas, configuracoes_kanban.

2. **Verify seed data** -- execute via MCP:
```sql
SELECT slug, nome, ordem FROM etapas_cobranca ORDER BY ordem;
```
Expected: 7 rows (novo=0, notificado=1, em_negociacao=2, acordo_ativo=3, inadimplente=4, em_juizo=5, encerrado=6).

3. **Verify RLS** -- execute via MCP:
```sql
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('etapas_cobranca','cobrancas','historico_etapas','timeline_eventos','alertas','configuracoes_kanban');
```
Expected: 6 rows, one allow_all policy per table.

4. **Verify index count** -- execute via MCP:
```sql
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('cobrancas','historico_etapas','timeline_eventos','alertas') ORDER BY tablename, indexname;
```
Expected: 7 indices on cobrancas, 2 on historico_etapas, 5 on timeline_eventos, 6 on alertas = 20 custom indices total (plus PK indices).

Report a summary of all verification results.
  </action>
  <verify>All 6 tables present. 7 seed rows in etapas_cobranca. 6 RLS policies active. 20+ indices created.</verify>
  <done>Full verification complete. Schema Fase 1 Kanban de Cobrancas is live and ready for application integration.</done>
</task>

</tasks>

<verification>
1. MCP Supabase connection established without errors
2. All 6 tables exist in public schema
3. etapas_cobranca has 7 seed rows with correct slugs and ordem
4. RLS allow_all policy exists on each of the 6 tables
5. All indices created (20+ custom indices across 4 tables)
6. FK relationships intact (cobrancas -> devedores, credores, processos, etapas_cobranca)
</verification>

<success_criteria>
- Zero SQL errors during execution
- 6 new tables in Supabase public schema
- 7 etapas seed rows queryable
- RLS enabled with allow_all on all 6 tables
- All planned indices present
</success_criteria>

<output>
After completion, create `.planning/quick/260417-cym-testar-conexao-mcp-supabase-e-executar-s/260417-cym-SUMMARY.md`
</output>
