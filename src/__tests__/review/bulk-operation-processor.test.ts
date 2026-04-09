/**
 * Bulk Operation Processor Unit Tests (Story 4.4)
 *
 * Testing business logic for bulk approval/rejection operations
 * Following test pyramid: Unit tests for core bulk processing logic
 *
 * @module review/__tests__/bulk-operation-processor
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DecisionType, NavigationState } from '../../review/types';
import { RuleSuggestion, RuleProposalType } from '../../rules/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create mock navigation state for testing
 * Note: Bulk operations only use changes.length, not individual properties
 */
function createMockState(overrides?: Partial<NavigationState>): NavigationState {
  // Minimal mocks - bulk processor only cares about array length
  const mockChanges: RuleSuggestion[] = [
    { id: 'change-1' } as RuleSuggestion,
    { id: 'change-2' } as RuleSuggestion,
    { id: 'change-3' } as RuleSuggestion,
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
// AC1: Approve All Command Recognition
// ============================================================================

describe('AC1: Approve All Command Recognition', () => {
  describe('Given a user is in the review interface with pending changes', () => {
    const state = createMockState();

    describe('When user enters "approve all"', () => {
      it('Then system recognizes the bulk approve command', async () => {
        // This test will fail - CommandParser doesn't support bulk commands yet
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('approve all');

        expect(parsed.commandType).toBe('bulk_approve');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "yes all"', () => {
      it('Then system recognizes the bulk approve command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('yes all');

        expect(parsed.commandType).toBe('bulk_approve');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "accept all"', () => {
      it('Then system recognizes the bulk approve command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('accept all');

        expect(parsed.commandType).toBe('bulk_approve');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "APPROVE ALL" (case insensitive)', () => {
      it('Then system recognizes the bulk approve command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('APPROVE ALL');

        expect(parsed.commandType).toBe('bulk_approve');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "approve all" command', () => {
      it('Then system displays confirmation prompt with count', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.type).toBe('confirmation');
        expect(result.message).toContain('Approve all');
        expect(result.message).toContain('3');
        expect(result.count).toBe(3);
      });
    });
  });
});

// ============================================================================
// AC2: Reject All Command Recognition
// ============================================================================

describe('AC2: Reject All Command Recognition', () => {
  describe('Given a user is in the review interface with pending changes', () => {
    const state = createMockState();

    describe('When user enters "reject all"', () => {
      it('Then system recognizes the bulk reject command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('reject all');

        expect(parsed.commandType).toBe('bulk_reject');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "no all"', () => {
      it('Then system recognizes the bulk reject command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('no all');

        expect(parsed.commandType).toBe('bulk_reject');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "deny all"', () => {
      it('Then system recognizes the bulk reject command', async () => {
        const { CommandParser } = await import('../../review/command-parser')
        const parser = new CommandParser();
        const parsed = parser.parse('deny all');

        expect(parsed.commandType).toBe('bulk_reject');
        expect(parsed.isValid).toBe(true);
      });
    });

    describe('When user enters "reject all" command', () => {
      it('Then system displays confirmation prompt with count', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_reject', state);

        expect(result.type).toBe('confirmation');
        expect(result.message).toContain('Reject all');
        expect(result.message).toContain('3');
        expect(result.count).toBe(3);
      });
    });
  });
});

// ============================================================================
// AC3 & AC4: Confirmation Before Bulk Operation
// ============================================================================

describe('AC3: Confirmation Before Bulk Approve', () => {
  describe('Given user has issued "approve all" command', () => {
    const state = createMockState();

    describe('When system displays confirmation prompt', () => {
      it('Then prompt shows: "[+] Approve all X pending changes? Confirm:"', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.message).toMatch(/^\[\+\] Approve all \d+ pending changes\? Confirm:$/);
      });

      it('Then system waits for explicit confirmation', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);

        // Verify confirmation state is stored
        expect(state.confirmation).toBeDefined();
        expect(state.confirmation?.pendingOperation).toBe('bulk_approve');
        expect(state.confirmation?.pendingCount).toBe(3);
      });

      it('Then no changes are approved until user confirms', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);

        // All decisions should still be undefined/pending
        expect(state.decisions.get(0)).toBeUndefined();
        expect(state.decisions.get(1)).toBeUndefined();
        expect(state.decisions.get(2)).toBeUndefined();
      });
    });
  });
});

describe('AC4: Confirmation Before Bulk Reject', () => {
  describe('Given user has issued "reject all" command', () => {
    const state = createMockState();

    describe('When system displays confirmation prompt', () => {
      it('Then prompt shows: "[-] Reject all X pending changes? Confirm:"', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_reject', state);

        expect(result.message).toMatch(/^\[-\] Reject all \d+ pending changes\? Confirm:$/);
      });

      it('Then system waits for explicit confirmation', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);

        // Verify confirmation state is stored
        expect(state.confirmation).toBeDefined();
        expect(state.confirmation?.pendingOperation).toBe('bulk_reject');
        expect(state.confirmation?.pendingCount).toBe(3);
      });
    });
  });
});

// ============================================================================
// AC5: Confirmation Accepted - Approve All
// ============================================================================

describe('AC5: Confirmation Accepted - Approve All', () => {
  describe('Given confirmation prompt is displayed for "approve all"', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState();
    });

    describe('When user responds with "yes"', () => {
      it('Then all PENDING changes are marked as APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });

      it('Then operation is logged to audit trail with timestamp and count', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        const result = await processor.executeBulkOperation(state, true);

        // logDecision is called with individual parameters
        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          'test-session-123',
          expect.stringContaining('approve_all'),
          -1, // -1 indicates bulk operation
          DecisionType.APPROVED,
          expect.any(Number)
        );
        expect(result.action).toBe('approve_all');
        expect(result.affectedCount).toBe(3);
        expect(result.confirmed).toBe(true);
      });
    });

    describe('When user responds with "confirm"', () => {
      it('Then all PENDING changes are marked as APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });

    describe('When user responds with "apply"', () => {
      it('Then all PENDING changes are marked as APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });

    describe('When user responds with "proceed"', () => {
      it('Then all PENDING changes are marked as APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });

    describe('When some changes are already decided', () => {
      it('Then already decided changes are not modified', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        // Pre-decide change 0 as APPROVED, change 1 as REJECTED
        state.decisions.set(0, DecisionType.APPROVED);
        state.decisions.set(1, DecisionType.REJECTED);

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be APPROVED (not modified)
        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        // Change 1 should still be REJECTED (not modified to APPROVED)
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        // Change 2 should now be APPROVED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });
  });
});

// ============================================================================
// AC6: Confirmation Accepted - Reject All
// ============================================================================

describe('AC6: Confirmation Accepted - Reject All', () => {
  describe('Given confirmation prompt is displayed for "reject all"', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState();
    });

    describe('When user responds with confirmation keyword', () => {
      it('Then all PENDING changes are marked as REJECTED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.REJECTED);
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
      });

      it('Then already decided changes are not modified', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        // Pre-decide change 0 as APPROVED, change 1 as REJECTED
        state.decisions.set(0, DecisionType.APPROVED);
        state.decisions.set(1, DecisionType.REJECTED);

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be APPROVED (not modified to REJECTED)
        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        // Change 1 should still be REJECTED (not modified)
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        // Change 2 should now be REJECTED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
      });

      it('Then operation is logged to audit trail with timestamp and count', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);
        const result = await processor.executeBulkOperation(state, true);

        // logDecision is called with individual parameters
        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          'test-session-123',
          expect.stringContaining('reject_all'),
          -1, // -1 indicates bulk operation
          DecisionType.REJECTED,
          expect.any(Number)
        );
        expect(result.action).toBe('reject_all');
        expect(result.affectedCount).toBe(3);
        expect(result.confirmed).toBe(true);
      });
    });
  });
});

// ============================================================================
// AC7: Confirmation Rejected
// ============================================================================

describe('AC7: Confirmation Rejected', () => {
  describe('Given confirmation prompt is displayed for bulk operation', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState();
    });

    describe('When user responds with anything other than confirmation keywords', () => {
      it('Then bulk operation is cancelled', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        const result = await processor.executeBulkOperation(state, false);

        expect(result.confirmed).toBe(false);
        expect(result.affectedCount).toBe(0);
      });

      it('Then no changes are made to any decisions', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, false);

        // All decisions should still be undefined/pending
        expect(state.decisions.get(0)).toBeUndefined();
        expect(state.decisions.get(1)).toBeUndefined();
        expect(state.decisions.get(2)).toBeUndefined();
      });

      it('Then cancellation is logged to audit trail', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, false);

        // Cancellation is logged with action string
        expect(auditLogger.logDecision).toHaveBeenCalledWith(
          'test-session-123',
          expect.stringContaining('bulk_operation_cancelled_bulk_approve'),
          -1, // -1 indicates bulk operation
          undefined,
          expect.any(Number)
        );
      });
    });
  });
});

// ============================================================================
// AC8: Pending Changes Filter
// ============================================================================

describe('AC8: Pending Changes Filter', () => {
  describe('Given user has a mix of decided and pending changes', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        decisions: new Map([
          [0, DecisionType.APPROVED],
          [1, DecisionType.REJECTED],
          // Index 2 is pending (undefined)
        ])
      });
    });

    describe('When bulk approve operation is executed', () => {
      it('Then only PENDING changes are affected', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be APPROVED (not modified)
        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        // Change 1 should still be REJECTED (not modified)
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        // Change 2 should now be APPROVED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });

      it('Then count in confirmation reflects only pending changes', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.count).toBe(1); // Only change 2 is pending
        expect(result.message).toContain('1');
      });
    });

    describe('When bulk reject operation is executed', () => {
      it('Then only PENDING changes are affected', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be APPROVED (not modified to REJECTED)
        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        // Change 1 should still be REJECTED (not modified)
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        // Change 2 should now be REJECTED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
      });
    });
  });
});

// ============================================================================
// AC9: Empty Pending State Handling
// ============================================================================

describe('AC9: Empty Pending State Handling', () => {
  describe('Given user has no pending changes (all decided)', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        decisions: new Map([
          [0, DecisionType.APPROVED],
          [1, DecisionType.REJECTED],
          [2, DecisionType.APPROVED]
        ])
      });
    });

    describe('When user issues "approve all" command', () => {
      it('Then system displays: "[!] No pending changes to approve/reject"', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.type).toBe('error');
        expect(result.message).toContain('No pending changes');
      });

      it('Then no bulk operation is executed', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);

        // Confirmation state should not be set
        expect(state.confirmation).toBeUndefined();

        // No state manager save should have been called
        expect(stateManager.saveState).not.toHaveBeenCalled();
      });
    });

    describe('When user issues "reject all" command', () => {
      it('Then system displays: "[!] No pending changes to approve/reject"', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_reject', state);

        expect(result.type).toBe('error');
        expect(result.message).toContain('No pending changes');
      });
    });
  });
});

// ============================================================================
// AC12: Integration with Edited Changes
// ============================================================================

describe('AC12: Integration with Edited Changes', () => {
  describe('Given user has edited changes (DecisionType.EDITED) in the review set', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        decisions: new Map([
          [0, DecisionType.EDITED],
          [1, DecisionType.PENDING],
          [2, DecisionType.PENDING]
        ])
      });

      // Add edited_rule to change 0
      (state.changes[0] as any).edited_rule = 'edited rule content';
      (state.changes[0] as any).original_rule = 'original rule content';
    });

    describe('When "approve all" is executed', () => {
      it('Then EDITED changes are NOT affected by bulk operation', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be EDITED (not changed to APPROVED)
        expect(state.decisions.get(0)).toBe(DecisionType.EDITED);
        // Change 1 should now be APPROVED (was pending)
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        // Change 2 should now be APPROVED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });

      it('Then only PENDING changes are processed', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        // Count should exclude EDITED changes
        expect(result.count).toBe(2); // Only changes 1 and 2 are pending
      });

      it('Then edited_rule field is preserved for EDITED changes', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        // edited_rule should still be present
        expect((state.changes[0] as any).edited_rule).toBe('edited rule content');
        expect((state.changes[0] as any).original_rule).toBe('original rule content');
      });

      it('Then confirmation count excludes EDITED changes', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.count).toBe(2); // Only pending changes, not EDITED
        expect(result.message).not.toContain('3');
      });
    });

    describe('When "reject all" is executed', () => {
      it('Then EDITED changes are NOT affected by bulk operation', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_reject', state);
        await processor.executeBulkOperation(state, true);

        // Change 0 should still be EDITED (not changed to REJECTED)
        expect(state.decisions.get(0)).toBe(DecisionType.EDITED);
        // Change 1 should now be REJECTED (was pending)
        expect(state.decisions.get(1)).toBe(DecisionType.REJECTED);
        // Change 2 should now be REJECTED (was pending)
        expect(state.decisions.get(2)).toBe(DecisionType.REJECTED);
      });
    });
  });
});

// ============================================================================
// Business Logic Tests: Undefined vs PENDING Decisions
// ============================================================================

describe('Business Logic: Undefined vs PENDING Decisions', () => {
  describe('Given changes with undefined decisions (no decision yet)', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        // All decisions are undefined (no entries in Map)
        decisions: new Map<number, DecisionType>()
      });
    });

    describe('When bulk approve is executed', () => {
      it('Then undefined decisions are treated as pending', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.count).toBe(3); // All 3 changes are pending
      });

      it('Then undefined decisions are updated to APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });
  });

  describe('Given changes with explicit PENDING decisions', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        decisions: new Map([
          [0, DecisionType.PENDING],
          [1, DecisionType.PENDING],
          [2, DecisionType.PENDING]
        ])
      });
    });

    describe('When bulk approve is executed', () => {
      it('Then PENDING decisions are treated as pending', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.count).toBe(3); // All 3 changes are pending
      });

      it('Then PENDING decisions are updated to APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });
  });

  describe('Given changes with mixed undefined and PENDING decisions', () => {
    let state: NavigationState;

    beforeEach(() => {
      state = createMockState({
        decisions: new Map([
          [0, DecisionType.PENDING],
          // Index 1 is undefined (no entry)
          [2, DecisionType.PENDING]
        ])
      });
    });

    describe('When bulk approve is executed', () => {
      it('Then both undefined and PENDING are treated as pending', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        const result = await processor.initiateBulkOperation('bulk_approve', state);

        expect(result.count).toBe(3); // All 3 changes (undefined + PENDING)
      });

      it('Then both undefined and PENDING decisions are updated to APPROVED', async () => {
        const { BulkOperationProcessor } = await import('../../review/bulk-operation-processor')
        const stateManager = {
          saveState: jest.fn().mockReturnValue(true) as any
        } as any;
        const auditLogger = {
          logDecision: jest.fn() as any
        } as any;

        const processor = new BulkOperationProcessor(stateManager, auditLogger);
        await processor.initiateBulkOperation('bulk_approve', state);
        await processor.executeBulkOperation(state, true);

        expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);
      });
    });
  });
});
