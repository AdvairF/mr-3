---
phase: 05-contratos-com-parcelas
plan: 04
subsystem: ui
tags: [react, components, badges, inline-styles, contratos, parcelas]

# Dependency graph
requires:
  - phase: 05-contratos-com-parcelas/05-01
    provides: contrato_id FK column on dividas, _contrato_tipo enriched alias in carregarTudo
provides:
  - "TabelaDividas.jsx — CONTRATO_BADGE_META const + inline contract-type badge in Credor cell"
  - "DetalheDivida.jsx — onVerContrato optional prop + '← Ver contrato' link above PagamentosDivida"
affects:
  - "05-05: ModuloContratos will pass onVerContrato to DetalheDivida when opening a parcela"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IIFE pattern (() => { ... })() inside JSX for badge lookup with fallback"
    - "Optional prop pattern: onVerContrato absent → button hidden (undefined && ... is falsy)"
    - "CONTRATO_BADGE_META lookup with graceful fallback to raw string + neutral colors"

key-files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx
    - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx

key-decisions:
  - "D-08 enforced: [NF]/[C&V]/[Empr.] badges inline in Credor cell, conditioned on contrato_id != null && _contrato_tipo != null"
  - "D-09 enforced: '← Ver contrato' link above PagamentosDivida, shown only when contrato_id && onVerContrato prop both truthy"
  - "Badge font size 10 (smaller than 11 used by StatusBadgeDivida) per UI-SPEC inline badge spec"
  - "onVerContrato(divida.contrato_id) — passes ID only, not full divida object"

requirements-completed: [CON-05]

# Metrics
duration: ~5min
completed: 2026-04-21
---

# Phase 5 Plan 04: Contract-Type Badges + Ver Contrato Link Summary

**Surgical two-file modification: CONTRATO_BADGE_META inline badge in TabelaDividas Credor cell + optional onVerContrato prop with '← Ver contrato' link in DetalheDivida above PagamentosDivida**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-21T20:00:00Z
- **Completed:** 2026-04-21T20:05:00Z
- **Tasks:** 2 (both auto)
- **Files modified:** 2

## Accomplishments

- TabelaDividas.jsx: Added `CONTRATO_BADGE_META` constant (3 contract types) immediately after `STATUS_DIVIDA_META`. Credor `<td>` now appends a colored pill badge when `d.contrato_id != null && d._contrato_tipo != null`. Badge uses IIFE pattern with fallback for unknown tipos. Font size 10, marginLeft 4, verticalAlign middle.
- DetalheDivida.jsx: Added `onVerContrato` as optional 9th destructured prop. Inserted "← Ver contrato" button block immediately before the `{/* 6. Pagamentos */}` comment — renders only when `divida.contrato_id && onVerContrato` are both truthy. Button calls `onVerContrato(divida.contrato_id)`, styled as link (background none, padding 0, fontSize 13, fontWeight 700, color #64748b).

## Task Commits

1. **Task 1: TabelaDividas badge** — `fe32e50` (submodule) / `e7454e3` (main bump)
2. **Task 2: DetalheDivida onVerContrato** — `802ad72` (submodule) / `dc6c5da` (main bump)

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` — CONTRATO_BADGE_META + badge in Credor cell
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — onVerContrato prop + "← Ver contrato" link

## Decisions Made

- Used IIFE `(() => { ... })()` pattern inside JSX for the badge lookup with fallback — avoids extracting a helper function while keeping the lookup readable
- `onVerContrato` is position-9 in destructuring (after existing 8 props) — no positional conflicts

## Deviations from Plan

None — plan executed exactly as written. Both tasks implemented the exact JSX snippets specified in the plan interfaces section.

## Known Stubs

None. Both modifications are fully functional:
- TabelaDividas badge renders live when `_contrato_tipo` is populated (enriched in carregarTudo by Plan 05)
- DetalheDivida "← Ver contrato" link is wired to the callback — ModuloContratos (Plan 05-05) will pass `onVerContrato` when calling DetalheDivida for a parcela

## Threat Flags

None — no new network endpoints, auth paths, or schema changes introduced. T-05-13 (XSS via _contrato_tipo) mitigated by CONTRATO_BADGE_META lookup (value never rendered raw unless unknown type, in which case it's from an authenticated DB read). T-05-14 (onVerContrato callback) accepted per plan threat model.

## Self-Check: PASSED

- `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` modified and committed (fe32e50)
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` modified and committed (802ad72)
- All 9 TabelaDividas acceptance criteria verified via grep
- All 7 DetalheDivida acceptance criteria verified via grep

---
*Phase: 05-contratos-com-parcelas*
*Completed: 2026-04-21*
