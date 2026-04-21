---
phase: 04-pagamentos-por-divida
fixed_at: 2026-04-21T00:00:00Z
review_path: .planning/phases/04-pagamentos-por-divida/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-21
**Source review:** .planning/phases/04-pagamentos-por-divida/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (2 Critical, 3 Warning)
- Fixed: 5
- Skipped: 0

## Fixed Issues

### CR-01: `dbUpdate` called with pre-built filter string — query becomes double-encoded

**Files modified:** `src/mr-3/mr-cobrancas/src/services/pagamentos.js`
**Commit:** a9f45d8 (shared with CR-02)
**Applied fix:** Changed `dbUpdate(TABLE, \`id=eq.${pagamentoId}\`, campos)` to `dbUpdate(TABLE, pagamentoId, campos)` so the bare UUID is passed as the second argument, matching the helper's expected signature.

---

### CR-02: `dbDelete` called with pre-built filter string — delete targets zero rows

**Files modified:** `src/mr-3/mr-cobrancas/src/services/pagamentos.js`
**Commit:** a9f45d8 (shared with CR-01)
**Applied fix:** Changed `dbDelete(TABLE, \`id=eq.${pagamentoId}\`)` to `dbDelete(TABLE, pagamentoId)` so the bare UUID is passed, preventing the double-encoded `?id=eq.id=eq.<uuid>` query string.

---

### WR-01: Edit form submits without validating data or valor — can write NaN / empty date

**Files modified:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx`
**Commit:** 386f45c
**Applied fix:** Added validation guard at the top of `handleSalvarEdit`: returns early with `toast.error("Preencha data e valor")` if `editForm.data_pagamento` is empty, `editForm.valor` is empty, or `parseFloat(editForm.valor)` is NaN. Mirrors the existing guard in `handleCriar`.

---

### WR-02: `recalcularESincronizar` silently swallows calculation errors — saldo_quitado can desync

**Files modified:** `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx`
**Commit:** 05051b0
**Applied fix:** Wrapped `atualizarSaldoQuitado` in its own `try/catch` inside `recalcularESincronizar`. On failure, shows a distinct `toast.error` warning so the user knows the sync failed without masking the primary operation's result. `onSaldoChange` still fires after the try/catch regardless.

---

### WR-03: `pendingActionRef.current` is read without null-guard in `handleConfirmarRemoverPrincipal`

**Files modified:** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx`
**Commit:** 8ac5e49
**Applied fix:** Added `if (!pendingActionRef.current) return;` immediately after `setShowPrincipalWarning(false)`. Replaced the `|| {}` destructure fallback with a direct destructure (since null is now ruled out). This prevents a permanently-pending Promise when the handler fires with no queued action.

---

_Fixed: 2026-04-21_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
