/**
 * Consent Manager Unit Tests (Story 4.5)
 *
 * Unit tests for ConsentManager business logic
 * Testing in isolation with mocked dependencies
 *
 * Test Pyramid Level: Unit Tests
 * Coverage: AC1, AC2, AC3, AC4, AC5
 *
 * @module review/consent-manager
 */

import { ConsentManager } from '../../src/review/consent-manager';
import { StateManager } from '../../src/review/state-manager';
import { AuditLogger } from '../../src/review/audit-logger';
import { FileWriter } from '../../src/review/file-writer';
import { NavigationState, DecisionType } from '../../src/review/types';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types';
import { Pattern, PatternCategory } from '../../src/pattern-detector';
import { ContentType } from '../../src/content-analyzer';

// ============================================================================
// TEST FIXTURES
// ============================================================================

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

function createMockNavigationState(
  changes: RuleSuggestion[],
  decisions: Map<number, DecisionType>
): NavigationState {
  return {
    sessionId: 'test-session-123',
    currentIndex: 0,
    changes,
    decisions,
    lastActivity: new Date(),
    totalChanges: changes.length,
  };
}

// ============================================================================
// UNIT TESTS - AC1: Consent Prompt Displayed After Approvals
// ============================================================================

describe('ConsentManager - AC1: Consent Prompt Displayed', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;

  beforeEach(() => {
    mockStateManager = {
      saveState: jest.fn(),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn(),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      {} as any // PlatformDetector mock
    );
  });

  test('should display consent prompt when user has approved changes', async () => {
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
    const result = await consentManager.initiateConsent(state);

    // Then: Consent prompt is displayed
    expect(result.type).toBe('consent');
    expect(result.message).toContain('[+] 3 approved changes will be applied to:');
    expect(result.count).toBe(3);
    expect(result.files).toEqual(expect.arrayContaining([expect.any(String)]));

    // And: Consent state is stored in NavigationState
    expect(state.consent).toBeDefined();
    expect(state.consent?.approvedCount).toBe(3);
    expect(state.consent?.promptedAt).toBeDefined();
  });

  test('should not modify files until consent is received', async () => {
    // Given: User has approved changes
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);

    // When: Consent prompt is initiated
    await consentManager.initiateConsent(state);

    // Then: No files are modified
    expect(mockFileWriter.writeChanges).not.toHaveBeenCalled();
  });
});

// ============================================================================
// UNIT TESTS - AC2: Consent Confirmation Accepted
// ============================================================================

describe('ConsentManager - AC2: Consent Confirmation Accepted', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;

  beforeEach(() => {
    mockStateManager = {
      saveState: jest.fn(),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn().mockResolvedValue({
        filePath: '/test/.cursorrules',
        success: true,
      }),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      {} as any
    );
  });

  test('should apply changes when user confirms with "yes"', async () => {
    // Given: Consent prompt is displayed
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: User responds with "yes"
    const result = await consentManager.executeConsent(state, true);

    // Then: All approved changes are applied
    expect(mockFileWriter.writeChanges).toHaveBeenCalled();
    expect(result.action).toBe('consent_given');
    expect(result.success).toBe(true);

    // And: Operation is logged to audit logger
    expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
      state.sessionId,
      -1,
      'consent_given',
      expect.stringContaining('1 changes applied successfully')
    );
  });

  test('should apply changes when user confirms with "confirm"', async () => {
    // Given: Consent prompt is displayed
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: User responds with "confirm"
    const isConfirmed = consentManager.isConfirmationResponse('confirm');

    // Then: Confirmation is recognized
    expect(isConfirmed).toBe(true);
  });

  test('should recognize all confirmation keywords', () => {
    // Given: Various confirmation responses
    const confirmations = ['yes', 'confirm', 'apply', 'proceed'];

    // When: Checking each response
    // Then: All should be recognized as confirmations
    confirmations.forEach(input => {
      expect(consentManager.isConfirmationResponse(input)).toBe(true);
    });
  });

  test('should clear state after successful consent execution', async () => {
    // Given: Consent prompt is displayed and confirmed
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: Changes are applied successfully
    await consentManager.executeConsent(state, true);

    // Then: State is cleared
    expect(state.consent).toBeUndefined();
    expect(mockStateManager.saveState).toHaveBeenCalled();
  });
});

// ============================================================================
// UNIT TESTS - AC3: Consent Rejected
// ============================================================================

describe('ConsentManager - AC3: Consent Rejected', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;

  beforeEach(() => {
    mockStateManager = {
      saveState: jest.fn(),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn(),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      {} as any
    );
  });

  test('should cancel operation when user rejects consent', async () => {
    // Given: Consent prompt is displayed
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);
    await consentManager.initiateConsent(state);

    // When: User responds with non-confirmation input
    const result = await consentManager.executeConsent(state, false);

    // Then: Operation is cancelled
    expect(result.action).toBe('consent_denied');
    expect(result.success).toBe(true);

    // And: No files are modified
    expect(mockFileWriter.writeChanges).not.toHaveBeenCalled();

    // And: Cancellation is logged
    expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
      state.sessionId,
      -1,
      'consent_denied',
      expect.any(String)
    );
  });

  test('should preserve approved changes after cancellation', async () => {
    // Given: Consent prompt is displayed with approved changes
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

    // When: User cancels consent
    await consentManager.executeConsent(state, false);

    // Then: Approved decisions are preserved
    expect(state.decisions.get(0)).toBe(DecisionType.APPROVED);
    expect(state.decisions.get(1)).toBe(DecisionType.APPROVED);
  });

  test('should reject non-confirmation responses', () => {
    // Given: Non-confirmation inputs
    const nonConfirmations = ['no', 'cancel', 'maybe', 'later', ''];

    // When: Checking each response
    // Then: All should be rejected
    nonConfirmations.forEach(input => {
      expect(consentManager.isConfirmationResponse(input)).toBe(false);
    });
  });
});

// ============================================================================
// UNIT TESTS - AC4: Empty Approval State Handling
// ============================================================================

describe('ConsentManager - AC4: Empty Approval State Handling', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;

  beforeEach(() => {
    mockStateManager = {
      saveState: jest.fn(),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn(),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      {} as any
    );
  });

  test('should display error when no approved changes exist', async () => {
    // Given: User has no approved changes (all rejected)
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.REJECTED],
      [1, DecisionType.REJECTED],
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
    expect(mockFileWriter.writeChanges).not.toHaveBeenCalled();
  });

  test('should handle empty state gracefully', async () => {
    // Given: State with no changes
    const changes: RuleSuggestion[] = [];
    const decisions = new Map<number, DecisionType>();
    const state = createMockNavigationState(changes, decisions);

    // When: System prepares to apply changes
    const result = await consentManager.initiateConsent(state);

    // Then: Operation completes gracefully
    expect(result.type).toBe('error');
    expect(result.message).toContain('No approved changes to apply');
  });

  test('should only count APPROVED decisions', async () => {
    // Given: Mixed decisions
    const changes = [
      createMockRuleSuggestion('1', 'Rule 1'),
      createMockRuleSuggestion('2', 'Rule 2'),
      createMockRuleSuggestion('3', 'Rule 3'),
      createMockRuleSuggestion('4', 'Rule 4'),
    ];
    const decisions = new Map<number, DecisionType>([
      [0, DecisionType.APPROVED],
      [1, DecisionType.REJECTED],
      [2, DecisionType.PENDING],
      [3, DecisionType.EDITED],
    ]);
    const state = createMockNavigationState(changes, decisions);

    // When: Initiating consent
    const result = await consentManager.initiateConsent(state);

    // Then: Only APPROVED changes are counted
    expect(result.count).toBe(1);
    expect(result.message).toContain('1 approved changes');
  });
});

// ============================================================================
// UNIT TESTS - AC5: File List Display
// ============================================================================

describe('ConsentManager - AC5: File List Display', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;

  beforeEach(() => {
    mockStateManager = {
      saveState: jest.fn(),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn(),
      logError: jest.fn(),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn(),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      {
        detectPlatform: jest.fn().mockReturnValue('cursor'),
      } as any
    );
  });

  test('should show which files will be modified', async () => {
    // Given: User has approved changes
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);

    // When: Consent prompt is displayed
    const result = await consentManager.initiateConsent(state);

    // Then: File list is shown in prompt
    expect(result.files).toBeDefined();
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.message).toContain('will be applied to:');
  });

  test('should not repeat duplicate file names', async () => {
    // Given: Multiple approved changes for same file
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

    // When: Consent prompt is displayed
    const result = await consentManager.initiateConsent(state);

    // Then: File appears only once in list
    const uniqueFiles = new Set(result.files);
    expect(uniqueFiles.size).toBe(result.files.length);
    expect(result.message).toMatch(/\.cursorrules/);
  });

  test('should format file list in readable format', async () => {
    // Given: User has approved changes
    const changes = [createMockRuleSuggestion('1', 'Rule 1')];
    const decisions = new Map<number, DecisionType>([[0, DecisionType.APPROVED]]);
    const state = createMockNavigationState(changes, decisions);

    // When: Consent prompt is displayed
    const result = await consentManager.initiateConsent(state);

    // Then: File list is in clear, readable format
    expect(result.message).toMatch(/\[\+\] \d+ approved changes will be applied to: [^]+\. Confirm:/);
    expect(result.files).toEqual(expect.any(Array));
  });
});
