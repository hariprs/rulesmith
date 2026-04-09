/**
 * Report Templates Module (Story 3-5, AC4)
 *
 * Defines report template configurations for minimal, standard, and detailed reports.
 * Provides template validation and section configuration.
 *
 * @module visualization/report-templates
 */

import {
  ReportTemplate,
  ReportSectionType,
  ReportSectionConfig,
  ReportConfig,
  PDFConfig,
  HTMLConfig,
  ReportFormat,
} from './types';

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

/**
 * Template configuration for each report type
 */
interface TemplateDefinition {
  /** Template name */
  name: ReportTemplate;
  /** Display name */
  displayName: string;
  /** Description */
  description: string;
  /** Included sections */
  sections: ReportSectionConfig[];
  /** Default max patterns */
  maxPatterns?: number;
  /** Whether to include examples by default */
  includeExamples?: boolean;
  /** Whether to include charts by default */
  includeCharts?: boolean;
  /** Whether to include recommendations by default */
  includeRecommendations?: boolean;
}

/**
 * Minimal template: executive summary + top 5 patterns + key charts
 */
export const MINIMAL_TEMPLATE: TemplateDefinition = {
  name: ReportTemplate.MINIMAL,
  displayName: 'Minimal',
  description: 'Executive summary with top 5 patterns and key charts',
  sections: [
    {
      id: ReportSectionType.TITLE_PAGE,
      title: 'Title Page',
      include: true,
      order: 1,
    },
    {
      id: ReportSectionType.EXECUTIVE_SUMMARY,
      title: 'Executive Summary',
      include: true,
      order: 2,
    },
    {
      id: ReportSectionType.STATISTICS,
      title: 'Statistics Overview',
      include: true,
      order: 3,
    },
    {
      id: ReportSectionType.CHARTS,
      title: 'Charts',
      include: true,
      order: 4,
    },
    {
      id: ReportSectionType.TOP_PATTERNS,
      title: 'Top Patterns',
      include: true,
      order: 5,
    },
  ],
  maxPatterns: 5,
  includeExamples: false,
  includeCharts: true,
  includeRecommendations: false,
};

/**
 * Standard template: full analysis + all charts + recommendations
 */
export const STANDARD_TEMPLATE: TemplateDefinition = {
  name: ReportTemplate.STANDARD,
  displayName: 'Standard',
  description: 'Full analysis with all charts, pattern details, and recommendations',
  sections: [
    {
      id: ReportSectionType.TITLE_PAGE,
      title: 'Title Page',
      include: true,
      order: 1,
    },
    {
      id: ReportSectionType.EXECUTIVE_SUMMARY,
      title: 'Executive Summary',
      include: true,
      order: 2,
    },
    {
      id: ReportSectionType.STATISTICS,
      title: 'Statistics Overview',
      include: true,
      order: 3,
    },
    {
      id: ReportSectionType.CHARTS,
      title: 'Charts',
      include: true,
      order: 4,
    },
    {
      id: ReportSectionType.PATTERN_DETAILS,
      title: 'Pattern Details',
      include: true,
      order: 5,
    },
    {
      id: ReportSectionType.TOP_PATTERNS,
      title: 'Top Patterns',
      include: true,
      order: 6,
    },
    {
      id: ReportSectionType.BY_CATEGORY,
      title: 'Patterns by Category',
      include: true,
      order: 7,
    },
    {
      id: ReportSectionType.RECOMMENDATIONS,
      title: 'Recommendations',
      include: true,
      order: 8,
    },
  ],
  maxPatterns: 0, // All patterns
  includeExamples: false,
  includeCharts: true,
  includeRecommendations: true,
};

/**
 * Detailed template: includes examples, trends, raw data tables
 */
export const DETAILED_TEMPLATE: TemplateDefinition = {
  name: ReportTemplate.DETAILED,
  displayName: 'Detailed',
  description: 'Comprehensive analysis with examples, trends, and raw data',
  sections: [
    {
      id: ReportSectionType.TITLE_PAGE,
      title: 'Title Page',
      include: true,
      order: 1,
    },
    {
      id: ReportSectionType.EXECUTIVE_SUMMARY,
      title: 'Executive Summary',
      include: true,
      order: 2,
    },
    {
      id: ReportSectionType.STATISTICS,
      title: 'Statistics Overview',
      include: true,
      order: 3,
    },
    {
      id: ReportSectionType.CHARTS,
      title: 'Charts',
      include: true,
      order: 4,
    },
    {
      id: ReportSectionType.PATTERN_DETAILS,
      title: 'Pattern Details',
      include: true,
      order: 5,
    },
    {
      id: ReportSectionType.TOP_PATTERNS,
      title: 'Top Patterns',
      include: true,
      order: 6,
    },
    {
      id: ReportSectionType.BY_CATEGORY,
      title: 'Patterns by Category',
      include: true,
      order: 7,
    },
    {
      id: ReportSectionType.TEMPORAL_ANALYSIS,
      title: 'Temporal Analysis',
      include: true,
      order: 8,
    },
    {
      id: ReportSectionType.RECOMMENDATIONS,
      title: 'Recommendations',
      include: true,
      order: 9,
    },
    {
      id: ReportSectionType.EXAMPLES,
      title: 'Pattern Examples',
      include: true,
      order: 10,
    },
    {
      id: ReportSectionType.RAW_DATA,
      title: 'Raw Data',
      include: true,
      order: 11,
    },
  ],
  maxPatterns: 0, // All patterns
  includeExamples: true,
  includeCharts: true,
  includeRecommendations: true,
};

/**
 * All available templates
 */
export const TEMPLATES: Record<ReportTemplate, TemplateDefinition> = {
  [ReportTemplate.MINIMAL]: MINIMAL_TEMPLATE,
  [ReportTemplate.STANDARD]: STANDARD_TEMPLATE,
  [ReportTemplate.DETAILED]: DETAILED_TEMPLATE,
};

// ============================================================================
// TEMPLATE CONFIGURATION FUNCTIONS
// ============================================================================

/**
 * Get template definition by name
 *
 * @param template - Template name
 * @returns Template definition
 * @throws Error if template not found
 */
export function getTemplate(template: ReportTemplate): TemplateDefinition {
  const templateDef = TEMPLATES[template];
  if (!templateDef) {
    throw new Error(`Template "${template}" not found`);
  }
  return templateDef;
}

/**
 * Get default template (standard)
 *
 * @returns Default template definition
 */
export function getDefaultTemplate(): TemplateDefinition {
  return STANDARD_TEMPLATE;
}

/**
 * List all available templates
 *
 * @returns Array of template definitions
 */
export function listTemplates(): TemplateDefinition[] {
  return Object.values(TEMPLATES);
}

/**
 * Apply template to configuration
 *
 * @param config - Base configuration
 * @param template - Template to apply
 * @returns Configuration with template applied
 */
export function applyTemplate(
  config: ReportConfig,
  template: ReportTemplate
): ReportConfig {
  const templateDef = getTemplate(template);

  return {
    ...config,
    template,
    maxPatterns: config.maxPatterns ?? templateDef.maxPatterns,
    includeCharts: config.includeCharts ?? templateDef.includeCharts,
    includeRecommendations: config.includeRecommendations ?? templateDef.includeRecommendations,
    sections: config.sections || templateDef.sections,
  };
}

/**
 * Create PDF config from template
 *
 * @param template - Template to use
 * @param overrides - Configuration overrides
 * @returns PDF configuration
 */
export function createPDFConfig(
  template: ReportTemplate = ReportTemplate.STANDARD,
  overrides: Partial<PDFConfig> = {}
): PDFConfig {
  const templateDef = getTemplate(template);

  return {
    format: ReportFormat.PDF,
    template,
    pageSize: 'a4',
    orientation: 'portrait',
    margins: { top: 40, bottom: 40, left: 40, right: 40 },
    font: { family: 'helvetica', size: 12 },
    includePageNumbers: true,
    patternsPerPage: 20,
    chartQuality: 150,
    maxPatterns: templateDef.maxPatterns,
    includeCharts: templateDef.includeCharts,
    includeRecommendations: templateDef.includeRecommendations,
    ...overrides,
  };
}

/**
 * Create HTML config from template
 *
 * @param template - Template to use
 * @param overrides - Configuration overrides
 * @returns HTML configuration
 */
export function createHTMLConfig(
  template: ReportTemplate = ReportTemplate.STANDARD,
  overrides: Partial<HTMLConfig> = {}
): HTMLConfig {
  const templateDef = getTemplate(template);

  return {
    format: ReportFormat.HTML,
    template,
    embedCSS: true,
    embedJS: true,
    useCDN: true,
    theme: 'light',
    includePrintStyles: true,
    collapsibleSections: true,
    includeSearch: true,
    includeTableOfContents: true,
    maxPatterns: templateDef.maxPatterns,
    includeCharts: templateDef.includeCharts,
    includeRecommendations: templateDef.includeRecommendations,
    ...overrides,
  };
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Validate template configuration
 *
 * @param config - Configuration to validate
 * @returns Validation result
 */
export function validateTemplateConfig(config: ReportConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check template exists
  if (config.template && !TEMPLATES[config.template]) {
    errors.push(`Unknown template: ${config.template}`);
  }

  // Check template sections
  if (config.sections) {
    for (const section of config.sections) {
      if (!section.id) {
        errors.push('Section missing id');
      }
      if (typeof section.include !== 'boolean') {
        errors.push(`Section "${section.id}" missing include flag`);
      }
    }
  }

  // Check max patterns
  if (config.maxPatterns !== undefined && config.maxPatterns < 0) {
    errors.push('maxPatterns must be >= 0');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get sections to include based on configuration
 *
 * @param config - Report configuration
 * @returns Array of included sections
 */
export function getIncludedSections(config: ReportConfig): ReportSectionConfig[] {
  const templateDef = config.template ? getTemplate(config.template) : getDefaultTemplate();
  const sections = config.sections || templateDef.sections;

  return sections
    .filter(section => section.include)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

/**
 * Check if section should be included
 *
 * @param config - Report configuration
 * @param sectionType - Section type to check
 * @returns Whether section should be included
 */
export function shouldIncludeSection(
  config: ReportConfig,
  sectionType: ReportSectionType
): boolean {
  const includedSections = getIncludedSections(config);
  return includedSections.some(section => section.id === sectionType);
}

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

/**
 * Get template display name
 *
 * @param template - Template name
 * @returns Display name
 */
export function getTemplateDisplayName(template: ReportTemplate): string {
  return getTemplate(template).displayName;
}

/**
 * Get template description
 *
 * @param template - Template name
 * @returns Description
 */
export function getTemplateDescription(template: ReportTemplate): string {
  return getTemplate(template).description;
}

/**
 * Compare templates to see differences
 *
 * @param template1 - First template
 * @param template2 - Second template
 * @returns Differences between templates
 */
export function compareTemplates(
  template1: ReportTemplate,
  template2: ReportTemplate
): {
  sectionsOnlyInFirst: ReportSectionType[];
  sectionsOnlyInSecond: ReportSectionType[];
  commonSections: ReportSectionType[];
} {
  const def1 = getTemplate(template1);
  const def2 = getTemplate(template2);

  const sections1 = new Set(def1.sections.filter(s => s.include).map(s => s.id));
  const sections2 = new Set(def2.sections.filter(s => s.include).map(s => s.id));

  const sectionsOnlyInFirst = Array.from(sections1).filter(s => !sections2.has(s)) as ReportSectionType[];
  const sectionsOnlyInSecond = Array.from(sections2).filter(s => !sections1.has(s)) as ReportSectionType[];
  const commonSections = Array.from(sections1).filter(s => sections2.has(s)) as ReportSectionType[];

  return {
    sectionsOnlyInFirst,
    sectionsOnlyInSecond,
    commonSections,
  };
}

/**
 * Get recommended template for dataset size
 *
 * @param patternCount - Number of patterns
 * @returns Recommended template
 */
export function getRecommendedTemplate(patternCount: number): ReportTemplate {
  if (patternCount <= 10) {
    return ReportTemplate.DETAILED;
  } else if (patternCount <= 100) {
    return ReportTemplate.STANDARD;
  } else {
    return ReportTemplate.MINIMAL;
  }
}

/**
 * Estimate report complexity based on template and pattern count
 *
 * @param template - Template to use
 * @param patternCount - Number of patterns
 * @returns Complexity score (1-10)
 */
export function estimateComplexity(
  template: ReportTemplate,
  patternCount: number
): number {
  const templateDef = getTemplate(template);
  const sectionCount = templateDef.sections.filter(s => s.include).length;

  // Base complexity from template
  let complexity = sectionCount * 0.5;

  // Add complexity for pattern count
  if (patternCount > 1000) {
    complexity += 3;
  } else if (patternCount > 100) {
    complexity += 2;
  } else if (patternCount > 10) {
    complexity += 1;
  }

  // Add complexity for examples
  if (templateDef.includeExamples) {
    complexity += 2;
  }

  return Math.min(10, Math.max(1, complexity));
}
