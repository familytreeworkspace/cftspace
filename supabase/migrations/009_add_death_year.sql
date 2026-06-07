-- Death year for members and household heads (deceased marking)
ALTER TABLE households ADD COLUMN IF NOT EXISTS death_year integer;
ALTER TABLE members   ADD COLUMN IF NOT EXISTS death_year integer;
