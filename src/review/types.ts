/**
 * Review Interface Types (Story 4.1)
 *
 * Type definitions for interactive review interface
 *
 * @module review/types
 */

import { RuleSuggestion } from '../rules/types';
import { WorkaroundAction } from '../error-workarounds';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * User decision types for rule suggestions
 *
 * @enum {string}
 */
export enum DecisionType {
  /** User approved the change */
  APPROVED = 'approved',
  /** User rejected the change */
  REJECTED = 'rejected',
  /** User edited the change */
  EDITED = 'edited',
  /** Change is pending review */
  PENDING = 'pending',
}

/**
 * Navigation state for review session
 *
 * @interface NavigationState
 */
export interface NavigationState {
  /** Current index in change list */
  currentIndex: number;
  /** Array of rule changes to review */
  changes: RuleSuggestion[];
  /** User decisions by change index */
  decisions: Map<number, DecisionType>;
  /** Unique session identifier for persistence */
  sessionId: string;
  /** Last activity timestamp for timeout */
  lastActivity: Date;
  /** Cached total changes count */
  totalChanges: number;
  /** Nonce for replay attack prevention (optional for backward compatibility) */
  nonce?: string;
  /** Story 4.4: Optional confirmation state for bulk operations (transient, NOT persisted) */
  confirmation?: ConfirmationState;
  /** Story 4.5: Optional consent state for file modification (transient, NOT persisted) */
  consent?: ConsentState;
}

/**
 * Confirmation state for bulk operations (Story 4.4)
 * Stored transiently in NavigationState during confirmation flow
 * NOT added to PersistedSession - this is runtime-only state
 *
 * @interface ConfirmationState
 */
export interface ConfirmationState {
  /** Pending bulk operation type */
  pendingOperation: 'bulk_approve' | 'bulk_reject';
  /** Number of pending changes that will be affected */
  pendingCount: number;
  /** ISO 8601 timestamp when confirmation was requested */
  promptedAt: string;
}

/**
 * Bulk operation result for audit logging (Story 4.4)
 *
 * @interface BulkOperationResult
 */
export interface BulkOperationResult {
  /** Action performed */
  action: 'approve_all' | 'reject_all';
  /** Number of changes affected */
  affectedCount: number;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Session identifier */
  sessionId: string;
  /** Whether user confirmed the operation */
  confirmed: boolean;
  /** Number of changes skipped (already decided) */
  skippedChanges: number;
}

/**
 * Bulk operation prompt result (Story 4.4)
 *
 * @interface BulkOperationPrompt
 */
export interface BulkOperationPrompt {
  /** Prompt type */
  type: 'confirmation' | 'error';
  /** Message to display */
  message: string;
  /** Number of pending changes (for confirmation prompts) */
  count?: number;
}

/**
 * Consent state for file modification (Story 4.5)
 * Stored transiently in NavigationState during consent flow
 * NOT added to PersistedSession - this is runtime-only state
 *
 * @interface ConsentState
 */
export interface ConsentState {
  /** Number of approved changes to be applied */
  approvedCount: number;
  /** List of files that will be modified */
  affectedFiles: string[];
  /** ISO 8601 timestamp when consent was requested */
  promptedAt: string;
}

/**
 * Consent operation result (Story 4.5)
 *
 * @interface ConsentResult
 */
export interface ConsentResult {
  /** Action performed */
  action: 'consent_given' | 'consent_denied';
  /** Number of changes affected */
  changeCount: number;
  /** List of affected files */
  affectedFiles: string[];
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Session identifier */
  sessionId: string;
  /** Whether operation was successful */
  success: boolean;
  /** Error message if operation failed */
  error?: string;
}

/**
 * Consent prompt result (Story 4.5)
 *
 * @interface ConsentPrompt
 */
export interface ConsentPrompt {
  /** Prompt type */
  type: 'consent' | 'error';
  /** Message to display */
  message: string;
  /** Number of approved changes (for consent prompts) */
  count?: number;
  /** List of affected files (for consent prompts) */
  files?: string[];
}

/**
 * File modification result (Story 4.5)
 *
 * @interface FileModificationResult
 */
export interface FileModificationResult {
  /** File path that was modified */
  filePath: string;
  /** Whether modification was successful */
  success: boolean;
  /** Error message if modification failed */
  error?: string;
  /** Backup path for rollback (if modification succeeded) */
  backupPath?: string;
  /** Persistent backup path in data/history/ (Story 5.2) */
  persistentBackupPath?: string | null;
  /** Workaround actions suggested on failure (Story 6.4) */
  workaroundSuggestions?: WorkaroundAction[];
}

/**
 * Persisted session data
 *
 * @interface PersistedSession
 */
export interface PersistedSession {
  /** Session identifier */
  sessionId: string;
  /** Current index */
  currentIndex: number;
  /** Serialized changes */
  changes: RuleSuggestion[];
  /** Serialized decisions */
  decisions: Record<number, string>;
  /** Last activity timestamp */
  lastActivity: string;
  /** Session signature for integrity */
  signature: string;
  /** Nonce for replay attack prevention (optional for backward compatibility) */
  nonce?: string;
}

/**
 * Audit log entry
 *
 * @interface AuditLogEntry
 */
export interface AuditLogEntry {
  /** Session identifier */
  sessionId: string;
  /** Action performed */
  action: string;
  /** Change index */
  changeIndex: number;
  /** Decision made */
  decision?: DecisionType;
  /** Timestamp */
  timestamp: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Story 4.3: Original rule text (for edit actions) */
  original_rule?: string;
  /** Story 4.3: Edited rule text (for edit actions) */
  edited_rule?: string;
  /** Story 4.3: Pattern text (for edit actions - optional) */
  pattern?: string;
}

/**
 * Review summary statistics
 *
 * @interface ReviewSummary
 */
export interface ReviewSummary {
  /** Total changes */
  total: number;
  /** Pending changes */
  pending: number;
  /** Approved changes */
  approved: number;
  /** Rejected changes */
  rejected: number;
  /** Edited changes */
  edited: number;
}

/**
 * Pagination options
 *
 * @interface PaginationOptions
 */
export interface PaginationOptions {
  /** Changes per page */
  pageSize: number;
  /** Current page */
  currentPage: number;
  /** Total pages */
  totalPages: number;
}

/**
 * Sanitization result
 *
 * @interface SanitizationResult
 */
export interface SanitizationResult {
  /** Sanitized content */
  content: string;
  /** Whether content was modified */
  wasModified: boolean;
  /** Reason for modification */
  reason?: string;
}

/**
 * Security validation result
 *
 * @interface SecurityValidationResult
 */
export interface SecurityValidationResult {
  /** Whether content is safe */
  isSafe: boolean;
  /** Validation errors */
  errors: string[];
  /** Sanitized content */
  sanitizedContent?: string;
}
