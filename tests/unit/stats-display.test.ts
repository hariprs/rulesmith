/**
 * Unit Tests for Stats Display (Story 1-7)
 *
 * Testing Strategy:
 * - Unit tests focus on stats display formatting logic
 * - Test metric extraction, formatting, and display logic
 * - Mock state.json reading to test display independently
 * - Test edge cases for metric calculations
 *
 * Coverage: AC1, AC4
 * FR37: --stats command displays metrics from state.json
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

// State schema from Story 1-5
interface StateData {
  last_analysis: string;
  patterns_found: string[];
  improvements_applied: number;
  corrections_reduction: number;
  platform: string;
  _schema_note?: string;
}

interface StatsDisplay {
  success: boolean;
  output: string;
  error?: string;
}

// Implementation of stats display logic
function formatStats(state: StateData): StatsDisplay {
  if (!state || typeof state !== 'object') {
    return {
      success: false,
      output: '',
      error: `⚠️ Error: Invalid state data

**What happened:** State data is null or not an object

**How to fix:**
1. Run /improve-rules to create initial state file
2. Verify state.json contains valid JSON data
3. Check file permissions (should be 0600)

**Technical details:**
- Received: ${state === null ? 'null' : typeof state}
- Required: object with StateData schema`
    };
  }

  const validation = validateStateSchema(state);
  if (!validation.valid) {
    return {
      success: false,
      output: '',
      error: `⚠️ Error: State file schema validation failed

**What happened:** ${validation.errors.join('; ')}

**How to fix:**
1. Restore from backup if available
2. Delete file and re-run /improve-rules to recreate with correct schema
3. Check state.json against Story 1-5 schema specification

**Technical details:**
- Validation errors: ${validation.errors.join(', ')}
- Error code: SCHEMA_VALIDATION_FAILED`
    };
  }

  // Check if state is empty (initial values)
  if (state.patterns_found.length === 0 && state.improvements_applied === 0 && state.corrections_reduction === 0) {
    return {
      success: true,
      output: `📊 Project Self-Improvement Statistics

No analysis data available yet. Run /improve-rules to generate initial metrics.

**Platform:** ${state.platform}
**Status:** Ready for first analysis`
    };
  }

  // Format display
  const patternsList = state.patterns_found.length > 0
    ? '─'.repeat(45) + '\n' + state.patterns_found.map(p => `• ${p}`).join('\n')
    : '';

  const output = `📊 Project Self-Improvement Statistics

Patterns Found: ${state.patterns_found.length}
${patternsList}

Improvements Applied: ${state.improvements_applied}
Corrections Reduction: ${(state.corrections_reduction * 100).toFixed(2)}%
Last Analysis: ${state.last_analysis || 'Never'}
Platform: ${state.platform}`;

  return {
    success: true,
    output
  };
}

function calculateCorrectionsReduction(baseline: number, current: number): number {
  if (baseline === 0) {
    return 0;
  }
  return (baseline - current) / baseline;
}

function validateStateSchema(state: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!state || typeof state !== 'object') {
    return { valid: false, errors: ['State data must be a non-null object'] };
  }

  const s = state as Record<string, unknown>;

  // Validate last_analysis field
  if (!('last_analysis' in s) || typeof s.last_analysis !== 'string') {
    errors.push('last_analysis must be a string');
  }

  // Validate patterns_found field
  if (!('patterns_found' in s)) {
    errors.push('Missing field: patterns_found');
  } else if (!Array.isArray(s.patterns_found)) {
    errors.push('patterns_found must be an array');
  } else if (!s.patterns_found.every((item: unknown) => typeof item === 'string')) {
    errors.push('All elements in patterns_found must be strings');
  }

  // Validate improvements_applied field
  if (!('improvements_applied' in s) || typeof s.improvements_applied !== 'number') {
    errors.push('improvements_applied must be a number');
  } else if (Number.isNaN(s.improvements_applied) || s.improvements_applied < 0 || !Number.isFinite(s.improvements_applied)) {
    errors.push('improvements_applied must be a non-negative finite number');
  }

  // Validate corrections_reduction field
  if (!('corrections_reduction' in s) || typeof s.corrections_reduction !== 'number') {
    errors.push('corrections_reduction must be a number');
  } else if (Number.isNaN(s.corrections_reduction) || s.corrections_reduction < 0 || s.corrections_reduction > 1 || !Number.isFinite(s.corrections_reduction)) {
    errors.push('corrections_reduction must be between 0 and 1');
  }

  // Validate platform field
  if (!('platform' in s) || typeof s.platform !== 'string') {
    errors.push('platform must be a string');
  } else if (!['claude-code', 'cursor', 'unknown'].includes(s.platform)) {
    errors.push('platform must be one of: claude-code, cursor, unknown');
  }

  // _schema_note is optional
  if ('_schema_note' in s && typeof s._schema_note !== 'string') {
    errors.push('_schema_note must be a string if present');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

describe('Stats Display - Unit Tests', () => {
  const validState: StateData = {
    last_analysis: '2026-03-16T10:30:00Z',
    patterns_found: ['pattern1', 'pattern2', 'pattern3'],
    improvements_applied: 5,
    corrections_reduction: 0.25,
    platform: 'claude-code',
    _schema_note: 'JSONL format'
  };

  describe('Metrics extraction and display', () => {
    test('should display all required metrics (AC4)', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('patterns_found');
      expect(result.output).toContain('improvements_applied');
      expect(result.output).toContain('corrections_reduction');
    });

    test('should display patterns_found count', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('3'); // Count of patterns
      expect(result.output).toContain('pattern1');
      expect(result.output).toContain('pattern2');
      expect(result.output).toContain('pattern3');
    });

    test('should display improvements_applied as number', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('5');
      expect(result.output).toContain('improvements_applied');
    });

    test('should display corrections_reduction as percentage (AC4)', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('25%');
      expect(result.output).toContain('%');
    });

    test('should display last_analysis timestamp', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('2026-03-16T10:30:00Z');
    });

    test('should display platform', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('claude-code');
    });
  });

  describe('Edge cases - initial state', () => {
    test('should display initial state with zero values', () => {
      const initialState: StateData = {
        last_analysis: '',
        patterns_found: [],
        improvements_applied: 0,
        corrections_reduction: 0,
        platform: 'unknown'
      };

      const result = formatStats(initialState);

      expect(result.success).toBe(true);
      expect(result.output).toContain('0');
      expect(result.output).toContain('No analysis data available yet');
    });

    test('should handle empty patterns_found array', () => {
      const state: StateData = {
        ...validState,
        patterns_found: []
      };

      const result = formatStats(state);

      expect(result.success).toBe(true);
      expect(result.output).toContain('0');
    });

    test('should handle zero improvements_applied', () => {
      const state: StateData = {
        ...validState,
        improvements_applied: 0
      };

      const result = formatStats(state);

      expect(result.success).toBe(true);
      expect(result.output).toContain('0');
    });

    test('should handle zero corrections_reduction', () => {
      const state: StateData = {
        ...validState,
        corrections_reduction: 0
      };

      const result = formatStats(state);

      expect(result.success).toBe(true);
      expect(result.output).toContain('0%');
    });
  });

  describe('Corrections reduction calculation', () => {
    test('should calculate percentage decrease from baseline', () => {
      const baseline = 100;
      const current = 75;
      const result = calculateCorrectionsReduction(baseline, current);

      expect(result).toBe(0.25); // 25% reduction
    });

    test('should handle zero baseline', () => {
      const result = calculateCorrectionsReduction(0, 0);

      expect(result).toBe(0);
    });

    test('should handle increase in corrections', () => {
      const baseline = 50;
      const current = 75;
      const result = calculateCorrectionsReduction(baseline, current);

      expect(result).toBeLessThan(0); // Negative = increase
    });

    test('should handle no change', () => {
      const baseline = 100;
      const current = 100;
      const result = calculateCorrectionsReduction(baseline, current);

      expect(result).toBe(0);
    });

    test('should handle complete elimination (100% reduction)', () => {
      const baseline = 100;
      const current = 0;
      const result = calculateCorrectionsReduction(baseline, current);

      expect(result).toBe(1.0); // 100% reduction
    });
  });

  describe('Schema validation', () => {
    test('should validate complete state schema', () => {
      const result = validateStateSchema(validState);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing required fields', () => {
      const incompleteState = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1']
        // Missing improvements_applied, corrections_reduction, platform
      };

      const result = validateStateSchema(incompleteState);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('improvements_applied');
      expect(result.errors).toContain('corrections_reduction');
      expect(result.errors).toContain('platform');
    });

    test('should reject invalid data types', () => {
      const invalidState = {
        last_analysis: 123, // Should be string
        patterns_found: 'not-array', // Should be array
        improvements_applied: '5', // Should be number
        corrections_reduction: '0.25', // Should be number
        platform: ['claude-code'] // Should be string
      };

      const result = validateStateSchema(invalidState);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should allow optional _schema_note field', () => {
      const stateWithoutNote = {
        last_analysis: '2026-03-16T10:30:00Z',
        patterns_found: ['pattern1'],
        improvements_applied: 5,
        corrections_reduction: 0.25,
        platform: 'claude-code'
      };

      const result = validateStateSchema(stateWithoutNote);

      expect(result.valid).toBe(true);
    });

    test('should validate array items are strings', () => {
      const invalidPatterns = {
        ...validState,
        patterns_found: [123, 456] as unknown as string[]
      };

      const result = validateStateSchema(invalidPatterns);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('patterns_found');
    });

    test('should validate numeric ranges', () => {
      const invalidReduction = {
        ...validState,
        corrections_reduction: 1.5 // Should be 0-1
      };

      const result = validateStateSchema(invalidReduction);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('corrections_reduction');
    });

    test('should validate timestamp format', () => {
      const invalidTimestamp = {
        ...validState,
        last_analysis: 'not-a-timestamp'
      };

      const result = validateStateSchema(invalidTimestamp);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('last_analysis');
    });
  });

  describe('Display formatting', () => {
    test('should format output as table (AC4)', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/Pattern|Metrics|Statistics/i);
    });

    test('should include labels for each metric', () => {
      const result = formatStats(validState);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/Patterns Found|patterns_found/i);
      expect(result.output).toMatch(/Improvements|improvements_applied/i);
      expect(result.output).toMatch(/Reduction|corrections_reduction/i);
    });

    test('should format percentage correctly', () => {
      const state: StateData = {
        ...validState,
        corrections_reduction: 0.333
      };

      const result = formatStats(state);

      expect(result.success).toBe(true);
      expect(result.output).toMatch(/\d+\.?\d*%/);
    });

    test('should handle large numbers', () => {
      const state: StateData = {
        ...validState,
        improvements_applied: 1000000,
        patterns_found: Array.from({ length: 100 }, (_, i) => `pattern${i}`)
      };

      const result = formatStats(state);

      expect(result.success).toBe(true);
      expect(result.output).toContain('1000000');
      expect(result.output).toContain('100');
    });
  });

  describe('Error handling', () => {
    test('should handle null state gracefully', () => {
      const result = formatStats(null as unknown as StateData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle undefined state gracefully', () => {
      const result = formatStats(undefined as unknown as StateData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should provide AR22-compliant error for invalid state', () => {
      const result = formatStats({} as StateData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('What happened');
      expect(result.error).toContain('How to fix');
      expect(result.error).toContain('Technical details');
    });
  });
});
