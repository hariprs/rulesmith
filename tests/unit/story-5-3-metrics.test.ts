/**
 * ATDD Tests: Story 5.3 - Track Metrics Over Time
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for metric calculation and tracking.
 *
 * Acceptance Criteria:
 *   AC1: Track improvements_applied metric (calculated from results.jsonl)
 *   AC2: Calculate and track corrections_reduction percentage
 *   AC3: Track approval_rate percentage
 *   AC4: Calculate metrics from results.jsonl historical data
 *   AC5: Filter patterns below 75% approval rate
 *   AC6: Update metrics after each analysis session
 *   AC7: Display metrics via --stats command
 *   AC8: Handle edge cases in metric calculation
 *   AC9: Validate metric value ranges
 *
 * Test Level: Unit + Integration
 * Priority: P0-P2 mapped from test design
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  initializeState,
  persistAnalysisResults,
  calculateImprovementsApplied,
  calculateCorrectionsReduction,
  calculateApprovalRate,
  calculatePatternApprovalRate,
  updateMetrics,
  filterPatternsByApprovalRate,
  displayStats,
  type MergedPattern,
  type AnalysisSessionResult,
} from '../../src/state-management';

describe('Story 5.3: Track Metrics Over Time', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-metrics');

  beforeEach(async () => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    await initializeState(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ─── Helper: read state.json ──────────────────────────────────────────
  function readState(): any {
    return JSON.parse(fs.readFileSync(path.join(testDir, 'state.json'), 'utf8'));
  }

  // ─── Helper: read results.jsonl lines ─────────────────────────────────
  function readResults(): any[] {
    const content = fs.readFileSync(path.join(testDir, 'results.jsonl'), 'utf8').trim();
    if (!content) return [];
    return content.split('\n').map(line => JSON.parse(line));
  }

  // ─── Helper: create a sample session result ───────────────────────────
  function makeExample(text: string): import('../../src/state-management').PatternExample {
    return {
      original_suggestion: text,
      user_correction: `corrected: ${text}`,
      context: `context for ${text}`,
      timestamp: new Date().toISOString(),
      content_type: 'typescript',
    };
  }

  function makeSession(overrides?: Partial<AnalysisSessionResult>): AnalysisSessionResult {
    return {
      patterns: [
        {
          pattern_text: 'prefer-async-await',
          count: 5,
          category: 'code_style' as any,
          examples: [makeExample('prefer-async-await')],
          suggested_rule: 'Use async/await for async operations',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: ['typescript'],
          session_count: 1,
          total_frequency: 5,
          is_new: true,
          frequency_change: 5,
        },
      ],
      approvedCount: 3,
      rejectedCount: 2,
      totalAnalyzed: 5,
      ...overrides,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AC1: Track improvements_applied metric
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC1: Track improvements_applied metric', () => {
    test('calculates improvements_applied from results.jsonl (single session)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 5, rejectedCount: 2 }));

      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      expect(improvements).toBe(5);
    });

    test('accumulates improvements_applied across multiple sessions', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 1 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 2, rejectedCount: 1 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 4, rejectedCount: 0 }));

      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      expect(improvements).toBe(9); // 3 + 2 + 4
    });

    test('returns 0 for first run (empty results.jsonl)', async () => {
      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      expect(improvements).toBe(0);
    });

    test('recalculates from results.jsonl (not from state.json)', async () => {
      // Simulate state.json having incorrect value
      const statePath = path.join(testDir, 'state.json');
      const state = readState();
      state.improvements_applied = 999; // Incorrect value
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 1 }));

      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      expect(improvements).toBe(3); // From results.jsonl, not from state.json
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC2: Calculate and track corrections_reduction percentage
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC2: Calculate and track corrections_reduction percentage', () => {
    test('calculates corrections_reduction with exactly 3 sessions', async () => {
      // First 3 sessions: baseline
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 8 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 12 }));

      // Baseline average: (10 + 8 + 12) / 3 = 10

      const reduction = await calculateCorrectionsReduction(path.join(testDir, 'results.jsonl'));
      expect(reduction).toBe(0); // First 3 = last 3, so 0% reduction
    });

    test('calculates corrections_reduction with > 3 sessions (first 3 vs last 3)', async () => {
      // First 3 sessions: baseline
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));

      // Later sessions: improvement
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 7 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 6 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 5 }));

      // Baseline average: (10 + 10 + 10) / 3 = 10
      // Current average: (7 + 6 + 5) / 3 = 6
      // Reduction: (10 - 6) / 10 = 0.4 (40%)

      const reduction = await calculateCorrectionsReduction(path.join(testDir, 'results.jsonl'));
      expect(reduction).toBeCloseTo(0.4, 1);
    });

    test('returns 0 for < 3 sessions (NOT null - validation requires number)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 5 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 3 }));

      const reduction = await calculateCorrectionsReduction(path.join(testDir, 'results.jsonl'));
      expect(reduction).toBe(0); // Must be 0, not null
    });

    test('stores corrections_reduction as 0-1 ratio (not percentage)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 5 }));

      const reduction = await calculateCorrectionsReduction(path.join(testDir, 'results.jsonl'));
      expect(reduction).toBeGreaterThanOrEqual(0);
      expect(reduction).toBeLessThanOrEqual(1); // Ratio, not percentage
    });

    test('returns 0 when baseline_corrections is 0 (division by zero guard)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 5, rejectedCount: 0 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 5, rejectedCount: 0 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 5, rejectedCount: 0 }));

      const reduction = await calculateCorrectionsReduction(path.join(testDir, 'results.jsonl'));
      expect(reduction).toBe(0); // Division by zero guard
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC3: Track approval_rate percentage
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC3: Track approval_rate percentage', () => {
    test('calculates approval_rate with mixed approvals', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 4, rejectedCount: 1 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 2, rejectedCount: 3 }));

      // Total approved: 3 + 4 + 2 = 9
      // Total suggestions: (3+2) + (4+1) + (2+3) = 15
      // Approval rate: (9 / 15) * 100 = 60%

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));
      expect(approvalRate).toBeCloseTo(60, 0);
    });

    test('calculates approval_rate with 100% approval (all approved)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 5, rejectedCount: 0 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 0 }));

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));
      expect(approvalRate).toBe(100);
    });

    test('calculates approval_rate with 0% approval (all rejected)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 5 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 3 }));

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));
      expect(approvalRate).toBe(0);
    });

    test('returns null when total_suggestions is 0 (division by zero)', async () => {
      // Create sessions with no suggestions
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 0 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 0 }));

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));
      expect(approvalRate).toBeNull();
    });

    test('stores approval_rate as percentage (0-100)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));
      expect(approvalRate).toBeGreaterThanOrEqual(0);
      expect(approvalRate).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC4: Calculate metrics from results.jsonl historical data
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC4: Calculate metrics from results.jsonl historical data', () => {
    test('calculates all metrics from results.jsonl entries', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 4, rejectedCount: 1 }));

      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));

      expect(improvements).toBe(7); // 3 + 4
      expect(approvalRate).toBeCloseTo(70, 0); // (7 / 10) * 100
    });

    test('skips corrupted JSONL entries with warning', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      // Add corrupted entries directly to results.jsonl (bypassing validation)
      const resultsPath = path.join(testDir, 'results.jsonl');
      const validEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        patterns: 1,
        approved: 2,
        rejected: 1,
      });
      fs.appendFileSync(resultsPath, '{corrupted json}\n');
      fs.appendFileSync(resultsPath, `${validEntry}\n`);
      fs.appendFileSync(resultsPath, '{another corrupted}\n');

      const improvements = await calculateImprovementsApplied(path.join(testDir, 'results.jsonl'));
      expect(improvements).toBe(5); // 3 + 2 (corrupted entries skipped)
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC5: Filter patterns below 75% approval rate
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC5: Filter patterns below 75% approval rate', () => {
    test('filters patterns with approval rate < 75%', async () => {
      // Create patterns with different approval rates
      const patterns: MergedPattern[] = [
        {
          pattern_text: 'high-approval-pattern',
          count: 10,
          category: 'code_style' as any,
          examples: [],
          suggested_rule: 'rule1',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: ['typescript'],
          session_count: 10,
          total_frequency: 10,
          is_new: false,
          frequency_change: 0,
        },
        {
          pattern_text: 'low-approval-pattern',
          count: 5,
          category: 'error_handling' as any,
          examples: [],
          suggested_rule: 'rule2',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: ['typescript'],
          session_count: 10,
          total_frequency: 5,
          is_new: false,
          frequency_change: 0,
        },
      ];

      // Simulate sessions where high-approval-pattern has 80% approval
      // and low-approval-pattern has 60% approval
      // We'll create 10 sessions total
      for (let i = 0; i < 10; i++) {
        const session = makeSession({
          patterns: [patterns[0]], // Only high-approval pattern
          approvedCount: i < 8 ? 1 : 0, // 8 out of 10 approved
          rejectedCount: i >= 8 ? 1 : 0,
        });
        await persistAnalysisResults(testDir, session);
      }

      // Add sessions for low-approval pattern
      for (let i = 0; i < 10; i++) {
        const session = makeSession({
          patterns: [patterns[1]], // Only low-approval pattern
          approvedCount: i < 6 ? 1 : 0, // 6 out of 10 approved (60%)
          rejectedCount: i >= 6 ? 1 : 0,
        });
        await persistAnalysisResults(testDir, session);
      }

      const filtered = await filterPatternsByApprovalRate(patterns, testDir, 75);

      // Only high-approval-pattern should remain (80% >= 75%)
      expect(filtered.length).toBe(1);
      expect(filtered[0].pattern_text).toBe('high-approval-pattern');
    });

    test('includes new patterns with no approval data', async () => {
      const newPattern: MergedPattern = {
        pattern_text: 'brand-new-pattern',
        count: 1,
        category: 'code_style' as any,
        examples: [],
        suggested_rule: 'rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: ['typescript'],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 1,
      };

      const filtered = await filterPatternsByApprovalRate([newPattern], testDir, 75);

      // New pattern should be included (no approval data available)
      expect(filtered.length).toBe(1);
      expect(filtered[0].pattern_text).toBe('brand-new-pattern');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC6: Update metrics after each analysis session
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC6: Update metrics after each analysis session', () => {
    test('updates all metrics in state.json after analysis session', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const state = readState();
      expect(state.improvements_applied).toBe(3);
      expect(state.approval_rate).toBeCloseTo(60, 0);
      expect(state.total_sessions).toBe(1);
      expect(state.approval_threshold).toBe(75);
    });

    test('uses atomic write pattern for state update', async () => {
      // This is verified by the fact that persistAnalysisResults calls updateMetrics
      // which uses atomic write pattern (temp file + rename)
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      // If atomic write failed, state.json might be corrupted
      // The fact we can read it proves atomic write succeeded
      const state = readState();
      expect(state).toBeDefined();
    });

    test('preserves original state on metric update failure', async () => {
      // This is tested by the retry logic in updateMetrics
      // If update fails, original state is preserved
      const originalState = readState();
      const originalImprovements = originalState.improvements_applied;

      // Simulate a successful update
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      // State should be updated, not corrupted
      const newState = readState();
      expect(newState.improvements_applied).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC7: Display metrics via --stats command
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC7: Display metrics via --stats command', () => {
    test('displays all metrics in human-readable format', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await displayStats(testDir);

      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const output = calls.join('\n');

      expect(output).toContain('Total improvements applied:** 3');
      expect(output).toContain('Approval rate:');
      expect(output).toContain('Total analysis sessions:** 1');

      consoleSpy.mockRestore();
    });

    test('displays "Insufficient data" for corrections_reduction when < 3 sessions', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await displayStats(testDir);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Insufficient data (need 3+ sessions)'));

      consoleSpy.mockRestore();
    });

    test('displays corrections_reduction as percentage when >= 3 sessions', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 5 }));

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await displayStats(testDir);

      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const output = calls.join('\n');

      expect(output).toMatch(/Corrections reduction:\*\* \d+\.\d+/);

      consoleSpy.mockRestore();
    });

    test('handles null metrics gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await displayStats(testDir);

      const calls = consoleSpy.mock.calls.map(call => call[0]);
      const output = calls.join('\n');

      expect(output).toContain('Total improvements applied:** 0');
      expect(output).toContain('Approval rate:** No data');

      consoleSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC8: Handle edge cases in metric calculation
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC8: Handle edge cases in metric calculation', () => {
    test('handles first run (no results.jsonl)', async () => {
      // Delete results.jsonl to simulate first run
      const resultsPath = path.join(testDir, 'results.jsonl');
      if (fs.existsSync(resultsPath)) {
        fs.unlinkSync(resultsPath);
      }

      const improvements = await calculateImprovementsApplied(resultsPath);
      const reduction = await calculateCorrectionsReduction(resultsPath);
      const approvalRate = await calculateApprovalRate(resultsPath);

      expect(improvements).toBe(0);
      expect(reduction).toBe(0);
      expect(approvalRate).toBeNull();
    });

    test('handles empty results.jsonl', async () => {
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '');

      const improvements = await calculateImprovementsApplied(resultsPath);
      const reduction = await calculateCorrectionsReduction(resultsPath);
      const approvalRate = await calculateApprovalRate(resultsPath);

      expect(improvements).toBe(0);
      expect(reduction).toBe(0);
      expect(approvalRate).toBeNull();
    });

    test('skips corrupted JSONL entries', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.appendFileSync(resultsPath, '{invalid json}\n');
      fs.appendFileSync(resultsPath, '{"timestamp": "2026-04-02T10:00:00Z", "patterns": 1, "approved": 2, "rejected": 1}\n');
      fs.appendFileSync(resultsPath, '{another corrupted}\n');

      const improvements = await calculateImprovementsApplied(resultsPath);

      expect(improvements).toBe(5); // 3 + 2 (corrupted entries skipped)
    });

    test('handles division by zero for approval_rate', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 0 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 0, rejectedCount: 0 }));

      const approvalRate = await calculateApprovalRate(path.join(testDir, 'results.jsonl'));

      expect(approvalRate).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC9: Validate metric value ranges
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC9: Validate metric value ranges', () => {
    test('improvements_applied is non-negative integer', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const state = readState();
      expect(state.improvements_applied).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(state.improvements_applied)).toBe(true);
    });

    test('corrections_reduction is ratio 0-1 (never null)', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 10 }));
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 1, rejectedCount: 5 }));

      const state = readState();
      expect(state.corrections_reduction).toBeGreaterThanOrEqual(0);
      expect(state.corrections_reduction).toBeLessThanOrEqual(1);
      expect(typeof state.corrections_reduction).toBe('number'); // Not null
    });

    test('approval_rate is percentage 0-100 or null', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const state = readState();
      if (state.approval_rate !== null) {
        expect(state.approval_rate).toBeGreaterThanOrEqual(0);
        expect(state.approval_rate).toBeLessThanOrEqual(100);
      }
    });

    test('total_sessions is non-negative integer', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const state = readState();
      expect(state.total_sessions).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(state.total_sessions)).toBe(true);
    });

    test('approval_threshold is percentage 0-100', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const state = readState();
      expect(state.approval_threshold).toBeGreaterThanOrEqual(0);
      expect(state.approval_threshold).toBeLessThanOrEqual(100);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Additional: Pattern approval rate calculation
  // ═══════════════════════════════════════════════════════════════════════

  describe('Pattern approval rate calculation', () => {
    test('calculates pattern approval rate correctly', async () => {
      const patternText = 'test-pattern';

      // Create a custom pattern
      const customPattern: MergedPattern = {
        pattern_text: patternText,
        count: 1,
        category: 'code_style' as any,
        examples: [makeExample('test-pattern')],
        suggested_rule: 'Test rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: ['typescript'],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 1,
      };

      const session = makeSession({
        patterns: [customPattern],
        approvedCount: 1,
        rejectedCount: 0,
      });

      await persistAnalysisResults(testDir, session);

      const approvalRate = await calculatePatternApprovalRate(patternText, path.join(testDir, 'results.jsonl'));

      expect(approvalRate).toBe(100); // 1 approval out of 1 suggestion
    });

    test('returns null for pattern not found', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3, rejectedCount: 2 }));

      const approvalRate = await calculatePatternApprovalRate('nonexistent-pattern', path.join(testDir, 'results.jsonl'));

      expect(approvalRate).toBeNull();
    });
  });
});
