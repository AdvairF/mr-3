---
plan: 06-01
phase: 06-edicao-de-contrato-historico
status: complete
completed: 2026-04-22
---

## Summary

Extended `contratos.js` with all service functions required for Phase 6. Task 1 (DB migration) was pre-executed by the user; Task 2 applied all code changes.

## What was built

- `registrarEvento(contratoId, tipoEvento, snapshotCampos)` — inserts row in `contratos_historico` via `dbInsert`; `usuario_id` filled by DB `DEFAULT auth.uid()`
- `criarContrato` promoted to `async` and now fire-and-forgets a `'criacao'` event after INSERT (HIS-01); swallows history errors with `.catch(() => {})`
- `editarContrato(contratoId, payload)` — thin wrapper over `dbUpdate(TABLE, ...)`
- `cascatearCredorDevedor(contratoId, { credor_id, devedor_id })` — sequential loop: documentos_contrato → dividas per doc, all with `dbUpdate`
- `listarHistorico(contratoId)` — `dbGet(HIST_TABLE, 'contrato_id=eq.{id}&order=created_at.desc')`
- `const HIST_TABLE = "contratos_historico"` added
- Migration comment block for Phase 6 prepended to file header

## Self-Check: PASSED

- All 5 new exports present and verified via grep
- `criarContrato` is now async with fire-and-forget `.catch(() => {})`
- `cascatearCredorDevedor` uses `encodeURIComponent` in dbGet query
- `registrarEvento` does NOT pass `usuario_id` in payload
- All pre-existing exports unchanged (`listarContratos`, `buscarContrato`, `listarDocumentosPorContrato`, `gerarPayloadParcelasDocumento`, `recalcularTotaisContrato`, `adicionarDocumento`)
- `test:regressao` 9/9 passed
- `npm run build` clean (123 modules transformed, no errors)

## key-files

### created
- (none — only modified existing file)

### modified
- src/services/contratos.js
