---
quick_id: 260417-ull
date: 2026-04-17
status: Ready for execution
---

# Quick Task 260417-ull: unificar-planilhas-padrao-pagamentos-parciais — Context

**Gathered:** 2026-04-17

<domain>
## Task Boundary

Três alterações nos PDFs do sistema:
1. Remover seção "FUNDAMENTAÇÃO LEGAL" do imprimirFicha (lines 2345-2369 App.jsx)
2. Adicionar Art. 523 no resumo executivo e rows da Planilha de Pagamentos (gerarPlanilhaPDF)
3. Extrair calcularPlanilhaCompleta() para devedorCalc.js e usar em gerarPlanilhaPDF

**Divergência confirmada:** A Planilha Pagamentos mostra R$ 8.686,27 e a Ficha mostra R$ 9.317,17.
A diferença de R$ 630,90 é exatamente o valor do Art. 523 (10% multa + 10% honorários).
Ambos os motores já fazem amortização iterativa idêntica — a divergência é SOMENTE Art. 523 faltando em gerarPlanilhaPDF.

</domain>

<decisions>
## Implementation Decisions

### Alteração 1 — Remover FUNDAMENTAÇÃO LEGAL
- Remover bloco lines 2345-2369 em App.jsx (de `// ── FUNDAMENTAÇÃO LEGAL` até `y = hrLine(y);`)
- Inclui a variável hasTaxaLegal, hasArt523, hasInpc e array fundamentos

### Alteração 2 + 3 — Art.523 e motor unificado
- Extrair calcularPlanilhaCompleta(devedor, pagamentos, hoje) em devedorCalc.js
  - Mirrors exatamente o loop iterativo de gerarPlanilhaPDF
  - Adiciona Art.523 por dívida ao final de cada seção
  - Retorna { resumo, secoes } com datas brutas YYYY-MM-DD
  - resumo contém: valor_original, multa, honorarios, correcao, juros, art523_multa, art523_honorarios, total_atualizado, total_pago, saldo_devedor_final
  - secoes: [{ div, rows, saldoDiv, art523Multa, art523Honorarios }]
- gerarPlanilhaPDF importa e usa calcularPlanilhaCompleta
  - Substitui o bloco de cálculo inline (~250 linhas)
  - Atualiza resumoLinhas para incluir Art. 523
  - Formata datas brutas com fmtDate na renderização
- imprimirFicha NÃO precisa mudar — já usa calcularDetalheEncargos → calcularSaldoDevedorAtualizado que inclui Art.523

### Honorários no resumo
- Manter lógica atual do gerarPlanilhaPDF: totalHonorarios = totalAtualizado_sem_hon * honorariosPct / 100
- NÃO corrigir a discrepância honorários row vs resumo (fora do escopo, risco de nova divergência)

### Testes regressivos
- Adicionar 1 caso em casos-tjgo.json: dívida com pagamento parcial + Art.523 + verificar saldo_planilha

</decisions>

<canonical_refs>
## Canonical References

- App.jsx lines 2345-2369: bloco FUNDAMENTAÇÃO LEGAL a remover
- App.jsx lines 2539-2978: função gerarPlanilhaPDF completa
- App.jsx lines 2567-2806: bloco de cálculo a substituir por calcularPlanilhaCompleta
- App.jsx lines 2843-2853: resumoLinhas (adicionar Art.523)
- devedorCalc.js line 59: calcularSaldoDevedorAtualizado (motor correto de referência)
- devedorCalc.js line 331: calcularResumoFinanceiro (fim do arquivo — inserir nova função após)

</canonical_refs>
