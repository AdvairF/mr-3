import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import AtrasoCell from "./AtrasoCell.jsx";
import AdicionarDocumento from "./AdicionarDocumento.jsx";
import DiretrizesContrato from "./DiretrizesContrato.jsx";
import TabelaParcelasEditaveis from "./TabelaParcelasEditaveis.jsx";
import DevedoresDoContrato from "./DevedoresDoContrato.jsx";   // Phase 7.13c — D-pre-9 cadastro multi-devedor por contrato
import { Inp } from "./ui/Inp.jsx";
import { listarDocumentosPorContrato, editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico,
         registrarPagamentoContrato, excluirPagamentoContrato, listarPagamentosContrato, excluirContrato,
         calcularTotaisContratoNominal, atualizarParcelasCustom, excluirDocumento,
         criarCusta, editarCusta, excluirCusta, togglePagoCusta } from "../services/contratos.js";
import { listarPagamentos, calcularSaldoPorDividaIndividual } from "../services/pagamentos.js";
import { calcularDetalheEncargosContrato } from "../utils/devedorCalc.js";
import { calcularFatorCorrecao } from "../utils/correcao.js";  // Phase 7.9 ISSUE 3 Fix A — per-custa correction client-side pra avulsas (motor agrega total mas não push em detalhePorDivida)
import DecomposicaoSaldoModal from "./DecomposicaoSaldoModal.jsx";
import NovaCustaModal from "./NovaCustaModal.jsx";                // Phase 7.9
// Phase 7.8.2a — D-05 enforcement (callers completude p/ cache SWR de listagem)
import { invalidateContrato, removeContrato } from "../hooks/useSaldoAtualizadoCache.js";

function fmtBRL(v) { if (v == null || v === "") return "—"; return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtData(iso) { if (!iso) return "—"; const d = iso.slice(0, 10).split("-"); return `${d[2]}/${d[1]}/${d[0]}`; }
function fmtDataHora(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  } catch { return "—"; }
}

function Spinner() {
  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <span style={{
        display: "inline-block",
        width: 12,
        height: 12,
        border: "2px solid rgba(255,255,255,.3)",
        borderTop: "2px solid #fff",
        borderRadius: "50%",
        animation: "spin .7s linear infinite",
      }} />
    </>
  );
}

const FIELD_LABELS = {
  credor_id:             "Credor",
  devedor_id:            "Devedor",
  referencia:            "Referência",
  indice_correcao:       "Índice de Correção",
  multa_percentual:      "Multa (%)",
  juros_tipo:            "Taxa de Juros",
  juros_am_percentual:   "Juros (% a.m.)",
  honorarios_percentual: "Honorários (%)",
  despesas:              "Despesas (R$)",
  art523_opcao:          "Art. 523",
  data_inicio_atualizacao: "Data Início Atualização",
};

const TIPO_EVENTO_LABELS = {
  criacao:               "Contrato criado",
  cessao_credito:        "Cessão de crédito",
  assuncao_divida:       "Assunção de dívida",
  alteracao_encargos:    "Alteração de encargos",
  alteracao_referencia:  "Alteração de referência",
  outros:                "Edição salva",
  pagamento_recebido:    "Pagamento recebido",
  pagamento_revertido:   "Pagamento revertido",
};

function initEditForm(c) {
  return {
    referencia: c.referencia || "",
    credor_id:  String(c.credor_id  || ""),
    devedor_id: String(c.devedor_id || ""),
    encargos: {
      // D-pre-1 — 5 críticos vazios (Path E: força operador a confirmar valores reais; race-safe se contrato.X for null/undefined)
      indexador:               c.indice_correcao       ?? "",
      data_inicio_atualizacao: c.data_inicio_atualizacao ?? "",
      multa_pct:               String(c.multa_percentual    ?? ""),
      juros_tipo:              c.juros_tipo            ?? "",
      juros_am:                String(c.juros_am_percentual ?? ""),
      honorarios_pct:          String(c.honorarios_percentual ?? ""),
      // D-pre-2 — 2 semânticos preservados
      despesas:                String(c.despesas        ?? "0"),
      art523_opcao:            c.art523_opcao          ?? "nao_aplicar",
    },
  };
}

function truncate(str, max) {
  const s = String(str ?? "");
  return s.length > max ? s.slice(0, max) + "..." : s;
}

const CONTRATO_BADGE_META = {
  "NF/Duplicata":   { label: "[NF]",    bg: "#dbeafe", cor: "#1d4ed8" },
  "Compra e Venda": { label: "[C&V]",   bg: "#fef3c7", cor: "#d97706" },
  "Empréstimo":     { label: "[Empr.]", bg: "#ede9fe", cor: "#4c1d95" },
};

const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };

function hasCustomEncargos(documento, contrato) {
  return (
    (documento.indice_correcao      ?? null) !== (contrato.indice_correcao      ?? null) ||
    (documento.juros_tipo           ?? null) !== (contrato.juros_tipo           ?? null) ||
    (documento.juros_am_percentual  ?? null) !== (contrato.juros_am_percentual  ?? null) ||
    (documento.multa_percentual     ?? null) !== (contrato.multa_percentual     ?? null) ||
    (documento.honorarios_percentual ?? null) !== (contrato.honorarios_percentual ?? null)
  );
}

export default function DetalheContrato({
  contrato,
  dividas,
  devedores,
  credores,
  allPagamentos,
  allPagamentosDivida,
  hoje,
  onVoltar,
  onVerDetalhe,
  onCarregarTudo,
}) {
  const [documentos, setDocumentos] = useState([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState(null);
  const [saldosMap, setSaldosMap] = useState({});
  const [saldosLoading, setSaldosLoading] = useState(false);
  const [adicionandoDocumento, setAdicionandoDocumento] = useState(false);
  const [editando,  setEditando]  = useState(false);
  const [salvando,  setSalvando]  = useState(false);
  const [editForm,  setEditForm]  = useState(() => initEditForm(contrato));
  const [historicoAberto,    setHistoricoAberto]    = useState(false);
  const [historico,          setHistorico]           = useState([]);
  const [historicoLoading,   setHistoricoLoading]    = useState(false);
  const [historicoCarregado, setHistoricoCarregado]  = useState(false);
  const [registrandoPagamento,  setRegistrandoPagamento]  = useState(false);
  const [salvandoPagamento,     setSalvandoPagamento]     = useState(false);
  const [pagamentosContrato,    setPagamentosContrato]    = useState([]);
  const [pagamentosAberto,      setPagamentosAberto]      = useState(false);
  const [pagamentosLoading,     setPagamentosLoading]     = useState(false);
  const [pagamentosCarregado,   setPagamentosCarregado]   = useState(false);
  const [excluindoPagamentoId,  setExcluindoPagamentoId]  = useState(null);
  const [excluindoContrato,     setExcluindoContrato]     = useState(false);
  const [excluindoDocumentoId,  setExcluindoDocumentoId]  = useState(null);   // Phase 7.7: UUID do doc sendo excluído (mesmo pattern de excluindoPagamentoId linha 140)
  const [editingDocId,          setEditingDocId]          = useState(null);   // Phase 7.5 D-04: UUID do documento em modo edição de parcelas
  const [savingParcelas,        setSavingParcelas]        = useState(false);  // Phase 7.5: bloqueia double-click
  const [formPagamento,         setFormPagamento]         = useState({ data: "", valor: "", observacao: "" });
  const [saldoCalculado,        setSaldoCalculado]        = useState(0);
  // Phase 7.8 — estado de abertura do modal de composição do saldo atualizado (plan 07.8-03).
  const [showDecomposicaoModal, setShowDecomposicaoModal] = useState(false);

  // Phase 7.9 — Custas Judiciais CRUD
  const [custaModalAberta, setCustaModalAberta] = useState(false);
  const [custaEmEdicao, setCustaEmEdicao] = useState(null);  // { id, descricao, valor, data, pago, divida_id (interno — id da dívida-fantasma) } ou null

  useEffect(() => {
    setLoadingDocumentos(true);
    listarDocumentosPorContrato(contrato.id)
      .then(docs => setDocumentos(Array.isArray(docs) ? docs : []))
      .catch(e => toast.error("Erro ao carregar documentos: " + e.message))
      .finally(() => setLoadingDocumentos(false));
  }, [contrato.id]);

  useEffect(() => {
    if (!expandedDoc) return;
    const parcelasDoDoc = (dividas || []).filter(d => d.documento_id === expandedDoc);
    if (!parcelasDoDoc.length) return;
    setSaldosLoading(true);
    Promise.all(
      parcelasDoDoc.map(async p => {
        const pgtos = await listarPagamentos(p.id);
        const saldo = calcularSaldoPorDividaIndividual(p, pgtos, hoje);
        return [String(p.id), saldo];
      })
    ).then(entries => {
      setSaldosMap(prev => ({ ...prev, ...Object.fromEntries(entries) }));
      setSaldosLoading(false);
    }).catch(e => {
      toast.error("Erro ao calcular saldos: " + e.message);
      setSaldosLoading(false);
    });
  }, [expandedDoc, hoje, dividas]);

  useEffect(() => {
    setEditForm(initEditForm(contrato));
    setEditando(false);
    setHistoricoAberto(false);
    setHistorico([]);
    setHistoricoCarregado(false);
    setRegistrandoPagamento(false);
    setPagamentosAberto(false);
    setPagamentosContrato([]);
    setPagamentosCarregado(false);
    setSaldoCalculado(0);
  }, [contrato.id]);

  useEffect(() => {
    if (!historicoAberto || historicoCarregado) return;
    setHistoricoLoading(true);
    listarHistorico(contrato.id)
      .then(rows => {
        setHistorico(Array.isArray(rows) ? rows : []);
        setHistoricoCarregado(true);
      })
      .catch(e => {
        toast.error("Erro ao carregar histórico: " + e.message);
      })
      .finally(() => setHistoricoLoading(false));
  }, [historicoAberto, contrato.id]);

  useEffect(() => {
    if (!pagamentosAberto || pagamentosCarregado) return;
    setPagamentosLoading(true);
    listarPagamentosContrato(contrato.id)
      .then(rows => {
        setPagamentosContrato(Array.isArray(rows) ? rows : []);
        setPagamentosCarregado(true);
      })
      .catch(e => toast.error("Erro ao carregar pagamentos: " + e.message))
      .finally(() => setPagamentosLoading(false));
  }, [pagamentosAberto, contrato.id]);

  function handleEncargos(field, val) {
    setEditForm(f => ({ ...f, encargos: { ...f.encargos, [field]: val } }));
  }

  // D-pre-3 — 5 campos críticos + condicional juros_am quando juros_tipo === "outros"
  // useMemo cacheia: recalcula só quando editForm.encargos muda (arquivo grande, alta freq render).
  const camposCriticosOk = useMemo(() =>
    !!editForm.encargos.indexador &&
    !!editForm.encargos.multa_pct &&
    !!editForm.encargos.juros_tipo &&
    !!editForm.encargos.honorarios_pct &&
    (editForm.encargos.juros_tipo !== "outros" || !!editForm.encargos.juros_am),
    [editForm.encargos]
  );

  function handleCancelar() {
    setEditForm(initEditForm(contrato));
    setEditando(false);
  }

  async function handleSalvar() {
    if (!camposCriticosOk) {
      toast.error("Preencha todos os encargos antes de salvar.");
      return;
    }
    const payload = {
      referencia:            editForm.referencia.trim() || null,
      credor_id:             editForm.credor_id  || null,
      devedor_id:            editForm.devedor_id || null,
      indice_correcao:       editForm.encargos.indexador               || null,
      data_inicio_atualizacao: editForm.encargos.data_inicio_atualizacao || null,
      multa_percentual:      parseFloat(editForm.encargos.multa_pct)    || 0,
      juros_tipo:            editForm.encargos.juros_tipo              || null,
      juros_am_percentual:   parseFloat(editForm.encargos.juros_am)    || 0,
      honorarios_percentual: parseFloat(editForm.encargos.honorarios_pct) || 0,
      despesas:              parseFloat(editForm.encargos.despesas)     || 0,
      art523_opcao:          editForm.encargos.art523_opcao            || "nao_aplicar",
    };

    const credorAlterado  = String(payload.credor_id  || "") !== String(contrato.credor_id  || "");
    const devedorAlterado = String(payload.devedor_id || "") !== String(contrato.devedor_id || "");
    const temCascade = credorAlterado || devedorAlterado;

    if (temCascade) {
      const parcelas = (dividas || []).filter(d =>
        documentos.some(doc => String(doc.id) === String(d.documento_id))
      );
      const N = parcelas.length;
      if (N > 0) {
        const campos = [
          credorAlterado  && "credor",
          devedorAlterado && "devedor",
        ].filter(Boolean).join(" e ");
        const msg = `Alterar ${campos} vai atualizar ${N} parcelas (incluindo quitadas). Confirmar?`;
        if (!window.confirm(msg)) return;
      }
    }

    setSalvando(true);
    try {
      if (temCascade) {
        await cascatearCredorDevedor(contrato.id, {
          ...(credorAlterado  ? { credor_id:  payload.credor_id  } : {}),
          ...(devedorAlterado ? { devedor_id: payload.devedor_id } : {}),
        });
      }

      await editarContrato(contrato.id, payload);

      // Phase 7.13c (D-pre-9 / Q4): snapshot histórico migra `devedor_id` (FK única
      // legacy) para `devedor_ids: [...]` (array — futuro multi-devedor cascade).
      // Como contrato ainda mantém devedor_id na tabela contratos_dividas (back-compat
      // header), snapshot atual envolve o valor em array de 1 elemento para forward
      // compat. Diff entries renderizam array sem mudança no render (JSONB livre).
      const campos_db = {
        referencia:            contrato.referencia            ?? null,
        credor_id:             contrato.credor_id             ?? null,
        devedor_ids:           contrato.devedor_id != null ? [contrato.devedor_id] : [],
        indice_correcao:       contrato.indice_correcao       ?? null,
        data_inicio_atualizacao: contrato.data_inicio_atualizacao ?? null,
        multa_percentual:      contrato.multa_percentual      ?? null,
        juros_tipo:            contrato.juros_tipo            ?? null,
        juros_am_percentual:   contrato.juros_am_percentual   ?? null,
        honorarios_percentual: contrato.honorarios_percentual ?? null,
        despesas:              contrato.despesas              ?? null,
        art523_opcao:          contrato.art523_opcao          ?? null,
      };
      const payloadSnapshot = {
        ...payload,
        devedor_ids: payload.devedor_id != null ? [payload.devedor_id] : [],
      };
      const diff = {};
      for (const k of Object.keys(campos_db)) {
        const antes  = Array.isArray(campos_db[k]) ? JSON.stringify(campos_db[k]) : String(campos_db[k] ?? "");
        const depois = Array.isArray(payloadSnapshot[k]) ? JSON.stringify(payloadSnapshot[k]) : String(payloadSnapshot[k] ?? "");
        if (antes !== depois) diff[k] = { antes, depois };
      }
      if (Object.keys(diff).length > 0) {
        const diffKeys = Object.keys(diff);
        const ENCARGOS = new Set(["indice_correcao","data_inicio_atualizacao","multa_percentual",
          "juros_tipo","juros_am_percentual","honorarios_percentual","despesas","art523_opcao"]);
        let tipoEvento;
        if (credorAlterado && devedorAlterado)              tipoEvento = "outros";
        else if (credorAlterado)                            tipoEvento = "cessao_credito";
        else if (devedorAlterado)                           tipoEvento = "assuncao_divida";
        else if (diffKeys.every(k => k === "referencia"))   tipoEvento = "alteracao_referencia";
        else if (diffKeys.some(k => ENCARGOS.has(k)) && !diffKeys.includes("referencia"))
                                                            tipoEvento = "alteracao_encargos";
        else                                                tipoEvento = "outros";
        await registrarEvento(contrato.id, tipoEvento, diff).catch(() => {});
      }

      toast.success(temCascade ? "Contrato e parcelas atualizados." : "Contrato atualizado.");
      setEditando(false);
      await onCarregarTudo();
    } catch (e) {
      toast.error(
        temCascade
          ? "Erro ao propagar alteração: " + e.message
          : "Erro ao salvar contrato: " + e.message
      );
    } finally {
      setSalvando(false);
    }
  }

  async function handleAbrirFormPagamento() {
    const hoje_str = typeof hoje === "string" ? hoje : hoje.toISOString().slice(0, 10);
    const parcelasAbertas = (dividas || []).filter(d => !d.saldo_quitado);
    let total = 0;
    for (const p of parcelasAbertas) {
      const pgtos = await listarPagamentos(p.id);
      total += calcularSaldoPorDividaIndividual(p, pgtos, hoje_str);
    }
    setSaldoCalculado(total);
    setRegistrandoPagamento(true);
  }

  async function handleRegistrarPagamento() {
    const valor = parseFloat(formPagamento.valor);
    const data  = formPagamento.data;
    const hoje_str = typeof hoje === "string" ? hoje : hoje.toISOString().slice(0, 10);

    if (!valor || valor <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (data > hoje_str) {
      toast.error("Data não pode ser futura.");
      return;
    }
    if (valor > saldoCalculado) {
      toast.error(`Valor superior ao saldo devedor (${fmtBRL(saldoCalculado)}).`);
      return;
    }

    setSalvandoPagamento(true);
    try {
      const result = await registrarPagamentoContrato(contrato.id, {
        data_pagamento: data,
        valor,
        observacao: formPagamento.observacao || null,
      });
      invalidateContrato(contrato.id); // Phase 7.8.2a D-05 — antes do toast.success
      const n = result?.parcelas_amortizadas ?? 0;
      toast.success(`Pagamento registrado. ${n} parcela(s) amortizada(s).`);
      setFormPagamento({ data: "", valor: "", observacao: "" });
      setRegistrandoPagamento(false);
      setSaldoCalculado(0);
      const rows = await listarPagamentosContrato(contrato.id);
      setPagamentosContrato(Array.isArray(rows) ? rows : []);
      setPagamentosCarregado(true);
      await onCarregarTudo();
    } catch (e) {
      toast.error(e.message || "Erro ao registrar pagamento.");
    } finally {
      setSalvandoPagamento(false);
    }
  }

  async function handleExcluirPagamento(pagamento) {
    if (!window.confirm("Excluir este pagamento vai reverter a amortização das parcelas. Confirmar?")) return;
    setExcluindoPagamentoId(pagamento.id);
    try {
      await excluirPagamentoContrato(pagamento.id);
      invalidateContrato(contrato.id); // Phase 7.8.2a D-05 — antes do toast.success
      toast.success("Pagamento excluído. Amortização revertida.");
      const rows = await listarPagamentosContrato(contrato.id);
      setPagamentosContrato(Array.isArray(rows) ? rows : []);
      await onCarregarTudo();
    } catch (e) {
      toast.error(e.message || "Erro ao excluir pagamento.");
    } finally {
      setExcluindoPagamentoId(null);
    }
  }

  async function handleExcluirContrato() {
    if (!window.confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;
    setExcluindoContrato(true);
    try {
      const result = await excluirContrato(contrato.id);
      if (!result.ok) {
        toast.error(result.motivo);
        return;
      }
      removeContrato(contrato.id); // Phase 7.8.2a D-05 — contrato deixou de existir, antes do toast
      toast.success("Contrato excluído com sucesso");
      await onCarregarTudo();
      onVoltar();
    } catch (e) {
      toast.error("Erro ao excluir contrato. Tente novamente.");
    } finally {
      setExcluindoContrato(false);
    }
  }

  // Phase 7.7 — exclui UM documento específico. Cleanup de UI state ANTES do service
  // (D-07) previne render crash quando onCarregarTudo retorna lista sem o doc. Não
  // navega (SC-4: contrato vazio pós-delete é estado válido, usuário fica no contrato).
  async function handleExcluirDocumento(doc) {
    if (!window.confirm("Tem certeza? Esta ação não pode ser desfeita.")) return;

    // UI state cleanup ANTES do service call (D-07) — ordem OBRIGATÓRIA:
    // se o doc sendo excluído é o que está sendo editado ou expandido, limpar
    // antes do delete senão o próximo render aponta pra ID inexistente.
    if (editingDocId === doc.id) setEditingDocId(null);
    if (expandedDoc === doc.id) setExpandedDoc(null);

    setExcluindoDocumentoId(doc.id);
    try {
      const result = await excluirDocumento(doc.id);
      if (!result.ok) {
        toast.error(result.motivo);
        return;
      }
      invalidateContrato(contrato.id); // Phase 7.8.2a D-05 — antes do toast.success
      toast.success("Documento excluído com sucesso");
      // Refresh de estado: global (App.jsx) + local (this component).
      // Pattern literal de handleDocumentoAdicionado:404-408.
      await onCarregarTudo();
      listarDocumentosPorContrato(contrato.id)
        .then(docs => setDocumentos(Array.isArray(docs) ? docs : []));
      // Intencionalmente NÃO navega de volta — diferença proposital vs handleExcluirContrato
      // (D-08). Contrato vazio pós-delete é estado válido; usuário fica na tela do
      // DetalheContrato para poder clicar "Adicionar documento" de novo.
    } catch (e) {
      toast.error("Erro ao excluir documento. Tente novamente.");
    } finally {
      setExcluindoDocumentoId(null);
    }
  }

  async function handleDocumentoAdicionado() {
    setAdicionandoDocumento(false);
    await onCarregarTudo();
    listarDocumentosPorContrato(contrato.id)
      .then(docs => setDocumentos(Array.isArray(docs) ? docs : []));
  }

  // Phase 7.5 D-04: handler do Salvar da TabelaParcelasEditaveis em modo edit
  async function handleSalvarParcelasCustom(parcelasEditadas) {
    if (!editingDocId) return;
    setSavingParcelas(true);
    try {
      const result = await atualizarParcelasCustom(editingDocId, parcelasEditadas);
      if (!result.ok) {
        toast.error(result.motivo);
        return;
      }
      invalidateContrato(contrato.id); // Phase 7.8.2a D-05 — antes do toast.success
      toast.success(`Parcelas atualizadas (${result.updated}).`);
      setEditingDocId(null);
      await onCarregarTudo();
    } catch (e) {
      toast.error("Erro ao atualizar parcelas: " + (e?.message || "desconhecido"));
    } finally {
      setSavingParcelas(false);
    }
  }

  // Phase 7.9 — D-05 handlers (invalidateContrato ANTES de toast.success).
  // contratoId explícito passado ao service. dividaId (id da dívida-fantasma) vem de c.divida_id
  // do custasUnificadas, computado da lista de dívidas carregada para ESTE contrato.

  async function handleCriarCusta(payload) {
    try {
      // Phase 7.10.bug3 D-pre-3 — anti-zero client-side (espelha guard server-side).
      const valorNumericoCliente = Number(payload?.valor || 0);
      if (!(valorNumericoCliente > 0)) {
        toast.error("Valor da custa deve ser maior que zero");
        throw new Error("Valor da custa deve ser maior que zero");
      }
      await criarCusta(contrato.id, payload);
      invalidateContrato(contrato.id);            // D-05 — antes do toast
      toast.success("Custa criada.");
      setCustaModalAberta(false);
      setCustaEmEdicao(null);
      await onCarregarTudo();
    } catch (e) {
      toast.error(e?.message || "Erro ao criar custa.");
      throw e; // re-throw pra NovaCustaModal saber que falhou
    }
  }

  async function handleEditarCusta(custaOriginal, patch) {
    try {
      await editarCusta(contrato.id, custaOriginal.divida_id, custaOriginal.id, patch);
      invalidateContrato(contrato.id);            // D-05 — antes do toast
      toast.success("Custa atualizada.");
      setCustaModalAberta(false);
      setCustaEmEdicao(null);
      await onCarregarTudo();
    } catch (e) {
      toast.error(e?.message || "Erro ao atualizar custa.");
      throw e;
    }
  }

  async function handleExcluirCusta(custa) {
    if (!window.confirm("Excluir esta custa? Esta ação não pode ser desfeita.")) return;
    try {
      await excluirCusta(contrato.id, custa.divida_id, custa.id);
      invalidateContrato(contrato.id);            // D-05 — antes do toast
      toast.success("Custa excluída.");
      await onCarregarTudo();
    } catch (e) {
      toast.error(e?.message || "Erro ao excluir custa.");
    }
  }

  async function handleTogglePagoCusta(custa) {
    try {
      await togglePagoCusta(contrato.id, custa.divida_id, custa.id);
      invalidateContrato(contrato.id);            // D-05 — antes do toast
      toast.success(custa.pago ? "Custa marcada como em aberto." : "Custa marcada como paga.");
      await onCarregarTudo();
    } catch (e) {
      toast.error(e?.message || "Erro ao alterar status da custa.");
    }
  }

  // Proxy handler pra NovaCustaModal — delega pra criar ou editar.
  async function handleSalvarCustaFromModal(payload) {
    if (custaEmEdicao?.id) {
      await handleEditarCusta(custaEmEdicao, payload);
    } else {
      await handleCriarCusta(payload);
    }
  }

  // Phase 7.5 D-06: Map<docId, Set<String(dividaId)>> de parcelas readonly
  // (com saldo_quitado OR com ≥1 pagamento em pagamentos_divida).
  // Pré-computado uma vez por render, lookup O(1) no componente filho.
  const dividasComPagamentoIdsPorDoc = useMemo(() => {
    const byDoc = new Map();
    for (const d of (dividas || [])) {
      if (!d.documento_id) continue;
      const docKey = String(d.documento_id);
      if (!byDoc.has(docKey)) byDoc.set(docKey, new Set());
      if (d.saldo_quitado) byDoc.get(docKey).add(String(d.id));
    }
    for (const p of (allPagamentosDivida || [])) {
      if (!p.divida_id || !p.valor) continue;
      const divida = (dividas || []).find(d => String(d.id) === String(p.divida_id));
      if (!divida || !divida.documento_id) continue;
      const docKey = String(divida.documento_id);
      if (!byDoc.has(docKey)) byDoc.set(docKey, new Set());
      byDoc.get(docKey).add(String(p.divida_id));
    }
    return byDoc;
  }, [dividas, allPagamentosDivida]);

  const devedor = devedores.find(d => String(d.id) === String(contrato.devedor_id));
  const credor  = credores?.find(c => String(c.id) === String(contrato.credor_id));
  const { total_pago, saldo_restante } = calcularTotaisContratoNominal(dividas || [], allPagamentosDivida);

  // Phase 7.8 — saldo atualizado Art.354 (correção + multa + juros + honorários).
  // Adapter thin calcularDetalheEncargosContrato delega ao motor existente (plan 07.8-01).
  // useMemo cacheia — recalcula só quando dividas/pagamentos/hoje mudam (D-18).
  const detalheEncargosContrato = useMemo(
    () => calcularDetalheEncargosContrato(dividas || [], allPagamentosDivida || [], hoje),
    [dividas, allPagamentosDivida, hoje]
  );
  // Phase 7.9 P1 — Resumo Financeiro inclui custas atualizadas (motor expõe `custas.atualizado`
  // lado-a-lado de `saldoAtualizado` mas não agrega — UI soma client-side, D-01 strict).
  const saldoAtualizadoContrato = (detalheEncargosContrato?.saldoAtualizado ?? 0)
                                + (detalheEncargosContrato?.custas?.atualizado ?? 0);

  // Phase 7.9 — lista de custas (avulsas — todas em dívidas-fantasma _so_custas:true)
  // com valor atualizado per-custa. ZERO coluna "Vínculo" (custas sempre avulsas — Q1 RECONSIDERED 2026-04-25).
  const custasUnificadas = useMemo(() => {
    const out = [];
    const hoje_str = typeof hoje === "string" ? hoje : hoje.toISOString().slice(0, 10);
    const detalhePorDividaMap = new Map(
      (detalheEncargosContrato?.detalhePorDivida || [])
        .map((d, idx) => [String(idx), d])
    );
    (dividas || []).forEach((d, dividaIdx) => {
      const custas = Array.isArray(d.custas) ? d.custas : [];
      if (custas.length === 0) return;
      const isAvulsa = !!d._so_custas;
      const detDiv = detalhePorDividaMap.get(String(dividaIdx));
      // Heurística de valor atualizado por custa: se `detDiv.custas.atualizado` existe, dividir
      // proporcionalmente ao valor nominal de cada custa. Para custas pagas, exibir valor nominal
      // (histórico D-24). Para avulsas (_so_custas:true), motor agrega no totalCustasAtualizado mas
      // NÃO push em detalhePorDivida — calcula client-side per-custa via calcularFatorCorrecao
      // (mesmo "inpc" hardcoded que motor L485 usa). ISSUE 3 Fix A — Phase 7.9.
      const somaNominalDiv = custas.reduce((s, c) => s + Number(c.valor || 0), 0);
      const atualizadoTotalDiv = Number(detDiv?.custas?.atualizado || somaNominalDiv);
      custas.forEach(c => {
        const nominal = Number(c.valor || 0);
        // Phase 7.9 P3 — correção sempre aplicada (independente de c.pago).
        // Advogado paga a custa de antemão e cobra correção desde a data do pagamento.
        let atualizado;
        if (isAvulsa && c.data && c.data < hoje_str) {
          atualizado = nominal * calcularFatorCorrecao("inpc", c.data, hoje_str);
        } else {
          atualizado = somaNominalDiv > 0 ? nominal * (atualizadoTotalDiv / somaNominalDiv) : nominal;
        }
        out.push({
          id:             c.id,
          divida_id:      d.id,
          descricao:      c.descricao || "",
          valor_nominal:  nominal,
          valor_atualizado: atualizado,
          data:           c.data || "",                     // shape D-22 — motor lê c.data legacy
          pago:           !!c.pago,
          data_pagamento: c.data_pagamento || null,
        });
      });
    });
    return out;
  }, [dividas, detalheEncargosContrato, hoje]);

  const credoresOptions = [{ v: "", l: "— sem credor" }, ...(credores || []).map(c => ({ v: String(c.id), l: c.nome }))];
  const devedoresOptions = [{ v: "", l: "— sem devedor" }, ...(devedores || []).map(d => ({ v: String(d.id), l: d.nome }))];

  function buildParcelasText(parcelasIds, dividas) {
    if (!parcelasIds || parcelasIds.length === 0) return "—";
    const sorted = [...(dividas || [])].sort((a, b) =>
      (a.data_vencimento || "").localeCompare(b.data_vencimento || "")
    );
    const total = sorted.length;
    const nums = parcelasIds
      .map(uid => {
        const idx = sorted.findIndex(d => String(d.id) === String(uid));
        return idx >= 0 ? idx + 1 : null;
      })
      .filter(n => n !== null)
      .sort((a, b) => a - b);
    if (nums.length === 0) return "—";
    return nums.map(n => `Parc. ${n}/${total}`).join(", ");
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>

      {/* 1. Back button */}
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#64748b", padding: "0 0 12px 0", display: "block" }}>
        ← Contratos
      </button>

      {/* 2. Header card — read mode */}
      {!editando && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: contrato.referencia ? "#0f172a" : "#94a3b8", marginBottom: 6 }}>
                {contrato.referencia || "Contrato"}
              </p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                Credor: {credor?.nome || "— sem credor"}  ·  Devedor: {devedor?.nome || "—"}
              </p>
              <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {contrato.num_documentos || 0} documento(s) · {contrato.num_parcelas_total || 0} parcelas · {fmtBRL(contrato.valor_total)}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Btn color="#4f46e5" sm onClick={() => setEditando(true)}>Editar Contrato</Btn>
              <Btn color="#dc2626" sm outline onClick={handleExcluirContrato} disabled={excluindoContrato}>
                {excluindoContrato ? "Excluindo…" : "Excluir Contrato"}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* 2. Header card — edit mode */}
      {editando && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "24px 24px", marginBottom: 16, border: "1px solid #c7d2fe" }}>
          <div style={{ marginBottom: 12 }}>
            <Inp
              label="Referência"
              value={editForm.referencia}
              onChange={v => setEditForm(f => ({ ...f, referencia: v }))}
              span
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Inp
              label="Credor"
              value={editForm.credor_id}
              onChange={v => setEditForm(f => ({ ...f, credor_id: v }))}
              options={credoresOptions}
            />
            <Inp
              label="Devedor"
              value={editForm.devedor_id}
              onChange={v => setEditForm(f => ({ ...f, devedor_id: v }))}
              options={devedoresOptions}
            />
          </div>
          <DiretrizesContrato value={editForm.encargos} onChange={handleEncargos} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn outline color="#64748b" sm onClick={handleCancelar} disabled={salvando}>
              Cancelar
            </Btn>
            <span title={!camposCriticosOk ? "Preencha todos os encargos" : undefined}>
              <Btn color="#4f46e5" sm disabled={salvando || !camposCriticosOk} onClick={handleSalvar}>
                {salvando ? <Spinner /> : "Salvar"}
              </Btn>
            </span>
          </div>
        </div>
      )}

      {/* 3. Financial summary card — Phase 7.8: +4ª coluna Saldo Atualizado Art.354 quando num_documentos>0 (D-04, D-05) */}
      <div style={{ background: "linear-gradient(135deg,#f0fdf4 0%,#fff 100%)", borderRadius: 16, padding: "16px 24px", border: "1px solid #bbf7d0", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Resumo Financeiro</p>
        {(() => {
          const temDocumentos = (contrato.num_documentos || 0) > 0;
          const colunas = [
            { label: "Valor Total",      value: fmtBRL(contrato.valor_total), clickable: false },
            { label: "Total Pago",       value: fmtBRL(total_pago),           clickable: false },
            { label: "Em Aberto",        value: fmtBRL(saldo_restante),       clickable: false },
          ];
          if (temDocumentos) {
            colunas.push({
              label: "Saldo Atualizado",
              value: fmtBRL(saldoAtualizadoContrato),
              clickable: true,
            });
          }
          const nCols = colunas.length;
          return (
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${nCols}, 1fr)`, gap: 12 }}>
              {colunas.map(({ label, value, clickable }) => (
                <div
                  key={label}
                  onClick={clickable ? () => setShowDecomposicaoModal(true) : undefined}
                  style={{
                    background: "#fff",
                    borderRadius: 12,
                    padding: "12px 16px",
                    border: clickable ? "1px solid #86efac" : "1px solid #e2e8f0",
                    textAlign: "center",
                    cursor: clickable ? "pointer" : "default",
                    transition: clickable ? "box-shadow .15s, border-color .15s" : undefined,
                  }}
                  onMouseEnter={clickable ? (e) => {
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(34,197,94,.2)";
                    e.currentTarget.style.borderColor = "#22c55e";
                  } : undefined}
                  onMouseLeave={clickable ? (e) => {
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.borderColor = "#86efac";
                  } : undefined}
                  title={clickable ? "Clique para ver composição (Art. 354 CC)" : undefined}
                >
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>{value}</p>
                </div>
              ))}
            </div>
          );
        })()}
        <p style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", marginTop: 8, marginBottom: 0 }}>(amortização sequencial conforme Art. 354 CC)</p>
      </div>

      {/* 3a. Devedores do Contrato — Phase 7.13c (D-pre-9 multi-devedor cadastro só por contrato) */}
      <DevedoresDoContrato contratoId={contrato.id} devedores={devedores} />

      {/* 3b. Registrar Pagamento — botão e form inline */}
      {!registrandoPagamento && (
        <div style={{ marginTop: 0, marginBottom: 16 }}>
          <Btn color="#0d9488" sm onClick={handleAbrirFormPagamento}>Registrar Pagamento</Btn>
        </div>
      )}

      {registrandoPagamento && (
        <div style={{ background: "#fff", borderRadius: 16, padding: "16px 24px", marginBottom: 16, border: "1px solid #c7d2fe" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Inp
              label="Data"
              type="date"
              value={formPagamento.data}
              onChange={v => setFormPagamento(f => ({ ...f, data: v }))}
              max={typeof hoje === "string" ? hoje : hoje.toISOString().slice(0, 10)}
            />
            <Inp
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              value={formPagamento.valor}
              onChange={v => setFormPagamento(f => ({ ...f, valor: v }))}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <Inp
              label="Observação"
              value={formPagamento.observacao}
              onChange={v => setFormPagamento(f => ({ ...f, observacao: v }))}
              span
            />
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn outline color="#64748b" sm
              onClick={() => { setRegistrandoPagamento(false); setFormPagamento({ data: "", valor: "", observacao: "" }); setSaldoCalculado(0); }}
              disabled={salvandoPagamento}>
              Cancelar
            </Btn>
            <Btn color="#0d9488" sm disabled={salvandoPagamento} onClick={handleRegistrarPagamento}>
              {salvandoPagamento ? <Spinner /> : "Salvar"}
            </Btn>
          </div>
        </div>
      )}

      {/* 3c. Pagamentos Recebidos — seção colapsável */}
      <div
        onClick={() => setPagamentosAberto(p => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          padding: "8px 0",
          marginTop: 0,
        }}
      >
        <p style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: "#0f172a",
          margin: 0,
        }}>
          Pagamentos Recebidos {pagamentosAberto ? "▲" : "▼"}
        </p>
      </div>

      {pagamentosAberto && (
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          marginTop: 8,
          marginBottom: 16,
        }}>
          {pagamentosLoading && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
              Carregando pagamentos...
            </p>
          )}

          {!pagamentosLoading && pagamentosContrato.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Nenhum pagamento registrado.</p>
            </div>
          )}

          {!pagamentosLoading && pagamentosContrato.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={th}>DATA</th>
                    <th style={th}>VALOR</th>
                    <th style={th}>PARCELAS AMORTIZADAS</th>
                    <th style={th}>OBSERVAÇÃO</th>
                    <th style={{ ...th, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentosContrato.map(pagamento => (
                    <tr key={pagamento.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={td}>{fmtData(pagamento.data_pagamento)}</td>
                      <td style={td}>{fmtBRL(pagamento.valor)}</td>
                      <td style={{ ...td, fontSize: 12, color: "#374151" }}>
                        {buildParcelasText(pagamento.parcelas_ids, dividas)}
                      </td>
                      <td style={td}>{truncate(pagamento.observacao || "—", 60)}</td>
                      <td style={{ ...td, textAlign: "center" }}>
                        {excluindoPagamentoId === pagamento.id ? (
                          <Spinner />
                        ) : (
                          <button
                            onClick={() => handleExcluirPagamento(pagamento)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 13,
                              color: "#dc2626",
                              fontWeight: 700,
                              padding: "0 4px",
                            }}
                            title="Excluir pagamento"
                          >
                            [X]
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. Documentos section */}
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 8 }}>Documentos</p>

      {loadingDocumentos && (
        <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>Carregando dados do contrato...</p>
      )}

      {!loadingDocumentos && documentos.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nenhum documento adicionado</p>
          <p style={{ fontSize: 13 }}>Clique em &apos;+ Adicionar Documento&apos; para começar.</p>
        </div>
      )}

      {documentos.map(doc => {
        const isExpanded = expandedDoc === doc.id;
        const parcelasDoc = (dividas || [])
          .filter(d => d.documento_id === doc.id)
          .sort((a, b) => (a.data_vencimento || "").localeCompare(b.data_vencimento || ""));
        const atrasadasDoc = parcelasDoc.filter(d => !d.saldo_quitado && d.data_vencimento && d.data_vencimento < hoje).length;
        const badgeMeta = CONTRATO_BADGE_META[doc.tipo] || { label: doc.tipo, bg: "#f1f5f9", cor: "#64748b" };
        const custom = hasCustomEncargos(doc, contrato);

        return (
          <div
            key={doc.id}
            style={{ background: isExpanded ? "#fff" : "#f8fafc", border: isExpanded ? "1px solid #c7d2fe" : "1px solid #e8f0f7", borderRadius: 12, padding: "12px 16px", marginBottom: 12, cursor: "pointer" }}
            onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
          >
            {/* Summary row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ display: "inline-block", background: badgeMeta.bg, color: badgeMeta.cor, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                  {badgeMeta.label}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{doc.numero_doc || doc.tipo}</span>
                {custom && (
                  <span style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a", fontSize: 11, fontWeight: 700, padding: "4px 8px", borderRadius: 99, marginLeft: 4 }}>
                    Custom
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#374151" }}>
                  {doc.num_parcelas}x · {fmtBRL(doc.valor)}
                  <span style={{ fontSize: 11, color: "#64748b", marginLeft: 4 }}>a partir de {fmtData(doc.data_emissao)}</span>
                </span>
                {atrasadasDoc > 0
                  ? <span style={{ color: "#dc2626", fontWeight: 700, fontSize: 13 }}>{atrasadasDoc} parcelas</span>
                  : <span style={{ color: "#94a3b8", fontSize: 13 }}>—</span>
                }
                <span style={{ fontSize: 11, color: "#64748b" }}>{isExpanded ? "▲" : "▼"}</span>
              </div>
            </div>

            {/* Expanded: parcelas table + editar parcelas (Phase 7.5 D-04) */}
            {isExpanded && (
              <div style={{ marginTop: 12 }} onClick={e => e.stopPropagation()}>
                {editingDocId !== doc.id && (
                  <div style={{ marginBottom: 8, textAlign: "right" }}>
                    <span style={{ marginRight: 8, display: "inline-block" }}>
                      <Btn
                        color="#dc2626"
                        sm
                        outline
                        onClick={() => handleExcluirDocumento(doc)}
                        disabled={excluindoDocumentoId === doc.id}
                      >
                        {excluindoDocumentoId === doc.id ? "Excluindo…" : "Excluir documento"}
                      </Btn>
                    </span>
                    <Btn
                      color="#4f46e5"
                      sm
                      outline
                      onClick={() => setEditingDocId(doc.id)}
                      disabled={savingParcelas}
                    >
                      Editar parcelas
                    </Btn>
                  </div>
                )}

                {editingDocId === doc.id ? (
                  <TabelaParcelasEditaveis
                    valorTotal={Number(doc.valor)}
                    parcelasIniciais={parcelasDoc.map((p, idx) => ({
                      id: p.id,
                      numero: idx + 1,
                      valor_total: Number(p.valor_total || 0),
                      data_vencimento: p.data_vencimento || "",
                    }))}
                    modoEdicao="edit"
                    dividasComPagamentoIds={dividasComPagamentoIdsPorDoc.get(String(doc.id)) || new Set()}
                    onSubmit={handleSalvarParcelasCustom}
                    onCancel={() => setEditingDocId(null)}
                  />
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          <th style={th}>Nº</th>
                          <th style={th}>Vencimento</th>
                          <th style={th}>Valor</th>
                          <th style={th}>Saldo</th>
                          <th style={th}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saldosLoading && parcelasDoc.length > 0 ? (
                          <tr><td colSpan={5} style={{ ...td, textAlign: "center", color: "#94a3b8" }}>Carregando parcelas...</td></tr>
                        ) : (
                          parcelasDoc.map((p, i) => (
                            <tr
                              key={p.id}
                              onClick={() => onVerDetalhe(p)}
                              style={{ borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}
                              onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                              onMouseLeave={e => e.currentTarget.style.background = ""}
                            >
                              <td style={td}>{i + 1}</td>
                              <td style={td}>{fmtData(p.data_vencimento)}</td>
                              <td style={td}>{fmtBRL(p.valor_total)}</td>
                              <td style={td}>
                                {saldosMap[String(p.id)] != null
                                  ? fmtBRL(saldosMap[String(p.id)])
                                  : (saldosLoading ? "..." : "—")
                                }
                              </td>
                              <td style={td}>
                                {p.saldo_quitado
                                  ? <span style={{ background: "#dcfce7", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Quitado</span>
                                  : <AtrasoCell dataVencimento={p.data_vencimento} />
                                }
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* 4.5 — Phase 7.9 — Seção Custas Judiciais (aparece SEMPRE, mesmo vazia, se contrato tem documentos) */}
      {(contrato.num_documentos || 0) > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, padding: "16px 20px", border: "1px solid #e2e8f0", marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", margin: 0 }}>
              Custas Judiciais ({custasUnificadas.length})
            </p>
            <Btn color="#7c3aed" sm onClick={() => { setCustaEmEdicao(null); setCustaModalAberta(true); }}>
              + Nova Custa
            </Btn>
          </div>

          {custasUnificadas.length === 0 ? (
            <p style={{ fontSize: 13, color: "#94a3b8", margin: 0 }}>Nenhuma custa lançada.</p>
          ) : (
            <div style={{ overflow: "auto" }}>
              <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>Descrição</th>
                    <th style={th}>Valor original</th>
                    <th style={th}>Valor atualizado</th>
                    <th style={th}>Data pagamento</th>
                    <th style={th}>Pago</th>
                    <th style={th}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {custasUnificadas.map(c => (
                    <tr key={c.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px" }}>{c.descricao || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtBRL(c.valor_nominal)}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtBRL(c.valor_atualizado)}</td>
                      <td style={{ padding: "8px 10px" }}>{fmtData(c.data)}</td>
                      <td style={{ padding: "8px 10px" }}>
                        {c.pago
                          ? <span style={{ background: "#dcfce7", color: "#065f46", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Pago {c.data_pagamento ? `em ${fmtData(c.data_pagamento)}` : ""}</span>
                          : <span style={{ background: "#fef3c7", color: "#92400e", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>Em aberto</span>}
                      </td>
                      <td style={{ padding: "8px 10px", display: "flex", gap: 4 }}>
                        <Btn sm outline color="#64748b" onClick={() => { setCustaEmEdicao(c); setCustaModalAberta(true); }}>Editar</Btn>
                        <Btn sm outline color="#dc2626" onClick={() => handleExcluirCusta(c)}>Excluir</Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Phase 7.9 — NovaCustaModal (criar ou editar — mesmo componente, dispatched por custaEmEdicao) */}
      {custaModalAberta && (
        <NovaCustaModal
          contrato={contrato}
          custaInicial={custaEmEdicao}
          onSalvar={handleSalvarCustaFromModal}
          onCancelar={() => { setCustaModalAberta(false); setCustaEmEdicao(null); }}
        />
      )}

      {/* 5. Adicionar Documento */}
      {!adicionandoDocumento && (
        <div style={{ marginTop: 8 }}>
          <Btn color="#0d9488" sm onClick={() => setAdicionandoDocumento(true)}>+ Adicionar Documento</Btn>
        </div>
      )}

      {adicionandoDocumento && (
        <AdicionarDocumento
          contrato={contrato}
          onDocumentoAdicionado={handleDocumentoAdicionado}
          onCancelar={() => setAdicionandoDocumento(false)}
        />
      )}

      {/* 6. Histórico section */}
      <div
        onClick={() => setHistoricoAberto(h => !h)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          padding: "8px 0",
          marginTop: 24,
        }}
      >
        <p style={{
          fontFamily: "'Space Grotesk',sans-serif",
          fontWeight: 700,
          fontSize: 13,
          color: "#0f172a",
          margin: 0,
        }}>
          Histórico {historicoAberto ? "▲" : "▼"}
        </p>
      </div>

      {historicoAberto && (
        <div style={{
          background: "#fff",
          borderRadius: 12,
          padding: "16px 20px",
          border: "1px solid #e2e8f0",
          marginTop: 8,
        }}>
          {historicoLoading && (
            <p style={{ textAlign: "center", fontSize: 13, color: "#94a3b8", padding: "16px 0" }}>
              Carregando histórico...
            </p>
          )}

          {!historicoLoading && historico.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: "#94a3b8" }}>
              <p style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Sem histórico disponível</p>
              <p style={{ fontSize: 13 }}>Este contrato não possui eventos registrados.</p>
            </div>
          )}

          {!historicoLoading && historico.length > 0 && (
            <div style={{ position: "relative", paddingLeft: 32 }}>
              <div style={{
                position: "absolute",
                left: 16,
                top: 8,
                bottom: 8,
                width: 2,
                background: "#e2e8f0",
              }} />

              {historico.map((evento, idx) => {
                const isCriacao = evento.tipo_evento === "criacao";
                const isPagamento = ['pagamento_recebido', 'pagamento_revertido'].includes(evento.tipo_evento);
                const isLast    = idx === historico.length - 1;
                const snap = evento.snapshot_campos || {};

                const diffEntries = !isCriacao && !isPagamento
                  ? Object.entries(snap).map(([campo, val]) => ({
                      campo,
                      antes:  String(val?.antes  ?? ""),
                      depois: String(val?.depois ?? ""),
                    }))
                  : [];

                return (
                  <div
                    key={evento.id}
                    style={{ position: "relative", paddingBottom: isLast ? 0 : 20 }}
                  >
                    <div style={{
                      position: "absolute",
                      left: -19,
                      top: 3,
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: isCriacao ? "#0f172a" : "#4f46e5",
                      border: "2px solid #4f46e5",
                      zIndex: 1,
                    }} />

                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
                        {TIPO_EVENTO_LABELS[evento.tipo_evento] ?? "Edição salva"}
                      </span>
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>
                        {fmtDataHora(evento.created_at)}
                      </span>
                    </div>

                    {isCriacao && (
                      <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.7 }}>
                        {snap.credor_id && (
                          <>Credor: {
                            credores?.find(c => String(c.id) === String(snap.credor_id))?.nome
                            || snap.credor_id
                          }<br /></>
                        )}
                        {snap.devedor_id && (
                          <>Devedor: {
                            devedores?.find(d => String(d.id) === String(snap.devedor_id))?.nome
                            || snap.devedor_id
                          }<br /></>
                        )}
                        {snap.referencia && <>Referência: {snap.referencia}<br /></>}
                      </div>
                    )}

                    {isPagamento && (
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
                        <div>Valor: {fmtBRL(snap.valor)}</div>
                        <div>Data: {fmtData(snap.data_pagamento)}</div>
                        <div>
                          Parcelas: {buildParcelasText(snap.parcelas_ids, dividas)}
                          {" "}({snap.parcelas_amortizadas ?? snap.parcelas_ids?.length ?? 0} amortizada(s))
                        </div>
                      </div>
                    )}

                    {!isCriacao && diffEntries.length > 0 && (
                      <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.7 }}>
                        {diffEntries.map(({ campo, antes, depois }) => {
                          const resolveVal = (val) => {
                            if (val === "") return "—";
                            if (campo === "credor_id")  return credores?.find(c => String(c.id) === val)?.nome ?? val;
                            if (campo === "devedor_id") return devedores?.find(d => String(d.id) === val)?.nome ?? val;
                            return val;
                          };
                          return (
                            <div key={campo}>
                              <span style={{ color: "#64748b" }}>{FIELD_LABELS[campo] ?? campo}:</span>{" "}
                              <span style={{ color: "#0f172a" }}>{truncate(resolveVal(antes), 40)}</span>{" "}
                              <span style={{ color: "#94a3b8" }}>→</span>{" "}
                              <span style={{ color: "#0f172a" }}>{truncate(resolveVal(depois), 40)}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Phase 7.8-03 — Modal de composição do saldo atualizado (Art.354 CC).
          Abre ao clicar na 4ª coluna "Saldo Atualizado" do Resumo Financeiro. */}
      {showDecomposicaoModal && (
        <DecomposicaoSaldoModal
          detalhe={detalheEncargosContrato}
          contrato={contrato}
          credor={credor}
          devedor={devedor}
          indexadorLabel={contrato?.indice_correcao ? String(contrato.indice_correcao).toUpperCase() : "—"}
          dataCalculo={hoje}
          dividas={dividas}                               /* Phase 7.9 (D-24) */
          onClose={() => setShowDecomposicaoModal(false)}
        />
      )}

    </div>
  );
}
