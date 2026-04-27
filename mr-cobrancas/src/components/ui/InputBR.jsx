import { parseBRDate, parseBRValue } from "../../utils/parseInputBR.js";

/**
 * InputBR — wrapper paste-friendly BR para data e valor monetário (D-pre-3 + D-pre-8).
 *
 * Props:
 *   type      — "date" | "value" | (qualquer outro tipo HTML, ex: "text", "number")
 *   value     — string controlled value
 *   onChange  — (rawValue: string) => void  (recebe valor cru, não evento — convenção <Inp>)
 *
 * type="date":  intercepta paste BR (DD/MM/AAAA ou DD-MM-AAAA), parseBRDate -> ISO,
 *               input nativo type="date".
 * type="value": intercepta paste BR (R$ 1.234,56 etc), parseBRValue -> number,
 *               grava como String(number) no state. input nativo type="number".
 * outros types: render direto <input type={type}> com onChange convencional.
 */
export default function InputBR({ type, value, onChange, ...rest }) {
  const isCustom = type === "date" || type === "value";
  if (!isCustom) {
    return (
      <input
        type={type}
        value={value ?? ""}
        onChange={e => onChange(e.target.value)}
        {...rest}
      />
    );
  }

  const handlePaste = (e) => {
    const pasted = e.clipboardData?.getData?.("text") ?? "";
    if (type === "date") {
      const parsed = parseBRDate(pasted);
      if (parsed !== null) {
        e.preventDefault();
        onChange(parsed);
      }
      // se parsed === null, deixa o paste nativo seguir (UX: usuário pode estar colando algo válido para o input nativo)
    } else if (type === "value") {
      const parsed = parseBRValue(pasted);
      if (parsed !== null) {
        e.preventDefault();
        onChange(String(parsed));
      }
    }
  };

  // Native HTML type — InputBR's "value" maps to native "number"; InputBR's "date" maps to native "date".
  const nativeType = type === "value" ? "number" : "date";
  return (
    <input
      type={nativeType}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      onPaste={handlePaste}
      {...rest}
    />
  );
}
