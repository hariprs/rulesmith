#!/usr/bin/env node
/**
 * CLI Script: Analyze Trends
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Usage: npm run analyze-trends -- [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { executeTrendAnalysis, validateOptions, type TrendCLIOptions } from '../src/visualization/cli-commands.js';

const argv = await yargs(hideBin(process.argv))
  .option('period', {
    alias: 'p',
    type: 'string',
    description: 'Time window for analysis',
    choices: ['7d', '30d', '90d', 'all'],
    default: '30d'
  })
  .option('granularity', {
    alias: 'g',
    type: 'string',
    description: 'Trend granularity',
    choices: ['daily', 'weekly', 'monthly'],
    default: 'weekly'
  })
  .option('min-patterns', {
    alias: 'm',
    type: 'number',
    description: 'Minimum frequency threshold',
    default: 2
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output format',
    choices: ['json', 'markdown', 'dashboard'],
    default: 'dashboard'
  })
  .option('input-file', {
    alias: 'i',
    type: 'string',
    description: 'Input file path (JSON)'
  })
  .option('output-file', {
    alias: 'f',
    type: 'string',
    description: 'Output file path'
  })
  .option('no-charts', {
    type: 'boolean',
    description: 'Disable chart generation',
    default: false
  })
  .help()
  .alias('help', 'h')
  .parseSync();

// Map argv to options
const options: TrendCLIOptions = {
  window: argv.period as any,
  granularity: argv.granularity as any,
  minPatterns: argv['min-patterns'],
  output: argv.output as any,
  inputFile: argv['input-file'],
  outputFile: argv['output-file'],
  includeCharts: !argv['no-charts']
};

// Validate options
const validation = validateOptions(options);
if (!validation.valid) {
  console.error('Validation errors:');
  validation.errors.forEach(error => console.error(`  - ${error}`));
  process.exit(1);
}

// Execute analysis
console.log('Analyzing pattern trends...');
console.log(`Window: ${options.window}, Granularity: ${options.granularity}`);
console.log('');

try {
  const { result, output } = await executeTrendAnalysis(options);

  console.log('Analysis complete!');
  console.log(`Total patterns analyzed: ${result.totalPatterns}`);
  console.log(`Accelerating patterns: ${result.acceleratingPatterns.length}`);
  console.log(`Declining patterns: ${result.decliningPatterns.length}`);
  console.log(`Stable patterns: ${result.stablePatterns.length}`);

  if (options.outputFile) {
    console.log(`\nOutput saved to: ${options.outputFile}`);
  } else if (output && options.output !== 'dashboard') {
    console.log('\n' + output);
  }

  process.exit(0);
} catch (error) {
  console.error('Error during analysis:', error);
  process.exit(1);
}
