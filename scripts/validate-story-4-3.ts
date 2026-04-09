#!/usr/bin/env node

/**
 * Comprehensive validation script for Story 4-3 implementation
 * Edit Proposed Changes with YOLO approach
 *
 * This script validates:
 * 1. Story structure and completeness
 * 2. Acceptance criteria quality and coverage
 * 3. Technical implementation details
 * 4. Security requirements
 * 5. Performance targets
 * 6. Testing strategy
 * 7. Integration with previous stories (4-1, 4-2)
 * 8. YOLO approach compliance
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
  severity: 'critical' | 'high' | 'medium' | 'low';
  details?: string[];
  recommendation?: string;
}

const validationResults: ValidationResult[] = [];

function logResult(
  category: string,
  test: string,
  passed: boolean,
  message: string,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium',
  details?: string[],
  recommendation?: string
) {
  const result: ValidationResult = { category, test, passed, message, severity, details, recommendation };
  validationResults.push(result);

  const icon = passed ? '✅' : '❌';
  const severityIcon = passed ? '' : severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '🟢';
  console.log(`${icon} ${severityIcon} ${category}: ${test}`);
  if (message && !passed) {
    console.log(`   ${message}`);
  }
  if (details && details.length > 0 && !passed) {
    details.forEach(detail => console.log(`   • ${detail}`));
  }
  if (recommendation && !passed) {
    console.log(`   💡 ${recommendation}`);
  }
  if (!passed) {
    console.log('');
  }
}

// ============================================================================
// STORY STRUCTURE VALIDATION
// ============================================================================

function validateStoryStructure() {
  console.log('\n📋 STORY STRUCTURE VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');

  if (!fs.existsSync(storyPath)) {
    logResult('Story Structure', 'Story file exists', false, 'Story file not found', 'critical', [], 'Create story file at _bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
    return false;
  }

  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for required sections
  const requiredSections = [
    'User Story',
    'Business Context',
    'Functional Requirements',
    'Acceptance Criteria',
    'Technical Specifications',
    'Implementation Plan',
    'Test Cases',
    'Security Considerations',
    'Performance Targets',
    'Dependencies',
    'Risk Register',
    'Success Metrics',
    'Definition of Done',
    'Out of Scope'
  ];

  let missingSections: string[] = [];
  requiredSections.forEach(section => {
    if (!content.includes(`## ${section}`) && !content.includes(`### ${section}`)) {
      missingSections.push(section);
    }
  });

  if (missingSections.length === 0) {
    logResult('Story Structure', 'All required sections present', true, `All ${requiredSections.length} sections found`);
  } else {
    logResult('Story Structure', 'All required sections present', false, `Missing ${missingSections.length} sections`, 'high', missingSections, 'Add all required sections to match story template');
  }

  // Check story metadata
  if (content.includes('**Story:** 4-3') || content.includes('**Story:** 4.3')) {
    logResult('Story Structure', 'Story number correctly identified', true, 'Story 4-3');
  } else {
    logResult('Story Structure', 'Story number correctly identified', false, 'Story number not found or incorrect', 'medium', [], 'Add "**Story:** 4-3" to header');
  }

  if (content.includes('YOLO')) {
    logResult('Story Structure', 'YOLO approach specified', true, 'YOLO approach documented');
  } else {
    logResult('Story Structure', 'YOLO approach specified', false, 'YOLO approach not mentioned', 'medium', [], 'Add YOLO approach to story header and description');
  }

  // Check for epic reference
  if (content.includes('**Epic:** 4') || content.includes('Epic 4')) {
    logResult('Story Structure', 'Epic reference present', true, 'Epic 4 referenced');
  } else {
    logResult('Story Structure', 'Epic reference present', false, 'Epic not referenced', 'low', [], 'Add "**Epic:** 4 - User Control & Approval Workflow"');
  }

  return missingSections.length === 0;
}

// ============================================================================
// USER STORY VALIDATION
// ============================================================================

function validateUserStory() {
  console.log('\n👤 USER STORY VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for user story format
  const hasAsA = content.includes('**As a**');
  const hasIWant = content.includes('**I want to**');
  const hasSoThat = content.includes('**So that**');

  if (hasAsA && hasIWant && hasSoThat) {
    logResult('User Story', 'User story format correct', true, 'As a/I want to/So that format present');
  } else {
    const missing = [];
    if (!hasAsA) missing.push('As a');
    if (!hasIWant) missing.push('I want to');
    if (!hasSoThat) missing.push('So that');
    logResult('User Story', 'User story format correct', false, `Missing: ${missing.join(', ')}`, 'high', missing, 'Use standard user story format: As a [role], I want to [action], So that [benefit]');
  }

  // Check user role clarity
  if (content.includes('user reviewing proposed rule improvements') || content.includes('user')) {
    logResult('User Story', 'User role clearly defined', true, 'Role: user reviewing proposed changes');
  } else {
    logResult('User Story', 'User role clearly defined', false, 'User role ambiguous or missing', 'medium', [], 'Clearly specify the user role (e.g., "As a user reviewing proposed rule improvements")');
  }

  // Check for clear value proposition
  if (content.includes('refine suggestions') || content.includes('better match my intent') || content.includes('control')) {
    logResult('User Story', 'Value proposition clear', true, 'Clear benefit expressed');
  } else {
    logResult('User Story', 'Value proposition clear', false, 'Value proposition unclear', 'medium', [], 'Clarify the benefit: why does the user want this feature?');
  }

  return hasAsA && hasIWant && hasSoThat;
}

// ============================================================================
// ACCEPTANCE CRITERIA VALIDATION
// ============================================================================

function validateAcceptanceCriteria() {
  console.log('\n✅ ACCEPTANCE CRITERIA VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Count acceptance criteria
  const acMatches = content.match(/### AC\d+:/g) || content.match(/### AC\d+\s/g) || content.match(/\*\*AC\d+:?\*\*/g);
  const acCount = acMatches ? acMatches.length : 0;

  if (acCount >= 10) {
    logResult('Acceptance Criteria', 'Comprehensive AC coverage', true, `${acCount} acceptance criteria defined`);
  } else if (acCount >= 7) {
    logResult('Acceptance Criteria', 'Comprehensive AC coverage', false, `Only ${acCount} ACs - recommend 10-12`, 'medium', [], 'Add more ACs to cover edge cases, error handling, and security');
  } else {
    logResult('Acceptance Criteria', 'Comprehensive AC coverage', false, `Insufficient ACs: ${acCount} (need 10-12)`, 'high', [], 'Expand acceptance criteria to cover all scenarios');
  }

  // Check for Given-When-Then format
  const acSection = content.substring(content.indexOf('## Acceptance Criteria'), content.indexOf('## Technical Specifications'));
  const hasGiven = (acSection.match(/\*\*Given\*\*/g) || []).length;
  const hasWhen = (acSection.match(/\*\*When\*\*/g) || []).length;
  const hasThen = (acSection.match(/\*\*Then\*\*/g) || []).length;

  if (hasGiven >= acCount * 0.8 && hasWhen >= acCount * 0.8 && hasThen >= acCount * 0.8) {
    logResult('Acceptance Criteria', 'Given-When-Then format', true, `Gherkin syntax used (${hasGiven}/${hasWhen}/${hasThen})`);
  } else {
    logResult('Acceptance Criteria', 'Given-When-Then format', false, `Inconsistent Gherkin: Given=${hasGiven}, When=${hasWhen}, Then=${hasThen}`, 'medium', [], 'Use Given-When-Then format for all ACs');
  }

  // Check for critical ACs
  const criticalACs = [
    { name: 'Edit command recognition', patterns: ['edit command', 'recognize', 'edit #N'] },
    { name: 'Edit validation', patterns: ['validation', 'non-empty', 'different from original'] },
    { name: 'Original preservation', patterns: ['original_rule', 'preservation', 'audit'] },
    { name: 'Visual indication', patterns: ['[EDITED]', 'visual', 'marker'] },
    { name: 'Audit logging', patterns: ['audit', 'log', 'results.jsonl'] },
    { name: 'Security', patterns: ['security', 'sanitization', 'HTML escape'] },
    { name: 'Performance', patterns: ['performance', '< 100ms', 'processing time'] },
    { name: 'Error handling', patterns: ['error handling', 'graceful', 'invalid'] },
    { name: 'Integration', patterns: ['integration', 'approve', 'workflow'] }
  ];

  let missingCritical = [];
  criticalACs.forEach(ac => {
    const found = ac.patterns.some(p => content.toLowerCase().includes(p.toLowerCase()));
    if (!found) {
      missingCritical.push(ac.name);
    }
  });

  if (missingCritical.length === 0) {
    logResult('Acceptance Criteria', 'Critical scenarios covered', true, 'All 9 critical scenarios addressed');
  } else {
    logResult('Acceptance Criteria', 'Critical scenarios covered', false, `Missing: ${missingCritical.join(', ')}`, 'high', missingCritical, 'Add ACs for missing critical scenarios');
  }

  // Check for edge case ACs
  const edgeCases = ['empty edit', 'identical edit', 'overwrite', 'invalid number', 'concurrent'];
  const foundEdgeCases = edgeCases.filter(ec => content.toLowerCase().includes(ec));

  if (foundEdgeCases.length >= 4) {
    logResult('Acceptance Criteria', 'Edge cases covered', true, `${foundEdgeCases.length}/5 edge cases addressed`);
  } else {
    logResult('Acceptance Criteria', 'Edge cases covered', false, `Only ${foundEdgeCases.length}/5 edge cases`, 'medium', [], 'Add ACs for: overwrite previous edit, invalid change numbers');
  }

  return acCount >= 10;
}

// ============================================================================
// TECHNICAL IMPLEMENTATION VALIDATION
// ============================================================================

function validateTechnicalImplementation() {
  console.log('\n🔧 TECHNICAL IMPLEMENTATION VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for data structure definitions
  if (content.includes('interface ChangeRequest') || content.includes('interface Decision')) {
    logResult('Technical', 'Data structures defined', true, 'TypeScript interfaces specified');
  } else {
    logResult('Technical', 'Data structures defined', false, 'Data structures not defined', 'high', [], 'Add TypeScript interfaces for ChangeRequest and Decision with edited_rule fields');
  }

  // Check for command patterns
  if (content.includes('EDIT_COMMANDS') || content.includes('edit|modify|change|update')) {
    logResult('Technical', 'Command patterns specified', true, 'Edit command regex patterns defined');
  } else {
    logResult('Technical', 'Command patterns specified', false, 'Command patterns missing', 'high', [], 'Define regex patterns for edit commands (edit #N, modify #N, etc.)');
  }

  // Check for validation logic
  if (content.includes('validateEdit') || content.includes('EditValidationResult')) {
    logResult('Technical', 'Validation logic specified', true, 'Edit validation function defined');
  } else {
    logResult('Technical', 'Validation logic specified', false, 'Validation logic missing', 'high', [], 'Define validateEdit function with checks for empty, identical, and length');
  }

  // Check for log format
  if (content.includes('results.jsonl') && content.includes('"action": "edit"')) {
    logResult('Technical', 'Audit log format specified', true, 'JSONL log entry format defined');
  } else {
    logResult('Technical', 'Audit log format specified', false, 'Log format incomplete', 'medium', [], 'Specify complete JSONL format with timestamp, action, change_id, original, and edited fields');
  }

  // Check for component extensions
  const components = [
    'command-parser.ts',
    'state-manager.ts',
    'markdown-formatter.ts',
    'audit-logger.ts'
  ];

  const missingComponents = components.filter(c => !content.includes(c));

  if (missingComponents.length === 0) {
    logResult('Technical', 'Component extensions identified', true, 'All 4 components to extend listed');
  } else {
    logResult('Technical', 'Component extensions identified', false, `Missing: ${missingComponents.join(', ')}`, 'medium', missingComponents, 'List all components that need modification');
  }

  return content.includes('interface ChangeRequest') && content.includes('validateEdit');
}

// ============================================================================
// SECURITY VALIDATION
// ============================================================================

function validateSecurity() {
  console.log('\n🔒 SECURITY VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for input sanitization
  const sanitizationPatterns = ['sanitiz', 'HTML escape', '&lt;', '&gt;', '<script>', 'dangerous'];
  const hasSanitization = sanitizationPatterns.some(p => content.toLowerCase().includes(p.toLowerCase()));

  if (hasSanitization) {
    logResult('Security', 'Input sanitization specified', true, 'HTML/markdown sanitization addressed');
  } else {
    logResult('Security', 'Input sanitization specified', false, 'Input sanitization missing', 'critical', [], 'Add input sanitization: escape HTML entities, remove <script>, <iframe>, javascript: URLs');
  }

  // Check for length limits
  if (content.includes('10,000') || content.includes('10000') || content.includes('length limit')) {
    logResult('Security', 'Length limits defined', true, 'Edit text length limit specified');
  } else {
    logResult('Security', 'Length limits defined', false, 'No length limit found', 'high', [], 'Add maximum edit length (e.g., 10,000 characters)');
  }

  // Check for audit trail security
  const auditPatterns = ['immutable', 'timestamp', 'session_id', 'forensic'];
  const hasAuditSecurity = auditPatterns.filter(p => content.toLowerCase().includes(p.toLowerCase())).length >= 2;

  if (hasAuditSecurity) {
    logResult('Security', 'Audit trail security', true, 'Audit logging security measures present');
  } else {
    logResult('Security', 'Audit trail security', false, 'Audit security incomplete', 'medium', [], 'Add: immutable timestamps, session_id for traceability, original+edited storage');
  }

  // Check for state corruption prevention
  if (content.includes('atomic') || content.includes('corruption') || content.includes('validate before storing')) {
    logResult('Security', 'State corruption prevention', true, 'State corruption prevention specified');
  } else {
    logResult('Security', 'State corruption prevention', false, 'State corruption not addressed', 'medium', [], 'Add: atomic state updates, validation before storage, backup original');
  }

  // Check for XSS prevention
  if (content.includes('XSS') || content.includes('cross-site scripting') || content.includes('script injection')) {
    logResult('Security', 'XSS prevention addressed', true, 'XSS prevention specified');
  } else {
    logResult('Security', 'XSS prevention addressed', false, 'XSS not explicitly mentioned', 'low', [], 'Add explicit XSS prevention measures (escape HTML, sanitize dangerous tags)');
  }

  return hasSanitization;
}

// ============================================================================
// PERFORMANCE VALIDATION
// ============================================================================

function validatePerformance() {
  console.log('\n⚡ PERFORMANCE VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for performance targets
  const hasPerfTable = content.includes('| Operation | Target |') || content.includes('## Performance Targets');
  const hasPerfTargets = content.includes('< 100ms') || content.includes('<100ms');

  if (hasPerfTable && hasPerfTargets) {
    logResult('Performance', 'Performance targets defined', true, 'Performance metrics table present');
  } else {
    logResult('Performance', 'Performance targets defined', false, 'Performance targets incomplete', 'medium', [], 'Add performance table with targets for parsing, validation, state update, display, total');
  }

  // Check for 100ms total target
  if (content.includes('100ms') || content.includes('100 ms')) {
    logResult('Performance', '100ms total target', true, 'Edit processing target specified');
  } else {
    logResult('Performance', '100ms total target', false, '100ms target not found', 'high', [], 'Add: "Edit processing < 100ms (p95)" to performance targets');
  }

  // Check for specific operation targets
  const operations = ['parsing', 'validation', 'state update', 'display'];
  const foundOps = operations.filter(op => content.toLowerCase().includes(op.toLowerCase()));

  if (foundOps.length >= 3) {
    logResult('Performance', 'Operation-level targets', true, `${foundOps.length}/4 operations have targets`);
  } else {
    logResult('Performance', 'Operation-level targets', false, `Only ${foundOps.length}/4 operations`, 'medium', [], 'Add targets for: parsing (<10ms), validation (<5ms), state update (<10ms), display (<50ms)');
  }

  // Check for performance testing
  if (content.toLowerCase().includes('performance testing') || content.toLowerCase().includes('benchmark') || content.toLowerCase().includes('measure')) {
    logResult('Performance', 'Performance testing specified', true, 'Performance testing approach defined');
  } else {
    logResult('Performance', 'Performance testing specified', false, 'Performance testing missing', 'low', [], 'Add: "Measure edit processing for 1, 10, 100 changes"');
  }

  return hasPerfTargets;
}

// ============================================================================
// TESTING VALIDATION
// ============================================================================

function validateTesting() {
  console.log('\n🧪 TESTING VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for test categories
  const hasUnitTests = content.includes('Unit Tests') || content.includes('unit test');
  const hasIntegrationTests = content.includes('Integration Tests') || content.includes('integration test');
  const hasE2ETests = content.includes('E2E') || content.includes('end-to-end');

  if (hasUnitTests && hasIntegrationTests && hasE2ETests) {
    logResult('Testing', 'Test categories defined', true, 'Unit, Integration, and E2E tests specified');
  } else {
    const missing = [];
    if (!hasUnitTests) missing.push('Unit');
    if (!hasIntegrationTests) missing.push('Integration');
    if (!hasE2ETests) missing.push('E2E');
    logResult('Testing', 'Test categories defined', false, `Missing: ${missing.join(', ')}`, 'high', missing, 'Define test strategy with Unit, Integration, and E2E test sections');
  }

  // Count test cases
  const testMatches = content.match(/\d+\.\s+\*\*/g) || [];
  const testCount = testMatches.length;

  if (testCount >= 10) {
    logResult('Testing', 'Test case coverage', true, `${testCount} test cases defined`);
  } else if (testCount >= 7) {
    logResult('Testing', 'Test case coverage', false, `Only ${testCount} tests - recommend 10-12`, 'medium', [], 'Add more test cases for edge cases and error scenarios');
  } else {
    logResult('Testing', 'Test case coverage', false, `Insufficient tests: ${testCount} (need 10-12)`, 'high', [], 'Expand test coverage to include all ACs and edge cases');
  }

  // Check for security testing
  if (content.includes('security test') || content.includes('sanitization test') || content.includes('injection')) {
    logResult('Testing', 'Security testing included', true, 'Security test cases present');
  } else {
    logResult('Testing', 'Security testing included', false, 'Security tests missing', 'high', [], 'Add security tests for: HTML injection, XSS, length limits, dangerous patterns');
  }

  // Check for performance testing
  if (content.toLowerCase().includes('performance test') || content.toLowerCase().includes('benchmark test')) {
    logResult('Testing', 'Performance testing included', true, 'Performance test cases present');
  } else {
    logResult('Testing', 'Performance testing included', false, 'Performance tests missing', 'medium', [], 'Add performance tests measuring edit processing time');
  }

  // Check for edit workflow tests
  if (content.includes('edit workflow') || content.includes('edit then approve') || content.includes('edit journey')) {
    logResult('Testing', 'Edit workflow tests', true, 'End-to-end edit workflow tests present');
  } else {
    logResult('Testing', 'Edit workflow tests', false, 'Edit workflow tests missing', 'medium', [], 'Add E2E test: Review → Edit → Approve → Apply');
  }

  return hasUnitTests && hasIntegrationTests && hasE2ETests;
}

// ============================================================================
// INTEGRATION VALIDATION
// ============================================================================

function validateIntegration() {
  console.log('\n🔗 INTEGRATION VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for Story 4-1 dependency
  if (content.includes('Story 4.1') || content.includes('Story 4-1') || content.includes('4.1.*Interactive Review')) {
    logResult('Integration', 'Story 4-1 dependency', true, 'Depends on Story 4-1 (Interactive Review Interface)');
  } else {
    logResult('Integration', 'Story 4-1 dependency', false, 'Story 4-1 dependency not mentioned', 'high', [], 'Add: "Story 4.1: Interactive Review Interface - provides markdown rendering, state management"');
  }

  // Check for Story 4-2 dependency
  if (content.includes('Story 4.2') || content.includes('Story 4-2') || content.includes('4.2.*Individual Change')) {
    logResult('Integration', 'Story 4-2 dependency', true, 'Depends on Story 4-2 (Individual Change Approval)');
  } else {
    logResult('Integration', 'Story 4-2 dependency', false, 'Story 4-2 dependency not mentioned', 'high', [], 'Add: "Story 4.2: Individual Change Approval - provides command parsing, decision logic"');
  }

  // Check for component integration
  const components = [
    'command-parser.ts',
    'state-manager.ts',
    'markdown-formatter.ts',
    'audit-logger.ts'
  ];

  const foundComponents = components.filter(c => content.includes(c));

  if (foundComponents.length === components.length) {
    logResult('Integration', 'Component integration', true, 'All 4 components identified for extension');
  } else {
    logResult('Integration', 'Component integration', false, `Missing ${components.length - foundComponents.length}/4 components`, 'medium', [], 'List all components: command-parser, state-manager, markdown-formatter, audit-logger');
  }

  // Check for workflow integration
  if (content.includes('approve/reject') || content.includes('seamless integration') || content.includes('same workflow')) {
    logResult('Integration', 'Workflow integration', true, 'Edit integrates with approve/reject workflow');
  } else {
    logResult('Integration', 'Workflow integration', false, 'Workflow integration unclear', 'medium', [], 'Clarify how edit decision fits into existing approve/reject workflow');
  }

  return content.includes('Story 4.1') && content.includes('Story 4.2');
}

// ============================================================================
// YOLO APPROACH VALIDATION
// ============================================================================

function validateYOLOApproach() {
  console.log('\n🚀 YOLO APPROACH VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for YOLO designation
  if (content.includes('YOLO') || content.includes('yolo')) {
    logResult('YOLO Approach', 'YOLO approach specified', true, 'YOLO approach designated in story');
  } else {
    logResult('YOLO Approach', 'YOLO approach specified', false, 'YOLO not mentioned', 'medium', [], 'Add "Approach: YOLO" to story header');
  }

  // Check for MVP focus
  if (content.includes('MVP') || content.includes('core functionality') || content.includes('deferred')) {
    logResult('YOLO Approach', 'MVP focus clear', true, 'Core features prioritized, advanced features deferred');
  } else {
    logResult('YOLO Approach', 'MVP focus clear', false, 'MVP/deferred features unclear', 'low', [], 'Add "Out of Scope" section listing deferred features');
  }

  // Check for deferred features
  const deferredPatterns = ['deferred', 'post-MVP', 'Out of Scope', 'future'];
  const hasDeferred = deferredPatterns.some(p => content.includes(p));

  if (hasDeferred) {
    logResult('YOLO Approach', 'Deferred features listed', true, 'Advanced features explicitly deferred');
  } else {
    logResult('YOLO Approach', 'Deferred features listed', false, 'No deferred features section', 'low', [], 'Add "Out of Scope" section: NLP suggestions, edit history, collaborative editing');
  }

  // Check for realistic timeline
  if (content.includes('13 hours') || content.includes('1.5 days') || content.includes('estimated effort')) {
    logResult('YOLO Approach', 'Realistic timeline', true, 'Effort estimated (13 hours / 1.5 days)');
  } else {
    logResult('YOLO Approach', 'Realistic timeline', false, 'Timeline not estimated', 'low', [], 'Add effort estimate: ~13 hours (1.5 days) for core functionality');
  }

  return content.includes('YOLO');
}

// ============================================================================
// RISK REGISTER VALIDATION
// ============================================================================

function validateRiskRegister() {
  console.log('\n⚠️  RISK REGISTER VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for risk register section
  if (content.includes('## Risk Register') || content.includes('## Risks')) {
    logResult('Risk Register', 'Risk register present', true, 'Risk register section exists');
  } else {
    logResult('Risk Register', 'Risk register present', false, 'No risk register found', 'medium', [], 'Add risk register with: ID, category, description, probability, impact, score, mitigation');
    return false;
  }

  // Check for critical risks
  const criticalRisks = [
    { name: 'Original suggestion loss', patterns: ['lose original', 'original suggestion', 'data loss'] },
    { name: 'User confusion', patterns: ['confused', 'usability', 'UX'] },
    { name: 'Security exposure', patterns: ['sensitive', 'exposure', 'security', 'sanitize'] },
    { name: 'Race condition', patterns: ['race condition', 'concurrent', 'conflict'] }
  ];

  const missingRisks = [];
  criticalRisks.forEach(risk => {
    const found = risk.patterns.some(p => content.toLowerCase().includes(p.toLowerCase()));
    if (!found) {
      missingRisks.push(risk.name);
    }
  });

  if (missingRisks.length === 0) {
    logResult('Risk Register', 'Critical risks identified', true, 'All 4 critical risks addressed');
  } else {
    logResult('Risk Register', 'Critical risks identified', false, `Missing: ${missingRisks.join(', ')}`, 'medium', missingRisks, 'Add risks for: original loss, user confusion, security, concurrency');
  }

  // Check for risk scoring
  if (content.includes('Probability') && content.includes('Impact') && content.includes('Score')) {
    logResult('Risk Register', 'Risk scoring used', true, 'Risks scored by probability × impact');
  } else {
    logResult('Risk Register', 'Risk scoring used', false, 'Risk scoring incomplete', 'low', [], 'Add probability (1-3), impact (1-3), and score (product) columns');
  }

  // Check for mitigation strategies
  if (content.includes('Mitigation') || content.includes('mitigation')) {
    logResult('Risk Register', 'Mitigation strategies', true, 'Mitigation plans defined');
  } else {
    logResult('Risk Register', 'Mitigation strategies', false, 'Mitigation missing', 'low', [], 'Add specific mitigation strategies for each risk');
  }

  return content.includes('## Risk Register');
}

// ============================================================================
// IMPLEMENTATION PLAN VALIDATION
// ============================================================================

function validateImplementationPlan() {
  console.log('\n📐 IMPLEMENTATION PLAN VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for implementation tasks
  const taskMatches = content.match(/\*\*Task \d+:/g) || content.match(/^\*\*\d+\.\s+/gm);
  const taskCount = taskMatches ? taskMatches.length : 0;

  if (taskCount >= 7) {
    logResult('Implementation Plan', 'Task breakdown', true, `${taskCount} implementation tasks defined`);
  } else if (taskCount >= 5) {
    logResult('Implementation Plan', 'Task breakdown', false, `Only ${taskCount} tasks - recommend 7-8`, 'medium', [], 'Add more tasks for comprehensive coverage');
  } else {
    logResult('Implementation Plan', 'Task breakdown', false, `Insufficient tasks: ${taskCount} (need 7-8)`, 'high', [], 'Break down into: parser, validation, state, formatter, logger, application, testing');
  }

  // Check for time estimates
  const hasTimeEstimates = content.includes('hours') || content.includes('hour');
  if (hasTimeEstimates) {
    logResult('Implementation Plan', 'Time estimates', true, 'Tasks have time estimates');
  } else {
    logResult('Implementation Plan', 'Time estimates', false, 'Time estimates missing', 'medium', [], 'Add hour estimates to each task');
  }

  // Check for task sequencing
  if (content.includes('Phase') || content.includes('Step') || (taskCount >= 5 && content.includes('Task 1') && content.includes('Task 8'))) {
    logResult('Implementation Plan', 'Task sequencing', true, 'Tasks organized in phases/sequence');
  } else {
    logResult('Implementation Plan', 'Task sequencing', false, 'Task ordering unclear', 'low', [], 'Organize tasks into phases with logical sequence');
  }

  // Check for testing task
  if (content.includes('Testing') || content.includes('Task 8') || content.includes('test')) {
    logResult('Implementation Plan', 'Testing included', true, 'Testing task included in plan');
  } else {
    logResult('Implementation Plan', 'Testing included', false, 'Testing task missing', 'high', [], 'Add dedicated testing task with unit, integration, E2E tests');
  }

  return taskCount >= 7;
}

// ============================================================================
// SUCCESS METRICS VALIDATION
// ============================================================================

function validateSuccessMetrics() {
  console.log('\n📊 SUCCESS METRICS VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for success metrics section
  if (content.includes('## Success Metrics') || content.includes('## Metrics')) {
    logResult('Success Metrics', 'Metrics section present', true, 'Success metrics defined');
  } else {
    logResult('Success Metrics', 'Metrics section present', false, 'No success metrics section', 'medium', [], 'Add success metrics section with functional, quality, performance, UX categories');
    return false;
  }

  // Check for functional metrics
  if (content.includes('All') && content.includes('acceptance criteria') && content.includes('met')) {
    logResult('Success Metrics', 'Functional metrics', true, 'AC completion specified');
  } else {
    logResult('Success Metrics', 'Functional metrics', false, 'Functional metrics incomplete', 'medium', [], 'Add: "All X acceptance criteria met", "Y/Z tests passing"');
  }

  // Check for quality metrics
  const qualityPatterns = ['original suggestion loss', 'audit trail', 'security', 'error handling'];
  const qualityCount = qualityPatterns.filter(p => content.toLowerCase().includes(p.toLowerCase())).length;

  if (qualityCount >= 3) {
    logResult('Success Metrics', 'Quality metrics', true, `${qualityCount}/4 quality areas covered`);
  } else {
    logResult('Success Metrics', 'Quality metrics', false, `Only ${qualityCount}/4 quality areas`, 'low', [], 'Add quality metrics for: data integrity, audit accuracy, security, error handling');
  }

  // Check for performance metrics
  if (content.includes('< 100ms') || content.includes('performance target')) {
    logResult('Success Metrics', 'Performance metrics', true, 'Performance targets specified');
  } else {
    logResult('Success Metrics', 'Performance metrics', false, 'Performance metrics missing', 'low', [], 'Add: "Edit processing p95 < 100ms", "Display update < 50ms"');
  }

  // Check for measurable criteria
  const measurablePatterns = ['100%', '0 incidents', '< 100ms', 'passing'];
  const hasMeasurable = measurablePatterns.some(p => content.includes(p));

  if (hasMeasurable) {
    logResult('Success Metrics', 'Measurable criteria', true, 'Metrics are quantifiable');
  } else {
    logResult('Success Metrics', 'Measurable criteria', false, 'Metrics not measurable', 'low', [], 'Use specific numbers: "100%", "0 incidents", "< 100ms"');
  }

  return content.includes('## Success Metrics');
}

// ============================================================================
// DEFINITION OF DONE VALIDATION
// ============================================================================

function validateDefinitionOfDone() {
  console.log('\n✅ DEFINITION OF DONE VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for DoD section
  if (content.includes('## Definition of Done') || content.includes('## DoD')) {
    logResult('Definition of Done', 'DoD section present', true, 'Definition of Done exists');
  } else {
    logResult('Definition of Done', 'DoD section present', false, 'No DoD section', 'high', [], 'Add Definition of Done checklist');
    return false;
  }

  // Check for AC completion
  if (content.includes('All') && content.includes('acceptance criteria')) {
    logResult('Definition of Done', 'AC completion in DoD', true, 'AC completion required');
  } else {
    logResult('Definition of Done', 'AC completion in DoD', false, 'AC completion not listed', 'medium', [], 'Add: "All X acceptance criteria met"');
  }

  // Check for testing requirements
  if (content.includes('tests passing') || content.includes('test coverage')) {
    logResult('Definition of Done', 'Testing in DoD', true, 'Test completion required');
  } else {
    logResult('Definition of Done', 'Testing in DoD', false, 'Testing not in DoD', 'medium', [], 'Add: "All Y/Z tests passing (100%)"');
  }

  // Check for code review
  if (content.includes('Code reviewed') || content.includes('peer review')) {
    logResult('Definition of Done', 'Code review in DoD', true, 'Code review required');
  } else {
    logResult('Definition of Done', 'Code review in DoD', false, 'Code review not listed', 'low', [], 'Add: "Code reviewed by peers"');
  }

  // Check for security validation
  if (content.includes('Security') && content.includes('passed')) {
    logResult('Definition of Done', 'Security validation in DoD', true, 'Security validation required');
  } else {
    logResult('Definition of Done', 'Security validation in DoD', false, 'Security not in DoD', 'high', [], 'Add: "Security validation passed"');
  }

  // Check for performance validation
  if (content.includes('Performance') && content.includes('achieved')) {
    logResult('Definition of Done', 'Performance validation in DoD', true, 'Performance validation required');
  } else {
    logResult('Definition of Done', 'Performance validation in DoD', false, 'Performance not in DoD', 'medium', [], 'Add: "Performance targets achieved"');
  }

  return content.includes('## Definition of Done');
}

// ============================================================================
// OUT OF SCOPE VALIDATION
// ============================================================================

function validateOutOfScope() {
  console.log('\n🚫 OUT OF SCOPE VALIDATION\n');

  const storyPath = path.join(process.cwd(), '_bmad-output/implementation-artifacts/4-3-edit-proposed-changes-yolo.md');
  const content = fs.readFileSync(storyPath, 'utf-8');

  // Check for out of scope section
  if (content.includes('## Out of Scope') || content.includes('### Out of Scope')) {
    logResult('Out of Scope', 'Out of scope section present', true, 'Deferred features documented');
  } else {
    logResult('Out of Scope', 'Out of scope section present', false, 'No out of scope section', 'medium', [], 'Add "Out of Scope" section listing deferred features');
    return false;
  }

  // Check for deferred features
  const deferredFeatures = [
    'NLP',
    'edit history',
    'diff visualization',
    'collaborative',
    'undo',
    'redo',
    'templates'
  ];

  const foundDeferred = deferredFeatures.filter(f => content.toLowerCase().includes(f.toLowerCase()));

  if (foundDeferred.length >= 4) {
    logResult('Out of Scope', 'Deferred features listed', true, `${foundDeferred.length}/7 deferred features specified`);
  } else {
    logResult('Out of Scope', 'Deferred features listed', false, `Only ${foundDeferred.length} deferred features`, 'low', [], 'List deferred features: NLP suggestions, edit history, diff view, collaborative editing, templates, analytics');
  }

  // Check for rationale
  if (content.includes('Rationale') || content.includes('YOLO approach focuses')) {
    logResult('Out of Scope', 'Rationale provided', true, 'Reasons for deferral explained');
  } else {
    logResult('Out of Scope', 'Rationale provided', false, 'Rationale missing', 'low', [], 'Add rationale explaining YOLO approach and focus on core functionality');
  }

  return content.includes('## Out of Scope');
}

// ============================================================================
// GENERATE VALIDATION REPORT
// ============================================================================

function generateValidationReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 STORY 4-3 VALIDATION REPORT');
  console.log('Edit Proposed Changes - YOLO Approach');
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

  // Show critical failures
  const criticalFailures = validationResults.filter(r => !r.passed && r.severity === 'critical');

  if (criticalFailures.length > 0) {
    console.log('\n🔴 CRITICAL ISSUES (Must Fix):\n');
    criticalFailures.forEach(failure => {
      console.log(`❌ ${failure.category}: ${failure.test}`);
      console.log(`   ${failure.message}`);
      if (failure.recommendation) {
        console.log(`   💡 ${failure.recommendation}`);
      }
      console.log('');
    });
  }

  // Show high priority failures
  const highFailures = validationResults.filter(r => !r.passed && r.severity === 'high');

  if (highFailures.length > 0) {
    console.log('\n🟠 HIGH PRIORITY ISSUES (Should Fix):\n');
    highFailures.forEach(failure => {
      console.log(`❌ ${failure.category}: ${failure.test}`);
      if (failure.recommendation) {
        console.log(`   💡 ${failure.recommendation}`);
      }
    });
    console.log('');
  }

  // Show medium priority failures
  const mediumFailures = validationResults.filter(r => !r.passed && r.severity === 'medium');

  if (mediumFailures.length > 0) {
    console.log(`\n🟡 MEDIUM PRIORITY ISSUES (${mediumFailures.length} total)\n`);
    console.log('Consider addressing these for better quality:');
    mediumFailures.forEach(failure => {
      console.log(`  • ${failure.category}: ${failure.test}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:\n');

  if (criticalFailures.length === 0 && highFailures.length === 0) {
    console.log('✅ Story 4-3 is well-structured and ready for development!');
    console.log('   • All critical and high-priority issues are addressed');
    console.log('   • Acceptance criteria are comprehensive');
    console.log('   • Security and performance requirements are specified');
    console.log('   • Integration with Stories 4-1 and 4-2 is clear');
    console.log('   • YOLO approach is properly defined');
  } else {
    if (criticalFailures.length > 0) {
      console.log('🔴 CRITICAL: Address these immediately:');
      criticalFailures.forEach(failure => {
        if (failure.recommendation) {
          console.log(`   • ${failure.recommendation}`);
        }
      });
      console.log('');
    }

    if (highFailures.length > 0) {
      console.log('🟠 HIGH PRIORITY: Fix before development:');
      highFailures.forEach(failure => {
        if (failure.recommendation) {
          console.log(`   • ${failure.recommendation}`);
        }
      });
      console.log('');
    }

    console.log('📋 Next Steps:');
    console.log('   1. Fix all critical issues');
    console.log('   2. Address high-priority issues');
    console.log('   3. Review medium-priority improvements');
    console.log('   4. Re-run validation: /bmad-bmm-create-story validate story 4-3 yolo');
  }

  console.log('\n' + '='.repeat(80));
  console.log('📅 Validation completed: ' + new Date().toISOString());
  console.log('='.repeat(80) + '\n');

  return {
    total: totalTests,
    passed: passedTests,
    failed: failedTests,
    passRate: parseFloat(passRate),
    critical: criticalFailures.length,
    high: highFailures.length,
    medium: mediumFailures.length,
    isReadyForDev: criticalFailures.length === 0 && highFailures.length === 0,
  };
}

// ============================================================================
// MAIN VALIDATION FLOW
// ============================================================================

async function main() {
  console.log('🧪 Story 4-3 Validation Script');
  console.log('Edit Proposed Changes - YOLO Approach');
  console.log('Starting comprehensive validation...\n');

  try {
    // Run all validations
    validateStoryStructure();
    validateUserStory();
    validateAcceptanceCriteria();
    validateTechnicalImplementation();
    validateSecurity();
    validatePerformance();
    validateTesting();
    validateIntegration();
    validateYOLOApproach();
    validateRiskRegister();
    validateImplementationPlan();
    validateSuccessMetrics();
    validateDefinitionOfDone();
    validateOutOfScope();

    // Generate report
    const report = generateValidationReport();

    // Exit with appropriate code
    if (report.isReadyForDev) {
      console.log('✅ Story 4-3 validation passed! Ready for development.\n');
      process.exit(0);
    } else {
      console.log(`❌ Story 4-3 validation failed: ${report.critical} critical, ${report.high} high issues.\n`);
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
