---
quick_id: 260416-nrx
date: 2026-04-16
status: complete
phase: quick
plan: 260416-nrx
subsystem: perfil-usuario
tags: [perfil, senha, modal, sidebar, ui]
tech_stack:
  added: []
  patterns: [modal-overlay, re-auth-verify]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "Verifica senha atual via signIn(email, senhaAtual) antes de updatePassword — re-auth garante que só o dono altera"
  - "PerfilModal é componente separado, recebe user e onClose — não precisa de estado global"
  - "showPerfil state no App root; signIn adicionado ao import de supabase.js"
metrics:
  duration: "~10 min"
  completed: 2026-04-16
  tasks_completed: 5
  files_changed: 1
---

# Quick 260416-nrx: Página/Modal Perfil + Alterar Senha — Summary

**One-liner:** Avatar/nome do usuário na sidebar se torna clicável e abre
modal de perfil com dados somente leitura e formulário de alteração de senha
com verificação da senha atual.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add showPerfil state + signIn import | 0774bb6 | App.jsx |
| 2 | Make user card clickable (onClick + cursor:pointer) | 0774bb6 | App.jsx |
| 3 | PerfilModal component (perfil + senha) | 0774bb6 | App.jsx |
| 4 | Render PerfilModal in App JSX | 0774bb6 | App.jsx |
| 5 | Commit + push + deploy | 0774bb6 | — |

## What Was Built

### User card clickable (linhas ~7793–7800)
`div` do avatar+nome ganhou `onClick={() => setShowPerfil(true)}`,
`cursor:"pointer"` e `title` tooltip. Clique no avatar ou nome abre o modal.

### PerfilModal component (linha ~444)
Modal com overlay escuro, fecha ao clicar fora ou no ✕.
- **Seção Dados do Perfil:** nome, email, oab exibidos como campos somente leitura (bg #f1f5f9)
- **Seção Alterar Senha:** três campos com toggle 👁/🙈, botão "Alterar Senha"
- **Lógica:** `signIn(user.email, senhaAtual)` verifica a senha atual; se OK chama `updatePassword(auth.access_token, novaSenha)`; toast sucesso/erro; limpa campos após sucesso

### Render no App (linha ~8063)
`{showPerfil && <PerfilModal user={user} onClose={() => setShowPerfil(false)} />}` junto ao ConfirmModal.

## Self-Check

- `showPerfil` state — FOUND App root
- `signIn` no import — FOUND linha 6
- User card `onClick` + `cursor:pointer` — FOUND sidebar
- `PerfilModal` component — FOUND antes de ResetPassword section
- `{showPerfil && <PerfilModal ...>}` — FOUND linha ~8063
- Build: `✓ built in 543ms` — PASSED
- Commit 0774bb6 — CONFIRMED

## Self-Check: PASSED
