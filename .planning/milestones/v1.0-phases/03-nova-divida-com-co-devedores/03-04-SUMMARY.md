---
plan: 03-04
phase: 03-nova-divida-com-co-devedores
status: complete
completed: 2026-04-20
commit: 8090f6b
---

## Summary

Fixed CR-03: "Total Pago" in DetalheDivida.jsx Resumo Financeiro card was displaying the same value (sum of all debtor payments) for distinct debts of the same debtor.

**Root cause:** Line 77 of DetalheDivida.jsx summed `pagamentosDoDevedor` entirely without filtering per debt.

**Fix:**
- Added `calcularTotalPagoPorDivida(devedor, pagamentos, hoje)` to `devedorCalc.js` using the same Art. 354 CC sequential loop as `calcularSaldosPorDivida`, but tracking `absorbed` (payment consumed per debt) instead of final balance
- Updated `DetalheDivida.jsx` import and line 77 to use `pagoPorDividaMap[String(divida.id)]`

**Critical constraint honored:** `calcularSaldoDevedorAtualizado` and `calcularSaldosPorDivida` were NOT modified — test:regressao 9/9 TJGO cases pass.

## Key Files

- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — added `export function calcularTotalPagoPorDivida` after line 263
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — import updated (line 7), bug line 77 replaced with 2-line map lookup

## Verification

- `export function calcularTotalPagoPorDivida(` present in devedorCalc.js ✓
- `pagoPorDividaMap[String(divida.id)]` present in DetalheDivida.jsx ✓
- `pagamentosDoDevedor.reduce` absent from DetalheDivida.jsx ✓
- Build and test:regressao pass (commit 8090f6b) ✓

## Self-Check: PASSED
