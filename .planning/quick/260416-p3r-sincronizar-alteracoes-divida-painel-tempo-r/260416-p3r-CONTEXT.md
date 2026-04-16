---
quick_id: 260416-p3r
date: 2026-04-16
status: ready
---

# Quick Task 260416-p3r: Sincronizar alterações dívida painel tempo real — Context

**Gathered:** 2026-04-16
**Status:** Ready for execution

<domain>
## Task Boundary

Corrigir o cálculo de `calcularSaldoDevedorAtualizado` para incluir multa e honorários
no bloco "período final" (quando não há pagamentos parciais). Atualmente, multa/honorários
só são aplicados dentro do loop de pagamentos — que não executa para devedores sem parciais.

</domain>

<decisions>
## Implementation Decisions

### Root Cause
`calcularSaldoDevedorAtualizado` (linha ~82) tem um bloco "período final" (linhas ~146–161)
que aplica só `pcFinal + jurosFinal` sem multa nem honorários. O loop for só executa quando
há `pgtoRestantes` com `remaining > 0`. Sem pagamentos, multa/honorários são silenciosamente
omitidos — mesmo que `multa_pct` e `honorarios_pct` tenham valores.

### Fix
No bloco "período final", adicionar multa e honorários quando `primeiroperiodo` ainda é true
(nenhum período de pagamento foi processado):

```js
const multaFinal = primeiroperiodo ? pcFinal * (multaPctDiv / 100) : 0;
const honorariosFinal = primeiroperiodo
  ? (pcFinal + jurosFinal + multaFinal) * (honorariosPctDiv / 100)
  : 0;
saldo = pcFinal + jurosFinal + multaFinal + honorariosFinal;
```

### Schema
Não há colunas SQL faltando. `multa_pct` e `honorarios_pct` já estão armazenados
no JSON da coluna `devedores.dividas`. Nenhuma migration necessária.

### React state update
O state já atualiza corretamente após `salvarEdicaoDivida` → `setDevedores` → prop
fluida para `Devedores` e `Dashboard`. O valor visível só não mudava porque a função
de cálculo ignorava multa/honorários no caminho sem pagamentos.

### Carteira Total
`totalCarteira` nos dois locais (Dashboard e App root) também chama
`calcularSaldoDevedorAtualizado` — o fix os corrige automaticamente.

</decisions>

<specifics>
## Specific Ideas

**Arquivo afetado:**
- `src/mr-3/mr-cobrancas/src/App.jsx`

**Ponto de edição:**
- Linhas ~146–161 (bloco "período final" de `calcularSaldoDevedorAtualizado`)
- Substituir `saldo = pcFinal + jurosFinal;` por versão que inclui multa/honorários
  quando `primeiroperiodo` é true.

</specifics>

<canonical_refs>
## Canonical References

- `calcularSaldoDevedorAtualizado` — linha 82
- Bloco "período final" — linha ~146
- `gerarPlanilhaPDF` — mesma lógica de "multa somente no primeiro período"
- `salvarEdicaoDivida` — linha 3049, já salva corretamente no Supabase

</canonical_refs>
