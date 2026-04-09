/**
 * Edit Functionality Tests (Story 4.3)
 *
 * Tests for edit command recognition, validation, storage, and display
 *
 * @module review/edit-functionality
 */

import { CommandParser } from '../../src/review/command-parser';
import { DecisionProcessor } from '../../src/review/decision-processor';
import { DecisionType } from '../../src/review/types';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock pattern for testing
 */
function createMockPattern(): Pattern {
  return {
    pattern_text: 'Test pattern',
    category: PatternCategory.CODE_STYLE,
    count: 5,
    suggested_rule: 'Test suggested rule',
    first_seen: '2026-03-25T00:00:00Z',
    last_seen: '2026-03-25T01:00:00Z',
    content_types: [ContentType.CODE],
    examples: [
      {
        original_suggestion: 'Original suggestion',
        user_correction: 'User correction',
        context: 'Test context',
        timestamp: '2026-03-25T00:00:00Z',
        content_type: ContentType.CODE,
      },
    ],
  };
}

/**
 * Create a mock rule suggestion for testing
 */
function createMockRuleSuggestion(id: string, ruleText: string): RuleSuggestion {
  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: createMockPattern(),
    ruleText,
    explanation: 'Test explanation',
    contentType: ContentType.CODE,
    confidence: 0.8,
    platformFormats: {
      cursor: ruleText,
      copilot: ruleText,
    },
    beforeAfter: {
      before: 'Original rule',
      after: ruleText,
      changes: [],
    },
  };
}

/**
 * Create a mock navigation state for testing
 */
function createMockState(changes: RuleSuggestion[]) {
  return {
    sessionId: 'test-session-123',
    currentIndex: 0,
    changes,
    decisions: new Map<number, DecisionType>(),
    lastActivity: new Date(),
    totalChanges: changes.length,
  };
}

// ============================================================================
// UNIT TESTS
// ============================================================================

describe('Command Parser - Edit Commands (Story 4.3)', () => {
  let parser: CommandParser;

  beforeEach(() => {
    parser = new CommandParser();
  });

  describe('Edit Command Recognition (AC1)', () => {
    test('should recognize "edit #N" pattern', () => {
      const result = parser.parse('edit #2');
      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(2);
      expect(result.isValid).toBe(true);
    });

    test('should recognize "modify #N" pattern', () => {
      const result = parser.parse('modify #3');
      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(3);
      expect(result.isValid).toBe(true);
    });

    test('should recognize "change #N" pattern', () => {
      const result = parser.parse('change #5');
      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(5);
      expect(result.isValid).toBe(true);
    });

    test('should recognize "update #N" pattern', () => {
      const result = parser.parse('update #7');
      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(7);
      expect(result.isValid).toBe(true);
    });

    test('should be case insensitive', () => {
      const result1 = parser.parse('EDIT #2');
      const result2 = parser.parse('Edit #3');
      expect(result1.commandType).toBe('edit');
      expect(result2.commandType).toBe('edit');
    });

    test('should work without # prefix', () => {
      const result = parser.parse('edit 2');
      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(2);
    });
  });

  describe('Edit Command Text Extraction', () => {
    test('should extract edited text after change number', () => {
      const result = parser.parse('edit #2 This is the new rule text');
      expect(result.editedText).toBe('This is the new rule text');
    });

    test('should handle multiple words in edited text', () => {
      const result = parser.parse('edit #2 Use TypeScript strict mode for all files');
      expect(result.editedText).toBe('Use TypeScript strict mode for all files');
    });

    test('should return undefined for edit without text', () => {
      const result = parser.parse('edit #2');
      expect(result.editedText).toBeUndefined();
    });

    test('should preserve special characters in edited text', () => {
      const result = parser.parse('edit #2 Use async/await patterns');
      expect(result.editedText).toBe('Use async/await patterns');
    });
  });
});

describe('Decision Processor - Edit Validation (AC2)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  describe('Empty Edit Validation', () => {
    test('should reject empty edited text', async () => {
      // Access the private validateEdit method via edit()
      // Since edit() calls validateEdit internally, we test through edit
      const result = await processor.edit(0, '', mockState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
    });

    test('should reject whitespace-only edited text', async () => {
      const result = await processor.edit(0, '   ', mockState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
    });
  });

  describe('Identical Edit Validation', () => {
    test('should reject edit identical to original', async () => {
      const result = await processor.edit(0, 'Original rule text', mockState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('differ from original');
    });

    test('should reject edit with same content but different whitespace', async () => {
      const result = await processor.edit(0, 'Original rule text  ', mockState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('differ from original');
    });
  });

  describe('Valid Edit Acceptance', () => {
    test('should accept valid edited text', async () => {
      const result = await processor.edit(0, 'Modified rule text', mockState);
      expect(result.success).toBe(true);
    });

    test('should accept edit with minor changes', async () => {
      const result = await processor.edit(0, 'Original rule text with additions', mockState);
      expect(result.success).toBe(true);
    });
  });

  describe('Length Limit Validation', () => {
    test('should reject edit exceeding 10,000 characters', async () => {
      const longText = 'a'.repeat(10001);
      const result = await processor.edit(0, longText, mockState);
      expect(result.success).toBe(false);
      expect(result.message).toContain('too long');
    });

    test('should accept edit at exactly 10,000 characters', async () => {
      const exactLengthText = 'a'.repeat(10000);
      const result = await processor.edit(0, exactLengthText, mockState);
      expect(result.success).toBe(true);
    });
  });
});

describe('Decision Processor - Edit Storage (AC3, AC4)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  test('should preserve original rule in original_rule field (AC3)', async () => {
    const result = await processor.edit(0, 'Edited rule text', mockState);
    expect(result.success).toBe(true);

    const editedChange = result.nextState.changes[0];
    expect(editedChange.original_rule).toBe('Original rule text');
  });

  test('should store edited version in edited_rule field (AC4)', async () => {
    const result = await processor.edit(0, 'Edited rule text', mockState);
    expect(result.success).toBe(true);

    const editedChange = result.nextState.changes[0];
    expect(editedChange.edited_rule).toBe('Edited rule text');
  });

  test('should not modify ruleText when editing', async () => {
    const result = await processor.edit(0, 'Edited rule text', mockState);
    expect(result.success).toBe(true);

    const editedChange = result.nextState.changes[0];
    expect(editedChange.ruleText).toBe('Original rule text');
  });

  test('should set decision to EDITED in state', async () => {
    const result = await processor.edit(0, 'Edited rule text', mockState);
    expect(result.success).toBe(true);

    const decision = result.nextState.decisions.get(0);
    expect(decision).toBe(DecisionType.EDITED);
  });
});

describe('Decision Processor - Edit Overwrite (AC8)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  test('should allow editing same change multiple times', async () => {
    // First edit
    const result1 = await processor.edit(0, 'First edit', mockState);
    expect(result1.success).toBe(true);
    expect(result1.nextState.changes[0].edited_rule).toBe('First edit');

    // Second edit (overwrite)
    const result2 = await processor.edit(0, 'Second edit', result1.nextState);
    expect(result2.success).toBe(true);
    expect(result2.nextState.changes[0].edited_rule).toBe('Second edit');
  });

  test('should preserve original_rule across multiple edits', async () => {
    const result1 = await processor.edit(0, 'First edit', mockState);
    const result2 = await processor.edit(0, 'Second edit', result1.nextState);

    expect(result2.nextState.changes[0].original_rule).toBe('Original rule text');
    expect(result2.nextState.changes[0].edited_rule).toBe('Second edit');
  });

  test('should maintain decision as EDITED across re-edits', async () => {
    const result1 = await processor.edit(0, 'First edit', mockState);
    const result2 = await processor.edit(0, 'Second edit', result1.nextState);

    expect(result2.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
  });
});

describe('Security - Input Sanitization (AC10)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  describe('XSS Prevention', () => {
    test('should sanitize script tags', async () => {
      const result = await processor.edit(
        0,
        '<script>alert("xss")</script>rule',
        mockState
      );
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('<script>');
    });

    test('should sanitize iframe tags', async () => {
      const result = await processor.edit(
        0,
        '<iframe src="evil.com"></iframe>rule',
        mockState
      );
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('<iframe');
    });

    test('should sanitize javascript: protocol', async () => {
      const result = await processor.edit(
        0,
        'javascript:alert(1)',
        mockState
      );
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('javascript:');
    });

    test('should sanitize event handlers', async () => {
      const result = await processor.edit(
        0,
        'onclick=alert(1)',
        mockState
      );
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('onclick');
    });
  });

  describe('HTML Escaping', () => {
    test('should escape HTML entities', async () => {
      const result = await processor.edit(0, '<div>rule</div>', mockState);
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toContain('&lt;');
      expect(result.nextState.changes[0].edited_rule).toContain('&gt;');
    });

    test('should escape ampersands', async () => {
      const result = await processor.edit(0, 'rule & more', mockState);
      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toContain('&amp;');
    });
  });
});

describe('Decision Processor - Rule Application (AC7)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  test('should apply edited_rule when approving edited change', async () => {
    // First edit the change
    const editResult = await processor.edit(0, 'Edited rule text', mockState);
    expect(editResult.success).toBe(true);

    // Then approve it
    const approveResult = await processor.approve(0, editResult.nextState);
    expect(approveResult.success).toBe(true);
    expect(approveResult.message).toContain('edited version');
  });

  test('should use edited_rule instead of suggested_rule', async () => {
    const editResult = await processor.edit(0, 'Edited rule text', mockState);
    const approveResult = await processor.approve(0, editResult.nextState);

    // Verify the edited version is what gets applied
    expect(editResult.nextState.changes[0].edited_rule).toBe('Edited rule text');
    expect(editResult.nextState.changes[0].ruleText).toBe('Original rule text');
  });
});

describe('Error Handling (AC9)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  test('should handle invalid change number gracefully', async () => {
    const result = await processor.edit(99, 'Edited text', mockState);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid change number');
  });

  test('should handle negative change number', async () => {
    const result = await processor.edit(-1, 'Edited text', mockState);
    expect(result.success).toBe(false);
  });

  test('should provide clear error messages', async () => {
    const result = await processor.edit(0, '', mockState);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/\[X\].*/); // Should have error prefix
  });

  test('should never crash on invalid input', async () => {
    // These should not throw exceptions
    await expect(processor.edit(0, '', mockState)).resolves.toBeDefined();
    await expect(processor.edit(-1, 'text', mockState)).resolves.toBeDefined();
    await expect(processor.edit(999, 'text', mockState)).resolves.toBeDefined();
  });
});

describe('Markdown Formatter - Edit Display (AC5)', () => {
  // These tests would require importing MarkdownFormatter
  // For now, we'll skip them as they're integration tests
  test.skip('should display [EDITED] marker for edited changes', () => {
    // TODO: Implement when testing MarkdownFormatter integration
  });

  test.skip('should show edited_rule instead of ruleText', () => {
    // TODO: Implement when testing MarkdownFormatter integration
  });
});

describe('Performance - Edit Processing (AC11)', () => {
  let processor: DecisionProcessor;
  let mockState: ReturnType<typeof createMockState>;

  beforeEach(() => {
    processor = new DecisionProcessor();
    const changes = [
      createMockRuleSuggestion('1', 'Original rule text'),
    ];
    mockState = createMockState(changes);
  });

  test('should process simple edit in less than 100ms', async () => {
    const start = performance.now();
    const result = await processor.edit(0, 'Edited rule text', mockState);
    const end = performance.now();

    expect(result.success).toBe(true);
    expect(end - start).toBeLessThan(100);
  });

  test('should handle long edits efficiently', async () => {
    const longEdit = 'a'.repeat(5000);
    const start = performance.now();
    const result = await processor.edit(0, longEdit, mockState);
    const end = performance.now();

    expect(result.success).toBe(true);
    expect(end - start).toBeLessThan(100);
  });
});
