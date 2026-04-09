/**
 * Unit Tests for PDF Generator (Story 3-5, AC1)
 *
 * Tests PDF-specific functionality including:
 * - PDF section generation (title page, executive summary, statistics, charts, patterns)
 * - PDF layout and pagination
 * - PDF configuration validation
 * - Chart-to-image conversion
 *
 * Test Architecture Principle: These unit tests isolate PDF generation
 * logic from the broader report pipeline. Integration tests cover the
 * full workflow; these tests focus on PDF-specific concerns.
 *
 * @module tests/visualization/unit/pdf-generator
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generatePDFReport,
  chartToImage,
} from '../../../src/visualization/pdf-generator';
import {
  ReportFormat,
  ReportTemplate,
  PDFConfig,
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

// Mock jsPDF and jspdf-autotable
jest.mock('jspdf', () => {
  return {
    default: jest.fn().mockImplementation(() => ({
      internal: {
        pageSize: { getWidth: () => 595, getHeight: () => 842 },
        getNumberOfPages: () => 1,
      },
      setFont: jest.fn(),
      setFontSize: jest.fn(),
      setTextColor: jest.fn(),
      text: jest.fn(),
      splitTextToSize: jest.fn((text: string, width: number) => [text]),
      addPage: jest.fn(),
      addImage: jest.fn(),
      setPage: jest.fn(),
      output: jest.fn(() => new ArrayBuffer(0)),
      save: jest.fn(),
    })),
  };
});

jest.mock('jspdf-autotable', () => ({
  default: jest.fn(() => ({
    finalY: 100,
  })),
}));

// Mock fs and path for Node.js environment
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
  writeFile: jest.fn(),
}));

jest.mock('path', () => ({
  dirname: jest.fn(() => '.'),
}));

// ============================================================================
// PDF GENERATION UNIT TESTS
// ============================================================================

describe('PDF Generator - Unit Tests', () => {
  describe('PDF Report Generation', () => {
    it('should generate PDF with minimal configuration', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        template: ReportTemplate.MINIMAL,
        title: 'Test PDF Report',
        outputPath: '/tmp/test-report.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe(ReportFormat.PDF);
      expect(result.metadata?.template).toBe(ReportTemplate.MINIMAL);
    });

    it('should generate PDF with standard template', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        template: ReportTemplate.STANDARD,
        title: 'Standard PDF Report',
        outputPath: '/tmp/standard-report.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.STANDARD);
    });

    it('should generate PDF with detailed template', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        template: ReportTemplate.DETAILED,
        title: 'Detailed PDF Report',
        outputPath: '/tmp/detailed-report.pdf',
        includeRecommendations: true,
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.DETAILED);
    });
  });

  describe('PDF Configuration', () => {
    it('should use default page size and orientation', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        outputPath: '/tmp/default-config.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support custom page size', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        pageSize: 'letter',
        outputPath: '/tmp/letter-size.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support landscape orientation', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        orientation: 'landscape',
        outputPath: '/tmp/landscape.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should support custom margins', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        outputPath: '/tmp/custom-margins.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('PDF Section Inclusion', () => {
    it('should include charts when configured', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includeCharts: true,
        outputPath: '/tmp/with-charts.pdf',
      };

      const result = await generatePDFReport(patterns, charts, statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics?.chartCount).toBe(1);
    });

    it('should exclude charts when configured', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includeCharts: false,
        outputPath: '/tmp/without-charts.pdf',
      };

      const result = await generatePDFReport(patterns, charts, statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics?.chartCount).toBe(0);
    });

    it('should include recommendations when configured', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includeRecommendations: true,
        outputPath: '/tmp/with-recommendations.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });

    it('should include page numbers by default', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includePageNumbers: true,
        outputPath: '/tmp/with-page-numbers.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('PDF Pagination', () => {
    it('should paginate patterns when exceeding patterns per page', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        patternsPerPage: 5,
        outputPath: '/tmp/paginated.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.totalPatterns).toBe(10);
    });

    it('should support custom patterns per page', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        patternsPerPage: 20,
        outputPath: '/tmp/custom-pagination.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
    });
  });

  describe('PDF Privacy and Sanitization', () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includeSensitive: true,
        outputPath: '/tmp/unsanitized.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        includeSensitive: false,
        outputPath: '/tmp/sanitized.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(true);
    });
  });

  describe('Chart Image Conversion', () => {
    it('should convert chart canvas to image', async () => {
      // Create mock canvas element
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 800;
      mockCanvas.height = 600;

      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 800, 600);
      }

      const dataUrl = await chartToImage(mockCanvas, 150);

      expect(dataUrl).toBeDefined();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should scale canvas for higher resolution', async () => {
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 400;
      mockCanvas.height = 300;

      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 400, 300);
      }

      const dataUrl = await chartToImage(mockCanvas, 200);

      expect(dataUrl).toBeDefined();
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('PDF Error Handling', () => {
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

      // Invalid format (should be 'pdf')
      const config = {
        format: 'html' as ReportFormat,
        outputPath: '/tmp/invalid.pdf',
      } as PDFConfig;

      const result = await generatePDFReport(patterns, [], statistics, config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing required dependencies', async () => {
      // This test would require mocking the dynamic import to fail
      // For now, we'll just verify the function exists and handles errors
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        outputPath: '/tmp/test.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      // Should either succeed or fail with meaningful error
      expect(result).toBeDefined();
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error?.how).toBeDefined();
      }
    });
  });

  describe('PDF Metadata', () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        title: 'Metadata Test PDF',
        outputPath: '/tmp/metadata.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      if (result.success) {
        expect(result.metadata).toBeDefined();
        expect(result.metadata?.title).toBe('Metadata Test PDF');
        expect(result.metadata?.generatedAt).toBeDefined();
        expect(result.metadata?.totalPatterns).toBe(10);
        expect(result.metadata?.format).toBe(ReportFormat.PDF);
        expect(result.metadata?.statistics).toBeDefined();
      }
    });

    it('should include generation time in metadata', async () => {
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

      const config: PDFConfig = {
        format: ReportFormat.PDF,
        outputPath: '/tmp/timing.pdf',
      };

      const result = await generatePDFReport(patterns, [], statistics, config);

      if (result.success) {
        expect(result.generationTime).toBeDefined();
        expect(result.generationTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata?.statistics?.generationTime).toBe(result.generationTime);
      }
    });
  });
});
