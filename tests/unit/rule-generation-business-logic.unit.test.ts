/**
 * Unit Tests for Rule Generation Business Logic (Story 3.7)
 *
 * TDD Red Phase: Failing unit tests for business logic
 *
 * These tests verify the core business logic algorithms in isolation:
 * - Pattern interpretation and rule text generation
 * - Confidence score calculation
 * - Content type context handling
 * - Rule proposal type detection
 * - Change detection and diff generation
 * - Platform-specific formatting logic
 *
 * Test Pyramid Level: Unit (API-level and integration tests in separate files)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  RuleGenerator,
  RuleSuggestion,
  RuleProposalType,
  RuleModification,
  PlatformFormatter,
  ChangeHighlight,
} from '../../src/rules/rule-generator';
import {
  Pattern,
  PatternCategory,
} from '../../src/pattern-detector';
import {
  ContentType,
} from '../../src/content-analyzer';

// ============================================================================
// PATTERN INTERPRETATION TESTS
// ============================================================================

describe('Rule Generation Business Logic - Pattern Interpretation', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should extract actionable rule from pattern text', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings over format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText).toBeDefined();
    expect(result.ruleText.toLowerCase()).toContain('f-strings');
    expect(result.ruleText).toMatch(/^(use|prefer|avoid)/i);
  });

  test('should handle different pattern categories appropriately', () => {
    const codeStylePattern: Pattern = {
      pattern_text: 'use const instead of var',
      count: 4,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    };

    const terminologyPattern: Pattern = {
      pattern_text: 'use "user" instead of "customer"',
      count: 3,
      category: PatternCategory.TERMINOLOGY,
      examples: [],
      suggested_rule: 'Use "user"',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DOCUMENTATION],
    };

    const codeStyleResult = generator.generateForNewPattern(codeStylePattern);
    const terminologyResult = generator.generateForNewPattern(terminologyPattern);

    expect(codeStyleResult.ruleText).toBeDefined();
    expect(terminologyResult.ruleText).toBeDefined();
  });

  test('should generate concise rules under 200 characters', () => {
    const longPattern: Pattern = {
      pattern_text: 'prefer using async await syntax for handling asynchronous operations instead of promise then chains',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use async/await',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(longPattern);

    expect(result.ruleText.length).toBeLessThanOrEqual(200);
  });
});

// ============================================================================
// CONFIDENCE SCORING TESTS
// ============================================================================

describe('Rule Generation Business Logic - Confidence Scoring', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should calculate confidence based on pattern frequency', () => {
    const highFrequencyPattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 10,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const lowFrequencyPattern: Pattern = {
      pattern_text: 'prefer const',
      count: 2,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    };

    const highResult = generator.generateForNewPattern(highFrequencyPattern);
    const lowResult = generator.generateForNewPattern(lowFrequencyPattern);

    expect(highResult.confidence).toBeGreaterThan(lowResult.confidence);
  });

  test('should assign high confidence (>= 0.8) for count >= 5', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should assign medium confidence (0.5-0.8) for count 3-4', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer const',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.confidence).toBeLessThan(0.8);
  });

  test('should assign lower confidence (< 0.5) for count = 2', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer async',
      count: 2,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use async',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T10:30:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.confidence).toBeLessThan(0.5);
  });

  test('should ensure confidence is always between 0 and 1', () => {
    const patterns: Pattern[] = [
      {
        pattern_text: 'pattern-1',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Rule 1',
        first_seen: '2026-03-20T10:00:00Z',
        last_seen: '2026-03-20T11:00:00Z',
        content_types: [ContentType.GENERAL_TEXT],
      },
      {
        pattern_text: 'pattern-2',
        count: 100,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Rule 2',
        first_seen: '2026-03-20T10:00:00Z',
        last_seen: '2026-03-20T12:00:00Z',
        content_types: [ContentType.GENERAL_TEXT],
      },
    ];

    const results = generator.generateRules(patterns);

    results.forEach((result) => {
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// CONTENT TYPE CONTEXT HANDLING TESTS
// ============================================================================

describe('Rule Generation Business Logic - Content Type Context', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should add "When writing Python code..." prefix for Python code', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.platformFormats.copilot).toMatch(/when writing (python|code)/i);
  });

  test('should add "In documentation..." prefix for documentation', () => {
    const pattern: Pattern = {
      pattern_text: 'use active voice',
      count: 3,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Use active voice',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DOCUMENTATION],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.platformFormats.copilot).toMatch(/in documentation/i);
  });

  test('should add "For diagrams..." prefix for diagrams', () => {
    const pattern: Pattern = {
      pattern_text: 'use consistent colors',
      count: 2,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Use consistent colors',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DIAGRAM],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.platformFormats.copilot).toMatch(/for diagrams|in diagrams/i);
  });

  test('should not add specific context for general text', () => {
    const pattern: Pattern = {
      pattern_text: 'be concise',
      count: 4,
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: 'Be concise',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.GENERAL_TEXT],
    };

    const result = generator.generateForNewPattern(pattern);

    // General text should have minimal context
    expect(result.platformFormats.copilot).toBeDefined();
  });
});

// ============================================================================
// RULE PROPOSAL TYPE DETECTION TESTS
// ============================================================================

describe('Rule Generation Business Logic - Proposal Type Detection', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should detect NEW_RULE when no similar rules exist', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.type).toBe(RuleProposalType.NEW_RULE);
  });

  test('should detect ADDITION when pattern complements existing rule', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings over format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Python String Formatting\n- Use format() for strings';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    // Should detect enhancement opportunity
    expect(modification.proposedRule).toBeDefined();
    expect(modification.proposedRule).not.toBe(existingRule);
  });

  test('should detect MODIFICATION when pattern conflicts with existing rule', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings instead of format()',
      count: 7,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Python\n- Use format() for strings';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    // Should detect need for modification
    expect(modification.changes).toBeDefined();
    expect(modification.changes.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// CHANGE DETECTION AND DIFF GENERATION TESTS
// ============================================================================

describe('Rule Generation Business Logic - Change Detection', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should detect additions when new content is added', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Python\n- Use format()';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    const additions = modification.changes.filter(c => c.type === 'addition');
    expect(additions.length).toBeGreaterThan(0);
  });

  test('should detect deletions when content is removed', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings instead of format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Python\n- Use format() for strings';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    const deletions = modification.changes.filter(c => c.type === 'deletion');
    expect(deletions.length).toBeGreaterThan(0);
  });

  test('should detect modifications when content is changed', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer async/await',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use async/await',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Async\n- Use Promise.then()';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    const modifications = modification.changes.filter(c => c.type === 'modification');
    expect(modifications.length).toBeGreaterThan(0);
  });

  test('should include position information for each change', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const existingRule = '# Python\n- Use format()';
    const modification = generator.generateForExistingRule(pattern, existingRule);

    modification.changes.forEach((change) => {
      expect(change.position).toBeDefined();
      expect(change.position.start).toBeGreaterThanOrEqual(0);
      expect(change.position.end).toBeGreaterThan(change.position.start);
    });
  });

  test('should calculate correct text positions', () => {
    const existingRule = 'Line 1\nLine 2\nLine 3';
    const pattern: Pattern = {
      pattern_text: 'modify line 2',
      count: 3,
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: 'Change line 2',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.GENERAL_TEXT],
    };

    const modification = generator.generateForExistingRule(pattern, existingRule);

    modification.changes.forEach((change) => {
      expect(change.position.start).toBeLessThanOrEqual(existingRule.length);
      expect(change.position.end).toBeLessThanOrEqual(existingRule.length);
    });
  });
});

// ============================================================================
// PLATFORM-SPECIFIC FORMATTING LOGIC TESTS
// ============================================================================

describe('Rule Generation Business Logic - Platform Formatting', () => {
  let formatter: PlatformFormatter;

  beforeEach(() => {
    formatter = new PlatformFormatter();
  });

  const createMockSuggestions = (): RuleSuggestion[] => [
    {
      id: 'rule-001',
      type: RuleProposalType.NEW_RULE,
      pattern: {
        pattern_text: 'prefer f-strings',
        count: 5,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Use f-strings',
        first_seen: '2026-03-20T10:00:00Z',
        last_seen: '2026-03-20T12:00:00Z',
        content_types: [ContentType.CODE],
      },
      ruleText: 'Use f-strings instead of format()',
      explanation: 'Python string formatting preference',
      contentType: ContentType.CODE,
      confidence: 0.9,
      platformFormats: {
        cursor: '',
        copilot: '',
      },
    },
    {
      id: 'rule-002',
      type: RuleProposalType.NEW_RULE,
      pattern: {
        pattern_text: 'use const',
        count: 4,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Use const',
        first_seen: '2026-03-20T10:00:00Z',
        last_seen: '2026-03-20T11:00:00Z',
        content_types: [ContentType.CODE],
      },
      ruleText: 'Use const instead of var',
      explanation: 'Variable declaration preference',
      contentType: ContentType.CODE,
      confidence: 0.85,
      platformFormats: {
        cursor: '',
        copilot: '',
      },
    },
  ];

  test('should format Cursor rules with # headers', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCursor(suggestions);

    expect(result).toContain('#');
  });

  test('should format Cursor rules with bullet points', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCursor(suggestions);

    const lines = result.split('\n');
    const bulletLines = lines.filter(line => line.trim().startsWith('-'));

    expect(bulletLines.length).toBeGreaterThan(0);
  });

  test('should format Cursor rules without markdown formatting', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCursor(suggestions);

    // Cursor format should be plain text with comments
    expect(result).not.toContain('**');
    expect(result).not.toContain('```');
  });

  test('should format Copilot rules with ## headers', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCopilot(suggestions);

    expect(result).toContain('##');
  });

  test('should format Copilot rules with markdown emphasis', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCopilot(suggestions);

    // Copilot format can use markdown for emphasis
    expect(result.length).toBeGreaterThan(0);
  });

  test('should group Copilot rules by content type', () => {
    const suggestions: RuleSuggestion[] = [
      {
        id: 'rule-001',
        type: RuleProposalType.NEW_RULE,
        pattern: {
          pattern_text: 'prefer f-strings',
          count: 5,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Use f-strings',
          first_seen: '2026-03-20T10:00:00Z',
          last_seen: '2026-03-20T12:00:00Z',
          content_types: [ContentType.CODE],
        },
        ruleText: 'Use f-strings',
        explanation: 'Python style',
        contentType: ContentType.CODE,
        confidence: 0.9,
        platformFormats: {
          cursor: '',
          copilot: '',
        },
      },
      {
        id: 'rule-002',
        type: RuleProposalType.NEW_RULE,
        pattern: {
          pattern_text: 'use active voice',
          count: 3,
          category: PatternCategory.CONVENTION,
          examples: [],
          suggested_rule: 'Use active voice',
          first_seen: '2026-03-20T10:00:00Z',
          last_seen: '2026-03-20T11:00:00Z',
          content_types: [ContentType.DOCUMENTATION],
        },
        ruleText: 'Use active voice',
        explanation: 'Documentation style',
        contentType: ContentType.DOCUMENTATION,
        confidence: 0.8,
        platformFormats: {
          cursor: '',
          copilot: '',
        },
      },
    ];

    const result = formatter.formatForCopilot(suggestions);

    // Should have separate sections for different content types
    const sections = result.split('##').filter(s => s.trim().length > 0);
    expect(sections.length).toBeGreaterThan(1);
  });

  test('should include contextual "When writing..." in Copilot format', () => {
    const suggestions = createMockSuggestions();
    const result = formatter.formatForCopilot(suggestions);

    expect(result).toMatch(/when writing|in documentation|for diagrams/i);
  });
});

// ============================================================================
// RULE TEXT GENERATION TESTS
// ============================================================================

describe('Rule Generation Business Logic - Rule Text Generation', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should generate clear and actionable rule text', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings over format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText).toBeDefined();
    expect(result.ruleText).toMatch(/^(use|prefer|avoid|apply)/i);
  });

  test('should avoid vague language in rule text', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText).not.toContain('maybe');
    expect(result.ruleText).not.toContain('perhaps');
    expect(result.ruleText).not.toContain('might');
    expect(result.ruleText).not.toContain('could');
  });

  test('should keep rule text concise', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer using f-string formatting for all string interpolation operations in python code',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText.length).toBeLessThanOrEqual(200);
  });

  test('should preserve technical accuracy in rule text', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer async/await over Promise.then()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use async/await',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText).toContain('async/await');
  });
});

// ============================================================================
// EXPLANATION GENERATION TESTS
// ============================================================================

describe('Rule Generation Business Logic - Explanation Generation', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should generate explanation based on pattern metadata', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.explanation).toBeDefined();
    expect(result.explanation.length).toBeGreaterThan(0);
  });

  test('should include pattern count in explanation', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 8,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    // Explanation should mention frequency
    expect(result.explanation).toMatch(/pattern|correction|time|frequency/i);
  });

  test('should include content type in explanation', () => {
    const pattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(pattern);

    expect(result.explanation).toBeDefined();
  });
});
