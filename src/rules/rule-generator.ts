/**
 * Rule Generator Implementation (Story 3.7)
 *
 * Converts identified patterns into specific, actionable rule suggestions
 * YOLO approach: Start simple, iterate fast
 *
 * @module rules/rule-generator
 */

import { Pattern, PatternCategory } from '../pattern-detector';
import { ContentType } from '../content-analyzer';
import {
  RuleSuggestion,
  RuleProposalType,
  RuleGenerationResult,
  PlatformFormats,
  ExistingRule,
  RuleModification,
  ChangeHighlight,
  BeforeAfterComparison,
} from './types';

// Re-export types for external use
export type {
  RuleSuggestion,
  RuleGenerationResult,
  PlatformFormats,
  ExistingRule,
  RuleModification,
  ChangeHighlight,
  BeforeAfterComparison,
};

// Export enum as value
export { RuleProposalType };
import { CursorFormatter } from './formatters/cursor-formatter';
import { CopilotFormatter } from './formatters/copilot-formatter';

// ============================================================================
// RULE TEMPLATES (YOLO: Hardcoded for common patterns)
// ============================================================================

/**
 * Rule templates for common pattern patterns
 * YOLO approach: Start with hardcoded templates, expand based on real data
 */
const RULE_TEMPLATES: Record<string, string> = {
  // Code Style patterns
  'use f-strings': 'Use f-strings instead of format() or % for string formatting',
  'camelcase': 'Use camelCase for variable and function names',
  'snake_case': 'Use snake_case for variables and constants',
  'kebab-case': 'Use kebab-case for file and folder names',
  'pascalcase': 'Use PascalCase for class names and types',
  '2 spaces': 'Use 2 spaces for indentation',
  '4 spaces': 'Use 4 spaces for indentation',
  'tabs': 'Use tabs for indentation',

  // Terminology patterns
  'endpoint': 'Refer to API endpoints as "endpoints" not "APIs"',
  'api': 'Use "API" (uppercase) when referring to APIs',
  'call': 'Use "call" or "invoke" instead of "use" for API interactions',

  // Convention patterns
  'async': 'Use async/await instead of callbacks for asynchronous operations',
  'promise': 'Use Promise-based patterns instead of callbacks',

  // Structure patterns
  'import order': 'Order imports: standard library, third-party, local modules',
  'file organization': 'Organize files by feature or module, not by type',

  // Formatting patterns
  'spacing': 'Maintain consistent spacing around operators and keywords',
  'line length': 'Keep lines under 80-100 characters for readability',

  // Default fallback
  'default': 'Follow this pattern in your code',
};

/**
 * Context prefixes for content types
 */
const CONTEXT_PREFIXES: Record<ContentType, string> = {
  [ContentType.CODE]: 'When writing code',
  [ContentType.DOCUMENTATION]: 'In documentation',
  [ContentType.DIAGRAM]: 'In diagrams',
  [ContentType.PRD]: 'In requirements',
  [ContentType.TEST_PLAN]: 'In test plans',
  [ContentType.GENERAL_TEXT]: 'In general content',
};

// ============================================================================
// PATTERN ANALYZER
// ============================================================================

/**
 * Pattern analyzer for extracting rule information from patterns
 *
 * @class PatternAnalyzer
 */
class PatternAnalyzer {
  /**
   * Extract rule text from a pattern
   *
   * @param pattern - The pattern to analyze
   * @returns Extracted rule text
   */
  extractRuleFromPattern(pattern: Pattern): string {
    const patternText = pattern.pattern_text.toLowerCase();

    // Check if we have a template for this pattern
    for (const [key, template] of Object.entries(RULE_TEMPLATES)) {
      if (patternText.includes(key)) {
        return template;
      }
    }

    // If pattern already has a suggested_rule, use it
    if (pattern.suggested_rule && pattern.suggested_rule.trim()) {
      return pattern.suggested_rule;
    }

    // Default: use pattern text as rule
    return pattern.pattern_text;
  }

  /**
   * Get content type from pattern
   *
   * @param pattern - The pattern to analyze
   * @returns Primary content type
   */
  determineContentType(pattern: Pattern): ContentType {
    // Use the first content type if available
    if (pattern.content_types && pattern.content_types.length > 0) {
      return pattern.content_types[0];
    }
    return ContentType.GENERAL_TEXT;
  }

  /**
   * Calculate confidence score based on pattern characteristics
   *
   * Confidence Model:
   * - Base: 0.3 (count=2), 0.4 (count=3-4), 0.5 (count>=5)
   * - Boost: +0.3 for exact matches (not similar themes)
   * - Boost: +0.2 for patterns with 3+ examples
   * - Range: [0.0, 1.0]
   * - High confidence: >= 0.7, Medium: >= 0.4, Low: < 0.4
   *
   * @param pattern - The pattern to analyze
   * @returns Confidence score (0-1)
   */
  calculateConfidence(pattern: Pattern): number {
    let confidence = 0.0;

    // Base confidence from pattern count (more occurrences = higher confidence)
    if (pattern.count >= 5) {
      confidence += 0.5;
    } else if (pattern.count >= 3) {
      confidence += 0.4;
    } else if (pattern.count >= 2) {
      confidence += 0.3;
    }

    // Boost confidence for exact matches
    const isExactMatch = !pattern.pattern_text.includes('(similar theme)');
    if (isExactMatch) {
      confidence += 0.3;
    }

    // Boost confidence for patterns with examples
    if (pattern.examples && pattern.examples.length >= 3) {
      confidence += 0.2;
    }

    // Ensure confidence is within [0, 1]
    return Math.min(Math.max(confidence, 0.0), 1.0);
  }

  /**
   * Find existing rules that match a pattern
   *
   * @param pattern - The pattern to match
   * @param existingRules - Array of existing rules
   * @returns Matching existing rules
   */
  findExistingRules(pattern: Pattern, existingRules: ExistingRule[]): ExistingRule[] {
    if (!existingRules || existingRules.length === 0) {
      return [];
    }

    return existingRules.filter(rule => {
      const ruleText = rule.text.toLowerCase();
      const patternText = pattern.pattern_text.toLowerCase();

      // Simple keyword matching for YOLO implementation
      // Check if pattern keywords appear in rule text
      const patternKeywords = patternText.split(/\s+/).filter(w => w.length > 3);
      const hasMatchingKeywords = patternKeywords.some(keyword => ruleText.includes(keyword));

      return hasMatchingKeywords;
    });
  }
}

// ============================================================================
// RULE GENERATOR
// ============================================================================

/**
 * Rule generator for converting patterns into actionable rule suggestions
 *
 * @class RuleGenerator
 */
export class RuleGenerator {
  private analyzer: PatternAnalyzer;
  private cursorFormatter: CursorFormatter;
  private copilotFormatter: CopilotFormatter;

  constructor() {
    this.analyzer = new PatternAnalyzer();
    this.cursorFormatter = new CursorFormatter();
    this.copilotFormatter = new CopilotFormatter();
  }

  /**
   * Generate rules from patterns
   *
   * @param patterns - Array of detected patterns
   * @param existingRules - Optional existing rules to check against
   * @returns Rule generation result
   */
  generateRules(patterns: Pattern[], existingRules: ExistingRule[] = []): RuleGenerationResult {
    const startTime = Date.now();

    const rules: RuleSuggestion[] = [];
    let newRulesCount = 0;
    let additionsCount = 0;
    let modificationsCount = 0;
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let lowConfidenceCount = 0;

    for (const pattern of patterns) {
      const suggestion = this.generateForPattern(pattern, existingRules);

      // Track statistics
      if (suggestion.type === RuleProposalType.NEW_RULE) newRulesCount++;
      else if (suggestion.type === RuleProposalType.ADDITION) additionsCount++;
      else if (suggestion.type === RuleProposalType.MODIFICATION) modificationsCount++;

      if (suggestion.confidence >= 0.7) highConfidenceCount++;
      else if (suggestion.confidence >= 0.4) mediumConfidenceCount++;
      else lowConfidenceCount++;

      rules.push(suggestion);
    }

    const processingTime = Date.now() - startTime;

    return {
      totalRules: rules.length,
      rules,
      summary: {
        newRules: newRulesCount,
        additions: additionsCount,
        modifications: modificationsCount,
        highConfidence: highConfidenceCount,
        mediumConfidence: mediumConfidenceCount,
        lowConfidence: lowConfidenceCount,
      },
      processingTimeMs: processingTime,
    };
  }

  /**
   * Generate rule suggestion for a single pattern
   *
   * @param pattern - The pattern to generate a rule for
   * @param existingRules - Optional existing rules to check against
   * @returns Rule suggestion
   */
  generateForPattern(pattern: Pattern, existingRules: ExistingRule[] = []): RuleSuggestion {
    const ruleText = this.analyzer.extractRuleFromPattern(pattern);
    const contentType = this.analyzer.determineContentType(pattern);
    const confidence = this.analyzer.calculateConfidence(pattern);

    // Determine proposal type based on existing rules
    const matchingRules = this.analyzer.findExistingRules(pattern, existingRules);
    let type: RuleProposalType;
    let beforeAfter = undefined;

    if (matchingRules.length === 0) {
      type = RuleProposalType.NEW_RULE;
    } else if (this.shouldModifyExisting(pattern, matchingRules[0])) {
      type = RuleProposalType.MODIFICATION;
      beforeAfter = this.createBeforeAfter(pattern, matchingRules[0]);
    } else {
      type = RuleProposalType.ADDITION;
    }

    // Generate explanation
    const explanation = this.generateExplanation(pattern, contentType);

    // Format for platforms
    const platformFormats: PlatformFormats = {
      cursor: this.cursorFormatter.formatSingleRule(ruleText, contentType),
      copilot: this.copilotFormatter.formatSingleRule(ruleText, contentType),
    };

    return {
      id: this.generateRuleId(pattern),
      type,
      pattern,
      ruleText,
      explanation,
      contentType,
      confidence,
      platformFormats,
      beforeAfter,
    };
  }

  /**
   * Determine if we should modify an existing rule
   *
   * @private
   * @param pattern - The pattern to check
   * @param existingRule - The existing rule
   * @returns True if we should modify the existing rule
   */
  private shouldModifyExisting(pattern: Pattern, existingRule: ExistingRule): boolean {
    // YOLO: Simple heuristic - if pattern text is similar to rule, consider it a modification
    const patternText = pattern.pattern_text.toLowerCase();
    const ruleText = existingRule.text.toLowerCase();

    // If pattern contains keywords like "instead of", "replace", "change", it's a modification
    if (/\b(instead of|replace|change|use.*instead)\b/i.test(patternText)) {
      return true;
    }

    // If pattern and rule text are similar enough, it's a modification
    const similarity = this.calculateSimilarity(patternText, ruleText);
    return similarity >= 0.3;
  }

  /**
   * Calculate similarity between two strings
   *
   * @private
   * @param str1 - First string
   * @param str2 - Second string
   * @returns Similarity score (0-1)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];

    return union.length > 0 ? intersection.length / union.length : 0;
  }

  /**
   * Create before/after comparison
   *
   * @private
   * @param pattern - The pattern
   * @param existingRule - The existing rule
   * @returns Before/after comparison
   */
  private createBeforeAfter(pattern: Pattern, existingRule: ExistingRule): any {
    // YOLO: Simple before/after - show existing rule and suggested modification
    const newRuleText = this.analyzer.extractRuleFromPattern(pattern);

    return {
      before: existingRule.text,
      after: newRuleText,
      changes: [
        {
          type: 'modification' as const,
          text: `Update rule to reflect pattern: ${pattern.pattern_text}`,
        },
      ],
    };
  }

  /**
   * Generate explanation for a rule
   *
   * @private
   * @param pattern - The pattern
   * @param contentType - The content type
   * @returns Explanation string
   */
  private generateExplanation(pattern: Pattern, contentType: ContentType): string {
    const context = CONTEXT_PREFIXES[contentType];
    const frequency = pattern.count;

    return `${context}, ${pattern.pattern_text.toLowerCase()}. ` +
      `This pattern was observed ${frequency} time${frequency > 1 ? 's' : ''} in your corrections.`;
  }

  /**
   * Generate unique rule ID from pattern
   *
   * @private
   * @param pattern - The pattern
   * @returns Unique ID
   */
  private generateRuleId(pattern: Pattern): string {
    // Create hash from pattern text and category
    let hash = pattern.pattern_text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-') // Collapse multiple dashes
      .substring(0, 50);

    // Remove leading/trailing dashes before validation
    hash = hash.replace(/^-+|-+$/g, '');

    // Fallback if hash is empty or only dashes
    if (!hash || hash.length === 0) {
      // Use a combination of pattern category and a timestamp-based hash
      const timestampHash = Date.now().toString(36);
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      hash = `pattern-${pattern.category}-${timestampHash}${randomSuffix}`;
    }

    // Ensure the final hash is not empty
    if (!hash || hash.length === 0) {
      hash = `rule-${Date.now()}`;
    }

    return `rule-${pattern.category}-${hash}`;
  }

  /**
   * Generate rule for a new pattern (without existing rules)
   *
   * @param pattern - The new pattern
   * @returns Rule suggestion
   */
  generateForNewPattern(pattern: Pattern): RuleSuggestion {
    return this.generateForPattern(pattern, []);
  }

  /**
   * Generate rule modification for existing rule
   *
   * @param pattern - The pattern
   * @param existingRule - The existing rule (string or ExistingRule object)
   * @returns Rule modification
   */
  generateForExistingRule(pattern: Pattern, existingRule: string | ExistingRule): RuleModification {
    // Convert string to ExistingRule object if needed
    const existingRuleObj: ExistingRule = typeof existingRule === 'string'
      ? { id: 'existing-rule', text: existingRule, platform: 'cursor' }
      : existingRule;

    const suggestion = this.generateForPattern(pattern, [existingRuleObj]);
    const beforeAfter = suggestion.beforeAfter!;

    return {
      suggestion,
      existingRule: existingRuleObj,
      beforeAfter,
      proposedRule: suggestion.ruleText,
      changes: beforeAfter.changes,
      reason: suggestion.explanation,
      confidence: suggestion.confidence,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate rules from patterns with a single function call
 *
 * @param patterns - Array of detected patterns
 * @param existingRules - Optional existing rules
 * @returns Rule generation result
 */
export function generateRules(
  patterns: Pattern[],
  existingRules?: ExistingRule[]
): RuleGenerationResult {
  const generator = new RuleGenerator();
  return generator.generateRules(patterns, existingRules);
}
