/**
 * Conversation Loader Implementation (Story 2-1)
 *
 * Loads and parses conversation history from chat context
 * following the test architecture principle: unit > integration > E2E
 *
 * This module provides the production implementation that validates conversation
 * structure and extracts messages for pattern analysis.
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ConversationMessage {
  speaker: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ConversationStats {
  totalExchanges: number;
  aiSuggestions: number;
  userCorrections: number;
  conversationLoaded: boolean;
}

export interface ValidationResult {
  valid: boolean;
  meetsThreshold: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConversationLoadError {
  type: string;
  message: string;
  what: string;
  how: string[];
  technical: string;
}

export type Platform = 'claude-code' | 'cursor' | 'copilot';

// ============================================================================
// STORY 2-7: CONVERSATION METRICS INTERFACE
// ============================================================================

/**
 * Conversation metrics counted from conversation data (Story 2-7)
 * Used for validation before pattern analysis
 */
export interface ConversationMetrics {
  /** Number of AI suggestions (user corrections to AI responses) */
  ai_suggestions_count: number;
  /** Number of message exchanges (user-AI pairs) */
  message_exchanges_count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Calculate base path dynamically for portability
const ABSOLUTE_PATHS = {
  BASE: process.env.PROJECT_SELF_IMPROVEMENT_BASE ||
        path.resolve(process.cwd(), '.claude/skills/rulesmith'),
} as const;

const THRESHOLDS = {
  MIN_AI_SUGGESTIONS: 5,
  MIN_MESSAGE_EXCHANGES: 10,
} as const;

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

export enum ErrorCode {
  INVALID_CONTEXT = 'INVALID_CONTEXT',
  CONVERSATION_ACCESS_ERROR = 'CONVERSATION_ACCESS_ERROR',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  INVALID_INPUT_TYPE = 'INVALID_INPUT_TYPE',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
}

export class AR22Error extends Error {
  public readonly what: string;
  public readonly how: string[];
  public readonly technical: string;
  public readonly code?: ErrorCode;
  public readonly originalError?: Error;

  constructor(
    brief: string,
    details: { what: string; how: string[]; technical: string },
    code?: ErrorCode,
    originalError?: Error
  ) {
    super(brief);
    this.what = details.what;
    this.how = details.how;
    this.technical = details.technical;
    this.code = code;
    this.originalError = originalError;
    this.name = 'AR22Error';

    // Capture current stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AR22Error);
    }
  }

  toString(): string {
    const codeStr = this.code ? ` (Code: ${this.code})` : '';
    return `⚠️ Error${codeStr}: ${this.message}\n\n**What happened:** ${this.what}\n\n**How to fix:**\n${this.how.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n**Technical details:** ${this.technical}`;
  }
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

export function detectPlatform(): Platform {
  if (process.env.CLAUDE_CODE === 'true') return 'claude-code';
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.cursorrules'))) return 'cursor';
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.github/copilot-instructions.md'))) return 'copilot';
  return 'claude-code';
}

// ============================================================================
// CONVERSATION LOADING
// ============================================================================

/**
 * Loads conversation from current chat context
 * In a real implementation, this would access the actual chat context
 * For now, it provides a framework for context extraction
 * @throws {AR22Error} Always - conversation context access not yet implemented
 * @returns Promise that never resolves (always throws AR22Error)
 */
export async function loadConversationFromContext(): Promise<never> {
  const platform = detectPlatform();

  // In a real implementation, this would access the actual chat context
  // For now, we throw an error with appropriate guidance
  throw new AR22Error(
    'Conversation context not accessible',
    {
      what: 'Cannot access conversation history from current environment',
      how: [
        'Ensure you are running this skill in a supported environment (Claude Code, Cursor, or GitHub Copilot)',
        'Verify that conversation history is available in the current session',
        'If testing, provide mock conversation data through the test interface'
      ],
      technical: `Platform: ${platform}, Context access: not implemented, Error: ENVIRONMENT_LIMITATION`
    },
    ErrorCode.CONVERSATION_ACCESS_ERROR
  );
}

/**
 * Parses raw conversation context into structured messages
 * @param rawContext - Raw conversation string to parse
 * @returns Array of structured conversation messages (empty array for invalid input)
 *
 * Supports multiple platforms with different message formats:
 * - Plain text: "User: message" or "Assistant: message"
 * - Markdown headers: "### User: message"
 * - Bold markdown: "**User:** message"
 * - Handles multiline messages and code blocks
 *
 * NOTE: As of Story 2-7, this function uses defensive programming and returns
 * an empty array for invalid input (null, undefined, non-string, empty string)
 * instead of throwing an error. This allows graceful degradation in the
 * command layer without crashing the entire pipeline.
 */
export function parseConversationMessages(rawContext: string): ConversationMessage[] {
  // Handle empty or invalid context gracefully - return empty array
  if (!rawContext || typeof rawContext !== 'string') {
    return [];
  }

  // Handle empty string after trimming
  const trimmed = rawContext.trim();
  if (!trimmed) {
    return [];
  }

  const messages: ConversationMessage[] = [];
  const lines = trimmed.split('\n');
  let currentMessage: Partial<ConversationMessage> | null = null;
  let currentContent: string[] = [];

  // Guard: Track code blocks to avoid false speaker label matches
  let inCodeBlock = false;
  let codeBlockDelimiter = '';

  // Speaker patterns for different platforms
  const speakerPatterns = [
    /^(User|Assistant|AI|Human):\s*/i,  // Common pattern
    /^#{1,3}\s*(User|Assistant|AI|Human):\s*/i,  // Markdown headers
    /^\*\*(User|Assistant|AI|Human):\*\*\s*/i,  // Bold markdown
    /^(user|assistant):\s*/i,  // Lowercase with colon
  ];

  for (let line of lines) {
    const trimmedLine = line.trim();

    // Guard: Track code block boundaries
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockDelimiter = trimmedLine;
      } else {
        // Exit code block on any closing ``` (not just matching delimiter)
        inCodeBlock = false;
        codeBlockDelimiter = '';
      }
      // Always add code block delimiters to content
      if (currentMessage) {
        currentContent.push(trimmedLine);
      }
      continue;
    }

    // Guard: Skip speaker detection inside code blocks
    if (inCodeBlock) {
      if (currentMessage) {
        currentContent.push(trimmedLine);
      }
      continue;
    }

    if (!trimmedLine) continue;

    // Check if this line starts a new message
    let speakerMatch: 'user' | 'assistant' | null = null;
    let remainingContent = trimmedLine;

    // Pre-compile regex patterns for efficiency (done once at function scope)
    for (const pattern of speakerPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        const speakerLabel = match[1].toLowerCase();
        speakerMatch = (speakerLabel === 'user' || speakerLabel === 'human') ? 'user' : 'assistant';
        remainingContent = trimmedLine.replace(pattern, '').trim();
        break;
      }
    }

    if (speakerMatch) {
      // Save previous message if exists and has content
      if (currentMessage && currentMessage.speaker && currentContent.length > 0) {
        messages.push({
          speaker: currentMessage.speaker,
          content: currentContent.join('\n'),
          timestamp: currentMessage.timestamp
        });
      }

      // Guard: Only start new message if there's actual content
      currentMessage = { speaker: speakerMatch };
      currentContent = remainingContent ? [remainingContent] : [];
    } else if (currentMessage) {
      // Continue current message
      currentContent.push(trimmedLine);
    }
  }

  // Don't forget the last message
  if (currentMessage && currentMessage.speaker && currentContent.length > 0) {
    messages.push({
      speaker: currentMessage.speaker,
      content: currentContent.join('\n'),
      timestamp: currentMessage.timestamp
    });
  }

  return messages;
}

/**
 * Identifies the speaker (user or assistant) from a message line
 * @param messageLine - The message line to analyze
 * @returns 'user', 'assistant', or null if speaker cannot be determined
 */
export function identifySpeaker(messageLine: string): 'user' | 'assistant' | null {
  // Validate input type before string operations
  if (typeof messageLine !== 'string') {
    return null;
  }

  const lowerLine = messageLine.toLowerCase().trim();

  // User speaker patterns
  const userPatterns = [
    /^(user|human|you|me):\s*/i,
    /^#{1,3}\s*(user|human):\s*/i,
    /^\*\*(user|human):\*\*\s*/i,
  ];

  // Assistant speaker patterns
  const assistantPatterns = [
    /^(assistant|ai|claude|gpt|model):\s*/i,
    /^#{1,3}\s*(assistant|ai|claude):\s*/i,
    /^\*\*(assistant|ai|claude):\*\*\s*/i,
  ];

  for (const pattern of userPatterns) {
    if (pattern.test(lowerLine)) {
      return 'user';
    }
  }

  for (const pattern of assistantPatterns) {
    if (pattern.test(lowerLine)) {
      return 'assistant';
    }
  }

  return null;
}

/**
 * Validates conversation structure and checks if it meets minimum threshold
 * @param messages - Array of conversation messages to validate
 * @returns ValidationResult with valid flag, threshold check, errors, and warnings
 *
 * Validation checks:
 * - Messages array is not null/undefined
 * - Messages array is actually an array
 * - Conversation is not empty
 * - Each message has valid speaker ('user' or 'assistant')
 * - Each message has valid content (non-empty string)
 * - No circular references in message structure
 * - Optionally checks threshold requirements (moved to Story 2-7)
 */
export function validateConversationStructure(messages: ConversationMessage[]): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    meetsThreshold: false,
    errors: [],
    warnings: []
  };

  // Guard: Null or undefined input
  if (messages === null || messages === undefined) {
    result.valid = false;
    result.errors.push('Conversation messages cannot be null or undefined');
    return result;
  }

  // Guard: Not an array
  if (!Array.isArray(messages)) {
    result.valid = false;
    result.errors.push(`Conversation messages must be an array, received: ${typeof messages}`);
    return result;
  }

  // Guard: Empty conversation
  if (messages.length === 0) {
    result.valid = false;
    result.errors.push('Conversation contains no messages');
    return result;
  }

  // Guard: Circular reference detection
  const seen = new WeakSet<object>();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Guard: Check for circular references
    if (typeof msg === 'object' && msg !== null) {
      if (seen.has(msg)) {
        result.valid = false;
        result.errors.push(`Message at index ${i} contains circular reference`);
        continue;
      }
      seen.add(msg);
    }

    if (!msg || typeof msg !== 'object') {
      result.valid = false;
      result.errors.push(`Message at index ${i} is not an object`);
      continue;
    }

    if (!msg.speaker || !['user', 'assistant'].includes(msg.speaker)) {
      result.valid = false;
      result.errors.push(`Message at index ${i} has invalid speaker: ${msg.speaker}`);
    }

    if (!msg.content || typeof msg.content !== 'string') {
      result.valid = false;
      result.errors.push(`Message at index ${i} has invalid content: ${typeof msg.content}`);
    }

    if (msg.content && msg.content.length > 50000) {
      result.warnings.push(`Message at index ${i} is unusually long (${msg.content.length} characters). This may indicate parsing issues or data corruption.`);
    }
  }

  if (!result.valid) {
    return result;
  }

  // Count message exchanges
  const stats = countMessageExchanges(messages);

  // Check threshold
  result.meetsThreshold =
    stats.aiSuggestions >= THRESHOLDS.MIN_AI_SUGGESTIONS ||
    stats.totalExchanges >= THRESHOLDS.MIN_MESSAGE_EXCHANGES;

  if (!result.meetsThreshold) {
    result.warnings.push(
      `Conversation does not meet minimum threshold. ` +
      `Requires ${THRESHOLDS.MIN_AI_SUGGESTIONS} AI suggestions OR ${THRESHOLDS.MIN_MESSAGE_EXCHANGES} exchanges. ` +
      `Found: ${stats.aiSuggestions} AI suggestions, ${stats.totalExchanges} exchanges`
    );
  }

  return result;
}

/**
 * Counts message exchanges and AI suggestions
 * @param messages - Array of conversation messages to analyze
 * @returns ConversationStats with totals and counts
 *
 * Counts:
 * - Total message exchanges (user -> assistant pairs)
 * - AI suggestions (assistant messages)
 * - User corrections (placeholder for Story 2-2)
 * - Whether conversation was successfully loaded
 *
 * Note: Validates timestamp format if provided (ISO 8601 UTC)
 */
export function countMessageExchanges(messages: ConversationMessage[]): ConversationStats {
  const stats: ConversationStats = {
    totalExchanges: 0,
    aiSuggestions: 0,
    userCorrections: 0,
    conversationLoaded: false
  };

  if (!messages || messages.length === 0) {
    return stats;
  }

  // Count AI suggestions (assistant messages)
  stats.aiSuggestions = messages.filter(m => m.speaker === 'assistant').length;

  // Count user corrections (to be implemented in Story 2-2)
  stats.userCorrections = 0; // Placeholder

  // Count message exchanges (alternating user/assistant pairs)
  let exchanges = 0;
  let lastSpeaker: 'user' | 'assistant' | null = null;

  for (const msg of messages) {
    if (msg.speaker === 'assistant' && lastSpeaker === 'user') {
      exchanges++;
    }
    lastSpeaker = msg.speaker;

    // Guard: Validate timestamp format if provided
    if (msg.timestamp && typeof msg.timestamp === 'string') {
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      if (!isoRegex.test(msg.timestamp)) {
        // Log warning but continue processing - timestamps are optional
        // Using console.warn as this is a data quality issue, not a critical error
        console.warn(`Warning: Invalid timestamp format at message: ${msg.timestamp}`);
      }
    }
  }

  stats.totalExchanges = exchanges;
  stats.conversationLoaded = true;

  return stats;
}

// ============================================================================
// STORY 2-7: CONVERSATION METRICS COUNTING
// ============================================================================

/**
 * Safely check if content contains any correction indicator
 *
 * This helper function creates fresh RegExp objects for each check to avoid
 * the RegExp.lastIndex state issue that can cause incorrect results when
 * using test() in a loop.
 *
 * @param content - The text content to check (should be lowercase)
 * @returns True if any correction indicator pattern matches
 */
function containsCorrectionIndicator(content: string): boolean {
  if (!content || typeof content !== 'string') {
    return false;
  }

  // Check each pattern with a fresh RegExp object to avoid state issues
  const patterns = [
    /\bactually\b/i,
    /\bwait\b/i,
    /\bno, i meant\b/i,
    /\binstead\b/i,
    /\brather\b/i,
    /\bnot.*that\b/i,
    /\bchange\b.*\bto\b/i,
    /\bmodify\b/i,
    /\breplace\b/i,
  ];

  return patterns.some(pattern => {
    try {
      // Create fresh RegExp for each test to avoid lastIndex issues
      const freshPattern = new RegExp(pattern.source, pattern.flags);
      return freshPattern.test(content);
    } catch (e) {
      // If regex fails, treat as no match (defensive programming)
      return false;
    }
  });
}

/**
 * Count conversation metrics for validation (Story 2-7)
 *
 * Counts:
 * - AI suggestions: User messages that contain corrections to AI suggestions
 * - Message exchanges: Total user-AI pairs (each user message with AI response = 1 exchange)
 *
 * @param messages - Array of conversation messages to analyze
 * @returns ConversationMetrics with counts for validation
 *
 * @example
 * ```typescript
 * const metrics = countConversationMetrics(messages);
 * if (metrics.ai_suggestions_count < 5) {
 *   console.log('Too few AI suggestions');
 * }
 * ```
 */
export function countConversationMetrics(messages: ConversationMessage[]): ConversationMetrics {
  const metrics: ConversationMetrics = {
    ai_suggestions_count: 0,
    message_exchanges_count: 0,
  };

  // Guard: Handle empty or invalid input
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return metrics;
  }

  // Count message exchanges (user-AI pairs)
  let exchanges = 0;
  for (let i = 0; i < messages.length - 1; i++) {
    const current = messages[i];
    const next = messages[i + 1];

    // Guard: Validate current and next messages exist and have speaker property
    if (!current || !next || typeof current.speaker !== 'string' || typeof next.speaker !== 'string') {
      continue;
    }

    // Count user message followed by AI response as 1 exchange
    if (current.speaker === 'user' && next.speaker === 'assistant') {
      exchanges++;
    }
  }

  metrics.message_exchanges_count = exchanges;

  // Count AI suggestions (user messages with corrections)
  // An AI suggestion is identified when a user message contains correction indicators
  // suggesting they are correcting/modifying a previous AI response
  let aiSuggestions = 0;
  for (let i = 0; i < messages.length; i++) {
    const current = messages[i];

    // Guard: Validate current message exists and has required properties
    if (!current || typeof current.speaker !== 'string' || typeof current.content !== 'string') {
      continue;
    }

    // Only count user messages
    if (current.speaker !== 'user') {
      continue;
    }

    // Guard: Validate previous message exists and has speaker property
    if (i > 0) {
      const previous = messages[i - 1];
      if (!previous || typeof previous.speaker !== 'string') {
        continue;
      }

      // Check if previous message was from assistant (suggesting a response to AI)
      if (previous.speaker === 'assistant') {
        const content = current.content.toLowerCase();

        // Check for correction indicators using helper function
        // Helper creates fresh RegExp objects to avoid state issues
        const hasCorrection = containsCorrectionIndicator(content);

        if (hasCorrection) {
          aiSuggestions++;
        }
      }
    }
  }

  metrics.ai_suggestions_count = aiSuggestions;

  return metrics;
}

/**
 * Loads and validates conversation in one step
 * Convenience function that combines loading, parsing, and validation
 * @throws {AR22Error} If conversation loading or validation fails
 * @returns Promise containing messages, validation result, and statistics
 */
export async function loadAndValidateConversation(): Promise<{
  messages: ConversationMessage[];
  validation: ValidationResult;
  stats: ConversationStats;
}> {
  try {
    // Load conversation from context
    const messages = await loadConversationFromContext();

    // Validate structure
    const validation = validateConversationStructure(messages);

    // Count statistics
    const stats = countMessageExchanges(messages);

    return { messages, validation, stats };
  } catch (error) {
    // Re-throw AR22Error as-is to preserve error details
    if (error instanceof AR22Error) {
      throw error;
    }

    // Wrap other errors but preserve original stack trace
    const originalError = error instanceof Error ? error : new Error(String(error));
    throw new AR22Error(
      'Failed to load and validate conversation',
      {
        what: 'An unexpected error occurred while processing conversation history',
        how: [
          'Ensure conversation context is accessible',
          'Check that conversation format is supported',
          'Verify platform is correctly detected',
          'Try running the command again'
        ],
        technical: `Error: ${originalError.message}`
      },
      ErrorCode.CONVERSATION_ACCESS_ERROR,
      originalError
    );
  }
}
