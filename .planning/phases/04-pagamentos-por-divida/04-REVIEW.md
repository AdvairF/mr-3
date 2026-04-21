---
phase: 04-pagamentos-por-divida
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx
  - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx
findings:
  critical: 0
  warning: 3
  info: 2
  total: 5
status: issues_found
---

# Phase 04: Code Review Report (Gap Closure — plan 04-04)

**Reviewed:** 2026-04-21  
**Depth:** standard  
**Files Reviewed:** 2  
**Status:** issues_found

## Summary

This review covers the two surgical changes introduced by plan 04-04:

1. `PagamentosDivida.jsx` — `recalcularESincronizar` is now called on mount after loading payments; a new optional prop `onTotalPagoChange` was added to emit the raw payment sum.
2. `DetalheDivida.jsx` — added `totalPagoDivida` state (null initially), wired to `onTotalPagoChange` on `<PagamentosDivida>`, displayed in the "Total Pago" financial card instead of the old `totalPago` that read from `pagamentos_parciais`.

The prop contract is correct: `onTotalPagoChange` is optional and guarded on lines 74-77 of `PagamentosDivida`. The three warnings below concern an unawaited async call on mount (producing a race between `setLoading(false)` and `onTotalPagoChange`), a spurious DB write triggered on every page load, and an unhandled error path that leaves the "Total Pago" card permanently at `"—"` on fetch failure. Two info items flag dead code left over from the old computation path.

No critical issues were found in the gap closure changes.

---

## Warnings

### WR-01: `recalcularESincronizar` not awaited on mount — `onTotalPagoChange` races with `setLoading(false)`

**File:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:54-62`

**Issue:** In the mount `useEffect`, the `.then()` callback calls `recalcularESincronizar(lista)` but does not await it. `recalcularESincronizar` is an `async` function that internally calls `await atualizarSaldoQuitado(...)` before invoking `onTotalPagoChange`. Because the returned Promise is dropped, `.finally(() => setLoading(false))` runs immediately after `setPagamentos(lista)` — before the DB write completes and before `onTotalPagoChange` fires.

Observable consequence: `DetalheDivida` exits the loading state (spinner removed) with `totalPagoDivida` still `null`, so the "Total Pago" card displays `"—"` for an additional network round-trip duration even though all payment data is already available. The card only updates when `atualizarSaldoQuitado` resolves and the callback eventually fires asynchronously.

```js
// Current (PagamentosDivida.jsx lines 54-62):
listarPagamentos(divida.id)
  .then(data => {
    const lista = Array.isArray(data) ? data : [];
    setPagamentos(lista);
    recalcularESincronizar(lista);   // Promise dropped — no await
  })
  .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
  .finally(() => setLoading(false));
```

**Fix:** Await the call inside the `.then()` callback so `setLoading(false)` only fires after `onTotalPagoChange` has been called:

```js
listarPagamentos(divida.id)
  .then(async (data) => {                       // async callback
    const lista = Array.isArray(data) ? data : [];
    setPagamentos(lista);
    await recalcularESincronizar(lista);         // now awaited
  })
  .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
  .finally(() => setLoading(false));
```

---

### WR-02: `atualizarSaldoQuitado` fires on every mount — spurious DB write on read-only views

**File:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:58, 65-78`

**Issue:** `recalcularESincronizar` calls `await atualizarSaldoQuitado(divida.id, quitado)` unconditionally. Before this gap-closure change, `recalcularESincronizar` was only called from mutation handlers (create, update, delete). Now it is also called on mount, which means every time a user opens the debt detail screen, the component issues an unnecessary PATCH to `dividas` even when no payment was modified.

This produces three problems:

- Extra write load on Supabase for a read-only navigation event.
- If `atualizarSaldoQuitado` fails transiently (network blip, RLS edge case), users see the toast "Aviso: falha ao sincronizar status quitado" when they have done nothing — a confusing false alarm.
- It weakens the invariant that `saldo_quitado` changes only in response to payment mutations, making audit logs harder to read.

**Fix (two options):**

Option A — Emit saldo and total from mount separately, without calling the full sync helper:

```js
useEffect(() => {
  setLoading(true);
  listarPagamentos(divida.id)
    .then(async (data) => {
      const lista = Array.isArray(data) ? data : [];
      setPagamentos(lista);
      // Mount: compute and emit only — no DB write
      const novoSaldo = calcularSaldoPorDividaIndividual(divida, lista, hoje);
      if (onSaldoChange) onSaldoChange(novoSaldo);
      if (onTotalPagoChange) {
        const total = lista.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
        onTotalPagoChange(total);
      }
    })
    .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
    .finally(() => setLoading(false));
}, [divida.id]);
// recalcularESincronizar unchanged — still writes to DB — still called only from mutations
```

Option B — Add a boolean parameter to `recalcularESincronizar` to suppress the write:

```js
async function recalcularESincronizar(listaPagamentos, { writeBack = true } = {}) {
  const novoSaldo = calcularSaldoPorDividaIndividual(divida, listaPagamentos, hoje);
  const quitado = novoSaldo <= 0;
  if (writeBack) {
    try {
      await atualizarSaldoQuitado(divida.id, quitado);
    } catch (e) {
      toast.error("Aviso: falha ao sincronizar status quitado — " + e.message);
    }
  }
  if (onSaldoChange) onSaldoChange(novoSaldo);
  if (onTotalPagoChange) {
    const total = (listaPagamentos || []).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
    onTotalPagoChange(total);
  }
}

// On mount:
recalcularESincronizar(lista, { writeBack: false });
```

---

### WR-03: `onTotalPagoChange` never called on fetch error — "Total Pago" card stuck at `"—"` on failure

**File:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx:60`

**Issue:** If `listarPagamentos` rejects, the `.catch()` shows a toast but never calls `onTotalPagoChange`. `DetalheDivida` keeps `totalPagoDivida === null` permanently. The "Total Pago" card renders `"—"` forever after the failure — visually identical to "still loading", giving the user no indication whether the dash is a transient or a permanent state.

This asymmetry is notable because `saldoAtual` (the "Saldo Atualizado" card in the same row) does have a fallback: if `saldoDividaLocal` is null, `DetalheDivida` falls back to `saldoDivida` computed from `pagamentos_parciais`. `totalPagoDivida` has no such fallback.

**Fix:** Emit `0` (or a fallback computed from `pagamentos_parciais`) in the catch path:

```js
.catch(e => {
  toast.error("Erro ao carregar pagamentos: " + e.message);
  if (onTotalPagoChange) onTotalPagoChange(0);  // resolves card to R$ 0,00 instead of "—"
})
```

---

## Info

### IN-01: `totalPago` and `calcularTotalPagoPorDivida` are dead code after 04-04

**File:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx:7, 85-86`

**Issue:** Before 04-04 the "Total Pago" card used `totalPago` (computed from `pagamentos_parciais` via `calcularTotalPagoPorDivida`). After 04-04 it uses `totalPagoDivida` (from `onTotalPagoChange`). The old computation was not removed:

- Line 7: `calcularTotalPagoPorDivida` is still imported.
- Lines 85-86: `pagoPorDividaMap` and `totalPago` are computed on every render.
- Neither is referenced in any JSX or logic path.

This is confusing to future readers: `totalPago` looks like it might be an intentional fallback, but the card renders `"—"` on error, not `totalPago`. The intent is ambiguous.

**Fix (choose one):**

Remove the dead code entirely:

```js
// Remove from line 7:
import { calcularSaldosPorDivida } from "../utils/devedorCalc.js";
// (drop calcularTotalPagoPorDivida from the import)

// Remove lines 85-86:
// const pagoPorDividaMap = devedor ? calcularTotalPagoPorDivida(...) : {};
// const totalPago = pagoPorDividaMap[String(divida.id)] ?? 0;
```

Or make it a real fallback (which also resolves WR-03 without touching PagamentosDivida):

```js
// Line 81 — initialize with the stale pagamentos_parciais value
const [totalPagoDivida, setTotalPagoDivida] = useState(totalPago ?? null);
//                                                       ^^^^^^^^^
// totalPago must be computed above this line (as it currently is)
```

---

### IN-02: Duplicate comment label `{/* 7. */}` on two separate JSX blocks

**File:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx:209, 221`

**Issue:** Two consecutive comment blocks are both labeled `{/* 7. ... */}` — one for the "Editar Dívida" button and one for the principal removal warning modal. This is a minor documentation error that predates 04-04 but is worth noting for clarity.

**Fix:** Renumber the modal to `{/* 8. D-05 PRINCIPAL removal warning modal */}`.

---

_Reviewed: 2026-04-21_  
_Reviewer: Claude (gsd-code-reviewer)_  
_Depth: standard_
