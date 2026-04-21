---
phase: 04-pagamentos-por-divida
verified: 2026-04-21T17:30:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 7/7
  gaps_closed:
    - "useEffect de PagamentosDivida chama recalcularESincronizar após listarPagamentos no mount"
    - "Saldo Atualizado em DetalheDivida reflete pagamentos_divida ao abrir a tela sem mutação prévia"
    - "saldo_quitado no banco atualiza automaticamente ao abrir tela de dívida com pagamentos suficientes"
    - "Total Pago em DetalheDivida exibe soma de pagamentos_divida da dívida (não pagamentos_parciais)"
    - "devedorCalc.js não foi modificado"
    - "pagamentos_parciais não foi alterado"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Registrar pagamento e verificar que aparece imediatamente na lista cronológica"
    expected: "Após preencher data + valor e clicar 'Salvar Pagamento', a linha aparece na tabela acima com data formatada DD/MM/AAAA e valor em BRL"
    why_human: "Requer banco Supabase com tabela pagamentos_divida criada — migrations ainda precisam ser executadas manualmente no SQL Editor"
  - test: "Editar um pagamento via modo inline e verificar que o saldo Atualizado muda"
    expected: "Clicar Editar numa linha transforma as células em inputs; clicar OK persiste a alteração e o card Saldo Atualizado reflete o recálculo Art.354 sem reload de página"
    why_human: "Comportamento em tempo real via onSaldoChange — só testável com banco ativo"
  - test: "Badge 'Saldo quitado' em DetalheDivida quando saldo ≤ 0"
    expected: "Badge verde (#dcfce7 / #065f46) com texto 'Saldo quitado' aparece abaixo do valor no card Saldo Atualizado quando o saldo calculado zera ou fica negativo"
    why_human: "Condição saldoAtual <= 0 depende de dados reais de pagamentos contra o valor + encargos da dívida"
  - test: "Badge 'Saldo quitado' em TabelaDividas lendo dividas.saldo_quitado"
    expected: "Na listagem global, a coluna Atraso exibe badge 'Saldo quitado' para dívidas já quitadas e AtrasoCell para as demais"
    why_human: "Requer que atualizarSaldoQuitado tenha persistido saldo_quitado=true no banco e que carregarTudo() retorne a coluna — precisa do banco ativo e migrations executadas"
  - test: "Verificar que ao abrir DetalheDivida de dívida com pagamentos, Saldo Atualizado e Total Pago mostram valores corretos SEM registrar novo pagamento"
    expected: "Saldo Atualizado reflete cálculo Art. 354 sobre pagamentos_divida já existentes; Total Pago mostra soma desses pagamentos (não R$ 0,00)"
    why_human: "Confirma Fix A + Fix B em conjunto com dados reais — o mount de PagamentosDivida deve propagar ambos os valores antes do usuário realizar qualquer mutação"
---

# Phase 4: Pagamentos por Dívida Verification Report

**Phase Goal:** Fechar ciclo financeiro da dívida individual — registrar, consultar e corrigir pagamentos com Art. 354 CC
**Verified:** 2026-04-21T17:30:00Z
**Status:** human_needed
**Re-verification:** Yes — gap closure plan 04-04 verified

---

## Gap Closure Summary (04-04)

Both code-level bugs identified in CR-03 are confirmed fixed in the actual source files.

**Fix A (PagamentosDivida.jsx):** The `useEffect` `.then` callback is now `async` and calls `await recalcularESincronizar(lista)` immediately after `setPagamentos(lista)`. The `.catch` branch also emits `onTotalPagoChange(0)` so DetalheDivida never gets stuck showing "—" on fetch error. This matches the WR-01 and WR-03 code review fixes applied in commit `3c6e9f7`.

**Fix B (DetalheDivida.jsx):** State `totalPagoDivida` (initialized to `null`) is present on line 81. The `<PagamentosDivida>` usage on lines 202-207 passes `onTotalPagoChange={(total) => setTotalPagoDivida(total)}`. The Total Pago card on line 167 renders `totalPagoDivida !== null ? fmtBRL(totalPagoDivida) : "—"`, not `fmtBRL(totalPago)`. The `calcularTotalPagoPorDivida` import and `totalPago` variable are preserved (lines 7 and 86) as required.

**Constraints honoured:** Only `PagamentosDivida.jsx` and `DetalheDivida.jsx` were touched in commits `1c3d5ff` and `3c6e9f7`. `devedorCalc.js` has no commits in the phase-4 range. `pagamentos_parciais` and all related services are untouched.

---

## Goal Achievement

### Observable Truths — Original Phase (7/7)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Advogado registra pagamento (data+valor+obs) e aparece na lista cronológica | VERIFIED | `handleCriar` em PagamentosDivida.jsx: chama `criarPagamento`, reabre `listarPagamentos`, atualiza `pagamentos` state. Form sempre visível. |
| 2 | Histórico completo em ordem cronológica com data, valor e observação | VERIFIED | `listarPagamentos` ordena por `data_pagamento.asc`. Tabela renderiza colunas Data (`fmtData`), Valor (`fmtBRL`), Observação. |
| 3 | Editar ou excluir pagamento com confirmação, saldo recalculado na mesma tela | VERIFIED | `handleSalvarEdit` + `handleExcluir`. Excluir usa `window.confirm`. Ambos chamam `recalcularESincronizar` + `onSaldoChange`. |
| 4 | Saldo reflete imputação Art. 354 CC sobre todos os pagamentos da dívida | VERIFIED | `calcularSaldoPorDividaIndividual` constrói `devedorFicticio = { dividas: [divida] }` e chama `calcularSaldosPorDivida` de devedorCalc.js. |
| 5 | Badge "Saldo quitado" em DetalheDivida quando saldo ≤ 0 | VERIFIED | DetalheDivida.jsx linha 143: `saldoAtual !== null && saldoAtual <= 0` condicional com `<span role="status">Saldo quitado</span>`. |
| 6 | `dividas.saldo_quitado` persistido após cada operação de pagamento | VERIFIED | `recalcularESincronizar` chama `atualizarSaldoQuitado(divida.id, quitado)` em criar, editar e excluir. |
| 7 | Badge "Saldo quitado" em TabelaDividas lendo `dividas.saldo_quitado` | VERIFIED | TabelaDividas.jsx: `d.saldo_quitado === true` condicional na coluna Atraso. |

**Score:** 7/7

### Gap Closure Must-Haves (04-04)

| # | Must-Have | Status | Evidence |
|---|-----------|--------|----------|
| 1 | useEffect de PagamentosDivida chama recalcularESincronizar após listarPagamentos no mount | VERIFIED | Lines 52-65: `.then(async data => { ... setPagamentos(lista); await recalcularESincronizar(lista); })` |
| 2 | Saldo Atualizado em DetalheDivida reflete pagamentos_divida ao abrir a tela sem mutação prévia | VERIFIED | Fix A propagates `onSaldoChange(novoSaldo)` on mount; DetalheDivida line 84 uses `saldoDividaLocal` when non-null |
| 3 | saldo_quitado no banco atualiza automaticamente ao abrir tela de dívida com pagamentos suficientes | VERIFIED (code) | `atualizarSaldoQuitado` called inside `recalcularESincronizar` which now runs on mount; live-DB confirmation remains human test |
| 4 | Total Pago em DetalheDivida exibe soma de pagamentos_divida da dívida (não pagamentos_parciais) | VERIFIED | Line 167: `totalPagoDivida !== null ? fmtBRL(totalPagoDivida) : "—"`. Sum computed from `listaPagamentos` (pagamentos_divida rows) in `recalcularESincronizar` lines 77-80. |
| 5 | devedorCalc.js não foi modificado | VERIFIED | Commits `1c3d5ff` and `3c6e9f7` only touched `PagamentosDivida.jsx` and `DetalheDivida.jsx`. No phase-4 commits appear in `devedorCalc.js` git log. |
| 6 | pagamentos_parciais não foi alterado | VERIFIED | `calcularTotalPagoPorDivida` import preserved (line 7), `totalPago` variable still computed (line 86), no services or tables modified. |

**All 6 gap closure must-haves: VERIFIED**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mr-3/mr-cobrancas/src/services/pagamentos.js` | CRUD + calcularSaldoPorDividaIndividual + migrations | VERIFIED | 5 exports, migrations documented at top. |
| `src/mr-3/mr-cobrancas/src/services/dividas.js` | atualizarSaldoQuitado adicionado | VERIFIED | 6 exports total; PATCH via `sb()`. |
| `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx` | Componente autônomo com CRUD UI + recalcularESincronizar on mount + onTotalPagoChange | VERIFIED | All handlers intact; useEffect calls recalcularESincronizar on mount; onTotalPagoChange prop wired. |
| `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` | Monta PagamentosDivida + badge + onSaldoChange + totalPagoDivida state | VERIFIED | `totalPagoDivida` state line 81; `onTotalPagoChange` prop line 206; card renders from totalPagoDivida line 167. |
| `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` | Badge Saldo quitado na coluna Atraso | VERIFIED | `d.saldo_quitado === true` condicional. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pagamentos.js:calcularSaldoPorDividaIndividual` | `devedorCalc.js:calcularSaldosPorDivida` | import + devedorFicticio | WIRED | Unchanged from initial verification. |
| `PagamentosDivida.useEffect` | `recalcularESincronizar` | `await recalcularESincronizar(lista)` in .then() | WIRED | PagamentosDivida.jsx lines 58-59. NEW in 04-04. |
| `recalcularESincronizar` | `onTotalPagoChange` | reduce sum + callback | WIRED | PagamentosDivida.jsx lines 77-80. NEW in 04-04. |
| `PagamentosDivida.onTotalPagoChange` | `DetalheDivida.totalPagoDivida` | prop `(total) => setTotalPagoDivida(total)` | WIRED | DetalheDivida.jsx line 206. NEW in 04-04. |
| `DetalheDivida.totalPagoDivida` | Total Pago card JSX | `totalPagoDivida !== null ? fmtBRL(totalPagoDivida) : "—"` | WIRED | DetalheDivida.jsx line 167. NEW in 04-04. |
| `PagamentosDivida.onSaldoChange` | `DetalheDivida.saldoDividaLocal` | prop callback `(novoSaldo) => setSaldoDividaLocal(novoSaldo)` | WIRED | DetalheDivida.jsx line 205. |
| `TabelaDividas` | `dividas[i].saldo_quitado` | `d.saldo_quitado === true` | WIRED | Unchanged from initial verification. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PagamentosDivida.jsx` | `pagamentos[]` | `listarPagamentos(divida.id)` → Supabase query | Yes | FLOWING |
| `PagamentosDivida.jsx` | `totalPagoDivida` (emitted) | reduce over `listaPagamentos` rows | Yes — derived from real fetch | FLOWING |
| `DetalheDivida.jsx` | `saldoAtual` | `saldoDividaLocal` from onSaldoChange (mount) or `saldoDivida` from pagamentos_parciais | Yes — two valid paths | FLOWING |
| `DetalheDivida.jsx` | `totalPagoDivida` | `onTotalPagoChange` from PagamentosDivida mount | Yes — derived from pagamentos_divida rows | FLOWING |
| `TabelaDividas.jsx` | `d.saldo_quitado` | `dividas[]` prop from `carregarTudo()` in App.jsx | Yes — reads persisted DB column | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — the app requires a running Supabase instance and globals injected by App.jsx (`dbGet`/`dbInsert`/`dbUpdate`/`dbDelete`). No runnable entry point exists without an active server and configured database.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAG-01 | 04-01, 04-02 | Lançar pagamento (data + valor + obs) na tela da dívida | SATISFIED | `handleCriar` in PagamentosDivida.jsx. |
| PAG-02 | 04-01, 04-02 | Visualizar histórico cronológico de pagamentos | SATISFIED | Table with `data_pagamento.asc` order. |
| PAG-03 | 04-02 | Editar pagamento lançado com confirmação | SATISFIED | Inline edit via `editandoId` state. |
| PAG-04 | 04-02 | Excluir pagamento com confirmação | SATISFIED | `window.confirm` in `handleExcluir`. |
| PAG-05 | 04-01, 04-02, 04-04 | Saldo recalculado via Art. 354 CC após cada pagamento AND on mount | SATISFIED | `recalcularESincronizar` called 4 places: mount, criar, salvarEdit, excluir. |
| PAG-06 | 04-03 | Badge "Saldo quitado" em DetalheDivida quando saldo ≤ 0 | SATISFIED | `saldoAtual !== null && saldoAtual <= 0` condicional with `role="status"` span. |
| PAG-07 | 04-01, 04-02, 04-04 | `dividas.saldo_quitado` atualizado após cada operação AND on mount | SATISFIED | `atualizarSaldoQuitado` called via `recalcularESincronizar` on mount + 3 mutations. |
| PAG-08 | 04-03 | Badge "Saldo quitado" em TabelaDividas lendo `dividas.saldo_quitado` | SATISFIED | `d.saldo_quitado === true` in TabelaDividas.jsx. |

All 8 requirements satisfied.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| `pagamentos.js` | `dbGet/dbInsert/dbUpdate/dbDelete` used without import | Info | Intentional — App.jsx runtime globals per project pattern. Not a stub. |
| `PagamentosDivida.jsx` | `<Btn>` receives `style` prop not forwarded by Btn.jsx | Info | Cosmetic only — inline edit OK/Cancel button colors may be silently dropped. Functionality unaffected. |

No blocking anti-patterns. No TODOs, FIXMEs, placeholder returns, or hardcoded empty data flowing to rendering.

---

### Human Verification Required

The automated checks confirm all code for the gap closure is correctly implemented. The following live-DB tests remain outstanding and were not changed by the gap closure plan.

**Pre-condition:** Execute both SQL migrations in Supabase SQL Editor (documented in the comment block at the top of `src/mr-3/mr-cobrancas/src/services/pagamentos.js`):
- Migration 1: `CREATE TABLE public.pagamentos_divida (...)`
- Migration 2: `ALTER TABLE public.dividas ADD COLUMN IF NOT EXISTS saldo_quitado BOOLEAN DEFAULT FALSE`

#### PAG-01. Registrar Pagamento

**Test:** Open a dívida detail view. Fill in Data (any past date), Valor (any positive number), Observação (optional). Click "Salvar Pagamento".
**Expected:** The new payment appears immediately in the "Histórico de Pagamentos" table above (chronologically sorted), and the "Saldo Atualizado" card updates to reflect the new balance calculated via Art. 354 CC.
**Why human:** Requires live Supabase with `pagamentos_divida` table created and runtime globals injected by App.jsx.

#### PAG-02. Edição Inline

**Test:** Click "Editar" on any payment row. Change the valor. Click "OK".
**Expected:** The row reverts from inputs to display mode showing the new values. "Saldo Atualizado" updates. Toast "Pagamento atualizado" appears.
**Why human:** Requires live database and real-time state propagation via onSaldoChange.

#### PAG-03. Exclusão com Confirmação

**Test:** Click "Excluir" on any payment row. A browser confirm dialog should appear. Click OK.
**Expected:** The row is removed from the table. The "Saldo Atualizado" increases back (or badge disappears if it was showing). Toast "Pagamento excluído" appears.
**Why human:** `window.confirm` behavior and state update requires a running browser context.

#### PAG-04. Badge "Saldo quitado" em DetalheDivida

**Test:** Register enough payments so the calculated balance reaches ≤ 0. Observe the "Saldo Atualizado" card.
**Expected:** Green badge "Saldo quitado" appears below the balance amount in the financial card.
**Why human:** Requires real numeric data and Art.354 calculation to produce saldo ≤ 0.

#### PAG-05. Badge "Saldo quitado" em TabelaDividas + saldo_quitado sincronizado no mount (CR-03 validation)

**Test:** Open a dívida that already has payments in `pagamentos_divida` WITHOUT registering a new payment. Observe "Saldo Atualizado" and "Total Pago" immediately on load. Then navigate back to TabelaDividas.
**Expected:** "Saldo Atualizado" shows the Art. 354 balance; "Total Pago" shows the sum of pagamentos_divida (not R$ 0,00). After the mount write, `dividas.saldo_quitado` is updated in the DB. TabelaDividas badge reflects the updated value.
**Why human:** End-to-end validation of Fix A + Fix B together with real data; confirms `atualizarSaldoQuitado` write on mount succeeds against the live database.

---

### Gaps Summary

No gaps. All 6 code-level must-haves from gap closure plan 04-04 are verified as correctly implemented in the actual source files. Both bugs (Fix A: no recalcularESincronizar on mount; Fix B: Total Pago reading pagamentos_parciais instead of pagamentos_divida) are confirmed resolved.

The `human_needed` status is unchanged because 5 behaviors require a live Supabase instance with migrations executed. The code is ready; these are integration-level validations only.

---

_Verified: 2026-04-21T17:30:00Z_
_Verifier: Claude (gsd-verifier)_
