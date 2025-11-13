# Project Handoff: Living Tags Prototype

**Date:** 2025-11-13
**Phase:** Prototype (Stage 2)
**Spec Version:** 1.2
**Status:** Ready for implementation

---

## Purpose of This Document

This handoff letter orients you to the Living Tags prototype project. It tells you **where to start**, **what to read**, and **how to work**. For all technical details, refer to the specification.

---

## What You're Inheriting

### Existing: PoC (Proof of Concept)
✅ Working single-user app with:
- Claude AI auto-tagging (validated: 80%+ accuracy, <2s response)
- React + TypeScript + Vite + shadcn/ui
- Supabase database (simple schema, no auth)
- Basic text management and tag search

**Location:** This repository (`/home/user/living-tags-poc`)

### Your Task: Prototype (Stage 2)
Build on the PoC by adding:
1. Multi-user system (auth, data isolation)
2. Tag glossary CRUD
3. Manual tag editing (inline, preserves corrections)
4. Import/export (with AI/manual source tracking)

**Timeline:** 3-6 days, 4 phases

---

## Essential Reading (In Order)

### 1. **docs/prototype-specification.md** ← START HERE
**Your primary reference.** Contains:
- Complete feature requirements
- Database schema with SQL (lines 84-270)
- UI designs and component structure
- Implementation examples with code
- Testing requirements

**Read this first. Everything else references it.**

### 2. **CLAUDE.md** ← MANDATORY COMPLIANCE
**Development rules you must follow:**
- Subagent usage (you CANNOT code directly)
- Technology restrictions (shadcn/ui only, no Redux, no `any` types)
- Code standards (TypeScript strict mode, Tailwind classes)

**Violating these = non-compliance.**

### 3. **docs/poc-specification.md** ← Context
What the current PoC does. Read to understand existing code.

### 4. **docs/text-collection-saas-plan.md** ← Big Picture
Full product vision (PoC → Prototype → MVP → Production). Stage 2 = your scope.

---

## Critical Rule: Use Subagents

**You MUST route all implementation work through specialized subagents.**

| Subagent | Use For | Location |
|----------|---------|----------|
| **frontend-specialist** | React components, UI, hooks, routing | `.claude/subagents/frontend-specialist.md` |
| **claude-integration-specialist** | AI tagging, batch processing, manual tag preservation | `.claude/subagents/claude-integration-specialist.md` |
| **database-specialist** | Migration, RLS policies, schema | `.claude/subagents/database-specialist.md` |

**See spec lines 950-993 for detailed subagent assignments per feature.**

---

## Implementation Phases

### Phase 1: Auth & Data Isolation (Days 1-2)
**Goal:** Multi-user foundation
- Create database migration (spec lines 84-270)
- Implement Supabase Auth (email/password)
- Build landing page and auth UI
- Test RLS policies with 2 users

**Key Decision:** Clean schema approach (no PoC data migration)

### Phase 2: Tag Glossary CRUD (Days 3-4)
**Goal:** User manages their tag vocabulary
- Tag add/edit/delete UI
- Synchronization (rename updates all, delete cascades)
- Optional: auto-tag existing texts when new tag added
- Usage count display

**See spec lines 343-455 for complete CRUD specs**

### Phase 3: Manual Tag Editing (Days 4-5)
**Goal:** Users fix AI mistakes inline
- Inline tag editor on text cards (no modal)
- Visual distinction: AI tags (gray, %) vs manual (solid, ✓)
- Preservation logic: AI re-tagging doesn't remove manual tags

**See spec lines 676-945 for UI design, behavior, and code examples**

### Phase 4: Import/Export (Days 5-6)
**Goal:** Data portability with fidelity
- Support 3 import formats (string array, object, full)
- Export always includes source field
- Round-trip test: export → import → verify sources match

**See spec lines 461-662 for format specs and parsing logic**

---

## Key Technical Decisions (Already Made)

1. **Multi-tenancy:** RLS policies, `user_id` on all tables
2. **AI/Manual Tracking:** `text_tags.source` column (`'ai'` | `'manual'`)
3. **Import Format Strategy:** Flexible (string→manual, object→AI, full→preserve)
4. **No PoC Migration:** Fresh schema, users re-import if needed
5. **Frontend-Only Auth:** Supabase Auth, no custom backend

**Rationale for each explained in spec.**

---

## Where to Find Things

| What You Need | Where to Look |
|---------------|---------------|
| Database schema | Spec lines 84-270 |
| Import parsing logic | Spec lines 547-586 |
| Manual tag editing UI | Spec lines 692-714 |
| AI preservation code | Spec lines 861-896 |
| Component structure | Spec lines 1018-1063 |
| Type definitions | Spec lines 938-1016 |
| Testing checklist | Spec lines 1054-1158 |
| Development phases | Spec lines 1006-1041 |

**Pro tip:** Spec has line number references throughout. Use them.

---

## Success Criteria

You're done when:
- ✅ 2 test users can't see each other's data
- ✅ Manual tags survive AI re-tagging
- ✅ Import 100+ texts successfully
- ✅ Export → re-import → sources match
- ✅ All PoC features still work
- ✅ No TypeScript `any`, no inline styles

**Full checklist: spec lines 1054-1093**

---

## Common Questions

**Q: Where do I start?**
A: Read spec fully, then Phase 1 (database migration).

**Q: Can I implement directly or must I use subagents?**
A: MUST use subagents. See CLAUDE.md.

**Q: What if the spec is unclear?**
A: Spec is comprehensive. Re-read the relevant section. Check PoC code for context.

**Q: Do I need to preserve PoC data?**
A: No. Clean schema approach. Users can re-import via import feature.

**Q: How do I know which subagent to use?**
A: Spec lines 950-993 map features to subagents.

**Q: What's the difference between AI and manual tags?**
A: Source tracking in database. Manual = user-verified, never removed by AI. Spec lines 676-945.

---

## Project Structure Reference

```
living-tags-poc/
├── docs/
│   └── prototype-specification.md  ← YOUR BIBLE
├── .claude/
│   └── subagents/                  ← USE THESE (mandatory)
├── supabase/
│   └── migrations/                 ← CREATE new migration here
├── src/                            ← Implement via subagents
├── CLAUDE.md                       ← DEVELOPMENT RULES
└── package.json                    ← Dependencies ready
```

---

## Final Notes

**Philosophy:** This is an incremental upgrade, not a rewrite. The hard part (AI tagging) is solved. You're adding plumbing (auth, CRUD) and UX improvements (inline editing, source preservation).

**Approach:** Work phase by phase. Test thoroughly. Use subagents for everything.

**When stuck:**
1. Re-read relevant spec section
2. Check PoC code for patterns
3. Verify you're using the correct subagent

**The spec is comprehensive. You have everything you need. Go build! 🚀**
