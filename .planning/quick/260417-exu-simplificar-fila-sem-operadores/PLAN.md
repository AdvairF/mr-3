---
phase: quick-260417-exu
plan: 01
subsystem: frontend + backend + db
tags: [react, fila-devedor, supabase, simplification]
goal: Remover obrigatoriedade de operadores na Fila de Cobrança — qualquer usuário logado opera diretamente
status: in_progress
---

# Plan: Simplificar Fila — Sem Operadores

## Goal
Eliminar o bridge de operadores que está causando FK violation. Usar user.id (BIGINT) diretamente como identificador de quem operou, via nova coluna usuario_id nas tabelas de fila.

## Root Cause
`FilaDevedor.jsx` faz `dbInsert("operadores", { usuario_id: user.id })` no mount, mas a FK `operadores_usuario_id_fkey` aponta para uma tabela diferente ou tem constraints que o user atual não satisfaz. A solução correta é não usar a tabela operadores na UI por enquanto.

## Tasks

### T1 — DB migrations (MCP Supabase)
- `ALTER TABLE fila_cobranca ALTER COLUMN operador_id DROP NOT NULL`
- `ALTER TABLE eventos_andamento ALTER COLUMN operador_id DROP NOT NULL`
- `ALTER TABLE fila_cobranca ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios_sistema(id)`
- `ALTER TABLE eventos_andamento ADD COLUMN IF NOT EXISTS usuario_id BIGINT REFERENCES usuarios_sistema(id)`

### T2 — filaDevedor.js
- `proximoDevedor(usuarioId)`: validateBigInt, gravar em usuario_id (não operador_id), operador_id=null
- `registrarEvento(contratoId, usuarioId, dados)`: validateBigInt, gravar em usuario_id, operador_id=null
- `removerDaFila(filaId, motivo, usuarioId)`: validateBigInt para usuarioId

### T3 — FilaDevedor.jsx
- Remover useEffect resolverOperador (dbGet + dbInsert operadores)
- Remover estado operadorId — usar user.id diretamente como usuarioId
- Remover loading screen "Configurando operador..."
- Passar usuarioId={user.id} para FilaPainel, FilaOperador, FilaAtendimento
- Renomear prop operadorId → usuarioId em FilaPainel, FilaOperador, FilaAtendimento
- Adicionar botões ação rápida na tabela do Painel: 📞 Ligar, 💬 WhatsApp, 📧 Email, ✏️ Registrar, ✅ Pago
- Substituir label "Operador" por "Usuário" nas colunas/labels

### T4 — Build + deploy
- `npm run build` de src/mr-3/mr-cobrancas/
- git add + commit + push
- vercel --prod de src/mr-3/mr-cobrancas/
