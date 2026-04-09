# Project-Self-Improvement

## Description
Project-Self-Improvement is a meta-cognitive skill for Claude Code and Cursor that enables self-improvement through conversation analysis. It identifies corrections, extracts recurring patterns, and generates rule updates to improve future interactions based on past performance.

## Installation
To install this skill, copy the `rulesmith/` directory to your local skills directory.

### For Claude Code
```bash
cp -r .claude/skills/rulesmith/ ~/.claude/skills/
```

### For Cursor
Copy the `rulesmith/` folder into your project's `.claude/skills/` directory or your global Cursor rules location.

## Usage
Invoke this skill using the `/improve-rules` command.

### Main Command
- `/improve-rules`: Analyzes the current conversation for correction patterns and suggests rule improvements to optimize future interactions.

### Command Variants
- `/improve-rules --stats`: Displays current performance metrics, including patterns found, improvements applied, and percentage reduction in corrections.
- `/improve-rules --history`: Shows the last 10 rule improvements from the audit trail (`data/results.jsonl`), including status and descriptions.
- `/improve-rules --rollback --to {timestamp}`: Provides step-by-step instructions for manually restoring rules from a specific backup file in `data/history/`. Use the ISO 8601 UTC format (e.g., `2026-03-16T10:00:00Z`).

## Architecture and Structure

### Directory Structure
```
rulesmith/
├── SKILL.md                 # Skill metadata & capabilities
├── README.md                # Usage documentation (This file)
├── IMPLEMENTATION.md        # Technical implementation details
├── commands.ts              # Logic for command variants (TS source)
├── commands.cjs             # Compiled logic for Claude Code
├── prompts/                 # Core analysis logic
│   ├── analyze-conversation.md    # Identify corrections
│   ├── extract-patterns.md        # Find recurring patterns
│   └── generate-rules.md          # Create rule updates
├── data/                    # Local state & backups
│   ├── state.json                 # Current state (patterns, metrics)
│   ├── results.jsonl              # Append-only log (audit trail)
│   └── history/                   # Timestamped rule backups
└── scripts/                 # Validation & reliability guards
    ├── validate-setup.sh          # Quick installation check
    ├── setup-guards.sh            # Reusable safety functions
    ├── setup-guards.py            # Python implementation of guards
    ├── validate-setup.sh          # Quick installation check
    ├── README.md                  # Documentation for scripts
    └── EDGE-CASE-REVIEW.md        # Security & edge case documentation
```

### File Purposes
- **SKILL.md**: Defines the skill's capabilities, requirements, and implementation status for the AI assistant.
- **commands.ts / commands.cjs**: Contains the core logic for the slash command and its variants.
- **prompts/**: Contains the Markdown templates used for different phases of conversation analysis and rule generation.
- **data files**: `state.json` tracks high-level metrics, while `results.jsonl` provides a detailed, append-only audit trail of every improvement.
- **validation scripts**: Automated scripts in `scripts/` (Shell and Python) ensure the environment is correctly configured and the skill is ready for use.

### Platform Auto-Detection
The skill automatically detects your active AI assistant platform to ensure rule updates are formatted correctly:
- **Cursor**: Detects `.cursorrules` and uses `#` for comments.
- **GitHub Copilot**: Detects Copilot custom instructions and uses Markdown formatting.
- **Claude Code**: Defaults to standard instructions if no other platform is detected.

## Privacy and Security

### Privacy by Design
Project-Self-Improvement is built with a "Privacy First" philosophy. No data leaves the user's environment, and the skill does not use any external APIs.

- **Local-Only Architecture**: All analysis, pattern extraction, and rule generation happen entirely on your machine.
- **No External APIs**: The skill does not communicate with any external services, ensuring your conversation data remains private.
- **Audit Trail**: Every change is logged locally in `data/results.jsonl`, providing full transparency.

### Security Guarantees
- **File Permissions**: All state and history files in the `data/` directory are restricted to `0600` permissions (read/write by owner only) to prevent unauthorized access by other users on the system.
- **Full Inspectability**: Since all logic is contained in local Markdown and TypeScript files, you can inspect and modify the code at any time.

## Troubleshooting and Validation

### Automated Validation
The skill includes a guard-based validation mechanism to ensure reliability. You can manually verify your installation by running:
```bash
bash scripts/validate-setup.sh
```
This script checks for:
- Required directory structure
- File existence (prompts, data files)
- Correct file permissions (0600 for data/)
- Valid JSON schema for state files

### Common Issues (AR22 Format)
All errors in this skill follow a standardized format to help you resolve issues quickly.

#### ⚠️ Error: Insecure file permissions
- **What happened:** Files in the `data/` directory have overly permissive permissions, potentially allowing other users to read your state.
- **How to fix:**
  1. Run `chmod 600 data/*`
  2. Run `chmod 700 data/`
  3. Ensure file is readable/writeable by owner only
- **Technical details:** File: [path/to/file], Current: [mode], Required: 0600.

#### ⚠️ Error: Missing state file
- **What happened:** A missing state file was detected. The required `data/state.json` file is missing or inaccessible.
- **How to fix:**
  1. Run /improve-rules to create initial state file
  2. Verify file exists at: [path/to/state.json]
  3. Check file permissions (should be 0600)
- **Technical details:** Expected path: [path], Error: FILE_NOT_FOUND, System error: [msg].

#### ⚠️ Error: Invalid JSON formatting
- **What happened:** The skill detected invalid JSON formatting. `data/state.json` or an entry in `data/results.jsonl` is malformed and cannot be parsed.
- **How to fix:**
  1. Check file syntax with: `jq . data/state.json`
  2. Restore from backup if available
  3. Delete file and re-run /improve-rules
- **Technical details:** Parse error: [msg], File: data/state.json.

## Quick Start
1. Ensure all files are in the correct location.
2. Verify your installation by running the validation script:
   ```bash
   bash scripts/validate-setup.sh
   ```
3. Run the skill for the first time:
   ```bash
   /improve-rules
   ```
