---
phase: 02-modulo-dividas-sidebar
plan: "02"
subsystem: ui
tags: [react, filter, table, dividas, inline-style, pagination, saldo]

# Dependency graph
requires:
  - phase: 02-01
    provides: "AtrasoCell.jsx — 5-tier atraso badge component"
provides:
  - "FiltroDividas.jsx: 4-filter bar (Status, Credor, Devedor text, Atraso) with active chips and onFiltrosChange callback"
  - "TabelaDividas.jsx: 8-column paginated table with alias-safe saldo calculation and AtrasoCell/StatusBadgeDivida integration"
affects:
  - 02-03-ModuloDividas (imports FiltroDividas + TabelaDividas as list view)
  - 02-04-AppJsx (no direct dependency but completes the component set)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-filter bar with active chips: each chip click clears its individual filter"
    - "300ms debounce via useRef for text input — controlled-by-key pattern for imperative reset"
    - "buildDevedorObjParaSaldo: bridge from raw allDividas row to alias-enriched devedores[i] for correct motor input"
    - "Pagination at POR_PAG=20 with useEffect reset to page 1 when dividas prop changes"
    - "Null credor: italic em-dash span in JSX text (no dangerouslySetInnerHTML)"
    - "Row-level hover via hoveredRow state + onMouseEnter/Leave"

key-files:
  created:
    - mr-cobrancas/src/components/FiltroDividas.jsx
    - mr-cobrancas/src/components/TabelaDividas.jsx
    - mr-cobrancas/src/components/AtrasoCell.jsx
  modified: []

key-decisions:
  - "AtrasoCell.jsx added to this branch (wave-2 worktree lacked wave-1 output since worktrees diverge from separate commits)"
  - "useEffect dependency array excludes onFiltrosChange to avoid stale closure re-renders (eslint-disable-next-line comment added)"
  - "buscaKey pattern used for imperative input reset on busca chip clear — avoids controlled/uncontrolled input conflict"
  - "buildDevedorObjParaSaldo defined at file top-level (not inline) per FilaDevedor.jsx local-helper convention"

patterns-established:
  - "FiltroDividas pattern: 4 dropdowns/inputs in flex row, chip strip below, useEffect fires onFiltrosChange on every state change"
  - "TabelaDividas pattern: receive pre-filtered dividas[], compute saldo per row from devedores[], paginate at 20"

requirements-completed:
  - REQ-04
  - REQ-05

# Metrics
duration: 3min
completed: 2026-04-20
---

# Phase 2 Plan 02: FiltroDividas.jsx + TabelaDividas.jsx Summary

**4-filter bar with active chips (FiltroDividas) + 8-column paginated table with alias-safe per-row saldo (TabelaDividas), both inline-style only, zero new Supabase calls**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-20T15:20:50Z
- **Completed:** 2026-04-20T15:23:54Z
- **Tasks:** 2
- **Files modified:** 3 (2 new components + AtrasoCell forward-ported)

## Accomplishments
- FiltroDividas.jsx: 4 filter controls render, active chips appear for each active filter, onFiltrosChange fires on every state change, 300ms debounce on text input
- TabelaDividas.jsx: 8-column table with correct data join, alias-safe buildDevedorObjParaSaldo, AtrasoCell + StatusBadgeDivida integrated, pagination at 20/page, empty state, null-credor italic display
- Regression suite (9/9) passes after both files created

## Task Commits

Each task was committed atomically:

1. **Task 1: Create FiltroDividas.jsx** — `813bc83` (feat)
2. **Task 2: Create TabelaDividas.jsx** — `8231128` (feat)

## Files Created/Modified
- `mr-cobrancas/src/components/FiltroDividas.jsx` — 4-filter bar with active chips, onFiltrosChange callback, 300ms debounce
- `mr-cobrancas/src/components/TabelaDividas.jsx` — 8-column paginated table, buildDevedorObjParaSaldo, AtrasoCell/StatusBadgeDivida
- `mr-cobrancas/src/components/AtrasoCell.jsx` — Pure 5-tier atraso badge (forward-ported from wave 1 for this worktree branch)

## Decisions Made
- AtrasoCell.jsx was not in our worktree's branch (worktree-agent-a9bc7440 was created at 95b3aee, before wave 1's AtrasoCell commit 3f6079a). The file was recreated from the inner submodule's copy to ensure TabelaDividas's import resolves correctly. Content is identical.
- `useEffect` dependency array omits `onFiltrosChange` — parent passes a stable function reference; including it would cause unnecessary re-fires. ESLint disable comment added per plan spec.
- `buscaKey` counter pattern chosen for text input reset: allows `defaultValue=""` (uncontrolled) to avoid input lag while still enabling programmatic clear from chip click.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Forward-ported AtrasoCell.jsx to this worktree branch**
- **Found during:** Task 2 setup (TabelaDividas imports AtrasoCell)
- **Issue:** This worktree branch (worktree-agent-a9bc7440) was created at commit 95b3aee before wave 1's AtrasoCell commit (3f6079a) was made in the inner submodule. The inner submodule's object store is separate from this worktree's git objects — cherry-pick was not possible.
- **Fix:** Recreated AtrasoCell.jsx from the inner submodule's file (content identical) and committed it to this branch in Task 1 commit.
- **Files modified:** mr-cobrancas/src/components/AtrasoCell.jsx
- **Verification:** File matches inner submodule content; regression tests still green.
- **Committed in:** 813bc83 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking — missing dependency from wave-1 worktree isolation)
**Impact on plan:** Necessary to unblock TabelaDividas import. Content is identical to wave-1 output; no functional difference.

## Issues Encountered
- npm node_modules was empty in the worktree (not initialized) — ran `npm install --prefix mr-cobrancas` to make vitest available for regression tests. This is the same issue wave 1 encountered.

## Known Stubs

None — FiltroDividas calls real onFiltrosChange callbacks; TabelaDividas receives real dividas/devedores/credores/allPagamentos props from parent. buildDevedorObjParaSaldo uses live devedores[i].dividas aliases. No hardcoded data.

## Threat Flags

No new network endpoints, auth paths, file access patterns, or schema changes. FiltroDividas is a pure client-side filter component; TabelaDividas is a pure read-only display component. React auto-escapes all JSX text nodes (devedor.nome, credor.nome). No dangerouslySetInnerHTML used.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- FiltroDividas.jsx ready for import in ModuloDividas.jsx (plan 02-03): `import FiltroDividas from "./FiltroDividas.jsx"`
- TabelaDividas.jsx ready for import in ModuloDividas.jsx (plan 02-03): `import TabelaDividas from "./TabelaDividas.jsx"`
- Usage pattern: `<FiltroDividas credores={credores} onFiltrosChange={setFiltros} />` + `<TabelaDividas dividas={filteredDividas} devedores={devedores} credores={credores} allPagamentos={allPagamentos} hoje={hoje} onVerDetalhe={handleVerDetalhe} />`

## Self-Check

### Files exist:
- `mr-cobrancas/src/components/FiltroDividas.jsx` — FOUND
- `mr-cobrancas/src/components/TabelaDividas.jsx` — FOUND
- `mr-cobrancas/src/components/AtrasoCell.jsx` — FOUND

### Commits exist:
- `813bc83` — FOUND (Task 1: FiltroDividas + AtrasoCell)
- `8231128` — FOUND (Task 2: TabelaDividas)

## Self-Check: PASSED

---
*Phase: 02-modulo-dividas-sidebar*
*Completed: 2026-04-20*
