#!/usr/bin/env tsx
/**
 * YOLO Report Generator - REAL PDF/HTML Generation
 *
 * This script generates ACTUAL PDF and HTML reports using real data.
 * No mocks, no placeholders - REAL files you can open and view.
 *
 * Usage:
 *   npx tsx scripts/generate-reports-yolo.ts           # Generate both PDF and HTML
 *   npx tsx scripts/generate-reports-yolo.ts --pdf      # PDF only
 *   npx tsx scripts/generate-reports-yolo.ts --html     # HTML only
 *   npx tsx scripts/generate-reports-yolo.ts --large    # Use 1000 patterns (stress test)
 *
 * YOLO PRINCIPLE: If it doesn't generate a real file in 30 seconds, FIX IT!
 */

import { generateReport } from '../src/visualization/report-generator.js';
import { ReportFormat, ReportTemplate } from '../src/visualization/types.js';

// ============================================================================
// YOLO TEST DATA GENERATION
// ============================================================================

/**
 * Create real test patterns (not mocks!)
 */
function createRealPatterns(count: number = 50) {
  const categories = [
    'API Usage',
    'Documentation',
    'Error Reporting',
    'Billing',
    'Feature Requests',
    'Deployment',
    'Data Management',
    'Performance',
    'Security',
    'UI/UX',
  ];

  const patterns = [];

  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const frequency = Math.floor(Math.random() * 50) + 1;

    patterns.push({
      pattern_id: `pattern-${i}`,
      pattern_text: `User asks about ${category.toLowerCase()} - Pattern ${i}`,
      count: frequency,
      total_frequency: frequency,
      category: category,
      confidence: 0.5 + Math.random() * 0.5,
      frequency: frequency, // For HTML generator compatibility
      suggested_rule: `Improve ${category.toLowerCase()} documentation and examples`,
      examples: i % 10 === 0 ? [{
        original_suggestion: `Example message for ${category} pattern ${i}`,
        user_correction: 'This is the user correction',
        context: 'Context for the example',
        timestamp: new Date(2026, 2, Math.floor(Math.random() * 19) + 1).toISOString(),
        content_type: 'text',
      }] : [],
      first_seen: new Date(2026, 2, Math.floor(Math.random() * 19) + 1).toISOString(),
      last_seen: new Date(2026, 2, 19).toISOString(),
      content_types: ['text'],
      session_count: 1,
      is_new: Math.random() > 0.7,
      frequency_change: Math.floor(Math.random() * 10) - 5,
    });
  }

  return patterns;
}

/**
 * Create real chart data (not mocks!)
 */
function createRealCharts() {
  return [
    {
      chartType: 'bar',
      title: 'Top 10 Patterns by Frequency',
      xAxis: {
        label: 'Pattern',
        data: ['API Auth', 'Code Examples', 'Error Messages', 'Pricing', 'Features', 'Deployment', 'Data Export', 'Integrations', 'Performance', 'Security'],
      },
      yAxis: {
        label: 'Frequency',
        data: [25, 20, 18, 15, 12, 10, 8, 7, 5, 3],
      },
      datasets: [{
        label: 'Pattern Frequency',
        data: [25, 20, 18, 15, 12, 10, 8, 7, 5, 3],
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
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Top 10 Patterns by Frequency' },
        },
        scales: {
          x: { display: true, title: { display: true, text: 'Pattern' } },
          y: { display: true, beginAtZero: true, title: { display: true, text: 'Frequency' } },
        },
      },
    },
    {
      chartType: 'line',
      title: 'Pattern Detection Over Time',
      xAxis: {
        label: 'Date',
        data: ['2026-03-01', '2026-03-05', '2026-03-10', '2026-03-15', '2026-03-19'],
      },
      yAxis: {
        label: 'Cumulative Patterns',
        data: [10, 35, 68, 92, 123],
      },
      datasets: [{
        label: 'Cumulative Pattern Count',
        data: [10, 35, 68, 92, 123],
        backgroundColor: 'rgba(66, 133, 244, 0.2)',
        borderColor: 'rgba(66, 133, 244, 1)',
        borderWidth: 2,
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'top' },
          title: { display: true, text: 'Pattern Detection Over Time' },
        },
        scales: {
          x: { display: true, title: { display: true, text: 'Date' } },
          y: { display: true, beginAtZero: true, title: { display: true, text: 'Cumulative Patterns' } },
        },
      },
    },
    {
      chartType: 'pie',
      title: 'Pattern Distribution by Category',
      xAxis: {
        label: 'Category',
        data: ['API Usage', 'Documentation', 'Error Reporting', 'Billing', 'Other'],
      },
      yAxis: {
        label: 'Count',
        data: [35, 25, 20, 12, 31],
      },
      datasets: [{
        label: 'Patterns',
        data: [35, 25, 20, 12, 31],
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
      }],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right' },
          title: { display: true, text: 'Pattern Distribution by Category' },
        },
      },
    },
  ];
}

// ============================================================================
// YOLO REPORT GENERATION
// ============================================================================

/**
 * Generate a REAL report with actual file output
 */
async function generateRealReport(
  format: 'pdf' | 'html',
  patternCount: number,
  template: ReportTemplate = ReportTemplate.STANDARD
) {
  const startTime = Date.now();

  console.log('\n========================================');
  console.log(`🚀 YOLO: Generating ${format.toUpperCase()} Report`);
  console.log('========================================');
  console.log(`Patterns: ${patternCount}`);
  console.log(`Template: ${template}`);
  console.log('');

  // Create real data
  console.log('⏳ Creating test data...');
  const patterns = createRealPatterns(patternCount);
  const charts = createRealCharts();
  console.log(`✓ Created ${patterns.length} patterns`);
  console.log(`✓ Created ${charts.length} charts`);

  // Configure report
  const config = {
    format: format === 'pdf' ? ReportFormat.PDF : ReportFormat.HTML,
    template,
    title: `YOLO Test Report - ${new Date().toLocaleDateString()}`,
    includeCharts: true,
    includeRecommendations: true,
    includeSearch: true,
    includeTableOfContents: true,
    anonymizeExamples: false, // No sensitive data in test
  };

  console.log('');
  console.log('⏳ Generating report...');
  console.log('   (This will create a REAL file you can open)');

  try {
    // Generate the report
    const result = await generateReport(patterns, charts, config);

    const elapsed = Date.now() - startTime;

    if (result.success) {
      console.log('');
      console.log('========================================');
      console.log('✅ SUCCESS! Report generated!');
      console.log('========================================');
      console.log(`📄 File: ${result.filePath}`);
      console.log(`⏱️  Time: ${elapsed}ms`);
      console.log(`📊 Patterns: ${result.metadata?.totalPatterns}`);
      console.log(`📈 Charts: ${result.metadata?.statistics?.chartCount}`);

      if (result.metadata?.privacy) {
        console.log(`🔒 Privacy: ${result.metadata.privacy.sanitized ? 'Sanitized' : 'Full content'}`);
      }

      console.log('');
      console.log('🎉 YOLO SUCCESS! Open the file and verify it works!');
      console.log('');
      console.log(format === 'pdf'
        ? `   → Open: ${result.filePath} in Preview/Adobe`
        : `   → Open: ${result.filePath} in your browser`
      );
      console.log('');
      console.log('   If it looks good, you\'re DONE!');
      console.log('   If not, fix the code and run again.');
      console.log('');

      return result.filePath;
    } else {
      console.log('');
      console.log('========================================');
      console.log('❌ FAILED!');
      console.log('========================================');
      console.log(`Error: ${result.error?.what}`);
      console.log('');
      console.log('How to fix:');
      result.error?.how.forEach((tip, i) => {
        console.log(`  ${i + 1}. ${tip}`);
      });
      console.log('');

      if (result.error?.technical) {
        console.log('Technical details:');
        console.log(result.error.technical);
      }

      return null;
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.log('');
    console.log('========================================');
    console.log('💥 CRASH!');
    console.log('========================================');
    console.log(`Time to failure: ${elapsed}ms`);
    console.log('');
    console.error(error);

    return null;
  }
}

// ============================================================================
// YOLO MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const generatePDF = args.includes('--pdf') || !args.includes('--html');
  const generateHTML = args.includes('--html') || !args.includes('--pdf');
  const useLargeDataset = args.includes('--large');

  const patternCount = useLargeDataset ? 1000 : 50;
  const template = useLargeDataset ? ReportTemplate.MINIMAL : ReportTemplate.STANDARD;

  console.log('');
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║  YOLO Report Generator - SHIP IT, TEST IT, FIX IT      ║');
  console.log('╚═════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('YOLO Philosophy:');
  console.log('  1. Generate REAL output (not mocks)');
  console.log('  2. Open and VERIFY it works');
  console.log('  3. Fix if broken, iterate if good');
  console.log('  4. SHIP FAST (< 2 minutes or cut scope)');
  console.log('');

  const results: string[] = [];

  if (generatePDF) {
    const pdfPath = await generateRealReport('pdf', patternCount, template);
    if (pdfPath) results.push(pdfPath);
  }

  if (generateHTML) {
    const htmlPath = await generateRealReport('html', patternCount, template);
    if (htmlPath) results.push(htmlPath);
  }

  console.log('');
  console.log('╔═════════════════════════════════════════════════════════╗');
  console.log('║  YOLO COMPLETE!                                         ║');
  console.log('╚═════════════════════════════════════════════════════════╝');
  console.log('');

  if (results.length > 0) {
    console.log(`Generated ${results.length} report(s):`);
    results.forEach((path, i) => {
      console.log(`  ${i + 1}. ${path}`);
    });
    console.log('');
    console.log('✅ YOLO SUCCESS! Now go open those files and verify!');
  } else {
    console.log('❌ YOLO FAILED! Check the errors above and fix them.');
    process.exit(1);
  }
}

// Run it!
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
