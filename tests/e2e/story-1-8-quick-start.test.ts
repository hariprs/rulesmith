import { describe, test, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const SKILL_ROOT = path.resolve('/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/');
const VALIDATE_SCRIPT = path.join(SKILL_ROOT, 'scripts/validate-setup.sh');

describe('Story 1.8 - Quick Start E2E Smoke Test', () => {
  test('[1.8-E2E-001] Should successfully complete the Quick Start journey', () => {
    // Step 1: Ensure all files are in the correct location (Structure check)
    expect(fs.existsSync(path.join(SKILL_ROOT, 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(SKILL_ROOT, 'README.md'))).toBe(true);
    expect(fs.existsSync(path.join(SKILL_ROOT, 'prompts/'))).toBe(true);
    expect(fs.existsSync(path.join(SKILL_ROOT, 'data/'))).toBe(true);
    expect(fs.existsSync(path.join(SKILL_ROOT, 'scripts/'))).toBe(true);

    // Step 2: Verify installation by running the validation script
    const validationOutput = execSync(`bash ${VALIDATE_SCRIPT}`, { encoding: 'utf8' });
    expect(validationOutput).toContain('Passed:');
    expect(validationOutput).toContain('Failed: 0');

    // Step 3: Run the skill for the first time
    // Note: In a real environment, this would be /improve-rules
    // We simulate by checking if the command handlers exist and are executable
    const commandsTs = path.join(SKILL_ROOT, 'commands.ts');
    const commandsCjs = path.join(SKILL_ROOT, 'commands.cjs');
    expect(fs.existsSync(commandsTs) || fs.existsSync(commandsCjs)).toBe(true);

    // We can also verify the SKILL.md has the command registered
    const skillMd = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    expect(skillMd).toContain('/improve-rules');
  });
});
