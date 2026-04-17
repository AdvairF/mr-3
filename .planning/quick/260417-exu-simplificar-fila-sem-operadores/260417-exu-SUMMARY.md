---
phase: quick-260417-exu
plan: 01
subsystem: frontend + backend + db
tags: [react, fila-devedor, supabase, simplification, bugfix]
requirements: [FILA-SEM-OPERADORES]
status: complete

dependency_graph:
  requires: [FilaDevedor.jsx@260417-f03, filaDevedor.js@260417-e59]
  provides: [fila sem FK operadores, usuario_id auditoria]
  affects: [FilaDevedor.jsx, filaDevedor.js, fila_cobranca, eventos_andamento]

tech_stack:
  added: []
  patterns:
    - "usuarioId BIGINT direto — sem bridge de tabela operadores"
    - "Supabase Management API para DDL (PAT de ~/.claude/settings.json)"
    - "Botões ação rápida com links tel:/wa.me/mailto: sem JS extra"

key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js

decisions:
  - "Não deletar tabela operadores — apenas ignorada na UI/service por enquanto"
  - "user.id (BIGINT) usado diretamente como usuarioId — zero overhead de lookup"
  - "operador_id nas tabelas mantido (nullable) para compatibilidade futura"
  - "Botões de ação rápida com links nativos (tel:/wa.me/) — sem bibliotecas extras"

metrics:
  duration: "~30 min"
  completed: "2026-04-17"
  tasks_completed: 5
  tasks_total: 5
  files_created: 0
  files_modified: 2
  db_migrations: 4
  deploy_url: "https://mrcobrancas.com.br"
---

# Quick Task 260417-exu: Simplificar Fila — Sem Operadores

**One-liner:** Removido bridge de operadores que causava FK violation; user.id usado diretamente como usuarioId com novas colunas usuario_id nas tabelas de fila.

## Root Cause

`FilaDevedor.jsx` fazia `dbInsert("operadores", { usuario_id: user.id })` no mount. A FK `operadores_usuario_id_fkey` rejeitava o insert pois `user.id` (auth UUID) não correspondia a um registro válido na tabela referenciada.

## Outcome

Full success. Build limpo, push e deploy em mrcobrancas.com.br. Qualquer usuário logado acessa e opera a fila sem configuração de operador.

## Mudanças

### DB (via Management API)
- `fila_cobranca.operador_id` → nullable
- `eventos_andamento.operador_id` → nullable
- `fila_cobranca.usuario_id BIGINT REFERENCES usuarios_sistema(id)` adicionado
- `eventos_andamento.usuario_id BIGINT REFERENCES usuarios_sistema(id)` adicionado

### filaDevedor.js
- `proximoDevedor(operadorId UUID)` → `proximoDevedor(usuarioId BIGINT)`: validateBigInt, grava `usuario_id` (não `operador_id`)
- `registrarEvento(contratoId, operadorId UUID, ...)` → `registrarEvento(contratoId, usuarioId BIGINT, ...)`: mesmo padrão
- `removerDaFila(filaId, motivo, usuarioId)`: validateBigInt, grava `usuario_id` no evento

### FilaDevedor.jsx
- Removido `useEffect resolverOperador` (dbGet + dbInsert operadores)
- Removido estado `operadorId`
- Removido loading screen "Configurando operador..."
- `const usuarioId = user.id` — direto, sem async
- Props renomeadas: `operadorId` → `usuarioId` em FilaPainel, FilaOperador, FilaAtendimento
- Botões ação rápida na tabela do Painel: 📞 `tel:`, 💬 `wa.me/`, 📧 `mailto:`

## Success Criteria

| Criterion | Result |
|-----------|--------|
| FK error eliminado | PASS — sem insert em operadores |
| Qualquer usuário acessa fila | PASS |
| usuario_id gravado em fila_cobranca e eventos | PASS |
| Botões ação rápida no Painel | PASS |
| Build sem erros | PASS |
| Deploy produção | PASS — mrcobrancas.com.br |
