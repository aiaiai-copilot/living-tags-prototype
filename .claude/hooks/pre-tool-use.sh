#!/bin/bash
# Pre-tool-use hook for Claude Code
# Called BEFORE a tool is executed
# Logs the tool usage and checks for violations

# Source the logger
source "$(dirname "$0")/logger.sh"

# Get tool information from environment variables
# These would be set by Claude Code when calling hooks
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
TOOL_PARAMS="${CLAUDE_TOOL_PARAMS:-}"
TOOL_FILE="${CLAUDE_TOOL_FILE:-}"

# Log the tool usage
log_event "TOOL" "$TOOL_NAME" "Starting execution"

# Check for potential violations based on CLAUDE.md rules

# Violation: Using Edit/Write on React components without subagent
if [[ "$TOOL_NAME" == "Edit" ]] || [[ "$TOOL_NAME" == "Write" ]]; then
    if [[ "$TOOL_FILE" == *"/components/"* ]] || [[ "$TOOL_FILE" == *"/hooks/"* ]] || [[ "$TOOL_FILE" == *.tsx ]] || [[ "$TOOL_FILE" == *.jsx ]]; then
        log_event "WARNING" "Direct Edit" "Editing React code directly. Should use frontend-specialist subagent!"
        log_to_terminal "$YELLOW" "⚠️  REMINDER" "Consider using frontend-specialist subagent for React components"
    fi

    if [[ "$TOOL_FILE" == *"/lib/claude"* ]]; then
        log_event "WARNING" "Direct Edit" "Editing Claude API code directly. Should use claude-integration-specialist subagent!"
        log_to_terminal "$YELLOW" "⚠️  REMINDER" "Consider using claude-integration-specialist subagent for Claude API code"
    fi

    if [[ "$TOOL_FILE" == *"supabase/migrations"* ]] || [[ "$TOOL_FILE" == *"/lib/supabase"* ]]; then
        log_event "WARNING" "Direct Edit" "Editing database code directly. Should use database-specialist subagent!"
        log_to_terminal "$YELLOW" "⚠️  REMINDER" "Consider using database-specialist subagent for database code"
    fi
fi

# Check for Task tool (subagent usage)
if [[ "$TOOL_NAME" == "Task" ]]; then
    # Try multiple JSON parsing patterns
    SUBAGENT_TYPE=$(echo "$TOOL_PARAMS" | grep -o '"subagent_type"[[:space:]]*:[[:space:]]*"[^"]*"' | cut -d'"' -f4)
    if [[ -z "$SUBAGENT_TYPE" ]]; then
        # Try alternative format without quotes
        SUBAGENT_TYPE=$(echo "$TOOL_PARAMS" | grep -o 'subagent_type[[:space:]]*:[[:space:]]*[^,}]*' | sed 's/.*:[[:space:]]*//' | tr -d '"' | tr -d ' ')
    fi
    if [[ -n "$SUBAGENT_TYPE" ]]; then
        log_event "SUBAGENT" "$SUBAGENT_TYPE" "Invoking subagent"
        log_to_terminal "$GREEN" "✅ SUBAGENT" "Using $SUBAGENT_TYPE (following CLAUDE.md rules)"
    fi
fi

# Check for Skill usage
if [[ "$TOOL_NAME" == "Skill" ]]; then
    SKILL_NAME=$(echo "$TOOL_PARAMS" | grep -o 'command: [^,}]*' | cut -d' ' -f2 | tr -d '"')
    if [[ -n "$SKILL_NAME" ]]; then
        log_event "SKILL" "$SKILL_NAME" "Running skill"
        log_to_terminal "$GREEN" "🔧 SKILL" "Executing $SKILL_NAME skill"
    fi
fi

# Check for MCP usage (Context7)
if [[ "$TOOL_NAME" == "mcp__"* ]]; then
    log_event "MCP" "$TOOL_NAME" "Querying documentation"
    log_to_terminal "$CYAN" "📚 MCP" "Accessing documentation via $TOOL_NAME"
fi

# Log file operations
if [[ "$TOOL_NAME" == "Read" ]]; then
    log_event "TOOL" "Read" "Reading: $TOOL_FILE"
fi

if [[ "$TOOL_NAME" == "Bash" ]]; then
    COMMAND=$(echo "$TOOL_PARAMS" | grep -o 'command: [^,}]*' | cut -d':' -f2- | head -c 50)
    log_event "TOOL" "Bash" "Executing: $COMMAND..."
fi

# Print separator for readability
echo ""
