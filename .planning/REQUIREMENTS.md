# Requirements — Mr. Cobranças v1.1 Pagamentos e Contratos

**Milestone:** v1.1 — Pagamentos e Contratos
**Created:** 2026-04-20
**Status:** Active

---

## v1.1 Requirements

### Pagamentos por Dívida (PAG)

- [ ] **PAG-01**: Usuário pode lançar pagamento (data + valor + observação) diretamente na tela da dívida
- [ ] **PAG-02**: Usuário pode visualizar histórico cronológico de pagamentos de uma dívida
- [ ] **PAG-03**: Usuário pode editar um pagamento lançado (com confirmação)
- [ ] **PAG-04**: Usuário pode excluir um pagamento lançado (com confirmação)
- [ ] **PAG-05**: Saldo da dívida é recalculado via Art. 354 CC após cada pagamento registrado
- [ ] **PAG-06**: Dívida exibe badge visual "Saldo quitado" quando saldo calculado ≤ 0

### Contratos com Parcelas (CON)

- [ ] **CON-01**: Usuário pode criar um contrato com tipo (NF/Duplicata, Compra e Venda, Empréstimo), credor, devedor, valor total e data
- [ ] **CON-02**: Usuário pode gerar N parcelas automaticamente (valor ÷ N, mensal a partir da data base), criando linhas reais na tabela `dividas`
- [ ] **CON-03**: Usuário pode visualizar lista global de contratos com tipo, partes, valor total, nº parcelas e parcelas em atraso
- [ ] **CON-04**: Usuário pode visualizar detalhe do contrato com header + tabela de parcelas e saldo individual por parcela via motor Art. 354 CC
- [ ] **CON-05**: Parcelas de contratos aparecem no ModuloDividas global (tabela geral de dívidas), com indicação visual de que pertencem a um contrato

---

## Future Requirements (v1.2+)

- Breakdown de pagamento por componente (juros/multa/principal)
- Forma de pagamento (PIX/TED/boleto)
- Comprovante PDF de pagamento
- Auto-update `dividas.status` para "quitada" quando saldo ≤ 0
- Auto-update status do contrato quando todas as parcelas quitadas
- Editar header do contrato após criação
- Excluir contrato com rollback de parcelas

---

## Out of Scope

- Integração com sistemas de tribunal (TJ/PJe) — v2
- Assinatura digital de petições — v2
- App mobile — v2
- Multi-tenant SaaS — v2
- Geração de petições com IA — v2

---

## Traceability

| REQ-ID | Phase | Plan |
|--------|-------|------|
| PAG-01 | — | — |
| PAG-02 | — | — |
| PAG-03 | — | — |
| PAG-04 | — | — |
| PAG-05 | — | — |
| PAG-06 | — | — |
| CON-01 | — | — |
| CON-02 | — | — |
| CON-03 | — | — |
| CON-04 | — | — |
| CON-05 | — | — |
