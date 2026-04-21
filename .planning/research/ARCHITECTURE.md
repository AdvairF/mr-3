# Architecture: Pagamentos por Dívida e Contratos com Parcelas

**Milestone:** v1.1 — Pagamentos e Contratos
**Researched:** 2026-04-20
**Confidence:** HIGH — based on direct codebase inspection

---

## Schema Design

### Situação atual: tabela `pagamentos_parciais`

```
pagamentos_parciais
  id            uuid PK
  devedor_id    uuid FK → devedores(id)
  data_pagamento date
  valor         numeric
  observacao    text
```

Chave de escopo: `devedor_id`. O motor `devedorCalc.js` consome pagamentos filtrados por `devedor_id`, aplica amortização sequencial Art. 354 CC distribuindo cada pagamento entre as dívidas do devedor na ordem de `data_pagamento`. Essa tabela não tem `divida_id` — o pool é do devedor inteiro.

### Nova tabela: `pagamentos_divida`

Não alterar `pagamentos_parciais`. Criar tabela separada com escopo por dívida.

```sql
CREATE TABLE pagamentos_divida (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  divida_id      uuid        NOT NULL REFERENCES dividas(id) ON DELETE CASCADE,
  data_pagamento date        NOT NULL,
  valor          numeric(14,2) NOT NULL CHECK (valor > 0),
  observacao     text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_pagamentos_divida_divida_id ON pagamentos_divida(divida_id);
CREATE INDEX idx_pagamentos_divida_data     ON pagamentos_divida(data_pagamento);
```

Rationale para tabela separada (não coluna `divida_id` em `pagamentos_parciais`):
- Mantém `pagamentos_parciais` e o cálculo de saldo do Módulo Pessoas intocados. Qualquer quebra ali afeta o Dashboard e FilaDevedor simultaneamente.
- O escopo da dívida individual é conceitualmente diferente do pool de devedor — um é "quanto esse devedor pagou no total" (régua de cobrança, dashboard KPI), o outro é "quanto foi pago contra esta dívida específica" (DetalheDivida, contrato).
- Rollback simples: se o design mudar, `pagamentos_divida` some sem migração em `pagamentos_parciais`.

### Nova tabela: `contratos`

```sql
CREATE TABLE contratos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  credor_id       uuid        REFERENCES credores(id),
  devedor_id      uuid        REFERENCES devedores(id),   -- principal (desnormalizado, mesmo padrão de dividas)
  tipo            text        NOT NULL
                  CHECK (tipo IN ('nf_duplicata','compra_venda','emprestimo','outro')),
  descricao       text,
  valor_total     numeric(14,2),                          -- calculado = SUM(dividas.valor_total), ou sobrescrito
  data_contrato   date,
  status          text        DEFAULT 'ativo'
                  CHECK (status IN ('ativo','quitado','cancelado')),
  observacoes     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_contratos_devedor_id ON contratos(devedor_id);
CREATE INDEX idx_contratos_credor_id  ON contratos(credor_id);
```

### Vinculação contrato → dividas

Cada parcela do contrato É uma dívida existente. Adicionar `contrato_id` na tabela `dividas`:

```sql
ALTER TABLE dividas
  ADD COLUMN contrato_id uuid REFERENCES contratos(id) ON DELETE SET NULL,
  ADD COLUMN numero_parcela integer;

CREATE INDEX idx_dividas_contrato_id ON dividas(contrato_id);
```

`ON DELETE SET NULL`: se um contrato for excluído as dívidas ficam órfãs mas não somem — segurança operacional para escritório jurídico.

`numero_parcela`: ordena a exibição das parcelas dentro do contrato. Nullable — dívidas avulsas ficam com NULL.

### Diagrama de relações

```
credores ──────────────────┐
devedores ─────────────────┤
                           │
contratos (tipo, status)   │
  contrato_id ◄────────────┤
                           │
dividas (valor_total, ...) │
  divida_id ◄──────────────┤
  contrato_id FK → contratos
  numero_parcela
                           │
pagamentos_divida          │
  divida_id FK → dividas   │
  data_pagamento, valor    │
                           │
devedores_dividas (join)   │
  divida_id FK → dividas   │
  devedor_id FK → devedores│

pagamentos_parciais (existente — não alterado)
  devedor_id FK → devedores
```

### FK Constraints — Checklist Supabase

| Constraint | ON DELETE | Rationale |
|------------|-----------|-----------|
| `pagamentos_divida.divida_id → dividas.id` | CASCADE | Pagamento sem dívida é lixo |
| `dividas.contrato_id → contratos.id` | SET NULL | Dívida sobrevive à exclusão do contrato |
| `contratos.devedor_id → devedores.id` | RESTRICT | Não apagar devedor com contratos ativos |
| `contratos.credor_id → credores.id` | RESTRICT | Não apagar credor com contratos |

---

## Component Architecture

### Regra de localização

O padrão do projeto é: módulo extraído como componente em `src/components/`, service em `src/services/`, sem router — view state local ao módulo pai. Seguir o mesmo padrão para Phase 4 e Phase 5.

### Phase 4 — Pagamentos por Dívida

**Componentes novos:**

```
src/components/
  PagamentosDaDivida.jsx     ← sub-componente de DetalheDivida
                               Exibe lista de pagamentos + formulário add/edit/delete

src/services/
  pagamentosDivida.js        ← CRUD: listar, criar, atualizar, excluir
```

**Componentes modificados:**

| Componente | Modificação |
|------------|-------------|
| `DetalheDivida.jsx` | Adicionar seção "Pagamentos" abaixo do Resumo Financeiro. Passar `pagamentosDaDivida` (array filtrado por `divida_id`) como prop. |
| `ModuloDividas.jsx` | Buscar `pagamentos_divida` em paralelo no mount (ou receber via prop de App.jsx). Passar `allPagamentosDivida` para `DetalheDivida`. |
| `App.jsx` — `carregarTudo()` | Adicionar `dbGet("pagamentos_divida")` no Promise.all. Armazenar em `allPagamentosDivida`. Passar como prop ao `ModuloDividas`. |
| `devedorCalc.js` | Não alterar. O motor de cálculo do Módulo Pessoas continua usando `pagamentos_parciais`. `DetalheDivida` recebe `pagamentosDaDivida` filtrados por `divida_id` e chama funções existentes: `calcularSaldosPorDivida` e `calcularTotalPagoPorDivida` com esse array escoped. |

**Fluxo de dados em DetalheDivida com Phase 4:**

```
App.jsx carregarTudo()
  └─ pagamentos_divida → allPagamentosDivida[]

ModuloDividas (recebe allPagamentosDivida)
  └─ DetalheDivida (recebe allPagamentosDivida)
       └─ filtra: pagamentosDaDivida = allPagamentosDivida.filter(p => p.divida_id === divida.id)
       └─ calcula saldo: calcularSaldosPorDivida(devedor, pagamentosDaDivida, hoje)
       └─ PagamentosDaDivida (recebe pagamentosDaDivida, dividaId)
            └─ CRUD via pagamentosDivida.js → chama onCarregarTudo() após mutação
```

**Assinatura do novo service:**

```js
// src/services/pagamentosDivida.js
export async function listarPagamentos(dividaId)    // GET pagamentos_divida?divida_id=eq.{id}
export async function criarPagamento(payload)       // POST com divida_id, data_pagamento, valor, observacao
export async function atualizarPagamento(id, campos)// PATCH
export async function excluirPagamento(id)          // DELETE
```

**Props flow atualizado para DetalheDivida:**

```jsx
// Antes (v1.0)
<DetalheDivida
  divida={selectedDivida}
  devedores={devedores}
  credores={credores}
  allPagamentos={allPagamentos}      // pagamentos_parciais do devedor
  hoje={hoje}
  onVoltar={handleVoltar}
  onCarregarTudo={onCarregarTudo}
  setTab={setTab}
/>

// Depois (v1.1 Phase 4)
<DetalheDivida
  divida={selectedDivida}
  devedores={devedores}
  credores={credores}
  allPagamentos={allPagamentos}      // mantido — alimenta devedorCalc.js cálculo de devedor
  allPagamentosDivida={allPagamentosDivida}  // novo — alimenta PagamentosDaDivida
  hoje={hoje}
  onVoltar={handleVoltar}
  onCarregarTudo={onCarregarTudo}
  setTab={setTab}
/>
```

### Phase 5 — Contratos com Parcelas

**Componentes novos:**

```
src/components/
  ModuloContratos.jsx         ← módulo sidebar (mesmo padrão de ModuloDividas)
  DetalheContrato.jsx         ← tela de detalhe do contrato, lista parcelas + saldos
  NovoContrato.jsx            ← wizard criação: dados do contrato + geração de parcelas
  TabelaContratos.jsx         ← tabela global de contratos

src/services/
  contratos.js                ← CRUD: listar, buscar, criar, atualizar, excluir
```

**Componentes modificados:**

| Componente | Modificação |
|------------|-------------|
| `App.jsx` — `carregarTudo()` | Adicionar `dbGet("contratos")` no Promise.all. Armazenar em `allContratos`. |
| `App.jsx` — sidebar nav | Adicionar item "Contratos" no menu lateral. |
| `App.jsx` — render switch | Adicionar `case "contratos"` com `<ModuloContratos>`. |
| `NovaDivida.jsx` (possível) | Opcionalmente adicionar campo `contrato_id` se parcela for criada via fluxo de contrato. Preferir que `NovoContrato` chame `criarDivida` diretamente. |

**Dados de ModuloContratos:**

```jsx
<ModuloContratos
  allContratos={allContratos}
  allDividas={allDividas}
  allPagamentosDivida={allPagamentosDivida}
  devedores={devedores}
  credores={credores}
  hoje={hoje}
  onCarregarTudo={carregarTudo}
/>
```

`DetalheContrato` calcula o saldo de cada parcela chamando `calcularSaldosPorDivida` para o devedor do contrato, com os `pagamentosDivida` filtrados por `divida_id` de cada parcela.

**Criação atômica de contrato:**

```
NovoContrato.handleSalvar():
  1. criarContrato(payload)          → retorna contrato.id
  2. Para cada parcela:
       criarDivida({
         ...dadosParcela,
         contrato_id: contrato.id,
         numero_parcela: i + 1,
         devedor_id: contrato.devedor_id,
         credor_id: contrato.credor_id,
       })
  3. Para cada dívida criada:
       adicionarParticipante({ devedorId, dividaId, papel: "PRINCIPAL", ... })
  4. onCarregarTudo()
  5. toast.success("Contrato criado com X parcelas")
```

Se qualquer `criarDivida` falhar, o contrato existe mas sem parcelas. Tratar com try/catch que deleta o contrato se nenhuma parcela foi criada (rollback parcial).

---

## Data Flow

### Fluxo Art. 354 CC em DetalheDivida (Phase 4)

O motor `devedorCalc.js` opera sobre um array de pagamentos com campo `data_pagamento`. A assinatura existente `calcularSaldosPorDivida(devedor, pagamentos, hoje)` espera que `pagamentos` já esteja filtrado pelo escopo desejado.

**Antes (v1.0):** `pagamentos` = todos `pagamentos_parciais` do devedor → amortização sequencial distribui entre todas as dívidas do devedor.

**Depois (v1.1):** `pagamentos` = `pagamentos_divida` filtrados por `divida_id` → amortização sequencial opera apenas sobre aquela dívida específica.

O motor não muda. O que muda é qual tabela alimenta o array e qual filtro é aplicado.

```
pagamentos_divida (nova tabela)
  ↓ filter by divida_id
calcularSaldosPorDivida(devedor, [pgtos da divida], hoje)
  ↓
saldoAtualizado por dívida → exibido em DetalheDivida
```

O Dashboard e FilaDevedor continuam usando `pagamentos_parciais` com escopo `devedor_id`. As duas tabelas coexistem sem conflito — representam escopos diferentes.

### Fluxo de saldo agregado em DetalheContrato (Phase 5)

```
contrato → dividas[] (contrato_id = contrato.id, ordenadas por numero_parcela)
  ↓
para cada divida:
  pagamentosDaDivida = allPagamentosDivida.filter(p => p.divida_id === divida.id)
  saldo = calcularSaldosPorDivida(devedor, pagamentosDaDivida, hoje)[divida.id]
  ↓
totalSaldoContrato = sum(saldo de cada parcela)
totalPagoContrato  = sum(pagamentos de cada parcela)
```

### Impacto em `carregarTudo()`

```js
// App.jsx — carregarTudo() após v1.1
const [
  devs, creds, processos, andamentos, regua, lems,
  pgtos,          // pagamentos_parciais (existente)
  divs,           // dividas (existente)
  pgtosDivida,    // pagamentos_divida (Phase 4 — novo)
  contratos,      // contratos (Phase 5 — novo)
] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  dbGet("processos"),
  dbGet("andamentos"),
  dbGet("regua_cobranca", "order=criado_em.asc"),
  dbGet("lembretes", "order=data_prometida.asc"),
  dbGet("pagamentos_parciais"),
  dbGet("dividas"),
  dbGet("pagamentos_divida"),     // Phase 4
  dbGet("contratos"),             // Phase 5
]);
```

Cada fetch é independente — `Promise.all` mantém paralelismo. Sem impacto de performance além do dado extra carregado.

---

## Build Order

### Phase 4 primeiro, Phase 5 segundo — Rationale

`DetalheContrato` (Phase 5) precisa exibir saldo por parcela. Saldo por parcela = `calcularSaldosPorDivida` com `pagamentos_divida`. Logo, Phase 5 depende de Phase 4 para exibir saldos corretos. Construir Phase 5 sem Phase 4 resulta em saldos zerados em DetalheContrato.

### Ordem de entrega dentro de Phase 4 (Pagamentos por Dívida)

| Etapa | Entregável | Dependência |
|-------|------------|-------------|
| 4.1 | Schema Supabase: `CREATE TABLE pagamentos_divida` | Nenhuma — primeiro passo |
| 4.2 | `src/services/pagamentosDivida.js` (CRUD) | 4.1 |
| 4.3 | `PagamentosDaDivida.jsx` (lista + form inline) | 4.2 |
| 4.4 | Integração em `DetalheDivida.jsx` (seção Pagamentos + saldo atualizado) | 4.3 |
| 4.5 | `carregarTudo()` em App.jsx: adicionar fetch `pagamentos_divida` + prop pass | 4.4 |

Etapa 4.5 por último porque a prop `allPagamentosDivida` só faz sentido quando `DetalheDivida` já a consome. Fazer 4.5 antes geraria um prop sem destino que confunde revisão de código.

### Ordem de entrega dentro de Phase 5 (Contratos)

| Etapa | Entregável | Dependência |
|-------|------------|-------------|
| 5.1 | Schema Supabase: `CREATE TABLE contratos` + `ALTER TABLE dividas ADD COLUMN contrato_id, numero_parcela` | 4.1 (pagamentos_divida precisa existir) |
| 5.2 | `src/services/contratos.js` (CRUD) | 5.1 |
| 5.3 | `TabelaContratos.jsx` (tabela simples, sem saldo ainda) | 5.2 |
| 5.4 | `NovoContrato.jsx` (wizard criação + geração de parcelas/dívidas) | 5.2, `criarDivida`, `adicionarParticipante` |
| 5.5 | `DetalheContrato.jsx` (saldo por parcela via calcularSaldosPorDivida + pagamentos_divida) | Phase 4 completa, 5.4 |
| 5.6 | `ModuloContratos.jsx` (orquestra TabelaContratos, DetalheContrato, NovoContrato) | 5.3, 5.5 |
| 5.7 | Integração em App.jsx: sidebar nav + render case + carregarTudo() | 5.6 |

---

## Phase Integration Notes

### Isolamento do cálculo existente

`calcularSaldoDevedorAtualizado` e `calcularTotalPagoPorDivida` em `devedorCalc.js` NÃO são modificados. Eles continuam sendo usados pelas telas de Pessoas/Devedores com `pagamentos_parciais`. Só `DetalheDivida` e `DetalheContrato` usarão `pagamentos_divida`.

O risco principal de regressão é acidentalmente passar `pagamentos_divida` onde `pagamentos_parciais` era esperado (ou vice-versa). Prevenir com nomenclatura explícita: `allPagamentos` (existente) vs `allPagamentosDivida` (novo) — nunca renomear a prop existente.

### Status da dívida após quitação

Quando o saldo de uma dívida atingir zero via `pagamentos_divida`, não existe atualização automática do `status` da dívida. A tela `DetalheDivida` deve exibir badge "Saldo quitado" derivado do cálculo, mas o campo `dividas.status` ainda requer atualização manual. Fase 4 não implementa atualização automática de status — manter simples, deixar para v1.2.

Para contratos: o status do contrato (`ativo`/`quitado`) deve ser derivado no cliente. Status `quitado` quando todas as parcelas (dívidas vinculadas) têm saldo zero. Não persistir esse cálculo em banco — calcular em `ModuloContratos` e exibir no badge.

### Efeito em `ModuloDividas` — tabela global

A `TabelaDividas` exibe saldo de cada dívida via `calcularSaldosPorDivida`. Hoje essa função recebe `pagamentosDoDevedor` (de `pagamentos_parciais`). Com Phase 4, a `TabelaDividas` poderia exibir saldo usando `pagamentos_divida` por performance — mas isso exige refactor do componente de tabela. Decisão: manter `TabelaDividas` usando o cálculo atual (pagamentos_parciais) na v1.1. Só `DetalheDivida` usa `pagamentos_divida` para o saldo preciso. Alinhar os dois após v1.1 se necessário.

### Supabase Row Level Security

O sistema atualmente não demonstra RLS configurado no código (usa `apikey` publishable diretamente). Novas tabelas devem seguir o mesmo padrão das existentes. Não implementar RLS na v1.1 — escopo excederia o milestone.

### Extração progressiva de App.jsx

Phase 5 adiciona um item ao sidebar e um `case` no switch render — operações localizadas. Aproveitar para extrair a lógica de `carregarTudo` em um hook separado (`useCarregarTudo`) se o tamanho do App.jsx passar de 7000 linhas com as adições. Não bloquear Phase 5 por isso.

### Compatibilidade com cálculo existente em Devedores

Os devedores importados para `calcularSaldoDevedorAtualizado` carregam `dividas` como array embutido (construído em `carregarTudo`). O novo campo `contrato_id` em `dividas` passará por esse mesmo mapeamento em `carregarTudo()` sem efeito colateral — o motor ignora campos que não reconhece.

---

*Pesquisa baseada em leitura direta de: App.jsx, devedorCalc.js, DetalheDivida.jsx, ModuloDividas.jsx, dividas.js, devedoresDividas.js, supabase.js, constants.js*
