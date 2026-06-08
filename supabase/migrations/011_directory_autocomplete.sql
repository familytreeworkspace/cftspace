-- Directory: per-category uniqueness (no duplicates) + fast search + relation seed
-- + trilingual father-name columns on households

-- 1) Drop the old global-unique on sindhi_word, make uniqueness per category
ALTER TABLE directory DROP CONSTRAINT IF EXISTS directory_sindhi_word_key;
CREATE UNIQUE INDEX IF NOT EXISTS directory_cat_sindhi_key ON directory (category, sindhi_word);
CREATE INDEX IF NOT EXISTS directory_category_idx ON directory (category);

-- 2) Trilingual father name on households
ALTER TABLE households ADD COLUMN IF NOT EXISTS head_father_name        text;
ALTER TABLE households ADD COLUMN IF NOT EXISTS head_father_name_sindhi text;
ALTER TABLE households ADD COLUMN IF NOT EXISTS head_father_name_hindi  text;

-- 3) Seed standard relations (English / Sindhi / Hindi)
INSERT INTO directory (category, english_word, sindhi_word, hindi_word) VALUES
  ('relation', 'Father',                'پيءُ',  'पिता'),
  ('relation', 'Mother',                'ماءُ',  'माता'),
  ('relation', 'Son',                   'پٽ',    'पुत्र'),
  ('relation', 'Daughter',              'ڌيءَ',  'पुत्री'),
  ('relation', 'Brother',               'ڀاءُ',  'भाई'),
  ('relation', 'Sister',                'ڀيڻ',   'बहन'),
  ('relation', 'Wife',                  'زال',   'पत्नी'),
  ('relation', 'Husband',               'مڙس',   'पति'),
  ('relation', 'Grandfather',           'ڏاڏو',  'दादा'),
  ('relation', 'Grandmother',           'ڏاڏي',  'दादी'),
  ('relation', 'Maternal Grandfather',  'نانو',  'नाना'),
  ('relation', 'Maternal Grandmother',  'ناني',  'नानी'),
  ('relation', 'Mother-in-law',         'سَس',   'सास'),
  ('relation', 'Father-in-law',         'سهرو',  'ससुर'),
  ('relation', 'Uncle (Paternal)',      'چاچو',  'चाचा'),
  ('relation', 'Aunt (Paternal)',       'چاچي',  'चाची')
ON CONFLICT DO NOTHING;
