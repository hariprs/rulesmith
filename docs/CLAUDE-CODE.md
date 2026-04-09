# RuleSmith for Claude Code

**Native Support - Full Feature Access**

---

## Overview

RuleSmith is natively designed for Claude Code. It integrates as a skill that the AI assistant can invoke to analyze conversation patterns and generate rule improvements.

---

## Installation

### Method 1: Global Installation (Recommended)

Install the skill globally so it's available in all projects:

#### macOS / Linux

```bash
# Clone the repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# Copy skill to Claude Code's global skills directory
cp -r .claude/skills/rulesmith/ ~/.claude/skills/
```

#### Windows (PowerShell)

```powershell
# Clone the repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# Copy skill to Claude Code's global skills directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse -Force .claude\skills\rulesmith "$env:USERPROFILE\.claude\skills\"
```

### Method 2: Project-Level Installation

Install the skill within a specific project:

#### macOS / Linux

```bash
# Within your project directory
mkdir -p .claude/skills/
cp -r /path/to/rulesmith/.claude/skills/rulesmith/ \
      .claude/skills/
```

#### Windows (PowerShell)

```powershell
# Within your project directory
New-Item -ItemType Directory -Force -Path .claude\skills
Copy-Item -Recurse -Force C:\path\to\rulesmith\.claude\skills\rulesmith .claude\skills\
```

### Method 3: Repository Clone with Skill Already Included

If you've cloned the full rulesmith repository, the skill is already in place:

#### macOS / Linux

```bash
cd rulesmith
# The skill is at .claude/skills/rulesmith/
```

#### Windows (PowerShell)

```powershell
cd rulesmith
# The skill is at .claude\skills\rulesmith\
```

---

## Verification

Verify the installation:

#### macOS / Linux

```bash
# Run validation script
bash ~/.claude/skills/rulesmith/scripts/validate-setup.sh
```

#### Windows (PowerShell)

```powershell
# Run validation script
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.claude\skills\rulesmith\scripts\validate-setup.ps1"
```

Expected output:
```
✅ Directory structure valid
✅ All prompt files present
✅ State files ready
✅ File permissions secure
✅ Installation verified for Claude Code
```

---

## Usage

### Basic Usage

In any Claude Code conversation, simply ask:

```
Please analyze our conversation and suggest rule improvements.
```

Or use the command directly:

```
/rulesmith
```

### Command Variants

| Command | Description |
|---------|-------------|
| `/rulesmith` | Analyze conversation and suggest rule improvements |
| `/rulesmith --stats` | Show metrics (patterns, improvements, reduction rate) |
| `/rulesmith --history` | Show last 20 improvements from audit log |
| `/rulesmith --rollback --to {timestamp}` | Restore rules from backup |

### Example Conversation

```
You: /rulesmith

Claude: 📊 Conversation Analysis

**Corrections Found:** 5

**Patterns Identified:**

1. "Prefer concise responses" (count: 3)
   - Example: "that's too verbose, be more concise"
   - Suggested rule: "Keep responses under 200 words unless detail is explicitly requested"

2. "Don't use TypeScript for simple scripts" (count: 2)
   - Example: "this is overkill, just use JavaScript"
   - Suggested rule: "Use JavaScript for simple scripts; TypeScript only for larger projects"

**Apply these changes?** (yes/no/edit)
```

---

## Configuration

### State File Location

```
~/.claude/skills/rulesmith/data/state.json
```

### Backup Location

```
~/.claude/skills/rulesmith/data/history/rules-{timestamp}.md
```

### Customization

Edit the prompts to customize analysis behavior:

```bash
# Edit conversation analysis prompt
nano ~/.claude/skills/rulesmith/prompts/analyze-conversation.md

# Edit pattern extraction prompt
nano ~/.claude/skills/rulesmith/prompts/extract-patterns.md

# Edit rule generation prompt
nano ~/.claude/skills/rulesmith/prompts/generate-rules.md
```

---

## Integration with CLAUDE.md

You can reference the skill in your project's `CLAUDE.md`:

```markdown
# Project Preferences

## Skills

When working on this project, use the `/rulesmith` skill to:
- Analyze conversation patterns
- Identify recurring corrections
- Generate rule improvements for this codebase

## Example Usage

After a coding session, run:
```
/rulesmith
```

This helps the assistant learn your preferences for this specific project.
```

---

## Advanced Usage

### Automatic Analysis After Sessions

Add a reminder in your `CLAUDE.md`:

```markdown
## Session End Routine

After completing work, please run:
```
/rulesmith
```

This helps track patterns and improve future sessions.
```

### Project-Specific Rules

The skill can be configured to generate rules for specific projects:

```markdown
## Project Rules

To capture project-specific patterns, use:
```
/rulesmith
```

Rules will be formatted according to this project's conventions.
```

---

## Troubleshooting

### Skill Not Found

**Error:** `Skill not found: rulesmith`

**Solution:**
```bash
# Verify skill directory exists
ls -la ~/.claude/skills/rulesmith/

# If missing, re-install
cp -r /path/to/rulesmith/.claude/skills/rulesmith/ \
      ~/.claude/skills/
```

### State File Errors

**Error:** `Cannot read state file`

**Solution:**
```bash
# Reset state file
echo '{"last_analysis": null, "patterns_found": [], "improvements_applied": 0, "corrections_reduction": 0, "platform": "claude-code"}' > \
  ~/.claude/skills/rulesmith/data/state.json
```

### Permission Errors

**Error:** `Permission denied on data files`

**Solution:**
```bash
chmod 600 ~/.claude/skills/rulesmith/data/*
chmod 700 ~/.claude/skills/rulesmith/data/
```

---

## Tips & Best Practices

1. **Run after complex sessions** - More conversation = better pattern detection
2. **Review suggested rules** - Always review before applying
3. **Use --stats regularly** - Track your improvement over time
4. **Keep backups** - Automatic backups created before any changes
5. **Customize prompts** - Edit prompts to match your workflow

---

## Update Procedure

To update to the latest version:

```bash
cd /path/to/rulesmith
git pull

# Re-copy skill files
cp -r .claude/skills/rulesmith/ ~/.claude/skills/

# Verify update
bash ~/.claude/skills/rulesmith/scripts/validate-setup.sh
```

---

## FAQ

**Q: Does this work with all Claude Code models?**

A: Yes, works with Claude Opus, Sonnet, and Haiku in Claude Code.

**Q: Is my conversation data sent anywhere?**

A: No. All processing is local. No external APIs are used.

**Q: Can I use multiple skills together?**

A: Yes. RuleSmith works alongside other Claude Code skills.

**Q: How often should I run analysis?**

A: After any substantial coding session (10+ exchanges) or when you feel the assistant isn't aligned with your preferences.

---

**Platform Version:** Claude Code (Latest)
**Last Updated:** 2026-04-08
**Skill Version:** 1.0.0
