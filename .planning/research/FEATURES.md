# Features — Pesquisa de Funcionalidades

**Data:** 2026-04-14
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
*Pesquisa: 2026-04-14*
