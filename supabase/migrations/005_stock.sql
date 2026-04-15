-- ============================================================
-- Migration 005: stock + stock_transactions tables
-- Stock is auto-deducted by MAR entries (trigger defined below)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.stock (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id      UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  client_id          UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  current_quantity   INTEGER NOT NULL CHECK (current_quantity >= 0),
  unit               TEXT NOT NULL DEFAULT 'tablets',  -- tablets | ml | patches | capsules | other
  reorder_threshold  INTEGER NOT NULL DEFAULT 7,
  last_checked_by    UUID REFERENCES public.users(id),
  last_checked_at    TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (medication_id, client_id)
);

CREATE TABLE IF NOT EXISTS public.stock_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_id          UUID NOT NULL REFERENCES public.stock(id) ON DELETE CASCADE,
  transaction_type  TEXT NOT NULL CHECK (transaction_type IN ('administered', 'received', 'disposed', 'adjustment')),
  quantity_change   INTEGER NOT NULL,   -- negative for deductions
  performed_by      UUID NOT NULL REFERENCES public.users(id),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS: stock
ALTER TABLE public.stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_read" ON public.stock
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_write" ON public.stock
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor', 'staff')
    )
  );

-- RLS: stock_transactions
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_tx_read" ON public.stock_transactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "stock_tx_insert" ON public.stock_transactions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: auto-deduct stock when a MAR entry with status='given' is inserted
CREATE OR REPLACE FUNCTION public.deduct_stock_on_mar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock_id UUID;
  v_new_qty  INTEGER;
  v_threshold INTEGER;
BEGIN
  IF NEW.status = 'given' THEN
    -- Find the stock record for this client + medication
    SELECT id, current_quantity, reorder_threshold
      INTO v_stock_id, v_new_qty, v_threshold
      FROM public.stock
      WHERE medication_id = NEW.medication_id
        AND client_id     = NEW.client_id
      FOR UPDATE;

    IF v_stock_id IS NOT NULL AND v_new_qty > 0 THEN
      v_new_qty := v_new_qty - 1;

      UPDATE public.stock
        SET current_quantity = v_new_qty,
            last_checked_by  = NEW.administered_by,
            last_checked_at  = NOW()
        WHERE id = v_stock_id;

      INSERT INTO public.stock_transactions (stock_id, transaction_type, quantity_change, performed_by, notes)
        VALUES (v_stock_id, 'administered', -1, NEW.administered_by,
                'Auto-deducted by MAR entry ' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mar_deduct_stock
  AFTER INSERT ON public.mar_entries
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_mar();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_medication   ON public.stock (medication_id);
CREATE INDEX IF NOT EXISTS idx_stock_client       ON public.stock (client_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_stock_id  ON public.stock_transactions (stock_id);
CREATE INDEX IF NOT EXISTS idx_stock_tx_created   ON public.stock_transactions (created_at DESC);
