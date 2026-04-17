---
phase: quick-260417-g7k
plan: 01
subsystem: frontend + backend + db
tags: [supabase, fk, usuario_id, eventos_andamento, fila_cobranca, fix]
requirements: [FK-USUARIO-FIX]
status: complete

dependency_graph:
  requires: [FilaDevedor.jsx@260417-fad, filaDevedor.js@260417-fad]
  provides: [registrarEvento-sem-FK, extractUsuario-helper]
  affects: [filaDevedor.js, FilaDevedor.jsx, eventos_andamento, fila_cobranca]

tech_stack:
  added: []
  patterns:
    - "extractUsuario(u) — aceita number, UUID string ou {id,nome,email}"
    - "usuario_nome TEXT + usuario_email TEXT — identidade sem FK"
    - "DROP CONSTRAINT IF EXISTS — idempotente"

key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
    - src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx

decisions:
  - "Drop FK ao invés de corrigir o mapeamento auth→usuarios_sistema: mais robusto, funciona com local fallback (id=1)"
  - "extractUsuario() aceita qualquer forma de usuário — local (id=1), usuarios_sistema (id=3..8), UUID Supabase Auth"
  - "usuario_nome + usuario_email adicionados para auditoria legível sem JOIN"
  - "usuario_id mantido como nullable BIGINT sem FK — preserva histórico"

metrics:
  duration: "~30 min"
  completed: "2026-04-17"
  tasks_completed: 4
  tasks_total: 4
  db_migrations: 2
  files_modified: 2
  lines_net: "+47 -13"
  deploy_url: "https://mrcobrancas.com.br"
---

# Quick Task 260417-g7k: Fix FK usuario_id em eventos_andamento / fila_cobranca

**One-liner:** Removida FK `usuario_id → usuarios_sistema(id)` das duas tabelas; `extractUsuario()` grava nome/email sem depender do ID existir no banco.

## Root Cause

`auth/users.js` tem três caminhos de login:
1. **Supabase Auth + perfil em usuarios_sistema** → `user.id = 3` (BIGINT correto)  
2. **Supabase Auth sem perfil** → `user.id = auth.user.id` (UUID — falha `validateBigInt`)  
3. **Fallback local** → `user.id = 1` (LOCAL_USERS, não existe em usuarios_sistema — FK violation)

O caminho 3 era o ativo: usuário local `id=1` não existe em `usuarios_sistema` (ids: 3,4,5,6,8), portanto o INSERT em `eventos_andamento` com `usuario_id=1` violava a FK.

## Mudanças

### DB (2 migrations)
```sql
ALTER TABLE public.eventos_andamento DROP CONSTRAINT IF EXISTS eventos_andamento_usuario_id_fkey;
ALTER TABLE public.fila_cobranca     DROP CONSTRAINT IF EXISTS fila_cobranca_usuario_id_fkey;
ALTER TABLE public.eventos_andamento ADD COLUMN IF NOT EXISTS usuario_nome  TEXT;
ALTER TABLE public.eventos_andamento ADD COLUMN IF NOT EXISTS usuario_email TEXT;
ALTER TABLE public.fila_cobranca     ADD COLUMN IF NOT EXISTS usuario_nome  TEXT;
ALTER TABLE public.fila_cobranca     ADD COLUMN IF NOT EXISTS usuario_email TEXT;
```

### filaDevedor.js

Novo helper `extractUsuario(u)`:
- Aceita `number | string | { id, nome, email }`
- Extrai `{ uid, uNome, uEmail }`
- `uid`: BIGINT válido ou `null` (UUID e strings não-numéricas viram null)

Funções atualizadas (4):
- `proximoDevedor(usuarioId)` — INSERT fila_cobranca com `usuario_nome`/`usuario_email`
- `registrarEvento(devedorId, usuarioId, dados)` — INSERT eventos_andamento
- `alterarStatusDevedor(devedorId, novoStatus, usuarioId)` — INSERT eventos_andamento
- `removerDaFila(filaId, motivo, usuarioId)` — INSERT eventos_andamento

### FilaDevedor.jsx

```js
// Antes
const usuarioId = user.id;

// Depois
const usuario = { id: user.id, nome: user.nome || user.nome_completo || user.email, email: user.email };
```

Props atualizadas: `FilaPainel`, `FilaOperador`, `FilaAtendimento` recebem `usuarioId={usuario}`.

## Success Criteria

| Criterion | Result |
|-----------|--------|
| Registrar evento sem FK violation | PASS |
| Funciona com local user (id=1) | PASS |
| Funciona com usuario_sistema (id=3+) | PASS |
| Funciona com UUID Supabase Auth | PASS |
| usuario_nome/email gravados | PASS |
| Build sem erros | PASS |
| Deploy produção | PASS — mrcobrancas.com.br |
