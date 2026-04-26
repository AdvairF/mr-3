/**
 * Phase 7.10bcd — Test trivial helper agruparPagamentosPorDevedor (D-31)
 *
 * Defesa contra regressão silenciosa do helper compartilhado (lição
 * memory/feedback_shields_wrapper_must_test_equivalence.md da 7.8.2a):
 * cache/wrapper compartilhado SEMPRE precisa shield próprio, não só propriedades
 * indiretas. Helper agruparPagamentosPorDevedor é compartilhado entre Devedores
 * (commit 07.10b) e Dashboard (commit 07.10d) — bug aqui propaga pra 2 consumers.
 *
 * 2 it() blocks:
 *   - Devedor com pagamentos múltiplos em 2 dívidas (caminho normal)
 *   - Devedor sem dívidas registradas (boundary — não crasha, não vira chave do Map)
 *
 * Roda junto da regressão via `npm run test:regressao` (esperado: 25/25 — 23 base 7.10a + 2 helper).
 */

import { describe, it, expect } from 'vitest';
import { agruparPagamentosPorDevedor } from '../../utils/agruparPagamentosPorDevedor.js';

describe('agruparPagamentosPorDevedor — helper compartilhado (Phase 7.10bcd D-31)', () => {
  it('devedor com pagamentos múltiplos em 2 dívidas — Map agrupa todos pelo devedor_id', () => {
    const devedores = [
      { id: "dev-1", dividas: [{ id: "div-A" }, { id: "div-B" }] }
    ];
    const pagamentos = [
      { id: "p1", divida_id: "div-A", data_pagamento: "2026-01-01", valor: 100 },
      { id: "p2", divida_id: "div-B", data_pagamento: "2026-02-01", valor: 200 },
      { id: "p3", divida_id: "div-A", data_pagamento: "2026-03-01", valor: 50 },
    ];
    const map = agruparPagamentosPorDevedor(devedores, pagamentos);
    expect(map).toBeInstanceOf(Map);
    expect(map.get("dev-1")).toHaveLength(3);
    expect(map.get("dev-1").map(p => p.id)).toEqual(["p1", "p2", "p3"]);
  });

  it('devedor sem dívidas registradas — Map vazio (não vira chave, pagamento descartado)', () => {
    const devedores = [{ id: "dev-2", dividas: [] }];
    const pagamentos = [
      { id: "p1", divida_id: "div-X", data_pagamento: "2026-01-01", valor: 100 },
    ];
    const map = agruparPagamentosPorDevedor(devedores, pagamentos);
    expect(map).toBeInstanceOf(Map);
    expect(map.has("dev-2")).toBe(false);
    expect(map.size).toBe(0);
  });
});
