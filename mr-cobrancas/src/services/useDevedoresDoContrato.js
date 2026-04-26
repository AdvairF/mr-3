import { useState, useEffect, useCallback } from "react";
import {
  listarDevedoresDoContrato,
  criarVinculoContratoDevedor,
  removerVinculoContratoDevedor,
  alterarPapelContratoDevedor,
  promoverParaPrincipalComDemocao,
} from "./devedoresDividas.js";

/**
 * Hook contrato-level (Phase 7.13 D-pre-10): wrap dos 5 helpers de
 * devedoresDividas.js que operam fan-out em TODAS as dívidas do contrato.
 *
 * Equivalente a useDevedoresDividas, porém escopado por contrato_id em vez de
 * divida_id. Os helpers internamente fan-out N inserts/deletes/patches por dívida.
 *
 * `devedoresContrato` retorna lista DISTINCT por devedor_id (uma entrada por
 * devedor, não N entradas — uma por dívida). Cada entrada: { devedor_id, papel,
 * responsabilidade }.
 */
export function useDevedoresDoContrato(contratoId) {
  const [devedoresContrato, setDevedoresContrato] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!contratoId) {
      setDevedoresContrato([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listarDevedoresDoContrato(contratoId);
      setDevedoresContrato(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [contratoId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function adicionar(devedorId, papel, responsabilidade = "SOLIDARIA") {
    await criarVinculoContratoDevedor(contratoId, devedorId, papel, responsabilidade);
    await reload();
  }

  async function alterarPapel(devedorId, novoPapel) {
    await alterarPapelContratoDevedor(contratoId, devedorId, novoPapel);
    await reload();
  }

  async function remover(devedorId) {
    await removerVinculoContratoDevedor(contratoId, devedorId);
    await reload();
  }

  async function promoverComDemocao(novoDevedorId, novoPapelDoAnterior) {
    const result = await promoverParaPrincipalComDemocao(contratoId, novoDevedorId, novoPapelDoAnterior);
    await reload();
    return result;
  }

  return {
    devedoresContrato,
    loading,
    error,
    reload,
    adicionar,
    alterarPapel,
    remover,
    promoverComDemocao,
  };
}
