/**
 * Phase 7.13 — Test trivial helper paralelo agruparPagamentosPorDevedorIncluindoSolidarios (D-pre-6)
 *
 * Defesa contra regressão silenciosa do helper paralelo (lição
 * memory/feedback_shields_wrapper_must_test_equivalence.md):
 * helper que faz fan-out 1:N via junction precisa shield específico.
 *
 * 3 it() blocks:
 *   - Caso simples 1 PRINCIPAL: paridade com helper original (1 dívida → 1 entry).
 *   - Caso fan-out 1:N (PRINCIPAL+FIADOR): pagamento aparece em 2 entries.
 *   - Caso multi-dívida: A em 2 dívidas, B em 1 — A vê pagamentos das duas.
 *
 * Roda junto da regressão via `npm run test:regressao` (esperado: 30/30 — 28 base + 2 helper).
 */

import { describe, it, expect } from 'vitest';
import { agruparPagamentosPorDevedorIncluindoSolidarios } from '../../utils/agruparPagamentosPorDevedorIncluindoSolidarios.js';

describe('agruparPagamentosPorDevedorIncluindoSolidarios — helper paralelo (Phase 7.13 D-pre-6)', () => {
  it('caso simples 1 dívida com 1 PRINCIPAL — paridade com helper original (1 entry)', () => {
    const devedores = [{ id: 'dev-1' }];
    const pagamentos = [
      { id: 'p1', divida_id: 'div-A', valor: 100 },
      { id: 'p2', divida_id: 'div-A', valor: 50 },
    ];
    const junction = [
      { devedor_id: 'dev-1', divida_id: 'div-A', papel: 'PRINCIPAL' },
    ];
    const map = agruparPagamentosPorDevedorIncluindoSolidarios(devedores, pagamentos, junction);
    expect(map).toBeInstanceOf(Map);
    expect(map.get('dev-1')).toHaveLength(2);
    expect(map.get('dev-1').map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('fan-out 1:N — 1 dívida com PRINCIPAL+FIADOR — pagamento aparece em 2 entries (D-pre-6)', () => {
    const devedores = [{ id: 'dev-1' }, { id: 'dev-2' }];
    const pagamentos = [
      { id: 'p1', divida_id: 'div-A', valor: 100 },
    ];
    const junction = [
      { devedor_id: 'dev-1', divida_id: 'div-A', papel: 'PRINCIPAL' },
      { devedor_id: 'dev-2', divida_id: 'div-A', papel: 'FIADOR' },
    ];
    const map = agruparPagamentosPorDevedorIncluindoSolidarios(devedores, pagamentos, junction);
    expect(map.get('dev-1')).toHaveLength(1);
    expect(map.get('dev-2')).toHaveLength(1);
    expect(map.get('dev-1')[0].id).toBe('p1');
    expect(map.get('dev-2')[0].id).toBe('p1');
  });

  it('multi-dívida — devedor A em 2 dívidas, B só em 1 — fan-out preservado por dívida', () => {
    const devedores = [{ id: 'dev-A' }, { id: 'dev-B' }];
    const pagamentos = [
      { id: 'p1', divida_id: 'div-1', valor: 100 },
      { id: 'p2', divida_id: 'div-2', valor: 200 },
      { id: 'p3', divida_id: 'div-2', valor: 50 },
    ];
    const junction = [
      { devedor_id: 'dev-A', divida_id: 'div-1', papel: 'PRINCIPAL' },
      { devedor_id: 'dev-A', divida_id: 'div-2', papel: 'PRINCIPAL' },
      { devedor_id: 'dev-B', divida_id: 'div-2', papel: 'FIADOR' },
    ];
    const map = agruparPagamentosPorDevedorIncluindoSolidarios(devedores, pagamentos, junction);
    expect(map.get('dev-A')).toHaveLength(3);
    expect(map.get('dev-A').map(p => p.id).sort()).toEqual(['p1', 'p2', 'p3']);
    expect(map.get('dev-B')).toHaveLength(2);
    expect(map.get('dev-B').map(p => p.id).sort()).toEqual(['p2', 'p3']);
  });
});
