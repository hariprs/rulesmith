/**
 * Report Generator Module (Story 3-5)
 *
 * Main entry point for PDF and HTML report generation.
 * Coordinates data transformation, sanitization, statistics calculation,
 * and report generation.
 *
 * @module visualization/report-generator
 */

import { Pattern } from '../pattern-detector';
import { MergedPattern } from '../pattern-matcher';
import { ChartData } from './types';
import {
  ReportConfig,
  ReportResult,
  ReportFormat,
  ReportTemplate,
  ReportStatistics,
  PDFConfig,
  HTMLConfig,
  createVisualizationError,
} from './types';
import { sanitizePatterns, validatePattern, throwIfUnsafe } from './sanitization';
import { generatePDFReport } from './pdf-generator';
import { generateHTMLReport } from './html-generator';
import { applyTemplate, validateTemplateConfig, TEMPLATES } from './report-templates';
import {
  getPatternFrequency,
  getPatternCategory,
  getPatternConfidence,
  formatDate,
} from './pattern-utils';

// ============================================================================
// REPORT GENERATION QUEUE
// ============================================================================

/**
 * Report generation queue for managing concurrent requests (AC6)
 */
class ReportQueue {
  private queue: ReportQueueItem[] = [];
  private processing: Map<string, boolean> = new Map();
  private maxConcurrent: number = 3;
  private isProcessing: boolean = false;

  /**
   * Add report to queue
   */
  async enqueue(
    config: ReportConfig,
    patterns: (Pattern | MergedPattern)[],
    charts: ChartData[]
  ): Promise<ReportQueueItem> {
    const id = this.generateId();
    const item: ReportQueueItem = {
      id,
      config,
      patterns,
      charts,
      position: this.queue.length + 1,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };

    this.queue.push(item);

    // Process queue if under concurrent limit
    this.processQueue();

    return item;
  }

  /**
   * Process queue (FIFO scheduling) with proper async handling
   */
  private async processQueue(): Promise<void> {
    // Prevent concurrent processQueue calls
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const processingCount = Array.from(this.processing.values()).filter(v => v).length;

      if (processingCount >= this.maxConcurrent) {
        return; // At concurrent limit
      }

      // Find next pending item
      const nextItem = this.queue.find(item => item.status === 'pending');
      if (!nextItem) {
        return; // No pending items
      }

      // Mark as processing
      nextItem.status = 'processing';
      nextItem.startedAt = new Date().toISOString();
      this.processing.set(nextItem.id, true);

      // Process asynchronously without blocking
      this.processItem(nextItem).finally(() => {
        // Mark as done processing
        this.processing.set(nextItem.id, false);

        // Process next item
        this.isProcessing = false;
        this.processQueue();
      });
    } catch {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single queue item
   */
  private async processItem(item: ReportQueueItem): Promise<void> {
    try {
      // Generate report with stored patterns and charts
      const result = await generateReport(item.patterns, item.charts, item.config);

      // Update item with result
      item.status = 'completed';
      item.completedAt = new Date().toISOString();
      item.result = result;
      item.progress = 100;
    } catch (error) {
      // Update item with error
      item.status = 'failed';
      item.completedAt = new Date().toISOString();
      item.result = {
        success: false,
        error: {
          what: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          how: ['Check error details', 'Try again with different configuration'],
          technical: error instanceof Error ? error.stack : undefined,
          code: undefined,
        },
        generationTime: 0,
      };
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    return {
      pending: this.queue.filter(i => i.status === 'pending').length,
      processing: this.queue.filter(i => i.status === 'processing').length,
      completed: this.queue.filter(i => i.status === 'completed').length,
      failed: this.queue.filter(i => i.status === 'failed').length,
      total: this.queue.length,
    };
  }

  /**
   * Clear completed items from queue
   */
  clearCompleted(): void {
    this.queue = this.queue.filter(i => i.status !== 'completed');
  }
}

/**
 * Report queue item
 */
interface ReportQueueItem {
  id: string;
  config: ReportConfig;
  patterns: (Pattern | MergedPattern)[];
  charts: ChartData[];
  position: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: ReportResult;
  progress?: number;
}

// Global queue instance
const reportQueue = new ReportQueue();

// ============================================================================
// MAIN REPORT GENERATION
// ============================================================================

/**
 * Generate report (main entry point)
 *
 * @param patterns - Pattern data (Pattern or MergedPattern)
 * @param configOrCharts - Report configuration or Chart data
 * @param config - Report configuration (optional, only used if charts provided)
 * @returns Report generation result
 */
export async function generateReport(
  patterns: (Pattern | MergedPattern)[],
  configOrCharts: ReportConfig | ChartData[],
  config?: ReportConfig
): Promise<ReportResult> {
  // Parse arguments (supports two calling conventions)
  let charts: ChartData[] = [];
  let reportConfig: ReportConfig;

  if (config) {
    // Called with (patterns, charts, config)
    charts = configOrCharts as ChartData[];
    reportConfig = config;
  } else {
    // Called with (patterns, config)
    charts = [];
    reportConfig = configOrCharts as ReportConfig;
  }

  const startTime = Date.now();

  try {
    // Validate inputs
    validateInputs(patterns, reportConfig);

    // Validate template configuration
    const templateValidation = validateTemplateConfig(reportConfig);
    if (!templateValidation.valid) {
      throw createVisualizationError(
        'Invalid template configuration',
        templateValidation.errors,
        undefined
      );
    }

    // Apply template if specified
    const finalConfig = reportConfig.template
      ? applyTemplate(reportConfig, reportConfig.template)
      : reportConfig;

    // Validate template was applied successfully
    if (reportConfig.template && !TEMPLATES[reportConfig.template]) {
      throw createVisualizationError(
        `Invalid template: ${reportConfig.template}`,
        ['Valid templates are: minimal, standard, detailed'],
        undefined
      );
    }

    // Filter patterns by date range if specified
    let filteredPatterns = patterns;
    if (finalConfig.dateRange) {
      filteredPatterns = filterPatternsByDateRange(
        patterns,
        finalConfig.dateRange.startDate,
        finalConfig.dateRange.endDate
      );
    }

    // Limit patterns if maxPatterns specified
    if (finalConfig.maxPatterns && finalConfig.maxPatterns > 0) {
      filteredPatterns = filteredPatterns.slice(0, finalConfig.maxPatterns);
    }

    // Validate content for security
    if (!finalConfig.includeSensitive) {
      for (const pattern of filteredPatterns) {
        const validation = validatePattern(pattern);
        throwIfUnsafe(validation, 'pattern');
      }
    }

    // Calculate statistics
    const statistics = calculateStatistics(filteredPatterns);

    // Generate report based on format
    let result: ReportResult;
    if (finalConfig.format === ReportFormat.PDF) {
      result = await generatePDFReport(
        filteredPatterns,
        charts,
        statistics,
        finalConfig as PDFConfig
      );
    } else if (finalConfig.format === ReportFormat.HTML) {
      result = await generateHTMLReport(
        filteredPatterns,
        charts,
        statistics,
        finalConfig as HTMLConfig
      );
    } else {
      throw createVisualizationError(
        'Unsupported report format',
        ['Use "pdf" or "html" format'],
        undefined
      );
    }

    return result;
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      error: {
        what: `Report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        how: [
          'Check that pattern data is valid',
          'Verify configuration is correct',
          'Ensure required dependencies are installed',
          'Check file system permissions',
        ],
        technical: error instanceof Error ? error.stack : undefined,
        code: undefined,
      },
      generationTime: endTime - startTime,
    };
  }
}

// ============================================================================
// QUEUE MANAGEMENT
// ============================================================================

/**
 * Generate report with queue management (AC6)
 *
 * @param patterns - Merged pattern data
 * @param charts - Chart data for embedding
 * @param config - Report configuration
 * @returns Queue item for tracking
 */
export async function generateReportQueued(
  patterns: (Pattern | MergedPattern)[],
  charts: ChartData[],
  config: ReportConfig
): Promise<ReportQueueItem> {
  return reportQueue.enqueue(config, patterns, charts);
}

/**
 * Get queue status
 *
 * @returns Queue status information
 */
export function getQueueStatus(): {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
} {
  return reportQueue.getQueueStatus();
}

/**
 * Clear completed items from queue
 */
export function clearQueue(): void {
  reportQueue.clearCompleted();
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

/**
 * Calculate report statistics from patterns
 *
 * @param patterns - Merged pattern data
 * @returns Report statistics
 */
export function calculateStatistics(patterns: (Pattern | MergedPattern)[]): ReportStatistics {
  if (patterns.length === 0) {
    return {
      totalPatterns: 0,
      byCategory: {},
      totalFrequency: 0,
      averageFrequency: 0,
      dateRange: {
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
      },
      topPatterns: [],
      temporalTrends: [],
      improvementMetrics: {
        newPatterns: 0,
        repeatedPatterns: 0,
        highConfidencePatterns: 0,
      },
    };
  }

  // Total patterns and frequency
  const totalPatterns = patterns.length;
  const totalFrequency = patterns.reduce((sum, p) => sum + getPatternFrequency(p), 0);
  // Guard: Prevent division by zero
  const averageFrequency = totalPatterns > 0 ? totalFrequency / totalPatterns : 0;

  // Patterns by category
  const byCategory: Record<string, number> = {};
  for (const pattern of patterns) {
    const category = getPatternCategory(pattern);
    byCategory[category] = (byCategory[category] || 0) + 1;
  }

  // Date range
  const dates = patterns
    .map(p => p.first_seen ? new Date(p.first_seen).getTime() : 0)
    .filter(d => d > 0);
  const firstSeen = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : new Date().toISOString();
  const lastSeen = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : new Date().toISOString();

  // Top patterns
  const topPatterns = patterns
    .sort((a, b) => getPatternFrequency(b) - getPatternFrequency(a))
    .slice(0, 10)
    .map(p => ({
      pattern: p.pattern_text,
      frequency: getPatternFrequency(p),
      category: getPatternCategory(p),
    }));

  // Temporal trends (group by date)
  const temporalTrends = generateTemporalTrends(patterns);

  // Improvement metrics
  const highConfidencePatterns = patterns.filter(p => getPatternConfidence(p) > 0.8).length;
  const repeatedPatterns = patterns.filter(p => getPatternFrequency(p) > 1).length;
  const newPatterns = patterns.filter(p => {
    if (!p.first_seen) return false;
    const firstSeen = new Date(p.first_seen);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return firstSeen > weekAgo;
  }).length;

  return {
    totalPatterns,
    byCategory,
    totalFrequency,
    averageFrequency,
    dateRange: {
      firstSeen,
      lastSeen,
    },
    topPatterns,
    temporalTrends,
    improvementMetrics: {
      newPatterns,
      repeatedPatterns,
      highConfidencePatterns,
    },
  };
}

/**
 * Generate temporal trends data
 */
function generateTemporalTrends(patterns: (Pattern | MergedPattern)[]): Array<{
  date: string;
  count: number;
  cumulative: number;
}> {
  // Group patterns by first seen date
  const trendsByDate: Record<string, number> = {};

  for (const pattern of patterns) {
    if (pattern.first_seen) {
      const date = pattern.first_seen.split('T')[0];
      trendsByDate[date] = (trendsByDate[date] || 0) + 1;
    }
  }

  // Sort by date
  const sortedDates = Object.keys(trendsByDate).sort();
  let cumulative = 0;

  return sortedDates.map(date => {
    cumulative += trendsByDate[date];
    return {
      date,
      count: trendsByDate[date],
      cumulative,
    };
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate report inputs
 */
function validateInputs(patterns: (Pattern | MergedPattern)[], config: ReportConfig): void {
  if (!Array.isArray(patterns)) {
    throw createVisualizationError(
      'Patterns must be an array',
      ['Provide Pattern[] or MergedPattern[] as first argument'],
      undefined
    );
  }

  if (!config || typeof config !== 'object') {
    throw createVisualizationError(
      'Config must be an object',
      ['Provide ReportConfig object'],
      undefined
    );
  }

  if (!config.format) {
    throw createVisualizationError(
      'Report format not specified',
      ['Set format to "pdf" or "html"'],
      undefined
    );
  }
}

/**
 * Filter patterns by date range
 */
function filterPatternsByDateRange(
  patterns: (Pattern | MergedPattern)[],
  startDate: string,
  endDate: string
): (Pattern | MergedPattern)[] {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  return patterns.filter(pattern => {
    if (!pattern.first_seen) return false;

    const firstSeen = new Date(pattern.first_seen).getTime();
    const lastSeen = pattern.last_seen
      ? new Date(pattern.last_seen).getTime()
      : firstSeen;

    // Check if pattern overlaps with date range
    return lastSeen >= start && firstSeen <= end;
  });
}

/**
 * VisualizationError type reference
 */
type VisualizationError = ReturnType<typeof createVisualizationError>;

/**
 * Export queue item type
 */
export type { ReportQueueItem };
