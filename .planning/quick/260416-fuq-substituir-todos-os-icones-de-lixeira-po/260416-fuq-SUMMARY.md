---
phase: 260416-fuq
plan: "01"
subsystem: ui
tags: [buttons, delete, style, uniformization]
tech-stack:
  patterns: [inline-style, JSX button]
key-files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
    - src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx
decisions:
  - "Maintained marginLeft: 8 on excluirDivida custas button as extra property alongside target style"
  - "Replaced <Btn danger> component with native <button> inline to guarantee visual consistency"
metrics:
  duration: "~8 minutes"
  completed: "2026-04-16"
  tasks_completed: 2
  files_modified: 2
---

# Quick Task 260416-fuq: Substituir ícones de lixeira por botões Excluir uniformes — Summary

**One-liner:** Uniformized all 13 delete buttons across App.jsx and GerarPeticao.jsx to use transparent-background red-bordered style with text "Excluir" and no emoji.

## What Was Done

### Task 1 — App.jsx: 12 botões atualizados

**Grupo 1 — Emoji convertido para texto (3 botões):**
- Linha 1213: `excluirRegistro(r.id)` — emoji `🗑` → `Excluir`, style fee2e2 → transparent
- Linha 1344: `excluirLem(l.id)` — emoji `🗑` → `Excluir`, style fee2e2 → transparent
- Linha 3229: `excluir(c)` (credor) — emoji `🗑️` → `Excluir`, color #ef4444 → #DC2626, style → transparent

**Grupo 2 — Restyle botões com texto existente (5 botões):**
- Linha 918–921: `excluirAcordo(ac.id)` — background fee2e2 → transparent
- Linha 5023–5026: `excluir(l.id)` (lembrete régua) — background fee2e2 → transparent
- Linha 5921–5922: `excluirEtapa` (onClick inline async) — background fee2e2 → transparent
- Linha 2649: `excluirDivida(div.id)` (lista) — background fee2e2 → transparent
- Linha 2653: `excluirDivida(div.id)` (custas) — background fee2e2 → transparent, marginLeft: 8 preservado

**Grupo 3 — rgba → transparent (2 botões):**
- Linha 2447: `excluirDevedor(sel)` (header) — rgba(220,38,38,.3) → transparent, color #fca5a5 → #DC2626
- Linha 3477: `excluirProcesso(sel.id)` — idem

**Grupo 4 — Restyle usuário (1 botão):**
- Linha 6233–6236: `excluir(u.id)` — background fee2e2, border none, borderRadius 9 → estilo alvo

**Grupo 5 — Substituir componente (1 botão):**
- Linha 2502: `<Btn danger>Excluir</Btn>` → `<button>` inline com estilo alvo

### Task 2 — GerarPeticao.jsx: 1 botão atualizado

- Linha 776: `remover(m.id)` — `style={S.btnRed}` + emoji `🗑️` → inline style alvo + texto `Excluir`

## Confirmações

- **S.btnRed preservado:** linhas 228 (definição) e 1001 (uso no botão ✕ fechar preview) — intactas
- **App.js (backup):** não tocado
- **Todos os aria-labels preservados:** Excluir registro de contato, Excluir lembrete, Excluir credor, Excluir etapa
- **Todos os handlers onClick preservados:** nenhuma lógica de deleção alterada
- **Nenhum emoji remanescente:** 0 ocorrências de 🗑 ou 🗑️ em ambos os arquivos

## Build

```
✓ built in 389ms — sem erros de sintaxe
```

## Deviations from Plan

None — plan executed exactly as written.

## Commits

- `48e4586` (mr-3 submodule): feat(260416-fuq-01): substituir todos os ícones de lixeira por botões Excluir uniformes
- `b3a4390` (root repo): feat(260416-fuq-01): submodule pointer updated (same message)

## Self-Check: PASSED

- App.jsx: 12 transparent buttons: CONFIRMED
- GerarPeticao.jsx: 1 transparent button: CONFIRMED
- Commit 48e4586 in mr-3 submodule: FOUND
- Commit b3a4390 in root repo: FOUND
- Zero emoji 🗑/🗑️: CONFIRMED
- S.btnRed lines 228, 1001: CONFIRMED intact
- Build: PASSED (1.01s, 95 modules)
