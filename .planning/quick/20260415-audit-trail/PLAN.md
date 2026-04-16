---
title: Audit Trail — Sistema de Log de Auditoria
slug: audit-trail
date: 2026-04-15
status: complete
---

## Objetivo

Implementar um sistema de log de auditoria (audit trail) escalável que registra automaticamente quem fez o quê e quando no MR Cobranças.

## Arquivos criados / modificados

### Criados
- `src/utils/auditLog.js` — Utilitário singleton com `setAuditUser(user)` e `logAudit(acao, modulo, dados)`
- `migration_audit_log.sql` — SQL para criar tabela `audit_log` no Supabase com RLS

### Modificados
- `src/App.jsx` — Import React default + auditLog; AuditoriaLog component; logAudit calls; nav entry

## Implementação

### auditLog.js
- Padrão singleton: armazena usuário ativo em `_currentUser` (mesmo padrão de `_accessToken` em `supabase.js`)
- `setAuditUser(user)` — define/limpa o usuário ativo (chamado no login/logout)
- `logAudit(acao, modulo, dados)` — async fire-and-forget; nunca bloqueia a UI

### Tabela audit_log
- Campos: `id`, `usuario_id`, `usuario_nome`, `acao`, `modulo`, `dados` (JSONB), `criado_em`
- Índices em `usuario_id`, `modulo`, `criado_em`
- RLS: INSERT para autenticados, SELECT para admins

### Pontos de auditoria implementados
| Módulo | Ação |
|---|---|
| auth | Login / Logout |
| devedores | Criou / Editou / Excluiu devedor |
| credores | Criou / Editou / Excluiu credor |
| processos | Criou / Editou / Excluiu processo / Registrou andamento |
| calculadora | Executou cálculo / Exportou PDF |
| relatorios | Exportou CSV devedores / credores |
| usuarios | Criou / Excluiu usuário do sistema |

### AuditoriaLog component
- Visível apenas para admins (tab "Auditoria" na sidebar)
- Filtros por módulo, usuário e data
- Expande linha para ver JSON dos dados alterados
- Botão "Atualizar" para recarregar logs
