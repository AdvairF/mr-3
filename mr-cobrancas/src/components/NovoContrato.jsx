import { useState } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import { criarContratoComParcelas } from "../services/contratos.js";
import DiretrizesContrato from "./DiretrizesContrato.jsx";
import { fmt } from "../utils/formatters.js";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" };

const FORM_VAZIO = {
  tipo: "NF/Duplicata",
  credor_id: null,
  devedor_id: null,
  devedor_nome: null,
  valor_total: "",
  data_inicio: "",
  num_parcelas: "",
  primeira_parcela_na_data_base: true,
  referencia: "",
  indexador: "igpm",
  data_inicio_atualizacao: "",
  multa_pct: "0",
  juros_tipo: "fixo_1",
  juros_am: "0",
  honorarios_pct: "0",
  despesas: "0",
  art523_opcao: "nao_aplicar",
  custas: [],
};

export default function NovoContrato({ devedores, credores, onCarregarTudo, onVoltar, devedorPreSelecionado }) {
  const [form, setForm] = useState({
    ...FORM_VAZIO,
    devedor_id: devedorPreSelecionado?.id ?? null,
    devedor_nome: devedorPreSelecionado?.nome ?? null,
  });
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState(devedorPreSelecionado?.nome ?? "");
  const [dropdownAberto, setDropdownAberto] = useState(false);

  function resultadosBusca() {
    if (busca.trim().length < 2) return [];
    return (devedores || [])
      .filter(d => (d.nome || "").toLowerCase().includes(busca.toLowerCase()) || (d.cpf_cnpj || "").includes(busca))
      .slice(0, 8);
  }

  const podesSalvar =
    !!form.devedor_id &&
    !!form.valor_total && parseFloat(form.valor_total) > 0 &&
    !!form.data_inicio &&
    !!form.num_parcelas && parseInt(form.num_parcelas) >= 1;

  async function handleSalvar() {
    if (!form.valor_total || parseFloat(form.valor_total) <= 0) { toast("Informe o valor total.", { icon: "⚠️" }); return; }
    if (!form.data_inicio) { toast("Informe a data base.", { icon: "⚠️" }); return; }
    if (!form.num_parcelas || parseInt(form.num_parcelas) < 1) { toast("Informe o número de parcelas.", { icon: "⚠️" }); return; }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo,
        credor_id: form.credor_id || null,
        devedor_id: form.devedor_id,
        valor_total: parseFloat(form.valor_total),
        data_inicio: form.data_inicio,
        num_parcelas: parseInt(form.num_parcelas),
        primeira_parcela_na_data_base: form.primeira_parcela_na_data_base,
        referencia: form.referencia || null,
        indice_correcao:         form.indexador || "igpm",
        data_inicio_atualizacao: form.data_inicio_atualizacao || null,
        multa_percentual:        parseFloat(form.multa_pct) || 0,
        juros_tipo:              form.juros_tipo || "fixo_1",
        juros_am_percentual:     parseFloat(form.juros_am) || 0,
        honorarios_percentual:   parseFloat(form.honorarios_pct) || 0,
        despesas:                parseFloat(form.despesas) || 0,
        art523_opcao:            form.art523_opcao || "nao_aplicar",
        custas:                  form.custas || [],
      };
      const { parcelas } = await criarContratoComParcelas(payload);
      await onCarregarTudo();
      toast.success(`Contrato criado com ${parcelas.length} parcelas`);
      onVoltar();
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

      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 20px", border: "1px solid #e8f0f7", marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Campo 1: Tipo */}
          <div>
            <label style={labelStyle}>Tipo</label>
            <select
              value={form.tipo}
              onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              style={inputStyle}
            >
              <option value="NF/Duplicata">NF/Duplicata</option>
              <option value="Compra e Venda">Compra e Venda</option>
              <option value="Empréstimo">Empréstimo</option>
            </select>
          </div>

          {/* Campo 2: Credor (opcional) */}
          <div>
            <label style={labelStyle}>Credor</label>
            <select
              value={form.credor_id ?? ""}
              onChange={e => setForm(f => ({ ...f, credor_id: e.target.value || null }))}
              style={inputStyle}
            >
              <option value="">— Sem credor</option>
              {(credores || []).map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Campo 3: Devedor typeahead */}
          <div style={{ position: "relative" }}>
            <label style={labelStyle}>Devedor *</label>
            <input
              type="text"
              placeholder="Buscar devedor (mín. 2 caracteres)..."
              value={busca}
              style={inputStyle}
              onChange={e => {
                setBusca(e.target.value);
                if (!e.target.value) setForm(f => ({ ...f, devedor_id: null, devedor_nome: null }));
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
                    onMouseDown={() => {
                      setForm(f => ({ ...f, devedor_id: d.id, devedor_nome: d.nome }));
                      setBusca(d.nome);
                      setDropdownAberto(false);
                    }}
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
            {form.devedor_id && (
              <p style={{ fontSize: 11, color: "#0d9488", fontWeight: 700, marginTop: 3 }}>
                Devedor selecionado: {form.devedor_nome}
              </p>
            )}
          </div>

          {/* Campo 4: Valor Total */}
          <div>
            <label style={labelStyle}>Valor Total (R$) *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={form.valor_total}
              onChange={e => setForm(f => ({ ...f, valor_total: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Campo 5: Data Base */}
          <div>
            <label style={labelStyle}>Data Base *</label>
            <input
              type="date"
              value={form.data_inicio}
              onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
              style={inputStyle}
            />
          </div>

          {/* Campo 6: Nº de Parcelas + preview */}
          <div>
            <label style={labelStyle}>Nº de Parcelas *</label>
            <input
              type="number"
              min="1"
              max="360"
              placeholder="Ex.: 12"
              value={form.num_parcelas}
              onChange={e => setForm(f => ({ ...f, num_parcelas: e.target.value }))}
              style={inputStyle}
            />
            {form.valor_total && form.num_parcelas && (() => {
              const vt = parseFloat(form.valor_total) || 0;
              const n = parseInt(form.num_parcelas) || 1;
              if (vt <= 0 || n < 1) return null;
              const base = Math.floor((vt / n) * 100) / 100;
              const ultima = parseFloat((vt - base * (n - 1)).toFixed(2));
              return (
                <p style={{ fontSize: 12, color: "#64748b", fontStyle: "italic", marginTop: 4 }}>
                  {n} parcelas de {fmtBRL(base)} (última: {fmtBRL(ultima)})
                </p>
              );
            })()}
          </div>

          {/* Campo 7: Vencimento da 1ª Parcela */}
          <div>
            <label style={labelStyle}>Vencimento da 1ª Parcela</label>
            <select
              value={form.primeira_parcela_na_data_base ? "true" : "false"}
              onChange={e => setForm(f => ({ ...f, primeira_parcela_na_data_base: e.target.value === "true" }))}
              style={inputStyle}
            >
              <option value="true">Mesma data base (NF/Duplicata)</option>
              <option value="false">Um mês depois da data base (Compra e Venda / Empréstimo)</option>
            </select>
          </div>

          {/* Campo 8: Referência (opcional) */}
          <div>
            <label style={labelStyle}>Referência</label>
            <input
              type="text"
              placeholder="Ex.: NF 1234 — opcional"
              value={form.referencia}
              onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
              style={inputStyle}
            />
          </div>

        </div>
      </div>

      <DiretrizesContrato
        value={form}
        onChange={(campo, v) => setForm(f => ({ ...f, [campo]: v }))}
      />

      <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: 12, marginTop: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: ".05em" }}>
            🏛 Custas Judiciais <span style={{ fontWeight: 400, color: "#9a3412" }}>(só correção monetária, sem juros)</span>
          </p>
          <button
            onClick={() => setForm(f => ({ ...f, custas: [...(f.custas || []), { id: Date.now(), descricao: "", valor: "", data: "" }] }))}
            style={{ background: "#c2410c", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
          >+ Custa</button>
        </div>
        {(form.custas || []).map((c, ci) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input placeholder="Descrição" value={c.descricao}
              onChange={e => setForm(f => ({ ...f, custas: f.custas.map((x, xi) => xi === ci ? { ...x, descricao: e.target.value } : x) }))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none", fontFamily: "Plus Jakarta Sans" }} />
            <input type="number" placeholder="Valor (R$)" value={c.valor}
              onChange={e => setForm(f => ({ ...f, custas: f.custas.map((x, xi) => xi === ci ? { ...x, valor: e.target.value } : x) }))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none", fontFamily: "Plus Jakarta Sans" }} />
            <input type="date" value={c.data}
              onChange={e => setForm(f => ({ ...f, custas: f.custas.map((x, xi) => xi === ci ? { ...x, data: e.target.value } : x) }))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none" }} />
            <button onClick={() => setForm(f => ({ ...f, custas: f.custas.filter((_, xi) => xi !== ci) }))}
              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 7px", cursor: "pointer", fontSize: 11 }}>✕</button>
          </div>
        ))}
        {(form.custas || []).length === 0 && (
          <p style={{ fontSize: 11, color: "#c2410c", opacity: 0.6 }}>Nenhuma custa lançada. Clique em "+ Custa" para adicionar.</p>
        )}
        {(form.custas || []).length > 0 && (
          <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 6, marginTop: 4, fontSize: 11, color: "#c2410c", fontWeight: 700, textAlign: "right" }}>
            Total custas: {fmt((form.custas || []).reduce((s, c) => s + (parseFloat(c.valor) || 0), 0))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span title={!form.devedor_id ? "Selecione o devedor" : undefined}>
          <Btn color="#0d9488" onClick={handleSalvar} disabled={!podesSalvar || salvando}>
            {salvando ? "Criando contrato..." : "Criar Contrato"}
          </Btn>
        </span>
        <Btn outline color="#64748b" onClick={onVoltar}>Cancelar criação</Btn>
      </div>
    </div>
  );
}
