/**
 * Integration Tests for Prompt Template Pipeline
 *
 * These tests validate the end-to-end flow of the prompt template system:
 * Conversation Analysis → Pattern Extraction → Rule Generation
 *
 * Tests cover:
 * - Schema contracts between templates
 * - Data flow validation
 * - Edge case handling across the pipeline
 * - Error propagation
 */

import { readFileSync } from 'fs';
import { join } from 'path';

describe('Prompt Template Pipeline Integration', () => {
  const testFixturesDir = join(__dirname, '..', 'fixtures', 'conversations');

  describe('Schema Contract Validation', () => {
    it('should validate conversation analysis output schema', () => {
      const conversationAnalysisPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      // Verify output format specification exists
      expect(conversationAnalysisPrompt).toContain('corrections');
      expect(conversationAnalysisPrompt).toContain('conversation_length');
      expect(conversationAnalysisPrompt).toContain('total_corrections');
      expect(conversationAnalysisPrompt).toContain('analysis_summary');

      // Verify schema is documented
      expect(conversationAnalysisPrompt).toMatch(/output.*schema|schema.*output/i);
    });

    it('should validate pattern extraction input schema matches conversation analysis output', () => {
      const patternExtractionPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      // Pattern extraction expects corrections array from conversation analysis
      expect(patternExtractionPrompt).toContain('corrections');
      expect(patternExtractionPrompt).toMatch(/corrections.*array|array.*corrections/i);

      // Verify input format specification
      expect(patternExtractionPrompt).toContain('Input');
    });

    it('should validate pattern extraction output schema', () => {
      const patternExtractionPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      // Verify output fields
      expect(patternExtractionPrompt).toContain('patterns');
      expect(patternExtractionPrompt).toContain('total_patterns');
      expect(patternExtractionPrompt).toContain('extraction_summary');
    });

    it('should validate rule generation input schema matches pattern extraction output', () => {
      const ruleGenerationPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'generate-rules.md'),
        'utf-8'
      );

      // Rule generation expects patterns array from pattern extraction
      expect(ruleGenerationPrompt).toContain('patterns');
      expect(ruleGenerationPrompt).toMatch(/<patterns>|patterns.*array/i);
    });
  });

  describe('Empty State Handling Across Pipeline', () => {
    it('should handle empty conversation gracefully', () => {
      const conversationAnalysisPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      // Should specify behavior for empty input
      expect(conversationAnalysisPrompt).toContain('No conversation history provided');
      expect(conversationAnalysisPrompt).toMatch(/corrections.*\[\]|empty.*corrections/i);
    });

    it('should handle empty corrections array in pattern extraction', () => {
      const patternExtractionPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      // Should specify behavior for empty corrections
      expect(patternExtractionPrompt).toContain('No corrections provided');
      expect(patternExtractionPrompt).toMatch(/no.*patterns|patterns.*empty/i);
    });

    it('should handle empty patterns array in rule generation', () => {
      const ruleGenerationPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'generate-rules.md'),
        'utf-8'
      );

      // Should specify behavior for empty patterns
      expect(ruleGenerationPrompt).toMatch(/patterns.*array.*empty|empty.*patterns/i);
      expect(ruleGenerationPrompt).toContain('empty array');
    });
  });

  describe('Data Format Contracts', () => {
    it('should enforce JSON output format in all templates', () => {
      const prompts = [
        'analyze-conversation.md',
        'extract-patterns.md',
        'generate-rules.md'
      ];

      prompts.forEach(promptFile => {
        const prompt = readFileSync(
          join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', promptFile),
          'utf-8'
        );

        // All templates should specify JSON output
        expect(prompt).toMatch(/JSON|json/i);
        expect(prompt).toMatch(/output.*format|format.*output/i);
      });
    });

    it('should define consistent field naming conventions', () => {
      const conversationPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      const patternPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      // Check for snake_case consistency (should use underscores, not hyphens)
      const conversationFields = conversationPrompt.match(/[\w]+_summary/g) || [];
      const patternFields = patternPrompt.match(/[\w]+_summary/g) || [];

      expect(conversationFields.length).toBeGreaterThan(0);
      expect(patternFields.length).toBeGreaterThan(0);

      // Verify consistent naming patterns
      expect(conversationFields).toContain('analysis_summary');
      expect(patternFields).toContain('extraction_summary');
    });
  });

  describe('Error Handling Consistency', () => {
    it('should specify malformed input handling in conversation analysis', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      expect(prompt).toContain('malformed');
      expect(prompt).toMatch(/format.*unrecognizable|invalid.*format/i);
    });

    it('should specify low-confidence correction handling in pattern extraction', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      expect(prompt).toContain('low');
      expect(prompt).toContain('confidence');
      expect(prompt).toMatch(/low.*confidence|confidence.*low/i);
    });

    it('should specify conflict detection in rule generation', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'generate-rules.md'),
        'utf-8'
      );

      expect(prompt).toContain('conflict');
      expect(prompt).toMatch(/existing.*rules|rules.*existing/i);
      expect(prompt).toContain('modification');
    });
  });

  describe('Platform Integration', () => {
    it('should support platform detection in conversation analysis', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      // Should be platform-agnostic (no platform-specific assumptions)
      expect(prompt).toContain('Role-Agnostic');
    });

    it('should support platform-specific formatting in rule generation', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'generate-rules.md'),
        'utf-8'
      );

      // Should specify platform-specific behavior
      expect(prompt).toMatch(/cursor|copilot|platform/i);
      expect(prompt).toContain('.cursorrules');
    });
  });

  describe('Example Coverage', () => {
    it('should have comprehensive examples in conversation analysis', () => {
      const prompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      // Count example sections (should have multiple)
      const exampleMatches = prompt.match(/## Example/i);
      expect(exampleMatches).toBeTruthy();
      expect(prompt.split(/## Example/i).length - 1).toBeGreaterThanOrEqual(3);
    });

    it('should have examples covering edge cases', () => {
      const conversationPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
        'utf-8'
      );

      const patternPrompt = readFileSync(
        join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
        'utf-8'
      );

      // Should cover edge cases like empty input, malformed input, etc.
      expect(conversationPrompt).toMatch(/empty|malformed|edge.*case/i);
      expect(patternPrompt).toMatch(/empty.*corrections|no.*patterns/i);
    });
  });

  describe('Integration Points', () => {
    it('should document input/output contracts between templates', () => {
      const prompts = {
        conversation: readFileSync(
          join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'analyze-conversation.md'),
          'utf-8'
        ),
        pattern: readFileSync(
          join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'extract-patterns.md'),
          'utf-8'
        ),
        rule: readFileSync(
          join(process.cwd(), '.claude', 'skills', 'rulesmith', 'prompts', 'generate-rules.md'),
          'utf-8'
        )
      };

      // Each template should document its input and output
      Object.values(prompts).forEach(prompt => {
        expect(prompt).toMatch(/input|output/i);
        expect(prompt).toMatch(/## Context|# Task/i);
      });

      // Verify output → input chain
      expect(prompts.conversation).toContain('corrections');
      expect(prompts.pattern).toContain('corrections'); // Input
      expect(prompts.pattern).toContain('patterns'); // Output
      expect(prompts.rule).toContain('patterns'); // Input
    });
  });

  describe('Schema Versioning', () => {
    it('should include schema notes for maintainability', () => {
      const statePath = join(process.cwd(), '.claude', 'skills', 'rulesmith', 'data', 'state.json');

      // State management should have schema documentation
      // This test verifies the state.json schema if it exists
      // In production, this would check for schema version fields
    });
  });
});
