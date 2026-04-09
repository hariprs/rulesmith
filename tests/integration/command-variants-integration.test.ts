/**
 * Integration Tests for Command Variants (Story 1-7)
 *
 * Testing Strategy:
 * - Integration tests focus on interactions between command handlers and state management
 * - Test file operations, state reading, and command execution
 * - Use temporary test directories for isolated file operations
 * - Verify end-to-end command functionality
 *
 * Coverage: AC1-AC7
 * FR37: Command variants (--stats, --history, --rollback)
 * FR40: Error handling and recovery
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import { initializeState, appendResult, StateData } from '../../src/state-management';

// Integration test interfaces
interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
}

// Mock command handlers (to be implemented in production)
async function executeCommand(command: string, dataDir: string): Promise<CommandResult> {
  throw new Error('Command execution not implemented');
}

describe('Command Variants - Integration Tests', () => {
  const testDir = path.join(process.cwd(), 'data-test-integration-variants');
  const skillDataDir = path.join(process.cwd(), '.claude/skills/rulesmith/data');

  beforeEach(async () => {
    // Setup clean test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, 'history'), { recursive: true });

    // Initialize state
    await initializeState(testDir);
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('--stats command integration (AC1, AC4)', () => {
    test('should read and display state.json metrics correctly', async () => {
      // Update state with test data
      const statePath = path.join(testDir, 'state.json');
      const state: StateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      state.patterns_found = ['pattern1', 'pattern2', 'pattern3'];
      state.improvements_applied = 5;
      state.corrections_reduction = 0.25;
      state.last_analysis = '2026-03-16T10:30:00Z';
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('patterns_found');
      expect(result.output).toContain('3');
      expect(result.output).toContain('improvements_applied');
      expect(result.output).toContain('5');
      expect(result.output).toContain('corrections_reduction');
      expect(result.output).toContain('25%');
    });

    test('should handle missing state.json with AR22 error', async () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = await executeCommand('/improve-rules --stats', emptyDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('State file not found');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('/improve-rules');
      expect(result.error).toContain('Technical details');
    });

    test('should handle malformed state.json with AR22 error', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'invalid json content');

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('corrupted');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('Technical details');
    });

    test('should handle missing required fields with AR22 error', async () => {
      const statePath = path.join(testDir, 'state.json');
      const incompleteState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: []
        // Missing: improvements_applied, corrections_reduction, platform
      };
      fs.writeFileSync(statePath, JSON.stringify(incompleteState, null, 2));

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('missing required fields');
      expect(result.error).toContain('improvements_applied');
      expect(result.error).toContain('Technical details');
    });

    test('should handle empty state.json with appropriate message', async () => {
      const statePath = path.join(testDir, 'state.json');
      const state: StateData = {
        last_analysis: '',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown',
        _schema_note: 'results.jsonl is append-only, one JSON object per line'
      };
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No analysis data available yet');
      expect(result.output).toContain('Run /improve-rules');
    });

    test('should calculate corrections_reduction as percentage from baseline', async () => {
      const statePath = path.join(testDir, 'state.json');
      const state: StateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      state.corrections_reduction = 0.4235;
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('42.35%');
    });
  });

  describe('--history command integration (AC2, AC5)', () => {
    test('should read and display last 10 results.jsonl entries', async () => {
      // Add 15 test results
      for (let i = 1; i <= 15; i++) {
        await appendResult(testDir, {
          timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i}`
        });
      }

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('showing last 10');
      expect(result.output).toContain('Improvement 15');
      expect(result.output).toContain('Improvement 6');
      expect(result.output).not.toContain('Improvement 5');
    });

    test('should format entries as "YYYY-MM-DD HH:MM:SS | {status} | {description}"', async () => {
      await appendResult(testDir, {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed async/await pattern'
      });

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} \| applied \| Fixed async\/await pattern/);
    });

    test('should handle missing results.jsonl with AR22 error', async () => {
      const emptyDir = path.join(testDir, 'empty');
      fs.mkdirSync(emptyDir, { recursive: true });

      const result = await executeCommand('/improve-rules --history', emptyDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('History file not found');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('Technical details');
    });

    test('should handle empty results.jsonl with message', async () => {
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, '');

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('No improvement history available yet');
      expect(result.output).toContain('Run /improve-rules');
    });

    test('should skip malformed JSONL entries with warning', async () => {
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.appendFileSync(resultsPath, JSON.stringify({
        timestamp: '2026-03-16T10:00:00Z',
        status: 'applied',
        summary: 'Valid entry 1'
      }) + '\n');
      fs.appendFileSync(resultsPath, 'invalid json line\n');
      fs.appendFileSync(resultsPath, JSON.stringify({
        timestamp: '2026-03-16T11:00:00Z',
        status: 'applied',
        summary: 'Valid entry 2'
      }) + '\n');

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Skipping malformed entry');
      expect(result.output).toContain('Valid entry 1');
      expect(result.output).toContain('Valid entry 2');
    });

    test('should handle results.jsonl with fewer than 10 entries', async () => {
      for (let i = 1; i <= 3; i++) {
        await appendResult(testDir, {
          timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i}`
        });
      }

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('showing last 3');
      expect(result.output).toContain('Improvement 1');
      expect(result.output).toContain('Improvement 2');
      expect(result.output).toContain('Improvement 3');
    });

    test('should display entries most recent first', async () => {
      await appendResult(testDir, {
        timestamp: '2026-03-16T10:00:00Z',
        status: 'applied',
        summary: 'First improvement'
      });
      await appendResult(testDir, {
        timestamp: '2026-03-16T14:00:00Z',
        status: 'applied',
        summary: 'Second improvement'
      });
      await appendResult(testDir, {
        timestamp: '2026-03-16T12:00:00Z',
        status: 'pending',
        summary: 'Third improvement'
      });

      const result = await executeCommand('/improve-rules --history', testDir);

      expect(result.success).toBe(true);
      const lines = result.output.split('\n').filter(line => line.includes('|'));
      expect(lines[0]).toContain('Second improvement');
      expect(lines[1]).toContain('Third improvement');
      expect(lines[2]).toContain('First improvement');
    });
  });

  describe('--rollback command integration (AC3, AC6, AC7)', () => {
    test('should provide step-by-step manual restoration guidance', async () => {
      const timestamp = '2026-03-16T14:30:00Z';
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, `${timestamp}.md`), '# Test Rules\n\nRule 1\nRule 2\n');

      const result = await executeCommand(`/improve-rules --rollback --to ${timestamp}`, testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Step 1');
      expect(result.output).toContain('Step 2');
      expect(result.output).toContain('Step 3');
      expect(result.output).toContain('Step 4');
      expect(result.output).toContain('Step 5');
      expect(result.output).toContain('Step 6');
    });

    test('should validate timestamp exists in history/ directory (AC6)', async () => {
      const timestamp = '2026-03-16T14:30:00Z';
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, `${timestamp}.md`), '# Test backup');

      const result = await executeCommand(`/improve-rules --rollback --to ${timestamp}`, testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain(timestamp);
      expect(result.output).toContain('.md');
    });

    test('should provide AR22 error when timestamp not found (AC7)', async () => {
      const result = await executeCommand('/improve-rules --rollback --to 2099-01-01T00:00:00Z', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('Backup file not found');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('/improve-rules --history');
      expect(result.error).toContain('Technical details');
    });

    test('should list available timestamps when validation fails', async () => {
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, '2026-03-16T10:00:00Z.md'), '# Backup 1');
      fs.writeFileSync(path.join(historyDir, '2026-03-16T11:00:00Z.md'), '# Backup 2');
      fs.writeFileSync(path.join(historyDir, '2026-03-16T12:00:00Z.md'), '# Backup 3');

      const result = await executeCommand('/improve-rules --rollback --to 2099-01-01T00:00:00Z', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Available timestamps');
      expect(result.error).toContain('2026-03-16T12:00:00Z');
      expect(result.error).toContain('2026-03-16T11:00:00Z');
      expect(result.error).toContain('2026-03-16T10:00:00Z');
    });

    test('should provide AR22 error for missing --to parameter', async () => {
      const result = await executeCommand('/improve-rules --rollback', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('Missing timestamp parameter');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('--to');
      expect(result.error).toContain('Technical details');
    });

    test('should provide AR22 error for invalid timestamp format', async () => {
      const result = await executeCommand('/improve-rules --rollback --to invalid-format', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('Invalid timestamp format');
      expect(result.error).toContain('YYYY-MM-DDTHH:MM:SSZ');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('Technical details');
    });

    test('should reject timestamps in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      const futureTimestamp = futureDate.toISOString().replace('.000', '');

      const result = await executeCommand(`/improve-rules --rollback --to ${futureTimestamp}`, testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('future');
    });

    test('should handle empty history/ directory', async () => {
      const result = await executeCommand('/improve-rules --rollback --to 2026-03-16T14:30:00Z', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('No backup files available');
      expect(result.error).toContain('history/');
    });
  });

  describe('Combined flag operations', () => {
    test('should handle --stats --history combination', async () => {
      // Add test data
      await appendResult(testDir, {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Test improvement'
      });

      const result = await executeCommand('/improve-rules --stats --history', testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('patterns_found');
      expect(result.output).toContain('Test improvement');
    });

    test('should reject --rollback with other flags', async () => {
      const result = await executeCommand('/improve-rules --rollback --to 2026-03-16T14:30:00Z --stats', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('cannot be combined');
    });
  });

  describe('Performance requirements (NFR1-NFR4)', () => {
    test('should handle --stats in under 1 second', async () => {
      const start = Date.now();
      await executeCommand('/improve-rules --stats', testDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    test('should handle --history in under 1 second', async () => {
      // Add test data
      for (let i = 0; i < 50; i++) {
        await appendResult(testDir, {
          timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i}`
        });
      }

      const start = Date.now();
      await executeCommand('/improve-rules --history', testDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    test('should handle --rollback in under 1 second', async () => {
      const timestamp = '2026-03-16T14:30:00Z';
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, `${timestamp}.md`), '# Test backup');

      const start = Date.now();
      await executeCommand(`/improve-rules --rollback --to ${timestamp}`, testDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    }, 10000);

    test('should handle large results.jsonl efficiently', async () => {
      // Add 1000 entries
      for (let i = 0; i < 1000; i++) {
        await appendResult(testDir, {
          timestamp: `2026-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          status: 'applied',
          summary: `Improvement ${i}`
        });
      }

      const start = Date.now();
      const result = await executeCommand('/improve-rules --history', testDir);
      const duration = Date.now() - start;

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(1000);
      expect(result.output).toContain('showing last 10');
    }, 10000);
  });

  describe('File permission handling', () => {
    test('should handle state.json with correct permissions (0600)', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.chmodSync(statePath, 0o600);

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(true);
    });

    test('should provide AR22 error for incorrect file permissions', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.chmodSync(statePath, 0o000); // No permissions

      const result = await executeCommand('/improve-rules --stats', testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('permissions');
      expect(result.error).toContain('chmod');
      expect(result.error).toContain('Technical details');

      // Restore permissions for cleanup
      fs.chmodSync(statePath, 0o600);
    });
  });

  describe('Concurrent access handling', () => {
    test('should handle concurrent reads with retry logic', async () => {
      // Simulate concurrent access
      const promises = Array.from({ length: 5 }, () =>
        executeCommand('/improve-rules --stats', testDir)
      );

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    }, 15000);
  });

  describe('Error recovery and state preservation', () => {
    test('should preserve state on command failures', async () => {
      const statePath = path.join(testDir, 'state.json');
      const originalContent = fs.readFileSync(statePath, 'utf-8');

      await executeCommand('/improve-rules --stats', path.join(testDir, 'non-existent'));

      expect(fs.existsSync(statePath)).toBe(true);
      expect(fs.readFileSync(statePath, 'utf-8')).toBe(originalContent);
    });

    test('should not create partial state on errors', async () => {
      const tempStatePath = path.join(testDir, 'state.json.tmp');

      if (fs.existsSync(tempStatePath)) {
        fs.unlinkSync(tempStatePath);
      }

      await executeCommand('/improve-rules --stats', path.join(testDir, 'non-existent'));

      expect(fs.existsSync(tempStatePath)).toBe(false);
    });
  });
});
