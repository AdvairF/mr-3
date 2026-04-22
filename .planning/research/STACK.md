# Technology Stack — v1.4 Pagamentos por Contrato + PDF Demonstrativo

**Project:** Mr. Cobranças
**Milestone:** v1.4
**Researched:** 2026-04-22
**Scope:** Additions only — existing React 18 + Vite 8 + Supabase (no-backend SPA) stack is locked.

---

## Recommendation Summary

Add exactly two runtime packages:

```bash
# inside src/mr-3/mr-cobrancas/
npm install jspdf@4.2.1 jspdf-autotable@5.0.7
```

No vite.config.js changes needed. No polyfills needed. No other packages.

The amortization logic for F1/F2 (PAGCON-01 through PAGCON-04) requires **zero new libraries** — it is pure arithmetic that extends the existing `devedorCalc.js` pattern. The "Valor Atualizado" per parcela is already computable with `devedorCalc.js` by passing each parcela's own `data_vencimento`, `indexador`, `juros_am_percentual`, etc., and computing up to `today`.

---

## Library Analysis: PDF Generation

### Candidate 1: jsPDF + jsPDF-AutoTable (RECOMMENDED)

**Versions:** jsPDF 4.2.1, jsPDF-AutoTable 5.0.7 (latest as of 2026-04-22)

**Why this wins for this project:**

jsPDF is a pure ES module with no Node.js dependencies and no `Buffer`/`stream` polyfills required. Vite 8 handles its ESM bundle natively without any vite.config.js modifications. The library has had Vite-native ESM output since v2.5 and currently ships a clean `/dist/jspdf.es.min.js` entry point that Vite tree-shakes correctly.

jsPDF-AutoTable is the critical differentiator. The PDF-02 requirement is a multi-column judicial table (# | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo) with per-row totals and a footer. AutoTable delivers this in ~15 lines of JS: column definitions, a body array, `headStyles`, `columnStyles` for right-aligned currency columns, and a `didDrawPage` hook for page headers and page-number footers. This is not a "nice to have" — building an equivalent table layout manually in pdf-lib would require 150–200 lines of coordinate arithmetic.

AutoTable also handles pagination transparently: if the parcelas table overflows one A4 page, AutoTable inserts new pages and reprints the column header automatically. This is essential for contracts with many parcelas (common in installment debt collections).

The `willDrawPage`/`didDrawPage` hooks are exactly what is needed for the judicial header (escritório name, OAB number, case reference) that must appear on every page.

**PT-BR characters (ç, ã, õ, é):** The standard 14 PDF fonts do not cover Latin Extended-B. jsPDF requires a custom TTF font for correct rendering of Portuguese characters. The solution is to fetch a Google Fonts TTF at runtime (e.g., Roboto or Noto Sans from the CDN or from the project's `public/` folder) and register it via `doc.addFileToVFS` + `doc.addFont`. This is a one-time setup, ~10 lines, documented and verified in jsPDF official docs.

**Bundle size:** jsPDF ESM min is ~290 KB. AutoTable adds ~45 KB. Total ~335 KB gzipped is acceptable for a SPA used by lawyers on desktops — this is not a consumer mobile app.

**Confidence: HIGH** — verified against Context7/official jsPDF docs and npm registry.

---

### Candidate 2: pdf-lib (NOT RECOMMENDED)

**Version:** 1.17.1

pdf-lib excels at modifying existing PDFs — loading a template, filling fields, saving. It has no table primitive: every cell border, every text placement, every row is positioned manually with `page.drawRectangle()` + `page.drawText()` at exact x/y coordinates. Building the judicial table required by PDF-02 from scratch would require several hundred lines of coordinate math, manual line wrapping, manual pagination detection, and manual page-number insertion. This is disproportionate effort compared to AutoTable.

pdf-lib's font embedding is more ergonomic than jsPDF (no base64 conversion required — you pass an ArrayBuffer directly), but that single advantage does not outweigh the absence of a table engine.

Use case where pdf-lib would win: modifying a pre-built PDF template (e.g., a court form with fillable fields). That is not what PDF-02 requires.

**Confidence: HIGH**

---

### Candidate 3: @react-pdf/renderer (NOT RECOMMENDED)

**Version:** 4.5.1

@react-pdf/renderer is a React renderer that compiles JSX to PDF via a Yoga layout engine and a custom text engine. It produces beautiful, print-ready PDFs with a component model familiar to React developers.

However, it has two blockers for this project:

1. **Vite bundle complexity.** The renderer depends on `canvas`, `fontkit`, `linebreak`, and `blob-stream` — all Node.js-origin packages. Vite 8 requires explicit `optimizeDeps.exclude` and `build.commonjsOptions` configuration to bundle it correctly. The official react-pdf repo ships a Vite example that documents these workarounds, but they are non-trivial and fragile across Vite major versions. Given that this project has a `prebuild` gate that must pass cleanly on every build, adding a package with known bundler friction is a risk.

2. **Bundle size.** @react-pdf/renderer adds ~800 KB minified. For a SPA that will load this on the click of a single button, this is significant overhead.

The output quality is higher than jsPDF, but PDF-02's judicial format (simple header + table + totals + footer) does not require the typographic precision that react-pdf provides. The added complexity is unjustified.

**Confidence: HIGH**

---

## Vite Integration

### jsPDF + AutoTable: zero Vite config changes needed

jsPDF 4.x ships a proper ESM export (`"module"` field in package.json pointing to `dist/jspdf.es.min.js`). Vite 8 resolves ESM packages natively. No `optimizeDeps`, no `resolve.alias`, no `define`, no `plugins` addition required.

jsPDF-AutoTable 5.x is also ESM-first. The functional import pattern (`import { autoTable } from 'jspdf-autotable'`) works cleanly with Vite's module resolution.

**The one gotcha to document:** On Windows development machines (like this project's env), jsPDF's `doc.save('file.pdf')` triggers a browser download using `FileSaver.js` (bundled inside jsPDF). This works correctly in Chrome/Firefox. In Vite's dev server (`localhost:3000`), the download will proceed via `bloburl` → `<a download>` — no special config needed.

### Font asset handling

The PT-BR font TTF should be placed in `src/mr-3/mr-cobrancas/public/fonts/` and fetched at PDF generation time:

```js
const fontResponse = await fetch('/fonts/NotoSans-Regular.ttf');
const fontBuffer = await fontResponse.arrayBuffer();
const fontBase64 = btoa(String.fromCharCode(...new Uint8Array(fontBuffer)));
doc.addFileToVFS('NotoSans-Regular.ttf', fontBase64);
doc.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
doc.setFont('NotoSans');
```

Vite serves everything in `public/` at the root path without hashing. This means the font URL is stable between builds — no import resolution needed, no Vite plugin needed.

**Alternative (no network request):** Convert the TTF to base64 at build time and import it as a JS constant. This eliminates the async fetch but adds ~100 KB to the bundle as a string literal. Given that this font is only loaded when generating a PDF, the fetch approach is preferable — lazy-loads the font only when needed.

---

## Supporting Libs: Currency Formatting

**No new library needed.**

The existing `formatters.js` (confirmed in v1.1 STACK.md) already exports `fmt()` and `fmtBRL()` using `Intl.NumberFormat("pt-BR", {style:"currency", currency:"BRL"})`. Use these same functions to format all monetary values before passing them as strings to AutoTable's `body` array.

```js
// Inside gerarPDF():
const body = parcelas.map(p => [
  p.numero,
  fmtDate(p.data_vencimento),
  fmtBRL(p.valor_original),
  fmtBRL(calcularValorAtualizado(p)),   // devedorCalc.js, see below
  fmtBRL(p.valor_pago ?? 0),
  fmtBRL(calcularSaldo(p)),
]);
```

AutoTable receives pre-formatted strings. No number formatting happens inside the PDF generation layer. This is the correct separation of concerns.

---

## Amortization Logic: No New Library

The amortization for PAGCON-01/PAGCON-02 (Art. 354 CC across parcelas of a contract) requires no new library. The existing `devedorCalc.js` already implements Art. 354 sequential allocation. The new logic is:

1. Fetch parcelas ordered by `data_vencimento ASC` (oldest first — Art. 354 requires this).
2. For each parcela compute its `valor_atualizado` by calling the existing calc engine with the parcela's own encargos fields up to `today`.
3. Apply the payment amount greedily to parcelas in order: subtract from `valor_atualizado`, mark as `saldo_quitado = true` if fully covered, carry remainder to next parcela.
4. Record each affected parcela's `id` and amount applied in `pagamentos_divida`.
5. Insert one row in `contratos_historico` with `tipo_evento = 'pagamento_recebido'` and a JSON snapshot.

This is pure arithmetic. No library needed. The implementation belongs in a new `src/services/amortizacao.js` file (or as a function exported from the existing `devedorCalc.js`) that the phase implementer writes.

**"Valor Atualizado" per parcela:** Each parcela is a row in `dividas` with its own `data_vencimento`, `indice_correcao`, `juros_am_percentual`, `multa_percentual`, `honorarios_percentual`. The existing `devedorCalc.js` computes the updated value for any such record up to any target date. Call it per-parcela with `dataBase = today`. No new library.

---

## What NOT to Add

| Item | Why not |
|------|---------|
| `html2pdf.js` | Converts DOM to canvas to PDF — output is a rasterized image, not searchable text. A judicial PDF must have selectable text so courts can copy values. Hard no. |
| `pdfmake` | Mature alternative to jsPDF+AutoTable, but uses a custom JSON document definition language and ships its own font VFS system. The learning curve is not justified when AutoTable already provides exactly what is needed. |
| `@react-pdf/renderer` | Vite bundler friction, large bundle, no advantage over jsPDF+AutoTable for this use case. Detailed analysis above. |
| `pdf-lib` | No table engine. Would require 200+ lines of manual coordinate layout. Detailed analysis above. |
| `date-fns` / `dayjs` | Existing codebase uses native `Date` and `toISOString().slice(0,10)`. Do not introduce a date library now — it creates two competing date-handling styles. The amortization logic only needs date comparison (`isAfter`, `isBefore`) and `Date.now()` — trivially done with native JS. |
| `decimal.js` / `big.js` | Existing `devedorCalc.js` uses `parseFloat` throughout. The DB stores `NUMERIC(15,2)`. Introducing a decimal library requires migrating all existing calc code — out of scope and unjustified for legal precision at this scale. |
| Supabase Edge Functions | No server-side PDF rendering needed or wanted. The SPA constraint is intentional (see PROJECT.md). All PDF logic runs client-side. |
| A dedicated "amortization library" (e.g., `financial`, `loan-amortization`) | These libraries model loan amortization (PMT, IRR, NPV). The project's amortization is Art. 354 CC sequential payment allocation — a different algorithm. `devedorCalc.js` already encodes the correct legal logic. Do not import generic finance libraries that embed different assumptions. |

---

## Install Commands

```bash
# Run from: src/mr-3/mr-cobrancas/
npm install jspdf@4.2.1 jspdf-autotable@5.0.7
```

No changes to `vite.config.js`.

Add font file:
```
src/mr-3/mr-cobrancas/public/fonts/NotoSans-Regular.ttf
```
(Download from Google Fonts — free, OFL licensed, safe for judicial documents.)

---

## Sources

- Context7 / jsPDF official docs: https://context7.com/parallax/jspdf/llms.txt
- Context7 / jsPDF-AutoTable official docs: https://context7.com/simonbengtsson/jspdf-autotable/llms.txt
- Context7 / pdf-lib official docs: https://context7.com/hopding/pdf-lib/llms.txt
- Context7 / react-pdf official docs: https://context7.com/diegomura/react-pdf/llms.txt
- npm registry versions verified 2026-04-22: jsPDF 4.2.1, jsPDF-AutoTable 5.0.7, pdf-lib 1.17.1, @react-pdf/renderer 4.5.1
- Existing project STACK.md (v1.1): confirmed formatters.js exports, devedorCalc.js interface, sb() wrapper pattern
- PROJECT.md (v1.4): confirmed SPA constraint, no TypeScript, Vercel deploy, prebuild gate
