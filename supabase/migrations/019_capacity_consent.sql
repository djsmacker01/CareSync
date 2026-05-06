-- ============================================================
-- Migration 019: Capacity & Consent
-- Mental Capacity Act 2005 compliance + consent recording
-- All records are append-only for CQC audit trail
-- ============================================================

-- ── 1. Mental Capacity Assessments ────────────────────────────
CREATE TABLE IF NOT EXISTS public.capacity_assessments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  decision_topic   TEXT        NOT NULL,   -- e.g. "Medication", "Financial decisions"
  assessment_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  assessed_by      UUID        NOT NULL REFERENCES public.users(id),
  has_capacity     BOOLEAN     NOT NULL,
  evidence         TEXT        NOT NULL,   -- rationale / observations supporting the decision
  review_date      DATE,                   -- when this assessment should be reviewed
  is_current       BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one current assessment per client + topic
CREATE UNIQUE INDEX IF NOT EXISTS idx_capacity_current
  ON public.capacity_assessments (client_id, decision_topic)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_capacity_client
  ON public.capacity_assessments (client_id, assessment_date DESC);

ALTER TABLE public.capacity_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "capacity_read" ON public.capacity_assessments
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "capacity_insert" ON public.capacity_assessments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE POLICY "capacity_update" ON public.capacity_assessments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('manager', 'supervisor')
    )
  );

-- ── 2. Consent Records ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.consent_records (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  intervention     TEXT        NOT NULL,   -- what is being consented to
  consent_type     TEXT        NOT NULL    -- see CHECK below
                     CHECK (consent_type IN (
                       'informed_consent',   -- person has capacity and consents
                       'informed_refusal',   -- person has capacity and declines
                       'best_interest',      -- person lacks capacity; decision made in their best interest
                       'advance_directive'   -- pre-recorded wishes (e.g. ADRT)
                     )),
  consent_given    BOOLEAN     NOT NULL,   -- true = consented/approved; false = declined
  decision_maker   TEXT,                   -- name/role if best interest (e.g. family member, manager)
  rationale        TEXT        NOT NULL,   -- why this decision was made
  witnessed_by     TEXT,                   -- optional name of witness
  valid_from       DATE        NOT NULL DEFAULT CURRENT_DATE,
  valid_until      DATE,                   -- null = indefinite
  recorded_by      UUID        NOT NULL REFERENCES public.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Consent is append-only — no UPDATE or DELETE (audit trail)
CREATE INDEX IF NOT EXISTS idx_consent_client
  ON public.consent_records (client_id, created_at DESC);

ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_read" ON public.consent_records
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "consent_insert" ON public.consent_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('manager', 'supervisor')
    )
  );
-- NO UPDATE / DELETE — append-only for legal audit trail
