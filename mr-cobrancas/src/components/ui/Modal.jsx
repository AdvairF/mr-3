export default function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(15,23,42,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "16px",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      animation: "fadeInModal .18s ease",
    }}>
      <style>{`
        @keyframes fadeInModal{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
      `}</style>
      <div style={{
        background: "#fff",
        borderRadius: 20,
        width: "100%", maxWidth: width,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,.18), 0 4px 16px rgba(0,0,0,.08)",
        border: "1px solid #e8f5e9",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "20px 24px 16px",
          borderBottom: "1px solid #f0f7ee",
          background: "linear-gradient(135deg, #f6fef0 0%, #fff 60%)",
          borderRadius: "20px 20px 0 0",
        }}>
          <p style={{
            fontFamily: "'Space Grotesk',sans-serif",
            fontWeight: 800, fontSize: 16, color: "#1a3300",
            letterSpacing: "-.4px",
          }}>{title}</p>
          <button onClick={onClose} style={{
            background: "#f0fce0", border: "1px solid #d4f57a",
            borderRadius: 9, width: 32, height: 32,
            cursor: "pointer", fontSize: 14, color: "#3d6b00",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, transition: "all .15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "#c5f135"; e.currentTarget.style.color = "#1a3300"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f0fce0"; e.currentTarget.style.color = "#3d6b00"; }}
          >✕</button>
        </div>
        {/* Body */}
        <div style={{ padding: "20px 24px 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
