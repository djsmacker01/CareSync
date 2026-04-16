-- ============================================================
-- Migration 016: Demo data for Controlled Drugs Register
--
-- Inserts realistic CD drugs and ledger entries for the first
-- 3 active residents so the CD Register looks populated in demo.
-- Run AFTER migration 015.
--
-- ⚠️  Demo / dev data only — remove before production go-live.
-- ============================================================

DO $$
DECLARE
  v_staff_id   UUID;
  v_client1    UUID;
  v_client2    UUID;
  v_client3    UUID;
  v_drug1      UUID;  -- Morphine for client 1
  v_drug3      UUID;  -- Midazolam for client 2
BEGIN

  -- ── Pick a staff user to own the demo entries ─────────────
  SELECT id INTO v_staff_id
  FROM   public.users
  ORDER  BY created_at
  LIMIT  1;

  IF v_staff_id IS NULL THEN
    RAISE NOTICE 'No users found — skipping demo CD data.';
    RETURN;
  END IF;

  -- ── Pick 3 active residents ────────────────────────────────
  SELECT id INTO v_client1
  FROM   public.clients WHERE is_active = true
  ORDER  BY room_number NULLS LAST, full_name LIMIT 1;

  SELECT id INTO v_client2
  FROM   public.clients WHERE is_active = true
  ORDER  BY room_number NULLS LAST, full_name LIMIT 1 OFFSET 1;

  SELECT id INTO v_client3
  FROM   public.clients WHERE is_active = true
  ORDER  BY room_number NULLS LAST, full_name LIMIT 1 OFFSET 2;

  IF v_client1 IS NULL THEN
    RAISE NOTICE 'No active clients found — skipping demo CD data.';
    RETURN;
  END IF;

  -- ── Resident 1: Morphine Sulphate ─────────────────────────
  INSERT INTO public.controlled_drugs
    (client_id, name, strength, form, cd_schedule, unit, current_stock, is_active, created_by)
  VALUES
    (v_client1, 'Morphine Sulphate', '10 mg/5 ml', 'Oral Solution', 2, 'ml', 38, true, v_staff_id);

  SELECT id INTO v_drug1
  FROM   public.controlled_drugs
  WHERE  client_id = v_client1 AND name = 'Morphine Sulphate'
  LIMIT  1;

  -- ── Resident 1: Oxycodone ─────────────────────────────────
  INSERT INTO public.controlled_drugs
    (client_id, name, strength, form, cd_schedule, unit, current_stock, is_active, created_by)
  VALUES
    (v_client1, 'Oxycodone', '5 mg', 'Modified Release Tablet', 2, 'tablets', 28, true, v_staff_id);

  -- ── Resident 2: Midazolam ─────────────────────────────────
  IF v_client2 IS NOT NULL THEN
    INSERT INTO public.controlled_drugs
      (client_id, name, strength, form, cd_schedule, unit, current_stock, is_active, created_by)
    VALUES
      (v_client2, 'Midazolam', '10 mg/2 ml', 'Injection', 3, 'ml', 18, true, v_staff_id);

    SELECT id INTO v_drug3
    FROM   public.controlled_drugs
    WHERE  client_id = v_client2 AND name = 'Midazolam'
    LIMIT  1;
  END IF;

  -- ── Resident 3: Buprenorphine patch ───────────────────────
  IF v_client3 IS NOT NULL THEN
    INSERT INTO public.controlled_drugs
      (client_id, name, strength, form, cd_schedule, unit, current_stock, is_active, created_by)
    VALUES
      (v_client3, 'Buprenorphine', '5 mcg/hr', 'Transdermal Patch', 3, 'patches', 4, true, v_staff_id);
  END IF;

  -- ── Morphine ledger — 6 realistic entries ─────────────────
  IF v_drug1 IS NOT NULL THEN
    INSERT INTO public.cd_register
      (drug_id, client_id, entry_type, quantity_in, quantity_out, balance_after,
       administered_by, witness_name, administered_at, notes)
    VALUES
      (v_drug1, v_client1, 'received',     60,   NULL, 60, v_staff_id, 'Dr. A. Patel',    NOW() - interval '5 days',          'New supply — dispensed by Boots Pharmacy, batch RX-2204'),
      (v_drug1, v_client1, 'administered', NULL,  5,   55, v_staff_id, 'J. Thomas',       NOW() - interval '4 days 8 hours',  NULL),
      (v_drug1, v_client1, 'administered', NULL,  5,   50, v_staff_id, 'S. Okafor',       NOW() - interval '3 days 20 hours', NULL),
      (v_drug1, v_client1, 'wasted',       NULL,  2,   48, v_staff_id, 'J. Thomas',       NOW() - interval '2 days 9 hours',  'Partial dose — resident drowsy, 2 ml wasted and witnessed'),
      (v_drug1, v_client1, 'administered', NULL,  5,   43, v_staff_id, 'S. Okafor',       NOW() - interval '1 day 8 hours',   NULL),
      (v_drug1, v_client1, 'administered', NULL,  5,   38, v_staff_id, 'J. Thomas',       NOW() - interval '12 hours',        NULL);
  END IF;

  -- ── Midazolam ledger — 3 entries ──────────────────────────
  IF v_drug3 IS NOT NULL THEN
    INSERT INTO public.cd_register
      (drug_id, client_id, entry_type, quantity_in, quantity_out, balance_after,
       administered_by, witness_name, administered_at, notes)
    VALUES
      (v_drug3, v_client2, 'received',     20,   NULL, 20, v_staff_id, 'Dr. K. Williams', NOW() - interval '3 days', 'Hospital supply on discharge'),
      (v_drug3, v_client2, 'administered', NULL,  1,   19, v_staff_id, 'S. Okafor',       NOW() - interval '2 days', 'PRN — agitation episode'),
      (v_drug3, v_client2, 'administered', NULL,  1,   18, v_staff_id, 'J. Thomas',       NOW() - interval '1 day',  'PRN — end of life care');
  END IF;

  RAISE NOTICE 'Demo CD data inserted successfully.';
END;
$$;
