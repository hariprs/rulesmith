# Pattern Extraction Prompt

## Context

You are a pattern recognition specialist analyzing a set of corrections extracted from a conversation between a user and an AI assistant. These corrections were identified by the conversation analysis phase and represent instances where the user modified, rejected, or redirected the AI's suggestions.

Your goal is to identify **recurring patterns** — themes that appear across multiple corrections within this single conversation. These patterns reveal the user's preferences, conventions, and working style that the AI assistant failed to learn. The patterns you extract will be used downstream to generate specific improvement rules for the user's AI assistant configuration.

You are looking for **what the user consistently wants differently**, not one-off adjustments.

## Task

Analyze the provided corrections array and perform the following steps:

### Step 1: Group Corrections by Similarity

Examine each correction and look for recurring themes — cases where the user made similar types of changes multiple times. A pattern requires **at least 2 corrections** that share a common theme. A single correction alone cannot form a pattern.

When evaluating corrections, consider the `confidence` field:
- **high** confidence corrections: Full weight in pattern detection
- **medium** confidence corrections: Include in pattern detection but note the reduced certainty
- **low** confidence corrections: Do not let a single low-confidence correction create a pattern on its own. Only include low-confidence corrections if they reinforce an existing pattern established by higher-confidence corrections.

### Step 2: Assign Thematic Categories

Assign each identified pattern to exactly one of these categories:

| Category | Description | Examples |
|----------|-------------|----------|
| `code_style` | Formatting, syntax preferences, naming conventions in code | Preferring async/await over Promises, tab vs spaces, semicolons |
| `structure` | File organization, component architecture, code structure | Preferring flat imports, specific folder layouts, module patterns |
| `terminology` | Naming choices, wording preferences, vocabulary | Variable naming patterns, documentation wording, API naming |
| `conventions` | Process, workflow, or methodology preferences | Testing approaches, commit message style, review practices |
| `other` | Corrections that don't fit the above categories | Miscellaneous preferences |

If a pattern could fit multiple categories, choose the most specific one. Prefer `code_style`, `structure`, `terminology`, or `conventions` over `other`.

### Step 3: Count Frequency

For each pattern, count how many corrections from the input contribute to it. A correction can contribute to at most one pattern. If a correction could match multiple patterns, assign it to the most specific pattern.

### Step 4: Handle No Patterns

If no recurring patterns are found (the corrections array is empty, all corrections are unique one-offs, there is only one correction, or all corrections have low confidence):
- Return an empty `patterns` array
- Set `no_patterns_message` to explain why no patterns were found
- This is a valid outcome, not an error

If the corrections array is empty (0 items), return immediately with `no_patterns_message`: "No corrections provided — nothing to analyze for patterns."

## Input

The input is the JSON output from the conversation analysis phase (`analyze-conversation.md`). It has the following structure:

```json
{
  "corrections": [
    {
      "original_suggestion": "What the AI originally suggested",
      "user_correction": "How the user modified or corrected it",
      "context": "Brief explanation of the change",
      "timestamp": "2026-03-15T14:30:00Z",
      "content_type": "code|documentation|diagram|other",
      "confidence": "high|medium|low"
    }
  ],
  "total_corrections": 1,
  "conversation_length": 15,
  "analysis_summary": "Found 1 correction in 15 message exchanges"
}
```

**Field Descriptions:**

| Field | Type | Description |
|-------|------|-------------|
| `corrections` | array | Array of correction objects from conversation analysis |
| `original_suggestion` | string | What the AI originally suggested |
| `user_correction` | string | How the user modified or corrected it |
| `context` | string | Brief explanation of the change |
| `timestamp` | string | ISO 8601 UTC timestamp of the correction |
| `content_type` | string | Type of content: `code`, `documentation`, `diagram`, `other` |
| `confidence` | string | Detection confidence: `high`, `medium`, `low` |
| `total_corrections` | number | Total number of corrections found |
| `conversation_length` | number | Number of message exchanges in the conversation |
| `analysis_summary` | string | Summary of the analysis |

## Output Format

Return a JSON object with the following structure:

```json
{
  "patterns": [
    {
      "pattern_text": "User prefers async/await over Promise chains",
      "frequency": 3,
      "category": "code_style",
      "first_seen": "2026-03-15T14:30:00Z"
    }
  ],
  "total_patterns": 1,
  "no_patterns_message": null,
  "analysis_notes": "Identified 1 recurring pattern from 5 corrections"
}
```

**Schema Details:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `patterns` | array | Yes | Array of pattern objects (empty if none found) |
| `pattern_text` | string | Yes | Human-readable description of the recurring pattern |
| `frequency` | number | Yes | How many corrections contribute to this pattern (minimum 2) |
| `category` | string | Yes | One of: `code_style`, `structure`, `terminology`, `conventions`, `other` |
| `first_seen` | string | Yes | ISO 8601 UTC timestamp of the earliest correction in this pattern |
| `total_patterns` | number | Yes | Count of patterns in the array |
| `no_patterns_message` | string\|null | Yes | Null when patterns exist; explanatory message when patterns array is empty |
| `analysis_notes` | string | Yes | Brief summary of the analysis outcome |

**Sorting:** Patterns should be sorted by `frequency` in descending order (most frequent first).

## Examples

### Example 1: Multiple Corrections Forming a Clear Pattern

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Use Promise.then() chain for the API call",
      "user_correction": "Rewrite using async/await instead",
      "context": "User prefers async/await syntax for asynchronous operations",
      "timestamp": "2026-03-15T14:30:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Fetch data with .then().catch() pattern",
      "user_correction": "Use try/catch with await instead",
      "context": "User again corrected Promise-based code to async/await",
      "timestamp": "2026-03-15T14:35:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Chain the database queries with .then()",
      "user_correction": "Use sequential await calls",
      "context": "Third instance of user preferring async/await over Promises",
      "timestamp": "2026-03-15T14:40:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Name the variable userData",
      "user_correction": "Use user_data instead",
      "context": "User corrected camelCase to snake_case",
      "timestamp": "2026-03-15T14:45:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Name the function getResults",
      "user_correction": "Use get_results instead",
      "context": "User again corrected camelCase to snake_case",
      "timestamp": "2026-03-15T14:50:00Z",
      "content_type": "code",
      "confidence": "high"
    }
  ],
  "total_corrections": 5,
  "conversation_length": 20,
  "analysis_summary": "Found 5 corrections in 20 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [
    {
      "pattern_text": "User prefers async/await syntax over Promise.then() chains for asynchronous operations",
      "frequency": 3,
      "category": "code_style",
      "first_seen": "2026-03-15T14:30:00Z"
    },
    {
      "pattern_text": "User prefers snake_case over camelCase for variable and function naming",
      "frequency": 2,
      "category": "terminology",
      "first_seen": "2026-03-15T14:45:00Z"
    }
  ],
  "total_patterns": 2,
  "no_patterns_message": null,
  "analysis_notes": "Identified 2 recurring patterns from 5 corrections. All 5 corrections mapped to patterns."
}
```

### Example 2: Corrections Spanning Multiple Categories

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Place the helper function in utils/helpers.js",
      "user_correction": "Put it in the same file as the component that uses it",
      "context": "User prefers co-locating helpers with their consumers",
      "timestamp": "2026-03-15T15:00:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Create a shared utils directory for common functions",
      "user_correction": "Keep functions in the module that uses them",
      "context": "User again prefers co-location over shared directories",
      "timestamp": "2026-03-15T15:10:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Write the test description as 'it should return the correct value'",
      "user_correction": "Use 'returns correct value when given valid input'",
      "context": "User prefers descriptive test names without 'should'",
      "timestamp": "2026-03-15T15:15:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "it('should handle errors gracefully')",
      "user_correction": "it('throws ValidationError when input is null')",
      "context": "User again removed 'should' and made test name more specific",
      "timestamp": "2026-03-15T15:20:00Z",
      "content_type": "code",
      "confidence": "medium"
    }
  ],
  "total_corrections": 4,
  "conversation_length": 18,
  "analysis_summary": "Found 4 corrections in 18 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [
    {
      "pattern_text": "User prefers co-locating helper functions with their consumers rather than using shared utility directories",
      "frequency": 2,
      "category": "structure",
      "first_seen": "2026-03-15T15:00:00Z"
    },
    {
      "pattern_text": "User prefers specific, descriptive test names without 'should' prefix",
      "frequency": 2,
      "category": "conventions",
      "first_seen": "2026-03-15T15:15:00Z"
    }
  ],
  "total_patterns": 2,
  "no_patterns_message": null,
  "analysis_notes": "Identified 2 recurring patterns from 4 corrections across structure and conventions categories."
}
```

### Example 3: No Patterns Detected — All Unique Corrections

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Use a for loop to iterate",
      "user_correction": "Use Array.map() instead",
      "context": "User preferred functional approach for this case",
      "timestamp": "2026-03-15T16:00:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Add a try-catch block around the database call",
      "user_correction": "Use a global error handler middleware instead",
      "context": "User wanted centralized error handling",
      "timestamp": "2026-03-15T16:20:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Document the API endpoint in the README",
      "user_correction": "Add it to the OpenAPI spec instead",
      "context": "User prefers machine-readable API documentation",
      "timestamp": "2026-03-15T16:40:00Z",
      "content_type": "documentation",
      "confidence": "medium"
    }
  ],
  "total_corrections": 3,
  "conversation_length": 25,
  "analysis_summary": "Found 3 corrections in 25 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [],
  "total_patterns": 0,
  "no_patterns_message": "No recurring patterns detected. All 3 corrections appear to be unique, one-time adjustments covering different aspects (iteration style, error handling, documentation format). Consider analyzing more conversations to identify cross-session patterns.",
  "analysis_notes": "Analyzed 3 corrections but found no recurring themes. Each correction addresses a different topic."
}
```

### Example 4: Single Correction — Cannot Form Pattern

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Use console.log for debugging",
      "user_correction": "Use the debugger statement instead",
      "context": "User prefers native debugging over console",
      "timestamp": "2026-03-15T17:00:00Z",
      "content_type": "code",
      "confidence": "high"
    }
  ],
  "total_corrections": 1,
  "conversation_length": 10,
  "analysis_summary": "Found 1 correction in 10 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [],
  "total_patterns": 0,
  "no_patterns_message": "Cannot identify recurring patterns from a single correction. A minimum of 2 similar corrections is needed to establish a pattern. This correction may become part of a pattern in future analysis sessions.",
  "analysis_notes": "Only 1 correction provided — insufficient for pattern detection."
}
```

### Example 5: Ambiguous Grouping — Categorization Logic

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Name the CSS class 'user-profile-card'",
      "user_correction": "Use 'UserProfileCard' as the component name and 'user-profile-card' only for CSS",
      "context": "User wants PascalCase for components, kebab-case only for CSS",
      "timestamp": "2026-03-15T18:00:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Name the component file 'user-profile.tsx'",
      "user_correction": "Use 'UserProfile.tsx' with PascalCase",
      "context": "User enforces PascalCase for component file names",
      "timestamp": "2026-03-15T18:10:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Export as default export",
      "user_correction": "Use named exports only",
      "context": "User prefers named exports for better IDE autocomplete",
      "timestamp": "2026-03-15T18:20:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "original_suggestion": "Export the utility function as default",
      "user_correction": "Named export, never use default exports",
      "context": "User reiterated preference for named exports",
      "timestamp": "2026-03-15T18:25:00Z",
      "content_type": "code",
      "confidence": "high"
    }
  ],
  "total_corrections": 4,
  "conversation_length": 15,
  "analysis_summary": "Found 4 corrections in 15 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [
    {
      "pattern_text": "User requires named exports exclusively — never use default exports",
      "frequency": 2,
      "category": "code_style",
      "first_seen": "2026-03-15T18:20:00Z"
    },
    {
      "pattern_text": "User enforces PascalCase naming for React components and their file names",
      "frequency": 2,
      "category": "terminology",
      "first_seen": "2026-03-15T18:00:00Z"
    }
  ],
  "total_patterns": 2,
  "no_patterns_message": null,
  "analysis_notes": "Identified 2 patterns from 4 corrections. The naming pattern (PascalCase for components) was categorized as 'terminology' rather than 'code_style' because it specifically concerns naming choices. The export preference was categorized as 'code_style' because it concerns syntax/structure patterns."
}
```

### Example 6: All Low-Confidence Corrections

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Consider using a switch statement here",
      "user_correction": "I'll keep the if-else for now",
      "context": "Unclear if this is a firm preference or situational",
      "timestamp": "2026-03-15T19:00:00Z",
      "content_type": "code",
      "confidence": "low"
    },
    {
      "original_suggestion": "You could add TypeScript types",
      "user_correction": "Not right now, maybe later",
      "context": "User deferred typing — may not be a real correction",
      "timestamp": "2026-03-15T19:10:00Z",
      "content_type": "code",
      "confidence": "low"
    }
  ],
  "total_corrections": 2,
  "conversation_length": 12,
  "analysis_summary": "Found 2 corrections in 12 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [],
  "total_patterns": 0,
  "no_patterns_message": "All corrections have low confidence, which means they may not represent firm user preferences. Low-confidence corrections alone are insufficient to establish reliable patterns. Higher-confidence corrections are needed to form actionable patterns.",
  "analysis_notes": "2 corrections analyzed but all have low confidence — insufficient certainty to establish patterns."
}
```

### Example 7: Malformed Input — Graceful Handling

**Input:**
```json
{
  "corrections": [
    {
      "original_suggestion": "Use var for variable declaration",
      "user_correction": "Always use const or let, never var",
      "context": "User enforces modern JS variable declarations",
      "timestamp": "2026-03-15T20:00:00Z",
      "content_type": "code",
      "confidence": "high"
    },
    {
      "user_correction": "Use const for this",
      "context": "Missing original_suggestion field"
    },
    {
      "original_suggestion": "Declare with var",
      "user_correction": "Use const",
      "context": "Another var-to-const correction",
      "timestamp": "2026-03-15T20:10:00Z",
      "content_type": "code",
      "confidence": "high"
    }
  ],
  "total_corrections": 3,
  "conversation_length": 14,
  "analysis_summary": "Found 3 corrections in 14 message exchanges"
}
```

**Output:**
```json
{
  "patterns": [
    {
      "pattern_text": "User requires const/let declarations instead of var — enforce modern JavaScript variable syntax",
      "frequency": 2,
      "category": "code_style",
      "first_seen": "2026-03-15T20:00:00Z"
    }
  ],
  "total_patterns": 1,
  "no_patterns_message": null,
  "analysis_notes": "Identified 1 pattern from 3 corrections. Note: 1 correction had missing fields (original_suggestion, timestamp, content_type, confidence) and was skipped in pattern analysis. The 2 complete corrections formed a clear pattern."
}
```
