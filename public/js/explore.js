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

// Add rainfall visualization code at the start of the file
document.addEventListener('DOMContentLoaded', () => {
    // Initialize rainfall visualization
    initializeRainfallChart();
    // Initialize other interactive elements
    setupGameControls();
    setupTutorialControls();
    setupScienceCorner();
});

// Rainfall Chart initialization
function initializeRainfallChart() {
    const ctx = document.getElementById('rainfallChart');
    if (!ctx) return;

    const sampleData = generateSampleData();
    const rainfallChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sampleData.labels,
            datasets: [{
                label: 'Rainfall (mm)',
                data: sampleData.values,
                borderColor: '#00509e',
                backgroundColor: 'rgba(0, 80, 158, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
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
                        text: 'Rainfall Amount (mm)'
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
                    text: 'Interactive Rainfall Data Explorer',
                    font: { size: 16 }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Rainfall: ${context.parsed.y}mm`;
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });

    addChartControls(ctx, rainfallChart);
}

// Chart control functions
function addChartControls(ctx, chart) {
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'chart-controls';
    controlsContainer.style.marginTop = '15px';
    controlsContainer.style.textAlign = 'center';

    // Add time range buttons
    const timeRanges = ['24 Hours', '7 Days', '30 Days'];
    timeRanges.forEach(range => {
        const button = document.createElement('button');
        button.textContent = range;
        button.className = 'time-range-button';
        button.onclick = () => updateTimeRange(range, chart);
        controlsContainer.appendChild(button);
    });

    ctx.parentNode.insertBefore(controlsContainer, ctx.nextSibling);
}

// Helper function to generate sample data
function generateSampleData() {
    const now = new Date();
    const labels = [];
    const values = [];
    
    for (let i = 23; i >= 0; i--) {
        const time = new Date(now - i * 3600000);
        labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        const baseValue = Math.sin(i / 4) * 2 + 3;
        const randomFactor = Math.random() * 2;
        values.push(Math.max(0, baseValue + randomFactor).toFixed(1));
    }

    return { labels, values };
}

function updateTimeRange(range, chart) {
    const now = new Date();
    const labels = [];
    const values = [];
    let points;

    switch (range) {
        case '24 Hours':
            points = 24;
            for (let i = points - 1; i >= 0; i--) {
                const time = new Date(now - i * 3600000);
                labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                const baseValue = Math.sin(i / 4) * 2 + 3;
                values.push(Math.max(0, baseValue + Math.random() * 2).toFixed(1));
            }
            break;
        case '7 Days':
            points = 7;
            for (let i = points - 1; i >= 0; i--) {
                const date = new Date(now - i * 86400000);
                labels.push(date.toLocaleDateString([], { weekday: 'short' }));
                const baseValue = Math.sin(i / 2) * 5 + 7;
                values.push(Math.max(0, baseValue + Math.random() * 4).toFixed(1));
            }
            break;
        case '30 Days':
            points = 30;
            for (let i = points - 1; i >= 0; i--) {
                const date = new Date(now - i * 86400000);
                labels.push(date.toLocaleDateString([], { day: 'numeric', month: 'short' }));
                const baseValue = Math.sin(i / 5) * 8 + 10;
                values.push(Math.max(0, baseValue + Math.random() * 6).toFixed(1));
            }
            break;
    }

    chart.data.labels = labels;
    chart.data.datasets[0].data = values;
    chart.update();
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