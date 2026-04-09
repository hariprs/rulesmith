/**
 * Dashboard Layout (Story 3-4)
 *
 * Creates responsive grid layout for hosting multiple charts.
 * Supports mobile, tablet, and desktop breakpoints (AC5).
 *
 * Features:
 * - CSS Grid responsive layout (AC1)
 * - Logical chart arrangement (AC1)
 * - Mobile-first responsive design (AC5)
 * - Accessible markup (AC5)
 *
 * @module visualization/dashboard-layout
 */

// ============================================================================
// DASHBOARD LAYOUT CONFIGURATION
// ============================================================================

/**
 * Dashboard layout configuration
 *
 * @interface DashboardLayoutConfig
 */
export interface DashboardLayoutConfig {
  /** Container element ID */
  containerId: string;
  /** Number of charts to display */
  chartCount: number;
  /** Whether layout is responsive */
  responsive?: boolean;
  /** Chart arrangement (auto or custom) */
  arrangement?: ('overview' | 'category' | 'top' | 'trends' | 'frequency')[];
  /** Custom CSS class */
  className?: string;
}

// ============================================================================
// DASHBOARD LAYOUT CREATION
// ============================================================================

/**
 * Create responsive dashboard layout (AC1, AC5)
 *
 * YOLO Approach: Simple grid layout that works, iterate based on actual rendering.
 *
 * @param config - Layout configuration
 * @returns Container element
 */
export function createDashboardLayout(config: DashboardLayoutConfig): HTMLElement {
  // HIGH FIX: Validate config and containerId parameters
  if (!config || !config.containerId) {
    throw new Error('Dashboard layout configuration is invalid: containerId is required');
  }

  const container = document.getElementById(config.containerId);

  if (!container) {
    throw new Error(`Dashboard container not found: ${config.containerId}`);
  }

  // Clear existing content
  container.innerHTML = '';

  // Apply dashboard container styles
  Object.assign(container.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
    padding: '1.5rem',
    width: '100%',
    boxSizing: 'border-box',
  });

  // Performance tracking (AC1: < 5 seconds for 100 patterns)
  const layoutStartTime = performance.now();

  // Add responsive classes
  if (config.responsive !== false) {
    applyResponsiveStyles(container);
  }

  // Add custom class if provided
  if (config.className) {
    container.classList.add(config.className);
  }

  // Create filter container if it doesn't exist
  let filtersContainer = document.getElementById(`${config.containerId}-filters`);
  if (!filtersContainer) {
    filtersContainer = document.createElement('div');
    filtersContainer.id = `${config.containerId}-filters`;
    filtersContainer.className = 'dashboard-filters-container';
    container.appendChild(filtersContainer);
  }

  // Create stats container if it doesn't exist
  let statsContainer = document.getElementById(`${config.containerId}-stats`);
  if (!statsContainer) {
    statsContainer = document.createElement('div');
    statsContainer.id = `${config.containerId}-stats`;
    statsContainer.className = 'dashboard-stats-container';
    container.appendChild(statsContainer);
  }

  // Create chart containers in logical arrangement
  const arrangement = config.arrangement || getDefaultArrangement(config.chartCount);
  arrangement?.forEach((chartType, index) => {
    const chartContainer = createChartContainer(config.containerId, chartType, index);
    container.appendChild(chartContainer);
  });

  // Add ARIA landmarks for accessibility (AC5)
  container.setAttribute('role', 'main');
  container.setAttribute('aria-label', 'Pattern visualization dashboard');

  // Add keyboard navigation support (AC5)
  container.tabIndex = 0;
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'false');

  // Log performance (AC1: < 5 seconds for 100 patterns)
  const layoutTime = performance.now() - layoutStartTime;
  if (config.chartCount >= 4 && layoutTime > 5000) {
    console.warn(`Dashboard layout creation took ${layoutTime.toFixed(0)}ms (target: < 5000ms)`);
  }

  return container;
}

/**
 * Apply responsive styles to container (AC5)
 *
 * @private
 * @param container - Container element
 */
function applyResponsiveStyles(container: HTMLElement): void {
  // Mobile-first responsive design with WCAG AA compliance (AC5)
  const style = document.createElement('style');
  style.textContent = `
    /* Base styles (mobile) */
    .dashboard-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1rem;
      padding: 1rem;
    }

    /* Tablet (640px+) */
    @media (min-width: 640px) {
      .dashboard-container {
        grid-template-columns: repeat(2, 1fr);
        gap: 1.25rem;
        padding: 1.25rem;
      }
    }

    /* Desktop (1024px+) */
    @media (min-width: 1024px) {
      .dashboard-container {
        grid-template-columns: repeat(3, 1fr);
        gap: 1.5rem;
        padding: 1.5rem;
      }
    }

    /* Large desktop (1280px+) */
    @media (min-width: 1280px) {
      .dashboard-container {
        grid-template-columns: repeat(4, 1fr);
        gap: 1.5rem;
        padding: 1.5rem;
      }
    }

    /* Chart container styles */
    .chart-container {
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      min-height: 300px;
      display: flex;
      flex-direction: column;
    }

    .chart-container canvas {
      flex-grow: 1;
      min-height: 250px;
    }

    /* WCAG AA compliant focus styles (AC5) */
    .dashboard-container:focus,
    .chart-container:focus,
    button:focus,
    input:focus,
    select:focus {
      outline: 2px solid #2563eb;
      outline-offset: 2px;
    }

    /* High contrast for WCAG AA (4.5:1 contrast ratio) (AC5) */
    .summary-card {
      color: #111827;
      background: #ffffff;
    }

    .summary-card .title {
      color: #374151;
      font-weight: 600;
    }

    /* Focus indicators for keyboard navigation (AC5) */
    .filter-group:focus-within {
      box-shadow: 0 0 0 2px #2563eb;
      border-radius: 0.25rem;
    }
  `;

  document.head.appendChild(style);
  container.classList.add('dashboard-container');
}

/**
 * Get default chart arrangement based on count (AC1)
 *
 * @private
 * @param chartCount - Number of charts
 * @returns Chart arrangement array
 */
// MEDIUM FIX: Add explicit return type for better type safety
function getDefaultArrangement(chartCount: number): DashboardLayoutConfig['arrangement'] {
  // Logical arrangement: category distribution, top patterns, trends, frequency
  const defaultArrangement: DashboardLayoutConfig['arrangement'] = [
    'category',
    'top',
    'trends',
    'frequency',
  ];

  return defaultArrangement.slice(0, Math.min(chartCount, 4));
}

/**
 * Create a single chart container
 *
 * @private
 * @param containerId - Parent container ID
 * @param chartType - Type of chart
 * @param index - Chart index
 * @returns Chart container element
 */
function createChartContainer(
  containerId: string,
  chartType: 'overview' | 'category' | 'top' | 'trends' | 'frequency',
  index: number
): HTMLElement {
  const chartContainer = document.createElement('div');
  chartContainer.className = 'chart-container';
  chartContainer.id = `${containerId}-chart-${chartType}`;

  // Add ARIA labels for accessibility (AC5)
  chartContainer.setAttribute('role', 'region');
  chartContainer.setAttribute('aria-label', `${chartType} chart`);

  // Create canvas element for Chart.js
  const canvas = document.createElement('canvas');
  canvas.id = `${containerId}-chart-${chartType}-canvas`;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Chart showing ${chartType} data`);

  chartContainer.appendChild(canvas);

  return chartContainer;
}

// ============================================================================
// LAYOUT UTILITY FUNCTIONS
// ============================================================================

/**
 * Get chart container element
 *
 * @param containerId - Dashboard container ID
 * @param chartType - Chart type
 * @returns Chart container element or null
 */
export function getChartContainer(
  containerId: string,
  chartType: 'overview' | 'category' | 'top' | 'trends' | 'frequency'
): HTMLElement | null {
  return document.getElementById(`${containerId}-chart-${chartType}`);
}

/**
 * Get all chart containers
 *
 * @param containerId - Dashboard container ID
 * @returns Array of chart container elements
 */
export function getAllChartContainers(containerId: string): HTMLElement[] {
  const container = document.getElementById(containerId);
  if (!container) {
    return [];
  }

  return Array.from(container.querySelectorAll('.chart-container'));
}

/**
 * Update layout for specific breakpoint (AC5)
 *
 * @param containerId - Dashboard container ID
 * @param breakpoint - Breakpoint name
 */
export function updateLayoutForBreakpoint(
  containerId: string,
  breakpoint: 'mobile' | 'tablet' | 'desktop' | 'large'
): void {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  // Update grid columns based on breakpoint
  const columnsMap = {
    mobile: '1fr',
    tablet: 'repeat(2, 1fr)',
    desktop: 'repeat(3, 1fr)',
    large: 'repeat(4, 1fr)',
  };

  container.style.gridTemplateColumns = columnsMap[breakpoint];
}

/**
 * Make layout collapsible on mobile (AC5)
 *
 * @param containerId - Dashboard container ID
 * @param collapsible - Whether layout should be collapsible
 */
export function setMobileCollapsible(containerId: string, collapsible: boolean): void {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (collapsible) {
    // Add collapsible behavior for mobile
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 640px) {
        .dashboard-container.collapsible .chart-container {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.3s ease;
        }

        .dashboard-container.collapsible .chart-container.expanded {
          max-height: 500px;
        }
      }
    `;

    document.head.appendChild(style);
    container.classList.add('collapsible');
  } else {
    container.classList.remove('collapsible');
  }
}
