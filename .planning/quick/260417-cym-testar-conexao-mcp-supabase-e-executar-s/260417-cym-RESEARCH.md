# Quick Task 260417-cym: Schema SQL Fase 1 — Fila de Devedor (Kanban)

**Researched:** 2026-04-17
**Domain:** PostgreSQL / Supabase — schema design para Kanban de cobranças jurídicas
**Confidence:** HIGH

## Summary

Schema de 6 tabelas para o módulo Kanban de Cobranças (Fila de Devedor), integrando com as tabelas existentes (`devedores`, `credores`, `processos`). O design segue o padrão RLS permissivo já estabelecido no projeto (`allow_all` com `USING (true)`) e usa `BIGINT GENERATED ALWAYS AS IDENTITY` como PK, consistente com `pagamentos_parciais`.

As 6 tabelas: `etapas_cobranca` (lookup das 7 etapas fixas), `cobrancas` (item principal do Kanban, liga devedor a etapa), `historico_etapas` (log de movimentações), `timeline_eventos` (timeline cronológica por devedor), `alertas` (notificações de prazos/vencimentos), `configuracoes_kanban` (preferências por usuário/escritório).

**Primary recommendation:** Executar o SQL abaixo via MCP Supabase na ordem apresentada (respeita FK dependencies).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- SQL será criado do zero nesta tarefa
- Baseado no FEATURES.md (7 etapas: Novo, Notificado, Em Negociacao, Acordo Ativo, Inadimplente, Em Juizo, Encerrado)
- MCP Supabase confirmado pelo usuario — se falhar, reportar erro exato
- Integra com tabela `devedores` existente

### Claude's Discretion
- Nomes exatos das tabelas e colunas
- Schema exato de cada tabela
- Ordem de criacao (respeitando FK dependencies)
- Politicas RLS especificas por role
</user_constraints>

## Existing Tables (Reference)

Tabelas ja existentes no Supabase que serao referenciadas por FK: [VERIFIED: codebase grep]

| Tabela | PK | Usado como FK em |
|--------|-----|-------------------|
| `devedores` | `id` (BIGINT) | `cobrancas.devedor_id`, `timeline_eventos.devedor_id`, `alertas.devedor_id` |
| `credores` | `id` (BIGINT) | `cobrancas.credor_id` |
| `processos` | `id` (BIGINT) | `cobrancas.processo_id` |

Campos JSON armazenados como TEXT em `devedores`: `dividas`, `contatos`, `acordos`, `parcelas`. [VERIFIED: App.jsx carregarTudo]

Status existente em `devedores.status`: novo, em_localizacao, notificado, em_negociacao, acordo_firmado, pago_integral, pago_parcial, irrecuperavel, ajuizado. [VERIFIED: constants.js]

## RLS Pattern

O projeto usa RLS permissivo em todas as tabelas existentes: [VERIFIED: migration_pagamentos_parciais.sql, migration_audit_log.sql]

**Padrao dominante (tabelas de dados):**
```sql
ALTER TABLE tabela ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON tabela FOR ALL USING (true) WITH CHECK (true);
```

**Padrao audit_log (mais restritivo):**
- INSERT: `TO authenticated WITH CHECK (true)`
- SELECT admin: verifica `usuarios_sistema.role = 'admin'`
- SELECT anon: `USING (true)` (fallback)

**Decisao:** Para Fase 1, usar o padrao permissivo (`allow_all`) consistente com o restante do projeto. O app usa `anon key` com auth manual (JWT opcional). Restringir RLS por role e um passo futuro (v2). [ASSUMED — segue padrao existente]

## Proposed SQL DDL — 6 Tables

### Ordem de criacao (FK dependencies)
1. `etapas_cobranca` — sem FK (lookup table)
2. `cobrancas` — FK para devedores, credores, processos, etapas_cobranca
3. `historico_etapas` — FK para cobrancas, etapas_cobranca
4. `timeline_eventos` — FK para devedores, cobrancas
5. `alertas` — FK para devedores, cobrancas
6. `configuracoes_kanban` — sem FK criticas

### SQL Completo

```sql
-- ============================================================
-- FASE 1 — KANBAN DE COBRANCAS (FILA DE DEVEDOR)
-- 6 tabelas + RLS + indices
-- Executar na ordem apresentada (respeita FK dependencies)
-- ============================================================

-- ─── 1. ETAPAS_COBRANCA (lookup table — 7 etapas fixas) ─────
CREATE TABLE IF NOT EXISTS etapas_cobranca (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug       TEXT    NOT NULL UNIQUE,        -- ex: 'novo', 'notificado'
  nome       TEXT    NOT NULL,               -- ex: 'Novo', 'Notificado'
  descricao  TEXT,                           -- descricao curta da etapa
  cor        TEXT    NOT NULL DEFAULT '#64748b', -- cor hex para UI
  bg         TEXT    NOT NULL DEFAULT '#f1f5f9', -- cor de fundo para UI
  ordem      INT     NOT NULL DEFAULT 0,     -- posicao no kanban (0=primeiro)
  ativo      BOOLEAN NOT NULL DEFAULT true,  -- permite ocultar etapas no futuro
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE etapas_cobranca ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON etapas_cobranca FOR ALL USING (true) WITH CHECK (true);

-- Seed das 7 etapas padrao
INSERT INTO etapas_cobranca (slug, nome, descricao, cor, bg, ordem) VALUES
  ('novo',            'Novo',            'Devedor cadastrado, sem contato',            '#64748b', '#f1f5f9', 0),
  ('notificado',      'Notificado',      'Notificacao extrajudicial enviada',          '#7c3aed', '#ede9fe', 1),
  ('em_negociacao',   'Em Negociacao',    'Devedor respondeu, acordo possivel',         '#d97706', '#fef3c7', 2),
  ('acordo_ativo',    'Acordo Ativo',     'Acordo firmado, parcelas em andamento',      '#16a34a', '#dcfce7', 3),
  ('inadimplente',    'Inadimplente',     'Acordo quebrado ou prazo esgotado',          '#dc2626', '#fee2e2', 4),
  ('em_juizo',        'Em Juizo',         'Processo judicial aberto',                   '#c2410c', '#ffedd5', 5),
  ('encerrado',       'Encerrado',        'Pago, prescrito ou arquivado',               '#065f46', '#d1fae5', 6)
ON CONFLICT (slug) DO NOTHING;

-- ─── 2. COBRANCAS (item principal do Kanban) ─────────────────
CREATE TABLE IF NOT EXISTS cobrancas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id      BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  credor_id       BIGINT    REFERENCES credores(id) ON DELETE SET NULL,
  processo_id     BIGINT    REFERENCES processos(id) ON DELETE SET NULL,
  etapa_id        BIGINT    NOT NULL REFERENCES etapas_cobranca(id),
  etapa_slug      TEXT      NOT NULL DEFAULT 'novo',  -- denormalizado p/ queries rapidas
  valor_cobrado   NUMERIC(15,2),                      -- valor atual da cobranca
  data_vencimento DATE,                                -- prazo ou data-chave atual
  prioridade      TEXT      NOT NULL DEFAULT 'normal'
                  CHECK (prioridade IN ('baixa','normal','alta','urgente')),
  responsavel     TEXT,                                -- nome do advogado responsavel
  observacoes     TEXT,
  ordem_coluna    INT       NOT NULL DEFAULT 0,        -- posicao dentro da coluna kanban
  arquivado       BOOLEAN   NOT NULL DEFAULT false,    -- soft delete
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON cobrancas FOR ALL USING (true) WITH CHECK (true);

-- Indices para consultas frequentes do Kanban
CREATE INDEX IF NOT EXISTS idx_cobrancas_devedor    ON cobrancas(devedor_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_credor     ON cobrancas(credor_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_etapa      ON cobrancas(etapa_id);
CREATE INDEX IF NOT EXISTS idx_cobrancas_etapa_slug ON cobrancas(etapa_slug);
CREATE INDEX IF NOT EXISTS idx_cobrancas_vencimento ON cobrancas(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_cobrancas_created    ON cobrancas(created_at DESC);
-- Indice composto: filtro tipico do kanban (etapa + credor + arquivado)
CREATE INDEX IF NOT EXISTS idx_cobrancas_kanban     ON cobrancas(etapa_slug, credor_id, arquivado);

-- ─── 3. HISTORICO_ETAPAS (log de movimentacoes no Kanban) ────
CREATE TABLE IF NOT EXISTS historico_etapas (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  cobranca_id     BIGINT    NOT NULL REFERENCES cobrancas(id) ON DELETE CASCADE,
  etapa_anterior  TEXT,                        -- slug da etapa anterior (null = criacao)
  etapa_nova      TEXT      NOT NULL,          -- slug da nova etapa
  motivo          TEXT,                        -- razao da movimentacao
  usuario_nome    TEXT,                        -- quem moveu
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historico_etapas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON historico_etapas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_historico_cobranca ON historico_etapas(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_historico_created  ON historico_etapas(created_at DESC);

-- ─── 4. TIMELINE_EVENTOS (timeline cronologica por devedor) ──
CREATE TABLE IF NOT EXISTS timeline_eventos (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id    BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  cobranca_id   BIGINT    REFERENCES cobrancas(id) ON DELETE SET NULL,
  tipo          TEXT      NOT NULL
                CHECK (tipo IN (
                  'cadastro','divida_adicionada','status_alterado',
                  'acordo_firmado','parcela_paga','parcela_vencida',
                  'peticao_gerada','processo_aberto','andamento',
                  'alerta_disparado','cobranca_movida',
                  'contato_realizado','nota_interna','documento_recebido',
                  'outro'
                )),
  titulo        TEXT      NOT NULL,            -- descricao curta do evento
  descricao     TEXT,                          -- detalhes adicionais
  dados         JSONB,                         -- dados extras estruturados
  automatico    BOOLEAN   NOT NULL DEFAULT true, -- gerado pelo sistema vs manual
  usuario_nome  TEXT,                          -- quem registrou (se manual)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE timeline_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON timeline_eventos FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_timeline_devedor   ON timeline_eventos(devedor_id);
CREATE INDEX IF NOT EXISTS idx_timeline_cobranca  ON timeline_eventos(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_timeline_tipo      ON timeline_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_timeline_created   ON timeline_eventos(created_at DESC);
-- Indice composto: timeline de um devedor em ordem cronologica
CREATE INDEX IF NOT EXISTS idx_timeline_devedor_data ON timeline_eventos(devedor_id, created_at DESC);

-- ─── 5. ALERTAS (notificacoes de prazos e vencimentos) ───────
CREATE TABLE IF NOT EXISTS alertas (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id    BIGINT    NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  cobranca_id   BIGINT    REFERENCES cobrancas(id) ON DELETE SET NULL,
  tipo          TEXT      NOT NULL
                CHECK (tipo IN (
                  'parcela_vencendo','parcela_vencida',
                  'acordo_sem_pagamento','prazo_processual',
                  'estagnacao','devedor_sem_contato',
                  'outro'
                )),
  titulo        TEXT      NOT NULL,
  descricao     TEXT,
  data_gatilho  DATE,                          -- quando o alerta deve disparar
  lido          BOOLEAN   NOT NULL DEFAULT false,
  lido_em       TIMESTAMPTZ,
  lido_por      TEXT,                          -- usuario que marcou como lido
  dados         JSONB,                         -- metadados extras
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON alertas FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_alertas_devedor    ON alertas(devedor_id);
CREATE INDEX IF NOT EXISTS idx_alertas_cobranca   ON alertas(cobranca_id);
CREATE INDEX IF NOT EXISTS idx_alertas_lido       ON alertas(lido);
CREATE INDEX IF NOT EXISTS idx_alertas_tipo       ON alertas(tipo);
CREATE INDEX IF NOT EXISTS idx_alertas_gatilho    ON alertas(data_gatilho);
-- Indice composto: alertas nao lidos ordenados por data
CREATE INDEX IF NOT EXISTS idx_alertas_pendentes  ON alertas(lido, data_gatilho DESC) WHERE lido = false;

-- ─── 6. CONFIGURACOES_KANBAN (preferencias do kanban) ────────
CREATE TABLE IF NOT EXISTS configuracoes_kanban (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_email    TEXT      NOT NULL UNIQUE,   -- email do usuario (link com auth)
  colunas_visiveis JSONB     DEFAULT '["novo","notificado","em_negociacao","acordo_ativo","inadimplente","em_juizo","encerrado"]',
  filtro_credor_id BIGINT,                      -- filtro persistido por credor
  ordenacao        TEXT      NOT NULL DEFAULT 'data_vencimento'
                   CHECK (ordenacao IN ('data_vencimento','valor_cobrado','created_at','prioridade')),
  itens_por_coluna INT       NOT NULL DEFAULT 50,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes_kanban ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON configuracoes_kanban FOR ALL USING (true) WITH CHECK (true);

-- ─── COMMENTS ────────────────────────────────────────────────
COMMENT ON TABLE etapas_cobranca     IS 'Etapas do kanban de cobrancas — 7 etapas fixas do fluxo juridico';
COMMENT ON TABLE cobrancas           IS 'Item principal do kanban — representa uma cobranca em uma etapa';
COMMENT ON TABLE historico_etapas    IS 'Log de movimentacoes entre etapas do kanban';
COMMENT ON TABLE timeline_eventos    IS 'Timeline cronologica de eventos por devedor';
COMMENT ON TABLE alertas             IS 'Alertas e notificacoes de prazos, vencimentos e estagnacao';
COMMENT ON TABLE configuracoes_kanban IS 'Preferencias do kanban por usuario';
```

## Architecture Patterns

### Data Flow — Kanban

```
[Sidebar: tab "kanban"]
       |
       v
[Kanban Component]
       |
       +-- dbGet("etapas_cobranca", "order=ordem.asc")   --> colunas
       +-- dbGet("cobrancas", "arquivado=eq.false&...")   --> cards
       |
       v
[Render colunas com cards agrupados por etapa_slug]
       |
       +-- Drag & Drop --> dbUpdate("cobrancas", id, {etapa_id, etapa_slug, ordem_coluna})
       |                   dbInsert("historico_etapas", {...})
       |                   dbInsert("timeline_eventos", {tipo:'cobranca_movida',...})
       |
       +-- Click card --> Modal com detalhes + timeline do devedor
```

### Pattern: Denormalized Slug

A coluna `etapa_slug` em `cobrancas` e deliberadamente denormalizada. Evita JOIN com `etapas_cobranca` nas queries de listagem do kanban (que sao as mais frequentes). O `etapa_id` mantem a integridade referencial.

### Pattern: Timeline Insert on Mutation

Toda mutacao relevante (movimentacao de etapa, pagamento, etc.) deve inserir um registro em `timeline_eventos`. Isso garante a timeline cronologica completa do devedor sem reconstruir de logs.

## Common Pitfalls

### Pitfall 1: FK Order
**What goes wrong:** SQL falha com "relation does not exist" ao criar tabela com FK para tabela ainda nao criada.
**How to avoid:** Executar na ordem exata: etapas_cobranca -> cobrancas -> historico_etapas -> timeline_eventos -> alertas -> configuracoes_kanban.

### Pitfall 2: ON CONFLICT com GENERATED ALWAYS AS IDENTITY
**What goes wrong:** Tentar INSERT com ID explicito em coluna GENERATED ALWAYS causa erro.
**How to avoid:** Nunca especificar `id` em INSERTs. O seed de `etapas_cobranca` usa `ON CONFLICT (slug)`.

### Pitfall 3: RLS Blocking anon Reads
**What goes wrong:** Habilitar RLS sem policy = bloqueia tudo. O app usa `anon key` em muitas operacoes.
**How to avoid:** Sempre criar a policy `allow_all` junto com `ENABLE ROW LEVEL SECURITY`.

### Pitfall 4: etapa_slug Desync
**What goes wrong:** Atualizar `etapa_id` sem atualizar `etapa_slug` (ou vice-versa).
**How to avoid:** No frontend, sempre atualizar ambos no mesmo PATCH. Considerar trigger no futuro para manter sync automatico.

### Pitfall 5: CHECK constraint com acentos
**What goes wrong:** Valores CHECK com caracteres especiais podem causar problemas de encoding.
**How to avoid:** Usar slugs ASCII sem acentos em CHECK constraints. Nomes com acento ficam apenas em `etapas_cobranca.nome` (campo TEXT livre).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Ordenacao kanban | Custom sort logic | `ordem_coluna INT` + `ORDER BY` | DnD reorder e trivial com indices inteiros |
| Timeline | Reconstruir de audit_log | `timeline_eventos` dedicada | Audit log e para seguranca, timeline e UX — propositos diferentes |
| Alerta badge count | Query complexa client-side | `WHERE lido=false` com partial index | Partial index `idx_alertas_pendentes` torna contagem O(1) |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RLS permissivo (allow_all) e adequado para Fase 1 | RLS Pattern | Baixo — consistente com todo o projeto; restricao por role e v2 |
| A2 | PK de `devedores`, `credores`, `processos` sao BIGINT | Existing Tables | Alto — FK falhara se tipo diferir; verificar com `\d devedores` |
| A3 | 6a tabela como `configuracoes_kanban` e a mais util | DDL | Baixo — pode ser removida/substituida sem impacto |

## Open Questions

1. **Tipo exato da PK de `devedores`**
   - What we know: migration_pagamentos_parciais usa `BIGINT NOT NULL REFERENCES devedores(id)`
   - What's unclear: se a tabela original usa BIGINT ou BIGSERIAL (ambos compativeis)
   - Recommendation: verificar com MCP antes de executar; se for SERIAL/INT, ajustar FKs

2. **Sync etapa_slug com devedores.status**
   - What we know: `devedores` tem campo `status` com valores similares mas nao identicos as etapas do kanban
   - What's unclear: se a cobranca deve sincronizar com `devedores.status` ou operar independentemente
   - Recommendation: Para v1, operar independentemente. Sync bidirecional e complexo e pode ser v2.

## Sources

### Primary (HIGH confidence)
- `migration_pagamentos_parciais.sql` — padrao de tabela, RLS, indices [VERIFIED]
- `migration_audit_log.sql` — padrao RLS com roles [VERIFIED]
- `constants.js` — STATUS_DEV, cores, backgrounds [VERIFIED]
- `FEATURES.md` — etapas kanban, table stakes v1 [VERIFIED]
- `App.jsx` linhas 8066-8096 — carregarTudo, tabelas existentes [VERIFIED]

### Secondary (MEDIUM confidence)
- `supabase.js` — pattern de acesso a dados (dbGet/dbInsert/dbUpdate/dbDelete) [VERIFIED]

## Metadata

**Confidence breakdown:**
- Schema design: HIGH — baseado em patterns existentes do projeto e requisitos claros do FEATURES.md
- RLS: HIGH — segue padrao identico ao existente
- Indices: HIGH — mapeados para consultas descritas no table stakes v1
- 6a tabela (configuracoes_kanban): MEDIUM — pode nao ser necessaria em v1 minimo

**Research date:** 2026-04-17
**Valid until:** 2026-05-17
