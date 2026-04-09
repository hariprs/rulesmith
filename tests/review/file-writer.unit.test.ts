/**
 * File Writer Unit Tests (Story 4.5)
 *
 * Unit tests for FileWriter atomic file modification logic
 * Testing in isolation with mocked file system operations
 *
 * Test Pyramid Level: Unit Tests
 * Coverage: AC6, AC7 (atomic modification, rollback)
 *
 * @module review/file-writer
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { FileWriter } from '../../src/review/file-writer';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// MOCKS
// ============================================================================

jest.mock('fs/promises');
jest.mock('path');

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
  editedRule?: string
): RuleSuggestion {
  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: createMockPattern(),
    ruleText,
    editedRule,
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
// UNIT TESTS - AC6: Atomic File Modification
// ============================================================================

describe('FileWriter - AC6: Atomic File Modification', () => {
  let fileWriter: FileWriter;
  let mockCopyFile: jest.MockedFunction<typeof fs.copyFile>;
  let mockReadFile: jest.MockedFunction<typeof fs.readFile>;
  let mockWriteFile: jest.MockedFunction<typeof fs.writeFile>;
  let mockRename: jest.MockedFunction<typeof fs.rename>;
  let mockUnlink: jest.MockedFunction<typeof fs.unlink>;
  let mockStat: jest.MockedFunction<typeof fs.stat>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocked functions
    mockCopyFile = fs.copyFile as jest.MockedFunction<typeof fs.copyFile>;
    mockReadFile = fs.readFile as jest.MockedFunction<typeof fs.readFile>;
    mockWriteFile = fs.writeFile as jest.MockedFunction<typeof fs.writeFile>;
    mockRename = fs.rename as jest.MockedFunction<typeof fs.rename>;
    mockUnlink = fs.unlink as jest.MockedFunction<typeof fs.unlink>;
    mockStat = fs.stat as jest.MockedFunction<typeof fs.stat>;

    // Mock path resolution
    (path.resolve as jest.Mock).mockReturnValue('/test/project/.cursorrules');
    (path.join as jest.Mock).mockReturnValue('/test/project/.cursorrules');
    (path.basename as jest.Mock).mockReturnValue('.cursorrules');

    // Create FileWriter instance
    fileWriter = new FileWriter('cursor' as any);
  });

  test('should create backup before modifying file', async () => {
    // Given: File exists and changes are to be written
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockCopyFile.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    await fileWriter.writeChanges(filePath, changes);

    // Then: Backup is created before any modification
    expect(mockCopyFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining('/tmp/backup-')
    );
    expect(mockCopyFile).toHaveBeenCalled();
  });

  test('should write to temp file before atomic rename', async () => {
    // Given: File exists and changes are to be written
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    await fileWriter.writeChanges(filePath, changes);

    // Then: Content is written to temp file first
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/temp-'),
      expect.stringContaining('Original content')
    );

    // And: Temp file is renamed atomically to target
    expect(mockRename).toHaveBeenCalledWith(
      expect.stringContaining('/tmp/temp-'),
      filePath
    );
  });

  test('should return success result on successful atomic write', async () => {
    // Given: File exists and changes are to be written
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(filePath, changes);

    // Then: Success result is returned
    expect(result.success).toBe(true);
    expect(result.filePath).toBe(filePath);
    expect(result.error).toBeUndefined();
  });

  test('should rollback on file write failure', async () => {
    // Given: File exists but write fails
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockRejectedValue(new Error('Write failed'));
    mockRename.mockResolvedValue();

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(filePath, changes);

    // Then: Operation fails and backup path is returned for rollback
    expect(result.success).toBe(false);
    expect(result.error).toContain('Write failed');
    expect(result.backupPath).toBeDefined();

    // And: Original file is not modified
    expect(mockRename).not.toHaveBeenCalled();
  });

  test('should reject files exceeding size limit', async () => {
    // Given: File exceeds 1MB limit
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({
      size: 2 * 1024 * 1024, // 2MB
    } as any);

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(filePath, changes);

    // Then: Operation is rejected
    expect(result.success).toBe(false);
    expect(result.error).toContain('exceeds maximum size');
  });

  test('should use edited_rule when present (Story 4.3 integration)', async () => {
    // Given: Change has edited_rule field
    const changes = [
      createMockRuleSuggestion('1', 'Original rule', 'Edited rule'),
    ];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    await fileWriter.writeChanges(filePath, changes);

    // Then: Edited version is written, not original
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Edited rule')
    );
    expect(mockWriteFile).not.toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Original rule')
    );
  });

  test('should format rules for Cursor platform', async () => {
    // Given: FileWriter configured for Cursor platform
    const changes = [createMockRuleSuggestion('1', 'Cursor rule')];
    const filePath = '/test/project/.cursorrules';

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    await fileWriter.writeChanges(filePath, changes);

    // Then: Cursor format is used (# comments)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('# Test explanation')
    );
  });

  test('should format rules for Copilot platform', async () => {
    // Given: FileWriter configured for Copilot platform
    const copilotWriter = new FileWriter('copilot' as any);
    const changes = [createMockRuleSuggestion('1', 'Copilot rule')];
    const filePath = '/test/project/.github/copilot-instructions.md';

    (path.join as jest.Mock).mockReturnValue(filePath);

    mockStat.mockResolvedValue({ size: 100 } as any);
    mockReadFile.mockResolvedValue('Original content\n');
    mockCopyFile.mockResolvedValue();
    mockWriteFile.mockResolvedValue();
    mockRename.mockResolvedValue();
    mockUnlink.mockResolvedValue();

    // When: Writing changes to file
    await copilotWriter.writeChanges(filePath, changes);

    // Then: Copilot format is used (## headings)
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('## Test explanation')
    );
  });
});

// ============================================================================
// UNIT TESTS - Path Validation and Security
// ============================================================================

describe('FileWriter - Path Validation and Security', () => {
  let fileWriter: FileWriter;

  beforeEach(() => {
    fileWriter = new FileWriter('cursor' as any);
    (path.resolve as jest.Mock).mockImplementation((p: string) => p);
  });

  test('should reject paths with traversal attempts', async () => {
    // Given: Path with traversal attempt
    const changes = [createMockRuleSuggestion('1', 'Rule')];
    const maliciousPath = '/test/project/../../etc/passwd';

    (path.resolve as jest.Mock).mockReturnValue(maliciousPath);

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(maliciousPath, changes);

    // Then: Operation is rejected
    expect(result.success).toBe(false);
    expect(result.error).toContain('Path traversal');
  });

  test('should only allow allowed file paths', async () => {
    // Given: Path not in allowed list
    const changes = [createMockRuleSuggestion('1', 'Rule')];
    const disallowedPath = '/test/project/random-file.txt';

    (path.resolve as jest.Mock).mockReturnValue(disallowedPath);

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(disallowedPath, changes);

    // Then: Operation is rejected
    expect(result.success).toBe(false);
    expect(result.error).toContain('not in allowed list');
  });

  test('should allow .cursorrules path', async () => {
    // Given: Valid .cursorrules path
    const changes = [createMockRuleSuggestion('1', 'Rule')];
    const validPath = '/test/project/.cursorrules';

    (path.resolve as jest.Mock).mockReturnValue(validPath);
    (path.join as jest.Mock).mockReturnValue(validPath);

    const mockStat = jest.fn().mockResolvedValue({ size: 100 });
    const mockReadFile = jest.fn().mockResolvedValue('Content\n');
    const mockCopyFile = jest.fn().mockResolvedValue();
    const mockWriteFile = jest.fn().mockResolvedValue();
    const mockRename = jest.fn().mockResolvedValue();
    const mockUnlink = jest.fn().mockResolvedValue();

    (fs.stat as jest.Mock) = mockStat;
    (fs.readFile as jest.Mock) = mockReadFile;
    (fs.copyFile as jest.Mock) = mockCopyFile;
    (fs.writeFile as jest.Mock) = mockWriteFile;
    (fs.rename as jest.Mock) = mockRename;
    (fs.unlink as jest.Mock) = mockUnlink;

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(validPath, changes);

    // Then: Operation proceeds
    expect(mockCopyFile).toHaveBeenCalled();
  });
});

// ============================================================================
// UNIT TESTS - Rollback Logic
// ============================================================================

describe('FileWriter - Rollback Logic', () => {
  test('should preserve original file on write failure', async () => {
    // This test verifies the rollback mechanism works correctly
    // Given: File write fails after backup creation
    const fileWriter = new FileWriter('cursor' as any);
    const changes = [createMockRuleSuggestion('1', 'New rule')];
    const filePath = '/test/project/.cursorrules';
    const originalContent = 'Original content\n';

    const mockStat = jest.fn().mockResolvedValue({ size: 100 });
    const mockReadFile = jest.fn().mockResolvedValue(originalContent);
    const mockCopyFile = jest.fn().mockResolvedValue();
    const mockWriteFile = jest.fn().mockRejectedValue(new Error('Write failed'));

    (fs.stat as jest.Mock) = mockStat;
    (fs.readFile as jest.Mock) = mockReadFile;
    (fs.copyFile as jest.Mock) = mockCopyFile;
    (fs.writeFile as jest.Mock) = mockWriteFile;

    (path.resolve as jest.Mock).mockReturnValue(filePath);
    (path.join as jest.Mock).mockReturnValue(filePath);
    (path.basename as jest.Mock).mockReturnValue('.cursorrules');

    // When: Writing changes to file
    const result = await fileWriter.writeChanges(filePath, changes);

    // Then: Backup path is returned for manual rollback
    expect(result.success).toBe(false);
    expect(result.backupPath).toBeDefined();

    // And: Original file content is preserved (not modified)
    // In real scenario, ConsentManager would use backupPath to rollback
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockCopyFile).toHaveBeenCalledWith(
      filePath,
      expect.stringContaining('/tmp/backup-')
    );
  });
});
