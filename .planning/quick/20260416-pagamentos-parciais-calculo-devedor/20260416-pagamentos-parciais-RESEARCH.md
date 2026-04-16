# Research: pagamentos-parciais-calculo-devedor

**Date:** 2026-04-16
**Files investigated:** App.jsx (7226 lines), utils/correcao.js, utils/constants.js, config/supabase.js, migration_processos.sql

---

## 1. Devedor Form — Component, Location, and Insert Point

### Component name
`function Devedores(...)` — lines **1906–3302** of App.jsx. This is a single monolithic React function (not a separate file) that handles the full devedor CRUD + ficha modal.

### Sub-modal: Ficha individual (where to insert the new tab)
The ficha individual is rendered starting at **line 2413** (`if (modal === "ficha" && sel)`).

The tab bar is defined at **lines 2458–2467**:
```jsx
{[["dados","📋 Dados"],["contatos","📞 Contatos"],["dividas","💳 Dívidas"],
  ["acordos","🤝 Acordos"],["processos","⚖️ Processos"],["relatorio","📊 Relatório"]]
  .map(([id, label]) => (
    <button key={id} onClick={() => setAbaFicha(id)} ...>
```

**Insert point for the new tab entry:** Add `["pagamentos","💰 Pagamentos"]` to that array at line 2460 (after `"dividas"`, before `"acordos"` makes logical sense).

**Insert point for the new tab panel:** After line 2827 (end of the `abaFicha === "dividas"` block) and before line 2828 (`abaFicha === "acordos"`). Insert:
```jsx
{abaFicha === "pagamentos" && (
  <AbaPagamentosParciais devedor={sel} onAtualizarDevedor={onAtualizarDevedor} user={user} />
)}
```

### Save functions
| Function | Line | Purpose |
|---|---|---|
| `salvarDevedor()` | 2002 | INSERT novo devedor — uses `dbInsert("devedores", payload)` |
| `salvarEdicao()` | 2127 | PATCH devedor existente — uses `dbUpdate("devedores", sel.id, payload)` |
| `onAtualizarDevedor(devAtualizado)` | 2391 | Callback that propagates updated devedor object up to state |

`onAtualizarDevedor` is the correct hook for the new pagamentos component to call after saving a payment — it calls `setDevedores(prev => prev.map(...))` and `setSel(devAtualizado)`.

### State variables available in scope
```js
const [sel, setSel] = useState(null);         // selected devedor object
const [abaFicha, setAbaFicha] = useState("dados");
```
`sel` is passed to the new component as `devedor` prop.

---

## 2. Calculation Functions

### `calcularFatorCorrecao(indexador, dataInicio, dataFim)` — correcao.js lines 151–165
```js
// Returns a multiplier (e.g. 1.15 = 15% correction)
// indexador: "igpm" | "ipca" | "selic" | "inpc" | "nenhum"
// dataInicio, dataFim: ISO date strings "YYYY-MM-DD"
// If indexador === "nenhum", returns 1
// Iterates month-by-month; missing months fall back to TAXA_MEDIA[indexador]
calcularFatorCorrecao("inpc", "2022-01-15", "2025-04-01") // → 1.2345
```

### `calcularJurosAcumulados({ principal, dataInicio, dataFim, jurosTipo, jurosAM, regime })` — correcao.js lines 127–149
```js
// principal: number (base value, already corrected)
// dataInicio, dataFim: ISO date strings "YYYY-MM-DD"
// jurosTipo: "legal_classico"|"fixo_05"|"fixo_1"|"selic"|"sem_juros"|"outros"
// jurosAM: number (% per month, used only when jurosTipo === "outros")
// regime: "simples" | "composto" (default: "composto")
// Returns: { juros: number, meses: number }
const { juros } = calcularJurosAcumulados({
  principal: 10000,
  dataInicio: "2022-01-15",
  dataFim: "2025-04-01",
  jurosTipo: "outros",
  jurosAM: 1,
  regime: "simples",
});
```

### How `calcular()` works — the iterative pattern for partial payments

The `calcular()` function (lines 4113–4268) follows this exact pattern for each debt:

```
PV = valor_total (original principal)
dataIni = data_inicio_atualizacao || data_vencimento || data_origem
fatorCorr = calcularFatorCorrecao(indexador, dataIni, dataCalculo)
corrDiv = PV * fatorCorr - PV
pcDiv = PV + corrDiv          // principal corrigido

jurosDiv = calcularJurosAcumulados({
  principal: pcDiv,           // on CORRECTED principal
  dataInicio: dataIni,
  dataFim: dataCalculo,
  jurosTipo: "outros",
  jurosAM: jAM,
  regime: "simples",
}).juros

multaDiv = (baseMulta === "corrigido" ? pcDiv : PV) * mPct / 100
subDiv = pcDiv + jurosDiv + multaDiv
honDiv = subDiv * hPct / 100
total = subDiv + honDiv
```

### How to adapt this for iterative partial payment calculation

For each payment, run the same calculation on the **remaining balance** for the period `[previous payment date → this payment date]`, then subtract the payment:

```js
function calcularDebitoAteData(saldo, dataIni, dataFim, div) {
  // saldo: current outstanding balance (starts as PV, then reduces after each payment)
  const fator = calcularFatorCorrecao(div.indexador, dataIni, dataFim);
  const corr = saldo * fator - saldo;
  const pc = saldo + corr;
  const { juros } = calcularJurosAcumulados({
    principal: pc,
    dataInicio: dataIni,
    dataFim: dataFim,
    jurosTipo: div.juros_tipo,
    jurosAM: parseFloat(div.juros_am),
    regime: "simples",
  });
  const multa = pc * (parseFloat(div.multa_pct) || 0) / 100;
  // Multa: only on first period (or as a one-time charge — clarify with user)
  return { pc, corr, juros, multa, total: pc + juros + multa };
}

// Usage across N payments sorted by date:
let saldo = PV;
let periodoInicio = div.data_inicio_atualizacao;
for (const pg of pagamentosOrdenados) {
  const { total, corr, juros, multa, pc } = calcularDebitoAteData(saldo, periodoInicio, pg.data_pagamento, div);
  const saldoAntesPagamento = total;
  saldo = saldoAntesPagamento - pg.valor;
  periodoInicio = pg.data_pagamento;
  // push row to spreadsheet: { data: pg.data, desc: pg.observacao, debito: total, credito: pg.valor, saldo }
}
// Final: calcularDebitoAteData(saldo, periodoInicio, dataCalculo, div) for remaining balance
```

**Important:** The existing calculator always calls `calcularJurosAcumulados` with `regime: "simples"` in all practical usage in App.jsx — verify with user which regime applies to partial payments.

---

## 3. PDF Generation

### Library
`jsPDF 2.5.1` (UMD build, loaded from CDN at runtime — NOT installed as npm package).

**Load pattern** (same in two places — lines 1416–1429 and 4343–4357):
```js
let jsPDF;
if (window.jspdf?.jsPDF) {
  jsPDF = window.jspdf.jsPDF;
} else {
  await new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });
  jsPDF = window.jspdf?.jsPDF;
}
if (!jsPDF) { toast.error("Não foi possível carregar o gerador de PDF."); return; }
```

### Instantiation
```js
// Portrait (Ficha do Devedor — line 1431)
const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
// W=210, ML=14, MR=196

// Landscape (Resumo de Débito — line 4359)
const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
// W = doc.internal.pageSize.getWidth() = 297
```

**Recommendation for the new spreadsheet PDF:** Use **landscape** (same as exportarPDF at line 4337) since the spreadsheet has 5 columns (Data | Descrição | Débito | Crédito | Saldo).

### Table pattern — exact reference from `exportarPDF()` (lines 4404–4455)

```js
// Column headers
const cols = ["ITEM / DESCRIÇÃO", "VENCIMENTO", "VALOR SINGELO", "VALOR ATUALIZADO", "JUROS MORAT.", "MULTA", "TOTAL"];
const colW = [50, 22, 24, 28, 24, 20, 22]; // widths must sum to W-28

// Draw header row
let x = 14;
doc.setFillColor(220, 220, 240); doc.rect(14, y - 4, W2, 7, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(0, 0, 0);
cols.forEach((c, ci) => {
  if (ci === 0) doc.text(c, x + 1, y);
  else doc.text(c, x + colW[ci] - 1, y, { align: "right" });
  x += colW[ci];
});
y += 6;

// Draw data rows with alternating background
rows.forEach((row, di) => {
  if (di % 2 === 0) { doc.setFillColor(250, 250, 252); doc.rect(14, y - 3.5, W2, 5.5, "F"); }
  x = 14;
  vals.forEach((v, vi) => {
    const mw = colW[vi] - 2;
    if (vi === 0) doc.text(doc.splitTextToSize(String(v), mw)[0], x + 1, y);
    else doc.text(doc.splitTextToSize(String(v), mw)[0], x + colW[vi] - 1, y, { align: "right" });
    x += colW[vi];
  });
  y += 5.5;
  if (y > 185) { doc.addPage(); y = 15; } // page break check
});

// Totals row
doc.setFillColor(79, 70, 229); doc.rect(14, y - 4, W2, 8, "F");
doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
```

### Adapted column layout for the new spreadsheet PDF (landscape, 5 cols)
```
W = 297, W2 = 297 - 28 = 269
cols = ["DATA", "DESCRIÇÃO / EVENTO", "DÉBITO", "CRÉDITO", "SALDO"]
colW = [24, 105, 40, 40, 60]   // sum = 269
```

---

## 4. Supabase Patterns

### Core function signatures — supabase.js lines 73–76
```js
dbGet(table, query = "")       // GET /rest/v1/{table}?{query}  (default: ?order=id.asc)
dbInsert(table, body)          // POST /rest/v1/{table}
dbUpdate(table, id, body)      // PATCH /rest/v1/{table}?id=eq.{id}
dbDelete(table, id)            // DELETE /rest/v1/{table}?id=eq.{id}
```

### Filter pattern for devedor_id (confirmed in multiple places)
```js
// Get all pagamentos for a devedor:
const pagamentos = await dbGet("pagamentos_parciais", `devedor_id=eq.${sel.id}&order=data_pagamento.asc`);

// Get with multiple filters (example from line 1029):
await dbGet("registros_contato", `devedor_id=eq.${sel.id}&order=data.desc,criado_em.desc`);
```

The `sb()` function appends the query string as `?{query}` (line 18: `` `${SUPABASE_URL}/rest/v1/${path}${extra}` `` where `extra = query ? \`?${query}\` : "?order=id.asc"`).

### SQL migration file pattern
Existing migrations are ALTER TABLE scripts (migration_processos.sql, migration_credores.sql). The new table must be a CREATE TABLE script since `pagamentos_parciais` is brand new:
```sql
CREATE TABLE IF NOT EXISTS pagamentos_parciais (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id    BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor         NUMERIC(15,2) NOT NULL,
  observacao    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pagamentos_parciais_devedor
  ON pagamentos_parciais(devedor_id);
```
Place at: `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql`

---

## 5. Devedor Data Structure

### Full object shape (from FORM_DEV_VAZIO + Supabase columns observed in salvarDevedor)
```js
{
  id: number,               // Supabase PK
  nome: string,
  cpf_cnpj: string,
  tipo: "PF" | "PJ",
  rg: string | null,
  data_nascimento: string | null,
  profissao: string | null,
  socio_nome: string | null,
  socio_cpf: string | null,
  email: string | null,
  telefone: string | null,
  telefone2: string | null,
  cep: string | null,
  logradouro: string | null,
  numero: string | null,
  complemento: string | null,
  bairro: string | null,
  cidade: string,
  uf: string,
  credor_id: number | null,
  valor_original: number,   // sum of dividas[].valor_total
  valor_nominal: number,    // same as valor_original (legacy compat)
  status: string,           // one of STATUS_DEV[].v
  responsavel: string,
  observacoes: string | null,
  numero_processo: string | null,
  descricao_divida: string | null,
  // JSON columns parsed into arrays on load (carregarTudo, line 6894–6909):
  dividas: Divida[],
  contatos: Contato[],
  acordos: Acordo[],
}
```

### Divida shape (from DIVIDA_VAZIA + adicionarDivida)
```js
{
  id: number,                       // Date.now()
  descricao: string,
  valor_total: number,
  data_origem: string,              // YYYY-MM-DD
  data_vencimento: string,
  data_inicio_atualizacao: string,  // start date for correction calc
  parcelas: Parcela[],
  indexador: "igpm"|"ipca"|"selic"|"inpc"|"nenhum",
  juros_tipo: string,
  juros_am: number,
  multa_pct: number,
  honorarios_pct: number,
  despesas: number,
  observacoes: string,
  custas: Custa[],
  _so_custas?: boolean,             // flag for judicial fees-only entry
  _nominal?: boolean,               // flag for legacy placeholder
}
```

**Key insight:** `dividas` is stored as a JSON string in Supabase (`dividas: JSON.stringify(dividas)`) and parsed back on load. The new `pagamentos_parciais` table uses a proper relational row per payment — this is the correct architecture.

---

## 6. UI Sub-List Pattern

### Best reference: `CustasAvulsasForm` — lines 1858–1904

This component is the closest match to the new pagamentos CRUD UI: a list of items that can be added/edited inline, each row in a grid.

**Structure:**
```jsx
// Container
<div style={{ background: "#fff7ed", borderRadius: 14, padding: 16, border: "1.5px solid #fed7aa", marginTop: 8 }}>
  {/* Header with title + add button */}
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
    <p style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 13, color: "#c2410c" }}>Title</p>
    <button onClick={addItem} style={{ background: "#c2410c", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>+ Item</button>
  </div>

  {/* Empty state */}
  {items.length === 0 && <p style={{ fontSize: 12, color: "#c2410c", opacity: .6, textAlign: "center", padding: "8px 0" }}>Empty message</p>}

  {/* Row grid — 4 columns: description, value, date, remove button */}
  {items.map((item, ci) => (
    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
      <input style={{ padding: "7px 9px", border: "1.5px solid #fed7aa", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "Plus Jakarta Sans" }} />
      <input type="number" style={{ /* same */ }} />
      <input type="date" style={{ /* same */ }} />
      <button onClick={() => rem(ci)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "5px 9px", cursor: "pointer", fontSize: 12 }}>✕</button>
    </div>
  ))}

  {/* Footer with total + save */}
  {items.length > 0 && (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: "1px dashed #fed7aa" }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>Total: {fmt(sum)}</span>
      <Btn onClick={salvar} color="#c2410c">Salvar</Btn>
    </div>
  )}
</div>
```

### Existing parcelas table pattern — lines 2697–2740

For displaying the saved pagamentos list, the parcelas table is the reference:
```jsx
<div style={{ maxHeight: 160, overflowY: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
    <thead>
      <tr style={{ background: "#f1f5f9" }}>
        {["Data", "Valor", "Observação", ""].map(h => (
          <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: "#94a3b8", fontWeight: 700, fontSize: 10 }}>{h}</th>
        ))}
      </tr>
    </thead>
    <tbody>
      {pagamentos.map(p => (
        <tr key={p.id}>
          <td style={{ padding: "5px 8px" }}>{fmtDate(p.data_pagamento)}</td>
          <td style={{ padding: "5px 8px", color: "#16a34a", fontWeight: 700 }}>{fmt(p.valor)}</td>
          <td style={{ padding: "5px 8px", color: "#64748b" }}>{p.observacao || "—"}</td>
          <td><button onClick={() => excluir(p.id)}>✕</button></td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### The `Inp` and `Btn` helpers

These helpers are used throughout the form — they're defined locally in App.jsx:
- `<Inp label="..." value={...} onChange={v => ...} type="text|number|date" />` — labeled input wrapper
- `<Btn onClick={...} color="#hex" outline>Text</Btn>` — styled button

They are available in scope within the `Devedores` function for the new tab panel. For a separate `AbaPagamentosParciais` component, pass `fmt` and `fmtDate` as props (pattern from `imprimirFicha(sel, credores, fmt, fmtDate)` at line 2450).

---

## 7. Risks and Blockers

### Risk 1 — `fmt` and `fmtDate` are module-level closures, not exported
`fmt` and `fmtDate` are defined inside the app root function or at module level. Check lines ~80–120 (before the function definitions) to confirm they are accessible to a new top-level component like `AbaPagamentosParciais`. If `AbaPagamentosParciais` is defined as a top-level function outside `Devedores`, it must receive `fmt` and `fmtDate` as props.

**Mitigation:** Define the new component as a top-level function and pass `fmt`, `fmtDate` as props. Reference pattern: `AbaRelatorio` at line 1003 receives `sel, user, setSel, setDevedores`.

### Risk 2 — No `dbDelete` for a specific row (only by `id`)
`dbDelete(table, id)` uses `?id=eq.${id}` — fine for the new table since each row has its own `id`. No issue.

### Risk 3 — Supabase RLS (Row Level Security)
Other tables use the anon/publishable key. If RLS is enabled on `pagamentos_parciais` (newly created table), inserts/reads will fail silently or throw 401. Follow the same pattern as other tables: the table must have RLS disabled OR policies matching the auth pattern used. Check Supabase dashboard after running the CREATE TABLE migration.

### Risk 4 — Calculation complexity: which dívida's parameters to use for partial payments
A devedor may have multiple `dividas` each with different `indexador`, `juros_tipo`, `multa_pct`. The iterative calculation must be done **per divida**, then summed. If the user records a single lump-sum payment, it must be allocated across dividas (how? pro-rata? in order?). This is a design decision, not purely a coding risk — needs user confirmation before implementation.

**Recommendation:** For v1, calculate total outstanding across all dividas at each payment date, treat each payment as reducing the aggregate balance, and show a single spreadsheet for the devedor (not per divida).

### Risk 5 — PDF `jsPDF` loaded via dynamic script injection
If the CDN is unreachable (offline or blocked), PDF export silently fails. The existing code uses `toast.error(...)` as fallback — replicate this exactly.

### Risk 6 — App.jsx line count (7226 lines)
Any new component added inside this file will be difficult to locate. Strongly recommend defining `AbaPagamentosParciais` as a **top-level function** before the `Devedores` function (same pattern as `CustasAvulsasForm` at line 1858, `AbaAcordos` at line 766, `AbaRelatorio` at line 1003). Do NOT nest it inside `Devedores`.

---

## Summary Map

| Item | Location | Lines |
|---|---|---|
| Devedores component | App.jsx | 1906–3302 |
| Tab bar (insert new tab) | App.jsx | 2460 |
| Tab panels section (insert new panel) | App.jsx | after 2827, before 2828 |
| `salvarDevedor()` | App.jsx | 2002 |
| `salvarEdicao()` | App.jsx | 2127 |
| `onAtualizarDevedor()` | App.jsx | 2391 |
| `calcularFatorCorrecao()` | utils/correcao.js | 151–165 |
| `calcularJurosAcumulados()` | utils/correcao.js | 127–149 |
| `calcular()` / `calcularSilencioso()` | App.jsx | 4113 / 3957 |
| `exportarPDF()` (table pattern) | App.jsx | 4337–4484 |
| `imprimirFicha()` (portrait PDF pattern) | App.jsx | 1415–(~1900) |
| `CustasAvulsasForm` (UI sub-list pattern) | App.jsx | 1858–1904 |
| Parcelas table (display list pattern) | App.jsx | 2697–2740 |
| `dbGet/dbInsert/dbUpdate/dbDelete` | config/supabase.js | 73–76 |
| `devedor_id=eq.${id}` filter pattern | App.jsx | 1029, 1067, 5672 |
| `FORM_DEV_VAZIO` / `DIVIDA_VAZIA` | utils/constants.js | 18–30 |
| SQL migration pattern | migration_processos.sql | 1–9 |
