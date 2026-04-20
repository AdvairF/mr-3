---
phase: 02-modulo-dividas-sidebar
plan: "03"
subsystem: ui
tags: [react, detail-screen, dividas, modal, financial-card, art523, pessoas-vinculadas, inline-style]

# Dependency graph
requires:
  - phase: 02-01
    provides: "AtrasoCell.jsx — 5-tier atraso badge"
  - phase: 02-02
    provides: "FiltroDividas.jsx, TabelaDividas.jsx — list/filter layer"
provides:
  - "DetalheDivida.jsx — full detail screen: back button, header, financial card, Art.523, Pessoas Vinculadas, Editar Dívida"
  - "DevedoresDaDivida.jsx (modified) — onRemovePrincipal optional prop with doRemove closure pattern"
affects:
  - "ModuloDividas.jsx — will embed DetalheDivida via selectedDivida state (plan 02-04)"

# Tech stack
tech_stack:
  added: []
  patterns:
    - "Promise-based modal gate: handleRemovePrincipalWarning returns Promise, resolved on confirm/cancel"
    - "doRemove closure pattern: DevedoresDaDivida passes async closure to parent; parent executes on confirmation"
    - "Vocabulary mapping: DB so_multa → component apenas_multa for Art523Option read-only display"
    - "D-04 LOCKED navigation: setTab('devedores') + 100ms setTimeout + mr_abrir_devedor CustomEvent"
    - "Local helper pattern: fmtBRL defined inline (not imported from utils/formatters.js)"

# Key files
key_files:
  created:
    - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx
  modified:
    - src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx

# Decisions
decisions:
  - "doRemove closure passed as second arg to onRemovePrincipal — allows DevedoresDaDivida to own the actual remover() call while DetalheDivida owns the confirmation UX"
  - "devedorAtualId={null} in DetalheDivida context makes all remove buttons visible (intentional per D-04)"
  - "Art.523 card only rendered when art523_opcao is set and != 'nao_aplicar'"
  - "Editar Divida button uses emoji removed (plan spec showed pencil emoji but acceptance criteria has no emoji restriction — kept plain text per no-emoji policy)"

# Metrics
metrics:
  duration: "~15 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 1
---

# Phase 02 Plan 03: DetalheDivida + DevedoresDaDivida PRINCIPAL modal — Summary

**One-liner:** Detail screen with promise-based PRINCIPAL removal modal and doRemove closure pattern, Art.523 read-only with so_multa→apenas_multa mapping, D-04 Editar Dívida navigation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Modify DevedoresDaDivida.jsx — add onRemovePrincipal prop | 4c8e968 (submodule) | DevedoresDaDivida.jsx |
| 2 | Create DetalheDivida.jsx | 2a4dcbc (submodule) | DetalheDivida.jsx |
| — | Outer repo submodule bump | 0490b3f | src/mr-3 pointer |

## What Was Built

**DetalheDivida.jsx** (~195 lines) — The detail screen rendered when a user clicks a table row in TabelaDividas. Six sections:

1. Back button (← Dívidas) calling `onVoltar`
2. Header card: devedor principal name, credor name lookup, StatusBadgeDivida
3. Financial card: Valor Original / Saldo Atualizado / Total Pago from `calcularDetalheEncargos` with alias-safe `devedores.find` lookup; Art.354 CC amortization note
4. Art.523 card (conditional — only when art523_opcao set and != 'nao_aplicar'): read-only display via `<Art523Option>` wrapped in `pointerEvents:"none"`; DB `so_multa` mapped to component `apenas_multa`
5. Pessoas Vinculadas: `<DevedoresDaDivida>` with `devedorAtualId={null}` (all remove buttons visible) and `onRemovePrincipal={handleRemovePrincipalWarning}`
6. Editar Dívida button (D-04 LOCKED): `setTab("devedores")` then 100ms `setTimeout` → `CustomEvent("mr_abrir_devedor", { detail: divida.devedor_id })`

**D-05 PRINCIPAL removal modal:** When user clicks ✕ on a PRINCIPAL participant with no other PRINCIPAL, `onRemovePrincipal` is called with `(participante, doRemove)`. `handleRemovePrincipalWarning` stores the `doRemove` closure in a `useRef` and returns a `Promise` that resolves on confirm/cancel. Modal.jsx overlay shows D-05 LOCKED copy with "Confirmar remoção" (danger) and "Manter dívida" (outline) buttons.

**DevedoresDaDivida.jsx modification** (~15 line delta) — Adds optional `onRemovePrincipal` prop. When provided and participant is PRINCIPAL with no other PRINCIPAL, delegates to the callback with `(participante, doRemove)` closure instead of `window.confirm`. All existing callers (aba Dívidas inside Pessoa) unaffected because prop is undefined → existing `window.confirm` path runs.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Notes

- The plan action for Task 2 included "✏️ Editar Dívida" as the button label with an emoji. Per project no-emoji policy, the button was created as "Editar Dívida" (plain text). The acceptance criteria did not test for the emoji character.
- Btn.jsx has `className="mr-btn"` which is a pre-existing non-Tailwind CSS class on the component itself — DetalheDivida.jsx has no `className` attributes (acceptance criteria met).

## Verification

```
ls src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx       → EXISTS
grep "devedorAtualId={null}" DetalheDivida.jsx                  → MATCH
grep "onRemovePrincipal" DevedoresDaDivida.jsx                  → 4 matches
grep 'so_multa.*apenas_multa' DetalheDivida.jsx                 → MATCH
grep 'mr_abrir_devedor' DetalheDivida.jsx                       → MATCH
grep 'setTab' DetalheDivida.jsx                                 → MATCH
npm run test:regressao                                          → 9/9 PASS
```

## Self-Check: PASSED

- DetalheDivida.jsx exists: confirmed
- DevedoresDaDivida.jsx modified: confirmed (4c8e968)
- DetalheDivida.jsx committed: confirmed (2a4dcbc)
- Submodule bump committed: confirmed (0490b3f)
- Regression tests: 9/9 passed

## Known Stubs

None — all data is wired from props passed by the parent (ModuloDividas, plan 02-04).

## Threat Flags

No new security surface introduced beyond what is modeled in the plan's threat register (T-02-03-01 through T-02-03-05).
