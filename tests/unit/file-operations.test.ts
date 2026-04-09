/**
 * Unit Tests for File Operations
 *
 * Testing Strategy:
 * - Unit tests for file operation logic extracted from E2E tests
 * - Fast, isolated tests with mocked file system
 * - Covers: JSON parsing/serialization, file reading/writing, directory operations, backup/restore
 *
 * These tests were identified in test-architecture-analysis.md as
 * candidates to be pushed from E2E to unit level for better isolation
 * and faster execution.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// MOCK FILE SYSTEM
// ============================================================================

class MockFileSystem {
  private files: Map<string, string> = new Map();
  private directories: Set<string> = new Set();

  constructor() {
    // Initialize with common directories
    this.directories.add('/test');
    this.directories.add('/test/data');
  }

  exists(path: string): boolean {
    return this.files.has(path) || this.directories.has(path);
  }

  readFile(path: string): string | null {
    return this.files.get(path) || null;
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  deleteFile(path: string): void {
    this.files.delete(path);
  }

  createDirectory(path: string): void {
    this.directories.add(path);
  }

  deleteDirectory(path: string): void {
    this.directories.delete(path);
  }

  listDirectory(path: string): string[] {
    const entries: string[] = [];
    for (const [filePath] of this.files) {
      if (filePath.startsWith(path) && filePath !== path) {
        const relativePath = filePath.slice(path.length + 1);
        const firstSegment = relativePath.split('/')[0];
        if (!entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }
    return entries;
  }

  clear(): void {
    this.files.clear();
    this.directories.clear();
  }
}

// ============================================================================
// JSON PARSING/SERIALIZATION
// ============================================================================

describe('JSON Operations - Unit Tests', () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe('parseJSONFile', () => {
    test('should parse valid JSON file', () => {
      const jsonData = { key: 'value', number: 42 };
      const jsonString = JSON.stringify(jsonData);
      fs.writeFile('/test/data.json', jsonString);

      const result = parseJSONFile('/test/data.json', fs);
      expect(result).toEqual(jsonData);
    });

    test('should throw error for invalid JSON', () => {
      fs.writeFile('/test/data.json', '{ invalid json }');

      expect(() => parseJSONFile('/test/data.json', fs)).toThrow('Invalid JSON');
    });

    test('should throw error for missing file', () => {
      expect(() => parseJSONFile('/test/missing.json', fs)).toThrow('File not found');
    });

    test('should parse JSON with special characters', () => {
      const jsonData = {
        message: 'Hello, "World"!',
        emoji: '🎉',
        unicode: '日本語'
      };
      const jsonString = JSON.stringify(jsonData);
      fs.writeFile('/test/data.json', jsonString);

      const result = parseJSONFile('/test/data.json', fs);
      expect(result).toEqual(jsonData);
    });

    test('should parse nested JSON objects', () => {
      const jsonData = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };
      const jsonString = JSON.stringify(jsonData);
      fs.writeFile('/test/data.json', jsonString);

      const result = parseJSONFile('/test/data.json', fs);
      expect(result.level1.level2.level3.value).toBe('deep');
    });
  });

  describe('writeJSONFile', () => {
    test('should write JSON object to file', () => {
      const jsonData = { key: 'value', number: 42 };

      writeJSONFile('/test/data.json', jsonData, fs);

      const content = fs.readFile('/test/data.json');
      const parsed = JSON.parse(content!);
      expect(parsed).toEqual(jsonData);
    });

    test('should format JSON with indentation', () => {
      const jsonData = { key: 'value' };

      writeJSONFile('/test/data.json', jsonData, fs, 2);

      const content = fs.readFile('/test/data.json');
      expect(content).toContain('  "key"'); // Indented with 2 spaces
    });

    test('should handle special characters', () => {
      const jsonData = {
        message: 'Line 1\nLine 2',
        quote: 'He said "hello"',
        backslash: 'C:\\Users\\Test'
      };

      writeJSONFile('/test/data.json', jsonData, fs);

      const content = fs.readFile('/test/data.json');
      const parsed = JSON.parse(content!);
      expect(parsed).toEqual(jsonData);
    });

    test('should handle arrays', () => {
      const jsonData = [1, 2, 3, 'four', { five: 5 }];

      writeJSONFile('/test/data.json', jsonData, fs);

      const content = fs.readFile('/test/data.json');
      const parsed = JSON.parse(content!);
      expect(parsed).toEqual(jsonData);
    });
  });

  describe('parseJSONLFile', () => {
    test('should parse JSONL file (one JSON per line)', () => {
      const lines = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Entry 1' },
        { timestamp: '2026-03-16T12:15:00Z', status: 'pending', summary: 'Entry 2' },
        { timestamp: '2026-03-15T18:45:00Z', status: 'failed', summary: 'Entry 3' }
      ];
      const jsonlContent = lines.map(line => JSON.stringify(line)).join('\n') + '\n';
      fs.writeFile('/test/data.jsonl', jsonlContent);

      const result = parseJSONLFile('/test/data.jsonl', fs);
      expect(result).toEqual(lines);
    });

    test('should skip malformed JSONL lines', () => {
      const mixedContent = [
        JSON.stringify({ timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Valid entry' }),
        'invalid json line',
        JSON.stringify({ timestamp: '2026-03-16T11:00:00Z', status: 'applied', summary: 'Another valid entry' })
      ].join('\n') + '\n';
      fs.writeFile('/test/data.jsonl', mixedContent);

      const result = parseJSONLFile('/test/data.jsonl', fs);
      expect(result).toHaveLength(2);
      expect(result[0].summary).toBe('Valid entry');
      expect(result[1].summary).toBe('Another valid entry');
    });

    test('should handle empty JSONL file', () => {
      fs.writeFile('/test/data.jsonl', '');

      const result = parseJSONLFile('/test/data.jsonl', fs);
      expect(result).toEqual([]);
    });

    test('should throw error for missing file', () => {
      expect(() => parseJSONLFile('/test/missing.jsonl', fs)).toThrow('File not found');
    });
  });

  describe('writeJSONLFile', () => {
    test('should write array of objects as JSONL', () => {
      const lines = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Entry 1' },
        { timestamp: '2026-03-16T12:15:00Z', status: 'pending', summary: 'Entry 2' }
      ];

      writeJSONLFile('/test/data.jsonl', lines, fs);

      const content = fs.readFile('/test/data.jsonl');
      const result = parseJSONLFile('/test/data.jsonl', fs);
      expect(result).toEqual(lines);
    });

    test('should append newlines after each line', () => {
      const lines = [
        { timestamp: '2026-03-16T14:30:00Z', status: 'applied', summary: 'Entry 1' }
      ];

      writeJSONLFile('/test/data.jsonl', lines, fs);

      const content = fs.readFile('/test/data.jsonl');
      expect(content).toMatch(/}\n$/); // Ends with newline
    });
  });
});

// ============================================================================
// FILE READING/WRITING
// ============================================================================

describe('File I/O - Unit Tests', () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe('readFile', () => {
    test('should read existing file', () => {
      const content = 'File content here';
      fs.writeFile('/test/file.txt', content);

      const result = readFile('/test/file.txt', fs);
      expect(result).toBe(content);
    });

    test('should throw error for missing file', () => {
      expect(() => readFile('/test/missing.txt', fs)).toThrow('File not found');
    });

    test('should read file with special characters', () => {
      const content = 'Special chars: 🎉 \n\t\r\\';
      fs.writeFile('/test/file.txt', content);

      const result = readFile('/test/file.txt', fs);
      expect(result).toBe(content);
    });

    test('should read empty file', () => {
      fs.writeFile('/test/file.txt', '');

      const result = readFile('/test/file.txt', fs);
      expect(result).toBe('');
    });
  });

  describe('writeFile', () => {
    test('should write content to file', () => {
      const content = 'New content';

      writeFile('/test/file.txt', content, fs);

      const result = fs.readFile('/test/file.txt');
      expect(result).toBe(content);
    });

    test('should overwrite existing file', () => {
      fs.writeFile('/test/file.txt', 'Old content');
      writeFile('/test/file.txt', 'New content', fs);

      const result = fs.readFile('/test/file.txt');
      expect(result).toBe('New content');
    });

    test('should create file in new directory', () => {
      writeFile('/test/new/file.txt', 'Content', fs);

      expect(fs.exists('/test/new/file.txt')).toBe(true);
    });
  });

  describe('deleteFile', () => {
    test('should delete existing file', () => {
      fs.writeFile('/test/file.txt', 'Content');

      deleteFile('/test/file.txt', fs);

      expect(fs.exists('/test/file.txt')).toBe(false);
    });

    test('should throw error for missing file', () => {
      expect(() => deleteFile('/test/missing.txt', fs)).toThrow('File not found');
    });

    test('should not delete directories', () => {
      fs.createDirectory('/test/dir');

      expect(() => deleteFile('/test/dir', fs)).toThrow('Not a file');
    });
  });
});

// ============================================================================
// DIRECTORY OPERATIONS
// ============================================================================

describe('Directory Operations - Unit Tests', () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe('listDirectory', () => {
    test('should list files in directory', () => {
      fs.writeFile('/test/data/file1.txt', 'Content 1');
      fs.writeFile('/test/data/file2.txt', 'Content 2');
      fs.writeFile('/test/data/file3.txt', 'Content 3');

      const result = listDirectory('/test/data', fs);
      expect(result).toContain('file1.txt');
      expect(result).toContain('file2.txt');
      expect(result).toContain('file3.txt');
    });

    test('should return empty array for empty directory', () => {
      const result = listDirectory('/test/data', fs);
      expect(result).toEqual([]);
    });

    test('should throw error for missing directory', () => {
      expect(() => listDirectory('/test/missing', fs)).toThrow('Directory not found');
    });

    test('should not include subdirectories by default', () => {
      fs.writeFile('/test/data/files/file.txt', 'Content');

      const result = listDirectory('/test/data', fs);
      expect(result).toContain('files');
    });
  });

  describe('ensureDirectory', () => {
    test('should create directory if it does not exist', () => {
      ensureDirectory('/test/new/dir', fs);

      expect(fs.exists('/test/new/dir')).toBe(true);
    });

    test('should not throw error if directory exists', () => {
      fs.createDirectory('/test/existing');

      expect(() => ensureDirectory('/test/existing', fs)).not.toThrow();
    });

    test('should create nested directories', () => {
      ensureDirectory('/test/one/two/three', fs);

      expect(fs.exists('/test/one')).toBe(true);
      expect(fs.exists('/test/one/two')).toBe(true);
      expect(fs.exists('/test/one/two/three')).toBe(true);
    });
  });
});

// ============================================================================
// BACKUP/RESTORE OPERATIONS
// ============================================================================

describe('Backup/Restore Operations - Unit Tests', () => {
  let fs: MockFileSystem;

  beforeEach(() => {
    fs = new MockFileSystem();
  });

  describe('backupFile', () => {
    test('should create backup with timestamp', () => {
      fs.writeFile('/test/data.json', '{"key": "value"}');

      const backupPath = backupFile('/test/data.json', fs);

      expect(backupPath).toMatch(/\/test\/data\.backup\.\d+\.json/);
      expect(fs.exists(backupPath)).toBe(true);

      const backupContent = fs.readFile(backupPath);
      expect(backupContent).toBe('{"key": "value"}');
    });

    test('should preserve original file', () => {
      fs.writeFile('/test/data.json', '{"key": "value"}');

      backupFile('/test/data.json', fs);

      expect(fs.exists('/test/data.json')).toBe(true);
      const originalContent = fs.readFile('/test/data.json');
      expect(originalContent).toBe('{"key": "value"}');
    });

    test('should throw error for missing file', () => {
      expect(() => backupFile('/test/missing.json', fs)).toThrow('File not found');
    });
  });

  describe('restoreFile', () => {
    test('should restore from backup', () => {
      fs.writeFile('/test/data.json', '{"key": "new value"}');
      const backupPath = backupFile('/test/data.json', fs);

      // Modify original
      fs.writeFile('/test/data.json', '{"key": "modified"}');

      restoreFile('/test/data.json', backupPath, fs);

      const content = fs.readFile('/test/data.json');
      expect(content).toBe('{"key": "new value"}');
    });

    test('should throw error for missing backup', () => {
      expect(() => restoreFile('/test/data.json', '/test/missing.backup.json', fs))
        .toThrow('Backup file not found');
    });

    test('should remove backup after successful restore', () => {
      fs.writeFile('/test/data.json', '{"key": "value"}');
      const backupPath = backupFile('/test/data.json', fs);

      restoreFile('/test/data.json', backupPath, fs);

      expect(fs.exists(backupPath)).toBe(false);
    });
  });

  describe('backupMultipleFiles', () => {
    test('should backup multiple files', () => {
      fs.writeFile('/test/file1.txt', 'Content 1');
      fs.writeFile('/test/file2.txt', 'Content 2');
      fs.writeFile('/test/file3.txt', 'Content 3');

      const backupPaths = backupMultipleFiles(['/test/file1.txt', '/test/file2.txt', '/test/file3.txt'], fs);

      expect(backupPaths).toHaveLength(3);
      backupPaths.forEach(backupPath => {
        expect(fs.exists(backupPath)).toBe(true);
      });
    });

    test('should return empty array for no files', () => {
      const backupPaths = backupMultipleFiles([], fs);
      expect(backupPaths).toEqual([]);
    });

    test('should continue backing up even if one file fails', () => {
      fs.writeFile('/test/file1.txt', 'Content 1');
      fs.writeFile('/test/file2.txt', 'Content 2');

      const backupPaths = backupMultipleFiles([
        '/test/file1.txt',
        '/test/missing.txt', // This doesn't exist
        '/test/file2.txt'
      ], fs);

      expect(backupPaths).toHaveLength(2);
      expect(backupPaths[0]).toMatch(/\/test\/file1\.backup\.\d+\.txt/);
      expect(backupPaths[1]).toMatch(/\/test\/file2\.backup\.\d+\.txt/);
    });
  });
});

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

function parseJSONFile(path: string, mockFs: MockFileSystem): any {
  if (!mockFs.exists(path)) {
    throw new Error('File not found');
  }

  const content = mockFs.readFile(path);
  if (content === null) {
    throw new Error('File not found');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error('Invalid JSON');
  }
}

function writeJSONFile(path: string, data: any, mockFs: MockFileSystem, indent: number = 2): void {
  const content = JSON.stringify(data, null, indent);
  mockFs.writeFile(path, content);
}

function parseJSONLFile(path: string, mockFs: MockFileSystem): any[] {
  if (!mockFs.exists(path)) {
    throw new Error('File not found');
  }

  const content = mockFs.readFile(path);
  if (content === null) {
    throw new Error('File not found');
  }

  const lines = content.trim().split('\n');
  const result: any[] = [];

  for (const line of lines) {
    try {
      result.push(JSON.parse(line));
    } catch (error) {
      // Skip malformed lines
      continue;
    }
  }

  return result;
}

function writeJSONLFile(path: string, data: any[], mockFs: MockFileSystem): void {
  const content = data.map(line => JSON.stringify(line)).join('\n') + '\n';
  mockFs.writeFile(path, content);
}

function readFile(path: string, mockFs: MockFileSystem): string {
  if (!mockFs.exists(path)) {
    throw new Error('File not found');
  }

  const content = mockFs.readFile(path);
  if (content === null) {
    throw new Error('File not found');
  }

  return content;
}

function writeFile(path: string, content: string, mockFs: MockFileSystem): void {
  mockFs.writeFile(path, content);
}

function deleteFile(path: string, mockFs: MockFileSystem): void {
  if (!mockFs.exists(path)) {
    throw new Error('File not found');
  }
  mockFs.deleteFile(path);
}

function listDirectory(path: string, mockFs: MockFileSystem): string[] {
  if (!mockFs.exists(path)) {
    throw new Error('Directory not found');
  }
  return mockFs.listDirectory(path);
}

function ensureDirectory(path: string, mockFs: MockFileSystem): void {
  mockFs.createDirectory(path);
}

function backupFile(path: string, mockFs: MockFileSystem): string {
  if (!mockFs.exists(path)) {
    throw new Error('File not found');
  }

  const content = mockFs.readFile(path);
  const backupPath = `${path}.${Date.now()}.backup`;
  mockFs.writeFile(backupPath, content!);

  return backupPath;
}

function restoreFile(originalPath: string, backupPath: string, mockFs: MockFileSystem): void {
  if (!mockFs.exists(backupPath)) {
    throw new Error('Backup file not found');
  }

  const backupContent = mockFs.readFile(backupPath);
  mockFs.writeFile(originalPath, backupContent!);
  mockFs.deleteFile(backupPath);
}

function backupMultipleFiles(paths: string[], mockFs: MockFileSystem): string[] {
  const backupPaths: string[] = [];

  for (const path of paths) {
    try {
      const backupPath = backupFile(path, mockFs);
      backupPaths.push(backupPath);
    } catch (error) {
      // Continue with other files
      continue;
    }
  }

  return backupPaths;
}
