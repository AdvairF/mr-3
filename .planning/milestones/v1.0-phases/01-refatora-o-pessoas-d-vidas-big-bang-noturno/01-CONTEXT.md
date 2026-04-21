# Phase 1: Refatoração Pessoas × Dívidas — Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/todos/pending/refatoracao-big-bang-noturno.md)

<domain>
## Phase Boundary

Esta fase extrai as dívidas do JSONB `devedores.dividas` para uma tabela própria `dividas` com UUID PK, recria a junction table `devedores_dividas` com FK real apontando para `dividas.id`, e atualiza o App.jsx para ler e escrever na nova estrutura. O label do menu "Devedores" passa a ser "Pessoas" na UI.

**O que NÃO entra nesta fase:**
- Renomear a tabela `devedores` para `pessoas` no banco
- Renomear `devedor_id` para `pessoa_id` nas junction tables
- Criar ficha de Pessoa separada (abas Telefones, Vínculos, Histórico unificado)
- Criar wizard de Nova Dívida em 3 passos
- Migrar contatos, acordos e parcelas do JSONB (somente `dividas`)

</domain>

<decisions>
## Implementation Decisions

### Decisão 1 — O que fazer com devedores_dividas.divida_id TEXT

**LOCKED:** Dropar e recriar `devedores_dividas` com `divida_id UUID REFERENCES dividas(id)` (FK real).

- Migration: `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql`
- A nova migration deve rodar DEPOIS que `dividas` estiver populada
- Seed nova: `INSERT INTO devedores_dividas ... JOIN dividas ON ...` (não mais via JSONB)
- `devedoresDividas.js` não muda interface — IDs passam a ser UUIDs reais
- Unique constraint `devedores_dividas_unico(divida_id, devedor_id)` permanece

### Decisão 2 — Estratégia de migração JSONB → tabela dividas

**LOCKED:** Big bang noturno com sequência:

1. **SQL no Supabase** (Passo 1 — rodar manualmente no SQL Editor):
   - Criar tabela `dividas` com UUID PK e campos do brief
   - `INSERT INTO dividas SELECT uuid_generate_v4(), d.id, div->>'credor_id', ... FROM devedores d, jsonb_array_elements(CASE WHEN jsonb_typeof(d.dividas) = 'array' THEN d.dividas ... END) div`
   - Manter coluna `devedores.dividas` intacta até confirmação de deploy (rollback)
   - Rodar `002_dividas_tabela.sql` (DROP devedores_dividas + CREATE com FK + seed via JOIN)

2. **Atualizar App.jsx** (Passo 2):
   - `carregarTudo()`: adicionar `dbGet("dividas", ...)` em paralelo; remover parsing JSONB
   - `Devedores` component: receber `dividas` como prop separado; ajustar leituras de `devedor.dividas[i].*`
   - Operações de escrita: `dbInsert/dbUpdate/dbDelete("dividas", ...)` em vez de stringify JSONB
   - Label do menu NAV: `"Devedores"` → `"Pessoas"`

3. **Build + push** (Passo 3): `npm run build` (roda `test:regressao`) + push → Vercel deploy

4. **Limpeza pós-confirmação** (Passo 4 — migration separada após confirmar deploy):
   - `ALTER TABLE devedores DROP COLUMN IF EXISTS dividas;`

**Risco principal — janela SQL → deploy:**
- Mitigação: manter JSONB durante toda a janela (app antigo continua funcional lendo JSONB)
- Nova versão do app lê de `dividas` (novo); JSONB removal só na migration de limpeza

### Decisão 3 — Naming

**LOCKED:** Só a UI — tabela `devedores` e `devedor_id` em todas as junções NÃO mudam.

- 1 string no array `NAV` de App.jsx: `label: "Devedores"` → `label: "Pessoas"`
- Internamente tudo permanece `devedor`, `devedores`, `devedor_id`

### Campos da tabela dividas

**LOCKED** (derivado do brief + JSONB atual):

```sql
CREATE TABLE dividas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  devedor_id            BIGINT REFERENCES devedores(id) ON DELETE CASCADE,  -- devedor principal (desnormalizado para queries rápidas)
  credor_id             BIGINT REFERENCES credores(id),
  tipo_titulo           TEXT,          -- cheque/nota promissória/contrato/boleto/duplicata/outros
  valor_original        NUMERIC(15,2),
  data_vencimento       DATE,
  indice_correcao       TEXT,          -- IGP-M/INPC/IPCA/nenhum
  juros_am_percentual   NUMERIC(8,4),
  multa_percentual      NUMERIC(8,4),
  honorarios_percentual NUMERIC(8,4),
  artigo_523_aplica     BOOLEAN DEFAULT false,
  status                TEXT DEFAULT 'em cobrança',
  documento_origem_url  TEXT,
  observacoes           TEXT,
  json_id_legado        TEXT,          -- Date.now() original do JSONB (para mapeamento na migration)
  contatos              JSONB,         -- manter JSONB de contatos por ora (fora do escopo separar)
  acordos               JSONB,         -- manter JSONB de acordos por ora
  parcelas              JSONB,         -- manter JSONB de parcelas por ora
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
```

**Nota:** `contatos`, `acordos`, `parcelas` permanecem como JSONB nesta fase (separação em tabelas próprias é fase futura).

### Restrições técnicas

**LOCKED:**
- App.jsx tem ~8700 linhas, sem TypeScript, sem router
- `npm run build` roda `test:regressao` como prebuild hook — não pode quebrar
- Tests existentes (`calculos.test.js`, `filaDevedor.test.js`) são pure unit — não dependem de DB
- `build/` é commitado ao repo; deploy = push ao Vercel
- Supabase REST (sem SDK JS) — todas as queries via `sb()` / `dbGet/dbInsert/dbUpdate/dbDelete`
- IDs de dívidas atualmente são `Date.now()` como TEXT — precisam ser mapeados para UUID na migration

### Claude's Discretion

- Estrutura exata do SQL da migration (nomes de índices, constraints auxiliares)
- Estratégia de retry/erro no `carregarTudo()` para o novo load de `dividas`
- Como tratar dívidas com `json_id_legado` nulo durante a migração
- Ordem exata de passos dentro do App.jsx (o que requer rollback vs. o que é seguro atualizar primeiro)
- Nomear o arquivo migration como `002_dividas_tabela.sql` ou similar

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Arquitetura e decisões
- `.planning/notes/decisoes-refatoracao-pessoas-dividas.md` — 3 decisões arquiteturais com rationale
- `brief-refatoracao-modulo-devedores.md` — spec completo com campos, fluxos UX e critérios de aceitação
- `.planning/codebase/ARCHITECTURE.md` — arquitetura atual (data flow, camadas, abstrações)
- `.planning/codebase/STRUCTURE.md` — estrutura de diretórios e convenções de nomenclatura

### Código existente (ler antes de qualquer mudança)
- `src/mr-3/mr-cobrancas/src/App.jsx` — monólito; focar em `carregarTudo()` e função `Devedores`
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `sb()`, `dbGet/Insert/Update/Delete`
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — service que continuará funcionando
- `src/mr-3/mr-cobrancas/src/services/migrations/001_devedores_dividas.sql` — migration existente (referência de padrão)
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — componente já construído para N:N

### Testes (não podem quebrar)
- `src/mr-3/mr-cobrancas/src/services/__tests__/calculos.test.js`
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js`

</canonical_refs>

<specifics>
## Specific Ideas

- **`json_id_legado` column** na tabela `dividas`: preserva o `Date.now()` original do JSONB para que a migration de `devedores_dividas` possa fazer JOIN `WHERE dividas.json_id_legado = devedores_dividas.divida_id`
- **`carregarTudo()` refactor**: adicionar `dbGet("dividas", "select=*")` no array de promises paralelas; desserializar e organizar por `devedor_id` num Map antes de setar estado
- **Rollback**: enquanto JSONB não for removido (migration de limpeza), um rollback de código volta a ler de `devedores.dividas` sem perda de dados
- **4 devedores atuais**: advair (1 dívida R$ 4.000), TRADIO PAGAMENTOS (R$ 5.323,47), TRADIO SOLUÇÕES (R$ 115,44), LOURENCO CONSTRUTORA (R$ 0,00) — todos devem estar na tabela `dividas` após migração

</specifics>

<deferred>
## Deferred Ideas

- Separar `contatos` do JSONB para tabela `historico_contatos` — fase futura
- Separar `acordos` do JSONB para tabela `acordos` própria — fase futura
- Separar `parcelas` do JSONB para tabela `pagamentos_parciais` (parcialmente já feito via quick tasks) — fase futura
- Ficha de Pessoa com abas (Telefones, Vínculos, Histórico unificado) — fase futura
- Wizard de Nova Dívida em 3 passos — fase futura
- Renomear tabela `devedores` para `pessoas` no banco — fora do escopo desta fase

</deferred>

---

*Phase: 01-refatora-o-pessoas-d-vidas-big-bang-noturno*
*Context gathered: 2026-04-18 via PRD Express Path*
