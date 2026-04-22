# Phase 5: Contratos com Parcelas — Discussion Log (Redesenho v1.2)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 05-contratos-com-parcelas
**Areas discussed:** Nomenclatura dos 3 níveis, Modelo de banco, Encargos por NF ou por contrato, Escopo UI desta fase

---

## Contexto da sessão

O CONTEXT.md anterior foi descartado. Foi escrito para o modelo 2 níveis (contratos → parcelas) que o UAT revelou ser incorreto. Este log registra o redesenho completo para o modelo 3 níveis real do advogado.

---

## Nomenclatura dos 3 Níveis

| Opção | Nível 1 | Selecionada |
|-------|---------|------------|
| Contrato | Guarda-chuva da relação comercial | ✓ |
| Processo de cobrança | Mais jurídico, pode confundir com processo judicial | |
| Dívida agregada | Técnico, pouco natural | |

| Opção | Nível 2 | Selecionada |
|-------|---------|------------|
| Nota Fiscal / NF | Nome real do documento | |
| Documento | Genérico, cobre NF e outros tipos | ✓ |
| Fatura | Menos preciso no contexto jurídico | |

| Opção | Nível 3 | Selecionada |
|-------|---------|------------|
| Duplicata | Termo jurídico correto | |
| Parcela | Mais familiar para usuários | ✓ |
| Vencimento | Foca na data, perde sentido de título de crédito | |

**Resultado:** Contrato → Documento → Parcela

---

## Modelo de Banco

| Opção | Descrição | Selecionada |
|-------|-----------|------------|
| 3 tabelas distintas | contratos_dividas + documentos_contrato (nova) + dividas | ✓ |
| Self-referential em dividas | parent_divida_id FK, NF como divida-pai | |
| Reutilizar contratos_dividas como NF | Mais migração e risco | |

**Tipo por nível:**

| Opção | Descrição | Selecionada |
|-------|-----------|------------|
| Contrato (nível 1) apenas | Tipo único por contrato, herdado | |
| Documento (nível 2) por documento | Cada doc tem seu tipo | ✓ |

**Campos desnormalizados no Contrato (resposta livre do usuário):**
- `valor_total` = soma dos valores dos Documentos
- `num_documentos` = count dos Documentos
- `num_parcelas_total` = soma das parcelas de todos os Documentos
- Atualizados pelo service layer JS (sem trigger SQL) — padrão da Fase 4
- Vantagem: TabelaContratos lê direto sem SUM em runtime

**contratos_dividas.tipo:** DROP COLUMN (tipo vai para documentos_contrato)

---

## Encargos por NF ou por Contrato

**Resposta livre do usuário:**
- Encargos padrão definidos no Contrato (template)
- Ao adicionar Documento: encargos herdados do contrato, editáveis por documento
- Persistência em AMBAS as tabelas: `contratos_dividas.encargos_*` (template) e `documentos_contrato.encargos_*` (valores finais)
- Badge "Custom" no DetalheContrato quando documento tem encargos diferentes do contrato pai

---

## Escopo UI desta Fase

| Área | Opção | Selecionada |
|------|-------|------------|
| Fluxo de criação | Contrato primeiro, Documentos depois | ✓ |
| Fluxo de criação | Form único (contrato + 1ª NF juntos) | |
| Ao clicar em Parcela | DetalheDivida existente | ✓ |
| Ao clicar em Parcela | Modal/inline de parcela | |
| Breadcrumb em DetalheDivida | ← Ver documento + ← Ver contrato | ✓ |
| Breadcrumb em DetalheDivida | ← Ver contrato apenas | |

**Componentes v1.1:**

| Opção | Selecionada |
|-------|------------|
| Refatorar em cima | |
| Descartar e recriar do zero | ✓ |

**Notas:** ModuloContratos, NovoContrato, TabelaContratos e DetalheContrato serão descartados via `git checkout` e recriados para o modelo 3 níveis. DiretrizesContrato.jsx e DividaForm.jsx (melhorias independentes) são mantidos.

---

## Claude's Discretion

- Layout exato de DetalheContrato (cards vs tabela para lista de documentos)
- Visual do badge "Custom" nos documentos com encargos diferentes
- Ordenação de documentos dentro do DetalheContrato
- Loading/error state em DetalheContrato
- Paginação ou scroll em TabelaContratos
- DetalheDocumento como view separada vs inline em DetalheContrato

## Deferred Ideas

- Edição de Documento após criação — v1.3
- Exclusão de Contrato — v1.3
- Tabela Price/SAC para parcelas com juros embutidos — v1.3
- Auto-update status do Contrato quando todos os documentos quitados — v1.3
