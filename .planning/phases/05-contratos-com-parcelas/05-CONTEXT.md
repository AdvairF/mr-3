# Phase 5: Contratos com Parcelas — Context (Redesenho v1.2)

**Gathered:** 2026-04-21 (reescrito após pausa UAT)
**Status:** Ready for planning

<domain>
## Phase Boundary

Redesenhar o módulo de Contratos com modelo **3 níveis** real do advogado:

```
Contrato  (nível 1 — guarda-chuva da relação comercial)
  └── Documento  (nível 2 — NF, boleto, doc de Compra e Venda, etc.)
        └── Parcela  (nível 3 — row real em dividas, com vencimento individual)
```

**O que ENTRA nesta fase:**
- Migration DB: nova tabela `documentos_contrato` (nível 2) + ajuste `contratos_dividas` (DROP tipo, adicionar campos desnormalizados) + `dividas.documento_id` FK
- Service `contratos.js` refatorado: criar contrato, adicionar documento, gerar parcelas, recalcular campos desnormalizados (sem SQL trigger)
- `NovoContrato.jsx` recriado — form de contrato apenas (credor, devedor, referência, encargos padrão)
- `DetalheContrato.jsx` recriado — header do contrato + botão "Adicionar Documento" + lista de documentos com parcelas
- `AdicionarDocumento.jsx` novo — form: tipo, número do doc, valor, data emissão, nº parcelas, encargos herdados/editáveis
- `ModuloContratos.jsx` e `TabelaContratos.jsx` recriados para o novo modelo 3 níveis
- Breadcrumb duplo em `DetalheDivida`: "← Ver documento" + "← Ver contrato" quando parcela pertence a um documento
- `DiretrizesContrato.jsx` (já existe, extraído na Fase 5 anterior) — reutilizado sem alteração como componente de encargos nos forms

**O que NÃO entra nesta fase:**
- Edição de Documento após criação — v1.3
- Exclusão de Contrato — v1.3
- Edição do header do Contrato após criação — v1.3
- Geração de parcelas com tabela Price/SAC — v1.3
- Alterar tabela legada `contratos` ou `parcelas` usadas pela FilaDevedor

</domain>

<decisions>
## Implementation Decisions

### D-01 — Nomenclatura dos 3 níveis (LOCKED)

| Nível | Nome na UI | Entidade de banco |
|-------|-----------|-------------------|
| 1 | **Contrato** | `contratos_dividas` (existente, ajustada) |
| 2 | **Documento** | `documentos_contrato` (nova) |
| 3 | **Parcela** | `dividas` (existente) |

### D-02 — Modelo de banco: 3 tabelas distintas (LOCKED)

```sql
-- NÍVEL 1: contratos_dividas (existente — ajustar)
-- Remover: DROP COLUMN tipo (tipo vai para documentos_contrato)
-- Adicionar campos desnormalizados:
ALTER TABLE public.contratos_dividas
  DROP COLUMN tipo,
  ADD COLUMN num_documentos INT NOT NULL DEFAULT 0,
  ADD COLUMN num_parcelas_total INT NOT NULL DEFAULT 0;
-- valor_total já existe: manter como desnormalizado (soma dos documentos)

-- NÍVEL 2: documentos_contrato (NOVA)
CREATE TABLE public.documentos_contrato (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id UUID NOT NULL REFERENCES public.contratos_dividas(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('NF/Duplicata', 'Compra e Venda', 'Empréstimo')),
  numero_doc TEXT,                  -- ex: "NF 001", "NF 2024/123"
  valor NUMERIC(15,2) NOT NULL,
  data_emissao DATE NOT NULL,
  num_parcelas INT NOT NULL CHECK (num_parcelas >= 1),
  primeira_parcela_na_data_base BOOLEAN NOT NULL DEFAULT TRUE,
  -- Encargos próprios do documento (valores finais usados no cálculo):
  indice_correcao TEXT,             -- 'IGPM'|'IPCA'|'SELIC'|'INPC'|'Art.406'|'Art.523'
  juros_mensais NUMERIC(5,4),       -- ex: 0.01 = 1% a.m.
  multa NUMERIC(5,4),               -- ex: 0.02 = 2%
  honorarios NUMERIC(5,4),          -- ex: 0.10 = 10%
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.documentos_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.documentos_contrato
  FOR ALL USING (true) WITH CHECK (true);

-- NÍVEL 3: dividas (existente — adicionar FK)
ALTER TABLE public.dividas
  ADD COLUMN documento_id UUID REFERENCES public.documentos_contrato(id);
-- dividas.contrato_id (já existe) — manter para lookup direto sem JOIN extra
```

### D-03 — Tipo por Documento, não por Contrato (LOCKED)

Cada Documento tem seu próprio tipo (`NF/Duplicata`, `Compra e Venda`, `Empréstimo`). Um mesmo Contrato pode ter Documentos de tipos diferentes. O Contrato não tem mais campo `tipo`.

### D-04 — Campos desnormalizados no Contrato via service layer (LOCKED)

`contratos_dividas` mantém campos calculados atualizados pelo service JS (sem SQL trigger — padrão da Fase 4 com `saldo_quitado`):

| Campo | Cálculo | Quando atualizar |
|-------|---------|-----------------|
| `valor_total` | `SUM(documentos_contrato.valor)` | criar/excluir Documento |
| `num_documentos` | `COUNT(documentos_contrato)` | criar/excluir Documento |
| `num_parcelas_total` | `SUM(documentos_contrato.num_parcelas)` | criar/excluir Documento |

Função service: `recalcularTotaisContrato(contrato_id)` — lê documentos, recalcula, faz UPDATE em `contratos_dividas`.

### D-05 — Encargos: template no Contrato, sobrescritível por Documento (LOCKED)

- `contratos_dividas` persiste encargos padrão (`indice_correcao`, `juros_mensais`, `multa`, `honorarios`) — são o **template** inicial.
- `documentos_contrato` persiste os mesmos campos de encargos — são os **valores finais** usados no cálculo das parcelas.
- Ao criar um Documento, encargos vêm pré-preenchidos do Contrato mas são editáveis por documento.
- Se documento tem encargos **diferentes** do contrato: exibir badge "Custom" (ou ícone ✏️) no `DetalheContrato` ao lado daquele documento.
- `DiretrizesContrato.jsx` (já existe) é reutilizado como componente de encargos em ambos os forms.

### D-06 — Fluxo de criação: Contrato primeiro, Documentos depois (LOCKED)

1. Advogado clica "Novo Contrato" → preenche form: credor, devedor, referência, encargos padrão → salva
2. Sistema abre `DetalheContrato` do novo contrato (lista de documentos vazia)
3. Advogado clica "+ Adicionar Documento" → form `AdicionarDocumento`: tipo, número do doc, valor, data emissão, nº parcelas, encargos (herdados do contrato, editáveis)
4. Ao salvar Documento, sistema gera as N parcelas (`dividas`) automaticamente + recalcula totais no Contrato

### D-07 — Geração de parcelas (LOCKED, herança Fase 5 v1.1)

Mesma lógica do modelo anterior:
- `primeira_parcela_na_data_base = TRUE`: parcela 1 vence em `data_emissao`, parcela N em `data_emissao + (N-1) meses`
- `primeira_parcela_na_data_base = FALSE`: parcela 1 vence em `data_emissao + 1 mês`
- Valor: `floor(valor / num_parcelas)` para parcelas 1..N-1; parcela N absorve centavos restantes
- Descrição auto-gerada: `"{numero_doc} — Parcela {n}/{total}"` se `numero_doc` preenchido; `"{tipo} — Parcela {n}/{total}"` se não

### D-08 — Navegação e breadcrumb (LOCKED)

- Parcelas aparecem em `TabelaDividas` (ModuloDividas global) com badge `[NF]`/`[C&V]`/`[Empr.]` — herança do que já existe, manter
- Clicar em parcela → abre `DetalheDivida` existente (sem mudança no componente, exceto breadcrumb)
- `DetalheDivida` com `documento_id` preenchido: exibe breadcrumb duplo:
  - `← Ver documento` → abre `DetalheDocumento` dentro de `ModuloContratos`
  - `← Ver contrato` → abre `DetalheContrato` dentro de `ModuloContratos`

### D-09 — Componentes v1.1: descartar e recriar do zero (LOCKED)

`ModuloContratos.jsx`, `NovoContrato.jsx`, `TabelaContratos.jsx`, `DetalheContrato.jsx` foram commitados para o modelo 2 níveis incorreto. Todos serão **descartados via `git checkout`** e recriados do zero para o modelo 3 níveis. Evita ambiguidades sobre o que é legado do modelo errado.

**Manter sem alteração:**
- `DiretrizesContrato.jsx` — componente de encargos, reutilizável como está
- `DividaForm.jsx` (refatorado na Fase 5 v1.1) — melhoria independente, manter
- Badge `[NF]`/`[C&V]`/`[Empr.]` em `TabelaDividas` — independente do modelo de contrato, manter

### Claude's Discretion

- Layout exato de `DetalheContrato` (cards vs tabela para lista de documentos)
- Visual do badge "Custom" nos documentos com encargos diferentes
- Ordenação de documentos dentro do DetalheContrato (por data de emissão ou criação)
- Loading/error state em `DetalheContrato` ao carregar documentos
- Paginação ou scroll em `TabelaContratos` na lista global
- Exibir ou não `DetalheDocumento` como view separada vs inline em `DetalheContrato`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Motor de cálculo e pagamentos (herança Phase 4)
- `src/mr-3/mr-cobrancas/src/utils/devedorCalc.js` — Art.354 CC: `calcularSaldosPorDivida`. Parcelas são `divida_id` independentes — reutilizar sem alteração.
- `src/mr-3/mr-cobrancas/src/services/pagamentos.js` — CRUD `pagamentos_divida`; parcelas de contratos o herdam automaticamente.

### Tabelas e services a NÃO alterar
- `src/mr-3/mr-cobrancas/src/services/filaDevedor.js` — usa tabela `contratos` (legada) com `estagio`, `valor_original`. Não confundir com `contratos_dividas`. Não alterar.

### Componentes reutilizáveis desta fase
- `src/mr-3/mr-cobrancas/src/components/DiretrizesContrato.jsx` — componente de encargos extraído na Fase 5 v1.1. Usar como-is em NovoContrato e AdicionarDocumento.
- `src/mr-3/mr-cobrancas/src/components/AtrasoCell.jsx` — padrão de badges (replicar para badge tipo e badge "Custom")
- `src/mr-3/mr-cobrancas/src/components/DetalheDivida.jsx` — adicionar breadcrumb duplo quando `documento_id` preenchido
- `src/mr-3/mr-cobrancas/src/components/ModuloDividas.jsx` — estrutura de state machine a espelhar em `ModuloContratos`

### Pattern de desnormalização (referência de implementação)
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — função `atualizarSaldoQuitado` como referência para o pattern `recalcularTotaisContrato` (service layer, sem trigger SQL)

### Requisitos
- `.planning/REQUIREMENTS.md` — CON-01 a CON-05 (modelo 2 níveis antigo — downstream deve tratar como referência de intenção, não de implementação. O CONTEXT.md é a fonte de verdade do redesenho.)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DiretrizesContrato.jsx` — pronto para uso como bloco de encargos em forms
- `DividaForm.jsx` refatorado — manter, independente do modelo de contrato
- `devedorCalc.js:calcularSaldosPorDivida` — motor Art.354 por `divida_id`; parcelas são dívidas normais, zero adaptação
- `pagamentos.js` + `PagamentosDivida.jsx` — mecanismo de pagamentos completo; parcelas herdam sem alteração
- `AtrasoCell.jsx` — sistema de badges por status; base visual para badges de tipo e "Custom"
- `dbGet/dbInsert/dbUpdate/dbDelete` — utilitários globais, usar em `contratos.js`

### Established Patterns
- State machine sem router: `ModuloDividas` — lista → detalhe via `setViewAtual` / `setSelecionado`
- Carregamento lazy ao montar: `useEffect(() => dbGet(...).then(set...), [id])`
- `window.confirm()` para ações destrutivas
- Toast: `toast.success()` / `toast.error()` via `react-hot-toast`
- Desnormalização via service JS (sem trigger): `atualizarSaldoQuitado` em `dividas.js` (Fase 4)
- Extração incremental do `App.jsx` — `ModuloContratos.jsx` como componente extraído

### Integration Points
- `App.jsx` — entrada de sidebar "Contratos" já existe (da Fase 5 v1.1), ajustar para novo componente recriado
- `TabelaDividas.jsx` — `divida.contrato_id` já exibe badge de tipo; adicionar leitura de `divida.documento_id` para breadcrumb
- `dividas.js` — adicionar `documento_id` ao schema de leitura/escrita
- Supabase: migration para `documentos_contrato` + ALTER `contratos_dividas` + ALTER `dividas`

### Known Constraints
- Tabela legada `contratos` (FilaDevedor) — existe e não pode ser alterada. Nova tabela `documentos_contrato` não conflita.
- Tabela `parcelas` legada (`contrato_id → contratos`) — existe; parcelas Fase 5 são rows em `dividas`, não nessa tabela.
- `contratos_dividas` já tem RLS — nova tabela `documentos_contrato` precisa de RLS idêntico: `USING(true) WITH CHECK(true)` (padrão do projeto, não `auth.role()='authenticated'`).
- Sem TypeScript. Styling: inline `style={{}}` com hex values. Sem Tailwind, sem CSS modules.

</code_context>

<specifics>
## Specific Ideas

- Badge "Custom" (ou ✏️) no DetalheContrato ao lado de documentos com encargos diferentes do contrato pai
- Campos desnormalizados no Contrato: `valor_total`, `num_documentos`, `num_parcelas_total` — atualizados via `recalcularTotaisContrato(contrato_id)` no service JS
- Breadcrumb duplo em `DetalheDivida`: "← Ver documento" e "← Ver contrato" — só exibido quando `divida.documento_id` não é null
- Encargos do Documento vêm pré-preenchidos do Contrato ao abrir o form `AdicionarDocumento` (UX: menos digitação no caso comum)
- `numero_doc` no Documento é opcional — quando vazio, usa `{tipo} — Parcela {n}/{total}` na descrição gerada

</specifics>

<deferred>
## Deferred Ideas

- Edição de Documento após criação — v1.3
- Exclusão de Contrato (com cascade de documentos e parcelas) — v1.3
- Edição do header do Contrato após criação — v1.3
- Tabela Price/SAC para parcelas com juros embutidos — v1.3
- Auto-update de status do Contrato quando todos os documentos quitados — v1.3
- Filtro na TabelaContratos por tipo/devedor/credor/status — v1.3
- Exportar contrato como PDF — v2

</deferred>

---

*Phase: 05-contratos-com-parcelas*
*Context gathered: 2026-04-21 (redesenho v1.2 — modelo 3 níveis)*
