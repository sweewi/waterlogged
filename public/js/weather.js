export async function fetchWeather() {
  const weatherLoading = document.getElementById('weather-loading');
  const weatherData = document.getElementById('weather-data');
  const weatherLocation = document.getElementById('weather-location');
  const weatherTemperature = document.getElementById('weather-temperature');
  const weatherCondition = document.getElementById('weather-condition');

  if (!weatherLoading || !weatherData || !weatherLocation || !weatherTemperature || !weatherCondition) {
    console.error('Error: One or more required weather elements are missing from the DOM.');
    return;
  }

  try {
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=42.34&longitude=-71.17&current_weather=true&temperature_unit=fahrenheit');
    if (!response.ok) {
      throw new Error(`Weather API responded with status ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();

    // Update the weather data in the DOM
    weatherLocation.textContent = 'Boston College, MA';
    weatherTemperature.textContent = data.current_weather.temperature;
    weatherCondition.textContent = data.current_weather.weathercode_description || 'Clear';

    // Show the weather data and hide the loading message
    weatherLoading.style.display = 'none';
    weatherData.style.display = 'block';
  } catch (error) {
    console.error('Error fetching weather data:', error);
    weatherLoading.textContent = 'Unable to load weather data. Please try again later.';
  }
}
