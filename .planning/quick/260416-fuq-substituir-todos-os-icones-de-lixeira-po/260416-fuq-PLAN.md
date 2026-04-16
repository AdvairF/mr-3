---
phase: 260416-fuq
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mr-3/mr-cobrancas/src/App.jsx
  - src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx
autonomous: true
requirements:
  - Substituir todos os ícones de lixeira por botões "Excluir" uniformes em vermelho

must_haves:
  truths:
    - "Nenhum emoji 🗑 ou 🗑️ aparece em App.jsx nem em GerarPeticao.jsx"
    - "Todos os 13 botões de exclusão exibem o texto 'Excluir' sem emoji"
    - "Todos os 13 botões possuem exatamente o estilo alvo (transparent background, #DC2626)"
    - "Nenhum handler onClick ou função de deleção foi alterado"
    - "App.js (backup) não foi tocado"
    - "S.btnRed em GerarPeticao.jsx permanece intacto (linha 228)"
    - "Todos os aria-labels existentes foram preservados"
  artifacts:
    - path: "src/mr-3/mr-cobrancas/src/App.jsx"
      provides: "12 botões Excluir com estilo uniforme"
      contains: "background: 'transparent'"
    - path: "src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx"
      provides: "1 botão Excluir com estilo uniforme (linha 776)"
      contains: "background: 'transparent'"
  key_links:
    - from: "App.jsx linha 2502"
      to: "excluirDevedor(sel)"
      via: "button inline substituindo <Btn danger>"
      pattern: "<button onClick.*excluirDevedor"
    - from: "GerarPeticao.jsx linha 776"
      to: "remover(m.id)"
      via: "button com inline style (não mais S.btnRed)"
      pattern: "style=\\{\\{ color: '#DC2626'"
---

<objective>
Uniformizar todos os 13 botões de exclusão no sistema para exibir o texto "Excluir" (sem emoji) com o estilo alvo unificado: background transparent, borda e texto #DC2626.

Purpose: Eliminar inconsistência visual entre botões (ícone vs texto, fundo vermelho vs transparent, variações de cor).
Output: App.jsx com 12 botões uniformes + GerarPeticao.jsx com 1 botão uniforme, todos sem emoji e com estilo idêntico.
</objective>

<execution_context>
@/c/Users/advai/.claude/get-shit-done/workflows/execute-plan.md
@/c/Users/advai/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-fuq-substituir-todos-os-icones-de-lixeira-po/260416-fuq-CONTEXT.md
@/c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-fuq-substituir-todos-os-icones-de-lixeira-po/260416-fuq-RESEARCH.md

<interfaces>
<!-- Estilo alvo a aplicar em TODOS os 13 botões. Copiar literalmente. -->
style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}

<!-- S.btnRed em GerarPeticao.jsx linha 228 — NÃO alterar (linha 1001 ainda usa) -->
btnRed: { background: "#fef2f2", color: "#dc2626", border: "none", borderRadius: 8, padding: "7px 10px", fontSize: 12, cursor: "pointer" }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Atualizar 12 botões em App.jsx</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Abrir App.jsx e realizar as seguintes substituições exatas, linha a linha. Usar o estilo alvo em TODAS:

    style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}

Não adicionar aria-label onde não existia. Não remover aria-label existente. Não alterar onClick.

**Grupo 1 — Converter emoji + restyle (3 linhas):**

Linha 1213: substituir o style inteiro + trocar `🗑` por `Excluir`. Preservar aria-label="Excluir registro de contato" e onClick={() => excluirRegistro(r.id)}.
Resultado esperado:
```jsx
<button aria-label="Excluir registro de contato" onClick={() => excluirRegistro(r.id)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Excluir</button>
```

Linha 1344: substituir style inteiro + trocar `🗑` por `Excluir`. Preservar aria-label="Excluir lembrete" e onClick={() => excluirLem(l.id)}.
Resultado esperado:
```jsx
<button aria-label="Excluir lembrete" onClick={() => excluirLem(l.id)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Excluir</button>
```

Linha 3229: substituir style inteiro (uniformizar cor de #ef4444 para #DC2626) + trocar `🗑️` por `Excluir`. Preservar aria-label="Excluir credor" e onClick={() => excluir(c)}.
Resultado esperado:
```jsx
<button aria-label="Excluir credor" onClick={() => excluir(c)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Excluir</button>
```

**Grupo 2 — Restyle dos 5 botões padrão já com texto (Grupo A + B3 + B4):**

Linha 918–921 (excluirAcordo): substituir apenas o atributo style pelo alvo. Preservar onClick={() => excluirAcordo(ac.id)} e o texto `Excluir`.
Resultado esperado (pode ser inline ou multi-linha):
```jsx
<button onClick={() => excluirAcordo(ac.id)}
  style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>
  Excluir
</button>
```

Linha 5023–5026 (excluir lembrete régua): idem, preservar onClick={() => excluir(l.id)}.

Linha 5921–5922 (excluirEtapa): substituir apenas style. Preservar aria-label="Excluir etapa" e o onClick inline complexo `async () => { if (!await confirm("Excluir esta etapa?")) return; se(etapas.filter(x => x.id !== e.id)); }`.

Linha 2649 (excluirDivida lista): substituir apenas style. Preservar onClick={() => excluirDivida(div.id)}.

Linha 2653 (excluirDivida custas): substituir apenas style. Preservar onClick={() => excluirDivida(div.id)} e marginLeft: 8 (adicionar ao style alvo como propriedade extra).

**Grupo 3 — Restyle rgba→transparent (2 botões especiais):**

Linha 2447 (excluirDevedor header): substituir style rgba por estilo alvo. Preservar onClick={() => excluirDevedor(sel)}.
Resultado esperado:
```jsx
<button onClick={() => excluirDevedor(sel)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Excluir</button>
```

Linha 3477 (excluirProcesso): idem. Preservar onClick={() => excluirProcesso(sel.id)}.

**Grupo 4 — Restyle usuário (B6):**

Linha 6233–6236 (excluir usuário): substituir style inteiro pelo alvo. Preservar onClick={() => excluir(u.id)} e o texto `Excluir`.

**Grupo 5 — Substituir componente `<Btn danger>` por `<button>` inline (B2):**

Linha 2502: substituir `<Btn onClick={() => excluirDevedor(sel)} danger>Excluir</Btn>` por:
```jsx
<button onClick={() => excluirDevedor(sel)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}>Excluir</button>
```
NÃO alterar a linha 2501 (`<Btn onClick={() => abrirWp(sel)}>📱 WhatsApp</Btn>`).

**PROIBIDO:**
- Alterar App.js (nenhuma modificação)
- Alterar qualquer função onClick ou lógica de deleção
- Remover aria-labels existentes
- Adicionar aria-labels onde não existiam
- Alterar qualquer botão que não seja de exclusão
  </action>
  <verify>
    <automated>grep -n "🗑" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx | wc -l</automated>
    Saída esperada: 0 (nenhum emoji restante).
    Também verificar: grep -c "background: 'transparent'" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx
    Saída esperada: >= 12
  </verify>
  <done>
    - Zero ocorrências de 🗑 ou 🗑️ em App.jsx
    - Linha 2502 contém `&lt;button` (não `&lt;Btn`) com excluirDevedor(sel)
    - Grep por "background: 'transparent'" retorna ao menos 12 matches
    - Grep por "excluirAcordo\|excluirLem\|excluirEtapa\|excluirDivida\|excluirDevedor\|excluirProcesso\|excluirRegistro\|excluirCred" retorna os mesmos handlers (sem alteração)
  </done>
</task>

<task type="auto">
  <name>Task 2: Atualizar botão em GerarPeticao.jsx e verificar build</name>
  <files>src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx</files>
  <action>
**Substituição na linha 776:**

Conteúdo atual:
```jsx
<button onClick={() => remover(m.id)} style={S.btnRed} title="Remover">🗑️</button>
```

Substituir por:
```jsx
<button onClick={() => remover(m.id)} style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }} title="Remover">Excluir</button>
```

**PROIBIDO:**
- Alterar ou remover `S.btnRed` na linha 228 (objeto ainda usado na linha 1001)
- Alterar o onClick: `() => remover(m.id)` deve permanecer intacto
- Alterar qualquer outro botão do arquivo

**Verificação de build:**
Após salvar os dois arquivos, executar no diretório do projeto:
```bash
cd /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas && npm run build 2>&1 | tail -20
```
Se o build reportar erros de sintaxe JSX, corrigir o arquivo afetado e rebuildar.
  </action>
  <verify>
    <automated>grep -n "🗑️" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx</automated>
    Saída esperada: nenhuma linha retornada (zero ocorrências).
    Também: grep -n "S.btnRed" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx
    Saída esperada: linha 228 (definição) + linha 1001 (uso no ✕) — NÃO deve conter linha 776.
  </verify>
  <done>
    - Zero ocorrências de 🗑️ em GerarPeticao.jsx
    - Linha 776 usa inline style com 'transparent' e texto 'Excluir'
    - S.btnRed ainda presente nas linhas 228 e 1001
    - npm run build conclui sem erros de sintaxe
  </done>
</task>

</tasks>

<verification>
Verificação final completa:

```bash
# 1. Nenhum emoji de lixeira restante em nenhum dos dois arquivos
grep -rn "🗑" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx

# 2. Contagem de botões com estilo transparent (esperado: >= 13)
grep -c "background: 'transparent'" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx

# 3. <Btn danger> eliminado
grep -n "Btn danger" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx

# 4. S.btnRed intacto
grep -n "btnRed" /c/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx

# 5. App.js não foi tocado (git diff deve mostrar zero mudanças nele)
git diff --name-only | grep -v "App.js$"
```
</verification>

<success_criteria>
- Todos os 13 botões de exclusão exibem o texto `Excluir` sem emoji
- Todos os 13 botões possuem `background: 'transparent'` e `color: '#DC2626'` no style inline
- `<Btn danger>` na linha 2502 foi substituído por `<button>` inline
- GerarPeticao.jsx linha 776 usa inline style (não `S.btnRed`)
- `S.btnRed` permanece definido e usado nas linhas 228 e 1001 de GerarPeticao.jsx
- App.js (backup) sem nenhuma modificação
- Build do projeto sem erros de sintaxe
- Nenhum handler onClick ou função de deleção alterado
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260416-fuq-substituir-todos-os-icones-de-lixeira-po/260416-fuq-SUMMARY.md` com:
- O que foi alterado (13 botões, 2 arquivos)
- Linhas modificadas em cada arquivo
- Confirmação de que S.btnRed permanece intacto
- Resultado do build
</output>
