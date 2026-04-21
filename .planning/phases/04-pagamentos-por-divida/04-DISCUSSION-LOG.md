# Phase 4: Pagamentos por Dívida — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 04-pagamentos-por-divida
**Areas discussed:** Arquitetura da tabela, UX em DetalheDivida, Carregamento dos dados, Badge "Saldo quitado"

---

## Arquitetura da tabela

| Option | Description | Selected |
|--------|-------------|----------|
| Posição B — nova tabela `pagamentos_divida` | FK `divida_id NOT NULL`, isolamento limpo, Art.354 por escopo, requer migration nova | ✓ |
| Posição A — reutilizar `pagamentos_parciais` | Adicionar `divida_id UUID NULL` na tabela existente, zero risco de migration destrutiva | |

**User's choice:** Posição B — nova tabela `pagamentos_divida`

| Option | Description | Selected |
|--------|-------------|----------|
| Art.354 só dos pagamentos desta dívida | Motor aplicado apenas sobre `pagamentos_divida` filtrados por `divida_id` | ✓ |
| Manter lógica do devedor + nova tabela | Dois cálculos separados convivendo | |

**User's choice:** Art.354 somente no escopo da dívida específica

---

## UX em DetalheDivida

| Option | Description | Selected |
|--------|-------------|----------|
| Seção fixa no final da tela | Formulário sempre visível: histórico acima, form abaixo | ✓ |
| Botão que expande seção | `+ Registrar Pagamento` expande formulário inline | |

**User's choice:** Seção fixa no final da tela

| Option | Description | Selected |
|--------|-------------|----------|
| Editar inline na linha | Linha vira campos editáveis, padrão PessoasVinculadas.jsx | ✓ |
| Modal de edição | Botões abrem modal dedicado | |

**User's choice:** Editar inline na linha

| Option | Description | Selected |
|--------|-------------|----------|
| window.confirm() simples | Padrão existente em toda a aplicação | ✓ |
| Toast com desfazer (undo) | Excluir + toast "Desfazer" por 5s, requer rollback | |

**User's choice:** window.confirm() simples

---

## Carregamento dos dados

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy: carrega ao abrir DetalheDivida | Query `pagamentos_divida?divida_id=eq.{id}` no useEffect | ✓ |
| Global: incluir em carregarTudo() | Adicionar ao fluxo global, passar via prop | |

**User's choice:** Lazy — carrega ao montar DetalheDivida

---

## Badge "Saldo quitado"

| Option | Description | Selected |
|--------|-------------|----------|
| Só em DetalheDivida | Badge apenas na tela de detalhe (PAG-06 original) | |
| DetalheDivida + tabela global | Badge também em TabelaDividas via `dividas.saldo_quitado` | ✓ |

**User's choice:** DetalheDivida + tabela global

| Option | Description | Selected |
|--------|-------------|----------|
| Coluna `saldo_quitado BOOLEAN` em `dividas` | Service atualiza após cada operação; TabelaDividas lê a coluna | ✓ |
| Calcular na listagem via query | JOIN/subquery na listagem — risco de performance | |

**User's choice:** Coluna `saldo_quitado BOOLEAN DEFAULT FALSE` em `dividas`

**Notes:** Discussão gerou dois novos requirements adicionados ao REQUIREMENTS.md:
- PAG-07: `dividas.saldo_quitado` atualizado automaticamente após cada operação de pagamento
- PAG-08: Badge "Saldo quitado" na TabelaDividas lendo `dividas.saldo_quitado`
- "Auto-update `dividas.status`" removido de Future Requirements (substituído por `saldo_quitado`)

---

## Claude's Discretion

- Estrutura interna do componente `PagamentosDivida.jsx`
- Tratamento de estado de loading/erro
- Ordem dos campos no formulário
- Visual exato do badge "Saldo quitado"

## Deferred Ideas

- Breakdown por componente (juros/multa/principal) — v1.2
- Forma de pagamento (PIX/TED/boleto) — v1.2
- Comprovante PDF — v1.2
- Toast com "desfazer" na exclusão — complexidade não justificada agora
