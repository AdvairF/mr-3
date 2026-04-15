# Quick Task 260415-b6c: Melhorias UI e Acessibilidade - Research

**Researched:** 2026-04-15
**Domain:** React 18 + Vite, toast notifications, confirm modal hook, ARIA accessibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Usar **react-hot-toast** (leve, zero config) instalado via npm
- Importar `toast` e adicionar `<Toaster />` no App.jsx
- **Todos os 85 alert()**: substituir por toasts (success/error/warning)
- **Todos os confirm()**: substituir por modal com useConfirm hook (retorna Promise)
- `useConfirm` implementado no próprio App.jsx (não criar arquivo separado)
- ConfirmModal renderizado junto com os outros modais no App

### Claude's Discretion
- Posicionamento do Toaster (top-right padrão)
- Duração dos toasts (4s erros, 2s sucesso)
- Estilo do ConfirmModal (inline CSS consistente com app)
- Identificação dos botões de ícone sem aria-label

### Deferred Ideas (OUT OF SCOPE)
- Nenhum item explicitamente deferido
</user_constraints>

---

## Summary

O projeto é um monolito React 18 + Vite no diretório `src/mr-3/mr-cobrancas`. O `App.jsx` tem ~85 chamadas `alert()` e ~13 chamadas `window.confirm()` verificadas via grep. Nenhum `aria-label` existe hoje em botões de ícone (0 ocorrências encontradas). O `react-hot-toast` 2.6.0 é compatível com React >=16, sem conflitos com React 18. A estratégia useConfirm mais simples para um monolito sem context externo é manter estado em uma variável de módulo com callback Promise — evita adicionar um Context Provider ao componente raiz.

**Primary recommendation:** Instalar react-hot-toast 2.6.0, adicionar `<Toaster />` uma vez em App.jsx, implementar `useConfirm` como hook local com estado e Promise resolver, e adicionar `aria-label` em todos os `<button>` que só contêm emoji ou SVG.

---

## 1. react-hot-toast: Instalação e API

### Versão atual
`react-hot-toast@2.6.0` [VERIFIED: npm registry]
Peer deps: `react >= 16`, `react-dom >= 16` — compatível com React 18.2 do projeto.

### Instalação
```bash
# instalar no projeto correto (Vite)
cd src/mr-3/mr-cobrancas
npm install react-hot-toast
```

### Toaster placement em monolito
Adicionar **uma única vez** perto da raiz do JSX retornado pelo componente App principal. O `<Toaster />` usa `ReactDOM.createPortal` internamente — não precisa de wrapper separado, funciona com Vite sem config adicional. [VERIFIED: npm registry / react-hot-toast docs]

```jsx
// No topo de App.jsx (junto aos outros imports)
import toast, { Toaster } from 'react-hot-toast';

// No return() do componente raiz, fora de qualquer conditional:
<>
  <Toaster
    position="top-right"
    toastOptions={{
      success: { duration: 2000 },
      error:   { duration: 4000 },
    }}
  />
  {/* ... resto do app */}
</>
```

### API de toast
```jsx
// Substituição direta:
// alert("✅ Devedor cadastrado!")  →
toast.success("Devedor cadastrado!");

// alert("Erro ao salvar: " + e.message)  →
toast.error("Erro ao salvar: " + e.message);

// Validações (alert com "Informe...", "Preencha...", "CEP inválido")  →
toast("Informe o nome.", { icon: "⚠️" });
// ou criar helper:
const warn = (msg) => toast(msg, { icon: "⚠️", duration: 3500 });
```

**Mapeamento de padrão confirmado no código:**

| Padrão atual | Toast correto |
|---|---|
| `alert("✅ ...")` | `toast.success(...)` |
| `alert("Erro ao salvar...")` | `toast.error(...)` |
| `alert("Informe...", "Preencha...", "CEP inválido")` | `toast(msg, { icon: "⚠️" })` |
| `return alert(...)` (early return guard) | `return toast(msg, { icon: "⚠️" })` — `toast()` retorna string ID, não `undefined`; o `return` ainda funciona como guard |

---

## 2. useConfirm Hook para Monolito

### Problema
`window.confirm()` é síncrono. O código atual usa `if (!window.confirm(...)) return;` — padrão que precisa ser async para funcionar com modal React.

### Padrão recomendado: resolver externo com ref

Este padrão evita Context Provider e funciona dentro do mesmo componente raiz. [ASSUMED — padrão amplamente documentado na comunidade React, não verificado via docs oficiais]

```jsx
// ─── useConfirm — implementar dentro de App.jsx ──────────────────────
// (coloca antes do primeiro componente funcional que o usa)

import { useRef, useState, useCallback } from 'react';

function useConfirm() {
  const [state, setState] = useState({ open: false, message: '' });
  const resolverRef = useRef(null);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setState({ open: true, message });
    });
  }, []);

  function handleConfirm() {
    resolverRef.current?.(true);
    setState({ open: false, message: '' });
  }

  function handleCancel() {
    resolverRef.current?.(false);
    setState({ open: false, message: '' });
  }

  const ConfirmModal = state.open ? (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: '#fff', borderRadius: 14, padding: '28px 32px',
        maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: '#1e293b', lineHeight: 1.5 }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            aria-label="Cancelar"
            onClick={handleCancel}
            style={{ padding: '8px 18px', borderRadius: 8, border: '1.5px solid #e2e8f0',
                     background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}
          >
            Cancelar
          </button>
          <button
            aria-label="Confirmar"
            onClick={handleConfirm}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none',
                     background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmModal };
}
```

### Uso no componente (substituição de window.confirm)

```jsx
// Antes (síncrono):
function MeuComponente() {
  if (!window.confirm("Excluir este acordo?")) return;
  await excluir(id);
}

// Depois (async):
function MeuComponente() {
  const { confirm, ConfirmModal } = useConfirm();

  async function handleExcluir() {
    const ok = await confirm("Excluir este acordo e todas as parcelas?");
    if (!ok) return;
    await excluir(id);
  }

  return (
    <>
      {ConfirmModal}
      <button onClick={handleExcluir}>Excluir</button>
    </>
  );
}
```

### Coexistência com modais existentes

O App.jsx usa múltiplos estados `const [modal, setModal] = useState(...)` por componente. O `ConfirmModal` do hook **não conflita** com eles porque:
- Tem z-index 9999 (acima dos modais existentes, que provavelmente usam ~1000)
- É renderizado localmente dentro de cada componente funcional que o chama
- Não precisa de estado global nem de Portal manual

**Atenção:** O hook deve ser instanciado uma vez por componente que o usa. Para componentes grandes (como o bloco de Devedores que tem múltiplos `window.confirm`), usar **uma única instância** do hook e reusar `confirm(msg)` com mensagens diferentes.

---

## 3. Pitfalls Identificados

### Pitfall 1: React 18 Strict Mode — Toaster duplicado
**O que acontece:** Em desenvolvimento com StrictMode, o `<Toaster />` pode ser montado/desmontado duas vezes. Em produção (Vite build), não ocorre.
**Como evitar:** Colocar `<Toaster />` fora de qualquer fragmento condicional, diretamente no return do componente mais externo. Não envolver em `<React.StrictMode>` adicional. [ASSUMED — padrão documentado na comunidade]
**Sinal de alerta:** Toasts aparecendo duplicados apenas em `npm run dev`.

### Pitfall 2: `return alert(...)` como guard — silencioso
**O que acontece:** Muitas validações no código usam `return alert("Informe...")`. Ao trocar por `return toast(...)`, o comportamento funciona pois `toast()` retorna um ID (string). Mas se a função for `async`, o `return` para uma Promise — o guard ainda funciona.
**Verificado no código:** Linhas 566–567, 1010–1011, 2132–2133, etc. são todas em funções síncronas. As únicas async com guard são as de CEP (linha 1899) — atenção especial ao substituir.

### Pitfall 3: z-index do ConfirmModal vs modais existentes
**O que acontece:** O app usa `<Modal>` (componente importado de `./components/ui/Modal.jsx`). Sem inspecionar seu CSS, o z-index padrão é desconhecido.
**Como evitar:** Usar `z-index: 9999` no ConfirmModal (acima de qualquer modal razoável). Se o Modal.jsx usar z-index muito alto (ex: 10000), ajustar o ConfirmModal para 10001. [ASSUMED]
**Recomendação:** Antes de implementar, grep o z-index do Modal.jsx:
```bash
grep -n "zIndex\|z-index" src/mr-3/mr-cobrancas/src/components/ui/Modal.jsx
```

### Pitfall 4: `window.confirm` inline em handlers de onClick
**O que acontece:** Linhas 5848, 5722, 6511, 6876 têm `window.confirm` diretamente no JSX dentro de `onClick={() => { if (!window.confirm(...)) return; ... }}`. Esses não podem usar `await confirm()` diretamente em arrow function não-async.
**Como evitar:** Extrair para função `async handleX()` separada antes do return JSX.

```jsx
// Problemático — não funciona com await:
onClick={() => { if (!window.confirm("Excluir?")) return; excluir(e.id); }}

// Correto:
async function handleExcluirEtapa(id) {
  if (!await confirm("Excluir?")) return;
  se(etapas.filter(x => x.id !== id));
}
// ... no JSX:
onClick={() => handleExcluirEtapa(e.id)}
```

---

## 4. aria-label em Botões de Ícone

### Padrão ARIA [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/button/]

Um botão é "icon-only" quando seu conteúdo acessível é vazio. Em React, isso ocorre quando o botão contém apenas:
- Um SVG sem `<title>` ou `aria-label`
- Um emoji (interpretado por screen readers de forma inconsistente)
- Um componente que renderiza SVG

**Regra:** Todo `<button>` sem texto visível **deve** ter `aria-label` descritivo.

### Padrões encontrados no código

```jsx
// Botões com emoji como único conteúdo (lines 1148, 1279, 3163, etc.):
<button onClick={() => excluirRegistro(r.id)} style={...}>🗑</button>
// Correto:
<button aria-label="Excluir registro" onClick={() => excluirRegistro(r.id)} style={...}>🗑</button>

// Botão de logout com SVG (lines 6511, 6876):
<button onClick={() => { if (!window.confirm("Deseja sair?")) ... }}>
  {/* SVG do logout */}
</button>
// Correto:
<button aria-label="Sair do sistema" onClick={...}>

// Botões com texto visível (lines 2384, 2439 "🗑 Excluir") — JÁ OK, não precisam de aria-label
```

### Guia de nomes descritivos para ações do domínio

| Contexto | aria-label recomendado |
|---|---|
| Excluir devedor | `"Excluir devedor"` |
| Excluir acordo | `"Excluir acordo"` |
| Excluir dívida | `"Excluir dívida"` |
| Excluir parcela | `"Excluir parcela"` |
| Excluir registro de contato | `"Excluir registro de contato"` |
| Excluir lembrete | `"Excluir lembrete"` |
| Excluir credor | `"Excluir credor"` |
| Excluir processo | `"Excluir processo"` |
| Excluir etapa da régua | `"Excluir etapa"` |
| Excluir usuário | `"Excluir usuário"` |
| Sair do sistema | `"Sair do sistema"` |
| Fechar modal | `"Fechar"` |
| Editar item | `"Editar [entidade]"` |

**Regra prática:** Use o verbo da ação + objeto do domínio. Evite "botão" e "clique" no label — o screen reader já anuncia que é um botão.

---

## 5. Contagem de Substituições (Verificada no código)

| Tipo | Ocorrências encontradas |
|---|---|
| `alert(...)` (sem window.) | ~58 linhas |
| `window.confirm(...)` | 13 linhas (772, 992, 1033, 2222, 2317, 3093, 3362, 4760, 5437, 5722, 5848, 6096, 6511/6876) |
| `alert("✅ ...")` (success) | ~18 ocorrências |
| `alert("Erro...")` (error) | ~14 ocorrências |
| `return alert(...)` (validation guard) | ~25 ocorrências |
| `<button>🗑</button>` icon-only | ~8 ocorrências |

*Contagem baseada em grep com paginação — tratar como estimativa. O CONTEXT.md cita 85 alert() totais.*

---

## Don't Hand-Roll

| Problema | Não construir | Usar |
|---|---|---|
| Toast stack, deduplicação, dismiss | Fila manual de notificações | `react-hot-toast` |
| Portal para modal | `ReactDOM.createPortal` manual | react-hot-toast usa portal internamente; ConfirmModal com `position: fixed` dispensa portal |
| Animação de entrada/saída de toast | CSS keyframes manuais | react-hot-toast inclui animações |

---

## Assumptions Log

| # | Claim | Risk se errado |
|---|---|---|
| A1 | ConfirmModal com z-index 9999 fica acima de todos os modais existentes | Modal.jsx pode usar z-index >= 9999; verificar com grep antes de implementar |
| A2 | `return toast(msg)` funciona como guard igual ao `return alert(msg)` | toast retorna string ID (truthy) — guard nunca bloqueia o return, mas o efeito visual de parar a execução é o mesmo |
| A3 | Strict Mode não causa problema em produção Vite | Comportamento padrão do React 18 Strict Mode (dev-only) |
| A4 | Padrão useConfirm com resolverRef sem Context Provider | Abordagem community-standard não verificada via docs oficiais |

---

## Sources

### Primary (HIGH confidence)
- npm registry — `react-hot-toast@2.6.0`, peer deps confirmados
- Codebase grep — todos os padrões alert/confirm/button verificados diretamente em App.jsx
- W3C WAI-ARIA Authoring Practices — padrão aria-label para icon buttons

### Secondary (ASSUMED)
- Padrão useConfirm com Promise resolver — amplamente documentado na comunidade React mas não em docs oficiais
- React 18 Strict Mode + Toaster behavior — baseado em conhecimento de treinamento
