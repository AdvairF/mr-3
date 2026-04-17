---
phase: quick-260417-i3m
plan: 01
subsystem: frontend + backend
tags: [react, fila, valor-divida, devedorCalc, resumo-financeiro, refactor]
requirements: [VALOR-DIVIDA-CORRETO, RESUMO-FINANCEIRO, TITULO-CREDOR, SHARED-UTIL]
status: complete

dependency_graph:
  requires: [FilaDevedor.jsx@260417-h5p, filaDevedor.js@260417-h5p, App.jsx]
  provides: [devedorCalc.js, DividaCell, CredorCell, FilaAtendimento-resumo]
  affects: [App.jsx, filaDevedor.js, FilaDevedor.jsx, utils/devedorCalc.js]

tech_stack:
  added: [utils/devedorCalc.js]
  patterns:
    - "calcularValorFace = sum(dividas[].valor_total) || valor_original — sem queries extras"
    - "calcularResumoFinanceiro = saldo + breakdown components (encargos, pago, diasEmAtraso)"
    - "FilaAtendimento carrega pagamentos_parciais via Promise.all com eventos"
    - "IIFE pattern no JSX para computar resumo inline sem estado extra"

key_files:
  created:
    - src/mr-3/mr-cobrancas/src/utils/devedorCalc.js
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
    - src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx

decisions:
  - "calcularValorFace usa dividas[] JSONB (já carregado via select=*) — evita N+1 queries"
  - "calcularSaldoDevedorAtualizado extraído para devedorCalc.js — App.jsx importa de lá, zero duplicação"
  - "FilaAtendimento carrega pagamentos_parciais ao montar (não no listarDevedoresParaFila) — evita query pesada por devedor na listagem"
  - "Resumo financeiro computado via IIFE no render — evita useMemo desnecessário"
  - "CredorCell mostra credor.nome, numero_processo, div[0].descricao — dados já disponíveis no devedor"

metrics:
  duration: "~1.5 horas"
  completed: "2026-04-17"
  tasks_completed: 6
  tasks_total: 6
  db_migrations: 0
  files_modified: 3
  files_created: 1
  commit: "3932c0a"
  deploy_url: "https://mrcobrancas.com.br"
---

# Quick Task 260417-i3m: Valor Dívida Real + Resumo Financeiro Completo na Fila

**One-liner:** Coluna Valor Dívida passou de R$ 0,00 para o valor face correto; tela de atendimento ganhou resumo financeiro completo com saldo atualizado, encargos e dívidas detalhadas.

## Root Cause

`devedores.valor_total` é uma coluna numérica zerada/sem uso nestes devedores. As tasks anteriores assumiram que esse campo era o saldo atualizado (sincronizado por 260416-p3r), mas ele não era populado pelo fluxo atual. O valor correto vive em:

- `devedores.dividas[]` — JSONB com cada dívida e seu `valor_total`
- `devedores.valor_original` — soma pré-calculada dos valores nominais

## Mudanças

### utils/devedorCalc.js (novo)

| Função | Propósito |
|--------|-----------|
| `calcularValorFace(devedor)` | Soma `dividas[].valor_total` ou fallback `valor_original` |
| `calcularSaldoDevedorAtualizado(devedor, pgtos, hoje)` | Extraído de App.jsx — lógica idêntica, sem duplicação |
| `calcularResumoFinanceiro(devedor, pgtos, hoje)` | Retorna `{ saldo, valorOriginal, totalPago, encargos, diasEmAtraso }` |

### App.jsx

- Importa `calcularSaldoDevedorAtualizado` de `./utils/devedorCalc.js`
- Remove definição inline (~90 linhas) — função agora vive em devedorCalc.js

### filaDevedor.js

- `calcularValorFaceDevedor(d)` helper local (mesmo algoritmo de `calcularValorFace`)
- `calcularScoreDevedor` usa `calcularValorFaceDevedor` em vez de `Number(d.valor_total)`
- Filtros `valor_min` / `valor_max` usam `calcularValorFaceDevedor`

### FilaDevedor.jsx

**Novos componentes:**
- `DividaCell` — valor face em vermelho + "Orig: R$..." se diferente + badge "N dívidas"
- `CredorCell` — credor.nome + numero_processo + div[0].descricao

**FilaPainel:**
- `valorTotalAberto` usa `calcularValorFace(d)` (card Valor em Aberto corrigido)
- Sort de Pendentes usa `calcularValorFace(b) - calcularValorFace(a)`
- Tabela: coluna Valor Dívida → `<DividaCell>` | nova coluna Título/Credor → `<CredorCell>`

**FilaAtendimento:**
- Carrega `pagamentos_parciais` em paralelo com eventos no mount
- Painel "💰 Resumo Financeiro" substitui o antigo painel estático:
  - Destaque: Saldo Devedor Atualizado (calculado com encargos reais)
  - Breakdown: Valor Original | Encargos | Total Pago | Dias em Atraso
  - Dívidas Cadastradas: lista cada divida com descrição, valor, vencimento, dias em atraso, índice

## Success Criteria

| Criterion | Result |
|-----------|--------|
| Valor Dívida ≠ R$ 0,00 na listagem | PASS — usa calcularValorFace(dividas[]) |
| Valores iguais entre Devedores e Fila | PASS — mesma fonte (dividas[] JSONB) |
| DividaCell: face + badge dívidas | PASS |
| CredorCell: credor + processo + descrição | PASS |
| FilaAtendimento: saldo atualizado com encargos | PASS — calcularResumoFinanceiro |
| FilaAtendimento: dívidas detalhadas | PASS |
| calcularSaldoDevedorAtualizado sem duplicação | PASS — devedorCalc.js |
| Build sem erros | PASS |
| Deploy produção | PASS — mrcobrancas.com.br (3932c0a) |
