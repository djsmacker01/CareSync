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
