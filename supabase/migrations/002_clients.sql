-- ============================================================
-- Migration 002: clients table (service users / residents)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT NOT NULL,
  date_of_birth  DATE,
  room_number    TEXT,
  key_worker_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  photo_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active clients
CREATE POLICY "clients_read_active" ON public.clients
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND is_active = true
  );

-- Managers can read all clients (including inactive)
CREATE POLICY "clients_manager_read_all" ON public.clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Only managers can write client records
CREATE POLICY "clients_manager_write" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('manager', 'supervisor')
    )
  );

CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients (is_active);
CREATE INDEX IF NOT EXISTS idx_clients_key_worker ON public.clients (key_worker_id);
