import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import * as path from 'path';

const SCRIPT_PATH = path.resolve('/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/scripts/validate-setup.sh');

describe('Story 1.8 - Validation Script Integration', () => {
  test('[1.8-INT-001] validate-setup.sh should report success for current environment', () => {
    try {
      // Run the script and capture output
      // Using bash explicitly since it's a .sh file
      const output = execSync(`bash ${SCRIPT_PATH}`, { encoding: 'utf8' });

      // The script should exit with 0 and show all tests passed
      expect(output).toContain('Failed: 0');
      expect(output).toContain('Passed:');
      expect(output).not.toContain('FAIL');
    } catch (error: any) {
      // If it fails, print output for debugging
      console.error('Validation script failed:', error.stdout || error.message);
      throw error;
    }
  });
});
