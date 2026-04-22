---
plan: 06-02
phase: 06-edicao-de-contrato-historico
status: complete
completed: 2026-04-22
---

## Summary

Added full edit mode UI to `DetalheContrato.jsx` — inline header card form with state machine, cascade confirmation, spinner feedback, and history event registration.

## What was built

- `Spinner` component (inline @keyframes spin, 12×12 border animation)
- `FIELD_LABELS` constant (11 keys mapping DB columns to PT-BR labels)
- `initEditForm(c)` helper — initialises editForm from contrato prop
- State: `editando`, `salvando`, `editForm` (useState)
- `useEffect([contrato.id])` — resets editForm and clears editando on contract switch
- `handleEncargos(field, val)` — updates editForm.encargos slice
- `handleCancelar()` — resets form and closes edit mode
- `handleSalvar()` — builds payload, detects credor/devedor change, shows window.confirm with N parcelas count, calls cascatearCredorDevedor (if cascade), editarContrato, registrarEvento with diff object (.catch swallowed), toast.success, onCarregarTudo()
- `credoresOptions` / `devedoresOptions` derived arrays for Inp selects
- Header card: conditional read mode (`border: #e8f0f7`) with "Editar Contrato" button / edit mode (`border: #c7d2fe`) with Inp referência, Inp credor/devedor selects, DiretrizesContrato, Cancelar/Salvar buttons

## Self-Check: PASSED

- handleSalvar detects credorAlterado/devedorAlterado via String() comparison
- Cascade confirm message includes N parcelas count
- EDT-04 respected: encargos-only changes do not trigger cascade
- registrarEvento wrapped in .catch(() => {})
- Spinner renders when salvando === true
- test:regressao 9/9 passed
- npm run build clean (124 modules, no errors)

## key-files

### modified
- src/components/DetalheContrato.jsx
