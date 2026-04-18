import { sb } from "../config/supabase.js";

const TABLE = "devedores_dividas";

export async function listarParticipantes(dividaId) {
  return sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&select=*,devedor:devedores(id,nome,cpf_cnpj,telefone,email)&order=created_at.asc`
  );
}

export async function listarDividasCoobrigado(devedorId) {
  return sb(
    `${TABLE}?devedor_id=eq.${devedorId}&papel=neq.PRINCIPAL&select=divida_id,papel,responsabilidade&order=created_at.asc`
  );
}

export async function listarDividasPrincipal(devedorId) {
  return sb(`${TABLE}?devedor_id=eq.${devedorId}&papel=eq.PRINCIPAL&select=divida_id`);
}

export async function adicionarParticipante({ devedorId, dividaId, papel, responsabilidade, observacao = "" }) {
  if (papel === "PRINCIPAL") {
    await demoverPrincipalAtual(dividaId);
  }
  return sb(TABLE, "POST", {
    devedor_id: devedorId,
    divida_id: String(dividaId),
    papel,
    responsabilidade,
    observacao,
  });
}

export async function alterarPapel(rowId, novoPapel, dividaId) {
  if (novoPapel === "PRINCIPAL") {
    await demoverPrincipalAtual(dividaId, rowId);
  }
  return sb(`${TABLE}?id=eq.${rowId}`, "PATCH", {
    papel: novoPapel,
    updated_at: new Date().toISOString(),
  });
}

export async function removerParticipante(rowId) {
  return sb(`${TABLE}?id=eq.${rowId}`, "DELETE");
}

export async function seedPrincipal(devedorId, dividaId) {
  const existing = await sb(
    `${TABLE}?devedor_id=eq.${devedorId}&divida_id=eq.${encodeURIComponent(dividaId)}&select=id&limit=1`
  );
  if (Array.isArray(existing) && existing.length > 0) return existing[0];

  const principalExistente = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&papel=eq.PRINCIPAL&select=id&limit=1`
  );
  const papel =
    Array.isArray(principalExistente) && principalExistente.length > 0
      ? "COOBRIGADO"
      : "PRINCIPAL";

  return sb(TABLE, "POST", {
    devedor_id: devedorId,
    divida_id: String(dividaId),
    papel,
    responsabilidade: "SOLIDARIA",
    observacao: "",
  });
}

async function demoverPrincipalAtual(dividaId, exceptRowId = null) {
  const rows = await sb(
    `${TABLE}?divida_id=eq.${encodeURIComponent(dividaId)}&papel=eq.PRINCIPAL&select=id`
  );
  if (!Array.isArray(rows)) return;
  for (const row of rows) {
    if (exceptRowId && String(row.id) === String(exceptRowId)) continue;
    await sb(`${TABLE}?id=eq.${row.id}`, "PATCH", {
      papel: "COOBRIGADO",
      updated_at: new Date().toISOString(),
    });
  }
}
