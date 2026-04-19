# Roadmap — Mr. Cobranças

## Milestone 1: Refatoração Estrutural

Separar o módulo Devedores em entidades Pessoas e Dívidas com relacionamento N:N real no banco, eliminando o JSONB embutido e criando a base para features futuras (unificação de histórico, deduplicação de CPF, múltiplos credores por pessoa).

---

### Phase 1: Refatoração Pessoas × Dívidas — big bang noturno

**Goal:** Extrair dívidas do JSONB `devedores.dividas` para tabela própria `dividas` com UUID PK; recriar `devedores_dividas` com FK real; atualizar App.jsx para ler/escrever na nova estrutura; renomear label "Devedores" → "Pessoas" no menu.

**Plans:** 6 plans

Plans:
- [x] 01-01-PLAN.md — Migration SQL: CREATE TABLE dividas + seed JSONB + DROP/CREATE devedores_dividas UUID FK (CHECKPOINT: awaiting Supabase SQL execution)
- [x] 01-02-PLAN.md — Service layer: dividas.js CRUD operations (COMPLETE: 9224e95)
- [x] 01-03-PLAN.md — Refactor carregarTudo() parallel load + dividasMap + compatibility layer (COMPLETE: d087052)
- [x] 01-04-PLAN.md — Refactor 7 write surfaces (adicionarDivida, custas, editar, excluir, toggle, reload, criar devedor) (COMPLETE: b346752, 217134b)
- [x] 01-05-PLAN.md — Rename NAV label "Devedores" → "Pessoas" (COMPLETE: 80f8ad8)
- [~] 01-06-PLAN.md — Build, test:regressao, deploy, production verification (CHECKPOINT: build green aec3ad4 — awaiting production verify at mrcobrancas.com.br)

**Acceptance criteria:**
- Tabela `dividas` existe com UUID PK, contém todas as dívidas migradas do JSONB
- `devedores_dividas` usa `divida_id UUID REFERENCES dividas(id)` (FK real)
- `carregarTudo()` carrega `dividas` separado em paralelo (sem JSONB parsing)
- Componente `Devedores` em App.jsx lê de `dividas` array, não de `devedor.dividas`
- Operações CRUD de dívida usam `dbInsert/dbUpdate/dbDelete("dividas", ...)`
- Label do menu mostra "Pessoas" (não "Devedores")
- `npm run build` (com test:regressao prebuild) passa sem erros
- Deploy no Vercel funciona; 4 devedores e suas dívidas estão visíveis e corretos

**Constraints:**
- Tabela DB mantém nome `devedores` (sem renomear); só a UI muda
- `devedor_id` nas junction tables permanece (sem renomear para `pessoa_id`)
- Prebuild `test:regressao` (pure unit tests) não pode quebrar
- Migração deve ser reversível: JSONB só removido após confirmar deploy

**References:**
- `brief-refatoracao-modulo-devedores.md` — spec completo
- `.planning/notes/decisoes-refatoracao-pessoas-dividas.md` — decisões arquiteturais
- `.planning/todos/pending/refatoracao-big-bang-noturno.md` — sequência detalhada
- `.planning/codebase/ARCHITECTURE.md` — arquitetura atual
- `src/mr-3/mr-cobrancas/src/services/migrations/001_devedores_dividas.sql` — migration existente
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — service existente
