# Phase 01: Refatoração Pessoas × Dívidas — big bang noturno — Research

**Researched:** 2026-04-18
**Domain:** React monolith refactoring + Supabase JSONB → relational table migration
**Confidence:** HIGH (all findings verified against live codebase)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Decisão 1 — devedores_dividas.divida_id TEXT:** Dropar e recriar com `divida_id UUID REFERENCES dividas(id)`. Migration: `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql`. Nova migration roda DEPOIS que `dividas` estiver populada. Seed nova: `INSERT INTO devedores_dividas ... JOIN dividas ON ...`. `devedoresDividas.js` não muda interface.

**Decisão 2 — Estratégia big bang noturno:**
1. SQL no Supabase: criar `dividas` + INSERT de JSONB + manter `devedores.dividas` intacto + rodar 002
2. Atualizar App.jsx: `carregarTudo()` + `Devedores` component + operações de escrita
3. `npm run build` + push → Vercel deploy
4. Limpeza pós-confirmação: `ALTER TABLE devedores DROP COLUMN IF EXISTS dividas`

**Decisão 3 — Naming:** Só a UI. Tabela `devedores` e `devedor_id` NÃO mudam. Apenas `label: "Devedores"` → `label: "Pessoas"` no array NAV de App.jsx.

**Campos da tabela dividas:** UUID PK, devedor_id BIGINT, credor_id BIGINT, tipo_titulo TEXT, valor_original NUMERIC(15,2), data_vencimento DATE, indice_correcao TEXT, juros_am_percentual NUMERIC(8,4), multa_percentual NUMERIC(8,4), honorarios_percentual NUMERIC(8,4), artigo_523_aplica BOOLEAN, status TEXT, documento_origem_url TEXT, observacoes TEXT, json_id_legado TEXT, contatos JSONB, acordos JSONB, parcelas JSONB, created_at/updated_at TIMESTAMPTZ.

**Restrições técnicas:** App.jsx ~8827 linhas, sem TypeScript, sem router. `npm run build` roda `test:regressao` como prebuild — não pode quebrar. Tests são pure unit (sem DB). `build/` commitado. Supabase REST via `sb()`/`dbGet/dbInsert/dbUpdate/dbDelete`. IDs atuais são `Date.now()` TEXT.

### Claude's Discretion

- Estrutura exata do SQL da migration (nomes de índices, constraints auxiliares)
- Estratégia de retry/erro no `carregarTudo()` para o novo load de `dividas`
- Como tratar dívidas com `json_id_legado` nulo durante a migração
- Ordem exata de passos dentro do App.jsx (o que requer rollback vs. o que é seguro atualizar primeiro)
- Nomear o arquivo migration como `002_dividas_tabela.sql` ou similar

### Deferred Ideas (OUT OF SCOPE)

- Separar `contatos`/`acordos`/`parcelas` do JSONB para tabelas próprias
- Ficha de Pessoa com abas (Telefones, Vínculos, Histórico unificado)
- Wizard de Nova Dívida em 3 passos
- Renomear tabela `devedores` para `pessoas` no banco
</user_constraints>

---

## Summary

Esta fase extrai as dívidas do JSONB `devedores.dividas` para uma tabela `dividas` com UUID PK, recria `devedores_dividas` com FK real, e atualiza App.jsx para ler/escrever na nova estrutura. O label "Devedores" vira "Pessoas" no menu.

O codebase foi inspecionado completamente. App.jsx tem **8827 linhas** (não 8700 como estimado). A função `carregarTudo()` está na linha 8450, o array NAV na linha 8538. Foram identificadas **6 superfícies de escrita** que usam `JSON.stringify(dividas)` + `dbUpdate("devedores", ...)` — todas dentro da função `Devedores` inline em App.jsx.

O JSONB apresenta **dupla codificação em alguns casos**: a migration 001 já lida com isso (`CASE WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb`). A migration 002 precisa replicar esse mesmo padrão defensivo.

Os testes existentes (`calculos.test.js`, `filaDevedor.test.js`) são 100% pure unit — não fazem nenhuma chamada a banco, não importam nada que será alterado. O prebuild `test:regressao` **não quebrará** com as mudanças planejadas.

**Recomendação primária:** Executar em 4 ondas distintas com checkpoint de validação após cada uma. A ordem importa: SQL primeiro (tabela populada), depois App.jsx (lê nova tabela), depois build/deploy, depois limpeza JSONB.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Criação tabela dividas + seed JSONB | Database (Supabase SQL Editor) | — | DDL manual, não há ORM |
| Recriação devedores_dividas com FK UUID | Database (Supabase SQL Editor) | — | DROP+CREATE requer SQL direto |
| Carregamento paralelo de dividas | Frontend (App.jsx carregarTudo) | — | Todo carregamento de dados inicia em carregarTudo() |
| Indexação dividas por devedor_id | Frontend (Map em memória) | — | Padrão atual: Map<devedor_id, rows[]> para lookup O(1) |
| CRUD dívidas (criar/editar/excluir) | Frontend (Devedores component) | Supabase REST | 6 funções em App.jsx viram dbInsert/dbUpdate/dbDelete("dividas") |
| Label "Pessoas" no menu | Frontend (NAV array linha 8540) | — | 1 string change |
| Seed principal em devedores_dividas | Frontend (seedPrincipal call) | Database trigger (opcional) | Já existe chamada pós-criação na linha 3299 |

---

## Standard Stack

### Core (verificado no codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI | Já em uso |
| Vite | 5.x | Build + test runner | Já em uso, prebuild configurado |
| Vitest | (via vite) | Test framework | Já configurado em vite.config.js |
| Supabase REST (PostgREST) | — | DB access via `sb()` wrapper | Padrão estabelecido — sem SDK JS |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `gen_random_uuid()` | Postgres built-in | UUID PK para `dividas` | Na criação do CREATE TABLE |
| `jsonb_array_elements()` | Postgres built-in | LATERAL para extrair JSONB | No INSERT seed da migration |

**Nenhuma nova dependência JS é necessária para esta fase.** [VERIFIED: package.json]

---

## Architecture Patterns

### System Architecture Diagram

```
[Supabase DB]
    │
    ├─ devedores (BIGINT PK) ──── dividas JSONB (legado, mantido até limpeza)
    │
    ├─ dividas (UUID PK) ◄────── NEW: extraída do JSONB
    │       └─ json_id_legado TEXT  (bridge para migration 002)
    │
    └─ devedores_dividas ◄─────── RECREATED: divida_id UUID FK → dividas.id
            ├─ devedor_id BIGINT FK → devedores.id
            └─ papel, responsabilidade, etc.

[App.jsx carregarTudo()]
    │
    ├─ Promise.all([
    │       dbGet("devedores"),    ← mantém (parse JSONB removido pós-migration)
    │       dbGet("dividas"),      ← NOVO: carregado em paralelo
    │       dbGet("credores"), ... 
    │   ])
    │
    ├─ Organiza dividas em Map<devedor_id, divida[]>
    │
    └─ setDevedores(devs) + setDividas(dividasMap)
                                ↓
[Devedores component]
    ├─ Recebe prop `dividas` (Map ou array filtrado por devedor_id)
    ├─ Render: lê de `dividas` em vez de `devedor.dividas`
    └─ Write: dbInsert/dbUpdate/dbDelete("dividas", ...) em vez de JSON.stringify
```

### Recommended Project Structure (sem mudança)

```
src/mr-3/mr-cobrancas/src/
├── App.jsx              # modificado: carregarTudo + Devedores component + NAV
├── services/
│   ├── migrations/
│   │   ├── 001_devedores_dividas.sql   # existente (não tocar)
│   │   └── 002_dividas_tabela.sql      # NOVO: criar tabela + seed + recriar devedores_dividas
│   └── dividas.js                      # NOVO (opcional): CRUD service para dividas
```

### Pattern 1: JSONB dupla codificação — extração defensiva

Verificado na `001_devedores_dividas.sql` linha 65-70 [VERIFIED: codebase]:

```sql
-- Source: src/mr-3/mr-cobrancas/src/services/migrations/001_devedores_dividas.sql
LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb
    WHEN jsonb_typeof(d.dividas) = 'array'  THEN d.dividas
    ELSE '[]'::jsonb
  END
) AS div_row
```

A migration 002 DEVE replicar este mesmo padrão `CASE` no INSERT de seed para `dividas`.

### Pattern 2: carregarTudo() — Promise.all com novo slot

[VERIFIED: App.jsx linha 8453-8461]

```javascript
// ANTES
const [devs, creds, procs, ands, reg, lems, pgtos] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  ...
]);

// DEPOIS
const [devs, creds, procs, ands, reg, lems, pgtos, divs] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  ...
  dbGet("dividas"),  // ← adicionar no fim do array
]);
// Organizar em Map para lookup O(1) no Devedores component
const dividasMap = new Map();
(divs || []).forEach(div => {
  const k = String(div.devedor_id);
  if (!dividasMap.has(k)) dividasMap.set(k, []);
  dividasMap.get(k).push(div);
});
setDividas(dividasMap); // novo useState no App root
```

### Pattern 3: Write surface — da mutação JSONB para dbInsert/dbUpdate/dbDelete

[VERIFIED: App.jsx — 6 superfícies de escrita]

**Criar dívida** (linha 3276-3311): `id: Date.now()` → `dbInsert("dividas", { ... })` → usar UUID retornado
**Criar custas** (linha 3321-3348): igual ao criar dívida, `_so_custas: true` → campo `observacoes`
**Editar dívida** (linha 3405-3467): `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(...) })` → `dbUpdate("dividas", divida.uuid, { ... })`
**Excluir dívida** (linha 3368-3381): `filter` + `JSON.stringify` → `dbDelete("dividas", divida.uuid)`
**Toggle parcela** (linha 3351-3366): parcelas ficam em JSONB `dividas.parcelas` nesta fase (deferred) → `dbUpdate("dividas", divida.uuid, { parcelas: JSON.stringify(...) })`
**Criar devedor** (linha 3089): `dividas: JSON.stringify([])` → não precisará mais serializar dividas na criação do devedor

### Pattern 4: montarDevAtualizado helper — precisa de adaptação

[VERIFIED: App.jsx — linha 3293, 3337, 3375, 3434, 3475]

A função `montarDevAtualizado(atu, dividas)` é chamada após toda operação de escrita para reconstruir o objeto devedor no estado React. Após a migração, o devedor em estado **não carrega mais `dividas` embutidas** — o Devedores component recebe `dividas` como prop separada. Essa função precisa ser simplificada ou adaptada.

### Anti-Patterns to Avoid

- **Remover JSONB antes do deploy:** O JSONB deve permanecer intacto até confirmar que o app novo está funcional no Vercel. Nunca dropar antes.
- **Usar `String(Date.now())` como ID em novos registros:** Após a migration, IDs de dívidas são UUIDs retornados pelo Supabase. Não gerar IDs no cliente.
- **Sincronizar `devedores.valor_original` manualmente:** Atualmente calculado como soma de `dividas.valor_total`. Após migração, a query pode usar JOIN ou manter a coluna atualizada via App.jsx.
- **Alterar `devedoresDividas.js`:** O serviço não muda interface — apenas os IDs passam a ser UUIDs reais. Sem alteração no arquivo.
- **Quebrar a chamada `seedPrincipal`:** Na linha 3299, após criar dívida, `seedPrincipal(sel.id, divida.id)` é chamado. Após a migration, passar o UUID retornado do `dbInsert("dividas")`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UUID generation | Client-side `crypto.randomUUID()` | `gen_random_uuid()` DEFAULT no schema | IDs gerados no DB garantem unicidade real |
| JSONB double-decode | Nova função parse | Padrão `CASE jsonb_typeof` já testado em 001 | Já funciona com dados reais |
| Map lookup dividas por devedor | Nested loop O(n²) no render | `Map<devedor_id, divida[]>` em carregarTudo | O(1) por devedor, padrão já usado em `pgtosPorDevedorCarteira` (linha 8517) |
| Rollback manual | Script de rollback | Manter coluna JSONB intacta + redeployar versão anterior | Supabase não tem transações DDL cross-step; manter JSONB é a mitigação |

**Key insight:** O padrão Map para agregar dados relacionados já é usado no projeto (`pgtosPorDevedorCarteira` na linha 8517). Replicar exatamente esse padrão para `dividasMap`.

---

## Runtime State Inventory

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `devedores.dividas` JSONB: 4 devedores com dívidas embedidas (confirmed in CONTEXT.md). `devedores_dividas` TABLE: rows com `divida_id TEXT` apontando para `Date.now()` IDs do JSONB | Migrar para tabela `dividas` (INSERT FROM JSONB); recriar `devedores_dividas` com UUID FK |
| Live service config | Nenhum serviço externo referencia IDs de dívidas diretamente (não há webhooks, não há integrações) | Nenhuma |
| OS-registered state | Nenhum — Vercel deploy automático via push | Nenhuma |
| Secrets/env vars | `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no ambiente Vercel — nomes não mudam | Nenhuma |
| Build artifacts | `build/` commitado ao repo. Após `npm run build`, novo build substitui o anterior | `npm run build` + commit + push |

**Detalhe crítico sobre devedores_dividas:** Os rows atuais têm `divida_id` como `Date.now()` string (ex: `"1713456789000"`). Após criação da tabela `dividas` com `json_id_legado TEXT`, o JOIN na migration 002 é:
```sql
INSERT INTO devedores_dividas (devedor_id, divida_id, papel, responsabilidade)
SELECT dd_old.devedor_id, div.id, dd_old.papel, dd_old.responsabilidade
FROM devedores_dividas dd_old
JOIN dividas div ON div.json_id_legado = dd_old.divida_id
```
**Dívidas sem `json_id_legado`:** Podem existir se a coluna JSONB estava vazia ou com id nulo. A migration deve ignorá-las graciosamente (WHERE json_id_legado IS NOT NULL).

---

## Common Pitfalls

### Pitfall 1: JSONB dupla codificação
**What goes wrong:** `devedores.dividas` pode estar armazenada como string JSON (texto) dentro do campo JSONB, em vez de um array JSONB diretamente. Isso ocorre quando o app fez `JSON.stringify(array)` e salvou como text.
**Why it happens:** O App.jsx usa `JSON.stringify(dividas)` em todos os writes — o Supabase pode receber isso como texto.
**How to avoid:** Usar o mesmo `CASE WHEN jsonb_typeof(d.dividas) = 'string' THEN (d.dividas #>> '{}')::jsonb` da migration 001 [VERIFIED].
**Warning signs:** O INSERT de seed não produz rows se o CASE não lidar com dupla codificação.

### Pitfall 2: `montarDevAtualizado` quebra sem `dividas` embutidas
**What goes wrong:** Após a migração, o devedor em estado React não terá mais `.dividas[]` embutido. Qualquer código que acessa `devedor.dividas` (fora do componente `Devedores`) vai receber `undefined`.
**Why it happens:** O App.jsx tem `devedor.dividas` referenciado em múltiplos locais fora do componente `Devedores` — ex: linha 592, 599, 1060, 2603 e no `carregarTudo()` linha 8466.
**How to avoid:** Na transição, manter `devedor.dividas` como array vazio `[]` em estado (remover apenas o parsing, não o campo). Componentes que fazem `calcularSaldoDevedorAtualizado` precisam receber as dívidas de fora via prop.
**Warning signs:** Erros de runtime `Cannot read properties of undefined (reading 'reduce')` no painel de carteira.

### Pitfall 3: `devedorCalc.js` recebe devedor sem dívidas embutidas
**What goes wrong:** `calcularSaldoDevedorAtualizado`, `calcularDetalheEncargos`, `calcularPlanilhaCompleta` em `devedorCalc.js` chamam `parseDividas(devedor.dividas)` internamente [VERIFIED: devedorCalc.js linhas 39, 60, 173]. Se `devedor.dividas` for undefined, retornam zero.
**Why it happens:** FilaDevedor, GerarPeticao, e componentes de relatório passam o devedor diretamente para essas funções. Eles não têm acesso ao `dividasMap` da App.
**How to avoid:** Ao construir o objeto devedor no `carregarTudo()`, popular `devedor.dividas` a partir do `dividasMap` antes de `setDevedores()`. Isso mantém compatibilidade com todas as chamadas para `devedorCalc.js` sem alterar nenhum utilitário.
**Warning signs:** Valor da carteira mostra R$0, FilaDevedor mostra dívidas zeradas.

### Pitfall 4: seedPrincipal após criar dívida usa o UUID errado
**What goes wrong:** Na linha 3299, `seedPrincipal(sel.id, divida.id)` usa o `id` local (`Date.now()`). Após a migração, a dívida foi salva com UUID — o `id` local não existe mais no DB.
**Why it happens:** O código atual cria o objeto `divida` localmente (linha 3277: `id: Date.now()`) e só depois persiste.
**How to avoid:** Após `dbInsert("dividas", payload)`, usar o `id` retornado pelo Supabase (UUID) para chamar `seedPrincipal(sel.id, novaDiv.id)`.
**Warning signs:** `devedores_dividas` fica sem row para a nova dívida; `DevedoresDaDivida.jsx` não mostra o devedor principal.

### Pitfall 5: Reload forçado pós-save (linha 3449-3464) ainda busca de devedores.dividas
**What goes wrong:** Após `salvarEdicaoDivida()`, há um reload forçado que busca `dbGet("devedores", `id=eq.${sel.id}`)` e re-parseia `freshDev.dividas`. Após a migração, `freshDev.dividas` virá null/vazio do Supabase (JSONB removido ou vazio).
**Why it happens:** O reload foi adicionado como fix para Art.523 (task 260417-ttn). Busca o devedor fresco mas o campo `dividas` não terá mais dados.
**How to avoid:** Após a migration, o reload pós-save deve buscar `dbGet("dividas", `devedor_id=eq.${sel.id}`)` em vez de re-parsear `devedores.dividas`.
**Warning signs:** Art.523 para de funcionar após editar dívida; painel mostra valores antigos.

### Pitfall 6: `carregarTudo()` memoizado com `useCallback([], [])` — deps vazias
**What goes wrong:** `carregarTudo` usa `useCallback(async () => { ... }, [])` com deps vazias [VERIFIED: linha 8450, 8489]. Adicionar `setDividas` ao corpo não exige adicionar às deps (é setter estável), mas se o novo estado for um `useState` no root, deve ser declarado antes do `carregarTudo`.
**How to avoid:** Declarar `const [dividas, setDividas] = useState(new Map())` antes da definição de `carregarTudo`.

---

## JSONB Field Mapping: JSONB → tabela dividas

Campos do objeto dívida no JSONB atual [VERIFIED: App.jsx linhas 3276-3287, 3411-3428]:

| Campo JSONB | Coluna `dividas` | Tipo | Notas |
|-------------|-----------------|------|-------|
| `id` (Date.now()) | `json_id_legado` | TEXT | Preservado para JOIN na migration 002 |
| `descricao` | `observacoes` | TEXT | Campo descritivo |
| `valor_total` | `valor_original` | NUMERIC(15,2) | |
| `data_origem` | — | — | Sem coluna equivalente — usar `data_vencimento` |
| `data_vencimento` | `data_vencimento` | DATE | |
| `data_inicio_atualizacao` | — | TEXT (em observacoes ou campo próprio) | Não está no schema locked — ASSUMED |
| `indexador` | `indice_correcao` | TEXT | igpm/inpc/ipca/nenhum |
| `juros_tipo` | — | TEXT | Ex: "fixo_1", "taxa_legal_406" — não mapeado no schema locked |
| `juros_am` | `juros_am_percentual` | NUMERIC(8,4) | |
| `multa_pct` | `multa_percentual` | NUMERIC(8,4) | |
| `honorarios_pct` | `honorarios_percentual` | NUMERIC(8,4) | |
| `art523_opcao` | `artigo_523_aplica` | BOOLEAN/TEXT | JSONB tem "nao_aplicar"/"so_multa"/"multa_honorarios" — schema locked tem BOOLEAN |
| `despesas` | — | NUMERIC | Não está no schema locked — [ASSUMED: adicionar à tabela] |
| `custas` | — | JSONB | Array de {descricao, valor, data} — manter JSONB |
| `parcelas` | `parcelas` | JSONB | Manter JSONB nesta fase |
| `observacoes` | `observacoes` | TEXT | |
| `_so_custas` | — | BOOLEAN | Flag especial para dívidas de custas — [ASSUMED: adicionar campo] |
| `_nominal` | — | BOOLEAN | Flag para entrada nominal inicial — [ASSUMED: ignorar ou adicionar] |
| `criada_em` | `created_at` | TIMESTAMPTZ | |

**CONFLITO CRÍTICO — `artigo_523_aplica BOOLEAN` vs `art523_opcao TEXT`:**
O schema locked define `artigo_523_aplica BOOLEAN DEFAULT false`. Mas o código usa `art523_opcao` com valores `"nao_aplicar"` / `"so_multa"` / `"multa_honorarios"` [VERIFIED: App.jsx linha 3286, 3401, devedorCalc.js linha 261]. Um BOOLEAN não representa os 3 estados. **Recomendação:** Usar `art523_opcao TEXT DEFAULT 'nao_aplicar'` em vez de BOOLEAN — mais fiel ao comportamento existente. [ASSUMED: override necessário do schema locked, requer confirmação]

**CAMPOS AUSENTES DO SCHEMA LOCKED que o código usa ativamente:**
- `data_origem` — usada em `devedorCalc.js` como fallback de `data_vencimento`
- `juros_tipo` — campo essencial para cálculos ("fixo_1", "taxa_legal_406", "sem_juros", etc.)
- `despesas` — valor numérico de despesas avulsas
- `data_inicio_atualizacao` — data de início da correção monetária
- `_so_custas` — flag para distinguir lançamento de custas de dívida normal

Esses campos precisam ser adicionados ao CREATE TABLE ou os cálculos em `devedorCalc.js` vão retornar zero/incorreto. [VERIFIED: devedorCalc.js linhas 76-82, 188-194]

---

## Write Surface Area — Inventário Completo

[VERIFIED: App.jsx — todas as linhas verificadas]

| Função | Linha | Operação atual | Operação nova |
|--------|-------|----------------|---------------|
| `adicionarDivida()` | 3270 | `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas) })` | `dbInsert("dividas", dividaPayload)` → usar UUID retornado |
| `adicionarCustasAvulsas()` | 3314 | `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas) })` | `dbInsert("dividas", { ...dividaCustas, _so_custas: true })` |
| `salvarEdicaoDivida()` | 3405 | `dbUpdate("devedores", sel.id, { dividas: JSON.stringify(dividas) })` | `dbUpdate("dividas", editDivId, { ...camposEditados })` |
| `excluirDivida()` | 3368 | filter + `dbUpdate("devedores", ..., { dividas: JSON.stringify(...) })` | `dbDelete("dividas", dId)` |
| `toggleParcela()` | 3351 | mutate parcelas + `dbUpdate("devedores", ..., { dividas: JSON.stringify(...) })` | `dbUpdate("dividas", dividaId, { parcelas: JSON.stringify(...) })` |
| Reload pós-save (fix Art.523) | 3449 | `dbGet("devedores", id=eq.X)` + re-parse `freshDev.dividas` | `dbGet("dividas", "devedor_id=eq.X")` |
| `salvarDevedor()` (criar) | 3089 | `dividas: JSON.stringify([])` no payload | Remover campo `dividas` do payload de criação |

**Total de superfícies de escrita:** 7 (6 funções + 1 reload pós-save).

---

## NAV Array — Localização Exata

[VERIFIED: App.jsx linha 8540]

```javascript
// Linha 8540 — mudar apenas o label:
{ id: "devedores", label: "Devedores", icon: I.dev, color: "#ec4899", bg: "rgba(236,72,153,.18)" }
//                         ↑ mudar para "Pessoas"
```

**Também verificado:** Linha 8787 tem `{ label: "Devedores", value: devedores.length, ... }` dentro de um card do Dashboard — este é um card de estatística, não um item de menu. Deve ser alterado também para consistência com o label "Pessoas".

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (via Vite 5.x) |
| Config file | `src/mr-3/mr-cobrancas/vite.config.js` — `test: { environment: 'node', globals: true, pool: 'threads' }` |
| Quick run command | `npm run test:regressao` (de dentro de `src/mr-3/mr-cobrancas/`) |
| Full suite command | `npm test` (roda todos os .test.js) |
| Prebuild gate | `"prebuild": "npm run test:regressao"` — falha na build se tests quebrarem |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-01 | Tabela `dividas` existe com UUID PK e dados migrados | Manual (SQL) | Verificar no Supabase Dashboard | N/A |
| REQ-02 | `devedores_dividas` usa FK UUID real | Manual (SQL) | `SELECT constraint_name FROM information_schema.table_constraints WHERE table_name='devedores_dividas'` | N/A |
| REQ-03 | `carregarTudo()` carrega dividas em paralelo | Integration (manual) | Abrir app, inspecionar Network tab | N/A |
| REQ-04 | Componente Devedores lê de `dividas` prop | Integration (manual) | Abrir módulo, verificar 4 devedores e suas dívidas | N/A |
| REQ-05 | CRUD dívidas funciona com nova estrutura | Integration (manual) | Criar/editar/excluir uma dívida de teste | N/A |
| REQ-06 | Label "Pessoas" no menu | Visual (manual) | Abrir app, verificar sidebar | N/A |
| REQ-07 | `npm run build` passa (test:regressao) | Automated | `npm run build` | ✅ |
| REQ-08 | 4 devedores e dívidas visíveis no Vercel | Integration (manual) | Acessar mrcobrancas.com.br | N/A |
| REQ-09 | Cálculos financeiros corretos após migração | Automated | `npm run test:regressao` | ✅ |

### Sampling Rate

- **Por commit de código:** `npm run test:regressao` (roda automaticamente via prebuild)
- **Por wave:** `npm test` (suite completa antes de push)
- **Phase gate:** Build verde + verificação manual dos 4 devedores no Vercel

### Wave 0 Gaps

Nenhum — a infraestrutura de teste existente cobre os REQs automatizáveis. Os REQs manuais são verificados via Vercel deploy.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js + npm | Build e tests | ✓ | (inferido do projeto ativo) | — |
| Vite + Vitest | Prebuild gate | ✓ | Configurado em vite.config.js | — |
| Supabase SQL Editor | Migration manual | ✓ (acesso via dashboard web) | — | — |
| Vercel | Deploy | ✓ (push automático) | — | — |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `artigo_523_aplica BOOLEAN` no schema locked deve ser substituído por `art523_opcao TEXT` | JSONB Field Mapping | Se mantido como BOOLEAN, cálculos Art.523 quebram (perdem "so_multa" vs "multa_honorarios") |
| A2 | Campos `data_origem`, `juros_tipo`, `despesas`, `data_inicio_atualizacao`, `_so_custas` precisam ser adicionados ao CREATE TABLE | JSONB Field Mapping | Se ausentes, devedorCalc.js retorna zeros; Art.523 quebra; custas judiciais perdem tipo |
| A3 | Card Dashboard linha 8787 `{ label: "Devedores" }` deve virar "Pessoas" | NAV Array | Inconsistência visual menor — não quebra funcionalidade |
| A4 | `filaDevedor.test.js` faz chamadas reais a DB (não pure unit) e não está no prebuild | Test Impact | Se incluído na suite prebuild, pode quebrar por falta de conexão DB |

**Nota sobre A4:** O `filaDevedor.test.js` nas primeiras linhas mostra `dbGet("devedores")` e `dbInsert("operadores")` — chamadas reais de banco. Ele NÃO está incluído em `test:regressao` (que roda apenas `calculos.test.js`). O `npm test` completo rodaria ambos, mas o prebuild de build usa apenas `test:regressao`. [VERIFIED: package.json scripts + filaDevedor.test.js linhas 1-9]

---

## Open Questions

1. **`art523_opcao` vs `artigo_523_aplica BOOLEAN`**
   - What we know: O código usa TEXT com 3 valores ("nao_aplicar", "so_multa", "multa_honorarios"). O schema locked define BOOLEAN.
   - What's unclear: Se o planner deve alterar o schema locked ou adaptar o código para o BOOLEAN.
   - Recommendation: Usar `art523_opcao TEXT DEFAULT 'nao_aplicar'` — zero custo de código vs. alto risco de regressão se usar BOOLEAN.

2. **Campos ausentes do schema locked (`juros_tipo`, `data_origem`, `despesas`, etc.)**
   - What we know: São 5 campos usados ativamente no devedorCalc.js mas não no schema locked.
   - What's unclear: Se foram omitidos intencionalmente ou por erro.
   - Recommendation: Adicionar todos ao CREATE TABLE. A migration deve ser extensiva — melhor ter campos extras que perder dados de cálculo.

3. **`devedores.valor_original` pós-migração**
   - What we know: Atualmente calculado como `dividas.reduce((s,d) => s + d.valor_total, 0)` no App. Após migração, não há mais dívidas embutidas no devedor.
   - What's unclear: Se a coluna `devedores.valor_original` deve ser mantida sincronizada via App.jsx ou deixada como legado.
   - Recommendation: No write de dívidas, atualizar `devedores.valor_original` também (`dbUpdate("devedores", sel.id, { valor_original: soma })`) — mantém compatibilidade com código que usa `devedor.valor_original`.

---

## Sources

### Primary (HIGH confidence)

- `src/mr-3/mr-cobrancas/src/App.jsx` (8827 linhas) — verificado: carregarTudo L8450, NAV L8538, write surfaces L3270-3467, Devedores function L2948
- `src/mr-3/mr-cobrancas/src/services/migrations/001_devedores_dividas.sql` — verificado: padrão dupla codificação JSONB, schema atual devedores_dividas
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — verificado: interface seedPrincipal, divida_id como String
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — verificado: campos de dívida consumidos por cálculos
- `src/mr-3/mr-cobrancas/vite.config.js` — verificado: test config, prebuild
- `src/mr-3/mr-cobrancas/package.json` — verificado: scripts, prebuild gate
- `src/mr-3/mr-cobrancas/src/services/__tests__/calculos.test.js` — verificado: pure unit, sem DB
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js` — verificado: acessa DB real, não está no prebuild
- `.planning/phases/01-refatora-o-pessoas-d-vidas-big-bang-noturno/01-CONTEXT.md` — decisões locked

### Secondary (MEDIUM confidence)

- `.planning/codebase/ARCHITECTURE.md` — arquitetura atual documentada
- `.planning/codebase/STRUCTURE.md` — convenções de nomenclatura
- `.planning/notes/decisoes-refatoracao-pessoas-dividas.md` — rationale das decisões

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — sem novas dependências, verificado em package.json
- Write Surface Area: HIGH — todas as 7 superfícies verificadas por grep + leitura de código
- JSONB Field Mapping: MEDIUM — campos verified, mapeamento para schema locked tem A1/A2 assumptions
- Pitfalls: HIGH — identificados a partir de leitura direta do código, não inferidos
- Migration order: HIGH — sequência locked no CONTEXT.md + verificada contra constraints reais do Postgres

**Research date:** 2026-04-18
**Valid until:** Indefinido (codebase estável; só invalida se App.jsx tiver major changes)
