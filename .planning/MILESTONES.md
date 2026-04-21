# Mr. Cobranças — Milestones

## v1.0 — Refatoração Estrutural

**Shipped:** 2026-04-20
**Phases:** 1–3 | **Plans:** 15 | **Commits:** 109
**Timeline:** 2026-04-14 → 2026-04-20 (7 dias)

### Delivered

Separação do módulo Devedores em entidades Pessoas e Dívidas com banco relacional real (tabela `dividas` UUID PK + `devedores_dividas` FK real), Módulo Dívidas no sidebar com tabela global e tela de detalhe, e tela Nova Dívida com co-devedores e salvamento atômico — tudo em produção em mrcobrancas.com.br.

### Key Accomplishments

1. Migration JSONB → tabela `dividas` com UUID PK e service layer completo (`dividas.js`)
2. `carregarTudo()` paralelo sem JSONB parsing; aliases compat para motor de cálculo
3. AtrasoCell 5-tier + FiltroDividas + TabelaDividas com 4 filtros inline e saldo calculado
4. DetalheDivida com gerenciamento de pessoas vinculadas (papel/responsabilidade + PRINCIPAL warning)
5. DividaForm.jsx extraído como componente controlado puro; reutilizado em App.jsx sem regressão
6. NovaDivida.jsx com busca dropdown, modal criação rápida e salvamento atômico (7/7 E2E flows)

### Known Deferred Items

36 quick tasks sem SUMMARY.md individual (work done, commits presentes — acknowledged at milestone close)

See: `.planning/milestones/v1.0-ROADMAP.md` for full archive
