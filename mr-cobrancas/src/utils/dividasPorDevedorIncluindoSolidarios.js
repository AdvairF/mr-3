/**
 * Phase 7.13 — Helper paralelo D-pre-6 fix(07.13f.bug)
 *
 * Agrupa dívidas por devedor via junction devedores_dividas: cada dívida é atribuída
 * a TODOS os devedores vinculados (PRINCIPAL + COOBRIGADO + FIADOR + ...), não só ao
 * `dividas.devedor_id` legacy (single-FK denormalização).
 *
 * Usado em: Pessoas (App.jsx Devedores function) — antes de chamar motor
 * `calcularSaldoDevedorAtualizado(d, pgtos, hoje)`, override `d.dividas` com fan-out
 * para que THIAGO (FIADOR sem dividas.devedor_id=THIAGO legacy) "veja" as dívidas
 * do MENDES — perspectiva de cobrança individual da solidariedade passiva.
 *
 * Construção:
 *   1. Build allDividasMap: divida_id → divida (full record) a partir de devedores[].dividas
 *      (mesma fonte que `dividaIdToDevedorId` em App.jsx L684/L699).
 *   2. Itera junction; cada row associa divida ao devedor da junction (qualquer papel).
 *   3. Devedor com zero rows na junction → ausente do Map (caller faz fallback p/ d.dividas legacy).
 *
 * D-01 strict: NÃO toca motor. Helper apenas constrói "view" com dividas de outras fontes.
 * Cross-entity: junction filter implícito via divida_id garante que MENDES dívidas
 * não vazam pra THIAGO se THIAGO não está vinculado àquela dívida específica.
 *
 * @param {Array} devedores - Lista de devedores com .dividas (JSONB ou parsed array)
 * @param {Array} devedoresDividasJunction - Rows da junction (devedor_id, divida_id, papel)
 * @returns {Map<string, Array>} Map devedor_id → dividas[]; dívida com N devedores aparece
 *                                em N entries (fan-out 1:N). Devedor sem rows na junction =
 *                                ausente do Map (use fallback no caller).
 */

// Parse seguro de devedor.dividas. Aceita Array | string JSON | null/undefined.
// Inline (não importa de devedorCalc.js que mantém parseDividas como function não-exported
// — D-01 strict: helper paralelo NÃO toca motor para extrair util compartilhado).
function parseDividasInline(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function dividasPorDevedorIncluindoSolidarios(devedores, devedoresDividasJunction) {
  // Build divida_id → divida (full) index a partir de devedores[].dividas
  const allDividasMap = new Map();
  (devedores || []).forEach(d => {
    const divs = parseDividasInline(d.dividas);
    divs.forEach(div => {
      if (div?.id != null) {
        allDividasMap.set(String(div.id), div);
      }
    });
  });

  // Build devedor_id → divida[] via junction
  const result = new Map();
  (devedoresDividasJunction || []).forEach(r => {
    const devKey = String(r.devedor_id);
    const div = allDividasMap.get(String(r.divida_id));
    if (!div) return;
    if (!result.has(devKey)) result.set(devKey, []);
    result.get(devKey).push(div);
  });
  return result;
}
