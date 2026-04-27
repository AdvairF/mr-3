import { sb } from "../config/supabase.js";

const TABLE = "processos_judiciais";
const TABLE_DEV = "processos_devedores";

export async function listar(filtros = {}) {
  let path = `${TABLE}?order=created_at.desc&select=*`;
  if (filtros.status && filtros.status !== "TODOS") {
    path += `&status=eq.${encodeURIComponent(filtros.status)}`;
  }
  if (filtros.credor_id) {
    path += `&credor_id=eq.${filtros.credor_id}`;
  }
  if (filtros.busca) {
    const b = encodeURIComponent(filtros.busca);
    path += `&or=(titulo.ilike.*${b}*,numero_cnj.ilike.*${b}*)`;
  }
  return sb(path);
}

export async function buscar(id) {
  const rows = await sb(`${TABLE}?id=eq.${id}&select=*&limit=1`);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

export async function criar(dados) {
  return sb(TABLE, "POST", {
    titulo: dados.titulo,
    numero_cnj: dados.numero_cnj || null,
    tipo_acao: dados.tipo_acao || null,
    tribunal: dados.tribunal || null,
    vara: dados.vara || null,
    comarca: dados.comarca || null,
    uf: dados.uf || "GO",
    valor_causa: dados.valor_causa ? Number(dados.valor_causa) : null,
    data_distribuicao: dados.data_distribuicao || null,
    status: dados.status || "ATIVO",
    credor_id: dados.credor_id ? Number(dados.credor_id) : null,
    observacoes: dados.observacoes || null,
  });
}

export async function atualizar(id, dados) {
  return sb(`${TABLE}?id=eq.${id}`, "PATCH", {
    ...dados,
    updated_at: new Date().toISOString(),
  });
}

export async function excluir(id) {
  return sb(`${TABLE}?id=eq.${id}`, "DELETE");
}

export async function adicionarDevedor({ processoId, devedorId, papel, dataCitacao, statusCitacao, observacao }) {
  return sb(TABLE_DEV, "POST", {
    processo_id: processoId,
    devedor_id: Number(devedorId),
    papel: papel || "REU",
    data_citacao: dataCitacao || null,
    status_citacao: statusCitacao || "PENDENTE",
    observacao: observacao || null,
  });
}

export async function removerDevedor(rowId) {
  return sb(`${TABLE_DEV}?id=eq.${rowId}`, "DELETE");
}

export async function listarDevedores(processoId) {
  // D-pre-11 (Phase 7.14): exceção forense — JOIN aninhado devedor:devedores(...)
  // intencionalmente SEM filtro deleted_at=is.null. Processo judicial já cadastrado
  // preserva devedor soft-deleted no polo passivo (histórico forense para reabertura,
  // ação revisional, prescrição). UI ProcessosJudiciais.jsx exibe badge "Inativo" cinza
  // no chip quando dev.deleted_at é truthy. Criação NOVA de processo aplica filtro
  // normal via lookup global (App.jsx:8392 D-pre-9 callsite 1) — não permite adicionar
  // inativo como novo réu.
  return sb(
    `${TABLE_DEV}?processo_id=eq.${processoId}&select=*,devedor:devedores(id,nome,cpf_cnpj,telefone,email)&order=created_at.asc`
  );
}

export async function atualizarCitacao(rowId, dados) {
  return sb(`${TABLE_DEV}?id=eq.${rowId}`, "PATCH", {
    data_citacao: dados.data_citacao || null,
    status_citacao: dados.status_citacao || null,
    observacao: dados.observacao || null,
  });
}

export async function listarPorDevedor(devedorId) {
  return sb(`${TABLE_DEV}?devedor_id=eq.${devedorId}&select=processo_id`);
}
