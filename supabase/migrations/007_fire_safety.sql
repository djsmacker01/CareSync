-- ============================================================
-- Migration 007: fire_safety_checks table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fire_safety_checks (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type     TEXT NOT NULL CHECK (
    check_type IN ('fire_door', 'extinguisher', 'alarm_test', 'evacuation_drill')
  ),
  checked_by     UUID NOT NULL REFERENCES public.users(id),
  check_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'action_required')),
  notes          TEXT,
  next_due_date  DATE,   -- auto-calculated on insert via trigger
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.fire_safety_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fire_read" ON public.fire_safety_checks
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "fire_insert" ON public.fire_safety_checks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Trigger: auto-calculate next_due_date based on check_type frequency
CREATE OR REPLACE FUNCTION public.set_fire_next_due()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.next_due_date := CASE NEW.check_type
    WHEN 'fire_door'        THEN NEW.check_date + INTERVAL '7 days'
    WHEN 'alarm_test'       THEN NEW.check_date + INTERVAL '7 days'
    WHEN 'extinguisher'     THEN NEW.check_date + INTERVAL '30 days'
    WHEN 'evacuation_drill' THEN NEW.check_date + INTERVAL '90 days'
    ELSE NEW.check_date + INTERVAL '30 days'
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fire_next_due
  BEFORE INSERT ON public.fire_safety_checks
  FOR EACH ROW EXECUTE FUNCTION public.set_fire_next_due();

CREATE INDEX IF NOT EXISTS idx_fire_check_date  ON public.fire_safety_checks (check_date DESC);
CREATE INDEX IF NOT EXISTS idx_fire_check_type  ON public.fire_safety_checks (check_type);
CREATE INDEX IF NOT EXISTS idx_fire_next_due    ON public.fire_safety_checks (next_due_date);
