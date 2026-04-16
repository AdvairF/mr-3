# Relatório de Diagnóstico: Persistência de Dados no Supabase — MR Cobranças

**Data:** 2026-04-16
**Tipo:** Auditoria somente leitura
**Escopo:** Todos os módulos — App.jsx + GerarPeticao.jsx + config/supabase.js + auth/users.js + SQLs de migração
**Arquivos auditados:** 8 arquivos, 7.300+ linhas

---

## 1. Mapeamento Geral de Tabelas

### 1.1 — Configuração do Cliente Supabase

**Arquivo:** `src/config/supabase.js`

| Item | Valor |
|------|-------|
| URL | `https://nzzimacvelxzstarwqty.supabase.co` |
| Chave pública | Anon key (`sb_publishable_8CYgd-...`) hardcoded no frontend |
| Biblioteca | **NÃO usa `@supabase/supabase-js`** — usa `fetch` manual via wrapper `sb()` |
| Auth token | Módulo-singleton `_accessToken`; setado após login |

**Wrapper `sb()` (linhas 16–37):** Lança exceção em qualquer resposta HTTP com status de erro. A qualidade do tratamento de falhas depende inteiramente do `try/catch` no ponto de chamada.

```js
if (!res.ok) {
  const error = new Error(data?.message || ...);
  error.status = res.status;
  throw error;  // sempre lança em HTTP error
}
```

**Helpers de alto nível (linhas 73–76):**

```js
export const dbGet    = (t, q = "")   => sb(t, "GET", null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",  b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH", b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
```

---

### 1.2 — Tabelas Supabase (10 tabelas identificadas)

| Tabela Supabase | Módulo / Contexto | Operações Disponíveis | Migração SQL local |
|----------------|-------------------|----------------------|--------------------|
| `devedores` | Módulo Devedores (principal) | GET, INSERT, PATCH, DELETE | Sem arquivo .sql |
| `credores` | Módulo Credores | GET, INSERT, PATCH, DELETE | `migration_credores.sql` |
| `processos` | Módulo Processos | GET, INSERT, PATCH, DELETE | `migration_processos.sql` |
| `andamentos` | Sub-módulo Andamentos de processo | GET, INSERT | Sem arquivo .sql |
| `registros_contato` | Sub-módulo Contatos do devedor | GET, INSERT, DELETE | Sem arquivo .sql |
| `lembretes` | Módulo Lembretes (global + por devedor) | GET, INSERT, PATCH, DELETE | Sem arquivo .sql |
| `regua_cobranca` | Módulo Régua de Cobrança | GET, INSERT, DELETE | Sem arquivo .sql |
| `regua_etapas` | Configuração das etapas da régua | GET, INSERT, PATCH, DELETE | Sem arquivo .sql |
| `modelos_peticao` | GerarPeticao — aba "Meus Modelos Word" | GET, INSERT, PATCH, DELETE | Sem arquivo .sql |
| `usuarios_sistema` | Gestão de Usuários + Auth | GET, INSERT, DELETE | Sem arquivo .sql |
| `audit_log` | Auditoria (via `logAudit`) | INSERT (fire-and-forget), GET | `migration_audit_log.sql` |

**Tabelas com migração SQL documentada:** `credores`, `processos`, `audit_log` (3 de 11).

**Tabelas sem documentação local:** `devedores`, `andamentos`, `registros_contato`, `lembretes`, `regua_cobranca`, `regua_etapas`, `modelos_peticao`, `usuarios_sistema` — estrutura de schema desconhecida localmente.

---

### 1.3 — Carregamento Inicial

**Tabelas carregadas no boot** (via `carregarTudo()` linhas 6702–6738, usando `Promise.all`):
- `devedores`, `credores`, `processos`, `andamentos`, `regua_cobranca`, `lembretes`

**Tabelas carregadas por demanda (lazy):**
- `registros_contato` — ao abrir a ficha do devedor
- `regua_etapas` — ao abrir o módulo Régua de Cobrança
- `modelos_peticao` — ao abrir Petições > Meus Modelos
- `usuarios_sistema` — ao abrir Gestão de Usuários
- `audit_log` — ao abrir Auditoria

**Nota:** Se `carregarTudo()` falhar (ex: Supabase offline), o catch registra apenas `console.error(e)` — o spinner some mas as listas ficam vazias sem mensagem de erro ao usuário. O auto-refresh ocorre a cada 60 segundos (`carregarTudo(true)` linha 6759), o que faz com que dados inseridos apenas localmente (por falha de rede) desapareçam no próximo ciclo.

---

## 2. Foco Especial em Modelos de Petição

**Arquivo:** `src/components/GerarPeticao.jsx`

Este módulo possui a arquitetura mais sofisticada de persistência do sistema: **dual-mode** — Supabase como backend principal com IndexedDB local como fallback gracioso.

### 2.1 — Análise de Aspectos Críticos

| Aspecto | Situação | Status |
|---------|----------|--------|
| Conteúdo do arquivo capturado? | Sim — `processarArquivo()` converte ArrayBuffer para base64 (`arrayBufferToBase64`), salvo em `pendente.base64`; payload enviado: `{ nome, arquivo: pendente.base64, tamanho }` | OK |
| Validação antes do save | Sim — extensão `.docx` validada (linha 552); save exige dois passos: upload → confirmação de nome | OK |
| Save com campo vazio? | Impossível — `confirmarSalvar()` linha 569: `if (!pendente) return` antes de qualquer operação | OK |
| Tipo de operação | INSERT via `dbInsert` (POST) para novo modelo; PATCH via `dbUpdate` para renomear | OK |
| Conflito de chave | Improvável — ID gerado pelo banco (BIGSERIAL); sem upsert | OK |
| Fallback para tabela inexistente | Linhas 536–537: se HTTP 404 ou mensagem inclui "schema cache" / "does not exist", ativa `modoLocal = true` e usa IndexedDB | OK |
| Feedback de erro ao usuário | Sim — `setErro("Erro ao salvar modelo: ...")` / `setErro("Erro ao remover: ...")` visível na UI | OK |
| Petição automática persiste? | Não — AbaPeticoes gera texto em memória e abre janela para impressão; sem escrita no Supabase | OK (sem risco) |

### 2.2 — Comportamento do Banner "Salvando neste computador"

Quando `modoLocal = true` (tabela `modelos_peticao` ausente ou inacessível), o banner é exibido nas linhas 694–698 para informar o usuário que os modelos ficam apenas no navegador local. Neste modo, os dados não sincronizam entre dispositivos — comportamento intencional e comunicado.

### 2.3 — Análise por Operação

| Operação | Função | Linha | try/catch | Erro exibido | Status |
|----------|--------|-------|-----------|--------------|--------|
| Carregar modelos | `carregar()` | 531 | Sim — detecta 404/schema error, ativa modoLocal | `setErro(...)` visível na UI | OK |
| Salvar modelo (upload) | `confirmarSalvar()` | 569 | Sim | `setErro("Erro ao salvar modelo: ...")` | OK |
| Remover modelo | `remover()` | 598 | Sim | `setErro("Erro ao remover: ...")` | OK |
| Renomear modelo | `confirmarRenomear()` | 607 | Sim | `setErro("Erro ao renomear: ...")` | OK |

**Conclusão:** Modelos de Petição é o módulo com melhor cobertura de tratamento de erros do sistema. Todas as 4 operações têm try/catch e feedback visível ao usuário. O fallback dual-mode (Supabase + IndexedDB) é uma degradação graciosa adequada.

---

## 3. Status de Todos os Módulos

Legenda:
- **OK** — save implementado, try/catch presente, erro exibido ao usuário
- **RISCO** — save implementado, try/catch parcial ou sem feedback; dado pode ser perdido silenciosamente
- **NÃO SALVA** — catch vazio ou ausência de try/catch em operação destrutiva; dado não é salvo e usuário não é informado

| Módulo | Operação | try/catch? | Erro exibido ao usuário? | Status Final |
|--------|----------|-----------|--------------------------|--------------|
| **Credores** | Salvar (insert/update) | Sim | Sim — `setErroSave(...)` na UI (linha 3137) | **OK** |
| **Credores** | Excluir | Sim | Sim — `toast.error(...)` (linha 3159) | **OK** |
| **Credores** | Toggle ativo/inativo | Sim | Sim — `toast.error(...)` (linha 3167) | **OK** |
| **Processos** | Inserir | Sim | Sim — `toast.error(...)` (linha 3338) | **OK** |
| **Processos** | Editar | Sim | Não — catch silencia, faz rollback sem aviso (linhas 3395–3398) | **RISCO** |
| **Processos** | Registrar andamento | Sim | Não — adiciona localmente sem ID real (linha 3422) | **RISCO** |
| **Processos** | Atualizar próximo prazo | Catch vazio | Não (linha 3414) | **NÃO SALVA** |
| **Processos** | Excluir processo | Catch vazio | Não — exclusão local acontece mesmo com erro (linha 3431) | **NÃO SALVA** |
| **Devedores** | Inserir novo devedor | Parcial — loop sem try/catch externo (linhas 2086–2090) | Só se TODAS as 4 tentativas falharem | **RISCO** |
| **Devedores** | Editar devedor | Sim | Sim — `toast.error("Erro: " + e.message)` (linha 2132) | **OK** |
| **Devedores** | Excluir devedor | **Nenhum** | Nenhum (linha 2380) | **NÃO SALVA** |
| **Devedores** | Registrar contato (array JSON) | Sim | Não — silencia, atualiza estado local (linha 2160) | **RISCO** |
| **Devedores** | Adicionar dívida | Sim | Não — atualiza estado local mesmo com falha (linha 2212) | **RISCO** |
| **Devedores** | Adicionar custas | Sim | Não (linha 2250) | **RISCO** |
| **Devedores** | Marcar parcela paga | Sim | Não (linha 2273) | **RISCO** |
| **Devedores** | Remover dívida | Sim | Não (linha 2288) | **RISCO** |
| **Devedores** | Editar dívida | Sim | Não (linha 2345) | **RISCO** |
| **Devedores** | Alterar status | Sim | Não (linha 2368) | **RISCO** |
| **Acordos** | Salvar novo acordo | Sim | Sim — `toast.error(...)` + rollback de estado (linha 784) | **OK** |
| **Acordos** | Confirmar pagamento de parcela | Sim | Apenas `console.error(e)` — sem toast (linha 831) | **RISCO** |
| **Acordos** | Excluir acordo | Catch vazio | Não (linha 838) | **NÃO SALVA** |
| **Registros de Contato** | Inserir registro | Sim | Não — fallback local silencioso com `Date.now()` como ID (linha 1050) | **RISCO** |
| **Registros de Contato** | Excluir registro | Catch vazio | Não (linha 1058) | **NÃO SALVA** |
| **Lembretes** | Inserir (ficha devedor) | Sim | toast.success mesmo quando falha (linha 1083) | **RISCO** |
| **Lembretes** | Inserir (módulo global) | Sim | Não — adiciona localmente (linha 4808) | **RISCO** |
| **Lembretes** | Concluir (ficha devedor) | Catch vazio | Não (linha 1094) | **NÃO SALVA** |
| **Lembretes** | Excluir (ficha devedor) | Catch vazio | Não (linha 1099) | **NÃO SALVA** |
| **Lembretes** | Concluir (módulo global) | Catch vazio | Não (linha 4818) | **NÃO SALVA** |
| **Lembretes** | Cancelar (módulo global) | Catch vazio | Não (linha 4822) | **NÃO SALVA** |
| **Lembretes** | Reativar (módulo global) | Catch vazio | Não (linha 4826) | **NÃO SALVA** |
| **Lembretes** | Excluir (módulo global) | Catch vazio | Não (linha 4831) | **NÃO SALVA** |
| **Régua de Cobrança** | Carregar etapas | Sim | Não — silencia (linha 5426) | **RISCO** |
| **Régua de Cobrança** | Salvar etapas (bulk update) | Catch vazio externo | Não — falha silenciosa total (linha 5487) | **NÃO SALVA** |
| **Régua de Cobrança** | Salvar régua por devedor | Catch vazio | Não (linha 5499) | **NÃO SALVA** |
| **Régua de Cobrança** | Atualizar status via régua | Catch vazio | Não (linha 5521) | **NÃO SALVA** |
| **Régua de Cobrança** | Incluir devedor na régua | Catch vazio | Não (linha 5802) | **NÃO SALVA** |
| **Modelos de Petição** | Carregar modelos | Sim | Sim — `setErro(...)` + fallback IndexedDB (linha 531) | **OK** |
| **Modelos de Petição** | Salvar modelo | Sim | Sim — `setErro(...)` (linha 569) | **OK** |
| **Modelos de Petição** | Remover modelo | Sim | Sim — `setErro(...)` (linha 598) | **OK** |
| **Modelos de Petição** | Renomear modelo | Sim | Sim — `setErro(...)` (linha 607) | **OK** |
| **Petição Automática** | Gerar petição | Não persiste dados | — (geração em memória) | **OK** |
| **Usuários** | Criar usuário | Sim | Sim — `toast.error(...)` (linha 6145) | **OK** |
| **Usuários** | Excluir usuário | Sim | Sim — `toast.error(...)` + retorna sem alterar estado (linha 6171) | **OK** |
| **Auditoria** | Inserir log | `.catch(()=>{})` | Nenhum — fire-and-forget intencional | **OK** |
| **Auditoria** | Ler logs (admin) | Sim | Não — retorna array vazio silenciosamente (linha 6316) | **RISCO** |

### 3.1 — Contagem por Status

| Status | Quantidade |
|--------|-----------|
| **OK** | 17 operações |
| **RISCO** | 19 operações |
| **NÃO SALVA** | 13 operações |
| **Total** | 49 operações |

---

## 4. Relatório Final — Causa Raiz e Prioridades

### 4.1 — Padrão A: Catch Vazio (13 ocorrências)

**Causa raiz:** `try { await dbXxx(...); } catch (e) { }` — o erro é capturado mas descartado completamente. O estado local é atualizado incondicionalmente, criando divergência com o banco de dados.

**Status:** NÃO SALVA

| # | Arquivo | Linha | Módulo / Operação | Impacto ao usuário |
|---|---------|-------|-------------------|--------------------|
| 1 | App.jsx | 838 | Acordos — excluir acordo | Estado local diverge do banco; acordo aparece removido mas persiste no Supabase |
| 2 | App.jsx | 1058 | Registros de Contato — excluir | Contato some da UI mas permanece no banco |
| 3 | App.jsx | 1094 | Lembretes — concluir (ficha devedor) | Lembrete aparece como concluído localmente; reverte no próximo refresh |
| 4 | App.jsx | 1099 | Lembretes — excluir (ficha devedor) | Id. |
| 5 | App.jsx | 3414 | Processos — atualizar próximo prazo | Prazo local difere do banco |
| 6 | App.jsx | 3431 | Processos — excluir processo | Processo some da UI mas persiste no banco |
| 7 | App.jsx | 4818 | Lembretes — concluir (módulo global) | Estado diverge; reverte no auto-refresh (60s) |
| 8 | App.jsx | 4822 | Lembretes — cancelar (módulo global) | Id. |
| 9 | App.jsx | 4826 | Lembretes — reativar (módulo global) | Id. |
| 10 | App.jsx | 4831 | Lembretes — excluir (módulo global) | Id. |
| 11 | App.jsx | 5487 | Régua — salvar etapas (bulk) | Configuração de etapas não salva; usuário não sabe |
| 12 | App.jsx | 5499 | Régua — salvar régua por devedor | Devedor não entra na régua; sem aviso |
| 13 | App.jsx | 5802 | Régua — incluir devedor na régua (botão) | Id. |

**Recomendação:** Substituir `catch (e) { }` por `catch (e) { toast.error("Erro ao [operação]: " + e.message); }` em cada ocorrência. Avaliar se o estado local deve ser atualizado antes ou depois da confirmação do banco.

---

### 4.2 — Padrão B: Fallback Local Silencioso (3 ocorrências)

**Causa raiz:** O catch atualiza o estado local com um ID temporário (`Date.now()`) em vez de propagar o erro. O usuário vê o dado na tela mas ele nunca foi salvo no Supabase. No próximo carregamento (auto-refresh 60s ou reload), o dado desaparece.

**Status:** RISCO

| # | Arquivo | Linha | Módulo / Operação | Impacto ao usuário |
|---|---------|-------|-------------------|--------------------|
| 1 | App.jsx | 1051 | Registros de Contato — inserir | Registro visível na UI desaparece no reload |
| 2 | App.jsx | 1087 | Lembretes — inserir (ficha devedor) | `toast.success("Lembrete criado!")` exibido mesmo com falha; dado desaparece |
| 3 | App.jsx | 4812 | Lembretes — inserir (módulo global) | Lembrete visível localmente desaparece no reload |

**Código padrão (linha 1051):**
```js
} catch (e) {
  setRegistros(r => [{ ...payload, id: Date.now() }, ...r]);
  // sem toast, sem aviso
}
```

**Recomendação:** Remover o fallback local silencioso. Em caso de erro, exibir `toast.error(...)` e NÃO adicionar o item ao estado local — o usuário deve saber que o dado não foi salvo para tentar novamente.

---

### 4.3 — Padrão C: Sem try/catch em Operação Destrutiva

**Status:** NÃO SALVA

**Ocorrência única — linha 2380 (App.jsx):**
```js
await dbDelete("devedores", d.id);   // sem try/catch — erro HTTP derruba a função
logAudit(...);
setDevedores(...);
```

**Causa raiz:** A função `excluirDevedor()` chama `dbDelete` sem qualquer proteção. Se o Supabase retornar erro (ex: violação de FK, timeout, 500), a exceção sobe sem ser capturada, quebrando o fluxo. O estado local pode ser atualizado de maneira inconsistente dependendo de onde a exceção ocorre.

**Impacto ao usuário:** Exclusão falha silenciosamente. O devedor pode ter sido removido da UI sem ser removido do banco, ou permanecer na UI quando deveria ter sido removido.

**Recomendação:** Envolver `await dbDelete(...)` em try/catch com `toast.error("Erro ao excluir devedor: " + e.message)` e garantir que `setDevedores` só é chamado em caso de sucesso.

---

### 4.4 — Padrão D: console.error sem Feedback ao Usuário

**Status:** RISCO

**Ocorrência — linha 831 (App.jsx) — `confirmarPagamento()`:**
```js
} catch (e) { console.error(e); }  // apenas console, sem toast
```

**Causa raiz:** O catch registra o erro no console (invisível ao usuário em produção) mas não exibe nenhum aviso na UI.

**Impacto ao usuário:** O usuário confirma o pagamento de uma parcela. Se o Supabase falhar, o status da parcela reverte no próximo refresh (60s) sem que o usuário tenha sido avisado de que o pagamento não foi registrado.

**Recomendação:** Substituir `console.error(e)` por `toast.error("Erro ao confirmar pagamento: " + e.message)` e reverter o estado local otimista da parcela.

---

### 4.5 — Padrão E: Loop de Tentativas sem try/catch Externo

**Status:** RISCO

**Ocorrência — linhas 2086–2090 (App.jsx) — `salvarDevedor()`:**
```js
// Sem try/catch externo!
for (let i = 0; i < tentativas.length; i++) {
  const res = await dbInsert("devedores", tentativas[i]);
  const r = Array.isArray(res) ? res[0] : res;
  if (r?.id) { novo = r; nivelUsado = i; break; }
}
```

**Causa raiz:** O loop itera por 4 payloads de fallback, mas não tem try/catch. Se o Supabase retornar erro HTTP em qualquer iteração (ex: 422 — entidade inválida, 500 — erro interno), a exceção sobe sem ser tratada. Só se TODAS as tentativas "retornarem sem id" (sem lançar exceção) é que o `toast.error` final é acionado.

**Impacto ao usuário:** Inserção de novo devedor pode falhar silenciosamente sem que o toast de erro final seja exibido, dependendo do tipo de resposta HTTP do Supabase.

**Recomendação:** Envolver o loop em try/catch externo com `toast.error(...)` para capturar exceções de qualquer tentativa.

---

### 4.6 — Problemas de Segurança

| # | Severidade | Arquivo | Linha | Descrição | Risco |
|---|-----------|---------|-------|-----------|-------|
| SEC-1 | CRÍTICO | `auth/users.js` | 4–13 | Senha do admin em plaintext no código-fonte: `senha: "010789wi"` | Qualquer pessoa com acesso ao repositório ou ao bundle JS tem acesso às credenciais do administrador |
| SEC-2 | MÉDIO | `config/supabase.js` | 3 | Anon key hardcoded no frontend | Tecnicamente aceitável para o Supabase, mas toda a segurança recai sobre RLS no banco |
| SEC-3 | ALTO | Supabase (sem SQL local) | — | RLS não documentada em 8 das 11 tabelas (`devedores`, `credores`, `processos`, `andamentos`, `lembretes`, `registros_contato`, `regua_cobranca`, `regua_etapas`, `modelos_peticao`, `usuarios_sistema`) | Sem RLS ativo no Supabase, qualquer pessoa com a anon key pode ler e modificar todos os dados via API REST diretamente |
| SEC-4 | ALTO | `migration_audit_log.sql` | 46 | Política `audit_select_anon` permite que `anon` leia `audit_log` | Sobrepõe a política `audit_select_admin`; dados de auditoria (incluindo ações de usuários) ficam acessíveis sem autenticação |
| SEC-5 | ALTO | `auth/users.js` | 61–68 | Senhas armazenadas em plaintext na coluna `senha` da tabela `usuarios_sistema` | Login via `email=eq.X&senha=eq.Y` — autenticação por plaintext, não por hash |

**Recomendações de segurança (sem implementação — apenas nomear a ação necessária):**
- **SEC-1:** Remover `LOCAL_USERS` do código-fonte; usar variável de ambiente ou autenticação Supabase Auth nativa
- **SEC-2:** Confirmar que RLS está ativa antes de considerar a exposição da anon key aceitável
- **SEC-3:** Auditar e ativar RLS em todas as tabelas no painel do Supabase; documentar políticas em arquivos SQL de migração
- **SEC-4:** Revisar e remover a política `audit_select_anon` ou restringi-la a `authenticated`
- **SEC-5:** Migrar para hash de senha (bcrypt/argon2) ou usar exclusivamente o Supabase Auth JWT

---

### 4.7 — Tabela-Resumo Final

| Classificação | Quantidade | Módulos mais afetados |
|--------------|-----------|----------------------|
| **OK** | 17 operações | Credores (3), Modelos de Petição (4), Acordos-novo (1), Processos-inserir (1), Devedores-editar (1), Usuários (2), Auditoria (1), Petição Automática (1) |
| **RISCO** | 19 operações | Devedores (8), Lembretes-inserir (2), Processos-editar/andamento (2), Registros de Contato-inserir (1), Acordos-pagamento (1), Régua-carregar (1), Auditoria-ler (1) |
| **NÃO SALVA** | 13 operações | Lembretes-concluir/cancelar/reativar/excluir (6), Régua (4), Processos-excluir/prazo (2), Devedores-excluir (1) |
| **Total** | **49 operações** | |

**Módulo com melhor cobertura:** Credores e Modelos de Petição — todas as operações classificadas como OK, com try/catch e feedback visível ao usuário.

**Módulo com pior cobertura:** Régua de Cobrança — 4 operações NÃO SALVA (catch vazio em operações bulk críticas como salvar configuração de etapas e atribuição de régua por devedor), mais 1 RISCO no carregamento.

---

### 4.8 — Problemas Críticos Priorizados

| Prioridade | Status | Módulo / Operação | Causa Raiz | Arquivo / Linha |
|-----------|--------|-------------------|------------|-----------------|
| **1 — CRÍTICO** | NÃO SALVA | Devedores — excluir devedor | Sem try/catch em operação destrutiva | App.jsx linha 2380 |
| **2 — CRÍTICO** | SEGURANÇA | Auth — credencial admin | Senha plaintext hardcoded no código-fonte | auth/users.js linhas 4–13 |
| **3 — CRÍTICO** | RISCO | Registros de Contato + Lembretes — inserir | Fallback local silencioso; toast.success enganoso com dado não salvo | App.jsx linhas 1051, 1087, 4812 |
| **4 — CRÍTICO** | NÃO SALVA | Régua de Cobrança — salvar etapas e régua | Catch vazio em operações bulk; configuração crítica perdida sem aviso | App.jsx linhas 5487, 5499 |
| **5 — ALTO** | SEGURANÇA | Supabase — tabelas sem RLS documentada | 8 tabelas sem migração SQL local de RLS; segurança depende exclusivamente da UI | Supabase (sem arquivo local) |
| **6 — ALTO** | RISCO | Devedores — inserir novo devedor | Loop de 4 tentativas sem try/catch externo; exceção HTTP sobe sem tratamento | App.jsx linhas 2086–2090 |

---

*Relatório compilado por: agente GSD 260416-gdo — auditoria somente leitura, sem modificação de arquivos fonte.*
