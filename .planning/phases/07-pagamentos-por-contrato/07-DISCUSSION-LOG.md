# Phase 7: Pagamentos por Contrato - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-22
**Phase:** 07-pagamentos-por-contrato
**Areas discussed:** Layout no DetalheContrato, PAGCON-06 editar pagamento, Parcelas amortizadas detalhe, Saldo devedor cálculo de validação

---

## Layout no DetalheContrato

| Option | Description | Selected |
|--------|-------------|----------|
| Seção Pagamentos com botão | Seção "Pagamentos" entre financial summary e Documentos; botão "Registrar Pagamento" → expande form inline (padrão Adicionar Documento); lista "Pagamentos Recebidos" colapsível abaixo | ✓ |
| Form sempre visível no topo | Form compacto (data + valor + obs + botão) sempre visível, sem toggle | |
| Integrado no final (após Histórico) | Seção "Pagamentos Recebidos" colapsível com botão "+" no header, após Histórico | |

**User's choice:** Seção Pagamentos com botão (padrão do Adicionar Documento)

**Follow-up — Pagamentos Recebidos estado inicial:**

| Option | Description | Selected |
|--------|-------------|----------|
| Recolhida por padrão | Só expande ao clicar — coerente com Histórico (Phase 6) | ✓ |
| Expandida se houver pagamentos | Expande automaticamente se já existe algum pagamento | |

**User's choice:** Recolhida por padrão

---

## PAGCON-06 — Editar pagamento

| Option | Description | Selected |
|--------|-------------|----------|
| Só exclusão | Delete + reversal SP + toast. Advogado exclui e relança se erro. Elimina risco do estorno+re-aplicação | ✓ |
| Edição + exclusão completas | Edição inline com estorno automático + reaplicação. Mais robusto, significativamente mais complexo | |
| Excluído por enquanto, revisar em v1.5 | PAGCON-06 fora da fase; registro + exclusão apenas | |

**User's choice:** Só exclusão
**Notes:** Edição com estorno+re-aplicação fica para v1.5. Simplifica a fase sem impacto real no caso de uso (advogados corrigem excluindo e relançando).

---

## Parcelas amortizadas — detalhe no display

| Option | Description | Selected |
|--------|-------------|----------|
| Só contagem | "3 parcelas amortizadas" — limpo, suficiente | |
| Lista resumida de parcelas | "Parc. 1/12, 2/12, 3/12" — advogado vê quais parcelas fecharam | ✓ |
| Colapsível por pagamento | Contagem no header, lista detalhada ao expandir | |

**User's choice:** Lista resumida — "Parc. 1/12, 2/12, 3/12" por linha de pagamento

---

## Saldo devedor — cálculo de validação

| Option | Description | Selected |
|--------|-------------|----------|
| Soma nominal das parcelas em aberto | Σ valor_total (parc. abertas) - Σ valor (pagamentos_divida). Simples e rápido | |
| Motor de correção monetária completo | calcularSaldoPorDividaIndividual por parcela aberta. Saldo real com encargos até hoje | ✓ |
| Não valida saldo total | Só valida valor > 0 e data ≤ hoje | |

**User's choice:** Motor de correção monetária completo
**Notes:** Saldo calculado ao abrir o form, usando dados já carregados no DetalheContrato. Garante que o advogado não ultrapasse o saldo real com encargos.

---

## Claude's Discretion

- Ordem dos campos no form inline (data vs valor primeiro)
- Estilo visual da lista de parcelas por linha de pagamento
- Loading state no botão durante SP execution
- Empty state quando "Pagamentos Recebidos" vazia
- Se exibir total pago acumulado no header da seção

## Deferred Ideas

- Edição de pagamento (PAGCON-06 completo com estorno+re-aplicação) — v1.5
- Breakdown por componente de amortização — v1.5+
- Forma de pagamento (PIX/TED/boleto) — v1.5+
