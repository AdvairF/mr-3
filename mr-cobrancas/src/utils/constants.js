// ─── STATUS ───────────────────────────────────────────────────
export const STATUS_DEV = [
  { v: "novo",           l: "Novo",               cor: "#64748b", bg: "#f1f5f9" },
  { v: "em_localizacao", l: "Em Localização",     cor: "#2563eb", bg: "#dbeafe" },
  { v: "notificado",     l: "Notificado",          cor: "#7c3aed", bg: "#ede9fe" },
  { v: "em_negociacao",  l: "Em Negociação",       cor: "#d97706", bg: "#fef3c7" },
  { v: "acordo_firmado", l: "Acordo Firmado",      cor: "#16a34a", bg: "#dcfce7" },
  { v: "pago_integral",  l: "Pago Integralmente",  cor: "#065f46", bg: "#d1fae5" },
  { v: "pago_parcial",   l: "Pago Parcialmente",   cor: "#0f766e", bg: "#ccfbf1" },
  { v: "irrecuperavel",  l: "Irrecuperável",       cor: "#dc2626", bg: "#fee2e2" },
  { v: "ajuizado",       l: "Ajuizado",            cor: "#c2410c", bg: "#ffedd5" },
];

// ─── UFS ──────────────────────────────────────────────────────
export const UFS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

// ─── FORMULÁRIO VAZIO ─────────────────────────────────────────
export const FORM_DEV_VAZIO = {
  nome: "", cpf_cnpj: "", tipo: "PJ", rg: "", data_nascimento: "", profissao: "",
  socio_nome: "", socio_cpf: "", email: "", telefone: "", telefone2: "",
  cep: "", logradouro: "", numero: "", complemento: "", bairro: "", cidade: "Goiânia", uf: "GO",
  credor_id: "", valor_nominal: "", data_origem_divida: "", data_recebimento_carteira: "", descricao_divida: "",
  status: "novo", responsavel: "", observacoes: "", numero_processo: "",
};

export const DIVIDA_VAZIA = {
  descricao: "", valor_total: "", data_origem: "", data_primeira_parcela: "", qtd_parcelas: "1",
  parcelas: [], indexador: "igpm", juros_tipo: "fixo_1", multa_pct: "0", juros_am: "0", honorarios_pct: "0",
  data_inicio_atualizacao: "", despesas: "0", observacoes: "", custas: [],
};

export const SECOES = [["id", "👤 Identificação"], ["end", "📍 Endereço"], ["divida", "💰 Dívida"], ["ctrl", "⚙️ Controle"]];

// ─── LEMBRETES ────────────────────────────────────────────────
export const TIPOS_LEM = [
  { v: "promessa_pagamento", l: "💰 Promessa de Pagamento", cor: "#059669", bg: "#dcfce7" },
  { v: "retorno",            l: "📞 Retorno de Ligação",   cor: "#2563eb", bg: "#dbeafe" },
  { v: "whatsapp",           l: "📱 Contato WhatsApp",     cor: "#16a34a", bg: "#d1fae5" },
  { v: "audiencia",          l: "⚖️ Audiência",             cor: "#7c3aed", bg: "#ede9fe" },
  { v: "prazo",              l: "📅 Prazo Processual",     cor: "#d97706", bg: "#fef3c7" },
  { v: "outro",              l: "🔹 Outro",                cor: "#64748b", bg: "#f1f5f9" },
];

export const PRIOR = [
  { v: "baixa",  l: "🟢 Baixa"  },
  { v: "normal", l: "🟡 Normal" },
  { v: "alta",   l: "🔴 Alta"   },
];

// ─── PROCESSOS ────────────────────────────────────────────────
export const PROC_TIPOS  = ["Cumprimento de Sentença","Execução de Título","Execução Fiscal","Agravo de Instrumento","Agravo Interno","Recurso Especial","Recurso Extraordinário","Ação de Cobrança","Ação de Despejo","Embargos de Declaração","Mandado de Segurança","Outro"];
export const PROC_FASES  = ["Citação","Contestação","Instrução","Sentença","Recurso","Penhora","Avaliação","Leilão","Pagamento","Encerrado"];
export const PROC_STATUS = ["em_andamento","aguardando","encerrado","suspenso"];
export const PROC_INST   = ["1ª Instância","2ª Instância / Câmara","STJ","STF"];
export const PROC_TRIB   = ["TJGO","JFGO (TRF1)","TJDF","TJSP","TJRJ","TJMG","TJMT","TJMS","TJPR","TJBA","STJ","STF","Outro"];
export const AND_TIPOS   = ["Citação","Contestação","Audiência","Decisão Interlocutória","Sentença","Recurso","Penhora","Leilão","Extinção","Petição","Despacho","Pagamento","Outros"];

export const FORM_PROC_VAZIO = {
  numero: "", numero_origem: "", devedor_id: "", credor_id: "",
  tipo: "Cumprimento de Sentença", fase: "Citação", instancia: "1ª Instância",
  tribunal: "TJGO", vara: "", valor: "", status: "em_andamento",
  data_ajuizamento: "", data_distribuicao: "", proximo_prazo: "", observacoes: "",
};
