import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  listar,
  buscar,
  criar,
  atualizar,
  excluir,
  adicionarDevedor,
  removerDevedor,
  listarDevedores,
  atualizarCitacao,
} from "../services/processosJudiciais.js";
import { calcularSaldoDevedorAtualizado } from "../utils/devedorCalc.js";
import { UFS } from "../utils/constants.js";

const fmt = (v) => "R$ " + Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

const STATUS_META = {
  ATIVO:      { bg: "#dcfce7", cor: "#166534" },
  SUSPENSO:   { bg: "#fef9c3", cor: "#854d0e" },
  ARQUIVADO:  { bg: "#f1f5f9", cor: "#475569" },
  EM_RECURSO: { bg: "#fef3c7", cor: "#92400e" },
  TRANSITADO: { bg: "#dbeafe", cor: "#1e3a8a" },
  EXTINTO:    { bg: "#fee2e2", cor: "#991b1b" },
};

const PAPEL_META = {
  REU_PRINCIPAL: { label: "Réu Principal",  bg: "#fee2e2", cor: "#991b1b" },
  REU:           { label: "Réu",            bg: "#fef3c7", cor: "#92400e" },
  SOLIDARIO:     { label: "Solidário",      bg: "#fef9c3", cor: "#854d0e" },
  SUBSIDIARIO:   { label: "Subsidiário",    bg: "#ede9fe", cor: "#4c1d95" },
  AVALISTA:      { label: "Avalista",       bg: "#dbeafe", cor: "#1e3a8a" },
  FIADOR:        { label: "Fiador",         bg: "#dcfce7", cor: "#166534" },
};

const FORM_NOVO_VAZIO = {
  titulo: "", numero_cnj: "", tipo_acao: "EXECUCAO", tribunal: "TJGO",
  vara: "", comarca: "Goiânia", uf: "GO", valor_causa: "",
  data_distribuicao: "", status: "ATIVO", credor_id: "", observacoes: "",
};

const FORM_VINCULAR_VAZIO = {
  devedorId: "", papel: "REU", dataCitacao: "", statusCitacao: "PENDENTE", observacao: "",
};

function BadgeStatus({ status }) {
  const m = STATUS_META[status] || { bg: "#f1f5f9", cor: "#475569" };
  return (
    <span style={{ background: m.bg, color: m.cor, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
      {status}
    </span>
  );
}

function BadgePapel({ papel }) {
  const m = PAPEL_META[papel] || PAPEL_META.REU;
  return (
    <span style={{ background: m.bg, color: m.cor, borderRadius: 99, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>
      {m.label}
    </span>
  );
}

export default function ProcessosJudiciais({ devedores = [], credores = [], pagamentos = [], hoje, onVerDevedor }) {
  const [processos, setProcessos] = useState([]);
  const [selectedProcesso, setSelectedProcesso] = useState(null);
  const [devedoresProcesso, setDevedoresProcesso] = useState([]);
  const [abaDetalhe, setAbaDetalhe] = useState("info");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [showModalNovo, setShowModalNovo] = useState(false);
  const [showModalVincular, setShowModalVincular] = useState(false);
  const [loading, setLoading] = useState(false);
  const [andamentosLocais, setAndamentosLocais] = useState([]);
  const [formAndamento, setFormAndamento] = useState({ tipo: "DESPACHO", descricao: "", prazo: "" });
  const [formNovo, setFormNovo] = useState({ ...FORM_NOVO_VAZIO });
  const [formVincular, setFormVincular] = useState({ ...FORM_VINCULAR_VAZIO });
  const [modoEdicao, setModoEdicao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [buscaVincular, setBuscaVincular] = useState("");

  const hj = hoje || new Date().toISOString().slice(0, 10);

  useEffect(() => {
    carregarProcessos();
  }, []);

  useEffect(() => {
    if (selectedProcesso) {
      carregarDevedoresProcesso(selectedProcesso.id);
      setAndamentosLocais([]);
    }
  }, [selectedProcesso?.id]);

  async function carregarProcessos() {
    setLoading(true);
    try {
      const rows = await listar({ status: filtroStatus, busca: filtroBusca });
      setProcessos(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error("Erro ao carregar processos: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDevedoresProcesso(processoId) {
    try {
      const rows = await listarDevedores(processoId);
      setDevedoresProcesso(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error("Erro ao carregar devedores do processo.");
    }
  }

  async function handleBuscar() {
    await carregarProcessos();
  }

  async function handleSalvarNovo() {
    if (!formNovo.titulo.trim()) {
      toast.error("Título é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      if (modoEdicao && selectedProcesso) {
        await atualizar(selectedProcesso.id, formNovo);
        const atualizado = await buscar(selectedProcesso.id);
        setSelectedProcesso(atualizado);
        toast.success("Processo atualizado.");
      } else {
        await criar(formNovo);
        toast.success("Processo criado.");
      }
      await carregarProcessos();
      setShowModalNovo(false);
      setModoEdicao(false);
      setFormNovo({ ...FORM_NOVO_VAZIO });
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(proc) {
    if (!window.confirm(`Excluir processo "${proc.titulo}"?`)) return;
    try {
      await excluir(proc.id);
      toast.success("Processo excluído.");
      if (selectedProcesso?.id === proc.id) setSelectedProcesso(null);
      await carregarProcessos();
    } catch (e) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  async function handleVincular() {
    if (!formVincular.devedorId) {
      toast.error("Selecione um devedor.");
      return;
    }
    setSalvando(true);
    try {
      await adicionarDevedor({
        processoId: selectedProcesso.id,
        devedorId: formVincular.devedorId,
        papel: formVincular.papel,
        dataCitacao: formVincular.dataCitacao || null,
        statusCitacao: formVincular.statusCitacao,
        observacao: formVincular.observacao,
      });
      toast.success("Devedor vinculado.");
      await carregarDevedoresProcesso(selectedProcesso.id);
      setShowModalVincular(false);
      setFormVincular({ ...FORM_VINCULAR_VAZIO });
      setBuscaVincular("");
    } catch (e) {
      toast.error("Erro ao vincular: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleRemoverDevedor(rowId) {
    if (!window.confirm("Remover devedor deste processo?")) return;
    try {
      await removerDevedor(rowId);
      toast.success("Devedor removido.");
      await carregarDevedoresProcesso(selectedProcesso.id);
    } catch (e) {
      toast.error("Erro ao remover: " + e.message);
    }
  }

  async function handleAtualizarCitacao(rowId, dados) {
    try {
      await atualizarCitacao(rowId, dados);
      await carregarDevedoresProcesso(selectedProcesso.id);
    } catch (e) {
      toast.error("Erro ao atualizar citação.");
    }
  }

  function handleRegistrarAndamento() {
    if (!formAndamento.descricao.trim()) {
      toast.error("Descrição obrigatória.");
      return;
    }
    const novo = {
      id: Date.now(),
      tipo: formAndamento.tipo,
      descricao: formAndamento.descricao,
      prazo: formAndamento.prazo,
      data: new Date().toLocaleDateString("pt-BR"),
    };
    setAndamentosLocais(prev => [novo, ...prev]);
    setFormAndamento({ tipo: "DESPACHO", descricao: "", prazo: "" });
    toast("Andamento registrado localmente — coluna processo_judicial_id pendente.", { icon: "ℹ️" });
  }

  // Filtro local
  const processosFiltrados = processos.filter(p => {
    const matchStatus = filtroStatus === "TODOS" || p.status === filtroStatus;
    const matchBusca = !filtroBusca || (p.titulo || "").toLowerCase().includes(filtroBusca.toLowerCase()) || (p.numero_cnj || "").includes(filtroBusca);
    return matchStatus && matchBusca;
  });

  const totalAtivos = processos.filter(p => p.status === "ATIVO").length;
  const totalRecurso = processos.filter(p => p.status === "EM_RECURSO").length;
  const totalArquivados = processos.filter(p => p.status === "ARQUIVADO").length;

  const idsVinculados = new Set(devedoresProcesso.map(r => String(r.devedor_id)));

  const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" };

  // ─── DETAIL VIEW ───────────────────────────────────────────────
  if (selectedProcesso) {
    const cr = credores.find(c => String(c.id) === String(selectedProcesso.credor_id));
    const tabs = [
      { id: "info", label: "Informações" },
      { id: "polo", label: "Polo Passivo" },
      { id: "dividas", label: "Dívidas" },
      { id: "andamentos", label: "Andamentos" },
      { id: "documentos", label: "Documentos" },
    ];

    // Tab Dívidas - calcular saldo por devedor do polo passivo
    const dividasData = devedoresProcesso.map(row => {
      const fullDev = devedores.find(d => String(d.id) === String(row.devedor_id));
      const pgtosDev = pagamentos.filter(p => String(p.devedor_id) === String(row.devedor_id));
      const saldo = fullDev ? calcularSaldoDevedorAtualizado(fullDev, pgtosDev, hj) : 0;
      const nDividas = (fullDev?.dividas || []).length;
      return { row, fullDev, saldo, nDividas };
    });
    const totalSaldo = dividasData.reduce((s, d) => s + d.saldo, 0);

    return (
      <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
          <button
            onClick={() => setSelectedProcesso(null)}
            style={{ background: "#f1f5f9", border: "none", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: 6 }}
          >
            ← Voltar
          </button>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 20, color: "#0f172a", margin: 0 }}>
              {selectedProcesso.titulo}
            </h2>
            {selectedProcesso.numero_cnj && (
              <p style={{ fontSize: 12, color: "#64748b", margin: "2px 0 0" }}>Nº CNJ: {selectedProcesso.numero_cnj}</p>
            )}
          </div>
          <BadgeStatus status={selectedProcesso.status} />
          <button
            onClick={() => {
              setFormNovo({ ...selectedProcesso, valor_causa: selectedProcesso.valor_causa || "", credor_id: selectedProcesso.credor_id || "" });
              setModoEdicao(true);
              setShowModalNovo(true);
            }}
            style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 9, padding: "7px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
          >
            ✏️ Editar
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #e2e8f0", marginBottom: 20 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setAbaDetalhe(t.id)}
              style={{
                background: "none", border: "none", borderBottom: abaDetalhe === t.id ? "2px solid #4f46e5" : "2px solid transparent",
                marginBottom: -2, padding: "8px 16px", cursor: "pointer",
                fontWeight: abaDetalhe === t.id ? 700 : 500,
                color: abaDetalhe === t.id ? "#4f46e5" : "#64748b",
                fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab: Informações */}
        {abaDetalhe === "info" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {[
                ["Nº CNJ", selectedProcesso.numero_cnj],
                ["Tipo de Ação", selectedProcesso.tipo_acao],
                ["Tribunal", selectedProcesso.tribunal],
                ["Vara", selectedProcesso.vara],
                ["Comarca", selectedProcesso.comarca],
                ["UF", selectedProcesso.uf],
                ["Valor da Causa", selectedProcesso.valor_causa ? fmt(selectedProcesso.valor_causa) : "—"],
                ["Data de Distribuição", selectedProcesso.data_distribuicao || "—"],
                ["Credor", cr?.nome || "—"],
                ["Status", selectedProcesso.status],
              ].map(([k, v]) => (
                <div key={k}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 3px" }}>{k}</p>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", margin: 0 }}>{v || "—"}</p>
                </div>
              ))}
              {selectedProcesso.observacoes && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 3px" }}>Observações</p>
                  <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>{selectedProcesso.observacoes}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Polo Passivo */}
        {abaDetalhe === "polo" && (
          <div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button
                onClick={() => { setFormVincular({ ...FORM_VINCULAR_VAZIO }); setBuscaVincular(""); setShowModalVincular(true); }}
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 9, padding: "8px 18px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
              >
                + Vincular Devedor
              </button>
            </div>
            {devedoresProcesso.length === 0 && (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Nenhum devedor vinculado.</p>
            )}
            {devedoresProcesso.map(row => {
              const dev = row.devedor || {};
              return (
                <div key={row.id} style={{ background: "#fafafe", borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", margin: 0 }}>{dev.nome || `Devedor #${row.devedor_id}`}</p>
                      {dev.cpf_cnpj && <p style={{ fontSize: 11, color: "#94a3b8", margin: "2px 0 0" }}>{dev.cpf_cnpj}</p>}
                    </div>
                    <BadgePapel papel={row.papel} />
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <select
                        value={row.status_citacao || "PENDENTE"}
                        onChange={e => handleAtualizarCitacao(row.id, { ...row, status_citacao: e.target.value })}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 7, border: "1px solid #e2e8f0", background: "#fff" }}
                      >
                        {["PENDENTE", "CITADO", "AR_NEGATIVO", "EDITAL", "DESISTIDO"].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="date"
                        value={row.data_citacao || ""}
                        onChange={e => handleAtualizarCitacao(row.id, { ...row, data_citacao: e.target.value })}
                        style={{ fontSize: 11, padding: "3px 8px", borderRadius: 7, border: "1px solid #e2e8f0" }}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {onVerDevedor && (
                        <button
                          onClick={() => onVerDevedor(row.devedor_id)}
                          style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 7, padding: "5px 11px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                        >
                          Ver
                        </button>
                      )}
                      {dev.telefone && (
                        <a
                          href={`tel:${dev.telefone}`}
                          style={{ background: "#dbeafe", color: "#1e40af", borderRadius: 7, padding: "5px 11px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                        >
                          📞
                        </a>
                      )}
                      {dev.telefone && (
                        <a
                          href={`https://wa.me/55${(dev.telefone || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ background: "#dcfce7", color: "#16a34a", borderRadius: 7, padding: "5px 11px", fontSize: 11, fontWeight: 700, textDecoration: "none" }}
                        >
                          WA
                        </a>
                      )}
                      <button
                        onClick={() => handleRemoverDevedor(row.id)}
                        style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab: Dívidas */}
        {abaDetalhe === "dividas" && (
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            {dividasData.length === 0 && (
              <p style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                Nenhum devedor no polo passivo.
              </p>
            )}
            {dividasData.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f1f5f9" }}>
                    {["Devedor", "Papel", "Nº Dívidas", "Saldo Atualizado", "Ações"].map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dividasData.map(({ row, fullDev, saldo, nDividas }) => (
                    <tr key={row.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 14px", fontWeight: 600, fontSize: 13, color: "#0f172a" }}>
                        {fullDev?.nome || row.devedor?.nome || `#${row.devedor_id}`}
                      </td>
                      <td style={{ padding: "10px 14px" }}><BadgePapel papel={row.papel} /></td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: "#475569" }}>{nDividas}</td>
                      <td style={{ padding: "10px 14px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, color: "#4f46e5", fontSize: 14 }}>
                        {fmt(saldo)}
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        {onVerDevedor && (
                          <button
                            onClick={() => onVerDevedor(row.devedor_id)}
                            style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                          >
                            Ver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0" }}>
                    <td colSpan={3} style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: "#475569" }}>Total</td>
                    <td style={{ padding: "10px 14px", fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, color: "#4f46e5", fontSize: 15 }}>{fmt(totalSaldo)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {/* Tab: Andamentos */}
        {abaDetalhe === "andamentos" && (
          <div>
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400e" }}>
              ℹ️ Andamentos salvos localmente — coluna processo_judicial_id pendente no banco.
            </div>
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #e2e8f0", marginBottom: 16 }}>
              <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 12 }}>Registrar Andamento</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={labelStyle}>Tipo</label>
                  <select value={formAndamento.tipo} onChange={e => setFormAndamento(f => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                    {["INICIAL", "DESPACHO", "DECISAO", "SENTENCA", "RECURSO", "PENHORA", "LEILAO", "OUTROS"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Próximo Prazo</label>
                  <input type="date" value={formAndamento.prazo} onChange={e => setFormAndamento(f => ({ ...f, prazo: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  value={formAndamento.descricao}
                  onChange={e => setFormAndamento(f => ({ ...f, descricao: e.target.value }))}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <button
                onClick={handleRegistrarAndamento}
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 9, padding: "9px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
              >
                Registrar
              </button>
            </div>
            {andamentosLocais.length === 0 && (
              <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Nenhum andamento registrado.</p>
            )}
            {andamentosLocais.map(a => (
              <div key={a.id} style={{ background: "#fafafe", borderRadius: 10, padding: "12px 16px", border: "1px solid #e2e8f0", marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "2px 9px", fontSize: 10, fontWeight: 700 }}>{a.tipo}</span>
                  <span style={{ fontSize: 11, color: "#94a3b8" }}>{a.data}</span>
                  {a.prazo && <span style={{ fontSize: 11, color: "#b45309" }}>Prazo: {a.prazo}</span>}
                </div>
                <p style={{ fontSize: 13, color: "#334155", margin: 0 }}>{a.descricao}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tab: Documentos */}
        {abaDetalhe === "documentos" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 32, border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#94a3b8", margin: 0 }}>Em breve: upload de documentos processuais.</p>
          </div>
        )}

        {/* Modal Editar (reusa Modal Novo) */}
        {showModalNovo && (
          <ModalNovoProcesso
            form={formNovo}
            setForm={setFormNovo}
            credores={credores}
            salvando={salvando}
            modoEdicao={modoEdicao}
            onSalvar={handleSalvarNovo}
            onClose={() => { setShowModalNovo(false); setModoEdicao(false); setFormNovo({ ...FORM_NOVO_VAZIO }); }}
          />
        )}

        {/* Modal Vincular Devedor */}
        {showModalVincular && (
          <ModalVincularDevedor
            devedores={devedores}
            idsVinculados={idsVinculados}
            form={formVincular}
            setForm={setFormVincular}
            busca={buscaVincular}
            setBusca={setBuscaVincular}
            salvando={salvando}
            onVincular={handleVincular}
            onClose={() => { setShowModalVincular(false); setFormVincular({ ...FORM_VINCULAR_VAZIO }); setBuscaVincular(""); }}
          />
        )}
      </div>
    );
  }

  // ─── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1100, margin: "0 auto", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 22, color: "#0f172a", margin: 0 }}>⚖️ Processos Judiciais</h2>
          <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Gestão de processos e polo passivo</p>
        </div>
        <button
          onClick={() => { setFormNovo({ ...FORM_NOVO_VAZIO }); setModoEdicao(false); setShowModalNovo(true); }}
          style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}
        >
          + Novo Processo
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Total", value: processos.length, bg: "#f8fafc", cor: "#0f172a" },
          { label: "Ativos", value: totalAtivos, bg: "#dcfce7", cor: "#166534" },
          { label: "Em Recurso", value: totalRecurso, bg: "#fef3c7", cor: "#92400e" },
          { label: "Arquivados", value: totalArquivados, bg: "#f1f5f9", cor: "#475569" },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: "14px 18px", border: "1px solid #e2e8f0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", margin: "0 0 4px" }}>{c.label}</p>
            <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 24, fontWeight: 800, color: c.cor, margin: 0 }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          style={{ padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
        >
          <option value="TODOS">Todos os status</option>
          {["ATIVO", "SUSPENSO", "ARQUIVADO", "EM_RECURSO", "TRANSITADO", "EXTINTO"].map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input
          value={filtroBusca}
          onChange={e => setFiltroBusca(e.target.value)}
          placeholder="Buscar por título ou Nº CNJ..."
          style={{ flex: 1, padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
        />
        <button
          onClick={handleBuscar}
          style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}
        >
          Buscar
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>Carregando...</p>
      ) : (
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {["Nº CNJ", "Título", "Tipo", "Tribunal", "Valor da Causa", "Status", "Ações"].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processosFiltrados.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                    Nenhum processo cadastrado.
                  </td>
                </tr>
              )}
              {processosFiltrados.map(p => {
                const cr = credores.find(c => String(c.id) === String(p.credor_id));
                return (
                  <tr key={p.id} style={{ borderTop: "1px solid #f8fafc", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafe"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, color: "#475569" }}>{p.numero_cnj || "—"}</td>
                    <td style={{ padding: "10px 14px", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{p.titulo}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{p.tipo_acao || "—"}</td>
                    <td style={{ padding: "10px 14px", fontSize: 12, color: "#64748b" }}>{p.tribunal || "—"}</td>
                    <td style={{ padding: "10px 14px", fontFamily: "'Space Grotesk',sans-serif", fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>
                      {p.valor_causa ? fmt(p.valor_causa) : "—"}
                    </td>
                    <td style={{ padding: "10px 14px" }}><BadgeStatus status={p.status} /></td>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={() => { setSelectedProcesso(p); setAbaDetalhe("info"); }}
                          style={{ background: "#ede9fe", color: "#4f46e5", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                        >
                          Abrir
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); handleExcluir(p); }}
                          style={{ background: "transparent", color: "#dc2626", border: "1px solid #dc2626", borderRadius: 7, padding: "5px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Processo */}
      {showModalNovo && (
        <ModalNovoProcesso
          form={formNovo}
          setForm={setFormNovo}
          credores={credores}
          salvando={salvando}
          modoEdicao={false}
          onSalvar={handleSalvarNovo}
          onClose={() => { setShowModalNovo(false); setFormNovo({ ...FORM_NOVO_VAZIO }); }}
        />
      )}
    </div>
  );
}

function ModalNovoProcesso({ form, setForm, credores, salvando, modoEdicao, onSalvar, onClose }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.2)", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 17, color: "#0f172a", margin: 0 }}>
            {modoEdicao ? "Editar Processo" : "+ Novo Processo"}
          </p>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Título *</label>
          <input value={form.titulo} onChange={e => F("titulo", e.target.value)} placeholder="Ex: Execução de Título Extrajudicial" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Nº CNJ</label>
            <input value={form.numero_cnj || ""} onChange={e => F("numero_cnj", e.target.value)} placeholder="0000000-00.0000.0.00.0000" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tipo de Ação</label>
            <select value={form.tipo_acao || "EXECUCAO"} onChange={e => F("tipo_acao", e.target.value)} style={inputStyle}>
              {["EXECUCAO", "COBRANCA", "MONITORIA", "CAUTELAR", "EMBARGOS", "OUTRO"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tribunal</label>
            <select value={form.tribunal || "TJGO"} onChange={e => F("tribunal", e.target.value)} style={inputStyle}>
              {["TJGO", "TJSP", "TJRJ", "TRF1", "STJ", "STF", "OUTRO"].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Vara</label>
            <input value={form.vara || ""} onChange={e => F("vara", e.target.value)} placeholder="Ex: 3ª Vara Cível" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Comarca</label>
            <input value={form.comarca || ""} onChange={e => F("comarca", e.target.value)} placeholder="Ex: Goiânia" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>UF</label>
            <select value={form.uf || "GO"} onChange={e => F("uf", e.target.value)} style={inputStyle}>
              {UFS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Valor da Causa</label>
            <input type="number" value={form.valor_causa || ""} onChange={e => F("valor_causa", e.target.value)} placeholder="0.00" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Data de Distribuição</label>
            <input type="date" value={form.data_distribuicao || ""} onChange={e => F("data_distribuicao", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status || "ATIVO"} onChange={e => F("status", e.target.value)} style={inputStyle}>
              {["ATIVO", "SUSPENSO", "ARQUIVADO", "EM_RECURSO", "TRANSITADO", "EXTINTO"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Credor</label>
            <select value={form.credor_id || ""} onChange={e => F("credor_id", e.target.value)} style={inputStyle}>
              <option value="">— Selecionar —</option>
              {credores.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Observações</label>
          <textarea value={form.observacoes || ""} onChange={e => F("observacoes", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onSalvar}
            disabled={salvando}
            style={{ flex: 1, padding: "11px", background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "'Plus Jakarta Sans',sans-serif" }}
          >
            {salvando ? "Salvando..." : (modoEdicao ? "Atualizar" : "Salvar")}
          </button>
          <button onClick={onClose} style={{ padding: "11px 18px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#64748b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalVincularDevedor({ devedores, idsVinculados, form, setForm, busca, setBusca, salvando, onVincular, onClose }) {
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [selecionado, setSelecionado] = useState(null);
  const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "'Plus Jakarta Sans',sans-serif" };
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" };

  const resultados = busca.trim().length >= 2
    ? devedores.filter(d => !idsVinculados.has(String(d.id)) && ((d.nome || "").toLowerCase().includes(busca.toLowerCase()) || (d.cpf_cnpj || "").includes(busca))).slice(0, 8)
    : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,.2)", fontFamily: "'Plus Jakarta Sans',sans-serif", padding: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 800, fontSize: 17, color: "#0f172a", margin: 0 }}>Vincular Devedor ao Processo</p>
          <button onClick={onClose} style={{ background: "#f1f5f9", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "#64748b" }}>✕</button>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Buscar Devedor</label>
          <input value={busca} onChange={e => { setBusca(e.target.value); setSelecionado(null); F("devedorId", ""); }} placeholder="Digite ao menos 2 caracteres..." autoFocus style={inputStyle} />
          {resultados.length > 0 && !selecionado && (
            <div style={{ border: "1px solid #e2e8f0", borderRadius: 9, marginTop: 4, overflow: "hidden", maxHeight: 200, overflowY: "auto" }}>
              {resultados.map(d => (
                <button key={d.id} onClick={() => { setSelecionado(d); setBusca(d.nome); F("devedorId", d.id); }}
                  style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 13px", background: "#fafafe", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13, fontFamily: "'Plus Jakarta Sans',sans-serif", color: "#0f172a" }}>
                  <b>{d.nome}</b>{d.cpf_cnpj && <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 8 }}>{d.cpf_cnpj}</span>}
                </button>
              ))}
            </div>
          )}
          {selecionado && <p style={{ marginTop: 6, fontSize: 12, color: "#059669", fontWeight: 700 }}>Selecionado: {selecionado.nome}</p>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Papel</label>
            <select value={form.papel} onChange={e => F("papel", e.target.value)} style={inputStyle}>
              {["REU_PRINCIPAL", "REU", "SOLIDARIO", "SUBSIDIARIO", "AVALISTA", "FIADOR"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Status Citação</label>
            <select value={form.statusCitacao} onChange={e => F("statusCitacao", e.target.value)} style={inputStyle}>
              {["PENDENTE", "CITADO", "AR_NEGATIVO", "EDITAL", "DESISTIDO"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Data de Citação</label>
            <input type="date" value={form.dataCitacao || ""} onChange={e => F("dataCitacao", e.target.value)} style={inputStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Observação</label>
            <textarea value={form.observacao || ""} onChange={e => F("observacao", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onVincular} disabled={!form.devedorId || salvando}
            style={{ flex: 1, padding: "11px", background: form.devedorId ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#e2e8f0", color: form.devedorId ? "#fff" : "#94a3b8", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: form.devedorId ? "pointer" : "not-allowed", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            {salvando ? "Salvando..." : "Vincular"}
          </button>
          <button onClick={onClose} style={{ padding: "11px 18px", background: "transparent", border: "1.5px solid #e2e8f0", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#64748b", fontFamily: "'Plus Jakarta Sans',sans-serif" }}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
