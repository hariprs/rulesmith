/**
 * Consent Enforcement E2E Tests (Story 4.5)
 *
 * End-to-end tests for complete consent enforcement journey
 * Testing full user workflow from review to file modification
 *
 * Test Pyramid Level: E2E Tests
 * Coverage: Complete user journey (AC1-AC8)
 * Focus: UI-specific flows requiring full browser interaction simulation
 *
 * @module e2e/consent-enforcement
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

import { ConsentManager } from '../../src/review/consent-manager';
import { FileWriter } from '../../src/review/file-writer';
import { StateManager } from '../../src/review/state-manager';
import { AuditLogger } from '../../src/review/audit-logger';
import { InterfaceManager } from '../../src/review/interface-manager';
import { DecisionProcessor } from '../../src/review/decision-processor';
import { CommandParser } from '../../src/review/command-parser';
import { NavigationState, DecisionType } from '../../src/review/types';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';
import { PlatformDetector } from '../../src/platform-detector';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const E2E_TEST_DIR = path.join(process.cwd(), 'data-test-e2e-consent');

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

function createMockRuleSuggestion(id: string, ruleText: string): RuleSuggestion {
  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: createMockPattern(),
    ruleText,
    explanation: 'Test explanation',
    contentType: ContentType.CODE,
    confidence: 0.8,
    platformFormats: {
      cursor: ruleText,
      copilot: ruleText,
    },
  };
}

// ============================================================================
// SETUP & TEARDOWN
// ============================================================================

describe('Consent Enforcement - E2E Tests', () => {
  let testDir: string;
  let stateManager: StateManager;
  let auditLogger: AuditLogger;
  let fileWriter: FileWriter;
  let consentManager: ConsentManager;
  let interfaceManager: InterfaceManager;
  let decisionProcessor: DecisionProcessor;
  let commandParser: CommandParser;
  let platformDetector: PlatformDetector;
  let cursorRulesPath: string;

  beforeEach(async () => {
    // Setup clean test directory
    testDir = E2E_TEST_DIR + '-' + Date.now();
    fs.mkdirSync(testDir, { recursive: true });
    fs.mkdirSync(path.join(testDir, '.claude'), { recursive: true });

    // Initialize all components
    stateManager = new StateManager(testDir);
    auditLogger = new AuditLogger(testDir);
    commandParser = new CommandParser();
    platformDetector = new PlatformDetector();

    const platform = platformDetector.detectPlatform();
    fileWriter = new FileWriter(platform);
    consentManager = new ConsentManager(
      stateManager,
      auditLogger,
      fileWriter,
      platformDetector
    );

    decisionProcessor = new DecisionProcessor(
      stateManager,
      auditLogger,
      consentManager
    );
    interfaceManager = new InterfaceManager(
      stateManager,
      commandParser,
      decisionProcessor
    );

    // Set up cursor rules file
    cursorRulesPath = path.join(testDir, '.cursorrules');
    fs.writeFileSync(cursorRulesPath, '# Original rules\n', 'utf-8');
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ============================================================================
  // E2E TEST - Complete Consent Journey (AC1-AC8)
  // ============================================================================

  test('Complete Journey: User approves changes, reviews consent prompt, confirms, and sees files modified', async () => {
    // ===== SCENARIO: User goes through complete consent workflow =====

    // Given: User starts a review session with 3 proposed rule changes
    const changes = [
      createMockRuleSuggestion('1', 'Always use TypeScript for type safety'),
      createMockRuleSuggestion('2', 'Write unit tests for all functions'),
      createMockRuleSuggestion('3', 'Follow ESLint configuration rules'),
    ];

    const state: NavigationState = {
      sessionId: 'e2e-session-123',
      currentIndex: 0,
      changes,
      decisions: new Map<number, DecisionType>(),
      lastActivity: new Date(),
      totalChanges: changes.length,
    };

    await stateManager.saveState(state);

    // ===== STEP 1: User reviews and approves changes =====

    // When: User approves change #1
    let response = await interfaceManager.handleCommand('approve #1', state);
    expect(response.output).toContain('[+] Change #1 approved');
    expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);

    // And: User approves change #2
    response = await interfaceManager.handleCommand('approve #2', state);
    expect(response.output).toContain('[+] Change #2 approved');
    expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);

    // And: User approves change #3
    response = await interfaceManager.handleCommand('approve #3', state);
    expect(response.output).toContain('[+] Change #3 approved');
    expect(state.decisions.get(2)).toBe(DecisionType.APPROVED);

    // ===== STEP 2: User initiates consent flow =====

    // When: User types "apply" to initiate consent
    response = await interfaceManager.handleCommand('apply', state);

    // Then: Consent prompt is displayed
    expect(response.output).toContain('[+] 3 approved changes will be applied to:');
    expect(response.output).toContain('Confirm:');

    // And: No files are modified yet
    let currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe('# Original rules\n');

    // ===== STEP 3: User reviews file list and confirms =====

    // When: User confirms with "yes"
    response = await interfaceManager.handleCommand('yes', state);

    // Then: Success message is displayed
    expect(response.output).toContain('[+] 3 changes applied successfully');

    // And: Files are modified
    currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toContain('Always use TypeScript for type safety');
    expect(currentContent).toContain('Write unit tests for all functions');
    expect(currentContent).toContain('Follow ESLint configuration rules');

    // And: Audit log entry is created
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    expect(fs.existsSync(resultsPath)).toBe(true);
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    expect(logContent).toContain('consent_given');

    // And: State is cleared
    expect(state.decisions.size).toBe(0);

    // ===== STEP 4: User can start new review session =====

    // Given: New changes are proposed
    const newChanges = [createMockRuleSuggestion('4', 'New rule')];
    const newState: NavigationState = {
      sessionId: 'e2e-session-456',
      currentIndex: 0,
      changes: newChanges,
      decisions: new Map<number, DecisionType>(),
      lastActivity: new Date(),
      totalChanges: newChanges.length,
    };

    // When: User starts new session
    await stateManager.saveState(newState);

    // Then: New session can be created (previous session complete)
    const loadedState = await stateManager.loadState(newState.sessionId);
    expect(loadedState).toBeDefined();
    expect(loadedState?.decisions.size).toBe(0);
  });

  // ============================================================================
  // E2E TEST - Consent Rejection Journey
  // ============================================================================

  test('Rejection Journey: User approves changes but rejects consent, no files modified', async () => {
    // ===== SCENARIO: User cancels at consent step =====

    // Given: User has approved 2 changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];

    const state: NavigationState = {
      sessionId: 'e2e-reject-session',
      currentIndex: 0,
      changes,
      decisions: new Map<number, DecisionType>([
        [0, DecisionType.APPROVED],
        [1, DecisionType.APPROVED],
      ]),
      lastActivity: new Date(),
      totalChanges: changes.length,
    };

    await stateManager.saveState(state);

    // When: User initiates consent but rejects it
    let response = await interfaceManager.handleCommand('apply', state);
    expect(response.output).toContain('[+] 2 approved changes will be applied to:');

    response = await interfaceManager.handleCommand('no', state);

    // Then: Cancellation message is displayed
    expect(response.output).toContain('[!] Operation cancelled - no files modified');

    // And: No files are modified
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe('# Original rules\n');

    // And: Audit log shows cancellation
    const resultsPath = path.join(testDir, '.claude', 'results.jsonl');
    const logContent = fs.readFileSync(resultsPath, 'utf-8');
    expect(logContent).toContain('consent_denied');

    // And: Approved changes are preserved
    expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
    expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);

    // And: User can retry consent later
    response = await interfaceManager.handleCommand('apply', state);
    expect(response.output).toContain('[+] 2 approved changes will be applied to:');
  });

  // ============================================================================
  // E2E TEST - Empty Approval Handling
  // ============================================================================

  test('Empty Approval: User tries to apply without any approved changes', async () => {
    // ===== SCENARIO: User attempts consent with no approvals =====

    // Given: User has rejected all changes
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];

    const state: NavigationState = {
      sessionId: 'e2e-empty-session',
      currentIndex: 0,
      changes,
      decisions: new Map<number, DecisionType>([
        [0, DecisionType.REJECTED],
        [1, DecisionType.REJECTED),
      ]),
      lastActivity: new Date(),
      totalChanges: changes.length,
    };

    await stateManager.saveState(state);

    // When: User tries to apply changes
    const response = await interfaceManager.handleCommand('apply', state);

    // Then: Error message is displayed
    expect(response.output).toContain('[!] No approved changes to apply');

    // And: No consent prompt is shown
    expect(response.output).not.toContain('Confirm:');

    // And: No files are modified
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe('# Original rules\n');

    // And: Operation completes gracefully (no crash)
    expect(response.success).toBe(false);
    expect(response.error).toContain('No approved changes');
  });

  // ============================================================================
  // E2E TEST - Confirmation Keywords Variations
  // ============================================================================

  test('Confirmation Keywords: All variations work correctly', async () => {
    // ===== SCENARIO: User uses different confirmation keywords =====

    const testCases = [
      { keyword: 'yes', expected: true },
      { keyword: 'confirm', expected: true },
      { keyword: 'apply', expected: true },
      { keyword: 'proceed', expected: true },
      { keyword: 'no', expected: false },
      { keyword: 'cancel', expected: false },
      { keyword: 'maybe', expected: false },
    ];

    for (const testCase of testCases) {
      // Given: User has approved changes and initiated consent
      const changes = [createMockRuleSuggestion('1', 'Rule')];
      const state: NavigationState = {
        sessionId: `e2e-keyword-${testCase.keyword}`,
        currentIndex: 0,
        changes,
        decisions: new Map<number, DecisionType>([[0, DecisionType.APPROVED]]),
        lastActivity: new Date(),
        totalChanges: changes.length,
      };

      // When: User responds with keyword
      const isConfirmed = consentManager.isConfirmationResponse(testCase.keyword);

      // Then: Correct recognition
      expect(isConfirmed).toBe(testCase.expected);
    }
  });

  // ============================================================================
  // E2E TEST - Atomic Modification Failure Recovery
  // ============================================================================

  test('Atomic Failure: File modification failure triggers rollback', async () => {
    // ===== SCENARIO: Write failure triggers automatic rollback =====

    // Given: User has approved changes and consent is confirmed
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];

    const state: NavigationState = {
      sessionId: 'e2e-rollback-session',
      currentIndex: 0,
      changes,
      decisions: new Map<number, DecisionType>([
        [0, DecisionType.APPROVED],
        [1, DecisionType.APPROVED),
      ]),
      lastActivity: new Date(),
      totalChanges: changes.length,
    };

    await consentManager.initiateConsent(state);

    const originalContent = fs.readFileSync(cursorRulesPath, 'utf-8');

    // When: File becomes read-only (simulating write failure)
    fs.chmodSync(cursorRulesPath, 0o444); // Read-only
    const result = await consentManager.executeConsent(state, true);
    fs.chmodSync(cursorRulesPath, 0o644); // Restore permissions

    // Then: Operation fails
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    // And: Original file is preserved (rollback)
    const currentContent = fs.readFileSync(cursorRulesPath, 'utf-8');
    expect(currentContent).toBe(originalContent);

    // And: No partial modifications
    expect(currentContent).not.toContain('Rule 1');
    expect(currentContent).not.toContain('Rule 2');

    // And: Error message is informative
    expect(result.error).toContain('File modification failed');
  });
});
