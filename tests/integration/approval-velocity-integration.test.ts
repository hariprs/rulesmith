/**
 * Integration Tests for Approval Velocity Warning (Story 6-6)
 *
 * Tests the integration of approval velocity checking with:
 * - Review/approval flow (velocity check before applying changes)
 * - Results.jsonl recording (metrics persistence)
 * - Confirmation prompt flow (blocking prompt when warning triggers)
 *
 * NOTE: This is the TDD red phase — no production code exists yet.
 * All tests are expected to fail with module import errors.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  checkApprovalVelocity,
  generateVelocityWarning,
  recordApprovalVelocity,
  APPROVAL_VELOCITY_THRESHOLD_SECONDS,
  requestVelocityConfirmation,
  checkApprovalVelocityWithDiagnostics,
} from '../../src/approval-velocity';

// ============================================================================
// VELOCITY CHECK + REVIEW FLOW INTEGRATION
// ============================================================================

describe('Approval Velocity — Review Flow Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity-integration');

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

  test('should trigger warning and produce AR22 message when approvals are too fast', () => {
    // Simulate a review session with fast approvals
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:02Z',
      '2026-04-08T10:30:04Z',
      '2026-04-08T10:30:06Z',
      '2026-04-08T10:30:08Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    expect(velocityResult.shouldWarn).toBe(true);
    expect(velocityResult.averageTime).toBe(2);

    // Generate the warning message for display
    const warningMessage = generateVelocityWarning(velocityResult.averageTime!, velocityResult.threshold);
    expect(warningMessage).toContain('\u26A0\uFE0F');
    expect(warningMessage).toContain('What happened');
    expect(warningMessage).toContain('How to fix');
    expect(warningMessage).toContain('Technical details');
  });

  test('should allow proceeding when approvals are at adequate pace', () => {
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:10Z',
      '2026-04-08T10:30:22Z',
      '2026-04-08T10:30:35Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    expect(velocityResult.shouldWarn).toBe(false);
    expect(velocityResult.averageTime).toBeGreaterThan(5);
  });

  test('should not block review flow when insufficient data (AC4)', () => {
    // User approved only one change — should not warn, should not throw
    const approvalTimestamps = ['2026-04-08T10:30:00Z'];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    expect(velocityResult.shouldWarn).toBe(false);
    expect(velocityResult.averageTime).toBeNull();
    expect(velocityResult.changeCount).toBe(1);
  });

  test('should handle mixed valid/invalid timestamps in review flow (AC5)', () => {
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      'corrupted-timestamp',
      '2026-04-08T10:30:03Z',
      '',
      '2026-04-08T10:30:07Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    // Only 3 valid timestamps → deltas: 3s, 4s → avg 3.5s → shouldWarn
    expect(velocityResult.shouldWarn).toBe(true);
    expect(velocityResult.averageTime).toBe(3.5);
    expect(velocityResult.changeCount).toBe(3);
  });
});

// ============================================================================
// VELOCITY METRICS TRACKING — RESULTS.JSONL INTEGRATION
// ============================================================================

describe('Approval Velocity — Results.jsonl Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity-results');
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

  test('should record velocity metrics after a review session with warning', () => {
    // Simulate a session
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:03Z',
      '2026-04-08T10:30:05Z',
      '2026-04-08T10:30:06Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    const sessionData = {
      timestamp: new Date().toISOString(),
      average_review_time_seconds: velocityResult.averageTime,
      changes_reviewed: velocityResult.changeCount,
      warning_triggered: velocityResult.shouldWarn,
      threshold_seconds: velocityResult.threshold,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim());
    expect(record.warning_triggered).toBe(true);
    expect(record.average_review_time_seconds).toBe(2);
    expect(record.changes_reviewed).toBe(4);
    expect(record.threshold_seconds).toBe(5);
  });

  test('should record metrics even when no warning was triggered', () => {
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:15Z',
      '2026-04-08T10:30:32Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    const sessionData = {
      timestamp: new Date().toISOString(),
      average_review_time_seconds: velocityResult.averageTime,
      changes_reviewed: velocityResult.changeCount,
      warning_triggered: velocityResult.shouldWarn,
      threshold_seconds: velocityResult.threshold,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim());
    expect(record.warning_triggered).toBe(false);
    expect(record.average_review_time_seconds).toBe(16);
  });

  test('should handle results.jsonl write failure without blocking approval flow (AC3)', () => {
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:02Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    const sessionData = {
      timestamp: new Date().toISOString(),
      average_review_time_seconds: velocityResult.averageTime,
      changes_reviewed: velocityResult.changeCount,
      warning_triggered: velocityResult.shouldWarn,
      threshold_seconds: velocityResult.threshold,
    };

    // Should not throw even with unwritable path
    const unwritablePath = '/nonexistent/deeply/nested/path/results.jsonl';
    expect(() => recordApprovalVelocity(unwritablePath, sessionData)).not.toThrow();

    // Velocity result is still valid for the flow decision
    expect(velocityResult.shouldWarn).toBe(true);
  });

  test('should preserve existing results.jsonl entries when appending', () => {
    // Pre-populate with existing entries
    const existingEntries = [
      JSON.stringify({ action: 'rule_analysis', timestamp: '2026-04-08T10:00:00Z', patterns: 3 }),
      JSON.stringify({ action: 'rule_update', timestamp: '2026-04-08T10:15:00Z', changes: 1 }),
    ];
    fs.writeFileSync(testResultsFile, existingEntries.join('\n') + '\n');

    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 4.0,
      changes_reviewed: 6,
      warning_triggered: true,
      threshold_seconds: 5,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const lines = fs.readFileSync(testResultsFile, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(3);

    // Existing entries preserved
    expect(JSON.parse(lines[0]).action).toBe('rule_analysis');
    expect(JSON.parse(lines[1]).action).toBe('rule_update');

    // New entry appended
    const velocityRecord = JSON.parse(lines[2]);
    expect(velocityRecord.average_review_time_seconds).toBe(4.0);
    expect(velocityRecord.warning_triggered).toBe(true);
  });

  test('should handle null average time for insufficient data sessions (AC4)', () => {
    const approvalTimestamps = ['2026-04-08T10:30:00Z'];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    const sessionData = {
      timestamp: new Date().toISOString(),
      average_review_time_seconds: velocityResult.averageTime, // null
      changes_reviewed: velocityResult.changeCount,
      warning_triggered: velocityResult.shouldWarn,
      threshold_seconds: velocityResult.threshold,
    };

    recordApprovalVelocity(testResultsFile, sessionData);

    const content = fs.readFileSync(testResultsFile, 'utf-8');
    const record = JSON.parse(content.trim());
    expect(record.average_review_time_seconds).toBeNull();
    expect(record.changes_reviewed).toBe(1);
    expect(record.warning_triggered).toBe(false);
  });
});

// ============================================================================
// END-TO-END VELOCITY CHECK PIPELINE (API-level, not browser)
// ============================================================================

describe('Approval Velocity — Full Pipeline (API-level)', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity-pipeline');
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

  test('should complete full velocity check pipeline within performance budget (<50ms)', () => {
    // NFR1-NFR3: velocity calculation must complete in < 50ms
    const approvalTimestamps = Array.from({ length: 100 }, (_, i) => {
      const d = new Date('2026-04-08T10:30:00Z');
      d.setSeconds(d.getSeconds() + i * 2);
      return d.toISOString();
    });

    const start = Date.now();

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);
    const warning = velocityResult.shouldWarn
      ? generateVelocityWarning(velocityResult.averageTime!, velocityResult.threshold)
      : '';

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(50);
    expect(velocityResult.changeCount).toBe(100);
    expect(warning.length === 0 || warning.includes('\u26A0\uFE0F')).toBe(true);
  });

  test('should handle out-of-order timestamps and produce correct warning', () => {
    // Simulate user approving in non-sequential order
    const outOfOrderTimestamps = [
      '2026-04-08T10:30:10Z',
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:06Z',
      '2026-04-08T10:30:03Z',
      '2026-04-08T10:30:08Z',
    ];

    // Step 1: Parse and sort
    const velocityResult = checkApprovalVelocity(outOfOrderTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);

    // Sorted: 0, 3, 6, 8, 10 → deltas: 3, 3, 2, 2 → avg: 2.5
    expect(velocityResult.shouldWarn).toBe(true);
    expect(velocityResult.averageTime).toBeCloseTo(2.5, 2);

    // Step 2: Generate warning
    const warning = generateVelocityWarning(velocityResult.averageTime!, velocityResult.threshold, velocityResult.hasNegativeDeltas);
    expect(warning).toContain('2.5');
    expect(warning).toContain('Technical details');
    expect(warning).toContain('5');
  });

  test('should integrate requestVelocityConfirmation in review flow (headless mode)', async () => {
    // Simulate a full flow: check velocity -> warning triggers -> request confirmation
    const approvalTimestamps = [
      '2026-04-08T10:30:00Z',
      '2026-04-08T10:30:01Z',
      '2026-04-08T10:30:02Z',
    ];

    const velocityResult = checkApprovalVelocity(approvalTimestamps, APPROVAL_VELOCITY_THRESHOLD_SECONDS);
    expect(velocityResult.shouldWarn).toBe(true);

    // In headless mode, confirmation defaults to true (proceed)
    const confirmed = await requestVelocityConfirmation(velocityResult.averageTime!);
    expect(confirmed).toBe(true);
  });
});

// ============================================================================
// DIAGNOSTIC RECORDING INTEGRATION (AC5)
// ============================================================================

describe('Approval Velocity — Diagnostic Recording Integration (AC5)', () => {
  const testDir = path.join(__dirname, '../fixtures/approval-velocity-diagnostic-integration');
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

  test('should record diagnostic entry alongside regular session records', () => {
    // Session 1: all invalid timestamps -> diagnostic entry
    checkApprovalVelocityWithDiagnostics(['bad', 'worse'], 5, testResultsFile);

    // Session 2: valid timestamps -> regular record
    const sessionData = {
      timestamp: '2026-04-08T10:30:00Z',
      average_review_time_seconds: 3.0,
      changes_reviewed: 3,
      warning_triggered: true,
      threshold_seconds: 5,
    };
    recordApprovalVelocity(testResultsFile, sessionData);

    const lines = fs.readFileSync(testResultsFile, 'utf-8').trim().split('\n');
    expect(lines).toHaveLength(2);

    const diagnosticRecord = JSON.parse(lines[0]);
    expect(diagnosticRecord.action).toBe('velocity_check_skipped');
    expect(diagnosticRecord.reason).toBe('no_valid_timestamps');

    const sessionRecord = JSON.parse(lines[1]);
    expect(sessionRecord.average_review_time_seconds).toBe(3.0);
  });
});
