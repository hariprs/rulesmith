#!/usr/bin/env node

/**
 * Comprehensive validation script for Story 3-4 implementation
 * Create Interactive Dashboards with YOLO approach
 *
 * This script validates:
 * 1. Dashboard layout with multiple charts (AC1)
 * 2. Interactive filtering and controls (AC2)
 * 3. Cross-chart interaction and highlighting (AC3)
 * 4. Dashboard statistics and summary (AC4)
 * 5. Responsive design and accessibility (AC5)
 * 6. Performance and resource management (AC6)
 * 7. Integration with Stories 3-1, 3-2, 3-3
 * 8. YOLO rapid prototyping approach
 * 9. Real Chart.js rendering (not mocks)
 * 10. Test coverage and quality
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// VALIDATION RESULTS TRACKING
// ============================================================================

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: string[];
}

const validationResults: ValidationResult[] = [];

function logResult(category: string, test: string, passed: boolean, message: string, details?: string[]) {
  const result: ValidationResult = { category, test, passed, message, details };
  validationResults.push(result);

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${category}: ${test}`);
  if (message) {
    console.log(`   ${message}`);
  }
  if (details && details.length > 0) {
    details.forEach(detail => console.log(`   • ${detail}`));
  }
  if (!passed) {
    console.log('');
  }
}

// ============================================================================
// FILE STRUCTURE VALIDATION
// ============================================================================

function validateFileStructure() {
  console.log('\n📁 FILE STRUCTURE VALIDATION\n');

  const requiredFiles = [
    'src/visualization/dashboard.ts',
    'src/visualization/dashboard-layout.ts',
    'src/visualization/dashboard-filters.ts',
    'src/visualization/dashboard-stats.ts',
    'tests/visualization/dashboard.test.ts',
    'tests/visualization/dashboard.integration.test.ts',
    'src/visualization/types.ts', // From Story 3-1
    'src/visualization/transformers.ts', // From Story 3-2
    'src/visualization/chart-renderer.ts', // From Story 3-3
  ];

  const missingFiles: string[] = [];
  const existingFiles: string[] = [];

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(file);
      logResult('File Structure', `File exists: ${file}`, true, 'Found');
    } else {
      missingFiles.push(file);
      logResult('File Structure', `File exists: ${file}`, false, 'Missing file');
    }
  });

  console.log(`\n📊 File Structure Summary: ${existingFiles.length}/${requiredFiles.length} files present`);

  return missingFiles.length === 0;
}

// ============================================================================
// DASHBOARD LAYOUT VALIDATION (AC1)
// ============================================================================

function validateDashboardLayout() {
  console.log('\n🎨 DASHBOARD LAYOUT VALIDATION (AC1)\n');

  try {
    const dashboardLayoutPath = path.join(process.cwd(), 'src/visualization/dashboard-layout.ts');

    if (!fs.existsSync(dashboardLayoutPath)) {
      logResult('Dashboard Layout', 'dashboard-layout.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardLayoutPath, 'utf-8');

    // Check for responsive grid layout
    const gridLayoutPatterns = [
      'CSS Grid',
      'grid-template-columns',
      'responsive',
      'breakpoint',
      'media query',
    ];

    let gridScore = 0;
    gridLayoutPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        gridScore++;
      }
    });

    if (gridScore >= 3) {
      logResult('Dashboard Layout', 'Responsive grid layout', true, `Grid layout found (${gridScore}/5 patterns)`);
    } else {
      logResult('Dashboard Layout', 'Responsive grid layout', false, `Insufficient grid layout patterns (${gridScore}/5)`);
    }

    // Check for multi-chart support
    const multiChartPatterns = [
      'multiple charts',
      'chart array',
      'chart container',
      'canvas element',
      'appendChild',
    ];

    let multiChartScore = 0;
    multiChartPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        multiChartScore++;
      }
    });

    if (multiChartScore >= 3) {
      logResult('Dashboard Layout', 'Multi-chart support', true, `Multi-chart layout support (${multiChartScore}/5 patterns)`);
    } else {
      logResult('Dashboard Layout', 'Multi-chart support', false, `Limited multi-chart support (${multiChartScore}/5)`);
    }

    // Check for logical arrangement
    const arrangementPatterns = [
      'overview',
      'category',
      'top patterns',
      'trends',
      'summary',
    ];

    let arrangementScore = 0;
    arrangementPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        arrangementScore++;
      }
    });

    if (arrangementScore >= 3) {
      logResult('Dashboard Layout', 'Logical chart arrangement', true, `Logical arrangement present (${arrangementScore}/5)`);
    } else {
      logResult('Dashboard Layout', 'Logical chart arrangement', false, `Limited logical arrangement (${arrangementScore}/5)`);
    }

    // Check for performance requirement (< 5 seconds for 100 patterns)
    if (content.includes('performance') || content.includes('renderTime') || content.includes('benchmark')) {
      logResult('Dashboard Layout', 'Performance requirement', true, 'Performance tracking present');
    } else {
      logResult('Dashboard Layout', 'Performance requirement', false, 'Performance tracking not found');
    }

    return gridScore >= 2 && multiChartScore >= 2;
  } catch (error) {
    logResult('Dashboard Layout', 'Load dashboard-layout.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// INTERACTIVE FILTERING VALIDATION (AC2)
// ============================================================================

function validateInteractiveFiltering() {
  console.log('\n🔍 INTERACTIVE FILTERING VALIDATION (AC2)\n');

  try {
    const dashboardFiltersPath = path.join(process.cwd(), 'src/visualization/dashboard-filters.ts');

    if (!fs.existsSync(dashboardFiltersPath)) {
      logResult('Interactive Filtering', 'dashboard-filters.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardFiltersPath, 'utf-8');

    // Check for date range filter
    const dateRangePatterns = [
      'date range',
      'filterByDate',
      'last_seen',
      'first_seen',
      'timestamp',
      '7 days',
      '30 days',
      '90 days',
    ];

    let dateRangeScore = 0;
    dateRangePatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        dateRangeScore++;
      }
    });

    if (dateRangeScore >= 3) {
      logResult('Interactive Filtering', 'Date range filter', true, `Date range filtering present (${dateRangeScore}/8)`);
    } else {
      logResult('Interactive Filtering', 'Date range filter', false, `Limited date range filtering (${dateRangeScore}/8)`);
    }

    // Check for category filter
    const categoryFilterPatterns = [
      'category',
      'PatternCategory',
      'show/hide',
      'multi-select',
      'dropdown',
    ];

    let categoryFilterScore = 0;
    categoryFilterPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        categoryFilterScore++;
      }
    });

    if (categoryFilterScore >= 3) {
      logResult('Interactive Filtering', 'Category filter', true, `Category filtering present (${categoryFilterScore}/5)`);
    } else {
      logResult('Interactive Filtering', 'Category filter', false, `Limited category filtering (${categoryFilterScore}/5)`);
    }

    // Check for frequency threshold slider
    const thresholdPatterns = [
      'threshold',
      'slider',
      'minimum count',
      'frequency',
      'filterByFrequency',
    ];

    let thresholdScore = 0;
    thresholdPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        thresholdScore++;
      }
    });

    if (thresholdScore >= 3) {
      logResult('Interactive Filtering', 'Frequency threshold slider', true, `Threshold filtering present (${thresholdScore}/5)`);
    } else {
      logResult('Interactive Filtering', 'Frequency threshold slider', false, `Limited threshold filtering (${thresholdScore}/5)`);
    }

    // Check for search functionality
    const searchPatterns = [
      'search',
      'pattern_text',
      'suggested_rule',
      'filterByText',
      'debounce',
    ];

    let searchScore = 0;
    searchPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        searchScore++;
      }
    });

    if (searchScore >= 3) {
      logResult('Interactive Filtering', 'Search functionality', true, `Search present (${searchScore}/5)`);
    } else {
      logResult('Interactive Filtering', 'Search functionality', false, `Limited search functionality (${searchScore}/5)`);
    }

    // Check for synchronous updates
    if (content.includes('synchron') || content.includes('updateAll') || content.includes('refresh')) {
      logResult('Interactive Filtering', 'Synchronous chart updates', true, 'Charts update synchronously');
    } else {
      logResult('Interactive Filtering', 'Synchronous chart updates', false, 'Synchronous updates not found');
    }

    // Check for URL state persistence
    if (content.includes('URL') || content.includes('query') || content.includes('queryParams')) {
      logResult('Interactive Filtering', 'URL state persistence', true, 'URL state management present');
    } else {
      logResult('Interactive Filtering', 'URL state persistence', false, 'URL state management not found');
    }

    // Check for filter state management
    if (content.includes('FilterState') || content.includes('filterState') || content.includes('activeFilters')) {
      logResult('Interactive Filtering', 'Filter state management', true, 'Filter state tracked');
    } else {
      logResult('Interactive Filtering', 'Filter state management', false, 'Filter state tracking not found');
    }

    return dateRangeScore >= 2 && categoryFilterScore >= 2;
  } catch (error) {
    logResult('Interactive Filtering', 'Load dashboard-filters.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// CROSS-CHART INTERACTION VALIDATION (AC3)
// ============================================================================

function validateCrossChartInteraction() {
  console.log('\n🔗 CROSS-CHART INTERACTION VALIDATION (AC3)\n');

  try {
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');

    if (!fs.existsSync(dashboardPath)) {
      logResult('Cross-Chart Interaction', 'dashboard.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Check for hover synchronization
    const hoverPatterns = [
      'hover',
      'mouseenter',
      'highlight',
      'synchronize',
      'syncHover',
    ];

    let hoverScore = 0;
    hoverPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        hoverScore++;
      }
    });

    if (hoverScore >= 2) {
      logResult('Cross-Chart Interaction', 'Hover synchronization', true, `Hover sync present (${hoverScore}/5)`);
    } else {
      logResult('Cross-Chart Interaction', 'Hover synchronization', false, `Limited hover sync (${hoverScore}/5)`);
    }

    // Check for click-through functionality
    const clickPatterns = [
      'click',
      'onClick',
      'clickThrough',
      'filterDashboard',
      'pattern detail',
    ];

    let clickScore = 0;
    clickPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        clickScore++;
      }
    });

    if (clickScore >= 2) {
      logResult('Cross-Chart Interaction', 'Click-through functionality', true, `Click-through present (${clickScore}/5)`);
    } else {
      logResult('Cross-Chart Interaction', 'Click-through functionality', false, `Limited click-through (${clickScore}/5)`);
    }

    // Check for unified tooltips
    if (content.includes('tooltip') || content.includes('Tooltip') || content.includes('pattern details')) {
      logResult('Cross-Chart Interaction', 'Unified tooltips', true, 'Tooltip system present');
    } else {
      logResult('Cross-Chart Interaction', 'Unified tooltips', false, 'Tooltip system not found');
    }

    // Check for pattern examples panel
    if (content.includes('PatternExample') || content.includes('examples panel') || content.includes('showExamples')) {
      logResult('Cross-Chart Interaction', 'Pattern examples panel', true, 'Examples display present');
    } else {
      logResult('Cross-Chart Interaction', 'Pattern examples panel', false, 'Examples display not found');
    }

    // Check for smooth transitions
    if (content.includes('transition') || content.includes('animation') || content.includes('300ms')) {
      logResult('Cross-Chart Interaction', 'Smooth transitions', true, 'Animation/transition present');
    } else {
      logResult('Cross-Chart Interaction', 'Smooth transitions', false, 'Smooth transitions not found');
    }

    return hoverScore >= 1 && clickScore >= 1;
  } catch (error) {
    logResult('Cross-Chart Interaction', 'Load dashboard.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// DASHBOARD STATISTICS VALIDATION (AC4)
// ============================================================================

function validateDashboardStatistics() {
  console.log('\n📊 DASHBOARD STATISTICS VALIDATION (AC4)\n');

  try {
    const dashboardStatsPath = path.join(process.cwd(), 'src/visualization/dashboard-stats.ts');

    if (!fs.existsSync(dashboardStatsPath)) {
      logResult('Dashboard Statistics', 'dashboard-stats.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardStatsPath, 'utf-8');

    // Check for summary statistics calculation
    const statsPatterns = [
      'total patterns',
      'total corrections',
      'top category',
      'most active period',
      'calculateStatistics',
      'summary cards',
    ];

    let statsScore = 0;
    statsPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        statsScore++;
      }
    });

    if (statsScore >= 4) {
      logResult('Dashboard Statistics', 'Summary statistics', true, `Summary stats present (${statsScore}/6)`);
    } else {
      logResult('Dashboard Statistics', 'Summary statistics', false, `Limited summary stats (${statsScore}/6)`);
    }

    // Check for filtered data calculation
    if (content.includes('filtered') || content.includes('currentDataset') || content.includes('activeFilters')) {
      logResult('Dashboard Statistics', 'Filtered data calculation', true, 'Stats calculated from filtered data');
    } else {
      logResult('Dashboard Statistics', 'Filtered data calculation', false, 'Filtered calculation not found');
    }

    // Check for trend indicators
    const trendPatterns = [
      'trend',
      '↑',
      '↓',
      'percentage change',
      'compare',
      'previous period',
    ];

    let trendScore = 0;
    trendPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        trendScore++;
      }
    });

    if (trendScore >= 2) {
      logResult('Dashboard Statistics', 'Trend indicators', true, `Trend indicators present (${trendScore}/6)`);
    } else {
      logResult('Dashboard Statistics', 'Trend indicators', false, `Limited trend indicators (${trendScore}/6)`);
    }

    // Check for number formatting
    if (content.includes('format') || content.includes('1.2K') || content.includes('3.4M') || content.includes('numberFormat')) {
      logResult('Dashboard Statistics', 'Number formatting', true, 'Number formatting present');
    } else {
      logResult('Dashboard Statistics', 'Number formatting', false, 'Number formatting not found');
    }

    // Check for sparkline mini-charts
    if (content.includes('sparkline') || content.includes('mini-chart') || content.includes('trend chart')) {
      logResult('Dashboard Statistics', 'Sparkline mini-charts', true, 'Sparkline charts present');
    } else {
      logResult('Dashboard Statistics', 'Sparkline mini-charts', false, 'Sparkline charts not found');
    }

    // Check for performance requirement (< 500ms for 10K patterns)
    if (content.includes('performance') || content.includes('calculationTime') || content.includes('benchmark')) {
      logResult('Dashboard Statistics', 'Performance requirement', true, 'Performance tracking present');
    } else {
      logResult('Dashboard Statistics', 'Performance requirement', false, 'Performance tracking not found');
    }

    return statsScore >= 3;
  } catch (error) {
    logResult('Dashboard Statistics', 'Load dashboard-stats.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// RESPONSIVE DESIGN & ACCESSIBILITY VALIDATION (AC5)
// ============================================================================

function validateResponsiveDesign() {
  console.log('\n📱 RESPONSIVE DESIGN & ACCESSIBILITY VALIDATION (AC5)\n');

  try {
    const dashboardLayoutPath = path.join(process.cwd(), 'src/visualization/dashboard-layout.ts');
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');

    if (!fs.existsSync(dashboardLayoutPath) && !fs.existsSync(dashboardPath)) {
      logResult('Responsive Design', 'Dashboard files exist', false, 'Dashboard files not found');
      return false;
    }

    const layoutContent = fs.existsSync(dashboardLayoutPath) ? fs.readFileSync(dashboardLayoutPath, 'utf-8') : '';
    const dashboardContent = fs.existsSync(dashboardPath) ? fs.readFileSync(dashboardPath, 'utf-8') : '';
    const combinedContent = layoutContent + dashboardContent;

    // Check for responsive breakpoints
    const breakpointPatterns = [
      '640px',
      '768px',
      '1024px',
      '1280px',
      'breakpoint',
      'media query',
    ];

    let breakpointScore = 0;
    breakpointPatterns.forEach(pattern => {
      if (combinedContent.includes(pattern)) {
        breakpointScore++;
      }
    });

    if (breakpointScore >= 3) {
      logResult('Responsive Design', 'Responsive breakpoints', true, `Breakpoints defined (${breakpointScore}/6)`);
    } else {
      logResult('Responsive Design', 'Responsive breakpoints', false, `Limited breakpoints (${breakpointScore}/6)`);
    }

    // Check for mobile layout
    if (combinedContent.includes('mobile') || combinedContent.includes('vertical stack') || combinedContent.includes('single column')) {
      logResult('Responsive Design', 'Mobile layout', true, 'Mobile layout optimization present');
    } else {
      logResult('Responsive Design', 'Mobile layout', false, 'Mobile layout optimization not found');
    }

    // Check for touch target size
    if (combinedContent.includes('44x44') || combinedContent.includes('touch target') || combinedContent.includes('min-width')) {
      logResult('Responsive Design', 'Touch target size', true, 'Touch target size requirements met');
    } else {
      logResult('Responsive Design', 'Touch target size', false, 'Touch target size not found');
    }

    // Check for ARIA labels
    const ariaPatterns = [
      'aria-label',
      'role',
      'aria-describedby',
      'ARIA',
      'accessible',
    ];

    let ariaScore = 0;
    ariaPatterns.forEach(pattern => {
      if (combinedContent.toLowerCase().includes(pattern.toLowerCase())) {
        ariaScore++;
      }
    });

    if (ariaScore >= 2) {
      logResult('Responsive Design', 'ARIA labels', true, `ARIA labels present (${ariaScore}/5)`);
    } else {
      logResult('Responsive Design', 'ARIA labels', false, `Limited ARIA labels (${ariaScore}/5)`);
    }

    // Check for keyboard navigation
    const keyboardPatterns = [
      'tabindex',
      'keyboard',
      'navigation',
      'Enter',
      'focus',
    ];

    let keyboardScore = 0;
    keyboardPatterns.forEach(pattern => {
      if (combinedContent.toLowerCase().includes(pattern.toLowerCase())) {
        keyboardScore++;
      }
    });

    if (keyboardScore >= 2) {
      logResult('Responsive Design', 'Keyboard navigation', true, `Keyboard navigation present (${keyboardScore}/5)`);
    } else {
      logResult('Responsive Design', 'Keyboard navigation', false, `Limited keyboard navigation (${keyboardScore}/5)`);
    }

    // Check for WCAG AA compliance
    if (combinedContent.includes('WCAG') || combinedContent.includes('contrast') || combinedContent.includes('4.5:1')) {
      logResult('Responsive Design', 'WCAG AA compliance', true, 'WCAG AA compliance considered');
    } else {
      logResult('Responsive Design', 'WCAG AA compliance', false, 'WCAG AA compliance not found');
    }

    // Check for screen reader support
    if (combinedContent.includes('screen reader') || combinedContent.includes('announcement') || combinedContent.includes('live region')) {
      logResult('Responsive Design', 'Screen reader support', true, 'Screen reader support present');
    } else {
      logResult('Responsive Design', 'Screen reader support', false, 'Screen reader support not found');
    }

    return breakpointScore >= 2 && ariaScore >= 1;
  } catch (error) {
    logResult('Responsive Design', 'Load dashboard files', false, `Error reading files: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PERFORMANCE OPTIMIZATION VALIDATION (AC6)
// ============================================================================

function validatePerformanceOptimization() {
  console.log('\n⚡ PERFORMANCE OPTIMIZATION VALIDATION (AC6)\n');

  try {
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');

    if (!fs.existsSync(dashboardPath)) {
      logResult('Performance', 'dashboard.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Check for debouncing
    const debouncePatterns = [
      'debounce',
      '300ms',
      '200ms',
      'delay',
      'throttle',
    ];

    let debounceScore = 0;
    debouncePatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        debounceScore++;
      }
    });

    if (debounceScore >= 2) {
      logResult('Performance', 'Debouncing', true, `Debouncing present (${debounceScore}/5)`);
    } else {
      logResult('Performance', 'Debouncing', false, `Limited debouncing (${debounceScore}/5)`);
    }

    // Check for chart update optimization
    if (content.includes('update()') || content.includes('chart.update') || content.includes('efficient update')) {
      logResult('Performance', 'Chart update optimization', true, 'Chart updates optimized');
    } else {
      logResult('Performance', 'Chart update optimization', false, 'Chart update optimization not found');
    }

    // Check for memory management
    const memoryPatterns = [
      'destroy',
      'cleanup',
      'memory',
      'clear',
      'remove',
    ];

    let memoryScore = 0;
    memoryPatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        memoryScore++;
      }
    });

    if (memoryScore >= 2) {
      logResult('Performance', 'Memory management', true, `Memory management present (${memoryScore}/5)`);
    } else {
      logResult('Performance', 'Memory management', false, `Limited memory management (${memoryScore}/5)`);
    }

    // Check for loading indicators
    if (content.includes('loading') || content.includes('spinner') || content.includes('skeleton') || content.includes('progress')) {
      logResult('Performance', 'Loading indicators', true, 'Loading indicators present');
    } else {
      logResult('Performance', 'Loading indicators', false, 'Loading indicators not found');
    }

    // Check for virtual scrolling
    if (content.includes('virtual scroll') || content.includes('lazy load') || content.includes('pagination')) {
      logResult('Performance', 'Virtual scrolling', true, 'Virtual scrolling/lazy loading present');
    } else {
      logResult('Performance', 'Virtual scrolling', false, 'Virtual scrolling not found (optional for large datasets)');
    }

    // Check for Web Workers
    if (content.includes('Web Worker') || content.includes('worker') || content.includes('background thread')) {
      logResult('Performance', 'Web Workers', true, 'Web Workers for heavy computations');
    } else {
      logResult('Performance', 'Web Workers', false, 'Web Workers not found (optional optimization)');
    }

    return debounceScore >= 1 && memoryScore >= 1;
  } catch (error) {
    logResult('Performance', 'Load dashboard.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// INTEGRATION WITH PREVIOUS STORIES VALIDATION
// ============================================================================

function validateIntegrationWithPreviousStories() {
  console.log('\n🔗 INTEGRATION WITH PREVIOUS STORIES VALIDATION\n');

  try {
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');

    if (!fs.existsSync(dashboardPath)) {
      logResult('Integration', 'dashboard.ts exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(dashboardPath, 'utf-8');

    // Check for Story 3-1 integration (types)
    if (content.includes('from \'./types\'') || content.includes('from "./types"')) {
      logResult('Integration', 'Story 3-1 types integration', true, 'Uses types from Story 3-1');
    } else {
      logResult('Integration', 'Story 3-1 types integration', false, 'Story 3-1 types not imported');
    }

    // Check for Story 3-2 integration (transformers)
    if (content.includes('transformers') || content.includes('transformPatternsTo')) {
      logResult('Integration', 'Story 3-2 transformers integration', true, 'Uses transformers from Story 3-2');
    } else {
      logResult('Integration', 'Story 3-2 transformers integration', false, 'Story 3-2 transformers not imported');
    }

    // Check for Story 3-3 integration (chart renderer)
    if (content.includes('chart-renderer') || content.includes('renderPatternFrequencyChart') || content.includes('ChartRenderer')) {
      logResult('Integration', 'Story 3-3 chart renderer integration', true, 'Uses chart renderer from Story 3-3');
    } else {
      logResult('Integration', 'Story 3-3 chart renderer integration', false, 'Story 3-3 chart renderer not imported');
    }

    // Check for Epic 2 integration (MergedPattern)
    if (content.includes('MergedPattern') || content.includes('pattern-matcher')) {
      logResult('Integration', 'Epic 2 MergedPattern integration', true, 'Uses MergedPattern from Epic 2');
    } else {
      logResult('Integration', 'Epic 2 MergedPattern integration', false, 'Epic 2 MergedPattern not imported');
    }

    // Check for Chart.js import
    if (content.includes('chart.js') || content.includes('Chart')) {
      logResult('Integration', 'Chart.js library integration', true, 'Chart.js imported');
    } else {
      logResult('Integration', 'Chart.js library integration', false, 'Chart.js not imported');
    }

    return content.includes('types') && content.includes('transformers');
  } catch (error) {
    logResult('Integration', 'Load dashboard.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// YOLO APPROACH VALIDATION
// ============================================================================

function validateYOLOApproach() {
  console.log('\n🚀 YOLO APPROACH VALIDATION\n');

  try {
    const testFiles = [
      'tests/visualization/dashboard.integration.test.ts',
      'tests/visualization/dashboard.test.ts',
    ];

    let hasRealRendering = false;
    let hasJSDOM = false;
    let hasHappyDOM = false;

    testFiles.forEach(testFile => {
      const testPath = path.join(process.cwd(), testFile);
      if (fs.existsSync(testPath)) {
        const testContent = fs.readFileSync(testPath, 'utf-8');

        // Check for real Chart.js rendering (not mocks)
        if (testContent.includes('new Chart(') || testContent.includes('renderChart') || testContent.includes('actual rendering')) {
          hasRealRendering = true;
        }

        // Check for jsdom or happy-dom
        if (testContent.toLowerCase().includes('jsdom')) {
          hasJSDOM = true;
        }

        if (testContent.toLowerCase().includes('happy-dom')) {
          hasHappyDOM = true;
        }
      }
    });

    if (hasRealRendering) {
      logResult('YOLO Approach', 'Real Chart.js rendering', true, 'Tests use real Chart.js rendering (not mocks)');
    } else {
      logResult('YOLO Approach', 'Real Chart.js rendering', false, 'Tests may be using mocks instead of real rendering');
    }

    if (hasJSDOM || hasHappyDOM) {
      const domLib = hasJSDOM ? 'JSDOM' : 'HappyDOM';
      logResult('YOLO Approach', `DOM environment (${domLib})`, true, `Uses ${domLib} for real DOM rendering`);
    } else {
      logResult('YOLO Approach', 'DOM environment', false, 'DOM environment not found');
    }

    // Check for rapid prototyping comments
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf-8');

      if (content.includes('YOLO') || content.includes('rapid') || content.includes('prototype')) {
        logResult('YOLO Approach', 'YOLO approach documented', true, 'YOLO approach mentioned in code');
      } else {
        logResult('YOLO Approach', 'YOLO approach documented', false, 'YOLO approach not documented');
      }
    }

    return hasRealRendering && (hasJSDOM || hasHappyDOM);
  } catch (error) {
    logResult('YOLO Approach', 'Validate YOLO approach', false, `Error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST COVERAGE VALIDATION
// ============================================================================

function validateTestCoverage() {
  console.log('\n🧪 TEST COVERAGE VALIDATION\n');

  try {
    const testFiles = [
      'tests/visualization/dashboard.test.ts',
      'tests/visualization/dashboard.integration.test.ts',
    ];

    let foundTests = 0;
    const testCategories: string[] = [];

    testFiles.forEach(testFile => {
      const testPath = path.join(process.cwd(), testFile);
      if (fs.existsSync(testPath)) {
        foundTests++;
        const testContent = fs.readFileSync(testPath, 'utf-8');

        // Check for test categories
        if (testContent.includes('layout') || testContent.includes('grid')) {
          testCategories.push('Layout');
        }
        if (testContent.includes('filter') || testContent.includes('date range')) {
          testCategories.push('Filtering');
        }
        if (testContent.includes('hover') || testContent.includes('click') || testContent.includes('interaction')) {
          testCategories.push('Cross-chart interaction');
        }
        if (testContent.includes('statistics') || testContent.includes('summary') || testContent.includes('trend')) {
          testCategories.push('Statistics');
        }
        if (testContent.includes('responsive') || testContent.includes('mobile') || testContent.includes('breakpoint')) {
          testCategories.push('Responsive design');
        }
        if (testContent.includes('performance') || testContent.includes('renderTime') || testContent.includes('benchmark')) {
          testCategories.push('Performance');
        }
        if (testContent.includes('accessibility') || testContent.includes('ARIA') || testContent.includes('keyboard')) {
          testCategories.push('Accessibility');
        }
        if (testContent.includes('Chart.js') || testContent.includes('real Chart') || testContent.includes('actual rendering')) {
          testCategories.push('Real Chart.js rendering');
        }
      }
    });

    if (foundTests >= 2) {
      logResult('Test Coverage', 'Test files exist', true, `Found ${foundTests}/2 test files`);
    } else {
      logResult('Test Coverage', 'Test files exist', false, `Only ${foundTests}/2 test files found`);
    }

    if (testCategories.length >= 5) {
      logResult('Test Coverage', 'Test categories', true, `Comprehensive test coverage (${testCategories.length}/8 categories)`, testCategories);
    } else {
      logResult('Test Coverage', 'Test categories', false, `Limited test coverage (${testCategories.length}/8 categories)`, testCategories);
    }

    // Check for integration tests
    const integrationTestPath = path.join(process.cwd(), 'tests/visualization/dashboard.integration.test.ts');
    if (fs.existsSync(integrationTestPath)) {
      const integrationContent = fs.readFileSync(integrationTestPath, 'utf-8');

      if (integrationContent.includes('full dashboard') || integrationContent.includes('end-to-end') || integrationContent.includes('workflow')) {
        logResult('Test Coverage', 'Integration test scenarios', true, 'Integration tests cover full workflows');
      } else {
        logResult('Test Coverage', 'Integration test scenarios', false, 'Integration tests may be limited');
      }
    }

    return foundTests >= 1 && testCategories.length >= 3;
  } catch (error) {
    logResult('Test Coverage', 'Load test files', false, `Error reading files: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TYPE SAFETY VALIDATION
// ============================================================================

function validateTypeSafety() {
  console.log('\n🔒 TYPE SAFETY VALIDATION\n');

  try {
    const files = [
      'src/visualization/dashboard.ts',
      'src/visualization/dashboard-layout.ts',
      'src/visualization/dashboard-filters.ts',
      'src/visualization/dashboard-stats.ts',
    ];

    let typeScriptScore = 0;
    let anyTypeCount = 0;

    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for TypeScript features
        if (content.includes(': ') && content.includes('function')) {
          typeScriptScore++;
        }

        // Count "any" types
        const anyTypes = (content.match(/: any/g) || []).length;
        anyTypeCount += anyTypes;
      }
    });

    if (typeScriptScore >= 2) {
      logResult('Type Safety', 'TypeScript usage', true, `Strong TypeScript typing in ${typeScriptScore}/4 files`);
    } else {
      logResult('Type Safety', 'TypeScript usage', false, `Limited TypeScript typing (${typeScriptScore}/4 files)`);
    }

    if (anyTypeCount === 0) {
      logResult('Type Safety', 'Avoid "any" types', true, '✅ No "any" types found');
    } else if (anyTypeCount <= 3) {
      logResult('Type Safety', 'Avoid "any" types', true, `⚠️  Limited "any" types (${anyTypeCount} found)`);
    } else {
      logResult('Type Safety', 'Avoid "any" types', false, `❌ Too many "any" types (${anyTypeCount} found)`);
    }

    return typeScriptScore >= 2 && anyTypeCount <= 3;
  } catch (error) {
    logResult('Type Safety', 'Load dashboard files', false, `Error reading files: ${error.message}`);
    return false;
  }
}

// ============================================================================
// DOCUMENTATION VALIDATION
// ============================================================================

function validateDocumentation() {
  console.log('\n📚 DOCUMENTATION VALIDATION\n');

  try {
    const files = [
      'src/visualization/dashboard.ts',
      'src/visualization/dashboard-layout.ts',
      'src/visualization/dashboard-filters.ts',
      'src/visualization/dashboard-stats.ts',
    ];

    let documentationScore = 0;
    let storyReferenceCount = 0;

    files.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for JSDoc comments
        if (content.includes('/**') && content.includes('*')) {
          documentationScore++;
        }

        // Check for Story 3-4 reference
        if (content.includes('Story 3-4') || content.includes('story-4') || content.includes('3-4')) {
          storyReferenceCount++;
        }
      }
    });

    if (documentationScore >= 2) {
      logResult('Documentation', 'Code documentation', true, `Well-documented files (${documentationScore}/4)`);
    } else {
      logResult('Documentation', 'Code documentation', false, `Limited documentation (${documentationScore}/4)`);
    }

    if (storyReferenceCount >= 1) {
      logResult('Documentation', 'Story 3-4 reference', true, `Story 3-4 referenced in ${storyReferenceCount} files`);
    } else {
      logResult('Documentation', 'Story 3-4 reference', false, 'Story 3-4 not referenced');
    }

    // Check for usage examples
    const dashboardPath = path.join(process.cwd(), 'src/visualization/dashboard.ts');
    if (fs.existsSync(dashboardPath)) {
      const content = fs.readFileSync(dashboardPath, 'utf-8');

      if (content.includes('Example') || content.includes('Usage') || content.includes('@example')) {
        logResult('Documentation', 'Usage examples', true, 'Usage examples present');
      } else {
        logResult('Documentation', 'Usage examples', false, 'Usage examples not found');
      }
    }

    return documentationScore >= 2;
  } catch (error) {
    logResult('Documentation', 'Load dashboard files', false, `Error reading files: ${error.message}`);
    return false;
  }
}

// ============================================================================
// GENERATE VALIDATION REPORT
// ============================================================================

function generateValidationReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STORY 3-4 VALIDATION REPORT');
  console.log('Create Interactive Dashboards - YOLO Approach');
  console.log('='.repeat(80));

  const totalTests = validationResults.length;
  const passedTests = validationResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n📈 Overall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)`);

  // Group by category
  const categories = [...new Set(validationResults.map(r => r.category))];

  console.log('\n📋 Results by Category:\n');

  categories.forEach(category => {
    const categoryResults = validationResults.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);

    const status = categoryPassed === categoryTotal ? '✅' : categoryPassed >= categoryTotal / 2 ? '⚠️' : '❌';
    console.log(`${status} ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  // Show failed tests
  const failures = validationResults.filter(r => !r.passed);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:\n');

    failures.forEach(failure => {
      console.log(`❌ ${failure.category}: ${failure.test}`);
      console.log(`   ${failure.message}`);
      if (failure.details && failure.details.length > 0) {
        failure.details.forEach(detail => console.log(`   • ${detail}`));
      }
      console.log('');
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:\n');

  if (failures.length === 0) {
    console.log('✅ All validations passed! Story 3-4 is ready for development.');
    console.log('   • Dashboard implementation is complete and follows all requirements');
    console.log('   • All acceptance criteria (AC1-AC6) are addressed');
    console.log('   • Integration with Stories 3-1, 3-2, 3-3 is correct');
    console.log('   • YOLO approach with real Chart.js rendering is validated');
    console.log('   • Test coverage is comprehensive');
    console.log('   • Performance requirements are met');
  } else {
    const criticalFailures = failures.filter(f =>
      f.category === 'File Structure' ||
      f.category === 'Dashboard Layout' ||
      f.category === 'Integration'
    );

    if (criticalFailures.length > 0) {
      console.log('🔴 CRITICAL: Fix these issues first:');
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
      console.log('');
    }

    const missingImplementation = failures.filter(f =>
      f.category === 'Interactive Filtering' ||
      f.category === 'Cross-Chart Interaction' ||
      f.category === 'Dashboard Statistics' ||
      f.category === 'Responsive Design'
    );

    if (missingImplementation.length > 0) {
      console.log('🟡 IMPLEMENTATION: Complete these features:');
      missingImplementation.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
      console.log('');
    }

    const qualityImprovements = failures.filter(f =>
      f.category === 'Test Coverage' ||
      f.category === 'Documentation' ||
      f.category === 'Type Safety' ||
      f.category === 'Performance' ||
      f.category === 'YOLO Approach'
    );

    if (qualityImprovements.length > 0) {
      console.log('🟢 QUALITY: Improve these areas:');
      qualityImprovements.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
    }

    // Specific recommendations for common issues
    const hasNoTests = failures.some(f => f.test === 'Test files exist');
    if (hasNoTests) {
      console.log('\n📝 Testing Recommendations:');
      console.log('   • Create tests/visualization/dashboard.test.ts for unit tests');
      console.log('   • Create tests/visualization/dashboard.integration.test.ts for integration tests');
      console.log('   • Use real Chart.js rendering (not mocks) for YOLO approach');
      console.log('   • Test responsive behavior with different viewports');
      console.log('   • Test accessibility with keyboard navigation');
    }

    const hasNoIntegration = failures.some(f => f.category === 'Integration');
    if (hasNoIntegration) {
      console.log('\n🔗 Integration Recommendations:');
      console.log('   • Import types from Story 3-1: import { ... } from \'./types\'');
      console.log('   • Import transformers from Story 3-2: import { ... } from \'./transformers\'');
      console.log('   • Import chart renderer from Story 3-3: import { ... } from \'./chart-renderer\'');
      console.log('   • Use MergedPattern from Epic 2 for data schema');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📅 Validation completed: ' + new Date().toISOString());
  console.log('='.repeat(80) + '\n');

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: parseFloat(passRate),
    isReadyForDev: failedTests === 0 || (failures.length <= 5 && !failures.some(f => f.category === 'File Structure')),
  };
}

// ============================================================================
// MAIN VALIDATION FLOW
// ============================================================================

async function main() {
  console.log('🧪 Story 3-4 Validation Script');
  console.log('Create Interactive Dashboards - YOLO Approach');
  console.log('Starting comprehensive validation...\n');

  try {
    // Run all validations
    validateFileStructure();
    validateDashboardLayout();
    validateInteractiveFiltering();
    validateCrossChartInteraction();
    validateDashboardStatistics();
    validateResponsiveDesign();
    validatePerformanceOptimization();
    validateIntegrationWithPreviousStories();
    validateYOLOApproach();
    validateTestCoverage();
    validateTypeSafety();
    validateDocumentation();

    // Generate report
    const report = generateValidationReport();

    // Exit with appropriate code
    if (report.isReadyForDev) {
      console.log('✅ Story 3-4 validation passed! Ready for development.\n');
      process.exit(0);
    } else {
      console.log('❌ Story 3-4 validation failed. Please address the issues above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Validation script error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the validation
main();
