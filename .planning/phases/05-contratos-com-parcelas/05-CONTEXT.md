# Phase 5: Contratos com Parcelas — Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Modelar contratos jurídicos (NF/Duplicata, Compra e Venda, Empréstimo) como entidade própria que gera automaticamente N parcelas como dívidas reais na tabela `dividas`. Advogado cria o contrato, visualiza a lista global de contratos e acessa o detalhe de cada contrato com saldo por parcela calculado via Art. 354 CC.

**O que ENTRA nesta fase:**
- Nova tabela `contratos_dividas` no Supabase (separada da tabela legada `contratos` usada pela FilaDevedor)
- `ADD COLUMN contrato_id UUID REFERENCES contratos_dividas(id)` em `dividas`
- Service layer `src/services/contratos.js` (criar contrato + geração automática de parcelas)
- Formulário "Novo Contrato" com tipo, credor, devedor, valor total, data base, nº parcelas, referência (opcional) e dropdown de data da 1ª parcela
- Módulo "Contratos" no sidebar (irmão de ModuloDividas) com lista global (`TabelaContratos.jsx`)
- `DetalheContrato.jsx` — header completo + tabela de parcelas com saldo individual
- Badge de tipo de contrato em `TabelaDividas` (ModuloDividas global) para parcelas
- Botão "Novo Contrato" também acessível pela ficha do devedor (pré-seleciona devedor)
- Extração do componente `ModuloContratos.jsx` (padrão de extração incremental do App.jsx)

**O que NÃO entra nesta fase:**
- Exclusão de contrato — sem botão de delete no v1.1 (v1.2+)
- Edição do header do contrato após criação — v1.2
- Geração de parcelas com juros embutidos (tabela Price, SAC) — v1.2
- Auto-update de status do contrato quando todas as parcelas quitadas — v1.2
- Alterar a tabela legada `contratos` ou `parcelas` usadas pela FilaDevedor

</domain>

<decisions>
## Implementation Decisions

### D-01 — Arquitetura DB: nova tabela `contratos_dividas` (LOCKED)

Nova tabela isolada, **não** reutiliza nem altera a tabela legada `contratos` (usada por `filaDevedor.js` com campos `estagio`, `valor_original`).

```sql
CREATE TABLE public.contratos_dividas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('NF/Duplicata', 'Compra e Venda', 'Empréstimo')),
  credor_id UUID NOT NULL,
  devedor_id BIGINT NOT NULL,
  valor_total NUMERIC(15,2) NOT NULL,
  data_inicio DATE NOT NULL,
  num_parcelas INT NOT NULL CHECK (num_parcelas >= 1),
  primeira_parcela_na_data_base BOOLEAN NOT NULL DEFAULT TRUE,
  referencia TEXT,          -- campo opcional "Descrição/Referência" do form
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contratos_dividas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.contratos_dividas
  FOR ALL USING (auth.role() = 'authenticated');
```

**FK em dividas:**

```sql
ALTER TABLE public.dividas ADD COLUMN contrato_id UUID
  REFERENCES public.contratos_dividas(id);
```

### D-02 — Tipos de contrato: 3 fixos (LOCKED)

Dropdown com exatamente 3 valores: `'NF/Duplicata'`, `'Compra e Venda'`, `'Empréstimo'`. Sem opção "Outro". Personalização textual via campo `referencia` (opcional).

### D-03 — Geração de parcelas: data de vencimento (LOCKED)

Campo `primeira_parcela_na_data_base BOOLEAN` no formulário e persistido no banco.

- `primeira_parcela_na_data_base = TRUE` (default): parcela 1 vence em `data_inicio`, parcela N vence em `data_inicio + (N-1) meses`.
- `primeira_parcela_na_data_base = FALSE`: parcela 1 vence em `data_inicio + 1 mês`, parcela N vence em `data_inicio + N meses`.

UI do dropdown no form "Novo Contrato":
- "Mesma data base (NF/Duplicata)" → `TRUE`
- "Um mês depois da data base (Compra e Venda / Empréstimo)" → `FALSE`

### D-04 — Geração de parcelas: valor (LOCKED)

`valor_parcela = floor(valor_total / num_parcelas)` para as parcelas 1 a N-1.
Parcela N = `valor_total - valor_parcela * (num_parcelas - 1)` (absorve centavos restantes).

Exemplo: R$ 1.000,00 ÷ 3 → R$ 333,33 + R$ 333,33 + **R$ 333,34**.

### D-05 — Geração de parcelas: descrição da divida (LOCKED)

Formato auto-gerado:
- Sem `referencia`: `"{tipo} — Parcela {n}/{total}"` → ex: `"NF/Duplicata — Parcela 1/3"`
- Com `referencia`: `"{referencia} — Parcela {n}/{total}"` → ex: `"NF 1234 — Parcela 1/3"`

Advogado pode editar a descrição de cada parcela individualmente em `DetalheDivida` após a criação.

### D-06 — Geração de parcelas: status e credor/devedor (LOCKED)

- `dividas.status = 'em cobrança'` (padrão das dívidas avulsas)
- `dividas.devedor_id` = `contratos_dividas.devedor_id` (principal do contrato)
- `dividas.credor_id` = `contratos_dividas.credor_id`
- `dividas.contrato_id` = UUID do contrato recém-criado
- `dividas.data_vencimento` = calculado conforme D-03
- `dividas.valor_total` = calculado conforme D-04

### D-07 — Navegação: módulo Contratos no sidebar (LOCKED)

Novo item "Contratos" no sidebar como irmão de ModuloDividas (não como aba dentro dele).

- `ModuloContratos.jsx` espelhando a estrutura de `ModuloDividas.jsx`
- Botão "Novo Contrato" no header do ModuloContratos
- Botão "Novo Contrato" também disponível na ficha do devedor (pré-seleciona devedor no formulário)
- `DetalheContrato.jsx` como view dentro do `ModuloContratos`, navegação sem router (state local, padrão já usado no app)

### D-08 — Indicação visual em TabelaDividas (LOCKED)

Parcelas de contratos exibem um badge com o tipo do contrato abreviado na coluna de status/credor da `TabelaDividas`:
- `[NF]`, `[C&V]`, `[Empr.]` — badge pequeno, estilo consistente com `AtrasoCell.jsx` e badge "Saldo quitado"

Clicar em uma linha de parcela na `TabelaDividas` abre `DetalheDivida` da parcela (comportamento idêntico às dívidas avulsas). Dentro de `DetalheDivida`, pode ter link "Ver contrato pai" (Claude decide a implementação).

### D-09 — DetalheContrato: layout (LOCKED)

**Header:** tipo, credor, devedor, valor_total, data_inicio, num_parcelas, referencia (se preenchida). Somente leitura no v1.1.

**Tabela de parcelas:**

```
| #  | Vencimento  | Valor      | Saldo     | Status     |
|----|-------------|------------|-----------|------------|
| 1  | 01/01/2025  | R$ 333,33  | R$     0  | ✅ Quitado |
| 2  | 01/02/2025  | R$ 333,33  | R$ 350,10 | ⚠ 60 dias  |
| 3  | 01/03/2025  | R$ 333,34  | R$ 360,22 | ⚠ 90 dias  |
```

- Saldo calculado via Art. 354 CC lendo `pagamentos_divida` por parcela (mesma lógica de `DetalheDivida`)
- Clique em qualquer linha abre `DetalheDivida` daquela parcela
- Sem ações de edição/exclusão de parcelas individuais nesta tela (advogado vai ao `DetalheDivida`)

### D-10 — Exclusão de contrato: sem botão no v1.1 (LOCKED)

Não implementar exclusão de contrato no v1.1. Funcionalidade fica para v1.2.

### Claude's Discretion

- Estrutura interna de `ModuloContratos.jsx` (props, callbacks para App.jsx)
- Visual exato do badge de tipo de contrato em `TabelaDividas` (cor, tamanho — seguir AtrasoCell)
- Link "Ver contrato pai" em `DetalheDivida` (se/como implementar)
- Loading state e tratamento de erro em `DetalheContrato`
- Ordenação da `TabelaContratos` na lista global (padrão: mais recente primeiro)
- `TabelaContratos` colunas de lista: tipo, credor, devedor, valor_total, num_parcelas, parcelas_em_atraso

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Motor de cálculo (herança Phase 4)
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — Art.354 CC: `calcularSaldosPorDivida`. Cada parcela é uma `divida_id` independente — reutilizar sem alteração.
- `src/mr-3/mr-cobrancas/src/utils/correcao.js` — funções de correção monetária

### Tabela legada a NÃO alterar
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.js` — usa tabela `contratos` (legada) com `estagio`, `valor_original`, `devedor_id`. Não confundir com `contratos_dividas` do Phase 5. Não alterar este arquivo.

### Componentes de referência para padrões de UI
- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — estrutura de módulo com lista + detalhe (espelhar para ModuloContratos)
- `src/mr-3/mr-cobrancas/src/components/TabelaDividas.jsx` — onde adicionar badge de tipo de contrato
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — ponto de integração de parcelas; já recebe `divida` com `contrato_id`
- `src/mr-3/mr-cobrancas/src/components/PagamentosDivida.jsx` — parcelas herdam o mecanismo de pagamentos (sem alteração)
- `src/mr-3/mr-cobrancas/src/components/AtrasoCell.jsx` — padrão de badges de status (replicar para badge tipo contrato)
- `src/mr-3/mr-cobrancas/src/components/NovaDivida.jsx` — padrão de formulário de criação (referência para NovoContrato)

### Service layer de referência
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — CRUD com `dbGet/dbInsert/dbUpdate/dbDelete`; adicionar coluna `contrato_id` ao schema
- `src/mr-3/mr-cobrancas/src/services/pagamentos.js` — service de pagamentos por dívida (Phase 4); parcelas usam automaticamente

### Requisitos
- `.planning/REQUIREMENTS.md` — CON-01 a CON-05 (todos mapeados para Phase 5)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `devedorCalc.js:calcularSaldosPorDivida` — motor Art.354 por `divida_id`; parcelas são dívidas → zero adaptação
- `pagamentos.js` + `PagamentosDivida.jsx` — mecanismo de pagamentos completo; parcelas o herdam sem alteração
- `ModuloDividas.jsx` — estrutura de módulo com lista/detalhe a espelhar em `ModuloContratos.jsx`
- `AtrasoCell.jsx` — sistema de badges por status; adicionar badge de tipo de contrato
- `dbGet/dbInsert/dbUpdate/dbDelete` — utilitários globais, sem import direto

### Established Patterns
- Módulo com state local (sem router): `ModuloDividas` — lista → detalhe via `setViewAtual` ou `setDividaSelecionada`
- Carregamento lazy ao montar: `useEffect(() => dbGet(...).then(set...), [id])`
- `window.confirm()` para ações destrutivas
- Toast: `toast.success()` / `toast.error()` de `react-hot-toast`
- Extração incremental do `App.jsx` — criar `ModuloContratos.jsx` como novo componente extraído

### Integration Points
- `App.jsx` — adicionar entrada de sidebar + renderizar `<ModuloContratos />` quando tab ativa
- `TabelaDividas.jsx` — ler `divida.contrato_id` para exibir badge de tipo do contrato
- `dividas.js` (service) — nova coluna `contrato_id` no schema de leitura e escrita
- Supabase: migration para `contratos_dividas` + `ALTER TABLE dividas ADD COLUMN contrato_id`

### Known Codebase Constraint
- A tabela legada `contratos` (referenciada em `filaDevedor.js`) JÁ EXISTE no Supabase e não pode ser renomeada. A nova tabela **deve** ter nome diferente → `contratos_dividas`.
- A tabela `parcelas` (legada, `contrato_id` FK para `contratos`) também existe; parcelas Phase 5 são rows em `dividas`, não nessa tabela.

</code_context>

<specifics>
## Specific Ideas

- Badge de tipo de contrato em `TabelaDividas`: abreviado (`[NF]`, `[C&V]`, `[Empr.]`) ao lado do credor ou na coluna de status — estilo visual consistente com badge "Saldo quitado"
- Descrição de parcela: `"{referencia} — Parcela {n}/{total}"` quando referencia preenchida, `"{tipo} — Parcela {n}/{total}"` quando não — exemplo: `"NF 1234 — Parcela 1/3"` ou `"NF/Duplicata — Parcela 1/3"`
- Tabela de parcelas em `DetalheContrato`: saldo calculado em tempo real (lendo `pagamentos_divida` por `divida_id`), mesma lógica que `DetalheDivida`
- Botão "Novo Contrato" na ficha do devedor deve pré-selecionar o devedor no formulário

</specifics>

<deferred>
## Deferred Ideas

- Exclusão de contrato (com ou sem cascade) — v1.2
- Edição do header do contrato após criação — v1.2
- Tabela Price / SAC para geração de parcelas com juros embutidos — v1.2
- Auto-update status do contrato quando todas as parcelas quitadas — v1.2
- Filtro de contratos na lista global por tipo/devedor/credor/status — v1.2
- Link "Ver contrato pai" em `DetalheDivida` — Claude decide no v1.1 (discretion)

</deferred>

---

*Phase: 05-contratos-com-parcelas*
*Context gathered: 2026-04-21*
