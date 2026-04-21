# Phase 4: Pagamentos por Dívida — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Fechar o ciclo financeiro de uma dívida individual: registrar pagamentos com data, valor e observação diretamente em `DetalheDivida`, ver o histórico cronológico, corrigir lançamentos errados, e saber quando a dívida está quitada — tanto na tela de detalhe quanto na listagem global.

**O que ENTRA nesta fase:**
- Nova tabela `pagamentos_divida` no Supabase (FK `divida_id`)
- Nova coluna `dividas.saldo_quitado BOOLEAN DEFAULT FALSE`
- Service layer `src/services/pagamentos.js` (CRUD sobre `pagamentos_divida` + update de `saldo_quitado`)
- Seção de pagamentos em `DetalheDivida.jsx`: formulário fixo + histórico inline com edição
- Badge "Saldo quitado" em `DetalheDivida` e na `TabelaDividas` (ModuloDividas global)
- Extração de `PagamentosDivida.jsx` como componente autônomo (extração incremental)

**O que NÃO entra nesta fase:**
- Fluxo antigo via `pagamentos_parciais` (não alterar, não migrar dados)
- Breakdown por componente (juros/multa/principal) — v1.2
- Forma de pagamento (PIX/TED/boleto) — v1.2
- Comprovante PDF — v1.2
- Auto-update `dividas.status` para "quitada" — substituído por `saldo_quitado` (mais simples)

</domain>

<decisions>
## Implementation Decisions

### D-01 — Arquitetura da tabela (LOCKED)

**Posição B: nova tabela `pagamentos_divida` com FK `divida_id`.**

```sql
CREATE TABLE public.pagamentos_divida (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  divida_id UUID NOT NULL REFERENCES public.dividas(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pagamentos_divida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.pagamentos_divida
  FOR ALL USING (auth.role() = 'authenticated');
```

Motivação: isolamento limpo por dívida, extensibilidade para Phase 5 (parcelas de contrato), auditabilidade. A tabela `pagamentos_parciais` (escopo por devedor) não é alterada nem migrada — continua funcionando para o fluxo antigo via ficha do devedor.

### D-02 — Escopo do Art. 354 CC (LOCKED)

Art.354 CC aplicado **somente** sobre os pagamentos de `pagamentos_divida` filtrados por `divida_id`. Cada dívida é um escopo financeiro independente. Os pagamentos da ficha do devedor (`pagamentos_parciais`) **não interferem** no saldo calculado em `DetalheDivida`.

Motor de cálculo: reutilizar a lógica iterativa de `devedorCalc.js` (`calcularSaldosPorDivida`), adaptando a entrada para receber apenas os pagamentos de uma dívida específica.

### D-03 — Coluna saldo_quitado (LOCKED)

```sql
ALTER TABLE public.dividas ADD COLUMN saldo_quitado BOOLEAN DEFAULT FALSE;
```

Atualizado **após cada operação de pagamento** (criar / editar / excluir):
- Recalcular saldo com Art.354 sobre todos os pagamentos da dívida
- Se saldo ≤ 0 → `dividas.saldo_quitado = TRUE`
- Se saldo > 0 → `dividas.saldo_quitado = FALSE`

Isso permite que `TabelaDividas` leia `saldo_quitado` da coluna sem precisar calcular na listagem.

### D-04 — UX: Layout da seção de pagamentos em DetalheDivida (LOCKED)

Seção fixa no final da tela — formulário sempre visível, sem botão para expandir:

```
[ DetalheDivida ]

  Dívida: R$ 10.000  Vencimento: 15/01/2025
  Devedor: João Silva  Credor: Banco X
  Saldo atual: R$ 12.340 (corrigido)  [Saldo quitado]  ← badge se ≤ 0

  ─────────────── Histórico de Pagamentos ──────────────
  01/03/2025  R$ 1.000  parcela    [editar] [excluir]
  15/04/2025  R$ 500               [editar] [excluir]
  (vazio: "Nenhum pagamento registrado")

  ─────────────── Registrar Pagamento ──────────────────
  Data: [____]  Valor: [______]  Obs: [____________]
                                           [Salvar]
```

### D-05 — UX: Edição inline no histórico (LOCKED)

Clicar em [editar] transforma a linha em campos editáveis inline — mesmo padrão de `PessoasVinculadas.jsx`. Botões [OK] / [X] confirmam ou descartam. **Sem modal de edição.**

### D-06 — UX: Confirmação de exclusão (LOCKED)

`window.confirm("Excluir este pagamento?")` — padrão já usado em toda a aplicação. Sem toast com undo.

### D-07 — Carregamento de pagamentos (LOCKED)

`DetalheDivida` faz query **lazy** ao montar:

```js
useEffect(() => {
  dbGet('pagamentos_divida',
    `divida_id=eq.${divida.id}&order=data_pagamento.asc`
  ).then(setPagamentos);
}, [divida.id]);
```

Não adicionar `pagamentos_divida` ao `carregarTudo()` global. Dados frescos a cada abertura do detalhe. Padrão já usado por `FilaDevedor.jsx` (carrega eventos ao montar).

### D-08 — Badge "Saldo quitado": visibilidade (LOCKED)

Badge exibido em **dois lugares**:
1. `DetalheDivida` — ao lado do saldo calculado, quando saldo ≤ 0 (calculado em tempo real)
2. `TabelaDividas` (ModuloDividas global) — na coluna de status/atraso, lendo `dividas.saldo_quitado`

A `TabelaDividas` usa o valor persistido na coluna, não recalcula. `DetalheDivida` calcula em tempo real e sincroniza o banco ao salvar/editar/excluir.

### Claude's Discretion

- Estrutura interna do componente `PagamentosDivida.jsx` (props, separação de subcomponentes)
- Tratamento de estado de loading e erro dentro do componente
- Ordem dos campos no formulário de registro (data / valor / observação)
- Visual exato do badge "Saldo quitado" (cor, ícone) — seguir padrão de `AtrasoCell.jsx` e `StatusBadgeDivida`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Motor de cálculo
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — Art.354 CC: `calcularSaldosPorDivida`, `calcularTotalPagoPorDivida`. Adaptar entrada para receber pagamentos de uma única dívida.
- `src/mr-3/mr-cobrancas/src/utils/correcao.js` — funções de correção monetária usadas pelo motor

### Componente de entrada
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — ponto de integração principal; já recebe `divida`, `devedores`, `credores`, `allPagamentos`, `hoje`, `onVoltar`, `onCarregarTudo`, `setTab`

### Padrões de UI a seguir
- `src/mr-3/mr-cobrancas/src/components/PessoasVinculadas.jsx` — padrão de edição inline em lista
- `src/mr-3/mr-cobrancas/src/components/AtrasoCell.jsx` — padrão visual de badges por status
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — padrão de subcomponente dentro de DetalheDivida

### Padrão de service layer
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — padrão de CRUD com `dbGet`/`dbInsert`/`dbUpdate`/`dbDelete`
- `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — padrão de carregamento lazy ao montar (linhas 569–578)

### Tabela global de dívidas
- `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` — onde adicionar badge "Saldo quitado"
- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — orquestrador do módulo

### Requirements
- `.planning/REQUIREMENTS.md` — PAG-01 a PAG-08 (todos mapeados para Phase 4)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `devedorCalc.js:calcularSaldosPorDivida` — motor Art.354 já implementado; adaptar para receber `pagamentos_divida[]` filtrados por `divida_id`
- `devedorCalc.js:calcularTotalPagoPorDivida` — total pago por dívida; mesma adaptação
- `PessoasVinculadas.jsx` — padrão completo de lista com edição inline + confirmação de exclusão
- `AtrasoCell.jsx` — sistema de badges por status; adicionar tier "quitada" ou `saldo_quitado`
- `services/dividas.js` — CRUD existente; estender com `atualizarSaldoQuitado(divida_id)`

### Established Patterns
- Carregamento lazy ao montar: `useEffect(() => dbGet(...).then(set...), [id])` — ver `FilaDevedor.jsx:569`
- Subcomponente dentro de DetalheDivida: `DevedoresDaDivida.jsx` como referência de props e callbacks
- `dbGet` / `dbInsert` / `dbUpdate` / `dbDelete` — utilitários globais (não há import direto, usados como globals em App.jsx)
- Toast de sucesso/erro: `toast.success()` / `toast.error()` de `react-hot-toast`
- `window.confirm()` para ações destrutivas — padrão em todo o app

### Integration Points
- `DetalheDivida.jsx` — importar e renderizar `<PagamentosDivida divida={divida} hoje={hoje} onSaldoChange={...} />`
- `TabelaDividas.jsx` — ler `divida.saldo_quitado` para exibir badge na coluna de status
- `services/dividas.js` — adicionar `atualizarSaldoQuitado(divida_id, saldoQuitado: bool)`
- Supabase: duas migrations (nova tabela `pagamentos_divida` + coluna `dividas.saldo_quitado`)

</code_context>

<specifics>
## Specific Ideas

- A tabela `pagamentos_parciais` (existente, FK `devedor_id`) **não deve ser alterada** — coexiste com `pagamentos_divida` sem interferência
- O motor Art.354 em `devedorCalc.js` já funciona com array de pagamentos — a adaptação é passar apenas `pagamentos_divida` filtrados por `divida_id` em vez dos `pagamentos_parciais` filtrados por `devedor_id`
- `dividas.saldo_quitado` não substitui `dividas.status` — são campos independentes; `status` continua sendo "em cobrança" / "quitada" / "acordo" (gerenciado manualmente)
- Requisitos PAG-07 e PAG-08 foram adicionados durante a discussão — não estavam no ROADMAP original

</specifics>

<deferred>
## Deferred Ideas

- Breakdown de pagamento por componente (juros/multa/principal) — v1.2 (já em REQUIREMENTS.md Future)
- Forma de pagamento (PIX/TED/boleto) — v1.2
- Comprovante PDF de pagamento — v1.2
- Auto-update de `dividas.status` para "quitada" quando saldo ≤ 0 — removido do backlog (substituído por `saldo_quitado` que é mais simples e não conflita com status manual)
- Toast com "desfazer" na exclusão de pagamento — UX mais moderna, mas complexidade de rollback não justificada agora

</deferred>

---

*Phase: 04-pagamentos-por-divida*
*Context gathered: 2026-04-20*
