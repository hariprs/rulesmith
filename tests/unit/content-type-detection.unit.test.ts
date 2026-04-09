/**
 * Unit Tests for Content Type Detection (Story 2-3)
 *
 * TDD Red Phase: Failing unit tests for business logic
 *
 * These tests validate the business logic for content type detection
 * without external dependencies or integration concerns.
 *
 * Testing Strategy:
 * - Test content type detection for each supported type
 * - Test confidence scoring algorithm
 * - Test pattern detection within content
 * - Test language detection for code
 * - Test edge cases and ambiguous content
 * - Test O(n) performance characteristics
 *
 * Test Pyramid Level: Unit (business logic validation)
 *
 * @todo Remove this todo when implementation is complete
 */

import {
  detectContentType,
  ContentType,
} from '../../src/content-analyzer';

// ============================================================================
// CODE CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - Code Content', () => {
  test('should detect TypeScript code with interface keyword', () => {
    const typescriptCode = 'interface User { name: string; age: number; }';
    const result = detectContentType(typescriptCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('TypeScript');
    expect(result.format).toBe('code-block');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('should detect TypeScript code with type annotations', () => {
    const typescriptCode = 'function processData(data: string): Result { return JSON.parse(data); }';
    const result = detectContentType(typescriptCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('TypeScript');
  });

  test('should detect JavaScript code with function keyword', () => {
    const javascriptCode = 'function fetchData() { return fetch("/api"); }';
    const result = detectContentType(javascriptCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('JavaScript');
  });

  test('should detect JavaScript code with const/let', () => {
    const javascriptCode = 'const x = 5; let y = 10;';
    const result = detectContentType(javascriptCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('JavaScript');
  });

  test('should detect Python code with def keyword', () => {
    const pythonCode = 'def process_data():\n    return {"key": "value"}';
    const result = detectContentType(pythonCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('Python');
  });

  test('should detect Python code with class keyword', () => {
    const pythonCode = 'class DataProcessor:\n    def process(self):\n        pass';
    const result = detectContentType(pythonCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('Python');
  });

  test('should detect Java code with public class', () => {
    const javaCode = 'public class UserData { private String name; }';
    const result = detectContentType(javaCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.language).toBe('Java');
  });

  test('should detect code with import statements', () => {
    const codeWithImports = 'import { useState } from "react";\nimport { API } from "./api";';
    const result = detectContentType(codeWithImports);

    expect(result.type).toBe(ContentType.CODE);
    });

  test('should detect code with async/await patterns', () => {
    const asyncCode = 'async function fetchData() {\n  const data = await fetch("/api");\n  return data;\n}';
    const result = detectContentType(asyncCode);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.detected_patterns).toContain('function-definitions');
  });

  test('should detect code in markdown code blocks', () => {
    const codeInMarkdown = '```typescript\nconst x: number = 5;\n```';
    const result = detectContentType(codeInMarkdown);

    expect(result.type).toBe(ContentType.CODE);
    expect(result.format).toBe('code-block');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should detect code patterns', () => {
    const codeWithPatterns = 'function getData() {\n  import fetch from "node-fetch";\n  const data = fetch();\n}';
    const result = detectContentType(codeWithPatterns);

    expect(result.detected_patterns).toContain('function-definitions');
    expect(result.detected_patterns).toContain('import-statements');
  });
});

// ============================================================================
// DOCUMENTATION CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - Documentation Content', () => {
  test('should detect markdown headers', () => {
    const markdownDoc = '# API Reference\n\n## Authentication\n\nUse API key for auth.';
    const result = detectContentType(markdownDoc);

    expect(result.type).toBe(ContentType.DOCUMENTATION);
    expect(result.format).toBe('markdown');
    expect(result.detected_patterns).toContain('markdown-headers');
  });

  test('should detect markdown lists', () => {
    const markdownList = '- Install dependencies\n- Configure API\n- Run tests';
    const result = detectContentType(markdownList);

    expect(result.type).toBe(ContentType.DOCUMENTATION);
    expect(result.detected_patterns).toContain('markdown-lists');
  });

  test('should detect documentation keywords', () => {
    const docWithKeywords = 'This API endpoint accepts parameters and returns JSON data.';
    const result = detectContentType(docWithKeywords);

    expect(result.type).toBe(ContentType.DOCUMENTATION);
    expect(result.detected_patterns).toContain('documentation-keywords');
  });

  test('should detect README-style documentation', () => {
    const readmeContent = `# Project Name

## Installation
\`\`\`bash
npm install
\`\`\`

## Usage
Import the module and use it.`;

    const result = detectContentType(readmeContent);

    expect(result.type).toBe(ContentType.DOCUMENTATION);
    expect(result.format).toBe('markdown');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('should detect API documentation', () => {
    const apiDoc = `## API Endpoint

### Parameters
- \`id\`: User ID (string)

### Returns
User object with name and email`;

    const result = detectContentType(apiDoc);

    expect(result.type).toBe(ContentType.DOCUMENTATION);
    expect(result.detected_patterns).toContain('markdown-headers');
  });
});

// ============================================================================
// DIAGRAM CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - Diagram Content', () => {
  test('should detect Mermaid syntax with graph', () => {
    const mermaidDiagram = '```mermaid\ngraph TD\n  A[Start] --> B[Process]\n  B --> C[End]\n```';
    const result = detectContentType(mermaidDiagram);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.format).toBe('mermaid');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.detected_patterns).toContain('mermaid-syntax');
  });

  test('should detect Mermaid flowchart', () => {
    const flowchart = '```mermaid\nflowchart LR\n  User -->|Login| System\n  System -->|Success| Dashboard\n```';
    const result = detectContentType(flowchart);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.format).toBe('mermaid');
  });

  test('should detect Mermaid sequence diagram', () => {
    const sequenceDiagram = '```mermaid\nsequenceDiagram\n  User->>System: Login\n  System-->>User: Success\n```';
    const result = detectContentType(sequenceDiagram);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.format).toBe('mermaid');
  });

  test('should detect diagram keywords in text', () => {
    const diagramText = 'Create a flowchart showing the user authentication process';
    const result = detectContentType(diagramText);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.detected_patterns).toContain('diagram-keywords');
  });

  test('should detect architecture diagram references', () => {
    const archDiagram = 'Draw an architecture diagram showing the microservices layout';
    const result = detectContentType(archDiagram);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.detected_patterns).toContain('diagram-keywords');
  });

  test('should detect ASCII art diagrams', () => {
    const asciiArt = `
+-------+     +-------+
| User  |---->| System|
+-------+     +-------+
    `;
    const result = detectContentType(asciiArt);

    expect(result.type).toBe(ContentType.DIAGRAM);
    expect(result.detected_patterns).toContain('ascii-art');
  });
});

// ============================================================================
// PRD CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - PRD Content', () => {
  test('should detect functional requirement format', () => {
    const frContent = 'FR-1: System shall support user authentication with email and password';
    const result = detectContentType(frContent);

    expect(result.type).toBe(ContentType.PRD);
    expect(result.format).toBe('structured-text');
    expect(result.detected_patterns).toContain('prd-keywords');
  });

  test('should detect user story format', () => {
    const userStory = 'User Story: As a user, I want to reset my password so that I can regain access';
    const result = detectContentType(userStory);

    expect(result.type).toBe(ContentType.PRD);
    expect(result.detected_patterns).toContain('prd-structure');
  });

  test('should detect acceptance criteria', () => {
    const acceptanceCriteria = 'Acceptance Criteria:\n1. User receives email with reset link\n2. Link expires in 24 hours';
    const result = detectContentType(acceptanceCriteria);

    expect(result.type).toBe(ContentType.PRD);
    expect(result.detected_patterns).toContain('prd-structure');
  });

  test('should detect epic format', () => {
    const epicContent = 'Epic: User Management\nStories:\n- User registration\n- User authentication';
    const result = detectContentType(epicContent);

    expect(result.type).toBe(ContentType.PRD);
    expect(result.detected_patterns).toContain('prd-structure');
  });

  test('should detect feature requirements', () => {
    const featureContent = 'Feature: Search Functionality\nRequirements:\n- Full-text search\n- Filter by category';
    const result = detectContentType(featureContent);

    expect(result.type).toBe(ContentType.PRD);
  });

  test('should detect non-functional requirements', () => {
    const nfrContent = 'NFR-1: System response time shall be under 200ms for 95% of requests';
    const result = detectContentType(nfrContent);

    expect(result.type).toBe(ContentType.PRD);
    expect(result.detected_patterns).toContain('prd-keywords');
  });
});

// ============================================================================
// TEST PLAN CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - Test Plan Content', () => {
  test('should detect BDD Given-When-Then format', () => {
    const bddTest = 'Given user is logged in\nWhen they click logout\nThen session is terminated';
    const result = detectContentType(bddTest);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.format).toBe('structured-text');
    expect(result.detected_patterns).toContain('test-structure');
  });

  test('should detect test case format', () => {
    const testCase = 'Test Case: Verify user login\nExpected Result: User is redirected to dashboard';
    const result = detectContentType(testCase);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.detected_patterns).toContain('test-structure');
  });

  test('should detect unit test references', () => {
    const unitTest = 'Write a unit test to verify the calculateTotal function';
    const result = detectContentType(unitTest);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.detected_patterns).toContain('test-keywords');
  });

  test('should detect integration test references', () => {
    const integrationTest = 'Create an integration test for the API endpoint';
    const result = detectContentType(integrationTest);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.detected_patterns).toContain('test-keywords');
  });

  test('should detect mock and stub references', () => {
    const mockTest = 'Mock the external API and stub the database responses';
    const result = detectContentType(mockTest);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.detected_patterns).toContain('test-keywords');
  });

  test('should detect assert and expect patterns', () => {
    const assertTest = 'Assert that the response status is 200\nExpect the user object to be returned';
    const result = detectContentType(assertTest);

    expect(result.type).toBe(ContentType.TEST_PLAN);
    expect(result.detected_patterns).toContain('test-keywords');
  });
});

// ============================================================================
// GENERAL TEXT CONTENT DETECTION
// ============================================================================

describe('Content Type Detection - General Text Content', () => {
  test('should detect general text as fallback', () => {
    const generalText = 'Use this instead of that for better results';
    const result = detectContentType(generalText);

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
    expect(result.format).toBe('plain-text');
  });

  test('should handle short corrections', () => {
    const shortCorrection = 'Use Vue instead';
    const result = detectContentType(shortCorrection);

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
  });

  test('should handle simple preferences', () => {
    const simplePreference = 'I prefer tabs over spaces';
    const result = detectContentType(simplePreference);

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
  });

  test('should have low confidence for general text', () => {
    const generalText = 'Do that instead';
    const result = detectContentType(generalText);

    expect(result.confidence).toBeLessThan(0.7);
  });
});

// ============================================================================
// CONFIDENCE SCORING
// ============================================================================

describe('Content Type Detection - Confidence Scoring', () => {
  test('should have high confidence (>= 0.9) for explicit code blocks', () => {
    const explicitCode = '```typescript\nconst x = 5;\n```';
    const result = detectContentType(explicitCode);

    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should have high confidence (>= 0.9) for Mermaid diagrams', () => {
    const mermaidContent = '```mermaid\ngraph TD\n  A --> B\n```';
    const result = detectContentType(mermaidContent);

    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should have medium confidence (>= 0.7) for documentation', () => {
    const docContent = '## API Reference\n\nThis is the documentation';
    const result = detectContentType(docContent);

    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('should have medium confidence (>= 0.7) for PRD structure', () => {
    const prdContent = 'FR-1: System shall support authentication';
    const result = detectContentType(prdContent);

    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('should have medium confidence (>= 0.7) for test structure', () => {
    const testContent = 'Given user is logged in\nWhen they logout\nThen session ends';
    const result = detectContentType(testContent);

    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  test('should have low confidence (< 0.7) for general text', () => {
    const generalText = 'Use this instead';
    const result = detectContentType(generalText);

    expect(result.confidence).toBeLessThan(0.7);
  });

  test('should always return confidence between 0 and 1', () => {
    const testCases = [
      '```typescript\nconst x = 5;\n```',
      '## Documentation\n\nText here',
      'Use this instead',
      'FR-1: Requirement',
      'Given When Then',
      '',
      'x',
    ];

    testCases.forEach((testCase) => {
      const result = detectContentType(testCase);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });
});

// ============================================================================
// PATTERN DETECTION
// ============================================================================

describe('Content Type Detection - Pattern Detection', () => {
  test('should detect function definition patterns', () => {
    const functionCode = 'function processData() { return data; }';
    const result = detectContentType(functionCode);

    expect(result.detected_patterns).toContain('function-definitions');
  });

  test('should detect import statement patterns', () => {
    const importCode = 'import { Component } from "react";';
    const result = detectContentType(importCode);

    expect(result.detected_patterns).toContain('import-statements');
  });

  test('should detect markdown header patterns', () => {
    const headerContent = '# Header\n\n## Subheader\n\nContent';
    const result = detectContentType(headerContent);

    expect(result.detected_patterns).toContain('markdown-headers');
  });

  test('should detect markdown list patterns', () => {
    const listContent = '- Item 1\n- Item 2\n- Item 3';
    const result = detectContentType(listContent);

    expect(result.detected_patterns).toContain('markdown-lists');
  });

  test('should detect Mermaid syntax patterns', () => {
    const mermaidContent = '```mermaid\ngraph TD\n```';
    const result = detectContentType(mermaidContent);

    expect(result.detected_patterns).toContain('mermaid-syntax');
  });

  test('should detect diagram keyword patterns', () => {
    const diagramKeywords = 'Create a flowchart for the authentication process';
    const result = detectContentType(diagramKeywords);

    expect(result.detected_patterns).toContain('diagram-keywords');
  });

  test('should detect PRD structure patterns', () => {
    const prdStructure = 'User Story: As a user, I want to...';
    const result = detectContentType(prdStructure);

    expect(result.detected_patterns).toContain('prd-structure');
  });

  test('should detect PRD keyword patterns', () => {
    const prdKeywords = 'FR-1 and NFR-2 requirements';
    const result = detectContentType(prdKeywords);

    expect(result.detected_patterns).toContain('prd-keywords');
  });

  test('should detect test structure patterns', () => {
    const testStructure = 'Given user is logged in\nWhen action\nThen result';
    const result = detectContentType(testStructure);

    expect(result.detected_patterns).toContain('test-structure');
  });

  test('should detect test keyword patterns', () => {
    const testKeywords = 'Write unit tests and integration tests with mocks';
    const result = detectContentType(testKeywords);

    expect(result.detected_patterns).toContain('test-keywords');
  });

  test('should return empty patterns array for general text', () => {
    const generalText = 'Use this instead';
    const result = detectContentType(generalText);

    expect(result.detected_patterns).toEqual([]);
  });
});

// ============================================================================
// EDGE CASES AND BOUNDARY CONDITIONS
// ============================================================================

describe('Content Type Detection - Edge Cases', () => {
  test('should handle empty string', () => {
    const result = detectContentType('');

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
    expect(result.confidence).toBeLessThan(0.7);
  });

  test('should handle whitespace only', () => {
    const result = detectContentType('   \n\t  ');

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
  });

  test('should handle single character', () => {
    const result = detectContentType('x');

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
  });

  test('should handle special characters only', () => {
    const result = detectContentType('!@#$%');

    expect(result.type).toBe(ContentType.GENERAL_TEXT);
  });

  test('should handle mixed content (code + documentation)', () => {
    const mixedContent = `## Documentation

\`\`\`typescript
const x = 5;
\`\`\`

This is the explanation.`;

    const result = detectContentType(mixedContent);

    // Should detect the dominant content type
    expect(result.type).toBeDefined();
    expect(Object.values(ContentType)).toContain(result.type);
  });

  test('should handle very long content', () => {
    const longContent = 'const x = 5;\n'.repeat(1000);

    expect(() => {
      detectContentType(longContent);
    }).not.toThrow();
  });

  test('should handle unicode characters', () => {
    const unicodeContent = 'function processData() { const data = "测试数据"; return data; }';
    const result = detectContentType(unicodeContent);

    expect(result.type).toBe(ContentType.CODE);
  });

  test('should handle ambiguous content', () => {
    const ambiguousContent = 'Use the function to process the data';
    const result = detectContentType(ambiguousContent);

    // Should not crash and should return some type
    expect(result.type).toBeDefined();
    expect(Object.values(ContentType)).toContain(result.type);
  });
});

// ============================================================================
// PERFORMANCE CHARACTERISTICS
// ============================================================================

describe('Content Type Detection - Performance', () => {
  test('should process short content quickly', () => {
    const shortContent = 'Use async/await instead';

    const startTime = Date.now();
    detectContentType(shortContent);
    const endTime = Date.now();

    // Should complete in less than 10ms for short content
    expect(endTime - startTime).toBeLessThan(10);
  });

  test('should process medium content efficiently', () => {
    const mediumContent = '## Documentation\n\n' + 'Content here\n'.repeat(50);

    const startTime = Date.now();
    detectContentType(mediumContent);
    const endTime = Date.now();

    // Should complete in less than 50ms for medium content
    expect(endTime - startTime).toBeLessThan(50);
  });

  test('should process long content efficiently', () => {
    const longContent = 'function test() { return data; }\n'.repeat(1000);

    const startTime = Date.now();
    detectContentType(longContent);
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
      const startTime = Date.now();
      detectContentType(content);
      const endTime = Date.now();
      times.push(endTime - startTime);
    });

    // Time should scale roughly linearly with input size
    // Allow for some variance due to system load
    for (let i = 1; i < times.length; i++) {
      const ratio = times[i] / times[i - 1];
      const sizeRatio = sizes[i] / sizes[i - 1];
      // Time ratio should be within reasonable bounds of size ratio
      expect(ratio).toBeLessThan(sizeRatio * 2);
    }
  });
});
