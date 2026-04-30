import { describe, it, expect } from "vitest";
import { calcularValorAtualizadoCustasAvulsas } from "../custasAvulsas.js";
import { calcularDetalheEncargos } from "../devedorCalc.js";
import { calcularFatorCorrecao } from "../correcao.js";

const HOJE = "2026-05-01";
const DATA_ANTIGA = "2024-01-15";

describe("calcularValorAtualizadoCustasAvulsas", () => {
  it("Test 1 — custa única SEM data: original === atualizado === valor puro", () => {
    const custas = [{ valor: "100.00" }];
    const result = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(result.original).toBe(100);
    expect(result.atualizado).toBe(100);
  });

  it("Test 2 — custa única COM c.data antiga: original === valor; atualizado === vc * fator INPC", () => {
    const custas = [{ valor: "100.00", data: DATA_ANTIGA }];
    const fator = calcularFatorCorrecao("inpc", DATA_ANTIGA, HOJE);
    expect(fator).toBeGreaterThan(1);
    const result = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(result.original).toBe(100);
    expect(result.atualizado).toBeCloseTo(100 * fator, 9);
    expect(result.atualizado).toBeGreaterThan(result.original);
  });

  it("Test 3 — custas múltiplas mix (com/sem data): soma cumulativa em ambos", () => {
    const custas = [
      { valor: "100.00", data: DATA_ANTIGA },
      { valor: "50.00" },
      { valor: "25.50", data: DATA_ANTIGA },
    ];
    const fator = calcularFatorCorrecao("inpc", DATA_ANTIGA, HOJE);
    const result = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(result.original).toBe(100 + 50 + 25.5);
    expect(result.atualizado).toBeCloseTo(100 * fator + 50 + 25.5 * fator, 9);
  });

  it("Test 4 — valor inválido ('', null, undefined, 'abc'): ignora (parseFloat||0 → 0)", () => {
    const custas = [
      { valor: "" },
      { valor: null },
      { valor: undefined },
      { valor: "abc" },
      { valor: "10.00" },
    ];
    const result = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(result.original).toBe(10);
    expect(result.atualizado).toBe(10);
    expect(Number.isNaN(result.original)).toBe(false);
    expect(Number.isNaN(result.atualizado)).toBe(false);
  });

  it("Test 5 — c.pago=true: contribui normal em ambos (D-pre-5: NÃO filtra)", () => {
    const custasPago = [{ valor: "100.00", data: DATA_ANTIGA, pago: true }];
    const custasNaoPago = [{ valor: "100.00", data: DATA_ANTIGA, pago: false }];
    const resultPago = calcularValorAtualizadoCustasAvulsas(custasPago, HOJE);
    const resultNaoPago = calcularValorAtualizadoCustasAvulsas(custasNaoPago, HOJE);
    expect(resultPago.original).toBe(resultNaoPago.original);
    expect(resultPago.atualizado).toBeCloseTo(resultNaoPago.atualizado, 9);
    expect(resultPago.original).toBeGreaterThan(0);
    expect(resultPago.atualizado).toBeGreaterThan(0);
  });

  it("Test 6 — array vazio/null/undefined/não-Array: retorna { original: 0, atualizado: 0 }", () => {
    expect(calcularValorAtualizadoCustasAvulsas([], HOJE)).toEqual({ original: 0, atualizado: 0 });
    expect(calcularValorAtualizadoCustasAvulsas(null, HOJE)).toEqual({ original: 0, atualizado: 0 });
    expect(calcularValorAtualizadoCustasAvulsas(undefined, HOJE)).toEqual({ original: 0, atualizado: 0 });
    expect(calcularValorAtualizadoCustasAvulsas("not array", HOJE)).toEqual({ original: 0, atualizado: 0 });
    expect(calcularValorAtualizadoCustasAvulsas({}, HOJE)).toEqual({ original: 0, atualizado: 0 });
  });

  it("Test 7 (parity D-pre-7) — helper === motor em .original E .atualizado, ±1e-9", () => {
    const custas = [
      { valor: "100.00", data: DATA_ANTIGA },
      { valor: "50.00" },
      { valor: "75.25", data: DATA_ANTIGA, pago: true },
    ];
    const devedor = {
      dividas: [{ id: "x", _so_custas: true, custas }],
    };
    const motorResult = calcularDetalheEncargos(devedor, [], HOJE);
    const helperResult = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(Math.abs(motorResult.custas.original - helperResult.original)).toBeLessThan(1e-9);
    expect(Math.abs(motorResult.custas.atualizado - helperResult.atualizado)).toBeLessThan(1e-9);
  });

  it("Test 8 — .original retorna soma raw (sem fator INPC) mesmo com data antiga", () => {
    const custas = [{ valor: "100.00", data: DATA_ANTIGA }];
    const result = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(result.original).toBe(100);
    const fator = calcularFatorCorrecao("inpc", DATA_ANTIGA, HOJE);
    expect(fator).toBeGreaterThan(1);
    expect(result.atualizado).toBeGreaterThan(result.original);
    expect(result.atualizado).toBeCloseTo(result.original * fator, 9);
  });
});
