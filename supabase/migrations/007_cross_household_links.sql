-- Migration 007: Cross-household family links + virtual ancestors

-- Add is_virtual flag to households (for ancestor nodes not tied to real ghar)
ALTER TABLE households ADD COLUMN IF NOT EXISTS is_virtual boolean DEFAULT false;

-- Cross-household linking table (links two household heads as parent-child)
CREATE TABLE IF NOT EXISTS household_links (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  child_household_id  uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  parent_household_id uuid        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  link_type           text        NOT NULL DEFAULT 'biological',
  relation            text        NOT NULL DEFAULT 'father',
  created_by          uuid        REFERENCES users(id),
  created_at          timestamptz DEFAULT now(),
  UNIQUE(child_household_id, parent_household_id, relation)
);

ALTER TABLE household_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read household_links"
  ON household_links FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin and Chief can manage household_links"
  ON household_links FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'chief'))
  );

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_household_links_child  ON household_links(child_household_id);
CREATE INDEX IF NOT EXISTS idx_household_links_parent ON household_links(parent_household_id);
