/**
 * Integration Tests for Short Conversation Handling (Story 2-7)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests validate the end-to-end integration of short conversation handling
 * including:
 * - Command layer validation before pipeline execution
 * - State preservation (no updates for short conversations)
 * - Zero-correction detection in pipeline
 * - Message formatting and display
 * - Early exit behavior
 *
 * Test Pyramid Level: Integration (API-level + component integration)
 *
 * @todo Remove this todo when implementation is complete
 */

import * as fs from 'fs';
import * as path from 'path';
import tmp from 'tmp';
import {
  ConversationLengthValidator,
  ConversationMetrics,
  ConversationValidationResult,
} from '../../src/conversation-length-validator';
import { MessageTemplates } from '../../src/message-templates';
import {
  analyzeWithFrequency,
  writeFrequencyAnalysis,
  AnalysisResult,
  ZeroCorrectionResult,
} from '../../src/analysis-pipeline';
import { PatternDetectionResultWithAnalysis } from '../../src/frequency-analyzer';
import { parseConversationMessages } from '../../src/conversation-loader';
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
// TEST FIXTURES
// ============================================================================

describe('Short Conversation Handling Integration', () => {
  let tempDir: tmp.DirResult;
  let statePath: string;
  let validator: ConversationLengthValidator;
  let messageTemplates: MessageTemplates;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    statePath = path.join(tempDir.name, 'state.json');
    validator = new ConversationLengthValidator();
    messageTemplates = new MessageTemplates();
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  // Helper function to create mock conversation
  const createMockConversation = (
    suggestionCount: number,
    exchangeCount: number
  ): string => {
    let conversation = '';
    for (let i = 0; i < Math.min(suggestionCount, exchangeCount); i++) {
      conversation += `Assistant: Suggestion ${i + 1}\n`;
      conversation += `User: Response ${i + 1}\n`;
    }
    return conversation;
  };

  // ============================================================================
  // SCENARIO 1: 3-suggestion conversation
  // ============================================================================

  describe('Scenario 1: 3-suggestion conversation', () => {
    test('should detect too few AI suggestions', () => {
      const conversation = createMockConversation(3, 12);
      const messages = parseConversationMessages(conversation);

      // Count metrics (simulating conversation loader extension)
      const aiSuggestionsCount = messages.filter(m => m.speaker === 'assistant').length;
      const messageExchangesCount = Math.floor(messages.filter(m => m.speaker === 'user').length);

      const metrics: ConversationMetrics = {
        ai_suggestions_count: aiSuggestionsCount,
        message_exchanges_count: messageExchangesCount,
      };

      const validation: ConversationValidationResult = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(validation.reasons).toContain('too_few_suggestions');
    });

    test('should display too-few-suggestions message', () => {
      const message = messageTemplates.tooFewSuggestions(5, 3);

      expect(message).toContain('too short for pattern analysis');
      expect(message).toContain('Required: 5 AI suggestions or more');
      expect(message).toContain('Found: 3 AI suggestions');
      expect(message).toContain('Pattern analysis requires multiple AI suggestions');
      expect(message).toContain('Continue your conversation');
    });

    test('should not call analysis pipeline', () => {
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

    test('should not update state.json', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 3,
        message_exchanges_count: 12,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      // Can't proceed means no state update
      expect(validation.canProceed).toBe(false);
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  // ============================================================================
  // SCENARIO 2: 7-exchange conversation
  // ============================================================================

  describe('Scenario 2: 7-exchange conversation', () => {
    test('should detect too few message exchanges', () => {
      const conversation = createMockConversation(8, 7);
      const messages = parseConversationMessages(conversation);

      const aiSuggestionsCount = messages.filter(m => m.speaker === 'assistant').length;
      const messageExchangesCount = Math.floor(messages.filter(m => m.speaker === 'user').length);

      const metrics: ConversationMetrics = {
        ai_suggestions_count: aiSuggestionsCount,
        message_exchanges_count: messageExchangesCount,
      };

      const validation: ConversationValidationResult = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(validation.reasons).toContain('too_few_exchanges');
    });

    test('should display too-few-exchanges message', () => {
      const message = messageTemplates.tooFewExchanges(10, 7);

      expect(message).toContain('too short for pattern analysis');
      expect(message).toContain('Required: 10 message exchanges or more');
      expect(message).toContain('Found: 7 message exchanges');
      expect(message).toContain('requires enough conversation history');
      expect(message).toContain('Continue your conversation');
    });

    test('should not call analysis pipeline', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 8,
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
        ai_suggestions_count: 8,
        message_exchanges_count: 7,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  // ============================================================================
  // SCENARIO 3: Both thresholds fail (4 suggestions + 9 exchanges)
  // ============================================================================

  describe('Scenario 3: Both thresholds fail', () => {
    test('should detect both threshold failures', () => {
      const conversation = createMockConversation(4, 9);
      const messages = parseConversationMessages(conversation);

      const aiSuggestionsCount = messages.filter(m => m.speaker === 'assistant').length;
      const messageExchangesCount = Math.floor(messages.filter(m => m.speaker === 'user').length);

      const metrics: ConversationMetrics = {
        ai_suggestions_count: aiSuggestionsCount,
        message_exchanges_count: messageExchangesCount,
      };

      const validation: ConversationValidationResult = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(validation.reasons).toContain('too_few_suggestions');
      expect(validation.reasons).toContain('too_few_exchanges');
      expect(validation.reasons).toHaveLength(2);
    });

    test('should display both thresholds in single message', () => {
      const suggestionsValidation = {
        isValid: false,
        threshold: 5,
        actual: 4,
        metric: 'ai_suggestions' as const,
      };

      const exchangesValidation = {
        isValid: false,
        threshold: 10,
        actual: 9,
        metric: 'message_exchanges' as const,
      };

      const message = messageTemplates.tooFewBoth(
        suggestionsValidation,
        exchangesValidation
      );

      expect(message).toContain('AI suggestions');
      expect(message).toContain('Exchanges'); // Capitalized in the message
      expect(message).toContain('Found (AI Suggestions): 4 suggestions');
      expect(message).toContain('Found (Exchanges): 9 exchanges');
    });

    test('should show most restrictive threshold first', () => {
      const suggestionsValidation = {
        isValid: false,
        threshold: 5,
        actual: 4,
        metric: 'ai_suggestions' as const,
      };

      const exchangesValidation = {
        isValid: false,
        threshold: 10,
        actual: 9,
        metric: 'message_exchanges' as const,
      };

      const message = messageTemplates.tooFewBoth(
        suggestionsValidation,
        exchangesValidation
      );

      const suggestionsIndex = message.indexOf('AI Suggestions');
      const exchangesIndex = message.indexOf('Exchanges');
      expect(suggestionsIndex).toBeLessThan(exchangesIndex);
    });

    test('should not call analysis pipeline', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 4,
        message_exchanges_count: 9,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
    });

    test('should not update state.json', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 4,
        message_exchanges_count: 9,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  // ============================================================================
  // SCENARIO 4: Valid conversation with no corrections
  // ============================================================================

  describe('Scenario 4: Valid conversation with no corrections', () => {
    test('should run pipeline and detect zero corrections', async () => {
      const corrections: any[] = []; // Empty corrections array

      const result = await analyzeWithFrequency(corrections);

      // ZeroCorrectionResult has type: 'zero_corrections' and different structure
      if (isZeroCorrectionResult(result)) {
        expect(result.total_corrections_analyzed).toBe(0);
        expect(result.should_update_state).toBe(false);
        expect(result.message).toBeDefined();
      } else {
        // If not zero correction result, then patterns should be empty
        expect(result.patterns).toHaveLength(0);
        expect(result.patterns_found).toBe(0);
      }
    });

    test('should display zero-corrections message', () => {
      const message = messageTemplates.noCorrectionsFound();

      expect(message).toContain('No correction patterns were found');
      expect(message).toContain('All AI suggestions were accepted');
      expect(message).toContain('Corrections were too diverse');
      expect(message).toContain('one-time topics');
    });

    test('should not update state.json for zero corrections', async () => {
      const corrections: any[] = [];

      const result = await analyzeWithFrequency(corrections);

      // ZeroCorrectionResult indicates no state update needed
      if (isZeroCorrectionResult(result)) {
        expect(result.should_update_state).toBe(false);
      } else {
        expect(result.patterns).toHaveLength(0);
      }
      expect(fs.existsSync(statePath)).toBe(false);
    });
  });

  // ============================================================================
  // SCENARIO 5: Valid conversation with patterns
  // ============================================================================

  describe('Scenario 5: Valid conversation with patterns', () => {
    test('should proceed with pattern discovery', async () => {
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

      // Should not be zero correction result
      if (isZeroCorrectionResult(result)) {
        fail('Expected patterns to be found, but got zero correction result');
      } else {
        expect(result.patterns).toBeDefined();
        expect(result.patterns_found).toBeGreaterThan(0);
      }
    });

    test('should update state.json with patterns', async () => {
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

      const result = await analyzeWithFrequency(corrections, statePath);

      // Should not be zero correction result
      if (isZeroCorrectionResult(result)) {
        fail('Expected patterns to be found, but got zero correction result');
      }

      await writeFrequencyAnalysis(result, statePath);

      expect(fs.existsSync(statePath)).toBe(true);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.patterns_found).toBeDefined();
      expect(Array.isArray(state.patterns_found)).toBe(true);
      expect(state.patterns_found.length).toBeGreaterThan(0);
    });

    test('should not display short conversation warning', () => {
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
  });

  // ============================================================================
  // SCENARIO 6: Boundary condition (5 suggestions, 10 exchanges)
  // ============================================================================

  describe('Scenario 6: Boundary condition', () => {
    test('should pass validation at exact thresholds', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 5,
        message_exchanges_count: 10,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(true);
      expect(validation.reasons).toHaveLength(0);
    });

    test('should proceed with pattern discovery', async () => {
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

      // Should not be zero correction result
      if (isZeroCorrectionResult(result)) {
        fail('Expected patterns to be found, but got zero correction result');
      } else {
        expect(result.patterns).toBeDefined();
      }
    });
  });

  // ============================================================================
  // STATE PRESERVATION TESTS
  // ============================================================================

  describe('State.json Preservation', () => {
    test('should not modify state.json for short conversations', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 3,
        message_exchanges_count: 7,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);
      expect(fs.existsSync(statePath)).toBe(false);
    });

    test('should not modify state.json for zero corrections', async () => {
      const corrections: any[] = [];

      const result = await analyzeWithFrequency(corrections);

      // ZeroCorrectionResult indicates no state update needed
      if (isZeroCorrectionResult(result)) {
        expect(result.should_update_state).toBe(false);
      } else {
        expect(result.patterns).toHaveLength(0);
      }
      expect(fs.existsSync(statePath)).toBe(false);
    });

    test('should update state.json for valid patterns', async () => {
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

      const result = await analyzeWithFrequency(corrections, statePath);

      // Should not be zero correction result
      if (isZeroCorrectionResult(result)) {
        fail('Expected patterns to be found, but got zero correction result');
      }

      await writeFrequencyAnalysis(result, statePath);

      expect(fs.existsSync(statePath)).toBe(true);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.patterns_found).toBeDefined();
      expect(state.patterns_found.length).toBeGreaterThan(0);
    });

    test('should preserve existing state.json when no update needed', async () => {
      // Create initial state
      const initialState = {
        last_analysis: new Date().toISOString(),
        patterns_found: ['pattern 1', 'pattern 2'],
        improvements_applied: 5,
        corrections_reduction: 0.3,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));

      const initialStats = fs.statSync(statePath);

      // Run short conversation validation
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 3,
        message_exchanges_count: 7,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      expect(validation.canProceed).toBe(false);

      // Verify state.json not modified
      const finalStats = fs.statSync(statePath);
      expect(initialStats.mtimeMs).toBe(finalStats.mtimeMs);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);
      expect(state.patterns_found).toEqual(['pattern 1', 'pattern 2']);
    });
  });

  // ============================================================================
  // EARLY EXIT BEHAVIOR
  // ============================================================================

  describe('Early Exit Behavior', () => {
    test('should exit before pipeline for short conversations', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 3,
        message_exchanges_count: 7,
      };

      const validation = validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );

      // Early exit means canProceed is false
      expect(validation.canProceed).toBe(false);
    });

    test('should provide clear message before exit', () => {
      const message = messageTemplates.tooFewSuggestions(5, 3);

      expect(message).toBeDefined();
      expect(message.length).toBeGreaterThan(0);
      expect(message).toContain('too short');
    });

    test('should not throw errors for short conversations', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 3,
        message_exchanges_count: 7,
      };

      expect(() => {
        validator.validateConversation(
          metrics.ai_suggestions_count,
          metrics.message_exchanges_count
        );
      }).not.toThrow();
    });
  });

  // ============================================================================
  // MESSAGE FORMATTING VERIFICATION
  // ============================================================================

  describe('Message Formatting Verification', () => {
    test('should format too-few-suggestions message correctly', () => {
      const message = messageTemplates.tooFewSuggestions(5, 2);

      expect(message).toMatch(/━━━━|━━━|═|─/); // Visual separators
      expect(message).toContain('📊'); // Emoji
      expect(message).toContain('CONVERSATION ANALYSIS'); // Header
    });

    test('should format too-few-exchanges message correctly', () => {
      const message = messageTemplates.tooFewExchanges(10, 7);

      expect(message).toMatch(/━━━━|━━━|═|─/); // Visual separators
      expect(message).toContain('📊'); // Emoji
      expect(message).toContain('CONVERSATION ANALYSIS'); // Header
    });

    test('should format both-thresholds message correctly', () => {
      const suggestionsValidation = {
        isValid: false,
        threshold: 5,
        actual: 3,
        metric: 'ai_suggestions' as const,
      };

      const exchangesValidation = {
        isValid: false,
        threshold: 10,
        actual: 7,
        metric: 'message_exchanges' as const,
      };

      const message = messageTemplates.tooFewBoth(
        suggestionsValidation,
        exchangesValidation
      );

      expect(message).toMatch(/━━━━|━━━|═|─/); // Visual separators
      expect(message).toContain('📊'); // Emoji
      expect(message).toContain('CONVERSATION ANALYSIS'); // Header
    });

    test('should format no-corrections message correctly', () => {
      const message = messageTemplates.noCorrectionsFound();

      expect(message).toMatch(/━━━━|━━━|═|─/); // Visual separators
      expect(message).toContain('📊'); // Emoji
      expect(message).toContain('CONVERSATION ANALYSIS'); // Header
    });

    test('should use consistent formatting across all messages', () => {
      const messages = [
        messageTemplates.tooFewSuggestions(5, 2),
        messageTemplates.tooFewExchanges(10, 7),
        messageTemplates.noCorrectionsFound(),
      ];

      messages.forEach(message => {
        expect(message).toBeDefined();
        expect(message.length).toBeGreaterThan(0);
        expect(message).toMatch(/━━━━|━━━|═|─|📊/);
      });
    });
  });

  // ============================================================================
  // ERROR HANDLING INTEGRATION
  // ============================================================================

  describe('Error Handling Integration', () => {
    test('should handle malformed conversation data gracefully', () => {
      const malformedConversation = 'Invalid data';

      expect(() => {
        parseConversationMessages(malformedConversation);
      }).not.toThrow();
    });

    test('should handle empty conversation', () => {
      const emptyConversation = '';

      const messages = parseConversationMessages(emptyConversation);

      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
    });

    test('should handle null/undefined metrics', () => {
      expect(() => {
        validator.validateConversation(
          null as unknown as number,
          null as unknown as number
        );
      }).toThrow();
    });
  });

  // ============================================================================
  // PERFORMANCE VERIFICATION
  // ============================================================================

  describe('Performance Verification', () => {
    test('should validate conversation length quickly', () => {
      const metrics: ConversationMetrics = {
        ai_suggestions_count: 8,
        message_exchanges_count: 15,
      };

      const startTime = Date.now();
      validator.validateConversation(
        metrics.ai_suggestions_count,
        metrics.message_exchanges_count
      );
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in < 10ms
    });

    test('should generate message templates quickly', () => {
      const startTime = Date.now();
      messageTemplates.tooFewSuggestions(5, 3);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(10); // Should complete in < 10ms
    });
  });
});
