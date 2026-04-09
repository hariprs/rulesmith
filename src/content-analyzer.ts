/**
 * Content Analyzer Implementation (Story 2-3)
 *
 * Role-agnostic content analysis that works for all BMAD team members
 * following the test architecture principle: unit > integration > E2E
 *
 * This module provides:
 * - Content type detection (code, documentation, diagrams, PRDs, test plans, general text)
 * - Content normalization for different formats
 * - Universal processing (works identically for all users)
 * - Multi-format support (markdown, code blocks, plain text, structured text)
 * - Content-aware pattern extraction that adapts to detected content type
 * - AR22 compliant error handling
 * - Performance-conscious O(n) content processing
 */

import { ClassifiedCorrection } from './correction-classifier';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Content types supported for universal analysis
 * These cover all conversational content types across all BMAD team roles
 *
 * @enum {string}
 * @property {string} CODE - Programming code in any language
 * @property {string} DOCUMENTATION - Documentation, README files, API docs
 * @property {string} DIAGRAM - Mermaid diagrams, flowcharts, architecture diagrams
 * @property {string} PRD - Product requirements, functional requirements
 * @property {string} TEST_PLAN - Test cases, BDD scenarios, test documentation
 * @property {string} GENERAL_TEXT - General conversational content
 *
 * All content types are treated equally for pattern extraction.
 */
export enum ContentType {
  /** Programming code in TypeScript, JavaScript, Python, Java, etc. */
  CODE = 'code',
  /** Documentation including API docs, README files, technical documentation */
  DOCUMENTATION = 'documentation',
  /** Diagrams including Mermaid, flowcharts, sequence diagrams, architecture diagrams */
  DIAGRAM = 'diagram',
  /** Product requirements, functional requirements, user stories, epics */
  PRD = 'prd',
  /** Test plans, test cases, BDD scenarios, acceptance criteria */
  TEST_PLAN = 'test_plan',
  /** General conversational content without specific formatting */
  GENERAL_TEXT = 'general_text',
}

/**
 * Metadata extracted from content for type-aware processing
 *
 * @interface ContentMetadata
 * @property {ContentType} type - The detected content type
 * @property {string} [language] - Programming language (for code type): TypeScript, Python, JavaScript, Java, etc.
 * @property {string} format - Content format: markdown, code-block, plain-text, structured-text, mermaid, text-description
 * @property {string[]} detected_patterns - Content-specific patterns detected (e.g., 'function-definitions', 'markdown-headers')
 * @property {number} confidence - Confidence score from 0-1 for content type detection (>= 0.9 = high, >= 0.7 = medium, < 0.7 = low)
 *
 * @example
 * ```typescript
 * const metadata: ContentMetadata = {
 *   type: ContentType.CODE,
 *   language: 'TypeScript',
 *   format: 'code-block',
 *   detected_patterns: ['function-definitions', 'import-statements'],
 *   confidence: 0.95
 * };
 * ```
 */
export interface ContentMetadata {
  /** The detected content type from the ContentType enum */
  type: ContentType;
  /** Programming language for code content (e.g., 'TypeScript', 'Python', 'JavaScript') */
  language?: string;
  /** Format of the content (e.g., 'markdown', 'code-block', 'plain-text', 'structured-text') */
  format: string;
  /** Content-specific patterns detected (e.g., ['function-definitions', 'import-statements']) */
  detected_patterns: string[];
  /** Confidence score from 0-1 for content type detection */
  confidence: number;
}

/**
 * Extended correction with content analysis metadata
 * Builds upon ClassifiedCorrection from Story 2-2
 *
 * @interface ContentAnalyzedCorrection
 * @extends ClassifiedCorrection
 * @property {ContentMetadata} content_metadata - Content type and format metadata
 * @property {string} normalized_correction - Content-normalized form for pattern extraction
 * @property {boolean} applicable_for_patterns - Whether this correction should feed pattern detection (always true for universal treatment)
 *
 * @example
 * ```typescript
 * const analyzed: ContentAnalyzedCorrection = {
 *   ...classifiedCorrection,
 *   content_metadata: { type: ContentType.CODE, language: 'TypeScript', ... },
 *   normalized_correction: 'use async/await instead',
 *   applicable_for_patterns: true
 * };
 * ```
 */
export interface ContentAnalyzedCorrection extends ClassifiedCorrection {
  /** Content type and format metadata */
  content_metadata: ContentMetadata;
  /** Content-normalized form optimized for pattern extraction */
  normalized_correction: string;
  /** Whether this correction should feed pattern detection (always true - equal treatment) */
  applicable_for_patterns: boolean;
}

/**
 * Summary statistics for content type distribution
 *
 * @interface ContentDistribution
 * @property {number} code_corrections - Count of code-related corrections
 * @property {number} documentation_corrections - Count of documentation-related corrections
 * @property {number} diagram_corrections - Count of diagram-related corrections
 * @property {number} prd_corrections - Count of PRD-related corrections
 * @property {number} test_plan_corrections - Count of test plan-related corrections
 * @property {number} general_corrections - Count of general text corrections
 */
export interface ContentDistribution {
  code_corrections: number;
  documentation_corrections: number;
  diagram_corrections: number;
  prd_corrections: number;
  test_plan_corrections: number;
  general_corrections: number;
}

/**
 * Complete content analysis result
 *
 * @interface ContentAnalysisResult
 * @property {number} total_corrections_analyzed - Total number of corrections processed
 * @property {Record<ContentType, number>} content_type_distribution - Count of corrections per content type
 * @property {ContentAnalyzedCorrection[]} analyzed_corrections - Array of analyzed corrections with metadata
 * @property {ContentDistribution} analysis_summary - Summary statistics by content type
 * @property {number} processing_time_ms - Time taken to analyze corrections (milliseconds)
 *
 * @example
 * ```typescript
 * const result: ContentAnalysisResult = {
 *   total_corrections_analyzed: 10,
 *   content_type_distribution: { [ContentType.CODE]: 5, [ContentType.DOCUMENTATION]: 3, ... },
 *   analyzed_corrections: [...],
 *   analysis_summary: { code_corrections: 5, documentation_corrections: 3, ... },
 *   processing_time_ms: 45
 * };
 * ```
 */
export interface ContentAnalysisResult {
  /** Total number of corrections processed */
  total_corrections_analyzed: number;
  /** Count of corrections per content type */
  content_type_distribution: Record<ContentType, number>;
  /** Array of analyzed corrections with full metadata */
  analyzed_corrections: ContentAnalyzedCorrection[];
  /** Summary statistics by content type */
  analysis_summary: ContentDistribution;
  /** Processing time in milliseconds */
  processing_time_ms: number;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ContentAnalysisErrorCode {
  CONTENT_TYPE_DETECTION_FAILED = 'CONTENT_TYPE_DETECTION_FAILED',
  NORMALIZATION_FAILED = 'NORMALIZATION_FAILED',
  PATTERN_EXTRACTION_FAILED = 'PATTERN_EXTRACTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: ContentAnalysisErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: ContentAnalysisErrorCode,
    originalError?: Error
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.code = code;
    this.originalError = originalError;

    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AR22Error);
    }

    this.name = 'AR22Error';
  }

  toString(): string {
    let output = `**${this.message}**\n\n`;
    output += `**What happened:** ${this.what}\n\n`;
    output += `**How to fix:**\n`;
    this.how.forEach((step, index) => {
      output += `${index + 1}. ${step}\n`;
    });
    output += `\n**Technical details:** ${this.technical}`;
    if (this.code) {
      output += ` (Error Code: ${this.code})`;
    }
    return output;
  }
}

// ============================================================================
// CONTENT TYPE DETECTION
// ============================================================================

/**
 * Compiled regex patterns for content type detection
 * Pre-compiled for O(1) performance during pattern matching
 */
const CONTENT_PATTERNS = {
  // Code detection patterns
  codeBlockMarkers: /```(\w+)?/g, // Keep global for match() usage
  functionDefinitions: /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|class\s+\w+/, // Removed global flag
  importStatements: /import\s+.*from|require\(/, // Removed global flag
  syntaxKeywords: /\b(if|else|for|while|return|const|let|var|async|await)\b/, // Removed global flag

  // Documentation detection patterns
  markdownHeaders: /^#{1,6}\s+/gm, // Keep global/multiline for match() usage
  markdownLists: /^\s*[-*+]\s+/gm, // Keep global/multiline for match() usage
  documentationKeywords: /\b(API|parameter|returns?|example|usage|description|type)\b/gi, // Keep case-insensitive for better matching

  // Diagram detection patterns
  mermaidSyntax: /```mermaid|graph\s+(?:TD|LR|RL|BT)|flowchart|sequenceDiagram/gi, // Keep case-insensitive
  diagramKeywords: /\b(flowchart|sequence|architecture|diagram|layout)\b/gi, // Keep case-insensitive
  asciiArt: /[=+\-|\/\\]{3,}/g, // Keep global for match() usage

  // PRD detection patterns
  prdStructure: /\b(User\s+Story|Functional\s+Requirement|Feature|Epic|Acceptance\s+Criteria)\b/gi, // Keep case-insensitive
  prdKeywords: /\b(FR\d*|NFR\d*|priority|scope|stakeholder)\b/gi, // Keep case-insensitive

  // Test plan detection patterns
  testStructure: /\b(Test\s+Case|Given|When|Then|Expected\s+Result|Assert)\b/gi, // Keep case-insensitive
  testKeywords: /\b(unit\s+test|integration\s+test|e2e\s+test|mock|stub|expect|assert)\b/gi, // Keep case-insensitive

  // Language detection for code (keep global for potential match() usage)
  languageMarkers: {
    typescript: /\b(interface\s+\w+|type\s+\w+|:\s*(string|number|boolean|void)|const\s+\w+:\s*\w+)\b/g,
    javascript: /\b(function\s+\w+|const\s+\w+\s*=|=>)\b/g,
    python: /\b(def\s+\w+|class\s+\w+|import\s+\w+|from\s+\S+\s+import)\b/g,
    java: /\b(public\s+(static\s+)?|private\s+|protected\s+)(class|void)\b/g,
  },
} as const;

/**
 * Detect content type with confidence scoring
 * Uses heuristic-based pattern matching for O(n) performance
 */
export function detectContentType(content: string): ContentMetadata {
  // Guard against empty or non-string input
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0,
    };
  }

  const patterns = CONTENT_PATTERNS;

  // Initialize scores
  let codeScore = 0;
  let documentationScore = 0;
  let diagramScore = 0;
  let prdScore = 0;
  let testPlanScore = 0;
  let detectedLanguage: string | undefined;

  // Code detection
  const codeBlocks = (content.match(patterns.codeBlockMarkers) || []).length;
  if (codeBlocks >= 2) codeScore += 3;
  if (patterns.functionDefinitions.test(content)) codeScore += 2;
  if (patterns.importStatements.test(content)) codeScore += 1;

  // Detect language if code (order matters - more specific patterns first)
  if (patterns.languageMarkers.typescript.test(content)) {
    detectedLanguage = 'TypeScript';
  } else if (patterns.languageMarkers.python.test(content)) {
    detectedLanguage = 'Python';
  } else if (patterns.languageMarkers.java.test(content)) {
    // Java pattern matches 'interface' and 'void', so check it after TypeScript
    detectedLanguage = 'Java';
  } else if (patterns.languageMarkers.javascript.test(content)) {
    detectedLanguage = 'JavaScript';
  }

  // Documentation detection
  const headers = (content.match(patterns.markdownHeaders) || []).length;
  const lists = (content.match(patterns.markdownLists) || []).length;
  if (headers >= 2) documentationScore += 2;
  if (lists >= 2) documentationScore += 1;
  if (patterns.documentationKeywords.test(content)) documentationScore += 1;

  // Diagram detection
  if (patterns.mermaidSyntax.test(content)) diagramScore += 4; // Strong signal
  if (patterns.diagramKeywords.test(content)) diagramScore += 2;
  if (patterns.asciiArt.test(content)) diagramScore += 1;

  // PRD detection
  if (patterns.prdStructure.test(content)) prdScore += 3;
  if (patterns.prdKeywords.test(content)) prdScore += 2;

  // Test plan detection
  if (patterns.testStructure.test(content)) testPlanScore += 3;
  if (patterns.testKeywords.test(content)) testPlanScore += 2;

  // Determine content type with highest confidence
  const scores = {
    code: codeScore,
    documentation: documentationScore,
    diagram: diagramScore,
    prd: prdScore,
    test_plan: testPlanScore,
  };

  const maxScore = Math.max(...Object.values(scores));

  // Confidence calculation (0-1)
  const confidence = maxScore >= 4 ? 0.9 : maxScore >= 2 ? 0.7 : maxScore >= 1 ? 0.5 : 0.3;

  // Determine content type and format
  let type: ContentType;
  let format: string;

  if (maxScore === 0) {
    type = ContentType.GENERAL_TEXT;
    format = 'plain-text';
  } else {
    // Find type with max score
    const maxType = Object.entries(scores).find(([_, score]) => score === maxScore)![0] as ContentType;
    type = maxType;

    // Determine format
    if (type === ContentType.CODE) {
      format = 'code-block';
    } else if (type === ContentType.DOCUMENTATION) {
      format = 'markdown';
    } else if (type === ContentType.DIAGRAM) {
      format = patterns.mermaidSyntax.test(content) ? 'mermaid' : 'text-description';
    } else if (type === ContentType.PRD || type === ContentType.TEST_PLAN) {
      format = 'structured-text';
    } else {
      format = 'plain-text';
    }
  }

  // Extract content-specific patterns
  const detected_patterns: string[] = [];
  if (type === ContentType.CODE) {
    if (patterns.functionDefinitions.test(content)) detected_patterns.push('function-definitions');
    if (patterns.importStatements.test(content)) detected_patterns.push('import-statements');
    if (codeBlocks > 0) detected_patterns.push('code-blocks');
  } else if (type === ContentType.DOCUMENTATION) {
    if (headers > 0) detected_patterns.push('markdown-headers');
    if (lists > 0) detected_patterns.push('markdown-lists');
    if (patterns.documentationKeywords.test(content)) detected_patterns.push('documentation-keywords');
  } else if (type === ContentType.DIAGRAM) {
    if (patterns.mermaidSyntax.test(content)) detected_patterns.push('mermaid-syntax');
    if (patterns.diagramKeywords.test(content)) detected_patterns.push('diagram-keywords');
    if (patterns.asciiArt.test(content)) detected_patterns.push('ascii-art');
  } else if (type === ContentType.PRD) {
    if (patterns.prdStructure.test(content)) detected_patterns.push('prd-structure');
    if (patterns.prdKeywords.test(content)) detected_patterns.push('prd-keywords');
  } else if (type === ContentType.TEST_PLAN) {
    if (patterns.testStructure.test(content)) detected_patterns.push('test-structure');
    if (patterns.testKeywords.test(content)) detected_patterns.push('test-keywords');
  }

  return {
    type,
    language: detectedLanguage,
    format,
    detected_patterns,
    confidence,
  };
}

// ============================================================================
// CONTENT NORMALIZATION
// ============================================================================()

/**
 * Normalize content for pattern extraction
 * Adapts normalization strategy based on content type
 */
export function normalizeContent(content: string, metadata: ContentMetadata): string {
  // Guard against invalid input
  if (!content || typeof content !== 'string') {
    return '';
  }

  try {
    let normalized = content;

    switch (metadata.type) {
      case ContentType.CODE:
        // Extract code from blocks, normalize indentation
        normalized = normalizeCodeContent(content, metadata);
        break;

      case ContentType.DOCUMENTATION:
        // Strip markdown formatting, preserve structure
        normalized = normalizeDocumentationContent(content);
        break;

      case ContentType.DIAGRAM:
        // Extract diagram descriptions, preserve structural keywords
        normalized = normalizeDiagramContent(content);
        break;

      case ContentType.PRD:
      case ContentType.TEST_PLAN:
        // Extract requirement statements, preserve structured content
        normalized = normalizeStructuredContent(content);
        break;

      case ContentType.GENERAL_TEXT:
      default:
        // Use as-is for pattern extraction
        normalized = content.trim();
        break;
    }

    return normalized;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new AR22Error(
      'Content normalization failed',
      {
        what: `Failed to normalize content of type ${metadata.type}`,
        how: [
          'Check if content format matches detected type',
          'Verify content is not malformed',
          'Review content for unsupported characters or encoding',
        ],
        technical: `Error: ${errorMessage}, Content type: ${metadata.type}, Format: ${metadata.format}`,
      },
      ContentAnalysisErrorCode.NORMALIZATION_FAILED,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Normalize code content for pattern extraction
 */
function normalizeCodeContent(content: string, metadata: ContentMetadata): string {
  // Guard against empty content
  if (!content || content.trim().length === 0) {
    return '';
  }

  // Extract code from markdown code blocks
  const codeBlockMatch = content.match(/```[\w]*\n([\s\S]+?)```/);
  let code = codeBlockMatch ? codeBlockMatch[1] : content;

  // Normalize indentation (remove leading/trailing whitespace)
  code = code.trim();

  // Preserve language-specific patterns
  if (metadata.language) {
    // Keep function signatures, class definitions, etc.
    // This maintains semantic meaning for pattern extraction
  }

  return code;
}

/**
 * Normalize documentation content for pattern extraction
 */
function normalizeDocumentationContent(content: string): string {
  // Guard against empty content
  if (!content || content.trim().length === 0) {
    return '';
  }

  let normalized = content;

  // Strip markdown formatting but preserve structure
  normalized = normalized.replace(/^#{1,6}\s+/gm, ''); // Remove headers
  normalized = normalized.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold
  normalized = normalized.replace(/\*([^*]+)\*/g, '$1'); // Remove italic
  normalized = normalized.replace(/`([^`]+)`/g, '$1'); // Remove inline code

  // Preserve structure indicators
  normalized = normalized.replace(/^\s*[-*+]\s+/gm, '• '); // Normalize list markers

  return normalized.trim();
}

/**
 * Normalize diagram content for pattern extraction
 */
function normalizeDiagramContent(content: string): string {
  // Guard against empty content
  if (!content || content.trim().length === 0) {
    return '';
  }

  let normalized = content;

  // Extract diagram descriptions
  normalized = normalized.replace(/```mermaid\n?/gi, '');
  normalized = normalized.replace(/```\n?/g, '');

  // Preserve structural keywords
  const diagramKeywords = ['graph', 'flowchart', 'sequence', 'architecture', 'layout'];
  diagramKeywords.forEach(keyword => {
    // Keep these keywords for pattern extraction
  });

  return normalized.trim();
}

/**
 * Normalize structured content (PRDs, test plans) for pattern extraction
 */
function normalizeStructuredContent(content: string): string {
  // Guard against empty content
  if (!content || content.trim().length === 0) {
    return '';
  }

  let normalized = content;

  // Remove table formatting but preserve content
  normalized = normalized.replace(/\|/g, ' '); // Remove table borders
  normalized = normalized.replace(/\s{2,}/g, ' '); // Normalize multiple spaces

  // Preserve requirement/test structure
  normalized = normalized.trim();

  return normalized;
}

// ============================================================================
// MAIN CONTENT ANALYZER CLASS
// ============================================================================()

/**
 * ContentAnalyzer class for universal content analysis
 * Works identically for all BMAD team members regardless of role
 *
 * Example usage:
 * ```typescript
 * const analyzer = new ContentAnalyzer();
 * const result = analyzer.analyzeCorrections(classifiedCorrections);
 * console.log(`Analyzed ${result.total_corrections_analyzed} corrections`);
 * console.log(`Content distribution:`, result.analysis_summary);
 * ```
 *
 * Features:
 * - Automatic content type detection (code, docs, diagrams, PRDs, test plans)
 * - Content normalization for pattern extraction
 * - Equal treatment of all content types
 * - No user role configuration required
 */
export class ContentAnalyzer {
  private analysisCount: number = 0;

  /**
   * Analyze a single classified correction for content type and normalization
   *
   * @param correction - A ClassifiedCorrection from Story 2-2
   * @returns ContentAnalyzedCorrection with content metadata and normalized text
   *
   * Example:
   * ```typescript
   * const analyzed = analyzer.analyzeCorrection(correction);
   * console.log(`Content type: ${analyzed.content_metadata.type}`);
   * console.log(`Language: ${analyzed.content_metadata.language}`);
   * ```
   */
  analyzeCorrection(correction: ClassifiedCorrection): ContentAnalyzedCorrection {
    // Validate input
    if (!correction || !correction.user_correction) {
      throw new AR22Error(
        'Invalid correction input',
        {
          what: 'Correction object is missing required fields',
          how: [
            'Ensure correction has user_correction field',
            'Check that correction comes from Story 2-2 classifier',
            'Verify ClassifiedCorrection interface is properly implemented',
          ],
          technical: 'Missing or invalid ClassifiedCorrection object',
        },
        ContentAnalysisErrorCode.INVALID_INPUT
      );
    }

    // Guard against non-string user_correction
    if (typeof correction.user_correction !== 'string') {
      throw new AR22Error(
        'Invalid user correction type',
        {
          what: 'user_correction field must be a string',
          how: [
            'Ensure user_correction is a string value',
            'Check that correction data is properly serialized',
            'Verify correction source provides string values',
          ],
          technical: `user_correction type: ${typeof correction.user_correction}, Expected: string`,
        },
        ContentAnalysisErrorCode.INVALID_INPUT
      );
    }

    // Detect content type from user correction
    const content_metadata = detectContentType(correction.user_correction);

    // Normalize content for pattern extraction
    const normalized_correction = normalizeContent(correction.user_correction, content_metadata);

    // Determine if applicable for pattern extraction
    // All corrections are considered applicable regardless of content type (role-agnostic)
    const applicable_for_patterns = true;

    this.analysisCount++;

    return {
      ...correction,
      content_metadata,
      normalized_correction,
      applicable_for_patterns,
    };
  }

  /**
   * Analyze multiple classified corrections
   * This is the main entry point for content analysis
   *
   * @param corrections - Array of ClassifiedCorrection objects from Story 2-2
   * @returns ContentAnalysisResult with statistics and analyzed corrections
   *
   * Example:
   * ```typescript
   * const result = analyzer.analyzeCorrections(corrections);
   * console.log(`Total: ${result.total_corrections_analyzed}`);
   * console.log(`Code: ${result.analysis_summary.code_corrections}`);
   * console.log(`Docs: ${result.analysis_summary.documentation_corrections}`);
   * ```
   *
   * All content types are treated equally with the same analysis quality.
   */
  analyzeCorrections(corrections: ClassifiedCorrection[]): ContentAnalysisResult {
    const startTime = Date.now();

    // Validate input
    if (!Array.isArray(corrections)) {
      throw new AR22Error(
        'Invalid corrections input',
        {
          what: 'Corrections must be an array of ClassifiedCorrection objects',
          how: [
            'Ensure input is an array',
            'Check that each element is a ClassifiedCorrection from Story 2-2',
            'Verify correction-classifier.ts is working correctly',
          ],
          technical: `Input type: ${typeof corrections}, Expected: array`,
        },
        ContentAnalysisErrorCode.INVALID_INPUT
      );
    }

    // Guard against null/undefined elements in array
    const validCorrections = corrections.filter(c => c != null);
    if (validCorrections.length !== corrections.length) {
      // Log warning but continue with valid corrections
    }

    // Analyze each correction
    const analyzed_corrections = validCorrections.map(correction => this.analyzeCorrection(correction));

    // Calculate content type distribution
    const content_type_distribution: Record<ContentType, number> = {
      [ContentType.CODE]: 0,
      [ContentType.DOCUMENTATION]: 0,
      [ContentType.DIAGRAM]: 0,
      [ContentType.PRD]: 0,
      [ContentType.TEST_PLAN]: 0,
      [ContentType.GENERAL_TEXT]: 0,
    };

    analyzed_corrections.forEach(correction => {
      content_type_distribution[correction.content_metadata.type]++;
    });

    // Build summary
    const analysis_summary: ContentDistribution = {
      code_corrections: content_type_distribution[ContentType.CODE],
      documentation_corrections: content_type_distribution[ContentType.DOCUMENTATION],
      diagram_corrections: content_type_distribution[ContentType.DIAGRAM],
      prd_corrections: content_type_distribution[ContentType.PRD],
      test_plan_corrections: content_type_distribution[ContentType.TEST_PLAN],
      general_corrections: content_type_distribution[ContentType.GENERAL_TEXT],
    };

    const processing_time_ms = Date.now() - startTime;

    return {
      total_corrections_analyzed: validCorrections.length,
      content_type_distribution,
      analyzed_corrections,
      analysis_summary,
      processing_time_ms,
    };
  }

  /**
   * Get the number of corrections analyzed by this instance
   */
  getAnalysisCount(): number {
    return this.analysisCount;
  }

  /**
   * Reset the analysis counter
   */
  resetAnalysisCount(): void {
    this.analysisCount = 0;
  }

  /**
   * Get content type distribution from analyzed corrections
   * All content types are treated equally for pattern extraction
   *
   * @param analyzedCorrections - Array of content-analyzed corrections
   * @returns Object with counts per content type
   *
   * Example:
   * ```typescript
   * const distribution = analyzer.getContentTypeDistribution(analyzedCorrections);
   * console.log(`Code corrections: ${distribution[ContentType.CODE]}`);
   * ```
   */
  getContentTypeDistribution(analyzedCorrections: ContentAnalyzedCorrection[]): Record<ContentType, number> {
    // Guard against null/undefined input
    if (!Array.isArray(analyzedCorrections)) {
      const distribution: Record<ContentType, number> = {
        [ContentType.CODE]: 0,
        [ContentType.DOCUMENTATION]: 0,
        [ContentType.DIAGRAM]: 0,
        [ContentType.PRD]: 0,
        [ContentType.TEST_PLAN]: 0,
        [ContentType.GENERAL_TEXT]: 0,
      };
      return distribution;
    }

    const distribution: Record<ContentType, number> = {
      [ContentType.CODE]: 0,
      [ContentType.DOCUMENTATION]: 0,
      [ContentType.DIAGRAM]: 0,
      [ContentType.PRD]: 0,
      [ContentType.TEST_PLAN]: 0,
      [ContentType.GENERAL_TEXT]: 0,
    };

    analyzedCorrections.forEach(correction => {
      // Guard against null/undefined elements
      if (correction && correction.content_metadata && correction.content_metadata.type) {
        distribution[correction.content_metadata.type]++;
      }
    });

    return distribution;
  }

  /**
   * Check if all content types are treated equally
   * This verifies the role-agnostic design principle
   *
   * @param analyzedCorrections - Array of content-analyzed corrections
   * @returns true if all corrections are marked as applicable for patterns
   *
   * Example:
   * ```typescript
   * const isEqual = analyzer.isEqualTreatment(analyzedCorrections);
   * console.log(`Equal treatment: ${isEqual}`);
   * ```
   */
  isEqualTreatment(analyzedCorrections: ContentAnalyzedCorrection[]): boolean {
    // Guard against null/undefined input
    if (!Array.isArray(analyzedCorrections) || analyzedCorrections.length === 0) {
      return true; // Empty array is trivially equal
    }

    return analyzedCorrections.every(correction => {
      // Guard against null/undefined elements
      return correction != null && correction.applicable_for_patterns === true;
    });
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================()

/**
 * Create a content analyzer instance with default settings
 * Convenience function for quick instantiation
 */
export function createContentAnalyzer(): ContentAnalyzer {
  return new ContentAnalyzer();
}

/**
 * Analyze corrections with a single function call
 * Convenience function that creates analyzer and processes in one step
 */
export function analyzeConversationContent(corrections: ClassifiedCorrection[]): ContentAnalysisResult {
  // Guard against null/undefined input
  if (!Array.isArray(corrections)) {
    throw new AR22Error(
      'Invalid corrections input',
      {
        what: 'Corrections must be an array of ClassifiedCorrection objects',
        how: [
          'Ensure input is an array',
          'Check that each element is a ClassifiedCorrection from Story 2-2',
        ],
        technical: `Input type: ${typeof corrections}, Expected: array`,
      },
      ContentAnalysisErrorCode.INVALID_INPUT
    );
  }

  const analyzer = new ContentAnalyzer();
  return analyzer.analyzeCorrections(corrections);
}