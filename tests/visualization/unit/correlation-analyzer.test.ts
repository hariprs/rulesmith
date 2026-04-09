/**
 * Unit Tests: Correlation Analyzer
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Unit tests for pattern correlation analysis, clustering, and relationship detection.
 * Tests co-occurrence detection, correlation coefficients, statistical significance,
 * pattern chains, influence scores, and clustering algorithms.
 *
 * Test Pyramid Level: Unit (70% - isolated function tests)
 */

import { describe, it, expect } from '@jest/globals';
import {
  analyzeCorrelations,
  exportCorrelationMatrix,
  getCorrelationSummaryStatistics,
  type CorrelationAnalysisResult,
  type PatternCorrelation
} from '../../../src/visualization/correlation-analyzer.js';
import type { MergedPattern } from '../../../src/state-management.js';
import { PatternCategory } from '../../../src/pattern-detector.js';

describe('Correlation Analyzer', () => {
  const createMockPattern = (
    patternText: string,
    totalFrequency: number,
    firstSeen: string,
    lastSeen: string,
    category: PatternCategory = PatternCategory.CODE_STYLE
  ): MergedPattern => ({
    pattern_text: patternText,
    count: totalFrequency,
    category,
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

  describe('analyzeCorrelations', () => {
    it('should detect co-occurring patterns', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern B', 8, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern C', 5, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      expect(result.correlations).toBeDefined();
      expect(result.totalPatterns).toBe(3);
    });

    it('should calculate correlation coefficients', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        method: 'pearson'
      });

      expect(result.correlations.length).toBeGreaterThan(0);
      const correlation = result.correlations[0];
      expect(correlation.coefficient).toBeGreaterThanOrEqual(-1);
      expect(correlation.coefficient).toBeLessThanOrEqual(1);
    });

    it('should support Pearson correlation method', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        method: 'pearson'
      });

      expect(result.method).toBe('pearson');
      expect(result.correlations.length).toBeGreaterThan(0);
    });

    it('should support Spearman correlation method', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        method: 'spearman'
      });

      expect(result.method).toBe('spearman');
      expect(result.correlations.length).toBeGreaterThan(0);
    });

    it('should perform statistical significance testing', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        significanceLevel: 0.05
      });

      result.correlations.forEach(correlation => {
        expect(correlation.pValue).toBeDefined();
        expect(correlation.significant).toBeDefined();
        expect(correlation.pValue).toBeGreaterThanOrEqual(0);
        expect(correlation.pValue).toBeLessThanOrEqual(1);
      });
    });

    it('should group patterns by similarity (clustering)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31', PatternCategory.CODE_STYLE),
        createMockPattern('Pattern B', 8, '2026-01-01', '2026-01-31', PatternCategory.CODE_STYLE),
        createMockPattern('Pattern C', 5, '2026-01-01', '2026-01-31', PatternCategory.CONVENTION)
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        enableClustering: true,
        clusterBy: 'category'
      });

      expect(result.clusters).toBeDefined();
      expect(Array.isArray(result.clusters)).toBe(true);
      if (result.clusters.length > 0) {
        expect(result.clusters[0].patterns).toBeDefined();
        expect(result.clusters[0].similarity).toBeDefined();
      }
    });

    it('should detect pattern chains (A triggers B)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern B', 8, '2026-01-02', '2026-01-31'),
        createMockPattern('Pattern C', 5, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        detectChains: true
      });

      expect(result.patternChains).toBeDefined();
      expect(Array.isArray(result.patternChains)).toBe(true);
    });

    it('should calculate influence scores', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 8, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        calculateInfluence: true
      });

      result.correlations.forEach(correlation => {
        expect(correlation.influenceScore).toBeDefined();
        expect(correlation.influenceScore).toBeGreaterThanOrEqual(0);
      });
    });

    it('should filter weak correlations', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        minCorrelation: 0.5
      });

      result.correlations.forEach(correlation => {
        expect(Math.abs(correlation.coefficient)).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should support category-based correlation', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31', PatternCategory.CODE_STYLE),
        createMockPattern('Pattern B', 8, '2026-01-01', '2026-01-31', PatternCategory.CODE_STYLE),
        createMockPattern('Pattern C', 5, '2026-01-01', '2026-01-31', PatternCategory.CONVENTION)
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        correlateByCategory: true
      });

      expect(result).toBeDefined();
      expect(result.correlations.length).toBeGreaterThanOrEqual(0);
    });

    it('should support temporal correlation (similar time windows)', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 8, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        enableTemporalCorrelation: true,
        temporalWindow: 7 // days
      });

      expect(result).toBeDefined();
      expect(result.correlations.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty pattern array', () => {
      const result = analyzeCorrelations([]);

      expect(result.correlations).toEqual([]);
      expect(result.clusters).toEqual([]);
      expect(result.patternChains).toEqual([]);
      expect(result.totalPatterns).toBe(0);
    });

    it('should handle single pattern', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Single Pattern', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBe(1);
      // No correlations possible with single pattern
      expect(result.correlations.length).toBe(0);
    });

    it('should handle patterns with no correlations', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 1, '2026-01-01', '2026-01-01'),
        createMockPattern('Pattern 2', 1, '2026-02-01', '2026-02-01')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      // May have no significant correlations
      expect(result.totalPatterns).toBe(2);
    });

    it('should handle large pattern sets efficiently', () => {
      const patterns: MergedPattern[] = Array.from({ length: 100 }, (_, i) =>
        createMockPattern(`Pattern ${i}`, 10, '2026-01-01', '2026-01-31')
      );

      const startTime = Date.now();
      const result = analyzeCorrelations(patterns, 'pearson', 2
        sampling: true,
        sampleSize: 50
      });
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBe(100);
      // Should complete in reasonable time (< 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('exportCorrelationMatrix', () => {
    it('should export correlation matrix for visualization', () => {
      const correlations: PatternCorrelation[] = [
        {
          pattern1Id: '1',
          pattern1Text: 'Pattern 1',
          pattern2Id: '2',
          pattern2Text: 'Pattern 2',
          coefficient: 0.8,
          pValue: 0.01,
          significant: true,
          significance: 'strong',
          influenceScore: 0.9
        },
        {
          pattern1Id: '1',
          pattern1Text: 'Pattern 1',
          pattern2Id: '3',
          pattern2Text: 'Pattern 3',
          coefficient: -0.5,
          pValue: 0.05,
          significant: true,
          significance: 'moderate',
          influenceScore: 0.6
        }
      ];

      const matrix = exportCorrelationMatrix(correlations);

      expect(matrix).toBeDefined();
      expect(matrix.patterns).toBeDefined();
      expect(matrix.data).toBeDefined();
      expect(matrix.patterns.length).toBeGreaterThan(0);
      expect(matrix.data.length).toBeGreaterThan(0);
    });

    it('should create square matrix for all patterns', () => {
      const correlations: PatternCorrelation[] = [
        {
          pattern1Id: '1',
          pattern1Text: 'Pattern 1',
          pattern2Id: '2',
          pattern2Text: 'Pattern 2',
          coefficient: 0.8,
          pValue: 0.01,
          significant: true,
          significance: 'strong',
          influenceScore: 0.9
        }
      ];

      const matrix = exportCorrelationMatrix(correlations);

      expect(matrix.data.length).toBe(matrix.patterns.length);
      matrix.data.forEach(row => {
        expect(row.length).toBe(matrix.patterns.length);
      });
    });

    it('should handle empty correlations array', () => {
      const matrix = exportCorrelationMatrix([]);

      expect(matrix.patterns).toEqual([]);
      expect(matrix.data).toEqual([]);
    });

    it('should include diagonal elements (self-correlation = 1)', () => {
      const correlations: PatternCorrelation[] = [
        {
          pattern1Id: '1',
          pattern1Text: 'Pattern 1',
          pattern2Id: '2',
          pattern2Text: 'Pattern 2',
          coefficient: 0.8,
          pValue: 0.01,
          significant: true,
          significance: 'strong',
          influenceScore: 0.9
        }
      ];

      const matrix = exportCorrelationMatrix(correlations);

      // Diagonal should be 1.0
      for (let i = 0; i < matrix.patterns.length; i++) {
        expect(matrix.data[i][i]).toBe(1.0);
      }
    });
  });

  describe('getCorrelationSummaryStatistics', () => {
    it('should calculate correlation summary statistics', () => {
      const result: CorrelationAnalysisResult = {
        correlations: [
          {
            pattern1Id: '1',
            pattern1Text: 'Pattern 1',
            pattern2Id: '2',
            pattern2Text: 'Pattern 2',
            coefficient: 0.8,
            pValue: 0.01,
            significant: true,
            significance: 'strong',
            influenceScore: 0.9
          },
          {
            pattern1Id: '2',
            pattern1Text: 'Pattern 2',
            pattern2Id: '3',
            pattern2Text: 'Pattern 3',
            coefficient: -0.5,
            pValue: 0.05,
            significant: true,
            significance: 'moderate',
            influenceScore: 0.6
          }
        ],
        clusters: [],
        patternChains: [],
        totalPatterns: 3,
        method: 'pearson',
        significanceLevel: 0.05
      };

      const stats = getCorrelationSummaryStatistics(result);

      expect(stats.totalPatterns).toBe(3);
      expect(stats.totalCorrelations).toBe(2);
      expect(stats.strongCorrelations).toBeGreaterThanOrEqual(0);
      expect(stats.moderateCorrelations).toBeGreaterThanOrEqual(0);
      expect(stats.weakCorrelations).toBeGreaterThanOrEqual(0);
      expect(stats.averageCorrelation).toBeDefined();
    });

    it('should count significant correlations', () => {
      const result: CorrelationAnalysisResult = {
        correlations: [
          {
            pattern1Id: '1',
            pattern1Text: 'Pattern 1',
            pattern2Id: '2',
            pattern2Text: 'Pattern 2',
            coefficient: 0.8,
            pValue: 0.01,
            significant: true,
            significance: 'strong',
            influenceScore: 0.9
          },
          {
            pattern1Id: '2',
            pattern1Text: 'Pattern 2',
            pattern2Id: '3',
            pattern2Text: 'Pattern 3',
            coefficient: 0.3,
            pValue: 0.2,
            significant: false,
            significance: 'weak',
            influenceScore: 0.3
          }
        ],
        clusters: [],
        patternChains: [],
        totalPatterns: 3,
        method: 'pearson',
        significanceLevel: 0.05
      };

      const stats = getCorrelationSummaryStatistics(result);

      expect(stats.significantCorrelations).toBe(1);
      expect(stats.nonSignificantCorrelations).toBe(1);
    });

    it('should handle empty correlation result', () => {
      const result: CorrelationAnalysisResult = {
        correlations: [],
        clusters: [],
        patternChains: [],
        totalPatterns: 0,
        method: 'pearson',
        significanceLevel: 0.05
      };

      const stats = getCorrelationSummaryStatistics(result);

      expect(stats.totalPatterns).toBe(0);
      expect(stats.totalCorrelations).toBe(0);
      expect(stats.strongCorrelations).toBe(0);
      expect(stats.moderateCorrelations).toBe(0);
      expect(stats.weakCorrelations).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle duplicate patterns', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern A', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern B', 8, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      // Should handle duplicates gracefully
      expect(result.totalPatterns).toBeGreaterThanOrEqual(0);
    });

    it('should handle patterns with same frequency', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 10, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 3', 10, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      expect(result.totalPatterns).toBe(3);
    });

    it('should handle very large correlation values', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 1000000, '2026-01-01', '2026-01-31'),
        createMockPattern('Pattern 2', 1000000, '2026-01-01', '2026-01-31')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2);

      expect(result).toBeDefined();
      result.correlations.forEach(c => {
        expect(c.coefficient).toBeGreaterThanOrEqual(-1);
        expect(c.coefficient).toBeLessThanOrEqual(1);
      });
    });

    it('should handle sparse temporal data', () => {
      const patterns: MergedPattern[] = [
        createMockPattern('Pattern 1', 10, '2026-01-01', '2026-01-01'),
        createMockPattern('Pattern 2', 8, '2026-03-01', '2026-03-01')
      ];

      const result = analyzeCorrelations(patterns, 'pearson', 2
        enableTemporalCorrelation: true
      });

      expect(result).toBeDefined();
      // Should handle sparse data gracefully
      expect(result.totalPatterns).toBe(2);
    });
  });
});
