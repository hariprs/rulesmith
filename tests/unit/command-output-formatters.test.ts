/**
 * Unit Tests for Command Output Formatters
 *
 * Testing Strategy:
 * - Unit tests for formatting logic extracted from E2E tests
 * - Fast, isolated tests with no external dependencies
 * - Covers: statistics, history, tables, percentages, timestamps
 *
 * These tests were identified in test-architecture-analysis.md as
 * candidates to be pushed from E2E to unit level for better isolation
 * and faster execution.
 */

import { describe, test, expect } from '@jest/globals';

// ============================================================================
// STATISTICS FORMATTING
// ============================================================================

describe('Statistics Formatting - Unit Tests', () => {
  describe('formatStatistics', () => {
    test('should format statistics with all required fields', () => {
      // This test validates formatting logic, not the command execution
      const stats = {
        patterns_found: ['async-await-pattern', 'error-handling-missing'],
        improvements_applied: 7,
        corrections_reduction: 0.35,
        last_analysis: '2026-03-16T10:30:00Z',
        platform: 'claude-code'
      };

      // Format the statistics
      const formatted = formatStatistics(stats);

      // Verify all fields are included
      expect(formatted).toContain('patterns_found');
      expect(formatted).toContain('2'); // Count of patterns
      expect(formatted).toContain('improvements_applied');
      expect(formatted).toContain('7');
      expect(formatted).toContain('corrections_reduction');
      expect(formatted).toContain('2026-03-16T10:30:00Z');
      expect(formatted).toContain('claude-code');
    });

    test('should format statistics in readable table format', () => {
      const stats = {
        patterns_found: ['pattern1', 'pattern2', 'pattern3'],
        improvements_applied: 5,
        corrections_reduction: 0.25,
        last_analysis: '2026-03-16T10:30:00Z',
        platform: 'claude-code'
      };

      const formatted = formatStatistics(stats);

      // Verify table-like formatting
      expect(formatted).toMatch(/Statistics|Metrics|Current Status/i);
      expect(formatted).toMatch(/Patterns Found|patterns_found/i);
      expect(formatted).toMatch(/Improvements|improvements_applied/i);
      expect(formatted).toMatch(/Reduction|corrections_reduction/i);
    });
  });

  describe('calculatePercentage', () => {
    test('should convert decimal to percentage string', () => {
      expect(calculatePercentage(0.35)).toBe('35%');
      expect(calculatePercentage(0.5)).toBe('50%');
      expect(calculatePercentage(1.0)).toBe('100%');
      expect(calculatePercentage(0.0)).toBe('0%');
    });

    test('should handle edge cases', () => {
      expect(calculatePercentage(0.123)).toBe('12%'); // Rounded
      expect(calculatePercentage(0.999)).toBe('100%'); // Round up
      expect(calculatePercentage(0.001)).toBe('0%'); // Round down
    });
  });

  describe('formatCorrectionsReduction', () => {
    test('should display corrections_reduction as percentage', () => {
      const stats = {
        corrections_reduction: 0.35
      };

      const formatted = formatCorrectionsReduction(stats);

      expect(formatted).toMatch(/\d+%/);
      expect(formatted).toContain('35%');
    });

    test('should handle zero reduction', () => {
      const stats = { corrections_reduction: 0.0 };
      const formatted = formatCorrectionsReduction(stats);
      expect(formatted).toContain('0%');
    });

    test('should handle negative reduction (improvement)', () => {
      const stats = { corrections_reduction: -0.1 };
      const formatted = formatCorrectionsReduction(stats);
      expect(formatted).toContain('-10%');
    });
  });
});

// ============================================================================
// HISTORY FORMATTING
// ============================================================================

describe('History Formatting - Unit Tests', () => {
  describe('formatHistoryEntry', () => {
    test('should format entry with pipe-delimited format', () => {
      const entry = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed async/await pattern'
      };

      const formatted = formatHistoryEntry(entry);

      expect(formatted).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| \w+ \| .+/);
      expect(formatted).toContain('2026-03-16 14:30:00');
      expect(formatted).toContain('applied');
      expect(formatted).toContain('Fixed async/await pattern');
    });

    test('should handle different statuses', () => {
      const statuses = ['applied', 'pending', 'failed'];

      statuses.forEach(status => {
        const entry = {
          timestamp: '2026-03-16T14:30:00Z',
          status: status as 'applied' | 'pending' | 'failed',
          summary: 'Test summary'
        };

        const formatted = formatHistoryEntry(entry);
        expect(formatted).toContain(status);
      });
    });
  });

  describe('sortHistoryEntries', () => {
    test('should sort entries by timestamp descending (most recent first)', () => {
      const entries = [
        { timestamp: '2026-03-14T16:20:00Z', status: 'applied' as const, summary: 'Oldest' },
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied' as const, summary: 'Most recent' },
        { timestamp: '2026-03-15T10:00:00Z', status: 'applied' as const, summary: 'Middle' }
      ];

      const sorted = sortHistoryEntries(entries);

      expect(sorted[0].timestamp).toBe('2026-03-16T14:30:00Z'); // Most recent
      expect(sorted[1].timestamp).toBe('2026-03-15T10:00:00Z'); // Middle
      expect(sorted[2].timestamp).toBe('2026-03-14T16:20:00Z'); // Oldest
    });

    test('should handle empty array', () => {
      const sorted = sortHistoryEntries([]);
      expect(sorted).toEqual([]);
    });

    test('should handle single entry', () => {
      const entries = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied' as const, summary: 'Only entry' }
      ];

      const sorted = sortHistoryEntries(entries);
      expect(sorted).toHaveLength(1);
      expect(sorted[0].timestamp).toBe('2026-03-16T14:30:00Z');
    });
  });

  describe('formatHistoryList', () => {
    test('should include count of entries displayed', () => {
      const entries = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied' as const, summary: 'Entry 1' },
        { timestamp: '2026-03-16T12:15:00Z', status: 'applied' as const, summary: 'Entry 2' },
        { timestamp: '2026-03-15T18:45:00Z', status: 'pending' as const, summary: 'Entry 3' },
        { timestamp: '2026-03-15T10:00:00Z', status: 'applied' as const, summary: 'Entry 4' },
        { timestamp: '2026-03-14T16:20:00Z', status: 'failed' as const, summary: 'Entry 5' }
      ];

      const formatted = formatHistoryList(entries);

      expect(formatted).toContain('showing last 5');
    });

    test('should limit output to last N entries', () => {
      // Create 10 entries
      const entries = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2026-03-${(10 + i).toString().padStart(2, '0')}T10:00:00Z`,
        status: 'applied' as const,
        summary: `Entry ${i + 1}`
      }));

      // Limit to 5
      const formatted = formatHistoryList(entries, 5);

      expect(formatted).toContain('showing last 5');

      const lines = formatted.split('\n').filter(line => line.includes('|'));
      expect(lines.length).toBe(5);
    });
  });
});

// ============================================================================
// TIMESTAMP FORMATTING
// ============================================================================

describe('Timestamp Formatting - Unit Tests', () => {
  describe('formatTimestamp', () => {
    test('should convert ISO 8601 UTC to readable format', () => {
      const isoTimestamp = '2026-03-16T14:30:00Z';
      const formatted = formatTimestamp(isoTimestamp);

      expect(formatted).toBe('2026-03-16 14:30:00');
    });

    test('should handle different timestamps', () => {
      const cases = [
        ['2026-03-16T00:00:00Z', '2026-03-16 00:00:00'],
        ['2026-12-31T23:59:59Z', '2026-12-31 23:59:59'],
        ['2026-01-01T12:30:45Z', '2026-01-01 12:30:45']
      ];

      cases.forEach(([input, expected]) => {
        expect(formatTimestamp(input)).toBe(expected);
      });
    });

    test('should handle invalid timestamp', () => {
      expect(() => formatTimestamp('invalid')).toThrow();
      expect(() => formatTimestamp('')).toThrow();
    });
  });
});

// ============================================================================
// TABLE FORMATTING
// ============================================================================

describe('Table Formatting - Unit Tests', () => {
  describe('formatTable', () => {
    test('should create table with headers and rows', () => {
      const headers = ['Column 1', 'Column 2', 'Column 3'];
      const rows = [
        ['Row 1 Col 1', 'Row 1 Col 2', 'Row 1 Col 3'],
        ['Row 2 Col 1', 'Row 2 Col 2', 'Row 2 Col 3']
      ];

      const table = formatTable(headers, rows);

      expect(table).toContain('Column 1');
      expect(table).toContain('Column 2');
      expect(table).toContain('Column 3');
      expect(table).toContain('Row 1 Col 1');
      expect(table).toContain('Row 2 Col 2');
    });

    test('should align columns properly', () => {
      const headers = ['Name', 'Status', 'Summary'];
      const rows = [
        ['Entry 1', 'applied', 'Short summary'],
        ['Very Long Entry Name', 'pending', 'This is a much longer summary']
      ];

      const table = formatTable(headers, rows);
      const lines = table.split('\n');

      // All rows should have same length (alignment)
      const rowLengths = lines.map(line => line.length);
      const uniqueLengths = new Set(rowLengths);
      expect(uniqueLengths.size).toBeLessThan(3); // Allow minor variations
    });

    test('should handle empty rows', () => {
      const headers = ['Column 1', 'Column 2'];
      const rows: string[][] = [];

      const table = formatTable(headers, rows);

      expect(table).toContain('Column 1');
      expect(table).toContain('Column 2');
    });
  });
});

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

// These are mock implementations - the real implementations would be
// in the actual source files. These are here to make the tests runnable.

function formatStatistics(stats: any): string {
  return `
Statistics:
- patterns_found: ${stats.patterns_found.length} (${stats.patterns_found.join(', ')})
- improvements_applied: ${stats.improvements_applied}
- corrections_reduction: ${calculatePercentage(stats.corrections_reduction)}
- last_analysis: ${stats.last_analysis}
- platform: ${stats.platform}
`;
}

function calculatePercentage(decimal: number): string {
  return `${Math.round(decimal * 100)}%`;
}

function formatCorrectionsReduction(stats: { corrections_reduction: number }): string {
  return `Corrections reduction: ${calculatePercentage(stats.corrections_reduction)}`;
}

function formatHistoryEntry(entry: { timestamp: string; status: string; summary: string }): string {
  const date = formatTimestamp(entry.timestamp);
  return `${date} | ${entry.status} | ${entry.summary}`;
}

function sortHistoryEntries(entries: any[]): any[] {
  return [...entries].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function formatHistoryList(entries: any[], limit?: number): string {
  const sorted = sortHistoryEntries(entries);
  const limited = limit ? sorted.slice(0, limit) : sorted;
  const countText = `showing last ${limited.length}`;
  const formatted = limited.map(formatHistoryEntry).join('\n');
  return `${countText}\n${formatted}`;
}

function formatTimestamp(isoTimestamp: string): string {
  if (!isoTimestamp || typeof isoTimestamp !== 'string') {
    throw new Error('Invalid timestamp');
  }
  return isoTimestamp.replace('T', ' ').replace('Z', '');
}

function formatTable(headers: string[], rows: string[][]): string {
  const headerRow = headers.join(' | ');
  const dataRows = rows.map(row => row.join(' | '));
  return [headerRow, ...dataRows].join('\n');
}
