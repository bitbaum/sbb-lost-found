/**
 * API Service Layer
 * Handles all API communication with the SBB Lost & Found backend
 */

import { CONFIG } from './config.js';

/**
 * HTTP Client with error handling and retry logic
 */
class HttpClient {
  constructor(baseURL, timeout = CONFIG.API.TIMEOUT) {
    this.baseURL = baseURL;
    this.timeout = timeout;
  }

  /**
   * Make HTTP request with proper error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await this.extractErrorData(response),
        );
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0, error.message);
    }
  }

  async extractErrorData(response) {
    try {
      return await response.json();
    } catch {
      return response.statusText;
    }
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

/**
 * Custom API Error class
 */
class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }

  get isNetworkError() {
    return this.status === 0;
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isClientError() {
    return this.status >= 400 && this.status < 500;
  }
}

/**
 * SBB Lost & Found API Service
 */
class LostFoundApiService {
  constructor() {
    this.client = new HttpClient(CONFIG.API.BASE_URL);
    this.authHeaders = {
      Authorization: `Bearer ${CONFIG.DEMO.JWT_TOKEN}`,
    };
  }

  /**
   * Health check
   */
  async checkHealth() {
    return this.client.get(CONFIG.API.ENDPOINTS.HEALTH);
  }

  /**
   * Create a new lost item report
   */
  async createLostItem(itemData) {
    return this.client.post(CONFIG.API.ENDPOINTS.LOST_ITEMS, itemData, {
      headers: this.authHeaders,
    });
  }

  /**
   * Get a specific lost item by ID
   */
  async getLostItem(itemId) {
    return this.client.get(`${CONFIG.API.ENDPOINTS.LOST_ITEMS}/${itemId}`, {
      headers: this.authHeaders,
    });
  }

  /**
   * Search lost items with pagination and filters
   */
  async searchLostItems(params = {}) {
    const searchParams = new URLSearchParams({
      limit: CONFIG.DEMO.ITEMS_PER_PAGE,
      ...params,
    });

    return this.client.get(`${CONFIG.API.ENDPOINTS.SEARCH}?${searchParams}`, {
      headers: this.authHeaders,
    });
  }

  /**
   * Update a lost item
   */
  async updateLostItem(itemId, updates) {
    return this.client.put(`${CONFIG.API.ENDPOINTS.LOST_ITEMS}/${itemId}`, updates, {
      headers: this.authHeaders,
    });
  }

  /**
   * Delete a lost item
   */
  async deleteLostItem(itemId) {
    return this.client.delete(`${CONFIG.API.ENDPOINTS.LOST_ITEMS}/${itemId}`, {
      headers: this.authHeaders,
    });
  }

  /**
   * Get API documentation URL
   */
  getDocsUrl() {
    return `${CONFIG.API.BASE_URL}${CONFIG.API.ENDPOINTS.DOCS}`;
  }
}

// Export singleton instance
export const apiService = new LostFoundApiService();
export { ApiError };
