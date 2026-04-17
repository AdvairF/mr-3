/**
 * devedorCalc.js — Cálculo de saldo e dívidas do devedor.
 *
 * Extraído de App.jsx para reutilização em FilaDevedor e outros módulos.
 * A lógica é idêntica à função original em App.jsx (mesma iteração por dívida,
 * mesmo cálculo de correção monetária e juros).
 */

import { calcularFatorCorrecao, calcularJurosAcumulados } from "./correcao.js";

/**
 * Valor de face da dívida (sem encargos): soma dos valores originais das
 * dívidas cadastradas ou fallback para valor_original/valor_nominal.
 *
 * @param {object} devedor — objeto devedor com .dividas[] e .valor_original
 * @returns {number}
 */
export function calcularValorFace(devedor) {
  const soma = (devedor.dividas || []).reduce(
    (s, d) => s + (Number(d.valor_total) || 0),
    0
  );
  return soma || Number(devedor.valor_original) || Number(devedor.valor_nominal) || 0;
}

/**
 * Calcula o saldo atualizado de um devedor somando encargos e abatendo
 * pagamentos parciais. Mesma lógica iterativa de gerarPlanilhaPDF, sem side-effects.
 *
 * @param {object} devedor  — objeto devedor com .dividas[]
 * @param {Array}  pagamentos — pagamentos_parciais do devedor (já filtrados por devedor_id)
 * @param {string} hoje    — data de corte "YYYY-MM-DD"
 * @returns {number} saldo final
 */
export function calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje) {
  const dividasCalc = (devedor.dividas || []).filter(
    (d) => !d._nominal && !d._so_custas
  );
  if (!dividasCalc.length)
    return devedor.valor_original || devedor.valor_nominal || 0;

  const pgtoRestantes = [...pagamentos]
    .sort((a, b) =>
      (a.data_pagamento || "").localeCompare(b.data_pagamento || "")
    )
    .map((p) => ({ ...p, remaining: parseFloat(p.valor) || 0 }));

  let saldoTotal = 0;

  for (const div of dividasCalc) {
    const pv = parseFloat(div.valor_total) || 0;
    const indexadorDiv = div.indexador || "nenhum";
    const jurosTipoDiv = div.juros_tipo || "sem_juros";
    const jurosAMDiv = parseFloat(div.juros_am) || 0;
    const multaPctDiv = parseFloat(div.multa_pct) || 0;
    const honorariosPctDiv = parseFloat(div.honorarios_pct) || 0;
    const dataInicioDiv =
      div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;

    let saldo = pv;
    let periodoInicio = dataInicioDiv;
    let primeiroperiodo = true;

    const pgtosDiv = pgtoRestantes.filter((p) => p.remaining > 0);

    for (const pgto of pgtosDiv) {
      if (saldo <= 0) break;
      const periodoFim = pgto.data_pagamento;
      if (!periodoFim || periodoFim <= periodoInicio) {
        const abate = Math.min(pgto.remaining, saldo);
        saldo -= abate;
        pgto.remaining -= abate;
        continue;
      }

      const fator = calcularFatorCorrecao(indexadorDiv, periodoInicio, periodoFim);
      const corrAbs = saldo * (fator - 1);
      const pcSaldo = saldo + corrAbs;

      const { juros } = calcularJurosAcumulados({
        principal: pcSaldo,
        dataInicio: periodoInicio,
        dataFim: periodoFim,
        jurosTipo: jurosTipoDiv,
        jurosAM: jurosAMDiv,
        regime: "simples",
      });

      const multaVal = primeiroperiodo ? pcSaldo * (multaPctDiv / 100) : 0;
      const honorariosVal = primeiroperiodo
        ? (pcSaldo + juros + multaVal) * (honorariosPctDiv / 100)
        : 0;

      const debitoTotal = pcSaldo + juros + multaVal + honorariosVal;
      const abate = Math.min(pgto.remaining, debitoTotal);
      saldo = debitoTotal - abate;
      pgto.remaining -= abate;
      periodoInicio = periodoFim;
      primeiroperiodo = false;
    }

    if (periodoInicio && periodoInicio < hoje) {
      const fatorFinal = calcularFatorCorrecao(indexadorDiv, periodoInicio, hoje);
      const corrFinal = saldo * (fatorFinal - 1);
      const pcFinal = saldo + corrFinal;
      const { juros: jurosFinal } = calcularJurosAcumulados({
        principal: pcFinal,
        dataInicio: periodoInicio,
        dataFim: hoje,
        jurosTipo: jurosTipoDiv,
        jurosAM: jurosAMDiv,
        regime: "simples",
      });
      const multaFinal = primeiroperiodo ? pcFinal * (multaPctDiv / 100) : 0;
      const honorariosFinal = primeiroperiodo
        ? (pcFinal + jurosFinal + multaFinal) * (honorariosPctDiv / 100)
        : 0;
      saldo = pcFinal + jurosFinal + multaFinal + honorariosFinal;
    }

    saldoTotal += Math.max(0, saldo);
  }

  return saldoTotal;
}

/**
 * Retorna o resumo financeiro completo do devedor, com breakdown de componentes.
 * Útil para a tela de atendimento.
 *
 * @param {object} devedor
 * @param {Array}  pagamentos
 * @param {string} hoje "YYYY-MM-DD"
 * @returns {{ saldo, valorOriginal, totalPago, encargos, diasEmAtraso }}
 */
export function calcularResumoFinanceiro(devedor, pagamentos, hoje) {
  const valorOriginal = calcularValorFace(devedor);
  const saldo = calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje);
  const totalPago = (pagamentos || []).reduce(
    (s, p) => s + (parseFloat(p.valor) || 0),
    0
  );
  const encargos = Math.max(0, saldo - valorOriginal + totalPago);

  // Dias em atraso: da data de vencimento mais antiga até hoje
  const datasVencimento = (devedor.dividas || [])
    .map((d) => d.data_vencimento || d.data_origem)
    .filter(Boolean)
    .sort();
  const dataVencMaisAntiga = datasVencimento[0] || devedor.data_origem_divida || null;
  const diasEmAtraso = dataVencMaisAntiga
    ? Math.max(0, Math.floor((Date.now() - new Date(dataVencMaisAntiga + "T12:00:00")) / 86400000))
    : 0;

  return { saldo, valorOriginal, totalPago, encargos, diasEmAtraso };
}
