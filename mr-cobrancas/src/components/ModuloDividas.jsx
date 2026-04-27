import { useState } from "react";
import FiltroDividas from "./FiltroDividas.jsx";
import TabelaDividas from "./TabelaDividas.jsx";
import DetalheDivida from "./DetalheDivida.jsx";
import Btn from "./ui/Btn.jsx";

export default function ModuloDividas({ allDividas, devedores, credores, allPagamentos, hoje, onCarregarTudo, setTab }) {
  const [view, setView] = useState("lista");
  const [selectedDivida, setSelectedDivida] = useState(null);
  const [filtros, setFiltros] = useState({ status: "", credorId: "", busca: "", atrasoMin: "" });

  // AND filter — composed from all active filtros; passed to TabelaDividas as derived list
  const dividasFiltradas = allDividas.filter(d => {
    if (filtros.status && d.status !== filtros.status) return false;
    if (filtros.credorId && String(d.credor_id) !== String(filtros.credorId)) return false;
    if (filtros.busca) {
      const dev = devedores.find(dv => String(dv.id) === String(d.devedor_id));
      const nome = dev?.nome?.toLowerCase() || "";
      if (!nome.includes(filtros.busca.toLowerCase())) return false;
    }
    if (filtros.atrasoMin) {
      if (!d.data_vencimento) return false;
      const hojeStr = new Date().toISOString().slice(0, 10);
      const dias = Math.floor((new Date(hojeStr) - new Date(d.data_vencimento)) / 86400000);
      if (dias < Number(filtros.atrasoMin)) return false;
    }
    return true;
  });

  function handleVerDetalhe(divida) {
    setSelectedDivida(divida);
    setView("detalhe");
  }

  function handleVoltar() {
    setView("lista");
    setSelectedDivida(null);
  }

  return (
    <div style={{ padding: "4px 0 32px 0" }}>
      {view === "lista" && (
        <div>
          {/* Module header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", margin: 0 }}>
                Dívidas
              </h2>
              <span style={{ background: "#ede9fe", color: "#4c1d95", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
                {allDividas.filter(d => d.status === "em cobrança").length} em cobrança
              </span>
            </div>
          </div>

          {/* Filter bar */}
          <FiltroDividas
            credores={credores}
            onFiltrosChange={f => setFiltros(f)}
          />

          {/* Table */}
          <TabelaDividas
            dividas={dividasFiltradas}
            devedores={devedores}
            credores={credores}
            allPagamentos={allPagamentos}
            hoje={hoje}
            onVerDetalhe={handleVerDetalhe}
          />
        </div>
      )}

      {view === "detalhe" && selectedDivida && (
        <DetalheDivida
          divida={selectedDivida}
          devedores={devedores}
          credores={credores}
          allPagamentos={allPagamentos}
          hoje={hoje}
          onVoltar={handleVoltar}
          onCarregarTudo={onCarregarTudo}
          setTab={setTab}
        />
      )}
    </div>
  );
}
