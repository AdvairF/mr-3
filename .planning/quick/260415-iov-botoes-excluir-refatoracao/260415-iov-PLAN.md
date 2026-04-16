---
phase: quick/260415-iov-botoes-excluir-refatoracao
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/mr-3/mr-cobrancas/src/App.jsx
autonomous: true
requirements:
  - 260415-iov
must_haves:
  truths:
    - "Nenhum botão de exclusão exibe o ícone 🗑 ou 🗑️ nas linhas 920, 5025, 5922, 2447, 2502, 2649, 2653, 3477, 6235"
    - "Botões do Grupo A (linhas 920, 5025, 5922) exibem texto 'Excluir' com fundo #fee2e2, borda 1px solid #fecaca, cor #dc2626, borderRadius 7, padding 4px 9px, fontSize 11, fontWeight 700"
    - "Botões do Grupo B (linhas 2447, 2502, 2649, 2653, 3477, 6235) mantêm texto 'Excluir' e estilos originais inalterados"
    - "Linhas 1213, 1344, 3229 não foram modificadas"
    - "aria-label 'Excluir etapa' na linha 5922 permanece presente"
  artifacts:
    - path: "src/mr-3/mr-cobrancas/src/App.jsx"
      provides: "Botões de exclusão sem ícone de lixeira"
  key_links:
    - from: "linha 920 (Grupo A)"
      to: "style completo vermelho + texto Excluir"
      via: "edição direta do atributo style e conteúdo do button"
    - from: "linha 2502 (Grupo B)"
      to: "remoção apenas do emoji do children do <Btn danger>"
      via: "edição do texto dentro do componente Btn"
---

<objective>
Substituir o ícone 🗑/🗑️ nos botões de exclusão do App.jsx em dois grupos:

- Grupo A (linhas 920, 5025, 5922): aplicar estilo vermelho completo + texto "Excluir"
- Grupo B (linhas 2447, 2502, 2649, 2653, 3477, 6235): remover apenas o emoji, manter estilo e texto existentes

Purpose: Melhorar acessibilidade e legibilidade substituindo ícone ambíguo por texto claro, conforme decisões travadas em CONTEXT.md.
Output: App.jsx com 9 botões de exclusão sem ícone de lixeira.
</objective>

<execution_context>
@c:/Users/advai/.claude/get-shit-done/workflows/execute-plan.md
@c:/Users/advai/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
Arquivo alvo: `c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx`

Estilo de referência para Grupo A (per D-01):
```
background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca",
borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700
```

Linhas FORA DE ESCOPO — NÃO TOCAR: 1213, 1344, 3229
</context>

<tasks>

<task type="auto">
  <name>Task 1: Grupo A — Aplicar estilo completo e texto "Excluir" (linhas 920, 5025, 5922)</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Fazer três edições cirúrgicas no arquivo. Usar Edit tool com o conteúdo exato abaixo como old_string.

**Edição 1 — Linha 920** (excluirAcordo):

old_string:
```
              <button onClick={() => excluirAcordo(ac.id)}
                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 7, padding: "4px 8px", cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
                🗑
              </button>
```

new_string:
```
              <button onClick={() => excluirAcordo(ac.id)}
                style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                Excluir
              </button>
```

Mudanças: `border: "none"` → `border: "1px solid #fecaca"`, `padding: "4px 8px"` → `padding: "4px 9px"`, `fontSize: 10` → `11`, conteúdo `🗑` → `Excluir`.

---

**Edição 2 — Linha 5025** (excluir lembrete):

old_string:
```
                    <button onClick={() => excluir(l.id)}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 11 }}>
                      🗑
                    </button>
```

new_string:
```
                    <button onClick={() => excluir(l.id)}
                      style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      Excluir
                    </button>
```

Mudanças: `border: "none"` → `border: "1px solid #fecaca"`, `borderRadius: 8` → `7`, `padding: "6px 8px"` → `"4px 9px"`, adicionar `fontWeight: 700`, conteúdo `🗑` → `Excluir`.

---

**Edição 3 — Linha 5922** (excluir etapa — manter aria-label):

old_string:
```
                      <button aria-label="Excluir etapa" onClick={async () => { if (!await confirm("Excluir esta etapa?")) return; se(etapas.filter(x => x.id !== e.id)); }}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 8, padding: "6px 9px", cursor: "pointer", fontSize: 11 }}>🗑</button>
```

new_string:
```
                      <button aria-label="Excluir etapa" onClick={async () => { if (!await confirm("Excluir esta etapa?")) return; se(etapas.filter(x => x.id !== e.id)); }}
                        style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Excluir</button>
```

Mudanças: `border: "none"` → `border: "1px solid #fecaca"`, `borderRadius: 8` → `7`, `padding: "6px 9px"` → `"4px 9px"`, adicionar `fontWeight: 700`, conteúdo `🗑` → `Excluir`. O `aria-label` permanece intacto.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const c=fs.readFileSync('c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx','utf8');const lines=c.split('\n');console.log('L920:',lines[919]);console.log('L5025:',lines[5024]);console.log('L5922:',lines[5921]);"</automated>
  </verify>
  <done>
    - Linha 920: style tem `border: "1px solid #fecaca"`, `fontSize: 11`, conteúdo é `Excluir` (sem emoji)
    - Linha 5025: style tem `border: "1px solid #fecaca"`, `borderRadius: 7`, `fontWeight: 700`, conteúdo é `Excluir`
    - Linha 5922: style tem `border: "1px solid #fecaca"`, `borderRadius: 7`, `fontWeight: 700`, conteúdo é `Excluir`, `aria-label="Excluir etapa"` presente
  </done>
</task>

<task type="auto">
  <name>Task 2: Grupo B — Remover apenas o emoji 🗑/🗑️ (linhas 2447, 2502, 2649, 2653, 3477, 6235)</name>
  <files>src/mr-3/mr-cobrancas/src/App.jsx</files>
  <action>
Fazer seis edições cirúrgicas, removendo apenas o emoji e o espaço que o acompanha. NÃO alterar style, props ou handlers.

**Edição 1 — Linha 2447** (excluirDevedor — tema escuro):

old_string:
```
            <button onClick={() => excluirDevedor(sel)} style={{ background: "rgba(220,38,38,.3)", color: "#fca5a5", border: "1px solid rgba(220,38,38,.4)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🗑 Excluir</button>
```

new_string:
```
            <button onClick={() => excluirDevedor(sel)} style={{ background: "rgba(220,38,38,.3)", color: "#fca5a5", border: "1px solid rgba(220,38,38,.4)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Excluir</button>
```

---

**Edição 2 — Linha 2502** (componente Btn danger):

old_string:
```
                <Btn onClick={() => excluirDevedor(sel)} danger>🗑 Excluir</Btn>
```

new_string:
```
                <Btn onClick={() => excluirDevedor(sel)} danger>Excluir</Btn>
```

---

**Edição 3 — Linha 2649** (excluirDivida, referência de estilo):

old_string:
```
                          <button onClick={() => excluirDivida(div.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>🗑️ Excluir</button>
```

new_string:
```
                          <button onClick={() => excluirDivida(div.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>Excluir</button>
```

---

**Edição 4 — Linha 2653** (excluirDivida, variante ehSoCustas):

old_string:
```
                        <button onClick={() => excluirDivida(div.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700, marginLeft: 8 }}>🗑️ Excluir</button>
```

new_string:
```
                        <button onClick={() => excluirDivida(div.id)} style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700, marginLeft: 8 }}>Excluir</button>
```

---

**Edição 5 — Linha 3477** (excluirProcesso — tema escuro):

old_string:
```
              <button onClick={() => excluirProcesso(sel.id)} style={{ background: "rgba(220,38,38,.3)", color: "#fca5a5", border: "1px solid rgba(220,38,38,.4)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>🗑 Excluir</button>
```

new_string:
```
              <button onClick={() => excluirProcesso(sel.id)} style={{ background: "rgba(220,38,38,.3)", color: "#fca5a5", border: "1px solid rgba(220,38,38,.4)", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>Excluir</button>
```

---

**Edição 6 — Linha 6235** (excluir usuário — multiline):

old_string:
```
              <button onClick={() => excluir(u.id)}
                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                🗑 Excluir
              </button>
```

new_string:
```
              <button onClick={() => excluir(u.id)}
                style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 9, padding: "7px 14px", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                Excluir
              </button>
```

Nota: a linha 6235 mantém o style original sem modificações (border: "none" permanece — é Grupo B, só remover emoji).
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const c=fs.readFileSync('c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx','utf8');const hasEmoji=[2447,2502,2649,2653,3477,6235].filter(n=>c.split('\n')[n-1].includes('\uD83D\uDDD1'));console.log('Linhas Grupo B com emoji restante:',hasEmoji.length===0?'NENHUMA (OK)':hasEmoji);"</automated>
  </verify>
  <done>
    - Linhas 2447, 2502, 2649, 2653, 3477, 6235: texto é "Excluir" sem emoji precedente
    - Estilos originais de cada botão preservados integralmente (sem adição nem remoção de propriedades CSS)
    - Linha 6235 mantém `border: "none"` original (é Grupo B — não normalizar estilo)
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Grupo A (3 botões): estilo vermelho completo aplicado + texto "Excluir" substituindo 🗑
    Grupo B (6 botões): emoji removido, estilos e texto "Excluir" preservados
    Linhas 1213, 1344, 3229 não tocadas
  </what-built>
  <how-to-verify>
    1. Abrir o app no browser
    2. Ir à seção de Acordos — verificar botão "Excluir" vermelho (fundo claro, borda fina) ao lado dos acordos
    3. Ir à seção de Devedores — verificar botão "Excluir" sem emoji no painel lateral (2 ocorrências)
    4. Ir a uma dívida — verificar botão "Excluir" sem emoji
    5. Ir a Processos — verificar botão "Excluir" sem emoji
    6. Ir a Usuários — verificar botão "Excluir" sem emoji
    7. Ir a Lembretes — verificar botão "Excluir" vermelho (fundo claro) sem emoji
    8. Ir a Etapas de Processo — verificar botão "Excluir" sem emoji ao lado do botão ✏️
    9. Confirmar que nenhum layout quebrou (botões lado a lado ainda cabem no container)
  </how-to-verify>
  <resume-signal>Digite "aprovado" ou descreva os problemas encontrados</resume-signal>
</task>

</tasks>

<verification>
Verificação final: nenhuma das 9 linhas alvo contém 🗑 ou 🗑️. Linhas 1213, 1344, 3229 inalteradas. App compila sem erros.

```bash
node -e "
const fs = require('fs');
const c = fs.readFileSync('c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx', 'utf8');
const lines = c.split('\n');
const alvo = [920, 5025, 5922, 2447, 2502, 2649, 2653, 3477, 6235];
const comEmoji = alvo.filter(n => /\uD83D\uDDD1/.test(lines[n-1]));
const intocaveis = [1213, 1344, 3229];
console.log('Linhas alvo com emoji restante:', comEmoji.length === 0 ? 'NENHUMA (OK)' : comEmoji);
console.log('Linhas intocáveis OK:', intocaveis.every(n => lines[n-1] !== undefined));
"
```
</verification>

<success_criteria>
- Todos os 9 botões alvo exibem "Excluir" sem emoji
- Grupo A (920, 5025, 5922): style unificado com border `1px solid #fecaca`, borderRadius 7, padding `4px 9px`, fontSize 11, fontWeight 700
- Grupo B (2447, 2502, 2649, 2653, 3477, 6235): estilos originais preservados, apenas emoji removido
- Linhas 1213, 1344, 3229 inalteradas
- aria-label "Excluir etapa" na linha 5922 presente
- Nenhum erro de compilação/runtime introduzido
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260415-iov-botoes-excluir-refatoracao/260415-iov-SUMMARY.md` com:
- O que foi alterado (9 botões, 2 grupos, linhas modificadas)
- Estilo aplicado no Grupo A
- Confirmação de que as linhas out-of-scope não foram tocadas
</output>
