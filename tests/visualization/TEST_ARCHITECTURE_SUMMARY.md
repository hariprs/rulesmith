# Test Architecture Summary - Story 3.5: PDF/HTML Report Generation

## Overview

This document summarizes the test architecture for Story 3.5 (PDF/HTML Report Generation), following the principle of **pushing tests to the lowest viable layer** (unit > integration/API > E2E).

## Test Architecture Principle

> **When expanding test coverage, push new tests to the lowest viable layer.**
> - Unit tests: Test individual functions and modules in isolation
> - Integration tests: Test workflows that integrate multiple components
> - E2E tests: Test critical happy-path workflows that cannot be adequately tested at lower layers

**DO NOT add E2E tests for scenarios already covered at lower layers.**

## Test Files Created

### 1. Integration Tests
**File:** `/tests/visualization/integration/report-generation.integration.test.ts`

**Purpose:** Test complete report generation workflows that integrate multiple components.

**Coverage:**
- PDF report generation pipeline (AC1)
- HTML report generation pipeline (AC2)
- Data transformation integration (AC3)
- Privacy and sanitization integration (AC5)
- Error handling and recovery (AC6)
- Concurrent generation with queue management (AC6)
- Performance integration tests (AC6)
- Cross-format integration tests

**Key Test Scenarios:**
- Generate minimal/standard/detailed reports with realistic datasets
- Integrate statistics calculation with report generation
- Integrate chart data embedding with reports
- End-to-end sanitization workflow
- Template application and validation
- Queue management for concurrent requests
- Performance thresholds (PDF < 10s for 100 patterns, HTML < 5s)
- Cross-format consistency

**Test Count:** ~60 integration tests

### 2. Unit Tests - PDF Generator
**File:** `/tests/visualization/unit/pdf-generator.unit.test.ts`

**Purpose:** Test PDF-specific functionality in isolation from the broader pipeline.

**Coverage:**
- PDF report generation with different templates
- PDF configuration (page size, orientation, margins)
- PDF section inclusion (charts, recommendations, page numbers)
- PDF pagination and layout
- Privacy and sanitization in PDF context
- Chart-to-image conversion for PDF embedding
- PDF error handling
- PDF metadata generation

**Key Test Scenarios:**
- Generate PDF with minimal/standard/detailed templates
- Custom page sizes (A4, Letter) and orientations
- Include/exclude specific sections
- Paginate patterns with custom patterns-per-page
- Convert chart canvas to high-resolution images
- Handle invalid PDF configurations
- Generate accurate PDF metadata

**Test Count:** ~40 unit tests

### 3. Unit Tests - HTML Generator
**File:** `/tests/visualization/unit/html-generator.unit.test.ts`

**Purpose:** Test HTML-specific functionality in isolation from the broader pipeline.

**Coverage:**
- HTML report generation with different templates
- HTML structure and content validation
- Interactive features (search, collapsible sections, TOC)
- Chart.js integration and CDN configuration
- Theme and styling (light/dark themes, custom CSS/JS)
- Privacy and sanitization in HTML context
- Print-to-PDF styles
- HTML error handling
- HTML metadata generation

**Key Test Scenarios:**
- Generate HTML with minimal/standard/detailed templates
- Include search functionality and collapsible sections
- Embed Chart.js charts with/without CDN
- Support light/dark themes and custom styling
- Include print styles for PDF export
- Handle invalid HTML configurations
- Generate accurate HTML metadata including file size

**Test Count:** ~40 unit tests

### 4. Existing Unit Tests
**File:** `/tests/visualization/report-generator.test.ts` (already exists)

**Coverage:**
- Sanitization functions (AC5)
- Statistics calculation (AC3)
- Template system (AC4)
- Queue management (AC6)
- Error handling (AC6)

**Test Count:** ~50 unit tests (already created)

## Test Coverage Matrix

| Acceptance Criteria | Unit Tests | Integration Tests | E2E Tests | Total |
|---------------------|------------|-------------------|-----------|-------|
| AC1: PDF Generation | 40 | 15 | 0 | 55 |
| AC2: HTML Generation | 40 | 15 | 0 | 55 |
| AC3: Data Accuracy | 15 (existing) | 10 | 0 | 25 |
| AC4: Templates | 20 (existing) | 10 | 0 | 30 |
| AC5: Privacy | 25 (existing) | 10 | 0 | 35 |
| AC6: Performance/Concurrent | 10 | 15 | 0 | 25 |
| **Total** | **150** | **75** | **0** | **225** |

## Test Distribution by Layer

### Unit Tests (150 tests)
- **Purpose:** Test individual functions and modules in isolation
- **Files:**
  - `report-generator.test.ts` (50 tests) - Sanitization, statistics, templates, queue
  - `pdf-generator.unit.test.ts` (40 tests) - PDF-specific logic
  - `html-generator.unit.test.ts` (40 tests) - HTML-specific logic
  - Other visualization unit tests (20 tests)

### Integration Tests (75 tests)
- **Purpose:** Test workflows that integrate multiple components
- **Files:**
  - `report-generation.integration.test.ts` (60 tests) - Complete report generation pipelines
  - Other integration tests (15 tests)

### E2E Tests (0 tests)
- **Rationale:** All critical workflows are covered at unit and integration layers
- **Note:** If E2E tests are needed, they should only cover:
  - CLI command invocation (`npm run generate-report`)
  - File system verification (report files created)
  - Cross-platform PDF rendering validation
  - **Do not duplicate** workflows already tested at lower layers

## Test Coverage Goals

### Target Metrics
- **Unit Test Coverage:** 95%+ for report generation modules
- **Integration Test Coverage:** 90%+ for critical workflows
- **Test Pass Rate:** 95%+ target
- **Performance Tests:** Validate generation time thresholds

### Coverage by Module
- `report-generator.ts`: 95%+ (statistics, queue, validation)
- `pdf-generator.ts`: 95%+ (PDF sections, layout, embedding)
- `html-generator.ts`: 95%+ (HTML structure, interactive features)
- `sanitization.ts`: 95%+ (PII redaction, content validation)
- `report-templates.ts`: 90%+ (template application, validation)

## Performance Testing

### Thresholds (AC6)
- **PDF Generation:**
  - 100 patterns: < 10 seconds
  - 10,000 patterns: < 30 seconds
- **HTML Generation:**
  - 100 patterns: < 5 seconds
- **File Size:**
  - PDF for 10K patterns: < 50MB
  - HTML for 100 patterns: < 500KB

### Test Approach
- Integration tests with realistic datasets (10, 100, 1000 patterns)
- Measure generation time and file size
- Validate against thresholds
- Test concurrent generation (max 3 simultaneous reports)

## Privacy and Security Testing

### Sanitization Tests (AC5)
- **Unit Tests:**
  - PII detection (email, phone, SSN)
  - Credential detection (API keys, passwords)
  - Custom sanitization rules
  - Privacy metadata generation
- **Integration Tests:**
  - End-to-end sanitization in PDF workflow
  - End-to-end sanitization in HTML workflow
  - Privacy notice inclusion
  - Opt-in sensitive data handling

### Security Validation
- Validate no API keys or credentials in output
- Test anonymization of pattern examples
- Verify privacy notices are present
- Test with various sensitive data patterns

## Test Fixtures

### Dataset Fixtures
- `createTestPattern()`: Single pattern with defaults
- `createSmallDataset()`: 10 patterns for quick testing
- `createMediumDataset()`: 100 patterns for performance testing
- `createLargeDataset()`: 1000 patterns for stress testing
- `createSensitiveDataset()`: Patterns with PII/credentials for sanitization testing

### Chart Fixtures
- `createBarChartData()`: Bar chart for frequency visualization
- `createLineChartData()`: Line chart for trend visualization
- `createPieChartData()`: Pie chart for distribution visualization
- `getAllTestCharts()`: All chart types combined

### Configuration Fixtures
- `createMinimalPDFConfig()`: Minimal template PDF configuration
- `createStandardPDFConfig()`: Standard template PDF configuration
- `createDetailedPDFConfig()`: Detailed template PDF configuration
- `createMinimalHTMLConfig()`: Minimal template HTML configuration
- `createStandardHTMLConfig()`: Standard template HTML configuration
- `createDetailedHTMLConfig()`: Detailed template HTML configuration

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run Integration Tests Only
```bash
npm test -- --testPathPattern=integration
```

### Run Unit Tests Only
```bash
npm test -- --testPathPattern=unit
```

### Run Specific Test File
```bash
npm test -- report-generation.integration.test.ts
npm test -- pdf-generator.unit.test.ts
npm test -- html-generator.unit.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Continuous Integration

### CI Pipeline Integration
- Run all tests on every commit
- Fail build if test coverage drops below 90%
- Run performance tests and validate thresholds
- Generate coverage reports

### Quality Gates
- All tests must pass before merging
- Coverage must meet minimum thresholds
- Performance tests must validate thresholds
- No new security vulnerabilities

## Maintenance

### Test Maintenance Guidelines
- Keep tests isolated and independent
- Use descriptive test names that explain what is being tested
- Update fixtures when schemas change
- Remove duplicate tests across layers
- Review and optimize slow tests

### Adding New Tests
1. **Check existing coverage** before adding new tests
2. **Prefer unit tests** for new functionality
3. **Use integration tests** only for workflows that require multiple components
4. **Avoid E2E tests** unless the scenario cannot be tested at lower layers
5. **Follow naming conventions:** `describe('Feature', () => { it('should do X', () => { ... }); });`

## Test Architecture Compliance

### ✅ Compliant
- Unit tests for individual functions and modules
- Integration tests for multi-component workflows
- Performance tests with realistic datasets
- Privacy and security tests at both layers
- No duplicate E2E tests for workflows covered at lower layers

### ⚠️ Considerations
- E2E tests may be needed for CLI command validation
- E2E tests may be needed for cross-platform PDF rendering
- Keep E2E tests minimal and focused on gaps not covered by unit/integration tests

## Summary

This test architecture provides:
- **225+ total tests** across unit and integration layers
- **95%+ target coverage** for report generation modules
- **Performance validation** with realistic datasets
- **Privacy and security testing** at multiple layers
- **Minimal E2E tests** following the test architecture principle
- **Fast feedback** through unit tests
- **Comprehensive workflow validation** through integration tests

The architecture follows the principle of pushing tests to the lowest viable layer, ensuring fast test execution while maintaining comprehensive coverage of critical functionality.
