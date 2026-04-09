# Project-Self-Improvement for Claude Code

**Native Support - Full Feature Access**

---

## Overview

Project-Self-Improvement is natively designed for Claude Code. It integrates as a skill that the AI assistant can invoke to analyze conversation patterns and generate rule improvements.

---

## Installation

### Method 1: Global Installation (Recommended)

Install the skill globally so it's available in all projects:

```bash
# Clone the repository
git clone https://github.com/yourusername/Project-Self_Improvement.git
cd Project-Self_Improvement

# Copy skill to Claude Code's global skills directory
cp -r .claude/skills/rulesmith/ ~/.claude/skills/
```

### Method 2: Project-Level Installation

Install the skill within a specific project:

```bash
# Within your project directory
mkdir -p .claude/skills/
cp -r /path/to/Project-Self_Improvement/.claude/skills/rulesmith/ \
      .claude/skills/
```

### Method 3: Repository Clone with Skill Already Included

If you've cloned the full Project-Self_Improvement repository, the skill is already in place:

```bash
cd Project-Self_Improvement
# The skill is at .claude/skills/rulesmith/
```

---

## Verification

Verify the installation:

```bash
# Run validation script
bash ~/.claude/skills/rulesmith/scripts/validate-setup.sh
```

Expected output:
```
✅ Directory structure valid
✅ All prompt files present
✅ State files ready
✅ File permissions secure (0600)
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
/improve-rules
```

### Command Variants

| Command | Description |
|---------|-------------|
| `/improve-rules` | Analyze conversation and suggest rule improvements |
| `/improve-rules --stats` | Show metrics (patterns, improvements, reduction rate) |
| `/improve-rules --history` | Show last 20 improvements from audit log |
| `/improve-rules --rollback --to {timestamp}` | Restore rules from backup |

### Example Conversation

```
You: /improve-rules

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

When working on this project, use the `/improve-rules` skill to:
- Analyze conversation patterns
- Identify recurring corrections
- Generate rule improvements for this codebase

## Example Usage

After a coding session, run:
```
/improve-rules
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
/improve-rules
```

This helps track patterns and improve future sessions.
```

### Project-Specific Rules

The skill can be configured to generate rules for specific projects:

```markdown
## Project Rules

To capture project-specific patterns, use:
```
/improve-rules
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
cp -r /path/to/Project-Self_Improvement/.claude/skills/rulesmith/ \
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
cd /path/to/Project-Self_Improvement
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

A: Yes. Project-Self-Improvement works alongside other Claude Code skills.

**Q: How often should I run analysis?**

A: After any substantial coding session (10+ exchanges) or when you feel the assistant isn't aligned with your preferences.

---

**Platform Version:** Claude Code (Latest)
**Last Updated:** 2026-04-08
**Skill Version:** 1.0.0
