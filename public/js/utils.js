/**
 * utils.js - Utility functions for WaterLogged application
 * 
 * Provides common functionality for error handling, DOM manipulation,
 * feature detection, and data caching across the application.
 */

/**
 * In-memory cache implementation
 */
export const cache = {
  _store: new Map(),
  _expirations: new Map(),
  
  /**
   * Sets a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = null) {
    this._store.set(key, value);
    
    // Clear any existing expiration
    if (this._expirations.has(key)) {
      clearTimeout(this._expirations.get(key));
      this._expirations.delete(key);
    }
    
    // Set expiration if TTL provided
    if (ttl && ttl > 0) {
      const expireId = setTimeout(() => {
        this._store.delete(key);
        this._expirations.delete(key);
      }, ttl);
      this._expirations.set(key, expireId);
    }
  },
  
  /**
   * Gets a value from the cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined if not found
   */
  get(key) {
    return this._store.get(key);
  },
  
  /**
   * Checks if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is not expired
   */
  has(key) {
    return this._store.has(key);
  },
  
  /**
   * Removes a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    if (this._expirations.has(key)) {
      clearTimeout(this._expirations.get(key));
      this._expirations.delete(key);
    }
    this._store.delete(key);
  },
  
  /**
   * Clears all values from the cache
   */
  clear() {
    // Clear all expiration timers
    this._expirations.forEach(timerId => clearTimeout(timerId));
    this._expirations.clear();
    this._store.clear();
  }
};

/**
 * Enhanced fetch with error handling, timeout, and cache support
 * 
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {Object} cacheOptions - Caching options
 * @param {string} cacheOptions.cacheKey - Key to use for caching
 * @param {number} cacheOptions.cacheTTL - Time to live in milliseconds 
 * @returns {Promise<any>} Parsed response data
 */
export async function fetchWithFallback(url, options = {}, cacheOptions = null) {
  // Check cache first if enabled
  if (cacheOptions && cacheOptions.cacheKey) {
    const cachedData = cache.get(cacheOptions.cacheKey);
    if (cachedData) {
      console.log(`Using cached data for ${url}`);
      return cachedData;
    }
  }
  
  // Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Cache the successful response if caching is enabled
    if (cacheOptions && cacheOptions.cacheKey) {
      cache.set(cacheOptions.cacheKey, data, cacheOptions.cacheTTL);
    }
    
    return data;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    
    // Re-throw for caller to handle
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Safely select an element, avoiding null reference errors
 * 
 * @param {string} selector - CSS selector
 * @param {Element|Document} parent - Parent element (default: document)
 * @returns {Element|null} The selected element or null if not found
 */
export function safeSelect(selector, parent = document) {
  if (!parent) return null;
  return parent.querySelector(selector);
}

/**
 * Safely select multiple elements, avoiding null reference errors
 * 
 * @param {string} selector - CSS selector
 * @param {Element|Document} parent - Parent element (default: document)
 * @returns {Element[]} Array of selected elements (empty if none found)
 */
export function safeSelectAll(selector, parent = document) {
  if (!parent) return [];
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Initialize a feature only if required elements exist
 * 
 * @param {Function} initFunc - Function to run if elements exist
 * @param {string[]} requiredSelectors - Array of CSS selectors that must exist
 * @returns {boolean} True if feature was initialized
 */
export function initFeatureIfElementsExist(initFunc, requiredSelectors = []) {
  if (!requiredSelectors.length) {
    return initFunc();
  }
  
  // Check if all required elements exist
  const allExist = requiredSelectors.every(selector => {
    const element = document.querySelector(selector);
    return element !== null;
  });
  
  if (allExist) {
    return initFunc();
  }
  
  return false;
}

/**
 * Format a date in various ways
 * 
 * @param {Date} date - Date to format
 * @param {string} format - Format type ('simple', 'full', 'time', 'iso')
 * @returns {string} Formatted date string
 */
export function formatDate(date, format = 'full') {
  if (!date) return '';
  
  // Convert string to Date if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'simple':
      return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;
    case 'time':
      return dateObj.toLocaleTimeString();
    case 'iso':
      return dateObj.toISOString();
    case 'full':
    default:
      return dateObj.toLocaleString();
  }
}

/**
 * Safely parse JSON with a fallback value
 * 
 * @param {string} jsonString - JSON string to parse
 * @param {*} fallback - Value to return if parsing fails
 * @returns {*} Parsed object or fallback value
 */
export function safeJsonParse(jsonString, fallback = {}) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Debounce a function call
 * 
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
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
 * Throttle a function call
 * 
 * @param {Function} func - Function to throttle
 * @param {number} limit - Milliseconds to limit calls
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
  let waiting = false;
  return function executedFunction(...args) {
    if (!waiting) {
      func(...args);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    }
  };
}