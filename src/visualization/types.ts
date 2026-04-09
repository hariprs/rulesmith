/**
 * Visualization Type Definitions (Story 3-1)
 *
 * Defines TypeScript interfaces for chart data structures compatible with Chart.js.
 * Provides type-safe interfaces for transforming Epic 2 MergedPattern data into charts.
 *
 * @module visualization/types
 */

import { MergedPattern } from '../pattern-matcher';
import { PatternCategory, PatternExample } from '../pattern-detector';

// ============================================================================
// CHART TYPE ENUMERATION
// ============================================================================

/**
 * Supported chart types for visualization
 *
 * @enum {string}
 */
export enum ChartType {
  /** Bar chart for frequency comparisons */
  BAR = 'bar',
  /** Line chart for trend analysis */
  LINE = 'line',
  /** Pie chart for distribution analysis */
  PIE = 'pie',
  /** Doughnut chart for distribution with hollow center */
  DOUGHNUT = 'doughnut',
  /** Radar chart for multi-dimensional comparison */
  RADAR = 'radar',
  /** Polar area chart for categorical comparison */
  POLAR_AREA = 'polarArea',
}

// ============================================================================
// CHART DATA INTERFACES
// ============================================================================

/**
 * Chart axis configuration
 *
 * @interface ChartAxis
 */
export interface ChartAxis {
  /** Axis label */
  label: string;
  /** Data points for the axis */
  data: (string | number)[];
  /** Optional axis-specific configuration */
  config?: {
    /** Minimum value */
    min?: number;
    /** Maximum value */
    max?: number;
    /** Step size for ticks */
    stepSize?: number;
    /** Whether to display the axis */
    display?: boolean;
    /** Whether to begin at zero */
    beginAtZero?: boolean;
  };
}

/**
 * Chart dataset configuration
 *
 * @interface ChartDataset
 */
export interface ChartDataset {
  /** Dataset label */
  label: string;
  /** Data values */
  data: number[];
  /** Background color(s) for elements */
  backgroundColor?: string | string[];
  /** Border color(s) for elements */
  borderColor?: string | string[];
  /** Border width in pixels */
  borderWidth?: number;
  /** Optional dataset-specific configuration */
  config?: {
    /** Whether to fill the area under the line */
    fill?: boolean;
    /** Line tension for curved lines (0 = straight, 1 = smooth) */
    tension?: number;
    /** Point radius */
    pointRadius?: number;
    /** Point hover radius */
    pointHoverRadius?: number;
  };
}

/**
 * Chart tooltip configuration
 *
 * @interface ChartTooltip
 */
export interface ChartTooltip {
  /** Whether tooltips are enabled */
  enabled: boolean;
  /** Tooltip mode (nearest, index, dataset, point) */
  mode?: 'nearest' | 'index' | 'dataset' | 'point';
  /** Whether to intersect with items */
  intersect?: boolean;
  /** Custom tooltip callback */
  callback?: (context: any) => string | string[];
}

/**
 * Chart legend configuration
 *
 * @interface ChartLegend
 */
export interface ChartLegend {
  /** Whether legend is displayed */
  display: boolean;
  /** Legend position (top, bottom, left, right) */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Whether legend aligns with the chart area */
  align?: 'start' | 'center' | 'end';
}

/**
 * Chart plugins configuration
 *
 * @interface ChartPlugins
 */
export interface ChartPlugins {
  /** Title configuration */
  title?: {
    /** Whether title is displayed */
    display: boolean;
    /** Title text */
    text: string;
    /** Title font configuration */
    font?: {
      /** Font size */
      size?: number;
      /** Font weight */
      weight?: 'normal' | 'bold' | 'lighter';
      /** Font family */
      family?: string;
    };
    /** Title color */
    color?: string;
  };
  /** Tooltip configuration */
  tooltip?: ChartTooltip;
  /** Legend configuration */
  legend?: ChartLegend;
}

/**
 * Chart options configuration
 *
 * @interface ChartOptions
 */
export interface ChartOptions {
  /** Whether chart is responsive */
  responsive?: boolean;
  /** Whether to maintain aspect ratio */
  maintainAspectRatio?: boolean;
  /** Animation configuration */
  animation?: {
    /** Animation duration in milliseconds */
    duration?: number;
    /** Whether to animate on startup */
    onStartup?: boolean;
  };
  /** Plugins configuration */
  plugins?: ChartPlugins;
  /** Scales configuration */
  scales?: {
    /** X-axis configuration */
    x?: {
      /** Whether to display the axis */
      display?: boolean;
      /** Axis title */
      title?: {
        /** Title text */
        display?: boolean;
        /** Title content */
        text?: string;
      };
    };
    /** Y-axis configuration */
    y?: {
      /** Whether to display the axis */
      display?: boolean;
      /** Axis title */
      title?: {
        /** Title text */
        display?: boolean;
        /** Title content */
        text?: string;
      };
      /** Minimum value */
      min?: number;
      /** Whether to begin at zero */
      beginAtZero?: boolean;
    };
  };
}

/**
 * Main chart data structure
 *
 * @interface ChartData
 */
export interface ChartData {
  /** Chart type */
  chartType: ChartType;
  /** Chart title */
  title: string;
  /** X-axis configuration */
  xAxis: ChartAxis;
  /** Y-axis configuration */
  yAxis: ChartAxis;
  /** Datasets for the chart */
  datasets: ChartDataset[];
  /** Chart options */
  options?: ChartOptions;
  /** Optional metadata */
  metadata?: {
    /** Data source */
    source?: string;
    /** Generation timestamp */
    timestamp?: string;
    /** Number of data points */
    dataPointCount?: number;
    /** Chart canvas image data URL for PDF embedding */
    imageDataUrl?: string;
    /** Chart canvas element reference (for runtime use) */
    canvasElement?: HTMLCanvasElement;
    /** Additional metadata */
    [key: string]: any;
  };
}

// ============================================================================
// DATA TRANSFORMATION INTERFACES
// ============================================================================

/**
 * Pattern frequency data for bar charts
 *
 * @interface PatternFrequencyData
 */
export interface PatternFrequencyData {
  /** Pattern text or category */
  label: string;
  /** Frequency count */
  frequency: number;
  /** Optional category */
  category?: PatternCategory;
  /** Optional pattern metadata */
  metadata?: {
    /** Pattern text */
    patternText?: string;
    /** Suggested rule */
    suggestedRule?: string;
    /** Number of examples */
    exampleCount?: number;
  };
}

/**
 * Temporal pattern data for line charts
 *
 * @interface TemporalPatternData
 */
export interface TemporalPatternData {
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Pattern frequency at this timestamp */
  frequency: number;
  /** Cumulative frequency */
  cumulativeFrequency?: number;
}

/**
 * Category distribution data for pie charts
 *
 * @interface CategoryDistributionData
 */
export interface CategoryDistributionData {
  /** Pattern category */
  category: PatternCategory;
  /** Frequency count */
  frequency: number;
  /** Percentage of total */
  percentage: number;
  /** Number of patterns in this category */
  patternCount: number;
}

/**
 * Enriched tooltip data for interactive visualizations (AC4)
 *
 * @interface PatternTooltipData
 */
export interface PatternTooltipData {
  /** Pattern text for display */
  patternText: string;
  /** Suggested rule for actionable insights */
  suggestedRule: string;
  /** Number of examples available */
  exampleCount: number;
  /** Up to 3 example snippets for context */
  examples?: PatternExample[];
  /** Confidence score for visual emphasis */
  confidence?: number;
  /** Session count for longitudinal patterns */
  sessionCount?: number;
  /** Frequency change for trend indication */
  frequencyChange?: number;
  /** Whether this is a new pattern */
  isNew?: boolean;
}

/**
 * Enriched chart data with tooltip information (AC4)
 *
 * @interface EnrichedChartData
 */
export interface EnrichedChartData extends ChartData {
  /** Tooltip data array matching dataset indices */
  tooltipData?: PatternTooltipData[][];
}

// ============================================================================
// ERROR HANDLING (AR22 COMPLIANT)
// ============================================================================

/**
 * Visualization error codes
 *
 * @enum {string}
 */
export enum VisualizationErrorCode {
  /** Chart data transformation failed */
  CHART_DATA_TRANSFORMATION_FAILED = 'CHART_DATA_TRANSFORMATION_FAILED',
  /** Chart rendering failed */
  CHART_RENDERING_FAILED = 'CHART_RENDERING_FAILED',
  /** Invalid chart type */
  INVALID_CHART_TYPE = 'INVALID_CHART_TYPE',
  /** Empty pattern data */
  EMPTY_PATTERN_DATA = 'EMPTY_PATTERN_DATA',
  /** Canvas element not found */
  CANVAS_NOT_FOUND = 'CANVAS_NOT_FOUND',
  /** Invalid pattern data */
  INVALID_PATTERN_DATA = 'INVALID_PATTERN_DATA',
}

/**
 * AR22 compliant visualization error
 *
 * @interface VisualizationError
 */
export interface VisualizationError {
  /** Error description */
  what: string;
  /** Fix steps */
  how: string[];
  /** Technical details */
  technical?: string;
  /** Error code */
  code?: VisualizationErrorCode;
}

/**
 * Create a visualization error
 *
 * @param what - Error description
 * @param how - Fix steps
 * @param code - Error code
 * @param technical - Technical details
 * @returns VisualizationError object
 */
export function createVisualizationError(
  what: string,
  how: string[],
  code?: VisualizationErrorCode,
  technical?: string
): VisualizationError {
  return {
    what,
    how,
    code,
    technical,
  };
}

/**
 * Throw a visualization error
 *
 * @param what - Error description
 * @param how - Fix steps
 * @param code - Error code
 * @param technical - Technical details
 * @throws Never returns (always throws)
 */
export function throwVisualizationError(
  what: string,
  how: string[],
  code?: VisualizationErrorCode,
  technical?: string
): never {
  const error = createVisualizationError(what, how, code, technical);
  throw error;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Chart render result
 *
 * @interface ChartRenderResult
 */
export interface ChartRenderResult {
  /** Whether rendering was successful */
  success: boolean;
  /** Render time in milliseconds */
  renderTime: number;
  /** Error if unsuccessful */
  error?: VisualizationError;
  /** Chart instance (for cleanup) */
  chartInstance?: any;
}

/**
 * Pattern group for visualization
 *
 * @interface PatternGroup
 */
export interface PatternGroup {
  /** Group key (category, pattern text, etc.) */
  key: string;
  /** Patterns in this group */
  patterns: MergedPattern[];
  /** Total frequency */
  totalFrequency: number;
  /** Pattern count */
  patternCount: number;
}

/**
 * Visualization configuration
 *
 * @interface VisualizationConfig
 */
export interface VisualizationConfig {
  /** Maximum patterns to display */
  maxPatterns?: number;
  /** Whether to show all patterns or sample */
  showAll?: boolean;
  /** Whether to enable animations */
  animate?: boolean;
  /** Chart dimensions */
  dimensions?: {
    /** Width in pixels */
    width?: number;
    /** Height in pixels */
    height?: number;
  };
  /** Color scheme */
  colors?: {
    /** Background colors */
    background?: string[];
    /** Border colors */
    border?: string[];
  };
}

// ============================================================================
// REPORT GENERATION TYPES (Story 3-5)
// ============================================================================

/**
 * Report format types
 *
 * @enum {string}
 */
export enum ReportFormat {
  /** PDF report format */
  PDF = 'pdf',
  /** HTML report format */
  HTML = 'html',
}

/**
 * Report template types
 *
 * @enum {string}
 */
export enum ReportTemplate {
  /** Minimal template: executive summary + top 5 patterns + key charts */
  MINIMAL = 'minimal',
  /** Standard template: full analysis + all charts + recommendations */
  STANDARD = 'standard',
  /** Detailed template: includes examples, trends, raw data tables */
  DETAILED = 'detailed',
}

/**
 * Report generation configuration
 *
 * @interface ReportConfig
 */
export interface ReportConfig {
  /** Report format (PDF or HTML) */
  format: ReportFormat;
  /** Report template type */
  template?: ReportTemplate;
  /** Output file path (auto-generated if not specified) */
  outputPath?: string;
  /** Date range filter for report data */
  dateRange?: {
    /** Start date (ISO string) */
    startDate: string;
    /** End date (ISO string) */
    endDate: string;
  };
  /** Maximum patterns to include (0 = all) */
  maxPatterns?: number;
  /** Whether to include sensitive content (default: false) */
  includeSensitive?: boolean;
  /** Whether to anonymize examples (default: true) */
  anonymizeExamples?: boolean;
  /** Custom report title */
  title?: string;
  /** Whether to include charts (default: true) */
  includeCharts?: boolean;
  /** Whether to include table of contents (HTML only, default: true) */
  includeTableOfContents?: boolean;
  /** Whether to include recommendations (default: true) */
  includeRecommendations?: boolean;
  /** Custom sections to include/exclude */
  sections?: ReportSectionConfig[];
}

/**
 * Report section configuration
 *
 * @interface ReportSectionConfig
 */
export interface ReportSectionConfig {
  /** Section identifier */
  id: string;
  /** Section title */
  title: string;
  /** Whether to include this section */
  include: boolean;
  /** Section order */
  order?: number;
}

/**
 * Report metadata
 *
 * @interface ReportMetadata
 */
export interface ReportMetadata {
  /** Report title */
  title: string;
  /** Generation timestamp */
  generatedAt: string;
  /** Date range covered */
  dateRange?: {
    /** Start date */
    startDate: string;
    /** End date */
    endDate: string;
  };
  /** Total patterns included */
  totalPatterns: number;
  /** Report format */
  format: ReportFormat;
  /** Report template */
  template: ReportTemplate;
  /** Data source reference */
  dataSource: string;
  /** Privacy metadata */
  privacy: {
    /** Whether content was sanitized */
    sanitized: boolean;
    /** Number of redactions made */
    redactionCount: number;
    /** Privacy notice */
    notice: string;
  };
  /** Generation statistics */
  statistics: {
    /** Generation time in milliseconds */
    generationTime: number;
    /** Report file size in bytes */
    fileSize: number;
    /** Number of charts included */
    chartCount: number;
  };
}

/**
 * Report generation result
 *
 * @interface ReportResult
 */
export interface ReportResult {
  /** Whether generation was successful */
  success: boolean;
  /** Output file path */
  filePath?: string;
  /** Report metadata */
  metadata?: ReportMetadata;
  /** Error if unsuccessful */
  error?: VisualizationError | ReportError;
  /** Generation time in milliseconds */
  generationTime: number;
}

/**
 * Report-specific error type
 *
 * @interface ReportError
 */
export interface ReportError {
  /** Error description */
  what: string;
  /** Fix steps */
  how: string[];
  /** Technical details */
  technical?: string;
  /** Error code */
  code?: ReportErrorCode | VisualizationErrorCode;
}

/**
 * PDF-specific configuration
 *
 * @interface PDFConfig
 */
export interface PDFConfig extends ReportConfig {
  /** Page size (default: 'a4') */
  pageSize?: 'a4' | 'letter' | 'legal';
  /** Page orientation (default: 'portrait') */
  orientation?: 'portrait' | 'landscape';
  /** Margins in pixels (default: 40) */
  margins?: {
    /** Top margin */
    top?: number;
    /** Bottom margin */
    bottom?: number;
    /** Left margin */
    left?: number;
    /** Right margin */
    right?: number;
  };
  /** Font settings */
  font?: {
    /** Font family (default: 'helvetica') */
    family?: string;
    /** Font size (default: 12) */
    size?: number;
  };
  /** Whether to include page numbers (default: true) */
  includePageNumbers?: boolean;
  /** Patterns per page (default: 20) */
  patternsPerPage?: number;
  /** Chart image quality (DPI, default: 150) */
  chartQuality?: number;
}

/**
 * HTML-specific configuration
 *
 * @interface HTMLConfig extends ReportConfig
 */
export interface HTMLConfig extends ReportConfig {
  /** Whether to embed CSS (default: true) */
  embedCSS?: boolean;
  /** Whether to embed JavaScript (default: true) */
  embedJS?: boolean;
  /** Whether to use CDN for Chart.js (default: true) */
  useCDN?: boolean;
  /** Custom CSS to include */
  customCSS?: string;
  /** Custom JavaScript to include */
  customJS?: string;
  /** Theme (default: 'light') */
  theme?: 'light' | 'dark';
  /** Whether to include print styles (default: true) */
  includePrintStyles?: boolean;
  /** Whether to make sections collapsible (default: true) */
  collapsibleSections?: boolean;
  /** Whether to include search functionality (default: true) */
  includeSearch?: boolean;
}

/**
 * Report section types
 *
 * @enum {string}
 */
export enum ReportSectionType {
  /** Title page */
  TITLE_PAGE = 'titlePage',
  /** Executive summary */
  EXECUTIVE_SUMMARY = 'executiveSummary',
  /** Statistics overview */
  STATISTICS = 'statistics',
  /** Charts section */
  CHARTS = 'charts',
  /** Pattern details */
  PATTERN_DETAILS = 'patternDetails',
  /** Top patterns by frequency */
  TOP_PATTERNS = 'topPatterns',
  /** Patterns by category */
  BY_CATEGORY = 'byCategory',
  /** Temporal analysis */
  TEMPORAL_ANALYSIS = 'temporalAnalysis',
  /** Recommendations */
  RECOMMENDATIONS = 'recommendations',
  /** Pattern examples */
  EXAMPLES = 'examples',
  /** Raw data tables */
  RAW_DATA = 'rawData',
  /** Table of contents (HTML only) */
  TABLE_OF_CONTENTS = 'tableOfContents',
}

/**
 * Report generation queue item
 *
 * @interface ReportQueueItem
 */
export interface ReportQueueItem {
  /** Unique identifier */
  id: string;
  /** Report configuration */
  config: ReportConfig;
  /** Queue position */
  position: number;
  /** Status */
  status: 'pending' | 'processing' | 'completed' | 'failed';
  /** Submission timestamp */
  submittedAt: string;
  /** Started processing timestamp */
  startedAt?: string;
  /** Completed timestamp */
  completedAt?: string;
  /** Result (if completed) */
  result?: ReportResult;
  /** Progress (0-100) */
  progress?: number;
}

/**
 * Report generation statistics
 *
 * @interface ReportStatistics
 */
export interface ReportStatistics {
  /** Total patterns */
  totalPatterns: number;
  /** Patterns by category */
  byCategory: Record<string, number>;
  /** Total frequency across all patterns */
  totalFrequency: number;
  /** Average pattern frequency */
  averageFrequency: number;
  /** Date range of patterns */
  dateRange: {
    /** First seen date */
    firstSeen: string;
    /** Last seen date */
    lastSeen: string;
  };
  /** Top pattern frequencies */
  topPatterns: Array<{
    /** Pattern text */
    pattern: string;
    /** Frequency */
    frequency: number;
    /** Category */
    category?: string;
  }>;
  /** Temporal trends */
  temporalTrends: Array<{
    /** Date */
    date: string;
    /** Pattern count */
    count: number;
    /** Cumulative count */
    cumulative: number;
  }>;
  /** Improvement metrics */
  improvementMetrics: {
    /** New patterns (first seen in date range) */
    newPatterns: number;
    /** Repeated patterns (seen multiple times) */
    repeatedPatterns: number;
    /** High confidence patterns (confidence > 0.8) */
    highConfidencePatterns: number;
  };
}

/**
 * Report error codes
 *
 * @enum {string}
 */
export enum ReportErrorCode {
  /** PDF generation failed */
  PDF_GENERATION_FAILED = 'PDF_GENERATION_FAILED',
  /** HTML generation failed */
  HTML_GENERATION_FAILED = 'HTML_GENERATION_FAILED',
  /** Report template not found */
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  /** Invalid report configuration */
  INVALID_CONFIG = 'INVALID_CONFIG',
  /** Report generation timeout */
  GENERATION_TIMEOUT = 'GENERATION_TIMEOUT',
  /** File write failed */
  FILE_WRITE_FAILED = 'FILE_WRITE_FAILED',
  /** Concurrent generation limit reached */
  CONCURRENT_LIMIT_REACHED = 'CONCURRENT_LIMIT_REACHED',
  /** Chart rendering failed for report */
  CHART_RENDERING_FAILED = 'CHART_RENDERING_FAILED',
  /** Data sanitization failed */
  SANITIZATION_FAILED = 'SANITIZATION_FAILED',
  /** Content validation failed */
  CONTENT_VALIDATION_FAILED = 'CONTENT_VALIDATION_FAILED',
}
