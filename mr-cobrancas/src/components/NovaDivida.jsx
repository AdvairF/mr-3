import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import DividaForm from "./DividaForm.jsx";
import { criarDivida } from "../services/dividas.js";
import { adicionarParticipante } from "../services/devedoresDividas.js";
import { dbInsert } from "../config/supabase.js";
import { DIVIDA_VAZIA } from "../utils/constants.js";

const PAPEL_META = {
  PRINCIPAL:  { label: "Principal",  bg: "#fef3c7", cor: "#92400e" },
  COOBRIGADO: { label: "Coobrigado", bg: "#ede9fe", cor: "#4c1d95" },
  AVALISTA:   { label: "Avalista",   bg: "#dbeafe", cor: "#1e3a8a" },
  FIADOR:     { label: "Fiador",     bg: "#dcfce7", cor: "#14532d" },
  CONJUGE:    { label: "Cônjuge",    bg: "#fce7f3", cor: "#831843" },
  OUTRO:      { label: "Outro",      bg: "#f1f5f9", cor: "#334155" },
};

const RESP_LABELS = { SOLIDARIA: "Solidária", SUBSIDIARIA: "Subsidiária", DIVISIVEL: "Divisível" };

const FORM_VAZIO = { ...DIVIDA_VAZIA, credor_id: null, art523_opcao: "nao_aplicar" };

export default function NovaDivida({ devedores, credores, onCarregarTudo, onVoltar }) {
  const [form, setForm] = useState(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  // Pessoas state — 1 empty PRINCIPAL line to start (D-05)
  const [pessoas, setPessoas] = useState([
    { _key: Date.now(), papel: "PRINCIPAL", responsabilidade: "SOLIDARIA", devedor_id: null, nome: null }
  ]);

  // Per-line busca state: Map<_key, string>
  const [buscas, setBuscas] = useState({});
  // Dropdown open state: which _key is showing dropdown
  const [dropdownAberto, setDropdownAberto] = useState(null);

  // Modal "Criar Pessoa Rápida" state
  const [showModalCriar, setShowModalCriar] = useState(false);
  const [contextoLinha, setContextoLinha] = useState(null); // _key that triggered modal
  const [modalNome, setModalNome] = useState("");
  const [modalCpf, setModalCpf] = useState("");
  const [modalTipo, setModalTipo] = useState("PF");
  const [criandoPessoa, setCriandoPessoa] = useState(false);

  // ── DividaForm handlers ───────────────────────────────────────

  function handleChange(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  function confirmarParcelas() {
    const total = parseFloat(form.valor_total) || 0;
    const qtd = parseInt(form.qtd_parcelas) || 1;
    if (!form.data_primeira_parcela) { toast("Informe a data.", { icon: "⚠️" }); return; }
    const parcelas = Array.from({ length: qtd }, (_, i) => {
      const d = new Date(form.data_primeira_parcela + "T12:00:00");
      d.setMonth(d.getMonth() + i);
      return { id: Date.now() + i, num: i + 1, valor: parseFloat((total / qtd).toFixed(2)), venc: d.toISOString().slice(0, 10), status: "pendente", pago_em: null };
    });
    setForm(prev => ({ ...prev, parcelas }));
  }

  function editParc(id, campo, val) {
    setForm(prev => ({ ...prev, parcelas: prev.parcelas.map(p => p.id !== id ? p : { ...p, [campo]: campo === "valor" ? parseFloat(val) || 0 : val }) }));
  }

  function addParc() {
    setForm(prev => {
      const ul = prev.parcelas[prev.parcelas.length - 1];
      const pD = ul ? (() => { const dd = new Date(ul.venc + "T12:00:00"); dd.setMonth(dd.getMonth() + 1); return dd.toISOString().slice(0, 10); })() : new Date().toISOString().slice(0, 10);
      return { ...prev, parcelas: [...prev.parcelas, { id: Date.now(), num: prev.parcelas.length + 1, valor: ul?.valor || 0, venc: pD, status: "pendente", pago_em: null }] };
    });
  }

  function remParc(id) {
    setForm(prev => ({ ...prev, parcelas: prev.parcelas.filter(p => p.id !== id) }));
  }

  // ── Pessoas management ────────────────────────────────────────

  function adicionarLinha() {
    setPessoas(prev => [...prev, {
      _key: Date.now(),
      papel: "COOBRIGADO",
      responsabilidade: "SOLIDARIA",
      devedor_id: null,
      nome: null
    }]);
  }

  function removerLinha(key) {
    setPessoas(prev => prev.filter(p => p._key !== key));
  }

  function selecionarPessoa(key, devedor) {
    setPessoas(prev => prev.map(p =>
      p._key === key ? { ...p, devedor_id: devedor.id, nome: devedor.nome } : p
    ));
    setBuscas(prev => ({ ...prev, [key]: "" }));
    setDropdownAberto(null);
  }

  function atualizarCampoLinha(key, campo, valor) {
    setPessoas(prev => prev.map(p => p._key === key ? { ...p, [campo]: valor } : p));
  }

  // ── Validation (D-07/D-08) ────────────────────────────────────

  const podesSalvar =
    !!form.valor_total &&
    !!form.data_origem &&
    pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null);

  // ── Busca dropdown logic (D-08 — exclude already-listed) ──────

  const idsJaNaLista = new Set(pessoas.map(p => String(p.devedor_id)).filter(Boolean));

  function resultadosBusca(key) {
    const busca = buscas[key] || "";
    if (busca.trim().length < 2) return [];
    return (devedores || [])
      .filter(d =>
        !idsJaNaLista.has(String(d.id)) &&
        ((d.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
          (d.cpf_cnpj || "").includes(busca))
      )
      .slice(0, 8);
  }

  // ── handleSalvar (atomic save — D-09) ─────────────────────────

  async function handleSalvar() {
    setSalvando(true);
    try {
      const principal = pessoas.find(p => p.papel === "PRINCIPAL" && p.devedor_id != null);
      const dataVenc = form.parcelas?.length > 0
        ? (form.data_primeira_parcela || form.data_origem)
        : form.data_origem;

      const payload = {
        devedor_id: principal.devedor_id,
        credor_id: form.credor_id || null,
        observacoes: form.descricao || "Dívida",
        valor_total: parseFloat(form.valor_total),
        data_vencimento: dataVenc || null,
        data_origem: form.data_origem || null,
        data_inicio_atualizacao: form.data_inicio_atualizacao || dataVenc || null,
        indice_correcao: form.indexador || "igpm",
        juros_tipo: form.juros_tipo || "fixo_1",
        juros_am_percentual: parseFloat(form.juros_am) || 0,
        multa_percentual: parseFloat(form.multa_pct) || 0,
        honorarios_percentual: parseFloat(form.honorarios_pct) || 0,
        despesas: parseFloat(form.despesas) || 0,
        art523_opcao: form.art523_opcao || "nao_aplicar",
        parcelas: form.parcelas || [],
        custas: form.custas || [],
        status: "em cobrança",
      };

      const res = await criarDivida(payload);
      const novaDiv = Array.isArray(res) ? res[0] : res;
      if (!novaDiv?.id) throw new Error("Supabase não retornou row");

      // Vincular participantes — Principal first
      const principaisFirst = [...pessoas].sort((a, b) =>
        a.papel === "PRINCIPAL" ? -1 : b.papel === "PRINCIPAL" ? 1 : 0
      );
      for (const p of principaisFirst) {
        if (!p.devedor_id) continue;
        await adicionarParticipante({
          devedorId: p.devedor_id,
          dividaId: String(novaDiv.id),
          papel: p.papel,
          responsabilidade: p.responsabilidade,
        });
      }

      await onCarregarTudo();          // D-09: update badge BEFORE navigating
      toast.success("Dívida criada com sucesso");
      onVoltar();                      // D-09: back to view='lista'
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  // ── handleCriarPessoa (D-03 — Modal "Criar Pessoa Rápida") ────

  async function handleCriarPessoa() {
    if (!modalNome.trim()) { toast("Nome é obrigatório.", { icon: "⚠️" }); return; }
    setCriandoPessoa(true);
    try {
      const res = await dbInsert("devedores", { nome: modalNome.trim(), cpf_cnpj: modalCpf.trim() || null, tipo: modalTipo });
      const nova = Array.isArray(res) ? res[0] : res;
      if (!nova?.id) throw new Error("Supabase não retornou row");
      selecionarPessoa(contextoLinha, nova);
      setShowModalCriar(false);
      setModalNome(""); setModalCpf(""); setModalTipo("PF");
    } catch (e) {
      toast.error("Erro ao criar pessoa.");
    } finally {
      setCriandoPessoa(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>
      {/* Back button */}
      <button onClick={onVoltar} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#64748b", padding: "0 0 12px 0", display: "block" }}>
        ← Dívidas
      </button>

      {/* Page title */}
      <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", margin: "0 0 16px 0" }}>
        Nova Dívida
      </h2>

      {/* Financial fields (D-06) */}
      <DividaForm
        value={form}
        onChange={handleChange}
        credores={credores}
        onConfirmarParcelas={confirmarParcelas}
        onEditParc={editParc}
        onAddParc={addParc}
        onRemParc={remParc}
      />

      {/* Pessoas na Dívida section (D-05) */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 20px", border: "1px solid #e8f0f7", marginBottom: 16, marginTop: 16 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>
          Pessoas na Dívida
        </p>

        {pessoas.map(pessoa => {
          const isPrincipal = pessoa.papel === "PRINCIPAL";
          const busca = buscas[pessoa._key] || "";
          const resultados = resultadosBusca(pessoa._key);
          const mostrarDropdown = dropdownAberto === pessoa._key && busca.trim().length >= 2;

          return (
            <div key={pessoa._key} style={{ position: "relative", marginBottom: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px",
                background: isPrincipal ? "#fef3c7" : "#f8fafc",
                borderRadius: 10,
                border: `1px solid ${isPrincipal ? "#fde68a" : "#e2e8f0"}`
              }}>
                {/* Icon */}
                <span style={{ fontSize: 16 }}>{isPrincipal ? "👑" : "👤"}</span>

                {/* Name or search input */}
                <div style={{ flex: 1, minWidth: 180 }}>
                  {pessoa.devedor_id ? (
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{pessoa.nome}</span>
                      {(() => {
                        const d = (devedores || []).find(dv => String(dv.id) === String(pessoa.devedor_id));
                        return d?.cpf_cnpj ? <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{d.cpf_cnpj}</span> : null;
                      })()}
                      <button
                        onClick={() => {
                          atualizarCampoLinha(pessoa._key, "devedor_id", null);
                          atualizarCampoLinha(pessoa._key, "nome", null);
                        }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "#64748b", marginLeft: 8 }}
                      >
                        trocar
                      </button>
                    </div>
                  ) : (
                    <input
                      value={busca}
                      onChange={e => { setBuscas(prev => ({ ...prev, [pessoa._key]: e.target.value })); setDropdownAberto(pessoa._key); }}
                      onFocus={() => setDropdownAberto(pessoa._key)}
                      onBlur={() => setTimeout(() => setDropdownAberto(null), 200)}
                      placeholder="Buscar por nome ou CPF..."
                      style={{ width: "100%", padding: "6px 10px", border: "1.5px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif" }}
                    />
                  )}
                </div>

                {/* Papel select */}
                <select
                  value={pessoa.papel}
                  onChange={e => atualizarCampoLinha(pessoa._key, "papel", e.target.value)}
                  style={{ width: 130, fontSize: 13, padding: "4px 6px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  {Object.entries(PAPEL_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>

                {/* Responsabilidade select */}
                <select
                  value={pessoa.responsabilidade}
                  onChange={e => atualizarCampoLinha(pessoa._key, "responsabilidade", e.target.value)}
                  style={{ width: 110, fontSize: 13, padding: "4px 6px", border: "1.5px solid #e2e8f0", borderRadius: 7, fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  {Object.entries(RESP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>

                {/* Remove button — co-devedores only (D-05) */}
                {!isPrincipal && (
                  <button
                    aria-label="Remover co-devedor"
                    onClick={() => removerLinha(pessoa._key)}
                    style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}
                  >✕</button>
                )}
              </div>

              {/* Busca dropdown (D-08) */}
              {mostrarDropdown && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,.10)", zIndex: 50, maxHeight: 240, overflowY: "auto" }}>
                  {resultados.map(d => (
                    <div
                      key={d.id}
                      onMouseDown={() => selecionarPessoa(pessoa._key, d)}
                      style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{d.nome}</span>
                      {d.cpf_cnpj && <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 6 }}>{d.cpf_cnpj}</span>}
                    </div>
                  ))}
                  {resultados.length === 0 && (
                    <div
                      onMouseDown={() => {
                        setContextoLinha(pessoa._key);
                        setModalNome(busca);
                        setShowModalCriar(true);
                        setDropdownAberto(null);
                      }}
                      style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", color: "#059669", fontWeight: 700 }}
                    >+ Criar "{busca}"</div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* + Adicionar co-devedor button (D-05) */}
        <div style={{ marginTop: 8 }}>
          <Btn outline color="#4f46e5" onClick={adicionarLinha}>+ Adicionar co-devedor</Btn>
        </div>
      </div>

      {/* Salvar / Cancelar buttons (D-07/D-08) */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
        <span title={!pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null) ? "Adicione pelo menos um devedor Principal" : undefined}>
          <Btn
            color="#059669"
            onClick={handleSalvar}
            disabled={!podesSalvar || salvando}
          >
            {salvando ? "Salvando..." : "Salvar Dívida"}
          </Btn>
        </span>
        <Btn outline color="#64748b" onClick={onVoltar}>Cancelar criação</Btn>
      </div>

      {/* Modal "Criar Pessoa Rápida" (D-03) */}
      {showModalCriar && (
        <Modal
          title="Criar Pessoa"
          onClose={() => { setShowModalCriar(false); setModalNome(""); setModalCpf(""); setModalTipo("PF"); }}
          width={480}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 }}>Nome *</label>
              <input
                value={modalNome}
                onChange={e => setModalNome(e.target.value)}
                placeholder="Nome completo"
                style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 }}>CPF / CNPJ</label>
                <input
                  value={modalCpf}
                  onChange={e => setModalCpf(e.target.value)}
                  placeholder="Opcional"
                  style={{ width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 }}>Tipo</label>
                <select
                  value={modalTipo}
                  onChange={e => setModalTipo(e.target.value)}
                  style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, fontFamily: "Plus Jakarta Sans, sans-serif" }}
                >
                  <option value="PF">PF</option>
                  <option value="PJ">PJ</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <Btn color="#059669" onClick={handleCriarPessoa} disabled={criandoPessoa}>
                {criandoPessoa ? "Criando..." : "Criar e Vincular"}
              </Btn>
              <Btn outline color="#64748b" onClick={() => { setShowModalCriar(false); setModalNome(""); setModalCpf(""); setModalTipo("PF"); }}>
                Cancelar
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
