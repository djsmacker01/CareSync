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
