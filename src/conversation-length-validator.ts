/**
 * Conversation Length Validator (Story 2-7)
 *
 * Validates conversation length before pattern analysis to provide helpful feedback
 * when conversations are too short for meaningful pattern detection.
 *
 * Implements threshold validation:
 * - Minimum 5 AI suggestions (corrections to AI responses)
 * - Minimum 10 message exchanges (user-AI pairs)
 * - BOTH thresholds must pass (AND logic)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Result of validating a single metric (suggestions or exchanges)
 */
export interface ValidationResult {
  /** Whether the metric meets the minimum threshold */
  isValid: boolean;
  /** The minimum threshold value required */
  threshold: number;
  /** The actual value found in the conversation */
  actual: number;
  /** Which metric was validated */
  metric: 'ai_suggestions' | 'message_exchanges';
}

/**
 * Result of validating the entire conversation
 */
export interface ConversationValidationResult {
  /** Whether the conversation can proceed to analysis (both thresholds pass) */
  canProceed: boolean;
  /** Array of validation failures (empty if both pass) */
  reasons: ('too_few_suggestions' | 'too_few_exchanges')[];
  /** Individual validation results for each metric */
  validations: ValidationResult[];
}

/**
 * Conversation metrics counted from conversation data
 */
export interface ConversationMetrics {
  /** Number of AI suggestions (user corrections to AI responses) */
  ai_suggestions_count: number;
  /** Number of message exchanges (user-AI pairs) */
  message_exchanges_count: number;
}

/**
 * Configuration options for ConversationLengthValidator
 */
export interface ValidatorOptions {
  /** Minimum AI suggestions threshold (default: 5) */
  minAISuggestions?: number;
  /** Minimum message exchanges threshold (default: 10) */
  minMessageExchanges?: number;
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

/**
 * AR22-compliant error for validation failures
 */
export class ConversationLengthValidatorError extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string }
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.name = 'ConversationLengthValidatorError';

    // Capture current stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConversationLengthValidatorError);
    }
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_THRESHOLDS = {
  MIN_AI_SUGGESTIONS: 5,
  MIN_MESSAGE_EXCHANGES: 10,
} as const;

// ============================================================================
// VALIDATOR IMPLEMENTATION
// ============================================================================

/**
 * Validates conversation length for pattern analysis
 *
 * @example
 * ```typescript
 * const validator = new ConversationLengthValidator();
 * const result = validator.validateConversation(3, 7);
 * if (!result.canProceed) {
 *   console.log('Conversation too short');
 * }
 * ```
 */
export class ConversationLengthValidator {
  private readonly minAISuggestions: number;
  private readonly minMessageExchanges: number;

  constructor(options?: ValidatorOptions) {
    this.minAISuggestions = options?.minAISuggestions ?? DEFAULT_THRESHOLDS.MIN_AI_SUGGESTIONS;
    this.minMessageExchanges = options?.minMessageExchanges ?? DEFAULT_THRESHOLDS.MIN_MESSAGE_EXCHANGES;
  }

  /**
   * Validate AI suggestions count against threshold
   *
   * @param count - Number of AI suggestions found
   * @returns ValidationResult with threshold comparison
   */
  validateAISuggestions(count: number): ValidationResult {
    // Guard: Validate input - throw error for null/undefined as per tests
    if (count === null || count === undefined) {
      throw new ConversationLengthValidatorError(
        'Invalid AI suggestions count',
        {
          what: 'AI suggestions count cannot be null or undefined',
          how: [
            'Ensure count is a valid number',
            'Check that metrics counting succeeded',
            'Verify conversation data is valid',
          ],
          technical: `Received: ${count}, Expected: number`
        }
      );
    }

    // Guard: Validate input type
    const numValue = typeof count === 'number' ? count : Number(count);

    // Guard: Handle NaN
    if (isNaN(numValue)) {
      throw new ConversationLengthValidatorError(
        'Invalid AI suggestions count',
        {
          what: 'AI suggestions count is not a valid number (NaN)',
          how: [
            'Ensure count is a valid number',
            'Check metrics counting logic',
            'Verify conversation parsing',
          ],
          technical: `Received: ${count}, Result: NaN`
        }
      );
    }

    const actualCount = numValue;

    return {
      isValid: actualCount >= this.minAISuggestions,
      threshold: this.minAISuggestions,
      actual: actualCount,
      metric: 'ai_suggestions',
    };
  }

  /**
   * Validate message exchanges count against threshold
   *
   * @param count - Number of message exchanges found
   * @returns ValidationResult with threshold comparison
   */
  validateMessageExchanges(count: number): ValidationResult {
    // Guard: Validate input - throw error for null/undefined as per tests
    if (count === null || count === undefined) {
      throw new ConversationLengthValidatorError(
        'Invalid message exchanges count',
        {
          what: 'Message exchanges count cannot be null or undefined',
          how: [
            'Ensure count is a valid number',
            'Check that metrics counting succeeded',
            'Verify conversation data is valid',
          ],
          technical: `Received: ${count}, Expected: number`
        }
      );
    }

    // Guard: Validate input type
    const numValue = typeof count === 'number' ? count : Number(count);

    // Guard: Handle NaN
    if (isNaN(numValue)) {
      throw new ConversationLengthValidatorError(
        'Invalid message exchanges count',
        {
          what: 'Message exchanges count is not a valid number (NaN)',
          how: [
            'Ensure count is a valid number',
            'Check metrics counting logic',
            'Verify conversation parsing',
          ],
          technical: `Received: ${count}, Result: NaN`
        }
      );
    }

    const actualCount = numValue;

    return {
      isValid: actualCount >= this.minMessageExchanges,
      threshold: this.minMessageExchanges,
      actual: actualCount,
      metric: 'message_exchanges',
    };
  }

  /**
   * Validate entire conversation (both metrics)
   *
   * BOTH thresholds must pass (AND logic) for analysis to proceed.
   *
   * @param suggestions - Number of AI suggestions
   * @param exchanges - Number of message exchanges
   * @returns ConversationValidationResult with combined validation status
   */
  validateConversation(
    suggestions: number,
    exchanges: number
  ): ConversationValidationResult {
    // Validate each metric (will throw for invalid inputs as per tests)
    const suggestionsValidation = this.validateAISuggestions(suggestions);
    const exchangesValidation = this.validateMessageExchanges(exchanges);

    // Collect validation results
    const validations: ValidationResult[] = [
      suggestionsValidation,
      exchangesValidation,
    ];

    // Determine reasons for failure (if any)
    const reasons: ('too_few_suggestions' | 'too_few_exchanges')[] = [];
    if (!suggestionsValidation.isValid) {
      reasons.push('too_few_suggestions');
    }
    if (!exchangesValidation.isValid) {
      reasons.push('too_few_exchanges');
    }

    // BOTH thresholds must pass (AND logic)
    const canProceed = reasons.length === 0;

    return {
      canProceed,
      reasons,
      validations,
    };
  }

  /**
   * Validate conversation from metrics object
   *
   * Convenience method that accepts ConversationMetrics object
   *
   * @param metrics - Conversation metrics object with AI suggestions and message exchanges counts
   * @returns ConversationValidationResult with combined validation status
   *
   * @example
   * ```typescript
   * const metrics = countConversationMetrics(messages);
   * const result = validator.validateMetrics(metrics);
   * if (!result.canProceed) {
   *   console.log('Conversation too short');
   * }
   * ```
   */
  validateMetrics(metrics: ConversationMetrics): ConversationValidationResult {
    return this.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );
  }

  /**
   * Get the minimum thresholds (for testing/display purposes)
   */
  static getThresholds() {
    return { ...DEFAULT_THRESHOLDS };
  }
}
