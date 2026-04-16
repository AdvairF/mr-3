---
quick_id: 260416-oez
date: 2026-04-16
status: complete
phase: quick
subsystem: dashboard
tags: [dashboard, filtro, periodo, recebimentos, kpi, tabela]
tech_stack:
  added: []
  patterns: [useMemo-derived-filter, period-selector]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "PERIODOS array com dias=0 para Tudo — dataInicio=null significa sem filtro"
  - "pagamentosNoPeriodo via useMemo sobre allPagamentos (já carregado no App root)"
  - "recuperadoPeriodo filtra pagamentos do período para devedores com status pago_integral/recuperado"
  - "ultimosPagamentos inclui saldoRestante calculado via calcularSaldoDevedorAtualizado"
metrics:
  duration: "~15 min"
  completed: 2026-04-16
  tasks_completed: 4
  files_changed: 1
---

# Quick 260416-oez: Dashboard Filtro Período + Recebimentos — Summary

**One-liner:** Dashboard ganhou barra de filtro de período (8 opções, padrão 30d)
e seção "Recebimentos" com 3 cards KPI + tabela dos últimos 5 pagamentos.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | periodo state + computações derivadas | 1109629 | App.jsx |
| 2 | Barra de filtro de período | 1109629 | App.jsx |
| 3 | Cards recebido/recuperado/taxa + tabela | 1109629 | App.jsx |
| 4 | Commit + push + deploy | 1109629 | — |

## What Was Built

### Period state (linha ~683)
`PERIODOS` array + `useState(30)`. `dataInicio` via `useMemo` — `null` quando "Tudo".
`pagamentosNoPeriodo` filtra `allPagamentos` por `data_pagamento >= dataInicio`.

### Derived metrics
- `recebidoPeriodo`: soma de `valor` dos pagamentos no período
- `recuperadoPeriodo`: soma para devedores com status `pago_integral`/`recuperado`
- `taxaPeriodo`: recebido / totalCarteira * 100
- `ultimosPagamentos`: últimos 5 sorted by data_pagamento desc, com `nomeDevedor` e `saldoRestante`

### Filter bar (linha ~759)
8 botões pill verde/outline, clique atualiza `periodo`, reativo via useMemo.

### Cards + tabela (após Funil de Cobrança)
3 cards gradiente (verde, azul, roxo) + tabela com hover com colunas
Data / Devedor / Valor Pago / Saldo Restante. Empty state quando sem pagamentos.

## Self-Check: PASSED
