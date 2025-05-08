# Waterlogged Web Application

This directory contains the frontend and backend code for the Waterlogged web application, which displays data from the rain gauge system.

## Directory Structure

### Backend (Root directory)
- `server.js`: Express server that serves static files and proxies ThingSpeak API requests
- `package.json`: Node.js project configuration and dependencies
- `package-lock.json`: Dependency lock file
- `Procfile`: Configuration for deployment on platforms like Heroku

### Frontend (`public` directory)
- `index.html`: Main dashboard page showing current rain gauge data
- `explore.html`: Data exploration and visualization page
- `photos.html`: Photo gallery of the project
- `about.html`: About page with team information
- `css/`: Stylesheet files
  - `styles.css`: Main stylesheet
- `js/`: JavaScript files
  - `main.js`: Core functionality and initialization
  - `dashboard.js`: Dashboard-specific code
  - `explore.js`: Data exploration functionality
  - `thingspeak-api.js`: API handling for ThingSpeak
  - `rain-visualization.js`: Rainfall data visualization
  - `rain-comparison.js`: Historical rain data comparison
  - `weather.js`: Weather data handling
  - `gallery.js`: Photo gallery functionality
  - `mobile-navigation.js`: Mobile menu handling
  - `utils.js`: Utility functions
  - `service-worker.js`: PWA service worker
  - `generate-preview.js`: Generates preview images
- `images/`: Images and photos for the website

## Setup and Running

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node server.js
   ```

3. The website will be available at http://localhost:3000

## API Endpoints

The Express server provides the following proxy endpoints to access ThingSpeak data:

- `GET /api/thingspeak/latest`: Get latest rain gauge data
- `GET /api/thingspeak/historical`: Get historical data with date parameters
- `GET /api/thingspeak/period`: Get data for a specific time period

## Dependencies

### Backend
- Express.js: Web server framework
- Axios: HTTP client for API requests
- Dotenv: Environment variable management
- Cors: Cross-Origin Resource Sharing support

### Frontend
- Chart.js: Data visualization
- Moment.js: Date handling
- Bootstrap: UI framework

## Deployment

The application is configured for deployment on Heroku using the provided Procfile.
For other hosting services, standard Node.js deployment processes apply.

## Browser Compatibility

The web application is tested and compatible with:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest version)

## Progressive Web App

The application includes PWA functionality through the service worker, enabling:
- Offline access to previously viewed data
- Add to home screen capability
- Better performance through caching
