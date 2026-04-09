/**
 * Report Generation Test Fixtures (Story 3-5)
 *
 * Provides test data for report generation including patterns,
 * chart data, and expected outputs.
 *
 * @module tests/visualization/fixtures/report-test-data
 */

import { MergedPattern } from '../../../src/pattern-matcher';
import { ChartData, ChartType, ReportTemplate, ReportFormat } from '../../../src/visualization/types';
import { PatternCategory } from '../../../src/pattern-detector';
import { ContentType } from '../../../src/content-analyzer';

// ============================================================================
// PATTERN FIXTURES
// ============================================================================

/**
 * Create a test pattern with default values
 */
export function createTestPattern(overrides: Partial<MergedPattern> = {}): MergedPattern {
  return {
    pattern_text: 'User asks about API authentication methods',
    category: PatternCategory.TERMINOLOGY,
    count: 15,
    suggested_rule: 'Provide clear documentation for API authentication',
    examples: [
      {
        original_suggestion: 'How do I authenticate with the API?',
        user_correction: 'Use OAuth 2.0 for API authentication',
        context: 'User asked about authentication methods',
        timestamp: '2026-03-15T10:30:00Z',
        content_type: ContentType.DOCUMENTATION,
      },
      {
        original_suggestion: 'What authentication methods are supported?',
        user_correction: 'Supports OAuth 2.0 and API keys',
        context: 'User inquired about supported auth methods',
        timestamp: '2026-03-16T14:20:00Z',
        content_type: ContentType.DOCUMENTATION,
      },
    ],
    first_seen: '2026-03-01T00:00:00Z',
    last_seen: '2026-03-19T00:00:00Z',
    content_types: [ContentType.DOCUMENTATION],
    session_count: 1,
    total_frequency: 15,
    is_new: false,
    frequency_change: 0,
    ...overrides,
  };
}

/**
 * Create a small dataset for testing (10 patterns)
 */
export function createSmallDataset(): MergedPattern[] {
  return [
    createTestPattern({
      pattern_text: 'User asks about API authentication',
      category: PatternCategory.TERMINOLOGY,
      count: 25,
    }),
    createTestPattern({
      pattern_text: 'User requests code examples',
      category: PatternCategory.CONVENTION,
      count: 20,
    }),
    createTestPattern({
      pattern_text: 'User reports error messages',
      category: PatternCategory.OTHER,
      count: 18,
    }),
    createTestPattern({
      pattern_text: 'User asks about pricing',
      category: PatternCategory.TERMINOLOGY,
      count: 15,
    }),
    createTestPattern({
      pattern_text: 'User requests feature additions',
      category: PatternCategory.CONVENTION,
      count: 12,
    }),
    createTestPattern({
      pattern_text: 'User asks about deployment',
      category: PatternCategory.STRUCTURE,
      count: 10,
    }),
    createTestPattern({
      pattern_text: 'User asks about data export',
      category: PatternCategory.STRUCTURE,
      count: 8,
    }),
    createTestPattern({
      pattern_text: 'User asks about integrations',
      category: PatternCategory.TERMINOLOGY,
      count: 7,
    }),
    createTestPattern({
      pattern_text: 'User reports performance issues',
      category: PatternCategory.FORMATTING,
      count: 5,
    }),
    createTestPattern({
      pattern_text: 'User asks about security',
      category: PatternCategory.CONVENTION,
      count: 3,
    }),
  ];
}

/**
 * Create a medium dataset for testing (100 patterns)
 */
export function createMediumDataset(): MergedPattern[] {
  const patterns: MergedPattern[] = [];
  const categories = [
    PatternCategory.TERMINOLOGY,
    PatternCategory.CONVENTION,
    PatternCategory.STRUCTURE,
    PatternCategory.FORMATTING,
    PatternCategory.CODE_STYLE,
  ];

  for (let i = 0; i < 100; i++) {
    const category = categories[i % categories.length];
    patterns.push(
      createTestPattern({
        pattern_text: `Test pattern ${i}: ${category} query`,
        category,
        count: Math.floor(Math.random() * 50) + 1,
        first_seen: new Date(2026, 2, Math.floor(Math.random() * 19) + 1).toISOString(),
      })
    );
  }

  return patterns;
}

/**
 * Create a large dataset for performance testing (1000 patterns)
 */
export function createLargeDataset(): MergedPattern[] {
  const patterns: MergedPattern[] = [];
  const categories = [
    PatternCategory.TERMINOLOGY,
    PatternCategory.CONVENTION,
    PatternCategory.STRUCTURE,
    PatternCategory.FORMATTING,
    PatternCategory.CODE_STYLE,
  ];

  for (let i = 0; i < 1000; i++) {
    const category = categories[i % categories.length];
    patterns.push(
      createTestPattern({
        pattern_text: `Test pattern ${i}: ${category} query`,
        category,
        count: Math.floor(Math.random() * 100) + 1,
        first_seen: new Date(2026, 2, Math.floor(Math.random() * 19) + 1).toISOString(),
        examples: i % 10 === 0
          ? [
              {
                original_suggestion: `Example suggestion for pattern ${i}`,
                user_correction: `Example correction for pattern ${i}`,
                context: `Example context for pattern ${i}`,
                timestamp: new Date(2026, 2, 15).toISOString(),
                content_type: ContentType.CODE,
              },
            ]
          : [],
      })
    );
  }

  return patterns;
}

/**
 * Create patterns with sensitive data for sanitization testing
 */
export function createSensitiveDataset(): MergedPattern[] {
  return [
    createTestPattern({
      pattern_text: 'User shares email address',
      category: PatternCategory.OTHER,
      count: 5,
      examples: [
        {
          original_suggestion: 'My email is john.doe@example.com',
          user_correction: 'Email redacted',
          context: 'User shared their email address',
          timestamp: '2026-03-15T10:00:00Z',
          content_type: ContentType.DOCUMENTATION,
        },
      ],
    }),
    createTestPattern({
      pattern_text: 'User shares phone number',
      category: PatternCategory.OTHER,
      count: 3,
      examples: [
        {
          original_suggestion: 'Call me at 555-123-4567',
          user_correction: 'Phone number redacted',
          context: 'User shared their phone number',
          timestamp: '2026-03-15T11:00:00Z',
          content_type: ContentType.DOCUMENTATION,
        },
      ],
    }),
    createTestPattern({
      pattern_text: 'User shares API key',
      category: PatternCategory.CONVENTION,
      count: 2,
      examples: [
        {
          original_suggestion: 'API key: sk-1234567890abcdef',
          user_correction: 'API key redacted',
          context: 'User shared their API key',
          timestamp: '2026-03-15T12:00:00Z',
          content_type: ContentType.CODE,
        },
      ],
    }),
    createTestPattern({
      pattern_text: 'User shares password',
      category: PatternCategory.CONVENTION,
      count: 1,
      examples: [
        {
          original_suggestion: 'password: secret123',
          user_correction: 'Password redacted',
          context: 'User shared their password',
          timestamp: '2026-03-15T13:00:00Z',
          content_type: ContentType.DOCUMENTATION,
        },
      ],
    }),
  ];
}

// ============================================================================
// CHART DATA FIXTURES
// ============================================================================

/**
 * Create test bar chart data
 */
export function createBarChartData(): ChartData {
  return {
    chartType: ChartType.BAR,
    title: 'Top 10 Patterns by Frequency',
    xAxis: {
      label: 'Pattern',
      data: [
        'API Authentication',
        'Code Examples',
        'Error Messages',
        'Pricing',
        'Features',
      ],
    },
    yAxis: {
      label: 'Frequency',
      data: [25, 20, 18, 15, 12],
    },
    datasets: [
      {
        label: 'Pattern Frequency',
        data: [25, 20, 18, 15, 12],
        backgroundColor: [
          'rgba(66, 133, 244, 0.6)',
          'rgba(52, 168, 83, 0.6)',
          'rgba(251, 188, 4, 0.6)',
          'rgba(255, 109, 0, 0.6)',
          'rgba(158, 158, 158, 0.6)',
        ],
        borderColor: [
          'rgba(66, 133, 244, 1)',
          'rgba(52, 168, 83, 1)',
          'rgba(251, 188, 4, 1)',
          'rgba(255, 109, 0, 1)',
          'rgba(158, 158, 158, 1)',
        ],
        borderWidth: 1,
      },
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Top 10 Patterns by Frequency',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Pattern',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Frequency',
          },
        },
      },
    },
  };
}

/**
 * Create test line chart data
 */
export function createLineChartData(): ChartData {
  return {
    chartType: ChartType.LINE,
    title: 'Pattern Detection Over Time',
    xAxis: {
      label: 'Date',
      data: [
        '2026-03-01',
        '2026-03-05',
        '2026-03-10',
        '2026-03-15',
        '2026-03-19',
      ],
    },
    yAxis: {
      label: 'Cumulative Patterns',
      data: [10, 35, 68, 92, 100],
    },
    datasets: [
      {
        label: 'Cumulative Pattern Count',
        data: [10, 35, 68, 92, 100],
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderColor: 'rgba(66, 133, 244, 1)',
        borderWidth: 2,
        config: {
          fill: true,
          tension: 0.4,
        },
      },
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        title: {
          display: true,
          text: 'Pattern Detection Over Time',
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          display: true,
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cumulative Patterns',
          },
        },
      },
    },
  };
}

/**
 * Create test pie chart data
 */
export function createPieChartData(): ChartData {
  return {
    chartType: ChartType.PIE,
    title: 'Pattern Distribution by Category',
    xAxis: {
      label: 'Category',
      data: ['API Usage', 'Documentation', 'Error Reporting', 'Billing', 'Other'],
    },
    yAxis: {
      label: 'Count',
      data: [35, 25, 20, 12, 8],
    },
    datasets: [
      {
        label: 'Patterns',
        data: [35, 25, 20, 12, 8],
        backgroundColor: [
          'rgba(66, 133, 244, 0.7)',
          'rgba(52, 168, 83, 0.7)',
          'rgba(251, 188, 4, 0.7)',
          'rgba(255, 109, 0, 0.7)',
          'rgba(158, 158, 158, 0.7)',
        ],
        borderColor: [
          'rgba(66, 133, 244, 1)',
          'rgba(52, 168, 83, 1)',
          'rgba(251, 188, 4, 1)',
          'rgba(255, 109, 0, 1)',
          'rgba(158, 158, 158, 1)',
        ],
        borderWidth: 1,
      },
    ],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
        title: {
          display: true,
          text: 'Pattern Distribution by Category',
        },
      },
    },
  };
}

/**
 * Get all test chart data
 */
export function getAllTestCharts(): ChartData[] {
  return [createBarChartData(), createLineChartData(), createPieChartData()];
}

// ============================================================================
// CONFIGURATION FIXTURES
// ============================================================================

/**
 * Create minimal PDF config
 */
export function createMinimalPDFConfig() {
  return {
    format: ReportFormat.PDF,
    template: ReportTemplate.MINIMAL,
    title: 'Test Report - Minimal Template',
    maxPatterns: 5,
    includeCharts: true,
    includeRecommendations: false,
  };
}

/**
 * Create standard PDF config
 */
export function createStandardPDFConfig() {
  return {
    format: ReportFormat.PDF,
    template: ReportTemplate.STANDARD,
    title: 'Test Report - Standard Template',
    includeCharts: true,
    includeRecommendations: true,
  };
}

/**
 * Create detailed PDF config
 */
export function createDetailedPDFConfig() {
  return {
    format: ReportFormat.PDF,
    template: ReportTemplate.DETAILED,
    title: 'Test Report - Detailed Template',
    includeCharts: true,
    includeRecommendations: true,
    includeSensitive: false,
  };
}

/**
 * Create minimal HTML config
 */
export function createMinimalHTMLConfig() {
  return {
    format: ReportFormat.HTML,
    template: ReportTemplate.MINIMAL,
    title: 'Test Report - Minimal Template',
    maxPatterns: 5,
    includeCharts: true,
    includeRecommendations: false,
    includeSearch: true,
    collapsibleSections: true,
  };
}

/**
 * Create standard HTML config
 */
export function createStandardHTMLConfig() {
  return {
    format: ReportFormat.HTML,
    template: ReportTemplate.STANDARD,
    title: 'Test Report - Standard Template',
    includeCharts: true,
    includeRecommendations: true,
    includeSearch: true,
    collapsibleSections: true,
    includeTableOfContents: true,
  };
}

/**
 * Create detailed HTML config
 */
export function createDetailedHTMLConfig() {
  return {
    format: ReportFormat.HTML,
    template: ReportTemplate.DETAILED,
    title: 'Test Report - Detailed Template',
    includeCharts: true,
    includeRecommendations: true,
    includeSearch: true,
    collapsibleSections: true,
    includeTableOfContents: true,
    includeSensitive: false,
  };
}

// ============================================================================
// EXPECTED OUTPUT FIXTURES
// ============================================================================

/**
 * Expected statistics for small dataset
 */
export function getExpectedSmallDatasetStats() {
  return {
    totalPatterns: 10,
    totalFrequency: 133, // Sum of all frequencies
    averageFrequency: 13.3,
    topPattern: 'User asks about API authentication',
    topPatternFrequency: 25,
    categoryCount: 5, // Unique PatternCategory values
    highConfidencePatterns: 10, // All patterns have valid confidence
  };
}

/**
 * Expected sanitization results for sensitive dataset
 */
export function getExpectedSanitizationResults() {
  return {
    emailRedactions: 1,
    phoneRedactions: 1,
    apiKeyRedactions: 1,
    passwordRedactions: 1,
    totalRedactions: 4,
  };
}
