/**
 * Integration Tests for Rule Conflict Detection (Story 6-7)
 *
 * Tests cover:
 * - Conflict detection integration with review flow
 * - Auto-approval bypass prevention
 * - results.jsonl recording
 *
 * NOTE: This is the TDD red phase — no production code exists yet.
 * All tests are expected to fail with module import errors.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  detectRuleConflicts,
  ConflictDetectionResult,
} from '../../src/rules/conflict-detection';
import {
  excludeConflictingFromAutoApproval,
  generateConflictSummary,
  recordConflictDetection,
} from '../../src/review/conflict-integration';

// ============================================================================
// AC2 + AC3: Review interface integration
// ============================================================================

describe('Conflict review integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-conflict-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should generate conflict summary for review output', () => {
    const conflicts: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        {
          existingRule: 'Always use TypeScript',
          newRule: 'Never use TypeScript',
          conflictType: 'contradiction',
          severity: 'high',
          reason: "Existing rule says 'Always use TypeScript', new rule says 'Never use TypeScript'",
        },
      ],
      totalCompared: 1,
    };

    const summary = generateConflictSummary(conflicts);
    expect(summary).toContain('[CONFLICT]');
    expect(summary).toContain('Always use TypeScript');
    expect(summary).toContain('Never use TypeScript');
    expect(summary.toLowerCase()).toContain('high');
  });

  test('should return empty summary when no conflicts', () => {
    const conflicts: ConflictDetectionResult = {
      hasConflicts: false,
      conflicts: [],
      totalCompared: 5,
    };

    const summary = generateConflictSummary(conflicts);
    expect(summary).toBe('');
  });

  test('should include all four resolution options in prompt', () => {
    const conflicts: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        {
          existingRule: 'Rule A',
          newRule: 'Rule B',
          conflictType: 'contradiction',
          severity: 'high',
          reason: 'Contradiction detected',
        },
      ],
      totalCompared: 1,
    };

    const summary = generateConflictSummary(conflicts);
    expect(summary.toLowerCase()).toContain('keep existing');
    expect(summary.toLowerCase()).toContain('keep new');
    expect(summary.toLowerCase()).toContain('merge');
    expect(summary.toLowerCase()).toContain('discard both');
  });
});

// ============================================================================
// AC4: Auto-approval bypass prevention
// ============================================================================

describe('Auto-approval bypass prevention (AC4)', () => {
  test('should exclude all rules from auto-approval when all are conflicting', () => {
    const allRules = ['Rule A', 'Rule B'];
    const conflictingRuleIndices = new Set([0, 1]);

    const result = excludeConflictingFromAutoApproval(allRules, conflictingRuleIndices);

    expect(result.approvable).toHaveLength(0);
    expect(result.excluded).toHaveLength(2);
    expect(result.exclusionMessage).toContain('2 rule(s) excluded');
  });

  test('should exclude only conflicting rules from auto-approval', () => {
    const allRules = ['Rule A', 'Rule B', 'Rule C'];
    const conflictingRuleIndices = new Set([1]); // Only Rule B conflicts

    const result = excludeConflictingFromAutoApproval(allRules, conflictingRuleIndices);

    expect(result.approvable).toEqual(['Rule A', 'Rule C']);
    expect(result.excluded).toEqual(['Rule B']);
    expect(result.exclusionMessage).toContain('1 rule(s) excluded');
  });

  test('should allow all rules when none are conflicting', () => {
    const allRules = ['Rule A', 'Rule B', 'Rule C'];
    const conflictingRuleIndices = new Set<number>();

    const result = excludeConflictingFromAutoApproval(allRules, conflictingRuleIndices);

    expect(result.approvable).toEqual(['Rule A', 'Rule B', 'Rule C']);
    expect(result.excluded).toHaveLength(0);
    expect(result.exclusionMessage).toBe('');
  });

  test('should return correct message format', () => {
    const allRules = ['Rule A', 'Rule B'];
    const conflictingRuleIndices = new Set([0]);

    const result = excludeConflictingFromAutoApproval(allRules, conflictingRuleIndices);

    expect(result.exclusionMessage).toMatch(
      /1 rule\(s\) excluded from auto-approval due to conflicts/
    );
    expect(result.exclusionMessage).toContain('Resolve conflicts manually');
  });

  test('should handle empty rules array', () => {
    const result = excludeConflictingFromAutoApproval([], new Set());

    expect(result.approvable).toHaveLength(0);
    expect(result.excluded).toHaveLength(0);
  });
});

// ============================================================================
// AC5: Conflict metrics and logging
// ============================================================================

describe('Conflict metrics recording (AC5)', () => {
  let tempDir: string;
  let resultsPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), 'test-conflict-metrics-'));
    resultsPath = path.join(tempDir, 'results.jsonl');
    // Create empty results.jsonl
    fs.writeFileSync(resultsPath, '');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('should append conflict detection entry to results.jsonl', () => {
    recordConflictDetection(resultsPath, {
      timestamp: '2026-04-08T10:00:00Z',
      action: 'conflict_detection',
      conflicts_found: 2,
      rules_compared: 10,
      resolution_actions: ['keep_existing', 'merge'],
    });

    const content = fs.readFileSync(resultsPath, 'utf-8').trim();
    const entries = content.split('\n').map((line) => JSON.parse(line));

    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('conflict_detection');
    expect(entries[0].conflicts_found).toBe(2);
    expect(entries[0].rules_compared).toBe(10);
    expect(entries[0].resolution_actions).toEqual(['keep_existing', 'merge']);
  });

  test('should use snake_case field names (AR19)', () => {
    recordConflictDetection(resultsPath, {
      timestamp: '2026-04-08T10:00:00Z',
      action: 'conflict_detection',
      conflicts_found: 1,
      rules_compared: 5,
      resolution_actions: [],
    });

    const content = fs.readFileSync(resultsPath, 'utf-8').trim();
    const entry = JSON.parse(content);

    expect(entry).toHaveProperty('conflicts_found');
    expect(entry).toHaveProperty('rules_compared');
    expect(entry).toHaveProperty('resolution_actions');
    expect(entry).not.toHaveProperty('conflictsFound');
    expect(entry).not.toHaveProperty('rulesCompared');
  });

  test('should not block review flow on write failure', () => {
    const invalidPath = '/nonexistent/path/results.jsonl';

    expect(() =>
      recordConflictDetection(invalidPath, {
        timestamp: '2026-04-08T10:00:00Z',
        action: 'conflict_detection',
        conflicts_found: 0,
        rules_compared: 0,
        resolution_actions: [],
      })
    ).not.toThrow();
  });

  test('should use ISO 8601 UTC timestamp (AR20)', () => {
    recordConflictDetection(resultsPath, {
      timestamp: '2026-04-08T10:00:00Z',
      action: 'conflict_detection',
      conflicts_found: 0,
      rules_compared: 0,
      resolution_actions: [],
    });

    const content = fs.readFileSync(resultsPath, 'utf-8').trim();
    const entry = JSON.parse(content);

    expect(entry.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  });
});

// ============================================================================
// AC3: Unresolved conflicts block approval
// ============================================================================

describe('Unresolved conflicts block approval (AC3)', () => {
  test('should detect when conflicts are unresolved', () => {
    const conflicts: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        {
          existingRule: 'Rule A',
          newRule: 'Rule B',
          conflictType: 'contradiction',
          severity: 'high',
          reason: 'Contradiction',
        },
      ],
      totalCompared: 1,
    };
    const resolutions: Record<number, string> = {}; // No resolutions

    const allResolved = conflicts.conflicts.every((_: unknown, i: number) => i in resolutions);
    expect(allResolved).toBe(false);
  });

  test('should allow approval when all conflicts are resolved', () => {
    const conflicts: ConflictDetectionResult = {
      hasConflicts: true,
      conflicts: [
        {
          existingRule: 'Rule A',
          newRule: 'Rule B',
          conflictType: 'contradiction',
          severity: 'high',
          reason: 'Contradiction',
        },
      ],
      totalCompared: 1,
    };
    const resolutions: Record<number, string> = { 0: 'keep_existing' };

    const allResolved = conflicts.conflicts.every((_: unknown, i: number) => i in resolutions);
    expect(allResolved).toBe(true);
  });
});
