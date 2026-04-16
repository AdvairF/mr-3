---
phase: quick/260416-gp2
plan: 01
status: complete
subsystem: App.jsx — error handling / persistence
tags: [error-handling, toast, supabase, persistence, catches]
dependency_graph:
  requires: []
  provides: [PERSIST-G1, PERSIST-G2, PERSIST-G3]
  affects: [App.jsx]
tech_stack:
  added: []
  patterns: [toast.error pattern with optional chaining — (e?.message || e)]
key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - "toast.success de salvarLem movido para dentro do try — só executa em sucesso confirmado"
  - "excluirDevedor: logAudit/setDevedores/fecharModal movidos para após o try/catch — estado local não alterado em falha"
  - "Fallbacks com Date.now() em catch removidos — dado não entra no estado sem confirmação do banco"
metrics:
  duration: "~25 min"
  completed: "2026-04-16"
  tasks_completed: 3
  files_modified: 1
---

# Quick 260416-gp2 Plan 01: Corrigir 17 Pontos Críticos de Persistência em App.jsx — Summary

**One-liner:** 17 catches vazios/silenciosos em App.jsx corrigidos com toast.error e proteção de estado local contra divergência com Supabase.

---

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | G1 — 14 catches vazios/console-only | a5f0510 | App.jsx |
| 2 | G2 — 3 fallbacks silenciosos removidos | 9ed6801 | App.jsx |
| 3 | G3 — try/catch em excluirDevedor | b073a9d | App.jsx |

---

## Points Corrected

### Grupo 1 — Catches Vazios (14 pontos)

| ID | Linha | Função | Operação | Correção |
|----|-------|--------|----------|---------|
| G1-1 | 831 | confirmarPagamento | dbUpdate devedores | console.error mantido + toast.error adicionado |
| G1-2 | 838 | excluirAcordo | dbUpdate devedores | catch vazio → toast.error |
| G1-3 | 1058 | excluirRegistro | dbDelete registros_contato | catch vazio → toast.error |
| G1-4 | 1094 | concluirLem (ficha) | dbUpdate lembretes | catch vazio → toast.error |
| G1-5 | 1099 | excluirLem (ficha) | dbDelete lembretes | catch vazio → toast.error |
| G1-6 | 3414 | registrarAndamento | dbUpdate processos proximo_prazo | catch vazio → toast.error |
| G1-7 | 3431 | excluirProcesso | dbDelete processos | catch vazio → toast.error |
| G1-8 | 4818 | concluir (lembretes global) | dbUpdate lembretes | catch vazio → toast.error |
| G1-9 | 4822 | cancelar (lembretes global) | dbUpdate lembretes | catch vazio → toast.error |
| G1-10 | 4826 | reativar (lembretes global) | dbUpdate lembretes | catch vazio → toast.error |
| G1-11 | 4831 | excluir (lembretes global) | dbDelete lembretes | catch vazio → toast.error |
| G1-12 | 5487 | se(novas) — régua etapas | dbGet/dbInsert/dbUpdate/dbDelete regua_etapas | catch vazio → toast.error |
| G1-13 | 5499 | salvarRegua | dbGet/dbDelete/dbInsert regua_cobranca | catch vazio → toast.error |
| G1-14 | 5802 | onClick inline régua | dbGet/dbDelete/dbInsert regua_cobranca | catch vazio → toast.error |

### Grupo 2 — Fallbacks Silenciosos (3 pontos)

| ID | Linha | Função | Correção |
|----|-------|--------|---------|
| G2-1 | 1051 | salvarRegistro | setRegistros(Date.now()) removido do catch → toast.error |
| G2-2 | 1087 | salvarLem (ficha devedor) | setLemsDevedor(Date.now()) removido do catch → toast.error; toast.success movido para dentro do try |
| G2-3 | 4812 | salvarLembrete (global) | setLembretes(Date.now()) removido do catch → toast.error |

### Grupo 3 — Sem try/catch (1 ponto)

| ID | Linha | Função | Correção |
|----|-------|--------|---------|
| G3-1 | 2378 | excluirDevedor | dbDelete envolvido em try/catch; catch exibe toast.error e retorna; logAudit/setDevedores/fecharModal só executam pós-sucesso |

---

## Verification Results

1. `grep -c "} catch (e) { }"` — 4 ocorrências restantes, todas fora do escopo deste plano (ViaCEP fetch, inner catches de funções não listadas). Nenhum dos 17 pontos permanece com catch vazio.
2. `grep -n "Date.now()"` — nenhuma ocorrência em blocos catch. Todos os Date.now() restantes estão em fluxos de sucesso (try) ou em criação de estado UI local.
3. `grep -A 12 "async function excluirDevedor"` — estrutura try/catch confirmada com return no catch; logAudit/setDevedores/fecharModal após o bloco.
4. `grep -c "toast.error"` — 41 ocorrências (baseline pré-plano: ~23; incremento: 18 — 17 do plano + 1 recontagem de G1-1 que tinha console.error).

---

## Deviations from Plan

### Auto-fixed Issues

None — plano executado exatamente como descrito.

### Minor Adjustments

**G2-2 (salvarLem):** O bloco substituído incluiu também a linha `setShowForm(false)` e `setFormLem(...)` que estavam após o catch mas antes do `toast.success`. A substituição reorganizou corretamente: toast.success movido para dentro do try, e as linhas de reset do form preservadas exatamente fora do try/catch (executam sempre após a tentativa, em sucesso ou falha — comportamento correto pois limpar o form independe de sucesso do banco).

**G1-14:** O old_string exato do plano não bateu devido a diferença de indentação (36 espaços vs. o que estava no arquivo). Corrigido usando uma linha de contexto adicional como âncora de unicidade — sem alteração de comportamento.

---

## Known Stubs

None — nenhum stub introduzido por este plano.

---

## Threat Flags

None — nenhuma nova superfície de rede, auth path, ou acesso a arquivo introduzida.

---

## Self-Check

### Files Modified

- [x] `src/mr-3/mr-cobrancas/src/App.jsx` — FOUND (modificado em todos os 3 commits)

### Commits

- [x] a5f0510 — Task 1 G1 (14 catches)
- [x] 9ed6801 — Task 2 G2 (3 fallbacks)
- [x] b073a9d — Task 3 G3 (excluirDevedor)

## Self-Check: PASSED
