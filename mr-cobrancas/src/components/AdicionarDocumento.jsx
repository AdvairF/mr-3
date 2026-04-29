import { useState } from "react";
import toast from "react-hot-toast";
import Btn from "./ui/Btn.jsx";
import InputBR from "./ui/InputBR.jsx";
import DiretrizesContrato from "./DiretrizesContrato.jsx";
import TabelaParcelasEditaveis from "./TabelaParcelasEditaveis.jsx";
import { adicionarDocumento } from "../services/contratos.js";
// Phase 7.8.2a — D-05 enforcement (caller #6 do cache SWR de listagem)
import { invalidateContrato } from "../hooks/useSaldoAtualizadoCache.js";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const labelStyle = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em", display: "block", marginBottom: 4 };
const inputStyle = { width: "100%", padding: "8px 12px", border: "1.5px solid #e2e8f0", borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "Plus Jakarta Sans, sans-serif", boxSizing: "border-box" };

export default function AdicionarDocumento({ contrato, onDocumentoAdicionado, onCancelar }) {
  const [tipo, setTipo] = useState("NF/Duplicata");
  const [numeroDoc, setNumeroDoc] = useState("");
  const [valor, setValor] = useState("");
  const [dataEmissao, setDataEmissao] = useState("");
  const [numParcelas, setNumParcelas] = useState("");
  const [parcelasCustom, setParcelasCustom] = useState(null); // Phase 7.5 D-03 — null até valor+N preenchidos; Array<{numero,valor_total,data_vencimento}> depois
  const [salvando, setSalvando] = useState(false);

  // D-pre-5 — fallbacks alinhados com Path E (5 críticos vazios, 2 semânticos mantidos)
  const [encargos, setEncargos] = useState({
    indexador:               contrato.indice_correcao         ?? "",
    data_inicio_atualizacao: contrato.data_inicio_atualizacao ?? "",
    multa_pct:               String(contrato.multa_percentual    ?? ""),
    juros_tipo:              contrato.juros_tipo               ?? "",
    juros_am:                String(contrato.juros_am_percentual ?? ""),
    honorarios_pct:          String(contrato.honorarios_percentual ?? ""),
    despesas:                String(contrato.despesas           ?? "0"),         // semântico mantido
    art523_opcao:            contrato.art523_opcao             ?? "nao_aplicar", // semântico mantido
  });

  // D-pre-3 — 5 campos críticos + condicional juros_am quando juros_tipo === "outros"
  const camposCriticosOk =
    !!encargos.indexador &&
    !!encargos.multa_pct &&
    !!encargos.juros_tipo &&
    !!encargos.honorarios_pct &&
    (encargos.juros_tipo !== "outros" || !!encargos.juros_am);

  const podesSalvar =
    !!tipo &&
    !!valor && parseFloat(valor) > 0 &&
    !!dataEmissao &&
    !!numParcelas && parseInt(numParcelas) >= 1 && parseInt(numParcelas) <= 999 &&
    Array.isArray(parcelasCustom) && parcelasCustom.length === parseInt(numParcelas) &&
    camposCriticosOk;

  function handleEncargos(field, val) {
    setEncargos(e => ({ ...e, [field]: val }));
  }

  // Phase 7.5 D-03: gera parcelas iniciais quando valor + N preenchidos.
  // Mantém o padrão de gerarPayloadParcelasDocumento (últ. parcela recebe o resto, D-06).
  const parcelasIniciais = (() => {
    const vt = parseFloat(valor) || 0;
    const n = parseInt(numParcelas) || 0;
    if (vt <= 0 || n < 1) return null;
    const base = Math.floor((vt / n) * 100) / 100;
    const ultima = parseFloat((vt - base * (n - 1)).toFixed(2));
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      valor_total: i < n - 1 ? base : ultima,
      data_vencimento: "",
    }));
  })();

  async function handleSalvar() {
    if (!valor || parseFloat(valor) <= 0) { toast("Informe o valor do documento.", { icon: "⚠️" }); return; }
    if (!dataEmissao) { toast("Informe a data de emissão.", { icon: "⚠️" }); return; }
    if (!numParcelas || parseInt(numParcelas) < 1) { toast("Informe o número de parcelas.", { icon: "⚠️" }); return; }
    if (parseInt(numParcelas) > 999) { toast.error("Número de parcelas máximo é 999 (limite prático para empréstimos imobiliários de até 35 anos)."); return; }
    if (!camposCriticosOk) {
      toast.error("Preencha todos os encargos antes de salvar.");
      return;
    }

    // Validação parcelas (Phase 7.5 D-07 — redundância; tabela também valida via onChange)
    if (!Array.isArray(parcelasCustom) || parcelasCustom.length !== parseInt(numParcelas)) {
      toast("Preencha a tabela de parcelas.", { icon: "⚠️" });
      return;
    }
    const somaParcelas = parcelasCustom.reduce((s, p) => s + Number(p.valor_total || 0), 0);
    if (Math.abs(somaParcelas - parseFloat(valor)) > 0.01) {
      toast.error(`Soma das parcelas (R$ ${somaParcelas.toFixed(2)}) não bate com valor do documento (R$ ${parseFloat(valor).toFixed(2)}).`);
      return;
    }
    for (const p of parcelasCustom) {
      if (!p.data_vencimento) {
        toast.error("Todas as parcelas devem ter data de vencimento preenchida.");
        return;
      }
    }

    setSalvando(true);
    try {
      const documentoPayload = {
        tipo,
        numero_doc: numeroDoc.trim() || null,
        valor: parseFloat(valor),
        data_emissao: dataEmissao,
        num_parcelas: parseInt(numParcelas),
        primeira_parcela_na_data_base: true,  // Phase 7.5: default schema; parcelasCustom domina data_vencimento real (D-03)
        indice_correcao:         encargos.indexador || null,
        juros_tipo:              encargos.juros_tipo || null,
        juros_am_percentual:     parseFloat(encargos.juros_am) || 0,
        multa_percentual:        parseFloat(encargos.multa_pct) || 0,
        honorarios_percentual:   parseFloat(encargos.honorarios_pct) || 0,
        despesas:                parseFloat(encargos.despesas) || 0,
        art523_opcao:            encargos.art523_opcao || "nao_aplicar",
        data_inicio_atualizacao: encargos.data_inicio_atualizacao || null,
      };
      const result = await adicionarDocumento(contrato.id, documentoPayload, contrato, parcelasCustom);
      invalidateContrato(contrato.id); // Phase 7.8.2a D-05 — antes do toast.success
      toast.success(`Documento adicionado com ${result.parcelas.length} parcelas`);
      onDocumentoAdicionado(result);
    } catch (e) {
      toast.error("Erro ao adicionar documento: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e8f0f7", borderRadius: 12, padding: "16px 20px", marginTop: 12 }}>
      <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>
        Novo Documento
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Campo 1: Tipo */}
        <div>
          <label style={labelStyle}>Tipo *</label>
          <select value={tipo} onChange={e => setTipo(e.target.value)} style={inputStyle}>
            <option value="NF/Duplicata">NF/Duplicata</option>
            <option value="Compra e Venda">Compra e Venda</option>
            <option value="Empréstimo">Empréstimo</option>
          </select>
        </div>

        {/* Campo 2: Número do Documento (opcional) */}
        <div>
          <label style={labelStyle}>Número do Documento</label>
          <input
            type="text"
            placeholder="Ex.: NF 001, NF 2024/123 (opcional)"
            value={numeroDoc}
            onChange={e => setNumeroDoc(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Campo 3: Valor */}
        <div>
          <label style={labelStyle}>Valor (R$) *</label>
          <InputBR
            type="value"
            min="0.01"
            step="0.01"
            placeholder="0,00"
            value={valor}
            onChange={setValor}
            style={inputStyle}
          />
        </div>

        {/* Campo 4: Data de Emissão */}
        <div>
          <label style={labelStyle}>Data de Emissão *</label>
          <InputBR
            type="date"
            value={dataEmissao}
            onChange={setDataEmissao}
            style={inputStyle}
          />
        </div>

        {/* Campo 5: Nº de Parcelas (Phase 7.5 D-03) */}
        <div>
          <label style={labelStyle}>Nº de Parcelas *</label>
          <InputBR
            type="value"
            min="1"
            max="999"
            placeholder="Ex.: 3"
            value={numParcelas}
            onChange={v => { setNumParcelas(v); setParcelasCustom(null); }}
            style={inputStyle}
          />
        </div>

        {/* Campo 6: Tabela editável de parcelas (Phase 7.5 D-03 — substitui Vencimento 1ª Parcela) */}
        {parcelasIniciais && (
          <TabelaParcelasEditaveis
            key={numParcelas}
            valorTotal={parseFloat(valor) || 0}
            parcelasIniciais={parcelasIniciais}
            modoEdicao="create"
            dividasComPagamentoIds={new Set()}
            onChange={setParcelasCustom}
            onSubmit={async () => {}}
            onCancel={() => {}}
            hideFooter
          />
        )}

        {/* Campo 7: Encargos do Documento (herdados do contrato — D-05) */}
        <div>
          <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>
            Encargos do Documento
          </p>
          <p style={{ fontSize: 11, color: "#64748b", fontStyle: "italic", marginBottom: 8 }}>
            Herdados do contrato — edite se este documento tiver condições diferentes
          </p>
          <DiretrizesContrato value={encargos} onChange={handleEncargos} />
        </div>

      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16 }}>
        <Btn color="#0d9488" onClick={handleSalvar} disabled={!podesSalvar || salvando}>
          {salvando ? "Adicionando documento..." : "Adicionar Documento"}
        </Btn>
        <button
          onClick={onCancelar}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748b", fontWeight: 700, padding: 0 }}
        >
          Cancelar documento
        </button>
      </div>
    </div>
  );
}
