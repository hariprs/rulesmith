/**
 * File Writer Tests (Story 4.5)
 *
 * Tests for atomic file modification with backup and rollback
 */

import { FileWriter } from '../file-writer';
import { Platform } from '../../platform-detector';
import { RuleSuggestion } from '../../rules/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock fs module
jest.mock('fs/promises');
jest.mock('uuid');

const mockUuid = 'test-uuid-123';

describe('FileWriter', () => {
  let fileWriter: FileWriter;
  let mockChanges: RuleSuggestion[];
  const testFilePath = '/test/project/.cursorrules';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    jest.spyOn(require('uuid'), 'v4').mockReturnValue(mockUuid);

    fileWriter = new FileWriter(Platform.CURSOR);

    mockChanges = [
      {
        ruleText: 'Test rule 1',
        explanation: 'Test explanation 1',
        proposalType: 'coding_pattern' as const,
        file: '.cursorrules',
      },
      {
        ruleText: 'Test rule 2',
        explanation: 'Test explanation 2',
        proposalType: 'coding_pattern' as const,
        file: '.cursorrules',
      },
    ];

    // Mock process.cwd()
    Object.defineProperty(process, 'cwd', {
      value: jest.fn(() => '/test/project'),
    });
  });

  describe('writeChanges', () => {
    it('should write changes atomically', async () => {
      const mockContent = 'Existing content';
      (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      const result = await fileWriter.writeChanges(testFilePath, mockChanges);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe(testFilePath);
      expect(fs.copyFile).toHaveBeenCalledWith(
        testFilePath,
        `/tmp/backup-${mockUuid}-${path.basename(testFilePath)}`
      );
      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.rename).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalledWith(
        `/tmp/backup-${mockUuid}-${path.basename(testFilePath)}`
      );
    });

    it('should use edited_rule when present', async () => {
      const changesWithEdit = [
        {
          ...mockChanges[0],
          edited_rule: 'Edited rule text',
        },
      ];

      (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
      (fs.readFile as jest.Mock).mockResolvedValue('Existing content');
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await fileWriter.writeChanges(testFilePath, changesWithEdit);

      const writtenContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('Edited rule text');
      expect(writtenContent).not.toContain('Test rule 1');
    });

    it('should reject files exceeding size limit', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 2 * 1024 * 1024 }); // 2MB

      const result = await fileWriter.writeChanges(testFilePath, mockChanges);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds maximum size');
    });

    it('should return backup path on failure', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read error'));

      const result = await fileWriter.writeChanges(testFilePath, mockChanges);

      expect(result.success).toBe(false);
      expect(result.backupPath).toContain('backup-');
    });

    it('should format rules for Cursor platform', async () => {
      (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
      (fs.readFile as jest.Mock).mockResolvedValue('Existing content');
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await fileWriter.writeChanges(testFilePath, mockChanges);

      const writtenContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('# Test explanation 1');
      expect(writtenContent).toContain('Test rule 1');
    });

    it('should format rules for Copilot platform', async () => {
      const copilotWriter = new FileWriter(Platform.COPILOT);
      const copilotPath = '/test/project/.github/copilot-instructions.md';

      (fs.stat as jest.Mock).mockResolvedValue({ size: 100 });
      (fs.readFile as jest.Mock).mockResolvedValue('Existing content');
      (fs.copyFile as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
      (fs.rename as jest.Mock).mockResolvedValue(undefined);
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);

      await copilotWriter.writeChanges(copilotPath, mockChanges);

      const writtenContent = (fs.writeFile as jest.Mock).mock.calls[0][1];
      expect(writtenContent).toContain('## Test explanation 1');
      expect(writtenContent).toContain('- Test rule 1');
    });

    it('should sanitize file paths', async () => {
      const maliciousPath = '../../../etc/passwd';

      await expect(fileWriter.writeChanges(maliciousPath, mockChanges)).rejects.toThrow(
        'Path traversal detected'
      );
    });

    it('should only allow whitelisted file paths', async () => {
      const unallowedPath = '/test/project/random.txt';

      await expect(fileWriter.writeChanges(unallowedPath, mockChanges)).rejects.toThrow(
        'File path not in allowed list'
      );
    });
  });
});
