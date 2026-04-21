---
phase: 1
slug: refatora-o-pessoas-d-vidas-big-bang-noturno
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-18
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (já configurado no vite.config.js) |
| **Config file** | `src/mr-3/mr-cobrancas/vite.config.js` |
| **Quick run command** | `cd src/mr-3/mr-cobrancas && npm run test:regressao` |
| **Full suite command** | `cd src/mr-3/mr-cobrancas && npm run test:regressao` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:regressao`
- **After every plan wave:** Run `npm run test:regressao` + verificação manual no Supabase
- **Before `/gsd-verify-work`:** Full suite must be green + Vercel deploy confirmado
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|--------|
| migration-sql | 01 | 1 | Schema | — | dividas table populated | manual | `SELECT count(*) FROM dividas` | ⬜ pending |
| migration-devedores-dividas | 01 | 1 | FK real | — | divida_id UUID FK valid | manual | `SELECT count(*) FROM devedores_dividas JOIN dividas ON ...` | ⬜ pending |
| carregarTudo-refactor | 02 | 2 | Data load | — | devidas loaded parallel | regression | `npm run test:regressao` | ⬜ pending |
| devedores-component | 02 | 2 | UI | — | Devedores reads from prop | regression | `npm run test:regressao` | ⬜ pending |
| write-operations | 02 | 2 | CRUD | — | 7 surfaces use dividas table | regression | `npm run test:regressao` | ⬜ pending |
| menu-label | 02 | 2 | UI | — | menu shows "Pessoas" | manual | visual check | ⬜ pending |
| build-deploy | 03 | 3 | Deploy | — | build passes, Vercel up | automated | `npm run build` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- Existing test infrastructure covers all phase requirements (`calculos.test.js`, `filaDevedor.test.js`)
- No new test files needed — unit tests are pure functions unaffected by DB refactoring
- Manual SQL verification covers migration correctness

*Existing infrastructure covers all phase requirements for automated testing.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| tabela dividas populada | Schema migration | No test DB — Supabase production | `SELECT id, devedor_id, valor_original FROM dividas LIMIT 10` |
| devedores_dividas FK válida | Integridade referencial | DB constraint verification | `SELECT count(*) FROM devedores_dividas d JOIN dividas v ON d.divida_id = v.id` |
| 4 devedores com dívidas corretas | Migração de dados | Visual verification | Abrir cada devedor, conferir valor/vencimento/status |
| menu label "Pessoas" visível | UI rename | Browser visual | Abrir app, verificar sidebar |
| cálculos de saldo corretos pós-migração | Compatibilidade devedorCalc | Depends on DB + runtime | Abrir devedor advair, verificar saldo R$ 4.000 - pagamentos parciais |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
