// Phase 8 — PDF Demonstrativo do Contrato
// =====================================================================
// D-pre-1: Pattern A jsPDF programático (download direto via doc.save)
// D-pre-2: Utility module isolado, função pura async
// D-pre-13: Identificação pelo ESCRITÓRIO (sem nome do advogado, sem OAB,
//          sem assinatura individual)
// D-pre-3: Custas exibidas com correção INPC (motor já calcula); ignora
//          c.pago boolean (workaround α)
// D-pre-4: Source motor calcularDetalheEncargosContrato (3 params,
//          contrato NÃO é arg — Step 1.0 audit confirmou devedorCalc.js:849)
// D-pre-7: Devedores via listarDevedoresDoContrato (skip hook React,
//          skip component JSX); credor via lookup contrato.credor_id
// D-pre-8: Filename pattern demonstrativo_contrato_<ref>_<YYYYMMDD>.pdf
//          (fallback id8 chars se referência vazia)
// D-pre-9: PAPEL_META clone verbatim de DevedoresDoContrato.jsx L10-17
// D-pre-10: D-01 motor INTOCADO — puro consumer
// D-pre-11: D-13 CSS print preservada — Pattern A jsPDF, ZERO @media print
// =====================================================================

import { listarDevedoresDoContrato } from "../services/devedoresDividas.js";
import { calcularDetalheEncargosContrato } from "./devedorCalc.js";
import { calcularFatorCorrecao } from "./correcao.js";

// ── Constants escritório (D-pre-13) ─────────────────────────────────
const NOME_ESCRITORIO = "MR Cobranças";
const ENDERECO_ESCRITORIO = "Av. Perimetral, 3.067, Qd. 176, Lt. 08\nSetor Bueno\nGoiânia/GO — CEP 74.215-017";
const TELEFONE_ESCRITORIO = "(62) 98143-9135";
const EMAIL_ESCRITORIO = "usrocha@hotmail.com";

// PAPEL_META clone verbatim de DevedoresDoContrato.jsx L10-17 (D-pre-9)
const PAPEL_META = {
  PRINCIPAL:  { label: "Principal" },
  COOBRIGADO: { label: "Coobrigado" },
  AVALISTA:   { label: "Avalista" },
  FIADOR:     { label: "Fiador" },
  CONJUGE:    { label: "Cônjuge" },
  OUTRO:      { label: "Outro" },
};

const RESP_LABELS = {
  SOLIDARIA:   "Solidária",
  SUBSIDIARIA: "Subsidiária",
  DIVISIVEL:   "Divisível",
};

// ── Helpers locais ──────────────────────────────────────────────────
function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  const parts = s.split("-");
  if (parts.length !== 3) return "—";
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function fmtCpfCnpj(s) {
  if (!s) return "—";
  const digits = String(s).replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  return s;
}

function sanitizeFilenamePart(s) {
  return String(s || "").replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
}

function fmtDataYYYYMMDD(d) {
  let dt;
  if (typeof d === "string" && d.length >= 10) {
    dt = new Date(d.slice(0, 10) + "T12:00:00");
  } else if (d) {
    dt = new Date(d);
  } else {
    dt = new Date();
  }
  if (isNaN(dt.getTime())) dt = new Date();
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}

function fmtDataEmissao(hoje) {
  try {
    const dt = typeof hoje === "string" && hoje.length >= 10
      ? new Date(hoje.slice(0, 10) + "T12:00:00")
      : (hoje ? new Date(hoje) : new Date());
    if (isNaN(dt.getTime())) return new Date().toLocaleDateString("pt-BR");
    return dt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch {
    return new Date().toLocaleDateString("pt-BR");
  }
}

// ── jsPDF CDN loader (espelha App.jsx L2604-2618) ───────────────────
async function carregarJsPDF() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;
  await new Promise((resolve, reject) => {
    if (document.querySelector('script[data-jspdf]')) {
      setTimeout(resolve, 500);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.setAttribute('data-jspdf', '1');
    s.onload = resolve;
    s.onerror = () => reject(new Error("Não foi possível carregar o jsPDF. Verifique sua conexão."));
    document.head.appendChild(s);
  });
  if (!window.jspdf?.jsPDF) {
    throw new Error("jsPDF carregado mas global window.jspdf indisponível.");
  }
  return window.jspdf.jsPDF;
}

// ── Função principal exportada ──────────────────────────────────────
/**
 * Phase 8 — Gera PDF Demonstrativo do Contrato.
 *
 * Função pura async (recebe data, dispara doc.save no fim).
 * D-01 motor INTOCADO — puro consumer.
 *
 * @param {object} contrato                  contratos_dividas row
 * @param {Array}  dividas                   dividas do contrato (regulares + _so_custas)
 * @param {Array}  devedores                 devedores prop (lookup por id)
 * @param {Array}  credores                  credores prop (lookup contrato.credor_id)
 * @param {Array}  allPagamentosDivida       pagamentos_divida globais (filter por divida_id)
 * @param {string} hoje                      "YYYY-MM-DD" (data referência cálculo)
 * @returns {Promise<void>}                  dispara doc.save(filename)
 */
export async function gerarDemonstrativoPDF(contrato, dividas, devedores, credores, allPagamentosDivida, hoje) {
  // ─── Step 1.1 — Pre-flight gate ABORT (D-pre-13 + R-6) ──────────
  const ESCRITORIO_CONSTANTS = {
    NOME_ESCRITORIO,
    ENDERECO_ESCRITORIO,
    TELEFONE_ESCRITORIO,
    EMAIL_ESCRITORIO,
  };
  for (const [k, v] of Object.entries(ESCRITORIO_CONSTANTS)) {
    if (!v || v.length === 0 || v.includes("PREENCHER")) {
      throw new Error(`pdfDemonstrativo: constant ${k} ainda é placeholder. Preencher valor real antes de gerar PDF.`);
    }
  }

  // ─── Step 1.3 — Carregar jsPDF via CDN ──────────────────────────
  const jsPDF = await carregarJsPDF();

  // ─── Step 1.5 — Resolver devedores via service ──────────────────
  const vinculos = await listarDevedoresDoContrato(contrato.id);
  const devedoresEnriquecidos = (vinculos || [])
    .map(v => ({
      ...v,
      devedor: (devedores || []).find(d => String(d.id) === String(v.devedor_id)) || null,
    }))
    .sort((a, b) => {
      // PRINCIPAL primeiro, depois demais papéis
      if (a.papel === "PRINCIPAL" && b.papel !== "PRINCIPAL") return -1;
      if (a.papel !== "PRINCIPAL" && b.papel === "PRINCIPAL") return 1;
      return 0;
    });

  // ─── Step 1.6 — Resolver credor via lookup ──────────────────────
  const credor = (credores || []).find(c => String(c.id) === String(contrato.credor_id)) || null;

  // ─── Step 1.7 — Resolver cálculo motor (3 params, D-01 INTOCADO) ─
  const detalhe = calcularDetalheEncargosContrato(dividas, allPagamentosDivida, hoje);

  // ─── Step 1.8 — ABORT GATE pre-render ───────────────────────────
  const dividasRegulares = (dividas || []).filter(d => !d._so_custas && !d._nominal);

  const dividaIdsContrato = new Set((dividas || []).map(d => String(d.id)));
  const pagamentosContrato = (allPagamentosDivida || [])
    .filter(p => dividaIdsContrato.has(String(p.divida_id)))
    .sort((a, b) => String(a.data_pagamento || a.data || "").localeCompare(String(b.data_pagamento || b.data || "")));

  // Coletar custas individuais de cada divida (regulares + _so_custas)
  const custasIndividuais = [];
  for (const d of (dividas || [])) {
    const indexadorCusta = d._so_custas
      ? "inpc"
      : (d.indexador && d.indexador !== "nenhum" ? d.indexador : "inpc");
    for (const c of (d.custas || [])) {
      custasIndividuais.push({ ...c, _indexador: indexadorCusta, _divida_id: d.id });
    }
  }

  if (dividasRegulares.length === 0 && custasIndividuais.length === 0 && pagamentosContrato.length === 0) {
    throw new Error("Contrato sem dividas, custas ou pagamentos — nada para demonstrar. Cancele a operação e adicione dados.");
  }

  // ─── Step 1.9 — Render 7 seções A4 portrait ─────────────────────
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const ML = 14;
  const MR = W - 14;

  const teal = [13, 148, 136];
  const escuro = [15, 23, 42];
  const cinza = [100, 116, 139];
  const verdeBorda = [22, 163, 74];
  const branco = [255, 255, 255];
  const vermelho = [220, 38, 38];

  // Step 1.10 — Helper checkPage(yPos, needed) auto-paginação
  function checkPage(yPos, needed = 20) {
    if (yPos + needed > 280) {
      doc.addPage();
      return 15;
    }
    return yPos;
  }

  function cabecalhoSecao(titulo, yPos) {
    yPos = checkPage(yPos, 12);
    doc.setFillColor(...teal);
    doc.rect(ML, yPos, MR - ML, 7, "F");
    doc.setTextColor(...branco);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(titulo, ML + 3, yPos + 5);
    doc.setTextColor(...escuro);
    return yPos + 11;
  }

  function hrLine(yPos) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(ML, yPos, MR, yPos);
    return yPos + 4;
  }

  let y = 14;

  // ─── 9.a CABEÇALHO ───────────────────────────────────────────────
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(NOME_ESCRITORIO, ML, y);
  y += 7;

  doc.setTextColor(...cinza);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const enderecoLinhas = ENDERECO_ESCRITORIO.split("\n");
  for (const linha of enderecoLinhas) {
    doc.text(linha, ML, y);
    y += 4;
  }
  doc.text(`Telefone: ${TELEFONE_ESCRITORIO}  |  E-mail: ${EMAIL_ESCRITORIO}`, ML, y);
  y += 5;

  y = hrLine(y);

  doc.setTextColor(...escuro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("DEMONSTRATIVO DE DÉBITO", ML, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Emitido em: ${fmtDataEmissao(hoje)}`, ML, y);
  y += 5;
  if (contrato.referencia) {
    doc.text(`Contrato/Referência: ${contrato.referencia}`, ML, y);
    y += 5;
  }
  doc.setTextColor(...cinza);
  doc.setFontSize(8);
  doc.text(`ID: ${String(contrato.id)}`, ML, y);
  y += 7;

  // ─── 9.b IDENTIFICAÇÃO DAS PARTES ────────────────────────────────
  y = cabecalhoSecao("IDENTIFICAÇÃO DAS PARTES", y);

  doc.setTextColor(...escuro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("CREDOR", ML, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  if (credor) {
    doc.text(credor.nome || "—", ML + 3, y);
    y += 4.5;
    doc.setFontSize(9);
    doc.setTextColor(...cinza);
    doc.text(`CPF/CNPJ: ${fmtCpfCnpj(credor.cpf_cnpj || credor.cpf || credor.cnpj)}`, ML + 3, y);
    y += 6;
  } else {
    doc.text("— sem credor cadastrado", ML + 3, y);
    y += 6;
  }

  doc.setTextColor(...escuro);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("DEVEDOR(ES)", ML, y);
  y += 5;

  if (devedoresEnriquecidos.length > 0) {
    // Header tabela
    doc.setFillColor(241, 245, 249);
    doc.rect(ML, y - 4, MR - ML, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...escuro);
    const colNome = ML + 2;
    const colCpf = ML + 70;
    const colPapel = ML + 120;
    const colResp = ML + 152;
    doc.text("Nome", colNome, y);
    doc.text("CPF/CNPJ", colCpf, y);
    doc.text("Papel", colPapel, y);
    doc.text("Responsabilidade", colResp, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let idxDev = 0;
    for (const v of devedoresEnriquecidos) {
      y = checkPage(y, 6);
      if (idxDev % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y - 4, MR - ML, 5.5, "F");
      }
      const nome = v.devedor?.nome || `Devedor #${v.devedor_id}`;
      const cpfCnpj = fmtCpfCnpj(v.devedor?.cpf_cnpj || v.devedor?.cpf || v.devedor?.cnpj);
      const papelLabel = PAPEL_META[v.papel]?.label || v.papel || "—";
      const respLabel = RESP_LABELS[v.responsabilidade] || v.responsabilidade || "—";
      const nomeWrapped = doc.splitTextToSize(nome, 65);
      doc.text(nomeWrapped[0] || "—", colNome, y);
      doc.text(cpfCnpj, colCpf, y);
      doc.text(papelLabel, colPapel, y);
      doc.text(respLabel, colResp, y);
      y += 5;
      idxDev++;
    }
    y += 3;
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("— sem devedores vinculados", ML + 3, y);
    y += 7;
  }

  // ─── 9.c RESUMO FINANCEIRO ───────────────────────────────────────
  y = cabecalhoSecao("RESUMO FINANCEIRO", y);

  const totalAtualizado = (detalhe.valorOriginal || 0) + (detalhe.totalEncargos || 0);
  const linhasResumo = [
    { label: "Valor Original", valor: detalhe.valorOriginal || 0 },
    ...(detalhe.multa?.valor > 0.005 ? [{ label: "(+) Multa", valor: detalhe.multa.valor }] : []),
    ...(detalhe.honorarios?.valor > 0.005 ? [{ label: "(+) Honorários", valor: detalhe.honorarios.valor }] : []),
    ...(detalhe.correcao?.valor > 0.005 ? [{ label: "(+) Correção Monetária", valor: detalhe.correcao.valor }] : []),
    ...(detalhe.juros?.valor > 0.005 ? [{ label: "(+) Juros", valor: detalhe.juros.valor }] : []),
    ...(detalhe.custas?.atualizado > 0.005 ? [{ label: "(+) Custas Atualizadas", valor: detalhe.custas.atualizado }] : []),
    ...(detalhe.art523?.multa > 0.005 ? [{ label: "(+) Art. 523 §1º Multa 10%", valor: detalhe.art523.multa }] : []),
    ...(detalhe.art523?.honorarios > 0.005 ? [{ label: "(+) Art. 523 §1º Honor. 10%", valor: detalhe.art523.honorarios }] : []),
    { label: "(=) Total Atualizado", valor: totalAtualizado, bold: true },
    ...(detalhe.totalPago > 0.005 ? [{ label: "(-) Total Pago", valor: detalhe.totalPago, vermelho: true }] : []),
    { label: "(=) Saldo Devedor", valor: detalhe.saldoAtualizado || 0, bold: true, teal: true },
  ];

  doc.setFontSize(10);
  for (const l of linhasResumo) {
    y = checkPage(y, 6);
    doc.setFont("helvetica", l.bold ? "bold" : "normal");
    if (l.teal) doc.setTextColor(...teal);
    else if (l.vermelho) doc.setTextColor(...vermelho);
    else doc.setTextColor(...escuro);
    doc.text(l.label, ML + 3, y);
    doc.text(fmtBRL(l.valor), MR - 3, y, { align: "right" });
    y += 5.5;
  }
  doc.setTextColor(...escuro);
  y += 3;

  // ─── 9.d TABELA PARCELAS ─────────────────────────────────────────
  if (dividasRegulares.length > 0) {
    y = cabecalhoSecao("PARCELAS", y);

    doc.setFillColor(...verdeBorda);
    doc.rect(ML, y - 4, MR - ML, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...branco);
    const cIdx = ML + 2;
    const cVenc = ML + 12;
    const cVOrig = ML + 80;
    const cVAtual = ML + 115;
    const cPago = ML + 150;
    const cSaldo = ML + 180;
    doc.text("#", cIdx, y);
    doc.text("Vencimento", cVenc, y);
    doc.text("Valor Original", cVOrig, y, { align: "right" });
    doc.text("Valor Atualizado", cVAtual, y, { align: "right" });
    doc.text("Pago", cPago, y, { align: "right" });
    doc.text("Saldo", cSaldo, y, { align: "right" });
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...escuro);

    const detalhesPorIdx = Array.isArray(detalhe.detalhePorDivida) ? detalhe.detalhePorDivida : [];

    let idx = 0;
    for (const d of dividasRegulares) {
      y = checkPage(y, 6);
      const dpd = detalhesPorIdx[idx];
      const valorOrig = parseFloat(d.valor_total) || 0;
      const valorAtual = (dpd && typeof dpd.saldoTeorico === "number") ? dpd.saldoTeorico : valorOrig;
      const pago = (allPagamentosDivida || [])
        .filter(p => String(p.divida_id) === String(d.id))
        .reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
      const saldo = Math.max(0, valorAtual - pago);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y - 4, MR - ML, 5.5, "F");
      }

      doc.text(String(idx + 1), cIdx, y);
      doc.text(fmtData(d.data_vencimento || d.data_origem), cVenc, y);
      doc.text(fmtBRL(valorOrig), cVOrig, y, { align: "right" });
      doc.text(fmtBRL(valorAtual), cVAtual, y, { align: "right" });
      doc.text(fmtBRL(pago), cPago, y, { align: "right" });
      doc.text(fmtBRL(saldo), cSaldo, y, { align: "right" });
      y += 5.5;
      idx++;
    }
    y += 3;
  }

  // ─── 9.e CUSTAS JUDICIAIS (D-pre-3 workaround α) ─────────────────
  if (custasIndividuais.length > 0) {
    y = cabecalhoSecao("CUSTAS JUDICIAIS", y);

    doc.setFillColor(241, 245, 249);
    doc.rect(ML, y - 4, MR - ML, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...escuro);
    const ccDesc = ML + 2;
    const ccData = ML + 100;
    const ccVOrig = ML + 150;
    const ccVAtual = ML + 180;
    doc.text("Descrição", ccDesc, y);
    doc.text("Data Despesa", ccData, y);
    doc.text("Valor Original", ccVOrig, y, { align: "right" });
    doc.text("Valor Atualizado", ccVAtual, y, { align: "right" });
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    let idxC = 0;
    for (const c of custasIndividuais) {
      y = checkPage(y, 6);
      const valor = parseFloat(c.valor) || 0;
      const dataCusta = c.data || c.data_despesa;
      let valorAtualizado = valor;
      if (dataCusta && String(dataCusta) < String(hoje)) {
        const fator = calcularFatorCorrecao(c._indexador || "inpc", dataCusta, hoje);
        valorAtualizado = valor * fator;
      }
      if (idxC % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y - 4, MR - ML, 5.5, "F");
      }
      const descWrapped = doc.splitTextToSize(c.descricao || "Custa judicial", 95);
      doc.text(descWrapped[0] || "—", ccDesc, y);
      doc.text(fmtData(dataCusta), ccData, y);
      doc.text(fmtBRL(valor), ccVOrig, y, { align: "right" });
      doc.text(fmtBRL(valorAtualizado), ccVAtual, y, { align: "right" });
      y += 5.5;
      idxC++;
    }
    // Total
    y = checkPage(y, 8);
    doc.setFont("helvetica", "bold");
    doc.setDrawColor(...escuro);
    doc.line(ML, y - 4, MR, y - 4);
    doc.text("TOTAL", ccDesc, y);
    doc.text(fmtBRL(detalhe.custas?.original || 0), ccVOrig, y, { align: "right" });
    doc.text(fmtBRL(detalhe.custas?.atualizado || 0), ccVAtual, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal");
  }

  // ─── 9.f PAGAMENTOS RECEBIDOS ────────────────────────────────────
  if (pagamentosContrato.length > 0) {
    y = cabecalhoSecao("PAGAMENTOS RECEBIDOS", y);

    doc.setFillColor(241, 245, 249);
    doc.rect(ML, y - 4, MR - ML, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...escuro);
    const cpData = ML + 2;
    const cpValor = ML + 60;
    const cpParcelas = ML + 70;
    doc.text("Data", cpData, y);
    doc.text("Valor", cpValor, y, { align: "right" });
    doc.text("Parcelas Amortizadas", cpParcelas, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    const dividaDescMap = new Map();
    for (const d of (dividas || [])) {
      const desc = d.descricao || (d.numero_parcela != null ? `Parcela ${d.numero_parcela}` : null);
      if (desc) dividaDescMap.set(String(d.id), desc);
    }

    let idxP = 0;
    for (const p of pagamentosContrato) {
      y = checkPage(y, 6);
      if (idxP % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(ML, y - 4, MR - ML, 5.5, "F");
      }
      const desc = (p.divida_id && dividaDescMap.get(String(p.divida_id)))
        || "Vide alocação Art. 354";
      const descWrapped = doc.splitTextToSize(desc, 120);
      doc.text(fmtData(p.data_pagamento || p.data), cpData, y);
      doc.text(fmtBRL(parseFloat(p.valor) || 0), cpValor, y, { align: "right" });
      doc.text(descWrapped[0] || "—", cpParcelas, y);
      y += 5.5;
      idxP++;
    }
    // Total
    y = checkPage(y, 8);
    doc.setFont("helvetica", "bold");
    doc.setDrawColor(...escuro);
    doc.line(ML, y - 4, MR, y - 4);
    doc.text("TOTAL PAGO", cpData, y);
    doc.text(fmtBRL(detalhe.totalPago || 0), cpValor, y, { align: "right" });
    y += 8;
    doc.setFont("helvetica", "normal");
  }

  // ─── 9.g RODAPÉ (D-pre-13: sem assinatura individual) ────────────
  y = checkPage(y, 18);
  y += 4;
  doc.setDrawColor(...cinza);
  doc.setLineWidth(0.3);
  doc.line(ML, y, MR, y);
  y += 5;

  doc.setTextColor(...cinza);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text("Pode haver discrepância de R$ 0,01 por arredondamento.", ML, y);
  y += 4.5;
  doc.text("Amortização sequencial conforme Art. 354 do Código Civil.", ML, y);

  // ─── Step 1.11 — Sanitize filename + doc.save ───────────────────
  const ref = sanitizeFilenamePart(contrato.referencia);
  const idShort = String(contrato.id || "").replace(/-/g, "").substring(0, 8);
  const datePart = fmtDataYYYYMMDD(hoje);
  const filename = ref
    ? `demonstrativo_contrato_${ref}_${datePart}.pdf`
    : `demonstrativo_contrato_${idShort}_${datePart}.pdf`;
  doc.save(filename);
}
