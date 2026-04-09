/**
 * Story 4-3: Edit Proposed Changes - API-Level Acceptance Tests (TDD Red Phase)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * These tests are written BEFORE implementation to specify behavior.
 * All tests should FAIL initially and pass after implementation.
 *
 * Test Pyramid Strategy:
 * - API-Level Tests: Business logic, command parsing, validation, sanitization
 * - Focus: Unit-level testing of individual functions and methods
 * - Priority: Fast, isolated tests for core functionality
 *
 * @module tests/api/story-4-3-edit-acceptance
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CommandParser } from '../../src/review/command-parser.js';
import { DecisionProcessor } from '../../src/review/decision-processor.js';
import { MarkdownFormatter } from '../../src/review/markdown-formatter.js';
import { StateManager } from '../../src/review/state-manager.js';
import { AuditLogger } from '../../src/review/audit-logger.js';
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
 * Create realistic pattern for testing
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
 * Create realistic rule suggestion for testing
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
 * Create test navigation state
 */
const createTestState = (overrides?: Partial<NavigationState>): NavigationState => ({
  currentIndex: 0,
  changes: [
    createTestRuleSuggestion({ id: 'rule-1', ruleText: 'First rule' }),
    createTestRuleSuggestion({ id: 'rule-2', ruleText: 'Second rule' }),
    createTestRuleSuggestion({ id: 'rule-3', ruleText: 'Third rule' }),
  ],
  decisions: new Map(),
  sessionId: 'test-session-123',
  lastActivity: new Date(),
  totalChanges: 3,
  ...overrides,
});

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Story 4-3: Edit Proposed Changes - API-Level Acceptance Tests', () => {
  let commandParser: CommandParser;
  let decisionProcessor: DecisionProcessor;
  let markdownFormatter: MarkdownFormatter;
  let stateManager: StateManager;
  let auditLogger: AuditLogger;
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'story-4-3-test-'));
    stateManager = new StateManager(tempDir);
    auditLogger = new AuditLogger(tempDir);
    commandParser = new CommandParser();
    decisionProcessor = new DecisionProcessor(stateManager, auditLogger);
    markdownFormatter = new MarkdownFormatter();

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
  // AC1: Edit Command Recognition
  // ========================================================================

  describe('AC1: Edit Command Recognition', () => {
    it('should recognize "edit #2" command', () => {
      const input = 'edit #2';
      const result = commandParser.parse(input);

      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it('should recognize "modify #3" command', () => {
      const input = 'modify #3';
      const result = commandParser.parse(input);

      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(3);
      expect(result.isValid).toBe(true);
    });

    it('should recognize "change #5" command', () => {
      const input = 'change #5';
      const result = commandParser.parse(input);

      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(5);
      expect(result.isValid).toBe(true);
    });

    it('should recognize "update #7" command', () => {
      const input = 'update #7';
      const result = commandParser.parse(input);

      expect(result.commandType).toBe('edit');
      expect(result.targetIndex).toBe(7);
      expect(result.isValid).toBe(true);
    });

    it('should be case insensitive for edit commands', () => {
      const variations = ['EDIT #2', 'Edit #3', 'EDIT #4', 'eDiT #5'];

      variations.forEach((input) => {
        const result = commandParser.parse(input);
        expect(result.commandType).toBe('edit');
        expect(result.isValid).toBe(true);
      });
    });

    it('should work without # prefix', () => {
      const variations = ['edit 2', 'modify 3', 'change 5', 'update 7'];

      variations.forEach((input) => {
        const result = commandParser.parse(input);
        expect(result.commandType).toBe('edit');
        expect(result.isValid).toBe(true);
      });
    });
  });

  // ========================================================================
  // AC2: Edit Validation
  // ========================================================================

  describe('AC2: Edit Validation', () => {
    it('should reject empty edited text', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const editedText = '';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
      expect(result.error).toBeDefined();
    });

    it('should reject whitespace-only edited text', async () => {
      const state = createTestState();
      const editedText = '   \n\t  ';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(false);
      expect(result.message).toContain('empty');
    });

    it('should reject edited text identical to original', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const editedText = originalRule;

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(false);
      expect(result.message).toContain('identical');
      expect(result.message).toContain('different');
    });

    it('should accept valid edited text that differs from original', async () => {
      const state = createTestState();
      const editedText = 'Modified rule text that is different';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(true);
      expect(result.message).not.toContain('identical');
      expect(result.error).toBeUndefined();
    });

    it('should provide clear error message for empty edit', async () => {
      const state = createTestState();
      const result = await decisionProcessor.edit(0, '', state);

      expect(result.message).toMatch(/(empty|cannot be empty|required)/i);
    });

    it('should provide clear error message for identical edit', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const result = await decisionProcessor.edit(0, originalRule, state);

      expect(result.message).toMatch(/(identical|same|must differ|different)/i);
    });
  });

  // ========================================================================
  // AC3: Original Suggestion Preservation
  // ========================================================================

  describe('AC3: Original Suggestion Preservation', () => {
    it('should store original suggestion in original_rule field', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const editedText = 'Edited version of the rule';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0]).toHaveProperty('original_rule');
      expect(result.nextState.changes[0].original_rule).toBe(originalRule);
    });

    it('should preserve original suggestion exactly as provided', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const editedText = 'New rule text';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.nextState.changes[0].original_rule).toBe(originalRule);
      expect(result.nextState.changes[0].original_rule).not.toBe(editedText);
    });

    it('should not modify original_rule when editing again', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;

      // First edit
      const result1 = await decisionProcessor.edit(0, 'First edit', state);
      const originalAfterFirstEdit = result1.nextState.changes[0].original_rule;

      // Second edit
      const result2 = await decisionProcessor.edit(0, 'Second edit', result1.nextState);
      const originalAfterSecondEdit = result2.nextState.changes[0].original_rule;

      expect(originalAfterFirstEdit).toBe(originalRule);
      expect(originalAfterSecondEdit).toBe(originalRule);
    });
  });

  // ========================================================================
  // AC4: Edited Version Storage
  // ========================================================================

  describe('AC4: Edited Version Storage', () => {
    it('should store edited text in edited_rule field', async () => {
      const state = createTestState();
      const editedText = 'This is the edited rule text';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0]).toHaveProperty('edited_rule');
      expect(result.nextState.changes[0].edited_rule).toBe(editedText);
    });

    it('should store edited text exactly as provided (after sanitization)', async () => {
      const state = createTestState();
      const editedText = 'Valid edited rule text';

      const result = await decisionProcessor.edit(0, editedText, state);

      expect(result.nextState.changes[0].edited_rule).toBe(editedText);
    });

    it('should not have edited_rule before editing', () => {
      const state = createTestState();

      expect(state.changes[0]).not.toHaveProperty('edited_rule');
      expect(state.changes[0].edited_rule).toBeUndefined();
    });
  });

  // ========================================================================
  // AC5: Visual Marker Display
  // ========================================================================

  describe('AC5: Visual Marker Display', () => {
    it('should display [EDITED] prefix for edited changes', () => {
      const changes = createTestState().changes;
      changes[0].edited_rule = 'Edited rule text';
      changes[0].original_rule = 'Original rule text';

      const markdown = markdownFormatter.formatChanges(changes, new Map([[0, DecisionType.EDITED]]), 0);

      expect(markdown).toContain('[EDITED]');
      expect(markdown).toContain('#1');
    });

    it('should display edited text instead of original', () => {
      const changes = createTestState().changes;
      changes[0].edited_rule = 'Edited rule text';
      changes[0].original_rule = 'Original rule text';

      const markdown = markdownFormatter.formatChanges(changes, new Map([[0, DecisionType.EDITED]]), 0);

      expect(markdown).toContain('Edited rule text');
      expect(markdown).not.toContain('Original rule text');
    });

    it('should not display [EDITED] for non-edited changes', () => {
      const changes = createTestState().changes;

      const markdown = markdownFormatter.formatChanges(changes, new Map([[0, DecisionType.PENDING]]), 0);

      expect(markdown).not.toContain('[EDITED]');
    });

    it('should maintain numbered references with [EDITED] marker', () => {
      const changes = createTestState().changes;
      changes[0].edited_rule = 'Edited text';

      const markdown = markdownFormatter.formatChanges(changes, new Map([[0, DecisionType.EDITED]]), 0);

      expect(markdown).toMatch(/\[EDITED\]\s*#1/);
    });
  });

  // ========================================================================
  // AC6: Audit Logging
  // ========================================================================

  describe('AC6: Audit Logging', () => {
    it('should log edit operation to audit log', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      expect(fs.existsSync(auditLogPath)).toBe(true);

      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      expect(logContent).toContain('"action":"edit"');
      expect(logContent).toContain('"changeIndex":0');
    });

    it('should include timestamp in ISO 8601 format', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');

      expect(logContent).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should include original suggestion in audit log', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');

      expect(logContent).toContain(`"original_rule":"${originalRule}"`);
    });

    it('should include edited version in audit log', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');

      expect(logContent).toContain(`"edited_rule":"${editedText}"`);
    });

    it('should match Story 4.2 audit log format', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry).toHaveProperty('action');
      expect(logEntry).toHaveProperty('changeIndex');
      expect(logEntry.action).toBe('edit');
    });
  });

  // ========================================================================
  // AC7: Rule Application Logic
  // ========================================================================

  describe('AC7: Rule Application Logic', () => {
    it('should apply edited_rule when present', async () => {
      const state = createTestState();
      const editedText = 'Edited rule to apply';
      const originalRule = state.changes[0].ruleText;

      // Edit the change
      const editResult = await decisionProcessor.edit(0, editedText, state);

      // Approve the edited change
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      // Verify edited version is applied
      expect(approveResult.success).toBe(true);
      // The actual rule application would be verified in integration tests
    });

    it('should not apply suggested_rule when edited_rule exists', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';
      const originalRule = state.changes[0].ruleText;

      const editResult = await decisionProcessor.edit(0, editedText, state);
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      // Verify the edited version is used, not the original
      expect(editResult.nextState.changes[0].edited_rule).toBe(editedText);
      expect(editResult.nextState.changes[0].edited_rule).not.toBe(originalRule);
    });

    it('should fall back to suggested_rule when no edited_rule', async () => {
      const state = createTestState();

      // Approve without editing
      const approveResult = await decisionProcessor.approve(0, state);

      expect(approveResult.success).toBe(true);
      expect(state.changes[0].edited_rule).toBeUndefined();
    });
  });

  // ========================================================================
  // AC8: Decision Overwrite
  // ========================================================================

  describe('AC8: Decision Overwrite', () => {
    it('should overwrite previous edit with new edit', async () => {
      const state = createTestState();
      const firstEdit = 'First edited text';
      const secondEdit = 'Second edited text';

      const result1 = await decisionProcessor.edit(0, firstEdit, state);
      const result2 = await decisionProcessor.edit(0, secondEdit, result1.nextState);

      expect(result2.nextState.changes[0].edited_rule).toBe(secondEdit);
      expect(result2.nextState.changes[0].edited_rule).not.toBe(firstEdit);
    });

    it('should log both edits to audit trail with timestamps', async () => {
      const state = createTestState();
      const firstEdit = 'First edited text';
      const secondEdit = 'Second edited text';

      await decisionProcessor.edit(0, firstEdit, state);
      await decisionProcessor.edit(0, secondEdit, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logLines = logContent.trim().split('\n');

      expect(logLines.length).toBeGreaterThanOrEqual(2);

      const entry1 = JSON.parse(logLines[0]);
      const entry2 = JSON.parse(logLines[1]);

      expect(entry1.action).toBe('edit');
      expect(entry2.action).toBe('edit');
      expect(entry1.edited_rule).toBe(firstEdit);
      expect(entry2.edited_rule).toBe(secondEdit);
      expect(entry1.timestamp).toBeDefined();
      expect(entry2.timestamp).toBeDefined();
    });

    it('should show edit history in audit trail', async () => {
      const state = createTestState();
      const originalRule = state.changes[0].ruleText;
      const firstEdit = 'First edited text';
      const secondEdit = 'Second edited text';

      await decisionProcessor.edit(0, firstEdit, state);
      await decisionProcessor.edit(0, secondEdit, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logLines = logContent.trim().split('\n');

      const entry1 = JSON.parse(logLines[0]);
      const entry2 = JSON.parse(logLines[1]);

      // Verify history: original → first edit → second edit
      expect(entry1.original_rule).toBe(originalRule);
      expect(entry1.edited_rule).toBe(firstEdit);
      expect(entry2.original_rule).toBe(originalRule);
      expect(entry2.edited_rule).toBe(secondEdit);
    });

    it('should overwrite edited_rule in ChangeRequest', async () => {
      const state = createTestState();
      const firstEdit = 'First edit';
      const secondEdit = 'Second edit';

      const result1 = await decisionProcessor.edit(0, firstEdit, state);
      const result2 = await decisionProcessor.edit(0, secondEdit, result1.nextState);

      expect(result2.nextState.changes[0].edited_rule).toBe(secondEdit);
    });

    it('should overwrite EDITED decision in state.decisions Map', async () => {
      const state = createTestState();
      const firstEdit = 'First edit';
      const secondEdit = 'Second edit';

      const result1 = await decisionProcessor.edit(0, firstEdit, state);
      expect(result1.nextState.decisions.get(0)).toBe(DecisionType.EDITED);

      const result2 = await decisionProcessor.edit(0, secondEdit, result1.nextState);
      expect(result2.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
    });
  });

  // ========================================================================
  // AC9: Error Handling
  // ========================================================================

  describe('AC9: Error Handling', () => {
    it('should handle invalid change number gracefully', async () => {
      const state = createTestState();
      const invalidIndex = 999;

      const result = await decisionProcessor.edit(invalidIndex, 'Edited text', state);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.message).toMatch(/(invalid|not found|out of range)/i);
    });

    it('should handle negative change number gracefully', async () => {
      const state = createTestState();
      const negativeIndex = -1;

      const result = await decisionProcessor.edit(negativeIndex, 'Edited text', state);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed edit command gracefully', () => {
      const invalidCommands = [
        'edit',
        'edit #',
        'edit abc',
        'modify #',
        '#',
        'edit #0',
      ];

      invalidCommands.forEach((command) => {
        const result = commandParser.parse(command);
        // Should not crash, should return some result
        expect(result).toBeDefined();
        expect(result.isValid).toBe(false);
      });
    });

    it('should provide clear error message for invalid change number', async () => {
      const state = createTestState();

      const result = await decisionProcessor.edit(999, 'Edited text', state);

      expect(result.message).toBeDefined();
      expect(result.message.length).toBeGreaterThan(0);
      expect(result.message).toMatch(/(invalid|not found|out of range|does not exist)/i);
    });

    it('should not crash on any invalid input', async () => {
      const state = createTestState();
      const invalidInputs = [
        { index: -1, text: 'test' },
        { index: 999, text: 'test' },
        { index: 0, text: '' },
        { index: NaN, text: 'test' },
        { index: 0, text: state.changes[0].ruleText },
      ];

      for (const input of invalidInputs) {
        const result = await decisionProcessor.edit(input.index, input.text, state);
        expect(result).toBeDefined();
        expect(result.success).toBe(false);
      }
    });
  });

  // ========================================================================
  // AC10: Security - Input Sanitization
  // ========================================================================

  describe('AC10: Security - Input Sanitization', () => {
    it('should sanitize HTML script tags', async () => {
      const state = createTestState();
      const maliciousInput = '<script>alert("xss")</script>Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('<script>');
      expect(result.nextState.changes[0].edited_rule).not.toContain('</script>');
    });

    it('should sanitize HTML iframe tags', async () => {
      const state = createTestState();
      const maliciousInput = '<iframe src="evil.com"></iframe>Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('<iframe');
      expect(result.nextState.changes[0].edited_rule).not.toContain('evil.com');
    });

    it('should sanitize javascript: URLs', async () => {
      const state = createTestState();
      const maliciousInput = 'javascript:alert(1)Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('javascript:');
    });

    it('should escape HTML entities', async () => {
      const state = createTestState();
      const input = '<div>Rule text</div>';

      const result = await decisionProcessor.edit(0, input, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('<div>');
      expect(result.nextState.changes[0].edited_rule).not.toContain('</div>');
    });

    it('should sanitize markdown links with javascript: targets', async () => {
      const state = createTestState();
      const maliciousInput = '[click](javascript:alert(1))Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('javascript:');
    });

    it('should sanitize data: URLs with HTML', async () => {
      const state = createTestState();
      const maliciousInput = '[dangerous](data:text/html,<script>alert(1)</script>)Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('data:text/html');
    });

    it('should sanitize SVG onload payloads', async () => {
      const state = createTestState();
      const maliciousInput = '<svg onload=alert(1)>Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('onload');
    });

    it('should sanitize img onerror payloads', async () => {
      const state = createTestState();
      const maliciousInput = '<img src=x onerror=alert(1)>Rule text';

      const result = await decisionProcessor.edit(0, maliciousInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('onerror');
    });
  });

  // ========================================================================
  // AC11: Performance - Edit Processing
  // ========================================================================

  describe('AC11: Performance - Edit Processing', () => {
    it('should process edit in less than 100ms (p95)', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      const start = Date.now();
      await decisionProcessor.edit(0, editedText, state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should process edit of 1000 characters in less than 100ms', async () => {
      const state = createTestState();
      const longText = 'A'.repeat(1000);

      const start = Date.now();
      await decisionProcessor.edit(0, longText, state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should process edit of 10000 characters in less than 100ms', async () => {
      const state = createTestState();
      const longText = 'A'.repeat(10000);

      const start = Date.now();
      await decisionProcessor.edit(0, longText, state);
      const end = Date.now();

      expect(end - start).toBeLessThan(100);
    });

    it('should meet p95 performance target across multiple edits', async () => {
      const state = createTestState();
      const timings: number[] = [];

      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        await decisionProcessor.edit(0, `Edit ${i}`, state);
        const end = Date.now();
        timings.push(end - start);
      }

      // Calculate p95
      timings.sort((a, b) => a - b);
      const p95Index = Math.floor(timings.length * 0.95);
      const p95 = timings[p95Index];

      expect(p95).toBeLessThan(100);
    });

    it('should include processing time in audit log', async () => {
      const state = createTestState();
      const editedText = 'Edited rule text';

      await decisionProcessor.edit(0, editedText, state);

      const auditLogPath = path.join(tempDir, 'review-audit.log');
      const logContent = fs.readFileSync(auditLogPath, 'utf-8');
      const logEntry = JSON.parse(logContent.trim().split('\n')[0]);

      expect(logEntry).toHaveProperty('processingTimeMs');
      expect(typeof logEntry.processingTimeMs).toBe('number');
      expect(logEntry.processingTimeMs).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // AC12: Integration with Approval Workflow
  // ========================================================================

  describe('AC12: Integration with Approval Workflow', () => {
    it('should allow editing after change is marked for approval', async () => {
      const state = createTestState();

      // First mark as approved
      const approveResult = await decisionProcessor.approve(0, state);
      expect(approveResult.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);

      // Then edit it
      const editResult = await decisionProcessor.edit(0, 'Edited text', approveResult.nextState);
      expect(editResult.success).toBe(true);
      expect(editResult.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
    });

    it('should allow editing after change is marked for rejection', async () => {
      const state = createTestState();

      // First mark as rejected
      const rejectResult = await decisionProcessor.reject(0, state);
      expect(rejectResult.nextState.decisions.get(0)).toBe(DecisionType.REJECTED);

      // Then edit it
      const editResult = await decisionProcessor.edit(0, 'Edited text', rejectResult.nextState);
      expect(editResult.success).toBe(true);
      expect(editResult.nextState.decisions.get(0)).toBe(DecisionType.EDITED);
    });

    it('should apply edited version seamlessly when approved', async () => {
      const state = createTestState();
      const editedText = 'Edited rule to apply';

      // Edit the change
      const editResult = await decisionProcessor.edit(0, editedText, state);

      // Approve the edited change
      const approveResult = await decisionProcessor.approve(0, editResult.nextState);

      expect(approveResult.success).toBe(true);
      expect(editResult.nextState.changes[0].edited_rule).toBe(editedText);
    });

    it('should maintain workflow consistency after edit', async () => {
      const state = createTestState();

      // Edit change #1
      const editResult1 = await decisionProcessor.edit(0, 'Edited #1', state);

      // Approve change #1
      const approveResult1 = await decisionProcessor.approve(0, editResult1.nextState);

      // Approve change #2 (not edited)
      const approveResult2 = await decisionProcessor.approve(1, approveResult1.nextState);

      expect(approveResult2.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(approveResult2.nextState.decisions.get(1)).toBe(DecisionType.APPROVED);
      expect(approveResult2.nextState.changes[0].edited_rule).toBe('Edited #1');
      expect(approveResult2.nextState.changes[1].edited_rule).toBeUndefined();
    });

    it('should integrate with existing approve/reject workflow', async () => {
      const state = createTestState();

      // Mixed workflow: edit, approve, reject, edit, approve
      const result1 = await decisionProcessor.edit(0, 'Edit #1', state);
      const result2 = await decisionProcessor.approve(0, result1.nextState);
      const result3 = await decisionProcessor.reject(1, result2.nextState);
      const result4 = await decisionProcessor.edit(2, 'Edit #3', result3.nextState);
      const result5 = await decisionProcessor.approve(2, result4.nextState);

      expect(result5.nextState.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(result5.nextState.decisions.get(1)).toBe(DecisionType.REJECTED);
      expect(result5.nextState.decisions.get(2)).toBe(DecisionType.APPROVED);
    });
  });

  // ========================================================================
  // ADDITIONAL SECURITY TESTS
  // ========================================================================

  describe('Security: Additional Edge Cases', () => {
    it('should handle SQL injection patterns (though not directly applicable)', async () => {
      const state = createTestState();
      const sqlInjection = "'; DROP TABLE rules; --";

      const result = await decisionProcessor.edit(0, sqlInjection, state);

      expect(result.success).toBe(true);
      // The text should be stored safely, not executed
      expect(result.nextState.changes[0].edited_rule).toContain('DROP TABLE');
    });

    it('should handle very long edits within limit', async () => {
      const state = createTestState();
      const maxValidText = 'A'.repeat(10000);

      const result = await decisionProcessor.edit(0, maxValidText, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBe(maxValidText);
    });

    it('should reject edits exceeding 10000 characters', async () => {
      const state = createTestState();
      const tooLongText = 'A'.repeat(10001);

      const result = await decisionProcessor.edit(0, tooLongText, state);

      expect(result.success).toBe(false);
      expect(result.message).toMatch(/(too long|maximum|exceeds)/i);
    });

    it('should handle null byte injection attempts', async () => {
      const state = createTestState();
      const nullByteInput = 'Rule\u0000Text';

      const result = await decisionProcessor.edit(0, nullByteInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).not.toContain('\u0000');
    });

    it('should handle Unicode normalization attacks', async () => {
      const state = createTestState();
      // Unicode homograph attack
      const unicodeInput = 'Rule\u0131text';  // ı instead of i

      const result = await decisionProcessor.edit(0, unicodeInput, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBeDefined();
    });
  });

  // ========================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // ========================================================================

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle editing the first change (index 0)', async () => {
      const state = createTestState();

      const result = await decisionProcessor.edit(0, 'Edited #0', state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBe('Edited #0');
    });

    it('should handle editing the last change', async () => {
      const state = createTestState();
      const lastIndex = state.changes.length - 1;

      const result = await decisionProcessor.edit(lastIndex, `Edited #${lastIndex}`, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[lastIndex].edited_rule).toBe(`Edited #${lastIndex}`);
    });

    it('should handle editing with special characters in text', async () => {
      const state = createTestState();
      const specialChars = 'Rule with special chars: !@#$%^&*()_+-=[]{}|;:,.<>?';

      const result = await decisionProcessor.edit(0, specialChars, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBe(specialChars);
    });

    it('should handle editing with newlines and tabs', async () => {
      const state = createTestState();
      const whitespaceText = 'Rule line 1\n\tRule line 2\n\t\tRule line 3';

      const result = await decisionProcessor.edit(0, whitespaceText, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBe(whitespaceText);
    });

    it('should handle editing with emoji characters', async () => {
      const state = createTestState();
      const emojiText = 'Rule with emoji: 🎉 ✅ ❌ ⚠️';

      const result = await decisionProcessor.edit(0, emojiText, state);

      expect(result.success).toBe(true);
      expect(result.nextState.changes[0].edited_rule).toBe(emojiText);
    });

    it('should handle editing with zero-width spaces', async () => {
      const state = createTestState();
      const zeroWidthText = 'Rule\u200Bwith\u200Bzero\u200Bwidth';

      const result = await decisionProcessor.edit(0, zeroWidthText, state);

      expect(result.success).toBe(true);
    });

    it('should handle rapid successive edits', async () => {
      const state = createTestState();

      const result1 = await decisionProcessor.edit(0, 'Edit 1', state);
      const result2 = await decisionProcessor.edit(0, 'Edit 2', result1.nextState);
      const result3 = await decisionProcessor.edit(0, 'Edit 3', result2.nextState);

      expect(result3.nextState.changes[0].edited_rule).toBe('Edit 3');
      expect(result3.success).toBe(true);
    });
  });
});
