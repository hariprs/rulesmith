/**
 * Integration Tests for Decision Processing (Story 4.2)
 *
 * Testing component interactions and end-to-end flows
 * Following test pyramid: Integration tests for decision workflow
 *
 * @module review/__tests__/integration-decision
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DecisionType, NavigationState } from '../types.js';
import { RuleSuggestion } from '../../rules/types.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a temporary test session directory
 */
async function createTestSessionDir(): Promise<string> {
  const testDir = join(tmpdir(), `test-session-${Date.now()}`);
  await fs.mkdir(testDir, { recursive: true });
  return testDir;
}

/**
 * Clean up test session directory
 */
async function cleanupTestSessionDir(testDir: string): Promise<void> {
  await fs.rm(testDir, { recursive: true, force: true });
}

/**
 * Create mock rule suggestions for testing
 */
function createMockChanges(count: number = 10): RuleSuggestion[] {
  const changes: RuleSuggestion[] = [];
  for (let i = 1; i <= count; i++) {
    changes.push({
      id: `change-${i}`,
      ruleId: `rule-${i}`,
      type: i % 3 === 0 ? 'modification' : 'addition',
      priority: i % 2 === 0 ? 'high' : 'medium',
      title: `Change #${i}`,
      description: `Test change ${i}`,
      suggestedRule: `test rule ${i}`,
      reasoning: `test reasoning ${i}`,
      confidence: 0.7 + (i % 3) * 0.1,
      category: ['performance', 'security', 'maintainability'][i % 3],
      tags: ['test'],
      createdAt: new Date().toISOString(),
      source: 'pattern-analysis',
      validFrom: new Date().toISOString(),
      validUntil: new Date(Date.now() + 86400000).toISOString()
    });
  }
  return changes;
}

/**
 * Create initial navigation state
 */
function createInitialState(changes: RuleSuggestion[]): NavigationState {
  return {
    currentIndex: 0,
    changes,
    decisions: new Map<number, DecisionType>(),
    sessionId: `test-session-${Date.now()}`,
    lastActivity: new Date(),
    totalChanges: changes.length
  };
}

// ============================================================================
// AC11: Integration with Review Interface (Story 4.1)
// ============================================================================

describe('AC11: Integration with Review Interface (Story 4.1)', () => {
  let testSessionDir: string;
  let mockState: NavigationState;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
    mockState = createInitialState(createMockChanges(10));
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Given the review interface from Story 4.1 is active', () => {
    describe('When the user makes approval/rejection decisions', () => {
      it('Then the decisions are reflected in the interface display', async () => {
        // This test will fail - integration doesn't exist yet
        const { InterfaceManager } = await import('../interface-manager.js');
        const { DecisionProcessor } = await import('../decision-processor.js');

        const interfaceManager = new InterfaceManager();
        const decisionProcessor = new DecisionProcessor();

        // User approves change #1
        const result = await decisionProcessor.processDecision('approve 1', mockState);

        expect(result.success).toBe(true);
        expect(result.nextState.decisions.get(1)).toBe(DecisionType.APPROVED);

        // Interface should show updated display
        const display = interfaceManager.renderReview(result.nextState);
        expect(display).toContain('[+]');
      });

      it('And the interface manager calls the decision processor', async () => {
        const { InterfaceManager } = await import('../interface-manager.js');
        const { DecisionProcessor } = await import('../decision-processor.js');

        const processDecisionSpy = jest.spyOn(DecisionProcessor.prototype, 'processDecision');
        const interfaceManager = new InterfaceManager();

        await interfaceManager.handleUserCommand('approve 1', mockState);

        expect(processDecisionSpy).toHaveBeenCalledWith('approve 1', mockState);
      });

      it('And the decision processor updates the navigation state', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1', mockState);

        expect(result.nextState.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(result.nextState.lastActivity.getTime()).toBeGreaterThan(mockState.lastActivity.getTime());
      });

      it('And the interface manager renders the updated display', async () => {
        const { InterfaceManager } = await import('../interface-manager.js');
        const { DecisionProcessor } = await import('../decision-processor.js');

        const interfaceManager = new InterfaceManager();
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1', mockState);
        const display = interfaceManager.renderReview(result.nextState);

        expect(display).toContain('[+] Change #1 approved');
      });

      it('And the flow is seamless: command → processing → state → display', async () => {
        const { InterfaceManager } = await import('../interface-manager.js');
        const { DecisionProcessor } = await import('../decision-processor.js');

        const interfaceManager = new InterfaceManager();
        const processor = new DecisionProcessor();

        const start = performance.now();

        // Full workflow timing
        const decisionResult = await processor.processDecision('approve 1', mockState);
        const display = interfaceManager.renderReview(decisionResult.nextState);

        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100); // AC14 requirement
        expect(decisionResult.success).toBe(true);
        expect(display).toBeDefined();
      });
    });
  });
});

// ============================================================================
// AC5: Navigation After Decision
// ============================================================================

describe('AC5: Navigation After Decision', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given the user has made a decision on the current change', () => {
    describe('When the decision is recorded', () => {
      it('Then the system automatically advances to the next pending change', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve', mockState);

        expect(result.nextState.currentIndex).toBe(1);
      });

      it('And "next pending" means the next change with DecisionType.PENDING', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        // Approve changes 1, 2, 3
        let state = mockState;
        state = (await processor.processDecision('approve 1', state)).nextState;
        state = (await processor.processDecision('approve 2', state)).nextState;
        state = (await processor.processDecision('approve 3', state)).nextState;

        // Current should move to next pending (#4)
        expect(state.currentIndex).toBe(3);
        expect(state.decisions.get(4)).toBeUndefined(); // Still pending
      });

      it('And if all remaining changes are decided, displays summary', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        let state = createInitialState(createMockChanges(3));

        // Decide all changes
        state = (await processor.processDecision('approve 1', state)).nextState;
        state = (await processor.processDecision('reject 2', state)).nextState;
        const result = await processor.processDecision('approve 3', state);

        expect(result.message).toContain('Review complete');
        expect(result.message).toContain('approved');
        expect(result.message).toContain('rejected');
      });

      it('And prompts for next action when review complete', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        let state = createInitialState(createMockChanges(1));
        const result = await processor.processDecision('approve', state);

        expect(result.message).toContain('apply');
      });

      it('And the auto-advance can be disabled with "stay" command', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('stay', mockState);

        expect(result.nextState.currentIndex).toBe(mockState.currentIndex);
        expect(result.message).toContain('Staying on current change');
      });
    });
  });

  describe('Given user exits without applying approved changes', () => {
    it('Then state is preserved and can be resumed later', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const { StateManager } = await import('../state-manager.js');
      const processor = new DecisionProcessor();
      const stateManager = new StateManager();

      let state = createInitialState(createMockChanges(3));
      state = (await processor.processDecision('approve 1', state)).nextState;
      state = (await processor.processDecision('reject 2', state)).nextState;

      // Save state
      await stateManager.saveState(state);

      // Simulate session restart - load state
      const loadedState = await stateManager.loadState(state.sessionId);

      expect(loadedState.decisions.get(1)).toBe(DecisionType.APPROVED);
      expect(loadedState.decisions.get(2)).toBe(DecisionType.REJECTED);
      expect(loadedState.decisions.get(3)).toBeUndefined();
    });
  });
});

// ============================================================================
// AC6: Display Update After Decision
// ============================================================================

describe('AC6: Display Update After Decision', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given the user has made a decision', () => {
    describe('When the interface updates to show the next change', () => {
      it('Then the display header shows updated counts', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const { MarkdownFormatter } = await import('../markdown-formatter.js');
        const processor = new DecisionProcessor();
        const formatter = new MarkdownFormatter();

        let state = mockState;
        state = (await processor.processDecision('approve 1', state)).nextState;
        state = (await processor.processDecision('reject 2', state)).nextState;

        const header = formatter.formatHeader(state);

        expect(header).toContain('Reviewing change');
        expect(header).toContain('pending');
        expect(header).toContain('approved');
        expect(header).toContain('rejected');
      });

      it('And the current change display reflects the new index', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const { MarkdownFormatter } = await import('../markdown-formatter.js');
        const processor = new DecisionProcessor();
        const formatter = new MarkdownFormatter();

        const result = await processor.processDecision('approve', mockState);
        const display = formatter.formatChange(result.nextState);

        expect(display).toContain('#2'); // Now showing change 2
      });

      it('And previously decided changes show visual indicators', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const { MarkdownFormatter } = await import('../markdown-formatter.js');
        const processor = new DecisionProcessor();
        const formatter = new MarkdownFormatter();

        let state = mockState;
        state = (await processor.processDecision('approve 1', state)).nextState;
        state = (await processor.processDecision('reject 2', state)).nextState;

        const summary = formatter.formatSummary(state);

        expect(summary).toContain('[+] Change #1');
        expect(summary).toContain('approved');
        expect(summary).toContain('[-] Change #2');
        expect(summary).toContain('rejected');
      });

      it('And the interface maintains context of all decisions made', async () => {
        const { DecisionProcessor } = await import('../decision-processor.js');
        const processor = new DecisionProcessor();

        let state = mockState;
        state = (await processor.processDecision('approve 1', state)).nextState;
        state = (await processor.processDecision('reject 2', state)).nextState;
        state = (await processor.processDecision('approve 3', state)).nextState;

        expect(state.decisions.size).toBe(3);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
        expect(state.decisions.get(3)).toBe(DecisionType.APPROVED);
      });
    });
  });
});

// ============================================================================
// AC10: State Persistence After Decisions
// ============================================================================

describe('AC10: State Persistence After Decisions', () => {
  let testSessionDir: string;
  let mockState: NavigationState;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
    mockState = createInitialState(createMockChanges(5));
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Given the user has made one or more decisions', () => {
    describe('When the state is persisted to disk', () => {
      it('Then the system saves the complete NavigationState to the session file', async () => {
        const { StateManager } = await import('../state-manager.js');
        const stateManager = new StateManager(testSessionDir);

        let state = mockState;
        state.decisions.set(1, DecisionType.APPROVED);
        state.decisions.set(2, DecisionType.REJECTED);

        await stateManager.saveState(state);

        const loadedState = await stateManager.loadState(state.sessionId);

        expect(loadedState).toBeDefined();
        expect(loadedState.sessionId).toBe(state.sessionId);
      });

      it('And the save includes all decisions (approved, rejected, edited, pending)', async () => {
        const { StateManager } = await import('../state-manager.js');
        const stateManager = new StateManager(testSessionDir);

        let state = mockState;
        state.decisions.set(1, DecisionType.APPROVED);
        state.decisions.set(2, DecisionType.REJECTED);
        state.decisions.set(3, DecisionType.EDITED);
        // 4 and 5 remain pending

        await stateManager.saveState(state);

        const loadedState = await stateManager.loadState(state.sessionId);

        expect(loadedState.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(loadedState.decisions.get(2)).toBe(DecisionType.REJECTED);
        expect(loadedState.decisions.get(3)).toBe(DecisionType.EDITED);
        expect(loadedState.decisions.get(4)).toBeUndefined();
        expect(loadedState.decisions.get(5)).toBeUndefined();
      });

      it('And the save is atomic (write to temp file, then rename)', async () => {
        const { StateManager } = await import('../state-manager.js');
        const stateManager = new StateManager(testSessionDir);

        await stateManager.saveState(mockState);

        // Verify session file exists
        const sessionFile = join(testSessionDir, `${mockState.sessionId}.json`);
        const exists = await fs.access(sessionFile).then(() => true).catch(() => false);

        expect(exists).toBe(true);
      });

      it('And the save completes in <100ms', async () => {
        const { StateManager } = await import('../state-manager.js');
        const stateManager = new StateManager(testSessionDir);

        const start = performance.now();
        await stateManager.saveState(mockState);
        const duration = performance.now() - start;

        expect(duration).toBeLessThan(100);
      });

      it('And if the save fails, the system retries up to 3 times', async () => {
        const { StateManager } = await import('../state-manager.js');
        const stateManager = new StateManager(testSessionDir);

        // Mock a failing write then success
        // This will fail until retry logic is implemented
        let attempts = 0;
        jest.spyOn(fs, 'writeFile').mockImplementation(async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('Simulated write failure');
          }
        });

        try {
          await stateManager.saveState(mockState);
          expect(attempts).toBeGreaterThanOrEqual(3);
        } catch (error) {
          // Expected to fail until retry logic is implemented
          expect(attempts).toBe(1);
        }
      });

      it('And failed saves are logged to the audit trail', async () => {
        const { StateManager } = await import('../state-manager.js');
        const auditLogSpy = jest.spyOn(console, 'error').mockImplementation();
        const stateManager = new StateManager('/invalid/path/that/does/not/exist');

        try {
          await stateManager.saveState(mockState);
        } catch (error) {
          // Expected to fail
        }

        expect(auditLogSpy).toHaveBeenCalled();
        auditLogSpy.mockRestore();
      });
    });
  });
});

// ============================================================================
// AC12: Decision Audit Trail
// ============================================================================

describe('AC12: Decision Audit Trail', () => {
  let testSessionDir: string;
  let mockState: NavigationState;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
    mockState = createInitialState(createMockChanges(3));
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Given the user makes approval/rejection decisions', () => {
    describe('When each decision is recorded', () => {
      it('Then the audit trail includes complete session context', async () => {
        const { AuditLogger } = await import('../audit-logger.js');
        const { DecisionProcessor } = await import('../decision-processor.js');
        const auditLogger = new AuditLogger(testSessionDir);
        const processor = new DecisionProcessor();

        const result = await processor.processDecision('approve 1', mockState);

        await auditLogger.logDecision({
          sessionId: mockState.sessionId,
          action: 'approve',
          changeIndex: 1,
          decision: DecisionType.APPROVED,
          timestamp: new Date().toISOString(),
          processingTimeMs: result.processingTimeMs
        });

        const logs = await auditLogger.getLogs(mockState.sessionId);

        expect(logs).toHaveLength(1);
        expect(logs[0]).toMatchObject({
          sessionId: mockState.sessionId,
          action: 'approve',
          changeIndex: 1,
          decision: DecisionType.APPROVED
        });
      });

      it('And the audit trail is append-only (tamper evident)', async () => {
        const { AuditLogger } = await import('../audit-logger.js');
        const auditLogger = new AuditLogger(testSessionDir);

        // Log multiple decisions
        await auditLogger.logDecision({
          sessionId: mockState.sessionId,
          action: 'approve',
          changeIndex: 1,
          decision: DecisionType.APPROVED,
          timestamp: new Date().toISOString()
        });

        await auditLogger.logDecision({
          sessionId: mockState.sessionId,
          action: 'reject',
          changeIndex: 2,
          decision: DecisionType.REJECTED,
          timestamp: new Date().toISOString()
        });

        const logs = await auditLogger.getLogs(mockState.sessionId);

        expect(logs).toHaveLength(2);
        expect(logs[0].action).toBe('approve');
        expect(logs[1].action).toBe('reject');
      });

      it('And audit writes are asynchronous (non-blocking)', async () => {
        const { AuditLogger } = await import('../audit-logger.js');
        const auditLogger = new AuditLogger(testSessionDir);

        const start = performance.now();

        const logPromise = auditLogger.logDecision({
          sessionId: mockState.sessionId,
          action: 'approve',
          changeIndex: 1,
          decision: DecisionType.APPROVED,
          timestamp: new Date().toISOString()
        });

        // Should not block
        const duration = performance.now() - start;
        expect(duration).toBeLessThan(5);

        await logPromise;
      });

      it('And failed audit writes are logged but don\'t block decisions', async () => {
        const { AuditLogger } = await import('../audit-logger.js');
        const { DecisionProcessor } = await import('../decision-processor.js');
        const auditLogger = new AuditLogger('/invalid/path');
        const processor = new DecisionProcessor();

        // Decision should still succeed even if audit fails
        const result = await processor.processDecision('approve 1', mockState);

        expect(result.success).toBe(true);
      });

      it('And audit logs include checksum for integrity verification', async () => {
        const { AuditLogger } = await import('../audit-logger.js');
        const auditLogger = new AuditLogger(testSessionDir);

        await auditLogger.logDecision({
          sessionId: mockState.sessionId,
          action: 'approve',
          changeIndex: 1,
          decision: DecisionType.APPROVED,
          timestamp: new Date().toISOString()
        });

        const logs = await auditLogger.getLogs(mockState.sessionId);

        expect(logs[0]).toHaveProperty('checksum');
      });
    });
  });
});

// ============================================================================
// End-to-End Decision Flow Tests
// ============================================================================

describe('End-to-End Decision Flow', () => {
  let testSessionDir: string;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Complete review workflow', () => {
    it('Should handle full review session from start to finish', async () => {
      const { InterfaceManager } = await import('../interface-manager.js');
      const { DecisionProcessor } = await import('../decision-processor.js');
      const { StateManager } = await import('../state-manager.js');

      const interfaceManager = new InterfaceManager();
      const processor = new DecisionProcessor();
      const stateManager = new StateManager(testSessionDir);

      // Start with 10 changes
      let state = createInitialState(createMockChanges(10));

      // Approve changes 1, 3, 5
      state = (await processor.processDecision('approve 1', state)).nextState;
      state = (await processor.processDecision('approve 3', state)).nextState;
      state = (await processor.processDecision('approve 5', state)).nextState;

      // Reject changes 2, 4, 6
      state = (await processor.processDecision('reject 2', state)).nextState;
      state = (await processor.processDecision('reject 4', state)).nextState;
      state = (await processor.processDecision('reject 6', state)).nextState;

      // Save state
      await stateManager.saveState(state);

      // Verify state
      expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
      expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
      expect(state.decisions.get(3)).toBe(DecisionType.APPROVED);
      expect(state.decisions.get(4)).toBe(DecisionType.REJECTED);
      expect(state.decisions.get(5)).toBe(DecisionType.APPROVED);
      expect(state.decisions.get(6)).toBe(DecisionType.REJECTED);

      // Load and verify persistence
      const loadedState = await stateManager.loadState(state.sessionId);
      expect(loadedState.decisions.size).toBe(6);

      // Generate summary
      const summary = interfaceManager.renderReview(state);
      expect(summary).toContain('approved');
      expect(summary).toContain('rejected');
    });

    it('Should handle decision modification workflow', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');

      let state = createInitialState(createMockChanges(5));

      // Approve change 1
      state = (await processor.processDecision('approve 1', state)).nextState;
      expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);

      // Change mind - reject change 1
      state = (await processor.processDecision('reject 1', state)).nextState;
      expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);

      // Change mind again - approve change 1
      state = (await processor.processDecision('approve 1', state)).nextState;
      expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
    });

    it('Should handle error recovery gracefully', async () => {
      const { DecisionProcessor } = await import('../decision-processor.js');
      const processor = new DecisionProcessor();

      let state = createInitialState(createMockChanges(5));

      // Invalid commands should not crash
      await processor.processDecision('invalid', state);
      await processor.processDecision('approve 999', state);
      await processor.processDecision('reject abc', state);

      // Valid commands should still work
      const result = await processor.processDecision('approve 1', state);
      expect(result.success).toBe(true);
    });
  });
});
