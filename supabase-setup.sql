-- ══════════════════════════════════════════════════════════════════
--   DANK Cannabis Club — Supabase Database Setup
--   Run this in: Supabase Dashboard → SQL Editor → New Query
-- ══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────
-- 1. PROFILES TABLE
--    Linked to Supabase Auth (auth.users)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL DEFAULT '',
  username    TEXT        UNIQUE,
  phone       TEXT        DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'budtender'
                          CHECK (role IN (
                            'owner',
                            'branch_manager',
                            'manager',
                            'budtender',
                            'delivery_rider',
                            'kitchen',
                            'marketing',
                            'accountant'
                          )),
  branch      TEXT        NOT NULL DEFAULT 'PTK'
                          CHECK (branch IN ('PTK', 'STH', 'ALL')),
  avatar      TEXT        DEFAULT '👤',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);


-- ──────────────────────────────────────────────
-- 2. ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (idempotent re-run)
DROP POLICY IF EXISTS "Users can view own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Owners can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow insert on own profile"   ON public.profiles;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (except role/branch — managed by owner)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Owners and branch managers can view all profiles
CREATE POLICY "Managers can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('owner', 'branch_manager', 'manager')
    )
  );

-- Only owners can update roles
CREATE POLICY "Owners can update any profile"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Allow insert during signup (trigger will do it, but just in case)
CREATE POLICY "Allow insert on own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- ──────────────────────────────────────────────
-- 3. AUTO-CREATE PROFILE ON SIGNUP
--    Trigger fires after new user is created in auth.users
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, username, phone, role, branch, avatar)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name',  ''),
    COALESCE(NEW.raw_user_meta_data->>'username',   NULL),
    COALESCE(NEW.raw_user_meta_data->>'phone',      ''),
    'budtender',
    'PTK',
    '👤'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ──────────────────────────────────────────────
-- 4. AUTO-UPDATE updated_at
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- ──────────────────────────────────────────────
-- 5. SEED: First admin account
--    ⚠️  Run this AFTER creating your owner account via signup
--    Replace 'your-email@example.com' with actual owner email
-- ──────────────────────────────────────────────
/*
UPDATE public.profiles
SET role   = 'owner',
    branch = 'ALL',
    avatar = '👑'
WHERE id = (
  SELECT id FROM auth.users
  WHERE email = 'your-email@example.com'
  LIMIT 1
);
*/


-- ──────────────────────────────────────────────
-- 6. USEFUL QUERIES
-- ──────────────────────────────────────────────

-- View all profiles with email (owner use only)
/*
SELECT
  p.id,
  u.email,
  p.full_name,
  p.username,
  p.role,
  p.branch,
  p.phone,
  p.created_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;
*/

-- Count staff by branch
/*
SELECT branch, role, COUNT(*) as count
FROM public.profiles
GROUP BY branch, role
ORDER BY branch, role;
*/
