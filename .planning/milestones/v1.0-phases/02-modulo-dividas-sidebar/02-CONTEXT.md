# Phase 2: Módulo Dívidas no Sidebar — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Criar um módulo independente "Dívidas" no sidebar, ao lado de "Pessoas". O módulo expõe uma visão global de todas as dívidas com filtros inline, e uma tela de Detalhe da Dívida com pessoas vinculadas (papéis + responsabilidade) e saldo atualizado.

**A aba "Dívidas" dentro de Pessoa permanece** — ambas as telas coexistem e editam via `dividas.js`. Sincronização via `allDividas` state + `carregarTudo()` no save.

**Fora do escopo desta fase:**
- PDF por dívida específica
- Filtros por faixa de valor e data de vencimento
- Ordenação clicável de colunas
- Bulk actions
- Split de pagamentos por `divida_id` (Art. 354 CC mantido: imputação sequencial por dívida mais antiga)

</domain>

<decisions>
## Implementation Decisions

### D-01 — Estratégia de coexistência (LOCKED)

Opção **Coexistir**: aba "Dívidas" dentro de Pessoa permanece intacta. Módulo Dívidas no sidebar é adicional.

- Ambas as telas editam via `dividas.js` (mesmo service)
- Sincronização: após qualquer save em qualquer tela → chamar `carregarTudo()` ou atualizar `allDividas` state globalmente
- Aceito o custo: duas UIs lendo/escrevendo a mesma tabela, estado unificado via `allDividas` + `dividasMap`
- **Risco aceito**: edição simultânea em duas abas do browser não é caso de uso do sistema

### D-02 — Motor de cálculo (LOCKED)

**Manter sequencial** (status quo — sem migration de `pagamentos_parciais`).

- Pagamentos parciais continuam compartilhados entre as dívidas do devedor
- Ordem de amortização: dívida mais antiga primeiro (Art. 354 CC — imputação legal)
- Tela Detalhe da Dívida mostra o saldo calculado pelo motor atual (`calcularSaldoDevedorAtualizado` filtrado para aquela dívida)
- Split por `divida_id` diferido para Fase 3 se UX indicar necessidade

**Implicação técnica**: na tela Detalhe, o "saldo desta dívida" é o resultado que sobrou para ela após a fila de amortização do devedor. Exige passar `devedor` completo + todos os pagamentos do devedor para o motor, não apenas os da dívida isolada.

### D-03 — Filtros (LOCKED)

**Inline chips** — mesmo padrão da Fila de Cobrança (consistência UX).

4 filtros no MVP:
1. **Status** — dropdown: `em cobrança` / `quitada` / `acordo`
2. **Credor** — dropdown com lista de credores existentes
3. **Devedor** — busca por texto (nome)
4. **Atraso** — dropdown: `Qualquer` / `30+ dias` / `60+ dias` / `90+ dias`

Chips aparecem abaixo da filter bar mostrando filtros ativos; clique no chip remove o filtro.
Persistência: state React apenas (sem URL params — app sem router).

### D-04 — MVP Módulo Dívidas (LOCKED)

**Item no sidebar:**
- Label "Dívidas", badge com contagem total de dívidas ativas
- Posição: após "Pessoas" na NAV array

**Tabela de Dívidas (listagem global):**
- Colunas: Devedor, Credor, Valor Original, Saldo Atualizado, Vencimento, Status, Atraso (badge), Ações
- Paginação client-side (todas as dívidas já estão em `allDividas` state)
- Clique na linha abre Detalhe da Dívida

**Tela Detalhe da Dívida:**
- Header: identificação da dívida (devedor principal, credor, valor, vencimento)
- Card financeiro: Valor Original / Saldo Atualizado (motor atual) / Total Pago
- Card Art.523: mostra opção configurada e impacto
- Seção Pessoas Vinculadas:
  - Lista com papel (PRINCIPAL / COOBRIGADO / AVALISTA / FIADOR / CÔNJUGE / OUTRO) e responsabilidade (SOLIDÁRIA / SUBSIDIÁRIA / DIVISÍVEL)
  - Saldo exibido: **total da dívida** (não proporcional por pessoa)
  - Adicionar pessoa: dropdown de busca nos devedores existentes (sem criar pessoa nova aqui)
  - Remover pessoa: warning com confirmação; se for o PRINCIPAL → pede confirmação explícita antes de remover
  - Trocar papel: select inline na linha da pessoa
- Botão "Editar Dívida": abre o form existente (reuso do form atual da aba Dívidas em Pessoa)

### D-05 — Pessoas vinculadas — regra do Principal (LOCKED)

**Warning com confirmação** (não hard block) ao remover o PRINCIPAL sem ter outro PRINCIPAL designado.

- Motivo: usuário pode estar no meio de uma troca de responsável (remove A, vai adicionar B)
- Texto sugerido: "Você está removendo o devedor principal. Esta dívida ficará sem responsável principal. Confirmar?"
- Sistema permite o estado intermediário; não exige nomear substituto na mesma operação

### D-06 — Adicionar pessoa vinculada (LOCKED)

**Dropdown de busca** nos devedores existentes — sem formulário de criação inline.

- Criar nova pessoa é caso raro; formulário inline tornaria a tela pesada
- Se precisar criar nova pessoa, usuário vai em "Pessoas" → cria → volta em Dívidas → vincula

### Claude's Discretion

- Estrutura visual exata dos cards no Detalhe (layout, cores, ordem dos campos)
- Comportamento do badge no sidebar (atualiza em tempo real vs. só no carregarTudo)
- Debounce na busca por devedor no filtro
- Skeleton/loading state na tabela durante carregamento inicial
- Como exibir dívidas sem credor cadastrado (null credor_id)
- Paginação: quantas linhas por página (sugestão: 20)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Banco e serviços
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — CRUD service de dívidas (5 exports)
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — service junction table (papéis/responsabilidade)
- `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql` — schema real da tabela `dividas` (colunas: `indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`, `art523_opcao`, etc.)
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `dbGet/Insert/Update/Delete` helpers

### Motor de cálculo (ler antes de qualquer cálculo de saldo)
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — `calcularSaldoDevedorAtualizado`, `calcularDetalheEncargos`, `calcularPlanilhaCompleta`
- **CRÍTICO**: aliases compat obrigatórios — DB usa `indice_correcao`/`juros_am_percentual`/`multa_percentual`/`honorarios_percentual`; motor lê `indexador`/`juros_am`/`multa_pct`/`honorarios_pct`. Ver `dividasMap` em `carregarTudo()` linha ~8436 para o padrão correto.

### Componentes existentes (reusar)
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — já exibe pessoas vinculadas a uma dívida
- `src/mr-3/mr-cobrancas/src/components/PessoasVinculadas.jsx` — componente de vínculos N:N
- `src/mr-3/mr-cobrancas/src/components/Art523Option.jsx` — seletor de opção Art.523
- `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — referência de padrão filter bar + chips inline

### App.jsx — pontos de integração
- `src/mr-3/mr-cobrancas/src/App.jsx` — NAV array (~linha 8524), `allDividas` state, `dividasMap`, `carregarTudo()` (~linha 8420), `allPagamentos`

### Arquitetura
- `.planning/phases/01-refatora-o-pessoas-d-vidas-big-bang-noturno/01-CONTEXT.md` — decisões da Fase 1 (stack, padrões, restrições)

### Testes (não podem quebrar)
- `src/mr-3/mr-cobrancas/src/services/__tests__/calculos.test.js`
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DevedoresDaDivida.jsx` — componente que já lista pessoas vinculadas a uma dívida com papel/responsabilidade; avaliar reuso direto no Detalhe
- `PessoasVinculadas.jsx` — componente de vínculo N:N; pode ter lógica de add/remove aproveitável
- `FilaDevedor.jsx` — padrão de filter bar com chips; copiar estrutura de filtros inline
- `Art523Option.jsx` — widget de Art.523; reusar no card financeiro do Detalhe
- `calcularSaldoDevedorAtualizado` — motor já validado; reusar sem alteração

### Established Patterns
- State management: React useState no monólito App.jsx; `allDividas` + `dividasMap` já existem após Fase 1
- Data fetching: `dbGet("dividas")` em `carregarTudo()` carrega tudo upfront; módulo usa state já carregado
- Styling: Tailwind inline (sem CSS modules); seguir padrão de cores e badges da Fila de Cobrança
- Aliases compat: qualquer ponto que crie objetos de dívida a partir do banco DEVE incluir `indexador`, `juros_am`, `multa_pct`, `honorarios_pct` (ver CR-01 fix, commit 95b3aee)

### Integration Points
- NAV array em App.jsx: adicionar `{ id: "dividas", label: "Dívidas", icon: ..., color: ..., bg: ... }`
- `tab` state controla qual módulo é exibido; adicionar case `"dividas"` no switch de renderização
- `allDividas` state já populado pelo `carregarTudo()`; módulo consome diretamente
- Após save em Detalhe da Dívida → chamar `carregarTudo()` para sincronizar com aba Dívidas em Pessoa

</code_context>

<specifics>
## Specific Ideas

- **Badge no sidebar**: contagem de dívidas com `status = 'em cobrança'` (não total — mais informativo)
- **Atraso badge**: calcular dias desde `data_vencimento` até hoje; usar mesmo sistema de tiers da coluna Atraso no painel Pessoas
- **Saldo na tabela**: chamar `calcularSaldoDevedorAtualizado(devedor_da_divida, pagamentos_do_devedor, hoje)` — exige join de `allDividas` com `devedores` e `allPagamentos` para montar o objeto `devedor` correto
- **Imputação legal (Art. 354 CC)**: documentar no código que a ordem sequencial de amortização (mais antiga primeiro) é intencional e tem fundamento legal
- **Detalhe read-only vs edição**: botão "Editar Dívida" reutiliza o form atual (modal ou inline) sem duplicar lógica; o form já existe na aba Dívidas em Pessoa

</specifics>

<deferred>
## Deferred Ideas (Fase 3+)

- PDF por dívida específica
- Filtros por faixa de valor e data de vencimento
- Ordenação clicável de colunas na tabela
- Bulk actions (marcar múltiplas dívidas)
- Split de pagamentos por `divida_id` — somente se UX indicar necessidade após uso em produção
- Criação de nova pessoa inline na tela Detalhe da Dívida

</deferred>

---

*Phase: 02-modulo-dividas-sidebar*
*Context gathered: 2026-04-21*
