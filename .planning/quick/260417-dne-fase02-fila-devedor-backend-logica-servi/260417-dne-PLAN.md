---
phase: 260417-dne
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mr-3/mr-cobrancas/src/services/filaDevedor.js
  - src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js
autonomous: true
requirements: [FILA-SVC-01, FILA-SVC-02, FILA-SVC-03, FILA-SVC-04, FILA-SVC-05, FILA-SVC-06, FILA-SVC-07, FILA-TEST-01]

must_haves:
  truths:
    - "filaDevedor.js exporta objeto com 7 funcoes de negocio"
    - "Todas as funcoes retornam { success, data, error } com try/catch"
    - "proximoDevedor usa lock otimista via sb() com filtro composto"
    - "atualizarValoresAtrasados usa calcularFatorCorrecao de correcao.js"
    - "Script de teste executa fluxo completo contra Supabase real e limpa dados"
  artifacts:
    - path: "src/mr-3/mr-cobrancas/src/services/filaDevedor.js"
      provides: "7 funcoes de negocio da fila de devedor"
      exports: ["filaDevedor"]
    - path: "src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js"
      provides: "Script de teste real contra Supabase"
  key_links:
    - from: "src/mr-3/mr-cobrancas/src/services/filaDevedor.js"
      to: "src/mr-3/mr-cobrancas/src/config/supabase.js"
      via: "import { dbGet, dbInsert, dbUpdate, dbDelete, sb }"
      pattern: "import.*from.*config/supabase"
    - from: "src/mr-3/mr-cobrancas/src/services/filaDevedor.js"
      to: "src/mr-3/mr-cobrancas/src/utils/correcao.js"
      via: "import { calcularFatorCorrecao }"
      pattern: "import.*calcularFatorCorrecao.*correcao"
---

<objective>
Implementar filaDevedor.js com 7 funcoes de negocio para o modulo Fila de Devedor, mais script de teste real contra Supabase.

Purpose: Criar a camada de servico backend que opera sobre as 6 tabelas criadas na fase 1 (contratos, parcelas, fila_cobranca, eventos_andamento, equipes, operadores). Estas funcoes serao consumidas pela UI na fase 3.

Output: Dois arquivos — service com 7 funcoes exportadas e script de teste validando fluxo completo.
</objective>

<execution_context>
@.claude/get-shit-done/workflows/execute-plan.md
@.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/quick/260417-dne-fase02-fila-devedor-backend-logica-servi/260417-dne-CONTEXT.md
@.planning/quick/260417-dne-fase02-fila-devedor-backend-logica-servi/260417-dne-RESEARCH.md

<interfaces>
<!-- Supabase client API — from src/mr-3/mr-cobrancas/src/config/supabase.js -->
```javascript
export async function sb(path, method = "GET", body = null, extra = "")
// Monta: ${SUPABASE_URL}/rest/v1/${path}${extra}
// Headers: apikey, Authorization, Content-Type, Prefer: return=representation
// Retorna: JSON parseado (array para GET)
// Throws: Error com .status e .details

export const dbGet    = (t, q = "")   => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",   b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH",  b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
```

<!-- Correcao util — from src/mr-3/mr-cobrancas/src/utils/correcao.js -->
```javascript
export function calcularFatorCorrecao(indexador, dataInicio, dataFim)
// indexador: "igpm" | "ipca" | "selic" | "inpc" | "nenhum"
// dataInicio/dataFim: "YYYY-MM-DD"
// Retorna: number (fator multiplicador, ex: 1.0523)
```

<!-- IMPORTANT: dbUpdate only filters by ?id=eq.{id} -->
<!-- For compound filters (lock otimista), use sb() directly -->
<!-- devedores.id = BIGINT, contratos.id = UUID -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Criar filaDevedor.js com 7 funcoes de negocio</name>
  <files>src/mr-3/mr-cobrancas/src/services/filaDevedor.js</files>
  <action>
Criar diretorio `src/mr-3/mr-cobrancas/src/services/` se nao existir.

Criar `filaDevedor.js` com imports e 7 funcoes. Todas retornam `{ success, data, error }` com try/catch.

**Imports:**
```javascript
import { dbGet, dbInsert, dbUpdate, dbDelete, sb } from "../config/supabase.js";
import { calcularFatorCorrecao } from "../utils/correcao.js";
```

**Funcao 1: calcularScorePrioridade(contratoId)**
- Buscar contrato: `dbGet("contratos", "select=id,valor_original&id=eq.{contratoId}")`
- Buscar parcelas atrasadas: `dbGet("parcelas", "select=id,valor,data_vencimento&contrato_id=eq.{contratoId}&status=eq.ATRASADA")`
- Calcular score: `(valorOriginal / 1000) + (diasAtrasoMaior * 2) + (qtdParcelasAtrasadas * 10)`
  - diasAtrasoMaior = max dias entre hoje e data_vencimento de cada parcela atrasada
- Derivar prioridade: score >= 80 -> "ALTA", score >= 40 -> "MEDIA", else -> "BAIXA"
- Atualizar fila_cobranca: `sb("fila_cobranca", "PATCH", { score_prioridade: score, prioridade, updated_at: new Date().toISOString() }, "?contrato_id=eq.{contratoId}")`
- Retornar `{ success: true, data: { score, prioridade }, error: null }`

**Funcao 2: entrarNaFila()**
- Buscar contratos estagio ANDAMENTO: `dbGet("contratos", "select=id,devedor_id&estagio=eq.ANDAMENTO")`
- Buscar items ja na fila (status AGUARDANDO ou EM_ATENDIMENTO): `dbGet("fila_cobranca", "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)")`
- Filtrar contratos que NAO estao na fila
- Para cada contrato novo:
  - Inserir em fila_cobranca: `dbInsert("fila_cobranca", { contrato_id, devedor_id, status_fila: "AGUARDANDO", score_prioridade: 0, prioridade: "MEDIA" })`
  - Chamar `calcularScorePrioridade(contrato_id)` para atualizar score
- Para contratos ja na fila, chamar `calcularScorePrioridade` para recalcular
- Retornar `{ success: true, data: { inseridos: N, atualizados: M }, error: null }`

**Funcao 3: proximoDevedor(operadorId)**
- LOCK OTIMISTA — nao usar dbUpdate, usar sb() direto
- Step 1: SELECT proximo: `dbGet("fila_cobranca", "select=*&status_fila=eq.AGUARDANDO&order=score_prioridade.desc&limit=1&or=(bloqueado_ate.is.null,bloqueado_ate.lt.{hoje})")`
  - `hoje` = `new Date().toISOString().slice(0, 10)`
  - Se fila vazia, retornar `{ success: true, data: null, error: null }`
- Step 2: PATCH com filtro composto via sb():
  ```javascript
  const updated = await sb("fila_cobranca", "PATCH",
    { status_fila: "EM_ATENDIMENTO", operador_id: operadorId, data_acionamento: new Date().toISOString(), updated_at: new Date().toISOString() },
    `?id=eq.${item.id}&status_fila=eq.AGUARDANDO`
  );
  ```
- Step 3: Se `updated` array vazio (outro operador pegou), recursao 1x (max 3 tentativas total, usar parametro interno `_tentativa = 1`)
- Step 4: Enriquecer com dados do devedor + contrato + parcelas + eventos:
  - `dbGet("devedores", "id=eq.{devedor_id}")` — BIGINT id
  - `dbGet("contratos", "id=eq.{contrato_id}")` — UUID id
  - `dbGet("parcelas", "contrato_id=eq.{contrato_id}&order=numero_parcela.asc")`
  - `dbGet("eventos_andamento", "contrato_id=eq.{contrato_id}&order=data_evento.desc")`
- Retornar `{ success: true, data: { fila: updated[0], devedor, contrato, parcelas, eventos }, error: null }`

**Funcao 4: registrarEvento(contratoId, operadorId, dadosEvento)**
- `dadosEvento` = `{ tipo_evento, descricao?, telefone_usado?, data_promessa?, giro_carteira_dias? }`
- Inserir evento: `dbInsert("eventos_andamento", { contrato_id: contratoId, operador_id: operadorId, ...dadosEvento, data_evento: new Date().toISOString() })`
- Se `tipo_evento === "PROMESSA_PAGAMENTO"` e `data_promessa` presente:
  - Atualizar fila_cobranca.bloqueado_ate: `sb("fila_cobranca", "PATCH", { bloqueado_ate: dadosEvento.data_promessa, status_fila: "ACIONADO", updated_at: new Date().toISOString() }, "?contrato_id=eq.{contratoId}&status_fila=eq.EM_ATENDIMENTO")`
- Se `tipo_evento === "ACORDO"`:
  - Atualizar contrato estagio: `sb("contratos", "PATCH", { estagio: "FINALIZADO", updated_at: new Date().toISOString() }, "?id=eq.{contratoId}")`
  - Remover da fila: `sb("fila_cobranca", "PATCH", { status_fila: "REMOVIDO", updated_at: new Date().toISOString() }, "?contrato_id=eq.{contratoId}")`
- Se `giro_carteira_dias > 0` e tipo_evento nao e PROMESSA_PAGAMENTO e nao e ACORDO:
  - Calcular bloqueado_ate = hoje + giro_carteira_dias
  - `sb("fila_cobranca", "PATCH", { bloqueado_ate, status_fila: "ACIONADO", updated_at: ... }, "?contrato_id=eq.{contratoId}")`
- Retornar `{ success: true, data: evento_inserido, error: null }`

**Funcao 5: reciclarContratos(filtros, equipeId)**
- `filtros` = `{ estagio?, dias_sem_contato? }` (opcionais)
- Step 1: Buscar contrato_ids ativos na fila: `dbGet("fila_cobranca", "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)")`
- Step 2: Buscar contratos NOT IN fila:
  - Se ha ids na fila: `dbGet("contratos", "select=*&estagio=eq.ANDAMENTO&id=not.in.(${ids.join(',')})")`
  - Senao: `dbGet("contratos", "select=*&estagio=eq.ANDAMENTO")`
- Step 3: Aplicar filtros adicionais no JS se `filtros.dias_sem_contato` presente (buscar ultimo evento de cada contrato e filtrar)
- Step 4: Inserir cada contrato reciclado na fila:
  ```javascript
  dbInsert("fila_cobranca", { contrato_id, devedor_id, equipe_id: equipeId || null, status_fila: "AGUARDANDO", score_prioridade: 0 })
  ```
- Step 5: Calcular score para cada novo item
- Retornar `{ success: true, data: { reciclados: array_dos_inseridos }, error: null }`

**Funcao 6: removerDaFila(filaId, motivo, usuarioId)**
- Atualizar status: `dbUpdate("fila_cobranca", filaId, { status_fila: "REMOVIDO", updated_at: new Date().toISOString() })`
  - (dbUpdate funciona aqui pois filtra apenas por id, que e suficiente)
- Registrar evento de remocao: `dbInsert("eventos_andamento", { contrato_id: buscar_do_fila_item, operador_id: usuarioId, tipo_evento: "SEM_CONTATO", descricao: "Removido da fila: " + motivo, data_evento: new Date().toISOString() })`
  - Antes do insert, buscar o contrato_id do fila_cobranca item: `dbGet("fila_cobranca", "select=contrato_id&id=eq.{filaId}")`
- Retornar `{ success: true, data: resultado_update, error: null }`

**Funcao 7: atualizarValoresAtrasados()**
- Buscar contratos ativos: `dbGet("contratos", "select=id,valor_original,data_criacao&estagio=in.(NOVO,ANDAMENTO)")`
- Para cada contrato:
  - `const dataInicio = contrato.data_criacao.slice(0, 10)`
  - `const dataFim = new Date().toISOString().slice(0, 10)`
  - `const fator = calcularFatorCorrecao("igpm", dataInicio, dataFim)` (IGPM como default per Claude's Discretion)
  - `const valorAtualizado = (contrato.valor_original * fator).toFixed(2)`
  - `dbUpdate("contratos", contrato.id, { valor_atualizado: valorAtualizado, updated_at: new Date().toISOString() })`
- Retornar `{ success: true, data: { atualizados: count }, error: null }`

**Export final:**
```javascript
export const filaDevedor = {
  calcularScorePrioridade,
  entrarNaFila,
  proximoDevedor,
  registrarEvento,
  reciclarContratos,
  removerDaFila,
  atualizarValoresAtrasados,
};
```
  </action>
  <verify>
    <automated>node -e "import('./src/mr-3/mr-cobrancas/src/services/filaDevedor.js').then(m => { const fns = Object.keys(m.filaDevedor); console.log('Functions:', fns.length, fns); if(fns.length !== 7) process.exit(1); console.log('PASS'); })" 2>&1 || echo "FAIL: module load check"</automated>
  </verify>
  <done>
    - filaDevedor.js existe em src/mr-3/mr-cobrancas/src/services/
    - Exporta objeto `filaDevedor` com exatamente 7 funcoes
    - Todas retornam { success, data, error } com try/catch
    - proximoDevedor usa sb() direto para lock otimista (NAO dbUpdate)
    - atualizarValoresAtrasados importa e usa calcularFatorCorrecao
    - reciclarContratos usa not.in.() para excluir contratos ja na fila
    - registrarEvento seta bloqueado_ate para PROMESSA_PAGAMENTO
  </done>
</task>

<task type="auto">
  <name>Task 2: Criar script de teste real contra Supabase</name>
  <files>src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js</files>
  <action>
Criar `filaDevedor.test.js` — script Node.js executavel que testa o fluxo completo contra o Supabase real.

**Abordagem de acesso:** Usar a mesma abordagem do service — importar `sb`, `dbGet`, `dbInsert`, `dbDelete` de `../config/supabase.js` diretamente. O client usa a anon key que ja tem permissao via RLS allow_all.

**Estrutura do script:**

```javascript
import { dbGet, dbInsert, dbDelete, sb } from "../config/supabase.js";
import { filaDevedor } from "./filaDevedor.js";

// IDs de teste (para cleanup)
const testIds = { devedor: null, contrato: null, parcelas: [], filaItems: [], eventos: [] };

async function setup() {
  // 1. Buscar um devedor existente para lookup (nao criar — tabela legada BIGINT)
  const devedores = await dbGet("devedores", "select=id,nome&limit=1");
  if (!devedores.length) throw new Error("Nenhum devedor encontrado para teste");
  testIds.devedor = devedores[0].id;
  console.log(`[SETUP] Usando devedor existente: id=${testIds.devedor}`);

  // 2. Criar contrato de teste
  const contrato = await dbInsert("contratos", {
    devedor_id: testIds.devedor,
    numero_contrato: "TEST-FILA-" + Date.now(),
    valor_original: 5000.00,
    estagio: "ANDAMENTO"
  });
  testIds.contrato = contrato[0]?.id || contrato.id;
  console.log(`[SETUP] Contrato criado: ${testIds.contrato}`);

  // 3. Criar 2 parcelas de teste (1 ATRASADA, 1 ABERTA)
  const p1 = await dbInsert("parcelas", {
    contrato_id: testIds.contrato,
    numero_parcela: 1,
    valor: 2500.00,
    data_vencimento: "2025-01-15",
    status: "ATRASADA"
  });
  testIds.parcelas.push(p1[0]?.id || p1.id);

  const p2 = await dbInsert("parcelas", {
    contrato_id: testIds.contrato,
    numero_parcela: 2,
    valor: 2500.00,
    data_vencimento: "2026-06-15",
    status: "ABERTA"
  });
  testIds.parcelas.push(p2[0]?.id || p2.id);
  console.log(`[SETUP] 2 parcelas criadas`);
}

async function cleanup() {
  console.log("\n[CLEANUP] Removendo dados de teste...");
  // Ordem: eventos -> fila -> parcelas -> contrato (FK cascade)
  for (const id of testIds.eventos) {
    await dbDelete("eventos_andamento", id).catch(() => {});
  }
  // Limpar fila items do contrato
  const filaItems = await dbGet("fila_cobranca", `contrato_id=eq.${testIds.contrato}`).catch(() => []);
  for (const item of filaItems) {
    await dbDelete("fila_cobranca", item.id).catch(() => {});
  }
  for (const id of testIds.parcelas) {
    await dbDelete("parcelas", id).catch(() => {});
  }
  if (testIds.contrato) {
    await dbDelete("contratos", testIds.contrato).catch(() => {});
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

  // TEST 2: proximoDevedor (sem operador real, usar UUID fake)
  console.log("\n--- TEST 2: proximoDevedor ---");
  const fakeOperadorId = "00000000-0000-0000-0000-000000000001";
  const r2 = await filaDevedor.proximoDevedor(fakeOperadorId);
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
  const r3 = await filaDevedor.registrarEvento(testIds.contrato, fakeOperadorId, {
    tipo_evento: "PROMESSA_PAGAMENTO",
    descricao: "Teste automatizado - promessa de pagamento",
    data_promessa: dataPromessa,
    giro_carteira_dias: 7
  });
  assert("retorno success", r3.success === true);
  assert("evento criado com dados", !!r3.data);
  if (r3.data) {
    testIds.eventos.push(r3.data.id || (Array.isArray(r3.data) ? r3.data[0]?.id : null));
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
    const r5 = await filaDevedor.removerDaFila(filaParaRemover[0].id, "Teste automatizado", fakeOperadorId);
    assert("retorno success", r5.success === true);
    // Verificar status REMOVIDO
    const filaRemovida = await dbGet("fila_cobranca", `id=eq.${filaParaRemover[0].id}`);
    assert("status_fila = REMOVIDO", filaRemovida[0]?.status_fila === "REMOVIDO");
  }
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
```

**Pontos criticos do script:**
- NAO criar devedor (tabela legada BIGINT autoincrement) — buscar um existente com `limit=1`
- dbInsert retorna array (Prefer: return=representation) — acessar `[0].id`
- Cleanup robusto: usar `.catch(() => {})` em cada delete para nao falhar se item ja foi removido
- Ordem de cleanup respeita FKs: eventos -> fila -> parcelas -> contrato
- Usar UUID fake para operadorId (a FK para operadores permite null, mas o campo aceita UUID)
  </action>
  <verify>
    <automated>cd src/mr-3/mr-cobrancas && node src/services/filaDevedor.test.js 2>&1 | tail -5</automated>
  </verify>
  <done>
    - Script existe em src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js
    - Executa via `node filaDevedor.test.js` sem erros de sintaxe
    - Cria dados de teste (contrato + 2 parcelas)
    - Executa entrarNaFila -> proximoDevedor -> registrarEvento(PROMESSA_PAGAMENTO)
    - Verifica que bloqueado_ate foi setado apos PROMESSA_PAGAMENTO
    - Testa calcularScorePrioridade e removerDaFila
    - Limpa todos os dados de teste ao final
    - Print PASS/FAIL por step com contagem final
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| service -> Supabase REST | Dados enviados via fetch para PostgREST |
| operadorId input | UUID recebido como parametro, usado em queries |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-dne-01 | Spoofing | proximoDevedor(operadorId) | accept | operadorId validado na camada de UI/auth, service e interno |
| T-dne-02 | Tampering | lock otimista | mitigate | PATCH com filtro composto (id + status_fila) garante atomicidade |
| T-dne-03 | Repudiation | registrarEvento | mitigate | Todos eventos gravados com operador_id e data_evento |
| T-dne-04 | DoS | entrarNaFila / atualizarValoresAtrasados | accept | Funcoes batch internas, nao expostas diretamente a usuario final |
</threat_model>

<verification>
1. `filaDevedor.js` importa de `../config/supabase.js` e `../utils/correcao.js`
2. Objeto exportado `filaDevedor` tem exatamente 7 chaves
3. Nenhuma funcao usa `dbUpdate` para filtros compostos — usa `sb()` direto
4. Script de teste executa sem erros e mostra PASS/FAIL
5. Dados de teste sao limpos ao final (verificar via dbGet que contrato nao existe)
</verification>

<success_criteria>
- filaDevedor.js com 7 funcoes funcionais contra Supabase real
- Script de teste passa todos os steps (0 FAIL)
- Lock otimista em proximoDevedor funciona corretamente
- bloqueado_ate setado apos PROMESSA_PAGAMENTO
- Cleanup remove todos os dados de teste
</success_criteria>

<output>
After completion, create `.planning/quick/260417-dne-fase02-fila-devedor-backend-logica-servi/260417-dne-SUMMARY.md`
</output>
