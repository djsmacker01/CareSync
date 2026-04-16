-- ============================================================
-- Migration 015: Fix controlled_drugs RLS policies
--
-- Problem: migration 014 used FOR ALL for the supervisor/manager
-- write policy, which also covers UPDATE. Staff members need to
-- UPDATE current_stock when they add a CD register entry
-- (the optimistic-lock balance update in useCD.addEntry).
--
-- Fix: drop the overly-broad FOR ALL policy and replace it with
-- specific INSERT-only (supervisor/manager) + UPDATE-all (any
-- authenticated user, needed for stock balance tracking).
-- ============================================================

-- 1. Drop the old catch-all write policy
DROP POLICY IF EXISTS "cd_drugs_write" ON public.controlled_drugs;

-- 2. Only supervisors/managers can ADD new CD drugs to the catalogue
CREATE POLICY "cd_drugs_insert" ON public.controlled_drugs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('supervisor', 'manager')
    )
  );

-- 3. Any authenticated staff member can UPDATE current_stock
--    (happens on every CD register entry — optimistic lock pattern)
CREATE POLICY "cd_drugs_update_stock" ON public.controlled_drugs
  FOR UPDATE
  USING     (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Only supervisors/managers can soft-delete a CD drug (is_active = false)
CREATE POLICY "cd_drugs_delete" ON public.controlled_drugs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('supervisor', 'manager')
    )
  );
