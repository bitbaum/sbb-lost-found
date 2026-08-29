/**
 * UI Components
 * Reusable UI components for the SBB Lost & Found demo
 */

import { CONFIG, CATEGORIES, ROUTES } from './config.js';
import { apiService, ApiError } from './api.js';
import {
  FormValidator,
  toastManager,
  loadingManager,
  formatDate,
  truncateText,
  debounce,
} from './utils.js';

/**
 * Lost Item Form Component
 */
export class LostItemForm {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.validator = new FormValidator();
    this.onSubmitSuccess = null;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Report Lost Item</h3>
          <p class="card-subtitle">Help us help you find your lost belongings</p>
        </div>
        <div class="card-body">
          <form id="lost-item-form" novalidate>
            <div class="form-group">
              <label for="title" class="form-label">Item Title *</label>
              <input 
                type="text" 
                id="title" 
                name="title" 
                class="form-control" 
                placeholder="e.g., Black iPhone 15 Pro"
                maxlength="${CONFIG.VALIDATION.TITLE_MAX_LENGTH}"
                required
              >
              <div class="form-error" id="title-error"></div>
              <div class="form-help">Brief, descriptive title (${CONFIG.VALIDATION.TITLE_MIN_LENGTH}-${CONFIG.VALIDATION.TITLE_MAX_LENGTH} characters)</div>
            </div>

            <div class="form-group">
              <label for="category" class="form-label">Category *</label>
              <select id="category" name="category" class="form-control form-select" required>
                <option value="">Select a category...</option>
                ${CATEGORIES.map(
                  (cat) => `
                  <option value="${cat.id}">${cat.icon} ${cat.label}</option>
                `,
                ).join('')}
              </select>
              <div class="form-error" id="category-error"></div>
            </div>

            <div class="form-group">
              <label for="description" class="form-label">Description *</label>
              <textarea 
                id="description" 
                name="description" 
                class="form-control form-textarea" 
                placeholder="Detailed description including color, brand, distinctive features..."
                maxlength="${CONFIG.VALIDATION.DESCRIPTION_MAX_LENGTH}"
                rows="4"
                required
              ></textarea>
              <div class="form-error" id="description-error"></div>
              <div class="form-help">Detailed description (${CONFIG.VALIDATION.DESCRIPTION_MIN_LENGTH}-${CONFIG.VALIDATION.DESCRIPTION_MAX_LENGTH} characters)</div>
            </div>

            <div class="form-group">
              <label for="lossLocation" class="form-label">Lost Location *</label>
              <input
                type="text"
                id="lossLocation"
                name="lossLocation"
                class="form-control"
                placeholder="e.g., Train from Zürich to Bern, Seat 42"
                list="routes-list"
                required
              >
              <datalist id="routes-list">
                ${ROUTES.map((route) => `<option value="${route}"></option>`).join('')}
              </datalist>
              <div class="form-error" id="lossLocation-error"></div>
              <div class="form-help">Where did you lose this item?</div>
            </div>

            <div class="form-group">
              <label for="lostDate" class="form-label">When Lost</label>
              <input 
                type="datetime-local" 
                id="lostDate" 
                name="lostDate" 
                class="form-control"
              >
              <div class="form-help">Approximate date and time (optional)</div>
            </div>

            <div class="form-group">
              <label for="contactEmail" class="form-label">Contact Email</label>
              <input 
                type="email" 
                id="contactEmail" 
                name="contactEmail" 
                class="form-control" 
                placeholder="your.email@example.com"
              >
              <div class="form-error" id="contactEmail-error"></div>
              <div class="form-help">Optional: We'll notify you if we find a match</div>
            </div>

            <div class="form-group">
              <label for="contactPhone" class="form-label">Contact Phone</label>
              <input 
                type="tel" 
                id="contactPhone" 
                name="contactPhone" 
                class="form-control" 
                placeholder="+41 XX XXX XX XX"
              >
              <div class="form-help">Optional: Alternative contact method</div>
            </div>

            <div class="card-footer">
              <button type="submit" class="btn btn-primary btn-lg btn-block">
                <span class="btn-text">Submit Report</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const form = document.getElementById('lost-item-form');
    const submitBtn = form.querySelector('button[type="submit"]');

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.handleSubmit(e.target, submitBtn);
    });

    // Real-time validation
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach((input) => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener(
        'input',
        debounce(() => this.validateField(input), CONFIG.UI.DEBOUNCE_DELAY),
      );
    });

    // Character counter for description
    const description = document.getElementById('description');
    const title = document.getElementById('title');

    this.setupCharacterCounter(description, CONFIG.VALIDATION.DESCRIPTION_MAX_LENGTH);
    this.setupCharacterCounter(title, CONFIG.VALIDATION.TITLE_MAX_LENGTH);
  }

  setupCharacterCounter(element, maxLength) {
    const helpText = element.parentNode.querySelector('.form-help');
    const updateCounter = () => {
      const remaining = maxLength - element.value.length;
      const originalText = helpText.textContent.split('(')[0];
      helpText.textContent = `${originalText}(${remaining} characters remaining)`;

      if (remaining < 50) {
        helpText.style.color = 'var(--color-warning)';
      } else if (remaining < 20) {
        helpText.style.color = 'var(--color-error)';
      } else {
        helpText.style.color = 'var(--color-gray-600)';
      }
    };

    element.addEventListener('input', updateCounter);
    updateCounter(); // Initial call
  }

  validateField(field) {
    const fieldName = field.name;
    const value = field.value.trim();
    const errorElement = document.getElementById(`${fieldName}-error`);

    // Clear previous errors for this field
    this.validator.errors.delete(fieldName);
    field.classList.remove('is-invalid');
    errorElement.textContent = '';

    // Validate based on field type
    switch (fieldName) {
      case 'title':
        this.validator.required(value, 'Title');
        this.validator.minLength(value, CONFIG.VALIDATION.TITLE_MIN_LENGTH, 'Title');
        this.validator.maxLength(value, CONFIG.VALIDATION.TITLE_MAX_LENGTH, 'Title');
        break;

      case 'description':
        this.validator.required(value, 'Description');
        this.validator.minLength(value, CONFIG.VALIDATION.DESCRIPTION_MIN_LENGTH, 'Description');
        this.validator.maxLength(value, CONFIG.VALIDATION.DESCRIPTION_MAX_LENGTH, 'Description');
        break;

      case 'category':
        this.validator.required(value, 'Category');
        break;

      case 'lossLocation':
        this.validator.required(value, 'Lost Location');
        break;

      case 'contactEmail':
        if (value) {
          this.validator.email(value, 'Contact Email');
        }
        break;
    }

    // Display errors
    const fieldErrors = this.validator.getFieldErrors(fieldName);
    if (fieldErrors.length > 0) {
      field.classList.add('is-invalid');
      errorElement.textContent = fieldErrors[0];
    }

    return fieldErrors.length === 0;
  }

  async handleSubmit(form, submitBtn) {
    loadingManager.show(submitBtn);

    try {
      // Validate entire form
      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Validate all fields
      let isValid = true;
      const fields = form.querySelectorAll('input, select, textarea');
      fields.forEach((field) => {
        if (!this.validateField(field)) {
          isValid = false;
        }
      });

      if (!isValid) {
        toastManager.error('Please fix the errors above');
        return;
      }

      // Submit to API
      const response = await apiService.createLostItem({
        title: data.title,
        description: data.description,
        category: data.category,
        lossLocation: data.lossLocation,
        approximateLossTime: data.lostDate || null,
        contactInfo: {
          email: data.contactEmail || null,
          phone: data.contactPhone || null,
        },
      });

      // Success handling
      toastManager.success('Lost item reported successfully!');
      form.reset();

      // Clear character counters
      const description = document.getElementById('description');
      const title = document.getElementById('title');
      description.dispatchEvent(new Event('input'));
      title.dispatchEvent(new Event('input'));

      // Notify parent component
      if (this.onSubmitSuccess) {
        this.onSubmitSuccess(response.data);
      }
    } catch (error) {
      console.error('Form submission error:', error);

      if (error instanceof ApiError) {
        if (error.isNetworkError) {
          toastManager.error('Network error. Please check your connection.');
        } else if (error.isServerError) {
          toastManager.error('Server error. Please try again later.');
        } else {
          toastManager.error(error.message || 'Failed to submit report');
        }
      } else {
        toastManager.error('An unexpected error occurred');
      }
    } finally {
      loadingManager.hide(submitBtn);
    }
  }

  setOnSubmitSuccess(callback) {
    this.onSubmitSuccess = callback;
  }
}

/**
 * Search Component
 */
export class SearchComponent {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.results = [];
    this.currentPage = 0;
    this.isLoading = false;
    this.onResultClick = null;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.loadInitialResults();
  }

  render() {
    this.container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Search Lost Items</h3>
          <p class="card-subtitle">Browse recent reports or search for specific items</p>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label for="searchInput" class="form-label">Search</label>
            <input 
              type="text" 
              id="searchInput" 
              class="form-control" 
              placeholder="Search by item name, description, or location..."
            >
            <div class="form-help">Search through all reported lost items</div>
          </div>

          <div class="form-group">
            <label for="categoryFilter" class="form-label">Filter by Category</label>
            <select id="categoryFilter" class="form-control form-select">
              <option value="">All categories</option>
              ${CATEGORIES.map(
                (cat) => `
                <option value="${cat.id}">${cat.icon} ${cat.label}</option>
              `,
              ).join('')}
            </select>
          </div>

          <div id="searchResults" class="search-results">
            <!-- Results will be populated here -->
          </div>

          <div id="loadMore" class="text-center" style="display: none;">
            <button class="btn btn-secondary" id="loadMoreBtn">Load More Results</button>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    // Search input with debouncing
    searchInput.addEventListener(
      'input',
      debounce(() => {
        this.performSearch();
      }, CONFIG.UI.DEBOUNCE_DELAY),
    );

    // Category filter
    categoryFilter.addEventListener('change', () => {
      this.performSearch();
    });

    // Load more button
    loadMoreBtn.addEventListener('click', () => {
      this.loadMore();
    });
  }

  async loadInitialResults() {
    await this.performSearch(true);
  }

  async performSearch(isInitial = false) {
    if (this.isLoading) return;

    this.isLoading = true;
    const resultsContainer = document.getElementById('searchResults');

    if (isInitial) {
      resultsContainer.innerHTML = '<div class="text-center"><div class="spinner"></div></div>';
    }

    try {
      const searchInput = document.getElementById('searchInput');
      const categoryFilter = document.getElementById('categoryFilter');

      const params = {
        offset: isInitial ? 0 : this.currentPage * CONFIG.DEMO.ITEMS_PER_PAGE,
        limit: CONFIG.DEMO.ITEMS_PER_PAGE,
      };

      if (searchInput.value.trim()) {
        params.query = searchInput.value.trim();
      }

      if (categoryFilter.value) {
        params.category = categoryFilter.value;
      }

      const response = await apiService.searchLostItems(params);

      if (isInitial) {
        this.results = response.data || [];
        this.currentPage = 0;
      } else {
        this.results = [...this.results, ...(response.data || [])];
      }

      this.renderResults();
      this.updateLoadMoreButton(response.pagination);
    } catch (error) {
      console.error('Search error:', error);
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Search Error</div>
          <div class="empty-description">
            Unable to load search results. Please try again.
          </div>
        </div>
      `;
    } finally {
      this.isLoading = false;
    }
  }

  async loadMore() {
    this.currentPage++;
    await this.performSearch(false);
  }

  renderResults() {
    const resultsContainer = document.getElementById('searchResults');

    if (this.results.length === 0) {
      resultsContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-title">No items found</div>
          <div class="empty-description">
            Try adjusting your search criteria or check back later for new reports.
          </div>
        </div>
      `;
      return;
    }

    const resultsHtml = this.results.map((item) => this.renderResultItem(item)).join('');
    resultsContainer.innerHTML = resultsHtml;

    // Attach click handlers
    resultsContainer.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.result-item');
      if (resultItem && this.onResultClick) {
        const itemId = resultItem.dataset.itemId;
        const item = this.results.find((r) => r.id === itemId);
        this.onResultClick(item);
      }
    });
  }

  renderResultItem(item) {
    const category = CATEGORIES.find((cat) => cat.id === item.category);
    const categoryDisplay = category ? `${category.icon} ${category.label}` : item.category;

    return `
      <div class="result-item" data-item-id="${item.id}">
        <div class="result-header">
          <h4 class="result-title">${item.title}</h4>
          <span class="result-category">${categoryDisplay}</span>
        </div>
        <p class="result-description">${truncateText(item.description, 150)}</p>
        <div class="result-meta">
          <span class="result-date">${formatDate(item.createdAt)}</span>
          <span class="result-location">${item.lossLocation || 'Location not specified'}</span>
        </div>
      </div>
    `;
  }

  updateLoadMoreButton(pagination) {
    const loadMoreContainer = document.getElementById('loadMore');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    if (pagination && pagination.total > this.results.length) {
      loadMoreContainer.style.display = 'block';
      loadMoreBtn.textContent = `Load More (${this.results.length} of ${pagination.total})`;
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }

  setOnResultClick(callback) {
    this.onResultClick = callback;
  }

  refresh() {
    this.performSearch(true);
  }
}

/**
 * Statistics Dashboard Component
 */
export class StatsDashboard {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.stats = {};
    this.init();
  }

  init() {
    this.render();
    this.loadStats();
    this.startAutoRefresh();
  }

  render() {
    this.container.innerHTML = `
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number" id="totalItems">-</div>
          <div class="stat-label">Total Reports</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="todayItems">-</div>
          <div class="stat-label">Today's Reports</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="resolvedItems">-</div>
          <div class="stat-label">Items Resolved</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="activeItems">-</div>
          <div class="stat-label">Active Cases</div>
        </div>
      </div>
    `;
  }

  async loadStats() {
    try {
      // Load recent items to calculate stats
      const response = await apiService.searchLostItems({ limit: 100 });
      const items = response.data || [];

      const today = new Date().toDateString();
      const todayItems = items.filter((item) => new Date(item.createdAt).toDateString() === today);

      // Update UI
      document.getElementById('totalItems').textContent =
        response.pagination?.total || items.length;
      document.getElementById('todayItems').textContent = todayItems.length;
      document.getElementById('resolvedItems').textContent = Math.floor(items.length * 0.75); // Mock resolved percentage
      document.getElementById('activeItems').textContent = Math.floor(items.length * 0.25); // Mock active percentage
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Show error state or fallback values
      document.getElementById('totalItems').textContent = '?';
      document.getElementById('todayItems').textContent = '?';
      document.getElementById('resolvedItems').textContent = '?';
      document.getElementById('activeItems').textContent = '?';
    }
  }

  startAutoRefresh() {
    setInterval(() => {
      this.loadStats();
    }, CONFIG.DEMO.REFRESH_INTERVAL);
  }
}

/**
 * Health Check Component
 */
export class HealthCheck {
  constructor() {
    this.status = 'unknown';
    this.init();
  }

  async init() {
    await this.checkHealth();
    this.startPeriodicCheck();
  }

  async checkHealth() {
    try {
      await apiService.checkHealth();
      this.updateStatus('healthy', 'API is operational');
    } catch (error) {
      console.error('Health check failed:', error);
      this.updateStatus('unhealthy', 'API is not responding');
    }
  }

  updateStatus(status, message) {
    this.status = status;

    // Update any health indicators in the UI
    const indicators = document.querySelectorAll('[data-health-indicator]');
    indicators.forEach((indicator) => {
      indicator.className = `health-indicator health-${status}`;
      indicator.title = message;
    });
  }

  startPeriodicCheck() {
    setInterval(() => {
      this.checkHealth();
    }, 30000); // Check every 30 seconds
  }
}

// Export components
export { LostItemForm, SearchComponent, StatsDashboard, HealthCheck };
