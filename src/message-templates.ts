/**
 * Message Templates (Story 2-7)
 *
 * Provides AR22-style user-friendly message templates for short conversation feedback.
 * All messages follow consistent format: problem + explanation + guidance.
 */

import { ValidationResult, ConversationValidationResult } from './conversation-length-validator';

// ============================================================================
// TEMPLATE CLASS
// ============================================================================

/**
 * Message templates for user feedback
 *
 * @example
 * ```typescript
 * const templates = new MessageTemplates();
 * const message = templates.tooFewSuggestions(5, 2);
 * console.log(message);
 * ```
 */
export class MessageTemplates {
  /**
   * Format AR22-style message with consistent structure
   */
  private formatAR22Message(
    problem: string,
    explanation: string,
    guidance: string,
    details?: { label: string; value: string }[]
  ): string {
    let message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📊 CONVERSATION ANALYSIS\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `${problem}\n\n`;

    if (details && details.length > 0) {
      details.forEach(detail => {
        message += `${detail.label}: ${detail.value}\n`;
      });
      message += `\n`;
    }

    message += `${explanation}\n\n`;
    message += `💡 ${guidance}\n`;
    message += `\n`;
    message += `Next: Run /improve-rules again after continuing your conversation.\n`;

    return message;
  }

  /**
   * Message for too few AI suggestions
   *
   * @param threshold - Minimum required suggestions
   * @param actual - Actual suggestions found
   * @returns Formatted message string
   */
  tooFewSuggestions(threshold: number, actual: number): string {
    const problem = 'This conversation is too short for pattern analysis.';
    const explanation =
      'Pattern analysis requires multiple AI suggestions to identify recurring correction patterns. ' +
      'AI suggestions are instances where you provided corrections or modifications to AI responses.';
    const guidance =
      'Continue your conversation with more AI interactions, making corrections when needed. ' +
      'Then run /improve-rules again.';

    return this.formatAR22Message(
      problem,
      explanation,
      guidance,
      [
        { label: 'Required', value: `${threshold} AI suggestions or more` },
        { label: 'Found', value: `${actual} AI suggestion${actual === 1 ? '' : 's'}` },
      ]
    );
  }

  /**
   * Message for too few message exchanges
   *
   * @param threshold - Minimum required exchanges
   * @param actual - Actual exchanges found
   * @returns Formatted message string
   */
  tooFewExchanges(threshold: number, actual: number): string {
    const problem = 'This conversation is too short for pattern analysis.';
    const explanation =
      'Pattern analysis requires enough conversation history to identify meaningful patterns. ' +
      'Message exchanges are pairs of user messages and AI responses.';
    const guidance =
      'Continue your conversation with more exchanges. A longer conversation provides more data ' +
      'for pattern detection. Run /improve-rules again when you have more interactions.';

    return this.formatAR22Message(
      problem,
      explanation,
      guidance,
      [
        { label: 'Required', value: `${threshold} message exchanges or more` },
        { label: 'Found', value: `${actual} message exchange${actual === 1 ? '' : 's'}` },
      ]
    );
  }

  /**
   * Message for both thresholds failing (combined message)
   *
   * Shows the most restrictive threshold first (suggestions, then exchanges)
   *
   * @param suggestions - Validation result for AI suggestions
   * @param exchanges - Validation result for message exchanges
   * @returns Formatted message string
   */
  tooFewBoth(suggestions: ValidationResult, exchanges: ValidationResult): string {
    const problem = 'This conversation is too short for pattern analysis.';
    const explanation =
      'Pattern analysis requires both sufficient AI suggestions and enough conversation history. ' +
      'AI suggestions are corrections you made to AI responses. Message exchanges are pairs of ' +
      'user messages and AI responses.';
    const guidance =
      'Continue your conversation with more interactions. Make corrections when the AI response ' +
      'needs improvement, and have a longer back-and-forth conversation. Then run /improve-rules again.';

    // Determine which threshold is more restrictive (lower percentage of requirement)
    const suggestionsPercent = (suggestions.actual / suggestions.threshold) * 100;
    const exchangesPercent = (exchanges.actual / exchanges.threshold) * 100;

    // Show most restrictive first
    const details = suggestionsPercent <= exchangesPercent
      ? [
          { label: 'Required (AI Suggestions)', value: `${suggestions.threshold} or more` },
          { label: 'Found (AI Suggestions)', value: `${suggestions.actual} suggestion${suggestions.actual === 1 ? '' : 's'}` },
          { label: 'Required (Exchanges)', value: `${exchanges.threshold} or more` },
          { label: 'Found (Exchanges)', value: `${exchanges.actual} exchange${exchanges.actual === 1 ? '' : 's'}` },
        ]
      : [
          { label: 'Required (Exchanges)', value: `${exchanges.threshold} or more` },
          { label: 'Found (Exchanges)', value: `${exchanges.actual} exchange${exchanges.actual === 1 ? '' : 's'}` },
          { label: 'Required (AI Suggestions)', value: `${suggestions.threshold} or more` },
          { label: 'Found (AI Suggestions)', value: `${suggestions.actual} suggestion${suggestions.actual === 1 ? '' : 's'}` },
        ];

    return this.formatAR22Message(problem, explanation, guidance, details);
  }

  /**
   * Message for no corrections found (zero-correction result)
   *
   * @returns Formatted message string
   */
  noCorrectionsFound(): string {
    const problem = 'No correction patterns were found in this conversation.';
    const explanation =
      'This can happen when:\n' +
      '• All AI suggestions were accepted without corrections\n' +
      '• Corrections were too diverse to form recurring patterns\n' +
      '• The conversation focused on one-time topics without repetition';
    const guidance =
      'To discover patterns, try making more corrections to AI suggestions, having longer ' +
      'conversations on similar topics, or running /improve-rules after multiple sessions.';

    return this.formatAR22Message(problem, explanation, guidance);
  }

  /**
   * Message for zero patterns found (after successful analysis)
   *
   * @returns Formatted message string
   */
  zeroPatternsFound(): string {
    const problem = 'No recurring correction patterns were detected.';
    const explanation =
      'This can happen when:\n' +
      '• Corrections made were all unique (no recurring themes)\n' +
      '• The conversation covered diverse topics without patterns\n' +
      '• There were not enough corrections to identify patterns';
    const guidance =
      'Continue having conversations and making corrections. Patterns emerge over time as you ' +
      'interact with AI on similar topics. Run /improve-rules again after more sessions.';

    return this.formatAR22Message(problem, explanation, guidance);
  }

  /**
   * Generate message from validation result
   *
   * Convenience method that automatically selects the appropriate message
   *
   * @param result - Conversation validation result
   * @returns Formatted message string, or empty string if validation passes
   */
  fromValidationResult(result: ConversationValidationResult): string {
    if (result.canProceed) {
      return ''; // No message needed for valid conversations
    }

    // Guard: Ensure validations array exists and is not empty
    if (!result.validations || result.validations.length === 0) {
      return 'This conversation is too short for pattern analysis. Please continue your conversation and run /improve-rules again.';
    }

    // Check if both thresholds failed
    if (result.reasons.length === 2) {
      const suggestions = result.validations.find(v => v.metric === 'ai_suggestions');
      const exchanges = result.validations.find(v => v.metric === 'message_exchanges');

      // Guard: Ensure both validations were found
      if (!suggestions || !exchanges) {
        return 'This conversation is too short for pattern analysis. Please continue your conversation and run /improve-rules again.';
      }

      return this.tooFewBoth(suggestions, exchanges);
    }

    // Check which threshold failed
    if (result.reasons.includes('too_few_suggestions')) {
      const suggestions = result.validations.find(v => v.metric === 'ai_suggestions');

      // Guard: Ensure validation was found
      if (!suggestions) {
        return 'This conversation is too short for pattern analysis. Please continue your conversation and run /improve-rules again.';
      }

      return this.tooFewSuggestions(suggestions.threshold, suggestions.actual);
    }

    if (result.reasons.includes('too_few_exchanges')) {
      const exchanges = result.validations.find(v => v.metric === 'message_exchanges');

      // Guard: Ensure validation was found
      if (!exchanges) {
        return 'This conversation is too short for pattern analysis. Please continue your conversation and run /improve-rules again.';
      }

      return this.tooFewExchanges(exchanges.threshold, exchanges.actual);
    }

    // Fallback (should not happen)
    return 'This conversation is too short for pattern analysis. Please continue your conversation and run /improve-rules again.';
  }

  /**
   * Success message for patterns found
   *
   * @param patternCount - Number of patterns found
   * @param categories - Pattern categories found (optional)
   * @returns Formatted success message
   */
  patternsFound(patternCount: number, categories?: string[]): string {
    let message = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `✅ PATTERN ANALYSIS COMPLETE\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Found ${patternCount} correction pattern${patternCount === 1 ? '' : 's'}.\n`;

    if (categories && categories.length > 0) {
      message += `\nPattern categories:\n`;
      categories.forEach(cat => {
        message += `• ${cat}\n`;
      });
    }

    message += `\n💡 These patterns have been saved to state.json for longitudinal tracking.\n`;
    message += `Next: Review patterns and consider updating your custom rules.\n`;

    return message;
  }
}
