# Configuration Directory

This directory contains configuration files for different aspects of the Waterlogged project.

## Files

### Express Server Configuration
- `express-server.js`: Basic Express server configuration template

### Nginx Configuration
- `nginx/nginx.conf`: Nginx server configuration with compression settings

## Usage

These configuration files serve as templates and examples for deploying the Waterlogged application in different environments.

### Express Configuration

The Express configuration can be incorporated into the main server.js file for a simple deployment, or used as a reference for more complex setups.

### Nginx Configuration

The Nginx configuration can be used when deploying the application behind an Nginx reverse proxy, which is recommended for production environments to handle:

- Compression
- Caching
- SSL termination
- Load balancing (if needed in the future)
