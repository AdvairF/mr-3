---
phase: 3
slug: nova-divida-com-co-devedores
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.4 |
| **Config file** | vite.config.js (auto-detected) |
| **Quick run command** | `cd src/mr-3/mr-cobrancas && npm run test:regressao` |
| **Full suite command** | `cd src/mr-3/mr-cobrancas && npm run build` (inclui prebuild test:regressao) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd src/mr-3/mr-cobrancas && npm run test:regressao`
- **After every plan wave:** Run `cd src/mr-3/mr-cobrancas && npm run build`
- **Before `/gsd-verify-work`:** Full build verde + verificação manual dos 5 fluxos principais
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | D-06 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 3-01-02 | 01 | 1 | D-01 | — | N/A | build | `npm run build` | ✅ | ⬜ pending |
| 3-02-01 | 02 | 2 | D-02/D-05/D-07/D-08 | T-XSS | React JSX auto-escape | manual | inspeção visual | — | ⬜ pending |
| 3-02-02 | 02 | 2 | D-03/D-04 | T-INSERT | RLS Supabase via sb() | manual | inspeção visual | — | ⬜ pending |
| 3-03-01 | 03 | 3 | D-09/ALIAS | T-INSERT | status="em cobrança" explícito | regression | `npm run test:regressao` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- Vitest + `calculos.test.js` + `filaDevedor.test.js` já existem e cobrem o motor de cálculo.
- Testes de componente React não existem no projeto — verificação manual é o padrão estabelecido.
- Nenhum pacote novo necessário.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DividaForm renderiza campos corretos | D-06 | Sem React Testing Library no projeto | Abrir aba Dívidas em Pessoa → verificar campos visíveis e salvamento funcional |
| Botão Salvar desabilitado sem Principal | D-07/D-08 | Interação UI | Abrir "+ Nova Dívida" → tentar salvar sem Principal → botão deve permanecer desabilitado com tooltip |
| Dropdown omite pessoas já na lista | D-08 | Interação UI | Adicionar pessoa → abrir busca novamente → pessoa adicionada não deve aparecer |
| Pós-save: view='lista' + toast + badge | D-09 | Interação UI | Criar dívida completa → verificar toast + retorno à lista + badge do sidebar atualizado |
| Form inline (aba Dívidas em Pessoa) sem regressão | D-06 | Risk de quebra ao extrair DividaForm | Acessar Pessoa → aba Dívidas → "+ Nova Dívida" → preencher + salvar → verificar comportamento idêntico ao pré-refatoração |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
