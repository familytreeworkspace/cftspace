-- Add Sindhi and Hindi name fields to households table
ALTER TABLE households
ADD COLUMN head_name_sindhi TEXT,
ADD COLUMN head_name_hindi TEXT;

-- Add Sindhi and Hindi name fields to members table
ALTER TABLE members
ADD COLUMN name_sindhi TEXT,
ADD COLUMN name_hindi TEXT;

-- Update column comments
COMMENT ON COLUMN households.head_name_sindhi IS 'Head of household name in Sindhi (سنڌي)';
COMMENT ON COLUMN households.head_name_hindi IS 'Head of household name in Hindi (हिंदी)';
COMMENT ON COLUMN members.name_sindhi IS 'Member name in Sindhi (سنڌي)';
COMMENT ON COLUMN members.name_hindi IS 'Member name in Hindi (हिंदी)';
