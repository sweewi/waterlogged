/**
 * Dashboard.js - Manages the unified weather dashboard
 * Combines weather data and rainfall visualization in a tabbed interface
 */

document.addEventListener('DOMContentLoaded', () => {
  // Tab switching functionality
  const tabButtons = document.querySelectorAll('.dashboard-tab');
  const dashboardViews = document.querySelectorAll('.dashboard-view');
  
  // Initialize dashboard tabs
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const viewToShow = button.dataset.view;
      
      // Update active state for tabs
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active state for views
      dashboardViews.forEach(view => {
        view.classList.remove('active');
        if (view.id === `view-${viewToShow}`) {
          view.classList.add('active');
          
          // Trigger chart resize event if needed
          if (window.Chart && view.querySelector('canvas')) {
            window.setTimeout(() => {
              window.dispatchEvent(new Event('resize'));
            }, 100);
          }
          
          // Load data for the appropriate view
          loadViewData(viewToShow);
        }
      });
    });
  });
  
  // Function to load data for different views
  function loadViewData(viewType) {
    switch(viewType) {
      case 'overview':
        // Overview is handled by the existing functionality
        break;
      case 'hourly':
        loadHourlyData();
        break;
      case 'daily':
        loadDailyData();
        break;
      case 'weekly':
        loadWeeklyData();
        break;
    }
  }
  
  // Load hourly forecast data
  function loadHourlyData() {
    const hourlyChart = document.getElementById('hourlyChart');
    if (!hourlyChart) return;
    
    // Check if Chart.js is loaded
    ensureChartJsLoaded().then(() => {
      // Get the current location
      const location = document.getElementById('weather-location').textContent || 'Boston, MA';
      
      // Fetch hourly forecast data
      fetchHourlyForecast(location)
        .then(data => {
          renderHourlyChart(hourlyChart, data);
        })
        .catch(err => {
          console.error('Error loading hourly data:', err);
          // Show error message in the hourly view
          document.getElementById('view-hourly').innerHTML = `
            <div class="error-message">
              <p>Unable to load hourly forecast data. Please try again later.</p>
            </div>
          `;
        });
    });
  }
  
  // Load daily forecast data
  function loadDailyData() {
    const dailyChart = document.getElementById('dailyChart');
    if (!dailyChart) return;
    
    // Check if Chart.js is loaded
    ensureChartJsLoaded().then(() => {
      // Get the current location
      const location = document.getElementById('weather-location').textContent || 'Boston, MA';
      
      // Fetch daily forecast data
      fetchDailyForecast(location)
        .then(data => {
          renderDailyChart(dailyChart, data);
        })
        .catch(err => {
          console.error('Error loading daily data:', err);
          // Show error message in the daily view
          document.getElementById('view-daily').innerHTML = `
            <div class="error-message">
              <p>Unable to load daily forecast data. Please try again later.</p>
            </div>
          `;
        });
    });
  }
  
  // Load weekly forecast data
  function loadWeeklyData() {
    const weeklyChart = document.getElementById('weeklyChart');
    if (!weeklyChart) return;
    
    // Check if Chart.js is loaded
    ensureChartJsLoaded().then(() => {
      // Get the current location
      const location = document.getElementById('weather-location').textContent || 'Boston, MA';
      
      // Fetch weekly forecast data
      fetchWeeklyForecast(location)
        .then(data => {
          renderWeeklyChart(weeklyChart, data);
        })
        .catch(err => {
          console.error('Error loading weekly data:', err);
          // Show error message in the weekly view
          document.getElementById('view-weekly').innerHTML = `
            <div class="error-message">
              <p>Unable to load weekly forecast data. Please try again later.</p>
            </div>
          `;
        });
    });
  }
  
  // Ensure Chart.js is loaded - uses the existing lazy loading function
  function ensureChartJsLoaded() {
    // Check if we already have the loadChartJS function
    if (window.loadChartJS) {
      return window.loadChartJS();
    } else {
      // If not, define a simple promise that resolves when Chart is available
      return new Promise((resolve) => {
        if (window.Chart) {
          resolve(window.Chart);
        } else {
          // Poll for Chart.js availability
          const checkInterval = setInterval(() => {
            if (window.Chart) {
              clearInterval(checkInterval);
              resolve(window.Chart);
            }
          }, 100);
        }
      });
    }
  }
  
  // Mock API functions - these would be replaced with real API calls
  // in a production environment
  function fetchHourlyForecast(location) {
    // Simulate API call with mock data
    return new Promise(resolve => {
      setTimeout(() => {
        // Generate 24 hours of mock data
        const now = new Date();
        const hourlyData = Array.from({ length: 24 }, (_, i) => {
          const timestamp = new Date(now);
          timestamp.setHours(now.getHours() + i);
          
          return {
            timestamp,
            temperature: Math.round(60 + Math.sin(i / 4) * 15 + Math.random() * 5),
            precipitation: Math.max(0, Math.random() * 0.2).toFixed(2),
            humidity: Math.round(50 + Math.sin(i / 6) * 20 + Math.random() * 10),
            windSpeed: Math.round(5 + Math.random() * 10)
          };
        });
        
        resolve(hourlyData);
      }, 500);
    });
  }
  
  function fetchDailyForecast(location) {
    // Simulate API call with mock data
    return new Promise(resolve => {
      setTimeout(() => {
        // Generate 7 days of mock data
        const now = new Date();
        const dailyData = Array.from({ length: 7 }, (_, i) => {
          const timestamp = new Date(now);
          timestamp.setDate(now.getDate() + i);
          
          return {
            timestamp,
            tempHigh: Math.round(65 + Math.sin(i / 2) * 10 + Math.random() * 5),
            tempLow: Math.round(45 + Math.sin(i / 2) * 8 + Math.random() * 5),
            precipitation: Math.max(0, 0.1 * Math.sin(i) + Math.random() * 0.5).toFixed(2),
            humidity: Math.round(60 + Math.sin(i) * 15),
            condition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Light Rain', 'Rain', 'Heavy Rain', 'Thunderstorm'][Math.floor(Math.random() * 7)]
          };
        });
        
        resolve(dailyData);
      }, 500);
    });
  }
  
  function fetchWeeklyForecast(location) {
    // For simplicity, use the daily forecast data but for 4 weeks
    return new Promise(resolve => {
      setTimeout(() => {
        // Generate 4 weeks of mock data
        const now = new Date();
        const weeklyData = Array.from({ length: 4 }, (_, i) => {
          const timestamp = new Date(now);
          timestamp.setDate(now.getDate() + i * 7);
          
          return {
            weekStart: timestamp,
            avgTemp: Math.round(60 + Math.sin(i) * 15),
            totalPrecipitation: Math.max(0, 0.5 + Math.sin(i) * 1.5 + Math.random()).toFixed(2),
            avgHumidity: Math.round(55 + Math.sin(i) * 20),
            domCondition: ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy'][Math.floor(Math.random() * 4)]
          };
        });
        
        resolve(weeklyData);
      }, 500);
    });
  }
  
  // Chart rendering functions
  function renderHourlyChart(canvas, data) {
    if (!canvas || !data.length) return;
    
    // Destroy existing chart if present
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    // Format labels for the x-axis
    const labels = data.map(item => {
      return item.timestamp.toLocaleTimeString([], { hour: 'numeric' });
    });
    
    // Prepare datasets
    const tempDataset = {
      label: 'Temperature (°F)',
      data: data.map(item => item.temperature),
      borderColor: '#ff9500',
      backgroundColor: 'rgba(255, 149, 0, 0.2)',
      yAxisID: 'y',
      tension: 0.4
    };
    
    const rainDataset = {
      label: 'Precipitation (in)',
      data: data.map(item => item.precipitation),
      borderColor: '#4361ee',
      backgroundColor: 'rgba(67, 97, 238, 0.2)',
      yAxisID: 'y1',
      type: 'bar'
    };
    
    // Create the chart
    canvas.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [tempDataset, rainDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°F)'
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Precipitation (in)'
            },
            max: 1,
            grid: {
              drawOnChartArea: false
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    });
  }
  
  function renderDailyChart(canvas, data) {
    if (!canvas || !data.length) return;
    
    // Destroy existing chart if present
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    // Format labels for the x-axis
    const labels = data.map(item => {
      return item.timestamp.toLocaleDateString([], { weekday: 'short' });
    });
    
    // Prepare datasets
    const tempHighDataset = {
      label: 'High Temp (°F)',
      data: data.map(item => item.tempHigh),
      borderColor: '#ff4500',
      backgroundColor: 'rgba(255, 69, 0, 0.6)',
      type: 'line',
      tension: 0.1,
      yAxisID: 'y'
    };
    
    const tempLowDataset = {
      label: 'Low Temp (°F)',
      data: data.map(item => item.tempLow),
      borderColor: '#00b4d8',
      backgroundColor: 'rgba(0, 180, 216, 0.6)',
      type: 'line',
      tension: 0.1,
      yAxisID: 'y'
    };
    
    const rainDataset = {
      label: 'Precipitation (in)',
      data: data.map(item => item.precipitation),
      backgroundColor: 'rgba(67, 97, 238, 0.6)',
      yAxisID: 'y1',
      type: 'bar'
    };
    
    // Create the chart
    canvas.chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [tempHighDataset, tempLowDataset, rainDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°F)'
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Precipitation (in)'
            },
            max: 2,
            grid: {
              drawOnChartArea: false
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    });
  }
  
  function renderWeeklyChart(canvas, data) {
    if (!canvas || !data.length) return;
    
    // Destroy existing chart if present
    if (canvas.chart) {
      canvas.chart.destroy();
    }
    
    // Format labels for the x-axis
    const labels = data.map(item => {
      return `Week of ${item.weekStart.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    });
    
    // Prepare datasets
    const tempDataset = {
      label: 'Avg Temperature (°F)',
      data: data.map(item => item.avgTemp),
      borderColor: '#ff9500',
      backgroundColor: 'rgba(255, 149, 0, 0.2)',
      yAxisID: 'y',
      tension: 0.4
    };
    
    const rainDataset = {
      label: 'Total Precipitation (in)',
      data: data.map(item => item.totalPrecipitation),
      borderColor: '#4361ee',
      backgroundColor: 'rgba(67, 97, 238, 0.6)',
      yAxisID: 'y1',
      type: 'bar'
    };
    
    // Create the chart
    canvas.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [tempDataset, rainDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: {
              display: true,
              text: 'Temperature (°F)'
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: {
              display: true,
              text: 'Precipitation (in)'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    });
  }
});