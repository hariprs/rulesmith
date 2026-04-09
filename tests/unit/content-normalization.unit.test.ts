/**
 * Unit Tests for Content Normalization (Story 2-3)
 *
 * TDD Red Phase: Failing unit tests for business logic
 *
 * These tests validate the business logic for content normalization
 * without external dependencies or integration concerns.
 *
 * Testing Strategy:
 * - Test normalization for each content type
 * - Test preservation of semantic meaning
 * - Test removal of formatting artifacts
 * - Test edge cases and malformed content
 * - Test O(n) performance characteristics
 *
 * Test Pyramid Level: Unit (business logic validation)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  normalizeContent,
  ContentType,
  type ContentMetadata,
} from '../../src/content-analyzer';

// ============================================================================
// CODE CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - Code Content', () => {
  test('should extract code from markdown code blocks', () => {
    const codeWithBlocks = '```typescript\nconst x: number = 5;\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(codeWithBlocks, metadata);

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('const x: number = 5;');
  });

  test('should normalize code indentation', () => {
    const codeWithIndentation = '```javascript\n  function test() {\n    return true;\n  }\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'JavaScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(codeWithIndentation, metadata);

    // Indentation should be normalized (trimmed)
    expect(normalized.trim()).toBe(normalized);
  });

  test('should preserve language-specific patterns', () => {
    const typescriptCode = 'interface User {\n  name: string;\n  age: number;\n}';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(typescriptCode, metadata);

    // Type annotations should be preserved
    expect(normalized).toContain('name: string');
    expect(normalized).toContain('age: number');
  });

  test('should handle code without code blocks', () => {
    const plainCode = 'const x = 5;';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'JavaScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.7,
    };

    const normalized = normalizeContent(plainCode, metadata);

    expect(normalized.trim()).toBe('const x = 5;');
  });

  test('should handle multiple code blocks', () => {
    const multipleBlocks = '```typescript\nconst x = 5;\n```\nSome text\n```typescript\nconst y = 10;\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(multipleBlocks, metadata);

    // Should extract code from blocks
    expect(normalized).not.toContain('```');
  });

  test('should preserve function signatures', () => {
    const functionCode = 'async function fetchData(url: string): Promise<Data> {\n  const response = await fetch(url);\n  return response.json();\n}';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(functionCode, metadata);

    // Function signature should be preserved
    expect(normalized).toContain('async function fetchData');
    expect(normalized).toContain('url: string');
  });

  test('should handle Python code', () => {
    const pythonCode = '```python\ndef process_data():\n    return {"key": "value"}\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'Python',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(pythonCode, metadata);

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('def process_data');
  });

  test('should handle Java code', () => {
    const javaCode = '```java\npublic class UserData {\n  private String name;\n}\n```';
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'Java',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(javaCode, metadata);

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('public class UserData');
  });
});

// ============================================================================
// DOCUMENTATION CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - Documentation Content', () => {
  test('should strip markdown headers', () => {
    const headersContent = '## API Reference\n\nThis is the API documentation.';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: ['markdown-headers'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(headersContent, metadata);

    expect(normalized).not.toContain('##');
    expect(normalized).toContain('API Reference');
  });

  test('should strip markdown bold formatting', () => {
    const boldContent = '**Important:** This is a critical point.';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(boldContent, metadata);

    expect(normalized).not.toContain('**');
    expect(normalized).toContain('Important:');
  });

  test('should strip markdown italic formatting', () => {
    const italicContent = '*Note:* This is additional information.';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(italicContent, metadata);

    expect(normalized).not.toContain('*');
    expect(normalized).toContain('Note:');
  });

  test('should strip inline code formatting', () => {
    const inlineCodeContent = 'Use the `getData()` function to fetch data.';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(inlineCodeContent, metadata);

    expect(normalized).not.toContain('`');
    expect(normalized).toContain('getData()');
  });

  test('should normalize list markers', () => {
    const listContent = '- First item\n- Second item\n- Third item';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: ['markdown-lists'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(listContent, metadata);

    // List markers should be normalized
    expect(normalized).toContain('•');
  });

  test('should preserve structure hierarchy', () => {
    const hierarchicalContent = '# Main Section\n\n## Subsection\n\nContent here';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: ['markdown-headers'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(hierarchicalContent, metadata);

    // Structure should be preserved (headers removed but content kept)
    expect(normalized).toContain('Main Section');
    expect(normalized).toContain('Subsection');
  });

  test('should handle mixed markdown formatting', () => {
    const mixedContent = '## **Important** Note\n\nUse the `API` function. See *docs* for details.';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.9,
    };

    const normalized = normalizeContent(mixedContent, metadata);

    expect(normalized).not.toContain('##');
    expect(normalized).not.toContain('**');
    expect(normalized).not.toContain('`');
    expect(normalized).not.toContain('*');
  });
});

// ============================================================================
// DIAGRAM CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - Diagram Content', () => {
  test('should extract Mermaid diagram descriptions', () => {
    const mermaidDiagram = '```mermaid\ngraph TD\n  A[Start] --> B[Process]\n  B --> C[End]\n```';
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'mermaid',
      detected_patterns: ['mermaid-syntax'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(mermaidDiagram, metadata);

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('graph TD');
  });

  test('should preserve diagram structural keywords', () => {
    const diagramWithKeywords = 'graph TD\n  A[User] -->|Login| B[System]\n  B -->|Success| C[Dashboard]';
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'mermaid',
      detected_patterns: ['mermaid-syntax'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(diagramWithKeywords, metadata);

    // Structural keywords should be preserved
    expect(normalized).toContain('graph');
    expect(normalized).toContain('-->');
  });

  test('should handle text-based diagram descriptions', () => {
    const textDiagram = 'Create a flowchart showing user authentication flow from login to dashboard';
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'text-description',
      detected_patterns: ['diagram-keywords'],
      confidence: 0.7,
    };

    const normalized = normalizeContent(textDiagram, metadata);

    // Text description should be preserved
    expect(normalized).toContain('flowchart');
    expect(normalized).toContain('authentication');
  });

  test('should handle sequence diagrams', () => {
    const sequenceDiagram = '```mermaid\nsequenceDiagram\n  User->>System: Login\n  System-->>User: Success\n```';
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'mermaid',
      detected_patterns: ['mermaid-syntax'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(sequenceDiagram, metadata);

    expect(normalized).not.toContain('```');
    expect(normalized).toContain('sequenceDiagram');
  });

  test('should handle ASCII art diagrams', () => {
    const asciiArt = `
+-------+     +-------+
| User  |---->| System|
+-------+     +-------+
    `;
    const metadata: ContentMetadata = {
      type: ContentType.DIAGRAM,
      format: 'text-description',
      detected_patterns: ['ascii-art'],
      confidence: 0.7,
    };

    const normalized = normalizeContent(asciiArt, metadata);

    // ASCII art should be preserved or normalized
    expect(normalized.trim().length).toBeGreaterThan(0);
  });
});

// ============================================================================
// PRD CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - PRD Content', () => {
  test('should extract requirement statements', () => {
    const prdContent = 'FR-1: System shall support user authentication';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: ['prd-keywords'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(prdContent, metadata);

    expect(normalized).toContain('FR-1');
    expect(normalized).toContain('user authentication');
  });

  test('should preserve structured content', () => {
    const structuredPrd = 'Feature: User Management\n\nRequirements:\n- User registration\n- User authentication\n- User profile';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: ['prd-structure'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(structuredPrd, metadata);

    // Structure should be preserved
    expect(normalized).toContain('User Management');
    expect(normalized).toContain('registration');
    expect(normalized).toContain('authentication');
  });

  test('should handle table formatting', () => {
    const tableContent = '| ID | Requirement | Priority |\n|----|-------------|----------|\n| FR-1 | Authentication | High |';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(tableContent, metadata);

    // Table borders should be removed
    expect(normalized).not.toContain('|');
  });

  test('should normalize multiple spaces', () => {
    const multipleSpaces = 'FR-1:  System  shall  support  authentication';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(multipleSpaces, metadata);

    // Multiple spaces should be normalized
    expect(normalized).not.toContain('  ');
  });

  test('should handle user stories', () => {
    const userStory = 'User Story: As a user, I want to reset my password, so that I can regain access to my account';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: ['prd-structure'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(userStory, metadata);

    // User story structure should be preserved
    expect(normalized).toContain('As a user');
    expect(normalized).toContain('reset my password');
  });

  test('should handle acceptance criteria', () => {
    const acceptanceCriteria = 'Acceptance Criteria:\n1. User receives email with reset link\n2. Link expires in 24 hours\n3. User can set new password';
    const metadata: ContentMetadata = {
      type: ContentType.PRD,
      format: 'structured-text',
      detected_patterns: ['prd-structure'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(acceptanceCriteria, metadata);

    // Criteria should be preserved
    expect(normalized).toContain('email with reset link');
    expect(normalized).toContain('expires in 24 hours');
  });
});

// ============================================================================
// TEST PLAN CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - Test Plan Content', () => {
  test('should preserve BDD structure', () => {
    const bddContent = 'Given user is logged in\nWhen they click logout\nThen session is terminated';
    const metadata: ContentMetadata = {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: ['test-structure'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(bddContent, metadata);

    // BDD keywords should be preserved
    expect(normalized).toContain('Given');
    expect(normalized).toContain('When');
    expect(normalized).toContain('Then');
  });

  test('should preserve test case structure', () => {
    const testCase = 'Test Case: Verify user login\n\nExpected Result: User is redirected to dashboard';
    const metadata: ContentMetadata = {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: ['test-structure'],
      confidence: 0.9,
    };

    const normalized = normalizeContent(testCase, metadata);

    // Test structure should be preserved
    expect(normalized).toContain('Verify user login');
    expect(normalized).toContain('redirected to dashboard');
  });

  test('should handle mock and stub references', () => {
    const mockContent = 'Mock the external API and stub the database responses';
    const metadata: ContentMetadata = {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: ['test-keywords'],
      confidence: 0.8,
    };

    const normalized = normalizeContent(mockContent, metadata);

    // Test keywords should be preserved
    expect(normalized).toContain('Mock');
    expect(normalized).toContain('stub');
  });

  test('should handle assert and expect patterns', () => {
    const assertContent = 'Assert that the response status is 200\nExpect the user object to be returned';
    const metadata: ContentMetadata = {
      type: ContentType.TEST_PLAN,
      format: 'structured-text',
      detected_patterns: ['test-keywords'],
      confidence: 0.8,
    };

    const normalized = normalizeContent(assertContent, metadata);

    // Test keywords should be preserved
    expect(normalized).toContain('Assert');
    expect(normalized).toContain('Expect');
  });
});

// ============================================================================
// GENERAL TEXT CONTENT NORMALIZATION
// ============================================================================

describe('Content Normalization - General Text Content', () => {
  test('should use general text as-is', () => {
    const generalText = 'Use this instead of that for better results';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(generalText, metadata);

    // General text should be preserved as-is
    expect(normalized.trim()).toBe('Use this instead of that for better results');
  });

  test('should trim whitespace', () => {
    const textWithWhitespace = '  Use this instead  ';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(textWithWhitespace, metadata);

    expect(normalized).toBe('Use this instead');
  });

  test('should handle simple preferences', () => {
    const simplePreference = 'I prefer tabs over spaces for indentation';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(simplePreference, metadata);

    expect(normalized).toContain('prefer tabs over spaces');
  });

  test('should handle short corrections', () => {
    const shortCorrection = 'Use Vue instead';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(shortCorrection, metadata);

    expect(normalized).toBe('Use Vue instead');
  });
});

// ============================================================================
// EDGE CASES AND ERROR HANDLING
// ============================================================================

describe('Content Normalization - Edge Cases', () => {
  test('should handle empty string', () => {
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent('', metadata);

    expect(normalized).toBe('');
  });

  test('should handle whitespace only', () => {
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent('   \n\t  ', metadata);

    expect(normalized.trim()).toBe('');
  });

  test('should handle very long content', () => {
    const longContent = 'const x = 5;\n'.repeat(10000);
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'JavaScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    expect(() => {
      normalizeContent(longContent, metadata);
    }).not.toThrow();
  });

  test('should handle unicode characters', () => {
    const unicodeContent = '## 文档\n\nこれはテストです';
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.8,
    };

    const normalized = normalizeContent(unicodeContent, metadata);

    expect(normalized).toContain('文档');
    expect(normalized).toContain('テスト');
  });

  test('should handle special characters', () => {
    const specialChars = 'Use @#$%^&*() for special cases';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const normalized = normalizeContent(specialChars, metadata);

    expect(normalized).toContain('@#$%^&*()');
  });
});

// ============================================================================
// PERFORMANCE CHARACTERISTICS
// ============================================================================

describe('Content Normalization - Performance', () => {
  test('should normalize short content quickly', () => {
    const shortContent = 'Use async/await instead';
    const metadata: ContentMetadata = {
      type: ContentType.GENERAL_TEXT,
      format: 'plain-text',
      detected_patterns: [],
      confidence: 0.5,
    };

    const startTime = Date.now();
    normalizeContent(shortContent, metadata);
    const endTime = Date.now();

    // Should complete in less than 10ms for short content
    expect(endTime - startTime).toBeLessThan(10);
  });

  test('should normalize medium content efficiently', () => {
    const mediumContent = '## Documentation\n\n' + 'Content here\n'.repeat(100);
    const metadata: ContentMetadata = {
      type: ContentType.DOCUMENTATION,
      format: 'markdown',
      detected_patterns: [],
      confidence: 0.9,
    };

    const startTime = Date.now();
    normalizeContent(mediumContent, metadata);
    const endTime = Date.now();

    // Should complete in less than 50ms for medium content
    expect(endTime - startTime).toBeLessThan(50);
  });

  test('should normalize long content efficiently', () => {
    const longContent = '```typescript\nconst x = 5;\n```\n'.repeat(1000);
    const metadata: ContentMetadata = {
      type: ContentType.CODE,
      language: 'TypeScript',
      format: 'code-block',
      detected_patterns: [],
      confidence: 0.9,
    };

    const startTime = Date.now();
    normalizeContent(longContent, metadata);
    const endTime = Date.now();

    // Should complete in less than 500ms for long content
    expect(endTime - startTime).toBeLessThan(500);
  });

  test('should have O(n) time complexity', () => {
    // Test with increasing content sizes
    const sizes = [100, 500, 1000, 5000];
    const times: number[] = [];

    sizes.forEach((size) => {
      const content = 'const x = 5;\n'.repeat(size);
      const metadata: ContentMetadata = {
        type: ContentType.CODE,
        language: 'JavaScript',
        format: 'code-block',
        detected_patterns: [],
        confidence: 0.9,
      };

      const startTime = Date.now();
      normalizeContent(content, metadata);
      const endTime = Date.now();
      times.push(endTime - startTime);
    });

    // Time should scale roughly linearly with input size
    for (let i = 1; i < times.length; i++) {
      const ratio = times[i] / times[i - 1];
      const sizeRatio = sizes[i] / sizes[i - 1];
      // Time ratio should be within reasonable bounds of size ratio
      expect(ratio).toBeLessThan(sizeRatio * 2);
    }
  });
});
