import * as fs from 'fs';
import * as path from 'path';
import { describe, test, expect } from '@jest/globals';

/**
 * Acceptance Tests for Story 1.8: Create Documentation README
 *
 * Strategy: Integration tests to verify the existence and content of the README.md file
 * against the specified acceptance criteria.
 */
describe('Story 1.8: Documentation README Acceptance Tests', () => {
  const readmePath = path.join(process.cwd(), '.claude/skills/rulesmith/README.md');

  test('AC1: README should exist and contain installation instructions', () => {
    expect(fs.existsSync(readmePath)).toBe(true);
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/# Project Self-Improvement/i);
    expect(content).toMatch(/Installation/i);
    expect(content).toMatch(/Claude Code/i);
    expect(content).toMatch(/Cursor/i);
  });

  test('AC2: README should include a description of what the skill does', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/As a developer/i);
    expect(content).toMatch(/automatically analyze/i);
    expect(content).toMatch(/patterns/i);
  });

  test('AC3: README should list all available commands', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('/improve-rules');
    expect(content).toContain('--stats');
    expect(content).toContain('--history');
    expect(content).toContain('--rollback');
  });

  test('AC4: README should explain the directory structure', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toContain('rulesmith/');
    expect(content).toContain('SKILL.md');
    expect(content).toContain('prompts/');
    expect(content).toContain('data/');
    expect(content).toContain('scripts/');
  });

  test('AC5: README should include privacy and security guarantees', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/Privacy/i);
    expect(content).toMatch(/Security/i);
    expect(content).toMatch(/local-only/i);
    expect(content).toMatch(/no external APIs/i);
  });

  test('AC6: README should include a troubleshooting section with AR22 format', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/Troubleshooting/i);
    expect(content).toContain('AR22');
    expect(content).toMatch(/⚠️ Error:/);
  });

  test('AC7: README should explain platform auto-detection logic', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/Platform Auto-detection/i);
    expect(content).toMatch(/Claude Code/i);
    expect(content).toMatch(/Cursor/i);
    expect(content).toMatch(/Copilot/i);
  });

  test('AC8: README should document automated guard-based validation', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/Validation/i);
    expect(content).toMatch(/scripts\/validate-setup.sh/i);
    expect(content).toMatch(/guard-based/i);
  });

  test('AC9: README should include a Quick Start guide', () => {
    const content = fs.readFileSync(readmePath, 'utf-8');
    expect(content).toMatch(/Quick Start/i);
    expect(content).toMatch(/Verify/i);
  });
});
