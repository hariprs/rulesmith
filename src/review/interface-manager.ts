/**
 * Review Interface Manager (Story 4.1)
 *
 * Main interface for reviewing proposed rule changes with full context
 * Implements YOLO approach with security-first mindset
 *
 * @module review/interface-manager
 */

import { RuleSuggestion, RuleProposalType } from '../rules/types';
import {
  NavigationState,
  DecisionType,
  ReviewSummary,
  PaginationOptions,
} from './types';
import { MarkdownFormatter } from './markdown-formatter';
import { StateManager } from './state-manager';
import { AuditLogger } from './audit-logger';
import { DecisionProcessor } from './decision-processor';

// ============================================================================
// REVIEW INTERFACE MANAGER
// ============================================================================

/**
 * Review interface manager
 *
 * @class InterfaceManager
 */
export class InterfaceManager {
  private state: NavigationState;
  private formatter: MarkdownFormatter;
  private stateManager: StateManager;
  private auditLogger: AuditLogger;
  private decisionProcessor: DecisionProcessor;
  private readonly MAX_DISPLAY_CHANGES = 50;
  private readonly PAGE_SIZE = 10;
  private lastNavigationTime: number = 0;
  private readonly NAVIGATION_RATE_LIMIT = 100; // ms between navigations

  constructor() {
    this.formatter = new MarkdownFormatter();
    this.stateManager = new StateManager();
    this.auditLogger = new AuditLogger();
    this.decisionProcessor = new DecisionProcessor();

    // Initialize empty state
    this.state = {
      currentIndex: 0,
      changes: [],
      decisions: new Map(),
      sessionId: this.stateManager.generateSessionId(),
      lastActivity: new Date(),
      totalChanges: 0,
    };
  }

  /**
   * Present changes for review
   *
   * @param changes - Array of rule suggestions
   * @returns Formatted review interface
   */
  presentForReview(changes: RuleSuggestion[]): string {
    const startTime = Date.now();

    try {
      // Guard: Validate input parameter
      if (!changes || typeof changes !== 'object' || !Array.isArray(changes)) {
        return this.formatter.formatError(
          new Error('Invalid changes parameter: must be an array'),
          this.state.sessionId
        );
      }

      // Guard: Validate array size to prevent DoS
      if (changes.length > 10000) {
        return this.formatter.formatError(
          new Error(`Too many changes: ${changes.length}. Maximum is 10,000.`),
          this.state.sessionId
        );
      }

      // Validate input
      const validation = this.validateChanges(changes);
      if (!validation.isValid) {
        return this.formatter.formatError(
          new Error(validation.errors.join(', ')),
          this.state.sessionId
        );
      }

      // Cap changes to prevent DoS
      const cappedChanges = changes.slice(0, this.MAX_DISPLAY_CHANGES);

      // Initialize state
      this.state = {
        currentIndex: 0,
        changes: cappedChanges,
        decisions: new Map(),
        sessionId: this.stateManager.generateSessionId(),
        lastActivity: new Date(),
        totalChanges: cappedChanges.length,
      };

      // Save initial state
      this.stateManager.saveState(this.state);

      // Format display
      let output = '';

      // Summary header
      output += this.formatter.formatSummary(this.state);

      // First change
      if (cappedChanges.length > 0) {
        output += this.formatter.formatChange(
          cappedChanges[0],
          1,
          cappedChanges.length
        );
      } else {
        output += '\n**No changes to review.**\n\n';
      }

      // Navigation help
      output += this.formatNavigationHelp();

      const processingTime = Date.now() - startTime;
      this.auditLogger.logDecision(
        this.state.sessionId,
        'present_for_review',
        0,
        undefined,
        processingTime
      );

      return output;
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'present_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Navigate to next change
   *
   * @returns Formatted output
   */
  navigateNext(): string {
    return this.navigate(1);
  }

  /**
   * Navigate to previous change
   *
   * @returns Formatted output
   */
  navigatePrevious(): string {
    return this.navigate(-1);
  }

  /**
   * Navigate to specific change
   *
   * @param index - Change index (1-based)
   * @returns Formatted output
   */
  navigateToChange(index: number): string {
    const startTime = Date.now();

    try {
      // Guard: Validate index parameter type
      if (typeof index !== 'number' || !Number.isInteger(index)) {
        return '**Invalid change number.** Index must be an integer.\n\n';
      }

      // Rate limit check
      if (!this.checkRateLimit()) {
        return '**Rate limit exceeded.** Please wait a moment before navigating.\n\n';
      }

      // Validate index
      if (this.state.changes.length === 0) {
        return '**No changes to navigate.**\n\n';
      }

      if (index < 1 || index > this.state.changes.length) {
        return `**Invalid change number.** Please enter a number between 1 and ${this.state.changes.length}.\n\n`;
      }

      const oldIndex = this.state.currentIndex;
      this.state.currentIndex = index - 1; // Convert to 0-based
      this.state.lastActivity = new Date();

      // Save state
      this.stateManager.saveState(this.state);

      // Format display
      let output = '';
      output += this.formatter.formatSummary(this.state);
      output += this.formatter.formatChange(
        this.state.changes[this.state.currentIndex],
        this.state.currentIndex + 1,
        this.state.changes.length
      );
      output += this.formatNavigationHelp();

      // Log navigation
      this.auditLogger.logNavigation(
        this.state.sessionId,
        'navigate_to',
        oldIndex,
        this.state.currentIndex
      );

      const processingTime = Date.now() - startTime;
      this.auditLogger.logDecision(
        this.state.sessionId,
        'navigate_to_change',
        this.state.currentIndex,
        undefined,
        processingTime
      );

      return output;
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'navigation_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Show all changes with pagination
   *
   * @param page - Page number (1-based)
   * @returns Formatted output
   */
  showAllChanges(page: number = 1): string {
    const startTime = Date.now();

    try {
      // Guard: Validate page parameter type and range
      if (typeof page !== 'number' || !Number.isFinite(page)) {
        return '**Invalid page number.** Page must be a finite number.\n\n';
      }

      if (this.state.changes.length === 0) {
        return '**No changes to display.**\n\n';
      }

      const totalPages = Math.ceil(this.state.changes.length / this.PAGE_SIZE);

      // Validate page number
      if (page < 1 || page > totalPages) {
        return `**Invalid page number.** Please enter a number between 1 and ${totalPages}.\n\n`;
      }

      const options: PaginationOptions = {
        pageSize: this.PAGE_SIZE,
        currentPage: page,
        totalPages,
      };

      const output = this.formatter.formatAllChanges(
        this.state.changes,
        options
      );

      const processingTime = Date.now() - startTime;
      this.auditLogger.logDecision(
        this.state.sessionId,
        'show_all_changes',
        (page - 1) * this.PAGE_SIZE,
        undefined,
        processingTime
      );

      return output;
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'show_all_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Make a decision on current change
   *
   * @param decision - Decision to make
   * @returns Formatted output
   */
  makeDecision(decision: DecisionType): string {
    const startTime = Date.now();

    try {
      // Guard: Validate decision parameter
      if (!decision || typeof decision !== 'string') {
        return '**Invalid decision.** Decision must be a string value.\n\n';
      }

      // Guard: Validate decision enum value
      const validDecisions = Object.values(DecisionType);
      if (!validDecisions.includes(decision)) {
        return `**Invalid decision type.** Must be one of: ${validDecisions.join(', ')}.\n\n`;
      }

      if (this.state.changes.length === 0) {
        return '**No changes to review.**\n\n';
      }

      const currentIndex = this.state.currentIndex;

      // Record decision
      this.state.decisions.set(currentIndex, decision);
      this.state.lastActivity = new Date();

      // Save state
      this.stateManager.saveState(this.state);

      // Log decision
      this.auditLogger.logDecision(
        this.state.sessionId,
        'make_decision',
        currentIndex,
        decision,
        Date.now() - startTime
      );

      // Move to next change if available
      if (currentIndex < this.state.changes.length - 1) {
        this.state.currentIndex++;
        this.stateManager.saveState(this.state);

        let output = `**Change #${currentIndex + 1} marked as ${decision}.**\n\n`;
        output += this.formatter.formatSummary(this.state);
        output += this.formatter.formatChange(
          this.state.changes[this.state.currentIndex],
          this.state.currentIndex + 1,
          this.state.changes.length
        );
        output += this.formatNavigationHelp();

        return output;
      } else {
        // Review complete
        const summary = this.getReviewSummary();
        return `**Change #${currentIndex + 1} marked as ${decision}.**\n\n` +
               `**Review Complete!**\n\n${summary}`;
      }
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'decision_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Process a user command (Story 4.2)
   *
   * @param command - User command string
   * @returns Formatted output
   */
  async processCommand(command: string): Promise<string> {
    const startTime = Date.now();

    try {
      // Guard: Validate command parameter
      if (!command || typeof command !== 'string') {
        return '**Invalid command.** Command must be a string value.\n\n';
      }

      // Process command through decision processor
      const result = await this.decisionProcessor.processDecision(command, this.state);

      // Guard: Validate result
      if (!result || typeof result !== 'object') {
        this.auditLogger.logError(
          this.state?.sessionId ?? 'unknown',
          'invalid_result',
          'Decision processor returned invalid result'
        );
        return '**Error:** Invalid result from decision processor.\n\n';
      }

      // Update state
      this.state = result.nextState ?? this.state;

      // Format output with fallback values
      let output = `${result.message ?? 'Command processed'}\n\n`;

      if (result.success) {
        // Show summary and current change
        output += this.formatter.formatSummary(this.state);

        // Guard: Check changes array exists and has elements
        if (this.state.changes &&
            Array.isArray(this.state.changes) &&
            this.state.changes.length > 0 &&
            this.state.currentIndex >= 0 &&
            this.state.currentIndex < this.state.changes.length) {
          output += this.formatter.formatChange(
            this.state.changes[this.state.currentIndex],
            this.state.currentIndex + 1,
            this.state.changes.length
          );
        }

        output += this.formatNavigationHelp();
      }

      return output;
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'command_processing_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Get decision statistics (Story 4.2)
   *
   * @returns Decision statistics
   */
  getDecisionStatistics(): {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    edited: number;
  } {
    const summary = this.decisionProcessor.getDecisionSummary(this.state);

    return {
      total: summary.total,
      pending: summary.pending,
      approved: summary.approved,
      rejected: summary.rejected,
      edited: summary.edited,
    };
  }

  /**
   * Undo a decision
   *
   * @param index - Change index (1-based)
   * @returns Formatted output
   */
  undoDecision(index: number): string {
    try {
      // Guard: Validate index parameter type
      if (typeof index !== 'number' || !Number.isInteger(index)) {
        return '**Invalid change number.** Index must be an integer.\n\n';
      }

      // Guard: Validate state.changes exists
      if (!this.state.changes || !Array.isArray(this.state.changes)) {
        return '**Error:** Invalid state - changes array is missing.\n\n';
      }

      // Guard: Validate state.decisions exists
      if (!this.state.decisions || typeof this.state.decisions.has !== 'function') {
        return '**Error:** Invalid state - decisions map is missing.\n\n';
      }

      const changeIndex = index - 1; // Convert to 0-based

      if (changeIndex < 0 || changeIndex >= this.state.changes.length) {
        return `**Invalid change number.** Please enter a number between 1 and ${this.state.changes.length}.\n\n`;
      }

      if (!this.state.decisions.has(changeIndex)) {
        return `**Change #${index} has no decision to undo.**\n\n`;
      }

      this.state.decisions.delete(changeIndex);
      this.state.lastActivity = new Date();

      // Save state
      this.stateManager.saveState(this.state);

      // Log undo
      this.auditLogger.logDecision(
        this.state.sessionId ?? 'unknown',
        'undo_decision',
        changeIndex,
        undefined
      );

      return `**Decision for change #${index} has been undone.**\n\n` +
             this.formatter.formatSummary(this.state);
    } catch (error) {
      this.auditLogger.logError(
        this.state?.sessionId ?? 'unknown',
        'undo_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state?.sessionId ?? 'unknown'
      );
    }
  }

  /**
   * Export review state
   *
   * @returns JSON string
   */
  exportReviewState(): string {
    return this.stateManager.exportState(this.state);
  }

  /**
   * Import review state
   *
   * @param stateJson - JSON string
   * @returns Success status
   */
  importReviewState(stateJson: string): boolean {
    try {
      // Guard: Validate input parameter
      if (!stateJson || typeof stateJson !== 'string') {
        console.error('Invalid state JSON: must be a non-empty string');
        return false;
      }

      // Guard: Limit input size to prevent DoS
      const MAX_JSON_SIZE = 10 * 1024 * 1024; // 10MB
      if (stateJson.length > MAX_JSON_SIZE) {
        console.error('Invalid state JSON: exceeds maximum size');
        return false;
      }

      const importedState = this.stateManager.importState(stateJson);

      if (!importedState) {
        return false;
      }

      // Validate imported state
      const validation = this.stateManager.validateSession(importedState);
      if (!validation.isValid) {
        console.error('Invalid session state:', validation.errors);
        return false;
      }

      this.state = importedState;
      this.stateManager.saveState(this.state);

      this.auditLogger.logDecision(
        this.state.sessionId,
        'import_state',
        this.state.currentIndex,
        undefined
      );

      return true;
    } catch (error) {
      console.error('Failed to import state:', error);
      return false;
    }
  }

  /**
   * Resume a previous session
   *
   * @param sessionId - Session ID to resume
   * @returns Formatted output
   */
  resumeSession(sessionId: string): string {
    try {
      // Guard: Validate sessionId parameter
      if (!sessionId || typeof sessionId !== 'string') {
        return '**Invalid session ID.** Session ID must be a non-empty string.\n\n';
      }

      // Guard: Sanitize sessionId to prevent injection
      const sanitizedId = sessionId.replace(/[^a-zA-Z0-9-]/g, '');
      if (sanitizedId !== sessionId) {
        return '**Invalid session ID format.** Session ID contains invalid characters.\n\n';
      }

      const loadedState = this.stateManager.loadState(sessionId);

      if (!loadedState) {
        return `**Failed to resume session.** Session may have expired or is invalid.\n\n` +
               `Session ID: \`${this.sanitizeSessionIdForDisplay(sessionId)}\`\n\n`;
      }

      this.state = loadedState;

      let output = '**Session Resumed**\n\n';
      output += this.formatter.formatSummary(this.state);

      if (this.state.changes.length > 0) {
        // Guard: Bounds check for currentIndex
        if (this.state.currentIndex < 0 || this.state.currentIndex >= this.state.changes.length) {
          this.state.currentIndex = 0; // Reset to first change
        }

        output += this.formatter.formatChange(
          this.state.changes[this.state.currentIndex],
          this.state.currentIndex + 1,
          this.state.changes.length
        );
      }

      output += this.formatNavigationHelp();

      return output;
    } catch (error) {
      this.auditLogger.logError(
        sessionId || 'unknown',
        'resume_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        sessionId || 'unknown'
      );
    }
  }

  /**
   * Get current session ID
   *
   * @returns Session ID
   */
  getSessionId(): string {
    return this.state.sessionId;
  }

  /**
   * Get review summary
   *
   * @returns Formatted summary
   */
  getReviewSummary(): string {
    return this.formatter.formatSummary(this.state);
  }

  /**
   * Navigate with direction
   *
   * @private
   * @param direction - Direction to navigate (-1 or 1)
   * @returns Formatted output
   */
  private navigate(direction: number): string {
    const startTime = Date.now();

    try {
      // Rate limit check
      if (!this.checkRateLimit()) {
        return '**Rate limit exceeded.** Please wait a moment before navigating.\n\n';
      }

      if (this.state.changes.length === 0) {
        return '**No changes to navigate.**\n\n';
      }

      const oldIndex = this.state.currentIndex;

      // Calculate new index with wrap-around
      this.state.currentIndex =
        (this.state.currentIndex + direction + this.state.changes.length) %
        this.state.changes.length;

      this.state.lastActivity = new Date();

      // Save state
      this.stateManager.saveState(this.state);

      // Format display
      let output = '';
      output += this.formatter.formatSummary(this.state);
      output += this.formatter.formatChange(
        this.state.changes[this.state.currentIndex],
        this.state.currentIndex + 1,
        this.state.changes.length
      );
      output += this.formatNavigationHelp();

      // Log navigation
      this.auditLogger.logNavigation(
        this.state.sessionId,
        direction > 0 ? 'next' : 'previous',
        oldIndex,
        this.state.currentIndex
      );

      const processingTime = Date.now() - startTime;
      this.auditLogger.logDecision(
        this.state.sessionId,
        'navigate',
        this.state.currentIndex,
        undefined,
        processingTime
      );

      return output;
    } catch (error) {
      this.auditLogger.logError(
        this.state.sessionId,
        'navigation_failed',
        error instanceof Error ? error.message : 'Unknown error'
      );

      return this.formatter.formatError(
        error instanceof Error ? error : new Error('Unknown error'),
        this.state.sessionId
      );
    }
  }

  /**
   * Format navigation help
   *
   * @private
   * @returns Formatted help text
   */
  private formatNavigationHelp(): string {
    return `---
**Navigation Commands:**
- \`next\` or \`n\` - View next change
- \`previous\` or \`p\` - View previous change
- \`show X\` - Jump to change number X
- \`show all\` - Display all changes (paginated)
- \`show page N\` - Show specific page

**Decision Commands:**
- \`approve\` - Approve current change
- \`reject\` - Reject current change
- \`edit\` - Edit current change

**Bulk Operations (Story 4.4):**
- \`approve all\` - Approve all pending changes (with confirmation)
- \`reject all\` - Reject all pending changes (with confirmation)
- \`yes all\` - Same as "approve all"
- \`no all\` - Same as "reject all"

**Session Commands:**
- \`summary\` - Show review summary
- \`undo X\` - Undo decision for change X
- \`export\` - Export session state
- \`resume <session-id>\` - Resume a previous session

**Session ID:** \`${this.state.sessionId}\`
`;
  }

  /**
   * Validate changes array
   *
   * @private
   * @param changes - Changes to validate
   * @returns Validation result
   */
  private validateChanges(changes: RuleSuggestion[]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!Array.isArray(changes)) {
      errors.push('Changes must be an array');
      return { isValid: false, errors };
    }

    if (changes.length === 0) {
      return { isValid: true, errors: [] };
    }

    changes.forEach((change, index) => {
      if (!change.id) {
        errors.push(`Change #${index + 1} missing ID`);
      }

      if (!change.ruleText) {
        errors.push(`Change #${index + 1} missing rule text`);
      }

      if (!change.type) {
        errors.push(`Change #${index + 1} missing type`);
      }

      if (!change.pattern) {
        errors.push(`Change #${index + 1} missing pattern`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check rate limit for navigation
   *
   * Implements rate limiting by requiring minimum time between navigation commands.
   * NAVIGATION_RATE_LIMIT of 100ms ensures maximum 10 commands per second.
   *
   * @private
   * @returns Whether navigation is allowed
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const elapsed = now - this.lastNavigationTime;

    if (elapsed < this.NAVIGATION_RATE_LIMIT) {
      return false;
    }

    this.lastNavigationTime = now;
    return true;
  }

  /**
   * Sanitize session ID for display
   *
   * @private
   * @param sessionId - Session ID to sanitize
   * @returns Sanitized session ID
   */
  private sanitizeSessionIdForDisplay(sessionId: string): string {
    // Only show first 8 and last 4 characters for security
    if (sessionId.length <= 12) {
      return sessionId.replace(/[^a-zA-Z0-9-]/g, '');
    }
    return `${sessionId.substring(0, 8)}...${sessionId.substring(sessionId.length - 4)}`;
  }

  /**
   * Get session information for debugging
   *
   * @returns Session info
   */
  getDebugInfo(): {
    sessionId: string;
    currentIndex: number;
    totalChanges: number;
    decisionsCount: number;
    lastActivity: string;
  } {
    let decisionsCount = 0;
    this.state.decisions.forEach(() => decisionsCount++);

    return {
      sessionId: this.state.sessionId,
      currentIndex: this.state.currentIndex,
      totalChanges: this.state.changes.length,
      decisionsCount,
      lastActivity: this.state.lastActivity.toISOString(),
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new review interface manager
 *
 * @returns Interface manager instance
 */
export function createReviewInterface(): InterfaceManager {
  return new InterfaceManager();
}

/**
 * Present changes for review (convenience function)
 *
 * @param changes - Rule suggestions to review
 * @returns Formatted review interface
 */
export function presentForReview(changes: RuleSuggestion[]): string {
  const manager = new InterfaceManager();
  return manager.presentForReview(changes);
}
