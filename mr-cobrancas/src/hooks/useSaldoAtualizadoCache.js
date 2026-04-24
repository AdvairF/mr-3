// 5 exports da API principal + 2 helpers de observabilidade (SC5 timestamp reativo)
//
// Phase 7.8.2a — Saldo Atualizado na Listagem de Contratos (cache SWR)
// CONTEXT: D-01 motor intocado / D-02 isolamento (sem dependência reversa de UI)
//          D-04 adapter filtra allPagamentosDivida internamente / D-06 fingerprint deep 12 campos
//          D-08 5 gatilhos / D-09 data Goiânia / D-13 invalidação híbrida.
//
// Cache shape (singleton):
//   Map<contratoId, {
//     saldo: number,
//     detalhe: object,
//     fingerprint: string,
//     status: "loading" | "fresh" | "revalidating",
//     calculadoEm: number  // Date.now()
//   }>

import { useEffect, useState } from "react";
import { calcularDetalheEncargosContrato } from "../utils/devedorCalc.js";
import { runBatches } from "../utils/batchCalculator.js";

// ─── Singletons module-level ────────────────────────────────────────────────
const cache = new Map();
const listeners = new Set();
function notify() { listeners.forEach(l => { try { l(); } catch (e) { console.error("[useSaldoAtualizadoCache] listener threw:", e); } }); }

// ─── D-06 Fingerprint VERBATIM (12 campos — não alterar) ────────────────────
function contratoFingerprint(dividasDoContrato, pagamentosFiltered, dataHoje) {
  const D = dividasDoContrato.map(d => [
    d.id, d.valor_total, d.data_vencimento, d.data_origem,
    d.data_inicio_atualizacao, d.indexador || "",
    d.multa_pct || 0, d.juros_tipo || "",
    d.juros_am || 0, d.honorarios_pct || 0,
    d.art523_opcao || "", d.saldo_quitado ? 1 : 0,
  ].join(":")).sort().join("|");
  const P = pagamentosFiltered.map(p =>
    [p.id, p.divida_id, p.valor, p.data_pagamento].join(":")
  ).sort().join("|");
  return `${dataHoje}|D:${D}|P:${P}`;
}

// ─── D-09 Data Goiânia (sv-SE => "YYYY-MM-DD" no fuso America/Sao_Paulo) ───
function hojeGoiania() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
}

// ─── Recompute interno (puro — chamado por useSaldoContrato e kickoffBatch) ─
function recomputeEntry(contratoId, dividasDoContrato, allPagamentosDivida, hoje) {
  const dividaIds = new Set((dividasDoContrato || []).map(d => d.id));
  const pagamentosFiltered = (allPagamentosDivida || []).filter(p => dividaIds.has(p.divida_id));
  const fp = contratoFingerprint(dividasDoContrato || [], pagamentosFiltered, hoje);
  // Adapter recebe pagamentos GLOBAL (D-04 — filtra internamente) e Date real (não string).
  const detalhe = calcularDetalheEncargosContrato(dividasDoContrato || [], allPagamentosDivida || [], new Date());
  cache.set(contratoId, {
    saldo: detalhe?.saldoAtualizado ?? 0,
    detalhe,
    fingerprint: fp,
    status: "fresh",
    calculadoEm: Date.now(),
  });
  notify();
}

// ─── 1. Hook React — consumido por CelulaSaldoAtualizado ────────────────────
export function useSaldoContrato(contrato, dividasDoContrato, allPagamentosDivida, hoje) {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  if (!contrato || contrato.id == null) {
    return { saldo: null, detalhe: null, status: "loading", calculadoEm: null };
  }

  const dataHoje = hoje || hojeGoiania();
  const divs = dividasDoContrato || [];
  const allPags = allPagamentosDivida || [];
  const dividaIds = new Set(divs.map(d => d.id));
  const pagamentosFiltered = allPags.filter(p => dividaIds.has(p.divida_id));
  const fp = contratoFingerprint(divs, pagamentosFiltered, dataHoje);

  const entry = cache.get(contrato.id);
  if (!entry) {
    // MISS — cria entrada loading e agenda recompute em microtask (não bloqueia render).
    cache.set(contrato.id, {
      saldo: null,
      detalhe: null,
      fingerprint: fp,
      status: "loading",
      calculadoEm: null,
    });
    setTimeout(() => recomputeEntry(contrato.id, divs, allPags, dataHoje), 0);
    return { saldo: null, detalhe: null, status: "loading", calculadoEm: null };
  }

  if (entry.fingerprint === fp && entry.status === "fresh") {
    return { saldo: entry.saldo, detalhe: entry.detalhe, status: "fresh", calculadoEm: entry.calculadoEm };
  }

  // Drift de fingerprint OU status revalidating → serve stale + agenda recompute.
  if (entry.fingerprint !== fp || entry.status === "revalidating") {
    setTimeout(() => recomputeEntry(contrato.id, divs, allPags, dataHoje), 0);
    return {
      saldo: entry.saldo,
      detalhe: entry.detalhe,
      status: "revalidating",
      calculadoEm: entry.calculadoEm,
    };
  }

  // fallback (status loading mas mesmo fp) — devolve loading
  return { saldo: entry.saldo, detalhe: entry.detalhe, status: entry.status, calculadoEm: entry.calculadoEm };
}

// ─── 2. invalidateContrato — marca entrada como stale ───────────────────────
export function invalidateContrato(contratoId) {
  if (cache.has(contratoId)) {
    const e = cache.get(contratoId);
    cache.set(contratoId, { ...e, status: "revalidating" });
    notify();
  }
}

// ─── 3. invalidateAll — marca todas entradas como stale ─────────────────────
export function invalidateAll() {
  let mutated = false;
  for (const [id, e] of cache.entries()) {
    cache.set(id, { ...e, status: "revalidating" });
    mutated = true;
  }
  if (mutated) notify();
}

// ─── 4. removeContrato — remove entrada do Map (delete contrato — D-05) ────
export function removeContrato(contratoId) {
  if (cache.has(contratoId)) {
    cache.delete(contratoId);
    notify();
  }
}

// ─── 5. kickoffBatch — popula cache em batches de 10 (D-11) ─────────────────
export function kickoffBatch(contratos, dividasAgrupadas, allPagamentosDivida, hoje) {
  if (!Array.isArray(contratos) || contratos.length === 0) return;
  const dataHoje = hoje || hojeGoiania();

  runBatches(contratos, 10, (chunk) => {
    chunk.forEach(c => {
      // Resolve dividasDoContrato a partir de dividasAgrupadas (Map | obj | array flat).
      let dv;
      if (Array.isArray(dividasAgrupadas)) {
        dv = dividasAgrupadas.filter(d => String(d.contrato_id) === String(c.id));
      } else if (dividasAgrupadas && typeof dividasAgrupadas.get === "function") {
        dv = dividasAgrupadas.get(c.id) ?? dividasAgrupadas.get(String(c.id)) ?? [];
      } else if (dividasAgrupadas && typeof dividasAgrupadas === "object") {
        dv = dividasAgrupadas[c.id] ?? dividasAgrupadas[String(c.id)] ?? [];
      } else {
        dv = [];
      }

      const existing = cache.get(c.id);
      // Pula se já-cached fresh; recomputa se ausente OU stale.
      if (!existing || existing.status === "revalidating" || existing.status === "loading") {
        recomputeEntry(c.id, dv, allPagamentosDivida, dataHoje);
      }
    });
  });
}

// ─── 6. subscribeToCache — pub/sub helper observabilidade (SC5) ─────────────
export function subscribeToCache(listener) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

// ─── 7. getLastCalculadoEm — última atualização do cache (SC5 timestamp) ────
export function getLastCalculadoEm() {
  if (cache.size === 0) return 0;
  let max = 0;
  for (const e of cache.values()) {
    if (e.calculadoEm && e.calculadoEm > max) max = e.calculadoEm;
  }
  return max;
}

// ─── window.focus listener — D-08 gatilho 3 (multi-usuário) ─────────────────
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => invalidateAll());
}

// ─── Internals expostos APENAS para testes (saldoAtualizadoCache.test.js) ──
export const __test = { cache, listeners, recomputeEntry, contratoFingerprint, hojeGoiania };
