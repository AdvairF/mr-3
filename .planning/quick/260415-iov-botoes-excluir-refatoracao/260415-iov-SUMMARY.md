---
phase: quick/260415-iov-botoes-excluir-refatoracao
plan: 01
status: complete
subsystem: ui
tags: [buttons, accessibility, delete, emoji-removal]
key-files:
  modified:
    - src/mr-3/mr-cobrancas/src/App.jsx
decisions:
  - Grupo A: estilo vermelho unificado (border fecaca, borderRadius 7, padding 4px 9px, fontSize 11, fontWeight 700)
  - Grupo B: apenas emoji removido, estilos originais intocados
metrics:
  duration: ~10min
  completed: 2026-04-15
  tasks: 2
  files_modified: 1
---

# Quick Task 260415-iov: Botões Excluir — Remoção do Emoji de Lixeira

**One-liner:** Remoção do emoji 🗑/🗑️ de 9 botões de exclusão em App.jsx, com normalização de estilo nos botões do Grupo A.

## O que foi alterado

### Grupo A — Estilo vermelho completo aplicado (3 botões)

Estes botões receberam o estilo de referência unificado além da remoção do emoji:

| Localização | Função | Linha aprox. |
|---|---|---|
| Acordos | `excluirAcordo(ac.id)` | 918 |
| Lembretes | `excluir(l.id)` | 5023 |
| Etapas de Processo | `se(etapas.filter(...))` | 5921 |

**Estilo aplicado (Grupo A):**
```
background: "#fee2e2"
color: "#dc2626"
border: "1px solid #fecaca"
borderRadius: 7
padding: "4px 9px"
cursor: "pointer"
fontSize: 11
fontWeight: 700
```

Conteúdo alterado de `🗑` para `Excluir`. O `aria-label="Excluir etapa"` do botão de etapas foi preservado intacto.

### Grupo B — Apenas emoji removido (6 botões)

Estes botões tiveram somente o emoji e o espaço adjacente removidos. Nenhuma propriedade CSS foi alterada:

| Localização | Função | Linha aprox. |
|---|---|---|
| Devedores (tema escuro) | `excluirDevedor(sel)` — button direto | 2447 |
| Devedores (tema claro) | `excluirDevedor(sel)` — componente Btn | 2502 |
| Dívidas (padrão) | `excluirDivida(div.id)` | 2649 |
| Dívidas (ehSoCustas) | `excluirDivida(div.id)` | 2653 |
| Processos | `excluirProcesso(sel.id)` | 3477 |
| Usuários | `excluir(u.id)` | 6235 |

Nota: linha 6235 mantém `border: "none"` original (é Grupo B — sem normalização de estilo).

## Linhas fora de escopo — não tocadas

Linhas 1213, 1344 e 3229 não foram modificadas, conforme definido no plano.

## Verificação

- Nenhuma das 9 linhas alvo contém emoji 🗑 ou 🗑️ após as edições
- Linhas intocáveis (1213, 1344, 3229) confirmadas inalteradas
- `aria-label="Excluir etapa"` presente no botão de etapas

## Commits

| Task | Commit | Descrição |
|---|---|---|
| Task 1 + Task 2 | a725305 | feat(260415-iov): remover emoji lixeira dos 9 botões de exclusão |

## Deviations from Plan

None — plano executado exatamente conforme especificado.

## Self-Check: PASSED

- `src/mr-3/mr-cobrancas/src/App.jsx`: FOUND (modified)
- Commit `a725305`: FOUND
- Nenhum emoji restante nas 9 linhas alvo: CONFIRMED
