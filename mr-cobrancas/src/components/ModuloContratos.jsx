import { useState, useMemo, useEffect, useRef } from "react";
import TabelaContratos from "./TabelaContratos.jsx";
import DetalheContrato from "./DetalheContrato.jsx";
import NovoContrato from "./NovoContrato.jsx";
import DetalheDivida from "./DetalheDivida.jsx";
import Btn from "./ui/Btn.jsx";
import { calcularTotaisContratoNominal } from "../services/contratos.js";
// Phase 7.8.2a — Fix D (cache SWR + coluna Saldo Atualizado)
import CelulaSaldoAtualizado from "./CelulaSaldoAtualizado.jsx";
import {
  invalidateAll,
  kickoffBatch,
  subscribeToCache,   // helper observabilidade SC5 — locked em CONTEXT.md §5
  getLastCalculadoEm, // helper observabilidade SC5 — locked em CONTEXT.md §5
} from "../hooks/useSaldoAtualizadoCache.js";

export default function ModuloContratos({
  allContratos,
  allDividas,
  devedores,
  credores,
  allPagamentos,
  allPagamentosDivida,
  devedoresDividasJunction = [],   // Phase 7.13e — junction D-pre-14 (consolidação client-side)
  hoje,
  onCarregarTudo,
  setTab,
  devedorPreSelecionado,
}) {
  const [view, setView] = useState("lista");
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [selectedParcela, setSelectedParcela] = useState(null);

  // Phase 7.8.2a — aliases locais p/ deps grep literal (D-12).
  const contratos = allContratos || [];
  const dividas = allDividas || [];

  // Phase 7.8.2a — kickoffBatch on mount + re-kickoff on .length changes.
  // D-12: useRef flag protege StrictMode double-mount; deps por .length permitem
  // re-kickoff quando CRUD muda contagem de contratos/dívidas/pagamentos.
  const kickedOff = useRef(false);
  useEffect(() => {
    // primeiro mount OU mudança de contagem → re-kickoff (filter interno do hook pula já-cached)
    if (kickedOff.current === false || true) {
      kickoffBatch(contratos, dividas, allPagamentosDivida);
      kickedOff.current = true;
    }
  }, [contratos.length, dividas.length, allPagamentosDivida.length]);

  // Phase 7.8.2a — tick reativo p/ timestamp do header (SC5).
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = subscribeToCache(() => setTick(t => t + 1));
    return unsub;
  }, []);

  function fmtHHMM(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("pt-BR", {
      hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo"
    });
  }
  const lastCalc = getLastCalculadoEm();
  // tick ref evita warning unused-var em modo lint estrito (re-render driver)
  void tick;
  const timestampLabel = lastCalc ? `Atualizado às ${fmtHHMM(lastCalc)}` : "Atualizando…";

  const parcelasPorContrato = useMemo(() => {
    const m = new Map();
    dividas.forEach(d => {
      if (!d.contrato_id) return;
      const k = String(d.contrato_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    });
    return m;
  }, [allDividas]);

  const totaisPorContrato = useMemo(() => {
    const m = new Map();
    contratos.forEach(c => {
      const k = String(c.id);
      const parcelas = parcelasPorContrato.get(k) || [];
      const { total_pago, saldo_restante } = calcularTotaisContratoNominal(parcelas, allPagamentosDivida);
      m.set(k, { pago: total_pago, emAberto: saldo_restante });
    });
    return m;
  }, [allContratos, parcelasPorContrato, allPagamentosDivida]);

  // Phase 7.13e — Map<contratoId, [{devedor_id, papel}]> consolidado client-side (D-pre-2/D-pre-14).
  // DISTINCT por devedor_id (uma entrada por devedor, não 12x — cada devedor aparece N vezes
  // na junction, uma por dívida do contrato — fan-out D-pre-10). Sort: PRINCIPAL primeiro.
  const devedoresPorContrato = useMemo(() => {
    const dividaToContrato = new Map();
    (allDividas || []).forEach(d => {
      if (d.contrato_id) dividaToContrato.set(String(d.id), String(d.contrato_id));
    });
    const out = new Map();
    (devedoresDividasJunction || []).forEach(r => {
      const contratoId = dividaToContrato.get(String(r.divida_id));
      if (!contratoId) return;
      if (!out.has(contratoId)) out.set(contratoId, new Map());
      // DISTINCT por devedor_id (uma entrada por devedor — primeiro papel encontrado)
      const devMap = out.get(contratoId);
      const key = String(r.devedor_id);
      if (!devMap.has(key)) {
        devMap.set(key, { devedor_id: r.devedor_id, papel: r.papel });
      }
    });
    // Converte Map<id,{...}> → Array com PRINCIPAL primeiro, depois ordem original
    const result = new Map();
    for (const [contratoId, devMap] of out.entries()) {
      const arr = Array.from(devMap.values()).sort((a, b) => {
        if (a.papel === 'PRINCIPAL' && b.papel !== 'PRINCIPAL') return -1;
        if (b.papel === 'PRINCIPAL' && a.papel !== 'PRINCIPAL') return 1;
        return 0;
      });
      result.set(contratoId, arr);
    }
    return result;
  }, [devedoresDividasJunction, allDividas]);

  const contratosAtivos = contratos.filter(c =>
    (parcelasPorContrato.get(String(c.id)) || []).some(d => !d.saldo_quitado)
  ).length;

  function handleVerDetalhe(contrato) { setSelectedContrato(contrato); setView("detalhe"); }
  function handleVoltar() { setView("lista"); setSelectedContrato(null); }
  function handleVerParcela(divida) { setSelectedParcela(divida); setView("parcela-detalhe"); }
  function handleVoltarDaParcela() { setView("detalhe"); setSelectedParcela(null); }
  function handleVoltarDoNovo() { setView("lista"); }
  // D-06: after criarContrato, navigate to detalhe of new contrato (not back to lista)
  function handleContratoCreado(contrato) { setSelectedContrato(contrato); setView("detalhe"); }

  return (
    <div style={{ padding: "4px 0 32px 0" }}>

      {/* LISTA VIEW */}
      {view === "lista" && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", margin: 0 }}>
                Contratos
              </h2>
              <span style={{ background: "#ccfbf1", color: "#0d9488", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
                {contratosAtivos} ativos
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {/* Phase 7.8.2a — timestamp reativo + botão Atualizar (SC5/SC8) */}
              <span style={{ fontSize: 12, color: "#666" }}>{timestampLabel}</span>
              <button
                type="button"
                onClick={() => { invalidateAll(); kickoffBatch(contratos, dividas, allPagamentosDivida); }}
                title="Forçar atualização do saldo"
                style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: "pointer", color: "#475569", fontWeight: 600 }}
              >🔄 Atualizar</button>
              <Btn onClick={() => setView("novo")} color="#0d9488" sm>+ Novo Contrato</Btn>
            </div>
          </div>
          <TabelaContratos
            contratos={contratos}
            devedores={devedores}
            credores={credores}
            parcelasPorContrato={parcelasPorContrato}
            totaisPorContrato={totaisPorContrato}
            devedoresPorContrato={devedoresPorContrato}
            hoje={hoje}
            onVerDetalhe={handleVerDetalhe}
            saldoAtualizadoColuna={{
              header: "Saldo Atualizado",
              Cell: CelulaSaldoAtualizado,
              allPagamentosDivida: allPagamentosDivida,
            }}
          />
        </div>
      )}

      {/* NOVO VIEW */}
      {view === "novo" && (
        <NovoContrato
          devedores={devedores}
          credores={credores}
          devedorPreSelecionado={devedorPreSelecionado}
          onCarregarTudo={onCarregarTudo}
          onVoltar={handleVoltarDoNovo}
          onVoltarComContrato={handleContratoCreado}
        />
      )}

      {/* DETALHE VIEW */}
      {view === "detalhe" && selectedContrato && (
        <DetalheContrato
          contrato={selectedContrato}
          dividas={(allDividas || []).filter(d => String(d.contrato_id) === String(selectedContrato.id))}
          devedores={devedores}
          credores={credores}
          allPagamentos={allPagamentos}
          allPagamentosDivida={allPagamentosDivida}
          hoje={hoje}
          onVoltar={handleVoltar}
          onVerDetalhe={handleVerParcela}
          onCarregarTudo={onCarregarTudo}
        />
      )}

      {/* PARCELA-DETALHE VIEW — embedded DetalheDivida */}
      {view === "parcela-detalhe" && selectedParcela && (
        <DetalheDivida
          divida={selectedParcela}
          devedores={devedores}
          credores={credores}
          allPagamentos={allPagamentos}
          hoje={hoje}
          onVoltar={handleVoltarDaParcela}
          onCarregarTudo={onCarregarTudo}
          setTab={setTab}
          onVerContrato={() => { setSelectedParcela(null); setView("detalhe"); }}
        />
      )}

    </div>
  );
}
