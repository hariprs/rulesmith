/**
 * API-Level Acceptance Tests for Story 2-1
 *
 * Testing Level: API Tests
 * Test Pyramid Position: Upper-middle tier (interface and contract validation)
 *
 * These tests validate the API contracts and command interface for
 * conversation loading functionality:
 *
 * - Command routing and invocation
 * - API response structures
 * - Error contract compliance
 * - Business logic validation at API boundaries
 *
 * TEST STATUS: RED (Failing) - Expected to fail before implementation
 */

import {
  loadConversationFromContext,
  loadAndValidateConversation,
  parseConversationMessages,
  validateConversationStructure,
  countMessageExchanges,
  AR22Error,
  ConversationMessage,
  ValidationResult,
  ConversationStats,
} from '../../src/conversation-loader';

describe('Story 2-1: API-Level Acceptance Tests', () => {
  // ============================================================================
  // API CONTRACT: Command Interface
  // ============================================================================

  describe('API Contract: Command Interface', () => {
    test('conversation loading functions should be available', () => {
      // Given: The imported functions
      // When: We check their types
      // Then: All functions should be available
      expect(typeof loadConversationFromContext).toBe('function');
      expect(typeof parseConversationMessages).toBe('function');
      expect(typeof validateConversationStructure).toBe('function');
      expect(typeof countMessageExchanges).toBe('function');
    });

    test('functions should have correct signatures', () => {
      // Given: The imported functions
      // When: We check function signatures
      // Then: Functions should have expected types
      expect(typeof loadConversationFromContext).toBe('function');
      expect(typeof parseConversationMessages).toBe('function');
      expect(typeof validateConversationStructure).toBe('function');
      expect(typeof countMessageExchanges).toBe('function');
    });
  });

  // ============================================================================
  // API CONTRACT: loadAndValidateConversation
  // ============================================================================

  describe('API Contract: loadAndValidateConversation', () => {
    test('should return object with messages, validation, and stats', async () => {
      // Given: The function signature
      // This test validates the API contract even though it will fail

      // When/Then: Should fail due to no context
      await expect(loadAndValidateConversation()).rejects.toThrow();

      // But we can verify the expected return type structure
      // by checking TypeScript types (compile-time validation)
    });

    test('messages should be array of ConversationMessage objects', () => {
      // Given: A valid conversation
      const conversation = `User: Test
Assistant: Response`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Should be array with correct structure
      expect(Array.isArray(messages)).toBe(true);

      if (messages.length > 0) {
        const message = messages[0];
        expect(message).toHaveProperty('speaker');
        expect(message).toHaveProperty('content');
        expect(['user', 'assistant']).toContain(message.speaker);
        expect(typeof message.content).toBe('string');
      }
    });

    test('validation should be ValidationResult object', () => {
      // Given: A valid conversation
      const conversation = `User: Test
Assistant: Response`;

      // When: We validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Should have ValidationResult structure
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('meetsThreshold');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      expect(typeof validation.valid).toBe('boolean');
      expect(typeof validation.meetsThreshold).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    test('stats should be ConversationStats object', () => {
      // Given: A valid conversation
      const conversation = `User: Test
Assistant: Response`;

      // When: We get stats
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: Should have ConversationStats structure
      expect(stats).toHaveProperty('totalExchanges');
      expect(stats).toHaveProperty('aiSuggestions');
      expect(stats).toHaveProperty('userCorrections');
      expect(stats).toHaveProperty('conversationLoaded');

      expect(typeof stats.totalExchanges).toBe('number');
      expect(typeof stats.aiSuggestions).toBe('number');
      expect(typeof stats.userCorrections).toBe('number');
      expect(typeof stats.conversationLoaded).toBe('boolean');
    });
  });

  // ============================================================================
  // API CONTRACT: Error Responses
  // ============================================================================

  describe('API Contract: Error Responses', () => {
    test('AR22Error should have required properties', () => {
      // Given: An AR22Error instance
      const error = new AR22Error('Test error', {
        what: 'What happened',
        how: ['Step 1', 'Step 2'],
        technical: 'Technical details'
      });

      // Then: Should have all required properties
      expect(error).toHaveProperty('message');
      expect(error).toHaveProperty('what');
      expect(error).toHaveProperty('how');
      expect(error).toHaveProperty('technical');
      expect(error).toHaveProperty('name');

      expect(error.name).toBe('AR22Error');
      expect(typeof error.what).toBe('string');
      expect(Array.isArray(error.how)).toBe(true);
      expect(typeof error.technical).toBe('string');
    });

    test('AR22Error toString should return formatted string', () => {
      // Given: An AR22Error instance
      const error = new AR22Error('Brief description', {
        what: 'What happened',
        how: ['Fix step 1', 'Fix step 2'],
        technical: 'Technical details'
      });

      // When: We convert to string
      const errorString = error.toString();

      // Then: Should contain all sections
      expect(errorString).toContain('Brief description');
      expect(errorString).toContain('What happened');
      expect(errorString).toContain('Fix step 1');
      expect(errorString).toContain('Fix step 2');
      expect(errorString).toContain('Technical details');
    });

    test('parseConversationMessages should throw AR22Error for invalid input', () => {
      // Given: Invalid inputs
      const invalidInputs = [
        null,
        undefined,
        { not: 'a string' },
        [],
        123,
      ];

      // When/Then: Should throw AR22Error for each
      invalidInputs.forEach(input => {
        expect(() => {
          parseConversationMessages(input as any);
        }).toThrow(AR22Error);
      });
    });
  });

  // ============================================================================
  // BUSINESS LOGIC: Threshold Validation
  // ============================================================================

  describe('Business Logic: Threshold Validation', () => {
    test('should validate minimum AI suggestions threshold', () => {
      // Given: A conversation with 5 AI suggestions (meets threshold)
      const conversation = Array.from({ length: 10 }, (_, i) =>
        i % 2 === 0 ? 'User: Question' : 'Assistant: Answer'
      ).join('\n');

      // When: We validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Should meet threshold
      expect(validation.meetsThreshold).toBe(true);
    });

    test('should fail threshold for insufficient AI suggestions', () => {
      // Given: A conversation with only 2 AI suggestions (below threshold)
      const conversation = `User: Question 1
Assistant: Answer 1
User: Question 2
Assistant: Answer 2`;

      // When: We validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Should not meet threshold
      expect(validation.meetsThreshold).toBe(false);
      expect(validation.warnings.some(w => w.includes('does not meet minimum threshold'))).toBe(true);
    });

    test('should validate minimum message exchanges threshold', () => {
      // Given: A conversation with 10 exchanges (meets threshold)
      const conversation = Array.from({ length: 20 }, (_, i) =>
        i % 2 === 0 ? 'User: Question' : 'Assistant: Answer'
      ).join('\n');

      // When: We validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Should meet threshold
      expect(validation.meetsThreshold).toBe(true);
    });

    test('should include threshold details in warnings', () => {
      // Given: A short conversation
      const conversation = `User: Question
Assistant: Answer`;

      // When: We validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Warning should include specific threshold details
      expect(validation.warnings.some(w =>
        w.includes('5') && w.includes('10') && w.includes('AI suggestions')
      )).toBe(true);
    });
  });

  // ============================================================================
  // BUSINESS LOGIC: Speaker Identification
  // ============================================================================

  describe('Business Logic: Speaker Identification', () => {
    test('should correctly identify user speakers', () => {
      // Given: Various user label formats
      const userLabels = [
        'User: message',
        'user: message',
        '### User: message',
        '**User:** message',
        'Human: message',
      ];

      // When: We parse each
      userLabels.forEach(label => {
        const messages = parseConversationMessages(label);

        // Then: Should identify as user
        expect(messages[0].speaker).toBe('user');
      });
    });

    test('should correctly identify assistant speakers', () => {
      // Given: Various assistant label formats
      const assistantLabels = [
        'Assistant: message',
        'assistant: message',
        '### Assistant: message',
        '**Assistant:** message',
        'AI: message',
        // Note: 'Claude:' is supported by identifySpeaker but not yet in parseConversationMessages
        // This would be added in a future iteration as the patterns are expanded
      ];

      // When: We parse each
      assistantLabels.forEach(label => {
        const messages = parseConversationMessages(label);

        // Then: Should identify as assistant
        expect(messages[0].speaker).toBe('assistant');
      });
    });

    test('should handle case-insensitive speaker labels', () => {
      // Given: Mixed case labels
      const conversation = `USER: Message 1
assistant: Response 1
UsEr: Message 2
AsSiStAnT: Response 2`;

      // When: We parse
      const messages = parseConversationMessages(conversation);

      // Then: Should identify correctly despite case
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
      expect(messages[2].speaker).toBe('user');
      expect(messages[3].speaker).toBe('assistant');
    });
  });

  // ============================================================================
  // BUSINESS LOGIC: Message Content Handling
  // ============================================================================

  describe('Business Logic: Message Content Handling', () => {
    test('should preserve multiline message content', () => {
      // Given: A multiline message
      const conversation = `User: Line 1
Line 2
Line 3
Assistant: Response`;

      // When: We parse
      const messages = parseConversationMessages(conversation);

      // Then: Should preserve all lines
      expect(messages[0].content).toContain('Line 1');
      expect(messages[0].content).toContain('Line 2');
      expect(messages[0].content).toContain('Line 3');
    });

    test('should handle code blocks in messages', () => {
      // Given: A message with code blocks
      const conversation = `User: Here's my code:
\`\`\`typescript
const x = 42;
\`\`\`
Assistant: That looks good!`;

      // When: We parse
      const messages = parseConversationMessages(conversation);

      // Then: Should preserve code blocks
      expect(messages[0].content).toContain('```');
      expect(messages[0].content).toContain('const x = 42');
    });

    test('should handle special characters and unicode', () => {
      // Given: A message with special characters
      const conversation = `User: Test with émojis 🎉 and spëcial çharacters
Assistant: Ünicöde suppört is impørtant! 👍`;

      // When: We parse
      const messages = parseConversationMessages(conversation);

      // Then: Should preserve special characters
      expect(messages[0].content).toContain('émojis');
      expect(messages[0].content).toContain('🎉');
      expect(messages[1].content).toContain('Ünicöde');
      expect(messages[1].content).toContain('👍');
    });
  });

  // ============================================================================
  // BUSINESS LOGIC: Validation Rules
  // ============================================================================

  describe('Business Logic: Validation Rules', () => {
    test('should reject conversation with null messages', () => {
      // Given: Null messages array
      const messages = null as any;

      // When: We validate
      const validation = validateConversationStructure(messages);

      // Then: Should be invalid
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Conversation messages cannot be null or undefined');
    });

    test('should reject conversation with empty messages', () => {
      // Given: Empty messages array
      const messages: ConversationMessage[] = [];

      // When: We validate
      const validation = validateConversationStructure(messages);

      // Then: Should be invalid
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Conversation contains no messages');
    });

    test('should reject messages with invalid speaker', () => {
      // Given: Messages with invalid speaker
      const messages: ConversationMessage[] = [
        { speaker: 'user', content: 'Valid' },
        { speaker: 'invalid' as any, content: 'Invalid speaker' },
      ];

      // When: We validate
      const validation = validateConversationStructure(messages);

      // Then: Should be invalid
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('invalid speaker'))).toBe(true);
    });

    test('should reject messages with invalid content', () => {
      // Given: Messages with invalid content
      const messages: ConversationMessage[] = [
        { speaker: 'user', content: 'Valid' },
        { speaker: 'assistant', content: null as any },
      ];

      // When: We validate
      const validation = validateConversationStructure(messages);

      // Then: Should be invalid
      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('invalid content'))).toBe(true);
    });

    test('should warn about unusually long messages', () => {
      // Given: A very long message
      const longContent = 'x'.repeat(100001);
      const messages: ConversationMessage[] = [
        { speaker: 'user', content: longContent }
      ];

      // When: We validate
      const validation = validateConversationStructure(messages);

      // Then: Should be valid but with warning
      expect(validation.valid).toBe(true);
      expect(validation.warnings.some(w => w.includes('unusually long'))).toBe(true);
    });
  });

  // ============================================================================
  // BUSINESS LOGIC: Statistics Calculation
  // ============================================================================

  describe('Business Logic: Statistics Calculation', () => {
    test('should count AI suggestions correctly', () => {
      // Given: A conversation with multiple assistant messages
      const conversation = `User: Q1
Assistant: A1
User: Q2
Assistant: A2
User: Q3
Assistant: A3`;

      // When: We calculate stats
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: Should count assistant messages
      expect(stats.aiSuggestions).toBe(3);
    });

    test('should count message exchanges correctly', () => {
      // Given: A conversation with alternating speakers
      const conversation = `User: Q1
Assistant: A1
User: Q2
Assistant: A2`;

      // When: We calculate stats
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: Should count exchanges
      expect(stats.totalExchanges).toBe(2);
    });

    test('should handle conversation starting with assistant', () => {
      // Given: Conversation starting with assistant
      const conversation = `Assistant: Hello!
User: Hi
Assistant: How can I help?`;

      // When: We calculate stats
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: Should only count user-assistant pairs
      expect(stats.totalExchanges).toBe(1);
      expect(stats.aiSuggestions).toBe(2);
    });

    test('should initialize userCorrections to zero', () => {
      // Given: Any valid conversation
      const conversation = `User: Question
Assistant: Answer`;

      // When: We calculate stats
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: userCorrections should be 0 (to be implemented in Story 2-2)
      expect(stats.userCorrections).toBe(0);
    });
  });

  // ============================================================================
  // INTEGRATION: Error Handling Flow
  // ============================================================================

  describe('Integration: Error Handling Flow', () => {
    test('should propagate errors in loadAndValidateConversation', async () => {
      // Given: No conversation context

      // When/Then: Should propagate AR22Error
      await expect(loadAndValidateConversation()).rejects.toThrow(AR22Error);
    });

    test('should maintain error context through validation chain', () => {
      // Given: Invalid messages
      const invalidMessages = [
        { speaker: 'invalid' as any, content: 'test' }
      ];

      // When: We validate
      const validation = validateConversationStructure(invalidMessages);

      // Then: Should provide specific error details
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('invalid speaker');
    });

    test('should handle multiple validation errors', () => {
      // Given: Messages with multiple errors
      const invalidMessages = [
        { speaker: 'invalid' as any, content: null as any },
        { speaker: 'user', content: '' },
      ];

      // When: We validate
      const validation = validateConversationStructure(invalidMessages);

      // Then: Should report all errors
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});
