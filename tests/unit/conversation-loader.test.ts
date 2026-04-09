/**
 * Unit Tests for Conversation Loader (Story 2-1)
 *
 * Comprehensive test suite following the test architecture principle:
 * unit > integration > E2E
 *
 * Tests cover:
 * - Message parsing with speaker identification
 * - Threshold validation
 * - Error handling for malformed input
 * - Platform detection
 * - AR22 compliant error messages
 */

import {
  parseConversationMessages,
  identifySpeaker,
  validateConversationStructure,
  countMessageExchanges,
  AR22Error,
  detectPlatform,
  ConversationMessage,
} from '../../src/conversation-loader';

// ============================================================================
// TEST UTILITIES
// ============================================================================

describe('Conversation Loader - Test Utilities', () => {
  test('should import all required functions', () => {
    expect(typeof parseConversationMessages).toBe('function');
    expect(typeof identifySpeaker).toBe('function');
    expect(typeof validateConversationStructure).toBe('function');
    expect(typeof countMessageExchanges).toBe('function');
    expect(typeof detectPlatform).toBe('function');
  });

  test('AR22Error should be throwable', () => {
    expect(() => {
      throw new AR22Error('Test error', {
        what: 'Test what happened',
        how: ['Step 1', 'Step 2'],
        technical: 'Test technical details'
      });
    }).toThrow(AR22Error);
  });

  test('AR22Error should format correctly', () => {
    const error = new AR22Error('Brief description', {
      what: 'What happened',
      how: ['Fix step 1', 'Fix step 2'],
      technical: 'Technical details'
    });

    const errorString = error.toString();
    expect(errorString).toContain('Brief description');
    expect(errorString).toContain('What happened');
    expect(errorString).toContain('Fix step 1');
    expect(errorString).toContain('Technical details');
  });
});

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

describe('detectPlatform', () => {
  const originalEnv = process.env.CLAUDE_CODE;

  afterEach(() => {
    process.env.CLAUDE_CODE = originalEnv;
  });

  test('should detect claude-code platform', () => {
    process.env.CLAUDE_CODE = 'true';
    expect(detectPlatform()).toBe('claude-code');
  });

  test('should default to claude-code for unknown platforms', () => {
    process.env.CLAUDE_CODE = 'false';
    // In test environment, will default to claude-code
    expect(['claude-code', 'cursor', 'copilot']).toContain(detectPlatform());
  });
});

// ============================================================================
// SPEAKER IDENTIFICATION
// ============================================================================

describe('identifySpeaker', () => {
  test('should identify user from common patterns', () => {
    expect(identifySpeaker('User: Hello')).toBe('user');
    expect(identifySpeaker('user: hello')).toBe('user');
    expect(identifySpeaker('Human: Hi there')).toBe('user');
    expect(identifySpeaker('### User: Message')).toBe('user');
    expect(identifySpeaker('**User:** Message')).toBe('user');
  });

  test('should identify assistant from common patterns', () => {
    expect(identifySpeaker('Assistant: Hello')).toBe('assistant');
    expect(identifySpeaker('assistant: hello')).toBe('assistant');
    expect(identifySpeaker('AI: Hi there')).toBe('assistant');
    expect(identifySpeaker('Claude: Response')).toBe('assistant');
    expect(identifySpeaker('### Assistant: Message')).toBe('assistant');
    expect(identifySpeaker('**AI:** Message')).toBe('assistant');
  });

  test('should return null for unrecognised patterns', () => {
    expect(identifySpeaker('Random text')).toBeNull();
    expect(identifySpeaker('Unknown: label')).toBeNull();
    expect(identifySpeaker('')).toBeNull();
    expect(identifySpeaker(null as any)).toBeNull();
    expect(identifySpeaker(undefined as any)).toBeNull();
  });
});

// ============================================================================
// MESSAGE PARSING
// ============================================================================

describe('parseConversationMessages', () => {
  test('should parse simple user-assistant conversation', () => {
    const input = `User: Hello
Assistant: Hi there!`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].speaker).toBe('user');
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].speaker).toBe('assistant');
    expect(messages[1].content).toBe('Hi there!');
  });

  test('should parse conversation with markdown headers', () => {
    const input = `### User: Hello
### Assistant: Hi there!`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].speaker).toBe('user');
    expect(messages[1].speaker).toBe('assistant');
  });

  test('should parse conversation with bold markdown', () => {
    const input = `**User:** Hello
**Assistant:** Hi there!`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].speaker).toBe('user');
    expect(messages[1].speaker).toBe('assistant');
  });

  test('should handle multiline messages', () => {
    const input = `User: Hello
This is a multiline message
Assistant: Hi there!
This is also multiline`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('Hello');
    expect(messages[0].content).toContain('multiline message');
    expect(messages[1].content).toContain('Hi there!');
    expect(messages[1].content).toContain('also multiline');
  });

  test('should handle mixed case speaker labels', () => {
    const input = `user: hello
ASSISTANT: hi
User: testing`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(3);
    expect(messages[0].speaker).toBe('user');
    expect(messages[1].speaker).toBe('assistant');
    expect(messages[2].speaker).toBe('user');
  });

  test('should return empty array for null input (defensive programming)', () => {
    const messages = parseConversationMessages(null as any);
    expect(messages).toEqual([]);
    expect(messages).toHaveLength(0);
  });

  test('should return empty array for undefined input (defensive programming)', () => {
    const messages = parseConversationMessages(undefined as any);
    expect(messages).toEqual([]);
    expect(messages).toHaveLength(0);
  });

  test('should return empty array for non-string input (defensive programming)', () => {
    const messages1 = parseConversationMessages({} as any);
    expect(messages1).toEqual([]);

    const messages2 = parseConversationMessages([] as any);
    expect(messages2).toEqual([]);
  });

  test('should return empty array for empty input (defensive programming)', () => {
    const messages = parseConversationMessages('');
    expect(messages).toEqual([]);
    expect(messages).toHaveLength(0);
  });

  test('should ignore empty lines', () => {
    const input = `User: Hello

Assistant: Hi there!`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
  });

  test('should handle conversation with only user messages', () => {
    const input = `User: Message 1
User: Message 2
User: Message 3`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(3);
    messages.forEach((msg: ConversationMessage) => {
      expect(msg.speaker).toBe('user');
    });
  });

  test('should handle conversation with only assistant messages', () => {
    const input = `Assistant: Response 1
Assistant: Response 2
Assistant: Response 3`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(3);
    messages.forEach((msg: ConversationMessage) => {
      expect(msg.speaker).toBe('assistant');
    });
  });
});

// ============================================================================
// CONVERSATION VALIDATION
// ============================================================================

describe('validateConversationStructure', () => {
  test('should validate correct conversation structure', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: 'Hi there!' }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject null messages', () => {
    const result = validateConversationStructure(null as any);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Conversation messages cannot be null or undefined');
  });

  test('should reject undefined messages', () => {
    const result = validateConversationStructure(undefined as any);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Conversation messages cannot be null or undefined');
  });

  test('should reject non-array input', () => {
    const result = validateConversationStructure('not an array' as any);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('must be an array');
  });

  test('should reject empty conversation', () => {
    const result = validateConversationStructure([]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Conversation contains no messages');
  });

  test('should reject messages with invalid speaker', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'invalid' as any, content: 'Hi' }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('invalid speaker'))).toBe(true);
  });

  test('should reject messages with missing speaker', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: null as any, content: 'Hi' }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('invalid speaker'))).toBe(true);
  });

  test('should reject messages with invalid content', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: null as any }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('invalid content'))).toBe(true);
  });

  test('should reject messages with missing content', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: '' }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: string) => e.includes('invalid content'))).toBe(true);
  });

  test('should warn about unusually long messages', () => {
    const longContent = 'x'.repeat(100001);
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: longContent }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(true);
    expect(result.warnings.some((w: string) => w.includes('unusually long'))).toBe(true);
  });

  test('should check threshold requirements', () => {
    const messages: ConversationMessage[] = Array.from({ length: 10 }, (_, i) => ({
      speaker: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`
    }));

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(true);
    // 10 messages = 5 assistant suggestions (meets threshold)
    expect(result.meetsThreshold).toBe(true);
  });

  test('should fail threshold for short conversations', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: 'Hi' }
    ];

    const result = validateConversationStructure(messages);

    expect(result.valid).toBe(true);
    expect(result.meetsThreshold).toBe(false);
    expect(result.warnings.some((w: string) => w.includes('does not meet minimum threshold'))).toBe(true);
  });
});

// ============================================================================
// MESSAGE EXCHANGE COUNTING
// ============================================================================

describe('countMessageExchanges', () => {
  test('should count alternating user-assistant pairs', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: 'Hi' },
      { speaker: 'user', content: 'How are you?' },
      { speaker: 'assistant', content: 'Good!' }
    ];

    const stats = countMessageExchanges(messages);

    expect(stats.totalExchanges).toBe(2);
    expect(stats.aiSuggestions).toBe(2);
    expect(stats.conversationLoaded).toBe(true);
  });

  test('should count AI suggestions correctly', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Q1' },
      { speaker: 'assistant', content: 'A1' },
      { speaker: 'user', content: 'Q2' },
      { speaker: 'assistant', content: 'A2' },
      { speaker: 'user', content: 'Q3' },
      { speaker: 'assistant', content: 'A3' },
      { speaker: 'user', content: 'Q4' },
      { speaker: 'assistant', content: 'A4' },
      { speaker: 'user', content: 'Q5' },
      { speaker: 'assistant', content: 'A5' }
    ];

    const stats = countMessageExchanges(messages);

    expect(stats.aiSuggestions).toBe(5);
    expect(stats.totalExchanges).toBe(5);
  });

  test('should handle conversation starting with assistant', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Hello!' },
      { speaker: 'user', content: 'Hi' },
      { speaker: 'assistant', content: 'How can I help?' }
    ];

    const stats = countMessageExchanges(messages);

    expect(stats.totalExchanges).toBe(1); // Only user->assistant pairs
    expect(stats.aiSuggestions).toBe(2);
  });

  test('should handle empty conversation', () => {
    const stats = countMessageExchanges([]);

    expect(stats.totalExchanges).toBe(0);
    expect(stats.aiSuggestions).toBe(0);
    expect(stats.conversationLoaded).toBe(false);
  });

  test('should handle null input', () => {
    const stats = countMessageExchanges(null as any);

    expect(stats.totalExchanges).toBe(0);
    expect(stats.aiSuggestions).toBe(0);
    expect(stats.conversationLoaded).toBe(false);
  });

  test('should handle consecutive messages from same speaker', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Message 1' },
      { speaker: 'user', content: 'Message 2' },
      { speaker: 'assistant', content: 'Response 1' },
      { speaker: 'assistant', content: 'Response 2' }
    ];

    const stats = countMessageExchanges(messages);

    expect(stats.totalExchanges).toBe(1); // One user->assistant exchange
    expect(stats.aiSuggestions).toBe(2);
  });

  test('should initialize userCorrections to 0', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'assistant', content: 'Hi' }
    ];

    const stats = countMessageExchanges(messages);

    expect(stats.userCorrections).toBe(0); // To be implemented in Story 2-2
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Conversation Loading - Integration Tests', () => {
  test('should parse and validate complete conversation', () => {
    const input = `User: I need help with TypeScript
Assistant: I can help with TypeScript! What specific issue?
User: How do I define interfaces?
Assistant: You can define interfaces using the 'interface' keyword`;

    const messages = parseConversationMessages(input);
    const validation = validateConversationStructure(messages);
    const stats = countMessageExchanges(messages);

    expect(validation.valid).toBe(true);
    expect(stats.aiSuggestions).toBe(2);
    expect(stats.totalExchanges).toBe(2);
    expect(stats.conversationLoaded).toBe(true);
  });

  test('should handle real-world conversation format', () => {
    const input = `**User:** I'm having trouble with async/await
**Assistant:** Async/await can be tricky. What's your specific issue?
**User:** My Promise isn't resolving
**Assistant:** Can you show me your code?
**User:** Sure, here it is:
\`\`\`typescript
const result = await fetchData();
console.log(result);
\`\`\`
**Assistant:** I see the issue. You need to handle the error case.`;

    const messages = parseConversationMessages(input);
    const validation = validateConversationStructure(messages);
    const stats = countMessageExchanges(messages);

    expect(validation.valid).toBe(true);
    expect(messages.length).toBe(6); // 3 user, 3 assistant
    expect(stats.aiSuggestions).toBe(3); // 3 assistant messages
  });

  test('should provide helpful error for malformed conversation', () => {
    const malformedMessages: ConversationMessage[] = [
      { speaker: 'user', content: 'Hello' },
      { speaker: 'invalid' as any, content: 'Bad speaker' },
      { speaker: 'assistant', content: null as any }
    ];

    const validation = validateConversationStructure(malformedMessages);

    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors.some((e: string) => e.includes('invalid speaker'))).toBe(true);
    expect(validation.errors.some((e: string) => e.includes('invalid content'))).toBe(true);
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Conversation Loading - Edge Cases', () => {
  test('should handle very long message content', () => {
    const longContent = 'x'.repeat(49999);
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: longContent }
    ];

    const validation = validateConversationStructure(messages);

    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((w: string) => w.includes('unusually long'))).toBe(false); // Under 50000 threshold
  });

  test('should warn when message exceeds 50000 character threshold', () => {
    const longContent = 'x'.repeat(50001);
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: longContent }
    ];

    const validation = validateConversationStructure(messages);

    expect(validation.valid).toBe(true);
    expect(validation.warnings.some((w: string) => w.includes('unusually long'))).toBe(true);
    expect(validation.warnings.some((w: string) => w.includes('50001'))).toBe(true);
  });

  test('should handle conversation with special characters', () => {
    const input = `User: Test with émojis 🎉 and spëcial çharacters
Assistant: Ünicöde suppört is impørtant! 👍`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('émojis');
    expect(messages[1].content).toContain('Ünicöde');
  });

  test('should handle conversation with code blocks', () => {
    const input = `User: Here's my code:
\`\`\`typescript
const x = 42;
\`\`\`
Assistant: That looks correct!`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('const x = 42');
    expect(messages[1].content).toContain('correct');
  });

  test('should handle mixed speaker label formats', () => {
    const input = `User: Message 1
assistant: Response 1
### User: Message 2
**Assistant:** Response 2`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(4);
    expect(messages[0].speaker).toBe('user');
    expect(messages[1].speaker).toBe('assistant');
    expect(messages[2].speaker).toBe('user');
    expect(messages[3].speaker).toBe('assistant');
  });

  test('should detect circular references in message array', () => {
    const circularObj: any = { speaker: 'user', content: 'Test' };
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Valid message 1' },
      circularObj,
      { speaker: 'assistant', content: 'Valid message 2' }
    ];

    // Create circular reference
    messages.push(circularObj);

    const validation = validateConversationStructure(messages);

    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e: string) => e.includes('circular reference'))).toBe(true);
  });

  test('should handle code blocks with speaker-like text inside', () => {
    const input = `User: Look at this code:
\`\`\`typescript
const User = { name: 'test' };
const Assistant = { role: 'helper' };
\`\`\`
Assistant: This code defines User and Assistant objects`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].speaker).toBe('user');
    expect(messages[0].content).toContain('const User =');
    expect(messages[0].content).toContain('const Assistant =');
    expect(messages[1].speaker).toBe('assistant');
    expect(messages[1].content).toContain('defines User and Assistant objects');
  });

  test('should handle multiple code blocks in single message', () => {
    const input = `User: Here are two examples:
\`\`\`javascript
const a = 1;
\`\`\`
And another:
\`\`\`typescript
const b = 2;
\`\`\`
Assistant: Both examples look good`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('const a = 1');
    expect(messages[0].content).toContain('const b = 2');
    expect(messages[1].speaker).toBe('assistant');
  });

  test('should handle code blocks with different language tags', () => {
    const input = `User: Code in different languages:
\`\`\`python
def hello():
    print("Hello")
\`\`\`
\`\`\`rust
fn main() {
    println!("Hello");
}
\`\`\`
Assistant: Both do the same thing`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('def hello():');
    expect(messages[0].content).toContain('fn main()');
  });

  test('should handle unclosed code blocks gracefully', () => {
    const input = `User: Here's code without closing:
\`\`\`typescript
const x = 42;
Assistant: This should still parse the message`;

    const messages = parseConversationMessages(input);

    // Should still parse, treating the unclosed code block as content
    expect(messages.length).toBeGreaterThanOrEqual(1);
    if (messages.length > 0) {
      expect(messages[0].speaker).toBe('user');
      expect(messages[0].content).toContain('const x = 42');
    }
  });

  test('should handle empty code blocks', () => {
    const input = `User: Empty block:
\`\`\`
\`\`\`
Assistant: Why empty?`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('```');
    expect(messages[1].speaker).toBe('assistant');
  });

  test('should validate ISO 8601 timestamp format', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'Test', timestamp: '2026-03-16T10:30:00Z' },
      { speaker: 'assistant', content: 'Response', timestamp: '2026-03-16T10:30:00.123Z' },
      { speaker: 'user', content: 'Invalid timestamp', timestamp: 'not-iso-format' }
    ];

    countMessageExchanges(messages);

    // Should warn about invalid timestamp
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid timestamp format')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('not-iso-format')
    );

    consoleSpy.mockRestore();
  });

  test('should handle missing timestamp gracefully', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'user', content: 'No timestamp' },
      { speaker: 'assistant', content: 'Also no timestamp' }
    ];

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const stats = countMessageExchanges(messages);

    expect(stats.conversationLoaded).toBe(true);
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  test('should handle conversation starting with code block', () => {
    const input = `\`\`\`typescript
const x = 42;
\`\`\`
User: What does this code do?
Assistant: It declares a constant x with value 42`;

    const messages = parseConversationMessages(input);

    // Should handle gracefully - first non-code line determines speaker
    expect(messages.length).toBeGreaterThan(0);
  });

  test('should handle code blocks with backtick escapes', () => {
    const input = `User: Code with escaped backticks:
\`\`\`javascript
const str = \`hello\`;
\`\`\`
Assistant: That's correct`;

    const messages = parseConversationMessages(input);

    expect(messages).toHaveLength(2);
    expect(messages[0].content).toContain('const str =');
    expect(messages[1].speaker).toBe('assistant');
  });
});
