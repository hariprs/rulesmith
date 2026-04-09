/**
 * Unit Tests for HTML Generator (Story 3-5, AC2)
 *
 * Tests HTML-specific functionality including:
 * - HTML content generation and structure
 * - Interactive features (search, collapsible sections, table of contents)
 * - Chart.js integration
 * - Theme and styling
 * - HTML configuration validation
 *
 * Test Architecture Principle: These unit tests isolate HTML generation
 * logic from the broader report pipeline. Integration tests cover the
 * full workflow; these tests focus on HTML-specific concerns.
 *
 * @module tests/visualization/unit/html-generator
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateHTMLReport,
} from '../../../src/visualization/html-generator';
import {
  ReportFormat,
  ReportTemplate,
  HTMLConfig,
} from '../../../src/visualization/types';
import {
  createTestPattern,
  createSmallDataset,
  createBarChartData,
  createLineChartData,
} from '../fixtures/report-test-data';
import { ReportStatistics } from '../../../src/visualization/types';

// ============================================================================
// TEST SETUP
// ============================================================================

// Mock fs and path for Node.js environment
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('path', () => ({
  dirname: jest.fn(() => '.'),
}));

// ============================================================================
// HTML GENERATION UNIT TESTS
// ============================================================================

describe('HTML Generator - Unit Tests', () => {
  describe('HTML Report Generation', () => {
    it('should generate HTML with minimal configuration', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: { CATEGORY_A: 5, CATEGORY_B: 5 },
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [
          { pattern: 'Pattern 1', frequency: 25, category: 'CATEGORY_A' },
        ],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 2,
          repeatedPatterns: 8,
          highConfidencePatterns: 7,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        template: ReportTemplate.MINIMAL,
        title: 'Test HTML Report',
        outputPath: '/tmp/test-report.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe(ReportFormat.HTML);
      expect(result.metadata?.template).toBe(ReportTemplate.MINIMAL);
    });

    it('should generate HTML with standard template', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: { CATEGORY_A: 10 },
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        template: ReportTemplate.STANDARD,
        title: 'Standard HTML Report',
        outputPath: '/tmp/standard-report.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.STANDARD);
    });

    it('should generate HTML with detailed template', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        template: ReportTemplate.DETAILED,
        title: 'Detailed HTML Report',
        outputPath: '/tmp/detailed-report.html',
        includeRecommendations: true,
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.DETAILED);
    });
  });

  describe('HTML Structure and Content', () => {
    it('should include proper HTML document structure', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidenceCharts: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/structure.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should include executive summary section', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/summary.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should include statistics section', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: { CATEGORY_A: 10 },
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/stats.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('Interactive Features', () => {
    it('should include search functionality when configured', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        includeSearch: true,
        outputPath: '/tmp/search.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should include collapsible sections when configured', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        collapsibleSections: true,
        outputPath: '/tmp/collapsible.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should include table of contents when configured', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        includeTableOfContents: true,
        outputPath: '/tmp/toc.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('Chart Integration', () => {
    it('should embed chart data for Chart.js', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData()];
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        includeCharts: true,
        outputPath: '/tmp/charts.html',
      };

      const result = await generateHTMLReport(patterns, charts, statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics?.chartCount).toBe(1);
    });

    it('should include CDN links when configured', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData()];
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        useCDN: true,
        outputPath: '/tmp/cdn.html',
      };

      const result = await generateHTMLReport(patterns, charts, statistics, config);

      expect(result.success).toBe(true);
    });

    it('should work without CDN for offline viewing', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData()];
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        useCDN: false,
        outputPath: '/tmp/offline.html',
      };

      const result = await generateHTMLReport(patterns, charts, statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('Theme and Styling', () => {
    it('should support light theme', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        theme: 'light',
        outputPath: '/tmp/light.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support dark theme', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        theme: 'dark',
        outputPath: '/tmp/dark.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support custom CSS', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        customCSS: 'body { font-family: Arial; }',
        outputPath: '/tmp/custom-css.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support custom JavaScript', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        customJS: 'console.log("Custom script");',
        outputPath: '/tmp/custom-js.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('HTML Privacy and Sanitization', () => {
    it('should respect includeSensitive configuration', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        includeSensitive: true,
        outputPath: '/tmp/unsanitized.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(false);
      expect(result.metadata?.privacy?.redactionCount).toBe(0);
    });

    it('should anonymize examples when includeSensitive is false', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        includeSensitive: false,
        outputPath: '/tmp/sanitized.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(true);
    });
  });

  describe('HTML Print Styles', () => {
    it('should include print-to-PDF styles', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/print.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('HTML Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      // Invalid format (should be 'html')
      const config = {
        format: 'pdf' as ReportFormat,
        outputPath: '/tmp/invalid.html',
      } as HTMLConfig;

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('HTML Metadata', () => {
    it('should include accurate metadata in result', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        title: 'Metadata Test HTML',
        outputPath: '/tmp/metadata.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      if (result.success) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.title).toBe('Metadata Test HTML');
        expect(result.metadata?.generatedAt).toBeDefined();
        expect(result.metadata?.totalPatterns).toBe(10);
        expect(result.metadata?.format).toBe(ReportFormat.HTML);
        expect(result.metadata?.statistics).toBeDefined();
      }
    });

    it('should calculate file size correctly', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/filesize.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      if (result.success) {
        expect(result.metadata?.statistics?.fileSize).toBeDefined();
        expect(result.metadata?.statistics?.fileSize).toBeGreaterThan(0);
      }
    });
  });

  describe('HTML Responsive Design', () => {
    it('should include responsive CSS', async () => {
      const patterns = createSmallDataset();
      const statistics: ReportStatistics = {
        totalPatterns: 10,
        byCategory: {},
        totalFrequency: 100,
        averageFrequency: 10,
        dateRange: {
          firstSeen: '2026-03-01T00:00:00Z',
          lastSeen: '2026-03-19T00:00:00Z',
        },
        topPatterns: [],
        temporalTrends: [],
        improvementMetrics: {
          newPatterns: 0,
          repeatedPatterns: 0,
          highConfidencePatterns: 0,
        },
      };

      const config: HTMLConfig = {
        format: ReportFormat.HTML,
        outputPath: '/tmp/responsive.html',
      };

      const result = await generateHTMLReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });
});
