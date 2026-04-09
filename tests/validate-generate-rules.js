import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promptPath = path.join(__dirname, '../.claude/skills/rulesmith/prompts/generate-rules.md');
const content = fs.readFileSync(promptPath, 'utf8');

const requiredHeaders = ['# Context', '# Task', '# Input', '# Output Format', '# Examples'];
const missingHeaders = requiredHeaders.filter(h => !content.includes(h));

if (missingHeaders.length > 0) {
  console.error('Missing headers:', missingHeaders);
  process.exit(1);
}

if (!content.includes('proposed_rules')) {
  console.error('Missing proposed_rules schema');
  process.exit(1);
}

if (!content.includes('before_text": ""')) {
  console.error('Missing empty before_text constraint for additions');
  process.exit(1);
}

console.log('generate-rules.md validation passed! ✅');
