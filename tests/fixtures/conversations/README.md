# Sample Conversation Data for Epic 2 Testing

This directory contains sample conversation files designed to test the prompt template pipeline (Conversation Analysis → Pattern Extraction → Rule Generation).

## File Structure

Each conversation file is a JSON object with the following structure:

```json
{
  "name": "conversation-name",
  "description": "Brief description of the test scenario",
  "conversation": [
    {
      "speaker": "AI|User",
      "message": "Message content"
    }
  ],
  "expected_analysis": {
    "corrections": [...],
    "conversation_length": 0,
    "total_corrections": 0,
    "analysis_summary": "..."
  },
  "expected_patterns": [...],
  "no_patterns_message": "..." (optional)
}
```

## Conversation Files

### 1. basic-corrections.json
**Purpose:** Simple conversation with single correction
**Scenario:** User corrects AI function naming (getUserData → fetchUserData)
**Expected Output:** 1 correction, 1 pattern

### 2. multiple-patterns.json
**Purpose:** Multiple recurring patterns across corrections
**Scenario:** User corrects structure, code style (quotes), and async patterns
**Expected Output:** 4 corrections, 3 patterns (code_style appears twice)

### 3. no-corrections.json
**Purpose:** User accepts all AI suggestions
**Scenario:** User responds positively without modifications
**Expected Output:** 0 corrections, 0 patterns

### 4. short-conversation.json
**Purpose:** Edge case - very short conversation
**Scenario:** Only one correction in 2-message conversation
**Expected Output:** 1 correction, 0 patterns (insufficient for pattern detection)

### 5. non-technical-role.json
**Purpose:** Role-agnostic analysis validation
**Scenario:** Product Manager correcting documentation/PRD
**Expected Output:** 3 corrections, 3 patterns (terminology, conventions)

### 6. empty-conversation.json
**Purpose:** Edge case - empty input
**Scenario:** No conversation messages
**Expected Output:** 0 corrections, empty result with specific message

### 7. malformed-input.json
**Purpose:** Edge case - malformed structure
**Scenario:** Missing speaker labels in messages
**Expected Output:** 0 corrections, format error message

## Usage in Tests

### Loading Conversations
```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

const conversationPath = join(__dirname, 'conversations', 'basic-corrections.json');
const conversationData = JSON.parse(readFileSync(conversationPath, 'utf-8'));

// Access conversation
const { conversation, expected_analysis, expected_patterns } = conversationData;
```

### Test Scenarios
```typescript
describe('Conversation Analysis', () => {
  it('should handle basic corrections', async () => {
    const data = loadConversation('basic-corrections.json');

    // Execute conversation analysis prompt
    const result = await analyzeConversation(data.conversation);

    // Verify against expected output
    expect(result.total_corrections).toBe(data.expected_analysis.total_corrections);
    expect(result.corrections).toHaveLength(1);
  });
});
```

## Expected Output Schema

### Conversation Analysis Output
```json
{
  "corrections": [
    {
      "correction_id": "string",
      "ai_suggestion": "string",
      "user_modification": "string",
      "confidence": "high|medium|low",
      "context": "string",
      "category": "code_style|structure|terminology|conventions|other"
    }
  ],
  "conversation_length": 0,
  "total_corrections": 0,
  "analysis_summary": "string"
}
```

### Pattern Extraction Output
```json
{
  "patterns": [
    {
      "pattern_id": "string",
      "category": "code_style|structure|terminology|conventions|other",
      "description": "string",
      "frequency": 0,
      "examples": ["string"]
    }
  ],
  "total_patterns": 0,
  "extraction_summary": "string",
  "no_patterns_message": "string" (optional)
}
```

## Adding New Conversations

When adding new sample conversations:

1. **Name the file descriptively:** `edge-case-name.json`
2. **Include all fields:** name, description, conversation, expected outputs
3. **Document the scenario:** What is being tested?
4. **Provide expected outputs:** What should the analysis produce?
5. **Test edge cases:** Empty, malformed, ambiguous cases
6. **Cover different roles:** Technical (Developer), Non-technical (PM, Designer)
7. **Vary conversation length:** Short (2-3), Medium (5-10), Long (10+)

## Validation

To validate conversation data:

```bash
# Validate JSON format
for file in tests/fixtures/conversations/*.json; do
  echo "Validating $file..."
  jq empty "$file" || echo "✗ Invalid JSON: $file"
done

# Check required fields
node scripts/validate-conversations.js
```

## Coverage Goals

- **Total conversations:** 7 files
- **Edge cases:** 3 (empty, malformed, short)
- **Role types:** 2 (technical, non-technical)
- **Pattern categories:** All 5 categories covered
- **Correction counts:** 0, 1, multiple corrections
- **Confidence levels:** high, medium, low (if applicable)

---

**Created:** 2026-03-17
**Purpose:** Epic 2 testing infrastructure
**Maintainer:** Elena (Junior Dev)
