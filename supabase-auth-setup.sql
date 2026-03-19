-- Run this in Supabase SQL Editor to lock down access to authenticated users only
-- This replaces the old public-access policies

-- Drop old public policies
DROP POLICY IF EXISTS "Allow public read" ON scout_teams;
DROP POLICY IF EXISTS "Allow public insert" ON scout_teams;
DROP POLICY IF EXISTS "Allow public update" ON scout_teams;
DROP POLICY IF EXISTS "Allow public delete" ON scout_teams;

-- Create authenticated-only policies
CREATE POLICY "Authenticated read" ON scout_teams
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated insert" ON scout_teams
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated update" ON scout_teams
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated delete" ON scout_teams
  FOR DELETE TO authenticated USING (true);
