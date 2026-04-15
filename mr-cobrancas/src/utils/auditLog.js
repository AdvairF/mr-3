// ─── AUDIT LOG ────────────────────────────────────────────────
// Registra ações importantes do usuário no Supabase (audit_log).
// Design: módulo singleton — armazena o usuário atual internamente
// (mesmo padrão de _accessToken em supabase.js), sem precisar
// passar user como parâmetro em cada chamada.

import { dbInsert } from "../config/supabase.js";

let _currentUser = null;

/**
 * Define o usuário ativo para o contexto de auditoria.
 * Chamar com null no logout.
 */
export function setAuditUser(user) {
  _currentUser = user || null;
}

/**
 * Registra uma ação na tabela audit_log (fire-and-forget).
 * Não bloqueia a UI — erros são silenciados.
 *
 * @param {string} acao   - Descrição da ação (ex: "Criou devedor")
 * @param {string} modulo - Módulo afetado (ex: "devedores")
 * @param {object} dados  - Dados relevantes da alteração (opcional)
 */
export function logAudit(acao, modulo, dados = {}) {
  if (!_currentUser) return;

  const payload = {
    usuario_id: String(_currentUser.id ?? "local"),
    usuario_nome: _currentUser.nome || _currentUser.email || "Desconhecido",
    acao,
    modulo,
    dados: JSON.stringify(dados),
  };

  dbInsert("audit_log", payload).catch(() => {
    // Silencia erros — audit nunca deve quebrar o fluxo principal
  });
}
