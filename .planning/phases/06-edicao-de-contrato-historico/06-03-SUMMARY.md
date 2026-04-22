---
plan: 06-03
phase: 06-edicao-de-contrato-historico
status: complete
completed: 2026-04-22
---

## Summary

Added Histórico collapsible section to `DetalheContrato.jsx` — toggle trigger, lazy load on first open, empty state, and vertical timeline rendering criacao and edicao events from contratos_historico.

## What was built

- `listarHistorico` added to import from contratos.js
- `truncate(str, max)` helper — slices at max chars and appends "..."
- State: `historicoAberto`, `historico`, `historicoLoading`, `historicoCarregado` (useState)
- useEffect([contrato.id]) extended to reset all 4 historico state variables on contract switch
- Lazy-load useEffect([historicoAberto, contrato.id]) — fires only when `historicoAberto && !historicoCarregado`; calls listarHistorico, sets historicoCarregado(true) on success, toast.error on failure
- Toggle trigger: `<div onClick={() => setHistoricoAberto(h => !h)}` with `marginTop: 24`, renders "Histórico ▲/▼"
- Expanded container: `background: #fff`, `border: 1px solid #e2e8f0`, `borderRadius: 12`, `padding: 16px 20px`
- Loading state: "Carregando histórico..." centered text
- Empty state: "Sem histórico disponível" heading + body text (D-05)
- Timeline: `paddingLeft: 32`, absolute vertical line at `left: 16`; per-event dot at `left: -19`, 12×12, `#0f172a` background for criacao, `#4f46e5` for outros, both `border: 2px solid #4f46e5`
- Criacao body: resolves credor/devedor UUID via `credores?.find(...)?.nome || snap.credor_id`
- Edicao body: maps diffEntries using FIELD_LABELS + truncate(value, 40), before→"→"→after

## Self-Check: PASSED

- Guard `if (!historicoAberto || historicoCarregado) return` present in lazy-load useEffect
- Subsequent toggles do NOT re-fetch (historicoCarregado prevents re-entry)
- contrato.id useEffect resets historicoCarregado so switching contract reloads history
- React JSX text nodes auto-escape snapshot values (no dangerouslySetInnerHTML)
- test:regressao 9/9 passed
- npm run build clean (no errors)

## key-files

### modified
- src/components/DetalheContrato.jsx
