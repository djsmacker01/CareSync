-- ============================================================
-- Migration 016: Normalize flat numbers (room_number)
-- Ensures any legacy values like "1A" become "1"
-- ============================================================

UPDATE public.clients
SET room_number = NULLIF(regexp_replace(room_number, '[^0-9]', '', 'g'), '')
WHERE room_number IS NOT NULL
  AND room_number ~ '[A-Za-z]';

