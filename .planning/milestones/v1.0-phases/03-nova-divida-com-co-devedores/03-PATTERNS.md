# Phase 3: Nova Dívida com Co-devedores — Pattern Map

**Mapped:** 2026-04-20
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/components/DividaForm.jsx` | component (controlled form) | request-response | `App.jsx` ~line 3892 (inline form block) | exact (extraction target) |
| `src/components/NovaDivida.jsx` | component (view) | CRUD + request-response | `DetalheDivida.jsx` (layout) + `DevedoresDaDivida.jsx` (search/cards) | role-match (composition of two analogs) |
| `src/components/ModuloDividas.jsx` | component (view router) | request-response | itself (current 2-view structure) | exact (modify existing) |
| `src/App.jsx` | app (inline form refactor) | request-response | itself (~line 3892 inline form) | exact (modify existing) |

---

## Pattern Assignments

### `src/components/DividaForm.jsx` (component, controlled form)

**Analog:** `src/mr-3/mr-cobrancas/src/App.jsx` lines 3892–4012 (inline form block to be extracted)
**Secondary analog:** `src/mr-3/mr-cobrancas/src/utils/constants.js` lines 26–30 (`DIVIDA_VAZIA`)

**Imports pattern** — copy this import block:
```jsx
import Art523Option from "./Art523Option.jsx";
import Inp from "./ui/Inp.jsx";
import Btn from "./ui/Btn.jsx";
// INDICE_OPTIONS and JUROS_OPTIONS come from App.jsx — pass as props or re-export from constants
```

**Component signature** (controlled, stateless):
```jsx
// DividaForm receives ALL state as props; no internal useState
export default function DividaForm({ value, onChange, credores = [] }) {
  // value shape (DIVIDA_VAZIA + two extra fields not in constants.js):
  // { descricao, valor_total, data_origem, data_primeira_parcela, qtd_parcelas,
  //   parcelas, indexador, juros_tipo, multa_pct, juros_am, honorarios_pct,
  //   data_inicio_atualizacao, despesas, observacoes, custas,
  //   credor_id,      ← NOT in DIVIDA_VAZIA — add when initializing state in NovaDivida
  //   art523_opcao    ← NOT in DIVIDA_VAZIA — add when initializing state in NovaDivida
  // }
  // onChange(campo, valor) — matches the existing ND() handler in App.jsx
}
```

**DIVIDA_VAZIA extension for NovaDivida** (App.jsx line 27–30 + missing fields):
```js
// src/utils/constants.js — DIVIDA_VAZIA (lines 26-30):
export const DIVIDA_VAZIA = {
  descricao: "", valor_total: "", data_origem: "", data_primeira_parcela: "", qtd_parcelas: "1",
  parcelas: [], indexador: "igpm", juros_tipo: "fixo_1", multa_pct: "0", juros_am: "0", honorarios_pct: "0",
  data_inicio_atualizacao: "", despesas: "0", observacoes: "", custas: [],
};
// NovaDivida extends it:
const FORM_VAZIO = { ...DIVIDA_VAZIA, credor_id: null, art523_opcao: "nao_aplicar" };
```

**Core layout pattern** (App.jsx lines 3894–3937):
```jsx
// Top grid: Descrição (span 2), Valor, Vencimento
<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
  <Inp label="Descrição" value={value.descricao} onChange={v => onChange("descricao", v)} span={2} />
  <Inp label="Valor Total (R$)" value={value.valor_total} onChange={v => onChange("valor_total", v)} type="number" />
  <Inp label="Data de Vencimento *" value={value.data_origem} onChange={v => onChange("data_origem", v)} type="date" />
</div>

// Credor dropdown — NOT in the inline form (sel.credor_id used there); ADD in DividaForm:
<Inp label="Credor" value={value.credor_id || ""} onChange={v => onChange("credor_id", v || null)}
  options={[{ v: "", l: "— sem credor —" }, ...credores.map(c => ({ v: c.id, l: c.nome }))]} />

// Diretrizes do Contrato block (App.jsx lines 3899-3937):
<div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, marginBottom: 10 }}>
  <p style={{ fontSize: 10, fontWeight: 700, color: "#4f46e5", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>
    📋 Diretrizes do Contrato
  </p>
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
    <Inp label="Índice" value={value.indexador} onChange={v => onChange("indexador", v)} options={INDICE_OPTIONS} />
    <Inp label="Data Início Atualização" value={value.data_inicio_atualizacao} onChange={v => onChange("data_inicio_atualizacao", v)} type="date" />
    <Inp label="Multa (%)" value={value.multa_pct} onChange={v => onChange("multa_pct", v)} type="number" />
    <Inp label="Taxa de Juros" value={value.juros_tipo} onChange={v => onChange("juros_tipo", v)} options={JUROS_OPTIONS} />
    <Inp label="Juros (% a.m.)" value={value.juros_am} onChange={v => onChange("juros_am", v)} type="number" disabled={value.juros_tipo !== "outros"} />
    <Inp label="Honorários (%)" value={value.honorarios_pct} onChange={v => onChange("honorarios_pct", v)} type="number" />
    <Inp label="Despesas (R$)" value={value.despesas} onChange={v => onChange("despesas", v)} type="number" />
  </div>
  <Art523Option value={value.art523_opcao || "nao_aplicar"} onChange={v => onChange("art523_opcao", v)} />
  {/* Juros info banners — copy lines 3911-3935 verbatim */}
</div>
```

**Parcelamento block** (App.jsx lines 3939–3999) — pass handlers as props:
```jsx
// Props needed for parcelamento:
// onConfirmarParcelas, onEditParc, onAddParc, onRemParc
// These handlers stay in the caller (App.jsx or NovaDivida.jsx) — DividaForm only renders
```

**Custas block** (App.jsx lines 3953–3977) — same pattern, onChange delegates up:
```jsx
// Custas items are managed via onChange("custas", newArray) — no internal state
```

**Error handling:** None in DividaForm itself — caller (App.jsx `adicionarDivida` or NovaDivida `handleSalvar`) owns try/catch. See shared pattern below.

---

### `src/components/NovaDivida.jsx` (component, CRUD + request-response)

**Primary analog (layout):** `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx`
**Secondary analog (people search):** `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` lines 150–330 (`AdicionarParticipanteModal`)

**Imports pattern** (copy from DetalheDivida.jsx lines 1–7, add services):
```jsx
import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import DividaForm from "./DividaForm.jsx";
import { criarDivida } from "../services/dividas.js";
import { adicionarParticipante } from "../services/devedoresDividas.js";
import { dbInsert } from "../config/supabase.js";
import { DIVIDA_VAZIA } from "../utils/constants.js";
```

**Component signature:**
```jsx
export default function NovaDivida({ devedores, credores, onCarregarTudo, onVoltar }) {
```

**State initialization pattern:**
```jsx
const FORM_VAZIO = { ...DIVIDA_VAZIA, credor_id: null, art523_opcao: "nao_aplicar" };

const [form, setForm] = useState(FORM_VAZIO);
const [salvando, setSalvando] = useState(false);

// Pessoas state — 1 empty PRINCIPAL line to start (D-05)
const [pessoas, setPessoas] = useState([
  { _key: Date.now(), papel: "PRINCIPAL", responsabilidade: "SOLIDARIA", devedor_id: null, nome: null }
]);

// Modal "Criar Pessoa Rápida" state
const [showModalCriar, setShowModalCriar] = useState(false);
const [contextoLinha, setContextoLinha] = useState(null); // _key of the line that triggered modal
const [buscaPreFill, setBuscaPreFill] = useState("");     // pre-fill modal name field
```

**onChange handler pattern** (mirrors `ND()` in App.jsx):
```jsx
function handleChange(campo, valor) {
  setForm(prev => ({ ...prev, [campo]: valor }));
}
```

**Pessoas management pattern** (from RESEARCH.md Pattern 5):
```jsx
function adicionarLinha() {
  setPessoas(prev => [...prev, {
    _key: Date.now(),
    papel: "COOBRIGADO",
    responsabilidade: "SOLIDARIA",
    devedor_id: null,
    nome: null
  }]);
}

function removerLinha(key) {
  setPessoas(prev => prev.filter(p => p._key !== key));
}

function selecionarPessoa(key, devedor) {
  setPessoas(prev => prev.map(p =>
    p._key === key ? { ...p, devedor_id: devedor.id, nome: devedor.nome } : p
  ));
}

function atualizarCampoLinha(key, campo, valor) {
  setPessoas(prev => prev.map(p => p._key === key ? { ...p, [campo]: valor } : p));
}
```

**Busca de pessoa pattern** (from DevedoresDaDivida.jsx lines 158–170):
```jsx
// Per-line search state — use a Map or per-line component with local state
const idsJaNaLista = new Set(pessoas.map(p => String(p.devedor_id)).filter(Boolean));

// Per search input (busca = local string state per line):
const resultados = busca.trim().length >= 2
  ? devedores
      .filter(d =>
        !idsJaNaLista.has(String(d.id)) &&
        ((d.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
          (d.cpf_cnpj || "").includes(busca))
      )
      .slice(0, 8)
  : [];

// When resultados.length === 0 and busca.trim().length >= 2:
// Show option: + Criar "{busca}" → opens modal with buscaPreFill = busca
```

**Validation pattern** (D-07 / D-08):
```jsx
const podesSalvar =
  !!form.valor_total &&
  !!form.data_origem &&
  pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null);
```

**Atomic save pattern** (from RESEARCH.md Pattern 2 — verified against App.jsx lines 3201–3263 and devedoresDividas.js lines 21–32):
```jsx
async function handleSalvar() {
  setSalvando(true);
  try {
    const principal = pessoas.find(p => p.papel === "PRINCIPAL" && p.devedor_id != null);
    const dataVenc = form.parcelas?.length > 0
      ? (form.data_primeira_parcela || form.data_origem)
      : form.data_origem;

    const payload = {
      devedor_id: principal.devedor_id,          // desnormalizado (D-02 Specifics)
      credor_id: form.credor_id || null,
      observacoes: form.descricao || "Dívida",
      valor_total: parseFloat(form.valor_total),
      data_vencimento: dataVenc || null,
      data_origem: form.data_origem || null,
      data_inicio_atualizacao: form.data_inicio_atualizacao || dataVenc || null,
      // DB column names only (carregarTudo maps aliases automatically):
      indice_correcao: form.indexador || "igpm",
      juros_tipo: form.juros_tipo || "fixo_1",
      juros_am_percentual: parseFloat(form.juros_am) || 0,
      multa_percentual: parseFloat(form.multa_pct) || 0,
      honorarios_percentual: parseFloat(form.honorarios_pct) || 0,
      despesas: parseFloat(form.despesas) || 0,
      art523_opcao: form.art523_opcao || "nao_aplicar",
      parcelas: form.parcelas || [],
      custas: form.custas || [],
      status: "em cobrança",                     // explicit — do not rely on DB default (OQ-1)
    };

    const res = await criarDivida(payload);
    const novaDiv = Array.isArray(res) ? res[0] : res;
    if (!novaDiv?.id) throw new Error("Supabase não retornou row");

    // Vincular participantes — Principal first (demoverPrincipalAtual is a no-op for new divida)
    const principaisFirst = [...pessoas].sort((a, b) =>
      a.papel === "PRINCIPAL" ? -1 : b.papel === "PRINCIPAL" ? 1 : 0
    );
    for (const p of principaisFirst) {
      await adicionarParticipante({
        devedorId: p.devedor_id,
        dividaId: String(novaDiv.id),
        papel: p.papel,
        responsabilidade: p.responsabilidade,
      });
    }

    await onCarregarTudo();           // D-09: update badge + allDividas BEFORE navigating
    toast.success("Dívida criada com sucesso");
    onVoltar();                       // D-09: returns to view='lista'
  } catch (e) {
    toast.error("Erro ao salvar: " + e.message);
  } finally {
    setSalvando(false);
  }
}
```

**Modal "Criar Pessoa Rápida" pattern** (uses Modal.jsx — verified lines 1–54):
```jsx
// Open: setContextoLinha(_key); setBuscaPreFill(busca); setShowModalCriar(true)
// Modal.jsx props: title, onClose, children, width (default 560)

async function handleCriarPessoa({ nome, cpf_cnpj, tipo }) {
  // dbInsert returns array with created row (Prefer: return=representation)
  const res = await dbInsert("devedores", { nome, cpf_cnpj: cpf_cnpj || null, tipo: tipo || "PF" });
  const nova = Array.isArray(res) ? res[0] : res;
  // Add directly to pessoas list in the triggering line (D-04 papel from context)
  const papelContexto = pessoas.find(p => p._key === contextoLinha)?.papel || "COOBRIGADO";
  selecionarPessoa(contextoLinha, nova);
  // If the line had no papel set yet, it was initialized with the right default
  setShowModalCriar(false);
}

// Usage:
{showModalCriar && (
  <Modal title="Criar Pessoa" onClose={() => setShowModalCriar(false)} width={420}>
    {/* Fields: Nome* (pre-filled with buscaPreFill), CPF/CNPJ (optional), Tipo PF/PJ */}
    {/* Button: "Criar e Vincular" → handleCriarPessoa */}
  </Modal>
)}
```

**Back button pattern** (copy from DetalheDivida.jsx lines 83–97):
```jsx
<button
  onClick={onVoltar}
  style={{
    background: "none", border: "none", cursor: "pointer",
    fontSize: 13, fontWeight: 700, color: "#64748b",
    padding: "0 0 12px 0", display: "block",
  }}
>
  ← Dívidas
</button>
```

**Card container pattern** (copy from DetalheDivida.jsx line 80):
```jsx
<div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>
```

**Section card pattern** (copy from DetalheDivida.jsx lines 100–113):
```jsx
<div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
  <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>
    Pessoas na Dívida
  </p>
  {/* section content */}
</div>
```

**PAPEL_META and RESP_LABELS constants** (copy verbatim from DevedoresDaDivida.jsx lines 5–18):
```jsx
const PAPEL_META = {
  PRINCIPAL:  { label: "Principal",  bg: "#fef3c7", cor: "#92400e" },
  COOBRIGADO: { label: "Coobrigado", bg: "#ede9fe", cor: "#4c1d95" },
  AVALISTA:   { label: "Avalista",   bg: "#dbeafe", cor: "#1e3a8a" },
  FIADOR:     { label: "Fiador",     bg: "#dcfce7", cor: "#14532d" },
  CONJUGE:    { label: "Cônjuge",    bg: "#fce7f3", cor: "#831843" },
  OUTRO:      { label: "Outro",      bg: "#f1f5f9", cor: "#334155" },
};
const RESP_LABELS = { SOLIDARIA: "Solidária", SUBSIDIARIA: "Subsidiária", DIVISIVEL: "Divisível" };
```

**Person card pattern** (copy from DevedoresDaDivida.jsx lines 53–127, adapt for pre-save state):
```jsx
// Each pessoa in list renders:
// - 👑 icon if PRINCIPAL, 👤 otherwise (from D-05)
// - name (or search input if devedor_id == null)
// - papel select (PAPEL_META keys)
// - responsabilidade select (RESP_LABELS keys)
// - ✕ button for non-PRINCIPAL lines (removerLinha(_key))
// Card style:
{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6,
  padding: "6px 10px", background: "#fafafe", borderRadius: 9, border: "1px solid #e2e8f0" }
```

**Save/Cancel buttons pattern** (copy Btn.jsx usage from DetalheDivida.jsx):
```jsx
<div style={{ display: "flex", gap: 8, marginTop: 16 }}>
  <Btn
    onClick={handleSalvar}
    disabled={!podesSalvar || salvando}
    color="#059669"
    title={!pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null)
      ? "Adicione pelo menos um devedor Principal"
      : undefined}
  >
    {salvando ? "Salvando..." : "Salvar Dívida"}
  </Btn>
  <Btn outline onClick={onVoltar} color="#64748b">
    Cancelar
  </Btn>
</div>
```

---

### `src/components/ModuloDividas.jsx` (component, view router — MODIFY)

**Analog:** itself — `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` lines 1–87

**Current import block** (lines 1–5) — extend with:
```jsx
import { useState } from "react";
import FiltroDividas from "./FiltroDividas.jsx";
import TabelaDividas from "./TabelaDividas.jsx";
import DetalheDivida from "./DetalheDivida.jsx";
import NovaDivida from "./NovaDivida.jsx";        // ADD
import Btn from "./ui/Btn.jsx";                   // ADD
```

**Current view routing** (lines 7–37) — add handler:
```jsx
// Existing handlers (lines 29-37):
function handleVerDetalhe(divida) { setSelectedDivida(divida); setView("detalhe"); }
function handleVoltar() { setView("lista"); setSelectedDivida(null); }

// ADD:
function handleNovaDivida() { setView("nova"); }
function handleVoltarDaNova() { setView("lista"); }
```

**Current header** (lines 44–53) — add "+ Nova Dívida" button:
```jsx
<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <h2 style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", margin: 0 }}>
      Dívidas
    </h2>
    <span style={{ background: "#ede9fe", color: "#4c1d95", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99 }}>
      {allDividas.filter(d => d.status === "em cobrança").length} em cobrança
    </span>
  </div>
  {/* ADD: */}
  <Btn onClick={handleNovaDivida} color="#059669" sm>+ Nova Dívida</Btn>
</div>
```

**Add view='nova' case** — insert before closing `</div>` (after line 71 `{view === "detalhe"...}`):
```jsx
{view === "nova" && (
  <NovaDivida
    devedores={devedores}
    credores={credores}
    onCarregarTudo={onCarregarTudo}
    onVoltar={handleVoltarDaNova}
  />
)}
```

**Note:** `devedores` and `credores` are already props of `ModuloDividas` (line 6) — no new props needed on the parent.

---

### `src/App.jsx` — Inline form refactor (MODIFY)

**Analog:** itself, lines 3892–4012

**Refactor target:** Replace the entire inline JSX block (lines 3892–4012) with:
```jsx
{/* Formulário nova dívida */}
<div style={{ background: "#f1f5f9", borderRadius: 14, padding: 16, border: "1.5px dashed #e2e8f0", marginTop: 8 }}>
  <p style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>➕ Nova Dívida</p>
  <DividaForm
    value={nd}
    onChange={ND}
    credores={credores}
    onConfirmarParcelas={confirmarParcelas}
    onEditParc={editParc}
    onAddParc={addParc}
    onRemParc={remParc}
  />
  <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
    <Btn onClick={adicionarDivida} color="#059669">
      💾 Salvar Dívida{nd.parcelas.length > 0 ? ` (${nd.parcelas.length} parcela${nd.parcelas.length > 1 ? "s" : ""})` : nd.valor_total ? " (à vista)" : ""}
    </Btn>
    {(nd.custas || []).filter(c => c.descricao && c.valor && c.data).length > 0 && (
      <Btn onClick={() => adicionarCustasAvulsas((nd.custas || []).filter(c => c.descricao && c.valor && c.data))} color="#c2410c" outline>
        🏛 Salvar Só as Custas
      </Btn>
    )}
  </div>
</div>
```

**App.jsx import addition:**
```jsx
import DividaForm from "./components/DividaForm.jsx";
```

**Warning:** `adicionarDivida()` (lines 3201–3264) and handlers `ND`, `confirmarParcelas`, `editParc`, `addParc`, `remParc` remain in App.jsx unchanged. Only the JSX render block is replaced.

---

## Shared Patterns

### Toast notifications
**Source:** `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` line 2 + `DetalheDivida.jsx` line 2
**Apply to:** `NovaDivida.jsx`, `DividaForm.jsx` (if DividaForm ever needs to toast — avoid)
```jsx
import toast from "react-hot-toast";
// Success: toast.success("Mensagem")
// Error:   toast.error("Erro: " + e.message)
// Warning: toast("Mensagem", { icon: "⚠️" })
```

### Modal usage
**Source:** `src/mr-3/mr-cobrancas/src/components/ui/Modal.jsx` lines 1–54
**Apply to:** `NovaDivida.jsx` (for "Criar Pessoa Rápida")
```jsx
// Props: title (string), onClose (fn), children, width (number, default 560)
// Renders: fixed overlay with blur, fadeIn animation, scroll, green-tinted header
<Modal title="Criar Pessoa" onClose={handleClose} width={420}>
  {/* children rendered in padded body div */}
</Modal>
```

### Btn component
**Source:** `src/mr-3/mr-cobrancas/src/components/ui/Btn.jsx` lines 1–42
**Apply to:** All new components
```jsx
// Props: onClick, color (hex), outline (bool), danger (bool), disabled (bool), sm (bool), lime (bool)
// disabled applies opacity:.6 + cursor:not-allowed
// title prop (native HTML) works as tooltip for disabled state
<Btn color="#059669" disabled={!podesSalvar} title="Tooltip text">Label</Btn>
<Btn outline color="#64748b">Cancelar</Btn>
<Btn sm color="#059669">+ Nova Dívida</Btn>  {/* sm for header buttons */}
```

### Supabase DB helpers
**Source:** `src/mr-3/mr-cobrancas/src/config/supabase.js` (referenced in services)
**Apply to:** `NovaDivida.jsx` (via service imports, not direct)
```jsx
// Always use service layer, not sb() directly, EXCEPT for dbInsert("devedores", ...) in modal
import { criarDivida } from "../services/dividas.js";
import { adicionarParticipante } from "../services/devedoresDividas.js";
import { dbInsert } from "../config/supabase.js";  // only for "Criar Pessoa Rápida"
```

### Section header typography
**Source:** `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` lines 29–31
**Apply to:** All section headers in `NovaDivida.jsx`
```jsx
<p style={{ fontSize: 10, fontWeight: 800, color: "#7c3aed", textTransform: "uppercase", letterSpacing: ".05em", margin: 0 }}>
  Pessoas na Dívida
</p>
// OR for card titles (DetalheDivida.jsx pattern):
<p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>
  Section Title
</p>
```

### Async handler with loading state
**Source:** `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` lines 172–189 (`handleSalvar`)
**Apply to:** `NovaDivida.jsx` `handleSalvar` and `handleCriarPessoa`
```jsx
const [salvando, setSalvando] = useState(false);
async function handleSalvar() {
  setSalvando(true);
  try {
    // ... await operations
  } catch (e) {
    toast.error("Erro: " + e.message);
  } finally {
    setSalvando(false);  // always reset, even on error
  }
}
```

---

## No Analog Found

All files have close analogs. No entries.

---

## Critical Notes for Planner

### Alias constraint (highest risk)
The DB columns (`indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`) differ from motor aliases (`indexador`, `juros_am`, `multa_pct`, `honorarios_pct`). The `criarDivida()` payload must use **DB column names only**. The mapping back to aliases happens in `carregarTudo()` automatically (App.jsx ~line 8444–8453). Do NOT include both sets in the payload.

### Form state in App.jsx vs NovaDivida.jsx
`DividaForm` is a pure controlled component. The `nd` state and `ND()` handler in App.jsx remain untouched. `NovaDivida.jsx` owns its own separate `form` state initialized from `{ ...DIVIDA_VAZIA, credor_id: null, art523_opcao: "nao_aplicar" }`.

### adicionarParticipante behavior for new dividas
`adicionarParticipante()` calls `demoverPrincipalAtual(dividaId)` when `papel === "PRINCIPAL"`. For a brand-new dívida, there is no existing PRINCIPAL in `devedores_dividas`, so `demoverPrincipalAtual` runs but finds nothing — correct behavior, no workaround needed. (Verified: devedoresDividas.js lines 21–32, 71–83.)

### devedor_id desnormalizado
Use `pessoas.find(p => p.papel === "PRINCIPAL" && p.devedor_id != null)?.devedor_id` as the `devedor_id` field in the `dividas` payload. If somehow two Principals exist (invalid state), use `.find()` (first match).

### onCarregarTudo before onVoltar
Always `await onCarregarTudo()` before calling `onVoltar()`. Reversed order leaves sidebar badge and `allDividas` stale.

---

## Metadata

**Analog search scope:** `src/mr-3/mr-cobrancas/src/components/`, `src/mr-3/mr-cobrancas/src/services/`, `src/mr-3/mr-cobrancas/src/utils/`, `src/mr-3/mr-cobrancas/src/App.jsx`
**Files scanned:** 9 (ModuloDividas.jsx, DetalheDivida.jsx, DevedoresDaDivida.jsx, Modal.jsx, Btn.jsx, dividas.js, devedoresDividas.js, App.jsx, constants.js)
**Pattern extraction date:** 2026-04-20
