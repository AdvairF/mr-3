# Quick Task 260415-b6c — UI Review: Melhorias UI e Acessibilidade

**Audited:** 2026-04-15
**Baseline:** Abstract 6-pillar standards (no UI-SPEC.md)
**Screenshots:** Not captured (no dev server detected)

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 3/4 | Toast copy is clear and contextual; 9 error messages missing accents (e.g. "Nao foi possivel") and one toast leaks internal SQL instructions to users |
| 2. Visuals | 3/4 | ConfirmModal is visually clear with red destructive button; no heading/title in modal reduces scanability at a glance |
| 3. Color | 3/4 | Confirm button correctly uses #dc2626 red; ConfirmModal uses 1000+ hardcoded hex values consistent with app's existing inline-style pattern |
| 4. Typography | 3/4 | ConfirmModal font size (15px) and weight (600) are appropriate; font sizing uses inline px values throughout, consistent with app style |
| 5. Spacing | 4/4 | ConfirmModal padding (28px 32px), button gaps (10px), and message margin (24px) follow a coherent scale; no arbitrary Tailwind values detected |
| 6. Experience Design | 3/4 | 14 aria-labels added; ConfirmModal lacks role="dialog", aria-modal, and ESC key dismissal; one catch block (CEP edit) swallows errors silently |

**Overall: 19/24**

---

## Top 3 Priority Fixes

1. **ConfirmModal missing ARIA dialog role and keyboard dismissal** — Screen readers cannot identify the overlay as a dialog, and keyboard users cannot press ESC to cancel — Add `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing to a heading, and an `onKeyDown` ESC handler on the backdrop div (App.jsx lines 129–154)

2. **Technical SQL instructions exposed in user-facing toast** — Non-technical users see "Para outros dispositivos, execute o SQL_USUARIOS.sql no Supabase." at App.jsx line 6153 — Replace with a user-appropriate message such as "Usuário criado! Sincronização com outros dispositivos pendente de configuração." and move the technical note to the browser console

3. **9 error toast messages missing Portuguese diacritics** — "Nao foi possivel", "usuarios", "divida", "cadastrar" etc. appear without accents, looking like placeholder text to users — Add proper accents: "Não foi possível salvar o acordo no Supabase" (lines 783, 2038, 2209, 2247, 3353, 3356, 6123, 6146, 6160)

---

## Detailed Findings

### Pillar 1: Copywriting (3/4)

**Strengths:**
- 13 success toasts are specific and action-confirming: "Acordo salvo! Status do devedor atualizado para Acordo Firmado." (line 780), "Lembrete criado e visível para todos!" (line 1080), "Dívida adicionada com sucesso!" (line 2207)
- 36 validation guards use "⚠️" icon consistently and are specific: "Informe o número do processo.", "CEP inválido.", "Preencha descrição, valor e data de ao menos uma custa."
- ConfirmModal messages are appropriately specific: "Excluir este acordo e todas as parcelas?" (line 825), "Excluir o credor "${c.nome}"? Devedores vinculados perderão o vínculo." (line 3148)
- No generic "Submit", "OK", or "Cancel" labels found in the new code

**Issues:**
- **Missing diacritics in 9 error messages** (lines 783, 2038, 2209, 2247, 3353, 3356, 6123, 6146, 6160): "Nao foi possivel salvar..." — These were presumably copied from the original alert() calls without correction. They read as informal/broken Portuguese to users and undermine trust.
- **Internal technical instruction in toast** (line 6153): `toast.success(\`Usuário "${form.nome}" cadastrado localmente! Para outros dispositivos, execute o SQL_USUARIOS.sql no Supabase.\`)` — A toast is the wrong surface for developer instructions. Users cannot act on this; it causes confusion.
- **Silent catch block** (line 1962): The CEP edit search `catch (e) { }` produces no user feedback when the network request fails. The new-devedor flow (line 1955) correctly calls `toast.error("Erro ao buscar CEP.")` but the edit flow does not. This is a regression from the alert() era (the original likely had an alert in both branches).
- **"Excluir lembrete?"** (line 1088) is the weakest confirm message — omits context of which lembrete. Lower priority given other confirms are contextual.

### Pillar 2: Visuals (3/4)

**Strengths:**
- ConfirmModal has a clean visual hierarchy: message body at 15px/1.5 line-height, then a bottom-aligned action row
- Destructive "Confirmar" button uses red (#dc2626) which is visually distinct from the neutral "Cancelar"
- Backdrop at rgba(0,0,0,0.45) provides clear modal separation without being too dark
- 45% backdrop opacity is appropriate — lighter than the existing Modal.jsx pattern but readable
- Icon-only buttons now have aria-labels that are descriptive and in Portuguese

**Issues:**
- **No title/heading in ConfirmModal**: The modal jumps straight to the message string with no "Atenção" or "Confirmar ação" heading. For complex messages like "Excluir o credor...? Devedores vinculados perderão o vínculo.", a short bold heading would aid scanability. Without it, users must read the full message to understand the severity.
- **Button text "Confirmar" is action-agnostic**: On every confirm dialog, the red button says "Confirmar" regardless of the action. Ideally it would say "Excluir" for delete confirms and "Sair" for logout confirms. This is a known tradeoff of a generic hook — acceptable but worth noting.
- **No focus indicator visible on ConfirmModal buttons**: The inline styles set no custom `:focus` outline. Browser defaults may be suppressed by the app's global CSS reset, leaving keyboard users without a visible focus ring.

### Pillar 3: Color (3/4)

**Strengths:**
- ConfirmModal destructive button: `background: '#dc2626'` — correct red for a destructive action, consistent with the existing `#dc2626` usage elsewhere in the codebase (e.g. aria-labeled delete buttons at lines 1203, 1334 use `color: "#dc2626"`)
- Cancel button uses neutral `#f8fafc` background and `#64748b` text — appropriate secondary style
- No new Tailwind accent classes introduced; the new code follows the existing inline-style pattern

**Issues:**
- **1030 hardcoded hex values** across App.jsx (pre-existing pattern, not introduced by this task). The new ConfirmModal adds 5 more hex values (`#fff`, `#1e293b`, `#e2e8f0`, `#f8fafc`, `#64748b`). These are reasonable semantic choices but deviate slightly from the app's CSS custom properties (`--mr-ink: #0f172a` vs `#1e293b`). The modal text color could use `var(--mr-ink)` for consistency.
- **Warning toasts**: The "⚠️" icon on a default white toast is appropriate and visually distinct from success (green checkmark) and error (red X). No issues with the icon-based visual differentiation.

### Pillar 4: Typography (4/4 — no new issues)

The new UI components (ConfirmModal, Toaster) introduce minimal typography:
- ConfirmModal message: 15px / lineHeight 1.5 / color #1e293b — clear and readable
- Button labels: fontWeight 600 — appropriate weight for action labels
- Toaster uses react-hot-toast defaults (14px, system font) — acceptable

No new font sizes or weights were introduced that conflict with the app's existing typographic pattern. The app uses inline `fontSize` throughout rather than Tailwind classes, and the new code is consistent with that approach.

### Pillar 5: Spacing (4/4)

ConfirmModal spacing is well-considered:
- Container padding: `28px 32px` — comfortable reading space
- Message bottom margin: `24px` — clear separation between content and actions
- Button gap: `10px` — compact but distinguishable
- Button padding: `8px 18px` — thumb-friendly tap target

No arbitrary Tailwind `[Npx]` or `[Nrem]` values found. The new spacing values are proportional to the app's existing inline-style scale.

### Pillar 6: Experience Design (3/4)

**Strengths:**
- All 14 destructive actions now have confirmation modals before execution
- 14 aria-labels cover all identified icon-only buttons (verified: 14 found via grep)
- aria-labels are in Portuguese and descriptive: "Excluir registro de contato", "Concluir lembrete", "Marcar como pago", "Marcar como pendente", "Buscar CEP"
- Toaster durations are differentiated by severity: success 2s (low attention), error 4s (needs reading)
- Loading states exist for CEP/CNPJ lookup buttons (⏳ spinner emoji while loading)
- ConfirmModal uses Promise-based pattern — correctly works with async event handlers

**Issues:**
- **ConfirmModal lacks accessibility semantics** (App.jsx lines 129–133): No `role="dialog"`, no `aria-modal="true"`, no `aria-labelledby`. Screen readers will announce the backdrop div as a generic element, not a dialog. The modal also has no ESC key handler — keyboard users who open a confirm dialog have no way to cancel without clicking.
- **Silent error in CEP edit search** (line 1962): `catch (e) { }` — when the ViaCEP API call throws (network error, timeout), the user sees nothing. The loading spinner disappears and the fields remain empty with no explanation. The `buscarCEP` new-devedor variant (line 1955) correctly shows `toast.error("Erro ao buscar CEP.")`.
- **ConfirmModal instantiated 11 times** as separate hook instances (lines 848, 1110, 2409, 2881, 3196, 3446, 3668, 4870, 5594, 6172, 6802) — functionally correct, but means 11 hidden `<div>` mount points in the DOM when modals are closed (they return `null` but useState still allocates). Minor performance note, not a UX issue.
- **Logout confirm handler is inline async** (lines 6574, 6948): The plan called for extracting to a named `handleLogout()` function for reuse; instead both logout buttons have duplicated inline async handlers. Functionally works, but a change to logout logic requires two edits.

---

## Registry Audit

shadcn not initialized (no `components.json` found). Registry audit skipped.

---

## Files Audited

- `c:\Users\advai\Downloads\mr-cobrancas-vercel_1\mr-cobrancas\src\mr-3\mr-cobrancas\src\App.jsx` (7035 lines — primary implementation file)
- `.planning/quick/260415-b6c-melhorias-ui-acessibilidade/260415-b6c-SUMMARY.md`
- `.planning/quick/260415-b6c-melhorias-ui-acessibilidade/260415-b6c-PLAN.md`
- `.planning/quick/260415-b6c-melhorias-ui-acessibilidade/260415-b6c-CONTEXT.md`
