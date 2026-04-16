---
quick_id: 260416-id0
plan: 01
type: db-migration
completed_at: "2026-04-16"
duration_minutes: 5
tasks_completed: 3
tasks_total: 3
tables_created:
  - public.pagamentos_parciais (verified existing, RLS corrected)
  - public.audit_log (created new)
  - public.modelos_peticao (created new)
key_decisions:
  - "devedores.id is BIGINT → used CASO A (BIGINT FK) for pagamentos_parciais"
  - "audit_log uses 3 separate RLS policies: insert/select-admin/select-anon"
---

# Quick Task 260416-id0: Criar tabelas no Supabase

**One-liner:** Criadas audit_log e modelos_peticao + RLS corrigida em pagamentos_parciais (policy trocada de `true` para `auth.role() = 'authenticated'`).

## Execution Summary

Todas as 3 tasks executadas via Supabase Management API (SQL direto). Sem modificações em arquivos do repositório.

---

## Task 1: pagamentos_parciais

**Tipo de devedores.id verificado:** `bigint` (CASO A aplicado)

**Ação:** Tabela já existia. SQL executado para garantir RLS habilitado e política correta.

**Colunas confirmadas:**

| column_name    | data_type                   |
|----------------|-----------------------------|
| id             | bigint                      |
| devedor_id     | bigint                      |
| data_pagamento | date                        |
| valor          | numeric                     |
| observacao     | text                        |
| created_at     | timestamp with time zone    |

**Política RLS:**

| policyname        | cmd | qual                                    |
|-------------------|-----|-----------------------------------------|
| Acesso autenticado | ALL | (auth.role() = 'authenticated'::text)   |

**Status:** VERIFICADO - 6 colunas corretas, FK BIGINT compatível, policy auth.role() = 'authenticated'.

---

## Task 2: audit_log

**Acao:** Tabela criada nova com migration_audit_log.sql.

**Colunas confirmadas:**

| column_name  | data_type                  |
|--------------|----------------------------|
| id           | bigint                     |
| usuario_id   | text                       |
| usuario_nome | text                       |
| acao         | text                       |
| modulo       | text                       |
| dados        | jsonb                      |
| criado_em    | timestamp with time zone   |

**Políticas RLS (3 separadas):**

| policyname          | cmd    |
|---------------------|--------|
| audit_insert        | INSERT |
| audit_select_admin  | SELECT |
| audit_select_anon   | SELECT |

**Índices criados:**

| indexname              |
|------------------------|
| audit_log_pkey         |
| idx_audit_log_usuario  |
| idx_audit_log_modulo   |
| idx_audit_log_criado   |

**Status:** VERIFICADO - 7 colunas, 3 políticas RLS, 3 índices customizados + PK.

---

## Task 3: modelos_peticao

**Ação:** Tabela criada nova com esquema inferido de GerarPeticao.jsx.

**Colunas confirmadas:**

| column_name | data_type                  |
|-------------|----------------------------|
| id          | bigint                     |
| nome        | text                       |
| arquivo     | text                       |
| tamanho     | integer                    |
| criado_em   | timestamp with time zone   |

**Política RLS:**

| policyname        | cmd | qual                                  |
|-------------------|-----|---------------------------------------|
| Acesso autenticado | ALL | (auth.role() = 'authenticated'::text) |

**Status:** VERIFICADO - 5 colunas, policy auth.role() = 'authenticated'.

---

## Final Verification

Consulta final confirmou as 3 tabelas existindo no schema `public`:

```
audit_log
modelos_peticao
pagamentos_parciais
```

Total de 5 políticas RLS ativas entre as 3 tabelas.

---

## Deviations from Plan

Nenhum desvio. Plano executado exatamente como escrito.

- devedores.id era BIGINT como CASO A previa (UUID não foi necessário)
- Todos os SQL executaram sem erros
- Todas as verificações passaram na primeira tentativa

## Threat Model Compliance

| Threat ID | Status    | Notes |
|-----------|-----------|-------|
| T-id0-01  | Accepted  | audit_log INSERT sem validação de usuario_id — aceito por design |
| T-id0-02  | Mitigated | modelos_peticao com auth.role() = 'authenticated' |
| T-id0-03  | Mitigated | audit_log SELECT restrito a admins (audit_select_admin); anon policy para service_role |
| T-id0-04  | Mitigated | pagamentos_parciais policy corrigida de `true` para auth.role() = 'authenticated' |

## Self-Check: PASSED

- [x] public.pagamentos_parciais existe com 6 colunas e policy correta
- [x] public.audit_log existe com 7 colunas, 3 políticas e 3 índices
- [x] public.modelos_peticao existe com 5 colunas e policy correta
- [x] Consulta final retornou 3 tabelas
- [x] Nenhum arquivo de repositório modificado (task é DB-only)
