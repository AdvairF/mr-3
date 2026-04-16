---
quick_id: 260416-kl8
date: 2026-04-16
status: ready
---

# Quick Task 260416-kl8: Corrigir valor dívida no painel devedores — Context

**Gathered:** 2026-04-16
**Status:** Ready for planning

<domain>
## Task Boundary

Modificar o painel de Devedores (App.jsx) para que a coluna "VALOR DÍVIDA" e o card
"Carteira Total" exibam o saldo devedor real (com encargos - pagamentos parciais),
não o valor original bruto.

</domain>

<decisions>
## Implementation Decisions

### Cálculo do saldo
- **Saldo completo**: valor original + correção monetária + juros + multa + honorários - pagamentos parciais
- Mesma lógica já usada na `gerarPlanilhaPDF()` (função nos hooks `calcularFatorCorrecao` + `calcularJurosAcumulados`)
- Extrair para uma função utilitária pura `calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje)` para reuso
- A função deve ser colocada no escopo global do arquivo (fora dos componentes), junto com as outras funções utilitárias (`calcCorrecao`, `calcularTotaisAcordo`)

### Carregamento de pagamentos
- Adicionar `dbGet("pagamentos_parciais")` ao `carregarTudo()` em paralelo com os outros carregamentos
- Armazenar em novo state `allPagamentos` (array flat) no componente raiz
- Passar `allPagamentos` como prop para o componente `Devedores`
- No painel, criar um Map `pgtosPorDevedor` = `devedor_id → [pagamentos]` para lookup O(1)

### Cards no topo (totalCarteira)
- `totalCarteira` (linha ~288) deve somar `calcularSaldoDevedorAtualizado(d, pgtosDev, hoje)` em vez de `d.dividas.reduce(...)`
- `totalRecuperado` permanece calculando via parcelas pagas + acordos (não muda)
- `emAberto = totalCarteira - totalRecuperado` se recalcula automaticamente
- `taxaRecuperacao` se recalcula automaticamente

### Coluna "Valor Dívida" na tabela (linha ~3564)
- Substituir `valorDiv` por `saldo = calcularSaldoDevedorAtualizado(d, pgtosPorDevedor.get(d.id) || [], hoje)`
- Se `pgtosPorDevedor.get(d.id)?.length > 0`: mostrar badge "Parcial" em verde ao lado do saldo
- Badge: `<span style={{ background:"#dcfce7", color:"#16a34a", borderRadius:99, padding:"1px 6px", fontSize:9, fontWeight:700, marginLeft:4 }}>Parcial</span>`

### Tooltip (requirement opcional)
- Implementar tooltip com `title` HTML (nativo, sem biblioteca extra):
  `title={\`Original: ${fmt(valorDiv)} | Pago: ${fmt(totalPago)} | Saldo: ${fmt(saldo)}\`}`
- Aplicar no `<td>` da coluna Valor Dívida

### Claude's Discretion
- Posição exata do badge (inline após o valor ou abaixo em linha separada)
- Se `allPagamentos` não carregou ainda (undefined), usar `valorDiv` original como fallback (sem quebrar UI)

</decisions>

<specifics>
## Specific Ideas

**Arquivos afetados:**
- `src/mr-3/mr-cobrancas/src/App.jsx`

**Pontos chave de edição:**
1. Nova função utilitária `calcularSaldoDevedorAtualizado` (~linha 57, junto com `calcCorrecao`)
2. `carregarTudo()` linha ~7507: adicionar `dbGet("pagamentos_parciais")` ao Promise.all
3. Novo state `const [allPagamentos, setAllPagamentos] = useState([])` no App raiz
4. `totalCarteira` (linha ~288): alterar para usar nova função com pagamentos
5. Tabela devedores (linha ~3564): alterar `valorDiv` → saldo atualizado + badge + tooltip
6. Prop `allPagamentos` passada para componente `Devedores`

**Cálculo da função utilitária:**
```js
function calcularSaldoDevedorAtualizado(devedor, pagamentos, hoje) {
  const dividas = (devedor.dividas || []).filter(d => !d._nominal && !d._so_custas);
  if (!dividas.length) return devedor.valor_original || devedor.valor_nominal || 0;
  // mesma lógica iterativa de gerarPlanilhaPDF:
  // para cada dívida: calcular PV → correção → juros → multa → honorários
  // abater pagamentos sequencialmente
  // retornar saldo final
}
```

</specifics>

<canonical_refs>
## Canonical References

- `calcularFatorCorrecao()` — já existe no arquivo
- `calcularJurosAcumulados()` — já existe no arquivo
- `gerarPlanilhaPDF()` (linha ~1968) — lógica de referência para reutilizar
- `carregarTudo()` (linha ~7504) — onde adicionar carregamento de pagamentos
- `totalCarteira` (linha ~288) — onde atualizar o cálculo da carteira
- Tabela de devedores (linha ~3564) — onde atualizar a coluna e adicionar badge/tooltip

</canonical_refs>
