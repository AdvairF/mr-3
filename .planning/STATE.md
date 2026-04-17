# Mr. Cobranças — Project State

Last activity: 2026-04-17 - Completed quick task 260417-r4s: Art. 523 §1º CPC — multa 10% + honorários 10% em Calculadora, Dívida, FilaDevedor, GerarPeticao

## Status

**Active Phase:** None (quick tasks only)
**Blockers/Concerns:** None

### Quick Tasks Completed

| # | Description | Date | Commit | Status | Directory |
|---|-------------|------|--------|--------|-----------|
| 260416-id0 | Criar tabela pagamentos_parciais no Supabase e verificar/criar tabelas faltando | 2026-04-16 | — | Needs Review | [260416-id0-criar-tabela-pagamentos-parciais-no-supa](./quick/260416-id0-criar-tabela-pagamentos-parciais-no-supa/) |
| 260416-k26 | Ajustes planilha pagamentos parciais — resumo executivo completo e detalhamento por período | 2026-04-16 | 1027aa3 | Needs Review | [260416-k26-ajustes-planilha-pagamentos-parciais-res](./quick/260416-k26-ajustes-planilha-pagamentos-parciais-res/) |
| 260416-kl8 | Corrigir valor dívida no painel devedores — saldo real com encargos e pagamentos parciais | 2026-04-16 | 641af4f | Needs Review | [260416-kl8-corrigir-valor-d-vida-no-painel-devedore](./quick/260416-kl8-corrigir-valor-d-vida-no-painel-devedore/) |
| 260416-p3r | Sincronizar alterações dívida painel tempo real — multa/honorários no saldo devedor | 2026-04-16 | 6e27e1a | Needs Review | [260416-p3r-sincronizar-alteracoes-divida-painel-tempo-r](./quick/260416-p3r-sincronizar-alteracoes-divida-painel-tempo-r/) |
| 260416-q9w | Substituir coluna Acordos por dias Atraso no painel devedores — badge 5 tiers + sort | 2026-04-16 | fb1a927 | Needs Review | [260416-q9w-substituir-acordos-por-dias-atraso](./quick/260416-q9w-substituir-acordos-por-dias-atraso/) |
| 260416-nrx | Modal perfil + alterar senha — clicar avatar sidebar abre modal com dados e troca de senha | 2026-04-16 | 0774bb6 | Complete | [260416-nrx-pagina-perfil-alterar-senha](./quick/260416-nrx-pagina-perfil-alterar-senha/) |
| 260416-oez | Dashboard filtro período + 3 cards recebimentos + tabela últimos pagamentos | 2026-04-16 | 1109629 | Complete | [260416-oez-dashboard-filtro-periodo-recebimentos](./quick/260416-oez-dashboard-filtro-periodo-recebimentos/) |
| 260416-rdb | Corrigir dashboard: Recuperado R$0, filtro período, cards clicáveis | 2026-04-16 | bc4e6bd | Complete | [260416-rdb-corrigir-dashboard-recebimentos-filtros](./quick/260416-rdb-corrigir-dashboard-recebimentos-filtros/) |
| 260417-cym | Testar conexao MCP Supabase + schema DDL Kanban: 6 tabelas, RLS, 20 indexes, 7 seed rows | 2026-04-17 | 61a4254 | Verified | [260417-cym-testar-conexao-mcp-supabase-e-executar-s](./quick/260417-cym-testar-conexao-mcp-supabase-e-executar-s/) |
| 260417-dea | Fase 1 — Criar tabelas Fila de Devedor: 6 tabelas, 5 indexes, RLS allow_all, telefones_adicionais | 2026-04-17 | c39b06e | Verified | [260417-dea-correcao-fase-1-criar-tabelas-fila-de-de](./quick/260417-dea-correcao-fase-1-criar-tabelas-fila-de-de/) |
| 260417-dne | Fase 2 — Service layer filaDevedor.js: 7 funcoes, lock otimista, calcularFatorCorrecao(igpm), 19/19 testes passando | 2026-04-17 | 22e9b1f | Complete | [260417-dne-fase02-fila-devedor-backend-logica-servi](./quick/260417-dne-fase02-fila-devedor-backend-logica-servi/) |
| 260417-e59 | CR-01 validateUUID/validateBigInt em 5 funções + CR-02 giro_carteira_dias acessível (max date) — 32/32 testes | 2026-04-17 | 217e29c | Complete | [260417-e59-corrigir-criticals-filadevedor-cr01-cr02](./quick/260417-e59-corrigir-criticals-filadevedor-cr01-cr02/) |
| 260417-f03 | Fase 3 — UI completa Fila de Devedor: 5 telas, FilaDevedor.jsx, listarFila(), menu laranja, deploy mrcobrancas.com.br | 2026-04-17 | 3f9e668 | Complete | [260417-f03-fase03-fila-devedor-ui](./quick/260417-f03-fase03-fila-devedor-ui/) |
| 260417-exu | Simplificar fila: remover bridge operadores, usuario_id BIGINT direto, 4 migrations, botões ação rápida 📞💬📧 | 2026-04-17 | 6e44c12 | Complete | [260417-exu-simplificar-fila-sem-operadores](./quick/260417-exu-simplificar-fila-sem-operadores/) |
| 260417-fad | Fila automática por status: listarDevedoresParaFila, score JS, FilaPainel devedor-centric, poll 30s, 3 migrations | 2026-04-17 | ceded4d | Complete | [260417-fad-fila-automatica-por-status-devedor](./quick/260417-fad-fila-automatica-por-status-devedor/) |
| 260417-g7k | Fix FK usuario_id: drop constraints eventos_andamento+fila_cobranca, extractUsuario helper, usuario_nome/email text | 2026-04-17 | fc8649a | Complete | [260417-g7k-fix-fk-usuario-eventos-andamento](./quick/260417-g7k-fix-fk-usuario-eventos-andamento/) |
| 260417-h5p | Filtro atendimentos (4 tabs), AtendimentoBadge, UltimoAtendimentoCell, valor_total, counters, Dias s/ contato | 2026-04-17 | 2c07d1c | Complete | [260417-h5p-filtro-atendimentos-valor-divida-fila](./quick/260417-h5p-filtro-atendimentos-valor-divida-fila/) |
| 260417-i3m | Valor dívida real (devedorCalc.js), DividaCell, CredorCell, FilaAtendimento resumo financeiro completo | 2026-04-17 | 3932c0a | Complete | [260417-i3m-valor-divida-real-fila-resumo-financeiro](./quick/260417-i3m-valor-divida-real-fila-resumo-financeiro/) |
| 260417-j4n | Detalhar encargos atendimento: calcularDetalheEncargos, breakdown multa/juros/correção/honorários/custas por dívida | 2026-04-17 | ad8661c | Complete | — |
| 260417-k2p | Taxa Legal Art. 406 CC: regime temporal STJ Tema 1368 em correcao.js, info box formulário, dropdown calculadora | 2026-04-17 | a04ab3a | Complete | — |
| 260417-l5r | Juros Art. 406 CC precisos: SELIC período 2 (bug fix), calcularJurosArt406 com 3 regimes, breakdown Calculadora e FilaAtendimento | 2026-04-17 | d1e95af | Complete | — |
| 260417-m3s | Opções simplificadas: taxa_legal_406_12 (12%→TL) e inpc_ipca (INPC→IPCA) com breakdowns, info boxes e painéis na Calculadora | 2026-04-17 | c13e90f | Complete | — |
| 260417-n7q | Fix: dropdown indexador Calculadora usa INDICE_OPTIONS (era hardcoded, faltava inpc_ipca); IDX_LABEL e idxMap corrigidos | 2026-04-17 | 5a06cdb | Complete | — |
| 260417-o4p | Alinhar cálculo TJGO: taxa_legal_406_12 CUT → ago/2024 (jul é último 1%); BCB 15 anos; juros 119.90% vs TJGO 119.71% | 2026-04-17 | e25d1df | Complete | — |
| 260417-p4p | UI Calculadora: fórmula INPC→corrigido→juros, base de cálculo no painel juros, badge TJGO, aviso inpc_ipca | 2026-04-17 | aef74ee | Complete | — |
| 260417-p3q | Fix INPC: dados BCB reais 2011-2026 (58 erros nos estáticos) + cap mês não publicado — fator 1.71025887 = TJGO exato | 2026-04-17 | 1bb57b0 | Complete | — |
| 260417-pg3 | Piso zero todos os índices: deflação ignorada (Art. 406 §3º CC), 14 meses afetados no caso teste, painel visual + badge TJGO atualizado | 2026-04-17 | 761abe8 | Complete | — |
| 260417-ph4 | Histórico BCB desde 1995: INPC 192 meses (1995-2010) + IGP-M 300 meses (1995-2019) + bcbApi 31 anos — fator 2004 alinhado TJGO | 2026-04-17 | dfcf2a5 | Complete | — |
| 260417-qi5 | Fix cache bust v2 + botão Atualizar usa 31 anos (era hardcoded 10) — invalida cache v1 do browser, divergência 2,29→3,29 resolvida | 2026-04-17 | 500337c | Complete | — |
| 260417-r4s | Art. 523 §1º CPC: componente reutilizável, calcularArt523(), Calculadora + Dívida edit + FilaDevedor + GerarPeticao, template cumprimento sentença | 2026-04-17 | 5e5fa25 | Complete | — |
