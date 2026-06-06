-- Add location columns to households table
ALTER TABLE households
  ADD COLUMN IF NOT EXISTS orig_taluka TEXT,
  ADD COLUMN IF NOT EXISTS orig_district TEXT,
  ADD COLUMN IF NOT EXISTS orig_country TEXT,
  ADD COLUMN IF NOT EXISTS curr_taluka TEXT,
  ADD COLUMN IF NOT EXISTS curr_district TEXT,
  ADD COLUMN IF NOT EXISTS curr_country TEXT;

-- Add comments for clarity
COMMENT ON COLUMN households.orig_taluka IS 'Taluka of original address';
COMMENT ON COLUMN households.orig_district IS 'District of original address';
COMMENT ON COLUMN households.orig_country IS 'Country of original address';
COMMENT ON COLUMN households.curr_taluka IS 'Taluka of current address';
COMMENT ON COLUMN households.curr_district IS 'District of current address';
COMMENT ON COLUMN households.curr_country IS 'Country of current address';
