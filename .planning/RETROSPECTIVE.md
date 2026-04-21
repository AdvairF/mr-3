# Project Retrospective — Mr. Cobranças

*Documento vivo, atualizado após cada milestone. Lições alimentam planejamentos futuros.*

---

## Milestone: v1.0 — Refatoração Estrutural

**Shipped:** 2026-04-20
**Phases:** 3 | **Plans:** 15 | **Commits:** 109
**Timeline:** 2026-04-14 → 2026-04-20 (7 dias)

### What Was Built

- Migration JSONB → tabela `dividas` (UUID PK) + `devedores_dividas` (FK real) + service layer completo
- `carregarTudo()` paralelo sem JSONB parsing; aliases compat isolados no carregamento
- Módulo Dívidas: AtrasoCell 5-tier + TabelaDividas + FiltroDividas (4 filtros) + DetalheDivida
- Gerenciamento de pessoas vinculadas a dívidas com PRINCIPAL warning
- DividaForm.jsx como componente controlado puro e reutilizável
- NovaDivida.jsx com busca dropdown, modal criação rápida, salvamento atômico — 7/7 E2E flows

### What Worked

- **GSD framework com planos por ondas** — cada plan executado atomicamente com commit; fácil rollback e rastreamento
- **Code reviews (CR-01 a CR-04)** — detectaram bugs reais antes da produção (aliases faltando, saldo por dívida, embedded join PostgREST)
- **Prebuild gate Vitest** — `npm run test:regressao` como portão impediu regressões de cálculo
- **Big bang noturno** — execução da migration SQL + refactor App.jsx em uma sessão foi a abordagem certa; tentativa incremental teria sido mais arriscada
- **Aliases compat isolados em carregarTudo()** — decisão de não propagar aliases para o payload de criação simplificou muito as operações de escrita
- **Quick tasks paralelas à milestone** — 36 melhorias incrementais (Fila de Devedor, Art.523, calculadora) entregues sem bloquear o milestone principal

### What Was Inefficient

- **36 quick tasks sem SUMMARY.md** — trabalho completo mas sem registro estruturado; na v1.1 estabelecer padrão mínimo de documentação para quick tasks
- **CR-03/CR-04 descobertos pós-execução** — detecção de `calcularTotalPagoPorDivida` e `listarParticipantes embedded join` poderia ter sido feita no plan review
- **`devedores.dividas` JSONB não removido** — coluna legada ainda existe; cleanup postergado; considerar prazo formal na v1.1

### Patterns Established

- **Payload = colunas DB; aliases = carregarTudo()** — separação clara entre o que vai ao banco e o que o motor de cálculo precisa
- **status: "em cobrança" explícito no payload** — nunca depender de DEFAULT do banco em criações
- **`devedor_id` em `dividas` = PRINCIPAL (desnormalizado)** — update manual necessário em mudanças de papel
- **Componentes controlados puros** — DividaForm sem state interno de campos; estado gerenciado pelo pai
- **Guarda pós-loop em handleSalvar** — verificar PRINCIPAL confirmado em `devedores_dividas` após insert, não apenas antes

### Key Lessons

1. **Code review estruturado pós-execução é essencial** — CR-01 a CR-04 pegaram bugs que testes unitários não cobrem (comportamento Supabase, embedded join, saldo por escopo)
2. **quick tasks precisam de SUMMARY mínimo** — sem registro, o audit-open vira ruído na hora do milestone close
3. **Migration SQL one-shot + seed no mesmo arquivo** — funcionou perfeitamente; não tentar fazer incremental para refactors estruturais de banco
4. **Validação em produção (não só localhost)** — CR-02 e CR-04 só apareceram em produção; sempre testar no Vercel antes de sign-off

### Cost Observations

- Model: claude-sonnet-4-6 (balanced profile)
- Sessions: múltiplas ao longo de 7 dias
- Notable: GSD executor com worktrees paralelos reduziu tempo de execução das ondas; plan_check e verifier automáticos pegaram desvios antes do commit

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 3 | 15 | Primeiro milestone com GSD framework; quick tasks paralelas estabelecidas |

### Cumulative Quality

| Milestone | Tests | Prebuild Gate | Zero-Dep Additions |
|-----------|-------|---------------|-------------------|
| v1.0 | 7 casos TJGO | ✓ Vitest | DividaForm.jsx, AtrasoCell.jsx, FiltroDividas.jsx |

### Top Lessons (Cross-Milestone)

1. Code review estruturado pós-execução detecta bugs que testes unitários não cobrem
2. Quick tasks sem SUMMARY viram ruído no milestone close — documentar na hora
