// ─── SUPABASE CONFIG ─────────────────────────────────────────
export const SUPABASE_URL = "https://nzzimacvelxzstarwqty.supabase.co";
export const SUPABASE_KEY = "sb_publishable_8CYgd-tfvqnCo_O8XCuQhw_mMJmeCZr";

export async function sb(path, method = "GET", body = null, extra = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}${extra}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
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

export const dbGet    = (t, q = "")   => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",   b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH",  b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
