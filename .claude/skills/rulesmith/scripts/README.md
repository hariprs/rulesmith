# Edge Case Guards - Story 1-1

This directory contains guard modules that protect against edge cases identified during the Story 1-1 implementation review.

## Files

| File | Language | Purpose |
|------|----------|---------|
| `setup-guards.sh` | Bash | Guard functions for shell scripts |
| `setup-guards.py` | Python | Guard classes and functions for Python code |
| `validate-setup.sh` | Bash | Standalone validation script |
| `EDGE-CASE-REVIEW.md` | Markdown | Detailed edge case documentation |
| `README.md` | Markdown | This file |

## Guards

### 1. File Permission Errors
```bash
guard_write_permissions "$path" "context"
```
```python
guard_write_permissions(Path(path), "context")
```
Verifies write access before attempting operations.

### 2. Cross-Platform Path Handling
```bash
guard_path_safe "$path" "name"
```
```python
guard_path_safe(Path(path), "name")
```
Checks for problematic characters and path length issues.

### 3. Idempotency Protection
```bash
guard_mkdir_idempotent "$path"
```
```python
guard_mkdir_idempotent(Path(path))
```
Creates directories safely - no-op if exists.

### 4. State File Validation
```bash
guard_validate_state_json "$state_file"
```
```python
data = guard_validate_state_json(Path(state_file))
```
Validates JSON structure and required fields.

### 5. State File Recovery
```bash
guard_state_file_recovery "$state_file" "$backup_dir"
```
```python
data = guard_state_file_recovery(Path(state_file), Path(backup_dir))
```
Recovers corrupted state files with backup.

### 6. Skill Discovery
```bash
guard_skill_discoverable "$skill_file"
```
```python
guard_skill_discoverable(Path(skill_file))
```
Verifies SKILL.md is complete.

### 7. Disk Space
```bash
guard_disk_space "$path" 1  # Require 1MB
```
```python
guard_disk_space(Path(path), 1)  # Require 1MB
```
Ensures sufficient disk space.

### 8. Safe File Write (Python only)
```python
guard_safe_write(content, target_file, backup_dir)
```
Writes atomically with optional backup.

## Usage

### Running validation
```bash
# Bash version
./validate-setup.sh

# Python version
python3 setup-guards.py
```

### Sourcing into scripts
```bash
#!/usr/bin/env bash
source .claude/skills/rulesmith/scripts/setup-guards.sh

guard_write_permissions "$SKILL_DIR" "skill directory"
```

### Importing in Python
```python
#!/usr/bin/env python3
import sys
sys.path.insert(0, '.claude/skills/rulesmith/scripts')

from setup_guards import (
    guard_write_permissions,
    guard_validate_state_json,
    guard_safe_write
)

# Use guards
guard_write_permissions(skill_dir, "skill directory")
```

## Integration Points

These guards should be used by:
- **Story 1.2** (`prompts/analyze-conversation.md`): State validation before reads
- **Story 1.3** (`prompts/extract-patterns.md`): Safe writes to state
- **Story 1.4** (`prompts/generate-rules.md`): Safe writes to rules
- **Story 1.5**: Full integration

## Validation Status

All guards pass on current implementation:
```
Running Story 1-1 edge case guards...
All guards passed (5/5).
```
