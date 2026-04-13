export const maskCPF  = v => { const n = v.replace(/\D/g, ""); return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").slice(0, 14); };
export const maskCNPJ = v => { const n = v.replace(/\D/g, ""); return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").slice(0, 18); };
export const maskTel  = v => { const n = v.replace(/\D/g, ""); return n.length <= 10 ? n.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3") : n.replace(/(\d{2})(\d{1})(\d{4})(\d{4})/, "($1) $2 $3-$4").slice(0, 16); };
export const maskCEP  = v => v.replace(/\D/g, "").replace(/(\d{5})(\d{3})/, "$1-$2").slice(0, 9);
