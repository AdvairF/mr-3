---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
plan: "05"
subsystem: ui
tags: [react, jsx, label-rename, nav, dashboard]

requires:
  - phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
    provides: "Refactored write surfaces and dividas service layer"

provides:
  - "NAV sidebar label 'Pessoas' (was 'Devedores') — display only, id unchanged"
  - "Dashboard KPI card label 'Pessoas' (was 'Devedores')"

affects: [01-06]

tech-stack:
  added: []
  patterns:
    - "UI-only label rename: change label string, never touch id or internal variable"

key-files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx

key-decisions:
  - "Only label strings changed; id: 'devedores' and all internal variable/table names preserved (Decisao 3 LOCKED)"

patterns-established:
  - "Display rename pattern: label field only, routing/state ids remain as-is"

requirements-completed: [REQ-06]

duration: 5min
completed: 2026-04-18
---

# Phase 01 Plan 05: Rename NAV and Dashboard Label Devedores → Pessoas Summary

**Two-string UI rename in App.jsx: NAV sidebar and Dashboard KPI card now display 'Pessoas' while all internal ids, table names, and variable names remain 'devedores' per Decisao 3.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-18T00:00:00Z
- **Completed:** 2026-04-18T00:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- NAV array entry `label` changed from `"Devedores"` to `"Pessoas"` (line 8515 of App.jsx)
- Dashboard KPI card `label` changed from `"Devedores"` to `"Pessoas"` (line 8762 of App.jsx)
- Build passes: 106 modules transformed, no errors
- `id: "devedores"` routing identifier preserved intact

## Task Commits

1. **Task 1: Rename NAV label and Dashboard card** - `80f8ad8` (feat — submodule mr-3)

**Plan metadata (parent repo submodule update):** `08a7d55`

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/App.jsx` — 2 label string changes (lines 8515 and 8762)

## Decisions Made

None — followed plan as specified. Decisao 3 (LOCKED): only display labels change, all internal names unchanged.

## Deviations from Plan

None — plan executed exactly as written. Both string changes applied, acceptance criteria all passed:
- `grep 'label: "Pessoas"'` → 2 matches
- `grep 'label: "Devedores"'` → 0 matches
- `grep 'id: "devedores"'` → 1 match (unchanged)
- Build: 106 modules transformed, success

## Issues Encountered

Submodule structure required committing inside `src/mr-3` first, then updating the parent repo reference — standard submodule workflow, no deviation.

## Known Stubs

None — label change is complete and functional.

## Threat Flags

No new security surface introduced by string label rename.

## Next Phase Readiness

- Plan 01-05 complete. All UI labels for the "Pessoas" rename are now in place.
- Next: Plan 01-06 — Cleanup migration DROP COLUMN (remove legacy JSONB column from devedores table).

---
*Phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno*
*Completed: 2026-04-18*
