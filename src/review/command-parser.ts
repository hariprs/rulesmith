/**
 * Command Parser (Story 4.2)
 *
 * Parses and validates user commands for decision processing
 *
 * @module review/command-parser
 */

import { CommandType } from './decision-processor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Parsed command result
 *
 * @interface ParsedCommand
 */
export interface ParsedCommand {
  /** Type of command */
  commandType:
    | 'approve'
    | 'reject'
    | 'edit'
    | 'bulk_approve'
    | 'bulk_reject'
    | 'consent_apply'
    | 'unknown';
  /** Target change index (null means current) */
  targetIndex: number | null;
  /** Original command string */
  rawCommand: string;
  /** Whether the command is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
  /** Edited text (for edit commands) */
  editedText?: string;
}

/**
 * Command validation result
 *
 * @interface CommandValidationResult
 */
export interface CommandValidationResult {
  /** Whether the command is valid */
  isValid: boolean;
  /** Parsed command */
  command?: ParsedCommand;
  /** Error message if invalid */
  error?: string;
}

// ============================================================================
// COMMAND PARSER
// ============================================================================

/**
 * Command parser for decision processing
 *
 * @class CommandParser
 */
export class CommandParser {
  // Command sets for efficient lookup
  private readonly APPROVAL_COMMANDS = new Set([
    'yes', 'approve', 'accept', '✓', '✔'
  ]);
  private readonly REJECTION_COMMANDS = new Set([
    'no', 'reject', 'skip', 'pass', 'deny', '✗', '✖'
  ]);
  private readonly EDIT_COMMANDS = new Set([
    'edit', 'modify', 'change', 'update'
  ]);
  private readonly NAVIGATION_COMMANDS = new Set([
    'stay', 'help', 'next', 'previous', 'show', 'n', 'p'
  ]);

  // Story 4.4: Bulk command patterns (checked BEFORE individual commands)
  private readonly BULK_APPROVE_KEYWORDS = new Set(['yes', 'approve', 'accept']);
  private readonly BULK_REJECT_KEYWORDS = new Set(['no', 'reject', 'deny']);

  // Story 4.5: Consent confirmation keywords
  private readonly CONSENT_CONFIRM_KEYWORDS = new Set(['yes', 'confirm', 'apply', 'proceed']);

  // Security constraints
  private readonly MAX_COMMAND_LENGTH = 1000;
  private readonly MAX_CHANGE_NUMBER = 10000;

  /**
   * Parse a command string
   *
   * @param command - Command string to parse
   * @returns Parsed command
   */
  parse(command: string): ParsedCommand {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return {
        commandType: 'unknown',
        targetIndex: null,
        rawCommand: command ?? '',
        isValid: false,
        error: 'Invalid command: must be a non-empty string',
      };
    }

    const trimmed = command.trim();

    // Guard: Check for empty command after trim
    if (trimmed.length === 0) {
      return {
        commandType: 'unknown',
        targetIndex: null,
        rawCommand: command,
        isValid: false,
        error: 'Command is empty',
      };
    }

    const commandType = this.getCommandType(trimmed);
    const targetIndex = this.extractIndex(trimmed);
    const editedText = this.extractEditedText(trimmed);

    return {
      commandType,
      targetIndex,
      rawCommand: command,
      isValid: this.isValidCommand(trimmed),
      error: this.getValidationError(trimmed),
      editedText,
    };
  }

  /**
   * Validate a command string
   *
   * @param command - Command string to validate
   * @returns Validation result
   */
  isValid(command: string): boolean {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return false;
    }

    return this.isValidCommand(command.trim());
  }

  /**
   * Extract change index from command
   *
   * @param command - Command string
   * @returns Change index (1-based) or null
   */
  extractIndex(command: string): number | null {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return null;
    }

    const parts = command.trim().split(/\s+/);

    // Guard: Ensure parts array has enough elements
    if (parts.length < 2) {
      return null;
    }

    // Story 4.3: Handle both "edit #3" and "3 edit" patterns
    let indexStr: string | null = null;

    // Pattern 1: "edit #3" - index is in parts[1]
    if (parts[1]) {
      const potentialIndex = parts[1].replace(/^#/, '');
      const parsed = parseInt(potentialIndex, 10);
      if (!isNaN(parsed) && Number.isFinite(parsed)) {
        indexStr = potentialIndex;
      }
    }

    // Pattern 2: "3 edit" - index is in parts[0]
    if (!indexStr && parts[0]) {
      const potentialIndex = parts[0].replace(/^#/, '');
      const parsed = parseInt(potentialIndex, 10);
      if (!isNaN(parsed) && Number.isFinite(parsed)) {
        indexStr = potentialIndex;
      }
    }

    // Guard: Ensure we found an index
    if (!indexStr) {
      return null;
    }

    // Try to parse the index string as a number
    const index = parseInt(indexStr, 10);

    // Guard: Validate parsed number (Story 4.3 AC9: Clear error messages)
    if (isNaN(index) || !Number.isFinite(index)) {
      return null;
    }

    if (index < 1) {
      return null;  // Will be caught by validation with error message
    }

    if (index > this.MAX_CHANGE_NUMBER) {
      return null;  // Will be caught by validation with error message
    }

    return index;
  }

  /**
   * Extract edited text from edit command
   * For edit commands, the text after the change number is the edited text
   * Story 4.3: Handles both "edit #3 text" and "3 edit text" patterns
   *
   * @param command - Command string
   * @returns Edited text or undefined
   */
  extractEditedText(command: string): string | undefined {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return undefined;
    }

    const parts = command.trim().split(/\s+/);

    // Guard: Ensure we have at least: command number text
    if (parts.length < 3) {
      return undefined;
    }

    let editedText: string;

    // Story 4.3: Detect pattern
    const firstPart = parts[0].replace(/^#/, '');
    const firstNum = parseInt(firstPart, 10);
    const isReversePattern = !isNaN(firstNum) && this.EDIT_COMMANDS.has(parts[1]?.toLowerCase());

    if (isReversePattern) {
      // Pattern: "3 edit new text" - skip first two parts ("3" and "edit")
      editedText = parts.slice(2).join(' ').trim();
    } else {
      // Pattern: "edit 3 new text" - skip first two parts ("edit" and "3")
      editedText = parts.slice(2).join(' ').trim();
    }

    // Guard: Validate we got some text and it's not just whitespace
    if (!editedText || editedText.length === 0) {
      return undefined;
    }

    // Guard: Validate edited text length to prevent DoS
    const MAX_EDIT_COMMAND_LENGTH = 10000;
    if (editedText.length > MAX_EDIT_COMMAND_LENGTH) {
      return undefined;
    }

    return editedText;
  }

  /**
   * Get command type from string
   *
   * @param command - Command string
   * @returns Command type
   */
  getCommandType(
    command: string
  ): 'approve' | 'reject' | 'edit' | 'bulk_approve' | 'bulk_reject' | 'consent_apply' | 'unknown' {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return 'unknown';
    }

    const parts = command.toLowerCase().split(/\s+/);

    // Guard: Ensure parts array is not empty
    if (parts.length === 0 || !parts[0]) {
      return 'unknown';
    }

    const mainCommand = parts[0];

    // Story 4.5: Check for consent apply command (standalone "apply")
    if (parts.length === 1 && mainCommand === 'apply') {
      return 'consent_apply';
    }

    // Story 4.4: CRITICAL - Check bulk commands FIRST (before individual commands)
    // This prevents "approve all" from being parsed as individual "approve" command
    // Pattern: "verb all" where verb is approve/reject keyword
    if (parts.length === 2 && parts[1] === 'all') {
      if (this.BULK_APPROVE_KEYWORDS.has(mainCommand)) {
        return 'bulk_approve';
      }
      if (this.BULK_REJECT_KEYWORDS.has(mainCommand)) {
        return 'bulk_reject';
      }
    }

    // Then check individual commands
    if (this.APPROVAL_COMMANDS.has(mainCommand)) {
      return 'approve';
    }

    if (this.REJECTION_COMMANDS.has(mainCommand)) {
      return 'reject';
    }

    if (this.EDIT_COMMANDS.has(mainCommand)) {
      return 'edit';
    }

    // Story 4.3: Check for reverse pattern (e.g., "3 edit", "#7 update")
    // Pattern: number followed by edit command
    if (parts.length >= 2) {
      const firstPart = parts[0].replace(/^#/, ''); // Remove # prefix
      const firstNum = parseInt(firstPart, 10);
      if (!isNaN(firstNum) && this.EDIT_COMMANDS.has(parts[1])) {
        return 'edit';
      }
    }

    return 'unknown';
  }

  /**
   * Validate command string
   *
   * @private
   * @param command - Command string
   * @returns Whether command is valid
   */
  private isValidCommand(command: string): boolean {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return false;
    }

    // Check length
    if (command.length === 0 || command.length > this.MAX_COMMAND_LENGTH) {
      return false;
    }

    // Check for dangerous patterns
    const dangerous = [
      '<script', 'javascript:', 'onclick', 'onerror',
      'DROP TABLE', 'eval(', 'alert(', 'document.cookie',
      '../', '..\\', ';', '--', '/*', '*/'
    ];

    // Guard: Ensure toLowerCase works safely
    const lowerCommand = command.toLowerCase();
    for (const pattern of dangerous) {
      if (lowerCommand.includes(pattern.toLowerCase())) {
        return false;
      }
    }

    // Check command type
    const type = this.getCommandType(command);
    return type !== 'unknown';
  }

  /**
   * Get validation error message
   *
   * @private
   * @param command - Command string
   * @returns Error message or undefined
   */
  private getValidationError(command: string): string | undefined {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return 'Invalid command type';
    }

    if (command.length === 0) {
      return 'Command is empty';
    }

    if (command.length > this.MAX_COMMAND_LENGTH) {
      return 'Command too long';
    }

    // Check for dangerous patterns
    const dangerous = [
      '<script', 'javascript:', 'onclick', 'onerror',
      'DROP TABLE', 'eval(', 'alert(', 'document.cookie'
    ];

    const lowerCommand = command.toLowerCase();
    for (const pattern of dangerous) {
      if (lowerCommand.includes(pattern.toLowerCase())) {
        return 'Command contains dangerous patterns';
      }
    }

    return undefined;
  }

  /**
   * Parse and validate command
   *
   * @param command - Command string
   * @returns Validation result
   */
  validate(command: string): CommandValidationResult {
    // Guard: Validate command parameter
    if (!command || typeof command !== 'string') {
      return {
        isValid: false,
        error: 'Invalid command: must be a non-empty string',
      };
    }

    const trimmed = command.trim();

    if (!this.isValidCommand(trimmed)) {
      return {
        isValid: false,
        error: this.getValidationError(trimmed) || 'Invalid command',
      };
    }

    const parsed = this.parse(trimmed);

    return {
      isValid: parsed.isValid,
      command: parsed,
      error: parsed.error,
    };
  }

  /**
   * Check if command is a consent confirmation (Story 4.5)
   *
   * @param command - Command string to check
   * @returns Whether command is a consent confirmation
   */
  isConsentConfirmation(command: string): boolean {
    const trimmed = command.toLowerCase().trim();
    return this.CONSENT_CONFIRM_KEYWORDS.has(trimmed);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a new command parser
 *
 * @returns Command parser instance
 */
export function createCommandParser(): CommandParser {
  return new CommandParser();
}

/**
 * Parse a command string (convenience function)
 *
 * @param command - Command string
 * @returns Parsed command
 */
export function parseCommand(command: string): ParsedCommand {
  const parser = new CommandParser();
  return parser.parse(command);
}

/**
 * Validate a command string (convenience function)
 *
 * @param command - Command string
 * @returns Whether command is valid
 */
export function isValidCommand(command: string): boolean {
  const parser = new CommandParser();
  return parser.isValid(command);
}
