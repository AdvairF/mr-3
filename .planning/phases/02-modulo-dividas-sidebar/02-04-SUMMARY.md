---
phase: 02-modulo-dividas-sidebar
plan: "04"
subsystem: ui
tags: [react, page-shell, integration, sidebar, nav, app-wiring, inline-style, build-gate]

# Dependency graph
requires:
  - phase: 02-01
    provides: "AtrasoCell.jsx — 5-tier atraso badge"
  - phase: 02-02
    provides: "FiltroDividas.jsx, TabelaDividas.jsx — list/filter layer"
  - phase: 02-03
    provides: "DetalheDivida.jsx, DevedoresDaDivida.jsx (modified) — detail screen"
provides:
  - "ModuloDividas.jsx — top-level page shell: list↔detail navigation via view state, AND filter composition"
  - "App.jsx (modified) — Dívidas tab: icon, NAV entry, renderPage case, sidebar badge"
affects:
  - "All authenticated users — new Dívidas item visible in sidebar nav after Pessoas"

# Tech stack
tech_stack:
  added: []
  patterns:
    - "View state navigation: view ('lista'|'detalhe') + selectedDivida local state — no router"
    - "AND filter composition: allDividas filtered by status, credorId, busca, atrasoMin before passing to TabelaDividas"
    - "Sidebar badge: IIFE pattern inside NAV.map to conditionally render count badge"
    - "setTab prop threading: App.jsx → ModuloDividas → DetalheDivida for D-04 LOCKED navigation"

# Key files
key_files:
  created:
    - path: src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx
      role: "Top-level page shell — holds view + selectedDivida + filtros state; wires FiltroDividas → TabelaDividas → DetalheDivida"
  modified:
    - path: src/mr-3/mr-cobrancas/src/App.jsx
      role: "5 targeted changes: import, I.dividas icon, NAV entry, renderPage case, sidebar badge"

# Decisions
decisions:
  - "I.dividas icon uses file-document SVG with dot at x1=16/x2=16.01 to differentiate from I.proc (processos)"
  - "dividas NAV entry uses same #7c3aed violet as peticao — acceptable per UI-SPEC.md note"
  - "Badge uses IIFE pattern (() => { ... })() inside JSX for conditional count display"
  - "setTab prop chained through ModuloDividas to DetalheDivida per D-04 LOCKED constraint"

# Metrics
metrics:
  duration_minutes: 8
  tasks_completed: 2
  tasks_total: 3
  files_created: 1
  files_modified: 1
  completed_date: "2026-04-20"
---

# Phase 02 Plan 04: ModuloDividas Integration Summary

**One-liner:** ModuloDividas.jsx page shell + 5-point App.jsx wiring delivering the complete Módulo Dívidas feature in the sidebar.

## What Was Built

### Task 1: ModuloDividas.jsx (NEW)

Created `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` (~87 lines).

**Props interface:**
```jsx
export default function ModuloDividas({ allDividas, devedores, credores, allPagamentos, hoje, onCarregarTudo, setTab })
```

**State:**
- `view` ('lista' | 'detalhe') — drives conditional render
- `selectedDivida` — holds the dívida object passed to DetalheDivida
- `filtros` — `{ status, credorId, busca, atrasoMin }` — updated by FiltroDividas via `onFiltrosChange`

**AND filter computation** (derived, no extra state):
- Filters `allDividas` by status, credorId (String coercion), busca (devedor name lookup), atrasoMin (days calculation)
- Passes `dividasFiltradas` to TabelaDividas

**Navigation handlers:**
- `handleVerDetalhe(divida)` → sets selectedDivida + view='detalhe'
- `handleVoltar()` → clears selectedDivida + view='lista'

### Task 2: App.jsx — 5 Targeted Changes

1. **Import** (line 61): `import ModuloDividas from "./components/ModuloDividas.jsx"`

2. **I.dividas icon** (line 129): File-document SVG with dollar-indicating dot at `x1="16" y1="13" x2="16.01" y2="13"` — visually differentiates from I.proc (processos icon)

3. **NAV entry** (line 8532): `{ id: "dividas", label: "Dívidas", icon: I.dividas, color: "#7c3aed", bg: "rgba(124,58,237,.18)" }` — inserted after Pessoas, before Credores

4. **renderPage case** (line 8565): `case "dividas"` renders `<ModuloDividas>` with full props including `setTab={setTab}` for D-04 LOCKED Editar Dívida navigation

5. **Sidebar badge** (line 8730): IIFE inside NAV.map button renders count of `allDividas.filter(d => d.status === "em cobrança").length`; hidden when count = 0; purple badge (`#ede9fe` bg, `#4c1d95` text)

### Build Gate

`npm run build` passed:
- `test:regressao`: 9/9 tests passed
- Vite build: 111 modules transformed, build/index.html generated

## Deviations from Plan

None — plan executed exactly as written. All 5 App.jsx changes applied at the exact insertion points specified.

**Submodule initialization note:** The git worktree had an empty `src/mr-3/` submodule directory. Used `git -c protocol.file.allow=always submodule update --init` with the local repo path to initialize it before proceeding. The `.gitmodules` URL was restored to the original GitHub URL before committing.

## Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create ModuloDividas.jsx (submodule) | 8f2774b |
| 1 | Bump submodule pointer — ModuloDividas.jsx | 40faf32 |
| 2 | Wire App.jsx — 5 changes (submodule) | 044dc0c |
| 2 | Bump submodule pointer — App.jsx wiring | d39dc0e |

## Known Stubs

None — all data flows are wired to real App.jsx state (`allDividas`, `devedores`, `credores`, `allPagamentos`).

## Threat Flags

No new security-relevant surface beyond what is documented in the plan's threat model. All 5 threat entries (T-02-04-01 through T-02-04-05) were reviewed — dispositions are all `accept` with adequate reasoning. No new endpoints, auth paths, or file access patterns introduced.

## Self-Check: PASSED

- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — EXISTS
- `import ModuloDividas` in App.jsx — FOUND (line 61)
- `case "dividas"` in App.jsx renderPage — FOUND (line 8565)
- `{ id: "dividas"` in App.jsx NAV array — FOUND (line 8532)
- Build output `build/index.html` — EXISTS
- Commits 40faf32, d39dc0e — VERIFIED in git log

## Pending

**Task 3 (checkpoint:human-verify):** Browser verification of all 9 checks is awaiting human approval. See PLAN.md for full verification checklist.
