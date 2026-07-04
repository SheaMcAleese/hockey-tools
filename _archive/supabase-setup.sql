-- Run this in Supabase SQL Editor (one time setup)

-- Teams table
CREATE TABLE IF NOT EXISTS scout_teams (
  id text PRIMARY KEY,
  name text NOT NULL,
  country text,
  competition text DEFAULT 'Hockey World Cup',
  team_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS with public access (shared coaching tool)
ALTER TABLE scout_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON scout_teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON scout_teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON scout_teams FOR UPDATE USING (true);
CREATE POLICY "Allow public delete" ON scout_teams FOR DELETE USING (true);

-- Pre-load World Cup Pool A teams
INSERT INTO scout_teams (id, name, country, competition, team_data) VALUES
  ('wc-ned', 'Netherlands', 'Netherlands', 'Hockey World Cup', '{}'::jsonb),
  ('wc-arg', 'Argentina', 'Argentina', 'Hockey World Cup', '{}'::jsonb),
  ('wc-jpn', 'Japan', 'Japan', 'Hockey World Cup', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
