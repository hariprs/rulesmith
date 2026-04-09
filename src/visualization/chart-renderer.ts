/**
 * Chart Renderer (Story 3-3)
 *
 * Production-ready chart rendering with lifecycle management.
 * Wraps transformers (Story 3-2) and chart components (Story 3-1) into easy-to-use render functions.
 *
 * YOLO Approach: Rapid development with real Chart.js rendering, iterating based on actual output.
 *
 * Features:
 * - Canvas lifecycle management
 * - Error handling with AR22 format
 * - Accessibility (ARIA labels, WCAG AA contrast)
 * - Performance optimization
 * - Multiple chart types support
 *
 * @module visualization/chart-renderer
 */

import { Chart } from 'chart.js/auto';
import { MergedPattern } from '../pattern-matcher';
import {
  ChartData,
  VisualizationErrorCode,
  throwVisualizationError,
  ChartRenderResult,
} from './types';
import {
  transformPatternsToBarChart,
  transformPatternsToBarChartByPattern,
  transformPatternsToLineChart,
  transformPatternsToPieChart,
} from './transformers';

// ============================================================================
// CANVAS LIFECYCLE MANAGEMENT
// ============================================================================

/** Chart instance cache for cleanup */
const chartInstances = new Map<string, Chart>();

/**
 * Get or create a canvas element
 *
 * @param containerId - Container element ID
 * @param canvasId - Canvas element ID (optional, auto-generated if not provided)
 * @returns HTMLCanvasElement
 */
export function getOrCreateCanvas(
  containerId: string,
  canvasId?: string
): HTMLCanvasElement {
  const container = document.getElementById(containerId);

  if (!container) {
    throwVisualizationError(
      `Container element not found: ${containerId}`,
      [
        'Ensure container element exists in DOM with matching ID',
        'Check that DOM is fully loaded before calling getOrCreateCanvas()',
        'Verify container ID matches the ID passed to getOrCreateCanvas()',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Container ID: ${containerId}, DOM ready: ${document.readyState}`
    );
  }

  // Generate canvas ID if not provided
  const finalCanvasId = canvasId || `${containerId}-canvas-${Date.now()}`;

  // Check if canvas already exists
  let canvas = document.getElementById(finalCanvasId) as HTMLCanvasElement;

  if (!canvas) {
    // Create new canvas
    canvas = document.createElement('canvas');
    canvas.id = finalCanvasId;
    container.appendChild(canvas);
  }

  return canvas;
}

/**
 * Destroy a chart instance
 *
 * @param chart - Chart instance or null
 */
export function destroyChart(chart: Chart | null): void {
  if (chart) {
    try {
      chart.destroy();
    } catch (error) {
      console.warn('Error destroying chart instance:', error);
    }
  }
}

/**
 * Destroy canvas and remove from DOM
 *
 * @param canvas - Canvas element
 */
export function destroyCanvas(canvas: HTMLCanvasElement): void {
  if (!canvas) {
    return;
  }

  // Destroy chart instance if exists
  const canvasId = canvas.id;
  if (chartInstances.has(canvasId)) {
    const chart = chartInstances.get(canvasId);
    destroyChart(chart || null);
    chartInstances.delete(canvasId);
  }

  // Remove canvas from DOM
  canvas.remove();
}

/**
 * Destroy all chart instances (cleanup on unmount)
 */
export function destroyAllCharts(): void {
  for (const [canvasId, chart] of chartInstances.entries()) {
    destroyChart(chart);
    chartInstances.delete(canvasId);
  }
}

// ============================================================================
// BAR CHART RENDERING (AC1, AC2)
// ============================================================================

/**
 * Render pattern frequency chart by category (AC1)
 *
 * @param canvas - Canvas element or canvas ID
 * @param patterns - MergedPattern array from Epic 2
 * @returns Chart instance
 */
export function renderPatternFrequencyChart(
  canvas: HTMLCanvasElement | string,
  patterns: MergedPattern[]
): Chart {
  // Validate patterns
  if (!patterns || patterns.length === 0) {
    throwVisualizationError(
      'No patterns to display',
      [
        'Ensure patterns array is not empty',
        'Check that pattern detection completed successfully',
        'Verify MergedPattern data from Epic 2',
      ],
      VisualizationErrorCode.EMPTY_PATTERN_DATA,
      `Pattern count: ${patterns?.length || 0}`
    );
  }

  // Transform patterns to chart data
  let chartData: ChartData;
  try {
    chartData = transformPatternsToBarChart(patterns);
  } catch (error) {
    throwVisualizationError(
      'Failed to transform patterns to chart data',
      [
        'Check that patterns are valid MergedPattern objects',
        'Ensure all patterns have required fields (pattern_text, count, category)',
        'Verify transformer functions from Story 3-2 are working correctly',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Get canvas element
  const canvasElement = typeof canvas === 'string'
    ? document.getElementById(canvas) as HTMLCanvasElement
    : canvas;

  if (!canvasElement) {
    throwVisualizationError(
      `Canvas element not found: ${typeof canvas === 'string' ? canvas : canvas.id}`,
      [
        'Ensure canvas element exists in DOM',
        'Check that canvas ID is correct',
        'Verify DOM is fully loaded before rendering',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Canvas: ${typeof canvas === 'string' ? canvas : canvas.id}`
    );
  }

  // Add ARIA attributes for accessibility
  canvasElement.setAttribute('role', 'img');
  canvasElement.setAttribute(
    'aria-label',
    `Bar chart showing ${chartData.title}`
  );

  // Destroy existing chart if present
  const canvasId = canvasElement.id;
  if (chartInstances.has(canvasId)) {
    const existingChart = chartInstances.get(canvasId);
    destroyChart(existingChart || null);
    chartInstances.delete(canvasId);
  }

  // Create Chart.js configuration
  const config = {
    type: 'bar' as const,
    data: {
      labels: chartData.xAxis.data,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor,
        borderColor: dataset.borderColor,
        borderWidth: dataset.borderWidth || 1,
      })),
    },
    options: {
      responsive: chartData.options?.responsive ?? true,
      maintainAspectRatio: chartData.options?.maintainAspectRatio ?? false,
      plugins: {
        title: {
          display: true,
          text: chartData.title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          color: '#333',
        },
        legend: {
          display: chartData.options?.plugins?.legend?.display ?? true,
          position: 'top' as const,
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              // Guard: Check for valid numeric value
              const value = typeof context.parsed?.y === 'number' && Number.isFinite(context.parsed.y)
                ? context.parsed.y
                : 0;
              // Guard: Ensure category is defined
              const category = context.label || 'Unknown';
              return [`${category}: ${value} occurrences`, label];
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: chartData.xAxis.label,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: chartData.yAxis.label,
          },
          beginAtZero: true,
        },
      },
    },
  };

  // Create chart
  let chart: Chart;
  try {
    chart = new Chart(canvasElement, config);
  } catch (error) {
    throwVisualizationError(
      'Chart.js rendering failed',
      [
        'Check canvas element is valid and in DOM',
        'Verify ChartData format matches Chart.js 4.x schema',
        'Ensure Chart.js is properly imported from chart.js/auto',
      ],
      VisualizationErrorCode.CHART_RENDERING_FAILED,
      `ChartType: bar, Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Store instance for cleanup
  chartInstances.set(canvasId, chart);

  return chart;
}

/**
 * Render top patterns by frequency chart (AC2)
 *
 * @param canvas - Canvas element or canvas ID
 * @param patterns - MergedPattern array from Epic 2
 * @param topN - Number of top patterns to display (default: 20)
 * @returns Chart instance
 */
export function renderTopPatternsChart(
  canvas: HTMLCanvasElement | string,
  patterns: MergedPattern[],
  topN: number = 20
): Chart {
  // Validate patterns
  if (!patterns || patterns.length === 0) {
    throwVisualizationError(
      'No patterns to display',
      [
        'Ensure patterns array is not empty',
        'Check that pattern detection completed successfully',
        'Verify MergedPattern data from Epic 2',
      ],
      VisualizationErrorCode.EMPTY_PATTERN_DATA,
      `Pattern count: ${patterns?.length || 0}`
    );
  }

  // Transform patterns to chart data
  let chartData: ChartData;
  try {
    chartData = transformPatternsToBarChartByPattern(patterns, topN);
  } catch (error) {
    throwVisualizationError(
      'Failed to transform patterns to chart data',
      [
        'Check that patterns are valid MergedPattern objects',
        'Ensure all patterns have required fields (pattern_text, count, category)',
        'Verify transformer functions from Story 3-2 are working correctly',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Get canvas element
  const canvasElement = typeof canvas === 'string'
    ? document.getElementById(canvas) as HTMLCanvasElement
    : canvas;

  if (!canvasElement) {
    throwVisualizationError(
      `Canvas element not found: ${typeof canvas === 'string' ? canvas : canvas.id}`,
      [
        'Ensure canvas element exists in DOM',
        'Check that canvas ID is correct',
        'Verify DOM is fully loaded before rendering',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Canvas: ${typeof canvas === 'string' ? canvas : canvas.id}`
    );
  }

  // Add ARIA attributes for accessibility
  canvasElement.setAttribute('role', 'img');
  canvasElement.setAttribute(
    'aria-label',
    `Bar chart showing top ${topN} patterns by frequency`
  );

  // Destroy existing chart if present
  const canvasId = canvasElement.id;
  if (chartInstances.has(canvasId)) {
    const existingChart = chartInstances.get(canvasId);
    destroyChart(existingChart || null);
    chartInstances.delete(canvasId);
  }

  // Truncate pattern text for labels (30 chars max)
  const truncatedLabels = chartData.xAxis.data.map((label) =>
    typeof label === 'string' && label.length > 30
      ? label.substring(0, 30) + '...'
      : label
  );

  // Create Chart.js configuration
  const config = {
    type: 'bar' as const,
    data: {
      labels: truncatedLabels,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor,
        borderColor: dataset.borderColor,
        borderWidth: dataset.borderWidth || 1,
      })),
    },
    options: {
      responsive: chartData.options?.responsive ?? true,
      maintainAspectRatio: chartData.options?.maintainAspectRatio ?? false,
      indexAxis: 'y' as const, // Horizontal bar chart for long labels
      plugins: {
        title: {
          display: true,
          text: chartData.title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          color: '#333',
        },
        legend: {
          display: false, // Hide legend for single dataset
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context: any) => {
              // Guard: Check for valid numeric value
              const value = typeof context.parsed?.x === 'number' && Number.isFinite(context.parsed.x)
                ? context.parsed.x
                : 0;
              // Guard: Bounds check for array access
              const fullLabel = context.dataIndex >= 0 && context.dataIndex < chartData.xAxis.data.length
                ? chartData.xAxis.data[context.dataIndex] as string
                : 'Unknown';
              return [`Frequency: ${value}`, fullLabel];
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: chartData.xAxis.label,
          },
          beginAtZero: true,
        },
        y: {
          display: true,
          title: {
            display: false,
          },
        },
      },
    },
  };

  // Create chart
  let chart: Chart;
  try {
    chart = new Chart(canvasElement, config);
  } catch (error) {
    throwVisualizationError(
      'Chart.js rendering failed',
      [
        'Check canvas element is valid and in DOM',
        'Verify ChartData format matches Chart.js 4.x schema',
        'Ensure Chart.js is properly imported from chart.js/auto',
      ],
      VisualizationErrorCode.CHART_RENDERING_FAILED,
      `ChartType: bar (horizontal), Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Store instance for cleanup
  chartInstances.set(canvasId, chart);

  return chart;
}

// ============================================================================
// LINE CHART RENDERING (AC3)
// ============================================================================

/**
 * Render pattern trends over time chart (AC3)
 *
 * @param canvas - Canvas element or canvas ID
 * @param patterns - MergedPattern array from Epic 2
 * @returns Chart instance
 */
export function renderPatternTrendsChart(
  canvas: HTMLCanvasElement | string,
  patterns: MergedPattern[]
): Chart {
  // Validate patterns
  if (!patterns || patterns.length === 0) {
    throwVisualizationError(
      'No patterns to display',
      [
        'Ensure patterns array is not empty',
        'Check that pattern detection completed successfully',
        'Verify MergedPattern data from Epic 2',
      ],
      VisualizationErrorCode.EMPTY_PATTERN_DATA,
      `Pattern count: ${patterns?.length || 0}`
    );
  }

  // Transform patterns to chart data
  let chartData: ChartData;
  try {
    chartData = transformPatternsToLineChart(patterns);
  } catch (error) {
    throwVisualizationError(
      'Failed to transform patterns to chart data',
      [
        'Check that patterns are valid MergedPattern objects',
        'Ensure all patterns have required fields (pattern_text, count, category, first_seen)',
        'Verify transformer functions from Story 3-2 are working correctly',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Get canvas element
  const canvasElement = typeof canvas === 'string'
    ? document.getElementById(canvas) as HTMLCanvasElement
    : canvas;

  if (!canvasElement) {
    throwVisualizationError(
      `Canvas element not found: ${typeof canvas === 'string' ? canvas : canvas.id}`,
      [
        'Ensure canvas element exists in DOM',
        'Check that canvas ID is correct',
        'Verify DOM is fully loaded before rendering',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Canvas: ${typeof canvas === 'string' ? canvas : canvas.id}`
    );
  }

  // Add ARIA attributes for accessibility
  canvasElement.setAttribute('role', 'img');
  canvasElement.setAttribute(
    'aria-label',
    `Line chart showing pattern trends over time`
  );

  // Destroy existing chart if present
  const canvasId = canvasElement.id;
  if (chartInstances.has(canvasId)) {
    const existingChart = chartInstances.get(canvasId);
    destroyChart(existingChart || null);
    chartInstances.delete(canvasId);
  }

  // Create Chart.js configuration
  const config = {
    type: 'line' as const,
    data: {
      labels: chartData.xAxis.data,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor || 'rgba(54, 162, 235, 0.2)',
        borderColor: dataset.borderColor || 'rgba(54, 162, 235, 1)',
        borderWidth: dataset.borderWidth || 2,
        fill: dataset.config?.fill ?? true,
        tension: dataset.config?.tension ?? 0.4, // Smooth curves
        pointRadius: dataset.config?.pointRadius ?? 4,
        pointHoverRadius: dataset.config?.pointHoverRadius ?? 6,
      })),
    },
    options: {
      responsive: chartData.options?.responsive ?? true,
      maintainAspectRatio: chartData.options?.maintainAspectRatio ?? false,
      plugins: {
        title: {
          display: true,
          text: chartData.title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          color: '#333',
        },
        legend: {
          display: chartData.options?.plugins?.legend?.display ?? true,
          position: 'top' as const,
        },
        tooltip: {
          enabled: true,
          mode: 'index' as const,
          intersect: false,
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || '';
              // Guard: Check for valid numeric value
              const value = typeof context.parsed?.y === 'number' && Number.isFinite(context.parsed.y)
                ? context.parsed.y
                : 0;
              return [`${label}: ${value} patterns`];
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: chartData.xAxis.label,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: chartData.yAxis.label,
          },
          beginAtZero: true,
        },
      },
    },
  };

  // Create chart
  let chart: Chart;
  try {
    chart = new Chart(canvasElement, config);
  } catch (error) {
    throwVisualizationError(
      'Chart.js rendering failed',
      [
        'Check canvas element is valid and in DOM',
        'Verify ChartData format matches Chart.js 4.x schema',
        'Ensure Chart.js is properly imported from chart.js/auto',
      ],
      VisualizationErrorCode.CHART_RENDERING_FAILED,
      `ChartType: line, Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Store instance for cleanup
  chartInstances.set(canvasId, chart);

  return chart;
}

// ============================================================================
// DOUGHNUT CHART RENDERING (AC4)
// ============================================================================

/**
 * Render category distribution chart (AC4)
 *
 * @param canvas - Canvas element or canvas ID
 * @param patterns - MergedPattern array from Epic 2
 * @returns Chart instance
 */
export function renderCategoryDistributionChart(
  canvas: HTMLCanvasElement | string,
  patterns: MergedPattern[]
): Chart {
  // Validate patterns
  if (!patterns || patterns.length === 0) {
    throwVisualizationError(
      'No patterns to display',
      [
        'Ensure patterns array is not empty',
        'Check that pattern detection completed successfully',
        'Verify MergedPattern data from Epic 2',
      ],
      VisualizationErrorCode.EMPTY_PATTERN_DATA,
      `Pattern count: ${patterns?.length || 0}`
    );
  }

  // Transform patterns to chart data
  let chartData: ChartData;
  try {
    chartData = transformPatternsToPieChart(patterns);
  } catch (error) {
    throwVisualizationError(
      'Failed to transform patterns to chart data',
      [
        'Check that patterns are valid MergedPattern objects',
        'Ensure all patterns have required fields (pattern_text, count, category)',
        'Verify transformer functions from Story 3-2 are working correctly',
      ],
      VisualizationErrorCode.CHART_DATA_TRANSFORMATION_FAILED,
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Get canvas element
  const canvasElement = typeof canvas === 'string'
    ? document.getElementById(canvas) as HTMLCanvasElement
    : canvas;

  if (!canvasElement) {
    throwVisualizationError(
      `Canvas element not found: ${typeof canvas === 'string' ? canvas : canvas.id}`,
      [
        'Ensure canvas element exists in DOM',
        'Check that canvas ID is correct',
        'Verify DOM is fully loaded before rendering',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Canvas: ${typeof canvas === 'string' ? canvas : canvas.id}`
    );
  }

  // Add ARIA attributes for accessibility
  canvasElement.setAttribute('role', 'img');
  canvasElement.setAttribute(
    'aria-label',
    `Doughnut chart showing pattern distribution by category`
  );

  // Destroy existing chart if present
  const canvasId = canvasElement.id;
  if (chartInstances.has(canvasId)) {
    const existingChart = chartInstances.get(canvasId);
    destroyChart(existingChart || null);
    chartInstances.delete(canvasId);
  }

  // Calculate total patterns for center text
  const totalPatterns = patterns.reduce((sum, p) => sum + p.count, 0);

  // Create Chart.js configuration
  const config = {
    type: 'doughnut' as const,
    data: {
      labels: chartData.xAxis.data,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor,
        borderColor: dataset.borderColor,
        borderWidth: dataset.borderWidth || 2,
      })),
    },
    options: {
      responsive: chartData.options?.responsive ?? true,
      maintainAspectRatio: chartData.options?.maintainAspectRatio ?? false,
      cutout: '60%', // Doughnut chart
      plugins: {
        title: {
          display: true,
          text: chartData.title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          color: '#333',
        },
        legend: {
          display: true,
          position: 'right' as const,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              // Guard: Check for valid numeric value and prevent division by zero
              const value = typeof context.parsed === 'number' && Number.isFinite(context.parsed)
                ? context.parsed
                : 0;
              const percentage = totalPatterns > 0
                ? ((value / totalPatterns) * 100).toFixed(1)
                : '0.0';
              return [`${label}: ${value} (${percentage}%)`];
            },
          },
        },
      },
    },
  };

  // Create chart
  let chart: Chart;
  try {
    chart = new Chart(canvasElement, config);
  } catch (error) {
    throwVisualizationError(
      'Chart.js rendering failed',
      [
        'Check canvas element is valid and in DOM',
        'Verify ChartData format matches Chart.js 4.x schema',
        'Ensure Chart.js is properly imported from chart.js/auto',
      ],
      VisualizationErrorCode.CHART_RENDERING_FAILED,
      `ChartType: doughnut, Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Store instance for cleanup
  chartInstances.set(canvasId, chart);

  return chart;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get chart instance by canvas ID
 *
 * @param canvasId - Canvas element ID
 * @returns Chart instance or undefined
 */
export function getChartInstance(canvasId: string): Chart | undefined {
  return chartInstances.get(canvasId);
}

/**
 * Check if chart exists
 *
 * @param canvasId - Canvas element ID
 * @returns True if chart exists
 */
export function hasChartInstance(canvasId: string): boolean {
  return chartInstances.has(canvasId);
}

/**
 * Get all chart instance IDs
 *
 * @returns Array of canvas IDs with active charts
 */
export function getAllChartInstanceIds(): string[] {
  return Array.from(chartInstances.keys());
}
