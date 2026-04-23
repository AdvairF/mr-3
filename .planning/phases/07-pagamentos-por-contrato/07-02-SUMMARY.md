---
phase: 07-pagamentos-por-contrato
plan: "07-02"
status: complete
completed_at: "2026-04-22"
wave: 2
---

# Plan 07-02 Summary: contratos.js Service Layer

## What Was Built

Extended `contratos.js` with `sb` import, `PAG_TABLE` constant, and 3 exported functions for pagamentos por contrato: `registrarPagamentoContrato`, `excluirPagamentoContrato`, `listarPagamentosContrato`.

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Import sb, add PAG_TABLE, 3 new functions | ✓ Complete | All acceptance criteria verified |

## Key Files Modified

- `src/mr-3/mr-cobrancas/src/services/contratos.js` — 23 lines added

## Changes (AFTER)

- L64: `import { dbGet, dbInsert, dbUpdate, sb } from "../config/supabase.js"`
- L68: `const PAG_TABLE = "pagamentos_contrato"`
- L247-264: `registrarPagamentoContrato`, `excluirPagamentoContrato`, `listarPagamentosContrato`

## Must-Haves Verified

- [x] `sb` imported from `../config/supabase.js`
- [x] `PAG_TABLE = "pagamentos_contrato"` declared
- [x] `registrarPagamentoContrato` calls `sb("rpc/registrar_pagamento_contrato", "POST", {...})`
- [x] `excluirPagamentoContrato` calls `sb("rpc/reverter_pagamento_contrato", "POST", { p_pagamento_id })`
- [x] `listarPagamentosContrato` calls `dbGet(PAG_TABLE, "contrato_id=eq....")`
- [x] No `supabase.rpc()` calls

## Test Gate

- test:regressao: 9/9 passed ✓
- build: 123 modules, no errors ✓

## Self-Check: PASSED
