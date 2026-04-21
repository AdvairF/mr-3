---
phase: 4
plan: 3
subsystem: ui-integration
tags: [pagamentos, divida, badge, saldo-quitado, react, detalheDivida, tabelaDividas]
dependency_graph:
  requires: [PagamentosDivida.jsx:default, pagamentos.js:calcularSaldoPorDividaIndividual, dividas.js:atualizarSaldoQuitado]
  provides: [DetalheDivida.jsx:PagamentosDivida-integrated, TabelaDividas.jsx:saldo-quitado-badge]
  affects: []
tech_stack:
  added: []
  patterns: [useState-local-override, onSaldoChange-callback, conditional-badge-rendering]
key_files:
  created: []
  modified:
    - src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx
    - src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx
decisions:
  - "financial card .map substituído por 3 divs explícitos — necessário para badge condicional apenas na célula Saldo Atualizado"
  - "saldoAtual = saldoDividaLocal ?? saldoDivida — saldoDividaLocal inicializa null, só sobrescreve após onSaldoChange de PagamentosDivida"
  - "TabelaDividas usa d.saldo_quitado === true (strict equality) — falha segura se coluna retornar null/undefined (badge não aparece)"
metrics:
  duration: "2 minutes"
  completed: "2026-04-21"
  tasks_completed: 2
  tasks_total: 2
  files_created: 0
  files_modified: 2
---

# Phase 4 Plan 3: Integração PagamentosDivida + Badge Saldo Quitado Summary

**One-liner:** DetalheDivida integra PagamentosDivida com onSaldoChange e exibe badge "Saldo quitado" no card financeiro; TabelaDividas exibe o mesmo badge na coluna Atraso lendo d.saldo_quitado persistido.

## What Was Built

Dois componentes existentes modificados para fechar o ciclo visual do módulo de pagamentos:

**DetalheDivida.jsx** — 5 mudanças cirúrgicas:
1. `import PagamentosDivida from "./PagamentosDivida.jsx"` adicionado
2. `useState(null)` para `saldoDividaLocal` — sobrescreve o saldo calculado pelos pagamentos_parciais do devedor quando PagamentosDivida propaga novo saldo via `onSaldoChange`
3. `saldoAtual = saldoDividaLocal !== null ? saldoDividaLocal : saldoDivida` — valor efetivo usado no card financeiro
4. Financial card expandido de `.map` para 3 `<div>` explícitos — célula "Saldo Atualizado" ganhou badge condicional `role="status"` quando `saldoAtual !== null && saldoAtual <= 0`
5. `<PagamentosDivida divida={divida} hoje={hoje} onSaldoChange={(novoSaldo) => setSaldoDividaLocal(novoSaldo)} />` montado após card "Pessoas Vinculadas", antes do botão "Editar Dívida"

**TabelaDividas.jsx** — 1 mudança cirúrgica:
- Coluna Atraso: substituição condicional — `d.saldo_quitado === true` exibe badge "Saldo quitado" (`#dcfce7`/`#065f46`, borderRadius 99) em vez de `<AtrasoCell>`. Dívidas não quitadas continuam com `AtrasoCell` intacta.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Integrar PagamentosDivida em DetalheDivida + badge no card financeiro | 095a173 | src/components/DetalheDivida.jsx (modified) |
| 2 | Badge Saldo quitado em TabelaDividas lendo divida.saldo_quitado | d1d2f50 | src/components/TabelaDividas.jsx (modified) |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

Ameaças do threat model verificadas:

| Threat ID | Status | Observation |
|-----------|--------|-------------|
| T-04-08 | Aceito | saldo_quitado=true só é persistido por atualizarSaldoQuitado em PagamentosDivida após cálculo Art.354 real |
| T-04-09 | Aceito | Single-tenant — badge visível apenas para o advogado autenticado |
| T-04-10 | Aceito | onSaldoChange recebe valor de calcularSaldoPorDividaIndividual (determinístico, código próprio) |

Nenhuma nova superfície de ameaça introduzida além do que foi modelado.

## Known Stubs

None — integração completa. PagamentosDivida montada com todos os props obrigatórios (divida, hoje, onSaldoChange). Badge "Saldo quitado" renderizado condicionalmente em ambos os pontos especificados em D-08.

## Self-Check: PASSED

- [x] `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — FOUND (commit 095a173)
- [x] `import PagamentosDivida` — FOUND (1 match)
- [x] `saldoDividaLocal` — FOUND (4 matches: useState, setSaldoDividaLocal×2, saldoAtual calc)
- [x] `saldoAtual` — FOUND (3 matches: declaração + 2 usos no JSX)
- [x] `Saldo quitado` JSX text — FOUND (linha 156)
- [x] `role="status"` — FOUND (1 match)
- [x] `<PagamentosDivida` com `divida={divida}` e `onSaldoChange` — FOUND
- [x] `allPagamentos` NÃO passado para PagamentosDivida — CONFIRMED (0 matches)
- [x] `#dcfce7` em DetalheDivida — FOUND (2 matches: badge novo)
- [x] `#065f46` em DetalheDivida — FOUND (2 matches: badge novo)
- [x] `useState` importado — FOUND (3 matches)
- [x] `import DevedoresDaDivida` — FOUND (intacto)
- [x] `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` — FOUND (commit d1d2f50)
- [x] `d.saldo_quitado === true` — FOUND (1 match)
- [x] `Saldo quitado` text in TabelaDividas — FOUND (1 match)
- [x] `#dcfce7` in TabelaDividas — FOUND (badge + StatusBadgeDivida)
- [x] `#065f46` in TabelaDividas — FOUND (badge + StatusBadgeDivida)
- [x] `AtrasoCell` — FOUND (2 matches: import + conditional use)
- [x] `calcularSaldosPorDivida` — FOUND (intacto)
- [x] `StatusBadgeDivida` — FOUND (intacto)
- [x] `calcularSaldoPorDividaIndividual` NOT in TabelaDividas — CONFIRMED (0 matches)
