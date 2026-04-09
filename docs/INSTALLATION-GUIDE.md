# RuleSmith - Installation Guide

**AI Assistant Conversation Analysis & Rule Improvement System**

This guide covers installation of RuleSmith across multiple AI coding platforms.

---

## What is RuleSmith?

RuleSmith is a meta-cognitive skill that enables AI assistants to learn from conversation history. It:

- **Analyzes conversations** to identify where you corrected the AI's suggestions
- **Extracts patterns** from recurring corrections across sessions
- **Generates rule improvements** tailored to your preferences
- **Tracks metrics** showing reduction in corrections over time
- **Maintains backups** so you can always roll back changes

### Key Features

| Feature | Description |
|---------|-------------|
| **Pattern Detection** | Identifies recurring themes in your corrections (code style, terminology, structure, etc.) |
| **Platform Auto-Detection** | Automatically formats rules for Cursor, Copilot, or Claude Code |
| **State Persistence** | Tracks patterns and metrics across sessions |
| **Backup & Restore** | Timestamped backups before any rule changes |
| **Privacy First** | 100% local - no external APIs or data transmission |
| **Comprehensive Testing** | 500+ tests with 98.8% pass rate |

---

## Quick Start (Choose Your Platform)

Select your platform for detailed installation instructions:

| Platform | Status | Guide |
|----------|--------|-------|
| [Claude Code](./CLAUDE-CODE.md) | ✅ Full Support | Detailed setup instructions |
| [Cursor IDE](./CURSOR.md) | ✅ Full Support | `.cursorrules` integration |
| [GitHub Copilot](./COPILOT.md) | ✅ Full Support | Custom instructions setup |
| [VS Code + Copilot](./VSCODE-COPILOT.md) | ✅ Full Support | Workspace-level setup |
| [Qwen Code](./QWEN-CODE.md) | ✅ Full Support | Adapter pattern setup |
| [OpenCLAW](./OPENCLAW.md) | ✅ Full Support | Custom instructions |
| [Hermes Agent](./HERMES.md) | ✅ Full Support | Prompt template integration |

---

## Universal Installation Steps

### Prerequisites

1. **Node.js 18+** (for validation scripts)
2. **Git** (for cloning the repository)
3. **Write permissions** to your home directory

### Clone Repository

```bash
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith
```

### Install Dependencies (Optional)

```bash
npm install
```

This enables validation scripts but is **not required** for core functionality.

### Verify Installation

```bash
# Run validation script
bash .claude/skills/rulesmith/scripts/validate-setup.sh
```

Expected output:
```
✅ Directory structure valid
✅ All prompt files present
✅ State files ready
✅ File permissions secure (0600)
✅ Installation verified
```

---

## Directory Structure After Installation

```
rulesmith/
├── docs/
│   └── platforms/              # This guide
│       ├── INSTALLATION-GUIDE.md
│       ├── CLAUDE-CODE.md
│       ├── CURSOR.md
│       ├── COPILOT.md
│       ├── VSCODE-COPILOT.md
│       ├── QWEN-CODE.md
│       ├── OPENCLAW.md
│       └── HERMES.md
├── .claude/
│   └── skills/
│       └── rulesmith/
│           ├── SKILL.md         # Skill metadata
│           ├── README.md        # Skill documentation
│           ├── IMPLEMENTATION.md
│           ├── prompts/         # Analysis logic
│           │   ├── analyze-conversation.md
│           │   ├── extract-patterns.md
│           │   └── generate-rules.md
│           ├── data/            # State & history
│           │   ├── state.json
│           │   ├── results.jsonl
│           │   └── history/
│           └── scripts/         # Validation
├── src/                         # Core TypeScript implementation
├── tests/                       # 500+ tests
└── package.json
```

---

## Common First Steps

### 1. Initial Analysis

After installation, run your first conversation analysis:

```
/improve-rules
```

This scans the current conversation for patterns and generates initial rule suggestions.

### 2. View Statistics

Check your metrics:

```
/improve-rules --stats
```

Output:
```
📊 Performance Metrics

Patterns Found: 12
Improvements Applied: 8
Corrections Reduction: 35%
Approval Rate: 87%
Last Analysis: 2026-04-08T14:30:00Z
```

### 3. View History

See recent improvements:

```
/improve-rules --history
```

### 4. Restore from Backup (if needed)

```
/improve-rules --rollback --to 2026-04-08T10:00:00Z
```

---

## Privacy & Security Guarantees

| Guarantee | Implementation |
|-----------|----------------|
| **Local-Only** | All processing happens on your machine |
| **No External APIs** | Zero network calls |
| **No Telemetry** | No usage tracking or phone-home |
| **File Permissions** | State files use 0600 (owner-only) |
| **Full Inspectability** | All code is visible in Markdown/TypeScript |
| **Audit Trail** | Every change logged to `results.jsonl` |

---

## Troubleshooting

### Error: Skill not found

**Cause:** Skill directory not in the correct location

**Fix:** Verify the skill is in your platform's skills directory (see platform-specific guides)

### Error: Permission denied

**Cause:** File permissions too restrictive

**Fix:**
```bash
chmod 600 .claude/skills/rulesmith/data/*
chmod 700 .claude/skills/rulesmith/data/
```

### Error: Invalid JSON in state file

**Cause:** Corrupted state.json

**Fix:**
```bash
# Restore from most recent backup
cp .claude/skills/rulesmith/data/history/rules-<latest-timestamp>.md \
   .claude/skills/rulesmith/data/state.json
```

---

## Next Steps

1. Read your platform-specific guide (linked above)
2. Run your first analysis with `/improve-rules`
3. Review suggested rules and apply improvements
4. Track your progress with `/improve-rules --stats`

---

## Need Help?

- **Documentation:** See individual platform guides
- **Issues:** Open an issue on GitHub
- **Contributing:** See `CONTRIBUTING.md`

---

**Version:** 1.0.0
**Last Updated:** 2026-04-08
**Project Status:** Production Ready (All 6 Epics Complete)
