// ─── IMPORTS ESTÁTICOS (apenas utilitários leves) ────────────
import { useState, useMemo, useRef, useEffect } from "react";
import {
  calcularFatorCorrecao,
  calcularJurosAcumulados,
  calcularArt523,
  INDICE_OPTIONS,
  IDX_LABEL,
  JUROS_OPTIONS,
  JUROS_LABEL,
} from "../utils/correcao.js";
import Art523Option from "./Art523Option.jsx";
import { fmt, fmtDate } from "../utils/formatters.js";
import { dbGet, dbInsert, dbDelete, dbUpdate } from "../config/supabase.js";

// ─── DOCXTEMPLATER: importado dinamicamente para evitar stack overflow ──
// (módulo CJS — import estático causa RangeError no Vite)
async function carregarDocxtemplater() {
  const [{ default: Docxtemplater }, { default: PizZip }] = await Promise.all([
    import("docxtemplater"),
    import("pizzip"),
  ]);
  return { Docxtemplater, PizZip };
}

// ─── CONSTANTES ───────────────────────────────────────────────
const TIPOS_PETICAO = [
  { v: "cobranca",    l: "Ação de Cobrança" },
  { v: "monitoria",   l: "Ação Monitória" },
  { v: "execucao",    l: "Execução de Título Extrajudicial" },
  { v: "cumprimento", l: "Cumprimento de Sentença" },
  { v: "notificacao", l: "Notificação Extrajudicial" },
  { v: "acordo",      l: "Proposta de Acordo / Transação" },
];

const VARAS = [
  "1ª Vara Cível","2ª Vara Cível","3ª Vara Cível",
  "Vara de Fazenda Pública","Juizado Especial Cível",
  "Vara de Execuções Fiscais","Outra",
];

const UFS_LIST = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ─── PLACEHOLDERS DISPONÍVEIS ────────────────────────────────
export const PLACEHOLDERS = [
  // Devedor
  { chave: "NOME_DEVEDOR",         desc: "Nome completo do devedor",            grupo: "Devedor" },
  { chave: "CPF_DEVEDOR",          desc: "CPF ou CNPJ do devedor",              grupo: "Devedor" },
  { chave: "RG_DEVEDOR",           desc: "RG do devedor",                       grupo: "Devedor" },
  { chave: "TIPO_DEVEDOR",         desc: "Pessoa Física ou Jurídica",           grupo: "Devedor" },
  { chave: "PROFISSAO_DEVEDOR",    desc: "Profissão",                           grupo: "Devedor" },
  { chave: "EMAIL_DEVEDOR",        desc: "E-mail",                              grupo: "Devedor" },
  { chave: "TELEFONE_DEVEDOR",     desc: "Telefone",                            grupo: "Devedor" },
  { chave: "ENDERECO_DEVEDOR",     desc: "Endereço (rua, nº, bairro)",          grupo: "Devedor" },
  { chave: "CIDADE_DEVEDOR",       desc: "Cidade do devedor",                   grupo: "Devedor" },
  { chave: "UF_DEVEDOR",           desc: "UF do devedor",                       grupo: "Devedor" },
  { chave: "CEP_DEVEDOR",          desc: "CEP",                                 grupo: "Devedor" },
  { chave: "SOCIO_DEVEDOR",        desc: "Sócio / responsável (PJ)",            grupo: "Devedor" },
  { chave: "QUALIFICACAO_DEVEDOR", desc: "Qualificação jurídica completa",      grupo: "Devedor" },
  // Credor
  { chave: "NOME_CREDOR",          desc: "Razão social / nome do credor",       grupo: "Credor" },
  { chave: "CPF_CREDOR",           desc: "CPF / CNPJ do credor",                grupo: "Credor" },
  { chave: "TIPO_CREDOR",          desc: "Pessoa Física ou Jurídica",           grupo: "Credor" },
  { chave: "QUALIFICACAO_CREDOR",  desc: "Qualificação jurídica completa",      grupo: "Credor" },
  // Valores
  { chave: "VALOR_ORIGINAL",       desc: "Valor original da dívida (R$)",       grupo: "Valores" },
  { chave: "VALOR_CORRECAO",       desc: "Correção monetária (R$)",             grupo: "Valores" },
  { chave: "VALOR_JUROS",          desc: "Juros acumulados (R$)",               grupo: "Valores" },
  { chave: "VALOR_MULTA",          desc: "Multa (R$)",                          grupo: "Valores" },
  { chave: "VALOR_HONORARIOS",     desc: "Honorários advocatícios (R$)",        grupo: "Valores" },
  { chave: "VALOR_TOTAL",          desc: "Total atualizado (R$)",               grupo: "Valores" },
  { chave: "VALOR_TOTAL_EXTENSO",  desc: "Total por extenso",                   grupo: "Valores" },
  { chave: "PCT_MULTA",            desc: "Percentual da multa (%)",             grupo: "Valores" },
  { chave: "PCT_HONORARIOS",       desc: "Percentual de honorários (%)",        grupo: "Valores" },
  { chave: "INDICE_CORRECAO",      desc: "Índice usado (IGP-M, IPCA...)",       grupo: "Valores" },
  { chave: "TIPO_JUROS",           desc: "Tipo de juros aplicado",              grupo: "Valores" },
  { chave: "MESES_DIVIDA",         desc: "Meses de atraso",                     grupo: "Valores" },
  { chave: "DESCRICAO_DIVIDA",     desc: "Descrição da dívida",                 grupo: "Valores" },
  { chave: "DATA_ORIGEM_DIVIDA",   desc: "Data de origem da dívida",            grupo: "Valores" },
  { chave: "DATA_CALCULO",         desc: "Data de referência do cálculo",       grupo: "Valores" },
  { chave: "VALOR_ACORDO",         desc: "Valor com desconto para acordo (R$)", grupo: "Valores" },
  { chave: "DESCONTO_PCT",         desc: "Desconto para acordo (%)",            grupo: "Valores" },
  // Petição
  { chave: "NOME_ADVOGADO",        desc: "Nome do advogado(a)",                 grupo: "Petição" },
  { chave: "OAB",                  desc: "Número OAB",                          grupo: "Petição" },
  { chave: "UF_OAB",               desc: "UF da OAB",                          grupo: "Petição" },
  { chave: "VARA_JUIZO",           desc: "Vara / Juízo",                        grupo: "Petição" },
  { chave: "COMARCA",              desc: "Comarca",                             grupo: "Petição" },
  { chave: "CIDADE_PETICAO",       desc: "Cidade da assinatura",                grupo: "Petição" },
  { chave: "DATA_HOJE",            desc: "Data de hoje por extenso",            grupo: "Petição" },
  { chave: "DATA_HOJE_CURTA",      desc: "Data de hoje (dd/mm/aaaa)",           grupo: "Petição" },
  { chave: "NUMERO_PROCESSO",      desc: "Número do processo",                  grupo: "Petição" },
  { chave: "TIPO_ACAO",            desc: "Tipo da ação selecionada",            grupo: "Petição" },
];

// ─── HELPERS ─────────────────────────────────────────────────
const fmtBRL = v => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const fmtDataCurta = iso => {
  if (!iso) return "_______________";
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
};

const fmtDataPorExtenso = iso => {
  if (!iso) return "_______________";
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
};

function qualificarPessoa(p) {
  if (!p) return "_______________";
  const parts = [p.nome];
  if (p.tipo === "PF") {
    if (p.profissao) parts.push(p.profissao);
    if (p.rg) parts.push(`RG nº ${p.rg}`);
    if (p.cpf_cnpj) parts.push(`CPF nº ${p.cpf_cnpj}`);
  } else {
    if (p.cpf_cnpj) parts.push(`CNPJ nº ${p.cpf_cnpj}`);
  }
  const end = [p.logradouro, p.numero, p.complemento, p.bairro, p.cidade, p.uf].filter(Boolean).join(", ");
  if (end) parts.push(`com endereço em ${end}`);
  return parts.join(", ");
}

// Extenso iterativo (sem recursão — evita stack overflow)
function extenso(valor) {
  const uns = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
  const dez = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const cen = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];

  if (!valor || valor <= 0 || !isFinite(valor)) return "zero reais";
  const centavos = Math.round((valor - Math.floor(valor)) * 100);
  const inteiro = Math.floor(valor);

  function grupo(n) {
    if (n === 0) return "";
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    const dez10 = d * 10 + u;
    const p = [];
    if (c > 0) p.push(cen[c]);
    if (dez10 > 0) p.push(dez10 < 20 ? uns[dez10] : dez[d] + (u > 0 ? " e " + uns[u] : ""));
    return p.join(" e ");
  }

  const partes = [];
  const bilhoes  = Math.floor(inteiro / 1_000_000_000);
  const milhoes  = Math.floor((inteiro % 1_000_000_000) / 1_000_000);
  const milhares = Math.floor((inteiro % 1_000_000) / 1_000);
  const resto    = inteiro % 1_000;

  if (bilhoes)  partes.push(grupo(bilhoes) + (bilhoes === 1 ? " bilhão" : " bilhões"));
  if (milhoes)  partes.push(grupo(milhoes) + (milhoes === 1 ? " milhão" : " milhões"));
  if (milhares) partes.push(milhares === 1 ? "mil" : grupo(milhares) + " mil");
  if (resto)    partes.push(grupo(resto));

  let res = partes.join(" e ") + (inteiro === 1 ? " real" : " reais");
  if (centavos > 0) res += " e " + grupo(centavos) + (centavos === 1 ? " centavo" : " centavos");
  return res;
}

// ─── MONTAR DADOS DOS PLACEHOLDERS ───────────────────────────
function montarDados({ devedor, credor, resultado, config, dataCalculo, tipoPeticao }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const endDev = devedor ? [devedor.logradouro, devedor.numero, devedor.complemento, devedor.bairro].filter(Boolean).join(", ") : "";
  const totalAcordo = config.descontoPct
    ? (resultado?.total || 0) * (1 - parseFloat(config.descontoPct) / 100)
    : (resultado?.total || 0);
  return {
    NOME_DEVEDOR:         devedor?.nome || "",
    CPF_DEVEDOR:          devedor?.cpf_cnpj || "",
    RG_DEVEDOR:           devedor?.rg || "",
    TIPO_DEVEDOR:         devedor?.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica",
    PROFISSAO_DEVEDOR:    devedor?.profissao || "",
    EMAIL_DEVEDOR:        devedor?.email || "",
    TELEFONE_DEVEDOR:     devedor?.telefone || "",
    ENDERECO_DEVEDOR:     endDev,
    CIDADE_DEVEDOR:       devedor?.cidade || "",
    UF_DEVEDOR:           devedor?.uf || "",
    CEP_DEVEDOR:          devedor?.cep || "",
    SOCIO_DEVEDOR:        devedor?.socio_nome || "",
    QUALIFICACAO_DEVEDOR: qualificarPessoa(devedor),
    NOME_CREDOR:          credor?.nome || "",
    CPF_CREDOR:           credor?.cpf_cnpj || "",
    TIPO_CREDOR:          credor?.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica",
    QUALIFICACAO_CREDOR:  qualificarPessoa(credor),
    VALOR_ORIGINAL:       fmtBRL(resultado?.valorOriginal || 0),
    VALOR_CORRECAO:       fmtBRL(resultado?.correcao || 0),
    VALOR_JUROS:          fmtBRL(resultado?.juros || 0),
    VALOR_MULTA:          fmtBRL(resultado?.multa || 0),
    VALOR_HONORARIOS:     fmtBRL(resultado?.honorarios || 0),
    VALOR_TOTAL:          fmtBRL(resultado?.total || 0),
    VALOR_TOTAL_EXTENSO:  extenso(resultado?.total || 0),
    PCT_MULTA:            String(config.multa || "2") + "%",
    PCT_HONORARIOS:       String(config.honorariosPct || "20") + "%",
    INDICE_CORRECAO:      IDX_LABEL[config.indexador] || config.indexador || "IGP-M",
    TIPO_JUROS:           JUROS_LABEL[config.jurosTipo] || config.jurosTipo || "",
    MESES_DIVIDA:         String(resultado?.meses || 0),
    DESCRICAO_DIVIDA:     devedor?.descricao_divida || "",
    DATA_ORIGEM_DIVIDA:   fmtDataCurta(devedor?.data_origem_divida),
    DATA_CALCULO:         fmtDataCurta(dataCalculo),
    VALOR_ACORDO:         fmtBRL(totalAcordo),
    DESCONTO_PCT:         String(config.descontoPct || "0") + "%",
    NOME_ADVOGADO:        config.nomeAdvogado || "",
    OAB:                  config.oab || "",
    UF_OAB:               config.uf || "GO",
    VARA_JUIZO:           config.varaJuizo || "",
    COMARCA:              config.comarca || "",
    CIDADE_PETICAO:       config.cidade || "",
    DATA_HOJE:            fmtDataPorExtenso(hoje),
    DATA_HOJE_CURTA:      fmtDataCurta(hoje),
    NUMERO_PROCESSO:      devedor?.numero_processo || "",
    TIPO_ACAO:            TIPOS_PETICAO.find(t => t.v === tipoPeticao)?.l || "",
  };
}

// ─── ESTILOS ─────────────────────────────────────────────────
const S = {
  card:  { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 14 },
  label: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 5 },
  inp:   { width: "100%", border: "1px solid #e2e8f0", borderRadius: 8, padding: "8px 11px", fontSize: 13, fontFamily: "inherit", background: "#f8fafc", color: "#0f172a", outline: "none" },
  row2:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 },
  row3:  { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 },
  secao: { fontSize: 12, fontWeight: 800, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12, paddingBottom: 8, borderBottom: "2px solid #f1f5f9", display: "flex", alignItems: "center", gap: 8 },
  tab:   (a) => ({ padding: "10px 22px", fontSize: 13, fontWeight: 700, border: "none", borderRadius: "10px 10px 0 0", cursor: "pointer", background: a ? "#fff" : "transparent", color: a ? "#1e40af" : "#64748b", borderBottom: a ? "2px solid #1e40af" : "2px solid transparent" }),
  btnPrimary: { background: "#0f172a", color: "#c5f135", border: "none", borderRadius: 10, padding: "11px 0", fontSize: 13, fontWeight: 800, cursor: "pointer", width: "100%" },
  btnBlue:    { background: "#1e40af", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnGhost:   { background: "#f1f5f9", color: "#334155", border: "1px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  btnRed:     { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer" },
};

// ─── HOOK: LÓGICA DE CÁLCULO ──────────────────────────────────
function useCalculo({ devedores, credores }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [devId, setDevIdRaw] = useState("");
  const [dividasSel, setDividasSel] = useState([]);
  const [dataCalculo, setDataCalculo] = useState(hoje);
  const [indexador, setIndexador] = useState("igpm");
  const [jurosTipo, setJurosTipo] = useState("fixo_1");
  const [jurosAM, setJurosAM] = useState("1");
  const [multa, setMulta] = useState("2");
  const [honorariosPct, setHonorariosPct] = useState("20");
  const [regimeJuros, setRegimeJuros] = useState("composto");
  const [baseMulta, setBaseMulta] = useState("original");
  const [resultado, setResultado] = useState(null);
  const [tipoPeticao, setTipoPeticaoRaw] = useState("cobranca");
  const [art523Opcao, setArt523Opcao] = useState("nao_aplicar");

  function setTipoPeticao(t) {
    setTipoPeticaoRaw(t);
    // Cumprimento de sentença → pré-selecionar multa + honorários Art. 523
    if (t === "cumprimento") setArt523Opcao("multa_honorarios");
    else setArt523Opcao("nao_aplicar");
  }
  const [nomeAdvogado, setNomeAdvogado] = useState("");
  const [oab, setOab] = useState("");
  const [ufAdv, setUfAdv] = useState("GO");
  const [comarca, setComarca] = useState("Goiânia");
  const [varaJuizo, setVaraJuizo] = useState("1ª Vara Cível");
  const [cidadePeticao, setCidadePeticao] = useState("Goiânia");
  const [descontoPct, setDescontoPct] = useState("0");

  const devedor = useMemo(() => devedores.find(d => String(d.id) === String(devId)) || null, [devedores, devId]);
  const credor  = useMemo(() => devedor ? credores.find(c => String(c.id) === String(devedor.credor_id)) : null, [credores, devedor]);
  const dividasDevedor = devedor ? (devedor.dividas || []).filter(dv => !dv._nominal) : [];

  function setDevId(id) {
    setDevIdRaw(id);
    setDividasSel([]);
    setResultado(null);
    const d = devedores.find(x => String(x.id) === String(id));
    if (d) {
      const divs = (d.dividas || []).filter(dv => !dv._nominal);
      setDividasSel(divs.map(dv => dv.id));
      if (divs[0]?.honorarios_pct) setHonorariosPct(String(divs[0].honorarios_pct));
      if (divs[0]?.indexador)      setIndexador(divs[0].indexador);
      if (divs[0]?.juros_tipo)     setJurosTipo(divs[0].juros_tipo);
      if (divs[0]?.multa_pct)      setMulta(String(divs[0].multa_pct));
      if (d.cidade) setCidadePeticao(d.cidade);
      if (d.uf)     setUfAdv(d.uf);
    }
  }

  function calcular() {
    if (!devedor) { alert("Selecione um devedor."); return null; }
    const dividas = dividasDevedor.filter(dv => dividasSel.includes(dv.id));

    // fallback: sem dívidas cadastradas, usa valor_original
    if (dividas.length === 0) {
      const PV  = devedor.valor_original || 0;
      const dIni = devedor.data_origem_divida || devedor.data_recebimento_carteira || dataCalculo;
      if (!PV) { alert("Nenhuma dívida selecionada."); return null; }
      const fator   = calcularFatorCorrecao(indexador, dIni, dataCalculo);
      const correcao = PV * fator - PV;
      const PC      = PV + correcao;
      const jRes    = calcularJurosAcumulados({ principal: PC, dataInicio: dIni, dataFim: dataCalculo, jurosTipo, jurosAM, regime: regimeJuros });
      const multaVal = PC * (parseFloat(multa) || 0) / 100;
      const sub = PC + jRes.juros + multaVal;
      const hon = sub * (parseFloat(honorariosPct) || 0) / 100;
      const subtotalComHon = sub + hon;
      const art523Res = calcularArt523(subtotalComHon, art523Opcao);
      const res = { valorOriginal: PV, correcao, principalCorrigido: PC, juros: jRes.juros, multa: multaVal, honorarios: hon, honPct: parseFloat(honorariosPct)||0, subtotal: sub, subtotalComHon, total: subtotalComHon + art523Res.total_art523, art523: art523Res, meses: jRes.meses, dividasDetalhe: [] };
      setResultado(res);
      return res;
    }

    const dFim  = new Date(dataCalculo + "T12:00:00");
    const honPct = parseFloat(honorariosPct) || 0;
    let totalVO=0, totalCorr=0, totalJuros=0, totalMulta=0, totalHon=0;
    const dividasDetalhe = [];

    for (const div of dividas) {
      const PV   = div.valor_total || 0;
      if (!PV) continue;
      const dataIni = div.data_inicio_atualizacao || div.data_vencimento || div.data_origem;
      if (!dataIni) continue;
      const idxDiv = div.indexador || indexador;
      const jTipo  = div.juros_tipo || jurosTipo;
      const jAM    = parseFloat(div.juros_am ?? jurosAM);
      const mPct   = parseFloat(div.multa_pct ?? multa);
      const dIni   = new Date(dataIni + "T12:00:00");
      const meses  = Math.max(0,(dFim.getFullYear()-dIni.getFullYear())*12+(dFim.getMonth()-dIni.getMonth()));
      const fC     = calcularFatorCorrecao(idxDiv, dataIni, dataCalculo);
      const corrDiv = PV * fC - PV;
      const pcDiv   = PV + corrDiv;
      const jurosDiv = calcularJurosAcumulados({ principal: pcDiv, dataInicio: dataIni, dataFim: dataCalculo, jurosTipo: jTipo, jurosAM: jAM, regime: regimeJuros }).juros;
      const baseM   = baseMulta === "corrigido" ? pcDiv : PV;
      const multaDiv = baseM * mPct / 100;
      const subDiv  = pcDiv + jurosDiv + multaDiv;
      const honDiv  = subDiv * honPct / 100;
      totalVO += PV; totalCorr += corrDiv; totalJuros += jurosDiv; totalMulta += multaDiv; totalHon += honDiv;
      dividasDetalhe.push({ descricao: div.descricao||"Dívida", dataIni, meses, valor:PV, correcao:corrDiv, principalCorrigido:pcDiv, juros:jurosDiv, multa:multaDiv, honorarios:honDiv, total:pcDiv+jurosDiv+multaDiv+honDiv });
    }

    const totalPC   = totalVO + totalCorr;
    const subtotal  = totalPC + totalJuros + totalMulta;
    const subtotalComHon = subtotal + totalHon;
    const art523Res = calcularArt523(subtotalComHon, art523Opcao);
    const total     = subtotalComHon + art523Res.total_art523;
    const mesesGlobal = dividasDetalhe.length > 0 ? Math.max(...dividasDetalhe.map(d => d.meses)) : 0;
    const res = { valorOriginal:totalVO, correcao:totalCorr, principalCorrigido:totalPC, juros:totalJuros, multa:totalMulta, honorarios:totalHon, honPct, subtotal, subtotalComHon, total, art523: art523Res, meses:mesesGlobal, dividasDetalhe };
    setResultado(res);
    return res;
  }

  const config = { indexador, jurosTipo, jurosAM, multa, honorariosPct, regimeJuros, baseMulta, nomeAdvogado, oab, uf: ufAdv, comarca, varaJuizo, cidade: cidadePeticao, descontoPct, art523Opcao };

  return {
    devId, setDevId, devedor, credor, dividasDevedor, dividasSel, setDividasSel,
    dataCalculo, setDataCalculo, indexador, setIndexador, jurosTipo, setJurosTipo,
    jurosAM, setJurosAM, multa, setMulta, honorariosPct, setHonorariosPct,
    regimeJuros, setRegimeJuros, baseMulta, setBaseMulta,
    tipoPeticao, setTipoPeticao, nomeAdvogado, setNomeAdvogado,
    oab, setOab, ufAdv, setUfAdv, comarca, setComarca,
    varaJuizo, setVaraJuizo, cidadePeticao, setCidadePeticao,
    art523Opcao, setArt523Opcao,
    descontoPct, setDescontoPct, resultado, setResultado, calcular, config,
  };
}

// ─── PAINEL: SELEÇÃO DE DEVEDOR + CÁLCULO ────────────────────
function PainelCalculo({ c, devedores }) {
  return (
    <div>
      {/* Devedor */}
      <div style={S.card}>
        <div style={S.secao}><span>👤</span> Devedor</div>
        <label style={S.label}>Selecione o Devedor *</label>
        <select value={c.devId} onChange={e => c.setDevId(e.target.value)} style={{ ...S.inp, marginBottom: 10 }}>
          <option value="">— Escolha o devedor —</option>
          {devedores.map(d => <option key={d.id} value={d.id}>{d.nome}{d.cpf_cnpj ? ` (${d.cpf_cnpj})` : ""}</option>)}
        </select>
        {c.devedor && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "9px 11px", fontSize: 12, color: "#475569", lineHeight: 1.8 }}>
            <strong>{c.devedor.nome}</strong> — {c.devedor.tipo === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}
            {c.devedor.cpf_cnpj && <> | {c.devedor.cpf_cnpj}</>}
            {c.credor && <><br /><strong>Credor:</strong> {c.credor.nome}</>}
          </div>
        )}
      </div>

      {/* Dívidas */}
      {c.dividasDevedor.length > 0 && (
        <div style={S.card}>
          <div style={S.secao}><span>💰</span> Dívidas</div>
          {c.dividasDevedor.map(div => (
            <label key={div.id} style={{ display:"flex", alignItems:"flex-start", gap:9, marginBottom:8, cursor:"pointer" }}>
              <input type="checkbox" checked={c.dividasSel.includes(div.id)}
                onChange={e => { const n = e.target.checked ? [...c.dividasSel, div.id] : c.dividasSel.filter(x => x !== div.id); c.setDividasSel(n); c.setResultado(null); }}
                style={{ marginTop:2, accentColor:"#16a34a" }} />
              <div style={{ fontSize:12 }}>
                <div style={{ fontWeight:700 }}>{div.descricao || "Dívida"}</div>
                <div style={{ color:"#64748b" }}>{fmtBRL(div.valor_total)} — venc. {div.data_vencimento ? fmtDataCurta(div.data_vencimento) : div.data_origem ? fmtDataCurta(div.data_origem) : "—"}</div>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Parâmetros */}
      <div style={S.card}>
        <div style={S.secao}><span>🧮</span> Parâmetros de Cálculo</div>
        <div style={S.row2}>
          <div><label style={S.label}>Data do Cálculo</label>
            <input type="date" value={c.dataCalculo} onChange={e => { c.setDataCalculo(e.target.value); c.setResultado(null); }} style={S.inp} /></div>
          <div><label style={S.label}>Índice de Correção</label>
            <select value={c.indexador} onChange={e => { c.setIndexador(e.target.value); c.setResultado(null); }} style={S.inp}>
              {INDICE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select></div>
        </div>
        <div style={S.row2}>
          <div><label style={S.label}>Tipo de Juros</label>
            <select value={c.jurosTipo} onChange={e => { c.setJurosTipo(e.target.value); c.setResultado(null); }} style={S.inp}>
              {JUROS_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select></div>
          <div><label style={S.label}>Regime</label>
            <select value={c.regimeJuros} onChange={e => { c.setRegimeJuros(e.target.value); c.setResultado(null); }} style={S.inp}>
              <option value="composto">Composto</option>
              <option value="simples">Simples</option>
            </select></div>
        </div>
        <div style={S.row3}>
          <div><label style={S.label}>Multa (%)</label>
            <input type="number" value={c.multa} onChange={e => { c.setMulta(e.target.value); c.setResultado(null); }} style={S.inp} step="0.5" min="0" /></div>
          <div><label style={S.label}>Honorários (%)</label>
            <input type="number" value={c.honorariosPct} onChange={e => { c.setHonorariosPct(e.target.value); c.setResultado(null); }} style={S.inp} step="1" min="0" /></div>
          <div><label style={S.label}>Base Multa</label>
            <select value={c.baseMulta} onChange={e => { c.setBaseMulta(e.target.value); c.setResultado(null); }} style={S.inp}>
              <option value="original">Original</option>
              <option value="corrigido">Corrigido</option>
            </select></div>
        </div>
        <Art523Option value={c.art523Opcao} onChange={v => { c.setArt523Opcao(v); c.setResultado(null); }} />
        <button onClick={c.calcular} disabled={!c.devId} style={{ ...S.btnPrimary, opacity: c.devId?1:0.5, cursor:c.devId?"pointer":"not-allowed" }}>
          🧮 Calcular Débito Atualizado
        </button>
      </div>

      {/* Resultado */}
      {c.resultado && (
        <div style={{ ...S.card, background:"linear-gradient(135deg,#f0fdf4,#ecfdf5)", border:"1px solid #bbf7d0" }}>
          <div style={{ ...S.secao, color:"#14532d" }}><span>✅</span> Resultado</div>
          {[["Principal",c.resultado.valorOriginal],["Correção",c.resultado.correcao],["Juros",c.resultado.juros],["Multa",c.resultado.multa],["Honorários",c.resultado.honorarios]].map(([l,v])=>(
            <div key={l} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid #d1fae5" }}>
              <span style={{ color:"#166534" }}>{l}</span>
              <span style={{ fontWeight:700 }}>{fmtBRL(v)}</span>
            </div>
          ))}
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, paddingTop:8, borderTop:"2px solid #22c55e" }}>
            <span style={{ fontWeight:800, color:"#14532d", fontSize:13 }}>TOTAL</span>
            <span style={{ fontWeight:900, color:"#14532d", fontSize:15 }}>{fmtBRL(c.resultado.total)}</span>
          </div>
          <div style={{ fontSize:11, color:"#6b7280", marginTop:4 }}>{c.resultado.meses} meses · ref. {fmtDataCurta(c.dataCalculo)}</div>
        </div>
      )}
    </div>
  );
}

// ─── INDEXEDDB: fallback local com suporte a arquivos grandes ──
const IDB_NAME  = "mr_cobrancas";
const IDB_STORE = "modelos_peticao";

function idbOpen() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE))
        db.createObjectStore(IDB_STORE, { keyPath: "id" });
    };
    req.onsuccess = e => res(e.target.result);
    req.onerror   = e => rej(e.target.error);
  });
}
async function idbGetAll() {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readonly").objectStore(IDB_STORE).getAll();
    req.onsuccess = () => res(req.result || []);
    req.onerror   = () => rej(req.error);
  });
}
async function idbInsert(novo) {
  const db   = await idbOpen();
  const item = { ...novo, id: Date.now(), criado_em: new Date().toISOString() };
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).add(item);
    req.onsuccess = () => res(item);
    req.onerror   = () => rej(req.error);
  });
}
async function idbDelete(id) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const req = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE).delete(id);
    req.onsuccess = () => res();
    req.onerror   = () => rej(req.error);
  });
}
async function idbUpdate(id, patch) {
  const db = await idbOpen();
  return new Promise((res, rej) => {
    const store  = db.transaction(IDB_STORE, "readwrite").objectStore(IDB_STORE);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const updated = { ...getReq.result, ...patch };
      const put = store.put(updated);
      put.onsuccess = () => res(updated);
      put.onerror   = () => rej(put.error);
    };
    getReq.onerror = () => rej(getReq.error);
  });
}

// Converte ArrayBuffer → base64 em chunks para evitar "Maximum call stack size exceeded"
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// ─── ABA: MEUS MODELOS (.docx) ───────────────────────────────
function AbaModelos({ c, devedores }) {
  const [modelos, setModelos]       = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [dragOver, setDragOver]     = useState(false);
  const [gerando, setGerando]       = useState(null);
  const [salvando, setSalvando]     = useState(false);
  const [erro, setErro]             = useState("");
  const [modoLocal, setModoLocal]   = useState(false);
  // Fluxo de nomeação antes de salvar
  const [pendente, setPendente]     = useState(null); // { base64, tamanho, nomeArq }
  const [nomeInput, setNomeInput]   = useState("");
  // Renomear inline
  const [renomId, setRenomId]       = useState(null);
  const [renomNome, setRenomNome]   = useState("");
  const fileRef = useRef();

  // Carregar modelos — tenta Supabase, cai para IndexedDB se tabela não existe
  useEffect(() => {
    async function carregar() {
      try {
        const data = await dbGet("modelos_peticao", "order=id.asc");
        setModelos(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.status === 404 || e.message?.includes("schema cache") || e.message?.includes("does not exist") || e.status === 400) {
          setModoLocal(true);
          setModelos(await idbGetAll());
        } else {
          setErro("Não foi possível carregar os modelos: " + e.message);
        }
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  // 1ª etapa: lê o arquivo e abre o painel de nomeação
  function processarArquivo(file) {
    if (!file) return;
    if (!file.name.match(/\.docx$/i)) { setErro("Apenas arquivos .docx são suportados."); return; }
    setErro("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const base64 = arrayBufferToBase64(e.target.result);
        const nomeArq = file.name.replace(/\.docx$/i, "");
        setPendente({ base64, tamanho: file.size, nomeArq });
        setNomeInput(nomeArq);
      } catch (ex) {
        setErro("Erro ao ler arquivo: " + ex.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // 2ª etapa: salva com o nome escolhido
  async function confirmarSalvar() {
    if (!pendente) return;
    const nomeFinal = nomeInput.trim() || pendente.nomeArq;
    setSalvando(true); setErro("");
    try {
      const novo = { nome: nomeFinal, arquivo: pendente.base64, tamanho: pendente.tamanho };
      if (modoLocal) {
        const saved = await idbInsert(novo);
        setModelos(prev => [...prev, saved]);
      } else {
        try {
          const saved = await dbInsert("modelos_peticao", novo);
          setModelos(prev => [...prev, Array.isArray(saved) ? saved[0] : saved]);
        } catch (ex) {
          if (ex.message?.includes("schema cache") || ex.message?.includes("does not exist") || ex.status === 400 || ex.status === 404) {
            setModoLocal(true);
            const saved = await idbInsert(novo);
            setModelos(prev => [...prev, saved]);
          } else { throw ex; }
        }
      }
      setPendente(null); setNomeInput("");
    } catch (ex) {
      setErro("Erro ao salvar modelo: " + ex.message);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(id) {
    if (!confirm("Remover este modelo?")) return;
    try {
      if (modoLocal) { await idbDelete(id); }
      else { await dbDelete("modelos_peticao", id); }
      setModelos(prev => prev.filter(m => m.id !== id));
    } catch (e) { setErro("Erro ao remover: " + e.message); }
  }

  async function confirmarRenomear(id) {
    if (!renomNome.trim()) return;
    try {
      if (modoLocal) { await idbUpdate(id, { nome: renomNome.trim() }); }
      else { await dbUpdate("modelos_peticao", id, { nome: renomNome.trim() }); }
      setModelos(prev => prev.map(x => x.id === id ? { ...x, nome: renomNome.trim() } : x));
      setRenomId(null); setRenomNome("");
    } catch (e) { setErro("Erro ao renomear: " + e.message); }
  }

  async function gerarDocx(modelo) {
    setErro("");
    let res = c.resultado;
    if (!res) { res = c.calcular(); if (!res) return; }
    if (!c.devedor) { setErro("Selecione um devedor antes de gerar."); return; }
    setGerando(modelo.id);
    try {
      const { Docxtemplater, PizZip } = await carregarDocxtemplater();
      const dados = montarDados({ devedor:c.devedor, credor:c.credor, resultado:res, config:c.config, dataCalculo:c.dataCalculo, tipoPeticao:c.tipoPeticao });
      const binary = atob(modelo.arquivo);
      const bytes = new Uint8Array(binary.length);
      for (let i=0; i<binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const zip = new PizZip(bytes);
      const doc = new Docxtemplater(zip, { paragraphLoop:true, linebreaks:true, delimiters:{ start:"{", end:"}" } });
      doc.render(dados);
      const out = doc.getZip().generate({ type:"blob", mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
      const nome = `${modelo.nome}_${c.devedor.nome.replace(/\s+/g,"_")}.docx`;
      const url = URL.createObjectURL(out);
      const a = document.createElement("a"); a.href=url; a.download=nome; a.click();
      URL.revokeObjectURL(url);
    } catch(e) {
      console.error(e);
      const tags = e.properties?.errors?.map(er => er.properties?.tag || er.message).join(", ");
      setErro(tags ? `Marcadores inválidos no template: ${tags}` : "Erro ao gerar: " + e.message);
    } finally {
      setGerando(null);
    }
  }

  const grupos = [...new Set(PLACEHOLDERS.map(p => p.grupo))];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1.4fr", gap:20 }}>
      {/* Col Esq: devedor + cálculo + config adv */}
      <div>
        <PainelCalculo c={c} devedores={devedores} />
        <div style={S.card}>
          <div style={S.secao}><span>⚖️</span> Dados do Advogado</div>
          <div style={S.row2}>
            <div><label style={S.label}>Nome do Advogado(a)</label><input value={c.nomeAdvogado} onChange={e=>c.setNomeAdvogado(e.target.value)} style={S.inp} placeholder="Dr(a). ..." /></div>
            <div><label style={S.label}>OAB nº</label><input value={c.oab} onChange={e=>c.setOab(e.target.value)} style={S.inp} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Comarca</label><input value={c.comarca} onChange={e=>c.setComarca(e.target.value)} style={S.inp} /></div>
            <div><label style={S.label}>Cidade (assinar)</label><input value={c.cidadePeticao} onChange={e=>c.setCidadePeticao(e.target.value)} style={S.inp} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Vara / Juízo</label>
              <select value={c.varaJuizo} onChange={e=>c.setVaraJuizo(e.target.value)} style={S.inp}>
                {VARAS.map(v=><option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div><label style={S.label}>UF da OAB</label>
              <select value={c.ufAdv} onChange={e=>c.setUfAdv(e.target.value)} style={S.inp}>
                {UFS_LIST.map(u=><option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Tipo de Ação</label>
              <select value={c.tipoPeticao} onChange={e=>c.setTipoPeticao(e.target.value)} style={S.inp}>
                {TIPOS_PETICAO.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Desconto Acordo (%)</label>
              <input type="number" value={c.descontoPct} onChange={e=>c.setDescontoPct(e.target.value)} style={S.inp} min="0" max="100" />
            </div>
          </div>
        </div>
      </div>

      {/* Col Dir: upload + modelos + placeholders */}
      <div>
        <div style={S.card}>
          <div style={S.secao}><span>{modoLocal ? "💾" : "☁️"}</span> Meus Modelos Word{modoLocal ? " — Local" : " — Nuvem"}</div>

          {/* Banner modo local */}
          {modoLocal && (
            <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#78350f", marginBottom:12, lineHeight:1.6 }}>
              <strong>Salvando neste computador</strong> — os modelos ficam no navegador (localStorage).<br/>
              Para salvar na nuvem, crie a tabela <code>modelos_peticao</code> no Supabase e recarregue.
            </div>
          )}

          {/* Upload */}
          <div
            onDrop={e => { e.preventDefault(); setDragOver(false); processarArquivo(e.dataTransfer.files[0]); }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileRef.current?.click()}
            style={{ border:`2px dashed ${dragOver?"#1e40af":"#cbd5e1"}`, borderRadius:12, padding:"24px 16px", textAlign:"center", cursor:salvando?"wait":"pointer", background:dragOver?"#eff6ff":"#f8fafc", marginBottom:14, transition:"all .2s" }}>
            <input ref={fileRef} type="file" accept=".docx" style={{ display:"none" }} onChange={e=>processarArquivo(e.target.files[0])} />
            <div style={{ fontSize:28, marginBottom:6 }}>{salvando ? "⏳" : "📄"}</div>
            <div style={{ fontSize:13, fontWeight:700, color:"#1e40af" }}>{salvando ? "Salvando..." : "Arraste o .docx ou clique para selecionar"}</div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{modoLocal ? "Salvo neste computador (navegador)" : "Salvo automaticamente no Supabase · disponível em qualquer dispositivo"}</div>
          </div>

          {erro && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"9px 12px", fontSize:12, color:"#dc2626", marginBottom:10 }}>⚠️ {erro}</div>}

          {/* Painel de confirmação de nome antes de salvar */}
          {pendente && (
            <div style={{ background:"#f0fdf4", border:"2px solid #86efac", borderRadius:12, padding:"14px 16px", marginBottom:12 }}>
              <div style={{ fontWeight:800, fontSize:13, color:"#14532d", marginBottom:10 }}>📄 Nomear modelo antes de salvar</div>
              <label style={S.label}>Nome do modelo</label>
              <input
                value={nomeInput}
                onChange={e => setNomeInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && confirmarSalvar()}
                autoFocus
                placeholder="Ex: Ação de Cobrança — Timbre Escritório"
                style={{ ...S.inp, marginBottom:10, fontWeight:600 }}
              />
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={confirmarSalvar} disabled={salvando}
                  style={{ ...S.btnBlue, flex:1, padding:"9px 0", fontSize:13 }}>
                  {salvando ? "⏳ Salvando..." : "✅ Salvar modelo"}
                </button>
                <button onClick={() => { setPendente(null); setNomeInput(""); }}
                  style={{ ...S.btnGhost, padding:"9px 14px" }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Lista de modelos */}
          {carregando ? (
            <div style={{ textAlign:"center", color:"#94a3b8", fontSize:12, padding:"16px 0" }}>⏳ Carregando modelos...</div>
          ) : modelos.length === 0 ? (
            <div style={{ textAlign:"center", color:"#94a3b8", fontSize:12, padding:"12px 0" }}>Nenhum modelo salvo. Faça o upload do seu primeiro modelo Word.</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {modelos.map(m => (
                <div key={m.id} style={{ border:"1px solid #e2e8f0", borderRadius:10, padding:"11px 13px", background:"#fff" }}>
                  {renomId === m.id ? (
                    <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                      <input
                        value={renomNome}
                        onChange={e => setRenomNome(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") confirmarRenomear(m.id); if (e.key === "Escape") setRenomId(null); }}
                        autoFocus
                        style={{ ...S.inp, flex:1, fontWeight:600 }}
                      />
                      <button onClick={() => confirmarRenomear(m.id)} style={S.btnBlue}>✅</button>
                      <button onClick={() => setRenomId(null)} style={S.btnGhost}>✕</button>
                    </div>
                  ) : (
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:22, flexShrink:0 }}>📝</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{m.nome}</div>
                        <div style={{ fontSize:11, color:"#94a3b8" }}>{m.tamanho ? (m.tamanho/1024).toFixed(1)+" KB · " : ""}{m.criado_em ? fmtDataCurta(m.criado_em.slice(0,10)) : ""}</div>
                      </div>
                      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                        <button onClick={() => gerarDocx(m)} disabled={!c.devId || gerando===m.id}
                          style={{ ...S.btnBlue, opacity:c.devId?1:0.5, cursor:c.devId?"pointer":"not-allowed" }}>
                          {gerando===m.id ? "⏳" : "⬇️ Gerar"}
                        </button>
                        <button onClick={() => { setRenomId(m.id); setRenomNome(m.nome); }} style={S.btnGhost} title="Renomear">✏️</button>
                        <button onClick={() => remover(m.id)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }} title="Remover">Excluir</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Referência de marcadores */}
        <div style={S.card}>
          <div style={S.secao}><span>📋</span> Marcadores para o Word</div>
          <p style={{ fontSize:12, color:"#64748b", marginTop:0, marginBottom:10, lineHeight:1.6 }}>
            Coloque estes marcadores no seu modelo Word com as chaves <code style={{ background:"#f1f5f9", padding:"1px 4px", borderRadius:4 }}>{"{ }"}</code>. Clique para copiar.
          </p>
          {grupos.map(grupo => (
            <div key={grupo} style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:5, borderBottom:"1px solid #f1f5f9", paddingBottom:3 }}>{grupo}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                {PLACEHOLDERS.filter(p=>p.grupo===grupo).map(p => (
                  <div key={p.chave}
                    onClick={() => { navigator.clipboard?.writeText("{"+p.chave+"}"); }}
                    title={p.desc + " — clique para copiar"}
                    style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:6, padding:"4px 8px", cursor:"pointer" }}>
                    <span style={{ fontFamily:"monospace", fontSize:10, fontWeight:700, color:"#1e40af" }}>{"{"+p.chave+"}"}</span>
                    <span style={{ fontSize:9, color:"#94a3b8", display:"block", marginTop:1 }}>{p.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"9px 11px", fontSize:11, color:"#78350f", marginTop:6 }}>
            💡 No Word, use <strong>Ctrl+H</strong> (Localizar e Substituir) para inserir os marcadores. Salve sempre como <strong>.docx</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GERADOR DE TEXTO AUTOMÁTICO ─────────────────────────────
function gerarTextoPeticao({ tipo, devedor, credor, resultado, config, dataCalculo }) {
  const nomeAdv = config.nomeAdvogado || "_______________";
  const oab     = config.oab || "_______________";
  const juizo   = config.varaJuizo || "_______________";
  const comarca = config.comarca || "_______________";
  const cidade  = config.cidade || "_______________";
  const uf      = config.uf || "_______________";
  const dataHoje      = fmtDataPorExtenso(new Date().toISOString().slice(0,10));
  const valorOriginal = fmtBRL(resultado?.valorOriginal||0);
  const valorCorrecao = fmtBRL(resultado?.correcao||0);
  const valorJuros    = fmtBRL(resultado?.juros||0);
  const valorMulta    = fmtBRL(resultado?.multa||0);
  const valorHon      = fmtBRL(resultado?.honorarios||0);
  const totalGeral    = fmtBRL(resultado?.total||0);
  const meses         = resultado?.meses||0;
  const idxLabel      = IDX_LABEL[config.indexador]||config.indexador||"IGP-M";
  const jurosLabel    = JUROS_LABEL[config.jurosTipo]||config.jurosTipo||"1% a.m.";
  const qualDev  = devedor ? qualificarPessoa(devedor) : "_______________";
  const qualCred = credor  ? qualificarPessoa({ ...credor, logradouro:undefined }) : "_______________";
  const descDiv  = devedor?.descricao_divida || "contrato/título de crédito";
  const dataOri  = devedor?.data_origem_divida || devedor?.data_recebimento_carteira || "";

  const art523Linha = resultado?.art523?.total_art523 > 0
    ? `${resultado.art523.multa > 0 ? `\n  Art. 523 §1º CPC - Multa (10%):   ${fmtBRL(resultado.art523.multa)}` : ""}${resultado.art523.honorarios_sucumbenciais > 0 ? `\n  Art. 523 §1º CPC - Honor. (10%):  ${fmtBRL(resultado.art523.honorarios_sucumbenciais)}` : ""}`
    : "";

  const bloco = `
  Principal:               ${valorOriginal}
  Correção (${idxLabel}, ${meses}m): ${valorCorrecao}
  Juros (${jurosLabel}): ${valorJuros}
  Multa (${config.multa||"2"}%):         ${valorMulta}
  Honorários (${config.honorariosPct||"20"}%):  ${valorHon}${art523Linha}
  ─────────────────────────────────
  TOTAL:                   ${totalGeral}`;

  const textoArt523 = resultado?.art523?.total_art523 > 0
    ? `\nConsiderando o descumprimento voluntário no prazo do Art. 523 do CPC, aplica-se ao débito a multa de 10% (dez por cento)${resultado.art523.honorarios_sucumbenciais > 0 ? " e honorários advocatícios de 10% (dez por cento), totalizando acréscimo de 20% sobre o valor atualizado," : ","} conforme §1º do mesmo dispositivo.`
    : "";

  if (tipo === "cobranca") return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${juizo.toUpperCase()}
COMARCA DE ${comarca.toUpperCase()} — ${uf.toUpperCase()}

${(credor?.nome||"REQUERENTE").toUpperCase()}, ${qualCred}, por seu advogado ${nomeAdv}, OAB/${uf} nº ${oab}, propõe

AÇÃO DE COBRANÇA

em face de ${(devedor?.nome||"REQUERIDO").toUpperCase()}, ${qualDev}:

I — DOS FATOS
Credora do(a) Requerido(a) em razão de ${descDiv}, celebrado(a) em ${fmtDataPorExtenso(dataOri)||"data indicada nos documentos"}, no valor original de ${valorOriginal}. O(A) Requerido(a) não efetuou o pagamento, tornando necessária a presente ação.

II — DO DIREITO
Fundamento nos arts. 389 e 395 do CC. Correção pelo ${idxLabel} desde o vencimento (STJ, Súmula 43). Juros: ${jurosLabel} (art. 406 CC). Multa de ${config.multa||"2"}% (art. 408 CC). Honorários contratuais de ${config.honorariosPct||"20"}% (art. 22 Lei 8.906/94).

III — VALOR ATUALIZADO (até ${fmtDataCurta(dataCalculo)})${bloco}

IV — DOS PEDIDOS
a) Citação para pagar ou contestar; b) Condenação ao pagamento de ${totalGeral} corrigido até efetivo pagamento; c) Custas e honorários sucumbenciais (art. 85 CPC).

Valor da causa: ${totalGeral} (${extenso(resultado?.total||0)}).

Nestes termos, pede deferimento.
${cidade}, ${dataHoje}.

${nomeAdv} | OAB/${uf} nº ${oab}`;

  if (tipo === "monitoria") return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${juizo.toUpperCase()}
COMARCA DE ${comarca.toUpperCase()} — ${uf.toUpperCase()}

${(credor?.nome||"REQUERENTE").toUpperCase()}, ${qualCred}, por seu advogado ${nomeAdv}, OAB/${uf} nº ${oab}, propõe

AÇÃO MONITÓRIA (art. 700 e ss. CPC/2015)

em face de ${(devedor?.nome||"REQUERIDO").toUpperCase()}, ${qualDev}.

I — DO DOCUMENTO HÁBIL: ${descDiv}, vencido em ${fmtDataPorExtenso(dataOri)||"data nos documentos"}, representativo de obrigação de ${valorOriginal}.

II — VALOR ATUALIZADO (até ${fmtDataCurta(dataCalculo)})${bloco}

III — PEDIDOS: a) Mandado de pagamento em 15 dias; b) Ausentes embargos, conversão em mandado executivo; c) Custas e honorários sucumbenciais.

Valor da causa: ${totalGeral}. Nestes termos, pede deferimento.
${cidade}, ${dataHoje}. ${nomeAdv} | OAB/${uf} nº ${oab}`;

  if (tipo === "execucao") return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${juizo.toUpperCase()}
COMARCA DE ${comarca.toUpperCase()} — ${uf.toUpperCase()}

${(credor?.nome||"EXEQUENTE").toUpperCase()}, ${qualCred}, por seu advogado ${nomeAdv}, OAB/${uf} nº ${oab}, propõe

EXECUÇÃO DE TÍTULO EXTRAJUDICIAL (art. 824 e ss. CPC/2015)

em face de ${(devedor?.nome||"EXECUTADO").toUpperCase()}, ${qualDev}.

I — DO TÍTULO: ${descDiv} — obrigação certa, líquida e exigível de ${valorOriginal}, vencida em ${fmtDataPorExtenso(dataOri)||"data nos documentos"}.

II — VALOR EXEQUENDO (até ${fmtDataCurta(dataCalculo)})${bloco}

III — PEDIDOS: a) Citação para pagar em 3 dias úteis ou nomear bens (art. 829 CPC); b) Penhora de bens suficientes; c) Honorários executivos de 10% (art. 827 CPC).

Valor da execução: ${totalGeral}. Nestes termos, pede deferimento.
${cidade}, ${dataHoje}. ${nomeAdv} | OAB/${uf} nº ${oab}`;

  if (tipo === "cumprimento") return `EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA ${juizo.toUpperCase()}
COMARCA DE ${comarca.toUpperCase()} — ${uf.toUpperCase()}

${(credor?.nome||"EXEQUENTE").toUpperCase()}, ${qualCred}, por seu advogado ${nomeAdv}, OAB/${uf} nº ${oab}, vem, com fundamento no art. 523 do CPC, requerer o

CUMPRIMENTO DE SENTENÇA

em face de ${(devedor?.nome||"EXECUTADO").toUpperCase()}, ${qualDev}.

I — DOS FATOS
A presente execução decorre de título judicial consubstanciado em ${descDiv}. Intimado(a) para pagar no prazo de 15 (quinze) dias (art. 523 CPC), o(a) Executado(a) não efetuou o pagamento voluntário.

II — DO DÉBITO EXEQUENDO (até ${fmtDataCurta(dataCalculo)})${bloco}
${textoArt523}

III — DOS PEDIDOS
a) Expedição de mandado de penhora e avaliação de bens do(a) Executado(a);
b) Inclusão da multa de 10% e honorários de 10% previstos no art. 523, §1º, CPC, pelo descumprimento voluntário;
c) Condenação nas custas e demais despesas processuais.

Valor da execução: ${totalGeral} (${extenso(resultado?.total||0)}).

Nestes termos, pede deferimento.
${cidade}, ${dataHoje}.

${nomeAdv} | OAB/${uf} nº ${oab}`;

  if (tipo === "notificacao") return `NOTIFICAÇÃO EXTRAJUDICIAL

NOTIFICANTE: ${(credor?.nome||"").toUpperCase()} ${credor?.cpf_cnpj?`| CNPJ/CPF: ${credor.cpf_cnpj}`:""}
NOTIFICADO(A): ${(devedor?.nome||"").toUpperCase()} ${devedor?.cpf_cnpj?`| CPF/CNPJ: ${devedor.cpf_cnpj}`:""}
${devedor?.logradouro?`Endereço: ${[devedor.logradouro,devedor.numero,devedor.bairro,devedor.cidade,devedor.uf].filter(Boolean).join(", ")}`:""}

Comunica-se que Vossa Senhoria possui débito referente a ${descDiv}, no valor total atualizado de ${totalGeral} (até ${fmtDataCurta(dataCalculo)}):${bloco}

Fica NOTIFICADO(A) para quitar o débito em 10 (dez) dias, sob pena de ajuizamento imediato e inclusão em cadastros de inadimplentes.

${cidade}, ${dataHoje}. ${nomeAdv} | OAB/${uf} nº ${oab}`;

  if (tipo === "acordo") {
    const desconto = config.descontoPct ? (resultado?.total||0)*(1-parseFloat(config.descontoPct)/100) : (resultado?.total||0);
    return `PROPOSTA DE ACORDO EXTRAJUDICIAL

CREDOR:    ${(credor?.nome||"").toUpperCase()}
DEVEDOR:   ${(devedor?.nome||"").toUpperCase()} ${devedor?.cpf_cnpj?`| CPF/CNPJ: ${devedor.cpf_cnpj}`:""}

DEMONSTRATIVO (até ${fmtDataCurta(dataCalculo)}):${bloco}
${config.descontoPct&&config.descontoPct!=="0"?`  Desconto (${config.descontoPct}%):         ${fmtBRL((resultado?.total||0)-desconto)}`:""}
  VALOR PARA ACORDO:       ${fmtBRL(desconto)}

CONDIÇÕES: ( ) À vista: ${fmtBRL(desconto)}  ( ) Parcelado: ____ x R$ ______
Validade desta proposta: 15 dias a contar desta data.

${cidade}, ${dataHoje}. ${nomeAdv} | OAB/${uf} nº ${oab}`;
  }
  return "";
}

// ─── ABA: PETIÇÃO AUTOMÁTICA ──────────────────────────────────
function AbaPeticoes({ c, devedores }) {
  const [peticaoTexto, setPeticaoTexto] = useState("");
  const [preview, setPreview] = useState(false);

  function gerarPeticao() {
    let res = c.resultado;
    if (!res) { res = c.calcular(); if (!res) return; }
    const texto = gerarTextoPeticao({ tipo:c.tipoPeticao, devedor:c.devedor, credor:c.credor, resultado:res, config:c.config, dataCalculo:c.dataCalculo });
    setPeticaoTexto(texto); setPreview(true);
  }

  function imprimir() {
    if (!peticaoTexto) return;
    const w = window.open("","_blank","width=900,height=700");
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>Petição</title>
<style>@page{size:A4;margin:2.5cm 3cm 2.5cm 3.5cm}body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;color:#000;background:#fff}pre{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.8;white-space:pre-wrap;word-wrap:break-word;margin:0}.bar{background:#f1f5f9;padding:12px 20px;margin-bottom:20px;border-radius:8px;display:flex;gap:12px;align-items:center}@media print{.bar{display:none}}</style></head><body>
<div class="bar"><button onclick="window.print()" style="background:#1e40af;color:#fff;border:none;border-radius:8px;padding:8px 20px;font-size:13px;cursor:pointer;font-weight:700;">🖨️ Imprimir / PDF</button><button onclick="window.close()" style="background:#e2e8f0;color:#475569;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;">✕ Fechar</button><span style="font-size:11px;color:#64748b">Ctrl+P → Salvar como PDF</span></div>
<pre>${peticaoTexto.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
<div style="margin-top:40px;border-top:1px solid #999;padding-top:10px;font-size:9pt;color:#888;text-align:center">MR Cobranças — ${new Date().toLocaleString("pt-BR")}</div></body></html>`);
    w.document.close(); w.focus();
  }

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
      <div><PainelCalculo c={c} devedores={devedores} /></div>
      <div>
        <div style={S.card}>
          <div style={S.secao}><span>📄</span> Configuração</div>
          <label style={S.label}>Tipo de Petição *</label>
          <select value={c.tipoPeticao} onChange={e=>c.setTipoPeticao(e.target.value)} style={{ ...S.inp, marginBottom:12 }}>
            {TIPOS_PETICAO.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
          <div style={S.row2}>
            <div><label style={S.label}>Advogado(a)</label><input value={c.nomeAdvogado} onChange={e=>c.setNomeAdvogado(e.target.value)} style={S.inp} placeholder="Dr(a). ..." /></div>
            <div><label style={S.label}>OAB nº</label><input value={c.oab} onChange={e=>c.setOab(e.target.value)} style={S.inp} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Vara</label><select value={c.varaJuizo} onChange={e=>c.setVaraJuizo(e.target.value)} style={S.inp}>{VARAS.map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div><label style={S.label}>Comarca</label><input value={c.comarca} onChange={e=>c.setComarca(e.target.value)} style={S.inp} /></div>
          </div>
          <div style={S.row2}>
            <div><label style={S.label}>Cidade</label><input value={c.cidadePeticao} onChange={e=>c.setCidadePeticao(e.target.value)} style={S.inp} /></div>
            <div><label style={S.label}>UF OAB</label><select value={c.ufAdv} onChange={e=>c.setUfAdv(e.target.value)} style={S.inp}>{UFS_LIST.map(u=><option key={u} value={u}>{u}</option>)}</select></div>
          </div>
          {c.tipoPeticao === "acordo" && <div style={{ marginBottom:12 }}><label style={S.label}>Desconto (%)</label><input type="number" value={c.descontoPct} onChange={e=>c.setDescontoPct(e.target.value)} style={S.inp} min="0" max="100" /></div>}
          <button onClick={gerarPeticao} disabled={!c.devId} style={{ background:"linear-gradient(135deg,#1e40af,#1d4ed8)", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontSize:14, fontWeight:800, cursor:c.devId?"pointer":"not-allowed", opacity:c.devId?1:0.5, width:"100%" }}>
            ⚖️ Gerar Petição
          </button>
        </div>

        {preview && peticaoTexto && (
          <div style={S.card}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
              <span style={{ fontWeight:800, fontSize:13 }}>📋 Preview</span>
              <div style={{ display:"flex", gap:7 }}>
                <button onClick={imprimir} style={S.btnBlue}>🖨️ Imprimir / PDF</button>
                <button onClick={()=>navigator.clipboard?.writeText(peticaoTexto).then(()=>alert("Copiado!"))} style={S.btnGhost}>📋</button>
                <button onClick={()=>setPreview(false)} style={S.btnRed}>✕</button>
              </div>
            </div>
            <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:9, padding:"16px 18px", maxHeight:460, overflowY:"auto" }}>
              <pre style={{ fontFamily:"'Times New Roman',serif", fontSize:12, lineHeight:1.9, color:"#1e293b", whiteSpace:"pre-wrap", wordWrap:"break-word", margin:0 }}>{peticaoTexto}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function GerarPeticao({ devedores, credores }) {
  const [aba, setAba] = useState("automatico");
  const c = useCalculo({ devedores, credores });

  return (
    <div style={{ padding:"24px 20px", maxWidth:1100, margin:"0 auto", fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ marginBottom:18 }}>
        <h1 style={{ fontSize:22, fontWeight:800, color:"#0f172a", margin:0 }}>⚖️ Gerador de Petições</h1>
        <p style={{ fontSize:13, color:"#64748b", margin:"5px 0 0" }}>
          Use seus modelos Word (salvo na nuvem) ou gere petições automáticas com dados e cálculos preenchidos automaticamente.
        </p>
      </div>

      <div style={{ display:"flex", gap:4, borderBottom:"2px solid #e2e8f0", marginBottom:22 }}>
        <button style={S.tab(aba==="modelos")}   onClick={()=>setAba("modelos")}>☁️ Meus Modelos Word</button>
        <button style={S.tab(aba==="automatico")} onClick={()=>setAba("automatico")}>⚡ Petição Automática</button>
      </div>

      {aba==="modelos"    && <AbaModelos   c={c} devedores={devedores} credores={credores} />}
      {aba==="automatico" && <AbaPeticoes  c={c} devedores={devedores} credores={credores} />}
    </div>
  );
}
