# Research: Corrigir Persistência Supabase — Catches Vazios e Fallbacks Silenciosos

**Researched:** 2026-04-15
**Domain:** App.jsx — tratamento de erros em operações Supabase (dbInsert, dbUpdate, dbDelete)
**Confidence:** HIGH (leitura direta do arquivo fonte)

---

## Summary

Leitura direta de App.jsx (7046 linhas) para extrair o código exato nos pontos de correção.
Todos os old_strings abaixo foram copiados literalmente do arquivo — sem suposições.

**Toast disponível:** `import toast, { Toaster } from 'react-hot-toast';` — linha 2. [VERIFIED: leitura direta]

**Padrão de toast.error já usado em catches que funcionam:**
```js
} catch (e) { toast.error("Erro: " + e.message); }          // linhas 2150, 2166
} catch (e) { toast.error("Erro ao excluir: " + (e?.message || e)); }  // linha 3163
} catch (e) { toast.error("Não foi possível excluir o usuário no Supabase:" + e.message); return; }  // linha 6171
```

O padrão recomendado a seguir é: `toast.error("Erro: " + (e?.message || e))` — usa optional chaining para não quebrar quando `e` não é um Error.

---

## GRUPO 1 — Catch Vazio (13 pontos)

### Ponto G1-1 — Linha 831

**Operação protegida:** `dbUpdate("devedores", ...)` — salvar parcelas/status do acordo

**Contexto atual (linhas 825–832):**
```jsx
    try {
      await dbUpdate("devedores", devedor.id, {
        acordos: JSON.stringify(novosAcordos),
        status: novoStatusDev,
      });
      onAtualizarDevedor({ ...devedor, acordos: novosAcordos, status: novoStatusDev });
    } catch (e) { console.error(e); }
```

**old_string exato:**
```
    } catch (e) { console.error(e); }
```

**Nota:** Este catch já tem `console.error(e)` — diferente dos demais. Adicionar `toast.error` junto.

---

### Ponto G1-2 — Linha 838

**Operação protegida:** `dbUpdate("devedores", ...)` — excluirAcordo

**Contexto atual (linhas 834–840):**
```jsx
  async function excluirAcordo(acordoId) {
    if (!await confirm("Excluir este acordo e todas as parcelas?")) return;
    const novos = acordosLocal.filter(a => a.id !== acordoId);
    setAcordosLocal(novos);
    try { await dbUpdate("devedores", devedor.id, { acordos: JSON.stringify(novos) }); } catch (e) { }
    onAtualizarDevedor({ ...devedor, acordos: novos });
  }
```

**old_string exato:**
```
    try { await dbUpdate("devedores", devedor.id, { acordos: JSON.stringify(novos) }); } catch (e) { }
```

---

### Ponto G1-3 — Linha 1058

**Operação protegida:** `dbDelete("registros_contato", id)` — excluirRegistro

**Contexto atual (linhas 1056–1060):**
```jsx
  async function excluirRegistro(id) {
    if (!await confirm("Excluir este registro?")) return;
    try { await dbDelete("registros_contato", id); } catch (e) { }
    setRegistros(r => r.filter(x => x.id !== id));
  }
```

**old_string exato:**
```
    try { await dbDelete("registros_contato", id); } catch (e) { }
```

---

### Ponto G1-4 — Linha 1094

**Operação protegida:** `dbUpdate("lembretes", ...)` — concluirLem

**Contexto atual (linhas 1093–1096):**
```jsx
  async function concluirLem(id) {
    try { await dbUpdate("lembretes", id, { status: "concluido", concluido_em: new Date().toISOString() }); } catch (e) { }
    setLemsDevedor(l => l.map(x => x.id !== id ? x : { ...x, status: "concluido" }));
  }
```

**old_string exato:**
```
    try { await dbUpdate("lembretes", id, { status: "concluido", concluido_em: new Date().toISOString() }); } catch (e) { }
```

---

### Ponto G1-5 — Linha 1099

**Operação protegida:** `dbDelete("lembretes", id)` — excluirLem

**Contexto atual (linhas 1097–1101):**
```jsx
  async function excluirLem(id) {
    if (!await confirm("Excluir lembrete?")) return;
    try { await dbDelete("lembretes", id); } catch (e) { }
    setLemsDevedor(l => l.filter(x => x.id !== id));
  }
```

**old_string exato:**
```
    try { await dbDelete("lembretes", id); } catch (e) { }
```

---

### Ponto G1-6 — Linha 3414

**Operação protegida:** `dbUpdate("processos", ...)` — atualizar proximo_prazo ao registrar andamento

**Contexto atual (linhas 3412–3416):**
```jsx
    // Atualizar proximo_prazo do processo se houver prazo no andamento
    if (andForm.prazo) {
      try { await dbUpdate("processos", sel.id, { proximo_prazo: andForm.prazo }); } catch (e) { }
      setProcessos(prev => prev.map(p => p.id === sel.id ? { ...p, proximo_prazo: andForm.prazo } : p));
    }
```

**old_string exato:**
```
      try { await dbUpdate("processos", sel.id, { proximo_prazo: andForm.prazo }); } catch (e) { }
```

---

### Ponto G1-7 — Linha 3431

**Operação protegida:** `dbDelete("processos", id)` — excluirProcesso

**Contexto atual (linhas 3428–3435):**
```jsx
  async function excluirProcesso(id) {
    if (!await confirm("Excluir este processo?")) return;
    const proc = processos.find(p => p.id === id);
    try { await dbDelete("processos", id); } catch (e) { }
    logAudit("Excluiu processo", "processos", { id, numero: proc?.numero });
    setProcessos(prev => prev.filter(p => p.id !== id));
    setFichaId(null);
  }
```

**old_string exato:**
```
    try { await dbDelete("processos", id); } catch (e) { }
```

---

### Ponto G1-8 — Linha 4818

**Operação protegida:** `dbUpdate("lembretes", ...)` — concluir (módulo lembretes global)

**Contexto atual (linhas 4817–4820):**
```jsx
  async function concluir(id) {
    try { await dbUpdate("lembretes", id, { status: "concluido", concluido_em: new Date().toISOString() }); } catch (e) { }
    setLembretes(l => l.map(x => x.id !== id ? x : { ...x, status: "concluido", concluido_em: new Date().toISOString() }));
  }
```

**old_string exato:**
```
    try { await dbUpdate("lembretes", id, { status: "concluido", concluido_em: new Date().toISOString() }); } catch (e) { }
```

**Atenção:** Esta linha é idêntica à G1-4 (linha 1094). As duas existem em componentes/contextos diferentes — não confundir durante a edição (verificar contexto ao redor antes de aplicar).

---

### Ponto G1-9 — Linha 4822

**Operação protegida:** `dbUpdate("lembretes", ...)` — cancelar (módulo lembretes global)

**Contexto atual (linhas 4821–4824):**
```jsx
  async function cancelar(id) {
    try { await dbUpdate("lembretes", id, { status: "cancelado" }); } catch (e) { }
    setLembretes(l => l.map(x => x.id !== id ? x : { ...x, status: "cancelado" }));
  }
```

**old_string exato:**
```
    try { await dbUpdate("lembretes", id, { status: "cancelado" }); } catch (e) { }
```

---

### Ponto G1-10 — Linha 4826

**Operação protegida:** `dbUpdate("lembretes", ...)` — reativar (módulo lembretes global)

**Contexto atual (linhas 4825–4828):**
```jsx
  async function reativar(id) {
    try { await dbUpdate("lembretes", id, { status: "pendente", concluido_em: null }); } catch (e) { }
    setLembretes(l => l.map(x => x.id !== id ? x : { ...x, status: "pendente", concluido_em: null }));
  }
```

**old_string exato:**
```
    try { await dbUpdate("lembretes", id, { status: "pendente", concluido_em: null }); } catch (e) { }
```

---

### Ponto G1-11 — Linha 4831

**Operação protegida:** `dbDelete("lembretes", id)` — excluir (módulo lembretes global)

**Contexto atual (linhas 4829–4833):**
```jsx
  async function excluir(id) {
    if (!await confirm("Excluir este lembrete?")) return;
    try { await dbDelete("lembretes", id); } catch (e) { }
    setLembretes(l => l.filter(x => x.id !== id));
  }
```

**old_string exato:**
```
    try { await dbDelete("lembretes", id); } catch (e) { }
```

**Atenção:** old_string idêntico ao G1-5 (linha 1099). Usar o contexto da função `excluir` (não `excluirLem`) para diferenciar.

---

### Ponto G1-12 — Linha 5487

**Operação protegida:** Bloco completo de sincronização de etapas da régua (`dbGet`, `dbInsert`, `dbUpdate`, `dbDelete` em `regua_etapas`) — função `se(novas)`

**Contexto atual (linhas 5468–5488):**
```jsx
    try {
      // Buscar IDs existentes
      const existentes = await dbGet("regua_etapas", "select=id");
      const idsExist = new Set((Array.isArray(existentes) ? existentes : []).map(r => r.id));
      for (const et of novas) {
        const payload = { dias: et.dias, canal: et.canal, titulo: et.titulo, ativo: et.ativo, categoria: et.categoria, mensagem: et.mensagem };
        if (typeof et.id === "number" && et.id > 1e10) {
          // ID gerado localmente (Date.now()) — inserir novo
          const res = await dbInsert("regua_etapas", payload);
          const novo = Array.isArray(res) ? res[0] : res;
          if (novo?.id) setEtapas(prev => prev.map(e => e.id === et.id ? { ...e, id: novo.id } : e));
        } else if (idsExist.has(et.id)) {
          await dbUpdate("regua_etapas", et.id, payload).catch(() => { });
        }
      }
      // Deletar etapas removidas
      for (const id of idsExist) {
        if (!novas.find(e => e.id === id)) await dbDelete("regua_etapas", id).catch(() => { });
      }
    } catch (e) { }
  }
```

**old_string exato (apenas o catch):**
```
    } catch (e) { }
  }
```

**Atenção:** Este `} catch (e) { }` é seguido por `  }` (fechamento da função `se`). Usar contexto amplo para não ambiguar com outros catches.

---

### Ponto G1-13 — Linha 5499

**Operação protegida:** `dbGet` + `dbDelete` + `dbInsert` em `regua_cobranca` — função `salvarRegua`

**Contexto atual (linhas 5490–5500):**
```jsx
  async function salvarRegua(devId, tipo, etapaForcadaId) {
    try {
      const existing = await dbGet("regua_cobranca", `devedor_id=eq.${devId}`);
      for (const r of (Array.isArray(existing) ? existing : [])) { try { await dbDelete("regua_cobranca", r.id); } catch { } }
      if (tipo) {
        const payload = { devedor_id: devId, tipo, criado_por: user?.nome || "Sistema" };
        if (etapaForcadaId) payload.etapa_forcada = etapaForcadaId;
        await dbInsert("regua_cobranca", payload);
      }
    } catch (e) { }
  }
```

**old_string exato:**
```
    } catch (e) { }
  }

  async function incluirDev(id) {
```

**Nota:** Usar linhas seguintes (`async function incluirDev`) para garantir unicidade do old_string.

---

### Ponto G1-14 — Linha 5802

**Operação protegida:** `dbGet` + `dbDelete` + `dbInsert` em `regua_cobranca` — dentro de onClick inline (mover devedor de etapa)

**Contexto atual (linhas 5797–5803):**
```jsx
                    // Salva no Supabase
                    try {
                      const ex = await dbGet("regua_cobranca", `devedor_id=eq.${dev.id}`);
                      for (const r of (Array.isArray(ex) ? ex : [])) { try { await dbDelete("regua_cobranca", r.id); } catch { } }
                      await dbInsert("regua_cobranca", { devedor_id: dev.id, tipo: "incluido", etapa_forcada: et.id, criado_por: user?.nome || "Sistema" });
                    } catch (e) { }
```

**old_string exato:**
```
                    } catch (e) { }
                    // ✅ Atualiza estado local IMEDIATAMENTE — sem precisar recarregar
```

**Nota:** Usar o comentário seguinte para garantir unicidade.

---

## GRUPO 2 — Fallback Local Silencioso (3 pontos)

Nesses catches, quando o Supabase falha o código insere um registro local com `id: Date.now()` sem avisar o usuário. O problema: o usuário pensa que salvou, mas o dado não está no banco.

### Ponto G2-1 — Linha 1051

**Operação:** `dbInsert("registros_contato", ...)` — salvarRegistro

**Bloco completo (linhas 1045–1053):**
```jsx
    try {
      const res = await dbInsert("registros_contato", payload);
      const novo = Array.isArray(res) ? res[0] : res;
      if (novo?.id) { setRegistros(r => [novo, ...r]); }
      else { setRegistros(r => [{ ...payload, id: Date.now() }, ...r]); }
    } catch (e) {
      setRegistros(r => [{ ...payload, id: Date.now() }, ...r]);
    }
```

**old_string exato (o catch completo):**
```
    } catch (e) {
      setRegistros(r => [{ ...payload, id: Date.now() }, ...r]);
    }
```

**O que está no try (preservar no sucesso):** `dbInsert` → se tem `novo.id` usa o retorno do banco; senão usa fallback local. No catch atual: sempre usa fallback local sem aviso.

**Correção esperada:** No catch, mostrar `toast.error(...)` e NÃO inserir localmente (ou inserir com aviso claro de que é temporário).

---

### Ponto G2-2 — Linha 1087

**Operação:** `dbInsert("lembretes", ...)` — salvarLem (no módulo do devedor individual)

**Bloco completo (linhas 1083–1088):**
```jsx
    try {
      const res = await dbInsert("lembretes", payload);
      const novo = Array.isArray(res) ? res[0] : res;
      setLemsDevedor(l => [...(novo?.id ? [novo] : [{ ...payload, id: Date.now() }]), ...l]);
    } catch (e) { setLemsDevedor(l => [{ ...payload, id: Date.now() }, ...l]); }
```

**old_string exato:**
```
    } catch (e) { setLemsDevedor(l => [{ ...payload, id: Date.now() }, ...l]); }
```

**O que está no try (preservar no sucesso):** `dbInsert` → usa retorno com `novo.id` se disponível, senão fallback local. O `toast.success` vem DEPOIS (linha 1090) fora do try/catch — já existe.

**Correção esperada:** No catch, mostrar `toast.error(...)` e não inserir localmente (o toast.success na linha 1090 NÃO deve executar em caso de erro — pode precisar mover o toast.success para dentro do try).

---

### Ponto G2-3 — Linha 4812

**Operação:** `dbInsert("lembretes", ...)` — salvarLembrete (módulo lembretes global)

**Bloco completo (linhas 4808–4813):**
```jsx
    try {
      const res = await dbInsert("lembretes", payload);
      const novo = Array.isArray(res) ? res[0] : res;
      setLembretes(l => [...(novo?.id ? [novo] : [{ ...payload, id: Date.now(), criado_em: new Date().toISOString() }]), ...l]);
    } catch (e) { setLembretes(l => [{ ...payload, id: Date.now(), criado_em: new Date().toISOString() }, ...l]); }
```

**old_string exato:**
```
    } catch (e) { setLembretes(l => [{ ...payload, id: Date.now(), criado_em: new Date().toISOString() }, ...l]); }
```

**O que está no try (preservar no sucesso):** `dbInsert` → usa retorno com `novo.id` se disponível, senão fallback local.

**Correção esperada:** No catch, mostrar `toast.error(...)` e não inserir localmente.

---

## GRUPO 3 — Sem try/catch em excluirDevedor

### Ponto G3-1 — Linha 2380

**Bloco completo da função (linhas 2378–2384):**
```jsx
  async function excluirDevedor(d) {
    if (!await confirm(`Excluir "${d.nome}"?`)) return;
    await dbDelete("devedores", d.id);
    logAudit("Excluiu devedor", "devedores", { id: d.id, nome: d.nome, cpf_cnpj: d.cpf_cnpj });
    setDevedores(prev => prev.filter(x => x.id !== d.id));
    fecharModal();
  }
```

**old_string exato (o bloco a envolver em try/catch):**
```
  async function excluirDevedor(d) {
    if (!await confirm(`Excluir "${d.nome}"?`)) return;
    await dbDelete("devedores", d.id);
    logAudit("Excluiu devedor", "devedores", { id: d.id, nome: d.nome, cpf_cnpj: d.cpf_cnpj });
    setDevedores(prev => prev.filter(x => x.id !== d.id));
    fecharModal();
  }
```

**O que vem antes:** `setSel(parsed);` (linha 2375) e fechamento do catch de alterarStatus.
**O que vem depois:** `function onAtualizarDevedor(devAtualizado) {` (linha 2386).

**Estrutura da correção:**
```jsx
  async function excluirDevedor(d) {
    if (!await confirm(`Excluir "${d.nome}"?`)) return;
    try {
      await dbDelete("devedores", d.id);
    } catch (e) {
      toast.error("Erro ao excluir devedor: " + (e?.message || e));
      return;
    }
    logAudit("Excluiu devedor", "devedores", { id: d.id, nome: d.nome, cpf_cnpj: d.cpf_cnpj });
    setDevedores(prev => prev.filter(x => x.id !== d.id));
    fecharModal();
  }
```

**Razão do `return` no catch:** Se o delete falhar, NÃO deve remover do estado local nem chamar `fecharModal` — seria falso positivo.

---

## Resumo de Verificação

### Toast
- **Importado:** Sim — linha 2 — `import toast, { Toaster } from 'react-hot-toast';` [VERIFIED]
- **Padrão existente nos catches funcionais:**
  - `toast.error("Erro: " + e.message)` — simples, sem optional chaining
  - `toast.error("Erro ao excluir: " + (e?.message || e))` — com optional chaining (mais seguro)
- **Recomendação:** usar `(e?.message || e)` para consistência e segurança

### Catches com conteúdo diferente de vazio
| Linha | Conteúdo atual | Observação |
|-------|----------------|-----------|
| 831 | `console.error(e)` | Adicionar toast.error junto |
| 1051, 1087, 4812 | fallback local silencioso | GRUPO 2 — remover fallback + adicionar toast.error |
| 5487, 5499 | vazio `{ }` | GRUPO 1 padrão |
| 5802 | vazio `{ }` | GRUPO 1 padrão — linha inline em JSX |

### Catches idênticos que existem em DOIS contextos diferentes
| old_string | Linha A | Linha B | Como diferenciar |
|-----------|---------|---------|-----------------|
| `try { await dbUpdate("lembretes", id, { status: "concluido"...` | 1094 | 4818 | Contexto: função `concluirLem` vs `concluir` |
| `try { await dbDelete("lembretes", id); } catch (e) { }` | 1099 | 4831 | Contexto: função `excluirLem` vs `excluir` |

Para edições com old_string ambíguo, incluir 1–2 linhas de contexto antes/depois para garantir unicidade.

---

## Sources

- [VERIFIED: leitura direta] App.jsx linhas 1–7046 — `c:/Users/advai/Downloads/mr-cobrancas-vercel_1/mr-cobrancas/src/mr-3/mr-cobrancas/src/App.jsx`
