-- ============================================================
-- Migration 014: Controlled Drugs (CD) Register
-- UK Misuse of Drugs Regulations 2001 — Schedule 2 & 3
-- All entries are append-only. Balance is maintained via
-- optimistic locking in the backend (no concurrent edits expected
-- in a single-home deployment; legal requirement for witnessed admin).
-- ============================================================

-- ── controlled_drugs: the drug catalogue per client ──────────
CREATE TABLE IF NOT EXISTS public.controlled_drugs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES public.clients(id),
  name            TEXT NOT NULL,          -- e.g. "Morphine Sulphate"
  strength        TEXT NOT NULL,          -- e.g. "10 mg/5 ml"
  form            TEXT NOT NULL,          -- e.g. "Oral Solution"
  cd_schedule     INTEGER NOT NULL CHECK (cd_schedule IN (2, 3)),
  unit            TEXT NOT NULL DEFAULT 'ml',  -- ml | mg | tablets | patches | mcg
  current_stock   NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.users(id)
);

ALTER TABLE public.controlled_drugs ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read CD drugs
CREATE POLICY "cd_drugs_read" ON public.controlled_drugs
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only supervisors and managers can write (add new CD drugs to catalogue)
CREATE POLICY "cd_drugs_write" ON public.controlled_drugs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('supervisor', 'manager')
    )
  );

-- ── cd_register: the witnessed ledger (append-only) ──────────
CREATE TABLE IF NOT EXISTS public.cd_register (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id          UUID NOT NULL REFERENCES public.controlled_drugs(id),
  client_id        UUID NOT NULL REFERENCES public.clients(id),
  entry_type       TEXT NOT NULL CHECK (entry_type IN ('received', 'administered', 'wasted', 'returned')),
  quantity_in      NUMERIC(10,2),   -- received entries only
  quantity_out     NUMERIC(10,2),   -- administered / wasted / returned
  balance_after    NUMERIC(10,2) NOT NULL, -- running balance after this entry
  administered_by  UUID NOT NULL REFERENCES public.users(id),
  witnessed_by     UUID REFERENCES public.users(id),   -- another staff member in the system
  witness_name     TEXT,            -- free-text for external witnesses
  administered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  -- NO UPDATE / DELETE policies — CD register is legally immutable
);

ALTER TABLE public.cd_register ENABLE ROW LEVEL SECURITY;

-- All authenticated staff can read register entries
CREATE POLICY "cd_register_read" ON public.cd_register
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Staff, supervisors, and managers can insert register entries
-- (any trained carer may administer CDs with a witness)
CREATE POLICY "cd_register_insert" ON public.cd_register
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- No UPDATE or DELETE — legally immutable audit trail

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cd_drugs_client    ON public.controlled_drugs (client_id);
CREATE INDEX IF NOT EXISTS idx_cd_drugs_active    ON public.controlled_drugs (is_active);
CREATE INDEX IF NOT EXISTS idx_cd_reg_drug        ON public.cd_register (drug_id);
CREATE INDEX IF NOT EXISTS idx_cd_reg_client      ON public.cd_register (client_id);
CREATE INDEX IF NOT EXISTS idx_cd_reg_date        ON public.cd_register (administered_at DESC);
CREATE INDEX IF NOT EXISTS idx_cd_reg_by          ON public.cd_register (administered_by);
