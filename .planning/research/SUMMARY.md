# Research Summary — v1.1 Pagamentos e Contratos

**Project:** Mr. Cobranças
**Milestone:** v1.1 — Pagamentos e Contratos
**Synthesized:** 2026-04-20
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, PROJECT.md

---

## Executive Summary

Mr. Cobranças é uma SPA brownfield React 18 + Supabase de cobrança jurídica. O v1.0 entregou o schema relacional `dividas`, o motor de cálculo Art. 354 CC sequencial em `devedorCalc.js`, e a tela `DetalheDivida`. O v1.1 fecha o ciclo financeiro por (1) registrar pagamentos contra uma `divida` específica, e (2) modelar contratos com parcelas onde cada parcela é uma linha real em `dividas` que participa do motor Art. 354 existente sem nova lógica de cálculo.

A restrição central é não-regressão: `pagamentos_parciais` (devedor-scoped) alimenta Dashboard, FilaDevedor e o motor de KPI — não deve ser tocado. Todo novo mecanismo de pagamento deve coexistir sob state separado (`allPagamentos` vs `allPagamentosDivida`) e call sites separados do engine. O stack não adiciona nenhuma nova biblioteca runtime; todas as capacidades (date arithmetic, formatação de moeda, form state, toast, cliente PostgREST) já existem e são battle-tested.

As duas entregas são sequencialmente dependentes: `DetalheContrato` (Fase 5) precisa de saldos por parcela, o que requer o mecanismo de pagamentos (Fase 4) já estar conectado. Uma decisão arquitetural de produto deve ser tomada antes de qualquer código da Fase 4: `pagamentos_parciais` reutilizado com UI-only scoping, ou nova tabela `pagamentos_divida` com FK explícita para `dividas`.

---

## Stack Additions

### Novo (v1.1 apenas)

| Item | O Quê | Racional |
|------|-------|----------|
| Tabela `pagamentos_divida` | Supabase — `divida_id` FK, `data_pagamento`, `valor`, `observacao` | Escopo por dívida, isolado do pool devedor |
| Tabela `contratos` | Supabase — tipo, devedor_id, credor_id, valor_total, status | Header que agrupa N parcelas |
| `dividas.contrato_id` | `ALTER TABLE dividas ADD COLUMN contrato_id UUID REFERENCES contratos ON DELETE SET NULL` | Liga parcela-dívida ao contrato |
| `dividas.numero_parcela` | `ALTER TABLE dividas ADD COLUMN numero_parcela INTEGER` | Ordena parcelas; NULL para dívidas avulsas |
| `src/services/pagamentosDivida.js` | CRUD via wrapper `sb()` existente | Segue padrão `dividas.js` exato |
| `src/services/contratos.js` | CRUD para tabela `contratos` | Mesmo padrão |
| `src/components/PagamentosDaDivida.jsx` | Sub-componente de DetalheDivida — lista + form inline add/edit/delete | |
| `src/components/ModuloContratos.jsx` | Módulo sidebar — mesmo padrão de ModuloDividas | |
| `src/components/DetalheContrato.jsx` | Detalhe: header + tabela parcelas com saldo vivo por parcela | |
| `src/components/NovoContrato.jsx` | Wizard: campos do contrato + gerador de parcelas | Reutiliza padrão `gerarParcelasAcordo()` do App.jsx |
| `src/components/TabelaContratos.jsx` | Lista global de contratos | |

### Existente (sem mudança)

| Item | Status |
|------|--------|
| Tabela `pagamentos_parciais` | Inalterada — pool devedor para Dashboard e Pessoas |
| `devedorCalc.js` | Inalterado — `calcularSaldosPorDivida` já suporta escopo por dívida |
| `carregarTudo()` em App.jsx | Estende `Promise.all` com 2 novos fetches; fetches existentes inalterados |
| Formatters, masks, toast, sb() | Sem mudanças |
| Padrão de migrations | SQL manual no Supabase Dashboard; `IF NOT EXISTS`; `pg_notify` ao final |

### Ordem de Migration

1. `migration_contratos.sql` — tabela `contratos` (FK de `dividas` depende desta existir primeiro)
2. `migration_dividas_contrato_id.sql` — adiciona `contrato_id`, `numero_parcela` a `dividas`
3. `migration_pagamentos_divida.sql` — independente; pode rodar em qualquer ordem em relação a 1–2

---

## Feature Landscape

### Pagamentos por Dívida — Table Stakes

| Feature | Complexidade | Notas |
|---------|-------------|-------|
| Lançar pagamento (data + valor + observação) na tela da dívida | Baixa | Form inline em PagamentosDaDivida |
| Listar pagamentos cronológicos da dívida | Baixa | Query `pagamentos_divida` por `divida_id` |
| Saldo atualizado pós-pagamento via Art. 354 CC | Já implementado | `calcularSaldosPorDivida()` existe; só passar array scoped |
| Editar / excluir pagamento com confirmação | Baixa | Padrão CRUD já existe em Pessoas |
| Badge "Saldo quitado" quando saldo ≤ 0 | Baixa | Display derivado — update de `dividas.status` adiado para v1.2 |
| Validar pagamento a maior (valor > saldo) | Baixa | Validação client-side antes do INSERT |

**Should-have (deferráveis para v1.2):** breakdown por componente (juros/multa/principal), comprovante PDF, forma de pagamento (PIX/TED/boleto).

**Anti-features explícitas:** sem imputação manual (Art. 354 define a ordem), sem pagamentos futuros, sem recálculo server-side.

### Contratos com Parcelas — Table Stakes

| Feature | Complexidade | Notas |
|---------|-------------|-------|
| Criar contrato: tipo, credor, devedor, valor total, data, nº documento | Baixa | Form simples |
| Gerar N parcelas automaticamente (valor ÷ N, mensal a partir da data base) | Média | Reutiliza lógica `gerarParcelasAcordo()` do App.jsx |
| Cada parcela cria linha real em `dividas` + linha em `devedores_dividas` | Média | Insert atômico: contrato → N × divida → N × participante |
| Listar contratos: tipo, partes, valor total, nº parcelas, parcelas em atraso | Baixa | JOIN query |
| DetalheContrato: header + parcelas com saldo individual via pagamentos_divida | Média | Requer Fase 4 completa |
| Parcelas aparecem no ModuloDividas global (são dívidas normais) | Mínima | Sem trabalho extra — são linhas reais de `dividas` |

**Anti-features explícitas:** sem "contrato como dívida especial com JSONB" (repete erro pré-v1.0), sem motor de cálculo separado para parcelas, sem múltiplos devedores no header do contrato (v1.1), sem importação de Excel.

---

## Architecture Integration

### Pontos de Integração Chave

**1. Extensão do `carregarTudo()` (App.jsx)**

Dois novos fetches no `Promise.all` existente:
- `dbGet("pagamentos_divida")` → state `allPagamentosDivida` (nunca mesclado em `allPagamentos`)
- `dbGet("contratos")` → state `allContratos`

`allPagamentos` (pagamentos_parciais) nunca é renomeado ou mesclado.

**2. Novos props em DetalheDivida**

Novo prop `allPagamentosDivida` adicionado ao lado do `allPagamentos` existente. Dentro de DetalheDivida, o filtro existente usa `devedor_id`; o novo filtro usa `divida_id`. Os dois nunca devem ser confundidos.

**3. devedorCalc.js — dois call sites, dois escopos**

| Chamador | Função | Fonte de pagamentos | Escopo |
|----------|--------|--------------------|----|
| Dashboard, FilaDevedor | `calcularSaldoDevedorAtualizado` | `pagamentos_parciais` | Devedor |
| DetalheDivida, DetalheContrato | `calcularSaldosPorDivida` | `pagamentos_divida` | Dívida |

O engine não é modificado. A separação é garantida por qual array é passado.

**4. Invariante de alias de colunas**

Qualquer service que busca linhas de `dividas` e as alimenta no `devedorCalc.js` deve aplicar o mapeamento de alias (`indice_correcao` → `indexador`, `juros_am_percentual` → `juros_am`, etc.). A primeira ação recomendada da Fase 4 é extrair `normalizarDivida(dbRow)` do `carregarTudo()` para `dividas.js` como função pura aplicada universalmente.

**5. Criação atômica de contrato**

Sequência do `NovoContrato.handleSalvar()`:
1. `criarContrato()` → retorna `contrato.id`
2. Para cada parcela: `criarDivida({...parcela, contrato_id, numero_parcela, devedor_id, credor_id})`
3. Para cada dívida: `adicionarParticipante({devedorId, dividaId, papel: "PRINCIPAL"})`
4. `onCarregarTudo()`
5. Toast de sucesso

Falha parcial (algumas parcelas criadas): toast de erro, não desfaz parcelas já criadas — comportamento aceitável para v1.1.

---

## Watch Out For

### Pitfall 1 — Mesclar `pagamentos_divida` em `allPagamentos`

**Risk:** Crítico. Se linhas de `pagamentos_divida` forem adicionadas ao state `allPagamentos` existente, `calcularPlanilhaCompleta` (caminho legado de PDF) vai duplicar os pagamentos. O saldo KPI do Dashboard ficará errado para todo devedor com pagamentos por dívida.

**Prevention:** Manter `allPagamentos` = somente `pagamentos_parciais`. Criar state `allPagamentosDivida` separado. Reforçar em code review — os nomes de variáveis são o boundary.

---

### Pitfall 2 — Alias desync ao buscar dividas fora do `carregarTudo`

**Risk:** Alto e silencioso. Qualquer novo service que busca uma linha de `dividas` independentemente retorna nomes de coluna brutos do DB. Alimentar isso no `devedorCalc.js` sem o mapeamento de alias produz `undefined` para todo parâmetro financeiro — engine retorna saldo zero sem lançar nenhum erro.

**Prevention:** Extrair `normalizarDivida(dbRow)` do `carregarTudo()` para `dividas.js` como primeira tarefa da Fase 4, antes de qualquer novo código de service.

---

### Pitfall 3 — Nome da coluna `data_pagamento` (não `data`)

**Risk:** Alto e silencioso. O engine lê `pgto.data_pagamento` em `devedorCalc.js`. Se o schema ou service de `pagamentos_divida` usar qualquer outro nome, o engine silenciosamente pula o cálculo de período e retorna saldo zero. Nenhum erro em runtime.

**Prevention:** Migration SQL deve usar `data_pagamento` exatamente, igual ao campo existente em `pagamentos_parciais`. Adicionar Vitest test com pagamento por dívida antes de qualquer UI ser construída.

---

### Pitfall 4 — `AtrasoCell` mostra parcelas pagas como atrasadas

**Risk:** Médio. `AtrasoCell` determina o tier de atraso por `data_vencimento` apenas. Uma parcela-dívida totalmente paga via `pagamentos_divida` ainda mostrará o badge vermelho em `TabelaDividas` porque `AtrasoCell` não verifica cobertura de pagamento.

**Prevention:** Decidir no design da Fase 5 se parcelas são visíveis na `TabelaDividas` global. Resolução mais simples: filtrar a tabela global por `contrato_id IS NULL` (mostrar só dívidas avulsas). Parcelas de contratos são navegáveis apenas via `DetalheContrato`.

---

### Pitfall 5 — Acumulação de ponto flutuante em pagamentos parcelados

**Risk:** Médio. Com 36 pagamentos mensais iguais, o erro de FP pode produzir um resíduo fantasma na última parcela (R$ 0,02–0,05), fazendo uma dívida totalmente paga parecer ter saldo remanescente.

**Prevention:** Arredondar `valor` para 2 casas decimais no INSERT (no service, antes da chamada Supabase). Arredondar o saldo exibido no momento do render. Nunca arredondar dentro do loop Art. 354 — arredondamento intermediário piora o erro.

---

## Open Decision: `pagamentos_parciais` vs `pagamentos_divida`

Esta é a questão arquitetural central não resolvida do v1.1. FEATURES.md e ARCHITECTURE.md + STACK.md têm posições opostas. Ambas são internamente coerentes. **Deve ser resolvida antes do planning da Fase 4 e registrada em PROJECT.md como decisão chave.**

### Posição A — Reutilizar `pagamentos_parciais` com UI-only scoping (FEATURES.md)

Manter todos os pagamentos em `pagamentos_parciais` com chave `devedor_id`. Exibir em `DetalheDivida` identificando quais pagamentos foram absorvidos por esta dívida via saída de `calcularSaldosPorDivida()` — o engine já rastreia alocação por dívida.

| Vantagem | Desvantagem |
|----------|------------|
| Zero risco de migration de pagamentos | Sem FK direta a uma dívida específica — "qual pagamento pertence aqui" é computado, não armazenado |
| Art. 354 pool devedor permanece como cálculo autoritativo único | Pagamento registrado "para esta dívida" entra no pool devedor; Art. 354 distribui sequencialmente — funciona apenas se esta é a única dívida com saldo |
| Mais simples no curto prazo | `DetalheContrato` saldo por parcela = alocação fracionada do pool devedor — mais difícil de queryar |
| Zero risco de double-counting entre tabelas | Não responde limpo a "mostre-me só os pagamentos da parcela 3 deste contrato" |

### Posição B — Nova tabela `pagamentos_divida` com FK para `dividas(id)` (ARCHITECTURE.md + STACK.md)

Nova tabela `pagamentos_divida(id, divida_id, data_pagamento, valor, observacao)`. Pagamentos registrados aqui são escopados a uma dívida específica.

| Vantagem | Desvantagem |
|----------|------------|
| FK limpa — `divida_id` é explícita | Duas tabelas de pagamentos coexistem — state variables devem ser estritamente separadas |
| `DetalheContrato` saldo por parcela é trivialmente correto | Dashboard usa `pagamentos_parciais`; detalhe dívida usa `pagamentos_divida` — duas fontes de verdade que devem permanecer sincronizadas conceitualmente |
| Rollback seguro — tabela pode ser dropada sem tocar no sistema existente | Se um usuário registrar pagamento no pool devedor E também pagamento por dívida, os KPIs divergem |
| Distribuição Art. 354 cross-dívida é perdida — esta tabela é single-dívida scoped | |

### Implicações para o roadmapper

- **Se Posição A:** `DetalheContrato` saldo por parcela = o que `calcularSaldosPorDivida` alocou para aquela parcela do pool devedor. Sem migration de pagamentos extra. Histórico de pagamento por parcela é computado.
- **Se Posição B:** `DetalheContrato` saldo por parcela = soma direta de `pagamentos_divida` onde `divida_id = parcela.id`. Query limpa. Requer disciplina estrita de separação de state.

Ambas as posições são viáveis para v1.1. Posição A otimiza para zero risco de migration; Posição B otimiza para extensibilidade e auditabilidade de longo prazo.

---

## Build Order Recommendation

Fase 5 (Contratos) depende da Fase 4 (Pagamentos) estar completa porque `DetalheContrato` exibe saldo por parcela, o que requer o mecanismo de pagamentos conectado — independente de qual posição de schema for escolhida.

### Sequência de Fases Recomendada

**Fase 4 — Pagamentos por Dívida**

| Etapa | Entregável | Por que esta ordem |
|-------|-----------|-------------------|
| 4.0 | Resolver decisão de schema (`pagamentos_parciais` vs `pagamentos_divida`) | Deve ser decidida antes de qualquer código de service; registrar em PROJECT.md |
| 4.1 | `normalizarDivida()` extraída para `dividas.js` + Vitest test | Previne alias desync desde o dia 1 |
| 4.2 | Migration de schema (`pagamentos_divida` DDL + RLS, se Posição B) | Fundação antes de service |
| 4.3 | Service `pagamentosDivida.js` (CRUD) | Thin service; depende de 4.2 |
| 4.4 | `PagamentosDaDivida.jsx` (lista + form) | UI sobre o service |
| 4.5 | Integração em `DetalheDivida.jsx` | Conectar componente na view existente |
| 4.6 | Extensão de `carregarTudo()` + prop pass em App.jsx | Por último: só adicionar prop após `DetalheDivida` já consumir |

**Fase 5 — Contratos com Parcelas**

| Etapa | Entregável | Por que esta ordem |
|-------|-----------|-------------------|
| 5.1 | Schema: tabela `contratos` + `dividas.contrato_id` + `dividas.numero_parcela` | `dividas` FK depende de `contratos` existir primeiro |
| 5.2 | Service `contratos.js` (CRUD) | Service antes de UI |
| 5.3 | `TabelaContratos.jsx` (lista apenas, sem saldo ainda) | Validar CRUD básico antes de views complexas |
| 5.4 | `NovoContrato.jsx` (wizard + geração atômica de parcelas) | Fluxo de criação central |
| 5.5 | `DetalheContrato.jsx` (parcelas + saldo por parcela) | Requer Fase 4 completa |
| 5.6 | `ModuloContratos.jsx` (orquestrador) | Monta 5.3, 5.5 |
| 5.7 | App.jsx: nav sidebar + render case + extensões do `carregarTudo()` | Por último — mesma razão que 4.6 |

---

## Confidence Assessment

| Área | Confiança | Base |
|------|-----------|------|
| Stack | ALTA | Inspeção direta de App.jsx, package.json, supabase.js |
| Features | ALTA | Ancorada nas capacidades do engine existente; Art. 354 CC verificado |
| Architecture | ALTA | Baseada em leitura direta do codebase com referências de linha específicas |
| Pitfalls | ALTA | 12 armadilhas derivadas de inspeção real do código |
| Decisão de schema (aberta) | MÉDIA | Ambas as posições são coerentes; resolução requer decisão de produto |

**Gaps a resolver antes do planning:**

1. **Escolha de schema** — reutilizar `pagamentos_parciais` vs nova tabela `pagamentos_divida`. Deve ser registrada em PROJECT.md antes do plano da Fase 4 ser escrito.
2. **Visibilidade de parcelas no `TabelaDividas` global** — afeta se `AtrasoCell` precisa de modificação na Fase 5.
3. **Auto-update de status para dívidas quitadas** — ARCHITECTURE.md adia explicitamente para v1.2; confirmar que isso é aceitável para usuários.
