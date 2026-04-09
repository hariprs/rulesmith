/**
 * E2E Tests for CLI Interface Workflow (Story 3-6: AC6)
 *
 * TDD Red Phase: Failing E2E acceptance tests ONLY
 *
 * These tests validate the COMPLETE end-to-end CLI workflow including:
 * - Command-line interface execution
 * - File system operations (reading patterns, writing output)
 * - User interaction flows (options parsing, validation)
 * - Integration of all analysis components
 *
 * Testing Strategy:
 * - Test complete user workflows from CLI invocation to output generation
 * - Validate file I/O and integration points
 * - Test error handling and user feedback
 * - Only for workflows that genuinely require full system interaction
 *
 * Test Pyramid Level: E2E (System-level)
 * Scope: CLI commands and file operations
 *
 * AC Coverage:
 * - AC6: CLI Interface and Customization Options (complete workflow)
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, test, expect } from '@jest/globals';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Execute CLI command and capture output
 */
function executeCommand(command: string): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || 1,
    };
  }
}

/**
 * Create a temporary test patterns file
 */
function createTestPatternsFile(filePath: string): void {
  const testPatterns = JSON.stringify(
    [
      {
        pattern_text: 'Use const instead of let',
        count: 5,
        category: 'code_style',
        examples: [],
        suggested_rule: 'Use const for immutable variables',
        first_seen: '2026-01-15T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: ['code'],
        session_count: 8,
        total_frequency: 45,
        is_new: false,
        frequency_change: 2.5,
      },
      {
        pattern_text: 'Add unit tests for new functions',
        count: 3,
        category: 'convention',
        examples: [],
        suggested_rule: 'Add unit tests for all new functions',
        first_seen: '2026-02-01T10:00:00Z',
        last_seen: '2026-03-15T11:00:00Z',
        content_types: ['code', 'test_plan'],
        session_count: 6,
        total_frequency: 28,
        is_new: false,
        frequency_change: 1.8,
      },
    ],
    null,
    2
  );

  require('fs').writeFileSync(filePath, testPatterns);
}

/**
 * Clean up test files
 */
function cleanupTestFiles(...filePaths: string[]): void {
  filePaths.forEach(filePath => {
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });
}

// ============================================================================
// AC6: CLI INTERFACE - END-TO-END WORKFLOW TESTS
// ============================================================================

describe('AC6: CLI Interface - Complete Workflow (E2E)', () => {
  const testOutputDir = join(process.cwd(), '_test-output');
  const testPatternsFile = join(testOutputDir, 'test-patterns.json');
  const testOutputJson = join(testOutputDir, 'trend-output.json');
  const testOutputMarkdown = join(testOutputDir, 'trend-output.md');

  beforeAll(() => {
    // Create test output directory
    if (!existsSync(testOutputDir)) {
      require('fs').mkdirSync(testOutputDir, { recursive: true });
    }
    createTestPatternsFile(testPatternsFile);
  });

  afterAll(() => {
    cleanupTestFiles(testPatternsFile, testOutputJson, testOutputMarkdown);
  });

  describe('analyze-trends CLI Command', () => {
    test('should execute analyze-trends command with default options', () => {
      // Act
      const result = executeCommand('npm run analyze-trends -- --help');

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('analyze-trends');
      expect(result.stdout).toContain('--period');
      expect(result.stdout).toContain('--granularity');
    });

    test('should accept --period option with valid values', () => {
      // Act
      const result7d = executeCommand(`npm run analyze-trends -- --period 7d --input ${testPatternsFile} --output json`);
      const result30d = executeCommand(`npm run analyze-trends -- --period 30d --input ${testPatternsFile} --output json`);
      const result90d = executeCommand(`npm run analyze-trends -- --period 90d --input ${testPatternsFile} --output json`);
      const resultAll = executeCommand(`npm run analyze-trends -- --period all --input ${testPatternsFile} --output json`);

      // Assert
      // Commands should execute without errors
      expect(result7d.exitCode).toBe(0);
      expect(result30d.exitCode).toBe(0);
      expect(result90d.exitCode).toBe(0);
      expect(resultAll.exitCode).toBe(0);
    });

    test('should reject --period option with invalid values', () => {
      // Act
      const result = executeCommand(`npm run analyze-trends -- --period invalid --input ${testPatternsFile}`);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('invalid');
    });

    test('should accept --granularity option with valid values', () => {
      // Act
      const resultDaily = executeCommand(`npm run analyze-trends -- --granularity daily --input ${testPatternsFile} --output json`);
      const resultWeekly = executeCommand(`npm run analyze-trends -- --granularity weekly --input ${testPatternsFile} --output json`);
      const resultMonthly = executeCommand(`npm run analyze-trends -- --granularity monthly --input ${testPatternsFile} --output json`);

      // Assert
      expect(resultDaily.exitCode).toBe(0);
      expect(resultWeekly.exitCode).toBe(0);
      expect(resultMonthly.exitCode).toBe(0);
    });

    test('should reject --granularity option with invalid values', () => {
      // Act
      const result = executeCommand(`npm run analyze-trends -- --granularity hourly --input ${testPatternsFile}`);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('granularity');
    });

    test('should accept --min-patterns option with positive integer', () => {
      // Act
      const result = executeCommand(`npm run analyze-trends -- --min-patterns 5 --input ${testPatternsFile} --output json`);

      // Assert
      expect(result.exitCode).toBe(0);
    });

    test('should reject --min-patterns option with non-positive values', () => {
      // Act
      const resultZero = executeCommand(`npm run analyze-trends -- --min-patterns 0 --input ${testPatternsFile}`);
      const resultNegative = executeCommand(`npm run analyze-trends -- --min-patterns -1 --input ${testPatternsFile}`);

      // Assert
      expect(resultZero.exitCode).not.toBe(0);
      expect(resultNegative.exitCode).not.toBe(0);
    });

    test('should output JSON format when specified', () => {
      // Act
      const result = executeCommand(
        `npm run analyze-trends -- --input ${testPatternsFile} --output json > ${testOutputJson}`
      );

      // Assert
      expect(result.exitCode).toBe(0);
      expect(existsSync(testOutputJson)).toBe(true);

      // Validate JSON output
      const output = JSON.parse(readFileSync(testOutputJson, 'utf-8'));
      expect(output).toBeDefined();
      expect(output.patterns).toBeDefined();
      expect(output.analysisWindow).toBeDefined();
      expect(output.granularity).toBeDefined();
    });

    test('should output markdown format when specified', () => {
      // Act
      const result = executeCommand(
        `npm run analyze-trends -- --input ${testPatternsFile} --output markdown > ${testOutputMarkdown}`
      );

      // Assert
      expect(result.exitCode).toBe(0);
      expect(existsSync(testOutputMarkdown)).toBe(true);

      // Validate markdown output
      const output = readFileSync(testOutputMarkdown, 'utf-8');
      expect(output).toContain('# Trend Analysis Report');
      expect(output).toContain('## Summary');
    });

    test('should provide helpful error message for missing input file', () => {
      // Act
      const result = executeCommand('npm run analyze-trends -- --input nonexistent-file.json');

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('input');
      expect(result.stderr).toContain('not found');
    });
  });

  describe('predict-patterns CLI Command', () => {
    test('should execute predict-patterns command with default options', () => {
      // Act
      const result = executeCommand('npm run predict-patterns -- --help');

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('predict-patterns');
      expect(result.stdout).toContain('--prediction-horizon');
      expect(result.stdout).toContain('--prediction-model');
    });

    test('should accept --prediction-horizon option with positive days', () => {
      // Act
      const result = executeCommand(
        `npm run predict-patterns -- --prediction-horizon 30 --input ${testPatternsFile} --output json`
      );

      // Assert
      expect(result.exitCode).toBe(0);
    });

    test('should reject --prediction-horizon option with non-positive values', () => {
      // Act
      const resultZero = executeCommand(`npm run predict-patterns -- --prediction-horizon 0 --input ${testPatternsFile}`);
      const resultNegative = executeCommand(`npm run predict-patterns -- --prediction-horizon -1 --input ${testPatternsFile}`);

      // Assert
      expect(resultZero.exitCode).not.toBe(0);
      expect(resultNegative.exitCode).not.toBe(0);
    });

    test('should accept --prediction-model option with valid values', () => {
      // Act
      const resultLinear = executeCommand(
        `npm run predict-patterns -- --prediction-model linear --input ${testPatternsFile} --output json`
      );
      const resultMovingAvg = executeCommand(
        `npm run predict-patterns -- --prediction-model moving-avg --input ${testPatternsFile} --output json`
      );
      const resultExponential = executeCommand(
        `npm run predict-patterns -- --prediction-model exponential --input ${testPatternsFile} --output json`
      );
      const resultAuto = executeCommand(
        `npm run predict-patterns -- --prediction-model auto --input ${testPatternsFile} --output json`
      );

      // Assert
      expect(resultLinear.exitCode).toBe(0);
      expect(resultMovingAvg.exitCode).toBe(0);
      expect(resultExponential.exitCode).toBe(0);
      expect(resultAuto.exitCode).toBe(0);
    });

    test('should reject --prediction-model option with invalid values', () => {
      // Act
      const result = executeCommand(`npm run predict-patterns -- --prediction-model arima --input ${testPatternsFile}`);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('prediction-model');
    });

    test('should generate 30-day forecast by default', () => {
      // Act
      const result = executeCommand(
        `npm run predict-patterns -- --input ${testPatternsFile} --output json > ${testOutputJson}`
      );

      // Assert
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(readFileSync(testOutputJson, 'utf-8'));
      expect(output.predictions).toBeDefined();
      expect(output.predictions.length).toBeGreaterThan(0);
      expect(output.predictions[0].forecast.length).toBe(30);
    });
  });

  describe('detect-anomalies CLI Command', () => {
    test('should execute detect-anomalies command with default options', () => {
      // Act
      const result = executeCommand('npm run detect-anomalies -- --help');

      // Assert
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('detect-anomalies');
      expect(result.stdout).toContain('--anomaly-sensitivity');
    });

    test('should accept --anomaly-sensitivity option with valid values', () => {
      // Act
      const resultLow = executeCommand(
        `npm run detect-anomalies -- --anomaly-sensitivity low --input ${testPatternsFile} --output json`
      );
      const resultMedium = executeCommand(
        `npm run detect-anomalies -- --anomaly-sensitivity medium --input ${testPatternsFile} --output json`
      );
      const resultHigh = executeCommand(
        `npm run detect-anomalies -- --anomaly-sensitivity high --input ${testPatternsFile} --output json`
      );

      // Assert
      expect(resultLow.exitCode).toBe(0);
      expect(resultMedium.exitCode).toBe(0);
      expect(resultHigh.exitCode).toBe(0);
    });

    test('should reject --anomaly-sensitivity option with invalid values', () => {
      // Act
      const result = executeCommand(`npm run detect-anomalies -- --anomaly-sensitivity extreme --input ${testPatternsFile}`);

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('anomaly-sensitivity');
    });

    test('should generate anomaly report with severity levels', () => {
      // Act
      const result = executeCommand(
        `npm run detect-anomalies -- --input ${testPatternsFile} --output json > ${testOutputJson}`
      );

      // Assert
      expect(result.exitCode).toBe(0);
      const output = JSON.parse(readFileSync(testOutputJson, 'utf-8'));
      expect(output.anomalies).toBeDefined();
      expect(output.severityLevels).toBeDefined();
    });
  });

  describe('CLI Workflow Integration', () => {
    test('should support complete workflow: analyze → predict → detect', () => {
      // Arrange
      const analyzeOutput = join(testOutputDir, 'analyze.json');
      const predictOutput = join(testOutputDir, 'predict.json');
      const detectOutput = join(testOutputDir, 'detect.json');

      try {
        // Act - Step 1: Analyze trends
        const analyzeResult = executeCommand(
          `npm run analyze-trends -- --input ${testPatternsFile} --output json > ${analyzeOutput}`
        );

        // Assert - Step 1
        expect(analyzeResult.exitCode).toBe(0);
        expect(existsSync(analyzeOutput)).toBe(true);
        const analyzeData = JSON.parse(readFileSync(analyzeOutput, 'utf-8'));
        expect(analyzeData.patterns).toBeDefined();

        // Act - Step 2: Predict patterns
        const predictResult = executeCommand(
          `npm run predict-patterns -- --input ${testPatternsFile} --output json > ${predictOutput}`
        );

        // Assert - Step 2
        expect(predictResult.exitCode).toBe(0);
        expect(existsSync(predictOutput)).toBe(true);
        const predictData = JSON.parse(readFileSync(predictOutput, 'utf-8'));
        expect(predictData.predictions).toBeDefined();

        // Act - Step 3: Detect anomalies
        const detectResult = executeCommand(
          `npm run detect-anomalies -- --input ${testPatternsFile} --output json > ${detectOutput}`
        );

        // Assert - Step 3
        expect(detectResult.exitCode).toBe(0);
        expect(existsSync(detectOutput)).toBe(true);
        const detectData = JSON.parse(readFileSync(detectOutput, 'utf-8'));
        expect(detectData.anomalies).toBeDefined();
      } finally {
        cleanupTestFiles(analyzeOutput, predictOutput, detectOutput);
      }
    });

    test('should handle batch analysis for multiple time periods', () => {
      // Arrange
      const output7d = join(testOutputDir, 'batch-7d.json');
      const output30d = join(testOutputDir, 'batch-30d.json');
      const output90d = join(testOutputDir, 'batch-90d.json');

      try {
        // Act
        const result7d = executeCommand(
          `npm run analyze-trends -- --period 7d --input ${testPatternsFile} --output json > ${output7d}`
        );
        const result30d = executeCommand(
          `npm run analyze-trends -- --period 30d --input ${testPatternsFile} --output json > ${output30d}`
        );
        const result90d = executeCommand(
          `npm run analyze-trends -- --period 90d --input ${testPatternsFile} --output json > ${output90d}`
        );

        // Assert
        expect(result7d.exitCode).toBe(0);
        expect(result30d.exitCode).toBe(0);
        expect(result90d.exitCode).toBe(0);

        // All outputs should be valid JSON
        const data7d = JSON.parse(readFileSync(output7d, 'utf-8'));
        const data30d = JSON.parse(readFileSync(output30d, 'utf-8'));
        const data90d = JSON.parse(readFileSync(output90d, 'utf-8'));

        expect(data7d.analysisWindow).toBe('7d');
        expect(data30d.analysisWindow).toBe('30d');
        expect(data90d.analysisWindow).toBe('90d');
      } finally {
        cleanupTestFiles(output7d, output30d, output90d);
      }
    });

    test('should provide consistent output format across commands', () => {
      // Arrange
      const analyzeOutput = join(testOutputDir, 'analyze-format.json');
      const predictOutput = join(testOutputDir, 'predict-format.json');
      const detectOutput = join(testOutputDir, 'detect-format.json');

      try {
        // Act
        executeCommand(`npm run analyze-trends -- --input ${testPatternsFile} --output json > ${analyzeOutput}`);
        executeCommand(`npm run predict-patterns -- --input ${testPatternsFile} --output json > ${predictOutput}`);
        executeCommand(`npm run detect-anomalies -- --input ${testPatternsFile} --output json > ${detectOutput}`);

        // Assert - All outputs should have metadata
        const analyzeData = JSON.parse(readFileSync(analyzeOutput, 'utf-8'));
        const predictData = JSON.parse(readFileSync(predictOutput, 'utf-8'));
        const detectData = JSON.parse(readFileSync(detectOutput, 'utf-8'));

        expect(analyzeData.metadata).toBeDefined();
        expect(predictData.metadata).toBeDefined();
        expect(detectData.metadata).toBeDefined();

        expect(analyzeData.metadata.analysisDate).toBeDefined();
        expect(predictData.metadata.analysisDate).toBeDefined();
        expect(detectData.metadata.analysisDate).toBeDefined();
      } finally {
        cleanupTestFiles(analyzeOutput, predictOutput, detectOutput);
      }
    });
  });

  describe('Error Handling and User Feedback', () => {
    test('should provide clear error messages for missing required options', () => {
      // Act
      const result = executeCommand('npm run analyze-trends -- --input nonexistent.json');

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.length).toBeGreaterThan(0);
    });

    test('should provide helpful error messages for invalid option combinations', () => {
      // Act
      const result = executeCommand(
        `npm run analyze-trends -- --period invalid --granularity invalid --input ${testPatternsFile}`
      );

      // Assert
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('period');
      expect(result.stderr).toContain('granularity');
    });

    test('should validate input file format before processing', () => {
      // Arrange
      const invalidJsonFile = join(testOutputDir, 'invalid.json');
      require('fs').writeFileSync(invalidJsonFile, '{ invalid json }');

      try {
        // Act
        const result = executeCommand(`npm run analyze-trends -- --input ${invalidJsonFile}`);

        // Assert
        expect(result.exitCode).not.toBe(0);
        expect(result.stderr).toContain('json');
      } finally {
        cleanupTestFiles(invalidJsonFile);
      }
    });

    test('should handle graceful degradation for partial data', () => {
      // Arrange
      const partialDataFile = join(testOutputDir, 'partial.json');
      require('fs').writeFileSync(
        partialDataFile,
        JSON.stringify([
          {
            pattern_text: 'Valid pattern',
            count: 5,
            category: 'code_style',
            examples: [],
            suggested_rule: 'Test rule',
            first_seen: '2026-03-18T10:00:00Z',
            last_seen: '2026-03-18T10:00:00Z',
            content_types: ['code'],
            session_count: 1,
            total_frequency: 5,
            is_new: true,
            frequency_change: 0,
          },
          {
            // Missing required fields
            pattern_text: 'Invalid pattern',
          },
        ])
      );

      try {
        // Act
        const result = executeCommand(`npm run analyze-trends -- --input ${partialDataFile} --output json`);

        // Assert - Should process valid patterns and skip invalid ones
        expect(result.exitCode).toBe(0);
      } finally {
        cleanupTestFiles(partialDataFile);
      }
    });
  });
});
