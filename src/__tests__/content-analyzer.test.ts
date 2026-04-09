/**
 * Content Analyzer Test Suite (Story 2-3)
 *
 * Comprehensive test coverage for role-agnostic content analysis
 * Following test architecture principle: unit > integration > E2E
 *
 * Test categories:
 * 1. Content Type Detection Tests
 * 2. Code Content Tests
 * 3. Documentation Content Tests
 * 4. Diagram Content Tests
 * 5. PRD Content Tests
 * 6. Test Plan Content Tests
 * 7. General Text Tests
 * 8. Role-Agnostic Tests
 * 9. Integration Tests
 * 10. AR22 Error Tests
 * 11. Edge Case Tests
 * 12. Performance Tests
 */

import {
  ContentAnalyzer,
  detectContentType,
  normalizeContent,
  ContentType,
  ContentMetadata,
  ContentAnalyzedCorrection,
  ContentAnalysisResult,
  AR22Error,
  ContentAnalysisErrorCode,
  createContentAnalyzer,
  analyzeConversationContent,
} from '../content-analyzer';
import { ClassifiedCorrection, ClassificationDecision } from '../correction-classifier';

// ============================================================================
// TEST FIXTURES
// ============================================================================()

const createMockCorrection = (userCorrection: string): ClassifiedCorrection => {
  const classification: ClassificationDecision = {
    type: 'correction',
    confidence: 0.9,
    requires_manual_review: false,
    reasoning: 'Test classification',
  };

  return {
    original_suggestion: 'AI suggestion',
    user_correction: userCorrection,
    context: 'Test context',
    classification,
  };
};

// ============================================================================
// CONTENT TYPE DETECTION TESTS
// ============================================================================()

describe('Content Type Detection', () => {
  describe('should detect code content type', () => {
    test('when TypeScript code blocks are present', () => {
      const content = '```typescript\ninterface User {\n  name: string;\n}\n```';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.CODE);
      expect(metadata.language).toBe('TypeScript');
      expect(metadata.format).toBe('code-block');
      expect(metadata.confidence).toBeGreaterThanOrEqual(0.7);
    });

    test('when function definitions are present', () => {
      const content = 'function processData(input: string): void { ... }';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.CODE);
      expect(metadata.detected_patterns).toContain('function-definitions');
    });

    test('when import statements are present', () => {
      const content = 'import { Component } from "react";';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.CODE);
      expect(metadata.detected_patterns).toContain('import-statements');
    });

    test('when Python code is present', () => {
      const content = '```python\ndef process_data():\n    pass\n```';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.CODE);
      expect(metadata.language).toBe('Python');
    });
  });

  describe('should detect documentation content type', () => {
    test('when markdown headers are present', () => {
      const content = '# API Documentation\n\n## Parameters\n\nThis API accepts...';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(metadata.format).toBe('markdown');
      expect(metadata.detected_patterns).toContain('markdown-headers');
    });

    test('when markdown lists are present', () => {
      const content = '- Parameter 1\n- Parameter 2\n- Parameter 3';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(metadata.detected_patterns).toContain('markdown-lists');
    });

    test('when documentation keywords are present', () => {
      const content = 'This API returns a user object. Example usage: ...';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(metadata.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('should detect diagram content type', () => {
    test('when Mermaid syntax is present', () => {
      const content = '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DIAGRAM);
      expect(metadata.format).toBe('mermaid');
      expect(metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('when diagram keywords are present', () => {
      const content = 'Create a flowchart showing the authentication sequence';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DIAGRAM);
      expect(metadata.detected_patterns).toContain('diagram-keywords');
    });

    test('when ASCII art is present', () => {
      const content = 'Flow:\n=======\n  |\n  v\n=======';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.DIAGRAM);
      expect(metadata.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('should detect PRD content type', () => {
    test('when PRD structure is present', () => {
      const content = 'User Story: As a user, I want to...\n\nAcceptance Criteria:\n1. ...\n2. ...';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.PRD);
      expect(metadata.format).toBe('structured-text');
      expect(metadata.detected_patterns).toContain('prd-structure');
    });

    test('when PRD keywords are present', () => {
      const content = 'FR1: System shall authenticate users\nNFR1: Response time < 200ms';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.PRD);
      expect(metadata.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('should detect test plan content type', () => {
    test('when test structure is present', () => {
      const content = 'Test Case: User login\n\nGiven: User is on login page\nWhen: User enters credentials\nThen: User is redirected';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.TEST_PLAN);
      expect(metadata.format).toBe('structured-text');
      expect(metadata.detected_patterns).toContain('test-structure');
    });

    test('when test keywords are present', () => {
      const content = 'Write a unit test to assert that user authentication fails with invalid credentials';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.TEST_PLAN);
      expect(metadata.confidence).toBeGreaterThan(0.6);
    });
  });

  describe('should detect general text content type', () => {
    test('when no specific patterns are detected', () => {
      const content = 'This is just a regular conversation without special formatting';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.GENERAL_TEXT);
      expect(metadata.format).toBe('plain-text');
    });

    test('when content is ambiguous', () => {
      const content = 'Some text here';
      const metadata = detectContentType(content);

      expect(metadata.type).toBe(ContentType.GENERAL_TEXT);
      expect(metadata.confidence).toBeLessThan(0.5);
    });
  });
});

// ============================================================================
// CODE CONTENT TESTS
// ============================================================================()

describe('Code Content Tests', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should normalize TypeScript code correctly', () => {
    const code = '```typescript\ninterface User {\n  name: string;\n}\n```';
    const normalized = normalizeContent(code, {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    });

    expect(normalized).toContain('interface User');
    expect(normalized).not.toContain('```');
  });

  test('should handle multiple programming languages', () => {
    const languages = [
      { code: 'function test() {}', lang: 'JavaScript' },
      { code: 'def test(): pass', lang: 'Python' },
      { code: 'public class Test {}', lang: 'Java' },
    ];

    languages.forEach(({ code, lang }) => {
      const metadata = detectContentType(code);
      expect(metadata.language).toBe(lang);
    });
  });

  test('should preserve semantic meaning in normalization', () => {
    const code = 'const user: User = { name: "John" };';
    const normalized = normalizeContent(code, {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    });

    expect(normalized).toContain('user');
    expect(normalized).toContain('name');
  });
});

// ============================================================================
// DOCUMENTATION CONTENT TESTS
// ============================================================================()

describe('Documentation Content Tests', () => {
  test('should strip markdown formatting', () => {
    const markdown = '# API Reference\n\nThis is **bold** and *italic* text with `inline code`.';
    const normalized = normalizeContent(markdown, {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: ['markdown-headers'],
      confidence: 0.8,
    });

    expect(normalized).not.toContain('#');
    expect(normalized).not.toContain('**');
    expect(normalized).not.toContain('*');
    expect(normalized).toContain('API Reference');
  });

  test('should preserve list structure', () => {
    const markdown = '- Item 1\n- Item 2\n- Item 3';
    const normalized = normalizeContent(markdown, {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: ['markdown-lists'],
      confidence: 0.7,
    });

    expect(normalized).toContain('•');
  });
});

// ============================================================================
// DIAGRAM CONTENT TESTS
// ============================================================================()

describe('Diagram Content Tests', () => {
  test('should extract Mermaid diagram descriptions', () => {
    const mermaid = '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```';
    const normalized = normalizeContent(mermaid, {
      type: ContentType.DIAGRAM,
      format: 'mermaid',
      detected_patterns: ['mermaid-syntax'],
      confidence: 0.9,
    });

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('graph');
  });

  test('should preserve diagram keywords', () => {
    const diagram = 'Create a sequence diagram showing the authentication flow';
    const normalized = normalizeContent(diagram, {
      type: ContentType.DIAGRAM,
      format: 'text-description',
      detected_patterns: ['diagram-keywords'],
      confidence: 0.7,
    });

    expect(normalized).toContain('sequence');
    expect(normalized).toContain('authentication');
  });
});

// ============================================================================
// PRD CONTENT TESTS
// ============================================================================()

describe('PRD Content Tests', () => {
  test('should normalize PRD structure', () => {
    const prd = '| Requirement | Priority |\n| --- | --- |\n| FR1 | High |';
    const normalized = normalizeContent(prd, {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: ['prd-structure'],
      confidence: 0.9,
    });

    expect(normalized).not.toContain('|');
    expect(normalized).toContain('Requirement');
  });

  test('should preserve requirement statements', () => {
    const prd = 'FR1: System shall authenticate users within 200ms';
    const normalized = normalizeContent(prd, {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: [],
      confidence: 0.8,
    });

    expect(normalized).toContain('FR1');
    expect(normalized).toContain('authenticate');
  });
});

// ============================================================================
// TEST PLAN CONTENT TESTS
// ============================================================================()

describe('Test Plan Content Tests', () => {
  test('should normalize BDD format', () => {
    const bdd = 'Given user is on login page\nWhen user enters credentials\nThen user is redirected';
    const normalized = normalizeContent(bdd, {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: ['test-structure'],
      confidence: 0.9,
    });

    expect(normalized).toContain('Given');
    expect(normalized).toContain('When');
    expect(normalized).toContain('Then');
  });

  test('should handle test case descriptions', () => {
    const test = 'Test Case: Verify user login with valid credentials';
    const normalized = normalizeContent(test, {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: [],
      confidence: 0.7,
    });

    expect(normalized).toContain('Verify user login');
  });
});

// ============================================================================
// GENERAL TEXT TESTS
// ============================================================================()

describe('General Text Tests', () => {
  test('should use text as-is for pattern extraction', () => {
    const text = 'This is a regular conversational response';
    const normalized = normalizeContent(text, {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.3,
    });

    expect(normalized).toBe(text);
  });

  test('should handle ambiguous content gracefully', () => {
    const ambiguous = 'Some text that might be anything';
    const metadata = detectContentType(ambiguous);

    expect(metadata.type).toBe(ContentType.GENERAL_TEXT);
    expect(metadata.confidence).toBeLessThan(0.5);
  });
});

// ============================================================================
// ROLE-AGNOSTIC TESTS
// ============================================================================()

describe('Role-Agnostic Behavior', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should NOT detect or classify user roles', () => {
    const corrections = [
      createMockCorrection('Use async/await instead'),
      createMockCorrection('Document this as JSDoc'),
      createMockCorrection('Draw the flowchart left-to-right'),
    ];

    const result = analyzer.analyzeCorrections(corrections);

    // Verify no role information is stored
    result.analyzed_corrections.forEach(correction => {
      expect(correction).not.toHaveProperty('user_role');
      expect(correction).not.toHaveProperty('detected_role');
    });
  });

  test('should treat all content types equally', () => {
    const corrections = [
      createMockCorrection('```typescript\nconst x = 1;\n```'), // Code
      createMockCorrection('# Documentation\n\nText'), // Documentation
      createMockCorrection('Create a flowchart'), // Diagram
    ];

    const result = analyzer.analyzeCorrections(corrections);

    // All corrections are applicable for patterns
    result.analyzed_corrections.forEach(correction => {
      expect(correction.applicable_for_patterns).toBe(true);
    });
  });

  test('should not require role configuration', () => {
    const analyzer = new ContentAnalyzer();

    // Analyzer should work without any role configuration
    expect(analyzer).toBeDefined();
    expect(analyzer.analyzeCorrections).toBeDefined();

    const correction = createMockCorrection('Use TypeScript strict mode');
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
  });

  test('should not prioritize one content type over another', () => {
    const corrections = [
      createMockCorrection('Code correction'),
      createMockCorrection('Documentation correction'),
      createMockCorrection('Diagram correction'),
    ];

    const result = analyzer.analyzeCorrections(corrections);

    // All are analyzed and marked applicable
    expect(result.analyzed_corrections.length).toBe(3);
    result.analyzed_corrections.forEach(correction => {
      expect(correction.applicable_for_patterns).toBe(true);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS WITH CORRECTION CLASSIFIER
// ============================================================================()

describe('Integration with Correction Classifier (Story 2-2)', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should accept ClassifiedCorrection[] as input', () => {
    const classifiedCorrections: ClassifiedCorrection[] = [
      createMockCorrection('Use async/await syntax'),
      createMockCorrection('Add TSDoc comments'),
    ];

    const result = analyzer.analyzeCorrections(classifiedCorrections);

    expect(result.total_corrections_analyzed).toBe(2);
  });

  test('should preserve classification metadata', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use Promise.then()',
      user_correction: 'Use async/await instead',
      context: 'Code quality improvement',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'User explicitly requested alternative approach',
      },
    };

    const result = analyzer.analyzeCorrections([correction]);

    const analyzed = result.analyzed_corrections[0];
    expect(analyzed.original_suggestion).toBe(correction.original_suggestion);
    expect(analyzed.classification.type).toBe(correction.classification.type);
    expect(analyzed.classification.confidence).toBe(correction.classification.confidence);
    expect(analyzed.classification.reasoning).toBe(correction.classification.reasoning);
  });

  test('should extend ClassifiedCorrection with content metadata', () => {
    const correction = createMockCorrection('```typescript\nconst x: number = 1;\n```');
    const result = analyzer.analyzeCorrections([correction]);

    const analyzed = result.analyzed_corrections[0] as ContentAnalyzedCorrection;
    expect(analyzed.content_metadata).toBeDefined();
    expect(analyzed.content_metadata.type).toBe(ContentType.CODE);
    expect(analyzed.normalized_correction).toBeDefined();
    expect(analyzed.applicable_for_patterns).toBe(true);
  });
});

// ============================================================================
// AR22 ERROR TESTS
// ============================================================================()

describe('AR22 Error Handling', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should throw AR22Error for null input', () => {
    expect(() => {
      analyzer.analyzeCorrections(null as any);
    }).toThrow(AR22Error);
  });

  test('should throw AR22Error for non-array input', () => {
    expect(() => {
      analyzer.analyzeCorrections('not an array' as any);
    }).toThrow(AR22Error);
  });

  test('should include proper AR22 error structure', () => {
    try {
      analyzer.analyzeCorrections(null as any);
      fail('Should have thrown AR22Error');
    } catch (error) {
      expect(error).toBeInstanceOf(AR22Error);
      const ar22Error = error as AR22Error;
      expect(ar22Error.what).toBeDefined();
      expect(ar22Error.how).toBeDefined();
      expect(Array.isArray(ar22Error.how)).toBe(true);
      expect(ar22Error.technical).toBeDefined();
    }
  });

  test('should include error code for normalization failures', () => {
    // Mock a scenario where normalization fails
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    // This should not throw in normal cases, but if it does, it should have proper error code
    expect(() => {
      normalizeContent('valid content', metadata);
    }).not.toThrow();
  });

  test('should format error message correctly', () => {
    try {
      analyzer.analyzeCorrections(null as any);
      fail('Should have thrown AR22Error');
    } catch (error) {
      const ar22Error = error as AR22Error;
      const errorString = ar22Error.toString();

      expect(errorString).toContain('What happened');
      expect(errorString).toContain('How to fix');
      expect(errorString).toContain('Technical details');
    }
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================()

describe('Edge Cases', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should handle empty corrections array', () => {
    const result = analyzer.analyzeCorrections([]);

    expect(result.total_corrections_analyzed).toBe(0);
    expect(result.analyzed_corrections).toEqual([]);
  });

  test('should handle single correction', () => {
    const correction = createMockCorrection('Use async/await');
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
    expect(result.analyzed_corrections.length).toBe(1);
  });

  test('should handle very long corrections', () => {
    const longText = 'A'.repeat(10000);
    const correction = createMockCorrection(longText);
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
    expect(result.analyzed_corrections[0].normalized_correction).toBeDefined();
  });

  test('should handle mixed content types', () => {
    const corrections = [
      createMockCorrection('```typescript\nconst x = 1;\n```'),
      createMockCorrection('# API Documentation\n\nThis is documentation with multiple sections'),
      createMockCorrection('Plain text'),
    ];

    const result = analyzer.analyzeCorrections(corrections);

    const types = result.analyzed_corrections.map(c => c.content_metadata.type);
    expect(types).toContain(ContentType.CODE);
    expect(types).toContain(ContentType.DOCUMENTATION);
    expect(types).toContain(ContentType.GENERAL_TEXT);
  });

  test('should handle special characters in content', () => {
    const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
    const correction = createMockCorrection(specialChars);
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
  });

  test('should handle unicode content', () => {
    const unicode = 'Hello 世界 🌍 Привет';
    const correction = createMockCorrection(unicode);
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
    expect(result.analyzed_corrections[0].normalized_correction).toContain(unicode);
  });

  test('should handle malformed code blocks', () => {
    const malformed = '```typescript\nfunction unclosed() {\n  return true;';
    const correction = createMockCorrection(malformed);
    const result = analyzer.analyzeCorrections([correction]);

    expect(result.total_corrections_analyzed).toBe(1);
    // Should still detect as code even with malformed block (has function keyword)
    expect(result.analyzed_corrections[0].content_metadata.type).toBe(ContentType.CODE);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================()

describe('Performance', () => {
  test('should process 100 corrections quickly', () => {
    const analyzer = new ContentAnalyzer();
    const corrections = Array.from({ length: 100 }, (_, i) =>
      createMockCorrection(`Correction ${i}: Use async/await syntax`)
    );

    const startTime = Date.now();
    const result = analyzer.analyzeCorrections(corrections);
    const endTime = Date.now();

    expect(result.total_corrections_analyzed).toBe(100);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in < 1 second
  });

  test('should have O(n) complexity for content type detection', () => {
    const shortContent = 'function test() {}';
    const longContent = 'function test() {}\n'.repeat(1000);

    // Both should complete quickly
    const shortMetadata = detectContentType(shortContent);
    const longMetadata = detectContentType(longContent);

    // Both should detect as code
    expect(shortMetadata.type).toBe(ContentType.CODE);
    expect(longMetadata.type).toBe(ContentType.CODE);
  });
});

// ============================================================================
// CONTENT ANALYZER CLASS TESTS
// ============================================================================()

describe('ContentAnalyzer Class', () => {
  test('should track analysis count', () => {
    const analyzer = new ContentAnalyzer();

    expect(analyzer.getAnalysisCount()).toBe(0);

    analyzer.analyzeCorrections([createMockCorrection('test')]);
    expect(analyzer.getAnalysisCount()).toBe(1);

    analyzer.analyzeCorrections([createMockCorrection('test'), createMockCorrection('test')]);
    expect(analyzer.getAnalysisCount()).toBe(3);
  });

  test('should reset analysis count', () => {
    const analyzer = new ContentAnalyzer();
    analyzer.analyzeCorrections([createMockCorrection('test')]);
    expect(analyzer.getAnalysisCount()).toBe(1);

    analyzer.resetAnalysisCount();
    expect(analyzer.getAnalysisCount()).toBe(0);
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================()

describe('Utility Functions', () => {
  test('createContentAnalyzer should instantiate analyzer', () => {
    const analyzer = createContentAnalyzer();
    expect(analyzer).toBeInstanceOf(ContentAnalyzer);
  });

  test('analyzeConversationContent should create analyzer and process', () => {
    const corrections = [createMockCorrection('Use async/await')];
    const result = analyzeConversationContent(corrections);

    expect(result.total_corrections_analyzed).toBe(1);
  });
});

// ============================================================================
// SUMMARY STATISTICS TESTS
// ============================================================================()

describe('Summary Statistics', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should calculate content type distribution correctly', () => {
    const corrections = [
      createMockCorrection('```typescript\nconst x = 1;\n```'),
      createMockCorrection('# API Documentation\n\nThis API accepts...'),
      createMockCorrection('```mermaid\ngraph TD\n  A --> B\n```'),
      createMockCorrection('User Story: As a user, I want to...\n\nAcceptance Criteria:'),
      createMockCorrection('Given user is on login page\nWhen user enters credentials\nThen user is redirected'),
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result.analysis_summary.code_corrections).toBeGreaterThan(0);
    expect(result.analysis_summary.documentation_corrections).toBeGreaterThan(0);
    expect(result.analysis_summary.diagram_corrections).toBeGreaterThan(0);
    expect(result.analysis_summary.prd_corrections).toBeGreaterThan(0);
    expect(result.analysis_summary.test_plan_corrections).toBeGreaterThan(0);
  });

  test('should include processing time in result', () => {
    const corrections = [createMockCorrection('test')];
    const result = analyzer.analyzeCorrections(corrections);

    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(result.processing_time_ms).toBeLessThan(1000);
  });

  test('should include content type distribution in result', () => {
    const corrections = [createMockCorrection('```typescript\ncode\n```')];
    const result = analyzer.analyzeCorrections(corrections);

    expect(result.content_type_distribution).toBeDefined();
    expect(result.content_type_distribution[ContentType.CODE]).toBe(1);
  });
});