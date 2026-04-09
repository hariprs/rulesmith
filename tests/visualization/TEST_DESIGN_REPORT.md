# Story 3-2: Pattern Data Transformation - Test Design Report

**Test Strategy:** TDD Red Phase - Failing Acceptance Tests Only
**Test Pyramid Approach:** API-level (70%) + Integration (25%) + E2E (5%)
**Test Coverage:** All 6 Acceptance Criteria (AC1-AC6)

## Overview

This test suite validates the transformation of Epic 2's MergedPattern data into Chart.js-compatible formats for pattern visualization. The tests follow the test pyramid approach, prioritizing API-level and integration-level tests over E2E tests.

## Test Files Created

### 1. API-Level Acceptance Tests
**File:** `/tests/api/transform-pattern-data.acceptance.test.ts`
**Test Count:** 80+ tests
**Coverage:** AC1, AC2, AC3, AC4, AC6

#### Test Categories:

##### Type Definitions and Interfaces (AC6)
- PatternFrequencyData interface validation
- PatternTrendData interface validation
- CategoryDistributionData interface validation
- PatternTooltipData interface validation
- ChartMetadata interface validation
- PatternTransformationErrorCode enum validation

##### Function Signatures and API Contracts (AC6)
- Function export validation
- Parameter type validation
- Return type validation
- Function signature compliance

##### Pattern Frequency Transformation (AC1)
- Category grouping validation
- Frequency summation within categories
- Empty array handling
- Single pattern handling
- Chart.js-compatible structure validation
- Metadata preservation

##### Temporal Trend Transformation (AC2)
- Timestamp extraction validation
- Time period grouping (day/week/month)
- Longitudinal pattern handling
- Invalid timestamp filtering
- Time-series dataset creation
- Chart.js time-series structure validation

##### Category Distribution Transformation (AC3)
- Category counting validation
- Percentage calculation validation
- Color assignment validation
- Dominant category handling
- Low-frequency pattern handling
- Chart.js pie chart structure validation

##### Pattern Detail Enrichment (AC4)
- Pattern text preservation
- Suggested rule inclusion
- Example snippet attachment (up to 3)
- Example formatting validation
- Confidence score storage
- Metadata linkage validation

##### Type Safety and Error Handling (AC6)
- TypeScript interface validation
- Input structure validation
- Null/undefined handling (return empty ChartData)
- Type guard validation
- Invalid input error handling
- AR22 error compliance

### 2. Integration-Level Acceptance Tests
**File:** `/tests/integration/transform-pattern-data.integration.test.ts`
**Test Count:** 50+ tests
**Coverage:** AC1, AC2, AC3, AC4, AC5

#### Test Categories:

##### End-to-End Transformation Pipelines
- **Frequency Chart Pipeline (AC1, AC4)**
  - Realistic Epic 2 data transformation
  - Pattern detail preservation for drill-down
  - Mixed category and frequency handling

- **Temporal Trend Pipeline (AC2, AC4)**
  - Day/week/month period transformations
  - Longitudinal pattern handling
  - Different time range handling
  - Invalid timestamp filtering

- **Category Distribution Pipeline (AC3, AC4)**
  - Realistic data transformation
  - Percentage calculation validation
  - Uneven distribution handling
  - Pattern detail preservation

##### Performance Tests (AC5)
- **Small Dataset Performance (< 1 second)**
  - 100 patterns: < 1 second
  - 1,000 patterns: < 1 second (all chart types)
  - Frequency, trend, and distribution chart validation

- **Large Dataset Performance (< 5 seconds)**
  - 10,000 patterns: < 5 seconds (all chart types)
  - Frequency, trend, and distribution chart validation

- **Performance Characteristics**
  - Efficient data structure validation
  - Memory efficiency validation
  - Linear scaling validation

##### Data Integrity Tests
- Pattern data preservation through pipeline
- Consistent indexing validation
- Missing optional field handling
- Chart.js compatibility validation

##### Edge Case Integration Tests
- Empty dataset handling
- Single pattern dataset
- Same timestamp patterns
- Extreme frequency values
- Same category patterns
- All categories represented

## Test Pyramid Distribution

```
                    ┌─────────────┐
                    │   E2E (5%)  │  ← UI-specific flows only
                    │   ~6 tests  │    (Chart rendering)
                    └─────────────┘
                  ┌───────────────────┐
                  │  Integration (25%) │  ← End-to-end pipelines
                  │    ~50 tests       │    (Real data flows)
                  └───────────────────┘
               ┌────────────────────────────┐
               │      API-Level (70%)        │  ← Business logic
               │       ~80 tests             │    (Interface contracts)
               └────────────────────────────┘
```

## Acceptance Criteria Coverage

### AC1: Pattern Frequency Transformation ✅
**API-Level Tests:**
- Group patterns by category
- Sum frequencies within each category
- Preserve individual pattern details
- Handle edge cases (empty, single, 10K+)
- Return Chart.js-compatible structure

**Integration Tests:**
- End-to-end transformation with realistic data
- Drill-down interaction validation
- Mixed category handling

### AC2: Temporal Trend Transformation ✅
**API-Level Tests:**
- Extract temporal data from timestamps
- Group by time periods (day/week/month)
- Handle longitudinal patterns
- Filter invalid timestamps
- Return time-series ChartData

**Integration Tests:**
- Day/week/month transformation pipelines
- Longitudinal pattern validation
- Different time range handling
- Invalid timestamp filtering

### AC3: Category Distribution Transformation ✅
**API-Level Tests:**
- Count patterns per category
- Calculate percentages
- Create Chart.js pie dataset
- Handle dominant categories
- Include "other" category for low-frequency patterns

**Integration Tests:**
- End-to-end distribution transformation
- Percentage calculation validation
- Uneven distribution handling

### AC4: Pattern Detail Enrichment ✅
**API-Level Tests:**
- Preserve pattern_text
- Include suggested_rule
- Attach example snippets (up to 3)
- Format examples correctly
- Store confidence scores
- Maintain metadata linkage

**Integration Tests:**
- Pattern detail preservation through pipeline
- Example snippet validation
- Missing field handling

### AC5: Performance with Large Datasets ✅
**Integration Tests:**
- < 1 second for 1,000 patterns (all chart types)
- < 5 seconds for 10,000 patterns (all chart types)
- Efficient data structure validation
- Memory efficiency validation

### AC6: Type Safety and Error Handling ✅
**API-Level Tests:**
- Strict TypeScript interfaces
- Input validation
- Null/undefined handling (return empty ChartData)
- Type guards
- AR22 compliant errors

## Test Data Fixtures

### Realistic MergedPattern Dataset
Created from Epic 2's pattern detection pipeline, including:
- 6 patterns across 4 categories
- Multiple examples per pattern
- Different session counts (1-5)
- Various frequencies (2-25)
- Mixed content types
- New and recurring patterns

### Longitudinal Patterns Dataset
Patterns with session_count > 1 for testing:
- Multi-session pattern tracking
- Frequency change calculations
- Time-series data generation

### Large Dataset Generator
Helper function to create datasets of any size:
- Configurable pattern count
- Random category assignment
- Realistic frequency ranges
- Various session counts

## Key Testing Patterns

### 1. Given-When-Then Structure
```typescript
test('should group patterns by category (AC1)', () => {
  // Given: MergedPattern[] data from Epic 2
  const samplePatterns = [...];

  // When: transforming data for bar chart
  const result = transformToFrequencyChart(samplePatterns);

  // Then: system groups patterns by category
  expect(result.labels).toContain(PatternCategory.CODE_STYLE);
  expect(result.labels).toContain(PatternCategory.CONVENTION);
});
```

### 2. Performance Assertions
```typescript
test('should complete in < 1 second for 1,000 patterns (AC5)', () => {
  const dataset = createLargeDataset(1000);

  const startTime = performance.now();
  const result = transformToFrequencyChart(dataset);
  const duration = performance.now() - startTime;

  expect(result).toBeDefined();
  expect(duration).toBeLessThan(1000);
});
```

### 3. Data Integrity Validation
```typescript
test('should preserve all pattern data through transformation pipeline', () => {
  const result = transformToFrequencyChart(realisticMergedPatterns);

  const totalInputFrequency = realisticMergedPatterns.reduce(
    (sum, pattern) => sum + pattern.total_frequency,
    0
  );
  const totalOutputFrequency = result.datasets[0].data.reduce(
    (sum, frequency) => sum + frequency,
    0
  );

  expect(totalOutputFrequency).toBe(totalInputFrequency);
});
```

### 4. Error Handling Validation
```typescript
test('should handle null/undefined inputs gracefully (AC6)', () => {
  const nullResult = transformToFrequencyChart(null as any);
  const undefinedResult = transformToFrequencyChart(undefined as any);

  expect(nullResult).toBeDefined();
  expect(nullResult.labels).toHaveLength(0);
  expect(undefinedResult).toBeDefined();
  expect(undefinedResult.labels).toHaveLength(0);
});
```

## Running the Tests

### Run All Tests
```bash
npm test
```

### Run API-Level Tests Only
```bash
npm test tests/api/transform-pattern-data.acceptance.test.ts
```

### Run Integration Tests Only
```bash
npm test tests/integration/transform-pattern-data.integration.test.ts
```

### Run with Coverage
```bash
npm test -- --coverage
```

## Expected Test Results (TDD Red Phase)

All tests should **FAIL** initially because:
1. Types and interfaces don't exist yet
2. Transformation functions are not implemented
3. Validation utilities are not created
4. Error handling is not in place

This is the expected TDD red phase state. Implementation will make tests pass (green phase).

## Next Steps (Dev Phase)

1. **Create Types** (`src/visualization/types.ts`)
   - PatternFrequencyData interface
   - PatternTrendData interface
   - CategoryDistributionData interface
   - PatternTooltipData interface
   - ChartMetadata interface
   - PatternTransformationErrorCode enum
   - PatternTransformationAR22Error class

2. **Implement Transformers** (`src/visualization/transformers.ts`)
   - transformToFrequencyChart(patterns: MergedPattern[]): PatternFrequencyData
   - transformToTrendChart(patterns: MergedPattern[], period: 'day' | 'week' | 'month'): PatternTrendData
   - transformToDistributionChart(patterns: MergedPattern[]): CategoryDistributionData

3. **Add Validation Utilities**
   - validatePatterns(patterns: unknown): asserts MergedPattern[]
   - isMergedPattern(obj: unknown): obj is MergedPattern

4. **Run Tests and Iterate**
   - Make tests pass one by one
   - Refactor for performance (AC5)
   - Ensure AR22 compliance (AC6)

## Test Maintenance

### When Adding New Features
1. Write failing tests first (API-level)
2. Add integration tests for end-to-end validation
3. Implement feature
4. Verify all tests pass

### When Modifying Existing Features
1. Update affected tests
2. Ensure backward compatibility
3. Run full test suite
4. Check performance benchmarks

### When Fixing Bugs
1. Write regression test for the bug
2. Fix the bug
3. Verify regression test passes
4. Check for side effects

## Test Coverage Goals

- **Line Coverage:** > 90%
- **Branch Coverage:** > 85%
- **Function Coverage:** 100%
- **AC Coverage:** 100% (all 6 ACs)

## Notes

- No E2E tests for browser rendering (out of scope for API transformers)
- Performance tests are integration-level, not unit-level
- Chart.js library is tested separately (Story 3-1)
- Epic 2 integration validated through realistic test fixtures
- All error messages must be AR22 compliant
- TypeScript strict mode enforced throughout

## References

- [Story 3-2 Implementation Artifact](_bmad-output/implementation-artifacts/3-2-transform-pattern-data-for-visualization-yolo.md)
- [Epic 2 MergedPattern Schema](../src/pattern-matcher.ts)
- [Story 3-1 Chart.js Setup](_bmad-output/implementation-artifacts/3-1-select-and-setup-visualization-library-yolo.md)
- [AR22 Error Handling Standard](../docs/ar22-error-handling.md)
