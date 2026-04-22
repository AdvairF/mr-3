# Phase 7: Pagamentos por Contrato - Pattern Map

**Mapped:** 2026-04-22
**Files analyzed:** 5 (2 JS services, 1 JSX component, 2 SQL artifacts)
**Analogs found:** 5 / 5

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/services/contratos.js` (extend) | service | CRUD + RPC | `src/services/pagamentos.js` | exact |
| `src/components/DetalheContrato.jsx` (extend) | component | request-response + event-driven | `DetalheContrato.jsx` itself (lines 116–119, 157–169, 478–491) | self-reference (exact) |
| `pagamentos_contrato` table (SQL migration) | migration | CRUD | `pagamentos_divida` DDL (contratos.js header, lines 1–21 of pagamentos.js) | exact |
| `registrar_pagamento_contrato` SP (PL/pgSQL) | migration | batch + transform | Migration pattern in `pagamentos.js` header; no existing SP analog | partial |
| `reverter_pagamento_contrato` SP (PL/pgSQL) | migration | batch + transform | Same — no existing SP analog | partial |

---

## Pattern Assignments

---

### `src/services/contratos.js` — add `registrarPagamentoContrato`, `excluirPagamentoContrato`, `listarPagamentosContrato`

**Analog:** `src/services/pagamentos.js` (full file, 86 lines) and the existing body of `contratos.js`

**Imports pattern** (`contratos.js` lines 64–66):
```js
import { dbGet, dbInsert, dbUpdate } from "../config/supabase.js";

const TABLE = "contratos_dividas";
const HIST_TABLE = "contratos_historico";
```
Phase 7 adds a new table constant alongside these:
```js
const PAG_TABLE = "pagamentos_contrato";
```

**`dbGet` list pattern** (`pagamentos.js` lines 33–35):
```js
export async function listarPagamentos(dividaId) {
  return dbGet(TABLE, `divida_id=eq.${dividaId}&order=data_pagamento.asc`);
}
```
Copy for `listarPagamentosContrato`:
```js
export async function listarPagamentosContrato(contratoId) {
  return dbGet(PAG_TABLE, `contrato_id=eq.${encodeURIComponent(contratoId)}&order=data_pagamento.asc`);
}
```

**`dbDelete` pattern** (`pagamentos.js` lines 61–63):
```js
export async function excluirPagamento(pagamentoId) {
  return dbDelete(TABLE, pagamentoId);
}
```

**Supabase RPC pattern** — no existing `supabase.rpc` in codebase. The project uses raw `fetch` via `sb()` in `supabase.js`. RPC calls must go through `sb()` directly against the `/rest/v1/rpc/` endpoint:
```js
// Pattern: calling a stored procedure via PostgREST RPC
import { sb } from "../config/supabase.js";

export async function registrarPagamentoContrato(contratoId, { data_pagamento, valor, observacao }) {
  return sb("rpc/registrar_pagamento_contrato", "POST", {
    p_contrato_id:    contratoId,
    p_data_pagamento: data_pagamento,
    p_valor:          valor,
    p_observacao:     observacao ?? null,
  });
}

export async function excluirPagamentoContrato(pagamentoId) {
  return sb("rpc/reverter_pagamento_contrato", "POST", {
    p_pagamento_id: pagamentoId,
  });
}
```
Note: `sb()` already passes `Authorization` and `apikey` headers. The SP must return JSON — the planner should confirm the SP return type matches what the component needs (number of parcelas amortizadas for toast D-05).

**`registrarEvento` fire-and-forget pattern** (`contratos.js` lines 96–108):
```js
registrarEvento(contrato.id, "criacao", { ... }).catch(() => {}); // non-blocking — swallow silently
```
Phase 7 service functions do NOT call `registrarEvento` directly — HIS-05 is handled inside the stored procedure itself. The SP logs to `contratos_historico` atomically. No extra `.catch()` wrapper needed in JS.

---

### `src/components/DetalheContrato.jsx` — add Pagamentos section

**Analog:** `DetalheContrato.jsx` itself — the "Histórico" collapsible section and the "Adicionar Documento" toggle are the direct templates.

**State declaration pattern** (`DetalheContrato.jsx` lines 112–119):
```jsx
const [adicionandoDocumento, setAdicionandoDocumento] = useState(false);
const [editando,  setEditando]  = useState(false);
const [salvando,  setSalvando]  = useState(false);
// ...
const [historicoAberto,    setHistoricoAberto]    = useState(false);
const [historico,          setHistorico]           = useState([]);
const [historicoLoading,   setHistoricoLoading]    = useState(false);
const [historicoCarregado, setHistoricoCarregado]  = useState(false);
```
Phase 7 adds alongside these:
```jsx
const [registrandoPagamento,  setRegistrandoPagamento]  = useState(false);
const [salvandoPagamento,     setSalvandoPagamento]     = useState(false);
const [pagamentosContrato,    setPagamentosContrato]    = useState([]);
const [pagamentosAberto,      setPagamentosAberto]      = useState(false);
const [pagamentosLoading,     setPagamentosLoading]     = useState(false);
const [pagamentosCarregados,  setPagamentosCarregados]  = useState(false);
const [saldoCalculado,        setSaldoCalculado]        = useState(null);
const [formPagamento,         setFormPagamento]         = useState({ data_pagamento: "", valor: "", observacao: "" });
```

**`useEffect` lazy-load on section open** (`DetalheContrato.jsx` lines 157–169):
```jsx
useEffect(() => {
  if (!historicoAberto || historicoCarregado) return;
  setHistoricoLoading(true);
  listarHistorico(contrato.id)
    .then(rows => {
      setHistorico(Array.isArray(rows) ? rows : []);
      setHistoricoCarregado(true);
    })
    .catch(e => {
      toast.error("Erro ao carregar histórico: " + e.message);
    })
    .finally(() => setHistoricoLoading(false));
}, [historicoAberto, contrato.id]);
```
Copy for pagamentos (lazy-load when section expands):
```jsx
useEffect(() => {
  if (!pagamentosAberto || pagamentosCarregados) return;
  setPagamentosLoading(true);
  listarPagamentosContrato(contrato.id)
    .then(rows => {
      setPagamentosContrato(Array.isArray(rows) ? rows : []);
      setPagamentosCarregados(true);
    })
    .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
    .finally(() => setPagamentosLoading(false));
}, [pagamentosAberto, contrato.id]);
```

**Collapsible section toggle header** (`DetalheContrato.jsx` lines 494–514):
```jsx
<div
  onClick={() => setHistoricoAberto(h => !h)}
  style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    cursor: "pointer",
    padding: "8px 0",
    marginTop: 24,
  }}
>
  <p style={{
    fontFamily: "'Space Grotesk',sans-serif",
    fontWeight: 700,
    fontSize: 13,
    color: "#0f172a",
    margin: 0,
  }}>
    Histórico {historicoAberto ? "▲" : "▼"}
  </p>
</div>
```
Phase 7 copies this verbatim for "Pagamentos Recebidos" and adds a second clickable to toggle the inline form. New section header becomes:
```jsx
<div
  onClick={() => setPagamentosAberto(p => !p)}
  style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
           cursor: "pointer", padding: "8px 0", marginTop: 24 }}
>
  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13,
               color: "#0f172a", margin: 0 }}>
    Pagamentos Recebidos {pagamentosAberto ? "▲" : "▼"}
  </p>
</div>
```

**Collapsible section body with empty state** (`DetalheContrato.jsx` lines 516–631):
```jsx
{historicoAberto && (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px",
                border: "1px solid #e2e8f0", marginTop: 8 }}>
    {historicoLoading && (
      <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
        Carregando histórico...
      </p>
    )}
    {!historicoLoading && historico.length === 0 && (
      <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
        <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Sem histórico disponível</p>
        ...
      </div>
    )}
    {!historicoLoading && historico.length > 0 && ( /* ... list ... */ )}
  </div>
)}
```
Phase 7 copies the three-branch pattern (loading / empty / list) for pagamentos.

**Inline form toggle (button → form)** (`DetalheContrato.jsx` lines 478–491):
```jsx
{!adicionandoDocumento && (
  <div style={{ marginTop: 8 }}>
    <Btn color="#0d9488" sm onClick={() => setAdicionandoDocumento(true)}>+ Adicionar Documento</Btn>
  </div>
)}

{adicionandoDocumento && (
  <AdicionarDocumento
    contrato={contrato}
    onDocumentoAdicionado={handleDocumentoAdicionado}
    onCancelar={() => setAdicionandoDocumento(false)}
  />
)}
```
Phase 7 copies this two-branch boolean pattern for `registrandoPagamento`. The form renders inline (no separate component file needed — it is simpler than `AdicionarDocumento`):
```jsx
{!registrandoPagamento && (
  <div style={{ marginTop: 8 }}>
    <Btn color="#4f46e5" sm onClick={handleAbrirFormPagamento}>+ Registrar Pagamento</Btn>
  </div>
)}

{registrandoPagamento && (
  <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px",
                border: "1px solid #c7d2fe", marginTop: 8 }}>
    {/* form fields inline */}
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
      <Btn outline color="#64748b" sm onClick={() => setRegistrandoPagamento(false)} disabled={salvandoPagamento}>
        Cancelar
      </Btn>
      <Btn color="#4f46e5" sm disabled={salvandoPagamento} onClick={handleSalvarPagamento}>
        {salvandoPagamento ? <Spinner /> : "Salvar"}
      </Btn>
    </div>
  </div>
)}
```

**Spinner in button during async operation** (`DetalheContrato.jsx` lines 344–348):
```jsx
<Btn color="#4f46e5" sm disabled={salvando} onClick={handleSalvar}>
  {salvando ? <Spinner /> : "Salvar"}
</Btn>
```
`Spinner` is defined locally at lines 14–29. Reuse it directly — no import needed inside same file.

**`window.confirm` + destructive action pattern** (`DetalheContrato.jsx` lines 199–212):
```jsx
const msg = `Alterar ${campos} vai atualizar ${N} parcelas (incluindo quitadas). Confirmar?`;
if (!window.confirm(msg)) return;
```
Phase 7 copies this guard in `handleExcluirPagamento`:
```jsx
async function handleExcluirPagamento(pagamentoId) {
  if (!window.confirm("Excluir este pagamento vai reverter a amortização das parcelas. Confirmar?")) return;
  try {
    await excluirPagamentoContrato(pagamentoId);
    toast.success("Pagamento excluído. Amortização revertida.");
    // reload pagamentos list
    const rows = await listarPagamentosContrato(contrato.id);
    setPagamentosContrato(Array.isArray(rows) ? rows : []);
    await onCarregarTudo();
  } catch (e) {
    toast.error("Erro ao excluir pagamento: " + e.message);
  }
}
```

**`toast.success` / `toast.error` pattern** (`DetalheContrato.jsx` lines 259–268):
```jsx
toast.success(temCascade ? "Contrato e parcelas atualizados." : "Contrato atualizado.");
// ...
toast.error(
  temCascade
    ? "Erro ao propagar alteração: " + e.message
    : "Erro ao salvar contrato: " + e.message
);
```
Phase 7 toasts:
- Success after register: `toast.success(\`Pagamento registrado. ${n} parcela(s) amortizada(s).\`)`
- Error on saldo exceeded: `toast.error(\`Valor superior ao saldo devedor (${fmtBRL(saldoCalculado)}).\`)`
- Success after delete: `toast.success("Pagamento excluído. Amortização revertida.")`

**`fmtBRL` + `fmtData` helpers** (`DetalheContrato.jsx` lines 11–12):
```js
function fmtBRL(v) { if (v == null || v === "") return "—"; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtData(iso) { if (!iso) return "—"; const d = iso.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; }
```
These are available locally — use directly everywhere in the new Pagamentos section without re-defining.

**`calcularSaldoPorDividaIndividual` usage for D-04** (`DetalheContrato.jsx` lines 134–147):
```jsx
Promise.all(
  parcelasDoDoc.map(async p => {
    const pgtos = await listarPagamentos(p.id);
    const saldo = calcularSaldoPorDividaIndividual(p, pgtos, hoje);
    return [String(p.id), saldo];
  })
)
```
Phase 7 saldo calculation is called when the user clicks "Registrar Pagamento" (i.e., inside `handleAbrirFormPagamento`). Sum across all non-quitadas parcelas of the contrato:
```jsx
async function handleAbrirFormPagamento() {
  setRegistrandoPagamento(true);
  // parcelas abertas = dividas do contrato com saldo_quitado === false
  const parcelasAbertas = (dividas || []).filter(d => !d.saldo_quitado);
  let total = 0;
  for (const p of parcelasAbertas) {
    const pgtos = await listarPagamentos(p.id);
    total += calcularSaldoPorDividaIndividual(p, pgtos, hoje);
  }
  setSaldoCalculado(total);
}
```
`listarPagamentos` and `calcularSaldoPorDividaIndividual` are already imported in `DetalheContrato.jsx` (line 9).

**Import line to add** (`DetalheContrato.jsx` line 8 — extend existing import):
```jsx
// Before (line 8):
import { listarDocumentosPorContrato, editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico } from "../services/contratos.js";

// After:
import { listarDocumentosPorContrato, editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico,
         registrarPagamentoContrato, excluirPagamentoContrato, listarPagamentosContrato } from "../services/contratos.js";
```

---

### `pagamentos_contrato` table (SQL migration)

**Analog:** `pagamentos_divida` DDL (`pagamentos.js` lines 7–20) + RLS pattern from memory

```sql
-- Analog (pagamentos_divida):
CREATE TABLE public.pagamentos_divida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divida_id UUID NOT NULL REFERENCES public.dividas(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pagamentos_divida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.pagamentos_divida
  FOR ALL USING (auth.role() = 'authenticated');  -- NOTE: DO NOT use this form
```

Phase 7 table follows the same structure, with FK to `contratos_dividas` and **RLS must use `USING(true) WITH CHECK(true)`**:
```sql
CREATE TABLE IF NOT EXISTS public.pagamentos_contrato (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id    UUID         NOT NULL REFERENCES public.contratos_dividas(id) ON DELETE CASCADE,
  data_pagamento DATE         NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  observacao     TEXT,
  parcelas_ids   UUID[]       NOT NULL DEFAULT '{}',  -- IDs das parcelas amortizadas (retornado pela SP)
  created_at     TIMESTAMPTZ  DEFAULT NOW()
);
ALTER TABLE public.pagamentos_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.pagamentos_contrato
  FOR ALL USING (true) WITH CHECK (true);             -- CORRECT pattern for this project
```

The `parcelas_ids` column stores which `dividas.id` were amortized, enabling the "Parc. 1/12, 2/12" display in D-03.

---

### Stored procedures `registrar_pagamento_contrato` and `reverter_pagamento_contrato` (PL/pgSQL)

**Analog:** No existing PL/pgSQL stored procedures in codebase. Use RESEARCH.md for SP skeletons. However, the `registrarEvento` call pattern in `contratos.js` lines 84–90 defines the schema for the `contratos_historico` INSERT the SP must perform:

```js
// What the SP must replicate in PL/pgSQL for HIS-05:
export async function registrarEvento(contratoId, tipoEvento, snapshotCampos) {
  return dbInsert(HIST_TABLE, {
    contrato_id:     contratoId,
    tipo_evento:     tipoEvento,      // 'pagamento_recebido' | 'pagamento_revertido'
    snapshot_campos: snapshotCampos,  // JSONB: { pagamento_id, valor, data_pagamento, parcelas_amortizadas: [] }
  });
}
```

The SP must INSERT into `contratos_historico` with `tipo_evento = 'pagamento_recebido'` (Migration 3 adds this value to the CHECK constraint). Migration 3 SQL is already defined in ROADMAP.md lines 182–193 and must run before the SP is created.

**SP return contract for D-05 toast:**
The SP `registrar_pagamento_contrato` must return a JSON object with at least:
```json
{ "parcelas_amortizadas": 3, "parcelas_ids": ["uuid1", "uuid2", "uuid3"] }
```
This allows the component to produce: `"Pagamento registrado. 3 parcela(s) amortizada(s)."`

---

## Shared Patterns

### RLS Policy — CRITICAL
**Source:** `.claude/projects/.../memory/feedback_supabase_rls_pattern.md`
**Apply to:** ALL new `CREATE TABLE` + `CREATE POLICY` statements

```sql
-- CORRECT (use this):
CREATE POLICY "Acesso autenticado" ON public.<table>
  FOR ALL USING (true) WITH CHECK (true);

-- WRONG (never use):
CREATE POLICY "Acesso autenticado" ON public.<table>
  FOR ALL USING (auth.role() = 'authenticated');
```

### Inline style with hex values (no Tailwind/CSS modules)
**Source:** Throughout `DetalheContrato.jsx`
**Apply to:** All new JSX in the Pagamentos section

```jsx
// Always style={{ }} with hex values. Never className="..." Tailwind utilities.
style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0" }}
```

### Error handling in async handlers
**Source:** `DetalheContrato.jsx` lines 261–270

```jsx
setSalvando(true);
try {
  // ... async work ...
  toast.success("...");
} catch (e) {
  toast.error("... " + e.message);
} finally {
  setSalvando(false);
}
```
**Apply to:** `handleSalvarPagamento` and `handleExcluirPagamento`

### `sb()` function for PostgREST RPC calls
**Source:** `src/config/supabase.js` lines 16–37

```js
export async function sb(path, method = "GET", body = null, extra = "") {
  const authHeader = _accessToken ? `Bearer ${_accessToken}` : `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authHeader,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  // ...
}
```
**Apply to:** `registrarPagamentoContrato` and `excluirPagamentoContrato` in `contratos.js`. Call as `sb("rpc/<sp_name>", "POST", params)`.

### `contrato.id` reset effect
**Source:** `DetalheContrato.jsx` lines 149–155

```jsx
useEffect(() => {
  setEditForm(initEditForm(contrato));
  setEditando(false);
  setHistoricoAberto(false);
  setHistorico([]);
  setHistoricoCarregado(false);
}, [contrato.id]);
```
**Apply to:** Phase 7 adds to this same effect: reset `registrandoPagamento`, `pagamentosAberto`, `pagamentosContrato`, `pagamentosCarregados` when `contrato.id` changes.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `registrar_pagamento_contrato` SP | migration | batch+transform | No PL/pgSQL stored procedures exist in codebase. Use RESEARCH.md Art. 354 CC amortization logic + Supabase PostgREST RPC documentation. |
| `reverter_pagamento_contrato` SP | migration | batch+transform | Same as above. |

---

## Metadata

**Analog search scope:** `src/mr-3/mr-cobrancas/src/` (services, components, config)
**Files scanned:** 4 source files + 2 memory/planning files
**Pattern extraction date:** 2026-04-22
