---
phase: 260416-gdo
plan: 01
status: complete
type: diagnostic-report
date: 2026-04-16
---

# Quick Task 260416-gdo: Diagnóstico de Persistência Supabase — SUMMARY

## O que foi feito

Compilação do relatório de auditoria de persistência Supabase para o sistema MR Cobranças, a partir dos dados coletados no RESEARCH.md (auditoria prévia somente leitura de 8 arquivos, 7.300+ linhas).

Nenhum arquivo em `src/` foi modificado. Tarefa READ-ONLY.

## Arquivo produzido

`.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md`

O REPORT.md contém as 4 seções solicitadas:
1. Mapeamento Geral de Tabelas (10 tabelas, operações, migração SQL local)
2. Foco Especial em Modelos de Petição (análise detalhada do dual-mode Supabase + IndexedDB)
3. Status de Todos os Módulos (49 operações classificadas)
4. Relatório Final (padrões A–E, problemas de segurança, 6 críticos priorizados)

## Classificação Final

| Status | Quantidade |
|--------|-----------|
| OK | 17 operações |
| RISCO | 19 operações |
| NÃO SALVA | 13 operações |
| **Total** | **49 operações** |

## Problemas Críticos Destacados

1. **Excluir devedor sem try/catch** — App.jsx linha 2380 — operação destrutiva sem proteção (NÃO SALVA)
2. **Senha admin plaintext no código-fonte** — auth/users.js linhas 4–13 — risco de segurança crítico
3. **Fallback local silencioso com toast.success enganoso** — Lembretes e Registros de Contato — dados somem no reload (RISCO)
4. **Régua de Cobrança: catch vazio em bulk save** — linhas 5487, 5499 — configurações críticas perdidas sem aviso (NÃO SALVA)
5. **RLS não documentada em 8 de 11 tabelas** — dados potencialmente acessíveis via API REST diretamente (SEGURANÇA)
6. **Inserção de devedor: loop sem try/catch externo** — linhas 2086–2090 — exceção HTTP sem tratamento (RISCO)

## Módulos com melhor cobertura

**Credores** e **Modelos de Petição** — todas as operações com try/catch e feedback visível ao usuário.

## Módulo com pior cobertura

**Régua de Cobrança** — 4 operações NÃO SALVA (catch vazio em operações críticas de configuração).

## Deviations

None — tarefa READ-ONLY executada conforme planejado, compilando exclusivamente a partir do RESEARCH.md sem modificar arquivos fonte.
