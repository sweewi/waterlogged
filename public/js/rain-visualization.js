// Rain data visualization and ThingSpeak integration
class RainDataVisualization {
    constructor() {
        this.chart = null;
        this.timeRange = '24h';
        this.dataType = 'rainfall';
        this.viewType = 'line';
        this.thingSpeakConfig = {
            channelId: '', // Add your channel ID here
            readApiKey: '', // Add your read API key here
            fields: {
                rainfall: 1,
                rate: 2
            },
            baseUrl: 'https://api.thingspeak.com'
        };
        this.initializeControls();
        this.initializeChart();
        this.setupEventListeners();
        this.connectToThingSpeak();
    }

    initializeControls() {
        this.timeRangeSelect = document.getElementById('timeRange');
        this.dataTypeSelect = document.getElementById('dataType');
        this.viewTypeSelect = document.getElementById('viewType');
        this.totalRainfallElement = document.getElementById('total-rainfall');
        this.peakRateElement = document.getElementById('peak-rate');
        this.lastUpdatedElement = document.getElementById('last-updated');
        this.statusDot = document.querySelector('.status-dot');
        this.statusText = document.querySelector('.status-text');
    }

    setupEventListeners() {
        this.timeRangeSelect.addEventListener('change', () => this.updateVisualization());
        this.dataTypeSelect.addEventListener('change', () => this.updateVisualization());
        this.viewTypeSelect.addEventListener('change', () => this.updateVisualization());
    }

    initializeChart() {
        const ctx = document.getElementById('rainDataChart').getContext('2d');
        const isDarkMode = document.body.classList.contains('dark-mode');
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#e0e0e0' : '#333';

        this.chart = new Chart(ctx, {
            type: this.viewType,
            data: {
                labels: [],
                datasets: [{
                    label: 'Rainfall',
                    data: [],
                    borderColor: '#00509e',
                    backgroundColor: 'rgba(0, 80, 158, 0.2)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour'
                        },
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: gridColor
                        },
                        ticks: {
                            color: textColor
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: textColor
                        }
                    }
                }
            }
        });
    }

    updateVisualization(data = this.sampleData) {
        this.timeRange = this.timeRangeSelect.value;
        this.dataType = this.dataTypeSelect.value;
        this.viewType = this.viewTypeSelect.value;

        // Update chart type if changed
        this.chart.config.type = this.viewType;

        // Filter data based on time range
        const filteredData = this.filterDataByTimeRange(data, this.timeRange);
        
        // Update chart data
        this.chart.data.labels = filteredData.map(d => d.timestamp);
        this.chart.data.datasets[0].data = filteredData.map(d => 
            this.dataType === 'rainfall' ? d.rainfall :
            this.dataType === 'rate' ? d.rate :
            this.calculateCumulative(filteredData, d)
        );

        this.chart.data.datasets[0].label = this.getDataTypeLabel();
        
        // Update statistics
        this.updateStatistics(filteredData);
        
        this.chart.update();
    }

    filterDataByTimeRange(data, range) {
        const now = new Date();
        const rangeInHours = {
            '1h': 1,
            '24h': 24,
            '7d': 168,
            '30d': 720
        }[range];

        return data.filter(d => 
            d.timestamp >= new Date(now - rangeInHours * 3600000)
        );
    }

    calculateCumulative(data, currentPoint) {
        const index = data.findIndex(d => d.timestamp === currentPoint.timestamp);
        return data
            .slice(0, index + 1)
            .reduce((sum, d) => sum + d.rainfall, 0);
    }

    getDataTypeLabel() {
        return {
            'rainfall': 'Rainfall (inches)',
            'rate': 'Rainfall Rate (in/hr)',
            'cumulative': 'Cumulative Rainfall (inches)'
        }[this.dataType];
    }

    updateStatistics(data) {
        const total = data.reduce((sum, d) => sum + d.rainfall, 0);
        const peak = Math.max(...data.map(d => d.rate));
        const lastUpdate = data[data.length - 1]?.timestamp;

        this.totalRainfallElement.textContent = `${total.toFixed(2)} in`;
        this.peakRateElement.textContent = `${peak.toFixed(2)} in/hr`;
        this.lastUpdatedElement.textContent = lastUpdate ? 
            new Date(lastUpdate).toLocaleTimeString() : '--';
    }

    async connectToThingSpeak() {
        this.statusDot.classList.remove('connected', 'error');
        this.statusText.textContent = 'Connecting to ThingSpeak...';

        try {
            const data = await this.fetchThingSpeakData();
            if (data) {
                this.statusDot.classList.add('connected');
                this.statusText.textContent = 'Connected to ThingSpeak';
                this.updateVisualization(data);
            } else {
                throw new Error('No data received');
            }
        } catch (error) {
            this.statusDot.classList.add('error');
            this.statusText.textContent = 'Error connecting to ThingSpeak';
            console.error('ThingSpeak connection error:', error);
            // Fallback to sample data
            this.updateVisualization();
        }
    }

    async fetchThingSpeakData() {
        if (!this.thingSpeakConfig.channelId || !this.thingSpeakConfig.readApiKey) {
            console.warn('ThingSpeak configuration missing');
            return null;
        }

        const end = new Date();
        const start = new Date(end - this.getTimeRangeInMs(this.timeRange));
        
        const url = new URL(`${this.thingSpeakConfig.baseUrl}/channels/${this.thingSpeakConfig.channelId}/feeds.json`);
        url.searchParams.append('api_key', this.thingSpeakConfig.readApiKey);
        url.searchParams.append('start', this.formatDate(start));
        url.searchParams.append('end', this.formatDate(end));
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('ThingSpeak API request failed');
        }
        
        const data = await response.json();
        return this.formatThingSpeakData(data.feeds);
    }

    formatDate(date) {
        return date.toISOString().slice(0, 19);
    }

    getTimeRangeInMs(timeRange) {
        const ranges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000,
            '30d': 30 * 24 * 60 * 60 * 1000
        };
        return ranges[timeRange] || ranges['24h'];
    }

    formatThingSpeakData(feeds) {
        return feeds.map(feed => ({
            timestamp: new Date(feed.created_at),
            rainfall: parseFloat(feed[`field${this.thingSpeakConfig.fields.rainfall}`] || 0),
            rate: parseFloat(feed[`field${this.thingSpeakConfig.fields.rate}`] || 0)
        }));
    }

    setupLiveUpdates() {
        // Update every 15 seconds
        setInterval(async () => {
            try {
                const data = await this.fetchThingSpeakData();
                if (data) {
                    this.updateVisualization(data);
                }
            } catch (error) {
                console.error('Error updating data:', error);
            }
        }, 15000);
    }
}

// Initialize visualization when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const visualization = new RainDataVisualization();
    // Initial update
    visualization.updateVisualization();
});