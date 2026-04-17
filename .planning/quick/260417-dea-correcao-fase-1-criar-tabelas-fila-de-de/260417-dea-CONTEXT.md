---
name: Quick Task 260417-dea — Correção Fase 1 Fila de Devedor
description: SQL completamente especificado pelo usuário — 6 tabelas + ALTER + índices + RLS
type: project
---

# Quick Task 260417-dea — Correção Fase 1 Fila de Devedor

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Task Boundary

Executar SQL exato fornecido pelo usuário para criar as tabelas corretas da Fila de Devedor no Supabase:
- 6 novas tabelas: contratos, parcelas, equipes, operadores, fila_cobranca, eventos_andamento
- 1 ALTER: adicionar coluna telefones_adicionais (JSONB) em devedores
- 5 índices
- 6 políticas RLS (allow_all)
- pg_notify para reload do schema PostgREST

As tabelas do Kanban criadas na task 260417-cym (etapas_cobranca, cobrancas, etc) devem ser MANTIDAS — não remover.

</domain>

<decisions>
## Implementation Decisions

### SQL Source
- SQL 100% especificado pelo usuário — executar EXATAMENTE como fornecido, sem alterações

### Conflito parcelas vs pagamentos_parciais
- `parcelas` (nova) é tabela SEPARADA e independente de `pagamentos_parciais` (existente)
- NÃO dropar nem modificar `pagamentos_parciais`
- As duas tabelas coexistirão

### Tabelas Kanban anteriores
- Manter todas as tabelas criadas em 260417-cym (etapas_cobranca, cobrancas, historico_etapas, timeline_eventos, alertas, configuracoes_kanban)

### Execução
- Usar Supabase Management API (PAT do ~/.claude/settings.json) — mcp__supabase__* não disponível em agentes spawned
- Executar em ordem de FK dependency: equipes → contratos → parcelas, operadores → fila_cobranca → eventos_andamento → ALTER devedores → índices → RLS → pg_notify

### Claude's Discretion
- Agrupamento dos blocos SQL para execução

</decisions>

<specifics>
## Specific Ideas

SQL completo especificado no prompt do usuário — ver task description.
Projeto Supabase: `https://nzzimacvelxzstarwqty.supabase.co`

</specifics>

<canonical_refs>
## Canonical References

- SQL fornecido integralmente pelo usuário no prompt desta task
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — URL + chave do projeto

</canonical_refs>
