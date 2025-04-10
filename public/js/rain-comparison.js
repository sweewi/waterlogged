// Initialize Chart.js comparison chart
let comparisonChart = null;

function initComparisonChart() {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Current Period',
                    data: [],
                    borderColor: '#2f7ed8',
                    backgroundColor: 'rgba(47, 126, 216, 0.1)',
                    fill: true
                },
                {
                    label: 'Comparison Period',
                    data: [],
                    borderColor: '#90ed7d',
                    backgroundColor: 'rgba(144, 237, 125, 0.1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Rainfall (mm)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Rainfall Comparison'
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
    const currentPeriod = document.getElementById('currentPeriod').value;
    const comparisonPeriod = document.getElementById('comparisonPeriod').value;

    try {
        const [currentData, comparisonData] = await Promise.all([
            fetchRainfallData(currentPeriod),
            fetchRainfallData(comparisonPeriod)
        ]);

        updateComparisonData(currentData, comparisonData);
    } catch (error) {
        console.error('Error updating visualization:', error);
        // Show error state in UI
    }
}

async function fetchRainfallData(period) {
    // This would be replaced with actual API calls to your backend
    // For now, returning mock data
    return {
        labels: Array.from({length: 24}, (_, i) => `${i}:00`),
        values: Array.from({length: 24}, () => Math.random() * 5)
    };
}