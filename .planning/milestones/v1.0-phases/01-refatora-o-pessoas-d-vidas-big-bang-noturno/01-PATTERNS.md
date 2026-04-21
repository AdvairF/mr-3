# Phase 01: Refatoração Pessoas × Dívidas — big bang noturno — Pattern Map

**Mapped:** 2026-04-18
**Files analyzed:** 4 (1 new migration SQL, 1 new service JS, 2 modified App.jsx sections)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/services/migrations/002_dividas_tabela.sql` | migration | batch (DDL + seed INSERT) | `src/services/migrations/001_devedores_dividas.sql` | exact |
| `src/services/dividas.js` | service | CRUD (request-response) | `src/services/devedoresDividas.js` | exact |
| `src/App.jsx` — `carregarTudo()` | utility/hook | request-response + transform | same file lines 8450-8489 (current) + `pgtosPorDevedorCarteira` map at line 8517 | self-analog (modify in place) |
| `src/App.jsx` — 7 write surfaces in `Devedores` component | controller | CRUD | same file lines 3269-3467 (current) + `devedoresDividas.js` for `seedPrincipal` call | self-analog (modify in place) |

---

## Pattern Assignments

### `src/services/migrations/002_dividas_tabela.sql` (migration, batch DDL + seed)

**Analog:** `src/services/migrations/001_devedores_dividas.sql` (full file, 75 lines)

**File header comment pattern** (lines 1-5):
```sql
-- ────────────────────────────────────────────────────
-- Migration 002: dividas_tabela
-- Extracts dividas from devedores.dividas JSONB → own table.
-- Recreates devedores_dividas with real UUID FK.
-- ────────────────────────────────────────────────────
```

**CREATE TABLE DDL pattern** — copy structure from 001 lines 7-18, adapt for `dividas`:
```sql
-- Pattern: UUID PK via gen_random_uuid(), BIGINT FK to parent table,
--          TIMESTAMPTZ timestamps, CHECK constraints on enum TEXT fields.
-- Source: 001_devedores_dividas.sql lines 7-18

CREATE TABLE IF NOT EXISTS dividas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id            BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  credor_id             BIGINT REFERENCES credores(id),
  tipo_titulo           TEXT,
  valor_original        NUMERIC(15,2),
  data_vencimento       DATE,
  data_origem           TEXT,                    -- fallback date used by devedorCalc.js
  data_inicio_atualizacao TEXT,                  -- start date for monetary correction
  indice_correcao       TEXT,                    -- igpm/inpc/ipca/nenhum
  juros_tipo            TEXT DEFAULT 'fixo_1',   -- fixo_1/taxa_legal_406/sem_juros — used in devedorCalc.js
  juros_am_percentual   NUMERIC(8,4),
  multa_percentual      NUMERIC(8,4),
  honorarios_percentual NUMERIC(8,4),
  despesas              NUMERIC(15,2) DEFAULT 0, -- avulso expenses, used in devedorCalc.js
  art523_opcao          TEXT DEFAULT 'nao_aplicar'
                        CHECK (art523_opcao IN ('nao_aplicar','so_multa','multa_honorarios')),
  -- NOTE: schema locked defined BOOLEAN but code uses 3-value TEXT (see RESEARCH.md A1)
  status                TEXT DEFAULT 'em cobrança',
  documento_origem_url  TEXT,
  observacoes           TEXT,
  json_id_legado        TEXT,        -- Date.now() string from JSONB — bridge for migration 002 seed
  _so_custas            BOOLEAN DEFAULT false,   -- distinguishes custas entry from regular divida
  contatos              JSONB,
  acordos               JSONB,
  parcelas              JSONB,
  custas                JSONB,       -- array of {descricao, valor, data}
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Index pattern** — copy from 001 lines 21-35:
```sql
-- One PRINCIPAL per divida (carried over concept; adapt to dividas table)
CREATE INDEX IF NOT EXISTS dividas_devedor_idx    ON dividas (devedor_id);
CREATE INDEX IF NOT EXISTS dividas_credor_idx     ON dividas (credor_id);
CREATE INDEX IF NOT EXISTS dividas_legado_idx     ON dividas (json_id_legado);  -- needed for seed JOIN
```

**RLS pattern** — copy verbatim from 001 lines 38-47:
```sql
-- Source: 001_devedores_dividas.sql lines 38-47
ALTER TABLE dividas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'dividas' AND policyname = 'allow_all_dividas'
  ) THEN
    EXECUTE 'CREATE POLICY allow_all_dividas ON dividas FOR ALL USING (true) WITH CHECK (true)';
  END IF;
END $$;

SELECT pg_notify('pgrst', 'reload schema');
```

**JSONB seed INSERT pattern** — CRITICAL: replicate the double-encoding CASE from 001 lines 57-75:
```sql
-- Source: 001_devedores_dividas.sql lines 57-75
-- The CASE handles double-encoded JSONB (app did JSON.stringify before storing).
-- Without this, the INSERT produces zero rows.
INSERT INTO dividas (
  json_id_legado, devedor_id, credor_id, observacoes, valor_original,
  data_vencimento, data_origem, data_inicio_atualizacao,
  indice_correcao, juros_tipo, juros_am_percentual, multa_percentual,
  honorarios_percentual, despesas, art523_opcao, _so_custas,
  parcelas, custas, created_at
)
SELECT
  div_row->>'id'                                    AS json_id_legado,
  d.id                                              AS devedor_id,
  d.credor_id                                       AS credor_id,
  COALESCE(div_row->>'descricao', div_row->>'observacoes') AS observacoes,
  CAST(NULLIF(div_row->>'valor_total', '') AS NUMERIC)     AS valor_original,
  NULLIF(div_row->>'data_vencimento', '')::DATE             AS data_vencimento,
  NULLIF(div_row->>'data_origem', '')                       AS data_origem,
  NULLIF(div_row->>'data_inicio_atualizacao', '')           AS data_inicio_atualizacao,
  COALESCE(NULLIF(div_row->>'indexador', ''), 'igpm')       AS indice_correcao,
  COALESCE(NULLIF(div_row->>'juros_tipo', ''), 'fixo_1')    AS juros_tipo,
  CAST(NULLIF(div_row->>'juros_am', '') AS NUMERIC)         AS juros_am_percentual,
  CAST(NULLIF(div_row->>'multa_pct', '') AS NUMERIC)        AS multa_percentual,
  CAST(NULLIF(div_row->>'honorarios_pct', '') AS NUMERIC)   AS honorarios_percentual,
  CAST(NULLIF(div_row->>'despesas', '') AS NUMERIC)         AS despesas,
  COALESCE(NULLIF(div_row->>'art523_opcao', ''), 'nao_aplicar') AS art523_opcao,
  COALESCE((div_row->>'_so_custas')::BOOLEAN, false)        AS _so_custas,
  CASE WHEN div_row->'parcelas' IS NOT NULL THEN div_row->'parcelas' ELSE '[]'::jsonb END AS parcelas,
  CASE WHEN div_row->'custas' IS NOT NULL   THEN div_row->'custas'   ELSE '[]'::jsonb END AS custas,
  COALESCE(NULLIF(div_row->>'criada_em', ''), NOW()::TEXT)::TIMESTAMPTZ AS created_at
FROM
  devedores d,
  LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb
      WHEN jsonb_typeof(d.dividas) = 'array'  THEN d.dividas
      ELSE '[]'::jsonb
    END
  ) AS div_row
WHERE
  div_row->>'id' IS NOT NULL
  AND div_row->>'id' != ''
ON CONFLICT DO NOTHING;
```

**Recreate devedores_dividas with UUID FK** — runs AFTER `dividas` is populated:
```sql
-- DROP old TEXT-keyed table and recreate with real UUID FK.
-- Source pattern: 001_devedores_dividas.sql (schema), RESEARCH.md Runtime State Inventory
DROP TABLE IF EXISTS devedores_dividas;

CREATE TABLE devedores_dividas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id       BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  divida_id        UUID NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,  -- real FK now
  papel            TEXT NOT NULL DEFAULT 'PRINCIPAL'
                   CHECK (papel IN ('PRINCIPAL','COOBRIGADO','AVALISTA','FIADOR','CONJUGE','OUTRO')),
  responsabilidade TEXT NOT NULL DEFAULT 'SOLIDARIA'
                   CHECK (responsabilidade IN ('SOLIDARIA','SUBSIDIARIA','DIVISIVEL')),
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX devedores_dividas_principal_unique
  ON devedores_dividas (divida_id)
  WHERE papel = 'PRINCIPAL';

CREATE INDEX devedores_dividas_devedor_idx ON devedores_dividas (devedor_id);
CREATE INDEX devedores_dividas_divida_idx  ON devedores_dividas (divida_id);

CREATE UNIQUE INDEX devedores_dividas_unico
  ON devedores_dividas (divida_id, devedor_id);

ALTER TABLE devedores_dividas ENABLE ROW LEVEL SECURITY;
-- RLS policy: same DO $$ block as in 001

-- Seed: map old TEXT divida_id → UUID via json_id_legado
-- Source: RESEARCH.md Runtime State Inventory
INSERT INTO devedores_dividas (devedor_id, divida_id, papel, responsabilidade)
SELECT
  CAST(old_dd->>'devedor_id' AS BIGINT),
  div.id,
  COALESCE(NULLIF(old_dd->>'papel', ''), 'PRINCIPAL'),
  COALESCE(NULLIF(old_dd->>'responsabilidade', ''), 'SOLIDARIA')
FROM (
  -- Read the OLD divida_id TEXT values from devedores.dividas JSONB
  -- (same double-encoding CASE pattern)
  SELECT
    d.id::TEXT        AS devedor_id,
    div_row->>'id'    AS old_divida_id,
    'PRINCIPAL'       AS papel,
    'SOLIDARIA'       AS responsabilidade
  FROM devedores d,
  LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb
      WHEN jsonb_typeof(d.dividas) = 'array'  THEN d.dividas
      ELSE '[]'::jsonb
    END
  ) AS div_row
  WHERE div_row->>'id' IS NOT NULL
) old_dd
JOIN dividas div ON div.json_id_legado = old_dd.old_divida_id
WHERE div.id IS NOT NULL
ON CONFLICT DO NOTHING;
```

---

### `src/services/dividas.js` (service, CRUD request-response)

**Analog:** `src/services/devedoresDividas.js` (full file, 83 lines)

**Import + TABLE constant pattern** (devedoresDividas.js lines 1-3):
```javascript
// Copy verbatim — only change the table name
import { sb } from "../config/supabase.js";

const TABLE = "dividas";
```

**Read pattern** — modeled on `listarParticipantes` / `listarDividasPrincipal` (lines 5-18):
```javascript
// Pattern: sb(`TABLE?filter=eq.${id}&select=*&order=...`)
// Returns raw array from Supabase REST — no transformation.

export async function listarDividas(devedorId) {
  return sb(
    `${TABLE}?devedor_id=eq.${devedorId}&select=*&order=created_at.asc`
  );
}

export async function buscarDivida(dividaId) {
  return sb(`${TABLE}?id=eq.${encodeURIComponent(dividaId)}&select=*&limit=1`);
}
```

**Write pattern** — modeled on `adicionarParticipante` (lines 21-31) and `alterarPapel` (lines 34-42):
```javascript
// Pattern: sb(TABLE, "POST", payload) for insert
//          sb(`TABLE?id=eq.${id}`, "PATCH", payload) for update
//          sb(`TABLE?id=eq.${id}`, "DELETE") for delete
// Note: divida_id is UUID from DB — never pass String(Date.now()) after migration.

export async function criarDivida(payload) {
  // payload: all columns except id/created_at/updated_at (DB defaults)
  return sb(TABLE, "POST", {
    ...payload,
    updated_at: new Date().toISOString(),
  });
}

export async function atualizarDivida(dividaUuid, campos) {
  return sb(`${TABLE}?id=eq.${dividaUuid}`, "PATCH", {
    ...campos,
    updated_at: new Date().toISOString(),
  });
}

export async function excluirDivida(dividaUuid) {
  return sb(`${TABLE}?id=eq.${dividaUuid}`, "DELETE");
}
```

**Full file structure** — follow the same pattern as `devedoresVinculados.js` (43 lines) or `devedoresDividas.js` (83 lines): named exports only, no default export, each function is `async`, uses `sb()` directly, no local state.

---

### `src/App.jsx` — `carregarTudo()` modification (lines 8450-8489)

**Self-analog (modify in place).** The existing function is the pattern; the change is additive.

**Current `useState` block** (lines 8441-8448) — new `dividas` state must be declared in this block before `carregarTudo`:
```javascript
// Source: App.jsx lines 8441-8448
// ADD this line in the same block, before carregarTudo definition:
const [dividas, setDividas] = useState(new Map());  // Map<String(devedor_id), divida[]>
```

**Current Promise.all signature** (lines 8453-8461) — extend with new slot:
```javascript
// Source: App.jsx lines 8453-8461 (BEFORE)
const [devs, creds, procs, ands, reg, lems, pgtos] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  dbGet("processos"),
  dbGet("andamentos"),
  dbGet("regua_cobranca", "order=criado_em.asc"),
  dbGet("lembretes", "order=data_prometida.asc"),
  dbGet("pagamentos_parciais"),
]);

// AFTER — add divs as last slot (non-breaking):
const [devs, creds, procs, ands, reg, lems, pgtos, divs] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  dbGet("processos"),
  dbGet("andamentos"),
  dbGet("regua_cobranca", "order=criado_em.asc"),
  dbGet("lembretes", "order=data_prometida.asc"),
  dbGet("pagamentos_parciais"),
  dbGet("dividas"),  // new
]);
```

**Map-building pattern to copy** — `pgtosPorDevedorCarteira` at lines 8517-8525 is the exact model:
```javascript
// Source: App.jsx lines 8517-8525 — copy this pattern verbatim, rename variables
const pgtosPorDevedorCarteira = useMemo(() => {
  const m = new Map();
  allPagamentos.forEach(p => {
    const k = String(p.devedor_id);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  });
  return m;
}, [allPagamentos]);

// Apply the same pattern inside carregarTudo() for dividas:
// (NOT a useMemo — runs once inside the async function, then setDividas)
const dividasMap = new Map();
(divs || []).forEach(div => {
  const k = String(div.devedor_id);
  if (!dividasMap.has(k)) dividasMap.set(k, []);
  dividasMap.get(k).push(div);
});
setDividas(dividasMap);
```

**JSONB parse removal + devedor object construction** (lines 8464-8480) — CRITICAL: keep `devedor.dividas` populated from `dividasMap` to avoid breaking `devedorCalc.js` (Pitfall 3 in RESEARCH.md):
```javascript
// Source: App.jsx lines 8464-8480 (BEFORE)
const parse = (v, fb = "[]") => { try { return typeof v === "string" ? JSON.parse(v || fb) : (v || JSON.parse(fb)); } catch (e) { return JSON.parse(fb); } };
setDevedores((devs || []).map(d => {
  const dividas = parse(d.dividas);           // ← remove this line after migration
  const contatos = parse(d.contatos);
  const acordos = parse(d.acordos).map(...);
  const valorCalc = dividas.reduce((s, div) => s + (div.valor_total || 0), 0);
  const valorFinal = d.valor_original || valorCalc || d.valor_nominal || 0;
  return {
    ...d,
    dividas,                                  // ← change: pull from dividasMap
    contatos,
    acordos,
    parcelas: parse(d.parcelas),
    valor_original: valorFinal,
    valor_nominal: d.valor_nominal || valorFinal,
  };
}));

// AFTER — build dividasMap first, then use it in setDevedores:
setDevedores((devs || []).map(d => {
  const divs_dev = dividasMap.get(String(d.id)) || [];
  const contatos = parse(d.contatos);
  const acordos = parse(d.acordos).map(ac => ({ ...ac, parcelas: verificarAtrasados(ac.parcelas || []) }));
  const valorCalc = divs_dev.reduce((s, div) => s + (div.valor_original || 0), 0);
  const valorFinal = d.valor_original || valorCalc || d.valor_nominal || 0;
  return {
    ...d,
    dividas: divs_dev,           // populated from dividasMap — keeps devedorCalc.js working
    contatos,
    acordos,
    parcelas: parse(d.parcelas),
    valor_original: valorFinal,
    valor_nominal: d.valor_nominal || valorFinal,
  };
}));
```

---

### `src/App.jsx` — 7 write surfaces in `Devedores` component

**Self-analog (modify in place).** The current implementations are the pattern; below are exact before/after excerpts for each surface.

#### Surface 1: `adicionarDivida()` (lines 3269-3312)

**Core write pattern** (lines 3276-3302) — replace `dbUpdate("devedores")` with `dbInsert("dividas")`:
```javascript
// BEFORE (lines 3291-3302):
const res = await dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas), valor_original });
const atu = Array.isArray(res) ? res[0] : res;
const parsed = montarDevAtualizado(atu, dividas);
setDevedores(prev => prev.map(d => d.id === sel.id ? parsed : d));
setSel(parsed); setNd(DIVIDA_VAZIA);
toast.success("Dívida adicionada com sucesso!");
try {
  const { seedPrincipal } = await import("./services/devedoresDividas.js");
  await seedPrincipal(sel.id, divida.id);  // ← divida.id is Date.now() — wrong after migration
} catch (seedErr) { console.warn("seedPrincipal failed (non-critical):", seedErr); }

// AFTER:
const payload = {
  devedor_id: sel.id,
  credor_id: sel.credor_id || null,
  observacoes: divida.descricao || "Dívida",
  valor_original: divida.valor_total,
  data_vencimento: divida.data_vencimento || null,
  data_origem: divida.data_origem || null,
  data_inicio_atualizacao: divida.data_inicio_atualizacao || null,
  indice_correcao: divida.indexador || "igpm",
  juros_tipo: divida.juros_tipo || "fixo_1",
  juros_am_percentual: divida.juros_am || 0,
  multa_percentual: divida.multa_pct || 0,
  honorarios_percentual: divida.honorarios_pct || 0,
  despesas: divida.despesas || 0,
  art523_opcao: divida.art523_opcao || "nao_aplicar",
  parcelas: JSON.stringify(divida.parcelas || []),
  custas: JSON.stringify(divida.custas || []),
};
const res = await dbInsert("dividas", payload);
const novaDiv = Array.isArray(res) ? res[0] : res;
if (!novaDiv?.id) throw new Error("Supabase did not return new divida row");
// Update valor_original on devedor
await dbUpdate("devedores", sel.id, { valor_original: novaValorOriginal });
// Update local state: add to dividasMap
setDividas(prev => {
  const next = new Map(prev);
  const k = String(sel.id);
  next.set(k, [...(next.get(k) || []), { ...payload, id: novaDiv.id }]);
  return next;
});
// seedPrincipal now uses the UUID returned by Supabase
try {
  const { seedPrincipal } = await import("./services/devedoresDividas.js");
  await seedPrincipal(sel.id, novaDiv.id);  // ← UUID, not Date.now()
} catch (seedErr) { console.warn("seedPrincipal failed (non-critical):", seedErr); }
```

#### Surface 2: `adicionarCustasAvulsas()` (lines 3315-3349)

Same pattern as `adicionarDivida()` with `_so_custas: true` in payload:
```javascript
// BEFORE (line 3335):
const res = await dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas), valor_original: ... });

// AFTER:
const payload = {
  devedor_id: sel.id,
  observacoes: "Custas Judiciais",
  valor_original: totalCustas,
  data_origem: validas[0].data,
  data_vencimento: validas[0].data,
  data_inicio_atualizacao: validas[0].data,
  indice_correcao: "igpm",
  juros_tipo: "sem_juros",
  juros_am_percentual: 0, multa_percentual: 0, honorarios_percentual: 0, despesas: 0,
  art523_opcao: "nao_aplicar",
  _so_custas: true,
  custas: JSON.stringify(validas),
  parcelas: JSON.stringify([]),
};
const res = await dbInsert("dividas", payload);
```

#### Surface 3: `salvarEdicaoDivida()` (lines 3405-3467)

```javascript
// BEFORE (line 3432):
const res = await dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas), valor_original });

// AFTER:
const campos = {
  observacoes: ndEdit.descricao || "Dívida",
  valor_original: total,
  data_vencimento: ndEdit.data_vencimento || dataRef,
  data_origem: dataRef,
  data_inicio_atualizacao: ndEdit.data_inicio_atualizacao || dataRef,
  indice_correcao: ndEdit.indexador,
  juros_tipo: ndEdit.juros_tipo,
  juros_am_percentual: parseFloat(ndEdit.juros_am || "0"),
  multa_percentual: parseFloat(ndEdit.multa_pct || "0"),
  honorarios_percentual: parseFloat(ndEdit.honorarios_pct || "0"),
  despesas: parseFloat(ndEdit.despesas || "0"),
  art523_opcao: ndEdit.art523_opcao || "nao_aplicar",
};
const res = await dbUpdate("dividas", editDivId, campos);  // editDivId is now UUID
await dbUpdate("devedores", sel.id, { valor_original: novaValorOriginal });
```

**Reload pós-save** (lines 3449-3464) — replace JSONB re-parse with `dbGet("dividas")`:
```javascript
// BEFORE (lines 3450-3460):
const fresh = await dbGet("devedores", `id=eq.${sel.id}`);
const freshDev = Array.isArray(fresh) ? fresh[0] : fresh;
if (freshDev) {
  const dividasRaw = typeof freshDev.dividas === "string"
    ? JSON.parse(freshDev.dividas || "[]")
    : (freshDev.dividas || []);
  const dividasNorm = dividasRaw.map(d => ({ ...d, art523_opcao: d.art523_opcao || "nao_aplicar" }));
  const parsedFresh = montarDevAtualizado(freshDev, dividasNorm);
  setDevedores(prev => prev.map(d => d.id === sel.id ? parsedFresh : d));
  setSel(parsedFresh);
}

// AFTER:
const freshDivs = await dbGet("dividas", `devedor_id=eq.${sel.id}`);
if (Array.isArray(freshDivs)) {
  setDividas(prev => {
    const next = new Map(prev);
    next.set(String(sel.id), freshDivs);
    return next;
  });
  // Also update sel so UI re-renders with fresh data
  setSel(prev => ({ ...prev, dividas: freshDivs }));
}
```

#### Surface 4: `excluirDivida()` (lines 3368-3381)

```javascript
// BEFORE (line 3373):
const res = await dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas), valor_original });

// AFTER:
await dbDelete("dividas", dId);  // dId is UUID after migration
await dbUpdate("devedores", sel.id, { valor_original: novaValorOriginal });
// Update dividasMap local state
setDividas(prev => {
  const next = new Map(prev);
  const k = String(sel.id);
  next.set(k, (next.get(k) || []).filter(d => d.id !== dId));
  return next;
});
```

#### Surface 5: `toggleParcela()` (lines 3351-3366)

Parcelas remain JSONB in `dividas` table (deferred). Target is `dividas` table, not `devedores`:
```javascript
// BEFORE (line 3358):
const res = await dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas), status: nSt });

// AFTER: update parcelas on the dividas row (JSONB stays)
await dbUpdate("dividas", dividaId, { parcelas: JSON.stringify(novasParcelas) });
// Also update devedor status if changed
if (nSt !== sel.status) await dbUpdate("devedores", sel.id, { status: nSt });
```

#### Surface 6: `salvarDevedor()` criar (line 3089)

```javascript
// BEFORE (line 3089):
valor_original: valorNominal, status: form.status || "novo", dividas: JSON.stringify([]),

// AFTER — remove the dividas field entirely:
valor_original: valorNominal, status: form.status || "novo",
// No dividas: field — column will be dropped in cleanup migration
```

#### Surface 7 (NAV label): `NAV` array (line 8540)

```javascript
// Source: App.jsx line 8540
// BEFORE:
{ id: "devedores", label: "Devedores", icon: I.dev, color: "#ec4899", bg: "rgba(236,72,153,.18)" }

// AFTER:
{ id: "devedores", label: "Pessoas", icon: I.dev, color: "#ec4899", bg: "rgba(236,72,153,.18)" }
```

**Also update Dashboard card** (line 8787):
```javascript
// Source: App.jsx line 8787
// BEFORE:
{ label: "Devedores", value: devedores.length, tone: "#eaf9ef", ink: "#166534" },

// AFTER:
{ label: "Pessoas", value: devedores.length, tone: "#eaf9ef", ink: "#166534" },
```

---

## Shared Patterns

### Supabase REST write helpers
**Source:** `src/config/supabase.js` lines 73-76
**Apply to:** All write surfaces in App.jsx and `dividas.js` service
```javascript
// These are the only DB write primitives — always use these, never raw fetch.
export const dbGet    = (t, q = "")   => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",   b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH",  b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
```

### Error handling in async functions
**Source:** App.jsx `adicionarDivida()` lines 3290-3311 (try/catch structure)
**Apply to:** All 7 write surfaces
```javascript
// Pattern: try { ...db call... toast.success(...) } catch (e) { toast.error(...) }
// No silent swallowing — always toast.error on failure.
// Local state update moves INSIDE try block (not in catch), after confirming DB success.
try {
  const res = await dbInsert("dividas", payload);
  const row = Array.isArray(res) ? res[0] : res;
  if (!row?.id) throw new Error("Supabase did not return row");
  // update local state
  toast.success("...");
} catch (e) {
  toast.error("Não foi possível salvar: " + e.message);
}
```

### Dynamic import for devedoresDividas.js (seedPrincipal)
**Source:** App.jsx lines 3298-3302
**Apply to:** `adicionarDivida()` after migration (UUID must come from DB response)
```javascript
// Pattern: lazy import with try/catch — seedPrincipal is non-critical
try {
  const { seedPrincipal } = await import("./services/devedoresDividas.js");
  await seedPrincipal(sel.id, novaDiv.id);  // novaDiv.id = UUID from dbInsert response
} catch (seedErr) {
  console.warn("seedPrincipal failed (non-critical):", seedErr);
}
```

### Local state update for Map-based state (`dividasMap`)
**Source:** `pgtosPorDevedorCarteira` pattern at App.jsx lines 8517-8525
**Apply to:** All write surfaces that create/update/delete `dividas` rows
```javascript
// Pattern: copy Map → mutate key → set new Map (immutable update)
setDividas(prev => {
  const next = new Map(prev);
  const k = String(sel.id);
  // for insert:  next.set(k, [...(next.get(k) || []), newRow]);
  // for update:  next.set(k, (next.get(k) || []).map(d => d.id === uuid ? {...d, ...campos} : d));
  // for delete:  next.set(k, (next.get(k) || []).filter(d => d.id !== uuid));
  return next;
});
```

### `montarDevAtualizado` helper
**Source:** App.jsx lines 3254-3267
**Note for planner:** After migration, `dividas` argument to this helper comes from `dividasMap.get(String(sel.id)) || []`, NOT from `sel.dividas`. The helper signature does not change, but callers must pass the correct source.
```javascript
// Source: App.jsx lines 3254-3267 — do not modify this function
function montarDevAtualizado(atu, dividas, extras = {}) {
  const valor_original = dividas.reduce((s, d) => s + (d.valor_total || 0), 0) || atu?.valor_original || sel?.valor_original || 0;
  return {
    ...sel,
    ...(atu || {}),
    dividas,          // populated from dividasMap, not from devedores.dividas JSONB
    contatos: sel?.contatos || [],
    acordos: sel?.acordos || [],
    valor_original,
    valor_nominal: sel?.valor_nominal || valor_original,
    ...extras,
  };
}
// NOTE: valor_total (JSONB field) vs valor_original (dividas table column) —
// the reduce must use the correct field name from the new table.
```

### SQL JSONB double-encoding guard
**Source:** `001_devedores_dividas.sql` lines 65-71
**Apply to:** All JSONB extractions in `002_dividas_tabela.sql` (seed INSERT and devedores_dividas seed)
```sql
LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb
    WHEN jsonb_typeof(d.dividas) = 'array'  THEN d.dividas
    ELSE '[]'::jsonb
  END
) AS div_row
```

### Service file structure
**Source:** `src/services/devedoresDividas.js` (full file) and `src/services/devedoresVinculados.js`
**Apply to:** `src/services/dividas.js`
```javascript
// Conventions:
// 1. Named exports only — no default export
// 2. Each function is async
// 3. Uses sb() directly — no dbGet/dbInsert wrappers (those are App.jsx-level)
// 4. TABLE constant at top
// 5. No React imports, no state
// 6. String(id) coercion before passing to URL (line 27: divida_id: String(dividaId))
//    — After migration, IDs are UUIDs; String() coercion is still safe (no-op on UUID string)
```

---

## No Analog Found

All 4 files have close analogs. No orphan entries.

---

## Metadata

**Analog search scope:** `src/mr-3/mr-cobrancas/src/` (services/, config/, App.jsx)
**Files read:** 6 source files + CONTEXT.md + RESEARCH.md
**Source line numbers verified:** All excerpts confirmed against live file reads
**Pattern extraction date:** 2026-04-18

**Field name mismatch to watch:** JSONB field is `valor_total`; new `dividas` table column is `valor_original`. The `montarDevAtualizado` reduce and `devedorCalc.js` consume `valor_total` from the JSONB shape. After migration the dividas rows use `valor_original`. Either alias the column in the SELECT or update the reduce in `montarDevAtualizado`. The planner must decide and make it consistent across all 7 surfaces.
