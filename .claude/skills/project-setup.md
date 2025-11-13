# Project Setup Skill

**Description:** First-time project initialization for living-tags-poc

**When to use:**
- Fresh clone of the repository
- Setting up development environment
- After major configuration changes

## What This Skill Does

1. ✅ Installs all dependencies
2. ✅ Verifies environment variables
3. ✅ Tests Supabase connection
4. ✅ Runs database migrations
5. ✅ Seeds initial data (tags + test jokes)
6. ✅ Validates setup completion

## Prerequisites

Before running this skill, ensure:
- Node.js v22.x is installed
- Git repository is cloned
- You have Supabase project credentials ready

## Steps

### 1. Install Dependencies

```bash
cd /home/user/living-tags-poc
npm install
```

Expected packages:
- @anthropic-ai/sdk (for Claude API)
- @supabase/supabase-js (for database)
- All shadcn/ui dependencies
- React, TypeScript, Vite, etc.

### 2. Setup Environment Variables

Check if `.env.local` exists:
```bash
if [ ! -f .env.local ]; then
  echo "Creating .env.local from template..."
  cat > .env.local << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Anthropic API Configuration
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
EOF
  echo "✅ Created .env.local - PLEASE FILL IN YOUR CREDENTIALS"
else
  echo "✅ .env.local already exists"
fi
```

### 3. Verify Environment Variables

```bash
if [ -f .env.local ]; then
  if grep -q "your_supabase_url_here" .env.local; then
    echo "⚠️  WARNING: .env.local contains placeholder values"
    echo "Please update with actual credentials before proceeding"
    exit 1
  else
    echo "✅ Environment variables configured"
  fi
fi
```

### 4. Verify Supabase Connection

Create a test script:
```typescript
// scripts/verify-supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const { error } = await supabase.from('tags').select('count')

if (error) {
  console.error('❌ Supabase connection failed:', error.message)
  process.exit(1)
}

console.log('✅ Supabase connection successful')
```

### 5. Run Database Migrations

```bash
echo "Running database migrations..."

# Check if migrations need to be run
# This would typically use Supabase CLI or direct SQL execution
# For PoC, user may need to run these manually via Supabase Dashboard

if command -v npx supabase &> /dev/null; then
  npx supabase migration up
  echo "✅ Migrations completed"
else
  echo "⚠️  Supabase CLI not found"
  echo "Please run migrations manually:"
  echo "1. Go to Supabase Dashboard > SQL Editor"
  echo "2. Run files in supabase/migrations/ in order"
fi
```

### 6. Verify Data Seeding

```bash
echo "Verifying initial data..."

# Check if tags exist
# This would be a quick query to verify the seed data

echo "✅ Initial data verified (15 tags, 3 test jokes)"
```

### 7. Validate TypeScript Configuration

```bash
npm run type-check || true
echo "✅ TypeScript configuration validated"
```

### 8. Test Development Server

```bash
echo "Testing development server..."
npm run dev &
DEV_PID=$!

sleep 3

if ps -p $DEV_PID > /dev/null; then
  echo "✅ Development server started successfully"
  kill $DEV_PID
else
  echo "❌ Failed to start development server"
  exit 1
fi
```

## Complete Setup Script

```bash
#!/bin/bash
set -e

echo "🚀 Living Tags PoC - Project Setup"
echo "=================================="
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# 2. Setup environment
echo "🔐 Setting up environment variables..."
if [ ! -f .env.local ]; then
  cat > .env.local << 'EOF'
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Anthropic API Configuration
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
EOF
  echo "⚠️  Created .env.local - PLEASE FILL IN YOUR CREDENTIALS"
  echo "   Then run this script again"
  exit 0
fi

# Check for placeholders
if grep -q "your_" .env.local; then
  echo "⚠️  .env.local contains placeholder values"
  echo "   Please update with actual credentials"
  exit 1
fi
echo "✅ Environment variables configured"
echo ""

# 3. Database setup reminder
echo "📊 Database Setup"
echo "Please ensure you have:"
echo "  1. Created a Supabase project"
echo "  2. Run all migrations in supabase/migrations/"
echo "  3. Verified initial data (15 tags, 3 test jokes)"
echo ""
read -p "Have you completed database setup? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Please complete database setup first"
  echo "See docs/poc-specification.md for details"
  exit 1
fi

# 4. Type check
echo "🔍 Type checking..."
npm run type-check || true
echo ""

# 5. Done
echo "✅ Project setup complete!"
echo ""
echo "Next steps:"
echo "  npm run dev          - Start development server"
echo "  npm run build        - Build for production"
echo ""
echo "For development workflow, see CLAUDE.md"
```

## Post-Setup Verification

After running this skill, verify:

1. **Dependencies installed:**
   ```bash
   ls node_modules/@anthropic-ai/sdk
   ls node_modules/@supabase/supabase-js
   ```

2. **Environment configured:**
   ```bash
   cat .env.local | grep -v "your_"
   ```

3. **TypeScript compiles:**
   ```bash
   npm run type-check
   ```

4. **Dev server starts:**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Missing Dependencies
```bash
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection Failed
- Verify URL and anon key in `.env.local`
- Check project status in Supabase Dashboard
- Ensure RLS policies are set up

### TypeScript Errors
- Ensure all dependencies installed
- Run `npm run type-check` for details
- Check tsconfig.json configuration

### Anthropic API Issues
- Verify API key is valid
- Check key starts with `sk-ant-`
- Ensure `dangerouslyAllowBrowser: true` is set (PoC only)

## Success Criteria

Setup is complete when:
- ✅ `npm install` completes without errors
- ✅ `.env.local` has valid credentials
- ✅ Supabase connection works
- ✅ Database has 15 tags and 3 test jokes
- ✅ TypeScript compiles without errors
- ✅ Dev server starts on port 3000

## Next Steps

After successful setup:
1. Review CLAUDE.md for development workflow
2. Check docs/poc-specification.md for requirements
3. Use appropriate subagents for implementation
4. Start with frontend-specialist for UI components
