-- ============================================================
-- Migration 004: mar_entries table
-- Medication Administration Record — append-only, no updates/deletes
-- CQC requirement: records kept minimum 8 years
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mar_entries (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES public.clients(id),
  medication_id    UUID NOT NULL REFERENCES public.medications(id),
  administered_by  UUID NOT NULL REFERENCES public.users(id),
  shift            TEXT NOT NULL CHECK (shift IN ('AM', 'PM', 'NIGHT')),
  status           TEXT NOT NULL CHECK (status IN ('given', 'refused', 'missed', 'not_required')),
  refusal_reason   TEXT,   -- required when status = 'refused'
  notes            TEXT,
  administered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.mar_entries ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can insert MAR entries
CREATE POLICY "mar_insert" ON public.mar_entries
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- All authenticated staff can read MAR entries
CREATE POLICY "mar_read" ON public.mar_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- NO UPDATE or DELETE policies — append-only for clinical audit trail

CREATE INDEX IF NOT EXISTS idx_mar_client        ON public.mar_entries (client_id);
CREATE INDEX IF NOT EXISTS idx_mar_medication    ON public.mar_entries (medication_id);
CREATE INDEX IF NOT EXISTS idx_mar_administered_by ON public.mar_entries (administered_by);
CREATE INDEX IF NOT EXISTS idx_mar_shift         ON public.mar_entries (shift);
CREATE INDEX IF NOT EXISTS idx_mar_date          ON public.mar_entries (administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_mar_status        ON public.mar_entries (status);
