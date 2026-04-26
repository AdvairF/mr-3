/**
 * Phase 7.13 — Helper paralelo D-pre-6
 *
 * Agrupa pagamentos por devedor via junction devedores_dividas: cada pagamento_divida
 * é atribuído a TODOS os devedores da dívida (PRINCIPAL + COOBRIGADO + FIADOR + ...),
 * não só PRINCIPAL como o helper original (agruparPagamentosPorDevedor).
 *
 * Usado em: Pessoas (App.jsx Devedores Map) — perspectiva de cobrança individual onde
 * cada devedor "vê" o saldo cheio das dívidas em que está vinculado (D-pre-6
 * "solidariedade passiva: cada devedor pode ser cobrado pelo todo").
 *
 * Dashboard NÃO usa este helper — Dashboard preserva agruparPagamentosPorDevedor
 * original (App.jsx L568, L8438) com filter principaisDividaIds papel='PRINCIPAL'
 * para anti-dupla-contagem em Carteira Total (drift = 0).
 *
 * Cross-entity isolation: junction filter implícito via divida_id garante que
 * pagamento de contrato MENDES não vaza pra devedor de contrato advair (lição
 * memory/feedback_cross_entity_uat_isolation.md).
 *
 * @param {Array} devedores - Lista de devedores com .id (signature paridade com helper original)
 * @param {Array} pagamentosDivida - Pagamentos no shape pagamentos_divida (com divida_id)
 * @param {Array} devedoresDividasJunction - Rows da junction (devedor_id, divida_id, papel)
 * @returns {Map<string, Array>} Map devedor_id → pagamentos[]; pagamentos cuja dívida tem
 *                                 N devedores aparecem em N entries (fan-out 1:N).
 *                                 Devedor sem rows na junction OU pagamento com divida_id
 *                                 desconhecido = descartado (parity helper original).
 */
export function agruparPagamentosPorDevedorIncluindoSolidarios(
  devedores,
  pagamentosDivida,
  devedoresDividasJunction
) {
  // Build: divida_id → Set<devedor_id> (todos os papéis, não só PRINCIPAL)
  const dividaIdToDevedorIds = new Map();
  (devedoresDividasJunction || []).forEach(r => {
    const k = String(r.divida_id);
    if (!dividaIdToDevedorIds.has(k)) dividaIdToDevedorIds.set(k, new Set());
    dividaIdToDevedorIds.get(k).add(String(r.devedor_id));
  });

  const map = new Map();
  (pagamentosDivida || []).forEach(p => {
    const devIds = dividaIdToDevedorIds.get(String(p.divida_id));
    if (!devIds) return;
    devIds.forEach(devId => {
      if (!map.has(devId)) map.set(devId, []);
      map.get(devId).push(p);
    });
  });
  return map;
}
