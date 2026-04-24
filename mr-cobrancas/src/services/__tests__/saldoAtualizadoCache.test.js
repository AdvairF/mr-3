/**
 * Phase 7.8.2a — Saldo Atualizado na Listagem (cache SWR) — shields de regressão
 *
 * 5 shields:
 *   Shield 1 — cross-entity: mudança em B não afeta fingerprint de A
 *   Shield 2 — virada de data Goiânia: fingerprint muda entre dias
 *   Shield 3 — invalidateContrato(A) não afeta B nem C
 *   Shield 4 — saldo > nominal quando divida vencida (H3 property regression)
 *   Shield 5 — wrapper cache produz mesmo resultado que adapter direto (H3 equivalence — gold test)
 *
 * Roda junto da regressão TJGO via `npm run test:regressao` (16/16 esperado:
 * 11 preexistentes + 5 novos).
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  invalidateContrato,
  __test,
} from "../../hooks/useSaldoAtualizadoCache.js";
import { calcularDetalheEncargosContrato } from "../../utils/devedorCalc.js";

const { cache, contratoFingerprint, recomputeEntry } = __test;

// Fixtures mínimas — shape compatível com calcularDetalheEncargosContrato
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
    ...override,
  };
}
function mkPag(id, divida_id, valor, data = "2025-06-01") {
  return { id, divida_id, valor, data_pagamento: data };
}

describe("saldoAtualizadoCache — shields 7.8.2a", () => {
  beforeEach(() => { cache.clear(); });

  it("Shield 1 — cross-entity: mudança em B não afeta fingerprint de A", () => {
    const divA = [mkDivida("dA1", "A")];
    const divB = [mkDivida("dB1", "B")];
    const pagsBefore = [mkPag("p1", "dA1", 100)];
    const pagsAfter  = [mkPag("p1", "dA1", 100), mkPag("p2", "dB1", 200)];

    const fpA_before = contratoFingerprint(divA, pagsBefore.filter(p => p.divida_id === "dA1"), "2026-04-24");
    const fpA_after  = contratoFingerprint(divA, pagsAfter.filter(p => p.divida_id === "dA1"),  "2026-04-24");
    expect(fpA_after).toBe(fpA_before); // A não mudou

    const fpB_before = contratoFingerprint(divB, pagsBefore.filter(p => p.divida_id === "dB1"), "2026-04-24");
    const fpB_after  = contratoFingerprint(divB, pagsAfter.filter(p => p.divida_id === "dB1"),  "2026-04-24");
    expect(fpB_after).not.toBe(fpB_before); // B mudou
  });

  it("Shield 2 — virada de data Goiânia: fingerprint muda entre dias", () => {
    const div = [mkDivida("d1", "A")];
    const fpDay1 = contratoFingerprint(div, [], "2026-04-24");
    const fpDay2 = contratoFingerprint(div, [], "2026-04-25");
    expect(fpDay1).not.toBe(fpDay2);
  });

  it("Shield 3 — invalidateContrato(A) não afeta B nem C", () => {
    cache.set("A", { saldo: 1000, detalhe: {}, fingerprint: "fpA", status: "fresh", calculadoEm: 1 });
    cache.set("B", { saldo: 2000, detalhe: {}, fingerprint: "fpB", status: "fresh", calculadoEm: 2 });
    cache.set("C", { saldo: 3000, detalhe: {}, fingerprint: "fpC", status: "fresh", calculadoEm: 3 });
    invalidateContrato("A");
    expect(cache.get("A").status).toBe("revalidating");
    expect(cache.get("B").status).toBe("fresh");
    expect(cache.get("C").status).toBe("fresh");
  });

  it("Shield 4 — saldo > nominal quando divida vencida (H3 property regression)", () => {
    const dividas = [mkDivida(10, 1, {
      valor_total: 1000,
      data_vencimento: "2020-01-01",
      data_origem: "2020-01-01",
      data_inicio_atualizacao: "2020-01-01",
      multa_pct: 2,
      juros_am: 1,
      juros_tipo: "simples",
      honorarios_pct: 10,
      indexador: "IPCA",
    })];
    recomputeEntry(1, dividas, [], "2026-04-24");
    const entry = cache.get(1);
    expect(entry).toBeDefined();
    expect(entry.status).toBe("fresh");
    expect(entry.saldo).toBeGreaterThan(1000);
  });

  it("Shield 5 — wrapper cache produz mesmo resultado que adapter direto (H3 equivalence — gold test)", () => {
    const dividas = [mkDivida(10, 1, {
      valor_total: 12000,
      data_vencimento: "2019-03-10",
      data_origem: "2019-03-10",
      data_inicio_atualizacao: "2019-03-10",
      multa_pct: 2,
      juros_am: 1,
      juros_tipo: "simples",
      indexador: "IGPM",
      honorarios_pct: 10,
    })];
    const hoje = "2026-04-24";

    const direto = calcularDetalheEncargosContrato(dividas, [], hoje);

    recomputeEntry(1, dividas, [], hoje);
    const viaCache = cache.get(1);

    // Saldo do cache deve ser IDÊNTICO ao retorno direto do adapter (não Date coerção)
    expect(viaCache.saldo).toBe(direto.saldoAtualizado);
    // E o detalhe completo do cache deve bater (gold test — teria pego H3 em CI)
    expect(viaCache.detalhe).toEqual(direto);
  });
});
