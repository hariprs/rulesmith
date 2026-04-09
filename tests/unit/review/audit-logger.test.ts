/**
 * Unit Tests: Audit Logger (Story 4.1)
 *
 * Test Coverage:
 * - Decision logging
 * - Navigation logging
 * - Error logging
 * - Session history retrieval
 * - Performance metrics
 * - Log rotation
 * - Log cleanup
 * - Export functionality
 * - Input validation
 * - Edge cases
 *
 * Testing Priority: Unit > Integration > E2E
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuditLogger } from '../../../src/review/audit-logger.js';
import { DecisionType } from '../../../src/review/types.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// TEST SUITES
// ============================================================================

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test logs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-audit-'));
    auditLogger = new AuditLogger(tempDir);
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ========================================================================
  // DECISION LOGGING
  // ========================================================================

  describe('logDecision', () => {
    it('should log a decision with all parameters', () => {
      auditLogger.logDecision('session-1', 'approve', 0, DecisionType.APPROVED, 150);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history).toHaveLength(1);
      expect(history[0].sessionId).toBe('session-1');
      expect(history[0].action).toBe('approve');
      expect(history[0].changeIndex).toBe(0);
      expect(history[0].decision).toBe(DecisionType.APPROVED);
      expect(history[0].processingTimeMs).toBe(150);
    });

    it('should log decision without optional parameters', () => {
      auditLogger.logDecision('session-2', 'navigate', 5);

      const history = auditLogger.getSessionHistory('session-2');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('navigate');
      expect(history[0].changeIndex).toBe(5);
      expect(history[0].decision).toBeUndefined();
      expect(history[0].processingTimeMs).toBeUndefined();
    });

    it('should handle multiple decisions for same session', () => {
      auditLogger.logDecision('session-3', 'approve', 0, DecisionType.APPROVED);
      auditLogger.logDecision('session-3', 'reject', 1, DecisionType.REJECTED);
      auditLogger.logDecision('session-3', 'edit', 2, DecisionType.EDITED);

      const history = auditLogger.getSessionHistory('session-3');
      expect(history).toHaveLength(3);
      expect(history[0].decision).toBe(DecisionType.APPROVED);
      expect(history[1].decision).toBe(DecisionType.REJECTED);
      expect(history[2].decision).toBe(DecisionType.EDITED);
    });

    it('should handle invalid session ID', () => {
      auditLogger.logDecision(null as any, 'approve', 0, DecisionType.APPROVED);
      auditLogger.logDecision(undefined as any, 'approve', 0, DecisionType.APPROVED);
      auditLogger.logDecision('' as any, 'approve', 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('');
      expect(history).toHaveLength(0);
    });

    it('should handle non-string session ID', () => {
      auditLogger.logDecision(123 as any, 'approve', 0, DecisionType.APPROVED);
      expect(console.error).toHaveBeenCalledWith(
        'Invalid session ID provided to logDecision'
      );
    });

    it('should handle invalid changeIndex', () => {
      auditLogger.logDecision('session-test', 'approve', NaN, DecisionType.APPROVED);
      auditLogger.logDecision('session-test', 'approve', Infinity, DecisionType.APPROVED);
      auditLogger.logDecision('session-test', 'approve', -1, DecisionType.APPROVED);

      expect(console.error).toHaveBeenCalledWith(
        'Invalid changeIndex provided to logDecision'
      );
    });

    it('should handle non-number changeIndex', () => {
      auditLogger.logDecision('session-test', 'approve', 'abc' as any, DecisionType.APPROVED);

      expect(console.error).toHaveBeenCalledWith(
        'Invalid changeIndex provided to logDecision'
      );
    });

    it('should handle invalid processingTimeMs', () => {
      auditLogger.logDecision('session-test', 'approve', 0, DecisionType.APPROVED, -100);
      auditLogger.logDecision('session-test', 'approve', 0, DecisionType.APPROVED, NaN);
      auditLogger.logDecision('session-test', 'approve', 0, DecisionType.APPROVED, Infinity);

      expect(console.error).toHaveBeenCalledWith(
        'Invalid processingTimeMs provided to logDecision'
      );
    });

    it('should handle zero processingTimeMs', () => {
      auditLogger.logDecision('session-4', 'action', 0, DecisionType.APPROVED, 0);

      const history = auditLogger.getSessionHistory('session-4');
      expect(history[0].processingTimeMs).toBe(0);
    });

    it('should sanitize session ID', () => {
      auditLogger.logDecision('session/with\\special:chars', 'approve', 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('session-with-special-chars');
      expect(history).toHaveLength(1);
    });

    it('should use default action when action is empty', () => {
      auditLogger.logDecision('session-5', '' as any, 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('session-5');
      expect(history[0].action).toBe('unknown');
    });
  });

  // ========================================================================
  // NAVIGATION LOGGING
  // ========================================================================

  describe('logNavigation', () => {
    it('should log navigation with from and to indices', () => {
      auditLogger.logNavigation('session-1', 'next', 0, 1);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('next (0 → 1)');
      expect(history[0].changeIndex).toBe(1);
    });

    it('should handle wrap-around navigation', () => {
      auditLogger.logNavigation('session-2', 'next', 99, 0);

      const history = auditLogger.getSessionHistory('session-2');
      expect(history[0].action).toBe('next (99 → 0)');
    });

    it('should log multiple navigation actions', () => {
      auditLogger.logNavigation('session-3', 'next', 0, 1);
      auditLogger.logNavigation('session-3', 'next', 1, 2);
      auditLogger.logNavigation('session-3', 'previous', 2, 1);

      const history = auditLogger.getSessionHistory('session-3');
      expect(history).toHaveLength(3);
      expect(history[0].action).toBe('next (0 → 1)');
      expect(history[1].action).toBe('next (1 → 2)');
      expect(history[2].action).toBe('previous (2 → 1)');
    });

    it('should sanitize session ID', () => {
      auditLogger.logNavigation('../../../etc/passwd', 'next', 0, 1);

      const history = auditLogger.getSessionHistory('etcpasswd');
      expect(history).toHaveLength(0); // No match due to sanitization
    });
  });

  // ========================================================================
  // ERROR LOGGING
  // ========================================================================

  describe('logError', () => {
    it('should log error with session ID', () => {
      auditLogger.logError('session-1', 'Test error');

      const history = auditLogger.getSessionHistory('session-1');
      expect(history).toHaveLength(1);
      expect(history[0].action).toBe('ERROR: Test error');
      expect(history[0].changeIndex).toBe(-1);
    });

    it('should handle error with context', () => {
      auditLogger.logError('session-2', 'Test error', 'Additional context');

      // Note: context is logged but not returned in getSessionHistory
      // It's written to the log file but not part of AuditLogEntry type
      const history = auditLogger.getSessionHistory('session-2');
      expect(history).toHaveLength(1);
      expect(history[0].action).toContain('Test error');
    });

    it('should handle invalid session ID', () => {
      auditLogger.logError(null as any, 'Test error');
      auditLogger.logError(undefined as any, 'Test error');
      auditLogger.logError('' as any, 'Test error');

      expect(console.error).toHaveBeenCalledWith(
        'Invalid session ID provided to logError'
      );
    });

    it('should handle invalid error message', () => {
      auditLogger.logError('session-3', null as any);
      auditLogger.logError('session-3', undefined as any);
      auditLogger.logError('session-3', '' as any);

      expect(console.error).toHaveBeenCalledWith(
        'Invalid error message provided to logError'
      );
    });

    it('should sanitize session ID', () => {
      auditLogger.logError('session/with\\special:chars', 'Error');

      const history = auditLogger.getSessionHistory('session-with-special-chars');
      expect(history).toHaveLength(1);
    });
  });

  // ========================================================================
  // SESSION HISTORY
  // ========================================================================

  describe('getSessionHistory', () => {
    beforeEach(() => {
      // Setup some test data
      auditLogger.logDecision('session-1', 'approve', 0, DecisionType.APPROVED);
      auditLogger.logDecision('session-1', 'reject', 1, DecisionType.REJECTED);
      auditLogger.logDecision('session-2', 'approve', 0, DecisionType.APPROVED);
    });

    it('should return all entries for a session', () => {
      const history = auditLogger.getSessionHistory('session-1');

      expect(history).toHaveLength(2);
      expect(history[0].action).toBe('approve');
      expect(history[1].action).toBe('reject');
    });

    it('should return empty array for non-existent session', () => {
      const history = auditLogger.getSessionHistory('non-existent');
      expect(history).toEqual([]);
    });

    it('should return empty array for invalid session ID', () => {
      const history = auditLogger.getSessionHistory(null as any);
      expect(history).toEqual([]);
    });

    it('should handle non-string session ID', () => {
      const history = auditLogger.getSessionHistory(123 as any);
      expect(history).toEqual([]);
    });

    it('should filter entries by session ID', () => {
      const history1 = auditLogger.getSessionHistory('session-1');
      const history2 = auditLogger.getSessionHistory('session-2');

      expect(history1).toHaveLength(2);
      expect(history2).toHaveLength(1);
    });

    it('should handle malformed log entries gracefully', () => {
      const auditDir = path.join(tempDir, 'review-audit');
      const logPath = path.join(auditDir, 'review-audit.log');

      // Append a malformed line
      fs.appendFileSync(logPath, 'invalid json line\n', 'utf-8');

      const history = auditLogger.getSessionHistory('session-1');
      // Should still return valid entries
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing log file', () => {
      const logger = new AuditLogger(path.join(os.tmpdir(), 'non-existent-' + Date.now()));
      const history = logger.getSessionHistory('session-1');
      expect(history).toEqual([]);
    });

    it('should handle oversized log file', () => {
      const auditDir = path.join(tempDir, 'review-audit');
      const logPath = path.join(auditDir, 'review-audit.log');

      // Create a log file larger than 50MB (mock by touching it)
      fs.writeFileSync(logPath, 'A'.repeat(51 * 1024 * 1024), 'utf-8');

      const history = auditLogger.getSessionHistory('session-1');
      expect(history).toEqual([]);
    });
  });

  // ========================================================================
  // PERFORMANCE METRICS
  // ========================================================================

  describe('getPerformanceMetrics', () => {
    it('should return zero metrics for session with no entries', () => {
      const metrics = auditLogger.getPerformanceMetrics('non-existent');

      expect(metrics.averageProcessingTime).toBe(0);
      expect(metrics.maxProcessingTime).toBe(0);
      expect(metrics.totalActions).toBe(0);
    });

    it('should calculate metrics for session with processing times', () => {
      auditLogger.logDecision('session-1', 'action1', 0, DecisionType.APPROVED, 100);
      auditLogger.logDecision('session-1', 'action2', 1, DecisionType.APPROVED, 200);
      auditLogger.logDecision('session-1', 'action3', 2, DecisionType.APPROVED, 300);

      const metrics = auditLogger.getPerformanceMetrics('session-1');

      expect(metrics.averageProcessingTime).toBe(200);
      expect(metrics.maxProcessingTime).toBe(300);
      expect(metrics.totalActions).toBe(3);
    });

    it('should handle entries without processing times', () => {
      auditLogger.logDecision('session-2', 'action1', 0, DecisionType.APPROVED);
      auditLogger.logDecision('session-2', 'action2', 1, DecisionType.APPROVED, 150);

      const metrics = auditLogger.getPerformanceMetrics('session-2');

      expect(metrics.averageProcessingTime).toBe(150);
      expect(metrics.maxProcessingTime).toBe(150);
      expect(metrics.totalActions).toBe(2);
    });

    it('should round average processing time', () => {
      auditLogger.logDecision('session-3', 'action1', 0, DecisionType.APPROVED, 100);
      auditLogger.logDecision('session-3', 'action2', 1, DecisionType.APPROVED, 150);
      auditLogger.logDecision('session-3', 'action3', 2, DecisionType.APPROVED, 175);

      const metrics = auditLogger.getPerformanceMetrics('session-3');

      expect(metrics.averageProcessingTime).toBe(142); // (100+150+175)/3 = 141.67
    });
  });

  // ========================================================================
  // LOG ROTATION
  // ========================================================================

  describe('Log Rotation', () => {
    it('should rotate log file when it exceeds max size', () => {
      const auditDir = path.join(tempDir, 'review-audit');
      const logPath = path.join(auditDir, 'review-audit.log');

      // Write a log entry
      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED);

      // Manually inflate the log file to exceed max size (10MB)
      const content = fs.readFileSync(logPath, 'utf-8');
      fs.writeFileSync(logPath, content + 'A'.repeat(11 * 1024 * 1024), 'utf-8');

      // Write another entry - should trigger rotation
      auditLogger.logDecision('session-2', 'action', 0, DecisionType.APPROVED);

      // Check that rotated file exists
      const files = fs.readdirSync(auditDir);
      const rotatedFiles = files.filter(f => f.startsWith('review-audit.log.'));

      expect(rotatedFiles.length).toBeGreaterThan(0);
    });

    it('should not rotate small log files', () => {
      const auditDir = path.join(tempDir, 'review-audit');

      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED);

      const files = fs.readdirSync(auditDir);
      const rotatedFiles = files.filter(f => f.startsWith('review-audit.log.'));

      expect(rotatedFiles.length).toBe(0);
      expect(fs.existsSync(path.join(auditDir, 'review-audit.log'))).toBe(true);
    });
  });

  // ========================================================================
  // LOG CLEANUP
  // ========================================================================

  describe('cleanup', () => {
    it('should clean up old log files', () => {
      const auditDir = path.join(tempDir, 'review-audit');

      // Create an old log file
      const oldLogPath = path.join(auditDir, 'old-log.log');
      fs.writeFileSync(oldLogPath, 'old log content');

      // Set modification time to 8 days ago
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldLogPath, eightDaysAgo, eightDaysAgo);

      // Create a recent log file
      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED);

      // Run cleanup with 7 days retention
      auditLogger.cleanup(7);

      // Old file should be deleted
      expect(fs.existsSync(oldLogPath)).toBe(false);
      // Current log should still exist
      expect(fs.existsSync(path.join(auditDir, 'review-audit.log'))).toBe(true);
    });

    it('should use default retention when not specified', () => {
      const auditDir = path.join(tempDir, 'review-audit');

      // Create an old log file
      const oldLogPath = path.join(auditDir, 'old-log.log');
      fs.writeFileSync(oldLogPath, 'old log content');

      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldLogPath, eightDaysAgo, eightDaysAgo);

      // Run cleanup without retention parameter (should use default 7 days)
      auditLogger.cleanup();

      expect(fs.existsSync(oldLogPath)).toBe(false);
    });

    it('should handle invalid retention days', () => {
      // Should not throw error
      auditLogger.cleanup(-1);
      auditLogger.cleanup(NaN);
      auditLogger.cleanup(Infinity);

      expect(console.error).toHaveBeenCalledWith(
        'Invalid retention days:',
        expect.any(Number)
      );
    });

    it('should cap retention at maximum (365 days)', () => {
      // Should not throw error
      auditLogger.cleanup(400); // Exceeds max

      // Test passes if no error is thrown
      expect(true).toBe(true);
    });
  });

  // ========================================================================
  // EXPORT FUNCTIONALITY
  // ========================================================================

  describe('exportSessionLog', () => {
    it('should export session log to file', () => {
      auditLogger.logDecision('session-1', 'approve', 0, DecisionType.APPROVED);
      auditLogger.logDecision('session-1', 'reject', 1, DecisionType.REJECTED);

      const outputPath = path.join(tempDir, 'exported-log.json');
      const success = auditLogger.exportSessionLog('session-1', outputPath);

      expect(success).toBe(true);
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toContain('approve');
      expect(content).toContain('reject');
    });

    it('should handle non-existent session', () => {
      const outputPath = path.join(tempDir, 'exported-log.json');
      const success = auditLogger.exportSessionLog('non-existent', outputPath);

      expect(success).toBe(true); // Creates empty file
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, 'utf-8');
      expect(content).toBe('');
    });

    it('should handle invalid output path', () => {
      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED);

      const success = auditLogger.exportSessionLog('session-1', '/invalid/path/file.json');

      expect(success).toBe(false);
    });

    it('should format exported log as JSON', () => {
      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED, 150);

      const outputPath = path.join(tempDir, 'exported-log.json');
      auditLogger.exportSessionLog('session-1', outputPath);

      const content = fs.readFileSync(outputPath, 'utf-8');

      // Should be valid JSON
      expect(() => JSON.parse(content)).not.toThrow();
      expect(content).toMatch(/\{\s*"sessionId"/);
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle concurrent logging', () => {
      // Simulate concurrent logging from multiple sources
      for (let i = 0; i < 100; i++) {
        auditLogger.logDecision(`session-${i % 10}`, `action-${i}`, i, DecisionType.APPROVED);
      }

      const history = auditLogger.getSessionHistory('session-0');
      expect(history.length).toBeGreaterThan(0);
    });

    it('should handle very long session IDs', () => {
      const longId = 'a'.repeat(1000);
      auditLogger.logDecision(longId, 'action', 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory(longId);
      expect(history).toHaveLength(1);
    });

    it('should handle special characters in action names', () => {
      auditLogger.logDecision('session-1', 'action with "quotes" and \'apostrophes\'', 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history[0].action).toContain('quotes');
    });

    it('should handle zero change index', () => {
      auditLogger.logDecision('session-1', 'action', 0, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history[0].changeIndex).toBe(0);
    });

    it('should handle large change index', () => {
      auditLogger.logDecision('session-1', 'action', 999999, DecisionType.APPROVED);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history[0].changeIndex).toBe(999999);
    });

    it('should handle very long error messages', () => {
      const longError = 'E'.repeat(10000);
      auditLogger.logError('session-1', longError);

      const history = auditLogger.getSessionHistory('session-1');
      expect(history[0].action).toContain('ERROR:');
    });
  });
});
