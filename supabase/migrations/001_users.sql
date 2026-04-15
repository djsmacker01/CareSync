-- ============================================================
-- Migration 001: users table
-- Extended profile table linked to Supabase Auth (auth.users)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('staff', 'supervisor', 'manager', 'readonly')),
  pin           VARCHAR(6),        -- bcrypt-hashed 6-digit PIN for tablet login
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Staff can read their own row
CREATE POLICY "users_read_own" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Managers can read all users
CREATE POLICY "users_manager_read_all" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Only managers can insert/update/soft-delete users
CREATE POLICY "users_manager_write" ON public.users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role = 'manager'
    )
  );

-- Index for role lookups
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users (role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON public.users (is_active);
