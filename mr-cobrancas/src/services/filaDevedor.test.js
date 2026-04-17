import { dbGet, dbInsert, dbDelete, sb } from "../config/supabase.js";
import { filaDevedor } from "./filaDevedor.js";

// IDs de teste (para cleanup)
const testIds = { devedor: null, contrato: null, parcelas: [], eventos: [], operador: null };

async function setup() {
  // 1. Buscar um devedor existente para lookup (nao criar — tabela legada BIGINT)
  const devedores = await dbGet("devedores", "select=id&limit=1");
  if (!devedores.length) throw new Error("Nenhum devedor encontrado para teste");
  testIds.devedor = devedores[0].id;
  console.log(`[SETUP] Usando devedor existente: id=${testIds.devedor}`);

  // 1b. Criar operador de teste (necessario por FK em fila_cobranca.operador_id)
  const operador = await dbInsert("operadores", { ativo: true });
  testIds.operador = operador[0]?.id || operador.id;
  console.log(`[SETUP] Operador criado: ${testIds.operador}`);

  // 2. Criar contrato de teste
  const contrato = await dbInsert("contratos", {
    devedor_id: testIds.devedor,
    numero_contrato: "TEST-FILA-" + Date.now(),
    valor_original: 5000.00,
    estagio: "ANDAMENTO",
  });
  testIds.contrato = contrato[0]?.id || contrato.id;
  console.log(`[SETUP] Contrato criado: ${testIds.contrato}`);

  // 3. Criar 2 parcelas de teste (1 ATRASADA, 1 ABERTA)
  const p1 = await dbInsert("parcelas", {
    contrato_id: testIds.contrato,
    numero_parcela: 1,
    valor: 2500.00,
    data_vencimento: "2025-01-15",
    status: "ATRASADA",
  });
  testIds.parcelas.push(p1[0]?.id || p1.id);

  const p2 = await dbInsert("parcelas", {
    contrato_id: testIds.contrato,
    numero_parcela: 2,
    valor: 2500.00,
    data_vencimento: "2026-06-15",
    status: "ABERTA",
  });
  testIds.parcelas.push(p2[0]?.id || p2.id);
  console.log(`[SETUP] 2 parcelas criadas`);
}

async function cleanup() {
  console.log("\n[CLEANUP] Removendo dados de teste...");
  // Ordem: eventos -> fila -> parcelas -> contrato -> operador (FK cascade)
  for (const id of testIds.eventos) {
    if (id) await dbDelete("eventos_andamento", id).catch(() => {});
  }
  // Limpar fila items + eventos extras criados indiretamente pelo servico
  if (testIds.contrato) {
    const eventosExtras = await dbGet("eventos_andamento", `contrato_id=eq.${testIds.contrato}`).catch(() => []);
    for (const ev of eventosExtras) {
      await dbDelete("eventos_andamento", ev.id).catch(() => {});
    }
    const filaItems = await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}`).catch(() => []);
    for (const item of filaItems) {
      await dbDelete("fila_cobranca", item.id).catch(() => {});
    }
  }
  for (const id of testIds.parcelas) {
    if (id) await dbDelete("parcelas", id).catch(() => {});
  }
  if (testIds.contrato) {
    await dbDelete("contratos", testIds.contrato).catch(() => {});
  }
  if (testIds.operador) {
    await dbDelete("operadores", testIds.operador).catch(() => {});
  }
  console.log("[CLEANUP] Concluido");
}

// Contador de resultados
let passed = 0, failed = 0;

function assert(label, condition) {
  if (condition) { console.log(`  PASS: ${label}`); passed++; }
  else { console.log(`  FAIL: ${label}`); failed++; }
}

async function runTests() {
  // TEST 1: entrarNaFila
  console.log("\n--- TEST 1: entrarNaFila ---");
  const r1 = await filaDevedor.entrarNaFila();
  assert("retorno success", r1.success === true);
  assert("inseridos >= 1", r1.data?.inseridos >= 1);

  // Verificar que contrato de teste esta na fila
  const filaCheck = await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}&status_fila=eq.AGUARDANDO`);
  assert("contrato na fila com status AGUARDANDO", filaCheck.length >= 1);

  // TEST 2: proximoDevedor — usa operador real criado no setup
  console.log("\n--- TEST 2: proximoDevedor ---");
  const r2 = await filaDevedor.proximoDevedor(testIds.operador);
  assert("retorno success", r2.success === true);
  assert("data nao null (fila tinha items)", r2.data !== null);
  if (r2.data) {
    assert("fila item presente", !!r2.data.fila);
    assert("devedor enriquecido", !!r2.data.devedor);
    assert("contrato enriquecido", !!r2.data.contrato);
    assert("parcelas array", Array.isArray(r2.data.parcelas));
  }

  // TEST 3: registrarEvento com PROMESSA_PAGAMENTO
  console.log("\n--- TEST 3: registrarEvento (PROMESSA_PAGAMENTO) ---");
  const dataPromessa = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r3 = await filaDevedor.registrarEvento(testIds.contrato, testIds.operador, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Teste automatizado - promessa de pagamento",
    data_promessa: dataPromessa,
    giro_carteira_dias: 7,
  });
  assert("retorno success", r3.success === true);
  assert("evento criado com dados", !!r3.data);
  if (r3.data) {
    const eventoId = r3.data.id || (Array.isArray(r3.data) ? r3.data[0]?.id : null);
    if (eventoId) testIds.eventos.push(eventoId);
  }

  // Verificar bloqueado_ate foi setado
  const filaPos = await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}`);
  const filaItem = filaPos[0];
  assert("bloqueado_ate setado", !!filaItem?.bloqueado_ate);
  assert("bloqueado_ate = data_promessa", filaItem?.bloqueado_ate === dataPromessa);
  assert("status_fila = ACIONADO", filaItem?.status_fila === "ACIONADO");

  // TEST 4: calcularScorePrioridade
  console.log("\n--- TEST 4: calcularScorePrioridade ---");
  const r4 = await filaDevedor.calcularScorePrioridade(testIds.contrato);
  assert("retorno success", r4.success === true);
  assert("score numerico > 0", typeof r4.data?.score === "number" && r4.data.score > 0);
  assert("prioridade definida", ["ALTA", "MEDIA", "BAIXA"].includes(r4.data?.prioridade));

  // TEST 5: removerDaFila
  console.log("\n--- TEST 5: removerDaFila ---");
  const filaParaRemover = await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}`);
  if (filaParaRemover.length) {
    const r5 = await filaDevedor.removerDaFila(filaParaRemover[0].id, "Teste automatizado", testIds.operador);
    assert("retorno success", r5.success === true);
    // Verificar status REMOVIDO
    const filaRemovida = await dbGet("fila_cobranca", `id=eq.${filaParaRemover[0].id}`);
    assert("status_fila = REMOVIDO", filaRemovida[0]?.status_fila === "REMOVIDO");
  } else {
    console.log("  SKIP: nenhum item na fila para remover");
  }

  // ── Preparar contrato fresh para testes CR-02 ──────────────
  // Precisamos de contrato em fila EM_ATENDIMENTO para cada sub-teste
  async function prepararFilaEmAtendimento() {
    // Reentrar na fila (cria AGUARDANDO para o contrato de teste)
    await filaDevedor.entrarNaFila();
    // Forçar diretamente o item do contrato de teste para EM_ATENDIMENTO
    // (proximoDevedor poderia pegar outro contrato de maior score)
    const filaItems = await dbGet(
      "fila_cobranca",
      `contrato_id=eq.${testIds.contrato}&status_fila=eq.AGUARDANDO`
    );
    if (filaItems.length) {
      await sb("fila_cobranca", "PATCH",
        { status_fila: "EM_ATENDIMENTO", operador_id: testIds.operador, updated_at: new Date().toISOString() },
        `?id=eq.${filaItems[0].id}`
      );
    }
  }

  // TEST 6 (CR-02): PROMESSA_PAGAMENTO sozinha
  console.log("\n--- TEST 6: registrarEvento — PROMESSA_PAGAMENTO sozinha ---");
  await prepararFilaEmAtendimento();
  const promessaData = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r6 = await filaDevedor.registrarEvento(testIds.contrato, testIds.operador, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Teste CR-02 promessa sozinha",
    data_promessa: promessaData,
  });
  assert("T6 retorno success", r6.success === true);
  const fila6 = (await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`))[0];
  assert("T6 bloqueado_ate = data_promessa", fila6?.bloqueado_ate === promessaData);
  assert("T6 status_fila = ACIONADO", fila6?.status_fila === "ACIONADO");

  // TEST 7 (CR-02): giro_carteira_dias sozinho (sem promessa)
  console.log("\n--- TEST 7: registrarEvento — giro_carteira_dias sozinho ---");
  await prepararFilaEmAtendimento();
  const giroDias = 10;
  const giroEsperado = new Date(Date.now() + giroDias * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r7 = await filaDevedor.registrarEvento(testIds.contrato, testIds.operador, {
    tipo_evento: "SEM_CONTATO",
    descricao: "Teste CR-02 giro sozinho",
    giro_carteira_dias: giroDias,
  });
  assert("T7 retorno success", r7.success === true);
  const fila7 = (await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`))[0];
  assert("T7 bloqueado_ate = hoje + giro_dias", fila7?.bloqueado_ate === giroEsperado);
  assert("T7 status_fila = ACIONADO", fila7?.status_fila === "ACIONADO");

  // TEST 8 (CR-02): AMBOS juntos — deve usar a maior data
  console.log("\n--- TEST 8: registrarEvento — PROMESSA + giro (usar maior data) ---");
  await prepararFilaEmAtendimento();
  // promessa = +5 dias, giro = 20 dias → giro é maior
  const promessa8 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const giro8Esperado = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const r8 = await filaDevedor.registrarEvento(testIds.contrato, testIds.operador, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Teste CR-02 ambos — giro maior",
    data_promessa: promessa8,
    giro_carteira_dias: 20,
  });
  assert("T8 retorno success", r8.success === true);
  const fila8 = (await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}&order=updated_at.desc&limit=1`))[0];
  assert("T8 bloqueado_ate = max(promessa, giro) = giro", fila8?.bloqueado_ate === giro8Esperado);

  // TEST 9 (CR-01): IDs inválidos retornam success=false
  console.log("\n--- TEST 9: validateUUID/validateBigInt — IDs inválidos ---");
  const rInj1 = await filaDevedor.calcularScorePrioridade("nao-um-uuid");
  assert("T9 contratoId inválido → success=false", rInj1.success === false);
  assert("T9 error descritivo presente", typeof rInj1.error === "string" && rInj1.error.length > 0);

  const rInj2 = await filaDevedor.proximoDevedor("' OR 1=1 --");
  assert("T9 operadorId injection → success=false", rInj2.success === false);

  const rInj3 = await filaDevedor.registrarEvento("nao-uuid", testIds.operador, { tipo_evento: "SEM_CONTATO" });
  assert("T9 registrarEvento contratoId inválido → success=false", rInj3.success === false);

  const rInj4 = await filaDevedor.removerDaFila("nao-uuid", "motivo", testIds.operador);
  assert("T9 removerDaFila filaId inválido → success=false", rInj4.success === false);
}

// Main
(async () => {
  try {
    await setup();
    await runTests();
  } catch (err) {
    console.error("\nERRO FATAL:", err.message);
    failed++;
  } finally {
    await cleanup();
    console.log(`\n=============================`);
    console.log(`RESULTADO: ${passed} PASS / ${failed} FAIL`);
    console.log(`=============================`);
    process.exit(failed > 0 ? 1 : 0);
  }
})();
