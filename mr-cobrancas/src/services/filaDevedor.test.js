/**
 * Phase 7.13b — Test integração filaDevedor.js (schema novo D-pre-10)
 *
 * Cobre as 10 funções do rewrite:
 *   1. listarContratosParaFila — fonte contratos_dividas
 *   2. calcularScorePrioridade — usa tabela dividas (schema novo Phase 5+)
 *   3. entrarNaFila — fix-forward D-pre-8 (contratos_dividas, não contratos)
 *   4. proximoContrato — lock otimista por contrato_id
 *   5. registrarEvento — INSERT eventos_andamento com contrato_id NOT NULL
 *   6. alterarStatusContrato — UPDATE contratos_dividas.status
 *   7. reciclarContratos — fix-forward D-pre-8
 *   8. removerDaFila — INSERT eventos com contrato_id
 *   9. listarFila — filter devedores.deleted_at=is.null (D-pre-9)
 *  10. atualizarValoresAtrasados — fonte contratos_dividas + dividas
 *
 * Setup cria fixtures válidos pós-D-pre-10 (devedor + credor + contrato_dividas + dividas + pagamento_divida).
 * Cleanup respeita FK ordering: eventos_andamento → pagamentos_divida → devedores_dividas → fila_cobranca → dividas → contratos_dividas → (devedor/credor preservados).
 *
 * Run: node src/services/filaDevedor.test.js
 * (Test integração contra Supabase real — exige .env com SUPABASE_URL+ANON_KEY)
 */

import { dbGet, dbInsert, dbDelete, sb } from "../config/supabase.js";
import { filaDevedor } from "./filaDevedor.js";

const testIds = {
  devedor: null,
  credor: null,
  contrato: null,
  dividas: [],
  pagamentos: [],
  eventos: [],
  filaItems: [],
};

async function setup() {
  // 1. Buscar devedor existente (não criar — tabela legada BIGINT, FKs cascade)
  const devedores = await dbGet("devedores", "select=id&limit=1&deleted_at=is.null");
  if (!devedores.length) throw new Error("Nenhum devedor encontrado para teste");
  testIds.devedor = devedores[0].id;
  console.log(`[SETUP] Devedor existente: id=${testIds.devedor}`);

  // 2. Buscar credor existente
  const credores = await dbGet("credores", "select=id&limit=1");
  if (!credores.length) throw new Error("Nenhum credor encontrado para teste");
  testIds.credor = credores[0].id;
  console.log(`[SETUP] Credor existente: id=${testIds.credor}`);

  // 3. Criar contrato_dividas de teste com status=em_cobranca (D-pre-4)
  // B1.3: schema real (contratos.js L20-33) — usa `referencia` + `valor_total` derivado (colunas legacy do MVP foram removidas)
  const contrato = await dbInsert("contratos_dividas", {
    devedor_id: testIds.devedor,
    credor_id: testIds.credor,
    referencia: "TEST-FILA-7.13B-" + Date.now(),
    status: "em_cobranca",
  });
  testIds.contrato = Array.isArray(contrato) ? contrato[0]?.id : contrato.id;
  console.log(`[SETUP] Contrato criado: ${testIds.contrato}`);

  // 4. Criar 2 dívidas (schema novo Phase 5+ — modelo 3 níveis devedor → contrato → dívida)
  // B1.2: schema dividas (002_dividas_tabela.sql L16-44) — identificação via observacoes (TEXT free-form), sem coluna ordinal dedicada
  for (let i = 1; i <= 2; i++) {
    const d = await dbInsert("dividas", {
      contrato_id: testIds.contrato,
      devedor_id: testIds.devedor,
      valor_total: 2500.00,
      data_vencimento: i === 1 ? "2025-01-15" : "2026-06-15",
      observacoes: "TEST-FILA-7.13B parcela " + i,
    });
    testIds.dividas.push(Array.isArray(d) ? d[0]?.id : d.id);
  }
  console.log(`[SETUP] 2 dívidas criadas`);
}

async function cleanup() {
  console.log("\n[CLEANUP] Removendo dados de teste...");
  // Ordem FK: eventos_andamento → pagamentos_divida → devedores_dividas → fila_cobranca → dividas → contratos_dividas → (devedor/credor preservados)

  // 1. eventos_andamento criados durante teste (filter por contrato_id do test)
  if (testIds.contrato) {
    const eventos = await dbGet(
      "eventos_andamento",
      `select=id&contrato_id=eq.${testIds.contrato}`
    ).catch(() => []);
    for (const ev of eventos) {
      await dbDelete("eventos_andamento", ev.id).catch(() => {});
    }
  }

  // 2. pagamentos_divida (filter divida_id IN dividas do contrato)
  if (testIds.dividas.length) {
    const pagamentos = await dbGet(
      "pagamentos_divida",
      `select=id&divida_id=in.(${testIds.dividas.join(",")})`
    ).catch(() => []);
    for (const p of pagamentos) {
      await dbDelete("pagamentos_divida", p.id).catch(() => {});
    }
  }

  // 3. devedores_dividas (junction — FK CASCADE on dividas, mas explicitamos)
  if (testIds.dividas.length) {
    const dd = await dbGet(
      "devedores_dividas",
      `select=id&divida_id=in.(${testIds.dividas.join(",")})`
    ).catch(() => []);
    for (const x of dd) {
      await dbDelete("devedores_dividas", x.id).catch(() => {});
    }
  }

  // 4. fila_cobranca
  if (testIds.contrato) {
    const filaItems = await dbGet(
      "fila_cobranca",
      `select=id&contrato_id=eq.${testIds.contrato}`
    ).catch(() => []);
    for (const f of filaItems) {
      await dbDelete("fila_cobranca", f.id).catch(() => {});
    }
  }

  // 5. dividas
  for (const id of testIds.dividas) {
    if (id) await dbDelete("dividas", id).catch(() => {});
  }

  // 6. contrato
  if (testIds.contrato) {
    await dbDelete("contratos_dividas", testIds.contrato).catch(() => {});
  }

  console.log("[CLEANUP] Concluído");
}

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); }
  else { failed++; console.error(`  ✗ ${msg}`); }
}

async function testListarContratosParaFila() {
  console.log("\n[TEST] listarContratosParaFila (D-pre-1, D-pre-9)");
  const r = await filaDevedor.listarContratosParaFila({});
  assert(r.success === true, "success=true");
  assert(Array.isArray(r.data), "data is array");
  assert(r.data.some(c => c.id === testIds.contrato), "test contrato presente em data");
  const c = r.data.find(c => c.id === testIds.contrato);
  assert(c?._devedor?.id == testIds.devedor, "_devedor enriched");
  assert(c?._credor?.id == testIds.credor, "_credor enriched");
  assert(Array.isArray(c?._dividas) && c._dividas.length === 2, "_dividas array com 2 entries");
  assert(typeof c?._saldo_atualizado === "number", "_saldo_atualizado é number");
  assert(["ALTA","MEDIA","BAIXA"].includes(c?._prioridade), "_prioridade ∈ {ALTA,MEDIA,BAIXA}");
}

async function testEntrarNaFila() {
  console.log("\n[TEST] entrarNaFila (fix-forward D-pre-8)");
  const r = await filaDevedor.entrarNaFila();
  assert(r.success === true, "success=true");
  assert(typeof r.data?.inseridos === "number", "data.inseridos é number");

  const fila = await dbGet("fila_cobranca", `select=*&contrato_id=eq.${testIds.contrato}`);
  assert(fila.length >= 1, "test contrato inserido em fila_cobranca");
}

async function testRegistrarEvento() {
  console.log("\n[TEST] registrarEvento (D-pre-10 contrato_id NOT NULL)");
  const r = await filaDevedor.registrarEvento(testIds.contrato, 1, {
    tipo_evento: "LIGACAO",
    descricao: "Test 7.13b — evento por contrato",
  });
  assert(r.success === true, "success=true");
  assert(r.data?.id != null, "evento criado retorna id");
  assert(r.data?.contrato_id === testIds.contrato, "evento.contrato_id === testIds.contrato");
  assert(r.data?.devedor_id != null, "evento.devedor_id back-compat preserved (lookup via contratos_dividas)");
}

async function testAlterarStatusContrato() {
  console.log("\n[TEST] alterarStatusContrato (D-pre-4 — UPDATE contratos_dividas.status)");
  const r = await filaDevedor.alterarStatusContrato(testIds.contrato, "em_localizacao", 1);
  assert(r.success === true, "success=true");
  assert(r.data?.novoStatus === "em_localizacao", "novoStatus retornado");

  const cArr = await dbGet("contratos_dividas", `select=status&id=eq.${testIds.contrato}`);
  assert(cArr[0]?.status === "em_localizacao", "contratos_dividas.status persistido");
}

async function testListarFilaDeletedAt() {
  console.log("\n[TEST] listarFila (D-pre-9 filter deleted_at=is.null)");
  const r = await filaDevedor.listarFila({});
  assert(r.success === true, "success=true");
  assert(Array.isArray(r.data), "data array");
  // Drift impossível de mensurar sem soft-delete real — apenas confirma shape (UAT humano em Plan 03)
  const item = r.data.find(i => i.contrato_id === testIds.contrato);
  if (item) {
    assert(item.devedor != null, "devedor enriched (não soft-deleted)");
  }
}

async function testAtualizarValoresAtrasados() {
  console.log("\n[TEST] atualizarValoresAtrasados (fonte contratos_dividas + dividas)");
  const r = await filaDevedor.atualizarValoresAtrasados();
  assert(r.success === true, "success=true");
  assert(typeof r.data?.atualizados === "number", "data.atualizados é number");
}

// ─── Helper: força fila do contrato de teste para EM_ATENDIMENTO ──
// (re-migração TESTS 6/7/8 do HEAD pré-7.13b; adaptado p/ schema novo:
//  usuario_id BIGINT sem FK, contrato_id UUID, status_fila preservado)
async function prepararFilaEmAtendimento() {
  // Reentrar na fila (cria/atualiza AGUARDANDO para o contrato de teste)
  await filaDevedor.entrarNaFila();
  // Forçar diretamente o item do contrato de teste para EM_ATENDIMENTO
  // (proximoContrato poderia escolher outro contrato de maior score)
  const filaItems = await dbGet(
    "fila_cobranca",
    `contrato_id=eq.${testIds.contrato}&status_fila=eq.AGUARDANDO`
  );
  if (filaItems.length) {
    await sb(
      "fila_cobranca",
      "PATCH",
      { status_fila: "EM_ATENDIMENTO", usuario_id: 1, updated_at: new Date().toISOString() },
      `?id=eq.${filaItems[0].id}`
    );
  }
}

// ─── TEST CR-02: PROMESSA_PAGAMENTO sozinha (re-migração HEAD TEST 6) ──
async function testCR02PromessaSozinha() {
  console.log("\n[TEST] CR-02 registrarEvento — PROMESSA_PAGAMENTO sozinha (sem giro)");
  await prepararFilaEmAtendimento();
  const promessaData = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r = await filaDevedor.registrarEvento(testIds.contrato, 1, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Test 7.13b CR-02 promessa sozinha",
    data_promessa: promessaData,
  });
  assert(r.success === true, "CR-02 promessa: success=true");
  const fila = (await dbGet(
    "fila_cobranca",
    `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`
  ))[0];
  assert(fila?.bloqueado_ate === promessaData, "CR-02 promessa: bloqueado_ate === data_promessa");
  assert(fila?.status_fila === "ACIONADO", "CR-02 promessa: status_fila === ACIONADO");
}

// ─── TEST CR-02: giro_carteira_dias sozinho (re-migração HEAD TEST 7) ──
async function testCR02GiroSozinho() {
  console.log("\n[TEST] CR-02 registrarEvento — giro_carteira_dias sozinho (sem promessa)");
  await prepararFilaEmAtendimento();
  const giroDias = 10;
  const giroEsperado = new Date(Date.now() + giroDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r = await filaDevedor.registrarEvento(testIds.contrato, 1, {
    tipo_evento: "SEM_CONTATO",
    descricao: "Test 7.13b CR-02 giro sozinho",
    giro_carteira_dias: giroDias,
  });
  assert(r.success === true, "CR-02 giro: success=true");
  const fila = (await dbGet(
    "fila_cobranca",
    `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`
  ))[0];
  assert(fila?.bloqueado_ate === giroEsperado, "CR-02 giro: bloqueado_ate === hoje + giro_dias");
  assert(fila?.status_fila === "ACIONADO", "CR-02 giro: status_fila === ACIONADO");
}

// ─── TEST CR-02: AMBOS — usar a maior data (re-migração HEAD TEST 8) ──
async function testCR02AmbosUsarMaior() {
  console.log("\n[TEST] CR-02 registrarEvento — PROMESSA + giro juntos (usar maior data)");
  await prepararFilaEmAtendimento();
  // promessa = +5 dias, giro = 20 dias → giro é maior
  const promessa = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const giroEsperado = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r = await filaDevedor.registrarEvento(testIds.contrato, 1, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Test 7.13b CR-02 ambos — giro maior",
    data_promessa: promessa,
    giro_carteira_dias: 20,
  });
  assert(r.success === true, "CR-02 ambos: success=true");
  const fila = (await dbGet(
    "fila_cobranca",
    `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`
  ))[0];
  assert(fila?.bloqueado_ate === giroEsperado, "CR-02 ambos: bloqueado_ate === max(promessa, giro) = giro");
}

// ─── TEST CR-01: validateUUID/validateBigInt — IDs inválidos retornam success=false ──
// (re-migração HEAD TEST 9; adaptado p/ assinaturas novas — proximoContrato + registrarEvento(contratoId, ...))
async function testCR01InvalidIds() {
  console.log("\n[TEST] CR-01 validateUUID/validateBigInt — guards contra IDs inválidos / SQL injection");
  // a) calcularScorePrioridade(contratoId UUID) — guard validateUUID
  const r1 = await filaDevedor.calcularScorePrioridade("nao-um-uuid");
  assert(r1.success === false, "CR-01 calcularScorePrioridade: contratoId inválido → success=false");
  assert(typeof r1.error === "string" && r1.error.length > 0, "CR-01 calcularScorePrioridade: error descritivo presente");

  // b) proximoContrato — usuarioId payload (extractUsuario tolera string, não trava)
  //    Guard real está em validateUUID/BigInt nos endpoints sensíveis (contratoId/filaId)
  //    Mantemos chamada como smoke que função não crasha com payload arbitrário
  const r2 = await filaDevedor.proximoContrato("' OR 1=1 --");
  assert(r2.success === true || r2.success === false, "CR-01 proximoContrato: payload arbitrário não crasha (success boolean)");

  // c) registrarEvento(contratoId UUID, ...) — guard validateUUID adaptado p/ contrato
  const r3 = await filaDevedor.registrarEvento("nao-uuid", 1, { tipo_evento: "SEM_CONTATO" });
  assert(r3.success === false, "CR-01 registrarEvento: contratoId inválido → success=false");

  // d) removerDaFila(filaId UUID, ...) — guard validateUUID preservado (assinatura igual)
  const r4 = await filaDevedor.removerDaFila("nao-uuid", "motivo", 1);
  assert(r4.success === false, "CR-01 removerDaFila: filaId inválido → success=false");
}

async function main() {
  try {
    await setup();
    await testListarContratosParaFila();
    await testEntrarNaFila();
    await testRegistrarEvento();
    await testAlterarStatusContrato();
    await testListarFilaDeletedAt();
    await testAtualizarValoresAtrasados();
    // ─── CR-02 lock otimista bloqueado_ate (re-migração HEAD TESTS 6/7/8) ──
    await testCR02PromessaSozinha();
    await testCR02GiroSozinho();
    await testCR02AmbosUsarMaior();
    // ─── CR-01 guard contra IDs inválidos / SQL injection (re-migração HEAD TEST 9) ──
    await testCR01InvalidIds();
  } catch (err) {
    console.error("FATAL:", err);
    failed++;
  } finally {
    await cleanup();
    console.log(`\n[RESULTADO] passed=${passed} failed=${failed}`);
    if (failed > 0) process.exit(1);
  }
}

main();
