---
phase: 03-nova-divida-com-co-devedores
plan: "02"
subsystem: dividas-form
tags: [react, controlled-form, busca-dropdown, modal, supabase, pessoas-divida]

# Dependency graph
requires:
  - phase: 03-nova-divida-com-co-devedores/03-01
    provides: DividaForm.jsx stateless controlled component + NovaDivida stub + ModuloDividas view routing
provides:
  - src/components/NovaDivida.jsx (full implementation: DividaForm + Pessoas section + Criar Pessoa modal + handleSalvar)
affects:
  - 03-03 (Plan 03 will verify end-to-end save flow via Cypress or manual walkthrough)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-line busca state via Map<_key, string> (buscas object keyed by row _key)
    - Dropdown open state tracked by single _key (dropdownAberto)
    - idsJaNaLista Set computed from pessoas state to exclude already-listed devedores
    - PRINCIPAL row first in loop for adicionarParticipante atomic save
    - onCarregarTudo() awaited before onVoltar() for D-09 badge update ordering

key-files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/components/NovaDivida.jsx

key-decisions:
  - "title attribute on Salvar button placed on a wrapping <span> because Btn.jsx does not forward arbitrary HTML props — native button title tooltip still works via the span wrapper"
  - "adicionarParticipante loop skips rows with devedor_id == null (guards against incomplete co-devedor rows)"
  - "PAPEL_META and RESP_LABELS copied verbatim from DevedoresDaDivida.jsx per plan instructions (no shared constants module yet)"

patterns-established:
  - "NovaDivida pattern: form state in parent, DividaForm as pure stateless child, pessoas as independent state array"
  - "Busca dropdown per-row: buscas[_key] + dropdownAberto===_key guards display"

requirements-completed: [D-02, D-03, D-04, D-05, D-07, D-08]

# Metrics
duration: ~20min
completed: 2026-04-20
---

# Phase 03 Plan 02: NovaDivida Full Implementation Summary

**Full NovaDivida view with DividaForm, Pessoas na Dívida section (busca dropdown, papel/responsabilidade selects, ✕ remove), "Criar Pessoa Rápida" modal via dbInsert, and atomic handleSalvar with criarDivida + adicionarParticipante loop**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-20T15:38:00Z
- **Completed:** 2026-04-20T15:42:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Replaced NovaDivida.jsx stub with full 280-line implementation
- Pessoas section: 👑 PRINCIPAL row (no remove) + COOBRIGADO rows with ✕, busca dropdown (2-char min, excludes idsJaNaLista Set)
- "Criar Pessoa Rápida" modal (Nome *, CPF opcional, Tipo PF/PJ) via dbInsert("devedores") wired back to triggering linha
- Salvar disabled until Principal with devedor_id selected; title tooltip "Adicione pelo menos um devedor Principal"
- Atomic handleSalvar: criarDivida → adicionarParticipante (Principal first) → onCarregarTudo() → onVoltar()
- Build: 9/9 regression tests pass, 0 compile errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement NovaDivida.jsx** — submodule `1f777d2` (feat)
2. **Parent repo submodule bump** — parent `88489f5` (feat)

## Files Created/Modified

- `src/mr-3/mr-cobrancas/src/components/NovaDivida.jsx` — Full implementation replacing stub: DividaForm + Pessoas section + Criar Pessoa modal + handleSalvar atomic save flow

## Decisions Made

- `title` attribute on Salvar button placed on a wrapping `<span>` because `Btn.jsx` does not destructure or forward a `title` prop to the native `<button>`. The span wrapper provides equivalent HTML tooltip behavior without modifying Btn.jsx (which is used across the app and is not in this plan's scope).
- `adicionarParticipante` loop uses `if (!p.devedor_id) continue` to guard against incomplete rows (co-devedores that were added via "+ Adicionar" button but not yet searched/selected). This is a correctness requirement, not a deviation.
- `PAPEL_META` and `RESP_LABELS` are copied from `DevedoresDaDivida.jsx` per plan spec — no shared constants module created (that would be a Rule 4 architectural change).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Guard against null devedor_id in adicionarParticipante loop**
- **Found during:** Task 1 (handleSalvar implementation)
- **Issue:** Plan's handleSalvar code iterates all `pessoas` rows including co-devedor rows the user may have added but not filled in. Calling `adicionarParticipante` with `devedorId: null` would produce a Supabase error.
- **Fix:** Added `if (!p.devedor_id) continue;` guard at the top of the forEach-equivalent loop
- **Files modified:** NovaDivida.jsx (handleSalvar)
- **Verification:** Build passes; logic is provably correct
- **Committed in:** `1f777d2` (Task 1 submodule commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 — missing null guard)
**Impact on plan:** Essential correctness fix. No scope creep.

## Issues Encountered

None — plan was well-specified. Build passed on first attempt.

## Threat Surface Scan

No new network endpoints or auth paths. Security mitigations from plan STRIDE register all satisfied:

- T-03-02-01/02: JSX renders `{pessoa.nome}`, `{d.nome}`, `{d.cpf_cnpj}` as text nodes — auto-escaped, no `dangerouslySetInnerHTML`
- T-03-02-03: `dbInsert("devedores")` via `sb()` with Bearer token from `supabase.js` — RLS applies
- T-03-02-04: `dividaId: String(novaDiv.id)` uses UUID from Supabase response, not user input
- T-03-02-05: CPF/CNPJ optional — accepted risk per RESEARCH.md
- T-03-02-06: N bounded by user-added pessoas; UI disables Salvar during save

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- NovaDivida.jsx is fully implemented and renders correctly via ModuloDividas view='nova'
- Plan 03 (end-to-end verification + integration tests) can proceed immediately
- handleSalvar is complete — Plan 03 will verify the actual Supabase round-trip

---
*Phase: 03-nova-divida-com-co-devedores*
*Completed: 2026-04-20*
