/**
 * Story 5.5: Load Historical State for Analysis - Unit Tests
 * TDD Red Phase: Failing tests for isKnownPattern pure function
 *
 * Test Strategy: Pure function unit tests -- no I/O, no file system.
 * Tests only the isKnownPattern business logic.
 *
 * Scope: TDD Red Phase ONLY - Generate failing tests
 * NO implementation code, NO production code modifications
 */

import { isKnownPattern, MergedPattern } from '../../src/state-management.js';
import { PatternCategory } from '../../src/pattern-detector.js';

describe('Story 5.5: isKnownPattern - Unit Tests (TDD Red Phase)', () => {
  // Fixtures
  const makePattern = (text: string): MergedPattern => ({
    pattern_text: text,
    count: 1,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: `Rule for ${text}`,
    first_seen: '2026-04-01T10:00:00Z',
    last_seen: '2026-04-01T10:00:00Z',
    session_count: 1,
    total_frequency: 1,
    is_new: true,
    frequency_change: 0,
    content_types: ['typescript'],
  });

  // ==========================================================================
  // AC4: New pattern detection capability
  // ==========================================================================

  describe('AC4: New pattern detection with MergedPattern array', () => {
    test('should return true when pattern_text matches exactly (case-sensitive)', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        makePattern('Always use async/await for async code'),
        makePattern('Never use var, prefer const/let'),
      ];

      const result = isKnownPattern('Always use async/await for async code', historicalPatterns);

      expect(result).toBe(true);
    });

    test('should return true when pattern_text matches case-insensitively', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        makePattern('Always use async/await for async code'),
        makePattern('Never use var, prefer const/let'),
      ];

      const result = isKnownPattern('always use ASYNC/AWAIT for async code', historicalPatterns);

      expect(result).toBe(true);
    });

    test('should return false for unknown pattern', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        makePattern('Always use async/await for async code'),
      ];

      const result = isKnownPattern('Completely new pattern', historicalPatterns);

      expect(result).toBe(false);
    });

    test('should return true for exact match with special characters', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        makePattern('Use .filter() before .map() for performance'),
      ];

      const result = isKnownPattern('Use .filter() before .map() for performance', historicalPatterns);

      expect(result).toBe(true);
    });
  });

  describe('AC4: New pattern detection with legacy string array', () => {
    test('should match string array elements case-insensitively', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        'Always use async/await for async code',
        'Never use var',
      ];

      const result = isKnownPattern('always use async/await for async code', historicalPatterns);

      expect(result).toBe(true);
    });

    test('should return false for unknown pattern in string array', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        'Always use async/await',
      ];

      const result = isKnownPattern('totally new pattern', historicalPatterns);

      expect(result).toBe(false);
    });
  });

  describe('AC4: Edge cases', () => {
    test('should return false for empty patterns array', () => {
      const historicalPatterns: (string | MergedPattern)[] = [];

      const result = isKnownPattern('Any pattern', historicalPatterns);

      expect(result).toBe(false);
    });

    test('should handle mixed array of strings and MergedPattern objects', () => {
      const historicalPatterns: (string | MergedPattern)[] = [
        'Legacy string pattern',
        makePattern('Object-based pattern'),
        'Another legacy string',
      ];

      // Match against string element
      expect(isKnownPattern('legacy STRING pattern', historicalPatterns)).toBe(true);

      // Match against MergedPattern element
      expect(isKnownPattern('OBJECT-based PATTERN', historicalPatterns)).toBe(true);

      // No match
      expect(isKnownPattern('Unknown pattern', historicalPatterns)).toBe(false);
    });

    test('should skip null/malformed elements without crashing', () => {
      // Force null into the array (simulating corrupted state)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const historicalPatterns: any[] = [
        'Valid string',
        null,
        undefined,
        42,
        makePattern('Valid object'),
      ];

      // Should not throw
      expect(isKnownPattern('valid STRING', historicalPatterns)).toBe(true);
      expect(isKnownPattern('valid OBJECT', historicalPatterns)).toBe(true);
      expect(isKnownPattern('nonexistent', historicalPatterns)).toBe(false);
    });
  });
});
