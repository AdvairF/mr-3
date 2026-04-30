import { calcularFatorCorrecao } from "./correcao.js";

/**
 * Phase 7.10.bug2.sub1 — espelhamento UI do loop motor devedorCalc.js:479-491.
 * Retorna { original, atualizado } espelhando shape motor `result.custas` (devedorCalc.js:513).
 * D-pre-5: NÃO filtra c.pago (precedente Phase 7.9 P3 + dual-semântica advogado/devedor).
 * D-pre-6: usa c.data (legacy shape D-22), não c.data_pagamento.
 * D-pre-7: parity gate (helper === motor) em test fixture (.original + .atualizado).
 * Expansion mid-UAT 2026-05-01: shape { original, atualizado } pra exibir ambos em UI.
 */
export function calcularValorAtualizadoCustasAvulsas(custas, hoje) {
  if (!Array.isArray(custas) || custas.length === 0) return { original: 0, atualizado: 0 };
  let original = 0;
  let atualizado = 0;
  for (const c of custas) {
    const vc = parseFloat(c.valor) || 0;
    original += vc;
    if (c.data && c.data < hoje) {
      atualizado += vc * calcularFatorCorrecao("inpc", c.data, hoje);
    } else {
      atualizado += vc;
    }
  }
  return { original, atualizado };
}
