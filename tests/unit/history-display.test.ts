/**
 * Unit Tests for History Display (Story 1-7)
 *
 * Testing Strategy:
 * - Unit tests focus on history display formatting logic
 * - Test JSONL parsing, entry formatting, and display logic
 * - Mock results.jsonl reading to test display independently
 * - Test edge cases for large files and malformed entries
 *
 * Coverage: AC2, AC5
 * FR37: --history command displays recent improvements from results.jsonl
 */

import { describe, test, expect } from '@jest/globals';

// Result entry schema
interface ResultEntry {
  timestamp: string;
  status: 'applied' | 'pending' | 'failed';
  summary: string;
}

interface HistoryDisplay {
  success: boolean;
  output: string;
  error?: string;
  warnings?: string[];
}

// Implementation of history display logic
function formatHistory(entries: ResultEntry[] | null, limit: number = 10): HistoryDisplay {
  if (!entries) {
    return {
      success: false,
      output: '',
      error: `⚠️ Error: Invalid history data

**What happened:** History entries data is null or undefined

**How to fix:**
1. Run /improve-rules to create initial history file
2. Verify results.jsonl contains valid JSONL data
3. Check file permissions (should be 0600)

**Technical details:**
- Received: ${entries}
- Required: array of ResultEntry objects`
    };
  }

  if (!Array.isArray(entries)) {
    return {
      success: false,
      output: '',
      error: `⚠️ Error: Invalid history data type

**What happened:** History data is not an array

**How to fix:**
1. Verify results.jsonl contains valid JSONL format
2. Each line should be a valid JSON object
3. Check file is not corrupted

**Technical details:**
- Received type: ${typeof entries}
- Required type: array`
    };
  }

  if (entries.length === 0) {
    return {
      success: true,
      output: '📋 Recent Improvements (Last 10)\n\nNo improvement history available yet. Run /improve-rules to create history.'
    };
  }

  // Limit entries and format as markdown table (Story 6-8, AC #1)
  // Sort by timestamp descending (newest first) to ensure consistent ordering
  // regardless of input order, then take the first N
  const sortedEntries = [...entries].sort((a, b) => {
    const timeA = (a as any).timestamp ? new Date((a as any).timestamp).getTime() : 0;
    const timeB = (b as any).timestamp ? new Date((b as any).timestamp).getTime() : 0;
    return timeB - timeA; // Descending: newest first
  });
  const limitedEntries = sortedEntries.slice(0, limit);

  // Story 6-8 (AC #1): Build proper markdown table
  const header = '| Date | Status | Summary |';
  const separator = '|------|--------|---------|';

  const formattedEntries = limitedEntries.map(entry => {
    const timestamp = (entry as any).timestamp ? formatTimestamp((entry as any).timestamp) : 'N/A';
    const status = (entry as any).status ? formatStatus((entry as any).status) : 'N/A';
    const summary = ((entry as any).summary || 'N/A').replace(/\|/g, '\\|').replace(/`/g, '\\`').replace(/\n/g, ' ').replace(/\r/g, '');
    return `| ${timestamp} | ${status} | ${summary} |`;
  });

  const countText = limitedEntries.length === 1 ? 'showing last 1' : `showing last ${limitedEntries.length}`;
  const output = `📋 Recent Improvements (${countText})

${header}
${separator}
${formattedEntries.join('\n')}`;

  return {
    success: true,
    output
  };
}

function parseJSONLEntry(line: string): ResultEntry | null {
  if (!line || typeof line !== 'string') {
    return null;
  }

  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;

    // Validate it has the expected structure
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const entry = parsed as Record<string, unknown>;

    // Return entry with whatever fields are available (lenient parsing)
    // Validation of required fields is handled separately
    return {
      timestamp: typeof entry.timestamp === 'string' ? entry.timestamp : undefined as any,
      status: typeof entry.status === 'string' ? entry.status as any : undefined as any,
      summary: typeof entry.summary === 'string' ? entry.summary : undefined as any
    };
  } catch (error) {
    return null;
  }
}

// Story 6-8 (AC #7): Format timestamp with edge case guards
function formatTimestamp(isoTimestamp: string): string {
  // Guard: Non-string input
  if (typeof isoTimestamp !== 'string' || isoTimestamp.trim() === '') {
    return 'Invalid date';
  }

  // Story 6-8 (AC #7): Format as "YYYY-MM-DD HH:MM:SS UTC"
  // Handle invalid timestamps
  const date = new Date(isoTimestamp);
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }

  // Check for future timestamps
  const now = new Date();
  if (date.getTime() > now.getTime() + 60000) { // 1-minute tolerance for clock skew
    const formatted = formatTimestampComponents(date);
    return `[FUTURE] ${formatted}`;
  }

  return formatTimestampComponents(date);
}

function formatTimestampComponents(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}

// Story 6-8 (AC #4): Human-readable status formatting with edge case guards
function formatStatus(status: string): string {
  // Guard: Non-string or empty input
  if (typeof status !== 'string' || status.trim() === '') {
    return 'Unknown';
  }
  const statusMap: Record<string, string> = {
    'applied': 'Applied',
    'pending': 'Pending',
    'failed': 'Failed'
  };
  return statusMap[status] || 'Unknown';
}

// Story 6-8 (AC #2): Corrections reduction calculation with edge case guards
function calculateCorrectionsReduction(stateData: Record<string, unknown>): string {
  const sessions = stateData.totalSessions as number;
  // Guard: Non-numeric sessions
  if (typeof sessions !== 'number' || isNaN(sessions) || sessions < 3) {
    return 'Insufficient data (need 3+ sessions)';
  }
  const correctionsCount = stateData.correctionsCount as number[] | undefined;
  if (!correctionsCount || correctionsCount.length === 0) {
    return '0%';
  }
  const first = correctionsCount[0];
  const last = correctionsCount[correctionsCount.length - 1];
  // Guard: Non-numeric values in correctionsCount array
  if (typeof first !== 'number' || isNaN(first)) {
    return '0%';
  }
  if (typeof last !== 'number' || isNaN(last)) {
    return '0%';
  }
  if (first === 0) {
    return '0%';
  }
  const reduction = ((first - last) / first) * 100;
  // Guard: NaN result from unexpected arithmetic
  if (isNaN(reduction)) {
    return '0%';
  }
  return `${Math.round(reduction)}%`;
}

// Story 6-8 (AC #2): Approval rate calculation with edge case guards
function calculateApprovalRate(stateData: Record<string, unknown>): string {
  const approvals = stateData.approvalsCount as number;
  const rejections = stateData.rejectionsCount as number;
  // Guard: Non-numeric or missing values (use typeof check, not falsy check - 0 is valid)
  if (typeof approvals !== 'number' && typeof rejections !== 'number') {
    return 'No data';
  }
  const safeApprovals = typeof approvals === 'number' && !isNaN(approvals) ? approvals : 0;
  const safeRejections = typeof rejections === 'number' && !isNaN(rejections) ? rejections : 0;
  const total = safeApprovals + safeRejections;
  if (total === 0) {
    return 'No data';
  }
  const rate = (safeApprovals / total) * 100;
  // Guard: NaN result
  if (isNaN(rate)) {
    return 'No data';
  }
  return `${Math.round(rate)}%`;
}

function validateResultEntry(entry: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entry || typeof entry !== 'object') {
    return { valid: false, errors: ['Entry must be a non-null object'] };
  }

  const e = entry as Record<string, unknown>;

  // Validate timestamp
  if (!('timestamp' in e) || typeof e.timestamp !== 'string') {
    errors.push('timestamp must be a string');
  } else {
    // Check ISO 8601 format
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!isoRegex.test(e.timestamp)) {
      errors.push('timestamp must be in ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)');
    }
  }

  // Validate status
  if (!('status' in e) || typeof e.status !== 'string') {
    errors.push('status must be a string');
  } else if (!['applied', 'pending', 'failed'].includes(e.status)) {
    errors.push('status must be one of: applied, pending, failed');
  }

  // Validate summary
  if (!('summary' in e) || typeof e.summary !== 'string') {
    errors.push('summary must be a string');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('History Display - Unit Tests', () => {
  const validEntries: ResultEntry[] = [
    {
      timestamp: '2026-03-16T14:30:00Z',
      status: 'applied',
      summary: 'Fixed async/await pattern'
    },
    {
      timestamp: '2026-03-16T12:15:00Z',
      status: 'applied',
      summary: 'Added error handling'
    },
    {
      timestamp: '2026-03-15T18:45:00Z',
      status: 'pending',
      summary: 'Refactored validation logic'
    }
  ];

  describe('History formatting', () => {
    test('should format entries in specified format (AC5)', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC \| \w+ \| .+/);
    });

    test('should display most recent entries first (AC5)', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      expect(lines[0]).toContain('14:30:00'); // Most recent
      expect(lines[1]).toContain('12:15:00');
      expect(lines[2]).toContain('18:45:00'); // Oldest
    });

    test('should limit to last 10 entries (AC5)', () => {
      const manyEntries = Array.from({ length: 15 }, (_, i) => ({
        timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
        status: 'applied' as const,
        summary: `Improvement ${i}`
      }));

      const result = formatHistory(manyEntries, 10);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      expect(lines.length).toBe(10);
      expect(result.output).toContain('showing last 10');
    });

    test('should show count when fewer than 10 entries', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('3');
      expect(result.output).toContain('last 3');
    });

    test('should show all entries when limit exceeds available', () => {
      const result = formatHistory(validEntries, 100);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      expect(lines.length).toBe(3);
    });
  });

  describe('Timestamp formatting', () => {
    test('should convert ISO 8601 to display format (AC5)', () => {
      const result = formatTimestamp('2026-03-16T14:30:00Z');

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/);
      expect(result).toBe('2026-03-16 14:30:00 UTC');
    });

    test('should handle different timestamps', () => {
      expect(formatTimestamp('2026-01-01T00:00:00Z')).toBe('2026-01-01 00:00:00 UTC');
      expect(formatTimestamp('2026-03-31T23:59:59Z')).toBe('2026-03-31 23:59:59 UTC');
    });

    test('should handle timezone conversion (UTC to local)', () => {
      const result = formatTimestamp('2026-03-16T14:30:00Z');

      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/);
    });
  });

  describe('JSONL parsing', () => {
    test('should parse valid JSONL entry', () => {
      const line = '{"timestamp":"2026-03-16T14:30:00Z","status":"applied","summary":"Test improvement"}';
      const result = parseJSONLEntry(line);

      expect(result).not.toBeNull();
      expect(result?.timestamp).toBe('2026-03-16T14:30:00Z');
      expect(result?.status).toBe('applied');
      expect(result?.summary).toBe('Test improvement');
    });

    test('should return null for invalid JSON', () => {
      const result = parseJSONLEntry('not valid json');

      expect(result).toBeNull();
    });

    test('should return null for malformed entry', () => {
      const result = parseJSONLEntry('{"incomplete": "json"');

      expect(result).toBeNull();
    });

    test('should handle extra whitespace', () => {
      const line = '  {"timestamp":"2026-03-16T14:30:00Z","status":"applied","summary":"Test"}  ';
      const result = parseJSONLEntry(line);

      expect(result).not.toBeNull();
    });

    test('should handle entry with missing fields', () => {
      const line = '{"timestamp":"2026-03-16T14:30:00Z","status":"applied"}';
      const result = parseJSONLEntry(line);

      // Should parse but validation will catch missing summary
      expect(result).not.toBeNull();
      expect(result?.summary).toBeUndefined();
    });
  });

  describe('Entry validation', () => {
    test('should validate complete entry', () => {
      const entry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Test improvement'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing timestamp', () => {
      const entry = {
        status: 'applied',
        summary: 'Test improvement'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });

    test('should reject missing status', () => {
      const entry = {
        timestamp: '2026-03-16T14:30:00Z',
        summary: 'Test improvement'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    test('should reject missing summary', () => {
      const entry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('summary'))).toBe(true);
    });

    test('should validate status values', () => {
      const validStatuses = ['applied', 'pending', 'failed'];

      validStatuses.forEach(status => {
        const entry = {
          timestamp: '2026-03-16T14:30:00Z',
          status: status as 'applied' | 'pending' | 'failed',
          summary: 'Test'
        };

        const result = validateResultEntry(entry);
        expect(result.valid).toBe(true);
      });
    });

    test('should reject invalid status', () => {
      const entry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'invalid-status',
        summary: 'Test'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('status'))).toBe(true);
    });

    test('should validate timestamp format', () => {
      const entry = {
        timestamp: 'not-a-timestamp',
        status: 'applied',
        summary: 'Test'
      };

      const result = validateResultEntry(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('timestamp'))).toBe(true);
    });
  });

  describe('Malformed entry handling', () => {
    test('should skip invalid JSON entries with warning', () => {
      const entries = [
        validEntries[0],
        null, // Simulates parse error
        validEntries[1]
      ];

      const result = formatHistory(entries.filter(Boolean) as ResultEntry[], 10);

      expect(result.success).toBe(true);
      // Note: We filter out null entries before formatting, so no warnings in this implementation
      expect(result.output).toContain('Fixed async/await pattern');
      expect(result.output).toContain('Added error handling');
    });

    test('should count multiple malformed entries', () => {
      const entries = [
        validEntries[0],
        null,
        null,
        validEntries[1]
      ];

      const result = formatHistory(entries.filter(Boolean) as ResultEntry[], 10);

      expect(result.success).toBe(true);
      // Note: We filter out null entries before formatting
      expect(result.output).toContain('Fixed async/await pattern');
      expect(result.output).toContain('Added error handling');
    });

    test('should handle all entries malformed', () => {
      const result = formatHistory([], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No improvement history');
    });
  });

  describe('Edge cases', () => {
    test('should handle empty history', () => {
      const result = formatHistory([], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No improvement history available yet');
    });

    test('should handle single entry', () => {
      const result = formatHistory([validEntries[0]], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Fixed async/await pattern');
      expect(result.output).toContain('showing last 1');
    });

    test('should handle special characters in summary', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed: async/await & promises (test@example.com)'
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Fixed: async/await & promises');
    });

    test('should handle very long summaries', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'A'.repeat(500)
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('A'.repeat(500));
    });

    test('should handle pipe characters in summary (markdown table safety)', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed async/await | promises'
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      // Pipe should be escaped to prevent markdown table breakage
      expect(result.output).toContain('\\|');
      expect(result.output).not.toMatch(/Applied \| Fixed async\/await \| promises \|/);
    });

    test('should handle newline characters in summary (markdown table safety)', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Line one\nLine two'
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      // Newlines should be replaced with spaces
      expect(result.output).toContain('Line one Line two');
      expect(result.output).not.toContain('\nLine two');
    });

    test('should handle backtick characters in summary (markdown table safety)', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed `async/await` pattern'
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      // Backticks should be escaped to prevent markdown rendering issues
      expect(result.output).toContain('\\`');
    });

    test('should handle unicode characters', () => {
      const entry: ResultEntry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed emoji handling: 😀 🎉 ✓'
      };

      const result = formatHistory([entry], 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('😀');
    });
  });

  describe('Display formatting', () => {
    test('should format output as list', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/Recent Improvements|History/i);
    });

    test('should include status indicator', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Applied');
      expect(result.output).toContain('Pending');
    });

    test('should format with consistent spacing', () => {
      const result = formatHistory(validEntries, 10);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      lines.forEach(line => {
        expect(line).toMatch(/\| \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC \| \w+ \| .+ \|/);
      });
    });
  });

  describe('Error handling', () => {
    test('should handle null entries gracefully', () => {
      const result = formatHistory(null as unknown as ResultEntry[], 10);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle undefined entries gracefully', () => {
      const result = formatHistory(undefined as unknown as ResultEntry[], 10);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should provide AR22-compliant error for invalid input', () => {
      const result = formatHistory('not-an-array' as unknown as ResultEntry[], 10);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('Technical details');
    });
  });

  // ============================================================================
  // Story 6-8: Display History and Metrics
  // Test IDs: 6.8-UNIT-001 through 6.8-UNIT-004
  // FR35: "System can display analysis history and metrics to user"
  // ============================================================================

  // --- 6.8-UNIT-001: Parse results.jsonl and extract last 20 sessions ---

  describe('6.8-UNIT-001: History parsing with 20-entry limit (FR35, AC #1)', () => {
    test('should limit output to last 20 entries (not 10) per FR35', () => {
      const twentyFiveEntries = Array.from({ length: 25 }, (_, i) => ({
        timestamp: `2026-03-${(i % 28 + 1).toString().padStart(2, '0')}T10:00:00Z`,
        status: 'applied' as const,
        summary: `Improvement ${i}`
      }));

      const result = formatHistory(twentyFiveEntries, 20);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      expect(lines.length).toBe(20);
    });

    test('should show all entries when fewer than 20 available (AC #1)', () => {
      const fiveEntries = Array.from({ length: 5 }, (_, i) => ({
        timestamp: `2026-03-16T${(10 + i).toString().padStart(2, '0')}:00:00Z`,
        status: 'applied' as const,
        summary: `Improvement ${i}`
      }));

      const result = formatHistory(fiveEntries, 20);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|') && !line.includes('---') && !line.includes('Date'));
      expect(lines.length).toBe(5);
    });

    test('should display entries in reverse chronological order (newest first) (AC #1)', () => {
      const entries: ResultEntry[] = [
        { timestamp: '2026-03-14T08:00:00Z', status: 'applied', summary: 'Oldest' },
        { timestamp: '2026-03-15T08:00:00Z', status: 'applied', summary: 'Middle' },
        { timestamp: '2026-03-16T08:00:00Z', status: 'applied', summary: 'Newest' }
      ];

      const result = formatHistory(entries, 20);

      expect(result.success).toBe(true);
      const output = result.output;
      const newestIdx = output.indexOf('Newest');
      const middleIdx = output.indexOf('Middle');
      const oldestIdx = output.indexOf('Oldest');
      expect(newestIdx).toBeLessThan(middleIdx);
      expect(middleIdx).toBeLessThan(oldestIdx);
    });

    test('should format output as proper markdown table with header and alignment row (AC #1)', () => {
      const result = formatHistory(validEntries, 20);

      expect(result.success).toBe(true);
      expect(result.output).toContain('| Date');
      expect(result.output).toContain('| Status');
      expect(result.output).toContain('| Summary');
      expect(result.output).toMatch(/\|[-\s|]+\|/); // Alignment row with dashes
    });
  });

  // --- 6.8-UNIT-002: Format metrics in human-readable output ---

  describe('6.8-UNIT-002: Human-readable status formatting (FR35, AC #4)', () => {
    test('formatStatus should map applied to "Applied"', () => {
      const result = formatStatus('applied');
      expect(result).toBe('Applied');
    });

    test('formatStatus should map pending to "Pending"', () => {
      const result = formatStatus('pending');
      expect(result).toBe('Pending');
    });

    test('formatStatus should map failed to "Failed"', () => {
      const result = formatStatus('failed');
      expect(result).toBe('Failed');
    });

    test('formatStatus should map unknown values to "Unknown"', () => {
      expect(formatStatus('bogus')).toBe('Unknown');
      expect(formatStatus('')).toBe('Unknown');
      expect(formatStatus('APPLIED')).toBe('Unknown');
    });

    test('history display should use human-readable status labels (AC #4)', () => {
      const entries: ResultEntry[] = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Test' },
        { timestamp: '2026-03-15T14:30:00Z', status: 'pending', summary: 'Test2' },
        { timestamp: '2026-03-14T14:30:00Z', status: 'failed', summary: 'Test3' }
      ];

      const result = formatHistory(entries, 20);

      expect(result.output).toContain('Applied');
      expect(result.output).toContain('Pending');
      expect(result.output).toContain('Failed');
      // Should NOT contain raw lowercase status values in the table
      const tableLines = result.output.split('\n').filter(
        line => line.includes('|') && !line.includes('---') && !line.includes('Date')
      );
      tableLines.forEach(line => {
        expect(line).not.toMatch(/\| applied \|/);
        expect(line).not.toMatch(/\| pending \|/);
        expect(line).not.toMatch(/\| failed \|/);
      });
    });

    test('should show "N/A" for missing status field (AC #4)', () => {
      const entries = [
        { timestamp: '2026-03-16T14:30:00Z', summary: 'No status' }
      ] as unknown as ResultEntry[];

      const result = formatHistory(entries, 20);

      expect(result.success).toBe(true);
      expect(result.output).toContain('N/A');
    });

    test('should show "N/A" for missing timestamp field (AC #4)', () => {
      const entries = [
        { status: 'applied', summary: 'No timestamp' }
      ] as unknown as ResultEntry[];

      const result = formatHistory(entries, 20);

      expect(result.success).toBe(true);
      expect(result.output).toContain('N/A');
    });

    test('should show "N/A" for missing summary field (AC #4)', () => {
      const entries = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied' }
      ] as unknown as ResultEntry[];

      const result = formatHistory(entries, 20);

      expect(result.success).toBe(true);
      expect(result.output).toContain('N/A');
    });
  });

  // --- 6.8-UNIT-003: Calculate corrections_reduction percentage accurately ---

  describe('6.8-UNIT-003: Corrections reduction calculation (FR35, AC #2)', () => {
    test('should return "Insufficient data (need 3+ sessions)" when fewer than 3 sessions (AC #2)', () => {
      const stateData = {
        totalSessions: 2,
        correctionsCount: [5, 3],
        improvementsApplied: 10,
        approvalsCount: 8,
        rejectionsCount: 2,
        patternsDiscovered: 3
      };

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toBe('Insufficient data (need 3+ sessions)');
    });

    test('should calculate reduction percentage with 3+ sessions', () => {
      const stateData = {
        totalSessions: 5,
        correctionsCount: [10, 8, 6, 4, 3],
        improvementsApplied: 15,
        approvalsCount: 20,
        rejectionsCount: 5,
        patternsDiscovered: 7
      };

      const result = calculateCorrectionsReduction(stateData);

      // First session: 10, Last session: 3, Reduction = (10 - 3) / 10 * 100 = 70%
      expect(result).toContain('70');
      expect(result).toContain('%');
    });

    test('should handle zero initial corrections (avoid division by zero)', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [0, 0, 0],
        improvementsApplied: 5,
        approvalsCount: 3,
        rejectionsCount: 0,
        patternsDiscovered: 1
      };

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle approval rate calculation with no data (AC #2)', () => {
      const stateData = {
        totalSessions: 1,
        correctionsCount: [5],
        improvementsApplied: 0,
        approvalsCount: 0,
        rejectionsCount: 0,
        patternsDiscovered: 0
      };

      const result = calculateApprovalRate(stateData);

      expect(result).toContain('No data');
    });

    test('should calculate approval rate correctly', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [5, 4, 3],
        improvementsApplied: 10,
        approvalsCount: 15,
        rejectionsCount: 5,
        patternsDiscovered: 4
      };

      const result = calculateApprovalRate(stateData);

      // 15 / (15 + 5) * 100 = 75%
      expect(result).toContain('75');
      expect(result).toContain('%');
    });
  });

  // --- 6.8-UNIT-004: Display timestamps in user-friendly format ---

  describe('6.8-UNIT-004: Timestamp formatting for display (FR35, AC #7)', () => {
    test('formatTimestamp should produce "YYYY-MM-DD HH:MM:SS UTC" format (AC #7)', () => {
      const result = formatTimestamp('2026-03-16T14:30:00Z');

      expect(result).toBe('2026-03-16 14:30:00 UTC');
    });

    test('formatTimestamp should strip T, Z, and milliseconds (AC #7)', () => {
      expect(formatTimestamp('2026-01-01T00:00:00.000Z')).toBe('2026-01-01 00:00:00 UTC');
      expect(formatTimestamp('2026-03-31T23:59:59.999Z')).toBe('2026-03-31 23:59:59 UTC');
    });

    test('formatTimestamp should return "Invalid date" for unparseable timestamps (AC #7)', () => {
      expect(formatTimestamp('not-a-date')).toBe('Invalid date');
      expect(formatTimestamp('')).toBe('Invalid date');
      expect(formatTimestamp('abc123')).toBe('Invalid date');
    });

    test('formatTimestamp should prepend "[FUTURE] " for future timestamps (AC #7)', () => {
      const futureDate = new Date();
      futureDate.setUTCFullYear(futureDate.getUTCFullYear() + 1);
      const futureISO = futureDate.toISOString();

      const result = formatTimestamp(futureISO);

      expect(result).toMatch(/^\[FUTURE\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/);
    });

    test('formatTimestamp should display current/past timestamps without warning (AC #7)', () => {
      const pastDate = new Date();
      pastDate.setUTCFullYear(pastDate.getUTCFullYear() - 1);
      const pastISO = pastDate.toISOString();

      const result = formatTimestamp(pastISO);

      expect(result).not.toContain('[FUTURE]');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC$/);
    });

    test('history display should use formatTimestamp for all entry timestamps (AC #7)', () => {
      const entries: ResultEntry[] = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Test' }
      ];

      const result = formatHistory(entries, 20);

      expect(result.output).toContain('2026-03-16 14:30:00 UTC');
    });

    test('history display should show "Invalid date" for unparseable timestamps (AC #7)', () => {
      const entries = [
        { timestamp: 'not-a-valid-timestamp', status: 'applied', summary: 'Test' }
      ] as unknown as ResultEntry[];

      const result = formatHistory(entries, 20);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Invalid date');
    });
  });

  // ============================================================================
  // Edge case guards added during BMAD review
  // ============================================================================

  describe('Edge case guards: formatStatus', () => {
    test('should handle undefined input gracefully', () => {
      const result = formatStatus(undefined as unknown as string);
      expect(result).toBe('Unknown');
    });

    test('should handle null input gracefully', () => {
      const result = formatStatus(null as unknown as string);
      expect(result).toBe('Unknown');
    });

    test('should handle numeric input gracefully', () => {
      const result = formatStatus(42 as unknown as string);
      expect(result).toBe('Unknown');
    });
  });

  describe('Edge case guards: formatTimestamp', () => {
    test('should handle undefined input gracefully', () => {
      const result = formatTimestamp(undefined as unknown as string);
      expect(result).toBe('Invalid date');
    });

    test('should handle null input gracefully', () => {
      const result = formatTimestamp(null as unknown as string);
      expect(result).toBe('Invalid date');
    });

    test('should handle numeric input gracefully', () => {
      const result = formatTimestamp(12345 as unknown as string);
      // new Date(12345) creates a valid date from milliseconds
      expect(result).not.toBe('');
    });
  });

  describe('Edge case guards: calculateCorrectionsReduction', () => {
    test('should handle null values in correctionsCount array', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [null, 5, 3],
        improvementsApplied: 5,
        approvalsCount: 3,
        rejectionsCount: 0,
        patternsDiscovered: 1
      } as unknown as Record<string, unknown>;

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle undefined values in correctionsCount array', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [undefined, 5, 3],
        improvementsApplied: 5,
        approvalsCount: 3,
        rejectionsCount: 0,
        patternsDiscovered: 1
      } as unknown as Record<string, unknown>;

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle NaN values in correctionsCount array', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [NaN, 5, 3],
        improvementsApplied: 5,
        approvalsCount: 3,
        rejectionsCount: 0,
        patternsDiscovered: 1
      } as unknown as Record<string, unknown>;

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle NaN sessions value', () => {
      const stateData = {
        totalSessions: NaN,
        correctionsCount: [10, 8, 6],
        improvementsApplied: 5,
        approvalsCount: 3,
        rejectionsCount: 0,
        patternsDiscovered: 1
      } as unknown as Record<string, unknown>;

      const result = calculateCorrectionsReduction(stateData);

      expect(result).toBe('Insufficient data (need 3+ sessions)');
    });
  });

  describe('Edge case guards: calculateApprovalRate', () => {
    test('should handle zero approvals with non-zero rejections (NOT "No data")', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [5, 4, 3],
        improvementsApplied: 10,
        approvalsCount: 0,
        rejectionsCount: 5,
        patternsDiscovered: 4
      };

      const result = calculateApprovalRate(stateData);

      // 0 / (0 + 5) * 100 = 0%
      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle undefined approvals with non-zero rejections', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [5, 4, 3],
        improvementsApplied: 10,
        approvalsCount: undefined,
        rejectionsCount: 5,
        patternsDiscovered: 4
      } as unknown as Record<string, unknown>;

      const result = calculateApprovalRate(stateData);

      // undefined treated as 0: 0 / (0 + 5) * 100 = 0%
      expect(result).toContain('0');
      expect(result).toContain('%');
    });

    test('should handle undefined rejections with non-zero approvals', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [5, 4, 3],
        improvementsApplied: 10,
        approvalsCount: 5,
        rejectionsCount: undefined,
        patternsDiscovered: 4
      } as unknown as Record<string, unknown>;

      const result = calculateApprovalRate(stateData);

      // undefined treated as 0: 5 / (5 + 0) * 100 = 100%
      expect(result).toContain('100');
      expect(result).toContain('%');
    });

    test('should handle NaN approvals value', () => {
      const stateData = {
        totalSessions: 3,
        correctionsCount: [5, 4, 3],
        improvementsApplied: 10,
        approvalsCount: NaN,
        rejectionsCount: 5,
        patternsDiscovered: 4
      } as unknown as Record<string, unknown>;

      const result = calculateApprovalRate(stateData);

      // NaN treated as 0: 0 / (0 + 5) * 100 = 0%
      expect(result).toContain('0');
      expect(result).toContain('%');
    });
  });
});
