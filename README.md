# Waterlogged - IoT Rain Gauge System

A comprehensive IoT rain gauge system with Arduino nodes, Raspberry Pi gateway, and web interface for weather data visualization.

## Project Overview

Waterlogged is an all-in-one data collection and weather exploration tool that includes:

1. **Arduino Rain Gauge Nodes** - Custom-built rain gauges that collect precipitation data
2. **Raspberry Pi Gateway** - Receives data from nodes and forwards to The Things Network (TTN)
3. **Web Interface** - Visualizes the collected data with historical comparisons and exploration tools

This project demonstrates a complete IoT solution with emphasis on:
- Accurate environmental monitoring using calibrated sensors
- Low-power operation for remote deployment
- Scalable architecture supporting multiple nodes
- Robust data pipeline from physical sensors to web visualization

## Repository Structure

This repository is organized into three main components:

```
waterlogged/
├── arduino/            # Arduino node firmware and testing code
├── raspberrypi/        # Raspberry Pi gateway code
├── public/             # Web frontend files
└── server.js           # Web backend (Express server)
```

## Components

### Arduino Rain Gauge Node

The Arduino directory contains firmware for the rain gauge nodes that:
- Measure rainfall using a weighing gauge mechanism
- Collect temperature and humidity data
- Transmit data to the Raspberry Pi gateway via LoRaWAN

### Raspberry Pi Gateway

The Raspberry Pi acts as a gateway that:
- Receives data from multiple Arduino nodes
- Processes and stores the data locally
- Forwards data to The Things Network
- Provides local API access to the data

### Web Application

The web interface provides:
- Real-time display of current rainfall data
- Historical data exploration and comparison
- Weather data visualization
- Project documentation and photos

## Setup Instructions

### Arduino Node Setup

1. Flash the Arduino node with the firmware in `arduino/waterlogged_node/waterlogged_node.ino`
2. Connect the hardware components according to the pinout in the code
3. Configure the TTN credentials in the firmware

### Raspberry Pi Gateway Setup

1. Install the required packages using `raspberrypi/requirements.txt`
2. Run `setup.sh` to configure the gateway
3. Set up the services to run on boot

### Web Application Setup

1. Install dependencies: `npm install`
2. Configure environment variables in `.env` file
3. Start the server: `node server.js`

## API Documentation

The web server provides proxy endpoints to access ThingSpeak data:

- `/api/thingspeak/latest` - Get latest rain gauge data
- `/api/thingspeak/historical` - Get historical data with date parameters
- `/api/thingspeak/period` - Get data for a specific time period

## Contributors

- Annie
- Charlie
- Nava
- Peyton
- Will

## Future Development

This project can be extended by:
- Adding multiple rain gauge nodes
- Implementing additional environmental sensors
- Enhancing data visualization capabilities
- Adding predictive weather analysis