-- ============================================================
-- Migration 008: visitors table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.visitors (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name       TEXT NOT NULL,
  visiting_client_id UUID NOT NULL REFERENCES public.clients(id),
  purpose            TEXT NOT NULL,
  id_photo_url       TEXT,   -- stored in Supabase Storage (private bucket)
  signed_in_by       UUID NOT NULL REFERENCES public.users(id),
  sign_in_time       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sign_out_time      TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- All staff can read visitor records (except photo — handled in app layer)
CREATE POLICY "visitors_read" ON public.visitors
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- All staff can sign visitors in/out
CREATE POLICY "visitors_insert" ON public.visitors
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can update sign_out_time only
CREATE POLICY "visitors_update_signout" ON public.visitors
  FOR UPDATE USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only managers can delete visitor records
CREATE POLICY "visitors_manager_delete" ON public.visitors
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

CREATE INDEX IF NOT EXISTS idx_visitors_client     ON public.visitors (visiting_client_id);
CREATE INDEX IF NOT EXISTS idx_visitors_sign_in    ON public.visitors (sign_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_active     ON public.visitors (sign_out_time) WHERE sign_out_time IS NULL;
