// src/utils/batchCalculator.js
//
// Phase 7.8.2a — Fix C (D-11 kickoff eager).
// Agenda processamento de items em chunks de batchSize usando requestIdleCallback
// quando disponível, com fallback setTimeout(cb, 0). Timeout idle = 500ms.
// Fire-and-forget: não retorna Promise. Zero state module-level.

export function runBatches(items, batchSize, processBatch) {
  if (!Array.isArray(items) || items.length === 0) return;
  const size = Math.max(1, batchSize | 0);
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  const schedule = (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function')
    ? (cb) => window.requestIdleCallback(cb, { timeout: 500 })
    : (cb) => setTimeout(cb, 0);

  const step = () => {
    const chunk = chunks.shift();
    if (!chunk) return;
    try { processBatch(chunk); } catch (e) { console.error('[runBatches] processBatch threw:', e); }
    if (chunks.length > 0) schedule(step);
  };
  schedule(step);
}
