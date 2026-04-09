/**
 * Anomaly Detection Module
 * Story 3-6: Add Trend Analysis and Predictions (AC4)
 *
 * Detects anomalies in pattern evolution:
 * - Sudden frequency spikes
 * - Unexpected pattern disappearances
 * - Statistical outlier detection
 * - Anomaly scoring and severity levels
 * - Contextual explanations
 */

import { detectOutliersZScore, detectOutliersIQR, DataPoint } from './statistics.js';
import { MergedPattern } from '../state-management.js';
import { extractTimeSeriesData, TimeWindow, TimeGranularity } from './trend-analyzer.js';

/**
 * Anomaly sensitivity level
 */
export type AnomalySensitivity = 'low' | 'medium' | 'high';

/**
 * Anomaly severity level
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Anomaly type
 */
export type AnomalyType = 'spike' | 'drop' | 'disappearance' | 'unexpected-appearance';

/**
 * Pattern anomaly result
 */
export interface PatternAnomaly {
  patternId: string;
  patternText: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1
  timestamp: Date;
  expectedValue: number;
  actualValue: number;
  deviation: number;
  explanation: string;
  recommendedAction: string;
  isTemporary: boolean;
}

/**
 * Anomaly detection options
 */
export interface AnomalyDetectionOptions {
  sensitivity?: AnomalySensitivity;
  window?: TimeWindow;
  granularity?: TimeGranularity;
  minDataPoints?: number;
  detectSpikes?: boolean;
  detectDisappearances?: boolean;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetectionResult {
  anomalies: PatternAnomaly[];
  criticalAnomalies: PatternAnomaly[];
  highSeverityAnomalies: PatternAnomaly[];
  mediumSeverityAnomalies: PatternAnomaly[];
  lowSeverityAnomalies: PatternAnomaly[];
  totalPatterns: number;
  anomalyRate: number; // Percentage of patterns with anomalies
  detectionDate: Date;
}

/**
 * Detect anomalies in pattern evolution
 * @param patterns - Array of merged patterns
 * @param options - Detection options
 * @returns Anomaly detection result
 */
export function detectAnomalies(
  patterns: MergedPattern[],
  options: AnomalyDetectionOptions = {}
): AnomalyDetectionResult {
  // Guard: Validate input
  if (!Array.isArray(patterns)) {
    console.warn('detectAnomalies: Invalid patterns input, returning empty result');
    return {
      anomalies: [],
      criticalAnomalies: [],
      highSeverityAnomalies: [],
      mediumSeverityAnomalies: [],
      lowSeverityAnomalies: [],
      totalPatterns: 0,
      anomalyRate: 0,
      detectionDate: new Date()
    };
  }

  const {
    sensitivity = 'medium',
    window = '30d',
    granularity = 'weekly',
    minDataPoints = 3,
    detectSpikes = true,
    detectDisappearances = true
  } = options;

  // Guard: Validate and clamp minDataPoints
  const validatedMinDataPoints = Math.max(2, Math.min(100, minDataPoints || 3));

  const anomalies: PatternAnomaly[] = [];

  patterns.forEach(pattern => {
    // Guard: Validate pattern
    if (!pattern || typeof pattern.total_frequency !== 'number' || pattern.total_frequency < validatedMinDataPoints) {
      return;
    }

    const dataPoints = extractTimeSeriesData(pattern, window, granularity);

    if (detectSpikes) {
      const spikeAnomalies = detectSpikeAnomalies(pattern, dataPoints, sensitivity);
      anomalies.push(...spikeAnomalies);
    }

    if (detectDisappearances) {
      const disappearanceAnomalies = detectDisappearanceAnomalies(pattern, dataPoints, sensitivity);
      anomalies.push(...disappearanceAnomalies);
    }
  });

  // Categorize by severity
  const criticalAnomalies = anomalies.filter(a => a.severity === 'critical');
  const highSeverityAnomalies = anomalies.filter(a => a.severity === 'high');
  const mediumSeverityAnomalies = anomalies.filter(a => a.severity === 'medium');
  const lowSeverityAnomalies = anomalies.filter(a => a.severity === 'low');

  // Calculate anomaly rate
  const patternsWithAnomalies = new Set(anomalies.map(a => a.patternId)).size;
  const anomalyRate = patterns.length > 0
    ? (patternsWithAnomalies / patterns.length) * 100
    : 0;

  return {
    anomalies,
    criticalAnomalies,
    highSeverityAnomalies,
    mediumSeverityAnomalies,
    lowSeverityAnomalies,
    totalPatterns: patterns.length,
    anomalyRate: Math.round(anomalyRate * 10) / 10,
    detectionDate: new Date()
  };
}

/**
 * Detect spike anomalies (sudden frequency increases)
 * @param pattern - Merged pattern
 * @param dataPoints - Time series data
 * @param sensitivity - Sensitivity level
 * @returns Array of spike anomalies
 */
function detectSpikeAnomalies(
  pattern: MergedPattern,
  dataPoints: DataPoint[],
  sensitivity: AnomalySensitivity
): PatternAnomaly[] {
  const anomalies: PatternAnomaly[] = [];

  if (dataPoints.length < 3) {
    return anomalies;
  }

  const values = dataPoints.map(d => d.value);
  const outlierResults = detectOutliersZScore(values, getSensitivityThreshold(sensitivity));

  outlierResults.forEach((result, index) => {
    if (result.isOutlier && result.score > 0) {
      const dataPoint = dataPoints[index];
      const isSpike = index > 0 && dataPoint.value > dataPoints[index - 1].value;

      if (isSpike) {
        // Calculate expected value (average of previous points)
        const previousValues = values.slice(0, index);
        const expectedValue = previousValues.length > 0
          ? previousValues.reduce((a, b) => a + b, 0) / previousValues.length
          : dataPoint.value;

        const severity = calculateSeverity(result.score, sensitivity);
        const deviation = Math.abs(dataPoint.value - expectedValue);

        // Guard: Prevent division by zero in deviationPercent
        const safeExpectedValue = Math.abs(expectedValue) > 0.0001 ? expectedValue : 0.0001;
        const deviationPercent = (deviation / safeExpectedValue) * 100;

        anomalies.push({
          patternId: pattern.pattern_text,
          patternText: pattern.pattern_text,
          type: 'spike',
          severity,
          score: Math.min(result.score / getSensitivityThreshold(sensitivity), 1),
          timestamp: dataPoint.timestamp,
          expectedValue,
          actualValue: dataPoint.value,
          deviation,
          explanation: generateSpikeExplanation(dataPoint.value, expectedValue, deviationPercent),
          recommendedAction: generateSpikeRecommendation(deviationPercent),
          isTemporary: deviationPercent < 100 // Spikes under 100% increase are likely temporary
        });
      }
    }
  });

  return anomalies;
}

/**
 * Detect disappearance anomalies
 * @param pattern - Merged pattern
 * @param dataPoints - Time series data
 * @param sensitivity - Sensitivity level
 * @returns Array of disappearance anomalies
 */
function detectDisappearanceAnomalies(
  pattern: MergedPattern,
  dataPoints: DataPoint[],
  sensitivity: AnomalySensitivity
): PatternAnomaly[] {
  const anomalies: PatternAnomaly[] = [];

  if (dataPoints.length < 3) {
    return anomalies;
  }

  const values = dataPoints.map(d => d.value);
  const outlierResults = detectOutliersIQR(values, getSensitivityMultiplier(sensitivity));

  outlierResults.forEach((result, index) => {
    if (result.isOutlier && result.score > 0) {
      const dataPoint = dataPoints[index];
      const isDrop = index > 0 && dataPoint.value < dataPoints[index - 1].value;

      if (isDrop) {
        // Calculate expected value (average of previous points)
        const previousValues = values.slice(0, index);
        const expectedValue = previousValues.length > 0
          ? previousValues.reduce((a, b) => a + b, 0) / previousValues.length
          : dataPoint.value;

        const severity = calculateSeverity(result.score, sensitivity);
        const deviation = Math.abs(dataPoint.value - expectedValue);

        // Guard: Prevent division by zero in deviationPercent
        const safeExpectedValue = Math.abs(expectedValue) > 0.0001 ? expectedValue : 0.0001;
        const deviationPercent = (deviation / safeExpectedValue) * 100;

        // Check if pattern disappeared (value near zero)
        const isDisappearance = dataPoint.value < expectedValue * 0.2;

        anomalies.push({
          patternId: pattern.pattern_text,
          patternText: pattern.pattern_text,
          type: isDisappearance ? 'disappearance' : 'drop',
          severity,
          score: Math.min(result.score / getSensitivityMultiplier(sensitivity), 1),
          timestamp: dataPoint.timestamp,
          expectedValue,
          actualValue: dataPoint.value,
          deviation,
          explanation: generateDropExplanation(dataPoint.value, expectedValue, deviationPercent, isDisappearance),
          recommendedAction: generateDropRecommendation(deviationPercent, isDisappearance),
          isTemporary: deviationPercent < 50 // Drops under 50% are likely temporary
        });
      }
    }
  });

  return anomalies;
}

/**
 * Get sensitivity threshold for z-score
 * @param sensitivity - Sensitivity level
 * @returns Z-score threshold
 */
function getSensitivityThreshold(sensitivity: AnomalySensitivity): number {
  switch (sensitivity) {
    case 'low':
      return 4; // More conservative
    case 'medium':
      return 3; // Standard
    case 'high':
      return 2; // More sensitive
  }
}

/**
 * Get sensitivity multiplier for IQR
 * @param sensitivity - Sensitivity level
 * @returns IQR multiplier
 */
function getSensitivityMultiplier(sensitivity: AnomalySensitivity): number {
  switch (sensitivity) {
    case 'low':
      return 2.0; // More conservative
    case 'medium':
      return 1.5; // Standard
    case 'high':
      return 1.0; // More sensitive
  }
}

/**
 * Calculate severity from anomaly score
 * @param score - Anomaly score
 * @param sensitivity - Sensitivity level
 * @returns Severity level
 */
function calculateSeverity(score: number, sensitivity: AnomalySensitivity): AnomalySeverity {
  if (!Number.isFinite(score) || score < 0) {
    return 'low';
  }
  const threshold = getSensitivityThreshold(sensitivity);

  if (score >= threshold * 1.5) {
    return 'critical';
  } else if (score >= threshold * 1.2) {
    return 'high';
  } else if (score >= threshold) {
    return 'medium';
  } else {
    return 'low';
  }
}

/**
 * Generate spike explanation
 * @param actualValue - Actual value
 * @param expectedValue - Expected value
 * @param deviationPercent - Deviation percentage
 * @returns Explanation string
 */
function generateSpikeExplanation(
  actualValue: number,
  expectedValue: number,
  deviationPercent: number
): string {
  if (!Number.isFinite(actualValue) || !Number.isFinite(expectedValue)) {
    return 'Invalid data for spike analysis';
  }

  // Guard: Validate values are finite
  const safeActualValue = Number.isFinite(actualValue) ? actualValue : 0;
  const safeExpectedValue = Number.isFinite(expectedValue) ? expectedValue : 0;
  const increase = safeActualValue - safeExpectedValue;
  const percentStr = Number.isFinite(deviationPercent) && deviationPercent < 10000
    ? `+${deviationPercent.toFixed(0)}%`
    : 'extreme';

  return `Unusual frequency spike detected: ${safeActualValue.toFixed(1)} occurrences vs. expected ${safeExpectedValue.toFixed(1)} (${percentStr} increase, +${increase.toFixed(1)} occurrences)`;
}

/**
 * Generate drop explanation
 * @param actualValue - Actual value
 * @param expectedValue - Expected value
 * @param deviationPercent - Deviation percentage
 * @param isDisappearance - Whether it's a disappearance
 * @returns Explanation string
 */
function generateDropExplanation(
  actualValue: number,
  expectedValue: number,
  deviationPercent: number,
  isDisappearance: boolean
): string {
  // Guard: Validate values
  const safeActualValue = Number.isFinite(actualValue) ? actualValue : 0;
  const safeExpectedValue = Number.isFinite(expectedValue) ? expectedValue : 0;
  const decrease = safeExpectedValue - safeActualValue;

  // Guard: Prevent infinite percentage
  const safeDeviationPercent = Number.isFinite(deviationPercent) && deviationPercent < 10000
    ? deviationPercent
    : 9999;

  if (isDisappearance) {
    return `Pattern disappearance detected: ${safeActualValue.toFixed(1)} occurrences vs. expected ${safeExpectedValue.toFixed(1)} (-${safeDeviationPercent.toFixed(0)}% decrease, -${decrease.toFixed(1)} occurrences). Pattern may have been resolved or is no longer relevant.`;
  }

  return `Unusual frequency drop detected: ${safeActualValue.toFixed(1)} occurrences vs. expected ${safeExpectedValue.toFixed(1)} (-${safeDeviationPercent.toFixed(0)}% decrease, -${decrease.toFixed(1)} occurrences)`;
}

/**
 * Generate spike recommendation
 * @param deviationPercent - Deviation percentage
 * @returns Recommended action
 */
function generateSpikeRecommendation(deviationPercent: number): string {
  if (deviationPercent >= 200) {
    return 'Investigate immediately - extreme spike may indicate systemic issue or data quality problem';
  } else if (deviationPercent >= 100) {
    return 'Review pattern occurrence context - verify if spike is legitimate or anomalous';
  } else if (deviationPercent >= 50) {
    return 'Monitor trend - spike may be temporary or indicate emerging pattern';
  } else {
    return 'Normal variation - no action required';
  }
}

/**
 * Generate drop recommendation
 * @param deviationPercent - Deviation percentage
 * @param isDisappearance - Whether it's a disappearance
 * @returns Recommended action
 */
function generateDropRecommendation(deviationPercent: number, isDisappearance: boolean): string {
  if (isDisappearance) {
    return 'Pattern has disappeared - this may indicate successful resolution or rule effectiveness. Verify if pattern is genuinely fixed.';
  } else if (deviationPercent >= 75) {
    return 'Investigate pattern disappearance - verify if this is expected (e.g., resolved issue) or requires attention';
  } else if (deviationPercent >= 50) {
    return 'Monitor pattern trend - significant decrease may indicate improvement or data quality issue';
  } else if (deviationPercent >= 25) {
    return 'Observe trend - moderate decrease may be normal variation';
  } else {
    return 'Normal variation - no action required';
  }
}

/**
 * Export anomaly data for visualization
 * @param anomalies - Pattern anomalies
 * @returns Chart.js compatible data structure
 */
export function exportAnomaliesForChart(anomalies: PatternAnomaly[]): {
  labels: string[];
  datasets: {
    label: string;
    data: { x: string; y: number }[];
    backgroundColor: string;
    borderColor: string;
  }[];
} {
  // Group by severity
  const critical = anomalies.filter(a => a.severity === 'critical');
  const high = anomalies.filter(a => a.severity === 'high');
  const medium = anomalies.filter(a => a.severity === 'medium');
  const low = anomalies.filter(a => a.severity === 'low');

  return {
    labels: anomalies.map(a => a.timestamp.toISOString().split('T')[0]),
    datasets: [
      {
        label: 'Critical',
        data: critical.map(a => ({ x: a.timestamp.toISOString(), y: a.score })),
        backgroundColor: '#dc2626',
        borderColor: '#dc2626'
      },
      {
        label: 'High',
        data: high.map(a => ({ x: a.timestamp.toISOString(), y: a.score })),
        backgroundColor: '#f97316',
        borderColor: '#f97316'
      },
      {
        label: 'Medium',
        data: medium.map(a => ({ x: a.timestamp.toISOString(), y: a.score })),
        backgroundColor: '#eab308',
        borderColor: '#eab308'
      },
      {
        label: 'Low',
        data: low.map(a => ({ x: a.timestamp.toISOString(), y: a.score })),
        backgroundColor: '#22c55e',
        borderColor: '#22c55e'
      }
    ]
  };
}

/**
 * Get anomaly summary statistics
 * @param result - Anomaly detection result
 * @returns Summary statistics
 */
export function getAnomalySummaryStatistics(result: AnomalyDetectionResult): {
  totalAnomalies: number;
  criticalCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  anomalyRate: number;
  mostRecentAnomaly?: Date;
} {
  const mostRecentAnomaly = result.anomalies.length > 0
    ? new Date(Math.max(...result.anomalies.map(a => a.timestamp.getTime())))
    : undefined;

  return {
    totalAnomalies: result.anomalies.length,
    criticalCount: result.criticalAnomalies.length,
    highSeverityCount: result.highSeverityAnomalies.length,
    mediumSeverityCount: result.mediumSeverityAnomalies.length,
    lowSeverityCount: result.lowSeverityAnomalies.length,
    anomalyRate: result.anomalyRate,
    mostRecentAnomaly
  };
}
