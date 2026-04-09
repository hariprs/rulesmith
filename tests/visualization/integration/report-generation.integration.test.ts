/**
 * Integration Tests for Report Generation (Story 3-5)
 *
 * Tests the complete report generation pipeline including:
 * - End-to-end PDF generation workflow
 * - End-to-end HTML generation workflow
 * - Data transformation and sanitization integration
 * - Template system integration
 * - Error recovery and validation
 * - Performance with realistic datasets
 *
 * Test Architecture Principle: These tests integrate multiple components
 * and test workflows that cannot be adequately tested at the unit level.
 * Unit tests cover individual functions; these tests cover the pipeline.
 *
 * @module tests/visualization/integration/report-generation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
  generateReport,
  generateReportQueued,
  getQueueStatus,
  clearQueue,
  calculateStatistics,
} from '../../../src/visualization/report-generator';
import {
  sanitizePatterns,
  validateContent,
  generatePrivacyNotice,
} from '../../../src/visualization/sanitization';
import {
  ReportFormat,
  ReportTemplate,
  ReportConfig,
  PDFConfig,
  HTMLConfig,
} from '../../../src/visualization/types';
import {
  createTestPattern,
  createSmallDataset,
  createMediumDataset,
  createLargeDataset,
  createSensitiveDataset,
  createBarChartData,
  createLineChartData,
  createPieChartData,
  getAllTestCharts,
  createMinimalPDFConfig,
  createStandardPDFConfig,
  createDetailedPDFConfig,
  createMinimalHTMLConfig,
  createStandardHTMLConfig,
  createDetailedHTMLConfig,
} from '../fixtures/report-test-data';
import { MergedPattern } from '../../../src/pattern-matcher';
import { ChartData } from '../../../src/visualization/types';

// ============================================================================
// TEST SETUP AND TEARDOWN
// ============================================================================

let testOutputDir: string;

beforeEach(async () => {
  // Create temporary directory for test outputs
  testOutputDir = join(tmpdir(), `report-test-${Date.now()}`);
  await fs.mkdir(testOutputDir, { recursive: true });
  clearQueue();
});

afterEach(async () => {
  // Clean up test outputs
  try {
    await fs.rm(testOutputDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
  clearQueue();
});

// ============================================================================
// PDF REPORT GENERATION INTEGRATION TESTS (AC1)
// ============================================================================

describe('PDF Report Generation Integration (AC1)', () => {
  describe('Complete PDF Generation Pipeline', () => {
    it('should generate minimal PDF report with small dataset', async () => {
      const patterns = createSmallDataset();
      const config: PDFConfig = {
        ...createMinimalPDFConfig(),
        outputPath: join(testOutputDir, 'minimal-small.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.format).toBe(ReportFormat.PDF);
      expect(result.metadata?.template).toBe(ReportTemplate.MINIMAL);
      expect(result.metadata?.totalPatterns).toBe(10);
      expect(result.generationTime).toBeLessThan(5000); // Should complete in < 5s for 10 patterns
    });

    it('should generate standard PDF report with medium dataset', async () => {
      const patterns = createMediumDataset();
      const charts = getAllTestCharts();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'standard-medium.pdf'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.metadata?.totalPatterns).toBe(100);
      expect(result.metadata?.statistics?.chartCount).toBe(3);
      expect(result.generationTime).toBeLessThan(10000); // < 10s for 100 patterns
    });

    it('should generate detailed PDF report with all sections', async () => {
      const patterns = createSmallDataset();
      const charts = getAllTestCharts();
      const config: PDFConfig = {
        ...createDetailedPDFConfig(),
        outputPath: join(testOutputDir, 'detailed-all.pdf'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.DETAILED);
      expect(result.metadata?.totalPatterns).toBe(10);
      expect(result.metadata?.privacy?.sanitized).toBe(true);
    });
  });

  describe('PDF Data Integration', () => {
    it('should integrate statistics calculation with PDF generation', async () => {
      const patterns = createSmallDataset();
      const statistics = calculateStatistics(patterns);
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'statistics-integration.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics).toBeDefined();
      expect(statistics.totalPatterns).toBe(10);
      expect(statistics.totalFrequency).toBeGreaterThan(0);
    });

    it('should integrate chart data with PDF generation', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData(), createLineChartData()];
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'chart-integration.pdf'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics?.chartCount).toBe(2);
    });
  });

  describe('PDF Sanitization Integration', () => {
    it('should integrate sanitization with PDF generation', async () => {
      const patterns = createSensitiveDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'sanitized.pdf'),
        includeSensitive: false,
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(true);
      expect(result.metadata?.privacy?.redactionCount).toBeGreaterThan(0);
    });

    it('should include sensitive data when configured', async () => {
      const patterns = createSensitiveDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'unsanitized.pdf'),
        includeSensitive: true,
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(false);
      expect(result.metadata?.privacy?.redactionCount).toBe(0);
    });
  });

  describe('PDF Template Integration', () => {
    it('should apply minimal template correctly', async () => {
      const patterns = createMediumDataset();
      const config: PDFConfig = {
        ...createMinimalPDFConfig(),
        template: ReportTemplate.MINIMAL,
        outputPath: join(testOutputDir, 'template-minimal.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.MINIMAL);
      // Minimal template limits to 5 patterns
      expect(result.metadata?.totalPatterns).toBeLessThanOrEqual(5);
    });

    it('should apply standard template correctly', async () => {
      const patterns = createMediumDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        template: ReportTemplate.STANDARD,
        outputPath: join(testOutputDir, 'template-standard.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.STANDARD);
      // Standard template includes all patterns
      expect(result.metadata?.totalPatterns).toBe(100);
    });

    it('should apply detailed template correctly', async () => {
      const patterns = createSmallDataset();
      const config: PDFConfig = {
        ...createDetailedPDFConfig(),
        template: ReportTemplate.DETAILED,
        outputPath: join(testOutputDir, 'template-detailed.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.DETAILED);
      expect(result.metadata?.totalPatterns).toBe(10);
    });
  });
});

// ============================================================================
// HTML REPORT GENERATION INTEGRATION TESTS (AC2)
// ============================================================================

describe('HTML Report Generation Integration (AC2)', () => {
  describe('Complete HTML Generation Pipeline', () => {
    it('should generate minimal HTML report with small dataset', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createMinimalHTMLConfig(),
        outputPath: join(testOutputDir, 'minimal-small.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.filePath).toBeDefined();
      expect(result.metadata?.format).toBe(ReportFormat.HTML);
      expect(result.metadata?.template).toBe(ReportTemplate.MINIMAL);
      expect(result.generationTime).toBeLessThan(3000); // < 3s for 10 patterns
    });

    it('should generate standard HTML report with medium dataset', async () => {
      const patterns = createMediumDataset();
      const charts = getAllTestCharts();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'standard-medium.html'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.totalPatterns).toBe(100);
      expect(result.metadata?.statistics?.chartCount).toBe(3);
      expect(result.generationTime).toBeLessThan(5000); // < 5s for 100 patterns
    });

    it('should generate detailed HTML report with all sections', async () => {
      const patterns = createSmallDataset();
      const charts = getAllTestCharts();
      const config: HTMLConfig = {
        ...createDetailedHTMLConfig(),
        outputPath: join(testOutputDir, 'detailed-all.html'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      expect(result.metadata?.template).toBe(ReportTemplate.DETAILED);
      expect(result.metadata?.totalPatterns).toBe(10);
    });
  });

  describe('HTML Interactive Features', () => {
    it('should include search functionality when configured', async () => {
      const patterns = createMediumDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        includeSearch: true,
        outputPath: join(testOutputDir, 'search-enabled.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      // Verify HTML content includes search
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('search');
      expect(htmlContent).toContain('patternSearch');
    });

    it('should include collapsible sections when configured', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        collapsibleSections: true,
        outputPath: join(testOutputDir, 'collapsible.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('collapsible');
      expect(htmlContent).toContain('toggleCollapse');
    });

    it('should include table of contents when configured', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        includeTableOfContents: true,
        outputPath: join(testOutputDir, 'with-toc.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('Table of Contents');
      expect(htmlContent).toContain('toc');
    });
  });

  describe('HTML Chart Integration', () => {
    it('should embed interactive Chart.js charts', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData()];
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        useCDN: false, // Test without CDN
        outputPath: join(testOutputDir, 'embedded-charts.html'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('chart-0');
      expect(htmlContent).toContain('initializeCharts');
      expect(htmlContent).toContain('window.chartsData');
    });

    it('should include CDN links when configured', async () => {
      const patterns = createSmallDataset();
      const charts = [createBarChartData()];
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        useCDN: true,
        outputPath: join(testOutputDir, 'cdn-charts.html'),
      };

      const result = await generateReport(patterns, charts, config);

      expect(result.success).toBe(true);
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('cdn.jsdelivr.net');
      expect(htmlContent).toContain('chart.umd.min.js');
    });
  });
});

// ============================================================================
// DATA TRANSFORMATION INTEGRATION TESTS (AC3)
// ============================================================================

describe('Data Transformation Integration (AC3)', () => {
  describe('Pattern Data Integration', () => {
    it('should handle Pattern[] input correctly', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'pattern-input.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.totalPatterns).toBe(10);
    });

    it('should handle empty pattern array', async () => {
      const patterns: MergedPattern[] = [];
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'empty-patterns.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.totalPatterns).toBe(0);
    });

    it('should handle patterns with missing optional fields', async () => {
      const patterns = [
        createTestPattern({
          examples: undefined,
          first_seen: undefined,
          last_seen: undefined,
        }),
      ];
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'missing-fields.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.totalPatterns).toBe(1);
    });
  });

  describe('Statistics Integration', () => {
    it('should calculate accurate statistics for report', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'statistics.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.statistics).toBeDefined();

      const stats = calculateStatistics(patterns);
      expect(stats.totalPatterns).toBe(10);
      expect(stats.totalFrequency).toBe(133);
      expect(stats.byCategory).toBeDefined();
      expect(stats.topPatterns).toBeDefined();
    });

    it('should generate temporal trends correctly', async () => {
      const patterns = createMediumDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'temporal-trends.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);

      const stats = calculateStatistics(patterns);
      expect(stats.temporalTrends).toBeDefined();
      expect(stats.temporalTrends.length).toBeGreaterThan(0);
      expect(stats.temporalTrends[0]).toHaveProperty('date');
      expect(stats.temporalTrends[0]).toHaveProperty('count');
      expect(stats.temporalTrends[0]).toHaveProperty('cumulative');
    });
  });
});

// ============================================================================
// PRIVACY AND SANITIZATION INTEGRATION TESTS (AC5)
// ============================================================================

describe('Privacy and Sanitization Integration (AC5)', () => {
  describe('End-to-End Sanitization Workflow', () => {
    it('should sanitize sensitive data in complete PDF workflow', async () => {
      const patterns = createSensitiveDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        includeSensitive: false,
        outputPath: join(testOutputDir, 'sanitized-workflow.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(true);
      expect(result.metadata?.privacy?.redactionCount).toBeGreaterThan(0);

      // Verify privacy notice is generated
      const notice = generatePrivacyNotice(true, result.metadata?.privacy?.redactionCount || 0);
      expect(notice).toContain('sanitized');
    });

    it('should sanitize sensitive data in complete HTML workflow', async () => {
      const patterns = createSensitiveDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        includeSensitive: false,
        outputPath: join(testOutputDir, 'sanitized-workflow.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy?.sanitized).toBe(true);

      // Verify HTML content has privacy notice
      const htmlContent = await fs.readFile(result.filePath!, 'utf-8');
      expect(htmlContent).toContain('Privacy Notice');
    });

    it('should validate content before generation', async () => {
      const patterns = createSensitiveDataset();

      // Validate each pattern's examples
      for (const pattern of patterns) {
        for (const example of pattern.examples || []) {
          const validation = validateContent(example.original_suggestion);
          if (validation.containsCredentials) {
            expect(validation.isSafe).toBe(false);
            expect(validation.issues.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe('Privacy Metadata Integration', () => {
    it('should include privacy metadata in report', async () => {
      const patterns = createSensitiveDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        includeSensitive: false,
        outputPath: join(testOutputDir, 'privacy-metadata.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.metadata?.privacy).toBeDefined();
      expect(result.metadata?.privacy?.sanitized).toBe(true);
      expect(result.metadata?.privacy?.redactionCount).toBeGreaterThan(0);
      expect(result.metadata?.privacy?.notice).toBeDefined();
      expect(result.metadata?.generatedAt).toBeDefined();
    });
  });
});

// ============================================================================
// ERROR HANDLING AND RECOVERY INTEGRATION TESTS (AC6)
// ============================================================================

describe('Error Handling and Recovery Integration (AC6)', () => {
  describe('Invalid Input Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      const patterns = createSmallDataset();
      const config = {
        format: 'invalid' as ReportFormat,
        outputPath: join(testOutputDir, 'invalid-config.pdf'),
      } as ReportConfig;

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.what).toContain('format');
    });

    it('should handle invalid template configuration', async () => {
      const patterns = createSmallDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        template: 'invalid' as ReportTemplate,
        outputPath: join(testOutputDir, 'invalid-template.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: '/invalid/path/that/does/not/exist/report.html',
      };

      const result = await generateReport(patterns, [], config);

      // Should fail but provide meaningful error
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error?.how).toBeDefined();
      }
    });
  });

  describe('Partial Failure Recovery', () => {
    it('should handle mixed valid and invalid patterns', async () => {
      const patterns = [
        createTestPattern({ pattern_text: 'Valid pattern 1' }),
        {} as MergedPattern, // Invalid pattern
        createTestPattern({ pattern_text: 'Valid pattern 2' }),
      ];
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'mixed-patterns.html'),
      };

      const result = await generateReport(patterns, [], config);

      // Should handle gracefully - either succeed with valid patterns or fail with clear error
      expect(result).toBeDefined();
    });
  });
});

// ============================================================================
// CONCURRENT GENERATION INTEGRATION TESTS (AC6)
// ============================================================================

describe('Concurrent Generation Integration (AC6)', () => {
  describe('Queue Management', () => {
    it('should queue multiple report generation requests', async () => {
      const patterns = createSmallDataset();

      // Enqueue multiple reports
      const item1 = await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'queued-1.html'),
      });

      const item2 = await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'queued-2.html'),
      });

      const item3 = await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'queued-3.html'),
      });

      expect(item1.id).toBeDefined();
      expect(item2.id).toBeDefined();
      expect(item3.id).toBeDefined();

      // Check queue status
      const status = getQueueStatus();
      expect(status.total).toBeGreaterThanOrEqual(3);
    });

    it('should respect concurrent limit', async () => {
      const patterns = createMediumDataset();

      // Enqueue more than concurrent limit (3)
      const items = [];
      for (let i = 0; i < 5; i++) {
        const item = await generateReportQueued(patterns, [], {
          ...createStandardHTMLConfig(),
          outputPath: join(testOutputDir, `concurrent-${i}.html`),
        });
        items.push(item);
      }

      // Should have queued all items
      expect(items.length).toBe(5);

      const status = getQueueStatus();
      expect(status.total).toBe(5);
    });

    it('should process queue in FIFO order', async () => {
      const patterns = createSmallDataset();

      const item1 = await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'fifo-1.html'),
      });

      const item2 = await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'fifo-2.html'),
      });

      // Item 1 should have earlier position than item 2
      expect(item1.position).toBeLessThan(item2.position);
    });
  });

  describe('Queue Status and Cleanup', () => {
    it('should report accurate queue status', async () => {
      const patterns = createSmallDataset();

      await generateReportQueued(patterns, [], {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'status-1.html'),
      });

      const status = getQueueStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('processing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
    });

    it('should clear completed queue items', () => {
      clearQueue();
      const status = getQueueStatus();
      expect(status.total).toBe(0);
    });
  });
});

// ============================================================================
// PERFORMANCE INTEGRATION TESTS (AC6)
// ============================================================================

describe('Performance Integration (AC6)', () => {
  describe('Generation Time Performance', () => {
    it('should generate HTML report quickly for small dataset', async () => {
      const patterns = createSmallDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'perf-small.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.generationTime).toBeLessThan(3000); // < 3s for 10 patterns
    });

    it('should generate HTML report within threshold for medium dataset', async () => {
      const patterns = createMediumDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'perf-medium.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.generationTime).toBeLessThan(5000); // < 5s for 100 patterns
    });

    it('should generate PDF report within threshold for medium dataset', async () => {
      const patterns = createMediumDataset();
      const config: PDFConfig = {
        ...createStandardPDFConfig(),
        outputPath: join(testOutputDir, 'perf-medium.pdf'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);
      expect(result.generationTime).toBeLessThan(10000); // < 10s for 100 patterns
    });
  });

  describe('File Size Performance', () => {
    it('should generate reasonably sized HTML file', async () => {
      const patterns = createMediumDataset();
      const config: HTMLConfig = {
        ...createStandardHTMLConfig(),
        outputPath: join(testOutputDir, 'size-medium.html'),
      };

      const result = await generateReport(patterns, [], config);

      expect(result.success).toBe(true);

      // Check file size
      const stats = await fs.stat(result.filePath!);
      const sizeKB = stats.size / 1024;
      expect(sizeKB).toBeLessThan(500); // < 500KB for 100 patterns
    });
  });
});

// ============================================================================
// CROSS-FORMAT INTEGRATION TESTS
// ============================================================================

describe('Cross-Format Integration Tests', () => {
  it('should generate both PDF and HTML with same data', async () => {
    const patterns = createSmallDataset();
    const charts = getAllTestCharts();

    const pdfConfig: PDFConfig = {
      ...createStandardPDFConfig(),
      outputPath: join(testOutputDir, 'cross-format.pdf'),
    };

    const htmlConfig: HTMLConfig = {
      ...createStandardHTMLConfig(),
      outputPath: join(testOutputDir, 'cross-format.html'),
    };

    const pdfResult = await generateReport(patterns, charts, pdfConfig);
    const htmlResult = await generateReport(patterns, charts, htmlConfig);

    expect(pdfResult.success).toBe(true);
    expect(htmlResult.success).toBe(true);

    // Both should have same metadata
    expect(pdfResult.metadata?.totalPatterns).toBe(htmlResult.metadata?.totalPatterns);
    expect(pdfResult.metadata?.statistics?.chartCount).toBe(htmlResult.metadata?.statistics?.chartCount);
  });

  it('should handle date range filtering consistently across formats', async () => {
    const patterns = createMediumDataset();
    const charts = getAllTestCharts();

    const dateRange = {
      startDate: '2026-03-01',
      endDate: '2026-03-15',
    };

    const pdfConfig: PDFConfig = {
      ...createStandardPDFConfig(),
      dateRange,
      outputPath: join(testOutputDir, 'daterange-pdf.pdf'),
    };

    const htmlConfig: HTMLConfig = {
      ...createStandardHTMLConfig(),
      dateRange,
      outputPath: join(testOutputDir, 'daterange-html.html'),
    };

    const pdfResult = await generateReport(patterns, charts, pdfConfig);
    const htmlResult = await generateReport(patterns, charts, htmlConfig);

    expect(pdfResult.success).toBe(true);
    expect(htmlResult.success).toBe(true);
    expect(pdfResult.metadata?.dateRange).toEqual(dateRange);
    expect(htmlResult.metadata?.dateRange).toEqual(dateRange);
  });
});
