---
status: resolved
phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno
source: [01-VERIFICATION.md]
started: 2026-04-19T00:00:00Z
updated: 2026-04-21T00:00:00Z
---

## Current Test

Todos os checks validados — UAT completo.

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
expected: Saldo atualizado reflete encargos (IGP-M + juros + multa + honorários) no carregamento inicial e após background refresh de 60s — não apenas após editar/salvar dívida.
result: PASSED — fix CR-01 aplicado (commit 95b3aee): aliases indexador/juros_am/multa_pct/honorarios_pct adicionados ao dividasMap em carregarTudo(). Aprovado em produção 2026-04-21.

## Summary

total: 7
passed: 7
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
