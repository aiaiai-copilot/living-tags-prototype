# Database Reset Skill

**Description:** Reset database to clean state with fresh schema and seed data

**When to use:**
- Testing schema changes
- Clearing test data during development
- Recovering from data corruption
- Starting fresh iteration of PoC

⚠️ **WARNING:** This skill DELETES ALL DATA. Use only in development!

## What This Skill Does

1. 🗑️ Drops all tables (cascading deletes)
2. 🔨 Recreates schema from migrations
3. 🌱 Reseeds initial data (15 tags, 3 test jokes)
4. ✅ Verifies reset completion

## Prerequisites

- Supabase project created
- `.env.local` configured with valid credentials
- Backup any data you want to keep (if applicable)

## Safety Checks

```bash
echo "⚠️  WARNING: This will DELETE ALL DATA in your database!"
echo "This action cannot be undone."
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm) " -r
if [ "$REPLY" != "yes" ]; then
  echo "Reset cancelled"
  exit 0
fi
```

## Reset Steps

### 1. Drop All Tables

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS text_tags CASCADE;
DROP TABLE IF EXISTS texts CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Verify all tables dropped
SELECT tablename FROM pg_tables
WHERE schemaname = 'public';
```

### 2. Recreate Schema

Run migrations in order:

#### Migration 1: Initial Schema
```sql
-- tags table
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- texts table
CREATE TABLE texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- text_tags junction table
CREATE TABLE text_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_id UUID REFERENCES texts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(text_id, tag_id)
);

-- Indexes
CREATE INDEX idx_text_tags_text_id ON text_tags(text_id);
CREATE INDEX idx_text_tags_tag_id ON text_tags(tag_id);
CREATE INDEX idx_texts_created_at ON texts(created_at DESC);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for PoC)
CREATE POLICY "Allow all operations on tags"
  ON tags FOR ALL USING (true);

CREATE POLICY "Allow all operations on texts"
  ON texts FOR ALL USING (true);

CREATE POLICY "Allow all operations on text_tags"
  ON text_tags FOR ALL USING (true);
```

#### Migration 2: Seed Tags
```sql
INSERT INTO tags (name) VALUES
  ('Вовочка'),
  ('Штирлиц'),
  ('Программисты'),
  ('Работа'),
  ('Семья'),
  ('Политика'),
  ('Черный юмор'),
  ('Каламбур'),
  ('Абсурд'),
  ('Советские'),
  ('Современные'),
  ('Детские'),
  ('Медицина'),
  ('Студенты'),
  ('Армия')
ON CONFLICT (name) DO NOTHING;
```

#### Migration 3: Seed Test Jokes
```sql
INSERT INTO texts (content) VALUES
  ('Штирлиц шёл по Берлину. Его выдавала волочащаяся за ним парашютная стропа.'),
  ('Программист звонит в библиотеку:
- Здравствуйте, Катю можно?
- Она в архиве.
- Разархивируйте её пожалуйста, она мне срочно нужна!'),
  ('Вовочка приходит домой из школы:
- Папа, тебя в школу вызывают!
- Что ты опять натворил?
- Да ничего особенного, химичку немного взорвал.
- Ну ладно, пойду завтра.
- Да не в школу идти надо, а сразу в больницу!')
ON CONFLICT DO NOTHING;
```

### 3. Verify Reset

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Count records
SELECT 'tags' as table_name, COUNT(*) as count FROM tags
UNION ALL
SELECT 'texts', COUNT(*) FROM texts
UNION ALL
SELECT 'text_tags', COUNT(*) FROM text_tags;

-- Expected: 15 tags, 3 texts, 0 text_tags
```

## Complete Reset Script

```bash
#!/bin/bash
set -e

echo "🔄 Database Reset - Living Tags PoC"
echo "==================================="
echo ""
echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo ""
read -p "Type 'yes' to confirm: " -r
if [ "$REPLY" != "yes" ]; then
  echo "❌ Reset cancelled"
  exit 0
fi

echo ""
echo "Loading environment..."
if [ ! -f .env.local ]; then
  echo "❌ .env.local not found"
  exit 1
fi

source .env.local

if [ -z "$VITE_SUPABASE_URL" ] || [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "❌ Missing Supabase credentials in .env.local"
  exit 1
fi

echo "✅ Environment loaded"
echo ""

# Check if Supabase CLI is available
if command -v supabase &> /dev/null; then
  echo "📊 Using Supabase CLI..."

  # Reset database
  supabase db reset

  echo "✅ Database reset complete"
else
  echo "ℹ️  Supabase CLI not found"
  echo ""
  echo "Please reset database manually:"
  echo "1. Go to Supabase Dashboard > SQL Editor"
  echo "2. Run the following SQL in order:"
  echo ""
  echo "   -- Drop tables"
  echo "   DROP TABLE IF EXISTS text_tags CASCADE;"
  echo "   DROP TABLE IF EXISTS texts CASCADE;"
  echo "   DROP TABLE IF EXISTS tags CASCADE;"
  echo ""
  echo "3. Then run all migrations in supabase/migrations/ folder"
  echo ""
  read -p "Press Enter when manual reset is complete..."
fi

echo ""
echo "🧪 Verifying database state..."

# Here you would add a verification query
# For now, just a reminder
echo "✅ Please verify in Supabase Dashboard:"
echo "   - 15 tags in 'tags' table"
echo "   - 3 texts in 'texts' table"
echo "   - 0 records in 'text_tags' table"
echo ""
echo "✅ Database reset complete!"
```

## Manual Reset Instructions

If you prefer to reset manually via Supabase Dashboard:

### Step 1: Go to SQL Editor
Navigate to: Supabase Dashboard > SQL Editor

### Step 2: Drop All Tables
```sql
DROP TABLE IF EXISTS text_tags CASCADE;
DROP TABLE IF EXISTS texts CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
```

### Step 3: Run Migrations
Copy and run each migration file from `supabase/migrations/` in order:
1. `20250101000001_initial_schema.sql`
2. `20250101000002_seed_tags.sql`
3. `20250101000003_seed_test_jokes.sql`

### Step 4: Verify
```sql
-- Should return: tags, texts, text_tags
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Should return: 15, 3, 0
SELECT COUNT(*) FROM tags;
SELECT COUNT(*) FROM texts;
SELECT COUNT(*) FROM text_tags;
```

## Quick Reset (One-liner)

If you have all migrations in a single file:
```bash
cat supabase/migrations/*.sql | psql $DATABASE_URL
```

## Partial Resets

### Reset Only Data (Keep Schema)
```sql
TRUNCATE text_tags CASCADE;
TRUNCATE texts CASCADE;
TRUNCATE tags CASCADE;

-- Then rerun seed migrations
```

### Reset Only Texts (Keep Tags)
```sql
TRUNCATE text_tags CASCADE;
TRUNCATE texts CASCADE;

-- Then rerun test jokes seed
```

### Add More Test Data
```sql
-- Add additional test jokes without full reset
INSERT INTO texts (content) VALUES
  ('Your new test joke here');
```

## Troubleshooting

### "Table does not exist" Error
This is normal if tables were already dropped. Continue with schema recreation.

### "Permission denied" Error
- Check RLS policies are set up correctly
- Verify anon key has proper permissions
- Use service role key for admin operations (not in PoC)

### "Foreign key violation" Error
- Drop tables in correct order (text_tags → texts → tags)
- Use CASCADE to automatically drop dependent objects

### Supabase CLI Not Working
- Ensure you're in project root directory
- Check `supabase` folder exists with config
- Fall back to manual SQL execution

## Post-Reset Checklist

After reset, verify:
- [ ] All 3 tables exist
- [ ] 15 tags present
- [ ] 3 test jokes present
- [ ] No text_tags (will be created via auto-tagging)
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Frontend can connect and query

## Success Criteria

Reset is successful when:
- ✅ Clean database schema
- ✅ 15 Russian tags seeded
- ✅ 3 test jokes seeded
- ✅ All indexes and policies in place
- ✅ Frontend app connects successfully
- ✅ No orphaned data or constraints

## When to Use This Skill

**Good reasons to reset:**
- Testing schema modifications
- Cleaning up test data
- Starting fresh demo
- After breaking database state
- Iterating on seed data

**Bad reasons to reset:**
- To fix application bugs (debug first)
- In production (NEVER!)
- Without backing up important data
- Just to "see what happens"

## Remember

- ⚠️ This is destructive - all data will be lost
- 💾 Backup any data you want to keep
- 🧪 This is a PoC skill - production needs proper migrations
- 📝 Document any custom data before resetting
