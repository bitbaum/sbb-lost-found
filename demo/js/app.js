/**
 * Main Application Entry Point
 * Initializes and coordinates all components for the SBB Lost & Found demo
 */

import { LostItemForm, SearchComponent, StatsDashboard, HealthCheck } from './components.js';
import { toastManager, loadingManager } from './utils.js';
import { apiService } from './api.js';

/**
 * Main Application Class
 */
class SBBLostFoundApp {
  constructor() {
    this.components = {};
    this.isInitialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.isInitialized) return;

    try {
      loadingManager.showGlobal();

      // Initialize components
      await this.initializeComponents();

      // Set up component interactions
      this.setupComponentInteractions();

      // Start health monitoring
      this.components.healthCheck = new HealthCheck();

      // Show success message
      toastManager.success('SBB Lost & Found system ready!');

      this.isInitialized = true;
    } catch (error) {
      console.error('Application initialization failed:', error);
      toastManager.error('Failed to initialize application. Please refresh the page.');
    } finally {
      loadingManager.hideGlobal();
    }
  }

  /**
   * Initialize all UI components
   */
  async initializeComponents() {
    // Initialize form component
    this.components.lostItemForm = new LostItemForm('lostItemFormContainer');

    // Initialize search component
    this.components.searchComponent = new SearchComponent('searchContainer');

    // Initialize stats dashboard
    this.components.statsDashboard = new StatsDashboard('statsContainer');

    // Test API connection
    await this.testApiConnection();
  }

  /**
   * Test API connection on startup
   */
  async testApiConnection() {
    try {
      await apiService.checkHealth();
      console.log('✅ API connection successful');
    } catch (error) {
      console.warn('⚠️ API connection failed:', error.message);
      toastManager.warning('API connection issues detected. Some features may not work properly.');
    }
  }

  /**
   * Set up interactions between components
   */
  setupComponentInteractions() {
    // When a lost item is successfully submitted, refresh the search results
    this.components.lostItemForm.setOnSubmitSuccess((newItem) => {
      console.log('New item submitted:', newItem);

      // Refresh search results to show the new item
      this.components.searchComponent.refresh();

      // Refresh stats
      this.components.statsDashboard.loadStats();

      // Show additional success information
      toastManager.info(`Item "${newItem.title}" has been added to the database`);
    });

    // When a search result is clicked, show item details
    this.components.searchComponent.setOnResultClick((item) => {
      this.showItemDetails(item);
    });
  }

  /**
   * Show detailed view of an item
   */
  showItemDetails(item) {
    // Create a modal or detailed view
    const modal = this.createItemModal(item);
    document.body.appendChild(modal);

    // Show the modal
    requestAnimationFrame(() => {
      modal.classList.add('show');
    });
  }

  /**
   * Create a modal for item details
   */
  createItemModal(item) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>${item.title}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="item-details">
            <div class="detail-group">
              <label>Category:</label>
              <span class="category-badge">${this.getCategoryDisplay(item.category)}</span>
            </div>
            <div class="detail-group">
              <label>Description:</label>
              <p>${item.description}</p>
            </div>
            <div class="detail-group">
              <label>Lost Location:</label>
              <span>${item.lostLocation}</span>
            </div>
            <div class="detail-group">
              <label>Reported:</label>
              <span>${new Date(item.createdAt).toLocaleString('de-CH')}</span>
            </div>
            ${
              item.lostDate
                ? `
              <div class="detail-group">
                <label>Lost Date:</label>
                <span>${new Date(item.lostDate).toLocaleString('de-CH')}</span>
              </div>
            `
                : ''
            }
            <div class="detail-group">
              <label>Status:</label>
              <span class="status-badge status-${item.status || 'open'}">${item.status || 'Open'}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          <button class="btn btn-primary" onclick="window.open('${apiService.getDocsUrl()}', '_blank')">View API Docs</button>
        </div>
      </div>
    `;

    // Add modal styles if not already present
    this.ensureModalStyles();

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    return modal;
  }

  /**
   * Get category display with emoji
   */
  getCategoryDisplay(categoryId) {
    const categories = {
      electronics: '📱 Electronics',
      clothing: '👕 Clothing',
      bags: '🎒 Bags & Luggage',
      documents: '📄 Documents',
      keys: '🔑 Keys',
      jewelry: '💍 Jewelry',
      books: '📚 Books',
      other: '❓ Other',
    };
    return categories[categoryId] || categoryId;
  }

  /**
   * Ensure modal styles are present
   */
  ensureModalStyles() {
    if (document.getElementById('modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'modal-styles';
    styles.textContent = `
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: var(--z-modal);
        opacity: 0;
        transition: opacity var(--transition-normal);
        padding: var(--spacing-md);
      }

      .modal-overlay.show {
        opacity: 1;
      }

      .modal-content {
        background: var(--color-white);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-xl);
        max-width: 600px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        transform: translateY(-20px);
        transition: transform var(--transition-normal);
      }

      .modal-overlay.show .modal-content {
        transform: translateY(0);
      }

      .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--spacing-lg);
        border-bottom: 1px solid var(--color-gray-200);
      }

      .modal-header h3 {
        margin: 0;
        font-size: var(--font-size-xl);
      }

      .modal-close {
        background: none;
        border: none;
        font-size: var(--font-size-2xl);
        cursor: pointer;
        color: var(--color-gray-500);
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--radius-sm);
        transition: all var(--transition-fast);
      }

      .modal-close:hover {
        background: var(--color-gray-100);
        color: var(--color-gray-700);
      }

      .modal-body {
        padding: var(--spacing-lg);
      }

      .modal-footer {
        display: flex;
        gap: var(--spacing-md);
        justify-content: flex-end;
        padding: var(--spacing-lg);
        border-top: 1px solid var(--color-gray-200);
      }

      .item-details {
        display: grid;
        gap: var(--spacing-md);
      }

      .detail-group {
        display: grid;
        grid-template-columns: 120px 1fr;
        gap: var(--spacing-sm);
        align-items: start;
      }

      .detail-group label {
        font-weight: var(--font-weight-semibold);
        color: var(--color-gray-700);
      }

      .category-badge {
        display: inline-flex;
        align-items: center;
        background: var(--color-gray-100);
        color: var(--color-gray-700);
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
      }

      .status-badge {
        display: inline-block;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        text-transform: uppercase;
      }

      .status-open {
        background: var(--color-info-light);
        color: var(--color-info);
      }

      .status-resolved {
        background: var(--color-success-light);
        color: var(--color-success);
      }

      @media (max-width: 768px) {
        .detail-group {
          grid-template-columns: 1fr;
        }
        
        .modal-footer {
          flex-direction: column;
        }
      }
    `;
    document.head.appendChild(styles);
  }

  /**
   * Handle application errors
   */
  handleError(error, context = 'Application') {
    console.error(`${context} error:`, error);
    toastManager.error(`${context} error: ${error.message}`);
  }
}

/**
 * DOM Content Loaded Handler
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize the application
  window.sbbApp = new SBBLostFoundApp();

  try {
    await window.sbbApp.init();
    console.log('🚀 SBB Lost & Found Demo initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize SBB Lost & Found Demo:', error);
  }
});

/**
 * Export for testing and debugging
 */
export default SBBLostFoundApp;
