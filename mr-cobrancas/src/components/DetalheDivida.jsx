import { useState, useRef } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import DevedoresDaDivida from "./DevedoresDaDivida.jsx";
import Art523Option from "./Art523Option.jsx";
import { calcularSaldosPorDivida, calcularTotalPagoPorDivida } from "../utils/devedorCalc.js";
import PagamentosDivida from "./PagamentosDivida.jsx";

function fmtBRL(v) {
  if (v == null || v === "") return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const STATUS_DIVIDA_META = {
  "em cobrança": { bg: "#dbeafe", cor: "#1d4ed8", label: "Em Cobrança" },
  "quitada":     { bg: "#dcfce7", cor: "#065f46", label: "Quitada" },
  "acordo":      { bg: "#fef3c7", cor: "#d97706", label: "Acordo" },
};

function StatusBadgeDivida({ status }) {
  const s = STATUS_DIVIDA_META[status] || { bg: "#f1f5f9", cor: "#64748b", label: status };
  return (
    <span style={{
      display: "inline-block",
      background: s.bg,
      color: s.cor,
      fontSize: 11,
      fontWeight: 700,
      padding: "3px 8px",
      borderRadius: 99,
      whiteSpace: "nowrap",
    }}>
      {s.label}
    </span>
  );
}

export default function DetalheDivida({ divida, devedores, credores, allPagamentos, hoje, onVoltar, onCarregarTudo, setTab }) {
  const [showPrincipalWarning, setShowPrincipalWarning] = useState(false);
  const pendingActionRef = useRef(null);

  async function handleRemovePrincipalWarning(participante, doRemove) {
    return new Promise((resolve) => {
      pendingActionRef.current = { doRemove, resolve };
      setShowPrincipalWarning(true);
    });
  }

  async function handleConfirmarRemoverPrincipal() {
    setShowPrincipalWarning(false);
    const { doRemove, resolve } = pendingActionRef.current || {};
    pendingActionRef.current = null;
    if (doRemove) {
      try {
        await doRemove();
        await onCarregarTudo();
      } catch (e) {
        toast.error("Erro ao remover: " + e.message);
      }
    }
    if (resolve) resolve();
  }

  function handleCancelarRemoverPrincipal() {
    setShowPrincipalWarning(false);
    const { resolve } = pendingActionRef.current || {};
    pendingActionRef.current = null;
    if (resolve) resolve();
  }

  const devedor = devedores.find(d => String(d.id) === String(divida.devedor_id));
  const pagamentosDoDevedor = allPagamentos.filter(p => String(p.devedor_id) === String(divida.devedor_id));
  const credor = credores?.find(c => String(c.id) === String(divida.credor_id));

  const saldosMap = devedor ? calcularSaldosPorDivida(devedor, pagamentosDoDevedor, hoje) : null;
  const saldoDivida = saldosMap != null ? (saldosMap[String(divida.id)] ?? null) : null;
  // saldoDividaLocal: sobrescreve saldoDivida quando PagamentosDivida reporta novo saldo via onSaldoChange
  const [saldoDividaLocal, setSaldoDividaLocal] = useState(null);
  // Valor efetivo: se PagamentosDivida já propagou um saldo (saldoDividaLocal !== null), usar esse;
  // senão usar o calculado pelos pagamentos_parciais do devedor (saldoDivida).
  const saldoAtual = saldoDividaLocal !== null ? saldoDividaLocal : saldoDivida;
  const pagoPorDividaMap = devedor ? calcularTotalPagoPorDivida(devedor, pagamentosDoDevedor, hoje) : {};
  const totalPago = pagoPorDividaMap[String(divida.id)] ?? 0;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 32px 0" }}>

      {/* 1. Back button */}
      <button
        onClick={onVoltar}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 700,
          color: "#64748b",
          padding: "0 0 12px 0",
          display: "block",
        }}
      >
        ← Dívidas
      </button>

      {/* 2. Header card */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 16, border: "1px solid #e8f0f7" }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 22, color: "#0f172a", marginBottom: 8 }}>
          {devedor?.nome || "— sem devedor principal"}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#64748b", fontSize: 13, alignItems: "center" }}>
          <span>
            Credor:{" "}
            <strong style={{ color: "#374151" }}>
              {credor?.nome || <span style={{ color: "#94a3b8", fontStyle: "italic" }}>— sem credor</span>}
            </strong>
          </span>
          <StatusBadgeDivida status={divida.status} />
        </div>
      </div>

      {/* 3. Financial card */}
      <div style={{ background: "linear-gradient(135deg,#fff5f5 0%,#fff 100%)", borderRadius: 16, padding: "18px 20px", border: "1px solid #fecaca", marginBottom: 16 }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 12 }}>Resumo Financeiro</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Valor Original
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {fmtBRL(divida.valor_total)}
            </p>
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Saldo Atualizado
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {saldoAtual != null ? fmtBRL(saldoAtual) : "—"}
            </p>
            {saldoAtual !== null && saldoAtual <= 0 && (
              <span
                role="status"
                style={{
                  display: "inline-block",
                  background: "#dcfce7",
                  color: "#065f46",
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 99,
                  whiteSpace: "nowrap",
                  marginTop: 4,
                }}
              >
                Saldo quitado
              </span>
            )}
          </div>
          <div style={{ background: "#fff", borderRadius: 12, padding: "12px 16px", border: "1px solid #e2e8f0", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
              Total Pago
            </p>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", fontFamily: "'Space Grotesk',sans-serif", margin: 0 }}>
              {fmtBRL(totalPago)}
            </p>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 8, fontStyle: "italic", marginBottom: 0 }}>
          (amortização sequencial conforme Art. 354 CC)
        </p>
      </div>

      {/* 4. Art.523 card (read-only) */}
      {divida.art523_opcao && divida.art523_opcao !== "nao_aplicar" && (
        <div style={{ background: "#f8fafc", borderRadius: 14, padding: "14px 16px", border: "1px solid #e2e8f0", marginBottom: 16 }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 10 }}>Art. 523 CPC</p>
          <div style={{ pointerEvents: "none", opacity: 0.85 }}>
            <Art523Option
              value={divida.art523_opcao === "so_multa" ? "apenas_multa" : divida.art523_opcao}
              onChange={() => {}}
            />
          </div>
        </div>
      )}

      {/* 5. Pessoas Vinculadas */}
      <div style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", border: "1px solid #e8f0f7", marginBottom: 16 }}>
        <p style={{ fontFamily: "'Space Grotesk',sans-serif", fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>Pessoas Vinculadas</p>
        {/* devedorAtualId={null} ensures ALL ✕ remove buttons are visible (not hidden by isAtual gate) */}
        <DevedoresDaDivida
          dividaId={divida.id}
          devedores={devedores}
          devedorAtualId={null}
          onRemovePrincipal={handleRemovePrincipalWarning}
        />
      </div>

      {/* 6. Pagamentos por Dívida — D-04 LOCKED: seção fixa no final */}
      <PagamentosDivida
        divida={divida}
        hoje={hoje}
        onSaldoChange={(novoSaldo) => setSaldoDividaLocal(novoSaldo)}
      />

      {/* 7. Editar Dívida button — D-04 LOCKED */}
      <div style={{ marginTop: 8 }}>
        <Btn outline onClick={() => {
          setTab("devedores");
          setTimeout(() => window.dispatchEvent(
            new CustomEvent("mr_abrir_devedor", { detail: divida.devedor_id })
          ), 100);
        }}>
          Editar Dívida
        </Btn>
      </div>

      {/* 7. D-05 PRINCIPAL removal warning modal */}
      {showPrincipalWarning && (
        <Modal title="Remover devedor principal" onClose={handleCancelarRemoverPrincipal} width={420}>
          <div style={{ background: "#fef9c3", borderRadius: 10, padding: "12px 16px", border: "1px solid #fde68a", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "#92400e", fontWeight: 700, margin: 0 }}>
              Remover devedor principal
            </p>
            <p style={{ fontSize: 12, color: "#92400e", marginTop: 6, marginBottom: 0 }}>
              Você está removendo o devedor principal. Esta dívida ficará sem responsável principal. Confirmar?
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn danger onClick={handleConfirmarRemoverPrincipal}>Confirmar remoção</Btn>
            <Btn outline onClick={handleCancelarRemoverPrincipal}>Manter dívida</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
