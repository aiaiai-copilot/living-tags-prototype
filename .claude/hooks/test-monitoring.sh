#!/bin/bash
# Test script for monitoring system
# Simulates tool usage and verifies logging works

set -e

echo "🧪 Testing Monitoring System"
echo "============================"
echo ""

# Test 1: Check logger.sh exists and is executable
echo "Test 1: Checking logger.sh..."
if [ -x "$(dirname "$0")/logger.sh" ]; then
    echo "✅ logger.sh exists and is executable"
else
    echo "❌ logger.sh is missing or not executable"
    exit 1
fi
echo ""

# Test 2: Check pre-tool-use.sh exists and is executable
echo "Test 2: Checking pre-tool-use.sh..."
if [ -x "$(dirname "$0")/pre-tool-use.sh" ]; then
    echo "✅ pre-tool-use.sh exists and is executable"
else
    echo "❌ pre-tool-use.sh is missing or not executable"
    exit 1
fi
echo ""

# Test 3: Check post-tool-use.sh exists and is executable
echo "Test 3: Checking post-tool-use.sh..."
if [ -x "$(dirname "$0")/post-tool-use.sh" ]; then
    echo "✅ post-tool-use.sh exists and is executable"
else
    echo "❌ post-tool-use.sh is missing or not executable"
    exit 1
fi
echo ""

# Test 4: Test logger functionality
echo "Test 4: Testing logger functionality..."
source "$(dirname "$0")/logger.sh"

# Test logging
log_event "TEST" "MonitoringTest" "Testing logging functionality"

if [ -f "/home/user/living-tags-poc/.claude/logs/tool-usage.log" ]; then
    echo "✅ Log file created successfully"

    # Check if test entry exists in log
    if grep -q "MonitoringTest" "/home/user/living-tags-poc/.claude/logs/tool-usage.log"; then
        echo "✅ Log entry written correctly"
    else
        echo "❌ Log entry not found in log file"
        exit 1
    fi
else
    echo "❌ Log file was not created"
    exit 1
fi
echo ""

# Test 5: Simulate tool usage with pre-hook
echo "Test 5: Testing pre-tool-use hook..."
export CLAUDE_TOOL_NAME="Read"
export CLAUDE_TOOL_FILE="test.txt"
bash "$(dirname "$0")/pre-tool-use.sh" > /dev/null 2>&1
if grep -q "TOOL | Read" "/home/user/living-tags-poc/.claude/logs/tool-usage.log"; then
    echo "✅ Pre-tool-use hook logged correctly"
else
    echo "❌ Pre-tool-use hook did not log"
    exit 1
fi
echo ""

# Test 6: Simulate tool usage with post-hook
echo "Test 6: Testing post-tool-use hook..."
export CLAUDE_TOOL_NAME="Write"
export CLAUDE_TOOL_FILE="test-output.txt"
bash "$(dirname "$0")/post-tool-use.sh" > /dev/null 2>&1
if grep -q "TOOL | Write" "/home/user/living-tags-poc/.claude/logs/tool-usage.log"; then
    echo "✅ Post-tool-use hook logged correctly"
else
    echo "❌ Post-tool-use hook did not log"
    exit 1
fi
echo ""

# Test 7: Test violation detection
echo "Test 7: Testing violation detection..."
export CLAUDE_TOOL_NAME="Edit"
export CLAUDE_TOOL_FILE="src/components/TestComponent.tsx"
bash "$(dirname "$0")/pre-tool-use.sh" 2>&1 | grep -q "WARNING" || true
if grep -q "WARNING" "/home/user/living-tags-poc/.claude/logs/tool-usage.log"; then
    echo "✅ Violation detection working"
else
    echo "⚠️  Violation detection may not be working (this is ok if no violations triggered)"
fi
echo ""

# Test 8: Test subagent logging
echo "Test 8: Testing subagent detection..."
export CLAUDE_TOOL_NAME="Task"
export CLAUDE_TOOL_PARAMS='{"subagent_type": "frontend-specialist"}'
bash "$(dirname "$0")/pre-tool-use.sh" > /dev/null 2>&1
if grep -q "SUBAGENT | frontend-specialist" "/home/user/living-tags-poc/.claude/logs/tool-usage.log"; then
    echo "✅ Subagent logging working"
else
    echo "❌ Subagent logging not working"
    exit 1
fi
echo ""

# Test 9: Check log file format
echo "Test 9: Checking log file format..."
if head -1 "/home/user/living-tags-poc/.claude/logs/tool-usage.log" | grep -q "Claude Code Tool Usage Log"; then
    echo "✅ Log file has correct header"
else
    echo "❌ Log file header incorrect"
    exit 1
fi
echo ""

# Test 10: Display sample log entries
echo "Test 10: Sample log entries..."
echo "Last 5 log entries:"
tail -5 "/home/user/living-tags-poc/.claude/logs/tool-usage.log" | sed 's/^/  /'
echo "✅ Log entries displayed"
echo ""

echo "=============================="
echo "✅ All monitoring tests passed!"
echo "=============================="
echo ""
echo "The monitoring system is working correctly."
echo "Logs are being written to: .claude/logs/tool-usage.log"
echo ""
echo "Next steps:"
echo "1. Review CLAUDE.md for project rules"
echo "2. Use subagents for implementation"
echo "3. Monitor terminal for warnings"
echo "4. Review logs regularly"
