CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  activity text NOT NULL DEFAULT 'Activity',
  steps integer NOT NULL DEFAULT 0 CHECK (steps >= 0 AND steps <= 200000),
  calories_burned integer NOT NULL DEFAULT 0 CHECK (calories_burned >= 0 AND calories_burned <= 20000),
  source text NOT NULL DEFAULT 'text',
  logged_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON public.activity_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity" ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own activity" ON public.activity_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX activity_logs_user_time ON public.activity_logs (user_id, logged_at DESC);