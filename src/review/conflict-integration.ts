/**
 * Conflict Detection Integration Module (Story 6-7)
 *
 * Integrates conflict detection with the review interface and auto-approval flow.
 *
 * FRs: FR45
 * ARs: AR19 (snake_case), AR20 (ISO 8601 UTC)
 */

import * as fs from 'fs';
import { ConflictDetectionResult } from '../rules/conflict-detection';

// ============================================================================
// Types
// ============================================================================

export interface AutoApprovalResult {
  approvable: string[];
  excluded: string[];
  exclusionMessage: string;
}

export interface ConflictSessionRecord {
  timestamp: string;
  action: 'conflict_detection';
  conflicts_found: number;
  rules_compared: number;
  resolution_actions: string[];
}

// ============================================================================
// Review Interface Integration
// ============================================================================

/**
 * Generates a markdown-formatted conflict summary for the review interface.
 * Returns empty string if no conflicts.
 */
export function generateConflictSummary(conflicts: ConflictDetectionResult): string {
  if (!conflicts.hasConflicts || conflicts.conflicts.length === 0) {
    return '';
  }

  let summary = '\n## Rule Conflicts Detected\n\n';
  summary += `**${conflicts.conflicts.length} conflict(s)** found:\n\n`;

  conflicts.conflicts.forEach((conflict, index) => {
    const severityBadge = conflict.severity === 'high' ? '🔴 HIGH' : '🟡 MEDIUM';

    summary += `### ${index + 1}. [CONFLICT] (${severityBadge})\n\n`;
    summary += `**Existing rule:** ${conflict.existingRule}\n\n`;
    summary += `**New rule:** ${conflict.newRule}\n\n`;
    summary += `**Reason:** ${conflict.reason}\n\n`;
    summary += '**Resolution options:**\n';
    summary += '1. Keep existing rule, discard new\n';
    summary += '2. Keep new rule, replace existing\n';
    summary += '3. Merge both rules into a single combined rule\n';
    summary += '4. Discard both\n\n';
  });

  return summary;
}

// ============================================================================
// Auto-Approval Bypass Prevention
// ============================================================================

/**
 * Filters out conflicting rules from auto-approval batch.
 * Returns the approvable rules and exclusion message.
 */
export function excludeConflictingFromAutoApproval(
  allRules: string[],
  conflictingRuleIndices: Set<number>
): AutoApprovalResult {
  const approvable: string[] = [];
  const excluded: string[] = [];

  allRules.forEach((rule, index) => {
    if (index < 0 || index >= allRules.length) {
      return; // Skip invalid indices
    }
    if (conflictingRuleIndices.has(index)) {
      excluded.push(rule);
    } else {
      approvable.push(rule);
    }
  });

  let exclusionMessage = '';
  if (excluded.length > 0) {
    exclusionMessage = `${excluded.length} rule(s) excluded from auto-approval due to conflicts. Resolve conflicts manually.`;
  }

  return { approvable, excluded, exclusionMessage };
}

// ============================================================================
// Conflict Metrics and Logging
// ============================================================================

/**
 * Records conflict detection results to results.jsonl.
 * Uses atomic write pattern. On failure, catches error and does NOT throw.
 */
export function recordConflictDetection(
  resultsPath: string,
  sessionData: ConflictSessionRecord
): void {
  try {
    const entry = JSON.stringify({
      timestamp: sessionData.timestamp,
      action: sessionData.action,
      conflicts_found: sessionData.conflicts_found,
      rules_compared: sessionData.rules_compared,
      resolution_actions: sessionData.resolution_actions,
    });

    // Read existing content
    let existingContent = '';
    if (fs.existsSync(resultsPath)) {
      existingContent = fs.readFileSync(resultsPath, 'utf-8');
    }

    // Append new entry
    const newContent = existingContent.endsWith('\n')
      ? existingContent + entry + '\n'
      : existingContent.length > 0
        ? existingContent + '\n' + entry + '\n'
        : entry + '\n';

    // Atomic write pattern (temp file + rename)
    const tempPath = resultsPath + '.tmp';
    fs.writeFileSync(tempPath, newContent, 'utf-8');
    fs.renameSync(tempPath, resultsPath);
  } catch (error) {
    // Best-effort logging - do NOT block review flow
    console.warn('Failed to record conflict detection to results.jsonl:', error);
  }
}
