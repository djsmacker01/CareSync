-- ============================================================
-- Migration 009: Seed data for development/testing
-- Run AFTER all other migrations
-- NOTE: Users must first be created in Supabase Auth dashboard,
--       then their UUIDs used here to seed the users table.
-- ============================================================

-- ── PLACEHOLDER UUIDs — replace with real auth.users UUIDs ──
-- After creating these users in Supabase Auth dashboard:
--   staff@caresync.test    / TestPass123!
--   supervisor@caresync.test / TestPass123!
--   manager@caresync.test  / TestPass123!

-- UNCOMMENT and update UUIDs after creating auth users:
/*
INSERT INTO public.users (id, email, full_name, role, is_active) VALUES
  ('00000000-0000-0000-0000-000000000001', 'staff@caresync.test',      'Alice Nurse',      'staff',      true),
  ('00000000-0000-0000-0000-000000000002', 'supervisor@caresync.test', 'Bob Supervisor',   'supervisor', true),
  ('00000000-0000-0000-0000-000000000003', 'manager@caresync.test',    'Carol Manager',    'manager',    true);

-- 5 test clients
INSERT INTO public.clients (id, full_name, date_of_birth, room_number, key_worker_id, is_active) VALUES
  ('10000000-0000-0000-0000-000000000001', 'George Adams',   '1942-03-14', '1A', '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000002', 'Dorothy Brown',  '1938-07-22', '1B', '00000000-0000-0000-0000-000000000001', true),
  ('10000000-0000-0000-0000-000000000003', 'Harold Clarke',  '1945-11-05', '2A', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000004', 'Edith Davis',    '1950-01-30', '2B', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000005', 'Frank Evans',    '1935-09-18', '3A', '00000000-0000-0000-0000-000000000001', true);

-- 3 medications per client (15 total)
INSERT INTO public.medications (id, client_id, medication_name, dosage, frequency, route, prescriber, start_date, is_active) VALUES
  -- George Adams
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Amlodipine',   '5mg',   'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Aspirin',      '75mg',  'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Omeprazole',   '20mg',  'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  -- Dorothy Brown
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Metformin',    '500mg', 'Twice daily', 'oral', 'Dr. Jones', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Atorvastatin', '10mg',  'Once daily',  'oral', 'Dr. Jones', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Ramipril',     '2.5mg', 'Once daily',  'oral', 'Dr. Jones', '2024-01-01', true),
  -- Harold Clarke
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 'Bisoprolol',   '2.5mg', 'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 'Furosemide',   '40mg',  'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 'Sertraline',   '50mg',  'Once daily',  'oral', 'Dr. Smith', '2024-01-01', true),
  -- Edith Davis
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', 'Levothyroxine','50mcg', 'Once daily',  'oral', 'Dr. Brown', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', 'Clopidogrel',  '75mg',  'Once daily',  'oral', 'Dr. Brown', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000004', 'Donepezil',    '5mg',   'Once daily',  'oral', 'Dr. Brown', '2024-01-01', true),
  -- Frank Evans
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', 'Warfarin',     '3mg',   'Once daily',  'oral', 'Dr. Evans', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', 'Codeine',      '30mg',  'Twice daily', 'oral', 'Dr. Evans', '2024-01-01', true),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000005', 'Lactulose',    '15ml',  'Twice daily', 'oral', 'Dr. Evans', '2024-01-01', true);

-- Starting stock (28-day supply) for all 15 medications
INSERT INTO public.stock (medication_id, client_id, current_quantity, unit, reorder_threshold) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 56, 'tablets', 14),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000003', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000008', '10000000-0000-0000-0000-000000000003', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000009', '10000000-0000-0000-0000-000000000003', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000010', '10000000-0000-0000-0000-000000000004', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000011', '10000000-0000-0000-0000-000000000004', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000012', '10000000-0000-0000-0000-000000000004', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000013', '10000000-0000-0000-0000-000000000005', 28, 'tablets', 7),
  ('20000000-0000-0000-0000-000000000014', '10000000-0000-0000-0000-000000000005', 56, 'tablets', 14),
  ('20000000-0000-0000-0000-000000000015', '10000000-0000-0000-0000-000000000005', 500, 'ml',     100);

-- Default recurring tasks
INSERT INTO public.tasks (id, title, description, shift, is_recurring, is_active, created_by) VALUES
  ('30000000-0000-0000-0000-000000000001', 'Morning medication round',    'Administer all AM medications', 'AM',   true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000002', 'Morning personal care',       'Assist all residents with personal care', 'AM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000003', 'Breakfast service',           'Serve breakfast and document intake', 'AM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000004', 'Fire door check',             'Check all fire doors are closed properly', 'AM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000005', 'Handover preparation',        'Complete MAR and prepare handover notes', 'AM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000006', 'Evening medication round',    'Administer all PM medications', 'PM',   true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000007', 'Evening personal care',       'Assist all residents with personal care', 'PM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000008', 'Dinner service',              'Serve dinner and document intake', 'PM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000009', 'End of shift checks',         'Complete all end-of-shift documentation', 'PM', true, true, '00000000-0000-0000-0000-000000000003'),
  ('30000000-0000-0000-0000-000000000010', 'Stock check',                 'Check and report any low stock items', 'BOTH', true, true, '00000000-0000-0000-0000-000000000003');
*/

-- This migration is commented out by default.
-- Run it after seeding auth users via the Supabase dashboard.
SELECT 'Seed migration ready. Uncomment and update UUIDs to apply seed data.' AS info;
