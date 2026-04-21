# Roadmap — Mr. Cobranças

## Milestones

- ✅ **v1.0 Refatoração Estrutural** — Phases 1–3 (shipped 2026-04-20)
- ✅ **v1.1 Pagamentos** — Phase 4 only (shipped 2026-04-21)
- 🔜 **v1.2 Contratos Redesenhados** — Phase 5 (redesenho 3 níveis) + backlog (04-06 saldo_atual)

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

### 🔜 v1.2 — Contratos Redesenhados

- [ ] **Phase 5 (redesenho): Contratos com modelo 3 níveis** — Escopo corrigido após UAT: Dívida agregada → Múltiplas NFs/documentos → Cada NF com suas próprias parcelas/duplicatas. Ver `.planning/phases/05-contratos-com-parcelas/05-PAUSED.md` para contexto completo e pontos reutilizáveis.
- [ ] **04-06 backlog: persistir saldo_atual no banco** — PAG-10, deferred desde v1.1

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

### Phase 5: Contratos com Parcelas
**Goal**: Advogado pode modelar uma relação contratual (NF/Duplicata, Compra e Venda, Empréstimo) como um contrato que gera automaticamente N parcelas como dívidas reais — e navegar do contrato ao detalhe de cada parcela com saldo individual vivo
**Depends on**: Phase 4 (mecanismo de pagamentos por dívida necessário para saldo por parcela em DetalheContrato)
**Requirements**: CON-01, CON-02, CON-03, CON-04, CON-05
**Success Criteria** (what must be TRUE):
  1. Advogado preenche um formulário de novo contrato (tipo, credor, devedor, valor total, data, nº parcelas) e o sistema gera N parcelas automaticamente — cada parcela aparece como uma linha real na tabela de dívidas
  2. Advogado vê a lista global de contratos com tipo, partes envolvidas, valor total, número de parcelas e quantas estão em atraso
  3. Advogado abre o detalhe de um contrato e vê o header com os dados do contrato mais uma tabela de parcelas onde cada parcela exibe seu saldo individual calculado via Art. 354 CC sobre os pagamentos registrados para aquela parcela
  4. Parcelas de contratos aparecem na tabela global de dívidas (ModuloDividas) com uma indicação visual de que pertencem a um contrato — advogado consegue distinguir dívidas avulsas de parcelas contratuais sem abrir o detalhe
**Plans**: 5 plans
Plans:
- [x] 05-01-PLAN.md — DB migration (contratos_dividas table + dividas.contrato_id FK) + contratos.js service (criarContratoComParcelas, gerarPayloadParcelas)
- [x] 05-02-PLAN.md — NovoContrato.jsx (form com devedor typeahead + parcelas preview) + TabelaContratos.jsx (lista global 6 colunas)
- [x] 05-03-PLAN.md — ModuloContratos.jsx (4-view state machine) + DetalheContrato.jsx (header + financial summary green + parcelas table com saldo lazy)
- [x] 05-04-PLAN.md — TabelaDividas.jsx badge [NF]/[C&V]/[Empr.] + DetalheDivida.jsx "← Ver contrato" link
- [x] 05-05-PLAN.md — App.jsx integration: I.contratos, NAV entry, allContratos state, carregarTudo + _contrato_tipo enrichment, renderPage case + human verify
- [~] 05-06-PLAN.md — CR-06 parcial: Tasks 2-5 commitadas (DiretrizesContrato, DividaForm, NovoContrato, contratos.js). T6 (DetalheContrato) descartada. **DRAFT — reaproveitar no v1.2**
**UI hint**: yes
**Status**: PAUSED — scope revision needed. Ver 05-PAUSED.md.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Refatoração Pessoas × Dívidas | v1.0 | 6/6 | Complete | 2026-04-20 |
| 2. Módulo Dívidas no Sidebar | v1.0 | 4/4 | Complete | 2026-04-20 |
| 3. Nova Dívida com Co-devedores | v1.0 | 5/5 | Complete | 2026-04-20 |
| 4. Pagamentos por Dívida | v1.1 | 5/5 (+1 backlog) | **Complete** | 2026-04-21 |
| 5. Contratos com Parcelas | v1.2 | —/— | **Paused — scope revision** | — |
