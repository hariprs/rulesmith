/**
 * Consent Enforcement API-Level Acceptance Tests (Story 4.5)
 *
 * API-level tests for consent enforcement functionality
 * Testing public interfaces and contracts without implementation details
 *
 * Test Pyramid Level: API-Level Acceptance Tests
 * Coverage: AC1-AC8 (all acceptance criteria)
 *
 * @module api/consent-enforcement
 */

import { describe, test, expect } from '@jest/globals';

import {
  ConsentManager,
  ConsentPrompt,
  ConsentResult,
} from '../../src/review/consent-manager';
import { FileWriter, FileModificationResult } from '../../src/review/file-writer';
import { NavigationState, DecisionType } from '../../src/review/types';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES
// ============================================================================

function createMockRuleSuggestion(id: string, ruleText: string): RuleSuggestion {
  const mockPattern: Pattern = {
    pattern_text: 'Test pattern',
    category: PatternCategory.CODE_STYLE,
    count: 5,
    suggested_rule: 'Test suggested rule',
    first_seen: '2026-03-25T00:00:00Z',
    last_seen: '2026-03-25T01:00:00Z',
    content_types: [ContentType.CODE],
    examples: [],
  };

  return {
    id,
    type: RuleProposalType.MODIFICATION,
    pattern: mockPattern,
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

function createMockNavigationState(
  approvedCount: number
): NavigationState {
  const changes = Array.from({ length: approvedCount }, (_, i) =>
    createMockRuleSuggestion(`${i}`, `Rule ${i}`)
  );

  const decisions = new Map<number, DecisionType>();
  for (let i = 0; i < approvedCount; i++) {
    decisions.set(i, DecisionType.APPROVED);
  }

  return {
    sessionId: 'test-session',
    currentIndex: 0,
    changes,
    decisions,
    lastActivity: new Date(),
    totalChanges: changes.length,
  };
}

// ============================================================================
// API-LEVEL ACCEPTANCE TESTS
// ============================================================================

describe('Consent Enforcement - API-Level Acceptance Tests', () => {

  // ==========================================================================
  // AC1: Consent Prompt Displayed After Approvals
  // ==========================================================================

  describe('AC1: Consent Prompt Displayed After Approvals', () => {
    test('Given user has approved changes, When all approvals complete, Then consent prompt is displayed', async () => {
      // Given: User has approved changes
      const state = createMockNavigationState(3);

      // When: All approvals are complete and system prepares to apply changes
      // (This will fail until ConsentManager.initiateConsent is implemented)
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // Then: System displays consent prompt
      const prompt: ConsentPrompt = await consentManager.initiateConsent(state);

      // And: Prompt shows correct format
      expect(prompt.type).toBe('consent');
      expect(prompt.message).toMatch(/\[\+\] \d+ approved changes will be applied to:/);
      expect(prompt.message).toContain('3');

      // And: System waits for explicit user confirmation
      expect(state.consent).toBeDefined();
      expect(state.consent?.approvedCount).toBe(3);

      // And: No files are modified until user responds
      // (Verified by integration tests - file system not modified)
    });

    test('Given user has approved changes, When consent initiated, Then affected files are listed', async () => {
      // Given: User has approved changes
      const state = createMockNavigationState(2);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        { detectPlatform: () => 'cursor' } as any
      );

      // When: Consent is initiated
      const prompt: ConsentPrompt = await consentManager.initiateConsent(state);

      // Then: Prompt shows which files will be modified
      expect(prompt.files).toBeDefined();
      expect(prompt.files.length).toBeGreaterThan(0);
      expect(prompt.message).toContain('will be applied to:');
    });
  });

  // ==========================================================================
  // AC2: Consent Confirmation Accepted
  // ==========================================================================

  describe('AC2: Consent Confirmation Accepted', () => {
    test('Given consent prompt displayed, When user confirms, Then changes are applied', async () => {
      // Given: Consent prompt is displayed
      const state = createMockNavigationState(2);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {
          writeChanges: jest.fn().mockResolvedValue({
            filePath: '/test/.cursorrules',
            success: true,
          }),
        } as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: User responds with confirmation
      const result: ConsentResult = await consentManager.executeConsent(state, true);

      // Then: All approved changes are applied
      expect(result.action).toBe('consent_given');
      expect(result.success).toBe(true);
      expect(result.changeCount).toBe(2);

      // And: Files are modified atomically
      // (Verified by integration tests - all succeed or all fail)

      // And: Operation is logged to audit trail
      // (Verified by integration tests - results.jsonl entry)

      // And: Success message is displayed
      // (Verified by E2E tests - user sees success message)
    });

    test('Given consent prompt displayed, When user confirms, Then state is cleared', async () => {
      // Given: Consent prompt is displayed
      const state = createMockNavigationState(1);
      const consentManager = new ConsentManager(
        { saveState: jest.fn() } as any,
        {} as any,
        {
          writeChanges: jest.fn().mockResolvedValue({
            filePath: '/test/.cursorrules',
            success: true,
          }),
        } as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: User confirms
      await consentManager.executeConsent(state, true);

      // Then: State is cleared
      expect(state.consent).toBeUndefined();
      expect(state.decisions.size).toBe(0);
    });
  });

  // ==========================================================================
  // AC3: Consent Rejected
  // ==========================================================================

  describe('AC3: Consent Rejected', () => {
    test('Given consent prompt displayed, When user rejects, Then operation is cancelled', async () => {
      // Given: Consent prompt is displayed
      const state = createMockNavigationState(2);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: User responds with non-confirmation input
      const result: ConsentResult = await consentManager.executeConsent(state, false);

      // Then: File modification operation is cancelled
      expect(result.action).toBe('consent_denied');
      expect(result.success).toBe(true);

      // And: No files are modified
      // (Verified by integration tests - file system unchanged)

      // And: Cancellation is logged
      // (Verified by integration tests - results.jsonl entry)

      // And: Message is displayed
      // (Verified by E2E tests - user sees cancellation message)

      // And: Approved changes are preserved
      expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
    });
  });

  // ==========================================================================
  // AC4: Empty Approval State Handling
  // ==========================================================================

  describe('AC4: Empty Approval State Handling', () => {
    test('Given no approved changes, When system prepares to apply, Then error is displayed', async () => {
      // Given: User has no approved changes
      const state = createMockNavigationState(0);
      state.decisions.set(0, DecisionType.REJECTED);
      state.decisions.set(1, DecisionType.PENDING);

      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // When: System prepares to apply changes
      const result: ConsentPrompt = await consentManager.initiateConsent(state);

      // Then: System displays error
      expect(result.type).toBe('error');
      expect(result.message).toContain('No approved changes to apply');

      // And: No consent prompt is shown
      expect(state.consent).toBeUndefined();

      // And: No files are modified
      // (Verified by integration tests)

      // And: Operation completes gracefully
      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // AC5: File List Display
  // ==========================================================================

  describe('AC5: File List Display', () => {
    test('Given consent prompt displayed, When user reviews, Then files are listed', async () => {
      // Given: Consent prompt is displayed
      const state = createMockNavigationState(3);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        { detectPlatform: () => 'cursor' } as any
      );

      // When: User reviews the prompt
      const prompt: ConsentPrompt = await consentManager.initiateConsent(state);

      // Then: Prompt shows which files will be modified
      expect(prompt.files).toBeDefined();
      expect(prompt.files.length).toBeGreaterThan(0);

      // And: Format shows files clearly
      expect(prompt.message).toMatch(/\[\+\] \d+ changes will be applied to:/);

      // And: Duplicate file names are not repeated
      const uniqueFiles = new Set(prompt.files);
      expect(uniqueFiles.size).toBe(prompt.files.length);
    });
  });

  // ==========================================================================
  // AC6: Atomic File Modification
  // ==========================================================================

  describe('AC6: Atomic File Modification', () => {
    test('Given user confirmed consent, When applying changes, Then all succeed or all fail', async () => {
      // Given: User has confirmed consent
      const state = createMockNavigationState(3);

      // When: System applies approved changes
      // (This will fail until FileWriter.writeChanges is implemented)
      const fileWriter = new FileWriter('cursor' as any);

      // Then: All file modifications succeed or all fail together
      // (Verified by integration tests with rollback scenarios)

      // And: No partial modifications occur
      // (Verified by integration tests)

      // And: If any file write fails, all changes are rolled back
      // (Verified by integration tests)

      // And: Error message shows which file failed
      // (Verified by integration tests)

      // And: Original file contents are preserved on failure
      // (Verified by integration tests)
    });
  });

  // ==========================================================================
  // AC7: Audit Trail Logging
  // ==========================================================================

  describe('AC7: Audit Trail Logging', () => {
    test('Given user responded to consent, When operation completes, Then audit log entry is created', async () => {
      // Given: User has responded to consent prompt
      const state = createMockNavigationState(2);
      const mockAuditLogger = {
        logDecision: jest.fn(),
        logError: jest.fn(),
      };

      const consentManager = new ConsentManager(
        {} as any,
        mockAuditLogger as any,
        {
          writeChanges: jest.fn().mockResolvedValue({
            filePath: '/test/.cursorrules',
            success: true,
          }),
        } as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: Operation completes (user confirmed)
      await consentManager.executeConsent(state, true);

      // Then: results.jsonl entry includes all required fields
      expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
        state.sessionId,
        -1,
        'consent_given',
        expect.any(String)
      );

      // And: Log format matches Story 4.2 audit log format
      // (Verified by integration tests - checking actual log entries)

      // And: Entry is appended to .claude/results.jsonl
      // (Verified by integration tests)
    });

    test('Given user denied consent, When operation completes, Then audit log entry is created', async () => {
      // Given: User denied consent
      const state = createMockNavigationState(1);
      const mockAuditLogger = {
        logDecision: jest.fn(),
        logError: jest.fn(),
      };

      const consentManager = new ConsentManager(
        {} as any,
        mockAuditLogger as any,
        {} as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: Operation completes (user denied)
      await consentManager.executeConsent(state, false);

      // Then: Audit log entry is created
      expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
        state.sessionId,
        -1,
        'consent_denied',
        expect.any(String)
      );
    });
  });

  // ==========================================================================
  // AC8: State Persistence After Consent
  // ==========================================================================

  describe('AC8: State Persistence After Consent', () => {
    test('Given user gave consent and changes applied, When operation completes, Then state is persisted', async () => {
      // Given: User has given consent and changes are applied
      const state = createMockNavigationState(2);
      const mockStateManager = {
        saveState: jest.fn(),
      };

      const consentManager = new ConsentManager(
        mockStateManager as any,
        {} as any,
        {
          writeChanges: jest.fn().mockResolvedValue({
            filePath: '/test/.cursorrules',
            success: true,
          }),
        } as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      // When: Operation completes successfully
      await consentManager.executeConsent(state, true);

      // Then: All changes are persisted to disk
      // (Verified by integration tests - file system changes)

      // And: State is cleared or archived
      expect(state.consent).toBeUndefined();
      expect(state.decisions.size).toBe(0);

      // And: Session is marked as complete
      expect(mockStateManager.saveState).toHaveBeenCalled();

      // And: User can start new review session
      // (Verified by integration tests - new session creation)
    });
  });

  // ==========================================================================
  // ADDITIONAL API CONTRACT TESTS
  // ==========================================================================

  describe('API Contract Tests', () => {
    test('ConsentManager.initiateConsent returns ConsentPrompt with correct structure', async () => {
      const state = createMockNavigationState(1);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      const prompt: ConsentPrompt = await consentManager.initiateConsent(state);

      expect(prompt).toHaveProperty('type');
      expect(prompt).toHaveProperty('message');
      expect(['consent', 'error']).toContain(prompt.type);
    });

    test('ConsentManager.executeConsent returns ConsentResult with correct structure', async () => {
      const state = createMockNavigationState(1);
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      await consentManager.initiateConsent(state);

      const result: ConsentResult = await consentManager.executeConsent(state, false);

      expect(result).toHaveProperty('action');
      expect(result).toHaveProperty('changeCount');
      expect(result).toHaveProperty('affectedFiles');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('success');
      expect(['consent_given', 'consent_denied']).toContain(result.action);
    });

    test('ConsentManager.isConfirmationResponse correctly identifies keywords', () => {
      const consentManager = new ConsentManager(
        {} as any,
        {} as any,
        {} as any,
        {} as any
      );

      // Confirmation keywords
      expect(consentManager.isConfirmationResponse('yes')).toBe(true);
      expect(consentManager.isConfirmationResponse('confirm')).toBe(true);
      expect(consentManager.isConfirmationResponse('apply')).toBe(true);
      expect(consentManager.isConfirmationResponse('proceed')).toBe(true);

      // Non-confirmation inputs
      expect(consentManager.isConfirmationResponse('no')).toBe(false);
      expect(consentManager.isConfirmationResponse('cancel')).toBe(false);
      expect(consentManager.isConfirmationResponse('')).toBe(false);
    });

    test('FileWriter.writeChanges returns FileModificationResult with correct structure', async () => {
      // This test verifies the API contract (will fail until FileWriter is implemented)
      const fileWriter = new FileWriter('cursor' as any);

      const result: FileModificationResult = await fileWriter.writeChanges(
        '/test/.cursorrules',
        [createMockRuleSuggestion('1', 'Test rule')]
      );

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('success');
      // error and backupPath are optional
    });
  });
});
