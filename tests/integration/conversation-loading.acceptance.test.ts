/**
 * Acceptance Tests for Story 2-1: Load and Parse Conversation History
 *
 * Testing Level: Integration/API Tests
 * Test Pyramid Position: Middle tier (business logic validation)
 *
 * These tests validate the acceptance criteria for conversation loading:
 * - AC1: Skill triggered by `/improve-rules` command
 * - AC2: Conversation loaded from chat context
 * - AC3: System identifies user messages containing corrections
 * - AC4: Output includes structured list with required fields
 * - AC5: Actionable error message when no conversation history available
 *
 * TEST STATUS: RED (Failing) - Expected to fail before implementation
 *
 * Note: These are acceptance tests that validate the complete workflow,
 * not just individual functions. They test the integration between
 * command parsing, conversation loading, parsing, and validation.
 */

import {
  loadConversationFromContext,
  loadAndValidateConversation,
  parseConversationMessages,
  validateConversationStructure,
  countMessageExchanges,
  AR22Error,
} from '../../src/conversation-loader';

describe('Story 2-1: Load and Parse Conversation History - Acceptance Tests', () => {
  // ============================================================================
  // AC1: Skill triggered by `/improve-rules` command
  // ============================================================================

  describe('AC1: Skill triggered by `/improve-rules` command', () => {
    test('should have conversation loading functions available', () => {
      // This test validates that the conversation loading functions are available
      // Note: We test the underlying functions directly since command routing
      // is handled by Claude Code's skill system

      // Given: The functions are imported from the source
      // When: We check that functions exist
      expect(typeof loadConversationFromContext).toBe('function');
      expect(typeof parseConversationMessages).toBe('function');
      expect(typeof validateConversationStructure).toBe('function');
      expect(typeof countMessageExchanges).toBe('function');
    });

    test('should have loadAndValidateConversation convenience function', () => {
      // Given: The convenience function
      // When: We check it exists
      expect(typeof loadAndValidateConversation).toBe('function');
    });

    test('should loadAndValidateConversation throw error without context', async () => {
      // Given: No conversation context available
      // When/Then: Should throw AR22Error
      await expect(loadAndValidateConversation()).rejects.toThrow(AR22Error);
    });
  });

  // ============================================================================
  // AC2: Conversation loaded from chat context
  // ============================================================================

  describe('AC2: Conversation loaded from chat context', () => {
    test('should load conversation when context is available', async () => {
      // Given: A conversation context with valid format
      const mockContext = `User: I need help with TypeScript
Assistant: I can help with TypeScript! What specific issue?
User: How do I define interfaces?
Assistant: You can define interfaces using the 'interface' keyword`;

      // When: We parse the conversation
      const messages = parseConversationMessages(mockContext);

      // Then: Messages should be extracted with correct structure
      expect(messages).toBeDefined();
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]).toHaveProperty('speaker');
      expect(messages[0]).toHaveProperty('content');
    });

    test('should fail gracefully when context is unavailable', async () => {
      // Given: No conversation context is available

      // When/Then: Loading should fail with actionable error
      await expect(loadAndValidateConversation()).rejects.toThrow(AR22Error);
    });

    test('should provide AR22-compliant error when context unavailable', async () => {
      // Given: No conversation context available

      // When: Attempting to load conversation
      const error = await loadAndValidateConversation().catch(err => err);

      // Then: Error should follow AR22 format
      expect(error).toBeInstanceOf(AR22Error);
      expect(error.what).toBeDefined();
      expect(error.how).toBeDefined();
      expect(Array.isArray(error.how)).toBe(true);
      expect(error.technical).toBeDefined();

      // And: Error message should be actionable
      const errorString = error.toString();
      expect(errorString).toContain('What happened');
      expect(errorString).toContain('How to fix');
      expect(errorString).toContain('Technical details');

      // And: Each step should be actionable
      error.how.forEach((step: string) => {
        expect(typeof step).toBe('string');
        expect(step.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // AC3: System identifies user messages containing corrections
  // ============================================================================

  describe('AC3: System identifies user messages containing corrections', () => {
    test('should parse messages with user speaker identification', () => {
      // Given: A conversation with user and assistant messages
      const conversation = `User: I tried your suggestion but it didn't work
Assistant: Let me help you troubleshoot
User: Actually, I figured out the issue - it was a typo in my variable name
Assistant: Great! Glad you found it`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: User messages should be identified correctly
      const userMessages = messages.filter(m => m.speaker === 'user');
      expect(userMessages.length).toBe(2);
      expect(userMessages[0].content).toContain("didn't work");
      expect(userMessages[1].content).toContain('typo');

      // And: Assistant messages should be identified correctly
      const assistantMessages = messages.filter(m => m.speaker === 'assistant');
      expect(assistantMessages.length).toBe(2);
    });

    test('should handle various user label formats', () => {
      // Given: Conversations with different user label formats
      const formats = [
        `User: Message 1`,
        `user: Message 2`,
        `### User: Message 3`,
        `**User:** Message 4`,
      ];

      // When: We parse each format
      formats.forEach(format => {
        const messages = parseConversationMessages(format);

        // Then: All should identify the user speaker correctly
        expect(messages[0].speaker).toBe('user');
      });
    });

    test('should distinguish user from assistant messages', () => {
      // Given: A conversation with mixed speakers
      const conversation = `User: Hello
Assistant: Hi there
User: How are you?
Assistant: Good!`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Speakers should alternate correctly
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
      expect(messages[2].speaker).toBe('user');
      expect(messages[3].speaker).toBe('assistant');
    });
  });

  // ============================================================================
  // AC4: Output includes structured list with required fields
  // ============================================================================

  describe('AC4: Output includes structured list with required fields', () => {
    test('should return messages with speaker field', () => {
      // Given: A valid conversation
      const conversation = `User: Test message`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Messages should have speaker field
      expect(messages[0].speaker).toBeDefined();
      expect(['user', 'assistant']).toContain(messages[0].speaker);
    });

    test('should return messages with content field', () => {
      // Given: A valid conversation
      const conversation = `User: Test message`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Messages should have content field
      expect(messages[0].content).toBeDefined();
      expect(typeof messages[0].content).toBe('string');
      expect(messages[0].content.length).toBeGreaterThan(0);
    });

    test('should include timestamp in message structure (optional)', () => {
      // Given: A valid conversation
      const conversation = `User: Test message`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Timestamp field should exist (may be undefined)
      expect(messages[0]).toHaveProperty('timestamp');
      // Note: timestamp is optional and may not be populated
    });

    test('should provide context through message content', () => {
      // Given: A conversation with context
      const conversation = `User: I'm working on a React component
Assistant: I can help with React components
User: The component needs to handle form validation`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Content should preserve context
      expect(messages[0].content).toContain('React component');
      expect(messages[2].content).toContain('form validation');
    });

    test('should return complete stats structure', () => {
      // Given: A valid conversation
      const conversation = `User: Question 1
Assistant: Answer 1
User: Question 2
Assistant: Answer 2`;

      // When: We count message exchanges
      const messages = parseConversationMessages(conversation);
      const stats = countMessageExchanges(messages);

      // Then: Stats should have all required fields
      expect(stats).toHaveProperty('totalExchanges');
      expect(stats).toHaveProperty('aiSuggestions');
      expect(stats).toHaveProperty('userCorrections');
      expect(stats).toHaveProperty('conversationLoaded');

      // And: Values should be numbers
      expect(typeof stats.totalExchanges).toBe('number');
      expect(typeof stats.aiSuggestions).toBe('number');
      expect(typeof stats.userCorrections).toBe('number');
      expect(typeof stats.conversationLoaded).toBe('boolean');
    });

    test('should return complete validation result structure', () => {
      // Given: A valid conversation
      const conversation = `User: Test
Assistant: Response`;

      // When: We validate the conversation
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Validation should have all required fields
      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('meetsThreshold');
      expect(validation).toHaveProperty('errors');
      expect(validation).toHaveProperty('warnings');

      // And: Arrays should be initialized
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  // ============================================================================
  // AC5: Actionable error message when no conversation history available
  // ============================================================================

  describe('AC5: Actionable error message when no conversation history available', () => {
    test('should throw AR22Error when conversation context unavailable', async () => {
      // Given: No conversation context available

      // When/Then: Should throw AR22Error
      await expect(loadAndValidateConversation()).rejects.toThrow(AR22Error);
    });

    test('should provide actionable guidance in error message', async () => {
      // Given: No conversation context available
      const error = await loadAndValidateConversation().catch(err => err);

      // When: We examine the error
      const errorString = error.toString();

      // Then: Error should include actionable steps
      expect(errorString).toMatch(/ensure/i);
      expect(errorString).toMatch(/verify/i);
      expect(error.how.length).toBeGreaterThan(0);

    });

    test('should include technical details for debugging', async () => {
      // Given: No conversation context available
      const error = await loadAndValidateConversation().catch(err => err);

      // When: We examine the error
      const errorString = error.toString();

      // Then: Error should include technical details
      expect(errorString).toContain('Technical details');
      expect(error.technical).toBeDefined();
      expect(typeof error.technical).toBe('string');
      expect(error.technical.length).toBeGreaterThan(0);
    });

    test('should handle null conversation context gracefully', () => {
      // Given: Null conversation context

      // When/Then: Should throw AR22Error
      expect(() => {
        parseConversationMessages(null as any);
      }).toThrow(AR22Error);
    });

    test('should handle undefined conversation context gracefully', () => {
      // Given: Undefined conversation context

      // When/Then: Should throw AR22Error
      expect(() => {
        parseConversationMessages(undefined as any);
      }).toThrow(AR22Error);
    });

    test('should provide specific error for invalid context type', () => {
      // Given: Invalid context type (object instead of string)
      const invalidContext = { not: 'a string' };

      // When/Then: Should throw AR22Error with clear message
      expect(() => {
        parseConversationMessages(invalidContext as any);
      }).toThrow(AR22Error);
    });
  });

  // ============================================================================
  // INTEGRATION: Complete workflow tests
  // ============================================================================

  describe('Integration: Complete conversation loading workflow', () => {
    test('should handle end-to-end workflow with valid conversation', () => {
      // Given: A realistic conversation
      const conversation = `User: I need help with TypeScript interfaces
Assistant: I can help! What specific issue are you having?
User: How do I define optional properties?
Assistant: You can use the ? syntax: interface User { name?: string }`;

      // When: We parse and validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);
      const stats = countMessageExchanges(messages);

      // Then: Workflow should complete successfully
      expect(validation.valid).toBe(true);
      expect(stats.conversationLoaded).toBe(true);
      expect(messages.length).toBe(4);
    });

    test('should handle workflow with short conversation', () => {
      // Given: A short conversation below threshold
      const conversation = `User: Hello
Assistant: Hi`;

      // When: We parse and validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);

      // Then: Should be valid but not meet threshold
      expect(validation.valid).toBe(true);
      expect(validation.meetsThreshold).toBe(false);
      expect(validation.warnings.length).toBeGreaterThan(0);
    });

    test('should handle workflow with malformed conversation', () => {
      // Given: A malformed conversation
      const malformedMessages = [
        { speaker: 'user', content: 'Valid message' },
        { speaker: 'invalid' as any, content: 'Invalid speaker' },
      ];

      // When: We validate
      const validation = validateConversationStructure(malformedMessages);

      // Then: Should fail validation with errors
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    test('should handle complex real-world conversation with code', () => {
      // Given: A realistic technical conversation
      const conversation = `**User:** I'm having issues with React hooks
**Assistant:** What specific problem are you encountering?
**User:** My useEffect isn't updating when props change
\`\`\`typescript
useEffect(() => {
  console.log(props.data);
}, []);
\`\`\`
**Assistant:** You need to include props.data in the dependency array
**User:** Oh I see, can you show me the correct version?
**Assistant:** Sure, change the second parameter to \`[props.data]\``;

      // When: We parse and validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);
      const stats = countMessageExchanges(messages);

      // Then: Should handle complex formatting correctly
      expect(validation.valid).toBe(true);
      expect(stats.conversationLoaded).toBe(true);
      expect(messages.length).toBeGreaterThanOrEqual(4);
      expect(messages.some(m => m.content.includes('useEffect'))).toBe(true);
      expect(messages.some(m => m.content.includes('dependency array'))).toBe(true);
    });

    test('should handle conversation meeting minimum threshold', () => {
      // Given: A conversation with 10 messages (5 AI suggestions)
      const conversation = Array.from({ length: 10 }, (_, i) => {
        const speaker = i % 2 === 0 ? 'User' : 'Assistant';
        return `${speaker}: Message ${i + 1}`;
      }).join('\n');

      // When: We parse and validate
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);
      const stats = countMessageExchanges(messages);

      // Then: Should meet threshold
      expect(validation.valid).toBe(true);
      expect(validation.meetsThreshold).toBe(true);
      expect(stats.aiSuggestions).toBe(5);
      expect(stats.totalExchanges).toBe(5);
    });

    test('should handle error recovery workflow', () => {
      // Given: A conversation that initially fails validation
      const malformedMessages = [
        { speaker: 'user', content: 'Valid' },
        { speaker: null as any, content: 'Invalid speaker' }
      ];

      // When: We validate and then fix
      let validation = validateConversationStructure(malformedMessages);
      expect(validation.valid).toBe(false);

      // Fix the messages
      const fixedMessages = [
        { speaker: 'user' as const, content: 'Valid' },
        { speaker: 'assistant' as const, content: 'Now valid' }
      ];

      validation = validateConversationStructure(fixedMessages);

      // Then: Should recover successfully
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test('should handle conversation with mixed valid and invalid content', () => {
      // Given: A realistic conversation with some problematic entries
      const mixedMessages = [
        { speaker: 'user' as const, content: 'Valid user message' },
        { speaker: 'assistant' as const, content: 'Valid assistant response' },
        { speaker: 'user' as const, content: '' }, // Invalid: empty content
        { speaker: 'assistant' as const, content: 'Another valid response' }
      ];

      // When: We validate
      const validation = validateConversationStructure(mixedMessages);

      // Then: Should identify specific validation issues
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e: string) => e.includes('invalid content'))).toBe(true);
      expect(validation.errors).toHaveLength(1);
    });

    test('should preserve message content through complete workflow', () => {
      // Given: A conversation with special formatting
      const conversation = `User: Here's a formula: E = mc²
Assistant: That's Einstein's mass-energy equivalence
User: Can you explain it in detail?
Assistant: Sure! E represents energy, m is mass, c² is the speed of light squared`;

      // When: We process through the complete workflow
      const messages = parseConversationMessages(conversation);
      const validation = validateConversationStructure(messages);
      const stats = countMessageExchanges(messages);

      // Then: Content should be preserved accurately
      expect(validation.valid).toBe(true);
      expect(messages[0].content).toContain('E = mc²');
      expect(messages[1].content).toContain('Einstein');
      expect(messages[3].content).toContain('speed of light');
      expect(stats.totalExchanges).toBe(2);
    });
  });

  // ============================================================================
  // CROSS-PLATFORM: Platform-agnostic behavior
  // ============================================================================

  describe('Cross-platform: Platform-agnostic conversation parsing', () => {
    test('should parse Claude Code format conversations', () => {
      // Given: Claude Code format conversation
      const conversation = `User: Help with TypeScript
Assistant: I can help with TypeScript`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Should parse correctly
      expect(messages.length).toBe(2);
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
    });

    test('should parse markdown header format conversations', () => {
      // Given: Markdown header format
      const conversation = `### User: Help with TypeScript
### Assistant: I can help with TypeScript`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Should parse correctly
      expect(messages.length).toBe(2);
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
    });

    test('should parse bold markdown format conversations', () => {
      // Given: Bold markdown format
      const conversation = `**User:** Help with TypeScript
**Assistant:** I can help with TypeScript`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Should parse correctly
      expect(messages.length).toBe(2);
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
    });

    test('should handle mixed format conversations', () => {
      // Given: Mixed format conversation
      const conversation = `User: Message 1
assistant: Response 1
### User: Message 2
**Assistant:** Response 2`;

      // When: We parse the conversation
      const messages = parseConversationMessages(conversation);

      // Then: Should parse all formats correctly
      expect(messages.length).toBe(4);
      expect(messages[0].speaker).toBe('user');
      expect(messages[1].speaker).toBe('assistant');
      expect(messages[2].speaker).toBe('user');
      expect(messages[3].speaker).toBe('assistant');
    });
  });
});
