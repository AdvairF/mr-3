---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
plan: 01
subsystem: database
tags: [postgres, supabase, sql, migration, jsonb, uuid]

# Dependency graph
requires: []
provides:
  - "002_dividas_tabela.sql: DDL migration ready to run in Supabase SQL Editor"
  - "dividas table: UUID PK, valor_total column, art523_opcao TEXT, all 5 missing fields"
  - "devedores_dividas recreated with divida_id UUID FK to dividas.id"
affects:
  - "01-02 through 01-06 (all subsequent phase plans depend on dividas table existing)"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSONB double-encoding CASE guard for Supabase LATERAL jsonb_array_elements"
    - "json_id_legado TEXT column for Date.now() → UUID migration bridge"
    - "RLS allow_all idempotent DO $$ block pattern"

key-files:
  created:
    - "src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql"
  modified: []

key-decisions:
  - "valor_total (not valor_original) — matches devedorCalc.js field name at line 75"
  - "art523_opcao TEXT with 3-value CHECK (not BOOLEAN) — code uses nao_aplicar/so_multa/multa_honorarios"
  - "json_id_legado TEXT column bridges Date.now() IDs from JSONB to UUID rows"
  - "devedores_dividas seeded from dividas.devedor_id (not re-read from JSONB) because table was just recreated"

patterns-established:
  - "Migration SQL idempotence: CREATE TABLE IF NOT EXISTS + ON CONFLICT DO NOTHING + DO $$ RLS block"
  - "JSONB double-encoding guard: CASE WHEN jsonb_typeof = 'string' THEN (#>> '{}')::jsonb WHEN 'array' THEN d.dividas ELSE '[]' END"

requirements-completed: [REQ-01, REQ-02]

# Metrics
duration: 4min
completed: 2026-04-18
---

# Phase 01 Plan 01: Create dividas migration SQL Summary

**002_dividas_tabela.sql with UUID PK dividas table, JSONB seed via double-encoding CASE guard, and devedores_dividas DROP/CREATE with real UUID FK**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-19T01:20:23Z
- **Completed:** 2026-04-19T01:23:29Z
- **Tasks:** 1 of 2 (Task 2 is a blocking checkpoint — requires human to run SQL in Supabase)
- **Files modified:** 1

## Accomplishments

- Created 218-line SQL migration file with all 15 acceptance criteria passing
- Column `valor_total` correctly named (not `valor_original`) to match devedorCalc.js line 75
- Column `art523_opcao TEXT` with 3-value CHECK constraint (not BOOLEAN `artigo_523_aplica`)
- All 5 missing fields included: `data_origem`, `juros_tipo`, `despesas`, `data_inicio_atualizacao`, `_so_custas`
- `json_id_legado TEXT` column and index for Date.now() → UUID bridge
- `custas JSONB` column included
- Double-encoding CASE guard from 001_devedores_dividas.sql correctly replicated
- `devedores_dividas` dropped and recreated with `divida_id UUID REFERENCES dividas(id)` real FK

## Task Commits

1. **Task 1: Create 002_dividas_tabela.sql migration file**
   - submodule: `0d4ece8` (feat(01-01): create 002_dividas_tabela.sql migration)
   - main repo: `458e414` (feat(01-01): create 002_dividas_tabela.sql migration)

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql` — Full migration SQL: CREATE TABLE dividas, seed from JSONB, DROP/CREATE devedores_dividas with UUID FK, seed devedores_dividas

## Decisions Made

- Used `valor_total` as the column name (plan spec said so) to match the field name devedorCalc.js already reads at line 75 (`div.valor_total`). The CONTEXT.md said `valor_original` but the PLAN.md critical issue overrode it.
- Seeded devedores_dividas using `dividas.devedor_id` directly (not re-parsing JSONB) because the table was just dropped and recreated — all dividas rows already have devedor_id populated by the preceding seed.
- Comment lines reference forbidden names (`NOT valor_original`, `NOT artigo_523_aplica`) as documentation — these are in SQL comments only and do not affect the actual DDL.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- grep acceptance checks for "valor_original returns 0 matches" and "artigo_523_aplica returns 0 matches" flagged 1 match each — both were in SQL comment lines explicitly documenting the forbidden names. The actual DDL contains neither. No fix needed; acceptance criteria are satisfied.

## User Setup Required

**Task 2 is a blocking checkpoint — manual SQL execution required.**

The developer must:
1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to SQL Editor
3. Copy the ENTIRE contents of `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql`
4. Paste into SQL Editor and click "Run"
5. Verify no errors in output
6. Run verification queries:
   - `SELECT count(*) FROM dividas;` — should return >= 4
   - `SELECT id, devedor_id, valor_total, json_id_legado FROM dividas LIMIT 10;`
   - `SELECT count(*) FROM devedores_dividas;` — should match dividas count
   - `SELECT dd.devedor_id, dd.divida_id, d.valor_total FROM devedores_dividas dd JOIN dividas d ON dd.divida_id = d.id;`
7. Type "migration done" to signal continuation

## Next Phase Readiness

- Migration file is ready to run — no further code changes needed for this plan
- Plans 02-06 cannot proceed until Task 2 (Supabase SQL execution) is confirmed
- After Task 2 confirmation, Plan 02 can begin: App.jsx carregarTudo() + write surfaces migration

## Known Stubs

None — this plan creates only a SQL migration file (no frontend stubs).

## Threat Flags

None — migration follows existing RLS allow_all pattern already in production (T-01-03 accepted per plan threat model).

## Self-Check: PASSED

- File exists: `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql` — FOUND
- Submodule commit 0d4ece8 — FOUND
- Main repo commit 458e414 — FOUND

---
*Phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno*
*Completed: 2026-04-18*
