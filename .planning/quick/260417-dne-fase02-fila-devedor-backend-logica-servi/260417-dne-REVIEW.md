---
phase: 260417-dne-fase02-fila-devedor-backend-logica-servi
reviewed: 2026-04-17T00:00:00Z
depth: quick
files_reviewed: 2
files_reviewed_list:
  - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
  - src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Code Review: filaDevedor.js

**Reviewed:** 2026-04-17
**Depth:** quick (pattern-matching + targeted file read per focused scope)
**Files Reviewed:** 2
**Status:** issues_found

## Summary

`filaDevedor.js` implements a 7-function queue service against a custom fetch-based Supabase client. The optimistic-lock pattern in `proximoDevedor` is structurally sound but has a correctness gap. Two critical issues were found: unvalidated external input injected directly into query strings (SQL injection vector), and a logic conflict in `registrarEvento` that silently discards the `giro_carteira_dias` branch whenever `PROMESSA_PAGAMENTO` fires. Five warnings cover race conditions, edge cases in empty-queue handling, NOT IN query risks, and operation ordering. The test file has two reliability issues worth noting.

---

## Critical Issues

### CR-01: Unvalidated `contratoId` / `filaId` Interpolated Into Query Strings

**File:** `filaDevedor.js:7, 13, 32, 103, 163, 270`

**Issue:** Every function that accepts an external ID (`contratoId`, `operadorId`, `filaId`) interpolates it directly into PostgREST query strings without any validation or sanitisation:

```js
// line 7
`select=id,valor_original&id=eq.${contratoId}`

// line 103
`?id=eq.${item.id}&status_fila=eq.AGUARDANDO`

// line 270
`select=contrato_id&id=eq.${filaId}`
```

Although PostgREST does not execute raw SQL like a `pg` driver would, a crafted value such as `contratoId = "1&estagio=eq.FINALIZADO"` will append extra filter clauses to the URL, effectively allowing a caller to widen or narrow query predicates — a form of HTTP query-string injection. For `PATCH` endpoints this can change which rows get updated.

**Fix:** Add a guard at the top of each public function — or in a shared utility — that asserts IDs are integers (or UUIDs) before use:

```js
function assertId(value, name = "id") {
  if (!/^\d+$/.test(String(value)) && !/^[0-9a-f-]{36}$/.test(String(value))) {
    throw new Error(`Invalid ${name}: ${value}`);
  }
}

// At the top of calcularScorePrioridade:
assertId(contratoId, "contratoId");
```

Apply to `calcularScorePrioridade`, `registrarEvento`, `removerDaFila`, and anywhere a caller-supplied value enters a query string.

---

### CR-02: `registrarEvento` — `giro_carteira_dias` Branch Is Unreachable When `tipo_evento = "PROMESSA_PAGAMENTO"`

**File:** `filaDevedor.js:154-193`

**Issue:** The caller in the test (line 113-118) passes `tipo_evento: "PROMESSA_PAGAMENTO"` AND `giro_carteira_dias: 7` simultaneously. The `if / else if / else if` ladder means the `giro_carteira_dias > 0` block can never execute when `tipo_evento` is `"PROMESSA_PAGAMENTO"` — the first `if` matches and the chain stops. If the business rule is "PROMESSA_PAGAMENTO uses `data_promessa` as the block date", the current code is correct but silently ignores `giro_carteira_dias`. If the intent is that both can apply, the structure is wrong.

More dangerously, a caller that passes `tipo_evento: "PROMESSA_PAGAMENTO"` with `giro_carteira_dias` but **without** `data_promessa` will set `bloqueado_ate: undefined` in Supabase (falsy check on line 154 is `data_promessa`, not `giro_carteira_dias`).

**Fix:** Clarify intent. If `PROMESSA_PAGAMENTO` always wins, document it. If `giro_carteira_dias` can supplement any event type, break the ladder:

```js
// Handle queue-block logic independently of event type
if (tipo_evento === "PROMESSA_PAGAMENTO" && data_promessa) {
  bloqueadoAte = data_promessa;
  novoStatus = "ACIONADO";
} else if (giro_carteira_dias > 0) {
  bloqueadoAte = new Date(Date.now() + giro_carteira_dias * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  novoStatus = "ACIONADO";
}

if (bloqueadoAte) {
  await sb("fila_cobranca", "PATCH", { bloqueado_ate: bloqueadoAte, status_fila: novoStatus, ... }, ...);
}
```

---

## Warnings

### WR-01: `proximoDevedor` Race Condition — Retry Loop Not Bounded Against DB Contention

**File:** `filaDevedor.js:79-133`

**Issue:** The optimistic-lock retry loop (lines 107-111) reads the top-scored `AGUARDANDO` item, then patches it with `&status_fila=eq.AGUARDANDO` as the CAS predicate. If the patch returns 0 rows, it retries up to 3 times. However, on each retry it re-reads the same `order=score_prioridade.desc&limit=1` query — so with N concurrent operators it will repeatedly contend on the same highest-scored row until one wins and the rest exhaust retries. After 3 failures the function silently returns `data: null`, which the caller cannot distinguish from a genuinely empty queue.

**Fix:** After a failed CAS, return a distinct result or distinguish the "queue exhausted" vs "lock contention exhausted" case so the caller can decide whether to surface a retry-later message:

```js
if (_tentativa >= 3) {
  return { success: false, data: null, error: "lock_contention: tente novamente" };
}
```

---

### WR-02: `entrarNaFila` — No Guard When `contratos` Returns 0 Results

**File:** `filaDevedor.js:41-76`

**Issue:** When `dbGet("contratos", ...)` returns an empty array (no contracts in `ANDAMENTO`), `novos` and `jaExistentes` are both `[]`. The for-loops are skipped and `{ inseridos: 0, atualizados: 0 }` is returned — this is technically fine. However, `filaAtiva` is also fetched unconditionally even when `contratos` is empty, making a network call that returns no useful data. The real risk is that if `dbGet` ever returns `null` or `undefined` instead of `[]` on a network error (depending on how the custom client handles failures), `contratos.filter(...)` on line 50 will throw a silent unhandled TypeError since the outer try/catch would swallow it without context.

**Fix:** Add defensive null-checks after each `dbGet` call:

```js
const contratos = await dbGet("contratos", "...") ?? [];
const filaAtiva = await dbGet("fila_cobranca", "...") ?? [];
```

---

### WR-03: `reciclarContratos` NOT IN List Can Exceed URL Length Limits

**File:** `filaDevedor.js:215`

**Issue:** The NOT IN filter is built by joining all active queue IDs into a comma-separated URL parameter:

```js
`select=*&estagio=eq.ANDAMENTO&id=not.in.(${idsNaFila.join(",")})`
```

PostgREST sends this as a GET query string. With hundreds or thousands of active queue entries the URL will exceed the ~8 KB limit common in load balancers and browsers, causing a `414 URI Too Long` error that is caught by the outer try/catch and returned as a generic `error` string — with no indication that a subset of contracts may have been missed.

**Fix:** Either paginate / batch the NOT IN list (max 500 IDs per request), or invert the query using a `fila_cobranca` left-join approach in Supabase if the data layer supports it. At minimum, add a length guard:

```js
if (idsNaFila.length > 500) {
  // fallback: fetch all ANDAMENTO then filter in JS
  contratos = (await dbGet("contratos", "select=*&estagio=eq.ANDAMENTO"))
    .filter(c => !idsNaFilaSet.has(c.id));
} else { ... }
```

---

### WR-04: `removerDaFila` — Update Fires Before Fetch, Leaving Audit Event Orphaned on Error

**File:** `filaDevedor.js:265-287`

**Issue:** `dbUpdate` is called on line 265 to mark the item `REMOVIDO`, and only then is `dbGet` called on line 270 to retrieve the `contrato_id` for the audit event. If `dbGet` fails or returns no rows (e.g., the row was already hard-deleted), the status is already updated but no audit event is written. The two operations are not atomic.

**Fix:** Reverse the order — fetch first, then update, then insert the audit event:

```js
const filaItems = await dbGet("fila_cobranca", `select=contrato_id&id=eq.${filaId}`);
const contratoId = filaItems[0]?.contrato_id;
if (!contratoId) throw new Error(`fila item ${filaId} nao encontrado`);

await dbUpdate("fila_cobranca", filaId, { status_fila: "REMOVIDO", updated_at: ... });
await dbInsert("eventos_andamento", { contrato_id: contratoId, ... });
```

---

### WR-05: `registrarEvento` — `giro_carteira_dias > 0` Evaluated on Potentially `undefined`

**File:** `filaDevedor.js:178`

**Issue:** `giro_carteira_dias` is destructured from `dadosEvento` on line 138 without a default. If a caller omits the field entirely, `giro_carteira_dias` is `undefined`. The comparison `undefined > 0` evaluates to `false` in JavaScript, so the branch is silently skipped — no error, no log. This is a silent failure that will be invisible in production.

**Fix:** Provide a default at destructuring:

```js
const { tipo_evento, descricao, telefone_usado, data_promessa, giro_carteira_dias = 0 } = dadosEvento;
```

---

## Info

### IN-01: `calcularScorePrioridade` — Score Formula Uses Magic Numbers

**File:** `filaDevedor.js:24-25`

**Issue:** `(valorOriginal / 1000) + (diasAtrasoMaior * 2) + (parcelas.length * 10)` and the thresholds `80` / `40` are unexplained numeric literals. If business rules change, these are easy to miss.

**Fix:** Extract to named constants at the module top:

```js
const SCORE_DIVISOR_VALOR = 1000;
const SCORE_PESO_DIAS_ATRASO = 2;
const SCORE_PESO_PARCELAS = 10;
const PRIORIDADE_ALTA_THRESHOLD = 80;
const PRIORIDADE_MEDIA_THRESHOLD = 40;
```

---

### IN-02: Test File — `proximoDevedor` Assertion Assumes Non-Empty Queue in Shared DB

**File:** `filaDevedor.test.js:102`

**Issue:** `assert("data nao null (fila tinha items)", r2.data !== null)` will fail if another test run or concurrent operator drains the queue between `entrarNaFila` and `proximoDevedor`. The test also does not restore the item to `AGUARDANDO` after the lock is acquired, so TEST 3 patches a row in `EM_ATENDIMENTO` state — which only works because the `sb` call in `registrarEvento` does not filter by `status_fila` on line 163 (it uses `&status_fila=eq.EM_ATENDIMENTO`). If that filter is ever tightened, TEST 3 will silently no-op without failing an assertion.

**Fix:** After `proximoDevedor`, capture the returned `fila.id` and assert directly that `filaCheck` for that specific id has `status_fila=EM_ATENDIMENTO` before proceeding to TEST 3.

---

_Reviewed: 2026-04-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: quick (with full file read per focused review scope)_
