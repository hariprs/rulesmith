/**
 * Project Self-Improvement Command Variants Implementation
 * Story 1-7: Implement Command Variants
 *
 * TypeScript implementation with full type safety
 * Implements --stats, --history, and --rollback command variants
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseConversationMessages,
  identifySpeaker,
  validateConversationStructure,
  countMessageExchanges,
  loadAndValidateConversation,
  ConversationMessage,
  ConversationStats,
  ValidationResult,
  AR22Error,
  ErrorCode,
  // Story 2-7: Add conversation metrics counting
  countConversationMetrics,
  ConversationMetrics,
} from '../../../src/conversation-loader';

// Story 2-7: Import validation components
import {
  ConversationLengthValidator,
  ConversationValidationResult,
} from '../../../src/conversation-length-validator';
import { MessageTemplates } from '../../../src/message-templates';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface StateSchema {
  last_analysis: string;
  patterns_found: string[];
  improvements_applied: number;
  corrections_reduction: number;
  platform: string;
  _schema_note: string;
}

interface ResultEntry {
  timestamp: string;
  status: string;
  description: string;
}

interface CommandParseResult {
  action: 'stats' | 'history' | 'rollback' | 'both' | 'analyze';
  timestamp?: string;
}

interface ErrorDetails {
  what: string;
  how: string[];
  technical: string;
}

type Platform = 'claude-code' | 'cursor' | 'copilot';

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

// Calculate base path dynamically for portability
const ABSOLUTE_PATHS = {
  BASE: process.env.PROJECT_SELF_IMPROVEMENT_BASE ||
        path.resolve(process.cwd(), '.claude/skills/rulesmith'),
  STATE: process.env.PROJECT_SELF_IMPROVEMENT_STATE ||
         path.join(process.env.PROJECT_SELF_IMPROVEMENT_BASE || path.resolve(process.cwd(), '.claude/skills/rulesmith'), 'data/state.json'),
  RESULTS: process.env.PROJECT_SELF_IMPROVEMENT_RESULTS ||
          path.join(process.env.PROJECT_SELF_IMPROVEMENT_BASE || path.resolve(process.cwd(), '.claude/skills/rulesmith'), 'data/results.jsonl'),
  HISTORY_DIR: process.env.PROJECT_SELF_IMPROVEMENT_HISTORY ||
             path.join(process.env.PROJECT_SELF_IMPROVEMENT_BASE || path.resolve(process.cwd(), '.claude/skills/rulesmith'), 'data/history'),
} as const;

const STATE_SCHEMA_TYPES: Record<keyof StateSchema, string> = {
  last_analysis: 'string',
  patterns_found: 'array',
  improvements_applied: 'number',
  corrections_reduction: 'number',
  platform: 'string',
  _schema_note: 'string'
};

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

function formatErrorForPlatform(error: AR22Error, platform: Platform): string {
  const errorString = error.toString();

  switch (platform) {
    case 'cursor':
      return errorString
        .replace(/\*\*/g, '')
        .replace(/⚠️/g, 'WARNING:');
    case 'copilot':
      return errorString
        .replace(/\*\*/g, '')
        .replace(/⚠️/g, 'WARNING:');
    case 'claude-code':
    default:
      return errorString;
  }
}

function formatSuccessForPlatform(message: string, platform: Platform): string {
  switch (platform) {
    case 'cursor':
      return message.replace(/\*\*/g, '').replace(/📊/g, 'STATS:');
    case 'copilot':
      return message.replace(/\*\*/g, '').replace(/📊/g, 'STATS:');
    case 'claude-code':
    default:
      return message;
  }
}

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

function detectPlatform(): Platform {
  // Check for Claude Code environment
  if (process.env.CLAUDE_CODE === 'true') return 'claude-code';

  // Check for Cursor
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.cursorrules'))) {
    return 'cursor';
  }

  // Check for GitHub Copilot
  if (fs.existsSync(path.join(ABSOLUTE_PATHS.BASE, '../../.github/copilot-instructions.md'))) {
    return 'copilot';
  }

  // Default to Claude Code
  return 'claude-code';
}

function getRulesFilePath(platform: Platform): string {
  const projectRoot = path.join(ABSOLUTE_PATHS.BASE, '../..');

  switch (platform) {
    case 'cursor':
      return path.join(projectRoot, '.cursorrules');
    case 'copilot':
      return path.join(projectRoot, '.github/copilot-instructions.md');
    case 'claude-code':
    default:
      return path.join(projectRoot, '.claude/custom-instructions.md');
  }
}

// ============================================================================
// FILE I/O WITH RETRY LOGIC
// ============================================================================

async function readFileWithRetry(filePath: string, retries: number = 3, delay: number = 100): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try {
      // Check file permissions
      const stats = await fs.promises.stat(filePath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);

      // Check for overly permissive permissions
      if (mode === '666' || mode === '777') {
        throw new AR22Error('Insecure file permissions', {
          what: `File has overly permissive permissions (${mode})`,
          how: [
            `Run: chmod 0600 ${filePath}`,
            'Ensure file is readable/writeable by owner only'
          ],
          technical: `File: ${filePath}, Current: ${mode}, Required: 0600`
        });
      }

      if (mode !== '600' && mode !== '644') {
        console.warn(`Warning: File permissions are ${mode}, recommended 0600`);
      }

      // Read file
      const content = await fs.promises.readFile(filePath, 'utf8');
      return content;
    } catch (error: any) {
      if (error.code === 'EBUSY' || error.code === 'ELOCK') {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// ============================================================================
// COMMAND PARSING
// ============================================================================

function parseCommand(input: string): CommandParseResult {
  const flags = {
    stats: input.includes('--stats'),
    history: input.includes('--history'),
    rollback: input.includes('--rollback')
  };

  const timestampMatch = input.match(/--to\s+(\S+)/);
  const timestamp = timestampMatch ? timestampMatch[1] : undefined;

  // Validate flag combinations
  const flagCount = Object.values(flags).filter(v => v).length;

  if (flags.rollback) {
    if (!timestamp) {
      throw new AR22Error('Missing timestamp parameter', {
        what: '--rollback flag requires --to {timestamp} parameter',
        how: [
          'Use format: /improve-rules --rollback --to YYYY-MM-DDTHH:MM:SSZ',
          'Example: /improve-rules --rollback --to 2026-03-16T14:30:00Z'
        ],
        technical: 'Flag combination: --rollback without --to, Error: MISSING_PARAMETER'
      });
    }
    if (flagCount > 1) {
      throw new AR22Error('Invalid flag combination', {
        what: '--rollback cannot be combined with other flags',
        how: [
          'Use --rollback --to {timestamp} alone',
          'Run /improve-rules --stats or /improve-rules --history separately'
        ],
        technical: `Flags: ${Object.keys(flags).filter(k => flags[k as keyof typeof flags]).join(', ')}`
      });
    }
    return { action: 'rollback', timestamp };
  }

  if (timestamp && !flags.rollback) {
    throw new AR22Error('Invalid flag combination', {
      what: '--to parameter requires --rollback flag',
      how: [
        'Use format: /improve-rules --rollback --to {timestamp}',
        'Or remove --to parameter if not rolling back'
      ],
      technical: 'Flag combination: --to without --rollback, Error: INVALID_COMBINATION'
    });
  }

  if (flags.stats && flags.history) {
    return { action: 'both' };
  }

  if (flags.stats) return { action: 'stats' };
  if (flags.history) return { action: 'history' };

  return { action: 'analyze' };
}

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

function validateTimestamp(timestamp: string): boolean {
  // Check format: YYYY-MM-DDTHH:MM:SSZ
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
  if (!isoRegex.test(timestamp)) {
    throw new AR22Error('Invalid timestamp format', {
      what: `The provided timestamp "${timestamp}" does not match the required ISO 8601 UTC format`,
      how: [
        'Use format: YYYY-MM-DDTHH:MM:SSZ (example: 2026-03-16T14:30:00Z)',
        'Run /improve-rules --history to see available timestamps',
        'Copy timestamp from history output'
      ],
      technical: `Provided: "${timestamp}", Required: YYYY-MM-DDTHH:MM:SSZ, Regex: ^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$`
    });
  }

  // Prevent path traversal attacks
  if (timestamp.includes('..') || timestamp.includes('/') || timestamp.includes('\\') || timestamp.includes('\0')) {
    const detectedIssues: string[] = [];
    if (timestamp.includes('..')) detectedIssues.push('.. (path traversal)');
    if (timestamp.includes('/')) detectedIssues.push('/ (path separator)');
    if (timestamp.includes('\\')) detectedIssues.push('\\ (path separator)');
    if (timestamp.includes('\0')) detectedIssues.push('null byte');

    throw new AR22Error('Invalid timestamp characters detected', {
      what: 'Timestamp contains path traversal or invalid characters',
      how: [
        'Use only valid ISO 8601 UTC format: YYYY-MM-DDTHH:MM:SSZ',
        'Do not modify timestamps from history output'
      ],
      technical: `Detected issues: ${detectedIssues.join(', ')}`
    });
  }

  // Validate it's a real date
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new AR22Error('Invalid date value', {
      what: `Timestamp "${timestamp}" is not a valid date`,
      how: [
        'Check timestamp format: YYYY-MM-DDTHH:MM:SSZ',
        'Ensure date components are valid (month 01-12, day 01-31, etc.)'
      ],
      technical: `Date parsing failed for: "${timestamp}", Error: INVALID_DATE`
    });
  }

  // Validate timestamp is not in the future
  const now = new Date();
  if (date > now) {
    throw new AR22Error('Timestamp cannot be in the future', {
      what: `Timestamp "${timestamp}" is later than current time`,
      how: [
        'Use a timestamp from the past',
        'Run /improve-rules --history to see available timestamps'
      ],
      technical: `Provided: ${timestamp}, Current: ${now.toISOString()}`
    });
  }

  // Warn if timestamp is very old (>6 months)
  const sixMonthsAgo = new Date(now.getTime() - (6 * 30 * 24 * 60 * 60 * 1000));
  if (date < sixMonthsAgo) {
    console.warn(`Warning: Timestamp is more than 6 months old (${timestamp})`);
  }

  return true;
}

// ============================================================================
// STATE.JSON VALIDATION
// ============================================================================

function validateStateSchema(state: any): string[] {
  const errors: string[] = [];

  for (const [field, expectedType] of Object.entries(STATE_SCHEMA_TYPES)) {
    if (!(field in state)) {
      errors.push(`Missing field: ${field}`);
    } else {
      const actualType = Array.isArray(state[field]) ? 'array' : typeof state[field];
      if (actualType !== expectedType) {
        errors.push(`Field ${field}: expected ${expectedType}, got ${actualType}`);
      }
    }
  }

  return errors;
}

// ============================================================================
// MEMORY-EFFICIENT JSONL REVERSE READER
// ============================================================================

async function readLastNEntries(filePath: string, n: number = 10): Promise<ResultEntry[]> {
  const entries: ResultEntry[] = [];
  let skipped = 0;

  try {
    const fd = await fs.promises.open(filePath, 'r');
    const stats = await fd.stat();
    let position = stats.size;
    const buffer = Buffer.alloc(4096);
    let lineBuffer = '';

    while (position > 0 && entries.length < n) {
      const readSize = Math.min(buffer.length, position);
      position -= readSize;

      const { bytesRead } = await fd.read(buffer, 0, readSize, position);

      // Process buffer in reverse to find complete lines
      for (let i = bytesRead - 1; i >= 0; i--) {
        if (buffer[i] === 0x0A) { // Newline character
          const line = lineBuffer;
          lineBuffer = '';

          if (line.trim()) {
            try {
              const entry = JSON.parse(line) as ResultEntry;
              entries.unshift(entry);
            } catch (error) {
              skipped++;
              console.warn(`Skipping malformed JSONL line: ${(error as Error).message}`);
            }
          }
        } else {
          lineBuffer = String.fromCharCode(buffer[i]) + lineBuffer;
        }
      }
    }

    // Don't forget the last line
    if (lineBuffer.trim() && entries.length < n) {
      try {
        const entry = JSON.parse(lineBuffer) as ResultEntry;
        entries.unshift(entry);
      } catch (error) {
        skipped++;
        console.warn(`Skipping malformed JSONL line: ${(error as Error).message}`);
      }
    }

    await fd.close();

    if (skipped > 0) {
      console.warn(`⚠️ Warning: Skipped ${skipped} malformed entries`);
    }

    return entries;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new AR22Error('History file not found', {
        what: 'results.jsonl does not exist at expected location',
        how: [
          'Run /improve-rules to create initial history file',
          `Verify file exists at: ${ABSOLUTE_PATHS.RESULTS}`
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.RESULTS}, Error: FILE_NOT_FOUND`
      });
    }
    throw error;
  }
}

// ============================================================================
// STATS COMMAND IMPLEMENTATION
// ============================================================================

async function handleStatsCommand(platform: Platform): Promise<string> {
  try {
    const content = await readFileWithRetry(ABSOLUTE_PATHS.STATE);

    let state: StateSchema;
    try {
      state = JSON.parse(content) as StateSchema;
    } catch (error) {
      throw new AR22Error('State file is corrupted', {
        what: 'state.json contains invalid JSON',
        how: [
          'Check file syntax with: jq . ' + ABSOLUTE_PATHS.STATE,
          'Restore from backup if available',
          'Delete file and re-run /improve-rules'
        ],
        technical: `Parse error: ${(error as Error).message}, File: ${ABSOLUTE_PATHS.STATE}`
      });
    }

    // Validate schema
    const schemaErrors = validateStateSchema(state);
    if (schemaErrors.length > 0) {
      throw new AR22Error('State file schema validation failed', {
        what: 'state.json is missing required fields or has incorrect types',
        how: [
          'Restore from backup if available',
          'Delete file and re-run /improve-rules to recreate with correct schema'
        ],
        technical: `Validation errors:\n${schemaErrors.join('\n')}`
      });
    }

    // Check if state is empty (initial values)
    if (state.patterns_found.length === 0 && state.improvements_applied === 0 && state.corrections_reduction === 0) {
      return `📊 Project Self-Improvement Statistics

No analysis data available yet. Run /improve-rules to generate initial metrics.

**Platform:** ${state.platform}
**Status:** Ready for first analysis`;
    }

    // Format display
    let output = `📊 Project Self-Improvement Statistics

Patterns Found: ${state.patterns_found.length}
${state.patterns_found.length > 0 ? '─'.repeat(45) + '\n' + state.patterns_found.map(p => `• ${p}`).join('\n') : ''}

Improvements Applied: ${state.improvements_applied}
Corrections Reduction: ${state.corrections_reduction}%
Last Analysis: ${state.last_analysis || 'Never'}
Platform: ${state.platform}`;

    return output;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }

    const err = error as any;
    if (err.code === 'ENOENT') {
      throw new AR22Error('State file not found', {
        what: 'state.json does not exist at expected location',
        how: [
          'Run /improve-rules to create initial state file',
          `Verify file exists at: ${ABSOLUTE_PATHS.STATE}`,
          'Check file permissions (should be 0600)'
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.STATE}, Error: FILE_NOT_FOUND, System error: ${err.message}`
      });
    }

    if (err.code === 'EACCES') {
      throw new AR22Error('Insufficient file permissions', {
        what: 'Cannot read state.json due to incorrect permissions',
        how: [
          `Run: chmod 0600 ${ABSOLUTE_PATHS.STATE}`,
          'Ensure file is owned by current user'
        ],
        technical: `File: ${ABSOLUTE_PATHS.STATE}, Error: EACCES, Required permissions: 0600`
      });
    }

    throw new AR22Error('Failed to read state file', {
      what: 'An unexpected error occurred while reading state.json',
      how: [
        'Check file permissions and disk space',
        'Verify file is not corrupted',
        'Try re-running /improve-rules'
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}, File: ${ABSOLUTE_PATHS.STATE}`
    });
  }
}

// ============================================================================
// HISTORY COMMAND IMPLEMENTATION
// ============================================================================

async function handleHistoryCommand(platform: Platform): Promise<string> {
  try {
    const entries = await readLastNEntries(ABSOLUTE_PATHS.RESULTS, 10);

    if (entries.length === 0) {
      return `📋 Recent Improvements (Last 10)

No improvement history available yet. Run /improve-rules to create history.`;
    }

    // Format entries
    const formattedEntries = entries.map(entry => {
      const date = new Date(entry.timestamp);
      const formattedDate = date.toISOString().replace('T', ' ').replace('Z', '').substring(0, 19);

      return `${formattedDate} | ${entry.status || 'unknown'} | ${entry.description || 'No description'}`;
    });

    let output = `📋 Recent Improvements (Last ${entries.length})

${formattedEntries.join('\n')}`;

    return output;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }

    const err = error as any;
    if (err.code === 'EACCES') {
      throw new AR22Error('Insufficient file permissions', {
        what: 'Cannot read results.jsonl due to incorrect permissions',
        how: [
          `Run: chmod 0600 ${ABSOLUTE_PATHS.RESULTS}`,
          'Ensure file is owned by current user'
        ],
        technical: `File: ${ABSOLUTE_PATHS.RESULTS}, Error: EACCES, Required permissions: 0600`
      });
    }

    throw new AR22Error('Failed to read history file', {
      what: 'An unexpected error occurred while reading results.jsonl',
      how: [
        'Check file permissions and disk space',
        'Verify file is not corrupted',
        'Try re-running /improve-rules'
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}, File: ${ABSOLUTE_PATHS.RESULTS}`
    });
  }
}

// ============================================================================
// ROLLBACK COMMAND IMPLEMENTATION
// ============================================================================

async function handleRollbackCommand(timestamp: string, platform: Platform): Promise<string> {
  try {
    // Validate timestamp format and semantics
    validateTimestamp(timestamp);

    // Check if backup file exists
    const backupPath = path.join(ABSOLUTE_PATHS.HISTORY_DIR, `${timestamp}.md`);

    try {
      await fs.promises.access(backupPath, fs.constants.R_OK);
    } catch (error) {
      // List available timestamps
      let availableTimestamps: string[] = [];
      try {
        const files = await fs.promises.readdir(ABSOLUTE_PATHS.HISTORY_DIR);
        availableTimestamps = files
          .filter(f => f.endsWith('.md'))
          .map(f => f.replace('.md', ''))
          .sort()
          .reverse()
          .slice(0, 20);
      } catch (dirError) {
        // Directory doesn't exist or is inaccessible
      }

      if (availableTimestamps.length === 0) {
        throw new AR22Error('No backup files available', {
          what: 'history/ directory is empty or does not exist',
          how: [
            'Run /improve-rules to create initial backup',
            `Verify directory exists at: ${ABSOLUTE_PATHS.HISTORY_DIR}`
          ],
          technical: `Directory: ${ABSOLUTE_PATHS.HISTORY_DIR}, Count: 0 files`
        });
      }

      const timestampList = availableTimestamps.slice(0, 5).join('\n');
      throw new AR22Error('Backup file not found', {
        what: `No backup exists for timestamp "${timestamp}"`,
        how: [
          'Run /improve-rules --history to see available timestamps',
          'Use a timestamp from the list below',
          'Verify timestamp format: YYYY-MM-DDTHH:MM:SSZ'
        ],
        technical: `Requested: ${timestamp}, Available (newest 5):\n${timestampList}`
      });
    }

    // Get current timestamp for backup naming (ISO 8601 UTC format)
    const currentTimestamp = new Date().toISOString();
    const rulesFilePath = getRulesFilePath(platform);

    // Generate step-by-step guidance
    const guidance = `🔄 Manual Rollback Instructions

To restore from backup created at **${timestamp}**:

**Step 1: Verify backup exists**
✓ File found: \`data/history/${timestamp}.md\`

**Step 2: Read backup content**
\`\`\`bash
cat ${backupPath}
\`\`\`

**Step 3: Backup current rules (safety measure)**
\`\`\`bash
cp ${rulesFilePath} data/history/${currentTimestamp}.md
\`\`\`
This creates a backup of your current rules before restoration.

**Step 4: Restore from backup**
\`\`\`bash
cp ${backupPath} ${rulesFilePath}
\`\`\`

**Step 5: Verify restoration**
\`\`\`bash
/improve-rules --stats
\`\`\`

**Step 6: Test restoration**
• Review rules file content matches backup
• Run \`/improve-rules --stats\` to verify metrics
• Check that system recognizes restored rules

⚠️ **Important:** If restoration fails, restore from the backup created in Step 3:
\`\`\`bash
cp data/history/${currentTimestamp}.md ${rulesFilePath}
\`\`\`

**Backup file details:**
- Path: \`${backupPath}\`
- Timestamp: \`${timestamp}\`
- Platform: \`${platform}\`
- Rules file: \`${rulesFilePath}\``;

    return guidance;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }

    const err = error as any;
    throw new AR22Error('Rollback preparation failed', {
      what: 'An unexpected error occurred while preparing rollback guidance',
      how: [
        'Verify history/ directory exists and is accessible',
        'Check timestamp format is correct',
        'Run /improve-rules --history to see available backups'
      ],
      technical: `Error: ${err.code || 'UNKNOWN'}, Message: ${err.message}, Timestamp: ${timestamp}`
    });
  }
}

// ============================================================================
// MAIN COMMAND HANDLER
// ============================================================================

async function handleCommand(input: string): Promise<string> {
  // Detect platform (needed for both success and error cases)
  const platform = detectPlatform();

  try {
    // Parse command
    const { action, timestamp } = parseCommand(input);

    // Route to appropriate handler
    let result: string;
    switch (action) {
      case 'stats':
        result = await handleStatsCommand(platform);
        break;
      case 'history':
        result = await handleHistoryCommand(platform);
        break;
      case 'rollback':
        if (!timestamp) {
          throw new AR22Error('Missing timestamp', {
            what: 'Rollback command requires a timestamp',
            how: [
              'Use format: /improve-rules --rollback --to YYYY-MM-DDTHH:MM:SSZ',
              'Run /improve-rules --history to see available timestamps'
            ],
            technical: 'Action: rollback, Timestamp: undefined'
          });
        }
        result = await handleRollbackCommand(timestamp, platform);
        break;
      case 'both':
        const statsResult = await handleStatsCommand(platform);
        const historyResult = await handleHistoryCommand(platform);
        result = `${statsResult}\n\n${'='.repeat(60)}\n\n${historyResult}`;
        break;
      default:
        throw new AR22Error('Unknown action', {
          what: 'Command parsing resulted in unrecognized action',
          how: [
            'Use /improve-rules --stats for statistics',
            'Use /improve-rules --history for improvement history',
            'Use /improve-rules --rollback --to {timestamp} for rollback guidance'
          ],
          technical: `Action: ${action}, Input: ${input}`
        });
    }

    // Format for platform
    return formatSuccessForPlatform(result, platform);
  } catch (error) {
    // Format error for platform
    return formatErrorForPlatform(error as AR22Error, platform);
  }
}

// ============================================================================
// CONVERSATION LOADING (Story 2-1)
// ============================================================================

/**
 * Loads conversation from current chat context using the imported implementation
 * Note: In current implementation, this requires mock data or test interface
 *
 * This is a wrapper that re-exports the conversation loading functionality
 * from the main conversation-loader module for use in the commands system.
 */

/**
 * Handles the /improve-rules analyze command (Story 2-1, 2-2)
 */
async function handleAnalyzeCommand(): Promise<string> {
  try {
    // Guard: Validate dynamic imports with error handling
    let parseConversationMessages: any, validateConversationStructure: any, countMessageExchanges: any, CorrectionClassifier: any;

    try {
      // Import conversation loading functions (Story 2-1)
      const loaderModule = await import('../../../src/conversation-loader');
      parseConversationMessages = loaderModule.parseConversationMessages;
      validateConversationStructure = loaderModule.validateConversationStructure;
      countMessageExchanges = loaderModule.countMessageExchanges;

      // Import correction classifier (Story 2-2)
      const classifierModule = await import('../../../src/correction-classifier');
      CorrectionClassifier = classifierModule.CorrectionClassifier;

      // Guard: Validate imported functions exist
      if (typeof parseConversationMessages !== 'function' ||
          typeof validateConversationStructure !== 'function' ||
          typeof countMessageExchanges !== 'function' ||
          typeof CorrectionClassifier !== 'function') {
        throw new Error('Required module exports are missing or invalid');
      }
    } catch (importError) {
      return `**Error:** Failed to load required modules.

**What happened:** Could not import conversation analysis modules.

**Technical details:** ${importError instanceof Error ? importError.message : String(importError)}

**How to fix:**
1. Ensure src/conversation-loader.ts exists and exports required functions
2. Ensure src/correction-classifier.ts exists and exports CorrectionClassifier
3. Check TypeScript compilation output`;
    }

    // Since loadConversationFromContext always throws (returns Promise<never>),
    // we need to catch the error and provide appropriate guidance
    try {
      // Note: This will throw because conversation context is not yet accessible
      // In the future, this will load the actual conversation from the chat context
      throw new Error('Conversation context access is not yet implemented');

    } catch (error) {
      // This is expected - conversation context is not yet accessible
      if (error instanceof AR22Error) {
        return error.toString();
      }

      // For demonstration purposes, show what would happen with sample data
      const sampleConversation = `
User: I need help with TypeScript strict mode
Assistant: Enable strict mode in tsconfig.json
User: yes
Assistant: Also enable noImplicitAny
User: no, that's too strict
Assistant: What about using eslint with TypeScript rules?
User: maybe later
      `;

      // Guard: Validate conversation parsing
      let messages: any[];
      try {
        messages = parseConversationMessages(sampleConversation);

        // Guard: Validate messages array
        if (!Array.isArray(messages)) {
          throw new Error('parseConversationMessages did not return an array');
        }
      } catch (parseError) {
        return `**Error:** Failed to parse conversation.

**What happened:** Conversation parsing failed.

**Technical details:** ${parseError instanceof Error ? parseError.message : String(parseError)}

**How to fix:**
1. Ensure conversation format is correct
2. Check conversation-loader module implementation`;
      }

      // Validate structure (Story 2-1)
      let validation: any;
      try {
        validation = validateConversationStructure(messages);

        // Guard: Validate validation result
        if (!validation || typeof validation !== 'object') {
          throw new Error('validateConversationStructure did not return a valid result');
        }
      } catch (validationError) {
        return `**Error:** Failed to validate conversation structure.

**What happened:** Structure validation failed.

**Technical details:** ${validationError instanceof Error ? validationError.message : String(validationError)}`;
      }

      // Story 2-7: Validate conversation length BEFORE analysis pipeline
      // This is the critical architectural requirement - validation at command layer, NOT in pipeline
      let conversationMetrics: ConversationMetrics;
      try {
        conversationMetrics = countConversationMetrics(messages);

        // Guard: Validate metrics result structure
        if (!conversationMetrics || typeof conversationMetrics !== 'object') {
          throw new Error('countConversationMetrics did not return a valid result');
        }

        // Guard: Validate required properties exist
        if (typeof conversationMetrics.ai_suggestions_count !== 'number' ||
            typeof conversationMetrics.message_exchanges_count !== 'number') {
          throw new Error('countConversationMetrics returned invalid metrics structure');
        }

        // Guard: Validate counts are non-negative
        if (conversationMetrics.ai_suggestions_count < 0 ||
            conversationMetrics.message_exchanges_count < 0) {
          throw new Error('countConversationMetrics returned negative counts');
        }
      } catch (metricsError) {
        return `**Error:** Failed to count conversation metrics.

**What happened:** Metrics counting failed.

**Technical details:** ${metricsError instanceof Error ? metricsError.message : String(metricsError)}`;
      }

      // Story 2-7: Validate conversation length against thresholds
      // BOTH thresholds must pass (>= 5 suggestions AND >= 10 exchanges)
      const validator = new ConversationLengthValidator();
      const validationResult: ConversationValidationResult = validator.validateMetrics(conversationMetrics);

      // Story 2-7: Early exit if validation fails (command layer, NOT pipeline)
      if (!validationResult.canProceed) {
        const templates = new MessageTemplates();
        const message = templates.fromValidationResult(validationResult);
        return message;
      }

      // Count exchanges (Story 2-1)
      let stats: any;
      try {
        stats = countMessageExchanges(messages);

        // Guard: Validate stats result
        if (!stats || typeof stats !== 'object') {
          throw new Error('countMessageExchanges did not return a valid result');
        }
      } catch (statsError) {
        return `**Error:** Failed to count message exchanges.

**What happened:** Exchange counting failed.

**Technical details:** ${statsError instanceof Error ? statsError.message : String(statsError)}`;
      }

      // Classify corrections (Story 2-2)
      let result: any;
      try {
        const classifier = new CorrectionClassifier();
        result = classifier.classifyConversation(messages);

        // Guard: Validate classification result
        if (!result || typeof result !== 'object') {
          throw new Error('classifyConversation did not return a valid result');
        }
      } catch (classificationError) {
        return `**Error:** Failed to classify conversation.

**What happened:** Classification failed.

**Technical details:** ${classificationError instanceof Error ? classificationError.message : String(classificationError)}`;
      }

      // Guard: Sanitize output values to prevent injection
      const sanitizeNumber = (value: any, defaultValue: number = 0): number => {
        if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
          return Math.max(0, value);
        }
        return defaultValue;
      };

      const sanitizeString = (value: any, maxLength: number = 100): string => {
        if (typeof value !== 'string') return String(value ?? '');
        return value.substring(0, maxLength).replace(/[\x00-\x1F\x7F]/g, '');
      };

      // Guard: Safely truncate strings
      const safeSubstring = (str: string, maxLen: number): string => {
        if (typeof str !== 'string') return '';
        if (str.length <= maxLen) return str;
        return str.substring(0, maxLen) + '...';
      };

      // Format output
      let output = `📊 Conversation Analysis (Sample Data)

**Conversation Structure:**
- Valid: ${validation.valid ? '✓' : '✗'}
- Total Messages: ${sanitizeNumber(messages.length)}
- Exchanges: ${sanitizeNumber(stats?.totalExchanges)}
- AI Suggestions: ${sanitizeNumber(stats?.aiSuggestions)}

**Classification Results (Story 2-2):**
- Total Exchanges: ${sanitizeNumber(result?.total_exchanges)}
- Corrections Found: ${sanitizeNumber(result?.corrections_found)}
- Acceptances Found: ${sanitizeNumber(result?.acceptances_found)}
- Ambiguous Cases: ${sanitizeNumber(result?.ambiguous_cases)}

**Confidence Breakdown:**
- High Confidence (≥0.8): ${sanitizeNumber(result?.classification_summary?.high_confidence)}
- Medium Confidence (0.6-0.8): ${sanitizeNumber(result?.classification_summary?.medium_confidence)}
- Low Confidence (<0.6): ${sanitizeNumber(result?.classification_summary?.low_confidence)}`;

      // Guard: Validate and limit corrections array
      const corrections = result?.classified_corrections;
      if (Array.isArray(corrections) && corrections.length > 0) {
        const maxCorrections = 50; // Limit output to prevent flooding
        const displayCorrections = corrections.slice(0, maxCorrections);

        output += `\n\n**Corrections Detected:**`;
        displayCorrections.forEach((correction: any, i: number) => {
          // Guard: Validate correction object
          if (!correction || typeof correction !== 'object') return;

          const originalSuggestion = sanitizeString(correction.original_suggestion, 50);
          const userCorrection = sanitizeString(correction.user_correction, 50);
          const type = sanitizeString(correction.classification?.type, 20);
          const confidence = sanitizeNumber(correction.classification?.confidence, 0);
          const requiresReview = Boolean(correction.classification?.requires_manual_review);

          output += `\n${i + 1}. Assistant: "${safeSubstring(originalSuggestion, 50)}"`;
          output += `\n   User: "${safeSubstring(userCorrection, 50)}"`;
          output += `\n   Type: ${type}`;
          output += `\n   Confidence: ${confidence.toFixed(2)}`;
          if (requiresReview) {
            output += ` ⚠️ (requires manual review)`;
          }
        });

        if (corrections.length > maxCorrections) {
          output += `\n\n... and ${corrections.length - maxCorrections} more corrections`;
        }
      }

      output += `\n\n**Note:** This is sample data demonstrating the classification system.
When conversation context access is implemented, this will analyze your actual conversation.`;

      // Guard: Limit output length
      const MAX_OUTPUT_LENGTH = 50000; // 50KB max output
      if (output.length > MAX_OUTPUT_LENGTH) {
        output = output.substring(0, MAX_OUTPUT_LENGTH) + '\n\n... (output truncated due to length)';
      }

      return output;
    }

  } catch (error) {
    if (error instanceof AR22Error) {
      return error.toString();
    }

    throw new AR22Error('Analysis failed', {
      what: 'An unexpected error occurred during conversation analysis',
      how: [
        'Check that conversation context is accessible',
        'Verify conversation format is supported',
        'Try running the command again'
      ],
      technical: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
}

export type {
  StateSchema,
  ResultEntry,
  CommandParseResult,
  ErrorDetails,
  Platform,
  // Conversation loading types (Story 2-1)
  ConversationMessage,
  ConversationStats,
  ValidationResult
};
