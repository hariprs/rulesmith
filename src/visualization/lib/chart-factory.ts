/**
 * Chart Factory (Story 3-1)
 *
 * Factory for creating Chart.js chart instances with proper configuration.
 * Handles chart creation, updates, and cleanup.
 *
 * @module visualization/lib/chart-factory
 */

import { Chart, ChartConfiguration, ChartType as ChartJsChartType } from 'chart.js/auto';
import {
  ChartData,
  ChartType,
  VisualizationError,
  VisualizationErrorCode,
  throwVisualizationError,
} from '../types';

// ============================================================================
// CHART INSTANCE MANAGEMENT
// ============================================================================

/** Chart instance cache for cleanup */
const chartInstances = new Map<string, Chart>();

/**
 * Create a Chart.js chart instance
 *
 * @param canvasId - Canvas element ID
 * @param chartData - Chart data from transformers
 * @returns Chart instance
 */
export function createChart(canvasId: string, chartData: ChartData): Chart {
  if (!canvasId) {
    throwVisualizationError(
      'Canvas ID is required',
      [
        'Provide a valid canvas element ID',
        'Check that canvasId parameter is not empty or undefined',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      'Canvas ID: empty'
    );
  }

  if (!chartData || !chartData.xAxis || !chartData.yAxis || !chartData.datasets || !chartData.chartType) {
    throwVisualizationError(
      'Invalid chart data: missing required fields',
      [
        'Ensure chartData includes xAxis, yAxis, datasets, and chartType',
        'Check that data transformation completed successfully',
      ],
      VisualizationErrorCode.INVALID_PATTERN_DATA,
      `Fields present: ${JSON.stringify({
        hasXAxis: !!chartData?.xAxis,
        hasYAxis: !!chartData?.yAxis,
        hasDatasets: !!chartData?.datasets,
        hasChartType: !!chartData?.chartType,
      })}`
    );
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

  if (!canvas) {
    throwVisualizationError(
      `Canvas element not found: ${canvasId}`,
      [
        'Ensure canvas element exists in DOM with matching ID',
        'Check that DOM is fully loaded before calling createChart()',
        'Verify canvas ID matches the ID passed to createChart()',
      ],
      VisualizationErrorCode.CANVAS_NOT_FOUND,
      `Canvas ID: ${canvasId}, DOM ready: ${document.readyState}`
    );
  }

  // Destroy existing chart if present
  if (chartInstances.has(canvasId)) {
    const existingChart = chartInstances.get(canvasId);
    if (existingChart) {
      existingChart.destroy();
      chartInstances.delete(canvasId);
    }
  }

  // Convert our ChartType to Chart.js ChartType
  const jsChartType = chartData.chartType as ChartJsChartType;

  // Build Chart.js configuration
  const config: ChartConfiguration = {
    type: jsChartType,
    data: {
      labels: chartData.xAxis.data,
      datasets: chartData.datasets.map((dataset) => ({
        label: dataset.label,
        data: dataset.data,
        backgroundColor: dataset.backgroundColor,
        borderColor: dataset.borderColor,
        borderWidth: dataset.borderWidth,
        fill: dataset.config?.fill,
        tension: dataset.config?.tension,
        pointRadius: dataset.config?.pointRadius,
        pointHoverRadius: dataset.config?.pointHoverRadius,
      })),
    },
    options: {
      responsive: chartData.options?.responsive ?? true,
      maintainAspectRatio: chartData.options?.maintainAspectRatio ?? false,
      animation: chartData.options?.animation,
      plugins: {
        title: chartData.options?.plugins?.title,
        legend: chartData.options?.plugins?.legend,
        tooltip: chartData.options?.plugins?.tooltip,
      },
      scales: chartData.options?.scales,
    },
  };

  // Create chart
  const chart = new Chart(canvas, config);

  // Store instance for cleanup
  chartInstances.set(canvasId, chart);

  return chart;
}

/**
 * Update an existing chart with new data
 *
 * @param canvasId - Canvas element ID
 * @param chartData - New chart data
 * @returns Updated chart instance
 */
export function updateChart(canvasId: string, chartData: ChartData): Chart {
  if (!canvasId || !chartData) {
    throw new Error('updateChart requires valid canvasId and chartData');
  }

  const chart = chartInstances.get(canvasId);

  if (!chart) {
    return createChart(canvasId, chartData);
  }

  // Validate data before update
  if (!chartData.xAxis?.data || !Array.isArray(chartData.datasets)) {
    throw new Error('Invalid chart data for update: missing or invalid data arrays');
  }

  // Update data
  chart.data.labels = chartData.xAxis.data;
  chart.data.datasets = chartData.datasets.map((dataset) => ({
    label: dataset.label,
    data: dataset.data,
    backgroundColor: dataset.backgroundColor,
    borderColor: dataset.borderColor,
    borderWidth: dataset.borderWidth,
    fill: dataset.config?.fill,
    tension: dataset.config?.tension,
    pointRadius: dataset.config?.pointRadius,
    pointHoverRadius: dataset.config?.pointHoverRadius,
  }));

  // Update options
  if (chartData.options) {
    chart.options = {
      responsive: chartData.options.responsive,
      maintainAspectRatio: chartData.options.maintainAspectRatio,
      animation: chartData.options.animation,
      plugins: chartData.options.plugins,
      scales: chartData.options.scales,
    };
  }

  chart.update();

  return chart;
}

/**
 * Destroy a chart instance
 *
 * @param canvasId - Canvas element ID
 */
export function destroyChart(canvasId: string): void {
  if (!canvasId) {
    return;
  }

  const chart = chartInstances.get(canvasId);

  if (chart) {
    chart.destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Destroy all chart instances
 */
export function destroyAllCharts(): void {
  for (const [canvasId, chart] of chartInstances.entries()) {
    chart.destroy();
    chartInstances.delete(canvasId);
  }
}

/**
 * Get chart instance by canvas ID
 *
 * @param canvasId - Canvas element ID
 * @returns Chart instance or undefined
 */
export function getChart(canvasId: string): Chart | undefined {
  return chartInstances.get(canvasId);
}

/**
 * Check if chart exists
 *
 * @param canvasId - Canvas element ID
 * @returns True if chart exists
 */
export function hasChart(canvasId: string): boolean {
  return chartInstances.has(canvasId);
}

/**
 * Get all chart instance IDs
 *
 * @returns Array of canvas IDs with active charts
 */
export function getAllChartIds(): string[] {
  return Array.from(chartInstances.keys());
}
