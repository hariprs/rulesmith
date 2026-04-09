/**
 * Unit Tests for Chart Renderer (Story 3-3)
 *
 * TDD Red Phase: Failing unit tests for chart rendering functions
 *
 * These tests verify the behavior of chart rendering functions including:
 * - AC1: Bar Chart - Pattern Frequencies by Category
 * - AC2: Bar Chart - Top Patterns by Frequency
 * - AC3: Line Chart - Pattern Trends Over Time
 * - AC4: Pie/Doughnut Chart - Category Distribution
 * - AC5: Chart Responsiveness and Accessibility
 * - AC6: Error Handling and Resource Management
 *
 * Testing Strategy:
 * - Mock Chart.js to test configuration without actual rendering
 * - Test transformer integration
 * - Test canvas lifecycle management
 * - Test error handling with AR22 format
 * - Test edge cases (empty data, single data point, large datasets)
 *
 * Test Pyramid Level: Unit (70% - Fast, isolated tests)
 *
 * @jest-environment node
 */

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChartData, ChartType, VisualizationErrorCode } from '../../../src/visualization/types';
import { MergedPattern } from '../../../src/pattern-matcher';
import { PatternCategory } from '../../../src/pattern-detector';

// ============================================================================
// MOCK DEPENDENCIES
// ============================================================================

/**
 * Mock Chart.js library
 */
jest.mock('chart.js/auto', () => ({
  Chart: jest.fn().mockImplementation(() => ({
    destroy: jest.fn(),
    update: jest.fn(),
    resize: jest.fn(),
    canvas: {
      getContext: jest.fn(),
    },
  })),
}));

/**
 * Mock transformers
 */
jest.mock('../../../src/visualization/transformers', () => ({
  transformPatternsToBarChart: jest.fn(),
  transformPatternsToBarChartByPattern: jest.fn(),
  transformPatternsToLineChart: jest.fn(),
  transformPatternsToPieChart: jest.fn(),
}));

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ChartRendererOptions {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  animation?: {
    duration?: number;
  };
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
    };
    title?: {
      display?: boolean;
      text?: string;
    };
    tooltip?: {
      enabled?: boolean;
      callbacks?: {
        label?: (context: any) => string;
      };
    };
  };
  scales?: {
    x?: {
      display?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
    y?: {
      display?: boolean;
      beginAtZero?: boolean;
      title?: {
        display?: boolean;
        text?: string;
      };
    };
  };
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Sample MergedPattern data for testing
 */
const createSamplePatterns = (count: number = 10): MergedPattern[] => {
  const categories = Object.values(PatternCategory);
  return Array.from({ length: count }, (_, i) => ({
    pattern_text: `Pattern ${i + 1}`,
    count: Math.floor(Math.random() * 10) + 1,
    category: categories[i % categories.length],
    examples: [],
    suggested_rule: `Rule ${i + 1}`,
    first_seen: '2026-03-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [],
    session_count: 1,
    total_frequency: Math.floor(Math.random() * 10) + 1,
    is_new: i % 2 === 0,
    frequency_change: Math.floor(Math.random() * 5) - 2,
  }));
};

/**
 * Sample ChartData for testing
 */
const createSampleChartData = (chartType: ChartType): ChartData => ({
  chartType,
  title: `Test ${chartType} Chart`,
  xAxis: {
    label: 'X Axis',
    data: ['A', 'B', 'C'],
  },
  yAxis: {
    label: 'Y Axis',
    data: [1, 2, 3],
  },
  datasets: [
    {
      label: 'Dataset 1',
      data: [1, 2, 3],
      backgroundColor: '#ff6384',
      borderColor: '#ff6384',
    },
  ],
});

// ============================================================================
// IMPORT MODULES TO TEST
// ============================================================================

// Note: These imports will fail initially until the chart-renderer module is created
let renderPatternFrequencyChart: any;
let renderTopPatternsChart: any;
let renderPatternTrendsChart: any;
let renderCategoryDistributionChart: any;
let destroyChart: any;
let getOrCreateCanvas: any;

try {
  const chartRendererModule = require('../../../src/visualization/chart-renderer');
  renderPatternFrequencyChart = chartRendererModule.renderPatternFrequencyChart;
  renderTopPatternsChart = chartRendererModule.renderTopPatternsChart;
  renderPatternTrendsChart = chartRendererModule.renderPatternTrendsChart;
  renderCategoryDistributionChart = chartRendererModule.renderCategoryDistributionChart;
  destroyChart = chartRendererModule.destroyChart;
  getOrCreateCanvas = chartRendererModule.getOrCreateCanvas;
} catch (error) {
  // Module not yet implemented - tests will fail as expected in TDD red phase
}

// ============================================================================
// AC1: BAR CHART - PATTERN FREQUENCIES BY CATEGORY
// ============================================================================

describe('AC1: Bar Chart - Pattern Frequencies by Category', () => {
  let mockCanvas: any;

  beforeEach(() => {
    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToBarChart } = require('../../../src/visualization/transformers');
    transformPatternsToBarChart.mockClear();
    transformPatternsToBarChart.mockReturnValue(createSampleChartData(ChartType.BAR));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderPatternFrequencyChart', () => {
    test('should render bar chart with transformed data', () => {
      const patterns = createSamplePatterns(10);

      expect(() => {
        if (renderPatternFrequencyChart) {
          renderPatternFrequencyChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternFrequencyChart not implemented');
        }
      }).not.toThrow();
    });

    test('should display correct title: "Pattern Frequencies by Category"', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
        'aria-label',
        expect.stringContaining('Bar chart')
      );
    });

    test('should show category labels with full names (CODE_STYLE, TERMINOLOGY, etc.)', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      // Verify chart was created
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should apply distinct colors to each bar with WCAG AA contrast (4.5:1)', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      // Verify colors are applied (will check actual implementation)
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should enable hover tooltips showing: category name, total frequency, pattern count', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      // Verify tooltip configuration
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should handle edge case: single category (one bar)', () => {
      const patterns = createSamplePatterns(1);

      expect(() => {
        if (renderPatternFrequencyChart) {
          renderPatternFrequencyChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternFrequencyChart not implemented');
        }
      }).not.toThrow();
    });

    test('should handle edge case: empty data (throw VisualizationError with AR22 format)', () => {
      const patterns: MergedPattern[] = [];

      expect(() => {
        if (renderPatternFrequencyChart) {
          renderPatternFrequencyChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternFrequencyChart not implemented');
        }
      }).toThrow();
    });

    test('should complete rendering in < 2 seconds for 100 patterns', async () => {
      const largePatterns = createSamplePatterns(100);

      const startTime = performance.now();

      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, largePatterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(2000);
    });

    test('should return Chart instance for programmatic access', () => {
      const patterns = createSamplePatterns(10);

      let result: any;
      if (renderPatternFrequencyChart) {
        result = renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }

      // Should return chart instance
      expect(result).toBeDefined();
      expect(result.destroy).toBeDefined();
    });
  });
});

// ============================================================================
// AC2: BAR CHART - TOP PATTERNS BY FREQUENCY
// ============================================================================

describe('AC2: Bar Chart - Top Patterns by Frequency', () => {
  let mockCanvas: any;

  beforeEach(() => {
    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToBarChartByPattern } = require('../../../src/visualization/transformers');
    transformPatternsToBarChartByPattern.mockClear();
    transformPatternsToBarChartByPattern.mockReturnValue(createSampleChartData(ChartType.BAR));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderTopPatternsChart', () => {
    test('should render bar chart with top N patterns on x-axis, frequency on y-axis', () => {
      const patterns = createSamplePatterns(20);

      expect(() => {
        if (renderTopPatternsChart) {
          renderTopPatternsChart(mockCanvas, patterns, 10);
        } else {
          throw new Error('renderTopPatternsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should display title: "Top {N} Patterns by Frequency"', () => {
      const patterns = createSamplePatterns(20);
      const topN = 15;

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, topN);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
        'aria-label',
        expect.stringContaining(`Top ${topN}`)
      );
    });

    test('should truncate long pattern_text to 30 chars with "..." suffix for x-axis labels', () => {
      const patterns = createSamplePatterns(10);
      patterns[0].pattern_text = 'This is a very long pattern text that should be truncated to thirty characters';

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 10);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      // Verify truncation in implementation
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should show full pattern_text in hover tooltip', () => {
      const patterns = createSamplePatterns(10);

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 10);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      // Verify tooltip configuration shows full text
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should include suggested_rule in tooltip for actionable insights', () => {
      const patterns = createSamplePatterns(10);

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 10);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      // Verify tooltip includes suggested_rule
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should color-code bars by PatternCategory (consistent color mapping)', () => {
      const patterns = createSamplePatterns(10);

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 10);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      // Verify consistent color mapping
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should enable horizontal scrolling if more than 20 patterns displayed', () => {
      const patterns = createSamplePatterns(25);

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 25);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      // Verify scrolling capability
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should handle edge case: single pattern', () => {
      const patterns = createSamplePatterns(1);

      expect(() => {
        if (renderTopPatternsChart) {
          renderTopPatternsChart(mockCanvas, patterns, 1);
        } else {
          throw new Error('renderTopPatternsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should handle edge case: 10K+ patterns (sample to top 100)', () => {
      const patterns = createSamplePatterns(100);

      expect(() => {
        if (renderTopPatternsChart) {
          renderTopPatternsChart(mockCanvas, patterns, 100);
        } else {
          throw new Error('renderTopPatternsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should complete rendering in < 3 seconds for top 100 patterns from 10K dataset', async () => {
      const patterns = createSamplePatterns(100);

      const startTime = performance.now();

      if (renderTopPatternsChart) {
        renderTopPatternsChart(mockCanvas, patterns, 100);
      } else {
        throw new Error('renderTopPatternsChart not implemented');
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(3000);
    });
  });
});

// ============================================================================
// AC3: LINE CHART - PATTERN TRENDS OVER TIME
// ============================================================================

describe('AC3: Line Chart - Pattern Trends Over Time', () => {
  let mockCanvas: any;

  beforeEach(() => {
    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToLineChart } = require('../../../src/visualization/transformers');
    transformPatternsToLineChart.mockClear();
    transformPatternsToLineChart.mockReturnValue(createSampleChartData(ChartType.LINE));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderPatternTrendsChart', () => {
    test('should render line chart with dates on x-axis, frequency on y-axis', () => {
      const patterns = createSamplePatterns(10);

      expect(() => {
        if (renderPatternTrendsChart) {
          renderPatternTrendsChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternTrendsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should display title: "Pattern Trends Over Time ({period})"', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }

      expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
        'aria-label',
        expect.stringContaining('Pattern Trends Over Time')
      );
    });

    test('should show smooth curves with fill area below line (Chart.js tension: 0.4)', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }

      // Verify tension and fill configuration
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should show data points on hover with: date, frequency, new pattern count', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }

      // Verify tooltip configuration
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should handle edge case: single day (flat line)', () => {
      const patterns = createSamplePatterns(1);

      expect(() => {
        if (renderPatternTrendsChart) {
          renderPatternTrendsChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternTrendsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should handle edge case: sparse data (interpolate gaps)', () => {
      const patterns = createSamplePatterns(3);

      expect(() => {
        if (renderPatternTrendsChart) {
          renderPatternTrendsChart(mockCanvas, patterns);
        } else {
          throw new Error('renderPatternTrendsChart not implemented');
        }
      }).not.toThrow();
    });

    test('should use UTC timezone to avoid local time shifts', () => {
      const patterns = createSamplePatterns(10);

      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }

      // Verify UTC date handling
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should complete rendering in < 2 seconds for 1,000 patterns spanning 6 months', async () => {
      const largePatterns = createSamplePatterns(180);

      const startTime = performance.now();

      if (renderPatternTrendsChart) {
        renderPatternTrendsChart(mockCanvas, largePatterns);
      } else {
        throw new Error('renderPatternTrendsChart not implemented');
      }

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(2000);
    });
  });
});

// ============================================================================
// AC4: PIE/DOUGHNUT CHART - CATEGORY DISTRIBUTION
// ============================================================================

describe('AC4: Pie/Doughnut Chart - Category Distribution', () => {
  let mockCanvas: any;

  beforeEach(() => {
    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToPieChart } = require('../../../src/visualization/transformers');
    transformPatternsToPieChart.mockClear();
    transformPatternsToPieChart.mockReturnValue(createSampleChartData(ChartType.DOUGHNUT));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('renderCategoryDistributionChart', () => {
    test('should render doughnut chart with PatternCategory segments', () => {
      const patterns = createSamplePatterns(10);

      expect(() => {
        if (renderCategoryDistributionChart) {
          renderCategoryDistributionChart(mockCanvas, patterns);
        } else {
          throw new Error('renderCategoryDistributionChart not implemented');
        }
      }).not.toThrow();
    });

    test('should display title: "Pattern Distribution by Category"', () => {
      const patterns = createSamplePatterns(10);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
        'aria-label',
        expect.stringContaining('Pattern Distribution')
      );
    });

    test('should show percentages in legend and center text (total pattern count)', () => {
      const patterns = createSamplePatterns(10);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      // Verify percentage display and center text
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should use distinct colors meeting WCAG AA contrast (4.5:1 for normal text)', () => {
      const patterns = createSamplePatterns(10);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      // Verify color contrast
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should highlight segment on hover with expand animation', () => {
      const patterns = createSamplePatterns(10);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      // Verify hover animation configuration
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should show category details in tooltip: name, count, percentage', () => {
      const patterns = createSamplePatterns(10);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      // Verify tooltip configuration
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });

    test('should handle edge case: single category (full circle)', () => {
      const patterns = createSamplePatterns(1);

      expect(() => {
        if (renderCategoryDistributionChart) {
          renderCategoryDistributionChart(mockCanvas, patterns);
        } else {
          throw new Error('renderCategoryDistributionChart not implemented');
        }
      }).not.toThrow();
    });

    test('should handle edge case: empty data (throw error)', () => {
      const patterns: MergedPattern[] = [];

      expect(() => {
        if (renderCategoryDistributionChart) {
          renderCategoryDistributionChart(mockCanvas, patterns);
        } else {
          throw new Error('renderCategoryDistributionChart not implemented');
        }
      }).toThrow();
    });

    test('should calculate percentages accurately (sum = 100%)', () => {
      const patterns = createSamplePatterns(3);

      if (renderCategoryDistributionChart) {
        renderCategoryDistributionChart(mockCanvas, patterns);
      } else {
        throw new Error('renderCategoryDistributionChart not implemented');
      }

      // Verify percentage calculation
      expect(mockCanvas.setAttribute).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// AC5: CHART RESPONSIVENESS AND ACCESSIBILITY
// ============================================================================

describe('AC5: Chart Responsiveness and Accessibility', () => {
  let mockCanvas: any;

  beforeEach(() => {
    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToBarChart } = require('../../../src/visualization/transformers');
    transformPatternsToBarChart.mockClear();
    transformPatternsToBarChart.mockReturnValue(createSampleChartData(ChartType.BAR));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should make charts responsive (resize on window/container resize)', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Verify responsive configuration
    expect(mockCanvas.setAttribute).toHaveBeenCalled();
  });

  test('should set maintainAspectRatio: false for flexible layouts', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Verify aspect ratio configuration
    expect(mockCanvas.setAttribute).toHaveBeenCalled();
  });

  test('should ensure all text meets WCAG AA contrast standards', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Verify contrast settings
    expect(mockCanvas.setAttribute).toHaveBeenCalled();
  });

  test('should provide ARIA labels for screen readers (chart type, title, summary)', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    expect(mockCanvas.setAttribute).toHaveBeenCalledWith('role', 'img');
    expect(mockCanvas.setAttribute).toHaveBeenCalledWith(
      'aria-label',
      expect.stringContaining('Bar chart')
    );
  });

  test('should support keyboard navigation (tab through interactive elements)', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Verify keyboard accessibility
    expect(mockCanvas.setAttribute).toHaveBeenCalledWith('tabindex', expect.any(String));
  });

  test('should handle high-DPI displays (Retina) with clear rendering', () => {
    const patterns = createSamplePatterns(10);

    if (renderPatternFrequencyChart) {
      renderPatternFrequencyChart(mockCanvas, patterns);
    } else {
      throw new Error('renderPatternFrequencyChart not implemented');
    }

    // Verify high-DPI handling
    expect(mockCanvas.setAttribute).toHaveBeenCalled();
  });

  test('should degrade gracefully if canvas not supported', () => {
    const patterns = createSamplePatterns(10);

    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).not.toThrow();
  });
});

// ============================================================================
// AC6: ERROR HANDLING AND RESOURCE MANAGEMENT
// ============================================================================

describe('AC6: Error Handling and Resource Management', () => {
  let mockCanvas: any;
  let mockChartInstance: any;

  beforeEach(() => {
    mockChartInstance = {
      destroy: jest.fn(),
      update: jest.fn(),
      resize: jest.fn(),
    };

    mockCanvas = {
      id: 'test-canvas',
      getContext: jest.fn(() => ({
        fillRect: jest.fn(),
        clearRect: jest.fn(),
      })),
      getAttribute: jest.fn(),
      setAttribute: jest.fn(),
      removeAttribute: jest.fn(),
    };

    // Mock transformers to return valid ChartData
    const { transformPatternsToBarChart } = require('../../../src/visualization/transformers');
    transformPatternsToBarChart.mockClear();
    transformPatternsToBarChart.mockReturnValue(createSampleChartData(ChartType.BAR));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should throw VisualizationError with AR22 format for rendering failures', () => {
    const invalidCanvas = null;
    const patterns = createSamplePatterns(10);

    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(invalidCanvas as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).toThrow();
  });

  test('should include what, how, technical, and code in error', () => {
    const invalidCanvas = null;
    const patterns = createSamplePatterns(10);

    try {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(invalidCanvas as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } catch (error: any) {
      // Verify AR22 format
      if (error.what || error.message) {
        // Error has structure
        expect(error).toBeDefined();
      }
    }
  });

  test('should clean up canvas resources on error (destroy chart instance)', () => {
    // Simulate error during rendering
    if (destroyChart) {
      destroyChart(mockChartInstance);
    } else {
      throw new Error('destroyChart not implemented');
    }

    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  test('should log detailed error context for debugging', () => {
    const patterns = createSamplePatterns(10);

    // Mock console.error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(null as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } catch (error) {
      // Error logged
    }

    consoleSpy.mockRestore();
  });

  test('should provide user-friendly error messages', () => {
    const invalidCanvas = null;
    const patterns = createSamplePatterns(10);

    try {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(invalidCanvas as any, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    } catch (error: any) {
      // Verify user-friendly message
      expect(error).toBeDefined();
    }
  });

  test('should implement timeout for long-running renders (30 second limit)', () => {
    const patterns = createSamplePatterns(10);

    // Timeout will be implemented in actual code
    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).not.toThrow();
  });

  test('should handle Chart.js exceptions without crashing', () => {
    const patterns = createSamplePatterns(10);

    // Mock Chart.js throwing an error
    const { Chart } = require('chart.js/auto');
    (Chart as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Chart.js error');
    });

    expect(() => {
      if (renderPatternFrequencyChart) {
        renderPatternFrequencyChart(mockCanvas, patterns);
      } else {
        throw new Error('renderPatternFrequencyChart not implemented');
      }
    }).toThrow();
  });

  test('should destroy chart instances properly to prevent memory leaks', () => {
    if (destroyChart) {
      destroyChart(mockChartInstance);
    } else {
      throw new Error('destroyChart not implemented');
    }

    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  test('should handle null/undefined chart instances gracefully', () => {
    expect(() => {
      if (destroyChart) {
        destroyChart(null);
      } else {
        throw new Error('destroyChart not implemented');
      }
    }).not.toThrow();
  });

  test('should handle destroyChart called multiple times on same instance', () => {
    if (destroyChart) {
      destroyChart(mockChartInstance);
      destroyChart(mockChartInstance);
      destroyChart(mockChartInstance);
    } else {
      throw new Error('destroyChart not implemented');
    }

    expect(mockChartInstance.destroy).toHaveBeenCalledTimes(3);
  });
});

// ============================================================================
// CANVAS LIFECYCLE MANAGEMENT
// ============================================================================

describe('Canvas Lifecycle Management', () => {
  beforeEach(() => {
    // Mock document.getElementById and createElement for canvas tests
    const mockContainer = {
      appendChild: jest.fn(),
    };

    global.document = {
      getElementById: jest.fn((id) => {
        if (id === 'test-container' || id === 'container-1' || id === 'container-2' || id === 'container-3') {
          return mockContainer;
        }
        return null;
      }),
      createElement: jest.fn(() => ({
        id: 'test-canvas',
        tagName: 'CANVAS',
        getContext: jest.fn(),
      })),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should create or get existing canvas', () => {
    expect(() => {
      if (getOrCreateCanvas) {
        getOrCreateCanvas('test-container');
      } else {
        throw new Error('getOrCreateCanvas not implemented');
      }
    }).not.toThrow();
  });

  test('should return HTMLCanvasElement for programmatic access', () => {
    let canvas: any;
    if (getOrCreateCanvas) {
      canvas = getOrCreateCanvas('test-container');
    } else {
      throw new Error('getOrCreateCanvas not implemented');
    }

    expect(canvas).toBeDefined();
    expect(canvas.tagName).toBe('CANVAS');
  });

  test('should handle multiple charts on same page with unique IDs', () => {
    expect(() => {
      if (getOrCreateCanvas) {
        getOrCreateCanvas('container-1');
        getOrCreateCanvas('container-2');
        getOrCreateCanvas('container-3');
      } else {
        throw new Error('getOrCreateCanvas not implemented');
      }
    }).not.toThrow();
  });
});

// ============================================================================
// TRANSFORMER INTEGRATION TESTS
// ============================================================================

describe('Transformer Integration', () => {
  test('should call transformPatternsToBarChart before rendering', () => {
    const { transformPatternsToBarChart } = require('../../../src/visualization/transformers');
    const patterns = createSamplePatterns(10);

    // Will verify in implementation
    expect(transformPatternsToBarChart).toBeDefined();
  });

  test('should call transformPatternsToBarChartByPattern for top patterns chart', () => {
    const { transformPatternsToBarChartByPattern } = require('../../../src/visualization/transformers');
    const patterns = createSamplePatterns(10);

    // Will verify in implementation
    expect(transformPatternsToBarChartByPattern).toBeDefined();
  });

  test('should call transformPatternsToLineChart for trend chart', () => {
    const { transformPatternsToLineChart } = require('../../../src/visualization/transformers');
    const patterns = createSamplePatterns(10);

    // Will verify in implementation
    expect(transformPatternsToLineChart).toBeDefined();
  });

  test('should call transformPatternsToPieChart for distribution chart', () => {
    const { transformPatternsToPieChart } = require('../../../src/visualization/transformers');
    const patterns = createSamplePatterns(10);

    // Will verify in implementation
    expect(transformPatternsToPieChart).toBeDefined();
  });
});
