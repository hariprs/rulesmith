/**
 * Dashboard Unit Tests (Story 3-4)
 *
 * Tests dashboard components, filters, statistics, and layout.
 * Uses real Chart.js rendering with YOLO approach (not mocks).
 *
 * @module tests/visualization/dashboard
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { MergedPattern } from '../../src/pattern-matcher';
import { PatternCategory } from '../../src/pattern-detector';
import {
  Dashboard,
  DashboardConfig,
  DashboardInstance,
} from '../../src/visualization/dashboard';
import {
  createDashboardLayout,
  DashboardLayoutConfig,
} from '../../src/visualization/dashboard-layout';
import {
  createFilters,
  applyFilters,
  FilterState,
} from '../../src/visualization/dashboard-filters';
import {
  calculateSummaryStatistics,
  DashboardStatistics,
} from '../../src/visualization/dashboard-stats';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create test patterns
 */
function createTestPatterns(count: number = 100): MergedPattern[] {
  const patterns: MergedPattern[] = [];
  const now = new Date();
  const categories = [
    PatternCategory.CODE_STYLE,
    PatternCategory.TERMINOLOGY,
    PatternCategory.STRUCTURE,
    PatternCategory.FORMATTING,
    PatternCategory.CONVENTION,
  ];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    patterns.push({
      pattern_text: `Pattern ${i}`,
      suggested_rule: `Rule ${i}`,
      category,
      count: Math.floor(Math.random() * 100) + 1,
      first_seen: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      examples: [],
      session_count: 1,
      total_frequency: Math.floor(Math.random() * 100) + 1,
      is_new: false,
      frequency_change: 0,
      content_types: [],
    } as MergedPattern);
  }

  return patterns;
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

let dom: JSDOM;
let container: HTMLElement;

beforeEach(() => {
  // Setup DOM environment for Chart.js rendering (YOLO: real rendering, not mocks)
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="test-container"></div></body></html>', {
    runScripts: 'dangerously',
    resources: 'usable',
  });

  global.document = dom.window.document;
  global.window = dom.window as any;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

  container = global.document.getElementById('test-container')!;
});

afterEach(() => {
  // Cleanup
  if (container) {
    container.innerHTML = '';
  }

  if (dom) {
    dom.window.close();
  }
});

// ============================================================================
// DASHBOARD LAYOUT TESTS (AC1)
// ============================================================================

describe('Dashboard Layout (AC1)', () => {
  it('should create responsive grid layout', () => {
    const layoutConfig: DashboardLayoutConfig = {
      containerId: 'test-container',
      chartCount: 4,
      responsive: true,
    };

    const layoutContainer = createDashboardLayout(layoutConfig);

    expect(layoutContainer).toBeTruthy();
    expect(layoutContainer.style.display).toBe('grid');
    // Should create filters, stats, and 4 chart containers = 6 total
    expect(layoutContainer.children.length).toBe(6);
  });

  it('should create chart containers with correct IDs', () => {
    const layoutConfig: DashboardLayoutConfig = {
      containerId: 'test-container',
      chartCount: 4,
    };

    createDashboardLayout(layoutConfig);

    const chartContainers = container.querySelectorAll('.chart-container');
    expect(chartContainers.length).toBe(4);

    chartContainers.forEach((chartContainer, index) => {
      // Default arrangement from dashboard-layout.ts: ['category', 'top', 'trends', 'frequency']
      expect(chartContainer.id).toBe(`test-container-chart-${['category', 'top', 'trends', 'frequency'][index]}`);
    });
  });

  it('should apply responsive styles', () => {
    const layoutConfig: DashboardLayoutConfig = {
      containerId: 'test-container',
      chartCount: 4,
      responsive: true,
    };

    createDashboardLayout(layoutConfig);

    // Check for responsive styles in head
    const styles = Array.from(document.head.querySelectorAll('style'));
    const hasResponsiveStyles = styles.some(style =>
      style.textContent?.includes('@media') &&
      style.textContent?.includes('min-width: 640px')
    );

    expect(hasResponsiveStyles).toBe(true);
  });

  it('should add ARIA labels for accessibility (AC5)', () => {
    const layoutConfig: DashboardLayoutConfig = {
      containerId: 'test-container',
      chartCount: 4,
    };

    createDashboardLayout(layoutConfig);

    expect(container.getAttribute('role')).toBe('main');
    expect(container.getAttribute('aria-label')).toBe('Pattern visualization dashboard');

    const chartContainers = container.querySelectorAll('.chart-container');
    chartContainers.forEach(chartContainer => {
      expect(chartContainer.getAttribute('role')).toBe('region');
    });
  });
});

// ============================================================================
// DASHBOARD FILTERS TESTS (AC2)
// ============================================================================

describe('Dashboard Filters (AC2)', () => {
  it('should create filter elements', () => {
    const patterns = createTestPatterns(100);

    const filters = createFilters({
      containerId: 'test-container',
      patterns,
      onFilterChange: () => {},
    });

    // Should have 4 filters + 1 reset button
    expect(filters.length).toBe(4);

    const filterTypes = filters.map(f => f.type);
    expect(filterTypes).toContain('date-range');
    expect(filterTypes).toContain('category');
    expect(filterTypes).toContain('threshold');
    expect(filterTypes).toContain('search');
  });

  it('should filter patterns by date range', () => {
    const patterns = createTestPatterns(100);

    const filtered7Days = applyFilters(patterns, {
      dateRange: '7-days',
      categories: [],
      frequencyThreshold: 0,
      searchText: '',
    });

    const filtered30Days = applyFilters(patterns, {
      dateRange: '30-days',
      categories: [],
      frequencyThreshold: 0,
      searchText: '',
    });

    const filteredAllTime = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: [],
      frequencyThreshold: 0,
      searchText: '',
    });

    expect(filtered7Days.length).toBeLessThanOrEqual(filtered30Days.length);
    expect(filtered30Days.length).toBeLessThanOrEqual(filteredAllTime.length);
    expect(filteredAllTime.length).toBe(100);
  });

  it('should filter patterns by category', () => {
    const patterns = createTestPatterns(100);

    const filtered = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: ['category-0' as PatternCategory, 'category-1' as PatternCategory],
      frequencyThreshold: 0,
      searchText: '',
    });

    filtered.forEach(pattern => {
      expect(['category-0', 'category-1']).toContain(pattern.category);
    });
  });

  it('should filter patterns by frequency threshold', () => {
    const patterns = createTestPatterns(100);

    const filtered = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: [],
      frequencyThreshold: 50,
      searchText: '',
    });

    filtered.forEach(pattern => {
      expect(pattern.count).toBeGreaterThanOrEqual(50);
    });
  });

  it('should filter patterns by search text', () => {
    const patterns = createTestPatterns(100);

    const filtered = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: [],
      frequencyThreshold: 0,
      searchText: 'Pattern 10',
    });

    filtered.forEach(pattern => {
      expect(
        pattern.pattern_text.toLowerCase().includes('pattern 10') ||
        (pattern.suggested_rule && pattern.suggested_rule.toLowerCase().includes('pattern 10'))
      ).toBe(true);
    });
  });

  it('should export filter state to URL parameters', () => {
    const state: FilterState = {
      dateRange: '30-days',
      categories: ['category-0' as PatternCategory, 'category-2' as PatternCategory],
      frequencyThreshold: 25,
      searchText: 'pattern',
    };

    const { exportFilterState } = require('../../src/visualization/dashboard-filters');
    const queryString = exportFilterState(state);

    expect(queryString).toContain('dateRange=30-days');
    expect(queryString).toContain('categories=category-0%2Ccategory-2');
    expect(queryString).toContain('threshold=25');
    expect(queryString).toContain('search=pattern');
  });
});

// ============================================================================
// DASHBOARD STATISTICS TESTS (AC4)
// ============================================================================

describe('Dashboard Statistics (AC4)', () => {
  it('should calculate summary statistics', () => {
    const patterns = createTestPatterns(100);

    const stats = calculateSummaryStatistics(patterns);

    expect(stats.totalPatterns).toBe(100);
    expect(stats.totalCorrections).toBeGreaterThan(0);
    expect(stats.topCategory).toBeTruthy();
    expect(stats.averageFrequency).toBeGreaterThan(0);
  });

  it('should handle empty patterns', () => {
    const stats = calculateSummaryStatistics([]);

    expect(stats.totalPatterns).toBe(0);
    expect(stats.totalCorrections).toBe(0);
    expect(stats.topCategory).toBeNull();
  });

  it('should calculate trend indicators', () => {
    const patterns = createTestPatterns(100);

    const stats = calculateSummaryStatistics(patterns);

    expect(stats.trends).toBeTruthy();
    expect(stats.trends?.current).toBeGreaterThanOrEqual(0);
    expect(stats.trends?.previous).toBeGreaterThanOrEqual(0);
    expect(['up', 'down', 'neutral']).toContain(stats.trends?.direction);
  });

  it('should create summary cards', () => {
    const patterns = createTestPatterns(100);
    const stats = calculateSummaryStatistics(patterns);

    const statsContainer = document.createElement('div');
    statsContainer.id = 'stats-container';
    container.appendChild(statsContainer);

    const { createSummaryCards } = require('../../src/visualization/dashboard-stats');
    createSummaryCards(statsContainer, stats);

    const cards = statsContainer.querySelectorAll('.summary-card');
    expect(cards.length).toBeGreaterThanOrEqual(4);
  });

  it('should format large numbers with K, M, B suffixes', () => {
    const { formatNumber } = require('../../src/visualization/dashboard-stats');

    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(2500000000)).toBe('2.5B');
    expect(formatNumber(500)).toBe('500');
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Dashboard Integration', () => {
  it('should create dashboard with all components', () => {
    const patterns = createTestPatterns(100);

    // Create filter container
    const filtersContainer = document.createElement('div');
    filtersContainer.id = 'test-container-filters';
    container.appendChild(filtersContainer);

    // Create stats container
    const statsContainer = document.createElement('div');
    statsContainer.id = 'test-container-stats';
    container.appendChild(statsContainer);

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
      enableFilters: true,
      enableStatistics: true,
      enableInteractions: true,
    });

    const instance = dashboard.getInstance();

    expect(instance.container).toBeTruthy();
    expect(instance.filters).toBeTruthy();
    expect(instance.statistics).toBeTruthy();
    expect(instance.charts.size).toBeGreaterThan(0);

    dashboard.destroy();
  });

  it('should update filters and refresh dashboard', () => {
    const patterns = createTestPatterns(100);

    // Create containers
    const filtersContainer = document.createElement('div');
    filtersContainer.id = 'test-container-filters';
    container.appendChild(filtersContainer);

    const statsContainer = document.createElement('div');
    statsContainer.id = 'test-container-stats';
    container.appendChild(statsContainer);

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
    });

    const initialStats = dashboard.getInstance().statistics;

    // Update filters
    dashboard.updateFilters({
      frequencyThreshold: 50,
    });

    const updatedStats = dashboard.getInstance().statistics;

    expect(updatedStats.totalPatterns).toBeLessThanOrEqual(initialStats.totalPatterns);

    dashboard.destroy();
  });

  it('should clean up resources on destroy', () => {
    const patterns = createTestPatterns(100);

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
    });

    const instance = dashboard.getInstance();

    expect(instance.charts.size).toBeGreaterThan(0);

    dashboard.destroy();

    expect(container.innerHTML).toBe('');
  });
});

// ============================================================================
// PERFORMANCE TESTS (AC6)
// ============================================================================

describe('Dashboard Performance (AC6)', () => {
  it('should render dashboard in < 5 seconds for 100 patterns', () => {
    const patterns = createTestPatterns(100);

    const startTime = performance.now();

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
    });

    const renderTime = performance.now() - startTime;

    expect(renderTime).toBeLessThan(5000);

    dashboard.destroy();
  });

  it('should apply filters in < 1 second for 1000 patterns', () => {
    const patterns = createTestPatterns(1000);

    const startTime = performance.now();

    const filtered = applyFilters(patterns, {
      dateRange: '30-days',
      categories: [PatternCategory.CODE_STYLE],
      frequencyThreshold: 10,
      searchText: 'pattern',
    });

    const filterTime = performance.now() - startTime;

    expect(filterTime).toBeLessThan(1000);
  });

  it('should calculate statistics in < 500ms for 10K patterns', () => {
    const patterns = createTestPatterns(10000);

    const startTime = performance.now();

    const stats = calculateSummaryStatistics(patterns);

    const calcTime = performance.now() - startTime;

    expect(calcTime).toBeLessThan(500);
  });
});

// ============================================================================
// ACCESSIBILITY TESTS (AC5)
// ============================================================================

describe('Dashboard Accessibility (AC5)', () => {
  it('should have ARIA labels on all interactive elements', () => {
    const patterns = createTestPatterns(50);

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
    });

    const interactiveElements = container.querySelectorAll('button, input, select');
    interactiveElements.forEach(element => {
      const ariaLabel = element.getAttribute('aria-label') || element.getAttribute('aria-labelledby');
      if (!ariaLabel) {
        console.log('Element missing aria-label:', element.outerHTML);
      }
      expect(ariaLabel).toBeTruthy();
    });

    dashboard.destroy();
  });

  it('should support keyboard navigation', () => {
    const patterns = createTestPatterns(50);

    const dashboard = new Dashboard({
      containerId: 'test-container',
      patterns,
    });

    const focusableElements = container.querySelectorAll('button, input, select');
    focusableElements.forEach(element => {
      expect((element as HTMLElement).tabIndex).toBeGreaterThanOrEqual(0);
    });

    dashboard.destroy();
  });
});
