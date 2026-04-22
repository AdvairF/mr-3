# Roadmap — Mr. Cobranças

## Milestones

- ✅ **v1.0 Refatoração Estrutural** — Phases 1–3 (shipped 2026-04-20)
- ✅ **v1.1 Pagamentos** — Phase 4 only (shipped 2026-04-21)
- ✅ **v1.2 Contratos Redesenhados** — Phase 5 (redesenho 3 níveis) (shipped 2026-04-22)
- ✅ **v1.3 Edição de Contrato + Histórico** — Phase 6 (UAT verified 2026-04-22) — **ready to ship**

## Phases

<details>
<summary>✅ v1.0 Refatoração Estrutural (Phases 1–3) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Refatoração Pessoas × Dívidas — big bang noturno (6/6 plans) — completed 2026-04-20
- [x] Phase 2: Módulo Dívidas no Sidebar (4/4 plans) — completed 2026-04-20
- [x] Phase 3: Nova Dívida com Co-devedores (5/5 plans) — completed 2026-04-20

See full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### ✅ v1.1 — Pagamentos (SHIPPED 2026-04-21)

- [x] **Phase 4: Pagamentos por Dívida** — Advogado registra, consulta e remove pagamentos diretamente na tela da dívida, com saldo recalculado via Art. 354 CC

### ✅ v1.2 — Contratos Redesenhados (SHIPPED 2026-04-22)

- [x] **Phase 5 (redesenho): Contratos com modelo 3 níveis** — Escopo corrigido após UAT: Contrato (guarda-chuva) → Documentos (NF/boleto/etc.) → Parcelas (dividas reais). Ver `.planning/phases/05-contratos-com-parcelas/05-CONTEXT.md` para decisões D-01..D-09.
- [ ] **04-06 backlog: persistir saldo_atual no banco** — PAG-10, deferred para v1.3

### ✅ v1.3 — Edição de Contrato + Histórico (UAT verified 2026-04-22 — ready to ship)

- [x] **Phase 6: Edição de Contrato + Histórico** — Advogado edita credor/devedor/referência/encargos com cascade automático e visualiza histórico cronológico de eventos do contrato

## Phase Details

### Phase 4: Pagamentos por Dívida
**Goal**: Advogado pode fechar o ciclo financeiro de uma dívida individual — registrar pagamentos com data e valor, ver o histórico, corrigir lançamentos errados, e saber quando a dívida está quitada
**Depends on**: Phase 3 (DetalheDivida existente como ponto de entrada)
**Requirements**: PAG-01, PAG-02, PAG-03, PAG-04, PAG-05, PAG-06, PAG-07, PAG-08
**Decision point**: Resolvido — Posição B (nova tabela `pagamentos_divida` com FK para `dividas`). Ver CONTEXT.md D-01.
**Success Criteria** (what must be TRUE):
  1. Advogado abre a tela de uma dívida e consegue registrar um pagamento informando data, valor e observação — o novo pagamento aparece imediatamente na lista cronológica abaixo
  2. Advogado vê o histórico completo de pagamentos da dívida em ordem cronológica, com data, valor e observação de cada lançamento
  3. Advogado consegue editar ou excluir um pagamento lançado por engano, após confirmação, e o saldo é recalculado na mesma tela
  4. O saldo exibido na tela da dívida reflete a imputação Art. 354 CC sequencial sobre todos os pagamentos registrados para aquela dívida
  5. Quando o saldo calculado é ≤ 0, a dívida exibe o badge "Saldo quitado" na tela de detalhe
  6. `dividas.saldo_quitado` é persistido no banco após cada operação de pagamento
  7. Badge "Saldo quitado" exibido na TabelaDividas lendo `dividas.saldo_quitado`
**Plans**: 3 plans
Plans:
- [x] 04-01-PLAN.md — Service layer: pagamentos.js (CRUD + calcularSaldoPorDividaIndividual) + atualizarSaldoQuitado em dividas.js
- [x] 04-02-PLAN.md — Componente PagamentosDivida.jsx: histórico, edição inline, exclusão com confirm, formulário de registro
- [x] 04-03-PLAN.md — Integração: montar PagamentosDivida em DetalheDivida + badge "Saldo quitado" em DetalheDivida e TabelaDividas
- [x] 04-04-PLAN.md — CR-03 gap closure: recalcularESincronizar no mount + Total Pago por pagamentos_divida (PAG-05, PAG-07)
- [x] 04-05-PLAN.md — CR-04 gap closure: sincronizar dividas.status com saldo_quitado (PAG-09)
- [~] 04-06-PLAN.md — CR-05 backlog v1.2: persistir saldo_atual no banco (PAG-10) — DEFERRED
**UI hint**: yes

### Phase 5: Contratos com Parcelas (Redesenho 3 Níveis — v1.2)
**Goal**: Advogado pode criar um Contrato (relação comercial), adicionar Documentos (NF, boleto, C&V, etc.) a ele, e cada Documento gera automaticamente N Parcelas como dívidas reais — navegando do contrato ao detalhe de cada parcela com saldo individual vivo via Art. 354 CC
**Depends on**: Phase 4 (mecanismo de pagamentos por dívida necessário para saldo por parcela em DetalheContrato)
**Requirements**: CON-01, CON-02, CON-03, CON-04, CON-05
**Model**: Contrato → Documento → Parcela (3 níveis). Decisions D-01..D-09 in 05-CONTEXT.md.
**Success Criteria** (what must be TRUE):
  1. Advogado cria um Contrato (header: credor, devedor, referência, encargos padrão) e o sistema abre DetalheContrato com lista de documentos vazia
  2. Advogado adiciona um Documento ao Contrato (tipo, número, valor, data emissão, nº parcelas, encargos) e o sistema gera N Parcelas automaticamente como rows reais na tabela dividas
  3. Advogado vê a lista global de contratos com colunas: Credor, Devedor, Docs, Parcelas, Valor Total, Em Atraso
  4. Advogado abre DetalheContrato e vê documentos colapsáveis — expandindo um documento mostra tabela de parcelas com saldo individual calculado via Art. 354 CC
  5. Parcelas de contratos aparecem na tabela global de dívidas (ModuloDividas) com badge [NF]/[C&V]/[Empr.] no campo Credor
**Plans**: 5 plans
Plans:
- [x] 05-01-PLAN.md — DB migration (documentos_contrato table + ALTER contratos_dividas + dividas.documento_id FK) + contratos.js service (3-level: criarContrato, adicionarDocumento, gerarPayloadParcelasDocumento, recalcularTotaisContrato)
- [x] 05-02-PLAN.md — NovoContrato.jsx (header only: credor + devedor + referência + encargos via DiretrizesContrato) + TabelaContratos.jsx (6 colunas: Credor, Devedor, Docs, Parcelas, Valor Total, Em Atraso)
- [x] 05-03-PLAN.md — AdicionarDocumento.jsx (novo: tipo + numero_doc + valor + data_emissao + num_parcelas + encargos herdados editáveis)
- [x] 05-04-PLAN.md — DetalheContrato.jsx (header + financial summary green + documentos colapsáveis + inline AdicionarDocumento) + DetalheDivida.jsx (breadcrumb duplo ← Ver documento + ← Ver contrato) + TabelaDividas.jsx (badge [NF]/[C&V]/[Empr.])
- [x] 05-05-PLAN.md — ModuloContratos.jsx (4-view state machine: lista/novo/detalhe/parcela-detalhe) + App.jsx (allContratos + allDocumentos state, documentosMap enrichment, NAV, renderPage) + human verify
**UI hint**: yes
**Status**: Complete 2026-04-22 — 3-level model. All 5 plans verified E2E.

### Phase 6: Edição de Contrato + Histórico (v1.3)
**Goal**: Advogado pode editar um contrato existente (credor, devedor, referência, encargos padrão) com cascade automático de credor/devedor para todos os documentos e parcelas, e visualizar o histórico cronológico de eventos do contrato
**Depends on**: Phase 5 (DetalheContrato existente como ponto de entrada, contratos.js como service base)
**Requirements**: EDT-01, EDT-02, EDT-03, EDT-04, HIS-01, HIS-02, HIS-03, HIS-04
**Decisions**: D-01..D-09 in 06-CONTEXT.md
**Success Criteria** (what must be TRUE):
  1. Advogado clica "Editar Contrato" no DetalheContrato e vê form inline com todos os campos (referência, credor, devedor, encargos) pré-preenchidos
  2. Advogado salva edição de referência/encargos sem cascade — toast "Contrato atualizado." aparece e header reflete novos valores
  3. Advogado altera credor ou devedor — sistema exibe window.confirm com N parcelas afetadas antes de salvar
  4. Após confirmação do cascade, credor/devedor propagado para todos os documentos e parcelas (incluindo quitadas)
  5. Ao criar um contrato novo, evento 'criacao' registrado automaticamente em contratos_historico
  6. Advogado abre seção "Histórico" colapsável e vê timeline vertical com eventos criacao e edicao em ordem cronológica
**Plans**: 3 plans
Plans:
- [x] 06-01-PLAN.md — DB migration (contratos_historico) + contratos.js service (editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico) + criarContrato modificado para HIS-01
- [x] 06-02-PLAN.md — DetalheContrato.jsx edit mode: form unificado (referência + credor + devedor + DiretrizesContrato), cascade confirm, save/cancel handlers, spinner, HIS-02
- [x] 06-03-PLAN.md — DetalheContrato.jsx Histórico section: toggle colapsável, lazy load, empty state, timeline vertical (criacao + edicao events)
UAT fixes (3 commits pós-plans):
- window.confirm condicional (N > 0) + opção vazia nos selects credor/devedor
- cascade restrito a `dividas` (removido PATCH incorreto em `documentos_contrato`)
- TIPO_EVENTO_LABELS (6 labels PT-BR) + resolve credor/devedor ID → nome na timeline

## Deploy Notes — SQL Migrations (v1.3)

As migrations abaixo foram executadas manualmente no Supabase SQL Editor durante o desenvolvimento/UAT.
**Re-executar em produção antes do deploy.**

### Migration 1 — Tabela contratos_historico

```sql
CREATE TABLE IF NOT EXISTS public.contratos_historico (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     UUID         NOT NULL REFERENCES public.contratos_dividas(id) ON DELETE CASCADE,
  tipo_evento     TEXT         NOT NULL CHECK (tipo_evento IN (
                                 'criacao', 'alteracao_encargos', 'cessao_credito',
                                 'assuncao_divida', 'alteracao_referencia', 'outros')),
  snapshot_campos JSONB        NOT NULL DEFAULT '{}',
  usuario_id      UUID         DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.contratos_historico
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_contratos_historico_contrato_id
  ON public.contratos_historico (contrato_id, created_at DESC);
```

### Migration 2 — Corrigir tipo de contratos_dividas.credor_id (UUID → BIGINT)

Schema legado v1.0 definia `credor_id UUID` mas `credores.id` é BIGINT. Corrigido durante UAT.

```sql
-- Zerar valores existentes (eram UUIDs inválidos ou NULL) antes de converter
UPDATE public.contratos_dividas SET credor_id = NULL;
ALTER TABLE public.contratos_dividas
  ALTER COLUMN credor_id TYPE BIGINT USING NULL;
```

> **Nota**: se houver dados de produção com `credor_id` preenchido como UUID válido referenciando
> a tabela `credores`, fazer mapeamento UUID → BIGINT antes de executar. Em ambiente de dev/staging
> todos os valores eram NULL ou inválidos — truncate seguro.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Refatoração Pessoas × Dívidas | v1.0 | 6/6 | Complete | 2026-04-20 |
| 2. Módulo Dívidas no Sidebar | v1.0 | 4/4 | Complete | 2026-04-20 |
| 3. Nova Dívida com Co-devedores | v1.0 | 5/5 | Complete | 2026-04-20 |
| 4. Pagamentos por Dívida | v1.1 | 5/5 (+1 backlog) | **Complete** | 2026-04-21 |
| 5. Contratos com Parcelas | v1.2 | 5/5 | **Complete** | 2026-04-22 |
| 6. Edição de Contrato + Histórico | v1.3 | 3/3 (+3 UAT fixes) | **Complete** | 2026-04-22 |
