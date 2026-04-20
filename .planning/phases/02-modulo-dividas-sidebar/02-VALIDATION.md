---
phase: 2
slug: modulo-dividas-sidebar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | vite.config.js (inferred) |
| **Quick run command** | `npm run test:regressao` |
| **Full suite command** | `npm run build` (includes test:regressao prebuild) |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:regressao`
- **After every plan wave:** Run `npm run test:regressao` + manual browser smoke
- **Before `/gsd-verify-work`:** Full build (`npm run build`) must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | REQ-01 | — | No dangerouslySetInnerHTML in AtrasoCell | build | `npm run test:regressao` | ✅ calculos.test.js | ⬜ pending |
| 2-01-02 | 01 | 1 | REQ-01 | — | Alias-correct devedorObj for saldo calc | build | `npm run test:regressao` | ✅ calculos.test.js | ⬜ pending |
| 2-02-01 | 02 | 1 | REQ-04 | — | No dangerouslySetInnerHTML in table | build | `npm run test:regressao` | ✅ calculos.test.js | ⬜ pending |
| 2-02-02 | 02 | 1 | REQ-05 | — | Filter inputs use dropdown values (no free-form DB write) | manual | manual in browser | ❌ | ⬜ pending |
| 2-03-01 | 03 | 2 | REQ-06 | — | calcularDetalheEncargos receives alias-correct devedor | build | `npm run test:regressao` | ✅ calculos.test.js | ⬜ pending |
| 2-03-02 | 03 | 2 | REQ-08 | — | PRINCIPAL removal uses Modal.jsx (not window.confirm) | manual | manual in browser | ❌ | ⬜ pending |
| 2-04-01 | 04 | 3 | REQ-03 | — | Sidebar badge count correct | manual | manual in browser | ❌ | ⬜ pending |
| 2-04-02 | 04 | 3 | REQ-09 | — | Aba Dívidas in Pessoa tab unbroken | build | `npm run build` | ✅ prebuild | ⬜ pending |
| 2-04-03 | 04 | 3 | REQ-10 | — | build passes prebuild gate | build | `npm run build` | ✅ prebuild | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

No new test files required. The existing `calculos.test.js` suite (TJGO regression, 9 test cases) guards financial correctness for REQ-01 and REQ-02. New UI components are thin wrappers over verified utilities with no complex isolated business logic warranting new unit tests.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sidebar "Dívidas" item + badge visible | REQ-03 | React render in monolith — no component test harness | Open app, verify "Dívidas" nav item appears after "Pessoas"; check badge shows count of dívidas em cobrança; verify badge hidden when count = 0 |
| Table renders 8 columns + filters compose AND | REQ-04, REQ-05 | Interactive filter state | Open Dívidas module; apply Status + Credor filters together; verify rows match both conditions |
| Detalhe card financeiro correct saldo | REQ-06 | Requires live Supabase state + motor output | Click a dívida row; verify Saldo Atualizado matches calculator screen for same devedor |
| Add participant via AdicionarParticipanteModal | REQ-07 | Integration with Supabase devedores_dividas table | In Detalhe, click "+ Adicionar"; search 2+ chars; select devedor; verify appears in list |
| PRINCIPAL removal triggers Modal.jsx (not window.confirm) | REQ-08 | UI behavior — modal vs browser confirm | In Detalhe with PRINCIPAL participant, click ✕; verify Modal overlay appears (not browser confirm dialog); test "Manter dívida" and "Confirmar remoção" paths |
| Aba Dívidas inside Pessoa unbroken (coexistence) | REQ-09 | Regression — full app integration | Navigate to Pessoas; open a devedor; verify Dívidas tab still loads and edits work |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
