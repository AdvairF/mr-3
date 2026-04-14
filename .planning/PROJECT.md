# Mr. Cobranças

**Tipo:** Brownfield — evolução de sistema existente
**Stack:** React 18 + Vite + Supabase (SPA)
**Deploy:** Vercel

---

## O Que É Isto

Sistema de cobrança jurídica para pequenos escritórios de advocacia (2–10 advogados). Permite gerenciar o ciclo completo de cobrança: do cadastro do devedor ao recebimento, com geração automática de petições, acompanhamento visual por etapas e alertas de prazos.

## Valor Central

**O advogado vê, num único painel, em que etapa está cada cobrança — e gera a petição certa com um clique.**

## Contexto

O sistema já existe com as funcionalidades base funcionando (devedores, credores, processos, petições .docx, calculadora de correção monetária, régua de cobrança, lembretes, relatórios). A evolução agora foca em três pilares:

1. **Visibilidade** — Kanban de cobranças + timeline por devedor
2. **Automação** — Templates editáveis de petição + geração com IA
3. **Alertas** — Notificações automáticas de vencimentos e prazos

O código atual tem um problema crítico de manutenibilidade: `App.jsx` com 6.699 linhas (God Component). A evolução de novas features deve ser acompanhada de extração progressiva de componentes.

## Usuários

- **Advogados do escritório** — criam cobranças, geram petições, acompanham status
- **Admin do escritório** — gestão de usuários e configurações

## Requisitos

### Validados (já existente)

- ✓ Autenticação com Supabase (JWT + fallback local)
- ✓ Cadastro de devedores com dívidas, acordos e parcelas
- ✓ Cadastro de credores
- ✓ Gestão de processos e andamentos
- ✓ Calculadora de correção monetária (IGPM/IPCA/SELIC/INPC)
- ✓ Geração de petições via templates .docx (docxtemplater)
- ✓ Régua de cobrança configurável
- ✓ Lembretes manuais
- ✓ Relatórios básicos
- ✓ Dashboard com KPIs
- ✓ Gestão de usuários (somente admin)

### Ativos (a construir)

- [ ] Kanban de cobranças por etapa (aguardando, notificado, em acordo, encerrado)
- [ ] Timeline cronológica por devedor (histórico de eventos)
- [ ] Alertas automáticos de vencimentos, parcelas atrasadas e prazos processuais
- [ ] Sistema de templates de petição editáveis pelo advogado
- [ ] Mais tipos de petição (execução, monitória, citação, intimação, recurso)
- [ ] Geração de petições com IA (arquitetura preparada, provider a definir)
- [ ] Variáveis de ambiente para credenciais Supabase (segurança)
- [ ] Extração progressiva de componentes do App.jsx monolítico

### Fora do Escopo

- Integração com sistemas de tribunal (TJ/PJe) — complexidade alta, v2
- Assinatura digital de petições — v2
- App mobile — v2
- Multi-tenant SaaS — v2 (hoje: escritório único por instalação)

## Decisões Chave

| Decisão | Racional | Resultado |
|---------|----------|-----------|
| Continuar no stack atual (React + Supabase) | Evitar reescrita, manter deploy Vercel funcionando | — Em andamento |
| IA para petições: definir depois | Não bloquear feature, criar interface agnóstica de provider | — Pendente |
| Extração incremental do App.jsx | Não fazer big-bang refactor — extrair junto com cada nova feature | — Em andamento |
| Kanban como prioridade 1 | Maior ganho imediato de visibilidade para o advogado | — Pendente |

## Restrições Técnicas

- SPA client-side (sem backend Node.js próprio) — lógica server-side via Supabase Functions ou Edge Functions
- Supabase como única fonte de dados
- Deploy via Vercel (branch `main`)
- Sem TypeScript, sem testes automatizados (estado atual)

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
*Última atualização: 2026-04-14 — inicialização do projeto*
