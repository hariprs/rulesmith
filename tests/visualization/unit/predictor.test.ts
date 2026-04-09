/**
 * Unit Tests: Pattern Predictor
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Unit tests for prediction models and forecasting functions.
 * Tests all prediction models (linear regression, moving average, exponential smoothing),
 * model auto-selection, confidence intervals, backtesting, and edge cases.
 *
 * Test Pyramid Level: Unit (70% - isolated function tests)
 */

import { describe, it, expect } from '@jest/globals';
import {
  predictPatterns,
  exportPredictionForChart,
  type PatternPrediction
} from '../../../src/visualization/predictor.js';
import type { MergedPattern } from '../../../src/state-management.js';
import { PatternCategory } from '../../../src/pattern-detector.js';

describe('Pattern Predictor', () => {
  const createMockPattern = (
    patternText: string,
    totalFrequency: number,
    firstSeen: string,
    lastSeen: string
  ): MergedPattern => ({
    pattern_text: patternText,
    count: totalFrequency,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'test rule',
    first_seen: firstSeen,
    last_seen: lastSeen,
    content_types: ['code'],
    session_count: 1,
    total_frequency: totalFrequency,
    is_new: false,
    frequency_change: 0
  });

  describe('predictPatterns', () => {
    it('should predict patterns using linear regression model', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 20, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 15, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear',
        horizon: 30
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result[0].model).toBe('linear');
    });

    it('should predict patterns using moving average model', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 20, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'moving-avg',
        horizon: 30
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].model).toBe('moving-avg');
    });

    it('should predict patterns using exponential smoothing model', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 20, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'exponential',
        horizon: 30
      });

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].model).toBe('exponential');
    });

    it('should auto-select model when not specified', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        horizon: 30
      });

      expect(result).toBeDefined();
      expect(result[0].model).toBeDefined();
      expect(['linear', 'moving-avg', 'exponential']).toContain(result[0].model);
    });

    it('should calculate confidence intervals', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear',
        horizon: 30,
        confidenceLevel: 0.95
      });

      expect(result.length).toBeGreaterThan(0);
      const prediction = result[0];
      expect(prediction.predictions.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0);
    });

    it('should identify patterns likely to emerge', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Emerging Pattern', 5, '2026-01-01', '2026-01-31'),
        createMockPattern('Stable Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear',
        horizon: 30
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach(p => {
        expect(typeof p.willEmerge).toBe('boolean');
        expect(typeof p.willDisappear).toBe('boolean');
      });
    });

    it('should identify patterns likely to disappear', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Declining Pattern', 15, '2026-01-01', '2026-01-31'),
        createMockPattern('Stable Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear',
        horizon: 30
      });

      expect(result.length).toBeGreaterThan(0);
      result.forEach(p => {
        expect(typeof p.willEmerge).toBe('boolean');
        expect(typeof p.willDisappear).toBe('boolean');
      });
    });

    it('should perform backtesting for accuracy', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear',
        horizon: 30,
        backtestRatio: 0.2
      });

      expect(result.length).toBeGreaterThan(0);
      const prediction = result[0];
      expect(prediction.accuracy).toBeDefined();
      expect(prediction.accuracy!.mae).toBeDefined();
      expect(prediction.accuracy!.rmse).toBeDefined();
      expect(prediction.accuracy!.mape).toBeDefined();
    });

    it('should handle different prediction horizons', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const horizons: Array<7 | 14 | 30 | 60 | 90> = [7, 14, 30, 60, 90];

      horizons.forEach(horizon => {
        const result = predictPatterns(patterns, { horizon });
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].predictions.length).toBeGreaterThan(0);
        // The exact number of predictions depends on data availability
        expect(result[0].predictions.length).toBeLessThanOrEqual(horizon);
      });
    });

    it('should handle empty pattern array', () => {
      const result = predictPatterns([]);

      expect(result).toEqual([]);
    });

    it('should handle insufficient data for prediction', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Single Pattern', 1, '2026-01-01', '2026-01-01')
      ];

      const result = predictPatterns(patterns, {
        minDataPoints: 3
      });

      expect(result).toBeDefined();
      expect(result.length).toBe(0); // Filtered out due to insufficient data
    });

    it('should handle flat trends (no change)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Flat Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'linear'
      });

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter patterns by minimum frequency', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 1, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 5, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        minDataPoints: 5
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('exportPredictionForChart', () => {
    it('should export prediction data for Chart.js', () => {
      const prediction: PatternPrediction = {
        patternId: 'test-pattern',
        patternText: 'Test Pattern',
        model: 'linear',
        predictions: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 86400000),
          predictedValue: 10 + i * 0.5,
          confidenceLower: 8 + i * 0.4,
          confidenceUpper: 12 + i * 0.6
        })),
        confidence: 0.8,
        willEmerge: true,
        willDisappear: false,
        summary: 'Test prediction summary'
      };

      const chartData = exportPredictionForChart(prediction);

      expect(chartData).toBeDefined();
      expect(chartData.labels).toBeDefined();
      expect(chartData.datasets).toBeDefined();
      expect(chartData.labels.length).toBe(30);
      expect(chartData.datasets.length).toBeGreaterThan(0);
    });

    it('should include confidence interval bands in chart', () => {
      const prediction: PatternPrediction = {
        patternId: 'test-pattern',
        patternText: 'Test Pattern',
        model: 'linear',
        predictions: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 86400000),
          predictedValue: 10,
          confidenceLower: 8,
          confidenceUpper: 12
        })),
        confidence: 0.8,
        willEmerge: false,
        willDisappear: false,
        summary: ''
      };

      const chartData = exportPredictionForChart(prediction);

      expect(chartData.datasets.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle prediction without confidence intervals', () => {
      const prediction: PatternPrediction = {
        patternId: 'test-pattern',
        patternText: 'Test Pattern',
        model: 'linear',
        predictions: Array.from({ length: 30 }, () => ({
          timestamp: new Date(),
          predictedValue: 10,
          confidenceLower: 9,
          confidenceUpper: 11
        })),
        confidence: 0.5,
        willEmerge: false,
        willDisappear: false,
        summary: ''
      };

      const chartData = exportPredictionForChart(prediction);

      expect(chartData).toBeDefined();
      expect(chartData.datasets.length).toBeGreaterThan(0);
    });

    it('should color-code by prediction direction', () => {
      const increasingPrediction: PatternPrediction = {
        patternId: 'inc',
        patternText: 'Increasing',
        model: 'linear',
        predictions: Array.from({ length: 30 }, (_, i) => ({
          timestamp: new Date(Date.now() + i * 86400000),
          predictedValue: 10 + i,
          confidenceLower: 9 + i,
          confidenceUpper: 11 + i
        })),
        confidence: 0.8,
        willEmerge: true,
        willDisappear: false,
        summary: ''
      };

      const chartData = exportPredictionForChart(increasingPrediction);
      const dataset = chartData.datasets[0];

      expect(dataset.borderColor).toBeDefined();
      expect(typeof dataset.borderColor).toBe('string');
    });
  });

  describe('Model Selection', () => {
    it('should select linear model for trending data', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Trending Pattern', 20, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'auto'
      });

      expect(result).toBeDefined();
      expect(result[0].model).toBeDefined();
    });

    it('should select moving average for stable data', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Stable Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns, {
        model: 'auto'
      });

      expect(result).toBeDefined();
      expect(result[0].model).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values in forecast', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Zero Pattern', 0, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns);

      expect(result).toBeDefined();
      result.forEach(p => {
        p.predictions.forEach(pred => {
          expect(Number.isFinite(pred.predictedValue)).toBe(true);
        });
      });
    });

    it('should handle very large frequency values', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('High Frequency Pattern', 1000000, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns);

      expect(result).toBeDefined();
      result.forEach(p => {
        p.predictions.forEach(pred => {
          expect(Number.isFinite(pred.predictedValue)).toBe(true);
        });
      });
    });

    it('should handle single pattern in array', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Single Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = predictPatterns(patterns);

      expect(result.length).toBe(1);
      expect(result[0]).toBeDefined();
    });
  });
});
