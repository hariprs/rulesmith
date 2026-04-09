/**
 * Platform Detector Tests (Story 3.2)
 *
 * Tests for platform detection functionality
 */

import { PlatformDetector, Platform, createPlatformDetector, detectPlatform } from './platform-detector';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');

describe('PlatformDetector', () => {
  let platformDetector: PlatformDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    platformDetector = new PlatformDetector('/test/project');
  });

  describe('detectPlatform', () => {
    it('should detect Cursor platform when .cursorrules exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('.cursorrules');
      });

      const platform = platformDetector.detectPlatform();

      expect(platform).toBe(Platform.CURSOR);
    });

    it('should detect Copilot platform when copilot-instructions.md exists', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('copilot-instructions.md');
      });

      const platform = platformDetector.detectPlatform();

      expect(platform).toBe(Platform.COPILOT);
    });

    it('should return UNKNOWN when no platform files exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const platform = platformDetector.detectPlatform();

      expect(platform).toBe(Platform.UNKNOWN);
    });

    it('should detect Cursor from environment variable', () => {
      const originalEnv = process.env.CURSOR_VERSION;

      process.env.CURSOR_VERSION = '1.0.0';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const platform = platformDetector.detectPlatform();

      expect(platform).toBe(Platform.CURSOR);

      // Restore original env
      if (originalEnv === undefined) {
        delete process.env.CURSOR_VERSION;
      } else {
        process.env.CURSOR_VERSION = originalEnv;
      }
    });

    it('should prioritize Cursor over Copilot when both exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const platform = platformDetector.detectPlatform();

      expect(platform).toBe(Platform.CURSOR);
    });
  });

  describe('getDetectionResult', () => {
    it('should return complete detection result for Cursor', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('.cursorrules');
      });

      const result = platformDetector.getDetectionResult();

      expect(result.platform).toBe(Platform.CURSOR);
      expect(result.ruleFilePath).toBe('/test/project/.cursorrules');
      expect(result.isSupported).toBe(true);
    });

    it('should return complete detection result for Copilot', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('copilot-instructions.md');
      });

      const result = platformDetector.getDetectionResult();

      expect(result.platform).toBe(Platform.COPILOT);
      expect(result.ruleFilePath).toBe('/test/project/.github/copilot-instructions.md');
      expect(result.isSupported).toBe(true);
    });

    it('should return unsupported for unknown platform', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = platformDetector.getDetectionResult();

      expect(result.platform).toBe(Platform.UNKNOWN);
      expect(result.isSupported).toBe(false);
    });
  });

  describe('getRuleFilePath', () => {
    it('should return Cursor rules file path', () => {
      const filePath = platformDetector.getRuleFilePath(Platform.CURSOR);

      expect(filePath).toBe('/test/project/.cursorrules');
    });

    it('should return Copilot instructions file path', () => {
      const filePath = platformDetector.getRuleFilePath(Platform.COPILOT);

      expect(filePath).toBe('/test/project/.github/copilot-instructions.md');
    });

    it('should throw error for unknown platform', () => {
      expect(() => platformDetector.getRuleFilePath(Platform.UNKNOWN)).toThrow(
        'Unsupported platform'
      );
    });
  });

  describe('isPlatformSupported', () => {
    it('should return true for Cursor', () => {
      expect(platformDetector.isPlatformSupported(Platform.CURSOR)).toBe(true);
    });

    it('should return true for Copilot', () => {
      expect(platformDetector.isPlatformSupported(Platform.COPILOT)).toBe(true);
    });

    it('should return false for unknown', () => {
      expect(platformDetector.isPlatformSupported(Platform.UNKNOWN)).toBe(false);
    });
  });

  describe('getPlatformName', () => {
    it('should return human-readable name for Cursor', () => {
      expect(platformDetector.getPlatformName(Platform.CURSOR)).toBe('Cursor');
    });

    it('should return human-readable name for Copilot', () => {
      expect(platformDetector.getPlatformName(Platform.COPILOT)).toBe('GitHub Copilot');
    });

    it('should return Unknown for unknown platform', () => {
      expect(platformDetector.getPlatformName(Platform.UNKNOWN)).toBe('Unknown Platform');
    });
  });

  describe('Utility functions', () => {
    it('should create platform detector instance', () => {
      const detector = createPlatformDetector('/custom/path');

      expect(detector).toBeInstanceOf(PlatformDetector);
    });

    it('should detect platform using convenience function', () => {
      (fs.existsSync as jest.Mock).mockImplementation((filePath: string) => {
        return filePath.endsWith('.cursorrules');
      });

      const platform = detectPlatform('/test/project');

      expect(platform).toBe(Platform.CURSOR);
    });
  });
});
