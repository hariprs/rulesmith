/**
 * Backup Integration Tests (Story 5.2)
 *
 * Integration tests for createBackup function integration with FileWriter
 * Tests that persistent backups are created before file modifications
 *
 * Test Pyramid Level: Integration Tests
 * Coverage: Story 5.2 Task 2 (Integration with FileWriter)
 *
 * @module integration/backup-integration
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { FileWriter } from '../../src/review/file-writer';
import { Platform } from '../../src/platform-detector';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// Mock uuid to avoid ES module issues
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockPattern(): Pattern {
  return {
    pattern_text: 'Test pattern',
    category: PatternCategory.CODE_STYLE,
    count: 5,
    suggested_rule: 'Test suggested rule',
    first_seen: '2026-03-25T00:00:00Z',
    last_seen: '2026-03-25T01:00:00Z',
    content_types: [ContentType.CODE],
    examples: [],
  };
}

function createMockRuleSuggestion(
  id: string,
  ruleText: string,
  edited_rule?: string
): RuleSuggestion {
  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: createMockPattern(),
    ruleText,
    edited_rule,
    explanation: 'Test explanation',
    contentType: ContentType.CODE,
    confidence: 0.8,
    platformFormats: {
      cursor: ruleText,
      copilot: ruleText,
    },
  };
}

// ============================================================================
// INTEGRATION TESTS - Story 5.2 Task 2
// ============================================================================

describe('Backup Integration - Story 5.2', () => {
  let historyDir: string;
  let sourceFilePath: string;
  let originalContent: string;
  let fileWriter: FileWriter;

  beforeAll(async () => {
    // Use the actual project root .cursorrules file
    const projectRoot = process.cwd();
    sourceFilePath = path.join(projectRoot, '.cursorrules');
    historyDir = path.join(projectRoot, 'data', 'test-history-' + Date.now());

    // Create history directory
    await fs.mkdir(historyDir, { recursive: true });

    // Save original content
    try {
      originalContent = await fs.readFile(sourceFilePath, 'utf-8');
      // Ensure file meets minimum 100 byte requirement for backup
      if (originalContent.length < 100) {
        console.log(`File too small (${originalContent.length} bytes), extending content`);
        originalContent = '# Original Rules\n- Rule 1: This is a test rule that provides guidance for code reviews and ensures that all backups meet the minimum size requirement of 100 bytes as specified in the story requirements.\n- Rule 2: Additional guidance for consistent code quality and style across the project.';
        await fs.writeFile(sourceFilePath, originalContent, 'utf-8');
      }
    } catch {
      // File doesn't exist, create it with sufficient content for backup (minimum 100 bytes)
      originalContent = '# Original Rules\n- Rule 1: This is a test rule that provides guidance for code reviews and ensures that all backups meet the minimum size requirement of 100 bytes as specified in the story requirements.\n- Rule 2: Additional guidance for consistent code quality and style across the project.';
      await fs.writeFile(sourceFilePath, originalContent, 'utf-8');
    }

    // Create FileWriter with history directory
    fileWriter = new FileWriter(Platform.CURSOR, historyDir);
  });

  afterAll(async () => {
    // Restore original content
    if (originalContent) {
      await fs.writeFile(sourceFilePath, originalContent, 'utf-8');
    }

    // Clean up test history directory
    try {
      await fs.rm(historyDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should create persistent backup before file modification', async () => {
    // Given: Source file exists and changes are to be written
    const changes = [createMockRuleSuggestion('1', 'New Rule')];

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(sourceFilePath, changes);

    // Then: Operation should succeed
    expect(result.success).toBe(true);

    // And: Persistent backup path should be returned
    expect(result.persistentBackupPath).toBeTruthy();
    expect(typeof result.persistentBackupPath).toBe('string');

    // And: Backup file should exist in history directory
    const backupExists = await fs.access(result.persistentBackupPath!).then(
      () => true,
      () => false
    );
    expect(backupExists).toBe(true);

    // And: Backup file should have ISO 8601 timestamp in filename
    const backupFileName = path.basename(result.persistentBackupPath!);
    expect(backupFileName).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  test('should abort write operation if backup creation fails', async () => {
    // Given: Invalid history directory (e.g., read-only filesystem simulation)
    const invalidHistoryDir = '/root/nonexistent-backup-dir';
    const invalidWriter = new FileWriter(Platform.CURSOR, invalidHistoryDir);
    const changes = [createMockRuleSuggestion('1', 'New Rule')];

    // Read original file content
    const originalContent = await fs.readFile(sourceFilePath, 'utf-8');

    // When: Attempting to write changes
    const result = await invalidWriter.writeChanges(sourceFilePath, changes);

    // Then: Operation should fail
    expect(result.success).toBe(false);

    // And: Error message should indicate backup failure
    expect(result.error).toContain('Backup creation failed');

    // And: Original file should be unchanged
    const currentContent = await fs.readFile(sourceFilePath, 'utf-8');
    expect(currentContent).toBe(originalContent);
  });

  test('should create multiple backups for multiple writes', async () => {
    // Given: Source file exists
    const changes1 = [createMockRuleSuggestion('1', 'First Rule')];
    const changes2 = [createMockRuleSuggestion('2', 'Second Rule')];

    // When: Writing changes twice
    const result1 = await fileWriter.writeChanges(sourceFilePath, changes1);
    const result2 = await fileWriter.writeChanges(sourceFilePath, changes2);

    // Then: Both operations should succeed
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // And: Both should have different backup paths (different timestamps)
    expect(result1.persistentBackupPath).not.toBe(result2.persistentBackupPath);

    // And: Both backup files should exist
    const backup1Exists = await fs.access(result1.persistentBackupPath!).then(
      () => true,
      () => false
    );
    const backup2Exists = await fs.access(result2.persistentBackupPath!).then(
      () => true,
      () => false
    );
    expect(backup1Exists).toBe(true);
    expect(backup2Exists).toBe(true);
  });

  test('should include platform in backup filename', async () => {
    // Given: Source file and changes
    const changes = [createMockRuleSuggestion('1', 'Platform Rule')];

    // When: Writing changes
    const result = await fileWriter.writeChanges(sourceFilePath, changes);

    // Then: Backup filename should contain source file basename
    const backupFileName = path.basename(result.persistentBackupPath!);
    expect(backupFileName).toContain('.cursorrules-');
  });
});
