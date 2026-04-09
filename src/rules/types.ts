/**
 * Rule Types Implementation (Story 3.7)
 *
 * Core type definitions for rule generation system
 *
 * @module rules/types
 */

import { Pattern, PatternCategory } from '../pattern-detector';
import { ContentType } from '../content-analyzer';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Rule proposal types for tracking suggestion categories
 *
 * @enum {string}
 */
export enum RuleProposalType {
  /** Brand new rule for uncovered pattern */
  NEW_RULE = 'new_rule',
  /** Addition to enhance existing rule */
  ADDITION = 'addition',
  /** Modification to existing rule */
  MODIFICATION = 'modification',
}

/**
 * Change highlight for before/after comparisons
 *
 * @interface ChangeHighlight
 */
export interface ChangeHighlight {
  /** Type of change: addition, deletion, modification */
  type: 'addition' | 'deletion' | 'modification';
  /** The changed text */
  text: string;
  /** Position in the rule (for display) */
  position?: number;
}

/**
 * Before/after comparison for rule modifications
 *
 * @interface BeforeAfterComparison
 */
export interface BeforeAfterComparison {
  /** Original rule text */
  before: string;
  /** Modified rule text */
  after: string;
  /** Specific changes highlighted */
  changes: ChangeHighlight[];
}

/**
 * Platform-specific formatted rule output
 *
 * @interface PlatformFormats
 */
export interface PlatformFormats {
  /** Cursor .cursorrules format */
  cursor: string;
  /** GitHub Copilot custom instructions format */
  copilot: string;
}

/**
 * Complete rule suggestion with all metadata
 *
 * @interface RuleSuggestion
 */
export interface RuleSuggestion {
  /** Unique identifier for the rule */
  id: string;
  /** Type of proposal (new, addition, modification) */
  type: RuleProposalType;
  /** Source pattern that generated this rule */
  pattern: Pattern;
  /** The actual rule text */
  ruleText: string;
  /** Human-readable explanation of the rule */
  explanation: string;
  /** Content type this rule applies to */
  contentType: ContentType;
  /** Confidence score (0-1) based on pattern frequency and clarity */
  confidence: number;
  /** Platform-specific formatted outputs */
  platformFormats: PlatformFormats;
  /** Before/after comparison (only for MODIFICATION type) */
  beforeAfter?: BeforeAfterComparison;
  /** Story 4.3: Original rule text (preserved when edited) */
  original_rule?: string;
  /** Story 4.3: User's edited version (if edited) */
  edited_rule?: string;
}

/**
 * Existing rule from platform configuration
 *
 * @interface ExistingRule
 */
export interface ExistingRule {
  /** Rule identifier */
  id: string;
  /** Current rule text */
  text: string;
  /** Platform this rule belongs to */
  platform: 'cursor' | 'copilot';
  /** Content type this rule applies to */
  contentType?: ContentType;
}

/**
 * Rule modification proposal
 *
 * @interface RuleModification
 */
export interface RuleModification {
  /** The modified rule suggestion */
  suggestion: RuleSuggestion;
  /** The existing rule being modified */
  existingRule: ExistingRule;
  /** Before/after comparison */
  beforeAfter: BeforeAfterComparison;
  /** Convenience alias for suggestion.ruleText */
  proposedRule: string;
  /** Convenience alias for beforeAfter.changes */
  changes: ChangeHighlight[];
  /** Convenience alias for suggestion.explanation */
  reason: string;
  /** Convenience alias for suggestion.confidence */
  confidence: number;
}

/**
 * Rule generation result
 *
 * @interface RuleGenerationResult
 */
export interface RuleGenerationResult {
  /** Number of rules generated */
  totalRules: number;
  /** Generated rule suggestions */
  rules: RuleSuggestion[];
  /** Generation summary */
  summary: {
    newRules: number;
    additions: number;
    modifications: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  /** Processing time in milliseconds */
  processingTimeMs: number;
}
