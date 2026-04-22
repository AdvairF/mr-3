# Phase 7: Pagamentos por Contrato - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Advogado registra pagamentos no nível do Contrato com amortização automática das parcelas em aberto pela mais antiga (Art. 354 CC) via stored procedure PL/pgSQL. Vê seção colapsável "Pagamentos Recebidos" com lista cronológica. Pode excluir pagamentos com reversão completa da amortização e registro de evento em `contratos_historico`.

**O que ENTRA nesta fase:**
- Migration 3: ALTER CHECK constraint em `contratos_historico` para adicionar `pagamento_recebido` e `pagamento_revertido`
- Migration 4: Stored procedures PL/pgSQL `registrar_pagamento_contrato` e `reverter_pagamento_contrato`
- Nova tabela `pagamentos_contrato` (registro dos pagamentos a nível de contrato: data, valor, observação, contrato_id)
- `contratos.js`: funções `registrarPagamentoContrato`, `excluirPagamentoContrato`, `listarPagamentosContrato`
- Form "Registrar Pagamento" no DetalheContrato: data, valor, observação
- Seção "Pagamentos Recebidos" colapsável no DetalheContrato
- PAGCON-05: validação no form (valor > 0, valor ≤ saldo calculado, data ≤ hoje)
- HIS-05: evento `pagamento_recebido` em `contratos_historico` com snapshot; `pagamento_revertido` na exclusão

**O que NÃO entra:**
- Edição de pagamento (PAGCON-06 simplificado para só exclusão — edição fica para v1.5)
- PDF demonstrativo — Phase 8
- Breakdown por componente (juros/multa/principal) — deferred
- Forma de pagamento (PIX/TED) — deferred

</domain>

<decisions>
## Implementation Decisions

### D-01 — Layout no DetalheContrato
Seção "Pagamentos" posicionada **entre o financial summary e a seção Documentos**. Estrutura:
1. Botão "Registrar Pagamento" → expande form inline (mesmo padrão do "Adicionar Documento" existente)
2. Abaixo do form: seção "Pagamentos Recebidos" colapsável
Seção "Pagamentos Recebidos" começa **recolhida por padrão** (mesmo padrão da seção "Histórico" da Phase 6).

### D-02 — PAGCON-06 simplificado: só exclusão
**Edição de pagamento está FORA desta fase.** PAGCON-06 implementa apenas **exclusão**:
- Botão [X] por linha em "Pagamentos Recebidos"
- `window.confirm()` com "Excluir este pagamento vai reverter a amortização das parcelas. Confirmar?"
- SP `reverter_pagamento_contrato` desfaz amortização atomicamente
- Evento `pagamento_revertido` registrado em `contratos_historico`
- Toast "Pagamento excluído. Amortização revertida."

Edição com estorno+re-aplicação fica para v1.5. Advogado exclui e relança se houver erro.

### D-03 — Parcelas amortizadas — lista resumida no display
Em "Pagamentos Recebidos", cada linha mostra: data | valor total | **lista resumida de parcelas** | observação | [X].
Formato parcelas: `Parc. 1/12, 2/12, 3/12` (número sequencial / total de parcelas do contrato).
A SP precisa retornar quais parcelas foram amortizadas para construção desta lista.

### D-04 — Saldo devedor — motor de correção monetária completo
PAGCON-05 calcula o saldo devedor total via `calcularSaldoPorDividaIndividual` por cada parcela aberta (saldo_quitado = false), somando os resultados. Motor executa com dados já carregados no DetalheContrato ao abrir o form "Registrar Pagamento".
Validação: `valor_pagamento > saldo_calculado → bloqueio com toast de erro específico`.

### D-05 — Toast pós-registro (PAGCON-03)
Toast: `"Pagamento registrado. N parcela(s) amortizada(s)."` onde N vem do retorno da SP.

### Claude's Discretion
- Ordem dos campos no form inline (data vs valor primeiro)
- Estilo visual da lista de parcelas na linha de pagamento (badge inline vs texto simples)
- Loading state no botão "Salvar" durante execução da SP (spinner, mesmo padrão Phase 6)
- Empty state de "Pagamentos Recebidos" quando lista vazia: "Nenhum pagamento registrado."
- Exibir ou não o total pago acumulado no header da seção "Pagamentos Recebidos"

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Service e modelo de dados de contratos
- `src/mr-3/mr-cobrancas/src/services/contratos.js` — service base: criarContrato, editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico; Phase 7 adiciona registrarPagamentoContrato, excluirPagamentoContrato, listarPagamentosContrato
- `.planning/phases/05-contratos-com-parcelas/05-CONTEXT.md` — modelo 3 níveis: Contrato → Documento → Parcela; schema de contratos_dividas, documentos_contrato, dividas.contrato_id

### Componente alvo
- `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx` — componente onde form e seção Pagamentos Recebidos serão adicionados (635 linhas — ler antes de planejar)

### Amortização por parcela individual (Art. 354 CC)
- `src/mr-3/mr-cobrancas/src/services/pagamentos.js` — `calcularSaldoPorDividaIndividual` — reutilizar para cálculo de saldo de validação (D-04)
- `.planning/phases/04-pagamentos-por-divida/04-CONTEXT.md` — decisões D-01..D-08 do mecanismo de pagamentos por dívida (padrão que este fase estende para o nível contrato)

### Histórico de eventos (Phase 6)
- `.planning/phases/06-edicao-de-contrato-historico/06-CONTEXT.md` — D-03 (timeline), D-06 (window.confirm pattern), schema contratos_historico, TIPO_EVENTO_LABELS em DetalheContrato.jsx
- `src/mr-3/mr-cobrancas/src/services/contratos.js:registrarEvento` — função existente para HIS-05

### Migrations pendentes (v1.4)
- `.planning/ROADMAP.md` §"Deploy Notes — SQL Migrations (v1.4)" — Migration 3 (ALTER CHECK) e Migration 4 (stored procedures) — executar antes de qualquer código de service da Phase 7

### RLS pattern (CRÍTICO)
- `.planning/memory/feedback_supabase_rls_pattern.md` — RLS MUST use `USING(true) WITH CHECK(true)`, NÃO `auth.role()='authenticated'`

### Requisitos
- `.planning/REQUIREMENTS.md` — PAGCON-01..06, HIS-05 (v1.4 requirements)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DetalheContrato.jsx:Spinner` — componente de loading já definido localmente, reutilizar no botão "Salvar Pagamento"
- `DetalheContrato.jsx:fmtBRL` + `fmtData` — helpers de formatação disponíveis localmente
- `contratos.js:registrarEvento` — função existente para HIS-05; reutilizar sem modificação
- `calcularSaldoPorDividaIndividual` (pagamentos.js) — reutilizar para D-04 saldo total
- `dbGet`, `dbInsert`, `dbDelete` (supabase.js) — helpers para novo service de pagamentos contrato
- `window.confirm()` — padrão já estabelecido para confirmações destrutivas (D-02)
- `toast.success()` / `toast.error()` (react-hot-toast) — padrão de feedback em uso

### Established Patterns
- Toggle colapsável: `const [aberto, setAberto] = useState(false)` — replicar para "Pagamentos Recebidos" (mesmo padrão do Histórico)
- Botão → form inline: `adicionandoDocumento` boolean + conditional render — replicar como `registrandoPagamento` boolean para D-01
- Spinner no botão durante save: pattern do Phase 6 (editarContrato + cascatear)
- Inline CSS com hex values — sem Tailwind ou CSS modules
- `useEffect(() => listar(...).then(set...), [contrato.id])` — lazy load no mount

### Integration Points
- `DetalheContrato.jsx` — adicionar: state `registrandoPagamento`, state `pagamentosContrato`, state `saldoCalculado`, seção "Pagamentos" (form + lista)
- `contratos.js` — adicionar: `registrarPagamentoContrato` (chama SP via supabase.rpc), `excluirPagamentoContrato` (chama SP reverter), `listarPagamentosContrato`
- Supabase: nova migration para tabela `pagamentos_contrato` + stored procedures
- `App.jsx` — provavelmente nenhuma alteração (DetalheContrato já recebe dividas como props)
- CHECK constraint `contratos_historico.tipo_evento` — Migration 3 adiciona `pagamento_recebido` e `pagamento_revertido`

### Known Constraints
- Sem TypeScript; styling: `style={{}}` com hex values
- RLS: `USING(true) WITH CHECK(true)` — NÃO usar `auth.role()='authenticated'`
- App.jsx ainda monolítico (~8.400 linhas) — não adicionar lógica lá
- Supabase RPC para stored procedures: `supabase.rpc('registrar_pagamento_contrato', params)` — não `dbInsert`

</code_context>

<specifics>
## Specific Ideas

- Form "Registrar Pagamento" com mesma UX do "Adicionar Documento": botão colapsa/expande, campos ficam visíveis, submit com loading state
- Lista "Pagamentos Recebidos" recolhida por padrão — coerente com seção "Histórico" (Phase 6)
- Cada linha de pagamento: `[data] [valor] [lista parcelas ex: Parc. 1/12, 2/12] [obs] [X excluir]`
- Confirm para exclusão: `"Excluir este pagamento vai reverter a amortização das parcelas. Confirmar?"`
- Toast de sucesso após registro: `"Pagamento registrado. N parcela(s) amortizada(s)."`
- Toast de erro de saldo: `"Valor superior ao saldo devedor (R$X)."`
- Saldo calculado (D-04) carregado ao montar o form (ao clicar "Registrar Pagamento"), usando parcelas e pagamentos já disponíveis no DetalheContrato como props/state

</specifics>

<deferred>
## Deferred Ideas

- Edição de pagamento (PAGCON-06 estorno+re-aplicação) — v1.5
- Breakdown por componente de amortização (juros/multa/principal por parcela) — v1.5+
- Forma de pagamento (PIX/TED/boleto) — v1.5+
- Auto-update status do contrato quando todas as parcelas quitadas — future
- Total pago acumulado visível no header da seção sem precisar expandir — Claude pode incluir se conveniente

</deferred>

---

*Phase: 07-pagamentos-por-contrato*
*Context gathered: 2026-04-22*
