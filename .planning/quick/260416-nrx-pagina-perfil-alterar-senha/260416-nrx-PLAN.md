---
quick_id: 260416-nrx
slug: pagina-perfil-alterar-senha
date: 2026-04-16
status: planned
---

# Quick 260416-nrx: Página/Modal Perfil + Alterar Senha

**Goal:** Clicar no nome do usuário no canto inferior esquerdo abre modal de
perfil com dados somente leitura e formulário de alteração de senha.

## Tasks

1. **Add `showPerfil` state** — App root, junto dos outros estados  
2. **Make user card clickable** — `div` do avatar+nome (linhas ~7678–7683) ganha `onClick + cursor:pointer`  
3. **Add `PerfilModal` component** — antes do `// DASHBOARD` section:  
   - Seção dados: nome, email, oab (somente leitura)  
   - Seção senha: senhaAtual, novaSenha, confirmarSenha  
   - Verificação: `signIn(user.email, senhaAtual)` antes de `updatePassword(token, novaSenha)`  
   - Toast sucesso/erro; limpar campos após sucesso  
4. **Render `<PerfilModal>`** — no JSX do App, junto com `ConfirmModal`  
5. **Commit + push + deploy**

## Key files
- `src/mr-3/mr-cobrancas/src/App.jsx` — único arquivo alterado
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `signIn` e `updatePassword` já existem

## Constraints
- NÃO alterar nada além da funcionalidade descrita
- Usar `signIn` (já importado via `supabase.js`) para verificar senha atual
- Usar `updatePassword(token, novaSenha)` adicionado na task anterior
- Estilo inline consistente com o resto do app (dark sidebar, cards #fff)
