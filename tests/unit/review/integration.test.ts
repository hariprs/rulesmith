/**
 * Integration Tests: Review Interface (Story 4.1)
 *
 * End-to-end testing of the complete review workflow:
 * - Integration with Epic 3 RuleSuggestion[] output
 * - Complete review session lifecycle
 * - State persistence and recovery
 * - Decision workflow
 * - Navigation workflow
 * - Security in context
 *
 * Testing Priority: Unit > Integration > E2E
 * Only add integration tests where unit tests are insufficient
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { InterfaceManager } from '../../../src/review/interface-manager.js';
import { StateManager } from '../../../src/review/state-manager.js';
import { AuditLogger } from '../../../src/review/audit-logger.js';
import { MarkdownFormatter } from '../../../src/review/markdown-formatter.js';
import { RuleSuggestion, RuleProposalType } from '../../../src/review/../rules/types.js';
import { DecisionType } from '../../../src/review/types.js';
import { Pattern, PatternCategory } from '../../../src/review/../pattern-detector/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createRealisticPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript for this project',
      user_correction: 'Use TypeScript with strict mode enabled',
      timestamp: '2024-01-01T00:00:00Z',
    },
    {
      original_suggestion: 'Disable strict mode for faster development',
      user_correction: 'Keep strict mode enabled for type safety',
      timestamp: '2024-01-02T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

const createRealisticRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createRealisticPattern(),
  ruleText: 'Always use TypeScript strict mode in all projects. Enable noUncheckedIndexedAccess for additional safety.',
  explanation: 'TypeScript strict mode catches more errors at compile time, reducing runtime issues.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

const createEpic3Output = (): RuleSuggestion[] => {
  return [
    createRealisticRuleSuggestion({
      id: 'rule-1',
      type: RuleProposalType.NEW_RULE,
      pattern: createRealisticPattern({
        pattern_text: 'Use TypeScript strict mode',
        category: PatternCategory.CODE_STYLE,
        count: 5,
      }),
      ruleText: 'Always use TypeScript strict mode.',
      explanation: 'Improves type safety.',
      confidence: 0.9,
    }),
    createRealisticRuleSuggestion({
      id: 'rule-2',
      type: RuleProposalType.MODIFICATION,
      pattern: createRealisticPattern({
        pattern_text: 'Prefer const over let',
        category: PatternCategory.CODE_STYLE,
        count: 3,
      }),
      ruleText: 'Prefer const over let for variables that are not reassigned.',
      beforeAfter: {
        before: 'Use let for all variables.',
        after: 'Prefer const over let for variables that are not reassigned.',
        changes: [
          { type: 'addition', text: 'Prefer const over let' },
        ],
      },
      explanation: 'Prevents accidental reassignments.',
      confidence: 0.75,
    }),
    createRealisticRuleSuggestion({
      id: 'rule-3',
      type: RuleProposalType.ADDITION,
      pattern: createRealisticPattern({
        pattern_text: 'Add JSDoc comments',
        category: PatternCategory.CODE_STYLE,
        count: 2,
      }),
      ruleText: 'Add JSDoc comments to all public functions.',
      explanation: 'Improves code documentation.',
      confidence: 0.6,
    }),
  ];
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Integration Tests: Review Interface', () => {
  let manager: InterfaceManager;
  let stateManager: StateManager;
  let auditLogger: AuditLogger;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
    stateManager = new StateManager(tempDir);
    auditLogger = new AuditLogger(tempDir);
    manager = new InterfaceManager();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========================================================================
  // COMPLETE REVIEW WORKFLOW
  // ========================================================================

  describe('Complete Review Workflow', () => {
    it('should handle full review session from start to finish', () => {
      const changes = createEpic3Output();

      // 1. Present changes
      let result = manager.presentForReview(changes);
      expect(result).toContain('# Review Summary');
      expect(result).toContain('**Total Changes:** 3');
      expect(result).toContain('## Change #1 of 3');
      expect(result).toContain('Always use TypeScript strict mode');

      // 2. Approve first change
      result = manager.makeDecision(DecisionType.APPROVED);
      expect(result).toContain('**Change #1 marked as approved**');
      expect(result).toContain('## Change #2 of 3');

      // 3. Navigate to previous
      result = manager.navigatePrevious();
      expect(result).toContain('## Change #1 of 3');

      // 4. Navigate to next
      result = manager.navigateNext();
      expect(result).toContain('## Change #2 of 3');

      // 5. Reject second change
      result = manager.makeDecision(DecisionType.REJECTED);
      expect(result).toContain('**Change #2 marked as rejected**');
      expect(result).toContain('## Change #3 of 3');

      // 6. Edit third change
      result = manager.makeDecision(DecisionType.EDITED);
      expect(result).toContain('**Change #3 marked as edited**');
      expect(result).toContain('**Review Complete!**');

      // 7. Check summary
      const summary = manager.getReviewSummary();
      expect(summary).toContain('- Approved: 1');
      expect(summary).toContain('- Rejected: 1');
      expect(summary).toContain('- Edited: 1');
      expect(summary).toContain('- Pending: 0');
    });

    it('should handle review with undo operations', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Make some decisions
      manager.makeDecision(DecisionType.APPROVED);
      manager.makeDecision(DecisionType.REJECTED);

      // Undo first decision
      let result = manager.undoDecision(1);
      expect(result).toContain('**Decision for change #1 has been undone**');
      expect(result).toContain('- Pending: 2');

      // Undo second decision
      result = manager.undoDecision(2);
      expect(result).toContain('**Decision for change #2 has been undone**');
      expect(result).toContain('- Pending: 3');
    });
  });

  // ========================================================================
  // STATE PERSISTENCE
  // ========================================================================

  describe('State Persistence', () => {
    it('should save and restore session state', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Make some decisions
      manager.makeDecision(DecisionType.APPROVED);
      manager.makeDecision(DecisionType.REJECTED);

      const sessionId = manager.getSessionId();
      const exportedState = manager.exportReviewState();

      // Create new manager and import state
      const manager2 = new InterfaceManager();
      const imported = manager2.importReviewState(exportedState);

      expect(imported).toBe(true);
      expect(manager2.getSessionId()).toBe(sessionId);

      const summary = manager2.getReviewSummary();
      expect(summary).toContain('- Approved: 1');
      expect(summary).toContain('- Rejected: 1');
    });

    it('should resume session from disk', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      manager.makeDecision(DecisionType.APPROVED);
      manager.makeDecision(DecisionType.REJECTED);

      const sessionId = manager.getSessionId();

      // Create new manager and resume session
      const manager2 = new InterfaceManager();
      const result = manager2.resumeSession(sessionId);

      expect(result).toContain('**Session Resumed**');
      expect(result).toContain('- Approved: 1');
      expect(result).toContain('- Rejected: 1');
    });

    it('should handle session timeout', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      const sessionId = manager.getSessionId();

      // Manually expire the session by modifying the file
      const sessionsDir = path.join(tempDir, 'review-sessions');
      const sessionFile = path.join(sessionsDir, `${sessionId}.json`);
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      content.lastActivity = new Date(Date.now() - 31 * 60 * 1000).toISOString();
      fs.writeFileSync(sessionFile, JSON.stringify(content));

      // Try to resume expired session
      const manager2 = new InterfaceManager();
      const result = manager2.resumeSession(sessionId);

      expect(result).toContain('**Failed to resume session**');
    });
  });

  // ========================================================================
  // NAVIGATION WORKFLOW
  // ========================================================================

  describe('Navigation Workflow', () => {
    it('should support sequential navigation through all changes', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Start at change 1
      let result = manager.getReviewSummary();
      expect(result).toContain('## Change #1 of 3');

      // Navigate to next
      result = manager.navigateNext();
      expect(result).toContain('## Change #2 of 3');

      // Navigate to next
      result = manager.navigateNext();
      expect(result).toContain('## Change #3 of 3');

      // Wrap around to first
      result = manager.navigateNext();
      expect(result).toContain('## Change #1 of 3');

      // Navigate to previous (should wrap to last)
      result = manager.navigatePrevious();
      expect(result).toContain('## Change #3 of 3');
    });

    it('should support jumping to specific changes', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Jump to change 3
      let result = manager.navigateToChange(3);
      expect(result).toContain('## Change #3 of 3');

      // Jump to change 1
      result = manager.navigateToChange(1);
      expect(result).toContain('## Change #1 of 3');

      // Jump to change 2
      result = manager.navigateToChange(2);
      expect(result).toContain('## Change #2 of 3');
    });

    it('should support show all with pagination', () => {
      const changes = Array.from({ length: 25 }, (_, i) =>
        createRealisticRuleSuggestion({ id: `rule-${i}` })
      );
      manager.presentForReview(changes);

      // Show first page
      let result = manager.showAllChanges(1);
      expect(result).toContain('**Page 1 of 3**');
      expect(result).toContain('## Change #1 of 25');
      expect(result).toContain('## Change #10 of 25');

      // Show second page
      result = manager.showAllChanges(2);
      expect(result).toContain('**Page 2 of 3**');
      expect(result).toContain('## Change #11 of 25');
      expect(result).toContain('## Change #20 of 25');

      // Show third page
      result = manager.showAllChanges(3);
      expect(result).toContain('**Page 3 of 3**');
      expect(result).toContain('## Change #21 of 25');
      expect(result).toContain('## Change #25 of 25');
    });
  });

  // ========================================================================
  // INTEGRATION WITH EPIC 3
  // ========================================================================

  describe('Epic 3 Integration', () => {
    it('should handle realistic Epic 3 RuleSuggestion[] output', () => {
      const epic3Output = createEpic3Output();

      const result = manager.presentForReview(epic3Output);

      // Verify all changes are displayed
      expect(result).toContain('**Total Changes:** 3');

      // Verify pattern context is shown
      expect(result).toContain('### Pattern Source');
      expect(result).toContain('**Frequency:**');

      // Verify change types are correct
      expect(result).toContain('[NEW] **NEW RULE**');
      expect(result).toContain('[MOD] **MODIFICATION**');
      expect(result).toContain('[ADD] **ADDITION**');

      // Verify before/after for modifications
      expect(result).toContain('### Comparison');
      expect(result).toContain('**Before:**');
      expect(result).toContain('**After:**');
    });

    it('should handle all RuleProposalType values', () => {
      const changes: RuleSuggestion[] = [
        createRealisticRuleSuggestion({
          id: 'rule-1',
          type: RuleProposalType.NEW_RULE,
        }),
        createRealisticRuleSuggestion({
          id: 'rule-2',
          type: RuleProposalType.MODIFICATION,
          beforeAfter: {
            before: 'Old rule',
            after: 'New rule',
            changes: [],
          },
        }),
        createRealisticRuleSuggestion({
          id: 'rule-3',
          type: RuleProposalType.ADDITION,
        }),
      ];

      const result = manager.presentForReview(changes);

      expect(result).toContain('[NEW] **NEW RULE**');
      expect(result).toContain('[MOD] **MODIFICATION**');
      expect(result).toContain('[ADD] **ADDITION**');
    });

    it('should handle various confidence levels', () => {
      const changes: RuleSuggestion[] = [
        createRealisticRuleSuggestion({
          id: 'rule-1',
          confidence: 0.95,
        }),
        createRealisticRuleSuggestion({
          id: 'rule-2',
          confidence: 0.5,
        }),
        createRealisticRuleSuggestion({
          id: 'rule-3',
          confidence: 0.3,
        }),
      ];

      const result = manager.presentForReview(changes);

      expect(result).toContain('**Confidence:** **High** (95%)');
      expect(result).toContain('**Confidence:** **Medium** (50%)');
      expect(result).toContain('**Confidence:** **Low** (30%)');
    });

    it('should handle various PatternCategory values', () => {
      const categories = [
        PatternCategory.CODE_STYLE,
        PatternCategory.TERMINOLOGY,
        PatternCategory.STRUCTURE,
        PatternCategory.BEST_PRACTICE,
      ];

      const changes = categories.map((cat, i) =>
        createRealisticRuleSuggestion({
          id: `rule-${i}`,
          pattern: createRealisticPattern({ category: cat }),
        })
      );

      const result = manager.presentForReview(changes);

      expect(result).toContain('CODE_STYLE');
      expect(result).toContain('TERMINOLOGY');
      expect(result).toContain('STRUCTURE');
      expect(result).toContain('BEST_PRACTICE');
    });
  });

  // ========================================================================
  // AUDIT TRAIL
  // ========================================================================

  describe('Audit Trail', () => {
    it('should log all review actions', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      manager.makeDecision(DecisionType.APPROVED);
      manager.navigateNext();
      manager.makeDecision(DecisionType.REJECTED);

      const sessionId = manager.getSessionId();
      const history = auditLogger.getSessionHistory(sessionId);

      expect(history.length).toBeGreaterThan(0);

      // Check for decision logs
      const decisionLogs = history.filter(h => h.decision);
      expect(decisionLogs.length).toBeGreaterThanOrEqual(2);

      // Check for navigation logs
      const navLogs = history.filter(h => h.action.includes('→'));
      expect(navLogs.length).toBeGreaterThan(0);
    });

    it('should track performance metrics', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      manager.makeDecision(DecisionType.APPROVED);

      const sessionId = manager.getSessionId();
      const metrics = auditLogger.getPerformanceMetrics(sessionId);

      expect(metrics.totalActions).toBeGreaterThan(0);
    });

    it('should export audit log', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      manager.makeDecision(DecisionType.APPROVED);

      const sessionId = manager.getSessionId();
      const exportPath = path.join(tempDir, 'audit-export.json');

      const success = auditLogger.exportSessionLog(sessionId, exportPath);

      expect(success).toBe(true);
      expect(fs.existsSync(exportPath)).toBe(true);

      const content = fs.readFileSync(exportPath, 'utf-8');
      expect(content).toContain(sessionId);
    });
  });

  // ========================================================================
  // ERROR RECOVERY
  // ========================================================================

  describe('Error Recovery', () => {
    it('should recover from invalid navigation commands', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Try invalid navigation
      let result = manager.navigateToChange(99);
      expect(result).toContain('**Invalid change number**');

      // Verify session is still functional
      result = manager.navigateToChange(1);
      expect(result).toContain('## Change #1 of 3');
    });

    it('should recover from rate limiting', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      // Trigger rate limit
      const result1 = manager.navigateNext();
      const result2 = manager.navigateNext();

      expect(result2).toContain('**Rate limit exceeded**');

      // Wait and try again
      const startTime = Date.now();
      while (Date.now() - startTime < 150) {
        // Busy wait
      }

      const result3 = manager.navigateNext();
      expect(result3).not.toContain('**Rate limit exceeded**');
    });

    it('should handle malformed imported state', () => {
      const result = manager.importReviewState('not valid json');

      expect(result).toBe(false);

      // Verify manager is still functional
      const changes = createEpic3Output();
      const output = manager.presentForReview(changes);
      expect(output).toContain('# Review Summary');
    });
  });

  // ========================================================================
  // SECURITY IN CONTEXT
  // ========================================================================

  describe('Security in Context', () => {
    it('should sanitize malicious content in Epic 3 output', () => {
      const maliciousChanges: RuleSuggestion[] = [
        createRealisticRuleSuggestion({
          id: 'rule-1',
          ruleText: '<script>alert("XSS")</script>Rule text',
          explanation: '<img src=x onerror=alert(1)>Explanation',
        }),
      ];

      const result = manager.presentForReview(maliciousChanges);

      expect(result).not.toContain('<script>');
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('javascript:');
    });

    it('should prevent path traversal in session IDs', () => {
      const result = manager.resumeSession('../../../etc/passwd');

      expect(result).toContain('**Invalid session ID format**');
    });

    it('should validate imported state integrity', () => {
      const changes = createEpic3Output();
      manager.presentForReview(changes);

      const exported = manager.exportReviewState();
      const tampered = exported.replace('"sessionId"', '"sessionId":"hacked"');

      const result = manager.importReviewState(tampered);

      // Should handle gracefully
      expect(result).toBeDefined();
    });
  });

  // ========================================================================
  // PERFORMANCE
  // ========================================================================

  describe('Performance', () => {
    it('should handle large change sets efficiently', () => {
      const changes = Array.from({ length: 50 }, (_, i) =>
        createRealisticRuleSuggestion({ id: `rule-${i}` })
      );

      const startTime = Date.now();
      const result = manager.presentForReview(changes);
      const elapsed = Date.now() - startTime;

      expect(result).toContain('**Total Changes:** 50');
      expect(elapsed).toBeLessThan(2000); // Should complete in <2 seconds
    });

    it('should paginate large change sets', () => {
      const changes = Array.from({ length: 100 }, (_, i) =>
        createRealisticRuleSuggestion({ id: `rule-${i}` })
      );

      manager.presentForReview(changes);

      const result = manager.showAllChanges(1);

      expect(result).toContain('**Page 1 of');
      expect(result).not.toContain('## Change #50');
    });
  });
});
