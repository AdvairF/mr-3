-- ─── AUDIT LOG — Trilha de Auditoria ─────────────────────────
-- Execute este script no SQL Editor do Supabase para criar a tabela
-- de log de auditoria utilizada pelo sistema MR Cobranças.

-- 1. Criar tabela
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  TEXT        NOT NULL,
  usuario_nome TEXT       NOT NULL,
  acao        TEXT        NOT NULL,
  modulo      TEXT        NOT NULL,
  dados       JSONB,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario  ON audit_log (usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_modulo   ON audit_log (modulo);
CREATE INDEX IF NOT EXISTS idx_audit_log_criado   ON audit_log (criado_em DESC);

-- 3. Habilitar Row Level Security (somente admins leem; qualquer usuário autenticado insere)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Política de INSERT: usuários autenticados podem inserir registros
CREATE POLICY "audit_insert" ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política de SELECT: somente admins / service_role
-- (ajuste a coluna de role conforme sua tabela de usuários)
CREATE POLICY "audit_select_admin" ON audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios_sistema
      WHERE email = auth.jwt() ->> 'email'
        AND role = 'admin'
    )
  );

-- Permite leitura irrestrita via service_role (Supabase SDK anon key com apikey header)
-- Remove a linha abaixo se quiser restringir totalmente a admins:
CREATE POLICY "audit_select_anon" ON audit_log
  FOR SELECT
  TO anon
  USING (true);

-- 4. Comentários
COMMENT ON TABLE  audit_log IS 'Trilha de auditoria: registra todas as ações relevantes de usuários logados.';
COMMENT ON COLUMN audit_log.usuario_id   IS 'ID do usuário que realizou a ação (users_sistema.id ou Supabase Auth UID)';
COMMENT ON COLUMN audit_log.usuario_nome IS 'Nome do usuário no momento da ação';
COMMENT ON COLUMN audit_log.acao         IS 'Descrição da ação realizada (ex: "Criou devedor")';
COMMENT ON COLUMN audit_log.modulo       IS 'Módulo do sistema afetado (ex: devedores, processos, calculadora)';
COMMENT ON COLUMN audit_log.dados        IS 'Dados relevantes da ação em JSON (ex: id, nome, valores alterados)';
COMMENT ON COLUMN audit_log.criado_em    IS 'Timestamp UTC da ação';
