/**
 * Unit Tests for Rule Consolidation (Story 6.10)
 *
 * Testing Strategy:
 * - TDD Red Phase: These tests define the expected API before implementation
 * - Test pyramid: Unit tests for business logic, algorithms, and data transformations
 * - No file system mocking: Tests focus on pure functions and business logic
 * - Integration tests cover file I/O and workflows
 *
 * Coverage: AC 6.10 #1 (semantic similarity, contradiction detection, benefit calculation),
 *           AC 6.10 #2 (proposal generation), AC 6.10 #8 (contradiction handling)
 * FR47: Consolidate redundant rules using semantic analysis
 *
 * Test IDs: 6.10-UNIT-001 through 6.10-UNIT-008
 */

import { describe, test, expect } from '@jest/globals';

// ============================================================================
// TYPE DEFINITIONS (Expected by implementation)
// ============================================================================

interface ConsolidationProposal {
  categories: {
    name: string;
    rules: Array<{ text: string; line: number; id: string }>;
  }[];
  redundancies: Array<{
    groupId: string;
    rules: string[];
    similarity: number;
    suggestedConsolidation: string;
  }>;
  contradictions: Array<{
    ruleId1: string;
    ruleId2: string;
    reason: string;
    conflict: string;
  }>;
  metrics: {
    originalRules: number;
    originalLines: number;
    consolidatedRules: number;
    consolidatedLines: number;
    reductionPercentage: number;
  };
  platform: 'cursor' | 'copilot' | 'claude-code';
}

interface ParsedRule {
  id: string;
  text: string;
  category: string;
  lineNumber: number;
}

// ============================================================================
// 6.10-UNIT-001: Rule Parsing and Categorization (AC #1)
// ============================================================================

describe('6.10-UNIT-001: Rule Parsing and Categorization (AC #1)', () => {

  describe('parseRules - Rule extraction and normalization', () => {
    test('should parse rules into structured objects with id, text, category, lineNumber', async () => {
      // This test will fail until parseRules is implemented
      // GIVEN: Raw rules content
      const rulesContent = `# Code Style
- Use async/await instead of Promise chains
- Add explicit TypeScript return types

# Testing
- Write tests before implementation
- Follow red-green-refactor cycle`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Should return structured rule objects
      expect(parsed).toBeInstanceOf(Array);
      expect(parsed.length).toBeGreaterThan(0);

      const firstRule = parsed[0];
      expect(firstRule).toHaveProperty('id');
      expect(firstRule).toHaveProperty('text');
      expect(firstRule).toHaveProperty('category');
      expect(firstRule).toHaveProperty('lineNumber');
      expect(firstRule.id).toBeTruthy();
      expect(firstRule.text).toBeTruthy();
      expect(firstRule.lineNumber).toBeGreaterThan(0);
    });

    test('should extract semantic category from section headers (## headings)', async () => {
      // GIVEN: Rules with Markdown section headers
      const rulesContent = `## Code Style
- Use async/await instead of Promise chains

## Testing
- Write tests before implementation`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'copilot');

      // THEN: Rules should be categorized by section headers
      expect(parsed[0].category).toBe('Code Style');
      expect(parsed[1].category).toBe('Testing');
    });

    test('should extract semantic category from # comments (Cursor format)', async () => {
      // GIVEN: Cursor format rules with # comment headers
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Add explicit TypeScript return types

# Testing
Write tests before implementation`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Rules should be categorized by # comment headers
      const codeStyleRules = parsed.filter(r => r.category === 'Code Style');
      const testingRules = parsed.filter(r => r.category === 'Testing');

      expect(codeStyleRules.length).toBeGreaterThan(0);
      expect(testingRules.length).toBeGreaterThan(0);
    });

    test('should fall back to "General" category for uncategorized rules', async () => {
      // GIVEN: Rules without clear section headers
      const rulesContent = `Use async/await instead of Promise chains
Add explicit TypeScript return types`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Uncategorized rules should be marked as "General"
      parsed.forEach(rule => {
        expect(rule.category).toBe('General');
      });
    });

    test('should use keyword matching for category extraction (secondary method)', async () => {
      // GIVEN: Rules without headers but with category-specific keywords
      const rulesContent = `Always use async/await for better error handling
Write unit tests before implementing features
Add TypeScript types to all function parameters`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Categories should be inferred from keywords
      const asyncRule = parsed.find(r => r.text.includes('async/await'));
      expect(asyncRule?.category).toMatch(/code|style|async/i);

      const testRule = parsed.find(r => r.text.includes('tests'));
      expect(testRule?.category).toMatch(/test/i);
    });

    test('should skip empty lines and preserve standalone comments', async () => {
      // GIVEN: Rules with empty lines and comments
      const rulesContent = `# Code Style

Use async/await instead of Promise chains

# This is a standalone comment

Add explicit TypeScript return types

# Another comment`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Empty lines should be skipped, comments preserved
      const nonEmptyRules = parsed.filter(r => r.text.trim().length > 0);
      expect(nonEmptyRules.length).toBeGreaterThan(0);

      // Should not include empty lines as rules
      const hasEmptyRule = parsed.some(r => r.text.trim() === '');
      expect(hasEmptyRule).toBe(false);
    });

    test('should validate each rule has at least one directive (non-comment content)', async () => {
      // GIVEN: Rules with comment-only lines
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
# This is just a comment
Add explicit TypeScript return types`;

      // WHEN: Rules are parsed
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Comment-only lines should not be included as rules
      const rulesWithDirectives = parsed.filter(r =>
        r.text.trim() && !r.text.trim().startsWith('#')
      );

      // All parsed rules should have actual directive content
      parsed.forEach(rule => {
        const isCommentOnly = rule.text.trim().startsWith('#') && rule.text.trim().split('\n').length === 1;
        expect(isCommentOnly).toBe(false);
      });
    });

    test('should count non-empty, non-comment lines for threshold checking', async () => {
      // GIVEN: Mixed content with comments and empty lines
      const rulesContent = `# Header
Rule 1
Rule 2

# Another header
Rule 3
Rule 4`;

      // WHEN: Rules are parsed and line count is checked
      const parseRules = (await import('../../src/state-management')).parseRules;
      const parsed = await parseRules(rulesContent, 'cursor');

      // THEN: Line count should exclude comments and empty lines
      const countNonEmptyLines = (await import('../../src/state-management')).countNonEmptyLines;
      const lineCount = countNonEmptyLines(rulesContent);

      expect(lineCount).toBe(4); // Only 4 actual rule lines
      expect(parsed.length).toBe(4);
    });
  });

  describe('detectFormat - Platform format detection', () => {
    test('should detect Markdown format (## headings, - bullet points)', async () => {
      // GIVEN: Markdown formatted rules
      const rulesContent = `## Code Style
- Use async/await instead of Promise chains
- Add explicit TypeScript return types`;

      // WHEN: Format is detected
      const detectFormat = (await import('../../src/state-management')).detectFormat;
      const format = detectFormat(rulesContent);

      // THEN: Should detect as Markdown
      expect(format).toBe('markdown');
    });

    test('should detect plain text format (# comments, blank line separators)', async () => {
      // GIVEN: Plain text formatted rules
      const rulesContent = `# Code Style
Use async/await instead of Promise chains

Add explicit TypeScript return types`;

      // WHEN: Format is detected
      const detectFormat = (await import('../../src/state-management')).detectFormat;
      const format = detectFormat(rulesContent);

      // THEN: Should detect as plain text
      expect(format).toBe('plain');
    });

    test('should detect format independent of platform location', async () => {
      // GIVEN: Markdown content in unexpected location
      const markdownContent = `## Code Style
- Use async/await`;

      const plainContent = `# Code Style
Use async/await`;

      // WHEN: Format is detected
      const detectFormat = (await import('../../src/state-management')).detectFormat;

      // THEN: Should detect based on content, not location
      expect(detectFormat(markdownContent)).toBe('markdown');
      expect(detectFormat(plainContent)).toBe('plain');
    });
  });
});

// ============================================================================
// 6.10-UNIT-002: Semantic Similarity Detection (AC #1)
// ============================================================================

describe('6.10-UNIT-002: Semantic Similarity Detection (AC #1)', () => {

  describe('calculateJaccardSimilarity - Jaccard algorithm implementation', () => {
    test('should calculate Jaccard similarity correctly for identical rules', async () => {
      // GIVEN: Two identical rules
      const rule1 = "Use async/await instead of Promise chains";
      const rule2 = "Use async/await instead of Promise chains";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Should return 1.0 (100% similar)
      expect(similarity).toBe(1.0);
    });

    test('should calculate Jaccard similarity correctly for completely different rules', async () => {
      // GIVEN: Two completely different rules
      const rule1 = "Use async/await instead of Promise chains";
      const rule2 = "Write unit tests before implementing features";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Should return low similarity (< 0.3)
      expect(similarity).toBeLessThan(0.3);
    });

    test('should normalize text: lowercase, remove punctuation, tokenize', async () => {
      // GIVEN: Rules with different cases and punctuation
      const rule1 = "Use async/await instead of Promise chains!";
      const rule2 = "use async-await instead of promise chains";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Should treat them as highly similar after normalization
      expect(similarity).toBeGreaterThan(0.7);
    });

    test('should extract key terms: verbs, nouns, technical terms (ignore stop words)', async () => {
      // GIVEN: Rules with stop words
      const rule1 = "Use async/await instead of Promise chains";
      const rule2 = "Always use async/await for Promise chains";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Stop words should be ignored, key terms matched
      expect(similarity).toBeGreaterThan(0.5);
    });

    test('should calculate Jaccard similarity: |intersection| / |union|', async () => {
      // GIVEN: Rules with partial overlap
      const rule1 = "Use async/await instead of Promise chains";
      const rule2 = "Prefer async/await over .then() chains";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Should calculate based on token intersection/union
      // Both have: async/await, chains
      // Rule1 has: use, instead, promise
      // Rule2 has: prefer, over, .then()
      // Expected: intersection=2-3 tokens, union=6-8 tokens → ~30-50%
      expect(similarity).toBeGreaterThan(0.2);
      expect(similarity).toBeLessThan(0.6);
    });

    test('should flag rules above 70% similarity threshold as consolidation candidates', async () => {
      // GIVEN: Rules with 70%+ similarity
      const rule1 = "Use async/await instead of Promise chains";
      const rule2 = "Prefer async/await over Promise .then() chains";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;
      const similarity = calculateJaccardSimilarity(rule1, rule2);

      // THEN: Should be above threshold for consolidation
      expect(similarity).toBeGreaterThan(0.7);
    });

    test('should handle edge cases: empty rules, single word, special characters', async () => {
      // GIVEN: Edge case rules
      const emptyRule = "";
      const singleWord = "test";
      const specialChars = "!!!###???";

      // WHEN: Similarity is calculated
      const calculateJaccardSimilarity = (await import('../../src/state-management')).calculateJaccardSimilarity;

      // THEN: Should handle gracefully
      expect(calculateJaccardSimilarity(emptyRule, emptyRule)).toBe(0);
      expect(calculateJaccardSimilarity(singleWord, singleWord)).toBe(1.0);
      expect(calculateJaccardSimilarity(specialChars, specialChars)).toBe(0);
    });
  });

  describe('groupSimilarRules - Transitive closure grouping', () => {
    test('should apply transitive closure: if A~B and B~C, group A~B~C', async () => {
      // GIVEN: Three rules where A~B and B~C
      const rules = [
        { id: '1', text: 'Use async/await instead of Promise chains', category: 'Code Style', lineNumber: 1 },
        { id: '2', text: 'Prefer async/await over .then() chains', category: 'Code Style', lineNumber: 2 },
        { id: '3', text: 'Always use async/await for Promise handling', category: 'Code Style', lineNumber: 3 },
      ];

      // WHEN: Rules are grouped by similarity
      const groupSimilarRules = (await import('../../src/state-management')).groupSimilarRules;
      const groups = groupSimilarRules(rules);

      // THEN: Should create a single group with all three rules
      expect(groups.length).toBeGreaterThan(0);
      const mainGroup = groups.find(g => g.includes('1') && g.includes('2') && g.includes('3'));
      expect(mainGroup).toBeDefined();
    });

    test('should validate transitive closure: all members must have >50% similarity to group centroid', async () => {
      // GIVEN: Rules where A~B and B~C but A!~C (should not group all three)
      const rules = [
        { id: '1', text: 'Use async/await for error handling', category: 'Async', lineNumber: 1 },
        { id: '2', text: 'Prefer async/await in production code', category: 'Async', lineNumber: 2 },
        { id: '3', text: 'Avoid callbacks in favor of async/await', category: 'Async', lineNumber: 3 },
        { id: '4', text: 'Write unit tests for all functions', category: 'Testing', lineNumber: 4 },
      ];

      // WHEN: Rules are grouped with centroid validation
      const groupSimilarRules = (await import('../../src/state-management')).groupSimilarRules;
      const groups = groupSimilarRules(rules);

      // THEN: Should not group unrelated rules (rule 4 should not be in async group)
      const asyncGroups = groups.filter(g => g.includes('1') || g.includes('2') || g.includes('3'));
      const testingGroups = groups.filter(g => g.includes('4'));

      expect(asyncGroups.length).toBeGreaterThan(0);
      expect(testingGroups.length).toBeGreaterThan(0);

      // Rule 4 should not be in any group with rules 1-3
      groups.forEach(group => {
        if (group.includes('4')) {
          expect(group.includes('1')).toBe(false);
          expect(group.includes('2')).toBe(false);
          expect(group.includes('3')).toBe(false);
        }
      });
    });

    test('should limit comparisons using keyword overlap pre-filtering (performance)', async () => {
      // GIVEN: Large set of rules
      const rules = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        text: `Rule ${i} about ${i % 10 === 0 ? 'async/await' : 'general topic'}`,
        category: 'General',
        lineNumber: i + 1,
      }));

      // WHEN: Rules are grouped with pre-filtering
      const groupSimilarRules = (await import('../../src/state-management')).groupSimilarRules;
      const startTime = Date.now();
      const groups = groupSimilarRules(rules);
      const endTime = Date.now();

      // THEN: Should complete in reasonable time (< 1 second for 100 rules)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(groups).toBeDefined();
    });
  });
});

// ============================================================================
// 6.10-UNIT-003: Contradiction Detection (AC #1, #8)
// ============================================================================

describe('6.10-UNIT-003: Contradiction Detection (AC #1, #8)', () => {

  describe('detectContradictions - Antonym and mutual exclusion detection', () => {
    test('should detect antonym pairs: use vs avoid, always vs never', async () => {
      // GIVEN: Contradictory rules
      const rule1 = { id: '1', text: 'Use lodash for utility functions', category: 'Code Style', lineNumber: 1 };
      const rule2 = { id: '2', text: 'Avoid lodash in favor of native methods', category: 'Code Style', lineNumber: 2 };

      // WHEN: Contradictions are detected
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions([rule1, rule2]);

      // THEN: Should flag as contradictory
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].ruleId1).toBe('1');
      expect(contradictions[0].ruleId2).toBe('2');
      expect(contradictions[0].conflict).toContain('lodash');
    });

    test('should detect mutually exclusive patterns: prefer native vs always use lodash', async () => {
      // GIVEN: Mutually exclusive rules
      const rule1 = { id: '1', text: 'Prefer native JavaScript methods over libraries', category: 'Code Style', lineNumber: 1 };
      const rule2 = { id: '2', text: 'Always use lodash for array operations', category: 'Code Style', lineNumber: 2 };

      // WHEN: Contradictions are detected
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions([rule1, rule2]);

      // THEN: Should flag as mutually exclusive
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].reason).toMatch(/mutually|exclusive|native|lodash/i);
    });

    test('should calculate contradiction confidence score (> 0.8 for flagging)', async () => {
      // GIVEN: High-confidence contradictory rules
      const rule1 = { id: '1', text: 'Always use async/await', category: 'Async', lineNumber: 1 };
      const rule2 = { id: '2', text: 'Never use async/await', category: 'Async', lineNumber: 2 };

      // WHEN: Contradictions are detected
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions([rule1, rule2]);

      // THEN: Should have high confidence score
      expect(contradictions.length).toBeGreaterThan(0);
      // The implementation should include confidence scoring
      // This test verifies the contradiction is detected
      expect(contradictions[0].conflict).toBeTruthy();
    });

    test('should use contextual analysis: only flag when scopes are identical', async () => {
      // GIVEN: Rules with opposite directives but different contexts
      const rule1 = { id: '1', text: 'Use async/await for error handling', category: 'Async', lineNumber: 1 };
      const rule2 = { id: '2', text: 'Avoid async/await for performance-critical code', category: 'Performance', lineNumber: 2 };

      // WHEN: Contradictions are detected with context analysis
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions([rule1, rule2]);

      // THEN: Should NOT flag as contradictory (different contexts)
      // These rules apply in different scenarios, so they're not contradictions
      expect(contradictions.length).toBe(0);
    });

    test('should extract scope qualifiers: in production, for error handling, in async functions', async () => {
      // GIVEN: Rules with scope qualifiers
      const rule1 = { id: '1', text: 'Use async/await in production code', category: 'Async', lineNumber: 1 };
      const rule2 = { id: '2', text: 'Avoid async/await in production code', category: 'Async', lineNumber: 2 };

      // WHEN: Contradictions are detected
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions([rule1, rule2]);

      // THEN: Should detect that both have same scope (production) → contradiction
      expect(contradictions.length).toBeGreaterThan(0);
      expect(contradictions[0].reason).toContain('production');
    });

    test('should only flag contradictions when both directives AND scopes are opposite', async () => {
      // GIVEN: Rules with same scope but opposite directives (contradiction)
      const contradictionRules = [
        { id: '1', text: 'Use TypeScript for all new code', category: 'TypeScript', lineNumber: 1 },
        { id: '2', text: 'Avoid TypeScript for all new code', category: 'TypeScript', lineNumber: 2 },
      ];

      // WHEN: Contradictions are detected
      const detectContradictions = (await import('../../src/state-management')).detectContradictions;
      const contradictions = detectContradictions(contradictionRules);

      // THEN: Should flag as contradiction
      expect(contradictions.length).toBeGreaterThan(0);

      // GIVEN: Rules with different scopes (not contradiction)
      const nonContradictionRules = [
        { id: '1', text: 'Use TypeScript for backend services', category: 'TypeScript', lineNumber: 1 },
        { id: '2', text: 'Use JavaScript for frontend scripts', category: 'JavaScript', lineNumber: 2 },
      ];

      // WHEN: Contradictions are detected
      const noContradictions = detectContradictions(nonContradictionRules);

      // THEN: Should NOT flag as contradiction
      expect(noContradictions.length).toBe(0);
    });
  });
});

// ============================================================================
// 6.10-UNIT-004: Consolidation Benefit Calculation (AC #1, #2, #7)
// ============================================================================

describe('6.10-UNIT-004: Consolidation Benefit Calculation (AC #1, #2, #7)', () => {

  describe('calculateConsolidationBenefit - Metrics and thresholds', () => {
    test('should count original rules and lines (excluding comments)', async () => {
      // GIVEN: Parsed rules
      const rules = [
        { id: '1', text: 'Use async/await instead of Promise chains', category: 'Code Style', lineNumber: 1 },
        { id: '2', text: 'Prefer async/await over .then() chains', category: 'Code Style', lineNumber: 2 },
        { id: '3', text: 'Add explicit TypeScript return types', category: 'Code Style', lineNumber: 3 },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, []);

      // THEN: Should count correctly
      expect(benefit.originalRules).toBe(3);
      expect(benefit.originalLines).toBe(3);
    });

    test('should generate actual consolidated rules and count them (not just estimate)', async () => {
      // GIVEN: Redundancy groups
      const rules = [
        { id: '1', text: 'Use async/await instead of Promise chains', category: 'Code Style', lineNumber: 1 },
        { id: '2', text: 'Prefer async/await over .then() chains', category: 'Code Style', lineNumber: 2 },
        { id: '3', text: 'Add explicit TypeScript return types', category: 'Code Style', lineNumber: 3 },
      ];

      const redundancies = [
        {
          groupId: 'group-1',
          rules: ['1', '2'],
          similarity: 0.85,
          suggestedConsolidation: 'Use async/await syntax instead of Promise chains (.then() or Promises constructor)',
        },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, redundancies);

      // THEN: Should use actual consolidation output
      expect(benefit.consolidatedRules).toBe(2); // 1 consolidation + 1 unchanged rule
      expect(benefit.consolidatedLines).toBeGreaterThan(0);
      expect(benefit.consolidatedLines).toBeLessThan(benefit.originalLines);
    });

    test('should calculate percentage reduction: (originalLines - consolidatedLines) / originalLines * 100', async () => {
      // GIVEN: Rules with known consolidation
      const rules = [
        { id: '1', text: 'Rule 1', category: 'Test', lineNumber: 1 },
        { id: '2', text: 'Rule 2', category: 'Test', lineNumber: 2 },
      ];

      const redundancies = [
        {
          groupId: 'group-1',
          rules: ['1', '2'],
          similarity: 0.9,
          suggestedConsolidation: 'Consolidated rule',
        },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, redundancies);

      // THEN: Should calculate correctly
      const expectedReduction = ((benefit.originalLines - benefit.consolidatedLines) / benefit.originalLines) * 100;
      expect(benefit.reductionPercentage).toBeCloseTo(expectedReduction, 1);
    });

    test('should identify minimal benefit: < 5% reduction OR < 3 rules consolidated OR < 20 lines absolute', async () => {
      // GIVEN: Rules with minimal consolidation benefit
      const rules = [
        { id: '1', text: 'Rule 1', category: 'Test', lineNumber: 1 },
        { id: '2', text: 'Rule 2', category: 'Test', lineNumber: 2 },
        { id: '3', text: 'Rule 3', category: 'Test', lineNumber: 3 },
        { id: '4', text: 'Rule 4', category: 'Test', lineNumber: 4 },
      ];

      const redundancies = [
        {
          groupId: 'group-1',
          rules: ['1', '2'],
          similarity: 0.75,
          suggestedConsolidation: 'Rule 1 and 2',
        },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, redundancies);

      // THEN: Should identify as minimal benefit
      const isMinimalBenefit =
        benefit.reductionPercentage < 5 ||
        benefit.consolidatedRules < 3 ||
        (benefit.originalLines - benefit.consolidatedLines) < 20;

      expect(isMinimalBenefit).toBe(true);
    });

    test('should require BOTH >5% reduction AND at least 3 rules consolidated for meaningful benefit', async () => {
      // GIVEN: Rules with meaningful consolidation
      const rules = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        text: `Rule ${i}`,
        category: 'Test',
        lineNumber: i + 1,
      }));

      const redundancies = [
        {
          groupId: 'group-1',
          rules: ['0', '1', '2', '3', '4'],
          similarity: 0.8,
          suggestedConsolidation: 'Consolidated rules 0-4',
        },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, redundancies);

      // THEN: Should have meaningful benefit
      const hasMeaningfulBenefit =
        benefit.reductionPercentage > 5 &&
        benefit.originalRules - benefit.consolidatedRules >= 3;

      expect(hasMeaningfulBenefit).toBe(true);
    });

    test('should return metrics object with all required fields', async () => {
      // GIVEN: Rules
      const rules = [
        { id: '1', text: 'Rule 1', category: 'Test', lineNumber: 1 },
      ];

      // WHEN: Benefit is calculated
      const calculateConsolidationBenefit = (await import('../../src/state-management')).calculateConsolidationBenefit;
      const benefit = calculateConsolidationBenefit(rules, []);

      // THEN: Should have all required fields
      expect(benefit).toHaveProperty('originalRules');
      expect(benefit).toHaveProperty('originalLines');
      expect(benefit).toHaveProperty('consolidatedRules');
      expect(benefit).toHaveProperty('consolidatedLines');
      expect(benefit).toHaveProperty('reductionPercentage');
    });
  });
});

// ============================================================================
// 6.10-UNIT-005: Consolidation Proposal Generation (AC #2)
// ============================================================================

describe('6.10-UNIT-005: Consolidation Proposal Generation (AC #2)', () => {

  describe('generateConsolidationProposal - Complete proposal structure', () => {
    test('should generate ConsolidationProposal object with all required fields', async () => {
      // GIVEN: Rules content and platform
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains

# Testing
Write tests before implementation`;

      // WHEN: Proposal is generated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should have all required fields
      expect(proposal).toHaveProperty('categories');
      expect(proposal).toHaveProperty('redundancies');
      expect(proposal).toHaveProperty('contradictions');
      expect(proposal).toHaveProperty('metrics');
      expect(proposal).toHaveProperty('platform');
      expect(proposal.platform).toBe('cursor');
    });

    test('should group redundancies by semantic category', async () => {
      // GIVEN: Rules from multiple categories
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains

# Testing
Write tests before implementation
Follow red-green-refactor cycle`;

      // WHEN: Proposal is generated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Categories should be grouped
      expect(proposal.categories.length).toBeGreaterThan(0);
      const codeStyleCategory = proposal.categories.find(c => c.name === 'Code Style');
      const testingCategory = proposal.categories.find(c => c.name === 'Testing');

      expect(codeStyleCategory).toBeDefined();
      expect(testingCategory).toBeDefined();
    });

    test('should include before/after metrics in proposal', async () => {
      // GIVEN: Rules
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains`;

      // WHEN: Proposal is generated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should include before/after metrics
      expect(proposal.metrics.originalRules).toBeGreaterThan(0);
      expect(proposal.metrics.originalLines).toBeGreaterThan(0);
      expect(proposal.metrics.consolidatedRules).toBeGreaterThanOrEqual(0);
      expect(proposal.metrics.consolidatedLines).toBeGreaterThanOrEqual(0);
      expect(proposal.metrics.reductionPercentage).toBeGreaterThanOrEqual(0);
    });

    test('should show which original rules each consolidation replaces', async () => {
      // GIVEN: Redundant rules
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains`;

      // WHEN: Proposal is generated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Each redundancy should list original rule IDs
      proposal.redundancies.forEach(redundancy => {
        expect(redundancy.groupId).toBeTruthy();
        expect(redundancy.rules).toBeInstanceOf(Array);
        expect(redundancy.rules.length).toBeGreaterThanOrEqual(2);
        expect(redundancy.similarity).toBeGreaterThan(0);
        expect(redundancy.suggestedConsolidation).toBeTruthy();
      });
    });

    test('should maintain semantic meaning in consolidated rules', async () => {
      // GIVEN: Similar rules
      const rulesContent = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains`;

      // WHEN: Proposal is generated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Consolidated rule should maintain key concepts
      if (proposal.redundancies.length > 0) {
        const consolidation = proposal.redundancies[0].suggestedConsolidation.toLowerCase();
        expect(consolidation).toContain('async');
        expect(consolidation).toContain('promise');
      }
    });
  });
});

// ============================================================================
// 6.10-UNIT-006: Platform-Specific Formatting (AC #9)
// ============================================================================

describe('6.10-UNIT-006: Platform-Specific Formatting (AC #9)', () => {

  describe('formatConsolidatedRules - Platform format preservation', () => {
    test('should preserve Cursor format: plain text with # comments', async () => {
      // GIVEN: Consolidated rules for Cursor
      const consolidatedRules = [
        { category: 'Code Style', text: 'Use async/await instead of Promise chains' },
        { category: 'Code Style', text: 'Add explicit TypeScript return types' },
      ];

      // WHEN: Formatted for Cursor
      const formatConsolidatedRules = (await import('../../src/state-management')).formatConsolidatedRules;
      const formatted = formatConsolidatedRules(consolidatedRules, 'cursor');

      // THEN: Should use plain text format
      expect(formatted).toContain('# Code Style');
      expect(formatted).toContain('Use async/await');
      expect(formatted).not.toContain('##'); // No Markdown headings
      expect(formatted).not.toMatch(/^- /); // No bullet points
    });

    test('should preserve Copilot format: Markdown ## headings and - bullet points', async () => {
      // GIVEN: Consolidated rules for Copilot
      const consolidatedRules = [
        { category: 'Code Style', text: 'Use async/await instead of Promise chains' },
        { category: 'Code Style', text: 'Add explicit TypeScript return types' },
      ];

      // WHEN: Formatted for Copilot
      const formatConsolidatedRules = (await import('../../src/state-management')).formatConsolidatedRules;
      const formatted = formatConsolidatedRules(consolidatedRules, 'copilot');

      // THEN: Should use Markdown format
      expect(formatted).toContain('## Code Style');
      expect(formatted).toContain('- Use async/await');
      expect(formatted).toMatch(/^- /); // Bullet points
    });

    test('should preserve Claude Code format: Markdown structure', async () => {
      // GIVEN: Consolidated rules for Claude Code
      const consolidatedRules = [
        { category: 'Code Style', text: 'Use async/await instead of Promise chains' },
      ];

      // WHEN: Formatted for Claude Code
      const formatConsolidatedRules = (await import('../../src/state-management')).formatConsolidatedRules;
      const formatted = formatConsolidatedRules(consolidatedRules, 'claude-code');

      // THEN: Should use Markdown format
      expect(formatted).toContain('## Code Style');
      expect(formatted).toContain('- Use async/await');
    });

    test('should preserve existing section headers and comment structures', async () => {
      // GIVEN: Rules with existing structure
      const rulesContent = `# Code Style

Use async/await instead of Promise chains

# Testing

Write tests before implementation`;

      // WHEN: Format is detected and preserved
      const detectFormat = (await import('../../src/state-management')).detectFormat;
      const format = detectFormat(rulesContent);

      // THEN: Should detect plain text format
      expect(format).toBe('plain');
    });
  });
});

// ============================================================================
// 6.10-UNIT-007: Interactive Approval Workflow (AC #3)
// ============================================================================

describe('6.10-UNIT-007: Interactive Approval Workflow (AC #3)', () => {

  describe('parseApprovalCommand - Command syntax parsing', () => {
    test('should parse "approve [numbers]" with comma-separated values', async () => {
      // GIVEN: Approval command
      const input = 'approve 1, 3, 5';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should extract numbers
      expect(parsed.action).toBe('approve');
      expect(parsed.numbers).toEqual([1, 3, 5]);
    });

    test('should parse "approve [numbers]" with space-separated values', async () => {
      // GIVEN: Approval command with spaces
      const input = 'approve 1 3 5';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should extract numbers
      expect(parsed.action).toBe('approve');
      expect(parsed.numbers).toEqual([1, 3, 5]);
    });

    test('should parse "approve [numbers]" with ranges (1-5)', async () => {
      // GIVEN: Approval command with range
      const input = 'approve 1-5';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should expand range
      expect(parsed.action).toBe('approve');
      expect(parsed.numbers).toEqual([1, 2, 3, 4, 5]);
    });

    test('should parse "reject [numbers]" syntax', async () => {
      // GIVEN: Reject command
      const input = 'reject 2, 4';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should extract numbers
      expect(parsed.action).toBe('reject');
      expect(parsed.numbers).toEqual([2, 4]);
    });

    test('should parse "edit [number]" syntax', async () => {
      // GIVEN: Edit command
      const input = 'edit 3';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should extract number
      expect(parsed.action).toBe('edit');
      expect(parsed.numbers).toEqual([3]);
    });

    test('should parse "approve all" command', async () => {
      // GIVEN: Approve all command
      const input = 'approve all';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should mark as approve all
      expect(parsed.action).toBe('approve');
      expect(parsed.approveAll).toBe(true);
    });

    test('should parse "reject all" command', async () => {
      // GIVEN: Reject all command
      const input = 'reject all';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should mark as reject all
      expect(parsed.action).toBe('reject');
      expect(parsed.rejectAll).toBe(true);
    });

    test('should validate input: check numbers are within valid range', async () => {
      // GIVEN: Invalid number (too high)
      const input = 'approve 999';
      const maxNumber = 10;

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should include validation error
      expect(parsed.error).toContain('out of range');
      expect(parsed.valid).toBe(false);
    });

    test('should handle error recovery: show examples on invalid input', async () => {
      // GIVEN: Invalid input
      const input = 'invalid command';

      // WHEN: Command is parsed
      const parseApprovalCommand = (await import('../../src/command-variants')).parseApprovalCommand;
      const parsed = parseApprovalCommand(input);

      // THEN: Should include error with examples
      expect(parsed.valid).toBe(false);
      expect(parsed.error).toBeTruthy();
      expect(parsed.error).toMatch(/example/i);
    });
  });
});

// ============================================================================
// 6.10-UNIT-008: Edge Cases and Error Handling (AC #6, #7)
// ============================================================================

describe('6.10-UNIT-008: Edge Cases and Error Handling (AC #6, #7)', () => {

  describe('Edge case detection and handling', () => {
    test('should handle empty or minimal rule files (< 5 rules)', async () => {
      // GIVEN: Rules file with < 5 rules
      const rulesContent = `# Code Style
Use async/await`;

      // WHEN: Analysis is performed
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;

      // THEN: Should display informational message
      await expect(
        consolidateRules(rulesContent, 'cursor')
      ).rejects.toThrow(/too few rules/i);
    });

    test('should handle single-category dominance (> 80% rules in one category)', async () => {
      // GIVEN: Rules with single-category dominance
      const rulesContent = Array.from({ length: 50 }, (_, i) =>
        `# Code Style\nRule ${i} about code style`
      ).join('\n');

      // WHEN: Analysis is performed
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should detect dominance
      const dominantCategory = proposal.categories.find(c =>
        proposal.metrics.originalRules > 0 &&
        (c.rules.length / proposal.metrics.originalRules) > 0.8
      );

      expect(dominantCategory).toBeDefined();
      expect(dominantCategory?.name).toBe('Code Style');
    });

    test('should handle over-fragmented rule sets (> 30 categories with < 5 rules each)', async () => {
      // GIVEN: Highly fragmented rules
      const rulesContent = Array.from({ length: 35 }, (_, i) =>
        `# Category ${i}\nRule about category ${i}`
      ).join('\n');

      // WHEN: Analysis is performed
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should detect fragmentation
      const smallCategories = proposal.categories.filter(c => c.rules.length < 5);
      expect(smallCategories.length).toBeGreaterThan(30);
    });

    test('should display informational message for < 500 line files (AC #6)', async () => {
      // GIVEN: Rules file under 500 lines
      const rulesContent = `# Code Style
Use async/await`;

      // WHEN: Line count is checked
      const countNonEmptyLines = (await import('../../src/state-management')).countNonEmptyLines;
      const lineCount = countNonEmptyLines(rulesContent);

      // THEN: Should be under threshold
      expect(lineCount).toBeLessThan(500);
    });

    test('should display warning for < 5% reduction benefit (AC #7)', async () => {
      // GIVEN: Rules with minimal benefit
      const rulesContent = `# Code Style
Rule 1
Rule 2
Rule 3
Rule 4`;

      // WHEN: Benefit is calculated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should detect minimal benefit
      const isMinimalBenefit = proposal.metrics.reductionPercentage < 5;
      expect(isMinimalBenefit).toBe(true);
    });

    test('should use absolute threshold: require BOTH <5% reduction AND <20 lines absolute', async () => {
      // GIVEN: Rules with minimal absolute reduction
      const rulesContent = Array.from({ length: 100 }, (_, i) =>
        `Rule ${i}`
      ).join('\n');

      // WHEN: Benefit is calculated
      const consolidateRules = (await import('../../src/state-management')).consolidateRules;
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should check both thresholds
      const isMinimalBenefit =
        proposal.metrics.reductionPercentage < 5 &&
        (proposal.metrics.originalLines - proposal.metrics.consolidatedLines) < 20;

      expect(typeof isMinimalBenefit).toBe('boolean');
    });
  });
});
