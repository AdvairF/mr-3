import { Inp } from "./ui/Inp.jsx";
import Btn from "./ui/Btn.jsx";
import { fmt } from "../utils/formatters.js";
import DiretrizesContrato from "./DiretrizesContrato.jsx";

/**
 * DividaForm — stateless controlled component for dívida financial fields.
 *
 * Props:
 *   value               — object shaped like { ...DIVIDA_VAZIA, credor_id, art523_opcao }
 *   onChange(campo, v)  — called for every field change; no internal state
 *   credores            — array of { id, nome } for the credor dropdown
 *   onConfirmarParcelas — handler for "Gerar Parcelas" button (opt-in: parcelamento block only renders when provided)
 *   onEditParc          — (id, campo, val) handler for editing a parcela row
 *   onAddParc           — () handler for adding a parcela
 *   onRemParc           — (id) handler for removing a parcela
 */
export default function DividaForm({ value, onChange, credores = [], onConfirmarParcelas, onEditParc, onAddParc, onRemParc }) {
  return (
    <div>
      {/* Top grid — Descrição (span 2), Valor, Vencimento, Credor */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <Inp label="Descrição" value={value.descricao} onChange={v => onChange("descricao", v)} span={2} />
        <Inp label="Valor Total (R$)" value={value.valor_total} onChange={v => onChange("valor_total", v)} type="number" />
        <Inp label="Data de Vencimento *" value={value.data_origem} onChange={v => onChange("data_origem", v)} type="date" />
        <Inp
          label="Credor"
          value={value.credor_id || ""}
          onChange={v => onChange("credor_id", v || null)}
          options={[{ v: "", l: "(Sem credor)" }, ...credores.map(c => ({ v: c.id, l: c.nome }))]}
        />
      </div>

      <DiretrizesContrato value={value} onChange={onChange} />

      {/* Parcelamento — only renders when onConfirmarParcelas is provided */}
      {onConfirmarParcelas && (
        <div style={{ background: "#f1f5f9", borderRadius: 10, padding: 12, marginBottom: 12, border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".05em" }}>📅 Parcelamento (opcional)</p>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Deixe em branco se a dívida não for parcelada</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Inp label="Data da 1ª Parcela" value={value.data_primeira_parcela} onChange={v => onChange("data_primeira_parcela", v)} type="date" />
            <Inp label="Nº de Parcelas" value={value.qtd_parcelas} onChange={v => onChange("qtd_parcelas", v)} type="number" />
          </div>
          {value.valor_total && parseInt(value.qtd_parcelas || 0) > 1 && (
            <div style={{ background: "#ede9fe", borderRadius: 8, padding: "8px 12px", marginTop: 8, fontSize: 11 }}>
              <b style={{ color: "#4f46e5" }}>
                {value.qtd_parcelas}x de {fmt((parseFloat(value.valor_total) || 0) / parseInt(value.qtd_parcelas || 1))}
              </b>
            </div>
          )}
          {value.data_primeira_parcela && parseInt(value.qtd_parcelas || 0) >= 1 && (
            <div style={{ marginTop: 8 }}>
              <Btn onClick={onConfirmarParcelas} outline color="#4f46e5">🔄 Gerar Parcelas</Btn>
            </div>
          )}
          {/* Tabela de parcelas geradas */}
          {value.parcelas && value.parcelas.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#f1f5f9" }}>
                      {["Nº", "Valor (R$)", "Vencimento", ""].map(h => (
                        <th key={h} style={{ padding: "6px 9px", textAlign: "left", color: "#64748b", fontWeight: 700, fontSize: 10 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {value.parcelas.map((p, i) => (
                      <tr key={p.id} style={{ borderTop: "1px solid #f8fafc" }}>
                        <td style={{ padding: "5px 9px", fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "5px 9px" }}>
                          <input
                            type="number"
                            value={p.valor}
                            onChange={e => onEditParc && onEditParc(p.id, "valor", e.target.value)}
                            style={{ width: 85, padding: "3px 6px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 12, fontWeight: 700, color: "#4f46e5", outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "5px 9px" }}>
                          <input
                            type="date"
                            value={p.venc}
                            onChange={e => onEditParc && onEditParc(p.id, "venc", e.target.value)}
                            style={{ padding: "3px 6px", border: "1.5px solid #e2e8f0", borderRadius: 6, fontSize: 11, outline: "none" }}
                          />
                        </td>
                        <td style={{ padding: "5px 9px" }}>
                          <button
                            aria-label="Remover parcela"
                            onClick={() => onRemParc && onRemParc(p.id)}
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "2px 6px", cursor: "pointer", fontSize: 10 }}
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <button
                  onClick={() => onAddParc && onAddParc()}
                  style={{ background: "#f1f5f9", color: "#475569", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
                >+ Parcela</button>
                <span style={{ fontSize: 11, color: "#94a3b8" }}>
                  Total: <b style={{ color: "#4f46e5" }}>{fmt(value.parcelas.reduce((s, p) => s + p.valor, 0))}</b>
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Custas Judiciais — sempre renderizado */}
      <div style={{ background: "#fff7ed", border: "1.5px solid #fed7aa", borderRadius: 10, padding: 12, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: ".05em" }}>
            🏛 Custas Judiciais <span style={{ fontWeight: 400, color: "#9a3412" }}>(só correção monetária, sem juros)</span>
          </p>
          <button
            onClick={() => onChange("custas", [...(value.custas || []), { id: Date.now(), descricao: "", valor: "", data: "" }])}
            style={{ background: "#c2410c", color: "#fff", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}
          >+ Custa</button>
        </div>
        {(value.custas || []).map((c, ci) => (
          <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              placeholder="Descrição (ex: custa judicial - 01/12/2023)"
              value={c.descricao}
              onChange={e => onChange("custas", (value.custas || []).map((x, xi) => xi === ci ? { ...x, descricao: e.target.value } : x))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none", fontFamily: "Plus Jakarta Sans" }}
            />
            <input
              type="number"
              placeholder="Valor (R$)"
              value={c.valor}
              onChange={e => onChange("custas", (value.custas || []).map((x, xi) => xi === ci ? { ...x, valor: e.target.value } : x))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none", fontFamily: "Plus Jakarta Sans" }}
            />
            <input
              type="date"
              value={c.data}
              onChange={e => onChange("custas", (value.custas || []).map((x, xi) => xi === ci ? { ...x, data: e.target.value } : x))}
              style={{ padding: "6px 8px", border: "1.5px solid #fed7aa", borderRadius: 7, fontSize: 11, outline: "none" }}
            />
            <button
              onClick={() => onChange("custas", (value.custas || []).filter((_, xi) => xi !== ci))}
              style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 5, padding: "4px 7px", cursor: "pointer", fontSize: 11 }}
            >✕</button>
          </div>
        ))}
        {(value.custas || []).length === 0 && (
          <p style={{ fontSize: 11, color: "#c2410c", opacity: 0.6 }}>Nenhuma custa lançada. Clique em "+ Custa" para adicionar.</p>
        )}
        {(value.custas || []).length > 0 && (
          <div style={{ borderTop: "1px solid #fed7aa", paddingTop: 6, marginTop: 4, fontSize: 11, color: "#c2410c", fontWeight: 700, textAlign: "right" }}>
            Total custas: {fmt((value.custas || []).reduce((s, c) => s + (parseFloat(c.valor) || 0), 0))}
          </div>
        )}
      </div>
    </div>
  );
}
