---
quick_id: 260417-ttn
phase: quick-260417-ttn
plan: "01"
subsystem: devedores
tags: [art523, pagamentos-parciais, inline-edit, reload, badge]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "Ajuste 1: reload forçado via dbGet após salvarEdicaoDivida — normaliza art523_opcao null→nao_aplicar em memória, sem migração SQL"
  - "Ajuste 2: badge inline JSX no card de dívida não-custas, pill vermelho #fee2e2/#991b1b com tooltip title HTML"
  - "Ajuste 3: editPgtoId state pattern para edição inline — NÃO modal; validação data+valor; dbUpdate pagamentos_parciais"
metrics:
  duration: ~15min
  completed: 2026-04-17
  tasks_completed: 3
  files_modified: 1
---

# Quick Task 260417-ttn Summary

**One-liner:** Reload forçado art523 após save + badge pill vermelho Art.523 nos cards de dívida + edição inline de pagamentos parciais (editPgtoId pattern com dbUpdate).

## What Was Done

### Task 1 — Reload forçado do devedor após salvarEdicaoDivida (App.jsx ~L3538)

Adicionado bloco try/catch após o `setSel(parsed)` existente em `salvarEdicaoDivida`. O bloco chama `dbGet("devedores", \`id=eq.${sel.id}\`)`, normaliza `art523_opcao null → "nao_aplicar"` em memória, monta `parsedFresh` via `montarDevAtualizado` e atualiza `setDevedores` + `setSel`. Falha silenciosa com `console.warn` — state local anterior mantido como fallback.

- Arquivo: `src/App.jsx`
- Linhas tocadas: ~3538-3556 (inserção de 19 linhas)

### Task 2 — Badge Art.523 nos cards de dívida detalhada (App.jsx ~L3864)

Inserido bloco JSX condicional imediatamente após `{div.indexador && <p ...>}` no card de dívida não-custas. Renderiza badge pill vermelho apenas para `so_multa` ("Art.523 Multa") e `multa_honorarios` ("Art.523 Multa+Hon."). Tooltip via atributo `title` com texto diferenciado. `nao_aplicar`, `null` e `undefined` não renderizam nada.

- Arquivo: `src/App.jsx`
- Linhas tocadas: ~3865-3887 (inserção de 22 linhas)

### Task 3 — Edição inline de pagamentos parciais (App.jsx — AbaPagamentosParciais)

Três pontos modificados dentro de `AbaPagamentosParciais`:

1. **State adicionado** (após `const [form, ...]`): `editPgtoId` e `editPgtoForm`.
2. **Função `salvarEdicaoPagamento(id)`** adicionada antes de `excluirPagamento`: valida data + valor > 0, chama `dbUpdate("pagamentos_parciais", id, {...})`, toast success, `setEditPgtoId(null)`, `await carregar()`.
3. **Row table substituída** por condicional: modo edit (3 inputs + botões ✅/❌ com background #f0fdf4) vs. modo read (cursor pointer, hover #dcfce7, ✕ excluir com `e.stopPropagation()`).

- Arquivo: `src/App.jsx`
- Linhas tocadas: ~2464-2466 (state), ~2507-2525 (função), ~3052-3103 (row condicional)

## Commits

| Task | Commit | Descrição |
|------|--------|-----------|
| 1+2+3 | acd89e2 | feat(260417-ttn): 3 ajustes módulo devedores — reload art523, badge, edição pagamentos |

## Verification

- Build: `npm run build` passou — 7/7 testes Vitest + build Vite OK
- Deploy: https://mrcobrancas.com.br (Vercel prod `dpl_578f7kcvoa6C89q8y9MF7j7kgHxA`)
- `devedorCalc.js` intocado
- Nenhuma migração SQL executada
- Nenhum arquivo novo criado

## Deviations from Plan

None — plan executed exactly as written. Os 3 tasks foram combinados num único commit pois todos modificam exclusivamente `App.jsx`.

## Self-Check: PASSED

- `src/App.jsx` modificado: FOUND
- Commit `acd89e2`: FOUND (`git log --oneline -1` = `acd89e2`)
- Build e testes: PASSED (7/7)
- Deploy Vercel: READY
