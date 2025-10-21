/*
  # Lab Completions System

  ## Overview
  Creates table for tracking lab completions and progress.

  ## New Tables
  
  ### `lab_completions`
  Tracks user lab completions
  - `id` (uuid, primary key) - Unique completion identifier
  - `user_id` (uuid, foreign key) - References auth.users
  - `lab_id` (integer) - Lab identifier
  - `completed_at` (timestamptz) - Completion timestamp
  - `created_at` (timestamptz) - Record creation timestamp
  - Unique constraint on (user_id, lab_id)

  ## Security
  
  ### Row Level Security (RLS)
  - Users can read their own completions
  - Users can insert their own completions
  - Users cannot update or delete completions

  ## Important Notes
  1. Users can only complete each lab once
  2. All timestamps use timestamptz for timezone awareness
*/

-- Create lab_completions table
CREATE TABLE IF NOT EXISTS lab_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id integer NOT NULL,
  completed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lab_id)
);

-- Enable RLS
ALTER TABLE lab_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lab_completions
CREATE POLICY "Users can view own lab completions"
  ON lab_completions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lab completions"
  ON lab_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lab_completions_user_id ON lab_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lab_completions_lab_id ON lab_completions(lab_id);
