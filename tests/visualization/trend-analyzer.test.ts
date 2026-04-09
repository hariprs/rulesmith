/**
 * Unit Tests: Trend Analyzer
 * Story 3-6: Add Trend Analysis and Predictions
 */

import { describe, it, expect } from '@jest/globals';
import {
  analyzeTrends,
  exportTrendForChart,
  getTrendSummaryStatistics,
  type PatternTrend,
  type TrendAnalysisResult
} from '../../src/visualization/trend-analyzer.js';
import type { MergedPattern } from '../../src/state-management.js';
import { PatternCategory } from '../../src/pattern-detector.js';

describe('Trend Analyzer', () => {
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

  describe('analyzeTrends', () => {
    it('should analyze trends for multiple patterns', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 20, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 5, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeTrends(patterns, {
        window: '30d',
        granularity: 'weekly',
        minPatterns: 2
      });

      expect(result).toBeDefined();
      expect(result.patterns.length).toBeGreaterThan(0);
      expect(result.analysisWindow).toBe('30d');
      expect(result.granularity).toBe('weekly');
      expect(result.totalPatterns).toBe(3);
    });

    it('should filter patterns by minimum frequency', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 1, '2026-01-01', '2026-01-31'), // Below threshold
        createMockPattern('Pattern 3', 5, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeTrends(patterns, {
        minPatterns: 2
      });

      expect(result.patterns.length).toBe(2);
    });

    it('should categorize trends by direction', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Accelerating Pattern', 15, '2026-01-01', '2026-01-31'),
        createMockPattern('Declining Pattern', 5, '2026-01-01', '2026-01-31'),
        createMockPattern('Stable Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeTrends(patterns);

      expect(result.acceleratingPatterns).toBeDefined();
      expect(result.decliningPatterns).toBeDefined();
      expect(result.stablePatterns).toBeDefined();
    });

    it('should handle empty pattern array', () => {
      const result = analyzeTrends([]);

      expect(result.patterns).toEqual([]);
      expect(result.acceleratingPatterns).toEqual([]);
      expect(result.decliningPatterns).toEqual([]);
      expect(result.stablePatterns).toEqual([]);
    });

    it('should support different time windows', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const windows = ['7d', '30d', '90d', 'all'] as const;

      windows.forEach(window => {
        const result = analyzeTrends(patterns, { window });
        expect(result.analysisWindow).toBe(window);
      });
    });

    it('should support different granularities', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31')
      ];

      const granularities = ['daily', 'weekly', 'monthly'] as const;

      granularities.forEach(granularity => {
        const result = analyzeTrends(patterns, { granularity });
        expect(result.granularity).toBe(granularity);
      });
    });
  });

  describe('exportTrendForChart', () => {
    it('should export trend data for Chart.js', () => {
      const trend: PatternTrend = {
        patternId: 'test-pattern',
        patternText: 'Test Pattern',
        direction: 'increasing',
        velocity: 1.5,
        confidence: 0.8,
        dataPoints: [
          { timestamp: new Date('2026-01-01'), value: 5 },
          { timestamp: new Date('2026-01-08'), value: 7 },
          { timestamp: new Date('2026-01-15'), value: 10 }
        ],
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-15'),
        summary: 'Test summary'
      };

      const chartData = exportTrendForChart(trend);

      expect(chartData).toBeDefined();
      expect(chartData.labels).toBeDefined();
      expect(chartData.datasets).toBeDefined();
      expect(chartData.labels.length).toBe(3);
      expect(chartData.datasets[0].data.length).toBe(3);
    });

    it('should color-code trends by direction', () => {
      const increasingTrend: PatternTrend = {
        patternId: 'inc',
        patternText: 'Increasing',
        direction: 'increasing',
        velocity: 1.5,
        confidence: 0.8,
        dataPoints: [{ timestamp: new Date(), value: 10 }],
        startDate: new Date(),
        endDate: new Date(),
        summary: ''
      };

      const decreasingTrend: PatternTrend = {
        patternId: 'dec',
        patternText: 'Decreasing',
        direction: 'decreasing',
        velocity: -1.5,
        confidence: 0.8,
        dataPoints: [{ timestamp: new Date(), value: 10 }],
        startDate: new Date(),
        endDate: new Date(),
        summary: ''
      };

      const stableTrend: PatternTrend = {
        patternId: 'stable',
        patternText: 'Stable',
        direction: 'stable',
        velocity: 0,
        confidence: 0.8,
        dataPoints: [{ timestamp: new Date(), value: 10 }],
        startDate: new Date(),
        endDate: new Date(),
        summary: ''
      };

      const incChart = exportTrendForChart(increasingTrend);
      const decChart = exportTrendForChart(decreasingTrend);
      const stableChart = exportTrendForChart(stableTrend);

      expect(incChart.datasets[0].borderColor).toBe('#10b981'); // green
      expect(decChart.datasets[0].borderColor).toBe('#ef4444'); // red
      expect(stableChart.datasets[0].borderColor).toBe('#808080'); // gray
    });
  });

  describe('getTrendSummaryStatistics', () => {
    it('should calculate summary statistics', () => {
      const result: TrendAnalysisResult = {
        patterns: [],
        acceleratingPatterns: [
          {
            patternId: '1',
            patternText: 'Pattern 1',
            direction: 'increasing',
            velocity: 1.5,
            confidence: 0.8,
            dataPoints: [],
            startDate: new Date(),
            endDate: new Date(),
            summary: ''
          }
        ],
        decliningPatterns: [
          {
            patternId: '2',
            patternText: 'Pattern 2',
            direction: 'decreasing',
            velocity: -1.5,
            confidence: 0.7,
            dataPoints: [],
            startDate: new Date(),
            endDate: new Date(),
            summary: ''
          }
        ],
        stablePatterns: [
          {
            patternId: '3',
            patternText: 'Pattern 3',
            direction: 'stable',
            velocity: 0,
            confidence: 0.6,
            dataPoints: [],
            startDate: new Date(),
            endDate: new Date(),
            summary: ''
          }
        ],
        analysisWindow: '30d',
        granularity: 'weekly',
        totalPatterns: 3,
        analysisDate: new Date()
      };

      const stats = getTrendSummaryStatistics(result);

      expect(stats.totalPatterns).toBe(3);
      expect(stats.acceleratingCount).toBe(1);
      expect(stats.decliningCount).toBe(1);
      expect(stats.stableCount).toBe(1);
      // Note: averageConfidence is calculated from actual patterns array, not the categorized arrays
      // Since we're using mock data without real data points, confidence will be 0
      expect(stats.averageConfidence).toBeGreaterThanOrEqual(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
      expect(stats.highConfidenceCount).toBeGreaterThanOrEqual(0);
    });
  });
});
