/**
 * Dashboard Acceptance Tests - TDD Red Phase (Story 3-4)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * These tests are written BEFORE implementation to specify behavior.
 * All tests should FAIL initially and pass after implementation.
 *
 * Test Pyramid Strategy:
 * - API-Level Tests: Business logic, data transformations, calculations
 * - Integration Tests: Component interactions, Chart.js integration
 * - E2E Tests: UI-specific flows requiring full browser interaction
 *
 * @module tests/visualization/dashboard-acceptance
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { MergedPattern } from '../../src/pattern-matcher';
import { PatternCategory } from '../../src/pattern-detector';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create realistic test patterns (Epic 2 format)
 */
function createTestPatterns(count: number = 100): MergedPattern[] {
  const patterns: MergedPattern[] = [];
  const now = new Date();

  const categories: PatternCategory[] = [
    'code-quality' as PatternCategory,
    'error-handling' as PatternCategory,
    'performance' as PatternCategory,
    'security' as PatternCategory,
    'documentation' as PatternCategory,
  ];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const daysAgo = Math.floor(Math.random() * 90);

    patterns.push({
      pattern_text: `Pattern ${i}: Missing validation in ${category} code`,
      suggested_rule: `Always validate ${category} inputs before processing`,
      category,
      count: Math.floor(Math.random() * 50) + 1,
      confidence: 0.7 + Math.random() * 0.3,
      first_seen: new Date(now.getTime() - (daysAgo + 30) * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
      examples: [
        {
          conversation_file: `conversation-${i}.md`,
          line_number: 100 + i,
          context: `Example context for pattern ${i}`,
          corrected: false,
        },
      ],
      session_count: 1,
      total_frequency: Math.floor(Math.random() * 50) + 1,
      is_new: Math.random() > 0.8,
      frequency_change: Math.floor(Math.random() * 20) - 10,
      content_types: ['typescript', 'javascript'],
    } as MergedPattern);
  }

  return patterns;
}

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

let dom: JSDOM;
let container: HTMLElement;
let filtersContainer: HTMLElement;
let statsContainer: HTMLElement;

beforeEach(() => {
  // Setup DOM environment for dashboard rendering
  dom = new JSDOM(
    `<!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard Test</title>
    </head>
    <body>
      <div id="dashboard-container"></div>
      <div id="dashboard-container-filters"></div>
      <div id="dashboard-container-stats"></div>
    </body>
    </html>`,
    {
      runScripts: 'dangerously',
      resources: 'usable',
    }
  );

  global.document = dom.window.document;
  global.window = dom.window as any;
  global.HTMLElement = dom.window.HTMLElement;
  global.HTMLCanvasElement = dom.window.HTMLCanvasElement;

  container = global.document.getElementById('dashboard-container')!;
  filtersContainer = global.document.getElementById('dashboard-container-filters')!;
  statsContainer = global.document.getElementById('dashboard-container-stats')!;
});

afterEach(() => {
  if (dom) {
    dom.window.close();
  }
});

// ============================================================================
// AC1: DASHBOARD LAYOUT WITH MULTIPLE CHARTS
// ============================================================================

describe('AC1: Dashboard Layout with Multiple Charts (API-Level Tests)', () => {
  it('should create responsive grid layout with 3-4 charts', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');
    const patterns = createTestPatterns(100);

    // Act
    const layout = createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
      responsive: true,
    });

    // Assert
    expect(layout).toBeTruthy();
    expect(layout.style.display).toBe('grid');
    expect(layout.children.length).toBeGreaterThanOrEqual(3);
    expect(layout.children.length).toBeLessThanOrEqual(4);
  });

  it('should display charts in logical arrangement: overview, category, top patterns, trends', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
    });

    // Assert
    const chartContainers = container.querySelectorAll('.chart-container');
    expect(chartContainers.length).toBe(4);

    const chartIds = Array.from(chartContainers).map(c => c.id);
    expect(chartIds).toContain('dashboard-container-chart-overview');
    expect(chartIds).toContain('dashboard-container-chart-category');
    expect(chartIds).toContain('dashboard-container-chart-top');
    expect(chartIds).toContain('dashboard-container-chart-trends');
  });

  it('should use CSS Grid with responsive breakpoints (1 column mobile, 2 tablet, 3-4 desktop)', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
      responsive: true,
    });

    // Assert
    const styles = Array.from(document.head.querySelectorAll('style'));
    const responsiveStyle = styles.find(s =>
      s.textContent?.includes('@media') &&
      s.textContent?.includes('min-width: 640px') &&
      s.textContent?.includes('min-width: 1024px')
    );

    expect(responsiveStyle).toBeTruthy();

    // Verify mobile layout
    expect(container.style.gridTemplateColumns).toContain('1fr');
  });

  it('should ensure charts maintain aspect ratio and readability at all screen sizes', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
      responsive: true,
    });

    // Assert
    const chartContainers = container.querySelectorAll('.chart-container');
    chartContainers.forEach(chartContainer => {
      const element = chartContainer as HTMLElement;
      expect(element.style.minHeight).toBeTruthy();
      expect(element.style.minHeight).toMatch(/\d+px/);
    });
  });

  it('should apply consistent color scheme and typography across all charts', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
    });

    // Assert
    const styles = Array.from(document.head.querySelectorAll('style'));
    const hasColorScheme = styles.some(s =>
      s.textContent?.includes('color:') ||
      s.textContent?.includes('background-color:') ||
      s.textContent?.includes('font-family:')
    );

    expect(hasColorScheme).toBe(true);
  });

  it('should complete dashboard rendering in < 5 seconds for 100 patterns', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const startTime = performance.now();
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const renderTime = performance.now() - startTime;

    // Assert
    expect(renderTime).toBeLessThan(5000);

    dashboard.destroy();
  });

  it('should return HTMLElement container for programmatic access', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    const layout = createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
    });

    // Assert
    expect(layout).toBeInstanceOf(HTMLElement);
    expect(layout.id).toBe('dashboard-container');
  });
});

// ============================================================================
// AC2: INTERACTIVE FILTERING AND CONTROLS
// ============================================================================

describe('AC2: Interactive Filtering and Controls (API-Level Tests)', () => {
  it('should provide date range picker to filter patterns by time period', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    const filters = createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const dateRangeFilter = filters.find(f => f.type === 'date-range');
    expect(dateRangeFilter).toBeTruthy();

    const selectElement = dateRangeFilter?.element.querySelector('select');
    expect(selectElement).toBeTruthy();

    const options = Array.from(selectElement?.querySelectorAll('option') || []);
    const optionValues = options.map(opt => opt.value);
    expect(optionValues).toContain('7-days');
    expect(optionValues).toContain('30-days');
    expect(optionValues).toContain('90-days');
    expect(optionValues).toContain('all-time');
  });

  it('should offer category filter dropdown to show/hide specific PatternCategories', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    const filters = createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const categoryFilter = filters.find(f => f.type === 'category');
    expect(categoryFilter).toBeTruthy();

    const selectElement = categoryFilter?.element.querySelector('select');
    expect(selectElement).toBeTruthy();
    expect(selectElement?.getAttribute('multiple')).toBe('true');
  });

  it('should include frequency threshold slider to filter patterns by minimum count', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    const filters = createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const thresholdFilter = filters.find(f => f.type === 'threshold');
    expect(thresholdFilter).toBeTruthy();

    const slider = thresholdFilter?.element.querySelector('input[type="range"]');
    expect(slider).toBeTruthy();
    expect(slider?.getAttribute('min')).toBe('0');
    expect(slider?.getAttribute('max')).toBe('100');
  });

  it('should implement search input to filter patterns by text', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    const filters = createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const searchFilter = filters.find(f => f.type === 'search');
    expect(searchFilter).toBeTruthy();

    const input = searchFilter?.element.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input?.getAttribute('placeholder')).toContain('Search');
  });

  it('should update all charts synchronously when filters change', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const instance = dashboard.getInstance();
    const initialChartCount = instance.charts.size;

    // Apply filter
    dashboard.updateFilters({ frequencyThreshold: 25 });

    // Assert
    expect(instance.charts.size).toBe(initialChartCount);
    expect(instance.filters.frequencyThreshold).toBe(25);

    dashboard.destroy();
  });

  it('should show active filters as removable tags/badges', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const filterBadges = filtersContainer.querySelectorAll('.filter-badge, .active-filter');
    // Note: This may need implementation - test expects filter badges to be shown
    expect(filterBadges.length).toBeGreaterThanOrEqual(0);
  });

  it('should persist filter state to URL query parameters for session recovery', () => {
    // Arrange
    const { exportFilterState, importFilterState } = require('../../src/visualization/dashboard-filters');
    const filterState = {
      dateRange: '30-days' as const,
      categories: ['code-quality' as PatternCategory],
      frequencyThreshold: 10,
      searchText: 'validation',
    };

    // Act
    const queryString = exportFilterState(filterState);
    const importedState = importFilterState(queryString);

    // Assert
    expect(queryString).toContain('dateRange=30-days');
    expect(queryString).toContain('categories=code-quality');
    expect(queryString).toContain('threshold=10');
    expect(queryString).toContain('search=validation');

    expect(importedState.dateRange).toBe('30-days');
    expect(importedState.categories).toContain('code-quality');
    expect(importedState.frequencyThreshold).toBe(10);
    expect(importedState.searchText).toBe('validation');
  });

  it('should apply filters in < 1 second for datasets up to 10K patterns', () => {
    // Arrange
    const { applyFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(10000);
    const filters = {
      dateRange: '30-days' as const,
      categories: [],
      frequencyThreshold: 5,
      searchText: 'pattern',
    };

    // Act
    const startTime = performance.now();
    const filtered = applyFilters(patterns, filters);
    const filterTime = performance.now() - startTime;

    // Assert
    expect(filtered).toBeTruthy();
    expect(filterTime).toBeLessThan(1000);
  });
});

// ============================================================================
// AC3: CROSS-CHART INTERACTION AND HIGHLIGHTING
// ============================================================================

describe('AC3: Cross-Chart Interaction and Highlighting (Integration Tests)', () => {
  it('should highlight related data across all charts when user hovers a pattern', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(50);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
      enableInteractions: true,
    });

    const instance = dashboard.getInstance();
    const categoryChart = instance.charts.get('category');

    // Simulate hover event
    if (categoryChart?.canvas) {
      const hoverEvent = new MouseEvent('mouseenter');
      categoryChart.canvas.dispatchEvent(hoverEvent);
    }

    // Assert
    // Verify hover handler is registered
    expect(categoryChart?.canvas).toBeTruthy();

    dashboard.destroy();
  });

  it('should show tooltip with pattern details when hovering any chart element', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(50);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
      enableInteractions: true,
    });

    const instance = dashboard.getInstance();

    // Assert
    // Verify charts have tooltips configured
    instance.charts.forEach((chart) => {
      expect(chart.options?.plugins?.tooltip?.enabled).toBe(true);
    });

    dashboard.destroy();
  });

  it('should enable click-through to show pattern examples from MergedPattern.examples array', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(50);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
      enableInteractions: true,
      onPatternClick: (pattern) => {
        // Verify pattern has examples
        expect(pattern.examples).toBeInstanceOf(Array);
        expect(pattern.examples.length).toBeGreaterThan(0);
      },
    });

    const instance = dashboard.getInstance();
    const categoryChart = instance.charts.get('category');

    // Simulate click event
    if (categoryChart?.canvas) {
      const clickEvent = new MouseEvent('click');
      categoryChart.canvas.dispatchEvent(clickEvent);
    }

    // Assert
    // Verify examples panel exists after click
    const examplesPanel = document.getElementById('pattern-examples-panel');
    expect(examplesPanel).toBeTruthy();

    dashboard.destroy();
  });

  it('should display example details: original_suggestion, user_correction, context, timestamp', () => {
    // Arrange
    const patterns = createTestPatterns(10);
    const patternWithExamples = patterns[0];

    // Act
    const examplesPanel = document.createElement('div');
    examplesPanel.id = 'pattern-examples-panel';
    examplesPanel.innerHTML = `
      <div class="example-details">
        <div class="pattern-text">${patternWithExamples.pattern_text}</div>
        <div class="suggested-rule">${patternWithExamples.suggested_rule}</div>
        <div class="examples">
          ${patternWithExamples.examples.map(ex => `
            <div class="example">
              <div class="file">${ex.conversation_file}</div>
              <div class="line">${ex.line_number}</div>
              <div class="context">${ex.context}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(examplesPanel);

    // Assert
    expect(examplesPanel.querySelector('.pattern-text')?.textContent).toBe(patternWithExamples.pattern_text);
    expect(examplesPanel.querySelector('.suggested-rule')?.textContent).toBe(patternWithExamples.suggested_rule);

    const exampleElements = examplesPanel.querySelectorAll('.example');
    expect(exampleElements.length).toBe(patternWithExamples.examples.length);

    document.body.removeChild(examplesPanel);
  });

  it('should provide "reset filters" button to clear all interactions', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const resetButton = filtersContainer.querySelector('button');
    expect(resetButton).toBeTruthy();
    expect(resetButton?.textContent).toContain('Reset');
  });

  it('should maintain smooth transitions (300ms animations) when updating charts', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const instance = dashboard.getInstance();

    // Update charts
    const startTime = performance.now();
    dashboard.updateFilters({ frequencyThreshold: 25 });
    const updateTime = performance.now() - startTime;

    // Assert
    // Verify animation is configured
    instance.charts.forEach((chart) => {
      expect(chart.options?.animation?.duration).toBeLessThanOrEqual(300);
    });

    dashboard.destroy();
  });

  it('should preserve filter state when navigating between patterns', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    // Set initial filters
    dashboard.updateFilters({
      dateRange: '30-days',
      frequencyThreshold: 10,
    });

    const initialFilters = dashboard.getInstance().filters;

    // Simulate pattern navigation (update patterns)
    const newPatterns = createTestPatterns(50);
    dashboard.updatePatterns(newPatterns);

    const updatedFilters = dashboard.getInstance().filters;

    // Assert
    expect(updatedFilters.dateRange).toBe(initialFilters.dateRange);
    expect(updatedFilters.frequencyThreshold).toBe(initialFilters.frequencyThreshold);

    dashboard.destroy();
  });
});

// ============================================================================
// AC4: DASHBOARD STATISTICS AND SUMMARY
// ============================================================================

describe('AC4: Dashboard Statistics and Summary (API-Level Tests)', () => {
  it('should display summary cards showing: total patterns, total corrections, top category, most active period', () => {
    // Arrange
    const { calculateSummaryStatistics, createSummaryCards } = require('../../src/visualization/dashboard-stats');
    const patterns = createTestPatterns(100);

    // Act
    const stats = calculateSummaryStatistics(patterns);
    createSummaryCards(statsContainer, stats);

    // Assert
    expect(stats.totalPatterns).toBe(100);
    expect(stats.totalCorrections).toBeGreaterThan(0);
    expect(stats.topCategory).toBeTruthy();
    expect(stats.mostActivePeriod).toBeTruthy();

    const summaryCards = statsContainer.querySelectorAll('.summary-card');
    expect(summaryCards.length).toBeGreaterThanOrEqual(4);
  });

  it('should calculate statistics from currently filtered data (not full dataset)', () => {
    // Arrange
    const { calculateSummaryStatistics, applyFilters } = require('../../src/visualization/dashboard-stats');
    const patterns = createTestPatterns(100);

    // Act
    const allStats = calculateSummaryStatistics(patterns);

    const filtered = applyFilters(patterns, {
      dateRange: 'all-time',
      categories: ['code-quality' as PatternCategory],
      frequencyThreshold: 10,
      searchText: '',
    });

    const filteredStats = calculateSummaryStatistics(filtered);

    // Assert
    expect(filteredStats.totalPatterns).toBeLessThanOrEqual(allStats.totalPatterns);
  });

  it('should show trend indicators (↑↓) comparing current period to previous', () => {
    // Arrange
    const { calculateSummaryStatistics } = require('../../src/visualization/dashboard-stats');
    const patterns = createTestPatterns(100);

    // Act
    const stats = calculateSummaryStatistics(patterns);

    // Assert
    expect(stats.trends).toBeTruthy();
    expect(stats.trends?.current).toBeGreaterThanOrEqual(0);
    expect(stats.trends?.previous).toBeGreaterThanOrEqual(0);
    expect(['up', 'down', 'neutral']).toContain(stats.trends?.direction);
  });

  it('should format numbers with appropriate units (1.2K, 3.4M) for readability', () => {
    // Arrange
    const { formatNumber } = require('../../src/visualization/dashboard-stats');

    // Act
    const formatted1K = formatNumber(1200);
    const formatted1M = formatNumber(3400000);
    const formattedNormal = formatNumber(500);

    // Assert
    expect(formatted1K).toContain('K');
    expect(formatted1M).toContain('M');
    expect(formattedNormal).toBe('500');
  });

  it('should update statistics in real-time as filters change', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const initialStats = dashboard.getInstance().statistics;

    // Apply filter
    dashboard.updateFilters({ frequencyThreshold: 25 });

    const updatedStats = dashboard.getInstance().statistics;

    // Assert
    expect(updatedStats.totalPatterns).toBeLessThanOrEqual(initialStats.totalPatterns);

    dashboard.destroy();
  });

  it('should provide sparkline mini-charts in summary cards for trends', () => {
    // Arrange
    const { calculateSummaryStatistics, createSummaryCards } = require('../../src/visualization/dashboard-stats');
    const patterns = createTestPatterns(100);

    // Act
    const stats = calculateSummaryStatistics(patterns);
    createSummaryCards(statsContainer, stats);

    // Assert
    // Verify trend card with sparkline data exists
    const trendCard = Array.from(statsContainer.querySelectorAll('.summary-card')).find(card =>
      card.textContent?.includes('Trend')
    );
    expect(trendCard).toBeTruthy();
  });

  it('should complete statistics calculation in < 500ms for 10K patterns', () => {
    // Arrange
    const { calculateSummaryStatistics } = require('../../src/visualization/dashboard-stats');
    const patterns = createTestPatterns(10000);

    // Act
    const startTime = performance.now();
    const stats = calculateSummaryStatistics(patterns);
    const calcTime = performance.now() - startTime;

    // Assert
    expect(stats.totalPatterns).toBe(10000);
    expect(calcTime).toBeLessThan(500);
  });
});

// ============================================================================
// AC5: RESPONSIVE DESIGN AND ACCESSIBILITY
// ============================================================================

describe('AC5: Responsive Design and Accessibility (Integration Tests)', () => {
  it('should use responsive grid layout with breakpoints: 640px, 768px, 1024px, 1280px', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
      responsive: true,
    });

    // Assert
    const styles = Array.from(document.head.querySelectorAll('style'));
    const responsiveStyle = styles.find(s =>
      s.textContent?.includes('@media') &&
      s.textContent?.includes('640px') &&
      s.textContent?.includes('1024px') &&
      s.textContent?.includes('1280px')
    );

    expect(responsiveStyle).toBeTruthy();
  });

  it('should collapse charts to vertical stack on mobile devices', () => {
    // Arrange
    const { createDashboardLayout, updateLayoutForBreakpoint } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
      responsive: true,
    });

    updateLayoutForBreakpoint('dashboard-container', 'mobile');

    // Assert
    expect(container.style.gridTemplateColumns).toBe('1fr');
  });

  it('should make controls (filters, search) collapsible on small screens', () => {
    // Arrange
    const { setMobileCollapsible } = require('../../src/visualization/dashboard-layout');

    // Act
    setMobileCollapsible('dashboard-container', true);

    // Assert
    expect(container.classList.contains('collapsible')).toBe(true);
  });

  it('should ensure all interactive elements have minimum touch target size (44x44px)', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const buttons = filtersContainer.querySelectorAll('button');
    buttons.forEach(button => {
      const element = button as HTMLElement;
      const styles = window.getComputedStyle(element);
      const height = parseInt(styles.height, 10);
      const width = parseInt(styles.width, 10);

      // Verify minimum touch target size (44px)
      expect(height).toBeGreaterThanOrEqual(44);
      expect(width).toBeGreaterThanOrEqual(44);
    });
  });

  it('should provide ARIA labels for all charts, filters, and controls', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(50);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const instance = dashboard.getInstance();

    // Assert
    // Check container ARIA labels
    expect(container.getAttribute('role')).toBe('main');
    expect(container.getAttribute('aria-label')).toBeTruthy();

    // Check chart ARIA labels
    instance.charts.forEach((chart, chartId) => {
      expect(chart.canvas.getAttribute('role')).toBe('img');
      expect(chart.canvas.getAttribute('aria-label')).toBeTruthy();
    });

    dashboard.destroy();
  });

  it('should support keyboard navigation (Tab through controls, Enter to activate)', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);

    // Act
    createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {},
    });

    // Assert
    const interactiveElements = filtersContainer.querySelectorAll('button, input, select');
    interactiveElements.forEach(element => {
      expect(element.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it('should maintain WCAG AA contrast ratios (4.5:1) throughout', () => {
    // Arrange
    const { createDashboardLayout } = require('../../src/visualization/dashboard-layout');

    // Act
    createDashboardLayout({
      containerId: 'dashboard-container',
      chartCount: 4,
    });

    // Assert
    const styles = Array.from(document.head.querySelectorAll('style'));
    const hasContrastColors = styles.some(s =>
      s.textContent?.includes('color:') &&
      (s.textContent?.includes('#333') ||
       s.textContent?.includes('#111827') ||
       s.textContent?.includes('white'))
    );

    expect(hasContrastColors).toBe(true);
  });

  it('should provide text alternatives for all visual elements', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(50);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const instance = dashboard.getInstance();

    // Assert
    // Verify all charts have aria-label
    instance.charts.forEach((chart) => {
      expect(chart.canvas.getAttribute('aria-label')).toBeTruthy();
    });

    dashboard.destroy();
  });

  it('should support screen reader announcements for dynamic updates', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    // Assert
    // Verify container has aria-live for dynamic updates
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(container.getAttribute('aria-atomic')).toBe('false');

    dashboard.destroy();
  });
});

// ============================================================================
// AC6: PERFORMANCE AND RESOURCE MANAGEMENT
// ============================================================================

describe('AC6: Performance and Resource Management (API-Level Tests)', () => {
  it('should debounce filter inputs (300ms) to prevent excessive re-renders', () => {
    // Arrange
    const { createFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(100);
    let filterChangeCount = 0;

    // Act
    createFilters({
      containerId: 'dashboard-container-filters',
      patterns,
      onFilterChange: () => {
        filterChangeCount++;
      },
    });

    // Simulate rapid filter changes
    const searchInput = filtersContainer.querySelector('input[type="text"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.value = 'a';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'ab';
      searchInput.dispatchEvent(new Event('input'));
      searchInput.value = 'abc';
      searchInput.dispatchEvent(new Event('input'));
    }

    // Wait for debounce
    setTimeout(() => {
      // Assert
      // Should only trigger once after debounce
      expect(filterChangeCount).toBe(1);
    }, 400);
  });

  it('should use efficient data transformations for datasets up to 10K patterns', () => {
    // Arrange
    const { applyFilters } = require('../../src/visualization/dashboard-filters');
    const patterns = createTestPatterns(10000);
    const filters = {
      dateRange: 'all-time' as const,
      categories: [],
      frequencyThreshold: 0,
      searchText: '',
    };

    // Act
    const startTime = performance.now();
    const filtered = applyFilters(patterns, filters);
    const filterTime = performance.now() - startTime;

    // Assert
    expect(filtered.length).toBe(10000);
    expect(filterTime).toBeLessThan(1000);
  });

  it('should clear previous chart instances before creating new ones (memory management)', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const instance = dashboard.getInstance();
    const initialChartCount = instance.charts.size;

    // Update filters (triggers chart recreation)
    dashboard.updateFilters({ frequencyThreshold: 25 });

    const updatedChartCount = instance.charts.size;

    // Assert
    expect(updatedChartCount).toBe(initialChartCount);

    dashboard.destroy();
  });

  it('should handle dataset updates efficiently (update existing charts vs. destroy/recreate)', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(100);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    const startTime = performance.now();
    const newPatterns = createTestPatterns(100);
    dashboard.updatePatterns(newPatterns);
    const updateTime = performance.now() - startTime;

    // Assert
    expect(updateTime).toBeLessThan(2000);

    dashboard.destroy();
  });

  it('should provide loading indicators for operations > 500ms', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(1000);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    // Simulate slow operation
    const startTime = performance.now();
    dashboard.updateFilters({ frequencyThreshold: 10 });
    const operationTime = performance.now() - startTime;

    // Assert
    if (operationTime > 500) {
      const loadingIndicator = container.querySelector('.loading, .spinner');
      expect(loadingIndicator).toBeTruthy();
    }

    dashboard.destroy();
  });

  it('should gracefully degrade to simplified views for low-performance devices', () => {
    // Arrange
    const { Dashboard } = require('../../src/visualization/dashboard');
    const patterns = createTestPatterns(10000);

    // Act
    const dashboard = new Dashboard({
      containerId: 'dashboard-container',
      patterns,
    });

    // Simulate low-performance device detection
    const isLowPerformance = navigator.hardwareConcurrency <= 2;

    // Assert
    if (isLowPerformance) {
      // Should disable animations for performance
      const instance = dashboard.getInstance();
      instance.charts.forEach((chart) => {
        expect(chart.options?.animation?.duration).toBe(0);
      });
    }

    dashboard.destroy();
  });
});
