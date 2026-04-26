/**
 * Phase 7.13 — Test trivial helpers contrato-level (D-pre-10, D-pre-11, D-pre-13)
 *
 * Defesa contra regressão silenciosa de cascade fan-out + wizard pareado
 * (lição feedback_shields_wrapper_must_test_equivalence.md da 7.8.2a).
 *
 * 3 it() blocks:
 *   1. criarVinculoContratoDevedor: 12 dívidas → 12 inserts
 *   2. listarDevedoresDoContrato: 24 rows (12 dívidas × 2 devedores) → 2 entries DISTINCT
 *   3. seedDevedoresDoContrato: copia TODOS os devedores existentes do contrato pra nova dívida
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks de sb + dbGet (ambos exportados de config/supabase.js — fix audit deviation)
const mockSb = vi.fn();
const mockDbGet = vi.fn();

vi.mock('../../config/supabase.js', () => ({
  sb: (...args) => mockSb(...args),
  dbGet: (...args) => mockDbGet(...args),
}));

describe('devedoresDividas — helpers contrato-level (Phase 7.13 D-pre-10/11/13)', () => {
  beforeEach(() => {
    mockSb.mockReset();
    mockDbGet.mockReset();
  });

  it('criarVinculoContratoDevedor: 12 dívidas → 12 inserts (FIADOR, SOLIDARIA)', async () => {
    const { criarVinculoContratoDevedor } = await import('../devedoresDividas.js');
    const dividas = Array.from({ length: 12 }, (_, i) => ({ id: `div-${i + 1}` }));
    mockDbGet.mockResolvedValueOnce(dividas);   // listar dividas do contrato
    // não-PRINCIPAL: skip pre-check de PRINCIPAL existente
    mockSb.mockResolvedValue([{ id: 'inserted' }]);

    await criarVinculoContratoDevedor('contrato-X', 999, 'FIADOR');

    // 12 chamadas POST devedores_dividas
    const postCalls = mockSb.mock.calls.filter(c => c[1] === 'POST');
    expect(postCalls).toHaveLength(12);
    postCalls.forEach((call, i) => {
      expect(call[0]).toBe('devedores_dividas');
      expect(call[2]).toMatchObject({
        devedor_id: 999,
        divida_id: `div-${i + 1}`,
        papel: 'FIADOR',
        responsabilidade: 'SOLIDARIA',
      });
    });
  });

  it('listarDevedoresDoContrato: 24 rows (12 dívidas × 2 devedores) → 2 entries DISTINCT', async () => {
    const { listarDevedoresDoContrato } = await import('../devedoresDividas.js');
    mockDbGet.mockResolvedValueOnce(
      Array.from({ length: 12 }, (_, i) => ({ id: `div-${i + 1}` }))
    );
    const rows = [];
    for (let i = 1; i <= 12; i++) {
      rows.push({ devedor_id: 100, papel: 'PRINCIPAL', responsabilidade: 'SOLIDARIA' });
      rows.push({ devedor_id: 200, papel: 'FIADOR', responsabilidade: 'SOLIDARIA' });
    }
    mockSb.mockResolvedValueOnce(rows);

    const result = await listarDevedoresDoContrato('contrato-X');
    expect(result).toHaveLength(2);
    expect(result.find(r => r.devedor_id === 100).papel).toBe('PRINCIPAL');
    expect(result.find(r => r.devedor_id === 200).papel).toBe('FIADOR');
  });

  it('seedDevedoresDoContrato: copia TODOS os devedores existentes pra nova dívida', async () => {
    const { seedDevedoresDoContrato } = await import('../devedoresDividas.js');
    // listarDevedoresDoContrato retornará 2 devedores
    mockDbGet.mockResolvedValueOnce([{ id: 'div-existente-1' }]);   // dividas do contrato
    mockSb.mockResolvedValueOnce([
      { devedor_id: 100, papel: 'PRINCIPAL', responsabilidade: 'SOLIDARIA' },
      { devedor_id: 200, papel: 'FIADOR', responsabilidade: 'SOLIDARIA' },
    ]);   // listar rows distinct
    mockSb.mockResolvedValue([{ id: 'inserted' }]);   // inserts subsequentes

    await seedDevedoresDoContrato('div-NOVA', 'contrato-X');

    // 2 chamadas POST (uma por devedor)
    const postCalls = mockSb.mock.calls.filter(c => c[1] === 'POST');
    expect(postCalls).toHaveLength(2);
    expect(postCalls[0][2]).toMatchObject({ devedor_id: 100, divida_id: 'div-NOVA', papel: 'PRINCIPAL' });
    expect(postCalls[1][2]).toMatchObject({ devedor_id: 200, divida_id: 'div-NOVA', papel: 'FIADOR' });
  });
});
