---
phase: 04-pagamentos-por-divida
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx
  - src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx
  - src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx
  - src/mr-3/mr-cobrancas/src/services/dividas.js
  - src/mr-3/mr-cobrancas/src/services/pagamentos.js
findings:
  critical: 2
  warning: 3
  info: 3
  total: 8
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

This phase introduces the payments-per-debt module (pagamentos_divida table, CRUD UI, and saldo_quitado sync). The architecture is sound: the `calcularSaldoPorDividaIndividual` adapter wraps the existing Art. 354 CC motor cleanly, and the optimistic state pattern in `PagamentosDivida` avoids full page reloads.

Two critical bugs were found. Both are in `pagamentos.js` and involve a mismatch between the actual `dbUpdate`/`dbDelete` helper signatures (defined in `supabase.js`) and how the service calls them — resulting in malformed Supabase REST query strings at runtime. Every edit and delete operation will silently target zero rows. There are also three warnings covering missing edit-form validation, a potential NaN write, and an unguarded `pendingActionRef.current` dereference.

---

## Critical Issues

### CR-01: `dbUpdate` called with pre-built filter string — query becomes double-encoded

**File:** `src/mr-3/mr-cobrancas/src/services/pagamentos.js:52`

**Issue:** `dbUpdate` is defined in `supabase.js` as:
```js
export const dbUpdate = (t, id, b) => sb(t, "PATCH", b, `?id=eq.${id}`);
```
Its second parameter (`id`) is meant to be a bare UUID. `pagamentos.js` passes the full filter expression `id=eq.${pagamentoId}` as that parameter, so the appended query string becomes `?id=eq.id=eq.<uuid>`. Supabase receives a malformed filter and matches zero rows — the PATCH silently does nothing, leaving the record unchanged while the UI shows "Pagamento atualizado".

**Fix:** Pass only the UUID, not the filter expression:
```js
// pagamentos.js line 52 — was:
return dbUpdate(TABLE, `id=eq.${pagamentoId}`, campos);

// fix:
return dbUpdate(TABLE, pagamentoId, campos);
```

---

### CR-02: `dbDelete` called with pre-built filter string — delete targets zero rows

**File:** `src/mr-3/mr-cobrancas/src/services/pagamentos.js:61`

**Issue:** Same class of bug as CR-01. `dbDelete` is defined as:
```js
export const dbDelete = (t, id) => sb(t, "DELETE", null, `?id=eq.${id}`);
```
Calling it with `id=eq.${pagamentoId}` produces the URL `?id=eq.id=eq.<uuid>`. The DELETE never fires on the correct row. The record persists in the database even though the UI removes the row from local state and shows "Pagamento excluído". On the next reload the deleted payment reappears.

**Fix:**
```js
// pagamentos.js line 61 — was:
return dbDelete(TABLE, `id=eq.${pagamentoId}`);

// fix:
return dbDelete(TABLE, pagamentoId);
```

---

## Warnings

### WR-01: Edit form submits without validating data or valor — can write NaN / empty date

**File:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:109-125`

**Issue:** `handleSalvarEdit` calls `parseFloat(editForm.valor)` and passes it directly to `atualizarPagamento`. If the user clears the valor field, `parseFloat("")` returns `NaN`, which is written to the database. Similarly, `editForm.data_pagamento` can be an empty string (user clears the date field while editing) and is sent as-is without validation. The create form (lines 73-75) correctly gates on empty fields, but the edit path has no such guard.

**Fix:** Add validation at the top of `handleSalvarEdit`:
```js
async function handleSalvarEdit(row) {
  if (!editForm.data_pagamento || !editForm.valor || isNaN(parseFloat(editForm.valor))) {
    toast.error("Preencha data e valor");
    return;
  }
  // ... rest of function unchanged
}
```

---

### WR-02: `recalcularESincronizar` silently swallows calculation errors — saldo_quitado can desync

**File:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:63-68`

**Issue:** `recalcularESincronizar` is called with `await` inside try/catch blocks in `handleCriar`, `handleSalvarEdit`, and `handleExcluir`. However, if `atualizarSaldoQuitado` throws (e.g. network error, RLS rejection), the error propagates up to the caller's catch, which shows a generic "Erro ao registrar/atualizar/excluir" message. This means the user believes the primary operation succeeded (the toast fires correctly) but `saldo_quitado` in the database is out of sync with no indication. The issue is that `recalcularESincronizar` does not have its own error handling and is not separated from the primary mutation's catch context.

**Fix:** Isolate the sync step with its own error handling so a sync failure does not mask or get masked by the primary mutation:
```js
async function recalcularESincronizar(listaPagamentos) {
  const novoSaldo = calcularSaldoPorDividaIndividual(divida, listaPagamentos, hoje);
  const quitado = novoSaldo <= 0;
  try {
    await atualizarSaldoQuitado(divida.id, quitado);
  } catch (e) {
    toast.error("Aviso: falha ao sincronizar status quitado — " + e.message);
  }
  if (onSaldoChange) onSaldoChange(novoSaldo);
}
```

---

### WR-03: `pendingActionRef.current` is read without null-guard in `handleConfirmarRemoverPrincipal`

**File:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx:52-53`

**Issue:** `handleConfirmarRemoverPrincipal` destructures `pendingActionRef.current` with `|| {}` as a fallback:
```js
const { doRemove, resolve } = pendingActionRef.current || {};
```
This prevents a crash, but if `handleConfirmarRemoverPrincipal` is somehow called when `pendingActionRef.current` is already null (double-click on confirm, React StrictMode double-invoke, etc.), `doRemove` will be `undefined`, `resolve` will be `undefined`, and the modal will close silently with no action performed and no feedback to the user. The `if (doRemove)` guard below (line 54) prevents the actual remove from firing, but `resolve()` is never called, leaving the caller's `Promise` permanently pending.

**Fix:** Add an early return if `pendingActionRef.current` is null:
```js
async function handleConfirmarRemoverPrincipal() {
  setShowPrincipalWarning(false);
  if (!pendingActionRef.current) return;
  const { doRemove, resolve } = pendingActionRef.current;
  pendingActionRef.current = null;
  // ... rest unchanged
}
```

---

## Info

### IN-01: Hardcoded Supabase publishable key exposed in source

**File:** `src/mr-3/mr-cobrancas/src/config/supabase.js:3`

**Issue:** `SUPABASE_KEY` is a publishable (anon) key embedded in source. For a Supabase project with RLS enabled this is expected and not a secret, but the key is committed to version control. If the project is ever made public or the key grants broader permissions than intended, this becomes exploitable. Using an environment variable is the conventional practice.

**Fix:** Move to an environment variable:
```js
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

---

### IN-02: `fmtBRL` and `fmtData` helpers duplicated across three files

**File:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx:10-13`, `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:15-18`, `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx:6-14`

**Issue:** The `fmtBRL` and `fmtData` utility functions are copy-pasted identically across all three component files. Any future change (locale, date format) needs to be applied in three places.

**Fix:** Extract to a shared utility file, e.g. `src/utils/format.js`, and import from there.

---

### IN-03: `STATUS_DIVIDA_META` object duplicated in two components

**File:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx:15-19`, `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx:17-21`

**Issue:** The status badge map and `StatusBadgeDivida` component are defined independently in both files with identical content. Adding a new status (e.g. "suspenso") requires editing both files.

**Fix:** Move `STATUS_DIVIDA_META` and `StatusBadgeDivida` to a shared component file (e.g. `src/components/ui/StatusBadgeDivida.jsx`).

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
