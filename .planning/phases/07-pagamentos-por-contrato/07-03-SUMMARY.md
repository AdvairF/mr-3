---
phase: 07-pagamentos-por-contrato
plan: "07-03"
status: complete
completed_at: "2026-04-22"
wave: 3
---

# Plan 07-03 Summary: DetalheContrato payment form

## What Was Built

Extended `DetalheContrato.jsx` with the complete payment registration UI: extended import, 9 new state variables (including `saldoCalculado` for open-time balance), `TIPO_EVENTO_LABELS` updated, `handleAbrirFormPagamento` (computes saldo at open-time), `handleRegistrarPagamento` (PAGCON-05 validations), and the inline form JSX between financial summary and Documentos section.

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Import + 9 state vars + TIPO_EVENTO_LABELS + useEffect reset | ✓ Complete | All 9 vars declared, 2 TIPO_EVENTO_LABELS added, 5 resets added |
| Task 2: handleAbrirFormPagamento + handleRegistrarPagamento + JSX §3b | ✓ Complete | saldoCalculado computed at open-time, 3 PAGCON-05 validations |

## Key Files Modified

- `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx` — 118 lines added

## Must-Haves Verified

- [x] Import extended with registrarPagamentoContrato, excluirPagamentoContrato, listarPagamentosContrato
- [x] 9 state vars declared (registrandoPagamento, salvandoPagamento, pagamentosContrato, pagamentosAberto, pagamentosLoading, pagamentosCarregado, excluindoPagamentoId, formPagamento, saldoCalculado)
- [x] TIPO_EVENTO_LABELS: pagamento_recebido + pagamento_revertido
- [x] handleAbrirFormPagamento computes saldo and calls setSaldoCalculado(total) before opening form
- [x] handleRegistrarPagamento: valor>0, data≤hoje, valor≤saldoCalculado validations
- [x] Toast: "Pagamento registrado. N parcela(s) amortizada(s)."
- [x] useEffect [contrato.id] resets 5 new payment states including saldoCalculado
- [x] Btn "Registrar Pagamento" calls handleAbrirFormPagamento (not setRegistrandoPagamento directly)
- [x] Cancelar resets form + saldoCalculado=0

## Test Gate

- test:regressao: 9/9 passed ✓
- build: 123 modules, no errors ✓

## Self-Check: PASSED
