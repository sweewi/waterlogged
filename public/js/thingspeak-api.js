/**
 * ThingSpeak API Integration for Waterlogged
 * Handles fetching and processing data from ThingSpeak API
 */

// ThingSpeak API configuration
const API_CONFIG = {
    baseUrl: 'https://api.thingspeak.com',
    readApiKey: '5C2PK262MD21Z0ZA',
    writeApiKey: 'LCW6EPJBSQ1C7IN1',
    channelId: '2875529',
    fields: {
        weight_g: 'field1',
        rainfall_in: 'field2',
        temperature: 'field3',
        humidity: 'field4'
    }
};

/**
 * Fetches the latest data entry from ThingSpeak
 * @returns {Promise<Object>} Latest data entry
 */
export async function getLatestData() {
    try {
        const url = `${API_CONFIG.baseUrl}/channels/${API_CONFIG.channelId}/feeds/last.json?api_key=${API_CONFIG.readApiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return formatThingspeakData(data);
    } catch (error) {
        console.error('Error fetching latest data:', error);
        throw error;
    }
}

/**
 * Fetches historical data from ThingSpeak based on specified parameters
 * @param {Object} options - Query options
 * @param {string} options.timeRange - Time range to fetch (e.g. '1h', '24h', '7d', '30d')
 * @param {number} options.resultsLimit - Maximum number of results to fetch (default: 100)
 * @returns {Promise<Array>} Array of data entries
 */
export async function getHistoricalData(options = {}) {
    try {
        const { timeRange = '24h', resultsLimit = 100 } = options;
        
        // Calculate start date based on timeRange
        const startDate = calculateStartDate(timeRange);
        
        // Build query parameters
        const params = new URLSearchParams({
            api_key: API_CONFIG.readApiKey,
            start: startDate.toISOString(),
            results: resultsLimit
        });
        
        const url = `${API_CONFIG.baseUrl}/channels/${API_CONFIG.channelId}/feeds.json?${params}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch historical data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.feeds.map(formatThingspeakData);
    } catch (error) {
        console.error('Error fetching historical data:', error);
        throw error;
    }
}

/**
 * Fetches data for comparison between two time periods
 * @param {string} periodType - Type of period ('today', 'thisWeek', 'thisMonth', etc.)
 * @returns {Promise<Array>} Formatted data for the period
 */
export async function fetchPeriodData(periodType) {
    try {
        const { startDate, endDate } = calculatePeriodDates(periodType);
        
        // Build query parameters
        const params = new URLSearchParams({
            api_key: API_CONFIG.readApiKey,
            start: startDate.toISOString(),
            end: endDate ? endDate.toISOString() : undefined
        });
        
        const url = `${API_CONFIG.baseUrl}/channels/${API_CONFIG.channelId}/feeds.json?${params}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch period data: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.feeds.map(entry => ({
            timestamp: new Date(entry.created_at),
            weight_g: parseFloat(entry[API_CONFIG.fields.weight_g] || 0),
            rainfall_in: parseFloat(entry[API_CONFIG.fields.rainfall_in] || 0),
            temperature: parseFloat(entry[API_CONFIG.fields.temperature] || 0),
            humidity: parseFloat(entry[API_CONFIG.fields.humidity] || 0)
        }));
    } catch (error) {
        console.error(`Error fetching period data for ${periodType}:`, error);
        throw error;
    }
}

/**
 * Calculates the start date based on the specified time range
 * @param {string} timeRange - Time range (e.g. '1h', '24h', '7d', '30d')
 * @returns {Date} Start date
 */
function calculateStartDate(timeRange) {
    const now = new Date();
    const parts = timeRange.match(/^(\d+)([hd])$/);
    
    if (!parts) {
        throw new Error(`Invalid time range format: ${timeRange}`);
    }
    
    const [, value, unit] = parts;
    const numValue = parseInt(value, 10);
    
    if (unit === 'h') {
        now.setHours(now.getHours() - numValue);
    } else if (unit === 'd') {
        now.setDate(now.getDate() - numValue);
    }
    
    return now;
}

/**
 * Calculates the date range for a specific period type
 * @param {string} periodType - Type of period ('today', 'yesterday', 'thisWeek', etc.)
 * @returns {Object} Object containing startDate and endDate
 */
function calculatePeriodDates(periodType) {
    const now = new Date();
    let startDate = new Date();
    let endDate = null;
    
    switch (periodType) {
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            startDate.setDate(startDate.getDate() - 1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'thisWeek':
            startDate.setDate(startDate.getDate() - startDate.getDay());
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'lastWeek':
            startDate.setDate(startDate.getDate() - startDate.getDay() - 7);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'thisMonth':
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'lastMonth':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            endDate.setDate(0); // Last day of the month
            endDate.setHours(23, 59, 59, 999);
            break;
        case 'lastYear':
            startDate.setFullYear(startDate.getFullYear() - 1);
            // If comparing with same period last year, use the same month/day range
            const currentMonth = now.getMonth();
            const currentDay = now.getDate();
            startDate.setMonth(currentMonth);
            startDate.setDate(currentDay);
            startDate.setHours(0, 0, 0, 0);
            // Go back appropriate number of days
            if (periodType === 'today') {
                // Just one day
            } else if (periodType === 'thisWeek') {
                startDate.setDate(startDate.getDate() - startDate.getDay());
            } else if (periodType === 'thisMonth') {
                startDate.setDate(1);
            }
            break;
        default:
            // Default to 24 hours
            startDate.setDate(startDate.getDate() - 1);
    }
    
    return { startDate, endDate };
}

/**
 * Calculates rainfall rate in inches per hour
 * @param {number} rainAmount - Amount of rainfall
 * @param {number} intervalMinutes - Interval in minutes (default: 15)
 * @returns {number} Rainfall rate in inches per hour
 */
function calculateRainfallRate(rainAmount, intervalMinutes = 15) {
    const rain = parseFloat(rainAmount) || 0;
    return (rain / intervalMinutes) * 60; // Convert to hourly rate
}

/**
 * Formats ThingSpeak data into a consistent format
 * @param {Object} data - Raw ThingSpeak data entry
 * @returns {Object} Formatted data object
 */
function formatThingspeakData(data) {
    return {
        timestamp: new Date(data.created_at),
        weight_g: parseFloat(data[API_CONFIG.fields.weight_g] || 0),
        rainfall_in: parseFloat(data[API_CONFIG.fields.rainfall_in] || 0),
        temperature: parseFloat(data[API_CONFIG.fields.temperature] || 0),
        humidity: parseFloat(data[API_CONFIG.fields.humidity] || 0)
    };
}

/**
 * Aggregates rainfall data by time period
 * @param {Array} data - Array of data entries
 * @param {string} period - Aggregation period ('hour', 'day', 'week', 'month')
 * @returns {Array} Aggregated data
 */
export function aggregateRainfallData(data, period = 'day') {
    if (!data || data.length === 0) return [];
    
    const aggregated = {};
    
    data.forEach(entry => {
        const date = new Date(entry.timestamp);
        let key;
        
        switch (period) {
            case 'hour':
                key = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
                break;
            case 'day':
                key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                break;
            case 'week':
                // Get the first day of the week (Sunday)
                const firstDay = new Date(date);
                firstDay.setDate(date.getDate() - date.getDay());
                key = new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate()).getTime();
                break;
            case 'month':
                key = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
                break;
            default:
                key = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
        }
        
        if (!aggregated[key]) {
            aggregated[key] = {
                timestamp: new Date(key),
                rainfall: 0,
                count: 0
            };
        }
        
        aggregated[key].rainfall += parseFloat(entry.rainfall_in) || 0;
        aggregated[key].count++;
    });
    
    return Object.values(aggregated).map(entry => ({
        timestamp: entry.timestamp,
        rainfall: entry.rainfall,
        average: entry.rainfall / entry.count
    }));
}