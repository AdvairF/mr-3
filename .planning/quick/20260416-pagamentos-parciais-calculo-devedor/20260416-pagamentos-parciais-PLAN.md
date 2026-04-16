---
phase: quick
slug: 20260416-pagamentos-parciais
task: pagamentos-parciais-calculo-devedor
status: planned
files:
  - src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql
  - src/mr-3/mr-cobrancas/src/App.jsx
autonomous: true
---

<objective>
Implement partial payments (pagamentos parciais) for the mr-cobrancas devedor ficha.

The feature covers:
1. SQL migration creating the `pagamentos_parciais` table with RLS policy.
2. `AbaPagamentosParciais` — a top-level React component (defined at line 1905, before `function Devedores`) that loads, adds, and deletes payments from Supabase, and generates an iterative landscape PDF spreadsheet.
3. Wiring of the new component into `Devedores` as a new "Pagamentos" tab (tab array at line 2460, tab panel after line 2823).

Output:
- `migration_pagamentos_parciais.sql` — run once in Supabase SQL Editor.
- Modified `App.jsx` — new component + tab wiring (~230 lines added).
</objective>

<context>
@src/mr-3/mr-cobrancas/src/App.jsx
@src/mr-3/mr-cobrancas/src/utils/correcao.js
@src/mr-3/mr-cobrancas/src/config/supabase.js

Key reference lines in App.jsx:
- Line 1: module-level imports — `fmt`, `fmtDate`, `calcularFatorCorrecao`, `calcularJurosAcumulados`, `dbGet`, `dbInsert`, `dbDelete` all available at module scope.
- Lines 1858–1904: `CustasAvulsasForm` — direct UI pattern reference (container, header, form row, empty state, footer with total).
- Lines 2697–2740: Parcelas table — pattern for displaying a saved-items list with delete button.
- Line 1905: blank line immediately before `function Devedores(...)` — insert `AbaPagamentosParciais` here.
- Line 2460: tab array `[["dados",...],["contatos",...],["dividas",...],["acordos",...],...]` — insert `["pagamentos","💰 Pagamentos"]` after `["dividas","💳 Dívidas"]`.
- Lines 2820–2823: end of `abaFicha === "dividas"` block (closing `</div>`, then `)}`) — tab panel for pagamentos goes immediately after line 2823.
- Lines 4337–4484: `exportarPDF()` — full landscape PDF pattern (jsPDF CDN load, header, table, totals row).

calcularFatorCorrecao signature (correcao.js:151–165):
  calcularFatorCorrecao(indexador, dataInicio, dataFim) → number (multiplier, e.g. 1.15)
  indexador: "igpm" | "ipca" | "selic" | "inpc" | "nenhum"
  dataInicio, dataFim: "YYYY-MM-DD"

calcularJurosAcumulados signature (correcao.js:127–149):
  calcularJurosAcumulados({ principal, dataInicio, dataFim, jurosTipo, jurosAM, regime }) → { juros, meses }
  regime: "simples" (used throughout App.jsx)

Devedor shape relevant fields:
  devedor.nome, devedor.id, devedor.credor_id, devedor.numero_processo
  devedor.dividas: Divida[]  (JSON parsed on load)

Divida shape relevant fields:
  divida.valor_total, divida.data_inicio_atualizacao, divida.data_vencimento
  divida.indexador, divida.juros_tipo, divida.juros_am, divida.multa_pct
  divida._nominal (boolean), divida._so_custas (boolean)

Supabase helpers (supabase.js:73–76):
  dbGet(table, query)      → GET /rest/v1/{table}?{query}
  dbInsert(table, body)    → POST (returns inserted row or array)
  dbDelete(table, id)      → DELETE /rest/v1/{table}?id=eq.{id}
</context>

<tasks>

<task type="auto" id="task-1">
  <name>Task 1: Create SQL migration file</name>
  <files>src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql</files>
  <action>
Create the file at `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql` with the following exact content — do not alter column names or types:

```sql
-- migration_pagamentos_parciais.sql
-- Run once in Supabase SQL Editor (Dashboard > SQL Editor > New query)

CREATE TABLE IF NOT EXISTS pagamentos_parciais (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  devedor_id     BIGINT NOT NULL REFERENCES devedores(id) ON DELETE CASCADE,
  data_pagamento DATE NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  observacao     TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_parciais_devedor
  ON pagamentos_parciais(devedor_id);

-- RLS: permissive policy matching pattern of other tables (anon key, no auth)
ALTER TABLE pagamentos_parciais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON pagamentos_parciais
  FOR ALL USING (true) WITH CHECK (true);
```

Note in the file header: this script is idempotent (IF NOT EXISTS). The developer must execute it in the Supabase SQL Editor for the project before testing the UI.
  </action>
  <verify>
    File `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql` exists and contains `CREATE TABLE IF NOT EXISTS pagamentos_parciais` and `CREATE POLICY "allow_all"`.
  </verify>
  <done>SQL file created, correct schema, RLS policy present.</done>
</task>

<task type="auto" id="task-2">
  <name>Task 2: Implement AbaPagamentosParciais component (insert at line 1905)</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Insert the complete `AbaPagamentosParciais` function immediately before line 1906 (`function Devedores(...)`), i.e., after the closing brace of `CustasAvulsasForm` at line 1904 and the blank line at 1905.

The insertion point in the file is the blank line between `}` (line 1904, end of CustasAvulsasForm) and `function Devedores` (line 1906). Add the following block there:

```jsx
// ═══════════════════════════════════════════════════════════════
// ABA PAGAMENTOS PARCIAIS — Cadastro + Cálculo Iterativo + PDF
// ═══════════════════════════════════════════════════════════════
function AbaPagamentosParciais({ devedor, onAtualizarDevedor, user, fmt, fmtDate }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [pagamentos, setPagamentos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [form, setForm] = useState({ data_pagamento: "", valor: "", observacao: "" });
  const F = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function carregar() {
    setCarregando(true);
    try {
      const rows = await dbGet("pagamentos_parciais", `devedor_id=eq.${devedor.id}&order=data_pagamento.asc`);
      setPagamentos(Array.isArray(rows) ? rows : []);
    } catch (e) {
      toast.error("Erro ao carregar pagamentos: " + e.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { if (devedor?.id) carregar(); }, [devedor?.id]);

  async function adicionarPagamento() {
    const { data_pagamento, valor, observacao } = form;
    if (!data_pagamento || !valor) {
      toast("Data e valor são obrigatórios.", { icon: "⚠️" });
      return;
    }
    const valorNum = parseFloat(valor);
    if (isNaN(valorNum) || valorNum <= 0) {
      toast("Valor deve ser maior que zero.", { icon: "⚠️" });
      return;
    }
    try {
      await dbInsert("pagamentos_parciais", {
        devedor_id: devedor.id,
        data_pagamento,
        valor: valorNum,
        observacao: observacao || null,
      });
      toast.success("Pagamento registrado.");
      setForm({ data_pagamento: "", valor: "", observacao: "" });
      await carregar();
    } catch (e) {
      toast.error("Erro ao salvar: " + e.message);
    }
  }

  async function excluirPagamento(id) {
    if (!window.confirm("Excluir este pagamento?")) return;
    try {
      await dbDelete("pagamentos_parciais", id);
      toast.success("Pagamento excluído.");
      await carregar();
    } catch (e) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  // ── PDF: Planilha de Pagamentos Parciais ──────────────────────
  async function gerarPlanilhaPDF() {
    if (pagamentos.length === 0) {
      toast("Adicione ao menos um pagamento antes de gerar a planilha.", { icon: "⚠️" });
      return;
    }

    // 1. Load jsPDF (CDN, same pattern as exportarPDF at line 4343)
    let jsPDF;
    try {
      if (window.jspdf?.jsPDF) {
        jsPDF = window.jspdf.jsPDF;
      } else {
        await new Promise((resolve, reject) => {
          if (document.querySelector('script[data-jspdf]')) { setTimeout(resolve, 500); return; }
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.setAttribute('data-jspdf', '1');
          s.onload = resolve; s.onerror = reject;
          document.head.appendChild(s);
        });
        jsPDF = window.jspdf?.jsPDF;
      }
      if (!jsPDF) throw new Error("Não foi possível carregar o jsPDF. Verifique sua conexão.");
    } catch (e) {
      toast.error("Erro ao carregar gerador de PDF: " + e.message);
      return;
    }

    try {
      // 2. Identify reference divida (first non-nominal, non-_so_custas)
      const dividas = Array.isArray(devedor.dividas) ? devedor.dividas : [];
      const divRef = dividas.find(d => !d._nominal && !d._so_custas) || dividas[0];

      if (!divRef) {
        toast.error("Devedor não possui dívidas cadastradas para cálculo.");
        return;
      }

      // 3. Aggregate principal across all non-nominal, non-_so_custas dividas
      const dividasCalc = dividas.filter(d => !d._nominal && !d._so_custas);
      const PV = dividasCalc.reduce((s, d) => s + (parseFloat(d.valor_total) || 0), 0);
      const dataInicioGlobal = divRef.data_inicio_atualizacao || divRef.data_vencimento || divRef.data_origem;

      const indexador = divRef.indexador || "nenhum";
      const jurosTipo = divRef.juros_tipo || "sem_juros";
      const jurosAM = parseFloat(divRef.juros_am) || 0;
      const multaPct = parseFloat(divRef.multa_pct) || 0;

      // 4. Iterative calculation across sorted payments
      const pgtos = [...pagamentos].sort((a, b) => a.data_pagamento.localeCompare(b.data_pagamento));

      let saldo = PV;
      let periodoInicio = dataInicioGlobal;
      let primeiroperiodo = true;
      const rows = [];

      // Opening row
      rows.push({
        data: fmtDate(dataInicioGlobal),
        desc: "Saldo inicial / abertura",
        debito: PV,
        credito: 0,
        saldo: PV,
        isOpening: true,
      });

      for (const pgto of pgtos) {
        const periodoFim = pgto.data_pagamento;

        // Skip if period has no duration (same-day)
        if (periodoFim <= periodoInicio) {
          // Still record the payment credit
          rows.push({
            data: fmtDate(pgto.data_pagamento),
            desc: pgto.observacao || "Pagamento parcial",
            debito: 0,
            credito: pgto.valor,
            saldo: saldo - pgto.valor,
          });
          saldo = saldo - pgto.valor;
          continue;
        }

        // Monetary correction
        const fator = calcularFatorCorrecao(indexador, periodoInicio, periodoFim);
        const corrAbs = saldo * (fator - 1);
        const pcSaldo = saldo + corrAbs;

        // Interest on corrected balance
        const { juros } = calcularJurosAcumulados({
          principal: pcSaldo,
          dataInicio: periodoInicio,
          dataFim: periodoFim,
          jurosTipo,
          jurosAM,
          regime: "simples",
        });

        // Multa: one-time, first period only
        const multaVal = primeiroperiodo ? pcSaldo * (multaPct / 100) : 0;

        const debitoTotal = pcSaldo + juros + multaVal;

        // Row: accrual
        const descricaoAtualizacao = [
          corrAbs > 0 ? `Correção monetária (${indexador.toUpperCase()})` : null,
          juros > 0 ? `Juros (${jurosAM}% a.m.)` : null,
          multaVal > 0 ? `Multa (${multaPct}%)` : null,
        ].filter(Boolean).join(" + ") || "Atualização do saldo";

        rows.push({
          data: fmtDate(periodoFim),
          desc: descricaoAtualizacao,
          debito: debitoTotal - saldo,  // only the accrued charges, not the principal
          credito: 0,
          saldo: debitoTotal,
        });

        // Row: payment credit
        const saldoAposPgto = debitoTotal - pgto.valor;
        rows.push({
          data: fmtDate(pgto.data_pagamento),
          desc: pgto.observacao || "Pagamento parcial",
          debito: 0,
          credito: pgto.valor,
          saldo: saldoAposPgto,
        });

        saldo = saldoAposPgto;
        periodoInicio = periodoFim;
        primeiroperiodo = false;
      }

      // Final period: last payment date → today
      const dataHoje = hoje;
      if (periodoInicio < dataHoje) {
        const fatorFinal = calcularFatorCorrecao(indexador, periodoInicio, dataHoje);
        const corrFinal = saldo * (fatorFinal - 1);
        const pcFinal = saldo + corrFinal;
        const { juros: jurosFinal } = calcularJurosAcumulados({
          principal: pcFinal,
          dataInicio: periodoInicio,
          dataFim: dataHoje,
          jurosTipo,
          jurosAM,
          regime: "simples",
        });
        const debitoFinal = pcFinal + jurosFinal;
        const descFinal = [
          corrFinal > 0 ? `Correção ${indexador.toUpperCase()}` : null,
          jurosFinal > 0 ? `Juros ${jurosAM}% a.m.` : null,
        ].filter(Boolean).join(" + ") || "Atualização até hoje";
        rows.push({ data: fmtDate(dataHoje), desc: descFinal, debito: debitoFinal - saldo, credito: 0, saldo: debitoFinal });
        saldo = debitoFinal;
      }

      // 5. Build PDF — landscape A4
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth(); // 297
      const W2 = W - 28; // 269

      // ── Header ──
      doc.setFillColor(22, 163, 74); // green #16a34a
      doc.rect(0, 0, W, 20, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13); doc.setFont("helvetica", "bold");
      doc.text("PLANILHA DE PAGAMENTOS PARCIAIS", 14, 13);
      doc.setFontSize(8); doc.setFont("helvetica", "normal");
      doc.text("MR COBRANÇAS", W - 14, 13, { align: "right" });
      doc.setTextColor(0, 0, 0);

      let y = 28;

      // ── Devedor / Credor / Processo ──
      const half = (W2 / 2) - 3;
      doc.setFillColor(220, 252, 231); // #dcfce7
      doc.rect(14, y - 5, half, 16, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(21, 128, 61);
      doc.text("DEVEDOR", 16, y - 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text(devedor.nome || "Não informado", 16, y + 6);

      const x2 = 14 + half + 6;
      doc.setFillColor(220, 252, 231);
      doc.rect(x2, y - 5, half, 16, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(21, 128, 61);
      doc.text("PROCESSO / REFERÊNCIA", x2 + 2, y - 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text(devedor.numero_processo || "—", x2 + 2, y + 6);
      y += 20;

      // ── Resumo executivo box ──
      const totalPago = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);
      doc.setFillColor(187, 247, 208); // #bbf7d0
      doc.rect(14, y - 5, W2, 18, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(21, 128, 61);
      doc.text("RESUMO EXECUTIVO", 16, y - 1);
      const resumoItems = [
        ["Valor Original", fmt(PV)],
        ["Total Pago", fmt(totalPago)],
        ["SALDO DEVEDOR ATUAL", fmt(saldo)],
      ];
      const cellW = W2 / resumoItems.length;
      resumoItems.forEach(([label, valor], ri) => {
        const rx = 14 + ri * cellW + 2;
        const isLast = ri === resumoItems.length - 1;
        doc.setFont("helvetica", "bold"); doc.setFontSize(isLast ? 9 : 7);
        doc.setTextColor(isLast ? 22 : 21, isLast ? 101 : 128, isLast ? 52 : 61);
        doc.text(label, rx, y + 5);
        doc.setFontSize(isLast ? 11 : 9);
        doc.text(valor, rx, y + 12);
      });
      y += 24;

      // ── Table ──
      const cols = ["DATA", "DESCRIÇÃO / EVENTO", "DÉBITO", "CRÉDITO", "SALDO"];
      const colW = [24, 105, 40, 40, 60]; // sum = 269 = W2

      // Header row
      let x = 14;
      doc.setFillColor(187, 247, 208);
      doc.rect(14, y - 4, W2, 7, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(21, 128, 61);
      cols.forEach((c, ci) => {
        if (ci === 0) doc.text(c, x + 1, y);
        else doc.text(c, x + colW[ci] - 1, y, { align: "right" });
        x += colW[ci];
      });
      y += 6;

      // Data rows
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(0, 0, 0);
      rows.forEach((row, ri) => {
        if (ri % 2 === 0) { doc.setFillColor(240, 253, 244); doc.rect(14, y - 3.5, W2, 5.5, "F"); }
        x = 14;
        const vals = [
          row.data,
          row.desc,
          row.debito > 0 ? fmt(row.debito) : "—",
          row.credito > 0 ? fmt(row.credito) : "—",
          fmt(row.saldo),
        ];
        vals.forEach((v, vi) => {
          const mw = colW[vi] - 2;
          if (vi === 0 || vi === 1) doc.text((doc.splitTextToSize(String(v), mw)[0] || ""), x + 1, y);
          else doc.text((doc.splitTextToSize(String(v), mw)[0] || ""), x + colW[vi] - 1, y, { align: "right" });
          x += colW[vi];
        });
        y += 5.5;
        if (y > 185) { doc.addPage(); y = 15; }
      });

      // Final saldo row (indigo/purple, white text)
      y += 2;
      doc.setFillColor(79, 70, 229);
      doc.rect(14, y - 4, W2, 8, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text("SALDO DEVEDOR ATUALIZADO", 15, y);
      doc.text(fmt(saldo), W - 14 - 1, y, { align: "right" });
      y += 12;

      // ── Footer ──
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 116, 139);
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} · Índice: ${indexador.toUpperCase()} · Juros: ${jurosAM}% a.m. · Multa (1ª vez): ${multaPct}%`, 14, y);

      doc.save(`planilha-pagamentos-${devedor.nome.replace(/\s+/g, "-")}.pdf`);
      logAudit("Gerou planilha PDF de pagamentos parciais", "pagamentos_parciais", { devedor: devedor.nome, saldo });

    } catch (e) {
      toast.error("Erro ao gerar planilha PDF: " + e.message);
    }
  }

  const totalPago = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0);

  return (
    <div style={{ background: "#f0fdf4", borderRadius: 14, padding: 16, border: "1.5px solid #bbf7d0", marginTop: 8 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div>
          <p style={{ fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 13, color: "#15803d" }}>💰 Pagamentos Parciais</p>
          <p style={{ fontSize: 11, color: "#166534", marginTop: 2 }}>Registre pagamentos e gere planilha com saldo devedor atualizado</p>
        </div>
        <button
          onClick={gerarPlanilhaPDF}
          style={{ background: "#15803d", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
        >
          📄 Planilha PDF
        </button>
      </div>

      {/* Add payment form */}
      <div style={{ background: "#dcfce7", borderRadius: 10, padding: 12, marginBottom: 14, border: "1px solid #bbf7d0" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#15803d", marginBottom: 8 }}>+ Novo Pagamento</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 8, alignItems: "center" }}>
          <input
            type="date"
            value={form.data_pagamento}
            onChange={e => F("data_pagamento", e.target.value)}
            style={{ padding: "7px 9px", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "Plus Jakarta Sans" }}
          />
          <input
            type="number"
            placeholder="Valor (R$)"
            value={form.valor}
            onChange={e => F("valor", e.target.value)}
            min="0"
            step="0.01"
            style={{ padding: "7px 9px", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "Plus Jakarta Sans" }}
          />
          <input
            type="text"
            placeholder="Observação (opcional)"
            value={form.observacao}
            onChange={e => F("observacao", e.target.value)}
            style={{ padding: "7px 9px", border: "1.5px solid #bbf7d0", borderRadius: 8, fontSize: 12, outline: "none", fontFamily: "Plus Jakarta Sans" }}
          />
          <button
            onClick={adicionarPagamento}
            style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}
          >
            Salvar
          </button>
        </div>
      </div>

      {/* Pagamentos list */}
      {carregando ? (
        <p style={{ fontSize: 12, color: "#15803d", opacity: 0.6, textAlign: "center", padding: "8px 0" }}>Carregando...</p>
      ) : pagamentos.length === 0 ? (
        <p style={{ fontSize: 12, color: "#15803d", opacity: 0.6, textAlign: "center", padding: "8px 0" }}>
          Nenhum pagamento registrado. Adicione o primeiro pagamento acima.
        </p>
      ) : (
        <div style={{ maxHeight: 240, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead>
              <tr style={{ background: "#bbf7d0" }}>
                {["Data", "Valor", "Observação", ""].map(h => (
                  <th key={h} style={{ padding: "5px 8px", textAlign: "left", color: "#166534", fontWeight: 700, fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pagamentos.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #dcfce7" }}>
                  <td style={{ padding: "5px 8px", color: "#374151" }}>{fmtDate(p.data_pagamento)}</td>
                  <td style={{ padding: "5px 8px", color: "#16a34a", fontWeight: 700 }}>{fmt(parseFloat(p.valor))}</td>
                  <td style={{ padding: "5px 8px", color: "#64748b" }}>{p.observacao || "—"}</td>
                  <td style={{ padding: "5px 8px" }}>
                    <button
                      aria-label="Excluir pagamento"
                      onClick={() => excluirPagamento(p.id)}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11 }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer: total */}
      {pagamentos.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: "1px dashed #bbf7d0" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#15803d" }}>
            Total pago: {fmt(totalPago)}
          </span>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {pagamentos.length} pagamento{pagamentos.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}
    </div>
  );
}
```

IMPORTANT: `fmt` and `fmtDate` are module-level imports from `./utils/formatters.js` (line 10 of App.jsx) AND are also passed as props per the CONTEXT.md decision. The component uses the props `fmt` and `fmtDate` as received. `calcularFatorCorrecao`, `calcularJurosAcumulados`, `logAudit`, `dbGet`, `dbInsert`, `dbDelete`, `toast` are all module-level and accessed directly (no props needed).

Note on the `debito` calculation in the accrual row: the displayed debit is the increment (charges only), not the full running total, to make the spreadsheet ledger-style. The `saldo` column carries the full outstanding balance.
  </action>
  <verify>
    App.jsx compiles (no syntax errors): run `node --input-type=module &lt; /dev/null` or open browser dev console.
    Specifically: `AbaPagamentosParciais` appears before `function Devedores` in the file, has no unclosed JSX, and the `CustasAvulsasForm` closing brace at line 1904 is still intact.
  </verify>
  <done>
    AbaPagamentosParciais function defined in App.jsx before line 1906, with full CRUD (load/add/delete), PDF generation, and green-themed UI.
  </done>
</task>

<task type="auto" id="task-3">
  <name>Task 3: Wire Pagamentos tab into Devedores component (App.jsx)</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Two edits inside the `function Devedores` body. After completing Task 2, line numbers will have shifted by the number of lines inserted. Use the content/context patterns below to find insertion points precisely — do not rely on absolute line numbers after Task 2 edits.

### Edit 3a — Add tab entry to the tab array

Find this line (currently line 2460, will be shifted after Task 2):
```jsx
{[["dados", "📋 Dados"], ["contatos", "📞 Contatos"], ["dividas", "💳 Dívidas"], ["acordos", "🤝 Acordos"], ["processos", "⚖️ Processos"], ["relatorio", "📊 Relatório"]].map(([id, label]) => (
```

Replace it with (adding `["pagamentos","💰 Pagamentos"]` after `["dividas","💳 Dívidas"]`):
```jsx
{[["dados", "📋 Dados"], ["contatos", "📞 Contatos"], ["dividas", "💳 Dívidas"], ["pagamentos", "💰 Pagamentos"], ["acordos", "🤝 Acordos"], ["processos", "⚖️ Processos"], ["relatorio", "📊 Relatório"]].map(([id, label]) => (
```

### Edit 3b — Add tab panel for pagamentos

Find this block (immediately after the dividas tab panel ends and before the acordos comment):
```jsx
          {/* ABA ACORDOS */}

          {/* ABA ACORDOS */}
          {abaFicha === "acordos" && (
```

Insert between the closing `)}` of the dividas block and this comment the following panel:
```jsx
          {/* ABA PAGAMENTOS PARCIAIS */}
          {abaFicha === "pagamentos" && (
            <AbaPagamentosParciais
              devedor={sel}
              onAtualizarDevedor={onAtualizarDevedor}
              user={user}
              fmt={fmt}
              fmtDate={fmtDate}
            />
          )}
```

To locate precisely: search for the text `{/* ABA ACORDOS */}` — the first occurrence of this comment marks the insert point. Place the pagamentos panel block immediately before the first `{/* ABA ACORDOS */}` comment.

The result should be:
```
          )}   {/* end dividas panel */}

          {/* ABA PAGAMENTOS PARCIAIS */}
          {abaFicha === "pagamentos" && (
            <AbaPagamentosParciais
              devedor={sel}
              onAtualizarDevedor={onAtualizarDevedor}
              user={user}
              fmt={fmt}
              fmtDate={fmtDate}
            />
          )}

          {/* ABA ACORDOS */}

          {/* ABA ACORDOS */}
          {abaFicha === "acordos" && (
```

Note: the duplicate `{/* ABA ACORDOS */}` comment is already present in the original file (lines 2825 and 2827) — do not remove it, just insert above the first one.
  </action>
  <verify>
    1. In browser: open any devedor ficha → confirm "💰 Pagamentos" tab appears in the tab bar between "💳 Dívidas" and "🤝 Acordos".
    2. Click the tab → `AbaPagamentosParciais` renders (green container, "+ Novo Pagamento" form visible).
    3. No console errors on tab click.
  </verify>
  <done>
    Tab "💰 Pagamentos" appears in ficha tab bar and renders AbaPagamentosParciais on click, passing devedor, onAtualizarDevedor, user, fmt, fmtDate as props.
  </done>
</task>

</tasks>

<commit_strategy>
Two commits, in order:

**Commit 1** — SQL migration only:
```
git add src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql
git commit -m "feat(pagamentos-parciais): add SQL migration for pagamentos_parciais table"
```

**Commit 2** — App.jsx changes (component + wiring):
```
git add src/mr-3/mr-cobrancas/src/App.jsx
git commit -m "feat(pagamentos-parciais): implement AbaPagamentosParciais component and tab wiring

- AbaPagamentosParciais top-level component (before function Devedores)
  - Load pagamentos via dbGet on mount
  - Add/delete payments with validation and toast feedback
  - gerarPlanilhaPDF(): iterative calculation (correction + juros simples, multa 1st period only)
  - Landscape PDF: DATA|DESCRIÇÃO|DÉBITO|CRÉDITO|SALDO columns, green theme
- Tab wiring: 'pagamentos' entry added to tab array, panel inserted before acordos"
```
</commit_strategy>

<developer_setup>
Before testing the UI, run the SQL migration in Supabase:

1. Open Supabase Dashboard → SQL Editor → New query.
2. Paste and run the full contents of `src/mr-3/mr-cobrancas/migration_pagamentos_parciais.sql`.
3. Verify: Table `pagamentos_parciais` appears in the Table Editor with columns `id`, `devedor_id`, `data_pagamento`, `valor`, `observacao`, `created_at`.
4. Verify RLS policy "allow_all" is listed under the table's RLS policies.

If the project uses a different Supabase project than what is in `.env`, make sure to run the migration in the correct project.
</developer_setup>

<verification>
End-to-end verification checklist (manual, in browser after both commits and migration):

1. CRUD
   - Open a devedor ficha with at least one non-nominal dívida.
   - Click "💰 Pagamentos" tab.
   - Add a payment: fill date, valor, observação → click "Salvar" → toast.success appears, payment appears in the list.
   - Verify list shows date, valor in green, observação, and ✕ button.
   - Delete the payment: click ✕ → confirm dialog → payment disappears.

2. PDF generation
   - Add 2–3 payments to the same devedor.
   - Click "📄 Planilha PDF" button.
   - PDF downloads. Open it and verify:
     - Header is green with "PLANILHA DE PAGAMENTOS PARCIAIS".
     - Devedor name and process number in the header boxes.
     - Resumo executivo box shows Valor Original, Total Pago, SALDO DEVEDOR ATUAL.
     - Table rows: opening row, accrual row per period, payment credit row per payment, final accrual to today.
     - SALDO DEVEDOR ATUALIZADO row in indigo/purple at bottom.
     - Footer shows index, juros, multa parameters.

3. Edge cases
   - Devedor with no dívidas: clicking "📄 Planilha PDF" shows toast.error "Devedor não possui dívidas".
   - No payments: clicking "📄 Planilha PDF" shows toast warning "Adicione ao menos um pagamento".
   - Same-date payments: no crash, payment credit row appears without accrual row.
</verification>

<acceptance_criteria>
1. SQL file `migration_pagamentos_parciais.sql` exists with correct schema and RLS policy.
2. `AbaPagamentosParciais` is defined as a top-level function in App.jsx before `function Devedores`, receives props `{ devedor, onAtualizarDevedor, user, fmt, fmtDate }`.
3. "💰 Pagamentos" tab appears in the devedor ficha tab bar between "💳 Dívidas" and "🤝 Acordos".
4. Payment CRUD works: add via form (date + valor required validation), list shows with delete, all changes reflected via Supabase `pagamentos_parciais` table.
5. PDF button generates landscape A4 with 5-column ledger (DATA | DESCRIÇÃO / EVENTO | DÉBITO | CRÉDITO | SALDO), iterative calculation applying monetary correction + simple interest per period and multa only in the first period, final saldo row in indigo.
</acceptance_criteria>
