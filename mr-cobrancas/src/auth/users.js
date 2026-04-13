import { dbGet } from "../config/supabase.js";

const LEGACY_LOCAL_USERS = [
  {
    id: 1,
    nome: "Advair Freitas Vieira",
    oab: "OAB/GO 39.275",
    email: "advairvieira@gmail.com",
    senha: "010789wi",
    role: "admin",
  },
];

export async function fetchSystemUsers() {
  const res = await dbGet("usuarios_sistema", "order=criado_em.asc");
  return Array.isArray(res) ? res : [];
}

function normEmail(v) {
  return String(v || "").trim().toLowerCase();
}

function normSenha(v) {
  return String(v || "").trim();
}

export async function authenticateUser(email, senha) {
  const emailNorm = normEmail(email);
  const senhaNorm = normSenha(senha);
  if (!emailNorm || !senhaNorm) return null;

  // 1) Tentativa direta (mais performática)
  try {
    const emailQuery = encodeURIComponent(emailNorm);
    const senhaQuery = encodeURIComponent(senhaNorm);
    const res = await dbGet(
      "usuarios_sistema",
      `select=*&email=eq.${emailQuery}&senha=eq.${senhaQuery}&limit=1`
    );
    if (Array.isArray(res) && res[0]) return res[0];
  } catch (_) {
    // continua no fallback
  }

  // 2) Fallback robusto: compara localmente para evitar falhas por casing/espacos
  const users = await fetchSystemUsers();
  const fromSupabase = users.find(
    (u) => normEmail(u.email) === emailNorm && normSenha(u.senha) === senhaNorm
  );
  if (fromSupabase) return fromSupabase;

  // 3) Fallback local: garante acesso do admin legado mesmo se a consulta remota falhar
  return (
    LEGACY_LOCAL_USERS.find(
      (u) => normEmail(u.email) === emailNorm && normSenha(u.senha) === senhaNorm
    ) || null
  );
}
