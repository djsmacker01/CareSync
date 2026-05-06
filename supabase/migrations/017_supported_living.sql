-- ============================================================
-- Migration 017: Supported Living enhancements
-- 1. New MAR statuses: prompted, self_administered, assisted
-- 2. Update stock trigger to deduct on all administered statuses
-- 3. Staff visits table (lone worker check-in/out)
-- ============================================================

-- ── 1. Update mar_entries status constraint ──────────────────
ALTER TABLE public.mar_entries
  DROP CONSTRAINT IF EXISTS mar_entries_status_check;

ALTER TABLE public.mar_entries
  ADD CONSTRAINT mar_entries_status_check
  CHECK (status IN (
    'given',            -- administered by staff
    'prompted',         -- staff reminded resident; resident self-administered
    'self_administered',-- resident took independently (no staff action)
    'assisted',         -- staff provided physical assistance
    'refused',          -- resident declined
    'missed',           -- missed / not given this shift
    'not_required'      -- not required this shift (e.g. held by GP)
  ));

-- ── 2. Update stock deduction trigger ────────────────────────
-- Deduct stock for any status where the medication was actually taken
CREATE OR REPLACE FUNCTION public.deduct_stock_on_mar()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_stock_id  UUID;
  v_new_qty   INTEGER;
  v_threshold INTEGER;
BEGIN
  IF NEW.status IN ('given', 'prompted', 'self_administered', 'assisted') THEN
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

      INSERT INTO public.stock_transactions
        (stock_id, transaction_type, quantity_change, performed_by, notes)
        VALUES (
          v_stock_id, 'administered', -1, NEW.administered_by,
          'Auto-deducted by MAR entry (' || NEW.status || ') ' || NEW.id
        );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ── 3. Staff visits table (lone worker / supported living) ───
CREATE TABLE IF NOT EXISTS public.staff_visits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID NOT NULL REFERENCES public.users(id),
  client_id        UUID NOT NULL REFERENCES public.clients(id),
  address          TEXT,
  scheduled_start  TIMESTAMPTZ,
  scheduled_end    TIMESTAMPTZ,
  checked_in_at    TIMESTAMPTZ,
  checked_out_at   TIMESTAMPTZ,
  check_in_notes   TEXT,
  check_out_notes  TEXT,
  visit_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  status           TEXT NOT NULL DEFAULT 'scheduled'
                     CHECK (status IN ('scheduled','active','completed','overdue')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_visits ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read visits
CREATE POLICY "visits_read" ON public.staff_visits
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Staff can insert their own visits
CREATE POLICY "visits_insert" ON public.staff_visits
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    staff_id = auth.uid()
  );

-- Staff can update their own visits; managers/supervisors can update any
CREATE POLICY "visits_update" ON public.staff_visits
  FOR UPDATE USING (
    staff_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_staff_visits_staff    ON public.staff_visits (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_visits_client   ON public.staff_visits (client_id);
CREATE INDEX IF NOT EXISTS idx_staff_visits_date     ON public.staff_visits (visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_visits_status   ON public.staff_visits (status);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_visits;
