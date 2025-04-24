// Import required packages
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const fetch = require('node-fetch'); // We'll need this for making HTTP requests

// Load environment variables from .env file
dotenv.config();

// ThingSpeak API configuration - securely stored on server
const THINGSPEAK_CONFIG = {
  baseUrl: 'https://api.thingspeak.com',
  readApiKey: process.env.THINGSPEAK_READ_KEY || '5C2PK262MD21Z0ZA', // Fallback for development
  writeApiKey: process.env.THINGSPEAK_WRITE_KEY || 'LCW6EPJBSQ1C7IN1', // Fallback for development
  channelId: process.env.THINGSPEAK_CHANNEL_ID || '2875529', // Fallback for development
  fields: {
    weight_g: 'field1',
    rainfall_in: 'field2',
    temperature: 'field3',
    humidity: 'field4'
  }
};

// Create the Express app
const app = express();
// Set up the port (uses PORT from environment variables or defaults to 3000)
const port = process.env.PORT || 3000;

// Tell Express to serve static files (images, CSS, JavaScript) from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// PROXY ROUTES FOR THINGSPEAK API
// Latest data endpoint
app.get('/api/thingspeak/latest', async (req, res) => {
  try {
    const url = `${THINGSPEAK_CONFIG.baseUrl}/channels/${THINGSPEAK_CONFIG.channelId}/feeds/last.json?api_key=${THINGSPEAK_CONFIG.readApiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching latest data:', error);
    res.status(500).json({ error: 'Failed to fetch data from ThingSpeak' });
  }
});

// Historical data endpoint
app.get('/api/thingspeak/historical', async (req, res) => {
  try {
    const { start, results = 100 } = req.query;
    
    if (!start) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    
    const params = new URLSearchParams({
      api_key: THINGSPEAK_CONFIG.readApiKey,
      start: start,
      results: results
    });
    
    const url = `${THINGSPEAK_CONFIG.baseUrl}/channels/${THINGSPEAK_CONFIG.channelId}/feeds.json?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch historical data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    res.status(500).json({ error: 'Failed to fetch historical data from ThingSpeak' });
  }
});

// Period data endpoint for comparisons
app.get('/api/thingspeak/period', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    if (!start) {
      return res.status(400).json({ error: 'Start date is required' });
    }
    
    const params = new URLSearchParams({
      api_key: THINGSPEAK_CONFIG.readApiKey,
      start: start
    });
    
    if (end) {
      params.append('end', end);
    }
    
    const url = `${THINGSPEAK_CONFIG.baseUrl}/channels/${THINGSPEAK_CONFIG.channelId}/feeds.json?${params}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch period data: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching period data:', error);
    res.status(500).json({ error: 'Failed to fetch period data from ThingSpeak' });
  }
});

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