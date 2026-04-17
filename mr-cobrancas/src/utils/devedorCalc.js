/**
 * devedorCalc.js — Cálculo de saldo e dívidas do devedor.
 *
 * Extraído de App.jsx para reutilização em FilaDevedor e outros módulos.
 * A lógica é idêntica à função original em App.jsx (mesma iteração por dívida,
 * mesmo cálculo de correção monetária e juros).
 */

import { calcularFatorCorrecao, calcularJurosAcumulados, calcularJurosArt406, calcularJurosArt406_12aa, calcularFatorCorrecao_INPC_IPCA, calcularArt523 } from "./correcao.js";

/**
 * Parse seguro de devedor.dividas.
 * O PostgREST via fetch raw pode retornar JSONB como string não parseada.
 * Aceita: Array | string JSON | null/undefined → sempre retorna Array.
 */
function parseDividas(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Valor de face da dívida (sem encargos): soma dos valores originais das
 * dívidas cadastradas ou fallback para valor_original/valor_nominal.
 *
 * @param {object} devedor — objeto devedor com .dividas[] e .valor_original
 * @returns {number}
 */
export function calcularValorFace(devedor) {
  if (!devedor) return 0;
  const dividas = parseDividas(devedor.dividas);
  if (dividas.length > 0) {
    const soma = dividas.reduce((s, d) => {
      const v = parseFloat(d?.valor_total ?? d?.valor_original ?? 0);
      return s + (isNaN(v) ? 0 : v);
    }, 0);
    if (soma > 0) return soma;
  }
  return parseFloat(devedor.valor_original ?? devedor.valor_divida ?? devedor.valor_nominal ?? 0) || 0;
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
  const dividasCalc = parseDividas(devedor?.dividas).filter(
    (d) => !d._nominal && !d._so_custas
  );
  if (!dividasCalc.length)
    return parseFloat(devedor?.valor_original ?? devedor?.valor_nominal ?? 0) || 0;

  const pgtoRestantes = [...(pagamentos || [])]
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

    const saldoDiv = Math.max(0, saldo);
    const art523Div = calcularArt523(saldoDiv, div.art523_opcao || "nao_aplicar");
    saldoTotal += saldoDiv + art523Div.total_art523;
  }

  return saldoTotal;
}

/**
 * Retorna o breakdown detalhado de encargos por componente (multa, juros, correção,
 * honorários, custas) calculados de forma teórica (sem abatimento de pagamentos),
 * mais o saldo atualizado real (com pagamentos) e detalhe por dívida.
 *
 * @param {object} devedor
 * @param {Array}  pagamentos
 * @param {string} hoje "YYYY-MM-DD"
 * @returns {{ valorOriginal, multa, juros, correcao, honorarios, custas,
 *             totalEncargos, totalPago, saldoAtualizado, diasEmAtraso, detalhePorDivida }}
 */
export function calcularDetalheEncargos(devedor, pagamentos, hoje) {
  const dividasCalc = parseDividas(devedor?.dividas).filter((d) => !d._nominal && !d._so_custas);
  const dividasSoCustas = parseDividas(devedor?.dividas).filter((d) => d._so_custas);

  let totalMulta = 0;
  let totalJuros = 0;
  let totalCorrecao = 0;
  let totalHonorarios = 0;
  let totalCustasOriginal = 0;
  let totalCustasAtualizado = 0;
  let totalArt523Multa = 0;
  let totalArt523Honorarios = 0;

  const detalhePorDivida = [];

  for (const div of dividasCalc) {
    const pv = parseFloat(div.valor_total) || 0;
    const indexador = div.indexador || "nenhum";
    const jurosTipo = div.juros_tipo || "sem_juros";
    const jurosAM = parseFloat(div.juros_am) || 0;
    const multaPct = parseFloat(div.multa_pct) || 0;
    const honorariosPct = parseFloat(div.honorarios_pct) || 0;
    const dataInicio = div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;

    let correcaoValor = 0;
    let jurosValor = 0;
    let multaValor = 0;
    let honorariosValor = 0;
    let jurosPeriodos = null;
    let correcaoPeriodos = null;

    if (dataInicio && dataInicio < hoje) {
      let fator;
      if (indexador === "inpc_ipca") {
        const r = calcularFatorCorrecao_INPC_IPCA(dataInicio, hoje);
        fator = r.fator;
        correcaoPeriodos = r.periodos;
      } else {
        fator = calcularFatorCorrecao(indexador, dataInicio, hoje);
      }
      correcaoValor = pv * (fator - 1);
      const pcSaldo = pv + correcaoValor;

      if (jurosTipo === "taxa_legal_406") {
        const art406 = calcularJurosArt406(pcSaldo, dataInicio, hoje);
        jurosValor = art406.jurosTotal;
        jurosPeriodos = art406.periodos;
      } else if (jurosTipo === "taxa_legal_406_12") {
        const art406_12 = calcularJurosArt406_12aa(pcSaldo, dataInicio, hoje);
        jurosValor = art406_12.jurosTotal;
        jurosPeriodos = art406_12.periodos;
      } else {
        const { juros } = calcularJurosAcumulados({
          principal: pcSaldo,
          dataInicio,
          dataFim: hoje,
          jurosTipo,
          jurosAM,
          regime: "simples",
        });
        jurosValor = juros;
      }
      multaValor = pcSaldo * (multaPct / 100);
      honorariosValor = (pcSaldo + jurosValor + multaValor) * (honorariosPct / 100);
    }

    // Custas dentro desta dívida
    const custasDiv = div.custas || [];
    let custasOrigDiv = 0;
    let custasAtualizadoDiv = 0;
    for (const c of custasDiv) {
      const vc = parseFloat(c.valor) || 0;
      custasOrigDiv += vc;
      if (c.data && c.data < hoje) {
        const fatorC = calcularFatorCorrecao(indexador !== "nenhum" ? indexador : "inpc", c.data, hoje);
        custasAtualizadoDiv += vc * fatorC;
      } else {
        custasAtualizadoDiv += vc;
      }
    }

    totalMulta += multaValor;
    totalJuros += jurosValor;
    totalCorrecao += correcaoValor;
    totalHonorarios += honorariosValor;
    totalCustasOriginal += custasOrigDiv;
    totalCustasAtualizado += custasAtualizadoDiv;

    const saldoTeoricoDivida = pv + correcaoValor + jurosValor + multaValor + honorariosValor + (custasAtualizadoDiv - custasOrigDiv);
    const art523DivDet = calcularArt523(saldoTeoricoDivida, div.art523_opcao || "nao_aplicar");
    totalArt523Multa += art523DivDet.multa;
    totalArt523Honorarios += art523DivDet.honorarios_sucumbenciais;

    detalhePorDivida.push({
      descricao: div.descricao || `Dívida ${detalhePorDivida.length + 1}`,
      valorOriginal: pv,
      indexador,
      jurosTipo,
      multaPct,
      jurosAM,
      honorariosPct,
      correcao: correcaoValor,
      correcaoPeriodos,
      juros: jurosValor,
      jurosPeriodos,
      multa: multaValor,
      honorarios: honorariosValor,
      custas: custasDiv.length > 0 ? { original: custasOrigDiv, atualizado: custasAtualizadoDiv } : null,
      art523: art523DivDet,
      saldoTeorico: saldoTeoricoDivida + art523DivDet.total_art523,
      dataVencimento: div.data_vencimento || div.data_origem,
    });
  }

  // Entradas _so_custas (lançamentos avulsos de custas judiciais)
  for (const div of dividasSoCustas) {
    for (const c of div.custas || []) {
      const vc = parseFloat(c.valor) || 0;
      totalCustasOriginal += vc;
      if (c.data && c.data < hoje) {
        const fatorC = calcularFatorCorrecao("inpc", c.data, hoje);
        totalCustasAtualizado += vc * fatorC;
      } else {
        totalCustasAtualizado += vc;
      }
    }
  }

  const valorOriginal = calcularValorFace(devedor);
  const saldoAtualizado = calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje);
  const totalPago = (pagamentos || []).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  const totalEncargos = totalMulta + totalJuros + totalCorrecao + totalHonorarios + (totalCustasAtualizado - totalCustasOriginal) + totalArt523Multa + totalArt523Honorarios;

  const datasVencimento = parseDividas(devedor?.dividas)
    .map((d) => d.data_vencimento || d.data_origem)
    .filter(Boolean)
    .sort();
  const dataVencMaisAntiga = datasVencimento[0] || devedor?.data_origem_divida || null;
  const diasEmAtraso = dataVencMaisAntiga
    ? Math.max(0, Math.floor((Date.now() - new Date(dataVencMaisAntiga + "T12:00:00")) / 86400000))
    : 0;

  return {
    valorOriginal,
    multa: { valor: totalMulta },
    juros: { valor: totalJuros },
    correcao: { valor: totalCorrecao },
    honorarios: { valor: totalHonorarios },
    custas: { original: totalCustasOriginal, atualizado: totalCustasAtualizado },
    art523: { multa: totalArt523Multa, honorarios: totalArt523Honorarios, total: totalArt523Multa + totalArt523Honorarios },
    totalEncargos,
    totalPago,
    saldoAtualizado,
    diasEmAtraso,
    detalhePorDivida,
  };
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
  const datasVencimento = parseDividas(devedor?.dividas)
    .map((d) => d.data_vencimento || d.data_origem)
    .filter(Boolean)
    .sort();
  const dataVencMaisAntiga = datasVencimento[0] || devedor?.data_origem_divida || null;
  const diasEmAtraso = dataVencMaisAntiga
    ? Math.max(0, Math.floor((Date.now() - new Date(dataVencMaisAntiga + "T12:00:00")) / 86400000))
    : 0;

  return { saldo, valorOriginal, totalPago, encargos, diasEmAtraso };
}
