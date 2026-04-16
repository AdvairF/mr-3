# Quick Task 260415-iov: Refatoração Visual Botões de Exclusão - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Task Boundary

Substituir o ícone 🗑 (lixeira) por texto "Excluir" em todos os botões de exclusão do App.jsx.
Arquivo: `src/mr-3/mr-cobrancas/src/App.jsx`

**Dois grupos de botões encontrados:**

### Grupo A — Botões só com ícone (3 ocorrências)
- Linha 920: `<button onClick={() => excluirAcordo(ac.id)}>🗑</button>`
- Linha 5025: `<button onClick={() => excluir(l.id)}>🗑</button>`
- Linha 5922: `<button style={{...}}>🗑</button>`

### Grupo B — Botões com ícone + texto (6 ocorrências)
- Linhas 2447, 2502, 2649, 2653, 3477, 6235: `🗑 Excluir` ou `🗑️ Excluir`

</domain>

<decisions>
## Implementation Decisions

### Grupo B (ícone + texto)
- **Só remover o ícone** — manter o texto "Excluir" e o estilo atual sem alterações
- Resultado: `🗑 Excluir` → `Excluir`

### Grupo A (só ícone)
- **Botão completo com fundo vermelho claro** — estilo: `background: #fee2e2, color: #dc2626, border: 1px solid #fecaca, borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontSize: 11, fontWeight: 700`
- Texto: "Excluir"
- Consistente com os botões de exclusão de dívidas já existentes (linhas 2649, 2653)

### Claude's Discretion
- Manter `aria-label` existentes (já foram adicionados na task 260415-b6c)
- Não alterar handlers/funções
- Não tocar em botões que NÃO sejam de exclusão

</decisions>

<specifics>
## Specific Ideas

- Estilo de referência para Grupo A: copiar do botão da linha 2649 (`background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 7, padding: "4px 9px"`)
- Verificar linha 5922 que já tem style parcial — adaptar sem perder propriedades existentes

</specifics>
