/**
 * Unit Tests for Rule Conflict Detection (Story 6-7)
 *
 * Tests cover all acceptance criteria:
 * - AC1: Contradiction detection (do X vs don't do X)
 * - AC6: Empty inputs handling
 * - AC7: No semantic overlap handling
 * - AC8: Multi-way conflict reporting
 *
 * NOTE: This is the TDD red phase — no production code exists yet.
 * All tests are expected to fail with module import errors.
 */

import {
  detectRuleConflicts,
  ConflictResult,
  ConflictDetectionResult,
} from '../../src/rules/conflict-detection';

// ============================================================================
// AC1: Basic contradiction detection
// ============================================================================

describe('detectRuleConflicts - basic contradictions', () => {
  test('should detect direct negation: "always use X" vs "never use X"', () => {
    const existing = ['Always use TypeScript for new projects'];
    const newRules = ['Never use TypeScript; prefer JavaScript'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].severity).toBe('high');
    expect(result.conflicts[0].conflictType).toBe('contradiction');
  });

  test('should detect direct negation: "do X" vs "don\'t do X"', () => {
    const existing = ['Do use console.log for debugging'];
    const newRules = ["Don't use console.log for debugging"];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  test('should detect reversed negation: "don\'t do X" vs "do X"', () => {
    const existing = ["Don't use var declarations"];
    const newRules = ['Use var for legacy compatibility'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(1);
  });

  test('should detect "avoid X" vs "always use X" contradiction', () => {
    const existing = ['Avoid using any type'];
    const newRules = ['Always use any type for flexible arrays'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts[0].severity).toBe('high');
  });

  test('should detect "exclude X" vs "prefer X" contradiction', () => {
    const existing = ['Exclude external dependencies for simple scripts'];
    const newRules = ['Prefer using external dependencies for code reuse'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
  });

  test('should NOT flag unrelated rules as conflicts', () => {
    const existing = ['Always use TypeScript for new projects'];
    const newRules = ['Use async/await instead of promises'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
  });

  test('should NOT flag rules with same topic but no contradiction', () => {
    const existing = ['Use descriptive variable names'];
    const newRules = ['Use TypeScript for type safety'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
  });
});

// ============================================================================
// AC1: Severity classification
// ============================================================================

describe('detectRuleConflicts - severity classification', () => {
  test('should classify direct negation as high severity', () => {
    const existing = ['Always use strict mode'];
    const newRules = ['Never use strict mode'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.conflicts[0].severity).toBe('high');
  });

  test('should classify partial contradiction as medium severity', () => {
    const existing = ['Prefer functional programming patterns'];
    const newRules = ['Use object-oriented patterns for complex state management'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.conflicts[0].severity).toBe('medium');
  });

  test('should include reason explaining the contradiction', () => {
    const existing = ['Always use semicolons'];
    const newRules = ['Never use semicolons; rely on ASI'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.conflicts[0].reason).toContain('Always');
    expect(result.conflicts[0].reason).toContain('Never');
  });
});

// ============================================================================
// AC6: Empty inputs handling
// ============================================================================

describe('detectRuleConflicts - empty inputs (AC6)', () => {
  test('should return empty result when existing rules are empty', () => {
    const result = detectRuleConflicts([], ['New rule']);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.totalCompared).toBe(0);
  });

  test('should return empty result when new rules are empty', () => {
    const result = detectRuleConflicts(['Existing rule'], []);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.totalCompared).toBe(0);
  });

  test('should return empty result when both arrays are empty', () => {
    const result = detectRuleConflicts([], []);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.totalCompared).toBe(0);
  });

  test('should not throw on empty inputs', () => {
    expect(() => detectRuleConflicts([], [])).not.toThrow();
    expect(() => detectRuleConflicts([], ['rule'])).not.toThrow();
    expect(() => detectRuleConflicts(['rule'], [])).not.toThrow();
  });
});

// ============================================================================
// AC7: No semantic overlap handling
// ============================================================================

describe('detectRuleConflicts - no semantic overlap (AC7)', () => {
  test('should return no conflicts for rules with completely different topics', () => {
    const existing = [
      'Always use TypeScript for new projects',
      'Use semicolons consistently',
      'Prefer const over let',
    ];
    const newRules = [
      'Deploy to production on Tuesdays only',
      'Use PNG format for screenshots',
    ];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
    expect(result.conflicts).toHaveLength(0);
    expect(result.totalCompared).toBe(6); // 3 * 2 pairs compared
  });

  test('should count totalCompared correctly', () => {
    const existing = ['Rule A', 'Rule B'];
    const newRules = ['Rule C', 'Rule D', 'Rule E'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.totalCompared).toBe(6); // 2 * 3
  });
});

// ============================================================================
// AC8: Multi-way conflict reporting
// ============================================================================

describe('detectRuleConflicts - multi-way conflicts (AC8)', () => {
  test('should report all conflicts when one new rule conflicts with multiple existing rules', () => {
    const existing = [
      'Always use TypeScript',
      'Never use JavaScript for new code',
      'Prefer compiled languages',
    ];
    const newRules = ['Always use JavaScript; avoid TypeScript'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBeGreaterThan(1);
    // All conflicts should reference the same new rule
    result.conflicts.forEach((conflict: ConflictResult) => {
      expect(conflict.newRule).toBe('Always use JavaScript; avoid TypeScript');
    });
  });

  test('should report multiple new rules conflicting with multiple existing rules', () => {
    const existing = ['Always use semicolons', 'Prefer single quotes'];
    const newRules = ['Never use semicolons', 'Prefer double quotes'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts.length).toBeGreaterThanOrEqual(2);
  });

  test('should truncate conflicts if single new rule conflicts with more than 10 existing rules', () => {
    const existing = Array.from({ length: 15 }, (_, i) => `Always use approach ${i}`);
    const newRules = ['Never use any of the existing approaches'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.conflicts.length).toBeLessThanOrEqual(10);
    // Should note additional conflicts truncated
    const hasTruncationNote = result.conflicts.some(
      (c: ConflictResult) => c.reason.includes('additional conflicts truncated') || c.reason.includes('truncated')
    );
    // At minimum, should have detected conflicts
    expect(result.hasConflicts).toBe(true);
  });
});

// ============================================================================
// Edge cases
// ============================================================================

describe('detectRuleConflicts - edge cases', () => {
  test('should not flag duplicate rules as conflicts', () => {
    const existing = ['Always use TypeScript'];
    const newRules = ['Always use TypeScript'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
  });

  test('should handle rules with similar wording but no contradiction', () => {
    const existing = ['Use TypeScript for type safety'];
    const newRules = ['Use TypeScript for better IDE support'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
  });

  test('should handle rules with negation keywords on different topics', () => {
    const existing = ["Don't use console.log in production"];
    const newRules = ["Don't forget to write tests"];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(false);
  });

  test('should handle whitespace and case differences', () => {
    const existing = ['ALWAYS USE TYPESCRIPT'];
    const newRules = ['never use typescript'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
  });

  test('should handle negation with different phrasing', () => {
    const existing = ['Ensure all functions are pure'];
    const newRules = ['Allow impure functions for side effects'];
    const result = detectRuleConflicts(existing, newRules);
    expect(result.hasConflicts).toBe(true);
  });

  test('should return correct ConflictResult structure', () => {
    const existing = ['Always use TypeScript'];
    const newRules = ['Never use TypeScript'];
    const result = detectRuleConflicts(existing, newRules);
    const conflict = result.conflicts[0];
    expect(conflict).toHaveProperty('existingRule');
    expect(conflict).toHaveProperty('newRule');
    expect(conflict).toHaveProperty('conflictType');
    expect(conflict).toHaveProperty('severity');
    expect(conflict).toHaveProperty('reason');
  });

  test('should return correct ConflictDetectionResult structure', () => {
    const result = detectRuleConflicts(['Rule A'], ['Rule B']);
    expect(result).toHaveProperty('hasConflicts');
    expect(result).toHaveProperty('conflicts');
    expect(result).toHaveProperty('totalCompared');
    expect(Array.isArray(result.conflicts)).toBe(true);
    expect(typeof result.hasConflicts).toBe('boolean');
    expect(typeof result.totalCompared).toBe('number');
  });
});

// ============================================================================
// Performance (NFR compliance)
// ============================================================================

describe('detectRuleConflicts - performance', () => {
  test('should complete in under 100ms for 100 rules', () => {
    const existing = Array.from({ length: 50 }, (_, i) => `Existing rule about topic ${i}`);
    const newRules = Array.from({ length: 50 }, (_, i) => `New rule about topic ${i}`);

    const start = performance.now();
    detectRuleConflicts(existing, newRules);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
