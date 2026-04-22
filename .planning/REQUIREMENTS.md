# Requirements — Mr. Cobranças

**Milestone atual:** v1.4 — Pagamentos por Contrato + PDF Demonstrativo
**Updated:** 2026-04-22

---

## v1.4 Requirements

### Pagamentos por Contrato (PAGCON)

- [ ] **PAGCON-01:** Advogado registra pagamento no Contrato (data, valor, observação) via form no DetalheContrato
- [ ] **PAGCON-02:** Sistema amortiza parcelas em aberto pela mais antiga (Art. 354 CC), atualizando `pagamentos_divida` + `saldo_quitado` de cada parcela afetada — via stored procedure PL/pgSQL para atomicidade
- [ ] **PAGCON-03:** Toast exibe quantas parcelas foram amortizadas após registrar pagamento
- [ ] **PAGCON-04:** Advogado vê seção colapsável "Pagamentos Recebidos" no DetalheContrato com lista cronológica (data, valor total, parcelas afetadas, observação)
- [ ] **PAGCON-05:** Form valida: valor > 0, valor ≤ saldo devedor total do contrato, data ≤ hoje — toast de erro claro em cada caso de falha
- [ ] **PAGCON-06:** Advogado pode editar ou excluir pagamento registrado na seção Pagamentos Recebidos; exclusão reverte amortização das parcelas afetadas e registra evento `pagamento_revertido`; edição com mudança de valor/data faz estorno + re-aplicação; operação bloqueada se alguma parcela afetada foi excluída

### PDF Demonstrativo (PDF)

- [ ] **PDF-01:** Advogado gera PDF demonstrativo via botão no DetalheContrato
- [ ] **PDF-02:** PDF contém tabela de parcelas (# | Vencimento | Valor Original | Valor Atualizado | Pago | Saldo)
- [ ] **PDF-03:** PDF contém lista de pagamentos recebidos (data, valor, parcelas afetadas)
- [ ] **PDF-04:** PDF contém cabeçalho com dados do escritório (hardcoded), totais (Valor Total Atualizado + Total Pago + Saldo Devedor) e rodapé jurídico

### Histórico de Contratos (HIS)

- [ ] **HIS-05:** Cada pagamento registra evento `pagamento_recebido` em `contratos_historico` com snapshot (valor + parcelas afetadas); reversão/edição registra evento `pagamento_revertido` — ambos adicionados ao CHECK constraint da tabela

---

## Validated Requirements

### v1.3 — Edição de Contrato + Histórico (Phase 6 — complete 2026-04-22)

- [x] **EDT-01:** Advogado pode editar credor, devedor e referência de um contrato existente via form inline no DetalheContrato
- [x] **EDT-02:** Advogado pode editar os encargos padrão do contrato (índice de correção, juros, multa, honorários, despesas, art.523, data_inicio_atualizacao) via form inline no DetalheContrato
- [x] **EDT-03:** Ao alterar credor ou devedor, a mudança propaga automaticamente em cascata para todos os documentos e parcelas do contrato (incluindo parcelas quitadas)
- [x] **EDT-04:** Encargos editados no contrato funcionam como template para novos documentos — não retroagem em parcelas já geradas
- [x] **HIS-01:** Ao criar um contrato, o sistema registra automaticamente um evento `criacao` em `contratos_historico` com snapshot dos campos iniciais
- [x] **HIS-02:** Ao salvar uma edição, o sistema registra um evento em `contratos_historico` com snapshot JSON dos campos alterados (valor_antigo → valor_novo) e usuario_id via auth.uid()
- [x] **HIS-03:** Advogado vê o histórico cronológico de eventos do contrato em seção colapsável no DetalheContrato, com data, tipo e campos alterados
- [x] **HIS-04:** Tabela `contratos_historico` existe no banco com RLS USING(true) WITH CHECK(true), contrato_id FK, tipo_evento CHECK, usuario_id, e campos de snapshot JSON

### v1.2 — Contratos Redesenhados (Phase 5 — complete 2026-04-22)

- [x] **CON-01:** Advogado cria contrato (header: credor, devedor, referência, encargos padrão) e sistema abre DetalheContrato com lista de documentos vazia
- [x] **CON-02:** Advogado adiciona Documento ao Contrato (tipo, número, valor, data emissão, nº parcelas, encargos) e sistema gera N Parcelas como rows reais em `dividas`
- [x] **CON-03:** Advogado vê lista global de contratos com colunas Credor, Devedor, Docs, Parcelas, Valor Total, Em Atraso
- [x] **CON-04:** Advogado abre DetalheContrato e vê documentos colapsáveis com tabela de parcelas e saldo individual via Art. 354 CC
- [x] **CON-05:** Parcelas de contratos aparecem na TabelaDividas (ModuloDividas) com badge [NF]/[C&V]/[Empr.] no campo Credor

### v1.1 — Pagamentos (Phase 4 — complete 2026-04-21)

- [x] **PAG-01:** Usuário pode lançar pagamento (data + valor + observação) diretamente na tela da dívida
- [x] **PAG-02:** Usuário pode visualizar histórico cronológico de pagamentos de uma dívida
- [x] **PAG-03:** Usuário pode editar um pagamento lançado (com confirmação)
- [x] **PAG-04:** Usuário pode excluir um pagamento lançado (com confirmação)
- [x] **PAG-05:** Saldo da dívida é recalculado via Art. 354 CC após cada pagamento registrado
- [x] **PAG-06:** Dívida exibe badge visual "Saldo quitado" em DetalheDivida quando saldo calculado ≤ 0
- [x] **PAG-07:** `dividas.saldo_quitado` atualizado automaticamente após cada operação de pagamento
- [x] **PAG-08:** Badge "Saldo quitado" exibido na TabelaDividas lendo `dividas.saldo_quitado`

---

## Future Requirements (v1.5+)

- Kanban de cobranças por etapa (aguardando, notificado, em acordo, encerrado)
- Timeline cronológica por devedor (histórico de eventos)
- Alertas automáticos de vencimentos, parcelas atrasadas e prazos processuais
- Sistema de templates de petição editáveis pelo advogado
- Breakdown de pagamento por componente (juros/multa/principal)
- Forma de pagamento (PIX/TED/boleto)
- Upload de logo do escritório para o PDF
- Auto-update status do contrato quando todas as parcelas quitadas
- Excluir contrato com rollback de parcelas
- Persistir saldo_atual no banco (PAG-10, deferred desde v1.1)

---

## Out of Scope

- Integração com sistemas de tribunal (TJ/PJe) — v2
- Assinatura digital de petições — v2
- App mobile — v2
- Multi-tenant SaaS — v2
- Geração de petições com IA — v2

---

## Traceability

| REQ-ID | Phase | Status |
|--------|-------|--------|
| PAG-01..08 | Phase 4 | Complete |
| CON-01..05 | Phase 5 | Complete |
| EDT-01..04 | Phase 6 | Complete |
| HIS-01..04 | Phase 6 | Complete |
| PAGCON-01 | Phase 7 | Pending |
| PAGCON-02 | Phase 7 | Pending |
| PAGCON-03 | Phase 7 | Pending |
| PAGCON-04 | Phase 7 | Pending |
| PAGCON-05 | Phase 7 | Pending |
| PAGCON-06 | Phase 7 | Pending |
| HIS-05 | Phase 7 | Pending |
| PDF-01 | Phase 8 | Pending |
| PDF-02 | Phase 8 | Pending |
| PDF-03 | Phase 8 | Pending |
| PDF-04 | Phase 8 | Pending |
