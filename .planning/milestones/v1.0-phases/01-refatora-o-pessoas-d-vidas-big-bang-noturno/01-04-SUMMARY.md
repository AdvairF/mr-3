---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
plan: "04"
subsystem: devedores-dividas-write
tags: [refactor, dividas-table, write-surfaces, supabase-rest]
dependency_graph:
  requires: [01-01, 01-02, 01-03]
  provides: [write-surfaces-migrated]
  affects: [App.jsx-devedores-component]
tech_stack:
  added: []
  patterns:
    - dbInsert/dbUpdate/dbDelete("dividas") for all write operations
    - UUID from Supabase response for seedPrincipal (replaces Date.now())
    - JSONB-compat aliases on local state objects (descricao/indexador/juros_am/multa_pct/honorarios_pct)
    - dbGet("dividas", devedor_id=eq.X) for post-save reload
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "valor_total used as column name in dividas table payload (consistent with existing DB schema from 01-01); montarDevAtualizado reduce uses valor_total"
  - "localDiv objects carry both table column names AND JSONB-compat aliases so devedorCalc.js (which reads indexador/juros_am/multa_pct) continues to work without modification"
  - "Dead-code tentativas block removed from salvarDevedor (it was after return; — unreachable)"
  - "excluirDivida now shows toast.success on success and toast.error on failure (was silent catch before)"
  - "toggleParcela local state update always runs (even on DB error) to keep UI responsive"
metrics:
  duration: "4m 20s"
  completed: "2026-04-18"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 01 Plan 04: Refactor 7 Write Surfaces to dividas Table — Summary

**One-liner:** All 7 write surfaces in the Devedores component migrated from `JSON.stringify(dividas) + dbUpdate("devedores")` to `dbInsert/dbUpdate/dbDelete("dividas", ...)` with UUID-based seedPrincipal and post-save reload from dividas table.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Refactor adicionarDivida, adicionarCustasAvulsas, salvarDevedor | b346752 | App.jsx |
| 2 | Refactor salvarEdicaoDivida, excluirDivida, toggleParcela, reload post-save | 217134b | App.jsx |

## What Was Built

### Task 1 — adicionarDivida, adicionarCustasAvulsas, salvarDevedor

**adicionarDivida:** Replaced `const divida = { id: Date.now(), ... }` + `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas) })` with:
- `dbInsert("dividas", payload)` where payload uses table column names (`observacoes`, `indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`, `valor_total`)
- UUID from DB response (`novaDiv.id`) passed to `seedPrincipal` — fixes the critical bug where `Date.now()` (a number) was passed instead of a UUID string
- Local `localDiv` object carries JSONB-compat aliases so `devedorCalc.js` continues to work

**adicionarCustasAvulsas:** Same pattern as `adicionarDivida` with `_so_custas: true` in payload.

**salvarDevedor:** Removed `dividas: JSON.stringify([])` from the `devedores` INSERT payload. Also removed the entire dead-code `tentativas` fallback block (76 lines after an unconditional `return`) which also contained `dividas: JSON.stringify([])` references.

### Task 2 — toggleParcela, excluirDivida, salvarEdicaoDivida

**toggleParcela:** Replaced `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas) })` with:
- `dbUpdate("dividas", dividaId, { parcelas: JSON.stringify(targetDiv.parcelas) })` — updates only the affected divida row's parcelas JSONB
- Separate `dbUpdate("devedores", sel.id, { status: nSt })` only when status actually changes

**excluirDivida:** Replaced `dbUpdate("devedores", ..., { dividas: JSON.stringify(dividas) })` with:
- `dbDelete("dividas", dId)` — hard delete from dividas table
- `dbUpdate("devedores", sel.id, { valor_original: novaValorOriginal })` to keep devedor aggregate current
- Added `toast.success` / `toast.error` (was previously silent on success/error)

**salvarEdicaoDivida:** Replaced 60-line JSONB round-trip with:
- `dbUpdate("dividas", editDivId, campos)` where `campos` uses table column names
- Local state updated with both table names and JSONB-compat aliases
- Post-save reload: `dbGet("dividas", devedor_id=eq.X)` fetches fresh rows from the dividas table with alias mapping applied — replaces old `dbGet("devedores")` + `JSON.parse(freshDev.dividas)`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Dead-code tentativas block also contained dividas:JSON.stringify([]) references**
- **Found during:** Task 1 — acceptance criteria check
- **Issue:** The plan said "remove `dividas: JSON.stringify([])` from salvarDevedor payload" but there were 2 matches: one in the active `payload` const, and two more in the dead-code `tentativas` array after an unconditional `return;` statement. Grep for `dividas: JSON.stringify(\[\])` returned 2 matches.
- **Fix:** Removed the entire dead-code `tentativas` block (lines 3130–3201 in original) since it was unreachable code and all its entries used the old `dividas: JSON.stringify([])` pattern.
- **Files modified:** App.jsx
- **Commit:** b346752

## Verification Results

All acceptance criteria from the plan verified:

```
dbInsert("dividas")     — 2 matches (adicionarDivida + adicionarCustasAvulsas)
seedPrincipal(sel.id, novaDiv.id) — 1 match (UUID from DB response)
dividas: JSON.stringify([]) — 0 matches
_so_custas: true        — 1 match (custas payload)
dbUpdate("dividas")     — 2 matches (toggleParcela + salvarEdicaoDivida)
dbDelete("dividas")     — 1 match (excluirDivida)
dbGet("dividas", devedor_id=eq.X) — 1 match (reload post-save)
dbUpdate("devedores"...dividas:JSON.stringify) — 0 matches
freshDev.dividas        — 0 matches
Build                   — PASSED (✓ built in 690ms)
```

## Known Stubs

None. All write surfaces are fully wired to the dividas table.

## Threat Flags

None. No new network endpoints or auth paths introduced. All writes go through existing `dbInsert/dbUpdate/dbDelete` helpers which use the existing Supabase REST client. T-01-04-02 (Tampering) mitigated: post-save reload from DB (`dbGet("dividas")`) ensures local state matches DB truth after `salvarEdicaoDivida`.

## Self-Check: PASSED

- App.jsx modified: confirmed (git log shows 2 commits)
- b346752 exists: confirmed
- 217134b exists: confirmed
- No unexpected file deletions in either commit
