-- Create storage bucket for profile avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow users to upload their own avatar
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow public read access to avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Add avatar_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create water_intake table
CREATE TABLE IF NOT EXISTS public.water_intake (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    amount_ml integer NOT NULL,
    logged_at timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on water_intake
ALTER TABLE public.water_intake ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for water_intake
CREATE POLICY "Users can view their own water intake"
ON public.water_intake FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own water intake logs"
ON public.water_intake FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own water intake logs"
ON public.water_intake FOR DELETE
USING (auth.uid() = user_id);

-- Add daily_water_goal column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_water_goal_ml integer DEFAULT 2500;