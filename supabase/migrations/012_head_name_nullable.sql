-- Imported source data is Sindhi and now lands in head_name_sindhi.
-- head_name (English) is filled later by the Directory backfill, so it must allow NULL.
ALTER TABLE households ALTER COLUMN head_name DROP NOT NULL;
