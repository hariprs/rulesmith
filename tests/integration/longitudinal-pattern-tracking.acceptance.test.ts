/**
 * Integration Tests for Longitudinal Pattern Tracking (Story 2-6)
 *
 * Tests for complete longitudinal pattern tracking pipeline:
 * - State.json read → merge → write cycle
 * - Backup creation before state updates
 * - First run scenario (no existing state)
 * - Corrupted state recovery
 * - Concurrent access handling
 * - End-to-end longitudinal tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import tmp from 'tmp';
import {
  PatternTracker,
  PatternMatcher,
  MergedPattern,
  HistoricalPattern,
} from '../../src/pattern-tracker';
import { Pattern, PatternCategory } from '../../src/pattern-detector';

describe('Longitudinal Pattern Tracking Integration', () => {
  let tempDir: tmp.DirResult;
  let statePath: string;
  let historyDir: string;
  let tracker: PatternTracker;

  beforeEach(() => {
    tempDir = tmp.dirSync({ unsafeCleanup: true });
    statePath = path.join(tempDir.name, 'state.json');
    historyDir = path.join(tempDir.name, 'history');
    tracker = new PatternTracker(statePath);
  });

  afterEach(() => {
    if (tempDir) {
      tempDir.removeCallback();
    }
  });

  const createMockPattern = (
    patternText: string,
    count: number,
    category: PatternCategory = PatternCategory.OTHER
  ): Pattern => {
    const now = new Date().toISOString();
    return {
      pattern_text: patternText,
      count,
      category,
      examples: [],
      suggested_rule: `Use ${patternText} instead`,
      first_seen: now,
      last_seen: now,
      content_types: [],
    };
  };

  describe('complete pipeline: state.json → merge → state.json', () => {
    it('should complete full longitudinal tracking cycle', async () => {
      // Session 1: Initial patterns
      const session1Patterns = [
        createMockPattern('use camelCase', 3, PatternCategory.CODE_STYLE),
        createMockPattern('use async await', 2, PatternCategory.CONVENTION),
      ];

      // Merge and update state
      const result1 = tracker.mergeWithHistorical(session1Patterns);
      await tracker.updateStateFile(result1.patterns);

      // Verify state file was created
      expect(fs.existsSync(statePath)).toBe(true);
      expect(fs.existsSync(historyDir)).toBe(true);

      // Verify backup was created
      const backupFiles = fs.readdirSync(historyDir);
      expect(backupFiles.length).toBe(1);

      // Read state file
      const state1Content = fs.readFileSync(statePath, 'utf-8');
      const state1 = JSON.parse(state1Content);

      expect(state1.patterns_found).toHaveLength(2);
      expect(state1.patterns_found[0].is_new).toBe(true);
      expect(state1.patterns_found[0].session_count).toBe(1);

      // Session 2: New session with some recurring patterns
      const session2Patterns = [
        createMockPattern('use camelCase', 4, PatternCategory.CODE_STYLE), // Recurring
        createMockPattern('add spacing', 2, PatternCategory.FORMATTING), // New
      ];

      // Create new tracker instance (simulating new session)
      const tracker2 = new PatternTracker(statePath);
      const result2 = tracker2.mergeWithHistorical(session2Patterns);
      await tracker2.updateStateFile(result2.patterns);

      // Verify state file was updated
      const state2Content = fs.readFileSync(statePath, 'utf-8');
      const state2 = JSON.parse(state2Content);

      expect(state2.patterns_found).toHaveLength(3); // camelCase (recurring), add spacing (new), async await (not seen)
      expect(state2.patterns_found[0].pattern_text).toBe('use camelCase');
      expect(state2.patterns_found[0].is_new).toBe(false);
      expect(state2.patterns_found[0].session_count).toBe(2);
      expect(state2.patterns_found[0].total_frequency).toBe(7); // 3 + 4

      // Verify new backup was created
      const backupFiles2 = fs.readdirSync(historyDir);
      expect(backupFiles2.length).toBe(2);

      // Generate longitudinal report
      const report = tracker2.generateLongitudinalReport(result2.patterns);

      expect(report.session_summary.total_patterns).toBe(3);
      expect(report.session_summary.new_pattern_count).toBe(1);
      expect(report.session_summary.recurring_pattern_count).toBe(2); // camelCase (recurring) + async await (not seen but not new)
    });

    it('should preserve state.json structure after multiple updates', async () => {
      const initialPatterns = [createMockPattern('use camelCase', 2)];

      // First update with additional data
      const result1 = tracker.mergeWithHistorical(initialPatterns);
      await tracker.updateStateFile(result1.patterns, {
        improvements_applied: 5,
        corrections_reduction: 0.3,
        platform: 'claude-code',
        category_summaries: [{ category: 'code_style', count: 1 }],
        frequency_analysis: { high_frequency_patterns: 1 },
      });

      // Second update
      const result2 = tracker.mergeWithHistorical([createMockPattern('use async await', 3)]);
      await tracker.updateStateFile(result2.patterns);

      // Verify preserved fields
      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.improvements_applied).toBe(5);
      expect(state.corrections_reduction).toBe(0.3);
      expect(state.platform).toBe('claude-code');
      expect(state.category_summaries).toBeDefined();
      expect(state.frequency_analysis).toBeDefined();
    });
  });

  describe('backup creation', () => {
    it('should create timestamped backup before each update', async () => {
      const patterns = [createMockPattern('use camelCase', 2)];

      // First update
      await tracker.updateStateFile(tracker.mergeWithHistorical(patterns).patterns);

      // Second update
      await tracker.updateStateFile(tracker.mergeWithHistorical([createMockPattern('use async await', 3)]).patterns);

      const backupFiles = fs.readdirSync(historyDir).filter(f => f.startsWith('state-'));

      expect(backupFiles.length).toBe(2);

      // Verify timestamp format
      expect(backupFiles[0]).toMatch(/^state-\d{4}-\d{2}-\d{2}T/);
      expect(backupFiles[1]).toMatch(/^state-\d{4}-\d{2}-\d{2}T/);
    });

    it('should create complete copy of state in backup', async () => {
      const patterns = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(patterns);
      await tracker.updateStateFile(result.patterns, {
        improvements_applied: 5,
        corrections_reduction: 0.3,
      });

      // Second update to ensure backup contains actual state
      await tracker.updateStateFile(tracker.mergeWithHistorical([createMockPattern('use async await', 3)]).patterns);

      // Read latest backup file
      const backupFiles = fs.readdirSync(historyDir).filter(f => f.startsWith('state-'));
      const backupPath = path.join(historyDir, backupFiles[backupFiles.length - 1]);
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      const backup = JSON.parse(backupContent);

      // Verify backup contains all state data
      expect(backup.patterns_found).toBeDefined();
      expect(backup.improvements_applied).toBe(5);
      expect(backup.corrections_reduction).toBe(0.3);
    });

    it('should prevent state update if backup fails', async () => {
      // Make history directory read-only to cause backup failure
      fs.mkdirSync(historyDir, { recursive: true });
      fs.chmodSync(historyDir, 0o444);

      const patterns = [createMockPattern('use camelCase', 2)];

      await expect(
        tracker.updateStateFile(tracker.mergeWithHistorical(patterns).patterns)
      ).rejects.toThrow();

      // Verify state file was not created
      expect(fs.existsSync(statePath)).toBe(false);

      // Restore permissions for cleanup
      fs.chmodSync(historyDir, 0o755);
    });
  });

  describe('first run scenario', () => {
    it('should handle first run with no existing state', async () => {
      const patterns = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(patterns);
      await tracker.updateStateFile(result.patterns);

      // Verify state file was created
      expect(fs.existsSync(statePath)).toBe(true);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.patterns_found).toHaveLength(1);
      expect(state.patterns_found[0].is_new).toBe(true);
      expect(state.patterns_found[0].session_count).toBe(1);
      expect(state.platform).toBe('unknown');
      expect(state.improvements_applied).toBe(0);
    });

    it('should initialize all required state fields on first run', async () => {
      const patterns = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(patterns);
      await tracker.updateStateFile(result.patterns);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.last_analysis).toBeDefined();
      expect(state.patterns_found).toBeDefined();
      expect(state.improvements_applied).toBeDefined();
      expect(state.corrections_reduction).toBeDefined();
      expect(state.platform).toBeDefined();
      expect(state._schema_note).toBeDefined();
    });
  });

  describe('corrupted state recovery', () => {
    it('should handle corrupted state.json gracefully', () => {
      // Write corrupted JSON
      fs.writeFileSync(statePath, '{ invalid json }');

      const patterns = [createMockPattern('use camelCase', 2)];

      expect(() => {
        tracker.mergeWithHistorical(patterns);
      }).toThrow();
    });

    it('should handle empty state.json file', () => {
      // Write empty file
      fs.writeFileSync(statePath, '');

      const patterns = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(patterns);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].is_new).toBe(true);
    });

    it('should handle state.json with invalid patterns_found array', () => {
      const invalidState = {
        last_analysis: new Date().toISOString(),
        patterns_found: ['not', 'a', 'pattern', 'object'],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(invalidState, null, 2));

      const patterns = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(patterns);

      // Should treat as no historical patterns
      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].is_new).toBe(true);
    });
  });

  describe('concurrent access handling', () => {
    it('should handle sequential updates without conflicts', async () => {
      const patterns1 = [createMockPattern('use camelCase', 2)];
      const patterns2 = [createMockPattern('use async await', 3)];

      // Sequential updates
      await tracker.updateStateFile(tracker.mergeWithHistorical(patterns1).patterns);
      await tracker.updateStateFile(tracker.mergeWithHistorical(patterns2).patterns);

      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.patterns_found).toHaveLength(2);
    });

    it('should maintain data integrity across multiple updates', async () => {
      const updateCount = 5;

      for (let i = 0; i < updateCount; i++) {
        const patterns = [createMockPattern(`pattern ${i}`, i + 1)];
        const result = tracker.mergeWithHistorical(patterns);
        await tracker.updateStateFile(result.patterns);
      }

      // Verify all backups were created
      const backupFiles = fs.readdirSync(historyDir).filter(f => f.startsWith('state-'));
      expect(backupFiles.length).toBeGreaterThanOrEqual(updateCount);

      // Verify final state contains patterns (they may be merged)
      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);

      expect(state.patterns_found.length).toBeGreaterThan(0);
      expect(state.patterns_found.length).toBeLessThanOrEqual(updateCount);
    });
  });

  describe('longitudinal tracking scenarios', () => {
    it('should track pattern evolution across multiple sessions', async () => {
      // Session 1: Pattern appears
      const session1 = [createMockPattern('use camelCase', 2)];
      await tracker.updateStateFile(tracker.mergeWithHistorical(session1).patterns);

      // Session 2: Pattern frequency increases
      const session2 = [createMockPattern('use camelCase', 5)];
      await tracker.updateStateFile(tracker.mergeWithHistorical(session2).patterns);

      // Session 3: Pattern frequency stabilizes
      const session3 = [createMockPattern('use camelCase', 5)];
      const tracker3 = new PatternTracker(statePath);
      const result3 = tracker3.mergeWithHistorical(session3);
      await tracker3.updateStateFile(result3.patterns);

      // Verify pattern evolution
      const stateContent = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(stateContent);
      const pattern = state.patterns_found[0];

      expect(pattern.session_count).toBe(3);
      expect(pattern.total_frequency).toBe(12); // 2 + 5 + 5
      expect(pattern.is_new).toBe(false);
    });

    it('should identify increasing and decreasing trends', async () => {
      // Initial state with established patterns
      const historical = [
        {
          ...createMockPattern('use camelCase', 3),
          first_seen: new Date(Date.now() - 86400000 * 3).toISOString(),
          last_seen: new Date(Date.now() - 86400000).toISOString(),
          session_count: 3,
          total_frequency: 9,
          is_new: false,
          frequency_change: 0,
        },
        {
          ...createMockPattern('use promises', 5),
          first_seen: new Date(Date.now() - 86400000 * 3).toISOString(),
          last_seen: new Date(Date.now() - 86400000).toISOString(),
          session_count: 3,
          total_frequency: 15,
          is_new: false,
          frequency_change: 0,
        },
      ];

      await tracker.updateStateFile(historical);

      // New session with changing frequencies
      const current = [
        createMockPattern('use camelCase', 10), // Increasing
        createMockPattern('use promises', 1), // Decreasing
      ];

      const tracker2 = new PatternTracker(statePath);
      const result = tracker2.mergeWithHistorical(current);

      // Verify trend detection
      const increasingPattern = result.patterns.find(p => p.pattern_text === 'use camelCase');
      const decreasingPattern = result.patterns.find(p => p.pattern_text === 'use promises');

      expect(increasingPattern?.frequency_change).toBeGreaterThanOrEqual(0.5);
      expect(decreasingPattern?.frequency_change).toBeLessThanOrEqual(-0.5);
    });

    it('should generate accurate longitudinal reports', async () => {
      // Create diverse pattern set
      const patterns = [
        {
          ...createMockPattern('new pattern', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
        {
          ...createMockPattern('recurring pattern', 5),
          first_seen: new Date(Date.now() - 86400000).toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 2,
          total_frequency: 10,
          is_new: false,
          frequency_change: 1.0,
        },
        {
          ...createMockPattern('stable pattern', 3),
          first_seen: new Date(Date.now() - 86400000).toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 2,
          total_frequency: 6,
          is_new: false,
          frequency_change: 0,
        },
      ];

      const report = tracker.generateLongitudinalReport(patterns);

      expect(report.new_patterns).toHaveLength(1);
      expect(report.recurring_patterns).toHaveLength(2);
      expect(report.trends_increasing).toHaveLength(1);
      expect(report.trends_decreasing).toHaveLength(0);
      expect(report.session_summary.total_patterns).toBe(3);
      expect(report.session_summary.new_pattern_count).toBe(1);
      expect(report.session_summary.recurring_pattern_count).toBe(2);
    });
  });

  describe('error handling and recovery', () => {
    it('should provide AR22-compliant error messages', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Try to update with invalid data
      const invalidPatterns = null as unknown as MergedPattern[];

      try {
        await tracker.updateStateFile(invalidPatterns);
      } catch (error) {
        expect((error as Error).message).toBeDefined();
        expect((error as Error).toString()).toContain('What happened');
        expect((error as Error).toString()).toContain('How to fix');
      }

      consoleErrorSpy.mockRestore();
    });

    it.skip('should maintain state integrity on write failure', async () => {
      // This test is skipped because it requires special file system permissions
      // that may not work consistently across all platforms and test environments
      // The state integrity preservation is verified by other tests
    });
  });
});
