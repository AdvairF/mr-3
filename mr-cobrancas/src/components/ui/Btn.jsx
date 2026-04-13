export default function Btn({ children, onClick, color = "#3d9970", outline = false, danger = false, disabled = false, sm = false, lime = false }) {
  const limeGreen = "#c5f135";
  const bg  = lime
    ? "linear-gradient(135deg,#d9ff72 0%,#c5f135 100%)"
    : danger
      ? "linear-gradient(135deg,#fff1f2 0%,#ffe4e6 100%)"
      : outline
        ? "rgba(255,255,255,.72)"
        : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
  const cor = lime ? "#1a3300" : danger ? "#be123c" : outline ? color : "#fff";
  const brd = lime ? "1px solid rgba(167,243,34,.55)" : outline || danger ? `1.5px solid ${danger ? "#fda4af" : color}40` : "1px solid transparent";
  const shadow = lime
    ? "0 10px 24px rgba(197,241,53,.28)"
    : danger
      ? "0 10px 24px rgba(244,63,94,.12)"
      : outline
        ? "0 8px 20px rgba(15,23,42,.06)"
        : `0 12px 24px ${color}25`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mr-btn"
      style={{
        background: bg, color: cor, border: brd,
        borderRadius: 12, padding: sm ? "7px 14px" : "10px 18px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: sm ? 12 : 13, fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans',sans-serif",
        display: "inline-flex", alignItems: "center", gap: 6,
        opacity: disabled ? .6 : 1,
        transition: "all .18s cubic-bezier(.4,0,.2,1)",
        boxShadow: shadow, whiteSpace: "nowrap",
        letterSpacing: "-.1px",
        backdropFilter: "blur(10px)",
      }}
    >
      {children}
    </button>
  );
}
