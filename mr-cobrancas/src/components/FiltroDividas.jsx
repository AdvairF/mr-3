import { useState, useRef, useEffect } from "react";

const inpS = { padding: "7px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };

export default function FiltroDividas({ credores, onFiltrosChange }) {
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroCredorId, setFiltroCredorId] = useState("");
  const [buscaDevedor, setBuscaDevedor] = useState("");
  const [filtroAtraso, setFiltroAtraso] = useState("");
  const [buscaKey, setBuscaKey] = useState(0);
  const debounceRef = useRef(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    onFiltrosChange({ status: filtroStatus, credorId: filtroCredorId, busca: buscaDevedor, atrasoMin: filtroAtraso });
  }, [filtroStatus, filtroCredorId, buscaDevedor, filtroAtraso]);

  return (
    <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Devedor text input */}
        <input
          key={buscaKey}
          style={{ ...inpS, flex: 1, minWidth: 180 }}
          placeholder="Buscar por nome..."
          defaultValue=""
          onChange={e => {
            const val = e.target.value;
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => setBuscaDevedor(val), 300);
          }}
        />
        {/* Status dropdown */}
        <select style={inpS} value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
          <option value="">Todos</option>
          <option value="em cobrança">Em Cobrança</option>
          <option value="quitada">Quitada</option>
          <option value="acordo">Acordo</option>
        </select>
        {/* Credor dropdown */}
        <select style={inpS} value={filtroCredorId} onChange={e => setFiltroCredorId(e.target.value)}>
          <option value="">Todos os credores</option>
          {(credores || []).map(c => (
            <option key={c.id} value={String(c.id)}>{c.nome}</option>
          ))}
        </select>
        {/* Atraso dropdown */}
        <select style={inpS} value={filtroAtraso} onChange={e => setFiltroAtraso(e.target.value)}>
          <option value="">Qualquer</option>
          <option value="30">30+ dias</option>
          <option value="60">60+ dias</option>
          <option value="90">90+ dias</option>
        </select>
      </div>

      {/* Active filter chips — appear only when a filter is active */}
      {(filtroStatus || filtroCredorId || buscaDevedor || filtroAtraso) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {filtroStatus && (
            <span
              onClick={() => setFiltroStatus("")}
              style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Status: {filtroStatus === "em cobrança" ? "Em Cobrança" : filtroStatus.charAt(0).toUpperCase() + filtroStatus.slice(1)} ✕
            </span>
          )}
          {filtroCredorId && (
            <span
              onClick={() => setFiltroCredorId("")}
              style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Credor: {credores?.find(c => String(c.id) === filtroCredorId)?.nome || filtroCredorId} ✕
            </span>
          )}
          {buscaDevedor && (
            <span
              onClick={() => { setBuscaDevedor(""); setBuscaKey(k => k + 1); }}
              style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Devedor: "{buscaDevedor}" ✕
            </span>
          )}
          {filtroAtraso && (
            <span
              onClick={() => setFiltroAtraso("")}
              style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              Atraso: {filtroAtraso}+ dias ✕
            </span>
          )}
        </div>
      )}
    </div>
  );
}
