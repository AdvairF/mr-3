import { useState, useMemo } from "react";
import TabelaContratos from "./TabelaContratos.jsx";
import DetalheContrato from "./DetalheContrato.jsx";
import NovoContrato from "./NovoContrato.jsx";
import DetalheDivida from "./DetalheDivida.jsx";
import Btn from "./ui/Btn.jsx";
import { calcularTotaisContratoNominal } from "../services/contratos.js";

export default function ModuloContratos({
  allContratos,
  allDividas,
  devedores,
  credores,
  allPagamentos,
  allPagamentosDivida,
  hoje,
  onCarregarTudo,
  setTab,
  devedorPreSelecionado,
}) {
  const [view, setView] = useState("lista");
  const [selectedContrato, setSelectedContrato] = useState(null);
  const [selectedParcela, setSelectedParcela] = useState(null);

  const parcelasPorContrato = useMemo(() => {
    const m = new Map();
    (allDividas || []).forEach(d => {
      if (!d.contrato_id) return;
      const k = String(d.contrato_id);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    });
    return m;
  }, [allDividas]);

  const totaisPorContrato = useMemo(() => {
    const m = new Map();
    (allContratos || []).forEach(c => {
      const k = String(c.id);
      const parcelas = parcelasPorContrato.get(k) || [];
      const { total_pago, saldo_restante } = calcularTotaisContratoNominal(parcelas, allPagamentosDivida);
      m.set(k, { pago: total_pago, emAberto: saldo_restante });
    });
    return m;
  }, [allContratos, parcelasPorContrato, allPagamentosDivida]);

  const contratosAtivos = (allContratos || []).filter(c =>
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
            <Btn onClick={() => setView("novo")} color="#0d9488" sm>+ Novo Contrato</Btn>
          </div>
          <TabelaContratos
            contratos={allContratos || []}
            devedores={devedores}
            credores={credores}
            parcelasPorContrato={parcelasPorContrato}
            totaisPorContrato={totaisPorContrato}
            hoje={hoje}
            onVerDetalhe={handleVerDetalhe}
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
