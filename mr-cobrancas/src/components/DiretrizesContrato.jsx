import Art523Option from "./Art523Option.jsx";
import { Inp } from "./ui/Inp.jsx";
import { INDICE_OPTIONS, JUROS_OPTIONS, ULTIMA_COMPETENCIA_INDICES } from "../utils/correcao.js";

export default function DiretrizesContrato({ value, onChange }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
        📋 Diretrizes do Contrato
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Inp label="Índice" value={value.indexador} onChange={v => onChange("indexador", v)} options={INDICE_OPTIONS} />
        <Inp label="Data Início Atualização" value={value.data_inicio_atualizacao} onChange={v => onChange("data_inicio_atualizacao", v)} type="date" />
        <Inp label="Multa (%)" value={value.multa_pct} onChange={v => onChange("multa_pct", v)} type="number" />
        <Inp label="Taxa de Juros" value={value.juros_tipo} onChange={v => onChange("juros_tipo", v)} options={JUROS_OPTIONS} />
        <Inp label="Juros (% a.m.)" value={value.juros_am} onChange={v => onChange("juros_am", v)} type="number" disabled={value.juros_tipo !== "outros"} />
        <Inp label="Honorários (%)" value={value.honorarios_pct} onChange={v => onChange("honorarios_pct", v)} type="number" />
        <Inp label="Despesas (R$)" value={value.despesas} onChange={v => onChange("despesas", v)} type="number" />
      </div>
      <Art523Option value={value.art523_opcao || "nao_aplicar"} onChange={v => onChange("art523_opcao", v)} />
      {value.juros_tipo === "taxa_legal_406" && (
        <div style={{ marginTop: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
          <strong>ℹ️ Regime de aplicação — STJ Tema 1368 + Lei 14.905/2024:</strong><br />
          • Até 10/01/2003: 0,5% a.m. (6% a.a.) — Código Civil de 1916<br />
          • 11/01/2003 a 29/08/2024: SELIC (STJ Tema 1368)<br />
          • A partir de 30/08/2024: Taxa Legal = SELIC − IPCA (nunca negativa) — Lei 14.905/2024<br />
          O sistema aplicará automaticamente cada regime conforme o período entre o vencimento e a data de cálculo.
        </div>
      )}
      {value.juros_tipo === "taxa_legal_406_12" && (
        <div style={{ marginTop: 8, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#1e40af", lineHeight: 1.6 }}>
          <strong>⚖️ Regime simplificado — Lei 14.905/2024:</strong><br />
          • Até jul/2024: 1% a.m. (12% a.a.)<br />
          • A partir de ago/2024: Taxa Legal = SELIC − IPCA (mín 0) — Art. 406, §3º<br />
          Base: Art. 406 CC com redação dada pela Lei nº 14.905/2024.
        </div>
      )}
      {value.indexador === "inpc_ipca" && (
        <div style={{ marginTop: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 12px", fontSize: 11, color: "#065f46", lineHeight: 1.6 }}>
          <strong>📊 Correção com regime temporal — Lei 14.905/2024:</strong><br />
          • Até 29/08/2024: INPC acumulado<br />
          • A partir de 30/08/2024: IPCA acumulado<br />
          O sistema aplicará automaticamente cada índice conforme o período.
        </div>
      )}
      <p style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
        Base oficial carregada no app: IGP-M até {ULTIMA_COMPETENCIA_INDICES.igpm}, IPCA/INPC até {ULTIMA_COMPETENCIA_INDICES.ipca} e Selic até {ULTIMA_COMPETENCIA_INDICES.selic}.
      </p>
    </div>
  );
}
