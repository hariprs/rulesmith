/**
 * Unit Tests for Command Validators
 *
 * Testing Strategy:
 * - Unit tests for validation logic extracted from E2E tests
 * - Fast, isolated tests with no external dependencies
 * - Covers: timestamp validation, parameter validation, flag combinations, schema validation
 *
 * These tests were identified in test-architecture-analysis.md as
 * candidates to be pushed from E2E to unit level for better isolation
 * and faster execution.
 */

import { describe, test, expect } from '@jest/globals';

// ============================================================================
// TIMESTAMP VALIDATION
// ============================================================================

describe('Timestamp Validation - Unit Tests', () => {
  describe('validateTimestampFormat', () => {
    test('should accept valid ISO 8601 UTC timestamps', () => {
      const validTimestamps = [
        '2026-03-16T14:30:00Z',
        '2026-12-31T23:59:59Z',
        '2026-01-01T00:00:00Z',
        '2024-02-29T12:00:00Z' // Leap year
      ];

      validTimestamps.forEach(timestamp => {
        const result = validateTimestampFormat(timestamp);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    test('should reject invalid timestamp formats', () => {
      const invalidTimestamps = [
        '2026-03-16 14:30:00', // Missing T and Z
        '2026-03-16T14:30:00', // Missing Z
        '2026-03-16', // Date only
        '14:30:00', // Time only
        '2026/03/16T14:30:00Z', // Wrong separator
        'invalid-timestamp', // Invalid format
        '', // Empty string
        '2026-13-01T00:00:00Z', // Invalid month
        '2026-03-32T00:00:00Z', // Invalid day
        '2026-03-16T25:00:00Z' // Invalid hour
      ];

      invalidTimestamps.forEach(timestamp => {
        const result = validateTimestampFormat(timestamp);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid timestamp format');
        expect(result.error).toContain('YYYY-MM-DDTHH:MM:SSZ');
      });
    });
  });

  describe('validateTimestampRange', () => {
    test('should reject future timestamps', () => {
      const futureTimestamp = '2099-01-01T00:00:00Z';
      const result = validateTimestampRange(futureTimestamp, '2026-03-17T00:00:00Z');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('future');
      expect(result.error).toContain('later than current time');
    });

    test('should warn for timestamps older than 6 months', () => {
      const oldTimestamp = '2025-08-17T00:00:00Z'; // ~7 months before 2026-03-17

      const result = validateTimestampRange(oldTimestamp, '2026-03-17T00:00:00Z');

      expect(result.valid).toBe(true); // Still valid
      expect(result.warning).toContain('older than 6 months');
    });

    test('should reject timestamps older than 1 year', () => {
      const veryOldTimestamp = '2024-03-16T00:00:00Z'; // ~1 year before 2026-03-17

      const result = validateTimestampRange(veryOldTimestamp, '2026-03-17T00:00:00Z');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('older than 1 year');
    });

    test('should accept recent timestamps', () => {
      const recentTimestamp = '2026-03-16T14:30:00Z';

      const result = validateTimestampRange(recentTimestamp, '2026-03-17T00:00:00Z');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.warning).toBeUndefined();
    });
  });

  describe('validateTimestampCharacters', () => {
    test('should reject path traversal attempts', () => {
      const maliciousTimestamps = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '2026-03-16T14:30:00Z/../../../etc',
        '2026-03-16T14:30:00Z\\..\\..\\windows'
      ];

      maliciousTimestamps.forEach(timestamp => {
        const result = validateTimestampCharacters(timestamp);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('path traversal');
      });
    });

    test('should reject null bytes', () => {
      const nullByteTimestamps = [
        '2026-03-16\x00T14:30:00Z',
        '2026-03-16T14:30:00Z\x00',
        '\x002026-03-16T14:30:00Z'
      ];

      nullByteTimestamps.forEach(timestamp => {
        const result = validateTimestampCharacters(timestamp);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('null byte');
      });
    });

    test('should reject shell metacharacters', () => {
      const shellMetacharacterTimestamps = [
        '2026-03-16T14:30:00Z; rm -rf /',
        '2026-03-16T14:30:00Z && cat /etc/passwd',
        '2026-03-16T14:30:00Z| ls',
        '2026-03-16T14:30:00Z$(whoami)',
        '2026-03-16T14:30:00Z`id`'
      ];

      shellMetacharacterTimestamps.forEach(timestamp => {
        const result = validateTimestampCharacters(timestamp);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('shell metacharacter');
      });
    });

    test('should accept clean timestamps', () => {
      const cleanTimestamps = [
        '2026-03-16T14:30:00Z',
        '2026-12-31T23:59:59Z',
        '2024-02-29T00:00:00Z'
      ];

      cleanTimestamps.forEach(timestamp => {
        const result = validateTimestampCharacters(timestamp);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });
  });
});

// ============================================================================
// PARAMETER VALIDATION
// ============================================================================

describe('Parameter Validation - Unit Tests', () => {
  describe('validateRequiredParameters', () => {
    test('should accept all required parameters', () => {
      const params = {
        command: 'stats',
        timestamp: '2026-03-16T14:30:00Z'
      };

      const result = validateRequiredParameters(params, ['command', 'timestamp']);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should reject missing required parameters', () => {
      const params = {
        command: 'rollback'
        // Missing timestamp
      };

      const result = validateRequiredParameters(params, ['command', 'timestamp']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing');
      expect(result.error).toContain('timestamp');
    });

    test('should reject null parameters', () => {
      const params = {
        command: 'rollback',
        timestamp: null as any
      };

      const result = validateRequiredParameters(params, ['command', 'timestamp']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('timestamp');
    });

    test('should reject undefined parameters', () => {
      const params = {
        command: 'rollback',
        timestamp: undefined as any
      };

      const result = validateRequiredParameters(params, ['command', 'timestamp']);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('timestamp');
    });
  });

  describe('validateParameterTypes', () => {
    test('should accept correct parameter types', () => {
      const params = {
        command: 'stats' as string,
        limit: 10 as number,
        verbose: true as boolean
      };

      const types = {
        command: 'string',
        limit: 'number',
        verbose: 'boolean'
      };

      const result = validateParameterTypes(params, types);
      expect(result.valid).toBe(true);
    });

    test('should reject incorrect parameter types', () => {
      const params = {
        command: 'stats',
        limit: '10' as any, // Should be number
        verbose: true
      };

      const types = {
        command: 'string',
        limit: 'number',
        verbose: 'boolean'
      };

      const result = validateParameterTypes(params, types);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('limit');
      expect(result.error).toContain('number');
    });
  });
});

// ============================================================================
// FLAG COMBINATION VALIDATION
// ============================================================================

describe('Flag Combination Validation - Unit Tests', () => {
  describe('validateFlagCombinations', () => {
    test('should accept valid flag combinations', () => {
      const validCombinations = [
        { flags: ['--stats'], valid: true },
        { flags: ['--history'], valid: true },
        { flags: ['--stats', '--history'], valid: true },
        { flags: ['--rollback', '--to', '2026-03-16T14:30:00Z'], valid: true }
      ];

      validCombinations.forEach(({ flags, valid }) => {
        const result = validateFlagCombinations(flags);
        expect(result.valid).toBe(valid);
      });
    });

    test('should reject --rollback with other flags', () => {
      const invalidCombinations = [
        ['--rollback', '--to', '2026-03-16T14:30:00Z', '--stats'],
        ['--rollback', '--to', '2026-03-16T14:30:00Z', '--history'],
        ['--rollback', '--to', '2026-03-16T14:30:00Z', '--stats', '--history']
      ];

      invalidCombinations.forEach(flags => {
        const result = validateFlagCombinations(flags);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('cannot be combined');
        expect(result.error).toContain('--rollback');
      });
    });

    test('should require --to flag with --rollback', () => {
      const flags = ['--rollback'];

      const result = validateFlagCombinations(flags);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('--rollback');
      expect(result.error).toContain('--to');
    });

    test('should reject unknown flags', () => {
      const flags = ['--stats', '--unknown-flag'];

      const result = validateFlagCombinations(flags);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Unknown flag');
      expect(result.error).toContain('--unknown-flag');
    });
  });
});

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

describe('Schema Validation - Unit Tests', () => {
  describe('validateStateSchema', () => {
    test('should accept valid state schema', () => {
      const validState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['async-await-pattern', 'error-handling-missing'],
        improvements_applied: 7,
        corrections_reduction: 0.35,
        platform: 'claude-code'
      };

      const result = validateStateSchema(validState);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject state with missing required fields', () => {
      const invalidState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1']
        // Missing: improvements_applied, corrections_reduction, platform
      };

      const result = validateStateSchema(invalidState);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
      expect(result.errors!.some(e => e.includes('improvements_applied'))).toBe(true);
      expect(result.errors!.some(e => e.includes('corrections_reduction'))).toBe(true);
      expect(result.errors!.some(e => e.includes('platform'))).toBe(true);
    });

    test('should reject state with invalid field types', () => {
      const invalidState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1'],
        improvements_applied: '7' as any, // Should be number
        corrections_reduction: 0.35,
        platform: 'claude-code'
      };

      const result = validateStateSchema(invalidState);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.includes('improvements_applied'))).toBe(true);
      expect(result.errors!.some(e => e.includes('number'))).toBe(true);
    });

    test('should accept additional optional fields', () => {
      const stateWithExtras = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1'],
        improvements_applied: 7,
        corrections_reduction: 0.35,
        platform: 'claude-code',
        _schema_note: 'JSONL format for results.jsonl', // Optional
        custom_field: 'custom value' // Additional
      };

      const result = validateStateSchema(stateWithExtras);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateResultsSchema', () => {
    test('should accept valid result entry', () => {
      const validResult = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied',
        summary: 'Fixed async/await pattern'
      };

      const result = validateResultsSchema(validResult);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject result with missing fields', () => {
      const invalidResult = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'applied'
        // Missing: summary
      };

      const result = validateResultsSchema(invalidResult);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.includes('summary'))).toBe(true);
    });

    test('should reject result with invalid status', () => {
      const invalidResult = {
        timestamp: '2026-03-16T14:30:00Z',
        status: 'invalid_status' as any,
        summary: 'Test summary'
      };

      const result = validateResultsSchema(invalidResult);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.some(e => e.includes('status'))).toBe(true);
    });

    test('should accept all valid statuses', () => {
      const validStatuses = ['applied', 'pending', 'failed'];

      validStatuses.forEach(status => {
        const validResult = {
          timestamp: '2026-03-16T14:30:00Z',
          status: status as 'applied' | 'pending' | 'failed',
          summary: 'Test summary'
        };

        const result = validateResultsSchema(validResult);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });
});

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

interface ValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
  errors?: string[];
}

function validateTimestampFormat(timestamp: string): ValidationResult {
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  if (!iso8601Regex.test(timestamp)) {
    return {
      valid: false,
      error: `Invalid timestamp format: "${timestamp}". Required format: YYYY-MM-DDTHH:MM:SSZ`
    };
  }

  return { valid: true };
}

function validateTimestampRange(timestamp: string, referenceDateStr?: string): ValidationResult {
  const date = new Date(timestamp);
  const now = referenceDateStr ? new Date(referenceDateStr) : new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  if (date > now) {
    return {
      valid: false,
      error: `Timestamp "${timestamp}" is later than current time`
    };
  }

  if (date < oneYearAgo) {
    return {
      valid: false,
      error: `Timestamp "${timestamp}" is older than 1 year`
    };
  }

  if (date < sixMonthsAgo) {
    return {
      valid: true,
      warning: `Timestamp "${timestamp}" is older than 6 months`
    };
  }

  return { valid: true };
}

function validateTimestampCharacters(timestamp: string): ValidationResult {
  if (timestamp.includes('..') || timestamp.includes('../') || timestamp.includes('..\\')) {
    return {
      valid: false,
      error: 'Timestamp contains path traversal characters'
    };
  }

  if (timestamp.includes('\x00')) {
    return {
      valid: false,
      error: 'Timestamp contains null byte'
    };
  }

  const shellMetachars = [';', '&', '|', '$', '(', ')', '`'];
  for (const char of shellMetachars) {
    if (timestamp.includes(char)) {
      return {
        valid: false,
        error: `Timestamp contains shell metacharacter: ${char}`
      };
    }
  }

  return { valid: true };
}

function validateRequiredParameters(
  params: Record<string, any>,
  required: string[]
): ValidationResult {
  const missing = required.filter(param => !params[param]);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required parameter(s): ${missing.join(', ')}`
    };
  }

  return { valid: true };
}

function validateParameterTypes(
  params: Record<string, any>,
  types: Record<string, string>
): ValidationResult {
  for (const [param, expectedType] of Object.entries(types)) {
    const actualType = typeof params[param];

    if (actualType !== expectedType) {
      return {
        valid: false,
        error: `Parameter "${param}" has type "${actualType}", expected "${expectedType}"`
      };
    }
  }

  return { valid: true };
}

function validateFlagCombinations(flags: string[]): ValidationResult {
  const validFlags = ['--stats', '--history', '--rollback', '--to'];
  const isoTimestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

  for (const flag of flags) {
    // Skip timestamps (they're parameters, not flags)
    if (isoTimestampRegex.test(flag)) {
      continue;
    }

    if (flag !== '--to' && !validFlags.includes(flag)) {
      return {
        valid: false,
        error: `Unknown flag: ${flag}`
      };
    }
  }

  if (flags.includes('--rollback')) {
    if (!flags.includes('--to')) {
      return {
        valid: false,
        error: '--rollback flag requires --to parameter'
      };
    }

    const hasOtherFlags = flags.some(f =>
      !isoTimestampRegex.test(f) && f !== '--rollback' && f !== '--to'
    );

    if (hasOtherFlags) {
      return {
        valid: false,
        error: '--rollback cannot be combined with other flags'
      };
    }
  }

  return { valid: true };
}

function validateStateSchema(state: any): ValidationResult {
  const errors: string[] = [];
  const required = {
    last_analysis: 'string',
    patterns_found: 'object',
    improvements_applied: 'number',
    corrections_reduction: 'number',
    platform: 'string'
  };

  for (const [field, expectedType] of Object.entries(required)) {
    if (!(field in state)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    const actualType = field === 'patterns_found'
      ? (Array.isArray(state[field]) ? 'object' : typeof state[field])
      : typeof state[field];

    if (actualType !== expectedType) {
      errors.push(`Field "${field}" has type "${actualType}", expected "${expectedType}"`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function validateResultsSchema(result: any): ValidationResult {
  const errors: string[] = [];
  const required = {
    timestamp: 'string',
    status: 'string',
    summary: 'string'
  };

  const validStatuses = ['applied', 'pending', 'failed'];

  for (const [field, expectedType] of Object.entries(required)) {
    if (!(field in result)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }

    if (typeof result[field] !== expectedType) {
      errors.push(`Field "${field}" has type "${typeof result[field]}", expected "${expectedType}"`);
    }
  }

  if (result.status && !validStatuses.includes(result.status)) {
    errors.push(`Invalid status: "${result.status}". Must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
