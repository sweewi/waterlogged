const express = require('express');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Define routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve About page
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'about.html'));
});

// Serve Photos page
app.get('/photos.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'photos.html'));
});

// Serve Explore page
app.get('/explore.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'explore.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});