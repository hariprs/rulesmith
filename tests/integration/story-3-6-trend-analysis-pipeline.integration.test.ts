/**
 * Integration-Level Acceptance Tests for Trend Analysis Pipeline (Story 3-6: AC1-AC5)
 *
 * TDD Red Phase: Failing integration-level acceptance tests ONLY
 *
 * These tests validate the end-to-end trend analysis pipeline from Epic 2's
 * MergedPattern data to trend insights, predictions, correlations, and anomaly detection.
 *
 * Testing Strategy:
 * - Test complete analysis pipelines with real data
 * - Validate data integrity across analysis steps
 * - Test performance with realistic datasets
 * - Verify Chart.js compatibility (without rendering)
 * - Test edge cases with production-like data
 *
 * Test Pyramid Level: Integration
 *
 * AC Coverage:
 * - AC1: Temporal Trend Analysis Visualization (end-to-end pipeline)
 * - AC2: Pattern Prediction and Forecasting (end-to-end pipeline)
 * - AC3: Pattern Correlation and Clustering (end-to-end pipeline)
 * - AC4: Anomaly Detection in Pattern Evolution (end-to-end pipeline)
 * - AC5: Interactive Trend Dashboard Integration (data export)
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, test, expect } from '@jest/globals';
import {
  analyzeTrends,
  exportTrendForChart,
  getTrendSummaryStatistics,
} from '../../src/visualization/trend-analyzer';
import {
  predictPattern,
  predictPatterns,
  backtestPrediction,
} from '../../src/visualization/predictor';
import {
  findCooccurringPatterns,
  generateCorrelationMatrix,
  clusterPatterns,
} from '../../src/visualization/correlation-analyzer';
import {
  detectAnomalies,
  generateAnomalyReport,
} from '../../src/visualization/anomaly-detector';
import { MergedPattern } from '../../src/pattern-matcher';
import { PatternCategory } from '../../src/pattern-detector';

// ============================================================================
// TEST FIXTURES - Realistic Epic 2 Data
// ============================================================================

/**
 * Realistic MergedPattern[] dataset from Epic 2's pattern detection pipeline
 * Mirrors production data structure with temporal characteristics
 */
const realisticMergedPatterns: MergedPattern[] = [
  {
    pattern_text: 'Use const instead of let',
    count: 5,
    category: PatternCategory.CODE_STYLE,
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
    category: PatternCategory.CONVENTION,
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
  {
    pattern_text: 'Use TypeScript strict mode',
    count: 7,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Enable TypeScript strict mode',
    first_seen: '2026-01-20T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: ['code'],
    session_count: 12,
    total_frequency: 95,
    is_new: false,
    frequency_change: 4.2,
  },
  {
    pattern_text: 'Organize imports alphabetically',
    count: 4,
    category: PatternCategory.FORMATTING,
    examples: [],
    suggested_rule: 'Organize imports alphabetically',
    first_seen: '2026-02-10T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: ['code'],
    session_count: 5,
    total_frequency: 20,
    is_new: true,
    frequency_change: 1.0,
  },
  {
    pattern_text: 'Use async/await instead of Promise.then()',
    count: 6,
    category: PatternCategory.TERMINOLOGY,
    examples: [],
    suggested_rule: 'Prefer async/await over Promise chains',
    first_seen: '2026-01-10T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: ['code'],
    session_count: 10,
    total_frequency: 65,
    is_new: false,
    frequency_change: 3.5,
  },
];

/**
 * Patterns with clear trend directions for testing
 */
const trendPatterns: MergedPattern[] = [
  {
    pattern_text: 'Accelerating pattern',
    count: 10,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Test rule',
    first_seen: '2026-01-01T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: ['code'],
    session_count: 15,
    total_frequency: 150,
    is_new: false,
    frequency_change: 10,
  },
  {
    pattern_text: 'Declining pattern',
    count: 2,
    category: PatternCategory.CONVENTION,
    examples: [],
    suggested_rule: 'Test rule',
    first_seen: '2026-01-01T10:00:00Z',
    last_seen: '2026-02-01T11:00:00Z',
    content_types: ['code'],
    session_count: 3,
    total_frequency: 8,
    is_new: false,
    frequency_change: -5,
  },
  {
    pattern_text: 'Stable pattern',
    count: 5,
    category: PatternCategory.FORMATTING,
    examples: [],
    suggested_rule: 'Test rule',
    first_seen: '2026-01-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: ['code'],
    session_count: 8,
    total_frequency: 40,
    is_new: false,
    frequency_change: 0.1,
  },
];

/**
 * Large dataset for performance testing
 */
const createLargeDataset = (size: number): MergedPattern[] => {
  return Array.from({ length: size }, (_, i) => ({
    pattern_text: `Pattern ${i}`,
    count: Math.floor(Math.random() * 100) + 1,
    category: Object.values(PatternCategory)[i % 6],
    examples: [],
    suggested_rule: `Suggested rule for pattern ${i}`,
    first_seen: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
    last_seen: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    content_types: ['code'],
    session_count: Math.floor(Math.random() * 10) + 1,
    total_frequency: Math.floor(Math.random() * 100) + 1,
    is_new: Math.random() > 0.5,
    frequency_change: Math.random() * 10 - 5,
  }));
};

// ============================================================================
// END-TO-END TREND ANALYSIS PIPELINE (AC1)
// ============================================================================

describe('Trend Analysis Pipeline - End-to-End (AC1)', () => {
  test('should analyze complete trend pipeline with realistic Epic 2 data', () => {
    // Act
    const result = analyzeTrends(realisticMergedPatterns, {
      window: '30d',
      granularity: 'weekly',
      minPatterns: 2,
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.patterns).toBeDefined();
    expect(result.patterns.length).toBeGreaterThan(0);
    expect(result.analysisWindow).toBe('30d');
    expect(result.granularity).toBe('weekly');
    expect(result.totalPatterns).toBe(realisticMergedPatterns.length);
  });

  test('should categorize patterns by trend direction correctly', () => {
    // Act
    const result = analyzeTrends(trendPatterns, {
      granularity: 'weekly',
    });

    // Assert
    expect(result.acceleratingPatterns).toBeDefined();
    expect(result.decliningPatterns).toBeDefined();
    expect(result.stablePatterns).toBeDefined();

    // Should have at least one accelerating pattern
    expect(result.acceleratingPatterns.length).toBeGreaterThan(0);
    expect(result.acceleratingPatterns[0].direction).toBe('increasing');
    expect(result.acceleratingPatterns[0].velocity).toBeGreaterThan(0);

    // Should have at least one declining pattern
    expect(result.decliningPatterns.length).toBeGreaterThan(0);
    expect(result.decliningPatterns[0].direction).toBe('decreasing');
    expect(result.decliningPatterns[0].velocity).toBeLessThan(0);
  });

  test('should calculate trend summary statistics', () => {
    // Arrange
    const result = analyzeTrends(realisticMergedPatterns);

    // Act
    const stats = getTrendSummaryStatistics(result);

    // Assert
    expect(stats).toBeDefined();
    expect(stats.totalPatterns).toBe(realisticMergedPatterns.length);
    expect(stats.acceleratingCount).toBeGreaterThanOrEqual(0);
    expect(stats.decliningCount).toBeGreaterThanOrEqual(0);
    expect(stats.stableCount).toBeGreaterThanOrEqual(0);
    expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
    expect(stats.averageConfidence).toBeLessThanOrEqual(1);
    expect(stats.highConfidenceCount).toBeGreaterThanOrEqual(0);
  });

  test('should export trend data for Chart.js visualization', () => {
    // Arrange
    const result = analyzeTrends(realisticMergedPatterns);
    const trend = result.patterns[0];

    // Act
    const chartData = exportTrendForChart(trend);

    // Assert
    expect(chartData).toBeDefined();
    expect(chartData.labels).toBeDefined();
    expect(chartData.datasets).toBeDefined();
    expect(chartData.datasets.length).toBeGreaterThan(0);

    // Validate Chart.js structure
    expect(chartData.datasets[0].label).toBeDefined();
    expect(chartData.datasets[0].data).toBeDefined();
    expect(chartData.datasets[0].borderColor).toBeDefined();
    expect(chartData.datasets[0].backgroundColor).toBeDefined();
  });

  test('should color-code trends by direction in Chart.js export', () => {
    // Arrange
    const result = analyzeTrends(trendPatterns);

    // Act
    const acceleratingChart = exportTrendForChart(result.acceleratingPatterns[0]);
    const decliningChart = exportTrendForChart(result.decliningPatterns[0]);
    const stableChart = exportTrendForChart(result.stablePatterns[0]);

    // Assert
    expect(acceleratingChart.datasets[0].borderColor).toBe('#10b981'); // green
    expect(decliningChart.datasets[0].borderColor).toBe('#ef4444'); // red
    expect(stableChart.datasets[0].borderColor).toBe('#808080'); // gray
  });

  test('should handle different time windows correctly', () => {
    // Act
    const result7d = analyzeTrends(realisticMergedPatterns, { window: '7d' });
    const result30d = analyzeTrends(realisticMergedPatterns, { window: '30d' });
    const result90d = analyzeTrends(realisticMergedPatterns, { window: '90d' });
    const resultAll = analyzeTrends(realisticMergedPatterns, { window: 'all' });

    // Assert
    expect(result7d.analysisWindow).toBe('7d');
    expect(result30d.analysisWindow).toBe('30d');
    expect(result90d.analysisWindow).toBe('90d');
    expect(resultAll.analysisWindow).toBe('all');
  });

  test('should handle different granularity levels correctly', () => {
    // Act
    const resultDaily = analyzeTrends(realisticMergedPatterns, { granularity: 'daily' });
    const resultWeekly = analyzeTrends(realisticMergedPatterns, { granularity: 'weekly' });
    const resultMonthly = analyzeTrends(realisticMergedPatterns, { granularity: 'monthly' });

    // Assert
    expect(resultDaily.granularity).toBe('daily');
    expect(resultWeekly.granularity).toBe('weekly');
    expect(resultMonthly.granularity).toBe('monthly');
  });
});

// ============================================================================
// END-TO-END PREDICTION PIPELINE (AC2)
// ============================================================================

describe('Prediction Pipeline - End-to-End (AC2)', () => {
  test('should generate 30-day forecast with confidence intervals', () => {
    // Arrange
    const pattern = realisticMergedPatterns[0];

    // Act
    const prediction = predictPattern(pattern, 'linear', 30);

    // Assert
    expect(prediction).toBeDefined();
    expect(prediction.forecast).toBeDefined();
    expect(prediction.forecast.length).toBe(30);
    expect(prediction.confidenceInterval).toBeDefined();
    expect(prediction.confidenceInterval.lower.length).toBe(30);
    expect(prediction.confidenceInterval.upper.length).toBe(30);
    expect(prediction.modelType).toBe('linear');
  });

  test('should compare multiple prediction models', () => {
    // Arrange
    const pattern = realisticMergedPatterns[0];

    // Act
    const linearPrediction = predictPattern(pattern, 'linear', 30);
    const movingAvgPrediction = predictPattern(pattern, 'moving-avg', 30);
    const exponentialPrediction = predictPattern(pattern, 'exponential', 30);

    // Assert
    expect(linearPrediction.modelType).toBe('linear');
    expect(movingAvgPrediction.modelType).toBe('moving-avg');
    expect(exponentialPrediction.modelType).toBe('exponential');

    // All should have 30-day forecasts
    expect(linearPrediction.forecast.length).toBe(30);
    expect(movingAvgPrediction.forecast.length).toBe(30);
    expect(exponentialPrediction.forecast.length).toBe(30);
  });

  test('should identify emerging and disappearing patterns', () => {
    // Act
    const predictions = predictPatterns(trendPatterns, 'linear', 30);

    // Assert
    expect(predictions).toBeDefined();
    expect(predictions.emergingPatterns).toBeDefined();
    expect(predictions.disappearingPatterns).toBeDefined();
    expect(predictions.predictions.length).toBe(trendPatterns.length);
  });

  test('should backtest predictions for accuracy', () => {
    // Arrange
    const pattern = realisticMergedPatterns[0];

    // Act
    const accuracy = backtestPrediction(pattern, 'linear', 7);

    // Assert
    expect(accuracy).toBeDefined();
    expect(accuracy.mae).toBeDefined();
    expect(accuracy.rmse).toBeDefined();
    expect(accuracy.mape).toBeDefined();
    expect(accuracy.mae).toBeGreaterThanOrEqual(0);
    expect(accuracy.rmse).toBeGreaterThanOrEqual(0);
    expect(accuracy.mape).toBeGreaterThanOrEqual(0);
  });

  test('should export prediction data for Chart.js visualization', () => {
    // Arrange
    const pattern = realisticMergedPatterns[0];
    const prediction = predictPattern(pattern, 'linear', 30);

    // Act
    const chartData = exportTrendForChart({
      patternId: 'prediction-test',
      patternText: pattern.pattern_text,
      direction: 'increasing',
      velocity: 1,
      confidence: prediction.confidence,
      dataPoints: [
        { timestamp: new Date(), value: pattern.total_frequency },
        ...prediction.forecast.map((value, i) => ({
          timestamp: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          value,
        })),
      ],
      startDate: new Date(pattern.first_seen),
      endDate: new Date(pattern.last_seen),
      summary: 'Prediction test',
    });

    // Assert
    expect(chartData).toBeDefined();
    expect(chartData.labels.length).toBe(31); // 1 historical + 30 predictions
    expect(chartData.datasets[0].data.length).toBe(31);
  });
});

// ============================================================================
// END-TO-END CORRELATION ANALYSIS PIPELINE (AC3)
// ============================================================================

describe('Correlation Analysis Pipeline - End-to-End (AC3)', () => {
  test('should detect co-occurring patterns', () => {
    // Arrange
    const targetPattern = realisticMergedPatterns[0];

    // Act
    const cooccurring = findCooccurringPatterns(realisticMergedPatterns, targetPattern);

    // Assert
    expect(cooccurring).toBeDefined();
    expect(Array.isArray(cooccurring)).toBe(true);
  });

  test('should generate correlation matrix for all patterns', () => {
    // Act
    const matrix = generateCorrelationMatrix(realisticMergedPatterns);

    // Assert
    expect(matrix).toBeDefined();
    expect(matrix.length).toBe(realisticMergedPatterns.length);
    expect(matrix[0].length).toBe(realisticMergedPatterns.length);

    // Matrix should be symmetric
    for (let i = 0; i < matrix.length; i++) {
      expect(matrix[i][i]).toBeCloseTo(1, 5); // Diagonal should be 1
    }
  });

  test('should cluster patterns by similarity', () => {
    // Act
    const clusters = clusterPatterns(realisticMergedPatterns, 'similarity');

    // Assert
    expect(clusters).toBeDefined();
    expect(Array.isArray(clusters)).toBe(true);
    expect(clusters.length).toBeGreaterThan(0);

    // Each cluster should have at least one pattern
    clusters.forEach(cluster => {
      expect(cluster.patterns).toBeDefined();
      expect(cluster.patterns.length).toBeGreaterThan(0);
    });
  });

  test('should export correlation network data for visualization', () => {
    // Arrange
    const { generateNetworkData } = require('../../src/visualization/correlation-analyzer');

    // Act
    const networkData = generateNetworkData(realisticMergedPatterns);

    // Assert
    expect(networkData).toBeDefined();
    expect(networkData.nodes).toBeDefined();
    expect(networkData.edges).toBeDefined();
    expect(networkData.nodes.length).toBe(realisticMergedPatterns.length);
  });
});

// ============================================================================
// END-TO-END ANOMALY DETECTION PIPELINE (AC4)
// ============================================================================

describe('Anomaly Detection Pipeline - End-to-End (AC4)', () => {
  test('should detect anomalies with medium sensitivity', () => {
    // Act
    const anomalies = detectAnomalies(realisticMergedPatterns, 'medium');

    // Assert
    expect(anomalies).toBeDefined();
    expect(anomalies.spikes).toBeDefined();
    expect(anomalies.disappearances).toBeDefined();
    expect(anomalies.sensitivity).toBe('medium');
  });

  test('should generate anomaly report with severity levels', () => {
    // Act
    const report = generateAnomalyReport(realisticMergedPatterns);

    // Assert
    expect(report).toBeDefined();
    expect(report.anomalies).toBeDefined();
    expect(report.severityLevels).toBeDefined();
    expect(report.summary).toBeDefined();
  });

  test('should provide different results for different sensitivity levels', () => {
    // Act
    const lowSensitivity = detectAnomalies(realisticMergedPatterns, 'low');
    const mediumSensitivity = detectAnomalies(realisticMergedPatterns, 'medium');
    const highSensitivity = detectAnomalies(realisticMergedPatterns, 'high');

    // Assert
    expect(lowSensitivity.sensitivity).toBe('low');
    expect(mediumSensitivity.sensitivity).toBe('medium');
    expect(highSensitivity.sensitivity).toBe('high');

    // Higher sensitivity should detect more anomalies
    expect(highSensitivity.spikes.length + highSensitivity.disappearances.length)
      .toBeGreaterThanOrEqual(lowSensitivity.spikes.length + lowSensitivity.disappearances.length);
  });

  test('should export anomaly data for dashboard visualization', () => {
    // Arrange
    const anomalies = detectAnomalies(realisticMergedPatterns, 'medium');

    // Act
    const alertData = anomalies.spikes.map(spike => ({
      patternId: spike.patternId,
      patternText: spike.patternText,
      severity: spike.severity,
      score: spike.score,
      timestamp: spike.timestamp,
    }));

    // Assert
    expect(alertData).toBeDefined();
    expect(Array.isArray(alertData)).toBe(true);
  });
});

// ============================================================================
// PERFORMANCE TESTS (AC1, AC2, AC3, AC4)
// ============================================================================

describe('Trend Analysis - Performance Requirements', () => {
  test('should complete trend analysis in < 5 seconds for 10K patterns (AC1)', () => {
    // Arrange
    const largeDataset = createLargeDataset(10000);

    // Act
    const startTime = performance.now();
    const result = analyzeTrends(largeDataset, { granularity: 'weekly' });
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert
    expect(result).toBeDefined();
    expect(duration).toBeLessThan(5000); // < 5 seconds
  });

  test('should complete prediction in < 3 seconds for 10K patterns (AC2)', () => {
    // Arrange
    const largeDataset = createLargeDataset(10000);

    // Act
    const startTime = performance.now();
    const predictions = predictPatterns(largeDataset, 'auto', 30);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert
    expect(predictions).toBeDefined();
    expect(duration).toBeLessThan(3000); // < 3 seconds
  });

  test('should handle correlation analysis efficiently for large datasets (AC3)', () => {
    // Arrange
    const largeDataset = createLargeDataset(1000);

    // Act
    const startTime = performance.now();
    const matrix = generateCorrelationMatrix(largeDataset);
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert
    expect(matrix).toBeDefined();
    expect(duration).toBeLessThan(10000); // Should complete in reasonable time
  });

  test('should complete anomaly detection in < 2 seconds for 10K patterns (AC4)', () => {
    // Arrange
    const largeDataset = createLargeDataset(10000);

    // Act
    const startTime = performance.now();
    const anomalies = detectAnomalies(largeDataset, 'medium');
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Assert
    expect(anomalies).toBeDefined();
    expect(duration).toBeLessThan(2000); // < 2 seconds
  });
});

// ============================================================================
// DATA INTEGRITY TESTS
// ============================================================================

describe('Trend Analysis - Data Integrity', () => {
  test('should preserve all pattern data through trend analysis pipeline', () => {
    // Act
    const result = analyzeTrends(realisticMergedPatterns);

    // Assert
    expect(result.totalPatterns).toBe(realisticMergedPatterns.length);
    expect(result.patterns.length).toBe(realisticMergedPatterns.length);

    // Verify all patterns are represented
    result.patterns.forEach(trend => {
      expect(realisticMergedPatterns.some(p => p.pattern_text === trend.patternText)).toBe(true);
    });
  });

  test('should maintain data integrity through prediction pipeline', () => {
    // Arrange
    const pattern = realisticMergedPatterns[0];

    // Act
    const prediction = predictPattern(pattern, 'linear', 30);

    // Assert
    expect(prediction.patternId).toBeDefined();
    expect(prediction.patternText).toBe(pattern.pattern_text);
  });

  test('should validate Chart.js compatibility of all exports', () => {
    // Arrange
    const trendResult = analyzeTrends(realisticMergedPatterns);
    const prediction = predictPattern(realisticMergedPatterns[0], 'linear', 30);

    // Act
    const trendChart = exportTrendForChart(trendResult.patterns[0]);
    const predictionChart = exportTrendForChart({
      patternId: 'prediction',
      patternText: prediction.patternText,
      direction: 'increasing',
      velocity: 1,
      confidence: prediction.confidence,
      dataPoints: prediction.forecast.map((value, i) => ({
        timestamp: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
        value,
      })),
      startDate: new Date(),
      endDate: new Date(),
      summary: 'Prediction',
    });

    // Assert
    expect(trendChart.labels).toBeDefined();
    expect(trendChart.datasets).toBeDefined();
    expect(predictionChart.labels).toBeDefined();
    expect(predictionChart.datasets).toBeDefined();
  });
});

// ============================================================================
// EDGE CASE INTEGRATION TESTS
// ============================================================================

describe('Trend Analysis - Edge Cases (Integration)', () => {
  test('should handle empty dataset gracefully', () => {
    // Act
    const result = analyzeTrends([]);

    // Assert
    expect(result).toBeDefined();
    expect(result.patterns).toEqual([]);
    expect(result.totalPatterns).toBe(0);
  });

  test('should handle single pattern dataset', () => {
    // Arrange
    const singlePattern = [realisticMergedPatterns[0]];

    // Act
    const result = analyzeTrends(singlePattern);

    // Assert
    expect(result).toBeDefined();
    expect(result.patterns.length).toBe(1);
  });

  test('should handle patterns with same timestamps', () => {
    // Arrange
    const sameTimestampPatterns: MergedPattern[] = [
      {
        pattern_text: 'Pattern 1',
        count: 5,
        category: PatternCategory.CODE_STYLE,
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
        pattern_text: 'Pattern 2',
        count: 3,
        category: PatternCategory.CONVENTION,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: ['code'],
        session_count: 1,
        total_frequency: 3,
        is_new: true,
        frequency_change: 0,
      },
    ];

    // Act
    const result = analyzeTrends(sameTimestampPatterns);

    // Assert
    expect(result).toBeDefined();
    expect(result.patterns.length).toBe(2);
  });

  test('should handle patterns with extreme frequency values', () => {
    // Arrange
    const extremePatterns: MergedPattern[] = [
      {
        pattern_text: 'Very high frequency',
        count: 1000,
        category: PatternCategory.CODE_STYLE,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-01-01T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: ['code'],
        session_count: 100,
        total_frequency: 10000,
        is_new: false,
        frequency_change: 100,
      },
      {
        pattern_text: 'Very low frequency',
        count: 1,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: '2026-03-18T10:00:00Z',
        last_seen: '2026-03-18T10:00:00Z',
        content_types: ['general_text'],
        session_count: 1,
        total_frequency: 1,
        is_new: true,
        frequency_change: 0,
      },
    ];

    // Act
    const result = analyzeTrends(extremePatterns);

    // Assert
    expect(result).toBeDefined();
    expect(result.patterns.length).toBe(2);
  });

  test('should handle patterns with invalid timestamps gracefully', () => {
    // Arrange
    const patternsWithInvalidTimestamps: MergedPattern[] = [
      ...realisticMergedPatterns,
      {
        pattern_text: 'Invalid timestamp pattern',
        count: 2,
        category: PatternCategory.OTHER,
        examples: [],
        suggested_rule: 'Test rule',
        first_seen: 'not-a-valid-timestamp',
        last_seen: 'also-invalid',
        content_types: ['general_text'],
        session_count: 1,
        total_frequency: 2,
        is_new: false,
        frequency_change: 0,
      },
    ];

    // Act
    const result = analyzeTrends(patternsWithInvalidTimestamps);

    // Assert
    expect(result).toBeDefined();
    // Should only include valid patterns
    expect(result.patterns.length).toBeGreaterThan(0);
  });
});
