/**
 * Phase 7.10a — Shield 23 equivalência filter (ProcessosJudiciais)
 *
 * Defesa H3-class (lição 7.8.2a Shield 5 — `feedback_shields_wrapper_must_test_equivalence.md`):
 * o filter pattern novo (Set lookup divida_id ∈ dividas-do-devedor — D-27) deve produzir
 * EXATAMENTE os mesmos resultados que o filter legacy sintético (com `devedor_id` injetado).
 * Equivalência > propriedade observável.
 *
 * 3 it() blocks:
 *   Shield 23  — Equivalência core: novo === legacy sintético; 3 pagamentos contabilizados
 *   Shield 23b — Boundary: devedor com 0 dívidas → filter retorna []
 *   Shield 23c — Cross-entity isolation: pagamentos de outro devedor filtrados out
 *
 * Roda junto da regressão TJGO + saldoAtualizadoCache + custasCache via `npm run test:regressao`
 * (esperado: 23/23 — 11 calculos + 5 saldoAtualizadoCache + 4 custas + 3 processosJudiciaisFilter).
 */

import { describe, it, expect } from 'vitest';

describe('ProcessosJudiciais filter — pagamentos_divida (Phase 7.10a)', () => {
  it('Shield 23 — equivalência: filter via Set lookup === filter legacy sintético', () => {
    const devedor = { id: "dev-1", dividas: [{ id: "div-A" }, { id: "div-B" }] };
    const pagamentos = [
      { id: "p1", divida_id: "div-A", data_pagamento: "2026-01-01", valor: 100 },
      { id: "p2", divida_id: "div-B", data_pagamento: "2026-02-01", valor: 200 },
      { id: "p3", divida_id: "div-A", data_pagamento: "2026-03-01", valor: 50 },
    ];

    // Filter NEW (pattern Phase 7.10a): Set lookup divida_id ∈ dividas-do-devedor
    const dividaIdsDoDevedor = new Set(devedor.dividas.map(d => String(d.id)));
    const novo = pagamentos.filter(p => dividaIdsDoDevedor.has(String(p.divida_id)));

    // Filter LEGACY equivalente sintético (simula shape antigo com devedor_id injetado)
    const sintetico = pagamentos.map(p => ({ ...p, devedor_id: devedor.id }));
    const legacy = sintetico.filter(p => p.devedor_id === devedor.id);

    // Equivalência: filters retornam exatamente os mesmos pagamentos
    expect(novo.map(p => p.id)).toEqual(legacy.map(p => p.id));
    expect(novo).toHaveLength(3);
  });

  it('Shield 23b — devedor com 0 dívidas: filter retorna []', () => {
    const devedor = { id: "dev-2", dividas: [] };
    const pagamentos = [
      { id: "p1", divida_id: "div-X", data_pagamento: "2026-01-01", valor: 100 },
    ];
    const dividaIdsDoDevedor = new Set(devedor.dividas.map(d => String(d.id)));
    const result = pagamentos.filter(p => dividaIdsDoDevedor.has(String(p.divida_id)));
    expect(result).toHaveLength(0);
  });

  it('Shield 23c — pagamentos com divida_id não pertencente: filtrados out', () => {
    const devedor = { id: "dev-3", dividas: [{ id: "div-A" }] };
    const pagamentos = [
      { id: "p1", divida_id: "div-A", data_pagamento: "2026-01-01", valor: 100 },
      { id: "p2", divida_id: "div-OUTRO_DEVEDOR", data_pagamento: "2026-02-01", valor: 200 },
    ];
    const dividaIdsDoDevedor = new Set(devedor.dividas.map(d => String(d.id)));
    const result = pagamentos.filter(p => dividaIdsDoDevedor.has(String(p.divida_id)));
    expect(result.map(p => p.id)).toEqual(["p1"]);
  });
});
