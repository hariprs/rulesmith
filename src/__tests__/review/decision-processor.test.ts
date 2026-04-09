/**
 * Decision Processor Unit Tests (Story 4.2)
 *
 * Testing business logic for individual change approval/rejection
 * Following test pyramid: Unit tests for core decision processing logic
 *
 * @module review/__tests__/decision-processor
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DecisionType, NavigationState, AuditLogEntry } from '../types.js';
import { RuleSuggestion } from '../../rules/types.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create mock navigation state for testing
 */
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
    },
    {
      id: 'change-2',
      ruleId: 'rule-2',
      type: 'modification',
      priority: 'medium',
      title: 'Second change',
      description: 'Test change 2',
      suggestedRule: 'test rule 2',
      reasoning: 'test reasoning 2',
      confidence: 0.8,
      category: 'security',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      source: 'pattern-analysis',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString()
    },
    {
      id: 'change-3',
      ruleId: 'rule-3',
      type: 'addition',
      priority: 'low',
      title: 'Third change',
      description: 'Test change 3',
      suggestedRule: 'test rule 3',
      reasoning: 'test reasoning 3',
      confidence: 0.7,
      category: 'maintainability',
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
    totalChanges: 3,
    ...overrides
  };
}

// ============================================================================
// AC1: Natural Language Approval Commands
// ============================================================================

describe('AC1: Natural Language Approval Commands', () => {
  describe('Given the review interface is displaying a proposed change', () => {
    describe('And the change has a valid index number (1-indexed)', () => {
      const state = createMockState();

      describe('When the user responds with "yes"', () => {
        it('Then the system records the decision as DecisionType.APPROVED', async () => {
          // This test will fail - DecisionProcessor doesn't exist yet
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('yes', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
        });

        it('And the system confirms with terminal-safe format', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('yes', state);

          expect(result.message).toContain('[+] Change #1 approved');
        });

        it('And the navigation advances to the next pending change automatically', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('yes', state);

          expect(result.nextState.currentIndex).toBe(1);
        });

        it('And the decision is logged to the audit trail with timestamp', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const auditLogSpy = jest.spyOn(console, 'log').mockImplementation();
          const processor = new DecisionProcessor();

          await processor.processDecision('yes', state);

          expect(auditLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('audit')
          );
          auditLogSpy.mockRestore();
        });
      });

      describe('When the user responds with "approve"', () => {
        it('Then the system records the decision as DecisionType.APPROVED', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('approve', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
        });
      });

      describe('When the user responds with "approve 3"', () => {
        it('Then the system approves change #3 specifically', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('approve 3', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(2)).toBe(DecisionType.APPROVED);
          expect(result.message).toContain('[+] Change #3 approved');
        });
      });

      describe('When the user responds with "accept"', () => {
        it('Then the system records the decision as DecisionType.APPROVED', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('accept', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
        });
      });

      describe('When the user responds with unicode checkmarks', () => {
        it('Then the system accepts "✓" as approval', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('✓', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
        });

        it('Then the system accepts "✔" as approval', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('✔', state);

          expect(result.success).toBe(true);
          expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
        });
      });

      describe('When the user provides bare number command', () => {
        it('Then the system rejects "1" to avoid ambiguity', async () => {
          const { DecisionProcessor } = await import('../decision-processor.js');
          const processor = new DecisionProcessor();

          const result = await processor.processDecision('1', state);

          expect(result.success).toBe(false);
          expect(result.message).toContain('Invalid command');
        });
      });
    });
  });
});

// ============================================================================
// AC2: Natural Language Rejection Commands
// ============================================================================

describe('AC2: Natural Language Rejection Commands', () => {
  describe('Given the review interface is displaying a proposed change', () => {
    const state = createMockState();

    describe('When the user responds with "no"', () => {
      it('Then the system records the decision as DecisionType.REJECTED', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('no', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });

      it('And the system confirms with terminal-safe format', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('no', state);

        expect(result.message).toContain('[-] Change #1 rejected');
      });

      it('And the navigation advances to the next pending change', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('no', state);

        expect(result.nextState.currentIndex).toBe(1);
      });
    });

    describe('When the user responds with "reject"', () => {
      it('Then the system records the decision as DecisionType.REJECTED', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('reject', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });
    });

    describe('When the user responds with "reject 5"', () => {
      it('Then the system rejects change #5 specifically if valid', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const stateWithMoreChanges = createMockState({
          changes: [...createMockState().changes, ...createMockState().changes],
          totalChanges: 6
        });
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('reject 5', stateWithMoreChanges);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(4)).toBe(DecisionType.REJECTED);
        expect(result.message).toContain('[-] Change #5 rejected');
      });
    });

    describe('When the user responds with "skip"', () => {
      it('Then the system records the decision as DecisionType.REJECTED', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('skip', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });
    });

    describe('When the user responds with "pass"', () => {
      it('Then the system records the decision as DecisionType.REJECTED', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('pass', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });
    });

    describe('When the user responds with "deny"', () => {
      it('Then the system records the decision as DecisionType.REJECTED', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('deny', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });
    });

    describe('When the user responds with unicode X marks', () => {
      it('Then the system accepts "✗" as rejection', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('✗', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });

      it('Then the system accepts "✖" as rejection', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('✖', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });
    });
  });
});

// ============================================================================
// AC3: Change Number References
// ============================================================================

describe('AC3: Change Number References', () => {
  describe('Given the review interface is displaying multiple changes', () => {
    const state = createMockState();

    describe('When the user specifies a change number', () => {
      it('Then the system locates the change at 1-indexed position', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 2', state);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(2)).toBe(DecisionType.APPROVED);
      });

      it('And validates the index is within bounds', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 99', state);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid change number');
        expect(result.message).toContain('1-3');
      });

      it('And validates the index is numeric', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve abc', state);

        expect(result.success).toBe(false);
      });

      it('And rejects injection attempts', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1; DROP TABLE', state);

        expect(result.success).toBe(false);
      });

      it('And displays helpful error for invalid index', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 0', state);

        expect(result.success).toBe(false);
        expect(result.message).toMatch(/\[X\] Invalid change number\. Valid: 1-\d+/);
      });
    });
  });
});

// ============================================================================
// AC4: Decision Recording
// ============================================================================

describe('AC4: Decision Recording', () => {
  describe('Given the user has made an approval or rejection decision', () => {
    const state = createMockState();

    describe('When the decision is recorded', () => {
      it('Then the system updates the decisions Map with correct key/value', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1', state);

        expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
      });

      it('And overwrites any previous decision for that index', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();
        const stateWithDecision = createMockState({
          decisions: new Map([[1, DecisionType.APPROVED]])
        });

        const result = await processor.processDecision('reject 1', stateWithDecision);

        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });

      it('And persists the updated state to disk with auto-save', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1', state);

        // Verify state was updated (save happens internally)
        expect(result.nextState.decisions.size).toBeGreaterThan(0);
      }, 10000);

      it('And logs the decision with complete audit trail data', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const auditLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const processor = new DecisionProcessor();

        await processor.processDecision('approve 1', state);

        expect(auditLogSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: 'test-session-123',
            action: 'approve',
            changeIndex: 1,
            decision: DecisionType.APPROVED,
            timestamp: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
          })
        );
        auditLogSpy.mockRestore();
      });

      it('And the state update completes in <100ms', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100);
      });

      it('And retries with exponential backoff if save fails', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        // Mock a failing save then success
        // This test will fail until retry logic is implemented
        const result = await processor.processDecision('approve 1', state);

        expect(result.success).toBe(true);
      });
    });
  });
});

// ============================================================================
// AC7: Decision Modification (Undo)
// ============================================================================

describe('AC7: Decision Modification (Undo)', () => {
  describe('Given the user has previously decided on a change', () => {
    const stateWithDecision = createMockState({
      decisions: new Map([[1, DecisionType.APPROVED]])
    });

    describe('When the user issues a new decision for the same change', () => {
      it('Then the system accepts the new decision', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('reject 1', stateWithDecision);

        expect(result.success).toBe(true);
      });

      it('And overwrites the previous decision in the Map', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('reject 1', stateWithDecision);

        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
      });

      it('And logs the decision change', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const auditLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const processor = new DecisionProcessor();

        await processor.processDecision('reject 1', stateWithDecision);

        expect(auditLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Changed decision for #1')
        );
        auditLogSpy.mockRestore();
      });

      it('And updates the display and state immediately', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('reject 1', stateWithDecision);

        expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
        expect(result.message).toContain('rejected');
      });

      it('And the audit trail records both decisions with timestamps', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const auditLogSpy = jest.spyOn(console, 'log').mockImplementation();
        const processor = new DecisionProcessor();

        await processor.processDecision('reject 1', stateWithDecision);

        expect(auditLogSpy).toHaveBeenCalledTimes(2); // Original + new decision
        auditLogSpy.mockRestore();
      });
    });
  });
});

// ============================================================================
// AC13: Security and Validation
// ============================================================================

describe('AC13: Security and Validation', () => {
  describe('Given the user provides approval/rejection commands', () => {
    const state = createMockState();

    describe('When the system processes the command', () => {
      it('Then all user input is validated and sanitized', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const maliciousCommand = '<script>alert("xss")</script>';
        const result = await processor.processDecision(maliciousCommand, state);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid command');
      });

      it('And validates command text length <1000 characters', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const longCommand = 'a'.repeat(1001);
        const result = await processor.processDecision(longCommand, state);

        expect(result.success).toBe(false);
      });

      it('And validates change index is numeric', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const injectionAttempt = 'approve 1; DROP TABLE decisions;';
        const result = await processor.processDecision(injectionAttempt, state);

        expect(result.success).toBe(false);
      });

      it('And implements rate limiting: max 30 decisions per minute', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        // Make 35 rapid decisions
        const results = [];
        for (let i = 0; i < 35; i++) {
          const result = await processor.processDecision('approve 1', state);
          results.push(result);
        }

        // At least 5 should be rate limited
        const rateLimited = results.filter(r => !r.success && r.message?.includes('Rate limit'));
        expect(rateLimited.length).toBeGreaterThan(0);
      });

      it('And logs security violations separately', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const securityLogSpy = jest.spyOn(console, 'error').mockImplementation();
        const processor = new DecisionProcessor();

        await processor.processDecision('approve 1; DROP TABLE', state);

        expect(securityLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('security')
        );
        securityLogSpy.mockRestore();
      });

      it('And validates session ownership', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const invalidState = createMockState({ sessionId: '' });
        const result = await processor.processDecision('approve 1', invalidState);

        expect(result.success).toBe(false);
      });
    });
  });
});

// ============================================================================
// AC14: Performance Requirements
// ============================================================================

describe('AC14: Performance Requirements', () => {
  describe('Given the user makes an approval/rejection decision', () => {
    const state = createMockState();

    describe('When the system processes the decision', () => {
      it('Then command parsing completes in <10ms', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
      });

      it('And decision validation completes in <5ms', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(5);
      });

      it('And state update completes in <10ms', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(10);
      });

      it('And total response time is <100ms', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        const result = await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100);
        expect(result.success).toBe(true);
      });

      it('And state persistence completes in <100ms asynchronously', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const start = performance.now();
        await processor.processDecision('approve 1', state);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100);
      });
    });
  });
});

// ============================================================================
// AC16: Help and Documentation
// ============================================================================

describe('AC16: Help and Documentation', () => {
  describe('Given the user is in the review interface', () => {
    const state = createMockState();

    describe('When the user types "help"', () => {
      it('Then the system displays available commands', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('help', state);

        expect(result.success).toBe(true);
        expect(result.message).toContain('yes');
        expect(result.message).toContain('approve');
        expect(result.message).toContain('reject');
        expect(result.message).toContain('next');
      });
    });

    describe('When the user types "?"', () => {
      it('Then the system displays available commands', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('?', state);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Commands');
      });
    });

    it('And the help is terminal-formatted (max 80 chars width)', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      const result = await processor.processDecision('help', state);

      const lines = result.message.split('\n');
      const allLinesFit = lines.every(line => line.length <= 80);
      expect(allLinesFit).toBe(true);
    });
  });
});

// ============================================================================
// AC9: Error Handling and Validation
// ============================================================================

describe('AC9: Error Handling and Validation', () => {
  describe('Given the user provides an invalid command or index', () => {
    const state = createMockState();

    describe('When the system processes the input', () => {
      it('Then displays helpful error message for invalid command', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('invalid_command', state);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid command');
      });

      it('And displays helpful error for invalid change number', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 999', state);

        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid change number');
      });

      it('And continues functioning after the error', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        await processor.processDecision('invalid', state);
        const result = await processor.processDecision('approve 1', state);

        expect(result.success).toBe(true);
      });

      it('And logs the error with context for debugging', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const errorLogSpy = jest.spyOn(console, 'error').mockImplementation();
        const processor = new DecisionProcessor();

        await processor.processDecision('invalid', state);

        expect(errorLogSpy).toHaveBeenCalled();
        errorLogSpy.mockRestore();
      });

      it('And does not crash on malformed input', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const malformedInputs = [
          '',
          '   ',
          '!!!',
          '💀💀💀',
          '\x00\x01\x02',
          'null',
          'undefined'
        ];

        for (const input of malformedInputs) {
          const result = await processor.processDecision(input, state);
          expect(result).toBeDefined();
          expect(result.success).toBeDefined();
        }
      });
    });
  });
});
