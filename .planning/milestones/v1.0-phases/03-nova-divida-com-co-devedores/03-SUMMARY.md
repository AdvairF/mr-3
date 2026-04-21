# Phase 03 — Nova Dívida com Co-devedores: SUMMARY

**Status:** COMPLETE  
**Date closed:** 2026-04-20  
**Plans executed:** 03-01, 03-02, 03-04, 03-05, 03-03 (sign-off)

---

## What was built

- **DividaForm.jsx** — componente controlado puro extraído do formulário de edição existente; reutilizado em NovaDivida e na aba Dívidas em Pessoa sem regressão
- **NovaDivida.jsx** — tela completa: campos financeiros (DividaForm), seção Pessoas na Dívida (Principal + co-devedores), busca com dropdown (≥2 chars, sem duplicatas), modal "Criar Pessoa Rápida", salvamento atômico (criarDivida + adicionarParticipante × N)
- **ModuloDividas view routing** — view='nova' adicionado; botão "+ Nova Dívida" no header
- **CR-03 fix** — `calcularTotalPagoPorDivida` criado em devedorCalc.js; DetalheDivida exibe Total Pago correto por dívida (não soma global)
- **CR-04 fix** — `listarParticipantes` simplificado para `select=*` (sem embedded join PostgREST); enriquecimento de dados do devedor movido para client-side em DevedoresDaDivida via prop `devedores[]`; guarda pós-loop em `handleSalvar` lança erro se PRINCIPAL não confirmado em devedores_dividas

## Commits

| Commit | Descrição |
|--------|-----------|
| 62aabc5 | feat(03-01): DividaForm.jsx + App.jsx refactor + ModuloDividas view routing |
| 88489f5 | feat(03-02): NovaDivida.jsx full implementation |
| 8090f6b | fix(03-04): CR-03 — calcularTotalPagoPorDivida |
| ba92f11 | fix(CR-04): listarParticipantes sem embedded join + enriquecimento client-side + guarda pós-loop |
| 2db529e | fix(03-05): bump submodule — CR-04 fix |

## E2E Sign-off (7 flows — 2026-04-20)

| Flow | Descrição | Status |
|------|-----------|--------|
| 1 | Regressão aba Dívidas em Pessoa | ✓ |
| 2 | "+ Nova Dívida" button no header | ✓ |
| 3 | Busca e seleção Principal + exclusão de duplicatas | ✓ |
| 4 | Modal "Criar Pessoa Rápida" | ✓ |
| 5 | Botão Salvar desabilitado sem Principal | ✓ |
| 6 | Salvamento atômico — Principal vinculado em devedores_dividas | ✓ |
| 7 | Cancelar criação | ✓ |

## Key decisions

- `devedor_id` em dividas = id do PRINCIPAL (desnormalizado) — manter compatibilidade com carregarTudo()
- `status: "em cobrança"` explícito no payload (não depender de DEFAULT banco)
- Motor aliases (indexador, juros_am, multa_pct, honorarios_pct) adicionados por carregarTudo(), não pelo payload de criação
- embedded join PostgREST removido de listarParticipantes — dependência de FK no schema cache era frágil; client-side join via prop devedores[] é mais resiliente
- Guarda pós-loop lança Error explícito em vez de silenciar falha de vínculo

## Test coverage

- `npm run test:regressao` — 9/9 TJGO (código de cálculo intocado)
- `npm run build` — exit 0 (488ms)
