/**
 * RuleSmith Command Variants Implementation
 * Story 1-7: Implement Command Variants
 *
 * Implements --stats, --history, and --rollback command variants with:
 * - Command parsing and validation
 * - AR22-compliant error handling
 * - Memory-efficient JSONL parsing
 * - Platform-specific formatting
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONSTANTS AND CONFIGURATION
// ============================================================================

// Get the base directory dynamically
const BASE_DIR = path.dirname(__filename);

const ABSOLUTE_PATHS = {
  BASE: BASE_DIR,
  STATE: path.join(BASE_DIR, 'data', 'state.json'),
  RESULTS: path.join(BASE_DIR, 'data', 'results.jsonl'),
  HISTORY_DIR: path.join(BASE_DIR, 'data', 'history'),
};

const STATE_SCHEMA = {
  last_analysis: 'string',
  patterns_found: 'array',
  improvements_applied: 'number',
  corrections_reduction: 'number',
  platform: 'string',
  _schema_note: 'string'
};

const PLATFORM_RULES_FILES = {
  'cursor': '.cursorrules',
  'copilot': '.github/copilot-instructions.md',
  'claude-code': '.claude/custom-instructions.md'
};

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

class AR22Error extends Error {
  constructor(brief, { what, how, technical }) {
    super(brief);
    this.what = what;
    this.how = how;
    this.technical = technical;
  }

  toString() {
    return `⚠️ Error: ${this.message}\n\n**What happened:** ${this.what}\n\n**How to fix:**\n${this.how.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\n**Technical details:** ${this.technical}`;
  }
}

function formatErrorForPlatform(error, platform) {
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

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

function detectPlatform() {
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

function getRulesFilePath(platform) {
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

async function readFileWithRetry(filePath, retries = 3, delay = 100) {
  for (let i = 0; i < retries; i++) {
    try {
      // Check file permissions
      const stats = await fs.promises.stat(filePath);
      const mode = (stats.mode & parseInt('777', 8)).toString(8);

      if (mode !== '600' && mode !== '644') {
        console.warn(`Warning: File permissions are ${mode}, recommended 0600`);
      }

      // Read file
      const content = await fs.promises.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      if (error.code === 'EBUSY' || error.code === 'ELOCK') {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
          continue;
        }
      }
      throw error;
    }
  }
}

// ============================================================================
// COMMAND PARSING
// ============================================================================

function parseCommand(input) {
  const flags = {
    stats: input.includes('--stats'),
    history: input.includes('--history'),
    rollback: input.includes('--rollback')
  };

  const timestampMatch = input.match(/--to\s+(\S+)/);
  const timestamp = timestampMatch ? timestampMatch[1] : null;

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
        technical: `Flags: ${Object.keys(flags).filter(k => flags[k]).join(', ')}`
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

function validateTimestamp(timestamp) {
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
    throw new AR22Error('Invalid timestamp characters detected', {
      what: 'Timestamp contains path traversal or invalid characters',
      how: [
        'Use only valid ISO 8601 UTC format: YYYY-MM-DDTHH:MM:SSZ',
        'Do not modify timestamps from history output'
      ],
      technical: `Detected characters: ${timestamp.split('').filter(c => ['..', '/', '\\', '\0'].includes(c)).join(', ')}`
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

function validateStateSchema(state) {
  const errors = [];

  for (const [field, expectedType] of Object.entries(STATE_SCHEMA)) {
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

async function readLastNEntries(filePath, n = 10) {
  const entries = [];
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
              const entry = JSON.parse(line);
              entries.unshift(entry);
            } catch (error) {
              skipped++;
              console.warn(`Skipping malformed JSONL line: ${error.message}`);
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
        const entry = JSON.parse(lineBuffer);
        entries.unshift(entry);
      } catch (error) {
        skipped++;
        console.warn(`Skipping malformed JSONL line: ${error.message}`);
      }
    }

    await fd.close();

    if (skipped > 0) {
      console.warn(`⚠️ Warning: Skipped ${skipped} malformed entries`);
    }

    return entries;
  } catch (error) {
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

async function handleStatsCommand(platform) {
  try {
    const content = await readFileWithRetry(ABSOLUTE_PATHS.STATE);

    let state;
    try {
      state = JSON.parse(content);
    } catch (error) {
      throw new AR22Error('State file is corrupted', {
        what: 'state.json contains invalid JSON',
        how: [
          'Check file syntax with: jq . ' + ABSOLUTE_PATHS.STATE,
          'Restore from backup if available',
          'Delete file and re-run /improve-rules'
        ],
        technical: `Parse error: ${error.message}, File: ${ABSOLUTE_PATHS.STATE}`
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
    if (state.patterns_found.length === 0 && state.improvements_applied === 0) {
      return `📊 Project Self-Improvement Statistics

No analysis data available yet. Run /improve-rules to generate initial metrics.

**Platform:** ${state.platform}
**Status:** Ready for first analysis`;
    }

    // Format display
    let output = `📊 Project Self-Improvement Statistics

Patterns Found: ${state.patterns_found.length}
${state.patterns_found.length > 0 ? '─' + '─'.repeat(40) + '\n' + state.patterns_found.map(p => `• ${p}`).join('\n') : ''}

Improvements Applied: ${state.improvements_applied}
Corrections Reduction: ${state.corrections_reduction}%
Last Analysis: ${state.last_analysis || 'Never'}
Platform: ${state.platform}`;

    return output;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }

    if (error.code === 'ENOENT') {
      throw new AR22Error('State file not found', {
        what: 'state.json does not exist at expected location',
        how: [
          'Run /improve-rules to create initial state file',
          `Verify file exists at: ${ABSOLUTE_PATHS.STATE}`,
          'Check file permissions (should be 0600)'
        ],
        technical: `Expected path: ${ABSOLUTE_PATHS.STATE}, Error: FILE_NOT_FOUND, System error: ${error.message}`
      });
    }

    if (error.code === 'EACCES') {
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
      technical: `Error: ${error.code || 'UNKNOWN'}, Message: ${error.message}, File: ${ABSOLUTE_PATHS.STATE}`
    });
  }
}

// ============================================================================
// HISTORY COMMAND IMPLEMENTATION
// ============================================================================

async function handleHistoryCommand(platform) {
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

    let output = `📋 Recent Improvements (Last ${entries.length} of ${entries.length})

${formattedEntries.reverse().join('\n')}`;

    return output;
  } catch (error) {
    if (error instanceof AR22Error) {
      throw error;
    }

    if (error.code === 'EACCES') {
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
      technical: `Error: ${error.code || 'UNKNOWN'}, Message: ${error.message}, File: ${ABSOLUTE_PATHS.RESULTS}`
    });
  }
}

// ============================================================================
// ROLLBACK COMMAND IMPLEMENTATION
// ============================================================================

async function handleRollbackCommand(timestamp, platform) {
  try {
    // Validate timestamp format and semantics
    validateTimestamp(timestamp);

    // Check if backup file exists
    const backupPath = path.join(ABSOLUTE_PATHS.HISTORY_DIR, `${timestamp}.md`);

    try {
      await fs.promises.access(backupPath, fs.constants.R_OK);
    } catch (error) {
      // List available timestamps
      let availableTimestamps = [];
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

    // Get current timestamp for backup naming
    const currentTimestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('Z', 'Z');
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

    throw new AR22Error('Rollback preparation failed', {
      what: 'An unexpected error occurred while preparing rollback guidance',
      how: [
        'Verify history/ directory exists and is accessible',
        'Check timestamp format is correct',
        'Run /improve-rules --history to see available backups'
      ],
      technical: `Error: ${error.code || 'UNKNOWN'}, Message: ${error.message}, Timestamp: ${timestamp}`
    });
  }
}

// ============================================================================
// MAIN COMMAND HANDLER
// ============================================================================

async function handleCommand(input) {
  // Detect platform (needed for both success and error cases)
  const platform = detectPlatform();

  try {
    // Parse command
    const { action, timestamp } = parseCommand(input);

    // Route to appropriate handler
    let result;
    switch (action) {
      case 'stats':
        result = await handleStatsCommand(platform);
        break;
      case 'history':
        result = await handleHistoryCommand(platform);
        break;
      case 'rollback':
        result = await handleRollbackCommand(timestamp, platform);
        break;
      case 'analyze':
        result = `
📊 Project-Self-Improvement: Conversation Analysis

The main /improve-rules analysis is performed by your AI assistant directly.

## How to Use

In your AI chat (Claude Code, Cursor, Copilot), simply say:

  /improve-rules

Or ask naturally:

  "Please analyze our conversation and suggest rule improvements."

## What It Does

1. Scans the conversation for your corrections
2. Identifies recurring patterns
3. Suggests rule improvements
4. Updates state with learned patterns

## Other Commands

  /improve-rules --stats    Show performance metrics
  /improve-rules --history  Show recent improvements
  /improve-rules --rollback --to {timestamp}  Restore from backup

## Learn More

  Skill docs: ~/.claude/skills/rulesmith/README.md
  Platform guides: docs/platforms/
`;
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
    return formatErrorForPlatform({ toString: () => result }, platform);
  } catch (error) {
    // Format error for platform
    return formatErrorForPlatform(error, platform);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  handleCommand,
  parseCommand,
  validateTimestamp,
  readLastNEntries,
  AR22Error,
  formatErrorForPlatform,
  detectPlatform,
  ABSOLUTE_PATHS
};

// If run directly (for testing)
if (require.main === module) {
  const args = process.argv.slice(2).join(' ');
  handleCommand(args).then(console.log).catch(console.error);
}
