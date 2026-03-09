-- Add status column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

-- Drop existing restrictive SELECT and UPDATE policies that block admin from reading other profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow all authenticated users to view all profiles (needed for admin panel)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- Allow authenticated users to update any profile (admin can manage clients)
CREATE POLICY "Authenticated users can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);