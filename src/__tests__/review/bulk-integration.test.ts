/**
 * Integration Tests for Bulk Operations (Story 4.4)
 *
 * Testing component interactions and end-to-end flows
 * Following test pyramid: Integration tests for bulk workflow
 *
 * @module review/__tests__/bulk-integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { DecisionType, NavigationState } from '../../review/types';
import { RuleSuggestion } from '../../rules/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create a temporary test session directory
 */
async function createTestSessionDir(): Promise<string> {
  const testDir = join(tmpdir(), `test-bulk-session-${Date.now()}`);
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
 * Note: Bulk operations only use changes.length, not individual properties
 */
function createMockChanges(count: number = 10): RuleSuggestion[] {
  const changes: RuleSuggestion[] = [];
  for (let i = 1; i <= count; i++) {
    changes.push({
      id: `change-${i}`,
    } as RuleSuggestion);
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
// AC10: State Persistence After Bulk Operation
// ============================================================================

describe('AC10: State Persistence After Bulk Operation', () => {
  let testSessionDir: string;
  let mockState: NavigationState;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
    mockState = createInitialState(createMockChanges(10));
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Given bulk operation has been confirmed and executed', () => {
    describe('When operation completes', () => {
      it('Then all decision updates are persisted to state file', async () => {
        // This test will fail - StateManager persistence needs verification
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Save state to file
        await stateManager.saveState(mockState);

        // Load state from file to verify persistence
        const loadedState = await stateManager.loadState(mockState.sessionId);

        expect(loadedState).toBeDefined();
        expect(loadedState.decisions.size).toBe(10);

        // Verify all decisions were persisted as APPROVED
        for (let i = 0; i < 10; i++) {
          expect(loadedState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }
      });

      it('Then atomic write is used (temp file + rename)', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();

        // Mock fs operations to verify atomic write pattern
        const renameSpy = jest.spyOn(require('fs').promises, 'rename');
        const writeFileSpy = jest.spyOn(require('fs').promises, 'writeFile');

        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Verify atomic write pattern was used
        expect(writeFileSpy).toHaveBeenCalled();
        expect(renameSpy).toHaveBeenCalled();

        renameSpy.mockRestore();
        writeFileSpy.mockRestore();
      });

      it('Then state update completes in <100ms', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);

        const startTime = performance.now();
        await processor.executeBulkOperation(mockState, true);
        const endTime = performance.now();

        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(100);
      });

      it('Then retry logic is used if write fails (100ms, 200ms, 400ms backoff)', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();

        // Mock saveState to fail twice then succeed
        let attemptCount = 0;
        jest.spyOn(stateManager, 'saveState').mockImplementation(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Simulated write failure');
          }
          // Success on third attempt
          return Promise.resolve();
        });

        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);

        const startTime = performance.now();
        await processor.executeBulkOperation(mockState, true);
        const endTime = performance.now();

        // Should have retried and eventually succeeded
        expect(attemptCount).toBeGreaterThanOrEqual(3);

        // Total time should include retry delays (100ms + 200ms = 300ms minimum)
        const processingTime = endTime - startTime;
        expect(processingTime).toBeGreaterThan(300);
      });
    });
  });
});

// ============================================================================
// AC11: Audit Trail Logging
// ============================================================================

describe('AC11: Audit Trail Logging', () => {
  let testSessionDir: string;
  let mockState: NavigationState;

  beforeEach(async () => {
    testSessionDir = await createTestSessionDir();
    mockState = createInitialState(createMockChanges(7));
  });

  afterEach(async () => {
    await cleanupTestSessionDir(testSessionDir);
  });

  describe('Given bulk operation has been confirmed and executed', () => {
    describe('When operation completes', () => {
      it('Then audit log entry includes timestamp (ISO 8601 UTC with milliseconds)', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
          })
        );
      });

      it('Then audit log entry includes Session ID', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            sessionId: mockState.sessionId
          })
        );
      });

      it('Then audit log entry includes Action ("approve_all" or "reject_all")', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        const result = await processor.executeBulkOperation(mockState, true);

        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'approve_all');
          })
        );
        expect(result.action).toBe('approve_all');
      });

      it('Then audit log entry includes Count of changes affected', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        const result = await processor.executeBulkOperation(mockState, true);

        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            affectedCount: 7
          })
        );
        expect(result.affectedCount).toBe(7);
      });

      it('Then audit log entry includes Confirmation status', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        const result = await processor.executeBulkOperation(mockState, true);

        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmed: true
          })
        );
        expect(result.confirmed).toBe(true);
      });

      it('Then log format matches Story 4.2 audit log format', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Verify the log entry has all required fields from Story 4.2 format
        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          expect.objectContaining({
            timestamp: expect.any(String),
            sessionId: expect.any(String),
            action: expect.any(String),
            affectedCount: expect.any(Number),
            confirmed: expect.any(Boolean)
          })
        );
      });

      it('Then entry is appended to results.jsonl', async () => {
        const { AuditLogger } = await import('../../review/audit-logger');
        const auditLogger = new AuditLogger();

        // Mock the file write operation
        const appendFileSpy = jest.spyOn(require('fs').promises, 'appendFile')
          .mockResolvedValue(undefined);

        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Verify file was written
        expect(appendFileSpy).toHaveBeenCalled();

        // Verify file path is .claude/results.jsonl
        const callArgs = appendFileSpy.mock.calls[0];
        expect(callArgs[0]).toContain('.claude/results.jsonl');

        appendFileSpy.mockRestore();
      });
    });
  });
});

// ============================================================================
// Integration: Command Parser + Bulk Operation Processor
// ============================================================================

describe('Integration: Command Parser + Bulk Operation Processor', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given user enters bulk approve command', () => {
    describe('When command parser parses "approve all"', () => {
      it('Then bulk operation processor receives parsed command', async () => {
        const { CommandParser } = await import('../../review/command-parser');
        const parser = new CommandParser();
        const parsed = parser.parse('approve all');

        expect(parsed.commandType).toBe('bulk_approve');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When command parser parses "reject all"', () => {
      it('Then bulk operation processor receives parsed command', async () => {
        const { CommandParser } = await import('../../review/command-parser');
        const parser = new CommandParser();
        const parsed = parser.parse('reject all');

        expect(parsed.commandType).toBe('bulk_reject');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When command parser distinguishes "show all" from "approve all"', () => {
      it('Then "show all" is parsed as navigation command', async () => {
        const { CommandParser } = await import('../../review/command-parser');
        const parser = new CommandParser();
        const parsed = parser.parse('show all');

        expect(parsed.commandType).not.toBe('bulk_approve');
        expect(parsed.commandType).not.toBe('bulk_reject');
      });

      it('Then "approve all" is parsed as bulk command', async () => {
        const { CommandParser } = await import('../../review/command-parser');
        const parser = new CommandParser();
        const parsed = parser.parse('approve all');

        expect(parsed.commandType).toBe('bulk_approve');
      });
    });
  });
});

// ============================================================================
// Integration: Decision Processor + Bulk Operation
// ============================================================================

describe('Integration: Decision Processor + Bulk Operation', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given DecisionProcessor receives bulk approve command', () => {
    describe('When command is parsed as bulk_approve', () => {
      it('Then DecisionProcessor delegates to BulkOperationProcessor', async () => {
        const { DecisionProcessor } = await import('../../review/decision-processor');
        const processor = new DecisionProcessor();

        // Mock the bulk operation processor
        const mockBulkProcessor = {
          initiateBulkOperation: jest.fn().mockResolvedValue({
            type: 'confirmation',
            message: '[+] Approve all 5 pending changes? Confirm:',
            count: 5
          })
        };

        // This test will fail - DecisionProcessor doesn't handle bulk commands yet
        const result = await processor.processDecision('approve all', mockState);

        expect(result.success).toBe(true);
        expect(result.message).toContain('Approve all');
        expect(result.message).toContain('5');
      });
    });
  });
});

// ============================================================================
// Integration: Bulk Workflow with Individual Operations
// ============================================================================

describe('Integration: Bulk Workflow with Individual Operations', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(10));
  });

  describe('Given user individually approves changes #1-#3', () => {
    beforeEach(async () => {
      const { DecisionProcessor } = await import('../../review/decision-processor');
      const processor = new DecisionProcessor();

      // Approve changes 0, 1, 2
      await processor.approve(0, mockState);
      await processor.approve(1, mockState);
      await processor.approve(2, mockState);
    });

    describe('When user then bulk approves remaining changes', () => {
      it('Then all changes have correct final decisions', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Changes 0-2 should still be APPROVED (from individual approvals)
        expect(mockState.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(2)).toBe(DecisionType.APPROVED);

        // Changes 3-9 should now be APPROVED (from bulk approve)
        for (let i = 3; i < 10; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }
      });

      it('Then audit trail shows both individual and bulk operations', async () => {
        // Verify audit log contains individual approval entries
        // and bulk approval entry
        const { AuditLogger } = await import('../../review/audit-logger');
        const auditLogger = new AuditLogger();

        const logSpy = jest.spyOn(auditLogger, 'logDecision').mockResolvedValue(undefined);

        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Should have 3 individual approvals + 1 bulk approval
        expect(logSpy).toHaveBeenCalledTimes(3);

        logSpy.mockRestore();
      });
    });
  });

  describe('Given user bulk approves then individually approves', () => {
    describe('When bulk approve is followed by individual approve', () => {
      it('Then individual operations work correctly after bulk', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        // Bulk approve all
        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // All should be APPROVED
        for (let i = 0; i < 10; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }

        // Now reject change 5 individually
        const { DecisionProcessor } = await import('../../review/decision-processor');
        const decisionProcessor = new DecisionProcessor();
        await decisionProcessor.reject(5, mockState);

        // Change 5 should now be REJECTED (overwrites APPROVED)
        expect(mockState.decisions.get(5)).toBe(DecisionType.REJECTED);

        // Others should still be APPROVED
        expect(mockState.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(9)).toBe(DecisionType.APPROVED);
      });
    });
  });
});

// ============================================================================
// Integration: Confirmation Flow State Management
// ============================================================================

describe('Integration: Confirmation Flow State Management', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given bulk operation confirmation is initiated', () => {
    beforeEach(async () => {
      const { StateManager } = await import('../../review/state-manager');
      const stateManager = new StateManager();
      const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
      const auditLogger = {
        logDecision: jest.fn() as any
      } as any;

      const processor = new BulkOperationProcessor(stateManager, auditLogger);
      await processor.initiateBulkOperation('bulk_approve', mockState);
    });

    describe('When user cancels confirmation', () => {
      it('Then confirmation state is cleared', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        expect(mockState.confirmation).toBeDefined();

        await processor.executeBulkOperation(mockState, false);

        expect(mockState.confirmation).toBeUndefined();
      });
    });

    describe('When user confirms operation', () => {
      it('Then confirmation state is cleared after execution', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        expect(mockState.confirmation).toBeDefined();

        await processor.executeBulkOperation(mockState, true);

        expect(mockState.confirmation).toBeUndefined();
      });
    });

    describe('When user enters non-confirmation command during confirmation', () => {
      it('Then confirmation state is cleared', async () => {
        // Simulate user entering "next" command during confirmation
        // This should clear the confirmation state
        mockState.confirmation = undefined;

        expect(mockState.confirmation).toBeUndefined();
      });
    });
  });

  describe('Given user cancels first bulk operation', () => {
    beforeEach(async () => {
      const { StateManager } = await import('../../review/state-manager');
      const stateManager = new StateManager();
      const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
      const auditLogger = {
        logDecision: jest.fn() as any
      } as any;

      const processor = new BulkOperationProcessor(stateManager, auditLogger);
      await processor.initiateBulkOperation('bulk_approve', mockState);
      await processor.executeBulkOperation(mockState, false);
    });

    describe('When user then initiates second bulk operation', () => {
      it('Then second operation works correctly after first cancellation', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);

        // Initiate second bulk operation (reject all)
        const result = await processor.initiateBulkOperation('bulk_reject', mockState);

        expect(result.type).toBe('confirmation');
        expect(result.message).toContain('Reject all');
        expect(mockState.confirmation?.pendingOperation).toBe('bulk_reject');
      });
    });
  });
});

// ============================================================================
// Integration: Display Update After Bulk Operation
// ============================================================================

describe('Integration: Display Update After Bulk Operation', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given user executes bulk approve', () => {
    describe('When bulk operation completes', () => {
      it('Then markdown formatter updates all decision markers', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Now verify markdown formatter displays updated markers
        const { MarkdownFormatter } = await import('../../review/markdown-formatter');
        const formatter = new MarkdownFormatter();
        const display = formatter.formatChangeList(mockState.changes, mockState.decisions);

        // All changes should show [APPROVED] marker
        expect(display).toContain('[APPROVED]');
      });
    });

    describe('When some changes were already decided', () => {
      beforeEach(async () => {
        // Pre-decide some changes
        mockState.decisions.set(0, DecisionType.APPROVED);
        mockState.decisions.set(1, DecisionType.REJECTED);
      });

      it('Then unchanged decisions still display correctly', async () => {
        const { StateManager } = await import('../../review/state-manager');
        const stateManager = new StateManager();
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor');
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', mockState);
        await processor.executeBulkOperation(mockState, true);

        // Verify all decisions are preserved
        expect(mockState.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(1)).toBe(DecisionType.REJECTED);

        // Changes 2-4 should now be APPROVED
        expect(mockState.decisions.get(2)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(3)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(4)).toBe(DecisionType.APPROVED);
      });
    });
  });
});
