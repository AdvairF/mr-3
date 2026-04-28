# Spec referência — Motor v2 (v1.5 milestone)

## Origem

PDF SosCálculos do caso real Tradio Soluções Financeiras LTDA × Mendes e Mendes LTDA-ME, fornecido pelo usuário em 2026-04-28 durante sessão de retomada Phase 7.13b.

- **Arquivo:** `Planilha atualizada - Tradio x Mendes.pdf`
- **Ref. SosCálculos:** 69f11529d5d9675453987250
- **Versão SosCálculos:** 5.84.15b

## Propósito

Spec técnica para Motor v2 (milestone v1.5). Define o método de cálculo esperado quando o sistema receber pagamentos parciais e/ou penhoras ao longo do tempo.

## Caso ilustrado

- 12 parcelas de R$ 1.000,00 vencidas entre 10/03/2019 e 30/06/2019
- Pagamento parcial via depósito judicial: R$ 8.097,08 em 10/07/2021
- Saldo continuado até 28/04/2026
- Total final: R$ 26.633,88 (crédito) / R$ 24.468,77 (parte requerente)

## Método de cálculo (consolidado SosCálculos)

### Fases temporais de juros de mora (Selic-IPCA Lei 14.905/24)

- Até 01/2003: 0,5% a.m. (6% a.a.)
- 02/2003 até 07/2024: 1% a.m. (12% a.a.)
- Após 08/2024: Taxa Legal (Selic – IPCA nos termos da Lei nº 14.905/24)
- Juros simples (não compostos)

### Fases temporais de correção monetária

- Até 07/2024: TJGO
- Após 08/2024: IPCA (Lei 14.905/24)

### Acessórios

- Multa mora: 10%
- Honorários sucumbência: 10% (sobre valor da condenação)
- Honorários multa 523: 0% (não aplicado neste caso)
- Honorários art. 523: 0% (não aplicado neste caso)

### Sequência de cálculo com pagamento parcial

1. Cada parcela corrigida + juros + multa + honorários até data do evento (pagamento/penhora)
2. Subtotal consolidado na data do evento
3. Pagamento abate proporcionalmente (no caso: 92,89% do principal + 7,11% das custas)
4. Calcula remanescente após abatimento
5. Continua a partir do remanescente — saldo vira "novo principal", correção+juros+multa+honorários continuam até próximo evento OU data atual
6. Custas têm correção monetária separada (não geram juros nem multa nem honorários)
7. Repete pra cada novo pagamento/penhora

## Implicação para Motor v2

### Status atual (v1.4)

- Motor `calcularDetalheEncargos` (`devedorCalc.js`) está INTOCADO há 50+ commits desde Phase 7.8.2a
- D-01 invariante absoluta no v1.4
- Não suporta pagamento parcial multi-fase do jeito SosCálculos

### Phase Motor v2 (v1.5)

- D-01 RELAXED explicitamente declarado em milestone v1.5
- Phase dedicada de 4-6 sessões
- Output PDF deve seguir formato SosCálculos (este PDF é spec visual)
- Dependências:
  * Phase 7.13c (encargos contrato vs divida) decidida
  * Decisão arquitetural sobre fonte única de encargos
  * Decisão arquitetural sobre como aplicar pagamento parcial multi-fase

### NÃO fazer no v1.4

- ❌ Mexer no motor por causa deste PDF
- ❌ Iniciar discuss-phase Motor v2 antes de v1.5 estar ativo
- ❌ Modificar adapter contrato-level baseado neste spec (essa decisão é do v1.5)

### Fazer no v1.4 (atual)

- ✅ Arquivar este PDF como referência (esta operação)
- ✅ Continuar fechando pendentes v1.4 (7.13c, 7.10.bug2, Phase 8, 7.14b)

### Fazer no v1.5 (futuro)

- discuss-phase Motor v2 cita este PDF como spec primária
- Implementação aplica método consolidado SosCálculos
- Output PDF replica layout SosCálculos
