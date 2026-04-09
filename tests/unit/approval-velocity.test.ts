/**
 * Unit Tests for Approval Velocity Warning (Story 6-6)
 *
 * Tests cover all acceptance criteria:
 * - AC1: Warning displayed when avg review time < 5s (AR22-compliant format)
 * - AC3: Velocity metrics tracked in results.jsonl
 * - AC4: Insufficient data handling (single/zero approvals)
 * - AC5: Missing/corrupted timestamp handling
 * - AC6: Out-of-order timestamps sorted chronologically
 *
 * NOTE: This is the TDD red phase — no production code exists yet.
 * All tests are expected to fail with module import errors.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  APPROVAL_VELOCITY_THRESHOLD_SECONDS,
  parseAndFilterTimestamps,
  calculateAverageReviewTime,
  checkApprovalVelocity,
  generateVelocityWarning,
  recordApprovalVelocity,
  requestVelocityConfirmation,
  checkApprovalVelocityWithDiagnostics,
} from '../../src/approval-velocity';

// ============================================================================
// TEST UTILITIES
// ============================================================================

function iso(...args: ConstructorParameters<typeof Date>): string {
  return new Date(...args).toISOString();
}

// ============================================================================
// CONSTANTS AND EXPORTS
// ============================================================================

describe('Approval Velocity Constants', () => {
  test('APPROVAL_VELOCITY_THRESHOLD_SECONDS should be 5', () => {
    expect(APPROVAL_VELOCITY_THRESHOLD_SECONDS).toBe(5);
  });
});

// ============================================================================
// parseAndFilterTimestamps — AC5, AC6
// ============================================================================

describe('parseAndFilterTimestamps', () => {
  test('should parse valid ISO 8601 timestamps', () => {
    const timestamps = ['2026-04-08T10:30:00Z', '2026-04-08T10:30:03Z', '2026-04-08T10:30:05Z'];
    const result = parseAndFilterTimestamps(timestamps);
    expect(result).toHaveLength(3);
    expect(result[0].toISOString()).toBe('2026-04-08T10:30:00.000Z');
    expect(result[1].toISOString()).toBe('2026-04-08T10:30:03.000Z');
    expect(result[2].toISOString()).toBe('2026-04-08T10:30:05.000Z');
  });

  test('should filter out completely invalid timestamps', () => {
    const timestamps = ['2026-04-08T10:30:00Z', 'not-a-date', '', 'garbage', '2026-04-08T10:30:05Z'];
    const result = parseAndFilterTimestamps(timestamps);
    expect(result).toHaveLength(2);
    expect(result[0].toISOString()).toBe('2026-04-08T10:30:00.000Z');
    expect(result[1].toISOString()).toBe('2026-04-08T10:30:05.000Z');
  });

  test('should filter out non-ISO format strings that parse to Invalid Date', () => {
    const timestamps = ['hello world', '12345', '2026/04/08', null as unknown as string, undefined as unknown as string];
    const result = parseAndFilterTimestamps(timestamps);
    expect(result).toHaveLength(0);
  });

  test('should sort timestamps chronologically (AC6)', () => {
    const outOfOrder = [
      '2026-04-08T10:30:07Z',
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:05Z',
      '2026-04-08T10:30:03Z',
    ];
    const result = parseAndFilterTimestamps(outOfOrder);
    expect(result).toHaveLength(4);
    expect(result[0].toISOString()).toBe('2026-04-08T10:30:00.000Z');
    expect(result[1].toISOString()).toBe('2026-04-08T10:30:03.000Z');
    expect(result[2].toISOString()).toBe('2026-04-08T10:30:05.000Z');
    expect(result[3].toISOString()).toBe('2026-04-08T10:30:07.000Z');
  });

  test('should handle empty array', () => {
    const result = parseAndFilterTimestamps([]);
    expect(result).toHaveLength(0);
  });

  test('should handle array with all invalid timestamps', () => {
    const result = parseAndFilterTimestamps(['bad', 'worse', 'terrible']);
    expect(result).toHaveLength(0);
  });

  test('should handle timestamps with milliseconds', () => {
    const timestamps = [
      '2026-04-08T10:30:00.123Z',
      '2026-04-08T10:30:03.456Z',
    ];
    const result = parseAndFilterTimestamps(timestamps);
    expect(result).toHaveLength(2);
    expect(result[0].toISOString()).toBe('2026-04-08T10:30:00.123Z');
    expect(result[1].toISOString()).toBe('2026-04-08T10:30:03.456Z');
  });

  test('should handle timezone offsets (not just Z suffix)', () => {
    const timestamps = [
      '2026-04-08T10:30:00+05:30',
      '2026-04-08T10:30:05-04:00',
    ];
    const result = parseAndFilterTimestamps(timestamps);
    // Both should parse successfully (even if converted to UTC internally)
    expect(result).toHaveLength(2);
  });
});

// ============================================================================
// calculateAverageReviewTime — AC1, AC4, AC6
// ============================================================================

describe('calculateAverageReviewTime', () => {
  test('should return null for zero timestamps (AC4)', () => {
    const result = calculateAverageReviewTime([]);
    expect(result.averageTime).toBeNull();
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should return null for single timestamp (AC4)', () => {
    const result = calculateAverageReviewTime([new Date('2026-04-08T10:30:00Z')]);
    expect(result.averageTime).toBeNull();
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should compute average for two timestamps', () => {
    const timestamps = [
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:03Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBe(3);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should compute average for multiple timestamps', () => {
    // Deltas: 3s, 2s, 2s → average = 7/3 = 2.333...
    const timestamps = [
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:03Z'),
      new Date('2026-04-08T10:30:05Z'),
      new Date('2026-04-08T10:30:07Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBeCloseTo(2.333, 2);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should handle already-sorted timestamps', () => {
    const timestamps = [
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:10Z'),
      new Date('2026-04-08T10:30:20Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBe(10);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should handle out-of-order timestamps by computing deltas on sorted order (AC6)', () => {
    // Note: sorted order is 0, 3, 5, 7 → deltas 3, 2, 2 → avg 2.333
    const timestamps = [
      new Date('2026-04-08T10:30:07Z'),
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:05Z'),
      new Date('2026-04-08T10:30:03Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBeCloseTo(2.333, 2);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should handle very large deltas (user stepped away)', () => {
    // 2 hour gap + 3 seconds → average = (7200 + 3) / 2 = 3601.5
    const timestamps = [
      new Date('2026-04-08T10:00:00Z'),
      new Date('2026-04-08T12:00:00Z'),
      new Date('2026-04-08T12:00:03Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBe(3601.5);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should handle zero-second deltas (instant approvals)', () => {
    const timestamps = [
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:00Z'),
      new Date('2026-04-08T10:30:00Z'),
    ];
    const result = calculateAverageReviewTime(timestamps);
    expect(result.averageTime).toBe(0);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should always return hasNegativeDeltas=false because function defensively sorts (dead-code verification)', () => {
    // Gap #1 (traceability): Direct call to calculateAverageReviewTime with dates that would
    // produce negative deltas if NOT sorted. Since the function defensively sorts internally,
    // hasNegativeDeltas is dead code — it can never be true.
    // Pass dates in reverse chronological order: if processed raw, deltas would all be negative.
    const reverseChronological = [
      new Date('2026-04-08T10:30:07Z'),
      new Date('2026-04-08T10:30:05Z'),
      new Date('2026-04-08T10:30:00Z'),
    ];
    const result = calculateAverageReviewTime(reverseChronological);

    // The function sorts internally, so deltas are computed on [0, 5, 7] → avg 3.5s
    expect(result.averageTime).toBe(3.5);
    // hasNegativeDeltas is always false because sorting happens before delta computation
    expect(result.hasNegativeDeltas).toBe(false);
  });
});

// ============================================================================
// checkApprovalVelocity — AC1, AC4, AC5, AC6
// ============================================================================

describe('checkApprovalVelocity', () => {
  test('should return shouldWarn=false for zero approvals (AC4)', () => {
    const result = checkApprovalVelocity([], 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBeNull();
    expect(result.changeCount).toBe(0);
    expect(result.threshold).toBe(5);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should return shouldWarn=false for single approval (AC4)', () => {
    const result = checkApprovalVelocity(['2026-04-08T10:30:00Z'], 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBeNull();
    expect(result.changeCount).toBe(1);
    expect(result.threshold).toBe(5);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should warn when average review time is below threshold (AC1)', () => {
    // Average: (3 + 2 + 2) / 3 = 2.33s < 5s → shouldWarn
    const timestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:03Z',
      '2026-04-08T10:30:05Z',
      '2026-04-08T10:30:07Z',
    ];
    const result = checkApprovalVelocity(timestamps, 5);
    expect(result.shouldWarn).toBe(true);
    expect(result.averageTime).toBeCloseTo(2.333, 2);
    expect(result.changeCount).toBe(4);
    expect(result.threshold).toBe(5);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should NOT warn when average review time is above threshold', () => {
    // Average: (10 + 8) / 2 = 9s > 5s → no warning
    const timestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:10Z',
      '2026-04-08T10:30:18Z',
    ];
    const result = checkApprovalVelocity(timestamps, 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBe(9);
    expect(result.changeCount).toBe(3);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should NOT warn when average review time equals threshold', () => {
    // Average: exactly 5s → should NOT warn (strictly less than)
    const timestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:05Z',
      '2026-04-08T10:30:10Z',
    ];
    const result = checkApprovalVelocity(timestamps, 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBe(5);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should filter invalid timestamps and compute from valid ones (AC5)', () => {
    const timestamps = [
      '2026-04-08T10:30:00Z',
      'not-a-date',
      '2026-04-08T10:30:06Z',
      'garbage',
      '2026-04-08T10:30:12Z',
    ];
    const result = checkApprovalVelocity(timestamps, 5);
    // Valid deltas: 6s, 6s → avg 6s → no warning
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBe(6);
    expect(result.changeCount).toBe(3); // 3 valid timestamps
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should handle all-invalid timestamps gracefully (AC5)', () => {
    const timestamps = ['bad', 'worse', 'terrible'];
    const result = checkApprovalVelocity(timestamps, 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBeNull();
    expect(result.changeCount).toBe(0);
    expect(result.hasNegativeDeltas).toBe(false);
  });

  test('should use custom threshold when provided', () => {
    const timestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:03Z',
    ];
    // With threshold=10, avg=3 → no warn. With threshold=2, avg=3 → warn.
    const resultBelow = checkApprovalVelocity(timestamps, 10);
    const resultAbove = checkApprovalVelocity(timestamps, 2);
    expect(resultBelow.shouldWarn).toBe(true); // 3 < 10
    expect(resultAbove.shouldWarn).toBe(false); // 3 >= 2
  });

  test('should sort out-of-order timestamps before computing (AC6)', () => {
    const outOfOrder = [
      '2026-04-08T10:30:07Z',
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:05Z',
    ];
    const result = checkApprovalVelocity(outOfOrder, 5);
    // Sorted: 0, 5, 7 → deltas: 5, 2 → avg: 3.5 → shouldWarn
    expect(result.shouldWarn).toBe(true);
    expect(result.averageTime).toBeCloseTo(3.5, 2);
    expect(result.hasNegativeDeltas).toBe(false);
  });
});

// ============================================================================
// generateVelocityWarning — AC1 (AR22 format)
// ============================================================================

describe('generateVelocityWarning', () => {
  test('should include warning icon and main message', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).toContain('\u26A0\uFE0F');
    expect(warning).toContain('Please review carefully');
    expect(warning).toContain('insufficient consideration');
  });

  test('should include AR22 "What happened" section', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).toContain('What happened');
  });

  test('should include AR22 "How to fix" section', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).toContain('How to fix');
  });

  test('should include AR22 "Technical details" section with actual values', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).toContain('Technical details');
    expect(warning).toContain('3.2');
    expect(warning).toContain('5');
  });

  test('should format average time in technical details', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).toMatch(/Average.*3\.2.*per change/i);
    expect(warning).toMatch(/threshold.*5/i);
  });

  test('should handle very fast approval times', () => {
    const warning = generateVelocityWarning(0.5, 5);
    expect(warning).toContain('0.5');
    expect(warning).toContain('5');
  });

  test('should handle borderline approval times (just under threshold)', () => {
    const warning = generateVelocityWarning(4.9, 5);
    expect(warning).toContain('4.9');
  });

  test('should produce all four AR22 sections', () => {
    const warning = generateVelocityWarning(2.0, 5);
    // AR22 sections: brief description (present via main message), what happened, how to fix, technical details
    const sections = ['What happened', 'How to fix', 'Technical details'];
    sections.forEach((section) => {
      expect(warning).toContain(section);
    });
    // Brief description is in the opening line
    expect(warning.length).toBeGreaterThan(50);
  });

  test('should include negative delta note when hasNegativeDeltas is true', () => {
    const warning = generateVelocityWarning(3.2, 5, true);
    expect(warning).toContain('Note: 1 or more negative time gaps detected');
    expect(warning).toContain('clock adjustment');
  });

  test('should NOT include negative delta note when hasNegativeDeltas is false', () => {
    const warning = generateVelocityWarning(3.2, 5, false);
    expect(warning).not.toContain('negative time gaps');
    expect(warning).not.toContain('clock adjustment');
  });

  test('should NOT include negative delta note when hasNegativeDeltas is undefined', () => {
    const warning = generateVelocityWarning(3.2, 5);
    expect(warning).not.toContain('negative time gaps');
  });
});

// ============================================================================
// requestVelocityConfirmation — AC2
// ============================================================================

describe('requestVelocityConfirmation', () => {
  test('should return Promise<boolean>', async () => {
    const result = requestVelocityConfirmation(3.2);
    expect(result).toBeInstanceOf(Promise);
    const resolved = await result;
    expect(typeof resolved).toBe('boolean');
  });

  test('should default to true in headless/test mode (no TTY)', async () => {
    // In test environment, stdin/stdout are not TTY
    const result = await requestVelocityConfirmation(3.2);
    // In headless mode, defaults to proceed (true)
    expect(result).toBe(true);
  });

  test('should handle undefined averageTime gracefully', async () => {
    const result = await requestVelocityConfirmation();
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// checkApprovalVelocityWithDiagnostics — AC5
// ============================================================================

describe('checkApprovalVelocityWithDiagnostics', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity-diagnostics');
  const testResultsFile = path.join(testDir, 'results.jsonl');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testResultsFile)) {
      fs.unlinkSync(testResultsFile);
    }
  });

  test('should record diagnostic entry when all timestamps are invalid (AC5)', () => {
    const timestamps = ['bad', 'worse', 'terrible'];
    const result = checkApprovalVelocityWithDiagnostics(timestamps, 5, testResultsFile);

    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBeNull();
    expect(result.changeCount).toBe(0);

    // Check diagnostic entry was written
    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim());
    expect(record.action).toBe('velocity_check_skipped');
    expect(record.reason).toBe('no_valid_timestamps');
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('should NOT record diagnostic entry when some timestamps are valid', () => {
    const timestamps = ['2026-04-08T10:30:00Z', 'bad', '2026-04-08T10:30:05Z'];
    const result = checkApprovalVelocityWithDiagnostics(timestamps, 5, testResultsFile);

    // 2 valid timestamps, delta = 5s, avg = 5s which is NOT < 5 (strict comparison)
    expect(result.shouldWarn).toBe(false);
    expect(result.averageTime).toBe(5);
    expect(result.changeCount).toBe(2);

    // No diagnostic entry should be written (file should not exist or be empty)
    expect(fs.existsSync(testResultsFile)).toBe(false);
  });

  test('should NOT record diagnostic entry when no timestamps provided', () => {
    const result = checkApprovalVelocityWithDiagnostics([], 5, testResultsFile);
    expect(result.shouldWarn).toBe(false);
    expect(result.changeCount).toBe(0);
    expect(fs.existsSync(testResultsFile)).toBe(false);
  });

  test('should work without resultsPath (no diagnostic recording)', () => {
    const timestamps = ['bad', 'worse'];
    const result = checkApprovalVelocityWithDiagnostics(timestamps, 5);
    expect(result.shouldWarn).toBe(false);
    expect(result.changeCount).toBe(0);
  });
});

// ============================================================================
// recordApprovalVelocity — AC3
// ============================================================================

describe('recordApprovalVelocity', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity');
  const testResultsFile = path.join(testDir, 'results.jsonl');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(testResultsFile)) {
      fs.unlinkSync(testResultsFile);
    }
  });

  test('should append velocity record to results.jsonl (AC3)', () => {
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 3.2,
      changes_reviewed: 4,
      warning_triggered: true,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim().split('\n').pop()!);
    expect(record.average_review_time_seconds).toBe(3.2);
    expect(record.changes_reviewed).toBe(4);
    expect(record.warning_triggered).toBe(true);
    expect(record.threshold_seconds).toBe(5);
  });

  test('should use snake_case field names (AC3, AR19)', () => {
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 7.5,
      changes_reviewed: 10,
      warning_triggered: false,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim().split('\n').pop()!);
    expect(record).toHaveProperty('average_review_time_seconds');
    expect(record).toHaveProperty('changes_reviewed');
    expect(record).toHaveProperty('warning_triggered');
    expect(record).toHaveProperty('threshold_seconds');
    expect(record).toHaveProperty('timestamp');
    // Should NOT have camelCase fields
    expect(record).not.toHaveProperty('averageReviewTimeSeconds');
    expect(record).not.toHaveProperty('changesReviewed');
  });

  test('should handle null average_review_time_seconds (AC4)', () => {
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: null,
      changes_reviewed: 1,
      warning_triggered: false,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim().split('\n').pop()!);
    expect(record.average_review_time_seconds).toBeNull();
  });

  test('should append without overwriting existing entries (append-only)', () => {
    // Write an existing entry
    fs.writeFileSync(testResultsFile, '{"existing": "data"}\n');

    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 4.0,
      changes_reviewed: 5,
      warning_triggered: true,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const lines = fs.readFileSync(testResultsFile, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('{"existing": "data"}');
    const newRecord = JSON.parse(lines[1]);
    expect(newRecord.average_review_time_seconds).toBe(4.0);
  });

  test('should not throw on write failure (best-effort logging, AC3)', () => {
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 2.0,
      changes_reviewed: 3,
      warning_triggered: true,
      threshold_seconds: 5,
    };

    // Pass an unwritable path — should not throw
    const unwritablePath = '/root/impossible-to-write/results.jsonl';
    expect(() => recordApprovalVelocity(unwritablePath, sessionData)).not.toThrow();
  });

  test('should use ISO 8601 UTC timestamp format (AR20)', () => {
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 1.5,
      changes_reviewed: 8,
      warning_triggered: true,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim().split('\n').pop()!);
    expect(record.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
