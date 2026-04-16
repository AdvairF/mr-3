# Quick Task 20260416: Pagamentos Parciais — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Task Boundary

Implementar cadastro de pagamentos parciais no devedor com cálculo iterativo e PDF com planilha detalhada.
Arquivos ativos: `src/mr-3/mr-cobrancas/src/App.jsx`, novo arquivo `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql`

</domain>

<decisions>
## Decisões de Design

### Cálculo com múltiplas dívidas — Abordagem Agregada (v1)
- Somar o saldo atualizado de **todas as dívidas** do devedor até a data do pagamento
- O pagamento parcial abate do **saldo total agregado**
- Para o cálculo iterativo, usar os parâmetros da **primeira dívida não-nominal** como referência de indexador/juros (ou média ponderada se houver divergência significativa)
- Razão: devedor tem uma dívida global com o credor; a decomposição por dívida é contabilidade interna

### Multa apenas no primeiro período
- A multa (multa_pct) é cobrada **apenas uma vez** — no primeiro período de cálculo (da data_inicio_atualizacao até o primeiro pagamento ou data atual)
- Períodos subsequentes calculam apenas correção monetária + juros sobre o saldo restante
- Razão: multa é encargo one-time, não recorrente

### Componente AbaPagamentosParciais
- Definir como função top-level antes de `Devedores` (linha ~1905), seguindo padrão de `CustasAvulsasForm` (linha 1858)
- Receber props: `devedor, onAtualizarDevedor, user, fmt, fmtDate`
- Pagamentos carregados do Supabase tabela `pagamentos_parciais` na montagem do componente

### PDF da planilha
- Orientação landscape (igual `exportarPDF()` linha 4337)
- Colunas: DATA | DESCRIÇÃO / EVENTO | DÉBITO | CRÉDITO | SALDO
- colW = [24, 105, 40, 40, 60] (soma 269 = 297-28)

### Fora de escopo
- Alocação de pagamentos por dívida individual: não implementar em v1
- Edição inline de pagamentos salvos: apenas excluir e re-adicionar
- RLS Supabase: documentar na migration, mas não implementar (seguir padrão das outras tabelas)

</decisions>

<specifics>
## Pontos Específicos

- Nova tab na ficha: adicionar `["pagamentos","💰 Pagamentos"]` ao array da linha 2460
- Inserir painel `{abaFicha === "pagamentos" && <AbaPagamentosParciais ... />}` após linha 2827
- SQL migration: `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql`
- `fmt` e `fmtDate` passados como props (pattern de `imprimirFicha` linha 2450)

</specifics>
