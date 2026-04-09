# RuleSmith for Cursor IDE

**Native `.cursorrules` Integration**

---

## Overview

RuleSmith integrates with Cursor IDE through `.cursorrules` files. It analyzes your conversations and generates rule suggestions that Cursor uses to provide better assistance.

---

## Installation

### Method 1: Global Installation (Recommended for Cursor)

#### macOS / Linux

```bash
# Clone the repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# Copy skill to Cursor's global skills directory
mkdir -p ~/.claude/skills/
cp -r .claude/skills/rulesmith/ ~/.claude/skills/
```

#### Windows (PowerShell)

```powershell
# Clone the repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# Copy skill to Cursor's global skills directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude\skills"
Copy-Item -Recurse -Force .claude\skills\rulesmith "$env:USERPROFILE\.claude\skills\"
```

### Method 2: Project-Level Installation

#### macOS / Linux

```bash
# Within your Cursor project
mkdir -p .claude/skills/
cp -r /path/to/rulesmith/.claude/skills/rulesmith/ \
      .claude/skills/
```

#### Windows (PowerShell)

```powershell
# Within your Cursor project
New-Item -ItemType Directory -Force -Path .claude\skills
Copy-Item -Recurse -Force C:\path\to\rulesmith\.claude\skills\rulesmith .claude\skills\
```

### Method 3: Direct `.cursorrules` Integration

For immediate use without the skill system:

#### macOS / Linux

```bash
# Copy the prompts directory to your project
mkdir -p .cursor-prompts/
cp -r .claude/skills/rulesmith/prompts/ .cursor-prompts/
```

#### Windows (PowerShell)

```powershell
# Copy the prompts directory to your project
New-Item -ItemType Directory -Force -Path .cursor-prompts
Copy-Item -Recurse -Force .claude\skills\rulesmith\prompts .cursor-prompts\
```

---

## Cursor-Specific Configuration

### `.cursorrules` Format

Cursor uses plain text files with `#` for comments. Example `.cursorrules`:

```
# rulesmith Generated Rules
# Last Updated: 2026-04-08T14:30:00Z

# Communication Style
- Keep responses concise and direct
- Avoid excessive elaboration unless requested
- Use code blocks for all code examples

# Code Preferences
- Prefer TypeScript over JavaScript for type safety
- Use async/await instead of Promise chains
- Follow functional programming patterns where applicable

# Project Conventions
- Use kebab-case for file names
- Prefer composition over inheritance
- Write tests before implementation (TDD)
```

### Adding to Existing `.cursorrules`

The skill will:
1. Read your existing `.cursorrules`
2. Generate suggestions that don't conflict
3. Present new rules in the correct format
4. Preserve existing comments and structure

---

## Usage in Cursor

### Basic Usage

In Cursor's chat interface:

```
/rulesmith
```

Or ask Cursor directly:

```
Please analyze our conversation and suggest improvements to my .cursorrules file.
```

### Viewing Rules

To see your current `.cursorrules`:

```
Show me my .cursorrules file
```

Or open it directly: `Cmd+Shift+.` (show hidden files) → open `.cursorrules`

### Applying Suggestions

After analysis:

```
You: /rulesmith

Cursor: 📊 Conversation Analysis

**Corrections Found:** 3

**Patterns Identified:**

1. "Less verbose explanations" (count: 2)
   → Suggested rule: "# Keep explanations under 3 sentences"

2. "More code examples" (count: 2)
   → Suggested rule: "# Always provide executable code examples"

**Apply to .cursorrules?** (yes/no/edit)
```

---

## File Locations

### Cursor Project Structure

```
your-project/
├── .cursorrules                 # Cursor reads this file
├── .cursor-prompts/             # Optional: prompt templates
│   ├── analyze-conversation.md
│   ├── extract-patterns.md
│   └── generate-rules.md
└── .claude/
    └── skills/
        └── rulesmith/
            ├── data/
            │   ├── state.json
            │   ├── results.jsonl
            │   └── history/
            └── scripts/
```

### Global Cursor Configuration

For rules to apply to all Cursor projects:

```bash
# Create global .cursorrules
cat > ~/.cursorrules << 'EOF'
# Global Cursor Rules
# Managed by RuleSmith

# Default preferences
- Be concise and direct
- Provide working code examples
- Explain trade-offs when multiple approaches exist

# Language preferences
- Use TypeScript for type safety
- Prefer modern JavaScript features
- Follow PEP 8 for Python code
EOF
```

---

## Cursor-Specific Features

### `.cursorrules` Auto-Formatting

The skill automatically formats rules for Cursor:

| Feature | Implementation |
|---------|----------------|
| Comment Syntax | Uses `#` for comments |
| Rule Format | Bullet points with `-` |
| Section Headers | `## Section Name` |
| Platform Detection | Detects `.cursorrules` file |

### Project-Level Rules

Cursor supports both global and project-level `.cursorrules`:

1. **Global rules:** `~/.cursorrules` (applies everywhere)
2. **Project rules:** `<project>/.cursorrules` (overrides global)

The skill respects this hierarchy and will:
- Detect which level you're working at
- Suggest appropriate rules for each level
- Avoid duplicating rules across levels

---

## Integration with Cursor Features

### Composer Integration

Cursor's Composer feature (multi-file editing) works with generated rules:

```
/rulesmith

# After generating rules
"Apply these rules to the following files:"
- src/
- tests/
- docs/
```

### Command Palette

Create a custom command in Cursor:

1. Open Command Palette (`Cmd+Shift+P`)
2. Search for "Configure User Commands"
3. Add:

```json
{
  "id": "improve.rules",
  "title": "Improve Cursor Rules",
  "command": "improve-rules",
  "icon": "wand"
}
```

### `.cursorignore` Compatibility

The skill respects `.cursorignore` and won't analyze ignored files:

```
# .cursorignore
node_modules/
dist/
.git/
```

---

## Advanced Configuration

### Custom Rule Templates

Create custom rule templates in `.cursor-prompts/`:

```markdown
<!-- .cursor-prompts/custom-rules.md -->

# Custom Rule Template

## Section: {{SECTION_NAME}}

{{#each patterns}}
- {{this.suggested_rule}}
{{/each}}

## Notes
- Generated: {{timestamp}}
- Patterns found: {{count}}
```

### Multi-Project Rules

For different rule sets across projects:

```bash
# Project A: Backend
echo "# Backend-specific rules" > project-a/.cursorrules

# Project B: Frontend
echo "# Frontend-specific rules" > project-b/.cursorrules

# Run analysis for each project
cd project-a && /rulesmith
cd project-b && /rulesmith
```

---

## Troubleshooting

### `.cursorrules` Not Being Read

**Issue:** Cursor isn't using the rules

**Solutions:**
1. Verify file location (must be project root)
2. Check file name (must be exactly `.cursorrules`)
3. Ensure file is readable (not a symlink issue)

### Rules Not Applying

**Issue:** Generated rules aren't affecting Cursor's behavior

**Solutions:**
1. Check rule formatting (use `#` comments)
2. Verify no conflicting rules in global `.cursorrules`
3. Restart Cursor to reload rules

### Analysis Not Working

**Issue:** `/rulesmith` doesn't respond

**Solutions:**
```bash
# Verify skill installation
ls -la ~/.claude/skills/rulesmith/

# Reinstall if needed
cp -r /path/to/rulesmith/.claude/skills/rulesmith/ \
      ~/.claude/skills/
```

---

## Tips for Cursor Users

1. **Start with global rules** - Set baseline preferences in `~/.cursorrules`
2. **Add project-specific rules** - Override per project as needed
3. **Review before applying** - Cursor's `.cursorrules` affects all interactions
4. **Keep rules organized** - Use sections and comments for maintainability
5. **Version control `.cursorrules`** - Track rule changes over time

---

## Example Workflows

### Workflow 1: New Project Setup

```bash
# 1. Create new project
mkdir my-project && cd my-project

# 2. Initialize skill
mkdir -p .claude/skills/
cp -r ~/.claude/skills/rulesmith/ .claude/skills/

# 3. Create initial .cursorrules
echo "# Project Rules" > .cursorrules

# 4. Start working in Cursor
# 5. After first session, run: /rulesmith
```

### Workflow 2: Existing Project Enhancement

```bash
# 1. Navigate to project
cd existing-project

# 2. Add skill
mkdir -p .claude/skills/
cp -r ~/.claude/skills/rulesmith/ .claude/skills/

# 3. Analyze conversation patterns
# In Cursor chat: /rulesmith

# 4. Apply suggested rules
```

### Workflow 3: Team Setup

```bash
# 1. Create team rules repository
mkdir team-cursor-rules
cd team-cursor-rules

# 2. Add shared .cursorrules
cat > .cursorrules << 'EOF'
# Team Coding Standards

# Language preferences
- TypeScript for type safety
- Python 3.11+ for backend

# Code style
- Max line length: 100
- 2-space indentation
- Functional over imperative
EOF

# 3. Commit to git
git init
git add .cursorrules
git commit -m "Add team .cursorrules"

# 4. Team members clone and use
# Each member can run /rulesmith for personalization
```

---

## FAQ

**Q: Can I use both global and project `.cursorrules`?**

A: Yes. Project rules override global rules for that specific project.

**Q: How do I share rules with my team?**

A: Commit `.cursorrules` to your repository. Each team member can also run `/rulesmith` for personalization.

**Q: Will this work with Cursor's Composer feature?**

A: Yes. Rules apply to all Cursor features including Composer.

**Q: Can I disable the skill for certain projects?**

A: Yes. Don't copy the skill to those projects' `.claude/skills/` directories.

---

**Platform Version:** Cursor IDE (Latest)
**Last Updated:** 2026-04-08
**Skill Version:** 1.0.0
