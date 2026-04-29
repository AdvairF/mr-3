# Roadmap — Mr. Cobranças

## Milestones

- ✅ **v1.0 Refatoração Estrutural** — Phases 1–3 (shipped 2026-04-20)
- ✅ **v1.1 Pagamentos** — Phase 4 only (shipped 2026-04-21)
- ✅ **v1.2 Contratos Redesenhados** — Phase 5 (redesenho 3 níveis) (shipped 2026-04-22)
- ✅ **v1.3 Edição de Contrato + Histórico** — Phase 6 (UAT verified 2026-04-22) — **ready to ship**
- 🔄 **v1.4 Pagamentos por Contrato + PDF Demonstrativo** — Phases 7–8 (in progress)

## Phases

<details>
<summary>✅ v1.0 Refatoração Estrutural (Phases 1–3) — SHIPPED 2026-04-20</summary>

- [x] Phase 1: Refatoração Pessoas × Dívidas — big bang noturno (6/6 plans) — completed 2026-04-20
- [x] Phase 2: Módulo Dívidas no Sidebar (4/4 plans) — completed 2026-04-20
- [x] Phase 3: Nova Dívida com Co-devedores (5/5 plans) — completed 2026-04-20

See full archive: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### ✅ v1.1 — Pagamentos (SHIPPED 2026-04-21)

- [x] **Phase 4: Pagamentos por Dívida** — Advogado registra, consulta e remove pagamentos diretamente na tela da dívida, com saldo recalculado via Art. 354 CC

### ✅ v1.2 — Contratos Redesenhados (SHIPPED 2026-04-22)

- [x] **Phase 5 (redesenho): Contratos com modelo 3 níveis** — Escopo corrigido após UAT: Contrato (guarda-chuva) → Documentos (NF/boleto/etc.) → Parcelas (dividas reais). Ver `.planning/phases/05-contratos-com-parcelas/05-CONTEXT.md` para decisões D-01..D-09.
- [ ] **04-06 backlog: persistir saldo_atual no banco** — PAG-10, deferred para v1.3

### ✅ v1.3 — Edição de Contrato + Histórico (UAT verified 2026-04-22 — ready to ship)

- [x] **Phase 6: Edição de Contrato + Histórico** — Advogado edita credor/devedor/referência/encargos com cascade automático e visualiza histórico cronológico de eventos do contrato

### 🔄 v1.4 — Pagamentos por Contrato + PDF Demonstrativo

- [ ] **Phase 7: Pagamentos por Contrato** — Advogado registra pagamentos no nível do contrato com amortização automática por parcela mais antiga (Art. 354 CC), vê seção colapsável de pagamentos recebidos e pode editar ou excluir pagamentos com reversão completa
- [ ] **Phase 7.1: Fix Histórico Pagamentos** — Gap closure: corrigir 2 bugs visuais confirmados no UAT da Phase 7 (renderização pagamento_recebido/revertido + timezone created_at)
- [ ] **Phase 7.2: Excluir Contrato** (INSERTED) — Urgente: advogado exclui contrato via UI (hoje só via SQL). Hard delete com 3 DELETEs ordenados e pré-check bloqueando contratos com pagamentos reais
- [ ] **Phase 7.3: Fix Pagamentos Parciais Resumo e Listagem** (INSERTED) — Gap closure: Resumo Financeiro do DetalheContrato e coluna "Valor Total" da TabelaContratos ignoram pagamentos parciais em pagamentos_divida. Fix sem tocar no motor Art.354
- [ ] **Phase 7.4: Cache Headers Vercel** (INSERTED) — UX: após deploy, navegador precisa de Ctrl+F5 pra ver versão nova. Fix via Cache-Control no vercel.json (no-cache pro catch-all, immutable pros assets hasheados do Vite)
- [ ] **Phase 7.5: Parcelas com Datas e Valores Customizados** (INSERTED) — UX forense: acordos extrajudiciais exigem datas e valores não-regulares por parcela. Tabela editável na criação + edição, com readonly em parcelas já pagas. Componente isolado reusável pra Phase 7.6/7.7 futuras
- [ ] **Phase 7.5.1: Sincronização saldosMap + UX input valor** (INSERTED) — Gap closure: 3 bugs descobertos no UAT da Phase 7.5 (R$ 39,90 fantasma + Saldo não recalcula após edição + input valor não apaga zero). Todos cirúrgicos, motor Art.354 intocado
- [ ] **Phase 8: PDF Demonstrativo** — Advogado gera PDF demonstrativo do contrato com tabela de parcelas, pagamentos recebidos, totais e rodapé jurídico

## Phase Details

### Phase 4: Pagamentos por Dívida
**Goal**: Advogado pode fechar o ciclo financeiro de uma dívida individual — registrar pagamentos com data e valor, ver o histórico, corrigir lançamentos errados, e saber quando a dívida está quitada
**Depends on**: Phase 3 (DetalheDivida existente como ponto de entrada)
**Requirements**: PAG-01, PAG-02, PAG-03, PAG-04, PAG-05, PAG-06, PAG-07, PAG-08
**Decision point**: Resolvido — Posição B (nova tabela `pagamentos_divida` com FK para `dividas`). Ver CONTEXT.md D-01.
**Success Criteria** (what must be TRUE):
  1. Advogado abre a tela de uma dívida e consegue registrar um pagamento informando data, valor e observação — o novo pagamento aparece imediatamente na lista cronológica abaixo
  2. Advogado vê o histórico completo de pagamentos da dívida em ordem cronológica, com data, valor e observação de cada lançamento
  3. Advogado consegue editar ou excluir um pagamento lançado por engano, após confirmação, e o saldo é recalculado na mesma tela
  4. O saldo exibido na tela da dívida reflete a imputação Art. 354 CC sequencial sobre todos os pagamentos registrados para aquela dívida
  5. Quando o saldo calculado é ≤ 0, a dívida exibe o badge "Saldo quitado" na tela de detalhe
  6. `dividas.saldo_quitado` é persistido no banco após cada operação de pagamento
  7. Badge "Saldo quitado" exibido na TabelaDividas lendo `dividas.saldo_quitado`
**Plans**: 3 plans
Plans:
- [x] 04-01-PLAN.md — Service layer: pagamentos.js (CRUD + calcularSaldoPorDividaIndividual) + atualizarSaldoQuitado em dividas.js
- [x] 04-02-PLAN.md — Componente PagamentosDivida.jsx: histórico, edição inline, exclusão com confirm, formulário de registro
- [x] 04-03-PLAN.md — Integração: montar PagamentosDivida em DetalheDivida + badge "Saldo quitado" em DetalheDivida e TabelaDividas
- [x] 04-04-PLAN.md — CR-03 gap closure: recalcularESincronizar no mount + Total Pago por pagamentos_divida (PAG-05, PAG-07)
- [x] 04-05-PLAN.md — CR-04 gap closure: sincronizar dividas.status com saldo_quitado (PAG-09)
- [~] 04-06-PLAN.md — CR-05 backlog v1.2: persistir saldo_atual no banco (PAG-10) — DEFERRED
**UI hint**: yes

### Phase 5: Contratos com Parcelas (Redesenho 3 Níveis — v1.2)
**Goal**: Advogado pode criar um Contrato (relação comercial), adicionar Documentos (NF, boleto, C&V, etc.) a ele, e cada Documento gera automaticamente N Parcelas como dívidas reais — navegando do contrato ao detalhe de cada parcela com saldo individual vivo via Art. 354 CC
**Depends on**: Phase 4 (mecanismo de pagamentos por dívida necessário para saldo por parcela em DetalheContrato)
**Requirements**: CON-01, CON-02, CON-03, CON-04, CON-05
**Model**: Contrato → Documento → Parcela (3 níveis). Decisions D-01..D-09 in 05-CONTEXT.md.
**Success Criteria** (what must be TRUE):
  1. Advogado cria um Contrato (header: credor, devedor, referência, encargos padrão) e o sistema abre DetalheContrato com lista de documentos vazia
  2. Advogado adiciona um Documento ao Contrato (tipo, número, valor, data emissão, nº parcelas, encargos) e o sistema gera N Parcelas automaticamente como rows reais na tabela dividas
  3. Advogado vê a lista global de contratos com colunas: Credor, Devedor, Docs, Parcelas, Valor Total, Em Atraso
  4. Advogado abre DetalheContrato e vê documentos colapsáveis — expandindo um documento mostra tabela de parcelas com saldo individual calculado via Art. 354 CC
  5. Parcelas de contratos aparecem na tabela global de dívidas (ModuloDividas) com badge [NF]/[C&V]/[Empr.] no campo Credor
**Plans**: 5 plans
Plans:
- [x] 05-01-PLAN.md — DB migration (documentos_contrato table + ALTER contratos_dividas + dividas.documento_id FK) + contratos.js service (3-level: criarContrato, adicionarDocumento, gerarPayloadParcelasDocumento, recalcularTotaisContrato)
- [x] 05-02-PLAN.md — NovoContrato.jsx (header only: credor + devedor + referência + encargos via DiretrizesContrato) + TabelaContratos.jsx (6 colunas: Credor, Devedor, Docs, Parcelas, Valor Total, Em Atraso)
- [x] 05-03-PLAN.md — AdicionarDocumento.jsx (novo: tipo + numero_doc + valor + data_emissao + num_parcelas + encargos herdados editáveis)
- [x] 05-04-PLAN.md — DetalheContrato.jsx (header + financial summary green + documentos colapsáveis + inline AdicionarDocumento) + DetalheDivida.jsx (breadcrumb duplo ← Ver documento + ← Ver contrato) + TabelaDividas.jsx (badge [NF]/[C&V]/[Empr.])
- [x] 05-05-PLAN.md — ModuloContratos.jsx (4-view state machine: lista/novo/detalhe/parcela-detalhe) + App.jsx (allContratos + allDocumentos state, documentosMap enrichment, NAV, renderPage) + human verify
**UI hint**: yes
**Status**: Complete 2026-04-22 — 3-level model. All 5 plans verified E2E.

### Phase 6: Edição de Contrato + Histórico (v1.3)
**Goal**: Advogado pode editar um contrato existente (credor, devedor, referência, encargos padrão) com cascade automático de credor/devedor para todos os documentos e parcelas, e visualizar o histórico cronológico de eventos do contrato
**Depends on**: Phase 5 (DetalheContrato existente como ponto de entrada, contratos.js como service base)
**Requirements**: EDT-01, EDT-02, EDT-03, EDT-04, HIS-01, HIS-02, HIS-03, HIS-04
**Decisions**: D-01..D-09 in 06-CONTEXT.md
**Success Criteria** (what must be TRUE):
  1. Advogado clica "Editar Contrato" no DetalheContrato e vê form inline com todos os campos (referência, credor, devedor, encargos) pré-preenchidos
  2. Advogado salva edição de referência/encargos sem cascade — toast "Contrato atualizado." aparece e header reflete novos valores
  3. Advogado altera credor ou devedor — sistema exibe window.confirm com N parcelas afetadas antes de salvar
  4. Após confirmação do cascade, credor/devedor propagado para todos os documentos e parcelas (incluindo quitadas)
  5. Ao criar um contrato novo, evento 'criacao' registrado automaticamente em contratos_historico
  6. Advogado abre seção "Histórico" colapsável e vê timeline vertical com eventos criacao e edicao em ordem cronológica
**Plans**: 3 plans
Plans:
- [x] 06-01-PLAN.md — DB migration (contratos_historico) + contratos.js service (editarContrato, cascatearCredorDevedor, registrarEvento, listarHistorico) + criarContrato modificado para HIS-01
- [x] 06-02-PLAN.md — DetalheContrato.jsx edit mode: form unificado (referência + credor + devedor + DiretrizesContrato), cascade confirm, save/cancel handlers, spinner, HIS-02
- [x] 06-03-PLAN.md — DetalheContrato.jsx Histórico section: toggle colapsável, lazy load, empty state, timeline vertical (criacao + edicao events)
UAT fixes (3 commits pós-plans):
- window.confirm condicional (N > 0) + opção vazia nos selects credor/devedor
- cascade restrito a `dividas` (removido PATCH incorreto em `documentos_contrato`)
- TIPO_EVENTO_LABELS (6 labels PT-BR) + resolve credor/devedor ID → nome na timeline

### Phase 7: Pagamentos por Contrato (v1.4)
**Goal**: Advogado pode registrar pagamentos no nível do contrato com amortização automática por parcela mais antiga (Art. 354 CC), ver o histórico colapsável de pagamentos recebidos e corrigir lançamentos via edição ou exclusão com reversão completa e rastreamento no histórico do contrato
**Depends on**: Phase 6 (DetalheContrato, contratos.js, contratos_historico)
**Requirements**: PAGCON-01, PAGCON-02, PAGCON-03, PAGCON-04, PAGCON-05, PAGCON-06, HIS-05
**Success Criteria** (what must be TRUE):
  1. Advogado abre DetalheContrato, preenche o form "Registrar Pagamento" (data, valor, observação) e salva — toast exibe quantas parcelas foram amortizadas e a seção de saldo do contrato atualiza imediatamente
  2. Ao registrar o pagamento, parcelas em aberto são amortizadas pela mais antiga via stored procedure PL/pgSQL — o banco reflete o novo `saldo_quitado` em cada parcela afetada de forma atômica
  3. Form bloqueia envio quando valor ≤ 0, valor excede o saldo devedor total do contrato ou data é futura — toast de erro específico aparece em cada caso
  4. Advogado vê seção colapsável "Pagamentos Recebidos" no DetalheContrato com lista cronológica mostrando data, valor total, parcelas amortizadas e observação de cada lançamento
  5. Advogado edita ou exclui um pagamento registrado — a amortização das parcelas afetadas é revertida atomicamente e evento `pagamento_revertido` é registrado em contratos_historico
  6. Cada pagamento registrado gera automaticamente evento `pagamento_recebido` em contratos_historico com snapshot do valor e parcelas afetadas; timeline do Histórico exibe esses eventos com labels PT-BR
**Plans**: 4 plans
Plans:
- [ ] 07-01-PLAN.md — DB migrations (ALTER CHECK + pagamentos_contrato table + SPs registrar/reverter)
- [ ] 07-02-PLAN.md — contratos.js service layer (registrarPagamentoContrato, excluirPagamentoContrato, listarPagamentosContrato)
- [ ] 07-03-PLAN.md — DetalheContrato.jsx: form Registrar Pagamento + validação PAGCON-05 + TIPO_EVENTO_LABELS
- [ ] 07-04-PLAN.md — DetalheContrato.jsx: seção Pagamentos Recebidos colapsável + exclusão com reversão
**UI hint**: yes

### Phase 7.1: Fix Histórico Pagamentos (v1.4 gap closure)
**Goal**: Corrigir 2 bugs visuais confirmados no UAT da Phase 7 no histórico de eventos do contrato
**Depends on**: Phase 7 (DetalheContrato.jsx com seção histórico existente)
**Requirements**: (gap closure — sem REQ-IDs formais)
**Success Criteria** (what must be TRUE):
  1. Eventos de tipo `pagamento_recebido` e `pagamento_revertido` exibem Valor, Data e Parcelas na timeline do Histórico — não exibem "— → —"
  2. Timestamps `created_at` dos eventos do histórico exibem a data correta no fuso horário de Brasília
  3. Regressão 9/9 continua verde após o fix
**Plans**: 1 plan
Plans:
- [x] 07.1-01-PLAN.md — DetalheContrato.jsx: isPagamento guard + diffEntries fix + JSX branch + fmtDataHora timezone fix

### Phase 7.2: Excluir Contrato (v1.4 — INSERTED)
**Goal**: Advogado exclui contrato do banco via botão na UI do DetalheContrato, sem precisar acionar o banco diretamente. Hard delete em cascata manual (3 DELETEs ordenados), bloqueado quando existem pagamentos reais registrados.
**Depends on**: Phase 7 (DetalheContrato.jsx como ponto de entrada, contratos.js como service base)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto no UAT pós-v1.4)
**Decisions locked (from discuss session 2026-04-23):**
- **D-01:** 3 DELETEs REST sequenciais em ordem: `dividas WHERE contrato_id` → `documentos_contrato WHERE contrato_id` → `contratos_dividas WHERE id`. Sem stored procedure. `contratos_historico` e `pagamentos_contrato` cascateiam via FK.
- **D-02:** Blocklist da pré-checagem: rejeita se existe `pagamentos_contrato` com `contrato_id = :id` OU `pagamentos_divida` com `divida_id IN (parcelas do contrato)`. **NÃO** bloqueia por `contratos_historico` (cascata automática) nem por `documentos_contrato` (deletado no passo 2).
- **D-03:** Mensagem de rejeição: "Este contrato possui pagamentos registrados — não pode ser excluído. Exclua os pagamentos primeiro."
- **D-04:** Atomicidade: REST sequencial aceito. Se falhar no meio, contrato pode ficar com docs órfãos (reexecutável). SP fica como Phase 7.2.1 futura se virar problema.
- **D-05:** Botão "Excluir Contrato" vermelho (`color="#dc2626"`) ao lado do "Editar Contrato" em DetalheContrato.jsx header read mode. Usa mesmo Btn component.
- **D-06:** window.confirm com texto "Tem certeza? Esta ação não pode ser desfeita." Em sucesso, navega de volta pra lista de contratos e refresca state (padrão Phase 5/6 de refresh após create/edit).
- **D-07:** Fora do escopo: botão na TabelaContratos (listagem), cascata forçada sobre pagamentos, exclusão em massa, soft delete.
**Success Criteria** (what must be TRUE):
  1. Botão "Excluir Contrato" vermelho aparece ao lado de "Editar Contrato" no header do DetalheContrato
  2. Clicar no botão abre window.confirm — se cancelar, nada acontece
  3. Contrato sem dívidas e sem documentos (header-only) é excluído com sucesso pelos 3 DELETEs (2 primeiros retornam 0 rows, 3º retorna 1)
  4. Contrato com parcelas sem pagamentos é excluído com sucesso; histórico cascata automaticamente
  5. Contrato com ≥1 linha em pagamentos_contrato OU pagamentos_divida é rejeitado com a mensagem de D-03 — nenhum DELETE é executado
  6. Após exclusão bem-sucedida, UI navega de volta pra lista e o contrato deletado não aparece mais (state refrescado)
  7. Suite de regressão `npm run test:regressao` continua 9/9 verde (motor Art.354 não tocado)
**Plans**: TBD
**UI hint**: yes
**Status**: Inserted 2026-04-23 — awaiting /gsd-plan-phase 7.2

### Phase 7.3: Fix Pagamentos Parciais Resumo e Listagem (v1.4 — INSERTED)
**Goal**: Resumo Financeiro do DetalheContrato e listagem global de Contratos passam a refletir pagamentos parciais. Advogado vê "quanto já foi pago e quanto ainda falta" corretamente, sem precisar abrir cada contrato individualmente. Motor Art.354 NÃO é tocado — a correção está nos componentes que leem pagamentos_divida como fonte de verdade em vez de usar só o flag saldo_quitado.
**Depends on**: Phase 7 (pagamentos_divida existe e é alimentada pela SP registrar_pagamento_contrato + pela Phase 4 manual), Phase 7.2 (ModuloContratos + TabelaContratos + DetalheContrato estáveis)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto no UAT pós-ship da v1.4)
**Decisions locked (from discuss session 2026-04-23):**
- **D-01:** Motor Art.354 (`calcularSaldosPorDivida` em `utils/devedorCalc.js`, `calcularSaldoPorDividaIndividual` em `services/pagamentos.js`) **NÃO é modificado**. Os 9 testes de regressão Art.354 preservados por invariante estrutural — se o motor não é editado, os testes não regredem.
- **D-02:** Fonte de verdade dos valores pagos = `pagamentos_divida.valor`. Essa tabela é alimentada por 2 caminhos (SP `registrar_pagamento_contrato` Phase 7 — confirmado em 07-01-PLAN.md:211; e `criarPagamento` manual Phase 4). Somar `pagamentos_divida` cobre ambos.
- **D-03:** Resumo é NOMINAL — `saldo_restante = valor_total_contrato - Σ pagamentos`. Não reflete juros/correção/multa Art.354 (isso já existe em DetalheDivida por parcela, fora do escopo). Advogado usa Resumo para "status do acordo"; motor Art.354 para execução.
- **D-04:** Helper puro `calcularTotaisContratoNominal(dividasDoContrato, allPagamentos)` retorna `{ valor_total, total_pago, saldo_restante, quitado_total }`. Sem fetch — dados já carregados em `allPagamentos` (prop existente em DetalheContrato e App.jsx). Co-localizado em `src/services/contratos.js` (ou extraído para `src/utils/totaisContrato.js` — discretion do planner). Arredondamento inline `Math.round(x*100)/100` (padrão do projeto; sem util compartilhado).
- **D-05:** Tolerância de quitação: `quitado_total = saldo_restante <= 0.005` (meio centavo absorve ruído de float). Clip de over-payment via `Math.max(0, saldo)`.
- **D-06:** Label do Resumo Financeiro no DetalheContrato: **"Total Quitado" → "Total Pago"** (semanticamente correto — quitado sugere 100%, pago inclui parcial). Aplicar renomeação consistentemente se aparecer em outros lugares.
- **D-07:** Listagem TabelaContratos — **remover coluna "Valor Total"** e substituir por coluna única "Saldo" com 2 valores empilhados: `{pago} pago` como subtexto e `{em aberto}` como valor principal em destaque (vermelho se > 0, verde "Quitado" se ≤ 0). Sem tooltip de hover. Total colunas permanece 6: Credor · Devedor · Docs · Parcelas · **Saldo** · Em Atraso.
- **D-08:** Performance — `TabelaContratos` não recebe `allPagamentos` hoje. Solução: `ModuloContratos` (ou App.jsx se ele já processa) pré-computa `Map<contratoId, { pago, emAberto }>` análogo ao `parcelasPorContrato` existente. TabelaContratos consulta o Map em O(1) por linha em vez de filtrar `allPagamentos` a cada render.
- **D-09:** Refresh pós-pagamento — `handleRegistrarPagamento` (DetalheContrato.jsx:356) e `handleExcluirPagamento` (DetalheContrato.jsx:372) **já chamam `onCarregarTudo()`**. Resumo recalcula automaticamente após mutação. **Zero trabalho extra** — não há Task 4 de refresh.
- **D-10:** Fora do escopo: mudanças em motor Art.354, SP, migration, schema; Phase 8 PDF; housekeeping docs GSD; outros call sites que possam ter pattern similar (se descobertos, abrir Phase 7.4).
**Success Criteria** (what must be TRUE):
  1. Helper `calcularTotaisContratoNominal` (ou nome escolhido pelo planner) existe e retorna `{ valor_total, total_pago, saldo_restante, quitado_total }` — função pura, sem efeitos colaterais
  2. No caso do usuário (contrato R$ 900, pagamentos R$ 300 + R$ 1): `total_pago === 301`, `saldo_restante === 599`
  3. Resumo Financeiro do DetalheContrato mostra "Total Pago R$ 301" e "Em Aberto R$ 599" (labels "Total Quitado" substituído por "Total Pago")
  4. Listagem TabelaContratos tem coluna "Saldo" com `{pago} pago` em cima e `{em aberto}` embaixo (vermelho se > 0, "Quitado" verde se ≤ 0); coluna "Valor Total" removida
  5. Refresh automático funciona após registrar/excluir pagamento (já é o comportamento, validar não-regressão)
  6. `npm run test:regressao` continua 9/9 verde (motor Art.354 não tocado — invariante estrutural)
  7. Build limpo (`npm run build`) sem erros
**Plans**: 1 plan
Plans:
- [ ] 07.3-01-PLAN.md — Helper calcularTotaisContratoNominal + integração UI (DetalheContrato Resumo + ModuloContratos Map + TabelaContratos coluna Saldo) + duplo checkpoint commit (SEM PUSH)
**UI hint**: yes
**Status**: Planned 2026-04-23 — awaiting /gsd-execute-phase 7.3

### Phase 7.4: Cache Headers Vercel (v1.4 — INSERTED)
**Goal**: Após deploy da Vercel, o navegador do usuário serve automaticamente a versão nova sem precisar de Ctrl+F5 / recarregar forçado. Sintoma atual: navegador serve index.html cacheado que aponta pros nomes hash antigos dos assets, então JS novos nunca são baixados até cache expirar ou usuário forçar.
**Depends on**: Phase 7.3 (shipped) — garante que não há alteração em JS/UI concorrente enquanto mexemos no deploy config.
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em uso real de produção)
**Decisions locked (from discuss session 2026-04-23):**
- **D-01:** vercel.json está em `src/mr-3/mr-cobrancas/vercel.json` (submodule), NÃO no pai. Evidência: rewrites SPA atuais estão funcionando em produção — se não estivessem, F5 em /dashboard daria 404. Vercel lê do submodule via Root Directory configurado no dashboard da Vercel.
- **D-02:** Preservar `rewrites` atuais (`/(.*)` → `/index.html`). Sem eles, SPA quebra com F5 → 404 (que é Phase 7.5 futura — router). Nada de tocar nessa parte.
- **D-03:** Adicionar bloco `headers` com 2 regras (ordem importa — Vercel aplica todos os matches e última regra ganha em conflito de chave):
  1. Catch-all `/(.*)`: `Cache-Control: no-cache, no-store, must-revalidate` — força revalidação em todo request (index.html, favicon, rotas SPA).
  2. `/assets/(.*)`: `Cache-Control: public, max-age=31536000, immutable` — Vite hasheia nome dos assets; cache "pra sempre" sem risco de staleness.
- **D-04:** Ordem das regras em vercel.json: catch-all PRIMEIRO, assets-override DEPOIS — pra assets ganhar sobre catch-all por regra de última-precedência.
- **D-05:** `public/` contém apenas `public/index.html` (274 bytes, placeholder legado). Zero fonts/imagens/PDFs. Catch-all `no-cache` aplica sem problema — custo trivial de re-baixar placeholder sub-1KB é desprezível.
- **D-06:** UAT simplificado — o próprio deploy da Phase 7.4 é a primeira versão com headers novos E a primeira versão nova pós-deploy desde 7.3. Se F5 simples no mrcobrancas.com.br mostrar a versão nova (vercel.json com headers), validou. Não precisa push trivial extra.
- **D-07:** Fluxo de commit mesmo padrão da 7.2/7.3: commit no submodule main + bump no pai master + push com autorização. Ambos os PAUSAs aplicam.
- **D-08:** Fora do escopo: router / Phase 7.5 (rotas SPA), banner "nova versão disponível", Service Worker / PWA, mudança em Vite bundler ou em dependências, CDN cache (s-maxage) — Vercel já invalida automaticamente seu CDN a cada deploy.
**Success Criteria** (what must be TRUE):
  1. `src/mr-3/mr-cobrancas/vercel.json` contém `rewrites` preservado + `headers` com 2 entradas (catch-all + assets) na ordem correta
  2. JSON válido (sem vírgula sobrando, colchetes balanceados) — `node -e "JSON.parse(require('fs').readFileSync(...))"` passa sem throw
  3. `npm run build` continua exit 0 (zero impacto em bundler; só config de deploy)
  4. `npm run test:regressao` continua 9/9 verde (motor não tocado)
  5. Após deploy em mrcobrancas.com.br, `curl -I https://mrcobrancas.com.br/` retorna `Cache-Control: no-cache, no-store, must-revalidate`
  6. `curl -I https://mrcobrancas.com.br/assets/<hash>.js` retorna `Cache-Control: public, max-age=31536000, immutable` (onde `<hash>` é um asset real do deploy)
  7. F5 simples em aba pré-aberta do mrcobrancas.com.br após deploy mostra a versão nova do app (não precisa Ctrl+F5)
**Plans**: 1 plan
Plans:
- [ ] 07.4-01-PLAN.md — vercel.json: preservar rewrites SPA + adicionar headers (catch-all no-cache + assets immutable) + duplo checkpoint commit (SEM PUSH)
**UI hint**: no (deploy config, zero código de UI)
**Status**: Planned 2026-04-23 — awaiting /gsd-execute-phase 7.4

### Phase 7.5: Parcelas com Datas e Valores Customizados (v1.4 — INSERTED)
**Goal**: Advogado consegue criar documentos com parcelas de valores e datas customizadas (fluxo de acordos extrajudiciais) via tabela editável, E editar parcelas de documentos existentes com proteção de integridade contábil: valores de parcelas com pagamento registrado ficam readonly; datas ainda podem ser reagendadas se a parcela estiver sem pagamento. Componente reusável para Phase 7.6 (Custas) e 7.7 (Ajuste de valor contratual) futuras.
**Depends on**: Phase 7.3 (prop `allPagamentosDivida` disponível em ModuloContratos e DetalheContrato — usada para pré-computar Set de parcelas com pagamento)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em uso real de produção pelo advogado)
**Decisions locked (from discuss session 2026-04-23):**
- **D-01:** Motor Art.354 (`calcularSaldosPorDivida` em `utils/devedorCalc.js`, `calcularSaldoPorDividaIndividual` em `services/pagamentos.js`) **NÃO é tocado**. 9 testes regressão preservados por invariante estrutural.
- **D-02:** Novo componente `src/components/TabelaParcelasEditaveis.jsx` **100% isolado**, zero acoplamento a ModuloContratos/DetalheContrato/AdicionarDocumento. Props: `{ valorTotal, parcelasIniciais, modoEdicao: "create"|"edit", dividasComPagamentoIds: Set<string>, onChange, onSubmit, onCancel }`. Base reusável pra Phase 7.6 e 7.7 futuras.
- **D-03:** Fluxo de criação — `AdicionarDocumento.jsx` substitui `num_parcelas + primeira_parcela_na_data_base` pela tabela em modo create. `gerarPayloadParcelasDocumento` em `contratos.js:157` fica como default (outros fluxos), mas o novo caminho bypass ela.
- **D-04:** Fluxo de edição — botão "Editar parcelas" por documento no DetalheContrato, abre a tabela em modo edit com parcelas atuais preenchidas. Parcelas com `saldo_quitado=true` OU com ≥1 row em `pagamentos_divida` ficam com valor **E** data readonly (simplicidade > flexibilidade).
- **D-05:** "Sugerir datas" — Opção A: usuário preenche data da parcela 1 manual, botão oferece Mensal/Quinzenal/Semanal/Personalizado e preenche da 2 em diante mantendo os valores já editados.
- **D-06:** Valor default por parcela = `Math.floor((valorTotal/N)*100)/100` com última recebendo o resto — mantém padrão de `gerarPayloadParcelasDocumento`.
- **D-07:** Validações antes de salvar: (a) soma das parcelas === documento.valor (tolerância R$ 0,01); (b) todas as datas preenchidas; (c) ordem **não-decrescente** (permite 2 parcelas no mesmo dia — motor ordena por data+id, seguro).
- **D-08:** Soma das parcelas === `documentos_contrato.valor` é **INVARIANTE** nesta phase. Não permite ajustar valor total via tela de edição. Se quiser mudar valor total (desconto/novação), é Phase 7.7 futura.
- **D-09:** Edit mode NÃO permite adicionar/remover linhas. `documentos_contrato.num_parcelas` é **imutável pós-criação**. Mudar N requer criar documento novo.
- **D-10:** Service layer — novo `atualizarParcelasCustom(documentoId, parcelasEditadas)` (localização: `contratos.js` ou `dividas.js`, discretion do planner). Valida soma + ordem + readonly de parcelas pagas. Itera PATCHes em `dividas` via `atualizarDivida` existente. Atomicidade aceita como reexecutável (mesmo trade-off da Phase 7.2 D-04).
- **D-11:** Evento `parcelas_editadas` em `contratos_historico` **DEFERIDO pra Phase 7.5.1 futura** (rastreabilidade forense de edição de datas). Não adiciona agora.
- **D-12:** Fora do escopo: tipo novo "Custas Judiciais" (Phase 7.6), ajuste de valor contratual/novação (Phase 7.7), mudança no motor Art.354, migration de schema.
**Success Criteria** (what must be TRUE):
  1. `TabelaParcelasEditaveis.jsx` criado, puro (props-only, sem import de ModuloContratos/DetalheContrato/AdicionarDocumento); recebe props conforme D-02
  2. Validação soma === valorTotal (tolerância R$ 0,01) bloqueia save com toast claro quando falha
  3. Validação ordem não-decrescente bloqueia save com toast claro quando falha
  4. Fluxo de criação: `AdicionarDocumento` usa o componente em modo create; salvar envia parcelas customizadas para o service e gera N parcelas conforme digitadas
  5. Fluxo de edição: `DetalheContrato` tem botão "Editar parcelas" por documento; abrir mostra parcelas atuais; parcelas com pagamento têm valor+data readonly; salvar atualiza só o que mudou
  6. Readonly detection: `dividasComPagamentoIds` pré-computado como `Set<string>` usando `allPagamentosDivida.filter(p => !!p.valor).map(p => String(p.divida_id))` + OR `saldo_quitado=true`
  7. `npm run test:regressao` continua 9/9 verde (motor Art.354 intocado por invariante estrutural)
**Plans**: 1 plan
Plans:
- [ ] 07.5-01-PLAN.md — Service atualizarParcelasCustom + adicionarDocumento 4º param + TabelaParcelasEditaveis (novo componente 100% isolado) + integrações AdicionarDocumento (create) e DetalheContrato (edit com Set readonly via useMemo) + duplo checkpoint commit (SEM PUSH)
**UI hint**: yes
**Status**: Planned 2026-04-23 — awaiting /gsd-execute-phase 7.5

### Phase 7.5.1: Sincronização saldosMap + UX input valor (v1.4 — INSERTED)
**Goal**: Corrigir 3 bugs descobertos no UAT da Phase 7.5, todos cirúrgicos e sem tocar no motor Art.354: (a) saldo fantasma R$ 39,90 após reagendar parcela para data futura; (b) coluna Saldo não recalcula após editar valor da parcela sem F5; (c) input de valor na TabelaParcelasEditaveis não permite apagar o zero e concatena keystrokes ao "0" preexistente. Root cause unificado dos bugs A+B: `useEffect` que calcula `saldosMap` em `DetalheContrato.jsx:173` tem deps incompletas — falta `dividas`. Bug C: state local Number em vez de string no componente isolado da 7.5.
**Depends on**: Phase 7.5 (componente `TabelaParcelasEditaveis.jsx` e integração de edição em `DetalheContrato` foram introduzidos na 7.5; os 3 bugs só são visíveis após a feature de editar datas/valores existir)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em UAT localhost da Phase 7.5 em 2026-04-23)
**Decisions locked (from discuss session 2026-04-23):**
- **D-01:** Motor Art.354 (`calcularSaldosPorDivida` em `utils/devedorCalc.js`, `calcularSaldoPorDividaIndividual` em `services/pagamentos.js`) **NÃO é tocado**. 9 testes regressão TJGO preservados por invariante estrutural. Nenhum teste novo é adicionado.
- **D-02:** Bug A (R$ 39,90 fantasma) + Bug B (Saldo não recalcula após edição) têm **mesma raiz**: `useEffect` em `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx:173` com deps `[expandedDoc, hoje]` faltando `dividas`. Fix: adicionar `dividas` às deps. `saldosMap` stale porque `setSaldosMap(prev => ({...prev, ...new}))` faz merge e IDs existentes nunca são sobrescritos até um novo expand.
- **D-03:** Deps simples `[expandedDoc, hoje, dividas]` sem hash signature otimizado nesta phase. Se UAT futuro detectar lentidão em contratos grandes (50+ parcelas), Phase 7.5.2 otimiza.
- **D-04:** Bug C (input valor não apaga zero) isolado em `src/mr-3/mr-cobrancas/src/components/TabelaParcelasEditaveis.jsx`. Fix correto: state local de string em vez de Number puro — permite campo vazio durante edição. NÃO é workaround visual.
- **D-05:** Classificação dos 3 bugs: todos CIRÚRGICOS. Zero bugs de risco médio ou alto. Commit split segue padrão 7.x (feat/fix no submodule + bump no pai).
- **D-06:** Commit messages: `fix(07.5.1-01): input valor aceita limpar em TabelaParcelasEditaveis` (Task 1, Bug C) + `fix(07.5.1-02): saldosMap não invalida após edição de parcelas (bugs A + B)` (Task 2, Bugs A+B consolidados) + `chore(07.5.1): bump submodule mr-3 — saldosMap sync + input UX (07.5.1)` (Task 3, bump pai).
- **D-07:** UAT em localhost segue padrão que pegou os bugs nas fases anteriores. 3 cenários: (a) Bug C — apagar tudo no input com backspace, digitar "50", verificar ausência de zero à esquerda; (b) Bug B — editar parcela 300→500, salvar, verificar Saldo recalcula sem F5; (c) Bug A — editar parcela pra data futura, salvar, verificar Saldo puro sem penalidade fantasma. Prod vira smoke test final.
- **D-08:** Fluxo de commit mesmo padrão da 7.2/7.3/7.4/7.5: commit(s) no submodule main + bump no pai master + push só com autorização explícita. Ambos os PAUSAs (#1 diff review, #2 bump review) aplicam.
- **D-09:** Fora do escopo: otimização via hash signature (só se regressão UX surgir — Phase 7.5.2), refactor de `saldosMap` para usar Map/WeakMap, mudanças no motor Art.354, evento `parcelas_editadas` em `contratos_historico` (ainda deferido à futura forense), qualquer alteração na tabela `dividas` ou `pagamentos_divida`.
**Success Criteria** (what must be TRUE):
  1. `src/mr-3/mr-cobrancas/src/components/DetalheContrato.jsx` linha do useEffect de `saldosMap` tem deps `[expandedDoc, hoje, dividas]` (verificável via grep)
  2. `src/mr-3/mr-cobrancas/src/components/TabelaParcelasEditaveis.jsx` usa state local de string para o input valor (verificável via leitura do componente — não Number puro no state do input)
  3. `git diff HEAD~N -- src/mr-3/mr-cobrancas/src/utils/devedorCalc.js src/mr-3/mr-cobrancas/src/services/pagamentos.js` vazio (invariante motor Art.354)
  4. `npm run test:regressao` continua 9/9 verde (motor intocado)
  5. `npm run build` exit 0
  6. UAT localhost confirma os 3 cenários de D-07 passam sem F5
  7. Zero push executado sem autorização explícita do usuário
**Plans**: TBD (3 tasks previstas em 1 wave sequencial — Bug C, Bugs A+B, Checkpoint)
**UI hint**: yes (afeta input de valor e coluna Saldo no DetalheContrato — mudanças visuais mínimas, apenas consertam cached state)
**Status**: Awaiting /gsd-plan-phase 7.5.1

### Phase 7.6: Parcelas N grande (até 999) com virtualização (INSERTED)
**Goal**: Advogado consegue cadastrar contratos reais de empréstimo com N até 999 parcelas (imobiliário 30–35 anos = 360/420x, consignado = 96x) — remove limite cosmético `max="360"` atual em `AdicionarDocumento.jsx` e adiciona virtualização de scroll via `@tanstack/react-virtual` na `TabelaParcelasEditaveis.jsx`, mantendo performance e consistência visual em N grande e preservando 100% das validações existentes (soma, datas crescentes, readonly em parcelas pagas, indicador Soma/Total/Δ em tempo real).
**Depends on**: Phase 7.5 (componente `TabelaParcelasEditaveis.jsx` existe — esta phase modifica suas internals)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em uso real pelo advogado: empréstimos reais do domínio forense vão até 420 parcelas)
**Decisions**: ver `.planning/phases/07.6-parcelas-n-grande/07.6-CONTEXT.md` (discuss locked 2026-04-23)
**Plans**: TBD (3 plans atômicos previstos: 7.6-01 bump limite input, 7.6-02 virtualização, 7.6-03 UAT + bump submodule)
**UI hint**: yes (refactor do `TabelaParcelasEditaveis` + input de parcelas em `AdicionarDocumento`)
**Status**: Planned 2026-04-23 — awaiting /gsd-plan-phase 7.6

### Phase 7.7: Excluir Documento Individual (INSERTED)
**Goal**: Advogado consegue excluir UM documento específico dentro de um contrato sem precisar apagar e recriar o contrato inteiro — fluxo para correção rápida de documentos cadastrados errado. Reaproveita padrão `excluirContrato` (Phase 7.2) com pre-check de pagamentos + cascata manual DELETE + `recalcularTotaisContrato` pós-delete. Botão vermelho outline no card expandido do documento em `DetalheContrato.jsx`, próximo ao "Editar parcelas" existente.
**Depends on**: Phase 7.2 (padrão excluirContrato + handleExcluirContrato usado como template); Phase 7.5 (botão "Editar parcelas" adjacente no mesmo card)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em uso real pelo advogado: não há como corrigir documento cadastrado errado sem apagar o contrato inteiro)
**Decisions**: ver `.planning/phases/07.7-excluir-documento-individual/07.7-CONTEXT.md` (discuss locked 2026-04-23)
**Plans**: TBD (3 plans com 5 pausas por modo cansado: 7.7-01 service `excluirDocumento` não-autonomous, 7.7-02 UI button+handler não-autonomous, 7.7-03 UAT 5 SCs + bump duplo checkpoint)
**UI hint**: yes (novo botão em `DetalheContrato.jsx` card expandido)
**Status**: Planned 2026-04-23 — awaiting /gsd-plan-phase 7.7

### Phase 7.8: Saldo Atualizado + Composição da Dívida com Impressão (INSERTED)
**Goal**: Adicionar coluna "Saldo Atualizado" (Art. 354 CC) no Resumo Financeiro do contrato e modal de composição clicável que mostra decomposição (valor original + correção + multa + juros + honorários) com botões Copiar (clipboard → WhatsApp) e Imprimir (A4 via window.open isolado). Motor Art.354 **intocado por construção** — descoberta no discuss 2026-04-24 revelou que `calcularDetalheEncargos` já expõe decomposição; phase vira adapter thin + UI + reuso de Modal.jsx base + pattern de impressão do GerarPeticao.jsx.
**Depends on**: Phase 7.3 (`allPagamentosDivida` prop disponível em DetalheContrato); Phase 7.7 (num_documentos=0 estado válido pós-delete — hide "Saldo Atualizado" quando vazio)
**Requirements**: (gap closure — sem REQ-IDs formais; descoberto em demanda real: UI só mostra valores nominais, advogado precisa ver saldo Art.354 com decomposição pra apresentar ao cliente/devedor e imprimir)
**Decisions**: ver `.planning/phases/07.8-saldo-atualizado-composicao/07.8-CONTEXT.md` (discuss locked 2026-04-24)
**Plans**: TBD (4 plans com 5 pausas modo cansado: 7.8-01 adapter `calcularDetalheEncargosContrato` + teste shield, 7.8-02 4ª coluna Resumo Financeiro, 7.8-03 `DecomposicaoSaldoModal.jsx` + print window, 7.8-04 UAT + bump)
**UI hint**: yes (4ª coluna clickable + novo modal + pattern impressão isolado)
**Status**: Planned 2026-04-24 — awaiting /gsd-plan-phase 7.8

### Phase 7.8.1: Pagamento parcial no modal de composição (INSERTED)
**Goal**: Adicionar linha "Pagamento parcial" (com valor negativo, cor vermelha) no `DecomposicaoSaldoModal.jsx` — entre "Valor Original" e "Correção" — pra advogado ver quanto já foi deduzido do principal antes dos encargos. Consumo puro de `detalhe.totalPago` já exposto pelo motor Art.354; zero mudança no motor, zero mudança no adapter. Sub-phase cirúrgica (~10-15 linhas) pós-smoke de 7.8; precedente estrutural = 7.5.1 (fix pós-ship do pai).
**Depends on**: Phase 7.8 (modal e adapter existem; consumo do `totalPago` já exposto)
**Requirements**: (UX — descoberto durante UAT prod da 7.8 pelo usuário)
**Decisions**: ver `.planning/phases/07.8.1-pagamento-parcial-modal-composicao/07.8.1-CONTEXT.md` (discuss locked 2026-04-24)
**Plans**: 2 plans
  - [ ] 07.8.1-01-PLAN.md — Extract totalPago + push condicional Pagamento parcial + useMemo deps (autonomous: true)
  - [ ] 07.8.1-02-PLAN.md — UAT SC-1..SC-3 + bump no pai + autorização de push (autonomous: false, 3 pausas)
**UI hint**: yes (rendering only — label limpa + sinal negativo no valor via `fmtBRLSigned` existente; cor vermelha via `valueColor` existente)
**Status**: Planned 2026-04-24 — plans created, awaiting /gsd-execute-phase 7.8.1

### Phase 7.8.2a: Saldo Atualizado na Listagem de Contratos (cache SWR) (INSERTED)
**Goal**: Levar a coluna "Saldo Atualizado" (Art.354 CC) pra listagem de contratos (`ModuloContratos.jsx`) via cache SWR (stale-while-revalidate) caseiro — singleton Map + fingerprint deep (12 campos motor-relevantes) + pub/sub + 5 gatilhos de revalidação (mount vazio, mount preenchido, window.focus, evento pagamento/doc, virada dia Goiânia). Display-only na célula, row inteira segue navegando pro DetalheContrato. Novo D-05 (callers completude) blinda silent-stale — 6 handlers de mutação em DetalheContrato.jsx + AdicionarDocumento.jsx chamam `invalidateContrato`/`removeContrato` pós-sucesso. Shield grep obrigatório antes do push.
**Depends on**: Phase 7.8 (adapter `calcularDetalheEncargosContrato` em devedorCalc.js:849); Phase 7.8.1 (adapter filtra `allPagamentosDivida` internamente — shield cross-entity D-04)
**Requirements**: (UX — advogado com 200 contratos não consegue ver saldo atualizado na visão agregada sem clicar cada um; descoberto em uso real pós-ship 7.8.1)
**Decisions**: ver `.planning/phases/07.8.2a-saldo-atualizado-listagem-cache-swr/07.8.2a-CONTEXT.md` (discuss locked 2026-04-24, D-01..D-16 + SC1..SC8)
**Plans**: TBD (2 plans propostos: 07.8.2a-01 impl completa 7 arquivos + 07.8.2a-02 UAT SC1-SC8 + bump com 3 pausas humanas)
**UI hint**: yes (nova coluna na tabela + botão "🔄 Atualizar" + timestamp header; display-only na célula, não clicável)
**Status**: Planned 2026-04-24 — awaiting /gsd-plan-phase 7.8.2a

### Phase 7.9: Custas Judiciais CRUD (INSERTED)
**Goal**: Reconstruir UI de CRUD de Custas Judiciais sobre infra existente (motor Art.354 + schema `_so_custas`/`custas: JSONB` + DecomposicaoSaldoModal JÁ suportam custas — descoberta pós-investigação 2026-04-24). Escopo: NovaCustaModal (form único com dropdown de vínculo opcional), 4 services (criarCusta/editarCusta/excluirCusta/togglePagoCusta) com validação cross-contract (SC10 — blindagem 7.8.1-02), amend D-06 fingerprint 12→14 campos (custas summary C + _so_custas flag S), DetalheContrato lista de custas + 4 handlers D-05, DecomposicaoSaldoModal 2 linhas (pagas + em aberto atualizadas). D-05 expande 6→10 handlers. **D-01 motor intocado (risco MÉDIO — reclassificado de ALTO no handoff original)**.
**Depends on**: Phase 7.8 (motor Art.354 + schema `_so_custas`/`custas: JSONB` já suportam); Phase 7.8.2a (hook `useSaldoAtualizadoCache` + fingerprint D-06 amendado em commit `2ba8a9f` — custas summary C + `_so_custas` flag sequence S)
**Requirements**: (UX — advogado precisa lançar custas judiciais nos contratos com correção monetária automática pelo mesmo indexador; UI de CRUD removida em refactor do App.jsx e precisa ser reconstruída)
**Decisions**: ver `.planning/phases/07.9-custas-judiciais-crud/07.9-CONTEXT.md` (discuss locked 2026-04-24, D-01..D-16 herdadas + D-22..D-25 novas + SC1..SC10 + Shield 20 cross-contract isolation)
**Plans**: 2 (07.9-01 impl completa com 9 tasks — fingerprint amend + motor rename D-01 relaxed one-time + NovaCustaModal + services + wiring + Decomposição split + 5 shields + gates + SUMMARY; 07.9-02 UAT SC1-SC10 + bump com 3 pausas humanas)
**UI hint**: yes (botão "Nova Custa" em DetalheContrato + NovaCustaModal form + lista de custas na seção do contrato + 2 linhas separadas no DecomposicaoSaldoModal — pagas e em aberto atualizadas)
**Status**: Planned 2026-04-24 — awaiting /gsd-plan-phase 7.9

### Phase 7.10a: ProcessosJudiciais migra fonte de pagamentos para pagamentos_divida (INSERTED)
**Goal**: Migrar 1º consumidor (mais simples) do state `allPagamentos` legacy para `allPagamentosDivida`. Estratégia atômica: 7.10a = ProcessosJudiciais (folha, 1 cálculo isolado, sem testes acoplados, sem sub-componentes consumindo); 7.10b/c/d = Devedores, ModuloDividas (+sub-componentes), Dashboard em phases futuras. Escopo: App.jsx L8478 troca prop (1 linha) + ProcessosJudiciais.jsx L254 filter adapter via lookup divida_id ∈ dividas-do-devedor (~3 linhas, pattern novo porque `pagamentos_divida` não tem `devedor_id` direto — só FK `divida_id`). Shield 22 (grep callsite positivo + negativo) blinda regressão silenciosa. Shield 23 (equivalência filter, lição H3 da 7.8.2a) testa pattern novo === pattern legacy sintético — defesa contra shape mismatch. **Drift histórico aceito**: writes em `pagamentos_parciais` via UI legacy (App.jsx L2537+) não cortados nesta phase. **D-01 motor 100% intocado**.
**Depends on**: Phase 7.3 (`allPagamentosDivida` state em App.jsx); Phase 7.9 (lições 7.9 SC1 chain aplicadas: helper-first, single-source-of-truth, shape mismatch defense via equivalência)
**Requirements**: (tech debt — pagamentos_parciais é v1.0 legacy, em prod há meses; consumidores precisam migrar pra fonte correta sem big-bang)
**Decisions**: ver `.planning/phases/07.10a-processos-judiciais-pagamentos-divida/07.10a-CONTEXT.md` (discuss locked 2026-04-25, D-01..D-25 herdadas + D-26..D-29 novas + SC1..SC4 + Shield 22 grep + Shield 23 equivalência)
**Plans**: 2 (07.10a-01 impl com Shield 22+23 + gates; 07.10a-02 UAT SC1-SC4 + bump com 2 pausas humanas)
**UI hint**: no (callsite App.jsx + filter adapter ProcessosJudiciais.jsx — UI render inalterado)
**Status**: Planned 2026-04-25 — awaiting /gsd-plan-phase 7.10a

### Phase 7.10.bug: Fix typo `[object Object]` em cadastro de processo judicial (SHIPPED)
**Goal**: Fix typo trivial em 2 callsites de `services/processosJudiciais.js` (`criar()` L40 + `adicionarDevedor()` L62) que produz URL `processos_judiciais[object Object]` no PostgREST. Causa raiz confirmada via investigação 2026-04-27: 4º argumento `{ headers: { Prefer: "return=representation" } }` passado para `sb()` que espera string como 4º arg (`extra = ""`); template literal `${path}${extra}` faz `String({headers:...})` → `"[object Object]"` colado na URL. Header já é hardcoded em `sb()` linha 25, então remoção é idempotente (zero mudança HTTP). Fix de 2 deletions, zero additions. **Bonus:** desbloqueia SC5 (badge forense) + SC22 (filter lookup) da Phase 7.14 que ficaram SKIP por este bug. **D-01 motor INTOCADO** por construção (processosJudiciais.js não é arquivo motor). Bug pré-existente apareceu 3x bloqueando phases (7.10a + 7.13 + 7.14). Lição em `memory/feedback_proc_judiciais_create_bug_preexisting.md` (severidade ALTA).
**Depends on**: nenhum (standalone bugfix); pode ser executada em qualquer momento
**Blocks**: UAT cross-check empírico real de feature ProcessosJudiciais em phases futuras com dependência de cadastro funcional
**Requirements**: (bug pré-existente bloqueante UX — cadastro processo + adição réu; descoberto 2026-04-25 durante UAT 7.10a; reapareceu 7.13 + 7.14)
**Decisions**: ver `.planning/phases/07.10.bug-fix-typo-cadastro-processo-judicial/07.10.bug-CONTEXT.md` (discuss locked 2026-04-27, 3 D-pre simples — D-pre-1 fix 2 linhas, D-pre-2 D-01 INTOCADO, D-pre-3 UAT visual prod com smoke duplo + verificar SC5/SC22 da 7.14 desbloqueados)
**Plans**: 1 plan único (não split — phase trivial). 4-5 tasks, <10 min execução real, 1 commit atomic no submódulo. autonomous:false.
**UI hint**: indireto (sem render new, fix em service layer destrava cadastro processo + adição réu via UI existente)
**Status**: **SHIPPED** 2026-04-27 — tag `v1.4-phase7.10.bug` em `15e5110` pai + `3508bb4` submódulo. Smoke prod mrcobrancas.com.br PASS (SC1+SC2 PASS REAL: cadastro processo MENDES E MENDES LTDA-ME + 2 réus adicionados; SC22 da 7.14 desbloqueado implicitamente). 1 commit atomic submódulo + 2 commits pai. 5 shields cumulative GREEN. 58 testes PASS. <10 min execução real (alinhado com estimativa). LEARNINGS.md gerado: 3 lessons + 1 pattern + 2 surprises. Memory feedback `proc_judiciais_create_bug_preexisting` atualizado com seção RESOLVIDO. Bug pré-existente que bloqueou 3 phases consecutivas (7.10a + 7.13 + 7.14) RESOLVIDO definitivamente.

### Phase 7.10bcd: Migração 3 consumidores (Devedores + ModuloDividas + Dashboard) para pagamentos_divida (INSERTED)
**Goal**: Migrar 3 consumidores legacy lendo `allPagamentos` (alimentado por `pagamentos_parciais` v1.0) para `allPagamentosDivida` (Phase 7.3 fonte correta) em 1 phase com 3 commits atômicos. Estratégia fast-track aceita pelo usuário com 6 mitigations não-negociáveis (M1-M6). Escopo: helper novo `agruparPagamentosPorDevedor.js` (Devedores Map L2986 + Dashboard L568) + Set lookup inline pattern 7.10a (D-27) em TabelaDividas L44 + DetalheDivida L74 + Dashboard L696. 3 commits sequenciais bisect-able: `feat(07.10b): Devedores...` → `feat(07.10c): ModuloDividas...` → `feat(07.10d): Dashboard...`. **D-01 motor 100% intocado** em todos 3.
**Depends on**: Phase 7.10a (pattern Set lookup divida_id ∈ dividas-do-devedor estabelecido em D-27; lições helper-first + schema completeness aplicadas pre-execute)
**Requirements**: (tech debt fast-track — 3 consumidores legacy migrar de uma vez aceitando risco maior; mitigations M1-M6 reduzem risco residual)
**Decisions**: ver `.planning/phases/07.10bcd-migracao-pagamentos-divida-tres-consumidores/07.10bcd-CONTEXT.md` (discuss locked 2026-04-25, D-01..D-29 herdadas + D-30..D-34 novas + SC1..SC7 mandatórios + Shield 24a/b/c grep + helper test trivial)
**Plans**: 2 (07.10bcd-01 impl com 3 commits atômicos + 3 sub-PAUSAs intra-execute; 07.10bcd-02 UAT 7 SCs + bump com 2 PAUSAs)
**UI hint**: no (callsites App.jsx + filter adapters + helper novo — UI render inalterado, valores cross-check via 7 pontos visuais)
**Status**: Planned 2026-04-25 — awaiting /gsd-plan-phase 7.10bcd

### Phase 7.10.bug2: Custas avulsas (`_so_custas:true`) UI bugs — DOIS sub-bugs (BACKLOG, EXPANDIDA 2026-04-26, REVISADA 2026-04-28)

**Sub-bug 1 — Saldo "Calculando..." indefinido em ModuloDividas/TabelaDividas/DetalheDivida (pré-existente desde Phase 7.9):**
- **Causa raiz:** motor `calcularSaldosPorDivida` (`devedorCalc.js` L172-176) filtra `_so_custas` antes do cálculo → `saldosMap[id_so_custas] === undefined` → TabelaDividas L94-96 e DetalheDivida (similar) renderizam "Calculando..." indefinido.
- **Bug pré-existente** desde 7.9 introduction; descoberto durante UAT cross-check da 7.10bcd 2026-04-25 mas **NÃO regressão da 7.10bcd** — comportamento idêntico em PROD 7.10a confirmado.
- **Fix:** (a) detectar `_so_custas:true` na linha; (b) iterar JSONB `custas[]` aplicando `calcularFatorCorrecao` INPC por custa desde data da custa; (c) somar valores atualizados e exibir na coluna "Saldo Atualizado"; (d) repetir lógica em DetalheDivida (single dívida). Helper compartilhado provável: `calcularValorAtualizadoCustasAvulsas(custas, dataInicioAtualizacao, hoje)` em `utils/`. Lição registrada em `memory/feedback_so_custas_ui_calculando_indefinido.md`.

**Sub-bug 2 — Semântica de quitação invertida (NOVO, descoberto durante UAT Phase 7.13 2026-04-26):**
- **Estado atual:** custa marcada `pago=true` aparece como "Quitada R$ 0,00" na UI.
- **Estado correto (advogado/forense):** `pago=true` significa "advogado pagou taxa ao judiciário com próprio dinheiro" (despesa adiantada do escritório). Custa CONTINUA SENDO DÍVIDA do devedor — deve mostrar valor original + correção monetária INPC + status "Em Cobrança", NÃO "Quitada R$ 0,00".
- **Impacto forense (REVISADO 2026-04-28):** fluxo correto é advogado adianta custas processuais e cobra de volta do devedor com correção INPC. Audit técnico 2026-04-28 confirmou: motor `devedorCalc.js:432-444` e `:480-491` IMPLEMENTA esse fluxo corretamente — NÃO lê `c.pago`, soma todas custas com fator INPC. Bug é VISUAL/semântico apenas: badge "Pago em..." em `DetalheContrato.jsx:1115-1116` confunde QUEM pagou (advogado vs devedor) ao usuário operador. Sem perda de receita real. Boolean único `pago` confunde 2 conceitos distintos do fluxo financeiro jurídico no nível de UX.
- **Fix arquitetural:** separar 2 conceitos em `custas[]` JSONB:
  - (a) `pago_advogado` boolean + `data_despesa` (quando advogado pagou ao judiciário; dispara correção INPC)
  - (b) `quitado_devedor` boolean + `data_quitacao_devedor` opcional (quando devedor reembolsou; ESSE zera saldo)
- **Modal Nova Custa:** campo "Data pagamento" atual combina os 2. Deve virar "Data despesa" (obrigatório) + opcional "Data quitação devedor" (separado).
- **Motor:** `calcularSaldosPorDivida` deve usar `quitado_devedor` (não `pago`) para decidir se custa zera saldo.
- Lição registrada em `memory/feedback_custas_semantica_quitacao_dual.md`. Lição transferível: phases que adicionam status `paid/quitado` devem perguntar **"paid POR QUEM e PARA QUEM?"** antes de assumir semântica única.

**Depends on:** nenhum (standalone bugfix); independente de outras phases backlog
**Blocks:** sub-bug 1 — nada crítico (UI mostra "Calculando..." em poucas linhas); sub-bug 2 — UX confuso (badge "Pago em..." sugere quitação devedor quando é despesa adiantada do escritório). Audit 2026-04-28 desconfirmou hipótese inicial de "perda de receita real".
**Severidade combinada:** **MÉDIA-BAIXA** (revisada 2026-04-28; era ALTA antes do audit). Bug visual/semântico — não financeiro real. **NÃO justifica priorizar acima de Phase 8** ou de phases arquiteturais (7.13c).
**Decisions:** TBD em CONTEXT.md futura. Escopo combinado (sub-bugs 1+2): helper `calcularValorAtualizadoCustasAvulsas` (sub-bug 1) + schema migration `custas[]` separar `pago_advogado`/`quitado_devedor` + Modal NovaCusta refatorado + motor opt-in para `quitado_devedor` (sub-bug 2). Regressão test trivial; UAT visual com custas avulsas conhecidas (drift ≤ centavo INPC oficial).
**Plans:** 2-3 plans prováveis (sub-bug 1 + sub-bug 2 podem ser commits/plans separados ou consolidados; decisão pós-discuss). Escopo médio-alto.
**UI hint:** yes (TabelaDividas + DetalheDivida exibem novo valor; Modal NovaCusta refatorado; coluna saldo de custas reflete `quitado_devedor`)
**Status:** Backlog 2026-04-25 (sub-bug 1) + EXPANDIDA 2026-04-26 com sub-bug 2 + **REVISADA 2026-04-28** (severidade rebaixada ALTA → MÉDIA-BAIXA após audit técnico que confirmou motor cobra correção INPC corretamente — bug é apenas VISUAL/semântico em UI badge). Sem prioridade fixa. 7.13c (encargos arquitetural, ALTA verdadeira) prioritária acima desta. Phase 7.14 SHIPPED 2026-04-28 — não bloqueia mais.

### Phase 7.13: Múltiplos Devedores por Contrato (Solidariedade Passiva) (INSERTED)
**Goal**: Suporte a N devedores por contrato com solidariedade passiva (CC art. 264-285 e 818-839). Hoje `contratos_dividas.devedor_id` é single-FK BIGINT NOT NULL. Phase introduz capacidade do advogado cadastrar múltiplos devedores (PRINCIPAL + COOBRIGADO/AVALISTA/FIADOR/CONJUGE/OUTRO) num mesmo contrato, refletido em UI cadastro (DetalheContrato componente multi-devedor + wizard D-pre-13), listagens (ModuloContratos inline `"Mendes (Principal), João (Fiador)"` + Pessoas com saldo cheio para fiador) e detalhes (DetalheDivida read-only). **Implementação reusa junction `devedores_dividas` existente** (Migrações 001+002, 6 papéis + coluna responsabilidade SOLIDARIA/SUBSIDIARIA/DIVISIVEL) — zero migration nova, schema zero-diff. Vinculação no contrato = fan-out N rows na junction (1 por dívida). Carteira Total Dashboard preserva dedupe atual via `papel=PRINCIPAL` filter (App.jsx L597-608) — zero mudança Dashboard. Wizard 2-steps obrigatório (D-pre-13) para promoção a PRINCIPAL com PRINCIPAL anterior existente: dropdown 5 papéis sem default, sobrepõe demoção silenciosa. **D-01 motor 100% intocado.**
**Depends on**: Phase 7.10bcd (helper `agruparPagamentosPorDevedor` estabelecido em D-31; lições helper-first + grep global + DB integration gate + cross-entity UAT isolation aplicadas pre-execute)
**Requirements**: (suporte legal a co-obrigados por contrato — solidariedade passiva real CC art. 264; modelo único via junction nível-dívida com fan-out por contrato; UX Pessoas vira "perspectiva de cobrança individual" — fiador R$ 36.652,56 cheio enquanto Carteira Total preserva dedupe)
**Decisions**: ver `.planning/phases/07.13-multiplos-devedores-contrato-solidariedade-passiva/07.13-CONTEXT.md` (discuss locked 2026-04-26, D-01..D-34 herdadas + D-pre-1..D-pre-14 novas; investigação reverteu 4 das 8 decisões pre-locked do briefing após descoberta da junction `devedores_dividas` JÁ existente com 6 papéis + responsabilidade integrada em Dashboard anti-dupla-contagem)
**Plans**: 2 (07.13-01 impl com 6 commits atômicos no submódulo + Final Gates Task verificação; 07.13-02 UAT 10 SCs + 2 SC-iso cross-entity + bump com pausas humanas)
**UI hint**: yes (componente novo `DevedoresDoContrato` em DetalheContrato + Modal wizard D-pre-13 promoção a PRINCIPAL + listagem inline ModuloContratos + Pessoas saldo cheio para não-PRINCIPAL + DetalheDivida read-only)
**Status**: **SHIPPED** 2026-04-26 — tag `v1.4-phase7.13` em `ba20aa2` pai + `b6fbe20` submódulo. Smoke prod mrcobrancas.com.br PASS. 7 commits cumulativos (6 feat 07.13a-f + 1 fix 07.13f.bug). 16 files +1332/-31. 34/34 tests PASS. D-01 motor INTOCADO cumulativo. Schema zero-diff. 14 D-pre + D-pre-15 deferred. 3 deviations registradas (audit pré-execute + junction pré-existente corrupta + fix-forward 07.13f.bug). UAT visual completo via 2 PAUSAs internas. 3 memory feedbacks novos. Ver `07.13-LEARNINGS.md` (11 decisions + 7 lessons + 9 patterns + 7 surprises).

### Phase 7.14: Blindagens de Integridade de Dados (INSERTED)
**Goal**: Fechar lacunas de validação pré-existentes que afloraram quando features novas (7.13 múltiplos devedores) começaram a exercitar caminhos pouco testados. 4 sub-itens semanticamente conectados: (1) soft delete devedor via `deleted_at TIMESTAMPTZ` — bypassa bug bloqueante prod `eventos_andamento_devedor_id_fkey` sem precisar fixar 12 FKs uma a uma; (2) remover botão "+ Nova Dívida" obsoleto pós-7.5/7.6/7.13 (zero órfãos confirmados em prod); (3) validar criação contrato (UI guard + service throw, defense in depth, lição `db_integration_gate_missing`); (4) paste-friendly BR via `parseInputBR.js` + wrapper `<InputBR>` (escopo restrito a date + value, ~24 inputs; CPF/CNPJ/CEP/tel mantém mask existente). **D-pre-11 exceção forense:** ProcessosJudiciais preserva devedor soft-deleted no polo passivo com badge "Inativo" cinza (advogado pode reabrir caso, defender ação revisional, calcular prescrição). **D-pre-12:** App.jsx:3947 `<DividaForm>` (drawer Pessoas) preservado como caminho legacy aceitável (não cria órfã, herda contrato_id do contexto). **D-01 motor 100% intocado** (gate dual C1 diff + C2 --name-only).
**Depends on**: nenhum (standalone). Lições aplicadas pre-execute: `blindagens_integridade_apos_funcionamento` (esta phase é a consequência) + `cross_entity_uat_isolation` + `helper_fanout_must_cover_motor_inputs` + `db_integration_gate_missing`.
**Requirements**: (bug bloqueante DELETE devedor em prod descoberto durante UAT 7.13; validações schema dormentes expostas; fricção paste BR `DD/MM/AAAA` e `R$ 1.234,56` reportada em uso real)
**Decisions**: ver `.planning/phases/07.14-blindagens-de-integridade-de-dados/07.14-CONTEXT.md` (discuss locked 2026-04-27, 12 D-pre — D-pre-1..D-pre-12 — incluindo D-pre-11 exceção forense ProcessosJudiciais e D-pre-12 preservação App.jsx:3947 drawer Pessoas; investigação SQL prod confirma 6 devedores total + zero órfãos `dividas.contrato_id IS NULL` + bug raiz `eventos_andamento_devedor_id_fkey` sem CASCADE)
**Plans**: 4 plans separados (pattern 7.13 — sub-itens com baseline distinto, commits atômicos bisect-able). Ordem sugerida 02 → 03 → 01 → 04. Total 17-23 tasks, 4-6 commits atômicos minimum. autonomous:false.
**UI hint**: yes (handler `excluirDevedor` vira UPDATE `deleted_at` + badge "Inativo" forense em ProcessosJudiciais.jsx + remoção botão "+ Nova Dívida" + delete `NovaDivida.jsx` + validação UI `NovoContrato.handleSalvar` + wrapper novo `<InputBR>` em `src/components/ui/` + helper novo `src/utils/parseInputBR.js` com 2 parsers).
**Status**: **INSERTED** 2026-04-27 — CONTEXT.md drafted (363 linhas, 12 D-pre, 4 plans dimensionados, 22 SCs UAT propostos). Pendente: `/gsd-plan-phase 7.14`. **Severidade ALTA** pelo sub-item 1 (bug bloqueante real DELETE prod). Banco minúsculo (6 devedores) reduz risco de migration.

### Phase 7.13b: Fila por Contrato — refactor estrutural (SHIPPED)
**Goal**: Refatorar o módulo Fila para puxar **CONTRATOS** (`contratos_dividas`) ao invés de **DEVEDORES**, com ciclo de status/atendimento independente por contrato. 1 contrato = 1 linha. Devedor com N contratos = N linhas (D-pre-5 — repetição aceita). Schema delta: `contratos_dividas.status` TEXT CHECK em 7 valores (em_cobranca, em_localizacao, em_negociacao, notificado, ajuizado, quitado, arquivado) + `eventos_andamento.contrato_id` UUID NOT NULL + TRUNCATE histórico legado (γ — banco minúsculo, decisão de produto). Bug fix incluso (D-pre-8): `filaDevedor.js` hoje aponta para tabela `contratos` inexistente em `entrarNaFila` L253 e `reciclarContratos` L491 — fix-forward natural pelo rewrite total. Helper saldo por contrato (D-pre-12): reusa `calcularDetalheEncargosContrato` em `devedorCalc.js:849` (Phase 7.8 adapter D-02 que envolve motor `calcularDetalheEncargos` D-01 INTOCADO). Side-effects fora do escopo preservados (D-pre-11): `lembretes`/`registros_contato` continuam por devedor_id (Detalhe-Devedor, outro fluxo); Pessoas listing continua por devedor; Dashboard cards de lembretes preservados; Carteira Total dedupe `papel=PRINCIPAL` (7.10bcd) sem cross-impact. Migration robusta a 2 strategies (TRUNCATE preferida, DELETE fallback respeitando RLS).
**Depends on**: Phase 7.14 SHIPPED (D-pre-9 strategy b filter `deleted_at=is.null` aplica em listarFila — consistência cumulativa). Lições aplicadas pre-execute: `proc_judiciais_create_bug_preexisting` (pre-execute audit revelou bug filaDevedor.js dormente em prod — D-pre-8) + `helper_fanout_must_cover_motor_inputs` (audit dos campos lidos pelo motor antes de adapter contrato-level) + `db_integration_gate_missing` (UAT humano essencial pós-migration manual) + `devedores_dividas_corrupted_pre_existing` (audit estado da nova fonte ANTES do CONTEXT — Fila por contrato não passa pela junction, segura) + `grep_global_before_pointwise_fix` (varredura global de stale refs `contratos`/`parcelas` no rewrite).
**Requirements**: (refactor estrutural Fila — alinhar fonte de verdade com modelo 3 níveis Phase 5+6+7.x; status/atendimento per contrato independente entre contratos do mesmo devedor; preservação histórico legado descartada como decisão de produto γ; numeração 7.13b suffix segue precedente 7.5.1/7.8.1/7.8.2a/7.10a/7.10bcd/7.14b — sub-numbering atômico)
**Decisions**: ver `.planning/phases/07.13b-fila-por-contrato/07.13b-CONTEXT.md` (discuss locked 2026-04-27, 12 D-pre — D-pre-1..D-pre-12 — 7 do briefing pré-discuss + 5 da discussão pós-investigação; D-pre-10 migration manual SQL Editor com pre-flight + STRATEGY A/B; D-pre-12 reusa `calcularDetalheEncargosContrato` existente; nota de numeração D-pre local 7.13b com prefixo 7.13/ e 7.14/ para invariantes herdadas)
**Plans**: 3 plans separados (pattern 7.14 — sub-itens com baseline distinto, commits atômicos bisect-able). 7.13b-01 (schema migration + service rewrite + bug fix D-pre-8) → 7.13b-02 (UI Fila reescrita 4 telas) → 7.13b-03 (UAT cross-entity + cleanup). autonomous:false.
**UI hint**: yes (rewrite `FilaDevedor.jsx` 4 telas — FilaPainel/FilaOperador/FilaAtendimento/FilaPesquisa — 1278 linhas; cards recalculados por contrato; toggle "Esconder quitados/arquivados" default ON; busca devedor.nome/cpf retornando contratos múltiplos; `DetalheContrato.jsx` view target sem mudança).
**Status**: **SHIPPED** 2026-04-28 — tag `v1.4-phase7.13b` em `74d514a` pai (chore bump) + `6f69989` submódulo (Plan 03 atomic, dev-convenience local-only). Smoke prod mrcobrancas.com.br PASS — 4 telas Fila por Contrato (FilaPainel/FilaOperador/FilaAtendimento/FilaPesquisa) + console F12 limpo + 2 fixes prod validados (Migration 005 `eventos_andamento_contrato_id_fkey` + Migration 006 `fila_cobranca_contrato_id_fkey`) + D-pre-15 fix useEffect histórico eventos populando. Drift PROD vs LOCAL: ZERO. 3 plans atomic bisect-able submódulo (`9b9e7ca` Plan 01 schema + service rewrite + fix D-pre-8 → `325b964` Plan 02 UI rewrite 4 telas + remoção 3 aliases legacy + Migration 005 → `6f69989` Plan 03 useEffect histórico fix + Migration 006). 6 commits no pai (`78a66a9` insert + `79a6976` plans + `5dc88b5` SUMMARY 01 + `726c252` SUMMARY 02 + CONTEXT D-pre-13/14 + 7.13c BACKLOG + `d833fb3` SUMMARY 03 + LEARNINGS + CONTEXT D-pre-15 + `74d514a` chore bump). 15 D-pre lockeds (12 originais + 3 POST-HOC: D-pre-13 FK órfã eventos_andamento + D-pre-14 encargos sistêmicos → 7.13c + D-pre-15 useEffect histórico promovido de Q-Plan-03). Schema delta cumulative: Migration 004 (status TEXT CHECK 7 valores + contrato_id UUID NOT NULL FK + TRUNCATE histórico legado γ STRATEGY A) + Migration 005 (FK fix eventos_andamento idempotente) + Migration 006 (FK fix fila_cobranca idempotente, 5 blocos com integrity check). Mapa de 7 FKs `*_contrato_id_fkey` auditado em prod 2026-04-28 fechado (6 OK + 1 fixed via Migration 006). 4 bugs UAT cumulative — 3 fixed (D-pre-13 + D-pre-15 + Migration 006) + 1 deferred (D-pre-14 → 7.13c BACKLOG). 12 memory feedbacks indexados em MEMORY.md cumulative pós-7.13b (5 novos: state_snapshot_must_list_all_phase_commits, rewrite_must_audit_useeffects_in_head, fk_audit_post_migration_must_be_wide, q_marks_must_be_promoted_to_dpre, tag_push_apenas_no_pai_chore_bump). LEARNINGS cumulative 245 linhas (15 D-pre + 10 lições + 5 patterns + 5 surprises). D-01 motor INTOCADO cumulative confirmed (devedorCalc + pagamentos + dividas zero modifications nos 3 plans). DetalheContrato.jsx + masks.js + App.jsx INTOCADOS cumulative. 10 tests / 36 asserts em filaDevedor.test.js + 34/34 PASS test:regressao cumulative. UAT cumulative humano detectou TODOS 4 bugs — gates automatizados Plan 01+02 PASSARAM em todos esses casos (lição transferível: UAT cross-tela com console limpo é gate adicional). Banco minúsculo (5 devedores ativos) reduzia risco de migration γ — STRATEGY A (TRUNCATE) aplicada sem perda crítica.

### Phase 7.13c: Encargos — Contrato como Fonte Única (REJECTED — premissa invertida)
**Severidade:** N/A — phase REJECTED. Premissa inicial "contrato é fonte única de encargos" INVERTIDA pelo dono em UAT pré-Plan 02 (Task 3 CHECKPOINT do Plan 01 NEW, ABORT GATE D-pre-7.3 disparado 2026-04-30). Termo de acordo de cada divida define seus próprios encargos — divida é fonte única (não contrato). Motor lê das dividas → comportamento CORRETO. Saldos prod sempre estiveram corretos. Path A puro teria SUB-ESTIMADO cobrança jurídica (M L FRIOS multa 30% legítima viraria 2% errado). Ver `.planning/STATE.md` Roadmap Evolution + `.planning/phases/07.13c-encargos-fonte-unica/07.13c-LEARNINGS.md`.

**Goal:** Resolver inconsistência sistêmica entre encargos cadastrados em `contratos_dividas` (verdade declarada pelo usuário) e encargos lidos pelo motor das dívidas individuais. **Path A puro locked**: adapter `calcularDetalheEncargosContrato` recebe `contrato` como 1º arg e sobrescreve 7 campos de encargo no `pseudoDevedor.dividas` ANTES de delegar ao motor; populator (`App.jsx:8418-8428`) enriquece dividas com encargos do contrato pra consumo via `App.jsx:2040` (Pessoas). D-01 motor `calcularDetalheEncargos` INTOCADO. Sem migration de dados — drop colunas redundantes em `dividas` DIFERIDO pra phase futura (D-pre-4).
**Trigger:** UAT 7.13b PAUSA #1-RETOMADA descobriu drift entre `contratos_dividas` (multa 2%, honor 10%) e `dividas` (multa 30%, honor 0%) no contrato M L FRIOS UUID `335a2ad2-9481-4836-a88a-55fbe6375827`. Audit prod 2026-04-29 (Q1+Q2 executadas): 3 contratos com drift / 147 dívidas afetadas + 0 rows de heterogeneidade intra-contrato (Path A não viola nenhum invariant prod). Q3 (impacto financeiro quantitativo) deferido ao Plan 02 via comparison report SQL puro.
**Depends on:** Phase 7.13b SHIPPED (D-pre-12 reusa `calcularDetalheEncargosContrato` em devedorCalc.js:849, agora refatorado pra receber contrato como 1º arg). Lições aplicadas pre-execute: `schema_adapter_long_short_form_consumer_replication` (Path A é aplicação direta deste feedback) + `uat_humano_pega_bugs_que_gates_automatizados_nao_pegam` (Plan 02 ABORT GATE D-pre-7.3 explícito) + `memory_must_factcheck_codebase_before_claiming_severity` (severidade ALTA confirmada por audit prod factual: 3 contratos / 147 dívidas) + `shield_wrapper_must_test_equivalence` (Plan 01 test inclui shield de equivalência adapter ↔ motor pro caso degenerado zero drift).
**Requirements**: (bug sistêmico financeiro retroativo descoberto em UAT 7.13b POST-HOC D-pre-14; numeração 7.13c sufixo segue precedente 7.5.1/7.8.1/7.8.2a/7.10a/7.10bcd/7.13b — sub-numbering atômico)
**Decisions**: ver `.planning/phases/07.13c-encargos-fonte-unica/07.13c-CONTEXT.md` (Path A puro locked PAUSA #1 2026-04-29, 7 D-pre top-level + 6 sub-numbered: D-pre-1 (7 campos per-CONTRATO: indice_correcao, juros_tipo, juros_am_percentual, multa_percentual, honorarios_percentual, art523_opcao, despesas), D-pre-2 (4 campos per-DIVIDA: data_inicio_atualizacao, custas, valor_total, data_vencimento), D-pre-3.1 (standalone `contrato_id IS NULL` back-compat) + D-pre-3.2 (enriquecimento populator) + D-pre-3.3 (callsites com contrato explícito), D-pre-4 (drop colunas redundantes DIFERIDO), D-pre-5 (snapshot histórico NÃO + validação humana caso a caso), D-pre-6 (EDT-04 reconciliada — template na escrita, contrato na leitura), D-pre-7.1 (SQL puro) + D-pre-7.2 (formato 5 categorias: Principal/Juros/Multa/Honor./Correção/TOTAL) + D-pre-7.3 (ABORT GATE)). Ver tb `07.13c-AUDIT-PROD.md` (133 linhas, Q1+Q2 executadas + Q3 referência diferida ao Plan 02).
**Plans**: 3 plans separados (pattern 7.13b/7.14 — atomic bisect-able). 7.13c-01 (adapter refactor + populator + 4 callsites + tests com shield equivalência) → 7.13c-02 (comparison report SQL puro + UAT humano + ABORT GATE D-pre-7.3) → 7.13c-03 (deploy + smoke prod + tag `v1.4-phase7.13c`). autonomous:false.
**UI hint:** no — só fix de fonte de dados (UI permanece igual, mas com saldo correto pós-deploy).
**Status:** **REJECTED** 2026-04-30 — ABORT GATE D-pre-7.3 disparado em UAT pré-Plan 02 (Task 3 CHECKPOINT do Plan 01 NEW). Premissa arquitetural inicial INVERTIDA: usuário clarificou que termo de acordo de cada divida define seus próprios encargos (divida é fonte única, não contrato). Motor lê das dividas → comportamento CORRETO; saldos prod sempre estiveram corretos. Path A puro teria SUB-ESTIMADO cobrança jurídica. 5 commits stacked bf080a2..752fbeb mantidos como audit trail (CONTEXT incorreto + AUDIT-PROD + insert + plans + references). Plan 02 + Plan 03 NÃO executados; Plan 01 NEW parcialmente executado (Task 1 + Task 2 COMPARISON.md preserved). Warning DECISÕES FINANCEIRAS RETROATIVAS REMOVIDO (era falso alarme). UI cleanup (campos `contratos_dividas.*_percentual` confusos) deferred to **Phase 7.13d BACKLOG** severidade BAIXA. Ver `.planning/phases/07.13c-encargos-fonte-unica/07.13c-LEARNINGS.md` (4 lições transferíveis incluindo ABORT GATE funcional + necessidade de validar D-pre POST-HOC herdadas).

### Phase 7.14b: Remover botão "+Nova Dívida" do drawer Pessoas/Devedores (BACKLOG, NOVA 2026-04-27)
**Goal**: Remover callsite legacy `<DividaForm>` em `App.jsx:3947` (drawer Pessoas/Devedores → aba Dívidas) que contradiz spirit de D-pre-6 da 7.14 ("dívida sempre via DetalheContrato → +Adicionar Documento"). Preservado como caminho legacy aceitável durante 7.14 via D-pre-12 — usuário considerou após Plan 02 7.14 UAT que o callsite deve ser removido em phase futura.
**Severidade**: BAIXA (UX consistência — não cria dívida órfã, herda contrato_id do contexto)
**Trigger**: usuário considerou após Plan 02 7.14 UAT que esse callsite legacy contradiz spirit D-pre-6
**Decisão da sessão**: deferred pra 7.14b por princípio anti-mid-flight (lição 7.13 Q1 reconsidered + lição 7.13 sub-item formulário inline — não expandir surface de phase ativa).
**Depends on**: Phase 7.14 SHIPPED em prod + 1-2 dias de uso real do usuário (validar se há regressão de UX antes de remover)
**Escopo (~15min execução)**:
- Remover botão "+ Nova Dívida" e form em `App.jsx:3947` + linha 32 import `DividaForm`
- Grep verificação zero refs `DividaForm` em `App.jsx`
- Decidir: deletar `DividaForm.jsx` (consumer único agora removido) OU manter por aceitação legacy
- 1 SC UAT (drawer Pessoas/Devedores → aba Dívidas → form ausente)
**Plans**: TBD (1 plan trivial)
**UI hint**: yes (remoção UI App.jsx drawer)
**Status**: Backlog 2026-04-27 — reabrir após 7.14 SHIP em prod e usuário usar por 1-2 dias

### Phase 7.13d: Encargos Defaults Vazios — NovoContrato wizard (INSERTED 2026-04-30)
**Severidade:** BAIXA — UX cleanup, não bug financeiro (escopo trivial mas dor UX real)
**Goal:** Remover defaults arbitrários hardcoded em `NovoContrato.ENCARGOS_PADRAO` (multa 2%, juros 1%, honor 10%, igpm, fixo_1) que operador apaga + redigita a cada cadastro. Path E: 5 campos críticos vazios + validação obrigatória client-side + "— Selecione —" disabled em dropdowns. `art523_opcao` e `despesas` mantêm defaults semânticos. `juros_am_percentual` condicional (crítico só se `juros_tipo === "outros"`). Cascata em `AdicionarDocumento` alinha (fallback `?? ""`). D-01 motor INTOCADO trivialmente.
**Trigger:** Descoberta na Phase 7.13c REJECT (TASK 0 com dono 2026-04-30) — investigação pré-discuss original assumiu UI Diretrizes confusa em DetalheContrato (Path C); operador real reportou OUTRA dor: fricção de cadastro NovoContrato wizard. Phase redirecionada de Path C → Path E sem custo de implementação errada.
**Depends on:** nenhuma — phase independente
**Decisions:** ver `.planning/phases/07.13d-encargos-defaults-vazios/07.13d-CONTEXT.md` (Path E locked PAUSA #1 2026-04-30, 5 D-pre lockeds: D-pre-1 5 campos críticos vazios + nota condicional juros_am, D-pre-2 2 defaults semânticos mantidos, D-pre-3 validação client-side bloqueia submit + nota condicional juros_am, D-pre-4 dropdowns "— Selecione —" disabled, D-pre-5 AdicionarDocumento fallback alinhado). Discuss formal SKIPPED — briefing v2 substantivo, Q1-Q5 respondidas pelo orchestrator.
**Plans:** 1 plan único (`07.13d-01-PLAN.md`), 5 tasks, ~25-30 linhas em 2-3 arquivos. autonomous:false.
**UI hint:** yes (NovoContrato + AdicionarDocumento + DiretrizesContrato).
**Status:** **INSERTED** 2026-04-30 — CONTEXT.md (~180 linhas) commitado no pai. Path E locked. Pendente: `/gsd-plan-phase 7.13d`. Memory feedbacks aplicados: uat_humano_pega_bugs_que_gates_automatizados_nao_pegam + post_hoc_d_pre_must_be_validated_in_child_phase + discuss_walkthrough_fluxo_real.

### Phase 8: PDF Demonstrativo (v1.4)
**Goal**: Advogado pode gerar um PDF demonstrativo de débito profissional do contrato com um clique — documento pronto para enviar ao devedor ou anexar em execução judicial, contendo parcelas atualizadas pelos encargos do contrato, pagamentos recebidos e totais finais
**Depends on**: Phase 7 (dados de pagamentos por contrato necessários para totais e lista de pagamentos recebidos no PDF)
**Requirements**: PDF-01, PDF-02, PDF-03, PDF-04
**Success Criteria** (what must be TRUE):
  1. Advogado clica "Gerar PDF" no DetalheContrato e o navegador baixa um arquivo PDF sem recarregar a página
  2. PDF contém tabela de parcelas com colunas: # | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo — onde Valor Atualizado reflete encargos do contrato até a data de emissão
  3. PDF contém seção de pagamentos recebidos com data, valor e parcelas amortizadas de cada lançamento
  4. PDF contém cabeçalho com dados do escritório (hardcoded), linha de totais (Valor Total Atualizado + Total Pago + Saldo Devedor) e rodapé jurídico
**Plans**: TBD
**UI hint**: yes

## Deploy Notes — SQL Migrations (v1.3)

As migrations abaixo foram executadas manualmente no Supabase SQL Editor durante o desenvolvimento/UAT.
**Re-executar em produção antes do deploy.**

### Migration 1 — Tabela contratos_historico

```sql
CREATE TABLE IF NOT EXISTS public.contratos_historico (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     UUID         NOT NULL REFERENCES public.contratos_dividas(id) ON DELETE CASCADE,
  tipo_evento     TEXT         NOT NULL CHECK (tipo_evento IN (
                                 'criacao', 'alteracao_encargos', 'cessao_credito',
                                 'assuncao_divida', 'alteracao_referencia', 'outros')),
  snapshot_campos JSONB        NOT NULL DEFAULT '{}',
  usuario_id      UUID         DEFAULT auth.uid(),
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
ALTER TABLE public.contratos_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.contratos_historico
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_contratos_historico_contrato_id
  ON public.contratos_historico (contrato_id, created_at DESC);
```

### Migration 2 — Corrigir tipo de contratos_dividas.credor_id (UUID → BIGINT)

Schema legado v1.0 definia `credor_id UUID` mas `credores.id` é BIGINT. Corrigido durante UAT.

```sql
-- Zerar valores existentes (eram UUIDs inválidos ou NULL) antes de converter
UPDATE public.contratos_dividas SET credor_id = NULL;
ALTER TABLE public.contratos_dividas
  ALTER COLUMN credor_id TYPE BIGINT USING NULL;
```

> **Nota**: se houver dados de produção com `credor_id` preenchido como UUID válido referenciando
> a tabela `credores`, fazer mapeamento UUID → BIGINT antes de executar. Em ambiente de dev/staging
> todos os valores eram NULL ou inválidos — truncate seguro.

## Deploy Notes — SQL Migrations (v1.4)

Migrations a executar no Supabase SQL Editor antes do deploy de v1.4.

### Migration 3 — ALTER CHECK constraint em contratos_historico (Phase 7, plan 7-1)

```sql
-- Adicionar 'pagamento_recebido' e 'pagamento_revertido' ao CHECK constraint existente.
-- Executar ANTES de qualquer código de service da Phase 7.
ALTER TABLE public.contratos_historico
  DROP CONSTRAINT IF EXISTS contratos_historico_tipo_evento_check;
ALTER TABLE public.contratos_historico
  ADD CONSTRAINT contratos_historico_tipo_evento_check
  CHECK (tipo_evento IN (
    'criacao', 'alteracao_encargos', 'cessao_credito',
    'assuncao_divida', 'alteracao_referencia', 'outros',
    'pagamento_recebido', 'pagamento_revertido'
  ));
```

### Migration 4 — Stored procedures (Phase 7, plan 7-1)

Stored procedures `registrar_pagamento_contrato` e `reverter_pagamento_contrato` serão definidas em 07-01-PLAN.md com PL/pgSQL completo.

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Refatoração Pessoas × Dívidas | v1.0 | 6/6 | Complete | 2026-04-20 |
| 2. Módulo Dívidas no Sidebar | v1.0 | 4/4 | Complete | 2026-04-20 |
| 3. Nova Dívida com Co-devedores | v1.0 | 5/5 | Complete | 2026-04-20 |
| 4. Pagamentos por Dívida | v1.1 | 5/5 (+1 backlog) | **Complete** | 2026-04-21 |
| 5. Contratos com Parcelas | v1.2 | 5/5 | **Complete** | 2026-04-22 |
| 6. Edição de Contrato + Histórico | v1.3 | 3/3 (+3 UAT fixes) | **Complete** | 2026-04-22 |
| 7. Pagamentos por Contrato | v1.4 | 0/4 | Not started | - |
| 7.1. Fix Histórico Pagamentos | v1.4 gap | 1/1 | **Complete** | 2026-04-23 |
| 7.2. Excluir Contrato (INSERTED) | v1.4 gap | 1/1 | **Complete** (shipped) | 2026-04-23 |
| 7.3. Fix Pagamentos Parciais Resumo e Listagem (INSERTED) | v1.4 gap | 1/1 | **Complete** (shipped) | 2026-04-23 |
| 7.4. Cache Headers Vercel (INSERTED) | v1.4 gap | 1/1 | **Complete** (shipped) | 2026-04-23 |
| 7.5. Parcelas com Datas e Valores Customizados (INSERTED) | v1.4 gap | 0/1 | Planned | - |
| 8. PDF Demonstrativo | v1.4 | 0/2 | Not started | - |
