/**
 * Suite de Regressão — Cálculos Financeiros TJGO
 *
 * Valida que os cálculos de correção monetária, juros, multa,
 * honorários e Art. 523 continuam alinhados com as calculadoras
 * oficiais (TJGO) a cada deploy.
 *
 * Rodar: npm run test:regressao
 * Proteção: "prebuild" no package.json garante que o build falha
 * se qualquer caso divergir além da tolerância.
 */

import { describe, it, expect } from "vitest";
import {
  calcularFatorCorrecao,
  calcularJurosArt406,
  calcularJurosArt406_12aa,
  calcularJurosAcumulados,
  calcularArt523,
} from "../../utils/correcao.js";
import { calcularSaldoDevedorAtualizado, calcularPlanilhaCompleta, calcularDetalheEncargosContrato } from "../../utils/devedorCalc.js";
import casos from "./casos-tjgo.json";

// ─── Helper: calcula caso completo a partir da entrada ───────────────────────

function calcularCasoCompleto(entrada) {
  const {
    valor_original,
    data_vencimento,
    data_calculo,
    indexador,
    juros_tipo,
    multa_pct = 0,
    honorarios_pct = 0,
    art523_opcao = "nao_aplicar",
    pagamentos_parciais = [],
  } = entrada;

  // Correção monetária
  const fator = calcularFatorCorrecao(indexador, data_vencimento, data_calculo);
  const valor_corrigido = valor_original * fator;

  // Juros sobre valor corrigido
  let juros_valor = 0;
  if (juros_tipo === "taxa_legal_406") {
    const r = calcularJurosArt406(valor_corrigido, data_vencimento, data_calculo);
    juros_valor = r.jurosTotal;
  } else if (juros_tipo === "taxa_legal_406_12") {
    const r = calcularJurosArt406_12aa(valor_corrigido, data_vencimento, data_calculo);
    juros_valor = r.jurosTotal;
  } else {
    const r = calcularJurosAcumulados({
      principal: valor_corrigido,
      dataInicio: data_vencimento,
      dataFim: data_calculo,
      jurosTipo: juros_tipo,
      jurosAM: 1,
      regime: "simples",
    });
    juros_valor = r.juros;
  }

  // Multa e honorários (incidem uma vez sobre saldo corrigido)
  const multa_valor = valor_corrigido * (multa_pct / 100);
  const honorarios_valor =
    (valor_corrigido + juros_valor + multa_valor) * (honorarios_pct / 100);

  const subtotal = valor_corrigido + juros_valor + multa_valor + honorarios_valor;

  // Art. 523 §1º CPC
  const art523 = calcularArt523(subtotal, art523_opcao);
  const total_final = subtotal + art523.total_art523;

  // Saldo com pagamentos parciais (via devedorCalc)
  const pagamentos = pagamentos_parciais.map((p) => ({
    data_pagamento: p.data,
    valor: p.valor,
  }));
  const devedor = {
    dividas: [
      {
        valor_total: valor_original,
        indexador,
        juros_tipo,
        juros_am: 0,
        multa_pct,
        honorarios_pct,
        art523_opcao,
        data_inicio_atualizacao: data_vencimento,
      },
    ],
  };
  const saldo_com_pagamentos =
    pagamentos.length > 0
      ? calcularSaldoDevedorAtualizado(devedor, pagamentos, data_calculo)
      : total_final;

  return {
    fator_correcao: fator,
    valor_corrigido,
    juros_valor,
    multa_valor,
    honorarios_valor,
    art523,
    total_final,
    saldo_com_pagamentos,
    total_pago: pagamentos.reduce((s, p) => s + parseFloat(p.valor), 0),
  };
}

// ─── Suite principal ──────────────────────────────────────────────────────────

describe("Suite Regressão TJGO — Cálculos Oficiais", () => {
  casos.forEach((caso) => {
    it(`${caso.id} — ${caso.descricao}`, () => {
      const resultado = calcularCasoCompleto(caso.entrada);
      const esperado = caso.esperado;
      const tol = caso.tolerancia_reais ?? 1.0;

      // Fator de correção exato
      if (esperado.fator_correcao != null) {
        expect(resultado.fator_correcao).toBeCloseTo(esperado.fator_correcao, 2);
      }

      // Fator nunca menor que (piso zero / sem deflação)
      if (esperado.fator_nunca_menor_que != null) {
        expect(resultado.fator_correcao).toBeGreaterThanOrEqual(
          esperado.fator_nunca_menor_que
        );
      }

      // Valor corrigido com tolerância
      if (esperado.valor_corrigido != null) {
        const diff = Math.abs(resultado.valor_corrigido - esperado.valor_corrigido);
        expect(diff).toBeLessThanOrEqual(tol);
      }

      // Juros com tolerância
      if (esperado.juros_valor != null) {
        const diff = Math.abs(resultado.juros_valor - esperado.juros_valor);
        expect(diff).toBeLessThanOrEqual(tol);
      }

      // Total final exato com tolerância
      if (esperado.total_final != null) {
        const diff = Math.abs(resultado.total_final - esperado.total_final);
        expect(diff).toBeLessThanOrEqual(tol);
      }

      // Total final em faixa (min/max)
      if (esperado.total_final_min != null) {
        expect(resultado.total_final).toBeGreaterThanOrEqual(esperado.total_final_min);
      }
      if (esperado.total_final_max != null) {
        expect(resultado.total_final).toBeLessThanOrEqual(esperado.total_final_max);
      }

      // Art. 523 — faixas de multa e honorários
      if (esperado.art523_multa_min != null) {
        expect(resultado.art523.multa).toBeGreaterThanOrEqual(esperado.art523_multa_min);
      }
      if (esperado.art523_multa_max != null) {
        expect(resultado.art523.multa).toBeLessThanOrEqual(esperado.art523_multa_max);
      }
      if (esperado.art523_honorarios_min != null) {
        expect(resultado.art523.honorarios_sucumbenciais).toBeGreaterThanOrEqual(
          esperado.art523_honorarios_min
        );
      }
      if (esperado.art523_honorarios_max != null) {
        expect(resultado.art523.honorarios_sucumbenciais).toBeLessThanOrEqual(
          esperado.art523_honorarios_max
        );
      }

      // Pagamentos parciais
      if (esperado.total_pago != null) {
        expect(resultado.total_pago).toBe(esperado.total_pago);
      }
      if (esperado.saldo_menor_que_sem_pagamentos) {
        const semPagamentos = calcularCasoCompleto({
          ...caso.entrada,
          pagamentos_parciais: [],
        });
        expect(resultado.saldo_com_pagamentos).toBeLessThan(semPagamentos.total_final);
      }

      // Motor unificado: calcularPlanilhaCompleta deve coincidir com calcularSaldoDevedorAtualizado
      if (esperado.planilha_saldo_igual_saldo_devedor) {
        const { data_vencimento, valor_original, indexador, juros_tipo, multa_pct = 0, honorarios_pct = 0, art523_opcao = "nao_aplicar", pagamentos_parciais = [] } = caso.entrada;
        const devedor = { dividas: [{ valor_total: valor_original, indexador, juros_tipo, juros_am: 0, multa_pct, honorarios_pct, art523_opcao, data_inicio_atualizacao: data_vencimento }] };
        const pagamentos = pagamentos_parciais.map(p => ({ data_pagamento: p.data, valor: p.valor }));
        const saldoRef = calcularSaldoDevedorAtualizado(devedor, pagamentos, caso.entrada.data_calculo);
        const planilha = calcularPlanilhaCompleta(devedor, pagamentos, caso.entrada.data_calculo);
        expect(Math.abs(planilha.resumo.saldo_devedor_final - saldoRef)).toBeLessThanOrEqual(0.02);
      }
    });
  });
});

// ─── SHIELD: adapter contrato-level (Phase 7.8, D-03) ────────────────────────
// Valida APENAS o adapter (wrapping thin). Motor Art.354 já validado pelos 9
// casos TJGO acima. Contrato mínimo: devedor vazio → shape válido com zeros.

describe("calcularDetalheEncargosContrato (adapter contrato-level, Phase 7.8)", () => {
  it("retorna shape válido com zeros para contrato vazio", () => {
    const r = calcularDetalheEncargosContrato([], [], "2026-04-24");
    expect(r).toBeTypeOf("object");
    expect(r.valorOriginal).toBe(0);
    expect(r.saldoAtualizado).toBe(0);
    expect(r.totalEncargos).toBe(0);
    expect(r.totalPago).toBe(0);
    expect(Array.isArray(r.detalhePorDivida)).toBe(true);
    expect(r.detalhePorDivida).toHaveLength(0);
  });

  // Phase 7.8.1 — shield do bugfix de regressão crítica em prod.
  // Adapter sempre recebe pagamentos_divida GLOBAL (todos os contratos) do caller
  // DetalheContrato.jsx (prop allPagamentosDivida). Tem que filtrar por divida_id
  // das parcelas do contrato ANTES de passar pro motor. Evidência do bug:
  // contrato "Mendes e Mendes" com 0 pagamentos exibindo pagamentos do TRADIO.
  it("filtra pagamentos por divida_id do contrato (regressão 7.8 prod bug)", () => {
    const dividas = [{
      id: "div-a",
      valor_total: 1000,
      indexador: "nenhum",
      juros_tipo: "sem_juros",
      multa_pct: 0,
      honorarios_pct: 0,
      data_vencimento: "2026-04-24",
    }];
    const pagamentosAllContratos = [
      { divida_id: "div-a",     valor: 100 },   // deste contrato
      { divida_id: "div-outra", valor: 400 },   // de outro contrato — NÃO conta
    ];
    const r = calcularDetalheEncargosContrato(dividas, pagamentosAllContratos, "2026-04-24");
    expect(r.totalPago).toBe(100);  // filtrado — não soma os 400 alheios
  });
});
