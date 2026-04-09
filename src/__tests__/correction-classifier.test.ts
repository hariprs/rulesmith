/**
 * Unit Tests for Correction Classifier (Story 2-2)
 *
 * TDD Red Phase: Failing tests that will drive implementation
 *
 * Comprehensive test suite following the test architecture principle:
 * unit > integration > E2E
 *
 * Tests cover:
 * - Acceptance pattern detection (yes, thanks, good, etc.)
 * - Correction pattern detection (modifications, rejections)
 * - Ambiguous case detection with threshold validation
 * - Confidence scoring algorithm
 * - Classification reasoning generation
 * - String similarity for "applied without modification"
 * - Edge cases (empty, special characters, Unicode, code blocks)
 * - AR22 compliant error handling
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  CorrectionClassifier,
  ClassificationDecision,
  ClassifiedCorrection,
  ClassificationResult,
  ClassificationErrorCode,
  AR22Error,
} from '../../src/correction-classifier';
import { ConversationMessage } from '../../src/conversation-loader';

// ============================================================================
// TEST UTILITIES & SETUP
// ============================================================================

describe('Correction Classifier - Test Utilities', () => {
  test('should import CorrectionClassifier class', () => {
    expect(typeof CorrectionClassifier).toBe('function');
    expect(() => new CorrectionClassifier()).not.toThrow();
  });

  test('should import classification interfaces', () => {
    // Interfaces are types, so we can't test them directly at runtime
    // But we can verify that the classifier can create objects with these shapes
    const classifier = new CorrectionClassifier();
    expect(classifier).toBeInstanceOf(CorrectionClassifier);
  });

  test('should import error codes enum', () => {
    expect(ClassificationErrorCode).toBeDefined();
    expect(ClassificationErrorCode.CLASSIFICATION_FAILED).toBe('CLASSIFICATION_FAILED');
    expect(ClassificationErrorCode.AMBIGUOUS_CONTENT).toBe('AMBIGUOUS_CONTENT');
    expect(ClassificationErrorCode.INVALID_INPUT).toBe('INVALID_INPUT');
    expect(ClassificationErrorCode.PATTERN_MATCH_ERROR).toBe('PATTERN_MATCH_ERROR');
  });

  test('AR22Error should be throwable with classification codes', () => {
    expect(() => {
      throw new AR22Error(
        'Test classification error',
        {
          what: 'Test what happened',
          how: ['Step 1', 'Step 2'],
          technical: 'Test technical details'
        },
        ClassificationErrorCode.CLASSIFICATION_FAILED
      );
    }).toThrow(AR22Error);
  });
});

// ============================================================================
// ACCEPTANCE PATTERN DETECTION (AC: 1)
// ============================================================================

describe('Correction Classifier - Acceptance Patterns', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  describe('Direct Agreement Patterns', () => {
    test('should classify "yes" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Consider using async/await',
        'yes'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
      expect(decision.requires_manual_review).toBe(false);
      expect(decision.reasoning).toContain('acceptance');
      expect(decision.reasoning).toContain('yes');
    });

    test('should classify "yeah" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Try this approach',
        'yeah, that works'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
      expect(decision.requires_manual_review).toBe(false);
    });

    test('should classify "yep" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Use this pattern',
        'yep'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should classify "correct" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'This is the right approach',
        'correct'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should classify "right" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Use this method',
        'right, let me try that'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "exactly" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'This matches what you need',
        'exactly'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should be case-insensitive for agreement patterns', () => {
      const decision1 = classifier.classifyExchange('Try this', 'YES');
      const decision2 = classifier.classifyExchange('Try this', 'Yes');
      const decision3 = classifier.classifyExchange('Try this', 'yes');

      expect(decision1.type).toBe('acceptance');
      expect(decision2.type).toBe('acceptance');
      expect(decision3.type).toBe('acceptance');
    });
  });

  describe('Gratitude Patterns', () => {
    test('should classify "thanks" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Here is the solution',
        'thanks'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
      expect(decision.requires_manual_review).toBe(false);
      expect(decision.reasoning).toMatch(/gratitude/i);
    });

    test('should classify "thank you" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'This should work',
        'thank you'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should classify "perfect" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Try this implementation',
        'perfect'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should classify "great" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Use this approach',
        'great'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "good" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'This is a good solution',
        'good'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Confirmation Patterns', () => {
    test('should classify "sounds good" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Consider using TypeScript',
        'sounds good'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "looks good" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Here is the code',
        'looks good'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "that works" as acceptance', () => {
      const decision = classifier.classifyExchange(
        'Try this method',
        'that works'
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Applied Without Modification (String Similarity)', () => {
    test('should detect acceptance when user applies suggestion without modification', () => {
      const suggestion = 'function hello() { console.log("Hello"); }';
      const applied = 'function hello() { console.log("Hello"); }';

      const decision = classifier.classifyExchange(suggestion, applied);

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
      expect(decision.reasoning).toMatch(/applied without modification/i);
    });

    test('should detect acceptance with minor whitespace differences', () => {
      const suggestion = 'function hello() { console.log("Hello"); }';
      const applied = 'function hello() { console.log("Hello");   }'; // Extra space

      const decision = classifier.classifyExchange(suggestion, applied);

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.85);
    });

    test('should classify as correction when modification is significant', () => {
      const suggestion = 'function hello() { console.log("Hello"); }';
      const modified = 'function hello() { console.log("Hello World"); }'; // Changed content

      const decision = classifier.classifyExchange(suggestion, modified);

      expect(decision.type).toBe('correction');
      expect(decision.reasoning).toMatch(/modification/i);
    });
  });
});

// ============================================================================
// CORRECTION PATTERN DETECTION (AC: 1)
// ============================================================================

describe('Correction Classifier - Correction Patterns', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  describe('Direct Rejection Patterns', () => {
    test('should classify "no" as correction', () => {
      const decision = classifier.classifyExchange(
        'Use this approach',
        'no'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
      expect(decision.requires_manual_review).toBe(false);
    });

    test('should classify "not quite" as correction', () => {
      const decision = classifier.classifyExchange(
        'This is the solution',
        'not quite'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "that\'s not right" as correction', () => {
      const decision = classifier.classifyExchange(
        'Try this method',
        'that\'s not right'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Request for Change Patterns', () => {
    test('should classify "try again" as correction', () => {
      const decision = classifier.classifyExchange(
        'Here is a solution',
        'try again'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "change it to" as correction', () => {
      const decision = classifier.classifyExchange(
        'Use this pattern',
        'change it to use async'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should classify "instead use" as correction', () => {
      const decision = classifier.classifyExchange(
        'Consider React',
        'instead use Vue'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe('Modification Patterns', () => {
    test('should classify alternative implementation as correction', () => {
      const decision = classifier.classifyExchange(
        'Use for loop',
        'I prefer using map instead'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.7);
    });

    test('should classify "yes but change X" as correction', () => {
      const decision = classifier.classifyExchange(
        'Use async/await',
        'yes but add error handling'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.5);
      expect(decision.reasoning).toMatch(/partial acceptance/i);
    });

    test('should detect code modifications', () => {
      const suggestion = 'const x = 1;';
      const modification = 'const x = 2;';

      const decision = classifier.classifyExchange(suggestion, modification);

      expect(decision.type).toBe('correction');
      expect(decision.reasoning).toMatch(/modification/i);
    });
  });
});

// ============================================================================
// AMBIGUOUS CASE DETECTION (AC: 1)
// ============================================================================

describe('Correction Classifier - Ambiguous Cases', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  describe('Empty and Minimal Responses', () => {
    test('should classify empty response as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Try this',
        ''
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBe(0.0);
      expect(decision.requires_manual_review).toBe(true);
      expect(decision.reasoning).toMatch(/empty/i);
    });

    test('should classify single character (not y/n) as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Use this',
        'x'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBeLessThanOrEqual(0.3);
      expect(decision.requires_manual_review).toBe(true);
    });

    test('should classify "ok" as ambiguous (low confidence)', () => {
      const decision = classifier.classifyExchange(
        'Try this approach',
        'ok'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBeLessThan(0.6);
      expect(decision.requires_manual_review).toBe(true);
    });

    test('should classify "maybe" as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Use this pattern',
        'maybe'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBeLessThan(0.6);
      expect(decision.requires_manual_review).toBe(true);
    });
  });

  describe('Mixed Signals', () => {
    test('should classify "yes but..." as correction with moderate confidence', () => {
      const decision = classifier.classifyExchange(
        'Use async/await',
        'yes but I need to handle errors'
      );

      expect(decision.type).toBe('correction');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.5);
      expect(decision.confidence).toBeLessThan(0.8);
    });

    test('should classify mixed positive/negative as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Try this method',
        'good but no, that won\'t work'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBeLessThan(0.6);
      expect(decision.requires_manual_review).toBe(true);
    });
  });

  describe('Special Characters and Edge Cases', () => {
    test('should classify special characters only as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Try this',
        '!@#$%'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBe(0.0);
      expect(decision.requires_manual_review).toBe(true);
    });

    test('should classify code blocks only as ambiguous', () => {
      const decision = classifier.classifyExchange(
        'Try this',
        '```javascript\nconsole.log("test");\n```'
      );

      expect(decision.type).toBe('ambiguous');
      expect(decision.confidence).toBeLessThanOrEqual(0.4);
      expect(decision.requires_manual_review).toBe(true);
    });

    test('should handle Unicode/multilingual responses', () => {
      const decision = classifier.classifyExchange(
        'Use this approach',
        'gracias' // Spanish
      );

      expect(decision.type).toBe('acceptance');
      expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    });

    test('should reduce confidence for very long responses', () => {
      const longResponse = 'a'.repeat(1001);
      const decision = classifier.classifyExchange(
        'Try this',
        longResponse
      );

      // Should have reduced confidence due to length
      expect(decision.confidence).toBeLessThan(1.0);
    });
  });

  describe('Confidence Threshold Validation', () => {
    test('should consistently flag confidence < 0.6 for manual review', () => {
      const testCases = [
        { suggestion: 'Try this', response: 'ok' },
        { suggestion: 'Try this', response: 'maybe' },
        { suggestion: 'Try this', response: 'hmm' },
        { suggestion: 'Try this', response: '' },
        { suggestion: 'Try this', response: 'x' },
      ];

      for (const { suggestion, response } of testCases) {
        const decision = classifier.classifyExchange(suggestion, response);

        if (decision.confidence < 0.6) {
          expect(decision.requires_manual_review).toBe(true);
        }
      }
    });

    test('should not flag confidence >= 0.6 for manual review (unless ambiguous)', () => {
      const testCases = [
        { suggestion: 'Try this', response: 'yes' },
        { suggestion: 'Try this', response: 'thanks' },
        { suggestion: 'Try this', response: 'no' },
        { suggestion: 'Try this', response: 'try again' },
      ];

      for (const { suggestion, response } of testCases) {
        const decision = classifier.classifyExchange(suggestion, response);

        if (decision.confidence >= 0.6 && decision.type !== 'ambiguous') {
          expect(decision.requires_manual_review).toBe(false);
        }
      }
    });
  });
});

// ============================================================================
// CONFIDENCE SCORING (AC: 1)
// ============================================================================

describe('Correction Classifier - Confidence Scoring', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should assign 1.0 for clear pattern matches', () => {
    const decision = classifier.classifyExchange(
      'Use this',
      'yes, that\'s perfect'
    );

    expect(decision.confidence).toBe(1.0);
  });

  test('should assign 0.8-0.9 for strong pattern matches', () => {
    const decision = classifier.classifyExchange(
      'Here is the solution',
      'thanks, that works'
    );

    expect(decision.confidence).toBeGreaterThanOrEqual(0.8);
    expect(decision.confidence).toBeLessThanOrEqual(0.9);
  });

  test('should assign 0.6-0.7 for moderate matches', () => {
    const decision = classifier.classifyExchange(
      'Try this',
      'ok, sounds good'
    );

    expect(decision.confidence).toBeGreaterThanOrEqual(0.6);
    expect(decision.confidence).toBeLessThan(0.8);
  });

  test('should assign < 0.6 for ambiguous cases', () => {
    const decision = classifier.classifyExchange(
      'Try this',
      'maybe'
    );

    expect(decision.confidence).toBeLessThan(0.6);
  });

  test('should reduce confidence for long responses', () => {
    const shortResponse = 'yes';
    const longResponse = 'yes ' + 'a'.repeat(900);

    const shortDecision = classifier.classifyExchange('Try this', shortResponse);
    const longDecision = classifier.classifyExchange('Try this', longResponse);

    expect(longDecision.confidence).toBeLessThan(shortDecision.confidence);
  });

  test('should validate confidence scores are within 0-1 range', () => {
    const testCases = [
      'yes', 'no', 'thanks', 'ok', 'maybe', '', 'x'
    ];

    for (const response of testCases) {
      const decision = classifier.classifyExchange('Try this', response);
      expect(decision.confidence).toBeGreaterThanOrEqual(0.0);
      expect(decision.confidence).toBeLessThanOrEqual(1.0);
    }
  });
});

// ============================================================================
// CLASSIFICATION REASONING (AC: 1)
// ============================================================================

describe('Correction Classifier - Classification Reasoning', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should generate reasoning following template format', () => {
    const decision = classifier.classifyExchange(
      'Use async/await',
      'yes'
    );

    expect(decision.reasoning).toBeDefined();
    expect(typeof decision.reasoning).toBe('string');

    // Check template components: "Classified as [TYPE] because [REASON]. Pattern: [PATTERN_NAME]. Confidence: [SCORE]"
    expect(decision.reasoning).toMatch(/Classified as/i);
    expect(decision.reasoning).toMatch(/because/i);
    expect(decision.reasoning).toMatch(/Pattern:/i);
    expect(decision.reasoning).toMatch(/Confidence:/i);
  });

  test('should include classification type in reasoning', () => {
    const acceptance = classifier.classifyExchange('Try this', 'yes');
    const correction = classifier.classifyExchange('Try this', 'no');

    expect(acceptance.reasoning).toMatch(/acceptance/i);
    expect(correction.reasoning).toMatch(/correction/i);
  });

  test('should include pattern name in reasoning', () => {
    const gratitudeDecision = classifier.classifyExchange('Try this', 'thanks');
    const agreementDecision = classifier.classifyExchange('Try this', 'yes');

    expect(gratitudeDecision.reasoning).toMatch(/gratitude/i);
    expect(agreementDecision.reasoning).toMatch(/agreement/i);
  });

  test('should include confidence score in reasoning', () => {
    const decision = classifier.classifyExchange('Try this', 'yes');

    expect(decision.reasoning).toMatch(/Confidence: 0.\d+/);
  });

  test('should limit reasoning string length to 500 characters', () => {
    const decision = classifier.classifyExchange(
      'Try this very long suggestion that might trigger a longer reasoning string',
      'yes, that is perfect and exactly what I needed, thank you very much'
    );

    expect(decision.reasoning.length).toBeLessThanOrEqual(500);
  });
});

// ============================================================================
// CONVERSATION CLASSIFICATION (AC: 1)
// ============================================================================

describe('Correction Classifier - Conversation Classification', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should classify entire conversation', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Use async/await' },
      { speaker: 'user', content: 'yes' },
      { speaker: 'assistant', content: 'Add error handling' },
      { speaker: 'user', content: 'no, use try/catch instead' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(messages);

    expect(result).toBeDefined();
    expect(result.total_exchanges).toBe(2);
    expect(result.corrections_found).toBe(1);
    expect(result.acceptances_found).toBe(1);
    expect(result.ambiguous_cases).toBe(0);
    expect(result.classified_corrections).toHaveLength(1);
  });

  test('should exclude accepted suggestions from correction list', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Use TypeScript' },
      { speaker: 'user', content: 'yes' },
      { speaker: 'assistant', content: 'Add interfaces' },
      { speaker: 'user', content: 'thanks' },
      { speaker: 'assistant', content: 'Use strict mode' },
      { speaker: 'user', content: 'change to non-strict' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(messages);

    // Only the actual correction should be in the list
    expect(result.classified_corrections).toHaveLength(1);
    expect(result.classified_corrections[0].classification.type).toBe('correction');
    expect(result.acceptances_found).toBe(2);
  });

  test('should provide classification summary', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Try this' },
      { speaker: 'user', content: 'yes' },
      { speaker: 'assistant', content: 'Use that' },
      { speaker: 'user', content: 'maybe' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(messages);

    expect(result.classification_summary).toBeDefined();
    expect(result.classification_summary.high_confidence).toBeGreaterThanOrEqual(0);
    expect(result.classification_summary.medium_confidence).toBeGreaterThanOrEqual(0);
    expect(result.classification_summary.low_confidence).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty conversation', () => {
    const messages: ConversationMessage[] = [];

    const result: ClassificationResult = classifier.classifyConversation(messages);

    expect(result.total_exchanges).toBe(0);
    expect(result.corrections_found).toBe(0);
    expect(result.acceptances_found).toBe(0);
    expect(result.ambiguous_cases).toBe(0);
    expect(result.classified_corrections).toHaveLength(0);
  });

  test('should handle conversation with only assistant messages', () => {
    const messages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Use this' },
      { speaker: 'assistant', content: 'Try that' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(messages);

    // No exchanges without user responses
    expect(result.total_exchanges).toBe(0);
  });
});

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANCE) (AC: 1)
// ============================================================================

describe('Correction Classifier - Error Handling', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should throw AR22Error for null input', () => {
    expect(() => {
      classifier.classifyConversation(null as any);
    }).toThrow(AR22Error);
  });

  test('should throw AR22Error for undefined input', () => {
    expect(() => {
      classifier.classifyConversation(undefined as any);
    }).toThrow(AR22Error);
  });

  test('should throw AR22Error for invalid message structure', () => {
    const invalidMessages = [{}] as any;

    expect(() => {
      classifier.classifyConversation(invalidMessages);
    }).toThrow(AR22Error);
  });

  test('should provide actionable error messages', () => {
    try {
      classifier.classifyConversation(null as any);
      fail('Expected AR22Error to be thrown');
    } catch (error) {
      if (error instanceof AR22Error) {
        expect(error.what).toBeDefined();
        expect(error.how).toBeDefined();
        expect(Array.isArray(error.how)).toBe(true);
        expect(error.how.length).toBeGreaterThan(0);
        expect(error.technical).toBeDefined();
      } else {
        fail(`Expected AR22Error, got ${error}`);
      }
    }
  });

  test('should use correct error codes', () => {
    try {
      classifier.classifyConversation(null as any);
      fail('Expected AR22Error to be thrown');
    } catch (error) {
      if (error instanceof AR22Error) {
        expect(error.code).toBeDefined();
        expect(Object.values(ClassificationErrorCode)).toContain(error.code);
      } else {
        fail(`Expected AR22Error, got ${error}`);
      }
    }
  });

  test('should handle malformed data gracefully', () => {
    const malformedMessages: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Try this' },
      { speaker: 'user', content: '' }, // Empty response
      { speaker: 'assistant', content: 'Use that' },
      { speaker: 'user', content: 'x' }, // Ambiguous
    ];

    const result: ClassificationResult = classifier.classifyConversation(malformedMessages);

    // Should still process, but flag for manual review
    expect(result).toBeDefined();
    expect(result.ambiguous_cases).toBeGreaterThan(0);
  });
});

// ============================================================================
// STRING SIMILARITY (Levenshtein Distance)
// ============================================================================

describe('Correction Classifier - String Similarity', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should detect identical strings as acceptance', () => {
    const decision = classifier.classifyExchange(
      'function test() { return true; }',
      'function test() { return true; }'
    );

    expect(decision.type).toBe('acceptance');
    expect(decision.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should detect minor whitespace differences as acceptance', () => {
    const decision = classifier.classifyExchange(
      'function test() { return true; }',
      'function test() {  return true; }' // Extra space
    );

    expect(decision.type).toBe('acceptance');
  });

  test('should detect significant modifications as correction', () => {
    const decision = classifier.classifyExchange(
      'function test() { return true; }',
      'function test() { return false; }' // Changed value
    );

    expect(decision.type).toBe('correction');
  });

  test('should limit string comparison to first 200 characters for performance', () => {
    const longSuggestion = 'a'.repeat(300) + ' UNIQUE_END';
    const longResponse = 'a'.repeat(300) + ' MODIFIED_END';

    const startTime = Date.now();
    const decision = classifier.classifyExchange(longSuggestion, longResponse);
    const endTime = Date.now();

    // Should complete quickly (not hung on long string comparison)
    expect(endTime - startTime).toBeLessThan(100);
    expect(decision).toBeDefined();
  });

  test('should handle empty strings in similarity calculation', () => {
    const decision = classifier.classifyExchange('', '');

    expect(decision.type).toBe('ambiguous');
    expect(decision.requires_manual_review).toBe(true);
  });
});

// ============================================================================
// CONFIGURATION OPTIONS
// ============================================================================

describe('Correction Classifier - Configuration', () => {
  test('should accept custom manual review threshold', () => {
    const classifier = new CorrectionClassifier({ manual_review_threshold: 0.7 });
    const decision = classifier.classifyExchange('Try this', 'ok');

    // With stricter threshold, 'ok' might be flagged
    expect(decision).toBeDefined();
    if (decision.confidence < 0.7) {
      expect(decision.requires_manual_review).toBe(true);
    }
  });

  test('should allow disabling string similarity', () => {
    const classifier = new CorrectionClassifier({ enable_string_similarity: false });
    const decision = classifier.classifyExchange(
      'function test() { return true; }',
      'function test() { return true; }'
    );

    // Should still work, but without string similarity detection
    expect(decision).toBeDefined();
  });

  test('should allow custom max similarity length', () => {
    const classifier = new CorrectionClassifier({ max_similarity_length: 100 });
    const decision = classifier.classifyExchange('Try this', 'yes');

    expect(decision).toBeDefined();
  });

  test('should allow confidence context multiplier', () => {
    const classifier = new CorrectionClassifier({ confidence_context_multiplier: 0.5 });
    const decision = classifier.classifyExchange('Try this', 'yes');

    // Should have reduced confidence due to multiplier
    expect(decision.confidence).toBeLessThan(1.0);
  });
});

// ============================================================================
// REAL CONVERSATION ACCURACY TESTS
// ============================================================================

describe('Correction Classifier - Real Conversation Accuracy', () => {
  let classifier: CorrectionClassifier;

  beforeEach(() => {
    classifier = new CorrectionClassifier();
  });

  test('should accurately classify realistic conversation exchanges', () => {
    const realisticConversation: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Consider using TypeScript strict mode for better type safety' },
      { speaker: 'user', content: 'Good idea, I\'ll add that' },
      { speaker: 'assistant', content: 'You should also enable noImplicitAny' },
      { speaker: 'user', content: 'no, that\'s too strict for our legacy code' },
      { speaker: 'assistant', content: 'What about using eslint with TypeScript rules?' },
      { speaker: 'user', content: 'yes, that sounds good' },
      { speaker: 'assistant', content: 'Here\'s a sample eslint config' },
      { speaker: 'user', content: 'thanks' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(realisticConversation);

    // Verify classification accuracy
    expect(result.total_exchanges).toBe(4);
    expect(result.acceptances_found).toBeGreaterThanOrEqual(2);
    expect(result.corrections_found).toBeGreaterThanOrEqual(1);
    expect(result.classified_corrections.length).toBeGreaterThan(0);
  });

  test('should handle mixed correction types in real conversation', () => {
    const mixedConversation: ConversationMessage[] = [
      { speaker: 'assistant', content: 'Use async/await' },
      { speaker: 'user', content: 'yes but add error handling' },
      { speaker: 'assistant', content: 'Here\'s the updated code with try/catch' },
      { speaker: 'user', content: 'perfect, thanks' },
    ];

    const result: ClassificationResult = classifier.classifyConversation(mixedConversation);

    // First exchange: partial acceptance (correction)
    // Second exchange: full acceptance
    expect(result.corrections_found).toBe(1);
    expect(result.acceptances_found).toBe(1);
  });

  test('should maintain accuracy across different coding scenarios', () => {
    const codingScenarios = [
      {
        assistant: 'Use React hooks',
        user: 'yes, that\'s better than class components',
        expected: 'acceptance'
      },
      {
        assistant: 'Implement error handling',
        user: 'try again with more specific error types',
        expected: 'correction'
      },
      {
        assistant: 'Add unit tests',
        user: 'maybe later',
        expected: 'ambiguous'
      },
    ];

    for (const scenario of codingScenarios) {
      const decision = classifier.classifyExchange(
        scenario.assistant,
        scenario.user
      );
      expect(decision.type).toBe(scenario.expected);
    }
  });
});
