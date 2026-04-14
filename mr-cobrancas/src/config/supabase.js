// ─── SUPABASE CONFIG ─────────────────────────────────────────
export const SUPABASE_URL = "https://nzzimacvelxzstarwqty.supabase.co";
export const SUPABASE_KEY = "sb_publishable_8CYgd-tfvqnCo_O8XCuQhw_mMJmeCZr";

// Token de acesso do usuário autenticado (atualizado após login)
let _accessToken = null;

export function setAuthToken(token) {
  _accessToken = token;
}

export function getAuthToken() {
  return _accessToken;
}

export async function sb(path, method = "GET", body = null, extra = "") {
  const authHeader = _accessToken ? `Bearer ${_accessToken}` : `Bearer ${SUPABASE_KEY}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: authHeader,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : [];
  if (!res.ok) {
    const error = new Error(data?.message || data?.error_description || data?.error || `Erro ${res.status} no Supabase`);
    error.status = res.status;
    error.details = data;
    throw error;
  }
  return data;
}

// ─── AUTH ─────────────────────────────────────────────────────
export async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data?.error_description || data?.msg || data?.error || "Credenciais inválidas");
    error.status = res.status;
    throw error;
  }
  // Armazena o token para uso em chamadas subsequentes
  setAuthToken(data.access_token);
  return data; // { access_token, refresh_token, user, ... }
}

export async function signOut() {
  if (_accessToken) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${_accessToken}`,
      },
    }).catch(() => {});
  }
  setAuthToken(null);
}

export const dbGet    = (t, q = "")   => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",   b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH",  b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
