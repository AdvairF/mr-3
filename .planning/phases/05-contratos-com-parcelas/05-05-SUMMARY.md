---
phase: 05-contratos-com-parcelas
plan: 05
status: complete
completed: 2026-04-22
---

# Plan 05-05: ModuloContratos.jsx + App.jsx Integration

Task 1 (ModuloContratos.jsx): Complete rewrite for 3-level model. 4-view state machine (lista/novo/detalhe/parcela-detalhe). parcelasPorContrato useMemo Map. contratosAtivos count (parcelas não quitadas). Navigation handlers: handleVerDetalhe, handleVoltar, handleVoltarDoNovo, handleContratoCreado (D-06: novo→detalhe via onVoltarComContrato), handleVerParcela, handleVoltarDaParcela. Embedded DetalheDivida at parcela-detalhe view with onVerContrato back-nav. Teal (#0d9488) header badge + Btn.

Task 2 (App.jsx — 5 targeted edits): ModuloContratos import; I.contratos SVG icon; allContratos + allDocumentos useState; 10-item carregarTudo Promise.all (contratos_dividas + documentos_contrato); documentosMap enrichment (_contrato_tipo via documento_id, not contrato_id — 3-level fix); NAV entry (Contratos, teal); renderPage case "contratos".

Bug fix (post-UAT): setAllDividas was called with raw `divs` before the enrichment loop — allDividas state arrived in TabelaDividas without `_contrato_tipo`, so badge [NF]/[C&V]/[Empr.] never rendered (CON-05). Fixed by moving setAllDividas after the dividasMap forEach: `setAllDividas([...dividasMap.values()].flat())`.

Task 3 (human verify — E2E): All 28 verification steps passed. Sidebar Contratos ✓, NovoContrato form ✓, criar→detalhe nav ✓, DetalheContrato empty state ✓, AdicionarDocumento 7 fields + preview ✓, card [NF] + parcelas table ✓, DetalheDivida + breadcrumb duplo ✓, TabelaDividas badge [NF] ✓, TabelaContratos (sem coluna Tipo) ✓. 2 extra migrations (DROP NOT NULL valor_total/data_inicio/num_parcelas + NUMERIC precision fix) applied by user during UAT.

Build: ✓ built in 493ms (no errors)
Commits: c9d14b7 + 987e312 (submodule Tasks 1-2) / 9273a7d (submodule bug fix) / c2f6a15 (parent bump)

## Self-Check: PASSED
