/**
 * Phase 7.13 — Test trivial helper dividasPorDevedorIncluindoSolidarios (D-pre-6 fix 07.13f.bug)
 *
 * Defesa contra regressão silenciosa do helper paralelo (lição
 * memory/feedback_shields_wrapper_must_test_equivalence.md):
 * helper que faz fan-out 1:N via junction precisa shield específico.
 *
 * 3 it() blocks:
 *   - Caso simples 1 devedor + 1 dívida (PRINCIPAL via junction) → Map com 1 entry.
 *   - Fan-out 1:N (PRINCIPAL+FIADOR) → Map com 2 entries, mesma dívida em ambas.
 *   - Fallback sem junction (devedor sem rows) → ausente do Map (caller faz fallback).
 *
 * Roda junto da regressão via `npm run test:regressao`.
 */

import { describe, it, expect } from 'vitest';
import { dividasPorDevedorIncluindoSolidarios } from '../../utils/dividasPorDevedorIncluindoSolidarios.js';

describe('dividasPorDevedorIncluindoSolidarios — fan-out 1:N via junction (Phase 7.13 D-pre-6 fix)', () => {
  it('caso simples: 1 devedor + 1 dívida (PRINCIPAL) → Map com 1 entry', () => {
    const devedores = [{ id: 100, dividas: [{ id: 'd1', valor_total: 1000 }] }];
    const junction = [{ devedor_id: 100, divida_id: 'd1', papel: 'PRINCIPAL' }];
    const result = dividasPorDevedorIncluindoSolidarios(devedores, junction);
    expect(result.size).toBe(1);
    expect(result.get('100')).toHaveLength(1);
    expect(result.get('100')[0].id).toBe('d1');
  });

  it('fan-out: 1 dívida com 2 devedores → Map com 2 entries, mesma dívida em ambas', () => {
    const devedores = [
      { id: 100, dividas: [{ id: 'd1', valor_total: 1000 }] },
      { id: 200, dividas: [] },  // FIADOR sem dividas.devedor_id legacy
    ];
    const junction = [
      { devedor_id: 100, divida_id: 'd1', papel: 'PRINCIPAL' },
      { devedor_id: 200, divida_id: 'd1', papel: 'FIADOR' },
    ];
    const result = dividasPorDevedorIncluindoSolidarios(devedores, junction);
    expect(result.size).toBe(2);
    expect(result.get('100')).toHaveLength(1);
    expect(result.get('200')).toHaveLength(1);
    expect(result.get('200')[0].id).toBe('d1'); // FIADOR vê dívida do PRINCIPAL
  });

  it('fallback sem junction: devedor sem rows na junction → ausente do Map', () => {
    const devedores = [{ id: 999, dividas: [] }];
    const junction = [];  // zero rows
    const result = dividasPorDevedorIncluindoSolidarios(devedores, junction);
    expect(result.has('999')).toBe(false);
  });
});
