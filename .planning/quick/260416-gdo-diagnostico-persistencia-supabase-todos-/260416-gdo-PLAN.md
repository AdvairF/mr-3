---
phase: 260416-gdo
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md
autonomous: true
requirements:
  - DIAG-01

must_haves:
  truths:
    - "REPORT.md existe com as 4 seções solicitadas"
    - "Cada módulo tem status final: OK / NÃO SALVA / RISCO"
    - "Causa raiz de cada problema está documentada com linha de código"
    - "Foco especial em Modelos de Petição está na seção própria"
    - "Problemas críticos priorizados (1–6) aparecem no relatório final"
  artifacts:
    - path: ".planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md"
      provides: "Relatório de auditoria de persistência Supabase"
      contains: "## 1. Mapeamento Geral de Tabelas"
  key_links:
    - from: "260416-gdo-RESEARCH.md"
      to: "260416-gdo-REPORT.md"
      via: "compilação direta das seções de auditoria"
      pattern: "RESEARCH.md -> REPORT.md (READ-ONLY, sem alteração de código)"
---

<objective>
Compilar o relatório de diagnóstico de persistência Supabase para o sistema MR Cobranças.

Purpose: Consolidar os dados de auditoria coletados no RESEARCH.md em um documento de relatório final estruturado, com as 4 seções solicitadas pelo usuário, classificações claras (OK / NÃO SALVA / RISCO) e causas-raiz identificadas por linha de código.

Output: .planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-RESEARCH.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Compilar REPORT.md com as 4 seções de auditoria</name>
  <files>.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md</files>
  <action>
Criar o arquivo REPORT.md com as seguintes 4 seções obrigatórias, compiladas a partir do RESEARCH.md (260416-gdo-RESEARCH.md). Este é um trabalho READ-ONLY — nenhum arquivo de código deve ser alterado.

**SEÇÃO 1 — Mapeamento Geral de Tabelas**

Incluir a tabela completa de 10 tabelas Supabase identificadas:
- Nome da tabela, módulo/contexto, operações disponíveis (GET/INSERT/PATCH/DELETE)
- Coluna extra: "Migração SQL local" — indicar quais tabelas têm arquivo .sql documentado (apenas `processos`, `credores`, `audit_log`) e quais estão sem documentação local

Incluir também:
- Configuração do cliente (wrapper `sb()` via fetch manual, NÃO usa @supabase/supabase-js)
- Helpers `dbGet`, `dbInsert`, `dbUpdate`, `dbDelete` e comportamento de erro (lança exceção em HTTP error)
- Carregamento inicial: tabelas carregadas no boot vs. lazy (por demanda)

**SEÇÃO 2 — Foco Especial em Modelos de Petição**

Apresentar análise detalhada do módulo `GerarPeticao.jsx`:
- Tabela de aspectos: captura de conteúdo, validação, save com campo vazio, tipo de operação, conflito de chave, fallback, feedback de erro
- Dual-mode: Supabase + IndexedDB como fallback gracioso (quando tabela não existe ou retorna 404/schema error)
- Comportamento do banner "Salvando neste computador"
- Petição automática: não persiste dados, apenas geração em memória
- Classificação final de cada operação do módulo (carregar, salvar, remover, renomear)

**SEÇÃO 3 — Status de Todos os Módulos**

Tabela consolidada de todos os módulos com as colunas:
- Módulo | Operação | try/catch? | Erro exibido ao usuário? | Status Final

Usar exatamente 3 status possíveis:
- **OK** — save implementado, try/catch presente, erro exibido ao usuário
- **RISCO** — save implementado, try/catch parcial ou sem feedback, dado pode ser perdido
- **NÃO SALVA** — catch vazio ou ausência de try/catch em operação destrutiva; dado não é salvo e usuário não é informado

Nota: "QUEBRADO" do RESEARCH.md deve ser mapeado para "NÃO SALVA" para alinhar com a classificação solicitada pelo usuário.

Cobrir todos os módulos do RESEARCH.md:
Credores, Processos (inserir/editar/andamento/excluir), Devedores (inserir/editar/excluir), Acordos (novo/pagamento/excluir), Registros de Contato (inserir/excluir), Lembretes (inserir/concluir/cancelar/excluir — 2 contextos), Régua de Cobrança (carregar/salvar etapas/salvar régua/status), Modelos de Petição (carregar/salvar/remover/renomear), Petição Automática, Usuários (criar/excluir), Auditoria.

**SEÇÃO 4 — Relatório Final com Causa Raiz**

Estruturar como lista de problemas priorizados, cada item contendo:
- Status: OK / RISCO / NÃO SALVA
- Módulo e operação
- Causa raiz (padrão de código identificado)
- Linha de código no arquivo fonte
- Impacto ao usuário
- Recomendação de correção (sem implementar — apenas nomear a ação necessária)

Cobrir os 5 padrões problemáticos identificados:
- Padrão A: catch vazio — 13 locais (listar todos)
- Padrão B: fallback local silencioso — 3 locais
- Padrão C: sem try/catch em operação destrutiva (excluir devedor linha 2380)
- Padrão D: console.error sem feedback ao usuário (confirmar pagamento acordo)
- Padrão E: loop de tentativas sem try/catch externo (inserção devedor linhas 2086–2090)

Incluir subseção de problemas de segurança:
- Senha admin plaintext em auth/users.js linha 4–13
- Anon key hardcoded no frontend (tecnicamente aceitável com RLS)
- RLS não documentada nas tabelas principais (risco de acesso direto via API)
- Política RLS em audit_log com anon lendo dados (audit_select_anon sobrepõe audit_select_admin)

Fechar com tabela-resumo contando:
- Total de operações: OK / RISCO / NÃO SALVA
- Módulo com melhor cobertura: Credores e Modelos de Petição
- Módulo com pior cobertura: Régua de Cobrança (3 NÃO SALVA)
  </action>
  <verify>
    <automated>test -f "C:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md" && grep -l "Mapeamento Geral" "C:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md" && grep -l "Modelos de Petição" "C:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md" && grep -l "NÃO SALVA" "C:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-REPORT.md" && echo "REPORT.md OK"</automated>
  </verify>
  <done>
    REPORT.md existe com as 4 seções estruturadas. Seção 1 mapeia todas as 10 tabelas. Seção 2 cobre Modelos de Petição em detalhes. Seção 3 lista todos os módulos com status OK / RISCO / NÃO SALVA. Seção 4 apresenta causa raiz por padrão de código, com linha de referência, e inclui os problemas de segurança identificados. Nenhum arquivo de código foi modificado.
  </done>
</task>

</tasks>

<verification>
- [ ] REPORT.md existe no diretório da tarefa
- [ ] Seção 1 presente: mapeamento das 10 tabelas com coluna de migração SQL
- [ ] Seção 2 presente: análise detalhada de GerarPeticao.jsx com dual-mode
- [ ] Seção 3 presente: tabela completa de módulos com status OK / RISCO / NÃO SALVA
- [ ] Seção 4 presente: causa raiz por padrão, linha de código, recomendação
- [ ] Nenhum arquivo em src/ foi modificado (diagnóstico somente leitura)
</verification>

<success_criteria>
REPORT.md criado com as 4 seções solicitadas. Todos os módulos classificados. Padrões A–E documentados com referências de linha. Problemas de segurança listados. Contagem final de OK / RISCO / NÃO SALVA presente.
</success_criteria>

<output>
Após conclusão, criar `.planning/quick/260416-gdo-diagnostico-persistencia-supabase-todos-/260416-gdo-SUMMARY.md` com:
- O que foi feito: compilação do relatório de auditoria
- Arquivo produzido: 260416-gdo-REPORT.md
- Classificação final (contagem de OK / RISCO / NÃO SALVA)
- Problemas críticos destacados
</output>
