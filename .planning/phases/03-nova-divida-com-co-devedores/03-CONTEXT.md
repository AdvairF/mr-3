# Phase 3: Nova Dívida com Co-devedores — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Adicionar botão "+ Nova Dívida" no Módulo Dívidas (sidebar) que abre uma tela de criação unificada: campos financeiros da dívida + seção de Pessoas Vinculadas (Principal + co-devedores) na mesma tela, com salvamento atômico (dívida + vínculos em uma operação).

**O que ENTRA nesta fase:**
- Botão "+ Nova Dívida" no header de `ModuloDividas` (view='lista')
- Componente `NovaDivida.jsx` (view='nova' em ModuloDividas)
- Extração de `DividaForm.jsx` com os campos financeiros (reutilizado por NovaDivida e pelo form inline existente)
- Seção "Pessoas na Dívida" dentro de NovaDivida: busca dropdown + cards com papel/responsabilidade
- Modal "Criar Pessoa Rápida" para quando a pessoa não existe no banco
- Salvamento atômico: `criarDivida` + `vincularDevedores` na mesma operação
- Validações inline: Salvar desabilitado sem Principal; dropdown omite pessoas já vinculadas

**O que NÃO entra nesta fase:**
- Editar dívida existente via NovaDivida.jsx (mantém fluxo D-04: setTab + mr_abrir_devedor event)
- Rascunho / autosave
- PDF por dívida específica (já diferido na Fase 2)
- Bulk actions, filtros por faixa de valor/data (já diferidos na Fase 2)
- Renomear tabela devedores para pessoas no banco

</domain>

<decisions>
## Implementation Decisions

### D-01 — Container da tela "Nova Dívida" (LOCKED)

**Nova view `view='nova'` em `ModuloDividas`** — não modal, não drawer.

- `ModuloDividas` passa de 2 para 3 views: `lista` / `detalhe` / `nova`
- `NovaDivida.jsx` é um componente novo ao lado de `DetalheDivida.jsx`
- Botão "+ Nova Dívida" aparece no header da view `lista`
- Cancelar na view `nova` retorna para `lista`

### D-02 — Layout da view Nova Dívida (LOCKED)

**Top-bottom scroll** — campos financeiros no topo, seção Pessoas abaixo, botões Salvar/Cancelar no final.

```
[Valor]       [Vencimento]
[Credor]      [Descrição]
--- Diretrizes do Contrato (Indexador, Juros, Multa, Honorários, Art.523) ---
--- Pessoas na Dívida ---
  👑 Principal:  [busca...] [papel ↓] [responsabilidade ↓]
  👤 Co-devedor: [busca...] [papel ↓] [responsabilidade ↓] [✕]
  [+ Adicionar co-devedor]
--- [Salvar]  [Cancelar] ---
```

Sem paginação de seções. Scroll natural da página.

### D-03 — Criação de pessoa nova inline (LOCKED)

**Modal rápido "Criar Pessoa"** — revisa D-06 da Fase 2 (que era para o fluxo de Detalhe de dívida existente, não para o fluxo de criação diária).

- Dropdown de busca: quando nenhum resultado é encontrado, exibe opção `+ Criar "[termo buscado]"`
- Clique abre modal com campos: Nome* + CPF/CNPJ + Tipo (PF / PJ)
- Ação "Criar e Vincular": insere em `devedores`, retorna ao form com a pessoa já selecionada na linha correta
- Campos complementares (endereço, telefone) ficam para completar depois em Pessoas

### D-04 — Papel padrão da pessoa recém-criada (LOCKED)

**Papel herdado do contexto da linha de busca.**

- Se o usuário estava na linha de Principal ao abrir o modal → cria e vincula como `PRINCIPAL`
- Se estava clicando `+ Adicionar co-devedor` → cria e vincula como `COOBRIGADO` por padrão (editável no select)

### D-05 — Lista de co-devedores no form (LOCKED)

**Cards por linha com ×**, selects inline para papel e responsabilidade.

```
+-- Pessoas na Dívida ---------------------------------------+
| 👑 Advair Rodrigues  [Principal ↓]  [Solidária ↓]         |
| 👤 João Silva        [Avalista ↓]   [Subsidiária ↓]  [✕] |
| 👤 Maria Lima        [Cônjuge ↓]    [Solidária ↓]    [✕] |
| [+ Adicionar co-devedor]                                   |
+------------------------------------------------------------+
```

- Ícone 👑 para Principal, 👤 para demais
- Principal não tem botão ✕ (ou tem ✕ com warning D-05 da Fase 2 mantido)
- Selects para papel: PRINCIPAL / COOBRIGADO / AVALISTA / FIADOR / CÔNJUGE / OUTRO
- Selects para responsabilidade: SOLIDÁRIA / SUBSIDIÁRIA / DIVISÍVEL

### D-06 — Reuso técnico: DividaForm.jsx (LOCKED)

**Extrair `DividaForm.jsx`** — componente de campos financeiros usado tanto por `NovaDivida.jsx` quanto pelo form inline existente no App.jsx (aba Dívidas dentro de Pessoa).

- `DividaForm.jsx` recebe: `value` (objeto com todos os campos) + `onChange` (callback por campo)
- Campos incluídos: Descrição, Valor Total, Data Vencimento, Credor (dropdown), Indexador, Data Início Atualização, Multa%, Tipo Juros, Juros% a.m., Honorários%, Despesas, Art.523Option, Parcelamento (opcional)
- `NovaDivida.jsx` = `DividaForm` + seção Pessoas na Dívida + botões Salvar/Cancelar
- App.jsx inline (aba Dívidas em Pessoa) é refatorado para usar `DividaForm` no lugar do JSX repetido
- **Risco de regressão**: o form inline tem lógica de `salvarDivida` acoplada — isolar estado e handlers antes de extrair

### D-07 — Campos obrigatórios para salvar (LOCKED)

**Valor + Vencimento + pelo menos 1 Principal.**

- Credor **não** obrigatório (já existem dívidas com `credor_id = null` em produção)
- Descrição, indexador, juros, multa, honorários: opcionais (default 0 ou vazio)
- Sem 1 Principal → botão Salvar desabilitado (hard block inline, não toast)

### D-08 — Validações inline (LOCKED)

**Prevenção em vez de correção.**

- Botão "Salvar" permanece desabilitado enquanto `pessoas.filter(p => p.papel === 'PRINCIPAL').length === 0`
- Tooltip no botão: "Adicione pelo menos um devedor Principal"
- Dropdown de busca de pessoas: omite quem já está na lista (por `devedor_id`) — impede duplicata
- Sem toast de erro por tentativa de duplicata — a opção simplesmente não aparece

### D-09 — Comportamento pós-salvamento (LOCKED)

**Volta para `view='lista'` + toast de sucesso + `carregarTudo()`.**

- `carregarTudo()` atualiza: `allDividas` state, badge do sidebar, dashboard
- Toast: "Dívida criada com sucesso" (react-hot-toast, padrão do sistema)
- Usuário clica "+ Nova Dívida" novamente para criar a próxima

### D-10 — Escopo MVP Fase 3 (LOCKED)

**Fase 3 = criação de nova dívida.**

- Editar dívida existente: mantém fluxo D-04 da Fase 2 (botão "Editar Dívida" → `setTab("devedores")` + evento `mr_abrir_devedor`)
- Sem rascunho / autosave
- Fase 4 pode incluir: modo edição via `NovaDivida.jsx`, clonar dívida, templates por credor

### Claude's Discretion

- Estrutura visual exata dos cards de pessoa (cores, bordas, espaçamento)
- Debounce na busca de pessoas (sugestão: 200ms, mínimo 2 chars — igual DevedoresDaDivida.jsx)
- Estado de loading no botão Salvar durante o salvamento atômico
- Tratamento de erro de rede no save (toast de erro genérico é suficiente)
- Ordem dos selects de papel no dropdown (sugestão: PRINCIPAL primeiro)
- Como tratar o campo `devedor_id` na tabela `dividas` (desnormalizado) quando há múltiplos Principais — usar o primeiro adicionado como devedor_id da linha `dividas`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Serviços de banco (ler antes de qualquer operação de escrita)
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — CRUD service; `criarDivida` é o ponto de entrada para salvar a nova dívida
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — service junction table; `vincularDevedor(dividaId, devedorId, papel, responsabilidade)` para cada pessoa vinculada
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `dbGet/dbInsert/dbUpdate/dbDelete` helpers

### Motor de cálculo (aliases obrigatórios)
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — motor de cálculo
- **CRÍTICO**: DB usa `indice_correcao` / `juros_am_percentual` / `multa_percentual` / `honorarios_percentual`; motor lê `indexador` / `juros_am` / `multa_pct` / `honorarios_pct`. Qualquer objeto de dívida criado DEVE incluir ambos os aliases (ver `dividasMap` em `carregarTudo()` ~linha 8436 do App.jsx).

### Componentes a reusar / referenciar
- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — adicionar view='nova' e botão "+ Nova Dívida"
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — referência de layout para NovaDivida.jsx
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — padrão de busca com input (busca.trim().length >= 2, filtro local) + cards de pessoa; REUSAR lógica de busca
- `src/mr-3/mr-cobrancas/src/components/Art523Option.jsx` — widget Art.523 incluído em DividaForm.jsx
- `src/mr-3/mr-cobrancas/src/components/ui/Modal.jsx` — modal de "Criar Pessoa Rápida"
- `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — referência de padrão filter bar + chips

### Form inline a extrair (ponto crítico)
- `src/mr-3/mr-cobrancas/src/App.jsx` ~linha 3893 — form "➕ Nova Dívida" inline; EXTRAIR para `DividaForm.jsx`
- `src/mr-3/mr-cobrancas/src/App.jsx` ~linha 8436 — `dividasMap` e aliases compat em `carregarTudo()`
- `src/mr-3/mr-cobrancas/src/App.jsx` — NAV array, `allDividas` state, `allDevedores` para dropdown de busca

### Contexto das fases anteriores
- `.planning/phases/01-refatora-o-pessoas-d-vidas-big-bang-noturno/01-CONTEXT.md` — schema da tabela `dividas`, restrições técnicas
- `.planning/phases/02-modulo-dividas-sidebar/02-CONTEXT.md` — D-01 coexistência, D-04 MVP Módulo Dívidas, D-05 warning Principal, padrões de integração com App.jsx

### Testes (não podem quebrar)
- `src/mr-3/mr-cobrancas/src/services/__tests__/calculos.test.js`
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DevedoresDaDivida.jsx` — padrão de busca de pessoa por nome/CPF com input + filtro local; lógica de add/remove com `devedoresDividas.js`; adaptável para a seção Pessoas na Dívida do form
- `Modal.jsx` — modal genérico reutilizável para "Criar Pessoa Rápida"
- `Art523Option.jsx` — widget de seleção Art.523; incluir em `DividaForm.jsx`
- `Btn`, `Inp` — componentes UI base usados em todo o sistema; manter padrão

### Established Patterns
- Busca de pessoa: `useState("busca")` + `busca.trim().length >= 2` → filtro em array local de `devedores` por nome ou CPF/CNPJ
- State management: React useState no App.jsx; `allDividas` + `dividasMap` já existem
- Aliases compat: **sempre** incluir `indexador`/`juros_am`/`multa_pct`/`honorarios_pct` ao criar objeto dívida do DB
- Salvamento: `dbInsert("dividas", payload)` retorna `{ id: UUID }` → usar UUID para `vincularDevedor` em seguida
- Tailwind inline (sem CSS modules); seguir padrão de cores e espaçamentos dos componentes existentes

### Integration Points
- `ModuloDividas.jsx`: adicionar `case "nova"` no condicional de renderização + botão "+ Nova Dívida" no header da view `lista`
- `NovaDivida.jsx` precisa receber: `devedores` (para dropdown de busca), `credores` (para select de credor), `onCarregarTudo`, `onVoltar`
- Após save: chamar `onCarregarTudo()` antes de `onVoltar()` para atualizar sidebar badge e `allDividas` state
- Modal "Criar Pessoa Rápida": após `dbInsert("devedores", { nome, cpf_cnpj, tipo })`, re-setar o campo de busca com a pessoa criada selecionada

</code_context>

<specifics>
## Specific Ideas

- **Botão "+ Nova Dívida"**: posicionar no header do Módulo Dívidas ao lado do badge "N em cobrança", estilo consistente com outros botões de ação do sistema
- **Campo Credor**: dropdown com lista de `credores` existentes (igual ao form inline do App.jsx) — `credor_id` pode ficar null se não selecionado
- **`devedor_id` na tabela `dividas`** (campo desnormalizado para queries rápidas): usar o `id` do devedor Principal; se houver múltiplos Principais (estado inválido), usar o primeiro da lista
- **Seção Pessoas**: iniciar com 1 linha vazia de Principal (campo de busca em foco); botão "+ Adicionar co-devedor" adiciona linha com busca e papel=COOBRIGADO por padrão
- **Modal "Criar Pessoa Rápida"**: campo Nome pré-preenchido com o texto que o usuário digitou na busca (evita re-digitar)

</specifics>

<deferred>
## Deferred Ideas

- Edição de dívida existente via NovaDivida.jsx (modo edit) — Fase 4
- Clonar dívida — Fase 4
- Templates por credor (preenche campos financeiros automaticamente) — Fase 4
- Rascunho / autosave — Fase futura
- Edição em lote de dívidas — Fase futura
- Split de pagamentos por `divida_id` (Art. 354 CC — já diferido na Fase 2) — Fase futura

</deferred>

---

*Phase: 03-nova-divida-com-co-devedores*
*Context gathered: 2026-04-20*
