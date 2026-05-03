/**
 * Throwaway capture script — Phase 9.1 Step 0.4 — golden masters smoke test estrutural.
 *
 * Captura outputs do motor antigo (calcularDetalheEncargos) em 5 cenários sintéticos
 * pre-Lei14905 (datas <= 29/08/2024). Resultado salvo em
 * src/services/__tests__/fixtures/goldenMasters.json — fixture consumida em Task 4
 * pra detectar regressão estrutural durante refactor Task 1.
 *
 * NÃO é fonte de verdade jurídica — UAT TRADIO Task 5 (SC-9 D-pre-15) é gold real.
 *
 * Execução standalone:
 *   cd src/mr-3/mr-cobrancas
 *   npx vitest run scripts/capture-golden-masters.test.js
 *
 * Pode ser deletado pós-Phase 9.1 SHIP. NÃO incluído em test:regressao.
 *
 * D-01 não violado nesta etapa (script NEW + fixture NEW; motor INTOCADO).
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { calcularDetalheEncargos } from "../src/utils/devedorCalc.js";

const BASE_CONTRATO = {
  multa_pct: 10,
  honorarios_pct: 10,
  juros_am: 1,
  juros_tipo: "juros_simples",
  indexador: "inpc",
};

const cenarios = [
  {
    nome: "C1_vencimento_simples",
    descricao:
      "1 dívida R$ 1.000, vencimento 01/06/2024, hoje 31/07/2024, sem pagamento",
    devedor: {
      id: "GM-C1",
      dividas: [
        {
          id: "C1-D1",
          valor_total: 1000,
          data_vencimento: "2024-06-01",
          data_inicio_atualizacao: "2024-06-01",
          ...BASE_CONTRATO,
        },
      ],
    },
    pagamentos: [],
    hoje: "2024-07-31",
  },
  {
    nome: "C2_pagamento_parcial_preLei14905",
    descricao:
      "1 dívida R$ 1.000, venc 01/06/2024, pag R$ 500 em 15/07/2024, hoje 29/08/2024",
    devedor: {
      id: "GM-C2",
      dividas: [
        {
          id: "C2-D1",
          valor_total: 1000,
          data_vencimento: "2024-06-01",
          data_inicio_atualizacao: "2024-06-01",
          ...BASE_CONTRATO,
        },
      ],
    },
    pagamentos: [
      { divida_id: "C2-D1", valor: 500, data_pagamento: "2024-07-15" },
    ],
    hoje: "2024-08-29",
  },
  {
    nome: "C3_custa_avulsa_preLei14905",
    descricao:
      "1 dívida R$ 1.000 + 1 custa R$ 100 lançada em 15/06/2024, hoje 31/07/2024",
    devedor: {
      id: "GM-C3",
      dividas: [
        {
          id: "C3-D1",
          valor_total: 1000,
          data_vencimento: "2024-06-01",
          data_inicio_atualizacao: "2024-06-01",
          ...BASE_CONTRATO,
          custas: [
            { id: "C3-C1", valor: 100, data: "2024-06-15", descricao: "Custa avulsa teste" },
          ],
        },
      ],
    },
    pagamentos: [],
    hoje: "2024-07-31",
  },
  {
    nome: "C4_art523_aplicado_multa_honorarios",
    descricao:
      "1 dívida R$ 1.000 com art523_opcao=multa_honorarios, hoje 31/07/2024",
    devedor: {
      id: "GM-C4",
      dividas: [
        {
          id: "C4-D1",
          valor_total: 1000,
          data_vencimento: "2024-06-01",
          data_inicio_atualizacao: "2024-06-01",
          art523_opcao: "multa_honorarios",
          ...BASE_CONTRATO,
        },
      ],
    },
    pagamentos: [],
    hoje: "2024-07-31",
  },
  {
    nome: "C5_multi_parcelas_Art354_sequencial",
    descricao:
      "3 parcelas R$ 500 (vencs 01/06, 01/07, 01/08/2024) + 2 pagamentos (R$ 400 em 15/07, R$ 600 em 15/08), hoje 29/08/2024",
    devedor: {
      id: "GM-C5",
      dividas: [
        {
          id: "C5-D1",
          valor_total: 500,
          data_vencimento: "2024-06-01",
          data_inicio_atualizacao: "2024-06-01",
          ...BASE_CONTRATO,
        },
        {
          id: "C5-D2",
          valor_total: 500,
          data_vencimento: "2024-07-01",
          data_inicio_atualizacao: "2024-07-01",
          ...BASE_CONTRATO,
        },
        {
          id: "C5-D3",
          valor_total: 500,
          data_vencimento: "2024-08-01",
          data_inicio_atualizacao: "2024-08-01",
          ...BASE_CONTRATO,
        },
      ],
    },
    pagamentos: [
      { divida_id: "C5-D1", valor: 400, data_pagamento: "2024-07-15" },
      { divida_id: "C5-D2", valor: 600, data_pagamento: "2024-08-15" },
    ],
    hoje: "2024-08-29",
  },
];

describe("Phase 9.1 Step 0.4 — capturar golden masters", () => {
  it("captura 5 cenários sintéticos pre-Lei14905 e escreve fixture", () => {
    const golden = {};
    const capturadoEm = new Date().toISOString();

    for (const c of cenarios) {
      console.log(`Capturando ${c.nome}...`);
      const output = calcularDetalheEncargos(
        c.devedor,
        c.pagamentos,
        c.hoje,
      );
      golden[c.nome] = {
        descricao: c.descricao,
        input: {
          devedor: c.devedor,
          pagamentos: c.pagamentos,
          hoje: c.hoje,
        },
        output,
        capturadoEm,
      };

      // Sanity check: output não vazio, sem NaN
      expect(output).toBeTruthy();
      const totalDeb =
        (output.totalCorrecao || 0) +
        (output.totalJuros || 0) +
        (output.totalMulta || 0) +
        (output.totalHonorarios || 0);
      expect(Number.isFinite(totalDeb)).toBe(true);
    }

    const fixturesDir = path.resolve("src/services/__tests__/fixtures");
    fs.mkdirSync(fixturesDir, { recursive: true });
    const outputPath = path.join(fixturesDir, "goldenMasters.json");
    fs.writeFileSync(outputPath, JSON.stringify(golden, null, 2));

    console.log(
      `\n✅ Golden masters salvos em ${outputPath} — ${cenarios.length} cenários`,
    );

    // Verificação final: arquivo existe e tem 5 keys
    const re = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(Object.keys(re).length).toBe(5);
    expect(re.C1_vencimento_simples).toBeDefined();
    expect(re.C5_multi_parcelas_Art354_sequencial).toBeDefined();
  });
});
