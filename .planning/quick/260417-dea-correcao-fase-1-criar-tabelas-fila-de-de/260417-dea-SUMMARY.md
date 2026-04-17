---
phase: quick-260417-dea
plan: 01
subsystem: database
tags: [supabase, ddl, fila-cobranca, schema]
tech-stack:
  added: []
  patterns: [management-api-ddl, rls-allow-all]
key-files:
  created: []
  modified:
    - supabase:public.equipes
    - supabase:public.contratos
    - supabase:public.parcelas
    - supabase:public.operadores
    - supabase:public.fila_cobranca
    - supabase:public.eventos_andamento
    - supabase:public.devedores (column added)
decisions:
  - "Executed all DDL via Supabase Management API (PAT auth) in FK-dependency order — no source code changes"
  - "RLS allow_all policies applied to all 6 new tables to match existing schema pattern"
metrics:
  duration: ~4min
  completed: 2026-04-17
---

# Quick Task 260417-dea: Fase 1 — Criar Tabelas Fila de Devedor Summary

**One-liner:** Created 6 core debt-collection-queue tables (equipes, contratos, parcelas, operadores, fila_cobranca, eventos_andamento) with FK chains, 5 indexes, RLS allow_all policies, and telefones_adicionais JSONB column on devedores.

## Tasks Completed

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Test Supabase Management API connection | PASS | PAT confirmed; devedores, credores, usuarios_sistema all present |
| 2 | Execute 11 DDL SQL blocks in FK-dependency order | PASS | All 11 blocks returned success (empty array or expected result) |
| 3 | Verify tables, columns, indexes, RLS, and test INSERT | PASS | All 5 verification queries passed |

## DDL Blocks Executed

| Block | Description | Result |
|-------|-------------|--------|
| 1 | CREATE TABLE equipes | OK |
| 2 | CREATE TABLE contratos (FK: devedores, credores) | OK |
| 3 | CREATE TABLE parcelas (FK: contratos) | OK |
| 4 | CREATE TABLE operadores (FK: usuarios_sistema, equipes) | OK |
| 5 | CREATE TABLE fila_cobranca (FK: contratos, devedores, equipes, operadores) | OK |
| 6 | CREATE TABLE eventos_andamento (FK: contratos, operadores) | OK |
| 7 | ALTER TABLE devedores ADD COLUMN telefones_adicionais JSONB | OK |
| 8 | CREATE 5 indexes | OK |
| 9 | ENABLE ROW LEVEL SECURITY on 6 tables | OK |
| 10 | CREATE POLICY allow_all on 6 tables | OK |
| 11 | SELECT pg_notify('pgrst', 'reload schema') | OK |

## Verification Results

### V1 — 6 new tables (expected 6 rows)
PASS: contratos, equipes, eventos_andamento, fila_cobranca, operadores, parcelas — all present.

### V2 — telefones_adicionais column on devedores
PASS: column_name=telefones_adicionais, data_type=jsonb, column_default='[]'::jsonb

### V3 — 6 RLS policies named allow_all
PASS: All 6 tables have PERMISSIVE policy for ALL commands, roles={anon,authenticated}.

### V4 — 5 custom indexes
PASS: idx_eventos_contrato, idx_fila_operador, idx_fila_score, idx_fila_status, idx_parcelas_vencimento — all present.

### V5 — Test INSERT + DELETE on contratos
PASS:
- INSERT returned: id=8048f23e-304f-4a0d-a721-113f7e59c805, devedor_id=11, numero_contrato=TEST-VERIFY-001, estagio=NOVO
- DELETE cleaned up the test row successfully.

## Deviations from Plan

None — plan executed exactly as written.

## Schema Artifacts Produced

| Artifact | Type | FKs |
|----------|------|-----|
| public.equipes | table | none |
| public.contratos | table | devedores.id, credores.id |
| public.parcelas | table | contratos.id |
| public.operadores | table | usuarios_sistema.id, equipes.id |
| public.fila_cobranca | table | contratos.id, devedores.id, equipes.id, operadores.id |
| public.eventos_andamento | table | contratos.id, operadores.id |
| public.devedores.telefones_adicionais | column (JSONB) | n/a |

## Existing Tables — Confirmed Untouched

etapas_cobranca, cobrancas, historico_etapas, timeline_eventos, alertas, configuracoes_kanban, pagamentos_parciais — no DDL executed against these tables.

## Self-Check: PASSED

- All 6 tables confirmed via information_schema query
- telefones_adicionais column confirmed via information_schema query
- 6 RLS allow_all policies confirmed via pg_policies
- 5 indexes confirmed via pg_indexes
- Test INSERT returned estagio=NOVO, DELETE removed the row
