-- ============================================================
-- CFTSpace — Set Chief User
-- Run AFTER creating your account in Supabase Auth
-- Replace the email below with your actual email
-- ============================================================

-- Step 1: After you sign up / create your account in Supabase Auth,
--         run this to make yourself Chief

update users
set role = 'chief', name = 'Chief Admin'
where email = 'YOUR_EMAIL_HERE';

-- If the user row was not auto-created, insert manually:
-- insert into users (id, name, email, role)
-- select id, 'Chief Admin', email, 'chief'
-- from auth.users
-- where email = 'YOUR_EMAIL_HERE'
-- on conflict (id) do update set role = 'chief';
