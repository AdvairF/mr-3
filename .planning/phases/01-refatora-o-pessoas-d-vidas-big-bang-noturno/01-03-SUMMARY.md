---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
plan: "03"
subsystem: database
tags: [supabase, react, useState, promise-all, map, compatibility-layer]

# Dependency graph
requires:
  - phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
    plan: "01"
    provides: "002_dividas_tabela.sql migration — dividas table in Supabase"
  - phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
    plan: "02"
    provides: "dividas.js service layer with CRUD exports"
provides:
  - "carregarTudo() loads dividas from new table in parallel (8th Promise.all slot)"
  - "dividasMap built as Map<String(devedor_id), divida[]> on every load"
  - "devedor.dividas populated from dividasMap — keeps devedorCalc.js, FilaDevedor, GerarPeticao, Relatorios working without changes"
  - "allDividas useState holds flat array of all divida rows"
  - "JSONB parse of d.dividas removed from setDevedores mapping"
affects: [01-04, 01-05, 01-06, devedorCalc, FilaDevedor, GerarPeticao, Relatorios]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "dividasMap: Map<String(devedor_id), divida[]> — same pattern as pgtosPorDevedorCarteira"
    - "Parallel DB load in Promise.all — additive slot, non-breaking"
    - "Compatibility layer: devedor.dividas populated from new table, transparent to consumers"

key-files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx

key-decisions:
  - "allDividas kept as flat array (not Map) so future components can filter/sort without Map.values() conversion"
  - "dividasMap built inline inside carregarTudo() (not as useMemo) — built fresh on each load, no stale Map risk"
  - "valorCalc reduce still reads div.valor_total (JSONB field name) — returns 0 for new table rows (which use valor_original); valorFinal falls back to d.valor_original from devedores table. Acceptable during transition."
  - "parse() function kept in carregarTudo() — still needed for d.contatos, d.acordos, d.parcelas"

patterns-established:
  - "dividasMap pattern: same Map<String(id), item[]> idiom as pgtosPorDevedorCarteira"
  - "Compatibility layer: populate devedor.dividas from dividasMap so all downstream consumers work without changes"

requirements-completed:
  - REQ-03
  - REQ-04

# Metrics
duration: 8min
completed: 2026-04-18
---

# Phase 01 Plan 03: Refactor carregarTudo() parallel load + dividasMap + compatibility layer Summary

**carregarTudo() now loads dividas from the new Supabase table in parallel via dividasMap, populating devedor.dividas transparently so devedorCalc.js and all consumers work without any changes**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-18T00:00:00Z
- **Completed:** 2026-04-18T00:08:00Z
- **Tasks:** 1
- **Files modified:** 1 (App.jsx via submodule mr-3)

## Accomplishments
- Added `allDividas` useState to hold flat array of all divida rows from new table
- Extended Promise.all from 7 to 8 slots — `dbGet("dividas")` runs in parallel with all other loads
- Built `dividasMap: Map<String(devedor_id), divida[]>` inside carregarTudo() after each load
- Replaced `parse(d.dividas)` JSONB parse with `dividasMap.get(String(d.id)) || []` in setDevedores mapping
- All downstream consumers (devedorCalc.js, FilaDevedor, GerarPeticao, Relatorios) receive `devedor.dividas` as before — zero changes required in those files
- Build passes clean (106 modules transformed, 848ms)

## Task Commits

1. **Task 1: Add dividas useState and refactor carregarTudo() for parallel load + compatibility layer** — `d087052` (submodule), `7b6e733` (outer repo) (feat)

**Plan metadata:** (docs commit — see state updates below)

## Files Created/Modified
- `src/mr-3/mr-cobrancas/src/App.jsx` — allDividas useState, Promise.all 8th slot, dividasMap build, JSONB parse removal, compatibility layer

## Decisions Made
- `allDividas` stored as flat `[]` (not Map) for flexibility in future consumer components
- `dividasMap` built inline in async function, not as `useMemo`, to avoid stale closure issues and match the one-time load pattern
- `valorCalc` reduce still uses `div.valor_total` (JSONB field name) — this safely yields 0 for new table rows (column is `valor_original`), with `valorFinal` falling back to `d.valor_original` on devedores row. Transitional state — Plan 05 write-side migration will align field names.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build passed first attempt, all 7 acceptance criteria verified with grep.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None — `dividasMap` is populated from real Supabase data via `dbGet("dividas")`. If the dividas table is empty (migration not yet run or no data seeded), `devedor.dividas` will be `[]`, which is the same behavior as a devedor with no JSONB dívidas. The transition is safe.

## Threat Flags
No new threat surface introduced. dividasMap is built from server response only (no client-side ID generation), satisfying T-01-03-01.

## Next Phase Readiness
- Plan 01-04 (NAV label Devedores → Pessoas) can proceed immediately — no blockers
- Plan 01-05 (write-side migration of 7 surfaces in adicionarDivida, salvarEdicaoDivida, etc.) depends on this read-side migration being complete — it is
- Field name mismatch (JSONB `valor_total` vs table `valor_original`) is a known transitional state; Plan 05 write-side surfaces must use `valor_original` when reading from dividasMap

---
*Phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno*
*Completed: 2026-04-18*
