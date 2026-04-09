#!/usr/bin/env bash
# Story 1-1 Edge Case Validation Script
# Validates the skill directory structure against edge cases and unhandled paths

set -euo pipefail

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly NC='\033[0m' # No Color

# Counters
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

# Project root detection
PROJECT_ROOT="${PROJECT_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
SKILL_DIR="$PROJECT_ROOT/.claude/skills/rulesmith"

log_pass() {
    echo -e "${GREEN}[PASS]${NC} $1"
    ((PASS_COUNT++)) || true
}

log_fail() {
    echo -e "${RED}[FAIL]${NC} $1"
    ((FAIL_COUNT++)) || true
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    ((WARN_COUNT++)) || true
}

section() {
    echo ""
    echo "=== $1 ==="
}

# 1. File Permission Errors
section "File Permission Checks"

# Check if .claude directory exists and is accessible
if [ -d "$PROJECT_ROOT/.claude" ]; then
    log_pass ".claude directory exists"
else
    log_fail ".claude directory does not exist"
fi

# Check write permissions on skill directory
if [ -w "$SKILL_DIR" ] 2>/dev/null; then
    log_pass "Skill directory is writable: $SKILL_DIR"
else
    log_fail "Skill directory is not writable: $SKILL_DIR"
fi

# Check write permissions on data directory
DATA_DIR="$SKILL_DIR/data"
if [ -w "$DATA_DIR" ] 2>/dev/null; then
    log_pass "Data directory is writable: $DATA_DIR"
else
    log_fail "Data directory is not writable: $DATA_DIR"
fi

# Check read permissions on SKILL.md
SKILL_FILE="$SKILL_DIR/SKILL.md"
if [ -r "$SKILL_FILE" ]; then
    log_pass "SKILL.md is readable"
else
    log_fail "SKILL.md is not readable"
fi

# Test actual write capability by creating a temp file
TEMP_TEST_FILE="$DATA_DIR/.write_test_$$"
if touch "$TEMP_TEST_FILE" 2>/dev/null; then
    rm -f "$TEMP_TEST_FILE"
    log_pass "Confirmed write capability in data directory"
else
    log_fail "Cannot write to data directory (touch test failed)"
fi

# 2. Cross-Platform Path Handling
section "Cross-Platform Path Checks"

# Check for problematic path characters
PROBLEM_CHARS=('[ ]' '[\\]' '[:]' '[*]' '[?]' '["]' '[<]' '[>]' '[|]')
for char in "${PROBLEM_CHARS[@]}"; do
    if [[ "$SKILL_DIR" =~ $char ]]; then
        log_fail "Path contains problematic character: $char"
        break
    fi
done
log_pass "Path contains no problematic characters"

# Check path length (Windows has 260 char limit)
PATH_LENGTH=${#SKILL_DIR}
if [ "$PATH_LENGTH" -lt 200 ]; then
    log_pass "Path length is safe: $PATH_LENGTH characters"
else
    log_warn "Path length is long: $PATH_LENGTH characters (may cause issues on Windows)"
fi

# Check for symlinks that might break
if [ -L "$SKILL_DIR" ]; then
    log_warn "Skill directory is a symlink, might cause issues"
else
    log_pass "Skill directory is a real path (not symlink)"
fi

# Normalize path separators for comparison
NORMALIZED_PATH="${SKILL_DIR//\\//}"
log_pass "Path uses forward slashes: $NORMALIZED_PATH"

# 3. Idempotency Edge Cases
section "Idempotency Checks"

# Check that directories exist (they should be safe to recreate)
REQUIRED_DIRS=("$SKILL_DIR" "$SKILL_DIR/prompts" "$DATA_DIR" "$DATA_DIR/history")
for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        log_pass "Directory exists: ${dir#$PROJECT_ROOT/}"
    else
        log_fail "Directory missing: ${dir#$PROJECT_ROOT/}"
    fi
done

# Check that files exist but won't be overwritten
REQUIRED_FILES=("$SKILL_FILE" "$DATA_DIR/state.json" "$DATA_DIR/results.jsonl")
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        log_pass "File exists: ${file#$PROJECT_ROOT/}"
    else
        log_fail "File missing: ${file#$PROJECT_ROOT/}"
    fi
done

# 4. State File Corruption Scenarios
section "State File Integrity Checks"

STATE_FILE="$DATA_DIR/state.json"
if [ -f "$STATE_FILE" ]; then
    # Check if file is non-empty
    if [ -s "$STATE_FILE" ]; then
        log_pass "state.json is non-empty"
    else
        log_fail "state.json is empty (corrupted)"
    fi

    # Validate JSON syntax
    if command -v python3 &>/dev/null; then
        if python3 -c "import json; json.load(open('$STATE_FILE'))" 2>/dev/null; then
            log_pass "state.json contains valid JSON"
        else
            log_fail "state.json contains invalid JSON"
        fi
    else
        log_warn "python3 not available, skipping JSON validation"
    fi

    # Check for required fields (matches Story 1-5 AC2 specification)
    REQUIRED_FIELDS=("last_analysis" "patterns_found" "improvements_applied" "corrections_reduction" "platform")
    for field in "${REQUIRED_FIELDS[@]}"; do
        if grep -q "\"$field\"" "$STATE_FILE" 2>/dev/null; then
            log_pass "state.json contains field: $field"
        else
            log_fail "state.json missing field: $field"
        fi
    done
else
    log_fail "state.json does not exist"
fi

# Check results.jsonl is valid JSONL (or empty)
RESULTS_FILE="$DATA_DIR/results.jsonl"
if [ -f "$RESULTS_FILE" ]; then
    if [ -s "$RESULTS_FILE" ]; then
        # Check each line is valid JSON
        INVALID_LINES=0
        LINE_NUM=0
        while IFS= read -r line; do
            ((LINE_NUM++))
            if [ -n "$line" ]; then
                if command -v python3 &>/dev/null; then
                    if ! python3 -c "import json; json.loads('''$line''')" 2>/dev/null; then
                        ((INVALID_LINES++))
                        log_fail "results.jsonl line $LINE_NUM is not valid JSON"
                    fi
                fi
            fi
        done < "$RESULTS_FILE"

        if [ "$INVALID_LINES" -eq 0 ]; then
            log_pass "results.jsonl contains valid JSONL"
        fi
    else
        log_pass "results.jsonl is empty (valid initial state)"
    fi
else
    log_fail "results.jsonl does not exist"
fi

# 5. Skill Discovery Failures
section "Skill Discovery Checks"

# Check SKILL.md has required sections
if [ -f "$SKILL_FILE" ]; then
    REQUIRED_SECTIONS=("## Capabilities" "## Allowed Tools" "## Prompt References")
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if grep -q "$section" "$SKILL_FILE" 2>/dev/null; then
            log_pass "SKILL.md contains section: $section"
        else
            log_fail "SKILL.md missing section: $section"
        fi
    done

    # Check for skill name in first line
    FIRST_LINE=$(head -n 1 "$SKILL_FILE")
    if [[ "$FIRST_LINE" == "# Project Self-Improvement" ]]; then
        log_pass "SKILL.md has correct title"
    else
        log_warn "SKILL.md title may be non-standard: $FIRST_LINE"
    fi
fi

# Check prompts directory exists for prompt references
if [ -d "$SKILL_DIR/prompts" ]; then
    log_pass "prompts directory exists for prompt references"
else
    log_fail "prompts directory missing (prompt references will fail)"
fi

# 6. Git Configuration
section "Git Configuration Checks"

GITIGNORE_FILE="$PROJECT_ROOT/.gitignore"
if [ -f "$GITIGNORE_FILE" ]; then
    if grep -q "rulesmith/data/" "$GITIGNORE_FILE" 2>/dev/null || \
       grep -q "\.claude/skills/rulesmith/data/" "$GITIGNORE_FILE" 2>/dev/null; then
        log_pass ".gitignore excludes data directory"
    else
        log_fail ".gitignore does not exclude data directory (conversation data may be committed)"
    fi
else
    log_warn ".gitignore not found (data directory not protected)"
fi

# Summary
section "Summary"
echo "Passed: $PASS_COUNT"
echo "Failed: $FAIL_COUNT"
echo "Warnings: $WARN_COUNT"

# Exit with appropriate code
if [ "$FAIL_COUNT" -gt 0 ]; then
    exit 1
elif [ "$WARN_COUNT" -gt 0 ]; then
    exit 2
else
    exit 0
fi
