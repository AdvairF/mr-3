---
phase: 05-contratos-com-parcelas
plan: 03
subsystem: ui
tags: [react, contratos, parcelas, lazy-load, state-machine, inline-styles]

# Dependency graph
requires:
  - phase: 05-contratos-com-parcelas/05-01
    provides: contratos.js service (listarContratos)
  - phase: 05-contratos-com-parcelas/05-02
    provides: TabelaContratos.jsx + NovoContrato.jsx components
provides:
  - ModuloContratos.jsx — 4-view state machine (lista/detalhe/novo/parcela-detalhe) module shell
  - DetalheContrato.jsx — contract detail with header card, green financial summary, parcelas table with lazy saldo
affects:
  - 05-04 (App.jsx integration — will mount ModuloContratos)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy per-parcela saldo: Promise.all(parcelas.map(async p => listarPagamentos(p.id).then(pgtos => calcularSaldoPorDividaIndividual(p, pgtos, hoje))))"
    - "4-view state machine in ModuloContratos: lista / detalhe / novo / parcela-detalhe"
    - "parcelasPorContrato useMemo Map<contrato_id, divida[]> built once from allDividas"
    - "contratosAtivos count: filter by at least 1 non-quitado parcela in parcelasPorContrato Map"
    - "DetalheContrato green financial card: linear-gradient(135deg,#f0fdf4 0%,#fff 100%), border #bbf7d0"

key-files:
  created:
    - src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx
    - src/mr-3/mr-cobrancas/src/components/ModuloContratos.jsx
  modified: []

key-decisions:
  - "DetalheContrato uses listarPagamentos per parcela (not allPagamentos prop) for accurate per-parcela saldo"
  - "saldosLoading shows 'Carregando parcelas...' at table level (not per-cell) for better UX"
  - "parcela-detalhe view embeds DetalheDivida with onVerContrato callback to navigate back to DetalheContrato"
  - "contratosAtivos count uses parcelasPorContrato Map .some(d => !d.saldo_quitado) for correctness"

# Metrics
duration: ~2min
completed: 2026-04-21
---

# Phase 5 Plan 03: ModuloContratos + DetalheContrato Summary

**Module shell (4-view state machine) + contract detail view with lazy per-parcela saldo via listarPagamentos + Art. 354 CC calcularSaldoPorDividaIndividual, green financial summary card, and embedded DetalheDivida for parcela navigation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-21T19:51:18Z
- **Completed:** 2026-04-21T19:53:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- DetalheContrato.jsx: header card with tipo badge + referencia/tipo display (22px Space Grotesk), credor/devedor line, num_parcelas·valor·data_inicio line. Green financial summary card (f0fdf4 gradient, bbf7d0 border) with 3 tiles (Valor Total / Total Quitado / Em Aberto). Parcelas table with lazy saldo: useEffect triggers Promise.all on mount, loading state shows "Carregando parcelas...", each cell shows "Calculando..." while loading. Quitado badge (#dcfce7/#065f46) for saldo_quitado=true, AtrasoCell for non-quitado. Row click calls onVerDetalhe(p).

- ModuloContratos.jsx: 4-view state machine (lista / detalhe / novo / parcela-detalhe). parcelasPorContrato Map built once via useMemo from allDividas. contratosAtivos count uses Map + .some(d => !d.saldo_quitado). Teal #0d9488 theme for count badge and Btn. All 4 child components mounted with correct prop sets. Embedded DetalheDivida for parcela-detalhe view wires onVerContrato to navigate back to DetalheContrato.

## Task Commits

1. **Task 1: DetalheContrato.jsx** — `ffd0a06` (submodule) / `4849ee6` (parent bump) feat(05-03): create DetalheContrato.jsx
2. **Task 2: ModuloContratos.jsx** — `5b91c03` (submodule) / `4849ee6` (parent bump) feat(05-03): create ModuloContratos.jsx

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx` — Contract detail view with lazy saldo loading, green financial summary, parcelas table
- `src/mr-3/mr-cobrancas/src/components/ModuloContratos.jsx` — 4-view module shell with parcelasPorContrato Map and contratosAtivos count

## Decisions Made

- DetalheContrato reads pagamentos per-parcela via listarPagamentos (not the allPagamentos prop) to get accurate individual saldos — allPagamentos is kept in the signature for API consistency with other modules but unused for saldo calculation.
- parcelasPorContrato useMemo in ModuloContratos builds the Map once from allDividas and passes it to TabelaContratos, avoiding repeated Array.filter calls per render.

## Deviations from Plan

None — plan executed exactly as written. Both components implement all acceptance criteria as specified.

## Known Stubs

None — both components are fully wired:
- DetalheContrato calls listarPagamentos per parcela (real Supabase requests)
- ModuloContratos passes real allContratos / allDividas / devedores / credores props (to be provided by App.jsx in Plan 05-04/05-05)

## Threat Flags

None — all trust boundaries documented in the plan's threat model. No new surfaces introduced beyond the plan's scope (T-05-10, T-05-11, T-05-12 all accepted).

## Self-Check: PASSED

- FOUND: src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx
- FOUND: src/mr-3/mr-cobrancas/src/components/ModuloContratos.jsx
- VERIFIED: DetalheContrato uses green #f0fdf4 gradient (not red #fff5f5 from DetalheDivida)
- VERIFIED: parcela-detalhe view present in ModuloContratos
- VERIFIED: All acceptance criteria met for both tasks

---
*Phase: 05-contratos-com-parcelas*
*Completed: 2026-04-21*
