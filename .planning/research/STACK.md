# Technology Stack — v1.1 Payments and Installment Contracts

**Project:** Mr. Cobranças
**Milestone:** v1.1 — Pagamentos e Contratos
**Researched:** 2026-04-20
**Scope:** Additions/changes only — existing React 18 + Vite + Supabase (no-backend SPA) stack is locked.

---

## Schema Additions

### 1. `pagamentos_divida` — Payment per debt

This is the core table for v1.1 feature 1. The existing `pagamentos_parciais` is keyed by `devedor_id` and feeds the Art. 354 CC sequential engine across all debts of a debtor. The new table is keyed by `divida_id` to support scoped payment recording directly in `DetalheDivida`.

```sql
CREATE TABLE IF NOT EXISTS pagamentos_divida (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  divida_id      UUID NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,
  devedor_id     BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor          NUMERIC(15,2) NOT NULL CHECK (valor > 0),
  observacao     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_divida_divida
  ON pagamentos_divida(divida_id);

CREATE INDEX IF NOT EXISTS idx_pagamentos_divida_devedor
  ON pagamentos_divida(devedor_id);

ALTER TABLE pagamentos_divida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON pagamentos_divida
  FOR ALL USING (true) WITH CHECK (true);
```

**Why `devedor_id` is redundant but necessary:** `carregarTudo()` in `App.jsx` fetches `pagamentos_parciais` by `devedor_id` (line 8334). The new table needs the same query pattern for `allPagamentos` to include these payments in the Art. 354 engine. Alternatively, the calc engine is fed from `pagamentos_divida` separately per divida — that architectural decision goes in FEATURES.md, not here. The column must exist either way.

**Field naming follows `pagamentos_parciais` pattern exactly** — `data_pagamento`, `valor`, `observacao`, `created_at`. No deviation so that the engine can treat both tables' rows uniformly.

---

### 2. `contratos` — Installment contract header

```sql
CREATE TABLE IF NOT EXISTS contratos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id      BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  credor_id       BIGINT REFERENCES credores(id),
  tipo_contrato   TEXT NOT NULL
                  CHECK (tipo_contrato IN ('nota_fiscal','duplicata','compra_venda','emprestimo','outro')),
  descricao       TEXT,
  valor_total     NUMERIC(15,2),
  data_contrato   DATE,
  status          TEXT DEFAULT 'ativo'
                  CHECK (status IN ('ativo','quitado','rescindido','inadimplente')),
  observacoes     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_devedor ON contratos(devedor_id);
CREATE INDEX IF NOT EXISTS idx_contratos_credor  ON contratos(credor_id);

ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON contratos
  FOR ALL USING (true) WITH CHECK (true);
```

---

### 3. `contrato_id` column on `dividas` — Link installment to contract

Each installment (parcela) of a contract is a row in `dividas`. Add a nullable FK to link them:

```sql
ALTER TABLE dividas
  ADD COLUMN IF NOT EXISTS contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dividas_contrato ON dividas(contrato_id);
```

**Why parcelas-as-dividas:** Each installment needs the full Art. 354 CC engine — its own `data_vencimento`, `indexador`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`. Reusing `dividas` means zero new calculator code. The contract header (`contratos`) is only a grouping entity for display and aggregation. This mirrors how the existing JSONB `dividas[].parcelas` worked but normalizes it into the relational model already established in v1.0.

**Why not a separate `parcelas` table:** Would require a third set of service functions, a third calc engine adaptation, and new RLS — for no gain since `dividas` already has every field needed. The existing `dividas.parcelas JSONB` column on the old model is already deprecated post-v1.0; this recycles the correct pattern.

---

### Column alias invariant (critical — do not break)

`carregarTudo()` in `App.jsx` lines 8351–8354 maps DB columns to calc-engine aliases:

| DB column (`dividas`) | Calc-engine alias (devedorCalc.js) |
|-----------------------|------------------------------------|
| `indice_correcao` | `indexador` |
| `juros_am_percentual` | `juros_am` |
| `multa_percentual` | `multa_pct` |
| `honorarios_percentual` | `honorarios_pct` |
| `observacoes` | `descricao` |

Any new service that loads `dividas` rows and feeds them to `devedorCalc.js` must apply the same alias mapping. Do not add new columns to `dividas` with calc-engine names directly — the mapping layer in `carregarTudo` is the single source of truth.

---

## Library Additions

### No new runtime libraries needed

**Rationale:** All required capabilities are already present or trivially implementable with existing tools.

| Capability | Existing solution | Verdict |
|------------|-------------------|---------|
| Currency formatting | `formatters.js` line 1: `Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})` | Already exists — `fmt()` and `fmtBRL()` in `DetalheDivida.jsx` |
| Date display | `formatters.js` line 2: `fmtDate()` with `"pt-BR"` locale | Already exists |
| Date arithmetic (month-stepping for installments) | Native `Date` — already used in `App.js` line 2068 (`gerarParcs` function) | Already exists — identical pattern needed for contract installment generation |
| Monetary arithmetic | Native JS `parseFloat` + `NUMERIC(15,2)` in Supabase | Sufficient for this domain; no floating-point accumulation risk at legal-debt scale |
| Form state | `useState` — consistent with `DividaForm.jsx` and `NovaDivida.jsx` patterns | No new state management lib needed |
| Toast notifications | `react-hot-toast` ^2.6.0 — already in package.json | Already present |
| HTTP to Supabase | Custom `sb()` fetch wrapper in `supabase.js` | Already present; new services follow same pattern |

**No `date-fns`, `dayjs`, `luxon`, or `moment`:** The existing codebase does all date work with native `Date` and string slicing (`toISOString().slice(0,10)`). Adding a date library now would create two competing date-handling styles and adds bundle weight for no functional gain.

**No `decimal.js` or `big.js`:** The existing monetary engine uses `parseFloat` throughout `devedorCalc.js` without issue. Legal precision requirements are met by `NUMERIC(15,2)` at the DB layer. Introducing a decimal library would require migrating all existing calc code — out of scope.

**No `react-hook-form` or `formik`:** `DividaForm.jsx` is a controlled-component pattern without a form library. New forms (payment entry, contract creation) should follow the same pattern to maintain codebase consistency.

---

## What NOT to Add

| Item | Why not |
|------|---------|
| Supabase JS client (`@supabase/supabase-js`) | The project uses a custom `sb()` fetch wrapper against PostgREST directly. Introducing the Supabase JS client would create two competing auth and request patterns. The existing wrapper handles JWT correctly and is battle-tested in production. |
| Supabase Realtime / subscriptions | Not needed for this milestone. Payment recording is a user-initiated action; polling every 60s (existing pattern in `App.jsx` line 5936) is sufficient. |
| Supabase Edge Functions | No server-side logic needed for payments or contract creation. All business logic (Art. 354 allocation, installment generation) runs client-side in `devedorCalc.js` — this is an intentional architectural constraint (SPA, no own backend). |
| TypeScript | Explicitly out of scope per PROJECT.md. |
| React Router | No routing needed. The existing view-state pattern (`useState` for active view in `ModuloDividas`) is sufficient for DetalheDivida and a new Contrato detail view. |
| Redux / Zustand / Jotai | `useState` + prop drilling or `useCallback` with reload pattern (as in `useDevedoresDividas.js`) is sufficient. Adding global state for two new tables would be over-engineering. |
| A currency input mask library | The existing `masks.js` and `type="number"` inputs handle entry. A dedicated lib (e.g., `react-currency-input-field`) adds a dependency for no UX gain given the existing patterns. |
| ORM or query builder | PostgREST via the `sb()` wrapper is the ORM. Service files (`dividas.js`, `devedoresDividas.js`) are the query layer. Follow that pattern for `pagamentos.js` and `contratos.js`. |

---

## Migration Notes

### Approach: manual SQL in Supabase SQL Editor (existing convention)

All prior migrations (001_devedores_dividas.sql, 002_dividas_tabela.sql, migration_pagamentos_parciais.sql) are standalone SQL files run manually in Supabase Dashboard > SQL Editor. Continue this pattern — no migration runner (Flyway, golang-migrate, Supabase CLI migrations) is set up, and adding one is out of scope.

**File naming convention:** `migration_pagamentos_divida.sql`, `migration_contratos.sql`.

### Migration ordering

1. `migration_contratos.sql` first — `dividas` FK depends on `contratos` existing.
2. `migration_dividas_contrato_id.sql` second — adds `contrato_id` FK to `dividas`.
3. `migration_pagamentos_divida.sql` — independent, can run in any order relative to 1 and 2, but run after the `dividas` table is confirmed stable.

### Idempotency requirement

Every migration must use `IF NOT EXISTS` and `DO $$ BEGIN IF NOT EXISTS ... END $$` guards, matching the existing pattern. The SQL Editor does not track applied migrations — re-runs must be safe.

### RLS policy pattern

All existing tables use `allow_all` / `FOR ALL USING (true) WITH CHECK (true)`. This is an intentional choice (single-tenant, JWT auth handled at application layer, not row level). New tables must use the same policy or the existing `sb()` wrapper will receive 403s.

**Note:** The current RLS pattern is permissive and relies on the Supabase anon key + JWT combination for auth. If multi-tenancy or stricter access control is added in v2, all policies will need revisiting. That is documented in PROJECT.md as out of scope.

### `carregarTudo()` integration for `pagamentos_divida`

The `carregarTudo()` call in `App.jsx` (line 8327) uses a `Promise.all` to fetch everything. Payment records from `pagamentos_divida` are only needed in `DetalheDivida`, not in the global list view. Load lazily inside `DetalheDivida` on mount — same pattern as `pagamentos_parciais` in `FilaDevedor.jsx` (line 2511, loaded per devedor on mount). This avoids growing the global `carregarTudo()` payload.

```js
// Inside DetalheDivida or usePagamentosDivida hook:
const rows = await dbGet("pagamentos_divida", `divida_id=eq.${dividaId}&order=data_pagamento.asc`);
```

### `schema_reload` signal

Every migration must end with `SELECT pg_notify('pgrst', 'reload schema');` — required for PostgREST to pick up new tables immediately without a service restart, as established in `002_dividas_tabela.sql` line 69.

---

## Service Layer Pattern

New service files follow `dividas.js` exactly — one file per table, exports named async functions, uses `sb()` wrapper:

- `src/services/pagamentos.js` — CRUD for `pagamentos_divida`, query by `divida_id`
- `src/services/contratos.js` — CRUD for `contratos`, query by `devedor_id`

New custom hook consistent with `useDevedoresDividas.js`:
- `src/services/usePagamentosDivida.js` — `useState` + `useEffect` + reload pattern, accepts `dividaId`

No other HTTP client. No SDK. No middleware.
