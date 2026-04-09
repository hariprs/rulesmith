/**
 * Integration Tests for Role-Agnostic Content Analysis (Story 2-3)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests verify the integration between:
 * - Correction Classifier (Story 2-2)
 * - Content Analyzer (Story 2-3)
 * - Multi-format content handling
 * - Role-agnostic processing
 *
 * Testing Strategy:
 * - Test with real correction classifier output
 * - Verify content type detection across all formats
 * - Test role-agnostic behavior (no role-specific logic)
 * - Validate AR22 compliance in content analysis scenarios
 * - Test integration with correction classifier data structures
 *
 * Test Pyramid Level: Integration (API-level tests in separate file)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  ContentAnalyzer,
  ContentType,
  ContentMetadata,
  ContentAnalyzedCorrection,
  ContentAnalysisResult,
  AR22Error as ContentAR22Error,
  ContentAnalysisErrorCode,
  detectContentType,
  normalizeContent,
} from '../../src/content-analyzer';
import {
  ClassifiedCorrection,
  ClassificationDecision,
  AR22Error as ClassifierAR22Error,
} from '../../src/correction-classifier';

// ============================================================================
// TEST DATA FIXTURES
// ============================================================================

/**
 * Sample classified corrections from Story 2-2
 * These represent realistic output from the correction classifier
 */
const sampleClassifiedCorrections: ClassifiedCorrection[] = [
  {
    original_suggestion: 'Use Promise.then() for async handling',
    user_correction: 'Actually, I prefer async/await for better readability',
    context: 'Assistant: Use Promise.then()\nUser: I prefer async/await',
    classification: {
      type: 'correction',
      confidence: 0.85,
      requires_manual_review: false,
      reasoning: 'Classified as correction because user expressed preference for alternative approach',
    },
  },
  {
    original_suggestion: 'Add JSDoc comments',
    user_correction: 'I\'ll use TSDoc instead since we\'re standardizing on it',
    context: 'Documentation format discussion',
    classification: {
      type: 'correction',
      confidence: 0.9,
      requires_manual_review: false,
      reasoning: 'Clear correction with alternative specification',
    },
  },
  {
    original_suggestion: 'Draw the flowchart from top to bottom',
    user_correction: 'Left to right is better for this architecture diagram',
    context: 'Diagram layout discussion',
    classification: {
      type: 'correction',
      confidence: 0.8,
      requires_manual_review: false,
      reasoning: 'Correction with diagram-specific preference',
    },
  },
];

/**
 * Mixed content type corrections for comprehensive testing
 */
const mixedContentCorrections: ClassifiedCorrection[] = [
  {
    original_suggestion: 'Use var for variables',
    user_correction: 'Use const and let instead of var',
    context: 'Code quality',
    classification: {
      type: 'correction',
      confidence: 0.95,
      requires_manual_review: false,
      reasoning: 'Clear code correction',
    },
  },
  {
    original_suggestion: 'Document parameters in JSDoc',
    user_correction: 'We use TSDoc format for TypeScript projects',
    context: 'Documentation standards',
    classification: {
      type: 'correction',
      confidence: 0.9,
      requires_manual_review: false,
      reasoning: 'Documentation correction',
    },
  },
  {
    original_suggestion: 'Use vertical layout for the sequence diagram',
    user_correction: 'Horizontal layout works better for wide screens',
    context: 'Diagram design',
    classification: {
      type: 'correction',
      confidence: 0.85,
      requires_manual_review: false,
      reasoning: 'Diagram layout correction',
    },
  },
];

// ============================================================================
// CORRECTION CLASSIFIER INTEGRATION
// ============================================================================

describe('Content Analyzer - Integration with Correction Classifier', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  describe('Story 2-2 Output Integration', () => {
    test('should accept ClassifiedCorrection[] from Story 2-2', () => {
      // This test verifies the data contract between Story 2-2 and Story 2-3
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      // Verify integration worked
      expect(result).toBeDefined();
      expect(result.total_corrections_analyzed).toBe(sampleClassifiedCorrections.length);
      expect(result.analyzed_corrections).toHaveLength(sampleClassifiedCorrections.length);
    });

    test('should preserve classification metadata from Story 2-2', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      // Verify all classified corrections are preserved
      result.analyzed_corrections.forEach((analyzed, index) => {
        expect(analyzed.original_suggestion).toBe(sampleClassifiedCorrections[index].original_suggestion);
        expect(analyzed.user_correction).toBe(sampleClassifiedCorrections[index].user_correction);
        expect(analyzed.context).toBe(sampleClassifiedCorrections[index].context);

        // Verify classification decision is preserved
        expect(analyzed.classification).toBeDefined();
        expect(analyzed.classification.type).toBeDefined();
        expect(analyzed.classification.confidence).toBeGreaterThanOrEqual(0);
        expect(analyzed.classification.confidence).toBeLessThanOrEqual(1);
        expect(analyzed.classification.reasoning).toBeDefined();
      });
    });

    test('should add content metadata to each correction', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      result.analyzed_corrections.forEach((analyzed) => {
        // Verify content metadata is added
        expect(analyzed.content_metadata).toBeDefined();
        expect(analyzed.content_metadata.type).toBeDefined();
        expect(analyzed.content_metadata.format).toBeDefined();
        expect(analyzed.content_metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(analyzed.content_metadata.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(analyzed.content_metadata.detected_patterns)).toBe(true);
      });
    });

    test('should add normalized correction for pattern extraction', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      result.analyzed_corrections.forEach((analyzed) => {
        // Verify normalized correction is added
        expect(analyzed.normalized_correction).toBeDefined();
        expect(typeof analyzed.normalized_correction).toBe('string');
        expect(analyzed.normalized_correction.length).toBeGreaterThan(0);
      });
    });

    test('should mark all corrections as applicable for patterns (role-agnostic)', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      // Verify all corrections are applicable (role-agnostic equal treatment)
      result.analyzed_corrections.forEach((analyzed) => {
        expect(analyzed.applicable_for_patterns).toBe(true);
      });
    });

    test('should handle empty correction array from Story 2-2', () => {
      const emptyCorrections: ClassifiedCorrection[] = [];
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(emptyCorrections);

      expect(result.total_corrections_analyzed).toBe(0);
      expect(result.analyzed_corrections).toHaveLength(0);
      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    });

    test('should throw AR22Error for invalid Story 2-2 input', () => {
      const invalidInputs = [
        null as any,
        undefined as any,
        'not an array' as any,
        { not: 'an array' } as any,
        123 as any,
      ];

      invalidInputs.forEach((invalidInput) => {
        expect(() => {
          analyzer.analyzeCorrections(invalidInput);
        }).toThrow(ContentAR22Error);
      });
    });

    test('should handle corrections with missing required fields gracefully', () => {
      const malformedCorrections = [
        {
          original_suggestion: 'test',
          // Missing user_correction
          context: 'test',
          classification: {
            type: 'correction' as const,
            confidence: 0.8,
            requires_manual_review: false,
            reasoning: 'test',
          },
        } as any,
      ];

      expect(() => {
        analyzer.analyzeCorrections(malformedCorrections);
      }).toThrow(ContentAR22Error);
    });
  });

  describe('Confidence Scoring Integration', () => {
    test('should maintain classification confidence from Story 2-2', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      result.analyzed_corrections.forEach((analyzed) => {
        // Classification confidence should be preserved
        expect(analyzed.classification.confidence).toBeGreaterThanOrEqual(0);
        expect(analyzed.classification.confidence).toBeLessThanOrEqual(1);
      });
    });

    test('should add content type detection confidence', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      result.analyzed_corrections.forEach((analyzed) => {
        // Content type detection confidence should be added
        expect(analyzed.content_metadata.confidence).toBeGreaterThanOrEqual(0);
        expect(analyzed.content_metadata.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Reasoning Preservation', () => {
    test('should preserve classification reasoning from Story 2-2', () => {
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

      result.analyzed_corrections.forEach((analyzed, index) => {
        // Verify reasoning is preserved
        expect(analyzed.classification.reasoning).toBe(
          sampleClassifiedCorrections[index].classification.reasoning
        );
      });
    });
  });
});

// ============================================================================
// CONTENT TYPE DETECTION INTEGRATION
// ============================================================================

describe('Content Analyzer - Content Type Detection', () => {
  describe('Code Content Detection', () => {
    test('should detect TypeScript code corrections', () => {
      const codeCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use var for variables',
        user_correction: 'Use const and let instead of var for better scoping',
        context: 'TypeScript code quality',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Code style correction',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(codeCorrection);

      expect(result.content_metadata.type).toBe(ContentType.CODE);
      expect(result.content_metadata.language).toBeDefined();
      expect(result.content_metadata.format).toBe('code-block');
    });

    test('should detect JavaScript code corrections', () => {
      const jsCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use var',
        user_correction: 'Use const and let instead',
        context: 'JavaScript',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Code improvement',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(jsCorrection);

      expect(result.content_metadata.type).toBe(ContentType.CODE);
    });

    test('should detect Python code corrections', () => {
      const pythonCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use list comprehension',
        user_correction: 'Use a regular loop for readability',
        context: 'Python code',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'Readability preference',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(pythonCorrection);

      expect(result.content_metadata.type).toBe(ContentType.CODE);
    });

    test('should detect code patterns in user corrections', () => {
      const codePatternCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use function declarations',
        user_correction: 'Prefer arrow functions for callbacks',
        context: 'Code style',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Code pattern preference',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(codePatternCorrection);

      expect(result.content_metadata.detected_patterns).toContain('function-definitions');
    });
  });

  describe('Documentation Content Detection', () => {
    test('should detect markdown documentation corrections', () => {
      const docCorrection: ClassifiedCorrection = {
        original_suggestion: 'Add JSDoc comments',
        user_correction: 'We use TSDoc format for TypeScript projects with proper headers',
        context: 'Documentation standards',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Documentation format',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(docCorrection);

      expect(result.content_metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(result.content_metadata.format).toBe('markdown');
    });

    test('should detect README-style corrections', () => {
      const readmeCorrection: ClassifiedCorrection = {
        original_suggestion: 'Add installation section',
        user_correction: 'Include ## Installation section with npm install command',
        context: 'README documentation',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'README structure',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(readmeCorrection);

      expect(result.content_metadata.type).toBe(ContentType.DOCUMENTATION);
      expect(result.content_metadata.detected_patterns).toContain('markdown-headers');
    });
  });

  describe('Diagram Content Detection', () => {
    test('should detect Mermaid diagram corrections', () => {
      const diagramCorrection: ClassifiedCorrection = {
        original_suggestion: 'Use vertical flowchart',
        user_correction: 'Use graph LR for left-to-right layout in Mermaid',
        context: 'Diagram design',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Diagram layout',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(diagramCorrection);

      expect(result.content_metadata.type).toBe(ContentType.DIAGRAM);
      expect(result.content_metadata.format).toBe('mermaid');
      expect(result.content_metadata.detected_patterns).toContain('mermaid-syntax');
    });

    test('should detect architecture diagram corrections', () => {
      const archDiagramCorrection: ClassifiedCorrection = {
        original_suggestion: 'Draw component diagram',
        user_correction: 'Create sequence diagram to show interaction flow',
        context: 'Architecture visualization',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'Diagram type preference',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(archDiagramCorrection);

      expect(result.content_metadata.type).toBe(ContentType.DIAGRAM);
    });
  });

  describe('PRD Content Detection', () => {
    test('should detect PRD corrections', () => {
      const prdCorrection: ClassifiedCorrection = {
        original_suggestion: 'Write this as a user story',
        user_correction: 'This should be a functional requirement (FR-1) instead',
        context: 'PRD structure',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Requirement format',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(prdCorrection);

      expect(result.content_metadata.type).toBe(ContentType.PRD);
      expect(result.content_metadata.format).toBe('structured-text');
      expect(result.content_metadata.detected_patterns).toContain('prd-structure');
    });

    test('should detect user story corrections', () => {
      const userStoryCorrection: ClassifiedCorrection = {
        original_suggestion: 'Add feature X',
        user_correction: 'Frame this as a user story with acceptance criteria',
        context: 'Requirement format',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'User story format',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(userStoryCorrection);

      expect(result.content_metadata.type).toBe(ContentType.PRD);
    });
  });

  describe('Test Plan Content Detection', () => {
    test('should detect test plan corrections', () => {
      const testPlanCorrection: ClassifiedCorrection = {
        original_suggestion: 'Write this as a unit test',
        user_correction: 'This is better as an integration test since it touches multiple components',
        context: 'Test strategy',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Test level appropriateness',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(testPlanCorrection);

      expect(result.content_metadata.type).toBe(ContentType.TEST_PLAN);
      expect(result.content_metadata.format).toBe('structured-text');
      expect(result.content_metadata.detected_patterns).toContain('test-structure');
    });

    test('should detect BDD scenario corrections', () => {
      const bddCorrection: ClassifiedCorrection = {
        original_suggestion: 'Write test with assert',
        user_correction: 'Use Given-When-Then format for BDD-style test',
        context: 'Test format',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'BDD format preference',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(bddCorrection);

      expect(result.content_metadata.type).toBe(ContentType.TEST_PLAN);
    });
  });

  describe('General Text Content Detection', () => {
    test('should detect general text corrections (fallback)', () => {
      const generalCorrection: ClassifiedCorrection = {
        original_suggestion: 'Do this',
        user_correction: 'Do that instead',
        context: 'General discussion',
        classification: {
          type: 'correction',
          confidence: 0.7,
          requires_manual_review: false,
          reasoning: 'General preference',
        },
      };

      const analyzer = new ContentAnalyzer();
      const result = analyzer.analyzeCorrection(generalCorrection);

      expect(result.content_metadata.type).toBe(ContentType.GENERAL_TEXT);
      expect(result.content_metadata.format).toBe('plain-text');
    });
  });

  describe('Mixed Content Detection', () => {
    test('should handle conversation with multiple content types', () => {
      const analyzer = new ContentAnalyzer();
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(mixedContentCorrections);

      // Verify multiple content types detected
      const contentTypes = new Set(
        result.analyzed_corrections.map((a) => a.content_metadata.type)
      );

      expect(contentTypes.size).toBeGreaterThan(1);
      expect(contentTypes).toContain(ContentType.CODE);
      expect(contentTypes).toContain(ContentType.DOCUMENTATION);
      expect(contentTypes).toContain(ContentType.DIAGRAM);
    });

    test('should provide content type distribution', () => {
      const analyzer = new ContentAnalyzer();
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(mixedContentCorrections);

      // Verify distribution is calculated
      expect(result.content_type_distribution).toBeDefined();
      expect(result.content_type_distribution[ContentType.CODE]).toBeGreaterThanOrEqual(0);
      expect(result.content_type_distribution[ContentType.DOCUMENTATION]).toBeGreaterThanOrEqual(0);
      expect(result.content_type_distribution[ContentType.DIAGRAM]).toBeGreaterThanOrEqual(0);
    });

    test('should provide analysis summary by content type', () => {
      const analyzer = new ContentAnalyzer();
      const result: ContentAnalysisResult = analyzer.analyzeCorrections(mixedContentCorrections);

      // Verify summary matches distribution
      expect(result.analysis_summary).toBeDefined();
      expect(result.analysis_summary.code_corrections).toBe(
        result.content_type_distribution[ContentType.CODE]
      );
      expect(result.analysis_summary.documentation_corrections).toBe(
        result.content_type_distribution[ContentType.DOCUMENTATION]
      );
      expect(result.analysis_summary.diagram_corrections).toBe(
        result.content_type_distribution[ContentType.DIAGRAM]
      );
    });
  });
});

// ============================================================================
// ROLE-AGNOSTIC BEHAVIOR
// ============================================================================

describe('Content Analyzer - Role-Agnostic Behavior', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should treat all content types equally', () => {
    const result: ContentAnalysisResult = analyzer.analyzeCorrections(mixedContentCorrections);

    // All corrections should be applicable for patterns regardless of content type
    const allApplicable = result.analyzed_corrections.every(
      (c) => c.applicable_for_patterns === true
    );

    expect(allApplicable).toBe(true);
  });

  test('should not require role configuration', () => {
    // Analyzer should work without any role configuration
    expect(() => {
      analyzer.analyzeCorrections(sampleClassifiedCorrections);
    }).not.toThrow();

    // Should produce valid results without role context
    const result = analyzer.analyzeCorrections(sampleClassifiedCorrections);
    expect(result.total_corrections_analyzed).toBeGreaterThan(0);
  });

  test('should not have role-specific logic or configuration', () => {
    // This test verifies that the analyzer doesn't have role-specific methods
    const analyzerProto = Object.getPrototypeOf(analyzer);

    // Check for role-specific methods (should not exist)
    expect(analyzerProto.setRole).toBeUndefined();
    expect(analyzerProto.getUserRole).toBeUndefined();
    expect(analyzerProto.configureForRole).toBeUndefined();
  });

  test('should work equally well for technical and non-technical content', () => {
    const technicalCorrection: ClassifiedCorrection = {
      original_suggestion: 'Use React',
      user_correction: 'Use Vue instead',
      context: 'Technical framework choice',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Framework preference',
      },
    };

    const nonTechnicalCorrection: ClassifiedCorrection = {
      original_suggestion: 'Write technical requirements',
      user_correction: 'Focus on user benefits instead',
      context: 'Non-technical content',
      classification: {
        type: 'correction',
        confidence: 0.85,
        requires_manual_review: false,
        reasoning: 'User-centric approach',
      },
    };

    const technicalResult = analyzer.analyzeCorrection(technicalCorrection);
    const nonTechnicalResult = analyzer.analyzeCorrection(nonTechnicalCorrection);

    // Both should be analyzed and marked as applicable
    expect(technicalResult.applicable_for_patterns).toBe(true);
    expect(nonTechnicalResult.applicable_for_patterns).toBe(true);

    // Both should have content metadata
    expect(technicalResult.content_metadata).toBeDefined();
    expect(nonTechnicalResult.content_metadata).toBeDefined();
  });

  test('should verify equal treatment across all corrections', () => {
    const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

    // Helper method should confirm equal treatment
    const isEqualTreatment = analyzer.isEqualTreatment(result.analyzed_corrections);
    expect(isEqualTreatment).toBe(true);
  });
});

// ============================================================================
// CONTENT NORMALIZATION
// ============================================================================

describe('Content Analyzer - Content Normalization', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should normalize code content for pattern extraction', () => {
    const codeCorrection: ClassifiedCorrection = {
      original_suggestion: 'Use var',
      user_correction: '```typescript\nconst x = 5;\n```',
      context: 'Code',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Code style',
      },
    };

    const result = analyzer.analyzeCorrection(codeCorrection);

    // Normalized content should be extracted from code blocks
    expect(result.normalized_correction).toBeDefined();
    expect(result.normalized_correction).not.toContain('```');
    expect(result.normalized_correction.trim()).toBeTruthy();
  });

  test('should normalize markdown documentation for pattern extraction', () => {
    const docCorrection: ClassifiedCorrection = {
      original_suggestion: 'Add documentation',
      user_correction: '## API Reference\n\nThis is the API documentation.',
      context: 'Documentation',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Documentation structure',
      },
    };

    const result = analyzer.analyzeCorrection(docCorrection);

    // Normalized content should strip markdown formatting
    expect(result.normalized_correction).toBeDefined();
    // Headers should be stripped or normalized
  });

  test('should normalize diagram content for pattern extraction', () => {
    const diagramCorrection: ClassifiedCorrection = {
      original_suggestion: 'Use vertical layout',
      user_correction: '```mermaid\ngraph LR\n  A --> B\n```',
      context: 'Diagram',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Diagram layout',
      },
    };

    const result = analyzer.analyzeCorrection(diagramCorrection);

    // Normalized content should extract diagram description
    expect(result.normalized_correction).toBeDefined();
    expect(result.normalized_correction).not.toContain('```');
  });

  test('should normalize PRD content for pattern extraction', () => {
    const prdCorrection: ClassifiedCorrection = {
      original_suggestion: 'Add requirement',
      user_correction: 'FR-1: System shall support user authentication',
      context: 'PRD',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'Requirement format',
      },
    };

    const result = analyzer.analyzeCorrection(prdCorrection);

    // Normalized content should preserve structure
    expect(result.normalized_correction).toBeDefined();
    expect(result.normalized_correction).toContain('FR-1');
  });

  test('should normalize test plan content for pattern extraction', () => {
    const testCorrection: ClassifiedCorrection = {
      original_suggestion: 'Write test',
      user_correction: 'Given user is logged in\nWhen they click logout\nThen session is terminated',
      context: 'Test plan',
      classification: {
        type: 'correction',
        confidence: 0.9,
        requires_manual_review: false,
        reasoning: 'BDD format',
      },
    };

    const result = analyzer.analyzeCorrection(testCorrection);

    // Normalized content should preserve BDD structure
    expect(result.normalized_correction).toBeDefined();
    expect(result.normalized_correction).toContain('Given');
  });

  test('should use general text as-is for pattern extraction', () => {
    const generalCorrection: ClassifiedCorrection = {
      original_suggestion: 'Do this',
      user_correction: 'Do that instead',
      context: 'General',
      classification: {
        type: 'correction',
        confidence: 0.7,
        requires_manual_review: false,
        reasoning: 'General preference',
      },
    };

    const result = analyzer.analyzeCorrection(generalCorrection);

    // General text should be used as-is (trimmed)
    expect(result.normalized_correction).toBeDefined();
    expect(result.normalized_correction.trim()).toBe('Do that instead');
  });
});

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANCE)
// ============================================================================

describe('Content Analyzer - AR22 Compliant Error Handling', () => {
  let analyzer: ContentAnalyzer;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
  });

  test('should throw AR22Error for null input', () => {
    expect(() => {
      analyzer.analyzeCorrections(null as any);
    }).toThrow(ContentAR22Error);
  });

  test('should throw AR22Error for undefined input', () => {
    expect(() => {
      analyzer.analyzeCorrections(undefined as any);
    }).toThrow(ContentAR22Error);
  });

  test('should throw AR22Error for non-array input', () => {
    expect(() => {
      analyzer.analyzeCorrections('not an array' as any);
    }).toThrow(ContentAR22Error);
  });

  test('should throw AR22Error for correction with missing user_correction', () => {
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

  test('should include all AR22 fields in error', () => {
    try {
      analyzer.analyzeCorrections(null as any);
      fail('Expected AR22Error');
    } catch (error) {
      if (error instanceof ContentAR22Error) {
        expect(error.message).toBeDefined(); // Brief description
        expect(error.what).toBeDefined(); // What happened
        expect(error.how).toBeDefined(); // How to fix (array)
        expect(Array.isArray(error.how)).toBe(true);
        expect(error.how.length).toBeGreaterThan(0);
        expect(error.technical).toBeDefined(); // Technical details
      } else {
        fail(`Expected ContentAR22Error, got ${error}`);
      }
    }
  });

  test('should use ContentAnalysisErrorCode for errors', () => {
    const errorCases = [
      null as any,
      undefined as any,
      'not an array' as any,
    ];

    errorCases.forEach((invalidInput) => {
      try {
        analyzer.analyzeCorrections(invalidInput);
        fail(`Expected error for input: ${JSON.stringify(invalidInput)}`);
      } catch (error) {
        if (error instanceof ContentAR22Error) {
          expect(error.code).toBeDefined();
          expect(Object.values(ContentAnalysisErrorCode)).toContain(error.code);
        } else {
          fail(`Expected ContentAR22Error, got ${error}`);
        }
      }
    });
  });

  test('should provide actionable error messages', () => {
    try {
      analyzer.analyzeCorrections(null as any);
      fail('Expected AR22Error');
    } catch (error) {
      if (error instanceof ContentAR22Error) {
        // Verify "how to fix" steps are actionable
        error.how.forEach((step) => {
          expect(typeof step).toBe('string');
          expect(step.length).toBeGreaterThan(0);
        });
      } else {
        fail(`Expected ContentAR22Error, got ${error}`);
      }
    }
  });

  test('should include technical details for debugging', () => {
    try {
      analyzer.analyzeCorrections(null as any);
      fail('Expected AR22Error');
    } catch (error) {
      if (error instanceof ContentAR22Error) {
        expect(error.technical).toBeDefined();
        expect(error.technical.length).toBeGreaterThan(0);
        expect(error.technical).toContain('Expected: array');
      } else {
        fail(`Expected ContentAR22Error, got ${error}`);
      }
    }
  });

  test('should handle normalization errors gracefully', () => {
    // This test verifies that normalization errors are caught and reported
    const correctionWithComplexContent: ClassifiedCorrection = {
      original_suggestion: 'test',
      user_correction: 'Normal content',
      context: 'test',
      classification: {
        type: 'correction',
        confidence: 0.8,
        requires_manual_review: false,
        reasoning: 'test',
      },
    };

    // Normalization should not throw for valid content
    expect(() => {
      analyzer.analyzeCorrection(correctionWithComplexContent);
    }).not.toThrow();
  });
});

// ============================================================================
// PERFORMANCE INTEGRATION TESTS
// ============================================================================

describe('Content Analyzer - Performance Integration', () => {
  test('should handle large correction arrays efficiently', () => {
    // Generate large array of corrections
    const largeCorrections: ClassifiedCorrection[] = [];
    for (let i = 0; i < 1000; i++) {
      largeCorrections.push({
        original_suggestion: `Suggestion ${i}`,
        user_correction: `Correction ${i} with code pattern`,
        context: 'Performance test',
        classification: {
          type: 'correction',
          confidence: 0.8,
          requires_manual_review: false,
          reasoning: 'Test',
        },
      });
    }

    const analyzer = new ContentAnalyzer();
    const startTime = Date.now();
    const result = analyzer.analyzeCorrections(largeCorrections);
    const endTime = Date.now();

    // Should complete in reasonable time (< 5 seconds for 1000 corrections)
    expect(endTime - startTime).toBeLessThan(5000);
    expect(result.total_corrections_analyzed).toBe(1000);
  });

  test('should track processing time', () => {
    const corrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'test',
        user_correction: 'correction',
        context: 'test',
        classification: {
          type: 'correction',
          confidence: 0.8,
          requires_manual_review: false,
          reasoning: 'test',
        },
      },
    ];

    const analyzer = new ContentAnalyzer();
    const result = analyzer.analyzeCorrections(corrections);

    expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
    expect(typeof result.processing_time_ms).toBe('number');
  });
});

// ============================================================================
// END-TO-END INTEGRATION SCENARIOS
// ============================================================================

describe('Content Analyzer - End-to-End Integration Scenarios', () => {
  test('should process complete workflow: classify -> analyze', () => {
    // This test simulates the complete Story 2-2 -> Story 2-3 workflow

    // Step 1: Story 2-2 output (simulated)
    const classifiedCorrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use Promise.then()',
        user_correction: 'Use async/await instead for better readability',
        context: 'Async handling',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction with alternative',
        },
      },
      {
        original_suggestion: 'Add JSDoc',
        user_correction: 'Use TSDoc format',
        context: 'Documentation',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'Documentation format preference',
        },
      },
    ];

    // Step 2: Story 2-3 analysis
    const analyzer = new ContentAnalyzer();
    const result: ContentAnalysisResult = analyzer.analyzeCorrections(classifiedCorrections);

    // Verify complete workflow
    expect(result.total_corrections_analyzed).toBe(2);
    expect(result.analyzed_corrections).toHaveLength(2);

    // Verify all corrections have content metadata
    result.analyzed_corrections.forEach((analyzed) => {
      expect(analyzed.content_metadata).toBeDefined();
      expect(analyzed.normalized_correction).toBeDefined();
      expect(analyzed.applicable_for_patterns).toBe(true);
    });
  });

  test('should handle real-world mixed content conversation', () => {
    const realWorldCorrections: ClassifiedCorrection[] = [
      {
        original_suggestion: 'Use var for variables',
        user_correction: 'Use const and let with TypeScript types',
        context: 'Code quality',
        classification: {
          type: 'correction',
          confidence: 0.95,
          requires_manual_review: false,
          reasoning: 'Code style improvement',
        },
      },
      {
        original_suggestion: 'Document with JSDoc',
        user_correction: '## API Reference\n\nUse TSDoc format with @param tags',
        context: 'Documentation',
        classification: {
          type: 'correction',
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Documentation format',
        },
      },
      {
        original_suggestion: 'Vertical flowchart',
        user_correction: '```mermaid\ngraph LR\n  A --> B\n```',
        context: 'Diagram',
        classification: {
          type: 'correction',
          confidence: 0.85,
          requires_manual_review: false,
          reasoning: 'Diagram layout',
        },
      },
    ];

    const analyzer = new ContentAnalyzer();
    const result = analyzer.analyzeCorrections(realWorldCorrections);

    // Verify all content types detected
    const contentTypes = new Set(
      result.analyzed_corrections.map((a) => a.content_metadata.type)
    );

    expect(contentTypes).toContain(ContentType.CODE);
    expect(contentTypes).toContain(ContentType.DOCUMENTATION);
    expect(contentTypes).toContain(ContentType.DIAGRAM);

    // Verify all are applicable for patterns (role-agnostic)
    expect(result.analyzed_corrections.every((c) => c.applicable_for_patterns)).toBe(true);
  });
});

// ============================================================================
// DATA CONTRACT VALIDATION
// ============================================================================

describe('Content Analyzer - Data Contract Validation', () => {
  test('should validate ContentAnalysisResult interface', () => {
    const analyzer = new ContentAnalyzer();
    const result: ContentAnalysisResult = analyzer.analyzeCorrections(sampleClassifiedCorrections);

    // Verify all required fields
    expect(result.total_corrections_analyzed).toBeDefined();
    expect(typeof result.total_corrections_analyzed).toBe('number');

    expect(result.content_type_distribution).toBeDefined();
    expect(typeof result.content_type_distribution).toBe('object');

    expect(result.analyzed_corrections).toBeDefined();
    expect(Array.isArray(result.analyzed_corrections)).toBe(true);

    expect(result.analysis_summary).toBeDefined();
    expect(result.analysis_summary.code_corrections).toBeDefined();
    expect(result.analysis_summary.documentation_corrections).toBeDefined();
    expect(result.analysis_summary.diagram_corrections).toBeDefined();
    expect(result.analysis_summary.prd_corrections).toBeDefined();
    expect(result.analysis_summary.test_plan_corrections).toBeDefined();
    expect(result.analysis_summary.general_corrections).toBeDefined();

    expect(result.processing_time_ms).toBeDefined();
    expect(typeof result.processing_time_ms).toBe('number');
  });

  test('should validate ContentAnalyzedCorrection interface', () => {
    const analyzer = new ContentAnalyzer();
    const result = analyzer.analyzeCorrection(sampleClassifiedCorrections[0]);

    // Verify extends ClassifiedCorrection (Story 2-2 fields)
    expect(result.original_suggestion).toBeDefined();
    expect(result.user_correction).toBeDefined();
    expect(result.context).toBeDefined();
    expect(result.classification).toBeDefined();

    // Verify new Story 2-3 fields
    expect(result.content_metadata).toBeDefined();
    expect(result.normalized_correction).toBeDefined();
    expect(result.applicable_for_patterns).toBeDefined();
    expect(typeof result.applicable_for_patterns).toBe('boolean');
  });

  test('should validate ContentMetadata interface', () => {
    const analyzer = new ContentAnalyzer();
    const result = analyzer.analyzeCorrection(sampleClassifiedCorrections[0]);

    const metadata = result.content_metadata;

    expect(metadata.type).toBeDefined();
    expect(Object.values(ContentType)).toContain(metadata.type);

    expect(metadata.format).toBeDefined();
    expect(typeof metadata.format).toBe('string');

    expect(metadata.detected_patterns).toBeDefined();
    expect(Array.isArray(metadata.detected_patterns)).toBe(true);

    expect(metadata.confidence).toBeDefined();
    expect(typeof metadata.confidence).toBe('number');
    expect(metadata.confidence).toBeGreaterThanOrEqual(0);
    expect(metadata.confidence).toBeLessThanOrEqual(1);
  });
});
