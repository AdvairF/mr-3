---
phase: 05-contratos-com-parcelas
status: paused
paused_at: "2026-04-21"
reason: scope-revision-needed
milestone_target: v1.2
---

# Phase 5 — Contratos com Parcelas: PAUSADA

## O que foi construído (commits no submodule mr-3)

| Commit | Arquivo | O que faz |
|--------|---------|-----------|
| `bc0dc9b` (05-01) | contratos.js | Service CRUD + `criarContratoComParcelas` + `gerarPayloadParcelas` |
| `6ef2aaa` (05-02) | NovoContrato.jsx, TabelaContratos.jsx | Form de criação + lista global 6 colunas |
| `ffd0a06` (05-03) | DetalheContrato.jsx | Header + resumo financeiro + tabela de parcelas com saldo lazy |
| `5b91c03` (05-03) | ModuloContratos.jsx | State machine 4 views |
| `fe32e50` (05-04) | TabelaDividas.jsx | Badge [NF]/[C&V]/[Empr.] inline no credor |
| `802ad72` (05-04) | DetalheDivida.jsx | Link "← Ver contrato" |
| `daa1b7a` (05-05) | App.jsx | Integração ModuloContratos + NAV + allContratos state |
| `962198e` (05-06) | DiretrizesContrato.jsx | Componente extraído de DividaForm — encargos reutilizável |
| `c1e5c03` (05-06) | DividaForm.jsx | Refatorado para usar DiretrizesContrato |
| `7efb16f` (05-06) | NovoContrato.jsx | DiretrizesContrato + bloco Custas + encargos no payload |
| `ec60b1c` (05-06) | contratos.js | `gerarPayloadParcelas` propaga encargos com nullish fallbacks |

**T6 NÃO commitada:** DetalheContrato.jsx — exibição de encargos no header (descartada via `git checkout`).

## Por que está errado — escopo real descoberto no UAT

O modelo implementado é **2 níveis**: `contratos_dividas` → `dividas` (parcelas).

O modelo real do usuário (advogado) é **3 níveis**:

```
Dívida agregada (ex: "Compra de maquinário — R$ 120.000")
  └── NF 001 — R$ 40.000
        └── Duplicata 001/3 — R$ 13.333 (venc. mai/25)
        └── Duplicata 002/3 — R$ 13.333 (venc. jun/25)
        └── Duplicata 003/3 — R$ 13.334 (venc. jul/25)
  └── NF 002 — R$ 80.000
        └── Duplicata 001/2 — R$ 40.000 (venc. ago/25)
        └── Duplicata 002/2 — R$ 40.000 (venc. set/25)
```

**Consequência:** a tela "Novo Contrato" atual não corresponde ao fluxo de trabalho real. O advogado não pensa em "contratos com N parcelas" — ele pensa em "dívidas com múltiplos documentos (NFs), cada um com suas próprias duplicatas".

## Pontos reutilizáveis no v1.2

| Artefato | Situação | Plano v1.2 |
|----------|----------|------------|
| `DiretrizesContrato.jsx` | Pronto, correto | Reutilizar sem alteração como seção de encargos por NF |
| `DividaForm.jsx` refatorado | Melhoria independente | Manter — reduz DividaForm para NovaDivida |
| `gerarPayloadParcelas` (contratos.js) | Lógica pura correta | Mover/adaptar para gerar duplicatas dentro de cada NF |
| Migration 3 (9 colunas em contratos_dividas) | Rodou no Supabase | Avaliar se contratos_dividas é renomeado ou substituído no v1.2 |
| Badge [NF]/[C&V]/[Empr.] em TabelaDividas | Independente da Phase 5 | Manter como is |
| Link "← Ver contrato" em DetalheDivida | Dependente do contrato_id | Avaliar no redesenho |

## Cenário correto para discussão no v1.2

O redesenho da Phase 5 precisa responder:

1. **Entidade raiz:** como se chama o nível 1? "Processo"? "Dívida agregada"? "Relação comercial"?
2. **Nível 2 (NF/documento):** cada NF tem seu próprio valor, data, credor — é uma sub-entidade ou é a `divida` atual?
3. **Nível 3 (duplicatas):** são as parcelas atuais de `dividas`? Ou existe uma terceira tabela?
4. **Modelo de banco:** precisa de nova tabela? Refatorar `dividas`? Adicionar coluna `parent_divida_id`?
5. **Encargos por nível:** encargos definidos no nível 1 (contrato/processo) ou por NF?

**Sugestão de abordagem para discussão:** `/gsd-discuss-phase` antes de planejar para mapear o fluxo real do advogado e decidir o modelo de dados correto.
