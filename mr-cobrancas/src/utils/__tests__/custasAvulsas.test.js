import { describe, it, expect } from "vitest";
import { calcularValorAtualizadoCustasAvulsas } from "../custasAvulsas.js";
import { calcularDetalheEncargos } from "../devedorCalc.js";
import { calcularFatorCorrecao } from "../correcao.js";

const HOJE = "2026-05-01";
const DATA_ANTIGA = "2024-01-15";

describe("calcularValorAtualizadoCustasAvulsas", () => {
  it("Test 1 — custa única SEM data: soma valor puro (sem fator INPC)", () => {
    const custas = [{ valor: "100.00" }];
    expect(calcularValorAtualizadoCustasAvulsas(custas, HOJE)).toBe(100);
  });

  it("Test 2 — custa única COM c.data antiga: soma vc * fator INPC", () => {
    const custas = [{ valor: "100.00", data: DATA_ANTIGA }];
    const fator = calcularFatorCorrecao("inpc", DATA_ANTIGA, HOJE);
    const expected = 100 * fator;
    expect(fator).toBeGreaterThan(1);
    expect(calcularValorAtualizadoCustasAvulsas(custas, HOJE)).toBeCloseTo(expected, 9);
  });

  it("Test 3 — custas múltiplas mix (com/sem data): soma cumulativa", () => {
    const custas = [
      { valor: "100.00", data: DATA_ANTIGA },
      { valor: "50.00" },
      { valor: "25.50", data: DATA_ANTIGA },
    ];
    const fator = calcularFatorCorrecao("inpc", DATA_ANTIGA, HOJE);
    const expected = 100 * fator + 50 + 25.5 * fator;
    expect(calcularValorAtualizadoCustasAvulsas(custas, HOJE)).toBeCloseTo(expected, 9);
  });

  it("Test 4 — valor inválido ('', null, undefined, 'abc'): ignora (parseFloat||0 → 0)", () => {
    const custas = [
      { valor: "" },
      { valor: null },
      { valor: undefined },
      { valor: "abc" },
      { valor: "10.00" },
    ];
    const total = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(total).toBe(10);
    expect(Number.isNaN(total)).toBe(false);
  });

  it("Test 5 — c.pago=true: contribui normal (D-pre-5: NÃO filtra)", () => {
    const custasPago = [{ valor: "100.00", data: DATA_ANTIGA, pago: true }];
    const custasNaoPago = [{ valor: "100.00", data: DATA_ANTIGA, pago: false }];
    const totalPago = calcularValorAtualizadoCustasAvulsas(custasPago, HOJE);
    const totalNaoPago = calcularValorAtualizadoCustasAvulsas(custasNaoPago, HOJE);
    expect(totalPago).toBeCloseTo(totalNaoPago, 9);
    expect(totalPago).toBeGreaterThan(0);
  });

  it("Test 6 — array vazio/null/undefined/não-Array: retorna 0", () => {
    expect(calcularValorAtualizadoCustasAvulsas([], HOJE)).toBe(0);
    expect(calcularValorAtualizadoCustasAvulsas(null, HOJE)).toBe(0);
    expect(calcularValorAtualizadoCustasAvulsas(undefined, HOJE)).toBe(0);
    expect(calcularValorAtualizadoCustasAvulsas("not array", HOJE)).toBe(0);
    expect(calcularValorAtualizadoCustasAvulsas({}, HOJE)).toBe(0);
  });

  it("Test 7 (parity D-pre-7) — helper === motor calcularDetalheEncargos.custas.atualizado, ±1e-9", () => {
    const custas = [
      { valor: "100.00", data: DATA_ANTIGA },
      { valor: "50.00" },
      { valor: "75.25", data: DATA_ANTIGA, pago: true },
    ];
    const devedor = {
      dividas: [{ id: "x", _so_custas: true, custas }],
    };
    const motorResult = calcularDetalheEncargos(devedor, [], HOJE);
    const motorTotal = motorResult.custas.atualizado;
    const helperTotal = calcularValorAtualizadoCustasAvulsas(custas, HOJE);
    expect(Math.abs(motorTotal - helperTotal)).toBeLessThan(1e-9);
  });
});
