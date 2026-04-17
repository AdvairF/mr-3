---
name: Quick Task 260417-dne — Fase 2 Fila de Devedor — Backend / Lógica de Negócio
description: Implementar filaDevedor.js com 7 funções de negócio + script de teste real contra Supabase
type: project
---

# Quick Task 260417-dne — Backend Fila de Devedor

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Task Boundary

Criar `src/mr-3/mr-cobrancas/src/services/filaDevedor.js` com as 7 funções de negócio
do módulo Fila de Devedor, mais um script de teste real contra o Supabase.

NÃO criar UI — apenas lógica de serviço.

</domain>

<decisions>
## Implementation Decisions

### Localização do arquivo
- **`src/mr-3/mr-cobrancas/src/services/filaDevedor.js`** — junto ao código canônico (components/, utils/, config/)
- Criar diretório `services/` se não existir

### Testes básicos
- Script de teste REAL contra o Supabase: `src/mr-3/mr-cobrancas/src/services/filaDevedor.test.js`
- Executa via Management API (mesma abordagem das tasks de DDL anteriores)
- Testa fluxo: criar contrato → criar parcelas → entrarNaFila → proximoDevedor → registrarEvento PROMESSA_PAGAMENTO
- Limpar dados de teste ao final (DELETE)

### atualizarValoresAtrasados
- Usar `calcularFatorCorrecao()` importado de `../utils/correcao.js`
- A função já recebe (indice, dataInicio, dataFim) e retorna fator multiplicador
- Aplicar sobre valor_original de cada contrato ativo

### Linguagem
- JavaScript puro (sem TypeScript — projeto usa .js/.jsx)

### Supabase client
- Importar de `../config/supabase.js` — funções `dbGet`, `dbInsert`, `dbUpdate`, `dbDelete` já disponíveis

### Padrão de retorno
- Todas as funções retornam `{ success: boolean, data: any, error: string|null }`
- try/catch em todas as funções

### Claude's Discretion
- Estrutura interna de cada função (nomes de variáveis, etc.)
- Índice de correção padrão para atualizarValoresAtrasados (IGPM como default)

</decisions>

<specifics>
## Specific Ideas

Funções a implementar (especificadas pelo usuário):
1. calcularScorePrioridade(contratoId)
2. entrarNaFila()
3. proximoDevedor(operadorId)
4. registrarEvento(contratoId, operadorId, dadosEvento)
5. reciclarContratos(filtros, equipeId)
6. removerDaFila(filaId, motivo, usuarioId)
7. atualizarValoresAtrasados()

Export: `export const filaDevedor = { ... }`

</specifics>

<canonical_refs>
## Canonical References

- `src/mr-3/mr-cobrancas/src/config/supabase.js` — client Supabase (dbGet, dbInsert, dbUpdate, dbDelete, sb)
- `src/mr-3/mr-cobrancas/src/utils/correcao.js` — calcularFatorCorrecao(indice, dataInicio, dataFim)
- `.planning/quick/260417-dea-*/260417-dea-SUMMARY.md` — schema das tabelas criadas (contratos, parcelas, fila_cobranca, etc.)

</canonical_refs>
