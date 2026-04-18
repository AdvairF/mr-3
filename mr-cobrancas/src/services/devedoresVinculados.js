import { sb } from "../config/supabase.js";

const TABLE = "devedores_vinculados";

// Lista todos os vínculos onde este devedor é o principal
export async function listar(principalId) {
  return sb(
    `${TABLE}?devedor_principal_id=eq.${principalId}&select=*,vinculado:devedores!devedor_vinculado_id(id,nome,cpf_cnpj,telefone,tipo,status)&order=created_at.asc`
  );
}

// Lista vínculos inversos: devedores que têm ESTE devedor como vinculado
export async function listarInverso(devedorId) {
  return sb(
    `${TABLE}?devedor_vinculado_id=eq.${devedorId}&select=*,principal:devedores!devedor_principal_id(id,nome,cpf_cnpj,tipo,status)&order=created_at.asc`
  );
}

// Retorna um Set com todos os devedor_principal_id que possuem ao menos 1 vínculo
// Usado para renderizar o badge 👥 na lista de devedores
export async function listarTodosIds() {
  const rows = await sb(`${TABLE}?select=devedor_principal_id`);
  return new Set((Array.isArray(rows) ? rows : []).map(r => String(r.devedor_principal_id)));
}

export async function adicionarVinculo({ principalId, vinculadoId, tipoVinculo = "COOBRIGADO", observacao = "" }) {
  return sb(TABLE, "POST", {
    devedor_principal_id: principalId,
    devedor_vinculado_id: vinculadoId,
    tipo_vinculo: tipoVinculo,
    observacao,
  });
}

export async function removerVinculo(id) {
  return sb(`${TABLE}?id=eq.${id}`, "DELETE");
}

export async function atualizarVinculo(id, dados) {
  // dados: { tipo_vinculo?, observacao? }
  return sb(`${TABLE}?id=eq.${id}`, "PATCH", dados);
}
