/**
 * Unit Tests: Markdown Formatter (Story 4.1)
 *
 * Test Coverage:
 * - Change formatting (all types: NEW_RULE, ADDITION, MODIFICATION)
 * - Pattern source formatting
 * - Before/after comparison
 * - Summary calculation
 * - Error formatting
 * - Content sanitization (XSS, injection prevention)
 * - Text truncation
 * - Pagination
 * - Confidence formatting
 * - Edge cases (null, undefined, malformed data)
 *
 * Testing Priority: Unit > Integration > E2E
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { MarkdownFormatter } from '../../../src/review/markdown-formatter.js';
import { RuleSuggestion, RuleProposalType } from '../../../src/review/../rules/types.js';
import { Pattern, PatternCategory } from '../../../src/review/../pattern-detector/index.js';
import { NavigationState, DecisionType } from '../../../src/review/types.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript',
      user_correction: 'Use TypeScript with strict mode enabled',
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

const createMockRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createMockPattern(),
  ruleText: 'Always use TypeScript strict mode in all projects.',
  explanation: 'TypeScript strict mode catches more errors at compile time.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

const createMockNavigationState = (overrides?: Partial<NavigationState>): NavigationState => ({
  currentIndex: 0,
  changes: [],
  decisions: new Map(),
  sessionId: 'test-session-123',
  lastActivity: new Date(),
  totalChanges: 0,
  ...overrides,
});

// ============================================================================
// TEST SUITES
// ============================================================================

describe('MarkdownFormatter', () => {
  let formatter: MarkdownFormatter;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
  });

  // ========================================================================
  // CHANGE FORMATTING
  // ========================================================================

  describe('formatChange', () => {
    it('should format a NEW_RULE change correctly', () => {
      const change = createMockRuleSuggestion({
        type: RuleProposalType.NEW_RULE,
        ruleText: 'Always use TypeScript strict mode.',
      });

      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('## Change #1 of 10');
      expect(result).toContain('[NEW] **NEW RULE**');
      expect(result).toContain('Always use TypeScript strict mode.');
      expect(result).toContain('```text');
      expect(result).toContain('**Pattern:**');
      expect(result).toContain('**Category:**');
      expect(result).toContain('**Frequency:**');
    });

    it('should format a MODIFICATION change with before/after', () => {
      const change = createMockRuleSuggestion({
        type: RuleProposalType.MODIFICATION,
        ruleText: 'Always use TypeScript strict mode and null checks.',
        beforeAfter: {
          before: 'Use TypeScript strict mode.',
          after: 'Always use TypeScript strict mode and null checks.',
          changes: [
            { type: 'addition', text: 'and null checks' },
          ],
        },
      });

      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('[MOD] **MODIFICATION**');
      expect(result).toContain('### Comparison');
      expect(result).toContain('**Before:**');
      expect(result).toContain('**After:**');
      expect(result).toContain('Use TypeScript strict mode.');
      expect(result).toContain('Always use TypeScript strict mode and null checks.');
    });

    it('should format an ADDITION change', () => {
      const change = createMockRuleSuggestion({
        type: RuleProposalType.ADDITION,
        ruleText: 'Additionally, enable noUncheckedIndexedAccess.',
      });

      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('[ADD] **ADDITION**');
      expect(result).toContain('### Existing Rule');
      expect(result).toContain('### Addition');
      expect(result).toContain('Additionally, enable noUncheckedIndexedAccess.');
    });

    it('should handle null change gracefully', () => {
      const result = formatter.formatChange(null as any, 1, 10);

      expect(result).toContain('## Change Not Available');
      expect(result).toContain('**Error:** Change information is missing or invalid.');
    });

    it('should handle undefined change gracefully', () => {
      const result = formatter.formatChange(undefined as any, 1, 10);

      expect(result).toContain('## Change Not Available');
      expect(result).toContain('**Error:** Change information is missing or invalid.');
    });

    it('should display explanation when provided', () => {
      const change = createMockRuleSuggestion({
        explanation: 'This improves type safety.',
      });

      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('### Why This Rule?');
      expect(result).toContain('> This improves type safety.');
    });

    it('should not display explanation section when missing', () => {
      const change = createMockRuleSuggestion({
        explanation: undefined as any,
      });

      const result = formatter.formatChange(change, 1, 10);

      expect(result).not.toContain('### Why This Rule?');
    });

    it('should display confidence score correctly', () => {
      const change = createMockRuleSuggestion({ confidence: 0.85 });
      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('**Confidence:** **High** (85%)');
    });

    it('should display medium confidence', () => {
      const change = createMockRuleSuggestion({ confidence: 0.5 });
      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('**Confidence:** **Medium** (50%)');
    });

    it('should display low confidence', () => {
      const change = createMockRuleSuggestion({ confidence: 0.3 });
      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('**Confidence:** **Low** (30%)');
    });

    it('should default to medium confidence for invalid values', () => {
      const change = createMockRuleSuggestion({ confidence: -1 as any });
      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('**Confidence:** **Medium** (50%)');
    });

    it('should display content type', () => {
      const change = createMockRuleSuggestion({ contentType: 'code' });
      const result = formatter.formatChange(change, 1, 10);

      expect(result).toContain('**Content Type:** code');
    });
  });

  // ========================================================================
  // PATTERN SOURCE FORMATTING
  // ========================================================================

  describe('formatPatternSource', () => {
    it('should format pattern source correctly', () => {
      const pattern = createMockPattern({
        pattern_text: 'Use TypeScript strict mode',
        category: PatternCategory.CODE_STYLE,
        count: 5,
      });

      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('### Pattern Source');
      expect(result).toContain('**Pattern:** Use TypeScript strict mode');
      expect(result).toContain('**Category:** CODE_STYLE');
      expect(result).toContain('**Frequency:** 5 occurrences');
    });

    it('should handle singular occurrence', () => {
      const pattern = createMockPattern({ count: 1 });
      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Frequency:** 1 occurrence');
    });

    it('should display example corrections', () => {
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: 'Use JavaScript',
            user_correction: 'Use TypeScript',
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            original_suggestion: 'Disable strict mode',
            user_correction: 'Enable strict mode',
            timestamp: '2024-01-02T00:00:00Z',
          },
        ],
      });

      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('### Example Corrections');
      expect(result).toContain('**Example 1:**');
      expect(result).toContain('- Original: Use JavaScript');
      expect(result).toContain('- Correction: Use TypeScript');
      expect(result).toContain('**Example 2:**');
    });

    it('should handle null pattern gracefully', () => {
      const result = formatter.formatPatternSource(null as any);

      expect(result).toContain('### Pattern Source');
      expect(result).toContain('**Pattern information not available.**');
    });

    it('should handle undefined pattern gracefully', () => {
      const result = formatter.formatPatternSource(undefined as any);

      expect(result).toContain('### Pattern Source');
      expect(result).toContain('**Pattern information not available.**');
    });

    it('should handle missing pattern text', () => {
      const pattern = createMockPattern({ pattern_text: undefined as any });
      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Pattern:** N/A');
    });

    it('should handle missing category', () => {
      const pattern = createMockPattern({ category: undefined as any });
      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Category:** N/A');
    });

    it('should handle missing or invalid count', () => {
      const pattern = createMockPattern({ count: undefined as any });
      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Frequency:** 0 occurrences');
    });

    it('should handle infinite count', () => {
      const pattern = createMockPattern({ count: Infinity });
      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Frequency:** 0 occurrences');
    });

    it('should handle missing examples array', () => {
      const pattern = createMockPattern({ examples: undefined as any });
      const result = formatter.formatPatternSource(pattern);

      expect(result).not.toContain('### Example Corrections');
    });

    it('should handle empty examples array', () => {
      const pattern = createMockPattern({ examples: [] });
      const result = formatter.formatPatternSource(pattern);

      expect(result).not.toContain('### Example Corrections');
    });

    it('should limit examples to 2', () => {
      const pattern = createMockPattern({
        examples: [
          { original_suggestion: 'A', user_correction: 'B', timestamp: '2024-01-01T00:00:00Z' },
          { original_suggestion: 'C', user_correction: 'D', timestamp: '2024-01-02T00:00:00Z' },
          { original_suggestion: 'E', user_correction: 'F', timestamp: '2024-01-03T00:00:00Z' },
        ],
      });

      const result = formatter.formatPatternSource(pattern);

      expect(result).toContain('**Example 1:**');
      expect(result).toContain('**Example 2:**');
      expect(result).not.toContain('**Example 3:**');
    });
  });

  // ========================================================================
  // BEFORE/AFTER FORMATTING
  // ========================================================================

  describe('formatBeforeAfter', () => {
    it('should format before/after comparison', () => {
      const result = formatter.formatBeforeAfter(
        'Use TypeScript',
        'Use TypeScript strict mode'
      );

      expect(result).toContain('### Comparison');
      expect(result).toContain('**Before:**');
      expect(result).toContain('**After:**');
      expect(result).toContain('Use TypeScript');
      expect(result).toContain('Use TypeScript strict mode');
    });

    it('should highlight additions', () => {
      const result = formatter.formatBeforeAfter(
        'Use TypeScript',
        'Use TypeScript strict mode'
      );

      expect(result).toContain('**Changes:**');
      expect(result).toContain('- Added:');
      expect(result).toContain('**strict**');
      expect(result).toContain('**mode**');
    });

    it('should highlight deletions', () => {
      const result = formatter.formatBeforeAfter(
        'Use TypeScript with strict mode',
        'Use TypeScript'
      );

      expect(result).toContain('**Changes:**');
      expect(result).toContain('- Removed:');
      expect(result).toContain('~~with~~');
      expect(result).toContain('~~strict~~');
      expect(result).toContain('~~mode~~');
    });

    it('should handle empty strings', () => {
      const result = formatter.formatBeforeAfter('', '');

      expect(result).toContain('### Comparison');
      expect(result).toContain('**Before:**');
      expect(result).toContain('N/A');
      expect(result).toContain('**After:**');
    });

    it('should sanitize before and after text', () => {
      const result = formatter.formatBeforeAfter(
        '<script>alert("XSS")</script> Before',
        '<img src=x onerror=alert(1)> After'
      );

      expect(result).toContain('&lt;script&gt;');
      expect(result).toContain('&lt;img');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<img');
    });
  });

  // ========================================================================
  // SUMMARY FORMATTING
  // ========================================================================

  describe('formatSummary', () => {
    it('should format summary with all pending', () => {
      const state = createMockNavigationState({
        changes: [createMockRuleSuggestion(), createMockRuleSuggestion()],
        decisions: new Map(),
      });

      const result = formatter.formatSummary(state);

      expect(result).toContain('# Review Summary');
      expect(result).toContain('**Total Changes:** 2');
      expect(result).toContain('- Pending: 2');
      expect(result).toContain('- Approved: 0');
      expect(result).toContain('- Rejected: 0');
      expect(result).toContain('- Edited: 0');
      expect(result).toContain('**Progress:** 0% complete');
    });

    it('should format summary with mixed decisions', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);
      decisions.set(1, DecisionType.REJECTED);
      decisions.set(2, DecisionType.EDITED);

      const state = createMockNavigationState({
        changes: [
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
        ],
        decisions,
      });

      const result = formatter.formatSummary(state);

      expect(result).toContain('- Pending: 1');
      expect(result).toContain('- Approved: 1');
      expect(result).toContain('- Rejected: 1');
      expect(result).toContain('- Edited: 1');
      expect(result).toContain('**Progress:** 75% complete');
    });

    it('should handle empty changes list', () => {
      const state = createMockNavigationState({
        changes: [],
        decisions: new Map(),
      });

      const result = formatter.formatSummary(state);

      expect(result).toContain('**Total Changes:** 0');
      expect(result).not.toContain('**Progress:**');
    });

    it('should calculate progress correctly', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);
      decisions.set(1, DecisionType.APPROVED);
      decisions.set(2, DecisionType.APPROVED);

      const state = createMockNavigationState({
        changes: [
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
          createMockRuleSuggestion(),
        ],
        decisions,
      });

      const result = formatter.formatSummary(state);

      expect(result).toContain('**Progress:** 75% complete');
    });
  });

  // ========================================================================
  // ERROR FORMATTING
  // ========================================================================

  describe('formatError', () => {
    it('should format error message', () => {
      const error = new Error('Something went wrong');
      const result = formatter.formatError(error, 'session-123');

      expect(result).toContain('# ⚠️ Error');
      expect(result).toContain('**Something went wrong while displaying the review interface.**');
      expect(result).toContain('**What happened:**');
      expect(result).toContain('> Something went wrong');
      expect(result).toContain('**Session ID:** `session-123`');
    });

    it('should provide recovery instructions', () => {
      const error = new Error('Test error');
      const result = formatter.formatError(error);

      expect(result).toContain('**How to continue:**');
      expect(result).toContain('1. Try navigating to the next change');
      expect(result).toContain('2. Use "show all" to see all changes');
      expect(result).toContain('3. If the error persists, restart the review session');
    });

    it('should handle missing session ID', () => {
      const error = new Error('Test error');
      const result = formatter.formatError(error);

      expect(result).not.toContain('**Session ID:**');
    });

    it('should sanitize error message', () => {
      const error = new Error('<script>alert("XSS")</script> in error');
      const result = formatter.formatError(error);

      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });
  });

  // ========================================================================
  // CONTENT SANITIZATION
  // ========================================================================

  describe('sanitizeForMarkdown', () => {
    it('should escape HTML special characters', () => {
      const result = formatter.sanitizeForMarkdown('<div>Test</div>');

      expect(result).toContain('&lt;div&gt;');
      expect(result).not.toContain('<div>');
    });

    it('should escape ampersands', () => {
      const result = formatter.sanitizeForMarkdown('A & B');

      expect(result).toContain('A &amp; B');
    });

    it('should escape less than signs', () => {
      const result = formatter.sanitizeForMarkdown('A < B');

      expect(result).toContain('A &lt; B');
    });

    it('should escape greater than signs', () => {
      const result = formatter.sanitizeForMarkdown('A > B');

      expect(result).toContain('A &gt; B');
    });

    it('should remove dangerous javascript: links', () => {
      const result = formatter.sanitizeForMarkdown('[Click](javascript:alert(1))');

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('javascript:');
    });

    it('should remove dangerous data: links', () => {
      const result = formatter.sanitizeForMarkdown('[Click](data:text/html,<script>)');

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('data:');
    });

    it('should remove dangerous vbscript: links', () => {
      const result = formatter.sanitizeForMarkdown('[Click](vbscript:msgbox(1))');

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('vbscript:');
    });

    it('should remove script tags', () => {
      const result = formatter.sanitizeForMarkdown('<script>alert("XSS")</script>');

      expect(result).toContain('[REMOVED SCRIPT]');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should remove iframe tags', () => {
      const result = formatter.sanitizeForMarkdown('<iframe src="evil.com"></iframe>');

      expect(result).toContain('[REMOVED IFRAME]');
      expect(result).not.toContain('<iframe');
    });

    it('should remove event handlers', () => {
      const result = formatter.sanitizeForMarkdown('<div onclick="evil()">');

      expect(result).toContain('[REMOVED EVENT HANDLER]');
      expect(result).not.toContain('onclick');
    });

    it('should handle null input', () => {
      const result = formatter.sanitizeForMarkdown(null as any);

      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = formatter.sanitizeForMarkdown(undefined as any);

      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = formatter.sanitizeForMarkdown(123 as any);

      expect(result).toBe('');
    });

    it('should truncate very long content', () => {
      const longText = 'A'.repeat(10000);
      const result = formatter.sanitizeForMarkdown(longText);

      expect(result.length).toBeLessThan(6000);
      expect(result).toContain('... [truncated]');
    });

    it('should limit output length', () => {
      const longText = 'A'.repeat(6000);
      const result = formatter.sanitizeForMarkdown(longText);

      expect(result.length).toBeLessThanOrEqual(5000 + '... [truncated]'.length);
    });
  });

  // ========================================================================
  // TEXT TRUNCATION
  // ========================================================================

  describe('truncateRuleText', () => {
    it('should not truncate short text', () => {
      const result = formatter.truncateRuleText('Short text');

      expect(result).toBe('Short text');
    });

    it('should truncate long text', () => {
      const longText = 'A'.repeat(600);
      const result = formatter.truncateRuleText(longText);

      expect(result.length).toBeLessThan(600);
      expect(result).toContain('... [truncated]');
    });

    it('should respect custom max length', () => {
      const text = 'A'.repeat(200);
      const result = formatter.truncateRuleText(text, 100);

      expect(result.length).toBeLessThan(200);
      expect(result).toContain('... [truncated]');
    });

    it('should handle null input', () => {
      const result = formatter.truncateRuleText(null as any);

      expect(result).toBe('');
    });

    it('should handle undefined input', () => {
      const result = formatter.truncateRuleText(undefined as any);

      expect(result).toBe('');
    });

    it('should handle non-string input', () => {
      const result = formatter.truncateRuleText(123 as any);

      expect(result).toBe('');
    });

    it('should enforce maximum limit', () => {
      const text = 'A'.repeat(1000);
      const result = formatter.truncateRuleText(text, 10000);

      expect(result.length).toBeLessThanOrEqual(500 + '... [truncated]'.length);
    });
  });

  // ========================================================================
  // PAGINATION
  // ========================================================================

  describe('formatAllChanges', () => {
    const createChanges = (count: number): RuleSuggestion[] => {
      return Array.from({ length: count }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );
    };

    it('should format first page correctly', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 3,
      });

      expect(result).toContain('# All Proposed Changes');
      expect(result).toContain('**Page 1 of 3**');
      expect(result).toContain('## Change #1 of 25');
      expect(result).toContain('## Change #10 of 25');
      expect(result).not.toContain('## Change #11');
    });

    it('should format middle page correctly', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 2,
        totalPages: 3,
      });

      expect(result).toContain('**Page 2 of 3**');
      expect(result).toContain('## Change #11 of 25');
      expect(result).toContain('## Change #20 of 25');
      expect(result).not.toContain('## Change #10');
      expect(result).not.toContain('## Change #21');
    });

    it('should format last page correctly', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 3,
        totalPages: 3,
      });

      expect(result).toContain('**Page 3 of 3**');
      expect(result).toContain('## Change #21 of 25');
      expect(result).toContain('## Change #25 of 25');
      expect(result).not.toContain('## Change #20');
    });

    it('should show pagination controls', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 2,
        totalPages: 3,
      });

      expect(result).toContain('**Navigation:**');
      expect(result).toContain('- Previous page: `show page 1`');
      expect(result).toContain('- Next page: `show page 3`');
    });

    it('should not show pagination for single page', () => {
      const changes = createChanges(5);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
      });

      expect(result).not.toContain('**Navigation:**');
    });

    it('should only show previous link on first page', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 3,
      });

      expect(result).not.toContain('- Previous page:');
      expect(result).toContain('- Next page: `show page 2`');
    });

    it('should only show next link on last page', () => {
      const changes = createChanges(25);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 3,
        totalPages: 3,
      });

      expect(result).toContain('- Previous page: `show page 2`');
      expect(result).not.toContain('- Next page:');
    });

    it('should handle null changes gracefully', () => {
      const result = formatter.formatAllChanges(null as any, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
      });

      expect(result).toContain('# Error');
      expect(result).toContain('**Invalid changes array provided.**');
    });

    it('should handle undefined changes gracefully', () => {
      const result = formatter.formatAllChanges(undefined as any, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 1,
      });

      expect(result).toContain('# Error');
      expect(result).toContain('**Invalid changes array provided.**');
    });

    it('should handle invalid pagination options', () => {
      const changes = createChanges(5);
      const result = formatter.formatAllChanges(changes, null as any);

      expect(result).toContain('**Invalid pagination options.**');
    });

    it('should enforce maximum page size of 100', () => {
      const changes = createChanges(200);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 150,
        currentPage: 1,
        totalPages: 2,
      });

      expect(result).toContain('## Change #1 of 200');
      expect(result).toContain('## Change #100 of 200');
      expect(result).not.toContain('## Change #101');
    });

    it('should handle minimum page size of 1', () => {
      const changes = createChanges(10);
      const result = formatter.formatAllChanges(changes, {
        pageSize: 0,
        currentPage: 1,
        totalPages: 10,
      });

      expect(result).toContain('## Change #1 of 10');
      expect(result).not.toContain('## Change #2');
    });
  });

  // ========================================================================
  // SECURITY VALIDATION
  // ========================================================================

  describe('validateAndSanitize', () => {
    it('should validate safe content', () => {
      const result = formatter.validateAndSanitize('Safe content here');

      expect(result.isSafe).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.sanitizedContent).toBe('Safe content here');
    });

    it('should detect dangerous javascript: protocol', () => {
      const result = formatter.validateAndSanitize('[Click](javascript:alert(1))');

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content contains dangerous protocol: javascript:');
      expect(result.sanitizedContent).toContain('[REMOVED DANGEROUS LINK]');
    });

    it('should detect dangerous data: protocol', () => {
      const result = formatter.validateAndSanitize('data:text/html,<script>');

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content contains dangerous protocol: data:');
    });

    it('should detect script tags', () => {
      const result = formatter.validateAndSanitize('<script>alert(1)</script>');

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content contains script tags (will be removed)');
    });

    it('should detect HTML tags', () => {
      const result = formatter.validateAndSanitize('<div>Hello</div>');

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content contains HTML tags (will be escaped)');
    });

    it('should detect data URLs', () => {
      const result = formatter.validateAndSanitize('data:image/png;base64,abc123');

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content contains data URLs (will be sanitized)');
    });

    it('should handle null content', () => {
      const result = formatter.validateAndSanitize(null as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is null or undefined');
    });

    it('should handle undefined content', () => {
      const result = formatter.validateAndSanitize(undefined as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is null or undefined');
    });

    it('should handle non-string content', () => {
      const result = formatter.validateAndSanitize(123 as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is not a string');
    });

    it('should detect excessive length', () => {
      const longText = 'A'.repeat(60000);
      const result = formatter.validateAndSanitize(longText);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content exceeds maximum length');
      expect(result.sanitizedContent?.length).toBeLessThan(60000);
    });
  });

  // ========================================================================
  // CHANGE HEADER
  // ========================================================================

  describe('formatChangeHeader', () => {
    it('should format header correctly', () => {
      const result = formatter.formatChangeHeader(5, 10);

      expect(result).toBe('## Change #5 of 10');
    });

    it('should handle first change', () => {
      const result = formatter.formatChangeHeader(1, 10);

      expect(result).toBe('## Change #1 of 10');
    });

    it('should handle last change', () => {
      const result = formatter.formatChangeHeader(10, 10);

      expect(result).toBe('## Change #10 of 10');
    });
  });
});
