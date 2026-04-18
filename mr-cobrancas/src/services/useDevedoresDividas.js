import { useState, useEffect, useCallback } from "react";
import {
  listarParticipantes,
  adicionarParticipante,
  alterarPapel,
  removerParticipante,
} from "./devedoresDividas.js";

export function useDevedoresDividas(dividaId) {
  const [participantes, setParticipantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!dividaId) {
      setParticipantes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await listarParticipantes(dividaId);
      setParticipantes(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [dividaId]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function adicionar(params) {
    await adicionarParticipante(params);
    await reload();
  }

  async function trocarPapel(rowId, novoPapel, divId) {
    await alterarPapel(rowId, novoPapel, divId || dividaId);
    await reload();
  }

  async function remover(rowId) {
    await removerParticipante(rowId);
    await reload();
  }

  return { participantes, loading, error, reload, adicionar, trocarPapel, remover };
}
