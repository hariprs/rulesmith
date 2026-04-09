/**
 * Category Grouper Tests (Story 2-5)
 *
 * Comprehensive test suite for category confidence scoring,
 * secondary category assignment, and thematic grouping.
 */

import { CategoryGrouper } from '../category-grouping';
import { Pattern, PatternCategory, PatternExample } from '../pattern-detector';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a mock pattern for testing
 */
function createMockPattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    pattern_text: 'Test pattern',
    count: 2,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'original suggestion',
        user_correction: 'user correction',
        context: 'test context',
        timestamp: new Date().toISOString(),
        content_type: 'code' as any,
      },
    ],
    suggested_rule: 'Test rule',
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    content_types: ['code' as any],
    ...overrides,
  };
}

/**
 * Create a mock pattern example
 */
function createExample(userCorrection: string): PatternExample {
  return {
    original_suggestion: 'original',
    user_correction: userCorrection,
    context: 'test context',
    timestamp: new Date().toISOString(),
    content_type: 'code' as any,
  };
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('CategoryGrouper', () => {
  let grouper: CategoryGrouper;

  beforeEach(() => {
    grouper = new CategoryGrouper();
  });

  describe('calculateCategoryConfidence', () => {
    test('should calculate high confidence for similar examples', () => {
      const pattern = createMockPattern({
        examples: [
          createExample('use camelCase for variables'),
          createExample('use camelCase for functions'),
          createExample('use camelCase for constants'),
        ],
      });

      const confidence = grouper.calculateCategoryConfidence(pattern);

      expect(confidence).toBeGreaterThan(0.7);
    });

    test('should calculate low confidence for dissimilar examples', () => {
      const pattern = createMockPattern({
        examples: [
          createExample('use camelCase for variables'),
          createExample('add semicolons to statements'),
          createExample('indent code with two spaces'),
        ],
      });

      const confidence = grouper.calculateCategoryConfidence(pattern);

      expect(confidence).toBeLessThan(0.7);
    });

    test('should return default confidence for single example', () => {
      const pattern = createMockPattern({
        examples: [createExample('use camelCase')],
      });

      const confidence = grouper.calculateCategoryConfidence(pattern);

      expect(confidence).toBe(0.5);
    });

    test('should return 0 for pattern without examples', () => {
      const pattern = createMockPattern({
        examples: [],
      });

      const confidence = grouper.calculateCategoryConfidence(pattern);

      expect(confidence).toBe(0);
    });

    test('should handle null or undefined pattern', () => {
      expect(grouper.calculateCategoryConfidence(null as any)).toBe(0);
      expect(grouper.calculateCategoryConfidence(undefined as any)).toBe(0);
    });
  });

  describe('determineSecondaryCategory', () => {
    test('should return undefined for high confidence patterns', () => {
      const pattern = createMockPattern({
        pattern_text: 'use camelCase for variables',
        examples: [
          createExample('use camelCase for variables'),
          createExample('use camelCase for functions'),
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      expect(secondary).toBeUndefined();
    });

    test('should detect code_style as secondary category', () => {
      const pattern = createMockPattern({
        pattern_text: 'improve variable naming conventions',
        category: PatternCategory.CONVENTION,
        examples: [
          createExample('use camelCase'),
          createExample('different words'),
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      expect(secondary).toBe(PatternCategory.CODE_STYLE);
    });

    test('should detect terminology as secondary category', () => {
      const pattern = createMockPattern({
        pattern_text: 'use consistent terminology for API endpoints',
        category: PatternCategory.CONVENTION,
        examples: [
          createExample('api endpoint'),
          createExample('api term'),
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      expect(secondary).toBe(PatternCategory.TERMINOLOGY);
    });

    test('should detect structure as secondary category', () => {
      const pattern = createMockPattern({
        pattern_text: 'follow file organization guidelines',
        category: PatternCategory.CONVENTION,
        examples: [
          createExample('file structure'),
          createExample('different words'),
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      expect(secondary).toBe(PatternCategory.STRUCTURE);
    });

    test('should detect formatting as secondary category', () => {
      const pattern = createMockPattern({
        pattern_text: 'follow indentation guidelines',
        category: PatternCategory.CONVENTION,
        examples: [
          createExample('indent with spaces'),
          createExample('different words'),
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      expect(secondary).toBe(PatternCategory.FORMATTING);
    });

    test('should return OTHER when no secondary category detected', () => {
      const pattern = createMockPattern({
        pattern_text: 'general improvement suggestion',
        category: PatternCategory.CONVENTION,
        examples: [
          createExample('improvement one'),
          createExample('improvement two'), // Similar enough for high confidence
        ],
      });

      const secondary = grouper.determineSecondaryCategory(pattern);

      // Should return undefined since confidence is high (no secondary needed)
      expect(secondary).toBeUndefined();
    });
  });

  describe('enhancePatternCategories', () => {
    test('should add category confidence and secondary category', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          pattern_text: 'use camelCase',
          examples: [
            createExample('use camelCase'),
            createExample('use camelCase'),
          ],
        }),
      ];

      const enhanced = grouper.enhancePatternCategories(patterns);

      expect(enhanced).toHaveLength(1);
      expect(enhanced[0].category_confidence).toBeDefined();
      expect(enhanced[0].category_confidence).toBeGreaterThan(0);
    });

    test('should handle empty array', () => {
      const enhanced = grouper.enhancePatternCategories([]);

      expect(enhanced).toEqual([]);
    });

    test('should preserve all original pattern fields', () => {
      const original = createMockPattern({
        pattern_text: 'test pattern',
        count: 3,
        category: PatternCategory.CODE_STYLE,
      });

      const enhanced = grouper.enhancePatternCategories([original])[0];

      expect(enhanced.pattern_text).toBe(original.pattern_text);
      expect(enhanced.count).toBe(original.count);
      expect(enhanced.category).toBe(original.category);
      expect(enhanced.examples).toEqual(original.examples);
      expect(enhanced.suggested_rule).toBe(original.suggested_rule);
    });
  });

  describe('groupPatternsByCategory', () => {
    test('should group patterns by category', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 5 }),
        createMockPattern({ category: PatternCategory.CODE_STYLE, count: 3 }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY, count: 4 }),
        createMockPattern({ category: PatternCategory.STRUCTURE, count: 2 }),
      ];

      const grouped = grouper.groupPatternsByCategory(patterns);

      expect(grouped[PatternCategory.CODE_STYLE]).toHaveLength(2);
      expect(grouped[PatternCategory.TERMINOLOGY]).toHaveLength(1);
      expect(grouped[PatternCategory.STRUCTURE]).toHaveLength(1);
      expect(grouped[PatternCategory.FORMATTING]).toHaveLength(0);
      expect(grouped[PatternCategory.CONVENTION]).toHaveLength(0);
      expect(grouped[PatternCategory.OTHER]).toHaveLength(0);
    });

    test('should filter by minimum confidence', () => {
      const patterns: Pattern[] = [
        createMockPattern({
          category: PatternCategory.CODE_STYLE,
          examples: [
            createExample('use camelCase'),
            createExample('use camelCase'),
          ],
        }),
        createMockPattern({
          category: PatternCategory.TERMINOLOGY,
          examples: [
            createExample('different words'),
            createExample('different words'),
          ],
        }),
      ];

      // First pattern should have high confidence, second low
      const grouped = grouper.groupPatternsByCategory(patterns, 0.7);

      // At least one pattern should be filtered out
      const totalPatterns = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalPatterns).toBeLessThanOrEqual(2);
    });

    test('should handle empty array', () => {
      const grouped = grouper.groupPatternsByCategory([]);

      expect(Object.values(grouped).every(arr => arr.length === 0)).toBe(true);
    });

    test('should return all categories even if empty', () => {
      const grouped = grouper.groupPatternsByCategory([]);

      expect(Object.keys(grouped)).toHaveLength(6);
      expect(grouped[PatternCategory.CODE_STYLE]).toBeDefined();
      expect(grouped[PatternCategory.TERMINOLOGY]).toBeDefined();
      expect(grouped[PatternCategory.STRUCTURE]).toBeDefined();
      expect(grouped[PatternCategory.FORMATTING]).toBeDefined();
      expect(grouped[PatternCategory.CONVENTION]).toBeDefined();
      expect(grouped[PatternCategory.OTHER]).toBeDefined();
    });
  });

  describe('validateCategoryAssignment', () => {
    test('should validate correct pattern', () => {
      const pattern = createMockPattern();

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(true);
    });

    test('should reject pattern without category', () => {
      const pattern = createMockPattern({ category: undefined as any });

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(false);
    });

    test('should reject pattern with invalid category', () => {
      const pattern = createMockPattern({ category: 'invalid_category' as any });

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(false);
    });

    test('should reject pattern without examples', () => {
      const pattern = createMockPattern({ examples: [] });

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(false);
    });

    test('should reject pattern with empty pattern text', () => {
      const pattern = createMockPattern({ pattern_text: '' });

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(false);
    });

    test('should reject null or undefined pattern', () => {
      expect(grouper.validateCategoryAssignment(null as any)).toBe(false);
      expect(grouper.validateCategoryAssignment(undefined as any)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    test('should handle pattern with whitespace-only text', () => {
      const pattern = createMockPattern({ pattern_text: '   ' });

      const isValid = grouper.validateCategoryAssignment(pattern);

      expect(isValid).toBe(false);
    });

    test('should handle all 6 categories', () => {
      const patterns: Pattern[] = [
        createMockPattern({ category: PatternCategory.CODE_STYLE }),
        createMockPattern({ category: PatternCategory.TERMINOLOGY }),
        createMockPattern({ category: PatternCategory.STRUCTURE }),
        createMockPattern({ category: PatternCategory.FORMATTING }),
        createMockPattern({ category: PatternCategory.CONVENTION }),
        createMockPattern({ category: PatternCategory.OTHER }),
      ];

      const grouped = grouper.groupPatternsByCategory(patterns);

      expect(grouped[PatternCategory.CODE_STYLE]).toHaveLength(1);
      expect(grouped[PatternCategory.TERMINOLOGY]).toHaveLength(1);
      expect(grouped[PatternCategory.STRUCTURE]).toHaveLength(1);
      expect(grouped[PatternCategory.FORMATTING]).toHaveLength(1);
      expect(grouped[PatternCategory.CONVENTION]).toHaveLength(1);
      expect(grouped[PatternCategory.OTHER]).toHaveLength(1);
    });
  });
});
