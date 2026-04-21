# Phase 2: Módulo Dívidas no Sidebar — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 7 (5 new + 2 modified)
**Analogs found:** 7 / 7

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/ModuloDividas.jsx` | component (page shell) | request-response (local state) | `FilaDevedor.jsx` — container with internal view state | exact |
| `src/components/TabelaDividas.jsx` | component (table) | CRUD (read + client-side filter) | `FilaDevedor.jsx` → `FilaPainel` + `FilaPesquisa` sub-components | exact |
| `src/components/FiltroDividas.jsx` | component (filter bar) | request-response (controlled inputs) | `FilaDevedor.jsx` → `FilaPainel` filter block (lines 314–352) | exact |
| `src/components/DetalheDivida.jsx` | component (detail screen) | request-response + CRUD | `FilaDevedor.jsx` → `FilaAtendimento` detail layout (lines 641–1031) | role-match |
| `src/components/AtrasoCell.jsx` | component (badge helper) | transform (pure) | `FilaDevedor.jsx` → `diasDesde` helper + atraso display in `DividaCell` | role-match |
| `src/App.jsx` | config (NAV + router) | request-response | `src/App.jsx` itself — NAV array lines 8524–8539, renderPage lines 8541–8563 | self-reference |
| `src/components/DevedoresDaDivida.jsx` | component (existing, modify) | CRUD | self — reading current prop interface before adding `onRemovePrincipal` | self-reference |

---

## Pattern Assignments

### `src/components/ModuloDividas.jsx` (component, page shell)

**Analog:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — top-level export `FilaDevedor` (lines 1202–1277)

**Imports pattern** (lines 1–8):
```jsx
import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
```

**Core pattern — internal view state driving sub-views** (lines 1202–1277):
```jsx
export default function FilaDevedor({ user, devedores, credores }) {
  const [view, setView] = useState("painel");
  // ...
  return (
    <div>
      {view === "painel" && <FilaPainel ... />}
      {view === "atendimento" && <FilaAtendimento ... />}
    </div>
  );
}
```
For ModuloDividas, copy this pattern verbatim but replace views:
- `"lista"` (default) → renders `<FiltroDividas>` + `<TabelaDividas>`
- `"detalhe"` → renders `<DetalheDivida>`
- State: `const [selectedDivida, setSelectedDivida] = useState(null);`
- Navigation: `setSelectedDivida(divida); setView("detalhe");` on row click; `setView("lista"); setSelectedDivida(null);` on back button.

**No router** (confirmed RESEARCH.md anti-patterns): navigate entirely via `view` + `selectedDivida` local state. Never use React Router or URL params.

**Props to accept** (from RESEARCH.md Pattern 2):
```jsx
export default function ModuloDividas({ allDividas, devedores, credores, allPagamentos, hoje, onCarregarTudo })
```

---

### `src/components/FiltroDividas.jsx` (component, filter bar)

**Analog:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — filter block inside `FilaPainel` (lines 314–352)

**Shared style constants — COPY EXACTLY** (lines 66–68):
```jsx
const th = { padding: "8px 10px", textAlign: "left", fontWeight: 700, color: "#64748b", fontSize: 11, textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const td = { padding: "9px 10px", color: "#374151", verticalAlign: "middle" };
const inpS = { padding: "7px 10px", borderRadius: 9, border: "1px solid #d1d5db", fontSize: 12, fontFamily: "'Plus Jakarta Sans',sans-serif", background: "#fff", color: "#374151" };
```
These are NOT exported from FilaDevedor. Copy them into both `FiltroDividas.jsx` and `TabelaDividas.jsx`.

**Filter container pattern** (lines 314–352):
```jsx
<div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
    <input
      style={{ ...inpS, flex: 1, minWidth: 200 }}
      placeholder="Buscar por nome..."
      value={busca}
      onChange={e => setBusca(e.target.value)}
    />
    <select style={inpS} value={filtroCredor} onChange={e => setFiltroCredor(e.target.value)}>
      <option value="">Todos os credores</option>
      {(credores || []).map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
    </select>
    {/* add filtroStatus and filtroAtraso dropdowns in same row */}
  </div>
</div>
```

**Active chips below filter bar** (from UI-SPEC.md Interaction Contracts):
```jsx
{/* Render chips for active filters below the filter row */}
<div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
  {filtroStatus && (
    <span
      onClick={() => setFiltroStatus("")}
      style={{ background: "#ede9fe", color: "#4c1d95", borderRadius: 99, padding: "4px 8px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
    >
      Status: {filtroStatus} ✕
    </span>
  )}
  {/* repeat for filtroCredor, busca, filtroAtraso */}
</div>
```

**Debounce for devedor text input** (300ms per UI-SPEC.md):
```jsx
const debounceRef = useRef(null);
// inside onChange:
clearTimeout(debounceRef.current);
debounceRef.current = setTimeout(() => setBuscaDevedor(val), 300);
```

**Props to accept:**
```jsx
function FiltroDividas({ credores, onFiltrosChange })
// onFiltrosChange({ status, credorId, busca, atrasoMin }) called on every filter state change
```

---

### `src/components/TabelaDividas.jsx` (component, table)

**Analog:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — `FilaPesquisa` component (lines 1036–1099) for pagination pattern; `FilaPainel` table (lines 354–441) for row/action pattern.

**Pagination pattern — COPY FROM FilaPesquisa** (lines 1036–1099):
```jsx
const POR_PAG = 20; // per D-04 / UI-SPEC.md default

const total = resultados.length;
const paginas = Math.ceil(total / POR_PAG);
const visiveis = resultados.slice((pagina - 1) * POR_PAG, pagina * POR_PAG);

// Pagination controls:
{paginas > 1 && (
  <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 16 }}>
    <Btn sm outline disabled={pagina === 1} onClick={() => setPagina(p => p - 1)}>← Anterior</Btn>
    <span style={{ fontSize: 13, color: "#64748b", padding: "6px 12px" }}>Página {pagina} de {paginas}</span>
    <Btn sm outline disabled={pagina === paginas} onClick={() => setPagina(p => p + 1)}>Próximo →</Btn>
  </div>
)}
```

**Table structure — COPY FROM FilaPainel** (lines 360–441):
```jsx
<div style={{ overflowX: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
    <thead>
      <tr style={{ background: "#f8fafc" }}>
        <th style={th}>Devedor</th>
        <th style={th}>Credor</th>
        <th style={th}>Valor Original</th>
        <th style={th}>Saldo Atualizado</th>
        <th style={th}>Vencimento</th>
        <th style={th}>Status</th>
        <th style={th}>Atraso</th>
        <th style={th}>Ações</th>
      </tr>
    </thead>
    <tbody>
      {visiveis.map(d => (
        <tr key={d.id}
          onClick={() => onVerDetalhe(d)}
          onMouseEnter={() => setHoveredRow(d.id)}
          onMouseLeave={() => setHoveredRow(null)}
          style={{
            borderBottom: "1px solid #f1f5f9",
            background: hoveredRow === d.id ? "#f8fafc" : "#fff",
            cursor: "pointer",
            transition: "background .15s",
          }}>
          <td style={{ ...td, fontWeight: 600, color: "#0f172a" }}>{/* devedor nome */}</td>
          {/* ... */}
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

**Credor name join** (RESEARCH.md Pitfall 5):
```jsx
// Inside each row render:
const credor = credores.find(c => String(c.id) === String(divida.credor_id));
// Display:
{credor
  ? credor.nome
  : <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— sem credor</span>
}
```

**Saldo Atualizado per row** (RESEARCH.md Pattern 3):
```jsx
// Helper (define once at top of file or in ModuloDividas):
function buildDevedorObjParaSaldo(divida, devedores, allPagamentos) {
  const devedor = devedores.find(d => String(d.id) === String(divida.devedor_id));
  if (!devedor) return null;
  const pagamentosDoDevedor = allPagamentos.filter(p => String(p.devedor_id) === String(divida.devedor_id));
  return { devedor, pagamentos: pagamentosDoDevedor };
}

// In row:
const obj = buildDevedorObjParaSaldo(divida, devedores, allPagamentos);
const saldo = obj ? calcularSaldoDevedorAtualizado(obj.devedor, obj.pagamentos, hoje) : null;
// Display: saldo == null ? "Calculando..." : fmt(saldo)
```
CRITICAL: use `obj.devedor` (from `devedores[]`) which has `.dividas` from `dividasMap` with aliases pre-applied. Never pass a raw `allDividas` element to the motor.

**Empty state pattern** (line 357):
```jsx
{visiveis.length === 0 ? (
  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Nenhuma dívida encontrada</p>
    <p style={{ fontSize: 13 }}>Ajuste os filtros acima ou cadastre uma nova dívida na aba Pessoas.</p>
  </div>
) : (/* table */)}
```

**Props to accept:**
```jsx
function TabelaDividas({ dividas, devedores, credores, allPagamentos, hoje, onVerDetalhe })
```

---

### `src/components/DetalheDivida.jsx` (component, detail screen)

**Analog:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — `FilaAtendimento` (lines 641–1031) for financial card layout; `DevedoresDaDivida.jsx` for pessoas vinculadas section.

**Back button pattern** (line 1257):
```jsx
<button
  onClick={onVoltar}
  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#64748b" }}
>
  ← Dívidas
</button>
```

**Header block pattern** (lines 643–685, adapted):
```jsx
<div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", marginBottom: 4 }}>
    {devedorPrincipal?.nome || "— sem devedor principal"}
  </p>
  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#64748b", fontSize: 13 }}>
    <span>Credor: <strong style={{ color: "#374151" }}>{credor?.nome || "— sem credor"}</strong></span>
    <StatusBadgeDivida status={divida.status} />
  </div>
</div>
```

**Financial card pattern — from FilaAtendimento** (lines 696–808):
```jsx
// calcularDetalheEncargos gives: valorOriginal, saldoAtualizado, totalPago
const det = calcularDetalheEncargos(devedor, pagamentosDoDevedor, hoje);

<div style={{ background: "linear-gradient(135deg,#fff5f5 0%,#fff 100%)", borderRadius: 16, padding: "18px 20px", border: "1px solid #fecaca", marginBottom: 16 }}>
  <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Resumo Financeiro</p>
  {/* 3 values in a row: */}
  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
    {[
      { label: "Valor Original", value: fmt(det.valorOriginal) },
      { label: "Saldo Atualizado", value: fmt(det.saldoAtualizado) },
      { label: "Total Pago", value: fmt(det.totalPago) },
    ].map(({ label, value }) => (
      <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif" }}>{value}</p>
      </div>
    ))}
  </div>
  {/* Art.354 CC note: */}
  <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, fontStyle: "italic" }}>
    (amortização sequencial conforme Art. 354 CC)
  </p>
</div>
```

**D-05 PRINCIPAL removal warning modal** (RESEARCH.md Pattern 8):
```jsx
{showPrincipalWarning && (
  <Modal
    title="Remover devedor principal"
    onClose={() => setShowPrincipalWarning(false)}
    width={420}
  >
    <div style={{ background: "#fef9c3", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
      <p style={{ fontSize: 13, color: "#92400e", fontWeight: 700, margin: 0 }}>
        Remover devedor principal
      </p>
      <p style={{ fontSize: 12, color: "#92400e", marginTop: 6 }}>
        Você está removendo o devedor principal. Esta dívida ficará sem responsável principal. Confirmar?
      </p>
    </div>
    <div style={{ display: "flex", gap: 8 }}>
      <Btn danger onClick={handleConfirmarRemoverPrincipal}>Confirmar remoção</Btn>
      <Btn outline onClick={() => setShowPrincipalWarning(false)}>Manter dívida</Btn>
    </div>
  </Modal>
)}
```

**DevedoresDaDivida embedding:**
```jsx
// Pass devedorAtualId={null} so ALL remove buttons are visible (RESEARCH.md Pitfall 4)
<DevedoresDaDivida
  dividaId={divida.id}
  devedores={devedores}
  devedorAtualId={null}
  onRemovePrincipal={handleRemovePrincipalWarning}  // new prop — see DevedoresDaDivida.jsx section
/>
```

**Art523Option read-only pattern** (RESEARCH.md Pattern 7):
```jsx
// art523_opcao DB vocab: 'so_multa' → Art523Option vocab: 'apenas_multa'
const art523DisplayValue = divida.art523_opcao === "so_multa" ? "apenas_multa" : divida.art523_opcao;
<div style={{ pointerEvents: "none", opacity: 0.85 }}>
  <Art523Option value={art523DisplayValue} onChange={() => {}} />
</div>
```

**Props to accept:**
```jsx
function DetalheDivida({ divida, devedores, credores, allPagamentos, hoje, onVoltar, onCarregarTudo })
```

---

### `src/components/AtrasoCell.jsx` (component, badge helper)

**Analog:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` — `diasDesde` helper (line 61–64) + atraso display pattern in `FilaAtendimento` (line 783–787).

**Complete implementation** (from RESEARCH.md Pattern 4, verified against App.jsx atraso logic):
```jsx
export default function AtrasoCell({ dataVencimento }) {
  if (!dataVencimento) return <span style={{ color: "#94a3b8" }}>—</span>;
  const hoje = new Date().toISOString().slice(0, 10);
  const dias = Math.floor((new Date(hoje) - new Date(dataVencimento)) / 86400000);
  if (dias <= 0)  return <span style={{ background: "#f1f5f9", color: "#64748b", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>Em dia</span>;
  if (dias <= 30) return <span style={{ background: "#fef9c3", color: "#854d0e", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{dias} dias</span>;
  if (dias <= 90) return <span style={{ background: "#ffedd5", color: "#9a3412", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{dias} dias</span>;
  if (dias <= 180) return <span style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{dias} dias</span>;
  return <span style={{ background: "#450a0a", color: "#fca5a5", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{dias} dias ⚠</span>;
}
```
Tier breakpoints (from App.jsx atraso logic, verified): ≤0 = em dia, 1–30 = amarelo, 31–90 = laranja, 91–180 = vermelho, 180+ = crítico.

**For filter "Atraso" in FiltroDividas:** filter values `30+`, `60+`, `90+` compare `dias >= threshold`, NOT tier bucket. `60+` matches the orange tier range but includes dias=60–89 which must not be excluded.

---

### `src/App.jsx` — NAV entry + renderPage case (modified)

**Analog:** `src/mr-3/mr-cobrancas/src/App.jsx` — self-reference.

**NAV array insertion point** (lines 8524–8539):
```jsx
// Current NAV — insert entry at index 2, AFTER { id: "devedores" } BEFORE { id: "credores" }:
const NAV = [
  { id: "dashboard", label: "Dashboard", icon: I.dash, color: "#6366f1", bg: "rgba(99,102,241,.18)" },
  { id: "devedores", label: "Pessoas", icon: I.dev, color: "#ec4899", bg: "rgba(236,72,153,.18)" },
  // ← INSERT HERE:
  { id: "dividas", label: "Dívidas", icon: I.dividas, color: "#7c3aed", bg: "rgba(124,58,237,.18)" },
  { id: "credores", label: "Credores", icon: I.cred, color: "#14b8a6", bg: "rgba(20,184,166,.18)" },
  // ...rest unchanged
];
```

**Icon definition — add to `I` object at line 90** (follow exact same pattern as `I.proc` at line 97):
```jsx
// I.proc uses the same file-document SVG path — differentiate dividas with dollar sign lines:
dividas: <svg style={{ width: 18, height: 18, flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
  <polyline points="14 2 14 8 20 8"/>
  <line x1="12" y1="13" x2="8" y2="13"/>
  <line x1="12" y1="17" x2="8" y2="17"/>
  <line x1="16" y1="13" x2="16.01" y2="13"/>
</svg>,
```
Note: `I.proc` (line 97) uses the same file SVG but without the dollar-indicating dot. The dot `x1="16" y1="13" x2="16.01" y2="13"` visually differentiates "Dívidas" from "Processos".

**Sidebar badge** — insert inside `NAV.map` render loop (line 8704–8713), INSIDE the `<button>` after `<span>{n.label}</span>`:
```jsx
// The NAV map loop at line 8704 renders each nav button.
// Inside each button, after <span style={{ flex: 1, ... }}>{n.label}</span>, add:
{n.id === "dividas" && (() => {
  const count = allDividas.filter(d => d.status === "em cobrança").length;
  if (!count) return null;
  return (
    <span style={{
      position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
      fontSize: 11, fontWeight: 700, background: "#ede9fe", color: "#4c1d95",
      borderRadius: 99, padding: "4px 8px", lineHeight: 1,
    }}>{count}</span>
  );
})()}
```
`allDividas` is in App.jsx closure scope (line 8415) — no prop drilling needed.

**renderPage case** — add to switch at line 8541, after `case "peticao"` before `case "usuarios"`:
```jsx
case "dividas": return (
  <ModuloDividas
    allDividas={allDividas}
    devedores={devedores}
    credores={credores}
    allPagamentos={allPagamentos}
    hoje={hoje_app}
    onCarregarTudo={carregarTudo}
  />
);
```

**Import to add** — at top of App.jsx alongside other component imports:
```jsx
import ModuloDividas from "./components/ModuloDividas.jsx";
```

---

### `src/components/DevedoresDaDivida.jsx` — add `onRemovePrincipal` prop (modified)

**Analog:** self — read current source (lines 1–134 verified above).

**Current prop interface** (line 20):
```jsx
export default function DevedoresDaDivida({ dividaId, devedores = [], devedorAtualId })
```

**Modified prop interface:**
```jsx
export default function DevedoresDaDivida({ dividaId, devedores = [], devedorAtualId, onRemovePrincipal })
```

**Current remove handler** (lines 80–93) — the `!isAtual` gate hides the ✕ for `devedorAtualId`. In DetalheDivida context, `devedorAtualId={null}` makes all participants show the ✕ button.

**Modified remove logic for PRINCIPAL case:**
```jsx
// Replace the onClick handler on the ✕ button (currently lines 81–89):
onClick={async () => {
  const isPrincipal = p.papel === "PRINCIPAL";
  const hasOtherPrincipal = participantes.some(x => x.id !== p.id && x.papel === "PRINCIPAL");

  if (isPrincipal && !hasOtherPrincipal && onRemovePrincipal) {
    // Delegate to DetalheDivida for Modal.jsx warning (D-05)
    await onRemovePrincipal(p);
    return;
  }

  // Existing behavior for non-PRINCIPAL (or when onRemovePrincipal not provided):
  if (!window.confirm(`Remover ${p.devedor?.nome || "participante"} desta dívida?`)) return;
  try {
    await remover(p.id);
    toast.success("Removido.");
  } catch (e) {
    toast.error("Erro: " + e.message);
  }
}}
```

**Backward compatibility:** When `onRemovePrincipal` is not passed (aba Dívidas inside Pessoa), the existing `window.confirm` path runs unchanged. The aba Dívidas also passes `devedorAtualId={devedor.id}` which hides the ✕ for the current devedor — this behavior is preserved.

---

## Shared Patterns

### Formatting helpers (copy locally — NOT imported from utils/formatters.js by existing components)

**Source:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` lines 52–64

Both `FilaDevedor` and `DevedoresDaDivida` define local `fmtBRL`/`fmtData` helpers rather than importing from `utils/formatters.js`. Follow the same pattern:

```jsx
// Copy into FiltroDividas.jsx, TabelaDividas.jsx, DetalheDivida.jsx as needed:
function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtData(iso) {
  if (!iso) return "—";
  const d = iso.slice(0, 10).split("-");
  return `${d[2]}/${d[1]}/${d[0]}`;
}
```

### Modal.jsx interface (verified — A1 resolved)

**Source:** `src/mr-3/mr-cobrancas/src/components/ui/Modal.jsx` lines 1–54

```jsx
// Verified prop signature:
export default function Modal({ title, onClose, children, width = 560 })
// Usage:
<Modal title="Remover devedor principal" onClose={() => setShowPrincipalWarning(false)} width={420}>
  {children}
</Modal>
```
Modal renders a lime-gradient header with `title`, a ✕ close button, and children in `padding: "20px 24px 24px"`.

### Btn.jsx interface (verified — A2 resolved)

**Source:** `src/mr-3/mr-cobrancas/src/components/ui/Btn.jsx` lines 1–42

```jsx
// Verified prop signature:
export default function Btn({ children, onClick, color = "#3d9970", outline = false, danger = false, disabled = false, sm = false, lime = false })
// Usage for D-05 modal:
<Btn danger onClick={handleConfirmarRemoverPrincipal}>Confirmar remoção</Btn>
<Btn outline onClick={() => setShowPrincipalWarning(false)}>Manter dívida</Btn>
// Usage for table action:
<Btn sm outline onClick={() => onVerDetalhe(d)}>Ver Detalhe</Btn>
```

### Status badge for dívidas (new — no existing analog)

No `StatusBadge` for dívida status (`em cobrança` / `quitada` / `acordo`) exists in the codebase. Define locally in `TabelaDividas.jsx` and `DetalheDivida.jsx`:

```jsx
const STATUS_DIVIDA_META = {
  "em cobrança": { bg: "#dbeafe", cor: "#1d4ed8", label: "Em Cobrança" },
  "quitada":     { bg: "#dcfce7", cor: "#065f46", label: "Quitada" },
  "acordo":      { bg: "#fef3c7", cor: "#d97706", label: "Acordo" },
};
function StatusBadgeDivida({ status }) {
  const s = STATUS_DIVIDA_META[status] || { bg: "#f1f5f9", cor: "#64748b", label: status };
  return (
    <span style={{ display: "inline-block", background: s.bg, color: s.cor, fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 99, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}
```
Color values from `02-UI-SPEC.md` semantic palette (verified).

### devedorCalc.js imports

**Source:** `src/mr-3/mr-cobrancas/src/components/FilaDevedor.jsx` line 8 (import pattern)

```jsx
// Import pattern for calculation utilities:
import { calcularSaldoDevedorAtualizado, calcularDetalheEncargos } from "../utils/devedorCalc.js";
```
`calcularSaldoDevedorAtualizado` is used in TabelaDividas per-row; `calcularDetalheEncargos` is used in DetalheDivida financial card.

### Global CSS variables (use via var() in inline styles)

**Source:** `src/mr-3/mr-cobrancas/src/App.jsx` line 8582–8591 (`<style>` block in render)

The CSS vars are declared globally. New components may reference them in inline style objects as-is — they are always in scope since App.jsx renders the `<style>` block globally. Do NOT redefine them.

---

## No Analog Found

All files have analogs. No entries in this section.

---

## Metadata

**Analog search scope:** `src/mr-3/mr-cobrancas/src/components/`, `src/mr-3/mr-cobrancas/src/App.jsx`, `src/mr-3/mr-cobrancas/src/components/ui/`
**Files read:** FilaDevedor.jsx (1278 lines), DevedoresDaDivida.jsx (317 lines), App.jsx (targeted reads: lines 85–130, 8510–8570, 8695–8760), Modal.jsx (54 lines), Btn.jsx (42 lines)
**Pattern extraction date:** 2026-04-20

**Open questions resolved:**
- A1 (Modal.jsx `onClose` prop): CONFIRMED — `Modal({ title, onClose, children, width = 560 })`
- A2 (Btn.jsx `danger`/`outline` props): CONFIRMED — `Btn({ danger = false, outline = false, ... })`
- art523_opcao vocabulary mismatch: documented in DetalheDivida pattern — map `so_multa` → `apenas_multa` before passing to `Art523Option`, add code comment

**Critical reminders for implementor:**
1. `allDividas` rows have NO aliases — never pass them directly to `calcularSaldoDevedorAtualizado`. Use `devedores.find(d => d.id == divida.devedor_id)` which has `.dividas` from `dividasMap` with aliases.
2. `devedorAtualId={null}` in DetalheDivida embeds — ensures all ✕ remove buttons are visible.
3. The NAV button `<button>` already has `position: "relative"` (line 8707) — the badge `position: absolute` will work correctly.
4. `peticao` and `usuarios` both use `color: "#7c3aed"` — "Dívidas" may share this violet family (per UI-SPEC.md note) or use `#6d28d9` if differentiation is preferred. Either is acceptable.
