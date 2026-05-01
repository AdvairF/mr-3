---
phase: 8
title: PDF Demonstrativo do Contrato
status: INSERTED
inserted_date: 2026-05-01
severidade: MÉDIA
milestone: v1.4
ui_hint: yes
autonomous: false
---

# Phase 8 — PDF Demonstrativo do Contrato

## 1. Problem statement

Hoje o advogado consegue visualizar o **resumo financeiro atualizado de um contrato** dentro do `DetalheContrato.jsx` (cabeçalho do contrato + parcelas + custas + pagamentos + saldo atualizado calculado pelo motor Art.354 D-01), mas **não consegue exportar esse demonstrativo** em formato profissional pra:

1. **Anexar em petição judicial** — execução de título extrajudicial, embargo, ação revisional, contestação. Juiz exige memória de cálculo formal, não screenshot.
2. **Enviar pro devedor** — comunicação de débito atualizado pré-execução. Devedor pede "papel timbrado" antes de aceitar quitação.
3. **Conciliação contábil** — auditoria do escritório, envio pro contador, fechamento mensal.
4. **Backup forense** — snapshot do estado do contrato em data específica (data de emissão = data de cálculo do PDF).

Existem **2 patterns PDF no codebase**:
- **Pattern A — jsPDF programático** (App.jsx `imprimirFicha` L1885 + `gerarPlanilhaPDF` L2597 + `exportarPDF` Calculadora L~5760) — controle exato sobre layout, download direto via `doc.save()`.
- **Pattern B — HTML auto-contido + `window.print()`** (DecomposicaoSaldoModal L165 + GerarPeticao L1011) — Times New Roman serif, requer Ctrl+P manual do usuário, D-13 invariante "ZERO @media print no app principal".

Phase 8 **escolhe Pattern A** (download direto, layout tabular complexo, alinhamento com `gerarPlanilhaPDF` template). Ver D-pre-1.

## 2. Goal

Botão **"Gerar PDF"** no header do `DetalheContrato.jsx` (L709-714, adjacente a "Editar Contrato" / "Excluir Contrato"). Ao clicar:

1. Aciona handler `handleGerarPDF` (state `gerandoPDF` true → Spinner inline no botão, disabled durante geração)
2. Handler delega ao utility module `src/utils/pdfDemonstrativo.js` (NEW)
3. Utility:
   - Carrega jsPDF via CDN dinâmico (pattern existente `https://cdnjs.cloudflare.com/.../jspdf.umd.min.js`)
   - Chama `listarDevedoresDoContrato(contratoId)` para obter `[{ devedor_id, papel, responsabilidade }]` da junction `devedores_dividas`
   - Chama `calcularDetalheEncargosContrato(contrato, dividas, allPagamentosDivida, hoje)` (D-02 adapter Phase 7.8) para obter cálculo motor INTOCADO
   - Renderiza PDF A4 portrait com 7 seções:
     - **Cabeçalho**: dados do escritório (4 constants placeholders pré-Execute — `NOME_ESCRITORIO`/`ENDERECO_ESCRITORIO`/`TELEFONE_ESCRITORIO`/`EMAIL_ESCRITORIO`) + data de emissão + número/referência do contrato. **Sem nome do advogado, sem OAB, sem assinatura individual** (D-pre-13)
     - **Identificação das partes**: credor (nome + CPF/CNPJ via lookup `contrato.credor_id` em `credores` prop) + devedores (nome + CPF/CNPJ + papel + responsabilidade via `listarDevedoresDoContrato` + lookup `devedores` prop)
     - **Resumo financeiro**: 11 campos do retorno motor (`detalhe.valorOriginal` + `detalhe.multa.valor` + `detalhe.honorarios.valor` + `detalhe.correcao.valor` + `detalhe.juros.valor` + `detalhe.custas.atualizado` + `detalhe.art523.multa` + `detalhe.art523.honorarios` + total_atualizado computado [`valorOriginal + totalEncargos`] + `detalhe.totalPago` + `detalhe.saldoAtualizado`) — shape camelCase aninhado herdado de `calcularDetalheEncargos` D-01 motor (audit shape Step 1.0 PASS 2026-05-01)
     - **Tabela parcelas**: `# | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo` (req PDF-02)
     - **Custas judiciais**: discriminadas com correção INPC por custa (Q3 workaround α — ignora `c.pago` boolean)
     - **Pagamentos recebidos**: data + valor + parcelas amortizadas (req PDF-03)
     - **Rodapé**: nota legal Art.354 amortização sequencial (sem assinatura individual — escritório identificado no cabeçalho via D-pre-13)
   - Trigger download via `doc.save("demonstrativo_contrato_<referencia>_<YYYYMMDD>.pdf")`
4. Toast success ("PDF gerado com sucesso") ou error ("Erro ao gerar PDF: <msg>")

## 3. Decisions locked (D-pre)

| ID | Decisão | Trigger | Origem |
|---|---|---|---|
| **D-pre-1** | Pattern A jsPDF programático (não Pattern B HTML+window.print) | Q1 audit Sub-passo 2.A — req PDF-01 "download sem reload" + 3 templates jsPDF existentes + sem CSS print risk D-13 | operador 2026-05-01 |
| **D-pre-2** | Utility module `src/utils/pdfDemonstrativo.js` (função pura async, não inline em DetalheContrato.jsx ou App.jsx) | Q2 audit — App.jsx já massivo (~6000+ linhas), DetalheContrato 1351 linhas, função pura facilmente testável isolada | operador 2026-05-01 |
| **D-pre-3** | Custas: workaround α — todas exibidas com correção INPC via `calcularFatorCorrecao`, ignora `c.pago` boolean | Q3 — motor `devedorCalc.js:432-444/480-491` audit 2026-04-28 confirmou que cobra INPC corretamente; bug2 sub2 (semântica dual `pago_advogado`/`quitado_devedor`) é BACKLOG MÉDIA-BAIXA, NÃO bloqueia Phase 8 | operador 2026-05-01 |
| **D-pre-4** | Source motor: `calcularDetalheEncargosContrato(contrato, ...)` (Phase 7.8 D-02 adapter, já importado em DetalheContrato.jsx:15) | Q4 — adapter contrato-level, encapsula motor D-01 INTOCADO, alinhado com SC-1 ROADMAP "demonstrativo do contrato" | operador 2026-05-01 |
| **D-pre-5** | Botão entra em `DetalheContrato.jsx` L709-714 header (paleta cor teal `#0d9488` igual "+ Adicionar Documento" L1170) | Q5 audit Sub-passo 2.A.5 — máxima visibilidade, adjacente a ações primárias do contrato (Editar/Excluir) | operador 2026-05-01 |
| **D-pre-6** | Async data: usar `allPagamentosDivida` prop direto (sem fetch adicional), pular `pagamentosContrato` state interno do DetalheContrato | Q6 — `allPagamentosDivida` é fonte canônica desde Phase 7.3 (alimentada por SP `registrar_pagamento_contrato`), função pura, sem race conditions | operador 2026-05-01 |
| **D-pre-7** | Devedores: query direto via `listarDevedoresDoContrato(contratoId)` em `services/devedoresDividas.js:95`. Skip hook React `useDevedoresDoContrato`, skip component JSX `DevedoresDoContrato.jsx`. Credor: lookup via `contrato.credor_id` no array `credores` prop (mesma fonte que UI já usa em DetalheContrato.jsx L703) | Q7 audit Sub-passo 2.A.6 — service stand-alone async function, returns DISTINCT por devedor_id, enrichment trivial via lookup `devedores` array prop | operador 2026-05-01 |
| **D-pre-8** | Filename pattern: `demonstrativo_contrato_<referencia_sanitizada>_<YYYYMMDD>.pdf`. Fallback se referência vazia/null: `demonstrativo_contrato_<contratoId_8chars>_<YYYYMMDD>.pdf`. Sanitização: `.replace(/[^a-zA-Z0-9_-]/g, "_")` | Q8 — ordenável alfabeticamente (data ISO sem separadores), inclui referência, fallback evita arquivos com nome inválido | operador 2026-05-01 |
| **D-pre-9** | `PAPEL_META` (papel→label PT-BR) clonado verbatim no utility (não extrair pra `utils/papelMeta.js`). Pattern coerente com clone consciente já presente em DevedoresDoContrato.jsx L7-9 | Phase 8 não é phase de refactor; cleanup compartilhado vira phase futura housekeeping se padrão se confirmar | operador 2026-05-01 |
| **D-pre-10** | **D-01 motor INTOCADO** — PDF é puro consumer; zero modificação em `devedorCalc.js`, `services/pagamentos.js`, `services/dividas.js`. Gate dual cumulative (4a working tree + 4b post-commit `git log --name-only`) | Invariante histórica desde Phase 7.8 — protege motor Art.354 contra drift | cumulative |
| **D-pre-11** | **D-13 invariante CSS print preservada** — Pattern A jsPDF não usa `@media print` no app principal. Trivialmente preservado | Invariante histórica DecomposicaoSaldoModal/GerarPeticao | cumulative |
| **D-pre-12** | **Schema INTOCADO** — zero Migration nova. Phase 8 só lê dados existentes (contratos_dividas, dividas, pagamentos_divida, devedores_dividas, contrato.custas JSONB) | Phase 8 é READ-only no banco | trivialmente |
| **D-pre-13** | **Identificação no PDF é pelo ESCRITÓRIO**, NÃO pelo advogado pessoa física. Cabeçalho usa 4 constants no utility: `NOME_ESCRITORIO = "MR Cobranças"` (definido) + `ENDERECO_ESCRITORIO` + `TELEFONE_ESCRITORIO` + `EMAIL_ESCRITORIO` (3 placeholders `[PREENCHER ANTES DO EXECUTE PHASE 8]` pré-Execute). Identificação das partes (credor + devedores com papéis + CPF/CNPJ) vem do contrato dinâmico. **REMOVIDO**: nome do advogado, OAB, assinatura individual | Operador 2026-05-01 — escolha de design profissional. Cobrança forense pelo escritório como PJ é mais comum e desacopla de mudanças individuais (sócio sai/entra, OAB transferida, etc) | operador 2026-05-01 |

## 4. Acceptance criteria (Success Criteria — UAT)

| SC | Critério | Notas |
|---|---|---|
| **SC-1** | Botão "Gerar PDF" visível no header DetalheContrato (L709-714, adjacente Editar/Excluir) | Cor teal `#0d9488`, ícone 🖨️ (espelha imprimirFicha L4154) |
| **SC-2** | Click gera download de PDF com nome conforme padrão D-pre-8 | Validar 2 cenários: (a) contrato com referência → `demonstrativo_contrato_NF001_20260501.pdf`; (b) contrato sem referência → `demonstrativo_contrato_<id8>_20260501.pdf` |
| **SC-3** | PDF seção identificação mostra credor (lookup `credores` via contrato.credor_id, com nome + CPF/CNPJ) + **TODOS** devedores com papéis (Phase 7.13 — PRINCIPAL + N coobrigados/avalistas/fiadores/cônjuge/outros) + responsabilidade + CPF/CNPJ por devedor | Audit prod 2026-05-01 confirmou cenário β: 2 contratos reais multi-devedor disponíveis (PRIMÁRIO TRADIO `ce7b8d47-...` ref `"ACORDO"` + BONUS ROCHA FASHION `335a2ad2-...` ref NULL — testa SC-2 fallback id8). **Cobaia advair NÃO necessária**. M L FRIOS originalmente referenciado era memory drift (UUID `335a2ad2-...` = ROCHA FASHION COBRANCAS LTDA, não M L FRIOS) |
| **SC-4** | PDF tabela parcelas mostra `# | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo` para todas dívidas regulares | "Valor Atualizado" reflete encargos do contrato até data de emissão; "Pago" mostra soma `allPagamentosDivida` por dívida; "Saldo" = atualizado - pago |
| **SC-5** | PDF custas judiciais discriminadas com correção INPC por custa (workaround α D-pre-3) | Cada custa mostra: descrição + data despesa + valor original + valor atualizado INPC. Boolean `c.pago` ignorado. |
| **SC-6** | PDF pagamentos recebidos mostra data + valor + parcelas amortizadas | Source: `allPagamentosDivida` filtrado por dívidas do contrato. Ordenado por data crescente. |
| **SC-7** | PDF rodapé com nota legal Art.354 amortização sequencial. Cabeçalho com dados do escritório (4 constants `NOME_ESCRITORIO` + `ENDERECO_ESCRITORIO` + `TELEFONE_ESCRITORIO` + `EMAIL_ESCRITORIO`) — D-pre-13 | **Validar que os 4 placeholders foram preenchidos pré-UAT** (caso contrário, falha SC-7). Sem nome do advogado, sem OAB, sem assinatura individual |
| **SC-8** | Loading state durante geração: botão `disabled={gerandoPDF}` + Spinner inline | Pattern canônico DetalheContrato L750-751 (Salvar) |
| **SC-9** | Toast success/error pós-geração via `react-hot-toast` | Pattern canônico L343/396/417/438/468 |

## 5. Memory feedbacks aplicáveis (pre-execute)

| Feedback | Aplicação Phase 8 |
|---|---|
| `feedback_blindagens_integridade_apos_funcionamento` | Phase 8 fecha v1.4. Pre-execute walkthrough deve incluir "tentar quebrar": contrato sem dividas (vazio); contrato sem custas; contrato sem pagamentos; contrato sem devedor PRINCIPAL (junction corrompida pré-existente); referência null/empty/special-chars |
| `feedback_db_integration_gate_missing` | Gates Plan 01 não pegam fetch real `listarDevedoresDoContrato`. UAT humano essencial em prod com contrato multi-devedor real |
| `feedback_helper_fanout_must_cover_motor_inputs` | PDF é consumer do motor — verificar que pdfDemonstrativo lê TODOS campos retornados por `calcularDetalheEncargosContrato` (audit pre-execute do shape do retorno) |
| `feedback_uat_humano_pega_bugs_que_gates_automatizados_nao_pegam` | PDF é VISUAL — gates automatizados (build + test:regressao + grep) não pegam: layout quebrado (overflow), valores formatados errados, fontes ausentes, paginação errada, dados faltando. UAT humano com PDF aberto é gate primário |
| `feedback_helper_signature_mirror_motor_return_shape` | utility `gerarDemonstrativoPDF` deve consumir `calcularDetalheEncargosContrato` retornando shape canônico (não criar adapter intermediário) |
| `feedback_ux_consistency_principle_drives_scope_expansion` | **Vigilância**: pattern aplicado 3x em phases anteriores (7.14b + 7.10.bug2.sub1 + 7.10.bug3). Possível gatilho em Phase 8: operador pode pedir mid-UAT "também adiciona botão Imprimir Ficha do Devedor no PDF Demonstrativo" ou similar. **Resposta**: defer expansion → phase futura, NÃO mid-execute |
| `feedback_abort_gate_during_execution_can_reduce_scope` | Plan deve incluir ABORT GATE pré-render PDF: se contrato sem dividas+custas+pagamentos (vazio total) → cancelar geração com toast informativo, NÃO renderizar PDF vazio |
| `feedback_memory_must_factcheck_codebase_before_claiming_severity` | Severidade MÉDIA registrada (feature, wrap milestone) — factchecked: Phase 8 é último item v1.4 ROADMAP |
| `feedback_grep_global_before_pointwise_fix` | **Vigilância UAT**: durante UAT 9 SCs, monitorar drift UI↔PDF — se algum dado em DetalheContrato UI não bater com mesmo dado no PDF (ex: saldo atualizado, total pago), indica drift. Investigar shape do retorno do motor (UI vs PDF rendering) antes de patch pontual |
| `feedback_state_snapshot_must_list_all_phase_commits` | **Task 5 commit message**: incluir SHA submódulo (feat) + SHA pai (chore bump) + tag `v1.4-phase8` no body do commit. Pattern espelha 7.10.bug3 commit body (5b559f0) |

## 6. Risks identificados

| ID | Risco | Probabilidade | Mitigação |
|---|---|---|---|
| **R-1** | CDN jsPDF requer internet ativa. Sem fallback offline, escritório com Wi-Fi instável pode não conseguir gerar PDF | Baixa (escritório urbano com banda larga) | Documentar dependência no CONTEXT + LEARNINGS. Phase futura pode npm-instalar jspdf como dep direto pra eliminar CDN. Toast error claro se CDN falhar ("Sem conexão. Verifique sua internet.") |
| **R-2** | Layout tabular complexo em jsPDF (parcelas grandes — ex: contrato com 60 parcelas + 10 custas + 20 pagamentos) pode quebrar paginação | Média | Reusar pattern `checkPage(yPos, needed = 20)` de `imprimirFicha` L1935 (auto-paginação a 280mm). Test com contrato real grande durante UAT |
| **R-3** | Async data dependencies — `listarDevedoresDoContrato` async fetch + `calcularDetalheEncargosContrato` síncrono motor + `allPagamentosDivida` prop. Race conditions possíveis se prop atualizar mid-fetch | Baixa | D-pre-6 já usa prop síncrono; D-pre-7 service async com await sequencial; handler `handleGerarPDF` é async function | 
| **R-4** | Filename collision se 2+ contratos têm mesma referência + mesmo dia geração | Muito baixa (referência tipicamente única; YYYYMMDD reduz colisão; navegador adiciona "(1)", "(2)" auto) | Aceitar comportamento do navegador. Se issue real surgir, phase futura adiciona HHMMSS no filename |
| **R-5** | Encoding/charset PDF — caracteres acentuados (ç, ã, é) podem renderizar incorretos com fonte default Helvetica | Média | jsPDF Helvetica suporta Latin-1 nativo; já validado em `imprimirFicha` (renderiza nomes BR sem issue). Se problema surgir em UAT, switch pra `doc.setFont("times", "normal")` |
| **R-6** | Dados escritório placeholder pré-Execute. Operador pode esquecer de preencher antes de iniciar Plan 01 Task 1, gerando PDF com `[PREENCHER ANTES DO EXECUTE PHASE 8]` visível no header | Baixa-Média (gate cobre, mas humano pode pular) | **Plan 01 Task 1 começa com gate explícito**: validar que os 4 constants (`NOME_ESCRITORIO` + `ENDERECO_ESCRITORIO` + `TELEFONE_ESCRITORIO` + `EMAIL_ESCRITORIO`) têm valores reais (string não contém "PREENCHER" e length > 0). Se algum for placeholder, **Task 1 ABORTA** e pede valores pro operador antes de prosseguir |

## 7. Plans estimados (preview)

**1 plan único** estimado em ~3-4 horas execute futuro (Task 1 utility ~300-500 linhas + Task 4 UAT 9 SCs com possível iteração de layout em PDF visual):

- **Plan 08-01: PDF Demonstrativo do Contrato** (autonomous: false)
  - **Task 1**: Criar `src/utils/pdfDemonstrativo.js` — função pura async `gerarDemonstrativoPDF(contrato, dividas, devedores, credores, allPagamentosDivida, hoje)`.
    - **Pre-flight gate (PRIMEIRO)**: validar que `ENDERECO_ESCRITORIO` + `TELEFONE_ESCRITORIO` + `EMAIL_ESCRITORIO` têm valores reais (string não contém "PREENCHER" e length > 0). Se algum for placeholder, **ABORT Task 1** e pedir valores pro operador (D-pre-13 + R-6)
    - Loader CDN jsPDF (espelha L2604-2618)
    - Resolver devedores via `listarDevedoresDoContrato(contratoId)` + enrichment via `devedores` array prop
    - Resolver credor via `contrato.credor_id` lookup em `credores` array prop
    - Resolver cálculo via `calcularDetalheEncargosContrato(contrato, dividas, allPagamentosDivida, hoje)`
    - Renderizar 7 seções (cabeçalho/identificação/resumo/parcelas/custas/pagamentos/rodapé)
    - Trigger `doc.save(<filename>)`
    - Constants: `NOME_ESCRITORIO = "MR Cobranças"` (definido) + `ENDERECO_ESCRITORIO`/`TELEFONE_ESCRITORIO`/`EMAIL_ESCRITORIO` (placeholders pré-Execute) + `PAPEL_META` (clone verbatim D-pre-9) + `RESP_LABELS`
  - **Task 2**: Editar `src/components/DetalheContrato.jsx`:
    - Import `gerarDemonstrativoPDF` from `../utils/pdfDemonstrativo.js`
    - Add state `const [gerandoPDF, setGerandoPDF] = useState(false);`
    - Add handler `async function handleGerarPDF()` com try/catch + toast + setGerandoPDF
    - Add botão entre Editar e Excluir (L709-714): `<Btn color="#0d9488" sm onClick={handleGerarPDF} disabled={gerandoPDF}>{gerandoPDF ? <Spinner/> : "🖨️ Gerar PDF"}</Btn>`
  - **Task 3**: Pre-flight gates — build + test:regressao 34/34 + grep D-01 motor INTOCADO + grep D-13 zero @media print no app principal + lint check
  - **Task 4**: UAT humano em prod 9 SCs (SC-1..SC-9). Operador abre DetalheContrato real, clica Gerar PDF, valida cada SC com PDF aberto
  - **Task 5**: Commit (feat submódulo) + commit (chore bump pai) + tag `v1.4-phase8` + push origin master

## 8. Status

**INSERTED** 2026-05-01 — CONTEXT.md drafted (este arquivo). Pendente: `/gsd-plan-phase 8` (Sub-passo 2.D após plan checker GREEN).

**Severidade MÉDIA** (feature wrap milestone v1.4 — não bug, não financeiro retroativo, não bloqueante). Banco minúsculo (6 devedores total) reduz risco.

**Não bloqueia**: Phase 7.10.bug2 sub-bug 2 (BACKLOG MÉDIA-BAIXA) + Phase 7.10.bug4 (BACKLOG BAIXA) + Phase 7.10.bug5/bug6 (BACKLOG BAIXA) + Phase 7.13d.bug2 (BACKLOG BAIXA-MÉDIA).

**Encerra v1.4** se SHIPPED — milestone wrap. Após Phase 8, milestone v1.4 vira v1.5 com agenda de backlog acumulado (bugs BAIXAs + arquitetural se houver demanda).
