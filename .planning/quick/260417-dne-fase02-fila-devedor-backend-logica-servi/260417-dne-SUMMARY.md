---
phase: 260417-dne
plan: 01
subsystem: fila-devedor-service
tags: [service, backend, supabase, fila-cobranca, testes]
dependency_graph:
  requires: [260417-dea]
  provides: [FILA-SVC-01, FILA-SVC-02, FILA-SVC-03, FILA-SVC-04, FILA-SVC-05, FILA-SVC-06, FILA-SVC-07, FILA-TEST-01]
  affects: [fase03-ui-fila-devedor]
tech_stack:
  added: []
  patterns: [optimistic-locking, compound-filter-patch, try-catch-envelope]
key_files:
  created:
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js
  modified: []
decisions:
  - IGPM escolhido como indexador default em atualizarValoresAtrasados
  - Operador real criado no setup do teste (FK obrigatoria nao aceita UUID fake)
  - calcularScorePrioridade chamado inline (nao re-exportado separadamente) para manter API limpa
metrics:
  duration: ~25min
  completed: 2026-04-17
---

# Phase 260417-dne Plan 01: Fase 02 — Fila de Devedor Backend (Service Layer) Summary

Service layer com 7 funcoes de negocio para o modulo Fila de Devedor, usando lock otimista via filtro composto sb() e calcularFatorCorrecao(igpm) para corracao monetaria.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Criar filaDevedor.js com 7 funcoes | f8f88cc | src/services/filaDevedor.js (331 linhas) |
| 2 | Script de teste real contra Supabase | 22e9b1f | src/services/filaDevedor.test.js (169 linhas) |

## What Was Built

### filaDevedor.js — 7 funcoes exportadas

- **calcularScorePrioridade(contratoId):** Calcula score `(valorOriginal/1000) + (diasAtrasoMaior*2) + (qtdAtrasadas*10)`, deriva prioridade ALTA/MEDIA/BAIXA e faz PATCH na fila_cobranca via `sb()` com filtro por `contrato_id`.
- **entrarNaFila():** Busca contratos ANDAMENTO, exclui os ja na fila (AGUARDANDO|EM_ATENDIMENTO), insere novos com score 0 e recalcula score de todos.
- **proximoDevedor(operadorId):** Lock otimista — SELECT proximo AGUARDANDO ordenado por score desc, PATCH com filtro composto `?id=eq.X&status_fila=eq.AGUARDANDO`, recursa ate 3 tentativas se outro operador pegou. Enriquece resultado com devedor + contrato + parcelas + eventos.
- **registrarEvento(contratoId, operadorId, dadosEvento):** Grava evento e aplica side-effects: PROMESSA_PAGAMENTO seta `bloqueado_ate` + status ACIONADO; ACORDO finaliza contrato + remove da fila; giro_carteira_dias > 0 bloqueia por N dias.
- **reciclarContratos(filtros, equipeId):** Busca contratos ANDAMENTO fora da fila usando `not.in.()`, aplica filtro opcional `dias_sem_contato` em JS, insere e calcula score.
- **removerDaFila(filaId, motivo, usuarioId):** Atualiza status REMOVIDO (usa dbUpdate pois filtra so por id) e registra evento SEM_CONTATO.
- **atualizarValoresAtrasados():** Aplica `calcularFatorCorrecao("igpm", dataInicio, dataFim)` em cada contrato NOVO/ANDAMENTO e persiste `valor_atualizado`.

### filaDevedor.test.js — Script de teste

Fluxo testado contra Supabase real:
1. Setup: busca devedor existente, cria operador real, contrato + 2 parcelas
2. entrarNaFila → verifica contrato entra com AGUARDANDO
3. proximoDevedor → verifica lock otimista, enriquecimento completo
4. registrarEvento(PROMESSA_PAGAMENTO) → verifica bloqueado_ate + status ACIONADO
5. calcularScorePrioridade → verifica score numerico + prioridade valida
6. removerDaFila → verifica status REMOVIDO
7. Cleanup robusto em ordem FK inversa

**Resultado final: 19 PASS / 0 FAIL**

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FK constraint rejeita UUID fake para operador_id**
- **Found during:** Task 2 — primeira execucao do teste
- **Issue:** `fila_cobranca.operador_id` tem FK para tabela `operadores`. O plano sugeria `"00000000-0000-0000-0000-000000000001"` como UUID fake, mas a constraint rejeita UUIDs nao presentes na tabela.
- **Fix:** Adicionado step no setup para criar operador real (`dbInsert("operadores", { ativo: true })`), usar seu UUID nos testes, e deletar no cleanup.
- **Files modified:** `filaDevedor.test.js`
- **Commit:** 22e9b1f

## Known Stubs

None — todas as funcoes consultam e persistem dados reais no Supabase.

## Threat Flags

None — nenhuma nova superficie de rede ou auth path introduzida alem do planejado.

## Self-Check: PASSED

- [x] `src/mr-3/mr-cobrancas/src/services/filaDevedor.js` existe
- [x] `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js` existe
- [x] Commit f8f88cc existe (feat Task 1)
- [x] Commit 22e9b1f existe (test Task 2)
- [x] 19 PASS / 0 FAIL na execucao final
