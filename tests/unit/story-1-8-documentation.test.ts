import { describe, test, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const README_PATH = path.resolve('/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/README.md');
const SKILL_ROOT = path.resolve('/Users/hpandura/Personal-Projects/Project-Self_Improvement/.claude/skills/rulesmith/');

describe('Story 1.8 - Documentation Quality & Security (Unit)', () => {
  const readmeContent = fs.readFileSync(README_PATH, 'utf8');

  test('[1.8-UNIT-006] Troubleshooting entries must follow AR22 prefix format', () => {
    // Look for lines starting with #### that seem to be error titles
    const troubleshootingSection = readmeContent.split('## Troubleshooting and Validation')[1];
    expect(troubleshootingSection).toBeDefined();

    const errorHeaders = troubleshootingSection.match(/^####\s+(.*)$/gm) || [];
    expect(errorHeaders.length).toBeGreaterThan(0);

    for (const header of errorHeaders) {
      // Every troubleshooting header must start with the specific AR22 prefix
      expect(header).toMatch(/^#### ⚠️ Error:/);
    }
  });

  test('[1.8-UNIT-007] All paths mentioned in Architecture/Security must exist', () => {
    // Extract paths from code blocks in Architecture and Security sections
    const structureSection = readmeContent.split('### Directory Structure')[1].split('### File Purposes')[0];
    const securitySection = readmeContent.split('## Privacy and Security')[1].split('## Troubleshooting and Validation')[0];

    // Find lines that look like file/dir paths in the tree or text
    // Matches patterns like "├── path", "│   ├── path", or "/path/to/file"
    const pathRegex = /[a-zA-Z0-9._\/-]+\.[a-z]{2,5}|[a-zA-Z0-9._\/-]+\/($|\s)/g;

    const extractPaths = (text: string) => {
      return (text.match(pathRegex) || [])
        .map(p => p.trim())
        // Remove tree markers
        .map(p => p.replace(/^[│├└\s─]+/, ''))
        .filter(p => p.length > 2 && !p.startsWith('/') && !p.includes('{timestamp}') && !p.startsWith('http'))
        .map(p => p.endsWith('/') ? p.slice(0, -1) : p);
    };

    const paths = [...new Set([...extractPaths(structureSection), ...extractPaths(securitySection)])];

    // Whitelist some paths that are expected but might not exist yet or are markers
    const whitelist = ['data/history', 'rulesmith', 'path/to/file', 'path/to/state.json', 'rulesmith/', 'history'];

    const allFiles = new Set<string>();
    const allDirs = new Set<string>();
    const walk = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const relPath = path.relative(SKILL_ROOT, fullPath);
        if (fs.statSync(fullPath).isDirectory()) {
          allDirs.add(file);
          allDirs.add(relPath);
          walk(fullPath);
        } else {
          allFiles.add(file);
          allFiles.add(relPath);
        }
      }
    };
    walk(SKILL_ROOT);

    for (const p of paths) {
      if (whitelist.includes(p)) continue;

      // Check if it's an absolute-looking path or just a filename
      if (fs.existsSync(path.join(SKILL_ROOT, p))) continue;

      // If not found as relative path, check if the filename exists anywhere in the skill
      const filename = path.basename(p);
      const found = allFiles.has(filename) || allDirs.has(filename) || allFiles.has(p) || allDirs.has(p);

      if (!found) {
          console.log(`Failed path: ${p}`);
      }
      expect(found).toBe(true);
    }
  });

  test('[1.8-UNIT-008] Mandatory privacy and security strings must be present', () => {
    const mandatoryStrings = [
      /Local-Only/i,
      /no external APIs/i,
      /Privacy First/i,
      /0600/,
      /audit trail/i
    ];

    for (const pattern of mandatoryStrings) {
      expect(readmeContent).toMatch(pattern);
    }
  });
});
