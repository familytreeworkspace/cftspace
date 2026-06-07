-- Directory table: trilingual name storage (Sindhi ↔ English ↔ Hindi)
-- Run this in Supabase SQL Editor if the directory table is missing or has wrong schema.

-- Drop existing table (all rows are empty anyway — safe to recreate)
DROP TABLE IF EXISTS directory;

CREATE TABLE directory (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  sindhi_word text        UNIQUE NOT NULL,
  english_word text,
  hindi_word  text,
  category    text        NOT NULL DEFAULT 'name',
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- Allow logged-in users to read; only admin/chief can write (via service role from server actions)
ALTER TABLE directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read directory"
  ON directory FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert directory"
  ON directory FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update directory"
  ON directory FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete directory"
  ON directory FOR DELETE
  USING (auth.role() = 'authenticated');
