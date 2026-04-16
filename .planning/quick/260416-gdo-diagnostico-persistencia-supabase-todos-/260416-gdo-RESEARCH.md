# Diagnóstico: Persistência de Dados no Supabase — MR Cobranças
**Data:** 2026-04-16
**Tipo:** Auditoria somente leitura
**Escopo:** Todos os módulos — App.jsx + GerarPeticao.jsx + config/supabase.js + auth/users.js + SQLs de migração

---

## 1. Configuração do Cliente Supabase

**Arquivo:** `src/config/supabase.js`

| Item | Valor |
|------|-------|
| URL | `https://nzzimacvelxzstarwqty.supabase.co` |
| Chave pública | `sb_publishable_8CYgd-...` (anon key exposta no frontend) |
| Biblioteca | **NÃO usa `@supabase/supabase-js`** — usa `fetch` manual via wrapper `sb()` |
| Auth token | Módulo-singleton `_accessToken`; setado após login |

**Nota crítica:** A chave está hardcoded no frontend (`supabase.js` linha 3). É a chave `publishable` (anon key), o que é tecnicamente aceitável para o Supabase, mas toda a segurança recai sobre Row Level Security (RLS) no banco.

### Wrapper `sb()` (linha 16–37)

```js
export async function sb(path, method = "GET", body = null, extra = "") {
  // ...
  if (!res.ok) {
    const error = new Error(data?.message || ...);
    error.status = res.status;
    throw error;           // lança Error com .status e .details
  }
  return data;
}
```

**O wrapper SEMPRE lança exceção em erro HTTP.** Portanto a qualidade do tratamento depende do `try/catch` no site de chamada.

### Helpers de alto nível (linhas 73–76)

```js
export const dbGet    = (t, q = "")   => sb(t, "GET", null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",  b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH", b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
```

---

## 2. Mapeamento Completo de Tabelas

| Tabela Supabase | Módulo / Contexto | Operações |
|----------------|-------------------|-----------|
| `devedores` | Módulo Devedores (principal) | GET, INSERT, PATCH, DELETE |
| `credores` | Módulo Credores | GET, INSERT, PATCH, DELETE |
| `processos` | Módulo Processos | GET, INSERT, PATCH, DELETE |
| `andamentos` | Sub-módulo Andamentos de processo | GET (via carregarTudo), INSERT |
| `registros_contato` | Sub-módulo Contatos do devedor | GET, INSERT, DELETE |
| `lembretes` | Módulo Lembretes (global + por devedor) | GET, INSERT, PATCH, DELETE |
| `regua_cobranca` | Módulo Régua de Cobrança | GET, INSERT, DELETE |
| `regua_etapas` | Configuração das etapas da régua | GET, INSERT, PATCH, DELETE |
| `modelos_peticao` | GerarPeticao — aba "Meus Modelos Word" | GET, INSERT, PATCH, DELETE |
| `usuarios_sistema` | Gestão de Usuários + Auth | GET, INSERT, DELETE |
| `audit_log` | Auditoria (via `logAudit`) | INSERT (fire-and-forget), GET (admin) |

**Tabelas sem migração SQL documentada:** `devedores`, `lembretes`, `registros_contato`, `regua_cobranca`, `regua_etapas`, `modelos_peticao`, `usuarios_sistema` — estrutura desconhecida localmente; apenas `processos`, `credores` e `audit_log` têm arquivos `.sql`.

---

## 3. Auditoria por Módulo

### 3.1 — Devedores

**Arquivo:** `App.jsx` — componente `Devedores`

| Operação | Função | try/catch | Erro exibido ao usuário | Classificação |
|----------|--------|-----------|-------------------------|---------------|
| Inserir novo devedor | `salvarDevedor()` linha ~2019 | Não (sem try/catch na inserção) — usa loop de tentativas (fallback de 4 payloads) | `toast.error("Erro ao salvar.")` apenas se todas as 4 tentativas falharem | **RISCO** |
| Editar devedor | `salvarEdicao()` linha 2132 | Sim | `toast.error("Erro: " + e.message)` | OK |
| Excluir devedor | `excluirDevedor()` linha 2380 | **Não** — `await dbDelete(...)` sem try/catch | Sem feedback de erro | **QUEBRADO** |
| Registrar contato (array JSON) | `registrarContato()` linha 2160 | Sim | Sem feedback de erro — silencia na UI, atualiza estado local | **RISCO** |
| Adicionar dívida | `adicionarDivida()` linha 2212 | Sim | Sem feedback de erro — atualiza estado local mesmo com falha | **RISCO** |
| Adicionar custas | linha 2250 | Sim | Sem feedback de erro | **RISCO** |
| Marcar parcela paga | linha 2273 | Sim | Sem feedback de erro | **RISCO** |
| Remover dívida | linha 2288 | Sim | Sem feedback de erro | **RISCO** |
| Editar dívida | linha 2345 | Sim | Sem feedback de erro | **RISCO** |
| Alterar status | `alterarStatus()` linha 2368 | Sim | Sem feedback de erro | **RISCO** |

**Padrão problemático — inserção com tentativas (linhas 2086–2090):**
```js
// Sem try/catch externo! Cada tentativa individual pode lançar e quebrar o loop
for (let i = 0; i < tentativas.length; i++) {
  const res = await dbInsert("devedores", tentativas[i]);
  const r = Array.isArray(res) ? res[0] : res;
  if (r?.id) { novo = r; nivelUsado = i; break; }
}
```
Se o Supabase lança um erro HTTP (ex: 422, 500), a exceção não é capturada nesse loop — sobe sem ser tratada. A função não tem `try/catch` ao redor desse bloco.

**Excluir devedor — linha 2380:**
```js
await dbDelete("devedores", d.id);   // sem try/catch — erro HTTP derruba a função
logAudit(...);
setDevedores(...);
```
Classificação: **QUEBRADO** — falha na exclusão não é informada ao usuário e o estado local é atualizado de qualquer forma se o erro ocorre depois do logAudit.

---

### 3.2 — Acordos (sub-módulo de Devedores)

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Salvar novo acordo | `salvarNovoAcordo()` linha 784 | Sim | `toast.error("Não foi possível salvar o acordo...")` + rollback de estado | **OK** |
| Confirmar pagamento de parcela | `confirmarPagamento()` linha 825 | Sim | `console.error(e)` — sem toast | **RISCO** |
| Excluir acordo | `excluirAcordo()` linha 838 | `try { ... } catch (e) { }` | Catch vazio — erro silenciado | **RISCO** |

**Catch vazio linha 838:**
```js
try { await dbUpdate("devedores", devedor.id, { acordos: JSON.stringify(novos) }); } catch (e) { }
```

---

### 3.3 — Credores

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Salvar (insert ou update) | `salvar()` linha 3137 | Sim | `setErroSave("Erro ao salvar: " + e.message)` — exibido na UI | **OK** |
| Excluir | `excluir()` linha 3159 | Sim | `toast.error("Erro ao excluir...")` | **OK** |
| Toggle ativo/inativo | `toggleAtivo()` linha 3167 | Sim | `toast.error("Erro: ...")` | **OK** |

**Credores é o módulo mais robusto.** O insert valida o retorno e lança erro se banco não retornou id (linha 3146).

---

### 3.4 — Processos

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Inserir novo processo | `salvarProcesso()` linha 3338 | Sim | `toast.error("Não foi possível cadastrar...")` | **OK** |
| Editar processo | `salvarEdicao()` linha 3372 | Sim | Sem feedback — silencia erro, faz rollback de estado | **RISCO** |
| Registrar andamento | `addAnd()` linha 3417 | Sim | Sem feedback — adiciona localmente na falha | **RISCO** |
| Atualizar proximo_prazo | linha 3414 | `try { ... } catch (e) { }` | Catch vazio — silenciado | **RISCO** |
| Excluir processo | `excluirProcesso()` linha 3431 | `try { ... } catch (e) { }` | Catch vazio — exclusão local acontece mesmo com erro | **RISCO** |

**Editar processo — catch silencia erro (linha 3395–3398):**
```js
} catch (e) {
  setProcessos(prev => prev.map(p => p.id === sel.id ? { ...sel, ...formEdit } : p));
  setEditando(false);
  // Sem toast, sem mensagem — usuário não sabe que o Supabase falhou
}
```

**Andamentos — falha silenciosa (linha 3422–3424):**
```js
} catch (e) {
  setAndamentos(p => [...p, novoAnd]);  // adiciona localmente sem ID real
  // sem feedback
}
```
Se o andamento não é salvo no Supabase mas fica no estado local, ele desaparece no próximo reload (não tem ID real — usa objeto sem `id`).

---

### 3.5 — Registros de Contato (sub-módulo Devedores)

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Inserir registro | `salvarRegistro()` linha 1045 | Sim | Sem feedback — adiciona localmente com `Date.now()` como ID | **RISCO** |
| Excluir registro | `excluirRegistro()` linha 1058 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |

**Inserção silenciosa (linha 1050–1052):**
```js
} catch (e) {
  setRegistros(r => [{ ...payload, id: Date.now() }, ...r]);
  // Sem toast, sem indicação visual de falha
}
```
O usuário vê o registro na tela mas ele não está salvo no Supabase. No reload da página o registro desaparece.

---

### 3.6 — Lembretes

**Dois contextos:** dentro da ficha do devedor (linhas ~1074–1101) e no módulo global Lembretes (linhas ~4797–4832).

| Operação | Contexto | try/catch | Erro exibido | Classificação |
|----------|----------|-----------|--------------|---------------|
| Inserir lembrete (ficha devedor) | linha 1083 | Sim | Sem feedback — adiciona localmente | **RISCO** |
| Inserir lembrete (módulo global) | linha 4808 | Sim | Sem feedback — adiciona localmente | **RISCO** |
| Concluir lembrete | linhas 1094, 4818 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |
| Cancelar lembrete | linha 4822 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |
| Reativar lembrete | linha 4826 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |
| Excluir lembrete | linhas 1099, 4831 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |

**Padrão recorrente:**
```js
try { await dbUpdate("lembretes", id, { status: "concluido", ... }); } catch (e) { }
setLembretes(l => l.map(...));
```
O estado local é atualizado independentemente do sucesso no Supabase. Se a conexão falha, o lembrete aparece como concluído localmente mas permanece "pendente" no banco. No próximo carregamento (60s ou reload), reverte.

**A função `salvarLem()` na ficha do devedor (linha 1074) chama `toast.success(...)` SEMPRE, mesmo quando a inserção falhou e o registro só existe localmente.** Isso é enganoso.

---

### 3.7 — Régua de Cobrança

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Carregar etapas | linha 5426 | Sim | Sem feedback — silencia | **RISCO** |
| Salvar etapas (bulk update) | linha 5468 | `} catch (e) { }` externo | Catch vazio — falha silenciosa total | **QUEBRADO** |
| Salvar régua devedor | `salvarRegua()` linha 5491 | `} catch (e) { }` | Catch vazio | **QUEBRADO** |
| Atualizar status via régua | `atualizarStatusRegua()` linha 5521 | `try { ... } catch (e) { }` | Catch vazio | **RISCO** |
| Incluir devedor na régua (botão) | linha 5797 | `} catch (e) { }` | Catch vazio | **RISCO** |

**Salvar configuração de etapas — catch vazio (linha 5487):**
```js
// Loop de insert/update/delete de etapas...
} catch (e) { }  // Falha completamente silenciada
```
Se o Supabase rejeitar todas as alterações de etapas, o usuário não recebe nenhuma notificação.

---

### 3.8 — Modelos de Petição (GerarPeticao.jsx)

**Arquivo:** `src/components/GerarPeticao.jsx`

Este módulo tem a arquitetura mais sofisticada de persistência: **dual-mode** (Supabase + IndexedDB local como fallback).

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Carregar modelos | `carregar()` linha 531 | Sim — detecta 404/schema error | `setErro(...)` visível na UI | **OK** |
| Salvar modelo (upload) | `confirmarSalvar()` linha 569 | Sim | `setErro("Erro ao salvar modelo: ...")` | **OK** |
| Remover modelo | `remover()` linha 598 | Sim | `setErro("Erro ao remover: ...")` | **OK** |
| Renomear modelo | `confirmarRenomear()` linha 607 | Sim | `setErro("Erro ao renomear: ...")` | **OK** |

**Modelos de Petição é o módulo com melhor tratamento de erros.**

**Pontos específicos solicitados:**

- **O campo de conteúdo (arquivo .docx) está sendo capturado?** Sim — `processarArquivo()` converte o ArrayBuffer para base64 (`arrayBufferToBase64`), salva em `pendente.base64`, e `confirmarSalvar()` manda `{ nome, arquivo: pendente.base64, tamanho }` para o Supabase. O conteúdo completo do arquivo é salvo. [VERIFIED: GerarPeticao.jsx linhas 550–595]

- **Validação antes do save?** Sim — valida extensão `.docx` (linha 552), e o save só ocorre após o usuário confirmar o nome (dois passos: upload → nomear → salvar).

- **Save é chamado mesmo se campo vazio?** Não — `confirmarSalvar()` só executa se `pendente` não é null (linha 569: `if (!pendente) return`).

- **Usa `.insert()` ou `.upsert()`?** Usa `dbInsert` (POST) para novo, `dbUpdate` (PATCH) para renomear. Não há upsert. Conflito de chave improvável pois o banco gera o `id` (BIGSERIAL).

- **Fallback para tabela inexistente:** Na linha 536–537, se o status HTTP for 404 ou a mensagem incluir "schema cache" / "does not exist", o sistema ativa `modoLocal = true` e usa IndexedDB. Isso é intencional e funciona como degradação graciosa.

- **Petição automática (AbaPeticoes):** Não persiste nada no Supabase — gera texto em memória e abre janela para impressão. Sem persistência, sem riscos de persistência.

---

### 3.9 — Usuários do Sistema

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Criar usuário | `criar()` linha 6145 | Sim | `toast.error("Não foi possível cadastrar...")` | **OK** |
| Excluir usuário | `excluir()` linha 6171 | `try { ... } catch (e) { toast.error(...); return; }` | `toast.error` + retorna sem alterar estado | **OK** |

**Atenção — segurança:** Senhas são armazenadas em plaintext na coluna `senha` da tabela `usuarios_sistema` (visível em `auth/users.js` linhas 61–68 e na UI linha 6222). A auth usa a query `email=eq.X&senha=eq.Y` — login por plaintext, não por hash. O Supabase Auth JWT é tentado primeiro (linha 35), mas o fallback expõe senhas.

**Usuário local hardcoded em `auth/users.js` linha 4–13:**
```js
const LOCAL_USERS = [
  { id: 1, nome: "Advair Freitas Vieira", email: "advairvieira@gmail.com",
    senha: "010789wi", role: "admin" }
];
```
Senha do admin em texto puro no código-fonte. [RISCO DE SEGURANÇA]

---

### 3.10 — Auditoria (audit_log)

| Operação | Função | try/catch | Erro exibido | Classificação |
|----------|--------|-----------|--------------|---------------|
| Inserir log | `logAudit()` em `auditLog.js` | `.catch(() => {})` | Fire-and-forget, sem feedback | **OK (intencional)** |
| Ler logs (admin) | `carregar()` linha 6316 | Sim | Sem feedback, retorna array vazio | **RISCO** |

O comportamento fire-and-forget é documentado e intencional ("audit nunca deve quebrar o fluxo principal").

---

## 4. Foco Especial — Modelos de Petição

**Resumo do módulo GerarPeticao.jsx:**

| Aspecto | Situação | Classificação |
|---------|----------|---------------|
| Conteúdo do arquivo capturado? | Sim — base64 completo do .docx | OK |
| Validação antes do save | Sim — 2 etapas: upload + confirmação | OK |
| Save com campo vazio? | Impossível — guarda no `pendente` state | OK |
| Tipo de operação | INSERT (novo) + PATCH (renomear) | OK |
| Conflito de chave | Improvável — ID gerado pelo banco | OK |
| Fallback tabela inexistente | IndexedDB automático | OK |
| Erro exibido ao usuário | Sim — `setErro(...)` visível | OK |
| Petição automática persiste? | Não — apenas geração em memória | OK (sem risco) |

**A tabela `modelos_peticao` pode não existir no Supabase.** O código trata isso com fallback gracioso para IndexedDB. O banner "Salvando neste computador" avisa o usuário (linha 694–698). Se o banco não tem essa tabela, os modelos ficam apenas no navegador local e não sincronizam entre dispositivos.

---

## 5. Padrões de Erro Identificados

### PADRÃO A — Catch vazio (silencia completamente a falha)

Ocorrências: **13 locais**

```js
} catch (e) { }
```

| Linha | Operação | Impacto |
|-------|----------|---------|
| 838 | Excluir acordo | Estado local diverge do banco |
| 1058 | Excluir registro de contato | Id. |
| 1094 | Concluir lembrete (ficha devedor) | Id. |
| 1099 | Excluir lembrete (ficha devedor) | Id. |
| 3414 | Atualizar próximo prazo do processo | Prazo local diferente do banco |
| 3431 | Excluir processo | Processo some da UI mas persiste no banco |
| 4818 | Concluir lembrete (módulo global) | Estado diverge |
| 4822 | Cancelar lembrete | Id. |
| 4826 | Reativar lembrete | Id. |
| 4831 | Excluir lembrete (módulo global) | Id. |
| 5487 | Salvar etapas da régua (bulk) | Configuração não salva, sem aviso |
| 5499 | Salvar régua por devedor | Devedor não entra na régua, sem aviso |
| 5802 | Incluir devedor na régua (botão) | Id. |

### PADRÃO B — Inserção com fallback local silencioso

Ocorrências: **3 locais**

```js
} catch (e) {
  setRegistros(r => [{ ...payload, id: Date.now() }, ...r]);
  // sem toast, sem aviso
}
```

| Local | Operação | Consequência |
|-------|----------|--------------|
| linha 1051 | Inserir registro de contato | Dados somem no reload |
| linha 1087 | Inserir lembrete (ficha devedor) | Dados somem + toast.success mentiroso |
| linha 4812 | Inserir lembrete (módulo global) | Dados somem no reload |

### PADRÃO C — Sem try/catch em operação destrutiva

| Linha | Operação | Risco |
|-------|----------|-------|
| 2380 | `await dbDelete("devedores", d.id)` | Erro HTTP derruba a função sem feedback |

### PADRÃO D — Confirmar pagamento de acordo sem feedback (linha 831)

```js
} catch (e) { console.error(e); }  // apenas console, sem toast
```
O usuário confirma pagamento mas se o Supabase falhar, o status da parcela reverte no próximo reload sem que o usuário saiba.

### PADRÃO E — Inserção de devedor sem try/catch no loop (linha 2086–2090)

O loop de 4 tentativas de fallback não tem try/catch. Se qualquer tentativa lança (ex: erro 500), a exceção sobe sem ser capturada, provavelmente quebrando o fluxo silenciosamente.

---

## 6. Carregamento Inicial de Dados

**Função `carregarTudo()` — linhas 6702–6738**

```js
const [devs, creds, procs, ands, reg, lems] = await Promise.all([
  dbGet("devedores"),
  dbGet("credores"),
  dbGet("processos"),
  dbGet("andamentos"),
  dbGet("regua_cobranca", "order=criado_em.asc"),
  dbGet("lembretes", "order=data_prometida.asc"),
]);
```

**Tabelas carregadas no boot:** devedores, credores, processos, andamentos, regua_cobranca, lembretes.

**NÃO carregadas no boot (lazy/por demanda):**
- `registros_contato` — carregado ao abrir a ficha do devedor
- `regua_etapas` — carregado ao abrir o módulo Régua
- `modelos_peticao` — carregado ao abrir Petições > Meus Modelos
- `usuarios_sistema` — carregado ao abrir Gestão de Usuários
- `audit_log` — carregado ao abrir Auditoria

**Tratamento de erro no carregarTudo:**
```js
} catch (e) {
  console.error(e);   // apenas log, sem toast, sem setCarregando(false) explícito
}
if (!silencioso) setCarregando(false);  // sempre chamado fora do catch
```
Se `carregarTudo` falhar completamente (ex: Supabase offline), o usuário vê a tela vazia sem feedback. O `setCarregando(false)` é chamado fora do catch, então o spinner some, mas as listas ficam vazias sem mensagem de erro.

**Auto-refresh:** A cada 60 segundos, `carregarTudo(true)` é chamado silenciosamente (linha 6759). Isso faz com que dados "perdidos" (inseridos só localmente por falha de rede) desapareçam no próximo ciclo.

---

## 7. Módulo "Pendências" — Esclarecimento

Não existe uma tabela `pendencias` no Supabase. O que o Dashboard chama de "Pendências" ou "Pendencias hoje" (linha 6799–6801) é um **filtro calculado em memória** sobre a tabela `lembretes`:

```js
const pendenciasHoje = lembretesList.filter(
  (l) => l.status === "pendente" && l.data_prometida <= new Date().toISOString().slice(0, 10)
).length;
```

Não há módulo separado de pendências — é derivado dos lembretes.

---

## 8. RLS (Row Level Security) — Análise

### O que foi encontrado nos arquivos SQL:

**migration_audit_log.sql** — Único arquivo com RLS configurado:
- `ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;` (linha 22)
- Política `audit_insert`: authenticated pode inserir
- Política `audit_select_admin`: apenas admins podem ler
- Política `audit_select_anon`: **anon também pode ler** (linha 46) — sobrepõe a anterior

**Demais tabelas** (`devedores`, `credores`, `processos`, `andamentos`, `lembretes`, `registros_contato`, `regua_cobranca`, `regua_etapas`, `usuarios_sistema`, `modelos_peticao`):
- Nenhum arquivo SQL local define RLS para essas tabelas
- O sistema usa a anon key com `Authorization: Bearer <anon_key>` quando não autenticado
- **Sem RLS ativo no Supabase, qualquer pessoa com a anon key pode ler e modificar todos os dados**

**Conclusão RLS:** O código não documenta RLS nas tabelas principais. A segurança depende exclusivamente do controle de acesso na UI (tela de login). Se o Supabase não tiver RLS configurado para essas tabelas, os dados estão acessíveis via API REST diretamente.

---

## 9. Resumo Executivo por Módulo

| Módulo | Tem save/insert? | try/catch? | Erro exibido? | Classificação Geral |
|--------|-----------------|-----------|---------------|---------------------|
| **Credores** | Sim | Sim | Sim (toast/setErro) | **OK** |
| **Processos — inserir** | Sim | Sim | Sim (toast) | **OK** |
| **Processos — editar** | Sim | Sim | Não (silencioso) | **RISCO** |
| **Processos — andamento** | Sim | Sim | Não (local fallback) | **RISCO** |
| **Processos — excluir** | Sim | Catch vazio | Não | **RISCO** |
| **Devedores — inserir** | Sim | Parcial (loop sem try) | Só se todas tentativas falham | **RISCO** |
| **Devedores — editar** | Sim | Sim | Sim (toast) | **OK** |
| **Devedores — excluir** | Sim | **Nenhum** | Nenhum | **QUEBRADO** |
| **Acordos — novo** | Sim | Sim | Sim (toast + rollback) | **OK** |
| **Acordos — pagamento** | Sim | Sim | Apenas console.error | **RISCO** |
| **Acordos — excluir** | Sim | Catch vazio | Não | **RISCO** |
| **Registros de Contato — inserir** | Sim | Sim | Não (fallback local silencioso) | **RISCO** |
| **Registros de Contato — excluir** | Sim | Catch vazio | Não | **RISCO** |
| **Lembretes — inserir** | Sim | Sim | toast.success mesmo com falha | **RISCO** |
| **Lembretes — concluir/cancelar/excluir** | Sim | Catch vazio | Não | **RISCO** |
| **Régua — salvar etapas** | Sim | Catch vazio | Não | **QUEBRADO** |
| **Régua — salvar por devedor** | Sim | Catch vazio | Não | **QUEBRADO** |
| **Modelos de Petição** | Sim | Sim | Sim (setErro visível) | **OK** |
| **Petição Automática** | Não persiste | — | — | **OK** |
| **Usuários — criar** | Sim | Sim | Sim (toast) | **OK** |
| **Usuários — excluir** | Sim | Sim | Sim (toast + return) | **OK** |
| **Auditoria** | Fire-and-forget | .catch(()=>{}) | Nenhum (intencional) | **OK** |

---

## 10. Problemas Críticos Priorizados

### CRÍTICO 1 — Excluir devedor sem try/catch (linha 2380)
```js
await dbDelete("devedores", d.id);   // quebra silenciosamente em erro
```
Se o Supabase retornar erro (ex: FK constraint), a função pode deixar estado inconsistente.

### CRÍTICO 2 — Senha admin em plaintext no código-fonte (auth/users.js linha 4–13)
Qualquer pessoa com acesso ao repositório ou ao bundle JavaScript tem acesso às credenciais do administrador.

### CRÍTICO 3 — Fallback local silencioso em registros de contato e lembretes
O usuário vê `toast.success("Lembrete criado e visível para todos!")` mesmo quando o dado só existe no estado local React e será perdido no próximo refresh.

### CRÍTICO 4 — Régua de cobrança: catch vazio em operações bulk
Configurações de etapas e atribuições de régua podem falhar completamente sem nenhuma indicação ao usuário.

### CRÍTICO 5 — RLS não documentada nas tabelas principais
Sem evidência de RLS configurada para `devedores`, `credores`, `processos` — a anon key exposta no frontend potencialmente permite acesso direto.

### CRÍTICO 6 — Inserção de devedor: loop de 4 tentativas sem try/catch externo
Se o Supabase retornar erro HTTP em todas as tentativas, a exceção sobe sem tratamento.

---

## 11. Fontes

| Arquivo | Linhas auditadas |
|---------|-----------------|
| `src/config/supabase.js` | 1–77 (completo) |
| `src/App.jsx` | 1–7046 (por grep e leitura seletiva) |
| `src/components/GerarPeticao.jsx` | 1–1037 (completo) |
| `src/auth/users.js` | 1–79 (completo) |
| `src/utils/auditLog.js` | 1–41 (completo) |
| `migration_audit_log.sql` | 1–58 (completo) |
| `migration_credores.sql` | 1–16 (completo) |
| `migration_processos.sql` | 1–9 (completo) |
