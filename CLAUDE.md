# CFTSpace — Community Family Tree Platform
## Master Project Brief for Claude Code
### Version 1.0 | June 2026

---

## IMPORTANT INSTRUCTION FOR CLAUDE CODE
Read this entire file before writing any code.
This is the single source of truth for the CFTSpace project.
Every decision made is documented here — do not assume anything not written here.

---

## 1. PROJECT OVERVIEW

CFTSpace is a multi-tenant Community Family Tree Web Application.
- Different castes/communities maintain their family records on one platform
- SaaS model — Chief owns platform, each community Admin manages own data
- Data is sub-caste based — every record belongs to a sub caste
- Platform supports graphical and non-graphical family tree views
- Multi-language: English, Sindhi (RTL), Hindi

---

## 2. TECH STACK

| Layer        | Technology                        |
|--------------|-----------------------------------|
| Frontend     | Next.js 16 + TypeScript + Tailwind CSS (App Router) |
| Hosting      | Vercel (free hobby plan)          |
| Database     | Supabase (PostgreSQL, free tier)  |
| Auth         | Supabase Auth                     |
| File Storage | Supabase Storage (member photos)  |
| Version Ctrl | GitHub                            |
| PWA          | next-pwa (must be enabled from day 1) |
| Multi-lang   | next-intl (EN / Sindhi / Hindi)   |

### Credentials / Config
```
Vercel URL     : cftspace.vercel.app
GitHub Repo    : familytreeworkspace/cftspace
Supabase URL   : https://vgudndmfczppicealndm.supabase.co
Supabase Region: South Asia Mumbai ap-south-1
```

### .env.local (never commit this file)
```
NEXT_PUBLIC_SUPABASE_URL=https://vgudndmfczppicealndm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase Settings > API > Publishable key>
```

---

## 3. DATA HIERARCHY

```
PLATFORM  (Chief)
  └── Caste / Community         (e.g. Chand Community)
        └── Sub Caste           (e.g. Makwana, Asdey, Jopadia, Banbharia, Joping, Makkar)
              └── Household     (Ghar — Head of Household)
                    └── Members (Wife, Sons, Daughters, Mother etc.)
                          └── Relation Table  (Sashan — auto populated)
                          └── Contacts        (Telephone numbers)
                          └── Family Links    (Tree connections)
```

RULE: Sub Caste MUST be created before any data import.
Each import file is always tied to one specific Sub Caste.

---

## 4. USER ROLES

### CHIEF
- Platform owner (one person)
- Full access to everything
- Creates and deletes Admins
- Can see all castes and communities
- Can manage all data

### ADMIN (per caste/community)
- Manages one caste/community
- Creates Verifier and Data Entry users
- Approves or rejects correction requests
- Imports data (Excel)
- Links family tree (drag & drop / search)
- Can edit all data in their caste

### VERIFIER / DATA ENTRY
- Assigned by Admin
- Can enter new household data (status: pending until Admin approves)
- Can submit correction requests
- Cannot approve anything
- Cannot delete anything

### VIEWER
- Read-only access after login
- Selects Community on login screen
- Left sidebar shows Sub Caste list
- Click Sub Caste → Household list appears
- Click Household → Members shown (Name + Relation)
- Can see family tree graphic
- Cannot edit, add, or request corrections

---

## 5. CORRECTION REQUEST WORKFLOW

```
Verifier spots error
  → submits Correction Request (old value + new value + reason)
  → status = PENDING / HOLD
  → Admin or Chief reviews
  → APPROVE → data updated automatically
  → REJECT  → request rejected with reason
Full history of all requests maintained forever
```

---

## 6. HOUSEHOLD DATA FIELDS

### Household Sheet (Head of Household)
```
ghar_number       — Unique per sub caste (from Excel: گهر نمبر)
head_name         — Name of head (نالو)
head_gender       — Male / Female (Female for widow/divorce cases)
dob_year          — Birth year only (جنم جي تاريخ) — OR full date, both optional
sub_caste_id      — Auto from selected sub caste at import (نُڪ) — changeable
education         — (تعليم)
profession        — (ڪاروبار)
original_address  — Village/area of origin (اصل پتو)
current_address   — Current residence (موجوده پتو)
photo_url         — Optional. Symbol shown if absent.
is_active         — Boolean (soft delete)
```

### Member Fields (Related Sheet)
```
household_id      — Links to Household (گهر نمبر)
member_number     — Sequential per household (ڀاتي نمبر)
name              — (پاتي جو نالو)
gender            — Male / Female (required)
relation_code     — See relation codes below (رشتو)
dob_year          — Birth year OR full date (جنم جي تاريخ)
education         — (تعليم)
profession        — (ڪاروبار)
sub_caste_id      — Auto from father's sub caste; wife = her own sub caste; changeable
photo_url         — Optional
```

### Relation Codes (Sindhi)
```
زال  (Zal)  = WIFE
ٻت   (Bt)   = BETA (Son)
ڏي   (Di)   = BETI (Daughter)
ماءُ (Maa)  = MAA (Mother)
More codes to be added — Admin can define custom codes
```

IMPORTANT: Member order in Related sheet is NOT fixed.
Relation Code column determines who each member is.

### Sub Caste Rules
- Head of Household sub caste = sub caste selected at import
- Wife sub caste = her own sub caste (entered separately, usually different)
- Sons and Daughters sub caste = Father's sub caste (auto-assigned, changeable)
- Female head of household is fully supported (widow/divorce)

---

## 7. RELATION TABLE (SASHAN)

Sindhi name: رشتيدارن جي نُڪ
Auto-populated from linked data. Each field has Auto/Manual toggle.
When manually overridden, field is flagged as 'Manual'.

```
khud_sc    — Khud ki sub caste (خود) — from household record
zal_sc     — Wife/Wives sub caste (زال) — ARRAY (multiple wives supported)
maa_sc     — Maa sub caste (ماءُ) — ARRAY
dadi_sc    — Dadi sub caste (ڏاڏي) — ARRAY
nani_sc    — Nani sub caste (ناني) — ARRAY
saas_sc    — Saas sub caste (سَس) — ARRAY (multiple if multiple wives)
```

Each field stores: auto_value + manual_override_value + is_manual_flag

---

## 8. CONTACTS / TELEPHONE

- Each household: multiple contact numbers
- Excel import: up to 3 numbers per household
- Additional numbers can be added manually in app
- Contacts can also be linked to individual members

---

## 9. EXISTING EXCEL DATA FORMAT

Data is in SINDHI language. Each sub caste has one Excel file with 4 sheets:

| Sheet Name | Content | Key Columns (Sindhi) |
|------------|---------|----------------------|
| house hold | Head of Household per Ghar | گهر نمبر, نالو, جنم جي تاريخ, نُڪ, تعليم, ڪاروبار, اصل پتو, موجوده پتو |
| related    | All members per Ghar | گهر نمبر, ڀاتي نمبر, پاتي جو نالو, رشتو, جنم جي تاريخ, تعليم, ڪاروبار, نُڪ |
| Sashan     | Sub caste relation table | گهر نمبر, خود, زال, ماءُ, ڏاڏي, ناني, سَس |
| telephone  | Contact numbers | گهر نمبر, number_1, number_2, number_3 |

---

## 10. IMPORT SYSTEM

### Import Flow (strictly sequential)
```
Step 1  — Admin creates Sub Caste first (e.g. ACHO)
Step 2  — Upload Household sheet → map columns → preview → confirm → import
Step 3  — System auto-prompts: "Import Members now?"
Step 4  — Upload Related sheet → map columns → preview → confirm → import
Step 5  — System auto-prompts: "Import Sashan now?"
Step 6  — Upload Sashan sheet → map → preview → confirm → import
Step 7  — System auto-prompts: "Import Telephone now?"
Step 8  — Upload Telephone sheet → map → preview → confirm → import
Step 9  — Import Summary shown (households, members, warnings)
Step 10 — Family Tree links auto-ready via Ghar Numbers
```

### Hybrid Approach
- Bulk existing data → Excel import
- New entries → App forms
- Corrections → App edit + correction request system

### Dictionary System (Sindhi ↔ English)
During import AI transliterates Sindhi names to English.

Tab 1 — MANUAL CORRECTIONS
- Admin adds: Wrong Sindhi word → Correct English word
- Applied globally across all records automatically

Tab 2 — AI CORRECTED WORDS
- AI-converted words with confidence score
- Admin approves or rejects each

Dictionary Logic:
```
Import starts
  → check each word against dictionary
  → match found → auto-replace
  → no match → flag for review
  → Admin reviews → corrects → adds to dictionary
  → next import: auto-fixed
```

---

## 11. FAMILY TREE SYSTEM

### Phase 1 — Auto Links (from import)
Ghar Numbers create automatic within-household links.
No manual work needed for members of same household.

### Phase 2 — Cross-Household Links (manual by Admin)
When son grows up and forms new household:
Admin links new household to father's record.

### Display Modes
GRAPHIC MODE:
- Round photo circles
- Name + birth/death year below photo
- Horizontal lines = husband-wife connection
- Vertical lines = parent-child connection
- If no photo: age-appropriate symbol shown

NON-GRAPHIC MODE:
- Age-appropriate male/female symbols (no photos)
- Name below symbol
- Same line structure

Toggle button always visible on tree page.

### Age-Based Symbols
```
0-12 years   → Small child figure (male/female)
13-59 years  → Standing adult figure (male/female)
60+ years    → Elderly figure with cane (male/female)
Deceased     → Greyed out symbol
```

### Admin Linking Tools
DESKTOP:
- Drag & Drop — drag member node, drop on another to link

MOBILE:
- Search & Select
- Move Older Generation button (make child of someone)
- Move Younger Generation button (make someone child of this)

Rules:
- CONFIRM popup required before every link change
- Full change history saved (who, what, when)
- UNDO available for last 30 days
- ONLY Admin and Chief can use linking tools

### Marriage / Remarriage Rules
```
Male remarriage:
  → Same household
  → Second wife = new member with Zal relation
  → Sashan table auto-updated

Female remarriage (widow/divorce):
  → Female gets new household link
  → Old household preserved as 'previous marriage' history
  → New household created or linked to new husband

Female head of household:
  → Fully supported for widow/divorce
  → Children are members under her
```

---

## 12. REPORTS

| Report | Description |
|--------|-------------|
| Sub Caste Wise | All households and members under selected sub caste |
| Family Wise | Complete detail of one selected household |
| Selected Family Tree | Graphical or text tree of selected lineage |
| Village Wise | All families in selected village |
| Village Wise — Married Household | Households where spouse is from that village |
| Village Wise Families | Full family directory by village |
| Age Wise | Members sorted by age |
| Profession Wise | Members filtered by profession |
| Education Wise | Members filtered by education level |

Each report: Filter panel + Print Preview + Export PDF + Export Excel

---

## 13. MULTI-LANGUAGE

Languages: English (LTR), Sindhi سنڌي (RTL Arabic script), Hindi हिंदी (LTR)
Package: next-intl
Toggle: in header, saved per user in Supabase
RTL: full layout flips when Sindhi selected
Data: stored in English; display fields have sindhi/hindi alternate columns

---

## 14. PWA

Package: next-pwa
MUST be configured from Day 1.
- Installable on Android and iOS without app stores
- Offline support for previously viewed data
- Icons needed: 192x192 and 512x512 PNG
- manifest.json: name CFTSpace, theme color deep blue

---

## 15. DATABASE SCHEMA

### platforms
```sql
id, name, created_by, created_at
```

### castes
```sql
id, platform_id, name, name_sindhi, name_hindi, created_at
```

### sub_castes
```sql
id, caste_id, name, name_sindhi, name_hindi, created_at
```

### villages
```sql
id, name, name_sindhi, district, province, created_at
```

### households
```sql
id, sub_caste_id, village_id, ghar_number,
head_name, head_gender, dob_year, dob_full,
education, profession,
original_address, current_address,
photo_url, is_active,
created_at, updated_at
```

### members
```sql
id, household_id, member_number,
name, gender, relation_code,
dob_year, dob_full,
education, profession,
sub_caste_id,
photo_url,
created_at, updated_at
```

### relation_table (sashan)
```sql
id, household_id,
khud_sc,
zal_sc jsonb,       -- array (multiple wives)
maa_sc jsonb,       -- array
dadi_sc jsonb,      -- array
nani_sc jsonb,      -- array
saas_sc jsonb,      -- array (multiple if multiple wives)
-- each field also has: _manual_override + _is_manual flag columns
created_at, updated_at
```

### contacts
```sql
id, household_id, member_id (nullable),
contact_number, contact_type, display_order,
created_at
```

### family_links
```sql
id, member_id,
father_id,    -- FK → members.id
mother_id,    -- FK → members.id
spouse_id,    -- FK → members.id
link_type,    -- biological / step / adopted
created_by, verified,
created_at
```

### users
```sql
id, name, email,
role,      -- chief / admin / verifier / viewer
caste_id,  -- assigned community
is_active,
created_at
```

### correction_requests
```sql
id, table_name, record_id, field_name,
old_value, new_value,
requested_by, status,  -- pending / approved / rejected
reviewed_by, review_note,
created_at, updated_at
```

### dictionary
```sql
id, wrong_word, correct_word,
language_from, language_to,
added_by_type,  -- manual / ai
is_verified,
created_at
```

### import_logs
```sql
id, sub_caste_id, import_type, file_name,
total_rows, success_rows, warning_rows,
imported_by, created_at
```

### change_history
```sql
id, table_name, record_id, field_name,
old_value, new_value,
changed_by, created_at
```

---

## 16. PAGES & ROUTES

| Page | Route | Access |
|------|-------|--------|
| Login | /login | Public |
| Dashboard | /dashboard | Admin, Chief |
| Household List | /households | All logged-in |
| Household Detail | /households/[id] | All logged-in |
| Add/Edit Household | /households/new | Admin, Chief, Data Entry |
| Family Tree View | /tree/[id] | All logged-in |
| Import Wizard | /import | Admin, Chief |
| Reports | /reports | Admin, Chief, Verifier |
| User Management | /users | Chief, Admin |
| Dictionary | /dictionary | Admin, Chief |
| Correction Requests | /corrections | Admin, Chief |
| Sub Caste Management | /subcaste | Admin, Chief |
| Settings | /settings | Chief |

---

## 17. IMPLEMENTATION PHASES

```
Phase 0 — Setup         ✅ Complete
  Next.js 16.2.7, Supabase connected, Vercel deployed, .env.local configured

Phase 1 — Auth          ✅ Complete
  Login page, Supabase Auth, role-based routing, middleware

Phase 2 — Database      ✅ Complete
  14 tables, RLS policies, triggers, seed data — SQL in supabase/migrations/

Phase 3 — Import Wizard ✅ Complete
  4-sheet sequential import, Sindhi header auto-detect, column mapping, preview

Phase 4 — Household CRUD ✅ Complete
  List (filter+search+pagination), detail, add/edit, members modal, contacts

Phase 5 — Family Tree   ✅ Complete
  Graphic/symbol modes, SVG lines, drag-drop linking, search-select (mobile)

Phase 6 — Reports       ✅ Complete
  7 report types, Excel export, browser print/PDF

Phase 7 — Corrections   ✅ Complete
  Submit (hover trigger), approve (auto-applies), reject, hold, full history

Phase 8 — Multi-language ✅ Complete
  next-intl, EN/Sindhi/Hindi JSON, cookie-based locale, RTL for Sindhi

Phase 9 — Polish        ✅ Complete
  PWA (@ducanh2912/next-pwa), manifest.json, SVG icons, /subcaste, /users,
  404/loading/error pages
```

---

## 18. CURRENT STATUS — ALL PHASES COMPLETE

### Deployed
- Next.js 16.2.7 at E:\cftspace
- Supabase project: vgudndmfczppicealndm (Mumbai ap-south-1)
- Vercel: cftspace.vercel.app
- GitHub: familytreeworkspace/cftspace

### Key packages
- @supabase/ssr + @supabase/supabase-js
- next-intl (cookie-based EN/Sindhi/Hindi)
- @ducanh2912/next-pwa
- xlsx (Excel import + export)

### Before first use
1. Run supabase/migrations/001_initial_schema.sql in Supabase SQL Editor
2. Create your account in Supabase Auth
3. Run supabase/migrations/002_set_chief.sql with your email
4. Login at /login

### Rules
- No Roman Urdu anywhere in code or UI
- English only for labels, comments, and UI text
- Sindhi Arabic script (سنڌي) allowed for data fields and translations

---

*CFTSpace Master Brief v1.0 — Updated June 2026 — All 10 phases complete*
