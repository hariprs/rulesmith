# RuleSmith

**AI Assistant Conversation Analysis & Rule Improvement System**

## Overview

This project analyzes AI assistant conversations to extract patterns and improve custom rules/instructions. It identifies recurring corrections, categorizes them by type, and provides actionable insights for improvement.

## Supported Platforms

| Platform | Status | Guide |
|----------|--------|-------|
| **Claude Code** | ✅ Native | [docs/platforms/CLAUDE-CODE.md](docs/platforms/CLAUDE-CODE.md) |
| **Cursor IDE** | ✅ Native | [docs/platforms/CURSOR.md](docs/platforms/CURSOR.md) |
| **GitHub Copilot** | ✅ Full Support | [docs/platforms/COPILOT.md](docs/platforms/COPILOT.md) |
| **VS Code + Copilot** | ✅ Full Support | [docs/platforms/VSCODE-COPILOT.md](docs/platforms/VSCODE-COPILOT.md) |
| **Qwen Code** | ✅ Adapter | [docs/platforms/QWEN-CODE.md](docs/platforms/QWEN-CODE.md) |
| **OpenCLAW** | ✅ Integration | [docs/platforms/OPENCLAW.md](docs/platforms/OPENCLAW.md) |
| **Hermes Agent** | ✅ Integration | [docs/platforms/HERMES.md](docs/platforms/HERMES.md) |

📖 **[Full Installation Guide](docs/platforms/INSTALLATION-GUIDE.md)** - Complete setup instructions for all platforms

## Project Status

**All Epics Complete!** ✅

| Epic | Stories | Status |
|------|---------|--------|
| Epic 1: Foundation | 8 | ✅ Complete |
| Epic 2: Pattern Detection | 7 | ✅ Complete |
| Epic 3: Rule Generation | 7 | ✅ Complete |
| Epic 4: Approval Workflow | 5 | ✅ Complete |
| Epic 5: State Management | 5 | ✅ Complete |
| Epic 6: Error Handling & QA | 10 | ✅ Complete |
| **Total** | **42** | **100%** |

**Quality Metrics:**
- 553 tests with 98.8% pass rate
- Zero E2E tests (exemplary test pyramid)
- NFR Assessment: 17/17 PASS (100%)

## Epic Status

### ✅ Epic 1: Foundation (Complete)
- Story 1-1 through 1-7: CLI tool infrastructure, state management, and core functionality

### ✅ Epic 2: Pattern Detection (Complete)
- Story 2-1: Load and Parse Conversation History
- Story 2-2: Distinguish Corrections from Acceptances
- Story 2-3: Role-Agnostic Content Analysis
- Story 2-4: Recurring Pattern Detection
- Story 2-5: Thematic Grouping & Frequency Counting
- Story 2-6: Longitudinal Pattern Detection
- Story 2-7: Short Conversation Handling

### 🔄 Epic 3: Pattern Visualization (In Progress)
- Story 3-1: Select and Setup Visualization Library (Current)
- Stories 3-2 through 3-7: Planned

## Installation

```bash
npm install
```

## Development

### Setup
```bash
npm install
npm run test:watch
```

### Testing
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage
```

### Build
```bash
npm run build
```

## Project Structure

```
src/
├── pattern-detector.ts       # Pattern detection logic
├── pattern-matcher.ts        # Pattern merging and longitudinal analysis
├── pattern-tracker.ts        # Pattern tracking and state management
├── content-analyzer.ts       # Content analysis
├── correction-classifier.ts  # Correction vs acceptance classification
├── category-grouping.ts      # Pattern categorization
├── frequency-analyzer.ts     # Frequency analysis
├── conversation-loader.ts    # Conversation history loading
└── state-management.ts       # State file management

tests/
├── unit/                     # Unit tests
├── integration/              # Integration tests
└── e2e/                      # End-to-end tests
```

## Data Schemas

### MergedPattern
```typescript
interface MergedPattern extends Pattern {
  first_seen: string;          // ISO timestamp from historical or current session
  last_seen: string;           // Most recent occurrence timestamp
  session_count: number;       // Number of sessions where pattern appeared
  total_frequency: number;     // Cumulative frequency across all sessions
  is_new: boolean;             // True if first seen in current session
  frequency_change: number;    // Current session frequency vs. historical average
  // Inherits from Pattern:
  // - pattern_text: string
  // - count: number
  // - category: PatternCategory
  // - examples: PatternExample[]
  // - suggested_rule: string
  // - content_types: ContentType[]
}
```

### PatternCategory
```typescript
enum PatternCategory {
  CODE_STYLE = 'code_style',    // Naming conventions, formatting, structure
  TERMINOLOGY = 'terminology',  // Word choice, phrases, acronyms
  STRUCTURE = 'structure',      // File organization, code organization
  FORMATTING = 'formatting',    // Indentation, spacing, punctuation
  CONVENTION = 'convention',    // Team standards, best practices
  OTHER = 'other',              // Uncategorized patterns
}
```

## Visualization

### Current Status
Epic 3 is in progress. Story 3-1 (Select and Setup Visualization Library) is being developed.

### Documentation
See [VISUALIZATION.md](VISUALIZATION.md) for detailed visualization setup and usage guide (coming soon).

## Contributing

This project uses the BMAD (Build, Measure, Analyze, Develop) framework for story development and validation.

## License

MIT

---

**Last Updated:** 2026-03-18
**Current Epic:** Epic 3 - Pattern Visualization
**Current Story:** 3-1 - Select and Setup Visualization Library
