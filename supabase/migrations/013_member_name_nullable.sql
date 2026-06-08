-- Imported member source data is Sindhi and now lands in members.name_sindhi.
-- name (English) is filled later by the Directory backfill, so it must allow NULL.
ALTER TABLE members ALTER COLUMN name DROP NOT NULL;
