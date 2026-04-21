# Features — Pesquisa de Funcionalidades

**Data:** 2026-04-14 (atualizado: 2026-04-20 — v1.1 Pagamentos e Contratos)
**Contexto:** Sistema de cobrança jurídica brasileiro para pequenos escritórios de advocacia.

---

## Kanban de Cobranças

### Etapas padrão para cobrança jurídica no Brasil

| Etapa | Descrição | Ação típica |
|-------|-----------|-------------|
| **Novo** | Devedor cadastrado, sem contato | Enviar notificação extrajudicial |
| **Notificado** | Carta/notificação enviada | Aguardar prazo (10-30 dias) |
| **Em Negociação** | Devedor respondeu, acordo possível | Propor parcelamento/acordo |
| **Acordo Ativo** | Acordo firmado, parcelas em andamento | Monitorar pagamentos |
| **Inadimplente** | Acordo quebrado ou prazo esgotado | Ajuizar ação |
| **Em Juízo** | Processo judicial aberto | Acompanhar andamentos |
| **Encerrado** | Pago, prescrito ou arquivado | — |

**Table stakes (v1):**
- [ ] Visualizar cobranças organizadas por etapa em colunas
- [ ] Mover cobrança entre etapas via drag-and-drop
- [ ] Filtrar kanban por credor, período, valor
- [ ] Contador de cobranças e valor total por coluna
- [ ] Indicador visual de cobranças atrasadas (vermelho) e no prazo (verde)

**Diferenciadores (v2):**
- Automação de movimentação baseada em regras (ex: se parcela venceu há 5 dias → mover para Inadimplente)
- Integração com régua de cobrança existente
- Histórico de movimentações com data e responsável

**Anti-features:**
- Não criar etapas customizáveis em v1 (complexidade alta, usuário não sabe o que quer até usar)

---

## Timeline por Devedor

### Eventos que devem aparecer na timeline

**Automáticos (gerados pelo sistema):**
- Devedor cadastrado
- Dívida adicionada (valor, data)
- Status alterado
- Acordo firmado (parcelas, valor)
- Parcela paga / parcela vencida
- Petição gerada (tipo, arquivo)
- Processo aberto (número, tipo)
- Andamento processual registrado
- Alerta disparado
- Cobrança movida no Kanban

**Manuais (registrados pelo advogado):**
- Contato realizado (ligação, e-mail, WhatsApp)
- Observação / nota interna
- Documento recebido

**Table stakes (v1):**
- [ ] Lista cronológica reversa de todos os eventos do devedor
- [ ] Ícone por tipo de evento (pagamento, petição, processo, contato)
- [ ] Data e hora de cada evento
- [ ] Notas manuais pelo advogado

**Diferenciadores (v2):**
- Filtro por tipo de evento
- Exportar timeline como PDF para uso em audiência

---

## Alertas Automáticos

### Tipos de alertas relevantes para advogados brasileiros

**Financeiros:**
- Parcela vencendo em X dias (configurável: 3, 7, 15 dias antes)
- Parcela vencida há X dias sem pagamento
- Acordo sem pagamento por 30+ dias

**Processuais:**
- Prazo de contestação se aproximando
- Andamento processual sem atualização há X dias
- Audiência agendada (se integração futura com tribunal)

**De cobrança:**
- Devedor sem contato há X dias
- Processo parado em uma etapa há X dias (alerta de estagnação)
- Devedor com múltiplas dívidas vencidas

**Table stakes (v1):**
- [ ] Alerta de parcela vencendo (7 dias antes)
- [ ] Alerta de parcela vencida
- [ ] Badge de notificações no header
- [ ] Lista de alertas pendentes
- [ ] Marcar alerta como lido

**Diferenciadores (v2):**
- Notificação push do browser
- Envio de e-mail ou WhatsApp para o advogado
- Configuração de regras personalizadas por credor

---

## Templates de Petição

### Tipos mais usados em cobrança no Brasil

| Tipo | Uso | Complexidade |
|------|-----|-------------|
| **Notificação Extrajudicial** | Primeira cobrança formal | Baixa |
| **Ação de Cobrança** | Dívida sem título executivo | Média |
| **Ação Monitória** | Dívida com prova escrita (contrato, cheque) | Média |
| **Execução de Título Extrajudicial** | Cheque, nota promissória, contrato com cláusula executiva | Alta |
| **Execução de Título Judicial** | Sentença condenatória | Alta |
| **Acordo Extrajudicial** | Parcelamento/quitação amigável | Baixa |
| **Impugnação de Defesa** | Resposta a embargos/contestação | Alta |

### Variáveis padrão dos templates

```
{{nome_devedor}}, {{cpf_devedor}}, {{endereco_devedor}}
{{nome_credor}}, {{cnpj_credor}}
{{valor_principal}}, {{valor_corrigido}}, {{data_vencimento}}
{{numero_processo}}, {{vara}}, {{comarca}}
{{data_atual}}, {{nome_advogado}}, {{oab_advogado}}
```

**Table stakes (v1):**
- [ ] CRUD de templates (criar, editar, excluir, duplicar)
- [ ] Editor de texto com marcadores de variáveis {{campo}}
- [ ] Preview do documento com dados reais de um devedor
- [ ] Templates padrão pré-carregados (notificação extrajudicial, ação de cobrança, monitória)
- [ ] Geração do .docx a partir do template + dados do devedor

**Diferenciadores (v2):**
- Editor rico (formatação, tabelas)
- Versioning de templates (histórico de alterações)
- Templates por credor (personalização por cliente)

---

## Geração com IA

### O que a IA pode e não pode fazer em petições brasileiras

**Pode fazer:**
- Redigir a narrativa dos fatos com base nos dados (quem deve, quanto, desde quando)
- Formatar a estrutura padrão da peça (endereçamento, qualificação, fatos, direito, pedidos)
- Sugerir fundamentos legais baseados no tipo de ação
- Adaptar linguagem formal jurídica

**Não pode fazer (riscos jurídicos):**
- Citar jurisprudência específica sem verificação humana (risco de alucinação)
- Garantir a procedência da ação
- Substituir a revisão do advogado — deve ser "sugestão" sempre

**Fluxo recomendado:**
1. Advogado escolhe tipo de petição e devedor
2. IA gera rascunho com base nos dados
3. Advogado revisa/edita no editor de templates
4. Gera .docx final

**Table stakes (v1):**
- [ ] Botão "Gerar com IA" na tela de petições
- [ ] Indicação clara que é um rascunho que precisa de revisão
- [ ] Editar antes de baixar

---

## Pagamentos por Dívida

**Contexto v1.1:** Registrar pagamentos diretamente na tela `DetalheDivida`, com aplicação automática pela ordem do Art. 354 CC: juros → multa → principal. O saldo da dívida é recalculado a cada pagamento lançado.

**Situação atual:** O sistema já possui a tabela `pagamentos_parciais` (devedor_id, data_pagamento, valor, observacao) e todo o motor de cálculo Art. 354 CC implementado em `devedorCalc.js`. Os pagamentos existem por devedor (não por dívida). O `calcularSaldosPorDivida()` já distribui pagamentos sequencialmente entre dívidas do devedor. O `DetalheDivida.jsx` já exibe saldo calculado via esse motor. O que falta é a UI de lançamento de pagamento na tela da dívida individual — não uma nova coluna de banco, mas um escopo de exibição restrito à dívida em questão.

### Table Stakes

| Feature | Por que é obrigatório | Complexidade | Notas |
|---------|----------------------|-------------|-------|
| Lançar pagamento (data + valor + observação) na tela da dívida | Sem isso não existe "registrar pagamento" | Baixa | Formulário inline no DetalheDivida |
| Exibir lista cronológica de pagamentos da dívida | O advogado precisa ver o histórico | Baixa | Filtrar `pagamentos_parciais` por `devedor_id`; o saldo individual já aponta o absorvido |
| Saldo atualizado pós-pagamento (via Art. 354 CC) | Coerência legal — CC Art. 354: juros → multa → principal | Já implementado | `calcularSaldosPorDivida()` já faz isso |
| Editar/excluir pagamento | Correção de erro de digitação é inevitável | Baixa | CRUD completo — já existe na tela de devedor, replicar no escopo de dívida |
| Status da dívida muda para "quitada" quando saldo = 0 | Ciclo de vida da dívida | Baixa | Detectar saldo ≤ 0, atualizar campo `status` na tabela `dividas` |
| Confirmação antes de excluir pagamento | Prevenção de perda de dado | Mínima | Modal ou confirm — padrão já usado no sistema |

### Diferenciadores

| Feature | Valor | Complexidade | Notas |
|---------|-------|-------------|-------|
| Exibir breakdown por componente no momento do pagamento (quanto abateu de juros, multa, principal) | Transparência legal para o advogado | Média | Usar `calcularPlanilhaCompleta()` que já gera esse breakdown por linha |
| Gerar comprovante de pagamento em PDF (data, valor, saldo antes/depois, assinatura do advogado) | Prova documental para o cliente | Média | jsPDF já está no sistema; adaptar gerarPlanilhaPDF |
| Forma de pagamento (PIX, TED, boleto, cheque, dinheiro) | Histórico financeiro do escritório | Mínima | Campo extra no formulário; já existe no ModalPagamento de acordos |
| Alerta de pagamento a maior (valor excede saldo atual) | Prevenção de erro — pagamento não pode ser negativo | Baixa | Validação no form com aviso visual |

### Anti-Features

| Anti-Feature | Por que evitar | Alternativa |
|--------------|---------------|-------------|
| Nova tabela `pagamentos_por_divida` separada de `pagamentos_parciais` | Quebraria o motor de cálculo que itera pagamentos por devedor | Manter `pagamentos_parciais`; escopo da UI é por dívida, mas o dado fica no nível do devedor |
| Imputação manual (advogado escolhe se paga juros ou principal primeiro) | Viola Art. 354 CC — a lei define a ordem, não a vontade do devedor | Motor sequencial automático |
| Pagamentos futuros (data > hoje) | Gera saldo negativo antes do fato | Validar data_pagamento ≤ hoje |
| Campo "devedor_id" na tabela de pagamentos substituído por "divida_id" | Migration complexa, quebraria `calcularSaldoDevedorAtualizado()` no dashboard | Manter devedor_id; filtro por divida via join com `devedores_dividas` ou query derivada |
| Recalcular saldo server-side (stored procedure Supabase) | Overkill para SPA — motor client-side já validado com 7 casos TJGO | Manter lógica client-side em `devedorCalc.js` |

### Dependências

- `pagamentos_parciais` (tabela Supabase — já existe)
- `devedorCalc.js` — `calcularSaldosPorDivida()`, `calcularTotalPagoPorDivida()` (já existem)
- `DetalheDivida.jsx` — ponto de inserção da UI de pagamentos
- `dividas.js` service — `atualizarDivida()` para mudar status para "quitada"
- Art. 354 CC: ordem de imputação juros → multa → principal já está codificada no motor sequencial

---

## Contrato com Parcelas

**Contexto v1.1:** Modelar um contrato (NF/Duplicatas, Compra e Venda, Empréstimos) como entidade que agrega N parcelas, onde cada parcela é uma dívida individual já existente na tabela `dividas`. O contrato é o agrupador; as parcelas têm vencimento, valor original e encargos individuais; o sistema cobra cada parcela separadamente via o motor Art. 354 CC existente.

**Padrão dominante em sistemas brasileiros de cobrança jurídica:** Um contrato ("instrumento") gera múltiplos títulos (duplicatas, parcelas de mútuo). Cada título é uma obrigação autônoma com data de vencimento própria. O contrato é referência documental; a cobrança é feita por título/parcela. Em atraso, o credor pode cobrar parcelas individualmente ou protestar/executar o contrato inteiro (cumulação de títulos). Sistemas como Espaider, Jurisnet e CRMs jurídicos menores seguem esse modelo: contrato como header + parcelas como linhas.

**Relação contrato → parcela → dívida neste sistema:**
- `contratos` (nova tabela) — header: tipo, partes, valor total, datas, documento
- cada parcela do contrato = uma `divida` existente (UUID FK para `dividas.id`)
- `contrato_parcelas` (tabela associativa) — contrato_id + divida_id + numero_parcela
- O motor de cálculo e cobrança das parcelas é idêntico ao de dívidas avulsas — sem nova lógica

### Tipos de Contrato (Escopo v1.1)

| Tipo | Título Executivo | Protesto | Notas |
|------|-----------------|---------|-------|
| NF / Duplicatas Mercantis | Sim (Lei 5.474/68) | Necessário para executar | Cada NF = uma duplicata = uma parcela |
| Compra e Venda | Depende de cláusula | Opcional | Contrato com parcelamento do preço |
| Empréstimos (Mútuo) | Sim se previsto | Opcional | Parcelas mensais fixas ou variáveis |

### Table Stakes

| Feature | Por que é obrigatório | Complexidade | Notas |
|---------|----------------------|-------------|-------|
| Criar contrato com: tipo, credor, devedor(es), valor total, data início, número do documento | Identificação mínima do instrumento | Baixa | Formulário simples; devedor já existe — FK para `devedores` |
| Gerar N parcelas automaticamente (valor total ÷ N, vencimentos mensais a partir de data base) | Sem geração automática o cadastro é manual demais | Média | Mesma lógica de `gerarParcelasAcordo()` já existente no App.jsx |
| Cada parcela gerada cria uma `divida` real na tabela `dividas` | As parcelas participam do motor Art. 354 CC e do fluxo de cobrança existente | Média | Salvamento atômico: INSERT contrato + N × INSERT divida + N × INSERT contrato_parcelas |
| Listar contratos com: tipo, partes, valor total, nº parcelas, parcelas em atraso | Visibilidade do portfólio de contratos | Baixa | View ou query JOIN entre contratos + contrato_parcelas + dividas |
| Tela de detalhe do contrato: header + tabela de parcelas com status/saldo de cada uma | Gestão granular das parcelas | Média | Reutilizar `calcularSaldosPorDivida()` sobre as dividas do contrato |
| Parcelas individuais aparecem no módulo Dívidas global (tabela de dívidas existente) | Não criar silo separado — cobrança unificada | Mínima | As parcelas são dívidas normais; filtro por contrato_id opcional |
| Editar parcela individual (valor, vencimento, encargos) | Contratos reais têm variações entre parcelas | Baixa | Editar a `divida` correspondente via `atualizarDivida()` |

### Diferenciadores

| Feature | Valor | Complexidade | Notas |
|---------|-------|-------------|-------|
| Vencimento automático escalonado (mensal, quinzenal, semanal) | Reduz cadastro manual | Baixa | Parâmetro de periodicidade no gerador |
| Status agregado do contrato (quitado / em andamento / inadimplente) | Visão rápida do portfólio | Baixa | Derivado do status das dívidas-parcela |
| Petição de cobrança por contrato (lista todas as parcelas em atraso num único documento) | Unificar cobrança de múltiplas parcelas num pedido | Alta | Novo template .docx específico para contratos; fora de v1.1 |
| Geração de planilha PDF do contrato com todas as parcelas e seus saldos | Demonstrativo para audiência | Média | Adaptar `calcularPlanilhaCompleta()` iterando dividas do contrato |
| Aceleração do vencimento (vencimento antecipado de parcelas futuras) | Cláusula contratual padrão em mútuo e compra e venda | Alta | Regra jurídica complexa; v2 |
| Filtro "por contrato" no módulo Dívidas global | Navegação conveniente | Mínima | Adicionar filtro contrato_id=X na query existente |

### Anti-Features

| Anti-Feature | Por que evitar | Alternativa |
|--------------|---------------|-------------|
| Modelo "contrato como dívida especial" (tipo contrato na tabela dividas, parcelas em JSONB) | Repete o erro pre-v1.0 (JSONB embutido); impossibilita motor Art. 354 por parcela | Tabela `contratos` separada + parcelas como dividas reais |
| Motor de cálculo separado para parcelas de contrato | Duplicação de lógica; dois motores divergem ao longo do tempo | Reutilizar 100% do motor devedorCalc.js existente |
| Aceitar múltiplos devedores no contrato v1.1 | Co-devedores já existem por dívida; contratos com múltiplos devedores = complexidade jurídica (solidariedade vs divisibilidade) que não cabe no MVP | O devedor principal do contrato é o da dívida; co-devedores adicionados por parcela no fluxo já existente |
| Parcelamento de acordo (negociação pós-inadimplência) confundido com contrato de parcelas (instrumento original) | São entidades diferentes: acordo é renegociação; contrato é o documento original da dívida | Manter acordos como estão (JSONB em devedores); contratos são título de crédito original |
| Importar planilha Excel de parcelas | Alta complexidade de parsing, validação e mapeamento; alto risco de dados inválidos | Formulário de geração automática cobre 90% dos casos |
| Excluir contrato sem excluir parcelas | Deixaria dívidas órfãs no sistema | Exclusão em cascata: DELETE contrato → DELETE contrato_parcelas → considerar o que fazer com as dividas (status "arquivada" vs DELETE) |

### Relação Contrato → Parcela → Dívida (Modelo de Dados Recomendado)

```
contratos
  id UUID PK
  tipo TEXT ('nf_duplicatas' | 'compra_venda' | 'emprestimo')
  devedor_id BIGINT FK → devedores
  credor_id BIGINT FK → credores
  valor_total NUMERIC
  data_contrato DATE
  numero_documento TEXT
  observacoes TEXT
  status TEXT ('ativo' | 'quitado' | 'inadimplente' | 'cancelado')
  created_at, updated_at

contrato_parcelas
  id UUID PK
  contrato_id UUID FK → contratos ON DELETE CASCADE
  divida_id UUID FK → dividas ON DELETE RESTRICT
  numero_parcela INT NOT NULL
  created_at
  UNIQUE (contrato_id, numero_parcela)
  UNIQUE (divida_id)  -- cada divida pertence a no máximo um contrato
```

Cada dívida criada como parcela de contrato é um row normal em `dividas` com `devedor_id` e encargos próprios. O link `contrato_parcelas.divida_id` é a única diferença estrutural.

### Dependências

- Tabela `dividas` (UUID PK) — já existe
- `criarDivida()` em `dividas.js` — salvamento atômico de parcelas
- `calcularSaldosPorDivida()` — reutilizado para saldo por parcela
- `DetalheDivida.jsx` — cada parcela é navegável como dívida individual
- Nova tabela `contratos` + nova tabela `contrato_parcelas` (migration v1.1)
- NovaDivida.jsx ou novo componente NovoContrato.jsx para o formulário de criação

---

*Pesquisa: 2026-04-14 / Atualizado: 2026-04-20 — seções Pagamentos e Contratos adicionadas para v1.1*
