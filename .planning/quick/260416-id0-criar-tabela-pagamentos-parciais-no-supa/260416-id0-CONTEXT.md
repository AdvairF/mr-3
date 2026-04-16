---
quick_id: 260416-id0
date: 2026-04-16
status: ready
---

# Quick Task 260416-id0: Criar tabela pagamentos_parciais no Supabase e verificar tabelas faltando - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Task Boundary

1. Criar a tabela `pagamentos_parciais` no Supabase com o SQL exato fornecido (incluindo RLS e política)
2. Varrer o código-fonte para identificar todas as tabelas que o app usa
3. Comparar com as tabelas existentes no Supabase via MCP
4. Criar quaisquer tabelas faltando com RLS habilitado

</domain>

<decisions>
## Implementation Decisions

### Critério para tabelas faltando
- Varrer o código-fonte (queries, tipos TypeScript, referências) para listar todas as tabelas que o app usa
- Comparar com o schema atual do Supabase via MCP
- Criar todas as que existem no código mas não no Supabase

### Padrão RLS para novas tabelas
- Aplicar o mesmo padrão usado em `pagamentos_parciais` e no restante do projeto:
  - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
  - `CREATE POLICY "Acesso autenticado" ON ... FOR ALL USING (auth.role() = 'authenticated');`

### SQL fornecido para pagamentos_parciais
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

### Claude's Discretion
- Estrutura das colunas para tabelas adicionais faltando (inferir a partir do código)
- Ordem de criação (respeitar dependências de foreign keys)

</decisions>

<specifics>
## Specific Ideas

- MCP Supabase está ativo — usar diretamente para executar SQL e listar tabelas existentes
- O projeto usa `devedores`, `credores`, `processos`, `peticoes`, e provavelmente outras tabelas
- Verificar especialmente tabelas para: pagamentos_parciais, e qualquer outra referenciada no código que não exista no Supabase

</specifics>

<canonical_refs>
## Canonical References

- SQL fornecido pelo usuário para `pagamentos_parciais` — usar exatamente como especificado
- Padrão RLS do projeto: `auth.role() = 'authenticated'`

</canonical_refs>
