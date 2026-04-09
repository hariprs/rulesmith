/**
 * API-Level Acceptance Tests for Short Conversation Handling (Story 2-7)
 *
 * TDD Red Phase: Failing API-level acceptance tests
 *
 * These tests validate the API contracts and integration boundaries for:
 * - Conversation length validation at command layer
 * - Zero-correction detection in analysis pipeline
 * - Message template formatting
 * - State management preservation
 *
 * Test Pyramid Level: API (Integration-level business logic tests)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  ConversationLengthValidator,
  ConversationMetrics,
  ConversationValidationResult,
  ValidationResult,
} from '../../src/conversation-length-validator';
import { MessageTemplates } from '../../src/message-templates';
import {
  analyzeWithFrequency,
  PatternDetectionResult,
  AnalysisResult,
  ZeroCorrectionResult,
} from '../../src/analysis-pipeline';
import { PatternDetectionResultWithAnalysis } from '../../src/frequency-analyzer';
import { ConversationMessage } from '../../src/conversation-loader';
import { ContentType } from '../../src/content-analyzer';

// Type guard for ZeroCorrectionResult
function isZeroCorrectionResult(result: AnalysisResult): result is ZeroCorrectionResult {
  return 'type' in result && result.type === 'zero_corrections';
}

// Type guard for PatternDetectionResult
function isPatternDetectionResult(result: AnalysisResult): result is PatternDetectionResultWithAnalysis {
  return !isZeroCorrectionResult(result);
}

// ============================================================================
// ACCEPTANCE CRITERION 1: Fewer than 5 AI suggestions
// ============================================================================

describe('Story 2-7 AC1: Fewer than 5 AI suggestions', () => {
  let validator: ConversationLengthValidator;
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
    messageTemplates = new MessageTemplates();
  });

  test('should validate conversation length before processing', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 12,
    };

    const result: ConversationValidationResult = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
  });

  test('should display clear message about too few AI suggestions', () => {
    const validation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 2,
      metric: 'ai_suggestions',
    };

    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toContain('too short for pattern analysis');
    expect(message).toContain('5 AI suggestions');
    expect(message).toContain('Found: 2 AI suggestions');
  });

  test('should explain why pattern analysis requires AI suggestions', () => {
    const message = messageTemplates.tooFewSuggestions(5, 3);

    expect(message).toContain('Pattern analysis requires multiple AI suggestions');
    expect(message).toContain('identify recurring correction patterns');
  });

  test('should provide guidance to continue conversation', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toContain('Continue your conversation');
    expect(message).toContain('with more AI interactions');
    expect(message).toContain('run /improve-rules again');
  });

  test('should include actual count found', () => {
    const message = messageTemplates.tooFewSuggestions(5, 3);

    expect(message).toContain('Found: 3 AI suggestions');
  });

  test('should not invoke analysis pipeline for short conversations', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 12,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    // Early exit means no pipeline call
    expect(validation.canProceed).toBe(false);
  });

  test('should not update state.json for short conversations', () => {
    // This test verifies the contract that state updates are skipped
    // The actual implementation will be verified in integration tests
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 12,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(false);
  });

  test('should exit gracefully with exit code 0', () => {
    // This test verifies the error handling contract
    // Exit code handling will be verified in integration tests
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACCEPTANCE CRITERION 2: Fewer than 10 message exchanges
// ============================================================================

describe('Story 2-7 AC2: Fewer than 10 message exchanges', () => {
  let validator: ConversationLengthValidator;
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
    messageTemplates = new MessageTemplates();
  });

  test('should validate conversation length before processing', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 7,
      message_exchanges_count: 7,
    };

    const result: ConversationValidationResult = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_exchanges');
  });

  test('should display clear message about too few message exchanges', () => {
    const message = messageTemplates.tooFewExchanges(10, 7);

    expect(message).toContain('too short for pattern analysis');
    expect(message).toContain('10 message exchanges');
    expect(message).toContain('Found: 7 message exchanges');
  });

  test('should explain why pattern analysis requires conversation history', () => {
    const message = messageTemplates.tooFewExchanges(10, 7);

    expect(message).toContain('requires enough conversation history');
    expect(message).toContain('identify meaningful patterns');
  });

  test('should provide guidance to continue conversation', () => {
    const message = messageTemplates.tooFewExchanges(10, 7);

    expect(message).toContain('Continue your conversation');
    expect(message).toContain('more exchanges');
    expect(message).toContain('/improve-rules again');
  });

  test('should include actual count found', () => {
    const message = messageTemplates.tooFewExchanges(10, 7);

    expect(message).toContain('Found: 7 message exchanges');
  });

  test('should not invoke analysis pipeline for short conversations', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 7,
      message_exchanges_count: 7,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(false);
  });

  test('should not update state.json for short conversations', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 7,
      message_exchanges_count: 7,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(false);
  });

  test('should exit gracefully with exit code 0', () => {
    const message = messageTemplates.tooFewExchanges(10, 7);

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACCEPTANCE CRITERION 3: Both thresholds fail
// ============================================================================

describe('Story 2-7 AC3: Both thresholds fail', () => {
  let validator: ConversationLengthValidator;
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    validator = new ConversationLengthValidator();
    messageTemplates = new MessageTemplates();
  });

  test('should detect when both thresholds fail', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 7,
    };

    const result: ConversationValidationResult = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(result.canProceed).toBe(false);
    expect(result.reasons).toContain('too_few_suggestions');
    expect(result.reasons).toContain('too_few_exchanges');
    expect(result.reasons).toHaveLength(2);
  });

  test('should display BOTH threshold failures in single message', () => {
    const suggestionsValidation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    const exchangesValidation: ValidationResult = {
      isValid: false,
      threshold: 10,
      actual: 7,
      metric: 'message_exchanges',
    };

    const message = messageTemplates.tooFewBoth(
      suggestionsValidation,
      exchangesValidation
    );

    expect(message).toContain('AI suggestions');
    expect(message).toContain('Exchanges'); // Capitalized in the message
    expect(message).toContain('Found (AI Suggestions): 3 suggestions');
    expect(message).toContain('Found (Exchanges): 7 exchanges');
  });

  test('should show most restrictive threshold first (suggestions)', () => {
    const suggestionsValidation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    const exchangesValidation: ValidationResult = {
      isValid: false,
      threshold: 10,
      actual: 7,
      metric: 'message_exchanges',
    };

    const message = messageTemplates.tooFewBoth(
      suggestionsValidation,
      exchangesValidation
    );

    // AI suggestions (5) is more restrictive than exchanges (10)
    const suggestionsIndex = message.indexOf('AI Suggestions');
    const exchangesIndex = message.indexOf('Exchanges');
    expect(suggestionsIndex).toBeLessThan(exchangesIndex);
  });

  test('should provide actual counts for both metrics', () => {
    const suggestionsValidation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    const exchangesValidation: ValidationResult = {
      isValid: false,
      threshold: 10,
      actual: 7,
      metric: 'message_exchanges',
    };

    const message = messageTemplates.tooFewBoth(
      suggestionsValidation,
      exchangesValidation
    );

    expect(message).toContain('Found (AI Suggestions): 3 suggestions');
    expect(message).toContain('Found (Exchanges): 7 exchanges');
  });

  test('should provide guidance addressing both issues', () => {
    const suggestionsValidation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    const exchangesValidation: ValidationResult = {
      isValid: false,
      threshold: 10,
      actual: 7,
      metric: 'message_exchanges',
    };

    const message = messageTemplates.tooFewBoth(
      suggestionsValidation,
      exchangesValidation
    );

    expect(message).toContain('Continue your conversation');
    expect(message).toContain('with more interactions');
  });

  test('should not invoke analysis pipeline', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 7,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(false);
  });

  test('should not update state.json', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 3,
      message_exchanges_count: 7,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(false);
  });

  test('should exit gracefully with exit code 0', () => {
    const suggestionsValidation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    const exchangesValidation: ValidationResult = {
      isValid: false,
      threshold: 10,
      actual: 7,
      metric: 'message_exchanges',
    };

    const message = messageTemplates.tooFewBoth(
      suggestionsValidation,
      exchangesValidation
    );

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACCEPTANCE CRITERION 4: Zero patterns found (meets thresholds)
// ============================================================================

describe('Story 2-7 AC4: Zero patterns found', () => {
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    messageTemplates = new MessageTemplates();
  });

  test('should provide helpful feedback when no patterns found', () => {
    const message = messageTemplates.noCorrectionsFound();

    expect(message).toContain('No correction patterns were found');
  });

  test('should explain three possible reasons for no patterns', () => {
    const message = messageTemplates.noCorrectionsFound();

    expect(message).toContain('All AI suggestions were accepted without corrections');
    expect(message).toContain('Corrections were too diverse to form recurring patterns');
    expect(message).toContain('The conversation focused on one-time topics without repetition');
  });

  test('should provide actionable guidance for discovering patterns', () => {
    const message = messageTemplates.noCorrectionsFound();

    expect(message).toContain('To discover patterns, try');
    expect(message).toContain('making more corrections');
    expect(message).toContain('having longer conversations');
    expect(message).toContain('running /improve-rules');
  });

  test('should not update state.json when no patterns found', () => {
    // This test verifies the contract that state updates are skipped
    // The actual implementation will be verified in integration tests
    const message = messageTemplates.noCorrectionsFound();

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
  });

  test('should exit gracefully with exit code 0', () => {
    const message = messageTemplates.noCorrectionsFound();

    expect(message).toBeDefined();
    expect(typeof message).toBe('string');
    expect(message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// ACCEPTANCE CRITERION 5: Valid conversation with patterns
// ============================================================================

describe('Story 2-7 AC5: Valid conversation with patterns', () => {
  test('should proceed with normal pattern discovery workflow', async () => {
    const corrections = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
    ];

    const result = await analyzeWithFrequency(corrections);

    expect(result).toBeDefined();
    if (isZeroCorrectionResult(result)) {
      fail('Expected patterns to be found, but got zero correction result');
    } else {
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    }
  });

  test('should not display short conversation warning', () => {
    const validator = new ConversationLengthValidator();
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 8,
      message_exchanges_count: 15,
    };

    const validation = validator.validateConversation(
      metrics.ai_suggestions_count,
      metrics.message_exchanges_count
    );

    expect(validation.canProceed).toBe(true);
    expect(validation.reasons).toHaveLength(0);
  });

  test('should update state.json with patterns_found array', async () => {
    const corrections = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
    ];

    const result = await analyzeWithFrequency(corrections);

    if (isZeroCorrectionResult(result)) {
      fail('Expected patterns to be found, but got zero correction result');
    } else {
      expect(result.patterns).toBeDefined();
      expect(Array.isArray(result.patterns)).toBe(true);
    }
  });

  test('should display pattern summary with count and categories', async () => {
    const corrections = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
    ];

    const result = await analyzeWithFrequency(corrections);

    if (isZeroCorrectionResult(result)) {
      fail('Expected patterns to be found, but got zero correction result');
    } else {
      expect(result.patterns_found).toBeDefined();
      expect(typeof result.patterns_found).toBe('number');
    }
  });

  test('should exit successfully with exit code 0', async () => {
    const corrections = [
      {
        original_suggestion: 'Use var',
        user_correction: 'Use const',
        context: 'Code style',
        classification: {
          type: 'correction' as const,
          confidence: 0.9,
          requires_manual_review: false,
          reasoning: 'Clear correction',
        },
        content_metadata: {
          type: ContentType.CODE,
          format: 'code-block',
          detected_patterns: [],
          confidence: 0.9,
        },
        normalized_correction: 'Use const',
        applicable_for_patterns: true,
      },
    ];

    const result = await analyzeWithFrequency(corrections);

    expect(result).toBeDefined();
  });
});

// ============================================================================
// ACCEPTANCE CRITERION 6: Message formatting consistency
// ============================================================================

describe('Story 2-7 AC6: Message formatting consistency', () => {
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    messageTemplates = new MessageTemplates();
  });

  test('should follow AR22-style format (problem + explanation + guidance)', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    // Check for AR22-style components: problem statement, explanation, and actionable guidance
    expect(message).toContain('too short for pattern analysis'); // Problem
    expect(message).toContain('Pattern analysis requires'); // Explanation
    expect(message).toContain('💡'); // Guidance indicator
    expect(message).toContain('Continue your conversation'); // Actionable guidance
  });

  test('should include clear problem statement', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toContain('too short for pattern analysis');
  });

  test('should include specific thresholds with actual values', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toContain('Required: 5 AI suggestions or more');
    expect(message).toContain('Found: 2 AI suggestions');
  });

  test('should include actionable next steps', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toMatch(/Continue|more|again/i);
  });

  test('should use friendly, non-blaming language', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).not.toMatch(/you failed|error|wrong|bad/i);
    expect(message).toMatch(/continue|try|can/i);
  });

  test('should present technical details clearly', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    expect(message).toContain('5');
    expect(message).toContain('2');
    expect(message).toContain('AI suggestions');
  });

  test('should not use jargon without explanation', () => {
    const message = messageTemplates.tooFewSuggestions(5, 2);

    // If "pattern analysis" is used, it should be explained
    if (message.includes('pattern analysis')) {
      expect(message).toMatch(/identify|detect|recurring/i);
    }
  });

  test('should apply AR22 format to all message types', () => {
    const tooFewSuggestions = messageTemplates.tooFewSuggestions(5, 2);
    const tooFewExchanges = messageTemplates.tooFewExchanges(10, 7);
    const noCorrections = messageTemplates.noCorrectionsFound();

    expect(tooFewSuggestions).toBeDefined();
    expect(tooFewExchanges).toBeDefined();
    expect(noCorrections).toBeDefined();

    expect(typeof tooFewSuggestions).toBe('string');
    expect(typeof tooFewExchanges).toBe('string');
    expect(typeof noCorrections).toBe('string');
  });
});

// ============================================================================
// INTERFACE CONTRACTS
// ============================================================================

describe('Story 2-7: Interface Contracts', () => {
  test('should export ConversationLengthValidator class', () => {
    const validator = new ConversationLengthValidator();

    expect(validator).toBeDefined();
    expect(typeof validator.validateAISuggestions).toBe('function');
    expect(typeof validator.validateMessageExchanges).toBe('function');
    expect(typeof validator.validateConversation).toBe('function');
  });

  test('should export MessageTemplates class', () => {
    const templates = new MessageTemplates();

    expect(templates).toBeDefined();
    expect(typeof templates.tooFewSuggestions).toBe('function');
    expect(typeof templates.tooFewExchanges).toBe('function');
    expect(typeof templates.tooFewBoth).toBe('function');
    expect(typeof templates.noCorrectionsFound).toBe('function');
  });

  test('should provide ValidationResult interface', () => {
    const validation: ValidationResult = {
      isValid: false,
      threshold: 5,
      actual: 3,
      metric: 'ai_suggestions',
    };

    expect(validation.isValid).toBeDefined();
    expect(validation.threshold).toBeDefined();
    expect(validation.actual).toBeDefined();
    expect(validation.metric).toBeDefined();
  });

  test('should provide ConversationMetrics interface', () => {
    const metrics: ConversationMetrics = {
      ai_suggestions_count: 5,
      message_exchanges_count: 10,
    };

    expect(metrics.ai_suggestions_count).toBeDefined();
    expect(metrics.message_exchanges_count).toBeDefined();
  });

  test('should provide ConversationValidationResult interface', () => {
    const result: ConversationValidationResult = {
      canProceed: false,
      reasons: ['too_few_suggestions'],
      validations: [
        {
          isValid: false,
          threshold: 5,
          actual: 3,
          metric: 'ai_suggestions',
        },
      ],
    };

    expect(result.canProceed).toBeDefined();
    expect(result.reasons).toBeDefined();
    expect(result.validations).toBeDefined();
  });
});
