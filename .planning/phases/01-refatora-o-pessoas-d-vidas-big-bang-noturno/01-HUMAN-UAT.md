---
status: partial
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
source: [01-VERIFICATION.md]
started: 2026-04-19T00:00:00Z
updated: 2026-04-20T00:00:00Z
---

## Current Test

Aguardando validação de saldo — check 7 de 7

## Tests

### 1. Sidebar mostra "Pessoas"
expected: Sidebar label é "Pessoas" (não "Devedores")
result: PASSED — confirmado em produção 2026-04-20

### 2. Lista devedores com dívidas
expected: 6 devedores carregam com suas dívidas corretamente
result: PASSED — confirmado em produção (6 devedores visíveis)

### 3. Criar dívida
expected: "+ Dívida" cria nova dívida e aparece na lista
result: PASSED — confirmado em produção

### 4. Editar dívida com persistência pós-F5
expected: Editar valor e salvar persiste após reload (F5)
result: PASSED — confirmado em produção

### 5. Deletar dívida sem crash do r.reduce
expected: Delete não causa crash (r.reduce bug corrigido via submodule bump)
result: PASSED — confirmado em produção

### 6. Dashboard mostra "Pessoas"
expected: Card do Dashboard usa label "Pessoas" com contagem correta
result: PASSED — confirmado em produção

### 7. Saldo atualizado correto após fresh page load (CR-01)
expected: Saldo atualizado do advair deve refletir encargos sobre as dívidas com base nos pagamentos parciais (R$ 2.100 pagos em 4 dívidas de R$ 1.000 cada). Calculadora mostra R$ 9.499,97 para uma dívida — precisa confirmar se o valor R$ 3.784,95 do painel está correto considerando pgtos ou é bug de alias CR-01. Testar com Bonificação R$ 525 na Calculadora para validar.
result: [pending — retomar amanhã]

## Summary

total: 7
passed: 6
issues: 0
pending: 1
skipped: 0
blocked: 0

## Gaps
