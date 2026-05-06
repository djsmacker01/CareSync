-- ============================================================
-- Migration 020: Daily Activity Logs
-- Person-centred records of what residents did each shift
-- Supports: mood, activities, food/fluid, narrative
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id               UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  logged_by               UUID        NOT NULL REFERENCES public.users(id),
  log_date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  shift                   TEXT        NOT NULL CHECK (shift IN ('AM', 'PM', 'NIGHT')),
  mood                    TEXT        NOT NULL CHECK (mood IN ('happy','calm','anxious','low','distressed','unwell','other')),
  mood_notes              TEXT,
  activities              TEXT[]      NOT NULL DEFAULT '{}',
  narrative               TEXT        NOT NULL,   -- free-text of what happened
  food_intake             TEXT        CHECK (food_intake IN ('good','fair','poor','refused')),
  fluid_intake            TEXT        CHECK (fluid_intake IN ('good','fair','poor')),
  physical_observations   TEXT,        -- any health observations, skin, mobility, etc.
  community_participation BOOLEAN     NOT NULL DEFAULT false,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_client  ON public.activity_logs (client_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_date    ON public.activity_logs (log_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_staff   ON public.activity_logs (logged_by);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- All staff can read logs
CREATE POLICY "activity_read" ON public.activity_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- All staff can insert logs
CREATE POLICY "activity_insert" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Logs are append-only — no update or delete (person-centred record)
