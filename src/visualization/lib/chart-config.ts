/**
 * Chart Configuration (Story 3-1)
 *
 * Default chart configurations for different chart types.
 * Provides consistent styling and behavior across all visualizations.
 *
 * @module visualization/lib/chart-config
 */

import { ChartOptions, VisualizationConfig } from '../types';

// ============================================================================
// DEFAULT CHART OPTIONS
// ============================================================================

/**
 * Get default chart options
 *
 * @param chartType - Chart type
 * @param config - Visualization configuration
 * @returns Default chart options
 */
export function getDefaultOptions(
  chartType: string,
  config: VisualizationConfig = {}
): ChartOptions {
  if (!chartType) {
    console.warn('getDefaultOptions called with empty chartType, using default options');
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 750, onStartup: true },
      plugins: {
        title: { display: true, text: 'Chart', font: { size: 16, weight: 'bold', family: 'Arial, sans-serif' }, color: '#333' },
        legend: { display: true, position: 'top', align: 'center' },
        tooltip: { enabled: true, mode: 'nearest', intersect: true },
      },
    };
  }

  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: config.animate !== false ? 750 : 0,
      onStartup: config.animate !== false,
    },
    plugins: {
      title: {
        display: true,
        text: 'Chart Title',
        font: {
          size: 16,
          weight: 'bold',
          family: 'Arial, sans-serif',
        },
        color: '#333',
      },
      legend: {
        display: true,
        position: 'top',
        align: 'center',
      },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: true,
      },
    },
  };

  // Chart type specific options
  switch (chartType) {
    case 'bar':
    case 'line':
      return {
        ...baseOptions,
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'X-Axis Label',
            },
          },
          y: {
            display: true,
            beginAtZero: true,
            title: {
              display: true,
              text: 'Y-Axis Label',
            },
          },
        },
      };

    case 'pie':
    case 'doughnut':
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          legend: {
            display: true,
            position: 'right',
            align: 'center',
          },
        },
      };

    case 'radar':
      return {
        ...baseOptions,
        scales: {
          x: {
            display: false,
          },
          y: {
            display: true,
            beginAtZero: true,
          },
        },
      };

    default:
      return baseOptions;
  }
}

/**
 * Get bar chart specific options
 *
 * @param title - Chart title
 * @param xAxisLabel - X-axis label
 * @param yAxisLabel - Y-axis label
 * @returns Bar chart options
 */
export function getBarChartOptions(
  title: string,
  xAxisLabel: string,
  yAxisLabel: string
): ChartOptions {
  if (!title) title = 'Chart';
  if (!xAxisLabel) xAxisLabel = 'X-Axis';
  if (!yAxisLabel) yAxisLabel = 'Y-Axis';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
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
          text: xAxisLabel,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel,
        },
      },
    },
  };
}

/**
 * Get line chart specific options
 *
 * @param title - Chart title
 * @param xAxisLabel - X-axis label
 * @param yAxisLabel - Y-axis label
 * @returns Line chart options
 */
export function getLineChartOptions(
  title: string,
  xAxisLabel: string,
  yAxisLabel: string
): ChartOptions {
  if (!title) title = 'Chart';
  if (!xAxisLabel) xAxisLabel = 'X-Axis';
  if (!yAxisLabel) yAxisLabel = 'Y-Axis';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
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
          text: xAxisLabel,
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel,
        },
      },
    },
  };
}

/**
 * Get pie chart specific options
 *
 * @param title - Chart title
 * @returns Pie chart options
 */
export function getPieChartOptions(title: string): ChartOptions {
  if (!title) title = 'Chart';

  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: title,
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
      },
    },
  };
}

/**
 * Get default color palette
 *
 * @returns Color palette object
 */
export function getDefaultColors() {
  return {
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
}

/**
 * Get color for category
 *
 * @param category - Pattern category
 * @returns Color object with background and border colors
 */
export function getColorForCategory(category: string): { background: string; border: string } {
  if (!category) {
    console.warn('getColorForCategory called with empty category, using default color');
    return { background: 'rgba(128, 128, 128, 0.8)', border: 'rgba(128, 128, 128, 1)' };
  }

  const colors = getDefaultColors();

  if (!colors.background?.length || !colors.border?.length) {
    console.error('Default colors array is empty');
    return { background: 'rgba(128, 128, 128, 0.8)', border: 'rgba(128, 128, 128, 1)' };
  }

  const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const index = hash % colors.background.length;

  return {
    background: colors.background[index] || 'rgba(128, 128, 128, 0.8)',
    border: colors.border[index] || 'rgba(128, 128, 128, 1)',
  };
}
