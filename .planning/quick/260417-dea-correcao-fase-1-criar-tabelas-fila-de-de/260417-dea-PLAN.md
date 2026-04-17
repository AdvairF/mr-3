---
phase: quick-260417-dea
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true
requirements: ["260417-dea"]

must_haves:
  truths:
    - "6 new tables exist in public schema: contratos, parcelas, equipes, operadores, fila_cobranca, eventos_andamento"
    - "Column telefones_adicionais (JSONB) exists on devedores table"
    - "5 custom indexes exist: idx_parcelas_vencimento, idx_fila_status, idx_fila_score, idx_fila_operador, idx_eventos_contrato"
    - "6 RLS policies named allow_all are active on all new tables"
    - "INSERT into contratos succeeds with a valid devedor_id"
    - "Previously existing tables (etapas_cobranca, cobrancas, pagamentos_parciais, etc) are untouched"
  artifacts:
    - path: "supabase:public.contratos"
      provides: "Contracts table with FK to devedores and credores"
    - path: "supabase:public.parcelas"
      provides: "Installments table with FK to contratos"
    - path: "supabase:public.equipes"
      provides: "Teams table (no FK deps)"
    - path: "supabase:public.operadores"
      provides: "Operators table with FK to usuarios_sistema and equipes"
    - path: "supabase:public.fila_cobranca"
      provides: "Collection queue table with FK to contratos, devedores, equipes, operadores"
    - path: "supabase:public.eventos_andamento"
      provides: "Progress events table with FK to contratos, operadores"
  key_links:
    - from: "contratos.devedor_id"
      to: "devedores.id"
      via: "FK BIGINT REFERENCES"
      pattern: "REFERENCES public.devedores(id)"
    - from: "fila_cobranca.contrato_id"
      to: "contratos.id"
      via: "FK UUID REFERENCES"
      pattern: "REFERENCES public.contratos(id)"
    - from: "parcelas.contrato_id"
      to: "contratos.id"
      via: "FK UUID REFERENCES"
      pattern: "REFERENCES public.contratos(id)"
---

<objective>
Create the exact Fila de Devedor tables in Supabase using user-specified SQL.

Purpose: Establish the core debt collection queue schema (6 tables, indexes, RLS) required for the Fila de Devedor feature. This is a DB-only operation — no source code changes.
Output: 6 new tables, 1 ALTER column, 5 indexes, 6 RLS policies active in the Supabase project.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260417-dea-correcao-fase-1-criar-tabelas-fila-de-de/260417-dea-CONTEXT.md

Supabase project ref: nzzimacvelxzstarwqty
Supabase URL: https://nzzimacvelxzstarwqty.supabase.co

CRITICAL: Use Supabase Management API with PAT from environment. The mcp__supabase__* tools are NOT available in spawned agents.

API pattern for SQL execution:
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/nzzimacvelxzstarwqty/database/query" \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1 AS ok"}'
```

To get the PAT, read ~/.claude/settings.json and extract the supabase access token, or check environment variable SUPABASE_ACCESS_TOKEN.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Test Supabase Management API connection</name>
  <files>none (API call only)</files>
  <action>
1. Locate the Supabase Personal Access Token (PAT). Check in order:
   - Environment variable: SUPABASE_ACCESS_TOKEN
   - File: ~/.claude/settings.json (look for supabase token/pat field)
   - File: any .env in project root

2. Test connection by running a simple query via Management API:
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/nzzimacvelxzstarwqty/database/query" \
  -H "Authorization: Bearer $PAT" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT current_database(), current_schema(), now()"}'
```

3. If that fails, try the alternate endpoint format:
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/nzzimacvelxzstarwqty/database/query" \
  -H "Authorization: Bearer $PAT" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT 1 AS connection_ok"}'
```

4. Confirm the response contains valid JSON with query results (not an auth error).

5. Also verify prerequisite tables exist (devedores, credores, usuarios_sistema):
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('devedores','credores','usuarios_sistema')
ORDER BY table_name;
```
These must exist because the SQL has FK references to them.
  </action>
  <verify>API returns valid JSON response with no error. Prerequisite tables devedores, credores, usuarios_sistema confirmed present.</verify>
  <done>Management API connection verified. PAT works. Prerequisite FK target tables exist.</done>
</task>

<task type="auto">
  <name>Task 2: Execute the complete DDL SQL in FK-dependency order</name>
  <files>none (API call only)</files>
  <action>
Execute the following SQL EXACTLY as specified, block by block in FK-dependency order. Use the Supabase Management API endpoint confirmed in Task 1.

Execute each block as a separate API call to isolate errors. If a block fails, report the exact error before continuing.

BLOCK 1 — equipes (no FK deps):
```sql
CREATE TABLE IF NOT EXISTS public.equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

BLOCK 2 — contratos (FK: devedores, credores):
```sql
CREATE TABLE IF NOT EXISTS public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devedor_id BIGINT NOT NULL REFERENCES public.devedores(id) ON DELETE CASCADE,
  credor_id BIGINT REFERENCES public.credores(id),
  numero_contrato TEXT NOT NULL,
  valor_original NUMERIC(15,2) NOT NULL,
  valor_atualizado NUMERIC(15,2),
  estagio TEXT DEFAULT 'NOVO' CHECK (estagio IN ('NOVO','ANDAMENTO','FINALIZADO','SUSPENSO')),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

BLOCK 3 — parcelas (FK: contratos):
```sql
CREATE TABLE IF NOT EXISTS public.parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','PAGA','ATRASADA','ACORDO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

BLOCK 4 — operadores (FK: usuarios_sistema, equipes):
```sql
CREATE TABLE IF NOT EXISTS public.operadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id BIGINT REFERENCES public.usuarios_sistema(id),
  equipe_id UUID REFERENCES public.equipes(id),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

BLOCK 5 — fila_cobranca (FK: contratos, devedores, equipes, operadores):
```sql
CREATE TABLE IF NOT EXISTS public.fila_cobranca (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  devedor_id BIGINT NOT NULL REFERENCES public.devedores(id),
  equipe_id UUID REFERENCES public.equipes(id),
  operador_id UUID REFERENCES public.operadores(id),
  prioridade TEXT DEFAULT 'MEDIA' CHECK (prioridade IN ('ALTA','MEDIA','BAIXA')),
  score_prioridade NUMERIC DEFAULT 0,
  data_entrada_fila TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_acionamento TIMESTAMP WITH TIME ZONE,
  status_fila TEXT DEFAULT 'AGUARDANDO' CHECK (status_fila IN ('AGUARDANDO','EM_ATENDIMENTO','ACIONADO','REMOVIDO','RECICLADO')),
  bloqueado_ate DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

BLOCK 6 — eventos_andamento (FK: contratos, operadores):
```sql
CREATE TABLE IF NOT EXISTS public.eventos_andamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  operador_id UUID REFERENCES public.operadores(id),
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'LIGACAO','WHATSAPP','EMAIL','SMS','PROMESSA_PAGAMENTO',
    'SEM_CONTATO','ACORDO','TELEFONE_NAO_EXISTE',
    'CONTATO_COM_CLIENTE','RECADO'
  )),
  descricao TEXT,
  telefone_usado TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  giro_carteira_dias INTEGER DEFAULT 0,
  data_promessa DATE
);
```

BLOCK 7 — ALTER devedores:
```sql
ALTER TABLE public.devedores 
  ADD COLUMN IF NOT EXISTS telefones_adicionais JSONB DEFAULT '[]';
```

BLOCK 8 — indexes:
```sql
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.parcelas(data_vencimento) WHERE data_pagamento IS NULL;
CREATE INDEX IF NOT EXISTS idx_fila_status ON public.fila_cobranca(status_fila);
CREATE INDEX IF NOT EXISTS idx_fila_score ON public.fila_cobranca(score_prioridade DESC);
CREATE INDEX IF NOT EXISTS idx_fila_operador ON public.fila_cobranca(operador_id);
CREATE INDEX IF NOT EXISTS idx_eventos_contrato ON public.eventos_andamento(contrato_id);
```

BLOCK 9 — RLS enable:
```sql
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fila_cobranca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_andamento ENABLE ROW LEVEL SECURITY;
```

BLOCK 10 — RLS policies:
```sql
CREATE POLICY "allow_all" ON public.contratos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.parcelas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.equipes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.operadores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.fila_cobranca FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON public.eventos_andamento FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
```

BLOCK 11 — reload schema:
```sql
SELECT pg_notify('pgrst', 'reload schema');
```

IMPORTANT: Do NOT modify any existing tables (etapas_cobranca, cobrancas, pagamentos_parciais, etc). Only create new tables and ALTER devedores as specified.
  </action>
  <verify>Each block returns success (no error in response JSON). All 11 blocks executed without failure.</verify>
  <done>All 11 SQL blocks executed successfully. 6 tables created, 1 column added, 5 indexes created, RLS enabled and policies applied, schema reloaded.</done>
</task>

<task type="auto">
  <name>Task 3: Verify all tables, columns, indexes, RLS policies, and test INSERT</name>
  <files>none (API call only)</files>
  <action>
Run 5 verification queries via the Management API:

VERIFICATION 1 — Confirm 6 new tables exist:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('contratos','parcelas','equipes','operadores','fila_cobranca','eventos_andamento')
ORDER BY table_name;
```
Expected: 6 rows returned.

VERIFICATION 2 — Confirm telefones_adicionais column on devedores:
```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'devedores' AND column_name = 'telefones_adicionais';
```
Expected: 1 row, data_type = 'jsonb'.

VERIFICATION 3 — Confirm 6 RLS policies named allow_all:
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE policyname = 'allow_all' 
  AND tablename IN ('contratos','parcelas','equipes','operadores','fila_cobranca','eventos_andamento')
ORDER BY tablename;
```
Expected: 6 rows, all permissive = 'PERMISSIVE', cmd = 'ALL'.

VERIFICATION 4 — Confirm 5 custom indexes:
```sql
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname IN ('idx_parcelas_vencimento','idx_fila_status','idx_fila_score','idx_fila_operador','idx_eventos_contrato')
ORDER BY indexname;
```
Expected: 5 rows.

VERIFICATION 5 — Test INSERT into contratos (then clean up):
```sql
WITH test_devedor AS (
  SELECT id FROM public.devedores LIMIT 1
)
INSERT INTO public.contratos (devedor_id, numero_contrato, valor_original)
SELECT id, 'TEST-VERIFY-001', 100.00 FROM test_devedor
RETURNING id, devedor_id, numero_contrato, estagio;
```
Then delete the test row:
```sql
DELETE FROM public.contratos WHERE numero_contrato = 'TEST-VERIFY-001';
```
Expected: INSERT returns 1 row with estagio = 'NOVO', DELETE succeeds.

If any verification fails, report the exact discrepancy but do NOT attempt to fix it — report back for diagnosis.
  </action>
  <verify>All 5 verifications pass: 6 tables, 1 column, 6 policies, 5 indexes, INSERT+DELETE succeed.</verify>
  <done>Full schema verification complete. All 6 tables, telefones_adicionais column, 5 indexes, 6 RLS policies confirmed. Test INSERT/DELETE into contratos successful.</done>
</task>

</tasks>

<verification>
Run all 5 verification queries from Task 3. Every query must return the expected row count and values. The test INSERT must succeed with default estagio='NOVO' and the cleanup DELETE must remove exactly 1 row.
</verification>

<success_criteria>
- 6 new tables exist in public schema: contratos, parcelas, equipes, operadores, fila_cobranca, eventos_andamento
- Column telefones_adicionais (JSONB, default '[]') exists on devedores
- 5 indexes created: idx_parcelas_vencimento, idx_fila_status, idx_fila_score, idx_fila_operador, idx_eventos_contrato
- RLS enabled on all 6 new tables with allow_all policy
- Test INSERT into contratos works with a valid devedor_id
- All previously existing tables (etapas_cobranca, cobrancas, pagamentos_parciais, etc) remain untouched
</success_criteria>

<output>
After completion, create `.planning/quick/260417-dea-correcao-fase-1-criar-tabelas-fila-de-de/260417-dea-SUMMARY.md`
</output>
