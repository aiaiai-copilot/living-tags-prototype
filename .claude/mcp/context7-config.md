# Context7 MCP Configuration

## Purpose
Enable Claude Code to access official documentation for project dependencies during development.

## Configured Documentation Sources

### Core Technologies
1. **React** - Component development, hooks, best practices
2. **TypeScript** - Type system, strict mode, advanced types
3. **Vite** - Build configuration, dev server, environment variables
4. **Supabase** - Client API, queries, RLS, migrations
5. **Anthropic SDK** - Claude API integration, message format

### UI & Styling
6. **shadcn/ui** - Component library, theming, variants
7. **Tailwind CSS** - Utility classes, responsive design, customization
8. **Radix UI** - Primitive components (underlying shadcn/ui)

### State & Forms
9. **TanStack Query (React Query)** - Data fetching, caching, mutations
10. **React Hook Form** - Form handling, validation, performance
11. **Zod** - Schema validation, type inference

### Routing
12. **React Router** - Navigation, routing patterns, hooks

## MCP Server Configuration

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": [
        "-y",
        "@context7/mcp-server"
      ],
      "env": {
        "CONTEXT7_DOCS": "react,typescript,vite,supabase,anthropic,shadcn-ui,tailwindcss,tanstack-query,react-hook-form,zod,react-router"
      }
    }
  }
}
```

## Usage Guidelines

### When to Use Context7

**✅ Use Context7 for:**
- Looking up API signatures (e.g., "How do I use Supabase select with joins?")
- Checking component props (e.g., "What props does shadcn/ui Dialog accept?")
- Understanding best practices (e.g., "What's the recommended pattern for React Query mutations?")
- Resolving TypeScript errors with library types
- Finding correct import paths

**❌ Don't use Context7 for:**
- Project-specific code (read local files instead)
- General programming questions (use your knowledge)
- Debugging runtime errors (analyze code directly)

### Example Queries

**Supabase Queries:**
```
"How do I query with nested relationships in Supabase?"
"What's the syntax for Supabase insert with select?"
```

**shadcn/ui Components:**
```
"Show me the Dialog component API from shadcn/ui"
"How do I customize Button variants in shadcn/ui?"
```

**React Query:**
```
"What options does useQuery accept in TanStack Query?"
"How do I handle optimistic updates with useMutation?"
```

**Anthropic SDK:**
```
"What parameters does messages.create accept in Anthropic SDK?"
"How do I handle streaming responses with Anthropic SDK?"
```

**Form Handling:**
```
"How do I integrate Zod with react-hook-form?"
"What's the zodResolver syntax?"
```

## Documentation Priorities

### High Priority (Core to PoC)
1. **Supabase** - Database queries are central
2. **Anthropic SDK** - AI tagging is the core feature
3. **shadcn/ui** - All UI must use these components
4. **React Query** - All data fetching uses this

### Medium Priority (Development Quality)
5. **React Hook Form + Zod** - Forms must be validated
6. **TypeScript** - Strict typing required
7. **Tailwind CSS** - Styling all components

### Lower Priority (Established Patterns)
8. **React** - Well-known, use for advanced patterns only
9. **React Router** - Simple routing, rarely needs docs
10. **Vite** - Configured once, rarely modified

## Integration with Subagents

### frontend-specialist
Should use Context7 for:
- shadcn/ui component APIs
- React Query patterns
- Form validation with Zod

### claude-integration-specialist
Should use Context7 for:
- Anthropic SDK reference
- TypeScript typing for SDK
- Error handling patterns

### database-specialist
Should use Context7 for:
- Supabase query syntax
- RLS policy examples
- Migration patterns

## Alternative Documentation Access

If Context7 is unavailable, use:
- Official documentation websites directly
- WebFetch tool for specific doc pages
- Local README files in node_modules

## Verification

To verify Context7 is working:
```bash
# Check if MCP server is accessible
# (This would be done through Claude Code's MCP system)
```

Expected result:
- Can query documentation successfully
- Returns relevant code examples
- Provides accurate API references

## Troubleshooting

### Context7 Not Responding
1. Check MCP configuration in `.claude/mcp/`
2. Verify `npx @context7/mcp-server` can run
3. Check network connectivity
4. Fallback to WebFetch tool

### Documentation Out of Date
- Note version numbers in package.json
- Cross-reference with official docs
- Prefer package.json version over latest docs

### Wrong Documentation Returned
- Be more specific in queries
- Include version numbers if needed
- Specify the exact library name

## Best Practices

### Efficient Queries
```
❌ "How do I use Supabase?"
✅ "How do I query nested relations with Supabase select()?"

❌ "Tell me about React Query"
✅ "What's the syntax for useQuery with TypeScript?"
```

### Combining with Code
```
1. Read local code first
2. Identify specific API/pattern needed
3. Query Context7 for that specific thing
4. Apply to local code
```

### Avoiding Overuse
```
Don't query for:
- Things in the spec (read docs/poc-specification.md)
- Things in CLAUDE.md (read it directly)
- Basic JavaScript/TypeScript (use your knowledge)
```

## Documentation URLs (Reference)

For manual lookup if needed:

- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/docs/
- Vite: https://vite.dev/
- Supabase: https://supabase.com/docs
- Anthropic: https://docs.anthropic.com/
- shadcn/ui: https://ui.shadcn.com/
- Tailwind: https://tailwindcss.com/docs
- TanStack Query: https://tanstack.com/query/latest
- React Hook Form: https://react-hook-form.com/
- Zod: https://zod.dev/
- React Router: https://reactrouter.com/

## Success Criteria

Context7 is properly configured when:
- ✅ Can query all 12 documentation sources
- ✅ Returns accurate, version-appropriate info
- ✅ Subagents can reference it in their work
- ✅ Reduces need for external documentation lookups
- ✅ Speeds up development workflow

## Remember

- Context7 is for **reference**, not learning
- Always verify suggestions against package versions
- Combine Context7 with local code reading
- Don't over-rely on it - use your knowledge first
