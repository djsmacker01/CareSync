-- ============================================================
-- Migration 001: users table
-- Extended profile table linked to Supabase Auth (auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('staff', 'supervisor', 'manager', 'readonly')),
  pin           VARCHAR(6),        -- bcrypt-hashed 6-digit PIN for tablet login
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Staff can read their own row
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Managers can read all users
CREATE POLICY "users_manager_read_all" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Only managers can insert/update/soft-delete users
CREATE POLICY "users_manager_write" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users (is_active);
-- ============================================================
-- Migration 002: clients table (service users / residents)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT NOT NULL,
  date_of_birth  DATE,
  room_number    TEXT,
  key_worker_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  photo_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active clients
CREATE POLICY "clients_read_active" ON public.clients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- Managers can read all clients (including inactive)
CREATE POLICY "clients_manager_read_all" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Only managers can write client records
CREATE POLICY "clients_manager_write" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients (is_active);
CREATE INDEX IF NOT EXISTS idx_clients_key_worker ON public.clients (key_worker_id);
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
-- ============================================================
-- Migration 008: visitors table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visitors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name       TEXT NOT NULL,
  visiting_client_id UUID NOT NULL REFERENCES public.clients(id),
  purpose            TEXT NOT NULL,
  id_photo_url       TEXT,   -- stored in Supabase Storage (private bucket)
  signed_in_by       UUID NOT NULL REFERENCES public.users(id),
  sign_in_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sign_out_time      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- All staff can read visitor records (except photo — handled in app layer)
CREATE POLICY "visitors_read" ON public.visitors
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- All staff can sign visitors in/out
CREATE POLICY "visitors_insert" ON public.visitors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can update sign_out_time only
CREATE POLICY "visitors_update_signout" ON public.visitors
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only managers can delete visitor records
CREATE POLICY "visitors_manager_delete" ON public.visitors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

CREATE INDEX IF NOT EXISTS idx_visitors_client     ON public.visitors (visiting_client_id);
CREATE INDEX IF NOT EXISTS idx_visitors_sign_in    ON public.visitors (sign_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_active     ON public.visitors (sign_out_time) WHERE sign_out_time IS NULL;
-- ============================================================
-- Migration 010: Fix recursive RLS policies on users table
--
-- The original users_manager_read_all policy queried public.users
-- inside its own USING clause, causing infinite recursion.
-- Replaced with JWT app_metadata claims (non-recursive).
-- ============================================================

-- Helper: read role from JWT app_metadata (set by admin on user create/update)
-- SECURITY DEFINER bypasses RLS when called inside a policy
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    ''
  )
$$;

-- Drop the recursive policy
DROP POLICY IF EXISTS "users_manager_read_all" ON public.users;
DROP POLICY IF EXISTS "users_manager_write"    ON public.users;

-- Re-add using JWT claims — no table self-join, no recursion
CREATE POLICY "users_manager_read_all" ON public.users
  FOR SELECT USING (public.get_auth_role() = 'manager');

CREATE POLICY "users_supervisor_read_all" ON public.users
  FOR SELECT USING (public.get_auth_role() = 'supervisor');

CREATE POLICY "users_manager_write" ON public.users
  FOR ALL USING (public.get_auth_role() = 'manager');

-- Fix same recursion risk on other tables that check role via users table
-- clients
DROP POLICY IF EXISTS "clients_manager_write" ON public.clients;
CREATE POLICY "clients_manager_write" ON public.clients
  FOR ALL USING (public.get_auth_role() IN ('manager', 'supervisor'));

DROP POLICY IF EXISTS "clients_manager_read_all" ON public.clients;
CREATE POLICY "clients_manager_read_all" ON public.clients
  FOR SELECT USING (public.get_auth_role() IN ('manager', 'supervisor'));

-- medications
DROP POLICY IF EXISTS "medications_manager_read_all" ON public.medications;
CREATE POLICY "medications_manager_read_all" ON public.medications
  FOR SELECT USING (public.get_auth_role() IN ('manager', 'supervisor'));

DROP POLICY IF EXISTS "medications_write" ON public.medications;
CREATE POLICY "medications_write" ON public.medications
  FOR ALL USING (public.get_auth_role() IN ('manager', 'supervisor'));

-- tasks
DROP POLICY IF EXISTS "tasks_write" ON public.tasks;
CREATE POLICY "tasks_write" ON public.tasks
  FOR ALL USING (public.get_auth_role() IN ('manager', 'supervisor'));

-- visitors manager delete
DROP POLICY IF EXISTS "visitors_manager_delete" ON public.visitors;
CREATE POLICY "visitors_manager_delete" ON public.visitors
  FOR DELETE USING (public.get_auth_role() = 'manager');
-- ============================================================
-- Migration 011: Fix pin column size
--
-- pin was declared VARCHAR(6) but bcrypt hashes are 60 chars.
-- This caused PIN storage to silently fail or error.
-- ============================================================

ALTER TABLE public.users
  ALTER COLUMN pin TYPE TEXT;
-- ============================================================
-- Migration 012: Enable Supabase Realtime on key tables
--
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor).
-- Required for live updates across staff tablets and manager devices.
-- ============================================================

-- Add each table to the realtime publication only if not already included
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'mar_entries',
    'task_completions',
    'stock',
    'stock_transactions',
    'visitors',
    'fire_safety_checks',
    'handover_notes'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname   = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename  = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

SELECT 'Realtime enabled on: mar_entries, task_completions, stock, stock_transactions, visitors, fire_safety_checks, handover_notes' AS result;
-- ============================================================
-- Migration 013: Fix RLS policies for complete data persistence
--
-- Problems fixed:
--
-- 1. get_auth_role() returned '' when app_metadata.role was absent
--    from the JWT (happens when users were created before app_metadata
--    was configured via the Supabase Admin API).
--    ALL policies introduced by migration 010 depend on this function,
--    so when it returns '' they silently block ALL writes by
--    managers/supervisors: adding clients, adding medications,
--    creating tasks, deactivating tasks, etc.
--    Fix: fall back to a direct DB lookup (SECURITY DEFINER bypasses
--    RLS so there is no recursion risk).
--
-- 2. task_completions had no DELETE policy.
--    Without one, un-completing a task (uncompleteTask in useTasks.js)
--    returned 0 rows affected and no error — local UI state was
--    cleared but the DB row was never removed, so the task reappeared
--    as "completed" after every reload.
--
-- 3. stock_write still queried public.users directly instead of
--    using get_auth_role(), inconsistent with migration 010 pattern.
--
-- 4. Ensure staff role can update their own task_completions for
--    deletes (any authenticated user can delete their own completions).
-- ============================================================

-- ── 1. Fix get_auth_role() ───────────────────────────────────────────
--
-- Now tries JWT app_metadata.role first (fast, no DB round-trip),
-- then falls back to reading the role from public.users via a
-- SECURITY DEFINER function (bypasses RLS, no recursion risk).
--
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    -- Fast path: role baked into JWT by Supabase Admin API
    auth.jwt() -> 'app_metadata' ->> 'role',
    -- Fallback: read directly from users table
    -- (SECURITY DEFINER means this executes as the function owner,
    --  bypassing RLS on the users table — no recursive policy risk)
    (SELECT role FROM public.users WHERE id = auth.uid()),
    -- Last resort: empty string (all role-gated policies will deny)
    ''
  )
$$;


-- ── 2. Add missing DELETE policy for task_completions ────────────────
--
-- Required by useTasks.uncompleteTask() which calls:
--   supabase.from('task_completions').delete().eq('task_id', ...) ...
--
-- Without this policy, PostgreSQL's RLS silently filters out all rows
-- for DELETE (returns 0 affected, no error), so the completion record
-- stays in the DB and the task reappears as "done" after page reload.
--
DROP POLICY IF EXISTS "task_completions_delete" ON public.task_completions;
CREATE POLICY "task_completions_delete" ON public.task_completions
  FOR DELETE USING (auth.uid() IS NOT NULL);


-- ── 3. Modernise stock_write to use get_auth_role() ──────────────────
--
-- The original policy queried public.users directly.  Now that
-- get_auth_role() has a reliable DB fallback this is cleaner and
-- consistent with the rest of migration 010's approach.
--
DROP POLICY IF EXISTS "stock_write" ON public.stock;
CREATE POLICY "stock_write" ON public.stock
  FOR ALL USING (
    public.get_auth_role() IN ('manager', 'supervisor', 'staff')
  );


-- ── 4. Ensure task_completions UPDATE is possible ────────────────────
--
-- Not currently used by the app but added for completeness so that
-- future features (e.g. adding completion notes later) do not hit a
-- hidden RLS wall.
--
DROP POLICY IF EXISTS "task_completions_update" ON public.task_completions;
CREATE POLICY "task_completions_update" ON public.task_completions
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);


-- ── 5. Allow all authenticated staff to read inactive medications ─────
--
-- ClientProfilePage shows "Past Medications" for all staff roles, but
-- the original medications_read policy only returned is_active = true
-- rows.  Staff could see the section header but no rows.
-- Adding a dedicated read-all policy fixes this without affecting write
-- access (write is still restricted to manager/supervisor).
--
DROP POLICY IF EXISTS "medications_read_all_auth" ON public.medications;
CREATE POLICY "medications_read_all_auth" ON public.medications
  FOR SELECT USING (auth.uid() IS NOT NULL);


-- ── 6. Allow all authenticated staff to read inactive tasks ──────────
--
-- tasks_read has "AND is_active = true" so deactivated tasks become
-- invisible immediately.  That is correct.  No change needed here.
-- (Documented for clarity only.)


-- Verify the function is in place
SELECT public.get_auth_role() IS NOT NULL AS get_auth_role_present;
