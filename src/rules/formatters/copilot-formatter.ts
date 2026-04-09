/**
 * GitHub Copilot Formatter (Story 3.7)
 *
 * Formats rules for GitHub Copilot's custom instructions format
 * Format: Structured markdown with sections (## Header)
 *
 * @module rules/formatters/copilot-formatter
 */

import { ContentType } from '../../content-analyzer';
import { RuleSuggestion } from '../types';

// ============================================================================
// COPILOT FORMATTER
// ============================================================================

/**
 * Copilot formatter for custom instructions format
 *
 * @class CopilotFormatter
 */
export class CopilotFormatter {
  /**
   * Format a single rule for Copilot
   *
   * @param ruleText - The rule text
   * @param contentType - The content type
   * @returns Formatted rule string
   */
  formatSingleRule(ruleText: string, contentType: ContentType): string {
    const context = this.getContentTypeContext(contentType);
    return `${context} ${ruleText}`;
  }

  /**
   * Format multiple rules for Copilot
   *
   * @param rules - Array of rule suggestions
   * @returns Formatted custom instructions content
   */
  formatForCopilot(rules: RuleSuggestion[]): string {
    const lines: string[] = [];

    // Add header
    lines.push('# AI Assistant Custom Instructions');
    lines.push('*Generated from pattern analysis*');
    lines.push('');

    // Add overview section
    lines.push('## Overview');
    lines.push('');
    lines.push('Follow these rules and conventions when providing suggestions:');
    lines.push('');

    // Group by content type
    const groupedRules = this.groupByContentType(rules);

    for (const [contentType, rulesOfType] of Object.entries(groupedRules)) {
      if (rulesOfType.length > 0) {
        // Add section header
        lines.push(`## ${this.getContentTypeLabel(contentType as ContentType)}`);
        lines.push('');

        // Add rules
        for (const rule of rulesOfType) {
          lines.push(`**${rule.ruleText}**`);
          lines.push('');
          lines.push(`*${rule.explanation}*`);
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
      [ContentType.CODE]: 'Code Conventions',
      [ContentType.DOCUMENTATION]: 'Documentation Standards',
      [ContentType.DIAGRAM]: 'Diagram Guidelines',
      [ContentType.PRD]: 'Requirements Format',
      [ContentType.TEST_PLAN]: 'Test Plan Structure',
      [ContentType.GENERAL_TEXT]: 'General Guidelines',
    };

    return labels[contentType] || 'General Guidelines';
  }

  /**
   * Get content type context for rule formatting
   *
   * @private
   * @param contentType - The content type
   * @returns Context string
   */
  private getContentTypeContext(contentType: ContentType): string {
    const contexts: Record<ContentType, string> = {
      [ContentType.CODE]: 'When writing code,',
      [ContentType.DOCUMENTATION]: 'In documentation,',
      [ContentType.DIAGRAM]: 'For diagrams,',
      [ContentType.PRD]: 'In requirements,',
      [ContentType.TEST_PLAN]: 'For test plans,',
      [ContentType.GENERAL_TEXT]: '',
    };

    return contexts[contentType] || '';
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

    lines.push('# AI Assistant Custom Instructions with Proposed Changes');
    lines.push('*Generated from pattern analysis*');
    lines.push('');

    for (const rule of rules) {
      if (rule.beforeAfter) {
        lines.push('## Proposed Rule Change');
        lines.push('');
        lines.push('### Current Rule');
        lines.push('');
        lines.push(rule.beforeAfter.before);
        lines.push('');
        lines.push('### Proposed Rule');
        lines.push('');
        lines.push(rule.beforeAfter.after);
        lines.push('');
        lines.push('### Rationale');
        lines.push('');
        lines.push(rule.explanation);
        lines.push('');
        lines.push('### Changes');
        lines.push('');
        for (const change of rule.beforeAfter.changes) {
          lines.push(`- **${change.type}**: ${change.text}`);
        }
        lines.push('');
      } else {
        lines.push(`## ${this.getContentTypeLabel(rule.contentType)}`);
        lines.push('');
        lines.push(`**${rule.ruleText}**`);
        lines.push('');
        lines.push(`*${rule.explanation}*`);
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
