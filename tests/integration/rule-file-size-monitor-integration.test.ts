/**
 * Integration Tests for Rule File Size Monitor (Story 6-5)
 *
 * Tests the integration of rule file size monitoring with:
 * - Command variants (--stats, --history, --analyze)
 * - State management
 * - Platform detection
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  checkAndWarnRuleFileSize,
  RULE_FILE_SIZE_THRESHOLD,
} from '../../src/rule-file-size-monitor';
import { detectPlatform, getRulesFilePath, AR22Error } from '../../src/command-variants';

// ============================================================================
// INTEGRATION WITH COMMAND VARIANTS
// ============================================================================

describe('Rule File Size Monitor - Command Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size-integration');
  const testStateFile = path.join(testDir, 'state.json');
  const testRulesFile = path.join(testDir, 'custom-instructions.md');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create clean state
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    fs.writeFileSync(testStateFile, JSON.stringify(initialState, null, 2));
  });

  test('should warn when file exceeds threshold during stats command', () => {
    // Create a rules file with 550 lines
    const content = Array(550).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    const result = checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    
    expect(result.shouldWarn).toBe(true);
    expect(result.lineCount).toBe(550);
    expect(result.warning).toContain('⚠️ Rule file exceeds 500 lines');
  });

  test('should not warn when file is below threshold', () => {
    // Create a rules file with 300 lines
    const content = Array(300).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    const result = checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    
    expect(result.shouldWarn).toBe(false);
    expect(result.lineCount).toBe(300);
    expect(result.warning).toBeNull();
  });

  test('should update state.json with line count', () => {
    const content = Array(400).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    
    const updatedState = JSON.parse(fs.readFileSync(testStateFile, 'utf-8'));
    expect(updatedState.rule_file_line_count).toBe(400);
  });

  test('should handle missing rules file gracefully', () => {
    const nonExistentRules = path.join(testDir, 'does-not-exist.md');
    
    expect(() => checkAndWarnRuleFileSize(nonExistentRules, testStateFile))
      .toThrow(AR22Error);
  });

  test('should handle missing state file gracefully', () => {
    const content = Array(100).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    const nonExistentState = path.join(testDir, 'does-not-exist-state.json');
    
    // checkAndWarnRuleFileSize catches state errors and logs them (doesn't throw)
    // This is by design - state updates are best effort
    const result = checkAndWarnRuleFileSize(testRulesFile, nonExistentState);
    
    // Should still return valid result even if state update failed
    expect(result.lineCount).toBe(100);
    expect(result.shouldWarn).toBe(false);
  });
});

// ============================================================================
// INTEGRATION WITH PLATFORM DETECTION
// ============================================================================

describe('Rule File Size Monitor - Platform Integration', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size-platform');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should work with Claude Code rules file', () => {
    const claudeRules = path.join(testDir, '.claude/custom-instructions.md');
    const stateFile = path.join(testDir, 'state.json');
    
    // Create directory structure
    fs.mkdirSync(path.dirname(claudeRules), { recursive: true });
    
    const content = Array(520).fill('# Rule').join('\n');
    fs.writeFileSync(claudeRules, content);
    
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    const result = checkAndWarnRuleFileSize(claudeRules, stateFile);
    expect(result.shouldWarn).toBe(true);
    expect(result.lineCount).toBe(520);
  });

  test('should work with Cursor rules file', () => {
    const cursorRules = path.join(testDir, '.cursorrules');
    const stateFile = path.join(testDir, 'state.json');
    
    const content = Array(600).fill('# Rule').join('\n');
    fs.writeFileSync(cursorRules, content);
    
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'cursor',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    const result = checkAndWarnRuleFileSize(cursorRules, stateFile);
    expect(result.shouldWarn).toBe(true);
    expect(result.lineCount).toBe(600);
  });

  test('should work with Copilot instructions file', () => {
    const copilotInstructions = path.join(testDir, '.github/copilot-instructions.md');
    const stateFile = path.join(testDir, 'state.json');
    
    // Create directory structure
    fs.mkdirSync(path.dirname(copilotInstructions), { recursive: true });
    
    const content = Array(550).fill('# Rule').join('\n');
    fs.writeFileSync(copilotInstructions, content);
    
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'copilot',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    const result = checkAndWarnRuleFileSize(copilotInstructions, stateFile);
    expect(result.shouldWarn).toBe(true);
    expect(result.lineCount).toBe(550);
  });
});

// ============================================================================
// PERFORMANCE TESTS
// ============================================================================

describe('Rule File Size Monitor - Performance', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size-perf');
  const testRulesFile = path.join(testDir, 'test-rules.md');
  const testStateFile = path.join(testDir, 'state.json');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create state file
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    fs.writeFileSync(testStateFile, JSON.stringify(initialState, null, 2));
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should process 500 lines in under 100ms', () => {
    const content = Array(500).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    const start = Date.now();
    checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  test('should process 1000 lines in under 100ms', () => {
    const content = Array(1000).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    const start = Date.now();
    checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });

  test('should process 5000 lines in under 100ms', () => {
    const content = Array(5000).fill('# Rule line').join('\n');
    fs.writeFileSync(testRulesFile, content);
    
    const start = Date.now();
    checkAndWarnRuleFileSize(testRulesFile, testStateFile);
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100);
  });
});
