# Quick Task 260416-id0: Criar tabela pagamentos_parciais no Supabase e verificar tabelas faltando - Research

**Researched:** 2026-04-16
**Domain:** Supabase schema — mr-cobrancas
**Confidence:** HIGH (tables verified via live HTTP probing against the real Supabase project)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Criar `pagamentos_parciais` com o SQL exato fornecido (incluindo RLS com `auth.role() = 'authenticated'`)
- Varrer código-fonte para listar todas as tabelas usadas, comparar com Supabase, criar as faltando
- Padrão RLS para novas tabelas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `CREATE POLICY "Acesso autenticado" ... USING (auth.role() = 'authenticated')`

### Claude's Discretion
- Estrutura de colunas para tabelas adicionais faltando (inferir do código)
- Ordem de criação (respeitar dependências de FK)

### Deferred Ideas (OUT OF SCOPE)
- Nenhum item deferido registrado
</user_constraints>

---

## Summary

O codebase usa a API REST do Supabase diretamente (sem supabase-js), via helpers `dbGet/dbInsert/dbUpdate/dbDelete` em `src/config/supabase.js`. Todas as referências de tabelas aparecem como strings nesses helpers.

A varredura completa do código-fonte identificou **12 tabelas** referenciadas. A sondagem HTTP ao projeto Supabase real (`nzzimacvelxzstarwqty.supabase.co`) confirmou que **10 tabelas existem** e **2 estão faltando**.

**Resultado principal:**
- `pagamentos_parciais` — **JA EXISTE** (retorna HTTP 200, array vazio). O SQL fornecido pelo usuário usa `IF NOT EXISTS`, portanto é seguro executá-lo mesmo assim, mas a tabela já está presente.
- `audit_log` — **FALTANDO** (HTTP 404, PGRST205). O SQL de criação já existe em `migration_audit_log.sql`.
- `modelos_peticao` — **FALTANDO** (HTTP 404, PGRST205). Sem migration file existente; esquema deve ser inferido do código.

---

## Resultado: Tabelas no Código vs Supabase

| Tabela | Referenciada no código | Existe no Supabase | Status |
|--------|----------------------|-------------------|--------|
| `devedores` | Sim | HTTP 200 | OK |
| `credores` | Sim | HTTP 200 | OK |
| `processos` | Sim | HTTP 200 | OK |
| `andamentos` | Sim | HTTP 200 | OK |
| `lembretes` | Sim | HTTP 200 | OK |
| `regua_cobranca` | Sim | HTTP 200 | OK |
| `regua_etapas` | Sim | HTTP 200 | OK |
| `registros_contato` | Sim | HTTP 200 | OK |
| `usuarios_sistema` | Sim | HTTP 200 | OK |
| `pagamentos_parciais` | Sim | HTTP 200 | **JA EXISTE** |
| `audit_log` | Sim | HTTP 404 | **FALTANDO** |
| `modelos_peticao` | Sim | HTTP 404 | **FALTANDO** |

**Fonte:** Sondagem HTTP direta ao endpoint REST do Supabase com anon key do projeto. [VERIFIED: sondagem ao vivo]

---

## Tabelas que Precisam ser Criadas

### 1. `pagamentos_parciais` — JA EXISTE, porém SQL fornecido usa `IF NOT EXISTS`

A tabela já foi criada anteriormente (provavelmente pela migration `mr-3/mr-cobrancas/migration_pagamentos_parciais.sql`). Uma sondagem confirmou que as colunas `id, devedor_id, data_pagamento, valor, observacao, created_at` respondem normalmente.

**Ação:** Executar o SQL fornecido pelo usuário mesmo assim — `IF NOT EXISTS` é idempotente e não causará erro. Verificar se a política RLS usa `auth.role() = 'authenticated'` (a migration existente usava `true` — padrão diferente do solicitado).

SQL do usuário (canônico — a usar):
```sql
CREATE TABLE IF NOT EXISTS public.pagamentos_parciais (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devedor_id UUID NOT NULL REFERENCES public.devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.pagamentos_parciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso autenticado" ON public.pagamentos_parciais
  FOR ALL USING (auth.role() = 'authenticated');

SELECT pg_notify('pgrst', 'reload schema');
```

**Atenção:** O SQL do usuário usa `UUID` como tipo de PK e `devedor_id UUID`. A migration existente usa `BIGINT`. Se `devedores.id` for BIGINT (o que é provável dado o padrão do projeto), o FK vai falhar. O planner deve verificar o tipo de `devedores.id` antes de executar e adaptar se necessário.

---

### 2. `audit_log` — FALTANDO

**Usado em:** `src/utils/auditLog.js` (insert) e `App.jsx` linha 6953 (select com limit 500).

**SQL disponível:** `mr-3/mr-cobrancas/migration_audit_log.sql` — migration completa já existe.

Colunas inferidas do código e confirmadas pelo arquivo de migration:

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | BIGSERIAL PK | auto-increment |
| `usuario_id` | TEXT NOT NULL | ID do usuário |
| `usuario_nome` | TEXT NOT NULL | Nome do usuário |
| `acao` | TEXT NOT NULL | Ex: "Criou devedor" |
| `modulo` | TEXT NOT NULL | Ex: "devedores" |
| `dados` | JSONB | Dados da ação |
| `criado_em` | TIMESTAMPTZ DEFAULT NOW() | Timestamp |

**SQL a executar:** Conteúdo exato de `mr-3/mr-cobrancas/migration_audit_log.sql` — já inclui RLS com políticas separadas para INSERT (authenticated) e SELECT (admin ou anon).

**Nota:** A migration existente tem política de SELECT mais restritiva do que o padrão `auth.role() = 'authenticated'`. O planner deve decidir se usa a migration existente (mais segura) ou simplifica para o padrão do projeto. Recomendação: usar a migration existente (ela foi projetada especificamente para audit_log).

---

### 3. `modelos_peticao` — FALTANDO

**Usado em:** `src/components/GerarPeticao.jsx` — busca, insere, atualiza (renomear) e deleta modelos de petição.

**Esquema inferido do código** [VERIFIED: leitura do código-fonte]:

O payload de insert em `GerarPeticao.jsx` linha 574:
```js
const novo = { nome: nomeFinal, arquivo: pendente.base64, tamanho: pendente.tamanho };
```
E update em linha 611: `{ nome: renomNome.trim() }`.

O IDB local adiciona `id` (Date.now()) e `criado_em`.

| Coluna | Tipo | Observação |
|--------|------|------------|
| `id` | BIGSERIAL PK | auto-increment |
| `nome` | TEXT NOT NULL | Nome do modelo |
| `arquivo` | TEXT NOT NULL | Base64 do arquivo .docx |
| `tamanho` | INTEGER | Tamanho em bytes |
| `criado_em` | TIMESTAMPTZ DEFAULT NOW() | Timestamp de criação |

**SQL recomendado:**
```sql
CREATE TABLE IF NOT EXISTS public.modelos_peticao (
  id         BIGSERIAL PRIMARY KEY,
  nome       TEXT NOT NULL,
  arquivo    TEXT NOT NULL,
  tamanho    INTEGER,
  criado_em  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.modelos_peticao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso autenticado" ON public.modelos_peticao
  FOR ALL USING (auth.role() = 'authenticated');

SELECT pg_notify('pgrst', 'reload schema');
```

**Observação:** `arquivo` armazena base64 de arquivos .docx — pode ser grande. Não há FK para outras tabelas. Sem dependências de criação.

---

## Ordem de Criação (dependências FK)

```
1. pagamentos_parciais  → depende de devedores (já existe)
2. audit_log            → depende de usuarios_sistema (já existe, usada apenas em policy SELECT)
3. modelos_peticao      → sem dependências FK
```

Todas as três podem ser criadas em qualquer ordem entre si, pois `devedores` e `usuarios_sistema` já existem.

---

## Arquivos de Migration Disponíveis

| Tabela | Arquivo existente | Localização |
|--------|------------------|-------------|
| `pagamentos_parciais` | `migration_pagamentos_parciais.sql` | `mr-3/mr-cobrancas/` |
| `audit_log` | `migration_audit_log.sql` | `mr-3/mr-cobrancas/` |
| `modelos_peticao` | **NÃO existe** | Precisa ser criado |
| `processos` (colunas) | `migration_processos.sql` | `mr-3/mr-cobrancas/` |
| `credores` (colunas) | `migration_credores.sql` | `mr-3/mr-cobrancas/` |

---

## Observação: Tipo de PK dos devedores

O projeto usa `BIGINT` / `BIGSERIAL` como padrão (visto em `migration_audit_log.sql` e `migration_pagamentos_parciais.sql`). O SQL fornecido pelo usuário para `pagamentos_parciais` usa `UUID`. Antes de executar, confirmar o tipo de `devedores.id` via SQL Editor. Se for BIGINT:

```sql
-- Versão adaptada com BIGINT (caso devedores.id seja BIGINT):
CREATE TABLE IF NOT EXISTS public.pagamentos_parciais (
  id             BIGSERIAL PRIMARY KEY,
  devedor_id     BIGINT NOT NULL REFERENCES public.devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  observacao     TEXT,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

[ASSUMED] Tipo exato de `devedores.id` — não verificado via MCP (apenas anon key disponível). A migration existente de `pagamentos_parciais` usou BIGINT.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `devedores.id` é BIGINT/BIGSERIAL | Ordem de Criação / pagamentos_parciais SQL | FK constraint vai falhar se o tipo for UUID |
| A2 | RLS da `pagamentos_parciais` existente pode ser `allow_all` (migration antiga) vs `auth.role()='authenticated'` | Tabela 1 | Política RLS mais permissiva que o esperado |

---

## Fontes

### HIGH confidence
- Sondagem HTTP direta ao Supabase REST (`nzzimacvelxzstarwqty.supabase.co`) — tabelas existentes/faltando
- Leitura direta de `App.jsx`, `GerarPeticao.jsx`, `auditLog.js`, `users.js` — referências de tabelas
- Arquivos de migration existentes no repo (`migration_*.sql`) — schemas confirmados
