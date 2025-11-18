# Prototype Specification: Multi-User AI Text Tagging Platform

## Executive Summary

This document specifies the Prototype (Stage 2) of the Living Tags platform - a multi-user SaaS application for managing text collections with AI-powered auto-tagging. Building on the successful PoC validation, this prototype introduces user accounts, isolated data spaces, dynamic tag glossary management, and bulk operations.

**Timeline:** 3-6 days
**Status:** Planning
**Previous Stage:** PoC completed and validated (80%+ tagging accuracy, <2s response time)

---

## Goals & Success Criteria

### Primary Goals

1. **Multi-tenancy**: Implement user authentication and complete data isolation
2. **Dynamic Tag Glossary**: Full CRUD operations with automatic synchronization across all user's texts
3. **Manual Tag Correction**: Inline editing to add/remove tags, with preservation during AI re-tagging
4. **Scalability**: Support 100+ texts per user with batch processing
5. **Data Portability**: Import/export functionality for text collections

### Success Criteria

- ✅ Complete user data isolation (verified with test accounts)
- ✅ Tag glossary synchronization works without data loss
- ✅ Manual tag editing works with clear AI/manual distinction
- ✅ Manual tags preserved during AI re-tagging operations
- ✅ Import of 100+ texts completes successfully with progress indication
- ✅ All PoC features continue working (auto-tag, search, confidence scores)
- ✅ Positive UX feedback from 3+ alpha testers
- ✅ No critical bugs in core workflows

---

## Technology Stack

### Core (Unchanged from PoC)

- **Frontend Framework:** React 18.3.1 + TypeScript 5.8.3 (strict mode)
- **Build Tool:** Vite 7.1.11
- **UI Components:** shadcn/ui + Tailwind CSS 3.4.17
- **Routing:** React Router 6.30.1
- **Forms:** react-hook-form 7.61.1 + zod 3.25.76
- **Data Fetching:** @tanstack/react-query 5.83.0
- **AI Integration:** @anthropic-ai/sdk 0.32.1

### New Additions for Prototype

- **Authentication:** Supabase Auth (email/password, social login optional)
- **File Handling:** Browser File API (no additional dependencies)
- **JSON Validation:** zod (already included)
- **Toast Notifications:** sonner ^1.x.x
- **UI Components:** Popover (shadcn/ui) for hamburger menu

---

## Architecture Overview

### Data Flow

```
User Authentication
    ↓
Supabase Auth Session
    ↓
Row Level Security (RLS)
    ↓
User-Isolated Data Layer
    ↓
React Query Cache
    ↓
UI Components
```

### Key Architectural Decisions

1. **Clean Schema Approach**: New database schema with `user_id` from the start (no migration from PoC)
2. **Frontend-Only Auth**: Supabase Auth handles all authentication (no custom backend needed)
3. **Optimistic Updates**: React Query mutations with optimistic UI updates for responsiveness
4. **Batch Processing**: Queue system for bulk operations (import, re-tagging)

---

## Database Schema

### Updated Schema with Multi-Tenancy

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (managed by Supabase Auth)
-- Reference: auth.users (built-in)

-- Tags table: user-specific tag glossary
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name) -- Unique per user
);

COMMENT ON TABLE tags IS 'User-specific tag glossaries (user''s personal tag vocabulary)';
COMMENT ON COLUMN tags.user_id IS 'Owner of this tag';
COMMENT ON COLUMN tags.name IS 'Tag name in user''s language (typically Russian)';

-- Texts table: user's text collection
CREATE TABLE texts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE texts IS 'User text collections';
COMMENT ON COLUMN texts.user_id IS 'Owner of this text';

-- Text-Tags junction: many-to-many with confidence and source tracking
CREATE TABLE text_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    text_id UUID NOT NULL REFERENCES texts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    confidence DECIMAL(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source VARCHAR(10) NOT NULL CHECK (source IN ('ai', 'manual')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(text_id, tag_id)
);

COMMENT ON TABLE text_tags IS 'Text-tag relationships with AI confidence scores and source tracking';
COMMENT ON COLUMN text_tags.confidence IS 'Confidence score (0.00-1.00). Always 1.00 for manual tags';
COMMENT ON COLUMN text_tags.source IS 'Tag source: "ai" (Claude API) or "manual" (user-added)';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User data queries
CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_texts_user_id ON texts(user_id);

-- Junction table foreign keys
CREATE INDEX idx_text_tags_text_id ON text_tags(text_id);
CREATE INDEX idx_text_tags_tag_id ON text_tags(tag_id);

-- Search and filtering
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_text_tags_confidence ON text_tags(confidence DESC);
CREATE INDEX idx_text_tags_source ON text_tags(source);

-- Timestamp queries
CREATE INDEX idx_texts_created_at ON texts(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE texts ENABLE ROW LEVEL SECURITY;
ALTER TABLE text_tags ENABLE ROW LEVEL SECURITY;

-- Tags policies: users can only access their own tags
CREATE POLICY "Users can view their own tags" ON tags
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags" ON tags
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags" ON tags
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags" ON tags
    FOR DELETE
    USING (auth.uid() = user_id);

-- Texts policies: users can only access their own texts
CREATE POLICY "Users can view their own texts" ON texts
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own texts" ON texts
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own texts" ON texts
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own texts" ON texts
    FOR DELETE
    USING (auth.uid() = user_id);

-- Text-tags policies: users can only access relationships for their own data
CREATE POLICY "Users can view text_tags for their texts" ON text_tags
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert text_tags for their texts" ON text_tags
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update text_tags for their texts" ON text_tags
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete text_tags for their texts" ON text_tags
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM texts
            WHERE texts.id = text_tags.text_id
            AND texts.user_id = auth.uid()
        )
    );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tags_updated_at
    BEFORE UPDATE ON tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_texts_updated_at
    BEFORE UPDATE ON texts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_text_tags_updated_at
    BEFORE UPDATE ON text_tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA: DEMO USER TAGS
-- ============================================================================

-- Note: In prototype, each new user will get a default set of tags
-- This is handled by application logic on first login (see onboarding section)
```

### Seed Data Strategy

Unlike PoC with pre-populated tags, the prototype uses **per-user initialization**:

1. User signs up → Supabase Auth creates account
2. First login detected → Frontend triggers "initialize default tags" mutation
3. Default 15 Russian tags inserted for this user
4. User can immediately start using the system

**Default Tags** (same as PoC):
```typescript
const DEFAULT_TAGS = [
  "Вовочка", "Штирлиц", "Программисты",
  "Работа", "Семья", "Политика",
  "Черный юмор", "Каламбур", "Абсурд",
  "Советские", "Современные", "Детские",
  "Медицина", "Студенты", "Армия"
];
```

---

## Feature Specifications

### 1. Authentication System

#### User Flows

**Sign Up:**
```
1. User enters email + password
2. Supabase sends verification email
3. User clicks verification link
4. Redirect to app → auto-login
5. Show onboarding modal
6. Initialize default tags in background
7. Redirect to main interface
```

**Sign In:**
```
1. User enters email + password
2. Supabase validates credentials
3. Redirect to main interface
4. Load user's data (tags, texts)
```

**Sign Out:**
```
1. User clicks "Sign Out"
2. Clear Supabase session
3. Clear React Query cache
4. Redirect to landing/login page
```

#### UI Components

- **Landing Page** (`/`): Hero section + Sign In/Sign Up buttons
- **Auth Modal**: Toggle between Sign In / Sign Up forms
- **Onboarding Modal**: Brief tutorial on first login (dismissible)
- **Profile Menu**: Dropdown with user email + Sign Out button

#### Implementation Notes

- Use Supabase Auth UI components (optional) or custom forms
- Store session in localStorage (handled by Supabase client)
- Protect routes with React Router guards
- Show loading state while checking auth status

---

### 2. Dynamic Tag Glossary Management

#### CRUD Operations

**Create Tag:**
```typescript
interface CreateTagInput {
  name: string; // User-entered tag name
  autoTagExisting?: boolean; // Optional: re-tag all existing texts
}

// Validation rules:
// - Name required, 1-50 characters
// - No duplicate names per user
// - Trim whitespace
```

**Update Tag:**
```typescript
interface UpdateTagInput {
  id: string;
  name: string; // New name
}

// Behavior:
// - Update tag.name
// - All text_tags relationships preserved (tag_id unchanged)
// - No need to re-run AI (relationships unchanged)
```

**Delete Tag:**
```typescript
interface DeleteTagInput {
  id: string;
}

// Behavior:
// - CASCADE deletes all text_tags rows (handled by DB)
// - Remove tag from UI immediately (optimistic update)
// - Two-click confirmation pattern (same as text deletion)
```

#### Synchronization Logic

**Scenario 1: Tag Renamed**
```
User renames "Программисты" → "Разработчики"

1. Update tags.name in database
2. No AI calls needed
3. All existing text_tags relationships still valid
4. UI updates immediately (optimistic)
```

**Scenario 2: Tag Deleted**
```
User deletes "Каламбур" tag

1. User clicks delete button → changes to "Confirm?"
2. User clicks again within 3 seconds → DELETE tag
3. CASCADE removes all text_tags automatically
4. UI removes tag from all TextCard components (optimistic)
5. No re-tagging needed
```

**Scenario 3: New Tag Added with Auto-Tag**
```
User adds "Животные" tag and checks "Auto-tag existing texts"

1. Insert new tag into database
2. Fetch all user's texts
3. For each text:
   a. Call Claude API with new tag in available list
   b. If confidence > 0.3, insert text_tag relationship
   c. Show progress bar (X of Y texts processed)
4. Update UI with new tag assignments
```

#### Tag Manager UI

**Location:** Sidebar or collapsible panel on main page

**Layout:**
```
┌─────────────────────────────────────┐
│ Tag Glossary (15)              [+]  │
├─────────────────────────────────────┤
│ Вовочка (23)              [✏️] [🗑️] │
│ Штирлиц (12)              [✏️] [🗑️] │
│ Программисты (45)         [✏️] [🗑️] │
│ ...                                 │
└─────────────────────────────────────┘

[+] → Opens "Add Tag" modal
[✏️] → Inline edit or edit modal
[🗑️] → Delete with confirmation
(23) → Usage count in user's collection
```

**Add Tag Modal:**
```
┌─────────────────────────────────────┐
│ Add New Tag                    [✕]  │
├─────────────────────────────────────┤
│ Tag Name:                           │
│ [_______________________________]   │
│                                     │
│ ☐ Automatically tag existing texts │
│   (This will analyze all N texts)  │
│                                     │
│           [Cancel]  [Add Tag]       │
└─────────────────────────────────────┘
```

---

### 3. Import/Export Functionality

#### Import Format

**Plain Text** (one text per line):
```
Штирлиц шёл по Берлину...
Программист звонит в библиотеку...
Вовочка приходит домой...
```

**JSON** (structured format with flexible tag specification):

**Format 1: Simple string array (treated as manual tags)**
```json
{
  "format": "living-tags-v1",
  "texts": [
    {
      "content": "Штирлиц шёл по Берлину...",
      "tags": ["Штирлиц", "Советские"]
    }
  ]
}
```

**Format 2: Object without source (treated as AI-generated)**
```json
{
  "format": "living-tags-v1",
  "texts": [
    {
      "content": "Штирлиц шёл по Берлину...",
      "tags": [
        { "name": "Штирлиц", "confidence": 0.95 },
        { "name": "Советские", "confidence": 0.87 }
      ]
    }
  ]
}
```

**Format 3: Full format with source (preserves AI/manual distinction)**
```json
{
  "format": "living-tags-v1",
  "texts": [
    {
      "content": "Штирлиц шёл по Берлину...",
      "tags": [
        { "name": "Штирлиц", "confidence": 0.95, "source": "ai" },
        { "name": "Советские", "confidence": 1.0, "source": "manual" }
      ]
    }
  ]
}
```

#### Import Flow

```
1. User clicks "Import" button
2. File picker opens (accept: .txt, .json)
3. Parse file based on extension
4. Validate format (show errors if invalid)
5. Show preview: "Found X texts. Import all?"
6. User confirms
7. Process in batches:
   a. Insert text into database
   b. For each text:
      - If tags are provided (pre-tagged):
        * Match tag names to user's tag glossary
        * Create missing tags in glossary
        * Parse tag format:
          - String array → insert as manual (confidence 1.0)
          - Object without source → insert as AI with given confidence
          - Object with source → preserve source and confidence
      - If no tags provided:
        * Call Claude API for auto-tagging (source='ai')
   c. Update progress bar
   d. Handle errors gracefully (skip invalid entries)
8. Show summary: "Imported X texts, Y AI tags, Z manual tags"
9. Refresh text list
```

#### Import Logic Implementation

**Tag Format Detection:**
```typescript
function parseImportedTag(
  tag: string | { name: string; confidence?: number; source?: string },
  userGlossary: Tag[]
): { tagId: string; confidence: number; source: 'ai' | 'manual' } {

  // Format 1: String array (e.g., ["Штирлиц", "Советские"])
  if (typeof tag === 'string') {
    const glossaryTag = findOrCreateTag(tag, userGlossary);
    return {
      tagId: glossaryTag.id,
      confidence: 1.0,
      source: 'manual' // String arrays are user-specified
    };
  }

  // Format 2: Object without source
  if (!tag.source) {
    const glossaryTag = findOrCreateTag(tag.name, userGlossary);
    return {
      tagId: glossaryTag.id,
      confidence: tag.confidence || 0.5,
      source: 'ai' // Default to AI if confidence provided
    };
  }

  // Format 3: Full object with source
  const glossaryTag = findOrCreateTag(tag.name, userGlossary);
  return {
    tagId: glossaryTag.id,
    confidence: tag.confidence || (tag.source === 'manual' ? 1.0 : 0.5),
    source: tag.source
  };
}
```

**Rationale:**
- **String arrays** = User explicitly listed these tags → treat as manual
- **Objects without source** = Legacy format or AI output → treat as AI
- **Objects with source** = Full fidelity export → preserve exactly

This ensures backward compatibility while supporting full round-trip fidelity for manual tag corrections.

#### Export Format

**JSON Export** (complete data with source preservation):
```json
{
  "format": "living-tags-v1",
  "exported_at": "2025-11-13T17:45:00Z",
  "user_email": "user@example.com",
  "tag_glossary": [
    {"name": "Вовочка"},
    {"name": "Штирлиц"}
  ],
  "texts": [
    {
      "content": "Штирлиц шёл по Берлину...",
      "tags": [
        {"name": "Штирлиц", "confidence": 0.95, "source": "ai"},
        {"name": "Советские", "confidence": 0.87, "source": "ai"},
        {"name": "Абсурд", "confidence": 1, "source": "manual"}
      ],
      "created_at": "2025-11-12T10:30:00Z"
    }
  ]
}
```

**Compact Format Notes:**
- Tag glossary objects are single-line: `{"name": "..."}`
- Tag assignment objects are single-line: `{"name": "...", "confidence": ..., "source": "..."}`
- Makes file comparison (diff) easier and more readable
- Implemented via regex post-processing after JSON.stringify

#### Export Flow

```
1. User clicks "Export" button
2. Generate JSON from current data
3. Apply compact formatting for tag objects
4. Create Blob with JSON string
5. Trigger download: "living-tags-export-YYYY-MM-DD.json"
6. Show success notification
```

#### Import Timestamp Preservation

When importing texts, original creation timestamps are preserved:
- If `created_at` field exists in import file, use it
- Maintains chronological order after round-trip export/import
- Important for preserving text history and order

#### UI Components

```
Header Actions:
  [Import Texts] [Export Collection]

Import Modal:
  - File picker
  - Format selector (auto-detected)
  - Preview pane showing:
    * Number of texts found
    * Texts with pre-existing tags
    * Tag source detection (manual/AI/none)
  - Progress bar during import
  - Error list (if any)
  - Summary: "Imported X texts (Y with AI tags, Z with manual tags)"

Export Modal (optional):
  - Format: JSON (full fidelity with source tracking)
  - Automatically includes:
    * All texts with content
    * All tags with confidence and source
    * Tag glossary
    * Metadata (export date, user email)
  - Download button
```

---

### 4. Enhanced UI/UX

#### New Pages/Routes

```typescript
// Public routes
/                    → Landing page with auth
/sign-in             → Sign in form (optional, can be modal)
/sign-up             → Sign up form (optional, can be modal)

// Protected routes (require auth)
/app                 → Main application interface
/app/tag-glossary    → Tag glossary management page (optional, can be sidebar)
/app/settings        → User settings (optional for prototype)
```

#### Main Application Layout

**Desktop Layout (md+):**
```
┌──────────────────────────────────────────────────────────────────┐
│ Living Tags               [user@email.com] [Import] [Export]    │
│                           [+ Add Text] [Exit]                   │
├──────────────────────────────────────────────────────────────────┤
│ [Tags ▾] [Search tags...________________]        (sticky header) │
├──────────────────────────────────────────────────────────────────┤
│                          (scrollable content)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [🗑️]                                                      │   │
│  │ Штирлиц шёл по Берлину...                                │   │
│  │ [Штирлиц 95% ✕] [Советские 87% ✕]                       │   │
│  │ [Абсурд ✓] [+ Add tag ▾] [🔄 Re-tag]                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ [🗑️]                                                      │   │
│  │ Программист звонит...                                    │   │
│  │ [Программисты 92% ✕]                                     │   │
│  │ [Каламбур 78% ✕] [+ Add tag ▾] [🔄 Re-tag]              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

**Mobile Layout (<md):**
```
┌──────────────────────────────────┐
│ Living Tags    [user@..] [☰]    │  ← Hamburger menu
├──────────────────────────────────┤
│ [Tags ▾] [Search tags...]       │  ← Sticky
├──────────────────────────────────┤
│        (scrollable)              │
│  ┌────────────────────────────┐  │
│  │ Text card...               │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘

Hamburger menu contains:
  [Import]
  [Export]
  [+ Add Text]
  [Exit]
```

**Layout Features:**
- Header with action buttons stays at top (sticky)
- Tags button and search bar in fixed-width container (2/3 of main area)
- Fixed gap between Tags button and search bar (doesn't change with screen size)
- Search bar fills remaining space within container
- Only text list scrolls, not the header/actions row
- Import/Export/Add Text/Exit buttons collapse into hamburger menu on mobile

Legend:
  [Tag 95% ✕]  → AI-generated tag (light gray, shows confidence %)
  [Tag ✓]      → Manual tag (solid color, checkmark icon)
  [✕]          → Remove tag button (appears on hover)
  [+ Add tag ▾]→ Opens inline dropdown to add tags
  [🔄 Re-tag]  → Re-run AI tagging with current glossary
  [🗑️]          → Delete text (two-click confirmation)
  [☰]          → Hamburger menu (mobile only)
```

#### Search Functionality

**Multi-Tag Search with AND Logic:**
Search for texts that have ALL specified tags, not just one.

```typescript
// Search query parsing
const searchTerms = searchQuery
  .toLowerCase()
  .trim()
  .split(/[\s,]+/)  // Split by spaces or commas
  .filter(term => term.length > 0);

// Filter texts that have ALL search terms (AND operation)
const filteredTexts = texts.filter(text =>
  searchTerms.every(searchTerm =>
    text.tags.some(tag =>
      tag.name.toLowerCase().includes(searchTerm)
    )
  )
);
```

**Examples:**
- Search: `"вов"` → Finds texts with "Вовочка" tag
- Search: `"вов прог"` → Finds texts with BOTH "Вовочка" AND "Программисты" tags
- Search: `"вов, прог"` → Same as above (comma-separated)

**Use case:** Users can narrow down results with multiple criteria, finding texts that belong to specific intersections of tag categories.

#### Responsive Design

- **Desktop (>1024px):** Sidebar + main content
- **Tablet (768-1024px):** Collapsible sidebar
- **Mobile (<768px):** Full-width, bottom navigation

#### Loading States

```typescript
// Authentication check
<AuthLoadingScreen /> // Full-page spinner

// Data fetching
<TextListSkeleton /> // Shimmer placeholders

// Import/Export operations
<ProgressBar value={60} max={100} label="Processing 60/100 texts" />

// AI tagging
<TextCard loading={true} /> // Show spinner on card during tagging
```

#### Error States

```typescript
// Network errors
<ErrorBoundary fallback={<ErrorDisplay retry={() => refetch()} />} />

// Empty states
<EmptyState
  icon={<FileIcon />}
  title="No texts yet"
  description="Add your first text to get started"
  action={<Button onClick={openAddModal}>Add Text</Button>}
/>

// API errors
<Toast variant="destructive">
  Failed to auto-tag text. You can add tags manually.
</Toast>
```

#### User Feedback (Toast Notifications)

Toast notifications provide user feedback for operations, especially errors and long-running processes.

**Library:** sonner (lightweight, shadcn/ui compatible)

**Setup:**
```typescript
// App.tsx
import { Toaster } from 'sonner';
<Toaster position="top-right" richColors />
```

**Notification Strategy:**
- **Error toasts:** For all failures (tag add/remove, AI operations)
- **Success toasts:** Only for long-running operations (AI auto-tagging)
- **Info toasts:** When AI finds no matching tags

```typescript
// Error notification (on mutation failure)
onError: (err) => {
  toast.error('Не удалось удалить тег', {
    description: err.message
  });
}

// Success notification (for AI operations)
onSuccess: (data) => {
  toast.success('AI-теги успешно назначены', {
    description: `Назначено тегов: ${data.length}`
  });
}
```

**Design Principle:** Manual tag add/remove operations use optimistic updates for instant visual feedback. Success toasts are not needed for these operations because the UI change is immediately visible. Reserve success toasts for long-running operations like AI tagging (2-5 seconds).

---

### 5. Batch Processing & Performance

#### Auto-Tagging Queue

When processing multiple texts (import, new tag with auto-tag):

```typescript
interface TaggingQueue {
  items: QueueItem[];
  processing: boolean;
  progress: number;
}

interface QueueItem {
  textId: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

// Process 3 texts concurrently (Claude API rate limit consideration)
const BATCH_SIZE = 3;
const DELAY_BETWEEN_BATCHES = 1000; // 1 second
```

#### Optimization Strategies

1. **Debounced Search:** 300ms debounce on search input
2. **Virtual Scrolling:** Use `react-virtual` if >100 texts (optional)
3. **Optimistic Updates:** Update UI immediately, rollback on error
4. **Cached AI Responses:** Store in text_tags, never re-tag unless requested
5. **Lazy Loading:** Load texts in pages of 50

---

### 6. Manual Tag Editing

#### Motivation

AI auto-tagging is not always accurate. Users need the ability to correct mistakes by manually adding or removing tags from individual texts.

#### Feature Overview

**Inline editing** directly on text cards:
- Users can add tags from their tag glossary without opening a modal
- Users can remove existing tags (both AI and manual)
- Users can re-tag texts with updated glossary
- Users can delete texts entirely
- Clear visual distinction between AI-generated and manually-added tags
- All changes reflected immediately with optimistic updates

#### UI Design

**Text Card with Inline Editing:**
```
┌─────────────────────────────────────────────────┐
│ [🗑️]                                    (top-right)
│ Штирлиц шёл по Берлину. Его выдавала            │
│ волочащаяся за ним парашютная стропа.           │
│                                                  │
│ [Штирлиц 95% ✕] [Советские 87% ✕]              │
│ [Абсурд ✓] [+ Add tag ▾] [🔄 Re-tag]           │
│             └─────────────────────┐             │
│                 Dropdown:         │             │
│                 [Search...]       │             │
│                 ☐ Вовочка         │             │
│                 ☐ Программисты    │             │
│                 ☐ Работа          │             │
│                 ...               │             │
└─────────────────────────────────────────────────┘

Legend:
  [🗑️]             → Delete text button (top-right corner)
  [Штирлиц 95% ✕]  → AI tag with confidence (gray background, lighter text)
  [Абсурд ✓]        → Manual tag, 100% confidence (solid color, checkmark icon)
  [✕]               → Remove tag button (appears on hover)
  [+ Add tag ▾]     → Opens searchable dropdown
  [🔄 Re-tag]       → Re-run AI tagging with current glossary
```

#### Text Deletion

**Two-Click Confirmation Pattern:**
Users can delete texts with a safe, inline confirmation:

```
1. User clicks delete button (🗑️)
2. Button changes to "Confirm?" (destructive color)
3. 3-second timer starts
4. User clicks again to confirm → text deleted
5. If no second click within 3 seconds → button reverts

Benefits:
- No modal interruption
- Faster than dialog-based confirmation
- Still prevents accidental deletion
- Clear visual feedback
```

**Database:**
```sql
DELETE FROM texts WHERE id = $textId AND user_id = auth.uid();
-- CASCADE deletes all text_tags automatically
```

#### Re-tagging Individual Texts

Users can re-run AI tagging on individual texts when:
- They've added new tags to their glossary
- They want to refresh AI suggestions
- They've removed incorrect AI tags and want new suggestions

**Behavior:**
- Deletes existing AI tags only (preserves manual tags)
- Calls Claude API with current tag glossary
- Inserts new AI suggestions
- Shows loading state during processing

#### Visual Distinction

**AI Tags:**
- Badge style: Outlined or light gray background
- Show confidence percentage: `"Штирлиц 95%"`
- Lighter/muted appearance
- Icon: No icon or small AI sparkle icon (optional)

**Manual Tags:**
- Badge style: Solid background (primary color)
- No percentage shown (always 100% confidence)
- Text: `"Абсурд ✓"` with checkmark icon
- Bolder/more prominent appearance

#### Interaction Behavior

**Adding a Tag:**
```
1. User clicks "+ Add tag" on a text card
2. Dropdown appears with searchable list of tags from their tag glossary
3. Shows all tags, with checkboxes
   - Checked = currently assigned to this text
   - Unchecked = not assigned
4. User types to filter: "про" → shows "Программисты"
5. User clicks checkbox or tag name (or uses keyboard navigation)
6. Tag added immediately with:
   - confidence = 1.0
   - source = 'manual'
7. Dropdown stays open for adding multiple tags
8. Click outside or press Escape to close
```

**Keyboard Navigation in Dropdown:**
Standard combobox behavior for searchable dropdown:
- **Arrow Down:** Move highlight to next tag in list
- **Arrow Up:** Move highlight to previous tag
- **Enter:** Add highlighted tag
- **Mouse hover:** Syncs highlight position with cursor
- **Auto-scroll:** Highlighted item stays in visible area

```typescript
const [highlightedIndex, setHighlightedIndex] = useState(-1);

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlightedIndex(prev =>
        prev < filteredTags.length - 1 ? prev + 1 : prev
      );
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : prev);
      break;
    case 'Enter':
      if (highlightedIndex >= 0) {
        onTagAdded(filteredTags[highlightedIndex].id);
        setHighlightedIndex(-1);
      }
      break;
  }
};

// Visual highlight
<div className={isHighlighted ? 'bg-accent' : 'hover:bg-accent'}>
  {tag.name}
</div>
```

**AI→Manual Tag Conversion:**
If user clicks on a tag that is already assigned (AI tag), it converts to manual:
- Tag "Штирлиц 87%" (AI) → Click in dropdown → "Штирлиц ✓" (manual)
- Uses UPSERT: updates source='manual', confidence=1.0
- Use case: User confirms AI suggestion is correct by "endorsing" it

**Removing a Tag:**
```
1. User hovers over tag badge
2. "✕" button appears (or always visible)
3. User clicks "✕"
4. Tag removed immediately from database (DELETE text_tag row)
5. UI updates optimistically
6. Works for both AI and manual tags
```

**Behavior Rules:**
- Manual tags always show confidence 1.0 in database
- Manual tags never removed by AI re-tagging operations
- If user manually adds a tag that AI suggested, it converts to manual (source='manual')
- If user removes an AI tag, it's deleted (not converted)

#### Database Operations

**Add Manual Tag:**
```sql
INSERT INTO text_tags (text_id, tag_id, confidence, source)
VALUES ($1, $2, 1.0, 'manual')
ON CONFLICT (text_id, tag_id)
DO UPDATE SET
  confidence = 1.0,
  source = 'manual',
  updated_at = NOW();
```

**Remove Tag:**
```sql
DELETE FROM text_tags
WHERE text_id = $1 AND tag_id = $2;
```

**Query Tags with Source:**
```sql
SELECT
  t.id,
  t.content,
  tg.id as tag_id,
  tg.name as tag_name,
  tt.confidence,
  tt.source
FROM texts t
LEFT JOIN text_tags tt ON t.id = tt.text_id
LEFT JOIN tags tg ON tt.tag_id = tg.id
WHERE t.user_id = $1
ORDER BY t.created_at DESC;
```

#### React Query Integration

**useMutations:**

**Important:** When texts query includes a searchQuery parameter (e.g., `['texts', userId, searchQuery]`), optimistic updates must handle all query variations using `exact: false`.

```typescript
// Add manual tag
const addManualTag = useMutation({
  mutationFn: async ({ textId, tagId }) => {
    const { error } = await supabase
      .from('text_tags')
      .upsert({
        text_id: textId,
        tag_id: tagId,
        confidence: 1.0,
        source: 'manual'
      });
    if (error) throw error;
  },
  onMutate: async ({ textId, tagId }) => {
    // Cancel ALL text queries (with any searchQuery)
    await queryClient.cancelQueries({
      queryKey: ['texts', user?.id],
      exact: false
    });

    // Snapshot ALL queries for rollback
    const previousQueries = queryClient.getQueriesData({
      queryKey: ['texts', user?.id],
      exact: false
    });

    // Update ALL matching queries optimistically
    queryClient.setQueriesData(
      { queryKey: ['texts', user?.id], exact: false },
      (old) => /* add tag to text */
    );

    return { previousQueries };
  },
  onError: (err, variables, context) => {
    // Rollback ALL queries on error
    context?.previousQueries.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
    toast.error('Failed to add tag', { description: err.message });
  },
  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: ['texts', user?.id],
      exact: false
    });
  }
});

// Remove tag - similar pattern with exact: false
const removeTag = useMutation({
  mutationFn: async ({ textId, tagId }) => {
    const { error } = await supabase
      .from('text_tags')
      .delete()
      .match({ text_id: textId, tag_id: tagId });
    if (error) throw error;
  },
  onMutate: async ({ textId, tagId }) => {
    // Same pattern as addManualTag with exact: false
  },
  onError: (err, variables, context) => {
    // Rollback + toast notification
  },
  onSettled: () => {
    queryClient.invalidateQueries({
      queryKey: ['texts', user?.id],
      exact: false
    });
  }
});
```

This pattern ensures optimistic updates work correctly regardless of active search filters.

#### AI Auto-Tagging Updates

When AI auto-tags a text, it must **respect manual tags** and **avoid duplicate key errors**:

```typescript
async function autoTagText(textId: string, content: string, availableTags: Tag[]) {
  // 1. Get existing manual tags
  const { data: existingTags } = await supabase
    .from('text_tags')
    .select('tag_id')
    .eq('text_id', textId)
    .eq('source', 'manual');

  const manualTagIds = new Set(existingTags?.map(t => t.tag_id) || []);

  // 2. Call Claude API
  const aiSuggestions = await callClaudeAPI(content, availableTags);

  // 3. Delete only AI tags, keep manual
  await supabase
    .from('text_tags')
    .delete()
    .eq('text_id', textId)
    .eq('source', 'ai');

  // 4. Filter out AI suggestions that conflict with manual tags
  // This prevents duplicate key errors when AI suggests a tag
  // that the user already added manually
  const tagsToInsert = aiSuggestions
    .filter(suggestion => !manualTagIds.has(suggestion.id))
    .map(suggestion => ({
      text_id: textId,
      tag_id: suggestion.id,
      confidence: suggestion.confidence,
      source: 'ai' as const
    }));

  // 5. Insert only non-conflicting AI tags
  if (tagsToInsert.length > 0) {
    await supabase
      .from('text_tags')
      .insert(tagsToInsert);
  }

  // Manual tags remain untouched, no duplicate key errors
}
```

#### Components

**New/Updated Components:**
```typescript
// components/tags/TagBadge.tsx (UPDATED)
interface TagBadgeProps {
  name: string;
  confidence: number;
  source: 'ai' | 'manual';
  onRemove?: () => void;
}

// components/tags/InlineTagEditor.tsx (NEW)
interface InlineTagEditorProps {
  textId: string;
  currentTags: Array<{ id: string; name: string; confidence: number; source: string }>;
  availableTags: Tag[];
  onTagAdded: (tagId: string) => void;
  onTagRemoved: (tagId: string) => void;
}

// components/tags/TagDropdown.tsx (NEW)
interface TagDropdownProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onToggle: (tagId: string) => void;
  searchable: boolean;
}
```

#### User Experience Flow

**Complete Flow Example:**
```
1. User adds new text "Программист пришёл на работу..."
2. AI auto-tags: [Программисты 92%] [Работа 78%]
3. User notices AI missed "Современные" tag
4. User clicks "+ Add tag" on the card
5. Dropdown opens, user types "Сов"
6. "Современные" appears in filtered list
7. User clicks it
8. Tag added: [Современные ✓] appears (solid badge)
9. User notices "Работа 78%" is incorrect
10. User hovers, clicks "✕" on "Работа"
11. Tag removed immediately
12. Final state: [Программисты 92%] [Современные ✓]
```

---

## Development Workflow

### Subagent Usage (MANDATORY)

All implementation MUST use specialized subagents from `.claude/subagents/`:

#### frontend-specialist
**Use for:**
- Auth UI components (Landing, Sign In, Sign Up)
- Protected route guards
- Tag Glossary Manager UI (sidebar, modals)
- Import/Export UI (file picker, progress bars)
- **Inline tag editing UI (dropdown, tag badges with remove)**
- Main layout with user profile menu
- Responsive design implementation
- All React components and hooks

**Located at:** `.claude/subagents/frontend-specialist.md`

#### claude-integration-specialist
**Use for:**
- Batch tagging logic for imports
- Auto-tag existing texts when new tag added
- **Preserving manual tags during AI re-tagging**
- Queue management for AI requests
- Error handling for Claude API
- Rate limiting and retry logic
- Confidence score parsing

**Located at:** `.claude/subagents/claude-integration-specialist.md`

#### database-specialist
**Use for:**
- New migration file for multi-tenant schema
- RLS policies for user data isolation
- Indexes optimization
- Helper functions (update_updated_at_column)
- Testing data isolation between users

**Located at:** `.claude/subagents/database-specialist.md`

### Skills Usage

#### project-setup
**NOT NEEDED** - PoC already initialized, just need migration

#### db-reset
**Use when:**
- Switching from PoC schema to prototype schema
- Testing fresh user registration flow
- Resetting test data during development

**Located at:** `.claude/skills/db-reset.md`

### Development Phases

**Phase 1: Database & Auth (Days 1-2)**
```
□ Use database-specialist to create new migration
□ Test RLS policies with multiple test accounts
□ Use frontend-specialist for auth UI
□ Implement route guards
□ Test complete auth flow
```

**Phase 2: Tag Glossary Management (Days 3-4)**
```
□ Use frontend-specialist for Tag Glossary Manager UI
□ Implement CRUD operations for tags
□ Use claude-integration-specialist for auto-tag existing texts
□ Test synchronization scenarios
□ Add usage count display
```

**Phase 3: Manual Tag Editing (Days 4-5)**
```
□ Use frontend-specialist for inline tag editor UI
□ Implement add/remove tag mutations
□ Add visual distinction (AI vs manual badges)
□ Use claude-integration-specialist to update auto-tag logic
□ Test manual tag preservation during re-tagging
```

**Phase 4: Import/Export (Days 5-6)**
```
□ Use frontend-specialist for import/export UI
□ Implement file parsing and validation
□ Add tag format detection logic (string array vs object)
□ Use claude-integration-specialist for batch processing
□ Implement source preservation on export
□ Add progress indicators
□ Test with large datasets (100+ texts)
□ Test round-trip: export → re-import → verify sources match
```

---

## Testing Strategy

### Manual Testing Checklist

#### Authentication
- [ ] Sign up with new account
- [ ] Verify email works (or skip for prototype)
- [ ] Sign in with correct credentials
- [ ] Sign in fails with wrong password
- [ ] Sign out clears session
- [ ] Protected routes redirect to login

#### Data Isolation
- [ ] Create 2 test accounts (User A, User B)
- [ ] User A adds texts → User B cannot see them
- [ ] User A creates tags → User B cannot see them
- [ ] Sign in as User A → see only User A's data
- [ ] Sign in as User B → see only User B's data

#### Tag Glossary Management
- [ ] Add new tag → appears in sidebar
- [ ] Rename tag → updates everywhere
- [ ] Delete tag → removes from all texts (with confirmation)
- [ ] Add tag with "auto-tag existing" → processes all texts
- [ ] Usage count updates correctly

#### Import/Export
- [ ] Import plain text (10 texts) → all appear, auto-tagged by AI
- [ ] Import JSON with string array tags → treated as manual tags
- [ ] Import JSON with object tags without source → treated as AI tags
- [ ] Import JSON with source specified → preserves AI/manual distinction
- [ ] Import 100+ texts → progress bar shows, all succeed
- [ ] Export to JSON → includes source field for all tags
- [ ] Re-import exported JSON → manual tags stay manual, AI tags stay AI
- [ ] Create missing tags during import → added to user's glossary

#### Manual Tag Editing
- [ ] Click "+ Add tag" → dropdown opens with searchable list
- [ ] Search filters tags correctly
- [ ] Add manual tag → appears with checkmark icon (no percentage)
- [ ] Remove AI tag → disappears immediately
- [ ] Remove manual tag → disappears immediately
- [ ] Manual tags persist after AI re-tagging
- [ ] AI tags and manual tags visually distinct
- [ ] Optimistic updates work (immediate UI response)

#### Core Features (from PoC)
- [ ] Add text → auto-tags appear with confidence
- [ ] Search by tag → filters correctly
- [ ] AI tag confidence colors display correctly
- [ ] Manual tags show solid appearance with checkmark
- [ ] All operations complete within acceptable time

### Load Testing

**Test Scenarios:**
- 100 texts per user
- 30 tags in tag glossary
- Import 100 texts at once
- Search with multiple tag filters

**Performance Targets:**
- Page load: <2 seconds
- Search results: <100ms
- Auto-tag single text: <2 seconds
- Import 100 texts: <5 minutes

---

## Deployment

### Environment Variables

Update `.env.local.example`:
```bash
# Supabase (same as PoC)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (same as PoC)
VITE_ANTHROPIC_API_KEY=sk-ant-api03-...

# New for prototype (optional)
VITE_APP_ENV=development
VITE_MAX_IMPORT_SIZE=1000
```

### Database Migration

```bash
# Create new migration
# Located: supabase/migrations/20251113000000_prototype_schema.sql

# Apply via Supabase Dashboard:
# 1. Copy SQL content
# 2. Go to SQL Editor
# 3. Paste and run
# 4. Verify tables created with RLS enabled

# Test RLS:
# 1. Create 2 test users via Supabase Auth
# 2. Try to insert data with different user_id
# 3. Confirm access denied
```

### Build & Deploy

```bash
# Development
npm run dev

# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Or Netlify
netlify deploy --prod
```

---

## Migration from PoC

### For Users with Existing PoC Data

**Option 1: Manual Data Migration**
```sql
-- If you want to preserve PoC data, manually assign to a user:
UPDATE tags SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
UPDATE texts SET user_id = 'your-user-uuid' WHERE user_id IS NULL;
```

**Option 2: Fresh Start (Recommended)**
1. Export PoC data if needed (manually via Supabase UI)
2. Run new migration (drops all tables)
3. Sign up as new user
4. Import texts using new import feature

### Development Continuity

- `.claude/` tools remain unchanged
- `package.json` dependencies unchanged (only using Supabase Auth)
- Frontend code structure same (components, hooks, lib)
- Add new components: Auth, TagManager, Import/Export

---

## Risk Mitigation

### Technical Risks

**Risk:** RLS policies too complex, performance issues
**Mitigation:** Use simple user_id checks, add indexes, test with multiple users

**Risk:** Claude API rate limits during bulk import
**Mitigation:** Implement queue with delays, show clear progress, allow resume

**Risk:** Large imports crash browser
**Mitigation:** Process in batches, use Web Workers (optional), limit to 1000 texts

### UX Risks

**Risk:** Users accidentally delete important tags
**Mitigation:** Confirmation dialogs, show usage count before delete

**Risk:** Auto-tagging existing texts takes too long
**Mitigation:** Make it optional, show progress, allow cancellation

**Risk:** Complex UI confuses users
**Mitigation:** Simple onboarding, tooltips, empty states with guidance

---

## Future Considerations (Post-Prototype)

Not implemented in prototype, but planned for MVP:

- **Password reset flow**
- **Social login (Google, GitHub)**
- **Team workspaces / shared collections**
- **Full-text search** (PostgreSQL FTS)
- **Tag dependencies** (child → parent auto-propagation)
- **Bulk tag operations** (add/remove tag from multiple texts at once)
- **Activity history** (audit log of tag changes)
- **API access**
- **Mobile app (PWA)**

---

## Appendix

### Type Definitions

```typescript
// types/index.ts updates for prototype

export interface User {
  id: string;
  email: string;
  created_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Text {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TextTag {
  id: string;
  text_id: string;
  tag_id: string;
  confidence: number;
  source: 'ai' | 'manual';
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface TextWithTags extends Text {
  tags: Array<{
    tag: Tag;
    confidence: number;
    source: 'ai' | 'manual';
  }>;
}

export interface TagWithUsage extends Tag {
  usage_count: number; // Computed from text_tags join
}

// Import/Export types
export interface ImportFormat {
  format: 'living-tags-v1';
  texts: Array<{
    content: string;
    tags?: string[] | Array<{
      name: string;
      confidence?: number;
      source?: 'ai' | 'manual';
    }>; // Flexible tag format
  }>;
}

export interface ExportFormat {
  format: 'living-tags-v1';
  exported_at: string;
  user_email: string;
  tag_glossary: Array<{ name: string }>;
  texts: Array<{
    content: string;
    tags: Array<{
      name: string;
      confidence: number;
      source: 'ai' | 'manual';
    }>;
    created_at: string;
  }>;
}
```

### Component Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LandingPage.tsx        # NEW
│   │   ├── AuthModal.tsx          # NEW
│   │   ├── SignInForm.tsx         # NEW
│   │   ├── SignUpForm.tsx         # NEW
│   │   └── OnboardingModal.tsx    # NEW
│   ├── layout/
│   │   ├── AppLayout.tsx          # NEW (with sidebar)
│   │   ├── Header.tsx             # UPDATED (add profile menu)
│   │   └── Sidebar.tsx            # NEW (tag glossary)
│   ├── search/
│   │   └── SearchBar.tsx          # UNCHANGED from PoC
│   ├── texts/
│   │   ├── TextList.tsx           # UNCHANGED
│   │   ├── TextCard.tsx           # UPDATED (add inline tag editor)
│   │   └── AddTextModal.tsx       # UNCHANGED
│   ├── tags/
│   │   ├── TagBadge.tsx           # UPDATED (add source, onRemove)
│   │   ├── TagManager.tsx         # NEW
│   │   ├── AddTagModal.tsx        # NEW
│   │   ├── EditTagModal.tsx       # NEW
│   │   ├── DeleteTagDialog.tsx    # NEW
│   │   ├── InlineTagEditor.tsx    # NEW
│   │   └── TagDropdown.tsx        # NEW
│   ├── import-export/
│   │   ├── ImportModal.tsx        # NEW
│   │   ├── ExportModal.tsx        # NEW
│   │   └── ProgressBar.tsx        # NEW
│   └── ui/
│       └── ... (shadcn/ui components)
├── lib/
│   ├── supabase.ts                # UPDATED (add auth helpers)
│   ├── claude.ts                  # UPDATED (add batch processing)
│   └── utils.ts
├── hooks/
│   ├── useAuth.ts                 # NEW
│   ├── useTexts.ts                # UPDATED (add user_id filter)
│   ├── useTags.ts                 # UPDATED (add CRUD operations)
│   ├── useAutoTag.ts              # UPDATED (add batch mode, preserve manual)
│   ├── useManualTag.ts            # NEW (add/remove manual tags)
│   ├── useDeleteText.ts           # NEW (two-click confirmation, optimistic)
│   ├── useDeleteTag.ts            # NEW (two-click confirmation, optimistic)
│   ├── useImportTexts.ts          # NEW (flexible format, timestamp preservation)
│   └── useExportTexts.ts          # NEW (compact JSON format)
├── pages/
│   ├── Landing.tsx                # NEW
│   └── App.tsx                    # UPDATED (protected route)
└── types/
    └── index.ts                   # UPDATED (add user types)
```

---

## Document Status

**Version:** 1.4
**Created:** 2025-11-13
**Last Updated:** 2025-11-17
**Author:** Based on PoC validation and Stage 2 plan
**Status:** Phase 4 complete

**Change Log:**
- 2025-11-17 v1.4: Phase 4 Import/Export complete + Enhanced UI
  - Import/Export functionality with full source preservation
  - Text deletion with two-click confirmation pattern
  - Tag deletion with two-click confirmation pattern (consistency)
  - Re-tag button moved to text tag area
  - Sticky header with responsive hamburger menu
  - Import/Export/Add Text/Exit buttons in header
  - Exit button (renamed from Sign Out) in hamburger menu
  - Compact JSON export format (tag objects on single lines)
  - Import preserves original created_at timestamps
  - Fixed Tags button + search bar layout with stable spacing
  - Smart quote normalization for Claude API JSON parsing
- 2025-11-15 v1.3: Added Enhanced UX Features section (Phase 3+)
  - Multi-tag search with AND logic
  - Arrow key navigation in tag dropdown
  - AI→manual tag conversion via click
  - Toast notifications (sonner library)
  - Advanced optimistic updates with exact: false
  - AI conflict resolution for duplicate keys
- 2025-11-13 v1.2: Updated import/export with source preservation and flexible format support
- 2025-11-13 v1.1: Added manual tag editing feature with inline UI
- 2025-11-13 v1.0: Initial prototype specification created

---

## References

- **PoC Specification:** `docs/poc-specification.md`
- **Project Plan:** `docs/text-collection-saas-plan.md` (ЭТАП 2)
- **PoC Implementation:** Validated, 80%+ tagging accuracy
- **Claude Tools:** `.claude/subagents/`, `.claude/skills/`
- **PoC Migration:** `supabase/migrations/20251111000000_initial_schema.sql`
- **Backend API Contract:** `docs/openapi-spec.yaml` (OpenAPI 3.0)
- **Project Handoff:** `PROJECT-HANDOFF.md` (for next development phase)
