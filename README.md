# Living Tags Prototype

Multi-user AI-powered text tagging system for Russian jokes and anecdotes using Claude API and Supabase.

## Project Status

**Current Phase:** Phase 1 Complete ✅
**Next Phase:** Phase 2 - Tag Glossary CRUD

### Phase 1: Multi-User Authentication & Data Isolation ✅

- ✅ Database migration with multi-tenant schema and RLS policies
- ✅ Supabase Auth (email/password) integration
- ✅ Landing page with hero section
- ✅ Sign In / Sign Up forms with validation
- ✅ Protected routes with authentication guards
- ✅ Onboarding modal with default tag initialization (15 Russian tags)
- ✅ Multi-tenant data isolation (user_id filtering)
- ✅ All PoC features working in multi-tenant mode

### Phase 2: Tag Glossary Management (Planned)

- Tag CRUD operations (add, edit, delete)
- Tag Manager UI with sidebar
- Tag synchronization across texts
- Auto-tag existing texts when new tag added
- Usage count display

### Phase 3: Manual Tag Editing (Planned)

- Inline tag editor on text cards
- AI vs manual tag visual distinction
- Manual tag preservation during AI re-tagging
- Source tracking (ai/manual)

### Phase 4: Import/Export (Planned)

- Import texts (plain text, JSON formats)
- Export with source preservation
- Batch processing with progress indication
- Round-trip fidelity testing

## Quick Start

### Prerequisites

- Node.js 22.x LTS or later
- Supabase account ([sign up](https://supabase.com))
- Anthropic API key ([get key](https://console.anthropic.com))

### Installation

```bash
# Clone repository
git clone <repository-url>
cd living-tags-prototype

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your Supabase and Anthropic credentials

# Apply database migration
# (See docs/phase1-setup-guide.md for detailed instructions)

# Start development server
npm run dev
```

Visit **http://localhost:3000**

## Documentation

- **[Phase 1 Setup & Testing Guide](docs/phase1-setup-guide.md)** - Complete setup instructions
- **[Prototype Specification](docs/prototype-specification.md)** - Full technical specification
- **[Project Handoff](docs/PROJECT-HANDOFF.md)** - Project context and roadmap

## Technology Stack

### Frontend
- **React** 18.3.1 + **TypeScript** 5.8.3 (strict mode)
- **Vite** 7.1.11 (dev server & build tool)
- **shadcn/ui** + **Tailwind CSS** 3.4.17
- **React Router** 6.30.1

### Backend & Data
- **Supabase** 2.74.0 (PostgreSQL database + Auth)
- **@tanstack/react-query** 5.83.0 (async state management)
- **react-hook-form** 7.61.1 + **zod** 3.25.76 (form validation)

### AI Integration
- **@anthropic-ai/sdk** 0.32.1 (Claude API)

## Key Features

### Implemented (Phase 1)

✅ **Multi-User System**
- Email/password authentication via Supabase Auth
- Complete data isolation with Row Level Security (RLS)
- Each user has their own tag glossary and text collection

✅ **Onboarding Flow**
- Welcome modal on first login
- Automatic initialization of 15 default Russian tags
- Guided introduction to features

✅ **AI Auto-Tagging**
- Claude API integration (from PoC)
- Semantic analysis of Russian text
- Confidence scores (0.0-1.0) for each tag

✅ **Tag Search**
- Real-time filtering by tag names
- Search across user's text collection

### Coming in Phase 2-4

🔜 **Tag Glossary Management** (Phase 2)
- Add, edit, delete custom tags
- Tag rename synchronization
- Auto-tag existing texts with new tags
- Usage count tracking

🔜 **Manual Tag Editing** (Phase 3)
- Inline tag editor (no modal)
- Visual distinction: AI tags vs manual tags
- Manual tag preservation during AI re-tagging
- Source tracking (ai/manual)

🔜 **Import/Export** (Phase 4)
- Multiple import formats (TXT, JSON)
- Export with full fidelity (including source)
- Batch processing with progress bars
- Round-trip testing

## Project Structure

```
living-tags-prototype/
├── src/
│   ├── components/
│   │   ├── auth/           # Authentication components
│   │   ├── search/         # Search functionality
│   │   ├── tags/           # Tag display components
│   │   ├── texts/          # Text management
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Core utilities (Supabase, Claude)
│   ├── pages/              # Page components
│   ├── types/              # TypeScript definitions
│   ├── App.tsx             # Router setup
│   └── main.tsx            # Entry point
├── supabase/
│   └── migrations/         # Database migrations
├── docs/                   # Documentation
├── .claude/                # Claude Code configuration
│   ├── subagents/          # Specialized development agents
│   ├── skills/             # Reusable workflows
│   └── hooks/              # Monitoring system
└── package.json
```

## Development Guidelines

This project follows strict development practices:

- **TypeScript Strict Mode** - No `any` types
- **Subagent-Based Development** - Use specialized agents for features
- **shadcn/ui Only** - No other UI libraries
- **Tailwind CSS** - No inline styles
- **Proper Error Handling** - Loading states, error messages
- **Multi-Tenancy First** - All queries filter by user_id

See `.claude/` directory for detailed development guidelines.

## Testing

### Manual Testing

See [Phase 1 Setup Guide](docs/phase1-setup-guide.md#testing-phase-1-features) for comprehensive testing checklist.

**Key tests:**
- Authentication flow (sign up, sign in, sign out)
- Data isolation between users
- Onboarding and default tag initialization
- Protected route guards
- Core features (add text, search, auto-tag)

### Database Verification

```sql
-- Check RLS policies
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('tags', 'texts', 'text_tags')
ORDER BY tablename, cmd;

-- Should see 12 total policies (4 per table)
```

## Security Notes

⚠️ **This is a prototype for testing purposes.**

- API keys stored in frontend (acceptable for prototype)
- RLS policies enforce data isolation
- Email verification optional for testing
- **Do NOT use this architecture in production without proper backend**

For production, implement:
- Backend API with proper auth
- Server-side API key management
- Email verification required
- Rate limiting
- Enhanced security measures

## Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Build output:** `dist/` directory (~582 kB)

## License

This is a Proof of Concept / Prototype project for demonstration purposes.

## Links

- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Reference](https://docs.anthropic.com)
- [React Documentation](https://react.dev)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**Phase 1 Complete! Ready for Phase 2: Tag Glossary Management** 🚀
