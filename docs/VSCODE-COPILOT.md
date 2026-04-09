# Project-Self-Improvement for VS Code + GitHub Copilot

**Workspace-Level Integration**

---

## Overview

This guide covers using Project-Self-Improvement specifically with VS Code and the GitHub Copilot extension, including workspace-level configuration and multi-root workspace support.

---

## Prerequisites

1. **VS Code** (latest version)
2. **GitHub Copilot extension** installed
3. **Node.js 18+** (for validation scripts)

---

## Installation

### Step 1: Install GitHub Copilot Extension

```bash
# Via VS Code CLI
code --install-extension github.copilot
code --install-extension github.copilot-chat
```

Or in VS Code:
1. Extensions panel (Ctrl+Shift+X)
2. Search "GitHub Copilot"
3. Click Install

### Step 2: Install Project-Self-Improvement

```bash
# Clone the repository
git clone https://github.com/hariprs/rulesmith.git
cd rulesmith

# For single workspace
mkdir -p .vscode/.claude/skills/
cp -r .claude/skills/rulesmith/ .vscode/.claude/skills/

# For all workspaces (global)
mkdir -p ~/.claude/skills/
cp -r .claude/skills/rulesmith/ ~/.claude/skills/
```

### Step 3: Configure VS Code Settings

Create or edit `.vscode/settings.json`:

```json
{
  "github.copilot.enable": {
    "*": true,
    "markdown": true,
    "yaml": false
  },
  "github.copilot.inlineSuggest.enable": true,
  "github.copilot.advanced": {
    "customInstructions": {
      "enabled": true,
      "path": ".github/copilot-instructions.md"
    }
  },
  "editor.inlineSuggest.showToolbar": "onHover"
}
```

---

## VS Code Integration

### Copilot Chat Panel Integration

1. Open Copilot Chat: `Ctrl+Shift+I` or `View > GitHub Copilot > Chat`
2. Use the skill:

```
/improve-rules
```

### Inline Chat Integration

1. Open inline chat: `Ctrl+I`
2. Type:

```
Please analyze our conversation and suggest improvements to my coding preferences.
```

### Quick Actions

Create a VS Code task for quick access:

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Improve Copilot Rules",
      "type": "shell",
      "command": "echo '/improve-rules' | pbcopy",
      "problemMatcher": [],
      "presentation": {
        "reveal": "silent"
      }
    }
  ]
}
```

---

## Workspace Configuration

### Single Folder Workspace

```
my-project/
├── .vscode/
│   ├── settings.json
│   ├── tasks.json
│   └── .claude/
│       └── skills/
│           └── rulesmith/
├── .github/
│   └── copilot-instructions.md
└── src/
```

### Multi-Root Workspace

For complex projects with multiple folders:

```json
// my-workspace.code-workspace
{
  "folders": [
    {
      "name": "frontend",
      "path": "./frontend"
    },
    {
      "name": "backend",
      "path": "./backend"
    },
    {
      "name": "shared",
      "path": "./shared"
    }
  ],
  "settings": {
    "github.copilot.enable": {
      "*": true
    },
    "github.copilot.advanced": {
      "customInstructions": {
        "enabled": true,
        "path": ".github/copilot-instructions.md"
      }
    }
  },
  "extensions": {
    "recommendations": [
      "github.copilot",
      "github.copilot-chat"
    ]
  }
}
```

---

## Project-Specific Instructions

### Frontend Project

```markdown
<!-- .github/copilot-instructions.md -->
# Frontend Project Instructions

## Tech Stack
- React 18+ with TypeScript
- Tailwind CSS for styling
- Vite for build tool

## Patterns
- Functional components with hooks
- Custom hooks for shared logic
- Context API for state (avoid Redux unless necessary)

## Style
- Use Tailwind utility classes
- Mobile-first responsive design
- Accessible HTML (ARIA labels)
```

### Backend Project

```markdown
<!-- backend/.github/copilot-instructions.md -->
# Backend Project Instructions

## Tech Stack
- Node.js 18+ with TypeScript
- Express.js framework
- PostgreSQL database

## Patterns
- RESTful API design
- Async/await for promises
- Middleware pattern for cross-cutting concerns

## Security
- Validate all inputs
- Use parameterized queries
- Implement rate limiting
```

### Monorepo Configuration

```
monorepo/
├── .github/
│   └── copilot-instructions.md    # Shared rules
├── packages/
│   ├── frontend/
│   │   └── .github/
│   │       └── copilot-instructions.md  # Frontend-specific
│   ├── backend/
│   │   └── .github/
│   │       └── copilot-instructions.md  # Backend-specific
│   └── shared/
│       └── .github/
│           └── copilot-instructions.md  # Shared code rules
```

---

## VS Code Keybindings

Create custom keybindings for quick access:

```json
// .vscode/keybindings.json
[
  {
    "key": "ctrl+shift+alt+i",
    "command": "github.copilot.openChat"
  },
  {
    "key": "ctrl+shift+alt+r",
    "command": "workbench.action.terminal.sendSequence",
    "args": {
      "text": "/improve-rules\n"
    }
  }
]
```

---

## Snippets Integration

Create snippets for common patterns:

```json
// .vscode/copilot-rules.code-snippets
{
  "Copilot Rule - TypeScript": {
    "prefix": "cp-rule-ts",
    "body": [
      "## TypeScript Preferences",
      "- Use strict mode",
      "- Prefer interfaces for object shapes",
      "- Use type aliases for unions/intersections"
    ]
  },
  "Copilot Rule - Testing": {
    "prefix": "cp-rule-test",
    "body": [
      "## Testing Standards",
      "- Write tests before implementation (TDD)",
      "- Use describe/it for test structure",
      "- Mock external dependencies"
    ]
  }
}
```

---

## Advanced Features

### Automatic Analysis on Save

Add a VS Code extension for automatic analysis:

```json
// .vscode/settings.json
{
  "github.copilot.advanced": {
    "customInstructions": {
      "enabled": true,
      "path": ".github/copilot-instructions.md"
    }
  },
  "files.watcherExclude": {
    "**/.github/copilot-instructions.md": false
  }
}
```

### Status Bar Integration

Create a status bar item showing analysis status:

```typescript
// Extension code (conceptual)
const statusBarItem = vscode.window.createStatusBarItem(
  vscode.StatusBarAlignment.Right,
  100
);
statusBarItem.text = "$(sync~analyze) Improve Rules";
statusBarItem.command = "copilotRules.analyze");
```

### Notifications for New Patterns

Configure VS Code to notify when new patterns are found:

```json
// .vscode/settings.json
{
  "github.copilot.chat.codeActions": {
    "enable": true
  }
}
```

---

## Troubleshooting

### Copilot Not Active

**Issue:** Copilot suggestions not appearing

**Solutions:**
1. Check you're signed in to GitHub
2. Verify Copilot subscription is active
3. Check extension is enabled
4. Try `Ctrl+Shift+P` → "GitHub Copilot: Sign In"

### Custom Instructions Not Loading

**Issue:** Instructions aren't being applied

**Solutions:**
1. Verify file path in settings.json
2. Check file is valid Markdown
3. Reload VS Code window
4. Check Copilot Chat settings

### Multi-Root Workspace Issues

**Issue:** Instructions applying to wrong folder

**Solutions:**
1. Use folder-specific instructions files
2. Check workspace settings hierarchy
3. Verify each folder has its own `.github/` directory

---

## Example Workflows

### Workflow 1: New Project Setup

```bash
# 1. Create project
mkdir my-project && cd my-project
code .

# 2. In VS Code terminal, install skill
mkdir -p .vscode/.claude/skills/
git clone https://github.com/hariprs/rulesmith.git temp
cp -r temp/.claude/skills/rulesmith/ .vscode/.claude/skills/
rm -rf temp

# 3. Create instructions file
mkdir -p .github/
touch .github/copilot-instructions.md

# 4. Start coding with Copilot
# 5. After first session, run in Copilot Chat:
#    /improve-rules
```

### Workflow 2: Existing Project Enhancement

```bash
# 1. Open project in VS Code
code existing-project

# 2. Add skill globally
mkdir -p ~/.claude/skills/
cp -r /path/to/rulesmith/.claude/skills/rulesmith/ \
      ~/.claude/skills/

# 3. Open Copilot Chat (Ctrl+Shift+I)
# 4. Run: /improve-rules

# 5. Apply generated instructions to .github/copilot-instructions.md
```

### Workflow 3: Team Collaboration

```bash
# 1. Clone shared project
git clone org/team-project
cd team-project
code .

# 2. Team instructions already in .github/copilot-instructions.md
# 3. Add your personal preferences:
#    In Copilot Chat: /improve-rules --personal

# 4. Commit team instructions, keep personal local
git add .github/copilot-instructions.md
git commit -m "Update team Copilot instructions"
```

---

## Tips for VS Code Users

1. **Use workspace settings** - Keep team rules in `.vscode/settings.json`
2. **Leverage multi-root** - Different instructions for frontend/backend
3. **Keyboard shortcuts** - Bind `/improve-rules` to a quick key combo
4. **Status bar integration** - Quick access to analysis
5. **Snippet expansion** - Quick template for new rule sections

---

## FAQ

**Q: Can I use this with the Copilot CLI?**

A: Yes. See the [main Copilot guide](./COPILOT.md) for CLI usage.

**Q: How do I share rules with my team?**

A: Commit `.github/copilot-instructions.md` to your repository. Each team member can also run `/improve-rules` for personalization.

**Q: Will this slow down VS Code?**

A: No. The skill only runs when invoked and has minimal overhead.

**Q: Can I disable it for certain file types?**

A: Yes. Use `files.exclude` or language-specific settings to disable Copilot for specific files.

---

**Platform Version:** VS Code + GitHub Copilot (Latest)
**Last Updated:** 2026-04-08
**Skill Version:** 1.0.0
