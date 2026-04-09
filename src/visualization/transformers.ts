/**
 * Data Transformers (Story 3-1)
 *
 * Transforms Epic 2 MergedPattern data into Chart.js compatible chart data.
 * Provides transformers for bar charts, line charts, and pie charts.
 *
 * Features:
 * - Type-safe data transformation
 * - Empty state handling
 * - Large dataset optimization
 * - Category grouping
 * - Temporal data extraction
 * - AR22 compliant error handling
 *
 * @module visualization/transformers
 */

import { MergedPattern } from '../pattern-matcher';
import { PatternCategory } from '../pattern-detector';
import {
  ChartData,
  ChartType,
  ChartAxis,
  ChartDataset,
  ChartOptions,
  PatternFrequencyData,
  TemporalPatternData,
  CategoryDistributionData,
  VisualizationConfig,
  VisualizationErrorCode,
  throwVisualizationError,
  PatternTooltipData,
} from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Default color palette for charts */
const DEFAULT_COLORS = {
  background: [
    'rgba(255, 99, 132, 0.8)',
    'rgba(54, 162, 235, 0.8)',
    'rgba(255, 206, 86, 0.8)',
    'rgba(75, 192, 192, 0.8)',
    'rgba(153, 102, 255, 0.8)',
    'rgba(255, 159, 64, 0.8)',
  ],
  border: [
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(255, 206, 86, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
  ],
};

/** Default configuration */
const DEFAULT_CONFIG: VisualizationConfig = {
  maxPatterns: 100,
  showAll: false,
  animate: true,
  colors: DEFAULT_COLORS,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Type guard to validate MergedPattern structure (AC6)
 *
 * @param pattern - Pattern to validate
 * @returns True if valid MergedPattern
 */
export function isMergedPattern(pattern: any): pattern is MergedPattern {
  // Guard: Null/undefined check
  if (!pattern || typeof pattern !== 'object' || Array.isArray(pattern)) {
    return false;
  }

  // Required fields: pattern_text, count, category
  if (typeof pattern.pattern_text !== 'string' || pattern.pattern_text.trim() === '') {
    return false;
  }

  if (typeof pattern.count !== 'number' || pattern.count < 0) {
    return false;
  }

  if (!Object.values(PatternCategory).includes(pattern.category)) {
    return false;
  }

  // Timestamp fields are now required for validation (AC6)
  if (!pattern.first_seen || typeof pattern.first_seen !== 'string' || !isValidTimestamp(pattern.first_seen)) {
    return false;
  }

  if (!pattern.last_seen || typeof pattern.last_seen !== 'string' || !isValidTimestamp(pattern.last_seen)) {
    return false;
  }

  // Optional fields validation
  if (pattern.session_count !== undefined && (typeof pattern.session_count !== 'number' || pattern.session_count < 0)) {
    return false;
  }

  if (pattern.total_frequency !== undefined && (typeof pattern.total_frequency !== 'number' || pattern.total_frequency < 0)) {
    return false;
  }

  if (pattern.frequency_change !== undefined && typeof pattern.frequency_change !== 'number') {
    return false;
  }

  if (pattern.is_new !== undefined && typeof pattern.is_new !== 'boolean') {
    return false;
  }

  if (pattern.examples !== undefined && !Array.isArray(pattern.examples)) {
    return false;
  }

  return true;
}

/**
 * Validate ISO 8601 timestamp
 *
 * @param timestamp - Timestamp to validate
 * @returns True if valid ISO 8601 timestamp
 */
function isValidTimestamp(timestamp: string): boolean {
  if (!timestamp || typeof timestamp !== 'string') {
    return false;
  }
  try {
    const date = new Date(timestamp);
    // Guard: Check if date is valid (allow various ISO 8601 formats)
    if (isNaN(date.getTime())) {
      return false;
    }
    // Additional check: reject obviously invalid calendar dates
    // but allow different ISO 8601 representations (with/without milliseconds, etc)
    const parsed = date.toISOString().split('T')[0]; // Just check the date part
    const inputDate = timestamp.split('T')[0];
    // Normalize both for comparison
    return parsed === inputDate || !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Validate MergedPattern array with type guards (AC6)
 *
 * @param patterns - Patterns to validate
 * @returns Validated MergedPattern array
 * @throws VisualizationError if validation fails
 */
function validatePatternsArray(patterns: unknown[]): MergedPattern[] {
  // Guard: Prevent DoS from extremely large arrays
  if (patterns.length > 10000) {
    throwVisualizationError(
      'Pattern array too large for validation',
      [
        'Array size exceeds maximum allowed (10000 patterns)',
        'Consider paginating or filtering data before visualization',
        'Use the maxPatterns config option to limit dataset size',
      ],
      VisualizationErrorCode.INVALID_PATTERN_DATA,
      `Array size: ${patterns.length}`
    );
  }

  const invalidPatterns: number[] = [];

  for (let i = 0; i < patterns.length; i++) {
    if (!isMergedPattern(patterns[i])) {
      invalidPatterns.push(i);
    }
  }

  if (invalidPatterns.length > 0) {
    throwVisualizationError(
      `Invalid pattern data at indices: ${invalidPatterns.slice(0, 5).join(', ')}${invalidPatterns.length > 5 ? '...' : ''}`,
      [
        'Ensure all patterns have required fields: pattern_text, count, category, first_seen, last_seen',
        'Check that pattern fields have correct data types',
        'Verify category is a valid PatternCategory enum value',
        'Ensure timestamps are valid ISO 8601 strings',
      ],
      VisualizationErrorCode.INVALID_PATTERN_DATA,
      `Invalid patterns at ${invalidPatterns.length} indices`
    );
  }

  return patterns as MergedPattern[];
}

/**
 * Get color for index
 *
 * @param index - Color index
 * @param config - Visualization configuration
 * @returns Background and border colors
 */
function getColorsForIndex(
  index: number,
  config: VisualizationConfig
): { background: string; border: string } {
  if (index < 0 || !Number.isFinite(index)) {
    console.warn(`Invalid color index: ${index}, using 0`);
    index = 0;
  }

  const colors = config.colors || DEFAULT_COLORS;
  const colorIndex = index % (colors.background?.length || 1);
  return {
    background: colors.background?.[colorIndex] || 'rgba(0, 0, 0, 0.8)',
    border: colors.border?.[colorIndex] || 'rgba(0, 0, 0, 1)',
  };
}

/**
 * Validate pattern data (AC6)
 *
 * @param patterns - Pattern array to validate
 * @throws VisualizationError if data is invalid
 */
function validatePatterns(patterns: unknown[]): void {
  if (!Array.isArray(patterns)) {
    throwVisualizationError(
      'Invalid pattern data - expected array',
      [
        'Ensure patterns parameter is an array of MergedPattern objects',
        'Check that data from Epic 2 is properly formatted',
      ],
      VisualizationErrorCode.INVALID_PATTERN_DATA,
      `Received type: ${typeof patterns}`
    );
  }

  if (patterns.length === 0) {
    throwVisualizationError(
      'Empty pattern data - no patterns to visualize',
      [
        'Ensure pattern detection has been run',
        'Check that Epic 2 pipeline completed successfully',
        'Verify state.json contains pattern data',
      ],
      VisualizationErrorCode.EMPTY_PATTERN_DATA,
      'Pattern array length is 0'
    );
  }

  // Use type guard for runtime validation
  validatePatternsArray(patterns);
}

/**
 * Sample patterns for large datasets
 *
 * @param patterns - All patterns
 * @param maxPatterns - Maximum patterns to return
 * @returns Sampled patterns (top by frequency)
 */
function samplePatterns(
  patterns: MergedPattern[],
  maxPatterns: number
): MergedPattern[] {
  if (!Number.isFinite(maxPatterns) || maxPatterns <= 0) {
    console.warn(`Invalid maxPatterns: ${maxPatterns}, using all patterns`);
    return patterns;
  }

  if (patterns.length <= maxPatterns) {
    return patterns;
  }

  // Sort by total_frequency and take top maxPatterns
  // Guard: Handle patterns with invalid or negative total_frequency
  return [...patterns]
    .sort((a, b) => {
      const freqA = Number.isFinite(a.total_frequency) && a.total_frequency >= 0 ? a.total_frequency : 0;
      const freqB = Number.isFinite(b.total_frequency) && b.total_frequency >= 0 ? b.total_frequency : 0;
      return freqB - freqA;
    })
    .slice(0, maxPatterns);
}

// ============================================================================
// BAR CHART TRANSFORMERS
// ============================================================================

/**
 * Transform patterns to bar chart data by category
 *
 * @param patterns - MergedPattern array from Epic 2
 * @param config - Visualization configuration
 * @returns ChartData for bar chart
 */
export function transformPatternsToBarChart(
  patterns: MergedPattern[],
  config: VisualizationConfig = {}
): ChartData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    validatePatterns(patterns);

    // Sample if necessary
    const sampledPatterns = samplePatterns(patterns, finalConfig.maxPatterns || 100);

    // Group by category
    const categoryMap = new Map<PatternCategory, number>();

    for (const pattern of sampledPatterns) {
      if (!pattern.category) {
        console.warn('Pattern missing category, skipping');
        continue;
      }
      if (!Number.isFinite(pattern.total_frequency)) {
        console.warn('Pattern has invalid total_frequency, using 0');
        pattern.total_frequency = 0;
      }
      const current = categoryMap.get(pattern.category) || 0;
      categoryMap.set(pattern.category, current + pattern.total_frequency);
    }

    // Extract data
    const categories = Array.from(categoryMap.keys());
    const frequencies = Array.from(categoryMap.values());

    const xAxis: ChartAxis = {
      label: 'Pattern Category',
      data: categories,
    };

    const yAxis: ChartAxis = {
      label: 'Frequency',
      data: frequencies,
      config: {
        min: 0,
        beginAtZero: true,
      },
    };

    const datasets: ChartDataset[] = [
      {
        label: 'Pattern Frequency',
        data: frequencies,
        backgroundColor: categories.map((_, i) =>
          getColorsForIndex(i, finalConfig).background
        ),
        borderColor: categories.map((_, i) =>
          getColorsForIndex(i, finalConfig).border
        ),
        borderWidth: 1,
      },
    ];

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Pattern Frequency by Category',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: true,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Pattern Category',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency',
          },
        },
      },
    };

    return {
      chartType: ChartType.BAR,
      title: 'Pattern Frequency by Category',
      xAxis,
      yAxis,
      datasets,
      options,
      metadata: {
        source: 'Epic 2 MergedPattern',
        timestamp: new Date().toISOString(),
        dataPointCount: sampledPatterns.length,
        totalPatterns: patterns.length,
        sampled: patterns.length > (finalConfig.maxPatterns || 100),
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'what' in error) {
      throw error; // Re-throw VisualizationError
    }
    throwVisualizationError(
      'Failed to transform patterns to bar chart',
      [
        'Check that pattern data is properly formatted',
        'Verify category field exists on all patterns',
        'Ensure total_frequency is a number',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Transform patterns to bar chart data by individual pattern
 *
 * @param patterns - MergedPattern array from Epic 2
 * @param maxPatterns - Maximum patterns to display
 * @param config - Visualization configuration
 * @returns ChartData for bar chart
 */
export function transformPatternsToBarChartByPattern(
  patterns: MergedPattern[],
  maxPatterns: number = 20,
  config: VisualizationConfig = {}
): ChartData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    validatePatterns(patterns);

    // Sample top patterns by frequency
    const topPatterns = samplePatterns(patterns, maxPatterns);

    const patternLabels = topPatterns.map((p) => {
      if (!p.pattern_text) {
        return '(no pattern text)';
      }
      return p.pattern_text.length > 30 ? p.pattern_text.substring(0, 30) + '...' : p.pattern_text;
    });
    // Guard: Filter out Infinity and NaN values
    const frequencies = topPatterns.map((p) => {
      const freq = Number.isFinite(p.total_frequency) ? p.total_frequency : p.count;
      return Number.isFinite(freq) ? freq : 0;
    });

    const xAxis: ChartAxis = {
      label: 'Pattern',
      data: patternLabels,
    };

    const yAxis: ChartAxis = {
      label: 'Frequency',
      data: frequencies,
      config: {
        min: 0,
        beginAtZero: true,
      },
    };

    const datasets: ChartDataset[] = [
      {
        label: 'Pattern Frequency',
        data: frequencies,
        backgroundColor: topPatterns.map((_, i) =>
          getColorsForIndex(i, finalConfig).background
        ),
        borderColor: topPatterns.map((_, i) =>
          getColorsForIndex(i, finalConfig).border
        ),
        borderWidth: 1,
      },
    ];

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Top ${maxPatterns} Most Frequent Patterns`,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: false,
        },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: true,
          callback: (context: any) => {
            // Guard: Check array bounds to prevent undefined access
            const dataIndex = context.dataIndex;
            if (dataIndex < 0 || dataIndex >= topPatterns.length || !Number.isFinite(dataIndex)) {
              return ['Invalid data index'];
            }
            const pattern = topPatterns[dataIndex];
            if (!pattern) {
              return ['Pattern data not available'];
            }
            return [
              `Pattern: ${pattern.pattern_text || '(no text)'}`,
              `Frequency: ${Number.isFinite(pattern.total_frequency) ? pattern.total_frequency : 0}`,
              `Category: ${pattern.category || 'uncategorized'}`,
              `Sessions: ${Number.isFinite(pattern.session_count) ? pattern.session_count : 1}`,
            ];
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Pattern',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency',
          },
        },
      },
    };

    return {
      chartType: ChartType.BAR,
      title: `Top ${maxPatterns} Most Frequent Patterns`,
      xAxis,
      yAxis,
      datasets,
      options,
      metadata: {
        source: 'Epic 2 MergedPattern',
        timestamp: new Date().toISOString(),
        dataPointCount: topPatterns.length,
        totalPatterns: patterns.length,
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'what' in error) {
      throw error; // Re-throw VisualizationError
    }
    throwVisualizationError(
      'Failed to transform patterns to bar chart (by pattern)',
      [
        'Check that pattern data is properly formatted',
        'Verify pattern_text field exists on all patterns',
        'Ensure total_frequency is a number',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// LINE CHART TRANSFORMERS
// ============================================================================

/**
 * Transform patterns to line chart data for trend analysis
 *
 * @param patterns - MergedPattern array from Epic 2
 * @param config - Visualization configuration
 * @param timePeriod - Time period for grouping (day, week, month)
 * @returns ChartData for line chart
 */
export function transformPatternsToLineChart(
  patterns: MergedPattern[],
  config: VisualizationConfig = {},
  timePeriod: 'day' | 'week' | 'month' = 'month'
): ChartData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    validatePatterns(patterns);

    // Sort patterns by first_seen timestamp
    // Guard: Validate dates before sorting to prevent NaN errors
    const sortedPatterns = [...patterns]
      .filter(p => p.first_seen && !isNaN(new Date(p.first_seen).getTime()))
      .sort((a, b) => {
        const timeA = new Date(a.first_seen!).getTime();
        const timeB = new Date(b.first_seen!).getTime();
        // Guard: Check for NaN from date parsing
        if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) {
          return 0;
        }
        return timeA - timeB;
      });

    // Group by time period for trend analysis (AC2)
    const timeData = new Map<string, number>();
    const now = new Date();

    for (const pattern of sortedPatterns) {
      if (!pattern.first_seen) {
        console.warn('Pattern missing first_seen timestamp, skipping');
        continue;
      }

      const date = new Date(pattern.first_seen);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid first_seen timestamp: ${pattern.first_seen}, skipping`);
        continue;
      }

      // Guard: Reject future dates
      if (date > now) {
        console.warn(`Future first_seen timestamp: ${pattern.first_seen}, skipping`);
        continue;
      }

      const timeKey = createTimePeriodKey(date, timePeriod);

      // Guard: Validate time key format
      const keyFormat = timePeriod === 'day' ? /^\d{4}-\d{2}-\d{2}$/ :
                       timePeriod === 'week' ? /^\d{4}-W\d{2}$/ :
                       /^\d{4}-\d{2}$/;
      if (!keyFormat.test(timeKey)) {
        console.warn(`Invalid time key format: ${timeKey}, skipping`);
        continue;
      }

      const current = timeData.get(timeKey) || 0;
      const frequency = Number.isFinite(pattern.total_frequency) ? pattern.total_frequency : 0;
      timeData.set(timeKey, current + frequency);
    }

    // Extract data
    const timePeriods = Array.from(timeData.keys()).sort();
    const frequencies = timePeriods.map((period) => timeData.get(period) || 0);

    // Guard: Check if all frequencies are zero
    if (frequencies.length > 0 && frequencies.every(f => f === 0)) {
      console.warn('All pattern frequencies are zero, chart will be empty');
    }

    const xAxis: ChartAxis = {
      label: capitalizeFirst(timePeriod),
      data: timePeriods,
    };

    const yAxis: ChartAxis = {
      label: 'Cumulative Frequency',
      data: frequencies,
      config: {
        min: 0,
        beginAtZero: true,
      },
    };

    const datasets: ChartDataset[] = [
      {
        label: 'Pattern Frequency Over Time',
        data: frequencies,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        config: {
          fill: true,
          tension: 0.4, // Smooth curve
        },
      },
    ];

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Pattern Frequency Trend (by ${capitalizeFirst(timePeriod)})`,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: capitalizeFirst(timePeriod),
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cumulative Frequency',
          },
        },
      },
    };

    return {
      chartType: ChartType.LINE,
      title: `Pattern Frequency Trend (by ${capitalizeFirst(timePeriod)})`,
      xAxis,
      yAxis,
      datasets,
      options,
      metadata: {
        source: 'Epic 2 MergedPattern',
        timestamp: new Date().toISOString(),
        dataPointCount: timePeriods.length,
        totalPatterns: patterns.length,
        timePeriod,
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'what' in error) {
      throw error; // Re-throw VisualizationError
    }
    throwVisualizationError(
      'Failed to transform patterns to line chart',
      [
        'Check that pattern data is properly formatted',
        'Verify first_seen and last_seen timestamps are valid ISO strings',
        'Ensure total_frequency is a number',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Transform patterns to line chart with longitudinal tracking (AC2)
 *
 * @param patterns - MergedPattern array from Epic 2
 * @param config - Visualization configuration
 * @param timePeriod - Time period for grouping (day, week, month)
 * @returns ChartData for line chart with longitudinal datasets
 */
export function transformPatternsToLineChartWithLongitudinalData(
  patterns: MergedPattern[],
  config: VisualizationConfig = {},
  timePeriod: 'day' | 'week' | 'month' = 'month'
): ChartData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    validatePatterns(patterns);

    // Separate new patterns from recurring patterns (AC2)
    const newPatterns = patterns.filter(p => p.is_new);
    const recurringPatterns = patterns.filter(p => !p.is_new && p.session_count && p.session_count > 1);

    // Guard: Check if all patterns are new (no longitudinal data)
    if (recurringPatterns.length === 0) {
      console.warn('No longitudinal patterns found, falling back to regular line chart');
      return transformPatternsToLineChart(patterns, config, timePeriod);
    }

    // Guard: Check if all patterns are longitudinal (no new patterns)
    if (newPatterns.length === 0) {
      console.warn('No new patterns found, falling back to regular line chart');
      return transformPatternsToLineChart(patterns, config, timePeriod);
    }

    // Group new patterns by time period
    const newPatternData = groupPatternsByTimePeriod(newPatterns, timePeriod);
    // Group recurring patterns by time period
    const recurringPatternData = groupPatternsByTimePeriod(recurringPatterns, timePeriod);

    // Get all unique time periods
    const allPeriods = Array.from(new Set([
      ...newPatternData.keys(),
      ...recurringPatternData.keys()
    ])).sort();

    // Guard: Check if no overlapping time periods
    if (allPeriods.length === 0) {
      console.warn('No valid time periods found in data');
      throwVisualizationError(
        'No valid time periods in pattern data',
        [
          'Check that patterns have valid first_seen timestamps',
          'Ensure timestamps are within a reasonable date range',
          'Verify time period parameter is appropriate for the data',
        ],
        VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
        'No time periods extracted'
      );
    }

    const newPatternFrequencies = allPeriods.map(period => newPatternData.get(period) || 0);
    const recurringPatternFrequencies = allPeriods.map(period => recurringPatternData.get(period) || 0);

    const xAxis: ChartAxis = {
      label: capitalizeFirst(timePeriod),
      data: allPeriods,
    };

    const yAxis: ChartAxis = {
      label: 'Frequency',
      data: newPatternFrequencies,
      config: {
        min: 0,
        beginAtZero: true,
      },
    };

    const datasets: ChartDataset[] = [
      {
        label: 'New Patterns',
        data: newPatternFrequencies,
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgba(75, 192, 192, 1)',
        borderWidth: 2,
        config: {
          fill: true,
          tension: 0.4,
        },
      },
      {
        label: 'Longitudinal Patterns',
        data: recurringPatternFrequencies,
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 2,
        config: {
          fill: true,
          tension: 0.4,
        },
      },
    ];

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: `Pattern Emergence and Evolution (by ${capitalizeFirst(timePeriod)})`,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: capitalizeFirst(timePeriod),
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency',
          },
        },
      },
    };

    return {
      chartType: ChartType.LINE,
      title: `Pattern Emergence and Evolution (by ${capitalizeFirst(timePeriod)})`,
      xAxis,
      yAxis,
      datasets,
      options,
      metadata: {
        source: 'Epic 2 MergedPattern',
        timestamp: new Date().toISOString(),
        dataPointCount: allPeriods.length,
        totalPatterns: patterns.length,
        newPatternCount: newPatterns.length,
        longitudinalPatternCount: recurringPatterns.length,
        timePeriod,
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'what' in error) {
      throw error; // Re-throw VisualizationError
    }
    throwVisualizationError(
      'Failed to transform patterns to longitudinal line chart',
      [
        'Check that pattern data is properly formatted',
        'Verify first_seen and last_seen timestamps are valid ISO strings',
        'Ensure total_frequency is a number',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// PIE CHART TRANSFORMERS
// ============================================================================

/**
 * Transform patterns to pie chart data for category distribution
 *
 * @param patterns - MergedPattern array from Epic 2
 * @param config - Visualization configuration
 * @returns ChartData for pie chart
 */
export function transformPatternsToPieChart(
  patterns: MergedPattern[],
  config: VisualizationConfig = {}
): ChartData {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    validatePatterns(patterns);

    // Group by category
    const categoryMap = new Map<PatternCategory, number>();

    for (const pattern of patterns) {
      if (!pattern.category) {
        console.warn('Pattern missing category in pie chart, skipping');
        continue;
      }
      const current = categoryMap.get(pattern.category) || 0;
      const frequency = Number.isFinite(pattern.total_frequency) ? pattern.total_frequency : 0;
      categoryMap.set(pattern.category, current + frequency);
    }

    // Extract data
    const categories = Array.from(categoryMap.keys());
    const frequencies = Array.from(categoryMap.values());
    const total = frequencies.reduce((sum, freq) => sum + freq, 0);

    // Guard: Check if total is zero (all patterns have count of 0)
    if (total === 0) {
      console.warn('All pattern frequencies are zero, pie chart will be empty');
      // Return empty chart with warning
      return {
        chartType: ChartType.PIE,
        title: 'Pattern Distribution by Category (No Data)',
        xAxis: { label: 'Pattern Category', data: [] },
        yAxis: { label: 'Frequency', data: [] },
        datasets: [],
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'No pattern data available',
              font: { size: 16, weight: 'bold' as const },
            },
          },
        },
        metadata: {
          source: 'Epic 2 MergedPattern',
          timestamp: new Date().toISOString(),
          dataPointCount: 0,
          totalPatterns: patterns.length,
        },
      };
    }

    // Guard: Check if only one category (misleading pie chart)
    if (categories.length === 1) {
      console.warn('Only one category in pie chart, consider using bar chart for better visualization');
    }

    const xAxis: ChartAxis = {
      label: 'Pattern Category',
      data: categories,
    };

    const yAxis: ChartAxis = {
      label: 'Frequency',
      data: frequencies,
    };

    const datasets: ChartDataset[] = [
      {
        label: 'Pattern Distribution',
        data: frequencies,
        backgroundColor: categories.map((_, i) =>
          getColorsForIndex(i, finalConfig).background
        ),
        borderColor: categories.map((_, i) =>
          getColorsForIndex(i, finalConfig).border
        ),
        borderWidth: 1,
      },
    ];

    const options: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: 'Pattern Distribution by Category',
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'right',
        },
        tooltip: {
          enabled: true,
          mode: 'nearest',
          intersect: true,
          callback: (context: any) => {
            // Guard: Check array bounds and prevent division by zero
            const dataIndex = context.dataIndex;
            if (dataIndex < 0 || dataIndex >= categories.length || !Number.isFinite(dataIndex)) {
              return ['Invalid data index'];
            }
            const category = categories[dataIndex];
            const frequency = frequencies[dataIndex];
            // Guard: Prevent division by zero (should not happen due to earlier check, but defensive)
            const percentage = total > 0 ? ((frequency / total) * 100).toFixed(1) : '0.0';
            return [
              `Category: ${category || 'uncategorized'}`,
              `Frequency: ${Number.isFinite(frequency) ? frequency : 0}`,
              `Percentage: ${percentage}%`,
            ];
          },
        },
      },
    };

    return {
      chartType: ChartType.PIE,
      title: 'Pattern Distribution by Category',
      xAxis,
      yAxis,
      datasets,
      options,
      metadata: {
        source: 'Epic 2 MergedPattern',
        timestamp: new Date().toISOString(),
        dataPointCount: categories.length,
        totalPatterns: patterns.length,
        totalFrequency: total,
      },
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'what' in error) {
      throw error; // Re-throw VisualizationError
    }
    throwVisualizationError(
      'Failed to transform patterns to pie chart',
      [
        'Check that pattern data is properly formatted',
        'Verify category field exists on all patterns',
        'Ensure total_frequency is a number',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      error instanceof Error ? error.message : String(error)
    );
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get pattern frequency data for bar chart
 *
 * @param patterns - MergedPattern array
 * @returns Array of PatternFrequencyData
 */
export function getPatternFrequencyData(
  patterns: MergedPattern[]
): PatternFrequencyData[] {
  validatePatterns(patterns);

  return patterns.map((pattern) => ({
    label: pattern.pattern_text || '(no pattern text)',
    frequency: Number.isFinite(pattern.total_frequency) ? pattern.total_frequency : 0,
    category: pattern.category,
    metadata: {
      patternText: pattern.pattern_text || '(no pattern text)',
      suggestedRule: pattern.suggested_rule || '',
      exampleCount: Array.isArray(pattern.examples) ? pattern.examples.length : 0,
    },
  }));
}

/**
 * Get category distribution data for pie chart
 *
 * @param patterns - MergedPattern array
 * @returns Array of CategoryDistributionData
 */
export function getCategoryDistributionData(
  patterns: MergedPattern[]
): CategoryDistributionData[] {
  validatePatterns(patterns);

  // Group by category
  const categoryMap = new Map<PatternCategory, MergedPattern[]>();

  for (const pattern of patterns) {
    if (!pattern.category) {
      console.warn('Pattern missing category in distribution data, skipping');
      continue;
    }
    const current = categoryMap.get(pattern.category) || [];
    current.push(pattern);
    categoryMap.set(pattern.category, current);
  }

  // Calculate totals
  // Guard: Handle patterns with invalid total_frequency values
  const total = patterns.reduce((sum, p) => {
    const freq = Number.isFinite(p.total_frequency) && p.total_frequency >= 0
      ? p.total_frequency
      : 0;
    return sum + freq;
  }, 0);

  // Guard: Prevent division by zero
  if (total === 0) {
    console.warn('Total frequency is zero in getCategoryDistributionData, percentages will be 0');
  }

  return Array.from(categoryMap.entries()).map(([category, patterns]) => {
    const frequency = patterns.reduce((sum, p) => {
      const freq = Number.isFinite(p.total_frequency) && p.total_frequency >= 0
        ? p.total_frequency
        : 0;
      return sum + freq;
    }, 0);

    return {
      category,
      frequency,
      percentage: total > 0 ? (frequency / total) * 100 : 0,
      patternCount: patterns.length,
    };
  });
}

/**
 * Get temporal pattern data for line chart
 *
 * @param patterns - MergedPattern array
 * @returns Array of TemporalPatternData
 */
export function getTemporalPatternData(
  patterns: MergedPattern[]
): TemporalPatternData[] {
  validatePatterns(patterns);

  // Sort by first_seen
  // Guard: Handle patterns with missing or invalid first_seen
  const sortedPatterns = [...patterns]
    .filter(p => p.first_seen && !isNaN(new Date(p.first_seen).getTime()))
    .sort((a, b) => {
      const timeA = new Date(a.first_seen!).getTime();
      const timeB = new Date(b.first_seen!).getTime();
      // Guard: Check for NaN
      if (!Number.isFinite(timeA) || !Number.isFinite(timeB)) {
        return 0;
      }
      return timeA - timeB;
    });

  // Group by month
  const monthlyMap = new Map<string, TemporalPatternData>();
  let cumulativeFrequency = 0;
  const MAX_SAFE_FREQUENCY = Number.MAX_SAFE_INTEGER - 1;

  for (const pattern of sortedPatterns) {
    if (!pattern.first_seen) {
      console.warn('Pattern missing first_seen in temporal data, skipping');
      continue;
    }

    const date = new Date(pattern.first_seen);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid first_seen timestamp: ${pattern.first_seen}, skipping`);
      continue;
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const frequency = Number.isFinite(pattern.total_frequency) && pattern.total_frequency >= 0
      ? pattern.total_frequency
      : 0;

    // Guard: Prevent overflow in cumulative frequency
    if (cumulativeFrequency > MAX_SAFE_FREQUENCY - frequency) {
      console.warn('Cumulative frequency approaching MAX_SAFE_INTEGER, capping value');
      cumulativeFrequency = MAX_SAFE_FREQUENCY;
    } else {
      cumulativeFrequency += frequency;
    }

    const existing = monthlyMap.get(monthKey);
    if (existing) {
      existing.frequency += frequency;
      existing.cumulativeFrequency = cumulativeFrequency;
    } else {
      monthlyMap.set(monthKey, {
        timestamp: monthKey,
        frequency: frequency,
        cumulativeFrequency,
      });
    }
  }

  return Array.from(monthlyMap.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
}

// ============================================================================
// TOOLTIP DATA ENRICHMENT (AC4)
// ============================================================================

/**
 * Extract tooltip data from a single pattern (AC4)
 *
 * @param pattern - MergedPattern to extract tooltip data from
 * @returns PatternTooltipData with enriched information
 */
export function extractTooltipData(pattern: MergedPattern): PatternTooltipData {
  // Guard: Truncate extremely long pattern text
  const maxLength = 200;
  const rawText = pattern.pattern_text || '(no pattern text)';
  const patternText = rawText.length > maxLength
    ? rawText.substring(0, maxLength) + '...'
    : rawText;

  // Guard: Sanitize suggested rule to prevent XSS (more comprehensive sanitization)
  const rawRule = pattern.suggested_rule || pattern.pattern_text || 'No suggested rule';
  const suggestedRule = rawRule
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&/g, '&amp;') // Escape HTML entities
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .substring(0, 200); // Also truncate to prevent overflow

  return {
    patternText: patternText.substring(0, 200), // Ensure truncated
    suggestedRule,
    exampleCount: Array.isArray(pattern.examples) ? pattern.examples.length : 0,
    examples: Array.isArray(pattern.examples) ? pattern.examples.slice(0, 3) : [],
    confidence: calculateConfidence(pattern),
    sessionCount: Number.isFinite(pattern.session_count) && pattern.session_count > 0 ? pattern.session_count : 1,
    frequencyChange: Number.isFinite(pattern.frequency_change) ? pattern.frequency_change : 0,
    isNew: Boolean(pattern.is_new),
  };
}

/**
 * Calculate confidence score based on pattern metrics (AC4)
 *
 * @param pattern - MergedPattern to calculate confidence for
 * @returns Confidence score between 0 and 1
 */
function calculateConfidence(pattern: MergedPattern): number {
  let confidence = 0.5; // Base confidence

  // Increase confidence based on session count (longitudinal patterns are more reliable)
  if (pattern.session_count && pattern.session_count > 1) {
    // Guard: Cap session count contribution to prevent overflow
    confidence += Math.min(0.2, Math.min(pattern.session_count * 0.05, 1.0));
  }

  // Increase confidence based on total frequency
  // Guard: Check for finite values before using
  if (pattern.total_frequency && pattern.total_frequency > 5 && Number.isFinite(pattern.total_frequency)) {
    confidence += Math.min(0.2, (pattern.total_frequency - 5) * 0.02);
  }

  // Increase confidence based on example count
  if (pattern.examples && pattern.examples.length > 0) {
    confidence += Math.min(0.1, pattern.examples.length * 0.03);
  }

  // Decrease confidence for new patterns (less established)
  if (pattern.is_new) {
    confidence -= 0.1;
  }

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Build tooltip data array for chart datasets (AC4)
 *
 * @param patterns - MergedPattern array
 * @returns Array of PatternTooltipData for tooltips
 */
export function buildTooltipDataArray(patterns: MergedPattern[]): PatternTooltipData[] {
  // Guard: Handle empty array
  if (patterns.length === 0) {
    console.warn('buildTooltipDataArray called with empty patterns array');
    return [];
  }

  return patterns.map(extractTooltipData);
}

// ============================================================================
// TEMPORAL UTILITIES (AC2)
// ============================================================================

/**
 * Create time period key from date (AC2)
 *
 * @param date - Date to format
 * @param period - Time period (day, week, month)
 * @returns Formatted time period key
 */
function createTimePeriodKey(date: Date, period: 'day' | 'week' | 'month'): string {
  // Guard: Double-check date validity (upstream validation may have been bypassed)
  if (isNaN(date.getTime()) || !Number.isFinite(date.getTime())) {
    throw new Error('Invalid date in createTimePeriodKey');
  }

  const year = date.getFullYear();
  // Guard: Validate year is within reasonable bounds (year 1000-9999)
  if (!Number.isFinite(year) || year < 1000 || year > 9999) {
    console.warn(`Year out of reasonable range: ${year}, using current year`);
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  switch (period) {
    case 'day':
      return `${year}-${month}-${day}`;
    case 'week':
      // Get week number
      const weekNumber = getWeekNumber(date);
      // Guard: Validate week number (should be 1-53)
      if (!Number.isFinite(weekNumber) || weekNumber < 1 || weekNumber > 53) {
        // Instead of throwing, return a safe default
        console.warn(`Invalid week number: ${weekNumber}, using week 01`);
        return `${year}-W01`;
      }
      return `${year}-W${String(weekNumber).padStart(2, '0')}`;
    case 'month':
    default:
      return `${year}-${month}`;
  }
}

/**
 * Get week number from date
 *
 * @param date - Date to get week number from
 * @returns Week number (1-53)
 */
function getWeekNumber(date: Date): number {
  // Guard: Validate date is not invalid
  if (isNaN(date.getTime())) {
    return 1; // Default to week 1 for invalid dates
  }

  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  // Guard: Ensure calculation result is finite and positive
  const weekCalc = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return Number.isFinite(weekCalc) && weekCalc > 0 ? weekCalc : 1;
}

/**
 * Group patterns by time period (AC2)
 *
 * @param patterns - Patterns to group
 * @param period - Time period (day, week, month)
 * @returns Map of time period to frequency
 */
function groupPatternsByTimePeriod(
  patterns: MergedPattern[],
  period: 'day' | 'week' | 'month'
): Map<string, number> {
  const timeData = new Map<string, number>();

  for (const pattern of patterns) {
    if (!pattern.first_seen) {
      continue;
    }

    const date = new Date(pattern.first_seen);
    if (isNaN(date.getTime())) {
      continue;
    }

    const timeKey = createTimePeriodKey(date, period);
    const current = timeData.get(timeKey) || 0;
    // Guard: Prevent negative frequencies and ensure finite values
    const frequency = Number.isFinite(pattern.total_frequency) && pattern.total_frequency >= 0
      ? pattern.total_frequency
      : 0;
    timeData.set(timeKey, current + frequency);
  }

  return timeData;
}

/**
 * Capitalize first letter of string
 *
 * @param str - String to capitalize
 * @returns Capitalized string
 */
function capitalizeFirst(str: string): string {
  // Guard: Handle empty or invalid strings
  if (!str || typeof str !== 'string' || str.length === 0) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}
