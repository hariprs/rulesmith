/**
 * Story 4-3: Edit Proposed Changes - Integration-Level Tests (TDD Red Phase)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * These tests are written BEFORE implementation to specify behavior.
 * All tests should FAIL initially and pass after implementation.
 *
 * Test Pyramid Strategy:
 * - Integration Tests: Component interactions, state persistence, workflow integration
 * - Focus: How components work together (CommandParser + DecisionProcessor + StateManager + AuditLogger)
 * - Priority: Testing integration points between Stories 4.1, 4.2, and 4.3
 *
 * @module tests/integration/story-4-3-edit-integration
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CommandParser } from '../../src/review/command-parser.js';
import { DecisionProcessor } from '../../src/review/decision-processor.js';
import { MarkdownFormatter } from '../../src/review/markdown-formatter.js';
import { StateManager } from '../../src/review/state-manager.js';
import { AuditLogger } from '../../src/review/audit-logger.js';
import { InterfaceManager } from '../../src/review/interface-manager.js';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types.js';
import { DecisionType, NavigationState } from '../../src/review/types.js';
import { Pattern, PatternCategory } from '../../src/pattern-detector/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create realistic pattern for integration testing
 */
const createTestPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript',
      user_correction: 'Use TypeScript with strict mode',
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

/**
 * Create realistic rule suggestion for integration testing
 */
const createTestRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createTestPattern(),
  ruleText: 'Always use TypeScript strict mode.',
  explanation: 'Improves type safety.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

/**
 * Create realistic Epic 3 output for integration testing
 */
const createEpic3Output = (): RuleSuggestion[] => {
  return [
    createTestRuleSuggestion({
      id: 'rule-1',
      ruleText: 'Use TypeScript strict mode in all projects.',
    }),
    createTestRuleSuggestion({
      id: 'rule-2',
      ruleText: 'Prefer const over let for immutable variables.',
    }),
    createTestRuleSuggestion({
      id: 'rule-3',
      ruleText: 'Add JSDoc comments to all public functions.',
    }),
    createTestRuleSuggestion({
      id: 'rule-4',
      ruleText: 'Use async/await instead of Promise chains.',
    }),
    createTestRuleSuggestion({
      id: 'rule-5',
      ruleText: 'Implement error boundaries in React components.',
    }),
  ];
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Story 4-3: Edit Proposed Changes - Integration Tests', () => {
  let commandParser: CommandParser;
  let decisionProcessor: DecisionProcessor;
  let markdownFormatter: MarkdownFormatter;
  let stateManager: StateManager;
  let auditLogger: AuditLogger;
  let interfaceManager: InterfaceManager;
  let tempDir: string;
  let sessionFilePath: string;
  let auditLogPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-4-3-integration-'));
    sessionFilePath = path.join(tempDir, 'review-session.json');
    auditLogPath = path.join(tempDir, 'review-audit.log');

    stateManager = new StateManager(tempDir);
    auditLogger = new AuditLogger(tempDir);
    commandParser = new CommandParser();
    decisionProcessor = new DecisionProcessor(stateManager, auditLogger);
    markdownFormatter = new MarkdownFormatter();
    interfaceManager = new InterfaceManager();

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    jest.restoreAllMocks();
  });

  // ========================================================================
  // INTEGRATION TEST 1: Edit State Persistence
  // ========================================================================

  describe('Integration Test 1: Edit State Persistence', () => {
    it('should persist edited_rule across session reload', async () => {
      const changes = createEpic3Output();
      const initialState = await stateManager.initializeSession(changes);

      // Edit change #5
      const editResult = await decisionProcessor.edit(4, 'Edited rule #5', initialState);
      await stateManager.saveState(editResult.nextState);

      // Simulate session reload by creating new StateManager
      const newStateManager = new StateManager(tempDir);
      const reloadedState = await newStateManager.loadState();

      expect(reloadedState).toBeDefined();
      expect(reloadedState.changes[4]).toHaveProperty('edited_rule');
      expect(reloadedState.changes[4].edited_rule).toBe('Edited rule #5');
    });

    it('should persist original_rule across session reload', async () => {
      const changes = createEpic3Output();
      const originalRule = changes[3].ruleText;
      const initialState = await stateManager.initializeSession(changes);

      // Edit change #4
      const editResult = await decisionProcessor.edit(3, 'Edited rule #4', initialState);
      await stateManager.saveState(editResult.nextState);

      // Reload session
      const newStateManager = new StateManager(tempDir);
      const reloadedState = await newStateManager.loadState();

      expect(reloadedState.changes[3]).toHaveProperty('original_rule');
      expect(reloadedState.changes[3].original_rule).toBe(originalRule);
    });

    it('should persist EDITED decision type across session reload', async () => {
      const changes = createEpic3Output();
      const initialState = await stateManager.initializeSession(changes);

      // Edit change #2
      const editResult = await decisionProcessor.edit(1, 'Edited rule #2', initialState);
      await stateManager.saveState(editResult.nextState);

      // Reload session
      const newStateManager = new StateManager(tempDir);
      const reloadedState = await newStateManager.loadState();

      expect(reloadedState.decisions.get(1)).toBe(DecisionType.EDITED);
    });

    it('should handle session crash during edit gracefully', async () => {
      const changes = createEpic3Output();
      const initialState = await stateManager.initializeSession(changes);

      // Edit change #3
      const editResult = await decisionProcessor.edit(2, 'Edited rule #3', initialState);

      // Simulate crash: state saved but partial write
      await stateManager.saveState(editResult.nextState);

      // Verify recovery
      const recoveredState = await stateManager.loadState();
      expect(recoveredState.changes[2].edited_rule).toBe('Edited rule #3');
    });
  });

  // ========================================================================
  // INTEGRATION TEST 2: Edit Workflow Integration
  // ========================================================================

  describe('Integration Test 2: Edit Workflow Integration', () => {
    it('should integrate edit → approve workflow seamlessly', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Edit change #3
      const editResult = await decisionProcessor.edit(2, 'Edited rule #3', state);
      expect(editResult.success).toBe(true);
      expect(editResult.nextState.changes[2].edited_rule).toBe('Edited rule #3');

      // Approve edited change #3
      const approveResult = await decisionProcessor.approve(2, editResult.nextState);
      expect(approveResult.success).toBe(true);
      expect(approveResult.nextState.decisions.get(2)).toBe(DecisionType.APPROVED);
    });

    it('should integrate edit → reject → edit → approve workflow', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Edit change #4
      const result1 = await decisionProcessor.edit(3, 'First edit #4', state);
      expect(result1.nextState.decisions.get(3)).toBe(DecisionType.EDITED);

      // Reject change #4
      const result2 = await decisionProcessor.reject(3, result1.nextState);
      expect(result2.nextState.decisions.get(3)).toBe(DecisionType.REJECTED);

      // Edit change #4 again
      const result3 = await decisionProcessor.edit(3, 'Second edit #4', result2.nextState);
      expect(result3.nextState.decisions.get(3)).toBe(DecisionType.EDITED);

      // Approve change #4
      const result4 = await decisionProcessor.approve(3, result3.nextState);
      expect(result4.nextState.decisions.get(3)).toBe(DecisionType.APPROVED);
    });

    it('should update state correctly after each workflow action', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Initial state
      expect(state.decisions.get(0)).toBeUndefined();

      // Edit change #1
      const result1 = await decisionProcessor.edit(0, 'Edited #1', state);
      expect(result1.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
      expect(result1.nextState.changes[0].edited_rule).toBe('Edited #1');

      // Approve change #1
      const result2 = await decisionProcessor.approve(0, result1.nextState);
      expect(result2.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(result2.nextState.changes[0].edited_rule).toBe('Edited #1'); // preserved
    });

    it('should integrate with Story 4.2 approve logic using edited_rule', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const originalRule = state.changes[0].ruleText;
      const editedRule = 'Edited version of rule';

      // Edit change #1
      const editResult = await decisionProcessor.edit(0, editedRule, state);

      // Approve should use edited_rule
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      // Verify the edited version is what gets applied
      expect(approveResult.nextState.changes[0].edited_rule).toBe(editedRule);
      expect(approveResult.nextState.changes[0].original_rule).toBe(originalRule);
    });
  });

  // ========================================================================
  // INTEGRATION TEST 3: Audit Log Accuracy
  // ========================================================================

  describe('Integration Test 3: Audit Log Accuracy', () => {
    it('should log edit operation to results.jsonl (review-audit.log)', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      await decisionProcessor.edit(0, 'Edited rule #1', state);

      expect(fs.existsSync(auditLogPath)).toBe(true);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logLines = logContent.trim().split('\n');

      expect(logLines.length).toBeGreaterThanOrEqual(1);

      const logEntry = JSON.parse(logLines[0]);
      expect(logEntry.action).toBe('edit');
      expect(logEntry.changeIndex).toBe(0);
    });

    it('should log both original and edited versions', async () => {
      const changes = createEpic3Output();
      const originalRule = changes[1].ruleText;
      const editedRule = 'Edited rule #2';
      const state = await stateManager.initializeSession(changes);

      await decisionProcessor.edit(1, editedRule, state);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      expect(logEntry).toHaveProperty('original_rule');
      expect(logEntry).toHaveProperty('edited_rule');
      expect(logEntry.original_rule).toBe(originalRule);
      expect(logEntry.edited_rule).toBe(editedRule);
    });

    it('should log edit overwrites with both timestamps', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // First edit
      await decisionProcessor.edit(2, 'First edit #3', state);

      // Second edit
      await decisionProcessor.edit(2, 'Second edit #3', state);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logLines = logContent.trim().split('\n');

      expect(logLines.length).toBeGreaterThanOrEqual(2);

      const entry1 = JSON.parse(logLines[0]);
      const entry2 = JSON.parse(logLines[1]);

      expect(entry1.action).toBe('edit');
      expect(entry2.action).toBe('edit');
      expect(entry1.timestamp).toBeDefined();
      expect(entry2.timestamp).toBeDefined();
      expect(entry1.timestamp).not.toBe(entry2.timestamp);
    });

    it('should match Story 4.2 audit log format', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Approve a change to generate Story 4.2 format log
      await decisionProcessor.approve(0, state);

      // Edit a change to generate Story 4.3 format log
      const editResult = await decisionProcessor.edit(1, 'Edited #2', state);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logLines = logContent.trim().split('\n');

      const approveEntry = JSON.parse(logLines[0]);
      const editEntry = JSON.parse(logLines[1]);

      // Both should have same format
      expect(approveEntry).toHaveProperty('timestamp');
      expect(approveEntry).toHaveProperty('action');
      expect(approveEntry).toHaveProperty('changeIndex');

      expect(editEntry).toHaveProperty('timestamp');
      expect(editEntry).toHaveProperty('action');
      expect(editEntry).toHaveProperty('changeIndex');

      // Edit entry should have additional fields
      expect(editEntry).toHaveProperty('original_rule');
      expect(editEntry).toHaveProperty('edited_rule');
    });

    it('should include processing time in audit log', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      await decisionProcessor.edit(0, 'Edited rule #1', state);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      expect(logEntry).toHaveProperty('processingTimeMs');
      expect(typeof logEntry.processingTimeMs).toBe('number');
    });
  });

  // ========================================================================
  // INTEGRATION TEST 4: Rule Application End-to-End
  // ========================================================================

  describe('Integration Test 4: Rule Application End-to-End', () => {
    it('should apply edited versions when approving multiple edits', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Edit multiple changes
      const result1 = await decisionProcessor.edit(0, 'Edited #1', state);
      const result2 = await decisionProcessor.edit(2, 'Edited #3', result1.nextState);
      const result3 = await decisionProcessor.edit(4, 'Edited #5', result2.nextState);

      // Approve all edited changes
      const result4 = await decisionProcessor.approve(0, result3.nextState);
      const result5 = await decisionProcessor.approve(2, result4.nextState);
      const result6 = await decisionProcessor.approve(4, result5.nextState);

      // Verify all edited versions are tracked
      expect(result6.nextState.changes[0].edited_rule).toBe('Edited #1');
      expect(result6.nextState.changes[2].edited_rule).toBe('Edited #3');
      expect(result6.nextState.changes[4].edited_rule).toBe('Edited #5');
    });

    it('should never apply suggested_rule when edited_rule exists', async () => {
      const changes = createEpic3Output();
      const originalRule = changes[0].ruleText;
      const editedRule = 'Different edited version';
      const state = await stateManager.initializeSession(changes);

      // Edit and approve
      const editResult = await decisionProcessor.edit(0, editedRule, state);
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      // Verify edited_rule is used, not suggested_rule
      expect(approveResult.nextState.changes[0].edited_rule).toBe(editedRule);
      expect(approveResult.nextState.changes[0].original_rule).toBe(originalRule);

      // The approved change should use edited_rule
      expect(approveResult.nextState.changes[0].edited_rule).not.toBe(originalRule);
    });

    it('should integrate with Story 4.2 rule application logic', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Test with existing Story 4.2 approve logic
      const originalRule = state.changes[0].ruleText;

      // Edit the change
      const editResult = await decisionProcessor.edit(0, 'Edited version', state);

      // Approve using Story 4.2 approve() method
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      // The approval should acknowledge the edited version
      expect(approveResult.nextState.changes[0].edited_rule).toBe('Edited version');
      expect(approveResult.nextState.changes[0].original_rule).toBe(originalRule);
    });
  });

  // ========================================================================
  // INTEGRATION TEST 5: Security End-to-End
  // ========================================================================

  describe('Integration Test 5: Security End-to-End', () => {
    it('should sanitize malicious payloads before storage', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const maliciousPayloads = [
        '<script>alert("xss")</script>Rule',
        '<img src=x onerror=alert(1)>Rule',
        'javascript:alert(1)Rule',
        '<iframe src="javascript:alert(1)"></iframe>Rule',
      ];

      for (const payload of maliciousPayloads) {
        const result = await decisionProcessor.edit(0, payload, state);

        expect(result.success).toBe(true);
        expect(result.nextState.changes[0].edited_rule).not.toContain('<script>');
        expect(result.nextState.changes[0].edited_rule).not.toContain('<iframe');
        expect(result.nextState.changes[0].edited_rule).not.toContain('javascript:');
      }
    });

    it('should sanitize malicious payloads before display', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const maliciousInput = '<script>alert("xss")</script>Rule text';
      const editResult = await decisionProcessor.edit(0, maliciousInput, state);

      // Display the edited change
      const markdown = markdownFormatter.formatChanges(
        editResult.nextState.changes,
        editResult.nextState.decisions,
        0
      );

      // Displayed content should be sanitized
      expect(markdown).not.toContain('<script>');
      expect(markdown).not.toContain('</script>');
    });

    it('should store sanitized versions in audit log only', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const maliciousInput = '<script>alert("xss")</script>Rule';
      await decisionProcessor.edit(0, maliciousInput, state);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      // Audit log should contain sanitized version
      expect(logEntry.edited_rule).not.toContain('<script>');
      expect(logEntry.edited_rule).not.toContain('</script>');
    });

    it('should match Story 4.1 sanitization patterns', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Use same test vectors as Story 4.1
      const testInputs = [
        '<script>alert(1)</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="evil.com"></iframe>',
      ];

      for (const input of testInputs) {
        const result = await decisionProcessor.edit(0, input, state);

        // Should sanitize the same way as Story 4.1
        expect(result.success).toBe(true);
        expect(result.nextState.changes[0].edited_rule).toBeDefined();
      }
    });
  });

  // ========================================================================
  // INTEGRATION TEST 6: Performance Test
  // ========================================================================

  describe('Integration Test 6: Performance Test', () => {
    it('should process 1-character edit in less than 100ms', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const start = Date.now();
      await decisionProcessor.edit(0, 'A', state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should process 10-character edit in less than 100ms', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const start = Date.now();
      await decisionProcessor.edit(0, 'A'.repeat(10), state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should process 100-character edit in less than 100ms', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const start = Date.now();
      await decisionProcessor.edit(0, 'A'.repeat(100), state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should process 1000-character edit in less than 100ms', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const start = Date.now();
      await decisionProcessor.edit(0, 'A'.repeat(1000), state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should meet p95 target across 100 edits', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);
      const timings: number[] = [];

      for (let i = 0; i < 100; i++) {
        const start = Date.now();
        await decisionProcessor.edit(0, `Edit ${i}`, state);
        const end = Date.now();
        timings.push(end - start);
      }

      timings.sort((a, b) => a - b);
      const p95Index = Math.floor(timings.length * 0.95);
      const p95 = timings[p95Index];

      expect(p95).toBeLessThan(100);
    });

    it('should not leak memory during 100 edits', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 100; i++) {
        await decisionProcessor.edit(0, `Edit ${i}`, state);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryGrowth = finalMemory - initialMemory;

      // Allow some growth but not excessive (e.g., < 10MB)
      expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024);
    });

    it('should compare performance against Story 4.2 baseline', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Measure approve performance (Story 4.2 baseline)
      const approveStart = Date.now();
      await decisionProcessor.approve(0, state);
      const approveEnd = Date.now();
      const approveTime = approveEnd - approveStart;

      // Measure edit performance (Story 4.3)
      const editStart = Date.now();
      await decisionProcessor.edit(0, 'Edited text', state);
      const editEnd = Date.now();
      const editTime = editEnd - editStart;

      // Edit should be comparable to approve (within 2x)
      expect(editTime).toBeLessThan(approveTime * 2);
    });
  });

  // ========================================================================
  // INTEGRATION WITH STORIES 4.1 AND 4.2
  // ========================================================================

  describe('Integration with Stories 4.1 and 4.2', () => {
    it('should extend CommandParser from Story 4.2', () => {
      // Test that edit commands are recognized
      const editCommands = ['edit #1', 'modify #2', 'change #3', 'update #4'];

      editCommands.forEach((command) => {
        const result = commandParser.parse(command);
        expect(result.commandType).toBe('edit');
        expect(result.isValid).toBe(true);
      });
    });

    it('should extend DecisionProcessor from Story 4.2', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Test that edit() method exists and works
      const result = await decisionProcessor.edit(0, 'Edited text', state);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.nextState).toBeDefined();
    });

    it('should extend StateManager from Story 4.2', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Edit a change
      const editResult = await decisionProcessor.edit(0, 'Edited text', state);

      // Save state
      await stateManager.saveState(editResult.nextState);

      // Verify state file exists and contains edited_rule
      expect(fs.existsSync(sessionFilePath)).toBe(true);

      const sessionData = JSON.parse(fs.readFileSync(sessionFilePath, 'utf-8'));
      expect(sessionData.changes[0]).toHaveProperty('edited_rule');
      expect(sessionData.changes[0].edited_rule).toBe('Edited text');
    });

    it('should extend AuditLogger from Story 4.2', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Edit a change
      await decisionProcessor.edit(0, 'Edited text', state);

      // Verify audit log entry exists
      expect(fs.existsSync(auditLogPath)).toBe(true);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      expect(logEntry.action).toBe('edit');
      expect(logEntry).toMatchObject({
        timestamp: expect.any(String),
        changeIndex: 0,
        edited_rule: 'Edited text',
      });
    });

    it('should extend MarkdownFormatter from Story 4.1', () => {
      const changes = createEpic3Output();
      changes[0].edited_rule = 'Edited text';
      changes[0].original_rule = 'Original text';

      const markdown = markdownFormatter.formatChanges(
        changes,
        new Map([[0, DecisionType.EDITED]]),
        0
      );

      // Should display [EDITED] marker
      expect(markdown).toContain('[EDITED]');
      expect(markdown).toContain('Edited text');
    });

    it('should maintain backward compatibility with Story 4.2 decisions', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Approve a change using Story 4.2 logic
      const approveResult = await decisionProcessor.approve(0, state);

      // Edit should work on approved changes
      const editResult = await decisionProcessor.edit(0, 'Edited text', approveResult.nextState);

      expect(editResult.success).toBe(true);
      expect(editResult.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
    });

    it('should not break existing Story 4.1 display functionality', () => {
      const changes = createEpic3Output();

      // Test that non-edited changes still display correctly
      const markdown = markdownFormatter.formatChanges(
        changes,
        new Map([[0, DecisionType.PENDING]]),
        0
      );

      expect(markdown).toContain(changes[0].ruleText);
      expect(markdown).not.toContain('[EDITED]');
    });
  });

  // ========================================================================
  // REGRESSION TESTS
  // ========================================================================

  describe('Regression Tests: Stories 4.1 and 4.2 Functionality', () => {
    it('should still allow approving changes without editing', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const result = await decisionProcessor.approve(0, state);

      expect(result.success).toBe(true);
      expect(result.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
    });

    it('should still allow rejecting changes', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      const result = await decisionProcessor.reject(0, state);

      expect(result.success).toBe(true);
      expect(result.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);
    });

    it('should still recognize approve/reject commands from Story 4.2', () => {
      const approveCommands = ['approve', 'yes', 'accept'];
      const rejectCommands = ['reject', 'no', 'skip'];

      approveCommands.forEach((command) => {
        const result = commandParser.parse(command);
        expect(result.commandType).toBe('approve');
      });

      rejectCommands.forEach((command) => {
        const result = commandParser.parse(command);
        expect(result.commandType).toBe('reject');
      });
    });

    it('should still persist state for non-edited decisions', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Approve a change
      const approveResult = await decisionProcessor.approve(0, state);
      await stateManager.saveState(approveResult.nextState);

      // Reload and verify
      const newStateManager = new StateManager(tempDir);
      const reloadedState = await newStateManager.loadState();

      expect(reloadedState.decisions.get(0)).toBe(DecisionType.APPROVED);
    });
  });

  // ========================================================================
  // ERROR HANDLING INTEGRATION
  // ========================================================================

  describe('Error Handling Integration', () => {
    it('should handle edit failures gracefully without corrupting state', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Attempt invalid edit (empty text)
      const invalidResult = await decisionProcessor.edit(0, '', state);

      expect(invalidResult.success).toBe(false);

      // Verify state is not corrupted
      expect(invalidResult.nextState).toBeDefined();
      expect(invalidResult.nextState.changes).toHaveLength(changes.length);
    });

    it('should handle concurrent edit operations safely', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Simulate rapid edits
      const promises = [
        decisionProcessor.edit(0, 'Edit 1', state),
        decisionProcessor.edit(0, 'Edit 2', state),
        decisionProcessor.edit(0, 'Edit 3', state),
      ];

      const results = await Promise.all(promises);

      // All should complete without errors
      results.forEach((result) => {
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });
    });

    it('should recover from corrupted session file', async () => {
      const changes = createEpic3Output();
      const state = await stateManager.initializeSession(changes);

      // Save valid state
      await stateManager.saveState(state);

      // Corrupt the session file
      fs.writeFileSync(sessionFilePath, 'corrupted data', 'utf-8');

      // Attempt to load - should handle gracefully
      const recoveredState = await stateManager.loadState();

      // Should either recover or return new state
      expect(recoveredState).toBeDefined();
    });
  });
});
