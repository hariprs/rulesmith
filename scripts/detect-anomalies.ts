#!/usr/bin/env node
/**
 * CLI Script: Detect Anomalies
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Usage: npm run detect-anomalies -- [options]
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { executeAnomalyDetection, validateOptions, type AnomalyCLIOptions } from '../src/visualization/cli-commands.js';

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
  .option('sensitivity', {
    alias: 's',
    type: 'string',
    description: 'Anomaly sensitivity',
    choices: ['low', 'medium', 'high'],
    default: 'medium'
  })
  .option('no-spikes', {
    type: 'boolean',
    description: 'Disable spike detection',
    default: false
  })
  .option('no-disappearances', {
    type: 'boolean',
    description: 'Disable disappearance detection',
    default: false
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
const options: AnomalyCLIOptions = {
  window: argv.period as any,
  granularity: argv.granularity as any,
  sensitivity: argv.sensitivity as any,
  detectSpikes: !argv['no-spikes'],
  detectDisappearances: !argv['no-disappearances'],
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

// Execute detection
console.log('Detecting pattern anomalies...');
console.log(`Window: ${options.window}, Sensitivity: ${options.sensitivity}`);
console.log('');

try {
  const { result, output } = await executeAnomalyDetection(options);

  console.log('Detection complete!');
  console.log(`Total patterns analyzed: ${result.totalPatterns}`);
  console.log(`Total anomalies detected: ${result.anomalies.length}`);
  console.log(`Critical anomalies: ${result.criticalAnomalies.length}`);
  console.log(`High severity anomalies: ${result.highSeverityAnomalies.length}`);
  console.log(`Anomaly rate: ${result.anomalyRate.toFixed(1)}%`);

  if (options.outputFile) {
    console.log(`\nOutput saved to: ${options.outputFile}`);
  } else if (output && options.output !== 'dashboard') {
    console.log('\n' + output);
  }

  process.exit(0);
} catch (error) {
  console.error('Error during detection:', error);
  process.exit(1);
}
