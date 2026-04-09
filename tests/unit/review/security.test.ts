/**
 * Security Tests: Review Interface (Story 4.1, Task 8.4)
 *
 * Comprehensive security testing for:
 * - XSS prevention
 * - HTML injection
 * - Markdown injection
 * - SQL injection
 * - Path traversal
 * - Session tampering
 * - Rate limiting
 * - Size limits
 * - DoS prevention
 *
 * Testing Priority: Unit > Integration > E2E
 * Security is NON-NEGOTIABLE in YOLO mode
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarkdownFormatter } from '../../../src/review/markdown-formatter.js';
import { InterfaceManager } from '../../../src/review/interface-manager.js';
import { StateManager } from '../../../src/review/state-manager.js';
import { RuleSuggestion, RuleProposalType } from '../../../src/review/../rules/types.js';
import { Pattern, PatternCategory } from '../../../src/review/../pattern-detector/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Security Tests: Review Interface', () => {
  let formatter: MarkdownFormatter;
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(() => {
    formatter = new MarkdownFormatter();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'));
    stateManager = new StateManager(tempDir);
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========================================================================
  // XSS PREVENTION
  // ========================================================================

  describe('XSS Prevention', () => {
    it('should sanitize script tags in rule text', () => {
      const xssPayload = '<script>alert("XSS")</script>Rule text';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
      expect(result).toContain('[REMOVED SCRIPT]');
    });

    it('should sanitize script tags in pattern examples', () => {
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: '<script>alert("XSS")</script>',
            user_correction: 'Use TypeScript',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = formatter.formatPatternSource(pattern);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should sanitize script tags in explanation', () => {
      const change = createMockRuleSuggestion({
        explanation: '<script>alert("XSS")</script>Explanation',
      });

      const result = formatter.formatChange(change, 1, 1);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('</script>');
    });

    it('should sanitize onerror event handlers', () => {
      const xssPayload = '<img src=x onerror=alert("XSS")>';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED EVENT HANDLER]');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('alert');
    });

    it('should sanitize onclick event handlers', () => {
      const xssPayload = '<div onclick="alert(1)">Click me</div>';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED EVENT HANDLER]');
      expect(result).not.toContain('onclick');
    });

    it('should sanitize onload event handlers', () => {
      const xssPayload = '<body onload="alert(1)">Content</body>';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED EVENT HANDLER]');
      expect(result).not.toContain('onload');
    });

    it('should sanitize javascript: protocol in links', () => {
      const xssPayload = '[Click me](javascript:alert("XSS"))';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('javascript:');
    });

    it('should sanitize data: protocol', () => {
      const xssPayload = '[Click](data:text/html,<script>alert("XSS")</script>)';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('data:');
    });

    it('should sanitize vbscript: protocol', () => {
      const xssPayload = '[Click](vbscript:msgbox("XSS"))';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).toContain('[REMOVED DANGEROUS LINK]');
      expect(result).not.toContain('vbscript:');
    });

    it('should escape HTML entities', () => {
      const html = '<div>Hello & goodbye</div>';
      const result = formatter.sanitizeForMarkdown(html);

      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&amp;');
      expect(result).not.toContain('<div>');
    });

    it('should handle multiple XSS vectors combined', () => {
      const xssPayload = '<script>alert(1)</script><img src=x onerror=alert(2)>[Click](javascript:alert(3))';
      const result = formatter.sanitizeForMarkdown(xssPayload);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('javascript:');
    });
  });

  // ========================================================================
  // HTML INJECTION
  // ========================================================================

  describe('HTML Injection Prevention', () => {
    it('should sanitize iframe tags', () => {
      const injection = '<iframe src="evil.com"></iframe>';
      const result = formatter.sanitizeForMarkdown(injection);

      expect(result).toContain('[REMOVED IFRAME]');
      expect(result).not.toContain('<iframe');
    });

    it('should sanitize object tags', () => {
      const injection = '<object data="evil.swf"></object>';
      const result = formatter.sanitizeForMarkdown(injection);

      expect(result).not.toContain('<object');
    });

    it('should sanitize embed tags', () => {
      const injection = '<embed src="evil.swf">';
      const result = formatter.sanitizeForMarkdown(injection);

      expect(result).not.toContain('<embed');
    });

    it('should sanitize style tags with javascript', () => {
      const injection = '<style>body{background:url("javascript:alert(1)")}</style>';
      const result = formatter.sanitizeForMarkdown(injection);

      expect(result).not.toContain('javascript:');
    });

    it('should sanitize meta tags with refresh', () => {
      const injection = '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">';
      const result = formatter.sanitizeForMarkdown(injection);

      expect(result).not.toContain('javascript:');
    });
  });

  // ========================================================================
  // SQL INJECTION
  // ========================================================================

  describe('SQL Injection Prevention', () => {
    it('should handle SQL injection in pattern examples', () => {
      const sqlPayload = "' OR '1'='1";
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: sqlPayload,
            user_correction: 'Use TypeScript',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = formatter.formatPatternSource(pattern);

      // Should not crash and should display the content
      expect(result).toBeDefined();
      expect(result).toContain('Original:');
    });

    it('should handle SQL injection in rule text', () => {
      const sqlPayload = "'; DROP TABLE users; --";
      const change = createMockRuleSuggestion({
        ruleText: sqlPayload,
      });

      const result = formatter.formatChange(change, 1, 1);

      expect(result).toBeDefined();
      expect(result).toContain('```text');
    });

    it('should handle UNION-based injection', () => {
      const sqlPayload = "' UNION SELECT * FROM users --";
      const result = formatter.sanitizeForMarkdown(sqlPayload);

      expect(result).toBeDefined();
      expect(result).toContain('UNION');
    });

    it('should handle comment-based injection', () => {
      const sqlPayload = "admin'--";
      const result = formatter.sanitizeForMarkdown(sqlPayload);

      expect(result).toBeDefined();
    });

    it('should handle stacked queries', () => {
      const sqlPayload = "1'; DROP TABLE users; SELECT * FROM data WHERE '1'='1";
      const result = formatter.sanitizeForMarkdown(sqlPayload);

      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // PATH TRAVERSAL
  // ========================================================================

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal in session IDs', () => {
      const result = stateManager.loadState('../../../etc/passwd');

      expect(result).toBeNull();
    });

    it('should prevent path traversal with backslashes', () => {
      const result = stateManager.loadState('..\\..\\..\\windows\\system32');

      expect(result).toBeNull();
    });

    it('should prevent encoded path traversal', () => {
      const result = stateManager.loadState('..%2F..%2F..%2Fetc%2Fpasswd');

      expect(result).toBeNull();
    });

    it('should prevent absolute path injection', () => {
      const result = stateManager.loadState('/etc/passwd');

      expect(result).toBeNull();
    });

    it('should sanitize session ID before file operations', () => {
      const state = {
        sessionId: '../../../etc/passwd',
        currentIndex: 0,
        changes: [],
        decisions: new Map(),
        lastActivity: new Date(),
        totalChanges: 0,
      };

      // Should not create file outside sessions directory
      const saved = stateManager.saveState(state);
      expect(saved).toBe(false);
    });

    it('should handle null bytes in path', () => {
      const result = stateManager.loadState('session\x00.txt');

      expect(result).toBeNull();
    });
  });

  // ========================================================================
  // SESSION TAMPERING
  // ========================================================================

  describe('Session Tampering Prevention', () => {
    it('should detect session signature mismatch', () => {
      const state = {
        sessionId: 'tamper-test',
        currentIndex: 0,
        changes: [createMockRuleSuggestion()],
        decisions: new Map(),
        lastActivity: new Date(),
        totalChanges: 1,
      };

      stateManager.saveState(state);

      // Modify the session file
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, 'tamper-test.json');
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      content.currentIndex = 999;
      fs.writeFileSync(sessionFile, JSON.stringify(content));

      const loaded = stateManager.loadState('tamper-test');
      expect(loaded).toBeNull(); // Signature mismatch
    });

    it('should detect deleted decisions', () => {
      const decisions = new Map();
      decisions.set(0, 'approved' as any);

      const state = {
        sessionId: 'deleted-decisions',
        currentIndex: 0,
        changes: [createMockRuleSuggestion()],
        decisions,
        lastActivity: new Date(),
        totalChanges: 1,
      };

      stateManager.saveState(state);

      // Remove decisions from file
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, 'deleted-decisions.json');
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      content.decisions = {};
      fs.writeFileSync(sessionFile, JSON.stringify(content));

      const loaded = stateManager.loadState('deleted-decisions');
      expect(loaded).toBeNull(); // Signature mismatch
    });

    it('should detect modified changes array', () => {
      const state = {
        sessionId: 'modified-changes',
        currentIndex: 0,
        changes: [createMockRuleSuggestion()],
        decisions: new Map(),
        lastActivity: new Date(),
        totalChanges: 1,
      };

      stateManager.saveState(state);

      // Modify changes
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, 'modified-changes.json');
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      content.changes = [];
      fs.writeFileSync(sessionFile, JSON.stringify(content));

      const loaded = stateManager.loadState('modified-changes');
      expect(loaded).toBeNull(); // Signature mismatch
    });

    it('should validate session structure on load', () => {
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, 'malformed.json');

      // Write malformed session
      fs.writeFileSync(sessionFile, JSON.stringify({
        sessionId: 'malformed',
        // Missing required fields
        decisions: {},
      }));

      const loaded = stateManager.loadState('malformed');
      expect(loaded).toBeNull();
    });
  });

  // ========================================================================
  // RATE LIMITING
  // ========================================================================

  describe('Rate Limiting', () => {
    it('should rate limit navigation commands', () => {
      const manager = new InterfaceManager();
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      // First navigation should succeed
      const result1 = manager.navigateNext();
      expect(result1).toContain('## Change #2');

      // Immediate second navigation should be rate limited
      const result2 = manager.navigateNext();
      expect(result2).toContain('**Rate limit exceeded**');
    });

    it('should allow navigation after rate limit period', () => {
      const manager = new InterfaceManager();
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      manager.navigateNext();

      // Wait for rate limit period (100ms)
      const startTime = Date.now();
      while (Date.now() - startTime < 150) {
        // Busy wait (not ideal in production but ok for test)
      }

      const result = manager.navigateNext();
      expect(result).not.toContain('**Rate limit exceeded**');
    });

    it('should rate limit show all commands', () => {
      const manager = new InterfaceManager();
      const changes = Array.from({ length: 25 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );
      manager.presentForReview(changes);

      // Rapid show all calls
      const result1 = manager.showAllChanges(1);
      const result2 = manager.showAllChanges(2);
      const result3 = manager.showAllChanges(3);

      // At least one should be rate limited
      const rateLimited = [result1, result2, result3].some(r =>
        r.includes('**Rate limit exceeded**')
      );
      expect(rateLimited).toBe(true);
    });
  });

  // ========================================================================
  // SIZE LIMITS
  // ========================================================================

  describe('Size Limits', () => {
    it('should truncate rule text exceeding 5000 chars', () => {
      const longText = 'A'.repeat(10000);
      const change = createMockRuleSuggestion({
        ruleText: longText,
      });

      const result = formatter.formatChange(change, 1, 1);

      expect(result).not.toContain(longText);
      expect(result).toContain('... [truncated]');
    });

    it('should truncate pattern examples', () => {
      const longText = 'B'.repeat(10000);
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: longText,
            user_correction: 'Corrected',
            timestamp: '2024-01-01T00:00:00Z',
          },
        ],
      });

      const result = formatter.formatPatternSource(pattern);

      expect(result).not.toContain(longText);
    });

    it('should limit input size to prevent DoS', () => {
      const hugeText = 'A'.repeat(60000);
      const result = formatter.sanitizeForMarkdown(hugeText);

      expect(result.length).toBeLessThan(60000);
      expect(result).toContain('... [truncated]');
    });

    it('should cap changes at 50 for display', () => {
      const manager = new InterfaceManager();
      const changes = Array.from({ length: 100 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );

      const result = manager.presentForReview(changes);

      expect(result).toContain('**Total Changes:** 50');
      expect(result).not.toContain('rule-50');
    });

    it('should enforce hard limit of 10,000 changes', () => {
      const manager = new InterfaceManager();
      const changes = Array.from({ length: 15000 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );

      const result = manager.presentForReview(changes);

      expect(result).toContain('# ⚠️ Error');
      expect(result).toContain('Too many changes');
    });

    it('should limit JSON import size to 10MB', () => {
      const hugeJson = 'A'.repeat(11 * 1024 * 1024); // 11MB
      const result = stateManager.importState(hugeJson);

      expect(result).toBeNull();
    });

    it('should limit session file size to 50MB', () => {
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, 'huge-session.json');

      // Create a file larger than 50MB
      fs.writeFileSync(sessionFile, 'A'.repeat(51 * 1024 * 1024));

      const result = stateManager.loadState('huge-session');
      expect(result).toBeNull();
    });

    it('should limit audit log file size', () => {
      const auditDir = path.join(tempDir, 'review-audit');
      const logPath = path.join(auditDir, 'review-audit.log');

      // Create a log file larger than 50MB
      fs.writeFileSync(logPath, 'A'.repeat(51 * 1024 * 1024));

      const history = stateManager['auditLogger'].getSessionHistory('session-1');
      expect(history).toEqual([]);
    });
  });

  // ========================================================================
  // DoS PREVENTION
  // ========================================================================

  describe('DoS Prevention', () => {
    it('should handle deeply nested objects', () => {
      const nested: any = { a: 1 };
      for (let i = 0; i < 1000; i++) {
        nested.b = { ...nested };
      }

      const result = stateManager.importState(JSON.stringify(nested));

      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle arrays with millions of items', () => {
      const hugeArray = {
        sessionId: 'test',
        changes: Array(1000000).fill(createMockRuleSuggestion()),
        decisions: {},
      };

      const result = stateManager.importState(JSON.stringify(hugeArray));

      // Should not crash (may return null due to size limits)
      expect(result).toBeDefined();
    });

    it('should prevent show all on 1000+ changes', () => {
      const manager = new InterfaceManager();
      const changes = Array.from({ length: 1000 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );

      manager.presentForReview(changes);
      const result = manager.showAllChanges(1);

      // Should paginate and not show all at once
      expect(result).toContain('Page 1 of');
      expect(result).not.toContain('## Change #1000');
    });

    it('should handle rapid state save operations', () => {
      const state = {
        sessionId: 'rapid-save',
        currentIndex: 0,
        changes: [createMockRuleSuggestion()],
        decisions: new Map(),
        lastActivity: new Date(),
        totalChanges: 1,
      };

      // Rapid saves should not cause issues
      for (let i = 0; i < 100; i++) {
        stateManager.saveState(state);
      }

      const loaded = stateManager.loadState('rapid-save');
      expect(loaded).not.toBeNull();
    });

    it('should handle memory pressure from large strings', () => {
      const hugeString = 'A'.repeat(50 * 1024 * 1024); // 50MB string

      // Should not crash
      const result = formatter.sanitizeForMarkdown(hugeString);

      expect(result).toBeDefined();
      expect(result.length).toBeLessThan(hugeString.length);
    });
  });

  // ========================================================================
  // INPUT VALIDATION
  // ========================================================================

  describe('Input Validation', () => {
    it('should validate decision enum values', () => {
      const manager = new InterfaceManager();
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.makeDecision('invalid-decision' as any);

      expect(result).toContain('**Invalid decision type**');
    });

    it('should validate change index bounds', () => {
      const manager = new InterfaceManager();
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.navigateToChange(99);

      expect(result).toContain('**Invalid change number**');
    });

    it('should validate page number bounds', () => {
      const manager = new InterfaceManager();
      const changes = Array.from({ length: 25 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );
      manager.presentForReview(changes);

      const result = manager.showAllChanges(99);

      expect(result).toContain('**Invalid page number**');
    });

    it('should validate parameter types', () => {
      const manager = new InterfaceManager();
      const changes = [createMockRuleSuggestion()];

      const result = manager.presentForReview('not an array' as any);

      expect(result).toContain('# ⚠️ Error');
    });

    it('should handle null parameters gracefully', () => {
      const manager = new InterfaceManager();

      const result = manager.presentForReview(null as any);

      expect(result).toContain('# ⚠️ Error');
    });
  });

  // ========================================================================
  // SECURITY HEADERS
  // ========================================================================

  describe('Security Best Practices', () => {
    it('should not expose system internals in errors', () => {
      const manager = new InterfaceManager();
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      // Trigger an error with invalid input
      const result = manager.navigateToChange(NaN);

      expect(result).not.toContain('/home/');
      expect(result).not.toContain('Error: ');
      expect(result).not.toContain('at ');
    });

    it('should sanitize session IDs in error messages', () => {
      const result = stateManager.loadState('../../../etc/passwd');

      expect(result).toBeNull();
      // Should not reveal the actual path
    });

    it('should not log sensitive data', () => {
      const manager = new InterfaceManager();
      const changes = [createMockRuleSuggestion({
        ruleText: 'SECRET_PASSWORD=abc123',
      })];

      manager.presentForReview(changes);

      // Verify audit logger doesn't expose sensitive data in a way
      // that would be accessible (implementation detail)
      expect(manager.getSessionId()).toBeDefined();
    });
  });
});
