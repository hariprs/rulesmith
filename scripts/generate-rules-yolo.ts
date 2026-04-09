/**
 * Generate Rules CLI (Story 3.7)
 *
 * YOLO approach: Ship fast, iterate later
 * Generates actionable rule suggestions from detected patterns
 *
 * @command npm run generate-rules -- [options]
 */

import { generateRules, RuleGenerator } from '../src/rules/rule-generator';
import { Pattern, PatternCategory } from '../src/pattern-detector';
import { ContentType } from '../src/content-analyzer';
import { CursorFormatter } from '../src/rules/formatters/cursor-formatter';
import { CopilotFormatter } from '../src/rules/formatters/copilot-formatter';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIArgs {
  platform?: 'cursor' | 'copilot' | 'auto';
  format?: 'text' | 'json';
  compare?: boolean;
  output?: string;
  confidence?: number;
  help?: boolean;
}

function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  const parsed: CLIArgs = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--platform' && args[i + 1]) {
      const platform = args[++i];
      if (platform === 'cursor' || platform === 'copilot' || platform === 'auto') {
        parsed.platform = platform;
      }
    } else if (arg === '--format' && args[i + 1]) {
      const format = args[++i];
      if (format === 'text' || format === 'json') {
        parsed.format = format;
      }
    } else if (arg === '--compare') {
      parsed.compare = true;
    } else if (arg === '--output' && args[i + 1]) {
      parsed.output = args[++i];
    } else if (arg === '--confidence' && args[i + 1]) {
      parsed.confidence = parseFloat(args[++i]);
    }
  }

  return parsed;
}

function printHelp(): void {
  console.log(`
Generate Rule Suggestions from Patterns (Story 3.7)

USAGE:
  npm run generate-rules -- [options]

OPTIONS:
  --platform <cursor|copilot|auto>  Target platform (default: auto)
  --format <text|json>              Output format (default: text)
  --compare                         Show before/after comparisons
  --output <path>                   Save output to file
  --confidence <min>                Minimum confidence threshold (0-1, default: 0.3)
  --help, -h                        Show this help message

EXAMPLES:
  npm run generate-rules
  npm run generate-rules -- --platform cursor
  npm run generate-rules -- --format json --output rules.json
  npm run generate-rules -- --compare --confidence 0.5

DESCRIPTION:
  Generates actionable rule suggestions from detected patterns.
  Supports Cursor (.cursorrules) and GitHub Copilot (custom instructions) formats.
  `);
}

// ============================================================================
// PATTERN LOADING
// ============================================================================

/**
 * Load patterns from state file (YOLO approach)
 *
 * @returns Array of patterns
 */
function loadPatterns(): Pattern[] {
  try {
    const statePath = path.join(process.cwd(), 'state.json');

    if (!fs.existsSync(statePath)) {
      console.warn('⚠️  No state.json file found, will use sample patterns');
      return [];
    }

    const stateContent = fs.readFileSync(statePath, 'utf-8');

    let state;
    try {
      state = JSON.parse(stateContent);
    } catch (parseError) {
      console.error('❌ Failed to parse state.json:', parseError instanceof Error ? parseError.message : parseError);
      console.error('   Please ensure state.json contains valid JSON');
      return [];
    }

    if (!state || !state.patterns || !Array.isArray(state.patterns)) {
      console.warn('⚠️  No patterns found in state file');
      return [];
    }

    console.log(`✓ Loaded ${state.patterns.length} patterns from state`);
    return state.patterns;
  } catch (error) {
    console.error('❌ Failed to load patterns from state:', error instanceof Error ? error.message : error);
    return [];
  }
}

/**
 * Load sample patterns for testing (YOLO approach)
 *
 * @returns Array of sample patterns
 */
function loadSamplePatterns(): Pattern[] {
  const now = new Date().toISOString();

  return [
    {
      pattern_text: 'use f-strings instead of format()',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: 'Use format() for string formatting',
          user_correction: 'Use f-strings instead',
          context: 'Python code formatting',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use f-strings instead of format() for string formatting',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'use camelCase for variable names',
      count: 3,
      category: PatternCategory.CODE_STYLE,
      examples: [
        {
          original_suggestion: 'Use snake_case for variables',
          user_correction: 'Use camelCase instead',
          context: 'JavaScript variable naming',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use camelCase for variable and function names',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'refer to API endpoints as endpoints not APIs',
      count: 4,
      category: PatternCategory.TERMINOLOGY,
      examples: [
        {
          original_suggestion: 'Call these APIs',
          user_correction: 'Refer to them as endpoints',
          context: 'API documentation',
          timestamp: now,
          content_type: ContentType.DOCUMENTATION,
        },
      ],
      suggested_rule: 'Refer to API endpoints as "endpoints" not "APIs"',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.DOCUMENTATION],
    },
    {
      pattern_text: 'use async/await instead of callbacks',
      count: 6,
      category: PatternCategory.CONVENTION,
      examples: [
        {
          original_suggestion: 'Use callbacks for async operations',
          user_correction: 'Use async/await instead',
          context: 'Asynchronous JavaScript',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Use async/await instead of callbacks for asynchronous operations',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
    {
      pattern_text: 'order imports standard library third-party local',
      count: 2,
      category: PatternCategory.STRUCTURE,
      examples: [
        {
          original_suggestion: 'Import in any order',
          user_correction: 'Order imports properly',
          context: 'Python import statements',
          timestamp: now,
          content_type: ContentType.CODE,
        },
      ],
      suggested_rule: 'Order imports: standard library, third-party, local modules',
      first_seen: now,
      last_seen: now,
      content_types: [ContentType.CODE],
    },
  ];
}

// ============================================================================
// OUTPUT GENERATION
// ============================================================================

/**
 * Generate text output
 *
 * @param result - Rule generation result
 * @param args - CLI arguments
 * @returns Formatted text
 */
function generateTextOutput(result: any, args: CLIArgs): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('           RULE GENERATION RESULTS');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  // Summary
  lines.push('📊 SUMMARY');
  lines.push(`  Total Rules Generated: ${result.totalRules}`);
  lines.push(`  Processing Time: ${result.processingTimeMs}ms`);
  lines.push('');
  lines.push('  Breakdown by Type:');
  lines.push(`    • New Rules: ${result.summary.newRules}`);
  lines.push(`    • Additions: ${result.summary.additions}`);
  lines.push(`    • Modifications: ${result.summary.modifications}`);
  lines.push('');
  lines.push('  Breakdown by Confidence:');
  lines.push(`    • High (≥0.7): ${result.summary.highConfidence}`);
  lines.push(`    • Medium (≥0.4): ${result.summary.mediumConfidence}`);
  lines.push(`    • Low (<0.4): ${result.summary.lowConfidence}`);
  lines.push('');

  // Rules
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('           GENERATED RULES');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  const cursorFormatter = new CursorFormatter();
  const copilotFormatter = new CopilotFormatter();

  for (const rule of result.rules) {
    const confidenceIcon = rule.confidence >= 0.7 ? '🟢' : rule.confidence >= 0.4 ? '🟡' : '🔴';
    const typeLabel = rule.type.replace('_', ' ').toUpperCase();

    lines.push(`${confidenceIcon} [${typeLabel}] Confidence: ${(rule.confidence * 100).toFixed(0)}%`);
    lines.push(`  Content Type: ${rule.contentType}`);
    lines.push(`  Rule: ${rule.ruleText}`);
    lines.push(`  Explanation: ${rule.explanation}`);
    lines.push(`  Pattern: "${rule.pattern.pattern_text}" (${rule.pattern.count} occurrences)`);
    lines.push('');

    if (args.compare && rule.beforeAfter) {
      lines.push('  BEFORE/AFTER COMPARISON:');
      lines.push(`    Before: ${rule.beforeAfter.before}`);
      lines.push(`    After: ${rule.beforeAfter.after}`);
      lines.push('');
    }

    // Show platform-specific formats
    if (args.platform === 'cursor' || args.platform === 'auto') {
      lines.push(`  📝 Cursor Format:`);
      lines.push(`    ${rule.platformFormats.cursor}`);
      lines.push('');
    }

    if (args.platform === 'copilot' || args.platform === 'auto') {
      lines.push(`  📝 Copilot Format:`);
      lines.push(`    ${rule.platformFormats.copilot}`);
      lines.push('');
    }

    lines.push('─────────────────────────────────────────────────────────────');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate JSON output
 *
 * @param result - Rule generation result
 * @returns JSON string
 */
function generateJsonOutput(result: any): string {
  return JSON.stringify(result, null, 2);
}

// ============================================================================
// MAIN
// ============================================================================

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = parseArgs();

  // Show help if requested
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  console.log('🚀 Starting Rule Generation (YOLO mode)...');
  console.log('');

  // Load patterns (YOLO: Use sample patterns if state is empty)
  let patterns = loadPatterns();

  if (patterns.length === 0) {
    console.log('⚠️  No patterns found in state, using sample patterns for demonstration');
    patterns = loadSamplePatterns();
  }

  console.log(`✓ Processing ${patterns.length} patterns`);
  console.log('');

  // Filter by confidence if specified
  let filteredPatterns = patterns;
  if (args.confidence !== undefined) {
    // For patterns, we'll filter after rule generation
    console.log(`✓ Will filter rules by confidence ≥ ${args.confidence}`);
  }

  // Generate rules
  console.log('⏳ Generating rules...');
  const startTime = Date.now();

  const result = generateRules(filteredPatterns);

  const endTime = Date.now();
  console.log(`✓ Generated ${result.totalRules} rules in ${endTime - startTime}ms`);
  console.log('');

  // Filter by confidence if specified
  let filteredResult = result;
  if (args.confidence !== undefined) {
    const cursorFormatter = new CursorFormatter();
    const copilotFormatter = new CopilotFormatter();

    const filteredRules = result.rules.filter((r: any) => r.confidence >= args.confidence!);
    filteredResult = {
      ...result,
      totalRules: filteredRules.length,
      rules: filteredRules,
    };

    console.log(`✓ Filtered to ${filteredRules.length} rules (confidence ≥ ${args.confidence})`);
    console.log('');
  }

  // Generate output
  let output: string;

  if (args.format === 'json') {
    output = generateJsonOutput(filteredResult);
  } else {
    output = generateTextOutput(filteredResult, args);
  }

  // Print to console or save to file
  if (args.output) {
    const outputPath = path.resolve(args.output);
    fs.writeFileSync(outputPath, output, 'utf-8');
    console.log(`✓ Output saved to: ${outputPath}`);
  } else {
    console.log(output);
  }

  console.log('');
  console.log('✅ Rule generation complete!');
}

// Run main function
main().catch(error => {
  console.error('❌ Error:', error instanceof Error ? error.message : error);
  process.exit(1);
});
