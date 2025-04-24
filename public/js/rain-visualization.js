// Import ThingSpeak API functions
import { getLatestData, getHistoricalData } from './thingspeak-api.js';

// Time range options
const timeRanges = {
    '1h': { hours: 1, label: 'Last Hour' },
    '24h': { hours: 24, label: 'Last 24 Hours' },
    '7d': { days: 7, label: 'Last 7 Days' },
    '30d': { days: 30, label: 'Last 30 Days' }
};

// Chart configuration
const chartConfig = {
    type: 'bar',
    options: {
        responsive: true,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            title: {
                display: true,
                text: 'Rainfall Data'
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                            label += ': ';
                        }
                        if (context.parsed.y !== null) {
                            label += context.parsed.y.toFixed(2);
                            if (context.dataset.unit) {
                                label += context.dataset.unit;
                            }
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'hour'
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Rainfall (inches)'
                }
            }
        }
    }
};

let currentChart = null;

function updateStatusDisplay(status, message) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        dot.className = 'status-dot ' + status;
        text.textContent = message;

        // Update the ThingSpeak status message
        const thingspeakStatus = document.getElementById('thingspeak-status');
        if (thingspeakStatus) {
            const statusInfo = thingspeakStatus.querySelector('p');
            if (statusInfo) {
                statusInfo.textContent = `Data source: ThingSpeak API (${status === 'success' ? 'Connected' : 'Connection issue'})`;
            }
        }
    }
}

function updateCurrentConditions(data) {
    if (!data) return;
    
    const totalRainfall = document.getElementById('total-rainfall');
    const peakRate = document.getElementById('peak-rate');
    const lastUpdated = document.getElementById('last-updated');
    
    if (totalRainfall) totalRainfall.textContent = `${data.rainfall_in.toFixed(2)}"`;
    if (peakRate) peakRate.textContent = `${(data.rainfall_in / 0.25).toFixed(2)}"/hr`; // 15-min rate to hourly rate
    if (lastUpdated) lastUpdated.textContent = new Date(data.timestamp).toLocaleString();
}

async function updateVisualization() {
    try {
        // Update status to loading
        updateStatusDisplay('loading', 'Fetching data from ThingSpeak...');
        
        const timeRange = document.getElementById('timeRange')?.value || '24h';
        const dataTypeSelect = document.getElementById('dataType');
        const viewType = document.getElementById('viewType')?.value || 'line';
        
        // Handle multiple selections in the data type dropdown
        let dataType;
        if (dataTypeSelect.multiple) {
            const selectedOptions = Array.from(dataTypeSelect.selectedOptions).map(option => option.value);
            dataType = selectedOptions.length > 0 ? selectedOptions.join(',') : 'rainfall_in';
        } else {
            dataType = dataTypeSelect?.value || 'rainfall_in';
        }
        
        // Fetch historical data from ThingSpeak
        const data = await getHistoricalData({ timeRange });
        
        if (!data || data.length === 0) {
            updateStatusDisplay('error', 'No data available');
            return;
        }
        
        // Process data based on selection
        const chartData = processData(data, dataType);
        
        // Update chart
        updateChart(chartData, viewType, dataType);
        
        // Update status to success
        updateStatusDisplay('success', 'Data updated successfully');
        
        // Get the latest data for current conditions
        const latestData = data[data.length - 1];
        if (latestData) {
            updateCurrentConditions(latestData);
        }
    } catch (error) {
        console.error('Error updating visualization:', error);
        updateStatusDisplay('error', 'Failed to update data');
    }
}

function processData(data, dataType) {
    // Define styles for each data type
    const dataStyles = {
        rainfall_in: {
            label: 'Rainfall',
            unit: '"',
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
        },
        weight_g: {
            label: 'Weight',
            unit: 'g',
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
        },
        temperature: {
            label: 'Temperature',
            unit: '°F',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
            borderColor: 'rgba(255, 99, 132, 1)',
        },
        humidity: {
            label: 'Humidity',
            unit: '%',
            backgroundColor: 'rgba(153, 102, 255, 0.5)',
            borderColor: 'rgba(153, 102, 255, 1)',
        },
        rate: {
            label: 'Rainfall Rate',
            unit: '"/hr',
            backgroundColor: 'rgba(255, 159, 64, 0.5)',
            borderColor: 'rgba(255, 159, 64, 1)',
        },
        cumulative: {
            label: 'Cumulative Rainfall',
            unit: '"',
            backgroundColor: 'rgba(255, 205, 86, 0.5)',
            borderColor: 'rgba(255, 205, 86, 1)',
        }
    };

    // Check if multiple data types are selected (format: type1,type2)
    if (dataType.includes(',')) {
        const selectedTypes = dataType.split(',');
        const datasets = [];
        
        // Create dataset for each selected type
        selectedTypes.forEach(type => {
            if (type === 'cumulative') {
                let total = 0;
                datasets.push({
                    label: dataStyles.cumulative.label,
                    data: data.map(d => (total += d.rainfall_in)),
                    unit: dataStyles.cumulative.unit,
                    backgroundColor: dataStyles.cumulative.backgroundColor,
                    borderColor: dataStyles.cumulative.borderColor,
                    borderWidth: 1,
                    yAxisID: 'y'
                });
            } else if (type === 'rate') {
                datasets.push({
                    label: dataStyles.rate.label,
                    data: data.map(d => d.rainfall_in / 0.25), // Convert to hourly rate
                    unit: dataStyles.rate.unit,
                    backgroundColor: dataStyles.rate.backgroundColor,
                    borderColor: dataStyles.rate.borderColor,
                    borderWidth: 1,
                    yAxisID: 'y'
                });
            } else if (dataStyles[type]) {
                // For standard data types (rainfall_in, weight_g, temperature, humidity)
                datasets.push({
                    label: dataStyles[type].label,
                    data: data.map(d => d[type]),
                    unit: dataStyles[type].unit,
                    backgroundColor: dataStyles[type].backgroundColor,
                    borderColor: dataStyles[type].borderColor,
                    borderWidth: 1,
                    yAxisID: type === 'temperature' || type === 'humidity' ? 'y1' : 'y'
                });
            }
        });
        
        return {
            labels: data.map(d => new Date(d.timestamp)),
            datasets: datasets
        };
    }
    
    // Single data type selected
    switch (dataType) {
        case 'rainfall_in':
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.rainfall_in.label,
                    data: data.map(d => d.rainfall_in),
                    unit: dataStyles.rainfall_in.unit,
                    backgroundColor: dataStyles.rainfall_in.backgroundColor,
                    borderColor: dataStyles.rainfall_in.borderColor,
                    borderWidth: 1
                }]
            };
        case 'weight_g':
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.weight_g.label,
                    data: data.map(d => d.weight_g),
                    unit: dataStyles.weight_g.unit,
                    backgroundColor: dataStyles.weight_g.backgroundColor,
                    borderColor: dataStyles.weight_g.borderColor,
                    borderWidth: 1
                }]
            };
        case 'temperature':
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.temperature.label,
                    data: data.map(d => d.temperature),
                    unit: dataStyles.temperature.unit,
                    backgroundColor: dataStyles.temperature.backgroundColor,
                    borderColor: dataStyles.temperature.borderColor,
                    borderWidth: 1
                }]
            };
        case 'humidity':
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.humidity.label,
                    data: data.map(d => d.humidity),
                    unit: dataStyles.humidity.unit,
                    backgroundColor: dataStyles.humidity.backgroundColor,
                    borderColor: dataStyles.humidity.borderColor,
                    borderWidth: 1
                }]
            };
        case 'rate':
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.rate.label,
                    data: data.map(d => d.rainfall_in / 0.25), // Convert to hourly rate assuming 15-min readings
                    unit: dataStyles.rate.unit,
                    backgroundColor: dataStyles.rate.backgroundColor,
                    borderColor: dataStyles.rate.borderColor,
                    borderWidth: 1
                }]
            };
        case 'cumulative':
            let total = 0;
            return {
                labels: data.map(d => new Date(d.timestamp)),
                datasets: [{
                    label: dataStyles.cumulative.label,
                    data: data.map(d => (total += d.rainfall_in)),
                    unit: dataStyles.cumulative.unit,
                    backgroundColor: dataStyles.cumulative.backgroundColor,
                    borderColor: dataStyles.cumulative.borderColor,
                    borderWidth: 1
                }]
            };
        default:
            return {
                labels: [],
                datasets: []
            };
    }
}

function updateChart(data, viewType, dataType) {
    const canvas = document.getElementById('rainDataChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const config = { ...chartConfig };
    config.type = viewType;
    config.data = data;
    
    // Check if we need multiple Y axes (for mixed data types)
    const needsSecondYAxis = dataType.includes(',') && 
        (dataType.includes('temperature') || dataType.includes('humidity'));
    
    if (needsSecondYAxis) {
        // Configure dual Y axes for different units
        config.options.scales = {
            x: {
                type: 'time',
                time: {
                    unit: getTimeUnit(data.labels),
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                beginAtZero: true,
                title: {
                    display: true,
                    text: dataType.includes('rainfall_in') ? 'Rainfall (inches)' : 
                          dataType.includes('weight_g') ? 'Weight (grams)' : 
                          dataType.includes('rate') ? 'Rainfall Rate (inches/hour)' : 'Value'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false, // only want the grid lines for one axis to show up
                },
                title: {
                    display: true,
                    text: dataType.includes('temperature') ? 'Temperature (°F)' : 
                          dataType.includes('humidity') ? 'Humidity (%)' : 'Value'
                }
            }
        };
    } else {
        // Single Y axis - set title based on data type
        let yAxisTitle = 'Value';
        
        if (dataType === 'rainfall_in') {
            yAxisTitle = 'Rainfall (inches)';
        } else if (dataType === 'weight_g') {
            yAxisTitle = 'Weight (grams)';
        } else if (dataType === 'temperature') {
            yAxisTitle = 'Temperature (°F)';
        } else if (dataType === 'humidity') {
            yAxisTitle = 'Humidity (%)';
        } else if (dataType === 'rate') {
            yAxisTitle = 'Rainfall Rate (inches/hour)';
        } else if (dataType === 'cumulative') {
            yAxisTitle = 'Cumulative Rainfall (inches)';
        }
        
        config.options.scales.y.title.text = yAxisTitle;
    }
    
    // Set chart title based on selected data types
    let chartTitle = 'Weather Data';
    if (dataType === 'rainfall_in') {
        chartTitle = 'Rainfall Data';
    } else if (dataType === 'weight_g') {
        chartTitle = 'Rainfall Weight Data';
    } else if (dataType === 'temperature') {
        chartTitle = 'Temperature Data';
    } else if (dataType === 'humidity') {
        chartTitle = 'Humidity Data';
    } else if (dataType.includes(',')) {
        chartTitle = 'Multi-Parameter Weather Data';
    }
    
    config.options.plugins.title.text = chartTitle;
    
    currentChart = new Chart(ctx, config);
}

// Helper function to determine appropriate time unit based on data range
function getTimeUnit(labels) {
    if (!labels || labels.length < 2) return 'hour';
    
    const firstDate = new Date(labels[0]);
    const lastDate = new Date(labels[labels.length - 1]);
    const timeDiff = lastDate - firstDate;
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 60) return 'month';
    if (daysDiff > 10) return 'week';
    if (daysDiff > 3) return 'day';
    return 'hour';
}

// Initialize the visualization when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize controls
    const controls = ['timeRange', 'dataType', 'viewType'];
    controls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateVisualization);
        }
    });
    
    // Initial update
    updateVisualization();
    
    // Set up periodic updates every minute
    setInterval(async () => {
        try {
            const latestData = await getLatestData();
            if (latestData) {
                updateCurrentConditions(latestData);
            }
        } catch (error) {
            console.error('Error in periodic update:', error);
        }
    }, 60000);
});