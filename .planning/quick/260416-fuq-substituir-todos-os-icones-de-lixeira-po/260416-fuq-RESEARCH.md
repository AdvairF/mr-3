# Quick Task 260416-fuq: Research — Substituir ícones de lixeira

**Researched:** 2026-04-16
**Confidence:** HIGH (todas as ocorrências verificadas por grep direto nos arquivos)

---

## 1. Ícones de lixeira remanescentes (🗑 / 🗑️)

### App.jsx — 3 ocorrências com emoji

| Linha | Conteúdo atual | Ação necessária |
|-------|----------------|-----------------|
| 1213 | `<button aria-label="Excluir registro de contato" onClick={() => excluirRegistro(r.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 11, flexShrink: 0 }}>🗑</button>` | Substituir emoji por texto `Excluir`; trocar style pelo estilo alvo transparent |
| 1344 | `<button aria-label="Excluir lembrete" onClick={() => excluirLem(l.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 7, padding: "5px 8px", cursor: "pointer", fontSize: 11 }}>🗑</button>` | Substituir emoji por texto `Excluir`; trocar style pelo estilo alvo transparent |
| 3229 | `<button aria-label="Excluir credor" onClick={() => excluir(c)} style={{ padding: "7px 12px", fontSize: 12, fontWeight: 600, borderRadius: 9, border: "1.5px solid #fee2e2", background: "#fff5f5", color: "#ef4444", cursor: "pointer" }}>🗑️</button>` | Substituir emoji por texto `Excluir`; trocar style pelo estilo alvo transparent; ajustar cor de #ef4444 para #DC2626 |

### GerarPeticao.jsx — 1 ocorrência com emoji

| Linha | Conteúdo atual | Ação necessária |
|-------|----------------|-----------------|
| 776 | `<button onClick={() => remover(m.id)} style={S.btnRed} title="Remover">🗑️</button>` | Substituir emoji por texto `Excluir`; trocar `style={S.btnRed}` por inline style alvo; manter `onClick` intacto |

**S.btnRed atual (linha 228 de GerarPeticao.jsx):**
```js
btnRed: { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer" }
```
Esse objeto não deve ser deletado — é usado também na linha 1001 (`✕` fechar preview), que não está em escopo.

---

## 2. Os 9 botões da task 260415-iov — linhas atuais e estilos

Todos já têm texto `Excluir` (sem emoji). Nenhum tem ainda o estilo alvo `background: transparent`. Todos precisam de atualização de style.

### Grupo A — excluirAcordo, excluir(l.id) lembrete, excluirEtapa

| # | Linhas | Função | Style atual | Diferença do alvo |
|---|--------|--------|-------------|-------------------|
| A1 | 918–921 | `excluirAcordo(ac.id)` | `background: "#fee2e2"`, `border: "1px solid #fecaca"`, `borderRadius: 7`, `padding: "4px 9px"`, `fontSize: 11` | background, borderRadius (7→6), padding (4px 9px → 4px 12px), fontSize (11→13), fontWeight ok |
| A2 | 5023–5026 | `excluir(l.id)` (lembrete régua) | `background: "#fee2e2"`, `border: "1px solid #fecaca"`, `borderRadius: 7`, `padding: "4px 9px"`, `fontSize: 11` | idem A1 |
| A3 | 5921–5922 | `excluirEtapa` (inline arrow fn) | `background: "#fee2e2"`, `border: "1px solid #fecaca"`, `borderRadius: 7`, `padding: "4px 9px"`, `fontSize: 11` | idem A1 |

**Linhas exatas A3:**
```
5921  <button aria-label="Excluir etapa" onClick={async () => { if (!await confirm("Excluir esta etapa?")) return; se(etapas.filter(x => x.id !== e.id)); }}
5922    style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Excluir</button>
```

### Grupo B — excluirDevedor (x2), excluirDivida (x2), excluirProcesso, excluir(u.id)

| # | Linha(s) | Função | Style atual | Diferença do alvo |
|---|----------|--------|-------------|-------------------|
| B1 | 2447 | `excluirDevedor(sel)` (header painel) | `background: "rgba(220,38,38,.3)"`, `color: "#fca5a5"`, `border: "1px solid rgba(220,38,38,.4)"`, `borderRadius: 8`, `padding: "8px 14px"`, `fontSize: 12` | background (rgba→transparent), color (#fca5a5→#DC2626), borderColor, padding (8px 14px → 4px 12px), fontSize (12→13) |
| B2 | 2502 | `excluirDevedor(sel)` via `<Btn danger>` | Usa componente `<Btn danger>` — sem inline style | Verificar o que `<Btn danger>` renderiza; se não bater com alvo, substituir por `<button>` inline |
| B3 | 2649 | `excluirDivida(div.id)` (lista dívidas) | `background: "#fee2e2"`, `border: "1px solid #fecaca"`, `borderRadius: 7`, `padding: "4px 9px"`, `fontSize: 11` | idem Grupo A |
| B4 | 2653 | `excluirDivida(div.id)` (custas) | idem B3 | idem Grupo A |
| B5 | 3477 | `excluirProcesso(sel.id)` | `background: "rgba(220,38,38,.3)"`, `color: "#fca5a5"`, `border: "1px solid rgba(220,38,38,.4)"`, `borderRadius: 8`, `padding: "7px 12px"`, `fontSize: 12` | idem B1 (ajuste padding, color, background) |
| B6 | 6233–6236 | `excluir(u.id)` (usuário) | `background: "#fee2e2"`, `color: "#dc2626"`, `border: "none"`, `borderRadius: 9`, `padding: "7px 14px"`, `fontSize: 12` | background, border (none→solid), borderRadius (9→6), padding, fontSize (12→13) |

---

## 3. Componente `<Btn danger>` — linha B2 (2502)

A linha 2502 usa `<Btn onClick={() => excluirDevedor(sel)} danger>Excluir</Btn>`. Isso não é um `<button>` inline e o estilo resultante depende da implementação do componente `Btn`. Deve ser substituído por `<button>` com inline style alvo para garantir uniformidade.

---

## 4. Imports de ícones — resultado

| Arquivo | Imports de ícone de lixeira | Ação |
|---------|----------------------------|------|
| App.jsx | Nenhum encontrado (`FaTrash`, `BsTrash`, `MdDelete`, etc.) | Nenhuma |
| GerarPeticao.jsx | Nenhum encontrado | Nenhuma |

Nenhum import de biblioteca de ícones para lixeira existe nos dois arquivos. Os emojis são caracteres inline — remoção deles não requer alteração de imports.

---

## 5. Estilo alvo (referência unificada)

```js
style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
```

---

## 6. Resumo de ações por arquivo

### App.jsx — 12 botões no total

| Tipo | Qtd | Linhas |
|------|-----|--------|
| Emoji remanescente → converter + restyle | 3 | 1213, 1344, 3229 |
| Já tem "Excluir", restyle para transparent (Grupo A padrão) | 5 | 918–921, 5023–5026, 5921–5922, 2649, 2653 |
| Já tem "Excluir", restyle rgba→transparent (Grupo B especial) | 2 | 2447, 3477 |
| Já tem "Excluir", restyle + borderRadius/fontSize | 1 | 6233–6236 |
| Substituir `<Btn danger>` por `<button>` inline | 1 | 2502 |

### GerarPeticao.jsx — 1 botão

| Tipo | Qtd | Linha |
|------|-----|-------|
| Emoji + `style={S.btnRed}` → converter + inline style alvo | 1 | 776 |

**Total: 13 botões alterados.**

---

## 7. Observações para o planner

- `S.btnRed` (GerarPeticao.jsx linha 228) **não deve ser removido** — linha 1001 ainda usa para o botão `✕` fechar preview (fora de escopo).
- A linha 3229 em App.jsx usa `color: "#ef4444"` (vermelho mais claro que #DC2626) — uniformizar para `#DC2626` no alvo.
- Confirmação da não existência de `excluirEtapa` como função nomeada: a lógica de exclusão de etapa está inline no `onClick` da linha 5921 via `se(etapas.filter(...))`.
- `<Btn danger>` na linha 2502: substituir integralmente por `<button>` com inline style para garantir visual consistente.

---

## Sources

- [VERIFIED: grep direto em App.jsx] — todas as ocorrências de 🗑/🗑️ e funções de exclusão
- [VERIFIED: grep direto em GerarPeticao.jsx] — ocorrência linha 776 e definição S.btnRed linha 228
- [VERIFIED: Read tool] — conteúdo exato das linhas 918–921, 5021–5026, 5921–5922, 6231–6236
