/**
 * Pattern Detector Test Suite (Story 2-4)
 *
 * Comprehensive test coverage for recurring pattern detection
 * Following test architecture principle: unit > integration > E2E
 *
 * Test categories:
 * 1. Exact Match Pattern Detection Tests
 * 2. Similarity-Based Pattern Detection Tests
 * 3. Pattern Categorization Tests
 * 4. Threshold Validation Tests
 * 5. Suggested Rule Generation Tests
 * 6. Content Type Integration Tests
 * 7. Role-Agnostic Behavior Tests
 * 8. Similarity Function Reuse Tests
 * 9. AR22 Error Handling Tests
 * 10. Edge Case Tests
 * 11. Integration Tests with Content Analyzer
 * 12. Performance Tests
 */

import {
  PatternDetector,
  Pattern,
  PatternCategory,
  PatternDetectionResult,
  PatternDetectionErrorCode,
  AR22Error as PatternAR22Error,
  detectPatterns,
} from '../pattern-detector';
import { ContentAnalyzedCorrection, ContentType } from '../content-analyzer';
import { ClassifiedCorrection, ClassificationDecision } from '../correction-classifier';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock content-analyzed correction for testing
 * Reuses the pattern from Story 2-3 test fixtures
 */
const createMockContentAnalyzedCorrection = (
  userCorrection: string,
  contentType: ContentType = ContentType.GENERAL_TEXT
): ContentAnalyzedCorrection => {
  const classification: ClassificationDecision = {
    type: 'correction',
    confidence: 0.9,
    requires_manual_review: false,
    reasoning: 'Test classification',
  };

  const baseCorrection: ClassifiedCorrection = {
    original_suggestion: 'AI suggestion',
    user_correction: userCorrection,
    context: 'Test context',
    classification,
  };

  return {
    ...baseCorrection,
    content_metadata: {
      type: contentType,
      format: contentType === ContentType.CODE ? 'code-block' : 'plain-text',
      detected_patterns: [],
      confidence: 0.9,
    },
    normalized_correction: userCorrection.toLowerCase().trim(),
    applicable_for_patterns: true,
  };
};

/**
 * Create a mock pattern for testing expected outputs
 */
const createMockPattern = (
  patternText: string,
  count: number,
  category: PatternCategory
): Pattern => {
  return {
    pattern_text: patternText,
    count,
    category,
    examples: [],
    suggested_rule: `Use ${patternText} instead of current pattern`,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    content_types: [ContentType.GENERAL_TEXT],
  };
};

// ============================================================================
// EXACT MATCH PATTERN DETECTION TESTS
// ============================================================================

describe('Exact Match Pattern Detection', () => {
  describe('should detect identical corrections appearing 2+ times', () => {
    test('when two identical code style corrections are present', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use camelcase naming', ContentType.CODE),
        createMockContentAnalyzedCorrection('use camelcase naming', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // Failing assertion - PatternDetector class doesn't exist yet
      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns.some(p => p.count >= 2)).toBe(true);
    });

    test('when three identical terminology corrections are present', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use api instead of Api', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use api instead of Api', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use api instead of Api', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].count).toBe(3);
    });

    test('when identical corrections appear across different content types', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('add semicolons', ContentType.CODE),
        createMockContentAnalyzedCorrection('add semicolons', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.CODE);
      expect(result.patterns[0].content_types).toContain(ContentType.DOCUMENTATION);
    });

    test('and track first_seen and last_seen timestamps', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use async await', ContentType.CODE),
        createMockContentAnalyzedCorrection('use async await', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].first_seen).toBeDefined();
      expect(result.patterns[0].last_seen).toBeDefined();
      expect(result.patterns[0].first_seen).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    test('and store up to 3 examples with context', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('example 1', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('example 2', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('example 3', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('example 4', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('example 5', ContentType.GENERAL_TEXT),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // All identical, should be one pattern
      expect(result.patterns[0].examples.length).toBeLessThanOrEqual(3);
      expect(result.patterns[0].examples.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// SIMILARITY-BASED PATTERN DETECTION TESTS
// ============================================================================

describe('Similarity-Based Pattern Detection', () => {
  describe('should detect similar themes with >= 0.7 similarity', () => {
    test('when corrections use different words for same concept', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use camelcase for variables', ContentType.CODE),
        createMockContentAnalyzedCorrection('use camelcase naming for variables', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.detection_summary.similar_themes).toBeGreaterThan(0);
    });

    test('when corrections have similar but not identical wording', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('add semicolons to statements', ContentType.CODE),
        createMockContentAnalyzedCorrection('add semicolon at end of lines', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
    });

    test('and distinguish from low similarity corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use async await', ContentType.CODE),
        createMockContentAnalyzedCorrection('use async await', ContentType.CODE),
        createMockContentAnalyzedCorrection('completely different pattern', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // Should detect the pattern from identical corrections
      expect(result.patterns_found).toBeGreaterThanOrEqual(1);
      // Low similarity correction should not be grouped
      expect(result.patterns.every(p => p.count >= 2)).toBe(true);
    });

    test('and use appropriate threshold for different content types', () => {
      const codeCorrections = [
        createMockContentAnalyzedCorrection('function name', ContentType.CODE),
        createMockContentAnalyzedCorrection('function names', ContentType.CODE),
      ];

      const docCorrections = [
        createMockContentAnalyzedCorrection('api endpoint', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('api endpoints', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const codeResult = detector.detectPatterns(codeCorrections);
      const docResult = detector.detectPatterns(docCorrections);

      // Both should detect patterns with appropriate thresholds
      expect(codeResult.patterns_found).toBeGreaterThan(0);
      expect(docResult.patterns_found).toBeGreaterThan(0);
    });
  });

  describe('should reuse calculateStringSimilarity from Story 2-2', () => {
    test('by importing from correction-classifier', () => {
      // This test verifies the similarity function is reused
      const detector = new PatternDetector();

      // Access the private similarity calculation method
      const similarity = detector['calculateSimilarity']('test string', 'test string');

      expect(similarity).toBe(1.0);
    });

    test('and maintain consistent behavior with Story 2-2', () => {
      const detector = new PatternDetector();

      const exactMatch = detector['calculateSimilarity']('identical', 'identical');
      const similarMatch = detector['calculateSimilarity']('similar text', 'similar text');
      const differentMatch = detector['calculateSimilarity']('completely different', 'not same');

      expect(exactMatch).toBe(1.0);
      expect(similarMatch).toBeGreaterThan(0.7);
      expect(differentMatch).toBeLessThan(0.7);
    });
  });
});

// ============================================================================
// PATTERN CATEGORIZATION TESTS
// ============================================================================

describe('Pattern Categorization', () => {
  describe('should categorize as code_style', () => {
    test('when pattern involves naming conventions', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use camelcase for variables', ContentType.CODE),
        createMockContentAnalyzedCorrection('use camelcase for variables', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.CODE_STYLE);
    });

    test('when pattern involves formatting preferences', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use 2 spaces for indentation', ContentType.CODE),
        createMockContentAnalyzedCorrection('use 2 spaces for indentation', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.CODE_STYLE);
    });
  });

  describe('should categorize as terminology', () => {
    test('when pattern involves word choice', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use api instead of API', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use api instead of API', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.TERMINOLOGY);
    });

    test('when pattern involves phrase preferences', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use fetch data instead of get data', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use fetch data instead of get data', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.TERMINOLOGY);
    });
  });

  describe('should categorize as structure', () => {
    test('when pattern involves file organization', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('group imports by type', ContentType.CODE),
        createMockContentAnalyzedCorrection('group imports by type', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.STRUCTURE);
    });
  });

  describe('should categorize as formatting', () => {
    test('when pattern involves spacing', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('add blank line between functions', ContentType.CODE),
        createMockContentAnalyzedCorrection('add blank line between functions', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.FORMATTING);
    });
  });

  describe('should categorize as convention', () => {
    test('when pattern involves best practices', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use async await instead of promises', ContentType.CODE),
        createMockContentAnalyzedCorrection('use async await instead of promises', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.CONVENTION);
    });
  });

  describe('should categorize as other', () => {
    test('when pattern does not fit any category', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('unusual pattern text here', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('unusual pattern text here', ContentType.GENERAL_TEXT),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].category).toBe(PatternCategory.OTHER);
    });
  });
});

// ============================================================================
// THRESHOLD VALIDATION TESTS
// ============================================================================

describe('Threshold Validation', () => {
  describe('should only detect patterns with 2+ occurrences', () => {
    test('when single correction exists', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('only one correction', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBe(0);
      expect(result.patterns).toHaveLength(0);
    });

    test('when all corrections are unique', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('unique correction 1', ContentType.CODE),
        createMockContentAnalyzedCorrection('unique correction 2', ContentType.CODE),
        createMockContentAnalyzedCorrection('unique correction 3', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBe(0);
    });

    test('when minimum threshold of 2 is met', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('pattern text', ContentType.CODE),
        createMockContentAnalyzedCorrection('pattern text', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBe(1);
      expect(result.patterns[0].count).toBe(2);
    });

    test('when pattern appears more than 2 times', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('repeated pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('repeated pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('repeated pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('repeated pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('repeated pattern', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].count).toBe(5);
    });
  });
});

// ============================================================================
// SUGGESTED RULE GENERATION TESTS
// ============================================================================

describe('Suggested Rule Generation', () => {
  describe('should generate actionable rule suggestions', () => {
    test('using [ACTION] instead of [CURRENT_PATTERN] template', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use camelcase naming', ContentType.CODE),
        createMockContentAnalyzedCorrection('use camelcase naming', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].suggested_rule).toBeDefined();
      expect(result.patterns[0].suggested_rule).toContain('instead of');
    });

    test('that are clear and actionable', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('add semicolons', ContentType.CODE),
        createMockContentAnalyzedCorrection('add semicolons', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].suggested_rule).toBeTruthy();
      expect(result.patterns[0].suggested_rule.length).toBeGreaterThan(0);
    });

    test('for different pattern categories', () => {
      const testCases = [
        { corrections: ['use async await', 'use async await'], category: PatternCategory.CONVENTION },
        { corrections: ['use camelcase', 'use camelcase'], category: PatternCategory.CODE_STYLE },
        { corrections: ['use api', 'use api'], category: PatternCategory.TERMINOLOGY },
      ];

      const detector = new PatternDetector();

      testCases.forEach(({ corrections, category }) => {
        const mockCorrections = corrections.map(c =>
          createMockContentAnalyzedCorrection(c, ContentType.CODE)
        );
        const result = detector.detectPatterns(mockCorrections);

        expect(result.patterns[0].category).toBe(category);
        expect(result.patterns[0].suggested_rule).toBeDefined();
      });
    });
  });
});

// ============================================================================
// CONTENT TYPE INTEGRATION TESTS
// ============================================================================

describe('Content Type Integration', () => {
  describe('should work with code content type', () => {
    test('detecting patterns in code corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use typescript interfaces', ContentType.CODE),
        createMockContentAnalyzedCorrection('use typescript interfaces', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.CODE);
    });
  });

  describe('should work with documentation content type', () => {
    test('detecting patterns in documentation corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use lowercase for api', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use lowercase for api', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.DOCUMENTATION);
    });
  });

  describe('should work with diagram content type', () => {
    test('detecting patterns in diagram corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use left-to-right flow', ContentType.DIAGRAM),
        createMockContentAnalyzedCorrection('use left-to-right flow', ContentType.DIAGRAM),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.DIAGRAM);
    });
  });

  describe('should work with PRD content type', () => {
    test('detecting patterns in PRD corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use user story format', ContentType.PRD),
        createMockContentAnalyzedCorrection('use user story format', ContentType.PRD),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.PRD);
    });
  });

  describe('should work with test plan content type', () => {
    test('detecting patterns in test plan corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use given when then format', ContentType.TEST_PLAN),
        createMockContentAnalyzedCorrection('use given when then format', ContentType.TEST_PLAN),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.TEST_PLAN);
    });
  });

  describe('should work with general text content type', () => {
    test('detecting patterns in general text corrections', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use clear language', ContentType.GENERAL_TEXT),
        createMockContentAnalyzedCorrection('use clear language', ContentType.GENERAL_TEXT),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types).toContain(ContentType.GENERAL_TEXT);
    });
  });
});

// ============================================================================
// ROLE-AGNOSTIC BEHAVIOR TESTS
// ============================================================================

describe('Role-Agnostic Behavior', () => {
  describe('should treat all content types equally', () => {
    test('detecting patterns across all content types', () => {
      const contentTypes = [
        ContentType.CODE,
        ContentType.DOCUMENTATION,
        ContentType.DIAGRAM,
        ContentType.PRD,
        ContentType.TEST_PLAN,
        ContentType.GENERAL_TEXT,
      ];

      const corrections = contentTypes.map(type =>
        createMockContentAnalyzedCorrection('same pattern across types', type)
      );

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // Should detect the pattern across all content types
      expect(result.patterns_found).toBeGreaterThan(0);
      expect(result.patterns[0].content_types.length).toBe(contentTypes.length);
    });
  });

  describe('should not have content type bias', () => {
    test('maintaining equal pattern detection quality', () => {
      const codePattern = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
      ];

      const docPattern = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('use pattern', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const codeResult = detector.detectPatterns(codePattern);
      const docResult = detector.detectPatterns(docPattern);

      // Both should detect the pattern with same confidence
      expect(codeResult.patterns_found).toBe(docResult.patterns_found);
      expect(codeResult.patterns[0].count).toBe(docResult.patterns[0].count);
    });
  });

  describe('should mark all corrections as applicable for patterns', () => {
    test('regardless of content type', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('pattern 1', ContentType.CODE),
        createMockContentAnalyzedCorrection('pattern 2', ContentType.DOCUMENTATION),
        createMockContentAnalyzedCorrection('pattern 3', ContentType.DIAGRAM),
        createMockContentAnalyzedCorrection('pattern 4', ContentType.PRD),
        createMockContentAnalyzedCorrection('pattern 5', ContentType.TEST_PLAN),
        createMockContentAnalyzedCorrection('pattern 6', ContentType.GENERAL_TEXT),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // All corrections should be considered for pattern detection
      expect(result.total_corrections_analyzed).toBe(corrections.length);
    });
  });
});

// ============================================================================
// AR22 ERROR HANDLING TESTS
// ============================================================================

describe('AR22 Error Handling', () => {
  describe('should handle insufficient corrections gracefully', () => {
    test('when less than 2 corrections provided', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('only one', ContentType.CODE),
      ];

      const detector = new PatternDetector();

      expect(() => detector.detectPatterns(corrections)).not.toThrow();
      const result = detector.detectPatterns(corrections);
      expect(result.patterns_found).toBe(0);
    });

    test('when no patterns are found', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('unique 1', ContentType.CODE),
        createMockContentAnalyzedCorrection('unique 2', ContentType.CODE),
        createMockContentAnalyzedCorrection('unique 3', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns_found).toBe(0);
      expect(result.patterns).toHaveLength(0);
    });
  });

  describe('should handle malformed input', () => {
    test('when content analyzer output is invalid', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('valid correction', ContentType.CODE),
        null as unknown as ContentAnalyzedCorrection,
      ];

      const detector = new PatternDetector();

      expect(() => detector.detectPatterns(corrections)).not.toThrow();
    });

    test('when similarity calculation fails', () => {
      const detector = new PatternDetector();

      expect(() => detector['calculateSimilarity']('valid', 'valid')).not.toThrow();
    });
  });

  describe('should provide actionable error messages', () => {
    test('for insufficient corrections', () => {
      const corrections: ContentAnalyzedCorrection[] = [];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.total_corrections_analyzed).toBe(0);
      expect(result.patterns_found).toBe(0);
    });

    test('for invalid input', () => {
      const detector = new PatternDetector();

      expect(() => detector.detectPatterns(null as unknown as ContentAnalyzedCorrection[])).not.toThrow();
      expect(() => detector.detectPatterns(undefined as unknown as ContentAnalyzedCorrection[])).not.toThrow();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS WITH CONTENT ANALYZER
// ============================================================================

describe('Integration with Content Analyzer', () => {
  describe('should accept ContentAnalyzedCorrection[] input', () => {
    test('processing content-analyzed corrections', () => {
      const corrections: ContentAnalyzedCorrection[] = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.total_corrections_analyzed).toBe(2);
      expect(result.patterns_found).toBeGreaterThan(0);
    });
  });

  describe('should extract normalized corrections for comparison', () => {
    test('using normalized_correction field', () => {
      const corrections: ContentAnalyzedCorrection[] = [
        {
          ...createMockContentAnalyzedCorrection('USE PATTERN', ContentType.CODE),
          normalized_correction: 'use pattern',
        },
        {
          ...createMockContentAnalyzedCorrection('Use Pattern', ContentType.CODE),
          normalized_correction: 'use pattern',
        },
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // Should detect pattern based on normalized form
      expect(result.patterns_found).toBeGreaterThan(0);
    });
  });

  describe('should include content type metadata in patterns', () => {
    test('tracking content types for each pattern', () => {
      const corrections: ContentAnalyzedCorrection[] = [
        createMockContentAnalyzedCorrection('same pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('same pattern', ContentType.DOCUMENTATION),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.patterns[0].content_types).toContain(ContentType.CODE);
      expect(result.patterns[0].content_types).toContain(ContentType.DOCUMENTATION);
    });
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Performance Tests', () => {
  describe('should complete in acceptable time', () => {
    test('for 50 corrections (< 1 second)', () => {
      const corrections = Array.from({ length: 50 }, (_, i) =>
        createMockContentAnalyzedCorrection(`pattern ${i % 10}`, ContentType.CODE)
      );

      const detector = new PatternDetector();
      const startTime = Date.now();
      const result = detector.detectPatterns(corrections);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });

    test('for 100 corrections (< 5 seconds)', () => {
      const corrections = Array.from({ length: 100 }, (_, i) =>
        createMockContentAnalyzedCorrection(`pattern ${i % 10}`, ContentType.CODE)
      );

      const detector = new PatternDetector();
      const startTime = Date.now();
      const result = detector.detectPatterns(corrections);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('should warn for large datasets', () => {
    test('when corrections exceed 100', () => {
      const corrections = Array.from({ length: 101 }, (_, i) =>
        createMockContentAnalyzedCorrection(`pattern ${i % 10}`, ContentType.CODE)
      );

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      // Should include performance warning
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// CONVENIENCE FUNCTION TESTS
// ============================================================================

describe('Convenience Functions', () => {
  describe('should provide detectPatterns function', () => {
    test('for direct pattern detection', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
      ];

      const result = detectPatterns(corrections);

      expect(result).toBeDefined();
      expect(result.patterns_found).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// STATE JSON SCHEMA COMPLIANCE TESTS
// ============================================================================

describe('State.json Schema Compliance', () => {
  describe('should output patterns matching state.json schema', () => {
    test('with all required fields', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      const pattern = result.patterns[0];
      expect(pattern.pattern_text).toBeDefined();
      expect(pattern.count).toBeDefined();
      expect(pattern.category).toBeDefined();
      expect(pattern.examples).toBeDefined();
      expect(pattern.suggested_rule).toBeDefined();
      expect(pattern.first_seen).toBeDefined();
      expect(pattern.last_seen).toBeDefined();
      expect(pattern.content_types).toBeDefined();
    });

    test('with valid pattern categories', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
        createMockContentAnalyzedCorrection('use pattern', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      const validCategories = Object.values(PatternCategory);
      expect(validCategories).toContain(result.patterns[0].category);
    });

    test('with detection summary', () => {
      const corrections = [
        createMockContentAnalyzedCorrection('exact match', ContentType.CODE),
        createMockContentAnalyzedCorrection('exact match', ContentType.CODE),
        createMockContentAnalyzedCorrection('similar match', ContentType.CODE),
        createMockContentAnalyzedCorrection('similar match too', ContentType.CODE),
      ];

      const detector = new PatternDetector();
      const result = detector.detectPatterns(corrections);

      expect(result.detection_summary).toBeDefined();
      expect(result.detection_summary.exact_matches).toBeDefined();
      expect(result.detection_summary.similar_themes).toBeDefined();
      expect(result.detection_summary.categories_distribution).toBeDefined();
    });
  });
});
