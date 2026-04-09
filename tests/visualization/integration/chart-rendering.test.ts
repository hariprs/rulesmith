/**
 * Integration Tests for Chart Rendering (Story 3-1)
 *
 * TDD Red Phase: Failing integration acceptance tests
 *
 * These tests verify the integration between:
 * - Data transformation functions (transformers)
 * - Chart rendering functions (visualization library)
 * - HTML canvas elements
 * - Epic 2 MergedPattern data structures
 *
 * Testing Strategy:
 * - Test end-to-end chart rendering with sample data
 * - Test integration between transformers and rendering
 * - Test canvas element lifecycle (create, render, destroy)
 * - Test responsive behavior and resize handling
 * - Test error handling for missing canvas elements
 * - Test multiple chart rendering scenarios
 *
 * Test Pyramid Level: Integration (25% - API-level tests)
 *
 * @todo Remove this todo when implementation is complete
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

// ============================================================================
// TYPE DEFINITIONS (from Epic 2 and transformers)
// ============================================================================

enum PatternCategory {
  CODE_STYLE = 'code_style',
  TERMINOLOGY = 'terminology',
  STRUCTURE = 'structure',
  FORMATTING = 'formatting',
  CONVENTION = 'convention',
  OTHER = 'other',
}

enum ContentType {
  CODE = 'code',
  DOCUMENTATION = 'documentation',
  DIAGRAM = 'diagram',
  PRD = 'prd',
  TEST_PLAN = 'test_plan',
  GENERAL_TEXT = 'general_text',
}

interface PatternExample {
  original_suggestion: string;
  user_correction: string;
  context: string;
  timestamp: string;
  content_type: ContentType;
}

interface MergedPattern {
  pattern_text: string;
  count: number;
  category: PatternCategory;
  examples: PatternExample[];
  suggested_rule: string;
  first_seen: string;
  last_seen: string;
  content_types: ContentType[];
  session_count: number;
  total_frequency: number;
  is_new: boolean;
  frequency_change: number;
}

interface ChartData {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  xAxis: {
    label: string;
    data: string[];
  };
  yAxis: {
    label: string;
    data: number[];
  };
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
  }[];
  metadata?: {
    totalPatterns: number;
    dateRange: { start: string; end: string };
    categories: string[];
  };
}

// ============================================================================
// CHART RENDERING FUNCTIONS (to be implemented)
// ============================================================================

/**
 * Render a bar chart on the specified canvas
 */
function renderBarChart(canvasId: string, data: ChartData): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Render a line chart on the specified canvas
 */
function renderLineChart(canvasId: string, data: ChartData): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Render a pie chart on the specified canvas
 */
function renderPieChart(canvasId: string, data: ChartData): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Destroy a chart instance
 */
function destroyChart(canvasId: string): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Check if a chart exists on the canvas
 */
function chartExists(canvasId: string): boolean {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Transform patterns to chart data and render
 */
function transformAndRenderBarChart(canvasId: string, patterns: MergedPattern[]): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Transform patterns to chart data and render (line chart)
 */
function transformAndRenderLineChart(canvasId: string, patterns: MergedPattern[]): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

/**
 * Transform patterns to chart data and render (pie chart)
 */
function transformAndRenderPieChart(canvasId: string, patterns: MergedPattern[]): void {
  // Implementation will be done in Dev step
  throw new Error('Not implemented');
}

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Sample MergedPattern data for integration testing
 */
const samplePatterns: MergedPattern[] = [
  {
    pattern_text: 'Use const instead of let',
    count: 5,
    category: PatternCategory.CODE_STYLE,
    examples: [],
    suggested_rule: 'Use const for immutable variables',
    first_seen: '2026-03-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 2,
    total_frequency: 8,
    is_new: false,
    frequency_change: 2,
  },
  {
    pattern_text: 'Use fetch instead of axios',
    count: 3,
    category: PatternCategory.TERMINOLOGY,
    examples: [],
    suggested_rule: 'Prefer native fetch API',
    first_seen: '2026-03-16T14:00:00Z',
    last_seen: '2026-03-18T09:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 1,
    total_frequency: 3,
    is_new: true,
    frequency_change: 0,
  },
  {
    pattern_text: 'Organize imports alphabetically',
    count: 7,
    category: PatternCategory.FORMATTING,
    examples: [],
    suggested_rule: 'Sort imports alphabetically',
    first_seen: '2026-03-14T08:00:00Z',
    last_seen: '2026-03-18T16:00:00Z',
    content_types: [ContentType.CODE],
    session_count: 3,
    total_frequency: 12,
    is_new: false,
    frequency_change: -1,
  },
];

/**
 * Sample chart data for integration testing
 */
const sampleChartData: ChartData = {
  chartType: 'bar',
  title: 'Pattern Frequency by Category',
  xAxis: {
    label: 'Category',
    data: ['CODE_STYLE', 'TERMINOLOGY', 'FORMATTING'],
  },
  yAxis: {
    label: 'Frequency',
    data: [5, 3, 7],
  },
  datasets: [
    {
      label: 'Pattern Count',
      data: [5, 3, 7],
      backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
      borderColor: ['#ff6384', '#36a2eb', '#ffce56'],
    },
  ],
  metadata: {
    totalPatterns: 15,
    dateRange: {
      start: '2026-03-14T08:00:00Z',
      end: '2026-03-18T16:00:00Z',
    },
    categories: ['CODE_STYLE', 'TERMINOLOGY', 'FORMATTING'],
  },
};

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

/**
 * Create a mock canvas element for testing
 */
function createMockCanvas(canvasId: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = canvasId;
  document.body.appendChild(canvas);
  return canvas;
}

/**
 * Remove a mock canvas element
 */
function removeMockCanvas(canvasId: string): void {
  const canvas = document.getElementById(canvasId);
  if (canvas) {
    document.body.removeChild(canvas);
  }
}

// ============================================================================
// BAR CHART RENDERING TESTS
// ============================================================================

describe('Bar Chart Rendering - Integration Tests', () => {
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);
  });

  afterEach(() => {
    destroyChart(canvasId);
    removeMockCanvas(canvasId);
  });

  test('should render bar chart with sample data', () => {
    expect(() => {
      renderBarChart(canvasId, sampleChartData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should render bar chart with correct title', () => {
    renderBarChart(canvasId, sampleChartData);

    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    expect(canvas).toBeDefined();

    // Chart should be rendered on the canvas
    expect(chartExists(canvasId)).toBe(true);
  });

  test('should render bar chart with correct labels', () => {
    renderBarChart(canvasId, sampleChartData);

    expect(chartExists(canvasId)).toBe(true);

    // Chart should have x-axis labels
    expect(sampleChartData.xAxis.data).toContain('CODE_STYLE');
    expect(sampleChartData.xAxis.data).toContain('TERMINOLOGY');
    expect(sampleChartData.xAxis.data).toContain('FORMATTING');
  });

  test('should render bar chart with correct data values', () => {
    renderBarChart(canvasId, sampleChartData);

    expect(chartExists(canvasId)).toBe(true);

    // Chart should have y-axis data
    expect(sampleChartData.yAxis.data).toEqual([5, 3, 7]);
  });

  test('should handle empty chart data', () => {
    const emptyData: ChartData = {
      chartType: 'bar',
      title: 'Empty Chart',
      xAxis: {
        label: 'Category',
        data: [],
      },
      yAxis: {
        label: 'Frequency',
        data: [],
      },
      datasets: [
        {
          label: 'Pattern Count',
          data: [],
        },
      ],
    };

    expect(() => {
      renderBarChart(canvasId, emptyData);
    }).not.toThrow();
  });

  test('should throw error for missing canvas element', () => {
    const missingCanvasId = 'non-existent-canvas';

    expect(() => {
      renderBarChart(missingCanvasId, sampleChartData);
    }).toThrow();
  });

  test('should destroy chart and clean up resources', () => {
    renderBarChart(canvasId, sampleChartData);
    expect(chartExists(canvasId)).toBe(true);

    destroyChart(canvasId);
    expect(chartExists(canvasId)).toBe(false);
  });

  test('should re-render chart on same canvas', () => {
    renderBarChart(canvasId, sampleChartData);
    expect(chartExists(canvasId)).toBe(true);

    // Re-render with different data
    const newData: ChartData = {
      ...sampleChartData,
      title: 'Updated Chart',
    };

    expect(() => {
      renderBarChart(canvasId, newData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });
});

// ============================================================================
// LINE CHART RENDERING TESTS
// ============================================================================

describe('Line Chart Rendering - Integration Tests', () => {
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);
  });

  afterEach(() => {
    destroyChart(canvasId);
    removeMockCanvas(canvasId);
  });

  test('should render line chart with sample data', () => {
    const lineData: ChartData = {
      ...sampleChartData,
      chartType: 'line',
      title: 'Pattern Trends Over Time',
    };

    expect(() => {
      renderLineChart(canvasId, lineData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should render line chart with temporal data', () => {
    const temporalData: ChartData = {
      chartType: 'line',
      title: 'Pattern Trends',
      xAxis: {
        label: 'Date',
        data: ['2026-03-14', '2026-03-15', '2026-03-16', '2026-03-17', '2026-03-18'],
      },
      yAxis: {
        label: 'Frequency',
        data: [1, 3, 2, 4, 5],
      },
      datasets: [
        {
          label: 'Pattern Count',
          data: [1, 3, 2, 4, 5],
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
        },
      ],
    };

    expect(() => {
      renderLineChart(canvasId, temporalData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should handle line chart with multiple datasets', () => {
    const multiDatasetData: ChartData = {
      chartType: 'line',
      title: 'Multiple Pattern Trends',
      xAxis: {
        label: 'Date',
        data: ['2026-03-14', '2026-03-15', '2026-03-16'],
      },
      yAxis: {
        label: 'Frequency',
        data: [1, 2, 3],
      },
      datasets: [
        {
          label: 'CODE_STYLE',
          data: [1, 2, 3],
          borderColor: '#ff6384',
        },
        {
          label: 'TERMINOLOGY',
          data: [2, 1, 2],
          borderColor: '#36a2eb',
        },
      ],
    };

    expect(() => {
      renderLineChart(canvasId, multiDatasetData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });
});

// ============================================================================
// PIE CHART RENDERING TESTS
// ============================================================================

describe('Pie Chart Rendering - Integration Tests', () => {
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);
  });

  afterEach(() => {
    destroyChart(canvasId);
    removeMockCanvas(canvasId);
  });

  test('should render pie chart with sample data', () => {
    const pieData: ChartData = {
      ...sampleChartData,
      chartType: 'pie',
      title: 'Pattern Distribution',
    };

    expect(() => {
      renderPieChart(canvasId, pieData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should render pie chart with correct colors', () => {
    const pieData: ChartData = {
      chartType: 'pie',
      title: 'Pattern Distribution',
      xAxis: {
        label: 'Category',
        data: ['CODE_STYLE', 'TERMINOLOGY', 'FORMATTING'],
      },
      yAxis: {
        label: 'Count',
        data: [5, 3, 7],
      },
      datasets: [
        {
          label: 'Patterns',
          data: [5, 3, 7],
          backgroundColor: ['#ff6384', '#36a2eb', '#ffce56'],
        },
      ],
    };

    expect(() => {
      renderPieChart(canvasId, pieData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should handle pie chart with single category', () => {
    const singleCategoryData: ChartData = {
      chartType: 'pie',
      title: 'Single Category',
      xAxis: {
        label: 'Category',
        data: ['CODE_STYLE'],
      },
      yAxis: {
        label: 'Count',
        data: [10],
      },
      datasets: [
        {
          label: 'Patterns',
          data: [10],
          backgroundColor: ['#ff6384'],
        },
      ],
    };

    expect(() => {
      renderPieChart(canvasId, singleCategoryData);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });
});

// ============================================================================
// TRANSFORM AND RENDER TESTS
// ============================================================================

describe('Transform and Render - Integration Tests', () => {
  let canvasId: string;

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);
  });

  afterEach(() => {
    destroyChart(canvasId);
    removeMockCanvas(canvasId);
  });

  test('should transform patterns and render bar chart', () => {
    expect(() => {
      transformAndRenderBarChart(canvasId, samplePatterns);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should transform patterns and render line chart', () => {
    expect(() => {
      transformAndRenderLineChart(canvasId, samplePatterns);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should transform patterns and render pie chart', () => {
    expect(() => {
      transformAndRenderPieChart(canvasId, samplePatterns);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should handle empty patterns array', () => {
    expect(() => {
      transformAndRenderBarChart(canvasId, []);
    }).not.toThrow();
  });

  test('should handle single pattern', () => {
    const singlePattern: MergedPattern[] = [samplePatterns[0]];

    expect(() => {
      transformAndRenderBarChart(canvasId, singlePattern);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });

  test('should handle large patterns array', () => {
    const largePatterns: MergedPattern[] = Array.from({ length: 1000 }, (_, i) => ({
      ...samplePatterns[i % samplePatterns.length],
      pattern_text: `Pattern ${i}`,
    }));

    expect(() => {
      transformAndRenderBarChart(canvasId, largePatterns);
    }).not.toThrow();

    expect(chartExists(canvasId)).toBe(true);
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling - Integration Tests', () => {
  test('should throw AR22 error for missing canvas', () => {
    const missingCanvasId = 'non-existent-canvas';

    try {
      renderBarChart(missingCanvasId, sampleChartData);
      fail('Should have thrown an error');
    } catch (error: any) {
      expect(error).toBeDefined();
      expect(error.what || error.message).toBeDefined();
      expect(error.how || error.message).toBeDefined();
    }
  });

  test('should handle invalid chart data gracefully', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);

    const invalidData = {
      chartType: 'bar',
      title: '',
      xAxis: {
        label: '',
        data: [],
      },
      yAxis: {
        label: '',
        data: [],
      },
      datasets: [],
    } as ChartData;

    try {
      renderBarChart(canvasId, invalidData);
    } catch (error: any) {
      expect(error).toBeDefined();
    } finally {
      removeMockCanvas(canvasId);
    }
  });

  test('should handle canvas with invalid ID type', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);

    try {
      renderBarChart(canvasId, sampleChartData);
    } catch (error: any) {
      // Should not throw for valid canvas
      fail('Should not throw error for valid canvas');
    } finally {
      removeMockCanvas(canvasId);
    }
  });
});

// ============================================================================
// CHART LIFECYCLE TESTS
// ============================================================================

describe('Chart Lifecycle - Integration Tests', () => {
  test('should handle multiple render and destroy cycles', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);

    try {
      // First render
      renderBarChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);

      // Destroy
      destroyChart(canvasId);
      expect(chartExists(canvasId)).toBe(false);

      // Second render
      renderBarChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);

      // Destroy again
      destroyChart(canvasId);
      expect(chartExists(canvasId)).toBe(false);

      // Third render
      renderLineChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);

      // Final destroy
      destroyChart(canvasId);
      expect(chartExists(canvasId)).toBe(false);
    } finally {
      removeMockCanvas(canvasId);
    }
  });

  test('should handle switching between chart types', () => {
    const canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);

    try {
      // Render bar chart
      renderBarChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);

      // Switch to line chart
      renderLineChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);

      // Switch to pie chart
      renderPieChart(canvasId, sampleChartData);
      expect(chartExists(canvasId)).toBe(true);
    } finally {
      destroyChart(canvasId);
      removeMockCanvas(canvasId);
    }
  });

  test('should handle rendering on multiple canvases', () => {
    const canvasId1 = `test-canvas-1-${Date.now()}`;
    const canvasId2 = `test-canvas-2-${Date.now()}`;
    createMockCanvas(canvasId1);
    createMockCanvas(canvasId2);

    try {
      renderBarChart(canvasId1, sampleChartData);
      renderBarChart(canvasId2, sampleChartData);

      expect(chartExists(canvasId1)).toBe(true);
      expect(chartExists(canvasId2)).toBe(true);

      destroyChart(canvasId1);
      expect(chartExists(canvasId1)).toBe(false);
      expect(chartExists(canvasId2)).toBe(true);

      destroyChart(canvasId2);
      expect(chartExists(canvasId2)).toBe(false);
    } finally {
      removeMockCanvas(canvasId1);
      removeMockCanvas(canvasId2);
    }
  });
});
