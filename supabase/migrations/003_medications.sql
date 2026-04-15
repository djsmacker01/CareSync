-- ============================================================
-- Migration 003: medications table
-- Prescriptions assigned to individual clients
-- ============================================================

CREATE TABLE IF NOT EXISTS public.medications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  medication_name  TEXT NOT NULL,
  dosage           TEXT NOT NULL,
  frequency        TEXT NOT NULL,
  route            TEXT CHECK (route IN ('oral', 'topical', 'inhaled', 'injection', 'drops', 'patch', 'other')),
  prescriber       TEXT,
  start_date       DATE,
  end_date         DATE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read active medications
CREATE POLICY "medications_read" ON public.medications
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

-- Managers/supervisors can read all (including inactive — audit trail)
CREATE POLICY "medications_manager_read_all" ON public.medications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

-- Only managers/supervisors can write medication records
CREATE POLICY "medications_write" ON public.medications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_medications_client ON public.medications (client_id);
CREATE INDEX IF NOT EXISTS idx_medications_active ON public.medications (is_active);
