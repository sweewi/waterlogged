// Weather facts database
const weatherFacts = [
    "A single raindrop falls at an average speed of 14 miles per hour!",
    "The wettest place on Earth is Cherrapunji, India, with an average of 11,862mm of rain per year!",
    "Raindrops aren't actually tear-shaped - they're round!",
    "The smell after rain is called 'petrichor'!",
    "Lightning strikes the Earth about 100 times every second!",
];

let currentFactIndex = 0;

// Weather Detective game state
let gameScore = 0;
let currentQuestion = 0;

// Tutorial state
let currentStep = 1;
const totalSteps = 5;

// Function to show the next weather fact
function showNextFact() {
    const factDisplay = document.getElementById('fact-display');
    if (factDisplay) {
        currentFactIndex = (currentFactIndex + 1) % weatherFacts.length;
        factDisplay.innerHTML = `<p class="fun-fact">${weatherFacts[currentFactIndex]}</p>`;
        factDisplay.style.opacity = 0;
        setTimeout(() => {
            factDisplay.style.opacity = 1;
        }, 50);
    }
}

// Function to start the Weather Detective game
function startWeatherDetective() {
    const gameBox = document.querySelector('.game-box');
    if (gameBox) {
        gameBox.innerHTML = `
            <div class="game-content">
                <h3>Weather Detective</h3>
                <div id="game-question">Loading question...</div>
                <div id="game-options"></div>
                <div id="game-feedback"></div>
                <div id="game-score">Score: ${gameScore}</div>
            </div>
        `;
        loadNextQuestion();
    }
}

// Function to start the DIY Rain Gauge tutorial
function startTutorial() {
    const tutorialBox = document.querySelector('.tutorial-box');
    if (tutorialBox) {
        updateTutorialStep();
    }
}

// Function to update tutorial step
function updateTutorialStep() {
    const tutorialBox = document.querySelector('.tutorial-box');
    const steps = [
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

    if (tutorialBox) {
        const step = steps[currentStep - 1];
        tutorialBox.innerHTML = `
            <div class="tutorial-content">
                <h3>${step.title}</h3>
                <div class="step-indicator">Step ${currentStep} of ${totalSteps}</div>
                <p>${step.content}</p>
                <div class="tutorial-navigation">
                    ${currentStep > 1 ? '<button onclick="previousStep()" class="nav-button">Previous</button>' : ''}
                    ${currentStep < totalSteps ? '<button onclick="nextStep()" class="nav-button">Next</button>' : ''}
                    ${currentStep === totalSteps ? '<button onclick="finishTutorial()" class="nav-button">Finish</button>' : ''}
                </div>
            </div>
        `;
    }
}

// Navigation functions for tutorial
function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateTutorialStep();
    }
}

function nextStep() {
    if (currentStep < totalSteps) {
        currentStep++;
        updateTutorialStep();
    }
}

function finishTutorial() {
    const tutorialBox = document.querySelector('.tutorial-box');
    if (tutorialBox) {
        tutorialBox.innerHTML = `
            <div class="tutorial-complete">
                <h3>Congratulations!</h3>
                <p>You've completed the rain gauge tutorial. Now you can start collecting your own weather data!</p>
                <button onclick="startTutorial()" class="start-button">Start Over</button>
            </div>
        `;
    }
}

// Function to view weather experiment
function viewExperiment() {
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
}

// Function to reset experiment view
function resetExperiment() {
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
}

// Initialize page functionality
document.addEventListener('DOMContentLoaded', () => {
    // Add smooth transitions for all interactive elements
    document.querySelectorAll('.game-box, .tutorial-box, .science-box').forEach(box => {
        box.style.transition = 'all 0.3s ease';
    });
});