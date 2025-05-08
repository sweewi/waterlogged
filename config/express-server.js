const express = require('express');
const compression = require('compression');
const app = express();

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static('public'));

// Start the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
