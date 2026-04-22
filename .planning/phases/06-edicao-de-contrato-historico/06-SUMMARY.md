---
phase: 06-edicao-de-contrato-historico
milestone: v1.3
status: complete
completed: 2026-04-22
commits:
  - 10b937e  # 06-01: contratos.js service layer
  - bf4ec36  # 06-02: DetalheContrato edit mode + cascade + HIS-02
  - 8c7d233  # 06-03: Histórico collapsible + timeline
  - "[sha fix 1]"  # UAT: window.confirm só se N>0 + opção vazia no select
  - "[sha fix 2]"  # UAT: remove PATCH em documentos_contrato (sem credor_id)
  - 57802b3  # UAT: TIPO_EVENTO_LABELS + resolve credor/devedor names
---

# Phase 6 Summary — Edição de Contrato + Histórico

## Goal

Advogado pode editar um contrato existente (credor, devedor, referência, encargos) com cascade automático para todas as parcelas, e visualizar o histórico cronológico de eventos do contrato.

## What was built

### Plan 06-01 — Service Layer (contratos.js)
- `editarContrato(contratoId, payload)` — PATCH em `contratos_dividas`
- `cascatearCredorDevedor(contratoId, { credor_id, devedor_id })` — propaga credor/devedor para `dividas` por `contrato_id` (EDT-03: inclui quitadas)
- `registrarEvento(contratoId, tipoEvento, snapshotCampos)` — INSERT em `contratos_historico`; `usuario_id` por DB DEFAULT `auth.uid()`
- `listarHistorico(contratoId)` — GET `contratos_historico` ordenado `created_at.desc`
- `criarContrato` promovido a `async` com fire-and-forget de evento `criacao` (HIS-01)

### Plan 06-02 — Edit Mode (DetalheContrato.jsx)
- State machine: `editando` / `salvando` / `editForm`
- `initEditForm(c)` inicializa form a partir do contrato prop; `useEffect([contrato.id])` reseta ao trocar contrato
- Header card condicional: read mode (`border: #e8f0f7`) / edit mode (`border: #c7d2fe`)
- Form: Inp referência, selects credor/devedor (credoresOptions / devedoresOptions), DiretrizesContrato encargos
- `handleSalvar`: detecta `credorAlterado` / `devedorAlterado` via String(), exibe `window.confirm` com N parcelas antes de cascade, chama `cascatearCredorDevedor` → `editarContrato` → `registrarEvento` com diff object
- `tipoEvento` derivado: `cessao_credito` / `assuncao_divida` / `alteracao_encargos` / `alteracao_referencia` / `outros`
- Spinner inline durante `salvando`

### Plan 06-03 — Histórico Section (DetalheContrato.jsx)
- Toggle colapsável "Histórico ▲/▼" com `marginTop: 24`
- Lazy-load: dispara `listarHistorico` só no primeiro open (`historicoCarregado` guard)
- Empty state: "Sem histórico disponível"
- Timeline vertical: linha absoluta `left: 16`, dots 12×12 (preto para `criacao`, índigo para edições)
- Evento `criacao`: exibe credor, devedor e referência em texto
- Evento edição: mapeia `diffEntries` com `FIELD_LABELS` + `antes → depois`

## UAT Fixes (aplicados após execução dos 3 plans)

| Fix | Descrição |
|-----|-----------|
| window.confirm condicional | Confirm só exibido quando N > 0 parcelas afetadas; opção vazia adicionada nos selects de credor/devedor |
| cascade apenas em dividas | Removido PATCH em `documentos_contrato` (tabela sem colunas `credor_id`/`devedor_id`) |
| TIPO_EVENTO_LABELS + name resolve | 6 labels PT-BR para tipo_evento; credor_id/devedor_id resolvidos para nome via lookup em props `credores`/`devedores` na timeline |

## SQL Migrations executadas no Supabase

Ver seção "Deploy Notes" no ROADMAP.md para instruções de re-execução em produção.

1. **contratos_historico** — nova tabela de auditoria (executada antes do plan 06-01)
2. **contratos_dividas.credor_id UUID → BIGINT** — correção de schema legado v1.0 (executada durante UAT ao tentar salvar edição de credor)

## Success Criteria — VERIFIED

| # | Critério | Status |
|---|----------|--------|
| 1 | Form inline pré-preenchido ao clicar "Editar Contrato" | ✅ |
| 2 | Salvar referência/encargos sem cascade → toast "Contrato atualizado." | ✅ |
| 3 | Alterar credor/devedor → window.confirm com N parcelas | ✅ |
| 4 | Cascade propaga para todas as parcelas (incluindo quitadas) | ✅ |
| 5 | Criar contrato registra evento 'criacao' em contratos_historico | ✅ |
| 6 | Seção Histórico colapsável exibe timeline com labels corretas e nomes resolvidos | ✅ |

## key-files

### modified
- `src/services/contratos.js`
- `src/components/DetalheContrato.jsx`
