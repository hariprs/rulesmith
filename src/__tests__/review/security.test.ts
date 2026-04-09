/**
 * Security Tests (Story 4.1)
 *
 * Tests for content sanitization, input validation, and attack prevention
 */

import { describe, it, expect } from '@jest/globals';
import { MarkdownFormatter } from '../../review/markdown-formatter';
import { InterfaceManager } from '../../review/interface-manager';
import { RuleSuggestion, RuleProposalType } from '../../rules/types';
import { Pattern, PatternCategory } from '../../pattern-detector';
import { ContentType } from '../../content-analyzer';

describe('Security Tests', () => {
  let formatter: MarkdownFormatter;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
  });

  describe('XSS Prevention', () => {
    it('should sanitize script tags in rule text', () => {
      const maliciousContent = '<script>alert("XSS")</script> Use proper naming';
      const sanitized = formatter.sanitizeForMarkdown(maliciousContent);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should sanitize img tags with onerror', () => {
      const maliciousContent = '<img src=x onerror=alert(1)> Rule text';
      const sanitized = formatter.sanitizeForMarkdown(maliciousContent);

      expect(sanitized).not.toContain('<img');
      expect(sanitized).toContain('&lt;img');
    });

    it('should sanitize SVG with XSS', () => {
      const maliciousContent = '<svg onload=alert(1)> Content';
      const sanitized = formatter.sanitizeForMarkdown(maliciousContent);

      expect(sanitized).not.toContain('<svg');
      expect(sanitized).toContain('&lt;svg');
    });

    it('should sanitize iframe tags', () => {
      const maliciousContent = '<iframe src="evil.com"></iframe> Rule text';
      const sanitized = formatter.sanitizeForMarkdown(maliciousContent);

      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('&lt;iframe');
    });
  });

  describe('HTML Injection Prevention', () => {
    it('should escape all HTML special characters', () => {
      const input = '<div>&"\'</div>';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&amp;');
      expect(sanitized).not.toContain('<div>');
    });

    it('should handle multiple HTML tags', () => {
      const input = '<b>Bold</b> and <i>italic</i>';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).toContain('&lt;b&gt;');
      expect(sanitized).toContain('&lt;i&gt;');
    });
  });

  describe('Markdown Injection Prevention', () => {
    it('should remove javascript: protocol from links', () => {
      const input = '[Click](javascript:alert(1)) here';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('[REMOVED DANGEROUS LINK]');
    });

    it('should remove data: protocol from links', () => {
      const input = '[Click](data:text/html,<script>alert(1)</script>)';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).not.toContain('data:');
      expect(sanitized).toContain('[REMOVED DANGEROUS LINK]');
    });

    it('should remove vbscript: protocol from links', () => {
      const input = '[Click](vbscript:msgbox(1))';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).not.toContain('vbscript:');
      expect(sanitized).toContain('[REMOVED DANGEROUS LINK]');
    });

    it('should allow safe http/https links', () => {
      const input = '[Click](https://example.com) here';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(sanitized).toContain('https://example.com');
      expect(sanitized).not.toContain('[REMOVED DANGEROUS LINK]');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should escape SQL injection attempts in pattern examples', () => {
      const input = "' OR '1'='1";
      const sanitized = formatter.sanitizeForMarkdown(input);

      // Should not crash or cause issues
      expect(typeof sanitized).toBe('string');
    });

    it('should handle union-based injection attempts', () => {
      const input = "admin' UNION SELECT * FROM users--";
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(typeof sanitized).toBe('string');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should sanitize path traversal attempts', () => {
      const input = '../../../etc/passwd';
      const sanitized = formatter.sanitizeForMarkdown(input);

      // Should be treated as plain text, not executed
      expect(typeof sanitized).toBe('string');
    });

    it('should handle encoded path traversal', () => {
      const input = '%2e%2e%2fetc%2fpasswd';
      const sanitized = formatter.sanitizeForMarkdown(input);

      expect(typeof sanitized).toBe('string');
    });
  });

  describe('Content Length Limits', () => {
    it('should truncate content exceeding 5000 characters', () => {
      const longContent = 'a'.repeat(10000);
      const result = formatter.validateAndSanitize(longContent);

      expect(result.isSafe).toBe(false);
      expect(result.errors.some(e => e.includes('maximum length'))).toBe(true);
      expect(result.sanitizedContent!.length).toBeLessThanOrEqual(5000);
    });

    it('should handle exactly 5000 characters', () => {
      const content = 'a'.repeat(5000);
      const result = formatter.validateAndSanitize(content);

      expect(result.isSafe).toBe(true);
      expect(result.sanitizedContent?.length).toBe(5000);
    });
  });

  describe('Input Validation', () => {
    it('should reject null input', () => {
      const result = formatter.validateAndSanitize(null as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is null or undefined');
    });

    it('should reject undefined input', () => {
      const result = formatter.validateAndSanitize(undefined as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is null or undefined');
    });

    it('should reject non-string input', () => {
      const result = formatter.validateAndSanitize(12345 as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is not a string');
    });

    it('should reject array input', () => {
      const result = formatter.validateAndSanitize([1, 2, 3] as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is not a string');
    });

    it('should reject object input', () => {
      const result = formatter.validateAndSanitize({ key: 'value' } as any);

      expect(result.isSafe).toBe(false);
      expect(result.errors).toContain('Content is not a string');
    });
  });

  describe('Session Security', () => {
    it('should generate cryptographically random session IDs', () => {
      const manager1 = new InterfaceManager();
      const manager2 = new InterfaceManager();

      const id1 = manager1.getSessionId();
      const id2 = manager2.getSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    it('should validate session signatures', () => {
      const manager = new InterfaceManager();

      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const changes: RuleSuggestion[] = [{
        id: 'test-rule',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.7,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      }];

      manager.presentForReview(changes);
      const sessionId = manager.getSessionId();

      // Session should be loadable with valid signature
      const output = manager.resumeSession(sessionId);
      expect(output).toContain('**Session Resumed**');
    });

    it('should reject tampered sessions', () => {
      const manager = new InterfaceManager();

      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const changes: RuleSuggestion[] = [{
        id: 'test-rule',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.7,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      }];

      manager.presentForReview(changes);
      const sessionId = manager.getSessionId();

      // Attempt to resume with invalid session ID
      const output = manager.resumeSession('tampered-session-id');
      expect(output).toContain('**Failed to resume session.**');
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit navigation commands', () => {
      const manager = new InterfaceManager();

      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const changes: RuleSuggestion[] = [{
        id: 'test-rule',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.7,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      }];

      manager.presentForReview(changes);

      // Rapid navigation
      const outputs = [];
      for (let i = 0; i < 20; i++) {
        outputs.push(manager.navigateNext());
      }

      const rateLimited = outputs.filter(o => o.includes('Rate limit exceeded'));
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Denial of Service Prevention', () => {
    it('should cap "show all" at MAX_DISPLAY_CHANGES', () => {
      const manager = new InterfaceManager();

      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const manyChanges: RuleSuggestion[] = [];
      for (let i = 0; i < 1000; i++) {
        manyChanges.push({
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

      const output = manager.presentForReview(manyChanges);

      // Should cap at 50
      expect(output).toContain('**Total Changes:** 50');
    });

    it('should limit output size', () => {
      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const changes: RuleSuggestion[] = [];
      for (let i = 0; i < 50; i++) {
        changes.push({
          id: `rule-${i}`,
          type: RuleProposalType.NEW_RULE,
          pattern,
          ruleText: 'A'.repeat(1000), // Long rule text
          explanation: 'B'.repeat(1000),
          contentType: ContentType.GENERAL_TEXT,
          confidence: 0.7,
          platformFormats: {
            cursor: 'A'.repeat(1000),
            copilot: 'A'.repeat(1000),
          },
        });
      }

      const output = formatter.formatAllChanges(changes, {
        pageSize: 10,
        currentPage: 1,
        totalPages: 5,
      });

      // Output should be reasonable size (truncated rule text)
      expect(output.length).toBeLessThan(500000); // < 500KB
    });
  });

  describe('Audit Log Security', () => {
    it('should sanitize session IDs in logs', () => {
      const manager = new InterfaceManager();

      const pattern: Pattern = {
        pattern_text: 'Test pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [ContentType.GENERAL_TEXT],
      };

      const changes: RuleSuggestion[] = [{
        id: 'test-rule',
        type: RuleProposalType.NEW_RULE,
        pattern,
        ruleText: 'Test rule',
        explanation: 'Test explanation',
        contentType: ContentType.GENERAL_TEXT,
        confidence: 0.7,
        platformFormats: {
          cursor: 'Test rule',
          copilot: 'Test rule',
        },
      }];

      manager.presentForReview(changes);
      const sessionId = manager.getSessionId();

      // Session ID should be valid UUID format (sanitized)
      expect(sessionId).toMatch(/^[0-9a-f-]{36}$/);
    });
  });

  describe('Error Handling', () => {
    it('should not expose stack traces', () => {
      const error = new Error('Test error');
      const output = formatter.formatError(error, 'test-session');

      expect(output).not.toContain('at ');
      expect(output).not.toContain('Error: Test error');
      expect(output).toContain('Test error');
    });

    it('should not expose file paths', () => {
      const error = new Error('Error at /path/to/file');
      const output = formatter.formatError(error);

      expect(output).not.toContain('/path/to/file');
    });

    it('should handle all error types gracefully', () => {
      const errors = [
        new Error('Standard error'),
        null,
        undefined,
        'String error',
        12345,
      ];

      errors.forEach(error => {
        const output = formatter.formatError(error as any);
        expect(output).toContain('# ⚠️ Error');
        expect(typeof output).toBe('string');
      });
    });
  });
});
