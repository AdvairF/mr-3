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
    saldoTotal += saldoDiv;
  }

  // Art.523 applies to total devedor saldo (not per-dívida residual), so it
  // works even when individual dívidas are fully absorbed by iterative payments.
  const art523OpcaoTotal = dividasCalc.reduce((best, d) => {
    const o = d.art523_opcao || "nao_aplicar";
    if (best === "multa_honorarios" || o === "multa_honorarios") return "multa_honorarios";
    if (best === "apenas_multa" || o === "apenas_multa") return "apenas_multa";
    return "nao_aplicar";
  }, "nao_aplicar");
  const art523Total = calcularArt523(saldoTotal, art523OpcaoTotal);
  return saldoTotal + art523Total.total_art523;
}

/**
 * Mesmo loop Art. 354 CC de calcularSaldoDevedorAtualizado, mas retorna mapa
 * { [div.id]: saldo } para exibição por dívida individual.
 * Art.523 aplicado por dívida (usa div.art523_opcao individual).
 * calcularSaldoDevedorAtualizado permanece intacto — dashboard/Pessoas não mudam.
 *
 * @param {object} devedor
 * @param {Array}  pagamentos
 * @param {string} hoje "YYYY-MM-DD"
 * @returns {{ [dividaId: string]: number }}
 */
export function calcularSaldosPorDivida(devedor, pagamentos, hoje) {
  const dividasCalc = parseDividas(devedor?.dividas).filter(
    (d) => !d._nominal && !d._so_custas
  );
  if (!dividasCalc.length) return {};

  const pgtoRestantes = [...(pagamentos || [])]
    .sort((a, b) =>
      (a.data_pagamento || "").localeCompare(b.data_pagamento || "")
    )
    .map((p) => ({ ...p, remaining: parseFloat(p.valor) || 0 }));

  const result = {};

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
    result[String(div.id)] = saldoDiv + art523Div.total_art523;
  }

  return result;
}

/**
 * Mesmo loop Art. 354 CC de calcularSaldosPorDivida, mas retorna mapa
 * { [dividaId]: totalAbsorvido } — valor dos pagamentos efetivamente
 * consumidos por cada dívida (não o saldo restante).
 *
 * calcularSaldoDevedorAtualizado e calcularSaldosPorDivida NÃO são tocados.
 *
 * @param {object} devedor
 * @param {Array}  pagamentos
 * @param {string} hoje "YYYY-MM-DD"
 * @returns {{ [dividaId: string]: number }}
 */
export function calcularTotalPagoPorDivida(devedor, pagamentos, hoje) {
  const dividasCalc = parseDividas(devedor?.dividas).filter(
    (d) => !d._nominal && !d._so_custas
  );
  if (!dividasCalc.length) return {};

  const pgtoRestantes = [...(pagamentos || [])]
    .sort((a, b) =>
      (a.data_pagamento || "").localeCompare(b.data_pagamento || "")
    )
    .map((p) => ({ ...p, remaining: parseFloat(p.valor) || 0 }));

  const result = {};

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
    let absorbed = 0;

    const pgtosDiv = pgtoRestantes.filter((p) => p.remaining > 0);

    for (const pgto of pgtosDiv) {
      if (saldo <= 0) break;
      const periodoFim = pgto.data_pagamento;
      if (!periodoFim || periodoFim <= periodoInicio) {
        const abate = Math.min(pgto.remaining, saldo);
        saldo -= abate;
        pgto.remaining -= abate;
        absorbed += abate;
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
      absorbed += abate;
      periodoInicio = periodoFim;
      primeiroperiodo = false;
    }

    // Bloco pós-hoje omitido intencionalmente — nenhum pagamento ocorre
    // após hoje, então absorbed não muda com a apreciação futura do saldo.
    result[String(div.id)] = absorbed;
  }

  return result;
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

/**
 * Motor de cálculo unificado para planilhas PDF.
 * Realiza amortização iterativa período-a-período com abatimento sequencial de
 * pagamentos parciais, aplica Art. 523 por dívida ao final.
 *
 * @param {object} devedor
 * @param {Array}  pagamentos
 * @param {string} hoje "YYYY-MM-DD"
 * @returns {{
 *   resumo: { valor_original, multa, honorarios, correcao, juros,
 *             art523_multa, art523_honorarios, total_atualizado,
 *             total_pago, saldo_devedor_final },
 *   secoes: Array<{ div, rows: Array<{ data, desc, debito, credito, saldo }>,
 *                   saldoDiv, art523Multa, art523Honorarios }>
 * }}
 */
export function calcularPlanilhaCompleta(devedor, pagamentos, hoje) {
  const dividasCalc = parseDividas(devedor?.dividas).filter(d => !d._nominal && !d._so_custas);

  const pgtos = [...(pagamentos || [])].sort((a, b) =>
    (a.data_pagamento || '').localeCompare(b.data_pagamento || '')
  );
  const pgtoRestantes = pgtos.map(p => ({ ...p, remaining: parseFloat(p.valor) || 0 }));

  let totalCorr = 0;
  let totalJuros = 0;
  let totalMulta = 0;
  let totalArt523Multa = 0;
  let totalArt523Honorarios = 0;

  const secoes = [];

  for (let di = 0; di < dividasCalc.length; di++) {
    const div = dividasCalc[di];
    const pvDiv = parseFloat(div.valor_total) || 0;
    const indexadorDiv = div.indexador || 'nenhum';
    const jurosTipoDiv = div.juros_tipo || 'sem_juros';
    const jurosAMDiv = parseFloat(div.juros_am) || 0;
    const multaPctDiv = parseFloat(div.multa_pct) || 0;
    const honorariosPctDiv = parseFloat(div.honorarios_pct) || 0;
    const dataInicioDiv = div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;

    const rowsDiv = [];
    let saldo = pvDiv;
    let periodoInicio = dataInicioDiv;
    let primeiroperiodo = true;

    rowsDiv.push({
      data: dataInicioDiv,
      desc: dividasCalc.length > 1
        ? `Saldo inicial — ${div.descricao || 'Dívida ' + (di + 1)}`
        : 'Saldo inicial / abertura',
      debito: pvDiv,
      credito: 0,
      saldo: pvDiv,
      isOpening: true,
    });

    const pgtosDiv = pgtoRestantes.filter(p => p.remaining > 0);

    for (const pgto of pgtosDiv) {
      if (saldo <= 0) break;
      const periodoFim = pgto.data_pagamento;

      if (!periodoFim || periodoFim <= periodoInicio) {
        const abate = Math.min(pgto.remaining, saldo);
        rowsDiv.push({
          data: pgto.data_pagamento,
          desc: pgto.observacao || 'Pagamento parcial',
          debito: 0,
          credito: abate,
          saldo: saldo - abate,
        });
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
        regime: 'simples',
      });

      const multaVal = primeiroperiodo ? pcSaldo * (multaPctDiv / 100) : 0;
      const honorariosRowVal = primeiroperiodo
        ? (pcSaldo + juros + multaVal) * (honorariosPctDiv / 100)
        : 0;

      totalCorr += corrAbs;
      totalJuros += juros;
      if (primeiroperiodo) totalMulta += multaVal;

      if (multaVal > 0) {
        rowsDiv.push({
          data: periodoFim,
          desc: `Multa (${multaPctDiv}%)`,
          debito: multaVal,
          credito: 0,
          saldo: saldo + multaVal,
          isMulta: true,
        });
      }
      if (honorariosRowVal > 0.005) {
        rowsDiv.push({
          data: periodoFim,
          desc: `Honorários (${honorariosPctDiv}%)`,
          debito: honorariosRowVal,
          credito: 0,
          saldo: saldo + multaVal + honorariosRowVal,
          isHonorarios: true,
        });
      }
      if (corrAbs > 0.005) {
        rowsDiv.push({
          data: periodoFim,
          desc: `Correção monetária (${indexadorDiv.toUpperCase()})`,
          debito: corrAbs,
          credito: 0,
          saldo: saldo + corrAbs,
          isCorr: true,
        });
      }
      if (juros > 0.005) {
        rowsDiv.push({
          data: periodoFim,
          desc: `Juros ${jurosAMDiv}% a.m.`,
          debito: juros,
          credito: 0,
          saldo: pcSaldo + juros,
          isJuros: true,
        });
      }

      const debitoTotal = pcSaldo + juros + multaVal + honorariosRowVal;
      const abate = Math.min(pgto.remaining, debitoTotal);
      const saldoAposPgto = debitoTotal - abate;
      rowsDiv.push({
        data: periodoFim,
        desc: pgto.observacao || 'Pagamento parcial',
        debito: 0,
        credito: abate,
        saldo: saldoAposPgto,
      });

      pgto.remaining -= abate;
      saldo = saldoAposPgto;
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
        regime: 'simples',
      });

      totalCorr += corrFinal;
      totalJuros += jurosFinal;

      if (corrFinal > 0.005) {
        rowsDiv.push({
          data: hoje,
          desc: `Correção monetária (${indexadorDiv.toUpperCase()})`,
          debito: corrFinal,
          credito: 0,
          saldo: saldo + corrFinal,
          isCorr: true,
        });
      }
      if (jurosFinal > 0.005) {
        rowsDiv.push({
          data: hoje,
          desc: `Juros ${jurosAMDiv}% a.m.`,
          debito: jurosFinal,
          credito: 0,
          saldo: pcFinal + jurosFinal,
          isJuros: true,
        });
      }

      saldo = pcFinal + jurosFinal;
    }

    const art523Div = calcularArt523(saldo, div.art523_opcao || 'nao_aplicar');
    if (art523Div.multa > 0.005) {
      rowsDiv.push({
        data: hoje,
        desc: 'Art. 523 §1º CPC — Multa 10%',
        debito: art523Div.multa,
        credito: 0,
        saldo: saldo + art523Div.multa,
        isArt523: true,
      });
    }
    if (art523Div.honorarios_sucumbenciais > 0.005) {
      rowsDiv.push({
        data: hoje,
        desc: 'Art. 523 §1º CPC — Honor. 10%',
        debito: art523Div.honorarios_sucumbenciais,
        credito: 0,
        saldo: saldo + art523Div.multa + art523Div.honorarios_sucumbenciais,
        isArt523: true,
      });
    }

    totalArt523Multa += art523Div.multa;
    totalArt523Honorarios += art523Div.honorarios_sucumbenciais;

    const saldoDivFinal = saldo + art523Div.total_art523;
    secoes.push({
      div,
      rows: rowsDiv,
      saldoDiv: saldoDivFinal,
      art523Multa: art523Div.multa,
      art523Honorarios: art523Div.honorarios_sucumbenciais,
    });
  }

  const PV = dividasCalc.reduce((s, d) => s + (parseFloat(d.valor_total) || 0), 0);
  const honorariosPct = parseFloat((dividasCalc[0] || {}).honorarios_pct) || 0;
  const totalAtualizado_sem_hon = PV + totalCorr + totalJuros + totalMulta;
  const totalHonorarios = totalAtualizado_sem_hon * (honorariosPct / 100);
  const totalPago = pgtos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
  // saldo_devedor_final: remove per-section Art.523, apply to total (mirrors calcularSaldoDevedorAtualizado)
  const saldoBase = Math.max(0, secoes.reduce((s, sec) => s + sec.saldoDiv - sec.art523Multa - sec.art523Honorarios, 0));
  const art523OpcaoTotal = dividasCalc.reduce((best, d) => {
    const o = d.art523_opcao || 'nao_aplicar';
    if (best === 'multa_honorarios' || o === 'multa_honorarios') return 'multa_honorarios';
    if (best === 'apenas_multa' || o === 'apenas_multa') return 'apenas_multa';
    return 'nao_aplicar';
  }, 'nao_aplicar');
  const art523FinalTotal = calcularArt523(saldoBase, art523OpcaoTotal);
  totalArt523Multa = art523FinalTotal.multa;
  totalArt523Honorarios = art523FinalTotal.honorarios_sucumbenciais;
  const saldoFinal = Math.max(0, saldoBase + art523FinalTotal.total_art523);
  // total_atualizado is derived backwards for display in the resumo box
  const totalAtualizado = saldoFinal + totalPago;

  return {
    resumo: {
      valor_original: PV,
      multa: totalMulta,
      honorarios: totalHonorarios,
      correcao: totalCorr,
      juros: totalJuros,
      art523_multa: totalArt523Multa,
      art523_honorarios: totalArt523Honorarios,
      total_atualizado: totalAtualizado,
      total_pago: totalPago,
      saldo_devedor_final: saldoFinal,
    },
    secoes,
    _meta: { honorariosPct, multaPct: parseFloat((dividasCalc[0] || {}).multa_pct) || 0, indexador: (dividasCalc[0] || {}).indexador || 'nenhum', jurosAM: parseFloat((dividasCalc[0] || {}).juros_am) || 0 },
  };
}

// ─── ADAPTER CONTRATO-LEVEL (Phase 7.8, filter fix Phase 7.8.1) ──────────────

/**
 * Adapter thin para consumo em DetalheContrato.jsx.
 *
 * Phase 7.8 (D-02) — envolve `calcularDetalheEncargos` existente com uma
 * assinatura contrato-level que recebe a lista de parcelas (`dividas`) do
 * contrato diretamente, em vez do objeto devedor agregado. Motor Art.354
 * INTOCADO (D-01) — zero duplicação de lógica; delegação pura.
 *
 * Phase 7.8.1 (bugfix regressão crítica) — filtra `allPagamentosDivida` por
 * `divida_id` das parcelas do contrato ANTES de passar pro motor. O motor
 * sempre foi "pré-filtre antes de chamar" (design intencional pra callers
 * devedor-level onde pagamentos já vêm scopados ao devedor). Caller
 * DetalheContrato.jsx passa `allPagamentosDivida` global → sem filter aqui,
 * pagamentos de OUTROS contratos contaminavam o saldo atualizado deste.
 * Padrão espelha `calcularTotaisContratoNominal` em contratos.js:476-486
 * (já em prod desde Phase 7.3).
 *
 * @param {Array}  dividasDoContrato    parcelas do contrato (mesmo shape de devedor.dividas)
 * @param {Array}  allPagamentosDivida  pagamentos_divida globais (todos os contratos) — adapter filtra por divida_id
 * @param {string} hoje                 "YYYY-MM-DD"
 * @returns {ReturnType<typeof calcularDetalheEncargos>} shape idêntico ao original
 */
export function calcularDetalheEncargosContrato(dividasDoContrato, allPagamentosDivida, hoje) {
  const dividaIds = new Set((dividasDoContrato || []).map(d => String(d.id)));
  const pagamentosFiltrados = (allPagamentosDivida || []).filter(p => dividaIds.has(String(p.divida_id)));
  const pseudoDevedor = { dividas: dividasDoContrato || [] };
  return calcularDetalheEncargos(pseudoDevedor, pagamentosFiltrados, hoje);
}

/**
 * Phase 7.13b D-pre-12: helper thin para Fila por Contrato.
 * Compõe motor existente — NÃO modifica calcularDetalheEncargos (D-01 INTOCADO).
 * Reduz ruído em callsites da Fila (listarContratosParaFila + calcularScoreContrato + atualizarValoresAtrasados).
 *
 * @param {Array}  dividasDoContrato    parcelas/dívidas do contrato (lista de rows da tabela `dividas`)
 * @param {Array}  allPagamentosDivida  lista global de pagamentos_divida (adapter filtra por divida_id)
 * @param {string} hoje                 "YYYY-MM-DD"
 * @returns {number}                    saldo atualizado em R$ (já com encargos aplicados pelo motor)
 */
export const calcularSaldoContratoAtualizado = (dividasDoContrato, allPagamentosDivida, hoje) =>
  calcularDetalheEncargosContrato(dividasDoContrato, allPagamentosDivida, hoje).saldoAtualizado;
