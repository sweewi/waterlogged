// Import ThingSpeak API functions
import { fetchPeriodData } from './thingspeak-api.js';

// Color scheme for different data types
const dataStyles = {
    rainfall_in: {
        label: 'Rainfall',
        unit: '"',
        colors: {
            current: {
                border: 'rgba(54, 162, 235, 1)',
                background: 'rgba(54, 162, 235, 0.2)'
            },
            comparison: {
                border: 'rgba(54, 162, 235, 0.7)',
                background: 'rgba(54, 162, 235, 0.1)'
            }
        }
    },
    weight_g: {
        label: 'Weight',
        unit: 'g',
        colors: {
            current: {
                border: 'rgba(75, 192, 192, 1)',
                background: 'rgba(75, 192, 192, 0.2)'
            },
            comparison: {
                border: 'rgba(75, 192, 192, 0.7)',
                background: 'rgba(75, 192, 192, 0.1)'
            }
        }
    },
    temperature: {
        label: 'Temperature',
        unit: '°F',
        colors: {
            current: {
                border: 'rgba(255, 99, 132, 1)',
                background: 'rgba(255, 99, 132, 0.2)'
            },
            comparison: {
                border: 'rgba(255, 99, 132, 0.7)',
                background: 'rgba(255, 99, 132, 0.1)'
            }
        }
    },
    humidity: {
        label: 'Humidity',
        unit: '%',
        colors: {
            current: {
                border: 'rgba(153, 102, 255, 1)',
                background: 'rgba(153, 102, 255, 0.2)'
            },
            comparison: {
                border: 'rgba(153, 102, 255, 0.7)',
                background: 'rgba(153, 102, 255, 0.1)'
            }
        }
    }
};

// Initialize Chart.js comparison chart
let comparisonChart = null;

function initComparisonChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
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
                        text: 'Value'
                    }
                },
                y1: {
                    position: 'right',
                    beginAtZero: true,
                    display: false,
                    grid: {
                        drawOnChartArea: false,
                    },
                    title: {
                        display: true,
                        text: 'Value'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Weather Data Comparison'
                },
                tooltip: {
                    enabled: true,
                    mode: 'index'
                }
            }
        }
    });
}

function updateComparisonData(currentData, comparisonData) {
    if (!comparisonChart) {
        initComparisonChart();
    }

    // Update chart data
    comparisonChart.data.labels = currentData.labels;
    comparisonChart.data.datasets[0].data = currentData.values;
    comparisonChart.data.datasets[1].data = comparisonData.values;
    comparisonChart.update();

    // Update statistics
    updateStatistics(currentData, comparisonData);
}

function updateStatistics(currentData, comparisonData) {
    // Calculate totals
    const currentTotal = currentData.values.reduce((a, b) => a + b, 0);
    const comparisonTotal = comparisonData.values.reduce((a, b) => a + b, 0);
    
    // Calculate peaks
    const currentPeak = Math.max(...currentData.values);
    const comparisonPeak = Math.max(...comparisonData.values);

    // Calculate differences
    const totalDiff = (currentTotal - comparisonTotal).toFixed(2);
    const peakDiff = (currentPeak - comparisonPeak).toFixed(2);

    // Update DOM
    document.getElementById('currentTotal').textContent = `${currentTotal.toFixed(2)} mm`;
    document.getElementById('currentPeak').textContent = `${currentPeak.toFixed(2)} mm/h`;
    document.getElementById('comparisonTotal').textContent = `${comparisonTotal.toFixed(2)} mm`;
    document.getElementById('comparisonPeak').textContent = `${comparisonPeak.toFixed(2)} mm/h`;
    document.getElementById('totalDiff').textContent = `${totalDiff} mm`;
    document.getElementById('peakDiff').textContent = `${peakDiff} mm/h`;
}

// Event listeners for period selectors
document.addEventListener('DOMContentLoaded', () => {
    const currentPeriod = document.getElementById('currentPeriod');
    const comparisonPeriod = document.getElementById('comparisonPeriod');

    currentPeriod.addEventListener('change', updateVisualization);
    comparisonPeriod.addEventListener('change', updateVisualization);

    // Initial setup
    initComparisonChart();
    updateVisualization();
});

async function updateVisualization() {
    try {
        const currentPeriod = document.getElementById('currentPeriod').value;
        const comparisonPeriod = document.getElementById('comparisonPeriod').value;
        const dataParameterSelect = document.getElementById('dataParameter');

        // Get selected data parameters
        let selectedParameters = [];
        if (dataParameterSelect.multiple) {
            selectedParameters = Array.from(dataParameterSelect.selectedOptions).map(option => option.value);
        } else {
            selectedParameters = [dataParameterSelect.value];
        }
        
        // Default to rainfall_in if nothing is selected
        if (selectedParameters.length === 0) {
            selectedParameters = ['rainfall_in'];
        }

        // Fetch data from ThingSpeak API
        const [currentData, comparisonData] = await Promise.all([
            fetchPeriodData(currentPeriod),
            fetchPeriodData(comparisonPeriod)
        ]);

        // Reset chart datasets
        if (comparisonChart) {
            comparisonChart.data.datasets = [];
        }

        // Create datasets for each selected parameter
        const needsDualYAxis = selectedParameters.some(
            param => param === 'temperature' || param === 'humidity'
        );

        // Update chart scales for dual y-axis if needed
        if (comparisonChart && needsDualYAxis) {
            comparisonChart.options.scales.y1.display = true;
            
            // Set appropriate axis titles
            if (selectedParameters.includes('rainfall_in') || selectedParameters.includes('weight_g')) {
                comparisonChart.options.scales.y.title.text = selectedParameters.includes('rainfall_in') ? 
                    'Rainfall (inches)' : 'Weight (grams)';
            }
            
            if (selectedParameters.includes('temperature') || selectedParameters.includes('humidity')) {
                comparisonChart.options.scales.y1.title.text = selectedParameters.includes('temperature') ? 
                    'Temperature (°F)' : 'Humidity (%)';
            }
        } else if (comparisonChart) {
            comparisonChart.options.scales.y1.display = false;
            
            // Set single y-axis title based on selected parameter
            const param = selectedParameters[0];
            let yAxisTitle = 'Value';
            
            if (param === 'rainfall_in') yAxisTitle = 'Rainfall (inches)';
            else if (param === 'weight_g') yAxisTitle = 'Weight (grams)';
            else if (param === 'temperature') yAxisTitle = 'Temperature (°F)';
            else if (param === 'humidity') yAxisTitle = 'Humidity (%)';
            
            comparisonChart.options.scales.y.title.text = yAxisTitle;
        }

        // Create datasets for the chart
        selectedParameters.forEach(param => {
            if (!dataStyles[param]) return;
            
            // Create current period dataset
            comparisonChart.data.datasets.push({
                label: `Current: ${dataStyles[param].label}`,
                data: currentData.map(d => d[param] || 0),
                borderColor: dataStyles[param].colors.current.border,
                backgroundColor: dataStyles[param].colors.current.background,
                fill: true,
                yAxisID: (param === 'temperature' || param === 'humidity') && needsDualYAxis ? 'y1' : 'y',
                unit: dataStyles[param].unit
            });
            
            // Create comparison period dataset
            comparisonChart.data.datasets.push({
                label: `Comparison: ${dataStyles[param].label}`,
                data: comparisonData.map(d => d[param] || 0),
                borderColor: dataStyles[param].colors.comparison.border,
                backgroundColor: dataStyles[param].colors.comparison.background,
                fill: true,
                yAxisID: (param === 'temperature' || param === 'humidity') && needsDualYAxis ? 'y1' : 'y',
                unit: dataStyles[param].unit
            });
        });

        // Set chart labels to timestamps
        comparisonChart.data.labels = currentData.map(d => new Date(d.timestamp));
        
        // Update chart title
        let chartTitle = 'Weather Data Comparison';
        if (selectedParameters.length === 1) {
            const param = selectedParameters[0];
            if (param === 'rainfall_in') chartTitle = 'Rainfall Comparison';
            else if (param === 'weight_g') chartTitle = 'Rainfall Weight Comparison';
            else if (param === 'temperature') chartTitle = 'Temperature Comparison';
            else if (param === 'humidity') chartTitle = 'Humidity Comparison';
        }
        comparisonChart.options.plugins.title.text = chartTitle;
        
        // Update chart
        comparisonChart.update();
        
        // Update statistics based on rainfall data (if selected)
        if (selectedParameters.includes('rainfall_in')) {
            updateStatistics(
                {
                    values: currentData.map(d => d.rainfall_in || 0),
                    unit: '"'
                },
                {
                    values: comparisonData.map(d => d.rainfall_in || 0),
                    unit: '"'
                }
            );
        }
    } catch (error) {
        console.error('Error updating visualization:', error);
        // Show error state in UI
        document.getElementById('currentTotal').textContent = 'Error loading data';
        document.getElementById('currentPeak').textContent = 'Error loading data';
        document.getElementById('comparisonTotal').textContent = 'Error loading data';
        document.getElementById('comparisonPeak').textContent = 'Error loading data';
        document.getElementById('totalDiff').textContent = 'Error loading data';
        document.getElementById('peakDiff').textContent = 'Error loading data';
    }
}