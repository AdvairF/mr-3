import { useState } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import DiretrizesContrato from "./DiretrizesContrato.jsx";
import { criarContrato } from "../services/contratos.js";

const ENCARGOS_PADRAO = {
  indexador: "",                  // D-pre-1 crítico (era "igpm")
  data_inicio_atualizacao: "",
  multa_pct: "",                  // D-pre-1 crítico (era "2")
  juros_tipo: "",                 // D-pre-1 crítico (era "fixo_1")
  juros_am: "",                   // D-pre-1 crítico condicional (era "1")
  honorarios_pct: "",             // D-pre-1 crítico (era "10")
  despesas: "0",                  // D-pre-2 semântico (zero = sem despesas)
  art523_opcao: "nao_aplicar",    // D-pre-2 semântico (Art.523 CPC opt-in)
};

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" };

export default function NovoContrato({ devedores, credores, onCarregarTudo, onVoltar, onVoltarComContrato, devedorPreSelecionado }) {
  const [credor_id, setCredorId] = useState(null);
  const [devedor_id, setDevedorId] = useState(devedorPreSelecionado?.id ?? null);
  const [devedorNome, setDevedorNome] = useState(devedorPreSelecionado?.nome ?? "");
  const [referencia, setReferencia] = useState("");
  const [encargos, setEncargos] = useState(ENCARGOS_PADRAO);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState(devedorPreSelecionado?.nome ?? "");
  const [dropdownAberto, setDropdownAberto] = useState(false);

  function resultadosBusca() {
    if (busca.trim().length < 2) return [];
    return (devedores || [])
      .filter(d => (d.nome || "").toLowerCase().includes(busca.toLowerCase()) || (d.cpf_cnpj || "").includes(busca))
      .slice(0, 8);
  }

  // D-pre-3 — 5 campos críticos + condicional juros_am quando juros_tipo === "outros"
  const camposCriticosOk =
    !!encargos.indexador &&
    !!encargos.multa_pct &&
    !!encargos.juros_tipo &&
    !!encargos.honorarios_pct &&
    (encargos.juros_tipo !== "outros" || !!encargos.juros_am);
  const podesSalvar = !!devedor_id && camposCriticosOk;

  function handleEncargos(field, val) {
    setEncargos(e => ({ ...e, [field]: val }));
  }

  async function handleSalvar() {
    if (!devedor_id) { toast("Selecione o devedor.", { icon: "⚠️" }); return; }
    if (!credor_id)  { toast("Selecione o credor.",  { icon: "⚠️" }); return; }
    if (!camposCriticosOk) {
      toast.error("Preencha todos os encargos antes de salvar.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        credor_id: credor_id || null,
        devedor_id,
        referencia: referencia.trim() || null,
        indice_correcao:         encargos.indexador || null,
        juros_tipo:              encargos.juros_tipo || null,
        juros_am_percentual:     parseFloat(encargos.juros_am) || 0,
        multa_percentual:        parseFloat(encargos.multa_pct) || 0,
        honorarios_percentual:   parseFloat(encargos.honorarios_pct) || 0,
        despesas:                parseFloat(encargos.despesas) || 0,
        art523_opcao:            encargos.art523_opcao || "nao_aplicar",
        data_inicio_atualizacao: encargos.data_inicio_atualizacao || null,
      };
      const res = await criarContrato(payload);
      const contrato = Array.isArray(res) ? res[0] : res;
      if (!contrato?.id) throw new Error("Supabase não retornou row do contrato");
      await onCarregarTudo();
      toast.success("Contrato criado. Adicione o primeiro documento.");
      onVoltarComContrato(contrato);
    } catch (e) {
      toast.error("Erro ao criar contrato: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#64748b", padding: "0 0 12px 0", display: "block" }}>
        ← Contratos
      </button>

      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", marginBottom: 16 }}>
        Novo Contrato
      </h2>

      <div style={{ background: "#fff", borderRadius: 16, padding: "24px 24px", border: "1px solid #e8f0f7", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Campo 1: Credor (opcional) */}
          <div>
            <label style={labelStyle}>Credor</label>
            <select value={credor_id ?? ""} onChange={e => setCredorId(e.target.value || null)} style={inputStyle}>
              <option value="">— Sem credor</option>
              {(credores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>

          {/* Campo 2: Devedor typeahead (obrigatório) */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Devedor *</label>
            <input
              type="text"
              placeholder="Buscar devedor (mín. 2 caracteres)..."
              value={busca}
              style={inputStyle}
              onChange={e => {
                setBusca(e.target.value);
                if (!e.target.value) { setDevedorId(null); setDevedorNome(""); }
                setDropdownAberto(true);
              }}
              onFocus={() => setDropdownAberto(true)}
              onBlur={() => setTimeout(() => setDropdownAberto(false), 200)}
            />
            {dropdownAberto && resultadosBusca().length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 9, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,.08)", maxHeight: 220, overflowY: "auto" }}>
                {resultadosBusca().map(d => (
                  <div
                    key={d.id}
                    onMouseDown={() => { setDevedorId(d.id); setDevedorNome(d.nome); setBusca(d.nome); setDropdownAberto(false); }}
                    style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <strong>{d.nome}</strong>
                    {d.cpf_cnpj && <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>{d.cpf_cnpj}</span>}
                  </div>
                ))}
              </div>
            )}
            {devedor_id && (
              <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 700, marginTop: 3 }}>
                Devedor selecionado: {devedorNome}
              </p>
            )}
          </div>

          {/* Campo 3: Referência (opcional) */}
          <div>
            <label style={labelStyle}>Referência</label>
            <input
              type="text"
              placeholder="Ex.: Compra de maquinário Empresa X (opcional)"
              value={referencia}
              onChange={e => setReferencia(e.target.value)}
              style={inputStyle}
            />
          </div>

          {/* Campo 4: Encargos Padrão via DiretrizesContrato */}
          <div>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>
              Encargos Padrão do Contrato
            </p>
            <p style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 8 }}>
              Documentos herdam estes encargos — você pode editar por documento
            </p>
            <DiretrizesContrato value={encargos} onChange={handleEncargos} />
          </div>

        </div>
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span title={!devedor_id ? "Selecione o devedor" : !camposCriticosOk ? "Preencha todos os encargos" : undefined}>
          <Btn color="#0d9488" onClick={handleSalvar} disabled={!podesSalvar || salvando}>
            {salvando ? "Criando contrato..." : "Criar Contrato"}
          </Btn>
        </span>
        <Btn outline color="#64748b" onClick={onVoltar}>Cancelar criação</Btn>
      </div>
    </div>
  );
}
