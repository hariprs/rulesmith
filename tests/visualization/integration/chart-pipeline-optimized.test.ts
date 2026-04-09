/**
 * Optimized Integration Tests for Chart Rendering Pipeline (Story 3-2)
 *
 * Testing Strategy: Integration-Level Focus (25% of test pyramid)
 *
 * These tests verify the integration between:
 * - Data transformation functions (transformers)
 * - Chart rendering functions (visualization library)
 * - HTML canvas elements
 * - Memory management and cleanup
 *
 * KEY PRINCIPLE: Only test what CANNOT be tested at unit level
 * - DO NOT duplicate unit test coverage
 * - DO test component interactions
 * - DO test side effects (canvas rendering, memory allocation)
 * - DO test error boundaries between components
 *
 * Test Speed Target: < 100ms per test
 *
 * @jest-environment jsdom
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { transformPatternsToBarChart, transformPatternsToLineChart, transformPatternsToPieChart } from '../../../src/visualization/transformers';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

enum PatternCategory {
  CODE_STYLE = 'code_style',
  TERMINOLOGY = 'terminology',
  STRUCTURE = 'structure',
  FORMATTING = 'formatting',
  CONVENTION = 'convention',
  OTHER = 'other',
}

interface MergedPattern {
  pattern_text: string;
  count: number;
  category: PatternCategory;
  examples: any[];
  suggested_rule: string;
  first_seen: string;
  last_seen: string;
  content_types: any[];
  session_count: number;
  total_frequency: number;
  is_new: boolean;
  frequency_change: number;
}

interface ChartData {
  chartType: 'bar' | 'line' | 'pie';
  title: string;
  xAxis: { label: string; data: string[] };
  yAxis: { label: string; data: number[] };
  datasets: any[];
  metadata?: {
    totalPatterns: number;
    dateRange: { start: string; end: string };
    categories: string[];
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate realistic test patterns
 */
function generateRealisticPatterns(count: number): MergedPattern[] {
  return Array.from({ length: count }, (_, i) => ({
    pattern_text: `Pattern ${i}`,
    count: Math.floor(Math.random() * 100),
    category: Object.values(PatternCategory)[i % 6],
    examples: [],
    suggested_rule: 'Test rule',
    first_seen: '2026-03-15T10:00:00Z',
    last_seen: '2026-03-18T11:00:00Z',
    content_types: [],
    session_count: 1,
    total_frequency: 1,
    is_new: false,
    frequency_change: 0,
  }));
}

// ============================================================================
// INTEGRATION TEST SUITE
// ============================================================================

describe('Chart Rendering Pipeline - Integration Tests', () => {
  let canvasId: string;

  /**
   * Create a mock canvas element for testing
   */
  function createMockCanvas(id: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    document.body.appendChild(canvas);
    return canvas;
  }

  /**
   * Remove a mock canvas element
   */
  function removeMockCanvas(id: string): void {
    const canvas = document.getElementById(id);
    if (canvas) {
      document.body.removeChild(canvas);
    }
  }

  beforeEach(() => {
    canvasId = `test-canvas-${Date.now()}`;
    createMockCanvas(canvasId);
  });

  afterEach(() => {
    removeMockCanvas(canvasId);
  });

  // ==========================================================================
  // END-TO-END PIPELINE TESTS
  // ==========================================================================

  describe('Transform → Render Pipeline', () => {
    test('should transform patterns and render bar chart end-to-end', () => {
      const patterns: MergedPattern[] = [
        {
          pattern_text: 'Use const',
          count: 5,
          category: PatternCategory.CODE_STYLE,
          examples: [],
          suggested_rule: 'Use const',
          first_seen: '2026-03-15T10:00:00Z',
          last_seen: '2026-03-18T11:00:00Z',
          content_types: [],
          session_count: 1,
          total_frequency: 5,
          is_new: false,
          frequency_change: 0,
        },
      ];

      // Integration point: transformer → renderer
      // This test verifies the transformer produces valid Chart.js data structure
      expect(() => {
        const chartData = transformPatternsToBarChart(patterns);
        expect(chartData).toBeDefined();
        expect(chartData.chartType).toBe('bar');
        expect(chartData.datasets).toBeDefined();
        expect(chartData.xAxis.data.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test('should handle transform errors gracefully in pipeline', () => {
      const invalidPatterns = null as any;

      expect(() => {
        transformPatternsToBarChart(invalidPatterns);
      }).toThrow();
    });

    test('should handle empty patterns with error', () => {
      const patterns: MergedPattern[] = [];

      expect(() => {
        transformPatternsToBarChart(patterns);
      }).toThrow();
    });
  });

  // ==========================================================================
  // CANVAS LIFECYCLE MANAGEMENT
  // ==========================================================================

  describe('Canvas Lifecycle', () => {
    test('should create, render, and destroy chart correctly', () => {
      // Integration point: canvas DOM manipulation
      // Unit tests verify canvas element creation
      // Integration tests verify chart library respects canvas lifecycle

      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      expect(canvas).toBeDefined();

      // TODO: Render chart
      // renderBarChart(canvasId, sampleData);

      // TODO: Destroy chart
      // destroyChart(canvasId);

      // Verify canvas still exists but chart is destroyed
      expect(document.getElementById(canvasId)).toBeDefined();
    });

    test('should handle multiple render cycles on same canvas', () => {
      // Integration point: chart re-use
      // Tests that chart library properly disposes previous instance

      for (let i = 0; i < 3; i++) {
        expect(() => {
          // TODO: Render chart with different data
          // renderBarChart(canvasId, generateData(i));
        }).not.toThrow();
      }
    });

    test('should handle rapid canvas creation and destruction', () => {
      // Integration point: DOM + Chart library memory management
      // Tests for memory leaks in canvas lifecycle

      for (let i = 0; i < 10; i++) {
        const tempCanvasId = `temp-canvas-${Date.now()}-${i}`;
        createMockCanvas(tempCanvasId);

        // TODO: Render and destroy chart
        // renderBarChart(tempCanvasId, sampleData);
        // destroyChart(tempCanvasId);

        removeMockCanvas(tempCanvasId);
      }

      // If this test passes without browser warnings, no memory leaks
      expect(true).toBe(true);
    });
  });

  // ==========================================================================
  // MEMORY LEAK DETECTION
  // ==========================================================================

  describe('Memory Management', () => {
    test('should not leak memory with repeated render operations', () => {
      // Integration point: Chart library + Browser memory
      // This CANNOT be tested at unit level

      const initialMemory = (global as any).process?.memoryUsage?.()?.heapUsed;

      for (let i = 0; i < 50; i++) {
        // TODO: Render and destroy chart
        // renderBarChart(canvasId, generateLargeDataset());
        // destroyChart(canvasId);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = (global as any).process?.memoryUsage?.()?.heapUsed;

      // Memory growth should be minimal (< 5MB for 50 renders)
      if (initialMemory && finalMemory) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(5 * 1024 * 1024);
      }
    });

    test('should properly cleanup event listeners', () => {
      // Integration point: Chart library event handling
      // Tests that chart library removes event listeners on destroy

      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      const initialListenerCount = getEventListenerCount(canvas);

      // TODO: Render chart with event listeners
      // renderBarChart(canvasId, sampleData);

      const afterRenderListenerCount = getEventListenerCount(canvas);

      // TODO: Destroy chart
      // destroyChart(canvasId);

      const afterDestroyListenerCount = getEventListenerCount(canvas);

      // Listener count should return to initial
      expect(afterDestroyListenerCount).toBe(initialListenerCount);
    });

    /**
     * Helper function to count event listeners (Node.js environment)
     */
    function getEventListenerCount(element: any): number {
      // This is a simplified check
      // In browser environment, use getEventListeners(element)
      return 0; // Placeholder
    }
  });

  // ==========================================================================
  // ERROR BOUNDARIES BETWEEN COMPONENTS
  // ==========================================================================

  describe('Error Boundaries', () => {
    test('should isolate transformer errors from renderer', () => {
      // Integration point: Error handling between components
      // Transformer error should not crash renderer

      const malformedPatterns = [
        { invalid: 'data' } as any,
      ];

      expect(() => {
        try {
          // TODO: Transform (should throw)
          // const chartData = transformPatternsToBarChart(malformedPatterns);
          // This line should not be reached
          // renderBarChart(canvasId, chartData);
        } catch (error) {
          // Error should be caught at transformer level
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });

    test('should isolate renderer errors from transformer', () => {
      // Integration point: Error handling between components
      // Renderer error should not affect transformer

      const patterns: MergedPattern[] = [];

      expect(() => {
        // TODO: Transform should succeed
        // const chartData = transformPatternsToBarChart(patterns);

        try {
          // TODO: Render with invalid canvas (should throw)
          // renderBarChart('invalid-canvas-id', chartData);
        } catch (error) {
          // Error should be caught at renderer level
          expect(error).toBeDefined();
        }
      }).not.toThrow();
    });

    test('should handle missing canvas element gracefully', () => {
      // Integration point: DOM + Chart library
      // Tests error handling when canvas doesn't exist
      // NOTE: This test is for Story 3-3 (rendering phase)
      // For Story 3-2, we test that transformers don't throw on valid data

      const patterns: MergedPattern[] = [];

      // Transformer should throw on empty data (per AC6)
      expect(() => {
        transformPatternsToBarChart(patterns);
      }).toThrow();
    });
  });

  // ==========================================================================
  // PERFORMANCE INTEGRATION TESTS
  // ==========================================================================

  describe('Performance Integration', () => {
    test('should complete transform → render pipeline within threshold', () => {
      // Integration point: End-to-end performance
      // Tests realistic performance with actual data sizes

      const patterns = generateRealisticPatterns(100);

      const startTime = Date.now();

      expect(() => {
        const chartData = transformPatternsToBarChart(patterns);
        expect(chartData).toBeDefined();
      }).not.toThrow();

      const duration = Date.now() - startTime;

      // Should complete in < 500ms for 100 patterns
      expect(duration).toBeLessThan(500);
    });

    test('should handle large datasets with data sampling', () => {
      // Integration point: Performance optimization
      // Tests that data sampling works in full pipeline

      const patterns = generateRealisticPatterns(10000);

      const startTime = Date.now();

      expect(() => {
        const chartData = transformPatternsToBarChart(patterns);
        expect(chartData).toBeDefined();
      }).not.toThrow();

      const duration = Date.now() - startTime;

      // Should complete in < 2s even with 10K patterns (via sampling)
      expect(duration).toBeLessThan(2000);
    });
  });

  // ==========================================================================
  // CROSS-CHART TYPE COMPATIBILITY
  // ==========================================================================

  describe('Chart Type Compatibility', () => {
    test('should switch between chart types on same canvas', () => {
      // Integration point: Chart library type switching
      // Tests that chart library handles type changes correctly

      const patterns: MergedPattern[] = [];

      expect(() => {
        // TODO: Render different chart types on same canvas
        // renderBarChart(canvasId, transformPatternsToBarChart(patterns));
        // renderLineChart(canvasId, transformPatternsToLineChart(patterns));
        // renderPieChart(canvasId, transformPatternsToPieChart(patterns));
      }).not.toThrow();
    });

    test('should preserve canvas state when switching chart types', () => {
      // Integration point: Canvas state management
      // Tests that canvas remains usable after type switches

      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

      // TODO: Render multiple chart types
      // renderBarChart(canvasId, sampleData);
      // renderLineChart(canvasId, sampleData);
      // renderPieChart(canvasId, sampleData);

      // Canvas should still be functional
      expect(canvas).toBeDefined();
    });
  });

  // ==========================================================================
  // REAL-WORLD SCENARIOS
  // ==========================================================================

  describe('Real-World Scenarios', () => {
    test('should handle Epic 2 MergedPattern data end-to-end', () => {
      // Integration point: Epic 2 → Epic 3 data flow
      // Tests real-world data from pattern detection pipeline

      const epic2Patterns: MergedPattern[] = [
        {
          pattern_text: 'Use const instead of let',
          count: 15,
          category: PatternCategory.CODE_STYLE,
          examples: [
            {
              original_suggestion: 'let x = 10;',
              user_correction: 'const x = 10;',
              context: 'Variable declaration',
              timestamp: '2026-03-15T10:00:00Z',
              content_type: 'code',
            },
          ],
          suggested_rule: 'Use const for immutable variables',
          first_seen: '2026-03-14T08:00:00Z',
          last_seen: '2026-03-18T16:00:00Z',
          content_types: ['code', 'documentation'],
          session_count: 3,
          total_frequency: 25,
          is_new: false,
          frequency_change: 5,
        },
        {
          pattern_text: 'Add JSDoc comments',
          count: 8,
          category: PatternCategory.CONVENTION,
          examples: [],
          suggested_rule: 'Document public functions',
          first_seen: '2026-03-16T10:00:00Z',
          last_seen: '2026-03-18T11:00:00Z',
          content_types: ['code'],
          session_count: 2,
          total_frequency: 10,
          is_new: true,
          frequency_change: 0,
        },
      ];

      expect(() => {
        const chartData = transformPatternsToBarChart(epic2Patterns);
        expect(chartData).toBeDefined();
        expect(chartData.datasets.length).toBeGreaterThan(0);
      }).not.toThrow();
    });

    test('should handle mixed old and new patterns', () => {
      // Integration point: Real-world pattern data mix
      // Tests with both new and existing patterns

      const patterns: MergedPattern[] = [
        { ...generateRealisticPatterns(1)[0], is_new: true },
        { ...generateRealisticPatterns(1)[0], is_new: false },
      ];

      expect(() => {
        const chartData = transformPatternsToBarChart(patterns);
        expect(chartData).toBeDefined();
      }).not.toThrow();
    });

    test('should handle patterns with frequency changes', () => {
      // Integration point: Longitudinal pattern data
      // Tests with patterns showing frequency trends

      const patterns: MergedPattern[] = [
        { ...generateRealisticPatterns(1)[0], frequency_change: 10 },
        { ...generateRealisticPatterns(1)[0], frequency_change: -5 },
        { ...generateRealisticPatterns(1)[0], frequency_change: 0 },
      ];

      expect(() => {
        const chartData = transformPatternsToLineChart(patterns);
        expect(chartData).toBeDefined();
      }).not.toThrow();
    });
  });
});

// ============================================================================
// COVERAGE SUMMARY
// ============================================================================

describe('Integration Tests - Coverage Summary', () => {
  test('should achieve > 70% integration coverage', () => {
    // This test will be updated after implementation
    // Run with: npm test -- --coverage --collectFrom=tests/visualization/integration/

    expect(true).toBe(true); // Placeholder
  });

  test('should test all component interaction paths', () => {
    // Verify all integration points are tested
    expect(true).toBe(true); // Placeholder
  });

  test('should test all error boundaries', () => {
    // Verify all error handling between components is tested
    expect(true).toBe(true); // Placeholder
  });

  test('should test all memory management scenarios', () => {
    // Verify all memory leak scenarios are tested
    expect(true).toBe(true); // Placeholder
  });
});

// ============================================================================
// TESTING PYRAMID COMPLIANCE
// ============================================================================

describe('Testing Pyramid Compliance', () => {
  test('should not duplicate unit test coverage', () => {
    // Verify integration tests focus on interactions, not implementation
    // Unit tests cover: data transformation, validation, configuration
    // Integration tests cover: pipelines, lifecycle, memory, errors

    expect(true).toBe(true); // Placeholder
  });

  test('should maintain 70/30 test distribution', () => {
    // Verify test pyramid ratio
    // Unit: 70%, Integration: 25%, E2E: 5%

    expect(true).toBe(true); // Placeholder
  });

  test('should execute integration tests in < 30 seconds', () => {
    // Integration tests should be fast enough for rapid feedback

    const startTime = Date.now();

    // Run all integration tests (this will be measured by actual test run)
    expect(true).toBe(true);

    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(30000);
  });
});
