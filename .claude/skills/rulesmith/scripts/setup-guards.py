#!/usr/bin/env python3
"""
Story 1-1 Edge Case Guards (Python version)
These guards can be imported by skill prompts for robustness
"""

import os
import json
import shutil
import sys
from pathlib import Path
from typing import Optional, Tuple


class SetupError(Exception):
    """Base exception for setup errors"""
    pass


class PermissionError(SetupError):
    """Raised when write permissions are insufficient"""
    pass


class PathError(SetupError):
    """Raised when path issues are detected"""
    pass


class StateFileError(SetupError):
    """Raised when state file is corrupted or invalid"""
    pass


class SkillDiscoveryError(SetupError):
    """Raised when skill is not discoverable"""
    pass


def guard_write_permissions(path: Path, context: str = "directory") -> None:
    """
    Guard 1: File Permission Errors
    Ensures write access before attempting operations

    Args:
        path: Path to check
        context: Description of what's being checked (for error messages)

    Raises:
        PermissionError: If write permissions are insufficient
    """
    if not path.exists():
        raise PermissionError(f"{context} does not exist: {path}")

    if not os.access(path, os.W_OK):
        raise PermissionError(
            f"No write permission for {context}: {path}\n"
            f"SUGGESTION: Check directory permissions"
        )

    # Test actual write capability
    test_file = path / f".write_guard_test_{os.getpid()}"
    try:
        test_file.touch()
        test_file.unlink()
    except OSError as e:
        raise PermissionError(
            f"Cannot write to {context} (touch test failed): {path}\n"
            f"Error: {e}"
        )


def guard_path_safe(path: Path, path_name: str = "path") -> None:
    """
    Guard 2: Cross-Platform Path Handling
    Normalizes paths and checks for problematic characters

    Args:
        path: Path to validate
        path_name: Description of the path (for error messages)

    Raises:
        PathError: If path contains problematic characters or is too long
    """
    path_str = str(path)

    # Check for characters problematic on Windows
    # Windows illegal chars: \ : * ? " < > |
    problematic_chars = set('\\:*?"<>|')
    found_problematic = [c for c in path_str if c in problematic_chars]

    if found_problematic:
        raise PathError(
            f"{path_name} contains problematic characters: {path_str}\n"
            f"Found: {', '.join(repr(c) for c in found_problematic)}"
        )

    # Check path length (Windows has 260 char limit, leave buffer)
    # Use 240 as a safe threshold
    if len(path_str) > 240:
        raise PathError(
            f"{path_name} too long ({len(path_str)} chars, max 240): {path_str}"
        )

    # Warn about spaces (can cause issues in scripts)
    if ' ' in path_str:
        print(f"WARNING: {path_name} contains spaces: {path_str}", file=sys.stderr)


def guard_mkdir_idempotent(path: Path) -> bool:
    """
    Guard 3: Idempotency Protection
    Creates directory only if it doesn't exist (safe to run multiple times)

    Args:
        path: Directory to create

    Returns:
        True if directory exists or was created successfully

    Raises:
        SetupError: If directory creation fails
    """
    if path.exists():
        if path.is_dir():
            if path.is_symlink():
                print(f"WARNING: Target is a symlink: {path}", file=sys.stderr)
            return True
        else:
            raise SetupError(f"Path exists but is not a directory: {path}")

    try:
        path.mkdir(parents=True, exist_ok=True)
        return True
    except OSError as e:
        raise SetupError(f"Failed to create directory: {path}\nError: {e}")


def guard_validate_state_json(state_file: Path) -> dict:
    """
    Guard 4: State File Validation
    Validates JSON structure before operations

    Args:
        state_file: Path to state.json

    Returns:
        The parsed JSON data

    Raises:
        StateFileError: If state file is missing, empty, or invalid JSON
    """
    if not state_file.exists():
        raise StateFileError(f"State file does not exist: {state_file}")

    if state_file.stat().st_size == 0:
        raise StateFileError(f"State file is empty: {state_file}")

    try:
        with open(state_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError as e:
        raise StateFileError(
            f"State file contains invalid JSON: {state_file}\n"
            f"Error: {e}"
        )

    # Validate required fields
    required_fields = [
        'last_analysis', 'patterns_found', 'improvements_applied',
        'corrections_reduction', 'platform'
    ]
    missing = [f for f in required_fields if f not in data]
    if missing:
        raise StateFileError(
            f"State file missing required fields: {missing}"
        )

    # Validate data types
    if not isinstance(data['improvements_applied'], int):
        raise StateFileError("Field 'improvements_applied' must be an integer")

    if not isinstance(data['corrections_reduction'], (int, float)):
        raise StateFileError("Field 'corrections_reduction' must be numeric")

    return data


def guard_state_file_recovery(state_file: Path, backup_dir: Path) -> dict:
    """
    Guard 4b: State File Corruption Recovery
    Creates backup and attempts recovery if state.json is corrupted

    Args:
        state_file: Path to state.json
        backup_dir: Directory to store backups (usually data/history/)

    Returns:
        The recovered/validated state data

    Raises:
        SetupError: If recovery fails
    """
    try:
        return guard_validate_state_json(state_file)
    except StateFileError:
        print("WARNING: State file corrupted, attempting recovery...", file=sys.stderr)

        # Ensure backup directory exists
        guard_mkdir_idempotent(backup_dir)

        # Backup the corrupted file
        if state_file.exists():
            from datetime import datetime
            timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            backup_file = backup_dir / f"corrupted_state_{timestamp}.json"

            try:
                shutil.copy2(state_file, backup_file)
                print(f"INFO: Backed up corrupted state to: {backup_file}", file=sys.stderr)
            except OSError as e:
                raise SetupError(f"Failed to backup corrupted state file: {e}")

        # Restore to initial empty state (matches Story 1-5 AC2 specification)
        initial_state = {
            "last_analysis": "",
            "patterns_found": [],
            "improvements_applied": 0,
            "corrections_reduction": 0,
            "platform": "unknown",
            "_schema_note": "results.jsonl is append-only, one JSON object per line",
            "_recovered": True,
            "_recovery_date": timestamp
        }

        try:
            with open(state_file, 'w') as f:
                json.dump(initial_state, f, indent=2)
            print("INFO: State file recovered to initial state", file=sys.stderr)
            return initial_state
        except OSError as e:
            raise SetupError(f"Failed to write recovered state file: {e}")


def guard_skill_discoverable(skill_file: Path) -> None:
    """
    Guard 5: Skill Discovery Validation
    Verifies SKILL.md is complete and discoverable

    Args:
        skill_file: Path to SKILL.md

    Raises:
        SkillDiscoveryError: If SKILL.md is missing required sections
    """
    if not skill_file.exists():
        raise SkillDiscoveryError(f"SKILL.md not found: {skill_file}")

    content = skill_file.read_text()

    # Check for required sections
    required_sections = [
        ("## Capabilities", "Capabilities"),
        ("## Allowed Tools", "Allowed Tools"),
        ("## Prompt References", "Prompt References")
    ]

    missing = []
    for marker, name in required_sections:
        if marker not in content:
            missing.append(name)

    if missing:
        raise SkillDiscoveryError(
            f"SKILL.md missing required sections: {', '.join(missing)}\n"
            f"File: {skill_file}"
        )

    # Check for skill name in first line
    first_line = content.split('\n')[0]
    if not first_line.startswith("# Project Self-Improvement"):
        print(
            f"WARNING: SKILL.md title may be non-standard: {first_line}",
            file=sys.stderr
        )


def guard_disk_space(path: Path, required_mb: int = 1) -> None:
    """
    Guard 6: Disk Space Check
    Ensures sufficient space before operations

    Args:
        path: Path to check disk space for
        required_mb: Minimum required space in MB

    Raises:
        SetupError: If insufficient disk space
    """
    try:
        stat = shutil.disk_usage(path)
        available_mb = stat.free // (1024 * 1024)

        if available_mb < required_mb:
            raise SetupError(
                f"Insufficient disk space ({available_mb} MB available, "
                f"{required_mb} MB required)"
            )
    except OSError as e:
        print(f"WARNING: Cannot check disk space: {e}", file=sys.stderr)


def guard_safe_write(content: str, target_file: Path,
                     backup_dir: Optional[Path] = None) -> None:
    """
    Guard 7: Safe File Write with Backup
    Writes to temp file first, then atomic move

    Args:
        content: Content to write
        target_file: Target file path
        backup_dir: Optional directory to store backups of existing file

    Raises:
        SetupError: If write operation fails
    """
    target_dir = target_file.parent

    # Ensure target directory exists
    guard_mkdir_idempotent(target_dir)

    # Create temp file
    temp_file = target_dir / f".tmp_write_{os.getpid()}_{target_file.name}"

    try:
        # Write to temp file
        temp_file.write_text(content)

        # Backup existing file if requested
        if backup_dir and target_file.exists():
            from datetime import datetime
            guard_mkdir_idempotent(backup_dir)
            timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
            backup_file = backup_dir / f"{target_file.name}_{timestamp}"

            try:
                shutil.copy2(target_file, backup_file)
            except OSError as e:
                print(f"WARNING: Failed to backup existing file: {e}", file=sys.stderr)

        # Atomic move
        temp_file.replace(target_file)

    except OSError as e:
        # Clean up temp file if it exists
        if temp_file.exists():
            try:
                temp_file.unlink()
            except OSError:
                pass
        raise SetupError(f"Failed to write file: {target_file}\nError: {e}")


def run_all_guards(project_root: Optional[Path] = None) -> Tuple[int, int]:
    """
    Main validation function - runs all guards

    Args:
        project_root: Project root directory (defaults to CWD)

    Returns:
        Tuple of (passed_count, failed_count)
    """
    if project_root is None:
        project_root = Path.cwd()

    skill_dir = project_root / ".claude" / "skills" / "rulesmith"

    passed = 0
    failed = 0

    print("Running Story 1-1 edge case guards...")

    guards = [
        ("Permissions", lambda: guard_write_permissions(skill_dir, "skill directory")),
        ("Path safety", lambda: guard_path_safe(skill_dir, "skill directory")),
        ("State validation", lambda: guard_validate_state_json(skill_dir / "data" / "state.json")),
        ("Skill discovery", lambda: guard_skill_discoverable(skill_dir / "SKILL.md")),
        ("Disk space", lambda: guard_disk_space(skill_dir, 1)),
    ]

    for name, guard_func in guards:
        try:
            guard_func()
            passed += 1
        except SetupError as e:
            print(f"[FAIL] {name}: {e}", file=sys.stderr)
            failed += 1

    if failed == 0:
        print(f"All guards passed ({passed}/{len(guards)}).")
    else:
        print(f"{failed} guard(s) failed, {passed} passed.", file=sys.stderr)

    return passed, failed


if __name__ == "__main__":
    _, failed = run_all_guards()
    sys.exit(1 if failed > 0 else 0)
