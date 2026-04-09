/**
 * Integration Tests: CLI Commands
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Integration tests for CLI command execution covering the full workflow:
 * - Trend analysis with various options
 * - Pattern prediction with model selection
 * - Anomaly detection with sensitivity levels
 * - Option validation and error handling
 * - Output format generation (JSON, markdown, dashboard)
 *
 * Testing Strategy:
 * - Test CLI command functions end-to-end (not actual CLI invocation)
 * - Use real MergedPattern[] fixtures
 * - Verify option parsing and validation
 * - Test error recovery
 * - DO NOT test actual terminal I/O (that's E2E)
 *
 * Test Pyramid Level: Integration (25% - API-level tests)
 * Note: These are integration tests at the command function level, not E2E tests.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  executeTrendAnalysis,
  executePatternPrediction,
  executeAnomalyDetection,
  validateOptions,
  type TrendCLIOptions,
  type PredictionCLIOptions,
  type AnomalyCLIOptions
} from '../../../src/visualization/cli-commands.js';
import type { MergedPattern } from '../../../src/state-management.js';
import { PatternCategory } from '../../../src/pattern-detector.js';

describe('CLI Commands Integration', () => {
  let samplePatterns: MergedPattern[];

  beforeEach(() => {
    // Create realistic test patterns with temporal data
    samplePatterns = [
      {
        pattern_text: 'Use const instead of let',
        count: 15,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Use const for immutable variables',
        first_seen: '2026-01-01T10:00:00Z',
        last_seen: '2026-03-15T11:00:00Z',
        content_types: ['code'],
        session_count: 5,
        total_frequency: 75,
        is_new: false,
        frequency_change: 0.5
      },
      {
        pattern_text: 'Add unit tests for new functions',
        count: 12,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Add unit tests for all new functions',
        first_seen: '2026-01-15T10:00:00Z',
        last_seen: '2026-03-10T11:00:00Z',
        content_types: ['code'],
        session_count: 4,
        total_frequency: 48,
        is_new: false,
        frequency_change: 0.3
      },
      {
        pattern_text: 'Use TypeScript strict mode',
        count: 8,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Enable TypeScript strict mode',
        first_seen: '2026-02-01T10:00:00Z',
        last_seen: '2026-03-18T11:00:00Z',
        content_types: ['code'],
        session_count: 3,
        total_frequency: 24,
        is_new: false,
        frequency_change: 0.8
      }
    ];
  });

  describe('executeTrendAnalysis', () => {
    it('should execute trend analysis with default options', async () => {
      const result = await executeTrendAnalysis(samplePatterns);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.analysisType).toBe('trend');
    });

    it('should execute trend analysis with custom period', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        period: '7d'
      });

      expect(result.success).toBe(true);
      expect(result.data.analysisWindow).toBe('7d');
    });

    it('should support different time windows (7d, 30d, 90d, all)', async () => {
      const windows = ['7d', '30d', '90d', 'all'] as const;

      for (const window of windows) {
        const result = await executeTrendAnalysis(samplePatterns, {
          period: window
        });

        expect(result.success).toBe(true);
        expect(result.data.analysisWindow).toBe(window);
      }
    });

    it('should support different granularities (daily, weekly, monthly)', async () => {
      const granularities = ['daily', 'weekly', 'monthly'] as const;

      for (const granularity of granularities) {
        const result = await executeTrendAnalysis(samplePatterns, {
          granularity
        });

        expect(result.success).toBe(true);
        expect(result.data.granularity).toBe(granularity);
      }
    });

    it('should filter by minimum pattern frequency', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        minPatterns: 10
      });

      expect(result.success).toBe(true);
      expect(result.data.patterns.length).toBeLessThanOrEqual(samplePatterns.length);
    });

    it('should generate JSON output format', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        output: 'json'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('json');
      expect(result.output).toBeDefined();
    });

    it('should generate markdown output format', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        output: 'markdown'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('markdown');
      expect(result.output).toBeDefined();
      expect(typeof result.output).toBe('string');
    });

    it('should generate dashboard-compatible output', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        output: 'dashboard'
      });

      expect(result.success).toBe(true);
      expect(result.metadata.format).toBe('dashboard');
      expect(result.data).toBeDefined();
    });

    it('should handle empty pattern array', async () => {
      const result = await executeTrendAnalysis([]);

      expect(result).toBeDefined();
      expect(result.data.patterns).toEqual([]);
    });

    it('should include metadata in response', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        period: '30d',
        granularity: 'weekly'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.analysisType).toBe('trend');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.options).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid options that should be caught
      const result = await executeTrendAnalysis(samplePatterns, {
        period: 'invalid' as any
      });

      expect(result).toBeDefined();
      // Should either succeed with defaults or fail gracefully
      expect(result.success).toBeDefined();
    });
  });

  describe('executePatternPrediction', () => {
    it('should execute prediction with default options', async () => {
      const result = await executePatternPrediction(samplePatterns);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata.analysisType).toBe('prediction');
    });

    it('should support linear regression model', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionModel: 'linear'
      });

      expect(result.success).toBe(true);
      expect(result.data.model).toBe('linear');
    });

    it('should support moving average model', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionModel: 'moving-avg'
      });

      expect(result.success).toBe(true);
      expect(result.data.model).toBe('moving-avg');
    });

    it('should support exponential smoothing model', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionModel: 'exponential'
      });

      expect(result.success).toBe(true);
      expect(result.data.model).toBe('exponential');
    });

    it('should support auto model selection', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionModel: 'auto'
      });

      expect(result.success).toBe(true);
      expect(['linear', 'moving-avg', 'exponential']).toContain(result.data.model);
    });

    it('should respect custom prediction horizon', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionHorizon: 60
      });

      expect(result.success).toBe(true);
      expect(result.data.horizon).toBe(60);
    });

    it('should include confidence intervals', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionHorizon: 30
      });

      expect(result.success).toBe(true);
      result.data.patterns.forEach(prediction => {
        if (prediction.confidenceInterval) {
          expect(prediction.confidenceInterval.lower).toBeDefined();
          expect(prediction.confidenceInterval.upper).toBeDefined();
        }
      });
    });

    it('should identify emerging and disappearing patterns', async () => {
      const result = await executePatternPrediction(samplePatterns);

      expect(result.success).toBe(true);
      expect(result.data.emergingPatterns).toBeDefined();
      expect(result.data.disappearingPatterns).toBeDefined();
    });

    it('should perform backtesting for accuracy', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        backtest: true
      });

      expect(result.success).toBe(true);
      expect(result.data.accuracy).toBeDefined();
      expect(result.data.accuracy!.mae).toBeDefined();
      expect(result.data.accuracy!.rmse).toBeDefined();
    });

    it('should generate different output formats', async () => {
      const formats = ['json', 'markdown', 'dashboard'] as const;

      for (const format of formats) {
        const result = await executePatternPrediction(samplePatterns, {
          output: format
        });

        expect(result.success).toBe(true);
        expect(result.metadata.format).toBe(format);
      }
    });

    it('should include prediction metadata', async () => {
      const result = await executePatternPrediction(samplePatterns, {
        predictionHorizon: 30,
        predictionModel: 'linear'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.analysisType).toBe('prediction');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.options).toBeDefined();
    });
  });

  describe('executeAnomalyDetection', () => {
    it('should execute anomaly detection with default options', async () => {
      const result = await executeAnomalyDetection(samplePatterns);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.metadata.analysisType).toBe('anomaly');
    });

    it('should support low sensitivity', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        anomalySensitivity: 'low'
      });

      expect(result.success).toBe(true);
      expect(result.data.sensitivity).toBe('low');
    });

    it('should support medium sensitivity', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        anomalySensitivity: 'medium'
      });

      expect(result.success).toBe(true);
      expect(result.data.sensitivity).toBe('medium');
    });

    it('should support high sensitivity', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        anomalySensitivity: 'high'
      });

      expect(result.success).toBe(true);
      expect(result.data.sensitivity).toBe('high');
    });

    it('should detect different anomaly types', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        detectSpikes: true,
        detectDisappearances: true
      });

      expect(result.success).toBe(true);
      expect(result.data.anomalies).toBeDefined();
    });

    it('should include anomaly severity levels', async () => {
      const result = await executeAnomalyDetection(samplePatterns);

      expect(result.success).toBe(true);
      result.data.anomalies.forEach(anomaly => {
        expect(anomaly.severity).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      });
    });

    it('should provide anomaly explanations', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        includeExplanations: true
      });

      expect(result.success).toBe(true);
      result.data.anomalies.forEach(anomaly => {
        expect(anomaly.explanation).toBeDefined();
      });
    });

    it('should generate different output formats', async () => {
      const formats = ['json', 'markdown', 'dashboard'] as const;

      for (const format of formats) {
        const result = await executeAnomalyDetection(samplePatterns, {
          output: format
        });

        expect(result.success).toBe(true);
        expect(result.metadata.format).toBe(format);
      }
    });

    it('should include anomaly metadata', async () => {
      const result = await executeAnomalyDetection(samplePatterns, {
        anomalySensitivity: 'medium'
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.analysisType).toBe('anomaly');
      expect(result.metadata.timestamp).toBeDefined();
      expect(result.metadata.options).toBeDefined();
    });

    it('should handle patterns with no anomalies', async () => {
      // Create patterns with similar frequencies (no outliers)
      const normalPatterns: MergedPattern[] = [
        {
          pattern_text: 'Pattern 1',
          count: 10,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-03-15T11:00:00Z',
          content_types: ['code'],
          session_count: 3,
          total_frequency: 30,
          is_new: false,
          frequency_change: 0
        },
        {
          pattern_text: 'Pattern 2',
          count: 11,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-03-15T11:00:00Z',
          content_types: ['code'],
          session_count: 3,
          total_frequency: 33,
          is_new: false,
          frequency_change: 0
        },
        {
          pattern_text: 'Pattern 3',
          count: 10,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-03-15T11:00:00Z',
          content_types: ['code'],
          session_count: 3,
          total_frequency: 30,
          is_new: false,
          frequency_change: 0
        }
      ];

      const result = await executeAnomalyDetection(normalPatterns);

      expect(result.success).toBe(true);
      // Should handle gracefully (may have 0 anomalies)
      expect(result.data.anomalies).toBeDefined();
    });
  });

  describe('validateOptions', () => {
    it('should validate valid trend analysis options', () => {
      const options: TrendCLIOptions = {
        period: '30d',
        granularity: 'weekly',
        minPatterns: 2,
        output: 'json'
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate valid prediction options', () => {
      const options: PredictionCLIOptions = {
        predictionModel: 'linear',
        predictionHorizon: 30,
        output: 'json'
      };

      const result = validateOptions('prediction', options);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should validate valid anomaly detection options', () => {
      const options: AnomalyCLIOptions = {
        anomalySensitivity: 'medium',
        detectSpikes: true,
        output: 'json'
      };

      const result = validateOptions('anomaly', options);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject invalid period value', () => {
      const options: TrendCLIOptions = {
        period: 'invalid' as any
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid granularity value', () => {
      const options: TrendCLIOptions = {
        granularity: 'invalid' as any
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid prediction model', () => {
      const options: PredictionCLIOptions = {
        predictionModel: 'invalid' as any
      };

      const result = validateOptions('prediction', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid prediction horizon (negative)', () => {
      const options: PredictionCLIOptions = {
        predictionHorizon: -10
      };

      const result = validateOptions('prediction', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid prediction horizon (too large)', () => {
      const options: PredictionCLIOptions = {
        predictionHorizon: 365 // Too large
      };

      const result = validateOptions('prediction', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid anomaly sensitivity', () => {
      const options: AnomalyCLIOptions = {
        anomalySensitivity: 'invalid' as any
      };

      const result = validateOptions('anomaly', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject invalid output format', () => {
      const options: TrendCLIOptions = {
        output: 'invalid' as any
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject negative minimum patterns', () => {
      const options: TrendCLIOptions = {
        minPatterns: -1
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide helpful error messages', () => {
      const options: TrendCLIOptions = {
        period: 'invalid' as any,
        granularity: 'invalid' as any
      };

      const result = validateOptions('trend', options);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      // Error messages should be descriptive
      result.errors.forEach(error => {
        expect(typeof error).toBe('string');
        expect(error.length).toBeGreaterThan(0);
      });
    });

    it('should handle unknown command type', () => {
      const result = validateOptions('unknown' as any, {});

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Workflow Integration', () => {
    it('should execute full workflow: analyze → predict → detect anomalies', async () => {
      // Step 1: Analyze trends
      const trendResult = await executeTrendAnalysis(samplePatterns, {
        period: '30d',
        granularity: 'weekly'
      });

      expect(trendResult.success).toBe(true);

      // Step 2: Predict patterns
      const predictionResult = await executePatternPrediction(samplePatterns, {
        predictionModel: 'linear',
        predictionHorizon: 30
      });

      expect(predictionResult.success).toBe(true);

      // Step 3: Detect anomalies
      const anomalyResult = await executeAnomalyDetection(samplePatterns, {
        anomalySensitivity: 'medium'
      });

      expect(anomalyResult.success).toBe(true);

      // All should complete successfully
      expect(trendResult.data.patterns.length).toBeGreaterThan(0);
      expect(predictionResult.data.patterns.length).toBeGreaterThan(0);
      expect(anomalyResult.data.totalPatterns).toBe(samplePatterns.length);
    });

    it('should maintain consistency across different output formats', async () => {
      const formats = ['json', 'markdown', 'dashboard'] as const;

      for (const format of formats) {
        const result = await executeTrendAnalysis(samplePatterns, {
          output: format
        });

        expect(result.success).toBe(true);
        expect(result.metadata.format).toBe(format);

        // Data should be consistent regardless of format
        expect(result.data.totalPatterns).toBe(samplePatterns.length);
      }
    });

    it('should handle batch analysis for multiple time periods', async () => {
      const periods = ['7d', '30d', '90d'] as const;

      const results = await Promise.all(
        periods.map(period =>
          executeTrendAnalysis(samplePatterns, { period })
        )
      );

      results.forEach(result => {
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing pattern data gracefully', async () => {
      const result = await executeTrendAnalysis([]);

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });

    it('should handle invalid data structures', async () => {
      const invalidPatterns = [null as any, undefined as any];

      const result = await executeTrendAnalysis(invalidPatterns as any);

      expect(result).toBeDefined();
      // Should handle error gracefully
    });

    it('should provide error details on failure', async () => {
      const result = await executeTrendAnalysis(samplePatterns, {
        period: 'invalid' as any
      });

      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should handle concurrent executions', async () => {
      const promises = [
        executeTrendAnalysis(samplePatterns),
        executePatternPrediction(samplePatterns),
        executeAnomalyDetection(samplePatterns)
      ];

      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.success).toBeDefined();
      });
    });
  });
});
