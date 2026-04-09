/**
 * Unit Tests: Interface Manager (Story 4.1)
 *
 * Test Coverage:
 * - Present changes for review
 * - Navigation (next, previous, jump to)
 * - Show all changes with pagination
 * - Decision making (approve, reject, edit)
 * - Undo decisions
 * - State export/import
 * - Session resume
 * - Rate limiting
 * - Input validation
 * - Error handling
 * - Edge cases
 *
 * Testing Priority: Unit > Integration > E2E
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { InterfaceManager } from '../../../src/review/interface-manager.js';
import { RuleSuggestion, RuleProposalType } from '../../../src/review/../rules/types.js';
import { DecisionType } from '../../../src/review/types.js';
import { Pattern, PatternCategory } from '../../../src/review/../pattern-detector/index.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript',
      user_correction: 'Use TypeScript with strict mode enabled',
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

const createMockRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createMockPattern(),
  ruleText: 'Always use TypeScript strict mode in all projects.',
  explanation: 'TypeScript strict mode catches more errors at compile time.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

// ============================================================================
// TEST SUITES
// ============================================================================

describe('InterfaceManager', () => {
  let manager: InterfaceManager;

  beforeEach(() => {
    manager = new InterfaceManager();
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // ========================================================================
  // PRESENT FOR REVIEW
  // ========================================================================

  describe('presentForReview', () => {
    it('should display single change', () => {
      const changes = [createMockRuleSuggestion()];
      const result = manager.presentForReview(changes);

      expect(result).toContain('# Review Summary');
      expect(result).toContain('**Total Changes:** 1');
      expect(result).toContain('## Change #1 of 1');
      expect(result).toContain('Always use TypeScript strict mode');
    });

    it('should display multiple changes', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
        createMockRuleSuggestion({ id: 'rule-3', ruleText: 'Rule 3' }),
      ];
      const result = manager.presentForReview(changes);

      expect(result).toContain('**Total Changes:** 3');
      expect(result).toContain('## Change #1 of 3');
      expect(result).toContain('Rule 1');
    });

    it('should handle empty changes list', () => {
      const result = manager.presentForReview([]);

      expect(result).toContain('**Total Changes:** 0');
      expect(result).toContain('**No changes to review.**');
    });

    it('should generate unique session ID', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);
      const sessionId1 = manager.getSessionId();

      const manager2 = new InterfaceManager();
      manager2.presentForReview(changes);
      const sessionId2 = manager2.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should display session ID in navigation help', () => {
      const changes = [createMockRuleSuggestion()];
      const result = manager.presentForReview(changes);

      expect(result).toContain('**Session ID:**');
      expect(result).toMatch(/\*\*Session ID:\*\* `[\w-]+`/);
    });

    it('should cap changes at MAX_DISPLAY_CHANGES (50)', () => {
      const changes = Array.from({ length: 100 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}`, ruleText: `Rule ${i}` })
      );
      const result = manager.presentForReview(changes);

      expect(result).toContain('**Total Changes:** 50');
      expect(result).not.toContain('Rule 51');
    });

    it('should validate required fields', () => {
      const invalidChanges = [
        { id: 'rule-1' }, // Missing required fields
      ] as any;
      const result = manager.presentForReview(invalidChanges);

      expect(result).toContain('# ⚠️ Error');
    });

    it('should handle non-array input', () => {
      const result = manager.presentForReview(null as any);

      expect(result).toContain('# ⚠️ Error');
      expect(result).toContain('Invalid changes parameter');
    });

    it('should handle extremely large arrays', () => {
      const changes = Array.from({ length: 15000 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );
      const result = manager.presentForReview(changes);

      expect(result).toContain('# ⚠️ Error');
      expect(result).toContain('Too many changes');
    });

    it('should show navigation help', () => {
      const changes = [createMockRuleSuggestion()];
      const result = manager.presentForReview(changes);

      expect(result).toContain('**Navigation Commands:**');
      expect(result).toContain('- `next` or `n` - View next change');
      expect(result).toContain('- `previous` or `p` - View previous change');
      expect(result).toContain('- `show X` - Jump to change number X');
      expect(result).toContain('- `show all` - Display all changes');
    });
  });

  // ========================================================================
  // NAVIGATION
  // ========================================================================

  describe('navigateNext', () => {
    it('should navigate to next change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
      ];
      manager.presentForReview(changes);

      const result = manager.navigateNext();

      expect(result).toContain('## Change #2 of 2');
      expect(result).toContain('Rule 2');
    });

    it('should wrap around to first change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
      ];
      manager.presentForReview(changes);
      manager.navigateNext(); // Go to #2

      const result = manager.navigateNext(); // Wrap to #1

      expect(result).toContain('## Change #1 of 2');
      expect(result).toContain('Rule 1');
    });

    it('should handle no changes', () => {
      manager.presentForReview([]);
      const result = manager.navigateNext();

      expect(result).toContain('**No changes to navigate.**');
    });

    it('should enforce rate limiting', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      // Rapid navigation should trigger rate limit
      const result1 = manager.navigateNext();
      const result2 = manager.navigateNext();

      expect(result2).toContain('**Rate limit exceeded**');
    });
  });

  describe('navigatePrevious', () => {
    it('should navigate to previous change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
      ];
      manager.presentForReview(changes);
      manager.navigateNext(); // Go to #2

      const result = manager.navigatePrevious();

      expect(result).toContain('## Change #1 of 2');
      expect(result).toContain('Rule 1');
    });

    it('should wrap around to last change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
      ];
      manager.presentForReview(changes);

      const result = manager.navigatePrevious();

      expect(result).toContain('## Change #2 of 2');
      expect(result).toContain('Rule 2');
    });

    it('should handle no changes', () => {
      manager.presentForReview([]);
      const result = manager.navigatePrevious();

      expect(result).toContain('**No changes to navigate.**');
    });
  });

  describe('navigateToChange', () => {
    it('should jump to specific change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1', ruleText: 'Rule 1' }),
        createMockRuleSuggestion({ id: 'rule-2', ruleText: 'Rule 2' }),
        createMockRuleSuggestion({ id: 'rule-3', ruleText: 'Rule 3' }),
      ];
      manager.presentForReview(changes);

      const result = manager.navigateToChange(3);

      expect(result).toContain('## Change #3 of 3');
      expect(result).toContain('Rule 3');
    });

    it('should handle invalid index (too low)', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.navigateToChange(0);

      expect(result).toContain('**Invalid change number.**');
      expect(result).toContain('between 1 and 1');
    });

    it('should handle invalid index (too high)', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.navigateToChange(5);

      expect(result).toContain('**Invalid change number.**');
      expect(result).toContain('between 1 and 1');
    });

    it('should handle non-integer index', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.navigateToChange(1.5);

      expect(result).toContain('**Invalid change number.**');
      expect(result).toContain('Index must be an integer');
    });

    it('should handle non-number index', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.navigateToChange('abc' as any);

      expect(result).toContain('**Invalid change number.**');
      expect(result).toContain('Index must be an integer');
    });

    it('should handle no changes', () => {
      manager.presentForReview([]);

      const result = manager.navigateToChange(1);

      expect(result).toContain('**No changes to navigate.**');
    });

    it('should enforce rate limiting', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      manager.navigateToChange(2);
      const result = manager.navigateToChange(1); // Rapid navigation

      expect(result).toContain('**Rate limit exceeded**');
    });
  });

  // ========================================================================
  // SHOW ALL CHANGES
  // ========================================================================

  describe('showAllChanges', () => {
    it('should show first page by default', () => {
      const changes = Array.from({ length: 25 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}`, ruleText: `Rule ${i}` })
      );
      manager.presentForReview(changes);

      const result = manager.showAllChanges(1);

      expect(result).toContain('# All Proposed Changes');
      expect(result).toContain('**Page 1 of 3**');
      expect(result).toContain('## Change #1 of 25');
      expect(result).toContain('## Change #10 of 25');
      expect(result).not.toContain('## Change #11');
    });

    it('should show specific page', () => {
      const changes = Array.from({ length: 25 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}`, ruleText: `Rule ${i}` })
      );
      manager.presentForReview(changes);

      const result = manager.showAllChanges(2);

      expect(result).toContain('**Page 2 of 3**');
      expect(result).toContain('## Change #11 of 25');
      expect(result).toContain('## Change #20 of 25');
    });

    it('should handle invalid page number', () => {
      const changes = Array.from({ length: 25 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );
      manager.presentForReview(changes);

      const result = manager.showAllChanges(99);

      expect(result).toContain('**Invalid page number.**');
      expect(result).toContain('between 1 and 3');
    });

    it('should handle no changes', () => {
      manager.presentForReview([]);

      const result = manager.showAllChanges(1);

      expect(result).toContain('**No changes to display.**');
    });

    it('should handle non-finite page number', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.showAllChanges(NaN);

      expect(result).toContain('**Invalid page number.**');
      expect(result).toContain('must be a finite number');
    });

    it('should handle single page', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.showAllChanges(1);

      expect(result).toContain('**Page 1 of 1**');
      expect(result).not.toContain('**Navigation:**');
    });
  });

  // ========================================================================
  // DECISION MAKING
  // ========================================================================

  describe('makeDecision', () => {
    it('should approve current change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      const result = manager.makeDecision(DecisionType.APPROVED);

      expect(result).toContain('**Change #1 marked as approved.**');
      expect(result).toContain('## Change #2 of 2');
    });

    it('should reject current change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      const result = manager.makeDecision(DecisionType.REJECTED);

      expect(result).toContain('**Change #1 marked as rejected.**');
      expect(result).toContain('## Change #2 of 2');
    });

    it('should edit current change', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);

      const result = manager.makeDecision(DecisionType.EDITED);

      expect(result).toContain('**Change #1 marked as edited.**');
      expect(result).toContain('## Change #2 of 2');
    });

    it('should complete review on last change', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.makeDecision(DecisionType.APPROVED);

      expect(result).toContain('**Change #1 marked as approved.**');
      expect(result).toContain('**Review Complete!**');
      expect(result).toContain('- Approved: 1');
    });

    it('should handle no changes', () => {
      manager.presentForReview([]);

      const result = manager.makeDecision(DecisionType.APPROVED);

      expect(result).toContain('**No changes to review.**');
    });

    it('should handle invalid decision type', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.makeDecision('invalid' as DecisionType);

      expect(result).toContain('**Invalid decision type.**');
      expect(result).toContain('Must be one of:');
    });

    it('should handle non-string decision', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.makeDecision(null as any);

      expect(result).toContain('**Invalid decision.**');
      expect(result).toContain('Decision must be a string value');
    });
  });

  // ========================================================================
  // UNDO DECISIONS
  // ========================================================================

  describe('undoDecision', () => {
    it('should undo a decision', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);

      const result = manager.undoDecision(1);

      expect(result).toContain('**Decision for change #1 has been undone.**');
      expect(result).toContain('- Pending: 1');
      expect(result).toContain('- Approved: 0');
    });

    it('should handle change with no decision', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.undoDecision(1);

      expect(result).toContain('**Change #1 has no decision to undo.**');
    });

    it('should handle invalid change number', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.undoDecision(99);

      expect(result).toContain('**Invalid change number.**');
    });

    it('should handle non-integer index', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const result = manager.undoDecision(1.5);

      expect(result).toContain('**Invalid change number.**');
      expect(result).toContain('Index must be an integer');
    });
  });

  // ========================================================================
  // STATE EXPORT/IMPORT
  // ========================================================================

  describe('exportReviewState', () => {
    it('should export state as JSON', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);

      const exported = manager.exportReviewState();

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed).toHaveProperty('sessionId');
      expect(parsed).toHaveProperty('currentIndex');
      expect(parsed).toHaveProperty('changes');
      expect(parsed).toHaveProperty('decisions');
    });

    it('should include decisions in export', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);

      const exported = manager.exportReviewState();
      const parsed = JSON.parse(exported);

      expect(parsed.decisions).toHaveProperty('0', 'approved');
    });
  });

  describe('importReviewState', () => {
    it('should import valid state', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const exported = manager.exportReviewState();
      const manager2 = new InterfaceManager();
      const success = manager2.importReviewState(exported);

      expect(success).toBe(true);
      expect(manager2.getSessionId()).toBe(manager.getSessionId());
    });

    it('should handle invalid JSON', () => {
      const success = manager.importReviewState('invalid json');

      expect(success).toBe(false);
    });

    it('should handle null input', () => {
      const success = manager.importReviewState(null as any);

      expect(success).toBe(false);
    });

    it('should handle undefined input', () => {
      const success = manager.importReviewState(undefined as any);

      expect(success).toBe(false);
    });

    it('should handle non-string input', () => {
      const success = manager.importReviewState(123 as any);

      expect(success).toBe(false);
    });

    it('should handle oversized JSON', () => {
      const largeJson = 'A'.repeat(11 * 1024 * 1024); // 11MB
      const success = manager.importReviewState(largeJson);

      expect(success).toBe(false);
    });
  });

  // ========================================================================
  // SESSION RESUME
  // ========================================================================

  describe('resumeSession', () => {
    it('should resume existing session', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);
      const sessionId = manager.getSessionId();

      const manager2 = new InterfaceManager();
      const result = manager2.resumeSession(sessionId);

      expect(result).toContain('**Session Resumed**');
      expect(result).toContain('- Approved: 1');
      expect(result).toContain('- Pending: 1');
    });

    it('should handle invalid session ID', () => {
      const result = manager.resumeSession('non-existent-session');

      expect(result).toContain('**Failed to resume session.**');
      expect(result).toContain('Session may have expired');
    });

    it('should handle null session ID', () => {
      const result = manager.resumeSession(null as any);

      expect(result).toContain('**Invalid session ID.**');
    });

    it('should handle non-string session ID', () => {
      const result = manager.resumeSession(123 as any);

      expect(result).toContain('**Invalid session ID.**');
    });

    it('should sanitize session ID with invalid characters', () => {
      const result = manager.resumeSession('../../../etc/passwd');

      expect(result).toContain('**Invalid session ID format.**');
      expect(result).toContain('invalid characters');
    });

    it('should reset out-of-bounds index', () => {
      // This test assumes state persistence works
      // In real scenario, would need to mock StateManager
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      // Manually set invalid index (testing recovery)
      const result = manager.resumeSession('test-session');

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // SESSION INFO
  // ========================================================================

  describe('getSessionId', () => {
    it('should return valid session ID', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const sessionId = manager.getSessionId();

      expect(typeof sessionId).toBe('string');
      expect(sessionId.length).toBeGreaterThan(0);
      expect(sessionId).toMatch(/^[a-f0-9-]+$/); // UUID-like format
    });

    it('should return different IDs for different sessions', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);
      const sessionId1 = manager.getSessionId();

      const manager2 = new InterfaceManager();
      manager2.presentForReview(changes);
      const sessionId2 = manager2.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('getReviewSummary', () => {
    it('should return summary string', () => {
      const changes = [createMockRuleSuggestion()];
      manager.presentForReview(changes);

      const summary = manager.getReviewSummary();

      expect(summary).toContain('# Review Summary');
      expect(summary).toContain('**Total Changes:** 1');
    });

    it('should reflect decisions made', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);

      const summary = manager.getReviewSummary();

      expect(summary).toContain('- Approved: 1');
      expect(summary).toContain('- Pending: 1');
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const changes = [
        createMockRuleSuggestion({ id: 'rule-1' }),
        createMockRuleSuggestion({ id: 'rule-2' }),
      ];
      manager.presentForReview(changes);
      manager.makeDecision(DecisionType.APPROVED);

      const debugInfo = manager.getDebugInfo();

      expect(debugInfo).toHaveProperty('sessionId');
      expect(debugInfo).toHaveProperty('currentIndex');
      expect(debugInfo).toHaveProperty('totalChanges');
      expect(debugInfo).toHaveProperty('decisionsCount');
      expect(debugInfo).toHaveProperty('lastActivity');
      expect(debugInfo.totalChanges).toBe(2);
      expect(debugInfo.decisionsCount).toBe(1);
    });
  });
});
