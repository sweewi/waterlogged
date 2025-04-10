// Import required packages
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create the Express app
const app = express();
// Set up the port (uses PORT from environment variables or defaults to 3000)
const port = process.env.PORT || 3000;

// Tell Express to serve static files (images, CSS, JavaScript) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// ROUTES
// Home page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// About page route
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// Photos gallery page route
app.get('/photos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'photos.html'));
});

// Data exploration page route
app.get('/explore.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'explore.html'));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});