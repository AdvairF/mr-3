---
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
verified: 2026-04-19T00:00:00Z
status: human_needed
score: 7/8 must-haves verified
overrides_applied: 0
re_verification: null
gaps: []
human_verification:
  - test: "Confirm financial calculations are correct in production after page load"
    expected: "saldo atualizado for each devedor shows the correct corrected value (with juros, multa, honorarios applied), not zero or base-value-only — specifically for the state loaded on initial page load and after 60-second background refresh (not just after editing a divida)"
    why_human: "CR-01 (code review) found that dividasMap at carregarTudo() line 8439 pushes raw DB rows without JSONB-compat aliases (indexador, juros_am, multa_pct, honorarios_pct). devedorCalc.js reads those exact field names (lines 76-80, 189-193). If aliases are missing, calcularValorFace and calcularSaldoDevedorAtualizado silently default to indexador='nenhum' and all pct=0. The bug is masked only inside an open devedor session after salvarEdicaoDivida (which does add aliases locally). Cannot verify programmatically whether production data has non-zero juros/multa values that expose this or whether the saldo shown matches expectation."
---

# Phase 1: Refatoração Pessoas x Dívidas Verification Report

**Phase Goal:** Extrair dívidas do JSONB `devedores.dividas` para tabela própria `dividas` com UUID PK; recriar `devedores_dividas` com FK real; atualizar App.jsx para ler/escrever na nova estrutura; renomear label "Devedores" → "Pessoas" no menu.
**Verified:** 2026-04-19
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Tabela `dividas` SQL migration exists with UUID PK, all JSONB fields, double-encoding guard | VERIFIED | `002_dividas_tabela.sql` 219 lines; `valor_total`, `art523_opcao TEXT`, `json_id_legado`, all 5 missing fields, `jsonb_typeof` CASE guard, `divida_id UUID REFERENCES dividas(id)` — all present |
| 2 | `carregarTudo()` loads dividas from new table in parallel, builds dividasMap, populates devedor.dividas | VERIFIED | Line 8428: `dbGet("dividas")` in Promise.all; lines 8435-8440: dividasMap built; line 8443: `dividasMap.get(String(d.id)) \|\| []`; no `parse(d.dividas)` pattern found |
| 3 | All write surfaces use `dbInsert/dbUpdate/dbDelete("dividas", ...)` not JSONB stringify | VERIFIED | `dbInsert("dividas")` at lines 3223, 3288; `dbUpdate("dividas")` at lines 3318, 3388; `dbDelete("dividas")` at line 3332; zero matches for `dividas: JSON.stringify` |
| 4 | seedPrincipal receives UUID from DB response (not Date.now()) | VERIFIED | Line 3252: `await seedPrincipal(sel.id, novaDiv.id)` where `novaDiv` comes from `dbInsert` response |
| 5 | salvarDevedor no longer sends `dividas: JSON.stringify([])` | VERIFIED | Zero matches for `dividas: JSON.stringify` in App.jsx |
| 6 | Post-save reload fetches from dividas table | VERIFIED | Line 3412: `dbGet("dividas", \`devedor_id=eq.${sel.id}\`)` with compat alias mapping at lines 3415-3422 |
| 7 | NAV label and Dashboard KPI card show "Pessoas" | VERIFIED | `label: "Pessoas"` at lines 8517 and 8764; zero matches for `label: "Devedores"` |
| 8 | Financial calculations are correct after migration (calculos financeiros corretos) | HUMAN NEEDED | CR-01: dividasMap push at line 8439 spreads raw DB rows without compat aliases; devedorCalc.js reads `div.indexador`, `div.juros_am`, `div.multa_pct`, `div.honorarios_pct` which will be undefined on initial load — production confirmation of correct saldo values required |

**Score:** 7/8 truths verified (truth #8 requires human confirmation)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql` | Migration SQL: CREATE TABLE dividas + seed from JSONB + DROP/CREATE devedores_dividas with UUID FK | VERIFIED | 219 lines; all 15 acceptance criteria from 01-01-PLAN pass on grep verification |
| `src/mr-3/mr-cobrancas/src/services/dividas.js` | CRUD service with 5 exports for dividas table | VERIFIED (orphaned) | File exists with all 5 named async exports following devedoresDividas.js pattern; NOT imported anywhere in App.jsx — App.jsx uses dbInsert/dbUpdate/dbDelete directly. Service is dead code for write paths but structurally complete. |
| `src/mr-3/mr-cobrancas/src/App.jsx` | carregarTudo() parallel load, dividasMap, 7 write surfaces, "Pessoas" label | VERIFIED | All changes confirmed by grep |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `carregarTudo() Promise.all` | `dbGet("dividas")` | 8th slot in array | WIRED | Line 8428 |
| `dividasMap build` | `devedor.dividas property` | `dividasMap.get(String(d.id)) \|\| []` | WIRED | Line 8443 |
| `dividasMap divida objects` | `devedorCalc.js alias fields` | compat spread in dividasMap push | NOT WIRED | Line 8439 spreads `...div` with only `parcelas`/`custas` parsed — `indexador`, `juros_am`, `multa_pct`, `honorarios_pct` aliases absent. devedorCalc.js reads these at lines 76-80, 189-193, 396-400. Post-save reload at line 3415 DOES add aliases but only for the open devedor. |
| `adicionarDivida` | `seedPrincipal(devedorId, dividaUUID)` | dynamic import + UUID from Supabase response | WIRED | Lines 3250-3253 |
| `salvarEdicaoDivida dbUpdate` | `dbGet("dividas") reload` | post-save reload with alias mapping | WIRED | Lines 3411-3428 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| App.jsx — devedor.dividas in setDevedores | `dividas` from `dividasMap` | `dbGet("dividas")` in Promise.all | Yes — real Supabase table query | FLOWING |
| App.jsx — devedor.dividas calc fields | `indexador`, `juros_am`, `multa_pct`, `honorarios_pct` | dividasMap push at line 8439 | No — raw DB column names (`indice_correcao`, `juros_am_percentual`, etc.) not aliased | STATIC (alias gap) |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable server entry point to test against; App.jsx requires browser + Supabase. Build verification was confirmed green in plan 01-06 (exit code 0, 9/9 tests).

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REQ-01 | 01-01 | dividas table with UUID PK | SATISFIED | `002_dividas_tabela.sql` exists and was confirmed run in Supabase (plan 01-01 checkpoint passed) |
| REQ-02 | 01-01 | devedores_dividas uses divida_id UUID FK | SATISFIED | SQL confirmed: `divida_id UUID NOT NULL REFERENCES dividas(id)` at line 161 |
| REQ-03 | 01-03 | carregarTudo loads dividas in parallel | SATISFIED | `dbGet("dividas")` in Promise.all confirmed |
| REQ-04 | 01-03 | dividasMap compatibility layer | SATISFIED | dividasMap built and devedor.dividas populated from it |
| REQ-05 | 01-02, 01-04 | CRUD service and write surfaces | SATISFIED (with note) | 7 write surfaces use dbInsert/dbUpdate/dbDelete directly; dividas.js service exists but is not used by App.jsx |
| REQ-06 | 01-05 | Label "Pessoas" in NAV and Dashboard | SATISFIED | 2 matches for `label: "Pessoas"`, 0 for `label: "Devedores"` |
| REQ-07 | 01-06 | npm run build passes | SATISFIED | Plan 01-06 confirmed green build, 9/9 tests, exit code 0 |
| REQ-08 | 01-06 | Vercel deploy succeeds | SATISFIED | User confirmed "verified" at checkpoint |
| REQ-09 | 01-06 | 4 devedores and dividas visible and correct | PARTIAL | Visibility confirmed ("verified"). Correctness of financial calculations uncertain due to CR-01 alias gap |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| App.jsx | 8439 | `dividasMap.get(k).push({ ...div, parcelas: parseJ(...), custas: parseJ(...) })` — raw DB column names exposed without compat aliases | Warning | devedorCalc.js reads `indexador`, `juros_am`, `multa_pct`, `honorarios_pct`; these will be `undefined` on every page load and background refresh, causing all monetary correction calcs to default to "nenhum"/0. Only masked after `salvarEdicaoDivida` which does add aliases locally. |
| App.jsx | 8415 | `const [allDividas, setAllDividas] = useState([])` — state declared and set but never read | Info | Dead state; no user impact but wastes memory |
| App.jsx | 3318 | `toggleParcela` catch block still applies UI state mutation on DB failure | Warning | UI and DB can diverge if parcelas dbUpdate fails; 60-second refresh will silently revert causing confusing flip |
| App.jsx | 8462 | `carregarTudo` catch only calls `console.error`, no user toast | Warning | Silent failure on load error |
| `dividas.js` | 1-59 | Never imported in App.jsx — dead code | Warning | Service exists but all paths bypass it; future fixes to this file have no effect |

---

### Human Verification Required

#### 1. Financial Calculations Correctness (CR-01 validation)

**Test:** Open the app in production at mrcobrancas.com.br immediately after a fresh page load (not after editing a divida). For each devedor that has non-zero juros/multa/honorarios values, check the displayed "Saldo Atualizado" or equivalent calculated value.

**Expected:** The saldo atualizado should reflect monetary correction with the configured indexador, juros_am, multa_pct, and honorarios_pct — not just the base valor_total.

**Why human:** The CR-01 bug means dividasMap objects lack compat aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`). devedorCalc.js at lines 76-80 defaults these to "nenhum" and 0 when undefined. If any devedor has non-zero encargos, the displayed saldo will be wrong on every page load and every 60-second background refresh. The bug only masks itself after `salvarEdicaoDivida` (which adds aliases locally). Cannot verify programmatically which devedores have non-zero encargos in production or what the correct expected values are.

**If values look wrong:** The fix is to add compat aliases at App.jsx line 8439:
```js
dividasMap.get(k).push({
  ...div,
  parcelas:        parseJ(div.parcelas),
  custas:          parseJ(div.custas),
  descricao:       div.observacoes,
  indexador:       div.indice_correcao,
  juros_am:        div.juros_am_percentual,
  multa_pct:       div.multa_percentual,
  honorarios_pct:  div.honorarios_percentual,
});
```

---

### Gaps Summary

No blocking gaps found. All 7 roadmap acceptance criteria that can be verified programmatically are satisfied. The one open item (truth #8: financial calculations correct) requires human confirmation due to the CR-01 alias gap identified in the code review.

The CR-01 issue is a known post-execution bug: the dividasMap push in carregarTudo() exposes raw DB column names to devedorCalc.js which expects JSONB-era aliases. This causes silent calculation errors on page load. The user's "verified" checkpoint confirms data visibility and basic app function, but financial calculation accuracy specifically needs a focused check.

All other concerns (dividas.js dead code, allDividas unused state, toggleParcela optimistic-UI on failure, carregarTudo silent error) are code quality warnings, not goal blockers.

---

_Verified: 2026-04-19_
_Verifier: Claude (gsd-verifier)_
