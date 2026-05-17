-- Peblo Sync Notes Table Schema
-- Run this in your Supabase SQL Editor to create the notes table and configure security.

CREATE TABLE public.notes (
  note_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  category text DEFAULT 'General',
  archived boolean DEFAULT false,
  pinned boolean DEFAULT false,
  "isPublic" boolean DEFAULT false,
  "shareId" text,
  "aiSummary" jsonb,
  "updatedAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "createdAt" timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can see and modify ONLY their own notes
CREATE POLICY "Users can manage their own notes" ON public.notes
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy 2: Anyone can view a note if it is marked as public
CREATE POLICY "Public notes are viewable by everyone" ON public.notes
  FOR SELECT
  USING ("isPublic" = true);
