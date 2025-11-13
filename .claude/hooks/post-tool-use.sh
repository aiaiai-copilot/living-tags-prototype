#!/bin/bash
# Post-tool-use hook for Claude Code
# Called AFTER a tool is executed
# Logs the result and tracks completion

# Source the logger
source "$(dirname "$0")/logger.sh"

# Get tool information
TOOL_NAME="${CLAUDE_TOOL_NAME:-unknown}"
TOOL_RESULT="${CLAUDE_TOOL_RESULT:-}"
TOOL_ERROR="${CLAUDE_TOOL_ERROR:-}"
TOOL_FILE="${CLAUDE_TOOL_FILE:-}"

# Check if tool execution was successful
if [[ -n "$TOOL_ERROR" ]]; then
    log_event "TOOL" "$TOOL_NAME" "Failed with error: $TOOL_ERROR"
    log_to_terminal "$RED" "❌ ERROR" "$TOOL_NAME failed: $TOOL_ERROR"
else
    log_event "TOOL" "$TOOL_NAME" "Completed successfully"

    # Provide positive feedback for good practices
    if [[ "$TOOL_NAME" == "Task" ]]; then
        log_to_terminal "$GREEN" "✅ GOOD" "Subagent usage completed"
    fi

    if [[ "$TOOL_NAME" == "Skill" ]]; then
        log_to_terminal "$GREEN" "✅ GOOD" "Skill execution completed"
    fi
fi

# Track file modifications
if [[ "$TOOL_NAME" == "Write" ]]; then
    log_event "TOOL" "Write" "Created/Modified: $TOOL_FILE"
    log_to_terminal "$BLUE" "📝 FILE" "Written: $TOOL_FILE"
fi

if [[ "$TOOL_NAME" == "Edit" ]]; then
    log_event "TOOL" "Edit" "Modified: $TOOL_FILE"
    log_to_terminal "$BLUE" "✏️  FILE" "Edited: $TOOL_FILE"
fi

# Print separator
echo ""
