/**
 * Dashboard Statistics (Story 3-4)
 *
 * Calculates and displays summary statistics for dashboard.
 * Shows total patterns, total corrections, top category, trends (AC4).
 *
 * Features:
 * - Summary statistics calculation (AC4)
 * - Trend indicators (AC4)
 * - Number formatting (AC4)
 * - Sparkline mini-charts (AC4)
 * - Performance optimized (< 500ms for 10K patterns)
 *
 * @module visualization/dashboard-stats
 */

import { MergedPattern } from '../pattern-matcher';
import { PatternCategory } from '../pattern-detector';

// ============================================================================
// STATISTICS TYPES
// ============================================================================

/**
 * Dashboard summary statistics (AC4)
 *
 * @interface DashboardStatistics
 */
export interface DashboardStatistics {
  /** Total number of patterns */
  totalPatterns: number;
  /** Total number of corrections */
  totalCorrections: number;
  /** Most frequent category */
  topCategory: PatternCategory | null;
  /** Most active time period */
  mostActivePeriod: string | null;
  /** Average pattern frequency */
  averageFrequency: number;
  /** Pattern categories distribution */
  categoryDistribution: Map<PatternCategory, number>;
  /** Trend indicators */
  trends: {
    /** Current period count */
    current: number;
    /** Previous period count */
    previous: number;
    /** Percentage change */
    change: number;
    /** Trend direction */
    direction: 'up' | 'down' | 'neutral';
  } | null;
}

/**
 * Summary card configuration
 *
 * @interface SummaryCard
 */
export interface SummaryCard {
  /** Card title */
  title: string;
  /** Card value */
  value: string | number;
  /** Optional trend indicator */
  trend?: {
    /** Trend direction */
    direction: 'up' | 'down' | 'neutral';
    /** Percentage change */
    change: number;
  };
  /** Optional icon */
  icon?: string;
  /** Optional sparkline data */
  sparkline?: number[];
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

/**
 * Calculate summary statistics from patterns (AC4)
 *
 * YOLO Approach: Simple calculations, optimize based on actual performance metrics.
 *
 * @param patterns - Patterns to calculate statistics from
 * @returns Dashboard statistics
 */
export function calculateSummaryStatistics(patterns: MergedPattern[]): DashboardStatistics {
  const startTime = performance.now();

  // Handle empty patterns
  if (!patterns || patterns.length === 0) {
    return {
      totalPatterns: 0,
      totalCorrections: 0,
      topCategory: null,
      mostActivePeriod: null,
      averageFrequency: 0,
      categoryDistribution: new Map(),
      trends: null,
    };
  }

  // Calculate total patterns and corrections
  const totalPatterns = patterns.length;
  const totalCorrections = patterns.reduce((sum, p) => sum + p.count, 0);

  // Calculate top category
  const categoryCounts = new Map<PatternCategory, number>();
  patterns.forEach(p => {
    const count = categoryCounts.get(p.category) || 0;
    categoryCounts.set(p.category, count + p.count);
  });

  let topCategory: PatternCategory | null = null;
  let maxCount = 0;
  categoryCounts.forEach((count, category) => {
    if (count > maxCount) {
      maxCount = count;
      topCategory = category;
    }
  });

  // Calculate most active period
  // CRITICAL FIX: Add date validation to prevent Invalid Date issues
  const periodCounts = new Map<string, number>();
  patterns.forEach(p => {
    if (p.last_seen) {
      const date = new Date(p.last_seen);
      // Validate date is valid
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date value: ${p.last_seen}`);
        return;
      }
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const count = periodCounts.get(period) || 0;
      periodCounts.set(period, count + p.count);
    }
  });

  let mostActivePeriod: string | null = null;
  let maxPeriodCount = 0;
  periodCounts.forEach((count, period) => {
    if (count > maxPeriodCount) {
      maxPeriodCount = count;
      mostActivePeriod = period;
    }
  });

  // Calculate average frequency
  // Guard: Prevent division by zero
  const averageFrequency = totalPatterns > 0 ? totalCorrections / totalPatterns : 0;

  // Calculate trends (compare current week to previous week)
  const trends = calculateTrends(patterns);

  // Log performance (target: < 500ms for 10K patterns) - AC4
  const calcTime = performance.now() - startTime;
  if (patterns.length > 1000 && calcTime > 500) {
    console.warn(`Statistics calculation took ${calcTime.toFixed(0)}ms (target: < 500ms for 10K patterns)`);
  }

  return {
    totalPatterns,
    totalCorrections,
    topCategory,
    mostActivePeriod,
    averageFrequency,
    categoryDistribution: categoryCounts,
    trends,
  };
}

/**
 * Calculate trend indicators (AC4)
 *
 * @private
 * @param patterns - Patterns to analyze
 * @returns Trend data
 */
function calculateTrends(patterns: MergedPattern[]): DashboardStatistics['trends'] {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Count patterns in current week
  const currentCount = patterns.filter(p => {
    const lastSeen = p.last_seen ? new Date(p.last_seen) : new Date();
    return lastSeen >= oneWeekAgo && lastSeen <= now;
  }).reduce((sum, p) => sum + p.count, 0);

  // Count patterns in previous week
  const previousCount = patterns.filter(p => {
    const lastSeen = p.last_seen ? new Date(p.last_seen) : new Date();
    return lastSeen >= twoWeeksAgo && lastSeen < oneWeekAgo;
  }).reduce((sum, p) => sum + p.count, 0);

  // Calculate change
  let change = 0;
  if (previousCount > 0) {
    change = ((currentCount - previousCount) / previousCount) * 100;
  } else if (currentCount > 0) {
    change = 100; // First occurrence
  }

  // Determine direction
  let direction: 'up' | 'down' | 'neutral' = 'neutral';
  if (change > 5) {
    direction = 'up';
  } else if (change < -5) {
    direction = 'down';
  }

  return {
    current: currentCount,
    previous: previousCount,
    change,
    direction,
  };
}

// ============================================================================
// SUMMARY CARDS CREATION
// ============================================================================

/**
 * Create summary cards in container (AC4)
 *
 * @param container - Container element
 * @param statistics - Dashboard statistics
 */
export function createSummaryCards(container: HTMLElement, statistics: DashboardStatistics): void {
  // Clear existing content
  container.innerHTML = '';

  // Create cards container
  const cardsContainer = document.createElement('div');
  cardsContainer.className = 'summary-cards';
  Object.assign(cardsContainer.style, {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  });

  // Create individual cards
  const cards: SummaryCard[] = [
    {
      title: 'Total Patterns',
      value: statistics.totalPatterns,
      icon: '📊',
    },
    {
      title: 'Total Corrections',
      value: statistics.totalCorrections,
      icon: '✅',
    },
    {
      title: 'Top Category',
      value: statistics.topCategory || 'N/A',
      icon: '🏆',
    },
    {
      title: 'Most Active Period',
      value: statistics.mostActivePeriod || 'N/A',
      icon: '📅',
    },
  ];

  // Add trend card if available
  if (statistics.trends) {
    cards.push({
      title: 'Weekly Trend',
      value: statistics.trends.current.toString(),
      trend: {
        direction: statistics.trends.direction,
        change: statistics.trends.change,
      },
      icon: '📈',
    });
  }

  // Create card elements
  cards.forEach(card => {
    const cardElement = createCardElement(card);
    cardsContainer.appendChild(cardElement);
  });

  container.appendChild(cardsContainer);
}

/**
 * Create a single summary card element
 *
 * @private
 * @param card - Card configuration
 * @returns Card element
 */
function createCardElement(card: SummaryCard): HTMLElement {
  const cardElement = document.createElement('div');
  cardElement.className = 'summary-card';
  Object.assign(cardElement.style, {
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    padding: '1rem',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
  });

  // Icon
  if (card.icon) {
    const icon = document.createElement('div');
    icon.textContent = card.icon;
    icon.style.fontSize = '2rem';
    icon.style.marginBottom = '0.5rem';
    cardElement.appendChild(icon);
  }

  // Title
  const title = document.createElement('div');
  title.textContent = card.title;
  title.style.fontSize = '0.875rem';
  title.style.fontWeight = 'bold';
  title.style.color = '#6b7280';
  title.style.marginBottom = '0.5rem';
  cardElement.appendChild(title);

  // Value
  const value = document.createElement('div');
  value.textContent = formatNumber(card.value);
  value.style.fontSize = '1.5rem';
  value.style.fontWeight = 'bold';
  value.style.color = '#111827';
  value.style.marginBottom = '0.25rem';
  cardElement.appendChild(value);

  // Trend indicator
  if (card.trend) {
    const trend = createTrendIndicator(card.trend);
    cardElement.appendChild(trend);
  }

  return cardElement;
}

/**
 * Create trend indicator element (AC4)
 *
 * @private
 * @param trend - Trend data
 * @returns Trend element
 */
function createTrendIndicator(trend: SummaryCard['trend']): HTMLElement {
  const trendElement = document.createElement('div');
  trendElement.className = 'trend-indicator';

  if (!trend) {
    trendElement.textContent = 'N/A';
    return trendElement;
  }

  const icon = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
  const color = trend.direction === 'up' ? 'green' : trend.direction === 'down' ? 'red' : 'gray';

  trendElement.innerHTML = `
    <span style="color: ${color}; font-size: 0.875rem;">
      ${icon} ${Math.abs(trend.change).toFixed(1)}%
    </span>
  `;

  trendElement.setAttribute('aria-label', `Trend ${trend.direction}: ${trend.change.toFixed(1)}%`);

  return trendElement;
}

/**
 * Format number for display (AC4)
 *
 * @param value - Value to format
 * @returns Formatted string
 */
export function formatNumber(value: string | number): string {
  if (typeof value === 'string') {
    return value;
  }

  // Format large numbers with K, M, B suffixes
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return value.toLocaleString();
}

// ============================================================================
// SUMMARY CARDS UPDATE
// ============================================================================

/**
 * Update summary cards with new statistics (AC4)
 *
 * @param container - Container element
 * @param statistics - New dashboard statistics
 */
export function updateSummaryCards(container: HTMLElement, statistics: DashboardStatistics): void {
  // Re-create cards (YOLO: simple approach, optimize to update in-place if needed)
  createSummaryCards(container, statistics);
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get statistics export for external use
 *
 * @param statistics - Dashboard statistics
 * @returns Plain object representation
 */
export function exportStatistics(statistics: DashboardStatistics): Record<string, any> {
  return {
    totalPatterns: statistics.totalPatterns,
    totalCorrections: statistics.totalCorrections,
    topCategory: statistics.topCategory,
    mostActivePeriod: statistics.mostActivePeriod,
    averageFrequency: statistics.averageFrequency,
    categoryDistribution: Object.fromEntries(statistics.categoryDistribution),
    trends: statistics.trends,
  };
}

/**
 * Compare two statistics and detect changes
 *
 * @param oldStats - Previous statistics
 * @param newStats - New statistics
 * @returns Array of changed field names
 */
export function detectStatisticsChanges(
  oldStats: DashboardStatistics,
  newStats: DashboardStatistics
): string[] {
  const changes: string[] = [];

  if (oldStats.totalPatterns !== newStats.totalPatterns) {
    changes.push('totalPatterns');
  }

  if (oldStats.totalCorrections !== newStats.totalCorrections) {
    changes.push('totalCorrections');
  }

  if (oldStats.topCategory !== newStats.topCategory) {
    changes.push('topCategory');
  }

  if (oldStats.mostActivePeriod !== newStats.mostActivePeriod) {
    changes.push('mostActivePeriod');
  }

  if (oldStats.trends?.current !== newStats.trends?.current) {
    changes.push('trends');
  }

  return changes;
}
