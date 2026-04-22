# Architecture Patterns — Milestone v1.4

**Domain:** Contract-level payment amortization + PDF generation for Mr. Cobranças SPA
**Researched:** 2026-04-22
**Confidence:** HIGH — based on direct source reading of all relevant files

---

## 1. Data Flow

### F1 — Contract Payment Amortization

```
User fills form in DetalheContrato
  (data_pagamento, valor, observacao)
         |
         v
registrarPagamentoContrato(contratoId, { data_pagamento, valor, observacao })
  [new function in pagamentos_contrato.js]
         |
         v
1. dbGet("dividas", "contrato_id=eq.X&saldo_quitado=eq.false&order=data_vencimento.asc")
   → sorted open parcelas for this contract
         |
         v
2. Amortization loop (client-side, Art. 354 CC):
   remaining = valor
   affected = []
   for parcela of openParcelas:
     if remaining <= 0 break
     pgtos_existentes = await listarPagamentos(parcela.id)
     saldoAtual = calcularSaldoPorDividaIndividual(parcela, pgtos_existentes, data_pagamento)
     if saldoAtual <= 0 continue  // already settled by prior payments
     aplicado = Math.min(remaining, saldoAtual)
     await criarPagamento({ divida_id: parcela.id, data_pagamento, valor: aplicado, observacao })
     await atualizarSaldoQuitado(parcela.id, saldoAtual - aplicado <= 0, parcela.status)
     affected.push({ parcela_id: parcela.id, valor_aplicado: aplicado, parcela_obs: parcela.observacoes })
     remaining -= aplicado
         |
         v
3. registrarEvento(contratoId, "pagamento_recebido", {
     data_pagamento,
     valor_total: valor,
     parcelas_afetadas: affected,   // JSON array snapshot
     observacao
   })
         |
         v
4. return { affected, remaining }
   → caller shows toast: "Pagamento registrado. X parcelas amortizadas."
   → caller calls onCarregarTudo() to refresh dividas prop
```

### F2 — "Pagamentos Recebidos" Section

```
DetalheContrato — "Pagamentos Recebidos" section toggled open
         |
         v
listarHistorico(contratoId)
  [existing function — no new query needed]
  filter client-side: eventos where tipo_evento === "pagamento_recebido"
         |
         v
Display collapsible section, render from snapshot_campos:
  data_pagamento, valor_total, parcelas_afetadas[], observacao
```

No new DB query required. Piggybacks on the existing `listarHistorico` call that is already lazy-loaded behind the `historicoCarregado` guard. Filter in component.

### F3 — PDF Generation

```
User clicks "Gerar PDF" in DetalheContrato
         |
         v
handleGerarPDF() — fetches all parcela payments in parallel
  Promise.all(parcelas.map(p => listarPagamentos(p.id)))
  → builds pagamentosMap: { [dividaId]: pagamentos_divida[] }
         |
         v
gerarDemonstrativoPDF(contrato, parcelas, pagamentosMap, pagamentosContrato, devedor, credor, hoje)
  [new utility: src/utils/pdfDemonstrativo.js]
         |
         v
Data assembly (sync after fetch):
  1. contrato header (from prop)
  2. devedor/credor names (from devedores/credores props)
  3. parcelas sorted by data_vencimento ASC (from dividas prop, filtered by contrato_id)
  4. for each parcela:
       saldo_atualizado = calcularSaldoPorDividaIndividual(parcela, [], hoje)
         // no payments = full updated value (encargos only)
       total_pago = pagamentosMap[parcela.id].reduce(sum)
       saldo_atual = calcularSaldoPorDividaIndividual(parcela, pagamentosMap[parcela.id], hoje)
  5. pagamentos_recebidos = historico events where tipo_evento === "pagamento_recebido"
  6. totais: soma valor_original, soma valor_atualizado, soma pago, saldo_devedor
         |
         v
jsPDF.autoTable() → doc.save("demonstrativo-<referencia>-<hoje>.pdf")
```

**Critical note on pagamentos pre-fetching:** The component's existing `expandedDoc` useEffect calls `listarPagamentos(p.id)` only for parcelas of the expanded document. For PDF generation, ALL contract parcelas need their payments. This means `handleGerarPDF` must fire a fresh parallel batch of `listarPagamentos` calls. This is the only network-heavy step in PDF generation. For a 24-parcela contract: 24 parallel fetches, each ~50 ms = ~50-100 ms total with concurrency.

---

## 2. Service Layer Design

### Where contract payment logic lives

**Decision: New file `src/services/pagamentos_contrato.js`**

Rationale:
- `pagamentos.js` is scoped to `pagamentos_divida` CRUD for a single `divida_id`. Adding contract-level multi-parcela awareness would cross its responsibility boundary.
- `contratos.js` already covers 5 concerns (contract CRUD, document management, parcela generation, history, cascade). Adding payment logic grows it further without cohesion.
- A new file named `pagamentos_contrato.js` mirrors the `pagamentos.js` naming convention and is immediately recognizable as the contract-payment layer.

**What goes in `pagamentos_contrato.js`:**

```js
// src/services/pagamentos_contrato.js
import { dbGet } from "../config/supabase.js";
import { criarPagamento, listarPagamentos, calcularSaldoPorDividaIndividual } from "./pagamentos.js";
import { atualizarSaldoQuitado } from "./dividas.js";
import { registrarEvento } from "./contratos.js";

/**
 * Registra um pagamento no nivel do Contrato.
 * Amortiza parcelas em aberto pela mais antiga (Art. 354 CC).
 * Writes: pagamentos_divida rows + saldo_quitado updates + contratos_historico event.
 *
 * @param {string} contratoId
 * @param {{ data_pagamento: string, valor: number, observacao?: string }} pagamento
 * @param {string} hoje — "YYYY-MM-DD" — used for saldo calculation
 * @returns {Promise<{ affected: Array, remaining: number }>}
 */
export async function registrarPagamentoContrato(contratoId, pagamento, hoje) {
  const { data_pagamento, valor, observacao } = pagamento;

  // 1. Fetch all open parcelas for this contract, oldest first
  const rawParcelas = await dbGet(
    "dividas",
    `contrato_id=eq.${contratoId}&saldo_quitado=eq.false&order=data_vencimento.asc`
  );
  const openParcelas = Array.isArray(rawParcelas) ? rawParcelas : [];

  // 2. Art. 354 CC amortization loop
  let remaining = parseFloat(valor) || 0;
  const affected = [];

  for (const parcela of openParcelas) {
    if (remaining <= 0) break;
    const pgtos = await listarPagamentos(parcela.id);
    const pgtoArr = Array.isArray(pgtos) ? pgtos : [];
    const saldoAtual = calcularSaldoPorDividaIndividual(parcela, pgtoArr, data_pagamento);
    if (saldoAtual <= 0) continue; // already settled
    const aplicado = Math.min(remaining, saldoAtual);
    await criarPagamento({ divida_id: parcela.id, data_pagamento, valor: aplicado, observacao });
    await atualizarSaldoQuitado(parcela.id, saldoAtual - aplicado <= 0, parcela.status);
    affected.push({ parcela_id: parcela.id, valor_aplicado: aplicado, parcela_obs: parcela.observacoes });
    remaining -= aplicado;
  }

  // 3. Register history event (fire-and-forget on failure)
  await registrarEvento(contratoId, "pagamento_recebido", {
    data_pagamento,
    valor_total: valor,
    observacao: observacao || null,
    parcelas_afetadas: affected,
  }).catch(() => {});

  return { affected, remaining };
}
```

**Imports graph for v1.4:**

```
DetalheContrato.jsx
  ├── contratos.js                    (existing)
  ├── pagamentos.js                   (existing)
  ├── pagamentos_contrato.js          (NEW)
  └── src/utils/pdfDemonstrativo.js   (NEW)
```

---

## 3. DB Changes

### F4 — Add 'pagamento_recebido' to CHECK constraint

**Problem:** `contratos_historico.tipo_evento` has a CHECK constraint with a fixed set:
```sql
CHECK (tipo_evento IN (
  'criacao', 'alteracao_encargos', 'cessao_credito',
  'assuncao_divida', 'alteracao_referencia', 'outros'
))
```
Inserting `'pagamento_recebido'` fails with a constraint violation at runtime before any code is deployed.

**Migration — run in Supabase SQL Editor before Phase 7 code is merged:**

Step 1: Confirm the constraint name (PostgreSQL auto-names it):
```sql
SELECT conname
FROM pg_constraint
WHERE conrelid = 'public.contratos_historico'::regclass AND contype = 'c';
```
Expected result: `contratos_historico_tipo_evento_check`

Step 2: Drop and recreate:
```sql
ALTER TABLE public.contratos_historico
  DROP CONSTRAINT IF EXISTS contratos_historico_tipo_evento_check;

ALTER TABLE public.contratos_historico
  ADD CONSTRAINT contratos_historico_tipo_evento_check
  CHECK (tipo_evento IN (
    'criacao',
    'alteracao_encargos',
    'cessao_credito',
    'assuncao_divida',
    'alteracao_referencia',
    'outros',
    'pagamento_recebido'
  ));
```

**Risk:** LOW. Constraint validation applies only on INSERT/UPDATE. No data migration. No RLS changes needed (existing policy `USING(true) WITH CHECK(true)` covers the new event type).

### snapshot_campos schema for 'pagamento_recebido'

No new columns on `contratos_historico`. The existing `snapshot_campos JSONB` column carries:

```json
{
  "data_pagamento": "2026-04-22",
  "valor_total": 1500.00,
  "observacao": "Recebido via PIX",
  "parcelas_afetadas": [
    { "parcela_id": "uuid-1", "valor_aplicado": 800.00, "parcela_obs": "NF001 — Parcela 1/3" },
    { "parcela_id": "uuid-2", "valor_aplicado": 700.00, "parcela_obs": "NF001 — Parcela 2/3" }
  ]
}
```

### No new tables required

`pagamentos_divida` handles all payment rows. Contract-level grouping is achieved via the `contratos_historico` event snapshot. No `contrato_payment_id` grouping column is needed.

**Reason to avoid a grouping column:** The F2 display requirement (list of contract payments with their affected parcelas) is fully satisfied by reading `contratos_historico` events with `tipo_evento = 'pagamento_recebido'` — the snapshot already contains everything needed. Adding a foreign key on `pagamentos_divida` would create complexity (circular dependency, partial-amortization queries) with no functional gain for the stated requirements.

---

## 4. Component Integration

### DetalheContrato.jsx — Changes Required

**New state variables:**

```js
// F1: Payment form
const [pagamentoAberto, setPagamentoAberto] = useState(false);
const [pagamentoForm, setPagamentoForm] = useState({ data_pagamento: "", valor: "", observacao: "" });
const [salvandoPagamento, setSalvandoPagamento] = useState(false);

// F2: uses existing historico[] state — no new state
// Filter inline: historico.filter(e => e.tipo_evento === "pagamento_recebido")

// F3: PDF loading
const [gerandoPDF, setGerandoPDF] = useState(false);
```

**New imports:**

```js
import { registrarPagamentoContrato } from "../services/pagamentos_contrato.js";
import { gerarDemonstrativoPDF } from "../utils/pdfDemonstrativo.js";
```

**New handler: handleRegistrarPagamento**

```js
async function handleRegistrarPagamento() {
  const valor = parseFloat(pagamentoForm.valor);
  if (!pagamentoForm.data_pagamento || !valor || valor <= 0) {
    toast.error("Informe data e valor do pagamento.");
    return;
  }
  setSalvandoPagamento(true);
  try {
    const { affected } = await registrarPagamentoContrato(
      contrato.id,
      { ...pagamentoForm, valor },
      hoje
    );
    toast.success(`Pagamento registrado. ${affected.length} parcela(s) amortizada(s).`);
    setPagamentoAberto(false);
    setPagamentoForm({ data_pagamento: "", valor: "", observacao: "" });
    setHistoricoCarregado(false); // forces re-fetch so F2 section shows new event
    await onCarregarTudo();       // refreshes dividas prop (saldo_quitado badges update)
  } catch (e) {
    toast.error("Erro ao registrar pagamento: " + e.message);
  } finally {
    setSalvandoPagamento(false);
  }
}
```

**New handler: handleGerarPDF**

```js
async function handleGerarPDF() {
  setGerandoPDF(true);
  try {
    const todasParcelas = (dividas || []).filter(d => String(d.contrato_id) === String(contrato.id));
    const entries = await Promise.all(
      todasParcelas.map(async p => {
        const pgtos = await listarPagamentos(p.id);
        return [p.id, Array.isArray(pgtos) ? pgtos : []];
      })
    );
    const pagamentosMap = Object.fromEntries(entries);
    // Ensure historico is loaded for pagamentos recebidos section
    let hist = historico;
    if (!historicoCarregado) {
      const rows = await listarHistorico(contrato.id);
      hist = Array.isArray(rows) ? rows : [];
    }
    await gerarDemonstrativoPDF({
      contrato,
      documentos,
      parcelas: todasParcelas.sort((a, b) =>
        (a.data_vencimento || "").localeCompare(b.data_vencimento || "")
      ),
      pagamentosMap,
      pagamentosContrato: hist.filter(e => e.tipo_evento === "pagamento_recebido"),
      devedor: devedores.find(d => String(d.id) === String(contrato.devedor_id)) || null,
      credor:  credores?.find(c => String(c.id) === String(contrato.credor_id)) || null,
      hoje,
    });
  } catch (e) {
    toast.error("Erro ao gerar PDF: " + e.message);
  } finally {
    setGerandoPDF(false);
  }
}
```

**Section placement in DetalheContrato render:**

```
Section 1: Back button
Section 2: Header card (read mode) — ADD: "Registrar Pagamento" button + "Gerar PDF" button
Section 3: Header card (edit mode)
Section 4: Documentos + parcelas table (existing)
Section 5: Adicionar Documento (existing)
Section 6: [NEW] Registrar Pagamento form (collapsible, shown when pagamentoAberto)
Section 7: [NEW] Pagamentos Recebidos (collapsible — filters historico)
Section 8: Histórico (existing)
```

**TIPO_EVENTO_LABELS fix (in DetalheContrato.jsx):**

The existing map lacks `pagamento_recebido`. Without this fix, contract payment events render as "Edição salva" in the Histórico timeline.

```js
const TIPO_EVENTO_LABELS = {
  criacao:               "Contrato criado",
  cessao_credito:        "Cessão de crédito",
  assuncao_divida:       "Assunção de dívida",
  alteracao_encargos:    "Alteração de encargos",
  alteracao_referencia:  "Alteração de referência",
  pagamento_recebido:    "Pagamento recebido",   // ADD THIS
  outros:                "Edição salva",
};
```

### PagamentosDivida.jsx — No changes needed

Contract-level payments write rows to `pagamentos_divida` with the individual `divida_id`. When the user opens `DetalheDivida` for any parcela, existing `listarPagamentos(divida.id)` returns those rows transparently. No component changes required.

---

## 5. PDF Architecture

### Library choice: jsPDF + jspdf-autotable

**No PDF library is currently installed.** `docxtemplater` handles .docx; it cannot output PDF. The project has no `jsPDF`, `pdf-lib`, or `@react-pdf/renderer`.

**Recommended: `jsPDF` + `jspdf-autotable`**

Rationale:
- Entirely client-side — no server required, matches SPA constraint
- `autoTable` generates the exact layout needed (tabular parcelas + totals) without HTML/CSS battles
- No canvas manipulation, no DOM injection — pure JS
- ~250 KB gzipped; acceptable for a law-firm SPA where PDF is not a hot path
- Actively maintained (v2.5+ / 3.x), browser-native `doc.save()` download
- No Vite configuration changes needed beyond install

**Install (before Phase 8 starts):**
```bash
npm install jspdf jspdf-autotable
```

### File: `src/utils/pdfDemonstrativo.js`

Separate utility, not inline in DetalheContrato. The PDF function is pure data-in / file-out, testable independently, and replaceable without touching the component.

**Function signature:**

```js
/**
 * Gera e faz download do PDF demonstrativo de debito de um contrato.
 *
 * @param {object} opts
 * @param {object}    opts.contrato             — contratos_dividas row
 * @param {object[]}  opts.documentos           — documentos_contrato rows
 * @param {object[]}  opts.parcelas             — dividas rows, sorted by data_vencimento ASC
 * @param {object}    opts.pagamentosMap        — { [dividaId]: pagamentos_divida[] }
 * @param {object[]}  opts.pagamentosContrato   — historico eventos tipo=pagamento_recebido
 * @param {object|null} opts.devedor
 * @param {object|null} opts.credor
 * @param {string}    opts.hoje                 — "YYYY-MM-DD"
 * @returns {void}  — triggers browser download via jsPDF.save()
 */
export async function gerarDemonstrativoPDF(opts) { ... }
```

**Internal data assembly:**

```
1. Header section:
   - Escritorio name/address/OAB (hardcoded constants at top of file)
   - "DEMONSTRATIVO DE DÉBITO" title
   - Contrato: referencia | Credor: credor.nome | Devedor: devedor.nome | Data: hoje

2. Parcelas table (jsPDF autoTable):
   Columns: # | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo
   For each parcela:
     valor_original   = parcela.valor_total
     pgtos            = pagamentosMap[parcela.id] || []
     valor_atualizado = calcularSaldoPorDividaIndividual(parcela, [], hoje)
     total_pago       = pgtos.reduce((s, p) => s + parseFloat(p.valor), 0)
     saldo            = Math.max(0, calcularSaldoPorDividaIndividual(parcela, pgtos, hoje))
   Totals row: sums of each column

3. Pagamentos Recebidos table (if pagamentosContrato.length > 0):
   Columns: Data | Valor Pago | Parcelas Amortizadas | Observacao
   Renders snapshot_campos.parcelas_afetadas as comma-separated obs strings

4. Rodape juridico (hardcoded, configurable constants):
   Legal notice text ("Este demonstrativo tem validade de X dias...")

5. doc.save(`demonstrativo-${slug(contrato.referencia)}-${hoje}.pdf`)
```

**Import of calcularSaldoPorDividaIndividual in the utility:**

```js
import { calcularSaldoPorDividaIndividual } from "../services/pagamentos.js";
```

This is the only cross-boundary import the utility needs. It is already exported from pagamentos.js.

---

## 6. Build Order (Phase Dependencies)

### Phase 7: F1 + F2 + F4 (must be complete and validated before Phase 8)

| Step | Task | Depends on |
|------|------|-----------|
| 7-1 | DB migration: ALTER CONSTRAINT (add 'pagamento_recebido') | nothing |
| 7-2 | Create `pagamentos_contrato.js` with `registrarPagamentoContrato` | 7-1 |
| 7-3 | Add payment form to DetalheContrato (F1) + TIPO_EVENTO_LABELS fix | 7-2 |
| 7-4 | Add "Pagamentos Recebidos" collapsible section (F2) | 7-3 (needs real data) |

### Phase 8: F3 (after Phase 7 UAT)

| Step | Task | Depends on |
|------|------|-----------|
| 8-1 | Install jsPDF + jspdf-autotable | nothing |
| 8-2 | Create `pdfDemonstrativo.js` utility | 8-1 |
| 8-3 | Add "Gerar PDF" button + handleGerarPDF to DetalheContrato | 8-2 |

---

## 7. New vs Modified Files

| File | Status | Change |
|------|--------|--------|
| `src/services/pagamentos_contrato.js` | **NEW** | registrarPagamentoContrato — amortization loop |
| `src/utils/pdfDemonstrativo.js` | **NEW** | gerarDemonstrativoPDF — jsPDF table utility |
| `src/components/DetalheContrato.jsx` | **MODIFIED** | Add: payment form (F1), Pagamentos Recebidos section (F2), PDF button (F3), TIPO_EVENTO_LABELS fix |
| `src/services/contratos.js` | **NOT modified** | registrarEvento called from pagamentos_contrato.js — no changes needed |
| `src/services/pagamentos.js` | **NOT modified** | criarPagamento + calcularSaldoPorDividaIndividual reused as-is |
| `src/services/dividas.js` | **NOT modified** | atualizarSaldoQuitado reused as-is |
| `src/utils/devedorCalc.js` | **NOT modified** | calcularSaldoPorDividaIndividual delegates here — no changes |
| DB: `contratos_historico` | **MIGRATION** | ALTER CONSTRAINT to add 'pagamento_recebido' to CHECK |

---

## 8. Key Risks

### Risk 1: Sequential DB writes — partial failure

The amortization loop writes `criarPagamento` + `atualizarSaldoQuitado` per parcela sequentially. A network failure mid-loop leaves partial payments in the DB without rollback (client-side SPA cannot use DB transactions). Mitigation: the caller's `try/catch` in `handleRegistrarPagamento` shows a specific error message. The user can inspect which parcelas were paid (visible in DetalheDivida) and manually correct if needed. A full transactional rollback would require a Supabase Edge Function, which violates the no-server-side-code constraint.

### Risk 2: CHECK constraint name

The DROP CONSTRAINT SQL requires the exact PostgreSQL constraint name. The auto-generated name is almost certainly `contratos_historico_tipo_evento_check` but must be confirmed via `pg_constraint` query before running the migration. If wrong, the DROP fails silently (IF EXISTS) and the subsequent ADD will duplicate — verify first.

### Risk 3: TIPO_EVENTO_LABELS omission

If `pagamento_recebido` is not added to the `TIPO_EVENTO_LABELS` map in `DetalheContrato.jsx`, contract payment events display as "Edição salva" in the Histórico timeline. This is confusing but not a data integrity issue. Fix is a 1-line addition — do not forget it in Step 7-3.

### Risk 4: jsPDF bundle size

jsPDF adds ~250 KB to the bundle. The project currently has no code-splitting configured in Vite. For low-frequency use (PDF generation), this can be mitigated with dynamic import:

```js
const { jsPDF } = await import("jspdf");
await import("jspdf-autotable"); // auto-attaches to jsPDF prototype
```

This defers the 250 KB to first PDF click. If Vite's build is already fast and bundle size is not monitored, static import is also acceptable.

### Risk 5: allPagamentos prop in DetalheContrato is currently unused

`DetalheContrato` receives `allPagamentos` as a prop (line 101 of the component) but the current render does not use it. This prop appears to be a leftover from an earlier design. For the PDF `pagamentosMap`, do NOT rely on this prop — it is unclear what data it contains and it is not maintained by the component. Always fetch fresh via `listarPagamentos(p.id)` inside `handleGerarPDF`.

---

## Sources

- Direct read: `src/services/contratos.js` — 243 lines, migration comments, registrarEvento, listarHistorico, CHECK constraint definition
- Direct read: `src/services/pagamentos.js` — 86 lines, criarPagamento, calcularSaldoPorDividaIndividual
- Direct read: `src/services/dividas.js` — 81 lines, atualizarSaldoQuitado
- Direct read: `src/config/supabase.js` — dbGet/dbInsert/dbUpdate/dbDelete helpers
- Direct read: `src/utils/devedorCalc.js` — Art. 354 loop, calcularSaldosPorDivida, calcularSaldoPorDividaIndividual wrapper
- Direct read: `src/components/DetalheContrato.jsx` — 635 lines, state shape, historico lazy-load pattern, TIPO_EVENTO_LABELS map
- Direct read: `src/components/PagamentosDivida.jsx` — existing single-divida payment component
- Direct read: `package.json` — confirms jsPDF absent, only docxtemplater for .docx
- Direct read: `.planning/PROJECT.md` — milestone v1.4 scope
