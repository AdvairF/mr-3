import { dbGet, signIn, setAuthToken } from "../config/supabase.js";

// Usuários locais — garantem acesso mesmo sem conexão com o banco
const LOCAL_USERS = [
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

  // 1) Supabase Auth — autenticação oficial com JWT
  try {
    const authData = await signIn(emailNorm, senhaNorm);
    if (authData?.user) {
      const token = authData.access_token;
      // Busca o perfil completo (nome, oab, role) da tabela de usuários
      const emailQuery = encodeURIComponent(emailNorm);
      const perfil = await dbGet(
        "usuarios_sistema",
        `select=*&email=eq.${emailQuery}&limit=1`
      ).catch(() => []);
      if (Array.isArray(perfil) && perfil[0]) return { ...perfil[0], _token: token };
      // Fallback: monta perfil mínimo a partir dos dados do Supabase Auth
      const meta = authData.user.user_metadata || {};
      return {
        id: authData.user.id,
        nome: meta.nome || meta.full_name || authData.user.email,
        oab: meta.oab || "",
        email: authData.user.email,
        role: meta.role || "user",
        _token: token,
      };
    }
  } catch (_) {
    // Supabase Auth falhou — tenta métodos legados
  }

  // 2) Fallback legado: busca direta na tabela
  try {
    const emailQuery = encodeURIComponent(emailNorm);
    const senhaQuery = encodeURIComponent(senhaNorm);
    const res = await dbGet(
      "usuarios_sistema",
      `select=*&email=eq.${emailQuery}&senha=eq.${senhaQuery}&limit=1`
    );
    if (Array.isArray(res) && res[0]) return res[0];
  } catch (_) {
    // sem acesso ao banco — continua
  }

  // 3) Fallback local — garante acesso mesmo offline ou sem tabela
  return (
    LOCAL_USERS.find(
      (u) => normEmail(u.email) === emailNorm && u.senha === senhaNorm
    ) || null
  );
}
