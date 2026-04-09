/**
 * Markdown Formatter (Story 4.1)
 *
 * Formats rule suggestions for display in chat/terminal context
 * with security sanitization and pagination support
 *
 * @module review/markdown-formatter
 */

import { RuleSuggestion, RuleProposalType } from '../rules/types';
import { Pattern } from '../pattern-detector';
import {
  NavigationState,
  ReviewSummary,
  PaginationOptions,
  SanitizationResult,
  SecurityValidationResult,
} from './types';

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a rule suggestion has been edited
 * (Story 4.3: Type-safe way to access edited_rule field)
 *
 * @param change - Rule suggestion to check
 * @returns Whether the change has been edited
 */
function isEditedChange(change: RuleSuggestion): change is RuleSuggestion & { edited_rule: string } {
  return 'edited_rule' in change && typeof change.edited_rule === 'string' && change.edited_rule.length > 0;
}

// ============================================================================
// MARKDOWN FORMATTER
// ============================================================================

/**
 * Markdown formatter for review interface
 *
 * @class MarkdownFormatter
 */
export class MarkdownFormatter {
  private readonly MAX_RULE_LENGTH = 500;
  private readonly MAX_DISPLAY_CHANGES = 50;
  private readonly DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:'];

  /**
   * Format change header with number and total
   *
   * @param index - Change index (1-based)
   * @param total - Total number of changes
   * @param isEdited - Whether change has been edited
   * @returns Formatted header
   */
  formatChangeHeader(index: number, total: number, isEdited: boolean = false): string {
    const baseHeader = `## Change #${index} of ${total}`;
    return isEdited ? `${baseHeader} [EDITED]` : baseHeader;
  }

  /**
   * Format a single rule change for display
   *
   * @param change - Rule suggestion to format
   * @param index - Change number (1-based)
   * @param total - Total changes
   * @returns Formatted markdown
   */
  formatChange(change: RuleSuggestion, index: number, total: number): string {
    const lines: string[] = [];

    // Guard: Validate change parameter
    if (!change) {
      lines.push('## Change Not Available');
      lines.push('');
      lines.push('**Error:** Change information is missing or invalid.');
      lines.push('');
      return lines.join('\n');
    }

    // Header - add [EDITED] marker if change has been edited (Story 4.3: FR22, AC5)
    const isEdited = isEditedChange(change);
    lines.push(this.formatChangeHeader(index, total, isEdited));
    lines.push('');

    // Change type badge
    const typeBadge = this.formatChangeType(change.type);
    lines.push(`**Type:** ${typeBadge}`);
    lines.push('');

    // Pattern source
    if (change.pattern) {
      lines.push(this.formatPatternSource(change.pattern));
      lines.push('');
    }

    // Suggested rule - show edited version if available (Story 4.3: AC7)
    const ruleToShow = isEdited ? change.edited_rule : (change.ruleText || 'No rule text provided');
    const ruleLabel = isEdited ? '### Edited Rule' : '### Suggested Rule';

    lines.push(ruleLabel);
    lines.push('```text');
    lines.push(this.truncateRuleText(ruleToShow));
    lines.push('```');
    lines.push('');

    // Before/after comparison for modifications
    if (change.type === RuleProposalType.MODIFICATION && change.beforeAfter) {
      // Guard: Validate beforeAfter object structure
      const beforeAfter = change.beforeAfter;
      const before = (beforeAfter && typeof beforeAfter.before === 'string') ? beforeAfter.before : 'N/A';
      const after = (beforeAfter && typeof beforeAfter.after === 'string') ? beforeAfter.after : 'N/A';
      lines.push(this.formatBeforeAfter(before, after));
      lines.push('');
    } else if (change.type === RuleProposalType.ADDITION) {
      lines.push('### Existing Rule');
      lines.push('```text');
      lines.push('(see existing rule for context)');
      lines.push('```');
      lines.push('');
      lines.push('### Addition');
      lines.push('```text');
      lines.push(this.truncateRuleText(change.ruleText || 'No addition text provided'));
      lines.push('```');
      lines.push('');
    }

    // Explanation
    if (change.explanation) {
      lines.push('### Why This Rule?');
      lines.push(`> ${this.sanitizeForMarkdown(change.explanation)}`);
      lines.push('');
    }

    // Confidence score
    const confidence = typeof change.confidence === 'number' && change.confidence >= 0 && change.confidence <= 1
      ? change.confidence
      : 0.5; // Default to medium confidence
    const confidenceLabel = this.formatConfidence(confidence);
    lines.push(`**Confidence:** ${confidenceLabel}`);
    lines.push('');

    // Content type
    lines.push(`**Content Type:** ${change.contentType || 'Unknown'}`);
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format pattern source information
   *
   * @param pattern - Source pattern
   * @returns Formatted pattern info
   */
  formatPatternSource(pattern: Pattern): string {
    const lines: string[] = [];

    // Guard: Validate pattern parameter
    if (!pattern || typeof pattern !== 'object') {
      lines.push('### Pattern Source');
      lines.push('');
      lines.push('**Pattern information not available.**');
      lines.push('');
      return lines.join('\n');
    }

    lines.push('### Pattern Source');
    lines.push('');

    // Pattern description
    const patternText = pattern.pattern_text || 'N/A';
    lines.push(`**Pattern:** ${this.sanitizeForMarkdown(typeof patternText === 'string' ? patternText : 'N/A')}`);
    lines.push('');

    // Category
    const category = pattern.category || 'N/A';
    lines.push(`**Category:** ${this.sanitizeForMarkdown(typeof category === 'string' ? category : 'N/A')}`);
    lines.push('');

    // Frequency
    const count = typeof pattern.count === 'number' && Number.isFinite(pattern.count) ? pattern.count : 0;
    lines.push(`**Frequency:** ${count} occurrence${count > 1 ? 's' : ''}`);
    lines.push('');

    // Examples (if available)
    if (pattern.examples && Array.isArray(pattern.examples) && pattern.examples.length > 0) {
      lines.push('### Example Corrections');
      lines.push('');
      const examplesToShow = pattern.examples.slice(0, 2);
      examplesToShow.forEach((example, idx) => {
        // Guard: Validate example object
        if (example && typeof example === 'object') {
          lines.push(`**Example ${idx + 1}:**`);
          const original = example.original_suggestion || 'N/A';
          const correction = example.user_correction || 'N/A';
          lines.push('- Original: ' + this.sanitizeForMarkdown(typeof original === 'string' ? original : 'N/A'));
          lines.push('- Correction: ' + this.sanitizeForMarkdown(typeof correction === 'string' ? correction : 'N/A'));
          lines.push('');
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * Format before/after comparison
   *
   * @param before - Original text
   * @param after - Modified text
   * @returns Formatted comparison
   */
  formatBeforeAfter(before: string, after: string): string {
    const lines: string[] = [];

    // Guard: Validate and sanitize inputs
    const safeBefore = this.sanitizeForMarkdown(before || 'N/A');
    const safeAfter = this.sanitizeForMarkdown(after || 'N/A');

    lines.push('### Comparison');
    lines.push('');

    lines.push('**Before:**');
    lines.push('```text');
    lines.push(safeBefore);
    lines.push('```');
    lines.push('');

    lines.push('**After:**');
    lines.push('```text');
    lines.push(safeAfter);
    lines.push('```');
    lines.push('');

    // Highlight changes
    const changes = this.highlightChanges(safeBefore, safeAfter);
    if (changes) {
      lines.push('**Changes:**');
      lines.push(changes);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Highlight changes between before and after
   *
   * @private
   * @param before - Original text
   * @param after - Modified text
   * @returns Formatted changes
   */
  private highlightChanges(before: string, after: string): string {
    // Guard: Validate inputs before splitting
    if (!before || typeof before !== 'string') {
      before = '';
    }
    if (!after || typeof after !== 'string') {
      after = '';
    }

    // Guard: Limit input size to prevent DoS
    const MAX_INPUT_LENGTH = 10000;
    if (before.length > MAX_INPUT_LENGTH) {
      before = before.substring(0, MAX_INPUT_LENGTH);
    }
    if (after.length > MAX_INPUT_LENGTH) {
      after = after.substring(0, MAX_INPUT_LENGTH);
    }

    const beforeWords = before.split(/\s+/);
    const afterWords = after.split(/\s+/);

    // Guard: Validate arrays exist and limit size
    const MAX_WORDS = 1000;
    const safeBeforeWords = beforeWords.slice(0, MAX_WORDS);
    const safeAfterWords = afterWords.slice(0, MAX_WORDS);

    const additions: string[] = [];
    const deletions: string[] = [];

    // Simple word-by-word comparison
    safeAfterWords.forEach(word => {
      if (word && !safeBeforeWords.includes(word)) {
        additions.push(word);
      }
    });

    safeBeforeWords.forEach(word => {
      if (word && !safeAfterWords.includes(word)) {
        deletions.push(word);
      }
    });

    const lines: string[] = [];
    if (additions.length > 0) {
      // Limit output to prevent massive strings
      const displayAdditions = additions.slice(0, 50);
      lines.push(`- Added: **${displayAdditions.join(', ')}**${additions.length > 50 ? '...' : ''}`);
    }
    if (deletions.length > 0) {
      const displayDeletions = deletions.slice(0, 50);
      lines.push(`- Removed: ~~${displayDeletions.join(', ')}~~${deletions.length > 50 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  /**
   * Format review summary header
   *
   * @param state - Navigation state
   * @returns Formatted summary
   */
  formatSummary(state: NavigationState): string {
    const summary = this.calculateSummary(state);
    const lines: string[] = [];

    lines.push('# Review Summary');
    lines.push('');
    lines.push(`**Total Changes:** ${summary.total}`);
    lines.push('');
    lines.push('**Status:**');
    lines.push(`- Pending: ${summary.pending}`);
    lines.push(`- Approved: ${summary.approved}`);
    lines.push(`- Rejected: ${summary.rejected}`);
    lines.push(`- Edited: ${summary.edited}`);
    lines.push('');

    if (summary.total > 0) {
      lines.push(`**Progress:** ${this.calculateProgress(summary)}% complete`);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format error message
   *
   * @param error - Error object
   * @param sessionId - Session ID for debugging
   * @returns Formatted error
   */
  formatError(error: Error, sessionId?: string): string {
    const lines: string[] = [];

    lines.push('# ⚠️ Error');
    lines.push('');
    lines.push('**Something went wrong while displaying the review interface.**');
    lines.push('');
    lines.push('**What happened:**');
    lines.push(`> ${this.sanitizeForMarkdown(error.message)}`);
    lines.push('');

    if (sessionId) {
      lines.push(`**Session ID:** \`${sessionId}\``);
      lines.push('');
    }

    lines.push('**How to continue:**');
    lines.push('1. Try navigating to the next change');
    lines.push('2. Use "show all" to see all changes');
    lines.push('3. If the error persists, restart the review session');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Format all changes with pagination
   *
   * @param changes - Array of rule suggestions
   * @param options - Pagination options
   * @returns Formatted markdown
   */
  formatAllChanges(changes: RuleSuggestion[], options: PaginationOptions): string {
    const lines: string[] = [];

    // Guard: Validate inputs
    if (!changes || !Array.isArray(changes)) {
      lines.push('# Error');
      lines.push('');
      lines.push('**Invalid changes array provided.**');
      lines.push('');
      return lines.join('\n');
    }

    if (!options || typeof options !== 'object') {
      lines.push('# All Proposed Changes');
      lines.push('');
      lines.push('**Invalid pagination options.**');
      lines.push('');
      return lines.join('\n');
    }

    lines.push('# All Proposed Changes');
    lines.push('');
    lines.push(`**Page ${options.currentPage} of ${options.totalPages}**`);
    lines.push('');

    // Use the provided options directly but with safe defaults
    const currentPage = options.currentPage || 1;
    const pageSize = Math.max(1, Math.min(options.pageSize || 10, 100)); // Max 100 per page

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, changes.length);
    const pageChanges = changes.slice(startIndex, endIndex);

    pageChanges.forEach((change, idx) => {
      const globalIndex = startIndex + idx + 1; // 1-based
      lines.push(this.formatChange(change, globalIndex, changes.length));
      lines.push('---');
      lines.push('');
    });

    // Pagination controls
    if (options.totalPages > 1) {
      lines.push('**Navigation:**');
      if (currentPage > 1) {
        lines.push(`- Previous page: \`show page ${currentPage - 1}\``);
      }
      if (currentPage < options.totalPages) {
        lines.push(`- Next page: \`show page ${currentPage + 1}\``);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Format change type as badge
   *
   * @private
   * @param type - Rule proposal type
   * @returns Formatted type badge
   */
  private formatChangeType(type: RuleProposalType): string {
    switch (type) {
      case RuleProposalType.NEW_RULE:
        return '[NEW] **NEW RULE**';
      case RuleProposalType.ADDITION:
        return '[ADD] **ADDITION**';
      case RuleProposalType.MODIFICATION:
        return '[MOD] **MODIFICATION**';
      default:
        return '[???] **UNKNOWN**';
    }
  }

  /**
   * Format confidence score
   *
   * @private
   * @param confidence - Confidence score (0-1)
   * @returns Formatted confidence label
   */
  private formatConfidence(confidence: number): string {
    if (confidence >= 0.7) {
      return `**High** (${(confidence * 100).toFixed(0)}%)`;
    } else if (confidence >= 0.4) {
      return `**Medium** (${(confidence * 100).toFixed(0)}%)`;
    } else {
      return `**Low** (${(confidence * 100).toFixed(0)}%)`;
    }
  }

  /**
   * Sanitize content for markdown rendering
   *
   * @param content - Content to sanitize
   * @returns Sanitized content
   */
  sanitizeForMarkdown(content: string): string {
    // Guard: Handle null/undefined/non-string inputs
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Guard: Limit input size to prevent DoS
    const MAX_INPUT_LENGTH = 50000;
    if (content.length > MAX_INPUT_LENGTH) {
      content = content.substring(0, MAX_INPUT_LENGTH) + '... [truncated]';
    }

    let sanitized = content;

    // Remove dangerous markdown patterns FIRST (before HTML escaping)
    this.DANGEROUS_PROTOCOLS.forEach(protocol => {
      // Match markdown links with dangerous protocols: [text](dangerous:url)
      const regex = new RegExp(`\\[[^\\]]*\\]\\(${protocol}[^)]*\\)`, 'gi');
      sanitized = sanitized.replace(regex, '[REMOVED DANGEROUS LINK]');
      // Also match bare dangerous protocols
      const bareRegex = new RegExp(protocol + '[^\\s\\)]*', 'gi');
      sanitized = sanitized.replace(bareRegex, '[REMOVED]');
    });

    // Escape HTML special characters
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Additional: Remove dangerous HTML-like patterns that might have been injected
    // Use case-insensitive flag without 's' flag for broader compatibility
    sanitized = sanitized.replace(/<script[^>]*>.*?<\/script>/gi, '[REMOVED SCRIPT]');
    sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '[REMOVED IFRAME]');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '[REMOVED EVENT HANDLER]');

    // Limit output length
    if (sanitized.length > 5000) {
      sanitized = sanitized.substring(0, 5000) + '... [truncated]';
    }

    return sanitized;
  }

  /**
   * Truncate rule text for display
   *
   * @param text - Rule text to truncate
   * @param maxLength - Maximum length
   * @returns Truncated text
   */
  truncateRuleText(text: string, maxLength: number = this.MAX_RULE_LENGTH): string {
    // Guard: Validate inputs
    if (!text || typeof text !== 'string') {
      return '';
    }

    // Guard: Validate maxLength parameter
    const safeMaxLength = typeof maxLength === 'number' && maxLength > 0
      ? Math.min(maxLength, this.MAX_RULE_LENGTH)
      : this.MAX_RULE_LENGTH;

    if (text.length <= safeMaxLength) {
      return text;
    }

    return text.substring(0, safeMaxLength) + '\n... [truncated]';
  }

  /**
   * Calculate summary statistics
   *
   * @private
   * @param state - Navigation state
   * @returns Review summary
   */
  private calculateSummary(state: NavigationState): ReviewSummary {
    let approved = 0;
    let rejected = 0;
    let edited = 0;

    // Count decisions that have been made
    state.decisions.forEach(decision => {
      switch (decision) {
        case 'approved' as any:
          approved++;
          break;
        case 'rejected' as any:
          rejected++;
          break;
        case 'edited' as any:
          edited++;
          break;
      }
    });

    // Pending is total changes minus decisions made
    const totalDecided = approved + rejected + edited;
    const pending = Math.max(0, state.changes.length - totalDecided);

    return {
      total: state.changes.length,
      pending,
      approved,
      rejected,
      edited,
    };
  }

  /**
   * Calculate progress percentage
   *
   * @private
   * @param summary - Review summary
   * @returns Progress percentage
   */
  private calculateProgress(summary: ReviewSummary): number {
    if (summary.total === 0) {
      return 0;
    }

    const decided = summary.approved + summary.rejected + summary.edited;
    return Math.round((decided / summary.total) * 100);
  }

  /**
   * Validate and sanitize content
   *
   * @param content - Content to validate
   * @returns Sanitization result
   */
  validateAndSanitize(content: string): SecurityValidationResult {
    const errors: string[] = [];
    let sanitizedContent = content;

    // Guard: Check for null/undefined
    if (!content) {
      errors.push('Content is null or undefined');
      return {
        isSafe: false,
        errors,
      };
    }

    // Guard: Check type
    if (typeof content !== 'string') {
      errors.push('Content is not a string');
      return {
        isSafe: false,
        errors,
      };
    }

    // Guard: Check for extremely long content (DoS protection)
    const MAX_LENGTH = 50000;
    if (content.length > MAX_LENGTH) {
      errors.push(`Content exceeds maximum length of ${MAX_LENGTH} characters`);
      sanitizedContent = content.substring(0, MAX_LENGTH);
    }

    // Check for dangerous patterns
    this.DANGEROUS_PROTOCOLS.forEach(protocol => {
      if (content.toLowerCase().includes(protocol)) {
        errors.push(`Content contains dangerous protocol: ${protocol}`);
      }
    });

    // Check for script tags
    if (/<script[^>]*>/i.test(content)) {
      errors.push('Content contains script tags (will be removed)');
    }

    // Check for HTML tags
    if (/<[^>]*>/.test(content)) {
      errors.push('Content contains HTML tags (will be escaped)');
    }

    // Check for data URLs (additional security)
    if (/data:[^,]*,/i.test(content)) {
      errors.push('Content contains data URLs (will be sanitized)');
    }

    // Sanitize
    sanitizedContent = this.sanitizeForMarkdown(sanitizedContent);

    return {
      isSafe: errors.length === 0,
      errors,
      sanitizedContent,
    };
  }
}
