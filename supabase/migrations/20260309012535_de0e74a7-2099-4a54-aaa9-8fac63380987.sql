-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'onboarding_complete',
  user_name text,
  user_email text,
  company text,
  phone text,
  whatsapp_number text,
  system_prompt text,
  onboarding_data jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own notifications
CREATE POLICY "Users can insert own notifications"
ON public.admin_notifications 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: All authenticated users can view notifications (admin control in frontend)
CREATE POLICY "Authenticated users can view notifications"
ON public.admin_notifications 
FOR SELECT 
TO authenticated
USING (true);

-- Policy: All authenticated users can update notifications (admin control in frontend)
CREATE POLICY "Authenticated users can update notifications"
ON public.admin_notifications 
FOR UPDATE 
TO authenticated
USING (true);