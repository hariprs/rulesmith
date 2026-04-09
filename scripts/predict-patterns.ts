#!/usr/bin/env node
/**
 * CLI Script: Predict Patterns
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Usage: npm run predict-patterns -- [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { executePatternPrediction, validateOptions, type PredictionCLIOptions } from '../src/visualization/cli-commands.js';

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
  .option('model', {
    alias: 'm',
    type: 'string',
    description: 'Prediction model',
    choices: ['linear', 'moving-avg', 'exponential', 'auto'],
    default: 'auto'
  })
  .option('horizon', {
    alias: 'H',
    type: 'number',
    description: 'Prediction horizon (days)',
    default: 30
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
const options: PredictionCLIOptions = {
  window: argv.period as any,
  granularity: argv.granularity as any,
  model: argv.model as any,
  horizon: argv.horizon as any,
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

// Execute prediction
console.log('Predicting pattern trends...');
console.log(`Window: ${options.window}, Model: ${options.model}, Horizon: ${options.horizon} days`);
console.log('');

try {
  const { result, output } = await executePatternPrediction(options);

  const emerging = result.filter((p: any) => p.willEmerge);
  const disappearing = result.filter((p: any) => p.willDisappear);

  console.log('Prediction complete!');
  console.log(`Total predictions generated: ${result.length}`);
  console.log(`Patterns likely to emerge: ${emerging.length}`);
  console.log(`Patterns likely to disappear: ${disappearing.length}`);

  if (options.outputFile) {
    console.log(`\nOutput saved to: ${options.outputFile}`);
  } else if (output && options.output !== 'dashboard') {
    console.log('\n' + output);
  }

  process.exit(0);
} catch (error) {
  console.error('Error during prediction:', error);
  process.exit(1);
}
