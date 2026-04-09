/**
 * Dashboard Filters (Story 3-4)
 *
 * Provides interactive filtering capabilities for dashboard.
 * Supports date range, category, frequency threshold, and search filters (AC2).
 *
 * Features:
 * - Date range filtering (AC2)
 * - Category filtering (AC2)
 * - Frequency threshold slider (AC2)
 * - Search functionality (AC2)
 * - Debounced filter updates (AC6)
 * - URL state persistence (AC2)
 *
 * @module visualization/dashboard-filters
 */

import { MergedPattern } from '../pattern-matcher';
import { PatternCategory } from '../pattern-detector';

// ============================================================================
// FILTER STATE TYPES
// ============================================================================

/**
 * Date range filter options
 *
 * @type DateRangeFilter
 */
export type DateRangeFilter = '7-days' | '30-days' | '90-days' | 'all-time';

/**
 * Dashboard filter state
 *
 * @interface FilterState
 */
export interface FilterState {
  /** Date range filter */
  dateRange: DateRangeFilter;
  /** Selected categories */
  categories: PatternCategory[];
  /** Minimum frequency threshold */
  frequencyThreshold: number;
  /** Search text for pattern_text/suggested_rule */
  searchText: string;
}

/**
 * Dashboard filter element
 *
 * @interface DashboardFilter
 */
export interface DashboardFilter {
  /** Filter type */
  type: 'date-range' | 'category' | 'threshold' | 'search';
  /** Filter element */
  element: HTMLElement;
  /** Get current filter value */
  getValue: () => any;
  /** Set filter value */
  setValue: (value: any) => void;
  /** Cleanup debounce timers (CRITICAL FIX: Memory leak prevention) */
  cleanup?: () => void;
}

/**
 * Filter configuration
 *
 * @interface FilterConfig
 */
export interface FilterConfig {
  /** Container element ID */
  containerId: string;
  /** Patterns to filter */
  patterns: MergedPattern[];
  /** Callback when filter changes */
  onFilterChange: (filters: Partial<FilterState>) => void;
  /** Initial filter state */
  initialFilters?: Partial<FilterState>;
}

// ============================================================================
// FILTER CREATION
// ============================================================================

/**
 * Create dashboard filters (AC2)
 *
 * YOLO Approach: Simple HTML form controls, iterate based on UX testing.
 *
 * @param config - Filter configuration
 * @returns Array of filter elements
 */
export function createFilters(config: FilterConfig): DashboardFilter[] {
  const container = document.getElementById(config.containerId);

  if (!container) {
    throw new Error(`Filter container not found: ${config.containerId}`);
  }

  // Clear existing content
  container.innerHTML = '';

  // Create filter form
  const form = document.createElement('div');
  form.className = 'dashboard-filters';
  form.setAttribute('role', 'form');
  form.setAttribute('aria-label', 'Dashboard filters');

  // Apply filter container styles
  Object.assign(form.style, {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '0.5rem',
    marginBottom: '1rem',
  });

  const filters: DashboardFilter[] = [];

  // Date range filter
  const dateRangeFilter = createDateRangeFilter(config, (value) => {
    config.onFilterChange({ dateRange: value });
  });
  filters.push(dateRangeFilter);
  form.appendChild(dateRangeFilter.element);

  // Category filter
  const categoryFilter = createCategoryFilter(config, (value) => {
    config.onFilterChange({ categories: value });
  });
  filters.push(categoryFilter);
  form.appendChild(categoryFilter.element);

  // Frequency threshold slider
  const thresholdFilter = createThresholdFilter(config, (value) => {
    config.onFilterChange({ frequencyThreshold: value });
  });
  filters.push(thresholdFilter);
  form.appendChild(thresholdFilter.element);

  // Search input
  const searchFilter = createSearchFilter(config, (value) => {
    config.onFilterChange({ searchText: value });
  });
  filters.push(searchFilter);
  form.appendChild(searchFilter.element);

  // Reset filters button
  const resetButton = createResetButton(config, filters);
  form.appendChild(resetButton);

  container.appendChild(form);

  return filters;
}

/**
 * Create date range filter (AC2)
 *
 * @private
 * @param config - Filter configuration
 * @param onChange - Change callback
 * @returns Date range filter
 */
function createDateRangeFilter(
  config: FilterConfig,
  onChange: (value: DateRangeFilter) => void
): DashboardFilter {
  const wrapper = document.createElement('div');
  wrapper.className = 'filter-group';

  const label = document.createElement('label');
  label.textContent = 'Date Range:';
  label.setAttribute('for', `${config.containerId}-date-range`);
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  label.style.fontWeight = 'bold';

  const select = document.createElement('select');
  select.id = `${config.containerId}-date-range`;
  select.name = 'dateRange';
  select.setAttribute('aria-label', 'Select date range for filtering patterns');

  // Add options
  const options: { value: DateRangeFilter; label: string }[] = [
    { value: '7-days', label: 'Last 7 days' },
    { value: '30-days', label: 'Last 30 days' },
    { value: '90-days', label: 'Last 90 days' },
    { value: 'all-time', label: 'All time' },
  ];

  options.forEach(option => {
    const optElement = document.createElement('option');
    optElement.value = option.value;
    optElement.textContent = option.label;
    select.appendChild(optElement);
  });

  // Set initial value
  const initialValue = config.initialFilters?.dateRange || 'all-time';
  select.value = initialValue;

  // Add change handler
  select.addEventListener('change', (e) => {
    const value = (e.target as HTMLSelectElement).value as DateRangeFilter;
    onChange(value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  return {
    type: 'date-range',
    element: wrapper,
    getValue: () => select.value as DateRangeFilter,
    setValue: (value: DateRangeFilter) => {
      select.value = value;
    },
  };
}

/**
 * Create category filter (AC2)
 *
 * @private
 * @param config - Filter configuration
 * @param onChange - Change callback
 * @returns Category filter
 */
function createCategoryFilter(
  config: FilterConfig,
  onChange: (value: PatternCategory[]) => void
): DashboardFilter {
  const wrapper = document.createElement('div');
  wrapper.className = 'filter-group';

  const label = document.createElement('label');
  label.textContent = 'Categories:';
  label.setAttribute('for', `${config.containerId}-categories`);
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  label.style.fontWeight = 'bold';

  // Get unique categories from patterns
  const uniqueCategories = Array.from(
    new Set(config.patterns.map(p => p.category))
  ).sort();

  const select = document.createElement('select');
  select.id = `${config.containerId}-categories`;
  select.name = 'categories';
  select.multiple = true;
  select.setAttribute('aria-label', 'Select categories to display');
  select.setAttribute('aria-multiselectable', 'true');
  select.style.width = '200px';
  select.style.height = '80px';

  uniqueCategories.forEach(category => {
    const optElement = document.createElement('option');
    optElement.value = category;
    optElement.textContent = category;
    select.appendChild(optElement);
  });

  // Add keyboard support (AC5)
  select.tabIndex = 0;

  // Set initial value
  const initialValue = config.initialFilters?.categories || [];
  initialValue.forEach(value => {
    const option = Array.from(select.options).find(opt => opt.value === value);
    if (option) {
      option.selected = true;
    }
  });

  // Add change handler
  select.addEventListener('change', (e) => {
    const selectedOptions = Array.from((e.target as HTMLSelectElement).selectedOptions);
    const value = selectedOptions.map(opt => opt.value as PatternCategory);
    onChange(value);
  });

  wrapper.appendChild(label);
  wrapper.appendChild(select);

  return {
    type: 'category',
    element: wrapper,
    getValue: () => {
      const selectedOptions = Array.from(select.selectedOptions);
      return selectedOptions.map(opt => opt.value as PatternCategory);
    },
    setValue: (value: PatternCategory[]) => {
      Array.from(select.options).forEach(option => {
        option.selected = value.includes(option.value as PatternCategory);
      });
    },
  };
}

/**
 * Create frequency threshold slider (AC2)
 *
 * @private
 * @param config - Filter configuration
 * @param onChange - Change callback
 * @returns Threshold filter
 */
function createThresholdFilter(
  config: FilterConfig,
  onChange: (value: number) => void
): DashboardFilter {
  const wrapper = document.createElement('div');
  wrapper.className = 'filter-group';

  const label = document.createElement('label');
  label.textContent = 'Min Frequency:';
  label.setAttribute('for', `${config.containerId}-threshold`);
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  label.style.fontWeight = 'bold';

  const container = document.createElement('div');
  container.style.display = 'flex';
  container.style.alignItems = 'center';
  container.style.gap = '0.5rem';

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.id = `${config.containerId}-threshold`;
  slider.name = 'frequencyThreshold';
  slider.min = '0';
  slider.max = '100';
  slider.step = '1';
  slider.setAttribute('aria-label', 'Minimum pattern frequency');

  // Set initial value
  const initialValue = config.initialFilters?.frequencyThreshold || 0;
  slider.value = initialValue.toString();

  const valueDisplay = document.createElement('span');
  valueDisplay.textContent = initialValue.toString();
  valueDisplay.setAttribute('aria-live', 'polite');
  valueDisplay.style.minWidth = '2rem';

  // Add input handler with debounce (200ms) - AC6
  // CRITICAL FIX: Store timer for cleanup to prevent memory leaks
  let debounceTimerId: number | null = null;
  slider.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    valueDisplay.textContent = value.toString();

    if (debounceTimerId) {
      clearTimeout(debounceTimerId);
    }

    debounceTimerId = window.setTimeout(() => {
      onChange(value);
    }, 200);
  });

  // CRITICAL FIX: Add cleanup function
  const cleanup = () => {
    if (debounceTimerId) {
      clearTimeout(debounceTimerId);
      debounceTimerId = null;
    }
  };

  container.appendChild(slider);
  container.appendChild(valueDisplay);
  wrapper.appendChild(label);
  wrapper.appendChild(container);

  return {
    type: 'threshold',
    element: wrapper,
    getValue: () => parseInt(slider.value, 10),
    setValue: (value: number) => {
      slider.value = value.toString();
      valueDisplay.textContent = value.toString();
    },
    cleanup, // CRITICAL FIX: Expose cleanup for memory leak prevention
  };
}

/**
 * Create search filter (AC2)
 *
 * @private
 * @param config - Filter configuration
 * @param onChange - Change callback
 * @returns Search filter
 */
function createSearchFilter(
  config: FilterConfig,
  onChange: (value: string) => void
): DashboardFilter {
  const wrapper = document.createElement('div');
  wrapper.className = 'filter-group';

  const label = document.createElement('label');
  label.textContent = 'Search:';
  label.setAttribute('for', `${config.containerId}-search`);
  label.style.display = 'block';
  label.style.marginBottom = '0.25rem';
  label.style.fontWeight = 'bold';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = `${config.containerId}-search`;
  input.name = 'searchText';
  input.placeholder = 'Search patterns...';
  input.setAttribute('aria-label', 'Search patterns by text');
  input.style.width = '100%';
  input.style.padding = '0.5rem';
  input.style.border = '1px solid #d1d5db';
  input.style.borderRadius = '0.25rem';

  // Set initial value
  const initialValue = config.initialFilters?.searchText || '';
  input.value = initialValue;

  // Add input handler with debounce (300ms) - AC6
  // CRITICAL FIX: Store timer for cleanup to prevent memory leaks
  let debounceTimerId: number | null = null;
  input.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;

    if (debounceTimerId) {
      clearTimeout(debounceTimerId);
    }

    debounceTimerId = window.setTimeout(() => {
      onChange(value);
    }, 300);
  });

  // CRITICAL FIX: Add cleanup function
  const cleanup = () => {
    if (debounceTimerId) {
      clearTimeout(debounceTimerId);
      debounceTimerId = null;
    }
  };

  wrapper.appendChild(label);
  wrapper.appendChild(input);

  return {
    type: 'search',
    element: wrapper,
    getValue: () => input.value,
    setValue: (value: string) => {
      input.value = value;
    },
    cleanup, // CRITICAL FIX: Expose cleanup for memory leak prevention
  };
}

/**
 * Create reset filters button (AC2)
 *
 * @private
 * @param config - Filter configuration
 * @param filters - Array of filters to reset
 * @returns Reset button element
 */
function createResetButton(config: FilterConfig, filters: DashboardFilter[]): HTMLElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Reset Filters';
  button.className = 'reset-filters-button';
  button.setAttribute('aria-label', 'Reset all filters to default values');

  Object.assign(button.style, {
    padding: '0.5rem 1rem',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginLeft: 'auto',
  });

  button.addEventListener('click', () => {
    // Reset all filters to default values
    filters.forEach(filter => {
      switch (filter.type) {
        case 'date-range':
          filter.setValue('all-time');
          break;
        case 'category':
          filter.setValue([]);
          break;
        case 'threshold':
          filter.setValue(0);
          break;
        case 'search':
          filter.setValue('');
          break;
      }
    });

    // Trigger filter change callback
    config.onFilterChange({
      dateRange: 'all-time',
      categories: [],
      frequencyThreshold: 0,
      searchText: '',
    });
  });

  return button;
}

// ============================================================================
// FILTER APPLICATION
// ============================================================================

/**
 * Apply filters to patterns (AC2)
 *
 * @param patterns - Patterns to filter
 * @param filters - Filter state
 * @returns Filtered patterns
 */
export function applyFilters(patterns: MergedPattern[], filters: FilterState): MergedPattern[] {
  // CRITICAL FIX: Validate patterns array
  if (!patterns || !Array.isArray(patterns)) {
    console.error('Invalid patterns array provided to applyFilters');
    return [];
  }

  let filtered = [...patterns];

  // Apply date range filter
  filtered = applyDateRangeFilter(filtered, filters.dateRange);

  // Apply category filter
  if (filters.categories.length > 0) {
    filtered = filtered.filter(p => filters.categories.includes(p.category));
  }

  // Apply frequency threshold filter
  if (filters.frequencyThreshold > 0) {
    filtered = filtered.filter(p => p.count >= filters.frequencyThreshold);
  }

  // Apply search filter
  if (filters.searchText.trim()) {
    const searchLower = filters.searchText.toLowerCase().trim();
    filtered = filtered.filter(p =>
      p.pattern_text.toLowerCase().includes(searchLower) ||
      (p.suggested_rule && p.suggested_rule.toLowerCase().includes(searchLower))
    );
  }

  return filtered;
}

/**
 * Apply date range filter (AC2)
 *
 * @private
 * @param patterns - Patterns to filter
 * @param dateRange - Date range filter
 * @returns Filtered patterns
 */
function applyDateRangeFilter(patterns: MergedPattern[], dateRange: DateRangeFilter): MergedPattern[] {
  if (dateRange === 'all-time') {
    return patterns;
  }

  const now = new Date();
  const cutoffDate = new Date();

  switch (dateRange) {
    case '7-days':
      cutoffDate.setDate(now.getDate() - 7);
      break;
    case '30-days':
      cutoffDate.setDate(now.getDate() - 30);
      break;
    case '90-days':
      cutoffDate.setDate(now.getDate() - 90);
      break;
  }

  return patterns.filter(p => {
    const lastSeen = p.last_seen ? new Date(p.last_seen) : new Date();
    return lastSeen >= cutoffDate;
  });
}

// ============================================================================
// FILTER STATE MANAGEMENT
// ============================================================================

/**
 * Get current filter state
 *
 * @param filters - Array of filter elements
 * @returns Current filter state
 */
export function getFilterState(filters: DashboardFilter[]): FilterState {
  const state: FilterState = {
    dateRange: 'all-time',
    categories: [],
    frequencyThreshold: 0,
    searchText: '',
  };

  filters.forEach(filter => {
    switch (filter.type) {
      case 'date-range':
        state.dateRange = filter.getValue();
        break;
      case 'category':
        state.categories = filter.getValue();
        break;
      case 'threshold':
        state.frequencyThreshold = filter.getValue();
        break;
      case 'search':
        state.searchText = filter.getValue();
        break;
    }
  });

  return state;
}

/**
 * Set filter state
 *
 * @param filters - Array of filter elements
 * @param state - Filter state to set
 */
export function setFilterState(filters: DashboardFilter[], state: Partial<FilterState>): void {
  // HIGH FIX: Validate filters array parameter
  if (!filters || !Array.isArray(filters)) {
    console.error('Invalid filters array provided to setFilterState');
    return;
  }

  filters.forEach(filter => {
    switch (filter.type) {
      case 'date-range':
        if (state.dateRange !== undefined) {
          filter.setValue(state.dateRange);
        }
        break;
      case 'category':
        if (state.categories !== undefined) {
          filter.setValue(state.categories);
        }
        break;
      case 'threshold':
        if (state.frequencyThreshold !== undefined) {
          filter.setValue(state.frequencyThreshold);
        }
        break;
      case 'search':
        if (state.searchText !== undefined) {
          filter.setValue(state.searchText);
        }
        break;
    }
  });
}

/**
 * Export filter state to URL query parameters (AC2)
 *
 * @param state - Filter state
 * @returns URL query parameters string
 */
export function exportFilterState(state: FilterState): string {
  const params = new URLSearchParams();

  if (state.dateRange !== 'all-time') {
    params.set('dateRange', state.dateRange);
  }

  if (state.categories.length > 0) {
    params.set('categories', state.categories.join(','));
  }

  if (state.frequencyThreshold > 0) {
    params.set('threshold', state.frequencyThreshold.toString());
  }

  if (state.searchText) {
    params.set('search', state.searchText);
  }

  return params.toString();
}

/**
 * Import filter state from URL query parameters (AC2)
 *
 * @param queryString - URL query string
 * @returns Partial filter state
 */
export function importFilterState(queryString: string): Partial<FilterState> {
  const params = new URLSearchParams(queryString);
  const state: Partial<FilterState> = {};

  const dateRange = params.get('dateRange');
  if (dateRange && ['7-days', '30-days', '90-days', 'all-time'].includes(dateRange)) {
    state.dateRange = dateRange as DateRangeFilter;
  }

  const categories = params.get('categories');
  if (categories) {
    state.categories = categories.split(',') as PatternCategory[];
  }

  const threshold = params.get('threshold');
  if (threshold) {
    state.frequencyThreshold = parseInt(threshold, 10);
  }

  const search = params.get('search');
  if (search) {
    state.searchText = search;
  }

  return state;
}
