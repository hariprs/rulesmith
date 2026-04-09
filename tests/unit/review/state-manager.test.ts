/**
 * Unit Tests: State Manager (Story 4.1)
 *
 * Test Coverage:
 * - Session state save/load
 * - Session ID generation
 * - Session validation
 * - Session cleanup
 * - Signature generation and validation
 * - Export/import functionality
 * - Path traversal prevention
 * - Session timeout handling
 * - Edge cases and error handling
 *
 * Testing Priority: Unit > Integration > E2E
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { StateManager } from '../../../src/review/state-manager.js';
import { NavigationState, DecisionType } from '../../../src/review/types.js';
import { RuleSuggestion, RuleProposalType } from '../../../src/review/../rules/types.js';
import { Pattern, PatternCategory } from '../../../src/review/../pattern-detector/index.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript',
      user_correction: 'Use TypeScript with strict mode enabled',
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

const createMockRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createMockPattern(),
  ruleText: 'Always use TypeScript strict mode in all projects.',
  explanation: 'TypeScript strict mode catches more errors at compile time.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

const createMockNavigationState = (overrides?: Partial<NavigationState>): NavigationState => ({
  currentIndex: 0,
  changes: [createMockRuleSuggestion()],
  decisions: new Map(),
  sessionId: 'test-session-123',
  lastActivity: new Date(),
  totalChanges: 1,
  ...overrides,
});

// ============================================================================
// TEST SUITES
// ============================================================================

describe('StateManager', () => {
  let stateManager: StateManager;
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for test sessions
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'review-sessions-'));
    stateManager = new StateManager(tempDir);
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
  // SESSION SAVE/LOAD
  // ========================================================================

  describe('saveState and loadState', () => {
    it('should save and load session state', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);

      const state = createMockNavigationState({
        sessionId: 'test-session-1',
        currentIndex: 1,
        decisions,
      });

      const saved = stateManager.saveState(state);
      expect(saved).toBe(true);

      const loaded = stateManager.loadState('test-session-1');
      expect(loaded).not.toBeNull();
      expect(loaded?.sessionId).toBe('test-session-1');
      expect(loaded?.currentIndex).toBe(1);
      expect(loaded?.decisions.get(0)).toBe(DecisionType.APPROVED);
    });

    it('should handle empty decisions map', () => {
      const state = createMockNavigationState({
        sessionId: 'test-session-2',
        decisions: new Map(),
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('test-session-2');

      expect(loaded?.decisions.size).toBe(0);
    });

    it('should handle multiple decisions', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);
      decisions.set(1, DecisionType.REJECTED);
      decisions.set(2, DecisionType.EDITED);

      const state = createMockNavigationState({
        sessionId: 'test-session-3',
        changes: [
          createMockRuleSuggestion({ id: 'rule-1' }),
          createMockRuleSuggestion({ id: 'rule-2' }),
          createMockRuleSuggestion({ id: 'rule-3' }),
        ],
        decisions,
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('test-session-3');

      expect(loaded?.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(loaded?.decisions.get(1)).toBe(DecisionType.REJECTED);
      expect(loaded?.decisions.get(2)).toBe(DecisionType.EDITED);
    });

    it('should return null for non-existent session', () => {
      const loaded = stateManager.loadState('non-existent');
      expect(loaded).toBeNull();
    });

    it('should handle invalid session ID on load', () => {
      const loaded = stateManager.loadState(null as any);
      expect(loaded).toBeNull();
    });

    it('should handle non-string session ID on load', () => {
      const loaded = stateManager.loadState(123 as any);
      expect(loaded).toBeNull();
    });

    it('should handle expired session', () => {
      const state = createMockNavigationState({
        sessionId: 'expired-session',
        lastActivity: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('expired-session');

      expect(loaded).toBeNull();
    });

    it('should delete expired session file', () => {
      const state = createMockNavigationState({
        sessionId: 'expired-session',
        lastActivity: new Date(Date.now() - 31 * 60 * 1000),
      });

      stateManager.saveState(state);
      stateManager.loadState('expired-session');

      const sessions = stateManager.listSessions();
      expect(sessions).not.toContain('expired-session');
    });

    it('should validate session signature', () => {
      const state = createMockNavigationState({
        sessionId: 'tampered-session',
      });

      stateManager.saveState(state);

      // Tamper with the session file
      const sessionFile = path.join(tempDir, 'review-sessions', 'tampered-session.json');
      const content = fs.readFileSync(sessionFile, 'utf-8');
      const tamperedContent = content.replace('"signature":', '"signature":"TAMPERED');
      fs.writeFileSync(sessionFile, tamperedContent);

      const loaded = stateManager.loadState('tampered-session');
      expect(loaded).toBeNull();
    });

    it('should handle corrupted session file', () => {
      const sessionFile = path.join(tempDir, 'review-sessions', 'corrupted-session.json');
      fs.writeFileSync(sessionFile, 'invalid json {{{');

      const loaded = stateManager.loadState('corrupted-session');
      expect(loaded).toBeNull();
    });

    it('should handle oversized session file', () => {
      const sessionFile = path.join(tempDir, 'review-sessions', 'huge-session.json');
      const hugeData = 'A'.repeat(51 * 1024 * 1024); // 51MB
      fs.writeFileSync(sessionFile, hugeData);

      const loaded = stateManager.loadState('huge-session');
      expect(loaded).toBeNull();
    });
  });

  // ========================================================================
  // SESSION ID GENERATION
  // ========================================================================

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = stateManager.generateSessionId();
      const id2 = stateManager.generateSessionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-f0-9-]{36}$/); // UUID v4 format
    });

    it('should generate valid UUIDs', () => {
      const id = stateManager.generateSessionId();

      expect(id).toHaveLength(36);
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    });
  });

  // ========================================================================
  // SESSION VALIDATION
  // ========================================================================

  describe('validateSession', () => {
    it('should validate correct session', () => {
      const state = createMockNavigationState();
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject session with invalid ID', () => {
      const state = createMockNavigationState({ sessionId: '' as any });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid session ID');
    });

    it('should reject session with non-string ID', () => {
      const state = createMockNavigationState({ sessionId: null as any });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid session ID');
    });

    it('should reject session with non-array changes', () => {
      const state = createMockNavigationState({ changes: null as any });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Changes must be an array');
    });

    it('should reject session with negative index', () => {
      const state = createMockNavigationState({ currentIndex: -1 });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid current index');
    });

    it('should reject session with out-of-bounds index', () => {
      const state = createMockNavigationState({
        changes: [createMockRuleSuggestion()],
        currentIndex: 5,
      });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Current index out of bounds');
    });

    it('should reject session with non-Map decisions', () => {
      const state = createMockNavigationState({
        decisions: null as any,
      });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Decisions must be a Map');
    });

    it('should accept empty session', () => {
      const state = createMockNavigationState({
        changes: [],
        currentIndex: 0,
      });
      const result = stateManager.validateSession(state);

      expect(result.isValid).toBe(true);
    });
  });

  // ========================================================================
  // SESSION DELETION
  // ========================================================================

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const state = createMockNavigationState({ sessionId: 'delete-me' });
      stateManager.saveState(state);

      const deleted = stateManager.deleteSession('delete-me');
      expect(deleted).toBe(true);

      const loaded = stateManager.loadState('delete-me');
      expect(loaded).toBeNull();
    });

    it('should handle deleting non-existent session', () => {
      const deleted = stateManager.deleteSession('non-existent');
      expect(deleted).toBe(true); // Still returns true (idempotent)
    });

    it('should handle invalid session ID', () => {
      const deleted = stateManager.deleteSession(null as any);
      expect(deleted).toBe(false);
    });

    it('should handle non-string session ID', () => {
      const deleted = stateManager.deleteSession(123 as any);
      expect(deleted).toBe(false);
    });
  });

  // ========================================================================
  // SESSION LISTING
  // ========================================================================

  describe('listSessions', () => {
    it('should list all active sessions', () => {
      stateManager.saveState(createMockNavigationState({ sessionId: 'session-1' }));
      stateManager.saveState(createMockNavigationState({ sessionId: 'session-2' }));
      stateManager.saveState(createMockNavigationState({ sessionId: 'session-3' }));

      const sessions = stateManager.listSessions();

      expect(sessions).toHaveLength(3);
      expect(sessions).toContain('session-1');
      expect(sessions).toContain('session-2');
      expect(sessions).toContain('session-3');
    });

    it('should return empty array when no sessions', () => {
      const sessions = stateManager.listSessions();
      expect(sessions).toEqual([]);
    });

    it('should only list JSON files', () => {
      const sessionsDir = path.join(tempDir, 'review-sessions');
      fs.writeFileSync(path.join(sessionsDir, 'session-1.json'), '{}');
      fs.writeFileSync(path.join(sessionsDir, 'readme.txt'), 'not a session');

      const sessions = stateManager.listSessions();
      expect(sessions).toEqual(['session-1']);
    });
  });

  // ========================================================================
  // SESSION CLEANUP
  // ========================================================================

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', () => {
      const oldState = createMockNavigationState({
        sessionId: 'old-session',
        lastActivity: new Date(Date.now() - 31 * 60 * 1000),
      });
      stateManager.saveState(oldState);

      const newState = createMockNavigationState({
        sessionId: 'new-session',
        lastActivity: new Date(),
      });
      stateManager.saveState(newState);

      const cleaned = stateManager.cleanupExpiredSessions();

      expect(cleaned).toBe(1);
      expect(stateManager.listSessions()).toEqual(['new-session']);
    });

    it('should use custom timeout when provided', () => {
      const recentState = createMockNavigationState({
        sessionId: 'recent-session',
        lastActivity: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      });
      stateManager.saveState(recentState);

      // Clean up sessions older than 1 minute
      const cleaned = stateManager.cleanupExpiredSessions(1);

      expect(cleaned).toBe(1);
      expect(stateManager.listSessions()).toEqual([]);
    });

    it('should return 0 when no sessions to clean', () => {
      const state = createMockNavigationState({
        sessionId: 'active-session',
        lastActivity: new Date(),
      });
      stateManager.saveState(state);

      const cleaned = stateManager.cleanupExpiredSessions();
      expect(cleaned).toBe(0);
    });
  });

  // ========================================================================
  // EXPORT/IMPORT
  // ========================================================================

  describe('exportState and importState', () => {
    it('should export state to JSON', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);

      const state = createMockNavigationState({
        sessionId: 'export-test',
        decisions,
      });

      const exported = stateManager.exportState(state);

      expect(typeof exported).toBe('string');
      const parsed = JSON.parse(exported);
      expect(parsed.sessionId).toBe('export-test');
      expect(parsed.decisions).toHaveProperty('0', 'approved');
      expect(parsed).toHaveProperty('exportedAt');
    });

    it('should import state from JSON', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);

      const state = createMockNavigationState({
        sessionId: 'import-test',
        decisions,
      });

      const exported = stateManager.exportState(state);
      const imported = stateManager.importState(exported);

      expect(imported).not.toBeNull();
      expect(imported?.sessionId).toBe('import-test');
      expect(imported?.decisions.get(0)).toBe(DecisionType.APPROVED);
    });

    it('should handle invalid JSON', () => {
      const imported = stateManager.importState('not valid json');
      expect(imported).toBeNull();
    });

    it('should handle null input', () => {
      const imported = stateManager.importState(null as any);
      expect(imported).toBeNull();
    });

    it('should handle undefined input', () => {
      const imported = stateManager.importState(undefined as any);
      expect(imported).toBeNull();
    });

    it('should handle non-string input', () => {
      const imported = stateManager.importState(123 as any);
      expect(imported).toBeNull();
    });

    it('should handle oversized JSON', () => {
      const hugeJson = JSON.stringify({
        sessionId: 'huge',
        changes: [],
        decisions: {},
        data: 'A'.repeat(11 * 1024 * 1024), // 11MB
      });

      const imported = stateManager.importState(hugeJson);
      expect(imported).toBeNull();
    });

    it('should handle missing sessionId', () => {
      const json = JSON.stringify({
        changes: [],
        decisions: {},
      });

      const imported = stateManager.importState(json);
      expect(imported).toBeNull();
    });

    it('should handle invalid decision index', () => {
      const json = JSON.stringify({
        sessionId: 'test',
        changes: [createMockRuleSuggestion()],
        decisions: {
          'not-a-number': 'approved',
        },
      });

      const imported = stateManager.importState(json);
      expect(imported).not.toBeNull();
      expect(imported?.decisions.size).toBe(0);
    });

    it('should handle invalid decision value', () => {
      const json = JSON.stringify({
        sessionId: 'test',
        changes: [createMockRuleSuggestion()],
        decisions: {
          '0': 'invalid-decision',
        },
      });

      const imported = stateManager.importState(json);
      expect(imported).not.toBeNull();
      expect(imported?.decisions.size).toBe(0);
    });

    it('should handle out-of-bounds currentIndex', () => {
      const json = JSON.stringify({
        sessionId: 'test',
        changes: [createMockRuleSuggestion()],
        decisions: {},
        currentIndex: 99,
      });

      const imported = stateManager.importState(json);
      expect(imported).toBeNull();
    });

    it('should handle negative currentIndex', () => {
      const json = JSON.stringify({
        sessionId: 'test',
        changes: [createMockRuleSuggestion()],
        decisions: {},
        currentIndex: -1,
      });

      const imported = stateManager.importState(json);
      expect(imported).toBeNull();
    });
  });

  // ========================================================================
  // PATH TRAVERSAL PREVENTION
  // ========================================================================

  describe('Path Traversal Protection', () => {
    it('should prevent path traversal with ..', () => {
      const result = stateManager.loadState('../../../etc/passwd');
      expect(result).toBeNull();
    });

    it('should prevent path traversal with /', () => {
      const result = stateManager.loadState('session/../../etc/passwd');
      expect(result).toBeNull();
    });

    it('should prevent path traversal with \\', () => {
      const result = stateManager.loadState('session\\..\\..\\windows\\system32');
      expect(result).toBeNull();
    });

    it('should sanitize session IDs with special characters', () => {
      const state = createMockNavigationState({
        sessionId: 'session-with/special\\chars:and*chars?',
      });

      const saved = stateManager.saveState(state);
      expect(saved).toBe(true);

      // The sanitized ID should only contain alphanumeric and hyphens
      const sessions = stateManager.listSessions();
      expect(sessions.length).toBeGreaterThan(0);
      expect(sessions[0]).toMatch(/^[a-zA-Z0-9-]+$/);
    });

    it('should handle empty sanitized ID', () => {
      const result = stateManager.loadState('!!!');
      expect(result).toBeNull();
    });

    it('should limit session ID length', () => {
      const longId = 'a'.repeat(300);
      const state = createMockNavigationState({ sessionId: longId });

      const saved = stateManager.saveState(state);
      expect(saved).toBe(true);

      const sessions = stateManager.listSessions();
      expect(sessions[0].length).toBeLessThanOrEqual(256);
    });
  });

  // ========================================================================
  // SIGNATURE GENERATION
  // ========================================================================

  describe('Signature Generation', () => {
    it('should generate consistent signatures for same state', () => {
      const state = createMockNavigationState({ sessionId: 'sig-test' });

      stateManager.saveState(state);
      const loaded1 = stateManager.loadState('sig-test');
      const loaded2 = stateManager.loadState('sig-test');

      expect(loaded1).not.toBeNull();
      expect(loaded2).not.toBeNull();
    });

    it('should detect changes in session data', () => {
      const state = createMockNavigationState({ sessionId: 'tamper-test' });
      stateManager.saveState(state);

      // Modify the session file
      const sessionFile = path.join(tempDir, 'review-sessions', 'tamper-test.json');
      const content = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      content.currentIndex = 999;
      fs.writeFileSync(sessionFile, JSON.stringify(content));

      const loaded = stateManager.loadState('tamper-test');
      expect(loaded).toBeNull(); // Signature mismatch
    });
  });

  // ========================================================================
  // EDGE CASES
  // ========================================================================

  describe('Edge Cases', () => {
    it('should handle very large changes array', () => {
      const changes = Array.from({ length: 100 }, (_, i) =>
        createMockRuleSuggestion({ id: `rule-${i}` })
      );

      const state = createMockNavigationState({
        sessionId: 'large-session',
        changes,
      });

      const saved = stateManager.saveState(state);
      expect(saved).toBe(true);

      const loaded = stateManager.loadState('large-session');
      expect(loaded?.changes.length).toBe(100);
    });

    it('should handle all decision types', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);
      decisions.set(1, DecisionType.REJECTED);
      decisions.set(2, DecisionType.EDITED);
      decisions.set(3, DecisionType.PENDING);

      const state = createMockNavigationState({
        sessionId: 'all-decisions',
        changes: [
          createMockRuleSuggestion({ id: 'rule-1' }),
          createMockRuleSuggestion({ id: 'rule-2' }),
          createMockRuleSuggestion({ id: 'rule-3' }),
          createMockRuleSuggestion({ id: 'rule-4' }),
        ],
        decisions,
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('all-decisions');

      expect(loaded?.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(loaded?.decisions.get(1)).toBe(DecisionType.REJECTED);
      expect(loaded?.decisions.get(2)).toBe(DecisionType.EDITED);
      expect(loaded?.decisions.get(3)).toBe(DecisionType.PENDING);
    });

    it('should handle zero decisions', () => {
      const state = createMockNavigationState({
        sessionId: 'zero-decisions',
        changes: [createMockRuleSuggestion()],
        decisions: new Map(),
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('zero-decisions');

      expect(loaded?.decisions.size).toBe(0);
    });

    it('should handle sparse decisions', () => {
      const decisions = new Map<number, DecisionType>();
      decisions.set(0, DecisionType.APPROVED);
      decisions.set(5, DecisionType.REJECTED);
      decisions.set(10, DecisionType.EDITED);

      const state = createMockNavigationState({
        sessionId: 'sparse-decisions',
        changes: Array.from({ length: 15 }, (_, i) =>
          createMockRuleSuggestion({ id: `rule-${i}` })
        ),
        decisions,
      });

      stateManager.saveState(state);
      const loaded = stateManager.loadState('sparse-decisions');

      expect(loaded?.decisions.get(0)).toBe(DecisionType.APPROVED);
      expect(loaded?.decisions.get(5)).toBe(DecisionType.REJECTED);
      expect(loaded?.decisions.get(10)).toBe(DecisionType.EDITED);
      expect(loaded?.decisions.get(1)).toBeUndefined();
    });
  });
});
