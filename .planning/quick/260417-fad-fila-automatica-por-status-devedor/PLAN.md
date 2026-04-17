---
phase: quick-260417-fad
plan: 01
subsystem: frontend + backend + db
tags: [react, fila-devedor, supabase, automatico, status]
goal: Devedores com status ativo aparecem automaticamente na Fila — sem contratos/parcelas obrigatórios
status: in_progress
---

# Plan: Fila Automática por Status do Devedor

## Goal
Mostrar todos os devedores com status ativo (novo, em_localizacao, notificado, em_negociacao) 
diretamente no Painel da Fila, com score automático, filtros, ações rápidas e polling 30s.

## Assumptions confirmadas

| Fato | Valor |
|------|-------|
| Status ativos no DB | `novo`, `em_localizacao`, `notificado`, `em_negociacao` |
| Status terminais | `acordo_firmado`, `pago_integral`, `pago_parcial`, `irrecuperavel`, `ajuizado` |
| Campo valor | `valor_total` (numeric) |
| Realtime disponível | NÃO — polling 30s (sem @supabase/supabase-js) |
| eventos_andamento.contrato_id | NOT NULL → precisa de DDL |
| fila_cobranca.contrato_id | NOT NULL → precisa de DDL |

## Tasks

### T1 — DB Migrations (Management API)
```sql
ALTER TABLE public.fila_cobranca ALTER COLUMN contrato_id DROP NOT NULL;
ALTER TABLE public.eventos_andamento ALTER COLUMN contrato_id DROP NOT NULL;
ALTER TABLE public.eventos_andamento ADD COLUMN IF NOT EXISTS devedor_id BIGINT REFERENCES public.devedores(id);
```

### T2 — filaDevedor.js: nova função listarDevedoresParaFila()
- Query devedores WHERE status IN (4 ativos)
- Query fila_cobranca para ver quais já têm EM_ATENDIMENTO ou bloqueado
- Calcular score em JS: status bonus + valor_total/100 + dias_desde_cadastro
- Retornar ordenado por score desc
- Scores: novo=100, em_localizacao=80, notificado=60, em_negociacao=40

### T3 — filaDevedor.js: modificar proximoDevedor()
- Buscar top devedor via listarDevedoresParaFila() (excluindo em_atendimento)
- Criar fila_cobranca entry com devedor_id, sem contrato_id (nullable)
- Retornar devedor + eventos (query por devedor_id)

### T4 — filaDevedor.js: nova função alterarStatusDevedor()
- PATCH devedores SET status
- Se terminal: PATCH fila_cobranca SET status_fila=REMOVIDO WHERE devedor_id=X

### T5 — filaDevedor.js: modificar registrarEvento()
- Aceitar devedorId ao invés de contratoId (ou ambos)
- Gravar devedor_id (sem contrato_id quando não disponível)

### T6 — FilaDevedor.jsx: reescrever FilaPainel
Novo layout:
- Colunas: Nome | CPF/CNPJ | Status (badge) | Valor | Dias | Prioridade | Telefone | Ações
- Filtros: busca texto, checkboxes status, credor, prioridade, valor range
- Auto-load no mount + poll 30s (useEffect + setInterval)
- Ações por linha: 📞 Ligar | 💬 WhatsApp | 📧 Email | ✏️ Evento | 👁 Ver (abre FilaAtendimento)
- Sem botão "Atualizar Fila" manual
- Contadores: Aguardando | Em Atendimento | Bloqueados | Total

### T7 — FilaDevedor.jsx: atualizar FilaAtendimento
- Aceitar devedor direto (sem exigir fila/contrato)
- Query eventos_andamento por devedor_id (nova coluna)
- Dropdown alterar status: Novo → Em Loc → Notif → Em Neg → Acordo → etc
- Ações rápidas no cabeçalho: 📞 Ligar, 💬 WhatsApp
- Registrar evento com devedor_id (sem contrato_id)

### T8 — Build + commit + push + vercel --prod

## Key decisions
- Não modificar fila_cobranca como fonte de verdade para o Painel — devedores são a fonte
- fila_cobranca usado apenas para lock de atendimento (EM_ATENDIMENTO) e bloqueio (bloqueado_ate)
- Polling 30s ao invés de Supabase Realtime (client não instalado)
- "Em atendimento por X" mostrado quando fila_cobranca.status_fila = EM_ATENDIMENTO nesse devedor
