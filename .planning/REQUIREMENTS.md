# Requirements — Mr. Cobranças

**Milestone atual:** v1.3 — Edição de Contrato + Histórico
**Updated:** 2026-04-22

---

## v1.3 Requirements

### Edição de Contrato (EDT)

- [ ] **EDT-01:** Advogado pode editar credor, devedor e referência de um contrato existente via form inline no DetalheContrato
- [ ] **EDT-02:** Advogado pode editar os encargos padrão do contrato (índice de correção, juros, multa, honorários, despesas, art.523, data_inicio_atualizacao) via form inline no DetalheContrato
- [ ] **EDT-03:** Ao alterar credor ou devedor, a mudança propaga automaticamente em cascata para todos os documentos e parcelas do contrato (incluindo parcelas quitadas)
- [ ] **EDT-04:** Encargos editados no contrato funcionam como template para novos documentos — não retroagem em parcelas já geradas

### Histórico de Eventos (HIS)

- [ ] **HIS-01:** Ao criar um contrato, o sistema registra automaticamente um evento `criacao` em `contratos_historico` com snapshot dos campos iniciais
- [ ] **HIS-02:** Ao salvar uma edição, o sistema registra um evento em `contratos_historico` com snapshot JSON dos campos alterados (valor_antigo → valor_novo) e usuario_id via auth.uid()
- [ ] **HIS-03:** Advogado vê o histórico cronológico de eventos do contrato em seção colapsável no DetalheContrato, com data, tipo e campos alterados
- [ ] **HIS-04:** Tabela `contratos_historico` existe no banco com RLS USING(true) WITH CHECK(true), contrato_id FK, tipo_evento CHECK, usuario_id, e campos de snapshot JSON

---

## Validated Requirements

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

## Future Requirements (v1.4+)

- Kanban de cobranças por etapa (aguardando, notificado, em acordo, encerrado)
- Timeline cronológica por devedor (histórico de eventos)
- Alertas automáticos de vencimentos, parcelas atrasadas e prazos processuais
- Sistema de templates de petição editáveis pelo advogado
- Breakdown de pagamento por componente (juros/multa/principal)
- Forma de pagamento (PIX/TED/boleto)
- Comprovante PDF de pagamento
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
| EDT-01 | Phase 6 | Planned |
| EDT-02 | Phase 6 | Planned |
| EDT-03 | Phase 6 | Planned |
| EDT-04 | Phase 6 | Planned |
| HIS-01 | Phase 6 | Planned |
| HIS-02 | Phase 6 | Planned |
| HIS-03 | Phase 6 | Planned |
| HIS-04 | Phase 6 | Planned |
