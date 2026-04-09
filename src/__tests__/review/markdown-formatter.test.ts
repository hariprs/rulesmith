/**
 * Markdown Formatter Unit Tests (Story 4.1)
 */

import { describe, it, expect } from '@jest/globals';
import { MarkdownFormatter } from '../../review/markdown-formatter';
import { RuleSuggestion, RuleProposalType } from '../../rules/types';
import { Pattern, PatternCategory } from '../../pattern-detector';
import { ContentType } from '../../content-analyzer';

describe('MarkdownFormatter', () => {
  let formatter: MarkdownFormatter;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
  });

  describe('formatChangeHeader', () => {
    it('should format header with number and total', () => {
      const header = formatter.formatChangeHeader(1, 10);
      expect(header).toContain('## Change #1 of 10');
    });

    it('should handle single change', () => {
      const header = formatter.formatChangeHeader(1, 1);
      expect(header).toContain('## Change #1 of 1');
    });
  });

  describe('formatChange', () => {
    it('should format NEW_RULE change', () => {
      const pattern: Pattern = {
        pattern_text: 'Use camelCase for variables',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Use camelCase for variables',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.CODE],
      };

      const change: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Use camelCase for variables',
        explanation: 'This pattern was observed 3 times',
        contentType: ContentType.CODE,
        confidence: 0.8,
        platformFormats: {
          cursor: 'Use camelCase for variables',
          copilot: 'Use camelCase for variables',
        },
      };

      const output = formatter.formatChange(change, 1, 1);

      expect(output).toContain('## Change #1 of 1');
      expect(output).toContain('🆕 **NEW RULE**');
      expect(output).toContain('Use camelCase for variables');
      expect(output).toContain('🟢 **High** (80%)');
    });

    it('should format MODIFICATION change with before/after', () => {
      const pattern: Pattern = {
        pattern_text: 'Use async/await instead of callbacks',
        count: 5,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Use async/await instead of callbacks',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.CODE],
      };

      const change: RuleSuggestion = {
        id: 'rule-2',
        type: RuleProposalType.MODIFICATION,
        pattern,
        ruleText: 'Use async/await instead of callbacks',
        explanation: 'This pattern was observed 5 times',
        contentType: ContentType.CODE,
        confidence: 0.9,
        platformFormats: {
          cursor: 'Use async/await instead of callbacks',
          copilot: 'Use async/await instead of callbacks',
        },
        beforeAfter: {
          before: 'Use callbacks for async operations',
          after: 'Use async/await instead of callbacks',
          changes: [
            { type: 'modification', text: 'Update to async/await pattern' },
          ],
        },
      };

      const output = formatter.formatChange(change, 1, 1);

      expect(output).toContain('✏️ **MODIFICATION**');
      expect(output).toContain('**Before:**');
      expect(output).toContain('**After:**');
      expect(output).toContain('Use callbacks for async operations');
      expect(output).toContain('Use async/await instead of callbacks');
    });

    it('should format ADDITION change', () => {
      const pattern: Pattern = {
        pattern_text: 'Add error handling',
        count: 2,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Add error handling',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.CODE],
      };

      const change: RuleSuggestion = {
        id: 'rule-3',
        type: RuleProposalType.ADDITION,
        pattern,
        ruleText: 'Add error handling to async functions',
        explanation: 'Add error handling to improve robustness',
        contentType: ContentType.CODE,
        confidence: 0.6,
        platformFormats: {
          cursor: 'Add error handling to async functions',
          copilot: 'Add error handling to async functions',
        },
      };

      const output = formatter.formatChange(change, 1, 1);

      expect(output).toContain('➕ **ADDITION**');
      expect(output).toContain('### Existing Rule');
      expect(output).toContain('### Addition');
    });

    it('should include pattern source with examples', () => {
      const pattern: Pattern = {
        pattern_text: 'Use kebab-case for file names',
        count: 4,
        category: PatternCategory.CODE_STYLE,
        examples: [
          {
            original_suggestion: 'myFileName.js',
            user_correction: 'my-file-name.js',
            context: 'File naming convention',
            timestamp: new Date().toISOString(),
            content_type: ContentType.CODE,
          },
          {
            original_suggestion: 'MyComponent.js',
            user_correction: 'my-component.js',
            context: 'Component file naming',
            timestamp: new Date().toISOString(),
            content_type: ContentType.CODE,
          },
        ],
        suggested_rule: 'Use kebab-case for file names',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.CODE],
      };

      const change: RuleSuggestion = {
        id: 'rule-4',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Use kebab-case for file names',
        explanation: 'This pattern was observed 4 times',
        contentType: ContentType.CODE,
        confidence: 0.75,
        platformFormats: {
          cursor: 'Use kebab-case for file names',
          copilot: 'Use kebab-case for file names',
        },
      };

      const output = formatter.formatChange(change, 1, 1);

      expect(output).toContain('### Pattern Source');
      expect(output).toContain('**Pattern:** Use kebab-case for file names');
      expect(output).toContain('**Category:** code_style');
      expect(output).toContain('**Frequency:** 4 occurrences');
      expect(output).toContain('### Example Corrections');
      expect(output).toContain('**Example 1:**');
      expect(output).toContain('**Example 2:**');
    });
  });

  describe('sanitizeForMarkdown', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const sanitized = formatter.sanitizeForMarkdown(input);
      expect(sanitized).toContain('&lt;script&gt;');
      expect(sanitized).not.toContain('<script>');
    });

    it('should remove dangerous javascript: links', () => {
      const input = '[Click here](javascript:alert(1)) here';
      const sanitized = formatter.sanitizeForMarkdown(input);
      // The dangerous protocol is removed but the format may vary
      expect(sanitized).not.toContain('javascript:alert(1)');
    });

    it('should truncate long content', () => {
      const longText = 'a'.repeat(6000);
      const sanitized = formatter.sanitizeForMarkdown(longText);
      expect(sanitized.length).toBeLessThanOrEqual(5000 + 30); // Account for truncation message
      expect(sanitized).toContain('... [truncated]');
    });

    it('should handle empty input', () => {
      const sanitized = formatter.sanitizeForMarkdown('');
      expect(sanitized).toBe('');
    });
  });

  describe('validateAndSanitize', () => {
    it('should reject null content', () => {
      const result = formatter.validateAndSanitize(null as any);
      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is null or undefined');
    });

    it('should reject non-string content', () => {
      const result = formatter.validateAndSanitize(123 as any);
      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is not a string');
    });

    it('should detect dangerous protocols', () => {
      const result = formatter.validateAndSanitize('Click javascript:alert(1)');
      expect(result.isSafe).toBe(false);
      expect(result.errors.some(e => e.includes('dangerous protocol'))).toBe(true);
    });

    it('should detect HTML tags', () => {
      const result = formatter.validateAndSanitize('<div>Content</div>');
      expect(result.isSafe).toBe(false);
      expect(result.errors.some(e => e.includes('HTML tags'))).toBe(true);
    });

    it('should sanitize and return safe content', () => {
      const result = formatter.validateAndSanitize('Safe content here');
      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedContent).toBe('Safe content here');
    });
  });

  describe('truncateRuleText', () => {
    it('should not truncate short text', () => {
      const text = 'Short rule text';
      const truncated = formatter.truncateRuleText(text);
      expect(truncated).toBe(text);
    });

    it('should truncate long text', () => {
      const longText = 'a'.repeat(600);
      const truncated = formatter.truncateRuleText(longText, 500);
      expect(truncated.length).toBeLessThanOrEqual(600); // Allow for truncation message
      expect(truncated).toContain('... [truncated]');
    });

    it('should handle empty text', () => {
      const truncated = formatter.truncateRuleText('');
      expect(truncated).toBe('');
    });
  });

  describe('formatSummary', () => {
    it('should format summary with no decisions', () => {
      const state = {
        currentIndex: 0,
        changes: Array(5).fill({}), // Mock changes array
        decisions: new Map(),
        sessionId: 'test-session',
        lastActivity: new Date(),
        totalChanges: 5,
      };

      const output = formatter.formatSummary(state);

      expect(output).toContain('# Review Summary');
      expect(output).toContain('**Total Changes:** 5');
      expect(output).toContain('- Pending: 5');
      expect(output).toContain('- Approved: 0');
      expect(output).toContain('- Rejected: 0');
      expect(output).toContain('- Edited: 0');
      expect(output).toContain('**Progress:** 0% complete');
    });

    it('should format summary with decisions', () => {
      const decisions = new Map<number, any>();
      decisions.set(0, 'approved');
      decisions.set(1, 'rejected');
      decisions.set(2, 'edited');

      const state = {
        currentIndex: 3,
        changes: Array(10).fill({}), // Mock changes array
        decisions,
        sessionId: 'test-session',
        lastActivity: new Date(),
        totalChanges: 10,
      };

      const output = formatter.formatSummary(state);

      expect(output).toContain('- Pending: 7');
      expect(output).toContain('- Approved: 1');
      expect(output).toContain('- Rejected: 1');
      expect(output).toContain('- Edited: 1');
      expect(output).toContain('**Progress:** 30% complete');
    });
  });

  describe('formatError', () => {
    it('should format error with session ID', () => {
      const error = new Error('Test error message');
      const output = formatter.formatError(error, 'session-123');

      expect(output).toContain('# ⚠️ Error');
      expect(output).toContain('Something went wrong');
      expect(output).toContain('Test error message');
      expect(output).toContain('`session-123`');
      expect(output).toContain('**How to continue:**');
    });

    it('should format error without session ID', () => {
      const error = new Error('Test error');
      const output = formatter.formatError(error);

      expect(output).toContain('# ⚠️ Error');
      expect(output).toContain('Test error');
      expect(output).not.toContain('Session ID');
    });
  });

  describe('formatAllChanges', () => {
    it('should format paginated changes', () => {
      const changes: RuleSuggestion[] = [];
      for (let i = 0; i < 25; i++) {
        const pattern: Pattern = {
          pattern_text: `Rule ${i}`,
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: `Rule ${i}`,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        };

        changes.push({
          id: `rule-${i}`,
          type: RuleProposalType.NEW_RULE,
          pattern,
          ruleText: `Rule ${i}`,
          explanation: `Explanation ${i}`,
          contentType: ContentType.GENERAL_TEXT,
          confidence: 0.7,
          platformFormats: {
            cursor: `Rule ${i}`,
            copilot: `Rule ${i}`,
          },
        });
      }

      const output = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 3,
      });

      expect(output).toContain('# All Proposed Changes');
      expect(output).toContain('**Page 1 of 3**');
      expect(output).toContain('## Change #1 of 25');
      expect(output).toContain('## Change #10 of 25');
      expect(output).toContain('- Previous page:');
      expect(output).toContain('- Next page: `show page 2`');
    });

    it('should show navigation controls for multi-page', () => {
      const changes: RuleSuggestion[] = [];

      const output = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 2,
        totalPages: 5,
      });

      expect(output).toContain('- Previous page: `show page 1`');
      expect(output).toContain('- Next page: `show page 3`');
    });
  });

  describe('formatConfidence', () => {
    it('should format high confidence in change display', () => {
      const pattern: Pattern = {
        pattern_text: 'Test rule',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const change: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.8,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      };

      const output = formatter.formatChange(change, 1, 1);
      expect(output).toContain('🟢 **High** (80%)');
    });

    it('should format medium confidence in change display', () => {
      const pattern: Pattern = {
        pattern_text: 'Test rule',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const change: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.5,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      };

      const output = formatter.formatChange(change, 1, 1);
      expect(output).toContain('🟡 **Medium** (50%)');
    });

    it('should format low confidence in change display', () => {
      const pattern: Pattern = {
        pattern_text: 'Test rule',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const change: RuleSuggestion = {
        id: 'rule-1',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.3,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      };

      const output = formatter.formatChange(change, 1, 1);
      expect(output).toContain('🔴 **Low** (30%)');
    });
  });
});
