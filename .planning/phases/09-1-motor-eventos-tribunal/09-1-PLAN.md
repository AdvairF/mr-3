---
plan: 09.1-01
phase: 9.1
title: Refactor motor evolução por eventos (tribunal-style)
wave: 1
depends_on: []
autonomous: false
files_modified:
  - src/mr-3/mr-cobrancas/src/utils/devedorCalc.js (REFACTORED — D-01 RELAXED)
  - src/mr-3/mr-cobrancas/src/utils/correcao.js (calcularFatorCorrecao refactor — JSON consumption)
  - src/mr-3/mr-cobrancas/src/utils/pdfDemonstrativo.js (Step 1.9.c rewrite — formato evolução)
  - src/mr-3/mr-cobrancas/package.json (test:regressao script — 8 → 9 test files)
files_created:
  - src/mr-3/mr-cobrancas/src/data/indicesHistoricos.json (NEW — INPC/IPCA-15/Taxa Legal mensais)
  - src/mr-3/mr-cobrancas/src/services/__tests__/eventProcessor.test.js (NEW — 12-15 cases)
  - src/mr-3/mr-cobrancas/src/services/__tests__/fixtures/goldenMasters.json (NEW — snapshot pre-refactor)
  - src/mr-3/mr-cobrancas/scripts/fetch-indices.js (NEW — BCB SGS API consumer + fórmula CMN 5.171/24)
files_preserved:
  - src/mr-3/mr-cobrancas/src/services/pagamentos.js (calcularSaldoPorDividaIndividual — wrapper preservado, refactor interno)
  - src/mr-3/mr-cobrancas/src/services/dividas.js (D-01 cumulative pre-9.1)
  - src/mr-3/mr-cobrancas/src/utils/masks.js (D-01 cumulative pre-9.1)
  - schema banco (D-pre-10 schema rename DEFERRED)
requirements: []
tags:
  - refactor-motor
  - d01-relaxed
  - milestone-v1.5-opener
  - tribunal-style
  - lei-14905-24
---

# Plan 09.1-01: Refactor motor evolução por eventos (tribunal-style)

<objective>
Substituir motor monolítico atual (`devedorCalc.js calcularDetalheEncargos` com 3 loops Art.354 duplicados em L59/L172/L277) por **event processor síncrono puro tribunal-style**, alinhando 100% com referência **soscalculos** e aderindo à **Lei 14.905/24** (regime intertemporal taxa legal vigente 30/08/2024). Motor novo expõe API `processarEventos(contrato, dividas, eventos, hoje) → { estado, historico }` — determinístico, replayable, debugável (audit trail jurídico). Custas + multa + honorários calculados sobre **Principal Corrigido apenas** (D-pre-4). Índices INPC/IPCA-15/Taxa Legal carregados de `src/data/indicesHistoricos.json` populado automaticamente via **BCB SGS API** (séries 433 INPC, 7849 IPCA-15, 29541+29542 componentes Taxa Legal). Taxa Legal calculada conforme fórmula oficial **Resolução CMN 5.171/24**: `TL_m = Max[(Fator Selic_m / Fator IPCA-15_m) - 1; 0] × 100 (%)` — NÃO é soma simples (operador validou pós-revisão PLAN, 2026-05-02). PDF Demonstrativo reescrito com formato evolução por etapas (deduções → créditos → consolidado). **Constraints invioláveis**: D-01 RELAXED escopo Phase 9.1 apenas (volta estrito pós-SHIP), Schema INTOCADO (D-pre-10 defer), autonomous false (UAT comparativo soscalculos é gate jurídico SC-9 obrigatório), ZERO push até SC-9 PASS. Janela ideal — sistema vazio (zero clientes prod), Phase 8 SHIPPED 2026-05-02 fechou v1.4. Phase 9.1 abre v1.5.
</objective>

<must_haves>
truths:
  - "Event processor síncrono puro implementado (substitui 3 loops Art.354 duplicados — devedorCalc.js L59/L172/L277)"
  - "API: processarEventos(contrato, dividas, eventos, hoje) → { estado, historico } — determinístico + replayable"
  - "5 tipos de eventos canônicos: vencimento_parcela, pagamento, custa_lancada, mudanca_regime_lei14905 (auto-injetado 30/08/2024), aplicacao_art523"
  - "Estado intermediário: { saldoPrincipal, saldoCorrigido, saldoJuros, saldoMulta, saldoHonor, saldoCustas, totalPago, ultimoEvento }"
  - "Histórico: array { evento, estadoAntes, estadoApos } — audit trail jurídico"
  - "Lei 14.905/24 regime intertemporal automático: INPC+1% pre-30/08/2024, IPCA+Taxa Legal pos-30/08/2024"
  - "Multa e honorários sobre Principal Corrigido APENAS (D-pre-4 — alinha 100% soscalculos)"
  - "Taxa juros contratual respeitada (juros_am_percentual quando preenchido, fallback regra legal)"
  - "Índices INPC/IPCA/Taxa Legal mensais carregados de src/data/indicesHistoricos.json (header + fonte + lembrete atualização)"
  - "JSON populado via BCB SGS API automatizada (códigos 433 INPC, 7849 IPCA-15, 29541+29542 componentes Taxa Legal) — fetch script reproduzível"
  - "Taxa Legal calculada conforme fórmula oficial Resolução CMN 5.171/24: TL_m = Max[(Fator Selic_m / Fator IPCA-15_m) - 1; 0] × 100 (%) — NÃO é soma simples Selic+IPCA"
  - "PDF Demonstrativo Step 1.9.c reescrito formato evolução: deduções → créditos → consolidado (espelha soscalculos)"
  - "Backup Supabase pré-refactor preservado pelo menos 7 dias (rollback safety net)"
  - "Dados teste apagados pré-refactor (TRADIO ce7b8d47 + ROCHA FASHION 335a2ad2 + advair devedor id=8)"
  - "9 test files em test:regressao (era 8): + eventProcessor.test.js — 35+ tests PASS"
  - "UAT comparativo soscalculos (SC-9): delta saldo < R$ 0,10 — gate jurídico obrigatório"
  - "D-01 RELAXED escopo Phase 9.1 APENAS: motor refactored vira nova baseline INTOCADO pós-SHIP"
  - "Schema INTOCADO (D-pre-10 rename long↔short DEFERRED v1.6)"

artifacts:
  - path: "src/mr-3/mr-cobrancas/src/utils/devedorCalc.js"
    provides: "REFACTORED — event processor síncrono puro substituindo 3 loops Art.354. ~600-900 linhas final (era 868). Comments D-01 RELAXED nos headers das funções refactored. Signatures externas preservadas (compat callsites)"
  - path: "src/mr-3/mr-cobrancas/src/data/indicesHistoricos.json"
    provides: "NEW — INPC + IPCA + Taxa Legal mensais (2018-2026 cumulative). Header com ultimaAtualizacao + fonte BCB SGS + códigos + lembrete operador mensal"
  - path: "src/mr-3/mr-cobrancas/src/services/__tests__/eventProcessor.test.js"
    provides: "NEW — 12-15 cases cobrindo regime pre/pos-Lei14905, transição mid, art523, taxa contratual override, custa lançada mid-período, casos error (evento sem data, duplicado), JSON índice missing"
  - path: "src/mr-3/mr-cobrancas/src/services/__tests__/fixtures/goldenMasters.json"
    provides: "NEW — snapshot output motor antigo em 5 cenários sintéticos pre-Lei14905 (smoke estrutural, não fonte verdade jurídica — soscalculos é gold real)"
  - path: "src/mr-3/mr-cobrancas/src/utils/correcao.js"
    provides: "MODIFIED — calcularFatorCorrecao refactor pra ler de indicesHistoricos.json em vez de hardcoded. Signature preservada"
  - path: "src/mr-3/mr-cobrancas/src/utils/pdfDemonstrativo.js"
    provides: "MODIFIED — Step 1.9.c rewrite formato evolução tribunal (deduções → créditos → consolidado) + seção opcional linha do tempo eventos"
  - path: "src/mr-3/mr-cobrancas/package.json"
    provides: "MODIFIED — test:regressao script atualizado (8 → 9 test files; + eventProcessor.test.js)"
  - "1 commit feat submódulo: feat(09.1): event processor refactor + JSON índices BCB + PDF evolução"
  - "1 commit chore bump pai: chore(09.1): bump submódulo <SHA> + remove dados teste + Phase 9.1 SHIPPED"
  - "1 tag v1.5-phase9.1 no commit chore bump pai (TAG TARGET) — abre milestone v1.5"
  - "Backup Supabase preservado >= 7 dias pós-SHIP"
  - "Memory feedback NOVO: feedback_event_processor_pattern_motor_financeiro"
</must_haves>

<context>

## D-pre lockeds (cópia ID-only do CONTEXT.md — referência canônica)

Source of truth: `.planning/phases/09-1-motor-eventos-tribunal/09-1-CONTEXT.md` Section 3.

| ID | Resumo | Aplicação Plan 09.1-01 |
|---|---|---|
| **D-pre-1** | Modelo evolução por eventos (substitui 3 loops Art.354) | Task 1 — refactor estrutural devedorCalc.js |
| **D-pre-2** | Lei 14.905/24 regime intertemporal automático (30/08/2024) | Task 1.3 — auto-injetar mudanca_regime_lei14905 |
| **D-pre-3** | Índices nacionais INPC/IPCA (cobertura 80%) | Task 2 — JSON nacional uniforme |
| **D-pre-4** | Multa/honorários sobre Principal Corrigido APENAS | Task 1 — event processor aplica regra |
| **D-pre-5** | Juros simples Taxa Legal | Task 1 — regra simples não composta |
| **D-pre-6** | Storage índices JSON hardcoded | Task 2.1 — estrutura + Task 2.2 BCB SGS API |
| **D-pre-7** | Cutover direto (sem dual-rail) | Task 1.4 — substitui loops in-place |
| **D-pre-8** | D-01 RELAXED escopo Phase 9.1 APENAS | Task 1.6 — comments headers + commit message |
| **D-pre-9** | Apagar dados teste pré-refactor | Task 0.2 — SQL DELETE TRADIO+ROCHA+advair |
| **D-pre-10** | Schema rename long↔short DEFERRED v1.6 | NÃO toca DB names |
| **D-pre-11** | Backup Supabase obrigatório | Task 0.1 pre-flight gate |
| **D-pre-12** | Event processor síncrono puro | Task 1.2 — sem side-effects + replayable |
| **D-pre-13** | 5 tipos eventos canônicos | Task 1.1 — definir + Task 4 testar todos |
| **D-pre-14** | Taxa contratual respeitada (fallback regra legal) | Task 1 — hierarchy contrato.juros_am_percentual > regra |

## Q-pendentes resolvidas (CONTEXT seção 8)

- **Q-1 ACEITA**: Cache Map() in-memory invalidação on-pagamento-novo (espelha Phase 7.8.2a useSaldoAtualizadoCache)
- **Q-2 ACEITA**: Pagamento que cruza 30/08/2024 — motor processa subperíodos separados, evento mudanca_regime_lei14905 quebra automaticamente
- **Q-3 ACEITA**: Snapshot test golden masters como JSON fixture (__tests__/fixtures/goldenMasters.json) — editável + versionável

## Memory feedbacks aplicáveis (11 — pre-execute)

Source of truth: `.planning/phases/09-1-motor-eventos-tribunal/09-1-CONTEXT.md` Section 5.

1. `feedback_d01_relaxation_protocol` — APLICAR (Phase 7.9 precedente)
2. `feedback_dual_rail_estrategia` (7.13b) — DESCARTADO (cutover direto D-pre-7)
3. `feedback_uat_humano_pega_drifts_app_pdf` — APLICAR (UAT comparativo soscalculos é gate primário SC-9)
4. `feedback_schema_adapter_long_short_form_consumer_replication` — alerta consultivo (D-pre-10 defer)
5. `feedback_validate_git_add_plans_before_execute_phase` — APLICAR (pre-tag check)
6. `feedback_grep_global_before_pointwise_fix` — APLICAR nos 3 callsites duplicados Art.354
7. `feedback_blindagens_integridade_apos_funcionamento` — APLICAR (walkthrough "tentar quebrar")
8. `feedback_db_integration_gate_missing` — APLICAR (UAT humano essencial)
9. `feedback_helper_signature_mirror_motor_return_shape` — APLICAR (PDF consume sem adapter intermediário)
10. `feedback_state_snapshot_must_list_all_phase_commits` — APLICAR (Task 5 commit message)
11. `feedback_event_processor_pattern_motor_financeiro` — NOVO pós-SHIP

## Risks (6 — mitigações concretas)

Source of truth: `.planning/phases/09-1-motor-eventos-tribunal/09-1-CONTEXT.md` Section 6.

| ID | Risco | Mitigação Plan 09.1-01 |
|---|---|---|
| R1 | Bugs edge refactor | Task 0.4 golden masters + Task 4 35+ tests + Task 5 UAT comparativo SC-9 |
| R2 | Índices desatualizados | Task 2.1 header JSON + Task 2.3 fallback warning |
| R3 | Performance 200 contratos | Q1 ACEITA Map() cache + Task 5 benchmark UAT |
| R4 | Schema divergence | D-pre-10 DEFERRED — adapter atual preservado |
| R5 | Lei 14.905 transição | Task 1.3 evento auto-injetado + Task 4 tests transição |
| R6 | Fonte índice ambígua | Task 2.1 header com SGS BCB código exato (433/4449/29541+29542) |

## Invariantes invioláveis

- **D-01 RELAXED ESCOPO PHASE 9.1 APENAS** — motor INTOCADO cumulative desde Phase 7.8 explicitamente violado nesta phase. Pós-SHIP, motor refactored vira nova baseline INTOCADO. Pattern espelha Phase 7.9 D-pre-rename (`feedback_d01_relaxation_protocol`).
- **D-13 CSS print preservada** — ZERO `@media print` no app principal. Pattern A jsPDF não dispara CSS print. Trivialmente preservado pelo refactor.
- **Schema INTOCADO** — zero Migration nova (D-pre-10). Adapter long↔short form preservado.
- **autonomous: false** — UAT comparativo soscalculos obrigatório (SC-9). PAUSAs explícitas em Tasks-críticas.
- **ZERO commit/tag/push** até SC-9 PASS REAL (operador autoriza Task 5).
- **Backup Supabase >= 7 dias** pós-SHIP — rollback safety net.

## Bandeiras resolvidas

- **Bandeira 1 (BCB SGS API)**: AUTORIZADA — Task 2.2 fetch automatizado séries 433/4449/29541+29542 sem credenciais (API pública)
- **Bandeira 3 (conta soscalculos)**: AUTORIZADA — operador usa conta gratuita durante Execute (uma vez, não rotina)

</context>

## Tasks

---

### Task 0 — Pre-flight gates

**Esforço estimado**: ~45min

**Pre-conditions**:
- Phase 8 SHIPPED 2026-05-02 (tag v1.4-phase8 confirmada)
- CONTEXT 9.1 commitado (`34866aa`)
- Submódulo HEAD: `94040d6` (sync remote)
- Pai HEAD: `34866aa` (sync remote, post CONTEXT 9.1)
- Acesso Supabase dashboard (operador)
- Acesso conta gratuita soscalculos (operador)

**Steps**:

#### Step 0.0 — SMOKE TEST SOSCALCULOS (NEW por AJUSTE-1)

- Operador abre soscalculos com conta gratuita
- Tenta criar 1 cálculo bobo (ex: dívida R$ 1.000, sem pagamento, vencimento hoje-30 dias)
- Gera PDF + baixa
- **Must have**: tela "criar cálculo" abre OK + 1 cálculo gerado + PDF baixado
- **Fail action**: ABORT Task 1+ até alternativa SC-9 definida (ex: outro tribunal-style: cobranças.adv.br, ou cálculo manual via Excel)

#### Step 0.1 — Backup Supabase

- Operador acessa Supabase dashboard → Database → Backups
- Tira snapshot manual OU confirma scheduled backup ativo
- **Must have**: backup file existe OU snapshot ID anotado (operador anota no chat)
- **Critical**: backup deve preservar pelo menos 7 dias pós-SHIP (rollback safety net)

#### Step 0.2 — Apagar dados teste via SQL DELETE

##### Step 0.2.0 — SELECT DISCOVERY (obrigatório antes do DELETE)

Antes de qualquer DELETE, descobrir devedor_ids reais e validar visualmente que não há cross-hit em conta operador:

```sql
-- Discovery 1: devedor_id de cada contrato teste
SELECT id, devedor_id
FROM contratos_dividas
WHERE id IN (
  'ce7b8d47-e93a-42ed-a909-e5038baf3411',  -- TRADIO
  '335a2ad2-9481-4836-a88a-55fbe6375827'   -- ROCHA FASHION
);
-- Anotar TRADIO_devedor_id e ROCHA_devedor_id resultantes.

-- Discovery 2: validar nomes dos 3 devedores teste
SELECT id, nome
FROM devedores
WHERE id IN (
  /* TRADIO_devedor_id (do Discovery 1) */,
  /* ROCHA_devedor_id (do Discovery 1) */,
  8  -- advair test
);
-- Esperado visualmente: 3 rows (TRADIO + ROCHA FASHION + advair).
-- ABORT GATE: se id=8 NÃO for "advair" ou similar (é a conta de login do operador), PARAR e investigar
-- antes de qualquer DELETE. Operador valida via leitura humana dos 3 nomes retornados.

-- Discovery 3 (opcional): outros contratos órfãos
SELECT id, devedor_id, nome_documento
FROM contratos_dividas
WHERE devedor_id IN (TRADIO_id, ROCHA_id, 8);
-- Garante que DELETEs subsequentes capturam tudo.
```

**Operador cola resultados Discovery 1+2 no chat antes de prosseguir.** Sub-IDs reais substituem placeholders abaixo.

##### Step 0.2.1 — DELETE statements (com IDs reais do Discovery)

```sql
-- IDs dos devedores teste a apagar
-- TRADIO devedor: descobrir via SELECT id FROM devedores WHERE nome ILIKE '%TRADIO%' OR ...
-- ROCHA FASHION devedor: descobrir via contrato_id 335a2ad2-...
-- advair devedor: id=8 (devedor de teste do operador)

-- Step 1: pagamentos_divida (FK pra dividas)
DELETE FROM pagamentos_divida 
WHERE divida_id IN (
  SELECT id FROM dividas WHERE devedor_id IN (8, /* TRADIO devedor_id */, /* ROCHA devedor_id */)
);

-- Step 2: devedores_dividas (junction Phase 7.13)
DELETE FROM devedores_dividas 
WHERE devedor_id IN (8, /* TRADIO devedor_id */, /* ROCHA devedor_id */);

-- Step 3: contratos_dividas (header)
DELETE FROM contratos_dividas 
WHERE id IN ('ce7b8d47-e93a-42ed-a909-e5038baf3411', '335a2ad2-9481-4836-a88a-55fbe6375827', /* outros se houver */);

-- Step 4: dividas
DELETE FROM dividas 
WHERE devedor_id IN (8, /* TRADIO devedor_id */, /* ROCHA devedor_id */);

-- Step 5: eventos_andamento (Phase 7.13b)
DELETE FROM eventos_andamento 
WHERE contrato_id IN ('ce7b8d47-...', '335a2ad2-...', /* outros */)
   OR devedor_id IN (8, ...);

-- Step 6: fila_cobranca (Phase 7.13b)
DELETE FROM fila_cobranca 
WHERE contrato_id IN ('ce7b8d47-...', '335a2ad2-...', /* outros */);

-- Step 7: devedores (último — todos os outros já foram cleaned)
-- ATENÇÃO: NÃO apagar devedor que é a conta de login do operador
DELETE FROM devedores WHERE id IN (8, /* TRADIO devedor_id */, /* ROCHA devedor_id */);
```

- **Must have**: `SELECT count(*) FROM devedores WHERE nome ILIKE '%advair%' OR ...` = 0
- **Must have**: `SELECT count(*) FROM contratos_dividas` = 0 (ou apenas contratos legítimos do operador)

#### Step 0.3 — Audits 2.A.1..2.A.6 (read-only)

- **2.A.1**: Confirmar SGS BCB códigos via fetch teste:
  ```bash
  curl "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2025&dataFinal=01/02/2025"
  curl "https://api.bcb.gov.br/dados/serie/bcdata.sgs.4449/dados?formato=json&dataInicial=01/01/2025&dataFinal=01/02/2025"
  curl "https://api.bcb.gov.br/dados/serie/bcdata.sgs.29541/dados?formato=json&dataInicial=01/09/2024&dataFinal=01/10/2024"
  ```
  Esperado: JSON com pelo menos 1 valor por série
- **2.A.2**: Validar fonte CMN 5.171/24 (texto Resolução BCB) — operador confirma URL oficial
- **2.A.3**: Schema fields confirmados (audit pré-CONTEXT já validou): `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`, `indice_correcao`, `juros_tipo`, `art523_opcao`
- **2.A.4**: Backup Supabase smoke restore (opcional) — operador confirma arquivo existe + tamanho > 0
- **2.A.5**: Validar timestamp 30/08/2024 00:00 BRT (= 30/08/2024 03:00 UTC) — usar `Date.parse('2024-08-30T00:00:00-03:00')` consistente em todo motor
- **2.A.6**: Confirmar 5 tipos eventos cobrem 100% fluxos atuais — walkthrough mental + grep callers de calcularDetalheEncargos

#### Step 0.4 — Setup snapshot test golden masters (smoke estrutural — não jurídico)

**AJUSTE-2 explícito**: golden masters são smoke test ESTRUTURAL (detectar regressão em casos pre-Lei14905 onde motor velho era aceitável). NÃO são fonte de verdade jurídica — SC-9 soscalculos é gold real.

- Antes de qualquer modificação em devedorCalc.js
- Criar 5 cenários sintéticos pre-Lei14905 (datas <= 29/08/2024)
- Rodar motor antigo (calcularDetalheEncargos + calcularSaldosPorDivida + calcularTotalPagoPorDivida)
- Capturar outputs como JSON em `src/services/__tests__/fixtures/goldenMasters.json`

Cenários propostos:
1. Vencimento simples (1 parcela R$ 1.000, vencimento 01/06/2024, hoje 31/07/2024, sem pagamento)
2. 1 pagamento parcial pre-Lei14905 (parcela R$ 1.000, vence 01/06/2024, pagamento R$ 500 em 15/07/2024, hoje 29/08/2024)
3. Custa lançada (parcela + custa avulsa pre-Lei14905)
4. Art523 aplicado (parcela quitada com art523_opcao=multa_honorarios)
5. Multi-parcelas Art.354 sequencial (3 parcelas + 2 pagamentos cronológicos pre-Lei14905)

**Post-conditions**:
- Step 0.0 PASS (smoke soscalculos OK)
- Step 0.1 PASS (backup Supabase confirmado)
- Step 0.2 PASS (DB limpo: 0 dados teste)
- Step 0.3 PASS (audits 2.A.1-6 verde)
- Step 0.4 PASS (goldenMasters.json existe com 5 cenários pre-Lei14905)

---

### Task 1 — Event processor refactor (devedorCalc.js)

**Esforço estimado**: ~2-3h

**Pre-conditions**:
- Task 0 PASS
- Backup Supabase ativo
- goldenMasters.json existe (Task 0.4)
- Working tree submódulo limpo (apenas staging Task 1)

**Steps**:

#### Step 1.1 — Definir 5 event types (JSDoc — sem TS)

```js
/**
 * @typedef {Object} EventoFinanceiro
 * @property {('vencimento_parcela'|'pagamento'|'custa_lancada'|'mudanca_regime_lei14905'|'aplicacao_art523')} tipo
 * @property {string} data — "YYYY-MM-DD"
 * @property {Object} payload — payload depende do tipo (ver abaixo)
 *
 * Payload por tipo:
 * - vencimento_parcela: { dividaId, valorOriginal, dataVencimento }
 * - pagamento: { dividaId, valor, dataRecebimento }
 * - custa_lancada: { custaId, valor, dataDespesa, descricao }
 * - mudanca_regime_lei14905: { } — auto-injetado em 2024-08-30
 * - aplicacao_art523: { dividaId, opcao: 'so_multa'|'multa_honorarios' }
 */
```

#### Step 1.2 — Implementar `processarEventos(contrato, dividas, eventos, hoje)`

```js
/**
 * Event processor síncrono puro.
 * D-pre-12: determinístico + replayable + debugável.
 *
 * @param {Object} contrato — header do contrato (juros_am_percentual, multa_percentual, etc.)
 * @param {Array} dividas — parcelas do contrato
 * @param {Array<EventoFinanceiro>} eventos — eventos cronologicamente ordenados
 * @param {string} hoje — "YYYY-MM-DD"
 * @returns {{ estado: EstadoFinal, historico: Array<EntradaHistorico> }}
 */
export function processarEventos(contrato, dividas, eventos, hoje) {
  // 1. Validate inputs (evento sem data → throw, evento duplicado → throw)
  // 2. Auto-injetar mudanca_regime_lei14905 em 2024-08-30 se range cruza (D-pre-2)
  // 3. Sort eventos por data ASC, tipo (vencimento antes de pagamento se mesma data)
  // 4. Init estado:
  //    { saldoPrincipal: 0, saldoCorrigido: 0, saldoJuros: 0, saldoMulta: 0,
  //      saldoHonor: 0, saldoCustas: 0, totalPago: 0, ultimoEvento: null, regime: 'pre_lei14905' }
  // 5. Loop eventos:
  //    - Calcular subperíodo (ultimoEvento → evento atual)
  //    - Aplicar correção monetária subperíodo (INPC pre-Lei14905, IPCA pos-Lei14905) sobre saldoPrincipal
  //    - Aplicar juros subperíodo (1% a.m. pre, Taxa Legal pos, OU contrato.juros_am_percentual se preenchido — D-pre-14)
  //    - Aplicar evento ao estado (despacho por tipo)
  //    - Push entrada histórico { evento, estadoAntes, estadoApos }
  // 6. Aplicar correção+juros do ultimo evento até hoje (saldo final)
  // 7. Return { estado, historico }
}
```

#### Step 1.3 — Auto-injetar evento mudanca_regime_lei14905

- Antes do loop em Step 1.2
- Se `min(eventos.data) <= '2024-08-29'` AND `max(eventos.data) >= '2024-08-30'` (range cruza)
- Inject `{ tipo: 'mudanca_regime_lei14905', data: '2024-08-30', payload: {} }`
- Re-sort eventos cronologicamente

#### Step 1.4 — Substituir 3 loops Art.354 duplicados

- `calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje)` (L59) → wrapper sobre processarEventos retornando `estado.saldoPrincipal + saldoCorrigido + saldoJuros + saldoMulta + saldoHonor - totalPago`
- `calcularSaldosPorDivida(devedor, pagamentos, hoje)` (L172) → wrapper retornando map por dividaId via filter de eventos
- `calcularTotalPagoPorDivida(devedor, pagamentos, hoje)` (L277) → wrapper retornando map de absorbed via filter

**Signatures externas preservadas** (compat callsites). Refactor interno apenas.

#### Step 1.5 — Atualizar `calcularDetalheEncargos` (L365) e `calcularDetalheEncargosContrato` (L849)

- Passar pra usar `processarEventos` internamente
- Shape de retorno preservado (não quebrar UI/PDF compat)
- Aplicar D-pre-4: multa = principalCorrigido × multaPercentual; honorários = principalCorrigido × honorariosPercentual

#### Step 1.6 — Comments D-01 RELAXED nos headers

```js
/**
 * Phase 9.1 — D-01 RELAXED escopo Phase 9.1 APENAS.
 * Motor refactored vira nova baseline INTOCADO pós-SHIP.
 * Pattern: feedback_d01_relaxation_protocol (Phase 7.9 precedente).
 * ...
 */
```

Adicionar em headers de:
- `processarEventos` (NEW)
- `calcularSaldoDevedorAtualizado` (REFACTORED)
- `calcularSaldosPorDivida` (REFACTORED)
- `calcularTotalPagoPorDivida` (REFACTORED)
- `calcularDetalheEncargos` (REFACTORED)
- `calcularDetalheEncargosContrato` (REFACTORED)

#### Step 1.7 — Build PASS + 34 test:regressao PASS

```bash
cd src/mr-3/mr-cobrancas
npm run build
```

**Esperado**: build PASS + prebuild test:regressao 34/34 PASS.

**Se quebrar**: investigar quais tests quebram. Permitido se:
- Caso pos-Lei14905 quebra (motor antigo errado, novo correto)
- Permutação de Art.354 detectada como mudança numérica não-jurídica

**NÃO permitido**:
- Build erro de syntax
- Tests pre-Lei14905 quebram (golden masters Task 0.4 são âncora)

**Post-conditions**:
- `processarEventos` exportado em devedorCalc.js
- 6 funções refactored com comments D-01 RELAXED
- Build PASS
- test:regressao 34/34 PASS (ou divergência justificada documentada)

---

### Task 2 — Índices históricos JSON + helpers (BCB SGS API)

**Esforço estimado**: ~1.5h

**Pre-conditions**:
- Task 1 PASS
- Internet ativa (BCB SGS API pública)

**Steps**:

#### Step 2.1 — Estrutura JSON src/data/indicesHistoricos.json

```json
{
  "header": {
    "ultimaAtualizacao": "2026-05-02",
    "fonte": "BCB SGS API (api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados)",
    "codigos": {
      "INPC": 433,
      "IPCA": 4449,
      "TaxaLegal_componente1": 29541,
      "TaxaLegal_componente2": 29542
    },
    "lembreteOperador": "Atualizar mensalmente — rodar npm run fetch-indices na primeira semana de cada mês"
  },
  "INPC": {
    "2018-01": 0.23,
    "2018-02": 0.18,
    "...": "...",
    "2026-04": 0.43
  },
  "IPCA": {
    "2018-01": 0.32,
    "...": "...",
    "2026-04": 0.50
  },
  "TaxaLegal": {
    "2024-08": 0.834880,
    "2024-09": 0.78,
    "...": "...",
    "2026-04": 0.55
  }
}
```

Valores são percentuais mensais (ex: 0.43 = 0.43%/mês).

#### Step 2.2 — Script fetch-indices.js (BCB SGS API automatizada)

**Abordagem (CORRIGIDA — operador validou fórmula 2026-05-02 via PDF Resolução CMN 5.171/24)**:

Consumir séries SGS BCB:
- **INPC**: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json` (variação % mensal)
- **IPCA-15**: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.7849/dados?formato=json` (variação % mensal — **não usar 4449 IPCA cheio**, fórmula CMN exige IPCA-15)
- **Fator Selic mensal**: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.29541/dados?formato=json` (já contém produtório diários do mês)
- **Fator IPCA-15 mensal**: `GET https://api.bcb.gov.br/dados/serie/bcdata.sgs.29542/dados?formato=json`

Estratégia Taxa Legal:
- **Tentativa 1**: buscar série Taxa Legal direta no SGS (verificar código exato no portal BCB; candidatos: 0190 ou similar). Se existir e estiver atualizada, usar valor já divulgado.
- **Tentativa 2 (fallback)**: calcular Taxa Legal localmente conforme **Resolução CMN 5.171/24**:
  ```
  TL_m = Max [ (Fator Selic_m / Fator IPCA-15_m) - 1 ; 0 ] × 100  (% mensal)
  ```
  Onde:
  - `Fator Selic_m` = série SGS 29541 (mês anterior, 8 casas decimais)
  - `Fator IPCA-15_m` = série SGS 29542 (mês anterior, 4 casas decimais)
  - Floor zero quando IPCA-15 supera Selic (Art. 6º Resolução)
  - Regime juros simples (não composto)
  - Pro rata por dias corridos quando subperíodo < 1 mês completo
  - Resultado expresso em % mensal com 6 casas decimais

Período de cobertura:
- INPC, IPCA-15, Fator Selic, Fator IPCA-15: 01/2018 → mês corrente
- Taxa Legal calculada/buscada: 08/2024 → mês corrente (pós-vigência Lei 14.905/24)

Header JSON output: `{ ultimaAtualizacao, fonte: 'BCB SGS', codigos: { INPC: 433, IPCA15: 7849, FatorSelic: 29541, FatorIPCA: 29542, TaxaLegal_serie_direta_OPCIONAL }, formula_taxa_legal: 'TL_m = Max[(Fator Selic_m / Fator IPCA-15_m) - 1; 0] × 100 — Resolução CMN 5.171/24', lembreteOperador }`.

Script `scripts/fetch-indices.js` (NEW):

```js
import fs from 'fs';

const SERIES = {
  INPC: 433,
  IPCA15: 7849,
  FatorSelic: 29541,
  FatorIPCA15: 29542,
  // TaxaLegalDireta: <CODIGO_VERIFICAR_NO_PORTAL_BCB> — opcional Tentativa 1
};

const DATA_INICIAL = '01/01/2018';
const DATA_FINAL = new Date().toLocaleDateString('pt-BR');

async function fetchSerie(codigo) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=${DATA_INICIAL}&dataFinal=${DATA_FINAL}`;
  const tentativas = 3;
  for (let i = 0; i < tentativas; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === tentativas - 1) throw e;
      await new Promise(res => setTimeout(res, 2000));
    }
  }
}

function agregarMensal(dadosDiarios) {
  // BCB SGS retorna [{data: "DD/MM/YYYY", valor: "0.43"}] — séries 433/7849 já mensais;
  // séries 29541/29542 são fatores mensais (produtório diário já consolidado pelo BCB)
  const mensal = {};
  for (const ponto of dadosDiarios) {
    const [d, m, y] = ponto.data.split('/');
    const chave = `${y}-${m}`;
    mensal[chave] = parseFloat(ponto.valor);
  }
  return mensal;
}

async function main() {
  const inpc = agregarMensal(await fetchSerie(SERIES.INPC));
  const ipca15 = agregarMensal(await fetchSerie(SERIES.IPCA15));
  const fatorSelic = agregarMensal(await fetchSerie(SERIES.FatorSelic));
  const fatorIPCA15 = agregarMensal(await fetchSerie(SERIES.FatorIPCA15));

  // Taxa Legal conforme Resolução CMN 5.171/24 (operador validou 2026-05-02):
  // TL_m = Max [ (Fator Selic_m / Fator IPCA-15_m) - 1 ; 0 ] × 100  (% mensal, 6 casas)
  // Floor zero quando IPCA-15 supera Selic (Art. 6º).
  const taxaLegal = {};
  for (const k of Object.keys(fatorSelic)) {
    if (fatorIPCA15[k] == null || fatorIPCA15[k] === 0) continue;  // skip se ausente/zero (evita div0)
    const razao = fatorSelic[k] / fatorIPCA15[k];
    const tl = Math.max(razao - 1, 0) * 100;
    taxaLegal[k] = parseFloat(tl.toFixed(6));  // 6 casas decimais conforme Resolução
  }

  const json = {
    header: {
      ultimaAtualizacao: new Date().toISOString().slice(0, 10),
      fonte: 'BCB SGS API (api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados)',
      codigos: { INPC: 433, IPCA15: 7849, FatorSelic: 29541, FatorIPCA15: 29542 },
      formula_taxa_legal: 'TL_m = Max[(Fator Selic_m / Fator IPCA-15_m) - 1; 0] × 100 — Resolução CMN 5.171/24, Art. 6º',
      lembreteOperador: 'Atualizar mensalmente — rodar npm run fetch-indices na primeira semana de cada mês',
    },
    INPC: inpc,
    IPCA15: ipca15,
    TaxaLegal: taxaLegal,
  };

  fs.writeFileSync('src/data/indicesHistoricos.json', JSON.stringify(json, null, 2));
  console.log(`✅ Atualizado src/data/indicesHistoricos.json — INPC ${Object.keys(inpc).length}m, IPCA-15 ${Object.keys(ipca15).length}m, TaxaLegal ${Object.keys(taxaLegal).length}m (CMN 5.171/24)`);
}

main().catch(e => { console.error(e); process.exit(1); });
```

Adicionar em `package.json`:
```json
"scripts": {
  "fetch-indices": "node scripts/fetch-indices.js"
}
```

Rodar 1x agora pra popular JSON.

#### Step 2.3 — Helper lerIndice(tipo, mes, ano)

**Comportamento missing**: throw early (D — pattern jurídico não aceita extrapolação silenciosa nem fallback null que gera NaN no motor). Operador é alertado pra rodar `npm run fetch-indices`.

```js
import indices from '../data/indicesHistoricos.json' assert { type: 'json' };

export function lerIndice(tipo, mes, ano) {
  const chave = `${ano}-${String(mes).padStart(2, '0')}`;
  const valor = indices[tipo]?.[chave];

  if (valor === undefined || valor === null) {
    // Throw early — pattern jurídico não aceita extrapolação silenciosa.
    // Motor para com mensagem clara; operador atualiza JSON via fetch-indices.
    throw new Error(
      `Índice ${tipo} para ${chave} não disponível em indicesHistoricos.json. ` +
      `Atualize via 'npm run fetch-indices' ou aguarde divulgação BCB SGS para esse mês.`
    );
  }
  return valor;
}
```

Tipos válidos (`tipo` argumento): `'INPC'`, `'IPCA15'`, `'TaxaLegal'`. Outros tipos → throw genérico (key undefined).

#### Step 2.4 — Substituir calcularFatorCorrecao em correcao.js

Refactor interno pra ler de `lerIndice()` em vez de hardcoded. Signature preservada.

**Post-conditions**:
- src/data/indicesHistoricos.json populado (INPC + IPCA + TaxaLegal mensais 2018-2026)
- scripts/fetch-indices.js executável + reproduzível
- lerIndice() helper disponível em correcao.js (ou utils/indices.js novo)
- calcularFatorCorrecao refactored sem quebra de signature

---

### Task 3 — PDF Demonstrativo formato evolução

**Esforço estimado**: ~1-1.5h

**Pre-conditions**:
- Task 1 + Task 2 PASS

**Steps**:

#### Step 3.1 — Step 1.9.c rewrite formato evolução tribunal

Substituir Resumo Financeiro atual (11 bullets) por 3 seções:

```
SEÇÃO 1 — DEDUÇÕES (pagamentos cronológicos)
  | Data | Valor Pago | Imputação |
  
SEÇÃO 2 — CRÉDITOS (parcelas + correção + juros + multa + honorários)
  | Componente | Período | Valor |
  - Principal corrigido por subperíodo (regime pre/pos-Lei14905)
  - Juros por subperíodo
  - Multa sobre Principal Corrigido (D-pre-4)
  - Honorários sobre Principal Corrigido (D-pre-4)
  - Custas atualizadas
  
SEÇÃO 3 — CONSOLIDADO (resumo final em data t)
  | Componente | Valor |
  | (=) Total Atualizado | R$ X.XXX,XX |
  | (-) Total Pago | -R$ Y.YYY,YY |
  | (=) Saldo Devedor | R$ Z.ZZZ,ZZ |
```

#### Step 3.2 — Seção opcional "linha do tempo de eventos" (tabela cronológica)

Render `historico` array do event processor (Step 1.2 retorna):
- Cada linha: { data, evento.tipo, evento.payload, estadoApos.saldoTotal }
- Tabela cronológica auditável (D-pre-12 audit trail jurídico)

#### Step 3.3 — Manter D-pre-13 escritório identification

Cabeçalho atual preservado (NOME + ENDERECO + TELEFONE + EMAIL). Sem alteração.

#### Step 3.4 — Re-build + smoke render manual (DEFER pós-Task 5.1)

```bash
npm run build
```

**DEFER**: smoke render PDF reutiliza dataset cadastrado em **Task 5.1** (cenário canônico para UAT comparativo soscalculos). Após Task 5.1 concluído, retornar a este step pra validar visual do PDF formato evolução tribunal-style. Reuse evita cadastro duplicado pelo operador.

Sequência efetiva:
1. Task 3.1-3.3 + build PASS aqui (build gate é pré-Task 4)
2. Task 4 testes
3. Task 5.1 cadastra cenário canônico
4. Volta aqui (Step 3.4 retroativo): operador clica "Gerar PDF" no contrato Task 5.1, valida visual (deduções → créditos → consolidado + linha do tempo eventos)
5. Smoke render PASS gates Step 5.2 (cadastro paralelo soscalculos)

**Post-conditions** (definidas após Task 5.1):
- pdfDemonstrativo.js Step 1.9.c rewrite completo (✓ aqui)
- Build PASS (✓ aqui)
- Smoke render manual operador OK — DEFERRED até Task 5.1 PASS

---

### Task 4 — Tests (eventProcessor.test.js + golden masters)

**Esforço estimado**: ~1.5h

**Pre-conditions**:
- Task 1 + 2 + 3 PASS
- goldenMasters.json existe (Task 0.4)

**Steps**:

#### Step 4.1 — Criar src/services/__tests__/eventProcessor.test.js

12-15 cases:

```js
import { describe, it, expect } from 'vitest';
import { processarEventos } from '../../utils/devedorCalc.js';

describe('processarEventos', () => {
  it('vencimento simples sem pagamento', () => { ... });
  it('1 pagamento parcial pre-Lei14905', () => { ... });
  it('1 pagamento parcial pos-Lei14905', () => { ... });
  it('pagamento que cruza 30/08/2024 (mid-transição)', () => { ... });
  it('art523 aplicado pos-Lei14905', () => { ... });
  it('taxa contratual override (juros_am_percentual=2)', () => { ... });
  it('taxa contratual NULL → fallback regra legal', () => { ... });
  it('custa lançada mid-período', () => { ... });
  it('multi-parcelas com Art.354 sequential', () => { ... });
  it('evento sem data → throw', () => { ... });
  it('evento duplicado → throw', () => { ... });
  it('índice JSON missing → warning + null fallback', () => { ... });
  // Bonus:
  it('cenário 1 do goldenMasters bate com motor antigo', () => { ... });
  it('multa sobre Principal Corrigido apenas (D-pre-4)', () => { ... });
  it('honorários sobre Principal Corrigido apenas (D-pre-4)', () => { ... });
});
```

#### Step 4.2 — Criar fixture goldenMasters.json (output Task 0.4)

Já criado em Task 0.4. Verificar referência funcional em test 13 (acima).

#### Step 4.3 — Adicionar eventProcessor.test.js em test:regressao script

`package.json`:
```json
"test:regressao": "vitest run src/services/__tests__/calculos.test.js src/services/__tests__/saldoAtualizadoCache.test.js src/services/__tests__/custasCache.test.js src/services/__tests__/processosJudiciaisFilter.test.js src/services/__tests__/agruparPagamentosPorDevedor.test.js src/services/__tests__/devedoresDividasContrato.test.js src/services/__tests__/agruparPagamentosPorDevedorIncluindoSolidarios.test.js src/services/__tests__/dividasPorDevedorIncluindoSolidarios.test.js src/services/__tests__/eventProcessor.test.js"
```

(8 → 9 test files)

#### Step 4.4 — Rodar npm run test:regressao

**Esperado**: 35+ tests PASS (34 antigos + 12-15 novos = ~46-49 total).

Se algum quebrar: investigar. Permitido drift se justificado (ver Task 1.7).

**Post-conditions**:
- 12-15 tests novos em eventProcessor.test.js
- goldenMasters.json fixture funcional (test 13)
- test:regressao 35+/35+ PASS

---

### Task 5 — UAT comparativo + commit + push + tag

**Esforço estimado**: ~1h

**Pre-conditions**:
- Task 0-4 PASS cumulative
- Vercel deploy "Ready" do commit Task 5 dry-run (operador valida)
- Conta soscalculos disponível (Step 0.0 PASS)

**Steps**:

#### Step 5.1 — Cadastrar contrato canônico em MR Cobranças

Cenário canônico:
- 1 documento com 3 parcelas mensais R$ 1.000 cada
- Vencimentos: 01/06/2024, 01/07/2024, 01/08/2024
- 1 pagamento parcial R$ 1.500 em 15/07/2024 (cruza 30/08/2024 quando hoje é depois)
- Juros 1% a.m., Multa 10%, Honor 10%
- Indexador: INPC (até 30/08/2024) → IPCA (depois) automatic
- Hoje = 02/05/2026 (data corrente)

Operador clica "Gerar PDF" → baixa PDF → anota saldo final do MR Cobranças.

#### Step 5.2 — Cadastrar mesmo cenário em soscalculos

Operador entra na conta gratuita soscalculos:
- Mesmas datas/valores do Step 5.1
- Indexador equivalente (INPC + IPCA conforme regime)
- Multa 10%, Honor 10%, Juros 1% a.m.

Soscalculos calcula → operador anota saldo final.

#### Step 5.3 — Comparar saldos

```
Delta = |saldo_MR_Cobranças - saldo_soscalculos|
```

**SC-9 PASS**: Delta < R$ 0,10 ✅
**SC-9 FAIL**: Delta >= R$ 0,10 → ABORT Task 5, voltar Task 1 investigar drift

#### Step 5.4 — Print/PDF comparativo lado a lado (anexar evidência UAT)

Operador anexa screenshots ou PDFs lado a lado no chat (audit trail UAT).

#### Step 5.5 — Commits sequenciais

Working dir submódulo (`src/mr-3/mr-cobrancas/`):

```bash
git add src/utils/devedorCalc.js src/utils/correcao.js src/utils/pdfDemonstrativo.js src/data/indicesHistoricos.json src/services/__tests__/eventProcessor.test.js src/services/__tests__/fixtures/goldenMasters.json scripts/fetch-indices.js package.json

git commit -m "$(cat <<'EOF'
feat(09.1): event processor refactor + JSON índices BCB + PDF evolução

Refactor estrutural motor cálculo financeiro pra modelo evolução
por eventos tribunal-style (alinha com soscalculos + Lei 14.905/24).

D-pre-1: substitui 3 loops Art.354 duplicados (devedorCalc.js L59 +
L172 + L277) por processarEventos() síncrono puro.

D-pre-2: regime intertemporal Lei 14.905/24 (30/08/2024) via evento
mudanca_regime_lei14905 auto-injetado quando range cruza.

D-pre-4: multa e honorários sobre Principal Corrigido APENAS (alinha
soscalculos 100%).

D-pre-5: juros simples Taxa Legal (Resolução CMN 5.171/24).

D-pre-13: 5 tipos eventos canônicos (vencimento_parcela, pagamento,
custa_lancada, mudanca_regime_lei14905, aplicacao_art523).

D-pre-14: taxa contratual respeitada (juros_am_percentual quando
preenchido), fallback regra legal por período.

Índices INPC/IPCA/TaxaLegal carregados de src/data/indicesHistoricos.json
populado via scripts/fetch-indices.js (BCB SGS API séries 433/4449/
29541+29542).

PDF Demonstrativo Step 1.9.c reescrito formato evolução: deduções →
créditos → consolidado (espelha soscalculos).

D-01 RELAXED escopo Phase 9.1 APENAS — motor refactored vira nova
baseline INTOCADO pós-SHIP. Pattern feedback_d01_relaxation_protocol
(Phase 7.9 precedente).

UAT comparativo soscalculos PASS — delta saldo < R$ 0,10 (SC-9).

Backup Supabase preservado >= 7 dias pós-SHIP (rollback safety net).
Dados teste apagados pré-refactor (TRADIO + ROCHA + advair).

35+ tests test:regressao PASS (8 antigos + 1 novo eventProcessor.test.js
com 12-15 cases).

Schema INTOCADO (D-pre-10 rename long↔short DEFERRED v1.6).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push origin main
```

Capturar SHA submódulo `<SHA-09.1>`.

Working dir root pai:
```bash
cd ../../../
git add src/mr-3
git commit -m "$(cat <<'EOF'
chore(09.1): bump submódulo mr-3 <SHA-09.1> — Phase 9.1 SHIPPED

Aponta pro submódulo <SHA-09.1> com event processor refactor + JSON
índices BCB + PDF formato evolução tribunal.

Phase 9.1 SHIPPED 2026-05-02 — primeira phase milestone v1.5.

Tag v1.5-phase9.1 criada neste commit (TAG TARGET).

UAT comparativo soscalculos PASS (SC-9): delta saldo < R$ 0,10.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"

git push origin master
```

Capturar SHA pai `<SHA-pai-09.1>`.

#### Step 5.6 — Tag v1.5-phase9.1

```bash
git tag -a v1.5-phase9.1 <SHA-pai-09.1> -m "Phase 9.1 SHIPPED — milestone v1.5 abre. Event processor tribunal-style + Lei 14.905/24."
git push origin v1.5-phase9.1
```

#### Step 5.7 — Push origin master + push tag

(já feito em 5.5 e 5.6 — confirmar sync)

#### Step 5.8 — Verify dual repo sync

```bash
git rev-parse origin/master  # deve bater <SHA-pai-09.1>
git -C src/mr-3 rev-parse origin/main  # deve bater <SHA-09.1>
git tag -l "v1.5-phase9.1"  # deve listar
git ls-remote --tags origin | grep v1.5-phase9.1  # deve listar
```

**Post-conditions**:
- 2 commits novos (submódulo + pai chore bump)
- Tag v1.5-phase9.1 criada e pushed
- 20 tags v1.4 + 1 tag v1.5 = 21 tags total
- Phase 9.1 SHIPPED — milestone v1.5 abre

---

## Pos-SHIP cleanup

- Atualizar memory: `feedback_event_processor_pattern_motor_financeiro` (NOVO, registrar em `~/.claude/.../memory/`)
- D-01 invariante volta estrito (motor refatorado vira nova baseline INTOCADO)
- Update `.planning/ROADMAP.md`: Phase 9.1 SHIPPED, abrir backlog Phase 9.5 (schema rename) v1.6
- Update `.planning/STATE.md`: milestone v1.4 archived, milestone v1.5 ativo

<verification>

## Gates automatizados

- ✅ Step 0.0 smoke soscalculos PASS
- ✅ Step 0.1 backup Supabase confirmed
- ✅ Step 0.2 SQL DELETE — DB limpo (count = 0)
- ✅ Step 0.3 audits 2.A.1-6 PASS
- ✅ Step 0.4 goldenMasters.json existe
- ✅ Step 1.7 build PASS + 34 test:regressao PASS
- ✅ Step 2.4 calcularFatorCorrecao refactored
- ✅ Step 3.4 build PASS + smoke render manual
- ✅ Step 4.4 35+ tests PASS

## Gates UAT (Task 5)

- ✅ Step 5.1 contrato canônico cadastrado MR
- ✅ Step 5.2 mesmo cenário em soscalculos
- ✅ Step 5.3 SC-9 PASS — delta < R$ 0,10
- ✅ Step 5.4 evidência UAT anexada chat

## Gates post-commit (Task 5)

- ✅ Submódulo `<SHA-09.1>` push REMOTE main
- ✅ Pai `<SHA-pai-09.1>` push REMOTE master
- ✅ Tag `v1.5-phase9.1` push REMOTE
- ✅ Dual sync confirmado

</verification>

<success_criteria>

- ✅ Tasks 0-5 PASS sequencial (autonomous false, PAUSAs operador entre tasks-críticas)
- ✅ SC-1 a SC-10 todos PASS (cumulative)
- ✅ UAT comparativo soscalculos delta < R$ 0,10 (SC-9 — gate jurídico)
- ✅ D-01 RELAXED escopo Phase 9.1 — comments headers atualizados, commit message explícito
- ✅ Schema INTOCADO (D-pre-10 DEFERRED v1.6)
- ✅ Backup Supabase >= 7 dias pós-SHIP
- ✅ Tag `v1.5-phase9.1` pushed REMOTE — abre milestone v1.5
- ✅ 35+ test:regressao PASS (era 34)
- ✅ Memory feedback NOVO criado: `feedback_event_processor_pattern_motor_financeiro`

</success_criteria>

<output>

- ✅ 1 plan dossiê executado (Plan 09.1-01)
- ✅ 4 files modificados/criados no submódulo:
  - `src/utils/devedorCalc.js` REFACTORED (event processor + 6 funções refactored, ~600-900 linhas)
  - `src/utils/correcao.js` MODIFIED (calcularFatorCorrecao refactor)
  - `src/utils/pdfDemonstrativo.js` MODIFIED (Step 1.9.c rewrite formato evolução)
  - `package.json` MODIFIED (test:regressao 8 → 9 test files + script fetch-indices)
- ✅ 4 files NEW no submódulo:
  - `src/data/indicesHistoricos.json` (INPC + IPCA + TaxaLegal mensais)
  - `src/services/__tests__/eventProcessor.test.js` (12-15 cases)
  - `src/services/__tests__/fixtures/goldenMasters.json` (snapshot pre-refactor)
  - `scripts/fetch-indices.js` (BCB SGS API automatizada)
- ✅ 1 commit feat submódulo (mr-3 main)
- ✅ 1 commit chore bump pai (master)
- ✅ 1 tag `v1.5-phase9.1` pushed (pai apenas — feedback_tag_push_apenas_no_pai_chore_bump)
- ✅ Phase 9.1 SHIPPED — milestone v1.5 abre
- ✅ Memory feedback NOVO consolidado pós-execute

</output>
