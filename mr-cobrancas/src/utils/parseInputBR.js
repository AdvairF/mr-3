/**
 * parseBRDate — converte input BR (DD/MM/AAAA ou DD-MM-AAAA) para ISO (YYYY-MM-DD).
 * Idempotente: ISO já formatado retorna sem mudança.
 * @param {unknown} input
 * @returns {string|null} "YYYY-MM-DD" ou null se inválido
 */
export function parseBRDate(input) {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  // Already ISO YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;
  // BR DD/MM/AAAA or DD-MM-AAAA
  const brMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  return null;
}

/**
 * parseBRValue — converte input BR (R$ 1.234,56) para number.
 * Aceita: "R$ 1.234,56", "1.234,56", "1234,56", "1234.56", "1234"
 * @param {unknown} input
 * @returns {number|null} number ou null se inválido
 */
export function parseBRValue(input) {
  if (input == null) return null;
  if (typeof input === "number") return isFinite(input) ? input : null;
  if (typeof input !== "string") return null;
  let s = input.trim().replace(/^R\$\s*/i, "");
  if (!s) return null;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // BR format "1.234,56" — dot is thousands, comma is decimal
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // Only comma — treat as decimal
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return isFinite(n) ? n : null;
}
