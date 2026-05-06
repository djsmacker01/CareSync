-- ============================================================
-- Migration 021: Outcome & Goal Tracking
-- Independence goals per resident, with progress updates
-- ============================================================

-- ── 1. Goals ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  description  TEXT,
  category     TEXT        NOT NULL
                 CHECK (category IN (
                   'life_skills','employment','social','health',
                   'education','housing','finance','wellbeing','other'
                 )),
  priority     TEXT        NOT NULL DEFAULT 'medium'
                 CHECK (priority IN ('high','medium','low')),
  status       TEXT        NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','achieved','paused','discontinued')),
  target_date  DATE,
  achieved_at  TIMESTAMPTZ,
  created_by   UUID        NOT NULL REFERENCES public.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_client ON public.goals (client_id, status, created_at DESC);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_read" ON public.goals
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "goals_insert" ON public.goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager','supervisor')
    )
  );

CREATE POLICY "goals_update" ON public.goals
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ── 2. Goal Progress Updates ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.goal_updates (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id        UUID        NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  client_id      UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  progress_level INTEGER     NOT NULL CHECK (progress_level BETWEEN 1 AND 5),
  notes          TEXT        NOT NULL,
  logged_by      UUID        NOT NULL REFERENCES public.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goal_updates_goal   ON public.goal_updates (goal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_goal_updates_client ON public.goal_updates (client_id, created_at DESC);

ALTER TABLE public.goal_updates ENABLE ROW LEVEL SECURITY;

-- All staff can read and insert progress updates (append-only)
CREATE POLICY "goal_updates_read" ON public.goal_updates
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "goal_updates_insert" ON public.goal_updates
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- No UPDATE / DELETE — append-only audit trail
