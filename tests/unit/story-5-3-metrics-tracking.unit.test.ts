/**
 * ATDD Tests: Story 5.3 - Track Metrics Over Time (YOLO Approach)
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for metric calculation functions.
 *
 * Test Pyramid Level: Unit Tests (business logic)
 * Coverage: Story 5.3 Tasks 1, 2, 3 - Metric calculation and validation
 *
 * Acceptance Criteria Coverage:
 *   AC1: Track improvements_applied metric
 *   AC2: Calculate and track corrections_reduction percentage
 *   AC3: Track approval_rate percentage
 *   AC4: Calculate metrics from results.jsonl historical data
 *   AC5: Filter patterns below 75% approval rate (business logic)
 *   AC8: Handle edge cases in metric calculation
 *   AC9: Validate metric value ranges
 *
 * @module unit/story-5-3-metrics-tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  calculateImprovementsApplied,
  calculateCorrectionsReduction,
  calculateApprovalRate,
  calculatePatternApprovalRate,
  validateMetricValue,
  updateMetrics,
} from '../../src/state-management';

describe('Story 5.3: Track Metrics Over Time - Unit Tests (TDD Red Phase)', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-metrics');

  beforeEach(() => {
    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Helper: Create results.jsonl with test data
  function createResultsJsonl(entries: any[]): void {
    const resultsPath = path.join(testDir, 'results.jsonl');
    const content = entries.map(entry => JSON.stringify(entry)).join('\n');
    fs.writeFileSync(resultsPath, content + '\n', { mode: 0o600 });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AC1: Track improvements_applied metric
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC1: Track improvements_applied metric', () => {
    test('should calculate improvements_applied as cumulative count from results.jsonl', async () => {
      // Given: results.jsonl with multiple sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 2, approved: 3, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 4, approved: 1, rejected: 2, patterns_found: [] },
      ]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should sum all approved values (2 + 3 + 1 = 6)
      expect(improvements).toBe(6);
    });

    test('should initialize to 0 on first run (empty results.jsonl)', async () => {
      // Given: Empty results.jsonl
      createResultsJsonl([]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should return 0
      expect(improvements).toBe(0);
    });

    test('should handle results.jsonl with only rejected changes (approved: 0)', async () => {
      // Given: results.jsonl with all rejected changes
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 3, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 2, approved: 0, rejected: 2, patterns_found: [] },
      ]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should return 0
      expect(improvements).toBe(0);
    });

    test('should handle results.jsonl with only approved changes (rejected: 0)', async () => {
      // Given: results.jsonl with all approved changes
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 2, approved: 3, rejected: 0, patterns_found: [] },
      ]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should return 8
      expect(improvements).toBe(8);
    });

    test('should recalculate from results.jsonl (not use state.json value)', async () => {
      // Given: results.jsonl with specific data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 1, patterns_found: [] },
      ]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should return 5 (from results.jsonl, not from state.json)
      expect(improvements).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC2: Calculate and track corrections_reduction percentage
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC2: Calculate and track corrections_reduction percentage', () => {
    test('should calculate corrections_reduction as ratio from baseline (first 3) to current (last 3)', async () => {
      // Given: results.jsonl with 6 sessions
      // Baseline (first 3): rejected counts [5, 4, 6] = avg 5.0
      // Current (last 3): rejected counts [2, 1, 1] = avg 1.33
      // Expected: (5.0 - 1.33) / 5.0 = 0.734
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 6, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 1, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return ratio 0-1 (approximately 0.734)
      expect(reduction).toBeGreaterThan(0.7);
      expect(reduction).toBeLessThan(0.8);
    });

    test('should return 0 when insufficient data (< 3 sessions) - NOT null', async () => {
      // Given: results.jsonl with only 2 sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 1, rejected: 3, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 0 (NOT null - validation requires number 0-1)
      expect(reduction).toBe(0);
      expect(typeof reduction).toBe('number');
    });

    test('should return 0 for single session', async () => {
      // Given: results.jsonl with 1 session
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 0
      expect(reduction).toBe(0);
    });

    test('should return 0 for empty results.jsonl', async () => {
      // Given: Empty results.jsonl
      createResultsJsonl([]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 0
      expect(reduction).toBe(0);
    });

    test('should handle exactly 3 sessions (baseline = current)', async () => {
      // Given: results.jsonl with exactly 3 sessions
      // All sessions have same rejected count
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 0 (no improvement: (5 - 5) / 5 = 0)
      expect(reduction).toBe(0);
    });

    test('should clamp result to 0-1 range', async () => {
      // Given: results.jsonl where current > baseline (worsening)
      // Baseline: avg 2, Current: avg 5
      // Formula: (2 - 5) / 2 = -1.5 → should clamp to 0
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should clamp to 0 (not negative)
      expect(reduction).toBe(0);
    });

    test('should return 1.0 when corrections eliminated (current = 0)', async () => {
      // Given: results.jsonl with improvement to 0 corrections
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 1.0 (100% reduction)
      expect(reduction).toBe(1.0);
    });

    test('should store as ratio 0-1 (not percentage)', async () => {
      // Given: results.jsonl with 50% reduction
      // Baseline: avg 4, Current: avg 2
      // Formula: (4 - 2) / 4 = 0.5
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 2, patterns_found: [] },
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: Should return 0.5 (ratio), not 50 (percentage)
      expect(reduction).toBe(0.5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC3: Track approval_rate percentage
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC3: Track approval_rate percentage', () => {
    test('should calculate approval_rate as percentage (approved / total * 100)', async () => {
      // Given: results.jsonl with 50% approval rate
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 3, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return 50.0 (percentage)
      expect(approvalRate).toBe(50.0);
    });

    test('should return 100% for all approved changes', async () => {
      // Given: results.jsonl with all approved
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 0, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return 100.0
      expect(approvalRate).toBe(100.0);
    });

    test('should return 0% for all rejected changes', async () => {
      // Given: results.jsonl with all rejected
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 3, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return 0.0
      expect(approvalRate).toBe(0.0);
    });

    test('should return null for empty results.jsonl (no suggestions)', async () => {
      // Given: Empty results.jsonl
      createResultsJsonl([]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return null (division by zero)
      expect(approvalRate).toBeNull();
    });

    test('should return null when total_suggestions is 0', async () => {
      // Given: results.jsonl with no approved or rejected (patterns: 0)
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 0, approved: 0, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 0, approved: 0, rejected: 0, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return null (division by zero)
      expect(approvalRate).toBeNull();
    });

    test('should calculate across all sessions in results.jsonl', async () => {
      // Given: results.jsonl with multiple sessions
      // Total approved: 2+3+1+4 = 10
      // Total rejected: 1+0+2+1 = 4
      // Total suggestions: 14
      // Approval rate: (10 / 14) * 100 = 71.43
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 1, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 5, approved: 4, rejected: 1, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return approximately 71.43
      expect(approvalRate).toBeCloseTo(71.43, 1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC5: Filter patterns below 75% approval rate (business logic)
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC5: Pattern-level approval rate calculation (business logic)', () => {
    test('should calculate pattern approval rate from sessions where pattern appears', async () => {
      // Given: results.jsonl with pattern appearing in 4 sessions
      // Pattern appears in all 4 sessions, approved in 3 of them
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 3,
          approved: 2,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'prefer-async-await', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-02T10:00:00Z',
          patterns: 3,
          approved: 3,
          rejected: 0,
          patterns_found: [
            { pattern_text: 'prefer-async-await', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-03T10:00:00Z',
          patterns: 3,
          approved: 1,
          rejected: 2,
          patterns_found: [
            { pattern_text: 'prefer-async-await', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-04T10:00:00Z',
          patterns: 3,
          approved: 2,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'prefer-async-await', category: 'code_style', count: 1 }
          ]
        },
      ]);

      // When: Calculating pattern approval rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const patternApprovalRate = await calculatePatternApprovalRate('prefer-async-await', resultsPath);

      // Then: Should return 75.0 (3 approved out of 4 sessions where pattern appeared)
      expect(patternApprovalRate).toBe(75.0);
    });

    test('should return null when pattern never appears in results.jsonl', async () => {
      // Given: results.jsonl without the pattern
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 3,
          approved: 2,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'other-pattern', category: 'code_style', count: 1 }
          ]
        },
      ]);

      // When: Calculating pattern approval rate for non-existent pattern
      const resultsPath = path.join(testDir, 'results.jsonl');
      const patternApprovalRate = await calculatePatternApprovalRate('prefer-async-await', resultsPath);

      // Then: Should return null (pattern never suggested)
      expect(patternApprovalRate).toBeNull();
    });

    test('should identify patterns below 75% approval threshold', async () => {
      // Given: Pattern with 50% approval (2 approved out of 4 sessions)
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 3,
          approved: 1,
          rejected: 2,
          patterns_found: [
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-02T10:00:00Z',
          patterns: 3,
          approved: 0,
          rejected: 3,
          patterns_found: [
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-03T10:00:00Z',
          patterns: 3,
          approved: 1,
          rejected: 2,
          patterns_found: [
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-04T10:00:00Z',
          patterns: 3,
          approved: 0,
          rejected: 3,
          patterns_found: [
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 }
          ]
        },
      ]);

      // When: Calculating pattern approval rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const patternApprovalRate = await calculatePatternApprovalRate('low-quality-pattern', resultsPath);

      // Then: Should return 50.0 (below 75% threshold)
      expect(patternApprovalRate).toBe(50.0);
      expect(patternApprovalRate).toBeLessThan(75.0);
    });

    test('should handle pattern appearing in sessions but with no approvals (0%)', async () => {
      // Given: Pattern always rejected
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 3,
          approved: 0,
          rejected: 3,
          patterns_found: [
            { pattern_text: 'bad-pattern', category: 'code_style', count: 1 }
          ]
        },
        {
          timestamp: '2026-04-02T10:00:00Z',
          patterns: 3,
          approved: 0,
          rejected: 3,
          patterns_found: [
            { pattern_text: 'bad-pattern', category: 'code_style', count: 1 }
          ]
        },
      ]);

      // When: Calculating pattern approval rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const patternApprovalRate = await calculatePatternApprovalRate('bad-pattern', resultsPath);

      // Then: Should return 0.0
      expect(patternApprovalRate).toBe(0.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC8: Handle edge cases in metric calculation
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC8: Handle edge cases in metric calculation', () => {
    test('should handle corrupted JSONL entries gracefully (skip corrupted lines)', async () => {
      // Given: results.jsonl with corrupted entries
      const resultsPath = path.join(testDir, 'results.jsonl');
      const content = [
        JSON.stringify({ timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1, patterns_found: [] }),
        '{invalid json}',
        JSON.stringify({ timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 0, patterns_found: [] }),
        'also invalid',
        JSON.stringify({ timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 1, rejected: 2, patterns_found: [] }),
      ].join('\n') + '\n';
      fs.writeFileSync(resultsPath, content, { mode: 0o600 });

      // When: Calculating improvements_applied (should skip corrupted lines)
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should only count valid entries (2 + 3 + 1 = 6)
      expect(improvements).toBe(6);
    });

    test('should handle results.jsonl with missing fields (use defaults)', async () => {
      // Given: results.jsonl with entries missing optional fields
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1 }, // Missing patterns_found
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3 }, // Missing rejected and patterns_found
      ]);

      // When: Calculating improvements_applied
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should use defaults for missing fields (rejected defaults to 0)
      expect(improvements).toBe(5); // 2 + 3
    });

    test('should handle first run (no results.jsonl file)', async () => {
      // Given: No results.jsonl file exists
      const resultsPath = path.join(testDir, 'results.jsonl');

      // When: Calculating metrics
      const improvements = await calculateImprovementsApplied(resultsPath);
      const reduction = await calculateCorrectionsReduction(resultsPath);
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return defaults
      expect(improvements).toBe(0);
      expect(reduction).toBe(0); // NOT null - validation requires number
      expect(approvalRate).toBeNull();
    });

    test('should handle results.jsonl with only whitespace', async () => {
      // Given: results.jsonl with only whitespace
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '   \n\n  \n', { mode: 0o600 });

      // When: Calculating metrics
      const improvements = await calculateImprovementsApplied(resultsPath);
      const reduction = await calculateCorrectionsReduction(resultsPath);
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should return defaults
      expect(improvements).toBe(0);
      expect(reduction).toBe(0);
      expect(approvalRate).toBeNull();
    });

    test('should handle very large numbers (no overflow)', async () => {
      // Given: results.jsonl with large counts
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 1000000, approved: 500000, rejected: 500000, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 1000000, approved: 500000, rejected: 500000, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 1000000, approved: 500000, rejected: 500000, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 1000000, approved: 250000, rejected: 250000, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 1000000, approved: 250000, rejected: 250000, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 1000000, approved: 250000, rejected: 250000, patterns_found: [] },
      ]);

      // When: Calculating metrics
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);
      const reduction = await calculateCorrectionsReduction(resultsPath);
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: Should handle large numbers correctly
      expect(improvements).toBe(2250000);
      expect(reduction).toBe(0.5); // (500000 - 250000) / 500000
      expect(approvalRate).toBe(50.0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC9: Validate metric value ranges
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC9: Validate metric value ranges', () => {
    test('should validate improvements_applied is non-negative integer', () => {
      // Given: Valid improvements_applied value
      const result = validateMetricValue('improvements_applied', 100);

      // Then: Should pass validation
      expect(result.valid).toBe(true);
    });

    test('should reject negative improvements_applied', () => {
      // Given: Negative improvements_applied value
      const result = validateMetricValue('improvements_applied', -1);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('non-negative');
    });

    test('should reject non-integer improvements_applied', () => {
      // Given: Non-integer improvements_applied value
      const result = validateMetricValue('improvements_applied', 5.5);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('integer');
    });

    test('should validate corrections_reduction is ratio 0-1 (NEVER null)', () => {
      // Given: Valid corrections_reduction value
      const result = validateMetricValue('corrections_reduction', 0.5);

      // Then: Should pass validation
      expect(result.valid).toBe(true);
    });

    test('should reject corrections_reduction > 1', () => {
      // Given: corrections_reduction > 1
      const result = validateMetricValue('corrections_reduction', 1.5);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0-1');
    });

    test('should reject corrections_reduction < 0', () => {
      // Given: Negative corrections_reduction
      const result = validateMetricValue('corrections_reduction', -0.1);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0-1');
    });

    test('should REJECT null for corrections_reduction (validation requires number)', () => {
      // Given: null corrections_reduction
      const result = validateMetricValue('corrections_reduction', null);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a number');
    });

    test('should validate approval_rate is percentage 0-100 or null', () => {
      // Given: Valid approval_rate values
      const result1 = validateMetricValue('approval_rate', 50.0);
      const result2 = validateMetricValue('approval_rate', 0);
      const result3 = validateMetricValue('approval_rate', 100);
      const result4 = validateMetricValue('approval_rate', null);

      // Then: Should pass validation
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result3.valid).toBe(true);
      expect(result4.valid).toBe(true); // null is allowed for approval_rate
    });

    test('should reject approval_rate > 100', () => {
      // Given: approval_rate > 100
      const result = validateMetricValue('approval_rate', 101.0);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0-100');
    });

    test('should reject approval_rate < 0', () => {
      // Given: Negative approval_rate
      const result = validateMetricValue('approval_rate', -1.0);

      // Then: Should fail validation
      expect(result.valid).toBe(false);
      expect(result.error).toContain('0-100');
    });

    test('should reject NaN for all metrics', () => {
      // Given: NaN values
      const result1 = validateMetricValue('improvements_applied', NaN);
      const result2 = validateMetricValue('corrections_reduction', NaN);
      const result3 = validateMetricValue('approval_rate', NaN);

      // Then: Should fail validation
      expect(result1.valid).toBe(false);
      expect(result2.valid).toBe(false);
      expect(result3.valid).toBe(false);
    });

    test('should clamp invalid corrections_reduction to valid range', () => {
      // Given: Invalid corrections_reduction value
      const clamped = validateMetricValue('corrections_reduction', 1.5).value ?? 0;

      // Then: Should clamp to 1.0
      expect(clamped).toBe(1.0);
    });

    test('should set invalid improvements_applied to 0 (safe default)', () => {
      // Given: Invalid improvements_applied value
      const safeDefault = validateMetricValue('improvements_applied', -5).value ?? 0;

      // Then: Should set to 0
      expect(safeDefault).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Performance: AC6 - Update metrics within 1 second
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC6: Performance requirements', () => {
    test('should complete metric calculation within 1 second for typical data', async () => {
      // Given: results.jsonl with 100 sessions
      const entries = [];
      for (let i = 0; i < 100; i++) {
        entries.push({
          timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
          patterns: 3,
          approved: Math.floor(Math.random() * 5),
          rejected: Math.floor(Math.random() * 5),
          patterns_found: [],
        });
      }
      createResultsJsonl(entries);

      // When: Calculating all metrics
      const startTime = performance.now();
      const resultsPath = path.join(testDir, 'results.jsonl');
      await Promise.all([
        calculateImprovementsApplied(resultsPath),
        calculateCorrectionsReduction(resultsPath),
        calculateApprovalRate(resultsPath),
      ]);
      const elapsed = performance.now() - startTime;

      // Then: Should complete within 1 second
      expect(elapsed).toBeLessThan(1000);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Business Logic: Metric calculation formulas
  // ═══════════════════════════════════════════════════════════════════════

  describe('Business Logic: Metric calculation formulas', () => {
    test('should use correct field names from results.jsonl (patterns, approved, rejected)', async () => {
      // Given: results.jsonl with correct field names
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 2, rejected: 1, patterns_found: [] },
      ]);

      // When: Calculating metrics
      const resultsPath = path.join(testDir, 'results.jsonl');
      const improvements = await calculateImprovementsApplied(resultsPath);

      // Then: Should use 'approved' field (not 'approved_count')
      expect(improvements).toBe(2);
    });

    test('should calculate approval_rate as (total_approved / total_suggestions) * 100', async () => {
      // Given: results.jsonl
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 2, rejected: 2, patterns_found: [] },
      ]);

      // When: Calculating approval_rate
      const resultsPath = path.join(testDir, 'results.jsonl');
      const approvalRate = await calculateApprovalRate(resultsPath);

      // Then: (3 + 2) / ((3+1) + (2+2)) * 100 = 5 / 8 * 100 = 62.5
      expect(approvalRate).toBe(62.5);
    });

    test('should calculate corrections_reduction using first 3 vs last 3 sessions', async () => {
      // Given: results.jsonl with 6 sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 10, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 10, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 10, patterns_found: [] }, // Baseline avg: 10
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] }, // Current avg: 5
      ]);

      // When: Calculating corrections_reduction
      const resultsPath = path.join(testDir, 'results.jsonl');
      const reduction = await calculateCorrectionsReduction(resultsPath);

      // Then: (10 - 5) / 10 = 0.5
      expect(reduction).toBe(0.5);
    });
  });
});
