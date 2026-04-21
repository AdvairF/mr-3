---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Pagamentos e Contratos
current_plan: 05-04
status: in_progress
last_updated: "2026-04-21T19:53:18Z"
last_activity: "2026-04-21 — Phase 5 Plan 03 complete. DetalheContrato.jsx (header card, green financial summary f0fdf4, parcelas table with lazy saldo via listarPagamentos + calcularSaldoPorDividaIndividual) + ModuloContratos.jsx (4-view state machine lista/detalhe/novo/parcela-detalhe, parcelasPorContrato useMemo Map, contratosAtivos count badge) committed as 4849ee6. All acceptance criteria verified. Próxima: execute plan 05-04."
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 11
  completed_plans: 9
  percent: 82
---

# Mr. Cobranças — Project State

Last activity: 2026-04-21 — Phase 5 Plan 02 complete. NovoContrato.jsx (8-field form with devedor typeahead, D-04 preview, podesSalvar guard) + TabelaContratos.jsx (6 columns, CONTRATO_BADGE_META, Em Atraso from parcelasPorContrato Map) committed as 8b61a11. All acceptance criteria verified. Próxima: execute plan 05-03.

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Valor central:** O advogado vê, num único painel, em que etapa está cada cobrança — e gera a petição certa com um clique.
**Foco atual:** Milestone v1.1 — Pagamentos e Contratos

## Status

**Active Phase:** Phase 5 — Contratos com Parcelas (in progress)
**Current Plan:** 05-03
**Blockers/Concerns:** Supabase migrations (contratos_dividas table + dividas.contrato_id FK) must be run manually before runtime data insertion works

## Roadmap v1.1

| Phase | Goal | Status |
|-------|------|--------|
| 4. Pagamentos por Dívida | Fechar ciclo financeiro da dívida individual — registrar, consultar e corrigir pagamentos com Art. 354 CC | **COMPLETE** — 2026-04-21 |
| 5. Contratos com Parcelas | Modelar contratos com N parcelas como dívidas reais, lista global e detalhe com saldo por parcela | In progress (2/5 plans) |

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
