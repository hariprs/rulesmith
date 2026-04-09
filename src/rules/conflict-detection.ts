/**
 * Rule Conflict Detection Module (Story 6-7)
 *
 * Detects contradictions between new rules and existing rules.
 * A contradiction is identified when: new rule says "do X" and existing rule says "don't do X" (or vice versa).
 *
 * FRs: FR45
 * ARs: AR19 (snake_case), AR20 (ISO 8601 UTC)
 */

// ============================================================================
// Types
// ============================================================================

export type ConflictSeverity = 'high' | 'medium';

export interface ConflictResult {
  existingRule: string;
  newRule: string;
  conflictType: 'contradiction';
  severity: ConflictSeverity;
  reason: string;
}

export interface ConflictDetectionResult {
  hasConflicts: boolean;
  conflicts: ConflictResult[];
  totalCompared: number;
}

// ============================================================================
// Constants
// ============================================================================

const NEGATION_KEYWORDS = [
  'never',
  "don't",
  'do not',
  'dont',
  'avoid',
  'exclude',
  'no ',
  'not ',
  'without',
  'forbid',
  'prohibit',
];

const AFFIRMATION_KEYWORDS = [
  'always',
  'use',
  'prefer',
  'do ',
  'ensure',
  'must',
  'should',
  'require',
];

const MAX_CONFLICTS_PER_RULE = 10;

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Compares new rules against existing rules for contradictions.
 * Returns a ConflictDetectionResult with any conflicts found.
 */
export function detectRuleConflicts(
  existingRules: string[],
  newRules: string[]
): ConflictDetectionResult {
  if (!existingRules || !newRules || existingRules.length === 0 || newRules.length === 0) {
    return { hasConflicts: false, conflicts: [], totalCompared: 0 };
  }

  const conflicts: ConflictResult[] = [];

  for (const newRule of newRules) {
    const newRuleConflicts: ConflictResult[] = [];

    for (const existingRule of existingRules) {
      // Skip duplicate rules
      if (normalizeText(existingRule) === normalizeText(newRule)) {
        continue;
      }

      const conflict = detectContradiction(existingRule, newRule);
      if (conflict) {
        newRuleConflicts.push(conflict);
      }
    }

    // Apply truncation limit for multi-way conflicts
    if (newRuleConflicts.length > MAX_CONFLICTS_PER_RULE) {
      const truncatedCount = newRuleConflicts.length - MAX_CONFLICTS_PER_RULE;
      const topConflicts = newRuleConflicts
        .sort((a, b) => (a.severity === 'high' ? -1 : 1))
        .slice(0, MAX_CONFLICTS_PER_RULE);

      // Add truncation note to the last conflict
      if (topConflicts.length > 0) {
        topConflicts[topConflicts.length - 1].reason += ` (${truncatedCount} additional conflicts truncated)`;
      }

      conflicts.push(...topConflicts);
    } else {
      conflicts.push(...newRuleConflicts);
    }
  }

  const totalCompared = existingRules.length * newRules.length;

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    totalCompared,
  };
}

/**
 * Detects a contradiction between an existing rule and a new rule.
 * Returns a ConflictResult if a contradiction is found, null otherwise.
 */
function detectContradiction(existingRule: string, newRule: string): ConflictResult | null {
  const existingNormalized = normalizeText(existingRule);
  const newNormalized = normalizeText(newRule);

  const existingIsNegation = containsNegation(existingNormalized);
  const newIsNegation = containsNegation(newNormalized);
  const existingIsAffirmation = containsAffirmation(existingNormalized);
  const newIsAffirmation = containsAffirmation(newNormalized);

  // Check for topic overlap first (including prefix negation like pure/impure)
  const hasTopicOverlap = checkTopicOverlap(existingNormalized, newNormalized);
  if (!hasTopicOverlap) {
    return null;
  }

  // Check for direct negation: one affirms, one negates
  const isDirectNegation =
    (existingIsAffirmation && newIsNegation) || (existingIsNegation && newIsAffirmation);

  if (isDirectNegation) {
    const severity = classifySeverity(existingNormalized, newNormalized);
    return {
      existingRule,
      newRule,
      conflictType: 'contradiction',
      severity,
      reason: `Existing rule says '${existingRule}', new rule says '${newRule}'`,
    };
  }

  // Check for "ensure X" vs "allow not-X" pattern (prefix negation)
  const hasPrefixNegationConflict = checkPrefixNegationConflict(
    existingNormalized,
    newNormalized
  );
  if (hasPrefixNegationConflict) {
    return {
      existingRule,
      newRule,
      conflictType: 'contradiction',
      severity: 'high',
      reason: `Existing rule says '${existingRule}', new rule says '${newRule}'`,
    };
  }

  // Check for partial contradiction (medium severity)
  const hasPartialContradiction = checkPartialContradiction(
    existingNormalized,
    newNormalized,
    existingIsNegation,
    newIsNegation
  );
  if (hasPartialContradiction) {
    return {
      existingRule,
      newRule,
      conflictType: 'contradiction',
      severity: 'medium',
      reason: `Partial contradiction: existing rule says '${existingRule}', new rule says '${newRule}'`,
    };
  }

  return null;
}

/**
 * Normalizes text for comparison: lowercase, trim, collapse whitespace.
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Checks if text contains negation keywords.
 */
function containsNegation(text: string): boolean {
  return NEGATION_KEYWORDS.some((keyword) => {
    if (keyword.endsWith(' ')) {
      return text.includes(keyword);
    }
    return text.includes(keyword);
  });
}

/**
 * Checks if text contains affirmation keywords.
 */
function containsAffirmation(text: string): boolean {
  return AFFIRMATION_KEYWORDS.some((keyword) => {
    if (keyword.endsWith(' ')) {
      return text.includes(keyword);
    }
    return text.includes(keyword);
  });
}

/**
 * Checks if two rules share topic/subject overlap.
 * Uses word-level intersection to detect common concepts.
 */
function checkTopicOverlap(text1: string, text2: string): boolean {
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'dare',
    'ought',
    'used',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'as',
    'into',
    'through',
    'during',
    'before',
    'after',
    'above',
    'below',
    'between',
    'under',
    'again',
    'further',
    'then',
    'once',
    'and',
    'but',
    'or',
    'nor',
    'not',
    'so',
    'yet',
    'both',
    'either',
    'neither',
    'each',
    'all',
    'any',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'only',
    'own',
    'same',
    'than',
    'too',
    'very',
    'just',
    "don't",
    "do not",
    'dont',
    'use',
    'prefer',
    'always',
    'never',
    'avoid',
    'ensure',
    'allow',
    'require',
  ]);

  const words1 = new Set(
    text1
      .split(' ')
      .map((w) => w.replace(/[;,.!?:'"(){}[\]]/g, ''))
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );
  const words2 = new Set(
    text2
      .split(' ')
      .map((w) => w.replace(/[;,.!?:'"(){}[\]]/g, ''))
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );

  // Check for common content words
  for (const word of words1) {
    if (words2.has(word)) {
      return true;
    }
    // Check for word stem overlap (e.g., "approach" vs "approaches")
    for (const word2 of words2) {
      if (word.startsWith(word2) || word2.startsWith(word)) {
        return true;
      }
      // Check for prefix negation (im-, in-, un-, non-, dis-)
      if (areRelatedByNegationPrefix(word, word2)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks if two words are related by a negation prefix (im-, in-, un-, non-, dis-).
 * E.g., "pure" vs "impure", "valid" vs "invalid".
 */
function areRelatedByNegationPrefix(word1: string, word2: string): boolean {
  const negationPrefixes = ['im', 'in', 'un', 'non', 'dis'];

  for (const prefix of negationPrefixes) {
    if (word2.startsWith(prefix) && word2.length > prefix.length + 2) {
      const root = word2.slice(prefix.length);
      if (word1 === root || root.startsWith(word1) || word1.startsWith(root)) {
        return true;
      }
    }
    if (word1.startsWith(prefix) && word1.length > prefix.length + 2) {
      const root = word1.slice(prefix.length);
      if (word2 === root || root.startsWith(word2) || word2.startsWith(root)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Checks for conflicts where one rule affirms something and the other affirms
 * the negation of it using prefix negation (e.g., "ensure pure" vs "allow impure").
 */
function checkPrefixNegationConflict(text1: string, text2: string): boolean {
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
    'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by',
    'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above',
    'below', 'between', 'under', 'again', 'further', 'then', 'once', 'and',
    'but', 'or', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
    'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
    'own', 'same', 'than', 'too', 'very', 'just',
    'use', 'prefer', 'always', 'never', 'avoid', 'ensure', 'allow', 'require',
    'dont',
  ]);

  const words1 = text1
    .split(' ')
    .map((w) => w.replace(/[;,.!?:'"(){}[\]]/g, ''))
    .filter((w) => w.length > 2 && !stopWords.has(w));
  const words2 = text2
    .split(' ')
    .map((w) => w.replace(/[;,.!?:'"(){}[\]]/g, ''))
    .filter((w) => w.length > 2 && !stopWords.has(w));

  // Check if any word from text1 is a prefix negation of any word from text2
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (areRelatedByNegationPrefix(word1, word2)) {
        // Both rules affirm something about related but opposite concepts
        return true;
      }
    }
  }

  return false;
}

/**
 * Classifies severity: high = direct negation with same topic, medium = partial contradiction.
 */
function classifySeverity(existingRule: string, newRule: string): ConflictSeverity {
  const existingHasDirectNegation = NEGATION_KEYWORDS.some((kw) => existingRule.includes(kw));
  const newHasDirectNegation = NEGATION_KEYWORDS.some((kw) => newRule.includes(kw));

  // High severity: one uses direct negation, the other uses direct affirmation
  const existingHasAffirmation = AFFIRMATION_KEYWORDS.some((kw) => existingRule.includes(kw));
  const newHasAffirmation = AFFIRMATION_KEYWORDS.some((kw) => newRule.includes(kw));

  if (
    (existingHasDirectNegation && newHasAffirmation) ||
    (existingHasAffirmation && newHasDirectNegation)
  ) {
    return 'high';
  }

  return 'medium';
}

/**
 * Checks for partial contradictions: overlapping advice with conflicting guidance
 * that isn't a direct negation.
 */
function checkPartialContradiction(
  existingNormalized: string,
  newNormalized: string,
  existingIsNegation: boolean,
  newIsNegation: boolean
): boolean {
  // Both are negations about the same topic but with different specifics
  if (existingIsNegation && newIsNegation) {
    return checkTopicOverlap(existingNormalized, newNormalized);
  }

  // One suggests approach A, the other suggests approach B for the same topic
  const hasOverlap = checkTopicOverlap(existingNormalized, newNormalized);
  if (!hasOverlap) {
    return false;
  }

  // Check for conflicting preference patterns: "prefer X" vs "prefer Y" or "prefer X" vs "use Y"
  const preferPattern = /prefer\s+(\w+)/;
  const usePattern = /use\s+(\w+)/;
  const existingPrefer = existingNormalized.match(preferPattern);
  const newPrefer = newNormalized.match(preferPattern);
  const existingUse = existingNormalized.match(usePattern);
  const newUse = newNormalized.match(usePattern);

  // "prefer X" vs "prefer Y" with different X and Y
  if (existingPrefer && newPrefer && existingPrefer[1] !== newPrefer[1]) {
    return true;
  }

  // "prefer X" vs "use Y" with different X and Y
  if (existingPrefer && newUse && existingPrefer[1] !== newUse[1]) {
    return true;
  }

  // "use X" vs "prefer Y" with different X and Y
  if (existingUse && newPrefer && existingUse[1] !== newPrefer[1]) {
    return true;
  }

  // "use X" vs "use Y" with different X and Y
  if (existingUse && newUse && existingUse[1] !== newUse[1]) {
    return true;
  }

  return false;
}
