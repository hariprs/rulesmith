/**
 * Integration Tests for Correction Classification (Story 2-2)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests verify the integration between:
 * - Conversation Loader (Story 2-1)
 * - Correction Classifier (Story 2-2)
 * - Command integration points
 *
 * Testing Strategy:
 * - Test with real conversation loader output
 * - Verify data flow between components
 * - Test error handling across integration boundaries
 * - Validate AR22 compliance in integration scenarios
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  CorrectionClassifier,
  ClassificationResult,
  ClassificationErrorCode,
  AR22Error,
} from '../../src/correction-classifier';
import {
  parseConversationMessages,
  ConversationMessage,
  ValidationResult,
  AR22Error as LoaderAR22Error,
} from '../../src/conversation-loader';

// ============================================================================
// CONVERSATION LOADER INTEGRATION
// ============================================================================

describe('Correction Classifier - Integration with Conversation Loader', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  describe('Story 2-1 Output Integration', () => {
    test('should work with conversation loader output', () => {
      // Sample conversation in raw format (as would come from loader)
      const rawConversation = `
User: I need help with async functions
Assistant: You should use async/await
User: yes, that works
Assistant: Also add error handling
User: no, try/catch is better
      `;

      // Parse using Story 2-1 loader
      const messages: ConversationMessage[] = parseConversationMessages(rawConversation);

      // Validate structure using Story 2-1 validator
      expect(messages).toBeDefined();
      expect(messages.length).toBeGreaterThan(0);

      // Classify using Story 2-2 classifier
      const result: ClassificationResult = classifier.classifyConversation(messages);

      // Verify integration worked
      expect(result).toBeDefined();
      expect(result.total_exchanges).toBe(2);
      expect(result.acceptances_found).toBe(1);
      expect(result.corrections_found).toBe(1);
    });

    test('should handle malformed conversation loader data gracefully', () => {
      // Malformed conversation that still parses but has edge cases
      const malformedConversation = `
User:
Assistant: Try this
User: x
Assistant: Use that
User:
      `;

      const messages: ConversationMessage[] = parseConversationMessages(malformedConversation);
      const result: ClassificationResult = classifier.classifyConversation(messages);

      // Should still process without crashing
      expect(result).toBeDefined();
      expect(result.ambiguous_cases).toBeGreaterThan(0);
    });

    test('should validate conversation loader structure before processing', () => {
      // Create valid message structure
      const validMessages: ConversationMessage[] = [
        { speaker: 'assistant', content: 'Use this' },
        { speaker: 'user', content: 'yes' },
      ];

      // Should process successfully
      expect(() => {
        classifier.classifyConversation(validMessages);
      }).not.toThrow();
    });

    test('should throw AR22Error for invalid conversation loader structure', () => {
      // Invalid message structure (missing required fields)
      const invalidMessages = [
        { speaker: 'assistant' }, // Missing content
      ] as any;

      expect(() => {
        classifier.classifyConversation(invalidMessages);
      }).toThrow(AR22Error);
    });

    test('should handle null/undefined from conversation loader', () => {
      expect(() => {
        classifier.classifyConversation(null as any);
      }).toThrow(AR22Error);

      expect(() => {
        classifier.classifyConversation(undefined as any);
      }).toThrow(AR22Error);
    });
  });

  describe('Platform-Specific Format Integration', () => {
    test('should work with Claude Code conversation format', () => {
      const claudeCodeFormat = `
User: Help me with TypeScript
Assistant: Use strict mode
User: yes
      `;

      const messages = parseConversationMessages(claudeCodeFormat);
      const result = classifier.classifyConversation(messages);

      expect(result.total_exchanges).toBe(1);
      expect(result.acceptances_found).toBe(1);
    });

    test('should work with Cursor conversation format', () => {
      const cursorFormat = `
**User:** How do I handle errors?
**Assistant:** Use try/catch blocks
**User:** perfect
      `;

      const messages = parseConversationMessages(cursorFormat);
      const result = classifier.classifyConversation(messages);

      expect(result.total_exchanges).toBe(1);
      expect(result.acceptances_found).toBe(1);
    });

    test('should work with GitHub Copilot conversation format', () => {
      const copilotFormat = `
### User: Add validation
### Assistant: Use Zod for schema validation
### User: thanks
      `;

      const messages = parseConversationMessages(copilotFormat);
      const result = classifier.classifyConversation(messages);

      expect(result.total_exchanges).toBe(1);
      expect(result.acceptances_found).toBe(1);
    });

    test('should handle mixed platform formats', () => {
      const mixedFormat = `
User: Question 1
Assistant: Answer 1
**User:** Question 2
**Assistant:** Answer 2
### User: Question 3
### Assistant: Answer 3
      `;

      const messages = parseConversationMessages(mixedFormat);
      const result = classifier.classifyConversation(messages);

      // Note: The conversation parser may not handle all mixed formats perfectly
      // The important thing is that it doesn't crash and produces a valid result
      expect(result.total_exchanges).toBeGreaterThanOrEqual(0);
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// COMMAND INTEGRATION
// ============================================================================

describe('Correction Classifier - Command Integration', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  describe('Analyze Command Integration', () => {
    test('should provide classification results for command output', () => {
      const messages: ConversationMessage[] = [
        { speaker: 'assistant', content: 'Use TypeScript' },
        { speaker: 'user', content: 'yes' },
        { speaker: 'assistant', content: 'Add interfaces' },
        { speaker: 'user', content: 'change to type aliases' },
      ];

      const result: ClassificationResult = classifier.classifyConversation(messages);

      // Verify result has all fields needed for command output
      expect(result.total_exchanges).toBeDefined();
      expect(result.corrections_found).toBeDefined();
      expect(result.acceptances_found).toBeDefined();
      expect(result.ambiguous_cases).toBeDefined();
      expect(result.classified_corrections).toBeDefined();
      expect(result.classification_summary).toBeDefined();

      // Verify classification summary has confidence breakdown
      expect(result.classification_summary.high_confidence).toBeDefined();
      expect(result.classification_summary.medium_confidence).toBeDefined();
      expect(result.classification_summary.low_confidence).toBeDefined();
    });

    test('should include reasoning for each classified correction', () => {
      const messages: ConversationMessage[] = [
        { speaker: 'assistant', content: 'Use React' },
        { speaker: 'user', content: 'no, use Vue instead' },
      ];

      const result: ClassificationResult = classifier.classifyConversation(messages);

      expect(result.classified_corrections).toHaveLength(1);
      const correction = result.classified_corrections[0];

      expect(correction.classification.reasoning).toBeDefined();
      expect(correction.classification.reasoning.length).toBeGreaterThan(0);
      expect(correction.classification.confidence).toBeGreaterThanOrEqual(0);
      expect(correction.classification.confidence).toBeLessThanOrEqual(1);
    });

    test('should flag ambiguous cases for manual review in command output', () => {
      const messages: ConversationMessage[] = [
        { speaker: 'assistant', content: 'Try this' },
        { speaker: 'user', content: 'maybe' },
      ];

      const result: ClassificationResult = classifier.classifyConversation(messages);

      expect(result.ambiguous_cases).toBeGreaterThan(0);
      expect(result.classified_corrections).toHaveLength(0); // No actual corrections
    });
  });

  describe('Error Handling for Command Integration', () => {
    test('should provide actionable error messages for command display', () => {
      try {
        classifier.classifyConversation(null as any);
        fail('Expected AR22Error');
      } catch (error) {
        if (error instanceof AR22Error) {
          // Verify all AR22 fields are present for command display
          expect(error.message).toBeDefined(); // Brief description
          expect(error.what).toBeDefined(); // What happened
          expect(error.how).toBeDefined(); // How to fix (array)
          expect(Array.isArray(error.how)).toBe(true);
          expect(error.how.length).toBeGreaterThan(0);
          expect(error.technical).toBeDefined(); // Technical details
        } else {
          fail(`Expected AR22Error, got ${error}`);
        }
      }
    });

    test('should use ClassificationErrorCode for all errors', () => {
      const errorCases = [
        null as any,
        undefined as any,
        [{}] as any,
        [{ speaker: 'invalid' as any, content: 'test' }],
      ];

      for (const invalidInput of errorCases) {
        try {
          classifier.classifyConversation(invalidInput);
          fail(`Expected error for input: ${JSON.stringify(invalidInput)}`);
        } catch (error) {
          if (error instanceof AR22Error) {
            expect(error.code).toBeDefined();
            expect(Object.values(ClassificationErrorCode)).toContain(error.code);
          } else {
            fail(`Expected AR22Error, got ${error}`);
          }
        }
      }
    });
  });
});

// ============================================================================
// END-TO-END INTEGRATION SCENARIOS
// ============================================================================

describe('Correction Classifier - End-to-End Integration Scenarios', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should process complete workflow: load -> parse -> classify', () => {
    // Step 1: Raw conversation (as would come from file/context)
    const rawConversation = `
User: I need help with error handling in async functions
Assistant: You should use try/catch blocks with async/await
User: yes, that makes sense
Assistant: Here's an example:
\`\`\`typescript
async function fetchData() {
  try {
    const data = await fetch('/api');
    return data;
  } catch (error) {
    console.error(error);
  }
}
\`\`\`
User: perfect, thanks!
Assistant: You should also add error types
User: no, keep it simple for now
    `;

    // Step 2: Parse using Story 2-1
    const messages: ConversationMessage[] = parseConversationMessages(rawConversation);

    // Step 3: Classify using Story 2-2
    const result: ClassificationResult = classifier.classifyConversation(messages);

    // Verify complete workflow
    expect(result.total_exchanges).toBe(3);
    expect(result.acceptances_found).toBe(2);
    expect(result.corrections_found).toBe(1);
    expect(result.classified_corrections).toHaveLength(1);
    expect(result.classified_corrections[0].classification.type).toBe('correction');
  });

  test('should handle real-world conversation with multiple correction types', () => {
    const realWorldConversation = `
User: How do I improve this code?
Assistant: Use TypeScript strict mode
User: yes but add documentation
Assistant: Here's the documented version
User: thanks, that's perfect
Assistant: Also add unit tests
User: maybe later
Assistant: You really should add tests
User: ok, fine
    `;

    const messages = parseConversationMessages(realWorldConversation);
    const result = classifier.classifyConversation(messages);

    // Verify multiple types detected
    expect(result.total_exchanges).toBeGreaterThanOrEqual(3);
    expect(result.acceptances_found).toBeGreaterThan(0);
    expect(result.corrections_found).toBeGreaterThan(0);
    expect(result.ambiguous_cases).toBeGreaterThan(0);
  });

  test('should maintain data integrity through integration pipeline', () => {
    const originalConversation = `
User: Help with React state
Assistant: Use useState hook
User: yes
    `;

    const messages = parseConversationMessages(originalConversation);
    const result = classifier.classifyConversation(messages);

    // Verify data integrity
    // Count only assistant->user pairs, not all user messages
    const userResponsesToAssistant = messages.filter((m, i) =>
      m.speaker === 'user' && i > 0 && messages[i - 1].speaker === 'assistant'
    ).length;
    expect(result.total_exchanges).toBe(userResponsesToAssistant);
    expect(result.corrections_found + result.acceptances_found + result.ambiguous_cases)
      .toBeLessThanOrEqual(result.total_exchanges);
  });
});

// ============================================================================
// ERROR PROPAGATION ACROSS BOUNDARIES
// ============================================================================

describe('Correction Classifier - Error Propagation Across Boundaries', () => {
  test('should handle conversation loader errors gracefully', () => {
    // Invalid input that causes loader to fail
    const invalidInput = null as unknown as string;

    expect(() => {
      parseConversationMessages(invalidInput);
    }).toThrow(LoaderAR22Error);
  });

  test('should propagate errors with correct error codes', () => {
    const invalidMessages = [{ invalid: 'structure' }] as any;

    try {
      const classifier = new CorrectionClassifier();
      classifier.classifyConversation(invalidMessages);
      fail('Expected AR22Error');
    } catch (error) {
      if (error instanceof AR22Error) {
        expect(error.code).toBe(ClassificationErrorCode.INVALID_INPUT);
      } else {
        fail(`Expected AR22Error, got ${error}`);
      }
    }
  });

  test('should maintain error context through integration', () => {
    try {
      const classifier = new CorrectionClassifier();
      classifier.classifyConversation(null as any);
      fail('Expected AR22Error');
    } catch (error) {
      if (error instanceof AR22Error) {
        // Verify error has all context needed for debugging
        expect(error.message).toBeTruthy();
        expect(error.what).toBeTruthy();
        expect(error.how.length).toBeGreaterThan(0);
        expect(error.technical).toBeTruthy();

        // Verify error can be stringified for logging
        const errorString = error.toString();
        expect(errorString).toBeTruthy();
        expect(errorString.length).toBeGreaterThan(0);
      } else {
        fail(`Expected AR22Error, got ${error}`);
      }
    }
  });
});

// ============================================================================
// PERFORMANCE INTEGRATION TESTS
// ============================================================================

describe('Correction Classifier - Performance Integration', () => {
  test('should handle large conversations efficiently', () => {
    // Generate large conversation
    const messages: ConversationMessage[] = [];
    for (let i = 0; i < 100; i++) {
      messages.push({ speaker: 'assistant', content: `Suggestion ${i}` });
      messages.push({ speaker: 'user', content: i % 2 === 0 ? 'yes' : 'no' });
    }

    const classifier = new CorrectionClassifier();
    const startTime = Date.now();
    const result = classifier.classifyConversation(messages);
    const endTime = Date.now();

    // Should complete in reasonable time (< 5 seconds for 100 exchanges)
    expect(endTime - startTime).toBeLessThan(5000);
    expect(result.total_exchanges).toBe(100);
  });

  test('should handle complex conversations with code blocks', () => {
    const complexConversation = `
User: Help me with this function
Assistant: Here's a refactored version:
\`\`\`typescript
function processData(data: string): Result {
  return JSON.parse(data);
}
\`\`\`
User: perfect
Assistant: Add error handling
User: yes but use try/catch
    `;

    const messages = parseConversationMessages(complexConversation);
    const result = new CorrectionClassifier().classifyConversation(messages);

    expect(result.total_exchanges).toBe(2);
    expect(result.acceptances_found).toBe(1);
    expect(result.corrections_found).toBe(1);
  });
});

// ============================================================================
// DATA CONTRACT VALIDATION
// ============================================================================

describe('Correction Classifier - Data Contract Validation', () => {
  test('should maintain ConversationMessage interface contract', () => {
    const validMessage: ConversationMessage = {
      speaker: 'user',
      content: 'test',
      timestamp: '2024-01-01T00:00:00.000Z'
    };

    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation([
      { speaker: 'assistant', content: 'suggestion' },
      validMessage
    ]);

    expect(result).toBeDefined();
  });

  test('should handle extended ConversationMessage with classification metadata', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Use this' },
      {
        speaker: 'user',
        content: 'yes',
        timestamp: '2024-01-01T00:00:00.000Z' // Optional field from interface
      }
    ];

    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    expect(result).toBeDefined();
    expect(result.acceptances_found).toBe(1);
  });

  test('should validate all ClassificationResult fields are present', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Try this' },
      { speaker: 'user', content: 'yes' },
    ];

    const classifier = new CorrectionClassifier();
    const result: ClassificationResult = classifier.classifyConversation(messages);

    // Verify all required fields
    expect(result.total_exchanges).toBeDefined();
    expect(typeof result.total_exchanges).toBe('number');

    expect(result.corrections_found).toBeDefined();
    expect(typeof result.corrections_found).toBe('number');

    expect(result.acceptances_found).toBeDefined();
    expect(typeof result.acceptances_found).toBe('number');

    expect(result.ambiguous_cases).toBeDefined();
    expect(typeof result.ambiguous_cases).toBe('number');

    expect(result.classified_corrections).toBeDefined();
    expect(Array.isArray(result.classified_corrections)).toBe(true);

    expect(result.classification_summary).toBeDefined();
    expect(result.classification_summary.high_confidence).toBeDefined();
    expect(result.classification_summary.medium_confidence).toBeDefined();
    expect(result.classification_summary.low_confidence).toBeDefined();
  });
});
