# Quick Task 260415-b6c: Melhorias UI e Acessibilidade - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Task Boundary

Substituir todos os usos de alert() e confirm() nativos do navegador por um sistema de feedback visual moderno (toast notifications e modal de confirmação customizados). Adicionar atributos aria-label descritivos em todos os botões de ícone no App.jsx.

**Arquivo principal:** `src/mr-3/mr-cobrancas/src/App.jsx` (6.699 linhas, ~85 alert/confirm calls)

</domain>

<decisions>
## Implementation Decisions

### Toast Library
- Usar **react-hot-toast** — leve (~3kb), zero config, instalar via npm
- Importar `toast` e adicionar `<Toaster />` no App.jsx

### Escopo dos Alerts
- **Todos os 85 alert()**: substituir por toasts (success para ✅, error para falhas, warning para validações)
- **Todos os confirm()**: substituir por modal com useConfirm hook

### Modal de Confirmação
- Padrão **useConfirm** (retorna Promise) — mantém a lógica async existente com mínimas modificações
- `await confirm("Excluir este acordo?")` em vez de `window.confirm(...)`

### Claude's Discretion
- Posicionamento do Toaster (top-right padrão do react-hot-toast)
- Duração dos toasts (padrão: 4s para erros, 2s para sucesso)
- Estilo do ConfirmModal (inline CSS consistente com o restante do app)
- Identificação dos botões de ícone sem aria-label via análise do código

</decisions>

<specifics>
## Specific Ideas

- O `useConfirm` deve ser implementado no próprio App.jsx (não criar arquivo separado) dado que o app é um monolito
- O ConfirmModal precisa renderizar junto com os outros modais já existentes no App
- Para aria-labels: buscar padrão `<button` sem texto visível (apenas ícones SVG ou emojis como label)

</specifics>
