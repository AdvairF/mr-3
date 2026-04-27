// Inp/INP — wrappers de input. Para type="date" e type="number", delegam ao <InputBR> (paste-friendly BR — Phase 7.14, D-pre-3 + D-pre-8).
import InputBR from "./InputBR.jsx";

// Inp — versão simples (usada em Credores)
export function Inp({ label, value, onChange, type = "text", options, span, ...rest }) {
  const st = {
    width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0",
    borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif",
    boxSizing: "border-box",
  };
  return (
    <div style={{ gridColumn: span ? `1/-1` : undefined }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={st} {...rest}>
          {options.map(o => (
            <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>
              {typeof o === "string" ? o : o.l}
            </option>
          ))}
        </select>
      ) : (type === "date" || type === "number") ? (
        <InputBR
          type={type === "number" ? "value" : "date"}
          value={value}
          onChange={onChange}
          style={st}
          {...rest}
        />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={st} {...rest} />
      )}
    </div>
  );
}

// INP — versão avançada com opts e span (usada em Devedores)
export function INP({ label, value, onChange, type = "text", opts, options, span, ...rest }) {
  const allOpts = opts || options;
  const st = {
    width: "100%", padding: "8px 10px", border: "1.5px solid #e2e8f0",
    borderRadius: 9, fontSize: 13, outline: "none", fontFamily: "'Plus Jakarta Sans',sans-serif",
    boxSizing: "border-box",
  };
  return (
    <div style={{ gridColumn: span ? `1/-1` : undefined }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748b", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
          {label}
        </label>
      )}
      {allOpts ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={st} {...rest}>
          {allOpts.map(o => (
            <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>
              {typeof o === "string" ? o : o.l}
            </option>
          ))}
        </select>
      ) : (type === "date" || type === "number") ? (
        <InputBR
          type={type === "number" ? "value" : "date"}
          value={value}
          onChange={onChange}
          style={st}
          {...rest}
        />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} style={st} {...rest} />
      )}
    </div>
  );
}
