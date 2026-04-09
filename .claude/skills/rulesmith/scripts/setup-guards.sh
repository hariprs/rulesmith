#!/usr/bin/env bash
# Story 1-1 Edge Case Guards
# These guards can be sourced into other scripts or run standalone

# Guard 1: File Permission Errors
# Ensures we have write access before attempting operations
guard_write_permissions() {
    local dir="$1"
    local context="${2:-directory}"

    if [ ! -d "$dir" ]; then
        echo "ERROR: $context does not exist: $dir" >&2
        return 1
    fi

    if [ ! -w "$dir" ]; then
        echo "ERROR: No write permission for $context: $dir" >&2
        echo "SUGGESTION: Check directory permissions with 'ls -ld \"$dir\"'" >&2
        return 1
    fi

    # Test actual write capability (POSIX compliant)
    local test_file="$dir/.write_guard_test_$$"
    if touch "$test_file" 2>/dev/null; then
        rm -f "$test_file"
        return 0
    else
        echo "ERROR: Cannot write to $context (touch test failed): $dir" >&2
        return 1
    fi
}

# Guard 2: Cross-Platform Path Handling
# Normalizes paths and checks for problematic characters
guard_path_safe() {
    local path="$1"
    local path_name="${2:-path}"

    # Check for characters problematic on various platforms
    local problematic='[\\:*?"<>|]'  # Windows illegal chars
    if [[ "$path" =~ $problematic ]]; then
        echo "ERROR: $path_name contains problematic characters: $path" >&2
        return 1
    fi

    # Warn about spaces (can cause issues in scripts)
    if [[ "$path" =~ [[:space:]] ]]; then
        echo "WARNING: $path_name contains spaces (may cause issues): $path" >&2
    fi

    # Check path length (Windows has 260 char limit, leave buffer)
    local path_len=${#path}
    if [ "$path_len" -gt 240 ]; then
        echo "ERROR: $path_name too long ($path_len chars, max 240): $path" >&2
        return 1
    fi

    return 0
}

# Guard 3: Idempotency Protection
# Ensures operations are safe to run multiple times
guard_mkdir_idempotent() {
    local dir="$1"

    if [ -d "$dir" ]; then
        # Directory exists, verify it's actually a directory
        if [ -L "$dir" ]; then
            echo "WARNING: Target is a symlink, not a directory: $dir" >&2
        fi
        return 0  # Idempotent: no-op if exists
    fi

    # Create with -p to handle parent directories
    if mkdir -p "$dir" 2>/dev/null; then
        return 0
    else
        echo "ERROR: Failed to create directory: $dir" >&2
        return 1
    fi
}

# Guard 4: State File Validation
# Validates JSON structure before operations
guard_validate_state_json() {
    local state_file="$1"

    if [ ! -f "$state_file" ]; then
        echo "ERROR: State file does not exist: $state_file" >&2
        return 1
    fi

    if [ ! -s "$state_file" ]; then
        echo "ERROR: State file is empty: $state_file" >&2
        return 1
    fi

    # Validate JSON if python3 is available
    if command -v python3 &>/dev/null; then
        if ! python3 -c "import json; json.load(open('$state_file'))" 2>/dev/null; then
            echo "ERROR: State file contains invalid JSON: $state_file" >&2
            return 1
        fi
    fi

    return 0
}

# Guard 4b: State File Corruption Recovery
# Creates backup and attempts recovery if state.json is corrupted
guard_state_file_recovery() {
    local state_file="$1"
    local backup_dir="$2"  # Should be data/history/

    if guard_validate_state_json "$state_file"; then
        return 0  # File is valid, no recovery needed
    fi

    # File is corrupted, attempt recovery
    echo "WARNING: State file corrupted, attempting recovery..." >&2

    if [ ! -d "$backup_dir" ]; then
        mkdir -p "$backup_dir" || {
            echo "ERROR: Cannot create backup directory for recovery" >&2
            return 1
        }
    fi

    # Backup the corrupted file
    local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
    local backup_file="$backup_dir/corrupted_state_$timestamp.json"

    if [ -f "$state_file" ]; then
        cp "$state_file" "$backup_file" 2>/dev/null || {
            echo "ERROR: Failed to backup corrupted state file" >&2
            return 1
        }
        echo "INFO: Backed up corrupted state to: $backup_file" >&2
    fi

    # Restore to initial empty state (matches Story 1-5 AC2 specification)
    cat > "$state_file" <<'EOF'
{
  "last_analysis": "",
  "patterns_found": [],
  "improvements_applied": 0,
  "corrections_reduction": 0,
  "platform": "unknown",
  "_schema_note": "results.jsonl is append-only, one JSON object per line",
  "_recovered": true,
  "_recovery_date": "$timestamp"
}
EOF

    echo "INFO: State file recovered to initial state" >&2
    return 0
}

# Guard 5: Skill Discovery Validation
# Verifies SKILL.md is complete and discoverable
guard_skill_discoverable() {
    local skill_file="$1"

    if [ ! -f "$skill_file" ]; then
        echo "ERROR: SKILL.md not found: $skill_file" >&2
        return 1
    fi

    # Check for required sections
    local required_sections=("Capabilities" "Allowed Tools" "Prompt References")
    local missing_sections=()

    for section in "${required_sections[@]}"; do
        if ! grep -q "## $section" "$skill_file" 2>/dev/null; then
            missing_sections+=("$section")
        fi
    done

    if [ ${#missing_sections[@]} -gt 0 ]; then
        echo "ERROR: SKILL.md missing required sections: ${missing_sections[*]}" >&2
        return 1
    fi

    return 0
}

# Guard 6: Disk Space Check
# Ensures sufficient space before operations
guard_disk_space() {
    local dir="$1"
    local required_mb="${2:-1}"  # Default 1MB minimum

    # Get available space in MB (works on macOS and Linux)
    local available_mb
    if command -v df &>/dev/null; then
        # Get available blocks in 512-byte units, convert to MB
        available_mb=$(df -P "$dir" 2>/dev/null | awk 'NR==2 {printf "%.0f", $4/2048}')
    else
        echo "WARNING: Cannot check disk space (df not available)" >&2
        return 0  # Allow proceeding if we can't check
    fi

    if [ "$available_mb" -lt "$required_mb" ]; then
        echo "ERROR: Insufficient disk space ($available_mb MB available, $required_mb MB required)" >&2
        return 1
    fi

    return 0
}

# Guard 7: Safe File Write with Backup
# Writes to temp file first, then atomic move
guard_safe_write() {
    local content="$1"
    local target_file="$2"
    local backup_dir="${3:-}"

    local target_dir
    target_dir=$(dirname "$target_file")

    # Ensure target directory exists
    if [ ! -d "$target_dir" ]; then
        mkdir -p "$target_dir" || {
            echo "ERROR: Cannot create target directory: $target_dir" >&2
            return 1
        }
    fi

    # Create temp file
    local temp_file="$target_dir/.tmp_write_${$}_$(basename "$target_file")"

    # Write to temp file
    if ! printf '%s' "$content" > "$temp_file" 2>/dev/null; then
        echo "ERROR: Failed to write to temp file: $temp_file" >&2
        rm -f "$temp_file"
        return 1
    fi

    # Backup existing file if requested and file exists
    if [ -n "$backup_dir" ] && [ -f "$target_file" ]; then
        mkdir -p "$backup_dir" 2>/dev/null
        local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
        local backup_file="$backup_dir/$(basename "$target_file")_$timestamp"
        cp "$target_file" "$backup_file" 2>/dev/null || {
            echo "WARNING: Failed to backup existing file" >&2
        }
    fi

    # Atomic move (POSIX compliant)
    if mv "$temp_file" "$target_file" 2>/dev/null; then
        return 0
    else
        echo "ERROR: Failed to move temp file to target: $target_file" >&2
        rm -f "$temp_file"
        return 1
    fi
}

# Main validation function - runs all guards
run_all_guards() {
    local project_root="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)}"
    local skill_dir="$project_root/.claude/skills/rulesmith"

    local failed=0

    echo "Running Story 1-1 edge case guards..."

    # Guard 1: Permissions
    if ! guard_write_permissions "$skill_dir" "skill directory"; then
        ((failed++))
    fi

    # Guard 2: Path safety
    if ! guard_path_safe "$skill_dir" "skill directory"; then
        ((failed++))
    fi

    # Guard 4: State validation
    if ! guard_validate_state_json "$skill_dir/data/state.json"; then
        ((failed++))
    fi

    # Guard 5: Skill discovery
    if ! guard_skill_discoverable "$skill_dir/SKILL.md"; then
        ((failed++))
    fi

    # Guard 6: Disk space
    if ! guard_disk_space "$skill_dir" 1; then
        ((failed++))
    fi

    if [ "$failed" -eq 0 ]; then
        echo "All guards passed."
        return 0
    else
        echo "$failed guard(s) failed."
        return 1
    fi
}

# Export functions for use in other scripts
export -f guard_write_permissions
export -f guard_path_safe
export -f guard_mkdir_idempotent
export -f guard_validate_state_json
export -f guard_state_file_recovery
export -f guard_skill_discoverable
export -f guard_disk_space
export -f guard_safe_write
export -f run_all_guards
