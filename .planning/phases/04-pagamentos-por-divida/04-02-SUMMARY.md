---
phase: 4
plan: 2
subsystem: ui-component
tags: [pagamentos, divida, inline-edit, art354, react]
dependency_graph:
  requires: [pagamentos.js:CRUD, pagamentos.js:calcularSaldoPorDividaIndividual, dividas.js:atualizarSaldoQuitado]
  provides: [PagamentosDivida.jsx:default]
  affects: [04-03-PLAN.md]
tech_stack:
  added: []
  patterns: [inline-edit-editandoId, lazy-useEffect-load, recalculate-after-mutation]
key_files:
  created:
    - src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx
  modified: []
decisions:
  - "Btn.jsx não aceita type/style props — usou native <button> para CTA de submit com estilos idênticos ao Btn (mr-btn className + inline styles)"
  - "min=0.01 adicionado no campo valor do formulário de registro (mitigação T-04-05 do threat model)"
  - "setEditandoId(null) em 2 lugares: cancelar inline e pós-salvar bem-sucedido (D-05)"
metrics:
  duration: "2 minutes"
  completed: "2026-04-21"
  tasks_completed: 1
  tasks_total: 1
  files_created: 1
  files_modified: 0
---

# Phase 4 Plan 2: PagamentosDivida.jsx Summary

**One-liner:** Componente React autônomo com histórico cronológico de pagamentos, edição inline por linha, exclusão com window.confirm, formulário sempre visível, e recálculo de saldo Art.354 após cada mutação.

## What Was Built

`PagamentosDivida.jsx` — componente autônomo que concentra toda a UI de pagamentos por dívida:

**Seção 1 — Histórico de Pagamentos:**
- Carregamento lazy via `useEffect` + `listarPagamentos(divida.id)` ao montar (D-07)
- Loading state: "Carregando..." em `#94a3b8`
- Empty state: "Nenhum pagamento registrado" em `#94a3b8` (centrado)
- Tabela com colunas Data (96px), Valor (112px), Observação (flex 1), Ações (80px)
- Cada linha tem botões [Editar] (Btn sm outline) e [Excluir] (Btn sm danger)

**Edição inline (D-05 — PAG-03):**
- `editandoId` state controla qual linha está em modo edição
- `iniciarEdicao(row)` → `setEditandoId(row.id)` + popula `editForm`
- Linha vira inputs de date, number e text com estilos Inp-compatíveis
- Botões [OK] (aria-label="Confirmar edição") e [✕] (aria-label="Cancelar edição")
- `handleSalvarEdit(row)` → `atualizarPagamento` + reload + `recalcularESincronizar` + `setEditandoId(null)`

**Exclusão (D-06 — PAG-04):**
- `window.confirm("Excluir este pagamento?")` antes de deletar
- Aria-label dinâmico: "Excluir pagamento de DD/MM/AAAA"
- `handleExcluir(row)` → `excluirPagamento` + reload + `recalcularESincronizar`

**Seção 3 — Registrar Pagamento (D-04 — PAG-01):**
- Formulário sempre visível — sem toggle/expandir
- Campos em flex row: Data (type=date required), Valor (type=number step=0.01 min=0.01 required), Observação (type=text optional)
- CTA: "Salvar Pagamento" com loading state "Salvando..." (disabled)
- Native `<button type="submit">` com estilos idênticos ao Btn (Btn não expõe type prop)

**recalcularESincronizar (PAG-05):**
- Chamado em handleCriar, handleSalvarEdit e handleExcluir (3× total)
- `calcularSaldoPorDividaIndividual(divida, listaPagamentos, hoje)` → novoSaldo
- `atualizarSaldoQuitado(divida.id, quitado)` → persiste no banco
- `onSaldoChange(novoSaldo)` → propaga para DetalheDivida (plan 03)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar PagamentosDivida.jsx com histórico, edição inline e formulário | 51e81c5 | src/components/PagamentosDivida.jsx (created) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Btn.jsx não aceita type="submit" nem style prop**
- **Found during:** Task 1 — ao tentar usar `<Btn type="submit" style={...}>`
- **Issue:** Btn.jsx só aceita: children, onClick, color, outline, danger, disabled, sm, lime. As props `type` e `style` não são propagadas para o `<button>` interno.
- **Fix:** Usado native `<button type="submit">` com `className="mr-btn"` e inline styles idênticos ao padrão Btn (mesmos border-radius, padding, font, shadow, transition), mantendo a consistência visual.
- **Files modified:** PagamentosDivida.jsx (submit button)
- **Commit:** incluído em 51e81c5

## Threat Surface Scan

Ameaças do threat model mitigadas neste componente:

| Threat ID | Status | Mitigation |
|-----------|--------|------------|
| T-04-05 | Mitigado | `min="0.01"` adicionado ao campo valor do formulário; edição inline usa parseFloat() |
| T-04-06 | Aceito | Data futura não vedada em v1.1 |
| T-04-07 | Aceito | React escapa strings automaticamente; sem dangerouslySetInnerHTML |

Nenhuma nova superfície de ameaça introduzida além do que foi modelado.

## Known Stubs

None — componente completo com todos os handlers implementados. Aguarda integração em DetalheDivida (plan 04-03).

## Self-Check: PASSED

- [x] `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx` — FOUND (commit 51e81c5)
- [x] `export default function PagamentosDivida` — FOUND
- [x] `window.confirm("Excluir este pagamento?")` — FOUND
- [x] `toast.success("Pagamento registrado")` — FOUND
- [x] `toast.success("Pagamento atualizado")` — FOUND
- [x] `toast.success("Pagamento excluído")` — FOUND
- [x] `"Nenhum pagamento registrado"` — FOUND
- [x] `"Carregando..."` — FOUND
- [x] `"Salvar Pagamento"` — FOUND
- [x] `"Salvando..."` — FOUND
- [x] `aria-label="Confirmar edição"` — FOUND
- [x] `aria-label="Cancelar edição"` — FOUND
- [x] `setEditandoId(null)` — FOUND 2× (cancelar + pós-salvar)
- [x] `await recalcularESincronizar` — FOUND 3× (criar, salvar, excluir)
- [x] `import { atualizarSaldoQuitado } from "../services/dividas.js"` — FOUND
- [x] `padding: "18px 20px"` — FOUND
- [x] No `import.*dbGet` — CONFIRMED
