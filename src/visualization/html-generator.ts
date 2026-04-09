/**
 * HTML Report Generator (Story 3-5, AC2)
 *
 * Generates standalone HTML reports with interactive charts, pattern analysis,
 * and actionable insights.
 *
 * YOLO Approach: Rapid development with real HTML generation, iterating based
 * on actual output quality.
 *
 * @module visualization/html-generator
 */

import { Pattern } from '../pattern-detector';
import { MergedPattern } from '../pattern-matcher';
import { ChartData, ChartType } from './types';
import {
  HTMLConfig,
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
  calculatePercentage,
} from './pattern-utils';

// ============================================================================
// HTML GENERATION
// ============================================================================

/**
 * Generate HTML report
 *
 * @param patterns - Merged pattern data
 * @param charts - Chart data for embedding
 * @param statistics - Report statistics
 * @param config - HTML configuration
 * @returns Report generation result
 */
export async function generateHTMLReport(
  patterns: (Pattern | MergedPattern)[],
  charts: ChartData[],
  statistics: ReportStatistics,
  config: HTMLConfig
): Promise<ReportResult> {
  const startTime = Date.now();

  try {
    // Validate configuration
    validateHTMLConfig(config);

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

    // Generate HTML content
    const htmlContent = generateHTMLContent(
      sanitizedPatterns,
      charts,
      statistics,
      config,
      redactionCount
    );

    // Generate output path
    const outputPath = config.outputPath || generateOutputPath('html');

    // Write HTML file (in Node.js environment, would use fs)
    // For browser, would trigger download
    await writeHTMLFile(outputPath, htmlContent);

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // Calculate file size
    const fileSize = htmlContent.length;

    // Create metadata
    const metadata: ReportMetadata = {
      title: config.title || 'Pattern Analysis Report',
      generatedAt: new Date().toISOString(),
      dateRange: config.dateRange,
      totalPatterns: sanitizedPatterns.length,
      format: ReportFormat.HTML,
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
        `HTML generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        [
          'Check that pattern data is valid',
          'Verify chart data is properly formatted',
          'Check file system permissions',
          'Try reducing the number of patterns or charts',
        ],
        undefined
      ),
      generationTime: endTime - startTime,
    };
  }
}

// ============================================================================
// HTML CONTENT GENERATION
// ============================================================================

/**
 * Generate complete HTML document
 */
function generateHTMLContent(
  patterns: (Pattern | MergedPattern)[],
  charts: ChartData[],
  statistics: ReportStatistics,
  config: HTMLConfig,
  redactionCount: number
): string {
  const theme = config.theme || 'light';
  const title = config.title || 'Pattern Analysis Report';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  ${generateHTMLHead(config, theme)}
</head>
<body class="theme-${theme}">
  <div class="container">
    ${generateHeader(title, statistics, config, redactionCount)}

    ${config.includeTableOfContents !== false ? generateTableOfContents(config) : ''}

    <main>
      ${generateExecutiveSummary(statistics, config)}
      ${generateStatisticsSection(statistics, config)}

      ${config.includeCharts !== false ? generateChartsSection(charts, config) : ''}

      ${generatePatternDetailsSection(patterns, config)}
      ${generateTopPatternsSection(patterns, config)}
      ${generateByCategorySection(statistics, patterns, config)}

      ${config.includeRecommendations !== false ? generateRecommendationsSection(patterns, config) : ''}

      ${config.template === 'detailed' ? generateExamplesSection(patterns, config) : ''}
      ${config.template === 'detailed' ? generateRawDataSection(patterns, config) : ''}
    </main>

    ${generateFooter(config, redactionCount)}
  </div>

  ${generateHTMLScripts(config, charts)}
</body>
</html>`;
}

/**
 * Generate HTML head section
 */
function generateHTMLHead(config: HTMLConfig, theme: string): string {
  const cdnURL = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
  const useCDN = config.useCDN !== false;

  return `
  <style>
    ${generateCSS(theme)}
  </style>
  ${useCDN ? `<script src="${cdnURL}"></script>` : ''}
  ${config.customCSS ? `<style>${config.customCSS}</style>` : ''}`;
}

/**
 * Generate CSS styles
 */
function generateCSS(theme: string): string {
  const colors = theme === 'dark'
    ? {
        bg: '#1a1a1a',
        text: '#e0e0e0',
        cardBg: '#2d2d2d',
        border: '#404040',
        primary: '#4a9eff',
      }
    : {
        bg: '#ffffff',
        text: '#333333',
        cardBg: '#f8f9fa',
        border: '#dee2e6',
        primary: '#4285f4',
      };

  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: ${colors.text};
      background-color: ${colors.bg};
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }

    h1, h2, h3, h4 {
      margin-bottom: 1rem;
      color: ${theme === 'dark' ? '#ffffff' : '#212529'};
    }

    h1 { font-size: 2.5rem; }
    h2 { font-size: 2rem; margin-top: 2rem; }
    h3 { font-size: 1.5rem; margin-top: 1.5rem; }
    h4 { font-size: 1.25rem; margin-top: 1.25rem; }

    .card {
      background-color: ${colors.cardBg};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .grid {
      display: grid;
      gap: 20px;
    }

    .grid-2 { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .grid-3 { grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); }
    .grid-4 { grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); }

    .stat-card {
      text-align: center;
      padding: 20px;
    }

    .stat-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: ${colors.primary};
      margin-bottom: 0.5rem;
    }

    .stat-label {
      font-size: 0.9rem;
      color: ${theme === 'dark' ? '#888' : '#666'};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid ${colors.border};
    }

    th {
      background-color: ${colors.primary};
      color: white;
      font-weight: 600;
    }

    tr:hover {
      background-color: ${theme === 'dark' ? '#3a3a3a' : '#f1f3f5'};
    }

    .chart-container {
      position: relative;
      height: 400px;
      margin: 20px 0;
    }

    .section {
      margin-bottom: 40px;
    }

    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85rem;
      font-weight: 500;
      margin-right: 8px;
      margin-bottom: 8px;
    }

    .badge-category { background-color: #e3f2fd; color: #1976d2; }
    .badge-frequency { background-color: #f3e5f5; color: #7b1fa2; }
    .badge-confidence { background-color: #e8f5e9; color: #388e3c; }

    .search-box {
      width: 100%;
      padding: 12px;
      border: 2px solid ${colors.border};
      border-radius: 8px;
      font-size: 1rem;
      margin-bottom: 20px;
      background-color: ${colors.cardBg};
      color: ${colors.text};
    }

    .collapsible-header {
      cursor: pointer;
      user-select: none;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px;
      background-color: ${colors.cardBg};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      margin-bottom: 10px;
    }

    .collapsible-header:hover {
      background-color: ${theme === 'dark' ? '#3a3a3a' : '#e9ecef'};
    }

    .collapsible-content {
      display: none;
      padding: 15px;
      border-left: 3px solid ${colors.primary};
      margin-left: 10px;
    }

    .collapsible-content.active {
      display: block;
    }

    .privacy-notice {
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      color: #856404;
    }

    .privacy-notice.info {
      background-color: #d1ecf1;
      border-color: #17a2b8;
      color: #0c5460;
    }

    footer {
      margin-top: 60px;
      padding-top: 20px;
      border-top: 1px solid ${colors.border};
      text-align: center;
      color: ${theme === 'dark' ? '#888' : '#666'};
      font-size: 0.9rem;
    }

    .toc {
      background-color: ${colors.cardBg};
      border: 1px solid ${colors.border};
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    }

    .toc ul {
      list-style: none;
    }

    .toc li {
      padding: 8px 0;
    }

    .toc a {
      color: ${colors.primary};
      text-decoration: none;
    }

    .toc a:hover {
      text-decoration: underline;
    }

    /* Print styles */
    @media print {
      .search-box, .no-print {
        display: none;
      }

      .collapsible-content {
        display: block !important;
      }

      .section {
        page-break-inside: avoid;
      }

      .chart-container {
        page-break-inside: avoid;
        height: 300px;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .container {
        padding: 10px;
      }

      h1 { font-size: 2rem; }
      h2 { font-size: 1.5rem; }

      .grid-2, .grid-3, .grid-4 {
        grid-template-columns: 1fr;
      }
    }
  `;
}

/**
 * Generate header section
 */
function generateHeader(
  title: string,
  statistics: ReportStatistics,
  config: HTMLConfig,
  redactionCount: number
): string {
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
  <header class="card">
    <h1>${escapeHTML(title)}</h1>
    <div class="grid grid-4" style="margin-top: 20px;">
      <div class="stat-card">
        <div class="stat-value">${statistics.totalPatterns}</div>
        <div class="stat-label">Total Patterns</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.totalFrequency.toLocaleString()}</div>
        <div class="stat-label">Total Frequency</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${statistics.averageFrequency.toFixed(1)}</div>
        <div class="stat-label">Avg Frequency</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${Object.keys(statistics.byCategory).length}</div>
        <div class="stat-label">Categories</div>
      </div>
    </div>
    <div style="margin-top: 20px; font-size: 0.9rem; color: #666;">
      <strong>Generated:</strong> ${generatedDate} |
      <strong>Date Range:</strong> ${formatDate(statistics.dateRange.firstSeen)} - ${formatDate(statistics.dateRange.lastSeen)} |
      <strong>Template:</strong> ${config.template || 'standard'}
    </div>
    ${redactionCount > 0 || !config.includeSensitive ? `
    <div class="privacy-notice ${redactionCount === 0 ? 'info' : ''}" style="margin-top: 15px;">
      <strong>Privacy Notice:</strong> ${redactionCount > 0
        ? `This report contains ${redactionCount} redaction(s) for privacy protection.`
        : 'This report contains full, unsanitized content. Handle with care.'}
    </div>
    ` : ''}
  </header>`;
}

/**
 * Generate table of contents
 */
function generateTableOfContents(config: HTMLConfig): string {
  return `
  <nav class="toc">
    <h3>Table of Contents</h3>
    <ul>
      <li><a href="#executive-summary">Executive Summary</a></li>
      <li><a href="#statistics">Statistics Overview</a></li>
      ${config.includeCharts !== false ? '<li><a href="#charts">Charts</a></li>' : ''}
      <li><a href="#pattern-details">Pattern Details</a></li>
      <li><a href="#top-patterns">Top Patterns</a></li>
      <li><a href="#by-category">Patterns by Category</a></li>
      ${config.includeRecommendations !== false ? '<li><a href="#recommendations">Recommendations</a></li>' : ''}
      ${config.template === 'detailed' ? '<li><a href="#examples">Pattern Examples</a></li>' : ''}
      ${config.template === 'detailed' ? '<li><a href="#raw-data">Raw Data</a></li>' : ''}
    </ul>
  </nav>`;
}

/**
 * Generate executive summary section
 */
function generateExecutiveSummary(statistics: ReportStatistics, config: HTMLConfig): string {
  return `
  <section id="executive-summary" class="section">
    <h2>Executive Summary</h2>
    <div class="card">
      <p>This report analyzes <strong>${statistics.totalPatterns}</strong> unique conversation patterns detected across <strong>${statistics.totalFrequency.toLocaleString()}</strong> total occurrences. The patterns span <strong>${Object.keys(statistics.byCategory).length}</strong> categories, with an average frequency of <strong>${statistics.averageFrequency.toFixed(1)}</strong> occurrences per pattern.</p>
      <p style="margin-top: 15px;">Analysis covers the period from <strong>${formatDate(statistics.dateRange.firstSeen)}</strong> to <strong>${formatDate(statistics.dateRange.lastSeen)}</strong>.</p>

      <h3 style="margin-top: 25px;">Key Insights</h3>
      <ul style="margin-left: 20px; margin-top: 10px;">
        <li>${statistics.improvementMetrics.newPatterns} new patterns emerged during this period</li>
        <li>${statistics.improvementMetrics.highConfidencePatterns} patterns have high confidence (> 80%)</li>
        <li>Top pattern: "<strong>${escapeHTML(statistics.topPatterns[0]?.pattern || 'N/A')}</strong>" with ${statistics.topPatterns[0]?.frequency || 0} occurrences</li>
      </ul>
    </div>
  </section>`;
}

/**
 * Generate statistics section
 */
function generateStatisticsSection(statistics: ReportStatistics, config: HTMLConfig): string {
  const categoryRows = Object.entries(statistics.byCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([category, count]) => {
      const percentage = calculatePercentage(count, statistics.totalPatterns);
      return `<tr>
        <td>${escapeHTML(category)}</td>
        <td>${count}</td>
        <td>${percentage}%</td>
      </tr>`;
    })
    .join('');

  return `
  <section id="statistics" class="section">
    <h2>Statistics Overview</h2>
    <div class="card">
      <h3>Category Distribution</h3>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${categoryRows}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

/**
 * Generate charts section
 */
function generateChartsSection(charts: ChartData[], config: HTMLConfig): string {
  const chartsHTML = charts.map((chart, index) => `
    <div class="card">
      <h3>${escapeHTML(chart.title)}</h3>
      <div class="chart-container">
        <canvas id="chart-${index}"></canvas>
      </div>
    </div>
  `).join('');

  return `
  <section id="charts" class="section">
    <h2>Charts</h2>
    ${chartsHTML}
  </section>`;
}

/**
 * Generate pattern details section
 */
function generatePatternDetailsSection(patterns: (Pattern | MergedPattern)[], config: HTMLConfig): string {
  const patternsHTML = patterns.slice(0, config.maxPatterns || patterns.length).map((pattern, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(truncateText(pattern.pattern_text, 60))}</td>
      <td><span class="badge badge-category">${escapeHTML(getPatternCategory(pattern) || 'Uncategorized')}</span></td>
      <td><span class="badge badge-frequency">${getPatternFrequency(pattern)}</span></td>
      <td><span class="badge badge-confidence">${(getPatternConfidence(pattern) * 100).toFixed(0)}%</span></td>
    </tr>
  `).join('');

  return `
  <section id="pattern-details" class="section">
    <h2>Pattern Details</h2>
    ${config.includeSearch !== false ? `
    <input type="text" class="search-box" placeholder="Search patterns..." id="patternSearch">
    ` : ''}
    <div class="card">
      <div class="table-container">
        <table id="patternTable">
          <thead>
            <tr>
              <th>#</th>
              <th>Pattern</th>
              <th>Category</th>
              <th>Frequency</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            ${patternsHTML}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

/**
 * Generate top patterns section
 */
function generateTopPatternsSection(patterns: (Pattern | MergedPattern)[], config: HTMLConfig): string {
  const topPatterns = patterns
    .sort((a, b) => getPatternFrequency(b) - getPatternFrequency(a))
    .slice(0, 10);

  const patternsHTML = topPatterns.map((pattern, index) => `
    <div class="collapsible">
      <div class="collapsible-header" onclick="toggleCollapse(this)">
        <div>
          <strong>#${index + 1}</strong> ${escapeHTML(pattern.pattern_text)}
          <span class="badge badge-frequency">${getPatternFrequency(pattern)} occurrences</span>
          ${pattern.category ? `<span class="badge badge-category">${escapeHTML(pattern.category)}</span>` : ''}
        </div>
        <span>▼</span>
      </div>
      <div class="collapsible-content">
        <p><strong>Suggested Rule:</strong> ${escapeHTML(pattern.suggested_rule)}</p>
        <p><strong>Frequency:</strong> ${getPatternFrequency(pattern)}</p>
        ${pattern.first_seen ? `<p><strong>First Seen:</strong> ${formatDate(pattern.first_seen)}</p>` : ''}
        ${pattern.last_seen ? `<p><strong>Last Seen:</strong> ${formatDate(pattern.last_seen)}</p>` : ''}
      </div>
    </div>
  `).join('');

  return `
  <section id="top-patterns" class="section">
    <h2>Top 10 Patterns by Frequency</h2>
    <div class="card">
      ${patternsHTML}
    </div>
  </section>`;
}

/**
 * Generate by category section
 */
function generateByCategorySection(
  statistics: ReportStatistics,
  patterns: (Pattern | MergedPattern)[],
  config: HTMLConfig
): string {
  const categories = Object.keys(statistics.byCategory);

  const categoriesHTML = categories.map(category => {
    const categoryPatterns = patterns.filter(p => getPatternCategory(p) === category);
    const topPatterns = categoryPatterns
      .sort((a, b) => getPatternFrequency(b) - getPatternFrequency(a))
      .slice(0, 5);

    return `
      <div class="card">
        <h3>${escapeHTML(category)} (${statistics.byCategory[category]} patterns)</h3>
        <ul style="margin-left: 20px;">
          ${topPatterns.map(p => `
            <li>
              <strong>${escapeHTML(p.pattern_text)}</strong>
              <span class="badge badge-frequency">${getPatternFrequency(p)}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;
  }).join('');

  return `
  <section id="by-category" class="section">
    <h2>Patterns by Category</h2>
    <div class="grid grid-2">
      ${categoriesHTML}
    </div>
  </section>`;
}

/**
 * Generate recommendations section
 */
function generateRecommendationsSection(patterns: (Pattern | MergedPattern)[], config: HTMLConfig): string {
  const uniqueRules = new Set<string>();
  for (const pattern of patterns) {
    if (pattern.suggested_rule) {
      uniqueRules.add(pattern.suggested_rule);
    }
  }

  const rulesHTML = Array.from(uniqueRules)
    .slice(0, 10)
    .map(rule => `<li>${escapeHTML(rule)}</li>`)
    .join('');

  return `
  <section id="recommendations" class="section">
    <h2>Recommendations</h2>
    <div class="card">
      <ul style="margin-left: 20px;">
        ${rulesHTML}
      </ul>
    </div>
  </section>`;
}

/**
 * Generate examples section (detailed template)
 */
function generateExamplesSection(patterns: (Pattern | MergedPattern)[], config: HTMLConfig): string {
  const patternsWithExamples = patterns.filter(p => p.examples && p.examples.length > 0);

  const examplesHTML = patternsWithExamples.slice(0, 10).map(pattern => `
    <div class="card">
      <h4>${escapeHTML(pattern.pattern_text)}</h4>
      <p><strong>Category:</strong> ${escapeHTML(getPatternCategory(pattern) || 'Uncategorized')}</p>
      <p><strong>Frequency:</strong> ${getPatternFrequency(pattern)}</p>
      <div style="margin-top: 15px;">
        <strong>Examples:</strong>
        <ul style="margin-left: 20px; margin-top: 10px;">
          ${pattern.examples?.slice(0, 3).map(example => `
            <li>${escapeHTML(example.original_suggestion || example.context || 'N/A')}</li>
          `).join('') || '<li>No examples available</li>'}
        </ul>
      </div>
    </div>
  `).join('');

  return `
  <section id="examples" class="section">
    <h2>Pattern Examples</h2>
    <div class="grid grid-2">
      ${examplesHTML}
    </div>
  </section>`;
}

/**
 * Generate raw data section (detailed template)
 */
function generateRawDataSection(patterns: (Pattern | MergedPattern)[], config: HTMLConfig): string {
  const dataRows = patterns.slice(0, 100).map(pattern => {
    const examples = pattern.examples?.map(e => (e.original_suggestion || e.context || '').replace(/,/g, ';')).join(' | ') || '';
    return `
      <tr>
        <td>${escapeHTML(pattern.pattern_text)}</td>
        <td>${escapeHTML(getPatternCategory(pattern) || '')}</td>
        <td>${getPatternFrequency(pattern)}</td>
        <td>${getPatternConfidence(pattern).toFixed(3)}</td>
        <td>${escapeHTML(pattern.suggested_rule)}</td>
        <td>${escapeHTML(examples)}</td>
      </tr>
    `;
  }).join('');

  return `
  <section id="raw-data" class="section">
    <h2>Raw Data (First 100 Patterns)</h2>
    <div class="card">
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Pattern</th>
              <th>Category</th>
              <th>Frequency</th>
              <th>Confidence</th>
              <th>Suggested Rule</th>
              <th>Examples</th>
            </tr>
          </thead>
          <tbody>
            ${dataRows}
          </tbody>
        </table>
      </div>
    </div>
  </section>`;
}

/**
 * Generate footer section
 */
function generateFooter(config: HTMLConfig, redactionCount: number): string {
  return `
  <footer>
    <p>Generated on ${new Date().toISOString()}</p>
    <p>Pattern Analysis Report | Template: ${config.template || 'standard'}</p>
    ${redactionCount > 0 ? `<p>This report was sanitized with ${redactionCount} redaction(s)</p>` : ''}
    <p class="no-print">Press Ctrl+P (or Cmd+P) to save as PDF</p>
  </footer>`;
}

/**
 * Generate JavaScript section
 */
function generateHTMLScripts(config: HTMLConfig, charts: ChartData[]): string {
  return `
  <script>
    // Toggle collapsible sections
    function toggleCollapse(header) {
      const content = header.nextElementSibling;
      const arrow = header.querySelector('span:last-child');
      content.classList.toggle('active');
      arrow.textContent = content.classList.contains('active') ? '▲' : '▼';
    }

    // Search functionality
    const searchBox = document.getElementById('patternSearch');
    if (searchBox) {
      searchBox.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const table = document.getElementById('patternTable');
        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
      });
    }

    // Initialize charts (will be called when Chart.js loads)
    function initializeCharts(chartsData) {
      chartsData.forEach((chartData, index) => {
        const ctx = document.getElementById('chart-' + index);
        if (ctx && typeof Chart !== 'undefined') {
          new Chart(ctx, {
            type: chartData.chartType,
            data: {
              labels: chartData.xAxis.data,
              datasets: chartData.datasets.map(dataset => ({
                label: dataset.label,
                data: dataset.data,
                backgroundColor: dataset.backgroundColor || 'rgba(66, 133, 244, 0.6)',
                borderColor: dataset.borderColor || 'rgba(66, 133, 244, 1)',
                borderWidth: dataset.borderWidth || 1,
              }))
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: chartData.options?.plugins?.legend?.display !== false,
                  position: chartData.options?.plugins?.legend?.position || 'top',
                },
                title: {
                  display: true,
                  text: chartData.title,
                  font: { size: 16 }
                }
              },
              scales: chartData.chartType !== 'pie' && chartData.chartType !== 'doughnut' ? {
                y: {
                  beginAtZero: chartData.options?.scales?.y?.beginAtZero !== false,
                  display: chartData.options?.scales?.y?.display !== false,
                }
              } : {}
            }
          });
        }
      });
    }

    // Store chart data for initialization
    window.chartsData = ${JSON.stringify(charts.map((chart: ChartData) => ({
      chartType: chart.chartType,
      title: chart.title,
      xAxis: chart.xAxis,
      datasets: chart.datasets,
      options: chart.options
    })))};

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => initializeCharts(window.chartsData));
    } else {
      initializeCharts(window.chartsData);
    }
  </script>
  ${config.customJS ? `<script>${config.customJS}</script>` : ''}`;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate HTML configuration
 */
function validateHTMLConfig(config: HTMLConfig): void {
  if (!config.format || config.format !== 'html') {
    throw createVisualizationError(
      'Invalid HTML configuration',
      ['Ensure format is set to "html"', 'Check ReportConfig type'],
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
 * Write HTML file (works in Node.js ES modules)
 */
async function writeHTMLFile(filePath: string, content: string): Promise<void> {
  // Use dynamic import for Node.js environment
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, content, 'utf8');
  } catch (error) {
    // If import fails, try browser environment
    if (typeof window !== 'undefined') {
      const blob = new Blob([content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || 'report.html';
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      throw error;
    }
  }
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Escape HTML to prevent XSS (works in Node.js and browser)
 */
function escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, char => map[char]);
}
