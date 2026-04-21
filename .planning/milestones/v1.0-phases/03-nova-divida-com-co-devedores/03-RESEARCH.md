# Phase 3: Nova Dívida com Co-devedores — Research

**Researched:** 2026-04-20
**Domain:** React component extraction, atomic save pattern, multi-person form (Supabase REST)
**Confidence:** HIGH — all claims verified against actual codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** — `view='nova'` em `ModuloDividas` (não modal, não drawer). Passa de 2 para 3 views: `lista` / `detalhe` / `nova`.
- **D-02** — Layout top-bottom scroll: campos financeiros → Pessoas na Dívida → botões Salvar/Cancelar. Sem paginação.
- **D-03** — Modal "Criar Pessoa Rápida" (Nome* + CPF/CNPJ + Tipo). Ação "Criar e Vincular" insere em `devedores` e retorna com pessoa selecionada na linha correta. Campos complementares diferidos.
- **D-04** — Papel padrão herdado do contexto da linha de busca (PRINCIPAL se estava na linha Principal; COOBRIGADO se veio de "+ Adicionar co-devedor").
- **D-05** — Cards por linha com `×`, selects inline para papel e responsabilidade. Ícone 👑 para Principal; demais sem ícone 👑. Principal sem botão `×` (ou com `×` + warning, mantendo D-05 da Fase 2).
- **D-06** — Extrair `DividaForm.jsx` com campos financeiros; reutilizado por `NovaDivida.jsx` e pelo form inline existente no App.jsx. Props: `value` + `onChange`.
- **D-07** — Campos obrigatórios: Valor + Vencimento + 1 Principal. Credor não obrigatório.
- **D-08** — Botão Salvar desabilitado sem Principal; tooltip "Adicione pelo menos um devedor Principal"; dropdown omite pessoas já na lista.
- **D-09** — Pós-save: `view='lista'` + toast "Dívida criada com sucesso" + `carregarTudo()`.
- **D-10** — Escopo MVP Fase 3 = só criação. Edição de dívida existente mantém fluxo D-04 Fase 2.

### Claude's Discretion

- Estrutura visual exata dos cards de pessoa (cores, bordas, espaçamento)
- Debounce na busca de pessoas (sugestão: 200ms, mínimo 2 chars — igual DevedoresDaDivida.jsx)
- Estado de loading no botão Salvar durante o salvamento atômico
- Tratamento de erro de rede no save (toast de erro genérico é suficiente)
- Ordem dos selects de papel no dropdown (sugestão: PRINCIPAL primeiro)
- Como tratar `devedor_id` na tabela `dividas` (desnormalizado) quando há múltiplos Principais — usar o primeiro adicionado

### Deferred Ideas (OUT OF SCOPE)

- Edição de dívida existente via NovaDivida.jsx (modo edit) — Fase 4
- Clonar dívida — Fase 4
- Templates por credor — Fase 4
- Rascunho / autosave — Fase futura
- Edição em lote de dívidas — Fase futura
- Split de pagamentos por `divida_id` (Art. 354 CC) — Fase futura
</user_constraints>

---

## Summary

Esta fase adiciona a tela "Nova Dívida" ao Módulo Dívidas como uma nova view (`view='nova'`) em `ModuloDividas.jsx`. O trabalho principal envolve três atividades: (1) extrair o form inline de criação de dívida do App.jsx para `DividaForm.jsx` reutilizável, (2) criar `NovaDivida.jsx` com o `DividaForm` + seção de Pessoas (busca + cards), e (3) implementar salvamento atômico — `criarDivida()` seguido de múltiplos `adicionarParticipante()`.

O padrão de busca de pessoa, a lógica de papel/responsabilidade e o modal de aviso já existem em `DevedoresDaDivida.jsx` e `DetalheDivida.jsx`. O risco maior é a extração do `DividaForm.jsx` — o form inline no App.jsx tem handlers (`ND`, `confirmarParcelas`, `editParc`, `gerarParcs`) acoplados ao state local `nd` e ao contexto do devedor `sel`. A extração deve isolar esse estado e convertê-lo em props controladas.

O alias crítico de banco de dados (`indice_correcao` / `juros_am_percentual` / `multa_percentual` / `honorarios_percentual` ↔ `indexador` / `juros_am` / `multa_pct` / `honorarios_pct`) já foi mapeado em `carregarTudo()` e em `adicionarDivida()` — o novo form deve seguir exatamente o mesmo padrão de payload do `adicionarDivida()` existente.

**Primary recommendation:** Extrair `DividaForm.jsx` primeiro (como componente controlado puro), depois construir `NovaDivida.jsx` usando-o — nunca o contrário. Isso evita regressão no form inline existente.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| View routing (lista/detalhe/nova) | Frontend (ModuloDividas) | — | State React local; sem router |
| Campos financeiros do form | Frontend (DividaForm.jsx) | — | Componente controlado puro (value/onChange) |
| Seção Pessoas na Dívida | Frontend (NovaDivida.jsx) | — | State local de lista de pessoas pendentes |
| Busca de pessoa | Frontend (NovaDivida.jsx) | — | Filtro local em array `devedores` passado como prop |
| Modal "Criar Pessoa Rápida" | Frontend (NovaDivida.jsx) | — | `dbInsert("devedores", ...)` direto; depois re-seleciona |
| Salvamento atômico | Frontend → Supabase REST | — | `criarDivida()` → UUID → N × `adicionarParticipante()` |
| Atualização de state pós-save | App.jsx (via carregarTudo) | — | Padrão já estabelecido nas fases 1 e 2 |

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2 | UI state e renderização | Stack existente do projeto [VERIFIED: package.json] |
| react-hot-toast | 2.6 | Toast notifications | Padrão já usado em todo o sistema [VERIFIED: package.json + codebase] |
| Supabase REST via `sb()` | — | Persistência | Padrão do projeto — `config/supabase.js` [VERIFIED: codebase] |
| Tailwind inline styles | — | Estilização | Padrão de todo o projeto (sem CSS modules) [VERIFIED: codebase] |

### Supporting (já existentes no projeto)
| Component | Location | Purpose | When to Use |
|-----------|----------|---------|-------------|
| `Modal.jsx` | `components/ui/Modal.jsx` | Modal genérico com backdrop blur | Modal "Criar Pessoa Rápida" |
| `Btn.jsx` | `components/ui/Btn.jsx` | Botão com variantes (outline, danger, disabled) | Salvar, Cancelar, + Adicionar co-devedor |
| `Inp.jsx` | `components/ui/Inp.jsx` | Input/Select controlado com label | Todos os campos do DividaForm |
| `Art523Option.jsx` | `components/Art523Option.jsx` | Widget Art. 523 §1º CPC | Incluir em DividaForm.jsx |
| `DevedoresDaDivida.jsx` | `components/DevedoresDaDivida.jsx` | Referência de padrão busca + cards | Adaptar lógica de busca para NovaDivida |

### Installation
Nenhum pacote novo necessário — tudo já está instalado. [VERIFIED: package.json]

---

## Architecture Patterns

### System Architecture Diagram

```
ModuloDividas.jsx
├── view='lista' → FiltroDividas + TabelaDividas + [+ Nova Dívida btn]
├── view='detalhe' → DetalheDivida (sem mudança)
└── view='nova' → NovaDivida.jsx
                    ├── DividaForm.jsx (campos financeiros)
                    │     ├── Inp fields (Valor, Vencimento, Credor, Descricao, ...)
                    │     ├── Diretrizes do Contrato (Indexador, Juros, Multa, ...)
                    │     └── Art523Option.jsx
                    ├── Seção "Pessoas na Dívida"
                    │     ├── linha Principal (busca input → dropdown filtrado)
                    │     ├── [N] linhas co-devedor (+ cards com papel/responsabilidade/✕)
                    │     └── [+ Adicionar co-devedor]
                    ├── Modal "Criar Pessoa Rápida" (conditional)
                    │     └── dbInsert("devedores") → re-seleciona na linha
                    └── [Salvar] (disabled sem Principal) / [Cancelar]
                          │
                          ▼ save flow
                    criarDivida(payload) → { id: UUID }
                    for each pessoa: adicionarParticipante({ devedorId, dividaId: UUID, papel, responsabilidade })
                    carregarTudo() → onVoltar() → view='lista' + toast
```

App.jsx inline form ("➕ Nova Dívida" na aba Dívidas de Pessoa):
```
App.jsx linha ~3892
└── <DividaForm value={nd} onChange={ND} credores={credores} />  ← após extração
    + handlers de parcelas (permanecem no App.jsx, passados como props)
    + botão "Salvar Dívida" (chama adicionarDivida existente)
```

### Recommended Project Structure
```
src/components/
├── ModuloDividas.jsx        # adicionar case 'nova' + botão
├── NovaDivida.jsx           # NOVO — view de criação
├── DividaForm.jsx           # NOVO — form financeiro extraído
├── DetalheDivida.jsx        # sem mudança
├── DevedoresDaDivida.jsx    # sem mudança (referência de padrão)
└── ui/
    ├── Modal.jsx            # sem mudança (reutilizado)
    ├── Btn.jsx              # sem mudança
    └── Inp.jsx              # sem mudança
```

### Pattern 1: DividaForm como componente controlado puro

**What:** Componente que recebe `value` (objeto com todos os campos) e `onChange(campo, valor)`. Não tem state interno. Não salva. Apenas renderiza e chama `onChange`.

**When to use:** Sempre que campos financeiros precisam ser exibidos — tanto em NovaDivida.jsx quanto no form inline do App.jsx (aba Dívidas em Pessoa).

```jsx
// DividaForm.jsx — esqueleto baseado no form inline existente (App.jsx ~3892)
// Source: VERIFIED — App.jsx linha 3892-4011
export default function DividaForm({ value, onChange, credores = [] }) {
  // value shape corresponde a DIVIDA_VAZIA de constants.js:
  // { descricao, valor_total, data_origem, data_primeira_parcela, qtd_parcelas,
  //   parcelas, indexador, juros_tipo, multa_pct, juros_am, honorarios_pct,
  //   data_inicio_atualizacao, despesas, observacoes, custas, credor_id, art523_opcao }

  return (
    <div>
      {/* Grid: Valor + Vencimento + Credor + Descrição */}
      {/* Bloco Diretrizes do Contrato */}
      {/* Art523Option */}
      {/* Parcelamento (opcional) */}
      {/* Custas Judiciais (opcional) */}
    </div>
  );
}
```

**Campos não presentes no DIVIDA_VAZIA atual que DividaForm precisa adicionar:**
- `credor_id` — não está em DIVIDA_VAZIA (no form inline, usa `sel.credor_id`)
- `art523_opcao` — está no form inline mas não em DIVIDA_VAZIA (default `"nao_aplicar"`)

[VERIFIED: constants.js + App.jsx]

### Pattern 2: Salvamento atômico (criarDivida → vincularParticipantes)

**What:** Sequência garantida: criar a dívida primeiro, obter UUID, depois vincular todos os participantes.

**When to use:** Sempre ao criar nova dívida via NovaDivida.jsx.

```jsx
// Source: VERIFIED — App.jsx adicionarDivida() linha 3201; devedoresDividas.js adicionarParticipante()
async function handleSalvar() {
  setSalvando(true);
  try {
    // 1. Build payload — DEVE incluir ambos os aliases (DB + motor)
    const payload = {
      devedor_id: pessoas.find(p => p.papel === "PRINCIPAL")?.id, // desnormalizado
      credor_id: form.credor_id || null,
      observacoes: form.descricao || "Dívida",
      valor_total: parseFloat(form.valor_total),
      data_vencimento: form.data_origem,
      data_origem: form.data_origem,
      data_inicio_atualizacao: form.data_inicio_atualizacao || form.data_origem,
      // DB columns:
      indice_correcao: form.indexador || "igpm",
      juros_am_percentual: parseFloat(form.juros_am) || 0,
      multa_percentual: parseFloat(form.multa_pct) || 0,
      honorarios_percentual: parseFloat(form.honorarios_pct) || 0,
      // Motor aliases (obrigatórios — ver CRITICO):
      // NÃO incluir aqui — o dividasMap em carregarTudo() fará o mapeamento
      despesas: parseFloat(form.despesas) || 0,
      art523_opcao: form.art523_opcao || "nao_aplicar",
      parcelas: form.parcelas || [],
      custas: form.custas || [],
      status: "em cobrança",
    };

    // 2. Criar dívida → obter UUID
    const res = await criarDivida(payload);
    const novaDiv = Array.isArray(res) ? res[0] : res;
    if (!novaDiv?.id) throw new Error("Supabase não retornou row");

    // 3. Vincular todos os participantes (Principal primeiro)
    const principaisFirst = [...pessoas].sort((a, b) =>
      a.papel === "PRINCIPAL" ? -1 : b.papel === "PRINCIPAL" ? 1 : 0
    );
    for (const p of principaisFirst) {
      await adicionarParticipante({
        devedorId: p.devedor_id,
        dividaId: String(novaDiv.id),
        papel: p.papel,
        responsabilidade: p.responsabilidade,
      });
    }

    // 4. Atualizar state
    await onCarregarTudo();
    toast.success("Dívida criada com sucesso");
    onVoltar(); // volta para view='lista'
  } catch (e) {
    toast.error("Erro ao salvar: " + e.message);
  } finally {
    setSalvando(false);
  }
}
```

**CRITICO:** `adicionarParticipante()` quando `papel === "PRINCIPAL"` executa `demoverPrincipalAtual()` antes de inserir. Para a primeira vinculação (criação), não há principal anterior — comportamento correto. [VERIFIED: devedoresDividas.js linha 22-29]

### Pattern 3: Busca de pessoa no form (adaptado de DevedoresDaDivida.jsx)

**What:** Input de busca com mínimo 2 chars, filtro local no array `devedores` recebido como prop. Omite quem já está na lista de pessoas vinculadas (D-08).

```jsx
// Source: VERIFIED — DevedoresDaDivida.jsx AdicionarParticipanteModal linha 158-168
const idsJaNaLista = new Set(pessoas.map(p => String(p.devedor_id)));

const resultados = busca.trim().length >= 2
  ? devedores
      .filter(d =>
        !idsJaNaLista.has(String(d.id)) &&
        ((d.nome || "").toLowerCase().includes(busca.toLowerCase()) ||
          (d.cpf_cnpj || "").includes(busca))
      )
      .slice(0, 8)
  : [];

// Quando nenhum resultado: mostrar opção "+ Criar '[busca]'"
// Clique: abre modal "Criar Pessoa Rápida" com nome pré-preenchido
```

### Pattern 4: Modal "Criar Pessoa Rápida"

**What:** Usa `Modal.jsx` genérico. Após `dbInsert("devedores", { nome, cpf_cnpj, tipo })`, re-popula o campo de busca com a pessoa recém-criada e a adiciona à lista de `pessoas` na linha de contexto correto.

```jsx
// Source: VERIFIED — Modal.jsx (props: title, onClose, children, width)
// Source: VERIFIED — adicionarDivida() usa dbInsert("devedores") implicitamente via seedPrincipal
// dbInsert retorna array com a row criada (Prefer: return=representation)
async function handleCriarPessoa({ nome, cpf_cnpj, tipo }) {
  const res = await dbInsert("devedores", { nome, cpf_cnpj: cpf_cnpj || null, tipo: tipo || "PF" });
  const nova = Array.isArray(res) ? res[0] : res;
  // Adiciona diretamente à lista de pessoas com o papel do contexto
  adicionarPessoaNaLista({ devedor_id: nova.id, nome: nova.nome, papel: contextoLinha, responsabilidade: "SOLIDARIA" });
  setShowModalCriarPessoa(false);
}
```

### Pattern 5: State de pessoas pendentes em NovaDivida.jsx

**What:** Lista local de pessoas que serão vinculadas após o save. Não há chamadas ao banco até o clique em Salvar.

```jsx
// Estado inicial: 1 linha de Principal (vazia)
const [pessoas, setPessoas] = useState([
  { _key: Date.now(), papel: "PRINCIPAL", responsabilidade: "SOLIDARIA", devedor_id: null, nome: null }
]);

// Adicionar linha de co-devedor
function adicionarLinha() {
  setPessoas(prev => [...prev, {
    _key: Date.now(),
    papel: "COOBRIGADO",
    responsabilidade: "SOLIDARIA",
    devedor_id: null,
    nome: null
  }]);
}

// Remover linha (apenas co-devedores)
function removerLinha(key) {
  setPessoas(prev => prev.filter(p => p._key !== key));
}

// Selecionar pessoa em uma linha
function selecionarPessoa(key, devedor) {
  setPessoas(prev => prev.map(p =>
    p._key === key ? { ...p, devedor_id: devedor.id, nome: devedor.nome } : p
  ));
}
```

**Validação D-07/D-08:** `pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null)` deve ser `true` para o botão Salvar ficar habilitado. [VERIFIED: CONTEXT.md D-08]

### Anti-Patterns to Avoid

- **Vincular participantes antes de criarDivida:** A junction `devedores_dividas` tem FK `divida_id` — insert falhará sem a dívida existir primeiro.
- **Omitir aliases no payload:** O motor `devedorCalc.js` lê `indexador`/`juros_am`/`multa_pct`/`honorarios_pct`. O `carregarTudo()` faz o mapeamento ao carregar do banco — não ao salvar. O payload de `criarDivida()` deve usar os nomes de coluna DB (`indice_correcao` etc.), e o `carregarTudo()` já converte automaticamente. NÃO duplicar as aliases no payload — isso polui o banco.
- **Usar `window.confirm()` para remoção de Principal:** Padrão da Fase 2 usa Modal.jsx. Manter consistência (D-05).
- **State de pessoas no DividaForm:** `DividaForm` deve ser stateless (apenas campos financeiros). Pessoas ficam em `NovaDivida.jsx`.
- **Chamar `onVoltar()` antes de `onCarregarTudo()`:** `carregarTudo()` deve completar antes de navegar — caso contrário o badge do sidebar e `allDividas` ficam desatualizados.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Busca de pessoa por nome/CPF | Filtro customizado | Lógica já em `DevedoresDaDivida.jsx` (`AdicionarParticipanteModal`) | Padrão testado; inclui exclusão de já-vinculados |
| Modal com backdrop/animação | `<div position:fixed>` customizado | `Modal.jsx` | Já tem blur, animação fadeIn, scroll interno |
| Vincular devedor a dívida | INSERT direto em `devedores_dividas` | `adicionarParticipante()` em `devedoresDividas.js` | Inclui `demoverPrincipalAtual()` + idempotência |
| Criar pessoa nova | Form do zero | `dbInsert("devedores", payload)` direto | Tabela simples; campos complementares podem ser adicionados depois |
| Toast de sucesso/erro | Alert/confirm nativo | `react-hot-toast` (já instalado) | Padrão de todo o sistema |
| Botão desabilitado com tooltip | CSS customizado | `Btn` prop `disabled` + `title` nativo HTML | Consistência visual |

**Key insight:** 80% do trabalho desta fase é composição de peças já existentes, não construção nova. O risco principal é a extração do `DividaForm.jsx` sem introduzir regressão no form inline do App.jsx.

---

## Critical Alias Issue (VERIFIED)

Este é o item de maior risco da fase. Documentado aqui separadamente para máxima visibilidade.

**DB columns** (o que o Supabase armazena):
```
indice_correcao       TEXT   → ex: "igpm"
juros_am_percentual   FLOAT  → ex: 1.5
multa_percentual      FLOAT  → ex: 10
honorarios_percentual FLOAT  → ex: 20
observacoes           TEXT   → campo de descrição livre
```

**Motor aliases** (o que `devedorCalc.js` lê):
```
indexador       → lê de divida.indexador
juros_am        → lê de divida.juros_am
multa_pct       → lê de divida.multa_pct
honorarios_pct  → lê de divida.honorarios_pct
descricao       → lê de divida.descricao (form usa nd.descricao → payload.observacoes)
```

**O mapeamento acontece em `carregarTudo()` (App.jsx ~linha 8444-8453):**
```javascript
dividasMap.get(k).push({
  ...div,                              // spread das colunas DB
  parcelas: parseJ(div.parcelas),
  custas: parseJ(div.custas),
  descricao: div.observacoes,          // observacoes → descricao
  indexador: div.indice_correcao,      // mapeamento alias
  juros_am: div.juros_am_percentual,   // mapeamento alias
  multa_pct: div.multa_percentual,     // mapeamento alias
  honorarios_pct: div.honorarios_percentual, // mapeamento alias
});
```

**Conclusão para o planner:** O payload de `criarDivida()` deve usar APENAS os nomes de coluna DB. O `carregarTudo()` fará o mapeamento automaticamente ao recarregar. Não há necessidade de incluir ambos os sets no payload. [VERIFIED: App.jsx linhas 3209-3226 + 8441-8453]

---

## Common Pitfalls

### Pitfall 1: Quebrar o form inline existente ao extrair DividaForm
**What goes wrong:** O form inline no App.jsx usa `nd` (state React local) e handlers `ND`, `confirmarParcelas`, `editParc`, `addParc`, `remParc`, `adicionarCustasAvulsas` — todos acoplados ao contexto do devedor `sel`. Se a extração não isolar corretamente, o comportamento existente quebra.
**Why it happens:** O form inline é inline — não foi projetado para ser componente. Os handlers usam closures sobre `sel`, `nd`, `setNd`.
**How to avoid:** Extrair `DividaForm.jsx` como componente puramente controlado (sem state interno). Os handlers de parcelas devem ser passados como props ou reimplementados dentro de NovaDivida.jsx de forma independente. Refatorar App.jsx inline para usar `<DividaForm value={nd} onChange={ND} .../>` mantendo os handlers no App.jsx.
**Warning signs:** Testes `calculos.test.js` não cobrem o form — mas o build (`npm run build` com prebuild `test:regressao`) ainda serve de gate. Verificar manualmente o fluxo da aba Dívidas em Pessoa após a extração.

### Pitfall 2: `devedor_id` desnormalizado na tabela `dividas`
**What goes wrong:** A tabela `dividas` tem um campo `devedor_id` (desnormalizado para queries rápidas). No fluxo de NovaDivida, o usuário seleciona múltiplos devedores. Qual vai para `devedor_id`?
**Why it happens:** A tabela foi desenhada para o caso simples (1 devedor por dívida). A Fase 2 introduziu `devedores_dividas` para múltiplos, mas `dividas.devedor_id` permanece.
**How to avoid:** Usar o `id` do devedor com papel `PRINCIPAL` como `devedor_id`. Se múltiplos Principais (estado inválido), usar o primeiro da lista. [VERIFIED: CONTEXT.md seção Específics]
**Warning signs:** Se `devedor_id` ficar `null`, a tela DetalheDivida mostra "— sem devedor principal" e filtros por devedor no ModuloDividas não funcionam.

### Pitfall 3: Criar co-devedores via `seedPrincipal` em vez de `adicionarParticipante`
**What goes wrong:** `seedPrincipal()` existe para o fluxo legado (cria 1 devedor na junction, sempre como PRINCIPAL se não houver). Para NovaDivida, onde o usuário escolheu explicitamente papéis, usar `adicionarParticipante()` é o correto.
**Why it happens:** `adicionarDivida()` no App.jsx chama `seedPrincipal()` no final — pode parecer o padrão.
**How to avoid:** NovaDivida usa `adicionarParticipante()` diretamente para cada pessoa da lista. `seedPrincipal()` é o fallback legado — não usar neste fluxo.

### Pitfall 4: Modal "Criar Pessoa Rápida" não atualiza `devedores` local
**What goes wrong:** Após criar nova pessoa via modal, o `devedores` array passado como prop para `NovaDivida` (vem de App.jsx `allDevedores`) não é atualizado imediatamente — a pessoa recém-criada não aparece em futuras buscas até o próximo `carregarTudo()`.
**Why it happens:** `devedores` é prop read-only. O modal cria no banco mas o array local não muda.
**How to avoid:** Após `dbInsert("devedores", ...)`, a pessoa é adicionada diretamente à lista de `pessoas` do form (estado local de NovaDivida) sem precisar aparecer no dropdown novamente. O `carregarTudo()` pós-save atualizará o array global. Alternativamente, manter um estado local `pessoasCriadas` em NovaDivida para incluir nas buscas.

### Pitfall 5: Botão Salvar habilitado sem validar pessoa selecionada na linha
**What goes wrong:** A validação D-08 verifica `papel === "PRINCIPAL"` mas não garante que `devedor_id != null`. É possível ter uma linha de Principal sem pessoa selecionada (campo de busca vazio).
**Why it happens:** A linha de Principal é inicializada vazia — o usuário pode clicar Salvar sem escolher ninguém.
**How to avoid:** Condição de habilitação: `pessoas.some(p => p.papel === "PRINCIPAL" && p.devedor_id != null)`.

### Pitfall 6: `credor_id` ausente do DIVIDA_VAZIA
**What goes wrong:** `DIVIDA_VAZIA` em `constants.js` não tem campo `credor_id`. No form inline do App.jsx, o credor vem de `sel.credor_id`. Em NovaDivida, não há `sel` — o usuário escolhe o credor no form.
**Why it happens:** O form inline foi construído no contexto de um devedor específico que já tem credor.
**How to avoid:** NovaDivida usa state local expandido: `{ ...DIVIDA_VAZIA, credor_id: null, art523_opcao: "nao_aplicar" }`. DividaForm recebe `credores` como prop e renderiza o select de credor.

---

## Code Examples

### criarDivida — assinatura e retorno
```javascript
// Source: VERIFIED — services/dividas.js linhas 32-37
// POST para /rest/v1/dividas com Prefer: return=representation
// Retorna Array com a row criada: [{ id: "UUID", ...campos }]
export async function criarDivida(payload) {
  return sb(TABLE, "POST", {
    ...payload,
    updated_at: new Date().toISOString(),
  });
}
```

### adicionarParticipante — assinatura
```javascript
// Source: VERIFIED — services/devedoresDividas.js linhas 21-30
// Executa demoverPrincipalAtual() se papel === "PRINCIPAL"
export async function adicionarParticipante({ devedorId, dividaId, papel, responsabilidade, observacao = "" }) {
  if (papel === "PRINCIPAL") {
    await demoverPrincipalAtual(dividaId);
  }
  return sb(TABLE, "POST", {
    devedor_id: devedorId,
    divida_id: String(dividaId),   // sempre String — UUID
    papel,
    responsabilidade,
    observacao,
  });
}
```

### ModuloDividas — adicionar view='nova'
```jsx
// Source: VERIFIED — ModuloDividas.jsx linha 7-8, 39-86
// Adicionar: [selectedDivida state sem mudança], novo state para nova view
const [view, setView] = useState("lista");
// ...
function handleNovaDivida() { setView("nova"); }
function handleVoltarDaNova() { setView("lista"); }

// No return:
{view === "lista" && (
  <div>
    <div style={{ /* header existente */ }}>
      {/* badge existente */}
      <Btn onClick={handleNovaDivida} color="#059669">+ Nova Dívida</Btn>
    </div>
    {/* FiltroDividas e TabelaDividas sem mudança */}
  </div>
)}
{view === "nova" && (
  <NovaDivida
    devedores={devedores}
    credores={credores}
    onCarregarTudo={onCarregarTudo}
    onVoltar={handleVoltarDaNova}
  />
)}
{view === "detalhe" && selectedDivida && (
  <DetalheDivida {/* sem mudança */} />
)}
```

### Payload completo para criarDivida (campos obrigatórios vs opcionais)
```javascript
// Source: VERIFIED — adicionarDivida() App.jsx linhas 3209-3226
const payload = {
  // OBRIGATÓRIOS (D-07):
  valor_total: parseFloat(form.valor_total),     // number, not null
  data_vencimento: form.data_origem,             // date string YYYY-MM-DD
  // DESNORMALIZADO (1 Principal):
  devedor_id: principalPessoa.devedor_id,        // BIGINT do devedor Principal
  // OPCIONAIS (default null/0):
  credor_id: form.credor_id || null,
  observacoes: form.descricao || "Dívida",
  data_origem: form.data_origem || null,
  data_inicio_atualizacao: form.data_inicio_atualizacao || form.data_origem || null,
  indice_correcao: form.indexador || "igpm",
  juros_tipo: form.juros_tipo || "fixo_1",
  juros_am_percentual: parseFloat(form.juros_am) || 0,
  multa_percentual: parseFloat(form.multa_pct) || 0,
  honorarios_percentual: parseFloat(form.honorarios_pct) || 0,
  despesas: parseFloat(form.despesas) || 0,
  art523_opcao: form.art523_opcao || "nao_aplicar",
  parcelas: form.parcelas || [],
  custas: form.custas || [],
  status: "em cobrança",
};
```

### PAPEL_META e RESP_LABELS (copiar de DevedoresDaDivida.jsx para NovaDivida.jsx)
```javascript
// Source: VERIFIED — DevedoresDaDivida.jsx linhas 5-18
const PAPEL_META = {
  PRINCIPAL:  { label: "Principal",  bg: "#fef3c7", cor: "#92400e" },
  COOBRIGADO: { label: "Coobrigado", bg: "#ede9fe", cor: "#4c1d95" },
  AVALISTA:   { label: "Avalista",   bg: "#dbeafe", cor: "#1e3a8a" },
  FIADOR:     { label: "Fiador",     bg: "#dcfce7", cor: "#14532d" },
  CONJUGE:    { label: "Cônjuge",    bg: "#fce7f3", cor: "#831843" },
  OUTRO:      { label: "Outro",      bg: "#f1f5f9", cor: "#334155" },
};
const RESP_LABELS = { SOLIDARIA: "Solidária", SUBSIDIARIA: "Subsidiária", DIVISIVEL: "Divisível" };
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `devedores.dividas` JSONB | Tabela `dividas` UUID PK | Fase 1 | Todo CRUD usa `dividas.js` + `devedoresDividas.js` |
| 1 devedor por dívida | `devedores_dividas` N:N | Fase 2 (260418-gxm) | Principal/co-devedores via junction table |
| Modal para nova dívida | View inline no módulo | Fase 3 (D-01 LOCKED) | Mais espaço, scroll natural |
| Form acoplado ao App.jsx | `DividaForm.jsx` extraído | Fase 3 | Reutilização em múltiplos contextos |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | O campo `status` padrão para nova dívida é `"em cobrança"` | Pattern 2 (payload) | Se default for diferente, badge do sidebar pode não contar a nova dívida [ASSUMED — não encontrei migration com DEFAULT para status] |
| A2 | `dbInsert("devedores", { nome, cpf_cnpj, tipo })` é suficiente para criar pessoa sem campos complementares (sem NOT NULL constraints ocultos) | Pattern 4 | Modal "Criar Pessoa Rápida" falharia se houver colunas NOT NULL desconhecidas |
| A3 | A coluna `devedor_id` em `dividas` aceita `NULL` (para o caso hipotético de dívida sem Principal) | Pitfall 2 | Supabase rejeitaria o insert se NOT NULL |

---

## Open Questions

1. **Campo `status` — valor default no banco**
   - O que sabemos: `adicionarDivida()` no App.jsx não inclui `status` explícito no payload (ver linha 3209-3226). O filtro do ModuloDividas usa `d.status === "em cobrança"` para o badge.
   - O que é incerto: Se a tabela tem `DEFAULT 'em cobrança'` ou se o campo fica `null` quando omitido.
   - Recomendação: O plano deve incluir `status: "em cobrança"` explícito no payload do NovaDivida para garantir (não depender do default do banco).

2. **Regressão no form inline após extração de DividaForm**
   - O que sabemos: O form inline é renderizado dentro da aba Dívidas de Pessoa, com handlers `ND`, `confirmarParcelas`, `editParc`, `addParc`, `remParc` no App.jsx.
   - O que é incerto: Quantos outros lugares no App.jsx referenciam esses handlers e estado `nd` de forma que a extração possa quebrar.
   - Recomendação: O plano deve incluir uma task específica de "refatorar App.jsx para usar DividaForm" separada da task de "criar DividaForm.jsx", com verificação manual do fluxo aba Dívidas em Pessoa após cada mudança.

---

## Environment Availability

Step 2.6: Sem dependências externas novas nesta fase. Tudo já instalado e verificado em produção (mrcobrancas.com.br). [VERIFIED: package.json + STATE.md]

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| React 18 | Tudo | ✓ | 18.2.0 | — |
| react-hot-toast | Toasts | ✓ | 2.6.0 | — |
| Vitest | test:regressao prebuild | ✓ | 4.1.4 | — |
| Supabase REST | Persistência | ✓ | (SaaS) | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | vite.config.js (detectado automaticamente) |
| Quick run command | `npm run test:regressao` (em `src/mr-3/mr-cobrancas/`) |
| Full suite command | `npm test` (em `src/mr-3/mr-cobrancas/`) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-01 | view='nova' renderiza sem crashar | smoke | build gate `npm run build` | ✅ (build + prebuild) |
| D-06 | DividaForm renderiza com os campos corretos | manual | inspeção visual no browser | — |
| D-07 | Botão Salvar habilitado apenas com Valor + Vencimento + 1 Principal | manual | inspeção visual no browser | — |
| D-08 | Dropdown omite pessoas já na lista | manual | inspeção visual no browser | — |
| D-09 | Pós-save: view='lista' + toast + badge atualizado | manual | inspeção visual no browser | — |
| ALIAS | Motor não quebra com nova dívida criada | regression | `npm run test:regressao` | ✅ calculos.test.js |

### Sampling Rate
- **Por task commit:** `cd src/mr-3/mr-cobrancas && npm run test:regressao`
- **Por wave merge:** `cd src/mr-3/mr-cobrancas && npm run build` (inclui prebuild test:regressao)
- **Phase gate:** Build verde + verificação manual dos 5 fluxos principais antes de `/gsd-verify-work`

### Wave 0 Gaps
- Nenhum gap de infraestrutura de teste. `calculos.test.js` existe e cobre o motor de cálculo. Testes de componente (React Testing Library) não existem no projeto e não são necessários para esta fase — verificação manual é o padrão estabelecido.

---

## Security Domain

> `security_enforcement` não está explicitamente configurado como `false` — incluindo seção.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | não (auth já existe) | Supabase JWT (herdado) |
| V3 Session Management | não | herdado |
| V4 Access Control | sim (inserção em `dividas` + `devedores_dividas` + `devedores`) | RLS Supabase (configurado nas fases anteriores) |
| V5 Input Validation | sim | Validação inline React (D-07/D-08) + NOT NULL no banco |
| V6 Cryptography | não | — |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insert de dívida sem autenticação | Elevation of Privilege | RLS Supabase + Bearer token obrigatório via `sb()` [VERIFIED: supabase.js linha 17] |
| XSS via nome de pessoa | Tampering | React JSX escapa automaticamente strings — não usar `dangerouslySetInnerHTML` |
| UUID injection em `adicionarParticipante` | Tampering | `encodeURIComponent(dividaId)` já usado em `listarParticipantes` [VERIFIED: devedoresDividas.js linha 6] — replicar no insert |
| Criação de pessoa sem validação de CPF/CNPJ | Information Disclosure | Modal "Criar Pessoa Rápida" — CPF/CNPJ é opcional (campo complementar) — risco aceito pelo usuário |

---

## Sources

### Primary (HIGH confidence)
- `src/mr-3/mr-cobrancas/src/App.jsx` (linhas 3201-3263, 8422-8480) — padrão `adicionarDivida()` + `carregarTudo()` com dividasMap
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — `criarDivida()` completo
- `src/mr-3/mr-cobrancas/src/services/devedoresDividas.js` — `adicionarParticipante()` + `demoverPrincipalAtual()`
- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — estrutura atual das 2 views
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — referência de layout e uso de Modal.jsx
- `src/mr-3/mr-cobrancas/src/components/DevedoresDaDivida.jsx` — padrão de busca + cards
- `src/mr-3/mr-cobrancas/src/components/ui/*.jsx` — Btn, Inp, Modal
- `src/mr-3/mr-cobrancas/src/components/Art523Option.jsx` — widget Art.523
- `src/mr-3/mr-cobrancas/src/config/supabase.js` — `sb()`, `dbInsert()`
- `src/mr-3/mr-cobrancas/src/utils/constants.js` — `DIVIDA_VAZIA`
- `src/mr-3/mr-cobrancas/package.json` — dependências e scripts de test
- `.planning/phases/03-nova-divida-com-co-devedores/03-CONTEXT.md` — todas as decisões locked

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — histórico de fases anteriores e quick tasks

### Tertiary (LOW confidence)
- Nenhum — todos os claims críticos foram verificados no codebase.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verificado em package.json e codebase
- Architecture: HIGH — verificado nos componentes existentes e padrões de fase 1/2
- Pitfalls: HIGH — identificados diretamente no código existente (alias issue, form inline acoplado)
- Alias crítico: HIGH — verificado em carregarTudo() e adicionarDivida()

**Research date:** 2026-04-20
**Valid until:** 2026-05-20 (stack estável — sem upgrade planejado)
