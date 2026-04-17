---
name: Quick Task 260417-cym — Testar MCP Supabase + SQL Fase 1 Fila de Devedor
description: Contexto de decisões para criação do schema Kanban de Cobranças no Supabase
type: project
---

# Quick Task 260417-cym — MCP Supabase + SQL Kanban Fase 1

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Task Boundary

Testar a conexão MCP Supabase e executar o SQL de criação das 6 tabelas + RLS + índices da Fase 1 do módulo "Fila de Devedor" (Kanban de Cobranças).

</domain>

<decisions>
## Implementation Decisions

### SQL Source
- O SQL não existe ainda — será criado do zero nesta tarefa
- Baseado no FEATURES.md (etapas: Novo, Notificado, Em Negociação, Acordo Ativo, Inadimplente, Em Juízo, Encerrado)

### MCP Supabase
- O usuário confirmou que o MCP do Supabase está configurado
- Se a conexão falhar: reportar erro exato, não tentar workaround silencioso
- Se funcionar: executar as 6 tabelas + RLS + índices na sequência correta

### Módulo — Fila de Devedor
- É o Kanban de cobranças (não fila de prioridade)
- Foco: etapas do processo de cobrança jurídica brasileira
- Integra com devedores existentes (tabela `devedores` já existe no Supabase)

### Claude's Discretion
- Nomes exatos das tabelas e colunas
- Schema exato de cada tabela (a definir na fase de research/planning)
- Ordem de criação das tabelas (respeitando FK dependencies)
- Políticas RLS específicas por role

</decisions>

<specifics>
## Specific Ideas

- Projeto Supabase: `https://nzzimacvelxzstarwqty.supabase.co` (identificado nos arquivos fonte)
- 6 tabelas esperadas para o módulo Kanban/Fila de Devedor
- RLS deve ser consistente com padrão já existente no projeto
- Índices para consultas frequentes (filtros por credor, status, data)

</specifics>

<canonical_refs>
## Canonical References

- `.planning/research/FEATURES.md` — Especificação do Kanban de Cobranças (etapas, table stakes v1)
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — Config atual do Supabase (URL + chave)
- `src/mr-3/mr-cobrancas/migration_processos.sql` — Exemplo de migration SQL existente no projeto

</canonical_refs>
