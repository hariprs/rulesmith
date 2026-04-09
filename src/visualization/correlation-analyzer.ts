/**
 * Correlation Analysis Module
 * Story 3-6: Add Trend Analysis and Predictions (AC3)
 *
 * Analyzes pattern relationships:
 * - Co-occurrence detection
 * - Pattern correlation (Pearson, Spearman)
 * - Pattern clustering by similarity
 * - Pattern chain detection (A triggers B)
 * - Influence scoring
 */

import { calculatePearsonCorrelation, DataPoint } from './statistics.js';
import { MergedPattern } from '../state-management.js';

/**
 * Correlation method
 */
export type CorrelationMethod = 'pearson' | 'spearman';

/**
 * Pattern pair correlation result
 */
export interface PatternCorrelation {
  pattern1: string;
  pattern2: string;
  correlation: number;
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
  coOccurrenceCount: number;
}

/**
 * Pattern cluster
 */
export interface PatternCluster {
  id: string;
  patterns: string[];
  similarity: number;
  dominantCategory: string;
  description: string;
}

/**
 * Pattern chain (A triggers B)
 */
export interface PatternChain {
  triggerPattern: string;
  triggeredPattern: string;
  confidence: number;
  support: number; // Number of occurrences
  description: string;
}

/**
 * Pattern influence score
 */
export interface PatternInfluence {
  pattern: string;
  influenceScore: number; // 0-1
  influencesCount: number; // Number of patterns it influences
  influencedByCount: number; // Number of patterns that influence it
  description: string;
}

/**
 * Correlation analysis result
 */
export interface CorrelationAnalysisResult {
  correlations: PatternCorrelation[];
  strongCorrelations: PatternCorrelation[];
  moderateCorrelations: PatternCorrelation[];
  clusters: PatternCluster[];
  chains: PatternChain[];
  influences: PatternInfluence[];
  totalPatterns: number;
  analysisDate: Date;
}

/**
 * Analyze correlations between patterns
 * @param patterns - Array of merged patterns
 * @param method - Correlation method
 * @param minCoOccurrence - Minimum co-occurrence count
 * @returns Correlation analysis result
 */
export function analyzeCorrelations(
  patterns: MergedPattern[],
  method: CorrelationMethod = 'pearson',
  minCoOccurrence: number = 2
): CorrelationAnalysisResult {
  // Guard: Validate input
  if (!Array.isArray(patterns) || patterns.length === 0) {
    console.warn('analyzeCorrelations: Invalid patterns input, returning empty result');
    return {
      correlations: [],
      strongCorrelations: [],
      moderateCorrelations: [],
      clusters: [],
      chains: [],
      influences: [],
      totalPatterns: 0,
      analysisDate: new Date()
    };
  }

  // Guard: Validate and clamp minCoOccurrence
  const validatedMinCoOccurrence = Math.max(1, Math.min(1000, minCoOccurrence || 2));

  // Calculate temporal correlation based on overlapping time periods
  const correlations = calculateTemporalCorrelations(patterns, method, validatedMinCoOccurrence);

  // Filter by significance
  const strongCorrelations = correlations.filter(c => c.significance === 'strong');
  const moderateCorrelations = correlations.filter(c => c.significance === 'moderate');

  // Perform clustering
  const clusters = performPatternClustering(patterns, correlations);

  // Detect pattern chains
  const chains = detectPatternChains(patterns, correlations);

  // Calculate influence scores
  const influences = calculateInfluenceScores(patterns, correlations);

  return {
    correlations,
    strongCorrelations,
    moderateCorrelations,
    clusters,
    chains,
    influences,
    totalPatterns: patterns.length,
    analysisDate: new Date()
  };
}

/**
 * Calculate temporal correlations between patterns
 * @param patterns - Array of merged patterns
 * @param method - Correlation method
 * @param minCoOccurrence - Minimum co-occurrence count
 * @returns Array of pattern correlations
 */
function calculateTemporalCorrelations(
  patterns: MergedPattern[],
  method: CorrelationMethod,
  minCoOccurrence: number
): PatternCorrelation[] {
  const correlations: PatternCorrelation[] = [];

  // Create time series for each pattern
  const timeSeriesMap = new Map<string, number[]>();
  const periodDays = 7; // Weekly granularity

  patterns.forEach(pattern => {
    const timeSeries = createTimeSeries(pattern, periodDays);
    timeSeriesMap.set(pattern.pattern_text, timeSeries);
  });

  // Calculate correlations between all pairs
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const pattern1 = patterns[i];
      const pattern2 = patterns[j];

      const series1 = timeSeriesMap.get(pattern1.pattern_text) || [];
      const series2 = timeSeriesMap.get(pattern2.pattern_text) || [];

      if (series1.length < 3 || series2.length < 3) {
        continue;
      }

      // Align series to same length
      const minLength = Math.min(series1.length, series2.length);
      const aligned1 = series1.slice(-minLength);
      const aligned2 = series2.slice(-minLength);

      // Calculate correlation
      const result = calculatePearsonCorrelation(aligned1, aligned2);

      if (result && !isNaN(result.coefficient)) {
        // Estimate co-occurrence based on temporal overlap
        const coOccurrenceCount = estimateCoOccurrence(pattern1, pattern2);

        if (coOccurrenceCount >= minCoOccurrence) {
          correlations.push({
            pattern1: pattern1.pattern_text,
            pattern2: pattern2.pattern_text,
            correlation: result.coefficient,
            pValue: result.pValue,
            significance: result.significance,
            coOccurrenceCount
          });
        }
      }
    }
  }

  // Sort by correlation strength
  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

/**
 * Create time series for a pattern
 * @param pattern - Merged pattern
 * @param periodDays - Period in days
 * @returns Time series array
 */
function createTimeSeries(pattern: MergedPattern, periodDays: number): number[] {
  // Guard: Validate pattern
  if (!pattern || !pattern.first_seen || !pattern.last_seen || typeof pattern.total_frequency !== 'number') {
    return [];
  }

  const series: number[] = [];
  const startDate = new Date(pattern.first_seen);
  const endDate = new Date(pattern.last_seen);

  // Guard: Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return [];
  }

  // Guard: Validate periodDays
  const validatedPeriodDays = Math.max(1, periodDays);

  let currentDate = new Date(startDate);
  const MAX_ITERATIONS = 1000;
  let iterations = 0;

  while (currentDate <= endDate && iterations < MAX_ITERATIONS) {
    iterations++;

    // Simplified: distribute frequency evenly across periods
    const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

    // Guard: Prevent division by zero and infinite values
    const safeTotalDays = Math.max(totalDays, 1);
    const value = (pattern.total_frequency * validatedPeriodDays) / safeTotalDays;

    // Guard: Validate value
    series.push(Number.isFinite(value) ? Math.max(0, value) : 0);

    currentDate.setDate(currentDate.getDate() + validatedPeriodDays);
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn('createTimeSeries: Max iterations reached');
  }

  return series;
}

/**
 * Estimate co-occurrence count for two patterns
 * @param pattern1 - First pattern
 * @param pattern2 - Second pattern
 * @returns Estimated co-occurrence count
 */
function estimateCoOccurrence(pattern1: MergedPattern, pattern2: MergedPattern): number {
  // Guard: Validate patterns
  if (!pattern1 || !pattern2 || !pattern1.first_seen || !pattern1.last_seen ||
      !pattern2.first_seen || !pattern2.last_seen) {
    return 0;
  }

  const start1 = new Date(pattern1.first_seen).getTime();
  const end1 = new Date(pattern1.last_seen).getTime();
  const start2 = new Date(pattern2.first_seen).getTime();
  const end2 = new Date(pattern2.last_seen).getTime();

  // Guard: Validate timestamps
  if (!Number.isFinite(start1) || !Number.isFinite(end1) ||
      !Number.isFinite(start2) || !Number.isFinite(end2)) {
    return 0;
  }

  // Calculate overlap
  const overlapStart = Math.max(start1, start2);
  const overlapEnd = Math.min(end1, end2);

  if (overlapEnd < overlapStart) {
    return 0; // No temporal overlap
  }

  const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);

  // Guard: Validate overlapDays
  if (!Number.isFinite(overlapDays) || overlapDays <= 0) {
    return 0;
  }

  // Estimate co-occurrence based on overlap and frequency
  const totalDays1 = (end1 - start1) / (1000 * 60 * 60 * 24);
  const totalDays2 = (end2 - start2) / (1000 * 60 * 60 * 24);

  // Guard: Validate total days and frequencies
  const safeTotalDays1 = Math.max(totalDays1, 1);
  const safeTotalDays2 = Math.max(totalDays2, 1);
  const freq1 = typeof pattern1.total_frequency === 'number' && Number.isFinite(pattern1.total_frequency) ? pattern1.total_frequency : 0;
  const freq2 = typeof pattern2.total_frequency === 'number' && Number.isFinite(pattern2.total_frequency) ? pattern2.total_frequency : 0;

  const density1 = freq1 / safeTotalDays1;
  const density2 = freq2 / safeTotalDays2;

  const minDensity = Math.min(density1, density2);

  // Guard: Prevent overflow and ensure finite result
  const result = minDensity * overlapDays;
  return Number.isFinite(result) && result > 0 ? Math.min(Math.round(result), 1000000) : 0;
}

/**
 * Perform pattern clustering based on correlations
 * @param patterns - Array of merged patterns
 * @param correlations - Pattern correlations
 * @returns Array of pattern clusters
 */
function performPatternClustering(
  patterns: MergedPattern[],
  correlations: PatternCorrelation[]
): PatternCluster[] {
  // Build adjacency matrix for clustering
  const patternSet = new Set(patterns.map(p => p.pattern_text));
  const adjacency = new Map<string, Set<string>>();

  patternSet.forEach(pattern => {
    adjacency.set(pattern, new Set());
  });

  // Add edges for strong/moderate correlations
  correlations
    .filter(c => c.significance === 'strong' || c.significance === 'moderate')
    .forEach(c => {
      adjacency.get(c.pattern1)?.add(c.pattern2);
      adjacency.get(c.pattern2)?.add(c.pattern1);
    });

  // Find connected components (clusters)
  const visited = new Set<string>();
  const clusters: PatternCluster[] = [];

  patternSet.forEach(pattern => {
    if (!visited.has(pattern)) {
      const clusterPatterns = findConnectedComponent(pattern, adjacency, visited);

      if (clusterPatterns.length >= 2) {
        // Calculate cluster similarity
        const clusterCorrelations = correlations.filter(c =>
          clusterPatterns.includes(c.pattern1) && clusterPatterns.includes(c.pattern2)
        );
        const avgCorrelation = clusterCorrelations.length > 0
          ? clusterCorrelations.reduce((sum, c) => sum + Math.abs(c.correlation), 0) / clusterCorrelations.length
          : 0;

        // Find dominant category
        const patternData = patterns.filter(p => clusterPatterns.includes(p.pattern_text));
        const categoryCounts = new Map<string, number>();
        patternData.forEach(p => {
          categoryCounts.set(p.category, (categoryCounts.get(p.category) || 0) + 1);
        });
        const dominantCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';

        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          patterns: clusterPatterns,
          similarity: Math.round(avgCorrelation * 1000) / 1000,
          dominantCategory,
          description: `Cluster of ${clusterPatterns.length} related ${dominantCategory} patterns (avg correlation: ${avgCorrelation.toFixed(2)})`
        });
      }
    }
  });

  return clusters.sort((a, b) => b.patterns.length - a.patterns.length);
}

/**
 * Find connected component in graph
 * @param start - Starting node
 * @param adjacency - Adjacency map
 * @param visited - Visited set
 * @returns Array of nodes in component
 */
function findConnectedComponent(
  start: string,
  adjacency: Map<string, Set<string>>,
  visited: Set<string>
): string[] {
  const component: string[] = [];
  const queue = [start];
  const MAX_ITERATIONS = 10000;
  let iterations = 0;

  while (queue.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = queue.shift()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    component.push(current);

    const neighbors = adjacency.get(current) || new Set();
    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    });
  }

  if (iterations >= MAX_ITERATIONS) {
    console.warn(`findConnectedComponent exceeded max iterations for start: ${start}`);
  }

  return component;
}

/**
 * Detect pattern chains (A triggers B)
 * @param patterns - Array of merged patterns
 * @param correlations - Pattern correlations
 * @returns Array of pattern chains
 */
function detectPatternChains(
  patterns: MergedPattern[],
  correlations: PatternCorrelation[]
): PatternChain[] {
  const chains: PatternChain[] = [];

  // Look for patterns where one consistently appears before another
  correlations
    .filter(c => c.significance === 'strong' && c.coOccurrenceCount >= 3)
    .forEach(correlation => {
      const pattern1 = patterns.find(p => p.pattern_text === correlation.pattern1);
      const pattern2 = patterns.find(p => p.pattern_text === correlation.pattern2);

      if (!pattern1 || !pattern2) {
        return;
      }

      // Check if pattern1 consistently appears before pattern2
      const avgTime1 = new Date(pattern1.first_seen).getTime();
      const avgTime2 = new Date(pattern2.first_seen).getTime();

      if (avgTime1 < avgTime2) {
        // pattern1 tends to appear before pattern2
        const confidence = Math.abs(correlation.correlation);
        const support = correlation.coOccurrenceCount;

        chains.push({
          triggerPattern: correlation.pattern1,
          triggeredPattern: correlation.pattern2,
          confidence,
          support,
          description: `"${correlation.pattern1.substring(0, 30)}..." tends to trigger "${correlation.pattern2.substring(0, 30)}..." (confidence: ${confidence.toFixed(2)}, support: ${support})`
        });
      }
    });

  return chains.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Calculate influence scores for patterns
 * @param patterns - Array of merged patterns
 * @param correlations - Pattern correlations
 * @returns Array of influence scores
 */
function calculateInfluenceScores(
  patterns: MergedPattern[],
  correlations: PatternCorrelation[]
): PatternInfluence[] {
  const influences = new Map<string, {
    influences: Set<string>;
    influencedBy: Set<string>;
    totalCorrelation: number;
  }>();

  // Initialize
  patterns.forEach(p => {
    influences.set(p.pattern_text, {
      influences: new Set(),
      influencedBy: new Set(),
      totalCorrelation: 0
    });
  });

  // Build influence graph
  correlations
    .filter(c => c.significance === 'strong' || c.significance === 'moderate')
    .forEach(c => {
      influences.get(c.pattern1)?.influences.add(c.pattern2);
      influences.get(c.pattern2)?.influencedBy.add(c.pattern1);

      // Add to total correlation (both directions)
      influences.get(c.pattern1)!.totalCorrelation += Math.abs(c.correlation);
      influences.get(c.pattern2)!.totalCorrelation += Math.abs(c.correlation);
    });

  // Calculate scores
  return patterns.map(pattern => {
    const data = influences.get(pattern.pattern_text)!;
    const influencesCount = data.influences.size;
    const influencedByCount = data.influencedBy.size;
    const totalConnections = influencesCount + influencedByCount;

    // Influence score: combination of connections and correlation strength
    const maxCorrelation = patterns.length * 2; // Maximum possible total correlation
    const influenceScore = maxCorrelation > 0
      ? Math.min(data.totalCorrelation / maxCorrelation, 1)
      : 0;

    let description = 'Low influence';
    if (influenceScore >= 0.7) {
      description = 'High influence - affects many patterns';
    } else if (influenceScore >= 0.4) {
      description = 'Moderate influence - affects some patterns';
    }

    return {
      pattern: pattern.pattern_text,
      influenceScore: Math.round(influenceScore * 1000) / 1000,
      influencesCount,
      influencedByCount,
      description
    };
  })
  .sort((a, b) => b.influenceScore - a.influenceScore);
}

/**
 * Export correlation matrix for visualization
 * @param correlations - Pattern correlations
 * @param patterns - All patterns
 * @returns Correlation matrix
 */
export function exportCorrelationMatrix(
  correlations: PatternCorrelation[],
  patterns: MergedPattern[]
): {
  labels: string[];
  matrix: number[][];
} {
  const patternNames = patterns.map(p => p.pattern_text);
  const matrix: number[][] = [];

  // Initialize matrix with zeros
  patternNames.forEach(() => {
    matrix.push(new Array(patternNames.length).fill(0));
  });

  // Fill matrix with correlations
  correlations.forEach(c => {
    const i = patternNames.indexOf(c.pattern1);
    const j = patternNames.indexOf(c.pattern2);

    if (i >= 0 && j >= 0) {
      matrix[i][j] = c.correlation;
      matrix[j][i] = c.correlation; // Symmetric
    }
  });

  return {
    labels: patternNames.map(n => n.substring(0, 20)),
    matrix
  };
}

/**
 * Get correlation summary statistics
 * @param result - Correlation analysis result
 * @returns Summary statistics
 */
export function getCorrelationSummaryStatistics(result: CorrelationAnalysisResult): {
  totalCorrelations: number;
  strongCorrelationCount: number;
  moderateCorrelationCount: number;
  clusterCount: number;
  chainCount: number;
  topInfluencerPatterns: string[];
} {
  const topInfluencers = result.influences
    .slice(0, 5)
    .map(i => i.pattern.substring(0, 30));

  return {
    totalCorrelations: result.correlations.length,
    strongCorrelationCount: result.strongCorrelations.length,
    moderateCorrelationCount: result.moderateCorrelations.length,
    clusterCount: result.clusters.length,
    chainCount: result.chains.length,
    topInfluencerPatterns: topInfluencers
  };
}
