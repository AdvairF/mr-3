---
phase: 05-contratos-com-parcelas
plan: 05
subsystem: app-shell
tags: [react, app.jsx, integration, contratos, nav, carregartudo]

# Dependency graph
requires:
  - phase: 05-contratos-com-parcelas/05-03
    provides: ModuloContratos.jsx component
  - phase: 05-contratos-com-parcelas/05-04
    provides: TabelaDividas badge + DetalheDivida onVerContrato
provides:
  - "App.jsx — ModuloContratos import, I.contratos icon, allContratos state, carregarTudo contratos_dividas fetch, _contrato_tipo enrichment, NAV entry, renderPage case"
affects:
  - "Phase 5 complete — all 5 plans integrated and visible to user"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "contratosMap built from contratos result before dividasMap loop — enables O(1) lookup per divida"
    - "Promise.all extended to 9 items — contratos_dividas loaded in parallel with other data"
    - "_contrato_tipo enrichment via contratosMap.get with nullish coalescing fallback"

key-files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx

key-decisions:
  - "NAV entry for Contratos placed after Dívidas per D-07 (LOCKED)"
  - "contratosMap built BEFORE dividasMap loop so _contrato_tipo enrichment has map available"
  - "allContratos state added next to allDividas for symmetry"
  - "ModuloContratos receives same prop signature as ModuloDividas plus allContratos"

requirements-completed: [CON-01, CON-02, CON-03, CON-04, CON-05]

# Metrics
duration: ~5min
completed: 2026-04-21
---

# Phase 5 Plan 05: App.jsx Integration of ModuloContratos Summary

**Five targeted edits wiring ModuloContratos into App.jsx: import, I.contratos icon, allContratos state + carregarTudo contratos_dividas fetch + _contrato_tipo enrichment, Contratos NAV entry, and renderPage case — completing Phase 5 integration**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-21T20:05:00Z
- **Completed:** 2026-04-21T20:10:00Z
- **Tasks:** 1 auto (complete) + 1 checkpoint:human-verify (pending)
- **Files modified:** 1

## Accomplishments

- App.jsx (line 63): Added `import ModuloContratos from "./components/ModuloContratos.jsx";` after ModuloDividas import
- App.jsx (line 133): Added `I.contratos` SVG icon (document-with-grid motif, distinct from I.dividas/I.proc) to I object after I.dividas
- App.jsx (line 8326): Added `const [allContratos, setAllContratos] = useState([]);` next to allDividas
- App.jsx (line 8331): Extended Promise.all destructuring to 9 elements: added `contratos` variable and `dbGet("contratos_dividas", "order=created_at.desc")` call
- App.jsx (line 8345): Added `setAllContratos(Array.isArray(contratos) ? contratos : []);` after Promise.all setters
- App.jsx (line 8348): Added `const contratosMap = new Map((contratos || []).map(c => [c.id, c.tipo]));` before dividasMap — enables O(1) lookup
- App.jsx (line 8362): Added `_contrato_tipo: div.contrato_id ? (contratosMap.get(div.contrato_id) ?? null) : null,` inside dividasMap.get(k).push({...}) object
- App.jsx (line 8443): Added `{ id: "contratos", label: "Contratos", icon: I.contratos, color: "#0d9488", bg: "rgba(13,148,136,.18)" }` to NAV array after dívidas entry
- App.jsx (lines 8487-8498): Added `case "contratos": return <ModuloContratos allContratos={allContratos} allDividas={allDividas} devedores={devedores} credores={credores} allPagamentos={allPagamentos} hoje={hoje_app} onCarregarTudo={carregarTudo} setTab={setTab} />;`

## Task Commits

1. **Task 1: Wire ModuloContratos into App.jsx** — `daa1b7a` (submodule) / `86b19fd` (main bump)

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/App.jsx` — all 5 integration additions

## Decisions Made

- contratosMap is built immediately after Promise.all resolves, before dividasMap loop, so _contrato_tipo enrichment is O(1) per divida
- NAV entry color #0d9488 (teal-600) matches design spec D-07
- ModuloContratos prop signature matches ModuloDividas for consistency (allContratos added, devedorPreSelecionado omitted per interface spec)

## Deviations from Plan

None — plan executed exactly as written. All 5 edits match the plan specification.

## Known Stubs

None. All additions are fully functional:
- allContratos state is populated from contratos_dividas table on carregarTudo
- _contrato_tipo enrichment flows to TabelaDividas badges (Plan 04 implemented the rendering)
- NAV entry renders ModuloContratos via renderPage switch case

## Threat Flags

None — T-05-15, T-05-16, T-05-17 all accepted per plan threat model. No new endpoints beyond the single dbGet("contratos_dividas") added to authenticated Promise.all.

## Self-Check: PASSED

- `src/mr-3/mr-cobrancas/src/App.jsx` modified and committed (daa1b7a / 86b19fd)
- grep confirms all 9 acceptance criteria present in file
- ModuloContratos.jsx exists at expected path

---
*Phase: 05-contratos-com-parcelas*
*Completed: 2026-04-21*
