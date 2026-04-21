---
plan: 04-04
phase: 4
status: complete
gap_closure: true
started: 2026-04-21
completed: 2026-04-21
files_modified:
  - src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx
  - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx
---

## Summary

Fechamento do gap CR-03: dois bugs cirúrgicos de integração corrigidos em ~14 linhas de React.

## What was built

**Fix A — recalcularESincronizar no mount (PagamentosDivida.jsx):**
- `useEffect` de carga inicial agora chama `recalcularESincronizar(lista)` após `setPagamentos`, sincronizando `saldo_quitado` no banco e propagando o saldo correto para `DetalheDivida` imediatamente ao abrir a tela.
- Adicionada prop opcional `onTotalPagoChange: (total: number) => void` à assinatura do componente.
- `recalcularESincronizar` agora emite a soma de `pagamentos_divida` via `onTotalPagoChange` após cada recálculo (mount + mutações).

**Fix B — Total Pago via pagamentos_divida (DetalheDivida.jsx):**
- Novo state `totalPagoDivida` (null inicial) recebe valor via `onTotalPagoChange`.
- `<PagamentosDivida>` recebe a prop `onTotalPagoChange={(total) => setTotalPagoDivida(total)}`.
- Card financeiro exibe `totalPagoDivida !== null ? fmtBRL(totalPagoDivida) : "—"` em vez de `fmtBRL(totalPago)` (que lia `pagamentos_parciais` via `devedorCalc`).

## Restrições honradas

- `devedorCalc.js` — zero modificações
- `pagamentos_parciais` — não alterado
- `calcularTotalPagoPorDivida` — preservado no import (usado em outros contextos)
- Handlers `handleCriar`, `handleSalvarEdit`, `handleExcluir` — intactos, continuam chamando `recalcularESincronizar`

## Verification

- `test:regressao` — 9/9 passed
- `build` — limpo (apenas warnings de chunk size pré-existentes, sem erros)

## key-files

### key-files.modified
- src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx
- src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx

## Self-Check: PASSED

Todos os acceptance criteria verificados:
- `grep "onTotalPagoChange" PagamentosDivida.jsx` → 3 matches (prop, if-guard, chamada) ✓
- `grep "recalcularESincronizar(lista)" PagamentosDivida.jsx` → 1 match no useEffect ✓
- `grep "setPagamentos(lista)" PagamentosDivida.jsx` → 1 match ✓
- `grep "totalPagoDivida" DetalheDivida.jsx` → 3 matches (useState, setter via prop, JSX) ✓
- `grep "onTotalPagoChange" DetalheDivida.jsx` → 1 match na prop de PagamentosDivida ✓
- Card financeiro usa `totalPagoDivida !== null ? fmtBRL(totalPagoDivida) : "—"` ✓
- `calcularTotalPagoPorDivida` preservado no import ✓
