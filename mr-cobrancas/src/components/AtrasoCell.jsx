export default function AtrasoCell({ dataVencimento }) {
  if (!dataVencimento) return <span style={{ color: "#94a3b8" }}>—</span>;

  const hoje = new Date().toISOString().slice(0, 10);
  const dias = Math.floor((new Date(hoje) - new Date(dataVencimento)) / 86400000);

  if (dias <= 0) return (
    <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      Em dia
    </span>
  );
  if (dias <= 30) return (
    <span style={{ background: "#fef9c3", color: "#854d0e", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      {dias} dias
    </span>
  );
  if (dias <= 90) return (
    <span style={{ background: "#ffedd5", color: "#9a3412", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      {dias} dias
    </span>
  );
  if (dias <= 180) return (
    <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      {dias} dias
    </span>
  );
  return (
    <span style={{ background: "#450a0a", color: "#fca5a5", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
      {dias} dias ⚠
    </span>
  );
}
