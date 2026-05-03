---
phase: 9.1
title: Refactor motor evolução por eventos (modelo tribunal-style)
status: PLANNING
inserted_date: 2026-05-02
severidade: ALTA
milestone: v1.5
ui_hint: yes
autonomous: false
---

# Phase 9.1 — Refactor motor "evolução por eventos" (modelo tribunal-style)

## 1. Metadados

- **Phase**: 9.1
- **Título**: Refactor motor evolução por eventos tribunal-style
- **Milestone**: v1.5 (primeira phase do milestone — abre nova versão pós v1.4 SHIPPED 2026-05-02)
- **Status**: PLANNING
- **Severidade**: **ALTA** — refactor estrutural do motor de cálculo (D-01), violação intencional do invariante D-01 INTOCADO cumulative desde Phase 7.8
- **Autonomous**: false (UAT comparativo humano essencial vs soscalculos)
- **Tipo**: refactor estrutural (substitui motor monolítico por event processor cronológico)

## 2. Contexto e motivação

**Phase 8 SHIPPED 2026-05-02** com PDF Demonstrativo. Operador comparou MR Cobranças vs **soscalculos** (referência tribunal-style usada por advogados em petições):

- **Drift identificado**: R$ 797,92 em saldo TRADIO (`ce7b8d47-...`)
- **Causa raiz**: motor atual `devedorCalc.js calcularDetalheEncargos` calcula tudo em **uma passada monolítica** (loops Art.354 duplicados em 3 funções), sem separar evolução cronológica por evento
- **Padrão tribunal**: cálculos jurídicos formais separam etapas (vencimento → correção período → multa → honorários → pagamentos imputados → Art.523 → consolidado), cada etapa visível como evento individual

Operador quer:
1. Cálculos padrão tribunal pra **TODOS contratos futuros** (~200 nos primeiros meses do escritório)
2. Drift vs soscalculos zerado (delta < R$ 1,00 cenário TRADIO real ~R$ 26K — D-pre-15; sub-validação opcional cenário simples R$ 100 → delta < R$ 0,10)
3. Aderência **Lei 14.905/24** (regime intertemporal taxa legal — vigente 30/08/2024)

**Sistema VAZIO atualmente** — apenas dados teste (TRADIO + ROCHA FASHION + advair). Janela ideal pra refactor sem risco produção.

**Cumulative do escritório**: 0 contratos reais de clientes. Apaga teste → refactor → começa cadastros novos com motor novo.

## 3. Decisions locked (D-pre)

| ID | Decisão | Trigger | Origem |
|---|---|---|---|
| **D-pre-1** | Modelo "evolução por eventos" cronológicos (substitui 3 loops Art.354 duplicados em devedorCalc.js L59/L172/L277) | Operador 2026-05-02 — alinhamento com soscalculos + DRY violation pre-existente | operador 2026-05-02 |
| **D-pre-2** | Lei 14.905/24 regime intertemporal automático (transição 30/08/2024) — INPC+1% antes; IPCA+Taxa Legal depois | Vigência legal nacional | operador 2026-05-02 |
| **D-pre-3** | Índices uniformes nacionais (INPC/IPCA Brasil-todo, **NÃO** tabelas estaduais TJ-XX) — cobertura 80% jurisdições | Operador escritório atende vários estados | operador 2026-05-02 |
| **D-pre-4** | Multa e honorários sobre **Principal Corrigido APENAS** (alinha 100% soscalculos) — NÃO sobre saldo total atualizado | Confronto MR vs soscalculos | operador 2026-05-02 |
| **D-pre-5** | Juros simples (não compostos) para Taxa Legal (conforme Resolução CMN 5.171/24) | Norma BCB | operador 2026-05-02 |
| **D-pre-6** | Storage índices: JSON em `src/data/indicesHistoricos.json` populado AUTOMATICAMENTE via API BCB SGS (script `scripts/fetch-indices.js`). Operador roda `npm run fetch-indices` mensalmente. Códigos SGS: 433 (INPC), 7849 (IPCA-15), 29541+29542 (componentes Taxa Legal). Bandeira 1 AUTORIZADA pelo operador 2026-05-02. | Automação BCB elimina manual mensal + Bandeira 1 autorizada na sessão revisão PLAN | operador 2026-05-02 |
| **D-pre-7** | **Cutover direto** (sem dual-rail) — ambiente vazio, zero risco produção. Substitui motor antigo de uma vez. | Zero clientes reais | operador 2026-05-02 |
| **D-pre-8** | **D-01 RELAXED** escopo Phase 9.1 APENAS — invariante D-01 motor INTOCADO cumulative desde Phase 7.8 explicitamente violada nesta phase. Pós-SHIP 9.1, D-01 volta estrito (motor refactored vira nova baseline INTOCADO). Pattern espelha Phase 7.9 D-pre-rename (`feedback_d01_relaxation_protocol`). | Refactor motor é o objetivo da phase | operador 2026-05-02 |
| **D-pre-9** | Apagar **APENAS advair (id=8 cobaia teste Phase 8)** ANTES do refactor. **TRADIO (id=25 MENDES E MENDES, contrato `ce7b8d47-...`) + ROCHA (id=27 M L FRIOS, contrato `335a2ad2-...`) PRESERVADOS** — viram UAT real Task 5.1 (D-pre-15). Atualizado pós-Discovery 2 (2026-05-03). | Operador validou que TRADIO + ROCHA têm dados parcialmente reais, recadastro retrabalho desnecessário. Motor novo recalcula automaticamente. | operador 2026-05-03 |
| **D-pre-15** | TRADIO + ROCHA pre-Phase 9.1 servem como UAT real comparativo soscalculos (Task 5 SC-9). Pos-refactor motor novo deve recalcular esses contratos com saldos tribunal-style: TRADIO delta < R$ 1,00 vs PDF soscalculos prévio R$ 26.633,88. | Aproveitamento de cenário real (com transição Lei 14.905/24, pagamentos parciais, multa+honor) sem recadastro sintético. Tolerância R$ 1,00 sobre R$ 26.633 = 0,004% — alinhado com 4 casas BCB. | operador 2026-05-03 |
| **D-pre-10** | Schema rename long↔short form (`indice_correcao` ↔ `indexador` + `juros_am_percentual` ↔ `juros_am` + etc.) **DEFERRED** — fora do escopo Phase 9.1. Adapter atual preservado. Memory `feedback_schema_adapter_long_short_form_consumer_replication` aplica como alerta consultivo | Escopo control — refactor motor é grande o suficiente | operador 2026-05-02 |
| **D-pre-11** | Backup Supabase obrigatório pré-refactor (`pg_dump` via dashboard OU Supabase scheduled backup confirmado). Pre-flight gate Task 0. | Defesa contra falha catastrófica refactor | operador 2026-05-02 |
| **D-pre-12** | Event processor **síncrono puro** — determinístico (mesmos eventos → mesmo output), replayable (pode ser rerun N vezes sem side-effects), debugável (cada evento inspecionável) | Necessário pra audit trail jurídico | operador 2026-05-02 |
| **D-pre-13** | **5 tipos de eventos**: `vencimento_parcela`, `pagamento`, `custa_lancada`, `mudanca_regime_lei14905` (auto-injetado em 30/08/2024), `aplicacao_art523` | Cobertura completa fluxo financeiro | operador 2026-05-02 |
| **D-pre-14** | Taxa juros do contrato **respeitada** (campo `juros_am_percentual` quando preenchido) — fallback pra regra legal (1% pre-Lei14905 / Taxa Legal pos-Lei14905) apenas se NULL/vazio | Liberdade contratual + fallback legal | operador 2026-05-02 |

## 4. Acceptance criteria (Success Criteria — UAT)

| SC | Critério | Notas |
|---|---|---|
| **SC-1** | Motor event processor síncrono puro implementado em `devedorCalc.js` (substitui 3 loops Art.354 duplicados — L59/L172/L277) | API: `processarEventos(contrato, dividas, eventos, hoje) → { estado, historico }`. Estado intermediário replayable em qualquer ponto t |
| **SC-2** | Índices históricos carregados de `src/data/indicesHistoricos.json`: INPC mensal 2018-2026 + IPCA mensal 2018-2026 + Taxa Legal mensal 08/2024-2026 | Header JSON com data última atualização + fonte (IBGE/BCB SGS) + nota lembrete mensal |
| **SC-3** | Cálculo Principal Corrigido respeita regime intertemporal: INPC até 30/08/2024, IPCA depois | Subperíodos atravessando 30/08/2024 processam em 2 partes |
| **SC-4** | Cálculo Juros respeita regime intertemporal (1% a.m. pre-30/08/2024, Taxa Legal pos-30/08/2024) **E** taxa contratual quando informada (D-pre-14) | Fallback hierarchy: contrato.juros_am_percentual > regra legal por período |
| **SC-5** | Cálculo Multa/Honorários sobre Principal Corrigido (alinha soscalculos) usando `multa_percentual` + `honorarios_percentual` do contrato | NÃO sobre saldo total atualizado |
| **SC-6** | 34 testes `test:regressao` PASS — event processor produz resultados equivalentes aos loops antigos para casos antigos sem regime nova | Snapshot test cumulative pre-refactor (golden masters) |
| **SC-7** | Testes novos `eventProcessor.test.js` cobrindo: regime pre-30/08/2024, regime pos-30/08/2024, transição mid-cálculo, evento art523, taxa contratual override, custa lançada mid-período | ~10-15 cases novos |
| **SC-8** | PDF Demonstrativo atualizado mostrando evolução por etapas (igual estrutura soscalculos: deduções → créditos → consolidado) | `pdfDemonstrativo.js` Step 1.9.c rewrite |
| **SC-9** | UAT comparativo (D-pre-15 reformulado 2026-05-03): TRADIO existente preservado (`ce7b8d47-...`, devedor MENDES E MENDES id=25) — saldo MR pos-refactor vs PDF soscalculos prévio R$ 26.633,88 (Phase 8 captura). **Delta < R$ 1,00** (tolerância proporcional magnitude TRADIO ~R$ 26K, 0,004%). Sub-validação opcional: cenário simples R$ 100 venc 01/04/2026 → ~R$ 100,02 (delta < R$ 0,10, golden Step 0.0). | Sem recadastro sintético — cenário real cobre transição Lei 14.905/24 + pagamentos parciais + multa/honor. Documentar prints comparativos. |
| **SC-10** | Backup Supabase pre-refactor confirmado disponível pra rollback | Pre-flight gate Task 0 — operador valida snapshot antes de iniciar Task 1 |

## 5. Memory feedbacks aplicáveis (pre-execute)

| Feedback | Aplicação Phase 9.1 |
|---|---|
| `feedback_d01_relaxation_protocol` | **Aplicar** — Phase 7.9 precedente. Task isolada + gate diff EXATO + shield específico + commit "D-01 RELAXED" + SUMMARY seção + commitment volta estrito pós-SHIP |
| `feedback_dual_rail_estrategia` (Phase 7.13b) | **Descartado** pra esta phase — D-pre-7 cutover direto (zero clientes prod) |
| `feedback_uat_humano_pega_drifts_app_pdf` (Phase 8) | **Aplicar** — UAT comparativo soscalculos é gate primário (SC-9) |
| `feedback_schema_adapter_long_short_form_consumer_replication` | **Alerta consultivo** — D-pre-10 defer rename. Manter adapter atual durante refactor |
| `feedback_validate_git_add_plans_before_execute_phase` | **Aplicar** — pre-tag check `git status --short .planning/phases/09-1-motor-eventos-tribunal/` |
| `feedback_grep_global_before_pointwise_fix` | **Aplicar nos 3 callsites duplicados Art.354** (L59/L172/L277). Refactor unifica em event processor |
| `feedback_blindagens_integridade_apos_funcionamento` | **Aplicar** — pre-execute walkthrough "tentar quebrar": evento sem data, evento duplicado, contrato sem dívidas, transição 30/08/2024 mid-pagamento, taxa contratual zero, índice histórico ausente |
| `feedback_db_integration_gate_missing` | **Aplicar** — UAT humano essencial; gates automatizados não pegam drift jurisprudencial |
| `feedback_helper_signature_mirror_motor_return_shape` | **Aplicar** — utility `pdfDemonstrativo.js` deve consumir output do event processor sem adapter intermediário |
| `feedback_state_snapshot_must_list_all_phase_commits` | **Aplicar** — Task 5 commit message deve incluir SHA submódulo + SHA pai + tag |
| `feedback_event_processor_pattern_motor_financeiro` (NOVO candidato) | Pós-SHIP — registrar pattern de evolução por eventos como referência pra phases futuras (motor de cálculo financeiro com audit trail jurídico) |

## 6. Risks identificados

| ID | Risco | Probabilidade | Mitigação |
|---|---|---|---|
| **R1** | Refactor motor pode introduzir bugs em casos edge (parcelas com vencimento mid-mês, pagamentos parciais escalonados, art523 pos-pagamento, transição 30/08/2024 mid-pagamento) | Alta | 34 testes `test:regressao` PASS + UAT comparativo soscalculos (SC-9) + snapshot test pré-refactor (golden masters) |
| **R2** | Índices JSON desatualizados podem produzir cálculos errados após N meses sem atualização | Alta | Comment header no JSON com data última atualização + lembrete operador mensal + log warning quando índice mês corrente missing |
| **R3** | Performance com 200 contratos × N pagamentos cada (event processor processa eventos em runtime) | Média | Cache nivel-contrato (Map() in-memory invalidação on-pagamento-novo) + benchmark UAT antes de SHIP |
| **R4** | Schema field name divergence (long DB ↔ short motor) pode confundir durante refactor | Média | Manter adapter atual, NÃO tocar DB names (D-pre-10). Single point of conversion |
| **R5** | Lei 14.905/24 transition (30/08/2024) pode ter casos edge pra contratos com pagamentos atravessando essa data | Baixa | Testes específicos cobrindo período transição (SC-7) + evento `mudanca_regime_lei14905` auto-injetado em 30/08/2024 (D-pre-13) |
| **R6** | Fonte índice ambígua (IPCA-15 vs IPCA pleno; Bacen usa IPCA-15) — operador deve confirmar | Baixa | Documentar fonte EXATA no header JSON: SGS BCB código 433 (INPC) + 4449 (IPCA cheio) OU 7849 (IPCA-15) |

## 7. Audits pré-execute (Sub-passo 2.A)

- **2.A.1**: Snapshot test setup — rodar motor antigo em 5 cenários sintéticos (parcela única, 2 pagamentos, custas, art523, transição 30/08/2024) — salvar outputs como golden masters JSON
- **2.A.2**: Confirmar fonte índices históricos — IBGE INPC SGS BCB código 433 + IPCA SGS BCB código 4449 (IPCA cheio mensal) ou 7849 (IPCA-15)
- **2.A.3**: Validar lista percentuais multa/honorarios em uso prod (campos NULL? defaults? quais contratos teste tem valores reais?)
- **2.A.4**: Backup Supabase: validar que `pg_dump` ou Supabase dashboard backup funciona (smoke test restore opcional)
- **2.A.5**: Audit Lei 14.905/24 — confirmar texto legal e Resolução CMN 5.171/24 (Taxa Legal mensal)
- **2.A.6**: Confirmar que evento `mudanca_regime_lei14905` em 30/08/2024 é injeção automática (não input manual operador)

## 8. Perguntas em aberto (Q-pendentes)

- **Q-1**: Cache estratégia — Memo simples por `contrato_id+last_modified`, ou Redis-style externo?
  - **Recomendação inicial**: `Map()` in-memory durante sessão usuário, invalidação on-pagamento-novo (espelha pattern Phase 7.8.2a `useSaldoAtualizadoCache`). Resolver pré-Task 1.
- **Q-2**: Quando cliente aparecer com pagamento que cruza 30/08/2024 (entrou regime velho, sai regime novo), como dividir?
  - **Recomendação inicial**: motor processa cada subperíodo separadamente, soma resultados. Evento `mudanca_regime_lei14905` em 30/08/2024 quebra subperíodos automaticamente.
- **Q-3**: Snapshot test golden masters — armazenar como JSON em test fixture, ou como código JavaScript pre-computado?
  - **Recomendação inicial**: JSON fixture (`__tests__/fixtures/goldenMasters.json`). Mais editável + versionável.

## 9. Deliverables

| Path | Status | Conteúdo |
|---|---|---|
| `src/utils/devedorCalc.js` | **REFACTORED** (D-01 RELAXED) | Event processor síncrono puro substituindo 3 loops Art.354 |
| `src/data/indicesHistoricos.json` | **NEW** | INPC + IPCA + Taxa Legal mensais com header de fonte/data |
| `src/services/__tests__/eventProcessor.test.js` | **NEW** | ~10-15 cases novos cobrindo regimes intertemporais + casos edge |
| `src/services/__tests__/fixtures/goldenMasters.json` | **NEW** | Snapshot pre-refactor pra cross-check refactor |
| `src/utils/pdfDemonstrativo.js` | **MODIFIED** | Step 1.9.c rewrite — formato evolução por etapas (deduções → créditos → consolidado) |
| `src/components/DetalheContrato.jsx` | **MODIFIED OPCIONAL** | Pode receber UI de "linha do tempo" do contrato (eventos cronológicos) — defer pra Phase 9.2 se complexo |
| `.planning/phases/09-1-motor-eventos-tribunal/09-1-CONTEXT.md` | **THIS FILE** | Contexto e decisões |
| `.planning/phases/09-1-motor-eventos-tribunal/09-1-PLAN.md` | **NEXT** | Plan executável (próximo step) |

## 10. Exit criteria

- ✅ 34 + N novos testes `test:regressao` + `eventProcessor.test.js` PASS
- ✅ SC-1 a SC-10 todos PASS (com prints + audit trail UAT)
- ✅ UAT comparativo soscalculos: TRADIO delta < R$ 1,00 vs PDF prévio R$ 26.633,88 (SC-9, D-pre-15)
- ✅ Tag `v1.5-phase9.1` criada e pushed
- ✅ Comentários `D-01 INTOCADO` em todo codebase atualizados pra `D-01 RELAXED durante 9.1` ou substituídos por nova baseline
- ✅ Memory feedback NOVO criado: `feedback_event_processor_pattern_motor_financeiro` (pattern transferível pra phases futuras)
- ✅ Dados teste apagados pré-refactor (D-pre-9 atualizado): APENAS advair (id=8) deleted. TRADIO (id=25) + ROCHA (id=27) PRESERVADOS por D-pre-15 — UAT real Task 5.1
- ✅ Backup Supabase preservado pelo menos 7 dias pós-SHIP (rollback safety net)

## 11. Status

**PLANNING** 2026-05-02 — CONTEXT.md drafted (este arquivo). Pendente:
1. Sub-passo 2.A audits (5 audits descritos seção 7)
2. `/gsd-plan-phase 9.1` (criar PLAN.md detalhado)
3. Q1-Q3 resolvidas operador
4. Pre-Execute confirmar deletion dados teste

**Severidade ALTA** — refactor motor estrutural com violação intencional de invariante D-01 (cumulative desde Phase 7.8). Pattern espelha Phase 7.13b refactor estrutural Fila — 3 plans atomic + UAT cumulative.

**Não bloqueia v1.5 backlog** — pelo contrário, é phase fundadora da v1.5 (alinha cálculos com padrão tribunal antes de receber contratos reais de clientes).

**Estimativa execute**: ~5-8 horas (3-4 plans atomic). autonomous: false.
