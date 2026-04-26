/**
 * Phase 7.10bcd — Helper compartilhado D-31
 *
 * Agrupa pagamentos por devedor via lookup intermediário divida_id (pagamentos_divida shape
 * sem devedor_id direto — só FK divida_id; mapeamento via fullDev.dividas).
 *
 * Reutilizado em:
 *   - App.jsx Devedores Map L2986 (commit 07.10b)
 *   - App.jsx Dashboard pgtosPorDevedorCarteira L568 (commit 07.10d)
 *
 * 2 callsites + complexidade da lookup map = vira helper. DRY > inline duplication
 * (lição "helper-first" da 7.9 — feedback_db_integration_gate_missing.md).
 *
 * @param {Array} devedores - Lista de devedores com .dividas[]
 * @param {Array} pagamentosDivida - Pagamentos no shape pagamentos_divida (com divida_id)
 * @returns {Map<string, Array>} Map devedor_id → pagamentos[]; devedor sem dividas registradas
 *                                 OU pagamento com divida_id desconhecido = descartado.
 */
export function agruparPagamentosPorDevedor(devedores, pagamentosDivida) {
  const dividaIdToDevedorId = new Map();
  (devedores || []).forEach(d =>
    (d.dividas || []).forEach(div =>
      dividaIdToDevedorId.set(String(div.id), String(d.id))
    )
  );
  const map = new Map();
  (pagamentosDivida || []).forEach(p => {
    const devId = dividaIdToDevedorId.get(String(p.divida_id));
    if (!devId) return;
    if (!map.has(devId)) map.set(devId, []);
    map.get(devId).push(p);
  });
  return map;
}
