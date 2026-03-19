
-- Knowledge Base table
CREATE TABLE public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage own knowledge" ON public.knowledge_base
  FOR ALL TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "Admins can view all knowledge" ON public.knowledge_base
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Client Notifications table
CREATE TABLE public.client_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own notifications" ON public.client_notifications
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "Tenants can update own notifications" ON public.client_notifications
  FOR UPDATE TO authenticated
  USING (auth.uid() = tenant_id)
  WITH CHECK (auth.uid() = tenant_id);

CREATE POLICY "System can insert notifications" ON public.client_notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Activity Logs table
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  action text NOT NULL,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view own activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = tenant_id);

CREATE POLICY "System can insert activity" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all activity" ON public.activity_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for client_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_notifications;
