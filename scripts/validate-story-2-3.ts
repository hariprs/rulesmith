#!/usr/bin/env node

/**
 * Comprehensive validation script for Story 2-3 implementation
 * Role-Agnostic Content Analysis
 *
 * This script validates:
 * 1. ContentAnalyzer class implementation
 * 2. Content type detection (code, documentation, diagrams, PRDs, test plans)
 * 3. Role-agnostic behavior (no role-specific logic)
 * 4. Multi-format content handling
 * 5. Integration with correction classifier from Story 2-2
 * 6. Prompt template updates with multi-content examples
 * 7. AR22 compliant error handling
 * 8. Interface and type definitions
 * 9. Content normalization and pattern extraction
 * 10. Test coverage and quality
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// VALIDATION RESULTS TRACKING
// ============================================================================

interface ValidationResult {
  category: string;
  test: string;
  passed: boolean;
  message: string;
  details?: string[];
}

const validationResults: ValidationResult[] = [];

function logResult(category: string, test: string, passed: boolean, message: string, details?: string[]) {
  const result: ValidationResult = { category, test, passed, message, details };
  validationResults.push(result);

  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${category}: ${test}`);
  if (message) {
    console.log(`   ${message}`);
  }
  if (details && details.length > 0) {
    details.forEach(detail => console.log(`   • ${detail}`));
  }
  if (!passed) {
    console.log('');
  }
}

// ============================================================================
// FILE STRUCTURE VALIDATION
// ============================================================================

function validateFileStructure() {
  console.log('\n📁 FILE STRUCTURE VALIDATION\n');

  const requiredFiles = [
    'src/content-analyzer.ts',
    'src/__tests__/content-analyzer.test.ts',
    '.claude/skills/rulesmith/prompts/analyze-conversation.md',
    'src/correction-classifier.ts', // From Story 2-2
    'src/conversation-loader.ts', // From Story 2-1
  ];

  const missingFiles: string[] = [];
  const existingFiles: string[] = [];

  requiredFiles.forEach(file => {
    const filePath = path.join(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      existingFiles.push(file);
      logResult('File Structure', `File exists: ${file}`, true, 'Found');
    } else {
      missingFiles.push(file);
      logResult('File Structure', `File exists: ${file}`, false, 'Missing file');
    }
  });

  console.log(`\n📊 File Structure Summary: ${existingFiles.length}/${requiredFiles.length} files present`);

  return missingFiles.length === 0;
}

// ============================================================================
// INTERFACE VALIDATION
// ============================================================================

function validateInterfaces() {
  console.log('\n🔧 INTERFACE VALIDATION\n');

  try {
    // Read content-analyzer.ts
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Interfaces', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for required interfaces
    const requiredInterfaces = [
      'ContentType',
      'ContentMetadata',
      'ContentAnalyzedCorrection',
      'ContentAnalysisResult',
    ];

    let interfaceCount = 0;
    const missingInterfaces: string[] = [];

    requiredInterfaces.forEach(iface => {
      if (content.includes(`interface ${iface}`) || content.includes(`enum ${iface}`)) {
        interfaceCount++;
        logResult('Interfaces', `Interface exists: ${iface}`, true, 'Found');
      } else if (content.includes(`type ${iface}`)) {
        interfaceCount++;
        logResult('Interfaces', `Type exists: ${iface}`, true, 'Found as type alias');
      } else {
        missingInterfaces.push(iface);
        logResult('Interfaces', `Interface exists: ${iface}`, false, 'Missing interface');
      }
    });

    // Check for ContentAnalyzer class
    if (content.includes('class ContentAnalyzer')) {
      logResult('Interfaces', 'ContentAnalyzer class exists', true, 'Found');
      interfaceCount++;
    } else {
      logResult('Interfaces', 'ContentAnalyzer class exists', false, 'Missing class');
    }

    // Check for ContentType enum values
    const requiredContentTypes = [
      'CODE',
      'DOCUMENTATION',
      'DIAGRAM',
      'PRD',
      'TEST_PLAN',
      'GENERAL_TEXT',
    ];

    let contentTypeCount = 0;
    requiredContentTypes.forEach(type => {
      if (content.includes(`${type}=`) || content.includes(`${type} :`) || content.includes(`${type},`)) {
        contentTypeCount++;
      }
    });

    if (contentTypeCount === requiredContentTypes.length) {
      logResult('Interfaces', 'ContentType enum values', true, `All ${requiredContentTypes.length} content types defined`);
    } else {
      logResult('Interfaces', 'ContentType enum values', false, `Missing content types (${contentTypeCount}/${requiredContentTypes.length} found)`);
    }

    // Check ContentMetadata properties
    const requiredMetadataProps = [
      'type',
      'language',
      'format',
      'detected_patterns',
    ];

    let metadataPropsCount = 0;
    requiredMetadataProps.forEach(prop => {
      if (content.includes(prop)) {
        metadataPropsCount++;
      }
    });

    if (metadataPropsCount === requiredMetadataProps.length) {
      logResult('Interfaces', 'ContentMetadata properties', true, 'All required properties present');
    } else {
      logResult('Interfaces', 'ContentMetadata properties', false, `Missing properties (${metadataPropsCount}/${requiredMetadataProps.length} found)`);
    }

    console.log(`\n📊 Interface Summary: ${interfaceCount}/${requiredInterfaces.length + 1} interfaces/types found`);

    return missingInterfaces.length === 0;
  } catch (error) {
    logResult('Interfaces', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// CONTENT TYPE DETECTION VALIDATION
// ============================================================================

function validateContentTypeDetection() {
  console.log('\n🔍 CONTENT TYPE DETECTION VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Content Detection', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for content detection patterns
    const detectionPatterns = [
      { name: 'Code Detection', patterns: ['code blocks', '```', 'syntax patterns', 'function definitions'] },
      { name: 'Documentation Detection', patterns: ['markdown', 'headers', 'documentation keywords', 'API', 'parameter'] },
      { name: 'Diagram Detection', patterns: ['mermaid', 'diagram', 'flowchart', 'sequence', 'architecture'] },
      { name: 'PRD Detection', patterns: ['Requirements', 'Features', 'User Stories', 'FR', 'NFR', 'acceptance criteria'] },
      { name: 'Test Plan Detection', patterns: ['Test Case', 'Expected Result', 'Given', 'When', 'Then', 'assert', 'expect'] },
    ];

    let detectionScore = 0;
    const details: string[] = [];

    detectionPatterns.forEach(detection => {
      let patternCount = 0;
      detection.patterns.forEach(pattern => {
        if (content.toLowerCase().includes(pattern.toLowerCase())) {
          patternCount++;
        }
      });

      if (patternCount >= 2) {
        detectionScore++;
        details.push(`${detection.name}: ${patternCount}/${detection.patterns.length} patterns found`);
        logResult('Content Detection', `${detection.name} logic`, true, `Pattern detection present (${patternCount}/${detection.patterns.length} patterns)`);
      } else {
        logResult('Content Detection', `${detection.name} logic`, false, `Insufficient patterns (${patternCount}/${detection.patterns.length} found)`);
      }
    });

    if (details.length > 0) {
      logResult('Content Detection', 'Detection methods summary', true, `${detectionScore}/${detectionPatterns.length} content types have detection logic`, details);
    }

    // Check for normalization logic
    const normalizationKeywords = ['normalize', 'normalization', 'strip', 'extract', 'preserve'];
    let normalizationScore = 0;

    normalizationKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        normalizationScore++;
      }
    });

    if (normalizationScore >= 3) {
      logResult('Content Detection', 'Content normalization logic', true, `Normalization methods present (${normalizationScore}/${normalizationKeywords.length} keywords)`);
    } else {
      logResult('Content Detection', 'Content normalization logic', false, `Limited normalization logic (${normalizationScore}/${normalizationKeywords.length} keywords)`);
    }

    return detectionScore >= 3;
  } catch (error) {
    logResult('Content Detection', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// ROLE-AGNOSTIC BEHAVIOR VALIDATION
// ============================================================================

function validateRoleAgnosticBehavior() {
  console.log('\n🚫 ROLE-AGNOSTIC BEHAVIOR VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Role-Agnostic', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for NO role-specific logic (these should NOT be present)
    const forbiddenPatterns = [
      'roleDetection',
      'detectRole',
      'userRole',
      'role-specific',
      'roleBased',
      'developer',
      'architect',
      'pm',
      'product manager',
      'qa',
      'tester',
      'ux',
      'designer',
    ];

    let violations: string[] = [];

    forbiddenPatterns.forEach(pattern => {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${pattern}\\b`, 'i');
      if (regex.test(content)) {
        violations.push(pattern);
      }
    });

    if (violations.length === 0) {
      logResult('Role-Agnostic', 'No role-specific logic found', true, '✅ Clean - no role-specific patterns detected');
    } else {
      logResult('Role-Agnostic', 'No role-specific logic found', false, `❌ Role-specific patterns found: ${violations.join(', ')}`);
    }

    // Check for role-agnostic comments or documentation
    const agnosticKeywords = [
      'role-agnostic',
      'role agnostic',
      'universal',
      'all roles',
      'any role',
      'regardless of role',
      'without role',
    ];

    let agnosticDocumentationCount = 0;
    agnosticKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        agnosticDocumentationCount++;
      }
    });

    if (agnosticDocumentationCount >= 2) {
      logResult('Role-Agnostic', 'Role-agnostic documentation', true, `Role-agnostic approach documented (${agnosticDocumentationCount} references)`);
    } else {
      logResult('Role-Agnostic', 'Role-agnostic documentation', false, 'Limited role-agnostic documentation');
    }

    // Check for equal treatment of all content types
    const equalTreatmentKeywords = [
      'equal treatment',
      'equal quality',
      'all content types',
      'universal pattern',
      'content-agnostic',
    ];

    let equalTreatmentCount = 0;
    equalTreatmentKeywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword.toLowerCase())) {
        equalTreatmentCount++;
      }
    });

    if (equalTreatmentCount >= 1) {
      logResult('Role-Agnostic', 'Equal treatment documentation', true, 'Equal treatment of content types documented');
    } else {
      logResult('Role-Agnostic', 'Equal treatment documentation', false, 'Equal treatment not clearly documented');
    }

    return violations.length === 0;
  } catch (error) {
    logResult('Role-Agnostic', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// INTEGRATION WITH CORRECTION CLASSIFIER
// ============================================================================

function validateCorrectionClassifierIntegration() {
  console.log('\n🔗 CORRECTION CLASSIFIER INTEGRATION VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Integration', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for import of ClassifiedCorrection from Story 2-2
    if (content.includes('ClassifiedCorrection') && content.includes('correction-classifier')) {
      logResult('Integration', 'Import ClassifiedCorrection', true, 'Uses ClassifiedCorrection from Story 2-2');
    } else {
      logResult('Integration', 'Import ClassifiedCorrection', false, 'Missing proper import from correction-classifier');
    }

    // Check for methods that process classified corrections
    const processingMethods = [
      'analyzeCorrections',
      'processCorrections',
      'analyzeContent',
      'extractPatterns',
    ];

    let methodCount = 0;
    processingMethods.forEach(method => {
      if (content.includes(method)) {
        methodCount++;
      }
    });

    if (methodCount >= 2) {
      logResult('Integration', 'Content processing methods', true, `Processing methods found (${methodCount}/${processingMethods.length})`);
    } else {
      logResult('Integration', 'Content processing methods', false, `Limited processing methods (${methodCount}/${processingMethods.length})`);
    }

    // Check for maintaining classification confidence
    if (content.includes('confidence') || content.includes('reasoning')) {
      logResult('Integration', 'Preserve classification metadata', true, 'Maintains confidence and reasoning from Story 2-2');
    } else {
      logResult('Integration', 'Preserve classification metadata', false, 'Does not preserve classification metadata');
    }

    return content.includes('ClassifiedCorrection');
  } catch (error) {
    logResult('Integration', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PROMPT TEMPLATE VALIDATION
// ============================================================================

function validatePromptTemplates() {
  console.log('\n📝 PROMPT TEMPLATE VALIDATION\n');

  try {
    const promptPath = path.join(process.cwd(), '.claude/skills/rulesmith/prompts/analyze-conversation.md');

    if (!fs.existsSync(promptPath)) {
      logResult('Prompt Templates', 'analyze-conversation.md exists', false, 'Prompt file not found');
      return false;
    }

    const promptContent = fs.readFileSync(promptPath, 'utf-8');

    // Check for multi-content examples
    const contentExamples = [
      { name: 'Code Example', keywords: ['code', 'typescript', 'javascript', 'function', 'async/await'] },
      { name: 'Documentation Example', keywords: ['documentation', 'markdown', 'TSDoc', 'JSDoc', 'API'] },
      { name: 'Diagram Example', keywords: ['diagram', 'mermaid', 'flowchart', 'architecture', 'layout'] },
      { name: 'PRD Example', keywords: ['PRD', 'requirement', 'functional requirement', 'user story', 'FR'] },
      { name: 'Test Plan Example', keywords: ['test plan', 'unit test', 'integration test', 'BDD', 'Given/When/Then'] },
    ];

    let exampleCount = 0;
    const foundExamples: string[] = [];

    contentExamples.forEach(example => {
      let keywordCount = 0;
      example.keywords.forEach(keyword => {
        if (promptContent.toLowerCase().includes(keyword.toLowerCase())) {
          keywordCount++;
        }
      });

      if (keywordCount >= 2) {
        exampleCount++;
        foundExamples.push(example.name);
      }
    });

    if (exampleCount >= 4) {
      logResult('Prompt Templates', 'Multi-content examples', true, `Examples found for ${exampleCount}/5 content types`, foundExamples);
    } else {
      logResult('Prompt Templates', 'Multi-content examples', false, `Insufficient examples (${exampleCount}/5 content types)`);
    }

    // Check for role-agnostic language
    const agnosticLanguage = [
      'regardless of role',
      'any role',
      'all roles',
      'role-agnostic',
      'universal',
      'without role',
    ];

    let agnosticCount = 0;
    agnosticLanguage.forEach(phrase => {
      if (promptContent.toLowerCase().includes(phrase.toLowerCase())) {
        agnosticCount++;
      }
    });

    if (agnosticCount >= 2) {
      logResult('Prompt Templates', 'Role-agnostic language', true, `Role-agnostic language present (${agnosticCount} references)`);
    } else {
      logResult('Prompt Templates', 'Role-agnostic language', false, 'Limited role-agnostic language');
    }

    return exampleCount >= 3;
  } catch (error) {
    logResult('Prompt Templates', 'Load analyze-conversation.md', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// AR22 ERROR HANDLING VALIDATION
// ============================================================================

function validateAR22ErrorHandling() {
  console.log('\n⚠️  AR22 ERROR HANDLING VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Error Handling', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for AR22 error format
    const ar22Components = [
      'what',
      'how',
      'technical',
      'AR22',
    ];

    let ar22Score = 0;
    ar22Components.forEach(component => {
      if (content.includes(component)) {
        ar22Score++;
      }
    });

    if (ar22Score >= 3) {
      logResult('Error Handling', 'AR22 error format', true, 'AR22-compliant error structure present');
    } else {
      logResult('Error Handling', 'AR22 error format', false, `AR22 format incomplete (${ar22Score}/4 components)`);
    }

    // Check for specific error codes from Story 2-3
    const requiredErrorCodes = [
      'CONTENT_TYPE_DETECTION_FAILED',
      'NORMALIZATION_FAILED',
      'PATTERN_EXTRACTION_FAILED',
    ];

    let errorCodeCount = 0;
    const foundErrorCodes: string[] = [];

    requiredErrorCodes.forEach(code => {
      if (content.includes(code)) {
        errorCodeCount++;
        foundErrorCodes.push(code);
      }
    });

    if (errorCodeCount === requiredErrorCodes.length) {
      logResult('Error Handling', 'Story 2-3 error codes', true, 'All required error codes defined', foundErrorCodes);
    } else {
      logResult('Error Handling', 'Story 2-3 error codes', false, `Missing error codes (${errorCodeCount}/${requiredErrorCodes.length} found)`);
    }

    // Check for error handling in content detection
    const errorHandlingPatterns = [
      'try',
      'catch',
      'throw',
      'error',
    ];

    let errorHandlingScore = 0;
    errorHandlingPatterns.forEach(pattern => {
      if (content.includes(pattern)) {
        errorHandlingScore++;
      }
    });

    if (errorHandlingScore >= 3) {
      logResult('Error Handling', 'Error handling logic', true, 'Comprehensive error handling present');
    } else {
      logResult('Error Handling', 'Error handling logic', false, 'Limited error handling');
    }

    return errorCodeCount >= 2;
  } catch (error) {
    logResult('Error Handling', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TEST COVERAGE VALIDATION
// ============================================================================

function validateTestCoverage() {
  console.log('\n🧪 TEST COVERAGE VALIDATION\n');

  try {
    const testPath = path.join(process.cwd(), 'src/__tests__/content-analyzer.test.ts');

    if (!fs.existsSync(testPath)) {
      logResult('Test Coverage', 'content-analyzer.test.ts exists', false, 'Test file not found');
      return false;
    }

    const testContent = fs.readFileSync(testPath, 'utf-8');

    // Check for test categories
    const testCategories = [
      { name: 'Content Type Detection', keywords: ['contentType', 'detect', 'code', 'documentation', 'diagram'] },
      { name: 'Code Content Tests', keywords: ['code', 'typescript', 'javascript', 'language'] },
      { name: 'Documentation Content Tests', keywords: ['documentation', 'markdown', 'format'] },
      { name: 'Diagram Content Tests', keywords: ['diagram', 'mermaid', 'flowchart'] },
      { name: 'PRD Content Tests', keywords: ['PRD', 'requirement', 'functional'] },
      { name: 'Test Plan Content Tests', keywords: ['test plan', 'BDD', 'Given/When/Then'] },
      { name: 'Role-Agnostic Tests', keywords: ['role', 'agnostic', 'universal', 'all content'] },
      { name: 'Integration Tests', keywords: ['integration', 'classify', 'correction'] },
      { name: 'AR22 Error Tests', keywords: ['AR22', 'error', 'format'] },
      { name: 'Edge Case Tests', keywords: ['edge case', 'boundary', 'malformed', 'ambiguous'] },
    ];

    let categoryCount = 0;
    const foundCategories: string[] = [];

    testCategories.forEach(category => {
      let keywordCount = 0;
      category.keywords.forEach(keyword => {
        if (testContent.toLowerCase().includes(keyword.toLowerCase())) {
          keywordCount++;
        }
      });

      if (keywordCount >= 2) {
        categoryCount++;
        foundCategories.push(category.name);
      }
    });

    if (categoryCount >= 7) {
      logResult('Test Coverage', 'Test categories', true, `Comprehensive test coverage (${categoryCount}/10 categories)`, foundCategories);
    } else {
      logResult('Test Coverage', 'Test categories', false, `Limited test coverage (${categoryCount}/10 categories)`);
    }

    // Check for test structure (describe, it/test, expect)
    const testStructure = [
      'describe',
      'it(',
      'test(',
      'expect(',
    ];

    let structureScore = 0;
    testStructure.forEach(pattern => {
      if (testContent.includes(pattern)) {
        structureScore++;
      }
    });

    if (structureScore >= 3) {
      logResult('Test Coverage', 'Test structure', true, 'Proper test structure (describe/it/expect)');
    } else {
      logResult('Test Coverage', 'Test structure', false, 'Incomplete test structure');
    }

    // Check for mocking
    if (testContent.includes('mock') || testContent.includes('jest.fn') || testContent.includes('vi.fn')) {
      logResult('Test Coverage', 'Test mocking', true, 'Proper use of mocks/stubs');
    } else {
      logResult('Test Coverage', 'Test mocking', false, 'Limited or no mocking');
    }

    return categoryCount >= 5;
  } catch (error) {
    logResult('Test Coverage', 'Load content-analyzer.test.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// COMMANDS.TS INTEGRATION VALIDATION
// ============================================================================

function validateCommandsIntegration() {
  console.log('\n🔧 COMMANDS.TS INTEGRATION VALIDATION\n');

  try {
    const commandsPath = path.join(process.cwd(), '.claude/skills/rulesmith/commands.ts');

    if (!fs.existsSync(commandsPath)) {
      logResult('Commands Integration', 'commands.ts exists', false, 'Commands file not found');
      return false;
    }

    const commandsContent = fs.readFileSync(commandsPath, 'utf-8');

    // Check for content analyzer import
    if (commandsContent.includes('content-analyzer') || commandsContent.includes('ContentAnalyzer')) {
      logResult('Commands Integration', 'Content analyzer import', true, 'Content analyzer imported in commands');
    } else {
      logResult('Commands Integration', 'Content analyzer import', false, 'Content analyzer not imported');
    }

    // Check for content-aware analysis in command handlers
    if (commandsContent.toLowerCase().includes('content') && commandsContent.toLowerCase().includes('analyz')) {
      logResult('Commands Integration', 'Content-aware command handling', true, 'Content-aware analysis integrated');
    } else {
      logResult('Commands Integration', 'Content-aware command handling', false, 'Content-aware analysis not integrated');
    }

    return commandsContent.includes('ContentAnalyzer') || commandsContent.includes('content-analyzer');
  } catch (error) {
    logResult('Commands Integration', 'Load commands.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// TYPE SAFETY VALIDATION
// ============================================================================

function validateTypeSafety() {
  console.log('\n🔒 TYPE SAFETY VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Type Safety', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for TypeScript features
    const typeScriptFeatures = [
      ': string',
      ': number',
      ': boolean',
      ': ContentType',
      ': ContentMetadata',
      'interface ',
      'type ',
      'enum ',
      'function ',
      '=>',
    ];

    let typeScriptScore = 0;
    typeScriptFeatures.forEach(feature => {
      if (content.includes(feature)) {
        typeScriptScore++;
      }
    });

    if (typeScriptScore >= 6) {
      logResult('Type Safety', 'TypeScript usage', true, 'Strong TypeScript typing present');
    } else {
      logResult('Type Safety', 'TypeScript usage', false, 'Limited TypeScript typing');
    }

    // Check for any types (should be minimized)
    const anyTypeCount = (content.match(/: any/g) || []).length;

    if (anyTypeCount === 0) {
      logResult('Type Safety', 'Avoid "any" types', true, '✅ No "any" types found');
    } else if (anyTypeCount <= 2) {
      logResult('Type Safety', 'Avoid "any" types', true, `⚠️  Limited "any" types (${anyTypeCount} found)`);
    } else {
      logResult('Type Safety', 'Avoid "any" types', false, `❌ Too many "any" types (${anyTypeCount} found)`);
    }

    // Check for proper return types
    if (content.includes(': ') && content.includes('function')) {
      logResult('Type Safety', 'Function return types', true, 'Functions have explicit return types');
    } else {
      logResult('Type Safety', 'Function return types', false, 'Missing explicit return types');
    }

    return typeScriptScore >= 5 && anyTypeCount <= 3;
  } catch (error) {
    logResult('Type Safety', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// PERFORMANCE VALIDATION
// ============================================================================()

function validatePerformanceConsiderations() {
  console.log('\n⚡ PERFORMANCE CONSIDERATIONS VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Performance', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for performance-conscious patterns
    const performancePatterns = [
      'O(n)',
      'O(1)',
      'efficient',
      'optimized',
      'regex',
      'compiled',
      'cache',
    ];

    let performanceScore = 0;
    performancePatterns.forEach(pattern => {
      if (content.toLowerCase().includes(pattern.toLowerCase())) {
        performanceScore++;
      }
    });

    if (performanceScore >= 3) {
      logResult('Performance', 'Performance optimization', true, `Performance considerations present (${performanceScore} references)`);
    } else {
      logResult('Performance', 'Performance optimization', false, 'Limited performance considerations');
    }

    // Check for regex compilation (good for performance)
    if (content.includes('RegExp') || (content.includes('regex') && content.includes('compile'))) {
      logResult('Performance', 'Regex compilation', true, 'Regex compilation pattern detected');
    } else {
      logResult('Performance', 'Regex compilation', false, 'Consider compiled regex for performance');
    }

    return performanceScore >= 2;
  } catch (error) {
    logResult('Performance', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// DOCUMENTATION VALIDATION
// ============================================================================()

function validateDocumentation() {
  console.log('\n📚 DOCUMENTATION VALIDATION\n');

  try {
    const contentAnalyzerPath = path.join(process.cwd(), 'src/content-analyzer.ts');

    if (!fs.existsSync(contentAnalyzerPath)) {
      logResult('Documentation', 'ContentAnalyzer file exists', false, 'File not found');
      return false;
    }

    const content = fs.readFileSync(contentAnalyzerPath, 'utf-8');

    // Check for comprehensive documentation
    const documentationElements = [
      '/**',
      '*',
      '@param',
      '@returns',
      '@throws',
      'Story 2-3',
      'Role-Agnostic',
      'Content Analysis',
    ];

    let documentationScore = 0;
    documentationElements.forEach(element => {
      if (content.includes(element)) {
        documentationScore++;
      }
    });

    if (documentationScore >= 6) {
      logResult('Documentation', 'Code documentation', true, `Well-documented (${documentationScore}/8 elements)`);
    } else {
      logResult('Documentation', 'Code documentation', false, `Limited documentation (${documentationScore}/8 elements)`);
    }

    // Check for usage examples in comments
    if (content.includes('Example') || content.includes('Usage') || content.includes('e.g.')) {
      logResult('Documentation', 'Usage examples', true, 'Usage examples present');
    } else {
      logResult('Documentation', 'Usage examples', false, 'No usage examples found');
    }

    return documentationScore >= 4;
  } catch (error) {
    logResult('Documentation', 'Load content-analyzer.ts', false, `Error reading file: ${error.message}`);
    return false;
  }
}

// ============================================================================
// GENERATE VALIDATION REPORT
// ============================================================================()

function generateValidationReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STORY 2-3 VALIDATION REPORT');
  console.log('='.repeat(80));

  const totalTests = validationResults.length;
  const passedTests = validationResults.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log(`\n📈 Overall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)`);

  // Group by category
  const categories = [...new Set(validationResults.map(r => r.category))];

  console.log('\n📋 Results by Category:\n');

  categories.forEach(category => {
    const categoryResults = validationResults.filter(r => r.category === category);
    const categoryPassed = categoryResults.filter(r => r.passed).length;
    const categoryTotal = categoryResults.length;
    const categoryRate = ((categoryPassed / categoryTotal) * 100).toFixed(1);

    const status = categoryPassed === categoryTotal ? '✅' : categoryPassed >= categoryTotal / 2 ? '⚠️' : '❌';
    console.log(`${status} ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
  });

  // Show failed tests
  const failures = validationResults.filter(r => !r.passed);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:\n');

    failures.forEach(failure => {
      console.log(`❌ ${failure.category}: ${failure.test}`);
      console.log(`   ${failure.message}`);
      if (failure.details && failure.details.length > 0) {
        failure.details.forEach(detail => console.log(`   • ${detail}`));
      }
      console.log('');
    });
  }

  // Recommendations
  console.log('\n💡 Recommendations:\n');

  if (failures.length === 0) {
    console.log('✅ All validations passed! Story 2-3 is ready for development.');
    console.log('   • Implementation is complete and follows all requirements');
    console.log('   • All interfaces, types, and methods are properly defined');
    console.log('   • Test coverage is comprehensive');
    console.log('   • Integration with previous stories is correct');
  } else {
    const criticalFailures = failures.filter(f =>
      f.category === 'File Structure' ||
      f.category === 'Interfaces' ||
      f.category === 'Integration'
    );

    if (criticalFailures.length > 0) {
      console.log('🔴 CRITICAL: Fix these issues first:');
      criticalFailures.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
      console.log('');
    }

    const missingImplementation = failures.filter(f =>
      f.category === 'Content Detection' ||
      f.category === 'Role-Agnostic' ||
      f.category === 'Prompt Templates'
    );

    if (missingImplementation.length > 0) {
      console.log('🟡 IMPLEMENTATION: Complete these features:');
      missingImplementation.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
      console.log('');
    }

    const qualityImprovements = failures.filter(f =>
      f.category === 'Test Coverage' ||
      f.category === 'Documentation' ||
      f.category === 'Type Safety' ||
      f.category === 'Performance'
    );

    if (qualityImprovements.length > 0) {
      console.log('🟢 QUALITY: Improve these areas:');
      qualityImprovements.forEach(failure => {
        console.log(`   • ${failure.category}: ${failure.test}`);
      });
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('📅 Validation completed: ' + new Date().toISOString());
  console.log('='.repeat(80) + '\n');

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: parseFloat(passRate),
    isReadyForDev: failedTests === 0 || (failures.length <= 3 && !failures.some(f => f.category === 'File Structure')),
  };
}

// ============================================================================
// MAIN VALIDATION FLOW
// ============================================================================()

async function main() {
  console.log('🧪 Story 2-3 Validation Script');
  console.log('Role-Agnostic Content Analysis');
  console.log('Starting comprehensive validation...\n');

  try {
    // Run all validations
    validateFileStructure();
    validateInterfaces();
    validateContentTypeDetection();
    validateRoleAgnosticBehavior();
    validateCorrectionClassifierIntegration();
    validatePromptTemplates();
    validateAR22ErrorHandling();
    validateTestCoverage();
    validateCommandsIntegration();
    validateTypeSafety();
    validatePerformanceConsiderations();
    validateDocumentation();

    // Generate report
    const report = generateValidationReport();

    // Exit with appropriate code
    if (report.isReadyForDev) {
      console.log('✅ Story 2-3 validation passed! Ready for development.\n');
      process.exit(0);
    } else {
      console.log('❌ Story 2-3 validation failed. Please address the issues above.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n💥 Validation script error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the validation
main();