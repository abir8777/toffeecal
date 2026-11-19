CREATE TABLE public.doctor_health_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('symptom', 'follow_up_answer')),
  logged_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.doctor_health_events TO authenticated;
GRANT ALL ON public.doctor_health_events TO service_role;
ALTER TABLE public.doctor_health_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own doctor health events"
ON public.doctor_health_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own doctor health events"
ON public.doctor_health_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE INDEX doctor_health_events_user_logged_at_idx
ON public.doctor_health_events (user_id, logged_at DESC);