---
status: partial
phase: 04-pagamentos-por-divida
source: [04-VERIFICATION.md]
started: 2026-04-21
updated: 2026-04-21
---

## Current Test

[awaiting human testing]

## Pre-condition

Execute as duas migrações SQL no Supabase SQL Editor antes de testar.
As instruções estão nos comentários no topo de `src/mr-3/mr-cobrancas/src/services/pagamentos.js`.

## Tests

### 1. Registrar pagamento
expected: Pagamento aparece na lista cronológica e Saldo Atualizado em DetalheDivida recalcula imediatamente
result: [pending]

### 2. Edição inline
expected: Clicar Editar transforma a linha em campos editáveis inline (sem modal), salvar persiste e recalcula saldo
result: [pending]

### 3. Exclusão com confirmação
expected: Clicar Excluir mostra window.confirm, ao confirmar o pagamento some da lista e saldo é recalculado
result: [pending]

### 4. Badge "Saldo quitado" em DetalheDivida
expected: Badge verde aparece ao lado de "Saldo Atualizado" quando saldo ≤ 0 (em tempo real via onSaldoChange)
result: [pending]

### 5. Badge "Saldo quitado" em TabelaDividas
expected: Coluna Atraso exibe badge "Saldo quitado" quando divida.saldo_quitado === true após reload
result: [pending]

## Summary

total: 5
passed: 0
issues: 0
pending: 5
skipped: 0
blocked: 0

## Gaps
