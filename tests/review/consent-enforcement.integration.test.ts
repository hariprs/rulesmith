/**
 * Consent Enforcement Integration Tests (Story 4.5)
 *
 * Integration tests for consent flow with file system operations
 * Testing interactions between ConsentManager, FileWriter, and state persistence
 *
 * Test Pyramid Level: Integration Tests
 * Coverage: AC1-AC8 (end-to-end consent workflow)
 *
 * @module review/consent-enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import { ConsentManager } from '../../src/review/consent-manager';
import { FileWriter } from '../../src/review/file-writer';
import { StateManager } from '../../src/review/state-manager';
import { AuditLogger } from '../../src/review/audit-logger';
import { NavigationState, DecisionType } from '../../src/review/types';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';
import { PlatformDetector } from '../../src/platform-detector';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const TEST_DIR = path.join(process.cwd(), 'data-test-consent');

function createMockPattern(): Pattern {
  return {
    pattern_text: 'Test pattern',
    category: PatternCategory.CODE_STYLE,
    count: 5,
    suggested_rule: 'Test suggested rule',
    first_seen: '2026-03-25T00:00:00Z',
    last_seen: '2026-03-25T01:00:00Z',
    content_types: [ContentType.CODE],
    examples: [],
  };
}

function createMockRuleSuggestion(
  id: string,
  ruleText: string,
  editedRule?: string
): RuleSuggestion {
  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: createMockPattern(),
    ruleText,
    editedRule,
    explanation: 'Test explanation',
    contentType: ContentType.CODE,
    confidence: 0.8,
    platformFormats: {
      cursor: ruleText,
      copilot: ruleText,
    },
  };
}

function createMockNavigationState(
  changes: RuleSuggestion[],
  decisions: Map<number, DecisionType>
): NavigationState {
  return {
    sessionId: 'test-session-consent-123',
    currentIndex: 0,
    changes,
    decisions,
    lastActivity: new Date(),
    totalChanges: changes.length,
  };
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

describe('Consent Enforcement - Integration Tests', () => {
  let testDir: string;
  let stateManager: StateManager;
  let auditLogger: AuditLogger;
  let fileWriter: FileWriter;
  let consentManager: ConsentManager;
  let platformDetector: PlatformDetector;
  let cursorRulesPath: string;

  beforeEach(async () => {
    // Setup clean test directory
    testDir = TEST_DIR + '-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, '.claude'), { recursive: true });

    // Initialize dependencies
    stateManager = new StateManager(testDir);
    auditLogger = new AuditLogger(testDir);
    platformDetector = new PlatformDetector();

    // Determine platform and create FileWriter
    const platform = platformDetector.detectPlatform();
    fileWriter = new FileWriter(platform);

    // Create ConsentManager with all dependencies
    consentManager = new ConsentManager(
      stateManager,
      auditLogger,
      fileWriter,
      platformDetector
    );

    // Set up cursor rules file path
    cursorRulesPath = path.join(testDir, '.cursorrules');
    fs.writeFileSync(cursorRulesPath, '# Existing rules\n', 'utf-8');
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // INTEGRATION TEST - AC1 & AC5: Consent Prompt Display and File List
  // ============================================================================

  test('AC1 & AC5: Should display consent prompt with file list after approvals', async () => {
    // Given: User has approved 3 changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
      createMockRuleSuggestion('3', 'Rule 3'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED],
      [1, DecisionType.APPROVED],
      [2, DecisionType.APPROVED],
    ]);
    const state = createMockNavigationState(changes, decisions);

    // When: System prepares to apply changes
    const prompt = await consentManager.initiateConsent(state);

    // Then: Consent prompt is displayed with correct format
    expect(prompt.type).toBe('consent');
    expect(prompt.message).toMatch(/\[\+\] \d+ approved changes will be applied to:/);
    expect(prompt.message).toContain('3');
    expect(prompt.count).toBe(3);

    // And: File list is shown
    expect(prompt.files).toBeDefined();
    expect(prompt.files.length).toBeGreaterThan(0);
    expect(prompt.files[0]).toContain('.cursorrules');

    // And: Consent state is set
    expect(state.consent).toBeDefined();
    expect(state.consent?.approvedCount).toBe(3);
    expect(state.consent?.affectedFiles).toEqual(prompt.files);

    // And: No files are modified yet
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe('# Existing rules\n');
  });

  // ============================================================================
  // INTEGRATION TEST - AC2: Consent Confirmation and File Modification
  // ============================================================================

  test('AC2: Should apply changes atomically when consent is confirmed', async () => {
    // Given: User has approved 2 changes and consent is initiated
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED],
      [1, DecisionType.APPROVED],
    ]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    const originalContent = fs.readFileSync(cursorRulesPath, 'utf-8');

    // When: User confirms consent
    const result = await consentManager.executeConsent(state, true);

    // Then: All approved changes are applied
    expect(result.action).toBe('consent_given');
    expect(result.success).toBe(true);
    expect(result.changeCount).toBe(2);

    // And: Files are modified with new rules
    const updatedContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(updatedContent).not.toBe(originalContent);
    expect(updatedContent).toContain('Rule 1');
    expect(updatedContent).toContain('Rule 2');

    // And: Audit log entry is created
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    expect(fs.existsSync(resultsPath)).toBe(true);
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    expect(logContent).toContain('consent_given');
    expect(logContent).toContain('2 changes applied successfully');

    // And: State is cleared
    expect(state.consent).toBeUndefined();
    expect(state.decisions.size).toBe(0);
  });

  // ============================================================================
  // INTEGRATION TEST - AC3: Consent Rejection
  // ============================================================================

  test('AC3: Should cancel operation and preserve state when consent is rejected', async () => {
    // Given: User has approved changes and consent is initiated
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED],
      [1, DecisionType.APPROVED],
    ]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    const originalContent = fs.readFileSync(cursorRulesPath, 'utf-8');

    // When: User rejects consent
    const result = await consentManager.executeConsent(state, false);

    // Then: Operation is cancelled
    expect(result.action).toBe('consent_denied');
    expect(result.success).toBe(true);

    // And: No files are modified
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe(originalContent);

    // And: Audit log entry is created
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    expect(logContent).toContain('consent_denied');

    // And: Approved changes are preserved
    expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
    expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
  });

  // ============================================================================
  // INTEGRATION TEST - AC4: Empty Approval State
  // ============================================================================

  test('AC4: Should handle empty approval state gracefully', async () => {
    // Given: User has no approved changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.REJECTED],
      [1, DecisionType.PENDING),
    ]);
    const state = createMockNavigationState(changes, decisions);

    // When: System prepares to apply changes
    const result = await consentManager.initiateConsent(state);

    // Then: Error message is displayed
    expect(result.type).toBe('error');
    expect(result.message).toContain('No approved changes to apply');

    // And: No consent prompt is shown
    expect(state.consent).toBeUndefined();

    // And: No files are modified
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe('# Existing rules\n');

    // And: Operation completes gracefully (no crash)
    expect(result).toBeDefined();
  });

  // ============================================================================
  // INTEGRATION TEST - AC6: Atomic File Modification with Rollback
  // ============================================================================

  test('AC6: Should rollback all changes if any file modification fails', async () => {
    // Given: User has approved changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED],
      [1, DecisionType.APPROVED),
    ]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    const originalContent = fs.readFileSync(cursorRulesPath, 'utf-8');

    // When: File modification is simulated to fail (by making file read-only)
    fs.chmodSync(cursorRulesPath, 0o444); // Read-only
    const result = await consentManager.executeConsent(state, true);
    fs.chmodSync(cursorRulesPath, 0o644); // Restore permissions

    // Then: Operation fails
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // And: Original file contents are preserved (rollback)
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe(originalContent);

    // And: No partial modifications occur
    expect(currentContent).not.toContain('Rule 1');
    expect(currentContent).not.toContain('Rule 2');
  });

  // ============================================================================
  // INTEGRATION TEST - AC7: Audit Trail Logging
  // ============================================================================

  test('AC7: Should log consent decisions with all required fields', async () => {
    // Given: User has approved changes and consent is initiated
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: User confirms consent
    await consentManager.executeConsent(state, true);

    // Then: Audit log entry is created with all required fields
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    const logEntry = JSON.parse(logContent.trim().split('\n').pop()!);

    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('session_id');
    expect(logEntry).toHaveProperty('action');
    expect(logEntry).toHaveProperty('change_count');
    expect(logEntry).toHaveProperty('affected_files');
    expect(logEntry).toHaveProperty('success');

    // And: Values match the operation
    expect(logEntry.action).toBe('consent_given');
    expect(logEntry.change_count).toBe(1);
    expect(logEntry.success).toBe(true);

    // And: Timestamp is in ISO 8601 format
    expect(logEntry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  // ============================================================================
  // INTEGRATION TEST - AC8: State Persistence After Consent
  // ============================================================================

  test('AC8: Should persist and clear state after successful consent', async () => {
    // Given: User has approved changes and consent is initiated
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);

    // Save state before consent
    await stateManager.saveState(state);
    await consentManager.initiateConsent(state);

    // When: User confirms consent and changes are applied
    await consentManager.executeConsent(state, true);

    // Then: State is cleared
    expect(state.consent).toBeUndefined();
    expect(state.decisions.size).toBe(0);

    // And: Cleared state is persisted
    const loadedState = await stateManager.loadState(state.sessionId);
    expect(loadedState).toBeDefined();
    expect(loadedState?.decisions.size).toBe(0);

    // And: Session can be restarted
    const newChanges = [createMockRuleSuggestion('2', 'Rule 2')];
    const newState = createMockNavigationState(
      newChanges,
      new Map<number, DecisionType>()
    );
    await stateManager.saveState(newState);
    expect(newState.sessionId).toBeDefined();
  });

  // ============================================================================
  // INTEGRATION TEST - Story 4.3 Integration: Edited Rules
  // ============================================================================

  test('Story 4.3 Integration: Should apply edited rules instead of originals', async () => {
    // Given: User has approved edited changes
    const changes = [
      createMockRuleSuggestion('1', 'Original rule 1', 'Edited rule 1'),
      createMockRuleSuggestion('2', 'Original rule 2', 'Edited rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED),
      [1, DecisionType.APPROVED),
    ]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: User confirms consent
    await consentManager.executeConsent(state, true);

    // Then: Edited rules are applied, not originals
    const updatedContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(updatedContent).toContain('Edited rule 1');
    expect(updatedContent).toContain('Edited rule 2');
    expect(updatedContent).not.toContain('Original rule 1');
    expect(updatedContent).not.toContain('Original rule 2');
  });

  // ============================================================================
  // INTEGRATION TEST - Complete Consent Workflow
  // ============================================================================

  test('Complete Workflow: Approve → Consent Prompt → Confirm → Apply', async () => {
    // Given: User is in review session with changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
      createMockRuleSuggestion('3', 'Rule 3'),
    ];

    // When: User approves all changes
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED),
      [1, DecisionType.APPROVED),
      [2, DecisionType.APPROVED),
    ]);
    const state = createMockNavigationState(changes, decisions);

    // And: Consent prompt is initiated
    const prompt = await consentManager.initiateConsent(state);
    expect(prompt.type).toBe('consent');
    expect(prompt.count).toBe(3);

    // And: User reviews file list and confirms
    const isConfirmed = consentManager.isConfirmationResponse('yes');
    expect(isConfirmed).toBe(true);

    // And: Changes are applied
    const result = await consentManager.executeConsent(state, true);
    expect(result.success).toBe(true);

    // Then: All changes are persisted to disk
    const updatedContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(updatedContent).toContain('Rule 1');
    expect(updatedContent).toContain('Rule 2');
    expect(updatedContent).toContain('Rule 3');

    // And: Audit trail is complete
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    expect(logContent).toContain('consent_given');
    expect(logContent).toContain('3 changes applied successfully');

    // And: State is cleared for new session
    expect(state.consent).toBeUndefined();
    expect(state.decisions.size).toBe(0);
  });
});
