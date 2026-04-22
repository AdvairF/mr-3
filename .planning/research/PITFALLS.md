# Domain Pitfalls — Mr. Cobranças

**Domain:** Brownfield — legal debt-collection SPA (Brazil), React 18 + Vite + Supabase
**Researched:** 2026-04-22 (v1.4 section added); original research 2026-04-20 (v1.1 section)
**Confidence:** HIGH — all findings derived from direct codebase inspection (devedorCalc.js, contratos.js, pagamentos.js, supabase.js) and known PostgreSQL / browser-PDF behaviour

---

# Part A — v1.4 Pitfalls: Pagamentos por Contrato + PDF Demonstrativo

> These pitfalls are specific to the features added in Milestone v1.4 (Phase 7 + Phase 8).
> They are integration-level: they arise from adding new behaviour to existing infrastructure.

---

## A1. Non-Atomic Contract Payment (No Client-Side Transactions)

**Warning Sign:**
The existing `adicionarDocumento()` in contratos.js already does `for (const p of parcelasPayload) { await dbInsert(...) }` — sequential REST calls with no rollback. F1 (contract-level payment) will follow the same pattern: iterate parcelas sorted by vencimento, PATCH each `pagamentos_divida` + `saldo_quitado`, then INSERT `contratos_historico`. If any call fails mid-loop the DB is left in a partially-applied state.

**Why It Matters:**
A payment that should amortize three parcelas but crashes after the first produces a phantom payment: money is recorded on parcela 1 but parcelas 2–3 still show full saldo. The history event may or may not be written. A retry of the same operation will double-apply the amount to parcela 1. In a legal debt context, incorrect payment records are not a UX issue — they are a compliance risk.

**Specific Risk in This Codebase:**
`supabase.js` uses raw `fetch` against PostgREST REST v1. There is no client-side transaction primitive. The Supabase JS SDK `rpc()` could call a PostgreSQL function in a BEGIN/COMMIT, but this project bypasses the SDK using its own `sb()` helper. Calling a stored procedure via `sb('rpc/registrar_pagamento_contrato', 'POST', body)` is the only safe path.

**Prevention Strategy:**
Phase 7 (PAGCON-01/02): Implement `registrar_pagamento_contrato` as a PL/pgSQL function called via `sb('rpc/registrar_pagamento_contrato', 'POST', payload)`. The function receives `contrato_id`, `data_pagamento`, `valor`, `observacao` and performs all mutations (insert pagamentos_divida rows, update saldo_quitado flags, insert contratos_historico) inside one transaction. No partial state is possible.

If a stored procedure is ruled out, the minimum client-side mitigation is:
1. Pre-compute all mutations in memory before touching the DB.
2. Write the `contratos_historico` event first with an idempotency key in `snapshot_campos`.
3. On retry, check for that key — skip if already present.

This does not eliminate the window but makes duplicates detectable.

**Phase to Address:** Phase 7 — first decision before writing any payment service code.

---

## A2. Partial Payment Spanning Mid-Parcela (1.5 Parcelas Edge Case)

**Warning Sign:**
The devedorCalc.js loop (lines 88–124) consumes a shared `pgtoRestantes` array with `remaining` subtracted in-place. The contract-level equivalent must compute the "saldo atualizado" of each parcela at payment date (via `calcularSaldoPorDividaIndividual`) and consume the payment value across sorted parcelas until exhausted. The boundary case — payment exceeds saldo of parcela 1 but is less than combined saldo of parcelas 1+2 — is where bugs cluster.

**Why It Matters:**
Art. 354 CC requires payment applied to older debts first, with interest applied for the period to payment date. If the payment value exceeds the updated saldo of parcela 1 but does not cover parcela 2, the remainder must carry over to parcela 2. An off-by-one in the loop will either leave a "saldo negativo" on a parcela (over-applied) or silently drop an unconsumed `remaining`.

**Specific Risk in This Codebase:**
The `saldo_quitado` flag on `dividas` is boolean. A parcela partially amortized but not fully paid must NOT be flagged `saldo_quitado = true`. The service must track partial residual correctly. Currently there is no `saldo_parcela_restante` column — partial amortization must be recorded as a `pagamentos_divida` row with the consumed portion only, leaving future payments to cover the remainder via the calc engine.

**Prevention Strategy:**
Phase 7: Before writing to the DB, run the amortization computation entirely in memory using a pure function:

```js
// Pure — no side effects — returns mutation plan
function computarAmortizacaoContrato(parcelasOrdenadas, valorPago, dataPagamento, hoje) {
  // For each parcela: compute saldo_atualizado at dataPagamento
  // Consume payment greedily from oldest to newest
  // Return [{ parcela_id, valor_aplicado, quitada, saldo_restante }]
}
```

Only write to the DB after the full plan is computed. Add Vitest unit tests covering:
- Exact match: payment = saldo of one parcela
- Underpayment: payment < saldo of first parcela
- 1.5-parcela case: payment covers parcela 1 plus part of parcela 2
- Overpayment: payment > sum of all parcelas (should cap at total saldo)

**Phase to Address:** Phase 7 — write and pass tests before implementing DB writes.

---

## A3. Race Condition on Concurrent Payment Registration

**Warning Sign:**
Two advogados submit a payment for the same contract within seconds. Both read the current parcelas, both compute amortization against the same saldo, both write. The second write wins but neither is aware of the other. Alternatively: same user opens two tabs and submits twice.

**Why It Matters:**
Both writes will attempt to set `saldo_quitado = true` on the same parcela. The second write is a no-op on the flag (already true) but creates a second `pagamentos_divida` row — the sum of payments now exceeds the actual debt. The `contratos_historico` will contain two events for the same amount. Detecting this after the fact requires manual DB audit.

**Specific Risk in This Codebase:**
No optimistic locking, no `updated_at` version check, no Supabase Realtime subscription on the payment flow. The most common case (single user, double-click) is a UI problem; the concurrent-user case requires a DB guard.

**Prevention Strategy:**
Phase 7: Add UI-level double-submit guard — disable the "Registrar Pagamento" button immediately on first click, re-enable only on success or error resolution. For the stored-procedure approach, add a uniqueness check inside the function: reject if a `pagamentos_divida` row with the same `contrato_id` + `data_pagamento` + `valor` exists with `created_at > NOW() - INTERVAL '5 seconds'`. Document this as a known limitation for high-concurrency use.

**Phase to Address:** Phase 7 — UI guard on form submission; DB guard inside stored procedure.

---

## A4. CHECK Constraint Migration: Adding 'pagamento_recebido'

**Warning Sign:**
`contratos_historico.tipo_evento` has:
```sql
CHECK (tipo_evento IN ('criacao', 'alteracao_encargos', 'cessao_credito',
                       'assuncao_divida', 'alteracao_referencia', 'outros'))
```
Adding `'pagamento_recebido'` requires dropping and recreating the constraint.

**Why It Matters:**
Existing rows are NOT affected by a CHECK constraint change in PostgreSQL — the constraint is only evaluated on INSERT and UPDATE, not re-validated against existing rows on ALTER. However, two risks exist: (1) the constraint name is auto-generated and may not match assumptions; (2) if code that calls `registrarEvento(..., 'pagamento_recebido', ...)` is deployed before the migration runs, Supabase returns a 409/422. In `criarContrato()` this error is currently swallowed by `.catch(() => {})`. In the payment path it must not be swallowed — the payment would be written but the history event silently dropped.

**Specific Risk in This Codebase:**
The constraint name assumed in `contratos.js` comments is `contratos_historico_tipo_evento_check` (Postgres auto-generates `{table}_{col}_check`). If the table was created with a custom constraint name, the DROP will fail with "constraint does not exist". This error only surfaces at migration time, not in code.

**Prevention Strategy:**
Phase 7 (before any code ships to production):
1. Query the actual constraint name:
   ```sql
   SELECT conname FROM pg_constraint
   WHERE conrelid = 'contratos_historico'::regclass AND contype = 'c';
   ```
2. Run migration using the verified name:
   ```sql
   ALTER TABLE public.contratos_historico
     DROP CONSTRAINT IF EXISTS <verified_name>,
     ADD CONSTRAINT contratos_historico_tipo_evento_check
       CHECK (tipo_evento IN (
         'criacao','alteracao_encargos','cessao_credito',
         'assuncao_divida','alteracao_referencia','outros','pagamento_recebido'
       ));
   ```
3. Verify: INSERT a test row with `tipo_evento = 'pagamento_recebido'`, confirm success, rollback.
4. Migration must run BEFORE code calling `registrarEvento(..., 'pagamento_recebido', ...)` is deployed.
5. Remove the `.catch(() => {})` swallow pattern from any code path where the history event is load-bearing (i.e., the payment flow — unlike `criarContrato` where history is non-blocking).

**Phase to Address:** Phase 7 — migration is prerequisite, must happen before coding F4.

---

## A5. "Valor Atualizado" Consistency Between UI and PDF

**Warning Sign:**
The UI computes Valor Atualizado at component mount time with a `hoje` derived then. The PDF generator will compute with `hoje = new Date().toISOString().slice(0, 10)` at button-click time. If the user leaves the tab open across midnight, the UI shows yesterday's figure while the PDF shows today's.

**Why It Matters:**
An advogado presents a PDF to a debtor in the same session where the UI is open. Different values for the same parcela in the UI and the PDF undermine credibility. In judicial use, a demonstrativo that does not match other system outputs could be challenged by opposing counsel.

**Specific Risk in This Codebase:**
`calcularFatorCorrecao` is time-invariant for SELIC and Art.406 (pure date arithmetic). For IGPM/IPCA/INPC it reads from a rates table that only updates monthly. Within a single session (< 24 hours) the discrepancy is only possible across a date boundary. The real risk is that the UI caches the Valor Atualizado as component state and passes that cached value into the PDF generator as a prop — bypassing recalculation.

**Prevention Strategy:**
Phase 8 (PDF-02):
1. Never pass `valorAtualizado` from UI component state into the PDF generator. The PDF generator must call `calcularSaldoPorDividaIndividual()` (or the equivalent for parcelas) directly, with `hoje` derived fresh at call time.
2. Display "Data de emissão: DD/MM/YYYY" prominently in the PDF header so any discrepancy with the UI is self-documenting.
3. Label UI values with their computation date: "Saldo em [data]" not just "Saldo Atualizado".

**Phase to Address:** Phase 8 — architecture decision before writing PDF component.

---

## A6. Client-Side PDF: Fonts, Encoding, and Page Breaks

**Warning Sign:**
Brazilian legal text requires: `ç`, `ã`, `õ`, `á`, `é`, `ê`, `í`, `ó`, `ú` (Latin Extended), and currency formatted as `R$ 1.234,56` (period as thousands, comma as decimal). jsPDF's default Helvetica font does not support Latin Extended glyphs — they render as `?` or empty boxes.

**Why It Matters:**
A PDF demonstrativo presented in court or sent to a debtor that shows "Cobran?as" or "R$ 1,234.56" is legally problematic and professionally embarrassing. The fix requires rework after deployment.

**Specific Risk in This Codebase:**
The project already uses `docxtemplater` for petições (.docx) — that infrastructure does not carry over to PDF. There is no existing PDF pipeline to reuse. Three options exist, each with different tradeoffs:

- **jsPDF + embedded font (recommended for this scope):** Embed Noto Sans Latin subset as Base64 via `doc.addFileToVFS()` + `doc.addFont()`. ~200–400 KB bundle cost. Full control over layout. Requires manual `checkPageBreak()` for tables.
- **@react-pdf/renderer:** Declares PDF as a React tree, UTF-8 native, supports Google Fonts. ~250 KB additional bundle. Better for complex layouts. Introduces a significant new dependency.
- **html2canvas + jsPDF (avoid):** Screenshots a hidden HTML div. Browser handles fonts — no encoding issue. Produces rasterized PDF (non-searchable text). Poor page-break control. Not appropriate for a legal document.

For a contrato with 36 parcelas, the table will exceed one page. jsPDF requires manual page-break detection; react-pdf handles it declaratively.

**Prevention Strategy:**
Phase 8 (PDF-01/02):
1. Decide between jsPDF + embedded font vs. react-pdf before writing any PDF code. Do not start with html2canvas.
2. For jsPDF: use `value.toLocaleString('pt-BR', {style:'currency', currency:'BRL'})` for all monetary values. Embed a Base64 Noto Sans Latin subset. Do not use Helvetica for any user-facing text.
3. Test with a 36-parcela contract before declaring the feature done. Verify page breaks are correct.
4. Test string rendering of: `ç ã õ á é ê í ó ú` — specifically words like "cobrança", "dívida", "honorários", "correção".
5. Test on Chrome (Windows) and Safari (macOS) — different PDF rendering engines.

**Phase to Address:** Phase 8 — library selection is first decision in the phase.

---

## A7. Floating-Point Residual Blocks `saldo_quitado = true`

**Warning Sign:**
The amortization loop subtracts `pgto.remaining -= abate` in-place using IEEE 754 doubles. With 12 monthly payments of R$ 83.33 (total R$ 999.96 on a R$ 1.000,00 debt with rounding on last), the final `remaining` can be `0.000000001` instead of `0`. A `saldo <= 0` check fails, leaving `saldo_quitado = false` on a fully-paid parcela.

**Why It Matters:**
The "Saldo quitado" badge remains red on a fully-paid contract. The advogado thinks there is still a balance. In court, presenting a "saldo devedor" of R$ 0,00000001 is at minimum embarrassing and at worst a data integrity signal.

**Specific Risk in This Codebase:**
devedorCalc.js intentionally does NOT round mid-loop (rounding intermediate values accumulates more error, not less). This is correct. The guard must be at the persistence layer: use `saldo < 0.005` (half-cent threshold) to determine quitada, not `saldo === 0` or `saldo <= 0`.

**Prevention Strategy:**
Phase 7 (PAGCON-02):
- Use `Math.round(valor_aplicado * 100) / 100` when writing to `pagamentos_divida.valor`.
- Use `saldoRestante < 0.005` (not `=== 0`) to determine when to set `saldo_quitado = true`.
- Add a Vitest test: 10 parcelas of R$ 33.33 each, last parcela R$ 33.37 (total R$ 333.37), pay exactly R$ 333.37 in one payment — confirm all 10 parcelas are marked quitada and the engine returns saldo `< 0.01`.

**Phase to Address:** Phase 7 — unit test must exist before DB writes are implemented.

---

## A8. `saldo_quitado` Stored State vs. Engine-Computed State Drift

**Warning Sign:**
`dividas.saldo_quitado` is a stored boolean on the `dividas` table. The existing `PagamentosDivida.jsx` writes it. The v1.4 contract payment will also write it. Meanwhile, `devedorCalc.js` computes saldo independently from `pagamentos_divida` records — it does not read `saldo_quitado`. Two sources of truth.

**Why It Matters:**
If `saldo_quitado = true` is written prematurely (partial payment rounded to "done") but `pagamentos_divida` records do not fully cover the computed saldo, the badge "Saldo quitado" lies. Conversely, if a payment does clear a parcela but `saldo_quitado` is not updated, the badge stays red despite full coverage.

**Specific Risk in This Codebase:**
The amortization function must set `saldo_quitado = true` ONLY when the computed `saldo_restante < 0.005` after consuming the new payment. It must NOT rely on the payment face value alone (a payment of R$ 100,00 against a parcela with updated saldo of R$ 99,99 must set quitada; against a saldo of R$ 100,01 it must not). The function must recompute saldo using `calcularSaldoPorDividaIndividual()` (already exported from pagamentos.js) with the new payment included, not assume from input values.

**Prevention Strategy:**
Phase 7: After the pure amortization computation (see A2), verify each affected parcela's `saldo_restante` using `calcularSaldoPorDividaIndividual(parcela, [...existingPagamentos, newPayment], hoje)`. Only write `saldo_quitado = true` when this returns `< 0.005`. Never infer quitada from the payment amount alone.

**Phase to Address:** Phase 7 — verification step in the amortization computation function.

---

## A9. `registrarEvento` Silent Swallow Pattern Must Not Extend to Payments

**Warning Sign:**
In `criarContrato()`:
```js
registrarEvento(contrato.id, "criacao", {...}).catch(() => {}); // non-blocking — swallow silently
```
This is acceptable for history events that are supplementary (losing the "criacao" event does not break the contract). For the payment flow (F4 — HIS-05), the history event contains the snapshot of which parcelas were affected. If this is swallowed, there is no audit trail for the payment.

**Why It Matters:**
Legal debt collection requires audit trails. If a payment is registered but no `contratos_historico` event is written (due to the CHECK constraint being wrong, or a transient network error), the advogado has no record of what was amortized. In a stored-procedure approach, this is automatically atomic. In the sequential REST approach, the history write must be last and its failure must be surfaced as an error to the user (with a retry prompt), not swallowed.

**Prevention Strategy:**
Phase 7: In the payment registration function, do NOT copy the `.catch(() => {})` pattern. The history event is load-bearing for audit. Either:
- Use the stored-procedure approach (history insert is inside the transaction — atomic).
- Or write history last and `throw` on failure, triggering a user-visible error toast: "Pagamento registrado, mas histórico não foi gravado. Tente novamente."

**Phase to Address:** Phase 7 — code review gate: search for `.catch(() => {})` in payment service, remove any instance.

---

## Phase-Specific Warnings Summary — v1.4

| Phase | Topic | Pitfall | Mitigation |
|-------|-------|---------|------------|
| Phase 7 | F1 — Amortização | Sequential REST writes leave partial state on failure | Stored procedure via `sb('rpc/...')` before any sequential approach |
| Phase 7 | F1 — Amortização | 1.5-parcela boundary: remainder silently dropped | Pure computation function + Vitest tests before DB writes |
| Phase 7 | F1 — Amortização | Double-submit / concurrent writes | UI button disable + DB idempotency guard in stored procedure |
| Phase 7 | F4 — CHECK constraint | Unknown constraint name → DROP fails silently | Query `pg_constraint` before migration; use `DROP CONSTRAINT IF EXISTS` |
| Phase 7 | F4 — CHECK constraint | Migration runs after code deploy → 409 swallowed | Deploy migration first; remove `.catch(() => {})` in payment path |
| Phase 7 | PAGCON-02 | FP residual prevents `saldo_quitado = true` | Use `< 0.005` threshold; Vitest test for installment rounding |
| Phase 7 | PAGCON-02 | `saldo_quitado` set from face value, not computed saldo | Always verify via `calcularSaldoPorDividaIndividual()` after applying |
| Phase 7 | HIS-05 | History event swallowed like `criarContrato` | History is load-bearing in payment flow — throw, do not swallow |
| Phase 8 | PDF-01 | Latin chars render as `?` in jsPDF Helvetica | Embed Noto Sans Latin subset; decide library before coding |
| Phase 8 | PDF-01 | Currency formatted `1,234.56` not `1.234,56` | `toLocaleString('pt-BR', {style:'currency', currency:'BRL'})` everywhere |
| Phase 8 | PDF-02 | `hoje` stale from UI cache differs from PDF `hoje` | Always compute `hoje` fresh inside PDF generator, never from props |
| Phase 8 | PDF-02 | 36-parcela table overflows page without page-break logic | Test max-parcela contract before shipping; implement break strategy |

---

---

# Part B — v1.1 Pitfalls: Pagamentos por Dívida + Contratos (Original)

> These pitfalls were identified at v1.1 research (2026-04-20). Many remain relevant as integration
> risks in v1.4 since the same infrastructure is extended.

---

## B1. Column Alias Desync — The `pagamentos_divida` Mirror Problem

**Warning Sign:**
The existing system stores dívidas with DB column names (`indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`) but `devedorCalc.js` requires the JSONB-era aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`). The alias injection happens in a single place: `carregarTudo()` in App.jsx. A new `pagamentos_divida` service or a contract-level amortization function that fetches parcelas independently (bypassing `carregarTudo`) will receive raw DB column names and the engine will silently compute zeros.

**Prevention Strategy:**
Create a `normalizarDivida(dbRow)` pure function in `dividas.js` that performs alias injection. Apply it everywhere a dívida row is returned from Supabase. Never inline the alias mapping again.

**Phase to Address:** Phase 7 — before any Supabase query for contract parcelas is written in the payment service.

---

## B2. Art. 354 CC Scope Confusion — Devedor-Level vs. Contract-Level

**Warning Sign:**
`calcularSaldoDevedorAtualizado` applies Art. 354 CC across all dívidas of a devedor using a shared `pgtoRestantes` array. Contract-level payments target specific parcelas by `contrato_id`. If contract payments are fed into the devedor-level engine alongside `pagamentos_parciais`, the payment is double-applied.

**Prevention Strategy:**
Keep `pagamentos_parciais` (devedor scope) and `pagamentos_divida` (dívida/parcela scope) as separate sources. Never merge them before feeding into the engine. The devedor dashboard must continue to use `calcularSaldoDevedorAtualizado` with `pagamentos_parciais` only.

**Phase to Address:** Phase 7 — architectural decision at kickoff.

---

## B3. Art. 354 CC Order — Juros Before Multa in Engine

**Warning Sign:**
The engine computes `debitoTotal = pcSaldo + juros + multaVal + honorariosVal` and absorbs payment as a lump. If a UI breakdown shows "how much went to juros vs. principal," a naive component breakdown will be wrong. The imputation order (juros → multa → principal) is implicit in the engine, not explicit in output.

**Prevention Strategy:**
If building a payment breakdown display, implement a separate display-only function using the imputation order. Do not change the balance engine. Do not recalculate components in the UI from raw values.

**Phase to Address:** Phase 7 — when implementing F2 (Pagamentos Recebidos section).

---

## B4. Floating Point Currency Accumulation

**Warning Sign:**
Summing `parseFloat(p.valor) || 0` across many payments without rounding at persistence time produces phantom residuals (e.g., `0.000000001`) that block `saldo <= 0` checks.

**Prevention Strategy:**
Round only at INSERT (write to DB) and at display (format for UI/PDF). Never round inside the Art. 354 loop. Use `< 0.005` threshold for "quitada" check.

**Phase to Address:** Phase 7 — in `inserirPagamentoDivida` service function and display layer.

---

## B5. Supabase RLS — New Tables Must Have RLS Enabled

**Warning Sign:**
All existing tables use `USING(true) WITH CHECK(true)` policy. A new table created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` before the policy exposes all rows to the anon key.

**Prevention Strategy:**
Every new table migration must include `ENABLE ROW LEVEL SECURITY` before `CREATE POLICY`. Post-migration verification: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'new_table'` must return `rowsecurity = true`.

**Phase to Address:** Phase 7 — migration SQL for any new table (e.g., a `pagamentos_contrato` aggregate table if that approach is chosen).

---

## B6. Contract Parcelas as Dívidas — `devedor_id` Denormalization

**Warning Sign:**
`dividas.devedor_id` points to the PRINCIPAL. Co-devedores only appear in `devedores_dividas`. A co-devedor queried via `dividas.devedor_id = ?` will miss all contract parcelas.

**Prevention Strategy:**
When querying parcelas for a devedor, use `devedores_dividas.devedor_id = ?` join (not `dividas.devedor_id = ?` directly) for any multi-party contract context.

**Phase to Address:** Phase 7 — documented limitation; accepted for v1.4 scope (single devedor per contrato).

---

## B7. Regression Suite Gaps — New Payment Shapes Not Covered

**Warning Sign:**
The 7 TJGO test cases test `calcularSaldoDevedorAtualizado` and `calcularPlanilhaCompleta` with `pagamentos_parciais`-shaped payments. A new contract payment shape or a renamed field (`data` instead of `data_pagamento`) will fail silently — the engine skips the period calculation for payments without a valid `data_pagamento`.

**Prevention Strategy:**
Add Vitest unit tests for contract-level amortization before writing any UI. Use `data_pagamento` as the field name everywhere (the engine reads `pgto.data_pagamento` — wrong key = silent zero saldo).

**Phase to Address:** Phase 7 — tests written before implementing payment DB writes.

---

## B8. `primeiroperiodo` Flag — Multa Applies Only Once Per Dívida

**Warning Sign:**
The engine applies multa and honorários only on the first period per dívida (`primeiroperiodo = true`). A developer building the contract payment flow might assume multa recalculates on each new payment, causing a UI that shows inflated charges.

**Prevention Strategy:**
Do not expose `primeiroperiodo` as a parameter. Document in JSDoc: "multa and honorários apply once, on the first period interval, regardless of number of payments." The engine is always correct as-is — do not add overrides.

**Phase to Address:** Phase 7 — code review gate before payment service merges.

---

## B9. `pagamentos_parciais` vs `pagamentos_divida` — Two Tables, One State Variable

**Warning Sign:**
App.jsx loads `pagamentos_parciais` into `allPagamentos` state and feeds it into `calcularPlanilhaCompleta`. If `pagamentos_divida` is merged into `allPagamentos`, the legacy planilha PDF will double-count payments.

**Prevention Strategy:**
Keep separate state variables. `allPagamentos` = `pagamentos_parciais` only. Load `pagamentos_divida` per-contrato on demand, never merged into the devedor-level payment pool.

**Phase to Address:** Phase 7 — state architecture decision before any component wiring.

---

## B10. Art. 523 CPC — Applied After, Not During, Art. 354 Imputation

**Warning Sign:**
`calcularSaldosPorDivida` applies Art. 523 at the end of each dívida's loop, after all payments. A UI developer might calculate Art. 523 on `valor_total` (pre-payment), producing a much larger figure than the engine uses.

**Prevention Strategy:**
Any display of Art. 523 components must use values from engine output (`calcularDetalheEncargos` → `detalhePorDivida[n].art523`), not independently recalculate from `divida.valor_total`.

**Phase to Address:** Phase 7/8 — when building the PDF table showing "Valor Atualizado" components.

---

## B11. `NUMERIC(15,2)` Returns as String from PostgREST

**Warning Sign:**
Supabase PostgREST returns `NUMERIC` as JSON strings (`"1000.50"`). The engine uses `parseFloat()` which handles this. If any new code uses `Number()` or `parseInt()` on a `null` DB value, `Number(null) = 0` silently — no error.

**Prevention Strategy:**
Always use `parseFloat(row.valor) || 0` (matching the engine pattern). Make `valor` columns `NOT NULL CHECK (valor > 0)` at the DB level. Validate `valor > 0` client-side before INSERT.

**Phase to Address:** Phase 7 — migration SQL + payment service function.
