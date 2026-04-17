// ─── Art523Option — Componente reutilizável ────────────────────────────────────
// Exibe 3 opções de aplicação do Art. 523 §1º CPC:
//   'multa_honorarios' | 'apenas_multa' | 'nao_aplicar'
//
// Props:
//   value    : string — opção selecionada
//   onChange : (novaOpcao: string) => void

export default function Art523Option({ value = "nao_aplicar", onChange }) {
  const opcoes = [
    { v: "multa_honorarios", l: "Aplicar Multa + Honorários (10% + 10%)" },
    { v: "apenas_multa",     l: "Aplicar Multa apenas (10%)" },
    { v: "nao_aplicar",      l: "Não Aplicar" },
  ];

  return (
    <div style={{
      background: "#fff7ed",
      border: "1.5px solid #fed7aa",
      borderRadius: 12,
      padding: "12px 14px",
      marginBottom: 12,
    }}>
      {/* Cabeçalho */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>⚖️</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#c2410c", textTransform: "uppercase", letterSpacing: ".04em" }}>
          Art. 523 §1º - CPC
        </span>
        <span style={{ fontSize: 10, color: "#9a3412", background: "#ffedd5", padding: "1px 7px", borderRadius: 99, fontWeight: 600 }}>
          multa 10% + honorários 10%
        </span>
      </div>

      {/* Radio buttons */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 7,
      }}>
        {opcoes.map(({ v, l }) => {
          const sel = value === v;
          return (
            <label
              key={v}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                cursor: "pointer",
                padding: "7px 10px",
                borderRadius: 9,
                background: sel ? "#fff7ed" : "transparent",
                border: sel ? "1.5px solid #fb923c" : "1.5px solid transparent",
                transition: "all .15s",
              }}
            >
              {/* Radio visual customizado */}
              <span style={{
                width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                border: sel ? "2px solid #ea580c" : "2px solid #d1d5db",
                background: sel ? "#ea580c" : "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all .15s",
              }}>
                {sel && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
              </span>
              <input
                type="radio"
                name="art523_opcao"
                value={v}
                checked={sel}
                onChange={() => onChange(v)}
                style={{ display: "none" }}
              />
              <span style={{
                fontSize: 12,
                fontWeight: sel ? 700 : 400,
                color: sel ? "#c2410c" : "#374151",
              }}>
                {l}
              </span>
            </label>
          );
        })}
      </div>

      {/* Nota informativa */}
      <p style={{ fontSize: 10, color: "#9a3412", marginTop: 8, lineHeight: 1.5 }}>
        Aplicável em cumprimento de sentença quando o devedor não paga
        voluntariamente no prazo de 15 dias (Art. 523, §1º, CPC).
        Incide sobre o <strong>valor total atualizado</strong>.
      </p>
    </div>
  );
}
