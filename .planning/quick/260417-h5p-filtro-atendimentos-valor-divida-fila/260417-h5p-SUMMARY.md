---
phase: quick-260417-h5p
plan: 01
subsystem: frontend + backend
tags: [react, fila, atendimento, filtro, valor-divida, eventos_andamento]
requirements: [FILTRO-ATENDIMENTO, VALOR-DIVIDA-CORRETO, ULTIMO-ATENDIMENTO]
status: complete

dependency_graph:
  requires: [FilaDevedor.jsx@260417-fad, filaDevedor.js@260417-fad]
  provides: [filtroAtendimento-tabs, AtendimentoBadge, UltimoAtendimentoCell, totalEventosHoje]
  affects: [FilaDevedor.jsx, filaDevedor.js]

tech_stack:
  added: []
  patterns:
    - "Client-side atendimento filter — dados carregados 1x, filtro aplicado no render"
    - "_ultimo_evento + _dias_sem_contato computados no serviço (join por JS)"
    - "valor_total como proxy do saldo atualizado (pre-computed pela task 260416-p3r)"
    - "totalEventosHoje via Promise.all: eventos recentes + count hoje em paralelo"

key_files:
  modified:
    - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
    - src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx

decisions:
  - "valor_total usado em vez de re-calcular via calcularSaldoDevedorAtualizado: evita N+1 queries para dividas[] e pagamentos_parciais por devedor. Valor já é o saldo correto (task 260416-p3r sincronizou)"
  - "filtroAtendimento é client-side: evita reload ao trocar aba, counters sempre do conjunto completo"
  - "2 queries paralelas em listarDevedoresParaFila: eventos recentes (limit 2000) + count hoje (limit 1000)"
  - "AtendimentoBadge prioriza _bloqueado > hoje > semana > nunca"

metrics:
  duration: "~1 hora"
  completed: "2026-04-17"
  tasks_completed: 4
  tasks_total: 4
  db_migrations: 0
  files_modified: 2
  lines_net: "+161 -24"
  deploy_url: "https://mrcobrancas.com.br"
---

# Quick Task 260417-h5p: Filtro Atendimentos + Valor Dívida na Fila

**One-liner:** FilaPainel ganhou 4 tabs de atendimento, novos contadores, badge de status de contato, coluna de Último Atendimento e Dias s/ contato.

## Outcome

Build limpo, deploy `2c07d1c` em mrcobrancas.com.br.

## Mudanças

### filaDevedor.js — `listarDevedoresParaFila`

Adicionadas 2 queries paralelas após montar `resultado`:

| Query | Propósito |
|-------|-----------|
| `eventos_andamento SELECT … ORDER data_evento DESC LIMIT 2000` | Último evento por devedor (_ultimo_evento) |
| `eventos_andamento SELECT id WHERE data_evento >= hoje` | Count para card "Eventos Hoje" |

Novos campos em cada devedor:
- `_ultimo_evento` — objeto com `tipo_evento`, `data_evento`, `usuario_nome`
- `_dias_sem_contato` — inteiro ou null (nunca atendido)

Retorno atualizado: `{ success, data, totalEventosHoje, error }`

### FilaDevedor.jsx — `FilaPainel`

**Novos componentes:**
- `AtendimentoBadge` — 🔴 Nunca / 🟡 Semana / 🟢 Hoje / ⏰ Promessa
- `UltimoAtendimentoCell` — data + tipo + "por nome"

**Tabs de atendimento:**
```
[ ⏳ Pendentes ] [ ✅ Atendidos Hoje ] [ 📅 Atendidos Semana ] [ 🗓️ Todos ]
```

**Lógica de filtro (client-side):**
- `pendentes`: !_bloqueado && (!_ultimo_evento || data < hoje)  
- `atendidos_hoje`: data === hoje  
- `atendidos_semana`: data >= semana_passada  
- `todos`: sem filtro  

**Ordenação em PENDENTES:** prioridade ALTA→MEDIA→BAIXA → valor_total desc → created_at asc

**Counters (4 cards):**
| Card | Dado |
|------|------|
| Pendentes | devedores sem contato hoje (full list) |
| Atendidos Hoje | devedores com evento hoje (full list) |
| Eventos Hoje | totalEventosHoje do serviço |
| Valor em Aberto | Σ valor_total de todos os devedores |

**Colunas finais:**  
Nome | CPF/CNPJ | Status | Valor Dívida | Último Atendimento | Dias s/ contato | Prioridade | Telefone | Ações

## Success Criteria

| Criterion | Result |
|-----------|--------|
| Tabs Pendentes/Atendidos Hoje/Semana/Todos | PASS |
| Valor Dívida = valor_total (saldo correto) | PASS |
| Coluna Último Atendimento | PASS |
| Coluna Dias s/ contato | PASS |
| AtendimentoBadge por linha | PASS |
| Counters: Pendentes, Atendidos, Eventos, Valor | PASS |
| Ordenação inteligente em Pendentes | PASS |
| Build sem erros | PASS |
| Deploy produção | PASS — mrcobrancas.com.br |
