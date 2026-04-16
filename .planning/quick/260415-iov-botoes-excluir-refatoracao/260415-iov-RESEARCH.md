# Quick Task 260415-iov: Mapeamento de Botões com Ícone de Lixeira

**Pesquisado:** 2026-04-15
**Arquivo:** `src/mr-3/mr-cobrancas/src/App.jsx`
**Método:** grep `🗑` + leitura de contexto (~5 linhas por ocorrência)

---

## Inventário Completo de Ocorrências

> Total: **12 ocorrências** de 🗑/🗑️ — nenhuma via SVG ou className (grep `trash/Trash` retornou zero resultados).

| # | Linha | Grupo | Ícone | Texto adicional | aria-label | Container pai | Handler |
|---|-------|-------|-------|-----------------|------------|---------------|---------|
| 1 | 920 | **A** | 🗑 | — | ✗ | `<div>` flex implícito | `excluirAcordo(ac.id)` |
| 2 | 1213 | — | 🗑 | — | ✓ "Excluir registro de contato" | `<div>` flex | `excluirRegistro(r.id)` |
| 3 | 1344 | — | 🗑 | — | ✓ "Excluir lembrete" | `<div style="display:flex; gap:6">` | `excluirLem(l.id)` |
| 4 | 2447 | **B** | 🗑 | " Excluir" | ✗ | `<div>` flex inline | `excluirDevedor(sel)` |
| 5 | 2502 | **B** | 🗑 | " Excluir" | ✗ | `<div style="display:flex; gap:8">` via `<Btn danger>` | `excluirDevedor(sel)` |
| 6 | 2649 | **B** | 🗑️ | " Excluir" | ✗ | `<div style="display:flex; gap:5">` | `excluirDivida(div.id)` |
| 7 | 2653 | **B** | 🗑️ | " Excluir" | ✗ | `<div>` flex inline | `excluirDivida(div.id)` |
| 8 | 3229 | — | 🗑️ | — | ✓ "Excluir credor" | `<div style="display:flex; gap:8">` | `excluir(c)` |
| 9 | 3477 | **B** | 🗑 | " Excluir" | ✗ | `<div style="display:flex; gap:8; flexWrap:wrap">` | `excluirProcesso(sel.id)` |
| 10 | 5025 | **A** | 🗑 | — | ✗ | `<div>` flex implícito | `excluir(l.id)` |
| 11 | 5922 | **A** | 🗑 | — | ✓ "Excluir etapa" | `<div>` flex (botões ✏️ / lixeira lado a lado) | `async confirm → se(filter)` |
| 12 | 6235 | **B** | 🗑 | " Excluir" | ✗ | `<div>` flex implícito | `excluir(u.id)` |

---

## Divergência em relação ao CONTEXT.md

O CONTEXT.md listava **3 ocorrências no Grupo A** (linhas 920, 5025, 5922) e **6 no Grupo B** (2447, 2502, 2649, 2653, 3477, 6235). O grep ao vivo confirma exatamente essas 9, **mais 3 adicionais** que não estavam no CONTEXT.md:

| Linha | Situação |
|-------|----------|
| 1213 | Botão só ícone, já tem aria-label, já tem style vermelho completo — **visualmente já correto** |
| 1344 | Botão só ícone, já tem aria-label, já tem style vermelho completo — **visualmente já correto** |
| 3229 | Botão só ícone, já tem aria-label, tem style diferente (fundo `#fff5f5`, borda `#fee2e2`) — **visualmente parecido mas sem texto** |

Essas 3 linhas precisam de decisão: incluir na refatoração ou deixar como estão?

---

## Detalhe por Grupo — Para o Executor

### Grupo A: Botões só ícone — PRECISAM de texto + cor vermelha

#### Linha 920 — `excluirAcordo`
```jsx
<button onClick={() => excluirAcordo(ac.id)}
  style={{ background: "#fee2e2", color: "#dc2626", border: "none",
           borderRadius: 7, padding: "4px 8px", cursor: "pointer",
           fontSize: 10, fontWeight: 700 }}>
  🗑
</button>
```
- Container pai: `<div>` (flex row, cartão de acordo)
- Diferença do estilo alvo: `border: "none"` (alvo usa `"1px solid #fecaca"`), `fontSize: 10` (alvo usa `11`), sem `fontWeight` explícito no alvo — mas CONTEXT pede fontWeight 700
- **Ação:** trocar `border: "none"` → `border: "1px solid #fecaca"`, `fontSize: 10` → `11`, trocar conteúdo `🗑` → `Excluir`

#### Linha 5025 — `excluir(l.id)` (lembrete ou similar)
```jsx
<button onClick={() => excluir(l.id)}
  style={{ background: "#fee2e2", color: "#dc2626", border: "none",
           borderRadius: 8, padding: "6px 8px", cursor: "pointer",
           fontSize: 11 }}>
  🗑
</button>
```
- Container pai: `<div>` flex, é o último botão da linha
- Diferenças do estilo alvo: `border: "none"` → `"1px solid #fecaca"`, `borderRadius: 8` → `7`, sem `fontWeight: 700`
- **Ação:** ajustar border, borderRadius, adicionar fontWeight 700, trocar conteúdo

#### Linha 5922 — `excluirEtapa` (etapa do processo)
```jsx
<button aria-label="Excluir etapa"
  onClick={async () => { if (!await confirm("Excluir esta etapa?")) return; se(etapas.filter(x => x.id !== e.id)); }}
  style={{ background: "#fee2e2", color: "#dc2626", border: "none",
           borderRadius: 8, padding: "6px 9px", cursor: "pointer",
           fontSize: 11 }}>🗑</button>
```
- Container pai: `<div>` flex com botão ✏️ (editar) ao lado esquerdo
- Já tem `aria-label` — manter
- Diferenças: `border: "none"` → `"1px solid #fecaca"`, `borderRadius: 8` → `7`, adicionar `fontWeight: 700`
- **Ação:** ajustar border, borderRadius, fontWeight, trocar 🗑 → Excluir (manter aria-label)

---

### Grupo B: Botões com "🗑 Excluir" — SÓ REMOVER o ícone

| Linha | Estilo atual | Observação |
|-------|-------------|------------|
| 2447 | `background: rgba(220,38,38,.3); color: #fca5a5` — tema escuro | Não alterar estilo |
| 2502 | Componente `<Btn danger>` — estilo via prop | Só remover o emoji do children |
| 2649 | Estilo vermelho padrão + `border: 1px solid #fecaca` — **referência do CONTEXT** | |
| 2653 | Idem 2649 + `marginLeft: 8` | |
| 3477 | `background: rgba(220,38,38,.3)` — tema escuro, igual 2447 | |
| 6235 | `background: "#fee2e2"` — estilo padrão, multiline | |

---

### Linhas adicionais (não estavam no CONTEXT.md)

| Linha | Estado atual | Recomendação |
|-------|-------------|--------------|
| 1213 | Só ícone, aria-label OK, style vermelho (`border: none`) | Candidata ao Grupo A se executor quiser consistência total; visualmente já funcional |
| 1344 | Só ícone, aria-label OK, style vermelho (`border: none`) | Idem 1213 |
| 3229 | Só ícone, aria-label "Excluir credor", `background: #fff5f5; border: 1.5px solid #fee2e2; color: #ef4444` | Estilo diferente dos demais — decidir se harmoniza ou mantém |

---

## Alinhamento: Risco de Quebra

Todos os botões de exclusão estão em containers `display: flex` (div ou div implícito). Adicionar texto "Excluir" vai **aumentar a largura do botão** — verificar se o container pai tem `flex-shrink: 0` ou `flexWrap` que absorva o crescimento:

| Linha | Container | Risco |
|-------|-----------|-------|
| 920 | `<div>` flex sem flexShrink explícito no button | Baixo — botão no canto direito do cartão |
| 5025 | `<div>` flex, último item | Baixo |
| 5922 | `<div>` flex com botão ✏️ à esquerda | **Médio** — dois botões lado a lado, testar quebra |
| 2649/2653 | `<div style="display:flex; gap:5; marginLeft:8; flexShrink:0">` | Baixo — já tem `flexShrink: 0` no container |

---

## Não Encontrado
- Nenhum SVG de lixeira [VERIFIED: grep trash/Trash retornou zero resultados]
- Nenhum className contendo "trash" ou "delete" [VERIFIED: grep retornou zero resultados]
- Nenhuma referência a biblioteca de ícones (Heroicons, Lucide, etc.) [VERIFIED]

---

## Resumo para o Executor

1. **Grupo A confirmado: linhas 920, 5025, 5922** — aplicar estilo completo + texto "Excluir"
2. **Grupo B confirmado: linhas 2447, 2502, 2649, 2653, 3477, 6235** — só remover emoji
3. **3 linhas extras (1213, 1344, 3229)** — estão fora do escopo do CONTEXT.md; confirmar antes de tocar
4. **Estilo de referência (do CONTEXT.md):** `background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700`
5. Linha 5922 já tem `aria-label` — preservar ao substituir
