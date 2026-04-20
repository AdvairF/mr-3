# Phase 2: Módulo Dívidas no Sidebar — Research

**Researched:** 2026-04-20
**Domain:** React monolith module addition — sidebar nav, global table, detail screen, financial calculation
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01 — Coexistência:** Aba "Dívidas" dentro de Pessoa permanece intacta. Módulo Dívidas no sidebar é adicional. Ambas as telas editam via `dividas.js`. Sincronização via `carregarTudo()` após qualquer save.

**D-02 — Motor de cálculo:** Manter sequencial (status quo). Pagamentos parciais compartilhados entre dívidas do devedor. Ordem de amortização: dívida mais antiga primeiro (Art. 354 CC). Tela Detalhe mostra saldo calculado pelo motor atual filtrado para aquela dívida. Exige passar `devedor` completo + todos os pagamentos do devedor para o motor.

**D-03 — Filtros:** Inline chips — mesmo padrão da Fila de Cobrança. 4 filtros MVP: Status (dropdown), Credor (dropdown), Devedor (busca por texto), Atraso (dropdown). Chips abaixo da filter bar mostram filtros ativos; clique no chip remove o filtro. Persistência: state React apenas (sem URL params).

**D-04 — MVP Módulo Dívidas:**
- Item no sidebar: label "Dívidas", badge com contagem de dívidas ativas, posição após "Pessoas" na NAV array
- Tabela: colunas Devedor, Credor, Valor Original, Saldo Atualizado, Vencimento, Status, Atraso, Ações; paginação client-side; clique na linha abre Detalhe
- Detalhe: header identificação, card financeiro (Valor Original / Saldo Atualizado / Total Pago), card Art.523, seção Pessoas Vinculadas (lista + add/remove/trocar papel), botão Editar Dívida

**D-05 — Regra do Principal:** Warning com confirmação (não hard block) ao remover PRINCIPAL sem substituto. Texto: "Você está removendo o devedor principal. Esta dívida ficará sem responsável principal. Confirmar?". Sistema permite estado intermediário.

**D-06 — Adicionar pessoa vinculada:** Dropdown de busca nos devedores existentes — sem formulário de criação inline.

### Claude's Discretion

- Estrutura visual exata dos cards no Detalhe (layout, cores, ordem dos campos)
- Comportamento do badge no sidebar (atualiza em tempo real vs. só no carregarTudo)
- Debounce na busca por devedor no filtro
- Skeleton/loading state na tabela durante carregamento inicial
- Como exibir dívidas sem credor cadastrado (null credor_id)
- Paginação: quantas linhas por página (sugestão: 20)

### Deferred Ideas (OUT OF SCOPE)

- PDF por dívida específica
- Filtros por faixa de valor e data de vencimento
- Ordenação clicável de colunas na tabela
- Bulk actions
- Split de pagamentos por `divida_id`
- Criação de nova pessoa inline na tela Detalhe da Dívida
</user_constraints>

---

## Summary

Phase 2 adds a "Dívidas" module to the sidebar of the App.jsx React monolith. The work is purely additive: three new component files (ModuloDividas.jsx, TabelaDividas.jsx / FiltroDividas.jsx combined, DetalheDivida.jsx) plus one helper (AtrasoCell.jsx), one NAV entry, and one `renderPage` case. No existing components are modified except App.jsx integration points.

The financial calculation engine (`calcularSaldoDevedorAtualizado`) is already complete and correct. The Detalhe screen consumes data already in memory (`allDividas`, `devedores`, `allPagamentos`). The `DevedoresDaDivida` component — including its `AdicionarParticipanteModal` — is already fully implemented and will be embedded in DetalheDivida.jsx with a thin wrapper for the D-05 PRINCIPAL removal warning.

The only technical complexity in the phase is building the `devedorObj` required by the calculation engine for each row in the table. Each dívida lives in the flat `allDividas` array; the engine expects a devedor object with `.dividas[]` populated with alias-correct objects and `.pagamentos` from `allPagamentos`. This join must use the aliases from `dividasMap` (verified in `carregarTudo()` at line 8436–8449).

**Primary recommendation:** Build components in dependency order — AtrasoCell.jsx → FiltroDividas.jsx → TabelaDividas.jsx → DetalheDivida.jsx → ModuloDividas.jsx → App.jsx integration. Each step is verifiable independently.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sidebar NAV entry + badge | Frontend (App.jsx) | — | NAV array and badge count are computed from `allDividas` state in App.jsx render |
| Global dívidas table with filters | Frontend (ModuloDividas.jsx) | — | Filters operate on `allDividas` already in memory — no new API calls |
| Atraso tier calculation | Frontend (AtrasoCell.jsx) | — | Pure date arithmetic on `data_vencimento`; same pattern as App.jsx line 4192–4198 |
| Saldo Atualizado per row | Frontend (devedorCalc.js) | — | `calcularSaldoDevedorAtualizado` already exists; requires in-memory join |
| Detalhe da Dívida — financial cards | Frontend (DetalheDivida.jsx) | devedorCalc.js | Read-only display; data from state |
| Pessoas vinculadas — list | Frontend (DevedoresDaDivida.jsx) | useDevedoresDividas hook | Component already complete with its own data fetching hook |
| Pessoas vinculadas — add/remove | Frontend (DevedoresDaDivida.jsx) | devedoresDividas.js service | `adicionarParticipante`, `removerParticipante`, `alterarPapel` are already implemented |
| PRINCIPAL removal warning | Frontend (DetalheDivida.jsx + Modal.jsx) | — | UI-only gating; business logic is in `devedoresDividas.js` |
| Edit dívida form | Frontend (reuse existing form) | dividas.js | Existing form in Pessoa tab — trigger with `setTab("devedores")` + custom event OR pass setEditDivida callback |
| Pagination (client-side) | Frontend (TabelaDividas.jsx) | — | All rows already in state; slice by page index |

---

## Standard Stack

### Core (already in project — no new installs)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI rendering | App already uses React |
| react-hot-toast | 2.6.0 | Notifications | Already used in DevedoresDaDivida.jsx for add/remove success/error |
| vitest | 4.1.4 | Test runner | Already configured; `test:regressao` prebuild hook |

**No new npm dependencies required.** All UI is inline style={} with existing project primitives.

### Supporting (existing utilities)

| Utility | Location | Purpose |
|---------|----------|---------|
| `calcularSaldoDevedorAtualizado` | `utils/devedorCalc.js` | Motor de saldo por devedor |
| `calcularDetalheEncargos` | `utils/devedorCalc.js` | Breakdown financeiro detalhado (Valor Original / Saldo / Total Pago) |
| `fmt` | `utils/formatters.js` | Currency format BRL (`Intl.NumberFormat pt-BR`) |
| `fmtDate` | `utils/formatters.js` | Date format pt-BR (`new Date(d + "T12:00:00").toLocaleDateString("pt-BR")`) |
| `listarParticipantes` | `services/devedoresDividas.js` | Busca participantes de uma dívida com join devedor |
| `adicionarParticipante` | `services/devedoresDividas.js` | Adiciona participante (auto-demove PRINCIPAL anterior) |
| `alterarPapel` | `services/devedoresDividas.js` | Troca papel (auto-demove PRINCIPAL anterior) |
| `removerParticipante` | `services/devedoresDividas.js` | Remove participante por rowId |
| `useDevedoresDividas` | `services/useDevedoresDividas.js` | React hook que encapsula CRUD de participantes |

**Installation:** none required.

---

## Architecture Patterns

### System Architecture Diagram

```
allDividas (App state) ──────────────────────────┐
allPagamentos (App state) ───────────────────────┤
devedores (App state) ───────────────────────────┤
credores (App state) ────────────────────────────┤
                                                  ▼
                                        ModuloDividas.jsx
                                          │           │
                          ┌───────────────┘           └──────────────────┐
                          ▼                                               ▼
                  FiltroDividas.jsx                            [tab state: "dividas_detalhe"]
                  (4 filters → filtered[])                               │
                          │                                              ▼
                          ▼                                    DetalheDivida.jsx
                  TabelaDividas.jsx                              │         │       │
                  (8 cols, 20/page)                    card      │  card   │  seção│
                  AtrasoCell.jsx ◄──────────────   financeiro  Art.523  Pessoas   │
                  (dias desde vencimento)           (devedorCalc)       Vinculadas│
                  row click ──────────────────────────────────────────────────────┘
                                                    DevedoresDaDivida.jsx
                                                    (useDevedoresDividas hook)
                                                              │
                                                    devedoresDividas.js service
                                                              │
                                                         Supabase
                                                    (devedores_dividas table)
```

**Data flow for Saldo Atualizado (table cell):**

```
allDividas[i] ──► find devedor from devedores[] by devedor_id
                  find pagamentos from allPagamentos[] by devedor_id
                  build devedorObj = { ...devedor, dividas: [dividaComAliases] }
                                         ↓
                  calcularSaldoDevedorAtualizado(devedorObj, pagamentosDoDevedor, hoje)
                                         ↓
                                  fmt(saldo) → display
```

### Recommended Project Structure

```
src/mr-3/mr-cobrancas/src/
├── components/
│   ├── ModuloDividas.jsx       # NEW — top-level page: filter bar + table or detalhe
│   ├── TabelaDividas.jsx       # NEW — 8-column table + pagination
│   ├── FiltroDividas.jsx       # NEW — 4 inline filters + active chips
│   ├── DetalheDivida.jsx       # NEW — financial cards + pessoas vinculadas
│   ├── AtrasoCell.jsx          # NEW — atraso tier badge (reusable helper)
│   ├── DevedoresDaDivida.jsx   # EXISTING — embed as-is in DetalheDivida
│   ├── Art523Option.jsx        # EXISTING — embed read-only in DetalheDivida
│   └── ui/
│       └── Modal.jsx           # EXISTING — reuse for PRINCIPAL warning
└── App.jsx                     # MODIFY — NAV entry + renderPage case
```

### Pattern 1: NAV Array Integration

**What:** Add entry to `NAV` array at line 8524, insert after `{ id: "devedores", ... }`.

**When to use:** Exactly once, in App.jsx.

```javascript
// Source: App.jsx line 8524-8534 (verified)
// Insert this entry at index 2 (after devedores, before credores):
{ id: "dividas", label: "Dívidas", icon: I.dividas, color: "#7c3aed", bg: "rgba(124,58,237,.18)" }
```

**Icon definition** — add to the `I` object at line 90. A "stack of papers with dollar" or "list of debts" SVG:

```javascript
// Source: pattern from existing I.fila and I.proc icons (verified)
dividas: <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="12" y1="13" x2="8" y2="13"/>
  <line x1="12" y1="17" x2="8" y2="17"/>
  <line x1="16" y1="13" x2="16.01" y2="13"/>
</svg>
```

**Sidebar badge** — add inside nav button render (NAV.map loop at line 8704):

```javascript
// Source: 02-UI-SPEC.md + App.jsx NAV render pattern (verified)
// Inside the nav-btn for id === "dividas":
{n.id === "dividas" && (() => {
  const count = allDividas.filter(d => d.status === 'em cobrança').length;
  if (!count) return null;
  return (
    <span style={{
      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
      fontSize: 11, fontWeight: 700, background: "#ede9fe", color: "#4c1d95",
      borderRadius: 99, padding: "4px 8px", lineHeight: 1
    }}>{count}</span>
  );
})()}
```

**NOTE:** `allDividas` is in App.jsx scope (line 8415). It is accessible inside NAV render without props drilling.

### Pattern 2: renderPage Case

```javascript
// Source: App.jsx renderPage function at line 8541 (verified)
// Add to switch statement:
case "dividas": return (
  <ModuloDividas
    allDividas={allDividas}
    devedores={devedores}
    credores={credores}
    allPagamentos={allPagamentos}
    hoje={hoje_app}
    onCarregarTudo={carregarTudo}
  />
);
```

### Pattern 3: Alias-Correct devedorObj Construction

**What:** To call `calcularSaldoDevedorAtualizado`, each dívida row needs a devedor object with aliases applied. The aliases are already applied in `dividasMap` inside `carregarTudo()`.

**Critical:** `allDividas` (flat array from `setAllDividas`) does NOT contain aliases. The aliases are only on the `dividas` embedded in `devedores[]`. When building devedorObj for the table, use `devedores[i].dividas` (which came from `dividasMap`), NOT `allDividas`.

```javascript
// Source: App.jsx carregarTudo() lines 8436-8449 (verified) + devedorCalc.js line 76 (verified)
// Pattern for building devedorObj to pass to calcularSaldoDevedorAtualizado:

function buildDevedorObjParaSaldo(divida, devedores, allPagamentos) {
  // divida = row from allDividas (raw, no aliases)
  // Use the devedor's embedded dividas array which has aliases from dividasMap
  const devedor = devedores.find(d => String(d.id) === String(divida.devedor_id));
  if (!devedor) return null;
  const pagamentosDoDevedor = allPagamentos.filter(p => String(p.devedor_id) === String(divida.devedor_id));
  return { devedor, pagamentos: pagamentosDoDevedor };
}

// Then:
const { devedor, pagamentos } = buildDevedorObjParaSaldo(divida, devedores, allPagamentos);
const saldo = calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje);
```

**Why devedores[i].dividas has aliases:** `carregarTudo()` builds `dividasMap` at line 8436 adding
`indexador: div.indice_correcao`, `juros_am: div.juros_am_percentual`, `multa_pct: div.multa_percentual`,
`honorarios_pct: div.honorarios_percentual`, then at line 8451 `setDevedores` embeds `dividas: dividasMap.get(...)`.

**Performance note:** With dozens of dívidas, calling `calcularSaldoDevedorAtualizado` per row on render is synchronous and fast (pure arithmetic). No memoization needed for MVP. If performance degrades with 500+ rows, add `useMemo` keyed on `[allDividas, allPagamentos, hoje]`.

### Pattern 4: Atraso Badge (AtrasoCell.jsx)

**What:** Per-dívida atraso, calculated from `divida.data_vencimento` (not oldest divida of devedor).

```javascript
// Source: App.jsx lines 4192-4198 (verified) + 02-UI-SPEC.md color palette (verified)
// AtrasoCell receives a single divida object:

function AtrasoCell({ dataVencimento }) {
  if (!dataVencimento) return <span style={{ color: "#94a3b8" }}>—</span>;
  const hoje = new Date().toISOString().slice(0, 10);
  const dias = Math.floor((new Date(hoje) - new Date(dataVencimento)) / 86400000);
  if (dias < 0) return <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Em dia</span>;
  if (dias === 0) return <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>Em dia</span>;
  if (dias <= 30) return <span style={{ background: "#fef9c3", color: "#854d0e", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{dias} dias</span>;
  if (dias <= 90) return <span style={{ background: "#ffedd5", color: "#9a3412", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{dias} dias</span>;
  if (dias <= 180) return <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{dias} dias</span>;
  return <span style={{ background: "#450a0a", color: "#fca5a5", borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{dias} dias ⚠</span>;
}
```

**Tier breakpoints from App.jsx (verified):** 0 = em dia, 1–30 = amarelo, 31–90 = laranja, 91–180 = vermelho, 180+ = crítico (dark bg).

**For filter "Atraso":** The dropdown tier values (30+/60+/90+) must filter based on `dias >= threshold`, not on the tier bucket. `60+` includes rows with `dias >= 60` which falls inside the 31–90 orange bucket.

### Pattern 5: Filter Bar Pattern (from FilaDevedor.jsx)

```javascript
// Source: FilaDevedor.jsx lines 66-68 (verified) — shared th/td/inpS constants
const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };
const inpS = { padding: "7px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };
```

FiltroDividas.jsx should define the same constants to match visual consistency. `FilaDevedor.jsx` does NOT export them — copy into the new component.

### Pattern 6: DevedoresDaDivida.jsx Integration

**Props interface (verified from source):**

```javascript
<DevedoresDaDivida
  dividaId={divida.id}       // UUID string — required
  devedores={devedores}      // full devedores[] array for AdicionarParticipanteModal search
  devedorAtualId={null}      // optional: highlights the "current" devedor row with green bg
/>
```

**What the component does internally:**
- Calls `useDevedoresDividas(dividaId)` hook which calls `listarParticipantes` on mount
- Renders each participant row with papel badge, responsabilidade label, ✕ remove button, 👑 promote button
- On remove: calls `window.confirm()` for non-PRINCIPAL rows (existing behavior)
- On add: opens `AdicionarParticipanteModal` (internal component, not exported separately)
- `AdicionarParticipanteModal` searches devedores[] for text match >= 2 chars, slices to 8 results

**For DetalheDivida.jsx (D-05 PRINCIPAL warning):** The existing component uses `window.confirm()` for remove. For the PRINCIPAL case, D-05 requires a `Modal.jsx` overlay instead. Two options:
1. Wrap DevedoresDaDivida.jsx — intercept the remove action at the DetalheDivida level via a prop callback
2. Modify DevedoresDaDivida.jsx to accept an `onRemovePrincipal` callback prop

**Recommended approach:** Option 2 — add `onRemovePrincipal?: async (participante) => boolean` prop to DevedoresDaDivida.jsx. If prop is provided and participant is PRINCIPAL with no other PRINCIPAL, call the prop instead of `window.confirm`. This keeps the existing behavior for the aba Dívidas inside Pessoa (where prop is not passed).

### Pattern 7: Art523Option.jsx Read-Only Display

Art523Option.jsx currently only renders as an interactive radio selector. For the Detalhe card, it should be read-only. Two options:
1. Pass `onChange={() => {}}` (no-op) and rely on visual read-only appearance
2. Add a `readOnly` prop

**Recommended approach:** Pass `onChange={() => {}}` with a wrapper `div` that has `pointerEvents: "none"` and `opacity: 0.85`. No component modification needed for MVP.

### Pattern 8: PRINCIPAL Removal Warning Modal

```javascript
// Source: Modal.jsx import pattern in FilaDevedor.jsx line 3 (verified)
// D-05 LOCKED copy:
{showPrincipalWarning && (
  <Modal onClose={() => setShowPrincipalWarning(false)}>
    <div style={{ background: "#fef9c3", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
      <p style={{ fontSize: 13, color: "#92400e", fontWeight: 700, margin: 0 }}>
        Remover devedor principal
      </p>
      <p style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
        Você está removendo o devedor principal. Esta dívida ficará sem responsável principal. Confirmar?
      </p>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Btn danger onClick={handleConfirmarRemoverPrincipal}>Confirmar remoção</Btn>
      <Btn outline onClick={() => setShowPrincipalWarning(false)}>Manter dívida</Btn>
    </div>
  </Modal>
)}
```

### Anti-Patterns to Avoid

- **Calling `dividas.js`'s `listarDividas(devedorId)` per-row in the table:** All data is in `allDividas` state already. Never make per-row Supabase calls for list rendering.
- **Using `allDividas` objects directly in `calcularSaldoDevedorAtualizado`:** `allDividas` rows do not have the required aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`). Always use `devedores[i].dividas` (from dividasMap) for calculation.
- **Creating a router:** App is router-free. Navigate between list and detail via local state (`selectedDivida`) inside `ModuloDividas.jsx`.
- **Modifying `carregarTudo()` signature:** It already takes `silencioso = false`. Call it as `carregarTudo()` or `carregarTudo(true)` after saves.
- **Calling `window.confirm()` for PRINCIPAL removal:** D-05 requires `Modal.jsx`. The existing `window.confirm()` in DevedoresDaDivida.jsx is intentionally preserved for non-PRINCIPAL cases.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pessoas vinculadas CRUD | Custom add/remove/role UI | `DevedoresDaDivida.jsx` + `useDevedoresDividas` hook | Already handles loading states, optimistic updates, edge cases (demover PRINCIPAL anterior) |
| Saldo atualizado calculation | Custom interest math | `calcularSaldoDevedorAtualizado` from `devedorCalc.js` | Validated against TJGO; 7 UAT tests passed; Art.354 CC sequential amortization correct |
| Art.523 display | Custom radio UI | `Art523Option.jsx` with no-op onChange | Component already styled and handles all 3 states |
| Confirmação modal | `window.confirm()` or custom dialog | `Modal.jsx` from `components/ui/` | Consistent with app design system; used in FilaDevedor.jsx |
| BRL formatting | `toFixed(2)` | `fmt()` from `utils/formatters.js` | `Intl.NumberFormat pt-BR` with currency symbol |
| Date formatting | Manual string split | `fmtDate()` from `utils/formatters.js` | Handles null (`"—"`), timezone-safe (`T12:00:00`) |

**Key insight:** The 5 components/utilities listed above were built specifically for reuse. The entire purpose of Phase 1 was to create `allDividas` state and `dividasMap` so that Phase 2 could read dívidas without re-fetching. Use what's there.

---

## Common Pitfalls

### Pitfall 1: allDividas vs dividasMap — Alias Mismatch

**What goes wrong:** Table cells call `calcularSaldoDevedorAtualizado` with raw `allDividas` objects. The motor reads `div.indexador` (alias) but raw rows have `div.indice_correcao` (DB column). Result: all saldos show as 0 or incorrect.

**Why it happens:** `setAllDividas(Array.isArray(divs) ? divs : [])` at line 8432 stores raw DB rows. The alias mapping only happens in `dividasMap` then embedded into `devedores[i].dividas` at line 8452–8466.

**How to avoid:** For saldo calculation, always build `devedorObj` from `devedores.find(d => d.id == divida.devedor_id)`. That devedor has `.dividas` already aliased. Never pass a single raw `allDividas` element to the motor.

**Warning signs:** Saldo column always shows "R$0,00" or the same as valor_total (no encargos applied).

### Pitfall 2: art523_opcao CHECK constraint mismatch

**What goes wrong:** New code creates or saves an `art523_opcao` value of `"apenas_multa"` but the DB CHECK constraint only allows `('nao_aplicar','so_multa','multa_honorarios')`.

**Why it happens:** Art523Option.jsx uses `'apenas_multa'` as the intermediate option value (line 12), but the DB migration (002_dividas_tabela.sql line 31) uses `'so_multa'`. The two are inconsistent.

**How to avoid:** This phase is read-only for Art.523 data — DetalheDivida.jsx only displays the existing value, does not save. Confirm the mapping: DB `so_multa` displays as Art523Option `apenas_multa`. When building the read-only display, map `divida.art523_opcao === 'so_multa'` → pass `value="apenas_multa"` to Art523Option. OR just display as text. Do NOT write new `art523_opcao` values from this phase.

**Warning signs:** Supabase returns 400 error on any dívida save with Art.523 option.

### Pitfall 3: Saldo "desta dívida" vs Saldo do Devedor

**What goes wrong:** DetalheDivida.jsx shows a "saldo desta dívida" that doesn't match user expectations — it includes amortization of other older dívidas of the same devedor.

**Why it happens:** D-02 LOCKED: the motor is sequential. If the devedor has two dívidas (A created Jan 2024, B created Jun 2024) and made a partial payment, the motor amortizes A first. If A is fully paid, saldo shows 0 for A and full balance for B. This is correct (Art. 354 CC).

**How to avoid:** In the Detalhe screen's card financeiro, label the saldo as "Saldo Atualizado" (not "Saldo desta dívida"). Add a small note: "(amortização sequencial conforme Art. 354 CC)". The user decided to accept this (D-02 LOCKED).

**Warning signs:** User confusion; not a code bug.

### Pitfall 4: DevedoresDaDivida.jsx already has window.confirm for PRINCIPAL

**What goes wrong:** Developer assumes `DevedoresDaDivida.jsx` blocks all removes. In fact, it only uses `window.confirm()` for non-current-devedor rows, and the condition `{!isAtual && <button onClick>✕</button>}` hides the remove button for the "current devedor" (`devedorAtualId` prop).

**Why it happens:** In the original context (aba Dívidas inside Pessoa), `devedorAtualId` is the pessoa being viewed, so the current person's remove button is hidden. In DetalheDivida.jsx, `devedorAtualId` is not meaningful in the same way.

**How to avoid:** Pass `devedorAtualId={null}` in DetalheDivida.jsx so all ✕ buttons are visible. Add `onRemovePrincipal` callback prop to intercept the PRINCIPAL case with Modal.jsx as described in Pattern 6.

**Warning signs:** Remove button missing for some participants in the Detalhe screen.

### Pitfall 5: `allDividas` has no credor name — join required

**What goes wrong:** `allDividas[i].credor_id` is a number but there is no `credor_nome` in the row. Table column "Credor" renders nothing or raw ID.

**Why it happens:** `dividas` table has `credor_id BIGINT REFERENCES credores(id)` but no name column. The name lives in `credores[]` state.

**How to avoid:** In TabelaDividas.jsx, receive `credores` prop and do `credores.find(c => String(c.id) === String(divida.credor_id))?.nome`. Per 02-UI-SPEC.md: null credor displays as `"— sem credor"` in italic `{ color: "#94a3b8", fontStyle: "italic" }`.

---

## Component Contracts (Verified)

### DevedoresDaDivida.jsx

```javascript
// Source: components/DevedoresDaDivida.jsx line 20 (verified)
export default function DevedoresDaDivida({ dividaId, devedores = [], devedorAtualId })
```

- `dividaId`: UUID string — if falsy, returns null (line 24)
- `devedores`: full array for AdicionarParticipanteModal search (minimum 2 chars filter, slices to 8)
- `devedorAtualId`: optional, highlights with green bg and HIDES the ✕ remove button

### useDevedoresDividas hook

```javascript
// Source: services/useDevedoresDividas.js (verified)
const { participantes, loading, error, reload, adicionar, trocarPapel, remover } = useDevedoresDividas(dividaId)
```

- `adicionar({ devedorId, dividaId, papel, responsabilidade, observacao })` — calls `adicionarParticipante` then reloads
- `trocarPapel(rowId, novoPapel, dividaId)` — calls `alterarPapel` then reloads
- `remover(rowId)` — calls `removerParticipante` then reloads

### Art523Option.jsx

```javascript
// Source: components/Art523Option.jsx line 9 (verified)
export default function Art523Option({ value = "nao_aplicar", onChange })
```

For read-only: `<Art523Option value={divida.art523_opcao_display} onChange={() => {}} />`

Note the `'so_multa'` → `'apenas_multa'` mapping (DB vs component vocabulary).

### devedoresDividas.js — adicionarParticipante auto-demote behavior

```javascript
// Source: services/devedoresDividas.js line 21-32 (verified)
// When papel === "PRINCIPAL", automatically calls demoverPrincipalAtual(dividaId)
// which PATCHes all existing PRINCIPAL rows for that divida to COOBRIGADO.
// DB has UNIQUE INDEX on (divida_id) WHERE papel = 'PRINCIPAL' to enforce 1 principal.
```

### listarParticipantes join shape

```javascript
// Source: services/devedoresDividas.js line 5-9 (verified)
// Returns: { id, devedor_id, divida_id, papel, responsabilidade, observacao, created_at,
//            devedor: { id, nome, cpf_cnpj, telefone, email } }
```

---

## Data Shape Reference

### allDividas row (raw from DB, no aliases)

```javascript
// Source: 002_dividas_tabela.sql schema (verified)
{
  id: "uuid",
  devedor_id: 123,          // BIGINT — FK to devedores
  credor_id: 45,            // BIGINT FK or null
  tipo_titulo: "string",
  valor_total: 10000.00,    // NUMERIC — motor reads div.valor_total (line 75 devedorCalc.js)
  data_vencimento: "2023-01-15",
  data_origem: "2023-01-01",
  data_inicio_atualizacao: "2023-01-15",
  indice_correcao: "igpm",  // DB name — motor needs alias "indexador"
  juros_tipo: "fixo_1",
  juros_am_percentual: 1.0, // DB name — motor needs alias "juros_am"
  multa_percentual: 10.0,   // DB name — motor needs alias "multa_pct"
  honorarios_percentual: 10.0, // DB name — motor needs alias "honorarios_pct"
  art523_opcao: "nao_aplicar", // CHECK: 'nao_aplicar'|'so_multa'|'multa_honorarios'
  status: "em cobrança",
  observacoes: "string",
  _so_custas: false,
  parcelas: [],
  custas: [],
  created_at: "ISO timestamp",
  updated_at: "ISO timestamp"
}
```

### devedores[i].dividas[j] (alias-enriched by dividasMap)

```javascript
// Source: App.jsx carregarTudo() lines 8439-8448 (verified)
{
  ...rawDivida,
  parcelas: [],     // parsed from JSONB
  custas: [],       // parsed from JSONB
  descricao: div.observacoes,     // alias
  indexador: div.indice_correcao, // CRITICAL ALIAS for motor
  juros_am: div.juros_am_percentual, // CRITICAL ALIAS
  multa_pct: div.multa_percentual,   // CRITICAL ALIAS
  honorarios_pct: div.honorarios_percentual, // CRITICAL ALIAS
}
```

### calcularDetalheEncargos return shape

```javascript
// Source: utils/devedorCalc.js lines 172-onward (verified)
{
  valorOriginal: number,
  multa: number,
  juros: number,
  correcao: number,
  honorarios: number,
  custas: number,
  totalEncargos: number,
  totalPago: number,       // sum of allPagamentos for this devedor
  saldoAtualizado: number, // same as calcularSaldoDevedorAtualizado result
  diasEmAtraso: number,
  detalhePorDivida: Array
}
```

Use `calcularDetalheEncargos` in DetalheDivida.jsx to populate the 3 card financeiro values:
- Valor Original: `result.valorOriginal`
- Saldo Atualizado: `result.saldoAtualizado`
- Total Pago: `result.totalPago`

---

## Runtime State Inventory

Not applicable — this phase is purely additive. No renames, refactors, migrations, or data structure changes. No stored keys, service configs, OS registrations, or build artifacts are affected.

Nothing found in any category — verified by phase scope (additive only).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js / npm | `npm run build` | ✓ | inferred from package.json | — |
| vitest | `test:regressao` prebuild | ✓ | 4.1.4 (package.json) | — |
| Supabase (remote) | devedoresDividas.js service calls | ✓ | cloud service | — |

No missing dependencies. All runtime dependencies are already available and used by Phase 1.

---

## Validation Architecture

> `workflow.nyquist_validation: true` in `.planning/config.json` — section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | vite.config.js (inferred — no vitest.config.js found) |
| Quick run command | `npm run test:regressao` |
| Full suite command | `npm test` |
| Prebuild gate | `npm run build` runs `test:regressao` automatically |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Alias-correct saldo calc (CR-01 guard) | unit | `npm run test:regressao` | ✅ calculos.test.js |
| REQ-02 | `calcularSaldoDevedorAtualizado` with devedor+pagamentos | unit | `npm run test:regressao` | ✅ calculos.test.js |
| REQ-03 | Sidebar "Dívidas" item appears and badge shows count | manual/smoke | manual in browser | ❌ no automated test |
| REQ-04 | Table renders all dívidas with correct columns | manual/smoke | manual in browser | ❌ no automated test |
| REQ-05 | 4 filters compose AND logic correctly | manual/smoke | manual in browser | ❌ no automated test |
| REQ-06 | Detalhe card financeiro shows correct saldo | manual/smoke | manual in browser | ❌ no automated test |
| REQ-07 | Add participant via dropdown search succeeds | manual/integration | manual in browser | ❌ no automated test |
| REQ-08 | Remove PRINCIPAL shows Modal.jsx warning (not window.confirm) | manual/smoke | manual in browser | ❌ no automated test |
| REQ-09 | Aba Dívidas inside Pessoa still works after module added | manual/regression | manual in browser | ❌ no automated test |
| REQ-10 | `npm run build` passes (test:regressao prebuild) | build gate | `npm run build` | ✅ prebuild hook |

**Existing test coverage for this phase:**
The `calculos.test.js` suite (TJGO regression) covers REQ-01 and REQ-02 — the most critical financial correctness tests. All new UI behavior is manual-only.

### Sampling Rate

- **Per task commit:** `npm run test:regressao` (< 5 seconds, pure unit)
- **Per wave merge:** `npm run test:regressao` + manual browser smoke
- **Phase gate:** `npm run build` (includes test:regressao prebuild) green before `/gsd-verify-work`

### Wave 0 Gaps

No new test files required for this phase. The existing `calculos.test.js` is sufficient for the financial calculation guard. New UI components are vanilla React with no complex business logic that warrants new unit tests — they are thin wrappers over verified utilities.

If TDD mode were enabled, the planner could add tests for:
- `buildDevedorObjParaSaldo` helper (pure function)
- Filter composition logic in FiltroDividas
- Atraso tier calculation in AtrasoCell

For MVP, these are tested manually.

---

## Security Domain

> `security_enforcement` not explicitly set to `false` in config — section included.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Auth handled by existing `signIn/signOut` layer; no new auth surfaces |
| V3 Session Management | no | No new session surfaces |
| V4 Access Control | partial | RLS `allow_all_dividas` + `allow_all_devedores_dividas` policies in DB; no user-scoped filtering in this app (single-tenant system) |
| V5 Input Validation | yes | Devedor busca input: no DB write from free text; credor/status filters use dropdown values only |
| V6 Cryptography | no | No new cryptographic operations |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| XSS via devedor name in table | Tampering | React auto-escapes JSX text content — no `dangerouslySetInnerHTML` in new components |
| UUID injection in `dividaId` prop | Tampering | `listarParticipantes` uses `encodeURIComponent(dividaId)` (verified line 6 of devedoresDividas.js) |
| Concurrent principal demote race | Tampering | `demoverPrincipalAtual` in service is sequential (not transactional) — acceptable for single-user system |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSONB `devedores.dividas` | Flat `dividas` table with UUID PK | Phase 1 (2026-04-21) | Enables this phase — all dívidas queryable globally |
| TEXT `divida_id` in junction table | UUID FK `divida_id REFERENCES dividas(id)` | Phase 1 (2026-04-21) | `devedoresDividas.js` uses proper UUIDs |
| Manual alias mapping at call sites | `dividasMap` in `carregarTudo()` | Phase 1 CR-01 fix (commit 95b3aee) | All devedores[i].dividas objects have aliases pre-applied |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `Modal.jsx` accepts `onClose` prop and renders children | Pattern 8 | Component interface differs — planner must verify Modal.jsx signature before writing DetalheDivida |
| A2 | `Btn.jsx` accepts `danger` and `outline` props as variant selectors | Pattern 8 | Btn may use different prop names for variants — verify Btn.jsx before using |

These two components were not read in this research session. The planner should verify their prop interfaces before writing the implementation tasks.

---

## Open Questions

1. **art523_opcao vocabulary mismatch**
   - What we know: Art523Option.jsx uses `'apenas_multa'` (line 12). DB CHECK allows `'so_multa'`. Migration maps DB → component display.
   - What's unclear: Is there any code that currently writes `'apenas_multa'` to the DB, and if so, does it fail silently?
   - Recommendation: Phase 2 is read-only for Art.523. Map `divida.art523_opcao === 'so_multa'` → `'apenas_multa'` when passing to `Art523Option` for display. Add a comment noting the mismatch.

2. **Edit Dívida integration path**
   - What we know: D-04 says "Botão Editar Dívida reutiliza o form atual" from aba Dívidas em Pessoa.
   - What's unclear: The form is not a standalone component — it's inline JSX inside the Devedores component in App.jsx. No simple import is possible.
   - Recommendation: Navigate with `setTab("devedores")` + dispatch `window.dispatchEvent(new CustomEvent("mr_abrir_devedor", { detail: devedor.id }))` (pattern used at App.jsx line 8556). The planner should confirm this path opens the correct devedor and then further opens the edit divida form, or consider a simplified modal for Phase 2.

---

## Sources

### Primary (HIGH confidence)
- `src/mr-3/mr-cobrancas/src/App.jsx` — NAV array, carregarTudo(), renderPage, allDividas state, dividasMap construction, calcDiasAtraso, I icons object, global styles (verified by read)
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — props interface, AdicionarParticipanteModal (verified by read)
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — all 6 exports, demoverPrincipalAtual logic, listarParticipantes join shape (verified by read)
- `src/mr-3/mr-cobrancas/src/services/useDevedoresDividas.js` — hook interface (verified by read)
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — calcularSaldoDevedorAtualizado signature, calcularDetalheEncargos return shape (verified by read)
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — 5 exports (verified by read)
- `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql` — DB schema, CHECK constraint on art523_opcao (verified by read)
- `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — th/td/inpS constants, fmtBRL/fmtData helpers, filter pattern (verified by read)
- `src/mr-3/mr-cobrancas/src/components/Art523Option.jsx` — props, option values (verified by read)
- `src/mr-3/mr-cobrancas/src/utils/formatters.js` — fmt, fmtDate implementations (verified by read)
- `src/mr-3/mr-cobrancas/package.json` — scripts, test runner, prebuild hook (verified by read)
- `.planning/phases/02-modulo-dividas-sidebar/02-CONTEXT.md` — all locked decisions (verified by read)
- `.planning/phases/02-modulo-dividas-sidebar/02-UI-SPEC.md` — design system, color palette, spacing, copywriting contract (verified by read)

### Tertiary (LOW confidence — assumed)
- `components/ui/Modal.jsx` — assumed `onClose` prop and children render (not read)
- `components/ui/Btn.jsx` — assumed `danger`/`outline` variant props (not read)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified from package.json and source code
- Architecture: HIGH — all integration points verified from App.jsx source
- Pitfalls: HIGH — alias mismatch and window.confirm issues verified directly from source
- Art523 vocabulary mismatch: MEDIUM — inconsistency identified but runtime impact unclear

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stable codebase; no moving dependencies)
