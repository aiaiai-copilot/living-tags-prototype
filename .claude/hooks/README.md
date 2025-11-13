# Monitoring Hooks System

## Purpose

**CRITICAL:** This monitoring system ensures Claude Code follows the project rules defined in CLAUDE.md. It tracks all tool usage, subagent calls, skills, and MCP queries.

**Why this exists:** In previous projects, Claude Code ignored the configuration rules. This monitoring system makes violations visible in real-time and creates an audit trail.

## What Gets Monitored

### 1. Tool Usage
Every tool call is logged:
- ✅ **Read** - File reads
- ✅ **Write** - File creation
- ✅ **Edit** - File modifications
- ✅ **Bash** - Shell commands
- ✅ **Glob** - File searches
- ✅ **Grep** - Content searches
- ✅ **Task** - Subagent invocations

### 2. Subagent Calls
When Task tool is used with a subagent:
- ✅ **frontend-specialist** - React/UI work
- ✅ **claude-integration-specialist** - AI integration
- ✅ **database-specialist** - Database work

### 3. Skills Usage
When skills are executed:
- ✅ **project-setup** - Initial setup
- ✅ **db-reset** - Database reset

### 4. MCP Queries
When Context7 or other MCPs are used:
- ✅ Documentation lookups
- ✅ API reference queries

### 5. Rule Violations
When CLAUDE.md rules are broken:
- ⚠️ **Direct code editing** without subagent
- ⚠️ **Incorrect tool usage**
- ⚠️ **Missing required steps**

## How It Works

### Hook Execution Flow

```
┌─────────────────┐
│ Claude wants to │
│ use a tool      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ pre-tool-use.sh │  ← Logs intent, checks for violations
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Tool executes   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│post-tool-use.sh │  ← Logs result, tracks completion
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Log file +      │
│ Terminal output │
└─────────────────┘
```

### Files

1. **logger.sh** - Core logging utility
   - Writes to `.claude/logs/tool-usage.log`
   - Outputs colored messages to terminal
   - Provides log_event() function

2. **pre-tool-use.sh** - Before tool execution
   - Logs tool intent
   - Checks for CLAUDE.md violations
   - Warns about incorrect patterns
   - Celebrates correct subagent usage

3. **post-tool-use.sh** - After tool execution
   - Logs success/failure
   - Tracks file modifications
   - Provides completion feedback

## Log Output

### Terminal Output (Color-Coded)

```bash
[TOOL] Read - Reading: /path/to/file.tsx
[SUBAGENT] frontend-specialist - Invoking subagent
✅ SUBAGENT Using frontend-specialist (following CLAUDE.md rules)
[TOOL] Write - Created: /path/to/component.tsx
⚠️  REMINDER Consider using frontend-specialist for React components
```

### Log File Format

```
[2025-11-11 18:30:15] TOOL | Read | Reading: src/components/TextCard.tsx
[2025-11-11 18:30:20] SUBAGENT | frontend-specialist | Invoking subagent
[2025-11-11 18:30:45] TOOL | Write | Created: src/components/TextCard.tsx
[2025-11-11 18:31:00] WARNING | Direct Edit | Should use subagent
```

## Violation Detection

### Detected Violations

The system warns when:

1. **Editing React code directly** (should use frontend-specialist)
   ```
   ⚠️  Editing /src/components/TextCard.tsx
   Consider using frontend-specialist subagent
   ```

2. **Editing Claude API code directly** (should use claude-integration-specialist)
   ```
   ⚠️  Editing /src/lib/claude.ts
   Consider using claude-integration-specialist subagent
   ```

3. **Editing database code directly** (should use database-specialist)
   ```
   ⚠️  Editing /supabase/migrations/001_schema.sql
   Consider using database-specialist subagent
   ```

### Positive Reinforcement

The system celebrates when:

```
✅ SUBAGENT Using frontend-specialist (following CLAUDE.md rules)
🔧 SKILL Executing project-setup skill
📚 MCP Accessing documentation via Context7
```

## Log File Location

**Primary log:** `.claude/logs/tool-usage.log`

This file contains:
- Timestamp for every action
- Tool/subagent/skill/MCP usage
- Warnings and violations
- Complete audit trail

### Example Log Session

```
=== Claude Code Tool Usage Log ===
Project: living-tags-poc
Started: 2025-11-11 18:30:00
==============================

[2025-11-11 18:30:15] TOOL | Read | Reading: docs/poc-specification.md
[2025-11-11 18:30:20] SUBAGENT | database-specialist | Invoking subagent
[2025-11-11 18:30:45] TOOL | Write | Created: supabase/migrations/001_schema.sql
[2025-11-11 18:31:00] TOOL | Bash | Executing: npm install...
[2025-11-11 18:31:30] SKILL | project-setup | Running skill
[2025-11-11 18:32:00] MCP | context7 | Querying documentation
[2025-11-11 18:32:30] WARNING | Direct Edit | Editing React code without subagent
```

## Viewing Logs

### Real-time Monitoring (Terminal)
Hooks output to terminal automatically when tools are used.

### Review Full Log
```bash
cat .claude/logs/tool-usage.log
```

### Filter by Event Type
```bash
# Only warnings
grep "WARNING" .claude/logs/tool-usage.log

# Only subagent usage
grep "SUBAGENT" .claude/logs/tool-usage.log

# Only violations
grep -E "WARNING|VIOLATION" .claude/logs/tool-usage.log
```

### Tail Live Updates
```bash
tail -f .claude/logs/tool-usage.log
```

## Why This Matters

### Previous Problems
- Claude Code created subagents but never used them
- Rules in CLAUDE.md were ignored
- No visibility into what tools were being used
- No accountability for following patterns

### Current Solution
- **Visibility:** Every action is logged and visible
- **Warnings:** Violations are flagged immediately
- **Positive feedback:** Correct usage is celebrated
- **Audit trail:** Complete history in log file
- **Terminal output:** Can't be missed

## Customizing Monitoring

### Add New Violation Checks

Edit `pre-tool-use.sh` to add new rules:

```bash
# Check for inline styles
if [[ "$TOOL_NAME" == "Write" ]] && [[ "$TOOL_FILE" == *.tsx ]]; then
    if grep -q 'style={{' "$TOOL_FILE" 2>/dev/null; then
        log_event "VIOLATION" "Inline Styles" "Found style={{}} in $TOOL_FILE"
    fi
fi
```

### Add New Event Types

Edit `logger.sh` to add color coding:

```bash
case "$event_type" in
    "CUSTOM")
        color=$CUSTOM_COLOR
        ;;
esac
```

## Troubleshooting

### Hooks Not Executing
- Check hooks are executable: `ls -l .claude/hooks/*.sh`
- Make executable: `chmod +x .claude/hooks/*.sh`
- Verify Claude Code is configured to use hooks

### Log File Not Created
- Ensure `.claude/logs/` directory exists
- Check write permissions
- Logger will create file on first run

### No Terminal Output
- Check if hooks are being called
- Verify logger.sh is sourced correctly
- Check terminal supports ANSI colors

### False Positives
- Edit `pre-tool-use.sh` to adjust detection logic
- Add exceptions for specific file patterns
- Document why exception is needed

## Best Practices

### Do's
- ✅ Review log file regularly
- ✅ Pay attention to warnings
- ✅ Use subagents when prompted
- ✅ Celebrate when rules are followed correctly

### Don'ts
- ❌ Ignore warnings
- ❌ Disable monitoring to "speed up" work
- ❌ Edit hooks to hide violations
- ❌ Clear log file to hide mistakes

## Success Metrics

Monitoring is successful when:
- ✅ All tool usage is logged
- ✅ Violations are caught and flagged
- ✅ Subagent usage is encouraged
- ✅ Log file provides complete audit trail
- ✅ Terminal output guides correct behavior

## Remember

**The monitoring system exists to help, not hinder.**

It ensures:
- Code quality (using right tools)
- Pattern consistency (following CLAUDE.md)
- Accountability (audit trail)
- Learning (understanding what works)

**Don't fight the monitoring - use it to build better!**
