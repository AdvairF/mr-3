# Domain Pitfalls — v1.1 Pagamentos e Contratos

**Domain:** Brownfield — adding payments (Art. 354 CC) and installment contracts to existing Brazilian legal debt SPA
**Researched:** 2026-04-20
**Confidence:** HIGH — all findings derived from direct codebase inspection + Brazilian Civil Code text

---

## Critical Pitfalls

---

## 1. Column Alias Desync — The `pagamentos_divida` Mirror Problem

**Risk:**
The existing system stores dívidas with DB column names (`indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`) but `devedorCalc.js` requires the JSONB-era aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`). The alias injection happens in a single place: `carregarTudo()` in App.jsx (lines 8346-8355). A new `pagamentos_divida` table will introduce a second entity that flows through `devedorCalc.js`. If any new service or component fetches a dívida independently (bypassing `carregarTudo`), the aliases will be absent and the calc engine will silently receive `undefined` for every financial parameter, computing zeros.

**Prevention:**
- Create a `normalizarDivida(dbRow)` pure function in `dividas.js` that performs the alias injection. Apply it everywhere a dívida row is returned from Supabase — both in `carregarTudo` and in any new `buscarDividaComPagamentos()` function. Never inline the alias mapping again.
- Add a Vitest unit test: `normalizarDivida` must map all four columns. Fail the prebuild if any alias is `undefined`.

**Phase to Address:** First task of the pagamentos phase, before any Supabase query for `pagamentos_divida` is written.

---

## 2. Art. 354 CC Scope Confusion — Devedor-Level vs. Dívida-Level

**Risk:**
The current engine (`calcularSaldoDevedorAtualizado`) applies Art. 354 CC sequentially across *all dívidas of a devedor* in insertion order, sharing a single `pgtoRestantes` array. This is correct for the legacy flow (pagamentos_parciais keyed to `devedor_id`). The new `pagamentos_divida` table will be keyed to a specific `divida_id`. If a payment from `pagamentos_divida` is fed back into `calcularSaldoDevedorAtualizado` alongside `pagamentos_parciais`, the payment will be double-applied: once in the per-dívida Art. 354 loop and again in the cross-dívida loop. The saldo shown in Pessoas/Dashboard will be wrong.

**Prevention:**
- Treat `pagamentos_parciais` (devedor scope) and `pagamentos_divida` (dívida scope) as separate sources. Do not merge them before feeding into the engine.
- `calcularSaldosPorDivida` (already exists) is the correct function for the DetalheDivida view — it applies payments per-dívida. The devedor-level saldo in dashboard and Pessoas must continue to use `calcularSaldoDevedorAtualizado` with `pagamentos_parciais` only. Document this boundary explicitly in `devedorCalc.js`.
- Add a regression test that verifies `calcularSaldoDevedorAtualizado(devedor, [], hoje)` equals the sum of `calcularSaldosPorDivida(devedor, [], hoje)` values, and that feeding a per-dívida payment into `calcularSaldoDevedorAtualizado` does not produce double-reduction.

**Phase to Address:** Architecture decision at phase kickoff. Must be decided before writing the pagamentos service.

---

## 3. Art. 354 CC Order — Juros Applied Before Multa in the Engine

**Risk:**
Art. 354 CC specifies the imputation order: juros → multa → principal. The current engine in `devedorCalc.js` computes `debitoTotal = pcSaldo + juros + multaVal + honorariosVal` and applies the payment as `abate = Math.min(pgto.remaining, debitoTotal)`, then sets `saldo = debitoTotal - abate`. This is lump-sum absorption — the Art. 354 order is *implicit* (if payment < full debt, the remainder stays as a unit). The danger is when building the `pagamentos_divida` UI: if a developer adds a UI that shows how much of a payment went to "juros" vs "principal" by doing a naive component breakdown, the split will be wrong. The correct breakdown must track whether the payment covered the full encargo stack or only part of it (and if partial, imputation starts from juros, not principal).

**Prevention:**
- The engine is correct as a balance calculator. Do not change it.
- If building a payment breakdown display (e.g., "R$ X foi para juros, R$ Y para principal"), implement it by computing `debitoTotal` components, then applying the imputation: if `pgto.valor >= juros` → juros fully paid, if remaining `>= multa` → multa paid, remainder goes to principal. This must be a separate display-only function, not a change to the balance engine.
- Add a specific test case: `pagamento = principal + juros + multa - epsilon` → saldo shows epsilon remaining in principal (not in juros), confirming Art. 354 order in the display layer.

**Phase to Address:** When implementing the pagamentos_divida UI breakdown display. Not needed if only showing total saldo.

---

## 4. Floating Point Currency — `parseFloat` Accumulation Without Rounding

**Risk:**
The engine uses `parseFloat()` throughout and operates in IEEE 754 doubles. For a dívida of R$ 10.000,00 with IGPM correction applied month-by-month, the accumulated floating point error is measurable. The existing tests allow `tolerancia_reais = 1.0`, masking this. When pagamentos_divida introduces many small payments, each `pgto.remaining -= abate` operation compounds the error. With 36 monthly payments of R$ 277,78 (≈ R$ 10.000), the final `remaining` of the last payment can drift by R$ 0,02-0,05 due to FP accumulation, causing the last payment to show a phantom residual.

**Prevention:**
- Do not switch to a bigint/cents representation (that would be a breaking change to the engine and all existing tests). Instead, apply `Math.round(value * 100) / 100` at two points only: (a) when recording `valor` of a pagamento_divida to Supabase (round to 2 decimal places before INSERT), and (b) when computing the final `saldo` to display (round at display time, not inside the loop).
- Never round intermediate values inside the Art. 354 loop — rounding during accumulation makes the error worse, not better.
- The Vitest prebuild gate must include at least one test with installment-style payments (N equal payments summing to total) and assert the final saldo is within R$ 0,05 of zero.

**Phase to Address:** Pagamentos phase, in the `inserirPagamentoDivida` service function and the display layer.

---

## 5. Supabase RLS — `pagamentos_divida` Inherits the `allow_all` Anti-Pattern

**Risk:**
The existing tables (`dividas`, `pagamentos_parciais`, `devedores_dividas`) all use `CREATE POLICY "allow_all" ... USING (true) WITH CHECK (true)`. This is acceptable for a single-tenant deployment (one escritório, all users trusted). However, when `pagamentos_divida` is created, there is a risk that the RLS is forgotten entirely (table created without `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Without RLS enabled, Supabase's anon key would expose all payment records to unauthenticated requests — worse than `allow_all`.

**Prevention:**
- The migration SQL for `pagamentos_divida` must include `ENABLE ROW LEVEL SECURITY` before the policy. Copy the exact three-line pattern from `migration_pagamentos_parciais.sql` lines 17-20.
- Add a post-migration verification query: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename IN ('pagamentos_divida', 'contratos', 'parcelas_contrato')` — must return `rowsecurity = true` for all new tables.
- If the project later moves toward real multi-tenant (v2), this is the table most likely to leak data. Flag in the migration comment.

**Phase to Address:** Migration SQL for both pagamentos and contratos phases.

---

## 6. Contract-Debt Relationship — Modeling Parcelas as Dividas Breaks `devedor_id` Denormalization

**Risk:**
The PROJECT.md decision log states: `devedor_id` in `dividas` = id do PRINCIPAL (desnormalizado) — marked with warning "Manutenção manual em mudanças de PRINCIPAL". A contrato aggregates N dívidas (each parcela = dívida). If a contrato has multiple co-devedores, and the `devedor_id` on each parcela-dívida points to the PRINCIPAL, then `carregarTudo` correctly groups all parcelas under the principal's `dividasMap`. But if a co-devedor views their record, they will not see the contract parcelas at all (their `devedor_id` is not the FK on the `dividas` row — they only appear in `devedores_dividas`). This creates an asymmetry: the principal sees all, co-devedores see nothing, and `calcularSaldoDevedorAtualizado` for the co-devedor returns zero.

**Prevention:**
- Do not use `dividas.devedor_id` as the only join key for contract parcelas. Build a `contratos` table with its own `devedor_id` (PRINCIPAL FK) plus join through `devedores_dividas` for co-devedores.
- When querying contract parcelas for a devedor, always use `devedores_dividas.devedor_id = ?` (joining through the FK table), not `dividas.devedor_id = ?` directly.
- The `calcularSaldoDevedorAtualizado` function reads `devedor.dividas[]` which is built in `carregarTudo` from `dividasMap.get(devedor.id)`. This means co-devedores will always get an empty dividas array for contracts. Either: (a) accept this and only compute saldo from the PRINCIPAL's perspective, or (b) rebuild the dividasMap to include dividas where the devedor appears in `devedores_dividas` (not just as `dividas.devedor_id`). Option (b) is the architecturally correct path but requires a more expensive `carregarTudo` query.

**Phase to Address:** Contratos phase architecture design, before any migration.

---

## 7. Breaking the Prebuild Gate — Regression Suite Does Not Cover New Code Paths

**Risk:**
The 7 TJGO test cases in `calculos.test.js` test `calcularSaldoDevedorAtualizado` and `calcularPlanilhaCompleta` with `pagamentos_parciais`-shaped payments (array of `{data_pagamento, valor}`). A new `pagamentos_divida` service might introduce a different data shape (e.g., `{data, valor, observacao}` without `data_pagamento`) that fails silently — `parseFloat(p.valor)` returns the value but `p.data_pagamento` is `undefined`, so the payment is treated as having no date and the Art. 354 loop skips the period calculation entirely (line 93-98 of `devedorCalc.js`: `if (!periodoFim || periodoFim <= periodoInicio)` → falls into the "no period" branch and absorbs without accruing).

**Prevention:**
- The `pagamentos_divida` DB schema and service must use `data_pagamento` as the column name (matching the existing payment shape the engine expects), not `data` or `data_pgto`.
- Add at least 2 new test cases to `calculos.test.js` before writing any UI: (1) single per-dívida payment that partially covers juros, and (2) contract parcelas simulating 3 monthly installments with IGPM correction.
- Run `npm run test:regressao` in CI. The prebuild gate is already in `package.json` — do not bypass it.

**Phase to Address:** First task of pagamentos phase, before implementing any payment form.

---

## 8. `primeiroperiodo` Flag — Multa and Honorários Only Apply Once Per Dívida

**Risk:**
The engine sets `primeiroperiodo = true` and applies multa and honorários only on the first payment period. After the first payment, `primeiroperiodo = false` and multa is never applied again to that dívida. This is correct legal behavior (Art. 389/395 CC — mora is established once). But a developer adding the pagamentos UI might misread the code and assume that entering a new payment always triggers multa recalculation — causing them to add client-side recalculation that double-applies the multa, or to incorrectly reset `primeiroperiodo` when re-running the engine after a new payment is inserted.

**Prevention:**
- The engine must never be called with `primeiroperiodo = true` manually. It is internal state. The engine is stateless and always starts `primeiroperiodo = true` per dívida — this is correct because the multa is determined by the first period between `data_inicio_atualizacao` and the first payment date.
- Do not add any flag or parameter to `devedorCalc.js` functions to control `primeiroperiodo`. The only valid input is `{devedor, pagamentos[], hoje}`.
- Document in the function JSDoc: "multa and honorários apply once, on the first period interval, regardless of number of payments."

**Phase to Address:** Code review gate before any pagamentos_divida integration into the calc engine.

---

## 9. `pagamentos_parciais` vs `pagamentos_divida` — Two Tables, Two Scopes, One UI Conflict

**Risk:**
App.jsx line 2511 loads `pagamentos_parciais` keyed by `devedor_id` and displays them in the legacy "planilha de pagamentos" flow (gerarPlanilhaPDF path). The new `pagamentos_divida` table will be keyed by `divida_id`. If `carregarTudo` is updated to also load `pagamentos_divida` and merge them into `allPagamentos`, the legacy planilha PDF will include them as double-counted, because `calcularPlanilhaCompleta` already uses `pagamentos_parciais` separately. The two tables cannot share the same state variable.

**Prevention:**
- Keep `allPagamentos` (state) as `pagamentos_parciais` only — do not add `pagamentos_divida` to it.
- Add a separate `allPagamentosDivida` state variable (or load per-dívida on demand in `DetalheDivida`).
- The DetalheDivida component (line 72: `const pagamentosDoDevedor = allPagamentos.filter(...)`) currently shows pagamentos_parciais. For v1.1, it should show `pagamentos_divida` filtered by `divida_id` — this is a different filter key. Do not re-use the existing `pagamentosDoDevedor` variable for this.

**Phase to Address:** Pagamentos phase, when wiring `DetalheDivida` to display `pagamentos_divida`.

---

## 10. Art. 523 CPC — Applied After, Not During, Art. 354 Imputation

**Risk:**
`calcularSaldosPorDivida` applies Art. 523 (`calcularArt523`) at the *end* of each dívida's loop, after all payments have been absorbed. This is legally correct — Art. 523 §1º CPC multa is a court-imposed penalty applied to the residual balance, not to the original debt. A developer adding a "show breakdown" feature might calculate Art. 523 on the original `valor_total` (pre-payment), producing a breakdown that shows a much higher Art. 523 component than the engine actually uses.

**Prevention:**
- Any display of Art. 523 components must use values from the engine output, not independently recalculate from `divida.valor_total`.
- The `calcularDetalheEncargos` function in `devedorCalc.js` already provides `art523` in `detalhePorDivida`. Use this, not a custom formula.

**Phase to Address:** UI implementation in DetalheDivida when showing payment history.

---

## 11. Contract Parcelas as Dívidas — `status` Field Inconsistency

**Risk:**
The `dividas` table has a `status TEXT DEFAULT 'em cobrança'` with values `'em cobrança'`, `'quitada'`, `'acordo'`. If each parcela of a contract is a separate dívida row, the `status` of each parcela must be individually managed. There is no automatic cascade: paying a parcela does not flip its status to `'quitada'`. The `AtrasoCell` badge (`5-tier por data_vencimento`) will show each parcela in red/overdue even after full payment because it reads `data_vencimento` from the row and does not check actual payment coverage.

**Prevention:**
- Define explicit business rules at design time: "a parcela-dívida is quitada when the sum of `pagamentos_divida` where `divida_id = parcela.id` covers the full saldo atualizado." Implement a server-side trigger or a client-side `atualizarStatusParcela()` function that runs after each payment insert.
- `AtrasoCell` must be updated (or overridden for contract parcelas) to check payment coverage, not just `data_vencimento`.
- The `ModuloDividas` table will show all parcelas as separate rows. Decide whether parcelas are visible in the global table or only inside the contract detail view. Showing them exposes N rows per contract, inflating the table.

**Phase to Address:** Contratos phase, before any migration or UI work.

---

## 12. `NUMERIC(15,2)` in DB vs. `parseFloat` in Engine — Supabase Returns Strings

**Risk:**
Supabase PostgREST returns `NUMERIC` columns as JSON strings (e.g., `"10000.00"`), not as JavaScript numbers. The engine calls `parseFloat(div.valor_total)` which handles this correctly. But for `pagamentos_divida.valor`, if a developer uses `Number(pgto.valor)` instead of `parseFloat`, and the value comes back as `"1000.50"`, `Number("1000.50")` returns `1000.5` — this is fine. However, `pgto.valor` could also be `null` (if the column is nullable and the INSERT omitted it), causing `Number(null) = 0` silently. `parseFloat(null) = NaN`, which the engine guards against with `|| 0`. Using inconsistent coercion patterns between the service layer and the engine will cause some edge cases to return wrong values instead of errors.

**Prevention:**
- Make `valor` in `pagamentos_divida` `NOT NULL` with a `CHECK (valor > 0)` constraint at the DB level.
- In the service layer, always use `parseFloat(row.valor) || 0` (matching the engine's existing pattern). Never use `Number()`, `+value`, or `parseInt()` for currency values.
- In the INSERT service for `inserirPagamentoDivida`, validate `valor > 0` client-side before hitting Supabase.

**Phase to Address:** Migration SQL + `pagamentos_divida` service function, first pass.

---

## Phase-Specific Warnings Summary

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| `pagamentos_divida` migration | Missing `ENABLE ROW LEVEL SECURITY` | Copy pattern from `migration_pagamentos_parciais.sql` exactly |
| `pagamentos_divida` service | Column name `data_pagamento` (not `data`) | The engine checks `pgto.data_pagamento` — wrong key = silent zero saldo |
| Alias injection | Fetching dívida independently of `carregarTudo` | Centralize `normalizarDivida()` before writing any service |
| Payment UI display | Art. 354 breakdown shown incorrectly | Use engine output, never recalculate components in UI |
| Contract + co-devedores | `dividas.devedor_id` misses co-devedores | Use `devedores_dividas` join for contract queries |
| Contract parcelas table | `AtrasoCell` shows paid parcelas as overdue | Add payment-coverage check to status logic |
| `allPagamentos` state | Merging `pagamentos_divida` into `pagamentos_parciais` state | Keep separate state variables; never merge the two |
| Regression suite | New payment shapes not covered | Add installment test cases before any UI work |
| FP accumulation | Final installment phantom residual | Round only at INSERT and display, never inside the loop |
| `primeiroperiodo` flag | Developer resets flag during recalc | Do not expose flag; keep it internal to engine |
