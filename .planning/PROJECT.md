# Mr. Cobranças

**Tipo:** Brownfield — evolução de sistema existente
**Stack:** React 18 + Vite + Supabase (SPA)
**Deploy:** Vercel (mrcobrancas.com.br)

---

## O Que É Isto

Sistema de cobrança jurídica para pequenos escritórios de advocacia (2–10 advogados). Permite gerenciar o ciclo completo de cobrança: do cadastro do devedor ao recebimento, com geração automática de petições, acompanhamento visual por etapas e alertas de prazos.

## Valor Central

**O advogado vê, num único painel, em que etapa está cada cobrança — e gera a petição certa com um clique.**

## Estado Atual (após v1.0)

- Banco relacional real: tabela `dividas` (UUID PK) + `devedores_dividas` (FK) — sem JSONB embutido
- Módulo Dívidas no sidebar: tabela global com 4 filtros + tela de detalhe + gerenciamento de pessoas vinculadas
- Nova Dívida: criação com co-devedores, busca dropdown, modal criação rápida, salvamento atômico
- Motor de cálculo sequencial (Art. 354 CC, IGPM/IPCA/SELIC/INPC/Art.406/Art.523)
- Suite de regressão Vitest (7 casos TJGO) como prebuild gate
- App.jsx ainda monolítico (~6.700 linhas) — extração progressiva em andamento

## Contexto

O sistema existia com funcionalidades base (devedores, credores, processos, petições .docx, calculadora de correção monetária, régua de cobrança, lembretes, relatórios). O Milestone v1.0 separou o módulo Devedores em Pessoas e Dívidas com banco relacional real e adicionou o fluxo completo de criação de dívida com co-devedores.

A evolução agora foca em:
1. **Pagamentos por dívida** — lançar pagamento direto na tela da dívida (Art.354 por escopo)
2. **Contratos com parcelas** — NF/Duplicatas, Compra e Venda, etc.
3. **Extração progressiva** — reduzir App.jsx junto com cada nova feature

## Usuários

- **Advogados do escritório** — criam cobranças, geram petições, acompanham status
- **Admin do escritório** — gestão de usuários e configurações

## Requisitos

### Validados (v1.0)

- ✓ Banco relacional real: tabela `dividas` UUID PK + `devedores_dividas` FK — v1.0
- ✓ Service layer `dividas.js` com CRUD completo — v1.0
- ✓ `carregarTudo()` paralelo sem JSONB parsing — v1.0
- ✓ Módulo Dívidas no sidebar com tabela global e 4 filtros inline — v1.0
- ✓ AtrasoCell 5-tier badge por data_vencimento — v1.0
- ✓ DetalheDivida com saldo atualizado e gerenciamento de pessoas vinculadas — v1.0
- ✓ DividaForm.jsx componente controlado puro e reutilizável — v1.0
- ✓ Nova Dívida com co-devedores, busca dropdown, modal criação rápida — v1.0
- ✓ Salvamento atômico (criarDivida + adicionarParticipante × N) — v1.0

### Validados (já existente pré-v1.0)

- ✓ Autenticação com Supabase (JWT + fallback local)
- ✓ Cadastro de devedores com dívidas, acordos e parcelas
- ✓ Cadastro de credores
- ✓ Gestão de processos e andamentos
- ✓ Calculadora de correção monetária (IGPM/IPCA/SELIC/INPC/Art.406/Art.523)
- ✓ Geração de petições via templates .docx (docxtemplater)
- ✓ Régua de cobrança configurável
- ✓ Lembretes manuais
- ✓ Relatórios básicos
- ✓ Dashboard com KPIs e filtro de período
- ✓ Gestão de usuários (somente admin)
- ✓ Suite de regressão Vitest como prebuild gate

### Ativos (próximo milestone)

- [ ] Pagamento por dívida específica — lançar pagamento direto na tela DetalheDivida (Art.354 por escopo)
- [ ] Modelo de Contrato com parcelas — NF/Duplicatas, Compra e Venda (pode subsumir Fase 04)
- [ ] Limpeza Supabase — deletar pessoas "Criar %" e dívidas de teste (operacional)
- [ ] Extração progressiva de componentes do App.jsx monolítico
- [ ] Kanban de cobranças por etapa (aguardando, notificado, em acordo, encerrado)
- [ ] Timeline cronológica por devedor (histórico de eventos)
- [ ] Alertas automáticos de vencimentos, parcelas atrasadas e prazos processuais
- [ ] Sistema de templates de petição editáveis pelo advogado

### Fora do Escopo

- Integração com sistemas de tribunal (TJ/PJe) — complexidade alta, v2
- Assinatura digital de petições — v2
- App mobile — v2
- Multi-tenant SaaS — v2 (hoje: escritório único por instalação)
- Geração de petições com IA — v2 (arquitetura preparada)
- Variáveis de ambiente para credenciais Supabase — técnico, fazer quando necessário

## Decisões Chave

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| Continuar no stack atual (React + Supabase) | Evitar reescrita, manter deploy Vercel funcionando | ✓ Confirmado — v1.0 entregue sem reescrita |
| `valor_total` como nome da coluna (não `valor_original`) | Match com `devedorCalc.js` linha 75 | ✓ Funcionou |
| `art523_opcao TEXT` com CHECK 3 valores | Código usa strings enum, não boolean | ✓ Confirmado |
| Aliases compat em carregarTudo() (não no payload) | Payload usa nomes de coluna DB; motor usa aliases | ✓ Isolamento correto |
| Motor de cálculo sequencial mantido (Art. 354 CC) | Sem migration de pagamentos_parciais no v1.0 | ✓ Estável — pagamentos por dívida na v1.1 |
| `devedor_id` em dividas = id do PRINCIPAL (desnormalizado) | Compatibilidade com queries existentes | ⚠️ Manutenção manual em mudanças de PRINCIPAL |
| Sem router — view state local ao ModuloDividas | Sem complexidade extra de roteamento | ✓ Funciona bem para escopo atual |
| Extração incremental do App.jsx | Não fazer big-bang refactor — extrair junto com cada nova feature | — Em andamento |
| IA para petições: definir depois | Não bloquear feature, criar interface agnóstica de provider | — Pendente v2 |

## Restrições Técnicas

- SPA client-side (sem backend Node.js próprio) — lógica server-side via Supabase Functions
- Supabase como única fonte de dados
- Deploy via Vercel (branch `main`)
- Sem TypeScript (estado atual)
- Prebuild gate: `npm run test:regressao` (Vitest, 7 casos TJGO)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Última atualização: 2026-04-20 após milestone v1.0 — Refatoração Estrutural*
