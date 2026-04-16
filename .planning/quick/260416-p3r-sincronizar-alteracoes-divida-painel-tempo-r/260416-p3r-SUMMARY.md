---
quick_id: 260416-p3r
date: 2026-04-16
status: complete
phase: quick
plan: 260416-p3r
subsystem: devedores-painel
tags: [saldo-devedor, multa, honorarios, calculo, tempo-real]
tech_stack:
  added: []
  patterns: [pure-function-fix]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "Nenhuma coluna SQL nova necessária — multa_pct/honorarios_pct já ficam no JSON de dividas"
  - "React state update já funcionava corretamente; o bug era exclusivamente no cálculo"
  - "Fix cirúrgico: 4 linhas substituídas por 5, sem alterar assinatura ou dependências"
metrics:
  duration: "~5 min"
  completed: 2026-04-16
  tasks_completed: 1
  files_changed: 1
---

# Quick 260416-p3r: Sincronizar Alterações Dívida Painel Tempo Real — Summary

**One-liner:** `calcularSaldoDevedorAtualizado` não aplicava multa/honorários quando
não havia pagamentos parciais — corrigido adicionando os encargos no bloco "período final"
quando `primeiroperiodo` ainda é true.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix bloco "período final" — adicionar multa/honorários quando primeiroperiodo=true | 6e27e1a | src/mr-3/mr-cobrancas/src/App.jsx |

## What Was Built

### Root Cause

`calcularSaldoDevedorAtualizado` (linha 82) tem dois caminhos:
1. **Loop de pagamentos** (`for pgto of pgtosDiv`) — aplica multa/honorários na primeira
   iteração e seta `primeiroperiodo = false`
2. **Bloco final** (linhas ~146–163) — executa sempre após o loop; calculava apenas
   `pcFinal + jurosFinal` sem multa nem honorários

Para devedores sem pagamentos parciais, o loop não executa e o bloco final era o único
caminho. Resultado: multa_pct e honorarios_pct eram ignorados completamente, tornando
qualquer edição desses campos invisível no painel.

### Fix (linhas 158–162)

```js
const multaFinal = primeiroperiodo ? pcFinal * (multaPctDiv / 100) : 0;
const honorariosFinal = primeiroperiodo
  ? (pcFinal + jurosFinal + multaFinal) * (honorariosPctDiv / 100)
  : 0;
saldo = pcFinal + jurosFinal + multaFinal + honorariosFinal;
```

`primeiroperiodo` permanece `true` somente se nenhum período de pagamento foi processado
(devedores sem pagamentos parciais). O fix é portanto seguro — devedores com pagamentos
parciais não são afetados.

### Efeito colateral positivo

`totalCarteira` no Dashboard e no App root também chamam `calcularSaldoDevedorAtualizado`,
portanto o card "Carteira Total" também passa a refletir multa e honorários.

## Deviations from Plan

None — execução exata do plano.

## Self-Check

- Bloco final agora inclui `multaFinal` e `honorariosFinal` — CONFIRMED linha 158–162
- `primeiroperiodo` guarda a condição corretamente — CONFIRMED (linha 103 init true, 142 false after payment period)
- Nenhuma outra referência à função alterada — função pura, sem efeitos colaterais
- Commit 6e27e1a — CONFIRMED

## Self-Check: PASSED
