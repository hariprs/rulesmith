/**
 * E2E Tests for Bulk Operations (Story 4.4)
 *
 * Testing end-to-end user workflows with full browser interaction
 * Following test pyramid: E2E tests only for UI-specific flows
 *
 * @module review/__tests__/bulk-e2e
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DecisionType, NavigationState } from '../../review/types';
import { RuleSuggestion, RuleProposalType } from '../../rules/types';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create mock rule suggestions for testing
 */
function createMockChanges(count: number = 10): RuleSuggestion[] {
  const changes: RuleSuggestion[] = [];
  for (let i = 1; i <= count; i++) {
    changes.push({
      id: `change-${i}`,
      ruleId: `rule-${i}`,
      type: (i % 3 === 0 ? 'modification' : 'addition') as RuleProposalType,
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
    sessionId: `test-e2e-session-${Date.now()}`,
    lastActivity: new Date(),
    totalChanges: changes.length
  };
}

// ============================================================================
// E2E Test 1: Bulk Approve Journey
// ============================================================================

describe('E2E Test 1: Bulk Approve Journey', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(7));
  });

  describe('Given user is in review interface with pending changes', () => {
    describe('When user enters "approve all" command', () => {
      it('Then system displays confirmation prompt', async () => {
        // This test will fail - full E2E flow doesn't exist yet
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        // Start review session
        await interfaceManager.startReview(mockState);

        // User enters "approve all"
        const response = await interfaceManager.handleInput('approve all');

        // Verify confirmation prompt is displayed
        expect(response.message).toContain('Approve all');
        expect(response.message).toContain('7');
        expect(response.message).toContain('Confirm');
      });
    });

    describe('When user confirms with "yes"', () => {
      it('Then all pending changes are approved', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        // Enter "approve all"
        await interfaceManager.handleInput('approve all');

        // Confirm with "yes"
        const response = await interfaceManager.handleInput('yes');

        // Verify all changes are approved
        expect(response.message).toContain('7 changes approved');

        // Verify state is updated
        for (let i = 0; i < 7; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }
      });
    });

    describe('When user confirms with "confirm"', () => {
      it('Then all pending changes are approved', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');
        const response = await interfaceManager.handleInput('confirm');

        expect(response.message).toContain('7 changes approved');
      });
    });

    describe('When user confirms with "apply"', () => {
      it('Then all pending changes are approved', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');
        const response = await interfaceManager.handleInput('apply');

        expect(response.message).toContain('7 changes approved');
      });
    });

    describe('When user confirms with "proceed"', () => {
      it('Then all pending changes are approved', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');
        const response = await interfaceManager.handleInput('proceed');

        expect(response.message).toContain('7 changes approved');
      });
    });
  });

  describe('Given user has completed bulk approve', () => {
    beforeEach(async () => {
      const { InterfaceManager } = await import('../interface-manager);
      const interfaceManager = new InterfaceManager();

      await interfaceManager.startReview(mockState);
      await interfaceManager.handleInput('approve all');
      await interfaceManager.handleInput('yes');
    });

    describe('When operation completes', () => {
      it('Then audit trail is complete', async () => {
        const { AuditLogger } = await import('../audit-logger);
        const auditLogger = new AuditLogger();

        // Verify audit log contains bulk approve entry
        const logs = await auditLogger.getLogs(mockState.sessionId);

        expect(logs).toBeDefined();
        expect(logs.length).toBeGreaterThan(0);

        const bulkLog = logs.find(log => log.action === 'approve_all');
        expect(bulkLog).toBeDefined();
        expect(bulkLog?.changeIndex).toBe(-1); // -1 indicates bulk operation
        expect(bulkLog?.decision).toBe(DecisionType.APPROVED);
      });

      it('Then state is persisted', async () => {
        const { StateManager } = await import('../state-manager);
        const stateManager = new StateManager();

        // Reload state from file
        const loadedState = await stateManager.loadState(mockState.sessionId);

        expect(loadedState).toBeDefined();
        expect(loadedState.decisions.size).toBe(7);

        // Verify all decisions persisted
        for (let i = 0; i < 7; i++) {
          expect(loadedState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }
      });
    });
  });
});

// ============================================================================
// E2E Test 2: Bulk Reject Journey
// ============================================================================

describe('E2E Test 2: Bulk Reject Journey', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(7));
  });

  describe('Given user is in review interface with pending changes', () => {
    describe('When user enters "reject all" command', () => {
      it('Then system displays confirmation prompt', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response = await interfaceManager.handleInput('reject all');

        expect(response.message).toContain('Reject all');
        expect(response.message).toContain('7');
        expect(response.message).toContain('Confirm');
      });
    });

    describe('When user confirms with "yes"', () => {
      it('Then all pending changes are rejected', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('reject all');
        const response = await interfaceManager.handleInput('yes');

        expect(response.message).toContain('7 changes rejected');

        // Verify state is updated
        for (let i = 0; i < 7; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.REJECTED);
        }
      });
    });
  });

  describe('Given user has completed bulk reject', () => {
    beforeEach(async () => {
      const { InterfaceManager } = await import('../interface-manager);
      const interfaceManager = new InterfaceManager();

      await interfaceManager.startReview(mockState);
      await interfaceManager.handleInput('reject all');
      await interfaceManager.handleInput('yes');
    });

    describe('When operation completes', () => {
      it('Then audit trail is complete', async () => {
        const { AuditLogger } = await import('../audit-logger);
        const auditLogger = new AuditLogger();

        const logs = await auditLogger.getLogs(mockState.sessionId);

        expect(logs).toBeDefined();
        expect(logs.length).toBeGreaterThan(0);

        const bulkLog = logs.find(log => log.action === 'reject_all');
        expect(bulkLog).toBeDefined();
        expect(bulkLog?.changeIndex).toBe(-1); // -1 indicates bulk operation
        expect(bulkLog?.decision).toBe(DecisionType.REJECTED);
      });

      it('Then state is persisted', async () => {
        const { StateManager } = await import('../state-manager);
        const stateManager = new StateManager();

        const loadedState = await stateManager.loadState(mockState.sessionId);

        expect(loadedState).toBeDefined();
        expect(loadedState.decisions.size).toBe(7);

        for (let i = 0; i < 7; i++) {
          expect(loadedState.decisions.get(i)).toBe(DecisionType.REJECTED);
        }
      });
    });
  });
});

// ============================================================================
// E2E Test 3: Bulk Operation Cancellation Flow
// ============================================================================

describe('E2E Test 3: Bulk Operation Cancellation Flow', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given user initiates bulk approve', () => {
    describe('When user cancels confirmation', () => {
      it('Then bulk operation is cancelled', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        // Initiate bulk approve
        await interfaceManager.handleInput('approve all');

        // Cancel with "no"
        const response = await interfaceManager.handleInput('no');

        expect(response.message).toContain('cancelled');
      });

      it('Then no changes are made', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');
        await interfaceManager.handleInput('cancel');

        // All decisions should still be undefined
        for (let i = 0; i < 5; i++) {
          expect(mockState.decisions.get(i)).toBeUndefined();
        }
      });
    });

    describe('When user cancels and then initiates new bulk operation', () => {
      it('Then second bulk operation works correctly', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        // First bulk approve - cancel
        await interfaceManager.handleInput('approve all');
        await interfaceManager.handleInput('no');

        // Second bulk reject - confirm
        const response1 = await interfaceManager.handleInput('reject all');
        expect(response1.message).toContain('Reject all');

        const response2 = await interfaceManager.handleInput('yes');
        expect(response2.message).toContain('5 changes rejected');

        // Verify all changes are rejected
        for (let i = 0; i < 5; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.REJECTED);
        }
      });
    });
  });
});

// ============================================================================
// E2E Test 4: Bulk Operation with Pre-Decided Changes
// ============================================================================

describe('E2E Test 4: Bulk Operation with Pre-Decided Changes', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(10));

    // Pre-decide some changes
    mockState.decisions.set(0, DecisionType.APPROVED);
    mockState.decisions.set(1, DecisionType.APPROVED);
    mockState.decisions.set(2, DecisionType.REJECTED);
    mockState.decisions.set(3, DecisionType.EDITED);

    // Add edited_rule to change 3
    (mockState.changes[3] as any).edited_rule = 'edited rule content';
    (mockState.changes[3] as any).original_rule = 'original rule content';
  });

  describe('Given user has mix of decided and pending changes', () => {
    describe('When user bulk approves', () => {
      it('Then only pending changes are affected', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response1 = await interfaceManager.handleInput('approve all');

        // Confirmation should show only pending count (6 changes: 4-9)
        expect(response1.message).toContain('6');

        const response2 = await interfaceManager.handleInput('yes');

        expect(response2.message).toContain('6 changes approved');

        // Verify pre-decided changes are unchanged
        expect(mockState.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(1)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(2)).toBe(DecisionType.REJECTED);
        expect(mockState.decisions.get(3)).toBe(DecisionType.EDITED);

        // Verify pending changes are now approved
        for (let i = 4; i < 10; i++) {
          expect(mockState.decisions.get(i)).toBe(DecisionType.APPROVED);
        }
      });

      it('Then edited changes are preserved', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');
        await interfaceManager.handleInput('yes');

        // Verify edited_rule is preserved
        expect((mockState.changes[3] as any).edited_rule).toBe('edited rule content');
        expect((mockState.changes[3] as any).original_rule).toBe('original rule content');
      });
    });
  });
});

// ============================================================================
// E2E Test 5: Bulk Operation Variations
// ============================================================================

describe('E2E Test 5: Bulk Operation Variations', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(5));
  });

  describe('Given user is in review interface', () => {
    describe('When user enters "yes all" (alternative command)', () => {
      it('Then system recognizes and processes bulk approve', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response1 = await interfaceManager.handleInput('yes all');
        expect(response1.message).toContain('Approve all');

        const response2 = await interfaceManager.handleInput('confirm');
        expect(response2.message).toContain('5 changes approved');
      });
    });

    describe('When user enters "accept all" (alternative command)', () => {
      it('Then system recognizes and processes bulk approve', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response1 = await interfaceManager.handleInput('accept all');
        expect(response1.message).toContain('Approve all');

        const response2 = await interfaceManager.handleInput('yes');
        expect(response2.message).toContain('5 changes approved');
      });
    });

    describe('When user enters "no all" (alternative command)', () => {
      it('Then system recognizes and processes bulk reject', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response1 = await interfaceManager.handleInput('no all');
        expect(response1.message).toContain('Reject all');

        const response2 = await interfaceManager.handleInput('confirm');
        expect(response2.message).toContain('5 changes rejected');
      });
    });

    describe('When user enters "deny all" (alternative command)', () => {
      it('Then system recognizes and processes bulk reject', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response1 = await interfaceManager.handleInput('deny all');
        expect(response1.message).toContain('Reject all');

        const response2 = await interfaceManager.handleInput('yes');
        expect(response2.message).toContain('5 changes rejected');
      });
    });
  });
});

// ============================================================================
// E2E Test 6: Empty Pending State
// ============================================================================

describe('E2E Test 6: Empty Pending State', () => {
  let mockState: NavigationState;

  beforeEach(() => {
    mockState = createInitialState(createMockChanges(3));

    // Decide all changes
    mockState.decisions.set(0, DecisionType.APPROVED);
    mockState.decisions.set(1, DecisionType.REJECTED);
    mockState.decisions.set(2, DecisionType.EDITED);
  });

  describe('Given user has no pending changes', () => {
    describe('When user enters "approve all"', () => {
      it('Then system displays error message', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response = await interfaceManager.handleInput('approve all');

        expect(response.message).toContain('No pending changes');
      });

      it('Then no bulk operation is executed', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        await interfaceManager.handleInput('approve all');

        // All decisions should remain unchanged
        expect(mockState.decisions.get(0)).toBe(DecisionType.APPROVED);
        expect(mockState.decisions.get(1)).toBe(DecisionType.REJECTED);
        expect(mockState.decisions.get(2)).toBe(DecisionType.EDITED);
      });
    });

    describe('When user enters "reject all"', () => {
      it('Then system displays error message', async () => {
        const { InterfaceManager } = await import('../interface-manager);
        const interfaceManager = new InterfaceManager();

        await interfaceManager.startReview(mockState);

        const response = await interfaceManager.handleInput('reject all');

        expect(response.message).toContain('No pending changes');
      });
    });
  });
});
