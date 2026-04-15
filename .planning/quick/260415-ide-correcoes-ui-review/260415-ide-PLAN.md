# Quick Plan 260415-ide — Correcoes UI Review (Top 3 Fixes)

**Source:** `.planning/quick/260415-b6c-melhorias-ui-acessibilidade/260415-b6c-UI-REVIEW.md`
**Target:** `src/mr-3/mr-cobrancas/src/App.jsx`

---

## Objective

Fix the top 3 issues from the UI Review 260415-b6c: ConfirmModal accessibility gaps, exposed SQL instruction in toast, and 9 error messages with missing Portuguese diacritics.

---

## Tasks

### Task 1: ConfirmModal ARIA + ESC key handler

**files:** `src/mr-3/mr-cobrancas/src/App.jsx` (lines 128-154)

**action:**

Modify the `ConfirmModal` JSX (starting at line 128) as follows:

1. **Outer backdrop div (line 129):** Add `onKeyDown` handler and `tabIndex={-1}` so it can receive key events:
   ```jsx
   <div
     role="presentation"
     tabIndex={-1}
     onKeyDown={(e) => { if (e.key === 'Escape') handleCancel(); }}
     style={{
       position: 'fixed', inset: 0, zIndex: 9999,
       background: 'rgba(0,0,0,0.45)',
       display: 'flex', alignItems: 'center', justifyContent: 'center'
     }}
   >
   ```

2. **Inner dialog div (line 134):** Add `role="dialog"`, `aria-modal="true"`, and `aria-labelledby="confirm-modal-title"`:
   ```jsx
   <div
     role="dialog"
     aria-modal="true"
     aria-labelledby="confirm-modal-title"
     style={{
       background: '#fff', borderRadius: 14, padding: '28px 32px',
       maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
     }}
   >
   ```

3. **Message `<p>` (line 138):** Add `id="confirm-modal-title"`:
   ```jsx
   <p id="confirm-modal-title" style={{ margin: '0 0 24px', fontSize: 15, color: '#1e293b', lineHeight: 1.5 }}>
   ```

4. **"Cancelar" button (line 142):** Add `autoFocus` so focus moves into the modal on open (safe default for destructive confirms):
   ```jsx
   <button autoFocus aria-label="Cancelar" onClick={handleCancel} ...>
   ```

**verify:** Open App.jsx and confirm:
- The outer div has `onKeyDown` with ESC handler calling `handleCancel`
- The inner div has `role="dialog"`, `aria-modal="true"`, `aria-labelledby="confirm-modal-title"`
- The `<p>` has `id="confirm-modal-title"`
- The "Cancelar" button has `autoFocus`
- `npx eslint src/mr-3/mr-cobrancas/src/App.jsx --no-eslintrc --rule '{"no-syntax-error": "off"}' --parser-options=ecmaFeatures:{jsx:true} 2>&1 | head -5` (or simply open in IDE and verify no syntax errors)

**done:** ConfirmModal has proper ARIA dialog semantics and ESC key dismissal. Screen readers announce it as a dialog. Keyboard users can press ESC to cancel.

---

### Task 2: Replace SQL toast with user-friendly message

**files:** `src/mr-3/mr-cobrancas/src/App.jsx` (line 6153)

**action:**

Replace line 6153:
```jsx
// BEFORE:
toast.success(`Usuario "${form.nome}" cadastrado localmente! Para outros dispositivos, execute o SQL_USUARIOS.sql no Supabase.`, { duration: 4000 });

// AFTER:
console.info(`[DEV] Para sincronizar "${form.nome}" com outros dispositivos, execute o SQL_USUARIOS.sql no Supabase.`);
toast.success(`Usuario "${form.nome}" cadastrado com sucesso!`, { duration: 3000 });
```

The technical SQL instruction moves to `console.info()` where developers can see it. The user sees only a clean success message.

**verify:** Search the file for "SQL_USUARIOS" -- it must appear only inside a `console.info()` call, never inside a `toast.*()` call.

**done:** No SQL or technical instructions visible to end users in toast notifications. Developer instruction preserved in console.

---

### Task 3: Fix 9 error messages with missing Portuguese diacritics

**files:** `src/mr-3/mr-cobrancas/src/App.jsx` (lines 783, 2038, 2209, 2247, 3353, 3356, 6123, 6146, 6160)

**action:**

Apply these exact string replacements at each line:

| Line | Before | After |
|------|--------|-------|
| 783 | `"Nao foi possivel salvar o acordo no Supabase: "` | `"Nao foi possivel salvar o acordo no Supabase: "` -> `"Nao foi possivel salvar o acordo no Supabase: "` |

Corrected table -- apply these find/replace operations across the file:

1. `"Nao foi possivel salvar o acordo no Supabase: "` -> `"Nao foi possivel salvar o acordo no Supabase: "` (line 783)

Actually, the simplest and most accurate approach: do a global find-and-replace for each distinct broken string:

- **Find:** `Nao foi possivel salvar o acordo` **Replace:** `Nao foi possivel salvar o acordo` -- wait, let me write the actual accented versions:

Apply these 6 distinct find-replace operations (covering all 9 lines):

1. **Find:** `Nao foi possivel salvar o acordo no Supabase`
   **Replace:** `Não foi possível salvar o acordo no Supabase`
   **Affects:** line 783

2. **Find:** `Nao foi possivel salvar o devedor no Supabase`
   **Replace:** `Não foi possível salvar o devedor no Supabase`
   **Affects:** line 2038

3. **Find:** `Nao foi possivel salvar a divida no Supabase`
   **Replace:** `Não foi possível salvar a dívida no Supabase`
   **Affects:** line 2209

4. **Find:** `Nao foi possivel salvar as custas no Supabase`
   **Replace:** `Não foi possível salvar as custas no Supabase`
   **Affects:** line 2247

5. **Find:** `Nao foi possivel cadastrar o processo no Supabase`
   **Replace:** `Não foi possível cadastrar o processo no Supabase`
   **Affects:** lines 3353 and 3356 (both occurrences)

6. **Find:** `Nao foi possivel carregar usuarios do Supabase`
   **Replace:** `Não foi possível carregar usuários do Supabase`
   **Affects:** line 6123

7. **Find:** `Nao foi possivel cadastrar o usuario no Supabase`
   **Replace:** `Não foi possível cadastrar o usuário no Supabase`
   **Affects:** line 6146

8. **Find:** `Nao foi possivel excluir o usuario no Supabase`
   **Replace:** `Não foi possível excluir o usuário no Supabase`
   **Affects:** line 6160

After all replacements, verify zero remaining occurrences of `Nao foi possivel` in the file.

**verify:** Run: `grep -c "Nao foi possivel" src/mr-3/mr-cobrancas/src/App.jsx` -- must return 0. Then run: `grep -c "Não foi possível" src/mr-3/mr-cobrancas/src/App.jsx` -- must return 9 (or close, accounting for any pre-existing accented strings).

**done:** All 9 error messages display proper Portuguese diacritics. No instances of "Nao foi possivel" remain in the file.
