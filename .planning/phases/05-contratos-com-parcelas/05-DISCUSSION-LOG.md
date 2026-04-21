# Phase 5: Contratos com Parcelas — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 05-contratos-com-parcelas
**Areas discussed:** Schema DB, Navegação, Indicação visual, Regras de geração de parcelas, DetalheContrato, Tipos de contrato, Excluir contrato

---

## Schema DB

| Option | Description | Selected |
|--------|-------------|----------|
| Nova tabela `contratos_dividas` + parcelas viram `dividas` | Tabela isolada, não toca a legada `contratos` (FilaDevedor). Parcelas via `dividas.contrato_id` FK. | ✓ |
| Estender tabela `contratos` existente + parcelas viram `dividas` | Adiciona colunas na tabela existente. Mais simples no Supabase, mas FilaDevedor enxerga todos os contratos Phase 5. | |

**User's choice:** Nova tabela `contratos_dividas`
**Notes:** Nome `contratos_dividas` confirmado para evitar conflito com tabela legada `contratos`.

---

## Navegação

| Option | Description | Selected |
|--------|-------------|----------|
| Aba dentro de ModuloDividas | Abas "Dívidas" e "Contratos" dentro do mesmo módulo. | |
| Novo item no sidebar (irmão de ModuloDividas) | Seção "Contratos" separada no sidebar. | ✓ |

**User's choice:** Novo item no sidebar
**Notes:** —

| Option | Description | Selected |
|--------|-------------|----------|
| Botão na lista de contratos | Mesmo padrão do "Nova Dívida". | |
| Também acessível pela ficha do devedor | Pré-seleciona o devedor no formulário. | ✓ |

**User's choice:** Também acessível pela ficha do devedor
**Notes:** Botão "Novo Contrato" fica no header do módulo Contratos E na ficha do devedor.

---

## Indicação visual em TabelaDividas

| Option | Description | Selected |
|--------|-------------|----------|
| Badge de tipo de contrato na coluna de status/credor | `[NF]`, `[C&V]`, `[Empr.]` — badge pequeno, estilo AtrasoCell. | ✓ |
| Ícone de elo + tooltip | Hover mostra nome do contrato. Menos intrusivo. | |

**User's choice:** Badge de tipo de contrato

| Option | Description | Selected |
|--------|-------------|----------|
| DetalheDivida da parcela | Comportamento idêntico às dívidas avulsas. | ✓ |
| DetalheContrato do contrato pai | Navega direto para o contrato. | |

**User's choice:** DetalheDivida da parcela
**Notes:** DetalheDivida pode ter link "Ver contrato pai" (Claude decide).

---

## Regras de geração de parcelas

### Data da 1ª parcela

**User's input (freeform):** Deixar o advogado escolher no form "Novo Contrato". Campo dropdown "Primeira parcela vence em":
- "Mesma data base (NF/Duplicata)" → `primeira_parcela_na_data_base = TRUE` (default)
- "Um mês depois da data base (Compra e Venda / Empréstimo)" → `primeira_parcela_na_data_base = FALSE`

Persiste em coluna `primeira_parcela_na_data_base BOOLEAN` em `contratos_dividas`.

### Valor das parcelas

| Option | Description | Selected |
|--------|-------------|----------|
| Total ÷ N, ajuste de centavos na última | floor(total/N) para N-1 parcelas, última absorve resto. | ✓ |
| Total ÷ N sem ajuste | round(total/N) para todas, pode haver diferença. | |

### Descrição das parcelas

**User's input (freeform):**
- Sem referência: `"{tipo} — Parcela {n}/{total}"` → ex: `"NF/Duplicata — Parcela 1/3"`
- Com referência: `"{referencia} — Parcela {n}/{total}"` → ex: `"NF 1234 — Parcela 1/3"`

Formulário tem campo opcional "Descrição/Referência". Advogado pode editar cada parcela individualmente em DetalheDivida depois.

### Status inicial das parcelas

| Option | Description | Selected |
|--------|-------------|----------|
| 'em cobrança' | Padrão das dívidas avulsas. | ✓ |
| Status próprio de parcela | Ex: 'acordo'. Mais lógica, mais complexidade. | |

---

## DetalheContrato

| Option | Description | Selected |
|--------|-------------|----------|
| Header completo (campos completos, somente leitura) | Tipo, Credor, Devedor, Valor Total, Data Base, Nº Parcelas, Referência. Somente leitura no v1.1. | ✓ |
| Header compacto (linha única resumo) | Uma linha com todos os dados condensados. | |

| Option | Description | Selected |
|--------|-------------|----------|
| Nº \| Vencimento \| Valor \| Saldo \| Status | Saldo calculado via Art.354 por parcela em tempo real. | ✓ |
| Nº \| Vencimento \| Valor \| Status apenas | Sem coluna de saldo na lista. | |

---

## Tipos de contrato

| Option | Description | Selected |
|--------|-------------|----------|
| Dropdown com 3 tipos fixos | NF/Duplicata, Compra e Venda, Empréstimo. Sem "Outro". | ✓ |
| Dropdown + campo livre "Outro" | Mais flexível, mais campos a validar. | |

---

## Excluir contrato

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquear se houver pagamentos | Cascade delete apenas sem pagamentos. | |
| Cascade delete sempre | window.confirm com aviso forte. | |
| Sem exclusão (v1.1) | Funcionalidade não implementada no v1.1. | ✓ |

---

## Claude's Discretion

- Estrutura interna de `ModuloContratos.jsx`
- Visual exato do badge de tipo (cor, tamanho)
- Link "Ver contrato pai" em `DetalheDivida`
- Loading state e erro em `DetalheContrato`
- Ordenação da `TabelaContratos`
- Colunas da lista global de contratos

## Deferred Ideas

- Exclusão de contrato — v1.2
- Edição do header após criação — v1.2
- Tabela Price/SAC com juros embutidos — v1.2
- Auto-update status do contrato — v1.2
- Filtros na lista de contratos — v1.2
