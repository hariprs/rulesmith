/**
 * Unit Tests for Report Generator (Story 3-5)
 *
 * Tests for report generation functionality including PDF/HTML generation,
 * data sanitization, template system, and error handling.
 *
 * Test Coverage: P0 (Critical) and P1 (High Priority)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  generateReport,
  calculateStatistics,
  getQueueStatus,
  clearQueue,
} from '../../src/visualization/report-generator';
import {
  sanitizeText,
  sanitizePattern,
  sanitizePatterns,
  validateContent,
  validatePattern,
  generatePrivacyNotice,
  generatePrivacyMetadata,
} from '../../src/visualization/sanitization';
import {
  ReportFormat,
  ReportTemplate,
  ReportConfig,
  PDFConfig,
  HTMLConfig,
  ReportErrorCode,
} from '../../src/visualization/types';
import {
  getTemplate,
  getDefaultTemplate,
  applyTemplate,
  createPDFConfig,
  createHTMLConfig,
  validateTemplateConfig,
  getRecommendedTemplate,
  estimateComplexity,
} from '../../src/visualization/report-templates';
import { Pattern, PatternExample } from '../../src/pattern-detector';
import { MergedPattern } from '../../src/pattern-matcher';

// ============================================================================
// TEST FIXTURES
// ============================================================================

const createMockPattern = (overrides: Partial<MergedPattern> = {}): MergedPattern => ({
  pattern_text: 'Test pattern for unit testing',
  count: 10,
  category: 'API_USAGE' as any,
  examples: [],
  suggested_rule: 'This is a test suggested rule for the pattern',
  first_seen: '2026-03-01T00:00:00Z',
  last_seen: '2026-03-19T00:00:00Z',
  content_types: [],
  session_count: 1,
  total_frequency: 10,
  is_new: false,
  frequency_change: 0,
  ...overrides,
});

const createMockPatterns = (count: number): MergedPattern[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockPattern({
      pattern_text: `Test pattern ${i}`,
      count: Math.floor(Math.random() * 100) + 1,
      total_frequency: Math.floor(Math.random() * 100) + 1,
      category: ['API_USAGE', 'DOCUMENTATION', 'ERROR_REPORTING'][i % 3] as any,
    })
  );
};

// ============================================================================
// SANITIZATION TESTS (AC5 - Security Priority)
// ============================================================================

describe('Sanitization - Data Privacy and Security (AC5)', () => {
  describe('sanitizeText', () => {
    it('should redact email addresses', () => {
      const input = 'Contact user@example.com for support';
      const result = sanitizeText(input);

      expect(result.wasSanitized).toBe(true);
      expect(result.sanitized).toContain('[REDACTED_EMAIL]');
      expect(result.sanitized).not.toContain('user@example.com');
      expect(result.redactionCount).toBeGreaterThan(0);
    });

    it('should redact phone numbers', () => {
      const input = 'Call 555-123-4567 for assistance';
      const result = sanitizeText(input);

      expect(result.wasSanitized).toBe(true);
      expect(result.sanitized).toContain('[REDACTED_PHONE]');
      expect(result.sanitized).not.toContain('555-123-4567');
    });

    it('should redact SSN', () => {
      const input = 'SSN: 123-45-6789';
      const result = sanitizeText(input);

      expect(result.wasSanitized).toBe(true);
      expect(result.sanitized).toContain('[REDACTED_SSN]');
    });

    it('should redact API keys', () => {
      const input = 'API key: sk-1234567890abcdef';
      const result = sanitizeText(input);

      expect(result.wasSanitized).toBe(true);
      expect(result.sanitized).toContain('[REDACTED_API_KEY]');
    });

    it('should redact passwords', () => {
      const input = 'password: secret123';
      const result = sanitizeText(input);

      expect(result.wasSanitized).toBe(true);
      expect(result.sanitized).toContain('[REDACTED_PASSWORD]');
    });

    it('should not sanitize when anonymizeExamples is false', () => {
      const input = 'Email: test@example.com';
      const result = sanitizeText(input, { anonymizeExamples: false });

      expect(result.wasSanitized).toBe(false);
      expect(result.sanitized).toBe(input);
    });

    it('should handle empty strings', () => {
      const result = sanitizeText('');

      expect(result.sanitized).toBe('');
      expect(result.wasSanitized).toBe(false);
    });

    it('should apply custom sanitization rules', () => {
      const customRule = {
        name: 'custom-id',
        pattern: /\bID-\d+\b/g,
        replacement: '[REDACTED_ID]',
      };

      const input = 'User ID-12345 logged in';
      const result = sanitizeText(input, { customRules: [customRule] });

      expect(result.sanitized).toContain('[REDACTED_ID]');
      expect(result.sanitized).not.toContain('ID-12345');
    });
  });

  describe('sanitizePattern', () => {
    it('should sanitize pattern examples', () => {
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: 'Email: john@example.com asked about API key sk-test123',
            user_correction: 'Fixed',
            context: 'Context',
            timestamp: '2026-03-19T00:00:00Z',
            content_type: 'CODE' as any,
          },
        ],
      });

      const result = sanitizePattern(pattern);

      expect(result.examples?.[0].original_suggestion).toContain('[REDACTED_EMAIL]');
      expect(result.examples?.[0].original_suggestion).toContain('[REDACTED_API_KEY]');
      expect(result.examples?.[0].original_suggestion).not.toContain('john@example.com');
      expect(result.examples?.[0].original_suggestion).not.toContain('sk-test123');
    });

    it('should not sanitize when includeSensitive is true', () => {
      const pattern = createMockPattern({
        examples: [
          {
            original_suggestion: 'Email: test@example.com',
            user_correction: 'Fixed',
            context: 'Context',
            timestamp: '2026-03-19T00:00:00Z',
            content_type: 'CODE' as any,
          },
        ],
      });

      const result = sanitizePattern(pattern, { includeSensitive: true });

      expect(result.examples?.[0].original_suggestion).toContain('test@example.com');
    });

    it('should handle patterns without examples', () => {
      const pattern = createMockPattern({ examples: undefined });

      const result = sanitizePattern(pattern);

      expect(result.pattern_text).toBe(pattern.pattern_text);
    });
  });

  describe('validateContent', () => {
    it('should detect PII in content', () => {
      const content = 'My email is john@example.com';
      const result = validateContent(content);

      expect(result.containsPII).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('PII');
    });

    it('should detect credentials in content', () => {
      const content = 'API key: sk-1234567890abcdef';
      const result = validateContent(content);

      expect(result.containsCredentials).toBe(true);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('CREDENTIALS');
      expect(result.issues[0].severity).toBe('critical');
    });

    it('should mark content as unsafe with critical issues', () => {
      const content = 'password: secret123';
      const result = validateContent(content);

      expect(result.isSafe).toBe(false);
      expect(result.containsCredentials).toBe(true);
    });

    it('should mark clean content as safe', () => {
      const content = 'This is a clean message without sensitive data';
      const result = validateContent(content);

      expect(result.isSafe).toBe(true);
      expect(result.containsPII).toBe(false);
      expect(result.containsCredentials).toBe(false);
    });
  });

  describe('generatePrivacyNotice', () => {
    it('should generate notice for sanitized content', () => {
      const notice = generatePrivacyNotice(true, 5);

      expect(notice).toContain('sanitized');
      expect(notice).toContain('5');
      expect(notice).toContain('redaction');
    });

    it('should generate notice for unsanitized content', () => {
      const notice = generatePrivacyNotice(false, 0);

      expect(notice).toContain('full, unsanitized');
      expect(notice).toContain('Handle with care');
    });
  });

  describe('generatePrivacyMetadata', () => {
    it('should include all required metadata fields', () => {
      const metadata = generatePrivacyMetadata({ anonymizeExamples: true }, 3);

      expect(metadata).toHaveProperty('sanitized');
      expect(metadata).toHaveProperty('anonymizedExamples');
      expect(metadata).toHaveProperty('redactionCount');
      expect(metadata).toHaveProperty('generatedAt');
      expect(metadata).toHaveProperty('notice');
    });

    it('should report correct redaction count', () => {
      const metadata = generatePrivacyMetadata({}, 7);

      expect(metadata.redactionCount).toBe(7);
    });
  });
});

// ============================================================================
// STATISTICS CALCULATION TESTS (AC3)
// ============================================================================

describe('Statistics Calculation (AC3)', () => {
  it('should calculate statistics for empty patterns', () => {
    const stats = calculateStatistics([]);

    expect(stats.totalPatterns).toBe(0);
    expect(stats.totalFrequency).toBe(0);
    expect(stats.averageFrequency).toBe(0);
    expect(stats.topPatterns).toEqual([]);
  });

  it('should calculate basic statistics', () => {
    const patterns = createMockPatterns(10);

    const stats = calculateStatistics(patterns);

    expect(stats.totalPatterns).toBe(10);
    expect(stats.totalFrequency).toBeGreaterThan(0);
    expect(stats.averageFrequency).toBeGreaterThan(0);
  });

  it('should group patterns by category', () => {
    const patterns = [
      createMockPattern({ category: 'CATEGORY_A' as any, count: 5, total_frequency: 5 }),
      createMockPattern({ category: 'CATEGORY_A' as any, count: 3, total_frequency: 3 }),
      createMockPattern({ category: 'CATEGORY_B' as any, count: 7, total_frequency: 7 }),
    ];

    const stats = calculateStatistics(patterns);

    expect(stats.byCategory['CATEGORY_A']).toBe(2);
    expect(stats.byCategory['CATEGORY_B']).toBe(1);
  });

  it('should identify top patterns by frequency', () => {
    const patterns = [
      createMockPattern({ pattern_text: 'Pattern A', count: 100, total_frequency: 100 }),
      createMockPattern({ pattern_text: 'Pattern B', count: 50, total_frequency: 50 }),
      createMockPattern({ pattern_text: 'Pattern C', count: 25, total_frequency: 25 }),
    ];

    const stats = calculateStatistics(patterns);

    expect(stats.topPatterns[0].pattern).toBe('Pattern A');
    expect(stats.topPatterns[0].frequency).toBe(100);
    expect(stats.topPatterns[1].pattern).toBe('Pattern B');
    expect(stats.topPatterns[1].frequency).toBe(50);
  });

  it('should calculate improvement metrics', () => {
    const patterns = [
      createMockPattern({ count: 5, total_frequency: 5 }),
      createMockPattern({ count: 3, total_frequency: 3 }),
      createMockPattern({ count: 1, total_frequency: 1 }),
      createMockPattern({
        count: 2,
        total_frequency: 2,
        first_seen: new Date().toISOString(), // New pattern (today)
      }),
    ];

    const stats = calculateStatistics(patterns);

    expect(stats.improvementMetrics.repeatedPatterns).toBe(3); // count > 1
  });

  it('should generate temporal trends', () => {
    const patterns = [
      createMockPattern({ first_seen: '2026-03-01T00:00:00Z' }),
      createMockPattern({ first_seen: '2026-03-01T00:00:00Z' }),
      createMockPattern({ first_seen: '2026-03-02T00:00:00Z' }),
    ];

    const stats = calculateStatistics(patterns);

    expect(stats.temporalTrends.length).toBeGreaterThan(0);
    expect(stats.temporalTrends[0]).toHaveProperty('date');
    expect(stats.temporalTrends[0]).toHaveProperty('count');
    expect(stats.temporalTrends[0]).toHaveProperty('cumulative');
  });
});

// ============================================================================
// TEMPLATE SYSTEM TESTS (AC4)
// ============================================================================

describe('Template System (AC4)', () => {
  describe('getTemplate', () => {
    it('should return minimal template', () => {
      const template = getTemplate(ReportTemplate.MINIMAL);

      expect(template.name).toBe(ReportTemplate.MINIMAL);
      expect(template.displayName).toBe('Minimal');
      expect(template.maxPatterns).toBe(5);
    });

    it('should return standard template', () => {
      const template = getTemplate(ReportTemplate.STANDARD);

      expect(template.name).toBe(ReportTemplate.STANDARD);
      expect(template.displayName).toBe('Standard');
      expect(template.maxPatterns).toBe(0); // All patterns
    });

    it('should return detailed template', () => {
      const template = getTemplate(ReportTemplate.DETAILED);

      expect(template.name).toBe(ReportTemplate.DETAILED);
      expect(template.displayName).toBe('Detailed');
      expect(template.includeExamples).toBe(true);
    });

    it('should throw error for unknown template', () => {
      expect(() => getTemplate('unknown' as ReportTemplate)).toThrow();
    });
  });

  describe('getDefaultTemplate', () => {
    it('should return standard template as default', () => {
      const template = getDefaultTemplate();

      expect(template.name).toBe(ReportTemplate.STANDARD);
    });
  });

  describe('applyTemplate', () => {
    it('should apply template to configuration', () => {
      const config: ReportConfig = {
        format: ReportFormat.PDF,
      };

      const result = applyTemplate(config, ReportTemplate.MINIMAL);

      expect(result.template).toBe(ReportTemplate.MINIMAL);
      expect(result.maxPatterns).toBe(5);
      expect(result.includeRecommendations).toBe(false);
    });

    it('should preserve config overrides', () => {
      const config: ReportConfig = {
        format: ReportFormat.PDF,
        maxPatterns: 100,
      };

      const result = applyTemplate(config, ReportTemplate.MINIMAL);

      expect(result.maxPatterns).toBe(100); // Override preserved
    });
  });

  describe('createPDFConfig', () => {
    it('should create PDF config with defaults', () => {
      const config = createPDFConfig();

      expect(config.format).toBe(ReportFormat.PDF);
      expect(config.pageSize).toBe('a4');
      expect(config.orientation).toBe('portrait');
    });

    it('should apply template defaults', () => {
      const config = createPDFConfig(ReportTemplate.MINIMAL);

      expect(config.template).toBe(ReportTemplate.MINIMAL);
      expect(config.maxPatterns).toBe(5);
    });

    it('should apply overrides', () => {
      const config = createPDFConfig(ReportTemplate.STANDARD, {
        pageSize: 'letter',
        orientation: 'landscape',
      });

      expect(config.pageSize).toBe('letter');
      expect(config.orientation).toBe('landscape');
    });
  });

  describe('createHTMLConfig', () => {
    it('should create HTML config with defaults', () => {
      const config = createHTMLConfig();

      expect(config.format).toBe(ReportFormat.HTML);
      expect(config.theme).toBe('light');
      expect(config.useCDN).toBe(true);
    });

    it('should apply template defaults', () => {
      const config = createHTMLConfig(ReportTemplate.DETAILED);

      expect(config.template).toBe(ReportTemplate.DETAILED);
      expect(config.includeRecommendations).toBe(true);
    });
  });

  describe('validateTemplateConfig', () => {
    it('should validate valid config', () => {
      const config: ReportConfig = {
        format: ReportFormat.PDF,
        template: ReportTemplate.STANDARD,
      };

      const result = validateTemplateConfig(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid template', () => {
      const config: ReportConfig = {
        format: ReportFormat.PDF,
        template: 'invalid' as ReportTemplate,
      };

      const result = validateTemplateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid maxPatterns', () => {
      const config: ReportConfig = {
        format: ReportFormat.PDF,
        maxPatterns: -1,
      };

      const result = validateTemplateConfig(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('maxPatterns must be >= 0');
    });
  });

  describe('getRecommendedTemplate', () => {
    it('should recommend detailed for small datasets', () => {
      const template = getRecommendedTemplate(5);

      expect(template).toBe(ReportTemplate.DETAILED);
    });

    it('should recommend standard for medium datasets', () => {
      const template = getRecommendedTemplate(50);

      expect(template).toBe(ReportTemplate.STANDARD);
    });

    it('should recommend minimal for large datasets', () => {
      const template = getRecommendedTemplate(500);

      expect(template).toBe(ReportTemplate.MINIMAL);
    });
  });

  describe('estimateComplexity', () => {
    it('should estimate complexity for minimal template', () => {
      const complexity = estimateComplexity(ReportTemplate.MINIMAL, 10);

      expect(complexity).toBeGreaterThan(0);
      expect(complexity).toBeLessThanOrEqual(10);
    });

    it('should estimate higher complexity for detailed template', () => {
      const minimalComplexity = estimateComplexity(ReportTemplate.MINIMAL, 10);
      const detailedComplexity = estimateComplexity(ReportTemplate.DETAILED, 10);

      expect(detailedComplexity).toBeGreaterThan(minimalComplexity);
    });

    it('should estimate higher complexity for larger datasets', () => {
      const smallComplexity = estimateComplexity(ReportTemplate.STANDARD, 10);
      const largeComplexity = estimateComplexity(ReportTemplate.STANDARD, 1000);

      expect(largeComplexity).toBeGreaterThan(smallComplexity);
    });
  });
});

// ============================================================================
// QUEUE MANAGEMENT TESTS (AC6)
// ============================================================================

describe('Queue Management (AC6)', () => {
  beforeEach(() => {
    clearQueue();
  });

  describe('getQueueStatus', () => {
    it('should return empty queue status', () => {
      const status = getQueueStatus();

      expect(status.pending).toBe(0);
      expect(status.processing).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
      expect(status.total).toBe(0);
    });
  });

  // Note: Full queue testing would require async integration tests
  // These unit tests verify the queue interface exists and works
});

// ============================================================================
// ERROR HANDLING TESTS (AC6)
// ============================================================================

describe('Error Handling (AC6)', () => {
  it('should handle empty patterns array', async () => {
    const config: ReportConfig = {
      format: ReportFormat.PDF,
    };

    const result = await generateReport([], config);

    expect(result.success).toBe(true); // Empty report is valid
  });

  it('should handle invalid format', async () => {
    const patterns = createMockPatterns(5);
    const config: ReportConfig = {
      format: 'invalid' as ReportFormat,
    };

    const result = await generateReport(patterns, config);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle invalid template', async () => {
    const patterns = createMockPatterns(5);
    const config: ReportConfig = {
      format: ReportFormat.PDF,
      template: 'invalid' as ReportTemplate,
    };

    const result = await generateReport(patterns, config);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle missing required fields', async () => {
    const invalidPatterns = [{}] as MergedPattern[];
    const config: ReportConfig = {
      format: ReportFormat.PDF,
    };

    const result = await generateReport(invalidPatterns, config);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
