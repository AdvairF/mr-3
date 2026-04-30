import { calcularFatorCorrecao } from "./correcao.js";

/**
 * Phase 7.10.bug2.sub1 — espelhamento UI do loop motor devedorCalc.js:479-491.
 * D-pre-5: NÃO filtra c.pago (precedente Phase 7.9 P3 + dual-semântica advogado/devedor).
 * D-pre-6: usa c.data (legacy shape D-22), não c.data_pagamento.
 * D-pre-7: parity gate (helper === motor) em test fixture.
 */
export function calcularValorAtualizadoCustasAvulsas(custas, hoje) {
  if (!Array.isArray(custas) || custas.length === 0) return 0;
  let total = 0;
  for (const c of custas) {
    const vc = parseFloat(c.valor) || 0;
    if (c.data && c.data < hoje) {
      total += vc * calcularFatorCorrecao("inpc", c.data, hoje);
    } else {
      total += vc;
    }
  }
  return total;
}
