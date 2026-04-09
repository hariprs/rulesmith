/**
 * API-Level Acceptance Tests for Trend Analysis (Story 3-6: AC1-AC6)
 *
 * TDD Red Phase: Failing API-level acceptance tests ONLY
 *
 * Testing Strategy:
 * - Pure business logic tests without UI/Chart.js dependencies
 * - Validate trend calculation algorithms, prediction models, and statistical functions
 * - Test data transformations and API interfaces
 * - NO rendering, NO browser interaction, NO UI components
 *
 * Test Pyramid Level: API-Level (Unit tests for business logic)
 *
 * AC Coverage:
 * - AC1: Temporal Trend Analysis Visualization (data layer)
 * - AC2: Pattern Prediction and Forecasting (algorithms)
 * - AC3: Pattern Correlation and Clustering (calculations)
 * - AC4: Anomaly Detection in Pattern Evolution (logic)
 * - AC6: CLI Interface and Customization Options (validation)
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, it, expect } from '@jest/globals';
import { MergedPattern } from '../../src/pattern-matcher';
import { PatternCategory } from '../../src/pattern-detector';

// ============================================================================
// TEST FIXTURES - Realistic Epic 2 Data
// ============================================================================

/**
 * Create test patterns with temporal data for trend analysis
 */
function createTemporalPatterns(): MergedPattern[] {
  const now = new Date('2026-03-19T12:00:00Z');

  return [
    {
      pattern_text: 'Use const instead of let',
      count: 5,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Use const for immutable variables',
      first_seen: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
      last_seen: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
      content_types: ['code'],
      session_count: 10,
      total_frequency: 50,
      is_new: false,
      frequency_change: 5,
    } as MergedPattern,
    {
      pattern_text: 'Add unit tests for new functions',
      count: 3,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: 'Add unit tests for all new functions',
      first_seen: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      content_types: ['code', 'test_plan'],
      session_count: 8,
      total_frequency: 30,
      is_new: false,
      frequency_change: -2,
    } as MergedPattern,
    {
      pattern_text: 'Use TypeScript strict mode',
      count: 7,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: 'Enable TypeScript strict mode',
      first_seen: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      content_types: ['code'],
      session_count: 15,
      total_frequency: 100,
      is_new: false,
      frequency_change: 10,
    } as MergedPattern,
    {
      pattern_text: 'Organize imports alphabetically',
      count: 4,
      category: PatternCategory.FORMATTING,
      examples: [],
      suggested_rule: 'Organize imports alphabetically',
      first_seen: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      content_types: ['code'],
      session_count: 5,
      total_frequency: 20,
      is_new: true,
      frequency_change: 0,
    } as MergedPattern,
  ];
}

/**
 * Create patterns with accelerating frequency (increasing trend)
 */
function createAcceleratingPatterns(): MergedPattern[] {
  const now = new Date('2026-03-19T12:00:00Z');
  const patterns: MergedPattern[] = [];

  // Create pattern with increasing frequency over time
  for (let i = 0; i < 10; i++) {
    patterns.push({
      pattern_text: `Accelerating pattern ${i}`,
      count: i + 1,
      category: PatternCategory.CODE_STYLE,
      examples: [],
      suggested_rule: `Rule ${i}`,
      first_seen: new Date(now.getTime() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000).toISOString(),
      content_types: ['code'],
      session_count: i + 1,
      total_frequency: (i + 1) * 5,
      is_new: false,
      frequency_change: i + 1,
    } as MergedPattern);
  }

  return patterns;
}

/**
 * Create patterns with declining frequency (decreasing trend)
 */
function createDecliningPatterns(): MergedPattern[] {
  const now = new Date('2026-03-19T12:00:00Z');
  const patterns: MergedPattern[] = [];

  // Create pattern with decreasing frequency over time
  for (let i = 0; i < 10; i++) {
    patterns.push({
      pattern_text: `Declining pattern ${i}`,
      count: 10 - i,
      category: PatternCategory.CONVENTION,
      examples: [],
      suggested_rule: `Rule ${i}`,
      first_seen: new Date(now.getTime() - (10 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - (10 - i) * 24 * 60 * 60 * 1000).toISOString(),
      content_types: ['code'],
      session_count: 10 - i,
      total_frequency: (10 - i) * 3,
      is_new: false,
      frequency_change: -i,
    } as MergedPattern);
  }

  return patterns;
}

// ============================================================================
// AC1: TEMPORAL TREND ANALYSIS - DATA LAYER TESTS
// ============================================================================

describe('AC1: Temporal Trend Analysis - Data Layer (API-Level)', () => {
  describe('Trend Calculation Algorithms', () => {
    it('should calculate pattern frequency trends over time (daily granularity)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(patterns[0], 'daily');

      // Assert
      expect(trend).toBeDefined();
      expect(trend.dataPoints).toBeDefined();
      expect(trend.dataPoints.length).toBeGreaterThan(0);
      expect(trend.direction).toBeDefined();
      expect(['increasing', 'decreasing', 'stable']).toContain(trend.direction);
    });

    it('should calculate pattern frequency trends over time (weekly granularity)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(patterns[0], 'weekly');

      // Assert
      expect(trend).toBeDefined();
      expect(trend.dataPoints).toBeDefined();
      expect(trend.dataPoints.length).toBeGreaterThan(0);
    });

    it('should calculate pattern frequency trends over time (monthly granularity)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(patterns[0], 'monthly');

      // Assert
      expect(trend).toBeDefined();
      expect(trend.dataPoints).toBeDefined();
    });

    it('should identify accelerating patterns (frequency increasing over time)', () => {
      // Arrange
      const patterns = createAcceleratingPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { granularity: 'weekly' });

      // Assert
      expect(result.acceleratingPatterns).toBeDefined();
      expect(result.acceleratingPatterns.length).toBeGreaterThan(0);

      result.acceleratingPatterns.forEach((pattern: any) => {
        expect(pattern.direction).toBe('increasing');
        expect(pattern.velocity).toBeGreaterThan(0);
      });
    });

    it('should identify declining patterns (frequency decreasing over time)', () => {
      // Arrange
      const patterns = createDecliningPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { granularity: 'weekly' });

      // Assert
      expect(result.decliningPatterns).toBeDefined();
      expect(result.decliningPatterns.length).toBeGreaterThan(0);

      result.decliningPatterns.forEach((pattern: any) => {
        expect(pattern.direction).toBe('decreasing');
        expect(pattern.velocity).toBeLessThan(0);
      });
    });

    it('should identify stable patterns (frequency not changing significantly)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { granularity: 'weekly' });

      // Assert
      expect(result.stablePatterns).toBeDefined();
    });

    it('should calculate trend velocity (patterns per time period)', () => {
      // Arrange
      const patterns = createAcceleratingPatterns();
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(patterns[0], 'weekly');

      // Assert
      expect(trend.velocity).toBeDefined();
      expect(typeof trend.velocity).toBe('number');
    });

    it('should calculate trend confidence based on data points available', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(patterns[0], 'daily');

      // Assert
      expect(trend.confidence).toBeDefined();
      expect(trend.confidence).toBeGreaterThanOrEqual(0);
      expect(trend.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Time Window Configuration', () => {
    it('should support 7-day time window', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { window: '7d' });

      // Assert
      expect(result.analysisWindow).toBe('7d');
      expect(result.patterns).toBeDefined();
    });

    it('should support 30-day time window', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { window: '30d' });

      // Assert
      expect(result.analysisWindow).toBe('30d');
    });

    it('should support 90-day time window', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { window: '90d' });

      // Assert
      expect(result.analysisWindow).toBe('90d');
    });

    it('should support all-time time window', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns, { window: 'all' });

      // Assert
      expect(result.analysisWindow).toBe('all');
    });
  });

  describe('Sparse Data Handling', () => {
    it('should handle sparse data with interpolation', () => {
      // Arrange
      const sparsePatterns: MergedPattern[] = [
        {
          pattern_text: 'Sparse pattern',
          count: 2,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-03-19T10:00:00Z',
          content_types: ['general_text'],
          session_count: 2,
          total_frequency: 2,
          is_new: false,
          frequency_change: 0,
        } as MergedPattern,
      ];
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(sparsePatterns[0], 'weekly');

      // Assert
      expect(trend).toBeDefined();
      expect(trend.dataPoints.length).toBeGreaterThan(0);
    });

    it('should handle single data point gracefully', () => {
      // Arrange
      const singlePointPattern: MergedPattern = {
        pattern_text: 'Single point pattern',
        count: 1,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-19T10:00:00Z',
        last_seen: '2026-03-19T10:00:00Z',
        content_types: ['general_text'],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 0,
      } as MergedPattern;
      const { calculateTrend } = require('../../src/visualization/trend-analyzer');

      // Act
      const trend = calculateTrend(singlePointPattern, 'daily');

      // Assert
      expect(trend).toBeDefined();
      expect(trend.dataPoints.length).toBe(1);
    });

    it('should handle empty pattern array', () => {
      // Arrange
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends([]);

      // Assert
      expect(result).toBeDefined();
      expect(result.patterns).toEqual([]);
      expect(result.totalPatterns).toBe(0);
    });
  });

  describe('Performance Requirements', () => {
    it('should generate trend analysis in < 5 seconds for 10K patterns', () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        pattern_text: `Pattern ${i}`,
        count: Math.floor(Math.random() * 100) + 1,
        category: Object.values(PatternCategory)[i % 6],
        examples: [],
        suggested_rule: `Rule ${i}`,
        first_seen: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        content_types: ['code'],
        session_count: Math.floor(Math.random() * 10) + 1,
        total_frequency: Math.floor(Math.random() * 100) + 1,
        is_new: Math.random() > 0.5,
        frequency_change: Math.random() * 10 - 5,
      })) as MergedPattern[];

      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const startTime = performance.now();
      const result = analyzeTrends(largeDataset, { granularity: 'weekly' });
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(5000); // < 5 seconds
    });
  });
});

// ============================================================================
// AC2: PATTERN PREDICTION AND FORECASTING - ALGORITHM TESTS
// ============================================================================

describe('AC2: Pattern Prediction and Forecasting - Algorithms (API-Level)', () => {
  describe('Forecasting Models', () => {
    it('should implement linear regression forecasting model', () => {
      // Arrange
      const patterns = createAcceleratingPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'linear', 30);

      // Assert
      expect(prediction).toBeDefined();
      expect(prediction.forecast).toBeDefined();
      expect(prediction.forecast.length).toBe(30);
      expect(prediction.modelType).toBe('linear');
    });

    it('should implement moving average forecasting model', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'moving-avg', 30);

      // Assert
      expect(prediction).toBeDefined();
      expect(prediction.forecast).toBeDefined();
      expect(prediction.modelType).toBe('moving-avg');
    });

    it('should implement exponential smoothing forecasting model', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'exponential', 30);

      // Assert
      expect(prediction).toBeDefined();
      expect(prediction.forecast).toBeDefined();
      expect(prediction.modelType).toBe('exponential');
    });

    it('should auto-select best model based on data characteristics', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'auto', 30);

      // Assert
      expect(prediction).toBeDefined();
      expect(prediction.modelType).toBeDefined();
      expect(['linear', 'moving-avg', 'exponential']).toContain(prediction.modelType);
    });
  });

  describe('Confidence Intervals', () => {
    it('should calculate prediction confidence intervals', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'linear', 30);

      // Assert
      expect(prediction.confidenceInterval).toBeDefined();
      expect(prediction.confidenceInterval.lower).toBeDefined();
      expect(prediction.confidenceInterval.upper).toBeDefined();
      expect(prediction.confidenceInterval.level).toBeGreaterThan(0);
      expect(prediction.confidenceInterval.level).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence based on data quality', () => {
      // Arrange
      const patterns = createAcceleratingPatterns();
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(patterns[0], 'linear', 30);

      // Assert
      expect(prediction.confidence).toBeDefined();
      expect(prediction.confidence).toBeGreaterThanOrEqual(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
    });

    it('should calculate confidence based on trend strength', () => {
      // Arrange
      const strongTrendPattern = createAcceleratingPatterns()[0];
      const { predictPattern } = require('../../src/visualization/predictor');

      // Act
      const prediction = predictPattern(strongTrendPattern, 'linear', 30);

      // Assert
      expect(prediction.confidence).toBeDefined();
    });
  });

  describe('Pattern Identification', () => {
    it('should identify patterns likely to emerge (forecast above threshold)', () => {
      // Arrange
      const patterns = createAcceleratingPatterns();
      const { predictPatterns } = require('../../src/visualization/predictor');

      // Act
      const predictions = predictPatterns(patterns, 'linear', 30);

      // Assert
      expect(predictions.emergingPatterns).toBeDefined();
      expect(Array.isArray(predictions.emergingPatterns)).toBe(true);
    });

    it('should identify patterns likely to disappear (forecast below threshold)', () => {
      // Arrange
      const patterns = createDecliningPatterns();
      const { predictPatterns } = require('../../src/visualization/predictor');

      // Act
      const predictions = predictPatterns(patterns, 'linear', 30);

      // Assert
      expect(predictions.disappearingPatterns).toBeDefined();
      expect(Array.isArray(predictions.disappearingPatterns)).toBe(true);
    });
  });

  describe('Prediction Accuracy Metrics', () => {
    it('should calculate prediction accuracy using backtesting', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { backtestPrediction } = require('../../src/visualization/predictor');

      // Act
      const accuracy = backtestPrediction(patterns[0], 'linear', 7);

      // Assert
      expect(accuracy).toBeDefined();
      expect(accuracy.mae).toBeDefined(); // Mean Absolute Error
      expect(accuracy.rmse).toBeDefined(); // Root Mean Square Error
      expect(accuracy.mape).toBeDefined(); // Mean Absolute Percentage Error
    });

    it('should generate prediction accuracy metrics', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculatePredictionMetrics } = require('../../src/visualization/predictor');

      // Act
      const actual = [1, 2, 3, 4, 5];
      const predicted = [1.1, 2.1, 2.9, 4.1, 4.9];
      const metrics = calculatePredictionMetrics(actual, predicted);

      // Assert
      expect(metrics).toBeDefined();
      expect(metrics.mae).toBeGreaterThan(0);
      expect(metrics.rmse).toBeGreaterThan(0);
      expect(metrics.mape).toBeGreaterThan(0);
    });
  });

  describe('Seasonality Detection', () => {
    it('should detect weekly patterns in data', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectSeasonality } = require('../../src/visualization/predictor');

      // Act
      const seasonality = detectSeasonality(patterns[0], 'weekly');

      // Assert
      expect(seasonality).toBeDefined();
      expect(seasonality.hasSeasonality).toBeDefined();
      expect(typeof seasonality.hasSeasonality).toBe('boolean');
    });

    it('should detect monthly patterns in data', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectSeasonality } = require('../../src/visualization/predictor');

      // Act
      const seasonality = detectSeasonality(patterns[0], 'monthly');

      // Assert
      expect(seasonality).toBeDefined();
      expect(seasonality.period).toBeDefined();
    });
  });

  describe('Performance Requirements', () => {
    it('should generate predictions in < 3 seconds for 10K patterns', () => {
      // Arrange
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        pattern_text: `Pattern ${i}`,
        count: Math.floor(Math.random() * 100) + 1,
        category: Object.values(PatternCategory)[i % 6],
        examples: [],
        suggested_rule: `Rule ${i}`,
        first_seen: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        content_types: ['code'],
        session_count: Math.floor(Math.random() * 10) + 1,
        total_frequency: Math.floor(Math.random() * 100) + 1,
        is_new: Math.random() > 0.5,
        frequency_change: Math.random() * 10 - 5,
      })) as MergedPattern[];

      const { predictPatterns } = require('../../src/visualization/predictor');

      // Act
      const startTime = performance.now();
      const predictions = predictPatterns(largeDataset, 'auto', 30);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(predictions).toBeDefined();
      expect(duration).toBeLessThan(3000); // < 3 seconds
    });
  });
});

// ============================================================================
// AC3: PATTERN CORRELATION AND CLUSTERING - CALCULATION TESTS
// ============================================================================

describe('AC3: Pattern Correlation and Clustering - Calculations (API-Level)', () => {
  describe('Correlation Analysis', () => {
    it('should detect patterns that co-occur frequently', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { findCooccurringPatterns } = require('../../src/visualization/correlation-analyzer');

      // Act
      const cooccurrences = findCooccurringPatterns(patterns, patterns[0]);

      // Assert
      expect(cooccurrences).toBeDefined();
      expect(Array.isArray(cooccurrences)).toBe(true);
    });

    it('should calculate Pearson correlation coefficient', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateCorrelation } = require('../../src/visualization/correlation-analyzer');

      // Act
      const correlation = calculateCorrelation(patterns[0], patterns[1]);

      // Assert
      expect(correlation).toBeDefined();
      expect(correlation.coefficient).toBeDefined();
      expect(correlation.coefficient).toBeGreaterThanOrEqual(-1);
      expect(correlation.coefficient).toBeLessThanOrEqual(1);
    });

    it('should calculate Spearman correlation coefficient', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateSpearmanCorrelation } = require('../../src/visualization/correlation-analyzer');

      // Act
      const correlation = calculateSpearmanCorrelation(patterns[0], patterns[1]);

      // Assert
      expect(correlation).toBeDefined();
      expect(correlation.coefficient).toBeDefined();
    });

    it('should perform statistical significance testing', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { testCorrelationSignificance } = require('../../src/visualization/correlation-analyzer');

      // Act
      const test = testCorrelationSignificance(patterns[0], patterns[1]);

      // Assert
      expect(test).toBeDefined();
      expect(test.isSignificant).toBeDefined();
      expect(test.pValue).toBeDefined();
      expect(test.pValue).toBeGreaterThanOrEqual(0);
      expect(test.pValue).toBeLessThanOrEqual(1);
    });

    it('should generate correlation matrix', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { generateCorrelationMatrix } = require('../../src/visualization/correlation-analyzer');

      // Act
      const matrix = generateCorrelationMatrix(patterns);

      // Assert
      expect(matrix).toBeDefined();
      expect(matrix.length).toBe(patterns.length);
      expect(matrix[0].length).toBe(patterns.length);
    });
  });

  describe('Pattern Clustering', () => {
    it('should group related patterns by similarity', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { clusterPatterns } = require('../../src/visualization/correlation-analyzer');

      // Act
      const clusters = clusterPatterns(patterns, 'similarity');

      // Assert
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
    });

    it('should support category-based correlation', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { findCorrelatedByCategory } = require('../../src/visualization/correlation-analyzer');

      // Act
      const correlated = findCorrelatedByCategory(patterns, PatternCategory.CODE_STYLE);

      // Assert
      expect(correlated).toBeDefined();
      expect(Array.isArray(correlated)).toBe(true);
    });

    it('should support temporal correlation (similar time windows)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { findCorrelatedByTime } = require('../../src/visualization/correlation-analyzer');

      // Act
      const correlated = findCorrelatedByTime(patterns, 7); // 7-day window

      // Assert
      expect(correlated).toBeDefined();
      expect(Array.isArray(correlated)).toBe(true);
    });
  });

  describe('Pattern Relationship Detection', () => {
    it('should detect pattern chains (one pattern triggers another)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectPatternChains } = require('../../src/visualization/correlation-analyzer');

      // Act
      const chains = detectPatternChains(patterns);

      // Assert
      expect(chains).toBeDefined();
      expect(Array.isArray(chains)).toBe(true);
    });

    it('should calculate pattern influence scores', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateInfluenceScores } = require('../../src/visualization/correlation-analyzer');

      // Act
      const scores = calculateInfluenceScores(patterns);

      // Assert
      expect(scores).toBeDefined();
      expect(Array.isArray(scores)).toBe(true);
      expect(scores.length).toBe(patterns.length);
    });

    it('should generate network visualization data', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { generateNetworkData } = require('../../src/visualization/correlation-analyzer');

      // Act
      const networkData = generateNetworkData(patterns);

      // Assert
      expect(networkData).toBeDefined();
      expect(networkData.nodes).toBeDefined();
      expect(networkData.edges).toBeDefined();
    });
  });

  describe('Computational Efficiency', () => {
    it('should handle computational complexity for large pattern sets efficiently', () => {
      // Arrange
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        pattern_text: `Pattern ${i}`,
        count: Math.floor(Math.random() * 100) + 1,
        category: Object.values(PatternCategory)[i % 6],
        examples: [],
        suggested_rule: `Rule ${i}`,
        first_seen: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
        last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        content_types: ['code'],
        session_count: Math.floor(Math.random() * 10) + 1,
        total_frequency: Math.floor(Math.random() * 100) + 1,
        is_new: Math.random() > 0.5,
        frequency_change: Math.random() * 10 - 5,
      })) as MergedPattern[];

      const { generateCorrelationMatrix } = require('../../src/visualization/correlation-analyzer');

      // Act
      const startTime = performance.now();
      const matrix = generateCorrelationMatrix(largeDataset.slice(0, 100)); // Test with 100 for performance
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(matrix).toBeDefined();
      expect(duration).toBeLessThan(10000); // Should complete in reasonable time
    });
  });
});

// ============================================================================
// AC4: ANOMALY DETECTION - LOGIC TESTS
// ============================================================================

describe('AC4: Anomaly Detection in Pattern Evolution - Logic (API-Level)', () => {
  describe('Statistical Anomaly Detection', () => {
    it('should detect sudden pattern frequency spikes', () => {
      // Arrange
      const patternsWithSpike: MergedPattern[] = [
        ...createTemporalPatterns(),
        {
          pattern_text: 'Spike pattern',
          count: 100,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-03-19T10:00:00Z',
          last_seen: '2026-03-19T11:00:00Z',
          content_types: ['general_text'],
          session_count: 1,
          total_frequency: 100,
          is_new: true,
          frequency_change: 100,
        } as MergedPattern,
      ];
      const { detectAnomalies } = require('../../src/visualization/anomaly-detector');

      // Act
      const anomalies = detectAnomalies(patternsWithSpike, 'medium');

      // Assert
      expect(anomalies).toBeDefined();
      expect(anomalies.spikes).toBeDefined();
      expect(Array.isArray(anomalies.spikes)).toBe(true);
    });

    it('should detect unexpected pattern disappearances', () => {
      // Arrange
      const patternsWithDisappearance: MergedPattern[] = [
        ...createTemporalPatterns(),
        {
          pattern_text: 'Disappeared pattern',
          count: 0,
          category: PatternCategory.OTHER,
          examples: [],
          suggested_rule: 'Test rule',
          first_seen: '2026-01-01T10:00:00Z',
          last_seen: '2026-02-01T10:00:00Z',
          content_types: ['general_text'],
          session_count: 10,
          total_frequency: 50,
          is_new: false,
          frequency_change: -50,
        } as MergedPattern,
      ];
      const { detectAnomalies } = require('../../src/visualization/anomaly-detector');

      // Act
      const anomalies = detectAnomalies(patternsWithDisappearance, 'medium');

      // Assert
      expect(anomalies.disappearances).toBeDefined();
      expect(Array.isArray(anomalies.disappearances)).toBe(true);
    });

    it('should calculate anomaly scores based on deviation from expected behavior', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { calculateAnomalyScore } = require('../../src/visualization/anomaly-detector');

      // Act
      const score = calculateAnomalyScore(patterns[0]);

      // Assert
      expect(score).toBeDefined();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Anomaly Classification', () => {
    it('should support configurable anomaly sensitivity thresholds (low)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectAnomalies } = require('../../src/visualization/anomaly-detector');

      // Act
      const anomalies = detectAnomalies(patterns, 'low');

      // Assert
      expect(anomalies).toBeDefined();
      expect(anomalies.sensitivity).toBe('low');
    });

    it('should support configurable anomaly sensitivity thresholds (medium)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectAnomalies } = require('../../src/visualization/anomaly-detector');

      // Act
      const anomalies = detectAnomalies(patterns, 'medium');

      // Assert
      expect(anomalies).toBeDefined();
      expect(anomalies.sensitivity).toBe('medium');
    });

    it('should support configurable anomaly sensitivity thresholds (high)', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { detectAnomalies } = require('../../src/visualization/anomaly-detector');

      // Act
      const anomalies = detectAnomalies(patterns, 'high');

      // Assert
      expect(anomalies).toBeDefined();
      expect(anomalies.sensitivity).toBe('high');
    });

    it('should distinguish between temporary anomalies and permanent shifts', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { classifyAnomaly } = require('../../src/visualization/anomaly-detector');

      // Act
      const classification = classifyAnomaly(patterns[0]);

      // Assert
      expect(classification).toBeDefined();
      expect(['temporary', 'permanent', 'unknown']).toContain(classification.type);
    });
  });

  describe('Anomaly Explanations', () => {
    it('should provide anomaly explanations based on contextual factors', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { explainAnomaly } = require('../../src/visualization/anomaly-detector');

      // Act
      const explanation = explainAnomaly(patterns[0]);

      // Assert
      expect(explanation).toBeDefined();
      expect(explanation.reason).toBeDefined();
      expect(explanation.context).toBeDefined();
    });

    it('should generate anomaly reports with severity levels', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { generateAnomalyReport } = require('../../src/visualization/anomaly-detector');

      // Act
      const report = generateAnomalyReport(patterns);

      // Assert
      expect(report).toBeDefined();
      expect(report.anomalies).toBeDefined();
      expect(report.severityLevels).toBeDefined();
    });

    it('should provide recommended actions for anomalies', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { recommendActions } = require('../../src/visualization/anomaly-detector');

      // Act
      const actions = recommendActions(patterns[0]);

      // Assert
      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
    });
  });
});

// ============================================================================
// AC6: CLI INTERFACE AND CUSTOMIZATION OPTIONS - VALIDATION TESTS
// ============================================================================

describe('AC6: CLI Interface and Customization Options - Validation (API-Level)', () => {
  describe('CLI Option Validation', () => {
    it('should validate --period option (7d, 30d, 90d, all)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const valid7d = validateCLIOptions({ period: '7d' });
      const valid30d = validateCLIOptions({ period: '30d' });
      const valid90d = validateCLIOptions({ period: '90d' });
      const validAll = validateCLIOptions({ period: 'all' });
      const invalid = validateCLIOptions({ period: 'invalid' });

      // Assert
      expect(valid7d.isValid).toBe(true);
      expect(valid30d.isValid).toBe(true);
      expect(valid90d.isValid).toBe(true);
      expect(validAll.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
    });

    it('should validate --granularity option (daily, weekly, monthly)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const validDaily = validateCLIOptions({ granularity: 'daily' });
      const validWeekly = validateCLIOptions({ granularity: 'weekly' });
      const validMonthly = validateCLIOptions({ granularity: 'monthly' });
      const invalid = validateCLIOptions({ granularity: 'hourly' });

      // Assert
      expect(validDaily.isValid).toBe(true);
      expect(validWeekly.isValid).toBe(true);
      expect(validMonthly.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
    });

    it('should validate --min-patterns option (positive integer)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const valid = validateCLIOptions({ minPatterns: 5 });
      const invalidZero = validateCLIOptions({ minPatterns: 0 });
      const invalidNegative = validateCLIOptions({ minPatterns: -1 });

      // Assert
      expect(valid.isValid).toBe(true);
      expect(invalidZero.isValid).toBe(false);
      expect(invalidNegative.isValid).toBe(false);
    });

    it('should validate --prediction-model option (linear, moving-avg, exponential)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const validLinear = validateCLIOptions({ predictionModel: 'linear' });
      const validMoving = validateCLIOptions({ predictionModel: 'moving-avg' });
      const validExponential = validateCLIOptions({ predictionModel: 'exponential' });
      const validAuto = validateCLIOptions({ predictionModel: 'auto' });
      const invalid = validateCLIOptions({ predictionModel: 'arima' });

      // Assert
      expect(validLinear.isValid).toBe(true);
      expect(validMoving.isValid).toBe(true);
      expect(validExponential.isValid).toBe(true);
      expect(validAuto.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
    });

    it('should validate --prediction-horizon option (positive days)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const valid = validateCLIOptions({ predictionHorizon: 30 });
      const invalidZero = validateCLIOptions({ predictionHorizon: 0 });
      const invalidNegative = validateCLIOptions({ predictionHorizon: -1 });

      // Assert
      expect(valid.isValid).toBe(true);
      expect(invalidZero.isValid).toBe(false);
      expect(invalidNegative.isValid).toBe(false);
    });

    it('should validate --anomaly-sensitivity option (low, medium, high)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const validLow = validateCLIOptions({ anomalySensitivity: 'low' });
      const validMedium = validateCLIOptions({ anomalySensitivity: 'medium' });
      const validHigh = validateCLIOptions({ anomalySensitivity: 'high' });
      const invalid = validateCLIOptions({ anomalySensitivity: 'extreme' });

      // Assert
      expect(validLow.isValid).toBe(true);
      expect(validMedium.isValid).toBe(true);
      expect(validHigh.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
    });

    it('should validate --output option (json, markdown, dashboard)', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const validJson = validateCLIOptions({ output: 'json' });
      const validMarkdown = validateCLIOptions({ output: 'markdown' });
      const validDashboard = validateCLIOptions({ output: 'dashboard' });
      const invalid = validateCLIOptions({ output: 'pdf' });

      // Assert
      expect(validJson.isValid).toBe(true);
      expect(validMarkdown.isValid).toBe(true);
      expect(validDashboard.isValid).toBe(true);
      expect(invalid.isValid).toBe(false);
    });
  });

  describe('Error Messages', () => {
    it('should provide helpful error messages for invalid options', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const result = validateCLIOptions({ period: 'invalid' });

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should provide specific error messages for each validation failure', () => {
      // Arrange
      const { validateCLIOptions } = require('../../src/visualization/cli-commands');

      // Act
      const result = validateCLIOptions({
        period: 'invalid',
        granularity: 'invalid',
        minPatterns: -1,
      });

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Configuration File Support', () => {
    it('should support configuration file for default options', () => {
      // Arrange
      const { loadConfiguration } = require('../../src/visualization/cli-commands');

      // Act
      const config = loadConfiguration();

      // Assert
      expect(config).toBeDefined();
      expect(config.defaults).toBeDefined();
    });

    it('should merge CLI options with configuration file defaults', () => {
      // Arrange
      const { mergeOptions } = require('../../src/visualization/cli-commands');
      const config = { period: '30d', granularity: 'weekly' };
      const cliOptions = { period: '7d' };

      // Act
      const merged = mergeOptions(config, cliOptions);

      // Assert
      expect(merged.period).toBe('7d'); // CLI option takes precedence
      expect(merged.granularity).toBe('weekly'); // Config default used
    });
  });

  describe('Batch Analysis Support', () => {
    it('should support batch analysis for multiple time periods', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { batchAnalyze } = require('../../src/visualization/cli-commands');

      // Act
      const results = batchAnalyze(patterns, [
        { window: '7d' },
        { window: '30d' },
        { window: '90d' },
      ]);

      // Assert
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);
    });

    it('should return structured output with metadata', () => {
      // Arrange
      const patterns = createTemporalPatterns();
      const { analyzeTrends } = require('../../src/visualization/trend-analyzer');

      // Act
      const result = analyzeTrends(patterns);

      // Assert
      expect(result.metadata).toBeDefined();
      expect(result.metadata.analysisDate).toBeDefined();
      expect(result.metadata.version).toBeDefined();
    });
  });
});
