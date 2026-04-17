// ─── OVERRIDE DINÂMICO (BCB API) ─────────────────────────────
// Mescla com INDICES estáticos quando disponível.
let _overrides = {};

export function setIndicesOverride(data) {
  _overrides = data || {};
}

export function getIndicesOverride() {
  return _overrides;
}

// Retorna INDICES mesclado com overrides da API (override tem prioridade)
export function getIndicesMerged() {
  if (!_overrides || Object.keys(_overrides).length === 0) return INDICES;
  return {
    igpm:  { ...INDICES.igpm,  ..._overrides.igpm  },
    ipca:  { ...INDICES.ipca  },                        // IPCA não buscado via API (manter estático)
    selic: { ...INDICES.selic, ..._overrides.selic },
    inpc:  { ...INDICES.inpc,  ..._overrides.inpc  },
  };
}

// ─── ÍNDICES MENSAIS REAIS (2020-2024) ───────────────────────
export const INDICES = {
  igpm: {
    "2020-01":0.0037,"2020-02":0.0024,"2020-03":0.0131,"2020-04":0.0099,"2020-05":0.0044,"2020-06":0.0189,
    "2020-07":0.0287,"2020-08":0.0296,"2020-09":0.0440,"2020-10":0.0324,"2020-11":0.0331,"2020-12":0.0231,
    "2021-01":0.0318,"2021-02":0.0288,"2021-03":0.0293,"2021-04":0.0352,"2021-05":0.0416,"2021-06":0.0375,
    "2021-07":0.0196,"2021-08":0.0083,"2021-09":-0.0064,"2021-10":-0.0052,"2021-11":-0.0026,"2021-12":0.0087,
    "2022-01":0.0174,"2022-02":0.0188,"2022-03":0.0153,"2022-04":0.0116,"2022-05":0.0073,"2022-06":-0.0046,
    "2022-07":-0.0441,"2022-08":-0.0070,"2022-09":-0.0025,"2022-10":0.0042,"2022-11":0.0054,"2022-12":0.0046,
    "2023-01":-0.0047,"2023-02":-0.0007,"2023-03":-0.0015,"2023-04":-0.0032,"2023-05":-0.0072,"2023-06":-0.0071,
    "2023-07":-0.0025,"2023-08":0.0050,"2023-09":0.0053,"2023-10":0.0039,"2023-11":0.0043,"2023-12":0.0054,
    "2024-01":0.0071,"2024-02":0.0074,"2024-03":0.0069,"2024-04":0.0083,"2024-05":0.0046,"2024-06":0.0085,
    "2024-07":0.0076,"2024-08":0.0044,"2024-09":0.0044,"2024-10":0.0122,"2024-11":0.0122,"2024-12":0.0052,
    "2025-01":0.0027,"2025-02":0.0106,"2025-03":-0.0034,"2025-04":0.0024,"2025-05":-0.0049,"2025-06":-0.0167,
    "2025-07":-0.0077,"2025-08":0.0036,"2025-09":0.0042,"2025-10":-0.0036,"2025-11":0.0027,"2025-12":-0.0001,
    "2026-01":0.0041,"2026-02":-0.0073,"2026-03":0.0052,
  },
  ipca: {
    "2020-01":0.0021,"2020-02":0.0025,"2020-03":0.0007,"2020-04":-0.0031,"2020-05":-0.0038,"2020-06":0.0026,
    "2020-07":0.0036,"2020-08":0.0024,"2020-09":0.0064,"2020-10":0.0086,"2020-11":0.0089,"2020-12":0.0123,
    "2021-01":0.0025,"2021-02":0.0086,"2021-03":0.0093,"2021-04":0.0031,"2021-05":0.0083,"2021-06":0.0053,
    "2021-07":0.0096,"2021-08":0.0087,"2021-09":0.0164,"2021-10":0.0110,"2021-11":0.0095,"2021-12":0.0073,
    "2022-01":0.0054,"2022-02":0.0100,"2022-03":0.0116,"2022-04":0.0106,"2022-05":0.0047,"2022-06":0.0067,
    "2022-07":-0.0068,"2022-08":-0.0029,"2022-09":0.0059,"2022-10":0.0059,"2022-11":0.0041,"2022-12":0.0054,
    "2023-01":0.0053,"2023-02":0.0084,"2023-03":0.0071,"2023-04":0.0061,"2023-05":0.0023,"2023-06":-0.0008,
    "2023-07":0.0012,"2023-08":0.0061,"2023-09":0.0026,"2023-10":0.0024,"2023-11":0.0028,"2023-12":0.0062,
    "2024-01":0.0042,"2024-02":0.0083,"2024-03":0.0016,"2024-04":0.0038,"2024-05":0.0044,"2024-06":0.0050,
    "2024-07":0.0038,"2024-08":0.0044,"2024-09":0.0044,"2024-10":0.0056,"2024-11":0.0039,"2024-12":0.0052,
    "2025-01":0.0016,"2025-02":0.0131,"2025-03":0.0056,"2025-04":0.0043,"2025-05":0.0026,"2025-06":0.0024,
    "2025-07":0.0026,"2025-08":-0.0011,"2025-09":0.0048,"2025-10":0.0009,"2025-11":0.0018,"2025-12":0.0033,
    "2026-01":0.0033,"2026-02":0.0070,"2026-03":0.0088,
  },
  selic: {
    "2020-01":0.0038,"2020-02":0.0034,"2020-03":0.0034,"2020-04":0.0030,"2020-05":0.0026,"2020-06":0.0021,
    "2020-07":0.0019,"2020-08":0.0016,"2020-09":0.0016,"2020-10":0.0016,"2020-11":0.0015,"2020-12":0.0016,
    "2021-01":0.0015,"2021-02":0.0015,"2021-03":0.0020,"2021-04":0.0026,"2021-05":0.0033,"2021-06":0.0040,
    "2021-07":0.0043,"2021-08":0.0057,"2021-09":0.0063,"2021-10":0.0075,"2021-11":0.0075,"2021-12":0.0090,
    "2022-01":0.0073,"2022-02":0.0076,"2022-03":0.0093,"2022-04":0.0083,"2022-05":0.0102,"2022-06":0.0113,
    "2022-07":0.0114,"2022-08":0.0114,"2022-09":0.0114,"2022-10":0.0114,"2022-11":0.0114,"2022-12":0.0114,
    "2023-01":0.0113,"2023-02":0.0113,"2023-03":0.0113,"2023-04":0.0113,"2023-05":0.0113,"2023-06":0.0109,
    "2023-07":0.0108,"2023-08":0.0103,"2023-09":0.0099,"2023-10":0.0093,"2023-11":0.0092,"2023-12":0.0092,
    "2024-01":0.0097,"2024-02":0.0087,"2024-03":0.0091,"2024-04":0.0087,"2024-05":0.0083,"2024-06":0.0087,
    "2024-07":0.0090,"2024-08":0.0087,"2024-09":0.0099,"2024-10":0.0104,"2024-11":0.0111,"2024-12":0.0118,
    "2025-01":0.0101,"2025-02":0.0099,"2025-03":0.0096,"2025-04":0.0106,"2025-05":0.0114,"2025-06":0.0110,
    "2025-07":0.0128,"2025-08":0.0116,"2025-09":0.0122,"2025-10":0.0128,"2025-11":0.0105,"2025-12":0.0122,
    "2026-01":0.0116,"2026-02":0.0100,"2026-03":0.0121,"2026-04":0.0038,
  },
  inpc: {
    // BCB SGS série 188 — fonte oficial. Cobre 2011-2026 para evitar fallback em dívidas antigas.
    "2011-01":0.0094,"2011-02":0.0054,"2011-03":0.0066,"2011-04":0.0072,"2011-05":0.0057,"2011-06":0.0022,"2011-07":0.0000,"2011-08":0.0042,"2011-09":0.0045,"2011-10":0.0032,"2011-11":0.0057,"2011-12":0.0051,
    "2012-01":0.0051,"2012-02":0.0039,"2012-03":0.0018,"2012-04":0.0064,"2012-05":0.0055,"2012-06":0.0026,"2012-07":0.0043,"2012-08":0.0045,"2012-09":0.0063,"2012-10":0.0071,"2012-11":0.0054,"2012-12":0.0074,
    "2013-01":0.0092,"2013-02":0.0052,"2013-03":0.0060,"2013-04":0.0059,"2013-05":0.0035,"2013-06":0.0028,"2013-07":-0.0013,"2013-08":0.0016,"2013-09":0.0027,"2013-10":0.0061,"2013-11":0.0054,"2013-12":0.0072,
    "2014-01":0.0063,"2014-02":0.0064,"2014-03":0.0082,"2014-04":0.0078,"2014-05":0.0060,"2014-06":0.0026,"2014-07":0.0013,"2014-08":0.0018,"2014-09":0.0049,"2014-10":0.0038,"2014-11":0.0053,"2014-12":0.0062,
    "2015-01":0.0148,"2015-02":0.0116,"2015-03":0.0151,"2015-04":0.0071,"2015-05":0.0099,"2015-06":0.0077,"2015-07":0.0058,"2015-08":0.0025,"2015-09":0.0051,"2015-10":0.0077,"2015-11":0.0111,"2015-12":0.0090,
    "2016-01":0.0151,"2016-02":0.0095,"2016-03":0.0044,"2016-04":0.0064,"2016-05":0.0098,"2016-06":0.0047,"2016-07":0.0064,"2016-08":0.0031,"2016-09":0.0008,"2016-10":0.0017,"2016-11":0.0007,"2016-12":0.0014,
    "2017-01":0.0042,"2017-02":0.0024,"2017-03":0.0032,"2017-04":0.0008,"2017-05":0.0036,"2017-06":-0.0030,"2017-07":0.0017,"2017-08":-0.0003,"2017-09":-0.0002,"2017-10":0.0037,"2017-11":0.0018,"2017-12":0.0026,
    "2018-01":0.0023,"2018-02":0.0018,"2018-03":0.0007,"2018-04":0.0021,"2018-05":0.0043,"2018-06":0.0143,"2018-07":0.0025,"2018-08":0.0000,"2018-09":0.0030,"2018-10":0.0040,"2018-11":-0.0025,"2018-12":0.0014,
    "2019-01":0.0036,"2019-02":0.0054,"2019-03":0.0077,"2019-04":0.0060,"2019-05":0.0015,"2019-06":0.0001,"2019-07":0.0010,"2019-08":0.0012,"2019-09":-0.0005,"2019-10":0.0004,"2019-11":0.0054,"2019-12":0.0122,
    "2020-01":0.0019,"2020-02":0.0017,"2020-03":0.0018,"2020-04":-0.0023,"2020-05":-0.0025,"2020-06":0.0030,"2020-07":0.0044,"2020-08":0.0036,"2020-09":0.0087,"2020-10":0.0089,"2020-11":0.0095,"2020-12":0.0146,
    "2021-01":0.0027,"2021-02":0.0082,"2021-03":0.0086,"2021-04":0.0038,"2021-05":0.0096,"2021-06":0.0060,"2021-07":0.0102,"2021-08":0.0088,"2021-09":0.0120,"2021-10":0.0116,"2021-11":0.0084,"2021-12":0.0073,
    "2022-01":0.0067,"2022-02":0.0100,"2022-03":0.0171,"2022-04":0.0104,"2022-05":0.0045,"2022-06":0.0062,"2022-07":-0.0060,"2022-08":-0.0031,"2022-09":-0.0032,"2022-10":0.0047,"2022-11":0.0038,"2022-12":0.0069,
    "2023-01":0.0046,"2023-02":0.0077,"2023-03":0.0064,"2023-04":0.0053,"2023-05":0.0036,"2023-06":-0.0010,"2023-07":-0.0009,"2023-08":0.0020,"2023-09":0.0011,"2023-10":0.0012,"2023-11":0.0010,"2023-12":0.0055,
    "2024-01":0.0057,"2024-02":0.0081,"2024-03":0.0019,"2024-04":0.0037,"2024-05":0.0046,"2024-06":0.0025,"2024-07":0.0026,"2024-08":-0.0014,"2024-09":0.0048,"2024-10":0.0061,"2024-11":0.0033,"2024-12":0.0048,
    "2025-01":0.0000,"2025-02":0.0148,"2025-03":0.0051,"2025-04":0.0048,"2025-05":0.0035,"2025-06":0.0023,"2025-07":0.0021,"2025-08":-0.0021,"2025-09":0.0052,"2025-10":0.0003,"2025-11":0.0003,"2025-12":0.0021,
    "2026-01":0.0039,"2026-02":0.0056,"2026-03":0.0091,
  },
};

export const TAXA_MEDIA = { igpm:0.0045, ipca:0.0038, selic:0.0080, inpc:0.0040, nenhum:0 };
export const ULTIMA_COMPETENCIA_INDICES = { igpm:"2026-03", ipca:"2026-03", inpc:"2026-03", selic:"2026-04" };
export const INDICE_OPTIONS = [
  { v:"igpm", l:"IGP-M" },
  { v:"ipca", l:"IPCA" },
  { v:"selic", l:"SELIC" },
  { v:"inpc", l:"INPC" },
  { v:"inpc_ipca", l:"IPCA a partir de 30/08/24; antes INPC" },
  { v:"nenhum", l:"Sem correção" },
];
export const IDX_LABEL = Object.fromEntries(INDICE_OPTIONS.map(({ v, l }) => [v, l]));

export const JUROS_OPTIONS = [
  { v:"taxa_legal_406", l:"Taxa Legal (Art. 406 CC) — STJ Tema 1368" },
  { v:"taxa_legal_406_12", l:"Taxa Legal/art.406 CC: a partir de ago/2024; antes 1% a.m." },
  { v:"legal_classico", l:"0,5% a.m. até 01/2003 e 1% a.m. após" },
  { v:"fixo_05", l:"0,5% a.m. (6% a.a.)" },
  { v:"fixo_1", l:"1% a.m. (12% a.a.)" },
  { v:"selic", l:"Juros da Selic" },
  { v:"sem_juros", l:"Sem juros" },
  { v:"outros", l:"Outros (informar %)" },
];
export const JUROS_LABEL = Object.fromEntries(JUROS_OPTIONS.map(({ v, l }) => [v, l]));

export function obterTaxaJurosMes(chaveMes, jurosTipo = "fixo_1", jurosAM = 1) {
  switch (jurosTipo) {
    case "taxa_legal_406": {
      // STJ Tema 1368 + Lei 14.905/2024
      // Período 1 — CC/1916 Art. 1.063: até jan/2003  → 0,5% a.m.
      // Período 2 — Art. 406 CC/2002 (STJ Tema 1368): fev/2003 a ago/2024 → SELIC
      // Período 3 — Lei 14.905/2024: a partir set/2024 → max(0, SELIC - IPCA)
      if (chaveMes <= "2003-01") return 0.005;
      if (chaveMes <= "2024-08") return getIndicesMerged().selic[chaveMes] ?? TAXA_MEDIA.selic;
      const selic = getIndicesMerged().selic[chaveMes] ?? TAXA_MEDIA.selic;
      const ipca  = (INDICES.ipca[chaveMes]) ?? TAXA_MEDIA.ipca;
      return Math.max(0, selic - ipca);
    }
    case "taxa_legal_406_12": {
      // Lei 14.905/2024 — regime simplificado (2 períodos):
      // Período 1: até jul/2024 → 1% a.m. (12% a.a.)  [TJGO: "1% a.m. até 07/2024"]
      // Período 2: a partir ago/2024 → max(0, SELIC - IPCA)
      if (chaveMes <= "2024-07") return 0.01;
      const selicTL = getIndicesMerged().selic[chaveMes] ?? TAXA_MEDIA.selic;
      const ipcaTL  = (INDICES.ipca[chaveMes]) ?? TAXA_MEDIA.ipca;
      return Math.max(0, selicTL - ipcaTL);
    }
    case "legal_classico":
      return chaveMes <= "2003-01" ? 0.005 : 0.01;
    case "fixo_05":
      return 0.005;
    case "fixo_1":
      return 0.01;
    case "selic":
      return getIndicesMerged().selic[chaveMes] ?? TAXA_MEDIA.selic;
    case "sem_juros":
      return 0;
    case "outros":
    default:
      return (parseFloat(jurosAM) || 0) / 100;
  }
}

export function calcularJurosAcumulados({ principal = 0, dataInicio, dataFim, jurosTipo = "fixo_1", jurosAM = 1, regime = "composto" }) {
  if (!principal || !dataInicio || !dataFim) return { juros: 0, meses: 0 };
  const inicio = new Date(dataInicio + "T12:00:00");
  const fim = new Date(dataFim + "T12:00:00");
  let atual = new Date(inicio);
  let meses = 0;
  let jurosSimples = 0;
  let fatorComposto = 1;

  while (atual < fim) {
    const chaveMes = `${atual.getFullYear()}-${String(atual.getMonth() + 1).padStart(2, "0")}`;
    const taxaMes = obterTaxaJurosMes(chaveMes, jurosTipo, jurosAM);
    if (regime === "simples") jurosSimples += principal * taxaMes;
    else fatorComposto *= 1 + taxaMes;
    atual.setMonth(atual.getMonth() + 1);
    meses += 1;
  }

  return {
    juros: regime === "simples" ? jurosSimples : principal * (fatorComposto - 1),
    meses,
  };
}

/**
 * Calcula juros Art. 406 CC com breakdown por regime temporal (STJ Tema 1368 + Lei 14.905/2024).
 * Retorna o total e um array de períodos com regime, datas, valor e taxa acumulada.
 *
 * @param {number} principal
 * @param {string} dataInicio "YYYY-MM-DD"
 * @param {string} dataFim    "YYYY-MM-DD"
 * @returns {{ jurosTotal: number, periodos: Array }}
 */
export function calcularJurosArt406(principal, dataInicio, dataFim) {
  if (!principal || !dataInicio || !dataFim || dataInicio >= dataFim) {
    return { jurosTotal: 0, periodos: [] };
  }

  const CUT1 = "2003-02-01"; // início do período 2 (fev/2003)
  const CUT2 = "2024-09-01"; // início do período 3 (set/2024)

  const periodos = [];
  let jurosTotal = 0;

  // PERÍODO 1: CC/1916 Art. 1.063 — 0,5% a.m. (até jan/2003)
  const fimP1 = dataFim < CUT1 ? dataFim : CUT1;
  if (dataInicio < fimP1) {
    const { juros, meses } = calcularJurosAcumulados({
      principal, dataInicio, dataFim: fimP1,
      jurosTipo: "taxa_legal_406", regime: "simples",
    });
    if (meses > 0) {
      periodos.push({
        regime: "0,5% a.m. (CC/1916 Art. 1.063)",
        inicio: dataInicio,
        fim: fimP1,
        valor: juros,
        meses,
        taxaAcum: principal > 0 ? juros / principal : 0,
      });
      jurosTotal += juros;
    }
  }

  // PERÍODO 2: Art. 406 CC/2002 — SELIC (STJ Tema 1368) — fev/2003 a ago/2024
  const inicioP2 = dataInicio > CUT1 ? dataInicio : CUT1;
  const fimP2 = dataFim < CUT2 ? dataFim : CUT2;
  if (inicioP2 < fimP2) {
    const { juros, meses } = calcularJurosAcumulados({
      principal, dataInicio: inicioP2, dataFim: fimP2,
      jurosTipo: "taxa_legal_406", regime: "simples",
    });
    if (meses > 0) {
      periodos.push({
        regime: "SELIC (STJ Tema 1368)",
        inicio: inicioP2,
        fim: fimP2,
        valor: juros,
        meses,
        taxaAcum: principal > 0 ? juros / principal : 0,
      });
      jurosTotal += juros;
    }
  }

  // PERÍODO 3: Lei 14.905/2024 — Taxa Legal (SELIC − IPCA, mín 0) — a partir set/2024
  const inicioP3 = dataInicio > CUT2 ? dataInicio : CUT2;
  if (inicioP3 < dataFim) {
    const { juros, meses } = calcularJurosAcumulados({
      principal, dataInicio: inicioP3, dataFim,
      jurosTipo: "taxa_legal_406", regime: "simples",
    });
    if (meses > 0) {
      periodos.push({
        regime: "Taxa Legal (Lei 14.905/2024)",
        inicio: inicioP3,
        fim: dataFim,
        valor: juros,
        meses,
        taxaAcum: principal > 0 ? juros / principal : 0,
      });
      jurosTotal += juros;
    }
  }

  return { jurosTotal, periodos };
}

/**
 * Calcula juros Art. 406 CC com regime simplificado (Lei 14.905/2024) — 2 períodos:
 * Período 1: até jul/2024 → 1% a.m. (12% a.a.)  [TJGO: "1% a.m. até 07/2024"]
 * Período 2: a partir ago/2024 → Taxa Legal (SELIC − IPCA, mín 0)
 */
export function calcularJurosArt406_12aa(principal, dataInicio, dataFim) {
  if (!principal || !dataInicio || !dataFim || dataInicio >= dataFim) {
    return { jurosTotal: 0, periodos: [] };
  }

  const CUT = "2024-08-01"; // início do período 2 (ago/2024) — TJGO: "1% a.m. até 07/2024"
  const periodos = [];
  let jurosTotal = 0;

  // PERÍODO 1: 1% a.m. até jul/2024
  const fimP1 = dataFim < CUT ? dataFim : CUT;
  if (dataInicio < fimP1) {
    const { juros, meses } = calcularJurosAcumulados({
      principal, dataInicio, dataFim: fimP1,
      jurosTipo: "taxa_legal_406_12", regime: "simples",
    });
    if (meses > 0) {
      periodos.push({
        regime: "1% a.m. (até jul/2024)",
        inicio: dataInicio,
        fim: fimP1,
        valor: juros,
        meses,
        taxaAcum: principal > 0 ? juros / principal : 0,
      });
      jurosTotal += juros;
    }
  }

  // PERÍODO 2: Taxa Legal (SELIC − IPCA, mín 0) a partir set/2024
  const inicioP2 = dataInicio > CUT ? dataInicio : CUT;
  if (inicioP2 < dataFim) {
    const { juros, meses } = calcularJurosAcumulados({
      principal, dataInicio: inicioP2, dataFim,
      jurosTipo: "taxa_legal_406_12", regime: "simples",
    });
    if (meses > 0) {
      periodos.push({
        regime: "Taxa Legal (Lei 14.905/2024)",
        inicio: inicioP2,
        fim: dataFim,
        valor: juros,
        meses,
        taxaAcum: principal > 0 ? juros / principal : 0,
      });
      jurosTotal += juros;
    }
  }

  return { jurosTotal, periodos };
}

/**
 * Calcula fator de correção monetária com regime INPC→IPCA (Lei 14.905/2024):
 * Período 1: até ago/2024 → INPC
 * Período 2: a partir set/2024 → IPCA
 * Retorna { fator, periodos: [{indice, inicio, fim, fator, acumulado}] }
 */
export function calcularFatorCorrecao_INPC_IPCA(dataInicio, dataFim) {
  if (!dataInicio || !dataFim || dataInicio >= dataFim) return { fator: 1, periodos: [] };

  const CUT = "2024-09-01";
  const merged = getIndicesMerged();
  let fatorTotal = 1;
  const periodos = [];

  // PERÍODO 1: INPC até ago/2024
  const fimP1 = dataFim < CUT ? dataFim : CUT;
  if (dataInicio < fimP1) {
    let f1 = 1;
    let atual = new Date(dataInicio + "T12:00:00");
    const fim1 = new Date(fimP1 + "T12:00:00");
    while (atual < fim1) {
      const chave = `${atual.getFullYear()}-${String(atual.getMonth()+1).padStart(2,"0")}`;
      const taxa = merged.inpc?.[chave];
      f1 *= (1 + (taxa !== undefined ? taxa : TAXA_MEDIA.inpc));
      atual.setMonth(atual.getMonth() + 1);
    }
    fatorTotal *= f1;
    periodos.push({ indice: "INPC", inicio: dataInicio, fim: fimP1, fator: f1, acumulado: f1 - 1 });
  }

  // PERÍODO 2: IPCA a partir set/2024
  const inicioP2 = dataInicio > CUT ? dataInicio : CUT;
  if (inicioP2 < dataFim) {
    let f2 = 1;
    let atual = new Date(inicioP2 + "T12:00:00");
    const fim2 = new Date(dataFim + "T12:00:00");
    while (atual < fim2) {
      const chave = `${atual.getFullYear()}-${String(atual.getMonth()+1).padStart(2,"0")}`;
      const taxa = merged.ipca?.[chave];
      f2 *= (1 + (taxa !== undefined ? taxa : TAXA_MEDIA.ipca));
      atual.setMonth(atual.getMonth() + 1);
    }
    fatorTotal *= f2;
    periodos.push({ indice: "IPCA", inicio: inicioP2, fim: dataFim, fator: f2, acumulado: f2 - 1 });
  }

  return { fator: fatorTotal, periodos };
}

export function calcularFatorCorrecao(indexador, dataInicio, dataFim) {
  if(indexador==="nenhum") return 1;
  if(indexador==="inpc_ipca") return calcularFatorCorrecao_INPC_IPCA(dataInicio, dataFim).fator;
  const tabela = getIndicesMerged()[indexador];
  // Último mês disponível — parar antes de meses ainda não publicados (evita fallback indevido)
  const keys = Object.keys(tabela || {});
  const ultimaComp = keys.length > 0 ? keys.sort().pop() : (ULTIMA_COMPETENCIA_INDICES[indexador] || "1900-01");
  let fator = 1;
  let atual = new Date(dataInicio+"T12:00:00");
  const fim  = new Date(dataFim+"T12:00:00");
  while(atual < fim) {
    const chave = `${atual.getFullYear()}-${String(atual.getMonth()+1).padStart(2,"0")}`;
    if(chave > ultimaComp) break; // Mês ainda não publicado — parar aqui
    const taxa = tabela?.[chave];
    if(taxa !== undefined) { fator *= (1+taxa); }
    else { fator *= (1+TAXA_MEDIA[indexador]); } // Fallback apenas para período pré-histórico
    atual.setMonth(atual.getMonth()+1);
  }
  return fator;
}
