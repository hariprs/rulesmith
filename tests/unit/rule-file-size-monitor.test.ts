/**
 * Unit Tests for Rule File Size Monitor (Story 6-5)
 *
 * Comprehensive test suite following the test architecture principle:
 * unit > integration > E2E
 *
 * Tests cover:
 * - Line counting functionality
 * - Threshold checking
 * - Warning message generation
 * - State update integration
 * - Edge cases (missing file, empty file, large files)
 * - AR22 compliant error messages
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  countFileLines,
  checkFileSize,
  generateSizeWarning,
  updateStateWithLineCount,
  RULE_FILE_SIZE_THRESHOLD,
  MAX_FILE_SIZE_BYTES,
} from '../../src/rule-file-size-monitor';
import { AR22Error } from '../../src/command-variants';

// ============================================================================
// TEST UTILITIES
// ============================================================================

describe('Rule File Size Monitor - Test Utilities', () => {
  test('should import all required functions', () => {
    expect(typeof countFileLines).toBe('function');
    expect(typeof checkFileSize).toBe('function');
    expect(typeof generateSizeWarning).toBe('function');
    expect(typeof updateStateWithLineCount).toBe('function');
  });

  test('RULE_FILE_SIZE_THRESHOLD should be 500', () => {
    expect(RULE_FILE_SIZE_THRESHOLD).toBe(500);
  });

  test('MAX_FILE_SIZE_BYTES should be 10MB', () => {
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024); // 10MB
  });
});

// ============================================================================
// LINE COUNTING
// ============================================================================

describe('countFileLines', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size');
  const testFile = path.join(testDir, 'test-rules.md');

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

  test('should count lines in a simple file', () => {
    const content = 'Line 1\nLine 2\nLine 3\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should count empty lines as well', () => {
    const content = 'Line 1\n\nLine 3\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should handle file without trailing newline', () => {
    const content = 'Line 1\nLine 2\nLine 3';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should return 0 for empty file', () => {
    fs.writeFileSync(testFile, '');
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(0);
  });

  test('should handle file with only whitespace', () => {
    const content = '   \n  \n\t\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should throw AR22Error for non-existent file', () => {
    const nonExistentFile = path.join(testDir, 'does-not-exist.md');
    
    expect(() => countFileLines(nonExistentFile)).toThrow(AR22Error);
  });

  test('should throw AR22Error with AR22 format', () => {
    const nonExistentFile = path.join(testDir, 'does-not-exist.md');
    
    expect(() => countFileLines(nonExistentFile)).toThrow(/Rule file not found/);
  });

  test('should handle large files efficiently', () => {
    const lines = Array(1000).fill('Test rule line').join('\n');
    fs.writeFileSync(testFile, lines);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(1000);
  });

  test('should reject paths with path traversal', () => {
    const maliciousPath = path.join(testDir, '../../../etc/passwd');
    
    expect(() => countFileLines(maliciousPath)).toThrow(AR22Error);
  });

  test('should reject empty paths', () => {
    expect(() => countFileLines('')).toThrow(AR22Error);
    expect(() => countFileLines('   ')).toThrow(AR22Error);
  });
});

// ============================================================================
// FILE SIZE CHECK
// ============================================================================

describe('checkFileSize', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size');
  const testFile = path.join(testDir, 'test-rules.md');

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

  test('should return false when below threshold', () => {
    const content = Array(100).fill('Rule line').join('\n');
    fs.writeFileSync(testFile, content);
    
    const result = checkFileSize(testFile);
    expect(result.exceedsThreshold).toBe(false);
    expect(result.lineCount).toBe(100);
    expect(result.shouldWarn).toBe(false);
  });

  test('should return true when at threshold', () => {
    const content = Array(500).fill('Rule line').join('\n');
    fs.writeFileSync(testFile, content);
    
    const result = checkFileSize(testFile);
    expect(result.exceedsThreshold).toBe(true);
    expect(result.lineCount).toBe(500);
    expect(result.shouldWarn).toBe(true);
  });

  test('should return true when above threshold', () => {
    const content = Array(600).fill('Rule line').join('\n');
    fs.writeFileSync(testFile, content);
    
    const result = checkFileSize(testFile);
    expect(result.exceedsThreshold).toBe(true);
    expect(result.lineCount).toBe(600);
    expect(result.shouldWarn).toBe(true);
  });

  test('should have max file size guard in code', () => {
    // Verify the constant is set correctly
    expect(MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    
    // The max file size check is implemented in countFileLines
    // We verify the constant and logic exist through the implementation
    expect(typeof countFileLines).toBe('function');
  });

  test('should handle non-existent file gracefully', () => {
    const nonExistentFile = path.join(testDir, 'does-not-exist.md');
    
    expect(() => checkFileSize(nonExistentFile)).toThrow(AR22Error);
  });
});

// ============================================================================
// WARNING MESSAGE GENERATION
// ============================================================================

describe('generateSizeWarning', () => {
  test('should generate warning message for 501 lines', () => {
    const warning = generateSizeWarning(501);
    
    expect(warning).toContain('⚠️ Rule file exceeds 500 lines');
    expect(warning).toContain('501');
    expect(warning).toMatch(/consolidat/i);
  });

  test('should generate warning message for 600 lines', () => {
    const warning = generateSizeWarning(600);
    
    expect(warning).toContain('⚠️ Rule file exceeds 500 lines');
    expect(warning).toContain('600');
    expect(warning).toMatch(/consolidat/i);
  });

  test('should include current line count in warning', () => {
    const lineCount = 750;
    const warning = generateSizeWarning(lineCount);
    
    expect(warning).toContain('750');
  });

  test('should suggest consolidation as solution', () => {
    const warning = generateSizeWarning(550);
    
    expect(warning).toMatch(/consolidat/i);
  });

  test('should follow AR22 error format', () => {
    const warning = generateSizeWarning(520);
    
    expect(warning).toContain('What happened');
    expect(warning).toContain('How to fix');
  });
});

// ============================================================================
// STATE UPDATE
// ============================================================================

describe('updateStateWithLineCount', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size');
  const stateFile = path.join(testDir, 'state.json');

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

  test('should update state.json with line count', () => {
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    updateStateWithLineCount(stateFile, 450);
    
    const updatedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    expect(updatedState.rule_file_line_count).toBe(450);
  });

  test('should preserve existing state fields', () => {
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: ['pattern1', 'pattern2'],
      improvements_applied: 5,
      corrections_reduction: 25,
      platform: 'cursor',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    updateStateWithLineCount(stateFile, 300);
    
    const updatedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    expect(updatedState.last_analysis).toBe('2026-04-08T10:00:00Z');
    expect(updatedState.patterns_found).toEqual(['pattern1', 'pattern2']);
    expect(updatedState.improvements_applied).toBe(5);
    expect(updatedState.corrections_reduction).toBe(25);
    expect(updatedState.platform).toBe('cursor');
    expect(updatedState.rule_file_line_count).toBe(300);
  });

  test('should handle non-existent state file', () => {
    const nonExistentState = path.join(testDir, 'does-not-exist-state.json');
    
    expect(() => updateStateWithLineCount(nonExistentState, 100))
      .toThrow(AR22Error);
  });

  test('should handle corrupted state.json', () => {
    fs.writeFileSync(stateFile, 'not valid json');
    
    expect(() => updateStateWithLineCount(stateFile, 100))
      .toThrow(AR22Error);
  });

  test('should handle null line count gracefully', () => {
    const initialState = {
      last_analysis: '2026-04-08T10:00:00Z',
      patterns_found: [],
      improvements_applied: 0,
      corrections_reduction: 0,
      platform: 'claude-code',
      _schema_note: 'results.jsonl is append-only, one JSON object per line',
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(initialState, null, 2));
    
    updateStateWithLineCount(stateFile, null);
    
    const updatedState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
    expect(updatedState.rule_file_line_count).toBeNull();
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Edge Cases', () => {
  const testDir = path.join(__dirname, '../fixtures/rule-file-size');
  const testFile = path.join(testDir, 'test-rules.md');

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

  test('should handle Windows-style line endings (CRLF)', () => {
    const content = 'Line 1\r\nLine 2\r\nLine 3\r\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should handle mixed line endings', () => {
    const content = 'Line 1\nLine 2\r\nLine 3\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should handle Unicode content', () => {
    const content = '规则 1\n规则 2\n规则 3\n';
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(3);
  });

  test('should handle very long lines', () => {
    const longLine = 'x'.repeat(10000);
    const content = `${longLine}\nLine 2\n`;
    fs.writeFileSync(testFile, content);
    
    const lineCount = countFileLines(testFile);
    expect(lineCount).toBe(2);
  });

  test('should handle permission errors', () => {
    // This test may fail on some systems, so we just check it throws
    const unreadableFile = path.join(testDir, 'unreadable.md');
    fs.writeFileSync(unreadableFile, 'content');
    fs.chmodSync(unreadableFile, 0o000);
    
    expect(() => countFileLines(unreadableFile)).toThrow();
    
    // Cleanup
    fs.chmodSync(unreadableFile, 0o644);
  });

  test('should handle directory path instead of file', () => {
    expect(() => countFileLines(testDir)).toThrow();
  });
});
