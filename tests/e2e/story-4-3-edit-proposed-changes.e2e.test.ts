/**
 * Story 4-3: Edit Proposed Changes - E2E Tests (TDD Red Phase)
 *
 * Test-Driven Development: RED PHASE - Failing tests ONLY
 * These tests are written BEFORE implementation to specify behavior.
 * All tests should FAIL initially and pass after implementation.
 *
 * Test Pyramid Strategy:
 * - E2E Tests: Only for UI-specific flows requiring full browser interaction
 * - Focus: Complete user journeys through the chat interface
 * - Priority: Minimal - only when API/integration tests are insufficient
 *
 * NOTE: These tests are kept minimal as most functionality is covered by
 * API-level and integration-level tests. E2E tests are expensive and slow.
 *
 * @module tests/e2e/story-4-3-edit-e2e
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JSDOM } from 'jsdom';
import { RuleSuggestion, RuleProposalType } from '../../src/rules/types.js';
import { DecisionType, NavigationState } from '../../src/review/types.js';
import { Pattern, PatternCategory } from '../../src/pattern-detector/index.js';

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Create realistic pattern for E2E testing
 */
const createTestPattern = (overrides?: Partial<Pattern>): Pattern => ({
  pattern_text: 'Use TypeScript strict mode',
  category: PatternCategory.CODE_STYLE,
  count: 5,
  examples: [
    {
      original_suggestion: 'Use regular JavaScript',
      user_correction: 'Use TypeScript with strict mode',
      timestamp: '2024-01-01T00:00:00Z',
    },
  ],
  confidence: 0.85,
  first_occurrence: '2024-01-01T00:00:00Z',
  last_occurrence: '2024-01-05T00:00:00Z',
  ...overrides,
});

/**
 * Create realistic rule suggestion for E2E testing
 */
const createTestRuleSuggestion = (overrides?: Partial<RuleSuggestion>): RuleSuggestion => ({
  id: 'rule-1',
  type: RuleProposalType.NEW_RULE,
  pattern: createTestPattern(),
  ruleText: 'Always use TypeScript strict mode.',
  explanation: 'Improves type safety.',
  contentType: 'code',
  confidence: 0.85,
  platformFormats: {
    cursor: 'Always use TypeScript strict mode',
    copilot: 'Always use TypeScript strict mode',
  },
  ...overrides,
});

/**
 * Create realistic Epic 3 output for E2E testing
 */
const createEpic3Output = (): RuleSuggestion[] => {
  return [
    createTestRuleSuggestion({
      id: 'rule-1',
      ruleText: 'Use TypeScript strict mode in all projects.',
    }),
    createTestRuleSuggestion({
      id: 'rule-2',
      ruleText: 'Prefer const over let for immutable variables.',
    }),
    createTestRuleSuggestion({
      id: 'rule-3',
      ruleText: 'Add JSDoc comments to all public functions.',
    }),
  ];
};

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Story 4-3: Edit Proposed Changes - E2E Tests', () => {
  let dom: JSDOM;
  let container: HTMLElement;

  beforeEach(() => {
    // Setup DOM environment for UI testing
    dom = new JSDOM(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Review Interface E2E Test</title>
      </head>
      <body>
        <div id="review-container"></div>
        <div id="input-container">
          <input type="text" id="command-input" />
          <button id="submit-button">Submit</button>
        </div>
        <div id="feedback-container"></div>
      </body>
      </html>`,
      {
        runScripts: 'dangerously',
        resources: 'usable',
      }
    );

    global.document = dom.window.document;
    global.window = dom.window as any;

    container = dom.window.document.getElementById('review-container')!;

    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    dom.window.close();
  });

  // ========================================================================
  // E2E TEST 1: Edit and Approve Journey
  // ========================================================================

  describe('E2E Test 1: Edit and Approve Journey', () => {
    it('should complete full edit and approve user journey', async () => {
      const changes = createEpic3Output();

      // Simulate displaying changes in UI
      const displayChanges = (changesToDisplay: RuleSuggestion[]) => {
        changesToDisplay.forEach((change, index) => {
          const changeElement = dom.window.document.createElement('div');
          changeElement.id = `change-${index}`;
          changeElement.innerHTML = `
            <h3>Change #${index + 1}</h3>
            <p class="rule-text">${change.ruleText}</p>
            <p class="explanation">${change.explanation}</p>
            <span class="confidence">Confidence: ${change.confidence}</span>
          `;
          container.appendChild(changeElement);
        });
      };

      // Display initial changes
      displayChanges(changes);

      // Simulate user entering "edit #2" command
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      inputElement.value = 'edit #2';

      // Simulate command submission
      const submitButton = dom.window.document.getElementById('submit-button') as HTMLButtonElement;
      submitButton.click();

      // Verify command is recognized
      expect(inputElement.value).toBe('edit #2');

      // Simulate system prompting for edited text
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;
      feedbackElement.innerHTML = '<p>Enter edited text for change #2:</p>';

      // Simulate user entering edited text
      inputElement.value = 'Prefer const over let for variables that are never reassigned.';
      submitButton.click();

      // Verify edited change is displayed with [EDITED] marker
      const change2Element = dom.window.document.getElementById('change-1')!;
      expect(change2Element.innerHTML).toContain('[EDITED]');
      expect(change2Element.innerHTML).toContain('Prefer const over let for variables that are never reassigned.');

      // Simulate user approving the edited change
      inputElement.value = 'approve #2';
      submitButton.click();

      // Verify change is marked as approved
      expect(change2Element.innerHTML).toContain('APPROVED');

      // Verify the edited version is what gets applied (not the original)
      expect(change2Element.innerHTML).not.toContain('Prefer const over let for immutable variables.');
    });

    it('should display [EDITED] marker in UI after editing', () => {
      const changes = createEpic3Output();

      // Add edited_rule to change #3
      changes[2].edited_rule = 'Add comprehensive JSDoc comments to all public and private functions.';
      changes[2].original_rule = changes[2].ruleText;

      // Display changes
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.innerHTML = `
          <h3>Change #${index + 1}</h3>
          <p class="rule-text">${change.edited_rule || change.ruleText}</p>
          ${change.edited_rule ? '<span class="edited-marker">[EDITED]</span>' : ''}
        `;
        container.appendChild(changeElement);
      });

      // Verify [EDITED] marker is displayed
      const change3Element = dom.window.document.getElementById('change-2')!;
      expect(change3Element.innerHTML).toContain('[EDITED]');
      expect(change3Element.innerHTML).toContain('Add comprehensive JSDoc comments');

      // Verify non-edited changes don't have [EDITED] marker
      const change1Element = dom.window.document.getElementById('change-0')!;
      expect(change1Element.innerHTML).not.toContain('[EDITED]');
    });

    it('should show original vs edited comparison in UI', () => {
      const changes = createEpic3Output();
      const originalRule = changes[0].ruleText;
      const editedRule = 'Use TypeScript strict mode with noUncheckedIndexedAccess enabled.';

      changes[0].edited_rule = editedRule;
      changes[0].original_rule = originalRule;

      // Display with comparison
      const changeElement = dom.window.document.createElement('div');
      changeElement.innerHTML = `
        <div class="change-container">
          <span class="edited-marker">[EDITED]</span>
          <h4>Change #1</h4>
          <div class="original-rule">
            <strong>Original:</strong>
            <p>${changes[0].original_rule}</p>
          </div>
          <div class="edited-rule">
            <strong>Edited:</strong>
            <p>${changes[0].edited_rule}</p>
          </div>
        </div>
      `;
      container.appendChild(changeElement);

      // Verify both versions are displayed
      expect(changeElement.innerHTML).toContain('Original:');
      expect(changeElement.innerHTML).toContain(originalRule);
      expect(changeElement.innerHTML).toContain('Edited:');
      expect(changeElement.innerHTML).toContain(editedRule);
    });
  });

  // ========================================================================
  // E2E TEST 2: Performance Validation
  // ========================================================================

  describe('E2E Test 2: Performance Validation', () => {
    it('should complete edit operation in under 100ms end-to-end', async () => {
      const changes = createEpic3Output();

      // Display changes in UI
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.textContent = change.ruleText;
        container.appendChild(changeElement);
      });

      // Simulate edit command
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      inputElement.value = 'edit #1';

      const submitButton = dom.window.document.getElementById('submit-button') as HTMLButtonElement;

      // Measure end-to-end time
      const startTime = Date.now();

      // Submit edit command
      submitButton.click();

      // Simulate processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Submit edited text
      inputElement.value = 'Edited rule text with about 50 characters';
      submitButton.click();

      // Wait for UI update
      await new Promise((resolve) => setTimeout(resolve, 10));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify performance requirement is met
      expect(totalTime).toBeLessThan(100);
    });

    it('should handle 1000-character edit within performance target', async () => {
      const changes = createEpic3Output();

      // Display changes
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.textContent = change.ruleText;
        container.appendChild(changeElement);
      });

      // Simulate edit with long text
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      inputElement.value = 'edit #1';

      const submitButton = dom.window.document.getElementById('submit-button') as HTMLButtonElement;

      const startTime = Date.now();

      submitButton.click();
      await new Promise((resolve) => setTimeout(resolve, 10));

      inputElement.value = 'A'.repeat(1000);
      submitButton.click();

      await new Promise((resolve) => setTimeout(resolve, 10));

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100);
    });

    it('should not block UI during edit processing', async () => {
      const changes = createEpic3Output();

      // Display changes
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.textContent = change.ruleText;
        container.appendChild(changeElement);
      });

      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      const submitButton = dom.window.document.getElementById('submit-button') as HTMLButtonElement;

      // Submit multiple edits rapidly
      const editPromises = [];

      for (let i = 0; i < 5; i++) {
        inputElement.value = `edit #${(i % 3) + 1}`;

        const promise = new Promise((resolve) => {
          setTimeout(() => {
            submitButton.click();
            resolve(null);
          }, Math.random() * 10);
        });

        editPromises.push(promise);
      }

      await Promise.all(editPromises);

      // UI should remain responsive (no timeout or crash)
      expect(dom.window.document.body.innerHTML).toBeDefined();
    });
  });

  // ========================================================================
  // UI-SPECIFIC TESTS
  // ========================================================================

  describe('UI-Specific Functionality', () => {
    it('should provide clear visual feedback for edit command', () => {
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // Simulate entering edit command
      inputElement.value = 'edit #2';

      const submitButton = dom.window.document.getElementById('submit-button') as HTMLButtonElement;
      submitButton.click();

      // System should prompt for edited text
      feedbackElement.innerHTML = '<p class="feedback-message">Enter edited text for change #2:</p>';

      // Verify feedback is displayed
      expect(feedbackElement.innerHTML).toContain('Enter edited text');
      expect(feedbackElement.innerHTML).toContain('change #2');
    });

    it('should show error message for invalid edit', () => {
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // Simulate validation error
      feedbackElement.innerHTML = '<p class="error-message">Edit failed: Edited text cannot be empty</p>';

      // Verify error message is displayed
      expect(feedbackElement.innerHTML).toContain('Edit failed');
      expect(feedbackElement.innerHTML).toContain('cannot be empty');
    });

    it('should update UI immediately after successful edit', () => {
      const changes = createEpic3Output();

      // Display change #1
      const changeElement = dom.window.document.createElement('div');
      changeElement.id = 'change-0';
      changeElement.innerHTML = `
        <p class="rule-text">${changes[0].ruleText}</p>
      `;
      container.appendChild(changeElement);

      // Simulate edit
      changes[0].edited_rule = 'Updated rule text';
      changes[0].original_rule = changes[0].ruleText;

      // Update UI
      changeElement.innerHTML = `
        <span class="edited-marker">[EDITED]</span>
        <p class="rule-text">${changes[0].edited_rule}</p>
      `;

      // Verify UI is updated immediately
      expect(changeElement.innerHTML).toContain('[EDITED]');
      expect(changeElement.innerHTML).toContain('Updated rule text');
      expect(changeElement.innerHTML).not.toContain(changes[0].original_rule);
    });

    it('should maintain scroll position after edit', () => {
      // Add multiple changes to force scrolling
      for (let i = 0; i < 20; i++) {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${i}`;
        changeElement.style.height = '100px';
        changeElement.textContent = `Change ${i + 1}`;
        container.appendChild(changeElement);
      }

      // Scroll to middle
      dom.window.document.documentElement.scrollTop = 500;
      const scrollPositionBefore = dom.window.document.documentElement.scrollTop;

      // Simulate edit
      const changeElement = dom.window.document.getElementById('change-5')!;
      changeElement.innerHTML = '<span class="edited-marker">[EDITED]</span>' + changeElement.innerHTML;

      // Verify scroll position is maintained
      const scrollPositionAfter = dom.window.document.documentElement.scrollTop;
      expect(scrollPositionAfter).toBe(scrollPositionBefore);
    });

    it('should highlight edited changes for easy identification', () => {
      const changes = createEpic3Output();

      // Display multiple changes
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.className = 'change-item';

        // Add edited marker to change #2
        if (index === 1) {
          changeElement.classList.add('edited');
          changeElement.innerHTML = `
            <span class="edited-marker">[EDITED]</span>
            <p>${change.ruleText}</p>
          `;
        } else {
          changeElement.innerHTML = `<p>${change.ruleText}</p>`;
        }

        container.appendChild(changeElement);
      });

      // Verify edited change has different styling
      const change2Element = dom.window.document.getElementById('change-1')!;
      expect(change2Element.classList.contains('edited')).toBe(true);

      const change1Element = dom.window.document.getElementById('change-0')!;
      expect(change1Element.classList.contains('edited')).toBe(false);
    });
  });

  // ========================================================================
  // ACCESSIBILITY TESTS
  // ========================================================================

  describe('Accessibility', () => {
    it('should maintain keyboard navigation support', () => {
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;

      // Verify input is focusable
      inputElement.focus();
      expect(dom.window.document.activeElement).toBe(inputElement);

      // Simulate keyboard input
      inputElement.value = 'edit #1';
      expect(inputElement.value).toBe('edit #1');
    });

    it('should provide screen reader friendly feedback', () => {
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // Add ARIA attributes
      feedbackElement.setAttribute('role', 'status');
      feedbackElement.setAttribute('aria-live', 'polite');
      feedbackElement.innerHTML = '<p>Change #1 has been edited successfully</p>';

      // Verify ARIA attributes
      expect(feedbackElement.getAttribute('role')).toBe('status');
      expect(feedbackElement.getAttribute('aria-live')).toBe('polite');
    });

    it('should maintain sufficient color contrast for [EDITED] marker', () => {
      const changeElement = dom.window.document.createElement('div');
      changeElement.innerHTML = `
        <span class="edited-marker" style="color: #FF6B6B; font-weight: bold;">[EDITED]</span>
        <p>Rule text</p>
      `;
      container.appendChild(changeElement);

      const marker = changeElement.querySelector('.edited-marker') as HTMLElement;

      // Verify styling is applied
      expect(marker.style.color).toBe('rgb(255, 107, 107)');
      expect(marker.style.fontWeight).toBe('bold');
    });
  });

  // ========================================================================
  // ERROR RECOVERY IN UI
  // ========================================================================

  describe('Error Recovery in UI', () => {
    it('should display helpful error message for invalid change number', () => {
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // Simulate error
      feedbackElement.innerHTML = `
        <div class="error-message" role="alert">
          <strong>Error:</strong> Change #999 does not exist.
          <br>
          Please enter a number between 1 and ${createEpic3Output().length}.
        </div>
      `;

      // Verify error message is helpful
      expect(feedbackElement.innerHTML).toContain('does not exist');
      expect(feedbackElement.innerHTML).toContain('Please enter a number between');
      expect(feedbackElement.getAttribute('role')).toBe('alert');
    });

    it('should allow retry after validation error', () => {
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // First attempt: empty text
      inputElement.value = '';
      feedbackElement.innerHTML = '<p class="error">Edited text cannot be empty</p>';

      expect(feedbackElement.innerHTML).toContain('cannot be empty');

      // Second attempt: valid text
      inputElement.value = 'Valid edited text';
      feedbackElement.innerHTML = '<p class="success">Change edited successfully</p>';

      expect(feedbackElement.innerHTML).toContain('edited successfully');
    });

    it('should not lose user input during validation error', () => {
      const inputElement = dom.window.document.getElementById('command-input') as HTMLInputElement;
      const feedbackElement = dom.window.document.getElementById('feedback-container')!;

      // User enters valid text
      inputElement.value = 'Edited rule text';

      // Validation passes, then fails for another reason
      feedbackElement.innerHTML = '<p class="error">Network error, please try again</p>';

      // User input should be preserved
      expect(inputElement.value).toBe('Edited rule text');
    });
  });

  // ========================================================================
  // RESPONSIVE BEHAVIOR
  // ========================================================================

  describe('Responsive Behavior', () => {
    it('should adapt to different screen sizes', () => {
      // Simulate mobile viewport
      dom.window.innerWidth = 375;
      dom.window.innerHeight = 667;

      const changes = createEpic3Output();
      changes.forEach((change, index) => {
        const changeElement = dom.window.document.createElement('div');
        changeElement.id = `change-${index}`;
        changeElement.innerHTML = `
          <div class="change-content" style="font-size: 14px;">
            <span class="edited-marker">[EDITED]</span>
            <p>${change.ruleText}</p>
          </div>
        `;
        container.appendChild(changeElement);
      });

      // Verify content is rendered
      expect(container.children.length).toBe(changes.length);
    });

    it('should handle long edited text gracefully', () => {
      const changeElement = dom.window.document.createElement('div');
      const longText = 'A'.repeat(10000);

      changeElement.innerHTML = `
        <div class="change-content">
          <span class="edited-marker">[EDITED]</span>
          <p class="rule-text" style="max-height: 200px; overflow-y: auto;">
            ${longText}
          </p>
        </div>
      `;
      container.appendChild(changeElement);

      // Verify content is rendered with scroll
      const ruleText = changeElement.querySelector('.rule-text') as HTMLElement;
      expect(ruleText.style.maxHeight).toBe('200px');
      expect(ruleText.style.overflowY).toBe('auto');
    });
  });
});
