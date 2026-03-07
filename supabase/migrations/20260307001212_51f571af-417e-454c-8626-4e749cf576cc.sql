
-- Profiles table for tenant identification
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Robot Interruptions (Human-in-the-Loop)
CREATE TABLE public.robot_interruptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  contact_name TEXT,
  reason TEXT DEFAULT 'manual',
  paused_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.robot_interruptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own interruptions" ON public.robot_interruptions
  FOR ALL TO authenticated USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX idx_interruptions_tenant_jid ON public.robot_interruptions(tenant_id, remote_jid, is_active);

-- Response Templates
CREATE TABLE public.response_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcut TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, shortcut)
);

ALTER TABLE public.response_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own templates" ON public.response_templates
  FOR ALL TO authenticated USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE INDEX idx_templates_tenant ON public.response_templates(tenant_id, is_active);
