# Quick Task Research — Calculadora: Recálculo Automático em Tempo Real

**Data:** 2026-04-15
**Arquivo analisado:** `src/mr-3/mr-cobrancas/src/App.jsx`
**Componente:** `function Calculadora(...)` — linhas 3855–4700+
**Confiança:** HIGH (análise direta do código-fonte)

---

## 1. Localização do módulo calculadora

| Item | Detalhe |
|------|---------|
| Componente principal | `function Calculadora({ devedores, credores = [] })` — linha **3855** |
| Fim do componente | linha ~4700+ (componente longo, inclui exportar PDF e planilha) |
| Função de cálculo | `function calcular()` — linha **3938** |
| Botão trigger atual | `<Btn onClick={calcular}>🧮 Calcular →</Btn>` — linha **4507** |

---

## 2. Estado (useState) da calculadora

| State variable | Setter | Valor default | Tipo |
|---|---|---|---|
| `devId` | `setDevId` | `""` | string — ID do devedor selecionado |
| `nomeDevedor` | `setNomeDevedor` | `""` | string |
| `valorOriginal` | `setValorOriginal` | `""` | string (number input) |
| `dataCalculo` | `setDataCalculo` | hoje (ISO) | string `YYYY-MM-DD` |
| `indexador` | `setIndexador` | `"inpc"` | string enum |
| `jurosTipo` | `setJurosTipo` | `"fixo_1"` | string (não usado diretamente nos cálculos atuais) |
| `jurosAM` | `setJurosAM` | `"1"` | string (number input) |
| `multa` | `setMulta` | `"2"` | string (number input) |
| `baseMulta` | `setBaseMulta` | `"original"` | string enum |
| `dataVencimento` | `setDataVencimento` | `""` | string `YYYY-MM-DD` |
| `honorariosPct` | `setHonorariosPct` | `"20"` | string (number input) |
| `incluirHonorarios` | `setIncluirHonorarios` | `true` | boolean |
| `encargos` | `setEncargos` | `"0"` | string (number input) |
| `bonificacao` | `setBonificacao` | `"0"` | string (number input) |
| `resultado` | `setResultado` | `null` | objeto complexo ou null |
| `dividasSel` | `setDividasSel` | `[]` | array de IDs |
| `atualizandoIndices` | `setAtualizandoIndices` | `false` | boolean |
| `statusIndices` | `setStatusIndices` | `null` | objeto `{ok, msg, em}` |

---

## 3. Mapeamento completo de inputs — linha, onChange atual, status

### 3.1 Seletor de devedor (linha ~4362)
```
<select value={devId}
  onChange={e => loadDev(e.target.value)}
  ...>
```
- **onChange atual:** chama `loadDev()` — popula estados, reseta `resultado` e `dividasSel`
- **Dispara cálculo?** NÃO — apenas preenche campos
- **Ação necessária:** Nenhuma direta; quando devedor é carregado, o auto-calc deve rodar após o estado ser definido

### 3.2 Checkboxes de dívidas (linha ~4378)
```
<input type="checkbox" checked={dividasSel.includes(div.id)}
  onChange={e => atualizarTotalSelecionado(div.id, e.target.checked)}
  .../>
```
- **onChange atual:** `atualizarTotalSelecionado()` — atualiza `dividasSel`, reseta `resultado` para null
- **Dispara cálculo?** NÃO
- **Ação necessária:** Adicionar trigger de recálculo após `setDividasSel`

### 3.3 Valor Original (linha 4392)
```
<input type="number" value={valorOriginal}
  onChange={e => setValorOriginal(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setValorOriginal`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.4 Data de Cálculo (linha 4397)
```
<input type="date" value={dataCalculo}
  onChange={e => setDataCalculo(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setDataCalculo`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.5 Vencimento da Dívida / Data de Início (linha 4409–4422)
```
<input type="date" value={dataVencimento}
  onChange={e => setDataVencimento(e.target.value)}
  disabled={indexador === "nenhum"}
  .../>
```
- **onChange atual:** apenas `setDataVencimento`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo
- **Cuidado:** Entry parcial — usuário digita uma data de 10 chars; disparo imediato pode processar `"2024-"` (inválido). Ver seção 5.

### 3.6 Indexador (linha 4427)
```
<select value={indexador}
  onChange={e => setIndexador(e.target.value)}
  ...>
```
- **onChange atual:** apenas `setIndexador`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.7 Juros % ao mês (linha 4434)
```
<input type="number" value={jurosAM}
  onChange={e => setJurosAM(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setJurosAM`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.8 Multa % (linha 4442)
```
<input type="number" value={multa}
  onChange={e => setMulta(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setMulta`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.9 Multa incide sobre (linha 4446)
```
<select value={baseMulta}
  onChange={e => setBaseMulta(e.target.value)}
  ...>
```
- **onChange atual:** apenas `setBaseMulta`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.10 Encargos R$ (linha 4453)
```
<input type="number" value={encargos}
  onChange={e => setEncargos(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setEncargos`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.11 Bonificação R$ (linha 4457)
```
<input type="number" value={bonificacao}
  onChange={e => setBonificacao(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setBonificacao`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.12 Honorários — checkbox "Incluir no total" (linha 4466)
```
<input type="checkbox" checked={incluirHonorarios}
  onChange={e => setIncluirHonorarios(e.target.checked)}
  .../>
```
- **onChange atual:** apenas `setIncluirHonorarios`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.13 Honorários — range slider (linha 4471)
```
<input type="range" min="0" max="50" step="0.5" value={honorariosPct}
  onChange={e => setHonorariosPct(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setHonorariosPct`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo

### 3.14 Honorários — number input (linha 4473)
```
<input type="number" value={honorariosPct}
  onChange={e => setHonorariosPct(e.target.value)}
  .../>
```
- **onChange atual:** apenas `setHonorariosPct`
- **Dispara cálculo?** NÃO
- **Ação necessária:** DEVE disparar recálculo (compartilha estado com o range — um único useEffect cobre ambos)

---

## 4. Análise da função `calcular()`

### 4.1 Natureza
- **Síncrona** — não contém `async/await`, não faz fetch de API
- **Pura em runtime** — usa apenas os estados do componente + funções de utils importadas
- **Sem side effects problemáticos** — além de `setResultado(...)` e `logAudit(...)` no final

### 4.2 Dependências externas do cálculo

| Dependência | Tipo | Disponível em tempo real? |
|---|---|---|
| `calcularFatorCorrecao()` | função síncrona de `utils/correcao.js` | SIM — usa `getIndicesMerged()` que lê variável módulo |
| `calcularJurosAcumulados()` | função síncrona de `utils/correcao.js` | SIM |
| `INDICES` (objeto estático) | módulo compilado | SIM — sempre disponível |
| `_overrides` (índices BCB via API) | variável de módulo; carregada no `useEffect` do mount ou botão manual | SIM após mount; assíncrono apenas no fetch |
| `logAudit()` | side effect de auditoria | Não bloqueante — chamado apenas no fim |

**Conclusão:** `calcular()` pode ser chamada diretamente em `onChange` sem risco. Não há promessas, não há fetch, não há setState colateral indesejado além do próprio `setResultado`.

### 4.3 Guarda de entradas inválidas existente (modo manual)
```js
if (!PV || !dataCalculo) {
  toast("Preencha valor original e data de cálculo.", { icon: "⚠️" });
  return;
}
```
- Essa guarda usa `toast()`, o que seria irritante em auto-recálculo (dispararia toast toda vez que o campo estiver vazio)
- **Ação necessária:** Para o auto-recálculo, silenciar o toast — simplesmente `return` sem toast quando os campos ainda estiverem incompletos

### 4.4 `logAudit` no auto-recálculo
- Atualmente registra toda execução de `calcular()`
- Em auto-recálculo contínuo, geraria spam de log
- **Ação necessária:** Mover o `logAudit` para fora do recálculo automático (manter apenas no clique manual/explícito, ou no primeiro resultado válido após um debounce)

---

## 5. Dependências de timing e riscos

### 5.1 Campos de data com entrada parcial
- O input `type="date"` do navegador entrega o valor completo (`YYYY-MM-DD`) ou string vazia — não entrega valor parcial
- **Risco:** LOW — o browser só dispara `onChange` com data completa ou ao limpar
- **Ação:** Verificar `dataVencimento.length === 10` antes de passar para `calcularFatorCorrecao`; a função já trata `dataInicio === dataFim` devolvendo fator 1

### 5.2 Índices BCB assíncronos
- Os índices BCB são carregados no `useEffect` do mount (via `carregarCacheIndices()`) e opcionalmente pelo botão "Atualizar Índices BCB"
- O cálculo usa `getIndicesMerged()` que lê a variável de módulo `_overrides` — já disponível antes do primeiro render se o cache existe no localStorage
- **Risco:** Se o cache não existir, o primeiro cálculo usa apenas `INDICES` estático (dados 2020–2026) + `TAXA_MEDIA` de fallback. Isso é aceitável.
- **Ação:** Nenhuma especial — o cálculo já tem fallback robusto

### 5.3 Modo devedor vs modo manual
- Quando `devId` está definido mas `dividasSel` está vazio (sem dívidas marcadas), `calcular()` cai no branch manual usando `valorOriginal`
- Quando `loadDev()` é chamado, ele reseta `resultado` para `null` e define `dividasSel` — estados são definidos sequencialmente, o que pode causar renders intermediários
- **Risco:** useEffect com dependências `[devId, dividasSel]` pode disparar com `dividasSel` ainda vazio
- **Ação:** Usar um único useEffect com todas as dependências relevantes; aceitar recálculo intermediário ou usar `useRef` para detectar "loading devedor"

### 5.4 Performance
- `calcular()` é síncrona e percorre arrays de dívidas com loop simples
- Para devedores com muitas dívidas (dezenas de parcelas), pode haver lentidão perceptível
- **Ação:** Aplicar debounce de 300–400ms nos inputs de texto/número; selects e checkboxes podem recalcular imediatamente

---

## 6. Estratégia recomendada para implementação

### Abordagem: `useEffect` com debounce

```jsx
// Dependências: todos os estados que influenciam o cálculo
useEffect(() => {
  // Silencia cálculo se campos mínimos ausentes
  const PV = parseFloat(valorOriginal) || 0;
  if (!PV || !dataCalculo) {
    setResultado(null);
    return;
  }
  // Debounce para inputs de texto
  const timer = setTimeout(() => {
    calcularSilencioso(); // versão sem toast e sem logAudit
  }, 350);
  return () => clearTimeout(timer);
}, [
  valorOriginal, dataCalculo, dataVencimento,
  indexador, jurosAM, multa, baseMulta,
  encargos, bonificacao,
  honorariosPct, incluirHonorarios,
  dividasSel, devId,
]);
```

### Separação de concerns recomendada

| Função | Quando chamada | Tem toast? | Tem logAudit? |
|---|---|---|---|
| `calcularSilencioso()` | useEffect (auto) | NÃO | NÃO |
| `calcular()` (atual ou renomeada para `calcularComLog()`) | onClick do botão | SIM | SIM |

Alternativa mais simples: extrair a lógica pura de cálculo em uma função `computarResultado()` que apenas retorna o objeto resultado (sem setState), e chamá-la tanto no useEffect quanto no onClick.

---

## 7. Resumo de mudanças por input

| Input | Linha | onChange atual | Mudança necessária |
|---|---|---|---|
| select devedor | ~4362 | `loadDev()` | Nenhuma (loadDev já reseta resultado; useEffect recalculará) |
| checkbox dívidas | ~4378 | `atualizarTotalSelecionado()` | Nenhuma (já reseta resultado; useEffect recalculará) |
| Valor Original | 4392 | `setValorOriginal` | Coberto pelo useEffect |
| Data de Cálculo | 4397 | `setDataCalculo` | Coberto pelo useEffect |
| Vencimento/Data Início | 4409 | `setDataVencimento` | Coberto pelo useEffect |
| Indexador select | 4427 | `setIndexador` | Coberto pelo useEffect |
| Juros % a.m. | 4434 | `setJurosAM` | Coberto pelo useEffect |
| Multa % | 4442 | `setMulta` | Coberto pelo useEffect |
| Multa base select | 4446 | `setBaseMulta` | Coberto pelo useEffect |
| Encargos R$ | 4453 | `setEncargos` | Coberto pelo useEffect |
| Bonificação R$ | 4457 | `setBonificacao` | Coberto pelo useEffect |
| Honorários checkbox | 4466 | `setIncluirHonorarios` | Coberto pelo useEffect |
| Honorários range | 4471 | `setHonorariosPct` | Coberto pelo useEffect |
| Honorários number | 4473 | `setHonorariosPct` | Coberto pelo useEffect (mesmo estado) |

**Total de inputs:** 14 controles — **nenhum** precisa de modificação individual no `onChange`. Um único `useEffect` centralizado cobre todos.

---

## 8. Modificações adicionais necessárias

1. **Remover ou ocultar o botão "🧮 Calcular →"** (linha 4507) — ou mantê-lo como ação explícita que também executa `logAudit` e exibe toast de confirmação. Sugestão: manter o botão mas mudar label para "Recalcular" ou removê-lo quando auto-recálculo estiver ativo.

2. **Remover o estado vazio no painel direito** — o placeholder `"Preencha os parâmetros e clique em Calcular"` (linha 4516) deve ser substituído por loading spinner ou texto condicionado ao estado de entrada incompleta.

3. **Remover o `toast()` de validação** da função de cálculo silencioso — manter apenas no fluxo explícito.

4. **`logAudit`** (linha 4092) — mover para fora do recálculo automático. Registrar apenas em ação deliberada do usuário (clique no botão ou exportação de PDF).

---

## 9. Não há bloqueios

- `calcular()` é 100% síncrona — segura para chamar em useEffect
- Não há race conditions com os índices BCB (já carregados no mount via localStorage)
- Não há APIs externas no caminho crítico do cálculo
- A implementação pode ser feita em uma única passagem sem refatorar os onChange existentes
