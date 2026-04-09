/**
 * Rule Generation Integration Tests (Story 3.7)
 *
 * Tests the full pipeline from patterns to formatted rules
 */

import { describe, it, expect } from '@jest/globals';
import { generateRules } from '../../src/rules/rule-generator';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';
import { CursorFormatter } from '../../src/rules/formatters/cursor-formatter';
import { CopilotFormatter } from '../../src/rules/formatters/copilot-formatter';
import { ExistingRule } from '../../src/rules/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create realistic pattern fixtures for integration testing
 */
function createPatternFixtures(): Pattern[] {
  const now = new Date().toISOString();

  return [
    {
      pattern_text: 'use f-strings instead of format()',
      count: 8,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: 'Use format() for string formatting',
          user_correction: 'Use f-strings instead',
          context: 'Python code',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use f-strings instead of format()',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'use async/await instead of callbacks',
      count: 12,
      category: PatternCategory.CONVENTION,
      examples: [
        {
          original_suggestion: 'Use callbacks',
          user_correction: 'Use async/await instead',
          context: 'JavaScript async code',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use async/await instead of callbacks',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'use kebab-case for file names',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: 'Use camelCase for files',
          user_correction: 'Use kebab-case instead',
          context: 'File naming',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use kebab-case for file names',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'refer to API endpoints as endpoints not APIs',
      count: 6,
      category: PatternCategory.TERMINOLOGY,
      examples: [
        {
          original_suggestion: 'Call these APIs',
          user_correction: 'Refer to them as endpoints',
          context: 'API documentation',
          timestamp: now,
          content_type: ContentType.DOCUMENTATION,
        },
      ],
      suggested_rule: 'Refer to API endpoints as endpoints not APIs',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.DOCUMENTATION],
    },
  ];
}

/**
 * Create existing rules for testing modification detection
 */
function createExistingRules(): ExistingRule[] {
  return [
    {
      id: 'rule-1',
      text: 'Use snake_case for file and variable names',
      platform: 'cursor',
      contentType: ContentType.CODE,
    },
    {
      id: 'rule-2',
      text: 'Use callbacks for asynchronous operations',
      platform: 'copilot',
      contentType: ContentType.CODE,
    },
  ];
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Rule Generation Integration', () => {
  describe('Full Pipeline: Patterns → Rules → Formatted Output', () => {
    it('should generate rules from multiple patterns', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      expect(result.totalRules).toBe(4);
      expect(result.rules).toHaveLength(4);
      expect(result.processingTimeMs).toBeLessThan(1000); // Should be fast
    });

    it('should include all required metadata in generated rules', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      for (const rule of result.rules) {
        expect(rule.id).toBeDefined();
        expect(rule.type).toBeDefined();
        expect(rule.pattern).toBeDefined();
        expect(rule.ruleText).toBeDefined();
        expect(rule.explanation).toBeDefined();
        expect(rule.contentType).toBeDefined();
        expect(rule.confidence).toBeGreaterThanOrEqual(0);
        expect(rule.confidence).toBeLessThanOrEqual(1);
        expect(rule.platformFormats).toBeDefined();
        expect(rule.platformFormats.cursor).toBeDefined();
        expect(rule.platformFormats.copilot).toBeDefined();
      }
    });

    it('should calculate appropriate confidence scores', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      // Find rules by pattern text instead
      const asyncAwaitRule = result.rules.find(r =>
        r.pattern.pattern_text.includes('async/await')
      );
      const kebabCaseRule = result.rules.find(r =>
        r.pattern.pattern_text.includes('kebab-case')
      );

      expect(asyncAwaitRule).toBeDefined();
      expect(kebabCaseRule).toBeDefined();
      if (asyncAwaitRule && kebabCaseRule) {
        // High frequency pattern should have higher confidence
        expect(asyncAwaitRule.pattern.count).toBe(12);
        expect(kebabCaseRule.pattern.count).toBe(3);
        expect(asyncAwaitRule.confidence).toBeGreaterThanOrEqual(kebabCaseRule.confidence);
      }
    });

    it('should process patterns quickly (performance target)', () => {
      const patterns = createPatternFixtures();
      const startTime = Date.now();

      const result = generateRules(patterns);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result.totalRules).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(100); // Should complete in <100ms for 4 patterns
    });
  });

  describe('Platform Formatting', () => {
    it('should format rules for Cursor', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);
      const formatter = new CursorFormatter();

      const cursorFormat = formatter.formatForCursor(result.rules);

      expect(cursorFormat).toContain('# AI Assistant Rules');
      expect(cursorFormat).toContain('- Use');
      expect(cursorFormat).toContain('# Code');
    });

    it('should format rules for Copilot', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);
      const formatter = new CopilotFormatter();

      const copilotFormat = formatter.formatForCopilot(result.rules);

      expect(copilotFormat).toContain('# AI Assistant Custom Instructions');
      expect(copilotFormat).toContain('##');
      expect(copilotFormat).toContain('**'); // Bold formatting
    });

    it('should include content type context in formatted rules', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);
      const formatter = new CursorFormatter();

      const cursorFormat = formatter.formatForCursor(result.rules);

      // Should have sections for different content types
      expect(cursorFormat).toContain('Code');
    });
  });

  describe('Confidence Filtering', () => {
    it('should filter rules by confidence threshold', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      const highConfidenceRules = result.rules.filter(r => r.confidence >= 0.7);
      const lowConfidenceRules = result.rules.filter(r => r.confidence < 0.7);

      expect(highConfidenceRules.length).toBeGreaterThan(0);
      expect(highConfidenceRules.length + lowConfidenceRules.length).toBe(4);
    });
  });

  describe('Pattern Traceability', () => {
    it('should maintain link between rule and source pattern', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      for (const rule of result.rules) {
        expect(rule.pattern).toBeDefined();
        expect(rule.pattern.pattern_text).toBeDefined();
        expect(rule.pattern.count).toBeGreaterThan(0);
        expect(rule.pattern.category).toBeDefined();
      }
    });

    it('should include pattern frequency in explanations', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      for (const rule of result.rules) {
        expect(rule.explanation).toContain('time');
        expect(rule.explanation).toContain(rule.pattern.count.toString());
      }
    });
  });

  describe('Content Type Support', () => {
    it('should detect content type from patterns', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      const codeRules = result.rules.filter(r => r.contentType === ContentType.CODE);
      const docRules = result.rules.filter(r => r.contentType === ContentType.DOCUMENTATION);

      expect(codeRules.length).toBeGreaterThan(0);
      expect(docRules.length).toBeGreaterThan(0);
    });

    it('should include content type in explanation', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      const codeRule = result.rules.find(r => r.contentType === ContentType.CODE);
      const docRule = result.rules.find(r => r.contentType === ContentType.DOCUMENTATION);

      expect(codeRule?.explanation).toContain('code');
      expect(docRule?.explanation).toContain('documentation');
    });
  });

  describe('Statistics Tracking', () => {
    it('should track rule proposal types', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      expect(result.summary.newRules).toBeGreaterThan(0);
      expect(result.summary.newRules + result.summary.additions + result.summary.modifications)
        .toBe(4);
    });

    it('should track confidence distribution', () => {
      const patterns = createPatternFixtures();
      const result = generateRules(patterns);

      const total = result.summary.highConfidence +
                   result.summary.mediumConfidence +
                   result.summary.lowConfidence;

      expect(total).toBe(4);
    });
  });
});

describe('Performance Tests', () => {
  it('should handle 100 patterns in under 5 seconds', () => {
    // Create 100 patterns
    const patterns: Pattern[] = [];
    const now = new Date().toISOString();

    for (let i = 0; i < 100; i++) {
      patterns.push({
        pattern_text: `pattern ${i} use specific convention`,
        count: 2 + (i % 10),
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: `Use convention ${i}`,
        first_seen: now,
        last_seen: now,
        content_types: [ContentType.CODE],
      });
    }

    const startTime = Date.now();
    const result = generateRules(patterns);
    const endTime = Date.now();

    expect(result.totalRules).toBe(100);
    expect(endTime - startTime).toBeLessThan(5000); // < 5 seconds
  });

  it('should maintain linear performance scaling', () => {
    const smallSet = createPatternFixtures();
    const largeSet = [
      ...createPatternFixtures(),
      ...createPatternFixtures(),
      ...createPatternFixtures(),
      ...createPatternFixtures(),
      ...createPatternFixtures(),
    ];

    const result1 = generateRules(smallSet);
    const result2 = generateRules(largeSet);

    // Large set should take roughly 5x longer (not exponential)
    expect(result2.totalRules).toBe(result1.totalRules * 5);
    // Processing time should scale reasonably (allowing for very fast execution)
    expect(result2.processingTimeMs).toBeLessThanOrEqual(result1.processingTimeMs * 100);
  });
});
