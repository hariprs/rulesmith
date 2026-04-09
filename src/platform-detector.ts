/**
 * Platform Detector (Story 3.2)
 *
 * Detects the active AI coding platform (Cursor vs Copilot)
 * to determine target rule file paths and formatting
 *
 * @module platform-detector
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Supported AI coding platforms
 *
 * @enum {string}
 */
export enum Platform {
  /** Cursor AI IDE */
  CURSOR = 'cursor',
  /** GitHub Copilot */
  COPILOT = 'copilot',
  /** Unknown or unsupported platform */
  UNKNOWN = 'unknown',
}

/**
 * Platform detection result
 *
 * @interface PlatformDetectionResult
 */
export interface PlatformDetectionResult {
  /** Detected platform */
  platform: Platform;
  /** Target rule file path */
  ruleFilePath: string;
  /** Whether platform is supported */
  isSupported: boolean;
}

// ============================================================================
// PLATFORM DETECTOR
// ============================================================================

/**
 * Platform detector for AI coding platforms
 *
 * @class PlatformDetector
 */
export class PlatformDetector {
  private readonly projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    // Guard: Validate projectRoot is provided
    if (!projectRoot || projectRoot.trim() === '') {
      throw new Error('Project root cannot be empty or null');
    }
    this.projectRoot = projectRoot;
  }

  /**
   * Detect the active platform
   *
   * @returns Platform enum value
   */
  detectPlatform(): Platform {
    // Check for Cursor IDE
    if (this.isCursorPlatform()) {
      return Platform.CURSOR;
    }

    // Check for Copilot
    if (this.isCopilotPlatform()) {
      return Platform.COPILOT;
    }

    return Platform.UNKNOWN;
  }

  /**
   * Get platform detection result with file path
   *
   * @returns Platform detection result
   */
  getDetectionResult(): PlatformDetectionResult {
    const platform = this.detectPlatform();

    return {
      platform,
      ruleFilePath: this.getRuleFilePath(platform),
      isSupported: platform !== Platform.UNKNOWN,
    };
  }

  /**
   * Get rule file path for platform
   *
   * @param platform - Platform enum value
   * @returns Absolute path to rule file
   * @throws Error if platform is unsupported
   */
  getRuleFilePath(platform: Platform): string {
    // Guard: Validate platform parameter
    if (!platform || platform === Platform.UNKNOWN) {
      throw new Error(`Cannot get rule file path for unknown or null platform`);
    }

    switch (platform) {
      case Platform.CURSOR:
        return path.join(this.projectRoot, '.cursorrules');

      case Platform.COPILOT:
        return path.join(this.projectRoot, '.github', 'copilot-instructions.md');

      default:
        // Exhaustive check - this should never happen with proper TypeScript
        const exhaustiveCheck: never = platform;
        throw new Error(`Unsupported platform: ${exhaustiveCheck}`);
    }
  }

  /**
   * Check if running in Cursor IDE
   *
   * @private
   * @returns Whether Cursor platform is detected
   */
  private isCursorPlatform(): boolean {
    // Check for Cursor-specific files or environment
    const cursorRulesPath = path.join(this.projectRoot, '.cursorrules');

    // Check if .cursorrules file exists
    if (fs.existsSync(cursorRulesPath)) {
      return true;
    }

    // Check for Cursor-specific environment variables
    if (process.env.CURSOR_VERSION || process.env.CURSOR_ROOT) {
      return true;
    }

    return false;
  }

  /**
   * Check if running with Copilot
   *
   * @private
   * @returns Whether Copilot platform is detected
   */
  private isCopilotPlatform(): boolean {
    // Check for Copilot-specific files
    const copilotInstructionsPath = path.join(
      this.projectRoot,
      '.github',
      'copilot-instructions.md'
    );

    // Check if copilot-instructions.md file exists
    if (fs.existsSync(copilotInstructionsPath)) {
      return true;
    }

    // Check for Copilot-specific environment variables
    if (process.env.COPILOT_TOKEN || process.env.GITHUB_COPILOT_TOKEN) {
      return true;
    }

    return false;
  }

  /**
   * Validate platform is supported
   *
   * @param platform - Platform enum value
   * @returns Whether platform is supported
   */
  isPlatformSupported(platform: Platform): boolean {
    return platform === Platform.CURSOR || platform === Platform.COPILOT;
  }

  /**
   * Get platform name for display
   *
   * @param platform - Platform enum value
   * @returns Human-readable platform name
   */
  getPlatformName(platform: Platform): string {
    // Guard: Validate platform parameter
    if (!platform) {
      return 'Unknown';
    }

    switch (platform) {
      case Platform.CURSOR:
        return 'Cursor';
      case Platform.COPILOT:
        return 'GitHub Copilot';
      case Platform.UNKNOWN:
        return 'Unknown Platform';
      default:
        // Exhaustive check - this should never happen with proper TypeScript
        const exhaustiveCheck: never = platform;
        return `Unknown (${exhaustiveCheck})`;
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create a platform detector instance
 *
 * @param projectRoot - Project root directory
 * @returns PlatformDetector instance
 */
export function createPlatformDetector(projectRoot?: string): PlatformDetector {
  return new PlatformDetector(projectRoot);
}

/**
 * Detect current platform (convenience function)
 *
 * @param projectRoot - Project root directory
 * @returns Platform enum value
 */
export function detectPlatform(projectRoot?: string): Platform {
  const detector = new PlatformDetector(projectRoot);
  return detector.detectPlatform();
}
