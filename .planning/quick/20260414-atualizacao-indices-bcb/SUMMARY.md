---
quick_id: 260414-t2d
slug: atualizacao-indices-bcb
date: 2026-04-14
status: complete
commit: 930697d
---

# Resumo: Atualização Automática de Índices BCB

## O que foi implementado

### 1. `src/utils/bcbApi.js` (novo)
Utilitário completo para consumir a API pública do Banco Central do Brasil (SGS):
- Séries: INPC (188), IGP-M (189), SELIC acumulada mensal (4390)
- `buscarIndicesBCB(anos=10)` — busca paralela das 3 séries com `Promise.all`
- Normaliza datas `DD/MM/YYYY → YYYY-MM` e valores `% → decimal`
- `salvarCacheIndices(dados)` / `carregarCacheIndices()` — cache localStorage com TTL de 24h
- `obterInfoCache()` — retorna metadados do cache (timestamp, expiração)
- Não requer chave de API

### 2. `src/utils/correcao.js` (modificado)
Adicionado suporte a override dinâmico sem quebrar compatibilidade:
- `let _overrides = {}` — variável mutable no módulo
- `setIndicesOverride(data)` — atualiza o override globalmente
- `getIndicesMerged()` — mescla tabela estática com override da API (override tem prioridade)
- `calcularFatorCorrecao` e `obterTaxaJurosMes` agora usam `getIndicesMerged()` automaticamente

### 3. `src/App.jsx` — componente `Calculadora` (modificado)
- Imports adicionados: `setIndicesOverride`, `buscarIndicesBCB`, `salvarCacheIndices`, `carregarCacheIndices`, `obterInfoCache`
- State: `atualizandoIndices`, `statusIndices`
- `useEffect` no mount: carrega cache do localStorage e aplica override
- `handleAtualizarIndices`: busca API → salva cache → aplica override → atualiza status
- Botão "Atualizar Índices BCB" no header da calculadora com spinner animado
- Feedback de sucesso (verde) ou erro (vermelho) com timestamp

## Verificação
- [x] Arquivo `bcbApi.js` criado com fetch e cache
- [x] `correcao.js` exporta `setIndicesOverride` e usa `getIndicesMerged()`
- [x] Calculadora tem botão com loading state
- [x] Cache carregado automaticamente no mount
- [x] `calcularFatorCorrecao` e `obterTaxaJurosMes` usam dados atualizados
- [x] Commit realizado: 930697d
