/**
 * Statistical Functions for Trend Analysis and Predictions
 * Story 3-6: Add Trend Analysis and Predictions
 *
 * Provides core statistical functions for:
 * - Linear regression
 * - Moving averages
 * - Exponential smoothing
 * - Correlation coefficients (Pearson, Spearman)
 * - Outlier detection (z-score, IQR)
 */

/**
 * Point in time series data
 */
export interface DataPoint {
  timestamp: Date;
  value: number;
}

/**
 * Linear regression result
 */
export interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
}

/**
 * Correlation result
 */
export interface CorrelationResult {
  coefficient: number;
  pValue: number;
  significance: 'strong' | 'moderate' | 'weak' | 'none';
}

/**
 * Outlier detection result
 */
export interface OutlierResult {
  isOutlier: boolean;
  score: number;
  threshold: number;
  method: 'z-score' | 'iqr';
}

/**
 * Calculate linear regression for time series data
 * @param data - Array of data points with timestamp and value
 * @returns Linear regression result with slope, intercept, and prediction function
 */
export function calculateLinearRegression(data: DataPoint[]): LinearRegressionResult | null {
  if (data.length < 2) {
    return null;
  }

  const n = data.length;

  // Convert timestamps to numeric values (time in milliseconds)
  const xValues = data.map(d => d.timestamp.getTime());
  const yValues = data.map(d => d.value);

  // Calculate sums
  const sumX = xValues.reduce((a, b) => a + b, 0);
  const sumY = yValues.reduce((a, b) => a + b, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
  const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
  const sumY2 = yValues.reduce((sum, y) => sum + y * y, 0);

  // Calculate slope and intercept
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return null; // All x values are the same
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R-squared
  const yMean = sumY / n;
  const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = yValues.reduce((sum, y, i) => {
    const predicted = slope * xValues[i] + intercept;
    return sum + Math.pow(y - predicted, 2);
  }, 0);

  const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);

  return {
    slope,
    intercept,
    rSquared,
    predict: (x: number) => slope * x + intercept
  };
}

/**
 * Calculate simple moving average
 * @param data - Array of data points
 * @param window - Window size for moving average
 * @returns Array of moving averages
 */
export function calculateMovingAverage(data: DataPoint[], window: number): number[] {
  if (data.length < window || window < 1) {
    return [];
  }

  const result: number[] = [];

  for (let i = window - 1; i < data.length; i++) {
    const sum = data.slice(i - window + 1, i + 1)
      .reduce((acc, d) => acc + d.value, 0);
    result.push(sum / window);
  }

  return result;
}

/**
 * Calculate exponential smoothing
 * @param data - Array of data points
 * @param alpha - Smoothing factor (0-1)
 * @returns Array of smoothed values
 */
export function calculateExponentialSmoothing(data: DataPoint[], alpha: number): number[] {
  if (data.length === 0 || alpha < 0 || alpha > 1) {
    return [];
  }

  const result: number[] = [data[0].value];

  for (let i = 1; i < data.length; i++) {
    const smoothed = alpha * data[i].value + (1 - alpha) * result[i - 1];
    result.push(smoothed);
  }

  return result;
}

/**
 * Calculate Pearson correlation coefficient
 * @param x - First array of values
 * @param y - Second array of values
 * @returns Correlation result with coefficient and significance
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): CorrelationResult | null {
  // Guard: Validate input arrays
  if (!Array.isArray(x) || !Array.isArray(y) || x.length !== y.length || x.length < 2) {
    return null;
  }

  // Guard: Validate all values are finite
  const validX = x.filter(v => Number.isFinite(v));
  const validY = y.filter(v => Number.isFinite(v));

  if (validX.length < 2 || validY.length < 2) {
    return null;
  }

  const n = validX.length;

  // Calculate means
  const meanX = validX.reduce((a, b) => a + b, 0) / n;
  const meanY = validY.reduce((a, b) => a + b, 0) / n;

  // Calculate correlation coefficient
  let numerator = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = validX[i] - meanX;
    const dy = validY[i] - meanY;
    numerator += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  // Guard: Prevent overflow
  if (!Number.isFinite(numerator) || !Number.isFinite(sumX2) || !Number.isFinite(sumY2)) {
    return { coefficient: 0, pValue: 1, significance: 'none' };
  }

  const denominator = Math.sqrt(sumX2 * sumY2);

  if (denominator === 0 || !Number.isFinite(denominator)) {
    return { coefficient: 0, pValue: 1, significance: 'none' };
  }

  const coefficient = Math.max(-1, Math.min(1, numerator / denominator));

  // Calculate p-value (approximate for large samples)
  const denominator_t = 1 - coefficient * coefficient;
  const t = denominator_t !== 0
    ? coefficient * Math.sqrt((n - 2) / denominator_t)
    : 0;
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(t), Math.max(n - 2, 1)));

  // Determine significance
  let significance: 'strong' | 'moderate' | 'weak' | 'none';
  const absCoefficient = Math.abs(coefficient);
  if (absCoefficient >= 0.7) {
    significance = 'strong';
  } else if (absCoefficient >= 0.4) {
    significance = 'moderate';
  } else if (absCoefficient >= 0.2) {
    significance = 'weak';
  } else {
    significance = 'none';
  }

  return { coefficient, pValue, significance };
}

/**
 * Approximate cumulative distribution function for t-distribution
 * @param t - t-statistic value
 * @param df - degrees of freedom
 * @returns CDF value
 */
function tDistributionCDF(t: number, df: number): number {
  // Approximation using error function
  const a = df / (df + t * t);
  const b = 0.5 * t * Math.sqrt(a);

  // Approximate error function
  const erf = (x: number): number => {
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    const constants = [0.254829592, -0.284496736, 1.421413741, -1.453152027, 1.061405429];
    let sum = constants[0];
    for (let i = 1; i < constants.length; i++) {
      sum += constants[i] * Math.pow(x, i);
    }
    return sign * (1 - 1 / Math.pow(1 + sum * x, 16));
  };

  return 0.5 + 0.5 * erf(b / Math.sqrt(2));
}

/**
 * Detect outliers using z-score method
 * @param data - Array of numeric values
 * @param threshold - Z-score threshold (default: 3)
 * @returns Array of outlier results
 */
export function detectOutliersZScore(data: number[], threshold: number = 3): OutlierResult[] {
  // Guard: Validate input
  if (!Array.isArray(data)) {
    return [];
  }

  // Guard: Validate threshold
  const validatedThreshold = Number.isFinite(threshold) && threshold > 0 ? Math.min(threshold, 10) : 3;

  if (data.length < 3) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedThreshold,
      method: 'z-score' as const
    }));
  }

  // Filter out non-finite values
  const validData = data.filter(v => Number.isFinite(v));

  if (validData.length < 3) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedThreshold,
      method: 'z-score' as const
    }));
  }

  // Calculate mean and standard deviation
  const mean = validData.reduce((a, b) => a + b, 0) / validData.length;
  const variance = validData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validData.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0 || !Number.isFinite(stdDev)) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedThreshold,
      method: 'z-score' as const
    }));
  }

  return data.map(value => {
    // Guard: Handle non-finite values
    if (!Number.isFinite(value)) {
      return {
        isOutlier: false,
        score: 0,
        threshold: validatedThreshold,
        method: 'z-score' as const
      };
    }

    const zScore = Math.abs((value - mean) / stdDev);
    const clampedZScore = Math.min(zScore, 1000); // Prevent infinite values

    return {
      isOutlier: clampedZScore > validatedThreshold,
      score: clampedZScore,
      threshold: validatedThreshold,
      method: 'z-score' as const
    };
  });
}

/**
 * Detect outliers using IQR (Interquartile Range) method
 * @param data - Array of numeric values
 * @param multiplier - IQR multiplier (default: 1.5)
 * @returns Array of outlier results
 */
export function detectOutliersIQR(data: number[], multiplier: number = 1.5): OutlierResult[] {
  // Guard: Validate input
  if (!Array.isArray(data)) {
    return [];
  }

  // Guard: Validate multiplier
  const validatedMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? Math.min(multiplier, 5) : 1.5;

  if (data.length < 2) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedMultiplier,
      method: 'iqr' as const
    }));
  }

  // Filter and sort valid data
  const validData = data.filter(v => Number.isFinite(v)).sort((a, b) => a - b);

  if (validData.length < 2) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedMultiplier,
      method: 'iqr' as const
    }));
  }

  const q1 = percentile(validData, 25);
  const q3 = percentile(validData, 75);
  const iqr = q3 - q1;

  if (iqr === 0 || !Number.isFinite(iqr)) {
    return data.map(() => ({
      isOutlier: false,
      score: 0,
      threshold: validatedMultiplier,
      method: 'iqr' as const
    }));
  }

  const lowerBound = q1 - validatedMultiplier * iqr;
  const upperBound = q3 + validatedMultiplier * iqr;

  return data.map(value => {
    // Guard: Handle non-finite values
    if (!Number.isFinite(value)) {
      return {
        isOutlier: false,
        score: 0,
        threshold: validatedMultiplier,
        method: 'iqr' as const
      };
    }

    const isOutlier = value < lowerBound || value > upperBound;
    const distance = value < lowerBound
      ? lowerBound - value
      : Math.max(0, value - upperBound);
    const score = Math.min(distance / iqr, 1000); // Prevent infinite values

    return {
      isOutlier,
      score,
      threshold: validatedMultiplier,
      method: 'iqr' as const
    };
  });
}

/**
 * Calculate percentile of sorted array
 * @param sorted - Sorted array of numbers
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.min(Math.ceil(index), sorted.length - 1);
  const weight = index - lower;

  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Calculate mean absolute error (MAE)
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns MAE value
 */
export function calculateMAE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0;
  }

  const sumError = actual.reduce((sum, val, i) =>
    sum + Math.abs(val - predicted[i]), 0
  );

  return sumError / actual.length;
}

/**
 * Calculate root mean squared error (RMSE)
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns RMSE value
 */
export function calculateRMSE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0;
  }

  const sumSquaredError = actual.reduce((sum, val, i) =>
    sum + Math.pow(val - predicted[i], 2), 0
  );

  return Math.sqrt(sumSquaredError / actual.length);
}

/**
 * Calculate mean absolute percentage error (MAPE)
 * @param actual - Actual values
 * @param predicted - Predicted values
 * @returns MAPE value (as percentage)
 */
export function calculateMAPE(actual: number[], predicted: number[]): number {
  if (actual.length !== predicted.length || actual.length === 0) {
    return 0;
  }

  let sumPercentageError = 0;
  let validCount = 0;

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== 0) {
      sumPercentageError += Math.abs((actual[i] - predicted[i]) / actual[i]);
      validCount++;
    }
  }

  if (validCount === 0) {
    return 0;
  }

  return (sumPercentageError / validCount) * 100;
}

/**
 * Interpolate missing values in time series
 * @param data - Array of data points
 * @param gapThreshold - Maximum gap to interpolate (in milliseconds)
 * @returns Interpolated data array
 */
export function interpolateData(data: DataPoint[], gapThreshold: number = 86400000): DataPoint[] {
  // Guard: Validate input
  if (!Array.isArray(data) || data.length < 2) {
    return data && data.length === 1 ? [...data] : [];
  }

  // Guard: Validate gapThreshold
  const validatedGapThreshold = Number.isFinite(gapThreshold) && gapThreshold > 0
    ? Math.min(gapThreshold, 31536000000) // Max 1 year
    : 86400000;

  const result: DataPoint[] = [];
  const sorted = [...data].sort((a, b) => {
    // Guard: Validate timestamps
    const timeA = a && a.timestamp ? a.timestamp.getTime() : 0;
    const timeB = b && b.timestamp ? b.timestamp.getTime() : 0;
    return timeA - timeB;
  });

  // Guard: Validate first data point
  if (!sorted[0] || !sorted[0].timestamp) {
    return [];
  }

  result.push(sorted[0]);

  const MAX_INTERPOLATED_POINTS = 1000;
  let totalInterpolated = 0;

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    // Guard: Validate current data point
    if (!curr || !curr.timestamp || !prev || !prev.timestamp) {
      continue;
    }

    const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();

    if (!Number.isFinite(timeDiff) || timeDiff <= validatedGapThreshold) {
      // No interpolation needed
      result.push(curr);
    } else if (totalInterpolated < MAX_INTERPOLATED_POINTS) {
      // Interpolate missing points
      const numPoints = Math.min(Math.ceil(timeDiff / validatedGapThreshold), 100);

      for (let j = 1; j < numPoints; j++) {
        const interpolatedTime = new Date(prev.timestamp.getTime() + j * validatedGapThreshold);

        // Guard: Validate interpolation
        const prevValue = Number.isFinite(prev.value) ? prev.value : 0;
        const currValue = Number.isFinite(curr.value) ? curr.value : prevValue;
        const interpolatedValue = prevValue + (j / numPoints) * (currValue - prevValue);

        result.push({
          timestamp: interpolatedTime,
          value: Number.isFinite(interpolatedValue) ? interpolatedValue : prevValue
        });

        totalInterpolated++;
      }

      result.push(curr);
    } else {
      // Too many interpolated points, just add current
      result.push(curr);
    }
  }

  if (totalInterpolated >= MAX_INTERPOLATED_POINTS) {
    console.warn('interpolateData: Maximum interpolated points reached');
  }

  return result;
}
