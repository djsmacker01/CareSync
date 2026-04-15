-- ============================================================
-- Migration 011: Fix pin column size
--
-- pin was declared VARCHAR(6) but bcrypt hashes are 60 chars.
-- This caused PIN storage to silently fail or error.
-- ============================================================

ALTER TABLE public.users
  ALTER COLUMN pin TYPE TEXT;
