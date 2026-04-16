---
quick_id: 260416-q9w
date: 2026-04-16
status: complete
phase: quick
plan: 260416-q9w
subsystem: devedores-painel
tags: [atraso, coluna, badge, sort, ui]
tech_stack:
  added: []
  patterns: [iife-badge, inline-sort, derived-state]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "calcDiasAtraso definida como const dentro do componente Devedores — só usada ali"
  - "IIFE (() => {...})() no <td> para selecionar o badge sem extrair componente separado"
  - "filteredSorted derivado de filtered via sort condicional — não substitui filtered (usada para .length check)"
metrics:
  duration: "~10 min"
  completed: 2026-04-16
  tasks_completed: 4
  files_changed: 1
---

# Quick 260416-q9w: Substituir Acordos por Dias Atraso — Summary

**One-liner:** Coluna "Acordos" substituída por "Atraso" com badge colorido de 5 tiers
e ordenação clicável no cabeçalho.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | State sortAtraso | fb1a927 | App.jsx |
| 2 | calcDiasAtraso + filteredSorted | fb1a927 | App.jsx |
| 3 | Header "Atraso" clicável com seta sort | fb1a927 | App.jsx |
| 4 | Badge td com 5 tiers de cor | fb1a927 | App.jsx |

## What Was Built

### calcDiasAtraso (linha 3139)
Função `const` no corpo de `Devedores`. Filtra `d.dividas` excluindo `_nominal` e
`_so_custas`, pega o `data_vencimento` mais antigo, retorna dias desde hoje.
Retorna `-1` se sem dívidas válidas (renderiza "—").

### filteredSorted (linha 3150)
Derivado de `filtered` com `.sort((a,b) => calcDiasAtraso(b) - calcDiasAtraso(a))`
quando `sortAtraso` é true. Devedores com "-1" (sem dívida) ficam no final.

### Header (linha 3690–3694)
- `"Acordos"` → `"Atraso"` no array de cabeçalhos
- `onClick` adiciona toggle `setSortAtraso`
- Cor roxa `#7c3aed` quando é "Atraso" (destaca o cabeçalho clicável)
- Seta `↑`/`↓` indica direção do sort

### Badge td (linha 3736–3743)
IIFE com 5 branches:
- dias < 0 → `"—"` cinza
- dias === 0 → "Em dia" cinza claro
- dias 1–30 → "X dias" amarelo
- dias 31–90 → "X dias" laranja
- dias 91–180 → "X dias" vermelho
- dias > 180 → "X dias ⚠" vermelho escuro (`#450a0a`)

## Self-Check

- `sortAtraso` state — FOUND linha 2654
- `calcDiasAtraso` function — FOUND linha 3139
- `filteredSorted` — FOUND linhas 3150–3152
- Header "Atraso" com onClick/sort — FOUND linhas 3690–3694
- `filteredSorted.map` no tbody — FOUND linha 3702
- Badge IIFE com 5 tiers — FOUND linhas 3736–3743
- Commit fb1a927 — CONFIRMED

## Self-Check: PASSED
