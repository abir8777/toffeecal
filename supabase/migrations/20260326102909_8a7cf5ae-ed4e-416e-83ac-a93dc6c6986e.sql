CREATE TABLE public.saved_meal_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cuisine TEXT NOT NULL,
  plan_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own meal plans" ON public.saved_meal_plans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own meal plans" ON public.saved_meal_plans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plans" ON public.saved_meal_plans FOR DELETE TO authenticated USING (auth.uid() = user_id);