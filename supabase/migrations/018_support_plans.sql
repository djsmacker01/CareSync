-- ============================================================
-- Migration 018: Support Plans
-- Structured, versioned support plan sections per client.
-- All versions kept for full audit trail (CQC requirement).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_plan_sections (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  section_key  TEXT        NOT NULL,
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL DEFAULT '',
  updated_by   UUID        NOT NULL REFERENCES public.users(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version      INTEGER     NOT NULL DEFAULT 1,
  is_current   BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enforce only one current version per client+section
  CONSTRAINT uq_current_section UNIQUE NULLS NOT DISTINCT (client_id, section_key, is_current)
    -- Note: the unique constraint is on the pair only when is_current = true
    -- We'll enforce this in the application layer instead (simpler for Postgres 14 compat)
);

-- Drop the partial unique and replace with a regular index approach
ALTER TABLE public.support_plan_sections
  DROP CONSTRAINT IF EXISTS uq_current_section;

-- Partial unique index: only one row may be current per (client, section)
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_plan_current
  ON public.support_plan_sections (client_id, section_key)
  WHERE is_current = true;

-- Index for fetching history
CREATE INDEX IF NOT EXISTS idx_support_plan_client
  ON public.support_plan_sections (client_id, section_key, updated_at DESC);

-- RLS
ALTER TABLE public.support_plan_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sp_read" ON public.support_plan_sections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "sp_insert" ON public.support_plan_sections
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE POLICY "sp_update" ON public.support_plan_sections
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('manager', 'supervisor')
    )
  );
