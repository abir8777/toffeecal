-- Add UPDATE policy for weight_logs
CREATE POLICY "Users can update their own weight logs"
ON public.weight_logs
FOR UPDATE
USING (auth.uid() = user_id);

-- Add DELETE policy for profiles
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id);