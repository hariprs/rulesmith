/**
 * PDF Report Generator (Story 3-5, AC1)
 *
 * Generates professional PDF reports with embedded charts, pattern analysis,
 * and actionable insights using jsPDF library.
 *
 * YOLO Approach: Rapid development with real PDF generation, iterating based
 * on actual output quality.
 *
 * @module visualization/pdf-generator
 */

import { Pattern } from '../pattern-detector';
import { MergedPattern } from '../pattern-matcher';
import { ChartData } from './types';
import {
  PDFConfig,
  ReportResult,
  ReportMetadata,
  ReportStatistics,
  ReportFormat,
  ReportTemplate,
  createVisualizationError,
} from './types';
import { sanitizePatterns, generatePrivacyNotice } from './sanitization';
import {
  getPatternFrequency,
  getPatternCategory,
  getPatternConfidence,
  truncateText,
  formatDate,
  calculatePercentage,
} from './pattern-utils';

// ============================================================================
// PDF GENERATION
// ============================================================================

/**
 * Generate PDF report
 *
 * @param patterns - Merged pattern data
 * @param charts - Chart data for embedding
 * @param statistics - Report statistics
 * @param config - PDF configuration
 * @returns Report generation result
 */
export async function generatePDFReport(
  patterns: (Pattern | MergedPattern)[],
  charts: ChartData[],
  statistics: ReportStatistics,
  config: PDFConfig
): Promise<ReportResult> {
  const startTime = Date.now();

  try {
    // Dynamic import of jsPDF (Node.js environment)
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    // Validate configuration
    validatePDFConfig(config);

    // Sanitize data if needed
    const sanitizedPatterns = config.includeSensitive
      ? patterns
      : sanitizePatterns(patterns, {
          anonymizeExamples: config.anonymizeExamples !== false,
          redactPII: true,
        });

    // Calculate redaction count for privacy metadata
    const redactionCount = config.includeSensitive
      ? 0
      : patterns.reduce((count, pattern) => {
          const originalExamples = pattern.examples?.length || 0;
          const sanitizedExamples = sanitizedPatterns.find(
            p => p.pattern_text === pattern.pattern_text
          )?.examples?.length || 0;
          return count + (originalExamples - sanitizedExamples);
        }, 0);

    // Create PDF document
    const doc = new jsPDF({
      orientation: config.orientation || 'portrait',
      unit: 'px',
      format: config.pageSize || 'a4',
    });

    // Set margins
    const margins = {
      top: config.margins?.top || 40,
      bottom: config.margins?.bottom || 40,
      left: config.margins?.left || 40,
      right: config.margins?.right || 40,
    };

    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - margins.left - margins.right;

    let yPos = margins.top;

    // Generate title page
    if (config.template !== 'minimal') {
      yPos = generateTitlePage(doc, config, statistics, redactionCount, margins, contentWidth, yPos);
      doc.addPage();
      yPos = margins.top;
    }

    // Generate executive summary
    yPos = generateExecutiveSummary(doc, config, statistics, margins, contentWidth, yPos);

    // Add new page if needed
    if (yPos > pageHeight - margins.bottom - 100) {
      doc.addPage();
      yPos = margins.top;
    }

    // Generate statistics section
    yPos = generateStatisticsSection(doc, autoTable, config, statistics, margins, contentWidth, yPos);

    // Add charts if configured
    if (config.includeCharts !== false && charts.length > 0) {
      for (const chart of charts) {
        // Check if we need a new page
        if (yPos > pageHeight - margins.bottom - 300) {
          doc.addPage();
          yPos = margins.top;
        }

        yPos = await generateChartSection(doc, chart, config.chartQuality || 150, margins, contentWidth, yPos);
      }
    }

    // Generate pattern details
    const patternsPerPage = config.patternsPerPage || 20;
    for (let i = 0; i < sanitizedPatterns.length; i += patternsPerPage) {
      if (i > 0) {
        doc.addPage();
        yPos = margins.top;
      }

      const pagePatterns = sanitizedPatterns.slice(i, i + patternsPerPage);
      yPos = generatePatternDetailsSection(doc, autoTable, pagePatterns, margins, contentWidth, yPos, i + 1);
    }

    // Generate recommendations section
    if (config.includeRecommendations !== false) {
      if (yPos > pageHeight - margins.bottom - 200) {
        doc.addPage();
        yPos = margins.top;
      }
      yPos = generateRecommendationsSection(doc, sanitizedPatterns, margins, contentWidth, yPos);
    }

    // Add page numbers
    if (config.includePageNumbers !== false) {
      addPageNumbers(doc, margins);
    }

    // Generate output path
    const outputPath = config.outputPath || generateOutputPath('pdf');

    // Save PDF (handle both Node.js and browser environments)
    if (typeof window === 'undefined') {
      // Node.js environment: use fs
      const fs = await import('fs/promises');
      const path = await import('path');

      // Ensure directory exists
      const dir = path.dirname(outputPath);
      await fs.mkdir(dir, { recursive: true });

      // Get PDF as buffer and write to file
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
      await fs.writeFile(outputPath, pdfBuffer);
    } else {
      // Browser environment: use jsPDF's save method
      doc.save(outputPath);
    }

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // Get file size (approximate, in browser this would require async)
    const fileSize = 0; // Would need fs.stat in Node.js

    // Create metadata
    const metadata: ReportMetadata = {
      title: config.title || 'Pattern Analysis Report',
      generatedAt: new Date().toISOString(),
      dateRange: config.dateRange,
      totalPatterns: sanitizedPatterns.length,
      format: ReportFormat.PDF,
      template: config.template || ReportTemplate.STANDARD,
      dataSource: 'state.json',
      privacy: {
        sanitized: !config.includeSensitive,
        redactionCount,
        notice: generatePrivacyNotice(!config.includeSensitive, redactionCount),
      },
      statistics: {
        generationTime,
        fileSize,
        chartCount: charts.length,
      },
    };

    return {
      success: true,
      filePath: outputPath,
      metadata,
      generationTime,
    };
  } catch (error) {
    const endTime = Date.now();
    return {
      success: false,
      error: createVisualizationError(
        `PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          'Check that jsPDF and jspdf-autotable are installed',
          'Verify pattern data is valid',
          'Check file system permissions',
          'Try reducing the number of patterns or charts',
        ],
        undefined,
        error instanceof Error ? error.stack : undefined
      ),
      generationTime: endTime - startTime,
    };
  }
}

// ============================================================================
// PDF SECTION GENERATORS
// ============================================================================

/**
 * Generate title page
 */
function generateTitlePage(
  doc: any,
  config: PDFConfig,
  statistics: ReportStatistics,
  redactionCount: number,
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number
): number {
  // jsPDF already imported at module level

  // Title
  doc.setFontSize(24);
  doc.setTextColor(40, 40, 40);
  doc.text(config.title || 'Pattern Analysis Report', margins.left, yPos);
  yPos += 40;

  // Metadata
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);

  const metadata = [
    [`Generated: ${new Date().toLocaleDateString()}`, `Total Patterns: ${statistics.totalPatterns}`],
    [`Date Range: ${formatDate(statistics.dateRange.firstSeen)} - ${formatDate(statistics.dateRange.lastSeen)}`, `Total Frequency: ${statistics.totalFrequency.toLocaleString()}`],
    [`Template: ${config.template || 'standard'}`, `Avg Frequency: ${statistics.averageFrequency.toFixed(1)}`],
  ];

  for (const [left, right] of metadata) {
    doc.text(left, margins.left, yPos);
    doc.text(right, margins.left + contentWidth / 2, yPos);
    yPos += 20;
  }

  yPos += 20;

  // Privacy notice
  if (redactionCount > 0 || !config.includeSensitive) {
    doc.setFontSize(10);
    doc.setTextColor(150, 50, 50);
    const notice = redactionCount > 0
      ? `This report contains ${redactionCount} redaction(s) for privacy protection.`
      : 'This report contains full, unsanitized content.';
    const lines = doc.splitTextToSize(notice, contentWidth);
    doc.text(lines, margins.left, yPos);
    yPos += lines.length * 14 + 20;
  }

  return yPos;
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(
  doc: any,
  config: PDFConfig,
  statistics: ReportStatistics,
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number
): number {
  // jsPDF already imported at module level

  // Section header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Executive Summary', margins.left, yPos);
  yPos += 30;

  // Summary text
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);

  const summary = [
    `This report analyzes ${statistics.totalPatterns} unique conversation patterns detected across ${statistics.totalFrequency} total occurrences. `,
    `The patterns span ${Object.keys(statistics.byCategory).length} categories, with an average frequency of ${statistics.averageFrequency.toFixed(1)} occurrences per pattern.`,
    `Analysis covers the period from ${formatDate(statistics.dateRange.firstSeen)} to ${formatDate(statistics.dateRange.lastSeen)}.`,
  ];

  for (const text of summary) {
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margins.left, yPos);
    yPos += lines.length * 14 + 10;
  }

  // Key insights
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Key Insights:', margins.left, yPos);
  yPos += 20;

  doc.setFontSize(10);
  const insights = [
    `• ${statistics.improvementMetrics.newPatterns} new patterns emerged during this period`,
    `• ${statistics.improvementMetrics.highConfidencePatterns} patterns have high confidence (> 80%)`,
    `• Top pattern: "${statistics.topPatterns[0]?.pattern || 'N/A'}" with ${statistics.topPatterns[0]?.frequency || 0} occurrences`,
  ];

  for (const insight of insights) {
    doc.text(insight, margins.left + 10, yPos);
    yPos += 16;
  }

  return yPos;
}

/**
 * Generate statistics section
 */
function generateStatisticsSection(
  doc: any,
  autoTable: any,
  config: PDFConfig,
  statistics: ReportStatistics,
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number
): number {
  // autoTable passed as parameter

  // Section header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Statistics Overview', margins.left, yPos);
  yPos += 30;

  // Category distribution table
  const categoryData = Object.entries(statistics.byCategory).map(([category, count]) => [
    category,
    count.toString(),
    `${calculatePercentage(count, statistics.totalPatterns)}%`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['Category', 'Count', 'Percentage']],
    body: categoryData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 8,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    margin: { left: margins.left, right: margins.right },
  });

  // Get the final Y position after the table
  yPos = (doc as any).lastAutoTable.finalY + 30;

  return yPos;
}

/**
 * Generate chart section with actual chart image embedding
 */
async function generateChartSection(
  doc: any,
  chart: ChartData,
  quality: number,
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number
): Promise<number> {
  // Section header
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(chart.title, margins.left, yPos);
  yPos += 20;

  // Try to get chart image if available (from chart canvas)
  // This requires the chart to have been rendered with a canvas element
  if (chart.metadata?.imageDataUrl) {
    try {
      // Add chart image to PDF
      const imgWidth = contentWidth;
      const imgHeight = 300; // Fixed height for charts

      doc.addImage(chart.metadata.imageDataUrl, 'PNG', margins.left, yPos, imgWidth, imgHeight);
      yPos += imgHeight + 20;
    } catch (error) {
      // If image embedding fails, show error placeholder
      yPos = generateChartPlaceholder(doc, chart, margins, contentWidth, yPos, 'Chart image embedding failed');
    }
  } else {
    // No chart image available, show data placeholder
    yPos = generateChartPlaceholder(doc, chart, margins, contentWidth, yPos, 'Chart image not available');
  }

  return yPos;
}

/**
 * Generate chart placeholder when chart image is not available
 */
function generateChartPlaceholder(
  doc: any,
  chart: ChartData,
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number,
  message: string
): number {
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(`[${message}]`, margins.left, yPos);
  yPos += 14;
  doc.text(`Chart type: ${chart.chartType}`, margins.left, yPos);
  yPos += 14;
  doc.text(`Data points: ${chart.xAxis.data.length}`, margins.left, yPos);
  yPos += 14;
  doc.text('Note: Generate reports from dashboard with rendered charts for full visualization', margins.left, yPos);
  yPos += 30;

  return yPos;
}

/**
 * Generate pattern details section
 */
function generatePatternDetailsSection(
  doc: any,
  autoTable: any,
  patterns: (Pattern | MergedPattern)[],
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number,
  startIndex: number
): number {
  // autoTable passed as parameter

  // Section header
  doc.setFontSize(16);
  doc.setTextColor(40, 40, 40);
  doc.text(`Pattern Details (${startIndex}-${startIndex + patterns.length - 1})`, margins.left, yPos);
  yPos += 30;

  // Patterns table
  const tableData = patterns.map((pattern, index) => [
    (startIndex + index).toString(),
    truncateText(pattern.pattern_text, 50),
    getPatternCategory(pattern),
    getPatternFrequency(pattern).toString(),
    `${(getPatternConfidence(pattern) * 100).toFixed(0)}%`,
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [['#', 'Pattern', 'Category', 'Frequency', 'Confidence']],
    body: tableData,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 6,
    },
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 'auto' },
      3: { cellWidth: 30 },
      4: { cellWidth: 30 },
    },
    margin: { left: margins.left, right: margins.right },
  });

  yPos = (doc as any).lastAutoTable.finalY + 20;

  // Add pattern examples for detailed template
  if (patterns.length <= 5) { // Only show examples for small batches
    for (const pattern of patterns) {
      if (pattern.examples && pattern.examples.length > 0) {
        yPos += 10;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.text(`Examples for "${truncateText(pattern.pattern_text, 40)}":`, margins.left, yPos);
        yPos += 14;

        for (const example of pattern.examples.slice(0, 2)) {
          doc.setFontSize(9);
          doc.setTextColor(100, 100, 100);
          const lines = doc.splitTextToSize(`• ${example.original_suggestion}`, contentWidth - 20);
          doc.text(lines, margins.left + 10, yPos);
          yPos += lines.length * 12 + 8;
        }
      }
    }
  }

  return yPos;
}

/**
 * Generate recommendations section
 */
function generateRecommendationsSection(
  doc: any,
  patterns: (Pattern | MergedPattern)[],
  margins: { top: number; bottom: number; left: number; right: number },
  contentWidth: number,
  yPos: number
): number {
  // Section header
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('Recommendations', margins.left, yPos);
  yPos += 30;

  // Get unique suggested rules
  const uniqueRules = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.suggested_rule) {
      uniqueRules.add(pattern.suggested_rule);
    }
  }

  // Display recommendations
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);

  const rules = Array.from(uniqueRules).slice(0, 10); // Limit to 10
  for (const rule of rules) {
    const lines = doc.splitTextToSize(`• ${rule}`, contentWidth - 20);
    doc.text(lines, margins.left + 10, yPos);
    yPos += lines.length * 14 + 10;
  }

  return yPos;
}

/**
 * Add page numbers to all pages
 */
function addPageNumbers(doc: any, margins: { top: number; bottom: number; left: number; right: number }): void {
  const pages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();

  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pages}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - margins.bottom / 2,
      { align: 'center' }
    );
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate PDF configuration
 */
function validatePDFConfig(config: PDFConfig): void {
  if (!config.format || config.format !== 'pdf') {
    throw createVisualizationError(
      'Invalid PDF configuration',
      ['Ensure format is set to "pdf"', 'Check ReportConfig type'],
      undefined
    );
  }
}

/**
 * Generate output file path
 */
function generateOutputPath(format: 'pdf' | 'html'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uuid = crypto.randomUUID?.() || Math.random().toString(36).substring(7);
  return `reports/report-${timestamp}-${uuid}.${format}`;
}

/**
 * Convert Chart.js chart to image for PDF embedding
 *
 * @param chartCanvas - HTML canvas element with Chart.js chart
 * @param quality - Image quality in DPI (default: 150)
 * @returns Data URL of chart image
 */
export async function chartToImage(
  chartCanvas: HTMLCanvasElement,
  quality: number = 150
): Promise<string> {
  // Scale canvas for higher resolution
  const scale = quality / 96; // 96 DPI is standard

  // Create temporary canvas for scaling
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = chartCanvas.width * scale;
  tempCanvas.height = chartCanvas.height * scale;

  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    throw createVisualizationError(
      'Failed to create canvas context for chart image conversion',
      [
        'Check that canvas element is valid',
        'Ensure browser supports Canvas API',
        'Try lowering the chart quality setting',
      ],
      undefined
    );
  }

  // Scale and draw original canvas
  ctx.scale(scale, scale);
  ctx.drawImage(chartCanvas, 0, 0);

  // Convert to data URL
  return tempCanvas.toDataURL('image/png', 1.0);
}
