# Quick Task 260417-ttn: Research

**Researched:** 2026-04-17
**Domain:** React SPA — módulo Devedores (App.jsx), devedorCalc.js, Supabase pagamentos_parciais
**Confidence:** HIGH — tudo verificado diretamente no código

---

## Ajuste 1 — Bug Art.523 não altera valor no painel

### Diagnóstico

`calcularSaldoDevedorAtualizado` (devedorCalc.js L146) já aplica `art523_opcao` corretamente:

```js
// L146
const art523Div = calcularArt523(saldoDiv, div.art523_opcao || "nao_aplicar");
saldoTotal += saldoDiv + art523Div.total_art523;
```

O cálculo está correto. O bug está em **quando o devedor é carregado no state**.

**Carregamento inicial** (App.jsx L8483–8499): `parse(d.dividas)` desserializa o JSONB com `JSON.parse`. O campo `art523_opcao` vem dentro do JSON de cada dívida, portanto é preservado — não há perda aqui.

**Problema real:** `salvarEdicaoDivida` (L3495–3539) usa `montarDevAtualizado` (L3351), que mescla:
```js
{ ...sel, ...(atu || {}), dividas, ... }
```
`atu` é o retorno do `dbUpdate` (PATCH Supabase com `Prefer: return=representation`). Se o banco retornar `dividas` como string JSON em vez de objeto, e `montarDevAtualizado` usar o `atu.dividas` (string) sobrescrevendo o array local, o `sel` ficaria com dividas não parseadas num reload subsequente.

**Verificação do fluxo save:** L3501–3519 constrói `dividas` (array local, já com `art523_opcao`), depois `montarDevAtualizado(atu, dividas)` — passa `dividas` local explicitamente como 3º parâmetro em overwrite, então `sel.dividas` sempre fica com o array correto. **O state local fica certo imediatamente.**

**Causa provável do bug observado:** O painel (tabela Devedores) usa `calcularSaldoDevedorAtualizado(d, pgtosDev, hoje)` em L4211. Esse `d` vem de `devedores` (state global). O `setDevedores(prev => prev.map(...))` em L3525 atualiza corretamente. **Mas:** se o usuário edita uma dívida e o modal não reflete o valor atualizado, pode ser que `sel` não recompute porque o painel relê do `devedores` state só no render da tabela, enquanto a ficha modal usa `sel` que é atualizado por `setSel(parsed)` em L3526.

**Conclusão:** O state fica correto após save. Se o badge aparece mas o valor não muda, o problema é que `allPagamentos` no painel não é recarregado (vem do `carregarTudo` inicial) — portanto `pgtosDev` está stale. Mas para o modal de ficha individual, o problema seria o `sel` não disparar rerender do componente pai que calcula o saldo. **Ação necessária: após `salvarEdicaoDivida` bem-sucedido, forçar reload do devedor do Supabase com `dbGet` para garantir que `dividas` JSONB no banco está íntegro.**

### Padrão de reload a implementar em `salvarEdicaoDivida` (L3521–3538)

```js
// Após dbUpdate bem-sucedido, recarregar devedor do Supabase:
const fresh = await dbGet("devedores", `id=eq.${sel.id}`);
const freshDev = Array.isArray(fresh) ? fresh[0] : fresh;
if (freshDev) {
  const dividasRaw = typeof freshDev.dividas === "string"
    ? JSON.parse(freshDev.dividas || "[]")
    : (freshDev.dividas || []);
  const parsed = montarDevAtualizado(freshDev, dividasRaw);
  setDevedores(prev => prev.map(d => d.id === sel.id ? parsed : d));
  setSel(parsed);
}
```

`dbGet` signature: `dbGet(table, query)` → `sb(t, "GET", null, ?${q})` (supabase.js L73). Query `id=eq.${sel.id}` funciona diretamente.

---

## Ajuste 2 — Badge Art.523 nos cards de dívida

### Localização exata

Card de dívida — bloco não-custas (L3840–3848):

```jsx
// L3841–3847 — bloco `<div>` de info de dívida normal
<p style={{ fontSize: 11, color: "#64748b" }}>
  {div.parcelas?.length > 0 ? ... : ...}
</p>
{div.indexador && (
  <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>
    Índice: ... · Juros: ... · Multa: ...% · Honorários: ...%
  </p>
)}
// ← INSERIR BADGE AQUI (após a linha de Índice)
```

### Badge a inserir (após L3847, antes de `</div>` em L3848)

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

### Valores válidos de `art523_opcao`

Confirmados via grep no código (Art523Option.jsx importado em L31, uso em L3882–3883, L3491, L3517):
- `"nao_aplicar"` — não aplica (default)
- `"so_multa"` — somente multa 10%
- `"multa_honorarios"` — multa 10% + honorários 10%

---

## Ajuste 3 — Edição inline de pagamentos parciais

### Estrutura atual do componente (L2458–3063)

State atual em `AbaPagamentosParciais`:
- `pagamentos` — array de rows do Supabase
- `form` — `{ data_pagamento, valor, observacao }` para novo registro

**Tabela de pagamentos** (L3021–3047): 4 colunas — Data, Valor, Observação, [botão excluir].

**Row atual** (L3030–3044):
```jsx
<tr key={p.id} style={{ borderBottom: "1px solid #dcfce7" }}>
  <td ...>{fmtDate(p.data_pagamento)}</td>
  <td ...>{fmt(parseFloat(p.valor))}</td>
  <td ...>{p.observacao || "—"}</td>
  <td ...>
    <button onClick={() => excluirPagamento(p.id)} ...>✕</button>
  </td>
</tr>
```

**Campos da tabela `pagamentos_parciais`** (confirmados via dbInsert em L2491–2496 e dbGet em L2468):
- `id` — PK (usado em dbDelete/dbUpdate)
- `devedor_id` — FK
- `data_pagamento` — string YYYY-MM-DD
- `valor` — número
- `observacao` — string | null

### Padrão a implementar (editPgtoId)

Adicionar ao componente:
```js
const [editPgtoId, setEditPgtoId] = useState(null);
const [editPgtoForm, setEditPgtoForm] = useState({ data_pagamento: "", valor: "", observacao: "" });
```

`async function salvarEdicaoPagamento(id)`:
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
    await carregar(); // já existe na L2465
  } catch (e) {
    toast.error("Erro ao atualizar: " + e.message);
  }
}
```

`dbUpdate` signature: `dbUpdate("pagamentos_parciais", id, body)` → PATCH com `?id=eq.${id}` (supabase.js L75). Retorna array com row atualizado.

### Row no modo edição

Quando `editPgtoId === p.id`, substituir a row estática por:
```jsx
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
```

Para abrir edição, o `onClick` na row (exceto botão excluir):
```jsx
<tr key={p.id}
  onClick={() => { if (editPgtoId !== p.id) { setEditPgtoId(p.id); setEditPgtoForm({ data_pagamento: p.data_pagamento, valor: String(p.valor), observacao: p.observacao || "" }); } }}
  style={{ borderBottom: "1px solid #dcfce7", cursor: editPgtoId === p.id ? "default" : "pointer",
           background: editPgtoId === p.id ? "#f0fdf4" : undefined }}
  onMouseEnter={e => { if (editPgtoId !== p.id) e.currentTarget.style.background = "#dcfce7"; }}
  onMouseLeave={e => { if (editPgtoId !== p.id) e.currentTarget.style.background = ""; }}>
```

Botão excluir precisa de `e.stopPropagation()` para não disparar o onClick da row.

---

## Resumo de Locais de Edição

| Ajuste | Arquivo | Linha | Ação |
|--------|---------|-------|------|
| 1 — reload pós-save | App.jsx | 3521 (dentro do try de salvarEdicaoDivida) | Adicionar dbGet + parse + setSel/setDevedores |
| 2 — badge por dívida | App.jsx | 3848 (após `{div.indexador && <p...>}`) | Inserir bloco JSX condicional |
| 3 — state editPgtoId | App.jsx | ~2462 (após useState do form) | Dois novos useState |
| 3 — salvarEdicaoPagamento | App.jsx | ~2503 (após adicionarPagamento) | Nova função async |
| 3 — row editável | App.jsx | 3030 (dentro de pagamentos.map) | Condicional no render da row |
