---
name: rulesmith
description: Analyze AI conversations to identify correction patterns and generate rule improvements. Use when user asks to analyze conversation, improve rules, identify patterns from feedback, or learn from corrections. Works directly in conversation context - no external processing needed.
---

# RuleSmith

Analyze the current conversation to identify correction patterns and suggest rule improvements.

## When This Skill Triggers

Use this skill when:
- User asks to "analyze conversation" or "improve rules"
- User asks "what patterns do you see" or "what can we learn"
- User wants to extract feedback patterns from the conversation
- User invokes `/rulesmith`

## Analysis Workflow

When triggered, perform these steps:

### Step 1: Scan for Corrections

Look through the conversation for **corrections** - places where the user rejected, modified, or pushed back on your suggestions.

**Correction indicators:**
- "no", "not that", "don't", "stop", "wrong"
- "too X" (too complex, too simple, too verbose)
- "instead", "rather", "actually"
- "I prefer", "I want", "I need"
- Rejection followed by alternative approach

**Acceptance indicators (contrast):**
- "yes", "good", "perfect", "thanks"
- "exactly", "that works"
- Applying the suggestion without modification

### Step 2: Extract Patterns

For each correction, identify the **underlying pattern**:

| Correction Example | Pattern |
|-------------------|---------|
| "no, that's too strict" | Prefer conservative defaults |
| "too verbose" | Be concise |
| "don't use X library" | Avoid specific dependencies |
| "I'd rather do Y" | User prefers alternative approach |
| "maybe later" | Don't push optional features |
| "that's overkill" | Match solution to problem scope |

Group similar corrections together. Count occurrences.

### Step 3: Generate Rule Suggestions

Convert patterns into **specific, actionable rules**:

```
Pattern: User rejected overly strict validation
Rule: "Use permissive validation by default; add strict mode only when requested"

Pattern: User consistently asks for shorter responses
Rule: "Keep responses under X lines unless user explicitly requests detail"

Pattern: User rejects certain libraries/dependencies
Rule: "Avoid using [library] unless explicitly requested"
```

### Step 4: Present Findings

Format output as:

```
📊 Conversation Analysis

**Corrections Found:** N

**Patterns Identified:**
1. [Pattern name] (count: N)
   - Example: "[quote from conversation]"
   - Suggested rule: "[actionable rule]"

2. [Pattern name] (count: N)
   ...

**No major patterns** - conversation went smoothly
```

### Step 5: Update State (Optional)

If user wants to persist findings:
- Read `data/state.json`
- Append new patterns to `patterns_found` array
- Update `last_analysis` timestamp
- Write back to `data/state.json`

## Command Reference

The `/improve-rules` command provides database/backup features:

| Command | Purpose |
|---------|---------|
| `/improve-rules --stats` | Show tracked metrics |
| `/improve-rules --history` | Show recent improvements |
| `/improve-rules --rollback --to {timestamp}` | Restore from backup |

## State File Schema

`data/state.json`:
```json
{
  "last_analysis": "ISO-8601 timestamp",
  "patterns_found": ["pattern1", "pattern2"],
  "improvements_applied": 0,
  "corrections_reduction": 0,
  "platform": "claude-code",
  "_schema_note": "results.jsonl is append-only, one JSON object per line"
}
```

## Platform Detection

Detect platform based on files:
- `.cursorrules` exists → Cursor
- `.github/copilot-instructions.md` exists → Copilot
- Otherwise → Claude Code

Format rules appropriately:
- **Cursor**: Plain text with `#` comments
- **Copilot**: Markdown
- **Claude Code**: Markdown with specific formatting

## Error Format (AR22)

```
⚠️ Error: {Brief description}

**What happened:** {Detailed explanation}

**How to fix:** {Actionable steps}

**Technical details:** {Error codes, paths}
```

---

## Implementation Status

- Stories 1-1 through 1-8: Complete
- Story 1-9: Analysis Workflow (Option A) - Implemented
