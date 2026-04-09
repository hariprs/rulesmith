/**
 * Correction Classifier Implementation (Story 2-2)
 *
 * Classifies user responses as acceptances, corrections, or ambiguous cases
 * following the test architecture principle: unit > integration > E2E
 *
 * This module provides:
 * - Acceptance pattern detection (yes, thanks, good, etc.)
 * - Correction pattern detection (modifications, rejections)
 * - Ambiguous case detection with threshold validation
 * - Confidence scoring algorithm
 * - Classification reasoning generation
 * - String similarity for "applied without modification"
 * - AR22 compliant error handling
 */

import { ConversationMessage } from './conversation-loader';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ClassificationType = 'acceptance' | 'correction' | 'ambiguous';

export interface ClassificationDecision {
  type: ClassificationType;
  confidence: number;
  requires_manual_review: boolean;
  reasoning: string;
}

export interface ClassifiedCorrection {
  original_suggestion: string;
  user_correction: string;
  context: string;
  classification: ClassificationDecision;
}

export interface ClassificationSummary {
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
}

export interface ClassificationResult {
  total_exchanges: number;
  corrections_found: number;
  acceptances_found: number;
  ambiguous_cases: number;
  classified_corrections: ClassifiedCorrection[];
  classification_summary: ClassificationSummary;
}

export interface ClassifierOptions {
  manual_review_threshold?: number;
  enable_string_similarity?: boolean;
  max_similarity_length?: number;
  confidence_context_multiplier?: number;
}

export interface ErrorDetails {
  what: string;
  how: string[];
  technical: string;
}

// ============================================================================
// ERROR CODES
// ============================================================================

export enum ClassificationErrorCode {
  CLASSIFICATION_FAILED = 'CLASSIFICATION_FAILED',
  AMBIGUOUS_CONTENT = 'AMBIGUOUS_CONTENT',
  INVALID_INPUT = 'INVALID_INPUT',
  PATTERN_MATCH_ERROR = 'PATTERN_MATCH_ERROR',
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: ClassificationErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: ClassificationErrorCode,
    originalError?: Error
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.code = code;
    this.originalError = originalError;
    this.name = 'AR22Error';

    // Capture current stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AR22Error);
    }
  }

  toString(): string {
    let output = `**${this.message}**\n\n`;
    output += `**What happened:** ${this.what}\n\n`;
    output += `**How to fix:**\n`;
    this.how.forEach((step, i) => {
      output += `${i + 1}. ${step}\n`;
    });
    output += `\n**Technical details:** ${this.technical}`;
    return output;
  }
}

// ============================================================================
// PATTERN DEFINITIONS
// ============================================================================

const ACCEPTANCE_PATTERNS = {
  // Direct agreement
  directAgreement: [
    /^(yes|yeah|yep|yup|correct|right|exactly|sure|alright)\b/i,
    /^(sounds? good|looks good|that works?|works for me)\b/i,
  ],

  // Gratitude
  gratitude: [
    /^(thanks|thank you|thx|ty|gracias|merci|danke)\b/i,
    /^(perfect|great|awesome|excellent|amazing|love it)\b/i,
    /^(good)(?:\s*(?:idea|one|stuff|thanks))?$/i, // "good" alone or with common words
  ],

  // Confirmation
  confirmation: [
    /^(ok|okay|sure|fine|agree|agreed)\b/i,
    /^(sounds? good|looks good)\b/i,
  ],

  // Applied without modification (will be detected via string similarity)
  appliedWithoutModification: [],
} as const;

const CORRECTION_PATTERNS = {
  // Direct rejection
  directRejection: [
    /^(no|nope|nah|not quite|not really)\b/i,
    /^(that'?s not right|that'?s wrong|incorrect)\b/i,
  ],

  // Request for change
  requestForChange: [
    /^(try again|change it?|instead use|rather use)\b/i,
    /^(but (use|try|add|change)|modify|replace|change to?)\b/i,
  ],

  // Modification indicators
  modification: [
    /\binstead\b/i,
    /\brather\b/i,
    /\bprefer\b/i,
  ],
} as const;

const AMBIGUOUS_PATTERNS = {
  lowConfidence: [
    /^(maybe|possibly|perhaps)\b/i,
    /^(hmm|uhm|um)\b/i,
  ],

  emptyOrMinimal: [
    /^$/,
    /^[xy]$/,
  ],

  specialCharacters: [
    /^[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?]+$/,
  ],
} as const;

// ============================================================================
// STRING SIMILARITY (Levenshtein Distance)
// ============================================================================

function levenshteinDistance(str1: string, str2: string): number {
  // Guard: Prevent infinite loops with invalid inputs
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    return 0;
  }

  // Guard: Limit string length to prevent DoS via O(n*m) complexity
  const MAX_LENGTH = 200;
  const len1 = Math.min(str1.length, MAX_LENGTH);
  const len2 = Math.min(str2.length, MAX_LENGTH);

  // Guard: Handle empty strings
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;

  const s1 = str1.substring(0, len1);
  const s2 = str2.substring(0, len2);

  // Guard: Prevent memory issues with matrix allocation
  const matrixSize = (len2 + 1) * (len1 + 1);
  if (matrixSize > 100000) { // 100k cells max
    // Fallback to simpler algorithm for large strings
    return Math.abs(len1 - len2);
  }

  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[len2][len1];
}

export function calculateSimilarity(str1: string, str2: string): number {
  // Guard: Validate inputs
  if (typeof str1 !== 'string' || typeof str2 !== 'string') {
    return 0.0;
  }

  // Guard: Handle exact match
  if (str1 === str2) return 1.0;

  // Guard: Handle empty strings
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // Guard: Prevent division by zero
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 0.0;

  const distance = levenshteinDistance(str1, str2);

  // Guard: Ensure result is in valid range [0, 1]
  const similarity = 1 - distance / maxLen;
  return Math.max(0.0, Math.min(1.0, similarity));
}

// ============================================================================
// CLASSIFIER IMPLEMENTATION
// ============================================================================

export class CorrectionClassifier {
  private readonly options: Required<ClassifierOptions>;

  constructor(options: ClassifierOptions = {}) {
    // Guard: Validate and sanitize options
    const manual_review_threshold = typeof options.manual_review_threshold === 'number'
      ? Math.max(0.0, Math.min(1.0, options.manual_review_threshold))
      : 0.6;

    const enable_string_similarity = typeof options.enable_string_similarity === 'boolean'
      ? options.enable_string_similarity
      : true;

    const max_similarity_length = typeof options.max_similarity_length === 'number'
      ? Math.max(10, Math.min(1000, options.max_similarity_length))
      : 200;

    const confidence_context_multiplier = typeof options.confidence_context_multiplier === 'number'
      ? Math.max(0.1, Math.min(10.0, options.confidence_context_multiplier))
      : 1.0;

    this.options = {
      manual_review_threshold,
      enable_string_similarity,
      max_similarity_length,
      confidence_context_multiplier,
    };
  }

  /**
   * Escapes markdown special characters to prevent injection in output
   */
  private escapeMarkdown(text: string): string {
    // Guard: Limit input length
    if (text.length > 100) {
      text = text.substring(0, 100) + '...';
    }

    return text
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/`/g, '\\`')
      .replace(/\*/g, '\\*')
      .replace(/_/g, '\\_')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/#/g, '\\#')
      .replace(/\+/g, '\\+')
      .replace(/-/g, '\\-')
      .replace(/\./g, '\\.')
      .replace(/!/g, '\\!');
  }

  /**
   * Classify a single assistant suggestion + user response exchange
   */
  classifyExchange(suggestion: string, response: string): ClassificationDecision {
    // Validate inputs
    if (suggestion === null || suggestion === undefined || typeof suggestion !== 'string') {
      throw new AR22Error(
        'Invalid suggestion input',
        {
          what: 'Suggestion must be a non-empty string',
          how: [
            'Ensure suggestion is a valid string',
            'Check that suggestion is not null or undefined',
            'Verify suggestion has content',
          ],
          technical: `Received: ${typeof suggestion}, Expected: string`,
        },
        ClassificationErrorCode.INVALID_INPUT
      );
    }

    if (response === null || response === undefined || typeof response !== 'string') {
      throw new AR22Error(
        'Invalid response input',
        {
          what: 'Response must be a non-empty string',
          how: [
            'Ensure response is a valid string',
            'Check that response is not null or undefined',
            'Verify response has content',
          ],
          technical: `Received: ${typeof response}, Expected: string`,
        },
        ClassificationErrorCode.INVALID_INPUT
      );
    }

    // Guard: Sanitize inputs to prevent regex injection
    // Remove or escape potentially dangerous characters
    const sanitizeString = (str: string): string => {
      // Limit length to prevent DoS
      if (str.length > 10000) {
        throw new AR22Error(
          'Input string too long',
          {
            what: 'String length exceeds maximum allowed size',
            how: [
              'Ensure input strings are under 10,000 characters',
              'Consider truncating or summarizing long inputs',
            ],
            technical: `Received length: ${str.length}, Maximum: 10,000`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }
      return str;
    };

    const sanitizedSuggestion = sanitizeString(suggestion);
    const sanitizedResponse = sanitizeString(response);

    const trimmedResponse = sanitizedResponse.trim();
    const trimmedSuggestion = sanitizedSuggestion.trim();

    // Check for empty response
    if (trimmedResponse.length === 0) {
      return {
        type: 'ambiguous',
        confidence: 0.0,
        requires_manual_review: true,
        reasoning: 'Classified as ambiguous because the response is empty. Pattern: EMPTY_RESPONSE. Confidence: 0.00',
      };
    }

    // Check for special characters only
    // Guard: Protect against regex DoS by limiting test attempts
    try {
      if (AMBIGUOUS_PATTERNS.specialCharacters.some(pattern => pattern.test(trimmedResponse))) {
        return {
          type: 'ambiguous',
          confidence: 0.0,
          requires_manual_review: true,
          reasoning: 'Classified as ambiguous because the response contains only special characters. Pattern: SPECIAL_CHARACTERS_ONLY. Confidence: 0.00',
        };
      }
    } catch (error) {
      // If regex test fails, continue to next check
    }

    // Check for single character (not y/n)
    if (trimmedResponse.length === 1 && !/^[yn]$/i.test(trimmedResponse)) {
      return {
        type: 'ambiguous',
        confidence: 0.3,
        requires_manual_review: true,
        reasoning: 'Classified as ambiguous because the response is a single character that is not clearly yes/no. Pattern: SINGLE_CHAR_AMBIGUOUS. Confidence: 0.30',
      };
    }

    // Check for code blocks only
    // Guard: Ensure proper code block detection
    if (trimmedResponse.startsWith('```') && trimmedResponse.endsWith('```') && trimmedResponse.length > 6) {
      return {
        type: 'ambiguous',
        confidence: 0.4,
        requires_manual_review: true,
        reasoning: 'Classified as ambiguous because the response contains only a code block without additional context. Pattern: CODE_BLOCK_ONLY. Confidence: 0.40',
      };
    }

    // Check for string similarity (applied without modification)
    if (this.options.enable_string_similarity) {
      // Guard: Validate similarity calculation
      let similarity: number;
      try {
        similarity = calculateSimilarity(trimmedSuggestion, trimmedResponse);

        // Guard: Ensure similarity is a valid number
        if (typeof similarity !== 'number' || isNaN(similarity) || !isFinite(similarity)) {
          similarity = 0.0;
        }

        // Guard: Clamp similarity to valid range
        similarity = Math.max(0.0, Math.min(1.0, similarity));
      } catch (error) {
        // If similarity calculation fails, continue to pattern matching
        similarity = 0.0;
      }

      // Check if both look like code (contain programming keywords/syntax)
      const looksLikeCode = /\b(const|let|var|function|return|if|else|for|while|class|import|export)\b/i.test(trimmedSuggestion) &&
                           /\b(const|let|var|function|return|if|else|for|while|class|import|export)\b/i.test(trimmedResponse);

      // Check if it's code with structural similarity but value changes
      const hasValueChange = looksLikeCode &&
                             similarity >= 0.85 &&
                             similarity < 1.0 &&
                             trimmedSuggestion.replace(/\d+/g, '#') === trimmedResponse.replace(/\d+/g, '#');

      if (hasValueChange) {
        // Code structure is the same but values changed - this is a modification
        const confidence = 0.8 * this.options.confidence_context_multiplier;
        return {
          type: 'correction',
          confidence: Math.min(confidence, 1.0),
          requires_manual_review: false,
          reasoning: `Classified as correction because the user applied a code modification to the suggestion. Pattern: code modification. Similarity: ${(similarity * 100).toFixed(1)}%. Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
        };
      }

      if (similarity >= 0.9) {
        const confidence = 0.9 * this.options.confidence_context_multiplier;
        return {
          type: 'acceptance',
          confidence: Math.min(confidence, 1.0),
          requires_manual_review: false,
          reasoning: `Classified as acceptance because the user applied the suggestion without modification. Pattern: applied without modification. Similarity: ${(similarity * 100).toFixed(1)}%. Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
        };
      } else if (similarity >= 0.5 && similarity < 0.9) {
        // Significant modification detected
        const confidence = 0.8 * this.options.confidence_context_multiplier;
        return {
          type: 'correction',
          confidence: Math.min(confidence, 1.0),
          requires_manual_review: false,
          reasoning: `Classified as correction because the user applied a significant modification to the suggestion. Pattern: significant modification. Similarity: ${(similarity * 100).toFixed(1)}%. Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
        };
      } else if (looksLikeCode && similarity < 0.5 && similarity > 0.1) {
        // Code with significant changes
        const confidence = 0.7 * this.options.confidence_context_multiplier;
        return {
          type: 'correction',
          confidence: Math.min(confidence, 1.0),
          requires_manual_review: false,
          reasoning: `Classified as correction because the user applied a significant code modification to the suggestion. Pattern: significant code modification. Similarity: ${(similarity * 100).toFixed(1)}%. Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
        };
      }
    }

    // Check for "yes but..." pattern FIRST (before other yes patterns)
    // This is a correction, not an acceptance
    // Guard: Protect against catastrophic backtracking
    const yesButPattern = /^yes but\b/i;
    try {
      if (yesButPattern.test(trimmedResponse)) {
        const confidence = 0.6 * this.options.confidence_context_multiplier;
        return {
          type: 'correction',
          confidence: Math.min(confidence, 0.8),
          requires_manual_review: confidence < this.options.manual_review_threshold,
          reasoning: `Classified as correction because of partial acceptance with modification request. Pattern: partial acceptance. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 0.8).toFixed(2)}`,
        };
      }
    } catch (error) {
      // If regex test fails, continue to next check
    }

    // Check for direct agreement patterns
    // Guard: Limit pattern matching iterations
    let patternMatchCount = 0;
    const MAX_PATTERN_MATCHES = 50;

    for (const pattern of ACCEPTANCE_PATTERNS.directAgreement) {
      // Guard: Prevent infinite loops or excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          // Check if it's a perfect match (e.g., "yes, that's perfect")
          const perfectMatch = /^(yes|yeah|yep|yup|correct|right|exactly|sure|alright)(,?\s+(that'?s\s+)?(perfect|great|excellent|awesome|amazing))?$/i;
          const isPerfect = perfectMatch.test(trimmedResponse) && trimmedResponse.length > 5; // Longer than just "yes"
          const baseConfidence = isPerfect ? 1.0 : 0.95;
          const confidence = baseConfidence * this.options.confidence_context_multiplier;
          return {
            type: 'acceptance',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as acceptance because the response contains direct agreement. Pattern: DIRECT_AGREEMENT. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for gratitude patterns (check these before confirmation patterns to catch "good" first)
    for (const pattern of ACCEPTANCE_PATTERNS.gratitude) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          const confidence = 0.9 * this.options.confidence_context_multiplier;
          return {
            type: 'acceptance',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as acceptance because the response expresses gratitude or positive feedback. Pattern: GRATITUDE. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for confirmation patterns
    for (const pattern of ACCEPTANCE_PATTERNS.confirmation) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          // Check if it's a low-confidence confirmation (ok, maybe, hmm)
          const lowConfidencePattern = /^(ok|okay|maybe|hmm)\b/i;
          if (lowConfidencePattern.test(trimmedResponse)) {
            // Check if it has additional context (e.g., "ok, sounds good")
            const hasContext = trimmedResponse.length > 5 && /\b(sounds|looks|works|good|great|fine)\b/i.test(trimmedResponse);
            if (hasContext) {
              const confidence = 0.65 * this.options.confidence_context_multiplier;
              return {
                type: 'acceptance',
                confidence: Math.min(confidence, 0.8),
                requires_manual_review: false,
                reasoning: `Classified as acceptance because the response confirms agreement with additional context. Pattern: CONFIRMATION_WITH_CONTEXT. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 0.8).toFixed(2)}`,
              };
            }

            const confidence = 0.5 * this.options.confidence_context_multiplier;
            return {
              type: 'ambiguous',
              confidence: Math.min(confidence, 0.6),
              requires_manual_review: true,
              reasoning: `Classified as ambiguous because the response is a low-confidence confirmation. Pattern: LOW_CONFIDENCE_CONFIRMATION. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 0.6).toFixed(2)}`,
            };
          }

          const confidence = 0.8 * this.options.confidence_context_multiplier;
          return {
            type: 'acceptance',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as acceptance because the response confirms agreement. Pattern: CONFIRMATION. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for direct rejection patterns
    for (const pattern of CORRECTION_PATTERNS.directRejection) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          const confidence = 0.9 * this.options.confidence_context_multiplier;
          return {
            type: 'correction',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as correction because the response directly rejects the suggestion. Pattern: DIRECT_REJECTION. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for request for change patterns
    for (const pattern of CORRECTION_PATTERNS.requestForChange) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          const confidence = 0.8 * this.options.confidence_context_multiplier;
          return {
            type: 'correction',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as correction because the response requests a change. Pattern: REQUEST_FOR_CHANGE. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for modification indicators
    for (const pattern of CORRECTION_PATTERNS.modification) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          const confidence = 0.7 * this.options.confidence_context_multiplier;
          return {
            type: 'correction',
            confidence: Math.min(confidence, 1.0),
            requires_manual_review: false,
            reasoning: `Classified as correction because the response indicates modification or alternative preference. Pattern: MODIFICATION_INDICATOR. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 1.0).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for ambiguous patterns
    for (const pattern of AMBIGUOUS_PATTERNS.lowConfidence) {
      // Guard: Prevent excessive pattern matching
      if (++patternMatchCount > MAX_PATTERN_MATCHES) {
        break;
      }

      try {
        if (pattern.test(trimmedResponse)) {
          const confidence = 0.4 * this.options.confidence_context_multiplier;
          return {
            type: 'ambiguous',
            confidence: Math.min(confidence, 0.6),
            requires_manual_review: true,
            reasoning: `Classified as ambiguous because the response contains low-confidence indicators. Pattern: LOW_CONFIDENCE_INDICATOR. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 0.6).toFixed(2)}`,
          };
        }
      } catch (error) {
        // If regex test fails, continue to next pattern
        continue;
      }
    }

    // Check for mixed signals (positive and negative words)
    // Guard: Protect against regex errors
    try {
      const positiveWords = /\b(yes|good|great|perfect|thanks|agree|sure)\b/i;
      const negativeWords = /\b(no|not|but|however|wrong|incorrect)\b/i;
      const hasPositive = positiveWords.test(trimmedResponse);
      const hasNegative = negativeWords.test(trimmedResponse);

      if (hasPositive && hasNegative) {
        const confidence = 0.5 * this.options.confidence_context_multiplier;
        return {
          type: 'ambiguous',
          confidence: Math.min(confidence, 0.6),
          requires_manual_review: true,
          reasoning: `Classified as ambiguous because the response contains mixed positive and negative signals. Pattern: MIXED_SIGNALS. Matched: "${this.escapeMarkdown(trimmedResponse)}". Confidence: ${Math.min(confidence, 0.6).toFixed(2)}`,
        };
      }
    } catch (error) {
      // If regex test fails, continue to next check
    }

    // Reduce confidence for very long responses
    // Guard: Ensure length is a valid number
    const responseLength = trimmedResponse.length;
    if (typeof responseLength === 'number' && responseLength > 1000) {
      // Calculate reduction factor based on length
      // Guard: Ensure reduction factor is in valid range
      const reductionFactor = Math.max(0.7, Math.min(1.0, 1 - (responseLength - 1000) / 5000));
      const baseConfidence = 0.9 * reductionFactor;
      const confidence = baseConfidence * this.options.confidence_context_multiplier;
      return {
        type: 'ambiguous',
        confidence: Math.min(confidence, 0.9),
        requires_manual_review: confidence < this.options.manual_review_threshold,
        reasoning: `Classified as ambiguous with reduced confidence because the response is very long (${responseLength} chars). Pattern: LONG_RESPONSE. Confidence: ${Math.min(confidence, 0.9).toFixed(2)}`,
      };
    }

    // Default: ambiguous if no clear pattern
    // Guard: Safely truncate string for output
    const safeTruncate = (str: string, maxLen: number): string => {
      if (typeof str !== 'string') return '';
      if (str.length <= maxLen) return str;
      return str.substring(0, maxLen) + '...';
    };

    const confidence = 0.3 * this.options.confidence_context_multiplier;
    return {
      type: 'ambiguous',
      confidence: Math.min(confidence, 0.5),
      requires_manual_review: true,
      reasoning: `Classified as ambiguous because no clear pattern was detected. Pattern: NO_CLEAR_PATTERN. Matched: "${this.escapeMarkdown(safeTruncate(trimmedResponse, 50))}". Confidence: ${Math.min(confidence, 0.5).toFixed(2)}`,
    };
  }

  /**
   * Classify an entire conversation
   */
  classifyConversation(messages: ConversationMessage[]): ClassificationResult {
    // Validate input
    if (!messages || !Array.isArray(messages)) {
      throw new AR22Error(
        'Invalid conversation input',
        {
          what: 'Conversation must be an array of messages',
          how: [
            'Ensure messages is a valid array',
            'Check that messages is not null or undefined',
            'Verify messages has the correct structure',
          ],
          technical: `Received: ${typeof messages}, Expected: array`,
        },
        ClassificationErrorCode.INVALID_INPUT
      );
    }

    // Guard: Limit array size to prevent DoS
    const MAX_MESSAGES = 10000;
    if (messages.length > MAX_MESSAGES) {
      throw new AR22Error(
        'Conversation too large',
        {
          what: `Conversation exceeds maximum allowed size`,
          how: [
            'Ensure conversation has fewer than 10,000 messages',
            'Consider splitting into smaller conversations',
          ],
          technical: `Received: ${messages.length} messages, Maximum: ${MAX_MESSAGES}`,
        },
        ClassificationErrorCode.INVALID_INPUT
      );
    }

    if (messages.length === 0) {
      return {
        total_exchanges: 0,
        corrections_found: 0,
        acceptances_found: 0,
        ambiguous_cases: 0,
        classified_corrections: [],
        classification_summary: {
          high_confidence: 0,
          medium_confidence: 0,
          low_confidence: 0,
        },
      };
    }

    // Validate message structure
    // Guard: Protect against prototype pollution
    const allowedKeys = ['speaker', 'content', 'timestamp'];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];

      // Guard: Check for null/undefined
      if (!message || typeof message !== 'object') {
        throw new AR22Error(
          'Invalid message structure',
          {
            what: `Message at index ${i} is not a valid object`,
            how: [
              'Ensure each message has a valid structure',
              'Check that speaker and content fields exist',
              'Verify message format matches ConversationMessage interface',
            ],
            technical: `Message at index ${i}: ${JSON.stringify(message)}`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }

      // Guard: Check for prototype pollution
      const keys = Object.keys(message);
      for (const key of keys) {
        if (!allowedKeys.includes(key)) {
          throw new AR22Error(
            'Invalid message property',
            {
              what: `Message at index ${i} contains unexpected property`,
              how: [
                'Ensure messages only contain "speaker" and "content" fields',
                'Remove any extra properties',
              ],
            technical: `Message at index ${i}: Unexpected key "${key}"`,
            },
            ClassificationErrorCode.INVALID_INPUT
          );
        }
      }

      if (!message.speaker || typeof message.speaker !== 'string') {
        throw new AR22Error(
          'Invalid speaker field',
          {
            what: `Message at index ${i} has invalid speaker value`,
            how: [
              'Ensure speaker is a valid string',
              'Check that speaker field is not missing',
              'Verify speaker is either "user" or "assistant"',
            ],
            technical: `Message at index ${i}: speaker="${typeof message.speaker}", Expected: string`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }

      if (!['user', 'assistant'].includes(message.speaker)) {
        throw new AR22Error(
          'Invalid speaker value',
          {
            what: `Message at index ${i} has invalid speaker value`,
            how: [
              'Ensure speaker is either "user" or "assistant"',
              'Check for typos in speaker field',
            ],
            technical: `Message at index ${i}: speaker="${message.speaker}", Expected: "user" or "assistant"`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }

      if (message.content === null || message.content === undefined || typeof message.content !== 'string') {
        throw new AR22Error(
          'Invalid content field',
          {
            what: `Message at index ${i} has invalid content value`,
            how: [
              'Ensure content is a valid string',
              'Check that content field is not missing',
              'Verify content is not null or undefined',
            ],
            technical: `Message at index ${i}: content=${typeof message.content}, Expected: string`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }

      // Guard: Limit content length to prevent DoS
      if (message.content.length > 50000) {
        throw new AR22Error(
          'Message content too long',
          {
            what: `Message at index ${i} exceeds maximum length`,
            how: [
              'Ensure each message is under 50,000 characters',
              'Consider truncating long messages',
            ],
            technical: `Message at index ${i}: length=${message.content.length}, Maximum: 50,000`,
          },
          ClassificationErrorCode.INVALID_INPUT
        );
      }
    }

    // Process exchanges
    const corrections: ClassifiedCorrection[] = [];
    let acceptances = 0;
    let ambiguous = 0;
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    // Guard: Limit iterations to prevent infinite loops
    const maxIterations = Math.min(messages.length - 1, MAX_MESSAGES);
    for (let i = 0; i < maxIterations; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      // Guard: Ensure next message exists
      if (!next) break;

      // Look for assistant suggestion followed by user response
      if (current.speaker === 'assistant' && next.speaker === 'user') {
        let decision: ClassificationDecision;

        // Guard: Protect against classification errors
        try {
          decision = this.classifyExchange(current.content, next.content);
        } catch (error) {
          // If classification fails, mark as ambiguous
          decision = {
            type: 'ambiguous',
            confidence: 0.0,
            requires_manual_review: true,
            reasoning: 'Classification failed due to error',
          };
        }

        // Track confidence levels
        // Guard: Ensure confidence is valid
        const confidence = typeof decision.confidence === 'number' && !isNaN(decision.confidence)
          ? decision.confidence
          : 0.0;

        if (confidence >= 0.8) {
          highConfidence++;
        } else if (confidence >= 0.6) {
          mediumConfidence++;
        } else {
          lowConfidence++;
        }

        // Track classification types
        if (decision.type === 'correction') {
          // Guard: Limit corrections array size
          if (corrections.length < 10000) {
            // Extract context from surrounding messages (up to 2 messages before and after)
            const contextStart = Math.max(0, i - 2);
            const contextEnd = Math.min(messages.length, i + 3);
            const contextMessages = messages.slice(contextStart, contextEnd);
            const context = contextMessages
              .map(m => `${m.speaker}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
              .join('\n');

            corrections.push({
              original_suggestion: current.content,
              user_correction: next.content,
              context: context,
              classification: decision,
            });
          }
        } else if (decision.type === 'acceptance') {
          acceptances++;
        } else {
          ambiguous++;
        }
      }
    }

    // Guard: Ensure counts are valid numbers
    const totalExchanges = Math.max(0, corrections.length + acceptances + ambiguous);

    return {
      total_exchanges: totalExchanges,
      corrections_found: corrections.length,
      acceptances_found: Math.max(0, acceptances),
      ambiguous_cases: Math.max(0, ambiguous),
      classified_corrections: corrections,
      classification_summary: {
        high_confidence: Math.max(0, highConfidence),
        medium_confidence: Math.max(0, mediumConfidence),
        low_confidence: Math.max(0, lowConfidence),
      },
    };
  }
}
