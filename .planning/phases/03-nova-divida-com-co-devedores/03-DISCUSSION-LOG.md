# Phase 3: Nova Dívida com Co-devedores — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 03-nova-divida-com-co-devedores
**Areas discussed:** Container da tela, Criação de pessoa nova, Lista de co-devedores, Reuso técnico, Campos obrigatórios, Pós-salvamento, Escopo MVP

---

## A. Container da tela

| Option | Description | Selected |
|--------|-------------|----------|
| Nova view no ModuloDividas | view='nova' — mesma navegação lista→detalhe já existente, scroll natural | ✓ |
| Modal grande (fullscreen) | Modal ~90% da tela, scroll interno | |
| Drawer lateral | Painel ~500px da direita, menos espaço | |

**Layout interno:** Top-bottom scroll selecionado (campos financeiros → Pessoas → botões). Duas colunas descartado por comportamento inconsistente com muitos co-devedores.

---

## B. Criação de pessoa nova

| Option | Description | Selected |
|--------|-------------|----------|
| Modal rápido "Criar Pessoa" | Nome + CPF/CNPJ + PF/PJ; retorna ao form com pessoa selecionada | ✓ |
| Bloquear — cadastre antes | Mantém D-06 da Fase 2, perde fluxo diário | |
| Link "abrir Pessoas" | Abre módulo Pessoas, perde estado do form | |

**Papel padrão:** Herdado do contexto da linha (Principal ou Coobrigado conforme onde o usuário estava buscando).

**Notas:** D-06 da Fase 2 foi revisado — aquele contexto era o Detalhe de dívida existente (caso raro). O fluxo de criação diária justifica o modal rápido.

---

## C. Lista de co-devedores no form

| Option | Description | Selected |
|--------|-------------|----------|
| Cards por linha com × | Nome + select papel + select responsabilidade + botão ✕ | ✓ |
| Tabela compacta | Colunas: Nome, Papel, Responsabilidade, Remover | |
| Chips simples | [Nome ×] — sem responsabilidade visível | |

---

## D. Reuso técnico do form

| Option | Description | Selected |
|--------|-------------|----------|
| Extrair DividaForm.jsx | Componente reutilizável; App.jsx inline refatorado para usar DividaForm | ✓ |
| Duplicar form simplificado | NovaDivida.jsx com JSX próprio; App.jsx não muda | |

---

## E. Campos obrigatórios

| Option | Description | Selected |
|--------|-------------|----------|
| Valor + Vencimento + 1 Principal | Credor não obrigatório (já existem credor_id null em produção) | ✓ |
| Valor + Vencimento + Credor + 1 Principal | Mais rígido, incompatível com estado atual de produção | |

---

## F. Pós-salvamento

| Option | Description | Selected |
|--------|-------------|----------|
| Volta para lista + toast | carregarTudo() → atualiza sidebar + dashboard | ✓ |
| Permanece no form zerado | Pronto para próxima dívida, mas sem feedback claro | |

---

## G. Validações de erro

| Option | Description | Selected |
|--------|-------------|----------|
| Hard block inline | Botão Salvar desabilitado sem Principal; dropdown omite pessoas já vinculadas | ✓ |
| Toast de erro no submit | Mais permissivo no form | |

---

## H. Escopo MVP

| Option | Description | Selected |
|--------|-------------|----------|
| Criar apenas (sem edição via NovaDivida) | Edição mantém fluxo D-04 existente; sem rascunho | ✓ |
| Incluir edição de dívida via NovaDivida | Modo edit; elimina redirect atual, mas amplia escopo | |

---

## Claude's Discretion

- Estrutura visual exata dos cards de pessoa
- Debounce e mínimo de chars na busca de pessoas
- Estado de loading no botão Salvar
- Tratamento de erro de rede no save
- Ordem dos papéis no select dropdown
- Como tratar `devedor_id` desnormalizado quando há múltiplos Principais

## Deferred Ideas

- Editar dívida existente via NovaDivida.jsx — Fase 4
- Clonar dívida — Fase 4
- Templates por credor — Fase 4
- Rascunho / autosave — Fase futura
