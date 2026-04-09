/**
 * E2E Tests for Command Variants (Story 1-7)
 *
 * Testing Strategy:
 * - E2E tests focus on critical user journeys requiring full system interaction
 * - Test complete workflows from command invocation to output
 * - Use real skill data directory and production-like environment
 * - Only for flows that genuinely require end-to-end testing
 *
 * Coverage: AC1-AC7 (Critical Paths Only)
 * FR37: Command variants (--stats, --history, --rollback)
 *
 * NOTE: These tests require the skill to be fully implemented.
 * They will fail until Story 1-7 implementation is complete (TDD red phase).
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// E2E test interfaces
interface E2ETestResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  success: boolean;
}

// Real skill paths
const SKILL_DATA_DIR = path.join(process.cwd(), '.claude/skills/rulesmith/data');
const STATE_FILE = path.join(SKILL_DATA_DIR, 'state.json');
const RESULTS_FILE = path.join(SKILL_DATA_DIR, 'results.jsonl');
const HISTORY_DIR = path.join(SKILL_DATA_DIR, 'history');

// Backup original state for cleanup
let originalState: string | null = null;
let originalResults: string | null = null;
let originalHistoryFiles: string[] = [];

function executeSkillCommand(command: string): E2ETestResult {
  try {
    // In real implementation, this would invoke the skill via Claude Code
    // For now, we'll simulate the expected behavior
    const result = execSync(command, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: 5000
    });

    return {
      exitCode: 0,
      stdout: result,
      stderr: '',
      success: true
    };
  } catch (error: any) {
    return {
      exitCode: error.status || 1,
      stdout: error.stdout || '',
      stderr: error.stderr || '',
      success: false
    };
  }
}

describe('E2E Tests: Command Variants - Critical User Journeys', () => {
  describe('Critical Journey 1: Developer monitors improvement progress (AC1, AC4)', () => {
    beforeAll(() => {
      // Backup original state
      if (fs.existsSync(STATE_FILE)) {
        originalState = fs.readFileSync(STATE_FILE, 'utf-8');
      }

      // Setup test state
      const testState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['async-await-pattern', 'error-handling-missing', 'type-validation'],
        improvements_applied: 7,
        corrections_reduction: 0.35,
        platform: 'claude-code',
        _schema_note: 'JSONL format for results.jsonl'
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(testState, null, 2));
    });

    afterAll(() => {
      // Restore original state
      if (originalState && fs.existsSync(STATE_FILE)) {
        fs.writeFileSync(STATE_FILE, originalState);
      }
    });

    test('should display comprehensive statistics with all metrics', () => {
      const result = executeSkillCommand('/improve-rules --stats');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('patterns_found');
      expect(result.stdout).toContain('3'); // Count of patterns
      expect(result.stdout).toContain('improvements_applied');
      expect(result.stdout).toContain('7');
      expect(result.stdout).toContain('corrections_reduction');
      expect(result.stdout).toContain('35%');
      expect(result.stdout).toContain('2026-03-16T10:30:00Z');
      expect(result.stdout).toContain('claude-code');
    });

    test('should format statistics in readable table format', () => {
      const result = executeSkillCommand('/improve-rules --stats');

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/Statistics|Metrics|Current Status/i);
      expect(result.stdout).toMatch(/Patterns Found|patterns_found/i);
      expect(result.stdout).toMatch(/Improvements|improvements_applied/i);
      expect(result.stdout).toMatch(/Reduction|corrections_reduction/i);
    });

    test('should calculate and display corrections_reduction percentage', () => {
      const result = executeSkillCommand('/improve-rules --stats');

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\d+%/);
      expect(result.stdout).toContain('35%');
    });

    test('should complete within performance threshold (2 seconds)', () => {
      const start = Date.now();
      const result = executeSkillCommand('/improve-rules --stats');
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Critical Journey 2: Developer reviews improvement history (AC2, AC5)', () => {
    beforeAll(() => {
      // Backup original results
      if (fs.existsSync(RESULTS_FILE)) {
        originalResults = fs.readFileSync(RESULTS_FILE, 'utf-8');
      }

      // Setup test results
      const testResults = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Fixed async/await pattern' },
        { timestamp: '2026-03-16T12:15:00Z', status: 'applied', summary: 'Added error handling' },
        { timestamp: '2026-03-15T18:45:00Z', status: 'pending', summary: 'Refactored validation logic' },
        { timestamp: '2026-03-15T10:00:00Z', status: 'applied', summary: 'Improved type safety' },
        { timestamp: '2026-03-14T16:20:00Z', status: 'failed', summary: 'Attempted code refactoring' }
      ];

      fs.writeFileSync(RESULTS_FILE, testResults.map(r => JSON.stringify(r)).join('\n') + '\n');
    });

    afterAll(() => {
      // Restore original results
      if (originalResults && fs.existsSync(RESULTS_FILE)) {
        fs.writeFileSync(RESULTS_FILE, originalResults);
      } else if (!originalResults && fs.existsSync(RESULTS_FILE)) {
        fs.unlinkSync(RESULTS_FILE);
      }
    });

    test('should display recent improvements in specified format', () => {
      const result = executeSkillCommand('/improve-rules --history');

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| \w+ \| .+/);
      expect(result.stdout).toContain('2026-03-16 14:30:00 | applied | Fixed async/await pattern');
      expect(result.stdout).toContain('2026-03-16 12:15:00 | applied | Added error handling');
      expect(result.stdout).toContain('pending');
      expect(result.stdout).toContain('failed');
    });

    test('should display entries most recent first', () => {
      const result = executeSkillCommand('/improve-rules --history');

      expect(result.success).toBe(true);
      const lines = result.stdout.split('\n').filter(line => line.includes('|'));
      expect(lines[0]).toContain('14:30:00'); // Most recent
      expect(lines[lines.length - 1]).toContain('16:20:00'); // Oldest
    });

    test('should show count of entries displayed', () => {
      const result = executeSkillCommand('/improve-rules --history');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('showing last 5');
    });

    test('should complete within performance threshold (2 seconds)', () => {
      const start = Date.now();
      const result = executeSkillCommand('/improve-rules --history');
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Critical Journey 3: Developer performs rollback to previous state (AC3, AC6, AC7)', () => {
    const testTimestamp = '2026-03-16T14:30:00Z';

    beforeAll(() => {
      // Backup original history
      if (fs.existsSync(HISTORY_DIR)) {
        originalHistoryFiles = fs.readdirSync(HISTORY_DIR).filter(f => f.endsWith('.md'));
      }

      // Setup test backup
      fs.writeFileSync(
        path.join(HISTORY_DIR, `${testTimestamp}.md`),
        '# Test Rules Backup\n\n## Rule 1\nUse async/await properly\n\n## Rule 2\nHandle errors appropriately\n'
      );
    });

    afterAll(() => {
      // Cleanup test backup
      const testBackup = path.join(HISTORY_DIR, `${testTimestamp}.md`);
      if (fs.existsSync(testBackup)) {
        fs.unlinkSync(testBackup);
      }
    });

    test('should provide complete step-by-step rollback guidance', () => {
      const result = executeSkillCommand(`/improve-rules --rollback --to ${testTimestamp}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Step 1');
      expect(result.stdout).toContain('Step 2');
      expect(result.stdout).toContain('Step 3');
      expect(result.stdout).toContain('Step 4');
      expect(result.stdout).toContain('Step 5');
      expect(result.stdout).toContain('Step 6');
    });

    test('should include backup file location in guidance', () => {
      const result = executeSkillCommand(`/improve-rules --rollback --to ${testTimestamp}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toContain(testTimestamp);
      expect(result.stdout).toContain('.md');
      expect(result.stdout).toContain('history/');
    });

    test('should include verification steps', () => {
      const result = executeSkillCommand(`/improve-rules --rollback --to ${testTimestamp}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/verify|verification|check/i);
      expect(result.stdout).toContain('/improve-rules --stats');
    });

    test('should include safety backup step', () => {
      const result = executeSkillCommand(`/improve-rules --rollback --to ${testTimestamp}`);

      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/backup.*current|safety/i);
    });

    test('should complete within performance threshold (2 seconds)', () => {
      const start = Date.now();
      const result = executeSkillCommand(`/improve-rules --rollback --to ${testTimestamp}`);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Critical Journey 4: Error handling and recovery', () => {
    test('should handle missing state.json with actionable AR22 error', () => {
      // Temporarily rename state file
      if (fs.existsSync(STATE_FILE)) {
        fs.renameSync(STATE_FILE, `${STATE_FILE}.backup`);
      }

      const result = executeSkillCommand('/improve-rules --stats');

      // Restore state file
      if (fs.existsSync(`${STATE_FILE}.backup`)) {
        fs.renameSync(`${STATE_FILE}.backup`, STATE_FILE);
      }

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('What happened');
      expect(result.stderr).toContain('State file not found');
      expect(result.stderr).toContain('How to fix');
      expect(result.stderr).toContain('/improve-rules');
      expect(result.stderr).toContain('Technical details');
    });

    test('should handle invalid timestamp format with AR22 error', () => {
      const result = executeSkillCommand('/improve-rules --rollback --to invalid-timestamp');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('What happened');
      expect(result.stderr).toContain('Invalid timestamp format');
      expect(result.stderr).toContain('YYYY-MM-DDTHH:MM:SSZ');
      expect(result.stderr).toContain('How to fix');
      expect(result.stderr).toContain('Technical details');
    });

    test('should handle missing --to parameter with AR22 error', () => {
      const result = executeSkillCommand('/improve-rules --rollback');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('What happened');
      expect(result.stderr).toContain('Missing timestamp parameter');
      expect(result.stderr).toContain('--to');
      expect(result.stderr).toContain('How to fix');
      expect(result.stderr).toContain('Technical details');
    });

    test('should list available backups when timestamp not found', () => {
      const result = executeSkillCommand('/improve-rules --rollback --to 2099-01-01T00:00:00Z');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('What happened');
      expect(result.stderr).toContain('Backup file not found');
      expect(result.stderr).toContain('Available timestamps');
      expect(result.stderr).toContain('How to fix');
      expect(result.stderr).toContain('/improve-rules --history');
      expect(result.stderr).toContain('Technical details');
    });
  });

  describe('Critical Journey 5: Combined command operations', () => {
    test('should display both stats and history when flags combined', () => {
      const result = executeSkillCommand('/improve-rules --stats --history');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('patterns_found');
      expect(result.stdout).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| \w+ \| .+/);
    });

    test('should reject invalid flag combinations with AR22 error', () => {
      const result = executeSkillCommand('/improve-rules --rollback --to 2026-03-16T14:30:00Z --stats');

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('What happened');
      expect(result.stderr).toContain('cannot be combined');
      expect(result.stderr).toContain('How to fix');
      expect(result.stderr).toContain('Technical details');
    });
  });

  describe('Critical Journey 6: Large-scale performance', () => {
    beforeAll(() => {
      // Backup original results
      if (fs.existsSync(RESULTS_FILE)) {
        originalResults = fs.readFileSync(RESULTS_FILE, 'utf-8');
      }

      // Create large results file (1000 entries)
      const entries = [];
      for (let i = 0; i < 1000; i++) {
        entries.push({
          timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i}`
        });
      }
      fs.writeFileSync(RESULTS_FILE, entries.map(e => JSON.stringify(e)).join('\n') + '\n');
    });

    afterAll(() => {
      // Restore original results
      if (originalResults && fs.existsSync(RESULTS_FILE)) {
        fs.writeFileSync(RESULTS_FILE, originalResults);
      } else if (!originalResults && fs.existsSync(RESULTS_FILE)) {
        fs.unlinkSync(RESULTS_FILE);
      }
    });

    test('should handle large history file efficiently', () => {
      const start = Date.now();
      const result = executeSkillCommand('/improve-rules --history');
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(2000);
      expect(result.stdout).toContain('showing last 10');
    });

    test('should limit output to last 10 entries regardless of file size', () => {
      const result = executeSkillCommand('/improve-rules --history');

      expect(result.success).toBe(true);
      const lines = result.stdout.split('\n').filter(line => line.includes('|'));
      expect(lines.length).toBe(10);
    });
  });

  describe('Critical Journey 7: Data integrity and validation', () => {
    test('should validate state.json schema before displaying stats', () => {
      // Create invalid state
      const invalidState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1']
        // Missing required fields
      };

      fs.writeFileSync(STATE_FILE, JSON.stringify(invalidState, null, 2));

      const result = executeSkillCommand('/improve-rules --stats');

      // Restore valid state
      const validState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1'],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'claude-code'
      };
      fs.writeFileSync(STATE_FILE, JSON.stringify(validState, null, 2));

      expect(result.success).toBe(false);
      expect(result.stderr).toContain('missing required fields');
    });

    test('should skip malformed JSONL entries with warnings', () => {
      const mixedContent = [
        { timestamp: '2026-03-16T10:00:00Z', status: 'applied', summary: 'Valid entry' },
        'invalid json line',
        { timestamp: '2026-03-16T11:00:00Z', status: 'applied', summary: 'Another valid entry' }
      ];

      fs.writeFileSync(RESULTS_FILE, mixedContent.map(e => typeof e === 'string' ? e : JSON.stringify(e)).join('\n') + '\n');

      const result = executeSkillCommand('/improve-rules --history');

      expect(result.success).toBe(true);
      expect(result.stdout).toContain('Skipping malformed entry');
      expect(result.stdout).toContain('Valid entry');
      expect(result.stdout).toContain('Another valid entry');
    });
  });
});
