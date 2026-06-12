-- Migration 014: Marriage / maiden links
-- A married woman belongs to TWO households: her father's (maika) and her husband's (sasural).
-- The model stays household-centric — each member simply points at the OTHER family's household.
--   • A WIFE (Zal) record  →  father_household_id   (her maika — its head is her father)
--   • A DAUGHTER (Beti)    →  married_household_id  (her sasural — its head is her husband)
-- All display data (father/husband name, sub-caste, mother, village) is derived from that
-- household at read time, so nothing is duplicated and corrections stay consistent.

ALTER TABLE members
  -- Maika link (set on the WIFE record): the household whose head is her father
  ADD COLUMN IF NOT EXISTS father_household_id  uuid REFERENCES households(id) ON DELETE SET NULL,
  -- When the father had more than one wife, which one is THIS woman's mother
  ADD COLUMN IF NOT EXISTS mother_member_id     uuid REFERENCES members(id)    ON DELETE SET NULL,
  -- Sasural link (set on the DAUGHTER record): the household whose head is her husband
  ADD COLUMN IF NOT EXISTS married_household_id uuid REFERENCES households(id) ON DELETE SET NULL,
  -- Out-of-community maika (her birth family is NOT on the platform) → free-text fallback
  ADD COLUMN IF NOT EXISTS maiden_external      boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS maiden_father_name   text,
  ADD COLUMN IF NOT EXISTS maiden_mother_name   text,
  ADD COLUMN IF NOT EXISTS maiden_sub_caste     text,
  ADD COLUMN IF NOT EXISTS maiden_address       text;

CREATE INDEX IF NOT EXISTS idx_members_father_household  ON members(father_household_id);
CREATE INDEX IF NOT EXISTS idx_members_married_household ON members(married_household_id);
