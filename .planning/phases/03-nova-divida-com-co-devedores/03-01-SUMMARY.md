---
phase: 03-nova-divida-com-co-devedores
plan: "01"
subsystem: dividas-form
tags: [refactor, component-extraction, controlled-form, view-routing]
dependency_graph:
  requires: []
  provides:
    - src/components/DividaForm.jsx (stateless controlled form for dívida fields)
    - src/components/NovaDivida.jsx (stub — replaced in Plan 02)
    - ModuloDividas view='nova' routing + "+ Nova Dívida" button
  affects:
    - src/App.jsx (inline form block replaced with DividaForm component)
    - src/components/ModuloDividas.jsx (3-view router: lista/detalhe/nova)
tech_stack:
  added: []
  patterns:
    - Stateless controlled component (no useState for form fields)
    - Prop-delegated onChange(campo, valor) pattern
    - Conditional block rendering via prop presence (onConfirmarParcelas opt-in)
key_files:
  created:
    - src/mr-3/mr-cobrancas/src/components/DividaForm.jsx
    - src/mr-3/mr-cobrancas/src/components/NovaDivida.jsx (stub)
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
    - src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx
decisions:
  - "DividaForm.jsx is a pure controlled component: all form state lives in caller; onChange(campo, valor) delegates every field change up"
  - "Parcelamento block is opt-in: only renders when onConfirmarParcelas prop is provided, making DividaForm reusable in NovaDivida.jsx without parcelamento"
  - "NovaDivida.jsx created as a stub to allow clean build in Plan 01; replaced entirely in Plan 02"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-20"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 03 Plan 01: DividaForm Extraction + ModuloDividas Routing Summary

**One-liner:** Extracted 120-line inline dívida form from App.jsx into reusable stateless `DividaForm.jsx` and wired `ModuloDividas` 3-view router with "+ Nova Dívida" button.

## What Was Built

### Task 1 — DividaForm.jsx (new file)

Created `src/components/DividaForm.jsx` as a pure stateless controlled component.

**Component signature:**
```jsx
export default function DividaForm({ value, onChange, credores, onConfirmarParcelas, onEditParc, onAddParc, onRemParc })
```

**Sections rendered:**
1. Top grid — Descrição (span 2), Valor Total, Data Vencimento, Credor dropdown
2. Diretrizes do Contrato — Indexador, Data Início Atualização, Multa%, Taxa Juros, Juros% a.m., Honorários%, Despesas, Art523Option, regime info banners, competência note
3. Parcelamento (opt-in) — only rendered when `onConfirmarParcelas` prop is present; includes parcelas table with edit/remove
4. Custas Judiciais — always rendered; full add/edit/remove via `onChange("custas", newArray)`

**Key constraint met:** zero `useState` calls — all field changes delegated via `onChange(campo, valor)`.

### Task 2 — App.jsx + ModuloDividas.jsx

**App.jsx changes:**
- Added `import DividaForm from "./components/DividaForm.jsx"` after Art523Option import
- Replaced the entire ~120-line inline form JSX block (lines 3892–4012) with `<DividaForm value={nd} onChange={ND} credores={credores} onConfirmarParcelas={confirmarParcelas} onEditParc={editParc} onAddParc={addParc} onRemParc={remParc} />`
- All state (`nd`), handlers (`ND`, `confirmarParcelas`, `editParc`, `addParc`, `remParc`, `adicionarDivida`, `adicionarCustasAvulsas`) remain in App.jsx unchanged

**ModuloDividas.jsx changes:**
- Added imports: `NovaDivida from "./NovaDivida.jsx"`, `Btn from "./ui/Btn.jsx"`
- Added handlers: `handleNovaDivida()` and `handleVoltarDaNova()`
- Added `<Btn onClick={handleNovaDivida} color="#059669" sm>+ Nova Dívida</Btn>` in lista header
- Added `{view === "nova" && <NovaDivida devedores={...} credores={...} onCarregarTudo={...} onVoltar={handleVoltarDaNova} />}` routing case

**NovaDivida.jsx stub:** Minimal component created to allow clean build; replaced entirely in Plan 02.

## Verification

- All 17 acceptance criteria: PASS
- Regression suite (9/9 tests): PASS
- `npm run build`: PASS (113 modules, 0 errors)

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `46d2bda` | feat(03-01): create DividaForm.jsx — stateless controlled component |
| Task 2 | `37f681f` | feat(03-01): refactor App.jsx + add ModuloDividas view routing |

## Deviations from Plan

None — plan executed exactly as written.

- `Inp` is a named export `{ Inp }` from `./ui/Inp.jsx` (not default), which matched the existing App.jsx import pattern — no deviation, just confirmed from source.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| `export default function NovaDivida() { return <div>NovaDivida — em construção</div>; }` | `src/components/NovaDivida.jsx` | Intentional placeholder per plan task 2 instructions; replaced entirely in Plan 02 |

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. `DividaForm.jsx` is a pure render component with no DB access. All threat mitigations from the plan's STRIDE register are satisfied — `adicionarDivida()` handler in App.jsx is unchanged, Bearer token via `sb()` still applies.

## Self-Check: PASSED

- `src/components/DividaForm.jsx`: FOUND
- `src/components/NovaDivida.jsx`: FOUND
- Commit `46d2bda`: FOUND
- Commit `37f681f`: FOUND
