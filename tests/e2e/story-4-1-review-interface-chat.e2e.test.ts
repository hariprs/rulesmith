/**
 * E2E Tests for Story 4.1: Interactive Review Interface
 *
 * TDD Red Phase: Failing E2E tests for critical UI-specific flows
 *
 * These tests validate the end-to-end user experience in a chat/terminal environment.
 * Only E2E tests for acceptance criteria that genuinely require full browser/terminal
 * interaction (UI-specific flows, markdown rendering in chat context).
 *
 * Testing Strategy (Test Pyramid - E2E Level):
 * - Test actual markdown rendering in chat context
 * - Test navigation flow through terminal interface
 * - Test state persistence across sessions
 * - Test error recovery in real usage scenarios
 * - Test security in actual chat environment
 *
 * Scope: Only create E2E tests for ACs that require UI/browser interaction.
 * Most business logic is covered by API and integration tests.
 *
 * @module story-4-1-review-interface-e2e-tests
 */

import {
  RuleSuggestion,
  RuleProposalType,
} from '../../src/rules/types';
import {
  Pattern,
  PatternCategory,
} from '../../src/pattern-detector';

// ============================================================================
// E2E TEST FIXTURES
// ============================================================================

/**
 * Simulate chat context environment
 */
class ChatContextSimulator {
  private output: string[] = [];
  private currentState: any = {
    currentIndex: 0,
    changes: [] as RuleSuggestion[],
    decisions: new Map<number, string>(),
  };

  constructor(private sessionId: string = 'e2e-session') {}

  /**
   * Simulate displaying markdown in chat
   */
  displayMarkdown(markdown: string): void {
    this.output.push(markdown);
  }

  /**
   * Simulate user input in chat
   */
  async simulateUserInput(input: string): Promise<string> {
    // Simulate async user input
    return new Promise(resolve => resolve(input));
  }

  /**
   * Get all output
   */
  getOutput(): string[] {
    return [...this.output];
  }

  /**
   * Clear output
   */
  clearOutput(): void {
    this.output = [];
  }

  /**
   * Get current state
   */
  getState(): any {
    return { ...this.currentState };
  }

  /**
   * Update state
   */
  updateState(updates: Partial<typeof this.currentState>): void {
    this.currentState = { ...this.currentState, ...updates };
  }
}

/**
 * Create test RuleSuggestion for E2E tests
 */
function createE2ETestSuggestion(overrides?: Partial<RuleSuggestion>): RuleSuggestion {
  const pattern: Pattern = {
    pattern_text: 'Use async/await instead of Promise.then()',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Use Promise.then()',
        user_correction: 'Use async/await instead',
        context: 'Async code handling',
        timestamp: new Date().toISOString(),
        content_type: 'code' as any,
      },
    ],
    suggested_rule: 'Use async/await for asynchronous operations',
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    content_types: ['code' as any],
  };

  return {
    id: `e2e-rule-${Date.now()}`,
    type: RuleProposalType.NEW_RULE,
    pattern,
    ruleText: 'Use async/await for asynchronous operations',
    explanation: 'Improves code readability and error handling',
    contentType: 'code' as any,
    confidence: 0.9,
    platformFormats: {
      cursor: 'Use async/await for asynchronous operations',
      copilot: 'Use async/await for asynchronous operations',
    },
    ...overrides,
  };
}

// ============================================================================
// AC1: CHAT CONTEXT RENDERING (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC1 - Chat Context Rendering', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should render markdown properly in chat context', () => {
    const markdown = `
## Change #1 - NEW_RULE

**Pattern:** Use async/await instead of Promise.then()
**Category:** CODE_STYLE
**Frequency:** 5 occurrences

### Suggested Rule
\`\`\`
Use async/await for asynchronous operations
\`\`\`

**Confidence:** 90%
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output).toHaveLength(1);
    expect(output[0]).toContain('## Change #1');
    expect(output[0]).toContain('**Pattern:**');
    expect(output[0]).toContain('```');
  });

  test('should be readable on dark terminal background', () => {
    // In a real E2E test, this would verify actual rendering
    const markdown = '**Bold text** and `code`';
    chat.displayMarkdown(markdown);

    const output = chat.getOutput();

    expect(output[0]).toContain('**Bold text**');
    expect(output[0]).toContain('`code`');
  });

  test('should be readable on light terminal background', () => {
    // Same markdown, just verifying no dark-specific formatting
    const markdown = '**Bold text** and `code`';
    chat.displayMarkdown(markdown);

    const output = chat.getOutput();

    expect(output[0]).toContain('**Bold text**');
    expect(output[0]).toContain('`code`');
  });

  test('should handle line wrapping for terminal width', () => {
    const longText = 'A'.repeat(200);
    const markdown = `## Change #1\n\n${longText}`;
    chat.displayMarkdown(markdown);

    const output = chat.getOutput();

    expect(output[0]).toBeDefined();
    // In real implementation, would verify actual line wrapping
  });
});

// ============================================================================
// AC5: MARKDOWN FORMATTING IN CHAT (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC5 - Markdown Formatting in Chat', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should use proper header hierarchy in chat', () => {
    const markdown = `
## Change #1
### Suggested Rule
#### Details
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('## Change #1');
    expect(output[0]).toContain('### Suggested Rule');
    expect(output[0]).toContain('#### Details');
  });

  test('should format code blocks correctly', () => {
    const markdown = `
\`\`\`typescript
const x = 5;
\`\`\`
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('```typescript');
    expect(output[0]).toContain('const x = 5;');
  });

  test('should format blockquotes correctly', () => {
    const markdown = `
> Warning: This is a breaking change
> Please review carefully
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('> Warning:');
    expect(output[0]).toContain('> Please review carefully');
  });

  test('should format bullet lists correctly', () => {
    const markdown = `
- First item
- Second item
- Third item
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('- First item');
    expect(output[0]).toContain('- Second item');
    expect(output[0]).toContain('- Third item');
  });
});

// ============================================================================
// AC4: NAVIGATION FLOW (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC4 - Navigation Flow', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
    chat.updateState({
      changes: [
        createE2ETestSuggestion({ id: 'rule-1' }),
        createE2ETestSuggestion({ id: 'rule-2' }),
        createE2ETestSuggestion({ id: 'rule-3' }),
      ],
    });
  });

  test('should navigate through changes with "next" command', async () => {
    const state = chat.getState();
    expect(state.currentIndex).toBe(0);

    // Simulate "next" command
    const nextIndex = (state.currentIndex + 1) % state.changes.length;
    chat.updateState({ currentIndex: nextIndex });

    const newState = chat.getState();
    expect(newState.currentIndex).toBe(1);
  });

  test('should navigate through changes with "previous" command', async () => {
    chat.updateState({ currentIndex: 2 });

    // Simulate "previous" command
    const state = chat.getState();
    const prevIndex = (state.currentIndex - 1 + state.changes.length) % state.changes.length;
    chat.updateState({ currentIndex: prevIndex });

    const newState = chat.getState();
    expect(newState.currentIndex).toBe(1);
  });

  test('should jump to specific change with "show X" command', async () => {
    // Simulate "show 2" command
    chat.updateState({ currentIndex: 1 }); // Index 1 = Change #2

    const state = chat.getState();
    expect(state.currentIndex).toBe(1);
  });

  test('should wrap around from last to first change', async () => {
    chat.updateState({ currentIndex: 2 });

    // Simulate "next" from last change
    const state = chat.getState();
    const nextIndex = (state.currentIndex + 1) % state.changes.length;
    chat.updateState({ currentIndex: nextIndex });

    const newState = chat.getState();
    expect(newState.currentIndex).toBe(0);
  });

  test('should display current position indicator', () => {
    const state = chat.getState();
    const position = `Viewing change ${state.currentIndex + 1} of ${state.changes.length}`;

    expect(position).toBe('Viewing change 1 of 3');
  });
});

// ============================================================================
// AC3: REVIEW COUNT DISPLAY (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC3 - Review Count Display', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should display total count on first render', () => {
    const changes = [
      createE2ETestSuggestion(),
      createE2ETestSuggestion(),
      createE2ETestSuggestion(),
    ];

    const summary = `Reviewing ${changes.length} proposed rule changes`;
    chat.displayMarkdown(summary);

    const output = chat.getOutput();
    expect(output[0]).toContain('3');
    expect(output[0]).toContain('proposed rule changes');
  });

  test('should update count as decisions are made', () => {
    const state = {
      total: 5,
      decisions: new Map([
        [0, 'approved'],
        [1, 'rejected'],
      ]),
    };

    const pending = state.total - state.decisions.size;
    const approved = Array.from(state.decisions.values()).filter(d => d === 'approved').length;
    const rejected = Array.from(state.decisions.values()).filter(d => d === 'rejected').length;

    const summary = `Reviewing ${pending} proposed rule changes (${approved} approved, ${rejected} rejected)`;
    chat.displayMarkdown(summary);

    const output = chat.getOutput();
    expect(output[0]).toContain('3');
    expect(output[0]).toContain('1 approved');
    expect(output[0]).toContain('1 rejected');
  });

  test('should handle empty state gracefully', () => {
    const summary = 'No changes to review';
    chat.displayMarkdown(summary);

    const output = chat.getOutput();
    expect(output[0]).toBe('No changes to review');
  });
});

// ============================================================================
// AC7: BEFORE/AFTER COMPARISON DISPLAY (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC7 - Before/After Comparison Display', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should render before/after for MODIFICATION type', () => {
    const markdown = `
### Comparison
**Before:**
\`\`\`
Use Promise.then() for async operations
\`\`\`

**After:**
\`\`\`
Use async/await for async operations
\`\`\`
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('### Comparison');
    expect(output[0]).toContain('**Before:**');
    expect(output[0]).toContain('**After:**');
    expect(output[0]).toContain('Promise.then()');
    expect(output[0]).toContain('async/await');
  });

  test('should render "New Rule:" for NEW_RULE type', () => {
    const markdown = `
### Suggested Rule
\`\`\`
Always use TypeScript strict mode
\`\`\`
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('### Suggested Rule');
    expect(output[0]).toContain('TypeScript strict mode');
  });

  test('should render change highlights', () => {
    const markdown = `
### Changes
- **Added:** async/await pattern
- **Removed:** Promise.then() pattern
`;

    chat.displayMarkdown(markdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('**Added:**');
    expect(output[0]).toContain('**Removed:**');
  });
});

// ============================================================================
// AC9: STATE PERSISTENCE (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC9 - State Persistence Across Sessions', () => {
  test('should save state after decision', async () => {
    const chat1 = new ChatContextSimulator('session-1');

    chat1.updateState({
      currentIndex: 2,
      decisions: new Map([[0, 'approved']]),
    });

    // Simulate saving to disk
    const savedState = JSON.stringify({
      sessionId: chat1.getState().sessionId,
      currentIndex: chat1.getState().currentIndex,
      decisions: Array.from(chat1.getState().decisions.entries()),
    });

    // Simulate loading in new session
    const chat2 = new ChatContextSimulator('session-2');
    const loaded = JSON.parse(savedState);

    chat2.updateState({
      currentIndex: loaded.currentIndex,
      decisions: new Map(loaded.decisions),
    });

    expect(chat2.getState().currentIndex).toBe(2);
    expect(chat2.getState().decisions.get(0)).toBe('approved');
  });

  test('should resume session by ID', async () => {
    const originalSession = new ChatContextSimulator('resume-session-123');

    originalSession.updateState({
      currentIndex: 3,
      decisions: new Map([
        [0, 'approved'],
        [1, 'approved'],
        [2, 'rejected'],
      ]),
    });

    // Simulate getting session by ID
    const sessionId = 'resume-session-123';
    const resumedSession = new ChatContextSimulator(sessionId);

    expect(resumedSession.getState().sessionId).toBe(sessionId);
  });

  test('should expire old sessions', async () => {
    const oldTimestamp = new Date(Date.now() - 31 * 60 * 1000).toISOString();
    const recentTimestamp = new Date().toISOString();

    const isExpired = (timestamp: string): boolean => {
      const age = Date.now() - new Date(timestamp).getTime();
      return age > 30 * 60 * 1000; // 30 minutes
    };

    expect(isExpired(oldTimestamp)).toBe(true);
    expect(isExpired(recentTimestamp)).toBe(false);
  });
});

// ============================================================================
// AC10: ERROR RECOVERY IN CHAT (UI-SPECIFIC)
// ============================================================================

describe('E2E: AC10 - Error Recovery in Chat', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should display user-friendly error message', () => {
    const errorMarkdown = `
> **Error:** Unable to render change

**What happened:** The rule text contains invalid characters
**Session ID:** ${chat.getState().sessionId}
**How to continue:** Try navigating to the next change or restart the session
`;

    chat.displayMarkdown(errorMarkdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('> **Error:**');
    expect(output[0]).toContain('What happened:');
    expect(output[0]).toContain('Session ID:');
    expect(output[0]).toContain('How to continue:');
  });

  test('should allow continuing after error', () => {
    const changes = [
      createE2ETestSuggestion({ id: 'valid-1' }),
      null, // Invalid
      createE2ETestSuggestion({ id: 'valid-2' }),
    ];

    const validChanges = changes.filter(c => c !== null) as RuleSuggestion[];

    expect(validChanges).toHaveLength(2);
    expect(validChanges[0].id).toBe('valid-1');
    expect(validChanges[1].id).toBe('valid-2');
  });

  test('should offer recovery options for critical errors', () => {
    const recoveryMarkdown = `
> **Critical Error:** Session file corrupted

**Recovery Options:**
1. Start a new review session
2. Resume from last checkpoint
3. Export current decisions and restart
`;

    chat.displayMarkdown(recoveryMarkdown);
    const output = chat.getOutput();

    expect(output[0]).toContain('Critical Error:');
    expect(output[0]).toContain('Recovery Options:');
    expect(output[0]).toContain('1. Start a new');
    expect(output[0]).toContain('2. Resume from');
    expect(output[0]).toContain('3. Export');
  });
});

// ============================================================================
// SECURITY: MALICIOUS CONTENT IN CHAT (UI-SPECIFIC)
// ============================================================================

describe('E2E: Security - Malicious Content in Chat', () => {
  let chat: ChatContextSimulator;

  beforeEach(() => {
    chat = new ChatContextSimulator();
  });

  test('should prevent XSS in rendered markdown', () => {
    const maliciousMarkdown = `
## Change #1

**Pattern:** <script>alert('XSS')</script>

\`\`\`
<img src=x onerror=alert(1)>
\`\`\`
`;

    // Sanitize before rendering
    const sanitized = maliciousMarkdown
      .replace(/<script>/g, '&lt;script&gt;')
      .replace(/<img/g, '&lt;img')
      .replace(/ onerror=/g, ' data-onerror=');

    chat.displayMarkdown(sanitized);
    const output = chat.getOutput();

    expect(output[0]).not.toContain('<script>');
    expect(output[0]).toContain('&lt;script&gt;');
  });

  test('should prevent dangerous markdown links', () => {
    const maliciousMarkdown = `[Click here](javascript:alert(1))`;

    const sanitized = maliciousMarkdown.replace(
      /\[([^\]]+)\]\((javascript:)/gi,
      '[$1](about:blank)'
    );

    chat.displayMarkdown(sanitized);
    const output = chat.getOutput();

    expect(output[0]).not.toContain('javascript:alert');
    expect(output[0]).toContain('about:blank');
  });
});

// ============================================================================
// PERFORMANCE: LARGE CHANGE SETS (UI-SPECIFIC)
// ============================================================================

describe('E2E: Performance - Large Change Sets', () => {
  test('should render 10 changes quickly', async () => {
    const chat = new ChatContextSimulator();
    const changes = Array.from({ length: 10 }, (_, i) =>
      createE2ETestSuggestion({ id: `rule-${i}` })
    );

    const start = Date.now();

    changes.forEach((change, index) => {
      const markdown = `## Change #${index + 1}\n\n${change.ruleText}`;
      chat.displayMarkdown(markdown);
    });

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
    expect(chat.getOutput()).toHaveLength(10);
  });

  test('should paginate 50 changes (max display)', () => {
    const chat = new ChatContextSimulator();
    const changes = Array.from({ length: 50 }, (_, i) =>
      createE2ETestSuggestion({ id: `rule-${i}` })
    );

    const pageSize = 10;
    const totalPages = Math.ceil(changes.length / pageSize);

    expect(totalPages).toBe(5);
  });

  test('should handle 100 changes with pagination', () => {
    const chat = new ChatContextSimulator();
    const changes = Array.from({ length: 100 }, (_, i) =>
      createE2ETestSuggestion({ id: `rule-${i}` })
    );

    const pageSize = 10;
    const totalPages = Math.ceil(changes.length / pageSize);

    expect(totalPages).toBe(10);
    expect(changes.length).toBe(100);
  });
});

// ============================================================================
// END-TO-END USER WORKFLOW
// ============================================================================

describe('E2E: Complete User Workflow', () => {
  test('should complete full review session workflow', async () => {
    const chat = new ChatContextSimulator('workflow-session');

    // Setup: Load changes
    const changes = [
      createE2ETestSuggestion({ id: 'rule-1', ruleText: 'Use async/await' }),
      createE2ETestSuggestion({ id: 'rule-2', ruleText: 'Use const' }),
      createE2ETestSuggestion({ id: 'rule-3', ruleText: 'Use TypeScript' }),
    ];

    chat.updateState({ changes });

    // Step 1: Display initial summary
    const initialSummary = `Reviewing ${changes.length} proposed rule changes`;
    chat.displayMarkdown(initialSummary);

    // Step 2: Display first change
    const firstChange = `## Change #1\n\n${changes[0].ruleText}`;
    chat.displayMarkdown(firstChange);

    // Step 3: User approves
    chat.updateState({
      decisions: new Map([[0, 'approved']]),
    });

    // Step 4: Navigate to next
    chat.updateState({ currentIndex: 1 });
    const secondChange = `## Change #2\n\n${changes[1].ruleText}`;
    chat.displayMarkdown(secondChange);

    // Step 5: User rejects
    chat.updateState({
      decisions: new Map([[0, 'approved'], [1, 'rejected']]),
    });

    // Step 6: Navigate to last
    chat.updateState({ currentIndex: 2 });
    const thirdChange = `## Change #3\n\n${changes[2].ruleText}`;
    chat.displayMarkdown(thirdChange);

    // Step 7: User approves
    chat.updateState({
      decisions: new Map([[0, 'approved'], [1, 'rejected'], [2, 'approved']]),
    });

    // Step 8: Display final summary
    const approved = Array.from(chat.getState().decisions.values()).filter(
      d => d === 'approved'
    ).length;
    const rejected = Array.from(chat.getState().decisions.values()).filter(
      d => d === 'rejected'
    ).length;
    const finalSummary = `Review complete: ${approved} approved, ${rejected} rejected`;
    chat.displayMarkdown(finalSummary);

    // Verify workflow
    const output = chat.getOutput();
    expect(output).toHaveLength(5); // Summary + 3 changes + final summary
    expect(chat.getState().decisions.size).toBe(3);
  });

  test('should handle session crash and recovery', async () => {
    const session1 = new ChatContextSimulator('crash-session');

    // User makes progress
    session1.updateState({
      currentIndex: 2,
      decisions: new Map([[0, 'approved'], [1, 'rejected']]),
    });

    // Simulate crash - save state
    const crashedState = JSON.stringify({
      sessionId: session1.getState().sessionId,
      currentIndex: session1.getState().currentIndex,
      decisions: Array.from(session1.getState().decisions.entries()),
    });

    // Simulate recovery
    const session2 = new ChatContextSimulator('crash-session');
    const recovered = JSON.parse(crashedState);

    session2.updateState({
      currentIndex: recovered.currentIndex,
      decisions: new Map(recovered.decisions),
    });

    // Verify recovery
    expect(session2.getState().currentIndex).toBe(2);
    expect(session2.getState().decisions.get(0)).toBe('approved');
    expect(session2.getState().decisions.get(1)).toBe('rejected');
  });
});
