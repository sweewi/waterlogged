# Raspberry Pi Gateway for Waterlogged

This directory contains the software for the Raspberry Pi gateway component of the Waterlogged system, which serves as an intermediate between Arduino nodes and the cloud.

## Documentation Links

- [Elecrow LR1302 LoRaWAN Gateway Module](https://www.elecrow.com/wiki/lr1302-lorawan-gateway-module.html) - Official documentation for the LR1302 LoRaWAN Hat

## Directory Structure

- `api_server.py`: FastAPI server that provides a RESTful API to access the data
- `database_handler.py`: Handles database operations for storing and retrieving measurements
- `payload_decoder.py`: Decodes the binary payload from LoRaWAN messages
- `serial_handler.py`: Manages serial communication with locally connected Arduino nodes
- `setup.sh`: Main setup script for configuring the Raspberry Pi gateway
- `setup_arduino.sh`: Helper script for Arduino-specific setup tasks
- `check_wifi.sh`: Script that monitors WiFi connectivity
- `reset_lgw.sh`: Script to reset LoRa gateway module if needed
- `requirements.txt`: Python dependencies required for the gateway
- `serial-handler.service`: Systemd service configuration for the serial handler
- `wifi-monitor.service`: Systemd service configuration for WiFi monitoring

## Installation

1. Clone this repository to your Raspberry Pi
2. Navigate to the raspberrypi directory
3. Run the setup script:
   ```
   sudo ./setup.sh
   ```
4. The script will install dependencies, configure services, and set up the database

## API Endpoints

The API server provides the following endpoints:

- `POST /measurements`: Add a new measurement (used by nodes to submit data)
- `GET /data/hourly`: Get hourly aggregated data with optional start/end parameters
- `GET /data/daily`: Get daily aggregated data with optional start/end parameters
- `GET /data/latest`: Get the most recent measurement
- `GET /nodes`: Get a list of all registered nodes

## Services

The gateway uses the following services:

### Serial Handler Service

Manages communication with directly connected Arduino nodes via serial connections.

- Configuration: `serial-handler.service`
- Start/stop: `sudo systemctl start|stop serial-handler`
- Status check: `sudo systemctl status serial-handler`

### WiFi Monitor Service

Monitors and maintains WiFi connectivity, rebooting the connection if needed.

- Configuration: `wifi-monitor.service`
- Start/stop: `sudo systemctl start|stop wifi-monitor`
- Status check: `sudo systemctl status wifi-monitor`

## Payload Format

The Arduino nodes send data in a compact binary format to minimize transmission size. The payload_decoder.py script decodes this format into:

- Weight reading (grams)
- Calculated rainfall (inches)
- Temperature (Fahrenheit)
- Humidity (%)
- Zero factor (calibration value)
- Battery level (optional)

## Database

The gateway uses SQLite for data storage. The database schema includes:

- measurements: Raw measurement data from nodes
- hourly_aggregates: Hourly summarized data (for faster queries)
- daily_aggregates: Daily summarized data (for faster queries)
- nodes: Information about registered nodes

## Troubleshooting

Common issues:

- If the API server isn't responding, check if it's running: `sudo systemctl status api-server`
- For WiFi connectivity issues, check the WiFi monitor logs: `journalctl -u wifi-monitor`
- If nodes aren't connecting, verify that the gateway is properly registered with TTN
