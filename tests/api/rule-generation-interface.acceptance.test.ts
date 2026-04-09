/**
 * API-Level Tests for Rule Generation from Patterns (Story 3.7)
 *
 * TDD Red Phase: Failing API-level acceptance tests
 *
 * These tests validate the API contracts, interfaces, and business logic
 * at the API boundaries without external dependencies.
 *
 * Testing Strategy:
 * - Validate interface contracts and type definitions
 * - Test business logic validation at API boundaries
 * - Verify error handling and error codes
 * - Test input validation and sanitization
 * - Validate AR22 compliance for all errors
 *
 * Test Pyramid Level: API (Unit-level business logic tests in separate file)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  RuleGenerator,
  RuleSuggestion,
  RuleProposalType,
  RuleModification,
  ChangeHighlight,
  PlatformFormatter,
  RuleGenerationErrorCode,
  AR22Error as RuleGenerationAR22Error,
} from '../../src/rules/rule-generator';
import {
  Pattern,
  PatternCategory,
} from '../../src/pattern-detector';
import {
  ContentType,
} from '../../src/content-analyzer';

// ============================================================================
// TYPE DEFINITIONS AND ENUMS
// ============================================================================

describe('Rule Generation - Type Definitions', () => {
  describe('RuleProposalType Enum', () => {
    test('should have all required proposal types', () => {
      expect(RuleProposalType.NEW_RULE).toBeDefined();
      expect(RuleProposalType.ADDITION).toBeDefined();
      expect(RuleProposalType.MODIFICATION).toBeDefined();
    });

    test('should have 3 proposal types total', () => {
      const proposalTypes = Object.values(RuleProposalType);
      expect(proposalTypes).toHaveLength(3);
    });
  });

  describe('RuleGenerationErrorCode Enum', () => {
    test('should have all required error codes', () => {
      expect(RuleGenerationErrorCode.RULE_GENERATION_FAILED).toBeDefined();
      expect(RuleGenerationErrorCode.INVALID_PATTERN).toBeDefined();
      expect(RuleGenerationErrorCode.FORMATTING_FAILED).toBeDefined();
      expect(RuleGenerationErrorCode.INVALID_INPUT).toBeDefined();
    });

    test('should have 4 error codes total', () => {
      const errorCodes = Object.values(RuleGenerationErrorCode);
      expect(errorCodes).toHaveLength(4);
    });
  });
});

// ============================================================================
// INTERFACE CONTRACTS
// ============================================================================

describe('Rule Generation - Interface Contracts', () => {
  describe('ChangeHighlight Interface', () => {
    test('should create valid ChangeHighlight for additions', () => {
      const highlight: ChangeHighlight = {
        type: 'addition',
        text: 'Use f-strings instead of format()',
        position: { start: 0, end: 35 },
      };

      expect(highlight.type).toBe('addition');
      expect(highlight.text).toBeDefined();
      expect(highlight.position).toBeDefined();
      expect(highlight.position.start).toBe(0);
      expect(highlight.position.end).toBe(35);
    });

    test('should create valid ChangeHighlight for deletions', () => {
      const highlight: ChangeHighlight = {
        type: 'deletion',
        text: 'Use format() for string formatting',
        position: { start: 0, end: 35 },
      };

      expect(highlight.type).toBe('deletion');
      expect(highlight.text).toBeDefined();
    });

    test('should create valid ChangeHighlight for modifications', () => {
      const highlight: ChangeHighlight = {
        type: 'modification',
        text: 'prefer async/await over Promise.then()',
        position: { start: 0, end: 35 },
      };

      expect(highlight.type).toBe('modification');
      expect(highlight.text).toBeDefined();
    });
  });

  describe('RuleSuggestion Interface', () => {
    const createMockPattern = (): Pattern => ({
      pattern_text: 'prefer f-strings over format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings instead of format() or %',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    });

    test('should create valid RuleSuggestion with all required fields', () => {
      const pattern = createMockPattern();
      const suggestion: RuleSuggestion = {
        id: 'rule-001',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Use f-strings instead of format() or %',
        explanation: 'Consistent pattern observed in Python code corrections',
        contentType: ContentType.CODE,
        confidence: 0.9,
        platformFormats: {
          cursor: '# Python String Formatting\n- Use f-strings instead of format() or %',
          copilot: '## Python String Formatting\nWhen writing Python code, prefer f-strings over format() or % for string interpolation.',
        },
      };

      expect(suggestion.id).toBeDefined();
      expect(suggestion.type).toBe(RuleProposalType.NEW_RULE);
      expect(suggestion.pattern).toEqual(pattern);
      expect(suggestion.ruleText).toBeDefined();
      expect(suggestion.explanation).toBeDefined();
      expect(suggestion.contentType).toBe(ContentType.CODE);
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
      expect(suggestion.platformFormats.cursor).toBeDefined();
      expect(suggestion.platformFormats.copilot).toBeDefined();
    });

    test('should include optional beforeAfter field for modifications', () => {
      const pattern = createMockPattern();
      const suggestion: RuleSuggestion = {
        id: 'rule-002',
        type: RuleProposalType.MODIFICATION,
        pattern,
        ruleText: 'Use f-strings instead of format() or %',
        explanation: 'Enhanced rule with more context',
        contentType: ContentType.CODE,
        confidence: 0.85,
        platformFormats: {
          cursor: '# Python\n- Use f-strings',
          copilot: '## Python\nUse f-strings',
        },
        beforeAfter: {
          before: '# Python String Formatting\n- Use format() for strings',
          after: '# Python String Formatting\n- Use f-strings instead of format() or %',
          changes: [
            {
              type: 'deletion',
              text: 'Use format() for strings',
              position: { start: 25, end: 48 },
            },
            {
              type: 'addition',
              text: 'Use f-strings instead of format() or %',
              position: { start: 25, end: 62 },
            },
          ],
        },
      };

      expect(suggestion.beforeAfter).toBeDefined();
      expect(suggestion.beforeAfter.before).toBeDefined();
      expect(suggestion.beforeAfter.after).toBeDefined();
      expect(suggestion.beforeAfter.changes).toHaveLength(2);
    });
  });

  describe('RuleModification Interface', () => {
    test('should create valid RuleModification', () => {
      const modification: RuleModification = {
        existingRule: '# Python\n- Use format()',
        proposedRule: '# Python\n- Use f-strings',
        reason: 'Pattern analysis shows strong preference for f-strings',
        confidence: 0.9,
        changes: [
          {
            type: 'modification',
            text: 'Use f-strings',
            position: { start: 10, end: 25 },
          },
        ],
      };

      expect(modification.existingRule).toBeDefined();
      expect(modification.proposedRule).toBeDefined();
      expect(modification.reason).toBeDefined();
      expect(modification.confidence).toBeGreaterThan(0);
      expect(modification.changes).toBeDefined();
      expect(Array.isArray(modification.changes)).toBe(true);
    });
  });
});

// ============================================================================
// RULE GENERATOR CLASS API
// ============================================================================

describe('Rule Generator - RuleGenerator Class API', () => {
  test('should export RuleGenerator class', () => {
    expect(typeof RuleGenerator).toBe('function');
  });

  test('should be instantiable without parameters', () => {
    expect(() => {
      new RuleGenerator();
    }).not.toThrow();
  });

  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should have generateRules method', () => {
    expect(typeof generator.generateRules).toBe('function');
  });

  test('should have generateForNewPattern method', () => {
    expect(typeof generator.generateForNewPattern).toBe('function');
  });

  test('should have generateForExistingRule method', () => {
    expect(typeof generator.generateForExistingRule).toBe('function');
  });
});

// ============================================================================
// GENERATE RULES API
// ============================================================================

describe('Rule Generator - generateRules API', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  const createMockPatterns = (): Pattern[] => [
    {
      pattern_text: 'prefer f-strings over format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings instead of format() or %',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'use const instead of var',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const instead of var',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.CODE],
    },
  ];

  test('should accept Pattern[] input', () => {
    const patterns = createMockPatterns();

    expect(() => {
      generator.generateRules(patterns);
    }).not.toThrow();
  });

  test('should return RuleSuggestion[]', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('should generate one rule per pattern', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    expect(result).toHaveLength(2);
  });

  test('should include source pattern in each suggestion', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    result.forEach((suggestion, index) => {
      expect(suggestion.pattern).toEqual(patterns[index]);
    });
  });

  test('should generate clear, concise rule text', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    result.forEach((suggestion) => {
      expect(suggestion.ruleText).toBeDefined();
      expect(suggestion.ruleText.length).toBeGreaterThan(0);
      expect(suggestion.ruleText.length).toBeLessThanOrEqual(200); // Max length requirement
    });
  });

  test('should include explanation for traceability', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    result.forEach((suggestion) => {
      expect(suggestion.explanation).toBeDefined();
      expect(suggestion.explanation.length).toBeGreaterThan(0);
    });
  });

  test('should include confidence score', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    result.forEach((suggestion) => {
      expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
      expect(suggestion.confidence).toBeLessThanOrEqual(1);
    });
  });

  test('should include platform-specific formats', () => {
    const patterns = createMockPatterns();
    const result = generator.generateRules(patterns);

    result.forEach((suggestion) => {
      expect(suggestion.platformFormats.cursor).toBeDefined();
      expect(suggestion.platformFormats.copilot).toBeDefined();
    });
  });

  test('should handle empty pattern array', () => {
    const result = generator.generateRules([]);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  test('should throw AR22Error for null input', () => {
    expect(() => {
      generator.generateRules(null as any);
    }).toThrow(RuleGenerationAR22Error);
  });

  test('should throw AR22Error for undefined input', () => {
    expect(() => {
      generator.generateRules(undefined as any);
    }).toThrow(RuleGenerationAR22Error);
  });

  test('should throw AR22Error for non-array input', () => {
    expect(() => {
      generator.generateRules('not an array' as any);
    }).toThrow(RuleGenerationAR22Error);
  });
});

// ============================================================================
// GENERATE FOR NEW PATTERN API
// ============================================================================

describe('Rule Generator - generateForNewPattern API', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  const createMockPattern = (): Pattern => ({
    pattern_text: 'prefer async/await over Promise.then()',
    count: 4,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Use async/await instead of Promise.then()',
    first_seen: '2026-03-20T10:00:00Z',
    last_seen: '2026-03-20T12:00:00Z',
    content_types: [ContentType.CODE],
  });

  test('should accept single Pattern input', () => {
    const pattern = createMockPattern();

    expect(() => {
      generator.generateForNewPattern(pattern);
    }).not.toThrow();
  });

  test('should return RuleSuggestion with NEW_RULE type', () => {
    const pattern = createMockPattern();
    const result = generator.generateForNewPattern(pattern);

    expect(result.type).toBe(RuleProposalType.NEW_RULE);
  });

  test('should generate actionable rule text', () => {
    const pattern = createMockPattern();
    const result = generator.generateForNewPattern(pattern);

    expect(result.ruleText).toBeDefined();
    expect(result.ruleText).toContain('async/await');
  });

  test('should calculate confidence based on pattern count', () => {
    const highFrequencyPattern: Pattern = {
      ...createMockPattern(),
      count: 10,
    };

    const lowFrequencyPattern: Pattern = {
      ...createMockPattern(),
      count: 2,
    };

    const highConfidenceResult = generator.generateForNewPattern(highFrequencyPattern);
    const lowConfidenceResult = generator.generateForNewPattern(lowFrequencyPattern);

    expect(highConfidenceResult.confidence).toBeGreaterThan(lowConfidenceResult.confidence);
  });

  test('should include content type in suggestion', () => {
    const pattern = createMockPattern();
    const result = generator.generateForNewPattern(pattern);

    expect(result.contentType).toBeDefined();
    expect(result.contentType).toBe(ContentType.CODE);
  });
});

// ============================================================================
// GENERATE FOR EXISTING RULE API
// ============================================================================

describe('Rule Generator - generateForExistingRule API', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  const createMockPattern = (): Pattern => ({
    pattern_text: 'prefer f-strings over format()',
    count: 7,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Use f-strings instead of format()',
    first_seen: '2026-03-20T10:00:00Z',
    last_seen: '2026-03-20T12:00:00Z',
    content_types: [ContentType.CODE],
  });

  test('should accept Pattern and existing rule', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    expect(() => {
      generator.generateForExistingRule(pattern, existingRule);
    }).not.toThrow();
  });

  test('should return RuleModification', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    const result = generator.generateForExistingRule(pattern, existingRule);

    expect(result).toBeDefined();
    expect(result.existingRule).toBeDefined();
    expect(result.proposedRule).toBeDefined();
    expect(result.changes).toBeDefined();
  });

  test('should include before/after comparison', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    const result = generator.generateForExistingRule(pattern, existingRule);

    expect(result.existingRule).toBe(existingRule);
    expect(result.proposedRule).toContain('f-strings');
  });

  test('should highlight specific changes', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    const result = generator.generateForExistingRule(pattern, existingRule);

    expect(result.changes).toBeDefined();
    expect(result.changes.length).toBeGreaterThan(0);
    result.changes.forEach((change) => {
      expect(['addition', 'deletion', 'modification']).toContain(change.type);
    });
  });

  test('should provide reason for modification', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    const result = generator.generateForExistingRule(pattern, existingRule);

    expect(result.reason).toBeDefined();
    expect(result.reason.length).toBeGreaterThan(0);
  });

  test('should include confidence score', () => {
    const pattern = createMockPattern();
    const existingRule = '# Python\n- Use format() for strings';

    const result = generator.generateForExistingRule(pattern, existingRule);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// PLATFORM FORMATTER API
// ============================================================================

describe('Rule Generator - PlatformFormatter API', () => {
  let formatter: PlatformFormatter;

  beforeEach(() => {
    formatter = new PlatformFormatter();
  });

  const createMockRuleSuggestions = (): RuleSuggestion[] => [
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
  ];

  test('should have formatForCursor method', () => {
    expect(typeof formatter.formatForCursor).toBe('function');
  });

  test('should have formatForCopilot method', () => {
    expect(typeof formatter.formatForCopilot).toBe('function');
  });

  test('should format for Cursor with comment syntax', () => {
    const rules = createMockRuleSuggestions();
    const result = formatter.formatForCursor(rules);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('#'); // Comment syntax
  });

  test('should format for Cursor with one rule per line', () => {
    const rules = createMockRuleSuggestions();
    const result = formatter.formatForCursor(rules);

    const lines = result.split('\n').filter(line => line.trim().length > 0);
    expect(lines.length).toBeGreaterThan(0);
  });

  test('should format for Copilot with markdown', () => {
    const rules = createMockRuleSuggestions();
    const result = formatter.formatForCopilot(rules);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
    expect(result).toContain('##'); // Markdown headers
  });

  test('should format for Copilot with structured sections', () => {
    const rules = createMockRuleSuggestions();
    const result = formatter.formatForCopilot(rules);

    expect(result).toContain('##'); // Section headers
    expect(result).toContain('When writing'); // Contextual phrasing
  });

  test('should handle empty rule array for Cursor', () => {
    const result = formatter.formatForCursor([]);

    expect(typeof result).toBe('string');
  });

  test('should handle empty rule array for Copilot', () => {
    const result = formatter.formatForCopilot([]);

    expect(typeof result).toBe('string');
  });
});

// ============================================================================
// MULTI-CONTENT TYPE SUPPORT API
// ============================================================================

describe('Rule Generator - Multi-Content Type Support API', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should generate code-specific rules', () => {
    const codePattern: Pattern = {
      pattern_text: 'prefer f-strings',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use f-strings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(codePattern);

    expect(result.contentType).toBe(ContentType.CODE);
    expect(result.ruleText).toMatch(/when writing code|for code|in code/i);
  });

  test('should generate documentation-specific rules', () => {
    const docPattern: Pattern = {
      pattern_text: 'use lowercase headings',
      count: 3,
      category: PatternCategory.FORMATTING,
      examples: [],
      suggested_rule: 'Use lowercase headings',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DOCUMENTATION],
    };

    const result = generator.generateForNewPattern(docPattern);

    expect(result.contentType).toBe(ContentType.DOCUMENTATION);
    expect(result.ruleText).toMatch(/in documentation|for documentation|when writing documentation/i);
  });

  test('should generate diagram-specific rules', () => {
    const diagramPattern: Pattern = {
      pattern_text: 'use consistent box shapes',
      count: 2,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Use consistent box shapes',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DIAGRAM],
    };

    const result = generator.generateForNewPattern(diagramPattern);

    expect(result.contentType).toBe(ContentType.DIAGRAM);
    expect(result.ruleText).toMatch(/in diagrams|for diagrams/i);
  });

  test('should handle patterns with multiple content types', () => {
    const multiTypePattern: Pattern = {
      pattern_text: 'be concise',
      count: 4,
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: 'Be concise',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE, ContentType.DOCUMENTATION],
    };

    const result = generator.generateForNewPattern(multiTypePattern);

    expect(result.platformFormats.cursor).toBeDefined();
    expect(result.platformFormats.copilot).toBeDefined();
  });
});

// ============================================================================
// ERROR HANDLING API (AR22 COMPLIANCE)
// ============================================================================

describe('Rule Generator - AR22 Error Handling API', () => {
  test('should export AR22Error class', () => {
    expect(typeof RuleGenerationAR22Error).toBe('function');
  });

  test('should create AR22Error with required fields', () => {
    const error = new RuleGenerationAR22Error('Test error', {
      what: 'Test what happened',
      how: ['Step 1', 'Step 2'],
      technical: 'Test technical details',
    });

    expect(error.message).toBe('Test error');
    expect(error.what).toBe('Test what happened');
    expect(error.how).toEqual(['Step 1', 'Step 2']);
    expect(error.technical).toBe('Test technical details');
  });

  test('should accept optional error code', () => {
    const error = new RuleGenerationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      RuleGenerationErrorCode.INVALID_INPUT
    );

    expect(error.code).toBe(RuleGenerationErrorCode.INVALID_INPUT);
  });

  test('should accept optional original error', () => {
    const originalError = new Error('Original error');
    const error = new RuleGenerationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      RuleGenerationErrorCode.INVALID_INPUT,
      originalError
    );

    expect(error.originalError).toBe(originalError);
  });

  test('should have toString method for formatted output', () => {
    const error = new RuleGenerationAR22Error('Test error', {
      what: 'Test what happened',
      how: ['Step 1', 'Step 2'],
      technical: 'Test technical details',
    });

    expect(typeof error.toString).toBe('function');

    const errorString = error.toString();
    expect(errorString).toContain('Test error');
    expect(errorString).toContain('Test what happened');
    expect(errorString).toContain('Step 1');
    expect(errorString).toContain('Test technical details');
  });

  test('should include error code in toString if provided', () => {
    const error = new RuleGenerationAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      RuleGenerationErrorCode.INVALID_INPUT
    );

    const errorString = error.toString();
    expect(errorString).toContain('INVALID_INPUT');
  });
});

// ============================================================================
// CONTENT TYPE AWARENESS API
// ============================================================================

describe('Rule Generator - Content Type Awareness API', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  test('should add context prefix for code content type', () => {
    const codePattern: Pattern = {
      pattern_text: 'prefer const over var',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const instead of var',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.CODE],
    };

    const result = generator.generateForNewPattern(codePattern);

    expect(result.platformFormats.copilot).toMatch(/when writing (javascript|typescript|code)/i);
  });

  test('should add context prefix for documentation content type', () => {
    const docPattern: Pattern = {
      pattern_text: 'use active voice',
      count: 3,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Use active voice',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.DOCUMENTATION],
    };

    const result = generator.generateForNewPattern(docPattern);

    expect(result.platformFormats.copilot).toMatch(/in documentation/i);
  });

  test('should handle general text without specific context', () => {
    const generalPattern: Pattern = {
      pattern_text: 'be concise',
      count: 4,
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: 'Be concise',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.GENERAL_TEXT],
    };

    const result = generator.generateForNewPattern(generalPattern);

    expect(result.platformFormats.copilot).toBeDefined();
    expect(result.platformFormats.cursor).toBeDefined();
  });
});
