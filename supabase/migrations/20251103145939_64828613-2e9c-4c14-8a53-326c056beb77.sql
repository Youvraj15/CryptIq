-- Add wallet_address to profiles table for storing user's primary Solana wallet
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Add index for faster wallet lookups
CREATE INDEX IF NOT EXISTS idx_profiles_wallet_address ON public.profiles(wallet_address);

-- Add lab_completions table to track lab completion rewards
CREATE TABLE IF NOT EXISTS public.lab_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id INTEGER NOT NULL,
  task_id INTEGER NOT NULL,
  jiet_rewarded BOOLEAN NOT NULL DEFAULT false,
  jiet_amount NUMERIC NOT NULL DEFAULT 0,
  wallet_address TEXT,
  transaction_signature TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Enable RLS
ALTER TABLE public.lab_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_completions
CREATE POLICY "Users can view their own lab completions"
  ON public.lab_completions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lab completions"
  ON public.lab_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lab completions"
  ON public.lab_completions
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_lab_completions_user_id ON public.lab_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_completions_task_id ON public.lab_completions(task_id);