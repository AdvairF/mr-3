---
phase: 4
plan: 1
subsystem: service-layer
tags: [pagamentos, dividas, art354, crud, supabase]
dependency_graph:
  requires: []
  provides: [pagamentos.js:CRUD, pagamentos.js:calcularSaldoPorDividaIndividual, dividas.js:atualizarSaldoQuitado]
  affects: [04-02-PLAN.md, 04-03-PLAN.md]
tech_stack:
  added: []
  patterns: [global-db-utils, sb-supabase-client, devedorCalc-motor-art354]
key_files:
  created:
    - src/mr-3/mr-cobrancas/src/services/pagamentos.js
  modified:
    - src/mr-3/mr-cobrancas/src/services/dividas.js
decisions:
  - "pagamentos.js usa dbGet/dbInsert/dbUpdate/dbDelete como globals (injetados por App.jsx) — sem import direto"
  - "atualizarSaldoQuitado em dividas.js usa sb() como o restante do arquivo (não os globals)"
  - "calcularSaldoPorDividaIndividual constrói devedorFicticio com dividas:[divida] para reutilizar motor Art.354 existente"
  - "Migrations SQL documentadas como comentários no topo de pagamentos.js para execução manual no Supabase"
metrics:
  duration: "2 minutes"
  completed: "2026-04-21"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 4 Plan 1: Service Layer Pagamentos Summary

**One-liner:** CRUD sobre pagamentos_divida + helper Art.354 por dívida individual em pagamentos.js, e atualizarSaldoQuitado adicionado a dividas.js.

## What Was Built

Dois arquivos de service layer criados/estendidos para suportar pagamentos por dívida:

1. **pagamentos.js** (novo) — Service CRUD completo sobre a tabela `pagamentos_divida` com 5 exports:
   - `listarPagamentos(dividaId)` — lista pagamentos de uma dívida ordenados por data ASC
   - `criarPagamento(payload)` — insere novo pagamento
   - `atualizarPagamento(pagamentoId, campos)` — atualiza campos de um pagamento
   - `excluirPagamento(pagamentoId)` — remove um pagamento
   - `calcularSaldoPorDividaIndividual(divida, pagamentosDivida, hoje)` — adapta o motor Art.354 CC de `devedorCalc.js` para calcular saldo de uma única dívida com seus próprios pagamentos
   - Migrations SQL documentadas no topo do arquivo (nova tabela + coluna saldo_quitado)

2. **dividas.js** (estendido) — Função `atualizarSaldoQuitado(dividaUuid, quitado)` adicionada ao final, sem alterar as 5 funções existentes. Persiste `dividas.saldo_quitado` via PATCH usando o padrão `sb()` já presente no arquivo.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar service pagamentos.js com CRUD e helper de saldo | 95f60e1 | src/services/pagamentos.js (created) |
| 2 | Estender dividas.js com atualizarSaldoQuitado | dd0d465 | src/services/dividas.js (modified) |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

The plan's threat model covered all relevant surfaces:
- T-04-01 (RLS policy) — documented in migration at top of pagamentos.js
- T-04-02 (ownership validation) — accepted per plan
- T-04-03 (RLS for authenticated users) — covered by migration RLS policy
- T-04-04 (ON DELETE CASCADE) — accepted per plan (D-01)

No new threat surfaces introduced beyond what was modeled.

## Known Stubs

None — this plan creates pure service layer (no UI components, no data displayed to users). Downstream plans (04-02, 04-03) will wire these services to components.

## Self-Check: PASSED

- [x] `src/mr-3/mr-cobrancas/src/services/pagamentos.js` — FOUND (commit 95f60e1)
- [x] `src/mr-3/mr-cobrancas/src/services/dividas.js` contains `atualizarSaldoQuitado` — FOUND (commit dd0d465)
- [x] 5 exports in pagamentos.js — VERIFIED
- [x] 6 exports in dividas.js (5 original + 1 new) — VERIFIED
- [x] Migrations documented — VERIFIED
- [x] devedorFicticio with `dividas: [divida]` — VERIFIED
