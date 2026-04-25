import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "./ui/Modal.jsx";
import Btn from "./ui/Btn.jsx";
import { Inp } from "./ui/Inp.jsx";

// Phase 7.9 — Modal de Custa Judicial (D-23 simplificada).
// Form único com 3 campos (descricao, valor, data) + 2 botões (Salvar, Cancelar).
// SEM dropdown de vínculo — custas SEMPRE avulsas (Q1 RECONSIDERED 2026-04-25).
// D-02 isolation: NÃO importa useSaldoAtualizadoCache, ModuloContratos, nem DetalheContrato.
//                 Persistência delegada ao parent via callback `onSalvar`.

export default function NovaCustaModal({ contrato, custaInicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState(() => ({
    descricao: custaInicial?.descricao ?? "",
    valor:     custaInicial?.valor != null ? String(custaInicial.valor) : "",
    data:      custaInicial?.data ?? "",                         // shape D-22 — motor lê c.data legacy (D-01 strict)
  }));
  const [salvando, setSalvando] = useState(false);

  const isEdit = !!custaInicial?.id;
  const titulo = isEdit ? "Editar Custa Judicial" : "Nova Custa Judicial";

  async function handleSalvarClick() {
    const descricao = String(form.descricao || "").trim();
    const valorNum  = parseFloat(form.valor);
    const data      = form.data || "";
    if (!descricao)                  { toast.error("Informe a descrição."); return; }
    if (!valorNum || valorNum <= 0)  { toast.error("Informe um valor maior que zero."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { toast.error("Informe a data da despesa (YYYY-MM-DD)."); return; }

    setSalvando(true);
    try {
      const payload = {
        id: custaInicial?.id ?? undefined,     // undefined em CRIAR; service preenche via gerarCustaId()
        descricao,
        valor: valorNum,
        data,                                   // shape D-22 — motor lê c.data legacy
        pago: custaInicial?.pago ?? false,      // preserva em edit; default false em criar
        data_pagamento: custaInicial?.data_pagamento ?? null,
      };
      await onSalvar(payload);
      // parent fecha modal via onCancelar ou re-render
    } catch (err) {
      // parent já mostrou toast.error; aqui só destrava o botão
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal title={titulo} onClose={onCancelar} width={480}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Inp
          label="Descrição"
          value={form.descricao}
          onChange={v => setForm(f => ({ ...f, descricao: v }))}
        />
        <Inp
          label="Valor (R$)"
          type="number"
          value={form.valor}
          onChange={v => setForm(f => ({ ...f, valor: v }))}
        />
        <Inp
          label="Data do pagamento"
          type="date"
          value={form.data}
          onChange={v => setForm(f => ({ ...f, data: v }))}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <Btn outline color="#64748b" sm onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Btn>
          <Btn color="#0d9488" sm onClick={handleSalvarClick} disabled={salvando}>
            {salvando ? "Salvando…" : "Salvar"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
