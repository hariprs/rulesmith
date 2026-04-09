/**
 * Unit Tests for Message Templates (Story 2-7)
 *
 * Test Pyramid Level: Unit (Business Logic)
 *
 * These tests validate the MessageTemplates class which is responsible for
 * generating user-facing messages following AR22-style formatting.
 *
 * Tests cover:
 * - Template generation for all message types
 * - AR22-style formatting (problem + explanation + guidance)
 * - Edge cases and boundary conditions
 * - Consistency across all message types
 * - Friendly, non-blaming language
 *
 * @todo Remove this todo when implementation is complete
 */

import { MessageTemplates } from '../../src/message-templates';
import { ValidationResult } from '../../src/conversation-length-validator';

// ============================================================================
// TEST FIXTURES
// ============================================================================

describe('MessageTemplates - Test Setup', () => {
  test('should instantiate MessageTemplates', () => {
    const templates = new MessageTemplates();
    expect(templates).toBeDefined();
    expect(templates).toBeInstanceOf(MessageTemplates);
  });

  test('should export all required methods', () => {
    const templates = new MessageTemplates();
    expect(typeof templates.tooFewSuggestions).toBe('function');
    expect(typeof templates.tooFewExchanges).toBe('function');
    expect(typeof templates.tooFewBoth).toBe('function');
    expect(typeof templates.noCorrectionsFound).toBe('function');
  });
});

// ============================================================================
// TOO FEW SUGGESTIONS TEMPLATE
// ============================================================================

describe('MessageTemplates - tooFewSuggestions', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should generate message with threshold and actual values', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('5');
    expect(message).toContain('2');
    expect(message).toContain('AI suggestions');
  });

  test('should include problem statement', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('too short for pattern analysis');
  });

  test('should include required threshold', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('Required: 5 AI suggestions or more');
  });

  test('should include actual count found', () => {
    const message = templates.tooFewSuggestions(5, 3);

    expect(message).toContain('Found: 3 AI suggestions');
  });

  test('should explain why pattern analysis requires AI suggestions', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('Pattern analysis requires multiple AI suggestions');
    expect(message).toContain('identify recurring correction patterns');
  });

  test('should provide actionable guidance', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('💡');
    expect(message).toContain('Continue your conversation');
    expect(message).toContain('more AI interactions');
    expect(message).toContain('/improve-rules again');
  });

  test('should provide specific next step', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('Next:');
    expect(message).toContain('Have at least 5 conversations');
    expect(message).toContain('corrections to AI suggestions');
  });

  test('should use AR22-style formatting', () => {
    const message = templates.tooFewSuggestions(5, 2);

    // Check for visual separators
    expect(message).toMatch(/━━━━|━━━|═|─/);

    // Check for header
    expect(message).toContain('📊');
    expect(message).toContain('CONVERSATION ANALYSIS');

    // Check for problem + explanation + guidance structure
    expect(message).toContain('too short'); // Problem
    expect(message).toContain('Pattern analysis requires'); // Explanation
    expect(message).toContain('💡'); // Guidance indicator
  });

  test('should use friendly, non-blaming language', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).not.toMatch(/you failed|error|wrong|bad|incorrect/i);
    expect(message).toMatch(/continue|try|can|more|again/i);
  });

  test('should handle different threshold values', () => {
    const message1 = templates.tooFewSuggestions(3, 1);
    expect(message1).toContain('3 AI suggestions');
    expect(message1).toContain('Found: 1 AI suggestions');

    const message2 = templates.tooFewSuggestions(10, 5);
    expect(message2).toContain('10 AI suggestions');
    expect(message2).toContain('Found: 5 AI suggestions');
  });

  test('should handle edge case of zero suggestions', () => {
    const message = templates.tooFewSuggestions(5, 0);

    expect(message).toContain('Found: 0 AI suggestions');
  });

  test('should present technical details clearly', () => {
    const message = templates.tooFewSuggestions(5, 2);

    // Numbers should be clearly presented
    expect(message).toContain('5');
    expect(message).toContain('2');

    // Technical term should be explained
    if (message.includes('pattern analysis')) {
      expect(message).toMatch(/identify|detect|recurring/i);
    }
  });

  test('should generate consistent message format across calls', () => {
    const message1 = templates.tooFewSuggestions(5, 2);
    const message2 = templates.tooFewSuggestions(5, 2);

    expect(message1).toBe(message2);
  });

  test('should handle boundary condition (threshold equals actual)', () => {
    const message = templates.tooFewSuggestions(5, 5);

    expect(message).toContain('5 AI suggestions');
    expect(message).toContain('Found: 5 AI suggestions');
  });

  test('should handle large numbers', () => {
    const message = templates.tooFewSuggestions(100, 50);

    expect(message).toContain('100 AI suggestions');
    expect(message).toContain('Found: 50 AI suggestions');
  });
});

// ============================================================================
// TOO FEW EXCHANGES TEMPLATE
// ============================================================================

describe('MessageTemplates - tooFewExchanges', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should generate message with threshold and actual values', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('10');
    expect(message).toContain('7');
    expect(message).toContain('message exchanges');
  });

  test('should include problem statement', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('too short for pattern analysis');
  });

  test('should include required threshold', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('Required: 10 message exchanges or more');
  });

  test('should include actual count found', () => {
    const message = templates.tooFewExchanges(10, 5);

    expect(message).toContain('Found: 5 message exchanges');
  });

  test('should explain why pattern analysis requires conversation history', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('requires enough conversation history');
    expect(message).toContain('identify meaningful patterns');
  });

  test('should provide actionable guidance', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('💡');
    expect(message).toContain('Continue your conversation');
    expect(message).toContain('more exchanges');
    expect(message).toContain('/improve-rules again');
  });

  test('should provide specific next step', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).toContain('Next:');
    expect(message).toContain('Have at least 10');
    expect(message).toContain('back-and-forth exchanges');
  });

  test('should use AR22-style formatting', () => {
    const message = templates.tooFewExchanges(10, 7);

    // Check for visual separators
    expect(message).toMatch(/━━━━|━━━|═|─/);

    // Check for header
    expect(message).toContain('📊');
    expect(message).toContain('CONVERSATION ANALYSIS');

    // Check for problem + explanation + guidance structure
    expect(message).toContain('too short'); // Problem
    expect(message).toContain('requires'); // Explanation
    expect(message).toContain('💡'); // Guidance indicator
  });

  test('should use friendly, non-blaming language', () => {
    const message = templates.tooFewExchanges(10, 7);

    expect(message).not.toMatch(/you failed|error|wrong|bad|incorrect/i);
    expect(message).toMatch(/continue|try|can|more|again/i);
  });

  test('should handle different threshold values', () => {
    const message1 = templates.tooFewExchanges(5, 3);
    expect(message1).toContain('5 message exchanges');
    expect(message1).toContain('Found: 3 message exchanges');

    const message2 = templates.tooFewExchanges(20, 10);
    expect(message2).toContain('20 message exchanges');
    expect(message2).toContain('Found: 10 message exchanges');
  });

  test('should handle edge case of zero exchanges', () => {
    const message = templates.tooFewExchanges(10, 0);

    expect(message).toContain('Found: 0 message exchanges');
  });

  test('should present technical details clearly', () => {
    const message = templates.tooFewExchanges(10, 7);

    // Numbers should be clearly presented
    expect(message).toContain('10');
    expect(message).toContain('7');

    // Technical term should be explained
    if (message.includes('conversation history')) {
      expect(message).toMatch(/identify|meaningful|patterns/i);
    }
  });

  test('should generate consistent message format across calls', () => {
    const message1 = templates.tooFewExchanges(10, 7);
    const message2 = templates.tooFewExchanges(10, 7);

    expect(message1).toBe(message2);
  });

  test('should handle boundary condition (threshold equals actual)', () => {
    const message = templates.tooFewExchanges(10, 10);

    expect(message).toContain('10 message exchanges');
    expect(message).toContain('Found: 10 message exchanges');
  });

  test('should handle large numbers', () => {
    const message = templates.tooFewExchanges(100, 50);

    expect(message).toContain('100 message exchanges');
    expect(message).toContain('Found: 50 message exchanges');
  });
});

// ============================================================================
// TOO FEW BOTH TEMPLATE
// ============================================================================

describe('MessageTemplates - tooFewBoth', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  const createValidationResult = (
    metric: 'ai_suggestions' | 'message_exchanges',
    threshold: number,
    actual: number
  ): ValidationResult => ({
    isValid: false,
    threshold,
    actual,
    metric,
  });

  test('should generate message with both thresholds', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('AI suggestions');
    expect(message).toContain('Exchanges');
    expect(message).toContain('5');
    expect(message).toContain('10');
    expect(message).toContain('3');
    expect(message).toContain('7');
  });

  test('should show both threshold requirements', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('Required: 5 AI suggestions or more');
    expect(message).toContain('Required: 10 message exchanges or more');
  });

  test('should show actual counts for both metrics', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('Found (AI Suggestions): 3 suggestions');
    expect(message).toContain('Found (Exchanges): 7 exchanges');
  });

  test('should show most restrictive threshold first (suggestions)', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    // AI suggestions (5) is more restrictive than exchanges (10)
    const suggestionsIndex = message.indexOf('AI Suggestions');
    const exchangesIndex = message.indexOf('Exchanges');
    expect(suggestionsIndex).toBeLessThan(exchangesIndex);
  });

  test('should include problem statement', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('too short for pattern analysis');
  });

  test('should explain why both are required', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('both sufficient AI suggestions');
    expect(message).toContain('enough conversation history');
    expect(message).toContain('identify meaningful patterns');
  });

  test('should provide actionable guidance addressing both issues', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('💡');
    expect(message).toContain('Continue your conversation');
    expect(message).toContain('more interactions');
    expect(message).toContain('exchanges');
    expect(message).toContain('/improve-rules again');
  });

  test('should provide specific next step addressing both', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('Next:');
    expect(message).toContain('5 AI corrections');
    expect(message).toContain('10 total message exchanges');
  });

  test('should use AR22-style formatting', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    // Check for visual separators
    expect(message).toMatch(/━━━━|━━━|═|─/);

    // Check for header
    expect(message).toContain('📊');
    expect(message).toContain('CONVERSATION ANALYSIS');

    // Check for problem + explanation + guidance structure
    expect(message).toContain('too short'); // Problem
    expect(message).toContain('requires'); // Explanation
    expect(message).toContain('💡'); // Guidance indicator
  });

  test('should use friendly, non-blaming language', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).not.toMatch(/you failed|error|wrong|bad|incorrect/i);
    expect(message).toMatch(/continue|try|can|more|again/i);
  });

  test('should handle different threshold combinations', () => {
    const suggestions1 = createValidationResult('ai_suggestions', 3, 1);
    const exchanges1 = createValidationResult('message_exchanges', 5, 3);
    const message1 = templates.tooFewBoth(suggestions1, exchanges1);

    expect(message1).toContain('3 AI suggestions');
    expect(message1).toContain('1 suggestions');
    expect(message1).toContain('5 message exchanges');
    expect(message1).toContain('3 exchanges');

    const suggestions2 = createValidationResult('ai_suggestions', 8, 5);
    const exchanges2 = createValidationResult('message_exchanges', 15, 10);
    const message2 = templates.tooFewBoth(suggestions2, exchanges2);

    expect(message2).toContain('8 AI suggestions');
    expect(message2).toContain('5 suggestions');
    expect(message2).toContain('15 message exchanges');
    expect(message2).toContain('10 exchanges');
  });

  test('should handle edge case of zero for both metrics', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 0);
    const exchanges = createValidationResult('message_exchanges', 10, 0);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('Found (AI Suggestions): 0 suggestions');
    expect(message).toContain('Found (Exchanges): 0 exchanges');
  });

  test('should generate consistent message format across calls', () => {
    const suggestions = createValidationResult('ai_suggestions', 5, 3);
    const exchanges = createValidationResult('message_exchanges', 10, 7);

    const message1 = templates.tooFewBoth(suggestions, exchanges);
    const message2 = templates.tooFewBoth(suggestions, exchanges);

    expect(message1).toBe(message2);
  });

  test('should handle large numbers', () => {
    const suggestions = createValidationResult('ai_suggestions', 100, 50);
    const exchanges = createValidationResult('message_exchanges', 200, 100);

    const message = templates.tooFewBoth(suggestions, exchanges);

    expect(message).toContain('100 AI suggestions');
    expect(message).toContain('50 suggestions');
    expect(message).toContain('200 message exchanges');
    expect(message).toContain('100 exchanges');
  });
});

// ============================================================================
// NO CORRECTIONS FOUND TEMPLATE
// ============================================================================

describe('MessageTemplates - noCorrectionsFound', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should generate no corrections message', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toBeDefined();
    expect(message.length).toBeGreaterThan(0);
  });

  test('should include problem statement', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('No correction patterns were found');
  });

  test('should explain three possible reasons', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('All AI suggestions were accepted without corrections');
    expect(message).toContain('Corrections were too diverse');
    expect(message).toContain('one-time topics');
  });

  test('should use bullet points for readability', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('•');
  });

  test('should provide actionable guidance', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('💡');
    expect(message).toContain('To discover patterns, try');
    expect(message).toContain('making more corrections');
    expect(message).toContain('having longer conversations');
    expect(message).toContain('running /improve-rules');
  });

  test('should provide specific next step', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('Next:');
    expect(message).toContain('Continue your conversation');
    expect(message).toContain('make more corrections');
  });

  test('should use AR22-style formatting', () => {
    const message = templates.noCorrectionsFound();

    // Check for visual separators
    expect(message).toMatch(/━━━━|━━━|═|─/);

    // Check for header
    expect(message).toContain('📊');
    expect(message).toContain('CONVERSATION ANALYSIS');

    // Check for problem + explanation + guidance structure
    expect(message).toContain('No correction patterns'); // Problem
    expect(message).toContain('This can happen when'); // Explanation
    expect(message).toContain('💡'); // Guidance indicator
  });

  test('should use friendly, non-blaming language', () => {
    const message = templates.noCorrectionsFound();

    expect(message).not.toMatch(/you failed|error|wrong|bad|incorrect/i);
    expect(message).toMatch(/try|can|continue|more/i);
  });

  test('should generate consistent message format across calls', () => {
    const message1 = templates.noCorrectionsFound();
    const message2 = templates.noCorrectionsFound();

    expect(message1).toBe(message2);
  });

  test('should explain that no corrections is expected behavior', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('This can happen when');
    expect(message).not.toMatch(/error|failed|wrong/i);
  });

  test('should provide multiple actionable suggestions', () => {
    const message = templates.noCorrectionsFound();

    expect(message).toContain('•');
    const bulletPoints = message.split('•').filter(s => s.trim().length > 0);
    expect(bulletPoints.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// CONSISTENCY ACROSS ALL TEMPLATES
// ============================================================================

describe('MessageTemplates - Consistency', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should use consistent header format across all messages', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      expect(message).toContain('📊');
      expect(message).toContain('CONVERSATION ANALYSIS');
    });
  });

  test('should use consistent visual separators across all messages', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      expect(message).toMatch(/━━━━|━━━|═|─/);
    });
  });

  test('should use consistent AR22-style structure across all messages', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      // All messages should have problem statement
      expect(message).toMatch(/too short|No correction/i);

      // All messages should have explanation
      expect(message).toMatch(/requires|can happen when/i);

      // All messages should have guidance
      expect(message).toContain('💡');
    });
  });

  test('should use consistent friendly language across all messages', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      expect(message).not.toMatch(/you failed|error|wrong|bad|incorrect/i);
      expect(message).toMatch(/continue|try|can|more|again/i);
    });
  });

  test('should include "Next:" step in all messages', () => {
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

    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.tooFewBoth(suggestionsValidation, exchangesValidation),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      expect(message).toContain('Next:');
    });
  });

  test('should use consistent emoji usage', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      // Should have the emoji indicator
      expect(message).toContain('💡');
    });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('MessageTemplates - Edge Cases', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should handle threshold of 1', () => {
    const message = templates.tooFewSuggestions(1, 0);
    expect(message).toContain('1 AI suggestions');
    expect(message).toContain('Found: 0 AI suggestions');
  });

  test('should handle very large thresholds', () => {
    const message = templates.tooFewExchanges(1000, 500);
    expect(message).toContain('1000 message exchanges');
    expect(message).toContain('Found: 500 message exchanges');
  });

  test('should handle decimal values gracefully', () => {
    const message = templates.tooFewSuggestions(5.5, 3.7);
    expect(message).toContain('5.5'); // or rounded version
  });

  test('should handle negative values gracefully', () => {
    const message = templates.tooFewSuggestions(5, -1);
    expect(message).toContain('-1'); // Should display what was given
  });

  test('should handle validation results with metric property', () => {
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

    expect(() => {
      templates.tooFewBoth(suggestionsValidation, exchangesValidation);
    }).not.toThrow();
  });

  test('should handle zero threshold', () => {
    const message = templates.tooFewSuggestions(0, 0);
    expect(message).toBeDefined();
    expect(message.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// MESSAGE LENGTH AND READABILITY
// ============================================================================

describe('MessageTemplates - Message Length and Readability', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should generate reasonably short messages', () => {
    const message = templates.tooFewSuggestions(5, 2);

    // Messages should be concise but complete
    expect(message.length).toBeLessThan(1000);
  });

  test('should use line breaks for readability', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('\n');
  });

  test('should not have excessive whitespace', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).not.toMatch(/\n\s{5,}/); // No 5+ spaces after newline
  });

  test('should be properly formatted without trailing whitespace', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      const lines = message.split('\n');
      lines.forEach(line => {
        expect(line).toBe(line.trimRight()); // No trailing whitespace
      });
    });
  });

  test('should be readable without jargon', () => {
    const message = templates.tooFewSuggestions(5, 2);

    // If technical terms are used, they should be explained
    if (message.includes('pattern analysis')) {
      expect(message).toMatch(/identify|detect|recurring/i);
    }
  });
});

// ============================================================================
// INTERNATIONALIZATION CONSIDERATIONS
// ============================================================================

describe('MessageTemplates - i18n Considerations', () => {
  let templates: MessageTemplates;

  beforeEach(() => {
    templates = new MessageTemplates();
  });

  test('should handle unicode characters correctly', () => {
    const message = templates.tooFewSuggestions(5, 2);

    expect(message).toContain('📊');
    expect(message).toContain('💡');
  });

  test('should not have encoding issues', () => {
    const messages = [
      templates.tooFewSuggestions(5, 2),
      templates.tooFewExchanges(10, 7),
      templates.noCorrectionsFound(),
    ];

    messages.forEach(message => {
      expect(() => {
        Buffer.from(message, 'utf-8');
      }).not.toThrow();
    });
  });

  test('should use clear, simple language', () => {
    const message = templates.tooFewSuggestions(5, 2);

    // Should avoid complex technical jargon
    expect(message).not.toMatch(/optimization|heuristic|algorithmic/i);
  });
});
