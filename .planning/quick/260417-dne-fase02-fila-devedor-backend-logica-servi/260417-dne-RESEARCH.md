# Quick Task 260417-dne: Fase 2 Fila de Devedor - Backend - Research

**Researched:** 2026-04-17
**Domain:** Supabase REST API (PostgREST) + logica de negocios JS
**Confidence:** HIGH

## Summary

Este service file (`filaDevedor.js`) implementa 7 funcoes de negocio que operam sobre as 6 tabelas criadas na fase 1 (260417-dea). O client Supabase do projeto usa fetch puro contra a REST API do PostgREST (nao usa o SDK `@supabase/supabase-js`), o que impoe limitacoes importantes: nao ha `.rpc()`, nao ha `.or()`, nao ha query builder. Toda query complexa deve ser montada via query string PostgREST.

O ponto critico e o `proximoDevedor` que precisa de lock otimista (SELECT + UPDATE atomico). Como o client usa REST puro, a abordagem viavel e: SELECT o proximo -> PATCH com filtro duplo (id + status_fila original) -> verificar se retornou registro (se nao retornou, outro operador pegou antes).

**Primary recommendation:** Usar `sb()` diretamente com query strings PostgREST para queries complexas (filtros multiplos, ORDER, LIMIT), e `dbInsert`/`dbUpdate`/`dbDelete` para operacoes simples. Para o lock otimista, usar PATCH com filtro composto via `sb()`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Arquivo: `src/mr-3/mr-cobrancas/src/services/filaDevedor.js`
- Criar diretorio `services/` se nao existir
- Script de teste REAL: `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js`
- Usar `calcularFatorCorrecao()` de `../utils/correcao.js` para atualizarValoresAtrasados
- JavaScript puro (sem TypeScript)
- Importar de `../config/supabase.js`
- Padrao de retorno: `{ success: boolean, data: any, error: string|null }`
- try/catch em todas as funcoes
- Export: `export const filaDevedor = { ... }`
- 7 funcoes: calcularScorePrioridade, entrarNaFila, proximoDevedor, registrarEvento, reciclarContratos, removerDaFila, atualizarValoresAtrasados

### Claude's Discretion
- Estrutura interna de cada funcao (nomes de variaveis, etc.)
- Indice de correcao padrao para atualizarValoresAtrasados (IGPM como default)
</user_constraints>

## API do Client Supabase - Assinaturas Exatas

[VERIFIED: leitura direta de `src/mr-3/mr-cobrancas/src/config/supabase.js`]

### sb(path, method, body, extra)
```javascript
// Wrapper HTTP generico - toda comunicacao passa por aqui
export async function sb(path, method = "GET", body = null, extra = "") {
  // Monta: ${SUPABASE_URL}/rest/v1/${path}${extra}
  // Headers: apikey, Authorization (Bearer token ou key), Content-Type, Prefer: return=representation
  // Retorna: JSON parseado (array para GET, objeto/array para POST/PATCH/DELETE)
  // Throws: Error com .status e .details em caso de !res.ok
}
```

### Helpers CRUD
```javascript
export const dbGet    = (t, q = "")   => sb(t, "GET",    null, q ? `?${q}` : "?order=id.asc");
export const dbInsert = (t, b)         => sb(t, "POST",   b);
export const dbUpdate = (t, id, b)     => sb(t, "PATCH",  b, `?id=eq.${id}`);
export const dbDelete = (t, id)        => sb(t, "DELETE", null, `?id=eq.${id}`);
```

### Implicacoes Criticas

| Helper | Limitacao | Solucao |
|--------|-----------|---------|
| `dbGet` | Aceita query string livre - suporta filtros PostgREST completos | Usar diretamente com filtros |
| `dbUpdate` | Filtra APENAS por `id=eq.{id}` - nao aceita filtros compostos | Usar `sb()` direto para PATCH com filtros compostos |
| `dbDelete` | Filtra APENAS por `id=eq.{id}` | Usar `sb()` direto para DELETE com filtros compostos |
| `dbInsert` | Sem limitacao - insere body direto | Usar normalmente |

### Como Fazer Queries PostgREST

[CITED: https://postgrest.org/en/stable/references/api/tables_views.html]

```javascript
// WHERE simples
dbGet("contratos", "estagio=eq.NOVO&order=data_criacao.asc")

// WHERE com multiplos filtros
dbGet("fila_cobranca", "status_fila=eq.AGUARDANDO&equipe_id=eq.xxx&order=score_prioridade.desc&limit=1")

// SELECT com campos especificos
dbGet("contratos", "select=id,valor_original,data_criacao&estagio=eq.ANDAMENTO")

// PATCH com filtro composto (para lock otimista) - usar sb() direto
sb("fila_cobranca", "PATCH", 
  { status_fila: "EM_ATENDIMENTO", operador_id: opId, data_acionamento: new Date().toISOString() },
  "?id=eq.XXX&status_fila=eq.AGUARDANDO"
)
// Se outro operador ja pegou (status mudou), retorna array vazio [] - nenhuma linha afetada

// NOT IN via PostgREST - usar "not.in"
dbGet("contratos", "id=not.in.(uuid1,uuid2,uuid3)&estagio=eq.ANDAMENTO")

// COUNT - Header Range
// PostgREST retorna count via headers, nao no body. Para contar, usar select com head:
sb("parcelas", "HEAD", null, "?contrato_id=eq.XXX&status=eq.ATRASADA&select=id")
// Alternativa simples: buscar e contar no JS (ok para datasets pequenos)
```

## calcularFatorCorrecao - Assinatura e Uso

[VERIFIED: leitura direta de `src/mr-3/mr-cobrancas/src/utils/correcao.js`]

```javascript
// Assinatura
export function calcularFatorCorrecao(indexador, dataInicio, dataFim)

// Parametros:
//   indexador: string - "igpm" | "ipca" | "selic" | "inpc" | "nenhum"
//   dataInicio: string - formato "YYYY-MM-DD"
//   dataFim: string - formato "YYYY-MM-DD"
//
// Retorno: number - fator multiplicador (ex: 1.0523 = 5.23% de correcao)
//   Se indexador === "nenhum", retorna 1
//   Multiplica (1+taxa) para cada mes entre dataInicio e dataFim
//   Se mes nao tem taxa na tabela, usa TAXA_MEDIA do indice

// Uso para calcular valor_atualizado:
const fator = calcularFatorCorrecao("igpm", "2024-01-15", "2026-04-17");
const valor_atualizado = valor_original * fator;
// Ex: 10000 * 1.0523 = 10523.00
```

### Exports adicionais uteis de correcao.js
```javascript
export const TAXA_MEDIA = { igpm:0.0045, ipca:0.0038, selic:0.0080, inpc:0.0040, nenhum:0 };
export function calcularJurosAcumulados({ principal, dataInicio, dataFim, jurosTipo, jurosAM, regime })
// Retorna: { juros: number, meses: number }
```

## Schema Completo das 6 Tabelas

[VERIFIED: DDL exato de 260417-dea-PLAN.md, execucao confirmada em 260417-dea-SUMMARY.md]

### equipes
```sql
CREATE TABLE public.equipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### contratos
```sql
CREATE TABLE public.contratos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  devedor_id BIGINT NOT NULL REFERENCES public.devedores(id) ON DELETE CASCADE,
  credor_id BIGINT REFERENCES public.credores(id),
  numero_contrato TEXT NOT NULL,
  valor_original NUMERIC(15,2) NOT NULL,
  valor_atualizado NUMERIC(15,2),
  estagio TEXT DEFAULT 'NOVO' CHECK (estagio IN ('NOVO','ANDAMENTO','FINALIZADO','SUSPENSO')),
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- FK: devedor_id -> devedores.id (BIGINT), credor_id -> credores.id (BIGINT)
```

### parcelas
```sql
CREATE TABLE public.parcelas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  numero_parcela INTEGER NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  data_vencimento DATE NOT NULL,
  data_pagamento DATE,
  status TEXT DEFAULT 'ABERTA' CHECK (status IN ('ABERTA','PAGA','ATRASADA','ACORDO')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indice: idx_parcelas_vencimento ON (data_vencimento) WHERE data_pagamento IS NULL
```

### operadores
```sql
CREATE TABLE public.operadores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id BIGINT REFERENCES public.usuarios_sistema(id),
  equipe_id UUID REFERENCES public.equipes(id),
  ativo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### fila_cobranca
```sql
CREATE TABLE public.fila_cobranca (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  devedor_id BIGINT NOT NULL REFERENCES public.devedores(id),
  equipe_id UUID REFERENCES public.equipes(id),
  operador_id UUID REFERENCES public.operadores(id),
  prioridade TEXT DEFAULT 'MEDIA' CHECK (prioridade IN ('ALTA','MEDIA','BAIXA')),
  score_prioridade NUMERIC DEFAULT 0,
  data_entrada_fila TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_acionamento TIMESTAMP WITH TIME ZONE,
  status_fila TEXT DEFAULT 'AGUARDANDO' CHECK (status_fila IN ('AGUARDANDO','EM_ATENDIMENTO','ACIONADO','REMOVIDO','RECICLADO')),
  bloqueado_ate DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Indices: idx_fila_status, idx_fila_score (DESC), idx_fila_operador
```

### eventos_andamento
```sql
CREATE TABLE public.eventos_andamento (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id UUID NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  operador_id UUID REFERENCES public.operadores(id),
  tipo_evento TEXT NOT NULL CHECK (tipo_evento IN (
    'LIGACAO','WHATSAPP','EMAIL','SMS','PROMESSA_PAGAMENTO',
    'SEM_CONTATO','ACORDO','TELEFONE_NAO_EXISTE',
    'CONTATO_COM_CLIENTE','RECADO'
  )),
  descricao TEXT,
  telefone_usado TEXT,
  data_evento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  giro_carteira_dias INTEGER DEFAULT 0,
  data_promessa DATE
);
-- Indice: idx_eventos_contrato ON (contrato_id)
```

### Tabela existente: devedores
```
- id: BIGINT (PK) -- ATENCAO: BIGINT, nao UUID
- telefones_adicionais: JSONB DEFAULT '[]' (adicionado em fase 1)
- Demais campos pre-existentes (nome, cpf_cnpj, etc.)
```

### Tipos de ID - Mapeamento Critico

| Tabela | PK tipo | Observacao |
|--------|---------|------------|
| devedores | BIGINT | Tabela legada - auto-increment |
| credores | BIGINT | Tabela legada - auto-increment |
| usuarios_sistema | BIGINT | Tabela legada - auto-increment |
| contratos | UUID | Nova tabela |
| parcelas | UUID | Nova tabela |
| equipes | UUID | Nova tabela |
| operadores | UUID | Nova tabela |
| fila_cobranca | UUID | Nova tabela |
| eventos_andamento | UUID | Nova tabela |

## Abordagem para Lock Otimista (proximoDevedor)

[CITED: https://postgrest.org/en/stable/references/api/tables_views.html#update]

O PostgREST suporta PATCH com filtros compostos na query string. O `Prefer: return=representation` (ja configurado no `sb()`) faz o PATCH retornar as linhas afetadas. Se nenhuma linha foi afetada (outro operador pegou), retorna `[]`.

```javascript
async function proximoDevedor(operadorId) {
  // 1. SELECT proximo na fila
  const fila = await dbGet("fila_cobranca",
    "select=*&status_fila=eq.AGUARDANDO&order=score_prioridade.desc&limit=1"
  );
  if (!fila.length) return { success: true, data: null, error: null }; // fila vazia

  const item = fila[0];

  // 2. PATCH com lock otimista: filtro por id E status_fila original
  const updated = await sb("fila_cobranca", "PATCH",
    {
      status_fila: "EM_ATENDIMENTO",
      operador_id: operadorId,
      data_acionamento: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    `?id=eq.${item.id}&status_fila=eq.AGUARDANDO`
  );

  // 3. Se retornou vazio, outro operador pegou - tentar de novo ou retornar null
  if (!updated.length) {
    // Recursao ou retry (1 tentativa)
    return proximoDevedor(operadorId);
  }

  return { success: true, data: updated[0], error: null };
}
```

## Abordagem para reciclarContratos (NOT IN)

PostgREST suporta o operador `not.in.()` diretamente:

```javascript
// Buscar contratos que NAO estao na fila
const naFila = await dbGet("fila_cobranca",
  "select=contrato_id&status_fila=in.(AGUARDANDO,EM_ATENDIMENTO)"
);
const idsNaFila = naFila.map(f => f.contrato_id).join(",");

// Se ha IDs na fila, excluir; senao, buscar todos
const filtroNotIn = idsNaFila ? `&id=not.in.(${idsNaFila})` : "";
const contratos = await dbGet("contratos",
  `select=*&estagio=eq.ANDAMENTO${filtroNotIn}`
);
```

## Padrao de Retorno e Erro

[VERIFIED: CONTEXT.md decisao do usuario]

```javascript
// Padrao para TODAS as 7 funcoes:
async function nomeFuncao(params) {
  try {
    // ... logica ...
    return { success: true, data: resultado, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message || String(err) };
  }
}
```

## Padrao de Import/Export

```javascript
// filaDevedor.js
import { dbGet, dbInsert, dbUpdate, dbDelete, sb } from "../config/supabase.js";
import { calcularFatorCorrecao } from "../utils/correcao.js";

// ... funcoes ...

export const filaDevedor = {
  calcularScorePrioridade,
  entrarNaFila,
  proximoDevedor,
  registrarEvento,
  reciclarContratos,
  removerDaFila,
  atualizarValoresAtrasados,
};
```

## Common Pitfalls

### Pitfall 1: dbUpdate so filtra por id
**What goes wrong:** Tentar usar `dbUpdate("fila_cobranca", itemId, body)` para lock otimista nao funciona - ele filtra apenas `?id=eq.{id}`, sem o filtro adicional `&status_fila=eq.AGUARDANDO`.
**How to avoid:** Usar `sb()` diretamente com query string completa para qualquer PATCH que precise de filtros compostos.

### Pitfall 2: Tipo de ID diferente entre tabelas legadas e novas
**What goes wrong:** `devedores.id` e BIGINT, `contratos.id` e UUID. Misturar tipos nos filtros PostgREST causa erro silencioso.
**How to avoid:** Sempre verificar o tipo ao montar query strings. devedor_id e numerico, contrato_id e UUID string.

### Pitfall 3: calcularFatorCorrecao precisa de datas formato string "YYYY-MM-DD"
**What goes wrong:** Passar objeto Date ou timestamp ISO causa parsing incorreto.
**How to avoid:** Sempre converter para string "YYYY-MM-DD" antes de chamar. Usar `new Date().toISOString().slice(0, 10)` para data atual.

### Pitfall 4: PostgREST retorna array vazio vs erro
**What goes wrong:** Um PATCH que nao afeta nenhuma linha retorna `[]` (com status 200), nao um erro. Sem verificar `.length`, o codigo assume sucesso.
**How to avoid:** Sempre verificar se o array retornado tem elementos apos PATCH/DELETE com filtros.

### Pitfall 5: CHECK constraints nos campos enum
**What goes wrong:** Inserir valor fora do CHECK causa erro 400 do PostgREST.
**How to avoid:** Validar valores antes de inserir. Enums permitidos:
- `estagio`: NOVO, ANDAMENTO, FINALIZADO, SUSPENSO
- `status` (parcelas): ABERTA, PAGA, ATRASADA, ACORDO
- `prioridade`: ALTA, MEDIA, BAIXA
- `status_fila`: AGUARDANDO, EM_ATENDIMENTO, ACIONADO, REMOVIDO, RECICLADO
- `tipo_evento`: LIGACAO, WHATSAPP, EMAIL, SMS, PROMESSA_PAGAMENTO, SEM_CONTATO, ACORDO, TELEFONE_NAO_EXISTE, CONTATO_COM_CLIENTE, RECADO

### Pitfall 6: bloqueado_ate no proximoDevedor
**What goes wrong:** Pegar um devedor que esta bloqueado temporariamente (ex: promessa de pagamento, aguardando prazo).
**How to avoid:** Adicionar filtro `bloqueado_ate=is.null` ou `bloqueado_ate=lt.{hoje}` no SELECT do proximoDevedor.

## Score de Prioridade - Logica Recomendada

[ASSUMED]

Para `calcularScorePrioridade(contratoId)`, recomendacao de formula baseada em:

```javascript
// Fatores sugeridos:
// 1. Valor do contrato (maior valor = maior score)
// 2. Dias de atraso das parcelas (mais atrasado = maior score)
// 3. Quantidade de parcelas atrasadas

const score = (valorOriginal / 1000) + (diasAtraso * 2) + (qtdParcelasAtrasadas * 10);
// Normalizar entre 0-100 se desejado

// Atualizar na fila:
// sb("fila_cobranca", "PATCH", { score_prioridade: score }, `?contrato_id=eq.${contratoId}`)
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Formula do score de prioridade (valor + atraso + qtd parcelas) | Score de Prioridade | Baixo - logica de negocio pode ser ajustada depois |
| A2 | IGPM como indice padrao para atualizarValoresAtrasados | User Constraints (Claude's Discretion) | Baixo - facilmente configuravel |

## Sources

### Primary (HIGH confidence)
- `src/mr-3/mr-cobrancas/src/config/supabase.js` - API completa do client verificada
- `src/mr-3/mr-cobrancas/src/utils/correcao.js` - assinatura e logica de calcularFatorCorrecao verificada
- `260417-dea-PLAN.md` - DDL exato das 6 tabelas
- `260417-dea-SUMMARY.md` - confirmacao de execucao das tabelas

### Secondary (MEDIUM confidence)
- PostgREST docs - operadores de filtro (eq, in, not.in, is.null, lt, etc.)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - client Supabase e correcao.js verificados diretamente
- Architecture: HIGH - DDL e schema confirmados pela task anterior
- Pitfalls: HIGH - derivados da analise direta do codigo
- Score formula: LOW - assumido, precisa validacao do usuario

**Research date:** 2026-04-17
**Valid until:** 2026-05-17
