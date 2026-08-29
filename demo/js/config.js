/**
 * Application Configuration
 * Centralized configuration for the SBB Lost & Found demo
 */

export const CONFIG = {
  API: {
    BASE_URL: 'http://localhost:3001',
    ENDPOINTS: {
      HEALTH: '/health',
      LOST_ITEMS: '/api/lost-items',
      SEARCH: '/api/lost-items/search',
      DOCS: '/docs',
    },
    TIMEOUT: 10000,
  },

  DEMO: {
    // Generate a demo JWT with: make jwt PAYLOAD='{"id":"639de285-2671-4b32-8296-60b092502610","sbbUserId":"sbb_demo_user","email":"demo@sbb.ch"}'
    JWT_TOKEN: 'your-demo-jwt-token',
    ITEMS_PER_PAGE: 5,
    REFRESH_INTERVAL: 30000, // 30 seconds
  },

  UI: {
    ANIMATION_DURATION: 300,
    TOAST_DURATION: 5000,
    DEBOUNCE_DELAY: 300,
  },

  VALIDATION: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MIN_LENGTH: 10,
    DESCRIPTION_MAX_LENGTH: 1000,
  },
};

export const CATEGORIES = [
  { id: 'electronics', label: 'Electronics', icon: '📱' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'bags', label: 'Bags & Luggage', icon: '🎒' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'keys', label: 'Keys', icon: '🔑' },
  { id: 'jewelry', label: 'Jewelry', icon: '💍' },
  { id: 'books', label: 'Books', icon: '📚' },
  { id: 'other', label: 'Other', icon: '❓' },
];

export const ROUTES = [
  'Zürich HB → Bern',
  'Genève → Lausanne',
  'Basel SBB → Zürich HB',
  'Bern → Interlaken Ost',
  'St. Gallen → Zürich HB',
  'Lugano → Milano Centrale',
  'Zürich Flughafen → Zürich HB',
];
