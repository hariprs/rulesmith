/**
 * Data Sanitization Module (Story 3-5, AC5)
 *
 * Provides privacy and data sanitization for report generation.
 * Anonymizes sensitive information, detects PII, and validates content safety.
 *
 * @module visualization/sanitization
 */

import { PatternExample, Pattern } from '../pattern-detector';
import { MergedPattern } from '../pattern-matcher';
import { createVisualizationError, VisualizationErrorCode } from './types';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

/**
 * Sanitization configuration options
 *
 * @interface SanitizationConfig
 */
export interface SanitizationConfig {
  /** Whether to anonymize pattern examples (default: true) */
  anonymizeExamples?: boolean;
  /** Whether to include full sensitive content (default: false) */
  includeSensitive?: boolean;
  /** Custom sanitization rules */
  customRules?: SanitizationRule[];
  /** Whether to detect and redact PII (default: true) */
  redactPII?: boolean;
  /** Whether to validate for credentials (default: true) */
  validateCredentials?: boolean;
}

/**
 * Sanitization rule for pattern matching and replacement
 *
 * @interface SanitizationRule
 */
export interface SanitizationRule {
  /** Rule name for identification */
  name: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Replacement string or function */
  replacement: string | ((match: string) => string);
  /** Whether this rule is enabled */
  enabled?: boolean;
}

/**
 * Sanitization result with metadata
 *
 * @interface SanitizationResult
 */
export interface SanitizationResult {
  /** Sanitized content */
  sanitized: string;
  /** Whether any sanitization occurred */
  wasSanitized: boolean;
  /** Number of redactions made */
  redactionCount: number;
  /** Redacted patterns (for debugging) */
  redactedPatterns?: string[];
}

/**
 * Content validation result
 *
 * @interface ContentValidationResult
 */
export interface ContentValidationResult {
  /** Whether content is safe to include */
  isSafe: boolean;
  /** Security issues found */
  issues: SecurityIssue[];
  /** Whether content contains PII */
  containsPII: boolean;
  /** Whether content contains credentials */
  containsCredentials: boolean;
}

/**
 * Security issue detected in content
 *
 * @interface SecurityIssue
 */
export interface SecurityIssue {
  /** Issue type */
  type: 'PII' | 'CREDENTIALS' | 'SENSITIVE_DATA' | 'OTHER';
  /** Issue description */
  description: string;
  /** Location of issue (snippet) */
  location?: string;
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// DEFAULT SANITIZATION RULES
// ============================================================================

/**
 * Default PII patterns to detect and redact
 */
const DEFAULT_PII_PATTERNS: SanitizationRule[] = [
  {
    name: 'email',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[REDACTED_EMAIL]',
    enabled: true,
  },
  {
    name: 'phone',
    pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\+?1?[-.]?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}\b/g,
    replacement: '[REDACTED_PHONE]',
    enabled: true,
  },
  {
    name: 'ssn',
    pattern: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    replacement: '[REDACTED_SSN]',
    enabled: true,
  },
  {
    name: 'credit-card',
    pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
    replacement: '[REDACTED_CARD]',
    enabled: true,
  },
  {
    name: 'ip-address',
    pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
    replacement: '[REDACTED_IP]',
    enabled: true,
  },
  {
    name: 'url',
    pattern: /https?:\/\/[^\s<>"]+|www\.[^\s<>"]+/gi,
    replacement: '[REDACTED_URL]',
    enabled: true,
  },
];

/**
 * Default credential patterns to detect
 */
const CREDENTIAL_PATTERNS: SanitizationRule[] = [
  {
    name: 'api-key',
    pattern: /\b(api[_-]?key|apikey|access[_-]?token)\s*[:=]\s*['"]?[\w\-]+['"]?/gi,
    replacement: '[REDACTED_API_KEY]',
    enabled: true,
  },
  {
    name: 'password',
    pattern: /\b(password|passwd|pwd)\s*[:=]\s*['"]?[\w\-]+['"]?/gi,
    replacement: '[REDACTED_PASSWORD]',
    enabled: true,
  },
  {
    name: 'secret',
    pattern: /\b(secret|private[_-]?key|auth[_-]?token)\s*[:=]\s*['"]?[\w\-]+['"]?/gi,
    replacement: '[REDACTED_SECRET]',
    enabled: true,
  },
  {
    name: 'bearer-token',
    pattern: /\b(bearer\s+[\w\-\.]+|token\s+[:=]\s*['"]?[\w\-]+['"]?)/gi,
    replacement: '[REDACTED_TOKEN]',
    enabled: true,
  },
];

// ============================================================================
// SANITIZATION FUNCTIONS
// ============================================================================

/**
 * Sanitize a text string by applying sanitization rules
 *
 * @param text - Text to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitization result with metadata
 */
export function sanitizeText(
  text: string,
  config: SanitizationConfig = {}
): SanitizationResult {
  const {
    anonymizeExamples = true,
    redactPII = true,
    customRules = [],
  } = config;

  if (!anonymizeExamples) {
    return {
      sanitized: text,
      wasSanitized: false,
      redactionCount: 0,
    };
  }

  let sanitized = text;
  let redactionCount = 0;
  const redactedPatterns: string[][] = [];

  // Apply default PII patterns
  if (redactPII) {
    for (const rule of DEFAULT_PII_PATTERNS) {
      if (rule.enabled !== false) {
        const matches = sanitized.match(rule.pattern);
        if (matches) {
          redactionCount += matches.length;
          redactedPatterns.push(matches);
          sanitized = sanitized.replace(rule.pattern, rule.replacement as string);
        }
      }
    }
  }

  // Apply credential patterns (always redact for security)
  for (const rule of CREDENTIAL_PATTERNS) {
    if (rule.enabled !== false) {
      const matches = sanitized.match(rule.pattern);
      if (matches) {
        redactionCount += matches.length;
        redactedPatterns.push(matches);
        sanitized = sanitized.replace(rule.pattern, rule.replacement as string);
      }
    }
  }

  // Apply custom rules
  for (const rule of customRules) {
    if (rule.enabled !== false) {
      const matches = sanitized.match(rule.pattern);
      if (matches) {
        redactionCount += matches.length;
        if (redactedPatterns.length < 100) { // Limit stored patterns
          redactedPatterns.push(matches);
        }
        if (typeof rule.replacement === 'function') {
          sanitized = sanitized.replace(rule.pattern, rule.replacement);
        } else {
          sanitized = sanitized.replace(rule.pattern, rule.replacement);
        }
      }
    }
  }

  return {
    sanitized,
    wasSanitized: redactionCount > 0,
    redactionCount,
    redactedPatterns: redactedPatterns.flat(),
  };
}

/**
 * Sanitize a pattern example
 *
 * @param example - Pattern example to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized pattern example
 */
export function sanitizeExample(
  example: PatternExample,
  config: SanitizationConfig = {}
): PatternExample {
  const { includeSensitive = false } = config;

  // If user explicitly opts in to sensitive content, return as-is
  if (includeSensitive) {
    return example;
  }

  // Sanitize all text fields in the example
  const originalResult = sanitizeText(example.original_suggestion, config);
  const correctionResult = sanitizeText(example.user_correction, config);
  const contextResult = sanitizeText(example.context, config);

  return {
    ...example,
    original_suggestion: originalResult.sanitized,
    user_correction: correctionResult.sanitized,
    context: contextResult.sanitized,
  };
}

/**
 * Sanitize an array of pattern examples
 *
 * @param examples - Pattern examples to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized pattern examples
 */
export function sanitizeExamples(
  examples: PatternExample[],
  config: SanitizationConfig = {}
): PatternExample[] {
  return examples.map(example => sanitizeExample(example, config));
}

/**
 * Sanitize a pattern for report generation
 *
 * @param pattern - Pattern to sanitize (Pattern or MergedPattern)
 * @param config - Sanitization configuration
 * @returns Sanitized pattern
 */
export function sanitizePattern(
  pattern: Pattern | MergedPattern,
  config: SanitizationConfig = {}
): Pattern | MergedPattern {
  const { includeSensitive = false } = config;

  // If user explicitly opts in to sensitive content, return as-is
  if (includeSensitive) {
    return pattern;
  }

  // Sanitize pattern examples
  const sanitizedExamples = sanitizeExamples(pattern.examples || [], config);

  return {
    ...pattern,
    examples: sanitizedExamples,
  };
}

/**
 * Sanitize an array of patterns
 *
 * @param patterns - Patterns to sanitize
 * @param config - Sanitization configuration
 * @returns Sanitized patterns
 */
export function sanitizePatterns(
  patterns: (Pattern | MergedPattern)[],
  config: SanitizationConfig = {}
): (Pattern | MergedPattern)[] {
  return patterns.map(pattern => sanitizePattern(pattern, config));
}

// ============================================================================
// CONTENT VALIDATION
// ============================================================================

/**
 * Validate content for security issues
 *
 * @param content - Content to validate
 * @param config - Validation configuration
 * @returns Content validation result
 */
export function validateContent(
  content: string,
  config: SanitizationConfig = {}
): ContentValidationResult {
  const issues: SecurityIssue[] = [];
  let containsPII = false;
  let containsCredentials = false;

  // Check for PII
  for (const rule of DEFAULT_PII_PATTERNS) {
    if (rule.enabled !== false) {
      const matches = content.match(rule.pattern);
      if (matches) {
        containsPII = true;
        issues.push({
          type: 'PII',
          description: `Detected ${rule.name}: ${matches.length} occurrence(s)`,
          location: matches[0].substring(0, 50),
          severity: 'medium',
        });
      }
    }
  }

  // Check for credentials
  for (const rule of CREDENTIAL_PATTERNS) {
    if (rule.enabled !== false) {
      const matches = content.match(rule.pattern);
      if (matches) {
        containsCredentials = true;
        issues.push({
          type: 'CREDENTIALS',
          description: `Detected ${rule.name}: ${matches.length} occurrence(s)`,
          location: matches[0].substring(0, 50),
          severity: 'critical',
        });
      }
    }
  }

  // Check for other sensitive indicators
  const sensitiveKeywords = ['confidential', 'secret', 'private', 'internal only'];
  for (const keyword of sensitiveKeywords) {
    const pattern = new RegExp(`\\b${keyword}\\b`, 'gi');
    if (pattern.test(content)) {
      issues.push({
        type: 'SENSITIVE_DATA',
        description: `Possible sensitive content: contains "${keyword}"`,
        severity: 'low',
      });
    }
  }

  return {
    isSafe: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues,
    containsPII,
    containsCredentials,
  };
}

/**
 * Validate a pattern example for safety
 *
 * @param example - Pattern example to validate
 * @returns Content validation result
 */
export function validateExample(example: PatternExample): ContentValidationResult {
  // Validate all text fields and combine results
  const originalResult = validateContent(example.original_suggestion);
  const correctionResult = validateContent(example.user_correction);
  const contextResult = validateContent(example.context);

  // Combine all issues
  const allIssues = [
    ...originalResult.issues,
    ...correctionResult.issues,
    ...contextResult.issues,
  ];

  return {
    isSafe: allIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues: allIssues,
    containsPII: originalResult.containsPII || correctionResult.containsPII || contextResult.containsPII,
    containsCredentials: originalResult.containsCredentials || correctionResult.containsCredentials || contextResult.containsCredentials,
  };
}

/**
 * Validate a pattern for safety
 *
 * @param pattern - Pattern to validate
 * @returns Content validation result
 */
export function validatePattern(pattern: Pattern | MergedPattern): ContentValidationResult {
  const allIssues: SecurityIssue[] = [];
  let containsPII = false;
  let containsCredentials = false;

  // Validate pattern text
  const patternValidation = validateContent(pattern.pattern_text);
  allIssues.push(...patternValidation.issues);
  containsPII = containsPII || patternValidation.containsPII;
  containsCredentials = containsCredentials || patternValidation.containsCredentials;

  // Validate suggested rule
  const ruleValidation = validateContent(pattern.suggested_rule);
  allIssues.push(...ruleValidation.issues);
  containsPII = containsPII || ruleValidation.containsPII;
  containsCredentials = containsCredentials || ruleValidation.containsCredentials;

  // Validate examples
  if (pattern.examples) {
    for (const example of pattern.examples) {
      const exampleValidation = validateExample(example);
      allIssues.push(...exampleValidation.issues);
      containsPII = containsPII || exampleValidation.containsPII;
      containsCredentials = containsCredentials || exampleValidation.containsCredentials;
    }
  }

  return {
    isSafe: allIssues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues: allIssues,
    containsPII,
    containsCredentials,
  };
}

// ============================================================================
// PRIVACY NOTICE GENERATION
// ============================================================================

/**
 * Generate privacy notice for reports
 *
 * @param wasSanitized - Whether content was sanitized
 * @param redactionCount - Number of redactions made
 * @returns Privacy notice text
 */
export function generatePrivacyNotice(
  wasSanitized: boolean,
  redactionCount: number
): string {
  if (!wasSanitized) {
    return 'This report contains full, unsanitized content. Handle with care and do not distribute without proper authorization.';
  }

  return `This report has been sanitized for privacy. ${redactionCount} redaction(s) were made to protect sensitive information including emails, phone numbers, addresses, credentials, and other PII. Use --include-sensitive flag to generate reports with full content (not recommended for distribution).`;
}

/**
 * Generate privacy metadata for reports
 *
 * @param config - Sanitization configuration used
 * @param redactionCount - Number of redactions made
 * @returns Privacy metadata object
 */
export function generatePrivacyMetadata(
  config: SanitizationConfig,
  redactionCount: number
): Record<string, any> {
  return {
    sanitized: !config.includeSensitive,
    anonymizedExamples: config.anonymizeExamples !== false,
    redactionCount,
    piiRedacted: config.redactPII !== false,
    generatedAt: new Date().toISOString(),
    notice: generatePrivacyNotice(!config.includeSensitive, redactionCount),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a string looks like it contains sensitive data
 *
 * @param text - Text to check
 * @returns Whether text likely contains sensitive data
 */
export function likelyContainsSensitiveData(text: string): boolean {
  const sensitiveIndicators = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g, // SSN
    /\bapi[_-]?key\b/gi, // API key
    /\bpassword\b/gi, // Password
    /\bsecret\b/gi, // Secret
  ];

  for (const indicator of sensitiveIndicators) {
    if (indicator.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Create a safe excerpt from text for display
 *
 * @param text - Text to create excerpt from
 * @param maxLength - Maximum length of excerpt
 * @returns Safe excerpt with sensitive info redacted
 */
export function createSafeExcerpt(text: string, maxLength: number = 100): string {
  const sanitized = sanitizeText(text).sanitized;
  if (sanitized.length <= maxLength) {
    return sanitized;
  }
  return sanitized.substring(0, maxLength - 3) + '...';
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Throw error if content validation fails
 *
 * @param result - Content validation result
 * @param context - Context for error message
 * @throws Error if content is unsafe
 */
export function throwIfUnsafe(
  result: ContentValidationResult,
  context: string = 'content'
): void {
  if (!result.isSafe) {
    const criticalIssues = result.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      throw createVisualizationError(
        `Unsafe ${context} detected: ${criticalIssues.map(i => i.description).join(', ')}`,
        [
          'Review the content and remove sensitive information',
          'Use sanitization functions before generating reports',
          'Add custom sanitization rules if needed',
          'Use --include-sensitive flag only if you understand the risks',
        ],
        VisualizationErrorCode.INVALID_PATTERN_DATA,
        `Issues: ${JSON.stringify(result.issues, null, 2)}`
      );
    }
  }
}
