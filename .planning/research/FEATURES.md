# Feature Landscape — v1.4 Pagamentos por Contrato + PDF Demonstrativo

**Domain:** Brazilian legal debt collection SPA — small law firm (2–10 lawyers)
**Milestone:** v1.4 — Contract-level payment amortization + professional PDF debt statement
**Researched:** 2026-04-22
**Confidence:** HIGH — based on direct codebase inspection + Brazilian Civil Code / CPC knowledge

---

## Context: What Already Exists

- `pagamentos_divida` table — payment per individual dívida row (used in DetalheDivida)
- `calcularSaldosPorDivida()` — Art. 354 CC engine: sequential amortization per dívida, oldest first
- `calcularSaldoPorDividaIndividual()` — thin adapter for single-dívida scope
- `contratos_historico` — CHECK constraint: `tipo_evento IN ('criacao', 'alteracao_encargos', 'cessao_credito', 'assuncao_divida', 'alteracao_referencia', 'outros')`
- `DetalheContrato.jsx` — shows Documentos > Parcelas table with saldo column (lazy-loaded per expanded doc), Histórico collapsible, edit mode
- `saldo_quitado BOOLEAN` on `dividas` — already updated by `atualizarSaldoQuitado()` in `PagamentosDivida.jsx`
- `calcularPlanilhaCompleta()` — full ledger engine used in existing PDF generation (devedor-level)
- No PDF generation currently exists at the contract level

---

## F1 — Pagamento no Contrato (Registrar Pagamento)

### What it does

Advogado fills a form (data, valor, observação) in DetalheContrato. System finds all open parcelas of the contract sorted by `data_vencimento` ascending, runs the Art. 354 CC amortization sequentially across them (oldest first), inserts rows into `pagamentos_divida` for each affected parcela, and calls `atualizarSaldoQuitado()` for each parcela whose balance reaches zero.

### Table Stakes

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Form in DetalheContrato: data + valor + observação | Without this the feature does not exist | Low | Same field set as PagamentosDivida form — reuse controlled-input pattern |
| Identify open parcelas in vencimento-asc order | Art. 354 CC + commercial practice: oldest debt first | Low | `dividas` filtered by `contrato_id`, `!saldo_quitado`, sorted by `data_vencimento` ascending |
| Sequential amortization across parcelas | Core legal requirement (CC Art. 354) | Medium | Must call `calcularSaldoPorDividaIndividual` per parcela in order, track remaining payment value |
| Insert `pagamentos_divida` row per affected parcela | Existing service is already written — call `criarPagamento()` per parcela | Low | One row per parcela that receives any allocation; `observacao` propagated from form input |
| Call `atualizarSaldoQuitado(parcelaId, true)` when parcela balance reaches zero | Keeps `saldo_quitado` flag in sync — relied on by AtrasoCell, Resumo Financeiro | Low | Already exists in `dividas.js` service |
| Toast on success showing number of parcelas affected | User feedback; mentioned in PROJECT.md PAGCON-03 | Minimal | "Pagamento registrado. X parcelas amortizadas." |
| Disable form during save (salvando state) | Prevent double-submit | Minimal | Same pattern as existing forms |
| Reload data after save | DetalheContrato must reflect updated saldos | Minimal | Call `onCarregarTudo()` then re-trigger saldo calculations |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Show preview of which parcelas will be affected before confirm | Transparency before committing | Medium | Compute allocation dry-run client-side, show affected parcelas count + which ones fully vs partially paid |
| Validate payment value against total open saldo of contract | Warn if overpayment (value > total remaining) | Low | Compute total open saldo before form submit; show warning badge but do not block |
| Progress indicator per parcela during multi-insert | Useful for contracts with many parcelas | Low | Only relevant if N > 10; for typical contracts (3–24 parcelas) the operation is fast enough |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Let user choose which parcela to apply payment to | Violates CC Art. 354 — order is legally mandated | Always oldest-first, no manual imputation selection |
| Update a single shared `pagamentos_contrato` table instead of per-dívida rows | Would bypass the existing Art. 354 engine and saldo_quitado logic | Insert into `pagamentos_divida` per parcela — reuse the entire existing payment infrastructure |
| Apply correction/juros to determine exact allocation per parcela | The existing `calcularSaldoPorDividaIndividual` already does this — do not re-implement | Call the existing engine with the payment value as the credit and let it determine how much of each parcela is absorbed |
| Allow payment date in the future | Generates negative balance before the fact | Validate `data_pagamento <= hoje` client-side |
| Rollback individual parcela inserts on failure | Complex and not needed at this scale | Wrap in try/catch; if insert fails mid-way, show error with how many parcelas were processed — advogado can manually correct |

### Edge Cases

**EC-F1-1: Payment smaller than the saldo of the first (oldest) parcela**
- Scenario: Contract has 3 open parcelas. Payment value = R$ 500. Parcela 1 saldo atualizado = R$ 800.
- Expected: Insert one `pagamentos_divida` row for Parcela 1 with valor = R$ 500. Parcela 1 `saldo_quitado` stays false. Parcelas 2 and 3 untouched.
- Note: The `calcularSaldoPorDividaIndividual` function returns the new saldo after applying the payment. If the new saldo > 0, the parcela is not quitada.

**EC-F1-2: Payment exactly covers one parcela and partially covers the next**
- Scenario: Parcela 1 saldo = R$ 300 (valor_total R$ 300 + juros). Parcela 2 saldo = R$ 300. Payment = R$ 450.
- Expected: Insert pagamentos_divida for Parcela 1 with valor that covers it fully (mark quitada = true). Remaining R$ 150 applied to Parcela 2 (partial). Parcela 2 saldo_quitado stays false.
- Implementation risk: Must track `remaining` across the parcela loop. The Art. 354 engine is not designed for cross-dívida allocation within a single payment — this logic must be implemented in the new `registrarPagamentoContrato` function, NOT in `devedorCalc.js`.
- Algorithm: `remaining = paymentValue; for each parcela in asc vencimento order: if remaining <= 0 break; saldo = calcularSaldoPorDividaIndividual(parcela, existingPgtos, today); toApply = Math.min(remaining, saldo + epsilon); insert pagamentos_divida(parcelaId, min(toApply, saldo)); if toApply >= saldo: mark quitada=true; remaining -= toApply;`

**EC-F1-3: Payment larger than the total open saldo of the contract**
- Scenario: Total remaining saldo across all open parcelas = R$ 400. Payment = R$ 600.
- Expected: All open parcelas become quitada. Excess R$ 200 is absorbed (no negative saldos). Toast: "X parcelas quitadas. Valor excedeu o saldo total — R$ 200,00 não absorvidos." OR simply mark all as quitadas and note the excess in the observação field.
- Do not create a credit/overpayment record — this system has no credit balance concept.

**EC-F1-4: All parcelas of the contract are already quitadas**
- Scenario: Contract fully paid prior to registering the new payment.
- Expected: Disable the payment form and show a "Contrato quitado" badge. If form is submitted anyway, validate that no parcelas with `!saldo_quitado` exist and show a toast error.

**EC-F1-5: Parcela with saldo_quitado=true but payment history is incomplete**
- Scenario: A parcela is marked quitada but `calcularSaldoPorDividaIndividual` (recalculated fresh) shows non-zero saldo (e.g., because `pagamentos_divida` rows were deleted manually in Supabase).
- Expected: Treat `saldo_quitado` as the source of truth for the amortization loop (i.e., skip quitadas). Do not re-open a parcela by re-reading saldo from scratch on every contract payment — this would be inconsistent with existing behavior in PagamentosDivida.

**EC-F1-6: saldo atualizado changes between the time the form loads and the time the user submits**
- Scenario: Two lawyers both open the same contract and register payments simultaneously (unlikely but possible).
- Expected: No special handling needed at this scale (single-tenant, small team). Last write wins. Supabase RLS does not enforce serialization. Document this limitation as a known non-issue for 2–10 users.

**EC-F1-7: Floating point when splitting payment across parcelas**
- Scenario: Payment of R$ 1.000,00 split across 3 parcelas with correction applied.
- Risk: `remaining -= toApply` accumulates FP error. Last parcela gets slightly more or less than needed.
- Prevention: Apply `Math.round(value * 100) / 100` to `toApply` before INSERT (not during allocation). Use `Math.max(0, ...)` on `remaining` after last subtraction to prevent negative remaining.

### Dependencies on Existing Code

- `calcularSaldoPorDividaIndividual(parcela, pgtos, hoje)` — `src/services/pagamentos.js` — to compute per-parcela saldo before applying payment
- `listarPagamentos(parcelaId)` — `src/services/pagamentos.js` — to get existing payment rows per parcela (needed as input to the calc function)
- `criarPagamento({ divida_id, data_pagamento, valor, observacao })` — `src/services/pagamentos.js` — to persist the allocation
- `atualizarSaldoQuitado(parcelaId, true, status)` — `src/services/dividas.js` — to flip saldo_quitado flag
- `registrarEvento(contratoId, 'pagamento_recebido', snapshot)` — `src/services/contratos.js` — for F4
- `onCarregarTudo()` prop on DetalheContrato — to reload allDividas after mutation
- `dividas` filtered by `contrato_id` — already available as the `dividas` prop passed to DetalheContrato

---

## F2 — Seção "Pagamentos Recebidos" em DetalheContrato

### What it does

Collapsible section in DetalheContrato (same pattern as Histórico section) that lists all contract-level payments in chronological order with: data, valor, parcelas afetadas, observação.

### Table Stakes

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| Collapsible section "Pagamentos Recebidos" below Histórico | User needs to see payment history at the contract level — not just per-parcela | Low | Same collapsible UI pattern as Histórico section (toggle state, lazy-load on first open) |
| Chronological list of all payments (oldest first) | Audit trail for the advogado | Low | Group `pagamentos_divida` rows by `observacao` + `data_pagamento` to reconstruct contract-level payments; OR use `contratos_historico` pagamento_recebido events (F4) as the index |
| Each payment row shows: data, valor total pago, parcelas afetadas (N parcelas), observação | Essential context to understand what each payment did | Low | "Parcelas afetadas" = count of `pagamentos_divida` rows with matching `data_pagamento` + `observacao` |
| Total paid counter at section footer | Quick aggregate for advogado | Low | Sum of all `pagamentos_divida.valor` for parcelas in this contract |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Expand each payment row to show per-parcela allocation detail | Transparency into how each real was distributed | Medium | Drill-down: "Pagamento de R$ 1.200 → Parcela 1: R$ 800 (quitada), Parcela 2: R$ 400 (parcial)" |
| Visual indicator when a payment caused one or more parcelas to become quitadas | Quick audit view | Low | Badge or checkmark on the row |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Build a new `pagamentos_contrato` table to serve this section | Adds schema complexity when the data already exists in `pagamentos_divida` + `contratos_historico` | Reconstruct view from existing tables; use `contratos_historico` eventos `pagamento_recebido` as the primary index |
| Show real-time saldo recalculation per payment in the list | Expensive and not needed here — saldo is shown in the parcelas table | Show allocation amounts stored at payment time in the event snapshot |
| Allow deletion of individual contract-level payments from this section | Deletion of a contract payment would need to reverse N `pagamentos_divida` rows — complex and risky | Mark as read-only; advogado must correct via the individual parcela's DetalheDivida if needed |

### Edge Cases

**EC-F2-1: Grouping logic for "what constitutes one contract payment"**
- If using `pagamentos_divida` as the data source, multiple rows from the same contract payment have the same `data_pagamento` and similar `observacao` — but there is no formal contract_payment_id linking them.
- Recommendation: Use `contratos_historico` events of tipo `pagamento_recebido` (F4) as the authoritative list of contract-level payments. Each event's `snapshot_campos` contains the total amount and parcelas affected. The `pagamentos_divida` rows are the implementation detail.
- If F4 is not implemented first, fall back to grouping `pagamentos_divida` rows by `(data_pagamento, observacao)` — fragile but acceptable for MVP.

**EC-F2-2: Contract with no payments yet**
- Display "Nenhum pagamento registrado" empty state. Do not show a loading spinner after the lazy-load finds zero rows.

**EC-F2-3: Contract with payments made at the individual parcela level (via DetalheDivida, not via F1)**
- Parcelas may have `pagamentos_divida` rows inserted via the existing PagamentosDivida UI, not through the new F1 flow. These will not appear in `contratos_historico` as `pagamento_recebido` events.
- Recommendation: The F2 section should note this distinction — "Pagamentos via contrato" (F4 events) vs "Pagamentos por parcela" (DetalheDivida). For MVP, only show F4 events in F2. Individual parcela payments are visible in each parcela's DetalheDivida.

### Dependencies on Existing Code

- `listarHistorico(contratoId)` — `src/services/contratos.js` — already exists; filter by `tipo_evento = 'pagamento_recebido'` for F2
- Histórico collapsible UI pattern in DetalheContrato.jsx (lines 493–631) — copy the structural pattern
- `contratos_historico.snapshot_campos` — must store the payment data in a predictable shape (see F4)

---

## F3 — PDF Demonstrativo de Débito

### What it does

Button "Gerar PDF" in DetalheContrato produces a professionally formatted PDF debt statement for judicial use ("demonstrativo de débito") containing: law firm header, contract metadata, installment table with Valor Atualizado, payment history, and totals.

### Table Stakes — Legally Required Fields

These fields are expected in a `demonstrativo de débito` per CPC Art. 524 (execução por quantia certa) and standard practice in Brazilian lower courts:

| Field | Legal Basis | Notes |
|-------|-------------|-------|
| Identification of credor (nome, CPF/CNPJ) | CPC Art. 524 I | Hardcoded from contract credor |
| Identification of devedor (nome, CPF/CNPJ) | CPC Art. 524 I | From devedores table |
| Nature of the debt / contrato reference (referencia, tipo documento) | CPC Art. 524 II | From `contratos_dividas.referencia` + documento tipo |
| Original value of each installment (Valor Original) | CPC Art. 524 III | `dividas.valor_total` per parcela |
| Date of maturity of each installment (Data Vencimento) | CPC Art. 524 III | `dividas.data_vencimento` |
| Monetary correction index used and accrued correction amount | CPC Art. 524 IV | `indice_correcao` from parcela; correction amount from engine |
| Interest rate and accrued interest | CPC Art. 524 V | `juros_tipo` + `juros_am_percentual`; accrued juros from engine |
| Contractual penalty (multa) | CPC Art. 524 VI | `multa_percentual`; value from engine |
| Attorney fees (honorários) | CPC Art. 524 VII | `honorarios_percentual`; value from engine |
| Payments received (date + amount) | CPC Art. 524 | From `contratos_historico` pagamento_recebido or `pagamentos_divida` |
| Calculation date (data de emissão) | Standard practice | Date the PDF is generated |
| Closing balance per parcela (Saldo Devedor) | Standard practice | Valor Atualizado minus Pago |
| Total updated value of all parcelas | CPC Art. 524 | Sum of individual Valor Atualizado |
| Total received | Standard practice | Sum of all payments |
| Total outstanding balance | Standard practice | Total Atualizado minus Total Pago |
| Statement footer: "Calculado com base em [índices]" | Credibility / reproducibility | Note the correction basis |

### Table Stakes — UX

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| "Gerar PDF" button in DetalheContrato header | Entry point | Minimal | Button opens generation process |
| Loading state during generation | PDF generation takes 200–800ms for 24 parcelas | Minimal | Disable button, show spinner |
| Auto-download the generated PDF | Standard behavior — no server needed | Low | Use jsPDF `.save('demonstrativo-[referencia]-[date].pdf')` |
| Professional layout: header, table, totals, footer | Required for judicial use | Medium | jsPDF + jsPDF-autotable (see Stack note below) |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Per-parcela breakdown of encargo components (correção + juros + multa + honorários as separate columns or footnote) | Demonstrates calculation transparency for judge/counter-party | High | Adds 4+ columns to the table; may not fit on A4; consider appended schedule |
| "Assinatura do Advogado" placeholder line at bottom | Required for petitions; professional appearance | Minimal | Static text + underline in footer |
| Page numbers ("Página X de Y") | Required for multi-page documents | Low | jsPDF-autotable handles this natively |
| Stamp "PRELIMINAR — sujeito a revisão" watermark | Prevents accidental use of draft | Low | jsPDF `text()` at 45° opacity |
| Include Histórico de Eventos relevant to the contract (cessão, assunção) | Complete legal narrative | Medium | Optional section after totals |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Server-side PDF generation (Supabase Edge Function) | SPA constraint — no own backend | All generation client-side via jsPDF |
| React-PDF / @react-pdf/renderer | Heavier dependency, different rendering model; jsPDF already exists in the codebase (`gerarPlanilhaPDF` uses it) | Reuse jsPDF pattern |
| Sending PDF via email from the app | No email infrastructure; out of scope | Generate PDF, let advogado attach manually |
| Storing the PDF in Supabase Storage | Adds storage management, cost, permissions | On-demand generation; no storage |
| Pulling real-time correction indices at PDF generation time | BCB API may be slow or unavailable; indices already loaded at app startup via `bcbApi.js` and `setIndicesOverride()` | Use `getIndicesMerged()` already in memory |

### "Valor Atualizado" Column — Definition and Calculation

**What it means:** The current value of each parcela as of the PDF generation date, including monetary correction, interest, penalty (multa), and attorney fees, applied per Art. 354 CC order, and then reduced by any payments already received against that parcela.

**Formula (per parcela, as of `dataEmissao = today`):**
```
saldo_atualizado = calcularSaldoPorDividaIndividual(parcela, pagamentosDaParcela, dataEmissao)
```

Where `calcularSaldoPorDividaIndividual` internally calls `calcularSaldosPorDivida` (the Art. 354 engine), which applies:
1. Monetary correction from `data_inicio_atualizacao` to `dataEmissao` using `indice_correcao`
2. Interest (`juros_am_percentual`) on the corrected balance
3. Multa (`multa_percentual`) on the corrected balance (once, first period only)
4. Honorários (`honorarios_percentual`) on corrected balance + juros + multa
5. Abatimento of all `pagamentos_divida` for this parcela

**Display:** The Valor Atualizado column shows `saldo_atualizado` as formatted BRL. If the parcela is quitada (`saldo_quitado = true`), display R$ 0,00 with a "Quitada" badge.

**Note on "Valor Original" vs "Valor Atualizado":** The existing `DetalheContrato` parcelas table currently shows `Valor` (original, from `dividas.valor_total`) and `Saldo` (computed lazy). The PDF Demonstrativo needs both in adjacent columns. The saldo computation is the same as what is already done in the existing expanded-doc view — the difference is that the PDF must compute ALL parcelas, not just the expanded one.

**Implementation path:**
- For each parcela in the contract: call `listarPagamentos(parcela.id)` → call `calcularSaldoPorDividaIndividual(parcela, pgtos, today)` → this is the "Valor Atualizado" for that row.
- Total Valor Atualizado = sum of all per-parcela `saldo_atualizado` values (before individual payments, i.e., the gross updated value). Need to clarify: "Valor Atualizado" in the PDF column = gross updated value before payments (so the table shows: Original | Atualizado | Pago | Saldo). The engine as called via `calcularSaldoPorDividaIndividual` already nets payments. To get gross Valor Atualizado, call the engine with `pagamentos = []` (empty array).

**Correct per-row calculation for the PDF table:**
```
valor_original   = parcela.valor_total
valor_atualizado = calcularSaldoPorDividaIndividual(parcela, [], today)   // gross, no payments
total_pago       = pagamentos.reduce((s, p) => s + p.valor, 0)
saldo            = Math.max(0, valor_atualizado - total_pago)
```

This gives a coherent table where: Atualizado − Pago = Saldo, which is auditable by the judge.

### PDF Structure (A4 Portrait, Standard Legal Layout)

```
┌─────────────────────────────────────────────────────────┐
│  [NOME DO ESCRITÓRIO]                          [Logo?]  │
│  DEMONSTRATIVO DE DÉBITO                                │
│  Emitido em: DD/MM/AAAA                                 │
├─────────────────────────────────────────────────────────┤
│  Credor:  [nome]              Devedor: [nome]           │
│  Contrato: [referencia]       Tipo: [NF/C&V/Empr.]      │
│  Índice de correção: [IGPM/IPCA/SELIC]                  │
│  Juros: [X% a.m.]   Multa: [X%]   Honorários: [X%]     │
├─────────────────────────────────────────────────────────┤
│  PARCELAS                                               │
│  Nº | Vencimento | Valor Original | Valor Atualizado |  │
│     | Pago       | Saldo          | Status            │  │
├─────────────────────────────────────────────────────────┤
│  [table rows...]                                        │
├─────────────────────────────────────────────────────────┤
│  TOTAIS                                                 │
│  Total Valor Original:    R$ X                         │
│  Total Valor Atualizado:  R$ X                         │
│  Total Pago:              R$ X                         │
│  SALDO DEVEDOR:           R$ X   (destaque)            │
├─────────────────────────────────────────────────────────┤
│  PAGAMENTOS RECEBIDOS                                   │
│  Data | Valor | Observação                              │
│  [payment rows...]                                      │
├─────────────────────────────────────────────────────────┤
│  Valores calculados conforme Art. 354 CC.               │
│  Correção: [índice]. Juros: [regime].                  │
│  Data-base de atualização: [data_emissao].              │
│                                                         │
│  [Localidade], [data]                                   │
│  ___________________________                            │
│  [Nome do Advogado] — OAB [nº]                          │
└─────────────────────────────────────────────────────────┘
```

### Stack Note for PDF Generation

jsPDF is already used in the codebase (existing `gerarPlanilhaPDF` function in App.jsx). The `jspdf-autotable` plugin is required for the multi-row table. Check whether it is already installed:
- If yes: import directly from existing pattern.
- If no: `npm install jspdf-autotable` — minor addition; no architectural impact. The `jspdf` package is already a direct dependency.

### Dependencies on Existing Code

- `jsPDF` — already in project (used by `gerarPlanilhaPDF` in App.jsx)
- `calcularSaldoPorDividaIndividual()` — `src/services/pagamentos.js` — called with empty payments array for gross Valor Atualizado
- `listarPagamentos(parcelaId)` — `src/services/pagamentos.js` — for Pago column
- `listarDocumentosPorContrato(contratoId)` — `src/services/contratos.js` — already called in DetalheContrato
- `getIndicesMerged()` — `src/utils/correcao.js` — uses already-loaded monetary indices
- `contrato` object — already in scope in DetalheContrato (credor, devedor, referencia, encargos)
- `dividas` filtered by `contrato_id` — already passed as prop to DetalheContrato

---

## F4 — Evento `pagamento_recebido` em contratos_historico

### What it does

Every call to F1's `registrarPagamentoContrato()` also inserts a row in `contratos_historico` with `tipo_evento = 'pagamento_recebido'` and a snapshot that captures the total payment amount and the list of parcelas affected.

### Table Stakes

| Feature | Why Required | Complexity | Notes |
|---------|--------------|------------|-------|
| ADD 'pagamento_recebido' to the CHECK constraint in `contratos_historico` | Without this, inserts will fail at the DB level | Low | Migration: `ALTER TABLE contratos_historico DROP CONSTRAINT [constraint_name]; ALTER TABLE contratos_historico ADD CONSTRAINT contratos_historico_tipo_evento_check CHECK (tipo_evento IN ('criacao', 'alteracao_encargos', 'cessao_credito', 'assuncao_divida', 'alteracao_referencia', 'outros', 'pagamento_recebido'));` |
| Add label for 'pagamento_recebido' in TIPO_EVENTO_LABELS in DetalheContrato.jsx | UI label for the Histórico section | Minimal | `pagamento_recebido: "Pagamento registrado"` |
| Snapshot format: `{ valor_total, data_pagamento, observacao, parcelas_afetadas: [{divida_id, valor, quitada}] }` | F2 reads this snapshot to display payment details | Low | Shape must be defined at implementation time and kept stable |
| `registrarEvento()` call fires after all `pagamentos_divida` inserts succeed | Order dependency: event is the summary, not the mechanism | Low | Call as fire-and-forget (same pattern as `criacao` event in `criarContrato`) — use `.catch(() => {})` |

### Differentiators

| Feature | Value | Complexity | Notes |
|---------|-------|------------|-------|
| Show `pagamento_recebido` events in the existing Histórico collapsible section | No extra UI needed — events appear automatically | Minimal | Just add the label; the timeline rendering already handles any tipo_evento |
| Snapshot includes `saldo_contrato_antes` and `saldo_contrato_depois` | Complete audit trail | Low | Compute total contract saldo before and after payment; store in snapshot |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Create a separate `pagamentos_contrato` table | Adds schema complexity for data that is already captured in `pagamentos_divida` + historico | Use `contratos_historico` as the index and `pagamentos_divida` as the ledger |
| Block F1 if the historico INSERT fails | The historico event is audit, not mechanics — payment must proceed | Fire-and-forget with `.catch(() => {})` |
| Store full correction-adjusted amounts in snapshot | Stale data as of the snapshot date; recalculation may differ | Store only the input data (valor_total, data_pagamento, parcelas[{id, valor_aplicado}]) |

### Edge Cases

**EC-F4-1: Rebuilding the CHECK constraint without downtime**
- The existing CHECK constraint on `tipo_evento` is named by Postgres convention. On Supabase, use: `ALTER TABLE contratos_historico DROP CONSTRAINT contratos_historico_tipo_evento_check; ALTER TABLE contratos_historico ADD CONSTRAINT contratos_historico_tipo_evento_check CHECK (tipo_evento IN (..., 'pagamento_recebido'));`
- The constraint name must be confirmed by running `\d contratos_historico` in the Supabase SQL Editor. Do not hardcode the constraint name in the migration without first verifying it.
- Existing data is not affected — no rows exist with the new value.

**EC-F4-2: F2 reads historico but historico has events from before F4 was implemented**
- Pre-F4 contracts have no `pagamento_recebido` events even if they have `pagamentos_divida` rows (created via individual parcela payment in DetalheDivida).
- F2 must handle this gracefully: if filtering `contratos_historico` by `pagamento_recebido` returns empty, fall back to showing a note "Pagamentos individuais por parcela — ver DetalheDivida de cada parcela."

**EC-F4-3: `usuario_id` is filled by `DEFAULT auth.uid()` — no explicit pass**
- This is already the pattern in `registrarEvento()`. Do not pass `usuario_id` explicitly.

### Dependencies on Existing Code

- `registrarEvento(contratoId, tipoEvento, snapshotCampos)` — `src/services/contratos.js` — already exists; just call with new `tipoEvento`
- `contratos_historico` table + RLS — already deployed
- `TIPO_EVENTO_LABELS` object in `DetalheContrato.jsx` (line 46) — add new entry
- Migration for CHECK constraint — new SQL, no code dependency beyond the migration itself

---

## Feature Dependencies (v1.4)

```
F4 (DB migration: CHECK constraint) → F1 (registrarPagamentoContrato calls registrarEvento)
F1 (payment inserts into pagamentos_divida) → F2 (reads pagamentos_divida + historico)
F1 (saldo_quitado updated per parcela) → F3 (PDF shows correct saldo per parcela)
F3 (PDF reads per-parcela saldo) → requires listarPagamentos per parcela to be efficient
```

**Recommended implementation order:**
1. F4 first (migration only — no UI) — unblocks F1 from the DB side
2. F1 — core payment logic
3. F2 — reads from F1's historico events
4. F3 — reads from F1's saldo state; can be parallelized after F1 is complete

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| F1 — amortization loop | Must track `remaining` across parcelas — this is NEW logic not in devedorCalc.js | Implement in a standalone `distribuirPagamentoEmParcelas()` pure function; unit test before integrating |
| F1 — existing saldo computation | `calcularSaldoPorDividaIndividual` must receive existing `pagamentos_divida` for that parcela — forgetting this returns gross value instead of net saldo | Always call `listarPagamentos(parcelaId)` first; never pass empty array when computing how much room is left in a parcela |
| F3 — "Valor Atualizado" column | Easy to confuse net saldo (after payments) with gross updated value (before payments) | Gross = call engine with empty payments; net saldo = call engine with actual payments; column shows gross; "Saldo" column shows net |
| F3 — performance | Generating PDF for a 24-parcela contract requires 24 async `listarPagamentos` calls | Run in `Promise.all()` before starting jsPDF generation; do not await inside a loop |
| F4 — CHECK constraint name | Constraint name varies; hardcoding wrong name silently does nothing in `ALTER TABLE ... DROP CONSTRAINT` | Verify name via SQL before writing migration; use IF EXISTS guard |
| F2 — grouping payments | Without F4's historico events, payment grouping from raw `pagamentos_divida` is ambiguous | Implement F4 first; F2 reads historico |
| All — alias mapping | Parcelas loaded for PDF or payment logic must have calc-engine aliases (indexador, juros_am, multa_pct, honorarios_pct) applied | Call `normalizarDivida()` (established in prior pitfalls research) on all dívida rows before passing to the engine |

---

## MVP Recommendation

**Prioritize in this order:**
1. F4 (migration) + F1 (payment logic + form) — core value, Phase 7 target
2. F2 (payment history section) — low complexity, completes Phase 7
3. F3 (PDF) — highest complexity, Phase 8 target

**Defer to post-v1.4:**
- Per-payment breakdown showing allocation per parcela in F2's expanded rows
- Per-parcela encargo breakdown as extra columns in F3 PDF
- "Valor Atualizado" per-component breakdown (correção + juros + multa separately) in PDF

---

*Research date: 2026-04-22. Based on direct inspection of: DetalheContrato.jsx, PagamentosDivida.jsx, pagamentos.js, contratos.js, devedorCalc.js, PROJECT.md, and existing research files. Brazilian civil procedure CPC Art. 524 and CC Art. 354 applied from training knowledge (MEDIUM confidence — validate key field requirements against a sample judicial petition from the escritório before coding the PDF header).*
