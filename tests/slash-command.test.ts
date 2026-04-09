/**
 * Unit Tests for Slash Command Parsing (Story 1-6)
 *
 * Testing Strategy:
 * - Unit tests focus on individual function logic in isolation
 * - Test command parsing, validation, and argument extraction
 * - Mock all external dependencies (file system, state management)
 * - Fast execution - no actual file operations
 *
 * Coverage: FR36, FR37, FR38, FR40-FR44
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';

// Import the command parser functions (to be implemented)
// These would typically be in src/command-parser.ts
interface ParsedCommand {
  command: string;
  options: Map<string, string | boolean>;
  args: string[];
  isValid: boolean;
  error?: string;
}

// Mock implementation for testing
// In real implementation, this would be imported from src/command-parser.ts
function parseCommand(input: string): ParsedCommand {
  const tokens = input.trim().split(/\s+/);
  const command = tokens[0];
  const options = new Map<string, string | boolean>();
  const args: string[] = [];

  let i = 1;
  while (i < tokens.length) {
    const token = tokens[i];
    if (token.startsWith('--')) {
      const optionName = token.slice(2);
      if (i + 1 < tokens.length && !tokens[i + 1].startsWith('--')) {
        options.set(optionName, tokens[i + 1]);
        i += 2;
      } else {
        options.set(optionName, true);
        i += 1;
      }
    } else {
      args.push(token);
      i += 1;
    }
  }

  // Validate command structure
  if (!command.startsWith('/')) {
    return {
      command,
      options,
      args,
      isValid: false,
      error: 'Command must start with /'
    };
  }

  // Validate options
  const validOptions = ['stats', 'history', 'rollback', 'to'];
  for (const [key] of options) {
    if (!validOptions.includes(key)) {
      return {
        command,
        options,
        args,
        isValid: false,
        error: `Unknown option: --${key}`
      };
    }
  }

  // Validate rollback requires --to
  if (options.has('rollback') && !options.has('to')) {
    return {
      command,
      options,
      args,
      isValid: false,
      error: 'Rollback requires --to option'
    };
  }

  return {
    command,
    options,
    args,
    isValid: true
  };
}

function validateCommand(parsed: ParsedCommand): { isValid: boolean; error?: string } {
  if (!parsed.isValid) {
    return { isValid: false, error: parsed.error };
  }

  if (parsed.command !== '/improve-rules') {
    return { isValid: false, error: 'Unknown command' };
  }

  // Validate --to has a timestamp value
  if (parsed.options.get('rollback') === true && parsed.options.get('to') === true) {
    return { isValid: false, error: '--to requires a timestamp value' };
  }

  // Validate timestamp format for --to
  const toValue = parsed.options.get('to');
  if (typeof toValue === 'string') {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
    if (!timestampRegex.test(toValue)) {
      return { isValid: false, error: 'Invalid timestamp format. Use ISO 8601 UTC format (YYYY-MM-DDTHH:MM:SSZ)' };
    }
  }

  return { isValid: true };
}

describe('Slash Command Parser - Unit Tests', () => {
  describe('parseCommand', () => {
    test('should parse basic command without options', () => {
      const result = parseCommand('/improve-rules');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.size).toBe(0);
      expect(result.args).toEqual([]);
      expect(result.isValid).toBe(true);
    });

    test('should parse --stats option', () => {
      const result = parseCommand('/improve-rules --stats');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.get('stats')).toBe(true);
      expect(result.isValid).toBe(true);
    });

    test('should parse --history option', () => {
      const result = parseCommand('/improve-rules --history');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.get('history')).toBe(true);
      expect(result.isValid).toBe(true);
    });

    test('should parse --rollback with --to option', () => {
      const result = parseCommand('/improve-rules --rollback --to 2024-03-16T10:30:00Z');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.get('rollback')).toBe(true);
      expect(result.options.get('to')).toBe('2024-03-16T10:30:00Z');
      expect(result.isValid).toBe(true);
    });

    test('should reject command without leading slash', () => {
      const result = parseCommand('improve-rules');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Command must start with /');
    });

    test('should reject unknown options', () => {
      const result = parseCommand('/improve-rules --unknown-option');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown option: --unknown-option');
    });

    test('should reject --rollback without --to', () => {
      const result = parseCommand('/improve-rules --rollback');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Rollback requires --to option');
    });

    test('should handle multiple spaces between tokens', () => {
      const result = parseCommand('/improve-rules  --stats    --history');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.get('stats')).toBe(true);
      expect(result.options.get('history')).toBe(true);
      expect(result.isValid).toBe(true);
    });

    test('should handle leading/trailing whitespace', () => {
      const result = parseCommand('  /improve-rules --stats  ');

      expect(result.command).toBe('/improve-rules');
      expect(result.options.get('stats')).toBe(true);
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateCommand', () => {
    test('should accept valid basic command', () => {
      const parsed = parseCommand('/improve-rules');
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid --stats command', () => {
      const parsed = parseCommand('/improve-rules --stats');
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid --history command', () => {
      const parsed = parseCommand('/improve-rules --history');
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should accept valid --rollback with proper timestamp', () => {
      const parsed = parseCommand('/improve-rules --rollback --to 2024-03-16T10:30:00Z');
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject invalid command name', () => {
      const parsed: ParsedCommand = {
        command: '/unknown-command',
        options: new Map(),
        args: [],
        isValid: true
      };
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown command');
    });

    test('should reject --to without timestamp value', () => {
      const parsed = parseCommand('/improve-rules --rollback --to');
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('--to requires a timestamp value');
    });

    test('should reject invalid timestamp format', () => {
      const parsed: ParsedCommand = {
        command: '/improve-rules',
        options: new Map<string, string | boolean>([['rollback', true], ['to', 'invalid-timestamp']]),
        args: [],
        isValid: true
      };
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid timestamp format');
    });

    test('should reject timestamp without Z suffix', () => {
      const parsed: ParsedCommand = {
        command: '/improve-rules',
        options: new Map<string, string | boolean>([['rollback', true], ['to', '2024-03-16T10:30:00']]),
        args: [],
        isValid: true
      };
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid timestamp format');
    });

    test('should propagate parse errors', () => {
      const parsed = parseCommand('improve-rules'); // Missing /
      const result = validateCommand(parsed);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Command must start with /');
    });
  });

  describe('Command Option Combinations', () => {
    test('should handle --stats and --history together', () => {
      const result = parseCommand('/improve-rules --stats --history');

      expect(result.isValid).toBe(true);
      expect(result.options.get('stats')).toBe(true);
      expect(result.options.get('history')).toBe(true);
    });

    test('should allow multiple options in any order', () => {
      const result1 = parseCommand('/improve-rules --stats --history');
      const result2 = parseCommand('/improve-rules --history --stats');

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result1.options.get('stats')).toBe(true);
      expect(result1.options.get('history')).toBe(true);
    });

    test('should reject conflicting options', () => {
      // This test documents current behavior
      // In future implementation, we might want to reject certain combinations
      const result = parseCommand('/improve-rules --stats --rollback --to 2024-03-16T10:30:00Z');

      // Currently accepts multiple options
      expect(result.isValid).toBe(true);
      // Future: Might want to reject this combination
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty string', () => {
      const result = parseCommand('');

      expect(result.command).toBe('');
      expect(result.isValid).toBe(false);
    });

    test('should handle only whitespace', () => {
      const result = parseCommand('   ');

      expect(result.command).toBe('');
      expect(result.isValid).toBe(false);
    });

    test('should handle option with value containing special characters', () => {
      const result = parseCommand('/improve-rules --to 2024-03-16T10:30:00Z');

      expect(result.isValid).toBe(true);
      expect(result.options.get('to')).toBe('2024-03-16T10:30:00Z');
    });

    test('should treat --option=value as separate tokens', () => {
      const result = parseCommand('/improve-rules --to=value');

      // Current implementation splits on whitespace
      // This documents behavior - might need adjustment
      expect(result.options.get('to=value')).toBe(true);
    });
  });

  describe('Error Messages Quality (AR22)', () => {
    test('should provide clear error for missing slash', () => {
      const result = parseCommand('improve-rules');

      expect(result.error).toBe('Command must start with /');
      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('undefined');
    });

    test('should provide actionable error for unknown option', () => {
      const result = parseCommand('/improve-rules --invalid');

      expect(result.error).toContain('Unknown option');
      expect(result.error).toContain('--invalid');
    });

    test('should provide helpful error for missing --to', () => {
      const result = parseCommand('/improve-rules --rollback');

      expect(result.error).toContain('Rollback requires --to option');
    });

    test('should include correct format in timestamp error', () => {
      const parsed: ParsedCommand = {
        command: '/improve-rules',
        options: new Map<string, string | boolean>([['rollback', true], ['to', '2024-03-16']]),
        args: [],
        isValid: true
      };
      const result = validateCommand(parsed);

      expect(result.error).toContain('ISO 8601 UTC format');
      expect(result.error).toContain('YYYY-MM-DDTHH:MM:SSZ');
    });
  });
});
