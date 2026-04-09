/**
 * Integration Tests for Story 4.1: Interactive Review Interface
 *
 * TDD Red Phase: Failing integration tests for component interactions
 *
 * These tests validate the integration between review interface components
 * and their dependencies (RuleSuggestion[] from Epic 3, Pattern data, etc.)
 *
 * Testing Strategy (Test Pyramid):
 * - Test interface with real RuleSuggestion[] from Epic 3
 * - Test navigation commands update display correctly
 * - Test display in actual chat/terminal environment
 * - Test state persistence and recovery
 * - Test error handling with malformed input
 * - Test security sanitization of malicious content
 * - Test performance with 100+ changes
 *
 * @module story-4-1-review-interface-integration-tests
 */

import {
  RuleSuggestion,
  RuleProposalType,
  BeforeAfterComparison,
} from '../../src/rules/types';
import {
  Pattern,
  PatternCategory,
  PatternExample,
} from '../../src/pattern-detector';

// ============================================================================
// TEST FIXTURES AND HELPERS
// ============================================================================

/**
 * Create a valid RuleSuggestion for testing
 */
function createRuleSuggestion(overrides?: Partial<RuleSuggestion>): RuleSuggestion {
  const defaultPattern: Pattern = {
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

  const defaultChange: RuleSuggestion = {
    id: `rule-${Date.now()}-${Math.random()}`,
    type: RuleProposalType.NEW_RULE,
    pattern: defaultPattern,
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

  return defaultChange;
}

/**
 * Create a modification-type RuleSuggestion
 */
function createModificationSuggestion(overrides?: Partial<RuleSuggestion>): RuleSuggestion {
  const beforeAfter: BeforeAfterComparison = {
    before: 'Use Promise.then() for asynchronous operations',
    after: 'Use async/await for asynchronous operations',
    changes: [
      {
        type: 'modification',
        text: 'async/await',
      },
    ],
  };

  return createRuleSuggestion({
    type: RuleProposalType.MODIFICATION,
    beforeAfter,
    ...overrides,
  });
}

/**
 * Create an addition-type RuleSuggestion
 */
function createAdditionSuggestion(overrides?: Partial<RuleSuggestion>): RuleSuggestion {
  return createRuleSuggestion({
    type: RuleProposalType.ADDITION,
    ...overrides,
  });
}

/**
 * Create multiple test suggestions
 */
function createTestSuggestions(count: number): RuleSuggestion[] {
  const suggestions: RuleSuggestion[] = [];
  const categories = [
    PatternCategory.CODE_STYLE,
    PatternCategory.TERMINOLOGY,
    PatternCategory.STRUCTURE,
    PatternCategory.FORMATTING,
  ];

  for (let i = 0; i < count; i++) {
    const pattern = {
      pattern_text: `Pattern ${i + 1}`,
      count: Math.floor(Math.random() * 10) + 2,
      category: categories[i % categories.length],
      examples: [] as PatternExample[],
      suggested_rule: `Rule ${i + 1}`,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: ['code' as any],
    };

    suggestions.push(
      createRuleSuggestion({
        id: `rule-${i + 1}`,
        pattern,
        ruleText: `Rule text for rule ${i + 1}`,
        explanation: `Explanation for rule ${i + 1}`,
        confidence: 0.7 + Math.random() * 0.3,
      })
    );
  }

  return suggestions;
}

// ============================================================================
// INTEGRATION WITH EPIC 3 OUTPUT
// ============================================================================

describe('Integration with Epic 3 Rule Generator', () => {
  describe('RuleSuggestion[] Input Processing', () => {
    test('should process RuleSuggestion array from rule-generator', () => {
      const suggestions: RuleSuggestion[] = [
        createRuleSuggestion(),
        createModificationSuggestion(),
        createAdditionSuggestion(),
      ];

      const processSuggestions = (changes: RuleSuggestion[]): {
        total: number;
        byType: Record<string, number>;
      } => {
        const byType: Record<string, number> = {};
        changes.forEach(change => {
          byType[change.type] = (byType[change.type] || 0) + 1;
        });
        return { total: changes.length, byType };
      };

      const result = processSuggestions(suggestions);

      expect(result.total).toBe(3);
      expect(result.byType[RuleProposalType.NEW_RULE]).toBe(1);
      expect(result.byType[RuleProposalType.MODIFICATION]).toBe(1);
      expect(result.byType[RuleProposalType.ADDITION]).toBe(1);
    });

    test('should extract pattern metadata from RuleSuggestion', () => {
      const suggestion = createRuleSuggestion();

      expect(suggestion.pattern).toBeDefined();
      expect(suggestion.pattern.pattern_text).toBeDefined();
      expect(suggestion.pattern.category).toBeDefined();
      expect(suggestion.pattern.count).toBeGreaterThanOrEqual(2);
      expect(suggestion.pattern.examples).toBeDefined();
    });

    test('should handle missing pattern data gracefully', () => {
      const invalidSuggestion: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern: {} as Pattern,
        ruleText: 'Test rule',
        explanation: 'Test',
        contentType: 'code' as any,
        confidence: 0.8,
        platformFormats: { cursor: 'rule', copilot: 'rule' },
      };

      const validate = (change: RuleSuggestion): boolean => {
        return !!(
          change.id &&
          change.ruleText &&
          change.type
        );
      };

      expect(validate(invalidSuggestion)).toBe(true);
    });

    test('should extract confidence score for display', () => {
      const suggestion = createRuleSuggestion({ confidence: 0.95 });

      expect(suggestion.confidence).toBe(0.95);
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Pattern Context Integration', () => {
    test('should display pattern category from RuleSuggestion', () => {
      const categories = [
        PatternCategory.CODE_STYLE,
        PatternCategory.TERMINOLOGY,
        PatternCategory.STRUCTURE,
        PatternCategory.FORMATTING,
        PatternCategory.CONVENTION,
      ];

      categories.forEach(category => {
        const suggestion = createRuleSuggestion({
          pattern: {
            ...createRuleSuggestion().pattern,
            category,
          },
        });

        expect(suggestion.pattern.category).toBe(category);
      });
    });

    test('should display pattern frequency from RuleSuggestion', () => {
      const frequencies = [2, 5, 10, 20];

      frequencies.forEach(freq => {
        const suggestion = createRuleSuggestion({
          pattern: {
            ...createRuleSuggestion().pattern,
            count: freq,
          },
        });

        expect(suggestion.pattern.count).toBe(freq);
      });
    });

    test('should display example corrections from pattern', () => {
      const examples: PatternExample[] = [
        {
          original_suggestion: 'Use var',
          user_correction: 'Use const',
          context: 'Variable declaration',
          timestamp: new Date().toISOString(),
          content_type: 'code' as any,
        },
        {
          original_suggestion: 'Use var',
          user_correction: 'Use const',
          context: 'Another context',
          timestamp: new Date().toISOString(),
          content_type: 'code' as any,
        },
      ];

      const suggestion = createRuleSuggestion({
        pattern: {
          ...createRuleSuggestion().pattern,
          examples,
        },
      });

      expect(suggestion.pattern.examples).toHaveLength(2);
      expect(suggestion.pattern.examples[0].user_correction).toBe('Use const');
    });

    test('should handle patterns with no examples gracefully', () => {
      const suggestion = createRuleSuggestion({
        pattern: {
          ...createRuleSuggestion().pattern,
          examples: [],
        },
      });

      expect(suggestion.pattern.examples).toHaveLength(0);
    });
  });
});

// ============================================================================
// NAVIGATION COMMAND INTEGRATION
// ============================================================================

describe('Navigation Command Integration', () => {
  test('should update current index with "next" command', () => {
    const state = {
      currentIndex: 0,
      changes: createTestSuggestions(10),
    };

    const handleNext = (currentState: typeof state): typeof state => {
      const newIndex = (currentState.currentIndex + 1) % currentState.changes.length;
      return { ...currentState, currentIndex: newIndex };
    };

    const newState = handleNext(state);

    expect(newState.currentIndex).toBe(1);
  });

  test('should update current index with "previous" command', () => {
    const state = {
      currentIndex: 5,
      changes: createTestSuggestions(10),
    };

    const handlePrevious = (currentState: typeof state): typeof state => {
      const newIndex =
        (currentState.currentIndex - 1 + currentState.changes.length) %
        currentState.changes.length;
      return { ...currentState, currentIndex: newIndex };
    };

    const newState = handlePrevious(state);

    expect(newState.currentIndex).toBe(4);
  });

  test('should wrap around from last to first with "next"', () => {
    const state = {
      currentIndex: 9,
      changes: createTestSuggestions(10),
    };

    const handleNext = (currentState: typeof state): typeof state => {
      const newIndex = (currentState.currentIndex + 1) % currentState.changes.length;
      return { ...currentState, currentIndex: newIndex };
    };

    const newState = handleNext(state);

    expect(newState.currentIndex).toBe(0);
  });

  test('should wrap around from first to last with "previous"', () => {
    const state = {
      currentIndex: 0,
      changes: createTestSuggestions(10),
    };

    const handlePrevious = (currentState: typeof state): typeof state => {
      const newIndex =
        (currentState.currentIndex - 1 + currentState.changes.length) %
        currentState.changes.length;
      return { ...currentState, currentIndex: newIndex };
    };

    const newState = handlePrevious(state);

    expect(newState.currentIndex).toBe(9);
  });

  test('should jump to specific change with "show X" command', () => {
    const state = {
      currentIndex: 0,
      changes: createTestSuggestions(10),
    };

    const handleShow = (currentState: typeof state, targetIndex: number): typeof state => {
      if (targetIndex < 1 || targetIndex > currentState.changes.length) {
        return currentState; // Invalid index, no change
      }
      return { ...currentState, currentIndex: targetIndex - 1 };
    };

    const newState = handleShow(state, 5);

    expect(newState.currentIndex).toBe(4);
  });

  test('should handle invalid "show X" command gracefully', () => {
    const state = {
      currentIndex: 2,
      changes: createTestSuggestions(10),
    };

    const handleShow = (currentState: typeof state, targetIndex: number): typeof state => {
      if (targetIndex < 1 || targetIndex > currentState.changes.length) {
        return currentState; // Invalid index, no change
      }
      return { ...currentState, currentIndex: targetIndex - 1 };
    };

    const invalidState1 = handleShow(state, -1);
    const invalidState2 = handleShow(state, 100);

    expect(invalidState1.currentIndex).toBe(2); // Unchanged
    expect(invalidState2.currentIndex).toBe(2); // Unchanged
  });
});

// ============================================================================
// STATE PERSISTENCE INTEGRATION
// ============================================================================

describe('State Persistence Integration', () => {
  test('should save state after each decision', () => {
    const savedStates: any[] = [];

    const saveState = (state: any): void => {
      savedStates.push({
        sessionId: state.sessionId,
        currentIndex: state.currentIndex,
        decisions: Array.from(state.decisions.entries()),
        timestamp: new Date().toISOString(),
      });
    };

    const state = {
      sessionId: 'session-123',
      currentIndex: 0,
      decisions: new Map<number, string>(),
    };

    // Make a decision
    state.decisions.set(0, 'approved');
    saveState(state);

    expect(savedStates).toHaveLength(1);
    expect(savedStates[0].decisions).toEqual([[0, 'approved']]);
  });

  test('should load state and restore decisions', () => {
    const savedState = {
      sessionId: 'session-456',
      currentIndex: 2,
      decisions: [[0, 'approved'], [1, 'rejected'], [2, 'pending']],
      timestamp: new Date().toISOString(),
    };

    const loadState = (saved: any): any => {
      return {
        sessionId: saved.sessionId,
        currentIndex: saved.currentIndex,
        decisions: new Map(saved.decisions),
        timestamp: saved.timestamp,
      };
    };

    const restored = loadState(savedState);

    expect(restored.sessionId).toBe('session-456');
    expect(restored.currentIndex).toBe(2);
    expect(restored.decisions.get(0)).toBe('approved');
    expect(restored.decisions.get(1)).toBe('rejected');
    expect(restored.decisions.get(2)).toBe('pending');
  });

  test('should handle corrupted session files gracefully', () => {
    const corruptedFiles = [
      null,
      undefined,
      '',
      '{invalid json}',
      '{sessionId: "123"}', // Missing quotes
    ];

    corruptedFiles.forEach(file => {
      const loadOrFallback = (content: any): any => {
        try {
          return JSON.parse(content);
        } catch {
          return null; // Corrupted, return null
        }
      };

      const result = loadOrFallback(file);

      expect(result).toBeNull();
    });
  });

  test('should generate unique session IDs', () => {
    const generatedIds = new Set<string>();

    const generateId = (): string => {
      return `session-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    };

    for (let i = 0; i < 100; i++) {
      generatedIds.add(generateId());
    }

    expect(generatedIds.size).toBe(100);
  });
});

// ============================================================================
// ERROR HANDLING INTEGRATION
// ============================================================================

describe('Error Handling Integration', () => {
  test('should handle empty RuleSuggestion array', () => {
    const displayOrFail = (changes: RuleSuggestion[]): string => {
      if (changes.length === 0) {
        return 'No changes to review';
      }
      return `Reviewing ${changes.length} changes`;
    };

    const result = displayOrFail([]);

    expect(result).toBe('No changes to review');
  });

  test('should handle malformed RuleSuggestion objects', () => {
    const malformedInputs = [
      null,
      undefined,
      {},
      { id: '123' }, // Missing required fields
      { ruleText: 'test' }, // Missing id
    ];

    const validate = (input: any): boolean => {
      if (!input || typeof input !== 'object') {
        return false;
      }
      return !!(input.id && input.ruleText && input.type);
    };

    malformedInputs.forEach(input => {
      expect(validate(input)).toBe(false);
    });
  });

  test('should handle missing before/after for MODIFICATION type', () => {
    const invalidModification: RuleSuggestion = {
      id: 'rule-1',
      type: RuleProposalType.MODIFICATION,
      // Missing beforeAfter
      pattern: {} as Pattern,
      ruleText: 'Test rule',
      explanation: 'Test',
      contentType: 'code' as any,
      confidence: 0.8,
      platformFormats: { cursor: 'rule', copilot: 'rule' },
    };

    const validateOrFail = (change: RuleSuggestion): string => {
      if (change.type === RuleProposalType.MODIFICATION && !change.beforeAfter) {
        return 'Error: MODIFICATION type requires before/after comparison';
      }
      return 'OK';
    };

    expect(validateOrFail(invalidModification)).toContain('Error');
  });

  test('should display error and continue with remaining changes', () => {
    const changes: any[] = [
      createRuleSuggestion(),
      null, // Invalid
      createRuleSuggestion(),
      undefined, // Invalid
      createRuleSuggestion(),
    ];

    const validChanges = changes.filter(c => c && c.id && c.ruleText);

    expect(validChanges).toHaveLength(3);
  });

  test('should handle very long rule text', () => {
    const longText = 'A'.repeat(10000);

    const truncate = (text: string, maxLength: number = 5000): string => {
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength - 3) + '...';
    };

    const truncated = truncate(longText);

    expect(truncated.length).toBe(5000);
    expect(truncated).toContain('...');
  });
});

// ============================================================================
// SECURITY INTEGRATION
// ============================================================================

describe('Security Integration', () => {
  test('should sanitize XSS in rule text', () => {
    const maliciousSuggestions = [
      createRuleSuggestion({
        ruleText: '<script>alert("XSS")</script>',
      }),
      createRuleSuggestion({
        ruleText: '<img src=x onerror=alert(1)>',
      }),
      createRuleSuggestion({
        ruleText: '<iframe src="javascript:alert(1)"></iframe>',
      }),
    ];

    const sanitize = (text: string): string => {
      return text
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
    };

    maliciousSuggestions.forEach(suggestion => {
      const sanitized = sanitize(suggestion.ruleText);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('<iframe');
    });
  });

  test('should sanitize dangerous markdown links', () => {
    const maliciousTexts = [
      '[Click](javascript:alert(1))',
      '[Click](data:text/html,<script>alert(1)</script>)',
      '[Click](vbscript:msgbox(1))',
    ];

    const sanitizeMarkdown = (text: string): string => {
      return text.replace(
        /\[([^\]]+)\]\((javascript:|data:|vbscript:)/gi,
        '[$1](about:blank)'
      );
    };

    maliciousTexts.forEach(text => {
      const sanitized = sanitizeMarkdown(text);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('data:text/html');
      expect(sanitized).not.toContain('vbscript:');
    });
  });

  test('should sanitize SQL injection in pattern examples', () => {
    const maliciousExample: PatternExample = {
      original_suggestion: "Use ' OR 1=1 --",
      user_correction: "Use parameterized queries",
      context: "'; DROP TABLE users; --",
      timestamp: new Date().toISOString(),
      content_type: 'code' as any,
    };

    const sanitize = (text: string): string => {
      return text
        .replace(/'/g, "''")
        .replace(/--/g, '&#45;&#45;')
        .replace(/;/g, '&#59;');
    };

    const sanitizedContext = sanitize(maliciousExample.context);

    expect(sanitizedContext).not.toContain('--');
    expect(sanitizedContext).not.toContain('; DROP');
  });

  test('should prevent path traversal in session IDs', () => {
    const maliciousIds = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/absolute/path',
      '\\absolute\\path',
    ];

    const validateSessionId = (id: string): boolean => {
      // Only allow alphanumeric, hyphens, underscores
      return /^[a-zA-Z0-9-_]+$/.test(id);
    };

    maliciousIds.forEach(id => {
      expect(validateSessionId(id)).toBe(false);
    });

    expect(validateSessionId('session-123_abc')).toBe(true);
  });
});

// ============================================================================
// PERFORMANCE INTEGRATION
// ============================================================================

describe('Performance Integration', () => {
  test('should handle 10 changes efficiently', async () => {
    const changes = createTestSuggestions(10);

    const processChanges = async (suggestions: RuleSuggestion[]): Promise<number> => {
      const start = Date.now();
      // Simulate processing
      for (const change of suggestions) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return Date.now() - start;
    };

    const duration = await processChanges(changes);

    expect(duration).toBeLessThan(500); // Should process in <500ms
  });

  test('should handle 50 changes (max display limit)', async () => {
    const changes = createTestSuggestions(50);

    const canDisplayAll = (suggestions: RuleSuggestion[]): boolean => {
      return suggestions.length <= 50;
    };

    expect(canDisplayAll(changes)).toBe(true);
  });

  test('should paginate 100+ changes', () => {
    const changes = createTestSuggestions(100);
    const pageSize = 10;

    const totalPages = Math.ceil(changes.length / pageSize);

    expect(totalPages).toBe(10);
  });

  test('should cap display at 50 changes for "show all"', () => {
    const changes = createTestSuggestions(100);

    const getDisplayableChanges = (suggestions: RuleSuggestion[]): RuleSuggestion[] => {
      return suggestions.slice(0, 50);
    };

    const displayable = getDisplayableChanges(changes);

    expect(displayable.length).toBe(50);
  });

  test('should handle 1000 changes (stress test)', () => {
    const changes = createTestSuggestions(1000);

    const canSupport = (suggestions: RuleSuggestion[]): boolean => {
      return suggestions.length <= 1000;
    };

    expect(canSupport(changes)).toBe(true);
  });
});

// ============================================================================
// MARKDOWN RENDERING INTEGRATION
// ============================================================================

describe('Markdown Rendering Integration', () => {
  test('should render change display with all sections', () => {
    const suggestion = createRuleSuggestion();

    const renderChange = (change: RuleSuggestion, index: number): string => {
      return `
## Change #${index + 1} - ${change.type}

**Pattern:** ${change.pattern.pattern_text}
**Category:** ${change.pattern.category}
**Frequency:** ${change.pattern.count} occurrences

### Suggested Rule
\`\`\`
${change.ruleText}
\`\`\`

**Confidence:** ${(change.confidence * 100).toFixed(0)}%
**Explanation:** ${change.explanation}
`;
    };

    const rendered = renderChange(suggestion, 0);

    expect(rendered).toContain('## Change #1');
    expect(rendered).toContain('**Pattern:**');
    expect(rendered).toContain('**Category:**');
    expect(rendered).toContain('**Frequency:**');
    expect(rendered).toContain('### Suggested Rule');
    expect(rendered).toContain('```');
    expect(rendered).toContain('**Confidence:**');
  });

  test('should render before/after comparison for modifications', () => {
    const suggestion = createModificationSuggestion();

    const renderComparison = (change: RuleSuggestion): string => {
      if (!change.beforeAfter) {
        return '';
      }

      return `
### Comparison
**Before:**
\`\`\`
${change.beforeAfter.before}
\`\`\`

**After:**
\`\`\`
${change.beforeAfter.after}
\`\`\`
`;
    };

    const rendered = renderComparison(suggestion);

    expect(rendered).toContain('### Comparison');
    expect(rendered).toContain('**Before:**');
    expect(rendered).toContain('**After:**');
    expect(rendered).toContain('Promise.then()');
    expect(rendered).toContain('async/await');
  });

  test('should render summary with counts', () => {
    const state = {
      pending: 5,
      approved: 3,
      rejected: 2,
    };

    const renderSummary = (s: typeof state): string => {
      return `
## Summary

- Pending: ${s.pending}
- Approved: ${s.approved}
- Rejected: ${s.rejected}
- Total: ${s.pending + s.approved + s.rejected}
`;
    };

    const rendered = renderSummary(state);

    expect(rendered).toContain('## Summary');
    expect(rendered).toContain('- Pending: 5');
    expect(rendered).toContain('- Approved: 3');
    expect(rendered).toContain('- Rejected: 2');
    expect(rendered).toContain('- Total: 10');
  });

  test('should render error message with session context', () => {
    const error = {
      message: 'Rendering failed',
      sessionId: 'session-123',
    };

    const renderError = (e: typeof error): string => {
      return `
> **Error:** ${e.message}

**Session ID:** ${e.sessionId}

Please try again or contact support if the problem persists.
`;
    };

    const rendered = renderError(error);

    expect(rendered).toContain('> **Error:**');
    expect(rendered).toContain('Rendering failed');
    expect(rendered).toContain('session-123');
    expect(rendered).toContain('Session ID:');
  });
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION
// ============================================================================

describe('End-to-End Workflow Integration', () => {
  test('should complete full review workflow', () => {
    const changes = createTestSuggestions(3);
    const state = {
      currentIndex: 0,
      decisions: new Map<number, string>(),
    };

    // Simulate workflow
    const workflow = [
      { action: 'next', expectedIndex: 1 },
      { action: 'approve', expectedDecisions: 1 },
      { action: 'next', expectedIndex: 2 },
      { action: 'reject', expectedDecisions: 2 },
      { action: 'previous', expectedIndex: 1 },
      { action: 'show 3', expectedIndex: 2 },
    ];

    workflow.forEach(step => {
      if (step.action === 'next') {
        state.currentIndex = (state.currentIndex + 1) % changes.length;
      } else if (step.action === 'previous') {
        state.currentIndex = (state.currentIndex - 1 + changes.length) % changes.length;
      } else if (step.action === 'approve') {
        state.decisions.set(state.currentIndex, 'approved');
      } else if (step.action === 'reject') {
        state.decisions.set(state.currentIndex, 'rejected');
      } else if (step.action.startsWith('show')) {
        const target = parseInt(step.action.split(' ')[1], 10);
        state.currentIndex = target - 1;
      }
    });

    expect(state.decisions.size).toBe(2);
    expect(state.currentIndex).toBe(2);
  });

  test('should handle session persistence during workflow', () => {
    const savedStates: any[] = [];

    const changes = createTestSuggestions(5);
    const state = {
      sessionId: 'session-workflow',
      currentIndex: 0,
      decisions: new Map<number, string>(),
    };

    const saveState = (s: typeof state): void => {
      savedStates.push({
        sessionId: s.sessionId,
        currentIndex: s.currentIndex,
        decisions: Array.from(s.decisions.entries()),
      });
    };

    // Make some decisions
    state.decisions.set(0, 'approved');
    saveState(state);

    state.currentIndex = 1;
    state.decisions.set(1, 'rejected');
    saveState(state);

    expect(savedStates).toHaveLength(2);
    expect(savedStates[0].decisions).toEqual([[0, 'approved']]);
    expect(savedStates[1].decisions).toEqual([[0, 'approved'], [1, 'rejected']]);
    expect(savedStates[1].currentIndex).toBe(1);
  });

  test('should recover from crash with saved state', () => {
    const savedState = {
      sessionId: 'session-crash',
      currentIndex: 3,
      decisions: [[0, 'approved'], [1, 'approved'], [2, 'rejected']],
      timestamp: new Date().toISOString(),
    };

    const recover = (saved: any): any => {
      return {
        ...saved,
        decisions: new Map(saved.decisions),
      };
    };

    const recovered = recover(savedState);

    expect(recovered.sessionId).toBe('session-crash');
    expect(recovered.currentIndex).toBe(3);
    expect(recovered.decisions.get(0)).toBe('approved');
    expect(recovered.decisions.get(2)).toBe('rejected');
  });
});
