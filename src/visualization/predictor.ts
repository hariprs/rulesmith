/**
 * Pattern Prediction Module
 * Story 3-6: Add Trend Analysis and Predictions (AC2)
 *
 * Implements forecasting models for pattern prediction:
 * - Linear regression
 * - Moving average
 * - Exponential smoothing
 * - Auto-selection based on data characteristics
 * - Confidence intervals and backtesting
 */

import { DataPoint, calculateLinearRegression, calculateMovingAverage, calculateExponentialSmoothing, calculateMAE, calculateRMSE, calculateMAPE } from './statistics.js';
import { MergedPattern } from '../state-management.js';
import { extractTimeSeriesData, TimeWindow, TimeGranularity, getGranularityPeriod } from './trend-analyzer.js';

/**
 * Prediction model type
 */
export type PredictionModel = 'linear' | 'moving-avg' | 'exponential' | 'auto';

/**
 * Prediction horizon in days
 */
export type PredictionHorizon = 7 | 14 | 30 | 60 | 90;

/**
 * Prediction result for a single time point
 */
export interface PredictionPoint {
  timestamp: Date;
  predictedValue: number;
  confidenceLower: number;
  confidenceUpper: number;
}

/**
 * Pattern prediction result
 */
export interface PatternPrediction {
  patternId: string;
  patternText: string;
  model: PredictionModel;
  predictions: PredictionPoint[];
  confidence: number; // Overall confidence 0-1
  accuracy?: {
    mae: number;
    rmse: number;
    mape: number;
  };
  willEmerge: boolean;
  willDisappear: boolean;
  summary: string;
}

/**
 * Prediction options
 */
export interface PredictionOptions {
  model?: PredictionModel;
  horizon?: PredictionHorizon;
  window?: TimeWindow;
  granularity?: TimeGranularity;
  minDataPoints?: number;
  confidenceLevel?: number; // 0-1, default 0.95
  backtestRatio?: number; // Ratio of data to use for backtesting (0-1)
}

/**
 * Generate predictions for multiple patterns
 * @param patterns - Array of merged patterns
 * @param options - Prediction options
 * @returns Array of pattern predictions
 */
export function predictPatterns(
  patterns: MergedPattern[],
  options: PredictionOptions = {}
): PatternPrediction[] {
  // Guard: Validate input
  if (!Array.isArray(patterns)) {
    console.warn('predictPatterns: Invalid patterns input, returning empty array');
    return [];
  }

  const {
    model = 'auto',
    horizon = 30,
    window = '30d',
    granularity = 'weekly',
    minDataPoints = 3,
    confidenceLevel = 0.95,
    backtestRatio = 0.2
  } = options;

  // Guard: Validate and clamp options
  const validatedHorizon = Math.max(7, Math.min(90, horizon || 30)) as PredictionHorizon;
  const validatedMinDataPoints = Math.max(2, Math.min(100, minDataPoints || 3));
  const validatedConfidenceLevel = Math.max(0, Math.min(1, confidenceLevel || 0.95));
  const validatedBacktestRatio = Math.max(0.05, Math.min(0.5, backtestRatio || 0.2));

  return patterns
    .filter(pattern => pattern && typeof pattern.total_frequency === 'number' && pattern.total_frequency >= validatedMinDataPoints)
    .map(pattern => {
      const dataPoints = extractTimeSeriesData(pattern, window, granularity);

      if (dataPoints.length < minDataPoints) {
        return createEmptyPrediction(pattern);
      }

      return predictPattern(pattern, dataPoints, {
        model,
        horizon: validatedHorizon,
        granularity,
        confidenceLevel: validatedConfidenceLevel,
        backtestRatio: validatedBacktestRatio
      });
    })
    .filter(prediction => prediction.predictions.length > 0);
}

/**
 * Generate prediction for a single pattern
 * @param pattern - Merged pattern
 * @param dataPoints - Historical time series data
 * @param options - Prediction options
 * @returns Pattern prediction
 */
function predictPattern(
  pattern: MergedPattern,
  dataPoints: DataPoint[],
  options: Omit<PredictionOptions, 'window' | 'minDataPoints'>
): PatternPrediction {
  const {
    model = 'auto',
    horizon = 30,
    granularity = 'weekly',
    confidenceLevel = 0.95,
    backtestRatio = 0.2
  } = options;

  // Auto-select model if needed
  const selectedModel = model === 'auto' ? selectBestModel(dataPoints) : model;

  // Split data for backtesting
  const backtestSize = Math.max(1, Math.floor(dataPoints.length * backtestRatio));
  const trainingData = dataPoints.slice(0, dataPoints.length - backtestSize);
  const testData = dataPoints.slice(-backtestSize);

  // Generate predictions
  const predictions = generatePredictions(
    trainingData,
    selectedModel,
    horizon,
    granularity,
    confidenceLevel
  );

  // Calculate accuracy metrics
  let accuracy;
  if (testData.length > 0) {
    accuracy = calculateAccuracy(testData, trainingData, selectedModel, granularity);
  }

  // Calculate overall confidence
  const confidence = calculatePredictionConfidence(
    trainingData,
    predictions,
    accuracy
  );

  // Determine if pattern will emerge or disappear
  const lastValue = dataPoints[dataPoints.length - 1].value;
  const finalPrediction = predictions[predictions.length - 1];

  // Guard: Validate lastValue and finalPrediction
  const validatedLastValue = Number.isFinite(lastValue) ? lastValue : 0;

  if (!finalPrediction || !Number.isFinite(finalPrediction.predictedValue)) {
    return {
      patternId: pattern.pattern_text || 'unknown',
      patternText: pattern.pattern_text || 'unknown',
      model: selectedModel,
      predictions,
      confidence,
      accuracy,
      willEmerge: false,
      willDisappear: false,
      summary: 'Insufficient data for prediction'
    };
  }

  // Guard: Prevent division by zero or infinite values
  const safeLastValue = validatedLastValue > 0 ? validatedLastValue : 0.001;
  const willEmerge = finalPrediction.predictedValue > safeLastValue * 1.5;
  const willDisappear = finalPrediction.predictedValue < safeLastValue * 0.5;

  // Generate summary
  const summary = generatePredictionSummary(
    selectedModel,
    predictions.length,
    confidence,
    accuracy,
    willEmerge,
    willDisappear
  );

  return {
    patternId: pattern.pattern_text,
    patternText: pattern.pattern_text,
    model: selectedModel,
    predictions,
    confidence,
    accuracy,
    willEmerge,
    willDisappear,
    summary
  };
}

/**
 * Generate prediction points
 * @param trainingData - Historical data points
 * @param model - Prediction model
 * @param horizon - Prediction horizon in days
 * @param granularity - Time granularity
 * @param confidenceLevel - Confidence level for intervals
 * @returns Array of prediction points
 */
function generatePredictions(
  trainingData: DataPoint[],
  model: PredictionModel,
  horizon: number,
  granularity: TimeGranularity,
  confidenceLevel: number
): PredictionPoint[] {
  const predictions: PredictionPoint[] = [];

  let predictionFn: (period: number) => number;
  let confidenceFn: (period: number) => { lower: number; upper: number };

  switch (model) {
    case 'linear': {
      const regression = calculateLinearRegression(trainingData);
      if (!regression || trainingData.length === 0) {
        return [];
      }
      const baseTimestamp = trainingData[0].timestamp.getTime();
      predictionFn = (period) => regression.predict(baseTimestamp + period * getGranularityPeriod(granularity) * 24 * 60 * 60 * 1000);
      const errorMargin = calculateErrorMargin(trainingData, regression, confidenceLevel);
      confidenceFn = () => ({ lower: errorMargin.lower, upper: errorMargin.upper });
      break;
    }
    case 'moving-avg': {
      const window = Math.min(3, trainingData.length);
      const ma = calculateMovingAverage(trainingData, window);
      const lastValue = ma[ma.length - 1] || trainingData[trainingData.length - 1].value;
      predictionFn = () => lastValue;
      const stdDev = calculateStandardDeviation(trainingData.map(d => d.value));
      const margin = stdDev * 1.96; // 95% confidence
      confidenceFn = () => ({ lower: margin, upper: margin });
      break;
    }
    case 'exponential': {
      const alpha = 0.3;
      const smoothed = calculateExponentialSmoothing(trainingData, alpha);
      const lastValue = smoothed[smoothed.length - 1];
      predictionFn = () => lastValue;
      const stdDev = calculateStandardDeviation(trainingData.map(d => d.value));
      const margin = stdDev * 1.96;
      confidenceFn = () => ({ lower: margin, upper: margin });
      break;
    }
    default:
      return [];
  }

  if (trainingData.length === 0) {
    return [];
  }
  const periodDays = getGranularityPeriod(granularity);
  const numPeriods = Math.ceil(horizon / periodDays);
  const lastTimestamp = trainingData[trainingData.length - 1].timestamp.getTime();

  for (let i = 1; i <= numPeriods; i++) {
    const timestamp = new Date(lastTimestamp + i * periodDays * 24 * 60 * 60 * 1000);

    // Guard: Validate timestamp
    if (isNaN(timestamp.getTime())) {
      console.warn('generatePredictions: Invalid timestamp generated');
      continue;
    }

    const predictedValue = Math.max(0, Number.isFinite(predictionFn(i)) ? predictionFn(i) : 0);
    const { lower, upper } = confidenceFn(i);

    // Guard: Validate confidence bounds
    const validatedLower = Number.isFinite(lower) ? Math.max(0, lower) : 0;
    const validatedUpper = Number.isFinite(upper) ? Math.max(0, upper) : 0;

    predictions.push({
      timestamp,
      predictedValue: Math.max(0, predictedValue),
      confidenceLower: Math.max(0, predictedValue - validatedLower),
      confidenceUpper: predictedValue + validatedUpper
    });
  }

  return predictions;
}

/**
 * Select best model based on data characteristics
 * @param dataPoints - Time series data
 * @returns Best model for the data
 */
function selectBestModel(dataPoints: DataPoint[]): PredictionModel {
  if (dataPoints.length < 3) {
    return 'moving-avg';
  }

  // Check if data has linear trend
  const regression = calculateLinearRegression(dataPoints);
  const hasTrend = regression && Math.abs(regression.slope) > 0.001;

  if (hasTrend && regression && regression.rSquared > 0.5) {
    return 'linear';
  }

  // Check if data is stable
  const values = dataPoints.map(d => d.value);
  const cv = calculateCoefficientOfVariation(values);

  if (cv < 0.3) {
    return 'moving-avg';
  }

  // Default to exponential smoothing for moderately volatile data
  return 'exponential';
}

/**
 * Calculate accuracy metrics using backtesting
 * @param testData - Test data points
 * @param trainingData - Training data points
 * @param model - Prediction model
 * @param granularity - Time granularity
 * @returns Accuracy metrics
 */
function calculateAccuracy(
  testData: DataPoint[],
  trainingData: DataPoint[],
  model: PredictionModel,
  granularity: TimeGranularity
): { mae: number; rmse: number; mape: number } {
  const predictions: number[] = [];

  for (let i = 0; i < testData.length; i++) {
    const extendedTraining = [...trainingData, ...testData.slice(0, i)];
    const forecast = generatePredictions(extendedTraining, model, 1, granularity, 0.95);

    if (forecast.length > 0 && Number.isFinite(forecast[0].predictedValue)) {
      predictions.push(forecast[0].predictedValue);
    } else if (extendedTraining.length > 0) {
      predictions.push(extendedTraining[extendedTraining.length - 1].value);
    } else {
      predictions.push(0);
    }
  }

  const actual = testData.map(d => d.value);

  return {
    mae: calculateMAE(actual, predictions),
    rmse: calculateRMSE(actual, predictions),
    mape: calculateMAPE(actual, predictions)
  };
}

/**
 * Calculate prediction confidence
 * @param trainingData - Training data points
 * @param predictions - Prediction points
 * @param accuracy - Accuracy metrics
 * @returns Confidence score (0-1)
 */
function calculatePredictionConfidence(
  trainingData: DataPoint[],
  predictions: PredictionPoint[],
  accuracy?: { mae: number; rmse: number; mape: number }
): number {
  let confidence = 0.5; // Base confidence

  // More data points = higher confidence
  const dataPointFactor = Math.min(trainingData.length / 10, 1);
  confidence += dataPointFactor * 0.2;

  // Accuracy based confidence
  if (accuracy) {
    // Lower MAPE = higher confidence
    const mapeFactor = Math.max(0, 1 - accuracy.mape / 100);
    confidence += mapeFactor * 0.3;
  }

  return Math.min(Math.max(confidence, 0), 1);
}

/**
 * Calculate error margin for confidence intervals
 * @param dataPoints - Data points
 * @param regression - Linear regression result
 * @param confidenceLevel - Confidence level
 * @returns Error margin { lower, upper }
 */
function calculateErrorMargin(
  dataPoints: DataPoint[],
  regression: ReturnType<typeof calculateLinearRegression>,
  confidenceLevel: number
): { lower: number; upper: number } {
  if (!regression) {
    return { lower: 0, upper: 0 };
  }

  // Calculate standard error of estimate
  const residuals = dataPoints.map(d => {
    const predicted = regression.predict(d.timestamp.getTime());
    return d.value - predicted;
  });

  const stdError = Math.sqrt(
    residuals.reduce((sum, r) => sum + r * r, 0) / (dataPoints.length - 2)
  );

  // Calculate t-score for confidence level
  const degreesOfFreedom = Math.max(dataPoints.length - 2, 1);
  const tScore = getTScore(confidenceLevel, degreesOfFreedom);

  const margin = stdError * tScore;

  return { lower: margin, upper: margin };
}

/**
 * Get t-score for confidence level
 * @param confidenceLevel - Confidence level (0-1)
 * @param degreesOfFreedom - Degrees of freedom
 * @returns T-score
 */
function getTScore(confidenceLevel: number, degreesOfFreedom: number): number {
  // Simplified t-score values for common confidence levels
  if (confidenceLevel >= 0.99) return 2.576;
  if (confidenceLevel >= 0.95) return 1.96;
  if (confidenceLevel >= 0.90) return 1.645;
  return 1.0;
}

/**
 * Calculate standard deviation
 * @param values - Array of numbers
 * @returns Standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length < 2) return 0;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (values.length - 1);

  return Math.sqrt(variance);
}

/**
 * Calculate coefficient of variation
 * @param values - Array of numbers
 * @returns Coefficient of variation
 */
function calculateCoefficientOfVariation(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);

  if (mean === 0) return 0;
  return stdDev / Math.abs(mean);
}

/**
 * Generate prediction summary
 * @param model - Prediction model used
 * @param numPredictions - Number of predictions generated
 * @param confidence - Confidence score
 * @param accuracy - Accuracy metrics
 * @param willEmerge - Whether pattern will emerge
 * @param willDisappear - Whether pattern will disappear
 * @returns Summary string
 */
function generatePredictionSummary(
  model: PredictionModel,
  numPredictions: number,
  confidence: number,
  accuracy?: { mae: number; rmse: number; mape: number },
  willEmerge?: boolean,
  willDisappear?: boolean
): string {
  const confidencePercent = Math.round(confidence * 100);
  const parts = [`Model: ${model}`, `Confidence: ${confidencePercent}%`];

  if (accuracy) {
    parts.push(`MAE: ${accuracy.mae.toFixed(2)}, MAPE: ${accuracy.mape.toFixed(1)}%`);
  }

  if (willEmerge) {
    parts.push('⚠️ Pattern likely to EMERGE');
  } else if (willDisappear) {
    parts.push('⚠️ Pattern likely to DISAPPEAR');
  }

  return parts.join(', ');
}

/**
 * Create empty prediction for insufficient data
 * @param pattern - Merged pattern
 * @returns Empty prediction
 */
function createEmptyPrediction(pattern: MergedPattern): PatternPrediction {
  return {
    patternId: pattern.pattern_text,
    patternText: pattern.pattern_text,
    model: 'linear',
    predictions: [],
    confidence: 0,
    willEmerge: false,
    willDisappear: false,
    summary: 'Insufficient data for prediction'
  };
}

/**
 * Export prediction data for visualization
 * @param prediction - Pattern prediction
 * @returns Chart.js compatible data structure
 */
export function exportPredictionForChart(prediction: PatternPrediction): {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    borderDash?: number[];
  }[];
} {
  const labels = prediction.predictions.map(p =>
    p.timestamp.toISOString().split('T')[0]
  );
  const values = prediction.predictions.map(p => p.predictedValue);
  const lowerBounds = prediction.predictions.map(p => p.confidenceLower);
  const upperBounds = prediction.predictions.map(p => p.confidenceUpper);

  return {
    labels,
    datasets: [
      {
        label: 'Prediction',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: '#3b82f6'
      },
      {
        label: 'Lower Bound',
        data: lowerBounds,
        borderColor: '#93c5fd',
        backgroundColor: 'transparent',
        borderDash: [5, 5]
      },
      {
        label: 'Upper Bound',
        data: upperBounds,
        borderColor: '#93c5fd',
        backgroundColor: 'transparent',
        borderDash: [5, 5]
      }
    ]
  };
}
