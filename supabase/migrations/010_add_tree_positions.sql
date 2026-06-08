-- Saved manual positions for family-tree cards (per sub caste, per node)
CREATE TABLE IF NOT EXISTS tree_positions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_caste_id uuid NOT NULL REFERENCES sub_castes(id) ON DELETE CASCADE,
  node_id      text NOT NULL,                 -- household id or member id
  x            double precision NOT NULL,
  y            double precision NOT NULL,
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (sub_caste_id, node_id)
);

ALTER TABLE tree_positions ENABLE ROW LEVEL SECURITY;

-- Any logged-in user can read saved positions
CREATE POLICY tree_positions_read ON tree_positions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only Chief / Admin can create or change positions
CREATE POLICY tree_positions_write ON tree_positions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('chief', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role IN ('chief', 'admin'))
  );
