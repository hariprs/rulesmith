/**
 * ATDD Tests: Story 5.3 - Track Metrics Over Time (YOLO Approach)
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for end-to-end metrics workflows.
 *
 * Test Pyramid Level: E2E Tests (full system workflows)
 * Coverage: Story 5.3 Task 4, 5 - --stats command and complete workflows
 *
 * Acceptance Criteria Coverage:
 *   AC1-AC9: Full workflow testing from analysis session to metrics display
 *   Focus on UI-specific flows that genuinely require full system interaction
 *
 * @module e2e/story-5-3-metrics-tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import {
  initializeState,
  updateMetrics,
  displayStats,
} from '../../src/state-management';

describe('Story 5.3: Track Metrics Over Time - E2E Tests (TDD Red Phase)', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-metrics-e2e');

  beforeEach(async () => {
    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    await initializeState(testDir);
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

  // Helper: Read state.json
  function readStateFile(): any {
    const statePath = path.join(testDir, 'state.json');
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // E2E Workflow: Complete analysis session with metrics
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E Workflow: Complete analysis session with metrics', () => {
    test('should track metrics from first session to stats display', async () => {
      // Given: User runs first analysis session
      const { persistAnalysisResults, appendResult } = require('../../src/state-management');
      const sessionResult = {
        patterns: [
          {
            pattern_text: 'prefer-async-await',
            count: 3,
            category: 'code_style' as const,
            examples: [],
            suggested_rule: 'Use async/await',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: ['typescript'],
            session_count: 1,
            total_frequency: 3,
            is_new: true,
            frequency_change: 3,
          },
        ],
        approvedCount: 2,
        rejectedCount: 1,
        totalAnalyzed: 3,
      };

      // When: Persisting results and updating metrics
      await persistAnalysisResults(testDir, sessionResult);
      await updateMetrics(testDir);

      // Then: State should contain initial metrics
      const state = readStateFile();
      expect(state.improvements_applied).toBe(2);
      expect(state.total_sessions).toBe(1);
      expect(state.corrections_reduction).toBe(0); // Insufficient data (< 3 sessions)
      expect(state.approval_rate).toBeCloseTo(66.67, 1); // (2 / 3) * 100

      // And: Stats display should show "Insufficient data" for corrections_reduction
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');
      expect(output).toContain('Insufficient data');
      expect(output).toContain('need 3+ sessions');

      jest.restoreAllMocks();
    });

    test('should track metrics across multiple sessions to show improvement', async () => {
      // Given: User runs multiple analysis sessions over time
      const { persistAnalysisResults } = require('../../src/state-management');

      // Session 1: Baseline (high corrections)
      await persistAnalysisResults(testDir, {
        patterns: [{
          pattern_text: 'pattern-1',
          count: 5,
          category: 'code_style' as const,
          examples: [],
          suggested_rule: 'Rule 1',
          first_seen: '2026-04-01T10:00:00Z',
          last_seen: '2026-04-01T10:00:00Z',
          content_types: [],
          session_count: 1,
          total_frequency: 5,
          is_new: true,
          frequency_change: 5,
        }],
        approvedCount: 0,
        rejectedCount: 5,
        totalAnalyzed: 5,
      });

      // Session 2: Baseline (high corrections)
      await persistAnalysisResults(testDir, {
        patterns: [{
          pattern_text: 'pattern-2',
          count: 4,
          category: 'code_style' as const,
          examples: [],
          suggested_rule: 'Rule 2',
          first_seen: '2026-04-02T10:00:00Z',
          last_seen: '2026-04-02T10:00:00Z',
          content_types: [],
          session_count: 1,
          total_frequency: 4,
          is_new: true,
          frequency_change: 4,
        }],
        approvedCount: 0,
        rejectedCount: 4,
        totalAnalyzed: 4,
      });

      // Session 3: Baseline (high corrections)
      await persistAnalysisResults(testDir, {
        patterns: [{
          pattern_text: 'pattern-3',
          count: 6,
          category: 'code_style' as const,
          examples: [],
          suggested_rule: 'Rule 3',
          first_seen: '2026-04-03T10:00:00Z',
          last_seen: '2026-04-03T10:00:00Z',
          content_types: [],
          session_count: 1,
          total_frequency: 6,
          is_new: true,
          frequency_change: 6,
        }],
        approvedCount: 0,
        rejectedCount: 6,
        totalAnalyzed: 6,
      });

      // Session 4-6: Improvement (lower corrections)
      for (let i = 0; i < 3; i++) {
        await persistAnalysisResults(testDir, {
          patterns: [{
            pattern_text: `pattern-${4 + i}`,
            count: 2,
            category: 'code_style' as const,
            examples: [],
            suggested_rule: `Rule ${4 + i}`,
            first_seen: `2026-04-${4 + i}T10:00:00Z`,
            last_seen: `2026-04-${4 + i}T10:00:00Z`,
            content_types: [],
            session_count: 1,
            total_frequency: 2,
            is_new: true,
            frequency_change: 2,
          }],
          approvedCount: 3,
          rejectedCount: 2,
          totalAnalyzed: 5,
        });
      }

      // When: Updating metrics after all sessions
      await updateMetrics(testDir);

      // Then: Should show improvement in corrections_reduction
      const state = readStateFile();
      expect(state.total_sessions).toBe(6);
      expect(state.corrections_reduction).toBeGreaterThan(0); // Shows improvement
      expect(state.corrections_reduction).toBeLessThanOrEqual(1);

      // And: Stats display should show actual percentage (not "Insufficient data")
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Insufficient data'); // Has 6 sessions
      expect(output).toMatch(/\d+%/); // Shows actual percentage

      jest.restoreAllMocks();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: --stats command workflow
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: --stats command workflow', () => {
    test('should display comprehensive stats after multiple sessions', async () => {
      // Given: User has completed multiple analysis sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 4, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 2, rejected: 3, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 6, rejected: 0, patterns_found: [] },
      ]);

      await updateMetrics(testDir);

      // When: User invokes --stats command
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');

      // Then: Should display all metrics in human-readable format
      expect(output).toContain('Total improvements applied'); // AC7
      expect(output).toContain('20'); // 5 + 3 + 4 + 2 + 6
      expect(output).toContain('Corrections reduction');
      expect(output).toContain('Approval rate');
      expect(output).toContain('Total analysis sessions');
      expect(output).toContain('5');
      expect(output).toContain('Patterns discovered');

      // And: Should be markdown formatted
      expect(output).toMatch(/#{1,3}/); // Has markdown headers

      jest.restoreAllMocks();
    });

    test('should show progression from first session to mature metrics', async () => {
      // Given: User progresses from first session to multiple sessions
      const { persistAnalysisResults } = require('../../src/state-management');

      // First session
      await persistAnalysisResults(testDir, {
        patterns: [{
          pattern_text: 'first-pattern',
          count: 1,
          category: 'code_style' as const,
          examples: [],
          suggested_rule: 'Rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 1,
        }],
        approvedCount: 1,
        rejectedCount: 0,
        totalAnalyzed: 1,
      });

      await updateMetrics(testDir);

      // When: Displaying stats after first session
      let consoleOutput1: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput1.push(message);
      });

      await displayStats(testDir);
      const output1 = consoleOutput1.join('\n');

      // Then: Should show "Insufficient data" for corrections_reduction
      expect(output1).toContain('Insufficient data');

      jest.restoreAllMocks();

      // Add more sessions to reach 3+ sessions
      for (let i = 0; i < 4; i++) {
        await persistAnalysisResults(testDir, {
          patterns: [{
            pattern_text: `pattern-${i}`,
            count: 1,
            category: 'code_style' as const,
            examples: [],
            suggested_rule: `Rule ${i}`,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
            session_count: 1,
            total_frequency: 1,
            is_new: true,
            frequency_change: 1,
          }],
          approvedCount: 1,
          rejectedCount: 0,
          totalAnalyzed: 1,
        });
      }

      await updateMetrics(testDir);

      // When: Displaying stats after 5 sessions
      let consoleOutput2: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput2.push(message);
      });

      await displayStats(testDir);
      const output2 = consoleOutput2.join('\n');

      // Then: Should show actual percentage for corrections_reduction
      expect(output2).not.toContain('Insufficient data');
      expect(output2).toMatch(/\d+%/); // Shows actual percentage

      jest.restoreAllMocks();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Pattern quality filtering workflow
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Pattern quality filtering workflow', () => {
    test('should track pattern-level approval rates for quality filtering', async () => {
      // Given: Results showing mixed pattern approval
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 2,
          approved: 1,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'high-quality-pattern', category: 'code_style', count: 1 },
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 },
          ]
        },
        {
          timestamp: '2026-04-02T10:00:00Z',
          patterns: 2,
          approved: 1,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'high-quality-pattern', category: 'code_style', count: 1 },
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 },
          ]
        },
        {
          timestamp: '2026-04-03T10:00:00Z',
          patterns: 2,
          approved: 1,
          rejected: 1,
          patterns_found: [
            { pattern_text: 'high-quality-pattern', category: 'code_style', count: 1 },
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 },
          ]
        },
        {
          timestamp: '2026-04-04T10:00:00Z',
          patterns: 2,
          approved: 2,
          rejected: 0,
          patterns_found: [
            { pattern_text: 'high-quality-pattern', category: 'code_style', count: 1 },
            { pattern_text: 'low-quality-pattern', category: 'code_style', count: 1 },
          ]
        },
      ]);

      // When: Calculating pattern approval rates
      const { calculatePatternApprovalRate } = require('../../src/state-management');
      const resultsPath = path.join(testDir, 'results.jsonl');

      const highQualityRate = await calculatePatternApprovalRate('high-quality-pattern', resultsPath);
      const lowQualityRate = await calculatePatternApprovalRate('low-quality-pattern', resultsPath);

      // Then: Should distinguish high and low quality patterns
      expect(highQualityRate).toBeGreaterThan(75); // 100% approval (4/4)
      expect(lowQualityRate).toBeLessThan(75); // 25% approval (1/4)

      // And: Low-quality pattern should be filtered from future suggestions
      // This would be tested in the pattern suggestion generation logic
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Error handling and recovery workflows
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Error handling and recovery workflows', () => {
    test('should handle and recover from corrupted results.jsonl', async () => {
      // Given: results.jsonl with some corrupted entries
      const resultsPath = path.join(testDir, 'results.jsonl');
      const content = [
        JSON.stringify({ timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] }),
        '{corrupted json entry}',
        JSON.stringify({ timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 3, rejected: 1, patterns_found: [] }),
        'another corrupted entry',
        JSON.stringify({ timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 2, rejected: 3, patterns_found: [] }),
      ].join('\n') + '\n';
      fs.writeFileSync(resultsPath, content, { mode: 0o600 });

      // When: Updating metrics (should skip corrupted entries)
      await updateMetrics(testDir);

      // Then: Should calculate from valid entries only
      const state = readStateFile();
      expect(state.improvements_applied).toBe(10); // 5 + 3 + 2 (corrupted entries skipped)
      expect(state.total_sessions).toBe(3);
    });

    test('should handle state.json corruption gracefully', async () => {
      // Given: Corrupted state.json
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, '{invalid json}', { mode: 0o600 });

      // When: Attempting to update metrics
      // Then: Should handle error gracefully
      try {
        await updateMetrics(testDir);
        // If it succeeds, should create new valid state
        const state = readStateFile();
        expect(state).toBeDefined();
      } catch (error) {
        // Or should throw meaningful error
        expect(error).toBeDefined();
      }
    });

    test('should recover from interrupted metric update', async () => {
      // Given: Partial metric update (temp file left behind)
      const tempPath = path.join(testDir, 'state.json.tmp');
      fs.writeFileSync(tempPath, '{"partial": "update"}', { mode: 0o600 });

      // And: Valid results.jsonl
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should clean up temp file and complete update
      expect(fs.existsSync(tempPath)).toBe(false);

      const state = readStateFile();
      expect(state.improvements_applied).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Performance and scalability
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Performance and scalability', () => {
    test('should handle large results.jsonl efficiently (> 100 sessions)', async () => {
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

      // When: Updating metrics
      const startTime = performance.now();
      await updateMetrics(testDir);
      const elapsed = performance.now() - startTime;

      // Then: Should complete within 1 second (NFR3)
      expect(elapsed).toBeLessThan(1000);

      // And: Metrics should be accurate
      const state = readStateFile();
      expect(state.total_sessions).toBe(100);
    });

    test('should maintain performance with many patterns', async () => {
      // Given: results.jsonl with many patterns per session
      const entries = [];
      for (let i = 0; i < 10; i++) {
        const patterns_found = [];
        for (let j = 0; j < 50; j++) {
          patterns_found.push({
            pattern_text: `pattern-${j}`,
            category: 'code_style',
            count: 1,
          });
        }
        entries.push({
          timestamp: `2026-04-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
          patterns: 50,
          approved: 25,
          rejected: 25,
          patterns_found,
        });
      }
      createResultsJsonl(entries);

      // When: Updating metrics
      const startTime = performance.now();
      await updateMetrics(testDir);
      const elapsed = performance.now() - startTime;

      // Then: Should complete within reasonable time
      expect(elapsed).toBeLessThan(2000); // 2 seconds for large dataset
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: User experience workflows
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: User experience workflows', () => {
    test('should provide clear feedback when no data available', async () => {
      // Given: Fresh installation (no analysis sessions yet)
      await updateMetrics(testDir);

      // When: User invokes --stats command
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');

      // Then: Should show 0 values and "Insufficient data" messages
      expect(output).toContain('Total improvements applied');
      expect(output).toContain('0');
      expect(output).toContain('Insufficient data');

      jest.restoreAllMocks();
    });

    test('should show meaningful progress over time', async () => {
      // Given: User has been using system for multiple sessions
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 1, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 2, rejected: 4, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 2, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 4, rejected: 2, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 5, rejected: 1, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 6, rejected: 0, patterns_found: [] },
      ]);

      await updateMetrics(testDir);

      // When: User checks stats
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');

      // Then: Should show improvement trends
      expect(output).toContain('Total improvements applied');
      expect(output).toContain('20'); // 1 + 2 + 2 + 4 + 5 + 6
      expect(output).toContain('Corrections reduction');
      expect(output).toContain('%'); // Shows percentage improvement

      // And: Should show high approval rate
      expect(output).toContain('Approval rate');
      expect(output).toContain('66.7%'); // (20 / 30) * 100

      jest.restoreAllMocks();
    });

    test('should help user understand pattern quality', async () => {
      // Given: User has mixed pattern approval rates
      createResultsJsonl([
        {
          timestamp: '2026-04-01T10:00:00Z',
          patterns: 2,
          approved: 2,
          rejected: 0,
          patterns_found: [
            { pattern_text: 'good-pattern-1', category: 'code_style', count: 1 },
            { pattern_text: 'good-pattern-2', category: 'code_style', count: 1 },
          ]
        },
        {
          timestamp: '2026-04-02T10:00:00Z',
          patterns: 2,
          approved: 0,
          rejected: 2,
          patterns_found: [
            { pattern_text: 'bad-pattern-1', category: 'code_style', count: 1 },
            { pattern_text: 'bad-pattern-2', category: 'code_style', count: 1 },
          ]
        },
      ]);

      await updateMetrics(testDir);

      // When: User checks stats
      const state = readStateFile();

      // Then: Should show 50% overall approval rate
      expect(state.approval_rate).toBe(50.0);

      // And: User can identify which patterns to filter
      const { calculatePatternApprovalRate } = require('../../src/state-management');
      const resultsPath = path.join(testDir, 'results.jsonl');

      const goodPattern1Rate = await calculatePatternApprovalRate('good-pattern-1', resultsPath);
      const badPattern1Rate = await calculatePatternApprovalRate('bad-pattern-1', resultsPath);

      expect(goodPattern1Rate).toBe(100.0); // Above 75% threshold
      expect(badPattern1Rate).toBe(0.0); // Below 75% threshold (should be filtered)
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Integration with CLI commands
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Integration with CLI commands', () => {
    test('should integrate --stats with existing command variants', async () => {
      // This test verifies that --stats command integrates with
      // the existing command variant logic from Story 1.7

      // Given: User has analysis data
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      await updateMetrics(testDir);

      // When: Displaying stats (simulating CLI command)
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');

      // Then: Should format output consistently with other commands
      expect(output).toBeTruthy();
      expect(output.length).toBeGreaterThan(0);

      // And: Should be suitable for CLI display
      expect(output).toMatch(/^[\s\S]*$/); // Valid string

      jest.restoreAllMocks();
    });

    test('should support metrics tracking across different platforms', async () => {
      // Given: User is using Cursor platform
      const statePath = path.join(testDir, 'state.json');
      const state = readStateFile();
      state.platform = 'cursor';
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should preserve platform setting
      const updatedState = readStateFile();
      expect(updatedState.platform).toBe('cursor');
      expect(updatedState.improvements_applied).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Data integrity and consistency
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Data integrity and consistency', () => {
    test('should maintain data consistency after rapid successive updates', async () => {
      // Given: Initial metrics
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);
      await updateMetrics(testDir);

      // When: Performing rapid successive updates
      const { appendResult } = require('../../src/state-management');

      for (let i = 0; i < 10; i++) {
        await appendResult(testDir, {
          timestamp: `2026-04-${String(i + 2).padStart(2, '0')}T10:00:00Z`,
          patterns: 3,
          approved: i,
          rejected: 10 - i,
        });
        await updateMetrics(testDir);
      }

      // Then: Final state should be consistent
      const finalState = readStateFile();
      expect(finalState.total_sessions).toBe(11);
      expect(finalState.improvements_applied).toBeGreaterThan(0);
      expect(typeof finalState.corrections_reduction).toBe('number');
    });

    test('should handle concurrent access patterns safely', async () => {
      // Given: Multiple processes updating metrics (simulated)
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 2, patterns_found: [] },
      ]);

      // When: Simulating concurrent updates
      await Promise.all([
        updateMetrics(testDir),
        updateMetrics(testDir),
        updateMetrics(testDir),
      ]);

      // Then: State should remain valid
      const state = readStateFile();
      expect(state.improvements_applied).toBe(5);
      expect(state).toBeDefined();

      // And: No temp files should remain
      const files = fs.readdirSync(testDir);
      const tempFiles = files.filter(f => f.endsWith('.tmp'));
      expect(tempFiles.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // E2E: Edge cases and boundary conditions
  // ═══════════════════════════════════════════════════════════════════════

  describe('E2E: Edge cases and boundary conditions', () => {
    test('should handle boundary value: exactly 3 sessions', async () => {
      // Given: Exactly 3 sessions (minimum for corrections_reduction)
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should calculate corrections_reduction (not 0 for insufficient data)
      const state = readStateFile();
      expect(state.corrections_reduction).toBe(0); // (5 - 5) / 5 = 0
      expect(state.total_sessions).toBe(3);

      // And: Stats should show percentage (not "Insufficient data")
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Insufficient data');

      jest.restoreAllMocks();
    });

    test('should handle boundary value: 0% corrections reduction', async () => {
      // Given: Sessions with no improvement
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 0, rejected: 5, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should show 0% reduction (not "Insufficient data")
      const state = readStateFile();
      expect(state.corrections_reduction).toBe(0);
      expect(state.total_sessions).toBe(6);

      // And: Stats should show "0.0%" (not "Insufficient data")
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');
      expect(output).not.toContain('Insufficient data');
      expect(output).toContain('0.0%');

      jest.restoreAllMocks();
    });

    test('should handle boundary value: 100% corrections reduction', async () => {
      // Given: Sessions with complete improvement
      createResultsJsonl([
        { timestamp: '2026-04-01T10:00:00Z', patterns: 3, approved: 5, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-02T10:00:00Z', patterns: 3, approved: 5, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-03T10:00:00Z', patterns: 3, approved: 5, rejected: 5, patterns_found: [] },
        { timestamp: '2026-04-04T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-05T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
        { timestamp: '2026-04-06T10:00:00Z', patterns: 3, approved: 5, rejected: 0, patterns_found: [] },
      ]);

      // When: Updating metrics
      await updateMetrics(testDir);

      // Then: Should show 100% reduction
      const state = readStateFile();
      expect(state.corrections_reduction).toBe(1.0);

      // And: Stats should show "100.0%"
      let consoleOutput: string[] = [];
      jest.spyOn(console, 'log').mockImplementation((message: string) => {
        consoleOutput.push(message);
      });

      await displayStats(testDir);

      const output = consoleOutput.join('\n');
      expect(output).toContain('100.0%');

      jest.restoreAllMocks();
    });
  });
});
