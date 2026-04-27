/**
 * Phase 7.14 — Sub-item 3 (D-pre-7 + D-pre-10)
 *
 * Testes dos guards de criarContrato em services/contratos.js:
 *   - guard 1: throwa se !payload.devedor_id
 *   - guard 2: throwa se !payload.credor_id
 *
 * Defense in depth — service-layer protege INSERT mesmo quando UI bypassed.
 *
 * Pattern reference: devedoresDividasContrato.test.js (Phase 7.13).
 * Test framework: vitest 4.1.4.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDbInsert = vi.fn();
const mockSb = vi.fn();
const mockDbGet = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbDelete = vi.fn();

vi.mock('../../config/supabase.js', () => ({
  dbInsert: (...args) => mockDbInsert(...args),
  sb: (...args) => mockSb(...args),
  dbGet: (...args) => mockDbGet(...args),
  dbUpdate: (...args) => mockDbUpdate(...args),
  dbDelete: (...args) => mockDbDelete(...args),
}));

// Mock dependências indiretas de contratos.js (atualizarDivida + seedDevedoresDoContrato).
// Não são exercitadas nos testes de guard, mas vi.mock precisa retornar export válido
// para evitar import resolution error.
vi.mock('../dividas.js', () => ({
  atualizarDivida: vi.fn(),
}));
vi.mock('../devedoresDividas.js', () => ({
  seedDevedoresDoContrato: vi.fn(),
}));

describe('criarContrato — service guards (Phase 7.14 D-pre-7/D-pre-10)', () => {
  beforeEach(() => {
    mockDbInsert.mockReset();
    mockSb.mockReset();
    mockDbGet.mockReset();
    mockDbUpdate.mockReset();
    mockDbDelete.mockReset();
  });

  it('throwa Error semântico se devedor_id é null', async () => {
    const { criarContrato } = await import('../contratos.js');
    await expect(
      criarContrato({ devedor_id: null, credor_id: 1 })
    ).rejects.toThrow(/devedor_id obrigatório/);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('throwa Error semântico se credor_id é null', async () => {
    const { criarContrato } = await import('../contratos.js');
    await expect(
      criarContrato({ devedor_id: 1, credor_id: null })
    ).rejects.toThrow(/credor_id obrigatório/);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('throwa Error semântico se devedor_id é undefined', async () => {
    const { criarContrato } = await import('../contratos.js');
    await expect(
      criarContrato({ credor_id: 1 })
    ).rejects.toThrow(/devedor_id obrigatório/);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it('payload válido (ambos ids presentes) NÃO throwa e chama dbInsert', async () => {
    mockDbInsert.mockResolvedValue([{ id: 'contrato-novo-1' }]);
    const { criarContrato } = await import('../contratos.js');
    const res = await criarContrato({ devedor_id: 1, credor_id: 2, referencia: 'teste' });
    // Plan-sanctioned alternative (lines 359-361):
    // mockDbInsert é chamado também por registrarEvento (fire-and-forget) DEPOIS do INSERT principal.
    // Asserção foca na PRIMEIRA chamada (que é a do contrato), via mock.calls[0].
    expect(mockDbInsert).toHaveBeenCalled();
    expect(mockDbInsert.mock.calls[0]).toEqual([
      'contratos_dividas',
      expect.objectContaining({ devedor_id: 1, credor_id: 2 }),
    ]);
    expect(res).toEqual([{ id: 'contrato-novo-1' }]);
  });
});
