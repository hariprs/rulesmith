/**
 * Visualization Module (Stories 3-1 through 3-6)
 *
 * Exports all visualization components including charts, transformers,
 * dashboard, report generation, and trend analysis.
 *
 * @module visualization
 */

// Story 3-1: Types
export * from './types';

// Story 3-2: Transformers
export * from './transformers';

// Story 3-3: Chart Renderer
export * from './chart-renderer';

// Story 3-4: Dashboard
export {
  Dashboard,
  DashboardConfig,
  DashboardInstance,
  createDashboard,
} from './dashboard';

export {
  createDashboardLayout,
  DashboardLayoutConfig,
  getChartContainer,
  getAllChartContainers,
  updateLayoutForBreakpoint,
  setMobileCollapsible,
} from './dashboard-layout';

export {
  createFilters,
  applyFilters,
  FilterState,
  DateRangeFilter,
  DashboardFilter,
  FilterConfig,
  getFilterState,
  setFilterState,
  exportFilterState,
  importFilterState,
} from './dashboard-filters';

export {
  calculateSummaryStatistics,
  DashboardStatistics,
  createSummaryCards,
  updateSummaryCards,
  exportStatistics,
  detectStatisticsChanges,
} from './dashboard-stats';

// Story 3-5: Report Generation
export {
  generateReport,
  generateReportQueued,
  getQueueStatus,
  clearQueue,
  calculateStatistics,
} from './report-generator';

export {
  generatePDFReport,
  chartToImage,
} from './pdf-generator';

export {
  generateHTMLReport,
} from './html-generator';

export {
  getTemplate,
  getDefaultTemplate,
  listTemplates,
  applyTemplate,
  createPDFConfig,
  createHTMLConfig,
  validateTemplateConfig,
  getIncludedSections,
  shouldIncludeSection,
  getTemplateDisplayName,
  getTemplateDescription,
  compareTemplates,
  getRecommendedTemplate,
  estimateComplexity,
  MINIMAL_TEMPLATE,
  STANDARD_TEMPLATE,
  DETAILED_TEMPLATE,
} from './report-templates';

export {
  sanitizeText,
  sanitizeExample,
  sanitizeExamples,
  sanitizePattern,
  sanitizePatterns,
  validateContent,
  validateExample,
  validatePattern,
  generatePrivacyNotice,
  generatePrivacyMetadata,
  likelyContainsSensitiveData,
  createSafeExcerpt,
  throwIfUnsafe,
} from './sanitization';

export {
  getPatternFrequency,
  getPatternCategory,
  getPatternConfidence,
  isMergedPattern,
  getPatternExamples,
  formatDate,
  truncateText,
  calculatePercentage,
} from './pattern-utils';

// Story 3-6: Trend Analysis and Predictions
export {
  analyzeTrends,
  exportTrendForChart,
  getTrendSummaryStatistics,
  type TimeGranularity,
  type TimeWindow,
  type TrendDirection,
  type TrendAnalysisOptions,
  type PatternTrend,
  type TrendAnalysisResult,
} from './trend-analyzer';

export {
  predictPatterns,
  exportPredictionForChart,
  type PredictionModel,
  type PredictionHorizon,
  type PredictionOptions,
  type PatternPrediction,
} from './predictor';

export {
  analyzeCorrelations,
  exportCorrelationMatrix,
  getCorrelationSummaryStatistics,
  type CorrelationMethod,
  type PatternCorrelation,
  type PatternCluster,
  type PatternChain,
  type PatternInfluence,
  type CorrelationAnalysisResult,
} from './correlation-analyzer';

export {
  detectAnomalies,
  exportAnomaliesForChart,
  getAnomalySummaryStatistics,
  type AnomalySensitivity,
  type AnomalySeverity,
  type AnomalyType,
  type PatternAnomaly,
  type AnomalyDetectionOptions,
  type AnomalyDetectionResult,
} from './anomaly-detector';

export {
  executeTrendAnalysis,
  executePatternPrediction,
  executeAnomalyDetection,
  validateOptions,
  type TrendCLIOptions,
  type PredictionCLIOptions,
  type AnomalyCLIOptions,
} from './cli-commands';

export {
  calculateLinearRegression,
  calculateMovingAverage,
  calculateExponentialSmoothing,
  calculatePearsonCorrelation,
  detectOutliersZScore,
  detectOutliersIQR,
  calculateMAE,
  calculateRMSE,
  calculateMAPE,
  interpolateData,
  type DataPoint,
  type LinearRegressionResult,
  type CorrelationResult,
  type OutlierResult,
} from './statistics';
