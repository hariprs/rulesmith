/**
 * Bar Chart Component (Story 3-1)
 *
 * Wrapper component for rendering bar charts using Chart.js.
 * Handles chart creation, updates, and cleanup.
 *
 * @module visualization/charts/bar-chart
 */

import { Chart } from 'chart.js/auto';
import { ChartData } from '../types';
import { createChart, updateChart, destroyChart } from '../lib/chart-factory';

// ============================================================================
// BAR CHART RENDERING
// ============================================================================

/**
 * Render a bar chart
 *
 * @param canvasId - Canvas element ID
 * @param chartData - Chart data from transformer
 * @returns Chart instance
 */
export function renderBarChart(canvasId: string, chartData: ChartData): Chart {
  if (!chartData || !chartData.xAxis || !chartData.yAxis || !chartData.datasets) {
    throw new Error('Invalid chart data: missing required fields');
  }

  return createChart(canvasId, chartData);
}

/**
 * Update a bar chart with new data
 *
 * @param canvasId - Canvas element ID
 * @param chartData - New chart data
 * @returns Updated chart instance
 */
export function updateBarChart(canvasId: string, chartData: ChartData): Chart {
  if (!canvasId || !chartData || !chartData.xAxis || !chartData.yAxis || !chartData.datasets) {
    throw new Error('Invalid chart data or canvas ID: missing required fields');
  }
  return updateChart(canvasId, chartData);
}

/**
 * Destroy a bar chart
 *
 * @param canvasId - Canvas element ID
 */
export function destroyBarChart(canvasId: string): void {
  if (!canvasId) {
    console.warn('destroyBarChart called with empty canvasId');
    return;
  }
  destroyChart(canvasId);
}

/**
 * Render empty state for bar chart
 *
 * @param canvasId - Canvas element ID
 * @param message - Empty state message
 */
export function renderBarChartEmptyState(canvasId: string, message: string): void {
  if (!canvasId) {
    console.warn('renderBarChartEmptyState called with empty canvasId');
    return;
  }

  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

  if (!canvas) {
    console.error(`Canvas element not found: ${canvasId}`);
    return;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Failed to get canvas context');
    return;
  }

  // Validate canvas dimensions
  if (canvas.width <= 0 || canvas.height <= 0) {
    console.error('Canvas has invalid dimensions');
    return;
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw empty state message
  ctx.fillStyle = '#999';
  ctx.font = '16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  ctx.fillText(message || 'No patterns to display', centerX, centerY);

  console.log('Bar chart empty state rendered:', message);
}
