---
quick_id: 260414-t2d
slug: atualizacao-indices-bcb
date: 2026-04-14
description: Atualização automática dos índices INPC, IGP-M e SELIC via API pública do BCB (SGS)
status: in-progress
---

# Quick Task: Atualização Automática de Índices via BCB SGS

## Objetivo
Criar funcionalidade na calculadora para buscar e atualizar automaticamente os índices INPC, IGP-M e SELIC dos últimos 10 anos consumindo a API pública gratuita do Banco Central do Brasil (SGS).

## Decisões de Arquitetura
- **API**: BCB SGS pública — sem necessidade de API key
  - INPC: série 188
  - IGP-M: série 189
  - SELIC acumulada mensal: série 4390
- **Cache**: localStorage com TTL de 24 horas para evitar requisições desnecessárias
- **Override**: Variável mutable no módulo `correcao.js` — mescla dados estáticos com dados da API
- **Escopo**: Afeta toda a aplicação (calcularFatorCorrecao + obterTaxaJurosMes) pois usa módulo-level state

## Tarefas

### T1: Criar src/utils/bcbApi.js
- Funções: `buscarIndicesBCB(anos)`, `salvarCacheIndices(dados)`, `carregarCacheIndices()`
- Busca paralela das 3 séries com Promise.all
- Normaliza datas DD/MM/YYYY → YYYY-MM e valores % → decimal

### T2: Modificar src/utils/correcao.js
- Adicionar `let _overrides = {}` (mutable)
- Adicionar `setIndicesOverride(data)` e `getIndicesMerged()` exports
- Modificar `calcularFatorCorrecao` e `obterTaxaJurosMes` para usar índices mesclados

### T3: Modificar Calculadora no App.jsx
- Carregar cache no mount (`useEffect`)
- Botão "Atualizar Índices BCB" com estado de loading
- Feedback de status (última atualização, erro, sucesso)
- Chamar `setIndicesOverride` após fetch bem-sucedido

## Critérios de Verificação
- [ ] Botão "Atualizar Índices BCB" visível na Calculadora
- [ ] Ao clicar, faz fetch das 3 séries em paralelo
- [ ] Dados mesclados com tabela estática (fallback para meses sem dado)
- [ ] Cache salvo no localStorage com TTL 24h
- [ ] Índices carregados do cache no reload da página
- [ ] `calcularFatorCorrecao` e `obterTaxaJurosMes` usam dados atualizados
