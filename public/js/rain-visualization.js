// API endpoints
const API_BASE_URL = 'http://localhost:8000';
const API_ENDPOINTS = {
    hourly: `${API_BASE_URL}/data/hourly`,
    daily: `${API_BASE_URL}/data/daily`,
    current: `${API_BASE_URL}/data/current`
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

// Time range options
const timeRanges = {
    '1h': { hours: 1, label: 'Last Hour' },
    '24h': { hours: 24, label: 'Last 24 Hours' },
    '7d': { days: 7, label: 'Last 7 Days' },
    '30d': { days: 30, label: 'Last 30 Days' }
};

let currentChart = null;

async function fetchData(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${endpoint}${queryString ? '?' + queryString : ''}`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching data:', error);
        updateStatusDisplay('error', 'Failed to fetch data');
        return null;
    }
}

function updateStatusDisplay(status, message) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
        const dot = statusElement.querySelector('.status-dot');
        const text = statusElement.querySelector('.status-text');
        
        dot.className = 'status-dot ' + status;
        text.textContent = message;
    }
}

function updateCurrentConditions(data) {
    if (!data) return;
    
    document.getElementById('total-rainfall').textContent = 
        `${data.rainfall_in.toFixed(2)}"`;
    document.getElementById('peak-rate').textContent = 
        `${(data.rainfall_in / 0.25).toFixed(2)}"/hr`; // 15-min rate to hourly rate
    document.getElementById('last-updated').textContent = 
        new Date(data.timestamp).toLocaleString();
}

async function updateVisualization() {
    const timeRange = document.getElementById('timeRange').value;
    const dataType = document.getElementById('dataType').value;
    const viewType = document.getElementById('viewType').value;
    
    // Calculate time range
    const endTime = new Date();
    const startTime = new Date(endTime - (
        (timeRanges[timeRange].hours || timeRanges[timeRange].days * 24) * 3600000
    ));
    
    // Fetch data based on time range
    const endpoint = timeRanges[timeRange].days ? API_ENDPOINTS.daily : API_ENDPOINTS.hourly;
    const response = await fetchData(endpoint, {
        start: startTime.toISOString(),
        end: endTime.toISOString()
    });
    
    if (!response || !response.data) return;
    
    // Process data based on selection
    const chartData = processData(response.data, dataType);
    
    // Update chart
    updateChart(chartData, viewType, dataType);
}

function processData(data, dataType) {
    switch (dataType) {
        case 'rainfall':
            return {
                labels: data.map(d => new Date(d.hour_start || d.date)),
                datasets: [{
                    label: 'Rainfall',
                    data: data.map(d => d.total_rainfall_in),
                    unit: '"',
                    backgroundColor: 'rgba(54, 162, 235, 0.5)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1
                }]
            };
        case 'rate':
            return {
                labels: data.map(d => new Date(d.hour_start || d.date)),
                datasets: [{
                    label: 'Rainfall Rate',
                    data: data.map(d => d.total_rainfall_in / (d.hour_start ? 1 : 24)), // hourly or daily rate
                    unit: '"/hr',
                    backgroundColor: 'rgba(255, 159, 64, 0.5)',
                    borderColor: 'rgba(255, 159, 64, 1)',
                    borderWidth: 1
                }]
            };
        case 'cumulative':
            let total = 0;
            return {
                labels: data.map(d => new Date(d.hour_start || d.date)),
                datasets: [{
                    label: 'Cumulative Rainfall',
                    data: data.map(d => (total += d.total_rainfall_in)),
                    unit: '"',
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            };
    }
}

function updateChart(data, viewType, dataType) {
    const ctx = document.getElementById('rainDataChart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    const config = { ...chartConfig };
    config.type = viewType;
    config.data = data;
    
    // Adjust scales based on data type
    if (dataType === 'rate') {
        config.options.scales.y.title.text = 'Rainfall Rate (inches/hour)';
    } else {
        config.options.scales.y.title.text = 'Rainfall (inches)';
    }
    
    currentChart = new Chart(ctx, config);
}

// Event listeners
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
    
    // Set up periodic updates
    setInterval(async () => {
        const response = await fetchData(API_ENDPOINTS.current);
        if (response && response.data) {
            updateCurrentConditions(response.data);
        }
    }, 60000); // Update every minute
});