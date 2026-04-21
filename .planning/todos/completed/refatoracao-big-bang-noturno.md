---
title: Refatoração Big Bang — JSONB dividas → tabela dividas
date: 2026-04-18
priority: high
context: Resultado da exploração em .planning/notes/decisoes-refatoracao-pessoas-dividas.md
---

# Refatoração Big Bang — JSONB `dividas` → tabela `dividas`

## O que é

Executar a refatoração principal do módulo Devedores: extrair as dívidas do JSONB `devedores.dividas` para uma tabela `dividas` própria, recriar `devedores_dividas` com FK real, e atualizar o App.jsx para carregar e escrever na nova estrutura.

## Por que agora

Sem isso, as tabelas `devedores_dividas` e `devedores_vinculados` (já criadas) ficam sem poder ser aproveitadas — `divida_id` permanece TEXT sem FK. A separação Pessoas × Dívidas do brief não avança.

## Sequência de execução (acordada na exploração)

### Passo 1 — SQL no Supabase (executar manualmente no SQL Editor)

```sql
-- a) Criar tabela dividas com UUID PK
-- b) INSERT INTO dividas ... FROM devedores, jsonb_array_elements(dividas)
-- c) Verificar contagem: SELECT count(*) FROM dividas
-- d) DROP TABLE devedores_dividas;
-- e) CREATE TABLE devedores_dividas (divida_id UUID REFERENCES dividas(id), ...)
-- f) Seed: INSERT INTO devedores_dividas ... JOIN dividas ON dividas.json_id = devedor_id
```

Migration a criar: `src/mr-3/mr-cobrancas/src/services/migrations/002_dividas_tabela.sql`

### Passo 2 — Atualizar App.jsx

- `carregarTudo()`: adicionar `dbGet("dividas", ...)` em paralelo; remover parsing de JSONB
- `Devedores` component: receber `dividas` como prop; ajustar todas as leituras `devedor.dividas[i].*`
- Operações de escrita (criar/editar/excluir dívida): usar `dbInsert/dbUpdate/dbDelete("dividas", ...)`
- Label do menu NAV: `"Devedores"` → `"Pessoas"`

### Passo 3 — Build + push

```bash
npm run build   # roda test:regressao (não toca DB — deve passar)
git add -A && git commit -m "feat: refatoração Pessoas×Dívidas — tabela dividas + big bang"
git push
```

### Passo 4 — Confirmar deploy no Vercel

- Verificar que app funciona no Vercel
- Confirmar que as 4 dívidas migradas estão corretas

### Passo 5 — Limpeza (migration posterior, após confirmar)

```sql
ALTER TABLE devedores DROP COLUMN IF EXISTS dividas;
ALTER TABLE devedores DROP COLUMN IF EXISTS contatos; -- se migrado
```

## Referências

- Brief: `brief-refatoracao-modulo-devedores.md`
- Decisões: `.planning/notes/decisoes-refatoracao-pessoas-dividas.md`
- Migration existente: `src/mr-3/mr-cobrancas/src/services/migrations/001_devedores_dividas.sql`
- Serviço existente: `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js`
- Componente existente: `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx`
