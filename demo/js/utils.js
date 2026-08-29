/**
 * Utility Functions
 * Common utility functions for the SBB Lost & Found demo
 */

import { CONFIG } from './config.js';

/**
 * Debounce function to limit API calls
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Format date for display
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-CH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Generate a random ID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * Validate form data
 */
export class FormValidator {
  constructor() {
    this.errors = new Map();
  }

  /**
   * Validate required field
   */
  required(value, fieldName) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      this.addError(fieldName, `${fieldName} is required`);
      return false;
    }
    return true;
  }

  /**
   * Validate minimum length
   */
  minLength(value, minLength, fieldName) {
    if (value && value.length < minLength) {
      this.addError(fieldName, `${fieldName} must be at least ${minLength} characters`);
      return false;
    }
    return true;
  }

  /**
   * Validate maximum length
   */
  maxLength(value, maxLength, fieldName) {
    if (value && value.length > maxLength) {
      this.addError(fieldName, `${fieldName} must not exceed ${maxLength} characters`);
      return false;
    }
    return true;
  }

  /**
   * Validate email format
   */
  email(value, fieldName) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && !emailRegex.test(value)) {
      this.addError(fieldName, `${fieldName} must be a valid email address`);
      return false;
    }
    return true;
  }

  /**
   * Add error to the collection
   */
  addError(fieldName, message) {
    if (!this.errors.has(fieldName)) {
      this.errors.set(fieldName, []);
    }
    this.errors.get(fieldName).push(message);
  }

  /**
   * Get errors for a specific field
   */
  getFieldErrors(fieldName) {
    return this.errors.get(fieldName) || [];
  }

  /**
   * Get all errors
   */
  getAllErrors() {
    return Array.from(this.errors.entries()).reduce((acc, [field, errors]) => {
      acc[field] = errors;
      return acc;
    }, {});
  }

  /**
   * Check if validation passed
   */
  isValid() {
    return this.errors.size === 0;
  }

  /**
   * Clear all errors
   */
  clear() {
    this.errors.clear();
  }

  /**
   * Validate lost item form data
   */
  validateLostItem(data) {
    this.clear();

    this.required(data.title, 'Title');
    this.minLength(data.title, CONFIG.VALIDATION.TITLE_MIN_LENGTH, 'Title');
    this.maxLength(data.title, CONFIG.VALIDATION.TITLE_MAX_LENGTH, 'Title');

    this.required(data.description, 'Description');
    this.minLength(data.description, CONFIG.VALIDATION.DESCRIPTION_MIN_LENGTH, 'Description');
    this.maxLength(data.description, CONFIG.VALIDATION.DESCRIPTION_MAX_LENGTH, 'Description');

    this.required(data.category, 'Category');
    this.required(data.lostLocation, 'Lost Location');

    if (data.contactEmail) {
      this.email(data.contactEmail, 'Contact Email');
    }

    return this.isValid();
  }
}

/**
 * Toast notification system
 */
export class ToastManager {
  constructor() {
    this.container = this.createContainer();
    this.toasts = new Map();
  }

  createContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Show toast notification
   */
  show(message, type = 'info', duration = CONFIG.UI.TOAST_DURATION) {
    const id = generateId();
    const toast = this.createToast(id, message, type);

    this.container.appendChild(toast);
    this.toasts.set(id, toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  createToast(id, message, type) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.dataset.id = id;

    const icon = this.getIcon(type);
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${sanitizeHtml(message)}</span>
        <button class="toast-close" onclick="window.toastManager.remove('${id}')">&times;</button>
      </div>
    `;

    return toast;
  }

  getIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
    };
    return icons[type] || icons.info;
  }

  /**
   * Remove toast by ID
   */
  remove(id) {
    const toast = this.toasts.get(id);
    if (toast) {
      toast.classList.add('hide');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
        this.toasts.delete(id);
      }, CONFIG.UI.ANIMATION_DURATION);
    }
  }

  /**
   * Convenience methods
   */
  success(message, duration) {
    return this.show(message, 'success', duration);
  }

  error(message, duration) {
    return this.show(message, 'error', duration);
  }

  warning(message, duration) {
    return this.show(message, 'warning', duration);
  }

  info(message, duration) {
    return this.show(message, 'info', duration);
  }
}

/**
 * Loading state manager
 */
export class LoadingManager {
  constructor() {
    this.loadingElements = new Set();
    this.globalLoading = false;
  }

  /**
   * Show loading on element
   */
  show(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (element) {
      element.classList.add('loading');
      element.disabled = true;
      this.loadingElements.add(element);
    }
  }

  /**
   * Hide loading on element
   */
  hide(element) {
    if (typeof element === 'string') {
      element = document.querySelector(element);
    }

    if (element) {
      element.classList.remove('loading');
      element.disabled = false;
      this.loadingElements.delete(element);
    }
  }

  /**
   * Show global loading overlay
   */
  showGlobal() {
    if (!this.globalLoading) {
      this.globalLoading = true;
      const overlay = this.createGlobalOverlay();
      document.body.appendChild(overlay);
    }
  }

  /**
   * Hide global loading overlay
   */
  hideGlobal() {
    if (this.globalLoading) {
      this.globalLoading = false;
      const overlay = document.getElementById('global-loading');
      if (overlay) {
        overlay.remove();
      }
    }
  }

  createGlobalOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'global-loading';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">Loading...</div>
      </div>
    `;
    return overlay;
  }
}

// Export singleton instances
export const toastManager = new ToastManager();
export const loadingManager = new LoadingManager();

// Make available globally for event handlers
window.toastManager = toastManager;
window.loadingManager = loadingManager;
