# Phase 6: Edição de Contrato + Histórico - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Advogado edita um contrato existente — header (credor, devedor, referência) e encargos padrão — com cascade automático de credor/devedor para todos os documentos e parcelas do contrato (incluindo parcelas quitadas). O sistema registra um histórico cronológico de todas as alterações em nova tabela `contratos_historico` e exibe uma seção colapsável no DetalheContrato.

**O que ENTRA nesta fase:**
- Tabela `contratos_historico` (DB migration): tipo_evento CHECK ('criacao'|'edicao'), contrato_id FK, usuario_id (auth.uid()), snapshot_campos JSONB, created_at
- Service `contratos.js`: funções `editarContrato`, `cascatearCredorDevedor`, `registrarEvento`
- Form de edição inline no DetalheContrato (botão "Editar Contrato" → modo edição do header card)
- Seção "Histórico" colapsável no DetalheContrato: timeline vertical com pares antes→depois
- HIS-01: evento `criacao` inserido automaticamente ao criar novo contrato (em `criarContrato` do service)

**O que NÃO entra:**
- Edição de Documento após criação — escopo de milestone futuro
- Exclusão de Contrato — escopo de milestone futuro
- Cascade de encargos para parcelas existentes — EDT-04 explicitamente proibido
- Retroagir histórico para contratos pré-v1.3 — sem seed sintético

</domain>

<decisions>
## Implementation Decisions

### D-01 — Modo de ativação do form de edição
Botão **"Editar Contrato"** no header card do DetalheContrato. Ao clicar, o header card inteiro muda para modo edição: os campos (credor, devedor, referência, encargos) viram inputs. Os botões "Salvar" e "Cancelar" substituem o botão "Editar Contrato". Ao salvar ou cancelar, o header volta para modo leitura.

### D-02 — Form unificado: header + encargos no mesmo modo edição
Credor, devedor, referência e encargos padrão ficam em um único form unificado dentro do header card em modo edição. Um único botão "Salvar" grava tudo de uma vez. `DiretrizesContrato.jsx` (já existe) é reutilizado como sub-componente de encargos dentro deste form.

### D-03 — Histórico: timeline vertical com linha e ícones
Seção "Histórico" colapsável no DetalheContrato usa layout de **timeline vertical**: linha vertical à esquerda, ponto/ícone por evento (◆ criação, ✏️ edição), data + descrição dos campos alterados ao lado. Padrão visual similar ao GitHub/Linear.

### D-04 — Exibição de campos alterados: par antes → depois
Para eventos de edição (`tipo_evento = 'edicao'`), cada campo alterado é exibido como um par:
> `Credor: Banco A → Banco B`
> `Devedor: João Silva → João Santos`

Cada campo em uma linha separada. Somente campos que mudaram são listados (diff do snapshot_campos).

### D-05 — Contratos sem histórico: mensagem "Sem histórico disponível"
Contratos criados antes do HIS-01 ser implementado (pré-v1.3) não terão evento `criacao` em `contratos_historico`. A seção "Histórico" sempre aparece no DetalheContrato mas exibe mensagem neutra: **"Sem histórico disponível"** quando `contratos_historico` não retornar rows para aquele contrato_id. Histórico real começa da primeira edição feita pelo usuário.

### D-06 — Cascade credor/devedor: window.confirm() antes de aplicar
Quando o usuário alterar credor ou devedor, antes de salvar/cascatear, exibir `window.confirm()` com mensagem informando o número de parcelas afetadas:
> `"Alterar o devedor vai atualizar N parcelas (incluindo quitadas). Confirmar?"`

Padrão já estabelecido no projeto para ações de impacto amplo. Se o usuário cancelar o confirm, o save não ocorre.

### D-07 — Feedback durante cascade: botão loading + toast final
Durante o cascade de credor/devedor (loop de dbUpdates em `dividas` e `documentos_contrato`), o botão "Salvar" fica desabilitado com spinner (loading state). Toast `toast.success()` ao completar. Toast `toast.error()` em caso de falha. Sem progress bar de parcelas individuais.

### D-08 — Cascade escopo (EDT-03, locked)
Alterar **credor ou devedor** no contrato propaga para:
1. `documentos_contrato` — todos os documentos do contrato
2. `dividas` — todas as parcelas do contrato (incluindo `saldo_quitado = true`)

Alterar **encargos padrão** do contrato NÃO propaga para documentos ou parcelas existentes — funciona apenas como template para novos documentos (EDT-04 locked).

### D-09 — HIS-01: evento criacao registrado em criarContrato()
`contratos.js:criarContrato()` deve chamar `registrarEvento(contratoId, 'criacao', snapshot)` após INSERT bem-sucedido. Snapshot = campos iniciais do contrato (credor_id, devedor_id, referencia, encargos). Não é retroativo para contratos pré-v1.3.

### Claude's Discretion
- Layout exato do header card em modo edição (ordem dos campos, espaçamento)
- Ícone visual do evento `criacao` vs `edicao` na timeline
- Exibir ou não o `usuario_id` resolvido como nome de usuário na timeline (vs silenciar)
- Como truncar valores longos no par antes→depois (ex: referências muito longas)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Service e modelo de dados de contratos (Phase 5)
- `src/mr-3/mr-cobrancas/src/services/contratos.js` — CRUD atual: criarContrato, adicionarDocumento, recalcularTotaisContrato; Phase 6 adiciona editarContrato, cascatearCredorDevedor, registrarEvento
- `.planning/phases/05-contratos-com-parcelas/05-CONTEXT.md` — Decisions D-01..D-09: modelo 3 níveis, schema de contratos_dividas e documentos_contrato, campos de encargos

### Componente de edição reutilizável
- `src/mr-3/mr-cobrancas/src/components/DiretrizesContrato.jsx` — componente de encargos; reutilizar dentro do form de edição sem alteração

### Componente alvo da edição
- `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx` — componente onde o form de edição e a seção Histórico serão adicionados

### Padrões de desnormalização e service layer
- `src/mr-3/mr-cobrancas/src/services/dividas.js` — função `atualizarSaldoQuitado` como referência para pattern de service sem trigger SQL
- `src/mr-3/mr-cobrancas/src/services/pagamentos.js` — referência de CRUD simples com toast + reload

### RLS pattern (CRÍTICO)
- `.planning/memory/feedback_supabase_rls_pattern.md` — RLS MUST use `USING(true) WITH CHECK(true)`, NÃO `auth.role()='authenticated'`

### Requisitos
- `.planning/REQUIREMENTS.md` — EDT-01..04, HIS-01..04 (v1.3 requirements)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DiretrizesContrato.jsx` — componente de encargos completo; reutilizar no form de edição sem modificação
- `dbUpdate(TABLE, id, payload)` — helper Supabase existente; base para editarContrato e cascade
- `dbGet`, `dbInsert` — helpers para listarHistorico e registrarEvento
- `window.confirm()` — já usado para confirmações destrutivas em todo o app (excluir pagamentos, etc.)
- `toast.success()` / `toast.error()` via react-hot-toast — padrão de feedback já em uso

### Established Patterns
- State machine: `adicionandoDocumento` boolean toggle no DetalheContrato — replicar como `editando` para o modo edição
- `useEffect(() => dbGet(...).then(set...), [contrato.id])` — padrão de load lazy ao montar
- Service JS sem trigger SQL: `recalcularTotaisContrato` como referência de update desnormalizado
- Inline CSS com hex values, sem Tailwind ou CSS modules

### Integration Points
- `DetalheContrato.jsx` — adicionar: botão "Editar Contrato", state `editando`, form unificado, seção Histórico colapsável
- `contratos.js` — adicionar: `editarContrato`, `cascatearCredorDevedor`, `registrarEvento`, `listarHistorico`; modificar `criarContrato` para HIS-01
- `App.jsx` — provavelmente nenhuma alteração (DetalheContrato já recebe `devedores`, `credores` como props)
- Supabase: nova migration para tabela `contratos_historico`

### Known Constraints
- Sem TypeScript; styling: `style={{}}` com hex values
- RLS: `USING(true) WITH CHECK(true)` — NÃO usar `auth.role()='authenticated'`
- `auth.uid()` disponível via Supabase RLS para `usuario_id` no INSERT do histórico (verificar se o service tem acesso ao uid ou precisa receber como parâmetro)

</code_context>

<specifics>
## Specific Ideas

- Mensagem do confirm cascade: `"Alterar o devedor vai atualizar N parcelas (incluindo quitadas). Confirmar?"` — com contagem real de parcelas
- Seção "Histórico" colapsável similar ao padrão de `expandedDoc` já em uso no DetalheContrato (boolean state)
- Par antes→depois: ex: `Credor: Banco A → Banco B` por linha no event body da timeline
- `tipo_evento` em `contratos_historico` com CHECK constraint: `CHECK (tipo_evento IN ('criacao', 'edicao'))`

</specifics>

<deferred>
## Deferred Ideas

- Edição de Documento após criação — milestone futuro
- Exclusão de Contrato (com cascade de documentos e parcelas) — milestone futuro
- Geração de parcelas com tabela Price/SAC — milestone futuro
- Mostrar nome do usuário na timeline de histórico (resolve usuario_id para nome via usuarios_sistema) — Claude pode decidir silenciar ou usar UUID simplificado por ora
- Filtro de histórico por tipo_evento — v1.4+
- Export do histórico como PDF — v2

</deferred>

---

*Phase: 06-edicao-de-contrato-historico*
*Context gathered: 2026-04-22*
