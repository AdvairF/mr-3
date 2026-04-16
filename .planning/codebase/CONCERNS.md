# Codebase Concerns

**Analysis Date:** 2026-04-14

---

## Technical Debt

**Monolithic God Component:**
- Issue: All application logic — login, dashboard, devedores, credores, processos, acordos, lembretes, relatorios, régua, gestão de usuários, PDF generation — lives in a single file
- Files: `src/mr-3/mr-cobrancas/src/App.js` (6,155 lines), `src/mr-3/mr-cobrancas/src/App.jsx` (6,699 lines)
- Impact: Extremely difficult to maintain, test, or extend any one feature without risk of breaking others. Every developer edit touches the entire application. File exceeds 256KB and cannot be read in a single pass.
- Fix approach: Extract each major section (Dashboard, Devedores, Credores, etc.) into separate feature component files under `src/components/`.

**Duplicate App Files — Active Parallel Versions:**
- Issue: Two active, nearly-identical entry points (`App.js` and `App.jsx`) alongside two full backup copies (`App.13-04-backup.js`, `App.13-04-backup.jsx`, `App.before-recovery.js`)
- Files: `src/mr-3/mr-cobrancas/src/App.js`, `src/mr-3/mr-cobrancas/src/App.jsx`, `src/mr-3/mr-cobrancas/src/App.13-04-backup.js`, `src/mr-3/mr-cobrancas/src/App.13-04-backup.jsx`, `src/mr-3/mr-cobrancas/src/App.before-recovery.js`
- Impact: Unclear which file is the true active entry point. Backup files are committed to the repo but not excluded by `.gitignore`, creating confusion and repo bloat (~25,000 lines of near-duplicate code).
- Fix approach: Determine canonical entry, delete the others, add `*.backup.*` to `.gitignore`.

**Legacy Monetary Correction Function Never Removed:**
- Issue: `calcCorrecao()` using hardcoded static monthly rates (`IGPM_MENSAL = 0.45`, `IPCA_MENSAL = 0.38`, `SELIC_MENSAL = 0.80`) is retained in `App.jsx` labeled "legacy — mantida para compatibilidade" while the accurate real-rate calculation in `utils/correcao.js` exists
- Files: `src/mr-3/mr-cobrancas/src/App.jsx` lines 43–62, `src/mr-3/mr-cobrancas/src/App.js` lines 56–75
- Impact: Risk that some call path silently uses the inaccurate fixed-rate function producing wrong monetary correction values in legal documents.
- Fix approach: Audit all call sites of `calcCorrecao()`, replace with `calcularFatorCorrecao()` / `calcularJurosAcumulados()` from `utils/correcao.js`, then delete `calcCorrecao`.

**Data Stored as JSON Blobs in Relational Columns:**
- Issue: `dividas`, `contatos`, `acordos`, and `parcelas` fields on the `devedores` table are stored as serialized JSON strings. Every load/save requires `JSON.parse` / `JSON.stringify` with a custom inline helper.
- Files: `src/mr-3/mr-cobrancas/src/App.js` line 5890 (`parse` helper), multiple call sites
- Impact: No relational integrity. Queries cannot filter on debt values or contact dates at the database layer. Full devedor records are fetched and deserialized even for simple lookups. Partial-write bugs can silently corrupt nested data.
- Fix approach: Normalize `dividas`, `acordos`, and `parcelas` into proper Supabase tables with foreign keys.

**Global State Leaked to `window`:**
- Issue: `window.__mrSetDevedores` is explicitly set as a React setState dispatcher on the global window object.
- Files: `src/mr-3/mr-cobrancas/src/App.js` line 5875
- Impact: Couples modules via the global scope instead of props or context. Any script on the page can corrupt React state. Breaks in concurrent rendering.
- Fix approach: Pass `setDevedores` as a prop or use React Context.

**Duplicate Constant Definitions:**
- Issue: `STATUS_DEV`, `UFS`, mask functions (`maskCPF`, `maskCNPJ`, `maskTel`, `maskCEP`), and component definitions (`Inp`/`INP`, `Modal`, `Btn`, `Badge`) are defined both inline in `App.js` and in the separate `utils/` and `components/` modules.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 483–516 vs `src/mr-3/mr-cobrancas/src/utils/constants.js` and `src/mr-3/mr-cobrancas/src/components/ui/`
- Impact: Changes to shared logic (e.g., status list) must be made in multiple places. Risk of inconsistencies between the two versions.
- Fix approach: `App.js` should import from the shared modules and remove its inline redefinitions.

**`Promise.all` Fetching All Tables on Every Reload:**
- Issue: `carregarTudo()` issues 5–6 parallel requests for all `devedores`, `credores`, `processos`, `andamentos`, `regua`, and `lembretes` on every 60-second polling cycle and on every user action that triggers reload.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5882–5910
- Impact: No pagination or lazy loading. As the dataset grows, initial load and poll cycles will become increasingly slow and expensive in Supabase read units.
- Fix approach: Load only the data needed for the active tab; use incremental/paginated queries for large tables.

---

## Security Concerns

**Supabase API Key Hardcoded in Source Code:**
- Risk: The publishable Supabase key `sb_publishable_8CYgd-tfvqnCo_O8XCuQhw_mMJmeCZr` and the project URL `https://nzzimacvelxzstarwqty.supabase.co` are hardcoded as string literals in two source files.
- Files: `src/mr-3/mr-cobrancas/src/config/supabase.js` lines 2–3, `src/mr-3/mr-cobrancas/src/App.js` lines 4–5
- Current mitigation: Key is labeled "publishable" — Supabase Row Level Security (RLS) would be the actual protection layer.
- Recommendations: Move to environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`) loaded via `import.meta.env`. Verify RLS policies are enforced on all tables. Rotate the key if it has been committed to a public repository.

**Admin Credentials Hardcoded in Source:**
- Risk: Admin email `advairvieira@gmail.com` and plaintext password `010789wi` are hardcoded as constants.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5678–5679, `src/mr-3/mr-cobrancas/src/auth/users.js` lines 4–13 (the `LOCAL_USERS` array with full plaintext password)
- Current mitigation: Supabase Auth JWT flow is attempted first. Hardcoded credentials are a last-resort fallback.
- Recommendations: Remove hardcoded credentials entirely. The LOCAL_USERS fallback with plaintext password should be deleted. Admin role should be determined by Supabase Auth metadata, not by email string comparison.

**Passwords Stored and Displayed in Plaintext:**
- Risk: User passwords are stored in plaintext in the `usuarios_sistema` Supabase table. The admin UI has a "mostrar/ocultar" toggle that renders the actual password string.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5791–5798
- Current mitigation: Only admin role can access the user management UI.
- Recommendations: Use Supabase Auth for all user accounts. Never store plaintext passwords. Remove the password display feature.

**Legacy Auth Fallback Bypasses JWT:**
- Risk: If Supabase Auth fails, `authenticateUser()` falls back to querying `usuarios_sistema` by matching `email=eq.X&senha=eq.Y` — i.e., comparing plaintext passwords via a URL query parameter.
- Files: `src/mr-3/mr-cobrancas/src/auth/users.js` lines 60–71
- Current mitigation: Only used as fallback when Supabase Auth is unavailable.
- Recommendations: Remove the legacy plaintext fallback. If offline access is required, use a secure local token cache.

**No Input Sanitization for Database Queries:**
- Risk: User-supplied values such as email and CPF are URL-encoded and interpolated directly into Supabase REST query strings (e.g., `email=eq.${emailQuery}`). The Supabase REST API is not vulnerable to SQL injection per se, but the pattern is error-prone.
- Files: `src/mr-3/mr-cobrancas/src/auth/users.js` lines 38–44, `src/mr-3/mr-cobrancas/src/config/supabase.js` — `dbGet`, `dbUpdate`, `dbDelete` helpers
- Recommendations: All filtering should go through the official `@supabase/supabase-js` client, which handles query building safely.

---

## Performance Concerns

**No Pagination on Any Table:**
- Problem: All `dbGet()` calls fetch entire tables with no `limit` or `range` parameter (e.g., `dbGet("devedores")` returns all rows).
- Files: `src/mr-3/mr-cobrancas/src/App.js` line 5885
- Cause: Supabase REST default returns up to 1,000 rows per request. Beyond that, results will silently be truncated.
- Improvement path: Add `limit` and `offset` parameters; implement cursor-based pagination in list views.

**60-Second Polling with Full Reload:**
- Problem: A `setInterval` fires every 60 seconds and re-fetches all six data tables in parallel regardless of what the user is doing.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5932–5939
- Cause: No realtime subscriptions; polling is the only update mechanism.
- Improvement path: Replace polling with Supabase Realtime subscriptions (`supabase.channel()`) for live updates without full reloads.

**JSON Blob Deserialization on Every Render Cycle:**
- Problem: Every time `carregarTudo` runs, all `dividas`, `contatos`, `acordos`, and `parcelas` fields for every devedor are `JSON.parse`d in a `.map()` loop.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5890–5904
- Cause: Data modeled as JSON blobs rather than relational tables.
- Improvement path: Normalize to relational tables (see Technical Debt above); parse data only once at insert/update time.

**jsPDF Loaded via CDN Script Injection at Runtime:**
- Problem: PDF generation dynamically appends a `<script>` tag pointing to `cdnjs.cloudflare.com` at the moment a user requests a PDF.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 1396–1407
- Cause: jsPDF is not in `package.json`; it is loaded on demand to avoid bundle size impact.
- Improvement path: Add `jspdf` as a proper dependency and use dynamic `import()` for code splitting; eliminates runtime CDN dependency.

---

## Fragile Areas

**Login Function Uses `setTimeout` for Auth:**
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 172–181
- Why fragile: After syncing users from Supabase, authentication runs inside a `setTimeout(..., 700)`. This artificial delay means the async `syncExtraUsers()` result may or may not have been written to `localStorage` before the check executes. It is a race condition disguised as a loading delay.
- Safe modification: Convert to a proper async/await flow using the `authenticateUser()` function from `auth/users.js` (which the `App.jsx` entry point uses correctly).

**Duplicate Entry Points — Unclear Active File:**
- Files: `src/mr-3/mr-cobrancas/src/index.js` and `src/mr-3/mr-cobrancas/src/index.jsx`; `App.js` and `App.jsx`
- Why fragile: The Vite config or entry point determines which file is active. Changes to one `App` file will have no effect if the other is the actual entry point.
- Safe modification: Verify `vite.config.js` entry and delete the unused file before editing.

**`carregarTudo` Destructuring Mismatch:**
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5885–5888
- Why fragile: `Promise.all` is called with 5 items (`dbGet("devedores")`, `dbGet("credores")`, `dbGet("processos")`, `dbGet("andamentos")`, `dbGet("lembretes",...)`) but the destructured array has 6 variables (`[devs, creds, procs, ands, reg, lems]`). The 6th variable `lems` maps to the 5th result (lembretes), and `reg` (régua) will be `undefined`, which is then passed to `setRegua()`. This silently drops régua data on load.
- Safe modification: Verify intended order and add the missing `dbGet("regua")` call or remove the `reg` variable.

**Duplicate `boxShadow` Attribute on Same Element:**
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 366, 405, 439
- Why fragile: Multiple inline style objects contain `boxShadow` defined twice (e.g., `boxShadow:"0 1px 6px ...",boxShadow:"0 1px 8px ..."`). The second definition silently overwrites the first in JSX; the intended shadow is unclear.
- Safe modification: Consolidate to single `boxShadow` value per element.

**Typo in Dashboard Greeting Logic:**
- Files: `src/mr-3/mr-cobrancas/src/App.js` line 278
- Why fragile: `const saud = hora<12?"Bom dia":"hora<18"?"Boa tarde":"Boa noite"` — the second condition is the string literal `"hora<18"` (always truthy) rather than the expression `hora<18`. `saud` is never "Boa noite". (The correct variable `saudacao` on line 279 has the right logic but `saud` may be used elsewhere.)
- Safe modification: Fix to `hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite"`.

**Silent Error Swallowing Across All DB Calls:**
- Files: `src/mr-3/mr-cobrancas/src/App.js` (18 occurrences of empty `catch` blocks), `src/mr-3/mr-cobrancas/src/auth/users.js` lines 56–58
- Why fragile: Many async database operations catch errors and do nothing (e.g., `catch(e){}`, `catch(e){ console.error(e); }`). Failed saves or deletes are invisible to the user and to monitoring.
- Safe modification: At minimum, display user-facing error messages. Implement centralized error logging.

---

## TODOs & FIXMEs

No `TODO`, `FIXME`, `HACK`, or `XXX` comments were found in the active source files. However, several implicit TODOs exist as code comments:

- `src/mr-3/mr-cobrancas/src/components/GerarPeticao.jsx` line 14: Comment notes docxtemplater is loaded dynamically to avoid "stack overflow" — a known compatibility issue with Vite that has not been resolved structurally.
- `src/mr-3/mr-cobrancas/src/App.js` line 5895: Inline comment `// valor_original pode ser calculado das dividas se o banco não tiver a coluna` — indicates the database schema may be missing a column and the code compensates.
- `src/mr-3/mr-cobrancas/src/App.jsx` line 43: Comment `// ─── MONETARY CORRECTION (legacy — mantida para compatibilidade)` — marks code that should be removed but has not been.

---

## Missing Functionality

**No Password Change Feature:**
- Problem: Users cannot change their own passwords. The admin can see plaintext passwords, but there is no self-service password reset.
- Blocks: Standard security practice. Any real multi-user deployment requires this.

**No Role-Based Access Control Enforcement in UI:**
- Problem: The `role` field (`admin`, `advogado`, `assistente`, `estagiario`) is stored but only the `isAdmin` check (based on email match to `ADMIN_EMAIL`) gates the Gestão de Usuários tab. No other feature enforces role-based restrictions.
- Files: `src/mr-3/mr-cobrancas/src/App.js` line 5943

**Régua de Cobrança Rules Not Persisted Correctly:**
- Problem: The `carregarTudo` destructuring bug (see Fragile Areas) means `reg` (the régua) is always `undefined` after load, so any saved régua rules may not display.
- Files: `src/mr-3/mr-cobrancas/src/App.js` lines 5885–5888, 5908

**No Test Suite:**
- Problem: There are no test files of any kind. No unit, integration, or E2E tests exist.
- Impact: Every change to the 6,000+ line monolith is untested. Monetary correction calculations (with legal significance) have no regression tests.

**Processes Tab Incomplete Schema:**
- Problem: `migration_processos.sql` exists and adds columns `instancia`, `numero_origem`, `data_ajuizamento`, `data_distribuicao`, `observacoes` to the `processos` table. These migrations must be run manually in the Supabase dashboard and there is no record of whether they have been applied.
- Files: `src/mr-3/mr-cobrancas/migration_processos.sql`, `src/mr-3/mr-cobrancas/migration_credores.sql`

---

*Concerns audit: 2026-04-14*
