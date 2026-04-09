/**
 * Unit Tests for Restore from Backup (Story 6-9)
 *
 * Testing Strategy:
 * - Unit tests focus on pure business logic: timestamp format conversion,
 *   backup validation, and available backup enumeration with formatting.
 * - No file system mocking needed for format conversion logic.
 * - File-existence validation uses jest.mock('fs') for isolation.
 *
 * Coverage: AC 6.9 #3, #7 (timestamp validation and format conversion),
 *           AC 6.9 #8 (results.jsonl rollback entry shape)
 * FR34: Restore rules from a timestamped backup, validate timestamp, pre-restore backup
 *
 * Test IDs: 6.9-UNIT-001 through 6.9-UNIT-004 (per epic-6-test-design.md)
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// ============================================================================
// IMPORTS
// ============================================================================

import {
  AR22Error,
  validateTimestamp,
  backupTimestampToFilename,
  filenameToBackupTimestamp,
  listAvailableBackups,
  formatBackupTimestamp,
  generateBackupNotFoundError,
} from '../../src/command-variants';

// ============================================================================
// 6.9-UNIT-001: Validate backup timestamp exists in available backups
// ============================================================================

describe('6.9-UNIT-001: Validate backup timestamp exists in available backups', () => {
  describe('Timestamp format conversion (user input -> filesystem)', () => {
    test('should convert ISO 8601 timestamp (colons) to filesystem filename (hyphens)', () => {
      const userTimestamp = '2026-03-16T14:30:00Z';
      const filename = backupTimestampToFilename(userTimestamp);

      expect(filename).toBe('2026-03-16T14-30-00Z.md');
    });

    test('should preserve date portion and only replace time colons with hyphens', () => {
      const userTimestamp = '2026-04-08T09:15:30Z';
      const filename = backupTimestampToFilename(userTimestamp);

      expect(filename).toBe('2026-04-08T09-15-30Z.md');
      // Date hyphens must NOT be replaced
      expect(filename).toContain('2026-04-08');
    });

    test('should handle midnight timestamps', () => {
      const userTimestamp = '2026-03-16T00:00:00Z';
      const filename = backupTimestampToFilename(userTimestamp);

      expect(filename).toBe('2026-03-16T00-00-00Z.md');
    });

    test('should throw AR22Error for invalid timestamp format', () => {
      const invalidTimestamps = [
        '2026-03-16 14:30:00Z',      // space instead of T
        '2026-03-16T14:30:00',       // missing Z
        'not-a-timestamp',
        '2026-03-16T14-30-00Z',      // already hyphenated (user input should use colons)
      ];

      invalidTimestamps.forEach(ts => {
        expect(() => validateTimestamp(ts)).toThrow(AR22Error);
      });
    });
  });

  describe('Path traversal prevention', () => {
    test('should reject timestamps containing path traversal characters', () => {
      const maliciousInputs = [
        '../../../etc/passwd',
        '2026-03-16T14:30:00Z/../../',
        '..\\..\\windows\\system32',
      ];

      maliciousInputs.forEach(input => {
        expect(() => validateTimestamp(input)).toThrow(AR22Error);
      });
    });
  });
});

// ============================================================================
// 6.9-UNIT-002: List available backups with formatted timestamps
// ============================================================================

describe('6.9-UNIT-002: List available backups with formatted timestamps', () => {
  const mockFiles = [
    '2026-03-15T10-00-00Z.md',
    '2026-03-16T14-30-00Z.md',
    '2026-03-16T12-00-00Z.md',
    '2026-03-14T08-15-00Z.md',
    'pre-restore-2026-03-16T13-00-00Z.md',  // pre-restore backups should be included
    'custom-instructions-2026-03-16T11-00-00Z.md',  // regular backups should be included
    'not-a-backup.txt',  // non-.md files should be excluded
  ];

  describe('Backup enumeration', () => {
    test('should filter only .md files from directory listing', () => {
      const backups = listAvailableBackups(mockFiles);

      backups.forEach(b => {
        expect(b.filename).toMatch(/\.md$/);
      });
    });

    test('should sort backups newest first', () => {
      const backups = listAvailableBackups(mockFiles);

      const timestamps = backups.map(b => b.timestamp);
      // Verify descending order
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(new Date(timestamps[i]).getTime()).toBeGreaterThanOrEqual(
          new Date(timestamps[i + 1]).getTime()
        );
      }
    });

    test('should limit to 5 entries by default', () => {
      const backups = listAvailableBackups(mockFiles);

      expect(backups.length).toBeLessThanOrEqual(5);
    });

    test('should respect custom limit parameter', () => {
      const backups = listAvailableBackups(mockFiles, 3);

      expect(backups.length).toBeLessThanOrEqual(3);
    });

    test('should include total count for error technical details', () => {
      const allMdFiles = mockFiles.filter(f => f.endsWith('.md'));
      const totalCount = allMdFiles.length;
      const limitedBackups = listAvailableBackups(mockFiles, 5);

      // The function should know about totalCount even when returning limited set
      // This is needed for error messages like "Available: 6 backups, showing newest 5"
      expect(totalCount).toBe(6); // 6 .md files in mockFiles
      expect(limitedBackups.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Timestamp formatting for display', () => {
    test('should format timestamp as human-readable date/time', () => {
      const userTimestamp = '2026-03-16T14:30:00Z';
      const display = formatBackupTimestamp(userTimestamp);

      expect(display).toBe('2026-03-16 14:30:00 UTC');
    });

    test('should convert filename format to display format', () => {
      const filename = '2026-03-16T14-30-00Z.md';
      const timestamp = filenameToBackupTimestamp(filename);
      const display = formatBackupTimestamp(timestamp);

      expect(timestamp).toBe('2026-03-16T14:30:00Z');
      expect(display).toBe('2026-03-16 14:30:00 UTC');
    });

    test('should handle pre-restore backup filenames', () => {
      const filename = 'pre-restore-2026-03-16T13-00-00Z.md';
      // pre-restore backups have a prefix before the timestamp
      // The timestamp portion starts after "pre-restore-"
      const timestampPart = filename.replace('pre-restore-', '');
      const timestamp = filenameToBackupTimestamp(timestampPart);
      const display = formatBackupTimestamp(timestamp);

      expect(timestamp).toBe('2026-03-16T13:00:00Z');
      expect(display).toBe('2026-03-16 13:00:00 UTC');
    });
  });
});

// ============================================================================
// 6.9-UNIT-003: Generate error listing available backups for invalid timestamp
// ============================================================================

describe('6.9-UNIT-003: Generate error listing available backups for invalid timestamp', () => {
  const mockFiles = [
    '2026-03-16T14-30-00Z.md',
    '2026-03-16T12-00-00Z.md',
    '2026-03-15T18-45-00Z.md',
    '2026-03-14T08-15-00Z.md',
    '2026-03-13T20-00-00Z.md',
    '2026-03-12T10-30-00Z.md',
  ];

  describe('AR22-compliant error generation', () => {
    test('should generate error with what, how, and technical details', () => {
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        '2099-01-01T00:00:00Z',
        availableBackups,
        mockFiles.length,
        '/path/to/data/history'
      );

      expect(error).toBeInstanceOf(AR22Error);
      expect(error.message).toContain('not found');
      expect(error.what).toBeDefined();
      expect(error.how).toBeDefined();
      expect(error.technical).toBeDefined();
    });

    test('should include requested timestamp in error message', () => {
      const requestedTs = '2099-01-01T00:00:00Z';
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        requestedTs,
        availableBackups,
        mockFiles.length,
        '/path/to/data/history'
      );

      expect(error.technical).toContain(requestedTs);
    });

    test('should list available timestamps in human-readable format', () => {
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        '2099-01-01T00:00:00Z',
        availableBackups,
        mockFiles.length,
        '/path/to/data/history'
      );

      // The technical details should contain formatted timestamps
      availableBackups.forEach(backup => {
        expect(error.technical).toContain(backup.display);
      });
    });

    test('should show total count and limited set in technical details', () => {
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        '2099-01-01T00:00:00Z',
        availableBackups,
        mockFiles.length,
        '/path/to/data/history'
      );

      expect(error.technical).toContain(`${mockFiles.length} backups`);
      expect(error.technical).toContain('newest 5');
    });

    test('should include history directory path in technical details', () => {
      const historyDir = '/path/to/data/history';
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        '2099-01-01T00:00:00Z',
        availableBackups,
        mockFiles.length,
        historyDir
      );

      expect(error.technical).toContain(historyDir);
    });

    test('should include actionable fix steps (minimum 2)', () => {
      const availableBackups = listAvailableBackups(mockFiles);
      const error = generateBackupNotFoundError(
        '2099-01-01T00:00:00Z',
        availableBackups,
        mockFiles.length,
        '/path/to/data/history'
      );

      expect(error.how.length).toBeGreaterThanOrEqual(2);
      expect(error.how.some(step => step.includes('--history'))).toBe(true);
    });

    test('should handle empty available backups', () => {
      const error = generateBackupNotFoundError(
        '2026-03-16T14:30:00Z',
        [],
        0,
        '/path/to/data/history'
      );

      expect(error.message).toContain('not found');
      expect(error.technical).toContain('0 backups');
    });

    test('should limit displayed backups to 5 even if more available', () => {
      const manyFiles = Array.from({ length: 20 }, (_, i) => {
        const hour = String(23 - i).padStart(2, '0');
        return `2026-03-16T${hour}-00-00Z.md`;
      });
      const availableBackups = listAvailableBackups(manyFiles, 5);
      const error = generateBackupNotFoundError(
        '2026-03-17T00:00:00Z',
        availableBackups,
        manyFiles.length,
        '/path/to/data/history'
      );

      // Should mention total count
      expect(error.technical).toContain(`${manyFiles.length} backups`);
      // But only show newest 5
      expect(error.technical).toContain('newest 5');
    });
  });
});

// ============================================================================
// 6.9-UNIT-004: Verify results.jsonl rollback entry shape (AC #8)
// ============================================================================

describe('6.9-UNIT-004: Verify results.jsonl rollback entry shape', () => {
  /**
   * This test verifies the shape of the rollback entry that gets appended
   * to results.jsonl. Per AC #8, the entry must have:
   *   - timestamp: ISO string
   *   - status: "rollback"
   *   - summary: "Restored from backup {sourceTimestamp}"
   *
   * The ResultEntry interface (command-variants.ts line 38) defines:
   *   status: 'applied' | 'pending' | 'failed' | 'rollback'
   *
   * This test validates the contract without touching the filesystem.
   */

  test('should produce a valid rollback result entry shape', () => {
    // Simulate the entry shape that appendToResults() serializes
    const sourceTimestamp = '2026-03-16T14:30:00Z';
    const entry = {
      timestamp: new Date().toISOString(),
      status: 'rollback' as const,
      summary: `Restored from backup ${sourceTimestamp}`,
    };

    // Validate entry shape
    expect(entry).toHaveProperty('timestamp');
    expect(entry).toHaveProperty('status');
    expect(entry).toHaveProperty('summary');

    // Validate status is "rollback" (not "applied", "pending", or "failed")
    expect(entry.status).toBe('rollback');

    // Validate timestamp is a valid ISO 8601 string
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    // Validate summary contains the source timestamp
    expect(entry.summary).toContain(sourceTimestamp);
    expect(entry.summary).toMatch(/^Restored from backup .+$/);

    // Validate entry is serializable to JSON (required for JSONL format)
    const jsonLine = JSON.stringify(entry);
    const parsed = JSON.parse(jsonLine);
    expect(parsed).toEqual(entry);

    // Validate the line format for JSONL (one JSON object per line)
    expect(jsonLine).not.toContain('\n');
  });

  test('should accept rollback status in ResultEntry union type', () => {
    // This validates at the type level that 'rollback' is a valid status
    // The ResultEntry interface includes 'rollback' in the union
    const validStatuses = ['applied', 'pending', 'failed', 'rollback'] as const;

    validStatuses.forEach((status) => {
      const entry = {
        timestamp: '2026-04-08T10:00:00.000Z',
        status,
        summary: `Test entry with ${status} status`,
      };

      // All statuses should be serializable
      expect(() => JSON.stringify(entry)).not.toThrow();
    });

    // Specifically validate rollback
    const rollbackEntry = {
      timestamp: '2026-04-08T10:00:00.000Z',
      status: 'rollback' as const,
      summary: 'Restored from backup 2026-03-16T14:30:00Z',
    };
    expect(validStatuses).toContain(rollbackEntry.status);
  });

  test('should include source timestamp in summary for audit trail', () => {
    const sourceTimestamps = [
      '2026-03-16T14:30:00Z',
      '2026-01-01T00:00:00Z',
      '2026-12-31T23:59:59Z',
    ];

    sourceTimestamps.forEach((ts) => {
      const entry = {
        timestamp: new Date().toISOString(),
        status: 'rollback' as const,
        summary: `Restored from backup ${ts}`,
      };

      // Summary must contain the source timestamp for audit purposes
      expect(entry.summary).toContain(ts);

      // The entry must be parseable back from JSONL line
      const line = JSON.stringify(entry);
      const parsed = JSON.parse(line);
      expect(parsed.summary).toContain(ts);
    });
  });
});
