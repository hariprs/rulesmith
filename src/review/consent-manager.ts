/**
 * Consent Manager (Story 4.5)
 *
 * Manages the final consent flow before file modifications
 * including counting approved changes, displaying prompts,
 * and executing atomic file modifications
 *
 * @module review/consent-manager
 */

import * as fs from 'fs/promises';
import { PlatformDetector } from '../platform-detector';
import { StateManager } from './state-manager';
import { AuditLogger } from './audit-logger';
import { FileWriter } from './file-writer';
import {
  NavigationState,
  ConsentState,
  ConsentResult,
  ConsentPrompt,
  FileModificationResult,
  DecisionType,
} from './types';

// ============================================================================
// CONSENT MANAGER
// ============================================================================

/**
 * Consent manager for file modification approval flow
 *
 * @class ConsentManager
 */
export class ConsentManager {
  constructor(
    private stateManager: StateManager,
    private auditLogger: AuditLogger,
    private fileWriter: FileWriter,
    private platformDetector: PlatformDetector
  ) {}

  /**
   * Step 1: Initiate consent flow (count approved, show prompt)
   *
   * @param state - Current navigation state
   * @returns Consent prompt to display
   */
  async initiateConsent(state: NavigationState): Promise<ConsentPrompt> {
    // Guard: Validate state parameter
    if (!state) {
      throw new Error('Navigation state cannot be null or undefined');
    }

    // Guard: Validate changes array exists and is not empty
    if (!state.changes || state.changes.length === 0) {
      return {
        type: 'error',
        message: '[!] No changes available to review',
      };
    }

    // Guard: Validate decisions map exists
    if (!state.decisions) {
      return {
        type: 'error',
        message: '[!] No decisions recorded',
      };
    }

    const approvedChanges = this.countApprovedChanges(state);

    if (approvedChanges === 0) {
      return {
        type: 'error',
        message: '[!] No approved changes to apply',
      };
    }

    // Guard: Validate approved count is positive
    if (approvedChanges < 0) {
      throw new Error(`Invalid approved count: ${approvedChanges}. Count cannot be negative.`);
    }

    const affectedFiles = this.getAffectedFiles(state, approvedChanges);

    const consentState: ConsentState = {
      approvedCount: approvedChanges,
      affectedFiles,
      promptedAt: new Date().toISOString(),
    };

    // Store consent state in NavigationState for response handling
    state.consent = consentState;

    const fileList = affectedFiles.join(', ');
    const promptMessage = `[+] ${approvedChanges} approved changes will be applied to: ${fileList}. Confirm:`;

    return {
      type: 'consent',
      message: promptMessage,
      count: approvedChanges,
      files: affectedFiles,
    };
  }

  /**
   * Step 2: Execute file modifications after consent
   *
   * @param state - Current navigation state
   * @param confirmed - Whether user confirmed the consent
   * @returns Consent operation result
   */
  async executeConsent(state: NavigationState, confirmed: boolean): Promise<ConsentResult> {
    // Guard: Validate state parameter
    if (!state) {
      throw new Error('Navigation state cannot be null or undefined');
    }

    // Guard: Validate consent state exists
    if (!state.consent) {
      throw new Error('No pending consent to confirm');
    }

    const { approvedCount, affectedFiles, promptedAt } = state.consent;

    // Guard: Validate consent state data integrity
    if (!affectedFiles || affectedFiles.length === 0) {
      throw new Error('Invalid consent state: no affected files recorded');
    }

    if (!promptedAt) {
      throw new Error('Invalid consent state: missing prompt timestamp');
    }

    if (!confirmed) {
      // Log cancellation
      const result: ConsentResult = {
        action: 'consent_denied',
        changeCount: approvedCount,
        affectedFiles,
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId,
        success: true, // Cancellation is successful completion
      };

      await this.auditLogger.logDecision(
        state.sessionId,
        -1, // -1 for bulk/consent operations
        'consent_denied',
        'User cancelled consent prompt'
      );

      return result;
    }

    // Execute file modifications atomically
    const modificationResults = await this.applyApprovedChanges(state);

    // Check if all modifications succeeded
    const allSucceeded = modificationResults.every((r) => r.success);

    if (!allSucceeded) {
      // Rollback any successful modifications
      await this.rollbackChanges(modificationResults);

      const failedFiles = modificationResults
        .filter((r) => !r.success)
        .map((r) => `${r.filePath}: ${r.error}`)
        .join(', ');

      const result: ConsentResult = {
        action: 'consent_given',
        changeCount: approvedCount,
        affectedFiles,
        timestamp: new Date().toISOString(),
        sessionId: state.sessionId,
        success: false,
        error: `File modification failed: ${failedFiles}`,
      };

      await this.auditLogger.logDecision(state.sessionId, -1, 'consent_given', `Failed: ${failedFiles}`);

      return result;
    }

    // Clear consent state
    state.consent = undefined;

    // Clear or archive state (all changes applied)
    await this.clearState(state);

    // Log successful operation
    const result: ConsentResult = {
      action: 'consent_given',
      changeCount: approvedCount,
      affectedFiles,
      timestamp: new Date().toISOString(),
      sessionId: state.sessionId,
      success: true,
    };

    await this.auditLogger.logDecision(
      state.sessionId,
      -1,
      'consent_given',
      `${approvedCount} changes applied successfully`
    );

    return result;
  }

  /**
   * Check if response is a confirmation
   *
   * @param input - User input string
   * @returns Whether input is a confirmation keyword
   */
  isConfirmationResponse(input: string): boolean {
    // Guard: Validate input parameter
    if (!input || typeof input !== 'string') {
      return false;
    }

    const confirmationKeywords = ['yes', 'confirm', 'apply', 'proceed'];
    return confirmationKeywords.includes(input.toLowerCase().trim());
  }

  /**
   * Helper: Count approved changes
   *
   * @private
   * @param state - Current navigation state
   * @returns Number of approved changes
   */
  private countApprovedChanges(state: NavigationState): number {
    // Guard: Validate state has changes and decisions
    if (!state.changes || !state.decisions) {
      return 0;
    }

    // Guard: Check for array/Map size mismatch (data integrity)
    if (state.changes.length !== state.decisions.size) {
      throw new Error(
        `Data integrity error: changes array length (${state.changes.length}) does not match decisions map size (${state.decisions.size})`
      );
    }

    let approvedCount = 0;

    for (let i = 0; i < state.changes.length; i++) {
      const decision = state.decisions.get(i);
      if (decision === DecisionType.APPROVED) {
        approvedCount++;
      }
    }

    return approvedCount;
  }

  /**
   * Helper: Get list of affected files
   *
   * @private
   * @param state - Current navigation state
   * @param approvedCount - Number of approved changes
   * @returns Array of affected file paths
   */
  private getAffectedFiles(state: NavigationState, approvedCount: number): string[] {
    // Guard: Validate approvedCount matches actual count
    if (approvedCount <= 0) {
      return [];
    }

    const files = new Set<string>();

    // CRITICAL: Determine target file from platform detection (Story 3.2)
    const platform = this.platformDetector.detectPlatform();

    // Guard: Validate platform detection result
    if (!platform || platform === 'unknown') {
      throw new Error('Unsupported platform for consent enforcement: unable to detect platform');
    }

    const targetFile =
      platform === 'cursor'
        ? '.cursorrules'
        : platform === 'copilot'
          ? '.github/copilot-instructions.md'
          : null;

    if (!targetFile) {
      throw new Error('Unsupported platform for consent enforcement');
    }

    for (let i = 0; i < state.changes.length; i++) {
      const decision = state.decisions.get(i);
      if (decision === DecisionType.APPROVED) {
        files.add(targetFile);
      }
    }

    const result = Array.from(files);

    // Guard: Validate result matches expected count
    if (result.length === 0 && approvedCount > 0) {
      throw new Error('Data integrity error: no affected files found despite approved changes');
    }

    return result;
  }

  /**
   * Helper: Apply approved changes to files
   *
   * @private
   * @param state - Current navigation state
   * @returns Array of file modification results
   */
  private async applyApprovedChanges(state: NavigationState): Promise<FileModificationResult[]> {
    const results: FileModificationResult[] = [];

    // Group changes by file
    const changesByFile = new Map<string, typeof state.changes>();

    for (let i = 0; i < state.changes.length; i++) {
      const decision = state.decisions.get(i);
      if (decision === DecisionType.APPROVED) {
        const change = state.changes[i];

        // Guard: Validate change object
        if (!change) {
          console.warn(`[WARNING] Skipping null/undefined change at index ${i}`);
          continue;
        }

        // Determine target file from platform detection
        const platform = this.platformDetector.detectPlatform();
        const targetFile =
          platform === 'cursor'
            ? '.cursorrules'
            : platform === 'copilot'
              ? '.github/copilot-instructions.md'
              : null;

        if (!targetFile) {
          console.warn(`[WARNING] Skipping change at index ${i}: unsupported platform`);
          continue;
        }

        if (!changesByFile.has(targetFile)) {
          changesByFile.set(targetFile, []);
        }

        changesByFile.get(targetFile)!.push(change);
      }
    }

    // Guard: Validate we have changes to apply
    if (changesByFile.size === 0) {
      throw new Error('No valid changes to apply after filtering');
    }

    // Apply changes to each file using FileWriter
    for (const [filePath, changes] of changesByFile.entries()) {
      // Guard: Validate changes array is not empty
      if (!changes || changes.length === 0) {
        console.warn(`[WARNING] Skipping file with no changes: ${filePath}`);
        continue;
      }

      const result = await this.fileWriter.writeChanges(filePath, changes);
      results.push(result);
    }

    // Guard: Validate we got results
    if (results.length === 0) {
      throw new Error('No file modifications were performed');
    }

    return results;
  }

  /**
   * Helper: Rollback changes on failure
   *
   * @private
   * @param results - Array of file modification results
   */
  private async rollbackChanges(results: FileModificationResult[]): Promise<void> {
    // Guard: Validate results parameter
    if (!results || results.length === 0) {
      console.warn('[WARNING] No results to rollback');
      return;
    }

    const rollbackErrors: Array<{ filePath: string; error: string }> = [];

    for (const result of results) {
      // Guard: Validate result object
      if (!result) {
        console.warn('[WARNING] Skipping null/undefined result during rollback');
        continue;
      }

      if (result.success && result.backupPath) {
        // Guard: Validate backup path exists before attempting rollback
        try {
          await fs.access(result.backupPath);
        } catch (error) {
          rollbackErrors.push({
            filePath: result.filePath,
            error: `Backup file not found: ${result.backupPath}`,
          });
          continue;
        }

        let success = false;
        let lastError: Error | undefined;

        // Retry rollback up to 3 times (Story 4.2 pattern)
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await fs.copyFile(result.backupPath, result.filePath);
            await fs.unlink(result.backupPath);
            success = true;
            break;
          } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            const backoffMs = Math.pow(2, attempt) * 100;
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }

        if (!success) {
          rollbackErrors.push({
            filePath: result.filePath,
            error: lastError?.message || 'Unknown rollback error',
          });
        }
      }
    }

    // CRITICAL: If any rollback fails, log critical error
    if (rollbackErrors.length > 0) {
      const errorDetails = rollbackErrors.map((e) => `${e.filePath}: ${e.error}`).join('; ');
      console.error(`[CRITICAL] Rollback incomplete: ${errorDetails}`);
      this.auditLogger.logError('consent_rollback_failed', 'partial_rollback', errorDetails);
    }
  }

  /**
   * Helper: Clear state after successful application
   *
   * @private
   * @param state - Current navigation state
   */
  private async clearState(state: NavigationState): Promise<void> {
    // Clear all decisions
    state.decisions.clear();
    // Clear consent state
    state.consent = undefined;
    // Persist cleared state
    await this.stateManager.saveState(state);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a consent manager instance
 *
 * @param stateManager - State manager instance
 * @param auditLogger - Audit logger instance
 * @param fileWriter - File writer instance
 * @param platformDetector - Platform detector instance
 * @returns ConsentManager instance
 */
export function createConsentManager(
  stateManager: StateManager,
  auditLogger: AuditLogger,
  fileWriter: FileWriter,
  platformDetector: PlatformDetector
): ConsentManager {
  return new ConsentManager(stateManager, auditLogger, fileWriter, platformDetector);
}
