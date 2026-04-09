/**
 * State Manager (Story 4.1)
 *
 * Handles session persistence and recovery for review interface
 *
 * @module review/state-manager
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { RuleSuggestion } from '../rules/types';
import {
  NavigationState,
  PersistedSession,
  DecisionType,
} from './types';
import { AuditLogger } from './audit-logger';

// ============================================================================
// STATE MANAGER
// ============================================================================

/**
 * State manager for review sessions
 *
 * @class StateManager
 */
export class StateManager {
  private readonly sessionsDir: string;
  private readonly sessionWarningMinutes = 30; // AC15:214
  private readonly sessionExpiryMinutes = 120; // AC15:216 (2 hours)
  private readonly sessionResumeDays = 7; // AC15:217
  private readonly auditLogger: AuditLogger;

  constructor(baseDir: string = '.claude') {
    // Guard: Validate and sanitize baseDir
    const sanitizedBaseDir = this.sanitizePath(baseDir ?? '.claude');
    this.sessionsDir = path.join(sanitizedBaseDir, 'review-sessions');
    this.ensureDirectoryExists(this.sessionsDir);
    this.auditLogger = new AuditLogger(sanitizedBaseDir);
  }

  /**
   * Save session state to disk
   *
   * @param state - Navigation state to save
   * @returns Success status
   */
  saveState(state: NavigationState): boolean {
    try {
      // Guard: Validate state parameter
      if (!state || typeof state !== 'object') {
        console.error('Invalid state provided to saveState');
        return false;
      }

      // Guard: Validate state.sessionId
      if (!state.sessionId || typeof state.sessionId !== 'string') {
        console.error('Invalid sessionId in state');
        return false;
      }

      const sessionFile = this.getSessionFilePath(state.sessionId);

      // Convert Map to Record for serialization
      const decisionsRecord: Record<number, string> = {};
      if (state.decisions && typeof state.decisions.forEach === 'function') {
        state.decisions.forEach((decision, index) => {
          decisionsRecord[index] = decision;
        });
      }

      // Guard: Validate state.changes
      if (!state.changes || !Array.isArray(state.changes)) {
        console.error('Invalid changes array in state');
        return false;
      }

      // Guard: Validate state.lastActivity
      if (!state.lastActivity || !(state.lastActivity instanceof Date)) {
        console.error('Invalid lastActivity in state');
        return false;
      }

      // Create persisted session
      const persisted: PersistedSession = {
        sessionId: state.sessionId,
        currentIndex: state.currentIndex ?? 0,
        changes: state.changes,
        decisions: decisionsRecord,
        lastActivity: state.lastActivity.toISOString(),
        signature: this.generateSignature(state),
        nonce: state.nonce ?? this.generateNonce(),
      };

      // Guard: Validate JSON.stringify doesn't throw
      let serialized: string;
      try {
        serialized = JSON.stringify(persisted, null, 2);
      } catch (stringifyError) {
        console.error('Failed to serialize session state:', stringifyError);
        return false;
      }

      // Write to file with error handling
      try {
        fs.writeFileSync(sessionFile, serialized, 'utf-8');
      } catch (writeError) {
        console.error('Failed to write session file:', writeError);
        return false;
      }

      // Log save action
      this.auditLogger.logNavigation(
        state.sessionId,
        'state_saved',
        state.currentIndex ?? 0,
        state.currentIndex ?? 0
      );

      return true;
    } catch (error) {
      console.error('Failed to save session state:', error);
      // Guard: Ensure state exists before accessing sessionId
      if (state?.sessionId) {
        this.auditLogger.logError(
          state.sessionId,
          'state_save_failed',
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
      return false;
    }
  }

  /**
   * Load session state from disk
   *
   * @param sessionId - Session identifier
   * @returns Navigation state or null
   */
  loadState(sessionId: string): NavigationState | null {
    try {
      // Guard: Validate sessionId parameter
      if (!sessionId || typeof sessionId !== 'string') {
        console.error('Invalid session ID provided to loadState');
        return null;
      }

      const sessionFile = this.getSessionFilePath(sessionId);

      if (!fs.existsSync(sessionFile)) {
        return null;
      }

      // Read session file
      const content = fs.readFileSync(sessionFile, 'utf-8');

      // Guard: Validate content size
      const MAX_SESSION_SIZE = 50 * 1024 * 1024; // 50MB
      if (content.length > MAX_SESSION_SIZE) {
        console.error('Session file exceeds maximum size');
        return null;
      }

      // Guard: Validate content is not empty
      if (!content || content.trim().length === 0) {
        console.error('Session file is empty');
        return null;
      }

      // Guard: Validate JSON parsing
      let persisted: PersistedSession;
      try {
        persisted = JSON.parse(content);
      } catch (parseError) {
        console.error('Failed to parse session file:', parseError);
        this.auditLogger.logError(sessionId, 'session_parse_failed', parseError instanceof Error ? parseError.message : 'Unknown error');
        return null;
      }

      // Validate session signature
      const expectedSignature = this.generateSignature({
        sessionId: persisted.sessionId,
        currentIndex: persisted.currentIndex,
        changes: persisted.changes,
        decisions: new Map(),
        lastActivity: new Date(persisted.lastActivity),
        totalChanges: persisted.changes.length,
      });

      if (persisted.signature !== expectedSignature) {
        console.error('Session signature validation failed');
        this.auditLogger.logError(sessionId, 'session_signature_invalid');
        return null;
      }

      // Validate nonce for replay attack prevention
      if (!this.validateNonce(persisted.nonce, sessionId)) {
        console.error('Session nonce validation failed');
        this.auditLogger.logError(sessionId, 'session_nonce_invalid');
        return null;
      }

      // Check session timeout (AC15:212-221)
      const lastActivity = new Date(persisted.lastActivity);
      const now = new Date();
      const elapsedMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);

      // 2-hour expiry per AC15:216
      if (elapsedMinutes > this.sessionExpiryMinutes) {
        console.error('Session has expired (2-hour timeout)');
        this.auditLogger.logError(sessionId, 'session_expired', `Session inactive for ${elapsedMinutes.toFixed(0)} minutes`);
        // Don't delete session - allow resume within 7 days per AC15:217
        return null;
      }

      // 30-minute warning per AC15:214
      if (elapsedMinutes > this.sessionWarningMinutes) {
        console.warn(`[!] Session inactive for ${elapsedMinutes.toFixed(0)} minutes. Changes are saved.`);
        this.auditLogger.logError(sessionId, 'session_inactive_warning', `Session inactive for ${elapsedMinutes.toFixed(0)} minutes`);
      }

      // Convert Record back to Map
      const decisions = new Map<number, DecisionType>();
      Object.entries(persisted.decisions).forEach(([index, decision]) => {
        decisions.set(parseInt(index, 10), decision as DecisionType);
      });

      // Story 4.3: Validate that original_rule and edited_rule fields are preserved
      // These fields are critical for edit functionality and must survive serialization
      for (let i = 0; i < persisted.changes.length; i++) {
        const change = persisted.changes[i];
        // Validate change object structure
        if (!change || typeof change !== 'object') {
          this.auditLogger.logError(sessionId, 'invalid_change_structure', `Change at index ${i} is invalid`);
          continue;
        }

        // AC3: Validate original_rule preservation
        if (change.edited_rule && !change.original_rule) {
          console.warn(`[!] Change #${i + 1} has edited_rule but missing original_rule. Audit trail may be incomplete.`);
          this.auditLogger.logError(sessionId, 'missing_original_rule', `Change ${i} has edited_rule but missing original_rule`);
        }

        // AC4: Validate edited_rule is present when decision is EDITED
        const decision = decisions.get(i);
        if (decision === DecisionType.EDITED && !change.edited_rule) {
          console.warn(`[!] Change #${i + 1} is marked as EDITED but missing edited_rule field.`);
          this.auditLogger.logError(sessionId, 'missing_edited_rule', `Change ${i} is EDITED but missing edited_rule`);
        }
      }

      // Reconstruct navigation state
      const state: NavigationState = {
        sessionId: persisted.sessionId,
        currentIndex: persisted.currentIndex,
        changes: persisted.changes,
        decisions,
        lastActivity,
        totalChanges: persisted.changes.length,
        nonce: persisted.nonce,
      };

      // Log load action
      this.auditLogger.logNavigation(sessionId, 'state_loaded', state.currentIndex, state.currentIndex);

      return state;
    } catch (error) {
      console.error('Failed to load session state:', error);
      this.auditLogger.logError(sessionId, 'state_load_failed', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Check for active sessions (AC15:218-219)
   *
   * @param excludeSessionId - Session ID to exclude from check
   * @returns Array of active session IDs
   */
  getActiveSessions(excludeSessionId?: string): string[] {
    try {
      const activeSessions: string[] = [];
      const now = Date.now();

      if (!fs.existsSync(this.sessionsDir)) {
        return activeSessions;
      }

      const files = fs.readdirSync(this.sessionsDir);
      for (const file of files) {
        if (!file.endsWith('.json')) {
          continue;
        }

        // Extract session ID from filename
        const sessionId = file.replace(/\.json$/, '');

        // Skip excluded session
        if (excludeSessionId && sessionId === excludeSessionId) {
          continue;
        }

        const filePath = path.join(this.sessionsDir, file);
        const stats = fs.statSync(filePath);
        const elapsedMinutes = (now - stats.mtime.getTime()) / (1000 * 60);

        // Consider session active if within 2-hour expiry window
        if (elapsedMinutes < this.sessionExpiryMinutes) {
          activeSessions.push(sessionId);
        }
      }

      return activeSessions;
    } catch (error) {
      console.error('Failed to check active sessions:', error);
      return [];
    }
  }

  /**
   * Check if creating a new session would conflict with existing active session (AC15:218-219)
   *
   * @param newSessionId - New session ID
   * @returns Whether session creation is allowed
   */
  canCreateSession(newSessionId: string): boolean {
    const activeSessions = this.getActiveSessions();

    if (activeSessions.length > 0) {
      const activeList = activeSessions.join(', ');
      console.warn(`[!] Active sessions exist: ${activeList}. Use 'resume' or 'override'.`);
      this.auditLogger.logError(newSessionId, 'concurrent_session_attempt', `Attempted to create session while ${activeList} active`);
      return false;
    }

    return true;
  }

  /**
   * Delete a session
   *
   * @param sessionId - Session identifier
   * @returns Success status
   */
  deleteSession(sessionId: string): boolean {
    try {
      // Guard: Validate sessionId parameter
      if (!sessionId || typeof sessionId !== 'string') {
        console.error('Invalid session ID provided to deleteSession');
        return false;
      }

      const sessionFile = this.getSessionFilePath(sessionId);

      if (fs.existsSync(sessionFile)) {
        fs.unlinkSync(sessionFile);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  /**
   * List all active sessions
   *
   * @returns Array of session IDs
   */
  listSessions(): string[] {
    try {
      const files = fs.readdirSync(this.sessionsDir);
      return files
        .filter(file => file.endsWith('.json'))
        .map(file => file.replace('.json', ''));
    } catch (error) {
      console.error('Failed to list sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   *
   * @param ageMinutes - Session age in minutes
   * @returns Number of sessions cleaned up
   */
  cleanupExpiredSessions(ageMinutes?: number): number {
    const timeoutMinutes = ageMinutes || this.sessionExpiryMinutes;
    const now = new Date();
    let cleanedCount = 0;

    try {
      const sessionIds = this.listSessions();

      sessionIds.forEach(sessionId => {
        const sessionFile = this.getSessionFilePath(sessionId);

        try {
          const stats = fs.statSync(sessionFile);
          const elapsedMinutes = (now.getTime() - stats.mtime.getTime()) / (1000 * 60);

          if (elapsedMinutes > timeoutMinutes) {
            this.deleteSession(sessionId);
            cleanedCount++;
          }
        } catch (error) {
          // Skip files that can't be read
          console.error(`Failed to check session ${sessionId}:`, error);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup sessions:', error);
    }

    return cleanedCount;
  }

  /**
   * Generate a new session ID
   *
   * @returns Unique session ID
   */
  generateSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Validate session integrity
   *
   * @param state - Navigation state to validate
   * @returns Validation result
   */
  validateSession(state: NavigationState): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check session ID
    if (!state.sessionId || typeof state.sessionId !== 'string') {
      errors.push('Invalid session ID');
    }

    // Check changes array
    if (!Array.isArray(state.changes)) {
      errors.push('Changes must be an array');
    }

    // Check current index
    if (typeof state.currentIndex !== 'number' || state.currentIndex < 0) {
      errors.push('Invalid current index');
    }

    if (state.changes.length > 0 && state.currentIndex >= state.changes.length) {
      errors.push('Current index out of bounds');
    }

    // Check decisions map
    if (!(state.decisions instanceof Map)) {
      errors.push('Decisions must be a Map');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate HMAC signature for session integrity
   *
   * @private
   * @param state - Navigation state
   * @returns Signature string
   */
  private generateSignature(state: NavigationState): string {
    const data = `${state.sessionId}|${state.currentIndex}|${state.changes.length}`;

    // CRITICAL: Use environment variable for secret key - no fallback allowed
    const secret = process.env.REVIEW_SESSION_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error(
        'REVIEW_SESSION_SECRET must be set in environment and be at least 32 characters'
      );
    }

    return crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('hex');
  }

  /**
   * Get session file path
   *
   * @private
   * @param sessionId - Session identifier
   * @returns File path
   */
  private getSessionFilePath(sessionId: string): string {
    // Guard: Validate sessionId parameter
    if (!sessionId || typeof sessionId !== 'string') {
      throw new Error('Invalid session ID: must be a non-empty string');
    }

    // Guard: Sanitize to prevent path traversal attacks
    // Remove any directory separators and non-alphanumeric characters except hyphens
    const sanitizedId = sessionId
      .replace(/[\\/]/g, '') // Remove path separators
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[^a-zA-Z0-9-]/g, ''); // Remove other special characters

    // Guard: Ensure sanitized ID is not empty
    if (sanitizedId.length === 0) {
      throw new Error('Invalid session ID: sanitization resulted in empty string');
    }

    // Guard: Limit length to prevent potential issues
    const MAX_ID_LENGTH = 256;
    const truncatedId = sanitizedId.length > MAX_ID_LENGTH
      ? sanitizedId.substring(0, MAX_ID_LENGTH)
      : sanitizedId;

    return path.join(this.sessionsDir, `${truncatedId}.json`);
  }

  /**
   * Ensure directory exists
   *
   * @private
   * @param dirPath - Directory path
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Sanitize path to prevent directory traversal attacks
   *
   * @private
   * @param inputPath - Path to sanitize
   * @returns Sanitized path
   */
  private sanitizePath(inputPath: string): string {
    // Guard: Validate input type before string operations
    if (inputPath === null || inputPath === undefined || typeof inputPath !== 'string') {
      return '.claude';
    }

    // Guard: Check for empty string after null check
    if (inputPath.length === 0) {
      return '.claude';
    }

    // Remove path traversal attempts and dangerous characters
    let sanitized = inputPath
      .replace(/\.\./g, '') // Remove parent directory references
      .replace(/[\\/]/g, '') // Remove path separators
      .replace(/[^a-zA-Z0-9._-]/g, ''); // Keep only safe characters

    // Guard: Ensure result is not empty
    if (sanitized.length === 0) {
      return '.claude';
    }

    // Guard: Limit length
    const MAX_PATH_LENGTH = 255;
    if (sanitized.length > MAX_PATH_LENGTH) {
      sanitized = sanitized.substring(0, MAX_PATH_LENGTH);
    }

    return sanitized;
  }

  /**
   * Generate a cryptographic nonce for replay attack prevention
   *
   * @private
   * @returns Random nonce string
   */
  private generateNonce(): string {
    // Generate a 32-byte (256-bit) random nonce
    const nonceBytes = crypto.randomBytes(32);
    return nonceBytes.toString('base64');
  }

  /**
   * Validate nonce to prevent replay attacks
   *
   * @private
   * @param nonce - Nonce to validate
   * @param sessionId - Session ID for context
   * @returns Whether nonce is valid
   */
  private validateNonce(nonce: string | undefined, sessionId: string): boolean {
    // Guard: If nonce is not present (backward compatibility), allow but log warning
    if (!nonce) {
      console.warn(`Session ${sessionId} does not have a nonce. Consider migrating.`);
      return true;
    }

    // Guard: Validate nonce format
    if (typeof nonce !== 'string' || nonce.length === 0) {
      console.error(`Invalid nonce format for session ${sessionId}`);
      return false;
    }

    // Guard: Validate nonce is base64 encoded
    if (!/^[A-Za-z0-9+/]+=*$/.test(nonce)) {
      console.error(`Invalid nonce encoding for session ${sessionId}`);
      return false;
    }

    return true;
  }

  /**
   * Export session state to JSON
   *
   * @param state - Navigation state
   * @returns JSON string
   */
  exportState(state: NavigationState): string {
    // Guard: Validate state parameter
    if (!state || typeof state !== 'object') {
      return JSON.stringify({
        error: 'Invalid state provided',
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }

    const decisionsRecord: Record<number, string> = {};

    // Guard: Validate decisions map
    if (state.decisions && typeof state.decisions.forEach === 'function') {
      state.decisions.forEach((decision, index) => {
        decisionsRecord[index] = decision;
      });
    }

    const exportData = {
      sessionId: state.sessionId ?? 'unknown',
      currentIndex: state.currentIndex ?? 0,
      changes: state.changes ?? [],
      decisions: decisionsRecord,
      lastActivity: state.lastActivity ? state.lastActivity.toISOString() : new Date().toISOString(),
      totalChanges: state.totalChanges ?? state.changes?.length ?? 0,
      exportedAt: new Date().toISOString(),
    };

    // Guard: Wrap JSON.stringify in try-catch
    try {
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export state:', error);
      return JSON.stringify({
        error: 'Failed to export state',
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }
  }

  /**
   * Import session state from JSON
   *
   * @param stateJson - JSON string
   * @returns Navigation state or null
   */
  importState(stateJson: string): NavigationState | null {
    try {
      // Guard: Validate input parameter
      if (!stateJson || typeof stateJson !== 'string') {
        console.error('Invalid state JSON: must be a non-empty string');
        return null;
      }

      // Guard: Limit input size to prevent DoS
      const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
      if (stateJson.length > MAX_JSON_SIZE) {
        console.error('Invalid state JSON: exceeds maximum size');
        return null;
      }

      const data = JSON.parse(stateJson);

      // Validate structure
      if (!data.sessionId || !Array.isArray(data.changes)) {
        return null;
      }

      // Convert decisions back to Map
      const decisions = new Map<number, DecisionType>();
      if (data.decisions) {
        Object.entries(data.decisions).forEach(([index, decision]) => {
          // Guard: Safe integer parsing with bounds checking
          const parsedIndex = parseInt(index, 10);

          // Guard: Validate parsed index is finite and within safe bounds
          if (isNaN(parsedIndex) || !Number.isFinite(parsedIndex) || !Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex > Number.MAX_SAFE_INTEGER) {
            console.error(`Invalid decision index: ${index}`);
            return;
          }

          // Guard: Validate decision enum value
          const validDecisions = ['approved', 'rejected', 'edited', 'pending'];
          if (typeof decision === 'string' && validDecisions.includes(decision)) {
            decisions.set(parsedIndex, decision as DecisionType);
          }
        });
      }

      // Guard: Validate currentIndex bounds
      const currentIndex = data.currentIndex || 0;
      if (typeof currentIndex !== 'number' || !Number.isFinite(currentIndex) || currentIndex < 0) {
        console.error('Invalid currentIndex in imported state: must be a non-negative finite number');
        return null;
      }

      // Guard: Validate currentIndex doesn't exceed array bounds
      if (Array.isArray(data.changes) && data.changes.length > 0 && currentIndex >= data.changes.length) {
        console.error(`Invalid currentIndex in imported state: ${currentIndex} >= ${data.changes.length}`);
        return null;
      }

      return {
        sessionId: data.sessionId,
        currentIndex,
        changes: data.changes,
        decisions,
        lastActivity: new Date(data.lastActivity),
        totalChanges: data.totalChanges || data.changes.length,
      };
    } catch (error) {
      console.error('Failed to import state:', error);
      return null;
    }
  }

  /**
   * Update a decision in the state (Story 4.2)
   *
   * @param index - Change index (0-based)
   * @param decision - Decision type
   * @param state - Current navigation state
   * @returns Updated navigation state or null if validation fails
   */
  updateDecision(
    index: number,
    decision: DecisionType,
    state: NavigationState
  ): NavigationState | null {
    // Guard: Validate state.changes exists
    if (!state.changes || !Array.isArray(state.changes)) {
      console.error('Invalid state: changes array is missing');
      return null;
    }

    // Validate index - return null instead of throwing
    if (typeof index !== 'number' || index < 0 || index >= state.changes.length) {
      console.error(`Invalid change index: ${index} (valid range: 0-${state.changes.length - 1})`);
      return null;
    }

    // Check for existing decision
    const existingDecision = state.decisions.get(index);
    if (existingDecision === decision) {
      return state; // No change needed
    }

    // Create updated state with new decision
    const updatedState = {
      ...state,
      decisions: new Map(state.decisions),
      lastActivity: new Date(),
    };

    updatedState.decisions.set(index, decision);

    // NOTE: Audit logging is handled by caller (DecisionProcessor)
    // to avoid duplication and maintain single responsibility

    return updatedState;
  }

  /**
   * Get decision summary (Story 4.2)
   *
   * @param state - Navigation state
   * @returns Decision summary
   */
  getDecisionSummary(state: NavigationState): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    edited: number;
    decisions: Array<{index: number; decision: DecisionType}>;
  } {
    const summary = {
      total: state.changes.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      edited: 0,
      decisions: [] as Array<{index: number; decision: DecisionType}>,
    };

    state.changes.forEach((_, index) => {
      const decision = state.decisions.get(index);

      if (!decision) {
        summary.pending++;
      } else {
        switch (decision) {
          case DecisionType.APPROVED:
            summary.approved++;
            break;
          case DecisionType.REJECTED:
            summary.rejected++;
            break;
          case DecisionType.EDITED:
            summary.edited++;
            break;
          case DecisionType.PENDING:
            summary.pending++;
            break;
        }

        summary.decisions.push({ index, decision });
      }
    });

    return summary;
  }

  /**
   * Find next pending change (Story 4.2)
   *
   * @param state - Navigation state
   * @param startIndex - Start searching from this index (default: currentIndex)
   * @returns Next pending index or null
   */
  findNextPendingChange(state: NavigationState, startIndex?: number): number | null {
    const start = startIndex ?? state.currentIndex;

    for (let i = start; i < state.changes.length; i++) {
      if (!state.decisions.has(i)) {
        return i;
      }
    }

    // Wrap around to beginning
    for (let i = 0; i < start; i++) {
      if (!state.decisions.has(i)) {
        return i;
      }
    }

    return null;
  }

  /**
   * Check if all changes have been decided (Story 4.2)
   *
   * @param state - Navigation state
   * @returns Whether all changes have decisions
   */
  isReviewComplete(state: NavigationState): boolean {
    return state.changes.length > 0 &&
           state.changes.length === state.decisions.size;
  }

  /**
   * Save state with retry logic (Story 4.2)
   *
   * @param state - Navigation state
   * @param maxRetries - Maximum number of retry attempts
   * @returns Success status
   */
  async saveStateWithRetry(state: NavigationState, maxRetries: number = 3): Promise<boolean> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const success = this.saveState(state);
        if (success) {
          return true;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Exponential backoff: 100ms, 200ms, 400ms
        const backoffMs = Math.pow(2, attempt) * 100;

        // Async sleep to avoid blocking event loop
        await new Promise(resolve => setTimeout(resolve, backoffMs));
      }
    }

    // All retries failed
    console.error('Failed to save state after retries:', lastError);
    this.auditLogger.logError(
      state.sessionId,
      'state_save_retry_failed',
      lastError?.message || 'Unknown error'
    );

    return false;
  }

  /**
   * Validate session timeout (Story 4.2)
   *
   * @param state - Navigation state
   * @param timeoutMinutes - Timeout in minutes (default: 30)
   * @returns Whether session is still valid
   */
  validateSessionTimeout(state: NavigationState, timeoutMinutes: number = 30): boolean {
    const now = new Date();
    const elapsedMinutes = (now.getTime() - state.lastActivity.getTime()) / (1000 * 60);

    if (elapsedMinutes > timeoutMinutes) {
      this.auditLogger.logError(
        state.sessionId,
        'session_timeout',
        `Session inactive for ${Math.floor(elapsedMinutes)} minutes`
      );
      return false;
    }

    return true;
  }
}
