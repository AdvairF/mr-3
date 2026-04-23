---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: "Pagamentos por Contrato + PDF Demonstrativo"
current_plan: COMPLETE
status: Phase 7.1 complete — 07.1-01 executed (Bug A + Bug B fixed, 9/9 regressão verde)
last_updated: "2026-04-23T01:27:34Z"
last_activity: 2026-04-23 — Phase 7.1 plan 07.1-01 executado. Bug A (isPagamento render branch) e Bug B (fmtDataHora timezone) corrigidos em DetalheContrato.jsx. Submodule mr-3 commitado (5a0fc40), bump no pai (c4f6b9f). 9/9 testes passando. Nenhum push executado.
progress:
  total_phases: 1
  completed_phases: 1
  total_plans: 6
  completed_plans: 6
  percent: 100
---

# Mr. Cobranças — Project State

Last activity: 2026-04-23 — Phase 7.1 plan 07.1-01 executado. Bug A (isPagamento render branch) e Bug B (fmtDataHora timezone) corrigidos em DetalheContrato.jsx. Submodule mr-3 commitado (5a0fc40), bump no pai (c4f6b9f). 9/9 testes passando. Nenhum push executado.

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-22)

**Valor central:** O advogado vê, num único painel, em que etapa está cada cobrança — e gera a petição certa com um clique.
**Foco atual:** Milestone v1.4 — Pagamentos no nível do Contrato + PDF Demonstrativo.

## Current Position

```
Phase 7.1: Fix Histórico Pagamentos  [COMPLETE] (1/1 plans)

Phase 7: Pagamentos por Contrato     [ COMPLETE ]
Phase 8: PDF Demonstrativo           [ NOT STARTED ]
```

## Status

**Active Phase:** — (Phase 7.1 completa; próximo: Phase 8 ou novo UAT)
**Current Plan:** COMPLETE (07.1-01)
**Blockers/Concerns:** Nenhum. Aguardar UAT pós-fix para confirmar Bug A e Bug B corrigidos. Bug saldo residual: diagnóstico inconclusivo — validar com banco limpo.

## Phase 7.1 Decisions

| Decisão | Resolução |
|---------|-----------|
| fmtDataHora timezone | toLocaleDateString com timeZone America/Sao_Paulo — corrige offset UTC em TIMESTAMPTZ |
| isPagamento guard em diffEntries | !isCriacao && !isPagamento evita cálculo desnecessário de diff entries para eventos de pagamento |
| snap.data_pagamento usa fmtData | Coluna DATE — slice correto. evento.created_at usa fmtDataHora (TIMESTAMPTZ) |
| Sem push | Commits apenas locais — aguardando autorização explícita do usuário |

## Roadmap v1.4

| Phase | Goal | Plans | Status |
|-------|------|-------|--------|
| 7. Pagamentos por Contrato | Registrar pagamentos com amortização Art. 354 CC, seção colapsável, edit/delete com reversão | 4 | Not started |
| 8. PDF Demonstrativo | Gerar PDF demonstrativo com parcelas, pagamentos e totais | 2 | Not started |

## Architecture Decisions (v1.4)

| Decisão | Resolução |
|---------|-----------|
| Atomicidade da amortização | Stored procedure PL/pgSQL (`registrar_pagamento_contrato`) — evita amortização parcial em caso de falha |
| Reversão de pagamento | Stored procedure PL/pgSQL separada (`reverter_pagamento_contrato`) — estorno + re-aplicação |
| CHECK constraint primeiro | ALTER contratos_historico CHECK antes de qualquer código de service — unblocks todo código F1 |
| Service file novo | `src/services/pagamentos_contrato.js` importa de `pagamentos.js` + `contratos.js` |
| normalizarDivida obrigatório | Todo fetch de parcela no novo service deve passar por `normalizarDivida()` (bypass do alias injection do carregarTudo) |
| PDF library | jsPDF + jspdf-autotable + NotoSans font — instalar só na Phase 8, plano 8-1 |
| PDF utility | `src/utils/pdfDemonstrativo.js` — isolado de DetalheContrato |
| TIPO_EVENTO_LABELS | DetalheContrato.jsx precisa de entradas para `pagamento_recebido` e `pagamento_revertido` — feito no plan 7-3 |

## Build Order (v1.4)

**Phase 7:**

- 7-1: DB migration (ALTER CHECK) + stored procedures `registrar_pagamento_contrato` + `reverter_pagamento_contrato`
- 7-2: `pagamentos_contrato.js` service (wraps stored procedures + `listarPagamentosContrato`)
- 7-3: DetalheContrato payment form (PAGCON-01, PAGCON-03, PAGCON-05) + TIPO_EVENTO_LABELS fix (HIS-05 partial)
- 7-4: Seção "Pagamentos Recebidos" (PAGCON-04) + edit/delete (PAGCON-06)

**Phase 8:**

- 8-1: npm install jspdf + jspdf-autotable + NotoSans + `pdfDemonstrativo.js` utility (PDF-01..04)
- 8-2: DetalheContrato PDF button + `handleGerarPDF` integration

## Previous Milestone Context

### Commits v1.3 disponíveis (reutilizáveis)

| Commit | Arquivo | Nota |
|--------|---------|------|
| `962198e` | DiretrizesContrato.jsx (criado) | Reutilizável sem alteração |
| `c1e5c03` | DividaForm.jsx (refatorado) | Melhoria legítima, manter |
| `7efb16f` | NovoContrato.jsx (encargos) | Form válido — adaptar para novo modelo |
| `ec60b1c` | contratos.js (propagação) | Lógica de propagação reutilizável |

## Pendências para próximo milestone

1. **Limpeza Supabase** — Deletar pessoas com nome "+ Criar %" e dívidas de teste (R$ 1, R$ 2, R$ 3, R$ 100 criadas nos testes de 2026-04-20)
2. **Config Vercel** — Desabilitar auto-deploy preview do submodule mr-3

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-04-20:

| Category | Item | Status |
|----------|------|--------|
| quick_task | calculadora-ui-melhorias | missing summary |
| quick_task | pagamentos-parciais-calculo-devedor | missing summary |
| quick_task | 260415-b6c-melhorias-ui-acessibilidade | missing summary |
| quick_task | 260415-ide-correcoes-ui-review | missing summary |
| quick_task | 260415-iov-botoes-excluir-refatoracao | missing summary |
| quick_task | 260416-fuq-substituir-todos-os-icones-de-lixeira | missing summary |
| quick_task | 260416-gdo-diagnostico-persistencia-supabase | missing summary |
| quick_task | 260416-gp2-corrigir-persistencia-supabase | missing summary |
| quick_task | 260416-h8p-calculadora-ui-melhorias | missing summary |
| quick_task | 260416-id0-criar-tabela-pagamentos-parciais | missing summary |
| quick_task | 260416-k26-ajustes-planilha-pagamentos-parciais | missing summary |
| quick_task | 260416-kl8-corrigir-valor-divida-painel | missing summary |
| quick_task | 260416-nrx-pagina-perfil-alterar-senha | missing summary |
| quick_task | 260416-oez-dashboard-filtro-periodo | missing summary |
| quick_task | 260416-p3r-sincronizar-alteracoes-divida | missing summary |
| quick_task | 260416-q9w-substituir-acordos-por-dias-atraso | missing summary |
| quick_task | 260416-rdb-corrigir-dashboard-recebimentos | missing summary |
| quick_task | 260417-cym-testar-conexao-mcp-supabase | missing summary |
| quick_task | 260417-dea-criar-tabelas-fila-devedor | missing summary |
| quick_task | 260417-dne-fila-devedor-service | missing summary |
| quick_task | 260417-e59-criticals-filadevedor-cr01-cr02 | missing summary |
| quick_task | 260417-exu-simplificar-fila-sem-operadores | missing summary |
| quick_task | 260417-f03-fila-devedor-ui | missing summary |
| quick_task | 260417-fad-fila-automatica-por-status | missing summary |
| quick_task | 260417-g7k-fix-fk-usuario-eventos | missing summary |
| quick_task | 260417-h5p-filtro-atendimentos-valor-divida | missing summary |
| quick_task | 260417-i3m-valor-divida-real-fila | missing summary |
| quick_task | 260417-k2p-taxa-legal-art406 | missing summary |
| quick_task | 260417-m3s-opcoes-simplificadas-taxa-legal | missing summary |
| quick_task | 260417-p3q-fix-inpc-dados-bcb | missing summary |
| quick_task | 260417-pg3-piso-zero-indices | missing summary |
| quick_task | 260417-t6u-suite-testes-regressivos | missing summary |
| quick_task | 260417-ttn-ajustes-art523-dividas | missing summary |
| quick_task | 260417-ull-unificar-planilhas | missing summary |
| quick_task | 260418-hr7-processos-judiciais | missing summary |
| quick_task | 260418-ilc-pessoas-vinculadas-devedor | missing summary |

Known deferred items at close: 36 (quick tasks completos sem SUMMARY.md individual)
