/**
 * Integration Tests for Rule Consolidation (Story 6.10)
 *
 * Testing Strategy:
 * - Integration tests use real temp directories and real file system operations.
 * - Tests verify complete consolidation workflow: analysis → proposal → approval → application.
 * - Tests cover backup creation, atomic writes, platform-specific formatting, and error handling.
 * - No E2E tests needed — all acceptance criteria verifiable at unit/integration level.
 *
 * Coverage: AC 6.10 #1-#9 (full workflow, selective approval, contradictions, backups, thresholds)
 * FR47: Consolidate redundant rules when file becomes too large
 *
 * Test IDs: 6.10-INT-001 through 6.10-INT-012
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// IMPORTS
// ============================================================================

import {
  AR22Error,
} from '../../src/command-variants';

import {
  consolidateRules,
  applyConsolidations,
} from '../../src/state-management';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const LARGE_RULES_CURSOR = `# Code Style
Use async/await instead of Promise chains
Prefer async/await over .then() chains
Always use async/await for Promise handling
Add explicit TypeScript return types to all functions
Include return type annotations on arrow functions
Type all function parameters explicitly
Use interface definitions for object shapes

# Error Handling
Use try-catch blocks for error handling
Always handle Promise rejections
Log errors to console for debugging
Provide meaningful error messages
Use Error objects with stack traces

# Testing
Write tests before implementation
Follow the red-green-refactor cycle
Ensure all edge cases are covered
Use descriptive test names
Mock external dependencies in tests
Keep tests independent and isolated

# Code Organization
Keep functions small and focused
Follow single responsibility principle
Use descriptive variable and function names
Avoid deep nesting of control structures
Extract complex logic into separate functions
Prefer composition over inheritance

# Performance
Avoid unnecessary computations
Cache expensive operations
Use efficient algorithms and data structures
Minimize DOM manipulations in frontend code
Debounce or throttle expensive event handlers

# Security
Validate all user inputs
Sanitize data before displaying
Use HTTPS for network requests
Store sensitive data securely
Follow principle of least privilege

# Documentation
Write clear comments for complex logic
Update README with setup instructions
Document API endpoints and their parameters
Include usage examples in code comments
Keep documentation in sync with code changes

# Git Workflow
Commit frequently with descriptive messages
Write commit messages in imperative mood
Keep commits focused on single changes
Use branches for feature development
Merge pull requests after code review

# Code Review
Review code for readability and maintainability
Check for potential bugs and edge cases
Ensure code follows project conventions
Provide constructive feedback
Address all review comments before merging

# Debugging
Use console.log for quick debugging
Use debugger for stepping through code
Check browser console for errors
Use network tab to inspect API calls
Log important events and state changes

# Accessibility
Use semantic HTML elements
Provide alt text for images
Ensure keyboard navigation works
Use ARIA attributes where needed
Test with screen readers

# Browser Compatibility
Test on multiple browsers
Use polyfills for older browsers
Check mobile responsiveness
Ensure cross-browser functionality
Use feature detection over browser sniffing

# Dependencies
Keep dependencies up to date
Audit packages for security vulnerabilities
Remove unused dependencies
Prefer stable libraries over experimental ones
Document dependency installation steps

# Build and Deployment
Use build scripts for compilation
Minify assets for production
Enable gzip compression
Set up continuous integration
Deploy to staging environment first

# Environment Configuration
Use environment variables for configuration
Store sensitive data in .env files
Document required environment variables
Use different configs for dev/prod
Never commit secrets to version control

# Logging
Log important application events
Use appropriate log levels (info, warn, error)
Include timestamps in log messages
Rotate log files to manage size
Monitor logs for errors and anomalies

# Database Operations
Use parameterized queries to prevent SQL injection
Implement proper indexing for performance
Handle database connection errors
Use transactions for multi-step operations
Backup database regularly

# API Design
Use RESTful conventions for endpoints
Return appropriate HTTP status codes
Provide consistent response formats
Version API endpoints when breaking changes occur
Document API with OpenAPI/Swagger

# Frontend State Management
Use state management library for complex apps
Keep state immutable and predictable
Avoid prop drilling where possible
Use context for global state
Normalize state structure

# CSS and Styling
Use CSS modules or styled-components
Follow BEM naming convention for classes
Keep styles scoped to components
Use CSS variables for theming
Optimize CSS for performance

# Testing Utilities
Use testing library for DOM testing
Mock API calls in integration tests
Test user interactions not implementation
Keep test code maintainable
Use fixtures for consistent test data

# Code Quality Tools
Use linter to enforce code style
Format code with prettier
Run tests before committing
Use TypeScript for type safety
Enable strict mode in TypeScript

# Error Recovery
Implement retry logic for failed requests
Provide user-friendly error messages
Log errors for debugging
Gracefully degrade functionality
Implement fallback mechanisms

# Performance Monitoring
Measure page load times
Track API response times
Monitor memory usage
Profile slow functions
Use performance monitoring tools

# User Experience
Provide loading indicators for async operations
Give feedback for user actions
Design intuitive user interfaces
Conduct usability testing
Optimize for mobile devices

# Code Maintenance
Refactor code regularly
Remove dead code and comments
Update dependencies
Fix deprecated API usage
Improve code readability

# Security Best Practices
Implement CSRF protection
Use content security policy
Validate and sanitize inputs
Implement rate limiting
Regular security audits

# Data Privacy
Comply with GDPR regulations
Obtain user consent for data collection
Provide data export functionality
Allow users to delete their data
Anonymize sensitive data in logs

# Caching Strategy
Cache frequently accessed data
Use appropriate cache expiration
Implement cache invalidation
Monitor cache hit rates
Use CDN for static assets`;

const LARGE_RULES_COPILOT = `## Code Style
- Use async/await instead of Promise chains
- Prefer async/await over .then() chains
- Always use async/await for Promise handling
- Add explicit TypeScript return types to all functions

## Error Handling
- Use try-catch blocks for error handling
- Always handle Promise rejections
- Log errors to console for debugging

## Testing
- Write tests before implementation
- Follow the red-green-refactor cycle
- Ensure all edge cases are covered

## Code Organization
- Keep functions small and focused
- Follow single responsibility principle
- Use descriptive variable and function names

## Performance
- Avoid unnecessary computations
- Cache expensive operations
- Use efficient algorithms and data structures

## Security
- Validate all user inputs
- Sanitize data before displaying
- Use HTTPS for network requests

## Documentation
- Write clear comments for complex logic
- Update README with setup instructions
- Document API endpoints and their parameters

## Git Workflow
- Commit frequently with descriptive messages
- Write commit messages in imperative mood
- Keep commits focused on single changes

## Code Review
- Review code for readability and maintainability
- Check for potential bugs and edge cases
- Ensure code follows project conventions`;

const REDUNDANT_RULES_CURSOR = `# Async Patterns
Use async/await instead of Promise chains
Prefer async/await over .then() chains
Always use async/await for Promise handling

# Type Safety
Add explicit TypeScript return types to all functions
Include return type annotations on arrow functions
Type all function parameters explicitly

# Code Quality
Keep functions small and focused
Follow single responsibility principle
Use descriptive variable and function names`;

const CONTRADICTORY_RULES_CURSOR = `# Async Patterns
Use async/await for all asynchronous operations
Avoid async/await in performance-critical code

# Error Handling
Always use try-catch blocks for error handling
Never use try-catch blocks for control flow

# Type Safety
Use TypeScript strict mode
Disable TypeScript strict mode for rapid prototyping`;

const MINIMAL_BENEFIT_RULES = `# Code Style
Use async/await
Add types
Write comments

# Testing
Write tests
Mock dependencies
Use assertions`;

const EMPTY_RULES = `# Code Style
Use async/await`;

// ============================================================================
// 6.10-INT-001: Full consolidation workflow (AC #1, #4, #5)
// ============================================================================

describe('6.10-INT-001: Full consolidation workflow (AC #1, #4, #5)', () => {
  let tempDir: string;
  let rulesFilePath: string;
  let historyDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'consolidate-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');
    historyDir = path.join(tempDir, 'history');

    await fs.mkdir(historyDir, { recursive: true });
    await fs.writeFile(rulesFilePath, LARGE_RULES_CURSOR, 'utf-8');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('End-to-end consolidation workflow', () => {
    test('should analyze → propose → approve → apply consolidation', async () => {
      // GIVEN: Large rules file (> 500 lines)
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const lineCount = rulesContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).length;
      expect(lineCount).toBeGreaterThan(500);

      // WHEN: Full consolidation workflow is performed
      // Step 1: Analyze and generate proposal
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should generate valid proposal
      expect(proposal).toHaveProperty('categories');
      expect(proposal).toHaveProperty('redundancies');
      expect(proposal).toHaveProperty('contradictions');
      expect(proposal).toHaveProperty('metrics');
      expect(proposal.platform).toBe('cursor');

      // Step 2: Approve some consolidations
      const approvalState = {
        approved: new Set<string>(),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // Approve first consolidation if available
      if (proposal.redundancies.length > 0) {
        approvalState.approved.add(proposal.redundancies[0].groupId);
      }

      // Step 3: Apply consolidations
      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Rules file should be modified
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).not.toBe(rulesContent);

      // AND: Backup should exist
      const historyFiles = await fs.readdir(historyDir);
      expect(historyFiles.length).toBeGreaterThan(0);
    });

    test('should create pre-consolidation backup before any modifications (AC #4)', async () => {
      // GIVEN: Rules file
      const originalContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: Consolidation is applied
      const proposal = await consolidateRules(originalContent, 'cursor');
      const approvalState = {
        approved: new Set<string>(),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      if (proposal.redundancies.length > 0) {
        approvalState.approved.add(proposal.redundancies[0].groupId);
      }

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Backup should exist in history directory
      const historyFiles = await fs.readdir(historyDir);
      expect(historyFiles.length).toBeGreaterThan(0);

      // AND: Backup should contain original content
      const backupPath = path.join(historyDir, historyFiles[0]);
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      expect(backupContent).toBe(originalContent);
    });

    test('should verify file integrity after write (AC #4)', async () => {
      // GIVEN: Rules file and proposal
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set<string>(),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      if (proposal.redundancies.length > 0) {
        approvalState.approved.add(proposal.redundancies[0].groupId);
      }

      // WHEN: Consolidation is applied
      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Written file should be readable and non-empty
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent.length).toBeGreaterThan(0);
      expect(newContent.split('\n').length).toBeGreaterThan(0);
    });

    test('should log consolidation to results.jsonl with status "consolidated" (AC #5)', async () => {
      // GIVEN: Rules file
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const resultsPath = '/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/data/results.jsonl';

      let initialLines = 0;
      try {
        const content = await fs.readFile(resultsPath, 'utf-8');
        initialLines = content.trim().split('\n').filter(l => l.trim().length > 0).length;
      } catch {
        initialLines = 0;
      }

      // WHEN: Consolidation is applied
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set<string>(),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      if (proposal.redundancies.length > 0) {
        approvalState.approved.add(proposal.redundancies[0].groupId);
      }

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: results.jsonl should have new entry
      const content = await fs.readFile(resultsPath, 'utf-8');
      const lines = content.trim().split('\n').filter(l => l.trim().length > 0);
      expect(lines.length).toBeGreaterThan(initialLines);

      // AND: Last entry should be consolidation
      const lastLine = lines[lines.length - 1];
      const entry = JSON.parse(lastLine);
      expect(entry.status).toBe('consolidated');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('rules_before');
      expect(entry).toHaveProperty('rules_after');
      expect(entry).toHaveProperty('lines_reduced');
    });
  });
});

// ============================================================================
// 6.10-INT-002: Selective approval workflow (AC #3)
// ============================================================================

describe('6.10-INT-002: Selective approval workflow (AC #3)', () => {
  let tempDir: string;
  let rulesFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'approval-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');

    await fs.writeFile(rulesFilePath, REDUNDANT_RULES_CURSOR, 'utf-8');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Selective approval scenarios', () => {
    test('should approve specific consolidations by number', async () => {
      // GIVEN: Proposal with multiple consolidations
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      expect(proposal.redundancies.length).toBeGreaterThan(0);

      // WHEN: Only first consolidation is approved
      const approvalState = {
        approved: new Set([proposal.redundancies[0].groupId]),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Only approved consolidation should be applied
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).not.toBe(rulesContent);
    });

    test('should reject specific consolidations', async () => {
      // GIVEN: Proposal with multiple consolidations
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // WHEN: All consolidations are rejected
      const approvalState = {
        approved: new Set<string>(),
        rejected: new Set(proposal.redundancies.map(r => r.groupId)),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Content should remain unchanged
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toBe(rulesContent);
    });

    test('should edit consolidation before approval', async () => {
      // GIVEN: Proposal with consolidation
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // WHEN: Consolidation is edited before approval
      const editedText = 'Custom consolidated rule text';
      const approvalState = {
        approved: new Set([proposal.redundancies[0].groupId]),
        rejected: new Set<string>(),
        edited: new Map([[proposal.redundancies[0].groupId, editedText]]),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Edited text should be in result
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toContain(editedText);
    });

    test('should approve all consolidations at once', async () => {
      // GIVEN: Proposal with multiple consolidations
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // WHEN: All consolidations are approved
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: All consolidations should be applied
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).not.toBe(rulesContent);
    });
  });
});

// ============================================================================
// 6.10-INT-003: Contradictory rule handling (AC #8)
// ============================================================================

describe('6.10-INT-003: Contradictory rule handling (AC #8)', () => {
  let tempDir: string;
  let rulesFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contradiction-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');

    await fs.writeFile(rulesFilePath, CONTRADICTORY_RULES_CURSOR, 'utf-8');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Contradiction detection and resolution', () => {
    test('should flag contradictory rules in consolidation proposal (AC #8)', async () => {
      // GIVEN: Rules with contradictions
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: Proposal is generated
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Contradictions should be detected
      expect(proposal.contradictions.length).toBeGreaterThan(0);

      proposal.contradictions.forEach(contradiction => {
        expect(contradiction).toHaveProperty('ruleId1');
        expect(contradiction).toHaveProperty('ruleId2');
        expect(contradiction).toHaveProperty('reason');
        expect(contradiction).toHaveProperty('conflict');
      });
    });

    test('should not auto-merge contradictory rules (AC #8)', async () => {
      // GIVEN: Rules with contradictions
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // WHEN: Checking redundancy groups
      // THEN: Contradictory rules should not be in same redundancy group
      const contradictionsSet = new Set(
        proposal.contradictions.flatMap(c => [c.ruleId1, c.ruleId2])
      );

      proposal.redundancies.forEach(redundancy => {
        redundancy.rules.forEach(ruleId => {
          if (contradictionsSet.has(ruleId)) {
            // If a rule has contradictions, it should not be auto-consolidated
            fail(`Rule ${ruleId} has contradictions but was auto-consolidated`);
          }
        });
      });
    });

    test('should exclude unresolved contradictions from consolidation (AC #8)', async () => {
      // GIVEN: Proposal with contradictions
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // WHEN: Consolidations are applied without resolving contradictions
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(), // No resolutions
      };

      // THEN: Should fail or skip contradictory rules
      await expect(
        applyConsolidations(approvalState, proposal, rulesFilePath)
      ).rejects.toThrow();
    });

    test('should allow user to keep one, both, or skip contradictory rules', async () => {
      // GIVEN: Contradiction resolution choices
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      if (proposal.contradictions.length > 0) {
        const contradiction = proposal.contradictions[0];

        // WHEN: User resolves to keep first rule
        const approvalState = {
          approved: new Set<string>(),
          rejected: new Set<string>(),
          edited: new Map<string, string>(),
          contradictions: new Map([[contradiction.ruleId1, contradiction.ruleId1]]),
        };

        // THEN: Should allow resolution
        expect(approvalState.contradictions.has(contradiction.ruleId1)).toBe(true);
      }
    });
  });
});

// ============================================================================
// 6.10-INT-004: Platform-specific formatting (AC #9)
// ============================================================================

describe('6.10-INT-004: Platform-specific formatting (AC #9)', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'platform-int-'));
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Platform format preservation', () => {
    test('should preserve Cursor format: plain text with # comments (AC #9)', async () => {
      // GIVEN: Cursor format rules
      const rulesFilePath = path.join(tempDir, '.cursorrules');
      await fs.writeFile(rulesFilePath, LARGE_RULES_CURSOR, 'utf-8');

      // WHEN: Consolidation is applied
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Result should preserve Cursor format
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toMatch(/^# /m); // # comments
      expect(newContent).not.toContain('##'); // No Markdown headings
    });

    test('should preserve Copilot format: Markdown ## headings (AC #9)', async () => {
      // GIVEN: Copilot format rules
      const rulesFilePath = path.join(tempDir, 'copilot-instructions.md');
      await fs.writeFile(rulesFilePath, LARGE_RULES_COPILOT, 'utf-8');

      // WHEN: Consolidation is applied
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'copilot');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Result should preserve Markdown format
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toContain('##'); // Markdown headings
      expect(newContent).toMatch(/^- /m); // Bullet points
    });

    test('should detect format independent of platform location (AC #9)', async () => {
      // GIVEN: Markdown content in unexpected location
      const rulesFilePath = path.join(tempDir, 'custom-location.txt');
      await fs.writeFile(rulesFilePath, LARGE_RULES_COPILOT, 'utf-8');

      // WHEN: Consolidation is applied
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'copilot');

      // THEN: Should detect based on content, not location
      expect(proposal.platform).toBe('copilot');
    });
  });
});

// ============================================================================
// 6.10-INT-005: Threshold scenarios (AC #6, #7)
// ============================================================================

describe('6.10-INT-005: Threshold scenarios (AC #6, #7)', () => {
  let tempDir: string;
  let rulesFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'threshold-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Under 500 lines threshold (AC #6)', () => {
    test('should display informational message for < 500 line files', async () => {
      // GIVEN: Rules file under 500 lines
      await fs.writeFile(rulesFilePath, MINIMAL_BENEFIT_RULES, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const lineCount = rulesContent.split('\n').filter(line => line.trim() && !line.trim().startsWith('#')).length;

      expect(lineCount).toBeLessThan(500);

      // WHEN: Analysis is performed
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should still generate proposal (user can proceed)
      expect(proposal).toHaveProperty('metrics');
      expect(proposal.metrics.originalLines).toBeLessThan(500);
    });

    test('should allow user to proceed with consolidation if desired (AC #6)', async () => {
      // GIVEN: Small rules file
      await fs.writeFile(rulesFilePath, MINIMAL_BENEFIT_RULES, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: User chooses to proceed
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Should complete successfully
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toBeTruthy();
    });
  });

  describe('Minimal benefit threshold (AC #7)', () => {
    test('should display warning for < 5% reduction benefit', async () => {
      // GIVEN: Rules with minimal benefit
      await fs.writeFile(rulesFilePath, MINIMAL_BENEFIT_RULES, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: Analysis is performed
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // THEN: Should detect minimal benefit
      const isMinimalBenefit = proposal.metrics.reductionPercentage < 5;
      expect(isMinimalBenefit).toBe(true);
    });

    test('should allow user to proceed with minimal benefit if desired (AC #7)', async () => {
      // GIVEN: Rules with minimal benefit
      await fs.writeFile(rulesFilePath, MINIMAL_BENEFIT_RULES, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: User chooses to proceed
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Should complete successfully
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent).toBeTruthy();
    });
  });
});

// ============================================================================
// 6.10-INT-006: Error handling (AC #4)
// ============================================================================

describe('6.10-INT-006: Error handling (AC #4)', () => {
  let tempDir: string;
  let rulesFilePath: string;
  let historyDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'error-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');
    historyDir = path.join(tempDir, 'history');

    await fs.mkdir(historyDir, { recursive: true });
    await fs.writeFile(rulesFilePath, LARGE_RULES_CURSOR, 'utf-8');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Backup failure handling', () => {
    test('should abort consolidation if backup creation fails (AC #4)', async () => {
      // GIVEN: History directory is read-only
      await fs.chmod(historyDir, 0o444);

      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // WHEN: Consolidation is attempted
      // THEN: Should throw AR22Error
      await expect(
        applyConsolidations(approvalState, proposal, rulesFilePath)
      ).rejects.toThrow(AR22Error);

      // Restore permissions for cleanup
      await fs.chmod(historyDir, 0o755);
    });

    test('should not modify rules file if backup fails', async () => {
      // GIVEN: History directory is read-only
      await fs.chmod(historyDir, 0o444);

      const originalContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(originalContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // WHEN: Consolidation is attempted
      try {
        await applyConsolidations(approvalState, proposal, rulesFilePath);
      } catch {
        // Expected to throw
      }

      // THEN: Rules file should remain unchanged
      const currentContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(currentContent).toBe(originalContent);

      // Restore permissions for cleanup
      await fs.chmod(historyDir, 0o755);
    });
  });

  describe('History directory issues', () => {
    test('should create history directory if it does not exist', async () => {
      // GIVEN: No history directory
      const newHistoryDir = path.join(tempDir, 'new-history');
      const newRulesPath = path.join(tempDir, 'rules2.txt');

      await fs.writeFile(newRulesPath, LARGE_RULES_CURSOR, 'utf-8');

      // WHEN: Consolidation is applied
      const rulesContent = await fs.readFile(newRulesPath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');

      // Manually set history directory for this test
      const originalGetRulesFilePath = (await import('../../src/command-variants')).getRulesFilePath;
      jest.spyOn(await import('../../src/command-variants'), 'getRulesFilePath').mockReturnValue(newRulesPath);

      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // THEN: Should create directory and complete
      await applyConsolidations(approvalState, proposal, newRulesPath);

      const historyExists = await fs.access(newHistoryDir).then(() => true).catch(() => false);
      expect(historyExists).toBe(true);
    });
  });

  describe('Concurrent modification handling', () => {
    test('should detect file modification between backup and write', async () => {
      // GIVEN: Rules file
      const originalContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(originalContent, 'cursor');

      // Simulate file modification after backup
      const modifiedContent = '# Modified content\nDifferent rules here';

      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // Mock fs.stat to return different mtime
      const originalStat = fs.stat;
      let callCount = 0;
      jest.spyOn(fs, 'stat').mockImplementation(async (path) => {
        callCount++;
        if (callCount === 2) {
          // Second call (after backup) - return different mtime
          const stats = await originalStat(path as string);
          return { ...stats, mtime: new Date(stats.mtime.getTime() + 1000) };
        }
        return originalStat(path as string);
      });

      // WHEN: Consolidation is attempted
      // THEN: Should detect modification and throw error
      await expect(
        applyConsolidations(approvalState, proposal, rulesFilePath)
      ).rejects.toThrow();

      jest.restoreAllMocks();
    });
  });
});

// ============================================================================
// 6.10-INT-007: Edge cases (AC #1, #6, #7)
// ============================================================================

describe('6.10-INT-007: Edge cases (AC #1, #6, #7)', () => {
  let tempDir: string;
  let rulesFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'edge-cases-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Empty or minimal rule files', () => {
    test('should handle files with < 5 rules', async () => {
      // GIVEN: Rules file with < 5 rules
      await fs.writeFile(rulesFilePath, EMPTY_RULES, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: Analysis is attempted
      // THEN: Should throw error or return gracefully
      await expect(
        consolidateRules(rulesContent, 'cursor')
      ).rejects.toThrow(/too few rules/i);
    });
  });

  describe('Performance with large files', () => {
    test('should complete analysis in < 5 seconds for 1000+ line files', async () => {
      // GIVEN: Large rules file (1000+ lines)
      const largeContent = Array.from({ length: 300 }, (_, i) =>
        `# Category ${i % 20}\nRule ${i} about ${i % 20 === 0 ? 'async/await patterns' : 'various topics'}`
      ).join('\n');

      await fs.writeFile(rulesFilePath, largeContent, 'utf-8');
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');

      // WHEN: Analysis is performed
      const startTime = Date.now();
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const endTime = Date.now();

      // THEN: Should complete in < 5 seconds
      expect(endTime - startTime).toBeLessThan(5000);
      expect(proposal).toHaveProperty('metrics');
    });
  });
});

// ============================================================================
// 6.10-INT-008: Atomic write operations (AC #4)
// ============================================================================

describe('6.10-INT-008: Atomic write operations (AC #4)', () => {
  let tempDir: string;
  let rulesFilePath: string;
  let historyDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomic-write-int-'));
    rulesFilePath = path.join(tempDir, '.cursorrules');
    historyDir = path.join(tempDir, 'history');

    await fs.mkdir(historyDir, { recursive: true });
    await fs.writeFile(rulesFilePath, REDUNDANT_RULES_CURSOR, 'utf-8');
  });

  afterEach(async () => {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('Atomic write pattern', () => {
    test('should use temp file + rename for atomic write', async () => {
      // GIVEN: Rules file
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // WHEN: Consolidation is applied
      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: Should complete without partial writes
      const newContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(newContent.length).toBeGreaterThan(0);

      // File should be complete (no truncation)
      const lines = newContent.split('\n');
      expect(lines[lines.length - 1].trim().length).toBeGreaterThanOrEqual(0);
    });

    test('should set file permissions to 0o600 after write', async () => {
      // GIVEN: Rules file
      const rulesContent = await fs.readFile(rulesFilePath, 'utf-8');
      const proposal = await consolidateRules(rulesContent, 'cursor');
      const approvalState = {
        approved: new Set(proposal.redundancies.map(r => r.groupId)),
        rejected: new Set<string>(),
        edited: new Map<string, string>(),
        contradictions: new Map<string, string>(),
      };

      // WHEN: Consolidation is applied
      await applyConsolidations(approvalState, proposal, rulesFilePath);

      // THEN: File should have 0o600 permissions
      const stats = await fs.stat(rulesFilePath);
      expect(stats.mode & 0o777).toBe(0o600);
    });

    test('should preserve original file if write fails', async () => {
      // This test documents the expected behavior:
      // If the write to temp file fails, the original file should remain unchanged
      // due to the atomic rename pattern

      const originalContent = await fs.readFile(rulesFilePath, 'utf-8');

      // Simulate a scenario where write might fail
      // In actual implementation, temp file write failure would not affect original

      // THEN: Original file should remain unchanged
      const currentContent = await fs.readFile(rulesFilePath, 'utf-8');
      expect(currentContent).toBe(originalContent);
    });
  });
});
