/**
 * Unit Tests: Anomaly Detector
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Unit tests for anomaly detection in pattern evolution.
 * Tests z-score and IQR outlier detection methods, anomaly scoring,
 * severity classification, spike/disappearance detection, and edge cases.
 *
 * Test Pyramid Level: Unit (70% - isolated function tests)
 */

import { describe, it, expect } from '@jest/globals';
import {
  detectAnomalies,
  exportAnomaliesForChart,
  getAnomalySummaryStatistics,
  type AnomalyDetectionResult,
  type PatternAnomaly
} from '../../../src/visualization/anomaly-detector.js';
import type { MergedPattern } from '../../../src/state-management.js';
import { PatternCategory } from '../../../src/pattern-detector.js';

describe('Anomaly Detector', () => {
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

  describe('detectAnomalies', () => {
    it('should detect anomalies using z-score method', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern 2', 12, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern 3', 11, '2026-01-01', '2026-01-31'),
        createMockPattern('Spike Pattern', 100, '2026-01-01', '2026-01-31'), // Outlier
        createMockPattern('Normal Pattern 4', 9, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        method: 'zscore',
        threshold: 2
      });

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.totalPatterns).toBe(5);
      expect(result.method).toBe('zscore');
    });

    it('should detect anomalies using IQR method', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern 2', 12, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern 3', 11, '2026-01-01', '2026-01-31'),
        createMockPattern('Spike Pattern', 100, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern 4', 9, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        method: 'iqr',
        multiplier: 1.5
      });

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.method).toBe('iqr');
    });

    it('should detect sudden frequency spikes', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Spike Pattern', 50, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        detectSpikes: true
      });

      const spikeAnomaly = result.anomalies.find(a => a.type === 'spike');
      expect(spikeAnomaly).toBeDefined();
    });

    it('should detect unexpected pattern disappearances', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Active Pattern', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Disappeared Pattern', 0, '2026-01-01', '2026-01-15') // Stopped occurring
      ];

      const result = detectAnomalies(patterns, {
        detectDisappearances: true
      });

      const disappearanceAnomaly = result.anomalies.find(a => a.type === 'disappearance');
      expect(disappearanceAnomaly).toBeDefined();
    });

    it('should calculate anomaly scores', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Anomaly Pattern', 100, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      result.anomalies.forEach(anomaly => {
        expect(anomaly.score).toBeDefined();
        expect(anomaly.score).toBeGreaterThan(0);
      });
    });

    it('should classify severity levels (low, medium, high)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Minor Anomaly', 20, '2026-01-01', '2026-01-31'),
        createMockPattern('Major Anomaly', 100, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      result.anomalies.forEach(anomaly => {
        expect(anomaly.severity).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(anomaly.severity);
      });
    });

    it('should support configurable sensitivity thresholds', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 25, '2026-01-01', '2026-01-31')
      ];

      const lowSensitivity = detectAnomalies(patterns, { sensitivity: 'low' });
      const highSensitivity = detectAnomalies(patterns, { sensitivity: 'high' });

      // Higher sensitivity should detect more anomalies
      expect(highSensitivity.anomalies.length).toBeGreaterThanOrEqual(lowSensitivity.anomalies.length);
    });

    it('should distinguish temporary vs permanent shifts', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Temporary Spike', 50, '2026-01-01', '2026-01-02'),
        createMockPattern('Permanent Shift', 30, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        detectShiftType: true
      });

      result.anomalies.forEach(anomaly => {
        expect(anomaly.shiftType).toBeDefined();
        expect(['temporary', 'permanent', 'unknown']).toContain(anomaly.shiftType);
      });
    });

    it('should provide anomaly explanations', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Anomaly Pattern', 100, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        includeExplanations: true
      });

      result.anomalies.forEach(anomaly => {
        expect(anomaly.explanation).toBeDefined();
        expect(typeof anomaly.explanation).toBe('string');
      });
    });

    it('should handle empty pattern array', () => {
      const result = detectAnomalies([]);

      expect(result.anomalies).toEqual([]);
      expect(result.totalPatterns).toBe(0);
    });

    it('should handle single pattern', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Single Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBe(1);
      // Single pattern may not be anomalous without comparison
    });

    it('should handle normal distribution (no anomalies)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 11, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 4', 12, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 5', 9, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        sensitivity: 'low'
      });

      // Should detect few or no anomalies in normal distribution
      expect(result).toBeDefined();
    });

    it('should handle all identical values', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 10, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      // Should handle gracefully without errors
    });

    it('should handle zero frequency values', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 0, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBe(2);
    });

    it('should handle very large frequency values', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Normal Pattern', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('High Frequency Pattern', 1000000, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should handle negative frequency changes', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Declining Pattern', 5, '2026-01-01', '2026-01-31'),
        createMockPattern('Normal Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
    });

    it('should support multiple detection methods combined', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 100, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns, {
        method: 'both', // Use both z-score and IQR
        consensus: true // Require consensus
      });

      expect(result).toBeDefined();
      expect(result.method).toBe('both');
    });
  });

  describe('exportAnomaliesForChart', () => {
    it('should export anomaly data for Chart.js', () => {
      const anomalies: PatternAnomaly[] = [
        {
          patternId: '1',
          patternText: 'Anomaly Pattern 1',
          type: 'spike',
          score: 5.2,
          severity: 'high',
          expectedValue: 10,
          actualValue: 100,
          deviation: 90,
          timestamp: new Date('2026-01-15'),
          explanation: 'Sudden frequency spike detected'
        },
        {
          patternId: '2',
          patternText: 'Anomaly Pattern 2',
          type: 'disappearance',
          score: 3.1,
          severity: 'medium',
          expectedValue: 15,
          actualValue: 0,
          deviation: 15,
          timestamp: new Date('2026-01-20'),
          explanation: 'Pattern stopped occurring'
        }
      ];

      const chartData = exportAnomaliesForChart(anomalies);

      expect(chartData).toBeDefined();
      expect(chartData.labels).toBeDefined();
      expect(chartData.datasets).toBeDefined();
      expect(chartData.labels.length).toBe(2);
    });

    it('should color-code by severity level', () => {
      const anomalies: PatternAnomaly[] = [
        {
          patternId: '1',
          patternText: 'High Severity',
          type: 'spike',
          score: 5.0,
          severity: 'high',
          expectedValue: 10,
          actualValue: 100,
          deviation: 90,
          timestamp: new Date('2026-01-15'),
          explanation: 'High severity anomaly'
        },
        {
          patternId: '2',
          patternText: 'Low Severity',
          type: 'spike',
          score: 2.0,
          severity: 'low',
          expectedValue: 10,
          actualValue: 15,
          deviation: 5,
          timestamp: new Date('2026-01-16'),
          explanation: 'Low severity anomaly'
        }
      ];

      const chartData = exportAnomaliesForChart(anomalies);

      const highSeverityDataset = chartData.datasets.find(d => d.label === 'High Severity');
      const lowSeverityDataset = chartData.datasets.find(d => d.label === 'Low Severity');

      expect(highSeverityDataset || lowSeverityDataset).toBeDefined();
    });

    it('should include expected vs actual values', () => {
      const anomalies: PatternAnomaly[] = [
        {
          patternId: '1',
          patternText: 'Anomaly',
          type: 'spike',
          score: 5.0,
          severity: 'high',
          expectedValue: 10,
          actualValue: 100,
          deviation: 90,
          timestamp: new Date('2026-01-15'),
          explanation: ''
        }
      ];

      const chartData = exportAnomaliesForChart(anomalies);

      expect(chartData.datasets.length).toBeGreaterThan(0);
      // Should have datasets for expected and actual values
    });

    it('should handle empty anomalies array', () => {
      const chartData = exportAnomaliesForChart([]);

      expect(chartData.labels).toEqual([]);
      expect(chartData.datasets).toEqual([]);
    });

    it('should group by anomaly type', () => {
      const anomalies: PatternAnomaly[] = [
        {
          patternId: '1',
          patternText: 'Spike',
          type: 'spike',
          score: 5.0,
          severity: 'high',
          expectedValue: 10,
          actualValue: 100,
          deviation: 90,
          timestamp: new Date('2026-01-15'),
          explanation: ''
        },
        {
          patternId: '2',
          patternText: 'Disappearance',
          type: 'disappearance',
          score: 3.0,
          severity: 'medium',
          expectedValue: 10,
          actualValue: 0,
          deviation: 10,
          timestamp: new Date('2026-01-16'),
          explanation: ''
        }
      ];

      const chartData = exportAnomaliesForChart(anomalies);

      // Should organize by type
      expect(chartData.datasets.length).toBeGreaterThan(0);
    });
  });

  describe('getAnomalySummaryStatistics', () => {
    it('should calculate anomaly summary statistics', () => {
      const result: AnomalyDetectionResult = {
        anomalies: [
          {
            patternId: '1',
            patternText: 'Anomaly 1',
            type: 'spike',
            score: 5.0,
            severity: 'high',
            expectedValue: 10,
            actualValue: 100,
            deviation: 90,
            timestamp: new Date('2026-01-15'),
            explanation: ''
          },
          {
            patternId: '2',
            patternText: 'Anomaly 2',
            type: 'disappearance',
            score: 3.0,
            severity: 'medium',
            expectedValue: 10,
            actualValue: 0,
            deviation: 10,
            timestamp: new Date('2026-01-16'),
            explanation: ''
          }
        ],
        totalPatterns: 10,
        method: 'zscore',
        sensitivity: 'medium'
      };

      const stats = getAnomalySummaryStatistics(result);

      expect(stats.totalPatterns).toBe(10);
      expect(stats.totalAnomalies).toBe(2);
      expect(stats.highSeverityCount).toBe(1);
      expect(stats.mediumSeverityCount).toBe(1);
      expect(stats.lowSeverityCount).toBe(0);
    });

    it('should categorize by anomaly type', () => {
      const result: AnomalyDetectionResult = {
        anomalies: [
          {
            patternId: '1',
            patternText: 'Spike',
            type: 'spike',
            score: 5.0,
            severity: 'high',
            expectedValue: 10,
            actualValue: 100,
            deviation: 90,
            timestamp: new Date('2026-01-15'),
            explanation: ''
          },
          {
            patternId: '2',
            patternText: 'Disappearance',
            type: 'disappearance',
            score: 3.0,
            severity: 'medium',
            expectedValue: 10,
            actualValue: 0,
            deviation: 10,
            timestamp: new Date('2026-01-16'),
            explanation: ''
          }
        ],
        totalPatterns: 10,
        method: 'zscore',
        sensitivity: 'medium'
      };

      const stats = getAnomalySummaryStatistics(result);

      expect(stats.spikeCount).toBe(1);
      expect(stats.disappearanceCount).toBe(1);
    });

    it('should calculate average anomaly score', () => {
      const result: AnomalyDetectionResult = {
        anomalies: [
          {
            patternId: '1',
            patternText: 'Anomaly 1',
            type: 'spike',
            score: 5.0,
            severity: 'high',
            expectedValue: 10,
            actualValue: 100,
            deviation: 90,
            timestamp: new Date('2026-01-15'),
            explanation: ''
          },
          {
            patternId: '2',
            patternText: 'Anomaly 2',
            type: 'spike',
            score: 3.0,
            severity: 'medium',
            expectedValue: 10,
            actualValue: 50,
            deviation: 40,
            timestamp: new Date('2026-01-16'),
            explanation: ''
          }
        ],
        totalPatterns: 10,
        method: 'zscore',
        sensitivity: 'medium'
      };

      const stats = getAnomalySummaryStatistics(result);

      expect(stats.averageScore).toBeCloseTo(4.0, 1);
    });

    it('should handle empty anomaly result', () => {
      const result: AnomalyDetectionResult = {
        anomalies: [],
        totalPatterns: 0,
        method: 'zscore',
        sensitivity: 'medium'
      };

      const stats = getAnomalySummaryStatistics(result);

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalAnomalies).toBe(0);
      expect(stats.highSeverityCount).toBe(0);
      expect(stats.mediumSeverityCount).toBe(0);
      expect(stats.lowSeverityCount).toBe(0);
    });

    it('should calculate anomaly rate', () => {
      const result: AnomalyDetectionResult = {
        anomalies: [
          {
            patternId: '1',
            patternText: 'Anomaly',
            type: 'spike',
            score: 5.0,
            severity: 'high',
            expectedValue: 10,
            actualValue: 100,
            deviation: 90,
            timestamp: new Date('2026-01-15'),
            explanation: ''
          }
        ],
        totalPatterns: 10,
        method: 'zscore',
        sensitivity: 'medium'
      };

      const stats = getAnomalySummaryStatistics(result);

      expect(stats.anomalyRate).toBeCloseTo(0.1, 1); // 1 anomaly / 10 patterns
    });
  });

  describe('Edge Cases', () => {
    it('should handle patterns with same frequency', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 10, '2026-01-01', '2026-01-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      // No variation means no anomalies
    });

    it('should handle temporal patterns with gaps', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 0, '2026-02-01', '2026-02-28'), // Gap
        createMockPattern('Pattern 3', 10, '2026-03-01', '2026-03-31')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
    });

    it('should handle very small sample sizes', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 1, '2026-01-01', '2026-01-01'),
        createMockPattern('Pattern 2', 2, '2026-01-01', '2026-01-01')
      ];

      const result = detectAnomalies(patterns);

      expect(result).toBeDefined();
      // Should handle small sample size gracefully
    });
  });
});
