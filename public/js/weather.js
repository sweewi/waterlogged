/**
 * Weather data management and visualization module
 */

// Module for fetching and displaying current weather data for Boston College
export async function fetchWeather() {
  // Get all required DOM elements for weather display
  const weatherLoading = document.getElementById('weather-loading');
  const weatherData = document.getElementById('weather-data');
  const weatherLocation = document.getElementById('weather-location');
  const weatherTemperature = document.getElementById('weather-temperature');
  const weatherCondition = document.getElementById('weather-condition');

  // Validate that all required DOM elements exist
  if (!weatherLoading || !weatherData || !weatherLocation || !weatherTemperature || !weatherCondition) {
    console.error('Error: One or more required weather elements are missing from the DOM.');
    return;
  }

  try {
    // Fetch weather data from Open-Meteo API for Boston College coordinates
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=42.34&longitude=-71.17&current_weather=true&temperature_unit=fahrenheit');
    if (!response.ok) {
      throw new Error(`Weather API responded with status ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();

    // Update the weather display with fetched data
    weatherLocation.textContent = 'Boston College, MA';
    weatherTemperature.textContent = data.current_weather.temperature;
    weatherCondition.textContent = data.current_weather.weathercode_description || 'Clear';

    // Toggle visibility of loading and data elements
    weatherLoading.style.display = 'none';
    weatherData.style.display = 'block';
  } catch (error) {
    // Handle any errors that occur during the fetch
    console.error('Error fetching weather data:', error);
    weatherLoading.textContent = 'Unable to load weather data. Please try again later.';
  }
}

/**
 * Fetches weather data for the specified time period
 * @param {string} period - The time period to fetch data for
 * @returns {Promise<Array>} The weather data
 */
async function fetchPeriodData(period) {
    try {
        const response = await fetch(`/api/weather/${period}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return processWeatherData(data);
    } catch (error) {
        console.error(`Failed to fetch weather data for period ${period}:`, error);
        throw error;
    }
}

/**
 * Processes raw weather data into the format needed for visualization
 * @param {Object} rawData - The raw weather data from the API
 * @returns {Array} Processed data ready for visualization
 */
function processWeatherData(rawData) {
    try {
        return rawData.map(entry => ({
            date: new Date(entry.timestamp),
            rainfall: parseFloat(entry.rainfall) || 0,
            temperature: parseFloat(entry.temperature),
            humidity: parseFloat(entry.humidity)
        }));
    } catch (error) {
        console.error('Error processing weather data:', error);
        throw new Error('Failed to process weather data');
    }
}

/**
 * Updates the weather dashboard with the latest data
 */
async function updateDashboard() {
    try {
        const data = await fetchPeriodData('current');
        updateCharts(data);
        updateStats(data);
        updateLastUpdated();
    } catch (error) {
        console.error('Dashboard update failed:', error);
        showDashboardError('Failed to update dashboard. Please refresh the page.');
    }
}

/**
 * Displays an error message on the dashboard
 * @param {string} message - The error message to display
 */
function showDashboardError(message) {
    const errorContainer = document.getElementById('dashboard-errors') || 
        createErrorContainer();
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

/**
 * Creates an error container if it doesn't exist
 * @returns {HTMLElement} The error container element
 */
function createErrorContainer() {
    const container = document.createElement('div');
    container.id = 'dashboard-errors';
    container.className = 'error-message';
    document.querySelector('.dashboard-container').prepend(container);
    return container;
}
