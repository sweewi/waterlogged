// Weather facts database
const weatherFacts = [
    "A single raindrop falls at an average speed of 14 miles per hour!",
    "The wettest place on Earth is Cherrapunji, India, with an average of 11,862mm of rain per year!",
    "Raindrops aren't actually tear-shaped - they're round!",
    "The smell after rain is called 'petrichor'!",
    "Lightning strikes the Earth about 100 times every second!",
    "The fastest rainfall ever recorded fell at a rate of 38mm per minute!",
    "A hurricane can release energy equivalent to 10,000 nuclear bombs!",
    "Snow is technically a type of precipitation, just like rain!",
    "The largest raindrop ever recorded was 8.8mm across!",
    "The driest place on Earth, the Atacama Desert, can go decades without rain!"
];

let currentFactIndex = 0;

// Weather Detective game state
let gameScore = 0;
let currentQuestion = 0;

// Tutorial state
let currentStep = 1;
const totalSteps = 5;

// Weather Detective game questions
const gameQuestions = [
    {
        question: "What happens to air temperature when it rains?",
        options: [
            "It always increases",
            "It usually decreases",
            "It stays exactly the same",
            "It depends on the season"
        ],
        correct: 1,
        explanation: "Rain usually causes the air temperature to decrease because as water evaporates, it absorbs heat from the surrounding air."
    },
    {
        question: "Which shape best describes a raindrop?",
        options: [
            "Teardrop shaped",
            "Perfectly round",
            "Hamburger shaped",
            "More like a tiny parachute"
        ],
        correct: 2,
        explanation: "While falling, raindrops actually become hamburger-shaped due to air resistance!"
    }
    // ... existing questions ...
];

let currentQuestionIndex = 0;

// Historical data exploration and comparison
document.addEventListener('DOMContentLoaded', () => {
    // Initialize main functionality
    initializeComparisonChart();
    setupGameControls();
    setupTutorialControls();
    setupScienceCorner();

    // Set up dark mode toggle
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.querySelectorAll('nav, .content-box, .game-box, .tutorial-box, .science-box').forEach(el => {
                el.classList.toggle('dark-mode');
            });
            updateChartTheme();
        });
    }
});

// Comparison chart initialization
function initializeComparisonChart() {
    const ctx = document.getElementById('comparisonChart');
    if (!ctx) return;

    const comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Current Period',
                    data: [],
                    borderColor: '#00509e',
                    backgroundColor: 'rgba(0, 80, 158, 0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Comparison Period',
                    data: [],
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Rainfall Amount (inches)'
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
                    text: 'Historical Rainfall Comparison',
                    font: { size: 16 }
                }
            }
        }
    });

    addComparisonControls(ctx, comparisonChart);
}

function addComparisonControls(ctx, chart) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'chart-controls';

    // Add comparison period selector
    const periodDiv = document.createElement('div');
    periodDiv.className = 'comparison-period-selector';
    periodDiv.innerHTML = `
        <div class="control-group">
            <label>Current Period:</label>
            <select id="currentPeriod" class="control-select">
                <option value="today">Today</option>
                <option value="thisWeek">This Week</option>
                <option value="thisMonth">This Month</option>
            </select>
        </div>
        <div class="control-group">
            <label>Compare With:</label>
            <select id="comparisonPeriod" class="control-select">
                <option value="yesterday">Yesterday</option>
                <option value="lastWeek">Last Week</option>
                <option value="lastMonth">Last Month</option>
                <option value="lastYear">Same Period Last Year</option>
            </select>
        </div>
    `;

    controlsContainer.appendChild(periodDiv);
    ctx.parentNode.insertBefore(controlsContainer, ctx.nextSibling);

    // Add statistics display
    const statsDiv = document.createElement('div');
    statsDiv.className = 'comparison-stats';
    statsDiv.innerHTML = `
        <div class="stat-box">
            <h4>Current Period</h4>
            <p>Total: <span id="currentTotal">--</span></p>
            <p>Peak: <span id="currentPeak">--</span></p>
        </div>
        <div class="stat-box">
            <h4>Comparison Period</h4>
            <p>Total: <span id="comparisonTotal">--</span></p>
            <p>Peak: <span id="comparisonPeak">--</span></p>
        </div>
        <div class="stat-box">
            <h4>Difference</h4>
            <p>Total: <span id="totalDiff">--</span></p>
            <p>Peak: <span id="peakDiff">--</span></p>
        </div>
    `;
    ctx.parentNode.insertBefore(statsDiv, controlsContainer.nextSibling);

    // Add event listeners
    document.getElementById('currentPeriod').addEventListener('change', () => updateComparison(chart));
    document.getElementById('comparisonPeriod').addEventListener('change', () => updateComparison(chart));

    // Initial update
    updateComparison(chart);
}

/**
 * Updates the comparison chart with new data based on selected periods
 * @param {Chart} chart - The Chart.js instance to update
 */
function updateComparison(chart) {
    try {
        const currentPeriod = document.getElementById('currentPeriod').value;
        const comparisonPeriod = document.getElementById('comparisonPeriod').value;

        // Fetch data for both periods
        fetchPeriodData(currentPeriod)
            .then(currentData => {
                fetchPeriodData(comparisonPeriod)
                    .then(comparisonData => {
                        updateChartData(chart, currentData, comparisonData);
                        updateStatistics(currentData, comparisonData);
                    })
                    .catch(handleDataError);
            })
            .catch(handleDataError);
    } catch (error) {
        console.error('Error updating comparison:', error);
        showErrorMessage('Failed to update comparison. Please try again.');
    }
}

/**
 * Handles data fetch errors
 * @param {Error} error - The error that occurred
 */
function handleDataError(error) {
    console.error('Error fetching period data:', error);
    showErrorMessage('Failed to fetch comparison data. Please try again.');
}

/**
 * Displays an error message to the user
 * @param {string} message - The error message to display
 */
function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    const chartContainer = document.querySelector('.chart-controls');
    if (chartContainer) {
        chartContainer.insertAdjacentElement('beforebegin', errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function updateChartData(chart, currentData, comparisonData) {
    // Update datasets
    chart.data.labels = currentData.map(d => d.timestamp);
    chart.data.datasets[0].data = currentData.map(d => d.rainfall);
    chart.data.datasets[1].data = comparisonData.map(d => d.rainfall);
    
    // Update chart theme based on dark mode
    updateChartTheme(chart);
    
    chart.update();
}

function updateChartTheme(chart) {
    if (!chart) return;
    
    const isDarkMode = document.body.classList.contains('dark-mode');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#e0e0e0' : '#333';

    chart.options.scales.x.grid.color = gridColor;
    chart.options.scales.y.grid.color = gridColor;
    chart.options.scales.x.ticks.color = textColor;
    chart.options.scales.y.ticks.color = textColor;
    chart.options.plugins.legend.labels.color = textColor;
    chart.update();
}

function updateStatistics(currentData, comparisonData) {
    const calculateStats = (data) => ({
        total: data.reduce((sum, d) => sum + d.rainfall, 0),
        peak: Math.max(...data.map(d => d.rate))
    });

    const current = calculateStats(currentData);
    const comparison = calculateStats(comparisonData);

    document.getElementById('currentTotal').textContent = `${current.total.toFixed(2)} in`;
    document.getElementById('currentPeak').textContent = `${current.peak.toFixed(2)} in/hr`;
    document.getElementById('comparisonTotal').textContent = `${comparison.total.toFixed(2)} in`;
    document.getElementById('comparisonPeak').textContent = `${comparison.peak.toFixed(2)} in/hr`;
    document.getElementById('totalDiff').textContent = `${(current.total - comparison.total).toFixed(2)} in`;
    document.getElementById('peakDiff').textContent = `${(current.peak - comparison.peak).toFixed(2)} in/hr`;
}

/**
 * Data exploration and comparison module
 */

/**
 * Initializes comparison functionality
 * @param {Array} datasets - Array of available datasets
 */
function initializeComparison(datasets) {
    try {
        setupDatasetSelectors(datasets);
        bindComparisonEvents();
    } catch (error) {
        console.error('Failed to initialize comparison:', error);
        showComparisonError('Failed to initialize comparison tools');
    }
}

/**
 * Compares two selected datasets and visualizes the results
 * @param {string} dataset1 - First dataset ID
 * @param {string} dataset2 - Second dataset ID
 */
async function compareDatasets(dataset1, dataset2) {
    try {
        const data1 = await fetchDataset(dataset1);
        const data2 = await fetchDataset(dataset2);
        
        if (!data1 || !data2) {
            throw new Error('Failed to fetch comparison data');
        }

        const comparisonResults = analyzeDatasets(data1, data2);
        visualizeComparison(comparisonResults);
        updateComparisonStats(comparisonResults);
    } catch (error) {
        console.error('Comparison failed:', error);
        showComparisonError('Failed to compare datasets. Please try again.');
    }
}

/**
 * Analyzes two datasets and calculates comparison metrics
 * @param {Array} data1 - First dataset
 * @param {Array} data2 - Second dataset
 * @returns {Object} Comparison metrics and analysis
 */
function analyzeDatasets(data1, data2) {
    try {
        return {
            correlation: calculateCorrelation(data1, data2),
            differences: findSignificantDifferences(data1, data2),
            summary: generateComparisonSummary(data1, data2)
        };
    } catch (error) {
        console.error('Analysis failed:', error);
        throw new Error('Failed to analyze datasets');
    }
}

/**
 * Displays an error message in the comparison section
 * @param {string} message - The error message to display
 */
function showComparisonError(message) {
    const errorContainer = document.getElementById('comparison-errors') || 
        createComparisonErrorContainer();
    
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    setTimeout(() => {
        errorContainer.style.display = 'none';
    }, 5000);
}

/**
 * Creates an error container for the comparison section
 * @returns {HTMLElement} The error container element
 */
function createComparisonErrorContainer() {
    const container = document.createElement('div');
    container.id = 'comparison-errors';
    container.className = 'error-message';
    document.querySelector('.comparison-container').prepend(container);
    return container;
}

// Tutorial functions
function setupTutorialControls() {
    const tutorialSteps = [
        {
            title: "Gather Materials",
            content: "You'll need: A clear plastic bottle, ruler, scissors, and rocks for weight."
        },
        {
            title: "Prepare the Bottle",
            content: "Cut the top third of the bottle carefully with scissors."
        },
        {
            title: "Create the Gauge",
            content: "Invert the top part into the bottom like a funnel."
        },
        {
            title: "Add Measurement Lines",
            content: "Mark centimeter lines on the side with your ruler."
        },
        {
            title: "Position Your Gauge",
            content: "Place in an open area away from trees and buildings."
        }
    ];

    const updateTutorialContent = (step) => {
        const tutorialBox = document.querySelector('.tutorial-box');
        if (!tutorialBox) return;

        const currentStep = tutorialSteps[step - 1];
        const content = `
            <div class="tutorial-content">
                <h3>${currentStep.title}</h3>
                <div class="step-indicator">Step ${step} of ${tutorialSteps.length}</div>
                <p>${currentStep.content}</p>
                <div class="tutorial-navigation">
                    ${step > 1 ? '<button onclick="previousStep()" class="nav-button">← Previous</button>' : ''}
                    ${step < tutorialSteps.length ? '<button onclick="nextStep()" class="nav-button">Next →</button>' : ''}
                    ${step === tutorialSteps.length ? '<button onclick="completeTutorial()" class="nav-button">Complete!</button>' : ''}
                </div>
            </div>
        `;
        tutorialBox.innerHTML = content;
    };

    window.startTutorial = () => {
        currentStep = 1;
        updateTutorialContent(currentStep);
    };

    window.previousStep = () => {
        if (currentStep > 1) {
            currentStep--;
            updateTutorialContent(currentStep);
        }
    };

    window.nextStep = () => {
        if (currentStep < totalSteps) {
            currentStep++;
            updateTutorialContent(currentStep);
        }
    };

    window.completeTutorial = () => {
        const tutorialBox = document.querySelector('.tutorial-box');
        if (tutorialBox) {
            tutorialBox.innerHTML = `
                <div class="tutorial-complete">
                    <h3>🎉 Congratulations!</h3>
                    <p>You've built your own rain gauge! Now you can start collecting weather data like a real scientist.</p>
                    <button onclick="startTutorial()" class="start-button">Start Over</button>
                </div>
            `;
        }
    };
}

// Science corner functions
function setupScienceCorner() {
    const factDisplay = document.getElementById('fact-display');
    if (!factDisplay) return;

    window.showNextFact = () => {
        currentFactIndex = (currentFactIndex + 1) % weatherFacts.length;
        factDisplay.style.opacity = '0';
        setTimeout(() => {
            factDisplay.innerHTML = `<p class="fun-fact">${weatherFacts[currentFactIndex]}</p>`;
            factDisplay.style.opacity = '1';
        }, 300);
    };

    // Initialize experiment view handlers
    window.viewExperiment = () => {
        const scienceBox = document.querySelector('.science-box');
        if (scienceBox) {
            scienceBox.innerHTML = `
                <div class="experiment-content">
                    <h3>Create Your Own Water Cycle</h3>
                    <div class="experiment-steps">
                        <h4>Materials Needed:</h4>
                        <ul>
                            <li>Clear plastic bag</li>
                            <li>Water</li>
                            <li>Blue food coloring (optional)</li>
                            <li>Tape</li>
                        </ul>
                        <h4>Instructions:</h4>
                        <ol>
                            <li>Fill the bag with a small amount of water</li>
                            <li>Add a drop of blue food coloring if desired</li>
                            <li>Seal the bag tightly</li>
                            <li>Tape the bag to a sunny window</li>
                            <li>Watch as water evaporates and condenses!</li>
                        </ol>
                        <button onclick="resetExperiment()" class="view-experiment-button">Back to Science Corner</button>
                    </div>
                </div>
            `;
        }
    };

    window.resetExperiment = () => {
        const scienceBox = document.querySelector('.science-box');
        if (scienceBox) {
            scienceBox.innerHTML = `
                <div class="science-content">
                    <h3>Explore Weather Phenomena</h3>
                    <div id="fact-display">
                        <p class="fun-fact">${weatherFacts[currentFactIndex]}</p>
                    </div>
                    <button class="next-fact-button" onclick="showNextFact()">Show Another Fact</button>
                    <div class="experiment-preview">
                        <h4>Today's Experiment</h4>
                        <p>Create your own water cycle in a bag!</p>
                        <button class="view-experiment-button" onclick="viewExperiment()">View Instructions</button>
                    </div>
                </div>
            `;
        }
    };
}

// Game controls setup
function setupGameControls() {
    window.startWeatherDetective = () => {
        currentQuestionIndex = 0;
        gameScore = 0;
        loadNextQuestion();
    };

    window.loadNextQuestion = () => {
        const gameBox = document.querySelector('.game-box');
        if (!gameBox) return;

        const question = gameQuestions[currentQuestionIndex];
        const content = `
            <div class="game-content">
                <h3>Weather Detective</h3>
                <div class="score-display">Score: ${gameScore} / ${gameQuestions.length}</div>
                <div class="question-counter">Question ${currentQuestionIndex + 1} of ${gameQuestions.length}</div>
                <div class="question-box">
                    <p class="question-text">${question.question}</p>
                    <div class="options-container">
                        ${question.options.map((option, index) => `
                            <button 
                                class="option-button" 
                                onclick="checkAnswer(${index})"
                                ${gameScore > currentQuestionIndex ? 'disabled' : ''}
                            >
                                ${option}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div id="feedback-box" class="feedback-box"></div>
            </div>
        `;
        
        gameBox.innerHTML = content;
    };

    window.checkAnswer = (selectedIndex) => {
        const question = gameQuestions[currentQuestionIndex];
        const feedbackBox = document.getElementById('feedback-box');
        const optionButtons = document.querySelectorAll('.option-button');
        
        optionButtons.forEach(button => button.disabled = true);
        
        if (selectedIndex === question.correct) {
            gameScore++;
            feedbackBox.innerHTML = `
                <div class="correct-feedback">
                    <p>✨ Correct! ✨</p>
                    <p>${question.explanation}</p>
                </div>
            `;
        } else {
            feedbackBox.innerHTML = `
                <div class="incorrect-feedback">
                    <p>Not quite! The correct answer was: ${question.options[question.correct]}</p>
                    <p>${question.explanation}</p>
                </div>
            `;
        }
        
        if (currentQuestionIndex < gameQuestions.length - 1) {
            setTimeout(() => {
                feedbackBox.innerHTML += `
                    <button class="next-question-button" onclick="nextQuestion()">
                        Next Question →
                    </button>
                `;
            }, 1500);
        } else {
            setTimeout(() => {
                feedbackBox.innerHTML += `
                    <div class="game-complete">
                        <h3>Game Complete!</h3>
                        <p>Final Score: ${gameScore} out of ${gameQuestions.length}</p>
                        <button class="play-again-button" onclick="resetGame()">Play Again</button>
                    </div>
                `;
            }, 1500);
        }
    };

    window.nextQuestion = () => {
        currentQuestionIndex++;
        loadNextQuestion();
    };

    window.resetGame = () => {
        currentQuestionIndex = 0;
        gameScore = 0;
        loadNextQuestion();
    };
}