
-- System settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read settings" ON public.system_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings" ON public.system_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings" ON public.system_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add saved column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS saved boolean DEFAULT false;

-- Messages table for conversation history
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  remote_jid text NOT NULL,
  from_me boolean DEFAULT false,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants see own messages" ON public.messages
  FOR SELECT TO authenticated
  USING (tenant_id = auth.uid());

CREATE POLICY "Admins see all messages" ON public.messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Tenants can insert own messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth.uid());
