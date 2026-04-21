---
phase: 04-pagamentos-por-divida
verified: 2026-04-21T00:00:00Z
status: human_needed
score: 7/7 must-haves verified
overrides_applied: 0
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
---

# Phase 4: Pagamentos por Dívida Verification Report

**Phase Goal:** Fechar ciclo financeiro da dívida individual — registrar, consultar e corrigir pagamentos com Art. 354 CC
**Verified:** 2026-04-21T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

All 7 roadmap success criteria were verified against the actual codebase.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Advogado registra pagamento (data+valor+obs) e aparece na lista cronológica | ✓ VERIFIED | `handleCriar` em PagamentosDivida.jsx: chama `criarPagamento`, reabre `listarPagamentos`, atualiza `pagamentos` state. Form sempre visível (sem toggle). |
| 2 | Histórico completo em ordem cronológica com data, valor e observação | ✓ VERIFIED | `listarPagamentos` ordena por `data_pagamento.asc`. Tabela renderiza colunas Data (`fmtData`), Valor (`fmtBRL`), Observação. |
| 3 | Editar ou excluir pagamento com confirmação, saldo recalculado na mesma tela | ✓ VERIFIED | `handleSalvarEdit` + `handleExcluir`. Excluir usa `window.confirm("Excluir este pagamento?")`. Ambos chamam `recalcularESincronizar` + `onSaldoChange`. |
| 4 | Saldo reflete imputação Art. 354 CC sobre todos os pagamentos da dívida | ✓ VERIFIED | `calcularSaldoPorDividaIndividual` constrói `devedorFicticio = { dividas: [divida] }` e chama `calcularSaldosPorDivida` de devedorCalc.js (motor Art.354 existente). |
| 5 | Badge "Saldo quitado" em DetalheDivida quando saldo ≤ 0 | ✓ VERIFIED | DetalheDivida.jsx linha 141: `{saldoAtual !== null && saldoAtual <= 0 && <span role="status" ...>Saldo quitado</span>}` com `#dcfce7`/`#065f46`. |
| 6 | `dividas.saldo_quitado` persistido após cada operação de pagamento | ✓ VERIFIED | `recalcularESincronizar` chama `atualizarSaldoQuitado(divida.id, quitado)` em handleCriar, handleSalvarEdit e handleExcluir (3 chamadas confirmadas). `atualizarSaldoQuitado` existe em dividas.js com PATCH via `sb()`. |
| 7 | Badge "Saldo quitado" em TabelaDividas lendo `dividas.saldo_quitado` | ✓ VERIFIED | TabelaDividas.jsx linha 113: `{d.saldo_quitado === true ? <span ...>Saldo quitado</span> : <AtrasoCell ... />}`. Sem recálculo — lê coluna persistida. |

**Score:** 7/7 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/mr-3/mr-cobrancas/src/services/pagamentos.js` | CRUD + calcularSaldoPorDividaIndividual + migrations | ✓ VERIFIED | 5 exports (`listarPagamentos`, `criarPagamento`, `atualizarPagamento`, `excluirPagamento`, `calcularSaldoPorDividaIndividual`). Migrations documentadas no topo. 85 linhas. |
| `src/mr-3/mr-cobrancas/src/services/dividas.js` | atualizarSaldoQuitado adicionado | ✓ VERIFIED | 6 exports total (5 originais intactos + `atualizarSaldoQuitado`). Usa `sb()` como o restante do arquivo. Importação `{ sb }` intacta. |
| `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx` | Componente autônomo com CRUD UI | ✓ VERIFIED | `export default function PagamentosDivida`. Todos os handlers implementados (handleCriar, handleSalvarEdit, handleExcluir, recalcularESincronizar). Não importa globals dbGet/dbInsert. |
| `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` | Monta PagamentosDivida + badge + onSaldoChange | ✓ VERIFIED | Import presente. `saldoDividaLocal` state (useState null). `saldoAtual` derivado. Badge `role="status"` presente. `<PagamentosDivida divida={divida} hoje={hoje} onSaldoChange={...} />` montado. |
| `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` | Badge Saldo quitado na coluna Atraso | ✓ VERIFIED | `d.saldo_quitado === true` condicional presente. AtrasoCell intacta para dívidas não quitadas. `calcularSaldoPorDividaIndividual` ausente (correto — não recalcula). |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `pagamentos.js:calcularSaldoPorDividaIndividual` | `devedorCalc.js:calcularSaldosPorDivida` | `import { calcularSaldosPorDivida }` + devedorFicticio | ✓ WIRED | Import na linha 23 de pagamentos.js. Chamado em `calcularSaldoPorDividaIndividual` com `{ dividas: [divida] }`. |
| `PagamentosDivida` | `pagamentos.js` | import das 5 funções | ✓ WIRED | Import explícito nas linhas 5-10 de PagamentosDivida.jsx. Todas as 5 funções usadas no componente. |
| `PagamentosDivida` | `dividas.js:atualizarSaldoQuitado` | `import { atualizarSaldoQuitado }` + chamada em recalcularESincronizar | ✓ WIRED | Import na linha 11. Chamado dentro de `recalcularESincronizar` que é chamado 3 vezes (criar/salvar/excluir). |
| `PagamentosDivida.onSaldoChange` | `DetalheDivida.saldoDividaLocal` | prop callback `(novoSaldo) => setSaldoDividaLocal(novoSaldo)` | ✓ WIRED | Linha 203 de DetalheDivida.jsx. `saldoAtual` derivado via `saldoDividaLocal !== null ? saldoDividaLocal : saldoDivida`. |
| `DetalheDivida` | `PagamentosDivida` | import + render | ✓ WIRED | Linha 8 import. Linhas 200-204 render. `allPagamentos` NÃO passado para PagamentosDivida (correto — D-07). |
| `TabelaDividas` | `dividas[i].saldo_quitado` | leitura direta `d.saldo_quitado === true` | ✓ WIRED | Linha 113 de TabelaDividas.jsx. Strict equality — falha segura se null/undefined. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PagamentosDivida.jsx` | `pagamentos[]` | `listarPagamentos(divida.id)` → `dbGet('pagamentos_divida', ...)` | Sim — dbGet é global do runtime que faz query Supabase | ✓ FLOWING |
| `DetalheDivida.jsx` | `saldoAtual` | `saldoDividaLocal` (via onSaldoChange de PagamentosDivida) ou `saldoDivida` (via calcularSaldosPorDivida) | Sim — dois caminhos válidos, nenhum hardcoded | ✓ FLOWING |
| `TabelaDividas.jsx` | `d.saldo_quitado` | `dividas[]` prop vindo de `carregarTudo()` no pai (App.jsx) | Sim — lê coluna do banco via carregamento existente | ✓ FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — o app requer runtime do Supabase e globals injetados por App.jsx (dbGet/dbInsert/dbUpdate/dbDelete). Não há entry point executável sem servidor ativo e banco configurado.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAG-01 | 04-01, 04-02 | Lançar pagamento (data + valor + obs) na tela da dívida | ✓ SATISFIED | `handleCriar` em PagamentosDivida.jsx. Form sempre visível. |
| PAG-02 | 04-01, 04-02 | Visualizar histórico cronológico de pagamentos | ✓ SATISFIED | Tabela com order `data_pagamento.asc`. Colunas Data, Valor, Observação. |
| PAG-03 | 04-02 | Editar pagamento lançado com confirmação | ✓ SATISFIED | Edição inline via `editandoId` state. `handleSalvarEdit`. Botão OK com `aria-label="Confirmar edição"`. |
| PAG-04 | 04-02 | Excluir pagamento com confirmação | ✓ SATISFIED | `window.confirm("Excluir este pagamento?")` em `handleExcluir`. |
| PAG-05 | 04-01, 04-02 | Saldo recalculado via Art. 354 CC após cada pagamento | ✓ SATISFIED | `calcularSaldoPorDividaIndividual` usando motor `calcularSaldosPorDivida`. Chamado em recalcularESincronizar (3x). |
| PAG-06 | 04-03 | Badge "Saldo quitado" em DetalheDivida quando saldo ≤ 0 | ✓ SATISFIED | `saldoAtual !== null && saldoAtual <= 0` condicional com `<span role="status">Saldo quitado</span>`. |
| PAG-07 | 04-01, 04-02 | `dividas.saldo_quitado` atualizado após cada operação | ✓ SATISFIED | `atualizarSaldoQuitado(divida.id, novoSaldo <= 0)` chamado 3x via `recalcularESincronizar`. Persiste via PATCH em dividas.js. |
| PAG-08 | 04-03 | Badge "Saldo quitado" em TabelaDividas lendo `dividas.saldo_quitado` | ✓ SATISFIED | `d.saldo_quitado === true` na coluna Atraso de TabelaDividas.jsx. |

All 8 requirements satisfied. No orphaned requirements for Phase 4.

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| pagamentos.js | `dbGet/dbInsert/dbUpdate/dbDelete` used without import | ℹ️ Info | Intentional — these are App.jsx runtime globals per project pattern. Not a stub. |
| PagamentosDivida.jsx | `Btn` used with `style` and `aria-label` props (deviation noted in SUMMARY) | ℹ️ Info | Btn.jsx does not forward `style` prop — Btn OK/Cancel buttons may not apply inline color styles. Not a blocker (aria-label forwarding is the higher concern for a11y). |

No blocking anti-patterns found. No TODOs, FIXMEs, placeholder returns, or hardcoded empty data that flows to rendering.

**Note on Btn.jsx props:** The SUMMARY documented that Btn does not accept `type` or `style` props. The submit button correctly uses native `<button>`. The inline-edit OK/Cancel buttons use `<Btn sm outline style={{ color: "..." }}>` — if Btn does not forward `style`, the color styles are silently dropped. This is a cosmetic issue only and does not affect functionality.

---

### Human Verification Required

The automated checks confirm all code is correctly wired and non-stub. The following items require human testing against the live Supabase instance, which requires the migrations to be executed first.

**Pre-condition:** Execute both SQL migrations in Supabase SQL Editor (documented in the comment block at the top of `src/mr-3/mr-cobrancas/src/services/pagamentos.js`):
- Migration 1: `CREATE TABLE public.pagamentos_divida (...)`
- Migration 2: `ALTER TABLE public.dividas ADD COLUMN IF NOT EXISTS saldo_quitado BOOLEAN DEFAULT FALSE`

#### 1. Registrar Pagamento

**Test:** Open a dívida detail view. Fill in Data (any past date), Valor (any positive number), Observação (optional). Click "Salvar Pagamento".
**Expected:** The new payment appears immediately in the "Histórico de Pagamentos" table above (chronologically sorted), and the "Saldo Atualizado" card updates to reflect the new balance calculated via Art. 354 CC.
**Why human:** Requires live Supabase with `pagamentos_divida` table created and runtime globals injected by App.jsx.

#### 2. Edição Inline

**Test:** Click "Editar" on any payment row. Change the valor. Click "OK".
**Expected:** The row reverts from inputs to display mode showing the new values. "Saldo Atualizado" updates. Toast "Pagamento atualizado" appears.
**Why human:** Requires live database and real-time state propagation via onSaldoChange.

#### 3. Exclusão com Confirmação

**Test:** Click "Excluir" on any payment row. A browser confirm dialog should appear. Click OK.
**Expected:** The row is removed from the table. The "Saldo Atualizado" increases back (or badge disappears if it was showing). Toast "Pagamento excluído" appears.
**Why human:** window.confirm behavior and state update requires a running browser context.

#### 4. Badge "Saldo quitado" em DetalheDivida

**Test:** Register enough payments so the calculated balance reaches ≤ 0. Observe the "Saldo Atualizado" card.
**Expected:** Green badge "Saldo quitado" appears below the balance amount in the financial card. The `role="status"` attribute should be present for screen readers.
**Why human:** Requires real numeric data and Art.354 calculation to produce saldo ≤ 0.

#### 5. Badge "Saldo quitado" em TabelaDividas

**Test:** After step 4, navigate back to the global dívidas list (TabelaDividas).
**Expected:** The "Atraso" column for that dívida shows the green "Saldo quitado" badge instead of the AtrasoCell component.
**Why human:** Requires `dividas.saldo_quitado = true` persisted in the database (written by atualizarSaldoQuitado) AND `carregarTudo()` called to refresh the parent state with the new column value.

---

### Gaps Summary

No gaps. All 7 roadmap success criteria are verified as correctly implemented in the codebase. All 8 PAG requirements have implementation evidence. No missing artifacts, no stubs, no broken key links.

The `human_needed` status reflects that 4 behaviors cannot be verified without the live Supabase instance and executed migrations — the SQL migrations are documented in pagamentos.js but have not been applied to the database yet. The code is ready; the database schema is not.

---

_Verified: 2026-04-21T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
