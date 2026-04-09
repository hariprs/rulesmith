# RuleSmith

**AI Assistant Conversation Analysis & Rule Improvement System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/rulesmith.svg)](https://www.npmjs.com/package/rulesmith)

## Overview

RuleSmith analyzes AI assistant conversations to extract patterns and improve custom rules/instructions. It identifies recurring corrections, categorizes them by type, and provides actionable insights for improvement.

### What It Does

- **Pattern Detection**: Identifies recurring corrections and feedback patterns in your conversations
- **Rule Generation**: Suggests improved rules based on conversation analysis
- **Multi-Platform Support**: Works with Claude Code, Cursor IDE, GitHub Copilot, VS Code + Copilot, Qwen Code, OpenCLAW, and Hermes Agent
- **Visualization**: Charts and reports for pattern trends and insights
- **State Management**: Tracks patterns across sessions with backup and rollback support

## Why RuleSmith?

**The Problem:** AI assistants are helpful (~70% of suggestions) but frustrating (~30% need corrections). Worse, developers make the **same corrections repeatedly** across sessions—valuable preferences disappear because the AI never "remembers."

**Why Existing Solutions Fall Short:**

| Approach | Problem |
|----------|---------|
| Manual `.cursorrules` updates | Too tedious to maintain regularly |
| Static custom instructions | Can't capture patterns in corrections |
| Prompt engineering per session | Doesn't accumulate learning |
| Workspace memory features | Limited scope, doesn't improve instructions |

**The RuleSmith Difference:** Treat your AI assistant's instructions as **learnable parameters** rather than static configuration. RuleSmith automatically recognizes correction patterns and proposes specific improvements—so your AI actually learns your preferences over time.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  1. Work with your AI assistant (Cursor, Copilot, etc.)      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Trigger: /rulesmith                                      │
│     → Analyzes conversation for corrections & patterns       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Review suggestions                                      │
│     → Approve, reject, or edit proposed rule improvements    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Rules updated automatically                             │
│     → Next session, your AI "remembers" your preferences     │
└─────────────────────────────────────────────────────────────┘
```

## What to Expect

After using RuleSmith consistently:

| Metric | Before | After (30 days) |
|--------|--------|-----------------|
| Corrections per session | Baseline | **↓ 50% reduction** |
| First-suggestion acceptance | ~70% | **↑ 90%** |
| Time saved per session | — | **10-15 minutes** |

**The "Aha!" Moment:** After a week of use, you'll notice you're accepting the AI's first suggestion without making corrections—and realize RuleSmith has been learning your preferences.

## Supported Platforms

| Platform | Status | Guide |
|----------|--------|-------|
| **Claude Code** | ✅ Native | [docs/CLAUDE-CODE.md](docs/CLAUDE-CODE.md) |
| **Cursor IDE** | ✅ Native | [docs/CURSOR.md](docs/CURSOR.md) |
| **GitHub Copilot** | ✅ Full Support | [docs/COPILOT.md](docs/COPILOT.md) |
| **VS Code + Copilot** | ✅ Full Support | [docs/VSCODE-COPILOT.md](docs/VSCODE-COPILOT.md) |
| **Qwen Code** | ✅ Adapter | [docs/QWEN-CODE.md](docs/QWEN-CODE.md) |
| **OpenCLAW** | ✅ Integration | [docs/OPENCLAW.md](docs/OPENCLAW.md) |
| **Hermes Agent** | ✅ Integration | [docs/HERMES.md](docs/HERMES.md) |

📖 **[Full Installation Guide](docs/INSTALLATION-GUIDE.md)**

## Installation

```bash
npm install rulesmith
```

## Quick Start

### As a Claude Code Skill

```bash
# Install the skill
cp -r .claude/skills/rulesmith ~/.claude/skills/

# Use in conversation
/rulesmith
```

### As a Node.js Module

```typescript
import { PatternDetector } from 'rulesmith';

const detector = new PatternDetector();
const patterns = await detector.analyze(conversationData);
```

## Usage Example

### Learning from Conversation Patterns (Cursor IDE)

**Scenario:** You've been working with Cursor on a TypeScript project and notice it keeps giving overly verbose explanations.

**Step 1: Have a conversation with Cursor**
```
You: Create a function to fetch user data

Cursor: [Long detailed explanation about async/await,
fetch API, error handling patterns... 15 sentences]

You: Too verbose. Just the code.

Cursor: [Provides code but still adds 8 sentences of explanation]

You: Less explanation, more code.
```

**Step 2: Invoke RuleSmith**
```
You: /rulesmith
```

**Step 3: Review the analysis**
```
📊 Conversation Analysis

**Corrections Found:** 2

**Patterns Identified:**

1. "Too verbose" / "Less explanation" (count: 2)
   Category: CODE_STYLE
   → Suggested rule: Keep explanations under 3 sentences

**Apply to .cursorrules?** (yes/no/edit)
```

**Step 4: Apply and verify**
```
You: yes

✓ Rules added to .cursorrules:
  # Keep explanations under 3 sentences

Next time you ask for code, Cursor will follow this rule automatically.
```

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Build
npm run build
```

## Project Structure

```
rulesmith/
├── src/
│   ├── pattern-detector.ts       # Pattern detection logic
│   ├── pattern-matcher.ts        # Pattern merging and analysis
│   ├── pattern-tracker.ts        # Pattern tracking and state management
│   ├── content-analyzer.ts       # Content analysis
│   ├── correction-classifier.ts  # Correction vs acceptance classification
│   ├── category-grouping.ts      # Pattern categorization
│   ├── frequency-analyzer.ts     # Frequency analysis
│   ├── conversation-loader.ts    # Conversation history loading
│   ├── state-management.ts       # State file management
│   └── visualization/            # Charts and reports
│       ├── chart-renderer.ts
│       ├── dashboard.ts
│       ├── report-generator.ts
│       └── ...
├── tests/
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # End-to-end tests
├── scripts/                      # Utility scripts
│   ├── generate-reports-yolo.ts
│   ├── analyze-trends.ts
│   └── ...
└── .claude/skills/rulesmith/    # Claude Code skill
```

## Key Features

### Pattern Categories

RuleSmith categorizes patterns into:

- **Code Style**: Naming conventions, formatting, structure
- **Terminology**: Word choice, phrases, acronyms
- **Structure**: File organization, code organization
- **Formatting**: Indentation, spacing, punctuation
- **Convention**: Team standards, best practices

### Data Schema

```typescript
interface MergedPattern extends Pattern {
  first_seen: string;          // ISO timestamp from historical or current session
  last_seen: string;           // Most recent occurrence timestamp
  session_count: number;       // Number of sessions where pattern appeared
  total_frequency: number;     // Cumulative frequency across all sessions
  is_new: boolean;             // True if first seen in current session
  frequency_change: number;    // Current session frequency vs. historical average
  pattern_text: string;
  count: number;
  category: PatternCategory;
  examples: PatternExample[];
  suggested_rule: string;
  content_types: ContentType[];
}
```

## Command Line Usage

```bash
# Show statistics
rulesmith --stats

# Show history
rulesmith --history

# Rollback to a specific backup
rulesmith --rollback --to <timestamp>

# Generate reports
rulesmith --report --format html
```

## Documentation

- [Installation Guide](docs/INSTALLATION-GUIDE.md)
- [Platform-Specific Guides](docs/)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)

## Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) before submitting PRs.

## License

MIT © [RuleSmith Contributors](LICENSE)

## Acknowledgments

Built for the AI assistant community to improve human-AI collaboration through better rule discovery and refinement.
