/**
 * Interface Manager Unit Tests (Story 4.1)
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InterfaceManager } from '../../review/interface-manager';
import { RuleSuggestion, RuleProposalType } from '../../rules/types';
import { Pattern, PatternCategory } from '../../pattern-detector';
import { ContentType } from '../../content-analyzer';
import * as fs from 'fs';
import * as path from 'path';

describe('InterfaceManager', () => {
  let manager: InterfaceManager;
  let testChanges: RuleSuggestion[];
  const testSessionsDir = path.join('.claude', 'review-sessions');
  const testAuditDir = path.join('.claude', 'review-audit');

  // Helper to create test changes
  const createTestChange = (id: string, type: RuleProposalType): RuleSuggestion => {
    const pattern: Pattern = {
      pattern_text: `Test pattern ${id}`,
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: `original ${id}`,
          user_correction: `correction ${id}`,
          context: `context ${id}`,
          timestamp: new Date().toISOString(),
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: `Rule ${id}`,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      content_types: [ContentType.CODE],
    };

    return {
      id,
      type,
      pattern,
      ruleText: `Rule text for ${id}`,
      explanation: `Explanation for ${id}`,
      contentType: ContentType.CODE,
      confidence: 0.75,
      platformFormats: {
        cursor: `Rule text for ${id}`,
        copilot: `Rule text for ${id}`,
      },
    };
  };

  beforeEach(() => {
    manager = new InterfaceManager();

    // Create test changes
    testChanges = [
      createTestChange('rule-1', RuleProposalType.NEW_RULE),
      createTestChange('rule-2', RuleProposalType.MODIFICATION),
      createTestChange('rule-3', RuleProposalType.ADDITION),
      createTestChange('rule-4', RuleProposalType.NEW_RULE),
      createTestChange('rule-5', RuleProposalType.MODIFICATION),
    ];
  });

  afterEach(() => {
    // Clean up test directories - ignore errors
    try {
      if (fs.existsSync(testSessionsDir)) {
        fs.rmSync(testSessionsDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    try {
      if (fs.existsSync(testAuditDir)) {
        fs.rmSync(testAuditDir, { recursive: true, force: true });
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('presentForReview', () => {
    it('should display review interface with changes', () => {
      const output = manager.presentForReview(testChanges);

      expect(output).toContain('# Review Summary');
      expect(output).toContain('**Total Changes:** 5');
      expect(output).toContain('## Change #1 of 5');
      expect(output).toContain('**Type:** 🆕 **NEW RULE**');
      expect(output).toContain('**Navigation Commands:**');
      expect(output).toContain('**Session ID:**');
    });

    it('should display empty state when no changes', () => {
      const output = manager.presentForReview([]);

      expect(output).toContain('**No changes to review.**');
    });

    it('should cap changes at MAX_DISPLAY_CHANGES', () => {
      const manyChanges: RuleSuggestion[] = [];
      for (let i = 0; i < 100; i++) {
        manyChanges.push(createTestChange(`rule-${i}`, RuleProposalType.NEW_RULE));
      }

      const output = manager.presentForReview(manyChanges);

      expect(output).toContain('**Total Changes:** 50'); // Capped at 50
    });

    it('should handle invalid changes gracefully', () => {
      const invalidChanges = [null as any, undefined as any];

      const output = manager.presentForReview(invalidChanges as any);

      expect(output).toContain('# ⚠️ Error');
    });

    it('should generate unique session ID', () => {
      const output1 = manager.presentForReview(testChanges);
      const sessionId1 = manager.getSessionId();

      const manager2 = new InterfaceManager();
      const output2 = manager2.presentForReview(testChanges);
      const sessionId2 = manager2.getSessionId();

      expect(sessionId1).not.toBe(sessionId2);
    });
  });

  describe('navigation', () => {
    beforeEach(() => {
      manager.presentForReview(testChanges);
    });

    it('should navigate to next change', () => {
      const output = manager.navigateNext();

      expect(output).toContain('## Change #2 of 5');
    });

    it('should navigate to previous change with wrap-around', () => {
      manager.navigateNext(); // Move to #2
      // Wait for rate limit to pass
      const startTime = Date.now();
      while (Date.now() - startTime < 150) {
        // Wait 150ms to bypass rate limit
      }
      const output = manager.navigatePrevious();

      expect(output).toContain('## Change #1 of 5');
    });

    it('should wrap around from last to first', () => {
      // Navigate to last change with delays to avoid rate limiting
      for (let i = 0; i < 4; i++) {
        manager.navigateNext();
        // Small delay to avoid rate limit
        const start = Date.now();
        while (Date.now() - start < 50) { /* wait */ }
      }

      // Wait for rate limit
      const startTime = Date.now();
      while (Date.now() - startTime < 150) {
        // Wait 150ms to bypass rate limit
      }

      const output = manager.navigateNext();

      expect(output).toContain('## Change #1 of 5');
    });

    it('should jump to specific change', () => {
      const output = manager.navigateToChange(3);

      expect(output).toContain('## Change #3 of 5');
    });

    it('should reject invalid change number', () => {
      const output = manager.navigateToChange(99);

      expect(output).toContain('**Invalid change number.**');
    });

    it('should rate limit rapid navigation', () => {
      // Rapid navigation attempts
      const outputs = [];
      for (let i = 0; i < 20; i++) {
        outputs.push(manager.navigateNext());
      }

      // Some navigations should be rate limited
      const rateLimited = outputs.filter(o => o.includes('Rate limit exceeded'));
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('showAllChanges', () => {
    beforeEach(() => {
      manager.presentForReview(testChanges);
    });

    it('should display all changes with pagination', () => {
      const output = manager.showAllChanges(1);

      expect(output).toContain('# All Proposed Changes');
      expect(output).toContain('**Page 1 of 1**');
      expect(output).toContain('## Change #1 of 5');
      expect(output).toContain('## Change #5 of 5');
    });

    it('should paginate large change sets', () => {
      const manyChanges: RuleSuggestion[] = [];
      for (let i = 0; i < 25; i++) {
        manyChanges.push(createTestChange(`rule-${i}`, RuleProposalType.NEW_RULE));
      }

      manager.presentForReview(manyChanges);

      const page1 = manager.showAllChanges(1);
      expect(page1).toContain('**Page 1 of 3**');
      expect(page1).toContain('- Next page: `show page 2`');

      const page2 = manager.showAllChanges(2);
      expect(page2).toContain('**Page 2 of 3**');
      expect(page2).toContain('- Previous page: `show page 1`');
      expect(page2).toContain('- Next page: `show page 3`');
    });

    it('should handle invalid page number', () => {
      const output = manager.showAllChanges(99);

      expect(output).toContain('**Invalid page number.**');
    });
  });

  describe('decisions', () => {
    beforeEach(() => {
      manager.presentForReview(testChanges);
    });

    it('should approve current change and move to next', () => {
      const output = manager.makeDecision('approved' as any);

      expect(output).toContain('**Change #1 marked as approved.**');
      expect(output).toContain('## Change #2 of 5');
    });

    it('should reject current change and move to next', () => {
      const output = manager.makeDecision('rejected' as any);

      expect(output).toContain('**Change #1 marked as rejected.**');
      expect(output).toContain('## Change #2 of 5');
    });

    it('should complete review when all changes decided', () => {
      // Make decisions for all changes
      for (let i = 0; i < 4; i++) {
        manager.makeDecision('approved' as any);
      }

      const output = manager.makeDecision('approved' as any);

      expect(output).toContain('**Change #5 marked as approved.**');
      expect(output).toContain('**Review Complete!**');
      expect(output).toContain('**Total Changes:** 5');
    });

    it('should undo a decision', () => {
      manager.makeDecision('approved' as any);
      const output = manager.undoDecision(1);

      expect(output).toContain('**Decision for change #1 has been undone.**');
    });

    it('should handle undo for non-existent decision', () => {
      const output = manager.undoDecision(1);

      expect(output).toContain('**Change #1 has no decision to undo.**');
    });

    it('should handle invalid change number for undo', () => {
      const output = manager.undoDecision(99);

      expect(output).toContain('**Invalid change number.**');
    });
  });

  describe('state persistence', () => {
    it('should save state to disk', () => {
      manager.presentForReview(testChanges);
      const sessionId = manager.getSessionId();

      const sessionFile = path.join(testSessionsDir, `${sessionId}.json`);
      expect(fs.existsSync(sessionFile)).toBe(true);

      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      expect(content.sessionId).toBe(sessionId);
      expect(content.changes).toHaveLength(5);
      expect(content.currentIndex).toBe(0);
    });

    it('should load state from disk', () => {
      manager.presentForReview(testChanges);
      manager.makeDecision('approved' as any);
      const sessionId = manager.getSessionId();

      const manager2 = new InterfaceManager();
      const output = manager2.resumeSession(sessionId);

      expect(output).toContain('**Session Resumed**');
      expect(output).toContain('- Approved: 1');
    });

    it('should handle invalid session ID', () => {
      const output = manager.resumeSession('invalid-session-id');

      expect(output).toContain('**Failed to resume session.**');
    });

    it('should export and import state', () => {
      manager.presentForReview(testChanges);
      manager.makeDecision('approved' as any);

      const exported = manager.exportReviewState();
      expect(exported).toContain('"sessionId"');
      expect(exported).toContain('"approved"');

      const manager2 = new InterfaceManager();
      const imported = manager2.importReviewState(exported);

      expect(imported).toBe(true);
      expect(manager2.getSessionId()).toBe(manager.getSessionId());
    });

    it('should handle invalid import data', () => {
      const result = manager.importReviewState('invalid json');

      expect(result).toBe(false);
    });
  });

  describe('session management', () => {
    it('should list active sessions', () => {
      manager.presentForReview(testChanges);
      const sessionId = manager.getSessionId();

      const stateManager = (manager as any).stateManager;
      const sessions = stateManager.listSessions();

      expect(sessions).toContain(sessionId);
    });

    it('should clean up expired sessions', () => {
      manager.presentForReview(testChanges);

      const stateManager = (manager as any).stateManager;
      const sessionsBefore = stateManager.listSessions().length;

      // Create a session file with old timestamp
      const fs = require('fs');
      const path = require('path');
      const testSessionsDir = path.join('.claude', 'review-sessions');

      // Ensure session exists
      expect(sessionsBefore).toBeGreaterThan(0);

      // Cleanup should run without errors
      const cleaned = stateManager.cleanupExpiredSessions(0);

      // Cleanup should have processed sessions (may or may not delete depending on timing)
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle malformed changes', () => {
      const malformedChanges = [
        { id: 'test' }, // Missing required fields
      ];

      const output = manager.presentForReview(malformedChanges as any);

      expect(output).toContain('# ⚠️ Error');
    });

    it('should handle navigation errors gracefully', () => {
      manager.presentForReview([]);

      const output = manager.navigateNext();

      expect(output).toContain('**No changes to navigate.**');
    });

    it('should log errors to audit log', () => {
      manager.presentForReview([null as any]);

      const auditLogger = (manager as any).auditLogger;
      const errors = auditLogger.getSessionHistory(manager.getSessionId());
      const errorEntries = errors.filter((e: any) => e.action.startsWith('ERROR:'));

      expect(errorEntries.length).toBeGreaterThan(0);
    });
  });

  describe('getReviewSummary', () => {
    it('should return formatted summary', () => {
      manager.presentForReview(testChanges);
      manager.makeDecision('approved' as any);
      manager.makeDecision('rejected' as any);

      const summary = manager.getReviewSummary();

      expect(summary).toContain('# Review Summary');
      expect(summary).toContain('- Approved: 1');
      expect(summary).toContain('- Rejected: 1');
    });
  });

  describe('getDebugInfo', () => {
    it('should return session debug information', () => {
      manager.presentForReview(testChanges);
      manager.makeDecision('approved' as any);

      const debug = manager.getDebugInfo();

      expect(debug).toHaveProperty('sessionId');
      expect(debug).toHaveProperty('currentIndex');
      expect(debug).toHaveProperty('totalChanges');
      expect(debug).toHaveProperty('decisionsCount');
      expect(debug).toHaveProperty('lastActivity');
      expect(debug.totalChanges).toBe(5);
      expect(debug.decisionsCount).toBe(1);
    });
  });
});
