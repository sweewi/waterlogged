/**
 * thingspeak-api.js - Module for handling ThingSpeak API interactions
 * 
 * Provides methods to fetch, parse, and cache data from ThingSpeak channels
 * with proper error handling and fallbacks.
 */

import { fetchWithFallback, cache, formatDate } from './utils.js';

// Configuration
const API_CONFIG = {
  BASE_URL: 'https://api.thingspeak.com',
  RESULTS_LIMIT: 50,
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  RETRY_DELAY: 60 * 1000, // 1 minute
};

// Channel IDs and API keys (these should ideally come from environment variables)
const CHANNELS = {
  RAINFALL: {
    id: 1234567, // Replace with your actual channel ID
    readKey: 'YOURAPIKEYHERE', // Replace with your actual API key
  }
};

/**
 * Fetches data from a ThingSpeak channel with error handling and caching
 * 
 * @param {Object} options - Channel options
 * @param {number} options.channelId - ThingSpeak channel ID
 * @param {string} options.readKey - ThingSpeak read API key
 * @param {number} options.results - Number of results to return (default: 50)
 * @param {string} options.fields - Comma-separated list of fields to fetch
 * @returns {Promise<Object>} - Channel data
 */
export async function fetchChannelData({ channelId, readKey, results = API_CONFIG.RESULTS_LIMIT, fields = null }) {
  const cacheKey = `thingspeak-${channelId}-${fields || 'all'}-${results}`;
  
  // Build API URL
  let url = `${API_CONFIG.BASE_URL}/channels/${channelId}/feeds.json?api_key=${readKey}&results=${results}`;
  if (fields) {
    url += `&fields=${fields}`;
  }
  
  try {
    // Attempt to fetch with caching
    return await fetchWithFallback(url, {
      timeout: 8000
    }, {
      cacheKey,
      cacheTTL: API_CONFIG.CACHE_TTL
    });
  } catch (error) {
    console.error(`Error fetching ThingSpeak channel ${channelId}:`, error);
    
    // Return cached data if available, even if expired
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      console.log(`Using fallback cached data for channel ${channelId}`);
      return {
        ...cachedData,
        isCachedFallback: true,
        fetchError: error.message
      };
    }
    
    // If no cache, propagate the error
    throw new Error(`Failed to fetch ThingSpeak data: ${error.message}`);
  }
}

/**
 * Fetches the latest rainfall data
 * 
 * @param {number} results - Number of results to fetch
 * @returns {Promise<Object>} - Processed rainfall data
 */
export async function fetchRainfallData(results = API_CONFIG.RESULTS_LIMIT) {
  try {
    const data = await fetchChannelData({
      channelId: CHANNELS.RAINFALL.id,
      readKey: CHANNELS.RAINFALL.readKey,
      results
    });
    
    return processRainfallData(data);
  } catch (error) {
    console.error('Error in fetchRainfallData:', error);
    // Return empty dataset with error flag
    return {
      timestamps: [],
      values: [],
      error: error.message,
      hasError: true
    };
  }
}

/**
 * Process raw ThingSpeak data into a format suitable for charts and visualizations
 * 
 * @param {Object} data - Raw ThingSpeak API response
 * @returns {Object} - Processed data with timestamps and values arrays
 */
function processRainfallData(data) {
  // Exit early if no data
  if (!data || !data.feeds || !Array.isArray(data.feeds)) {
    return {
      timestamps: [],
      values: [],
      hasError: true,
      error: 'No data available'
    };
  }
  
  // Process the data into separate arrays for timestamps and values
  const timestamps = [];
  const values = [];
  
  data.feeds.forEach(feed => {
    const timestamp = new Date(feed.created_at);
    timestamps.push(formatDate(timestamp, 'simple'));
    
    // Get the first field value from the feed, or 0 if not available
    const value = parseFloat(feed.field1) || 0;
    values.push(value);
  });
  
  return {
    timestamps,
    values,
    isCached: !!data.isCachedFallback,
    lastUpdated: new Date().toISOString(),
    hasError: false
  };
}

/**
 * Continuously update rainfall data at specified interval
 * 
 * @param {Function} callback - Function to call with updated data
 * @param {number} interval - Update interval in milliseconds (default: 5 minutes)
 * @returns {Object} - Controller with start and stop methods
 */
export function createRainfallDataUpdater(callback, interval = 5 * 60 * 1000) {
  let timerId = null;
  
  const update = async () => {
    try {
      const data = await fetchRainfallData();
      callback(data);
    } catch (error) {
      console.error('Error in rainfall updater:', error);
      // Call callback with error information
      callback({
        hasError: true,
        error: error.message,
        timestamps: [],
        values: []
      });
    }
  };
  
  return {
    start() {
      // Immediately fetch data
      update();
      // Then set interval
      timerId = setInterval(update, interval);
      return this;
    },
    
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      return this;
    },
    
    isRunning() {
      return timerId !== null;
    }
  };
}