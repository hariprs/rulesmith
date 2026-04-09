/**
 * CLI Commands for Trend Analysis and Predictions
 * Story 3-6: Add Trend Analysis and Predictions (AC6)
 *
 * Provides command-line interface for:
 * - Trend analysis
 * - Pattern predictions
 * - Anomaly detection
 * - Correlation analysis
 * - Batch processing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { MergedPattern } from '../state-management.js';
import { analyzeTrends, exportTrendForChart, getTrendSummaryStatistics, TrendAnalysisOptions } from './trend-analyzer.js';
import { predictPatterns, exportPredictionForChart, PredictionOptions } from './predictor.js';
import { detectAnomalies, exportAnomaliesForChart, getAnomalySummaryStatistics, AnomalyDetectionOptions } from './anomaly-detector.js';
import { analyzeCorrelations, exportCorrelationMatrix, getCorrelationSummaryStatistics, CorrelationMethod } from './correlation-analyzer.js';

/**
 * CLI options for trend analysis
 */
export interface TrendCLIOptions extends TrendAnalysisOptions {
  output?: 'json' | 'markdown' | 'dashboard';
  inputFile?: string;
  outputFile?: string;
  includeCharts?: boolean;
}

/**
 * CLI options for predictions
 */
export interface PredictionCLIOptions extends PredictionOptions {
  output?: 'json' | 'markdown' | 'dashboard';
  inputFile?: string;
  outputFile?: string;
  includeCharts?: boolean;
}

/**
 * CLI options for anomaly detection
 */
export interface AnomalyCLIOptions extends AnomalyDetectionOptions {
  output?: 'json' | 'markdown' | 'dashboard';
  inputFile?: string;
  outputFile?: string;
  includeCharts?: boolean;
}

/**
 * Execute trend analysis via CLI
 * @param options - CLI options
 * @returns Analysis result
 */
export async function executeTrendAnalysis(options: TrendCLIOptions = {}): Promise<{
  result: any;
  output?: string;
  charts?: any[];
}> {
  const {
    window = '30d',
    granularity = 'weekly',
    minPatterns = 2,
    output = 'dashboard',
    inputFile,
    outputFile,
    includeCharts = true
  } = options;

  // Load patterns
  const patterns = await loadPatterns(inputFile);

  // Perform analysis
  const result = analyzeTrends(patterns, {
    window,
    granularity,
    minPatterns,
    interpolate: true
  });

  // Generate output
  let outputText: string | undefined;
  const charts: any[] = [];

  if (output === 'json') {
    outputText = JSON.stringify(result, null, 2);
  } else if (output === 'markdown') {
    outputText = generateTrendMarkdown(result);
  } else if (output === 'dashboard') {
    outputText = generateTrendDashboardHTML(result);
  }

  // Generate charts if requested
  if (includeCharts) {
    result.acceleratingPatterns.slice(0, 5).forEach(trend => {
      charts.push(exportTrendForChart(trend));
    });
  }

  // Save to file if specified
  if (outputFile && outputText) {
    try {
      await fs.writeFile(outputFile, outputText, 'utf-8');
      console.log(`Output written to ${outputFile}`);
    } catch (error) {
      console.error(`Failed to write output to ${outputFile}:`, error);
      throw new Error(`Output file write failed: ${error}`);
    }
  }

  return { result, output: outputText, charts };
}

/**
 * Execute pattern prediction via CLI
 * @param options - CLI options
 * @returns Prediction result
 */
export async function executePatternPrediction(options: PredictionCLIOptions = {}): Promise<{
  result: any;
  output?: string;
  charts?: any[];
}> {
  const {
    model = 'auto',
    horizon = 30,
    window = '30d',
    granularity = 'weekly',
    output = 'dashboard',
    inputFile,
    outputFile,
    includeCharts = true
  } = options;

  // Load patterns
  const patterns = await loadPatterns(inputFile);

  // Perform prediction
  const result = predictPatterns(patterns, {
    model,
    horizon,
    window,
    granularity,
    minDataPoints: 3,
    confidenceLevel: 0.95,
    backtestRatio: 0.2
  });

  // Filter out empty predictions
  const validPredictions = result.filter(p => p.predictions.length > 0);

  // Generate output
  let outputText: string | undefined;
  const charts: any[] = [];

  if (output === 'json') {
    outputText = JSON.stringify(validPredictions, null, 2);
  } else if (output === 'markdown') {
    outputText = generatePredictionMarkdown(validPredictions);
  } else if (output === 'dashboard') {
    outputText = generatePredictionDashboardHTML(validPredictions);
  }

  // Generate charts if requested
  if (includeCharts) {
    validPredictions.slice(0, 5).forEach(prediction => {
      charts.push(exportPredictionForChart(prediction));
    });
  }

  // Save to file if specified
  if (outputFile && outputText) {
    try {
      await fs.writeFile(outputFile, outputText, 'utf-8');
      console.log(`Output written to ${outputFile}`);
    } catch (error) {
      console.error(`Failed to write output to ${outputFile}:`, error);
      throw new Error(`Output file write failed: ${error}`);
    }
  }

  return { result: validPredictions, output: outputText, charts };
}

/**
 * Execute anomaly detection via CLI
 * @param options - CLI options
 * @returns Detection result
 */
export async function executeAnomalyDetection(options: AnomalyCLIOptions = {}): Promise<{
  result: any;
  output?: string;
  charts?: any[];
}> {
  const {
    sensitivity = 'medium',
    window = '30d',
    granularity = 'weekly',
    detectSpikes = true,
    detectDisappearances = true,
    output = 'dashboard',
    inputFile,
    outputFile,
    includeCharts = true
  } = options;

  // Load patterns
  const patterns = await loadPatterns(inputFile);

  // Perform detection
  const result = detectAnomalies(patterns, {
    sensitivity,
    window,
    granularity,
    minDataPoints: 3,
    detectSpikes,
    detectDisappearances
  });

  // Generate output
  let outputText: string | undefined;
  const charts: any[] = [];

  if (output === 'json') {
    outputText = JSON.stringify(result, null, 2);
  } else if (output === 'markdown') {
    outputText = generateAnomalyMarkdown(result);
  } else if (output === 'dashboard') {
    outputText = generateAnomalyDashboardHTML(result);
  }

  // Generate charts if requested
  if (includeCharts && result.anomalies.length > 0) {
    charts.push(exportAnomaliesForChart(result.anomalies));
  }

  // Save to file if specified
  if (outputFile && outputText) {
    try {
      await fs.writeFile(outputFile, outputText, 'utf-8');
      console.log(`Output written to ${outputFile}`);
    } catch (error) {
      console.error(`Failed to write output to ${outputFile}:`, error);
      throw new Error(`Output file write failed: ${error}`);
    }
  }

  return { result, output: outputText, charts };
}

/**
 * Load patterns from file or use default state
 * @param inputFile - Input file path
 * @returns Array of merged patterns
 */
async function loadPatterns(inputFile?: string): Promise<MergedPattern[]> {
  if (inputFile) {
    try {
      // Guard: Validate inputFile is a string
      if (typeof inputFile !== 'string' || inputFile.trim().length === 0) {
        throw new Error('Invalid input file path');
      }

      const stats = await fs.stat(inputFile);
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
      if (stats.size > MAX_FILE_SIZE) {
        throw new Error(`File too large: ${stats.size} bytes (max: ${MAX_FILE_SIZE})`);
      }
      const content = await fs.readFile(inputFile, 'utf-8');

      // Guard: Validate JSON parsing
      let data;
      try {
        data = JSON.parse(content);
      } catch (parseError) {
        throw new Error('Invalid JSON format');
      }

      // Guard: Validate data structure
      if (!data || !Array.isArray(data.patterns_found)) {
        throw new Error('Invalid file format: patterns_found array not found');
      }

      // Guard: Validate and filter patterns
      const validPatterns = data.patterns_found.filter(p =>
        p &&
        typeof p.pattern_text === 'string' &&
        typeof p.total_frequency === 'number' &&
        Number.isFinite(p.total_frequency)
      );

      return validPatterns;
    } catch (error) {
      console.error(`Failed to load patterns from ${inputFile}:`, error);
      return [];
    }
  }

  // Try to load from default state location
  try {
    const statePath = path.join(process.cwd(), '.claude', 'data', 'rulesmith', 'state.json');
    const content = await fs.readFile(statePath, 'utf-8');

    // Guard: Validate JSON parsing
    let data;
    try {
      data = JSON.parse(content);
    } catch (parseError) {
      return [];
    }

    if (Array.isArray(data.patterns_found)) {
      // Guard: Validate and filter patterns
      return data.patterns_found.filter(p =>
        p &&
        typeof p.pattern_text === 'string' &&
        typeof p.total_frequency === 'number' &&
        Number.isFinite(p.total_frequency)
      );
    }
  } catch (error) {
    // No state file found, return empty array
  }

  return [];
}

/**
 * Generate markdown output for trend analysis
 * @param result - Trend analysis result
 * @returns Markdown string
 */
function generateTrendMarkdown(result: any): string {
  const stats = getTrendSummaryStatistics(result);

  let md = `# Pattern Trend Analysis Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary Statistics\n\n`;
  md += `- **Total Patterns Analyzed:** ${stats.totalPatterns}\n`;
  md += `- **Accelerating Patterns:** ${stats.acceleratingCount}\n`;
  md += `- **Declining Patterns:** ${stats.decliningCount}\n`;
  md += `- **Stable Patterns:** ${stats.stableCount}\n`;
  md += `- **Average Confidence:** ${(stats.averageConfidence * 100).toFixed(1)}%\n`;
  md += `- **High Confidence Patterns:** ${stats.highConfidenceCount}\n\n`;

  if (result.acceleratingPatterns.length > 0) {
    md += `## Top Accelerating Patterns\n\n`;
    result.acceleratingPatterns.slice(0, 10).forEach((trend: any, index: number) => {
      const patternText = trend.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Velocity: +${trend.velocity.toFixed(2)} patterns/period\n`;
      md += `   - Confidence: ${(trend.confidence * 100).toFixed(1)}%\n`;
      md += `   - ${trend.summary}\n\n`;
    });
  }

  if (result.decliningPatterns.length > 0) {
    md += `## Top Declining Patterns\n\n`;
    result.decliningPatterns.slice(0, 10).forEach((trend: any, index: number) => {
      const patternText = trend.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Velocity: ${trend.velocity.toFixed(2)} patterns/period\n`;
      md += `   - Confidence: ${(trend.confidence * 100).toFixed(1)}%\n`;
      md += `   - ${trend.summary}\n\n`;
    });
  }

  return md;
}

/**
 * Generate markdown output for predictions
 * @param predictions - Pattern predictions
 * @returns Markdown string
 */
function generatePredictionMarkdown(predictions: any[]): string {
  let md = `# Pattern Prediction Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;

  const emerging = predictions.filter((p: any) => p.willEmerge);
  const disappearing = predictions.filter((p: any) => p.willDisappear);

  md += `## Summary\n\n`;
  md += `- **Total Predictions:** ${predictions.length}\n`;
  md += `- **Patterns Likely to Emerge:** ${emerging.length}\n`;
  md += `- **Patterns Likely to Disappear:** ${disappearing.length}\n\n`;

  if (emerging.length > 0) {
    md += `## ⚠️ Patterns Likely to Emerge\n\n`;
    emerging.slice(0, 10).forEach((pred: any, index: number) => {
      const patternText = pred.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Model: ${pred.model}\n`;
      md += `   - Confidence: ${(pred.confidence * 100).toFixed(1)}%\n`;
      md += `   - ${pred.summary}\n\n`;
    });
  }

  if (disappearing.length > 0) {
    md += `## ⚠️ Patterns Likely to Disappear\n\n`;
    disappearing.slice(0, 10).forEach((pred: any, index: number) => {
      const patternText = pred.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Model: ${pred.model}\n`;
      md += `   - Confidence: ${(pred.confidence * 100).toFixed(1)}%\n`;
      md += `   - ${pred.summary}\n\n`;
    });
  }

  return md;
}

/**
 * Generate markdown output for anomalies
 * @param result - Anomaly detection result
 * @returns Markdown string
 */
function generateAnomalyMarkdown(result: any): string {
  const stats = getAnomalySummaryStatistics(result);

  let md = `# Pattern Anomaly Detection Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n\n`;
  md += `## Summary Statistics\n\n`;
  md += `- **Total Patterns Analyzed:** ${result.totalPatterns}\n`;
  md += `- **Total Anomalies Detected:** ${stats.totalAnomalies}\n`;
  md += `- **Critical Anomalies:** ${stats.criticalCount}\n`;
  md += `- **High Severity Anomalies:** ${stats.highSeverityCount}\n`;
  md += `- **Medium Severity Anomalies:** ${stats.mediumSeverityCount}\n`;
  md += `- **Low Severity Anomalies:** ${stats.lowSeverityCount}\n`;
  md += `- **Anomaly Rate:** ${stats.anomalyRate.toFixed(1)}%\n\n`;

  if (result.criticalAnomalies.length > 0) {
    md += `## 🚨 Critical Anomalies\n\n`;
    result.criticalAnomalies.forEach((anomaly: any, index: number) => {
      const patternText = anomaly.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Type: ${anomaly.type}\n`;
      md += `   - Score: ${anomaly.score.toFixed(2)}\n`;
      md += `   - ${anomaly.explanation}\n`;
      md += `   - **Action:** ${anomaly.recommendedAction}\n\n`;
    });
  }

  if (result.highSeverityAnomalies.length > 0) {
    md += `## ⚠️ High Severity Anomalies\n\n`;
    result.highSeverityAnomalies.slice(0, 10).forEach((anomaly: any, index: number) => {
      const patternText = anomaly.patternText || 'Unknown pattern';
      md += `${index + 1}. **${patternText.substring(0, 60)}${patternText.length > 60 ? '...' : ''}**\n`;
      md += `   - Type: ${anomaly.type}\n`;
      md += `   - Score: ${anomaly.score.toFixed(2)}\n`;
      md += `   - ${anomaly.explanation}\n`;
      md += `   - **Action:** ${anomaly.recommendedAction}\n\n`;
    });
  }

  return md;
}

/**
 * Generate HTML dashboard for trend analysis
 * @param result - Trend analysis result
 * @returns HTML string
 */
function generateTrendDashboardHTML(result: any): string {
  const stats = getTrendSummaryStatistics(result);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Pattern Trend Analysis Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
    .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .pattern-list { margin-top: 20px; }
    .pattern-item { background: #fff; padding: 10px; margin: 5px 0; border-left: 3px solid #ddd; }
    .pattern-item.accelerating { border-left-color: #10b981; }
    .pattern-item.declining { border-left-color: #ef4444; }
    .pattern-item.stable { border-left-color: #808080; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pattern Trend Analysis Dashboard</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Patterns</h3>
        <div class="value">${stats.totalPatterns}</div>
      </div>
      <div class="stat-card">
        <h3>Accelerating</h3>
        <div class="value">${stats.acceleratingCount}</div>
      </div>
      <div class="stat-card">
        <h3>Declining</h3>
        <div class="value">${stats.decliningCount}</div>
      </div>
      <div class="stat-card">
        <h3>Stable</h3>
        <div class="value">${stats.stableCount}</div>
      </div>
      <div class="stat-card">
        <h3>Avg Confidence</h3>
        <div class="value">${(stats.averageConfidence * 100).toFixed(0)}%</div>
      </div>
    </div>

    <div class="pattern-list">
      <h2>Top Accelerating Patterns</h2>
      ${result.acceleratingPatterns.slice(0, 10).map((trend: any) => {
        const patternText = trend.patternText || 'Unknown pattern';
        return `
        <div class="pattern-item accelerating">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          Velocity: +${trend.velocity.toFixed(2)} | Confidence: ${(trend.confidence * 100).toFixed(0)}%
        </div>`;
      }).join('')}
    </div>

    <div class="pattern-list">
      <h2>Top Declining Patterns</h2>
      ${result.decliningPatterns.slice(0, 10).map((trend: any) => {
        const patternText = trend.patternText || 'Unknown pattern';
        return `
        <div class="pattern-item declining">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          Velocity: ${trend.velocity.toFixed(2)} | Confidence: ${(trend.confidence * 100).toFixed(0)}%
        </div>`;
      }).join('')}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate HTML dashboard for predictions
 * @param predictions - Pattern predictions
 * @returns HTML string
 */
function generatePredictionDashboardHTML(predictions: any[]): string {
  const emerging = predictions.filter((p: any) => p.willEmerge);
  const disappearing = predictions.filter((p: any) => p.willDisappear);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Pattern Prediction Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
    .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .pattern-list { margin-top: 20px; }
    .pattern-item { background: #fff; padding: 10px; margin: 5px 0; border-left: 3px solid #ddd; }
    .pattern-item.emerging { border-left-color: #10b981; }
    .pattern-item.disappearing { border-left-color: #ef4444; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pattern Prediction Dashboard</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Predictions</h3>
        <div class="value">${predictions.length}</div>
      </div>
      <div class="stat-card">
        <h3>Emerging</h3>
        <div class="value">${emerging.length}</div>
      </div>
      <div class="stat-card">
        <h3>Disappearing</h3>
        <div class="value">${disappearing.length}</div>
      </div>
    </div>

    ${emerging.length > 0 ? `
    <div class="pattern-list">
      <h2>⚠️ Patterns Likely to Emerge</h2>
      ${emerging.slice(0, 10).map((pred: any) => {
        const patternText = pred.patternText || 'Unknown pattern';
        return `
        <div class="pattern-item emerging">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          Model: ${pred.model} | Confidence: ${(pred.confidence * 100).toFixed(0)}%<br>
          ${pred.summary}
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    ${disappearing.length > 0 ? `
    <div class="pattern-list">
      <h2>⚠️ Patterns Likely to Disappear</h2>
      ${disappearing.slice(0, 10).map((pred: any) => {
        const patternText = pred.patternText || 'Unknown pattern';
        return `
        <div class="pattern-item disappearing">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          Model: ${pred.model} | Confidence: ${(pred.confidence * 100).toFixed(0)}%<br>
          ${pred.summary}
        </div>`;
      }).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Generate HTML dashboard for anomalies
 * @param result - Anomaly detection result
 * @returns HTML string
 */
function generateAnomalyDashboardHTML(result: any): string {
  const stats = getAnomalySummaryStatistics(result);

  return `<!DOCTYPE html>
<html>
<head>
  <title>Anomaly Detection Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    h1 { color: #333; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
    .stat-card { background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #007bff; }
    .stat-card h3 { margin: 0 0 10px 0; font-size: 14px; color: #666; }
    .stat-card .value { font-size: 24px; font-weight: bold; color: #333; }
    .stat-card.critical { border-left-color: #dc2626; }
    .stat-card.high { border-left-color: #f97316; }
    .anomaly-list { margin-top: 20px; }
    .anomaly-item { background: #fff; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #ddd; }
    .anomaly-item.critical { border-left-color: #dc2626; background: #fef2f2; }
    .anomaly-item.high { border-left-color: #f97316; background: #fff7ed; }
    .anomaly-item.medium { border-left-color: #eab308; }
    .anomaly-item.low { border-left-color: #22c55e; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Pattern Anomaly Detection Dashboard</h1>
    <p>Generated: ${new Date().toLocaleString()}</p>

    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total Anomalies</h3>
        <div class="value">${stats.totalAnomalies}</div>
      </div>
      <div class="stat-card critical">
        <h3>Critical</h3>
        <div class="value">${stats.criticalCount}</div>
      </div>
      <div class="stat-card high">
        <h3>High</h3>
        <div class="value">${stats.highSeverityCount}</div>
      </div>
      <div class="stat-card">
        <h3>Medium</h3>
        <div class="value">${stats.mediumSeverityCount}</div>
      </div>
      <div class="stat-card">
        <h3>Anomaly Rate</h3>
        <div class="value">${stats.anomalyRate.toFixed(1)}%</div>
      </div>
    </div>

    ${result.criticalAnomalies.length > 0 ? `
    <div class="anomaly-list">
      <h2>🚨 Critical Anomalies</h2>
      ${result.criticalAnomalies.map((anomaly: any) => {
        const patternText = anomaly.patternText || 'Unknown pattern';
        return `
        <div class="anomaly-item critical">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          <strong>Type:</strong> ${anomaly.type} | <strong>Score:</strong> ${anomaly.score.toFixed(2)}<br>
          ${anomaly.explanation}<br>
          <strong>Recommended Action:</strong> ${anomaly.recommendedAction}
        </div>`;
      }).join('')}
    </div>
    ` : ''}

    ${result.highSeverityAnomalies.length > 0 ? `
    <div class="anomaly-list">
      <h2>⚠️ High Severity Anomalies</h2>
      ${result.highSeverityAnomalies.slice(0, 10).map((anomaly: any) => {
        const patternText = anomaly.patternText || 'Unknown pattern';
        return `
        <div class="anomaly-item high">
          <strong>${patternText.substring(0, 80)}${patternText.length > 80 ? '...' : ''}</strong><br>
          <strong>Type:</strong> ${anomaly.type} | <strong>Score:</strong> ${anomaly.score.toFixed(2)}<br>
          ${anomaly.explanation}<br>
          <strong>Recommended Action:</strong> ${anomaly.recommendedAction}
        </div>`;
      }).join('')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Validate CLI options
 * @param options - Options to validate
 * @returns Validation result
 */
export function validateOptions(options: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Guard: Validate options is an object
  if (!options || typeof options !== 'object') {
    errors.push('Invalid options: must be an object');
    return { valid: false, errors };
  }

  // Validate window
  if (options.window !== undefined) {
    if (typeof options.window !== 'string') {
      errors.push('Invalid window type. Must be a string.');
    } else if (!['7d', '30d', '90d', 'all'].includes(options.window)) {
      errors.push('Invalid window. Must be one of: 7d, 30d, 90d, all');
    }
  }

  // Validate granularity
  if (options.granularity !== undefined) {
    if (typeof options.granularity !== 'string') {
      errors.push('Invalid granularity type. Must be a string.');
    } else if (!['daily', 'weekly', 'monthly'].includes(options.granularity)) {
      errors.push('Invalid granularity. Must be one of: daily, weekly, monthly');
    }
  }

  // Validate sensitivity
  if (options.sensitivity !== undefined) {
    if (typeof options.sensitivity !== 'string') {
      errors.push('Invalid sensitivity type. Must be a string.');
    } else if (!['low', 'medium', 'high'].includes(options.sensitivity)) {
      errors.push('Invalid sensitivity. Must be one of: low, medium, high');
    }
  }

  // Validate model
  if (options.model !== undefined) {
    if (typeof options.model !== 'string') {
      errors.push('Invalid model type. Must be a string.');
    } else if (!['linear', 'moving-avg', 'exponential', 'auto'].includes(options.model)) {
      errors.push('Invalid model. Must be one of: linear, moving-avg, exponential, auto');
    }
  }

  // Validate output
  if (options.output !== undefined) {
    if (typeof options.output !== 'string') {
      errors.push('Invalid output format type. Must be a string.');
    } else if (!['json', 'markdown', 'dashboard'].includes(options.output)) {
      errors.push('Invalid output format. Must be one of: json, markdown, dashboard');
    }
  }

  // Validate numeric parameters
  if (options.minPatterns !== undefined) {
    if (typeof options.minPatterns !== 'number' || !Number.isFinite(options.minPatterns) || options.minPatterns < 1) {
      errors.push('Invalid minPatterns: must be a positive number');
    }
  }

  if (options.minDataPoints !== undefined) {
    if (typeof options.minDataPoints !== 'number' || !Number.isFinite(options.minDataPoints) || options.minDataPoints < 1) {
      errors.push('Invalid minDataPoints: must be a positive number');
    }
  }

  if (options.horizon !== undefined) {
    if (typeof options.horizon !== 'number' || !Number.isFinite(options.horizon) || options.horizon < 1) {
      errors.push('Invalid horizon: must be a positive number');
    }
  }

  if (options.confidenceLevel !== undefined) {
    if (typeof options.confidenceLevel !== 'number' || !Number.isFinite(options.confidenceLevel) || options.confidenceLevel < 0 || options.confidenceLevel > 1) {
      errors.push('Invalid confidenceLevel: must be between 0 and 1');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
