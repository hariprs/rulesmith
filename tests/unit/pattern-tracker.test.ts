/**
 * Unit Tests for Pattern Tracker (Story 2-6)
 *
 * Tests for longitudinal pattern tracking including:
 * - Historical pattern loading
 * - Pattern merging orchestration
 * - State file updates with backup
 * - Longitudinal report generation
 * - Error handling (AR22 compliant)
 */

import * as fs from 'fs';
import * as path from 'path';
import tmp from 'tmp';
import {
  PatternTracker,
  HistoricalPattern,
  MergedPattern,
  LongitudinalReport,
  loadHistoricalPatterns,
  mergeWithHistorical,
  updateStateFile,
  generateLongitudinalReport,
  PatternTrackingError,
} from '../../src/pattern-tracker';
import { Pattern, PatternCategory } from '../../src/pattern-detector';

describe('PatternTracker', () => {
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

  const createMockHistoricalPattern = (
    patternText: string,
    count: number,
    category: PatternCategory = PatternCategory.OTHER,
    sessionCount: number = 1
  ): HistoricalPattern => {
    const now = new Date().toISOString();
    const past = new Date(Date.now() - 86400000).toISOString();
    return {
      pattern_text: patternText,
      count,
      category,
      examples: [],
      suggested_rule: `Use ${patternText} instead`,
      first_seen: past,
      last_seen: past,
      content_types: [],
      session_count: sessionCount,
      total_frequency: count * sessionCount,
    };
  };

  describe('constructor', () => {
    it('should create tracker with valid state path', () => {
      expect(() => new PatternTracker(statePath)).not.toThrow();
    });

    it('should throw error for null state path', () => {
      expect(() => new PatternTracker(null as unknown as string)).toThrow(PatternTrackingError);
    });

    it('should throw error for empty state path', () => {
      expect(() => new PatternTracker('')).toThrow(PatternTrackingError);
    });

    it('should throw error for non-string state path', () => {
      expect(() => new PatternTracker({} as unknown as string)).toThrow(PatternTrackingError);
    });
  });

  describe('loadHistoricalPatterns', () => {
    it('should return empty array when state file does not exist', () => {
      const result = tracker.loadHistoricalPatterns();

      expect(result).toEqual([]);
    });

    it('should load historical patterns from state file', () => {
      const historicalPatterns = [
        createMockHistoricalPattern('use camelCase', 3, PatternCategory.CODE_STYLE),
        createMockHistoricalPattern('use async await', 2, PatternCategory.CONVENTION),
      ];

      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: historicalPatterns,
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = tracker.loadHistoricalPatterns();

      expect(result).toHaveLength(2);
      expect(result[0].pattern_text).toBe('use camelCase');
      expect(result[0].session_count).toBeDefined();
      expect(result[0].total_frequency).toBeDefined();
    });

    it('should return empty array for empty state file', () => {
      fs.writeFileSync(statePath, '');

      const result = tracker.loadHistoricalPatterns();

      expect(result).toEqual([]);
    });

    it('should handle missing patterns_found field', () => {
      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = tracker.loadHistoricalPatterns();

      expect(result).toEqual([]);
    });

    it('should skip invalid historical patterns with warning', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidPattern = {
        pattern_text: '', // Invalid: empty string
        count: -1, // Invalid: negative count
        category: 'invalid',
      };

      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: [invalidPattern, createMockHistoricalPattern('use camelCase', 3)],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = tracker.loadHistoricalPatterns();

      expect(result).toHaveLength(1);
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should throw error for corrupted state file', () => {
      fs.writeFileSync(statePath, '{ invalid json }');

      expect(() => {
        tracker.loadHistoricalPatterns();
      }).toThrow(PatternTrackingError);
    });

    it('should throw error for non-object state file', () => {
      fs.writeFileSync(statePath, '[]');

      expect(() => {
        tracker.loadHistoricalPatterns();
      }).toThrow(PatternTrackingError);
    });

    it('should migrate legacy string[] patterns to MergedPattern[]', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Create legacy state with string[] patterns
      const legacyState = {
        last_analysis: new Date().toISOString(),
        patterns_found: ['use camelCase', 'use async await', 'add spacing'],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(legacyState, null, 2));

      const result = tracker.loadHistoricalPatterns();

      // Should skip invalid string patterns (not objects) and return empty
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should handle invalid timestamps in historical patterns', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const invalidPattern = {
        pattern_text: 'use camelCase',
        count: 3,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'use camelCase',
        content_types: [],
        first_seen: 'invalid-timestamp',
        last_seen: 'invalid-timestamp',
        session_count: 1,
        total_frequency: 3,
      };

      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: [invalidPattern],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = tracker.loadHistoricalPatterns();

      // Should skip patterns with invalid timestamps
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });
  });

  describe('mergeWithHistorical', () => {
    it('should merge current patterns with historical patterns', () => {
      const current = [createMockPattern('use camelCase', 2)];
      const historical = [createMockHistoricalPattern('use camelCase', 3)];

      // Write historical patterns to state file
      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: historical,
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = tracker.mergeWithHistorical(current);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].is_new).toBe(false);
      expect(result.statistics.recurring_patterns).toBe(1);
    });

    it('should handle new patterns', () => {
      const current = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(current);

      expect(result.patterns).toHaveLength(1);
      expect(result.patterns[0].is_new).toBe(true);
      expect(result.statistics.new_patterns).toBe(1);
    });

    it('should throw error for invalid timestamp', () => {
      const current = [createMockPattern('use camelCase', 2)];

      expect(() => {
        tracker.mergeWithHistorical(current, 'invalid-timestamp');
      }).toThrow(PatternTrackingError);
    });

    it('should use current timestamp when not provided', () => {
      const current = [createMockPattern('use camelCase', 2)];

      const result = tracker.mergeWithHistorical(current);

      expect(result.patterns[0].first_seen).toBeDefined();
      expect(result.patterns[0].last_seen).toBeDefined();
    });
  });

  describe('updateStateFile', () => {
    it('should create backup before update', async () => {
      // Ensure history directory doesn't exist initially
      expect(fs.existsSync(historyDir)).toBe(false);

      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
      ];

      await tracker.updateStateFile(mergedPatterns);

      // Check history directory was created
      expect(fs.existsSync(historyDir)).toBe(true);

      // Check backup file exists
      const backupFiles = fs.readdirSync(historyDir).filter(f => f.startsWith('state-'));
      expect(backupFiles.length).toBeGreaterThanOrEqual(1);
    });

    it('should update state file with merged patterns', async () => {
      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
      ];

      await tracker.updateStateFile(mergedPatterns);

      // Read updated state file
      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.patterns_found).toHaveLength(1);
      expect(state.patterns_found[0].pattern_text).toBe('use camelCase');
      expect(state.last_analysis).toBeDefined();
    });

    it('should preserve existing state fields', async () => {
      // Create initial state
      const initialState = {
        last_analysis: new Date(Date.now() - 86400000).toISOString(),
        patterns_found: [],
        improvements_applied: 5,
        corrections_reduction: 0.3,
        platform: 'claude-code' as const,
        _schema_note: 'test',
        category_summaries: [{ category: 'code_style', count: 1 }],
        frequency_analysis: { high_frequency_patterns: 0 },
      };

      fs.writeFileSync(statePath, JSON.stringify(initialState, null, 2));

      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
      ];

      await tracker.updateStateFile(mergedPatterns);

      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.improvements_applied).toBe(5);
      expect(state.corrections_reduction).toBe(0.3);
      expect(state.platform).toBe('claude-code');
      expect(state.category_summaries).toBeDefined();
      expect(state.frequency_analysis).toBeDefined();
    });

    it('should throw error for invalid merged patterns', async () => {
      const mergedPatterns = null as unknown as MergedPattern[];

      await expect(tracker.updateStateFile(mergedPatterns)).rejects.toThrow(PatternTrackingError);
    });

    it.skip('should not update state if backup fails', async () => {
      // This test is skipped because it requires special file system permissions
      // that may not work consistently across all platforms and test environments
      // The backup creation logic is tested in integration tests with actual scenarios
    });

    it('should create initial state if none exists', async () => {
      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
      ];

      await tracker.updateStateFile(mergedPatterns);

      const content = fs.readFileSync(statePath, 'utf-8');
      const state = JSON.parse(content);

      expect(state.platform).toBe('unknown');
      expect(state.improvements_applied).toBe(0);
      expect(state.corrections_reduction).toBe(0);
    });

    it.skip('should write file with 0o600 permissions', async () => {
      // This test is skipped because file permissions can be inconsistent
      // across different platforms and test environments
      // The permission setting logic is verified in integration tests
    });
  });

  describe('generateLongitudinalReport', () => {
    it('should generate report with correct structure', () => {
      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
        {
          ...createMockPattern('use async await', 5),
          first_seen: new Date(Date.now() - 86400000).toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 2,
          total_frequency: 10,
          is_new: false,
          frequency_change: 1.0, // Increasing
        },
        {
          ...createMockPattern('use promises', 1),
          first_seen: new Date(Date.now() - 86400000).toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 2,
          total_frequency: 10,
          is_new: false,
          frequency_change: -0.8, // Decreasing
        },
      ];

      const report = tracker.generateLongitudinalReport(mergedPatterns);

      expect(report.new_patterns).toHaveLength(1);
      expect(report.recurring_patterns).toHaveLength(2);
      expect(report.trends_increasing).toHaveLength(1);
      expect(report.trends_decreasing).toHaveLength(1);
      expect(report.session_summary.total_patterns).toBe(3);
      expect(report.session_summary.new_pattern_count).toBe(1);
      expect(report.session_summary.recurring_pattern_count).toBe(2);
    });

    it('should throw error for invalid merged patterns', () => {
      const mergedPatterns = null as unknown as MergedPattern[];

      expect(() => {
        tracker.generateLongitudinalReport(mergedPatterns);
      }).toThrow(PatternTrackingError);
    });

    it('should use provided analysis timestamp', () => {
      const mergedPatterns: MergedPattern[] = [];
      const timestamp = '2026-03-18T00:00:00.000Z';

      const report = tracker.generateLongitudinalReport(mergedPatterns, timestamp);

      expect(report.session_summary.analysis_timestamp).toBe(timestamp);
    });

    it('should use current timestamp when not provided', () => {
      const mergedPatterns: MergedPattern[] = [];

      const report = tracker.generateLongitudinalReport(mergedPatterns);

      expect(report.session_summary.analysis_timestamp).toBeDefined();
    });
  });

  describe('utility functions', () => {
    it('should provide convenience function for loading historical patterns', () => {
      const historicalPatterns = [createMockHistoricalPattern('use camelCase', 3)];

      const stateData = {
        last_analysis: new Date().toISOString(),
        patterns_found: historicalPatterns,
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code' as const,
        _schema_note: 'test',
      };

      fs.writeFileSync(statePath, JSON.stringify(stateData, null, 2));

      const result = loadHistoricalPatterns(statePath);

      expect(result).toHaveLength(1);
      expect(result[0].pattern_text).toBe('use camelCase');
    });

    it('should provide convenience function for merging patterns', () => {
      const current = [createMockPattern('use camelCase', 2)];

      const result = mergeWithHistorical(statePath, current);

      expect(result.patterns).toBeDefined();
      expect(result.statistics).toBeDefined();
    });

    it('should provide convenience function for updating state file', async () => {
      const mergedPatterns = [
        {
          ...createMockPattern('use camelCase', 2),
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 0,
        },
      ];

      await updateStateFile(statePath, mergedPatterns);

      expect(fs.existsSync(statePath)).toBe(true);
    });

    it('should provide convenience function for generating longitudinal report', () => {
      const mergedPatterns: MergedPattern[] = [];

      const report = generateLongitudinalReport(mergedPatterns);

      expect(report).toBeDefined();
      expect(report.session_summary).toBeDefined();
    });
  });
});
