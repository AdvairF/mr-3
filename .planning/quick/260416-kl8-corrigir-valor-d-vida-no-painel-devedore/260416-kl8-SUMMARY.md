---
quick_id: 260416-kl8
date: 2026-04-16
status: complete
phase: quick
plan: 260416-kl8
subsystem: devedores-painel
tags: [saldo-devedor, pagamentos-parciais, encargos, carteira-total, badge]
tech_stack:
  added: []
  patterns: [useMemo-map-lookup, pure-utility-function, prop-drilling]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "Declared pgtosPorDevedorCarteira as useMemo Map in both Dashboard and App root independently — same name, different component scopes, no conflict"
  - "Declared hoje unconditionally at top of Devedores body to avoid shadowing issues with any downstream usage"
  - "Kept valorDiv declaration in Devedores table row for use in the tooltip title only"
metrics:
  duration: "~15 min"
  completed: 2026-04-16
  tasks_completed: 3
  files_changed: 1
---

# Quick 260416-kl8: Corrigir Valor Dívida no Painel Devedores — Summary

**One-liner:** Saldo devedor real com encargos e abatimento de pagamentos parciais substituiu valor original bruto na coluna Valor Dívida e nos dois cards Carteira Total.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add calcularSaldoDevedorAtualizado utility + allPagamentos state | 641af4f | src/mr-3/mr-cobrancas/src/App.jsx |
| 2 | Wire carregarTudo, update totalCarteira in Dashboard + App root, pass props | 641af4f | src/mr-3/mr-cobrancas/src/App.jsx |
| 3 | Update Devedores — accept prop, build lookup map, update table row | 641af4f | src/mr-3/mr-cobrancas/src/App.jsx |

## What Was Built

### calcularSaldoDevedorAtualizado (line 82)
Pure utility function inserted at global scope between `calcCorrecao` and the ICONS block. Implements the same iterative period-by-period logic as `gerarPlanilhaPDF`: applies `calcularFatorCorrecao` + `calcularJurosAcumulados` per period, abates partial payments in chronological order, then runs a final period to today. Returns `saldoTotal` (sum of all dividas after encargos minus payments).

### allPagamentos state (line 7634)
`const [allPagamentos, setAllPagamentos] = useState([])` added after `lembretesList` in App root state block. Populated by `carregarTudo` via `dbGet("pagamentos_parciais")` in the existing `Promise.all`.

### Dashboard (line 378)
- Signature updated: `allPagamentos = []` prop added
- `pgtosPorDevedorCarteira` useMemo Map built from `allPagamentos`
- `totalCarteira` converted to `useMemo` calling `calcularSaldoDevedorAtualizado` per devedor
- `hoje` at line 285 reused — not re-declared

### App root totalCarteira (line 7739)
- `const hoje = new Date().toISOString().slice(0, 10)` added before it (did not exist nearby)
- Same `pgtosPorDevedorCarteira` useMemo Map pattern
- Same `totalCarteira` useMemo calling `calcularSaldoDevedorAtualizado`

### Devedores component (line 2624)
- Signature updated: `allPagamentos = []` prop added
- `pgtosPorDevedor` useMemo Map built at top of component body
- `hoje` declared unconditionally at top of component body
- Table row: `valorDiv` kept for tooltip, `saldo` computed via `calcularSaldoDevedorAtualizado`
- Badge "Parcial" (green `#dcfce7`) shown when `pgtosDev.length > 0`
- `<td title>` shows `Original: R$X | Pago: R$Y | Saldo: R$Z` for devedores with payments

### Active renderPage (line 7721)
Both `Dashboard` and `Devedores` call sites updated with `allPagamentos={allPagamentos}`. Dead code inside `__old_broken_backup()` (~line 7351) left untouched.

## Deviations from Plan

None — plan executed exactly as written. The `node --check` command failed with `ERR_UNKNOWN_FILE_EXTENSION` for `.jsx` (expected — Node.js cannot check JSX syntax natively). Artifact verification was done via grep and confirmed all required strings are present at correct locations.

## Known Stubs

None — all data is wired from Supabase via `dbGet("pagamentos_parciais")`. When `allPagamentos` is empty (loading or no partial payments), `calcularSaldoDevedorAtualizado` returns full encargos value — correct behavior per plan spec.

## Threat Flags

None beyond what was documented in the plan threat model.

## Self-Check

- `function calcularSaldoDevedorAtualizado` — FOUND at line 82
- `allPagamentos, setAllPagamentos` — FOUND at line 7634
- `dbGet("pagamentos_parciais")` — FOUND at line 7646
- `setAllPagamentos(` — FOUND at line 7649
- `pgtosPorDevedorCarteira` — FOUND at lines 382, 394, 397, 7739, 7751, 7754
- `allPagamentos = []` in Dashboard — FOUND at line 378
- `allPagamentos = []` in Devedores — FOUND at line 2624
- `allPagamentos={allPagamentos}` in active renderPage — FOUND at lines 7721, 7722
- `pgtosPorDevedor` Map in Devedores — FOUND at line 2629
- `temParcial` — FOUND at lines 3687, 3700, 3703
- `#dcfce7` badge in table row — FOUND at line 3704
- Commit 641af4f — FOUND

## Self-Check: PASSED
