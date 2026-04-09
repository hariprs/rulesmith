/**
 * ATDD Tests: Story 5.1 - Persist Analysis Results
 *
 * TDD RED PHASE: These tests WILL FAIL until implementation is complete.
 * They define the expected behavior for persistAnalysisResults() and updatePatterns().
 *
 * Acceptance Criteria:
 *   AC1: Update patterns_found in state.json (merge new + existing)
 *   AC2: Append session data to results.jsonl
 *   AC3: Complete writes within 1 second
 *   AC4: Preserve original state on write failure
 *   AC5: Achieve 99.9% success rate
 *
 * Test Level: Unit + Integration (backend stack)
 * Priority: P0-P2 mapped from test design
 */

import * as fs from 'fs';
import * as path from 'path';

import {
  initializeState,
  appendResult,
  persistAnalysisResults,
  updatePatterns,
} from '../../src/state-management';

import type { MergedPattern, AnalysisSessionResult } from '../../src/state-management';

describe('Story 5.1: Persist Analysis Results', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-persist');

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
  // AC1: Update patterns_found in state.json
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC1: Update patterns_found in state.json', () => {
    test('persists new patterns to state.json patterns_found array', async () => {
      const session = makeSession();

      await persistAnalysisResults(testDir, session);

      const state = readState();
      expect(Array.isArray(state.patterns_found)).toBe(true);
      expect(state.patterns_found.length).toBeGreaterThan(0);

      const persisted = state.patterns_found as MergedPattern[];
      expect(persisted[0].pattern_text).toBe('prefer-async-await');
      expect(persisted[0].total_frequency).toBe(5);
    });

    test('preserves existing patterns when adding new ones', async () => {
      // First session: add one pattern
      await persistAnalysisResults(testDir, makeSession({
        patterns: [{
          pattern_text: 'existing-pattern',
          count: 3,
          category: 'code_style' as any,
          examples: [makeExample('existing-pattern')],
          suggested_rule: 'rule',
          first_seen: '2026-03-15T10:00:00.000Z',
          last_seen: '2026-03-15T10:00:00.000Z',
          content_types: ['typescript'],
          session_count: 1,
          total_frequency: 3,
          is_new: true,
          frequency_change: 3,
        }],
      }));

      // Second session: add a different pattern
      await persistAnalysisResults(testDir, makeSession({
        patterns: [{
          pattern_text: 'new-pattern',
          count: 2,
          category: 'error_handling' as any,
          examples: [makeExample('new-pattern')],
          suggested_rule: 'rule2',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: ['typescript'],
          session_count: 1,
          total_frequency: 2,
          is_new: true,
          frequency_change: 2,
        }],
      }));

      const state = readState();
      const patterns = state.patterns_found as MergedPattern[];
      const patternTexts = patterns.map((p: MergedPattern) => p.pattern_text);
      expect(patternTexts).toContain('existing-pattern');
      expect(patternTexts).toContain('new-pattern');
    });

    test('merges duplicate patterns by pattern_text (deduplication)', async () => {
      // First session
      await persistAnalysisResults(testDir, makeSession({
        patterns: [{
          pattern_text: 'duplicate-pattern',
          count: 4,
          category: 'code_style' as any,
          examples: [] as any,
          suggested_rule: 'rule',
          first_seen: '2026-03-10T10:00:00.000Z',
          last_seen: '2026-03-10T10:00:00.000Z',
          content_types: [],
          session_count: 1,
          total_frequency: 4,
          is_new: true,
          frequency_change: 4,
        }],
      }));

      // Second session with same pattern
      await persistAnalysisResults(testDir, makeSession({
        patterns: [{
          pattern_text: 'duplicate-pattern',
          count: 3,
          category: 'code_style' as any,
          examples: [] as any,
          suggested_rule: 'rule',
          first_seen: '2026-03-10T10:00:00.000Z',
          last_seen: new Date().toISOString(),
          content_types: [],
          session_count: 2,
          total_frequency: 7, // 4 + 3
          is_new: false,
          frequency_change: 3,
        }],
      }));

      const state = readState();
      const patterns = state.patterns_found as MergedPattern[];
      const duplicates = patterns.filter((p: MergedPattern) => p.pattern_text === 'duplicate-pattern');
      expect(duplicates.length).toBe(1); // No duplicates
      expect(duplicates[0].total_frequency).toBe(7); // Frequencies merged
      expect(duplicates[0].session_count).toBe(2); // Sessions incremented
    });

    test('handles legacy string[] patterns_found (backward compat from Stories 2-5/2-6)', async () => {
      // Write a legacy state.json with string[] patterns_found
      const statePath = path.join(testDir, 'state.json');
      const legacyState = {
        last_analysis: '',
        patterns_found: ['old-pattern-1', 'old-pattern-2'], // Legacy format
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'test',
      };
      fs.writeFileSync(statePath, JSON.stringify(legacyState, null, 2), { mode: 0o600 });

      await persistAnalysisResults(testDir, makeSession());

      const state = readState();
      // Should have converted to MergedPattern[] and added new pattern
      expect(Array.isArray(state.patterns_found)).toBe(true);
      const patterns = state.patterns_found as MergedPattern[];
      // New pattern should be present
      expect(patterns.some((p: MergedPattern) => p.pattern_text === 'prefer-async-await')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC2: Append session data to results.jsonl
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC2: Append session data to results.jsonl', () => {
    test('appends a JSONL line with correct field names', async () => {
      const session = makeSession({ approvedCount: 3, rejectedCount: 2 });

      await persistAnalysisResults(testDir, session);

      const results = readResults();
      expect(results.length).toBe(1);
      const entry = results[0];
      // Must match existing appendResult() field names
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('patterns');
      expect(entry).toHaveProperty('approved');
      expect(entry).toHaveProperty('rejected');
      expect(entry.approved).toBe(3);
      expect(entry.rejected).toBe(2);
    });

    test('timestamp is valid ISO 8601 UTC', async () => {
      await persistAnalysisResults(testDir, makeSession());

      const results = readResults();
      expect(results.length).toBe(1);
      const ts = results[0].timestamp;
      // ISO 8601 UTC format: ends with Z
      expect(ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // Is a valid date
      expect(new Date(ts).toISOString()).toBeDefined();
    });

    test('logs session even when no patterns found', async () => {
      const session = makeSession({ patterns: [], approvedCount: 0, rejectedCount: 0 });

      await persistAnalysisResults(testDir, session);

      const results = readResults();
      expect(results.length).toBe(1);
      expect(results[0].patterns).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC3: Complete writes within 1 second
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC3: Complete writes within 1 second (NFR3)', () => {
    test('state.json write completes in < 1 second', async () => {
      const start = performance.now();

      await persistAnalysisResults(testDir, makeSession());

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(1000); // 1 second = 1000ms
    });

    test('handles multiple sequential persist calls efficiently', async () => {
      const start = performance.now();

      for (let i = 0; i < 10; i++) {
        await persistAnalysisResults(testDir, makeSession({
          patterns: [{
            pattern_text: `pattern-${i}`,
            count: 1,
            category: 'code_style' as any,
            examples: [] as any,
            suggested_rule: `rule-${i}`,
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
            session_count: 1,
            total_frequency: 1,
            is_new: true,
            frequency_change: 1,
          }],
        }));
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(5000); // 10 writes in < 5 seconds total
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC4: Preserve original state on write failure
  // ═══════════════════════════════════════════════════════════════════════

  describe('AC4: Preserve original state on write failure (NFR15)', () => {
    test('preserves original state.json when write fails', async () => {
      // Write initial state
      await persistAnalysisResults(testDir, makeSession());
      const originalState = readState();
      const originalStateStr = JSON.stringify(originalState);

      // Force write failure: create a DIRECTORY at the temp file path
      // so writeFile fails because it can't write to a directory
      const tmpPath = path.join(testDir, 'state.json.tmp');
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        await persistAnalysisResults(testDir, makeSession({
          patterns: [{
            pattern_text: 'should-not-appear',
            count: 1,
            category: 'code_style' as any,
            examples: [] as any,
            suggested_rule: 'rule',
            first_seen: new Date().toISOString(),
            last_seen: new Date().toISOString(),
            content_types: [],
            session_count: 1,
            total_frequency: 1,
            is_new: true,
            frequency_change: 1,
          }],
        }));
      } catch {
        // Expected to fail
      }

      // Clean up blocker directory
      fs.rmSync(tmpPath, { recursive: true, force: true });

      const preservedState = readState();
      expect(JSON.stringify(preservedState)).toBe(originalStateStr);
      // The "should-not-appear" pattern must NOT be in the state
      const patterns = preservedState.patterns_found as MergedPattern[];
      expect(patterns.some((p: MergedPattern) => p.pattern_text === 'should-not-appear')).toBe(false);
    });

    test('cleans up temp file after failed write', async () => {
      // Force failure: create a DIRECTORY at the temp file path
      const tmpPath = path.join(testDir, 'state.json.tmp');
      fs.mkdirSync(tmpPath, { recursive: true });

      try {
        await persistAnalysisResults(testDir, makeSession());
      } catch {
        // Expected
      }

      // Clean up blocker directory
      fs.rmSync(tmpPath, { recursive: true, force: true });

      // No temp files should be left behind
      const files = fs.readdirSync(testDir);
      const tempFiles = files.filter(f => f.endsWith('.tmp') || f.endsWith('.bak'));
      expect(tempFiles.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // AC5: State metadata updates
  // ═══════════════════════════════════════════════════════════════════════

  describe('State metadata updates (FR30-FR32)', () => {
    test('updates last_analysis timestamp to ISO 8601 UTC', async () => {
      const beforeTime = new Date().toISOString();

      await persistAnalysisResults(testDir, makeSession());

      const state = readState();
      expect(state.last_analysis).not.toBe('');
      // Should be a valid ISO 8601 date >= beforeTime
      expect(new Date(state.last_analysis).getTime()).toBeGreaterThanOrEqual(
        new Date(beforeTime).getTime() - 1000 // Allow 1s clock skew
      );
    });

    test('increments improvements_applied count', async () => {
      await persistAnalysisResults(testDir, makeSession({ approvedCount: 3 }));
      const state1 = readState();
      expect(state1.improvements_applied).toBeGreaterThanOrEqual(3);

      await persistAnalysisResults(testDir, makeSession({ approvedCount: 2 }));
      const state2 = readState();
      expect(state2.improvements_applied).toBeGreaterThanOrEqual(5);
    });

    test('preserves platform value from previous sessions', async () => {
      // Set platform
      const statePath = path.join(testDir, 'state.json');
      const state = readState();
      state.platform = 'cursor';
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2), { mode: 0o600 });

      await persistAnalysisResults(testDir, makeSession());

      const updated = readState();
      expect(updated.platform).toBe('cursor'); // Platform preserved
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Unit: updatePatterns helper
  // ═══════════════════════════════════════════════════════════════════════

  describe('updatePatterns helper', () => {
    test('adds new patterns with is_new=true and correct first_seen', () => {
      const existing: MergedPattern[] = [];
      const newPatterns: MergedPattern[] = [{
        pattern_text: 'brand-new',
        count: 1,
        category: 'code_style' as any,
        examples: [] as any,
        suggested_rule: 'rule',
        first_seen: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        content_types: [],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 1,
      }];

      const merged = updatePatterns(existing, newPatterns);
      expect(merged.length).toBe(1);
      expect(merged[0].is_new).toBe(true);
      expect(merged[0].pattern_text).toBe('brand-new');
    });

    test('increments session_count for existing patterns', () => {
      const existing: MergedPattern[] = [{
        pattern_text: 'known-pattern',
        count: 3,
        category: 'code_style' as any,
        examples: [] as any,
        suggested_rule: 'rule',
        first_seen: '2026-03-10T10:00:00.000Z',
        last_seen: '2026-03-15T10:00:00.000Z',
        content_types: [],
        session_count: 2,
        total_frequency: 3,
        is_new: false,
        frequency_change: 1,
      }];

      const newPatterns: MergedPattern[] = [{
        pattern_text: 'known-pattern',
        count: 2,
        category: 'code_style' as any,
        examples: [] as any,
        suggested_rule: 'rule',
        first_seen: '2026-03-10T10:00:00.000Z',
        last_seen: new Date().toISOString(),
        content_types: [],
        session_count: 3, // Expected after merge
        total_frequency: 5, // 3 + 2
        is_new: false,
        frequency_change: 2, // Delta from this session
      }];

      const merged = updatePatterns(existing, newPatterns);
      expect(merged.length).toBe(1); // No duplicates
      expect(merged[0].session_count).toBe(3);
      expect(merged[0].total_frequency).toBe(5);
    });

    test('handles empty existing patterns', () => {
      const newPatterns: MergedPattern[] = [
        {
          pattern_text: 'first',
          count: 1,
          category: 'code_style' as any,
          examples: [] as any,
          suggested_rule: 'r1',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 1,
        },
        {
          pattern_text: 'second',
          count: 1,
          category: 'error_handling' as any,
          examples: [] as any,
          suggested_rule: 'r2',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [],
          session_count: 1,
          total_frequency: 1,
          is_new: true,
          frequency_change: 1,
        },
      ];

      const merged = updatePatterns([], newPatterns);
      expect(merged.length).toBe(2);
    });

    test('handles empty new patterns gracefully', () => {
      const existing: MergedPattern[] = [{
        pattern_text: 'existing',
        count: 5,
        category: 'code_style' as any,
        examples: [] as any,
        suggested_rule: 'rule',
        first_seen: '2026-03-01T00:00:00.000Z',
        last_seen: '2026-03-15T00:00:00.000Z',
        content_types: [],
        session_count: 3,
        total_frequency: 5,
        is_new: false,
        frequency_change: 2,
      }];

      const merged = updatePatterns(existing, []);
      expect(merged.length).toBe(1);
      expect(merged[0].pattern_text).toBe('existing');
    });
  });
});
