---
quick_id: 260416-kl8
date: 2026-04-16
status: passed
---

# Quick 260416-kl8: Verification Report

**Verified:** 2026-04-16
**Commit:** 641af4f (submodule src/mr-3/mr-cobrancas)

## Goal

Painel de Devedores deve exibir o saldo devedor real (valor original + encargos - pagamentos parciais) na coluna "Valor Dívida" e no card "Carteira Total", com badge "Parcial" e tooltip quando há pagamentos.

## Verification Results

| Check | Expected | Result |
|-------|----------|--------|
| `calcularSaldoDevedorAtualizado` exists at global scope | function at line ~82 | PASS — found line 82 |
| `allPagamentos` state in App root | useState([]) after lembretesList | PASS — found line 7634 |
| `dbGet("pagamentos_parciais")` in carregarTudo | inside Promise.all | PASS — found line 7646 |
| `setAllPagamentos` called on carregarTudo result | sets array from DB | PASS — found line 7649 |
| Dashboard accepts `allPagamentos` prop | default `[]` | PASS — found line 378 |
| `pgtosPorDevedorCarteira` useMemo in Dashboard | Map devedor_id→pagamentos | PASS — found lines 382–397 |
| `totalCarteira` in Dashboard uses new function | useMemo + calcularSaldoDevedorAtualizado | PASS — found line 394 |
| App root `const hoje` | declared before useMemo | PASS — found line 7738 area |
| App root `pgtosPorDevedorCarteira` useMemo | same pattern | PASS — found lines 7739–7754 |
| App root `totalCarteira` uses new function | useMemo + calcularSaldoDevedorAtualizado | PASS — found line 7751 |
| `allPagamentos={allPagamentos}` passed to Dashboard | active renderPage | PASS — found line 7721 |
| `allPagamentos={allPagamentos}` passed to Devedores | active renderPage | PASS — found line 7722 |
| Devedores accepts `allPagamentos` prop | default `[]` | PASS — found line 2624 |
| `pgtosPorDevedor` useMemo in Devedores | Map devedor_id→pagamentos | PASS — found lines 2629–2637 |
| Table row uses `saldo` not `valorDiv` as display | calcularSaldoDevedorAtualizado call | PASS — found line 3685 |
| Badge "Parcial" shown when temParcial | `#dcfce7` background | PASS — found lines 3687, 3703–3705 |
| Tooltip `title` on `<td>` | Original/Pago/Saldo | PASS — found line 3700 |

## Verdict: PASSED

All 17 checks passed. The implementation matches the spec from CONTEXT.md decisions section.

## Human Validation Required

The following cannot be verified programmatically and require manual testing:
- Load the app with a devedor that has pagamentos_parciais in Supabase
- Verify the "Valor Dívida" column shows the updated saldo (not the original value)
- Verify the "Carteira Total" card reflects the sum of real saldos
- Verify the "Parcial" badge appears next to the value
- Hover the value to see the tooltip breakdown
