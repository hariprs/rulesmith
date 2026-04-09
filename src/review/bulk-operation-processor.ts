/**
 * Bulk Operation Processor (Story 4.4)
 *
 * Handles bulk approve/reject operations with confirmation flow
 *
 * @module review/bulk-operation-processor
 */

import * as fs from 'fs';
import * as path from 'path';
import { DecisionType, NavigationState, ConfirmationState, BulkOperationResult, BulkOperationPrompt } from './types';
import { StateManager } from './state-manager';
import { AuditLogger } from './audit-logger';

// ============================================================================
// BULK OPERATION PROCESSOR
// ============================================================================

/**
 * Bulk operation processor for approving/rejecting all pending changes
 *
 * @class BulkOperationProcessor
 */
export class BulkOperationProcessor {
  // Confirmation keywords
  private readonly CONFIRMATION_KEYWORDS = new Set([
    'yes', 'confirm', 'apply', 'proceed'
  ]);

  // Performance targets
  private readonly OPERATION_TARGET_MS = 200; // Total operation target
  private readonly STATE_UPDATE_TARGET_MS = 50; // State update target

  constructor(
    // NOTE: Using StateManager concrete class (DecisionStateManager interface doesn't exist yet)
    // TODO: Extract DecisionStateManager interface in Story 4.2 refactoring
    private stateManager: StateManager,
    private auditLogger: AuditLogger
  ) {}

  /**
   * Initiate bulk operation (count pending, show confirmation)
   *
   * @param operation - Bulk operation type
   * @param state - Current navigation state
   * @returns Bulk operation prompt
   */
  async initiateBulkOperation(
    operation: 'bulk_approve' | 'bulk_reject',
    state: NavigationState
  ): Promise<BulkOperationPrompt> {
    const startTime = performance.now();

    try {
      // Guard: Validate state parameter
      if (!state || typeof state !== 'object') {
        return {
          type: 'error',
          message: '[!] Invalid state provided',
        };
      }

      // Guard: Validate state.changes
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          type: 'error',
          message: '[!] Invalid state: changes array is missing',
        };
      }

      // Guard: Validate state.decisions
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          type: 'error',
          message: '[!] Invalid state: decisions map is missing',
        };
      }

      const pendingChanges = this.countPendingChanges(state);

      // AC9: Empty pending state handling
      if (pendingChanges === 0) {
        return {
          type: 'error',
          message: '[!] No pending changes to approve/reject',
        };
      }

      // Create confirmation state
      const confirmationState: ConfirmationState = {
        pendingOperation: operation,
        pendingCount: pendingChanges,
        promptedAt: new Date().toISOString(),
      };

      // Store confirmation state in NavigationState for response handling
      // NOTE: This is a shallow update - we're modifying the passed state object
      // The caller should create a copy if needed
      state.confirmation = confirmationState;

      const promptMessage = operation === 'bulk_approve'
        ? `[+] Approve all ${pendingChanges} pending changes? Confirm:`
        : `[-] Reject all ${pendingChanges} pending changes? Confirm:`;

      return {
        type: 'confirmation',
        message: promptMessage,
        count: pendingChanges,
      };
    } catch (error) {
      return {
        type: 'error',
        message: `[!] Error initiating bulk operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Execute bulk operation after confirmation
   *
   * @param state - Navigation state
   * @param confirmed - Whether user confirmed the operation
   * @returns Bulk operation result
   */
  async executeBulkOperation(
    state: NavigationState,
    confirmed: boolean
  ): Promise<BulkOperationResult> {
    const startTime = performance.now();

    // Guard: Validate state has confirmation
    if (!state.confirmation) {
      throw new Error('No pending bulk operation to confirm');
    }

    const { pendingOperation, pendingCount, promptedAt } = state.confirmation;

    // AC7: Confirmation Rejected
    if (!confirmed) {
      // Log cancellation
      this.auditLogger.logDecision(
        state.sessionId,
        `bulk_operation_cancelled_${pendingOperation}`,
        -1, // Use -1 for bulk operations (no specific index)
        undefined,
        performance.now() - startTime
      );

      // Clear confirmation state
      state.confirmation = undefined;

      return {
        action: pendingOperation === 'bulk_approve' ? 'approve_all' : 'reject_all',
        affectedCount: 0,
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId,
        confirmed: false,
        skippedChanges: state.changes.length,
      };
    }

    // Execute bulk operation
    const affectedCount = await this.applyBulkDecision(state, pendingOperation);

    // Clear confirmation state after execution
    state.confirmation = undefined;

    // Log successful operation
    const result: BulkOperationResult = {
      action: pendingOperation === 'bulk_approve' ? 'approve_all' : 'reject_all',
      affectedCount,
      timestamp: new Date().toISOString(),
      sessionId: state.sessionId,
      confirmed: true,
      skippedChanges: state.changes.length - affectedCount,
    };

    // Log to audit trail using logDecision with action string
    this.auditLogger.logDecision(
      state.sessionId,
      `${result.action} (${affectedCount} changes)`,
      -1, // Use -1 for bulk operations
      pendingOperation === 'bulk_approve' ? DecisionType.APPROVED : DecisionType.REJECTED,
      performance.now() - startTime
    );

    return result;
  }

  /**
   * Check if state has pending bulk operation confirmation
   *
   * @param state - Navigation state
   * @returns Whether confirmation is pending
   */
  hasPendingConfirmation(state: NavigationState): boolean {
    return !!state.confirmation;
  }

  /**
   * Get pending confirmation state
   *
   * @param state - Navigation state
   * @returns Confirmation state or undefined
   */
  getPendingConfirmation(state: NavigationState): ConfirmationState | undefined {
    return state.confirmation;
  }

  /**
   * Clear pending confirmation state
   *
   * @param state - Navigation state
   */
  clearConfirmation(state: NavigationState): void {
    state.confirmation = undefined;
  }

  /**
   * Check if response is a confirmation keyword
   *
   * @param response - User response
   * @returns Whether response confirms the operation
   */
  isConfirmationResponse(response: string): boolean {
    if (!response || typeof response !== 'string') {
      return false;
    }

    const trimmed = response.trim().toLowerCase();
    return this.CONFIRMATION_KEYWORDS.has(trimmed);
  }

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Count pending changes (CRITICAL: Handles undefined decisions correctly)
   *
   * Story 4.4 CRITICAL FIX: New changes don't exist in decisions map (returns undefined)
   * We must check for BOTH undefined AND DecisionType.PENDING to count all pending changes
   *
   * @private
   * @param state - Navigation state
   * @returns Number of pending changes
   */
  private countPendingChanges(state: NavigationState): number {
    let pendingCount = 0;

    // CRITICAL: Iterate through all changes, not just decisions map entries
    // This ensures we count new changes (undefined in map) correctly
    for (let i = 0; i < state.changes.length; i++) {
      const decision = state.decisions.get(i);

      // CRITICAL: undefined (no decision) OR PENDING both count as pending
      // This is the KEY FIX from adversarial review
      if (decision === undefined || decision === DecisionType.PENDING) {
        // AC8: Only PENDING changes affected (not APPROVED, REJECTED, EDITED)
        // undefined = new change (no decision yet) = pending
        // DecisionType.PENDING = explicitly pending = also counts
        pendingCount++;
      }
    }

    return pendingCount;
  }

  /**
   * Apply bulk decision to all pending changes
   *
   * CRITICAL FIX: Handle undefined decisions correctly
   * AC8: Only affect PENDING changes, preserve APPROVED/REJECTED/EDITED
   *
   * @private
   * @param state - Navigation state
   * @param operation - Bulk operation type
   * @returns Number of affected changes
   */
  private async applyBulkDecision(
    state: NavigationState,
    operation: 'bulk_approve' | 'bulk_reject'
  ): Promise<number> {
    const targetDecision = operation === 'bulk_approve'
      ? DecisionType.APPROVED
      : DecisionType.REJECTED;

    let affectedCount = 0;

    // CRITICAL: Update all decisions (including undefined ones)
    // Iterate through all changes, not just decisions map entries
    for (let i = 0; i < state.changes.length; i++) {
      const decision = state.decisions.get(i);

      // CRITICAL: undefined (no decision) OR PENDING can both be bulk updated
      // APPROVED, REJECTED, EDITED are preserved
      if (decision === undefined || decision === DecisionType.PENDING) {
        state.decisions.set(i, targetDecision);
        affectedCount++;
      }
      // AC8/AC12: EDITED changes are NOT affected (decision === DecisionType.EDITED continues loop)
    }

    // Persist updated state
    // CRITICAL: Reuses Story 4.2's atomic write logic (temp file + rename + retry)
    // DO NOT reimplement atomic writes - use existing stateManager.saveState()
    const saveSuccess = this.stateManager.saveState(state);

    if (!saveSuccess) {
      throw new Error('Failed to persist bulk operation state');
    }

    return affectedCount;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new bulk operation processor
 *
 * @param stateManager - State manager instance
 * @param auditLogger - Audit logger instance
 * @returns Bulk operation processor instance
 */
export function createBulkOperationProcessor(
  stateManager: StateManager,
  auditLogger: AuditLogger
): BulkOperationProcessor {
  return new BulkOperationProcessor(stateManager, auditLogger);
}
