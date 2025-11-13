#!/bin/bash
# Logging utility for Claude Code monitoring
# Logs to both terminal and persistent log file

LOG_FILE="/home/user/living-tags-poc/.claude/logs/tool-usage.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Initialize log file if it doesn't exist
if [ ! -f "$LOG_FILE" ]; then
    echo "=== Claude Code Tool Usage Log ===" > "$LOG_FILE"
    echo "Project: living-tags-poc" >> "$LOG_FILE"
    echo "Started: $TIMESTAMP" >> "$LOG_FILE"
    echo "==============================" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
fi

# Function to log to file
log_to_file() {
    local message="$1"
    echo "[$TIMESTAMP] $message" >> "$LOG_FILE"
}

# Function to log to terminal with color
log_to_terminal() {
    local color="$1"
    local prefix="$2"
    local message="$3"
    echo -e "${color}[${prefix}]${NC} $message"
}

# Main logging function
log_event() {
    local event_type="$1"
    local tool_name="$2"
    local details="$3"

    # Determine color based on event type
    case "$event_type" in
        "TOOL")
            color=$BLUE
            ;;
        "SUBAGENT")
            color=$MAGENTA
            ;;
        "SKILL")
            color=$GREEN
            ;;
        "MCP")
            color=$CYAN
            ;;
        "VIOLATION")
            color=$RED
            ;;
        "WARNING")
            color=$YELLOW
            ;;
        *)
            color=$NC
            ;;
    esac

    # Log to file
    log_to_file "$event_type | $tool_name | $details"

    # Log to terminal
    log_to_terminal "$color" "$event_type" "$tool_name - $details"
}

# Export functions for use in hooks
export -f log_to_file
export -f log_to_terminal
export -f log_event

# If called directly with arguments, execute log_event
if [ $# -ge 3 ]; then
    log_event "$1" "$2" "$3"
fi
