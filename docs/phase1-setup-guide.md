# Phase 1 Setup & Testing Guide

**Living Tags Prototype - Multi-User Authentication & Data Isolation**

**Status:** Phase 1 Complete ✅
**Date:** 2025-11-13
**Build Status:** Production build successful (582.70 kB)

---

## What Was Implemented in Phase 1

Phase 1 adds multi-user authentication and complete data isolation to the Living Tags prototype:

### ✅ Completed Features

1. **Database Migration** - Multi-tenant schema with RLS policies
2. **Authentication System** - Supabase Auth with email/password
3. **Landing Page** - Hero section with Sign In/Sign Up
4. **Auth UI** - Sign in, sign up forms with validation
5. **Protected Routes** - Route guards for authenticated access
6. **Onboarding Flow** - Welcome modal with default tag initialization
7. **Multi-Tenant Hooks** - All data operations filtered by user_id

---

## Prerequisites

Before setting up the prototype, ensure you have:

- **Node.js** 22.x LTS or later
- **npm** (comes with Node.js)
- **Supabase Account** - [Sign up at supabase.com](https://supabase.com)
- **Anthropic API Key** - [Get from Anthropic Console](https://console.anthropic.com)

---

## Setup Instructions

### 1. Clone and Install

```bash
# If not already cloned
git clone <repository-url>
cd living-tags-prototype

# Install dependencies
npm install
```

### 2. Database Setup

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to be provisioned
3. Note your project URL and anon key

#### Apply Database Migration

**Option A: Using Supabase Dashboard (Recommended)**

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the migration file: `supabase/migrations/20251113000000_prototype_schema.sql`
4. Copy the entire SQL content
5. Paste into the SQL Editor and click **Run**

**Option B: Using Supabase CLI** (if installed)

```bash
supabase db push
```

#### Verify Database Setup

In your Supabase dashboard, go to **Table Editor** and verify:

- ✅ `tags` table exists with columns: `id`, `user_id`, `name`, `created_at`, `updated_at`
- ✅ `texts` table exists with columns: `id`, `user_id`, `content`, `created_at`, `updated_at`
- ✅ `text_tags` table exists with columns: `id`, `text_id`, `tag_id`, `confidence`, `source`, `created_at`, `updated_at`
- ✅ All tables show "RLS enabled" badge
- ✅ Click on each table → "Policies" tab → should see 4 policies each

### 3. Environment Configuration

#### Create Environment File

```bash
cp .env.local.example .env.local
```

#### Add Your Credentials

Edit `.env.local` and add your keys:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...
```

**Where to find these:**

**Supabase Credentials:**
1. Go to your Supabase project dashboard
2. Click **Settings** → **API**
3. Copy **Project URL** → use as `VITE_SUPABASE_URL`
4. Copy **anon/public key** → use as `VITE_SUPABASE_ANON_KEY`

**Anthropic API Key:**
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Navigate to **API Keys**
3. Create a new key or copy existing one
4. Use as `VITE_ANTHROPIC_API_KEY`

⚠️ **Important:** Never commit `.env.local` to git! It's already in `.gitignore`.

### 4. Run the Development Server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

---

## Testing Phase 1 Features

### Manual Testing Checklist

#### 1. Authentication Flow

**Sign Up:**
- [ ] Navigate to http://localhost:3000
- [ ] Click "Sign Up" button on landing page
- [ ] Enter email (e.g., `testuser1@example.com`) and password
- [ ] Click "Sign Up"
- [ ] Should see success message
- [ ] Should navigate to `/app` automatically
- [ ] Should see onboarding modal

**Sign In:**
- [ ] Sign out (click Sign Out button in top right)
- [ ] Should redirect to landing page
- [ ] Click "Sign In" button
- [ ] Enter same email and password
- [ ] Click "Sign In"
- [ ] Should navigate to `/app` automatically
- [ ] Should NOT see onboarding modal (already seen)

**Sign Out:**
- [ ] Click user email or Sign Out button in header
- [ ] Should redirect to landing page (/)
- [ ] Trying to access `/app` should redirect to landing

#### 2. Onboarding Flow

**First-time user:**
- [ ] Sign up with new account
- [ ] Onboarding modal appears automatically
- [ ] Modal shows welcome message and features
- [ ] Modal mentions "15 default tags"
- [ ] Click "Get Started" to dismiss
- [ ] Modal closes and doesn't appear again

**Verify default tags:**
- [ ] After onboarding, open Supabase dashboard
- [ ] Go to Table Editor → `tags` table
- [ ] Filter by `user_id` (your user ID from `auth.users`)
- [ ] Should see exactly 15 tags:
  - Вовочка, Штирлиц, Программисты, Работа, Семья, Политика
  - Черный юмор, Каламбур, Абсурд, Советские, Современные, Детские
  - Медицина, Студенты, Армия

#### 3. Protected Routes

**Unauthenticated access:**
- [ ] Sign out
- [ ] Try to navigate to `/app` directly
- [ ] Should redirect to `/` (landing page)

**Authenticated access:**
- [ ] Sign in
- [ ] Navigate to `/app`
- [ ] Should display main application
- [ ] Should see user email in header

#### 4. Multi-Tenancy & Data Isolation

**Create two test users:**

1. **User A** (e.g., `alice@example.com`):
   - Sign up
   - Add a test text: "Test text from Alice"
   - Note the text appears in the list

2. **User B** (e.g., `bob@example.com`):
   - Sign out as User A
   - Sign up as new user (User B)
   - Add a test text: "Test text from Bob"

**Verify isolation:**
- [ ] As User B, check if you can see User A's text → Should be INVISIBLE
- [ ] Sign out and sign in as User A
- [ ] Check if you can see User B's text → Should be INVISIBLE
- [ ] Each user should only see their own text
- [ ] Each user should have their own set of 15 default tags

**Database verification:**
- [ ] Open Supabase dashboard → Table Editor → `texts`
- [ ] Note the `user_id` column values
- [ ] User A's texts should have User A's `user_id`
- [ ] User B's texts should have User B's `user_id`
- [ ] Filter by `user_id` to verify isolation

#### 5. Core Features (from PoC)

**Add Text:**
- [ ] Sign in
- [ ] Click "+ Add Text" button
- [ ] Enter Russian text (joke or anecdote)
- [ ] Click "Add Text"
- [ ] Text should appear in the list
- [ ] AI tags should appear with confidence scores

**Search:**
- [ ] Type a tag name in the search box
- [ ] Results should filter to show only texts with that tag

**Existing components:**
- [ ] TextCard displays correctly
- [ ] Tags show confidence percentages
- [ ] All PoC features continue working

---

## Database Schema Verification

### Tables Structure

**tags:**
```sql
id          | UUID        | Primary key
user_id     | UUID        | Foreign key to auth.users (NOT NULL)
name        | TEXT        | Tag name (NOT NULL)
created_at  | TIMESTAMPTZ | Auto-set
updated_at  | TIMESTAMPTZ | Auto-updated via trigger
UNIQUE(user_id, name)
```

**texts:**
```sql
id          | UUID        | Primary key
user_id     | UUID        | Foreign key to auth.users (NOT NULL)
content     | TEXT        | Text content (NOT NULL)
created_at  | TIMESTAMPTZ | Auto-set
updated_at  | TIMESTAMPTZ | Auto-updated via trigger
```

**text_tags:**
```sql
id          | UUID        | Primary key
text_id     | UUID        | Foreign key to texts (NOT NULL)
tag_id      | UUID        | Foreign key to tags (NOT NULL)
confidence  | DECIMAL(3,2)| 0.00-1.00 (NOT NULL)
source      | VARCHAR(10) | 'ai' or 'manual' (NOT NULL)
created_at  | TIMESTAMPTZ | Auto-set
updated_at  | TIMESTAMPTZ | Auto-updated via trigger
UNIQUE(text_id, tag_id)
```

### RLS Policies Verification

Each table should have 4 policies (SELECT, INSERT, UPDATE, DELETE):

**Test RLS:**
1. Open Supabase SQL Editor
2. Run this query:
```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('tags', 'texts', 'text_tags')
ORDER BY tablename, cmd;
```
3. Should see 12 total policies (4 per table)

---

## Troubleshooting

### "Supabase URL or anon key not set"

**Solution:**
- Ensure `.env.local` exists in project root
- Verify it contains valid `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Restart dev server after changing `.env.local`

### "Failed to fetch tags/texts"

**Solution:**
1. Verify database migration was applied (check tables exist)
2. Check RLS policies are enabled
3. Verify you're signed in (check browser console for auth errors)
4. Check Supabase anon key has correct permissions

### "Sign up fails" or "Sign in fails"

**Solution:**
1. Check browser console for error details
2. Verify Supabase Auth is enabled in project settings
3. Check email confirmation settings (disable for testing)
4. Ensure anon key is correct

### "Can see other users' data"

**Solution:**
1. Verify RLS policies are enabled on all tables
2. Check migration was applied correctly
3. Run the RLS verification query above
4. Check browser console for errors

### Port 3000 already in use

**Solution:**
```bash
npm run dev -- --port 3001
```

### Build errors

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run build
```

---

## Next Steps: Phase 2

Phase 1 is complete! Next up in Phase 2:

1. **Tag Glossary CRUD** - Add, edit, delete tags
2. **Tag Manager UI** - Sidebar with tag management
3. **Tag synchronization** - Rename/delete propagates to all texts
4. **Auto-tag existing texts** - When adding new tag

See `docs/prototype-specification.md` for detailed Phase 2 requirements.

---

## Project Structure

```
living-tags-prototype/
├── src/
│   ├── components/
│   │   ├── auth/              # Phase 1 - Auth components
│   │   │   ├── AuthModal.tsx
│   │   │   ├── SignInForm.tsx
│   │   │   ├── SignUpForm.tsx
│   │   │   ├── OnboardingModal.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── search/            # From PoC
│   │   ├── tags/              # From PoC
│   │   ├── texts/             # From PoC
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/
│   │   ├── useAuth.ts         # Phase 1 - Authentication
│   │   ├── useInitializeDefaultTags.ts  # Phase 1
│   │   ├── useTags.ts         # Updated for multi-tenancy
│   │   ├── useTexts.ts        # Updated for multi-tenancy
│   │   ├── useAddText.ts      # Updated for multi-tenancy
│   │   └── useAutoTag.ts      # Updated for multi-tenancy
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client + auth
│   │   ├── claude.ts          # Claude API client
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Landing.tsx        # Phase 1 - Landing page
│   │   └── Home.tsx           # Main app (from PoC)
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── App.tsx                # Phase 1 - Router setup
│   └── main.tsx               # Entry point
├── supabase/
│   └── migrations/
│       └── 20251113000000_prototype_schema.sql  # Phase 1
├── docs/
│   ├── phase1-setup-guide.md  # This file
│   ├── prototype-specification.md
│   └── PROJECT-HANDOFF.md
└── package.json
```

---

## Support

For questions or issues:
1. Check this setup guide
2. Review `docs/prototype-specification.md`
3. Check `.claude/` subagent documentation
4. Consult Supabase documentation
5. Check Anthropic API documentation

---

**Phase 1 Complete! 🎉**

The foundation for multi-user authentication and data isolation is now in place. You can now:
- Sign up new users
- Each user gets their own isolated data space
- Default tags initialize automatically
- All PoC features work in multi-tenant mode

Ready to move to Phase 2: Tag Glossary Management!
