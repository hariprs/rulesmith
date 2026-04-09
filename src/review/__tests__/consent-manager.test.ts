/**
 * Consent Manager Tests (Story 4.5)
 *
 * Tests for consent flow and file modification functionality
 */

import { ConsentManager } from '../consent-manager';
import { StateManager } from '../state-manager';
import { AuditLogger } from '../audit-logger';
import { FileWriter } from '../file-writer';
import { PlatformDetector, Platform } from '../../platform-detector';
import {
  NavigationState,
  ConsentState,
  DecisionType,
  ConsentResult,
} from '../types';

// Mock dependencies
jest.mock('../state-manager');
jest.mock('../audit-logger');
jest.mock('../file-writer');
jest.mock('../../platform-detector');

describe('ConsentManager', () => {
  let consentManager: ConsentManager;
  let mockStateManager: jest.Mocked<StateManager>;
  let mockAuditLogger: jest.Mocked<AuditLogger>;
  let mockFileWriter: jest.Mocked<FileWriter>;
  let mockPlatformDetector: jest.Mocked<PlatformDetector>;
  let mockState: NavigationState;

  beforeEach(() => {
    // Reset mocks
    mockStateManager = {
      saveState: jest.fn().mockReturnValue(true),
      generateSessionId: jest.fn().mockReturnValue('test-session-id'),
    } as any;

    mockAuditLogger = {
      logDecision: jest.fn().mockResolvedValue(undefined),
      logError: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockFileWriter = {
      writeChanges: jest.fn().mockResolvedValue({
        filePath: '/test/.cursorrules',
        success: true,
      }),
    } as any;

    mockPlatformDetector = {
      detectPlatform: jest.fn().mockReturnValue(Platform.CURSOR),
    } as any;

    consentManager = new ConsentManager(
      mockStateManager,
      mockAuditLogger,
      mockFileWriter,
      mockPlatformDetector
    );

    // Create mock state with approved changes
    mockState = {
      currentIndex: 0,
      changes: [
        {
          ruleText: 'Test rule 1',
          explanation: 'Test explanation 1',
          proposalType: 'coding_pattern',
          file: '.cursorrules',
        },
        {
          ruleText: 'Test rule 2',
          explanation: 'Test explanation 2',
          proposalType: 'coding_pattern',
          file: '.cursorrules',
        },
      ],
      decisions: new Map([
        [0, DecisionType.APPROVED],
        [1, DecisionType.APPROVED],
      ]),
      sessionId: 'test-session-id',
      lastActivity: new Date(),
      totalChanges: 2,
    };
  });

  describe('initiateConsent', () => {
    it('should display consent prompt with approved changes', async () => {
      const result = await consentManager.initiateConsent(mockState);

      expect(result.type).toBe('consent');
      expect(result.count).toBe(2);
      expect(result.files).toEqual(['.cursorrules']);
      expect(result.message).toContain('2 approved changes will be applied to');
      expect(mockState.consent).toBeDefined();
      expect(mockState.consent?.approvedCount).toBe(2);
    });

    it('should return error when no approved changes', async () => {
      mockState.decisions.clear();
      mockState.decisions.set(0, DecisionType.REJECTED);

      const result = await consentManager.initiateConsent(mockState);

      expect(result.type).toBe('error');
      expect(result.message).toContain('No approved changes to apply');
    });

    it('should count only approved changes', async () => {
      mockState.decisions.set(1, DecisionType.REJECTED);

      const result = await consentManager.initiateConsent(mockState);

      expect(result.count).toBe(1);
      expect(mockState.consent?.approvedCount).toBe(1);
    });
  });

  describe('executeConsent', () => {
    it('should apply changes when consent is confirmed', async () => {
      mockState.consent = {
        approvedCount: 2,
        affectedFiles: ['.cursorrules'],
        promptedAt: new Date().toISOString(),
      };

      const result = await consentManager.executeConsent(mockState, true);

      expect(result.action).toBe('consent_given');
      expect(result.success).toBe(true);
      expect(result.changeCount).toBe(2);
      expect(mockFileWriter.writeChanges).toHaveBeenCalled();
      expect(mockStateManager.saveState).toHaveBeenCalled();
      expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
        'test-session-id',
        -1,
        'consent_given',
        expect.stringContaining('2 changes applied successfully')
      );
    });

    it('should cancel when consent is denied', async () => {
      mockState.consent = {
        approvedCount: 2,
        affectedFiles: ['.cursorrules'],
        promptedAt: new Date().toISOString(),
      };

      const result = await consentManager.executeConsent(mockState, false);

      expect(result.action).toBe('consent_denied');
      expect(result.success).toBe(true);
      expect(mockFileWriter.writeChanges).not.toHaveBeenCalled();
      expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
        'test-session-id',
        -1,
        'consent_denied',
        expect.stringContaining('cancelled')
      );
    });

    it('should handle file modification failure', async () => {
      mockState.consent = {
        approvedCount: 2,
        affectedFiles: ['.cursorrules'],
        promptedAt: new Date().toISOString(),
      };

      mockFileWriter.writeChanges.mockResolvedValue({
        filePath: '/test/.cursorrules',
        success: false,
        error: 'Permission denied',
        backupPath: '/tmp/backup-test',
      });

      const result = await consentManager.executeConsent(mockState, true);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      expect(mockAuditLogger.logDecision).toHaveBeenCalledWith(
        'test-session-id',
        -1,
        'consent_given',
        expect.stringContaining('Failed')
      );
    });

    it('should throw error when no pending consent', async () => {
      await expect(consentManager.executeConsent(mockState, true)).rejects.toThrow(
        'No pending consent to confirm'
      );
    });
  });

  describe('isConfirmationResponse', () => {
    it('should recognize confirmation keywords', () => {
      expect(consentManager.isConfirmationResponse('yes')).toBe(true);
      expect(consentManager.isConfirmationResponse('confirm')).toBe(true);
      expect(consentManager.isConfirmationResponse('apply')).toBe(true);
      expect(consentManager.isConfirmationResponse('proceed')).toBe(true);
      expect(consentManager.isConfirmationResponse('  yes  ')).toBe(true);
      expect(consentManager.isConfirmationResponse('YES')).toBe(true);
    });

    it('should reject non-confirmation keywords', () => {
      expect(consentManager.isConfirmationResponse('no')).toBe(false);
      expect(consentManager.isConfirmationResponse('reject')).toBe(false);
      expect(consentManager.isConfirmationResponse('cancel')).toBe(false);
      expect(consentManager.isConfirmationResponse('')).toBe(false);
    });
  });
});
