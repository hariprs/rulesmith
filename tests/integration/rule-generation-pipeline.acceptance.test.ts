/**
 * Integration Tests for Rule Generation Pipeline (Story 3.7)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests verify the integration between:
 * - Pattern Detector (Epic 2)
 * - Rule Generator (Story 3.7)
 * - Platform Formatters (Story 3.7)
 * - Content Type Awareness (Epic 2)
 *
 * Testing Strategy:
 * - Test with real pattern data from Epic 2
 * - Verify end-to-end pattern-to-rule pipeline
 * - Test platform-specific formatting output
 * - Validate before/after comparison generation
 * - Test multi-content type rule generation
 * - Verify performance targets
 *
 * Test Pyramid Level: Integration (API-level tests in separate file)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  RuleGenerator,
  RuleSuggestion,
  RuleProposalType,
  PlatformFormatter,
} from '../../src/rules/rule-generator';
import {
  Pattern,
  PatternCategory,
  PatternDetectionResult,
} from '../../src/pattern-detector';
import {
  ContentType,
} from '../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create realistic pattern fixtures from Epic 2 output
 * These represent actual patterns detected by Epic 2 system
 */
const createEpic2PatternFixtures = (): Pattern[] => [
  {
    pattern_text: 'prefer f-strings over format() or %',
    count: 8,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Use format() for string interpolation',
        user_correction: 'Use f-strings instead',
        context: 'Python code formatting',
        timestamp: '2026-03-20T10:00:00Z',
        content_type: ContentType.CODE,
      },
      {
        original_suggestion: 'Use % formatting',
        user_correction: 'Prefer f-strings',
        context: 'String operations',
        timestamp: '2026-03-20T11:00:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Use f-strings instead of format() or %',
    first_seen: '2026-03-20T09:00:00Z',
    last_seen: '2026-03-20T12:00:00Z',
    content_types: [ContentType.CODE],
  },
  {
    pattern_text: 'use const instead of var',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Declare variable with var',
        user_correction: 'Use const instead',
        context: 'Variable declarations',
        timestamp: '2026-03-20T10:30:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Use const instead of var',
    first_seen: '2026-03-20T09:30:00Z',
    last_seen: '2026-03-20T11:30:00Z',
    content_types: [ContentType.CODE],
  },
  {
    pattern_text: 'prefer async/await over Promise.then()',
    count: 6,
    category: PatternCategory.CODE_STYLE,
    examples: [
      {
        original_suggestion: 'Use Promise.then() for async',
        user_correction: 'Use async/await instead',
        context: 'Async handling',
        timestamp: '2026-03-20T10:15:00Z',
        content_type: ContentType.CODE,
      },
    ],
    suggested_rule: 'Use async/await instead of Promise.then()',
    first_seen: '2026-03-20T09:15:00Z',
    last_seen: '2026-03-20T11:45:00Z',
    content_types: [ContentType.CODE],
  },
  {
    pattern_text: 'use active voice in documentation',
    count: 3,
    category: PatternCategory.CONVENTION,
    examples: [
      {
        original_suggestion: 'The function is called by the user',
        user_correction: 'The user calls the function',
        context: 'Documentation style',
        timestamp: '2026-03-20T10:00:00Z',
        content_type: ContentType.DOCUMENTATION,
      },
    ],
    suggested_rule: 'Use active voice instead of passive voice',
    first_seen: '2026-03-20T10:00:00Z',
    last_seen: '2026-03-20T11:00:00Z',
    content_types: [ContentType.DOCUMENTATION],
  },
];

/**
 * Create large pattern set for performance testing
 */
const createLargePatternSet = (count: number): Pattern[] => {
  const patterns: Pattern[] = [];
  for (let i = 0; i < count; i++) {
    patterns.push({
      pattern_text: `pattern-${i}`,
      count: 2 + (i % 5), // Varying counts from 2-6
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: `Rule for pattern-${i}`,
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T12:00:00Z',
      content_types: [ContentType.GENERAL_TEXT],
    });
  }
  return patterns;
};

// ============================================================================
// PATTERN TO RULE PIPELINE INTEGRATION TESTS
// ============================================================================

describe('Rule Generation Pipeline - Pattern to Rule Integration', () => {
  let generator: RuleGenerator;

  beforeEach(() => {
    generator = new RuleGenerator();
  });

  describe('AC1: Pattern-to-Rule Generation', () => {
    test('should generate specific, actionable rule suggestions from patterns', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      expect(suggestions).toHaveLength(4);
      suggestions.forEach((suggestion) => {
        expect(suggestion.ruleText).toBeDefined();
        expect(suggestion.ruleText.length).toBeGreaterThan(0);
        expect(suggestion.ruleText.length).toBeLessThanOrEqual(200);

        // Verify rule is actionable (contains action verbs)
        const actionVerbs = ['use', 'prefer', 'avoid', 'apply', 'implement', 'follow'];
        const hasActionVerb = actionVerbs.some(verb =>
          suggestion.ruleText.toLowerCase().includes(verb)
        );
        expect(hasActionVerb).toBe(true);
      });
    });

    test('should format rules as clear, concise instructions', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion) => {
        // Rules should be direct and clear
        expect(suggestion.ruleText).toMatch(/^[A-Z]/.test(suggestion.ruleText) ? true : suggestion.ruleText);
        expect(suggestion.ruleText).not.toContain('maybe');
        expect(suggestion.ruleText).not.toContain('perhaps');
        expect(suggestion.ruleText).not.toContain('might');
      });
    });

    test('should include source pattern for traceability', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion, index) => {
        expect(suggestion.pattern).toEqual(patterns[index]);
        expect(suggestion.pattern.pattern_text).toBeDefined();
        expect(suggestion.pattern.count).toBeDefined();
      });
    });

    test('should preserve pattern metadata in suggestions', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion) => {
        expect(suggestion.pattern.first_seen).toBeDefined();
        expect(suggestion.pattern.last_seen).toBeDefined();
        expect(suggestion.pattern.content_types).toBeDefined();
        expect(suggestion.pattern.category).toBeDefined();
      });
    });
  });

  describe('AC2: Platform-Specific Formatting', () => {
    let formatter: PlatformFormatter;
    let mockSuggestions: RuleSuggestion[];

    beforeEach(() => {
      formatter = new PlatformFormatter();
      const patterns = createEpic2PatternFixtures();
      mockSuggestions = generator.generateRules(patterns);
    });

    test('should format for Cursor with plain text and comment syntax', () => {
      const cursorFormat = formatter.formatForCursor(mockSuggestions);

      // Cursor format should use # for headers
      expect(cursorFormat).toContain('#');

      // Should be plain text (no markdown formatting beyond headers)
      expect(cursorFormat).not.toContain('**');
      expect(cursorFormat).not.toContain('```');
    });

    test('should format Cursor rules one per line', () => {
      const cursorFormat = formatter.formatForCursor(mockSuggestions);

      const lines = cursorFormat.split('\n');
      const ruleLines = lines.filter(line =>
        line.trim().length > 0 && !line.startsWith('#')
      );

      // Each rule should be on its own line
      ruleLines.forEach(line => {
        expect(line.startsWith('-')).toBe(true);
      });
    });

    test('should format for Copilot with structured markdown', () => {
      const copilotFormat = formatter.formatForCopilot(mockSuggestions);

      // Copilot format should use markdown headers
      expect(copilotFormat).toContain('##');

      // Should include contextual "When writing..." phrasing
      expect(copilotFormat).toMatch(/when writing|in documentation|for code/i);
    });

    test('should format Copilot rules as structured instructions', () => {
      const copilotFormat = formatter.formatForCopilot(mockSuggestions);

      // Should have clear section structure
      const sections = copilotFormat.split('##').filter(s => s.trim().length > 0);
      expect(sections.length).toBeGreaterThan(0);

      // Each section should have descriptive content
      sections.forEach(section => {
        expect(section.trim().length).toBeGreaterThan(10);
      });
    });

    test('should produce valid .cursorrules file content', () => {
      const cursorFormat = formatter.formatForCursor(mockSuggestions);

      // Simulate writing to .cursorrules file
      const fs = require('fs');
      const tempPath = '/tmp/test-.cursorrules';
      fs.writeFileSync(tempPath, cursorFormat);

      const writtenContent = fs.readFileSync(tempPath, 'utf-8');
      expect(writtenContent).toBe(cursorFormat);

      // Cleanup
      fs.unlinkSync(tempPath);
    });

    test('should produce valid Copilot custom instructions', () => {
      const copilotFormat = formatter.formatForCopilot(mockSuggestions);

      // Copilot instructions should be valid markdown
      expect(copilotFormat).toMatch(/^##.+$/m); // Has headers
      expect(copilotFormat.length).toBeGreaterThan(0);
    });
  });

  describe('AC3: Rule Proposal Types', () => {
    test('should generate NEW_RULE proposals for patterns without existing coverage', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion) => {
        // Without existing rules, all should be NEW_RULE
        expect(suggestion.type).toBe(RuleProposalType.NEW_RULE);
      });
    });

    test('should generate ADDITION proposals when enhancing existing rules', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python String Formatting\n- Use format() for strings';

      const modification = generator.generateForExistingRule(pattern, existingRule);

      // Should identify enhancement opportunity
      expect(modification.proposedRule).toBeDefined();
      expect(modification.proposedRule).not.toBe(existingRule);
    });

    test('should generate MODIFICATION proposals for rule changes', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python\n- Use format()';

      const modification = generator.generateForExistingRule(pattern, existingRule);

      expect(modification.existingRule).toBe(existingRule);
      expect(modification.proposedRule).toContain('f-strings');
      expect(modification.changes).toBeDefined();
      expect(modification.changes.length).toBeGreaterThan(0);
    });

    test('should detect rule proposal type based on pattern analysis', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion) => {
        expect([RuleProposalType.NEW_RULE, RuleProposalType.ADDITION, RuleProposalType.MODIFICATION])
          .toContain(suggestion.type);
      });
    });
  });

  describe('AC4: Before/After Comparison', () => {
    test('should show clear before/after comparison for modifications', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python String Formatting\n- Use format() for strings';

      const modification = generator.generateForExistingRule(pattern, existingRule);

      expect(modification.existingRule).toBeDefined();
      expect(modification.proposedRule).toBeDefined();
      expect(modification.existingRule).not.toBe(modification.proposedRule);
    });

    test('should highlight specific changes in before/after', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python\n- Use format() for strings';

      const modification = generator.generateForExistingRule(pattern, existingRule);

      expect(modification.changes).toBeDefined();
      expect(modification.changes.length).toBeGreaterThan(0);

      modification.changes.forEach((change) => {
        expect(['addition', 'deletion', 'modification']).toContain(change.type);
        expect(change.text).toBeDefined();
        expect(change.position).toBeDefined();
        expect(change.position.start).toBeGreaterThanOrEqual(0);
        expect(change.position.end).toBeGreaterThan(change.position.start);
      });
    });

    test('should include beforeAfter in RuleSuggestion for modifications', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python\n- Use format()';

      const suggestion = generator.generateForNewPattern(pattern);

      // New rules don't have before/after
      expect(suggestion.beforeAfter).toBeUndefined();

      // But modifications do
      const modification = generator.generateForExistingRule(pattern, existingRule);
      expect(modification.existingRule).toBeDefined();
      expect(modification.proposedRule).toBeDefined();
    });

    test('should clearly mark additions, deletions, and modifications', () => {
      const pattern = createEpic2PatternFixtures()[0];
      const existingRule = '# Python\n- Use format()';

      const modification = generator.generateForExistingRule(pattern, existingRule);

      const changeTypes = modification.changes.map(c => c.type);
      expect(changeTypes).toContain('deletion');
      expect(changeTypes).toContain('addition');
    });
  });

  describe('AC5: Multi-Content Type Support', () => {
    test('should generate code-specific rules with code context', () => {
      const codePattern = createEpic2PatternFixtures().find(p =>
        p.content_types.includes(ContentType.CODE)
      );

      if (!codePattern) {
        throw new Error('No code pattern found in fixtures');
      }

      const suggestion = generator.generateForNewPattern(codePattern);

      expect(suggestion.contentType).toBe(ContentType.CODE);
      expect(suggestion.platformFormats.copilot).toMatch(/when writing (javascript|typescript|python|code)/i);
    });

    test('should generate documentation-specific rules with documentation context', () => {
      const docPattern = createEpic2PatternFixtures().find(p =>
        p.content_types.includes(ContentType.DOCUMENTATION)
      );

      if (!docPattern) {
        throw new Error('No documentation pattern found in fixtures');
      }

      const suggestion = generator.generateForNewPattern(docPattern);

      expect(suggestion.contentType).toBe(ContentType.DOCUMENTATION);
      expect(suggestion.platformFormats.copilot).toMatch(/in documentation/i);
    });

    test('should handle patterns from different content types', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      const codeSuggestions = suggestions.filter(s => s.contentType === ContentType.CODE);
      const docSuggestions = suggestions.filter(s => s.contentType === ContentType.DOCUMENTATION);

      expect(codeSuggestions.length).toBeGreaterThan(0);
      expect(docSuggestions.length).toBeGreaterThan(0);

      codeSuggestions.forEach(s => {
        expect(s.platformFormats.copilot).toMatch(/when writing|for code/i);
      });

      docSuggestions.forEach(s => {
        expect(s.platformFormats.copilot).toMatch(/in documentation/i);
      });
    });

    test('should acknowledge context in generated rules', () => {
      const patterns = createEpic2PatternFixtures();
      const suggestions = generator.generateRules(patterns);

      suggestions.forEach((suggestion) => {
        const copilotFormat = suggestion.platformFormats.copilot;

        switch (suggestion.contentType) {
          case ContentType.CODE:
            expect(copilotFormat).toMatch(/when writing code|for (javascript|typescript|python)/i);
            break;
          case ContentType.DOCUMENTATION:
            expect(copilotFormat).toMatch(/in documentation/i);
            break;
          case ContentType.DIAGRAM:
            expect(copilotFormat).toMatch(/in diagrams/i);
            break;
          default:
            // General text may not have specific context
            break;
        }
      });
    });
  });

  describe('AC6: Performance Targets', () => {
    test('should process 100 patterns within 5 seconds', () => {
      const patterns = createLargePatternSet(100);
      const startTime = Date.now();

      generator.generateRules(patterns);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(5000); // 5 seconds
    });

    test('should process 1000 patterns within 5 seconds', () => {
      const patterns = createLargePatternSet(1000);
      const startTime = Date.now();

      const suggestions = generator.generateRules(patterns);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(suggestions).toHaveLength(1000);
      expect(processingTime).toBeLessThan(5000); // 5 seconds
    });

    test('should maintain memory usage under 100MB for 1000 patterns', () => {
      const patterns = createLargePatternSet(1000);

      const initialMemory = process.memoryUsage().heapUsed;
      generator.generateRules(patterns);
      const finalMemory = process.memoryUsage().heapUsed;

      const memoryDelta = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

      expect(memoryDelta).toBeLessThan(100);
    });

    test('should scale linearly with pattern count', () => {
      const smallSet = createLargePatternSet(100);
      const mediumSet = createLargePatternSet(500);
      const largeSet = createLargePatternSet(1000);

      const smallTime = measureTime(() => generator.generateRules(smallSet));
      const mediumTime = measureTime(() => generator.generateRules(mediumSet));
      const largeTime = measureTime(() => generator.generateRules(largeSet));

      // Linear scaling: medium should be ~5x small, large should be ~10x small
      // Allow 2x variance for system fluctuations
      expect(mediumTime).toBeLessThan(smallTime * 5 * 2);
      expect(largeTime).toBeLessThan(smallTime * 10 * 2);
    });
  });
});

// ============================================================================
// END-TO-END PIPELINE INTEGRATION TESTS
// ============================================================================

describe('Rule Generation Pipeline - End-to-End Integration', () => {
  let generator: RuleGenerator;
  let formatter: PlatformFormatter;

  beforeEach(() => {
    generator = new RuleGenerator();
    formatter = new PlatformFormatter();
  });

  test('should complete full pipeline: patterns → rules → formatted output', () => {
    const patterns = createEpic2PatternFixtures();

    // Step 1: Generate rules from patterns
    const suggestions = generator.generateRules(patterns);
    expect(suggestions).toHaveLength(4);

    // Step 2: Format for Cursor
    const cursorFormat = formatter.formatForCursor(suggestions);
    expect(cursorFormat).toBeDefined();
    expect(cursorFormat.length).toBeGreaterThan(0);

    // Step 3: Format for Copilot
    const copilotFormat = formatter.formatForCopilot(suggestions);
    expect(copilotFormat).toBeDefined();
    expect(copilotFormat.length).toBeGreaterThan(0);
  });

  test('should handle realistic Epic 2 pattern data end-to-end', () => {
    const patterns = createEpic2PatternFixtures();

    const suggestions = generator.generateRules(patterns);

    // Verify all suggestions have required fields
    suggestions.forEach((suggestion) => {
      expect(suggestion.id).toBeDefined();
      expect(suggestion.type).toBeDefined();
      expect(suggestion.pattern).toBeDefined();
      expect(suggestion.ruleText).toBeDefined();
      expect(suggestion.explanation).toBeDefined();
      expect(suggestion.contentType).toBeDefined();
      expect(suggestion.confidence).toBeDefined();
      expect(suggestion.platformFormats.cursor).toBeDefined();
      expect(suggestion.platformFormats.copilot).toBeDefined();
    });
  });

  test('should produce production-ready rule files', () => {
    const patterns = createEpic2PatternFixtures();
    const suggestions = generator.generateRules(patterns);

    const cursorFormat = formatter.formatForCursor(suggestions);
    const copilotFormat = formatter.formatForCopilot(suggestions);

    // Cursor format should be file-ready
    expect(cursorFormat).toMatch(/^.+$/m); // Has content
    expect(cursorFormat.split('\n').length).toBeGreaterThan(5); // Multiple lines

    // Copilot format should be file-ready
    expect(copilotFormat).toMatch(/##.+$/m); // Has headers
    expect(copilotFormat.split('\n').length).toBeGreaterThan(5); // Multiple lines
  });
});

// ============================================================================
// INTEGRATION WITH EPIC 2 COMPONENTS
// ============================================================================

describe('Rule Generation Pipeline - Epic 2 Integration', () => {
  test('should work with Pattern interface from Epic 2', () => {
    const pattern: Pattern = {
      pattern_text: 'test pattern',
      count: 3,
      category: PatternCategory.OTHER,
      examples: [],
      suggested_rule: 'test rule',
      first_seen: '2026-03-20T10:00:00Z',
      last_seen: '2026-03-20T11:00:00Z',
      content_types: [ContentType.GENERAL_TEXT],
    };

    const generator = new RuleGenerator();
    expect(() => {
      generator.generateRules([pattern]);
    }).not.toThrow();
  });

  test('should respect ContentType enum from Epic 2', () => {
    const patterns = createEpic2PatternFixtures();

    const generator = new RuleGenerator();
    const suggestions = generator.generateRules(patterns);

    suggestions.forEach((suggestion) => {
      expect(Object.values(ContentType)).toContain(suggestion.contentType);
    });
  });

  test('should handle PatternCategory from Epic 2', () => {
    const patterns = createEpic2PatternFixtures();

    const generator = new RuleGenerator();
    const suggestions = generator.generateRules(patterns);

    suggestions.forEach((suggestion) => {
      expect(Object.values(PatternCategory)).toContain(suggestion.pattern.category);
    });
  });
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Measure execution time of a function
 */
function measureTime(fn: () => void): number {
  const startTime = Date.now();
  fn();
  return Date.now() - startTime;
}
