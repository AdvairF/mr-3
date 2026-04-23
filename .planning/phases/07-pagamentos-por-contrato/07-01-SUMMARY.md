---
phase: 07-pagamentos-por-contrato
plan: "07-01"
status: complete
completed_at: "2026-04-22"
wave: 1
---

# Plan 07-01 Summary: DB Migrations

## What Was Built

Created `SQL-MIGRATIONS.md` with the 4 SQL scripts for Phase 7 database setup. Developer executed all migrations successfully in the Supabase SQL Editor before Phase 7 code execution.

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Create SQL-MIGRATIONS.md | ✓ Complete | 4 migrations in execution order |
| Checkpoint: Developer confirms migrations applied | ✓ Pre-approved | User confirmed 5 blocks ran with Success |

## Key Files

- `.planning/phases/07-pagamentos-por-contrato/SQL-MIGRATIONS.md` — SQL completo das 4 migrations

## Checkpoint Result

User confirmed all migrations executed successfully:
- Migration 3: ALTER CHECK contratos_historico (pagamento_recebido + pagamento_revertido)
- Migration 5: CREATE TABLE pagamentos_contrato + RLS USING(true) WITH CHECK(true) + index
- Migration 4a: SP registrar_pagamento_contrato (Art. 354 CC amortization loop)
- Migration 4b: SP reverter_pagamento_contrato (FOREACH parcelas_ids + contratos_historico)

Both SPs confirmed present: `SELECT proname FROM pg_proc WHERE proname IN ('registrar_pagamento_contrato', 'reverter_pagamento_contrato')` → 2 rows.

## Must-Haves Verified

- [x] contratos_historico CHECK constraint aceita pagamento_recebido e pagamento_revertido
- [x] pagamentos_contrato existe com parcelas_ids UUID[]
- [x] SP registrar_pagamento_contrato existe e retorna { parcelas_amortizadas, parcelas_ids }
- [x] SP reverter_pagamento_contrato existe com FOREACH para reverter cada parcela
- [x] RLS usa USING(true) WITH CHECK(true) — não auth.role()='authenticated'
- [x] Desenvolvedor confirmou 2 rows na query de verificação

## Self-Check: PASSED
