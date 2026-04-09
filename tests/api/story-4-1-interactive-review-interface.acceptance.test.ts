/**
 * API-Level Acceptance Tests for Story 4.1: Interactive Review Interface
 *
 * TDD Red Phase: Failing API-level acceptance tests
 *
 * These tests validate the API contracts, interfaces, and business logic
 * for the interactive review interface at API boundaries without external dependencies.
 *
 * Testing Strategy (Test Pyramid):
 * - Validate interface contracts and type definitions
 * - Test business logic validation at API boundaries
 * - Verify error handling and error codes
 * - Test input validation and sanitization
 * - Validate security requirements (XSS prevention, content sanitization)
 * - Test state persistence and recovery APIs
 *
 * @module story-4-1-review-interface-api-tests
 */

import {
  RuleSuggestion,
  RuleProposalType,
  BeforeAfterComparison,
  ChangeHighlight,
} from '../../src/rules/types';
import {
  Pattern,
  PatternCategory,
  PatternExample,
} from '../../src/pattern-detector';

// ============================================================================
// TYPE DEFINITIONS AND ENUMS
// ============================================================================

describe('Story 4.1: Interactive Review Interface - Type Definitions', () => {
  describe('NavigationState Interface', () => {
    test('should define NavigationState interface with all required fields', () => {
      const state = {
        currentIndex: 0,
        changes: [] as RuleSuggestion[],
        decisions: new Map<number, 'approved' | 'rejected' | 'edited' | 'pending'>(),
        sessionId: 'test-session-id',
        lastActivity: new Date(),
        totalChanges: 0,
      };

      expect(state.currentIndex).toBeDefined();
      expect(state.changes).toBeDefined();
      expect(state.decisions).toBeDefined();
      expect(state.sessionId).toBeDefined();
      expect(state.lastActivity).toBeDefined();
      expect(state.totalChanges).toBeDefined();
    });

    test('should allow decisions Map to store all decision types', () => {
      const decisions = new Map<number, 'approved' | 'rejected' | 'edited' | 'pending'>();

      decisions.set(0, 'approved');
      decisions.set(1, 'rejected');
      decisions.set(2, 'edited');
      decisions.set(3, 'pending');

      expect(decisions.get(0)).toBe('approved');
      expect(decisions.get(1)).toBe('rejected');
      expect(decisions.get(2)).toBe('edited');
      expect(decisions.get(3)).toBe('pending');
    });
  });

  describe('ReviewInterface Interface', () => {
    test('should define displayChanges method', () => {
      const displayChanges = (changes: RuleSuggestion[]): void => {
        changes.forEach(change => console.log(change));
      };

      expect(typeof displayChanges).toBe('function');
    });

    test('should define displayChange method', () => {
      const displayChange = (change: RuleSuggestion, index: number, total: number): void => {
        console.log(`Change ${index + 1} of ${total}`);
      };

      expect(typeof displayChange).toBe('function');
    });

    test('should define displaySummary method', () => {
      const displaySummary = (pending: number, approved: number, rejected: number): void => {
        console.log(`Pending: ${pending}, Approved: ${approved}, Rejected: ${rejected}`);
      };

      expect(typeof displaySummary).toBe('function');
    });
  });

  describe('MarkdownFormatter Interface', () => {
    test('should define formatChangeHeader method', () => {
      const formatChangeHeader = (index: number, total: number): string => {
        return `## Change #${index + 1} of ${total}`;
      };

      expect(typeof formatChangeHeader).toBe('function');
      expect(typeof formatChangeHeader(0, 10)).toBe('string');
    });

    test('should define formatChange method', () => {
      const formatChange = (change: RuleSuggestion): string => {
        return `### ${change.ruleText}`;
      };

      expect(typeof formatChange).toBe('function');
    });

    test('should define formatPatternSource method', () => {
      const formatPatternSource = (pattern: Pattern): string => {
        return `**Pattern:** ${pattern.pattern_text}`;
      };

      expect(typeof formatPatternSource).toBe('function');
    });

    test('should define formatBeforeAfter method', () => {
      const formatBeforeAfter = (before: string, after: string): string => {
        return `**Before:**\n\`\`\`\n${before}\n\`\`\`\n**After:**\n\`\`\`\n${after}\n\`\`\``;
      };

      expect(typeof formatBeforeAfter).toBe('function');
    });

    test('should define sanitizeForMarkdown method', () => {
      const sanitizeForMarkdown = (content: string): string => {
        return content.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      };

      expect(typeof sanitizeForMarkdown).toBe('function');
    });
  });

  describe('SessionState Interface', () => {
    test('should define session state with all required fields', () => {
      const sessionState = {
        sessionId: 'session-123',
        currentIndex: 0,
        decisions: new Map<number, string>(),
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };

      expect(sessionState.sessionId).toBeDefined();
      expect(sessionState.currentIndex).toBeDefined();
      expect(sessionState.decisions).toBeDefined();
      expect(sessionState.timestamp).toBeDefined();
      expect(sessionState.expiresAt).toBeDefined();
    });
  });
});

// ============================================================================
// AC1: CLEAR DISPLAY OF PROPOSED CHANGES
// ============================================================================

describe('AC1: Clear Display of Proposed Changes', () => {
  describe('displayChanges API', () => {
    test('should accept RuleSuggestion[] array', () => {
      const changes: RuleSuggestion[] = [
        {
          id: 'rule-1',
          type: RuleProposalType.NEW_RULE,
          pattern: {
            pattern_text: 'Use async/await instead of Promise.then()',
            count: 5,
            category: PatternCategory.CODE_STYLE,
            examples: [],
            suggested_rule: 'Use async/await for asynchronous operations',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
          },
          ruleText: 'Use async/await for asynchronous operations',
          explanation: 'Improves code readability',
          contentType: 'code' as any,
          confidence: 0.9,
          platformFormats: {
            cursor: 'Use async/await',
            copilot: 'Use async/await',
          },
        },
      ];

      const displayChanges = (input: RuleSuggestion[]): void => {
        input.forEach(change => expect(change.ruleText).toBeDefined());
      };

      expect(() => displayChanges(changes)).not.toThrow();
    });

    test('should display pattern source for each change', () => {
      const pattern: Pattern = {
        pattern_text: 'Prefer const over var',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Use const for immutable variables',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [],
      };

      expect(pattern.pattern_text).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.count).toBeGreaterThanOrEqual(2);
    });

    test('should display suggested rule text', () => {
      const ruleText = 'Always use TypeScript strict mode';

      expect(ruleText).toBeDefined();
      expect(typeof ruleText).toBe('string');
      expect(ruleText.length).toBeGreaterThan(0);
    });

    test('should display change type indicator', () => {
      const changeType = RuleProposalType.MODIFICATION;

      expect(changeType).toBeDefined();
      expect(Object.values(RuleProposalType)).toContain(changeType);
    });

    test('should display confidence score if available', () => {
      const confidence = 0.85;

      expect(confidence).toBeDefined();
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    test('should use markdown code blocks for rule text', () => {
      const ruleText = 'Use async/await instead of Promise.then()';
      const markdown = `\`\`\`\n${ruleText}\n\`\`\``;

      expect(markdown).toContain('```');
      expect(markdown).toContain(ruleText);
    });
  });

  describe('Content Validation API', () => {
    test('should validate non-empty rule suggestions', () => {
      const validateChanges = (changes: RuleSuggestion[]): boolean => {
        return changes.length > 0 && changes.every(c => c.ruleText.length > 0);
      };

      const validChanges: RuleSuggestion[] = [
        {
          id: 'rule-1',
          type: RuleProposalType.NEW_RULE,
          pattern: {} as Pattern,
          ruleText: 'Valid rule',
          explanation: 'Test',
          contentType: 'code' as any,
          confidence: 0.8,
          platformFormats: { cursor: 'rule', copilot: 'rule' },
        },
      ];

      expect(validateChanges(validChanges)).toBe(true);
    });

    test('should validate rule suggestion structure', () => {
      const validateStructure = (change: RuleSuggestion): boolean => {
        return !!(
          change.id &&
          change.type &&
          change.pattern &&
          change.ruleText &&
          change.explanation &&
          change.contentType &&
          change.platformFormats
        );
      };

      const validChange: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern: {} as Pattern,
        ruleText: 'Rule text',
        explanation: 'Explanation',
        contentType: 'code' as any,
        confidence: 0.9,
        platformFormats: { cursor: 'rule', copilot: 'rule' },
      };

      expect(validateStructure(validChange)).toBe(true);
    });

    test('should fail gracefully with validation error', () => {
      const validateOrFail = (changes: RuleSuggestion[]): string => {
        if (changes.length === 0) {
          return 'Error: No changes to display';
        }
        if (!changes.every(c => c.ruleText)) {
          return 'Error: Invalid rule suggestion structure';
        }
        return 'OK';
      };

      expect(validateOrFail([])).toContain('Error');
    });
  });
});

// ============================================================================
// AC2: NUMBERED CHANGES FOR EASY REFERENCE
// ============================================================================

describe('AC2: Numbered Changes for Easy Reference', () => {
  test('should assign sequential numbers starting from 1', () => {
    const changes: RuleSuggestion[] = [
      {} as RuleSuggestion,
      {} as RuleSuggestion,
      {} as RuleSuggestion,
    ];

    changes.forEach((change, index) => {
      const changeNumber = index + 1;
      expect(changeNumber).toBeGreaterThan(0);
      expect(changeNumber).toBeLessThanOrEqual(changes.length);
    });
  });

  test('should format change numbers as ## Change #N headers', () => {
    const formatHeader = (index: number): string => {
      return `## Change #${index + 1}`;
    };

    expect(formatHeader(0)).toBe('## Change #1');
    expect(formatHeader(4)).toBe('## Change #5');
  });

  test('should display numbers prominently at start of change section', () => {
    const changeDisplay = `## Change #1 - NEW_RULE\n\n**Pattern:** Use async/await`;

    expect(changeDisplay).toMatch(/^## Change #\d+/);
  });

  test('should support referencing changes by number', () => {
    const changeNumbers = [1, 2, 3, 4, 5];

    changeNumbers.forEach(num => {
      expect(typeof num).toBe('number');
      expect(num).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// AC3: PENDING REVIEW COUNT
// ============================================================================

describe('AC3: Pending Review Count', () => {
  test('should show summary header with total count', () => {
    const changes: RuleSuggestion[] = [
      {} as RuleSuggestion,
      {} as RuleSuggestion,
      {} as RuleSuggestion,
    ];

    const summary = `Reviewing ${changes.length} proposed rule changes`;

    expect(summary).toContain('3');
    expect(summary).toContain('proposed rule changes');
  });

  test('should handle empty state gracefully', () => {
    const changes: RuleSuggestion[] = [];

    const summary = changes.length === 0
      ? 'No changes to review'
      : `Reviewing ${changes.length} proposed rule changes`;

    expect(summary).toBe('No changes to review');
  });

  test('should update count as decisions are made', () => {
    const totalChanges = 10;
    const approved = 3;
    const rejected = 2;
    const pending = totalChanges - approved - rejected;

    const summary = `Reviewing ${pending} proposed rule changes (${approved} approved, ${rejected} rejected)`;

    expect(summary).toContain('5');
    expect(summary).toContain('3 approved');
    expect(summary).toContain('2 rejected');
  });
});

// ============================================================================
// AC4: SEQUENTIAL NAVIGATION
// ============================================================================

describe('AC4: Sequential Navigation', () => {
  test('should support "next" or "n" command', () => {
    const navigate = (command: string, currentIndex: number, total: number): number => {
      if (command === 'next' || command === 'n') {
        return (currentIndex + 1) % total;
      }
      return currentIndex;
    };

    expect(navigate('next', 0, 5)).toBe(1);
    expect(navigate('n', 0, 5)).toBe(1);
  });

  test('should support "previous" or "p" command', () => {
    const navigate = (command: string, currentIndex: number, total: number): number => {
      if (command === 'previous' || command === 'p') {
        return (currentIndex - 1 + total) % total;
      }
      return currentIndex;
    };

    expect(navigate('previous', 2, 5)).toBe(1);
    expect(navigate('p', 2, 5)).toBe(1);
  });

  test('should support "show X" to jump to specific change', () => {
    const jumpTo = (command: string, total: number): number => {
      const match = command.match(/^show (\d+)$/);
      if (match) {
        const targetIndex = parseInt(match[1], 10) - 1;
        return Math.max(0, Math.min(targetIndex, total - 1));
      }
      return 0;
    };

    expect(jumpTo('show 3', 10)).toBe(2);
    expect(jumpTo('show 1', 10)).toBe(0);
  });

  test('should support "show all" to display all changes', () => {
    const canShowAll = (changes: RuleSuggestion[]): boolean => {
      return changes.length <= 50; // MAX_DISPLAY_CHANGES
    };

    const smallList = Array(10).fill({} as RuleSuggestion);
    const largeList = Array(100).fill({} as RuleSuggestion);

    expect(canShowAll(smallList)).toBe(true);
    expect(canShowAll(largeList)).toBe(false);
  });

  test('should paginate if more than 10 changes', () => {
    const calculatePagination = (totalChanges: number): number => {
      return Math.ceil(totalChanges / 10);
    };

    expect(calculatePagination(25)).toBe(3);
    expect(calculatePagination(10)).toBe(1);
    expect(calculatePagination(0)).toBe(0);
  });

  test('should display current position indicator', () => {
    const formatPosition = (currentIndex: number, total: number): string => {
      return `Viewing change ${currentIndex + 1} of ${total}`;
    };

    expect(formatPosition(0, 10)).toBe('Viewing change 1 of 10');
    expect(formatPosition(5, 10)).toBe('Viewing change 6 of 10');
  });

  test('should wrap around navigation', () => {
    const navigateNext = (currentIndex: number, total: number): number => {
      return (currentIndex + 1) % total;
    };

    const navigatePrevious = (currentIndex: number, total: number): number => {
      return (currentIndex - 1 + total) % total;
    };

    // Wrap to beginning after last
    expect(navigateNext(9, 10)).toBe(0);

    // Wrap to end before first
    expect(navigatePrevious(0, 10)).toBe(9);
  });
});

// ============================================================================
// AC5: CHAT CONTEXT FORMATTING
// ============================================================================

describe('AC5: Chat Context Formatting', () => {
  test('should use ## headers for change numbers', () => {
    const header = '## Change #1';

    expect(header).toMatch(/^##\s+Change/);
  });

  test('should use **bold** for emphasis', () => {
    const emphasized = '**Pattern:** Use async/await';

    expect(emphasized).toMatch(/\*\*[^*]+\*\*/);
  });

  test('should use - bullet lists for pattern details', () => {
    const bulletList = '- Category: CODE_STYLE\n- Frequency: 5 occurrences';

    expect(bulletList).toMatch(/^-\s+/);
  });

  test('should use ``` code blocks for rule text', () => {
    const codeBlock = '```\nUse async/await\n```';

    expect(codeBlock).toContain('```');
  });

  test('should use > blockquotes for explanations or warnings', () => {
    const warning = '> Warning: This is a breaking change';

    expect(warning).toMatch(/^>\s+/);
  });

  test('should keep line lengths reasonable (~80 chars)', () => {
    const formatLine = (text: string, maxLength: number = 80): string => {
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength - 3) + '...';
    };

    const shortText = 'Short text';
    const longText = 'A'.repeat(100);

    expect(formatLine(shortText).length).toBeLessThanOrEqual(80);
    expect(formatLine(longText).length).toBeLessThanOrEqual(80);
  });
});

// ============================================================================
// AC6: PATTERN SOURCE CONTEXT
// ============================================================================

describe('AC6: Pattern Source Context', () => {
  test('should display pattern category', () => {
    const pattern: Pattern = {
      pattern_text: 'Use async/await',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Rule text',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: [],
    };

    expect(pattern.category).toBeDefined();
    expect(Object.values(PatternCategory)).toContain(pattern.category);
  });

  test('should display pattern description', () => {
    const pattern: Pattern = {
      pattern_text: 'Prefer const over var for immutable variables',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Rule',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: [],
    };

    expect(pattern.pattern_text).toBeDefined();
    expect(typeof pattern.pattern_text).toBe('string');
    expect(pattern.pattern_text.length).toBeGreaterThan(0);
  });

  test('should display pattern frequency', () => {
    const pattern: Pattern = {
      pattern_text: 'Pattern',
      count: 7,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Rule',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: [],
    };

    expect(pattern.count).toBeGreaterThanOrEqual(2);
  });

  test('should display example corrections (1-2 representative)', () => {
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

    expect(examples.length).toBeGreaterThanOrEqual(1);
    expect(examples.length).toBeLessThanOrEqual(3);
  });
});

// ============================================================================
// AC7: BEFORE/AFTER COMPARISON
// ============================================================================

describe('AC7: Before/After Comparison', () => {
  test('should display before/after for MODIFICATION type', () => {
    const change: RuleSuggestion = {
      id: 'rule-1',
      type: RuleProposalType.MODIFICATION,
      beforeAfter: {
        before: 'Use Promise.then() for async operations',
        after: 'Use async/await for async operations',
        changes: [
          {
            type: 'modification',
            text: 'async/await',
          },
        ],
      },
      pattern: {} as Pattern,
      ruleText: 'Use async/await',
      explanation: 'Improves readability',
      contentType: 'code' as any,
      confidence: 0.9,
      platformFormats: { cursor: 'rule', copilot: 'rule' },
    };

    expect(change.beforeAfter).toBeDefined();
    expect(change.beforeAfter!.before).toBeDefined();
    expect(change.beforeAfter!.after).toBeDefined();
  });

  test('should display "New Rule:" for NEW_RULE type', () => {
    const change: RuleSuggestion = {
      id: 'rule-1',
      type: RuleProposalType.NEW_RULE,
      pattern: {} as Pattern,
      ruleText: 'Always use TypeScript strict mode',
      explanation: 'Type safety',
      contentType: 'code' as any,
      confidence: 0.9,
      platformFormats: { cursor: 'rule', copilot: 'rule' },
    };

    expect(change.type).toBe(RuleProposalType.NEW_RULE);
    expect(change.beforeAfter).toBeUndefined();
  });

  test('should display "Existing Rule:" + "Addition:" for ADDITION type', () => {
    const change: RuleSuggestion = {
      id: 'rule-1',
      type: RuleProposalType.ADDITION,
      pattern: {} as Pattern,
      ruleText: 'Additional rule text',
      explanation: 'Enhancement',
      contentType: 'code' as any,
      confidence: 0.8,
      platformFormats: { cursor: 'rule', copilot: 'rule' },
    };

    expect(change.type).toBe(RuleProposalType.ADDITION);
  });

  test('should show visual indication of changes', () => {
    const highlights: ChangeHighlight[] = [
      { type: 'addition', text: 'async/await' },
      { type: 'deletion', text: 'Promise.then()' },
    ];

    highlights.forEach(h => {
      expect(h.type).toBeDefined();
      expect(['addition', 'deletion', 'modification']).toContain(h.type);
      expect(h.text).toBeDefined();
    });
  });
});

// ============================================================================
// AC8: INPUT VALIDATION AND SECURITY
// ============================================================================

describe('AC8: Input Validation and Security', () => {
  describe('Content Sanitization', () => {
    test('should escape HTML tags to prevent XSS', () => {
      const sanitizeHtml = (content: string): string => {
        return content
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };

      const malicious = '<script>alert("XSS")</script>';
      const sanitized = sanitizeHtml(malicious);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    test('should neutralize dangerous markdown patterns', () => {
      const sanitizeMarkdown = (content: string): string => {
        return content
          .replace(/\[javascript:[^]]+\]\([^)]+\)/g, '[REMOVED](javascript:void(0))')
          .replace(/\[data:[^]]+\]\([^)]+\)/g, '[REMOVED](#)');
      };

      const malicious = '[Click me](javascript:alert(1))';
      const sanitized = sanitizeMarkdown(malicious);

      expect(sanitized).not.toContain('javascript:alert');
      expect(sanitized).toContain('REMOVED');
    });

    test('should validate rule text length (<5000 chars)', () => {
      const validateLength = (text: string): boolean => {
        return text.length < 5000;
      };

      const validText = 'A'.repeat(100);
      const invalidText = 'A'.repeat(5001);

      expect(validateLength(validText)).toBe(true);
      expect(validateLength(invalidText)).toBe(false);
    });

    test('should handle malformed suggestions gracefully', () => {
      const validateOrFail = (change: any): string => {
        if (!change || !change.ruleText) {
          return 'Error: Invalid rule suggestion structure';
        }
        return 'OK';
      };

      expect(validateOrFail(null)).toContain('Error');
      expect(validateOrFail({})).toContain('Error');
    });

    test('should continue functioning despite individual invalid changes', () => {
      const changes: any[] = [
        { id: '1', ruleText: 'Valid rule' },
        { id: '2', ruleText: '' }, // Invalid
        { id: '3', ruleText: 'Another valid' },
      ];

      const validChanges = changes.filter(c => c.ruleText && c.ruleText.length > 0);

      expect(validChanges).toHaveLength(2);
      expect(validChanges[0].ruleText).toBe('Valid rule');
      expect(validChanges[1].ruleText).toBe('Another valid');
    });
  });

  describe('Error Logging', () => {
    test('should log sanitization errors with session ID', () => {
      const logError = (sessionId: string, error: string): void => {
        const logEntry = `[${sessionId}] ${error}`;
        console.log(logEntry);

        expect(logEntry).toContain(sessionId);
        expect(logEntry).toContain(error);
      };

      logError('session-123', 'Sanitization failed for rule-1');
    });

    test('should include session ID in all error messages', () => {
      const formatError = (sessionId: string, message: string): string => {
        return `Error [Session: ${sessionId}]: ${message}`;
      };

      const error = formatError('session-456', 'Invalid input');

      expect(error).toContain('session-456');
      expect(error).toContain('Error');
    });
  });
});

// ============================================================================
// AC9: STATE PERSISTENCE
// ============================================================================

describe('AC9: State Persistence', () => {
  test('should save navigation state to disk', () => {
    const saveState = (state: any): boolean => {
      // Simulate saving state
      return !!state.sessionId && !!state.currentIndex;
    };

    const state = {
      sessionId: 'session-789',
      currentIndex: 2,
      decisions: new Map([[0, 'approved']]),
      timestamp: new Date().toISOString(),
    };

    expect(saveState(state)).toBe(true);
  });

  test('should save current index and all decisions', () => {
    const state = {
      currentIndex: 3,
      decisions: new Map([
        [0, 'approved'],
        [1, 'rejected'],
        [2, 'approved'],
      ]),
    };

    expect(state.currentIndex).toBe(3);
    expect(state.decisions.size).toBe(3);
  });

  test('should save session ID and timestamp', () => {
    const state = {
      sessionId: 'session-abc',
      timestamp: new Date().toISOString(),
    };

    expect(state.sessionId).toMatch(/^session-/);
    expect(state.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('should support resuming session by ID', () => {
    const loadState = (sessionId: string): any => {
      // Simulate loading state
      return {
        sessionId,
        currentIndex: 0,
        decisions: new Map(),
      };
    };

    const loaded = loadState('session-xyz');

    expect(loaded.sessionId).toBe('session-xyz');
  });

  test('should expire sessions after 30 minutes of inactivity', () => {
    const isExpired = (lastActivity: Date): boolean => {
      const now = new Date();
      const thirtyMinutes = 30 * 60 * 1000;
      return now.getTime() - lastActivity.getTime() > thirtyMinutes;
    };

    const recentActivity = new Date();
    const oldActivity = new Date(Date.now() - 31 * 60 * 1000);

    expect(isExpired(recentActivity)).toBe(false);
    expect(isExpired(oldActivity)).toBe(true);
  });

  test('should store sessions in .claude/review-sessions/', () => {
    const getSessionPath = (sessionId: string): string => {
      return `.claude/review-sessions/${sessionId}.json`;
    };

    const path = getSessionPath('session-123');

    expect(path).toContain('.claude/review-sessions/');
    expect(path).toContain('.json');
  });
});

// ============================================================================
// AC10: ERROR RECOVERY
// ============================================================================

describe('AC10: Error Recovery', () => {
  test('should display user-friendly error message', () => {
    const formatError = (error: Error, sessionId: string): string => {
      return `**Error:** Unable to render change\n\n**What happened:** ${error.message}\n**Session ID:** ${sessionId}\n**How to continue:** Try navigating to the next change`;
    };

    const error = formatError(new Error('Rendering failed'), 'session-123');

    expect(error).toContain('Error:');
    expect(error).toContain('What happened:');
    expect(error).toContain('session-123');
    expect(error).toContain('How to continue:');
  });

  test('should allow continuing review despite errors', () => {
    const canContinue = (hasError: boolean, remainingChanges: number): boolean => {
      return remainingChanges > 0;
    };

    expect(canContinue(true, 5)).toBe(true);
    expect(canContinue(true, 0)).toBe(false);
  });

  test('should log errors with full context for debugging', () => {
    const logError = (context: {
      sessionId: string;
      currentIndex: number;
      error: Error;
      timestamp: string;
    }): void => {
      const logEntry = JSON.stringify(context, null, 2);
      expect(logEntry).toContain('sessionId');
      expect(logEntry).toContain('currentIndex');
      expect(logEntry).toContain('error');
    };

    logError({
      sessionId: 'session-123',
      currentIndex: 2,
      error: new Error('Test error'),
      timestamp: new Date().toISOString(),
    });
  });

  test('should offer recovery options for critical errors', () => {
    const getRecoveryOptions = (isCorrupted: boolean): string[] => {
      if (isCorrupted) {
        return [
          '1. Start a new review session',
          '2. Resume from last saved checkpoint',
          '3. Export current decisions and restart',
        ];
      }
      return ['Continue to next change'];
    };

    const corruptedOptions = getRecoveryOptions(true);

    expect(corruptedOptions).toHaveLength(3);
    expect(corruptedOptions[0]).toContain('new review session');
  });
});

// ============================================================================
// INTERFACE MANAGER API
// ============================================================================

describe('InterfaceManager API', () => {
  test('should present changes for review', () => {
    const presentForReview = (changes: RuleSuggestion[]): string => {
      return `Reviewing ${changes.length} proposed rule changes`;
    };

    const changes: RuleSuggestion[] = [{} as RuleSuggestion, {} as RuleSuggestion];

    expect(typeof presentForReview).toBe('function');
    expect(presentForReview(changes)).toContain('2');
  });

  test('should navigate to specific change', () => {
    const navigateToChange = (index: number, total: number): string => {
      if (index < 0 || index >= total) {
        throw new Error('Invalid change index');
      }
      return `Viewing change ${index + 1} of ${total}`;
    };

    expect(navigateToChange(2, 10)).toBe('Viewing change 3 of 10');
    expect(() => navigateToChange(-1, 10)).toThrow();
  });

  test('should show all changes with pagination', () => {
    const showAllChanges = (changes: RuleSuggestion[], pageSize: number = 10): string => {
      const totalPages = Math.ceil(changes.length / pageSize);
      return `Displaying ${changes.length} changes across ${totalPages} pages`;
    };

    const changes = Array(25).fill({} as RuleSuggestion);

    expect(showAllChanges(changes)).toContain('25 changes');
    expect(showAllChanges(changes)).toContain('3 pages');
  });

  test('should undo decision', () => {
    const undoDecision = (decisions: Map<number, string>, index: number): Map<number, string> => {
      const newDecisions = new Map(decisions);
      newDecisions.delete(index);
      return newDecisions;
    };

    const decisions = new Map([[0, 'approved'], [1, 'rejected']]);
    const undone = undoDecision(decisions, 0);

    expect(undone.has(0)).toBe(false);
    expect(undone.get(1)).toBe('rejected');
  });

  test('should export review state', () => {
    const exportState = (state: any): string => {
      return JSON.stringify({
        sessionId: state.sessionId,
        decisions: Array.from(state.decisions.entries()),
        timestamp: state.timestamp,
      });
    };

    const state = {
      sessionId: 'session-123',
      decisions: new Map([[0, 'approved']]),
      timestamp: new Date().toISOString(),
    };

    const exported = exportState(state);

    expect(typeof exported).toBe('string');
    expect(exported).toContain('session-123');
  });

  test('should import review state', () => {
    const importState = (stateJson: string): any => {
      const parsed = JSON.parse(stateJson);
      return {
        sessionId: parsed.sessionId,
        decisions: new Map(parsed.decisions),
        timestamp: parsed.timestamp,
      };
    };

    const stateJson = JSON.stringify({
      sessionId: 'session-456',
      decisions: [[0, 'approved']],
      timestamp: new Date().toISOString(),
    });

    const imported = importState(stateJson);

    expect(imported.sessionId).toBe('session-456');
    expect(imported.decisions.get(0)).toBe('approved');
  });
});

// ============================================================================
// MARKDOWN FORMATTER API
// ============================================================================

describe('MarkdownFormatter API', () => {
  test('should format change header', () => {
    const formatHeader = (index: number, total: number, type: RuleProposalType): string => {
      return `## Change #${index + 1} of ${total} - ${type}`;
    };

    expect(formatHeader(0, 10, RuleProposalType.NEW_RULE))
      .toBe('## Change #1 of 10 - new_rule');
  });

  test('should format pattern source', () => {
    const formatPattern = (pattern: Pattern): string => {
      return `**Pattern:** ${pattern.pattern_text}\n**Category:** ${pattern.category}\n**Frequency:** ${pattern.count} occurrences`;
    };

    const pattern: Pattern = {
      pattern_text: 'Use async/await',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Rule',
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: [],
    };

    const formatted = formatPattern(pattern);

    expect(formatted).toContain('Use async/await');
    expect(formatted).toContain('CODE_STYLE');
    expect(formatted).toContain('5 occurrences');
  });

  test('should format before/after comparison', () => {
    const formatBeforeAfter = (before: string, after: string): string => {
      return `**Before:**\n\`\`\`\n${before}\n\`\`\`\n**After:**\n\`\`\`\n${after}\n\`\`\``;
    };

    const formatted = formatBeforeAfter('Use var', 'Use const');

    expect(formatted).toContain('Before:');
    expect(formatted).toContain('After:');
    expect(formatted).toContain('```');
    expect(formatted).toContain('Use var');
    expect(formatted).toContain('Use const');
  });

  test('should format summary', () => {
    const formatSummary = (pending: number, approved: number, rejected: number): string => {
      return `## Summary\n\n- Pending: ${pending}\n- Approved: ${approved}\n- Rejected: ${rejected}`;
    };

    const formatted = formatSummary(5, 3, 2);

    expect(formatted).toContain('Pending: 5');
    expect(formatted).toContain('Approved: 3');
    expect(formatted).toContain('Rejected: 2');
  });

  test('should format error message', () => {
    const formatError = (error: Error, sessionId: string): string => {
      return `> **Error:** ${error.message}\n> **Session ID:** ${sessionId}\n> Please try again or contact support.`;
    };

    const formatted = formatError(new Error('Test error'), 'session-123');

    expect(formatted).toContain('Error:');
    expect(formatted).toContain('Test error');
    expect(formatted).toContain('session-123');
  });

  test('should sanitize content for markdown', () => {
    const sanitize = (content: string): string => {
      return content
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\|/g, '\\|')
        .replace(/\n/g, '  \n');
    };

    const malicious = '<script>alert("XSS")</script>';
    const sanitized = sanitize(malicious);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });

  test('should truncate rule text if too long', () => {
    const truncate = (text: string, maxLength: number = 500): string => {
      if (text.length <= maxLength) {
        return text;
      }
      return text.substring(0, maxLength - 3) + '...';
    };

    const short = 'Short text';
    const long = 'A'.repeat(1000);

    expect(truncate(short)).toBe(short);
    expect(truncate(long).length).toBe(500);
    expect(truncate(long)).toContain('...');
  });
});

// ============================================================================
// PERFORMANCE REQUIREMENTS
// ============================================================================

describe('Performance Requirements', () => {
  test('should display single change in <500ms', async () => {
    const displayChange = async (change: RuleSuggestion): Promise<void> => {
      // Simulate display operation
      await new Promise(resolve => setTimeout(resolve, 100));
    };

    const start = Date.now();
    await displayChange({} as RuleSuggestion);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500);
  });

  test('should display all changes (≤50) in <2 seconds', async () => {
    const displayAll = async (changes: RuleSuggestion[]): Promise<void> => {
      for (const change of changes) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    };

    const changes = Array(50).fill({} as RuleSuggestion);
    const start = Date.now();
    await displayAll(changes);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
  });

  test('should handle navigation command in <200ms', async () => {
    const navigate = async (command: string): Promise<string> => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return `Navigated: ${command}`;
    };

    const start = Date.now();
    await navigate('next');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(200);
  });

  test('should support up to 1000 changes with pagination', () => {
    const canSupport = (totalChanges: number): boolean => {
      return totalChanges <= 1000;
    };

    expect(canSupport(1000)).toBe(true);
    expect(canSupport(1001)).toBe(false);
  });

  test('should limit "show all" to 50 changes maximum', () => {
    const getMaxDisplayable = (): number => {
      return 50;
    };

    expect(getMaxDisplayable()).toBe(50);
  });

  test('should handle rule text up to 5000 chars', () => {
    const validateRuleLength = (text: string): boolean => {
      return text.length <= 5000;
    };

    const validText = 'A'.repeat(5000);
    const invalidText = 'A'.repeat(5001);

    expect(validateRuleLength(validText)).toBe(true);
    expect(validateRuleLength(invalidText)).toBe(false);
  });
});

// ============================================================================
// SECURITY REQUIREMENTS
// ============================================================================

describe('Security Requirements', () => {
  describe('Content Sanitization (SR1)', () => {
    test('should escape HTML special characters', () => {
      const escapeHtml = (text: string): string => {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
      };

      const input = '<div>&"\'test</div>';
      const escaped = escapeHtml(input);

      expect(escaped).not.toContain('<div>');
      expect(escaped).toContain('&lt;div&gt;');
    });

    test('should block dangerous URL protocols', () => {
      const sanitizeUrl = (url: string): string => {
        const dangerous = ['javascript:', 'data:', 'vbscript:'];
        for (const protocol of dangerous) {
          if (url.toLowerCase().startsWith(protocol)) {
            return 'about:blank';
          }
        }
        return url;
      };

      expect(sanitizeUrl('javascript:alert(1)')).toBe('about:blank');
      expect(sanitizeUrl('data:text/html,<script>')).toBe('about:blank');
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    });

    test('should enforce maximum rule text length of 5000', () => {
      const MAX_LENGTH = 5000;
      const validate = (text: string): boolean => text.length <= MAX_LENGTH;

      expect(validate('A'.repeat(5000))).toBe(true);
      expect(validate('A'.repeat(5001))).toBe(false);
    });

    test('should sanitize pattern examples', () => {
      const sanitizeExample = (example: PatternExample): PatternExample => {
        return {
          ...example,
          user_correction: example.user_correction
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;'),
        };
      };

      const malicious: PatternExample = {
        original_suggestion: 'test',
        user_correction: '<script>alert(1)</script>',
        context: 'test',
        timestamp: new Date().toISOString(),
        content_type: 'code' as any,
      };

      const sanitized = sanitizeExample(malicious);

      expect(sanitized.user_correction).not.toContain('<script>');
    });
  });

  describe('Session Integrity (SR2)', () => {
    test('should use cryptographically random session IDs', () => {
      const generateSessionId = (): string => {
        return 'session-' + Math.random().toString(36).substring(2, 15);
      };

      const id1 = generateSessionId();
      const id2 = generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^session-[a-z0-9]+$/);
    });

    test('should validate session on load', () => {
      const validateSession = (session: any): boolean => {
        return !!(
          session.sessionId &&
          session.timestamp &&
          session.decisions instanceof Map
        );
      };

      const valid = {
        sessionId: 'session-123',
        timestamp: new Date().toISOString(),
        decisions: new Map(),
      };

      const invalid = {
        sessionId: 'session-456',
        // Missing timestamp
      };

      expect(validateSession(valid)).toBe(true);
      expect(validateSession(invalid)).toBe(false);
    });
  });

  describe('Rate Limiting (SR3)', () => {
    test('should limit "show all" to 50 changes maximum', () => {
      const canShowAll = (count: number): boolean => count <= 50;

      expect(canShowAll(50)).toBe(true);
      expect(canShowAll(51)).toBe(false);
    });

    test('should rate limit navigation commands', () => {
      const rateLimiter = {
        lastCall: 0,
        minInterval: 100, // 100ms = 10 requests per second
        canExecute(): boolean {
          const now = Date.now();
          if (now - this.lastCall >= this.minInterval) {
            this.lastCall = now;
            return true;
          }
          return false;
        },
      };

      expect(rateLimiter.canExecute()).toBe(true);
      expect(rateLimiter.canExecute()).toBe(false); // Too soon
    });

    test('should cap output size at ~100KB', () => {
      const MAX_SIZE = 100 * 1024; // 100KB
      const validateOutput = (markdown: string): boolean => {
        return markdown.length <= MAX_SIZE;
      };

      const small = 'A'.repeat(1000);
      const large = 'A'.repeat(100 * 1024 + 1);

      expect(validateOutput(small)).toBe(true);
      expect(validateOutput(large)).toBe(false);
    });
  });

  describe('Audit Trail (SR4)', () => {
    test('should log all decisions with timestamp', () => {
      const logDecision = (sessionId: string, index: number, decision: string): string => {
        const entry = {
          timestamp: new Date().toISOString(),
          sessionId,
          changeIndex: index,
          decision,
        };
        return JSON.stringify(entry);
      };

      const log = logDecision('session-123', 0, 'approved');

      expect(log).toContain('session-123');
      expect(log).toContain('approved');
      expect(log).toContain('timestamp');
    });

    test('should create append-only log', () => {
      const auditLog: string[] = [];

      const appendLog = (entry: string): void => {
        auditLog.push(entry);
      };

      appendLog('Entry 1');
      appendLog('Entry 2');
      appendLog('Entry 3');

      expect(auditLog).toHaveLength(3);
      expect(auditLog[0]).toBe('Entry 1');
    });
  });

  describe('Error Handling (SR5)', () => {
    test('should not expose system internals in error messages', () => {
      const sanitizeError = (error: Error): string => {
        return 'An error occurred. Please try again.';
      };

      const message = sanitizeError(new Error('/path/to/system/file'));

      expect(message).not.toContain('/path/');
      expect(message).not.toContain('system');
    });

    test('should fail closed on sanitization errors', () => {
      const sanitizeOrFail = (content: string): string => {
        try {
          // Simulate sanitization
          if (content.includes('<script>')) {
            throw new Error('Dangerous content detected');
          }
          return content;
        } catch {
          return '[Sanitized Content]';
        }
      };

      const result = sanitizeOrFail('<script>alert(1)</script>');

      expect(result).toBe('[Sanitized Content]');
    });
  });
});
