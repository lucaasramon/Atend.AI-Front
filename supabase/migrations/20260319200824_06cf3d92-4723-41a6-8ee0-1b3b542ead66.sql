
-- Fix overly permissive insert policies
DROP POLICY "System can insert notifications" ON public.client_notifications;
CREATE POLICY "Authenticated can insert notifications" ON public.client_notifications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id OR has_role(auth.uid(), 'admin'));

DROP POLICY "System can insert activity" ON public.activity_logs;
CREATE POLICY "Authenticated can insert activity" ON public.activity_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tenant_id OR has_role(auth.uid(), 'admin'));
