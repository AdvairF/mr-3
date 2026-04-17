// ─── BCB SGS API — Índices Monetários ────────────────────────────────────────
// API pública do Banco Central do Brasil (Sistema Gerenciador de Séries Temporais)
// Não requer chave de API.
// Documentação: https://www.bcb.gov.br/estabilidadefinanceira/seies_temporais

const SERIES_BCB = {
  inpc: 188,   // INPC — Índice Nacional de Preços ao Consumidor
  igpm: 189,   // IGP-M — Índice Geral de Preços ao Mercado
  selic: 4390, // SELIC — Taxa acumulada no mês (% ao mês)
};

const BASE_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs";
const CACHE_KEY = "bcb_indices_v1";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

// ─── Helpers de data ──────────────────────────────────────────────────────────
function formatarDataBCB(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

// ─── Fetch de uma série BCB ───────────────────────────────────────────────────
async function fetchSerie(codigo, dataInicial, dataFinal) {
  const url = `${BASE_URL}.${codigo}/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`BCB API erro ${res.status} para série ${codigo}`);
  }
  return res.json();
}

// ─── Normalizar dados da API ──────────────────────────────────────────────────
// BCB retorna: [{ data: "01/01/2020", valor: "0.28" }, ...]
// Saída:       { "2020-01": 0.0028, "2020-02": 0.0020, ... }
function normalizarSerie(bcbData) {
  const result = {};
  for (const { data, valor } of bcbData) {
    if (!data || valor == null) continue;
    const parts = data.split("/");
    if (parts.length !== 3) continue;
    const [, m, y] = parts; // DD/MM/YYYY
    const chave = `${y}-${m}`;
    const taxa = parseFloat(valor);
    if (!isNaN(taxa)) {
      result[chave] = taxa / 100; // converter % para decimal
    }
  }
  return result;
}

// ─── Buscar todos os índices do BCB ──────────────────────────────────────────
export async function buscarIndicesBCB(anos = 15) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setFullYear(inicio.getFullYear() - anos);
  inicio.setDate(1); // primeiro dia do mês

  const dataInicial = formatarDataBCB(inicio);
  const dataFinal = formatarDataBCB(fim);

  const [inpcRaw, igpmRaw, selicRaw] = await Promise.all([
    fetchSerie(SERIES_BCB.inpc, dataInicial, dataFinal),
    fetchSerie(SERIES_BCB.igpm, dataInicial, dataFinal),
    fetchSerie(SERIES_BCB.selic, dataInicial, dataFinal),
  ]);

  return {
    inpc: normalizarSerie(inpcRaw),
    igpm: normalizarSerie(igpmRaw),
    selic: normalizarSerie(selicRaw),
    atualizadoEm: new Date().toISOString(),
    totalRegistros: {
      inpc: inpcRaw.length,
      igpm: igpmRaw.length,
      selic: selicRaw.length,
    },
  };
}

// ─── Cache em localStorage ────────────────────────────────────────────────────
export function salvarCacheIndices(dados) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ dados, ts: Date.now() }));
  } catch {
    // localStorage pode estar indisponível (modo privado etc.)
  }
}

export function carregarCacheIndices() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { dados, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null; // expirado
    return dados;
  } catch {
    return null;
  }
}

export function limparCacheIndices() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {}
}

export function obterInfoCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { dados, ts } = JSON.parse(raw);
    const expiradoEm = new Date(ts + CACHE_TTL_MS);
    return { atualizadoEm: dados.atualizadoEm, ts, expiradoEm, expirado: Date.now() > ts + CACHE_TTL_MS };
  } catch {
    return null;
  }
}
