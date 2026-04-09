/**
 * Decision Processor (Story 4.2)
 *
 * Core decision-making engine for approval/rejection workflow
 * Implements YOLO approach with security-first mindset
 *
 * @module review/decision-processor
 */

import { DecisionType, NavigationState } from './types';
import { StateManager } from './state-manager';
import { AuditLogger } from './audit-logger';
import { CommandParser, ParsedCommand } from './command-parser';
import { BulkOperationProcessor } from './bulk-operation-processor';
import { ConsentManager } from './consent-manager';
import { FileWriter } from './file-writer';
import { PlatformDetector } from '../platform-detector';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Command type for parsed user input
 *
 * @enum {string}
 */
export enum CommandType {
  APPROVE = 'approve',
  REJECT = 'reject',
  EDIT = 'edit',
  STAY = 'stay',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

/**
 * Decision result from processing a command
 *
 * @interface DecisionResult
 */
export interface DecisionResult {
  /** Whether the command was processed successfully */
  success: boolean;
  /** User-friendly message */
  message: string;
  /** Updated navigation state */
  nextState: NavigationState;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Error if processing failed */
  error?: Error;
  /** Warnings (non-blocking issues) */
  warnings?: string[];
}

/**
 * Validation result for command parsing
 *
 * @interface ValidationResult
 */
export interface ValidationResult {
  /** Whether the command is valid */
  isValid: boolean;
  /** Type of command */
  commandType: CommandType;
  /** Target change index (if specified) */
  targetIndex?: number;
  /** Error message if invalid */
  error?: string;
  /** Sanitized command text */
  sanitizedName?: string;
}

/**
 * Decision summary statistics
 *
 * @interface DecisionSummary
 */
export interface DecisionSummary {
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
  /** Array of decisions by index */
  decisions: Array<{index: number; decision: DecisionType}>;
}

// ============================================================================
// TOKEN BUCKET FOR RATE LIMITING
// ============================================================================

/**
 * Token bucket implementation for rate limiting
 *
 * @class TokenBucket
 */
class TokenBucket {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly windowMs: number;
  private lastRefill: number;

  constructor(maxTokens: number, windowMs: number) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.windowMs = windowMs;
    this.lastRefill = Date.now();
  }

  /**
   * Consume tokens from the bucket
   *
   * @param count - Number of tokens to consume
   * @returns Whether tokens were available
   */
  consume(count: number): boolean {
    this.refill();

    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on elapsed time with gradual refill
   * Implements smooth rate limiting by calculating proportional refill
   *
   * @private
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.windowMs) {
      // Full refill when window has completely elapsed
      this.tokens = this.maxTokens;
      this.lastRefill = now;
    } else if (elapsed > 0) {
      // Gradual refill: calculate proportion of window that has elapsed
      const tokensToAdd = Math.floor((elapsed / this.windowMs) * this.maxTokens);
      if (tokensToAdd > 0) {
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        // Update lastRefill proportionally to track partial refills
        this.lastRefill = Math.min(now, this.lastRefill + (tokensToAdd * this.windowMs / this.maxTokens));
      }
    }
  }

  /**
   * Get current token count
   *
   * @returns Current tokens
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }
}

// ============================================================================
// DECISION PROCESSOR
// ============================================================================

/**
 * Decision processor for individual change approval
 *
 * @class DecisionProcessor
 */
export class DecisionProcessor {
  // Command maps for efficient lookup (O(1))
  private readonly APPROVAL_COMMANDS = new Set([
    'yes', 'approve', 'accept', '✓', '✔'
  ]);
  private readonly REJECTION_COMMANDS = new Set([
    'no', 'reject', 'skip', 'pass', 'deny', '✗', '✖'
  ]);
  private readonly NAVIGATION_COMMANDS = new Set([
    'stay', 'help', 'next', 'previous', 'show', 'n', 'p'
  ]);

  // Security constants
  private readonly MAX_COMMAND_LENGTH = 1000;
  private readonly DECISION_RATE_LIMIT = 30; // per minute
  private readonly DECISION_TIMING_WINDOW_MS = 60000; // 1 minute

  // Rate limiting with token bucket algorithm
  private readonly rateLimiter = new Map<string, TokenBucket>();

  // Dependencies
  private stateManager: StateManager;
  private auditLogger: AuditLogger;
  private commandParser: CommandParser;
  // Story 4.4: Bulk operation processor
  private bulkOperationProcessor: BulkOperationProcessor;
  private consentManager?: ConsentManager;

  constructor() {
    this.stateManager = new StateManager();
    this.auditLogger = new AuditLogger();
    this.commandParser = new CommandParser();
    this.bulkOperationProcessor = new BulkOperationProcessor(this.stateManager, this.auditLogger);
    // Note: ConsentManager is lazy-loaded when needed to avoid circular dependencies
  }

  /**
   * Process a decision command
   *
   * @param command - User command string
   * @param state - Current navigation state
   * @returns Decision result
   */
  async processDecision(
    command: string,
    state: NavigationState
  ): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state parameter
      if (!state || typeof state !== 'object') {
        return {
          success: false,
          message: '[X] Invalid state provided',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate command parameter
      if (!command || typeof command !== 'string') {
        return {
          success: false,
          message: '[X] Invalid command provided',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // 1. Validate and sanitize input (CRITICAL for security)
      const sanitized = this.validateAndSanitize(command);
      if (!sanitized.isValid) {
        return {
          success: false,
          message: sanitized.error || 'Invalid command',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // 2. Check rate limiting
      if (!this.checkRateLimit(state.sessionId)) {
        // Log security violation
        this.auditLogger.logSecurityViolation(
          state.sessionId,
          'rate_limit_exceeded',
          `Session ${state.sessionId} exceeded rate limit of ${this.DECISION_RATE_LIMIT} decisions per minute`
        );
        return {
          success: false,
          message: '[!] Rate limit exceeded. Please wait a moment.',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // 3. Parse command using CommandParser
      const parsed = this.commandParser.parse(sanitized.sanitizedName || command);
      if (!parsed.isValid || parsed.commandType === 'unknown') {
        return {
          success: false,
          message: '[X] Invalid command. Type "help" for available commands.',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Story 4.5: Check if there's a pending consent and user is responding
      if (this.hasPendingConsent(state) && this.commandParser.isConsentConfirmation(command)) {
        result = await this.processConsentApply(command, state);
        // Update state after consent processing
        this.state = result.nextState;
        return result;
      }

      // 4. Process decision
      let result: DecisionResult;

      // Story 4.4: Handle bulk operations BEFORE individual operations
      if (parsed.commandType === 'bulk_approve' || parsed.commandType === 'bulk_reject') {
        result = await this.processBulkOperation(parsed.commandType, state);
      } else if (parsed.commandType === 'consent_apply') {
        // Story 4.5: Handle consent apply command
        result = await this.processConsentApply(command, state);
      } else if (parsed.commandType === 'approve') {
        // Guard: Ensure currentIndex is valid
        const currentIndex = state.currentIndex ?? 0;
        const targetIndex = parsed.targetIndex ?? currentIndex;
        result = await this.approve(targetIndex, state);
      } else if (parsed.commandType === 'reject') {
        // Guard: Ensure currentIndex is valid
        const currentIndex = state.currentIndex ?? 0;
        const targetIndex = parsed.targetIndex ?? currentIndex;
        result = await this.reject(targetIndex, state);
      } else if (parsed.commandType === 'edit') {
        // Guard: Ensure currentIndex is valid
        const currentIndex = state.currentIndex ?? 0;
        const targetIndex = parsed.targetIndex ?? currentIndex;
        const editedText = parsed.editedText;

        // For edit commands, we need the edited text
        if (!editedText) {
          result = {
            success: false,
            message: '[X] Edit command requires edited text. Usage: edit #N <new text>',
            nextState: state,
            processingTimeMs: performance.now() - startTime,
          };
        } else {
          result = await this.edit(targetIndex, editedText, state);
        }
      } else if (parsed.commandType === 'stay' || parsed.commandType === 'help' ||
                 parsed.commandType === 'next' || parsed.commandType === 'previous' ||
                 parsed.commandType === 'show') {
        result = {
          success: true,
          message: '[OK] Navigation command recognized',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      } else {
        result = {
          success: false,
          message: '[X] Unknown command',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      return result;
    } catch (error) {
      // Never crash - always return a result
      return {
        success: false,
        message: `[X] Error processing decision: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Approve a change
   *
   * @param index - Change index (0-based)
   * @param state - Current navigation state
   * @returns Decision result
   */
  async approve(index: number, state: NavigationState): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state.changes exists
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          success: false,
          message: '[X] Invalid state: changes array is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate state.decisions exists
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          success: false,
          message: '[X] Invalid state: decisions map is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Validate index
      const validation = this.validateIndex(index, state);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid index',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Check for existing decision
      const existingDecision = state.decisions.get(index) ?? null;
      const decision = DecisionType.APPROVED;

      // Check if change has been edited (AC7: Rule Application Logic)
      const change = state.changes[index];
      const ruleToApply = (change as any).edited_rule || change.ruleText || '';

      // Update state
      const updatedState = this.updateDecision(index, decision, state);
      if (!updatedState) {
        return {
          success: false,
          message: '[X] Failed to update decision state',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Log decision with context about whether edited version was used
      const actionText = (change as any).edited_rule
        ? 'approve (edited version)'
        : 'approve';

      this.auditLogger.logDecision(
        updatedState.sessionId,
        actionText,
        index,
        decision,
        performance.now() - startTime
      );

      // Generate message
      const changeNumber = index + 1; // 1-indexed for display
      let message = `[+] Change #${changeNumber} approved`;

      // Indicate if edited version was used
      if ((change as any).edited_rule) {
        message += ' (edited version)';
      } else if (existingDecision && existingDecision !== decision) {
        message += ` (changed from ${existingDecision})`;
      }

      // Auto-advance to next pending change
      const nextPending = this.findNextPendingChange(updatedState);
      const finalState = nextPending !== null
        ? { ...updatedState, currentIndex: nextPending }
        : updatedState;

      // Save state
      this.stateManager.saveState(finalState);

      return {
        success: true,
        message,
        nextState: finalState,
        processingTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `[X] Error approving change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Reject a change
   *
   * @param index - Change index (0-based)
   * @param state - Current navigation state
   * @returns Decision result
   */
  async reject(index: number, state: NavigationState): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state.changes exists
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          success: false,
          message: '[X] Invalid state: changes array is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate state.decisions exists
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          success: false,
          message: '[X] Invalid state: decisions map is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Validate index
      const validation = this.validateIndex(index, state);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid index',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Check for existing decision
      const existingDecision = state.decisions.get(index) ?? null;
      const decision = DecisionType.REJECTED;

      // Update state
      const updatedState = this.updateDecision(index, decision, state);
      if (!updatedState) {
        return {
          success: false,
          message: '[X] Failed to update decision state',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Log decision
      this.auditLogger.logDecision(
        updatedState.sessionId,
        'reject',
        index,
        decision,
        performance.now() - startTime
      );

      // Generate message
      const changeNumber = index + 1; // 1-indexed for display
      let message = `[-] Change #${changeNumber} rejected`;

      if (existingDecision && existingDecision !== decision) {
        message += ` (changed from ${existingDecision})`;
      }

      // Auto-advance to next pending change
      const nextPending = this.findNextPendingChange(updatedState);
      const finalState = nextPending !== null
        ? { ...updatedState, currentIndex: nextPending }
        : updatedState;

      // Save state
      this.stateManager.saveState(finalState);

      return {
        success: true,
        message,
        nextState: finalState,
        processingTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `[X] Error rejecting change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Edit a change
   *
   * @param index - Change index (0-based)
   * @param editedText - User's edited version
   * @param state - Current navigation state
   * @returns Decision result
   */
  async edit(index: number, editedText: string, state: NavigationState): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state.changes exists
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          success: false,
          message: '[X] Invalid state: changes array is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate state.decisions exists
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          success: false,
          message: '[X] Invalid state: decisions map is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Validate index
      const validation = this.validateIndex(index, state);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.error || 'Invalid index',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Get the change being edited
      const change = state.changes[index];
      if (!change) {
        return {
          success: false,
          message: `[X] Change #${index + 1} not found`,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Validate the edit
      const editValidation = this.validateEdit(change.ruleText || '', editedText);
      if (!editValidation.valid) {
        return {
          success: false,
          message: `[X] ${editValidation.error}`,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Store the original rule if not already stored
      const updatedChanges = [...state.changes];
      if (!updatedChanges[index].original_rule) {
        updatedChanges[index] = {
          ...updatedChanges[index],
          original_rule: updatedChanges[index].ruleText,
        };
      }

      // Store the edited version
      updatedChanges[index] = {
        ...updatedChanges[index],
        edited_rule: editValidation.sanitized || editedText,
      };

      // Update state with edited change and EDITED decision
      const updatedState = {
        ...state,
        changes: updatedChanges,
        decisions: new Map(state.decisions),
        lastActivity: new Date(),
      };

      updatedState.decisions.set(index, DecisionType.EDITED);

      // Check for existing decision (overwrite support - AC8)
      const existingDecision = state.decisions.get(index);
      const existingEditedRule = (state.changes[index] as any).edited_rule;

      // Story 4.3 AC8: Log edit overwrites to show edit history
      if (existingDecision === DecisionType.EDITED && existingEditedRule) {
        // Log the overwrite as a separate audit entry showing the transition
        this.auditLogger.logEdit(
          updatedState.sessionId,
          index,
          existingEditedRule,  // Previous edited version as "original"
          editValidation.sanitized || editedText,  // New edited version
          performance.now() - startTime,
          'edit_overwrite'  // Special pattern to indicate this is an overwrite
        );
      }

      // Log edit decision (Story 4.3: FR21 - Audit Trail)
      // AC6: Log edit operation with timestamp, change_id, original, and edited versions
      this.auditLogger.logEdit(
        updatedState.sessionId,
        index,
        change.ruleText || '',
        editValidation.sanitized || editedText,
        performance.now() - startTime,
        change.pattern?.pattern_text || ''  // Include pattern for audit trail
      );

      // Generate message
      const changeNumber = index + 1; // 1-indexed for display
      let message = `[✏️] Change #${changeNumber} edited`;

      if (existingDecision && existingDecision !== DecisionType.EDITED) {
        message += ` (changed from ${existingDecision})`;
      }

      // Don't auto-advance after edit - let user review their edit
      const finalState = updatedState;

      // Story 4.3 AC11: Validate performance requirement (p95 < 100ms)
      const processingTime = performance.now() - startTime;
      const PERFORMANCE_TARGET_MS = 100;
      if (processingTime > PERFORMANCE_TARGET_MS) {
        this.auditLogger.logError(
          finalState.sessionId,
          'edit_performance_slow',
          `Edit processing took ${processingTime.toFixed(2)}ms (target: ${PERFORMANCE_TARGET_MS}ms)`
        );
      }

      // Save state
      this.stateManager.saveState(finalState);

      return {
        success: true,
        message,
        nextState: finalState,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `[X] Error editing change: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Process bulk operation (Story 4.4)
   *
   * @param commandType - Bulk command type
   * @param state - Current navigation state
   * @returns Decision result
   */
  async processBulkOperation(
    commandType: 'bulk_approve' | 'bulk_reject',
    state: NavigationState
  ): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state.changes exists
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          success: false,
          message: '[X] Invalid state: changes array is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate state.decisions exists
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          success: false,
          message: '[X] Invalid state: decisions map is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Check if there's a pending confirmation
      if (this.bulkOperationProcessor.hasPendingConfirmation(state)) {
        // User is responding to confirmation prompt
        const confirmation = this.bulkOperationProcessor.getPendingConfirmation(state);
        const confirmed = confirmation !== undefined;

        const result = await this.bulkOperationProcessor.executeBulkOperation(state, confirmed);

        // Generate appropriate message
        let message: string;
        if (result.confirmed) {
          const icon = result.action === 'approve_all' ? '[+]' : '[-]';
          message = `${icon} ${result.affectedCount} changes ${result.action === 'approve_all' ? 'approved' : 'rejected'}`;
        } else {
          message = '[!] Bulk operation cancelled';
        }

        return {
          success: true,
          message,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // No pending confirmation, initiate new bulk operation
      const operation: 'bulk_approve' | 'bulk_reject' = commandType;
      const prompt = await this.bulkOperationProcessor.initiateBulkOperation(operation, state);

      if (prompt.type === 'error') {
        return {
          success: false,
          message: prompt.message,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Return confirmation prompt
      return {
        success: true,
        message: prompt.message,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `[X] Error processing bulk operation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }

  /**
   * Validate an edit
   *
   * @param original - Original rule text
   * @param edited - Edited rule text
   * @returns Validation result
   */
  validateEdit(original: string, edited: string): {
    valid: boolean;
    error?: string;
    sanitized?: string;
  } {
    // Story 4.3 AC10: Validate UTF-8 encoding to prevent bypass attacks
    // Check for invalid UTF-8 sequences
    try {
      // Encode to UTF-8 bytes and decode back to detect invalid sequences
      const encoder = new TextEncoder();
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const bytes = encoder.encode(edited);
      decoder.decode(bytes);
    } catch (utf8Error) {
      return {
        valid: false,
        error: 'Edited text contains invalid UTF-8 encoding',
      };
    }

    // Story 4.3: Reuse sanitization from Story 4.1 MarkdownFormatter
    // Import dynamically to avoid circular dependency
    const { MarkdownFormatter } = require('./markdown-formatter');
    const formatter = new MarkdownFormatter();
    const sanitized = formatter.sanitizeForMarkdown(edited);

    // Check for empty after trimming (AC2)
    if (!sanitized || sanitized.trim().length === 0) {
      return {
        valid: false,
        error: 'Edited text cannot be empty',
      };
    }

    // Check if identical to original (AC2)
    if (sanitized.trim() === original.trim()) {
      return {
        valid: false,
        error: 'Edited text must differ from original',
      };
    }

    // Check length limit (10,000 chars for edits per Story 4.3, AC10)
    const MAX_EDIT_LENGTH = 10000;
    if (sanitized.length > MAX_EDIT_LENGTH) {
      return {
        valid: false,
        error: `Edited text too long (max ${MAX_EDIT_LENGTH} chars)`,
      };
    }

    return {
      valid: true,
      sanitized,
    };
  }

  /**
   * Validate a command
   *
   * @param command - Command string
   * @returns Validation result
   */
  validateCommand(command: string): ValidationResult {
    return this.parseCommand(command);
  }

  /**
   * Parse change index from command
   *
   * @param command - Command string
   * @returns Change index or null
   */
  parseChangeIndex(command: string): number | null {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return null;
    }

    const parts = command.trim().split(/\s+/);
    if (parts.length < 2) {
      return null;
    }

    // Guard: Ensure parts[1] exists before parsing
    if (!parts[1]) {
      return null;
    }

    const index = parseInt(parts[1], 10);
    return isNaN(index) ? null : index - 1; // Convert to 0-based
  }

  /**
   * Check rate limit for a session
   *
   * @param sessionId - Session identifier
   * @returns Whether decision is allowed
   */
  checkRateLimit(sessionId: string): boolean {
    const bucket = this.rateLimiter.get(sessionId) ||
      new TokenBucket(this.DECISION_RATE_LIMIT, this.DECISION_TIMING_WINDOW_MS);

    const allowed = bucket.consume(1);
    this.rateLimiter.set(sessionId, bucket);
    return allowed;
  }

  /**
   * Get decision summary
   *
   * @param state - Navigation state
   * @returns Decision summary
   */
  getDecisionSummary(state: NavigationState): DecisionSummary {
    // Guard: Validate state.changes exists
    if (!state.changes || !Array.isArray(state.changes)) {
      return {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        edited: 0,
        decisions: [],
      };
    }

    // Guard: Validate state.decisions exists
    if (!state.decisions || typeof state.decisions.get !== 'function') {
      return {
        total: state.changes.length,
        pending: state.changes.length,
        approved: 0,
        rejected: 0,
        edited: 0,
        decisions: [],
      };
    }

    const summary: DecisionSummary = {
      total: state.changes.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      edited: 0,
      decisions: [],
    };

    state.changes.forEach((_, index) => {
      const decision = state.decisions.get(index) ?? null;

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

  // ==========================================================================
  // PRIVATE METHODS
  // ==========================================================================

  /**
   * Validate and sanitize input
   *
   * @private
   * @param command - Command string
   * @returns Validation result
   */
  private validateAndSanitize(command: string): ValidationResult {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return {
        isValid: false,
        commandType: CommandType.UNKNOWN,
        error: 'Invalid command type',
      };
    }

    // Security: Validate length
    if (command.length > this.MAX_COMMAND_LENGTH) {
      return {
        isValid: false,
        commandType: CommandType.UNKNOWN,
        error: 'Command too long',
      };
    }

    // Guard: Check for empty command after length validation
    if (command.length === 0) {
      return {
        isValid: false,
        commandType: CommandType.UNKNOWN,
        error: 'Empty command',
      };
    }

    // Security: Sanitize dangerous patterns
    const dangerous = [
      '<script', 'javascript:', 'onclick', 'onerror',
      'DROP TABLE', 'eval\\(', 'alert\\(', 'document.cookie',
      '<iframe', 'onload=', 'fromCharCode', 'String\\.fromCharCode'
    ];

    let sanitized = command;
    let wasModified = false;
    const detectedPatterns: string[] = [];

    for (const pattern of dangerous) {
      const regex = new RegExp(pattern, 'gi');
      if (regex.test(sanitized)) {
        sanitized = sanitized.replace(regex, '');
        wasModified = true;
        detectedPatterns.push(pattern);
      }
    }

    // Security: Log if dangerous patterns were detected
    if (wasModified && detectedPatterns.length > 0) {
      this.auditLogger.logSecurityViolation(
        'unknown',
        'dangerous_pattern_detected',
        `Command contained dangerous patterns: ${detectedPatterns.join(', ')}`
      );
    }

    // Security: Remove null bytes and control characters (except whitespace)
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Security: Normalize unicode to prevent homograph attacks
    // Convert to NFC normalized form
    sanitized = sanitized.normalize('NFC');

    return {
      isValid: true,
      commandType: CommandType.UNKNOWN,
      sanitizedName: sanitized,
      error: wasModified ? '[!] Command was sanitized for security' : undefined,
    };
  }

  /**
   * Parse command into components
   *
   * @private
   * @param command - Command string
   * @returns Validation result
   */
  private parseCommand(command: string): ValidationResult {
    // Guard: Validate command is not empty after trim
    const trimmedCommand = command?.trim() ?? '';
    if (trimmedCommand.length === 0) {
      return {
        isValid: false,
        commandType: CommandType.UNKNOWN,
        error: 'Empty command',
      };
    }

    const parts = trimmedCommand.toLowerCase().split(/\s+/);

    // Guard: Ensure parts array has at least one element
    if (parts.length === 0 || !parts[0]) {
      return {
        isValid: false,
        commandType: CommandType.UNKNOWN,
        error: 'Invalid command format',
      };
    }

    const mainCommand = parts[0];

    // Check approval commands
    if (this.APPROVAL_COMMANDS.has(mainCommand)) {
      return {
        isValid: true,
        commandType: CommandType.APPROVE,
        targetIndex: parts[1] ? this.parseIndexToNumber(parts[1]) : undefined,
      };
    }

    // Check rejection commands
    if (this.REJECTION_COMMANDS.has(mainCommand)) {
      return {
        isValid: true,
        commandType: CommandType.REJECT,
        targetIndex: parts[1] ? this.parseIndexToNumber(parts[1]) : undefined,
      };
    }

    // Check navigation commands
    if (this.NAVIGATION_COMMANDS.has(mainCommand)) {
      return {
        isValid: true,
        commandType: mainCommand as CommandType,
      };
    }

    return {
      isValid: false,
      commandType: CommandType.UNKNOWN,
      error: 'Unknown command',
    };
  }

  /**
   * Parse index string to number (0-based)
   *
   * @private
   * @param input - Index string
   * @returns Parsed index or undefined
   */
  private parseIndexToNumber(input: string): number | undefined {
    // Guard: Validate input before parsing
    if (!input || typeof input !== 'string') {
      return undefined;
    }

    const index = parseInt(input, 10);

    // Guard: Validate parsed result
    if (isNaN(index) || !Number.isFinite(index) || index < 1) {
      return undefined;
    }

    // Guard: Check for reasonable maximum to prevent overflow
    const MAX_REASONABLE_INDEX = 1000000;
    if (index > MAX_REASONABLE_INDEX) {
      return undefined;
    }

    return index - 1; // Convert to 0-based
  }

  /**
   * Validate change index
   *
   * @private
   * @param index - Change index (0-based)
   * @param state - Navigation state
   * @returns Validation result
   */
  private validateIndex(
    index: number,
    state: NavigationState
  ): { isValid: boolean; error?: string } {
    // Guard: Validate index type and value
    if (typeof index !== 'number' || !Number.isFinite(index) || !Number.isInteger(index)) {
      return { isValid: false, error: 'Invalid change number' };
    }

    // Guard: Check for negative indices
    if (index < 0) {
      return { isValid: false, error: 'Invalid change number (negative)' };
    }

    // Guard: Validate state.changes exists before accessing length
    if (!state.changes || !Array.isArray(state.changes)) {
      return { isValid: false, error: 'Invalid state: changes array missing' };
    }

    // Guard: Check array bounds
    if (index >= state.changes.length) {
      return {
        isValid: false,
        error: `[X] Invalid change number. Valid: 1-${state.changes.length}`,
      };
    }

    return { isValid: true };
  }

  /**
   * Update decision in state
   *
   * @private
   * @param index - Change index (0-based)
   * @param decision - Decision type
   * @param state - Navigation state
   * @returns Updated state
   */
  private updateDecision(
    index: number,
    decision: DecisionType,
    state: NavigationState
  ): NavigationState {
    const updatedState = {
      ...state,
      decisions: new Map(state.decisions),
      lastActivity: new Date(),
    };

    updatedState.decisions.set(index, decision);

    return updatedState;
  }

  /**
   * Find next pending change
   *
   * @private
   * @param state - Navigation state
   * @returns Next pending index or null
   */
  private findNextPendingChange(state: NavigationState): number | null {
    // Guard: Validate state.changes exists and is array
    if (!state.changes || !Array.isArray(state.changes) || state.changes.length === 0) {
      return null;
    }

    // Guard: Validate state.decisions exists and has expected method
    if (!state.decisions || typeof state.decisions.has !== 'function') {
      return null;
    }

    // Guard: Validate currentIndex is finite number
    const start = typeof state.currentIndex === 'number' && Number.isFinite(state.currentIndex)
      ? state.currentIndex
      : 0;

    // Guard: Ensure start is within bounds
    const safeStart = Math.max(0, Math.min(start, state.changes.length - 1));

    // Search forward from current position
    for (let i = safeStart; i < state.changes.length; i++) {
      if (!state.decisions.has(i)) {
        return i;
      }
    }

    // Wrap around to beginning
    for (let i = 0; i < safeStart; i++) {
      if (!state.decisions.has(i)) {
        return i;
      }
    }

    return null;
  }

  /**
   * Generate help text
   *
   * @private
   * @returns Help text
   */
  private generateHelpText(): string {
    return `
Available Commands:
  Decisions:
    yes/approve [N]    - Approve current change or change #N
    no/reject [N]      - Reject current change or change #N
    edit #N <text>     - Edit change #N with custom text

  Bulk Operations (Story 4.4):
    approve all        - Approve all pending changes (with confirmation)
    reject all         - Reject all pending changes (with confirmation)
    yes all            - Same as "approve all"
    no all             - Same as "reject all"

  Navigation:
    next/n             - View next change
    previous/p         - View previous change
    show X             - Jump to change #X
    show all           - Show all changes

  Session:
    help/?             - Show this help
    resume             - Resume previous session
    apply              - Apply approved changes
    exit               - Exit review (changes are saved)
`;
  }

  /**
   * Get or create consent manager (lazy loading)
   *
   * @private
   * @returns ConsentManager instance
   */
  private getConsentManager(): ConsentManager {
    if (!this.consentManager) {
      const platformDetector = new PlatformDetector();
      const fileWriter = new FileWriter(platformDetector.detectPlatform());
      this.consentManager = new ConsentManager(
        this.stateManager,
        this.auditLogger,
        fileWriter,
        platformDetector
      );
    }
    return this.consentManager;
  }

  /**
   * Check if there's a pending consent prompt
   *
   * @param state - Current navigation state
   * @returns Whether consent prompt is pending
   */
  hasPendingConsent(state: NavigationState): boolean {
    return state.consent !== undefined;
  }

  /**
   * Process consent apply command (Story 4.5)
   *
   * @param command - User command string
   * @param state - Current navigation state
   * @returns Decision result
   */
  async processConsentApply(command: string, state: NavigationState): Promise<DecisionResult> {
    const startTime = performance.now();

    try {
      // Guard: Validate state.changes exists
      if (!state.changes || !Array.isArray(state.changes)) {
        return {
          success: false,
          message: '[X] Invalid state: changes array is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Guard: Validate state.decisions exists
      if (!state.decisions || typeof state.decisions.get !== 'function') {
        return {
          success: false,
          message: '[X] Invalid state: decisions map is missing',
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      const consentManager = this.getConsentManager();

      // Check if there's a pending consent
      if (this.hasPendingConsent(state)) {
        // User is responding to consent prompt
        const confirmed = this.commandParser.isConsentConfirmation(command);
        const result = await consentManager.executeConsent(state, confirmed);

        // Generate appropriate message
        let message: string;
        if (result.success && result.action === 'consent_given') {
          message = `[+] ${result.changeCount} changes applied successfully`;
        } else if (result.action === 'consent_denied') {
          message = '[!] Operation cancelled - no files modified';
        } else {
          message = `[X] ${result.error || 'Consent operation failed'}`;
        }

        return {
          success: result.success,
          message,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
          error: result.error ? new Error(result.error) : undefined,
        };
      }

      // Initiate consent flow
      const prompt = await consentManager.initiateConsent(state);

      if (prompt.type === 'error') {
        return {
          success: false,
          message: prompt.message,
          nextState: state,
          processingTimeMs: performance.now() - startTime,
        };
      }

      // Return consent prompt
      return {
        success: true,
        message: prompt.message,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        message: `[X] Error processing consent: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextState: state,
        processingTimeMs: performance.now() - startTime,
        error: error as Error,
      };
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new decision processor
 *
 * @returns Decision processor instance
 */
export function createDecisionProcessor(): DecisionProcessor {
  return new DecisionProcessor();
}
