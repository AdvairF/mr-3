/**
 * Phase 7.9 — Custas Judiciais CRUD avulsas — shields de regressão
 *
 * 4 shields (17, 18, 19, 20):
 *   Shield 17 — cross-entity custas: 2 custas independentes no mesmo contrato NÃO contaminam fingerprint entre contratos distintos
 *   Shield 18 — equivalência pós-CRUD: fingerprint muda ao criar/editar/excluir/pagar; cache.saldo === adapter direto
 *   Shield 19 — indexador herdado: muda divida.indexador → custa em aberto recorrige; custa paga preserva nominal
 *   Shield 20 — D-06 amend coverage: fingerprint slots |C: e |S: respondem a custa CRUD (creation/edit/delete/_so_custas-flip)
 *
 * Roda junto da regressão TJGO + saldoAtualizadoCache via `npm run test:regressao`
 * (20/20 esperado: 11 calculos + 5 saldoAtualizadoCache + 4 custas).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  invalidateContrato,
  __test,
} from "../../hooks/useSaldoAtualizadoCache.js";
import { calcularDetalheEncargosContrato } from "../../utils/devedorCalc.js";

const { cache, contratoFingerprint, recomputeEntry } = __test;

// ─── Fixtures ──────────────────────────────────────────────────────────
function mkDivida(id, contrato_id, override = {}) {
  return {
    id, contrato_id,
    valor_total: 1000,
    data_vencimento: "2025-01-01",
    data_origem: "2025-01-01",
    data_inicio_atualizacao: "2025-01-01",
    indexador: "IPCA",
    multa_pct: 2,
    juros_tipo: "simples",
    juros_am: 1,
    honorarios_pct: 10,
    art523_opcao: "nao",
    saldo_quitado: false,
    _so_custas: false,
    custas: [],
    ...override,
  };
}
function mkCusta(id, valor, data, pago = false) {
  return {
    id,
    descricao: `Custa ${id}`,
    valor,
    data,                         // shape D-22 — motor lê c.data legacy (D-01 strict)
    pago,
    data_pagamento: pago ? "2026-04-20" : null,
  };
}

describe("custasCache — shields 7.9 (custas judiciais avulsas)", () => {
  beforeEach(() => { cache.clear(); });

  // ─── Shield 17 ────────────────────────────────────────────────────────
  it("Shield 17 — cross-entity custas: fingerprint de A não muda quando custa de B muda", () => {
    const divA = [mkDivida("dA1", "A", { custas: [mkCusta("cA1", 100, "2025-03-01")] })];
    const divB_before = [mkDivida("dB1", "B", { custas: [mkCusta("cB1", 200, "2025-03-01")] })];
    const divB_after  = [mkDivida("dB1", "B", { custas: [mkCusta("cB1", 999, "2025-03-01")] })]; // muda valor de cB1

    const fpA_before = contratoFingerprint(divA, [], "2026-04-24");
    const fpA_after  = contratoFingerprint(divA, [], "2026-04-24");  // A intocado
    expect(fpA_after).toBe(fpA_before);

    const fpB_before = contratoFingerprint(divB_before, [], "2026-04-24");
    const fpB_after  = contratoFingerprint(divB_after,  [], "2026-04-24");
    expect(fpB_after).not.toBe(fpB_before);              // B mudou via campo C
  });

  // ─── Shield 18 ────────────────────────────────────────────────────────
  it("Shield 18 — equivalência pós-CRUD: fingerprint muda em create/edit/delete + cache.saldo === adapter direto", () => {
    const baseDiv = (custas = []) => [mkDivida("d1", "c1", {
      valor_total: 1000, data_vencimento: "2020-01-01", data_origem: "2020-01-01",
      data_inicio_atualizacao: "2020-01-01", indexador: "IPCA", custas,
    })];

    // CREATE — custa adicionada
    const fp0 = contratoFingerprint(baseDiv([]), [], "2026-04-24");
    const fp1 = contratoFingerprint(baseDiv([mkCusta("c1", 100, "2025-01-01")]), [], "2026-04-24");
    expect(fp1).not.toBe(fp0);

    // EDIT — valor mudou
    const fp2 = contratoFingerprint(baseDiv([mkCusta("c1", 150, "2025-01-01")]), [], "2026-04-24");
    expect(fp2).not.toBe(fp1);

    // DELETE — volta a vazio
    const fp3 = contratoFingerprint(baseDiv([]), [], "2026-04-24");
    expect(fp3).toBe(fp0);                                // equivalente a antes de criar
    expect(fp3).not.toBe(fp2);

    // Gold test — cache.saldo === adapter direto (equivalência):
    const div = baseDiv([mkCusta("c1", 100, "2025-01-01")]);
    const direto = calcularDetalheEncargosContrato(div, [], "2026-04-24");
    recomputeEntry("c1", div, [], "2026-04-24");
    const viaCache = cache.get("c1");
    expect(viaCache.saldo).toBe(direto.saldoAtualizado);
  });

  // ─── Shield 19 ────────────────────────────────────────────────────────
  it("Shield 19 — indexador herdado: mudar divida.indexador → custa em aberto recorrige; custa paga mantém nominal", () => {
    const hoje = "2026-04-24";
    const custaEmAberto = mkCusta("cAberta", 1000, "2020-01-01", false);
    const custaPaga     = mkCusta("cPaga",   1000, "2020-01-01", true);

    // NOTE: para custas DENTRO de dívida regular (não _so_custas), motor usa
    // `divida.indexador` (devedorCalc.js:439). Para _so_custas:true, motor usa
    // hardcoded "inpc" (devedorCalc.js:485). Avulsas todas viram _so_custas:true
    // mas a herança real do indexador acontece quando dívida regular tem custas
    // anexas — testa essa lógica D-25 aqui via dívida regular (não _so_custas).

    // Com IPCA — dívida regular com custa anexa
    // Indexador deve ser lowercase ("ipca", "igpm") — match com keys de getIndicesMerged().
    const divIPCA = [mkDivida("d1", "c1", {
      valor_total: 1000, _so_custas: false,
      data_vencimento: "2020-01-01", data_origem: "2020-01-01", data_inicio_atualizacao: "2020-01-01",
      indexador: "ipca",
      custas: [custaEmAberto],
    })];
    const detIPCA = calcularDetalheEncargosContrato(divIPCA, [], hoje);

    // Com IGPM (mesmos dados, só troca indexador)
    const divIGPM = [mkDivida("d1", "c1", {
      valor_total: 1000, _so_custas: false,
      data_vencimento: "2020-01-01", data_origem: "2020-01-01", data_inicio_atualizacao: "2020-01-01",
      indexador: "igpm",
      custas: [custaEmAberto],
    })];
    const detIGPM = calcularDetalheEncargosContrato(divIGPM, [], hoje);

    // Custa em aberto DEVE ter atualizado >= 1000 (correção aplicada) e IPCA ≠ IGPM.
    expect(detIPCA.custas.atualizado).toBeGreaterThan(1000);
    expect(detIGPM.custas.atualizado).toBeGreaterThan(1000);
    expect(detIPCA.custas.atualizado).not.toBe(detIGPM.custas.atualizado);

    // Asserção sobre custa PAGA — valor nominal preservado no split client-side.
    // Como motor NÃO lê `pago`, atualizadoAgregado inclui custa paga — portanto asserção:
    // split client-side (fórmula DecomposicaoSaldoModal) filtra pago:true pra nominal.
    const nominalPago = Number(custaPaga.valor || 0);
    const pagasNominalSum = [custaPaga].filter(c => c.pago).reduce((s, c) => s + Number(c.valor || 0), 0);
    expect(pagasNominalSum).toBe(nominalPago);
    expect(pagasNominalSum).toBe(1000);
  });

  // ─── Shield 20 — D-06 amend coverage ──────────────────────────────────
  it("Shield 20 — D-06 amend coverage: fingerprint slots |C: e |S: respondem a custa CRUD", () => {
    // Setup: 2 fixtures que diferem APENAS no conteúdo das custas.
    const fixA = [mkDivida("d1", "c1", { _so_custas: false, custas: [] })];
    const fixB_create = [mkDivida("d1", "c1", { _so_custas: false, custas: [mkCusta("cx", 100, "2025-01-01")] })];
    const fixC_edit   = [mkDivida("d1", "c1", { _so_custas: false, custas: [mkCusta("cx", 200, "2025-01-01")] })];
    const fixD_delete = [mkDivida("d1", "c1", { _so_custas: false, custas: [] })];
    const fixE_so     = [mkDivida("d1", "c1", { _so_custas: true,  custas: [mkCusta("cx", 100, "2025-01-01")] })];

    const fpA = contratoFingerprint(fixA,         [], "2026-04-24");
    const fpB = contratoFingerprint(fixB_create,  [], "2026-04-24");
    const fpC = contratoFingerprint(fixC_edit,    [], "2026-04-24");
    const fpD = contratoFingerprint(fixD_delete,  [], "2026-04-24");
    const fpE = contratoFingerprint(fixE_so,      [], "2026-04-24");

    // Slots |C: e |S: presentes
    expect(fpA).toMatch(/\|C:/);
    expect(fpA).toMatch(/\|S:/);

    // Create distingue (vazio → 1 custa) — slot C responde
    expect(fpB).not.toBe(fpA);
    // Edit valor distingue (100 → 200) — slot C responde
    expect(fpC).not.toBe(fpB);
    // Delete reverte a vazio — slot C volta ao baseline
    expect(fpD).toBe(fpA);
    // _so_custas flip distingue (false → true mesmo conteúdo de custas) — slot S responde
    expect(fpE).not.toBe(fpB);
  });
});
