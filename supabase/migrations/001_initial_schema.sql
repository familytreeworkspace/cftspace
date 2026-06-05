-- ============================================================
-- CFTSpace — Initial Schema Migration
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- ----------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------
create extension if not exists "uuid-ossp";


-- ================================================================
-- TABLES
-- ================================================================

-- platforms
create table if not exists platforms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- castes
create table if not exists castes (
  id           uuid primary key default gen_random_uuid(),
  platform_id  uuid references platforms(id) on delete cascade,
  name         text not null,
  name_sindhi  text,
  name_hindi   text,
  created_at   timestamptz default now()
);

-- sub_castes
create table if not exists sub_castes (
  id           uuid primary key default gen_random_uuid(),
  caste_id     uuid references castes(id) on delete cascade,
  name         text not null,
  name_sindhi  text,
  name_hindi   text,
  created_at   timestamptz default now()
);

-- villages
create table if not exists villages (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  name_sindhi  text,
  district     text,
  province     text,
  created_at   timestamptz default now()
);

-- users (extends auth.users)
create table if not exists users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        text not null check (role in ('chief', 'admin', 'verifier', 'viewer')),
  caste_id    uuid references castes(id),
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- households
create table if not exists households (
  id               uuid primary key default gen_random_uuid(),
  sub_caste_id     uuid references sub_castes(id),
  village_id       uuid references villages(id),
  ghar_number      text not null,
  head_name        text not null,
  head_gender      text not null check (head_gender in ('Male', 'Female')),
  dob_year         integer,
  dob_full         date,
  education        text,
  profession       text,
  original_address text,
  current_address  text,
  photo_url        text,
  is_active        boolean default true,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (sub_caste_id, ghar_number)
);

-- members
create table if not exists members (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid references households(id) on delete cascade,
  member_number  integer,
  name           text not null,
  gender         text not null check (gender in ('Male', 'Female')),
  relation_code  text not null,
  dob_year       integer,
  dob_full       date,
  education      text,
  profession     text,
  sub_caste_id   uuid references sub_castes(id),
  photo_url      text,
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

-- relation_table (sashan — رشتيدارن جي نُڪ)
create table if not exists relation_table (
  id                  uuid primary key default gen_random_uuid(),
  household_id        uuid unique references households(id) on delete cascade,

  -- auto values
  khud_sc             uuid references sub_castes(id),
  zal_sc              jsonb default '[]',
  maa_sc              jsonb default '[]',
  dadi_sc             jsonb default '[]',
  nani_sc             jsonb default '[]',
  saas_sc             jsonb default '[]',

  -- manual overrides
  khud_sc_manual      uuid references sub_castes(id),
  khud_sc_is_manual   boolean default false,
  zal_sc_manual       jsonb default '[]',
  zal_sc_is_manual    boolean default false,
  maa_sc_manual       jsonb default '[]',
  maa_sc_is_manual    boolean default false,
  dadi_sc_manual      jsonb default '[]',
  dadi_sc_is_manual   boolean default false,
  nani_sc_manual      jsonb default '[]',
  nani_sc_is_manual   boolean default false,
  saas_sc_manual      jsonb default '[]',
  saas_sc_is_manual   boolean default false,

  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- contacts
create table if not exists contacts (
  id             uuid primary key default gen_random_uuid(),
  household_id   uuid references households(id) on delete cascade,
  member_id      uuid references members(id) on delete set null,
  contact_number text not null,
  contact_type   text default 'mobile',
  display_order  integer default 1,
  created_at     timestamptz default now()
);

-- family_links
create table if not exists family_links (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid references members(id) on delete cascade,
  father_id   uuid references members(id) on delete set null,
  mother_id   uuid references members(id) on delete set null,
  spouse_id   uuid references members(id) on delete set null,
  link_type   text default 'biological' check (link_type in ('biological', 'step', 'adopted')),
  created_by  uuid references auth.users(id),
  verified    boolean default false,
  created_at  timestamptz default now()
);

-- correction_requests
create table if not exists correction_requests (
  id            uuid primary key default gen_random_uuid(),
  table_name    text not null,
  record_id     uuid not null,
  field_name    text not null,
  old_value     text,
  new_value     text not null,
  requested_by  uuid references auth.users(id),
  status        text default 'pending' check (status in ('pending', 'hold', 'approved', 'rejected')),
  reviewed_by   uuid references auth.users(id),
  review_note   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- dictionary (Sindhi ↔ English transliteration)
create table if not exists dictionary (
  id             uuid primary key default gen_random_uuid(),
  wrong_word     text not null,
  correct_word   text not null,
  language_from  text default 'sindhi',
  language_to    text default 'english',
  added_by_type  text default 'manual' check (added_by_type in ('manual', 'ai')),
  confidence     numeric(4,3),
  is_verified    boolean default false,
  created_at     timestamptz default now(),
  unique (wrong_word, language_from, language_to)
);

-- import_logs
create table if not exists import_logs (
  id            uuid primary key default gen_random_uuid(),
  sub_caste_id  uuid references sub_castes(id),
  import_type   text not null check (import_type in ('household', 'related', 'sashan', 'telephone')),
  file_name     text,
  total_rows    integer default 0,
  success_rows  integer default 0,
  warning_rows  integer default 0,
  imported_by   uuid references auth.users(id),
  created_at    timestamptz default now()
);

-- change_history (audit log)
create table if not exists change_history (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  record_id   uuid not null,
  field_name  text not null,
  old_value   text,
  new_value   text,
  changed_by  uuid references auth.users(id),
  created_at  timestamptz default now()
);


-- ================================================================
-- INDEXES
-- ================================================================
create index if not exists idx_households_sub_caste on households(sub_caste_id);
create index if not exists idx_households_village   on households(village_id);
create index if not exists idx_households_ghar      on households(ghar_number);
create index if not exists idx_members_household    on members(household_id);
create index if not exists idx_members_sub_caste    on members(sub_caste_id);
create index if not exists idx_contacts_household   on contacts(household_id);
create index if not exists idx_family_links_member  on family_links(member_id);
create index if not exists idx_change_history_rec   on change_history(table_name, record_id);
create index if not exists idx_correction_status    on correction_requests(status);


-- ================================================================
-- updated_at TRIGGER
-- ================================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_households_updated_at
  before update on households
  for each row execute function set_updated_at();

create trigger trg_members_updated_at
  before update on members
  for each row execute function set_updated_at();

create trigger trg_relation_table_updated_at
  before update on relation_table
  for each row execute function set_updated_at();

create trigger trg_correction_requests_updated_at
  before update on correction_requests
  for each row execute function set_updated_at();


-- ================================================================
-- AUTO CREATE USER PROFILE ON SIGNUP
-- ================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'viewer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ================================================================
-- HELPER FUNCTIONS FOR RLS
-- ================================================================
create or replace function get_my_role()
returns text as $$
  select role from users where id = auth.uid()
$$ language sql security definer stable;

create or replace function get_my_caste_id()
returns uuid as $$
  select caste_id from users where id = auth.uid()
$$ language sql security definer stable;

create or replace function is_chief_or_admin()
returns boolean as $$
  select get_my_role() in ('chief', 'admin')
$$ language sql security definer stable;


-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
alter table platforms           enable row level security;
alter table castes              enable row level security;
alter table sub_castes          enable row level security;
alter table villages            enable row level security;
alter table users               enable row level security;
alter table households          enable row level security;
alter table members             enable row level security;
alter table relation_table      enable row level security;
alter table contacts            enable row level security;
alter table family_links        enable row level security;
alter table correction_requests enable row level security;
alter table dictionary          enable row level security;
alter table import_logs         enable row level security;
alter table change_history      enable row level security;

-- ---- platforms ----
create policy "anyone authenticated can read platforms"
  on platforms for select to authenticated using (true);

create policy "only chief can manage platforms"
  on platforms for all to authenticated
  using (get_my_role() = 'chief')
  with check (get_my_role() = 'chief');

-- ---- castes ----
create policy "anyone authenticated can read castes"
  on castes for select to authenticated using (true);

create policy "chief can manage castes"
  on castes for all to authenticated
  using (get_my_role() = 'chief')
  with check (get_my_role() = 'chief');

-- ---- sub_castes ----
create policy "anyone authenticated can read sub_castes"
  on sub_castes for select to authenticated using (true);

create policy "chief and admin can manage sub_castes"
  on sub_castes for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- villages ----
create policy "anyone authenticated can read villages"
  on villages for select to authenticated using (true);

create policy "chief and admin can manage villages"
  on villages for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- users ----
create policy "users can read own profile"
  on users for select to authenticated
  using (id = auth.uid() or is_chief_or_admin());

create policy "users can update own profile"
  on users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "chief and admin can insert users"
  on users for insert to authenticated
  with check (is_chief_or_admin());

create policy "chief can delete users"
  on users for delete to authenticated
  using (get_my_role() = 'chief');

-- ---- households ----
create policy "authenticated users can read households"
  on households for select to authenticated using (true);

create policy "chief and admin can manage households"
  on households for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

create policy "verifier can insert households"
  on households for insert to authenticated
  with check (get_my_role() in ('chief', 'admin', 'verifier'));

-- ---- members ----
create policy "authenticated users can read members"
  on members for select to authenticated using (true);

create policy "chief and admin can manage members"
  on members for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

create policy "verifier can insert members"
  on members for insert to authenticated
  with check (get_my_role() in ('chief', 'admin', 'verifier'));

-- ---- relation_table ----
create policy "authenticated users can read relation_table"
  on relation_table for select to authenticated using (true);

create policy "chief and admin can manage relation_table"
  on relation_table for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- contacts ----
create policy "authenticated users can read contacts"
  on contacts for select to authenticated using (true);

create policy "chief and admin can manage contacts"
  on contacts for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- family_links ----
create policy "authenticated users can read family_links"
  on family_links for select to authenticated using (true);

create policy "chief and admin can manage family_links"
  on family_links for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- correction_requests ----
create policy "verifier and above can read corrections"
  on correction_requests for select to authenticated
  using (get_my_role() in ('chief', 'admin', 'verifier'));

create policy "verifier and above can insert corrections"
  on correction_requests for insert to authenticated
  with check (get_my_role() in ('chief', 'admin', 'verifier'));

create policy "chief and admin can update corrections"
  on correction_requests for update to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- dictionary ----
create policy "authenticated users can read dictionary"
  on dictionary for select to authenticated using (true);

create policy "chief and admin can manage dictionary"
  on dictionary for all to authenticated
  using (is_chief_or_admin())
  with check (is_chief_or_admin());

-- ---- import_logs ----
create policy "chief and admin can read import_logs"
  on import_logs for select to authenticated
  using (is_chief_or_admin());

create policy "chief and admin can insert import_logs"
  on import_logs for insert to authenticated
  with check (is_chief_or_admin());

-- ---- change_history ----
create policy "chief and admin can read change_history"
  on change_history for select to authenticated
  using (is_chief_or_admin());

create policy "system can insert change_history"
  on change_history for insert to authenticated
  with check (true);


-- ================================================================
-- SEED DATA
-- ================================================================

-- Platform
insert into platforms (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'CFTSpace')
on conflict do nothing;

-- Caste
insert into castes (id, platform_id, name, name_sindhi) values
  ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Chand Community', 'چند ڪميونٽي')
on conflict do nothing;

-- Sub Castes (from CLAUDE.md: Makwana, Asdey, Jopadia, Banbharia, Joping, Makkar)
insert into sub_castes (id, caste_id, name) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000010', 'Makwana'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000010', 'Asdey'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000010', 'Jopadia'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000010', 'Banbharia'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000010', 'Joping'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000010', 'Makkar')
on conflict do nothing;
