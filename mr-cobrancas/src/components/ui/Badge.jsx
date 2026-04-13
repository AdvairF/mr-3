import { STATUS_DEV } from "../../utils/constants.js";

export function Badge({ cor, bg, children }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: bg, color: cor }}>
      {children}
    </span>
  );
}

export function BadgeDev({ status }) {
  const s = STATUS_DEV.find(x => x.v === status) || STATUS_DEV[0];
  return <Badge cor={s.cor} bg={s.bg}>{s.l}</Badge>;
}

export function BadgeProc({ status }) {
  const map = {
    em_andamento: { bg: "#dbeafe", cor: "#1d4ed8", l: "Em Andamento" },
    aguardando:   { bg: "#fef3c7", cor: "#d97706", l: "Aguardando"   },
    encerrado:    { bg: "#dcfce7", cor: "#065f46", l: "Encerrado"    },
    suspenso:     { bg: "#f1f5f9", cor: "#64748b", l: "Suspenso"     },
  };
  const s = map[status] || map.em_andamento;
  return <Badge cor={s.cor} bg={s.bg}>{s.l}</Badge>;
}
