/**
 * E2E Tests for Correction Classification Workflow (Story 2-2)
 *
 * TDD Red Phase: Failing E2E acceptance tests
 *
 * These tests verify CRITICAL USER JOURNEYS that require full workflow testing.
 * Following test pyramid principles: E2E tests are minimal and only for:
 * - Critical user workflows that span multiple components
 * - Integration points that cannot be tested at unit/integration level
 *
 * NOT for: testing individual features (those belong in unit/integration tests)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  CorrectionClassifier,
  ClassificationResult,
} from '../../src/correction-classifier';
import {
  parseConversationMessages,
  ConversationMessage,
  validateConversationStructure,
  countMessageExchanges,
} from '../../src/conversation-loader';

// ============================================================================
// CRITICAL USER JOURNEY: Complete Analysis Pipeline
// ============================================================================

describe('E2E: Complete Correction Classification Workflow', () => {
  test('should process full workflow: load -> validate -> classify -> output', () => {
    // CRITICAL: This is the core user journey that cannot be tested at lower levels
    //
    // User Story: As a user, I want to analyze my conversation to identify
    // genuine improvement patterns (corrections) vs. accepted suggestions
    //
    // This workflow spans:
    // - Story 2-1: Conversation loading and parsing
    // - Story 2-2: Correction classification
    // - Story 2-3+: Future pattern analysis (dependent on this working)

    // Step 1: Raw conversation from real-world scenario
    const rawConversation = `
User: I'm having issues with async error handling
Assistant: You should use try/catch blocks with async/await
User: yes, that makes sense
Assistant: Here's an example implementation
User: perfect, thanks!
Assistant: You should also add error types
User: no, keep it simple for now
Assistant: What about adding logging?
User: maybe later
    `;

    // Step 2: Parse conversation (Story 2-1)
    const messages: ConversationMessage[] = parseConversationMessages(rawConversation);

    // Step 3: Validate structure (Story 2-1)
    const validation = validateConversationStructure(messages);
    expect(validation.valid).toBe(true);

    // Step 4: Count exchanges (Story 2-1)
    const stats = countMessageExchanges(messages);
    expect(stats.totalExchanges).toBeGreaterThan(0);

    // Step 5: Classify corrections (Story 2-2) - THE CORE FEATURE BEING TESTED
    const classifier = new CorrectionClassifier();
    const result: ClassificationResult = classifier.classifyConversation(messages);

    // Step 6: Verify output meets user needs
    // User needs: Identify genuine improvements (corrections) vs. acceptances

    // Should identify the correction
    expect(result.corrections_found).toBe(1);
    expect(result.classified_corrections).toHaveLength(1);

    const correction = result.classified_corrections[0];
    expect(correction.original_suggestion).toContain('error types');
    expect(correction.user_correction).toContain('keep it simple');
    expect(correction.classification.type).toBe('correction');

    // Should count acceptances
    expect(result.acceptances_found).toBe(2);

    // Should flag ambiguous case
    expect(result.ambiguous_cases).toBe(1);

    // Should provide summary for user
    expect(result.classification_summary).toBeDefined();
    expect(result.total_exchanges).toBe(4);

    // CRITICAL ASSERTION: User can distinguish corrections from acceptances
    // This enables FR3: "System can distinguish between accepted suggestions and corrections"
    expect(result.corrections_found).toBeLessThan(result.total_exchanges);
    expect(result.acceptances_found).toBeGreaterThan(0);
  });
});

// ============================================================================
// CRITICAL INTEGRATION: Error Handling Across Pipeline
// ============================================================================

describe('E2E: Error Handling Across Classification Pipeline', () => {
  test('should handle malformed data gracefully through entire pipeline', () => {
    // CRITICAL: User may provide malformed conversation data
    // System should not crash and should provide actionable guidance

    const malformedConversation = `
User:
Assistant: Try this
User: x
Assistant: Use that
User: !@#$%
    `;

    // Pipeline should not crash
    expect(() => {
      const messages = parseConversationMessages(malformedConversation);
      const validation = validateConversationStructure(messages);
      const classifier = new CorrectionClassifier();
      const result = classifier.classifyConversation(messages);

      // Should still produce output with appropriate flags
      expect(result.ambiguous_cases).toBeGreaterThan(0);
    }).not.toThrow();
  });

  test('should provide actionable error messages for invalid input', () => {
    // CRITICAL: When system fails, user needs clear guidance on how to fix

    const classifier = new CorrectionClassifier();

    try {
      classifier.classifyConversation(null as any);
      fail('Expected error to be thrown');
    } catch (error: any) {
      // Verify error is actionable (AR22 compliant)
      expect(error.message).toBeTruthy(); // Brief description
      expect(error.what).toBeTruthy(); // What happened
      expect(error.how).toBeDefined(); // How to fix
      expect(Array.isArray(error.how)).toBe(true);
      expect(error.how.length).toBeGreaterThan(0);
      expect(error.technical).toBeTruthy(); // Technical details
    }
  });
});

// ============================================================================
// CRITICAL DATA FLOW: Classification Results for Downstream Processing
// ============================================================================

describe('E2E: Data Flow for Downstream Pattern Detection', () => {
  test('should provide filtered correction list for Story 2.3 (Role-Agnostic Analysis)', () => {
    // CRITICAL: Story 2.3 depends on receiving only corrections, not acceptances
    // This E2E test ensures the integration contract is met

    const conversation = `
User: Help me refactor
Assistant: Use functional programming
User: yes
Assistant: Add type annotations
User: no, use interfaces instead
Assistant: Consider immutability
User: thanks
    `;

    const messages = parseConversationMessages(conversation);
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    // CRITICAL ASSERTION for Story 2.3 integration:
    // classified_corrections must NOT include acceptances
    expect(result.corrections_found).toBe(1);
    expect(result.acceptances_found).toBe(2);
    expect(result.classified_corrections).toHaveLength(1);

    // The only correction should be the actual modification
    const correction = result.classified_corrections[0];
    expect(correction.classification.type).toBe('correction');
    expect(correction.original_suggestion).toContain('type annotations');
  });

  test('should include ambiguous cases with manual review flag for Story 2.4 (Pattern Detection)', () => {
    // CRITICAL: Story 2.4 needs to know which cases require manual review
    // to avoid including low-confidence data in pattern detection

    const conversation = `
User: Should I use React?
Assistant: Yes, it's popular
User: maybe
Assistant: What about Vue?
User: hmm
    `;

    const messages = parseConversationMessages(conversation);
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    // CRITICAL ASSERTION for Story 2.4 integration:
    // Ambiguous cases must be flagged for manual review
    expect(result.ambiguous_cases).toBeGreaterThan(0);

    result.classified_corrections.forEach(correction => {
      if (correction.classification.confidence < 0.6) {
        expect(correction.classification.requires_manual_review).toBe(true);
      }
    });
  });
});

// ============================================================================
// CRITICAL PERFORMANCE: Large Conversation Processing
// ============================================================================

describe('E2E: Performance with Real-World Conversations', () => {
  test('should process large conversation within performance budget', () => {
    // CRITICAL: Users may have long conversations (100+ exchanges)
    // System must process efficiently to provide timely feedback

    // Generate realistic large conversation
    const messages: ConversationMessage[] = [];

    // Simulate 50 suggestion/response pairs
    for (let i = 0; i < 50; i++) {
      messages.push({
        speaker: 'assistant',
        content: `Suggestion ${i}: Consider using ${['TypeScript', 'async/await', 'error handling', 'logging'][i % 4]}`
      });

      // Mix of acceptances, corrections, and ambiguous responses
      const responseType = i % 3;
      if (responseType === 0) {
        messages.push({ speaker: 'user', content: 'yes' });
      } else if (responseType === 1) {
        messages.push({ speaker: 'user', content: 'no, try again' });
      } else {
        messages.push({ speaker: 'user', content: 'maybe' });
      }
    }

    // Measure performance
    const startTime = Date.now();
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);
    const endTime = Date.now();

    // CRITICAL ASSERTION: Must complete within 3 seconds for 50 exchanges
    // This ensures system is responsive for real-world usage
    expect(endTime - startTime).toBeLessThan(3000);

    // Verify correctness
    expect(result.total_exchanges).toBe(50);
    expect(result.corrections_found + result.acceptances_found + result.ambiguous_cases)
      .toBeGreaterThan(0);
  });
});

// ============================================================================
// CRITICAL USER JOURNEY: Platform-Specific Workflows
// ============================================================================

describe('E2E: Platform-Specific Conversation Workflows', () => {
  test('should handle Claude Code conversation workflow', () => {
    // CRITICAL: Verify system works with actual Claude Code conversation format

    const claudeCodeConversation = `
User: I need help with TypeScript strict mode
Assistant: Enable strict mode in tsconfig.json
User: yes
Assistant: Also enable noImplicitAny
User: no, that's too strict
    `;

    const messages = parseConversationMessages(claudeCodeConversation);
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    expect(result.total_exchanges).toBe(2);
    expect(result.acceptances_found).toBe(1);
    expect(result.corrections_found).toBe(1);
  });

  test('should handle Cursor conversation workflow', () => {
    // CRITICAL: Verify system works with Cursor format

    const cursorConversation = `
**User:** How do I handle async errors?
**Assistant:** Use try/catch with async/await
**User:** perfect
**Assistant:** Also add error types
**User:** maybe later
    `;

    const messages = parseConversationMessages(cursorConversation);
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    expect(result.total_exchanges).toBe(2);
    expect(result.acceptances_found).toBe(1);
    expect(result.ambiguous_cases).toBe(1);
  });

  test('should handle code-heavy conversations', () => {
    // CRITICAL: Real conversations often include code blocks
    // System must handle these correctly

    const codeHeavyConversation = `
User: Refactor this function
Assistant: Here's a refactored version:
\`\`\`typescript
function processData(data: string): Result {
  return JSON.parse(data);
}
\`\`\`
User: perfect, thanks!
Assistant: Add error handling
User: yes but use try/catch
Assistant: Here's the updated version:
\`\`\`typescript
function processData(data: string): Result {
  try {
    return JSON.parse(data);
  } catch (error) {
    throw new Error('Invalid data');
  }
}
\`\`\`
User: thanks
    `;

    const messages = parseConversationMessages(codeHeavyConversation);
    const classifier = new CorrectionClassifier();
    const result = classifier.classifyConversation(messages);

    // Should correctly classify despite code blocks
    expect(result.total_exchanges).toBe(3);
    expect(result.acceptances_found).toBeGreaterThan(0);
    expect(result.corrections_found).toBeGreaterThan(0);
  });
});
