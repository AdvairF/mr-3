---
quick_id: 260417-ttn
phase: quick-260417-ttn
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mr-3/mr-cobrancas/src/App.jsx
autonomous: true
requirements:
  - AJUSTE-01-art523-reload-apos-save
  - AJUSTE-02-badge-art523-dividas
  - AJUSTE-03-edicao-inline-pagamentos

must_haves:
  truths:
    - "Após salvar dívida com art523_opcao alterado, o valor no painel Devedores reflete o novo cálculo imediatamente (sem F5)"
    - "Cada card de dívida detalhada mostra badge visual quando art523_opcao é 'so_multa' ou 'multa_honorarios'"
    - "Usuário pode clicar numa linha de pagamento parcial e editar data/valor/observação inline, com botões ✅ Salvar e ❌ Cancelar"
    - "Salvar edição de pagamento atualiza a tabela pagamentos_parciais no Supabase via dbUpdate"
    - "Pagamentos com null/undefined art523_opcao são tratados como 'nao_aplicar' (sem migração de dados)"
  artifacts:
    - path: "src/mr-3/mr-cobrancas/src/App.jsx"
      provides: "salvarEdicaoDivida com reload forçado via dbGet; badge Art.523 no card de dívida; AbaPagamentosParciais com edição inline (editPgtoId + editPgtoForm + salvarEdicaoPagamento)"
      contains: "dbGet(\"devedores\""
  key_links:
    - from: "salvarEdicaoDivida (App.jsx ~L3495)"
      to: "Supabase devedores table"
      via: "dbGet após dbUpdate"
      pattern: "dbGet\\(\"devedores\""
    - from: "card de dívida (App.jsx ~L3847)"
      to: "art523_opcao no JSONB da dívida"
      via: "renderização condicional de badge"
      pattern: "art523_opcao.*!==.*nao_aplicar"
    - from: "AbaPagamentosParciais row onClick"
      to: "dbUpdate(\"pagamentos_parciais\", id, body)"
      via: "salvarEdicaoPagamento"
      pattern: "dbUpdate\\(\"pagamentos_parciais\""
---

<objective>
Três ajustes no módulo Devedores do Mr. Cobranças:

1. **Ajuste 1 — Art.523 não altera valor no painel:** Após `salvarEdicaoDivida`, forçar reload do devedor via `dbGet` do Supabase e atualizar state, garantindo que `dividas` JSONB esteja íntegro e o cálculo `calcularSaldoDevedorAtualizado` reflita o novo `art523_opcao` imediatamente.
2. **Ajuste 2 — Badge Art.523 nas dívidas detalhadas:** Inserir badge visual (pill vermelho) em cada card de dívida quando `art523_opcao` for `so_multa` ou `multa_honorarios`, com tooltip explicativo.
3. **Ajuste 3 — Edição inline de pagamentos parciais:** Permitir editar `data_pagamento`, `valor`, `observacao` de um pagamento clicando na linha (padrão `editPgtoId`), com inputs inline, botões ✅ Salvar / ❌ Cancelar, validação básica (valor > 0, data não vazia) e `dbUpdate` em `pagamentos_parciais`.

Purpose: Fechar gaps percebidos pelo usuário no fluxo de gestão de devedores — Art.523 visualmente integrado e pagamentos editáveis sem necessidade de excluir+recriar.

Output: `App.jsx` modificado em 3 regiões (L3495-ish, L3847-ish, L2458-ish), sem novos arquivos.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260417-ttn-ajustes-modulo-devedor-art523-dividas-pa/260417-ttn-CONTEXT.md
@.planning/quick/260417-ttn-ajustes-modulo-devedor-art523-dividas-pa/260417-ttn-RESEARCH.md

# Load-bearing code locations (confirmed via RESEARCH.md):
# - App.jsx L146 (devedorCalc.js): calcularSaldoDevedorAtualizado já aplica art523_opcao corretamente
# - App.jsx L3495-3539: salvarEdicaoDivida — adicionar dbGet + setSel/setDevedores ao final do try
# - App.jsx L3840-3848: card de dívida com {div.indexador && <p...>} — inserir badge DEPOIS desse <p>
# - App.jsx ~L2458-3063: AbaPagamentosParciais component — adicionar state editPgtoId/editPgtoForm, função salvarEdicaoPagamento, condicional no render da row em L3030

<interfaces>
<!-- Helpers já existentes no projeto (supabase.js, devedorCalc.js) — usar diretamente -->

From src/supabase.js:
```js
// dbGet(table, query) → GET /rest/v1/{table}?{query} — retorna array
// dbUpdate(table, id, body) → PATCH /rest/v1/{table}?id=eq.{id} com Prefer: return=representation
```

From src/utils/devedorCalc.js:
```js
// calcularSaldoDevedorAtualizado(devedor, pgtosDev, hoje) — L146 já aplica div.art523_opcao || "nao_aplicar"
// Nenhuma mudança necessária aqui.
```

From src/App.jsx (montarDevAtualizado ~L3351):
```js
// montarDevAtualizado(atu, dividas) — mescla { ...sel, ...atu, dividas, ... }
// Usar ao recarregar devedor do Supabase
```

Valores válidos de art523_opcao:
- "nao_aplicar" (default — nenhum badge)
- "so_multa" (badge "Art.523 Multa")
- "multa_honorarios" (badge "Art.523 Multa+Hon.")

Campos da tabela pagamentos_parciais:
- id (PK), devedor_id (FK), data_pagamento (YYYY-MM-DD), valor (number), observacao (string|null)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Ajuste 1 — Reload forçado do devedor após salvarEdicaoDivida</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Em `salvarEdicaoDivida` (App.jsx ~L3495-3539), ao final do bloco `try` bem-sucedido (após o `setDevedores(prev => prev.map(...))` e `setSel(parsed)` já existentes), adicionar reload forçado do devedor via Supabase:

```js
// Reload forçado para garantir dividas JSONB íntegro (fix Art.523 não altera valor no painel)
try {
  const fresh = await dbGet("devedores", `id=eq.${sel.id}`);
  const freshDev = Array.isArray(fresh) ? fresh[0] : fresh;
  if (freshDev) {
    const dividasRaw = typeof freshDev.dividas === "string"
      ? JSON.parse(freshDev.dividas || "[]")
      : (freshDev.dividas || []);
    // Normalizar art523_opcao null → "nao_aplicar" (D-Ajuste1: sem migração)
    const dividasNorm = dividasRaw.map(d => ({ ...d, art523_opcao: d.art523_opcao || "nao_aplicar" }));
    const parsedFresh = montarDevAtualizado(freshDev, dividasNorm);
    setDevedores(prev => prev.map(d => d.id === sel.id ? parsedFresh : d));
    setSel(parsedFresh);
  }
} catch (reloadErr) {
  console.warn("Reload pós-save falhou (state local mantido):", reloadErr);
}
```

Implementa locked decision: "Ajuste 1 — reload forçado via dbGet after save + null fallback; NO data migration".

Não alterar `calcularSaldoDevedorAtualizado` em devedorCalc.js — ele já está correto (L146 per RESEARCH.md).

Não migrar dados no banco — apenas normalizar `null`/`undefined` em memória para `"nao_aplicar"`.

Se reload falhar (rede, etc.), manter o state local já atualizado pelo código existente (fallback silencioso com console.warn).
  </action>
  <verify>
    <automated>cd src/mr-3/mr-cobrancas && npm run build</automated>
    Manual: abrir modal de devedor, editar uma dívida mudando art523_opcao de "nao_aplicar" para "multa_honorarios", clicar Salvar — valor no painel Devedores (coluna Valor) deve refletir o acréscimo de ~20% (multa+honorários) sem precisar F5. Badge Art.523 também deve aparecer (depende de Task 2).
  </verify>
  <done>
- `salvarEdicaoDivida` em App.jsx contém chamada `dbGet("devedores", `id=eq.${sel.id}`)` após o `setSel` existente
- Reload é envolto em try/catch próprio (não quebra UX se falhar)
- `dividasRaw` é normalizado: string JSON → parse; art523_opcao null → "nao_aplicar"
- `setDevedores` e `setSel` são chamados com o `parsedFresh` vindo do Supabase
- Build `npm run build` passa sem erros
- Nenhuma alteração em devedorCalc.js
- Nenhuma migração SQL executada
  </done>
</task>

<task type="auto">
  <name>Task 2: Ajuste 2 — Badge Art.523 nos cards de dívida detalhada</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Em App.jsx, localizar o bloco de renderização do card de dívida normal (~L3840-3848), especificamente o ponto **imediatamente após** o `<p>` condicional de `{div.indexador && (...)}` que mostra "Índice: ... · Juros: ... · Multa: ... · Honorários: ...".

**Inserir** (antes do `</div>` que fecha o bloco de info da dívida):

```jsx
{div.art523_opcao && div.art523_opcao !== "nao_aplicar" && (
  <p style={{ marginTop: 3 }}>
    <span
      title={
        div.art523_opcao === "multa_honorarios"
          ? "Art. 523 §1º CPC — Multa 10% + Honorários 10% de sucumbência"
          : "Art. 523 §1º CPC — Multa 10% (sem honorários)"
      }
      style={{
        display: "inline-block",
        background: "#fee2e2",
        color: "#991b1b",
        borderRadius: 99,
        padding: "1px 7px",
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      {div.art523_opcao === "multa_honorarios" ? "Art.523 Multa+Hon." : "Art.523 Multa"}
    </span>
  </p>
)}
```

Condição: renderizar SOMENTE quando `div.art523_opcao` existir e não for `"nao_aplicar"` — o default/null não gera badge.

Estilo: pill vermelho claro (`#fee2e2` bg, `#991b1b` text) — mesma paleta já usada em outros badges vermelhos do app. Tooltip via atributo HTML `title`.

Não criar componente separado — inline JSX é suficiente para um bloco pequeno. Posição: após info de Índice/Juros, antes do fechamento do card.

Se existirem múltiplos blocos de card de dívida (normal vs custas), aplicar APENAS ao card não-custas (o que tem `{div.indexador && <p...>}` — custas não tem indexador).
  </action>
  <verify>
    <automated>cd src/mr-3/mr-cobrancas && npm run build</automated>
    Manual: abrir modal devedor com dívida configurada como `multa_honorarios` — deve aparecer badge "Art.523 Multa+Hon." em vermelho logo após a linha de índice/juros. Hover mostra tooltip "Art. 523 §1º CPC — Multa 10% + Honorários 10% de sucumbência". Dívida com `nao_aplicar` NÃO mostra badge.
  </verify>
  <done>
- Block JSX condicional inserido em App.jsx após o `<p>` de `div.indexador`
- Badge renderiza apenas para `so_multa` e `multa_honorarios`; `nao_aplicar` / null / undefined NÃO renderizam
- Tooltip via `title` attribute com texto diferenciado por opção
- Build passa sem erros
- Nenhum componente novo criado; apenas JSX inline
  </done>
</task>

<task type="auto">
  <name>Task 3: Ajuste 3 — Edição inline de pagamentos parciais (editPgtoId pattern)</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Editar `AbaPagamentosParciais` component (~L2324/L2458-3063 em App.jsx) em 3 pontos:

**1. Adicionar state (próximo ao `const [form, setForm] = useState(...)` existente, ~L2462):**

```js
const [editPgtoId, setEditPgtoId] = useState(null);
const [editPgtoForm, setEditPgtoForm] = useState({ data_pagamento: "", valor: "", observacao: "" });
```

**2. Adicionar função async (após `adicionarPagamento`, ~L2503):**

```js
async function salvarEdicaoPagamento(id) {
  const valorNum = parseFloat(editPgtoForm.valor);
  if (!editPgtoForm.data_pagamento || isNaN(valorNum) || valorNum <= 0) {
    toast("Data e valor são obrigatórios e valor deve ser > 0.", { icon: "⚠️" });
    return;
  }
  try {
    await dbUpdate("pagamentos_parciais", id, {
      data_pagamento: editPgtoForm.data_pagamento,
      valor: valorNum,
      observacao: editPgtoForm.observacao || null,
    });
    toast.success("Pagamento atualizado.");
    setEditPgtoId(null);
    await carregar();
  } catch (e) {
    toast.error("Erro ao atualizar: " + (e?.message || e));
  }
}
```

**3. Substituir row estática (~L3030) por condicional edit/read:**

```jsx
{pagamentos.map(p => (
  editPgtoId === p.id ? (
    <tr key={p.id} style={{ borderBottom: "1px solid #dcfce7", background: "#f0fdf4" }}>
      <td style={{ padding: "4px 8px" }}>
        <input type="date" value={editPgtoForm.data_pagamento}
          onChange={e => setEditPgtoForm(f => ({ ...f, data_pagamento: e.target.value }))}
          style={{ padding: "4px 6px", border: "1.5px solid #bbf7d0", borderRadius: 6, fontSize: 11 }} />
      </td>
      <td style={{ padding: "4px 8px" }}>
        <input type="number" value={editPgtoForm.valor} min="0" step="0.01"
          onChange={e => setEditPgtoForm(f => ({ ...f, valor: e.target.value }))}
          style={{ padding: "4px 6px", border: "1.5px solid #bbf7d0", borderRadius: 6, fontSize: 11, width: 90 }} />
      </td>
      <td style={{ padding: "4px 8px" }}>
        <input type="text" value={editPgtoForm.observacao}
          onChange={e => setEditPgtoForm(f => ({ ...f, observacao: e.target.value }))}
          placeholder="Observação"
          style={{ padding: "4px 6px", border: "1.5px solid #bbf7d0", borderRadius: 6, fontSize: 11, width: "100%" }} />
      </td>
      <td style={{ padding: "4px 8px", display: "flex", gap: 4 }}>
        <button onClick={() => salvarEdicaoPagamento(p.id)}
          style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>✅</button>
        <button onClick={() => setEditPgtoId(null)}
          style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>❌</button>
      </td>
    </tr>
  ) : (
    <tr key={p.id}
      onClick={() => {
        setEditPgtoId(p.id);
        setEditPgtoForm({
          data_pagamento: p.data_pagamento || "",
          valor: String(p.valor ?? ""),
          observacao: p.observacao || "",
        });
      }}
      style={{ borderBottom: "1px solid #dcfce7", cursor: "pointer" }}
      onMouseEnter={e => { e.currentTarget.style.background = "#dcfce7"; }}
      onMouseLeave={e => { e.currentTarget.style.background = ""; }}>
      <td style={{ padding: "4px 8px" }}>{fmtDate(p.data_pagamento)}</td>
      <td style={{ padding: "4px 8px" }}>{fmt(parseFloat(p.valor))}</td>
      <td style={{ padding: "4px 8px" }}>{p.observacao || "—"}</td>
      <td style={{ padding: "4px 8px" }}>
        <button onClick={e => { e.stopPropagation(); excluirPagamento(p.id); }}
          style={{ /* estilo existente do botão ✕ — preservar */ }}>✕</button>
      </td>
    </tr>
  )
))}
```

**CRÍTICO — preservar o estilo original do botão de excluir ✕** (copiar inline style do código atual). Apenas adicionar `e.stopPropagation()` no onClick.

Implementa locked decision: "Ajuste 3 — inline editing (editPgtoId state pattern), NOT modal; NO audit log".

NÃO criar modal. NÃO adicionar tabela de audit log. Usar `dbUpdate("pagamentos_parciais", id, body)` — padrão existente confirmado.

Validações: data_pagamento não vazia; valor parseável > 0. Se falhar, toast de warning e NÃO salvar.
  </action>
  <verify>
    <automated>cd src/mr-3/mr-cobrancas && npm run build</automated>
    Manual: abrir devedor com pagamentos parciais, clicar numa linha — row transforma em inputs. Editar valor (ex. 500→600), clicar ✅ — toast "Pagamento atualizado.", row volta para modo read com valor 600. Clicar novamente, editar data inválida (vazia), ✅ — toast warning. Clicar ❌ — volta sem salvar. Clicar ✕ excluir — NÃO abre edição, apenas exclui (stopPropagation OK).
  </verify>
  <done>
- `AbaPagamentosParciais` tem `editPgtoId` e `editPgtoForm` state
- Função `salvarEdicaoPagamento(id)` chama `dbUpdate("pagamentos_parciais", id, {...})` e `await carregar()` no sucesso
- Row em modo edit mostra 3 inputs (date, number, text) + 2 botões (✅ verde, ❌ vermelho)
- Row em modo read tem `cursor: pointer` e hover `#dcfce7`
- Botão ✕ de excluir usa `e.stopPropagation()` para não disparar onClick da row
- Validação: data vazia OU valor NaN/<=0 → toast warning, não salva
- Build passa sem erros
- Nenhum modal criado; nenhuma tabela de audit log
  </done>
</task>

</tasks>

<verification>
Ao final das 3 tasks, o build `npm run build` em `src/mr-3/mr-cobrancas/` deve passar. Verificação manual end-to-end no navegador:

1. **Ajuste 1:** Editar art523_opcao de uma dívida → salvar → valor do painel atualiza sem F5.
2. **Ajuste 2:** Card de dívida com `multa_honorarios` mostra badge vermelho "Art.523 Multa+Hon."; `nao_aplicar` não mostra nada.
3. **Ajuste 3:** Clicar em pagamento parcial abre edição inline; ✅ salva via dbUpdate e recarrega; ❌ cancela; ✕ excluir continua funcionando sem abrir edição.

Regressão: suite Vitest existente (`npm run test`) não deve quebrar — não alteramos devedorCalc.js nem correcao.js.
</verification>

<success_criteria>
- [ ] `salvarEdicaoDivida` tem reload `dbGet` após save, com try/catch próprio e normalização null→"nao_aplicar" em memória
- [ ] Badge Art.523 visível apenas para `so_multa` / `multa_honorarios` em cards de dívida não-custas, com tooltip correto
- [ ] `AbaPagamentosParciais` permite edição inline com validação; `dbUpdate` em `pagamentos_parciais` persiste as 3 colunas
- [ ] Build de produção passa (`npm run build`)
- [ ] Testes Vitest existentes continuam passando (`npm run test`)
- [ ] Nenhum arquivo novo criado; apenas edições em `App.jsx`
- [ ] Nenhuma migração SQL executada; `devedorCalc.js` intocado
</success_criteria>

<output>
After completion, create `.planning/quick/260417-ttn-ajustes-modulo-devedor-art523-dividas-pa/260417-ttn-SUMMARY.md` seguindo o template padrão de quick tasks (o que foi feito, linhas tocadas, commit hash).
</output>
