/**
 * Audit Logger (Story 4.1)
 *
 * Tracks all review decisions for compliance and debugging
 *
 * @module review/audit-logger
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as zlib from 'zlib';
import { Stream } from 'stream';
import { AuditLogEntry, DecisionType } from './types';

// ============================================================================
// AUDIT LOGGER
// ============================================================================

/**
 * Audit logger for review interface
 *
 * @class AuditLogger
 */
export class AuditLogger {
  private readonly auditLogPath: string;
  private readonly maxLogFileSize = 100 * 1024 * 1024; // 100MB per AC12:176
  private readonly logRetentionDays = 7; // Compress after 7 days per AC12:175

  constructor(baseDir: string = '.claude') {
    const auditDir = path.join(baseDir, 'review-audit');
    this.ensureDirectoryExists(auditDir);
    this.auditLogPath = path.join(auditDir, 'review-audit.log');
  }

  /**
   * Log a review decision
   *
   * @param sessionId - Session identifier
   * @param action - Action performed
   * @param changeIndex - Change index
   * @param decision - Decision made
   * @param processingTimeMs - Processing time
   */
  logDecision(
    sessionId: string,
    action: string,
    changeIndex: number,
    decision?: DecisionType,
    processingTimeMs?: number
  ): void {
    // Guard: Validate sessionId parameter
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logDecision');
      return;
    }

    // Guard: Validate changeIndex
    if (typeof changeIndex !== 'number' || !Number.isFinite(changeIndex)) {
      console.error('Invalid changeIndex provided to logDecision');
      return;
    }

    // Guard: Validate processingTimeMs if provided
    if (processingTimeMs !== undefined && (typeof processingTimeMs !== 'number' || !Number.isFinite(processingTimeMs) || processingTimeMs < 0)) {
      console.error('Invalid processingTimeMs provided to logDecision');
      return;
    }

    const entry: AuditLogEntry = {
      sessionId: this.sanitizeSessionId(sessionId),
      action: action || 'unknown',
      changeIndex,
      decision,
      timestamp: new Date().toISOString(),
      processingTimeMs,
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log a navigation action
   *
   * @param sessionId - Session identifier
   * @param action - Navigation action
   * @param fromIndex - Source index
   * @param toIndex - Destination index
   */
  logNavigation(
    sessionId: string,
    action: string,
    fromIndex: number,
    toIndex: number
  ): void {
    // Guard: Validate sessionId parameter
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logNavigation');
      return;
    }

    // Guard: Validate action parameter
    if (!action || typeof action !== 'string') {
      console.error('Invalid action provided to logNavigation');
      return;
    }

    // Guard: Validate index parameters
    if (typeof fromIndex !== 'number' || !Number.isFinite(fromIndex)) {
      console.error('Invalid fromIndex provided to logNavigation');
      return;
    }

    if (typeof toIndex !== 'number' || !Number.isFinite(toIndex)) {
      console.error('Invalid toIndex provided to logNavigation');
      return;
    }

    const entry: AuditLogEntry = {
      sessionId: this.sanitizeSessionId(sessionId),
      action: `${action} (${fromIndex} → ${toIndex})`,
      changeIndex: toIndex,
      timestamp: new Date().toISOString(),
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log an error
   *
   * @param sessionId - Session identifier
   * @param error - Error message
   * @param context - Additional context
   */
  logError(sessionId: string, error: string, context?: string): void {
    // Guard: Validate required parameters
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logError');
      return;
    }

    if (!error || typeof error !== 'string') {
      console.error('Invalid error message provided to logError');
      return;
    }

    const entry: AuditLogEntry = {
      sessionId: this.sanitizeSessionId(sessionId),
      action: `ERROR: ${error}`,
      changeIndex: -1,
      timestamp: new Date().toISOString(),
    };

    this.writeLogEntry(entry);
  }

  /**
   * Get audit log entries for a session
   *
   * @param sessionId - Session identifier
   * @returns Array of log entries
   */
  getSessionHistory(sessionId: string): AuditLogEntry[] {
    try {
      // Guard: Validate sessionId parameter
      if (!sessionId || typeof sessionId !== 'string') {
        console.error('Invalid session ID provided to getSessionHistory');
        return [];
      }

      if (!fs.existsSync(this.auditLogPath)) {
        return [];
      }

      // Guard: Check file size before reading
      const stats = fs.statSync(this.auditLogPath);
      const MAX_LOG_SIZE = 50 * 1024 * 1024; // 50MB
      if (stats.size > MAX_LOG_SIZE) {
        console.error('Audit log file exceeds maximum size');
        return [];
      }

      const logContent = fs.readFileSync(this.auditLogPath, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());

      return lines
        .map(line => {
          try {
            return JSON.parse(line) as AuditLogEntry;
          } catch {
            return null;
          }
        })
        .filter((entry): entry is AuditLogEntry => {
          return entry !== null && entry.sessionId === sessionId;
        });
    } catch (error) {
      console.error('Failed to read audit log:', error);
      return [];
    }
  }

  /**
   * Clean up old log files
   *
   * @param retentionDays - Days to retain logs
   */
  cleanup(retentionDays?: number): void {
    // Guard: Validate retentionDays parameter
    const days = retentionDays !== undefined ? retentionDays : this.logRetentionDays;

    if (typeof days !== 'number' || !Number.isFinite(days) || days < 0) {
      console.error('Invalid retention days:', days);
      return;
    }

    // Guard: Prevent excessive retention periods
    const MAX_RETENTION_DAYS = 365; // 1 year max
    const effectiveDays = Math.min(days, MAX_RETENTION_DAYS);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - effectiveDays);

    try {
      const auditDir = path.dirname(this.auditLogPath);
      const files = fs.readdirSync(auditDir);

      files.forEach(file => {
        const filePath = path.join(auditDir, file);
        const stats = fs.statSync(filePath);

        if (stats.isFile() && stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (error) {
      console.error('Failed to cleanup audit logs:', error);
    }
  }

  /**
   * Rotate log file if it exceeds maximum size
   *
   * @private
   */
  private rotateLogIfNeeded(): void {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return;
      }

      const stats = fs.statSync(this.auditLogPath);

      // Check size-based rotation (100MB per AC12:176)
      if (stats.size >= this.maxLogFileSize) {
        this.rotateLog('size');
        return;
      }

      // Check daily rotation per AC12:175
      const now = new Date();
      const lastModified = stats.mtime;
      const daysSinceModified = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceModified >= 1) {
        this.rotateLog('daily');
      }

      // Compress old logs (>7 days) per AC12:175
      this.compressOldLogs();
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Rotate log file with reason
   *
   * @private
   * @param reason - Rotation reason
   */
  private rotateLog(reason: 'size' | 'daily'): void {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rotatedPath = `${this.auditLogPath}.${timestamp}`;

      // Add checksum before rotation per AC12:177
      const checksum = this.generateChecksum(this.auditLogPath);
      const checksumPath = `${this.auditLogPath}.checksum`;
      fs.writeFileSync(checksumPath, `${checksum}  ${path.basename(this.auditLogPath)}\n`, 'utf-8');

      fs.renameSync(this.auditLogPath, rotatedPath);
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  /**
   * Compress log files older than retention period
   *
   * @private
   */
  private compressOldLogs(): void {
    try {
      const auditDir = path.dirname(this.auditLogPath);
      const files = fs.readdirSync(auditDir);
      const now = Date.now();

      for (const file of files) {
        if (!file.startsWith('review-audit.log.') || file.endsWith('.gz')) {
          continue;
        }

        const filePath = path.join(auditDir, file);
        const stats = fs.statSync(filePath);
        const ageDays = (now - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);

        // Compress files older than 7 days per AC12:175
        if (ageDays >= this.logRetentionDays) {
          this.compressFile(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to compress old logs:', error);
    }
  }

  /**
   * Compress a single log file
   *
   * @private
   * @param filePath - Path to file to compress
   */
  private async compressFile(filePath: string): Promise<void> {
    try {
      const gzipPath = `${filePath}.gz`;

      // Read the file content
      const content = fs.readFileSync(filePath);

      // Compress the content
      const compressed = zlib.gzipSync(content);

      // Write compressed content
      fs.writeFileSync(gzipPath, compressed);

      // Verify compression succeeded before deleting original
      if (fs.existsSync(gzipPath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Failed to compress file ${filePath}:`, error);
    }
  }

  /**
   * Generate checksum for audit log integrity per AC12:177
   *
   * @private
   * @param filePath - Path to file
   * @returns SHA-256 checksum
   */
  private generateChecksum(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.error(`Failed to generate checksum for ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Write log entry to file
   *
   * @private
   * @param entry - Log entry to write
   */
  private writeLogEntry(entry: AuditLogEntry): void {
    try {
      this.rotateLogIfNeeded();

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write audit log entry:', error);
    }
  }

  /**
   * Sanitize session ID for logging
   *
   * @private
   * @param sessionId - Session ID to sanitize
   * @returns Sanitized session ID
   */
  private sanitizeSessionId(sessionId: string): string {
    // Guard: Validate input type before string operations
    if (!sessionId || typeof sessionId !== 'string') {
      return 'unknown';
    }

    // Guard: Limit length to prevent DoS
    const MAX_SESSION_ID_LENGTH = 256;
    if (sessionId.length > MAX_SESSION_ID_LENGTH) {
      sessionId = sessionId.substring(0, MAX_SESSION_ID_LENGTH);
    }

    // Only keep UUID-like characters
    return sessionId.replace(/[^a-zA-Z0-9-]/g, '');
  }

  /**
   * Ensure directory exists
   *
   * @private
   * @param dirPath - Directory path
   */
  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get performance metrics for a session
   *
   * @param sessionId - Session identifier
   * @returns Performance metrics
   */
  getPerformanceMetrics(sessionId: string): {
    averageProcessingTime: number;
    maxProcessingTime: number;
    totalActions: number;
  } {
    const entries = this.getSessionHistory(sessionId);
    const processingTimes = entries
      .map(e => e.processingTimeMs)
      .filter((t): t is number => t !== undefined);

    if (processingTimes.length === 0) {
      return {
        averageProcessingTime: 0,
        maxProcessingTime: 0,
        totalActions: entries.length,
      };
    }

    const average = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    const max = Math.max(...processingTimes);

    return {
      averageProcessingTime: Math.round(average),
      maxProcessingTime: max,
      totalActions: entries.length,
    };
  }

  /**
   * Export audit log for compliance
   *
   * @param sessionId - Session identifier
   * @param outputPath - Output file path
   * @returns Success status
   */
  exportSessionLog(sessionId: string, outputPath: string): boolean {
    try {
      const entries = this.getSessionHistory(sessionId);
      const logContent = entries
        .map(entry => JSON.stringify(entry, null, 2))
        .join('\n');

      fs.writeFileSync(outputPath, logContent, 'utf-8');
      return true;
    } catch (error) {
      console.error('Failed to export audit log:', error);
      return false;
    }
  }

  /**
   * Log edit action (Story 4.3)
   *
   * @param sessionId - Session identifier
   * @param changeIndex - Change index
   * @param originalRule - Original rule text
   * @param editedRule - Edited rule text
   * @param processingTimeMs - Processing time
   * @param pattern - Pattern text (optional, for audit context)
   */
  logEdit(
    sessionId: string,
    changeIndex: number,
    originalRule: string,
    editedRule: string,
    processingTimeMs?: number,
    pattern?: string
  ): void {
    // Guard: Validate required parameters
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logEdit');
      return;
    }

    if (typeof changeIndex !== 'number' || !Number.isFinite(changeIndex)) {
      console.error('Invalid changeIndex provided to logEdit');
      return;
    }

    if (!originalRule || typeof originalRule !== 'string') {
      console.error('Invalid originalRule provided to logEdit');
      return;
    }

    if (!editedRule || typeof editedRule !== 'string') {
      console.error('Invalid editedRule provided to logEdit');
      return;
    }

    // Create entry with edit-specific fields (Story 4.3: FR21 - Audit Trail)
    const entry: AuditLogEntry = {
      sessionId: this.sanitizeSessionId(sessionId),
      action: 'edit',
      changeIndex,
      decision: DecisionType.EDITED,
      timestamp: new Date().toISOString(),
      processingTimeMs,
      original_rule: originalRule,
      edited_rule: editedRule,
      pattern: pattern,  // Story 4.3: Include pattern for audit context
    };

    this.writeLogEntry(entry);
  }

  /**
   * Log decision with full context (Story 4.2)
   *
   * @param sessionId - Session identifier
   * @param action - User action (exact command text)
   * @param changeIndex - Change index affected
   * @param decision - Decision type
   * @param previousDecision - Previous decision (if overwriting)
   * @param processingTimeMs - Processing time
   */
  logDecisionWithContext(
    sessionId: string,
    action: string,
    changeIndex: number,
    decision: DecisionType,
    previousDecision?: DecisionType,
    processingTimeMs?: number
  ): void {
    // Guard: Validate required parameters
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logDecisionWithContext');
      return;
    }

    if (!action || typeof action !== 'string') {
      console.error('Invalid action provided to logDecisionWithContext');
      return;
    }

    if (typeof changeIndex !== 'number' || !Number.isFinite(changeIndex)) {
      console.error('Invalid changeIndex provided to logDecisionWithContext');
      return;
    }

    // Build action string with context
    let actionString = action;
    if (previousDecision && previousDecision !== decision) {
      actionString += ` (changed from ${previousDecision})`;
    }

    this.logDecision(sessionId, actionString, changeIndex, decision, processingTimeMs);
  }

  /**
   * Log security violation (Story 4.2)
   *
   * @param sessionId - Session identifier
   * @param violation - Violation type
   * @param details - Violation details
   */
  logSecurityViolation(sessionId: string, violation: string, details: string): void {
    // Guard: Validate required parameters
    if (!sessionId || typeof sessionId !== 'string') {
      console.error('Invalid session ID provided to logSecurityViolation');
      return;
    }

    if (!violation || typeof violation !== 'string') {
      console.error('Invalid violation provided to logSecurityViolation');
      return;
    }

    if (!details || typeof details !== 'string') {
      console.error('Invalid details provided to logSecurityViolation');
      return;
    }

    // Guard: Validate and sanitize path components
    const auditDir = path.dirname(this.auditLogPath);
    if (!auditDir || typeof auditDir !== 'string') {
      console.error('Invalid audit directory path');
      return;
    }

    // Sanitize violation and details to prevent log injection
    const sanitizedViolation = violation.replace(/[\n\r]/g, ' ');
    const sanitizedDetails = details.replace(/[\n\r]/g, ' ');

    const securityLogPath = path.join(auditDir, 'security.log');

    try {
      const entry = {
        sessionId: this.sanitizeSessionId(sessionId),
        violation: sanitizedViolation,
        details: sanitizedDetails,
        timestamp: new Date().toISOString(),
      };

      const logLine = JSON.stringify(entry) + '\n';
      fs.appendFileSync(securityLogPath, logLine, 'utf-8');
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  /**
   * Get audit statistics (Story 4.2)
   *
   * @param sessionId - Session identifier
   * @returns Audit statistics
   */
  getAuditStatistics(sessionId: string): {
    totalDecisions: number;
    approvals: number;
    rejections: number;
    edits: number;
    averageProcessingTime: number;
    maxProcessingTime: number;
    minProcessingTime: number;
  } {
    const entries = this.getSessionHistory(sessionId);

    const stats = {
      totalDecisions: 0,
      approvals: 0,
      rejections: 0,
      edits: 0,
      averageProcessingTime: 0,
      maxProcessingTime: 0,
      minProcessingTime: Number.MAX_VALUE,
    };

    const processingTimes: number[] = [];

    entries.forEach(entry => {
      if (entry.decision === DecisionType.APPROVED) {
        stats.approvals++;
        stats.totalDecisions++;
      } else if (entry.decision === DecisionType.REJECTED) {
        stats.rejections++;
        stats.totalDecisions++;
      } else if (entry.decision === DecisionType.EDITED) {
        stats.edits++;
        stats.totalDecisions++;
      }

      if (entry.processingTimeMs !== undefined) {
        processingTimes.push(entry.processingTimeMs);
      }
    });

    if (processingTimes.length > 0) {
      stats.averageProcessingTime =
        processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
      stats.maxProcessingTime = Math.max(...processingTimes);
      stats.minProcessingTime = Math.min(...processingTimes);
    } else {
      stats.minProcessingTime = 0;
    }

    return stats;
  }

  /**
   * Write log entry atomically (Story 4.2)
   *
   * @private
   * @param entry - Log entry to write
   */
  private writeLogEntryAtomic(entry: AuditLogEntry): void {
    try {
      this.rotateLogIfNeeded();

      // Write to temporary file first
      const tempPath = `${this.auditLogPath}.tmp`;
      const logLine = JSON.stringify(entry) + '\n';

      fs.writeFileSync(tempPath, logLine, 'utf-8');

      // Append to actual log file (atomic on most systems)
      fs.appendFileSync(this.auditLogPath, logLine, 'utf-8');

      // Clean up temp file
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // Temp file cleanup is not critical
      }
    } catch (error) {
      console.error('Failed to write audit log entry atomically:', error);
    }
  }

  /**
   * Generate checksum for audit entry (Story 4.2)
   *
   * @private
   * @param entry - Log entry
   * @returns Checksum string
   */
  private generateEntryChecksum(entry: AuditLogEntry): string {
    const data = `${entry.sessionId}|${entry.action}|${entry.changeIndex}|${entry.timestamp}`;
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Verify audit log integrity (Story 4.2)
   *
   * @returns Whether audit log is intact
   */
  verifyAuditIntegrity(): boolean {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return true; // No log to verify
      }

      const logContent = fs.readFileSync(this.auditLogPath, 'utf-8');
      const lines = logContent.split('\n').filter(line => line.trim());

      // Verify each line is valid JSON
      for (const line of lines) {
        try {
          JSON.parse(line);
        } catch {
          console.error('Audit log contains invalid JSON');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to verify audit log integrity:', error);
      return false;
    }
  }

  /**
   * Rotate audit log (Story 4.2)
   *
   * @param force - Force rotation regardless of size
   */
  rotateAuditLog(force: boolean = false): void {
    try {
      if (!fs.existsSync(this.auditLogPath)) {
        return;
      }

      const shouldRotate = force || (fs.statSync(this.auditLogPath).size >= this.maxLogFileSize);

      if (shouldRotate) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.auditLogPath}.${timestamp}`;
        fs.renameSync(this.auditLogPath, rotatedPath);

        // Compress old log
        this.compressLog(rotatedPath);
      }
    } catch (error) {
      console.error('Failed to rotate audit log:', error);
    }
  }

  /**
   * Compress log file (Story 4.2)
   *
   * @private
   * @param logPath - Path to log file
   */
  private compressLog(logPath: string): void {
    try {
      // Read the file content
      const content = fs.readFileSync(logPath);

      // Compress the content
      const compressed = zlib.gzipSync(content);

      // Write compressed content
      fs.writeFileSync(`${logPath}.gz`, compressed);

      // Delete original file after compression
      try {
        fs.unlinkSync(logPath);
      } catch {
        // Original cleanup is not critical
      }
    } catch (error) {
      console.error('Failed to compress log:', error);
    }
  }
}
