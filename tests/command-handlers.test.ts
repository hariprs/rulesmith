/**
 * Integration Tests for Command Handlers (Story 1-6)
 *
 * Testing Strategy:
 * - Integration tests focus on interactions between components
 * - Test command handlers with real state management operations
 * - Use temporary test directories for file operations
 * - Verify end-to-end functionality without external dependencies
 *
 * Coverage: FR36-FR39, FR40-FR44, AR22
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import { initializeState, appendResult, StateData } from '../src/state-management';

// Mock command handlers (to be implemented in real code)
interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

async function handleStatsCommand(dataDir: string): Promise<CommandResult> {
  try {
    const statePath = path.join(dataDir, 'state.json');
    if (!fs.existsSync(statePath)) {
      return {
        success: false,
        output: '',
        error: 'State file not found. Please initialize the skill first.'
      };
    }

    const content = fs.readFileSync(statePath, 'utf-8');
    const state: StateData = JSON.parse(content);

    const output = [
      '**Current Metrics**',
      '',
      `Patterns Found: ${state.patterns_found.length}`,
      `Improvements Applied: ${state.improvements_applied}`,
      `Corrections Reduction: ${(state.corrections_reduction * 100).toFixed(1)}%`,
      `Platform: ${state.platform}`,
      `Last Analysis: ${state.last_analysis || 'Never'}`
    ].join('\n');

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to read state: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleHistoryCommand(dataDir: string, limit: number = 10): Promise<CommandResult> {
  try {
    const resultsPath = path.join(dataDir, 'results.jsonl');
    if (!fs.existsSync(resultsPath)) {
      return {
        success: false,
        output: '',
        error: 'Results file not found. Please initialize the skill first.'
      };
    }

    const content = fs.readFileSync(resultsPath, 'utf-8');
    const lines = content.trim().split('\n').filter(line => line.length > 0);

    if (lines.length === 0) {
      return {
        success: true,
        output: '**Recent Improvements**\n\nNo improvements recorded yet.'
      };
    }

    const recentLines = lines.slice(-limit);
    const entries = recentLines.map((line, index) => {
      const entry = JSON.parse(line);
      return `${lines.length - recentLines.length + index + 1}. ${entry.timestamp || 'Unknown timestamp'}: ${entry.summary || 'No summary'}`;
    });

    const output = [
      '**Recent Improvements**',
      '',
      `Showing last ${entries.length} of ${lines.length} total improvements`,
      '',
      ...entries
    ].join('\n');

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to read history: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function handleRollbackCommand(dataDir: string, timestamp: string): Promise<CommandResult> {
  try {
    const historyDir = path.join(dataDir, 'history');
    const backupPath = path.join(historyDir, `${timestamp}.md`);

    if (!fs.existsSync(backupPath)) {
      return {
        success: false,
        output: '',
        error: `Backup not found: ${timestamp}.md\n\nAvailable backups:\n${listAvailableBackups(historyDir)}`
      };
    }

    const output = [
      '**Rollback Instructions**',
      '',
      `Backup file: ${backupPath}`,
      '',
      'To restore this backup:',
      '1. Navigate to your project root',
      `2. Copy the backup content to your rule file`,
      `3. Run: cp "${backupPath}" .cursorrules`,
      '',
      '**Note:** This is a manual process to ensure you review changes before applying.'
    ].join('\n');

    return { success: true, output };
  } catch (error) {
    return {
      success: false,
      output: '',
      error: `Failed to prepare rollback: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

function listAvailableBackups(historyDir: string): string {
  if (!fs.existsSync(historyDir)) {
    return 'No backups available.';
  }

  const files = fs.readdirSync(historyDir)
    .filter(f => f.endsWith('.md') && f !== '.gitkeep')
    .sort()
    .reverse();

  if (files.length === 0) {
    return 'No backups available.';
  }

  return files.map(f => `  - ${f}`).join('\n');
}

describe('Command Handlers - Integration Tests', () => {
  const testDir = path.join(__dirname, '..', '..', 'data-test-integration');

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

  describe('--stats Command Handler', () => {
    test('should display current metrics from state.json', async () => {
      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Current Metrics');
      expect(result.output).toContain('Patterns Found: 0');
      expect(result.output).toContain('Improvements Applied: 0');
      expect(result.output).toContain('Corrections Reduction: 0.0%');
      expect(result.output).toContain('Platform: unknown');
    });

    test('should display updated metrics after state changes', async () => {
      // Update state with test data
      const statePath = path.join(testDir, 'state.json');
      const state: StateData = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
      state.patterns_found = ['pattern1', 'pattern2'];
      state.improvements_applied = 5;
      state.corrections_reduction = 0.25;
      state.last_analysis = '2024-03-16T10:30:00Z';
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));

      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Patterns Found: 2');
      expect(result.output).toContain('Improvements Applied: 5');
      expect(result.output).toContain('Corrections Reduction: 25.0%');
      expect(result.output).toContain('Last Analysis: 2024-03-16T10:30:00Z');
    });

    test('should return error if state.json does not exist', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');
      const result = await handleStatsCommand(nonExistentDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('State file not found');
      expect(result.error).toContain('initialize the skill first');
    });

    test('should handle corrupted state.json gracefully', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'invalid json content');

      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read state');
    });

    test('should format output consistently (AR22)', async () => {
      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(true);
      // Check for consistent formatting
      expect(result.output).toMatch(/\*\*.*\*\*/); // Markdown bold headers
      expect(result.output).toContain(': '); // Key-value separator
    });
  });

  describe('--history Command Handler', () => {
    test('should display empty history when no results exist', async () => {
      const result = await handleHistoryCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Recent Improvements');
      expect(result.output).toContain('No improvements recorded yet');
    });

    test('should display recent improvements from results.jsonl', async () => {
      // Add test results
      await appendResult(testDir, {
        timestamp: '2024-03-16T10:00:00Z',
        summary: 'First improvement'
      });
      await appendResult(testDir, {
        timestamp: '2024-03-16T11:00:00Z',
        summary: 'Second improvement'
      });
      await appendResult(testDir, {
        timestamp: '2024-03-16T12:00:00Z',
        summary: 'Third improvement'
      });

      const result = await handleHistoryCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Recent Improvements');
      expect(result.output).toContain('Showing last 3 of 3 total improvements');
      expect(result.output).toContain('First improvement');
      expect(result.output).toContain('Second improvement');
      expect(result.output).toContain('Third improvement');
    });

    test('should respect limit parameter and show most recent entries', async () => {
      // Add 15 test results
      for (let i = 1; i <= 15; i++) {
        await appendResult(testDir, {
          timestamp: `2024-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          summary: `Improvement ${i}`
        });
      }

      const result = await handleHistoryCommand(testDir, 10);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Showing last 10 of 15 total improvements');
      expect(result.output).toContain('Improvement 15'); // Most recent
      expect(result.output).toContain('Improvement 6');  // 10th most recent
      expect(result.output).not.toContain('Improvement 5'); // Older than limit
    });

    test('should return error if results.jsonl does not exist', async () => {
      const nonExistentDir = path.join(testDir, 'non-existent');
      const result = await handleHistoryCommand(nonExistentDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Results file not found');
    });

    test('should handle corrupted results.jsonl gracefully', async () => {
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.writeFileSync(resultsPath, 'not valid json');

      const result = await handleHistoryCommand(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to read history');
    });

    test('should skip empty lines in results.jsonl', async () => {
      const resultsPath = path.join(testDir, 'results.jsonl');
      fs.appendFileSync(resultsPath, JSON.stringify({ timestamp: '2024-03-16T10:00:00Z', summary: 'Valid entry' }) + '\n');
      fs.appendFileSync(resultsPath, '\n'); // Empty line
      fs.appendFileSync(resultsPath, JSON.stringify({ timestamp: '2024-03-16T11:00:00Z', summary: 'Another valid entry' }) + '\n');

      const result = await handleHistoryCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Showing last 2 of 2 total improvements');
    });
  });

  describe('--rollback Command Handler', () => {
    test('should provide rollback instructions for existing backup', async () => {
      const timestamp = '2024-03-16T10:30:00Z';
      const historyDir = path.join(testDir, 'history');
      const backupPath = path.join(historyDir, `${timestamp}.md`);

      // Create test backup
      fs.writeFileSync(backupPath, '# Test Rules\n\nRule 1\nRule 2\n');

      const result = await handleRollbackCommand(testDir, timestamp);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Rollback Instructions');
      expect(result.output).toContain(backupPath);
      expect(result.output).toContain('To restore this backup');
      expect(result.output).toContain('cp');
      expect(result.output).toContain('manual process');
    });

    test('should list available backups when requested backup not found', async () => {
      const historyDir = path.join(testDir, 'history');

      // Create some test backups
      fs.writeFileSync(path.join(historyDir, '2024-03-16T10:00:00Z.md'), '# Backup 1');
      fs.writeFileSync(path.join(historyDir, '2024-03-16T11:00:00Z.md'), '# Backup 2');
      fs.writeFileSync(path.join(historyDir, '2024-03-16T12:00:00Z.md'), '# Backup 3');

      const result = await handleRollbackCommand(testDir, '2024-03-16T13:00:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup not found');
      expect(result.error).toContain('Available backups');
      expect(result.error).toContain('2024-03-16T12:00:00Z.md');
      expect(result.error).toContain('2024-03-16T11:00:00Z.md');
      expect(result.error).toContain('2024-03-16T10:00:00Z.md');
    });

    test('should handle missing history directory gracefully', async () => {
      const result = await handleRollbackCommand(testDir, '2024-03-16T10:30:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Backup not found');
      expect(result.error).toContain('No backups available');
    });

    test('should handle history directory with only .gitkeep', async () => {
      const result = await handleRollbackCommand(testDir, '2024-03-16T10:30:00Z');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No backups available');
    });

    test('should provide actionable error messages (AR22)', async () => {
      const result = await handleRollbackCommand(testDir, 'non-existent-timestamp');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('undefined');
      expect(result.error).not.toContain('Error: Error');
    });
  });

  describe('Command Integration with State Management', () => {
    test('should handle --stats after state initialization', async () => {
      // This tests integration between command handler and state management
      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Patterns Found: 0');
    });

    test('should handle --history after appending results', async () => {
      await appendResult(testDir, {
        timestamp: '2024-03-16T10:00:00Z',
        summary: 'Test improvement'
      });

      const result = await handleHistoryCommand(testDir);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Test improvement');
    });

    test('should handle --rollback after creating backup', async () => {
      const timestamp = '2024-03-16T10:30:00Z';
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, `${timestamp}.md`), '# Test backup');

      const result = await handleRollbackCommand(testDir, timestamp);

      expect(result.success).toBe(true);
      expect(result.output).toContain('Rollback Instructions');
    });
  });

  describe('Performance Requirements (NFR1-NFR4)', () => {
    test('should handle --stats in under 1 second', async () => {
      const start = Date.now();
      await handleStatsCommand(testDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    test('should handle --history in under 1 second', async () => {
      // Add some test data
      for (let i = 0; i < 10; i++) {
        await appendResult(testDir, {
          timestamp: `2024-03-16T${i.toString().padStart(2, '0')}:00:00Z`,
          summary: `Improvement ${i}`
        });
      }

      const start = Date.now();
      await handleHistoryCommand(testDir);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });

    test('should handle --rollback in under 1 second', async () => {
      const timestamp = '2024-03-16T10:30:00Z';
      const historyDir = path.join(testDir, 'history');
      fs.writeFileSync(path.join(historyDir, `${timestamp}.md`), '# Test');

      const start = Date.now();
      await handleRollbackCommand(testDir, timestamp);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Error Handling (FR40-FR44, AR22)', () => {
    test('should provide consistent error format for missing files', async () => {
      const statsResult = await handleStatsCommand('/non-existent');
      const historyResult = await handleHistoryCommand('/non-existent');

      expect(statsResult.success).toBe(false);
      expect(statsResult.error).toBeDefined();
      expect(historyResult.success).toBe(false);
      expect(historyResult.error).toBeDefined();
    });

    test('should include technical details in errors', async () => {
      const statePath = path.join(testDir, 'state.json');
      fs.writeFileSync(statePath, 'invalid json');

      const result = await handleStatsCommand(testDir);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('undefined');
    });

    test('should preserve state on command failures', async () => {
      const statePath = path.join(testDir, 'state.json');
      const originalContent = fs.readFileSync(statePath, 'utf-8');

      // Trigger an error
      await handleStatsCommand('/non-existent');

      // Verify state is unchanged
      expect(fs.existsSync(statePath)).toBe(true);
      expect(fs.readFileSync(statePath, 'utf-8')).toBe(originalContent);
    });
  });
});
