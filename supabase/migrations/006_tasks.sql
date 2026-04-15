-- ============================================================
-- Migration 006: tasks + task_completions + handover_notes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  shift         TEXT NOT NULL CHECK (shift IN ('AM', 'PM', 'BOTH')),
  is_recurring  BOOLEAN NOT NULL DEFAULT true,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID NOT NULL REFERENCES public.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.task_completions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id          UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  completed_by     UUID NOT NULL REFERENCES public.users(id),
  shift            TEXT NOT NULL CHECK (shift IN ('AM', 'PM')),
  completion_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  UNIQUE (task_id, completion_date, shift)  -- prevent double-ticking same task same shift
);

CREATE TABLE IF NOT EXISTS public.handover_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift       TEXT NOT NULL CHECK (shift IN ('AM', 'PM')),
  shift_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  written_by  UUID NOT NULL REFERENCES public.users(id),
  content     TEXT NOT NULL,
  flags       TEXT[],   -- e.g. ARRAY['med_refused', 'low_stock']
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (shift, shift_date)  -- one handover note per shift per day
);

-- RLS: tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_read" ON public.tasks
  FOR SELECT USING (auth.uid() IS NOT NULL AND is_active = true);

CREATE POLICY "tasks_write" ON public.tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

-- RLS: task_completions
ALTER TABLE public.task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_completions_read" ON public.task_completions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "task_completions_insert" ON public.task_completions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS: handover_notes
ALTER TABLE public.handover_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "handover_read" ON public.handover_notes
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "handover_write" ON public.handover_notes
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_tasks_shift          ON public.tasks (shift);
CREATE INDEX IF NOT EXISTS idx_task_comp_date       ON public.task_completions (completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_task_comp_task       ON public.task_completions (task_id);
CREATE INDEX IF NOT EXISTS idx_handover_date_shift  ON public.handover_notes (shift_date DESC, shift);
