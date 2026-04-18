---
quick_id: 260417-ttn
date: 2026-04-17
status: Ready for planning
---

# Quick Task 260417-ttn: ajustes-modulo-devedor-art523-dividas-pagamentos — Context

**Gathered:** 2026-04-17
**Status:** Ready for planning

<domain>
## Task Boundary

Três ajustes no módulo Devedores:
1. Art.523 não altera o valor exibido no painel (badge aparece mas valor não muda)
2. Dívidas detalhadas não mostram se Art.523 está aplicado
3. Pagamentos parciais não têm edição — só exclusão

</domain>

<decisions>
## Implementation Decisions

### Ajuste 1 — Abordagem do bug Art.523
- Reload forçado após salvar dívida: buscar devedor atualizado do Supabase (dbGet) e atualizar state
- NÃO migrar dados antigos no banco — tratar null/undefined art523_opcao como "nao_aplicar" (já é o default)
- A função calcularSaldoDevedorAtualizado já está correta (devedorCalc.js linha 146); o problema é que o devedor no state pode ter sido carregado antes do campo existir

### Ajuste 3 — Edição inline (não modal)
- Clicar na linha de pagamento transforma campos em inputs editáveis
- Botões ✅ Salvar e ❌ Cancelar inline
- Mesmo padrão dos cards de dívida (editDivId pattern)
- cursor: pointer; hover: highlight verde claro; stopPropagation no botão excluir

### Audit log
- Sem audit log por ora
- Salvar apenas via UPDATE na tabela pagamentos_parciais
- Pode ser adicionado depois se necessário

### Claude's Discretion
- Exato posicionamento do badge Art.523 nas dívidas detalhadas
- Validações de edição: data não futura, valor > 0 (básico)
- Quando verificar/resolver dados do Supabase null vs string "null"

</decisions>

<specifics>
## Specific Ideas

- `editPgtoId` state para controlar qual pagamento está em edição inline
- Reusar `dbUpdate("pagamentos_parciais", id, {...})` pattern existente
- `dbGet` após salvar dívida para forçar reload (pode usar `sel.id`)
- Badge Art.523 nas dívidas: badge vermelho pequeno após a linha de índice/juros
- Tooltip com texto "Art. 523 §1º CPC: multa de 10% + honorários de 10%..."

</specifics>

<canonical_refs>
## Canonical References

- devedorCalc.js: calcularSaldoDevedorAtualizado() linha 146 — já aplica art523_opcao
- App.jsx linha ~3338: abrirEdicaoDivida() — pattern para edição inline a reusar
- App.jsx linha ~3674: card de dívida com editDivId pattern — copiar para pagamentos
- App.jsx linha ~3360: salvarEdicaoDivida() — pattern para salvar + reload state

</canonical_refs>
