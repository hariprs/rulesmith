/**
 * Rule Generator Unit Tests (Story 3.7)
 *
 * YOLO approach: Test basic functionality first, expand later
 */

import { describe, it, expect } from '@jest/globals';
import { RuleGenerator, generateRules } from '../../../src/rules/rule-generator';
import { Pattern, PatternCategory } from '../../../src/pattern-detector';
import { ContentType } from '../../../src/content-analyzer';
import { ExistingRule, RuleProposalType } from '../../../src/rules/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a sample pattern for testing
 */
function createSamplePattern(overrides?: Partial<Pattern>): Pattern {
  const now = new Date().toISOString();

  return {
    pattern_text: 'use f-strings instead of format()',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Use format() for string formatting',
        user_correction: 'Use f-strings instead',
        context: 'Python code formatting',
        timestamp: now,
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Use f-strings instead of format() for string formatting',
    first_seen: now,
    last_seen: now,
    content_types: [ContentType.CODE],
    ...overrides,
  };
}

/**
 * Create a sample existing rule for testing
 */
function createSampleExistingRule(overrides?: Partial<ExistingRule>): ExistingRule {
  return {
    id: 'rule-1',
    text: 'Use camelCase for variable names',
    platform: 'cursor',
    contentType: ContentType.CODE,
    ...overrides,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('RuleGenerator', () => {
  describe('constructor', () => {
    it('should create a new instance', () => {
      const generator = new RuleGenerator();
      expect(generator).toBeDefined();
      expect(generator).toBeInstanceOf(RuleGenerator);
    });
  });

  describe('generateRules', () => {
    it('should generate rules from patterns', () => {
      const generator = new RuleGenerator();
      const patterns = [createSamplePattern()];

      const result = generator.generateRules(patterns);

      expect(result.totalRules).toBe(1);
      expect(result.rules).toHaveLength(1);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should return empty result for empty patterns array', () => {
      const generator = new RuleGenerator();
      const patterns: Pattern[] = [];

      const result = generator.generateRules(patterns);

      expect(result.totalRules).toBe(0);
      expect(result.rules).toHaveLength(0);
    });

    it('should track new rules count', () => {
      const generator = new RuleGenerator();
      const patterns = [createSamplePattern(), createSamplePattern()];

      const result = generator.generateRules(patterns);

      expect(result.summary.newRules).toBe(2);
      expect(result.summary.additions).toBe(0);
      expect(result.summary.modifications).toBe(0);
    });

    it('should calculate confidence scores', () => {
      const generator = new RuleGenerator();
      const highFrequencyPattern = createSamplePattern({ count: 10 });
      const lowFrequencyPattern = createSamplePattern({ count: 2 });

      const result = generator.generateRules([highFrequencyPattern, lowFrequencyPattern]);

      expect(result.rules[0].confidence).toBeGreaterThan(result.rules[1].confidence);
    });
  });

  describe('generateForPattern', () => {
    it('should generate a new rule for pattern without existing rules', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern();

      const result = generator.generateForPattern(pattern, []);

      expect(result.type).toBe(RuleProposalType.NEW_RULE);
      expect(result.ruleText).toContain('f-strings');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should include platform formats', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern();

      const result = generator.generateForPattern(pattern, []);

      expect(result.platformFormats).toBeDefined();
      expect(result.platformFormats.cursor).toContain('-');
      expect(result.platformFormats.copilot).toContain('When');
    });

    it('should include explanation', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern();

      const result = generator.generateForPattern(pattern, []);

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(0);
      expect(result.explanation).toContain('5 times');
    });

    it('should detect content type from pattern', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern({
        content_types: [ContentType.DOCUMENTATION],
      });

      const result = generator.generateForPattern(pattern, []);

      expect(result.contentType).toBe(ContentType.DOCUMENTATION);
    });
  });

  describe('generateForNewPattern', () => {
    it('should generate rule for new pattern', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern();

      const result = generator.generateForNewPattern(pattern);

      expect(result.type).toBe(RuleProposalType.NEW_RULE);
      expect(result.ruleText).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('generateForExistingRule', () => {
    it('should generate modification for existing rule', () => {
      const generator = new RuleGenerator();
      const pattern = createSamplePattern({
        pattern_text: 'use kebab-case instead of snake_case',
      });
      const existingRule = createSampleExistingRule({
        text: 'Use snake_case for variables and files',
      });

      const result = generator.generateForExistingRule(pattern, existingRule);

      expect(result.suggestion.type).toBe(RuleProposalType.MODIFICATION);
      expect(result.beforeAfter).toBeDefined();
      expect(result.beforeAfter.before).toBe(existingRule.text);
    });
  });
});

describe('generateRules utility function', () => {
  it('should generate rules from patterns array', () => {
    const patterns = [createSamplePattern(), createSamplePattern()];

    const result = generateRules(patterns);

    expect(result.totalRules).toBe(2);
    expect(result.rules).toHaveLength(2);
  });

  it('should handle empty patterns array', () => {
    const patterns: Pattern[] = [];

    const result = generateRules(patterns);

    expect(result.totalRules).toBe(0);
    expect(result.rules).toHaveLength(0);
  });

  it('should accept optional existing rules parameter', () => {
    const patterns = [createSamplePattern()];
    const existingRules = [createSampleExistingRule()];

    const result = generateRules(patterns, existingRules);

    expect(result.totalRules).toBe(1);
    expect(result.rules).toHaveLength(1);
  });
});

describe('Rule Suggestion Structure', () => {
  it('should include all required fields', () => {
    const generator = new RuleGenerator();
    const pattern = createSamplePattern();

    const result = generator.generateForPattern(pattern, []);

    expect(result.id).toBeDefined();
    expect(result.type).toBeDefined();
    expect(result.pattern).toBeDefined();
    expect(result.ruleText).toBeDefined();
    expect(result.explanation).toBeDefined();
    expect(result.contentType).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.platformFormats).toBeDefined();
  });

  it('should generate unique IDs for different patterns', () => {
    const generator = new RuleGenerator();
    const pattern1 = createSamplePattern({ pattern_text: 'use f-strings' });
    const pattern2 = createSamplePattern({ pattern_text: 'use camelCase' });

    const result1 = generator.generateForPattern(pattern1, []);
    const result2 = generator.generateForPattern(pattern2, []);

    expect(result1.id).not.toBe(result2.id);
  });

  it('should include pattern traceability', () => {
    const generator = new RuleGenerator();
    const pattern = createSamplePattern();

    const result = generator.generateForPattern(pattern, []);

    expect(result.pattern).toEqual(pattern);
  });
});

describe('Confidence Scoring', () => {
  it('should give higher confidence for higher frequency patterns', () => {
    const generator = new RuleGenerator();
    const lowFrequency = createSamplePattern({ count: 2 });
    const mediumFrequency = createSamplePattern({ count: 4 });
    const highFrequency = createSamplePattern({ count: 10 });

    const result1 = generator.generateForPattern(lowFrequency, []);
    const result2 = generator.generateForPattern(mediumFrequency, []);
    const result3 = generator.generateForPattern(highFrequency, []);

    expect(result3.confidence).toBeGreaterThan(result2.confidence);
    expect(result2.confidence).toBeGreaterThan(result1.confidence);
  });

  it('should boost confidence for exact matches', () => {
    const generator = new RuleGenerator();
    const exactMatch = createSamplePattern({
      pattern_text: 'use f-strings',
      count: 3,
    });
    const similarTheme = createSamplePattern({
      pattern_text: 'use f-strings (similar theme)',
      count: 3,
    });

    const result1 = generator.generateForPattern(exactMatch, []);
    const result2 = generator.generateForPattern(similarTheme, []);

    expect(result1.confidence).toBeGreaterThan(result2.confidence);
  });

  it('should keep confidence within 0-1 range', () => {
    const generator = new RuleGenerator();
    const pattern = createSamplePattern({ count: 100 });

    const result = generator.generateForPattern(pattern, []);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
