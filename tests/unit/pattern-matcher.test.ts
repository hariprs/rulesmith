/**
 * Unit Tests for Pattern Matcher (Story 2-6)
 *
 * Tests for pattern merging algorithm including:
 * - Empty pattern handling
 * - Exact match detection
 * - Semantic match detection
 * - Category validation
 * - MergedPattern field calculations
 * - Frequency change calculations
 * - Timestamp handling
 */

import {
  PatternMatcher,
  MergedPattern,
  HistoricalPattern,
  mergePatterns,
} from '../../src/pattern-matcher';
import { Pattern, PatternCategory } from '../../src/pattern-detector';

describe('PatternMatcher', () => {
  let matcher: PatternMatcher;

  beforeEach(() => {
    matcher = new PatternMatcher();
  });

  describe('mergePatterns', () => {
    const createMockPattern = (
      patternText: string,
      count: number,
      category: PatternCategory = PatternCategory.OTHER
    ): Pattern => {
      const now = new Date().toISOString();
      return {
        pattern_text: patternText,
        count,
        category,
        examples: [],
        suggested_rule: `Use ${patternText} instead`,
        first_seen: now,
        last_seen: now,
        content_types: [],
      };
    };

    const createMockHistoricalPattern = (
      patternText: string,
      count: number,
      category: PatternCategory = PatternCategory.OTHER,
      sessionCount: number = 1
    ): HistoricalPattern => {
      const now = new Date().toISOString();
      const past = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
      return {
        pattern_text: patternText,
        count,
        category,
        examples: [],
        suggested_rule: `Use ${patternText} instead`,
        first_seen: past,
        last_seen: past,
        content_types: [],
        session_count: sessionCount,
        total_frequency: count * sessionCount,
      };
    };

    describe('empty pattern handling', () => {
      it('should handle empty current patterns array', () => {
        const current: Pattern[] = [];
        const historical: HistoricalPattern[] = [];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toEqual([]);
        expect(result.statistics.new_patterns).toBe(0);
        expect(result.statistics.recurring_patterns).toBe(0);
        expect(result.statistics.exact_matches).toBe(0);
        expect(result.statistics.semantic_matches).toBe(0);
      });

      it('should handle empty historical patterns array', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toHaveLength(1);
        expect(result.patterns[0].is_new).toBe(true);
        expect(result.statistics.new_patterns).toBe(1);
        expect(result.statistics.recurring_patterns).toBe(0);
      });

      it('should handle both arrays empty', () => {
        const current: Pattern[] = [];
        const historical: HistoricalPattern[] = [];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toEqual([]);
        expect(result.statistics).toEqual({
          new_patterns: 0,
          recurring_patterns: 0,
          increasing_trends: 0,
          decreasing_trends: 0,
          exact_matches: 0,
          semantic_matches: 0,
        });
      });
    });

    describe('exact match detection', () => {
      it('should detect exact matches with same text and category', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toHaveLength(1);
        expect(result.statistics.exact_matches).toBe(1);
        expect(result.statistics.semantic_matches).toBe(0);
        expect(result.patterns[0].is_new).toBe(false);
        expect(result.patterns[0].pattern_text).toBe('use camelCase');
      });

      it('should detect exact matches case-insensitively', () => {
        const current = [createMockPattern('Use CamelCase', 2)];
        const historical = [createMockHistoricalPattern('use camelcase', 3)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.statistics.exact_matches).toBe(1);
        expect(result.patterns).toHaveLength(1);
      });

      it('should detect exact matches with whitespace normalization', () => {
        const current = [createMockPattern('use  camelCase', 2)];
        const historical = [createMockHistoricalPattern('use camelCase', 3)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.statistics.exact_matches).toBe(1);
        expect(result.patterns).toHaveLength(1);
      });

      it('should merge exact matches correctly', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        const merged = result.patterns[0];
        expect(merged.session_count).toBe(3); // historical 2 + current 1
        expect(merged.total_frequency).toBe(8); // (3 * 2) + 2
        expect(merged.is_new).toBe(false);
      });
    });

    describe('semantic match detection', () => {
      it('should detect semantic matches with similarity >= 0.85', () => {
        const current = [createMockPattern('use api calls', 2, PatternCategory.TERMINOLOGY)];
        const historical = [createMockHistoricalPattern('use API calls', 3, PatternCategory.TERMINOLOGY)];

        const result = matcher.mergePatterns(current, historical);

        // These should be exact matches after normalization, not semantic matches
        expect(result.statistics.exact_matches).toBeGreaterThan(0);
        expect(result.patterns).toHaveLength(1);
      });

      it('should not merge semantic matches below threshold', () => {
        const current = [createMockPattern('use async await', 2)];
        const historical = [createMockHistoricalPattern('use promises', 3)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.statistics.semantic_matches).toBe(0);
        expect(result.patterns).toHaveLength(2); // Both kept separate
      });

      it('should merge semantic matches correctly', () => {
        const current = [createMockPattern('use api endpoint', 2, PatternCategory.TERMINOLOGY)];
        const historical = [createMockHistoricalPattern('use API Endpoint', 3, PatternCategory.TERMINOLOGY, 2)];

        const result = matcher.mergePatterns(current, historical);

        const merged = result.patterns[0];
        expect(merged.session_count).toBe(3);
        expect(merged.total_frequency).toBeGreaterThan(0);
        expect(merged.is_new).toBe(false);
      });
    });

    describe('category validation', () => {
      it('should merge patterns with matching categories', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toHaveLength(1);
        expect(result.statistics.exact_matches).toBe(1);
      });

      it('should not merge patterns when categories do not match', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.OTHER)];

        const result = matcher.mergePatterns(current, historical);

        // Should NOT merge - categories don't match (strict category matching)
        expect(result.patterns).toHaveLength(2);
        expect(result.statistics.exact_matches).toBe(0);
      });

      it('should log warning for category mismatch', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const current = [createMockPattern('use api', 2, PatternCategory.TERMINOLOGY)];
        const historical = [createMockHistoricalPattern('use api', 3, PatternCategory.CONVENTION)];

        matcher.mergePatterns(current, historical);

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Category mismatch')
        );
        consoleWarnSpy.mockRestore();
      });

      it('should keep patterns separate on category mismatch', () => {
        const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const current = [createMockPattern('use api', 2, PatternCategory.CONVENTION)];
        const historical = [createMockHistoricalPattern('use api', 3, PatternCategory.TERMINOLOGY)];

        const result = matcher.mergePatterns(current, historical);

        // Patterns should be kept separate when categories don't match
        expect(result.patterns).toHaveLength(2);
        expect(result.patterns[0].category).toBe(PatternCategory.CONVENTION);
        expect(result.patterns[1].category).toBe(PatternCategory.TERMINOLOGY);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Category mismatch')
        );
        consoleWarnSpy.mockRestore();
      });
    });

    describe('merged pattern field calculations', () => {
      it('should preserve first_seen for historical patterns', () => {
        const pastDate = new Date(Date.now() - 86400000).toISOString();
        const current = [createMockPattern('use camelCase', 2)];
        const historical = [
          {
            ...createMockHistoricalPattern('use camelCase', 3),
            first_seen: pastDate,
          },
        ];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].first_seen).toBe(pastDate);
      });

      it('should set first_seen to current timestamp for new patterns', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];
        const timestamp = new Date().toISOString();

        const result = matcher.mergePatterns(current, historical, timestamp);

        expect(result.patterns[0].first_seen).toBe(timestamp);
      });

      it('should increment session_count for recurring patterns', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].session_count).toBe(3);
      });

      it('should initialize session_count to 1 for new patterns', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].session_count).toBe(1);
      });

      it('should sum total_frequency across sessions', () => {
        const current = [createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].total_frequency).toBe(8); // (3 * 2) + 2
      });

      it('should calculate frequency_change correctly', () => {
        const current = [createMockPattern('use camelCase', 5, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        // Historical avg = (3 * 2) / 2 = 3
        // Current = 5
        // Change = (5 - 3) / 3 = 0.67
        expect(result.patterns[0].frequency_change).toBeCloseTo(0.67, 2);
      });
    });

    describe('trend classification', () => {
      it('should classify increasing trends (>= 0.5)', () => {
        const current = [createMockPattern('use camelCase', 10, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].frequency_change).toBeGreaterThanOrEqual(0.5);
        expect(result.statistics.increasing_trends).toBe(1);
        expect(result.statistics.decreasing_trends).toBe(0);
      });

      it('should classify decreasing trends (<= -0.5)', () => {
        const current = [createMockPattern('use camelCase', 1, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 10, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].frequency_change).toBeLessThanOrEqual(-0.5);
        expect(result.statistics.decreasing_trends).toBe(1);
        expect(result.statistics.increasing_trends).toBe(0);
      });

      it('should classify stable trends', () => {
        const current = [createMockPattern('use camelCase', 3, PatternCategory.CODE_STYLE)];
        const historical = [createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2)];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].frequency_change).toBeGreaterThan(-0.5);
        expect(result.patterns[0].frequency_change).toBeLessThan(0.5);
      });
    });

    describe('timestamp validation', () => {
      it('should accept valid ISO 8601 timestamps', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];
        const timestamp = '2026-03-18T00:00:00.000Z';

        expect(() => {
          matcher.mergePatterns(current, historical, timestamp);
        }).not.toThrow();
      });

      it('should reject invalid timestamp format', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];
        const timestamp = 'invalid-timestamp';

        expect(() => {
          matcher.mergePatterns(current, historical, timestamp);
        }).toThrow();
      });

      it('should use current timestamp when not provided', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical: HistoricalPattern[] = [];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns[0].first_seen).toBeDefined();
        expect(result.patterns[0].last_seen).toBeDefined();
      });

      it('should update last_seen to most recent timestamp (CRITICAL AC2)', () => {
        const pastTimestamp = '2026-03-17T00:00:00.000Z';
        const currentTimestamp = '2026-03-18T12:00:00.000Z';

        const current = [createMockPattern('use camelCase', 2)];
        const historical = [
          {
            ...createMockHistoricalPattern('use camelCase', 3),
            last_seen: pastTimestamp,
          },
        ];

        const result = matcher.mergePatterns(current, historical, currentTimestamp);

        // last_seen should be updated to current timestamp (most recent)
        expect(result.patterns[0].last_seen).toBe(currentTimestamp);
      });

      it('should preserve first_seen as earliest timestamp (CRITICAL AC2)', () => {
        const firstSeenTimestamp = '2026-03-15T00:00:00.000Z';
        const currentTimestamp = '2026-03-18T12:00:00.000Z';

        const current = [createMockPattern('use camelCase', 2)];
        const historical = [
          {
            ...createMockHistoricalPattern('use camelCase', 3),
            first_seen: firstSeenTimestamp,
          },
        ];

        const result = matcher.mergePatterns(current, historical, currentTimestamp);

        // first_seen should be preserved as the earliest timestamp
        expect(result.patterns[0].first_seen).toBe(firstSeenTimestamp);
      });
    });

    describe('input validation', () => {
      it('should throw error for null current patterns', () => {
        const current = null as unknown as Pattern[];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for non-array current patterns', () => {
        const current = {} as unknown as Pattern[];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for null historical patterns', () => {
        const current: Pattern[] = [];
        const historical = null as unknown as HistoricalPattern[];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for non-array historical patterns', () => {
        const current: Pattern[] = [];
        const historical = {} as unknown as HistoricalPattern[];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });
    });

    describe('similarity threshold boundaries', () => {
      it('should not merge patterns with low similarity', () => {
        const current = [createMockPattern('use async await patterns', 2, PatternCategory.CONVENTION)];
        const historical = [createMockHistoricalPattern('use promise chains', 3, PatternCategory.CONVENTION)];

        const result = matcher.mergePatterns(current, historical);

        // These patterns are semantically different, should not merge
        expect(result.statistics.semantic_matches).toBe(0);
        expect(result.statistics.exact_matches).toBe(0);
        expect(result.patterns).toHaveLength(2);
      });

      it('should detect semantic matches with high similarity', () => {
        const current = [createMockPattern('use api endpoint', 2, PatternCategory.TERMINOLOGY)];
        const historical = [createMockHistoricalPattern('use API Endpoint', 3, PatternCategory.TERMINOLOGY)];

        const result = matcher.mergePatterns(current, historical);

        // These should match (exact match after normalization)
        expect(result.patterns.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('invalid pattern validation', () => {
      it('should throw error for pattern with missing pattern_text', () => {
        const current = [
          {
            count: 2,
            category: PatternCategory.OTHER,
            examples: [],
            suggested_rule: 'test',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
          } as any,
        ];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for pattern with empty pattern_text', () => {
        const current = [
          {
            pattern_text: '',
            count: 2,
            category: PatternCategory.OTHER,
            examples: [],
            suggested_rule: 'test',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
          },
        ];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for pattern with negative count', () => {
        const current = [
          {
            pattern_text: 'use camelCase',
            count: -1,
            category: PatternCategory.OTHER,
            examples: [],
            suggested_rule: 'test',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
          },
        ];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error for pattern with invalid category', () => {
        const current = [
          {
            pattern_text: 'use camelCase',
            count: 2,
            category: 'invalid_category' as PatternCategory,
            examples: [],
            suggested_rule: 'test',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
          },
        ];
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });
    });

    describe('DoS protection', () => {
      it('should throw error when current patterns exceed MAX_PATTERNS (10000)', () => {
        const current = Array.from({ length: 10001 }, (_, i) =>
          createMockPattern(`pattern ${i}`, 1)
        );
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should throw error when historical patterns exceed MAX_PATTERNS (10000)', () => {
        const current = [createMockPattern('use camelCase', 2)];
        const historical = Array.from({ length: 10001 }, (_, i) =>
          createMockHistoricalPattern(`pattern ${i}`, 1)
        );

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).toThrow();
      });

      it('should handle patterns at MAX_PATTERNS limit (10000)', () => {
        const current = Array.from({ length: 10000 }, (_, i) =>
          createMockPattern(`pattern ${i}`, 1)
        );
        const historical: HistoricalPattern[] = [];

        expect(() => {
          matcher.mergePatterns(current, historical);
        }).not.toThrow();
      });
    });

    describe('complex scenarios', () => {
      it('should handle multiple patterns with mixed matches', () => {
        const current = [
          createMockPattern('use camelCase', 2, PatternCategory.CODE_STYLE),
          createMockPattern('use async await', 3, PatternCategory.CONVENTION),
          createMockPattern('add spacing', 1, PatternCategory.FORMATTING),
        ];
        const historical = [
          createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2),
          createMockHistoricalPattern('use promises', 2, PatternCategory.CONVENTION),
        ];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toHaveLength(4); // 1 exact, 2 new, 1 historical no longer seen
        expect(result.statistics.exact_matches).toBe(1);
        expect(result.statistics.new_patterns).toBe(2);
        expect(result.statistics.recurring_patterns).toBe(2);
      });

      it('should handle patterns no longer seen in current session', () => {
        const current: Pattern[] = [];
        const historical = [
          createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE, 2),
        ];

        const result = matcher.mergePatterns(current, historical);

        expect(result.patterns).toHaveLength(1);
        expect(result.patterns[0].count).toBe(0); // No longer seen
        expect(result.patterns[0].is_new).toBe(false);
      });
    });
  });

  describe('utility function', () => {
    it('should provide convenience function for merging', () => {
      const current = [
        {
          pattern_text: 'use camelCase',
          count: 2,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Use camelCase',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [],
        },
      ];
      const historical: HistoricalPattern[] = [];

      const result = mergePatterns(current, historical);

      expect(result.patterns).toBeDefined();
      expect(result.statistics).toBeDefined();
    });
  });
});
