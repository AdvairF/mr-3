# SQL Migrations — Phase 7: Pagamentos por Contrato

Execute os 4 blocos abaixo no Supabase SQL Editor **nesta ordem**.

---

## Migration 3 — ALTER CHECK em contratos_historico

```sql
-- Migration 3 — Adicionar 'pagamento_recebido' e 'pagamento_revertido' ao CHECK constraint
-- Executar ANTES de qualquer código de service da Phase 7.
-- Run in Supabase SQL Editor

ALTER TABLE public.contratos_historico
  DROP CONSTRAINT IF EXISTS contratos_historico_tipo_evento_check;
ALTER TABLE public.contratos_historico
  ADD CONSTRAINT contratos_historico_tipo_evento_check
  CHECK (tipo_evento IN (
    'criacao', 'alteracao_encargos', 'cessao_credito',
    'assuncao_divida', 'alteracao_referencia', 'outros',
    'pagamento_recebido', 'pagamento_revertido'
  ));
```

---

## Migration 5 — CREATE TABLE pagamentos_contrato

```sql
-- Migration 5 — Nova tabela pagamentos_contrato
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.pagamentos_contrato (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id    UUID          NOT NULL REFERENCES public.contratos_dividas(id) ON DELETE CASCADE,
  data_pagamento DATE          NOT NULL,
  valor          NUMERIC(15,2) NOT NULL,
  observacao     TEXT,
  parcelas_ids   UUID[]        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE public.pagamentos_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acesso autenticado" ON public.pagamentos_contrato
  FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_pagamentos_contrato_contrato_id
  ON public.pagamentos_contrato (contrato_id, data_pagamento ASC);
```

---

## Migration 4a — SP registrar_pagamento_contrato

```sql
-- Migration 4a — SP registrar_pagamento_contrato
-- Run in Supabase SQL Editor (executar APÓS Migration 3 e Migration 5)

CREATE OR REPLACE FUNCTION public.registrar_pagamento_contrato(
  p_contrato_id    UUID,
  p_data_pagamento DATE,
  p_valor          NUMERIC,
  p_observacao     TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_parcela        RECORD;
  v_saldo_parcela  NUMERIC;
  v_total_pago_parcela NUMERIC;
  v_pago           NUMERIC;
  v_restante       NUMERIC;
  v_amortizadas    UUID[] := '{}';
  v_count          INT    := 0;
  v_pagamento_id   UUID;
BEGIN
  v_restante := p_valor;

  -- Iterar parcelas abertas do contrato, da mais antiga para a mais nova
  FOR v_parcela IN
    SELECT id, valor_total, data_vencimento
    FROM public.dividas
    WHERE contrato_id = p_contrato_id
      AND saldo_quitado = false
    ORDER BY data_vencimento ASC, id ASC
  LOOP
    EXIT WHEN v_restante <= 0;

    -- Calcular saldo atual da parcela (valor_total - soma de pagamentos já registrados)
    SELECT COALESCE(SUM(valor), 0)
      INTO v_total_pago_parcela
      FROM public.pagamentos_divida
     WHERE divida_id = v_parcela.id;

    v_saldo_parcela := v_parcela.valor_total - v_total_pago_parcela;

    IF v_saldo_parcela <= 0 THEN
      CONTINUE;
    END IF;

    -- Amortizar: pagar o mínimo entre saldo da parcela e valor restante
    v_pago := LEAST(v_saldo_parcela, v_restante);

    INSERT INTO public.pagamentos_divida (divida_id, data_pagamento, valor, observacao)
    VALUES (v_parcela.id, p_data_pagamento, v_pago, p_observacao);

    v_restante := v_restante - v_pago;

    -- Quitar parcela se saldo zerou
    IF (v_saldo_parcela - v_pago) <= 0 THEN
      UPDATE public.dividas SET saldo_quitado = true WHERE id = v_parcela.id;
    END IF;

    v_amortizadas := array_append(v_amortizadas, v_parcela.id);
    v_count := v_count + 1;
  END LOOP;

  -- Inserir registro em pagamentos_contrato
  INSERT INTO public.pagamentos_contrato (contrato_id, data_pagamento, valor, observacao, parcelas_ids)
  VALUES (p_contrato_id, p_data_pagamento, p_valor, p_observacao, v_amortizadas)
  RETURNING id INTO v_pagamento_id;

  -- Registrar evento em contratos_historico (HIS-05)
  INSERT INTO public.contratos_historico (contrato_id, tipo_evento, snapshot_campos)
  VALUES (
    p_contrato_id,
    'pagamento_recebido',
    jsonb_build_object(
      'pagamento_id',        v_pagamento_id,
      'valor',               p_valor,
      'data_pagamento',      p_data_pagamento,
      'parcelas_amortizadas', v_count,
      'parcelas_ids',        v_amortizadas
    )
  );

  RETURN jsonb_build_object(
    'parcelas_amortizadas', v_count,
    'parcelas_ids',         v_amortizadas
  );
END;
$$;
```

---

## Migration 4b — SP reverter_pagamento_contrato

```sql
-- Migration 4b — SP reverter_pagamento_contrato
-- Run in Supabase SQL Editor (executar APÓS Migration 4a)

CREATE OR REPLACE FUNCTION public.reverter_pagamento_contrato(
  p_pagamento_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pagamento RECORD;
  v_parcela_id UUID;
BEGIN
  -- Buscar o pagamento a reverter
  SELECT id, contrato_id, data_pagamento, valor, observacao, parcelas_ids
    INTO v_pagamento
    FROM public.pagamentos_contrato
   WHERE id = p_pagamento_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pagamento % não encontrado', p_pagamento_id;
  END IF;

  -- Reverter amortização para cada parcela afetada
  FOREACH v_parcela_id IN ARRAY v_pagamento.parcelas_ids
  LOOP
    -- Remover os pagamentos_divida inseridos por este pagamento de contrato
    -- Identificados por: mesma divida_id, mesma data_pagamento, mesma observacao
    DELETE FROM public.pagamentos_divida
     WHERE divida_id = v_parcela_id
       AND data_pagamento = v_pagamento.data_pagamento
       AND observacao IS NOT DISTINCT FROM v_pagamento.observacao;

    -- Reabrir parcela (pode ter sido quitada por este pagamento)
    UPDATE public.dividas
       SET saldo_quitado = false
     WHERE id = v_parcela_id;
  END LOOP;

  -- Remover o registro do pagamento de contrato
  DELETE FROM public.pagamentos_contrato WHERE id = p_pagamento_id;

  -- Registrar evento de reversão em contratos_historico (HIS-05)
  INSERT INTO public.contratos_historico (contrato_id, tipo_evento, snapshot_campos)
  VALUES (
    v_pagamento.contrato_id,
    'pagamento_revertido',
    jsonb_build_object(
      'pagamento_id',        p_pagamento_id,
      'valor',               v_pagamento.valor,
      'data_pagamento',      v_pagamento.data_pagamento,
      'parcelas_ids',        v_pagamento.parcelas_ids
    )
  );
END;
$$;
```

---

## Verificação pós-execução

```sql
-- Confirmar que ambas as SPs existem:
SELECT proname FROM pg_proc
WHERE proname IN ('registrar_pagamento_contrato', 'reverter_pagamento_contrato');
-- Esperado: 2 rows

-- Confirmar colunas de pagamentos_contrato:
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pagamentos_contrato';
-- Esperado: 7 colunas incluindo parcelas_ids
```
