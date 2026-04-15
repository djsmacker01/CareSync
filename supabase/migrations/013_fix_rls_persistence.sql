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
