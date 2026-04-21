---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
reviewed: 2026-04-19T00:00:00Z
depth: standard
files_reviewed: 3
files_reviewed_list:
  - src/mr-3/mr-cobrancas/src/App.jsx
  - src/mr-3/mr-cobrancas/src/services/dividas.js
  - src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql
findings:
  critical: 1
  warning: 3
  info: 3
  total: 7
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-04-19
**Depth:** standard
**Files Reviewed:** 3
**Status:** issues_found

## Summary

The refactor successfully extracted `dividas` into its own table, introduced a `dividas.js` service layer, and wired a parallel `Promise.all` load in `carregarTudo`. The SQL migration is well-structured with idempotent guards, cascade FK constraints, and a correct double-encoding CASE for legacy JSONB seed.

One critical bug was found: the `dividasMap` build inside `carregarTudo` does not add the JSONB-compatibility field aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`, `descricao`) that `devedorCalc.js` depends on. Raw table column names (`indice_correcao`, `juros_am_percentual`, etc.) are exposed instead, causing all monetary correction calculations to silently return 0 or fall back to `"nenhum"` on every initial load and on every 60-second background refresh.

Three warnings cover: a write surface (`toggleParcela`) that silently applies UI state changes when the DB write fails; a load failure in `carregarTudo` that shows no user feedback; and the entire `dividas.js` service being dead code (never imported). Three info items cover minor issues: a dead variable with a string-literal branch condition, unused state, and RLS policies with `USING (true)`.

---

## Critical Issues

### CR-01: `dividasMap` omits JSONB-compat aliases — correction calc always returns 0 after load

**File:** `src/mr-3/mr-cobrancas/src/App.jsx:8436-8440`

**Issue:** The `dividasMap` build spreads the raw `dividas` table row without mapping table column names to the legacy field names that `devedorCalc.js` reads. Specifically:

| Table column | Alias `devedorCalc.js` reads |
|---|---|
| `indice_correcao` | `indexador` |
| `juros_am_percentual` | `juros_am` |
| `multa_percentual` | `multa_pct` |
| `honorarios_percentual` | `honorarios_pct` |
| `observacoes` | `descricao` |

Because these aliases are absent, `devedorCalc.js` defaults `indexador` to `"nenhum"` (no correction), `juros_am` / `multa_pct` / `honorarios_pct` to `0`. Every KPI on the Dashboard and every saldo in the debtor card will show a deflated or zero-corrected value immediately after page load and after every 60-second background refresh. The bug is masked only briefly when a devedor is opened — `salvarEdicaoDivida` (line 3414) does add the aliases locally for the open session.

**Fix:**

```js
// Replace the dividasMap push at App.jsx line 8439
dividasMap.get(k).push({
  ...div,
  parcelas:             parseJ(div.parcelas),
  custas:               parseJ(div.custas),
  // JSONB-compat aliases required by devedorCalc.js
  descricao:            div.observacoes,
  indexador:            div.indice_correcao,
  juros_am:             div.juros_am_percentual,
  multa_pct:            div.multa_percentual,
  honorarios_pct:       div.honorarios_percentual,
});
```

---

## Warnings

### WR-01: `toggleParcela` silently commits UI state on DB failure — data diverges from server

**File:** `src/mr-3/mr-cobrancas/src/App.jsx:3322-3326`

**Issue:** The `catch` block in `toggleParcela` calls `console.warn` but then still applies the state mutation to both `devedores` and `sel`. If the `dbUpdate("dividas", ...)` call fails (network error, RLS denial), the UI shows the parcel as paid while the database retains the old status. The next 60-second `carregarTudo` refresh will silently revert the UI, causing a confusing flip.

```js
} catch (e) {
  console.warn("toggleParcela failed:", e);
  // BUG: state is updated even though DB write failed
  const parsed = montarDevAtualizado(null, dividas, { status: nSt });
  setDevedores(prev => prev.map(d => d.id === sel.id ? parsed : d)); setSel(parsed);
}
```

**Fix:** Remove the state-update from the catch block and notify the user instead:

```js
} catch (e) {
  toast.error("Erro ao atualizar parcela: " + (e?.message || e));
  // Do NOT apply state — let the UI remain in the pre-toggle state
}
```

---

### WR-02: `carregarTudo` swallows load errors with no user feedback

**File:** `src/mr-3/mr-cobrancas/src/App.jsx:8462-8464`

**Issue:** If the initial `Promise.all` fetch fails (e.g., expired Supabase session, network outage), the error is logged to `console.error` but the user sees an empty screen with no message. `setCarregando(false)` runs, the loading spinner disappears, and the app silently renders blank lists. This is especially disruptive for the `dividas` fetch added by this refactor, which is a new dependency that did not exist before.

```js
} catch (e) {
  console.error(e);  // only dev console — no user toast
}
```

**Fix:**

```js
} catch (e) {
  console.error("carregarTudo failed:", e);
  toast.error("Não foi possível carregar os dados. Verifique a conexão e recarregue.");
}
```

---

### WR-03: `dividas.js` service layer is dead code — never imported anywhere

**File:** `src/mr-3/mr-cobrancas/src/services/dividas.js:1-59`

**Issue:** The phase plan describes `dividas.js` as the central service for all 7 write surfaces on `dividas`. In practice, `App.jsx` never imports the file. All 5 write surfaces (`adicionarDivida`, `adicionarCustasAvulsas`, `toggleParcela`, `excluirDivida`, `salvarEdicaoDivida`) call `dbInsert` / `dbUpdate` / `dbDelete` directly, bypassing the service entirely. The `listarDividas` export is likewise never called — the load path uses `dbGet("dividas")` directly.

This leaves the service untested in production, and any future bug fix applied to `dividas.js` will have no effect until the service is actually wired in.

**Fix:** Either import and use the service functions (replacing direct `dbInsert/dbUpdate/dbDelete` calls), or add a comment at the top of `dividas.js` explaining that App.jsx uses `dbGet/dbInsert/dbUpdate/dbDelete` directly and the service is reserved for external consumers (e.g., `FilaDevedor`, `GerarPeticao`). Make the intent explicit so the file isn't accidentally deleted or diverges silently.

---

## Info

### IN-01: Dead variable `saud` with string-literal branch condition — always evaluates to "Boa tarde"

**File:** `src/mr-3/mr-cobrancas/src/App.jsx:698`

**Issue:** The variable `saud` is declared but never used in any JSX. More importantly its conditional is broken — the middle branch tests the string literal `"hora<18"` (always truthy) instead of `hora < 18`:

```js
const saud = hora < 12 ? "Bom dia" : "hora<18" ? "Boa tarde" : "Boa noite";
//                                     ^^^^^^^^^ string literal, always true
```

The result is `saud` can only ever be `"Bom dia"` or `"Boa tarde"`. Since it is unused, this causes no runtime impact, but it is copy-paste leftover from the adjacent (correct) `saudacao` variable and should be removed.

**Fix:** Delete the `saud` declaration entirely — only `saudacao` is used in JSX.

---

### IN-02: `allDividas` state is set but never read

**File:** `src/mr-3/mr-cobrancas/src/App.jsx:8415, 8432`

**Issue:** `const [allDividas, setAllDividas] = useState([])` is declared and populated from the `Promise.all` result, but no component or hook reads `allDividas`. The raw dividas data is consumed exclusively through `dividasMap` (injected into each devedor object). This state occupies memory with a potentially large array that is never consumed.

**Fix:** Remove the `allDividas` state declaration and the `setAllDividas(...)` call, or wire it to a component that needs flat access to all dividas (e.g., a future reporting view).

---

### IN-03: RLS policies use `USING (true) WITH CHECK (true)` — effectively disables row-level security

**File:** `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql:65, 193`

**Issue:** Both `dividas` and `devedores_dividas` have RLS enabled, but the policies grant `FOR ALL ... USING (true) WITH CHECK (true)`, meaning any authenticated (or even anonymous, depending on Supabase config) role can read, insert, update, and delete every row. The existing comment says "matches existing pattern from 001," so this is intentional and consistent with the rest of the schema — however it means RLS provides no tenant isolation and relies entirely on application-layer auth.

This is an accepted architectural decision for this project, but worth flagging for when multi-tenant isolation becomes a requirement.

**Fix (when needed):** Replace `USING (true)` with a user-scoped predicate, e.g., `USING (auth.role() = 'authenticated')` at minimum, or a `tenant_id` column comparison for multi-tenant isolation.

---

_Reviewed: 2026-04-19_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
