/**
 * Unit Tests for Conversation Length Validator (Story 2-7)
 *
 * TDD Red Phase: Failing unit tests for validation logic
 *
 * These tests validate the business logic for conversation length validation
 * including threshold checking, metrics counting, and error handling.
 *
 * Test Pyramid Level: Unit (Business Logic)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  ConversationLengthValidator,
  ValidationResult,
  ConversationValidationResult,
  ConversationMetrics,
  ConversationLengthValidatorError,
} from '../../src/conversation-length-validator';

// ============================================================================
// VALIDATION RESULT INTERFACE
// ============================================================================

describe('ConversationLengthValidator - ValidationResult Interface', () => {
  test('should export ValidationResult interface', () => {
    const result: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    expect(result.isValid).toBe(false);
    expect(result.threshold).toBe(5);
    expect(result.actual).toBe(3);
    expect(result.metric).toBe('ai_suggestions');
  });

  test('should export ConversationValidationResult interface', () => {
    const result: ConversationValidationResult = {
      canProceed: false,
      reasons: ['too_few_suggestions', 'too_few_exchanges'],
      validations: [
        {
          isValid: false,
          threshold: 5,
          actual: 3,
          metric: 'ai_suggestions',
        },
        {
          isValid: false,
          threshold: 10,
          actual: 7,
          metric: 'message_exchanges',
        },
      ],
    };

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toHaveLength(2);
    expect(result.validations).toHaveLength(2);
  });

  test('should export ConversationMetrics interface', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 8,
      message_exchanges_count: 15,
    };

    expect(metrics.ai_suggestions_count).toBe(8);
    expect(metrics.message_exchanges_count).toBe(15);
  });
});

// ============================================================================
// AI SUGGESTIONS VALIDATION
// ============================================================================

describe('ConversationLengthValidator - validateAISuggestions', () => {
  let validator: ConversationLengthValidator;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
  });

  test('should pass validation for exactly 5 AI suggestions', () => {
    const result = validator.validateAISuggestions(5);

    expect(result.isValid).toBe(true);
    expect(result.threshold).toBe(5);
    expect(result.actual).toBe(5);
    expect(result.metric).toBe('ai_suggestions');
  });

  test('should pass validation for more than 5 AI suggestions', () => {
    const result = validator.validateAISuggestions(10);

    expect(result.isValid).toBe(true);
    expect(result.threshold).toBe(5);
    expect(result.actual).toBe(10);
  });

  test('should fail validation for fewer than 5 AI suggestions', () => {
    const result = validator.validateAISuggestions(3);

    expect(result.isValid).toBe(false);
    expect(result.threshold).toBe(5);
    expect(result.actual).toBe(3);
    expect(result.metric).toBe('ai_suggestions');
  });

  test('should fail validation for zero AI suggestions', () => {
    const result = validator.validateAISuggestions(0);

    expect(result.isValid).toBe(false);
    expect(result.threshold).toBe(5);
    expect(result.actual).toBe(0);
  });

  test('should handle negative input gracefully', () => {
    const result = validator.validateAISuggestions(-1);

    expect(result.isValid).toBe(false);
    expect(result.actual).toBe(-1);
  });

  test('should handle decimal input', () => {
    const result = validator.validateAISuggestions(5.5);

    expect(result.isValid).toBe(true);
    expect(result.actual).toBe(5.5);
  });
});

// ============================================================================
// MESSAGE EXCHANGES VALIDATION
// ============================================================================

describe('ConversationLengthValidator - validateMessageExchanges', () => {
  let validator: ConversationLengthValidator;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
  });

  test('should pass validation for exactly 10 message exchanges', () => {
    const result = validator.validateMessageExchanges(10);

    expect(result.isValid).toBe(true);
    expect(result.threshold).toBe(10);
    expect(result.actual).toBe(10);
    expect(result.metric).toBe('message_exchanges');
  });

  test('should pass validation for more than 10 message exchanges', () => {
    const result = validator.validateMessageExchanges(15);

    expect(result.isValid).toBe(true);
    expect(result.threshold).toBe(10);
    expect(result.actual).toBe(15);
  });

  test('should fail validation for fewer than 10 message exchanges', () => {
    const result = validator.validateMessageExchanges(7);

    expect(result.isValid).toBe(false);
    expect(result.threshold).toBe(10);
    expect(result.actual).toBe(7);
    expect(result.metric).toBe('message_exchanges');
  });

  test('should fail validation for zero message exchanges', () => {
    const result = validator.validateMessageExchanges(0);

    expect(result.isValid).toBe(false);
    expect(result.threshold).toBe(10);
    expect(result.actual).toBe(0);
  });

  test('should handle negative input gracefully', () => {
    const result = validator.validateMessageExchanges(-1);

    expect(result.isValid).toBe(false);
    expect(result.actual).toBe(-1);
  });

  test('should handle decimal input', () => {
    const result = validator.validateMessageExchanges(10.5);

    expect(result.isValid).toBe(true);
    expect(result.actual).toBe(10.5);
  });
});

// ============================================================================
// CONVERSATION VALIDATION (COMBINED THRESHOLDS)
// ============================================================================

describe('ConversationLengthValidator - validateConversation', () => {
  let validator: ConversationLengthValidator;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
  });

  test('should pass when both thresholds are met', () => {
    const result = validator.validateConversation(5, 10);

    expect(result.canProceed).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.validations).toHaveLength(2);
    expect(result.validations[0].isValid).toBe(true);
    expect(result.validations[1].isValid).toBe(true);
  });

  test('should pass when both thresholds are exceeded', () => {
    const result = validator.validateConversation(10, 20);

    expect(result.canProceed).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  test('should fail when only AI suggestions threshold is met', () => {
    const result = validator.validateConversation(5, 7);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_exchanges');
    expect(result.reasons).not.toContain('too_few_suggestions');
    expect(result.validations[0].isValid).toBe(true); // Suggestions pass
    expect(result.validations[1].isValid).toBe(false); // Exchanges fail
  });

  test('should fail when only message exchanges threshold is met', () => {
    const result = validator.validateConversation(3, 10);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
    expect(result.reasons).not.toContain('too_few_exchanges');
    expect(result.validations[0].isValid).toBe(false); // Suggestions fail
    expect(result.validations[1].isValid).toBe(true); // Exchanges pass
  });

  test('should fail when both thresholds are not met (AND logic)', () => {
    const result = validator.validateConversation(3, 7);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
    expect(result.reasons).toContain('too_few_exchanges');
    expect(result.reasons).toHaveLength(2);
    expect(result.validations[0].isValid).toBe(false);
    expect(result.validations[1].isValid).toBe(false);
  });

  test('should fail for empty conversation (0, 0)', () => {
    const result = validator.validateConversation(0, 0);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
    expect(result.reasons).toContain('too_few_exchanges');
  });

  test('should include actual counts in validation results', () => {
    const result = validator.validateConversation(3, 7);

    expect(result.validations[0].actual).toBe(3);
    expect(result.validations[1].actual).toBe(7);
  });

  test('should include threshold values in validation results', () => {
    const result = validator.validateConversation(3, 7);

    expect(result.validations[0].threshold).toBe(5);
    expect(result.validations[1].threshold).toBe(10);
  });

  test('should handle boundary condition (5 suggestions, 9 exchanges)', () => {
    const result = validator.validateConversation(5, 9);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_exchanges');
    expect(result.reasons).not.toContain('too_few_suggestions');
  });

  test('should handle boundary condition (4 suggestions, 10 exchanges)', () => {
    const result = validator.validateConversation(4, 10);

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
    expect(result.reasons).not.toContain('too_few_exchanges');
  });

  test('should order reasons with most restrictive first (suggestions then exchanges)', () => {
    const result = validator.validateConversation(3, 7);

    expect(result.reasons[0]).toBe('too_few_suggestions');
    expect(result.reasons[1]).toBe('too_few_exchanges');
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

describe('ConversationLengthValidator - Error Handling', () => {
  test('should export ConversationLengthValidatorError', () => {
    const error = new ConversationLengthValidatorError(
      'Validation failed',
      {
        what: 'Test error',
        how: ['Fix it'],
        technical: 'Details',
      }
    );

    expect(error.message).toBe('Validation failed');
    expect(error.what).toBe('Test error');
    expect(error.how).toEqual(['Fix it']);
    expect(error.technical).toBe('Details');
  });

  test('should handle null input for validateAISuggestions', () => {
    const validator = new ConversationLengthValidator();

    expect(() => {
      validator.validateAISuggestions(null as unknown as number);
    }).toThrow(ConversationLengthValidatorError);
  });

  test('should handle undefined input for validateMessageExchanges', () => {
    const validator = new ConversationLengthValidator();

    expect(() => {
      validator.validateMessageExchanges(undefined as unknown as number);
    }).toThrow(ConversationLengthValidatorError);
  });

  test('should handle NaN input for validateConversation', () => {
    const validator = new ConversationLengthValidator();

    expect(() => {
      validator.validateConversation(NaN, NaN);
    }).toThrow(ConversationLengthValidatorError);
  });

  test('should provide AR22-compliant error messages', () => {
    const validator = new ConversationLengthValidator();

    try {
      validator.validateAISuggestions(null as unknown as number);
      fail('Expected error to be thrown');
    } catch (error) {
      if (error instanceof ConversationLengthValidatorError) {
        expect(error.what).toBeDefined();
        expect(error.how).toBeDefined();
        expect(Array.isArray(error.how)).toBe(true);
        expect(error.technical).toBeDefined();
      } else {
        fail(`Expected ConversationLengthValidatorError, got ${error}`);
      }
    }
  });
});

// ============================================================================
// CONFIGURATION AND CONSTANTS
// ============================================================================

describe('ConversationLengthValidator - Configuration', () => {
  test('should use configurable thresholds', () => {
    const customValidator = new ConversationLengthValidator({
      minAISuggestions: 3,
      minMessageExchanges: 5,
    });

    const result = customValidator.validateConversation(3, 5);

    expect(result.canProceed).toBe(true);
  });

  test('should default to standard thresholds when not configured', () => {
    const defaultValidator = new ConversationLengthValidator();

    const result = defaultValidator.validateConversation(5, 10);

    expect(result.canProceed).toBe(true);
  });

  test('should allow threshold configuration via constructor', () => {
    const validator = new ConversationLengthValidator({
      minAISuggestions: 8,
      minMessageExchanges: 15,
    });

    const suggestionsResult = validator.validateAISuggestions(7);
    const exchangesResult = validator.validateMessageExchanges(14);

    expect(suggestionsResult.isValid).toBe(false);
    expect(suggestionsResult.threshold).toBe(8);
    expect(exchangesResult.isValid).toBe(false);
    expect(exchangesResult.threshold).toBe(15);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('ConversationLengthValidator - Edge Cases', () => {
  let validator: ConversationLengthValidator;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
  });

  test('should handle very large numbers', () => {
    const result = validator.validateConversation(1000000, 1000000);

    expect(result.canProceed).toBe(true);
    expect(result.validations[0].actual).toBe(1000000);
    expect(result.validations[1].actual).toBe(1000000);
  });

  test('should handle decimal numbers', () => {
    const result = validator.validateConversation(5.1, 10.1);

    expect(result.canProceed).toBe(true);
  });

  test('should handle numbers at precision limits', () => {
    const result = validator.validateConversation(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER
    );

    expect(result.canProceed).toBe(true);
  });

  test('should handle Infinity', () => {
    const result = validator.validateConversation(Infinity, Infinity);

    expect(result.canProceed).toBe(true);
  });
});
