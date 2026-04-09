/**
 * Actionable Error Message Formatting (Story 6.2)
 *
 * Converts classified FileAccessError objects into human-readable, user-friendly
 * messages following a consistent four-section format:
 *   1. Brief description
 *   2. What happened
 *   3. How to fix
 *   4. Technical details
 *
 * Pure functions only -- no side effects, no file I/O, no console output.
 *
 * @module error-messages
 */

import {
  FileAccessError,
  FileErrorCode,
} from './file-access-errors';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface FormattedError {
  description: string;
  whatHappened: string;
  howToFix: string[];
  technicalDetails: string;
}

// ============================================================================
// Message Handlers (keyed by FileErrorCode for maintainability)
// ============================================================================

interface ErrorTemplate {
  description: string;
  whatHappened: (err: FileAccessError) => string;
  howToFix: (err: FileAccessError) => string[];
  technicalDetails: (err: FileAccessError) => string;
}

const errorTemplates: Record<FileErrorCode, ErrorTemplate> = {
  ENOENT: {
    description: 'Rule file not found',
    whatHappened: (err) =>
      `The file ${err.path} does not exist on the filesystem.`,
    howToFix: (err) => buildEnoentFixSteps(err.path),
    technicalDetails: (err) =>
      `Attempted to ${err.operation} ${err.path} (ENOENT)`,
  },

  EACCES: {
    description: 'Permission denied accessing rule file',
    whatHappened: (err) =>
      `The process does not have ${err.operation} permission for ${err.path}.`,
    howToFix: (err) => buildEaccesFixSteps(err.path, err.operation, err.cause),
    technicalDetails: (err) =>
      `Attempted to ${err.operation} ${err.path} (EACCES)`,
  },

  EBUSY: {
    description: 'Rule file is currently in use',
    whatHappened: (err) =>
      `The file ${err.path} is locked by another process and cannot be accessed.`,
    howToFix: (err) => buildEbusyFixSteps(err.path),
    technicalDetails: (err) =>
      `Attempted to ${err.operation} ${err.path} (EBUSY)`,
  },

  ENOSPC: {
    description: 'Insufficient disk space',
    whatHappened: () =>
      'There is no available disk space to write the rule file.',
    howToFix: () => buildEnospcFixSteps(),
    technicalDetails: (err) =>
      `Attempted to write to ${err.path} (ENOSPC). Atomic write protection ensures no partial data was written.`,
  },

  ENOTDIR: {
    description: 'Invalid file path structure',
    whatHappened: (err) =>
      `A segment of ${err.path} is expected to be a directory but is not.`,
    howToFix: () => buildEnotdirFixSteps(),
    technicalDetails: (err) =>
      `Attempted to ${err.operation} ${err.path} (ENOTDIR)`,
  },

  ENAMETOOLONG: {
    description: 'File name is too long',
    whatHappened: () =>
      'The file name or path exceeds the filesystem limit.',
    howToFix: () => buildEnametoolongFixSteps(),
    technicalDetails: (err) =>
      `Attempted to ${err.operation} ${err.path} (ENAMETOOLONG)`,
  },

  UNKNOWN: {
    description: 'An unexpected file error occurred',
    whatHappened: (err) => buildUnknownWhatHappened(err),
    howToFix: () => buildUnknownFIXSteps(),
    technicalDetails: (err) => buildUnknownTechnicalDetails(err),
  },
};

// ============================================================================
// Template Builders
// ============================================================================

/**
 * Determine the context of an ENOENT error based on the file path
 * to provide targeted guidance.
 */
function detectEnoentContext(filePath: string): 'cursor' | 'copilot' | 'generic' {
  const lower = filePath.toLowerCase().replace(/\\/g, '/');
  const base = lower.split('/').pop() || '';

  if (base === '.cursorrules') {
    return 'cursor';
  }
  if (lower.includes('.github/copilot-instructions')) {
    return 'copilot';
  }
  return 'generic';
}

function buildEnoentFixSteps(filePath: string): string[] {
  const context = detectEnoentContext(filePath);

  const steps: string[] = [];
  if (context === 'cursor') {
    steps.push("Create a `.cursorrules` file in your project root directory");
  }
  if (context === 'copilot') {
    steps.push('Ensure GitHub Copilot custom instructions are configured');
  }
  steps.push('Verify the file path is correct');
  return steps;
}

function buildEaccesFixSteps(
  filePath: string,
  operation: 'read' | 'write',
  cause?: Error
): string[] {
  const steps: string[] = [];
  steps.push(`Check file permissions: ls -la ${filePath}`);

  if (operation === 'read') {
    steps.push(
      `Fix permissions so the file is readable: chmod 600 ${filePath} (owner read/write only)`
    );
  } else {
    steps.push(
      `Fix permissions so the file is writable: chmod 600 ${filePath} (owner read/write only)`
    );
  }

  const msgLower = (cause?.message ?? '').toLowerCase();
  if (msgLower.includes('directory') || msgLower.includes('mkdir')) {
    steps.push(
      'If this is a directory permissions issue, check the parent directory permissions'
    );
  } else {
    steps.push(
      'If the parent directory lacks execute permissions, fix the parent directory as well'
    );
  }

  return steps;
}

function buildEbusyFixSteps(filePath: string): string[] {
  return [
    'Close any editors or IDEs that may have the file open',
    `Find processes using the file: lsof ${filePath}`,
    'Retry the operation after releasing the lock',
  ];
}

function buildEnospcFixSteps(): string[] {
  return [
    'Free up disk space by deleting unnecessary files',
    'Check available space: df -h',
    'Clear system caches or temporary files',
    'Retry the operation after freeing space',
  ];
}

function buildEnotdirFixSteps(): string[] {
  return [
    'Verify the file path is correct and points to a file, not a directory',
    'Check the parent directory structure to ensure it exists',
  ];
}

function buildEnametoolongFixSteps(): string[] {
  return [
    'Shorten the file name or move the file to a directory with a shorter path',
    'Filesystem path limits are typically 255 characters for a single filename on macOS/Linux',
  ];
}

function buildUnknownWhatHappened(err: FileAccessError): string {
  // Try to extract an error code from cause (Error object) or rawCause (non-Error value)
  const sources = [err.cause, err.rawCause];
  for (const src of sources) {
    if (src != null && typeof src === 'object' && 'code' in src) {
      const code = (src as { code?: string }).code;
      if (code) {
        return `A file operation failed with error code: ${code}.`;
      }
    }
  }

  // Fallback: include the cause message if available
  if (err.cause && 'message' in err.cause) {
    return `A file operation failed: ${err.cause.message}.`;
  }
  if (err.rawCause != null) {
    return `A file operation failed: ${String(err.rawCause)}.`;
  }

  return 'A file operation failed with an unrecognized error code.';
}

function buildUnknownFIXSteps(): string[] {
  return [
    'Verify the file path is correct',
    'Check disk space and file permissions',
    'If the problem persists, try manual file operations',
  ];
}

function buildUnknownTechnicalDetails(err: FileAccessError): string {
  let causeMsg = 'Unknown error';
  if (err.cause) {
    causeMsg = 'message' in err.cause ? String(err.cause.message) : 'Unknown error';
  } else if (err.rawCause != null) {
    causeMsg = String(err.rawCause);
  }

  return (
    `Attempted to ${err.operation} ${err.path}. ${causeMsg}`
  );
}

// ============================================================================
// Public Exports
// ============================================================================

/**
 * Format a FileAccessError into a single human-readable string.
 *
 * @param error - The classified file access error
 * @returns Formatted error message string
 */
export function formatFileAccessError(error: FileAccessError): string {
  const { description, whatHappened, howToFix, technicalDetails } =
    formatFileAccessErrorStructured(error);

  const fixLines = howToFix.map((step) => `  - ${step}`).join('\n');

  return (
    `${description}\n\n` +
    `What happened: ${whatHappened}\n\n` +
    `How to fix:\n${fixLines}\n\n` +
    `Technical details: ${technicalDetails}`
  );
}

/**
 * Format a FileAccessError into a structured object.
 *
 * @param error - The classified file access error
 * @returns Structured error data with typed fields
 */
export function formatFileAccessErrorStructured(
  error: FileAccessError
): FormattedError {
  const template = errorTemplates[error.code];
  // Edge case guard: if an unrecognized code somehow arrives (e.g., bypassing
  // TypeScript types), delegate to the UNKNOWN template directly.
  if (!template) {
    const unknownTemplate = errorTemplates.UNKNOWN;
    return {
      description: unknownTemplate.description,
      whatHappened: unknownTemplate.whatHappened(error),
      howToFix: unknownTemplate.howToFix(error),
      technicalDetails: unknownTemplate.technicalDetails(error),
    };
  }

  const whatHappened = template.whatHappened(error);
  const howToFix = template.howToFix(error);
  const technicalDetails = template.technicalDetails(error);

  return {
    description: template.description,
    whatHappened,
    howToFix,
    technicalDetails,
  };
}
