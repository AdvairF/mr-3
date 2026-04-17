---
phase: quick-260417-fad
plan: 01
subsystem: frontend + backend + db
tags: [react, fila-devedor, supabase, automatico, status, polling]
requirements: [FILA-AUTO-STATUS]
status: complete

dependency_graph:
  requires: [FilaDevedor.jsx@260417-exu, filaDevedor.js@260417-exu]
  provides: [listarDevedoresParaFila, alterarStatusDevedor, FilaPainel-devedor-centric]
  affects: [FilaDevedor.jsx, filaDevedor.js, fila_cobranca, eventos_andamento]

tech_stack:
  added: []
  patterns:
    - "Devedor-centric fila — devedores como fonte de verdade, fila_cobranca para locks"
    - "Score JS em tempo real: status bonus + valor/100 + dias_cadastro×0.5"
    - "Polling 30s via setInterval + useRef (limpo no cleanup)"
    - "STATUS_DEV importado de constants.js — único source of truth"

key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js

decisions:
  - "Devedores são fonte de verdade, não fila_cobranca — fila usada só para lock EM_ATENDIMENTO e bloqueado_ate"
  - "Polling 30s ao invés de Supabase Realtime — @supabase/supabase-js não instalado"
  - "registrarEvento usa devedor_id (novo) como PK, contrato_id opcional"
  - "Score = status_bonus + valor_total/100 + dias_desde_cadastro × 0.5"
  - "STATUS_DEV importado de constants.js — reutiliza labels/cores existentes"

metrics:
  duration: "~1.5 horas"
  completed: "2026-04-17"
  tasks_completed: 5
  tasks_total: 5
  db_migrations: 3
  files_modified: 2
  lines_net: "+514 -249"
  deploy_url: "https://mrcobrancas.com.br"
---

# Quick Task 260417-fad: Fila Automática por Status do Devedor

**One-liner:** FilaPainel reescrito para mostrar devedores com status ativo diretamente (sem contratos), score automático, filtros, ações rápidas, poll 30s.

## Outcome

Full success. Build limpo, deploy em mrcobrancas.com.br. Todos os devedores com status ativo aparecem automaticamente na fila.

## Mudanças

### DB (3 migrations)
- `fila_cobranca.contrato_id` → nullable (devedores sem contrato entram na fila)
- `eventos_andamento.contrato_id` → nullable (eventos podem ser de devedor sem contrato)
- `eventos_andamento.devedor_id BIGINT FK devedores(id)` adicionado

### filaDevedor.js (novas / modificadas)

| Função | Mudança |
|--------|---------|
| `listarDevedoresParaFila(filtros)` | NOVA — query devedores por status, merge com fila_cobranca, score JS |
| `proximoDevedor(usuarioId)` | Reescrita — usa devedores direto, cria fila entry sem contrato_id |
| `registrarEvento(devedorId, usuarioId, dados)` | Modificada — devedor_id como PK, sem contrato obrigatório |
| `alterarStatusDevedor(devedorId, novoStatus, usuarioId)` | NOVA — PATCH devedores + remove da fila se terminal |
| `removerDaFila(filaId, motivo, usuarioId)` | Atualizada — evento usa devedor_id |
| `listarFila(filtros)` | Atualizada — contratoIds filtered (nullable) |

### FilaDevedor.jsx

**FilaPainel** (reescrito):
- Busca via `listarDevedoresParaFila()` em vez de `listarFila()`
- Colunas: Nome | CPF/CNPJ | Status (badge) | Valor | Dias | Prioridade | Telefone | Ações
- Filtros: busca texto, checkboxes multi-status, credor, prioridade, valor min/max
- Contadores: Aguardando / Em Atendimento / Bloqueados / Total
- Ações por linha: 📞 Ligar | 💬 WhatsApp | 📧 Email | ✏️ Evento modal | 👁 Abrir atendimento
- Poll automático 30s via setInterval + useRef cleanup

**FilaAtendimento** (atualizado):
- Status badge editável com dropdown inline (alterar status direto na tela)
- 📞 Ligar e 💬 WhatsApp no cabeçalho
- Eventos buscados por `devedor_id` (nova coluna)
- `registrarEvento(devedor.id, ...)` — sem contrato_id

**FilaOperador** (minor):
- Usa `listarDevedoresParaFila` para contagem de disponíveis

## Success Criteria

| Criterion | Result |
|-----------|--------|
| Devedores com status ativo na fila automaticamente | PASS |
| Sem precisar cadastrar contratos/parcelas | PASS |
| Score por status + valor + dias | PASS |
| Filtros multi-status, credor, prioridade, valor, busca | PASS |
| Ações rápidas 📞💬📧✏️👁 | PASS |
| Poll 30s automático | PASS |
| Alterar status na tela de atendimento | PASS |
| Remoção automática ao status terminal | PASS |
| Build sem erros | PASS |
| Deploy produção | PASS — mrcobrancas.com.br |
