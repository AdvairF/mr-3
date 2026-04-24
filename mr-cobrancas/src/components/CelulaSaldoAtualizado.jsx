// Phase 7.8.2a — Fix B (D-10 display-only).
// 3 estados visuais com fade 180ms; row inteira (em TabelaContratos.jsx) navega.
// Esta celula nao tem handler de clique nem teclado, nem papel acessivel de botao,
// nem cursor estilizado para clique. Toda interacao acontece na linha externa.

import React from "react";
import { useSaldoContrato } from "../hooks/useSaldoAtualizadoCache.js";

function fmtBRL(v) {
  if (v == null || !isFinite(v)) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function CelulaSaldoAtualizado({ contrato, dividasDoContrato, allPagamentosDivida, hoje }) {
  const { saldo, status } = useSaldoContrato(contrato, dividasDoContrato, allPagamentosDivida, hoje);

  const baseStyle = { transition: "opacity 180ms", display: "inline-block" };

  if (status === "loading") {
    return (
      <span style={{ ...baseStyle, opacity: 0.5 }} aria-label="Carregando saldo atualizado">
        <span>…</span>
      </span>
    );
  }
  if (status === "revalidating") {
    return (
      <span style={{ ...baseStyle, opacity: 0.75 }} title="Atualizando…">
        {fmtBRL(saldo)}
      </span>
    );
  }
  // "fresh"
  return (
    <span style={{ ...baseStyle, opacity: 1 }}>
      {fmtBRL(saldo)}
    </span>
  );
}
