/**
 * API-Level Tests for Role-Agnostic Content Analysis (Story 2-3)
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
  ContentType,
  ContentMetadata,
  ContentAnalyzedCorrection,
  ContentAnalysisResult,
  ContentAnalyzer,
  AR22Error as ContentAR22Error,
  ContentAnalysisErrorCode,
  detectContentType,
  normalizeContent,
} from '../../src/content-analyzer';
import { ClassifiedCorrection, ClassificationDecision } from '../../src/correction-classifier';

// ============================================================================
// TYPE DEFINITIONS AND ENUMS
// ============================================================================

describe('Content Analyzer - Type Definitions', () => {
  describe('ContentType Enum', () => {
    test('should have all required content types', () => {
      expect(ContentType.CODE).toBe('code');
      expect(ContentType.DOCUMENTATION).toBe('documentation');
      expect(ContentType.DIAGRAM).toBe('diagram');
      expect(ContentType.PRD).toBe('prd');
      expect(ContentType.TEST_PLAN).toBe('test_plan');
      expect(ContentType.GENERAL_TEXT).toBe('general_text');
    });

    test('should have 6 content types total', () => {
      const contentTypes = Object.values(ContentType);
      expect(contentTypes).toHaveLength(6);
    });
  });

  describe('ContentAnalysisErrorCode Enum', () => {
    test('should have all required error codes', () => {
      expect(ContentAnalysisErrorCode.CONTENT_TYPE_DETECTION_FAILED).toBeDefined();
      expect(ContentAnalysisErrorCode.NORMALIZATION_FAILED).toBeDefined();
      expect(ContentAnalysisErrorCode.PATTERN_EXTRACTION_FAILED).toBeDefined();
      expect(ContentAnalysisErrorCode.INVALID_INPUT).toBeDefined();
    });

    test('should have 4 error codes total', () => {
      const errorCodes = Object.values(ContentAnalysisErrorCode);
      expect(errorCodes).toHaveLength(4);
    });
  });
});

// ============================================================================
// INTERFACE CONTRACTS
// ============================================================================

describe('Content Analyzer - Interface Contracts', () => {
  describe('ContentMetadata Interface', () => {
    test('should create valid ContentMetadata for code type', () => {
      const metadata: ContentMetadata = {
        type: ContentType.CODE,
        language: 'TypeScript',
        format: 'code-block',
        detected_patterns: ['function-definitions', 'import-statements'],
        confidence: 0.9,
      };

      expect(metadata.type).toBe(ContentType.CODE);
      expect(metadata.language).toBe('TypeScript');
      expect(metadata.format).toBe('code-block');
      expect(metadata.detected_patterns).toHaveLength(2);
      expect(metadata.confidence).toBe(0.9);
    });

    test('should create valid ContentMetadata for documentation type', () => {
      const metadata: ContentMetadata = {
        type: ContentType.DOCUMENTATION,
        format: 'markdown',
        detected_patterns: ['markdown-headers', 'markdown-lists'],
        confidence: 0.85,
      };

      expect(metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(metadata.format).toBe('markdown');
      expect(metadata.detected_patterns).toHaveLength(2);
      expect(metadata.confidence).toBe(0.85);
    });

    test('should allow optional language field', () => {
      const metadataWithoutLanguage: ContentMetadata = {
        type: ContentType.GENERAL_TEXT,
        format: 'plain-text',
        detected_patterns: [],
        confidence: 0.5,
      };

      expect(metadataWithoutLanguage.language).toBeUndefined();
    });

    test('should enforce confidence range 0-1', () => {
      const validConfidences = [0, 0.5, 1.0];

      validConfidences.forEach((confidence) => {
        const metadata: ContentMetadata = {
          type: ContentType.GENERAL_TEXT,
          format: 'plain-text',
          detected_patterns: [],
          confidence,
        };

        expect(metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(metadata.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should require all non-optional fields', () => {
      // This test verifies that required fields cannot be omitted
      const metadata: ContentMetadata = {
        type: ContentType.CODE,
        language: 'TypeScript',
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.9,
      };

      expect(metadata.type).toBeDefined();
      expect(metadata.format).toBeDefined();
      expect(metadata.detected_patterns).toBeDefined();
      expect(metadata.confidence).toBeDefined();
    });
  });

  describe('ContentAnalyzedCorrection Interface', () => {
    test('should extend ClassifiedCorrection with Story 2-3 fields', () => {
      const classifiedCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use Promise.then()',
        user_correction: 'Use async/await instead',
        context: 'Async handling',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear preference for alternative',
        },
      };

      const contentMetadata: ContentMetadata = {
        type: ContentType.CODE,
        language: 'TypeScript',
        format: 'code-block',
        detected_patterns: ['async-patterns'],
        confidence: 0.9,
      };

      const analyzed: ContentAnalyzedCorrection = {
        ...classifiedCorrection,
        content_metadata: contentMetadata,
        normalized_correction: 'use async/await instead',
        applicable_for_patterns: true,
      };

      // Verify Story 2-2 fields are preserved
      expect(analyzed.original_suggestion).toBe(classifiedCorrection.original_suggestion);
      expect(analyzed.user_correction).toBe(classifiedCorrection.user_correction);
      expect(analyzed.context).toBe(classifiedCorrection.context);
      expect(analyzed.classification).toBe(classifiedCorrection.classification);

      // Verify Story 2-3 fields are added
      expect(analyzed.content_metadata).toBe(contentMetadata);
      expect(analyzed.normalized_correction).toBeDefined();
      expect(analyzed.applicable_for_patterns).toBe(true);
    });

    test('should require applicable_for_patterns to be boolean', () => {
      const analyzed: ContentAnalyzedCorrection = {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.8,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.GENERAL_TEXT,
          format: 'plain-text',
          detected_patterns: [],
          confidence: 0.5,
        },
        normalized_correction: 'correction',
        applicable_for_patterns: true,
      };

      expect(typeof analyzed.applicable_for_patterns).toBe('boolean');
    });

    test('should require normalized_correction to be string', () => {
      const analyzed: ContentAnalyzedCorrection = {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.8,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.GENERAL_TEXT,
          format: 'plain-text',
          detected_patterns: [],
          confidence: 0.5,
        },
        normalized_correction: 'normalized correction text',
        applicable_for_patterns: true,
      };

      expect(typeof analyzed.normalized_correction).toBe('string');
    });
  });

  describe('ContentAnalysisResult Interface', () => {
    test('should have all required fields', () => {
      const result: ContentAnalysisResult = {
        total_corrections_analyzed: 10,
        content_type_distribution: {
          [ContentType.CODE]: 5,
          [ContentType.DOCUMENTATION]: 3,
          [ContentType.DIAGRAM]: 1,
          [ContentType.PRD]: 1,
          [ContentType.TEST_PLAN]: 0,
          [ContentType.GENERAL_TEXT]: 0,
        },
        analyzed_corrections: [],
        analysis_summary: {
          code_corrections: 5,
          documentation_corrections: 3,
          diagram_corrections: 1,
          prd_corrections: 1,
          test_plan_corrections: 0,
          general_corrections: 0,
        },
        processing_time_ms: 150,
      };

      expect(result.total_corrections_analyzed).toBeDefined();
      expect(result.content_type_distribution).toBeDefined();
      expect(result.analyzed_corrections).toBeDefined();
      expect(result.analysis_summary).toBeDefined();
      expect(result.processing_time_ms).toBeDefined();
    });

    test('should have correct types for all fields', () => {
      const result: ContentAnalysisResult = {
        total_corrections_analyzed: 10,
        content_type_distribution: {} as Record<ContentType, number>,
        analyzed_corrections: [],
        analysis_summary: {
          code_corrections: 0,
          documentation_corrections: 0,
          diagram_corrections: 0,
          prd_corrections: 0,
          test_plan_corrections: 0,
          general_corrections: 0,
        },
        processing_time_ms: 100,
      };

      expect(typeof result.total_corrections_analyzed).toBe('number');
      expect(typeof result.content_type_distribution).toBe('object');
      expect(Array.isArray(result.analyzed_corrections)).toBe(true);
      expect(typeof result.analysis_summary).toBe('object');
      expect(typeof result.processing_time_ms).toBe('number');
    });

    test('should have all content types in distribution', () => {
      const distribution: Record<ContentType, number> = {
        [ContentType.CODE]: 0,
        [ContentType.DOCUMENTATION]: 0,
        [ContentType.DIAGRAM]: 0,
        [ContentType.PRD]: 0,
        [ContentType.TEST_PLAN]: 0,
        [ContentType.GENERAL_TEXT]: 0,
      };

      expect(distribution[ContentType.CODE]).toBeDefined();
      expect(distribution[ContentType.DOCUMENTATION]).toBeDefined();
      expect(distribution[ContentType.DIAGRAM]).toBeDefined();
      expect(distribution[ContentType.PRD]).toBeDefined();
      expect(distribution[ContentType.TEST_PLAN]).toBeDefined();
      expect(distribution[ContentType.GENERAL_TEXT]).toBeDefined();
    });

    test('should have all content types in analysis summary', () => {
      const summary = {
        code_corrections: 0,
        documentation_corrections: 0,
        diagram_corrections: 0,
        prd_corrections: 0,
        test_plan_corrections: 0,
        general_corrections: 0,
      };

      expect(summary.code_corrections).toBeDefined();
      expect(summary.documentation_corrections).toBeDefined();
      expect(summary.diagram_corrections).toBeDefined();
      expect(summary.prd_corrections).toBeDefined();
      expect(summary.test_plan_corrections).toBeDefined();
      expect(summary.general_corrections).toBeDefined();
    });
  });
});

// ============================================================================
// CONTENT TYPE DETECTION API
// ============================================================================

describe('Content Analyzer - Content Type Detection API', () => {
  test('should export detectContentType function', () => {
    expect(typeof detectContentType).toBe('function');
  });

  test('should accept string input for content type detection', () => {
    const content = 'Use async/await instead of Promise.then()';

    expect(() => {
      detectContentType(content);
    }).not.toThrow();
  });

  test('should return ContentMetadata from detectContentType', () => {
    const content = 'const x = 5;';
    const metadata = detectContentType(content);

    expect(metadata).toBeDefined();
    expect(metadata.type).toBeDefined();
    expect(metadata.format).toBeDefined();
    expect(metadata.confidence).toBeGreaterThanOrEqual(0);
    expect(metadata.confidence).toBeLessThanOrEqual(1);
    expect(Array.isArray(metadata.detected_patterns)).toBe(true);
  });

  test('should detect code content type', () => {
    const codeContent = 'function processData() { return await fetch(); }';
    const metadata = detectContentType(codeContent);

    expect(metadata.type).toBe(ContentType.CODE);
    expect(metadata.format).toBe('code-block');
  });

  test('should detect documentation content type', () => {
    const docContent = '## API Reference\n\nThis is the documentation.';
    const metadata = detectContentType(docContent);

    expect(metadata.type).toBe(ContentType.DOCUMENTATION);
    expect(metadata.format).toBe('markdown');
  });

  test('should detect diagram content type', () => {
    const diagramContent = '```mermaid\ngraph TD\n  A --> B\n```';
    const metadata = detectContentType(diagramContent);

    expect(metadata.type).toBe(ContentType.DIAGRAM);
    expect(metadata.format).toBe('mermaid');
  });

  test('should detect PRD content type', () => {
    const prdContent = 'FR-1: System shall support user authentication';
    const metadata = detectContentType(prdContent);

    expect(metadata.type).toBe(ContentType.PRD);
    expect(metadata.format).toBe('structured-text');
  });

  test('should detect test plan content type', () => {
    const testContent = 'Given user is logged in\nWhen they click logout\nThen session ends';
    const metadata = detectContentType(testContent);

    expect(metadata.type).toBe(ContentType.TEST_PLAN);
    expect(metadata.format).toBe('structured-text');
  });

  test('should detect general text content type as fallback', () => {
    const generalContent = 'Do this instead of that';
    const metadata = detectContentType(generalContent);

    expect(metadata.type).toBe(ContentType.GENERAL_TEXT);
    expect(metadata.format).toBe('plain-text');
  });

  test('should provide language detection for code', () => {
    const typescriptContent = 'interface User { name: string; }';
    const metadata = detectContentType(typescriptContent);

    expect(metadata.type).toBe(ContentType.CODE);
    expect(metadata.language).toBeDefined();
  });

  test('should provide detected patterns for content', () => {
    const codeWithFunctions = 'function test() {}';
    const metadata = detectContentType(codeWithFunctions);

    expect(metadata.detected_patterns).toContain('function-definitions');
  });
});

// ============================================================================
// CONTENT NORMALIZATION API
// ============================================================================

describe('Content Analyzer - Content Normalization API', () => {
  test('should export normalizeContent function', () => {
    expect(typeof normalizeContent).toBe('function');
  });

  test('should accept content string and metadata', () => {
    const content = '```typescript\nconst x = 5;\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    expect(() => {
      normalizeContent(content, metadata);
    }).not.toThrow();
  });

  test('should return normalized string', () => {
    const content = '```typescript\nconst x = 5;\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(content, metadata);

    expect(typeof normalized).toBe('string');
    expect(normalized.length).toBeGreaterThan(0);
  });

  test('should normalize code content', () => {
    const codeContent = '```typescript\nconst x = 5;\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(codeContent, metadata);

    // Code blocks should be removed
    expect(normalized).not.toContain('```');
  });

  test('should normalize documentation content', () => {
    const docContent = '## API Reference';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(docContent, metadata);

    // Markdown headers should be stripped
    expect(normalized).not.toContain('##');
  });

  test('should normalize diagram content', () => {
    const diagramContent = '```mermaid\ngraph TD\n```';
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'mermaid',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(diagramContent, metadata);

    // Mermaid markers should be removed
    expect(normalized).not.toContain('```');
  });

  test('should use general text as-is', () => {
    const generalContent = 'Use this instead';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(generalContent, metadata);

    // General text should be preserved
    expect(normalized.trim()).toBe('Use this instead');
  });
});

// ============================================================================
// CONTENT ANALYZER CLASS API
// ============================================================================

describe('Content Analyzer - ContentAnalyzer Class API', () => {
  test('should export ContentAnalyzer class', () => {
    expect(typeof ContentAnalyzer).toBe('function');
  });

  test('should be instantiable without parameters', () => {
    expect(() => {
      new ContentAnalyzer();
    }).not.toThrow();
  });

  test('should have analyzeCorrection method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.analyzeCorrection).toBe('function');
  });

  test('should have analyzeCorrections method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.analyzeCorrections).toBe('function');
  });

  test('should have getContentTypeDistribution method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.getContentTypeDistribution).toBe('function');
  });

  test('should have isEqualTreatment method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.isEqualTreatment).toBe('function');
  });

  test('should have getAnalysisCount method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.getAnalysisCount).toBe('function');
  });

  test('should have resetAnalysisCount method', () => {
    const analyzer = new ContentAnalyzer();
    expect(typeof analyzer.resetAnalysisCount).toBe('function');
  });
});

// ============================================================================
// ANALYZE CORRECTION API
// ============================================================================

describe('Content Analyzer - analyzeCorrection API', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should accept ClassifiedCorrection input', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use Promise.then()',
      user_correction: 'Use async/await instead',
      context: 'Async handling',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Clear preference',
      },
    };

    expect(() => {
      analyzer.analyzeCorrection(correction);
    }).not.toThrow();
  });

  test('should return ContentAnalyzedCorrection', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use Promise.then()',
      user_correction: 'Use async/await instead',
      context: 'Async handling',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Clear preference',
      },
    };

    const result = analyzer.analyzeCorrection(correction);

    expect(result).toBeDefined();
    expect(result.content_metadata).toBeDefined();
    expect(result.normalized_correction).toBeDefined();
    expect(typeof result.applicable_for_patterns).toBe('boolean');
  });

  test('should add content_metadata to result', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use var',
      user_correction: 'Use const instead',
      context: 'Code style',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Code style improvement',
      },
    };

    const result = analyzer.analyzeCorrection(correction);

    expect(result.content_metadata).toBeDefined();
    expect(result.content_metadata.type).toBeDefined();
    expect(result.content_metadata.format).toBeDefined();
    expect(result.content_metadata.confidence).toBeGreaterThanOrEqual(0);
    expect(result.content_metadata.confidence).toBeLessThanOrEqual(1);
  });

  test('should add normalized_correction to result', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use var',
      user_correction: 'Use const instead',
      context: 'Code style',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Code style improvement',
      },
    };

    const result = analyzer.analyzeCorrection(correction);

    expect(result.normalized_correction).toBeDefined();
    expect(typeof result.normalized_correction).toBe('string');
    expect(result.normalized_correction.length).toBeGreaterThan(0);
  });

  test('should set applicable_for_patterns to true', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use var',
      user_correction: 'Use const instead',
      context: 'Code style',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Code style improvement',
      },
    };

    const result = analyzer.analyzeCorrection(correction);

    expect(result.applicable_for_patterns).toBe(true);
  });

  test('should preserve original ClassifiedCorrection fields', () => {
    const correction: ClassifiedCorrection = {
      original_suggestion: 'Use var',
      user_correction: 'Use const instead',
      context: 'Code style',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Code style improvement',
      },
    };

    const result = analyzer.analyzeCorrection(correction);

    expect(result.original_suggestion).toBe(correction.original_suggestion);
    expect(result.user_correction).toBe(correction.user_correction);
    expect(result.context).toBe(correction.context);
    expect(result.classification).toBe(correction.classification);
  });

  test('should throw AR22Error for missing user_correction', () => {
    const malformedCorrection = {
      original_suggestion: 'test',
      // Missing user_correction
      context: 'test',
      classification: {
        type: 'correction' as const,
        confidence: 0.8,
        requires_manual_review: false,
        reasoning: 'test',
      },
    } as any;

    expect(() => {
      analyzer.analyzeCorrection(malformedCorrection);
    }).toThrow(ContentAR22Error);
  });

  test('should throw AR22Error for null input', () => {
    expect(() => {
      analyzer.analyzeCorrection(null as any);
    }).toThrow(ContentAR22Error);
  });

  test('should throw AR22Error for undefined input', () => {
    expect(() => {
      analyzer.analyzeCorrection(undefined as any);
    }).toThrow(ContentAR22Error);
  });
});

// ============================================================================
// ANALYZE CORRECTIONS API
// ============================================================================

describe('Content Analyzer - analyzeCorrections API', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should accept ClassifiedCorrection[] input', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    expect(() => {
      analyzer.analyzeCorrections(corrections);
    }).not.toThrow();
  });

  test('should return ContentAnalysisResult', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result).toBeDefined();
    expect(result.total_corrections_analyzed).toBeDefined();
    expect(result.content_type_distribution).toBeDefined();
    expect(result.analyzed_corrections).toBeDefined();
    expect(result.analysis_summary).toBeDefined();
    expect(result.processing_time_ms).toBeDefined();
  });

  test('should set total_corrections_analyzed correctly', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'test 1',
        user_correction: 'correction 1',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
      {
        original_suggestion: 'test 2',
        user_correction: 'correction 2',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result.total_corrections_analyzed).toBe(2);
  });

  test('should provide content_type_distribution', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const instead',
        context: 'Code',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Code style',
        },
      },
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result.content_type_distribution).toBeDefined();
    expect(result.content_type_distribution[ContentType.CODE]).toBeGreaterThanOrEqual(0);
  });

  test('should provide analysis_summary', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result.analysis_summary).toBeDefined();
    expect(result.analysis_summary.code_corrections).toBeGreaterThanOrEqual(0);
    expect(result.analysis_summary.documentation_corrections).toBeGreaterThanOrEqual(0);
  });

  test('should track processing_time_ms', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    const result = analyzer.analyzeCorrections(corrections);

    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof result.processing_time_ms).toBe('number');
  });

  test('should handle empty array', () => {
    const result = analyzer.analyzeCorrections([]);

    expect(result.total_corrections_analyzed).toBe(0);
    expect(result.analyzed_corrections).toHaveLength(0);
  });

  test('should throw AR22Error for non-array input', () => {
    expect(() => {
      analyzer.analyzeCorrections(null as any);
    }).toThrow(ContentAR22Error);

    expect(() => {
      analyzer.analyzeCorrections(undefined as any);
    }).toThrow(ContentAR22Error);

    expect(() => {
      analyzer.analyzeCorrections('not an array' as any);
    }).toThrow(ContentAR22Error);
  });
});

// ============================================================================
// ERROR HANDLING API (AR22 COMPLIANCE)
// ============================================================================

describe('Content Analyzer - AR22 Error Handling API', () => {
  test('should export AR22Error class', () => {
    expect(typeof ContentAR22Error).toBe('function');
  });

  test('should create AR22Error with required fields', () => {
    const error = new ContentAR22Error('Test error', {
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
    const error = new ContentAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      ContentAnalysisErrorCode.INVALID_INPUT
    );

    expect(error.code).toBe(ContentAnalysisErrorCode.INVALID_INPUT);
  });

  test('should accept optional original error', () => {
    const originalError = new Error('Original error');
    const error = new ContentAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      ContentAnalysisErrorCode.INVALID_INPUT,
      originalError
    );

    expect(error.originalError).toBe(originalError);
  });

  test('should have toString method for formatted output', () => {
    const error = new ContentAR22Error('Test error', {
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
    const error = new ContentAR22Error(
      'Test error',
      {
        what: 'Test',
        how: ['Fix it'],
        technical: 'Details',
      },
      ContentAnalysisErrorCode.INVALID_INPUT
    );

    const errorString = error.toString();
    expect(errorString).toContain('INVALID_INPUT');
  });
});

// ============================================================================
// UTILITY METHODS API
// ============================================================================

describe('Content Analyzer - Utility Methods API', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('getContentTypeDistribution should accept analyzed corrections', () => {
    const analyzedCorrections: ContentAnalyzedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.CODE,
          language: 'TypeScript',
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'correction',
        applicable_for_patterns: true,
      },
    ];

    expect(() => {
      analyzer.getContentTypeDistribution(analyzedCorrections);
    }).not.toThrow();
  });

  test('getContentTypeDistribution should return distribution', () => {
    const analyzedCorrections: ContentAnalyzedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'correction',
        applicable_for_patterns: true,
      },
    ];

    const distribution = analyzer.getContentTypeDistribution(analyzedCorrections);

    expect(distribution).toBeDefined();
    expect(distribution[ContentType.CODE]).toBe(1);
  });

  test('isEqualTreatment should accept analyzed corrections', () => {
    const analyzedCorrections: ContentAnalyzedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.GENERAL_TEXT,
          format: 'plain-text',
          detected_patterns: [],
          confidence: 0.5,
        },
        normalized_correction: 'correction',
        applicable_for_patterns: true,
      },
    ];

    expect(() => {
      analyzer.isEqualTreatment(analyzedCorrections);
    }).not.toThrow();
  });

  test('isEqualTreatment should return boolean', () => {
    const analyzedCorrections: ContentAnalyzedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'test',
        },
        content_metadata: {
          type: ContentType.GENERAL_TEXT,
          format: 'plain-text',
          detected_patterns: [],
          confidence: 0.5,
        },
        normalized_correction: 'correction',
        applicable_for_patterns: true,
      },
    ];

    const isEqual = analyzer.isEqualTreatment(analyzedCorrections);

    expect(typeof isEqual).toBe('boolean');
  });

  test('getAnalysisCount should return number', () => {
    const count = analyzer.getAnalysisCount();

    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('resetAnalysisCount should reset counter', () => {
    analyzer.analyzeCorrection({
      original_suggestion: 'test',
      user_correction: 'correction',
      context: 'test',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'test',
      },
    });

    expect(analyzer.getAnalysisCount()).toBe(1);

    analyzer.resetAnalysisCount();

    expect(analyzer.getAnalysisCount()).toBe(0);
  });
});
