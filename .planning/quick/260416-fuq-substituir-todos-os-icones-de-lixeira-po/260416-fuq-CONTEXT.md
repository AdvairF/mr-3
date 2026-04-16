# Quick Task 260416-fuq: Substituir ícones de lixeira por botões "Excluir" - Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Task Boundary

Substituir TODOS os ícones de lixeira (🗑/🗑️) por botões de texto "Excluir" em vermelho.
Arquivos ativos: `src/App.jsx` e `src/components/GerarPeticao.jsx`
Arquivo NÃO tocar: `src/App.js` (backup não usado — index.jsx importa App.jsx)

**Escopo completo:**
1. Linhas restantes em App.jsx: 1213 (Registro de Contato), 1344 (Lembrete), 3229 (Credor)
2. GerarPeticao.jsx linha 776: `remover(m.id)` com 🗑️
3. REVER os 9 botões já alterados na task 260415-iov para usar o novo estilo

</domain>

<decisions>
## Implementation Decisions

### Estilo unificado para todos os botões "Excluir"
- **Padronizar tudo com background transparent** — incluindo revisão dos 9 botões já alterados
- Estilo alvo:
  ```js
  style={{ color: '#DC2626', background: 'transparent', border: '1px solid #DC2626', borderRadius: '6px', padding: '4px 12px', fontWeight: '600', cursor: 'pointer', fontSize: '13px' }}
  ```
- Texto: `Excluir` (sem emoji)

### Escopo em App.jsx
- Incluir linhas 1213, 1344 e 3229 (antes fora de escopo na task 260415-iov)
- Rever as 9 linhas da task anterior para aplicar o novo estilo
- Manter aria-labels existentes (já adicionados na task 260415-b6c)

### GerarPeticao.jsx linha 776
- Substituir `🗑️` por texto "Excluir"
- Substituir `style={S.btnRed}` por inline style com o estilo alvo
- Manter `onClick={() => remover(m.id)}` intacto

### Fora de escopo
- App.js: NÃO tocar (arquivo de backup)
- Funções de deleção: NÃO alterar
- Imports de ícones: verificar se há imports desnecessários após mudanças

### Claude's Discretion
- Ordem de execução: primeiro App.jsx, depois GerarPeticao.jsx
- Commits atômicos por arquivo

</decisions>

<specifics>
## Specific Ideas

- Estilo de referência: especificado pelo usuário explicitamente no comando
- Linhas exatas a verificar (podem ter deslocado após commits anteriores): 1213, 1344, 3229 em App.jsx
- Task 260415-iov alterou linhas: ~918 (acordos), ~5023 (lembretes), ~5921 (etapas) para Grupo A; e 2447, 2502, 2649, 2653, 3477, 6235 para Grupo B

</specifics>
