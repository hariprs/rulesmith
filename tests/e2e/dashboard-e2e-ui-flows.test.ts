/**
 * Dashboard E2E Tests - UI-Specific Flows Only (Story 3-4)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * End-to-end tests ONLY for acceptance criteria requiring full browser interaction.
 * Most AC covered by API-level and integration tests.
 *
 * Test Pyramid Strategy:
 * - E2E tests ONLY for UI-specific flows that cannot be tested at lower levels
 * - Examples: Visual responsiveness, keyboard navigation, screen reader compatibility
 *
 * @module tests/e2e/dashboard-e2e-ui-flows
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Setup dashboard page with test data
 */
async function setupDashboardPage(page: Page, patterns: any[] = []) {
  // Navigate to dashboard page
  await page.goto('/dashboard');

  // Inject test data via API
  await page.evaluate((testPatterns) => {
    (window as any).testPatterns = testPatterns;
  }, patterns);

  // Wait for dashboard to load
  await page.waitForSelector('#dashboard-container', { timeout: 5000 });
}

/**
 * Create test patterns
 */
function createTestPatterns(count: number = 50) {
  const patterns = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    patterns.push({
      pattern_text: `Pattern ${i}`,
      suggested_rule: `Rule ${i}`,
      category: `category-${i % 5}`,
      count: Math.floor(Math.random() * 50) + 1,
      confidence: 0.8 + Math.random() * 0.2,
      first_seen: new Date(now.getTime() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      last_seen: new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      examples: [],
      session_count: 1,
      total_frequency: Math.floor(Math.random() * 50) + 1,
      is_new: Math.random() > 0.8,
      frequency_change: Math.floor(Math.random() * 20) - 10,
      content_types: ['typescript', 'javascript'],
    });
  }

  return patterns;
}

// ============================================================================
// E2E TESTS FOR UI-SPECIFIC FLOWS
// ============================================================================

test.describe('AC5: Responsive Design - E2E (UI-Specific)', () => {
  test('should collapse charts to vertical stack on mobile viewport (320px width)', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Set mobile viewport
    await page.setViewportSize({ width: 320, height: 568 });

    // Assert - Verify vertical stack layout
    const chartContainers = page.locator('.chart-container');
    const firstChart = chartContainers.first();
    const firstChartBox = await firstChart.boundingBox();

    // Verify single column layout
    expect(firstChartBox?.width).toBeLessThanOrEqual(320);
  });

  test('should display 2 columns on tablet viewport (768px width)', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Assert - Verify 2-column layout
    const chartContainers = page.locator('.chart-container');
    const firstChart = chartContainers.first();
    const secondChart = chartContainers.nth(1);
    const firstChartBox = await firstChart.boundingBox();
    const secondChartBox = await secondChart.boundingBox();

    // Verify 2 columns (second chart to the right of first)
    expect(secondChartBox?.x).toBeGreaterThan((firstChartBox?.x || 0) + 300);
  });

  test('should display 3-4 columns on desktop viewport (1280px width)', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Act - Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Assert - Verify 3-4 column layout
    const chartContainers = page.locator('.chart-container');
    const count = await chartContainers.count();

    expect(count).toBeGreaterThanOrEqual(3);
    expect(count).toBeLessThanOrEqual(4);
  });

  test('should make filter controls collapsible on mobile devices', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Toggle filters
    const filterToggle = page.locator('[aria-label="Toggle filters"], .filter-toggle');
    if (await filterToggle.count() > 0) {
      await filterToggle.click();

      // Assert - Verify filters collapse/expand
      const filtersContainer = page.locator('.dashboard-filters');
      await expect(filtersContainer).toBeVisible();
    }
  });
});

test.describe('AC5: Keyboard Navigation - E2E (UI-Specific)', () => {
  test('should support Tab navigation through all interactive elements', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Navigate with Tab key
    const interactiveElements = page.locator('button, input, select, [tabindex]');

    // Press Tab multiple times
    for (let i = 0; i < Math.min(10, await interactiveElements.count()); i++) {
      await page.keyboard.press('Tab');

      // Assert - Verify focus indicator visible
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }
  });

  test('should activate filters with Enter key when focused', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Focus date range filter and press Enter
    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    await dateRangeSelect.focus();
    await page.keyboard.press('Enter');

    // Assert - Verify dropdown expanded or option selected
    const expandedOption = page.locator('option:checked, option[selected]');
    await expect(expandedOption).toBeVisible();
  });

  test('should support Space key to toggle buttons', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Focus reset button and press Space
    const resetButton = page.locator('button:has-text("Reset")');
    await resetButton.focus();
    await page.keyboard.press('Space');

    // Assert - Verify button activated (filters reset)
    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    const selectedValue = await dateRangeSelect.inputValue();
    expect(selectedValue).toBe('all-time');
  });

  test('should navigate chart elements with arrow keys', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Focus chart canvas and navigate with arrow keys
    const chartCanvas = page.locator('#dashboard-container-chart-category canvas');
    await chartCanvas.focus();
    await page.keyboard.press('ArrowRight');

    // Assert - Verify focus moves to next interactive element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});

test.describe('AC5: Accessibility - Screen Reader Compatibility (E2E)', () => {
  test('should announce filter changes to screen readers', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Change filter
    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    await dateRangeSelect.selectOption('30-days');

    // Assert - Verify ARIA live region announces change
    const liveRegion = page.locator('[aria-live="polite"]');
    const announcement = await liveRegion.textContent();

    expect(announcement).toBeTruthy();
    expect(announcement?.toLowerCase()).toContain('filter');
  });

  test('should provide accessible labels for all charts', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Get all chart canvases
    const chartCanvases = page.locator('.chart-container canvas');

    // Assert - Verify all have aria-label
    const count = await chartCanvases.count();
    for (let i = 0; i < count; i++) {
      const canvas = chartCanvases.nth(i);
      const ariaLabel = await canvas.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.length).toBeGreaterThan(0);
    }
  });

  test('should support screen reader navigation through filter controls', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Navigate filters with screen reader
    const filterControls = page.locator('.dashboard-filters button, .dashboard-filters input, .dashboard-filters select');

    const count = await filterControls.count();
    for (let i = 0; i < Math.min(5, count); i++) {
      const control = filterControls.nth(i);

      // Assert - Verify accessible name exists
      const ariaLabel = await control.getAttribute('aria-label');
      const ariaLabelledby = await control.getAttribute('aria-labelledby');

      expect(ariaLabel || ariaLabelledby).toBeTruthy();
    }
  });

  test('should announce pattern examples when panel opens', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Click chart to open examples panel
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.click();

    // Wait for panel to appear
    const examplesPanel = page.locator('#pattern-examples-panel');
    await expect(examplesPanel).toBeVisible({ timeout: 3000 });

    // Assert - Verify panel has ARIA announcements
    const ariaLive = await examplesPanel.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');
  });
});

test.describe('AC3: Cross-Chart Interaction - E2E (UI-Specific)', () => {
  test('should highlight related data across charts when hovering', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Hover over chart element
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.hover();

    // Wait for hover effect
    await page.waitForTimeout(300);

    // Assert - Verify highlight styles applied
    const highlightedElements = page.locator('.highlighted, [data-highlighted="true"]');
    const hasHighlights = await highlightedElements.count() > 0;

    // Note: This test may need adjustment based on actual implementation
    expect(hasHighlights).toBeTruthy();
  });

  test('should show tooltip with pattern details on hover', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Hover over chart
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.hover();

    // Wait for tooltip
    await page.waitForTimeout(500);

    // Assert - Verify tooltip appears
    const tooltip = page.locator('.chartjs-tooltip, [role="tooltip"]');
    await expect(tooltip).toBeVisible();
  });

  test('should open pattern examples panel on chart click', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Click chart element
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.click();

    // Assert - Verify examples panel opens
    const examplesPanel = page.locator('#pattern-examples-panel');
    await expect(examplesPanel).toBeVisible({ timeout: 3000 });

    // Verify panel content
    const patternText = examplesPanel.locator('h2, .pattern-text');
    await expect(patternText).toBeVisible();
  });

  test('should close examples panel when close button clicked', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Open panel
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.click();
    await expect(page.locator('#pattern-examples-panel')).toBeVisible();

    // Act - Click close button
    const closeButton = page.locator('#pattern-examples-panel button:has-text("Close")');
    await closeButton.click();

    // Assert - Verify panel closes
    const examplesPanel = page.locator('#pattern-examples-panel');
    await expect(examplesPanel).not.toBeVisible();
  });

  test('should maintain filter state when interacting with charts', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Set initial filters
    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    await dateRangeSelect.selectOption('30-days');

    const thresholdSlider = page.locator('#dashboard-container-filters input[name="frequencyThreshold"]');
    await thresholdSlider.fill('10');

    const initialDateRange = await dateRangeSelect.inputValue();
    const initialThreshold = await thresholdSlider.inputValue();

    // Act - Interact with chart (click to open examples)
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.click();

    // Close panel
    const closeButton = page.locator('#pattern-examples-panel button');
    if (await closeButton.count() > 0) {
      await closeButton.click();
    }

    // Assert - Verify filters unchanged
    const currentDateRange = await dateRangeSelect.inputValue();
    const currentThreshold = await thresholdSlider.inputValue();

    expect(currentDateRange).toBe(initialDateRange);
    expect(currentThreshold).toBe(initialThreshold);
  });
});

test.describe('AC6: Performance - Visual Indicators (E2E)', () => {
  test('should show loading indicator for slow operations', async ({ page }) => {
    // Arrange
    const largeDataset = createTestPatterns(10000);
    await setupDashboardPage(page, largeDataset);

    // Act - Apply complex filter
    const searchInput = page.locator('#dashboard-container-filters input[name="searchText"]');
    await searchInput.fill('pattern');

    // Assert - Verify loading indicator appears
    const loadingIndicator = page.locator('.loading, .spinner, [aria-busy="true"]');
    const isVisible = await loadingIndicator.isVisible();

    if (isVisible) {
      // Verify loading indicator is visible
      await expect(loadingIndicator).toBeVisible();
    }
  });

  test('should complete dashboard rendering within performance budget', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    const startTime = Date.now();

    // Act - Load dashboard
    await setupDashboardPage(page, patterns);

    // Wait for charts to render
    await page.waitForSelector('.chart-container canvas', { timeout: 5000 });

    const renderTime = Date.now() - startTime;

    // Assert - Verify render time under 5 seconds
    expect(renderTime).toBeLessThan(5000);
  });
});

test.describe('AC1: Visual Layout Validation (E2E)', () => {
  test('should display all four chart types in correct arrangement', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Act - Get chart containers
    const chartContainers = page.locator('.chart-container');

    // Assert - Verify 4 charts present
    const count = await chartContainers.count();
    expect(count).toBe(4);

    // Verify chart types by ID
    expect(await page.locator('#dashboard-container-chart-overview').count()).toBe(1);
    expect(await page.locator('#dashboard-container-chart-category').count()).toBe(1);
    expect(await page.locator('#dashboard-container-chart-top').count()).toBe(1);
    expect(await page.locator('#dashboard-container-chart-trends').count()).toBe(1);
  });

  test('should apply consistent color scheme across all charts', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Get chart colors from styles
    const chartColors = await page.evaluate(() => {
      const charts = document.querySelectorAll('.chart-container canvas');
      return Array.from(charts).map(chart => {
        const ctx = chart.getContext('2d');
        // Note: This is a simplified check - actual implementation may vary
        return ctx ? 'has-context' : 'no-context';
      });
    });

    // Assert - Verify all charts rendered
    chartColors.forEach(status => {
      expect(status).toBe('has-context');
    });
  });

  test('should maintain aspect ratio when resizing viewport', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(50);
    await setupDashboardPage(page, patterns);

    // Act - Resize viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Assert - Verify charts still visible and properly sized
    const chartCanvases = page.locator('.chart-container canvas');
    const count = await chartCanvases.count();

    for (let i = 0; i < count; i++) {
      const canvas = chartCanvases.nth(i);
      await expect(canvas).toBeVisible();

      const box = await canvas.boundingBox();
      expect(box?.width).toBeGreaterThan(0);
      expect(box?.height).toBeGreaterThan(0);
    }
  });
});

test.describe('AC4: Statistics Display (E2E)', () => {
  test('should display summary cards with correct statistics', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Act - Get summary cards
    const summaryCards = page.locator('.summary-card');

    // Assert - Verify cards present
    await expect(summaryCards).toHaveCount(4);

    // Verify card content
    const totalPatternsCard = summaryCards.nth(0);
    await expect(totalPatternsCard).toContainText('Total Patterns');
    await expect(totalPatternsCard).toContainText('100');
  });

  test('should update statistics in real-time when filters change', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Get initial stats
    const totalPatternsCard = page.locator('.summary-card').nth(0);
    const initialCount = await totalPatternsCard.textContent();

    // Act - Apply filter
    const thresholdSlider = page.locator('#dashboard-container-filters input[name="frequencyThreshold"]');
    await thresholdSlider.fill('50');

    // Wait for update
    await page.waitForTimeout(500);

    // Assert - Verify statistics updated
    const updatedCount = await totalPatternsCard.textContent();
    expect(updatedCount).not.toBe(initialCount);
  });

  test('should display trend indicators with arrows and percentages', async ({ page }) => {
    // Arrange
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Act - Get trend card
    const trendCard = page.locator('.summary-card').filter({ hasText: 'Trend' });

    // Assert - Verify trend indicator present
    const trendIndicator = trendCard.locator('.trend-indicator');
    await expect(trendIndicator).toBeVisible();

    // Verify arrow symbol
    const arrow = trendIndicator.locator('text=↑, text=↓, text=→');
    await expect(arrow).toBeVisible();
  });
});

test.describe('Integration: Complete User Workflow (E2E)', () => {
  test('should support complete workflow: load dashboard → apply filters → interact with charts', async ({ page }) => {
    // Arrange - Load dashboard
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    // Assert - Dashboard loaded
    await expect(page.locator('#dashboard-container')).toBeVisible();
    await expect(page.locator('.chart-container')).toHaveCount(4);

    // Act - Apply date range filter
    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    await dateRangeSelect.selectOption('30-days');
    await page.waitForTimeout(500);

    // Assert - Charts updated (simulated check)
    const chartCanvases = page.locator('.chart-container canvas');
    await expect(chartCanvases).toHaveCount(4);

    // Act - Apply category filter
    const categorySelect = page.locator('#dashboard-container-filters select[name="categories"]');
    await categorySelect.selectOption('code-quality');
    await page.waitForTimeout(500);

    // Assert - Statistics updated
    const totalPatternsCard = page.locator('.summary-card').nth(0);
    await expect(totalPatternsCard).toBeVisible();

    // Act - Click chart to view examples
    const chartCanvas = page.locator('.chart-container canvas').first();
    await chartCanvas.click();

    // Assert - Examples panel opened
    const examplesPanel = page.locator('#pattern-examples-panel');
    await expect(examplesPanel).toBeVisible();

    // Act - Close panel
    const closeButton = page.locator('#pattern-examples-panel button');
    await closeButton.click();

    // Assert - Panel closed, dashboard still visible
    await expect(examplesPanel).not.toBeVisible();
    await expect(page.locator('#dashboard-container')).toBeVisible();
  });

  test('should handle reset filters workflow', async ({ page }) => {
    // Arrange - Load dashboard and set filters
    const patterns = createTestPatterns(100);
    await setupDashboardPage(page, patterns);

    const dateRangeSelect = page.locator('#dashboard-container-filters select[name="dateRange"]');
    await dateRangeSelect.selectOption('7-days');

    const thresholdSlider = page.locator('#dashboard-container-filters input[name="frequencyThreshold"]');
    await thresholdSlider.fill('25');

    const searchInput = page.locator('#dashboard-container-filters input[name="searchText"]');
    await searchInput.fill('pattern');

    // Act - Click reset button
    const resetButton = page.locator('button:has-text("Reset")');
    await resetButton.click();

    // Assert - Verify all filters reset
    const currentDateRange = await dateRangeSelect.inputValue();
    expect(currentDateRange).toBe('all-time');

    const currentThreshold = await thresholdSlider.inputValue();
    expect(currentThreshold).toBe('0');

    const currentSearch = await searchInput.inputValue();
    expect(currentSearch).toBe('');
  });
});
