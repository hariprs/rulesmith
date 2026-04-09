/**
 * Cursor .cursorrules Formatter (Story 3.7)
 *
 * Formats rules for Cursor's .cursorrules file format
 * Format: Plain text with comment-based sections (# Header)
 *
 * @module rules/formatters/cursor-formatter
 */

import { ContentType } from '../../content-analyzer';
import { RuleSuggestion } from '../types';

// ============================================================================
// CURSOR FORMATTER
// ============================================================================

/**
 * Cursor formatter for .cursorrules format
 *
 * @class CursorFormatter
 */
export class CursorFormatter {
  /**
   * Format a single rule for Cursor
   *
   * @param ruleText - The rule text
   * @param contentType - The content type
   * @returns Formatted rule string
   */
  formatSingleRule(ruleText: string, contentType: ContentType): string {
    // Add content type context as comment
    const context = this.getContentTypeLabel(contentType);
    return `- ${ruleText}`;
  }

  /**
   * Format multiple rules for Cursor
   *
   * @param rules - Array of rule suggestions
   * @returns Formatted .cursorrules content
   */
  formatForCursor(rules: RuleSuggestion[]): string {
    const lines: string[] = [];

    // Add header
    lines.push('# AI Assistant Rules');
    lines.push('# Generated from pattern analysis');
    lines.push('');

    // Group by content type
    const groupedRules = this.groupByContentType(rules);

    for (const [contentType, rulesOfType] of Object.entries(groupedRules)) {
      if (rulesOfType.length > 0) {
        // Add section header
        lines.push(`# ${this.getContentTypeLabel(contentType as ContentType)}`);
        lines.push('');

        // Add rules
        for (const rule of rulesOfType) {
          lines.push(`# ${rule.explanation}`);
          lines.push(`- ${rule.ruleText}`);
          lines.push('');
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get human-readable content type label
   *
   * @private
   * @param contentType - The content type
   * @returns Label string
   */
  private getContentTypeLabel(contentType: ContentType): string {
    const labels: Record<ContentType, string> = {
      [ContentType.CODE]: 'Code',
      [ContentType.DOCUMENTATION]: 'Documentation',
      [ContentType.DIAGRAM]: 'Diagrams',
      [ContentType.PRD]: 'Requirements',
      [ContentType.TEST_PLAN]: 'Test Plans',
      [ContentType.GENERAL_TEXT]: 'General',
    };

    return labels[contentType] || 'General';
  }

  /**
   * Group rules by content type
   *
   * @private
   * @param rules - Array of rule suggestions
   * @returns Grouped rules
   */
  private groupByContentType(rules: RuleSuggestion[]): Record<string, RuleSuggestion[]> {
    if (!rules || !Array.isArray(rules)) {
      return {};
    }

    const grouped: Record<string, RuleSuggestion[]> = {};

    for (const rule of rules) {
      if (!rule) continue; // Skip null/undefined rules
      const key = rule.contentType;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(rule);
    }

    return grouped;
  }

  /**
   * Format rules with before/after comparison
   *
   * @param rules - Array of rule suggestions
   * @returns Formatted content with comparisons
   */
  formatWithComparisons(rules: RuleSuggestion[]): string {
    const lines: string[] = [];

    lines.push('# AI Assistant Rules with Changes');
    lines.push('# Generated from pattern analysis');
    lines.push('');

    for (const rule of rules) {
      if (rule.beforeAfter) {
        lines.push(`## Rule Modification: ${rule.ruleText}`);
        lines.push('');
        lines.push('**Before:**');
        lines.push(rule.beforeAfter.before);
        lines.push('');
        lines.push('**After:**');
        lines.push(rule.beforeAfter.after);
        lines.push('');
        lines.push('**Changes:**');
        for (const change of rule.beforeAfter.changes) {
          lines.push(`- ${change.type}: ${change.text}`);
        }
        lines.push('');
      } else {
        lines.push(`## ${this.getContentTypeLabel(rule.contentType)}`);
        lines.push('');
        lines.push(`- ${rule.ruleText}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }

  /**
   * Filter rules by confidence threshold
   *
   * @param rules - Array of rule suggestions
   * @param minConfidence - Minimum confidence threshold
   * @returns Filtered rules
   */
  filterByConfidence(rules: RuleSuggestion[], minConfidence: number): RuleSuggestion[] {
    return rules.filter(rule => rule.confidence >= minConfidence);
  }
}
