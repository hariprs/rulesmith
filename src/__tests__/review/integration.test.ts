/**
 * Integration Tests (Story 4.1)
 *
 * Tests integration with Epic 3 rule generation
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { InterfaceManager } from '../../review/interface-manager';
import { RuleGenerator } from '../../rules/rule-generator';
import { Pattern, PatternCategory } from '../../pattern-detector';
import { ContentType } from '../../content-analyzer';
import { ContentAnalyzedCorrection } from '../../content-analyzer';
import * as fs from 'fs';
import * as path from 'path';

describe('Integration Tests', () => {
  let manager: InterfaceManager;
  let generator: RuleGenerator;
  const testSessionsDir = path.join('.claude', 'review-sessions');
  const testAuditDir = path.join('.claude', 'review-audit');

  beforeEach(() => {
    manager = new InterfaceManager();
    generator = new RuleGenerator();
  });

  afterEach(() => {
    // Clean up test directories
    if (fs.existsSync(testSessionsDir)) {
      fs.rmSync(testSessionsDir, { recursive: true, force: true });
    }
    if (fs.existsSync(testAuditDir)) {
      fs.rmSync(testAuditDir, { recursive: true, force: true });
    }
  });

  describe('Epic 3 Integration', () => {
    it('should display rules generated from Epic 3', () => {
      // Create test patterns
      const patterns: Pattern[] = [
        {
          pattern_text: 'Use camelCase for variables',
          count: 3,
          category: PatternCategory.CODE_STYLE,
          examples: [
            {
              original_suggestion: 'my_variable',
              user_correction: 'myVariable',
              context: 'Variable naming',
              timestamp: new Date().toISOString(),
              content_type: ContentType.CODE,
            },
          ],
          suggested_rule: 'Use camelCase for variables',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
        {
          pattern_text: 'Use async/await instead of callbacks',
          count: 5,
          category: PatternCategory.CONVENTION,
          examples: [
            {
              original_suggestion: 'function(err, result)',
              user_correction: 'async function()',
              context: 'Async pattern',
              timestamp: new Date().toISOString(),
              content_type: ContentType.CODE,
            },
          ],
          suggested_rule: 'Use async/await instead of callbacks',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
      ];

      // Generate rules
      const result = generator.generateRules(patterns);

      expect(result.totalRules).toBe(2);
      expect(result.rules).toHaveLength(2);

      // Display in review interface
      const output = manager.presentForReview(result.rules);

      expect(output).toContain('# Review Summary');
      expect(output).toContain('**Total Changes:** 2');
      expect(output).toContain('## Change #1 of 2');
      expect(output).toContain('Use camelCase for variables');
      expect(output).toContain('## Change #2 of 2');
      expect(output).toContain('Use async/await instead of callbacks');
    });

    it('should handle modifications with existing rules', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Use tabs instead of spaces for indentation',
          count: 4,
          category: PatternCategory.FORMATTING,
          examples: [],
          suggested_rule: 'Use tabs instead of spaces',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
      ];

      const existingRules = [
        {
          id: 'indentation-rule',
          text: 'Use 2 spaces for indentation',
          platform: 'cursor' as const,
          contentType: ContentType.CODE,
        },
      ];

      const result = generator.generateRules(patterns, existingRules);

      expect(result.rules[0].type).toBe('modification' as any);

      const output = manager.presentForReview(result.rules);

      expect(output).toContain('✏️ **MODIFICATION**');
      expect(output).toContain('**Before:**');
      expect(output).toContain('**After:**');
    });
  });

  describe('End-to-End Workflow', () => {
    it('should complete full review workflow', () => {
      // Create patterns
      const patterns: Pattern[] = [
        {
          pattern_text: 'Use kebab-case for file names',
          count: 3,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Use kebab-case for file names',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
        {
          pattern_text: 'Add JSDoc comments to functions',
          count: 2,
          category: PatternCategory.CONVENTION,
          examples: [],
          suggested_rule: 'Add JSDoc comments to functions',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
        {
          pattern_text: 'Use const instead of let for constants',
          count: 4,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Use const instead of let for constants',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.CODE],
        },
      ];

      // Generate rules
      const result = generator.generateRules(patterns);

      // Present for review
      let output = manager.presentForReview(result.rules);
      expect(output).toContain('## Change #1 of 3');

      // Review first rule
      output = manager.makeDecision('approved' as any);
      expect(output).toContain('**Change #1 marked as approved.**');
      expect(output).toContain('## Change #2 of 3');

      // Review second rule
      output = manager.makeDecision('rejected' as any);
      expect(output).toContain('**Change #2 marked as rejected.**');
      expect(output).toContain('## Change #3 of 3');

      // Review third rule
      output = manager.makeDecision('approved' as any);
      expect(output).toContain('**Change #3 marked as approved.**');
      expect(output).toContain('**Review Complete!**');

      // Check summary
      const summary = manager.getReviewSummary();
      expect(summary).toContain('- Approved: 2');
      expect(summary).toContain('- Rejected: 1');
      expect(summary).toContain('**Progress:** 100% complete');
    });

    it('should handle navigation and decisions in any order', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Rule 1',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Rule 1',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
        {
          pattern_text: 'Rule 2',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Rule 2',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
        {
          pattern_text: 'Rule 3',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Rule 3',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);

      // Navigate out of order
      manager.navigateToChange(3);
      let output = manager.makeDecision('approved' as any);
      expect(output).toContain('**Change #3 marked as approved.**');

      manager.navigateToChange(1);
      output = manager.makeDecision('approved' as any);
      expect(output).toContain('**Change #1 marked as approved.**');

      manager.navigateToChange(2);
      output = manager.makeDecision('rejected' as any);
      expect(output).toContain('**Change #2 marked as rejected.**');
    });

    it('should support undo and resume', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Test rule',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);

      // Make a decision
      manager.makeDecision('approved' as any);

      // Undo it
      let output = manager.undoDecision(1);
      expect(output).toContain('**Decision for change #1 has been undone.**');

      // Make a different decision
      output = manager.makeDecision('rejected' as any);
      expect(output).toContain('**Change #1 marked as rejected.**');

      // Export and resume
      const exported = manager.exportReviewState();

      const manager2 = new InterfaceManager();
      const imported = manager2.importReviewState(exported);
      expect(imported).toBe(true);

      const summary = manager2.getReviewSummary();
      expect(summary).toContain('- Rejected: 1');
    });
  });

  describe('Performance Tests', () => {
    it('should handle 100 changes efficiently', () => {
      const patterns: Pattern[] = [];
      for (let i = 0; i < 100; i++) {
        patterns.push({
          pattern_text: `Rule ${i}`,
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: `Rule ${i}`,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        });
      }

      const startTime = Date.now();
      const result = generator.generateRules(patterns);
      const output = manager.presentForReview(result.rules);
      const endTime = Date.now();

      const processingTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(processingTime).toBeLessThan(5000);
      expect(output).toContain('**Total Changes:** 50'); // Capped at 50
    });

    it('should paginate large change sets', () => {
      const patterns: Pattern[] = [];
      for (let i = 0; i < 50; i++) {
        patterns.push({
          pattern_text: `Rule ${i}`,
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: `Rule ${i}`,
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        });
      }

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);

      // Page 1
      let output = manager.showAllChanges(1);
      expect(output).toContain('**Page 1 of 5**');
      expect(output).toContain('## Change #1 of 50');

      // Page 3
      output = manager.showAllChanges(3);
      expect(output).toContain('**Page 3 of 5**');
    });
  });

  describe('Error Recovery', () => {
    it('should continue after individual change errors', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Valid rule',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Valid rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);

      // Corrupt one change
      result.rules.push(null as any);

      const output = manager.presentForReview(result.rules as any);

      // Should still display valid changes
      expect(output).toContain('## Change #1 of 1');
    });

    it('should handle session corruption gracefully', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Test rule',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);

      const sessionId = manager.getSessionId();

      // Corrupt session file
      const sessionFile = path.join(testSessionsDir, `${sessionId}.json`);
      if (fs.existsSync(sessionFile)) {
        fs.writeFileSync(sessionFile, 'corrupted data', 'utf-8');
      }

      // Attempt to resume
      const output = manager.resumeSession(sessionId);
      expect(output).toContain('**Failed to resume session.**');
    });
  });

  describe('Audit Trail', () => {
    it('should log all decisions', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Test rule',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);
      const sessionId = manager.getSessionId();

      // Make decisions
      manager.makeDecision('approved' as any);

      // Check audit log
      const auditLogger = (manager as any).auditLogger;
      const history = auditLogger.getSessionHistory(sessionId);

      expect(history.length).toBeGreaterThan(0);
      const decisionEntries = history.filter((e: any) => e.action === 'make_decision');
      expect(decisionEntries.length).toBeGreaterThan(0);
    });

    it('should track performance metrics', () => {
      const patterns: Pattern[] = [
        {
          pattern_text: 'Test rule',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: new Date().toISOString(),
          last_seen: new Date().toISOString(),
          content_types: [ContentType.GENERAL_TEXT],
        },
      ];

      const result = generator.generateRules(patterns);
      manager.presentForReview(result.rules);
      const sessionId = manager.getSessionId();

      // Make decisions
      manager.makeDecision('approved' as any);

      // Get performance metrics
      const auditLogger = (manager as any).auditLogger;
      const metrics = auditLogger.getPerformanceMetrics(sessionId);

      expect(metrics.totalActions).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
    });
  });
});
